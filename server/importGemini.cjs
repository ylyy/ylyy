// server/importGemini.cjs
// 解析 ~/.gemini/antigravity/brain/ 下的 Gemini CLI 对话记录

const fs = require('fs');
const path = require('path');
const os = require('os');

const GEMINI_BRAIN_DIR = path.join(os.homedir(), '.gemini', 'antigravity', 'brain');

/**
 * 扫描所有可导入的 Gemini 会话
 * @returns {Array} 会话列表
 */
function scanGeminiSessions() {
  const sessions = [];

  if (!fs.existsSync(GEMINI_BRAIN_DIR)) {
    return sessions;
  }

  const convDirs = fs.readdirSync(GEMINI_BRAIN_DIR);

  for (const convId of convDirs) {
    const convPath = path.join(GEMINI_BRAIN_DIR, convId);
    if (!fs.statSync(convPath).isDirectory()) continue;

    const overviewPath = path.join(convPath, '.system_generated', 'logs', 'overview.txt');

    if (!fs.existsSync(overviewPath)) continue;

    try {
      const parsed = parseGeminiOverview(overviewPath);
      if (parsed.messages.length === 0) continue;

      // 尝试从 artifacts 获取更多上下文
      const artifactsDir = path.join(convPath, 'artifacts');
      let artifactHint = '';
      if (fs.existsSync(artifactsDir)) {
        const artifacts = fs.readdirSync(artifactsDir);
        artifactHint = artifacts.length > 0 ? ` (含 ${artifacts.length} 个制品)` : '';
      }

      sessions.push({
        id: `gemini-${convId}`,
        source: 'import-gemini',
        sessionId: convId,
        title: extractGeminiTitle(parsed.messages) + artifactHint,
        messageCount: parsed.messages.length,
        timestamp: parsed.timestamp || new Date().toISOString(),
        filePath: overviewPath,
        preview: parsed.messages[0]?.content?.substring(0, 120) || ''
      });
    } catch (err) {
      // Skip unparseable sessions
    }
  }

  return sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * 解析 Gemini 的 overview.txt
 * 格式通常是逐行的操作记录
 */
function parseGeminiOverview(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const messages = [];
  let currentRole = null;
  let currentContent = [];
  let timestamp = null;

  for (const line of lines) {
    // 检测 USER 消息行
    if (line.match(/^\[USER\]/i) || line.match(/^User:/i) || line.match(/^> User:/i)) {
      // 保存前一条消息
      if (currentRole && currentContent.length > 0) {
        messages.push({
          role: currentRole,
          content: currentContent.join('\n').trim()
        });
      }
      currentRole = 'user';
      const text = line.replace(/^\[USER\]\s*/i, '').replace(/^User:\s*/i, '').replace(/^> User:\s*/i, '').trim();
      currentContent = text ? [text] : [];
    }
    // 检测 MODEL/ASSISTANT 消息行
    else if (line.match(/^\[MODEL\]/i) || line.match(/^Model:/i) || line.match(/^> Model:/i) || line.match(/^\[ASSISTANT\]/i)) {
      if (currentRole && currentContent.length > 0) {
        messages.push({
          role: currentRole,
          content: currentContent.join('\n').trim()
        });
      }
      currentRole = 'assistant';
      const text = line.replace(/^\[MODEL\]\s*/i, '').replace(/^Model:\s*/i, '').replace(/^> Model:\s*/i, '').replace(/^\[ASSISTANT\]\s*/i, '').trim();
      currentContent = text ? [text] : [];
    }
    // 检测时间戳行
    else if (line.match(/^\d{4}-\d{2}-\d{2}/) && !timestamp) {
      timestamp = line.trim();
    }
    // 检测工具调用等行（跳过）
    else if (line.match(/^\[TOOL/i) || line.match(/^---/) || line.trim() === '') {
      // 这些是工具调用或分隔符，跳过
    }
    // 累积当前消息内容
    else if (currentRole) {
      currentContent.push(line);
    }
  }

  // 保存最后一条消息
  if (currentRole && currentContent.length > 0) {
    messages.push({
      role: currentRole,
      content: currentContent.join('\n').trim()
    });
  }

  // 如果上面的精确解析没有结果，尝试粗粒度解析
  if (messages.length === 0) {
    const chunks = content.split(/\n{2,}/);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i].trim();
      if (!chunk || chunk.length < 5) continue;
      messages.push({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: chunk
      });
    }
  }

  return { messages, timestamp };
}

/**
 * 从消息列表提取标题
 */
function extractGeminiTitle(messages) {
  const firstUser = messages.find(m => m.role === 'user');
  if (!firstUser) return '未命名 Gemini 对话';
  const title = firstUser.content.substring(0, 60).replace(/\n/g, ' ');
  return title.length >= 60 ? title + '...' : title;
}

/**
 * 获取特定会话的完整消息
 */
function getGeminiSessionMessages(filePath) {
  return parseGeminiOverview(filePath);
}

module.exports = { scanGeminiSessions, getGeminiSessionMessages };
