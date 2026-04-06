// server/importClaude.cjs
// 解析 ~/.claude/projects/ 下的 JSONL 对话记录

const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

/**
 * 扫描所有可导入的 Claude Code 会话
 * @returns {Array} 会话列表
 */
function scanClaudeSessions() {
  const sessions = [];

  if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) {
    return sessions;
  }

  const projectDirs = fs.readdirSync(CLAUDE_PROJECTS_DIR);

  for (const projectDir of projectDirs) {
    const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectDir);
    if (!fs.statSync(projectPath).isDirectory()) continue;

    const files = fs.readdirSync(projectPath).filter(f => f.endsWith('.jsonl'));

    for (const file of files) {
      const filePath = path.join(projectPath, file);
      const sessionId = path.basename(file, '.jsonl');

      try {
        const parsed = parseClaudeJSONL(filePath);
        if (parsed.messages.length === 0) continue;

        sessions.push({
          id: `claude-${sessionId}`,
          source: 'import-claude',
          sessionId,
          projectDir: projectDir.replace(/-/g, '/').replace(/^\//, ''),
          title: extractTitle(parsed.messages),
          messageCount: parsed.messages.length,
          timestamp: parsed.timestamp,
          filePath,
          preview: parsed.messages[0]?.content?.substring(0, 120) || ''
        });
      } catch (err) {
        // Skip unparseable files
      }
    }
  }

  return sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * 解析单个 JSONL 文件
 */
function parseClaudeJSONL(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  const messages = [];
  let timestamp = null;

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);

      // 只提取 user 和 assistant 消息
      if (obj.type === 'user' && obj.message?.content) {
        const text = typeof obj.message.content === 'string'
          ? obj.message.content
          : JSON.stringify(obj.message.content);

        // 过滤掉纯系统命令
        if (text.startsWith('/') || text.length < 2) continue;

        messages.push({
          role: 'user',
          content: text,
          timestamp: obj.timestamp
        });
        if (!timestamp) timestamp = obj.timestamp;
      }

      if (obj.type === 'assistant' && obj.message?.content) {
        const contentArr = obj.message.content;
        let text = '';

        if (Array.isArray(contentArr)) {
          // Claude 的 assistant 消息是一个 content 数组
          const textBlocks = contentArr.filter(b => b.type === 'text');
          text = textBlocks.map(b => b.text).join('\n');
        } else if (typeof contentArr === 'string') {
          text = contentArr;
        }

        if (text && !obj.isApiErrorMessage) {
          messages.push({
            role: 'assistant',
            content: text,
            timestamp: obj.timestamp
          });
        }
      }
    } catch (e) {
      // Skip invalid JSON lines
    }
  }

  return { messages, timestamp };
}

/**
 * 从消息列表中提取标题（使用第一条 user 消息的前 60 字符）
 */
function extractTitle(messages) {
  const firstUser = messages.find(m => m.role === 'user');
  if (!firstUser) return '未命名对话';
  const title = firstUser.content.substring(0, 60).replace(/\n/g, ' ');
  return title.length >= 60 ? title + '...' : title;
}

/**
 * 获取特定会话的完整消息
 */
function getClaudeSessionMessages(filePath) {
  return parseClaudeJSONL(filePath);
}

module.exports = { scanClaudeSessions, getClaudeSessionMessages };
