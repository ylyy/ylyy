// server/importCodex.cjs
const fs = require('fs');
const path = require('path');
const os = require('os');

const CODEX_SESSIONS_DIR = path.join(os.homedir(), '.codex', 'sessions');

// Function to recursively find all .jsonl files
function findJsonlFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findJsonlFiles(filePath, fileList);
    } else if (filePath.endsWith('.jsonl')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function scanCodexSessions() {
  const sessions = [];
  const files = findJsonlFiles(CODEX_SESSIONS_DIR);

  for (const filePath of files) {
    const sessionId = path.basename(filePath, '.jsonl');
    try {
      const parsed = parseCodexJSONL(filePath);
      if (parsed.messages.length === 0) continue;

      sessions.push({
        id: `codex-${sessionId}`,
        source: 'import-codex',
        sessionId,
        title: extractTitle(parsed.messages),
        messageCount: parsed.messages.length,
        timestamp: parsed.timestamp || new Date().toISOString(),
        filePath,
        preview: parsed.messages[0]?.content?.substring(0, 120) || ''
      });
    } catch (err) {
      // skip
    }
  }
  return sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function parseCodexJSONL(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  const messages = [];
  let timestamp = null;

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      const payload = obj.payload || {};
      
      let pushedUser = false;

      // New Codex format: event_msg -> user_message
      if (obj.type === 'event_msg' && payload.type === 'user_message' && typeof payload.message === 'string') {
        messages.push({ role: 'user', content: payload.message, timestamp: obj.timestamp });
        pushedUser = true;
      }
      // Old generic format
      else if (obj.type === 'user' || (obj.message && obj.message.role === 'user')) {
        const text = typeof obj.message?.content === 'string' ? obj.message.content : JSON.stringify(obj.message?.content || '');
        if (text) {
           messages.push({ role: 'user', content: text, timestamp: obj.timestamp });
           pushedUser = true;
        }
      }

      if (pushedUser && !timestamp) timestamp = obj.timestamp;
      
      // New Codex format: event_msg -> agent_message
      if (obj.type === 'event_msg' && payload.type === 'agent_message' && typeof payload.message === 'string') {
        messages.push({ role: 'assistant', content: payload.message, timestamp: obj.timestamp });
      }
      // Old generic format
      else if (obj.type === 'assistant' || (obj.message && obj.message.role === 'assistant')) {
        const contentArr = obj.message?.content;
        let text = '';
        if (Array.isArray(contentArr)) {
          text = contentArr.filter(b => b.type === 'text').map(b => b.text).join('\n');
        } else if (typeof contentArr === 'string') {
          text = contentArr;
        } else if (obj.message?.content) {
          text = typeof obj.message.content === 'object' ? JSON.stringify(obj.message.content) : String(obj.message.content);
        }
        
        if (text) {
          messages.push({ role: 'assistant', content: text, timestamp: obj.timestamp });
        }
      }
    } catch (e) {}
  }
  return { messages, timestamp };
}

function extractTitle(messages) {
  const firstUser = messages.find(m => m.role === 'user');
  if (!firstUser) return '未命名 Codex 对话';
  const title = firstUser.content.substring(0, 60).replace(/\n/g, ' ');
  return title.length >= 60 ? title + '...' : title;
}

function getCodexSessionMessages(filePath) {
  return parseCodexJSONL(filePath);
}

module.exports = { scanCodexSessions, getCodexSessionMessages };
