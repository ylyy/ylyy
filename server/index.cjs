// server/index.cjs
// 启动：在 server/ 目录下运行 node index.cjs
// 或在根目录运行：npm run server

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const { scanClaudeSessions, getClaudeSessionMessages } = require('./importClaude.cjs');
const { scanGeminiSessions, getGeminiSessionMessages } = require('./importGemini.cjs');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 数据库文件存在项目根目录
const db = new Database(path.join(__dirname, '..', 'ailog.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title      TEXT    NOT NULL,
    role_tag   TEXT    DEFAULT '未分类',
    content    TEXT    DEFAULT '',
    created_at TEXT    DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );
`);

// ── 数据库迁移：新增字段 ──────────────────────────────────────
// 安全地添加新字段（如果不存在的话）
const columns = db.prepare("PRAGMA table_info(conversations)").all().map(c => c.name);
if (!columns.includes('source')) {
  db.exec("ALTER TABLE conversations ADD COLUMN source TEXT DEFAULT 'manual'");
  console.log('📦 数据库迁移：新增 source 字段');
}
if (!columns.includes('messages')) {
  db.exec("ALTER TABLE conversations ADD COLUMN messages TEXT DEFAULT '[]'");
  console.log('📦 数据库迁移：新增 messages 字段');
}

console.log('✅ 数据库连接成功');

// ── 项目接口 ──────────────────────────────────────────────────

app.get('/api/projects', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '项目名不能为空' });
    const info = db.prepare('INSERT INTO projects (name) VALUES (?)').run(name.trim());
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM conversations WHERE project_id = ?').run(req.params.id);
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 对话接口 ──────────────────────────────────────────────────

app.get('/api/conversations', (req, res) => {
  try {
    const { project_id, role_tag } = req.query;
    const conditions = [];
    const params = [];
    if (project_id) { conditions.push('project_id = ?'); params.push(project_id); }
    if (role_tag)   { conditions.push('role_tag = ?');   params.push(role_tag); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const rows = db.prepare(`SELECT * FROM conversations ${where} ORDER BY created_at DESC`).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/conversations/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: '对话不存在' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/conversations', (req, res) => {
  try {
    const { project_id, title, role_tag = '未分类', content = '', source = 'manual', messages = '[]' } = req.body;
    if (!project_id) return res.status(400).json({ error: '必须指定 project_id' });
    if (!title || !title.trim()) return res.status(400).json({ error: '标题不能为空' });
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(project_id);
    if (!project) return res.status(404).json({ error: `项目 ${project_id} 不存在` });
    const info = db.prepare(
      'INSERT INTO conversations (project_id, title, role_tag, content, source, messages) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(project_id, title.trim(), role_tag, content, source, typeof messages === 'string' ? messages : JSON.stringify(messages));
    const row = db.prepare('SELECT * FROM conversations WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/conversations/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM conversations WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 导入接口 ──────────────────────────────────────────────────

// 扫描本地可导入的会话
app.get('/api/import/scan', (req, res) => {
  try {
    const claudeSessions = scanClaudeSessions();
    const geminiSessions = scanGeminiSessions();
    res.json({
      claude: claudeSessions,
      gemini: geminiSessions,
      total: claudeSessions.length + geminiSessions.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 执行批量导入
app.post('/api/import/execute', (req, res) => {
  try {
    const { sessions, project_id } = req.body;
    if (!project_id) return res.status(400).json({ error: '必须指定 project_id' });
    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({ error: '未选择要导入的会话' });
    }

    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(project_id);
    if (!project) return res.status(404).json({ error: `项目 ${project_id} 不存在` });

    const inserted = [];
    const insertStmt = db.prepare(
      'INSERT INTO conversations (project_id, title, role_tag, content, source, messages, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    const insertMany = db.transaction((items) => {
      for (const session of items) {
        let parsed;
        if (session.source === 'import-claude') {
          parsed = getClaudeSessionMessages(session.filePath);
        } else if (session.source === 'import-gemini') {
          parsed = getGeminiSessionMessages(session.filePath);
        } else {
          continue;
        }

        const messages = parsed.messages;
        if (messages.length === 0) continue;

        // 生成摘要内容（前几条对话的预览）
        const preview = messages.slice(0, 4).map(m =>
          `[${m.role === 'user' ? '用户' : 'AI'}] ${m.content.substring(0, 200)}`
        ).join('\n\n');

        const roleTag = session.source === 'import-claude' ? 'Claude' : 'Gemini';
        const createdAt = session.timestamp || new Date().toISOString();

        const info = insertStmt.run(
          project_id,
          session.title,
          roleTag,
          preview,
          session.source,
          JSON.stringify(messages),
          createdAt
        );

        inserted.push({
          id: Number(info.lastInsertRowid),
          title: session.title,
          messageCount: messages.length
        });
      }
    });

    insertMany(sessions);

    res.json({
      success: true,
      imported: inserted.length,
      details: inserted
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI Chat 代理接口 ──────────────────────────────────────────

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, project_id, title } = req.body;

    // 使用用户在 settings 里配置的 API
    const API_URL = process.env.AI_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    const API_KEY = process.env.AI_API_KEY || '';

    if (!API_KEY) {
      return res.status(400).json({
        error: '未配置 AI API Key。请设置环境变量 AI_API_KEY，或在启动时传入：AI_API_KEY=your-key node index.cjs'
      });
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'glm-4-flash',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: false
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || '调用 AI 接口失败' });
    }

    const aiReply = data.choices?.[0]?.message?.content || '(无回复)';

    // 如果指定了 project_id，自动保存对话
    if (project_id) {
      const allMessages = [...messages, { role: 'assistant', content: aiReply }];
      const preview = allMessages.slice(0, 4).map(m =>
        `[${m.role === 'user' ? '用户' : 'AI'}] ${m.content.substring(0, 200)}`
      ).join('\n\n');

      // 查找是否存在已有的 live-chat 记录（根据 title 匹配）
      const existingConv = title
        ? db.prepare('SELECT id FROM conversations WHERE project_id = ? AND title = ? AND source = ?').get(project_id, title, 'live-chat')
        : null;

      if (existingConv) {
        // 更新已有记录
        db.prepare('UPDATE conversations SET content = ?, messages = ? WHERE id = ?').run(
          preview,
          JSON.stringify(allMessages),
          existingConv.id
        );
      } else {
        // 创建新记录
        const chatTitle = title || `对话 ${new Date().toLocaleString()}`;
        db.prepare(
          'INSERT INTO conversations (project_id, title, role_tag, content, source, messages) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(project_id, chatTitle, 'AI Chat', preview, 'live-chat', JSON.stringify(allMessages));
      }
    }

    res.json({ reply: aiReply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 后端已启动：http://localhost:${PORT}`);
  console.log(`   测试：http://localhost:${PORT}/api/projects`);
  console.log(`   导入扫描：http://localhost:${PORT}/api/import/scan`);
});
