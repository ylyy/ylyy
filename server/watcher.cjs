// server/watcher.cjs
// 后台文件监听服务 - 自动同步 Claude Code / Gemini CLI / Codex CLI 对话记录
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { getClaudeSessionMessages } = require('./importClaude.cjs');
const { getGeminiSessionMessages } = require('./importGemini.cjs');
const { getCodexSessionMessages } = require('./importCodex.cjs');

const homedir = os.homedir();

// 使用目录路径而非 glob（chokidar 对隐藏目录的 glob 支持有问题）
const WATCH_DIRS = [];
const CLAUDE_DIR = path.join(homedir, '.claude', 'projects');
const GEMINI_DIR = path.join(homedir, '.gemini', 'antigravity', 'brain');
const CODEX_DIR  = path.join(homedir, '.codex', 'sessions');

if (fs.existsSync(CLAUDE_DIR)) WATCH_DIRS.push(CLAUDE_DIR);
if (fs.existsSync(GEMINI_DIR)) WATCH_DIRS.push(GEMINI_DIR);
if (fs.existsSync(CODEX_DIR))  WATCH_DIRS.push(CODEX_DIR);

function startWatcher(db, broadcastUpdate) {
  if (WATCH_DIRS.length === 0) {
    console.log('⚠️  Watcher: 没有找到任何 AI 工具的本地记录目录，跳过监听');
    return;
  }

  const watcher = chokidar.watch(WATCH_DIRS, {
    persistent: true,
    ignoreInitial: true,        // 不处理已有文件，只监听新变化
    followSymlinks: true,
    depth: 10,
    awaitWriteFinish: {         // 等写入稳定后再处理（防止读到半截文件）
      stabilityThreshold: 2000,
      pollInterval: 200
    }
  });

  // 预编译 SQL 语句
  const getStmt = db.prepare(
    'SELECT id FROM conversations WHERE external_id = ? AND external_id IS NOT NULL'
  );
  const insertStmt = db.prepare(
    'INSERT INTO conversations (project_id, title, role_tag, content, source, messages, created_at, external_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const updateStmt = db.prepare(
    'UPDATE conversations SET messages = ?, content = ?, title = ?, updated_at = ? WHERE id = ?'
  );

  const handler = (filePath) => {
    // 过滤：只处理我们关心的文件类型
    if (!shouldProcess(filePath)) return;
    console.log(`[Watcher] 检测到文件变化: ${filePath}`);
    processFile(filePath, db, getStmt, insertStmt, updateStmt, broadcastUpdate);
  };

  watcher.on('add', handler);
  watcher.on('change', handler);
  watcher.on('error', (err) => console.error('[Watcher] 错误:', err.message));

  console.log(`👀 后台 Watcher 已启动，监听 ${WATCH_DIRS.length} 个目录:`);
  WATCH_DIRS.forEach(d => console.log(`   📂 ${d}`));
}

/**
 * 判断文件是否需要处理
 */
function shouldProcess(filePath) {
  const basename = path.basename(filePath);
  // Claude Code: .jsonl 文件
  if (filePath.includes(path.join('.claude', 'projects')) && basename.endsWith('.jsonl')) {
    return true;
  }
  // Gemini CLI: overview.txt 或者 artifacts 目录下的 .md 文件
  if (filePath.includes(path.join('.gemini', 'antigravity', 'brain'))) {
    // Gemini 的 brain 目录结构是 brain/<conv-id>/.system_generated/logs/overview.txt
    // 但经过检查，overview.txt 不一定存在
    // 所以我们也监听 .md 文件（artifact 变化）
    if (basename === 'overview.txt' || basename.endsWith('.md')) {
      return true;
    }
  }
  // Codex CLI: .jsonl 文件
  if (filePath.includes(path.join('.codex', 'sessions')) && basename.endsWith('.jsonl')) {
    return true;
  }
  return false;
}

/**
 * 处理单个文件变化
 */
function processFile(filePath, db, getStmt, insertStmt, updateStmt, broadcastUpdate) {
  try {
    let source = '';
    let parsed = null;
    let sessionId = '';
    let defaultRoleTag = '';

    if (filePath.includes(path.join('.claude', 'projects'))) {
      source = 'import-claude';
      sessionId = path.basename(filePath, '.jsonl');
      parsed = getClaudeSessionMessages(filePath);
      defaultRoleTag = 'Claude';

    } else if (filePath.includes(path.join('.gemini', 'antigravity', 'brain'))) {
      source = 'import-gemini';
      const parts = filePath.split(path.sep);
      const brainIndex = parts.indexOf('brain');
      if (brainIndex === -1 || brainIndex + 1 >= parts.length) return;
      sessionId = parts[brainIndex + 1];

      // 找到 overview.txt 的路径
      const convRoot = parts.slice(0, brainIndex + 2).join(path.sep);
      const overviewPath = path.join(convRoot, '.system_generated', 'logs', 'overview.txt');

      if (fs.existsSync(overviewPath)) {
        parsed = getGeminiSessionMessages(overviewPath);
      } else {
        console.log(`[Watcher] Gemini overview.txt 不存在，跳过: ${sessionId}`);
        return;
      }
      defaultRoleTag = 'Gemini';

      // Artifact 数量标注
      const artifactsDir = path.join(convRoot, 'artifacts');
      var artifactHint = '';
      if (fs.existsSync(artifactsDir)) {
        const artifacts = fs.readdirSync(artifactsDir).filter(f => !f.startsWith('.'));
        if (artifacts.length > 0) artifactHint = ` (含 ${artifacts.length} 个制品)`;
      }

    } else if (filePath.includes(path.join('.codex', 'sessions'))) {
      source = 'import-codex';
      sessionId = path.basename(filePath, '.jsonl');
      parsed = getCodexSessionMessages(filePath);
      defaultRoleTag = 'Codex';
    }

    if (!parsed || !parsed.messages || parsed.messages.length === 0) {
      console.log(`[Watcher] 文件无有效消息，跳过: ${filePath}`);
      return;
    }

    const messages = parsed.messages;
    const preview = messages.slice(0, 4).map(m =>
      `[${m.role === 'user' ? '用户' : 'AI'}] ${m.content.substring(0, 200)}`
    ).join('\n\n');

    const firstUser = messages.find(m => m.role === 'user');
    const titleText = firstUser
      ? firstUser.content.substring(0, 60).replace(/\n/g, ' ')
      : '未命名对话';
    let title = (titleText.length >= 60 ? titleText + '...' : titleText);
    if (typeof artifactHint === 'string') title += artifactHint;

    const createdAt = parsed.timestamp || new Date().toISOString();

    // 获取最近创建的项目作为默认归属
    let projectId = 1;
    const recentProject = db.prepare('SELECT id FROM projects ORDER BY created_at DESC LIMIT 1').get();
    if (recentProject) projectId = recentProject.id;

    let didUpdate = false;

    db.transaction(() => {
      const existing = getStmt.get(sessionId);
      if (existing) {
        updateStmt.run(JSON.stringify(messages), preview, title, new Date().toISOString(), existing.id);
        console.log(`[Watcher] ✅ 更新已有会话: ${sessionId} (${messages.length} 条消息)`);
      } else {
        insertStmt.run(projectId, title, defaultRoleTag, preview, source, JSON.stringify(messages), createdAt, sessionId);
        console.log(`[Watcher] ✅ 新增会话: ${sessionId} → 项目 #${projectId} (${messages.length} 条消息)`);
      }
      didUpdate = true;
    })();

    if (didUpdate && broadcastUpdate) {
      broadcastUpdate();
    }
  } catch (err) {
    console.error(`[Watcher] ❌ 处理文件失败: ${filePath}`, err.message);
  }
}

module.exports = { startWatcher };
