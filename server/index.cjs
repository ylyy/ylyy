// server/index.cjs
// AI Log — AI 协作管理系统后端
// 启动：AI_API_KEY=xxx node server/index.cjs

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const { scanClaudeSessions, getClaudeSessionMessages } = require('./importClaude.cjs');
const { scanGeminiSessions, getGeminiSessionMessages } = require('./importGemini.cjs');
const { scanCodexSessions, getCodexSessionMessages } = require('./importCodex.cjs');


const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── SSE 客户端管理 ─────────────────────────────────────────────
const sseClients = new Set();
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  sseClients.add(res);
  req.on('close', () => {
    sseClients.delete(res);
  });
});

const broadcastUpdate = () => {
  sseClients.forEach(client => client.write('data: update\n\n'));
};

app.set('broadcastUpdate', broadcastUpdate);


const db = new Database(path.join(__dirname, '..', 'ailog.db'));

// ── 核心表结构 ──────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT    DEFAULT '',
    status      TEXT    DEFAULT 'active',
    created_at  TEXT    DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS phases (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL,
    name        TEXT    NOT NULL,
    sort_order  INTEGER DEFAULT 0,
    color       TEXT    DEFAULT '#6366f1',
    created_at  TEXT    DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS ai_roles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL,
    name        TEXT    NOT NULL,
    ai_model    TEXT    DEFAULT '',
    avatar      TEXT    DEFAULT '🤖',
    color       TEXT    DEFAULT '#6366f1',
    created_at  TEXT    DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL,
    title       TEXT    NOT NULL,
    role_tag    TEXT    DEFAULT '未分类',
    content     TEXT    DEFAULT '',
    created_at  TEXT    DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );
`);

// ── 安全迁移 ──────────────────────────────────────────────────
function safeAddColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`📦 迁移：${table}.${column}`);
  }
}

// conversations 表迁移
safeAddColumn('conversations', 'source',   "TEXT DEFAULT 'manual'");
safeAddColumn('conversations', 'external_id', "TEXT");
safeAddColumn('conversations', 'messages', "TEXT DEFAULT '[]'");
safeAddColumn('conversations', 'phase_id', "INTEGER REFERENCES phases(id)");
safeAddColumn('conversations', 'role_id',  "INTEGER REFERENCES ai_roles(id)");
safeAddColumn('conversations', 'status',   "TEXT DEFAULT 'active'");
safeAddColumn('conversations', 'starred',  "INTEGER DEFAULT 0");
safeAddColumn('conversations', 'summary',  "TEXT DEFAULT ''");
safeAddColumn('conversations', 'updated_at', "TEXT");

db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_external_id ON conversations(external_id)');

// projects 表迁移
safeAddColumn('projects', 'description', "TEXT DEFAULT ''");
safeAddColumn('projects', 'status',      "TEXT DEFAULT 'active'");

console.log('✅ 数据库就绪');

// ── 项目接口 ──────────────────────────────────────────────────

app.get('/api/projects', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
    // 给每个项目附加统计
    const stats = db.prepare(`
      SELECT project_id, COUNT(*) as conv_count,
             SUM(json_array_length(CASE WHEN messages != '[]' THEN messages ELSE '[]' END)) as msg_count
      FROM conversations GROUP BY project_id
    `).all();
    const statsMap = {};
    stats.forEach(s => { statsMap[s.project_id] = s; });
    const enriched = rows.map(p => ({
      ...p,
      conv_count: statsMap[p.id]?.conv_count || 0,
      msg_count: statsMap[p.id]?.msg_count || 0
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', (req, res) => {
  try {
    const { name, description = '' } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '项目名不能为空' });
    const info = db.prepare('INSERT INTO projects (name, description) VALUES (?, ?)').run(name.trim(), description);
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid);

    // 自动创建默认阶段
    const defaultPhases = ['📋 需求分析', '🎨 设计', '🔧 开发', '🧪 测试', '🚀 部署'];
    const phaseStmt = db.prepare('INSERT INTO phases (project_id, name, sort_order, color) VALUES (?, ?, ?, ?)');
    const colors = ['#f59e0b', '#8b5cf6', '#3b82f6', '#10b981', '#ef4444'];
    defaultPhases.forEach((name, i) => phaseStmt.run(row.id, name, i, colors[i]));

    // 自动创建默认角色
    const defaultRoles = [
      { name: '架构师', model: 'Claude', avatar: '🏗️', color: '#f97316' },
      { name: '开发者', model: 'Claude', avatar: '💻', color: '#3b82f6' },
      { name: '产品经理', model: 'GPT', avatar: '📊', color: '#8b5cf6' },
      { name: '测试员', model: 'Gemini', avatar: '🧪', color: '#10b981' },
    ];
    const roleStmt = db.prepare('INSERT INTO ai_roles (project_id, name, ai_model, avatar, color) VALUES (?, ?, ?, ?, ?)');
    defaultRoles.forEach(r => roleStmt.run(row.id, r.name, r.model, r.avatar, r.color));

    res.status(201).json({ ...row, conv_count: 0, msg_count: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id', (req, res) => {
  try {
    const id = req.params.id;
    db.prepare('DELETE FROM conversations WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM phases WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM ai_roles WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI 角色接口 ──────────────────────────────────────────────

app.get('/api/roles', (req, res) => {
  try {
    const { project_id } = req.query;
    if (!project_id) return res.status(400).json({ error: '需要 project_id' });
    const rows = db.prepare('SELECT * FROM ai_roles WHERE project_id = ? ORDER BY created_at').all(project_id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/roles', (req, res) => {
  try {
    const { project_id, name, ai_model = '', avatar = '🤖', color = '#6366f1' } = req.body;
    if (!project_id || !name) return res.status(400).json({ error: '需要 project_id 和 name' });
    const info = db.prepare('INSERT INTO ai_roles (project_id, name, ai_model, avatar, color) VALUES (?, ?, ?, ?, ?)')
      .run(project_id, name.trim(), ai_model, avatar, color);
    const row = db.prepare('SELECT * FROM ai_roles WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/roles/:id', (req, res) => {
  try {
    const { name, ai_model, avatar, color } = req.body;
    db.prepare('UPDATE ai_roles SET name=?, ai_model=?, avatar=?, color=? WHERE id=?')
      .run(name, ai_model || '', avatar || '🤖', color || '#6366f1', req.params.id);
    const row = db.prepare('SELECT * FROM ai_roles WHERE id = ?').get(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/roles/:id', (req, res) => {
  try {
    db.prepare('UPDATE conversations SET role_id = NULL WHERE role_id = ?').run(req.params.id);
    db.prepare('DELETE FROM ai_roles WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 阶段接口 ──────────────────────────────────────────────────

app.get('/api/phases', (req, res) => {
  try {
    const { project_id } = req.query;
    if (!project_id) return res.status(400).json({ error: '需要 project_id' });
    const rows = db.prepare('SELECT * FROM phases WHERE project_id = ? ORDER BY sort_order').all(project_id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/phases', (req, res) => {
  try {
    const { project_id, name, color = '#6366f1' } = req.body;
    if (!project_id || !name) return res.status(400).json({ error: '需要 project_id 和 name' });
    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM phases WHERE project_id = ?').get(project_id);
    const info = db.prepare('INSERT INTO phases (project_id, name, sort_order, color) VALUES (?, ?, ?, ?)')
      .run(project_id, name.trim(), (maxOrder?.m || 0) + 1, color);
    const row = db.prepare('SELECT * FROM phases WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/phases/:id', (req, res) => {
  try {
    db.prepare('UPDATE conversations SET phase_id = NULL WHERE phase_id = ?').run(req.params.id);
    db.prepare('DELETE FROM phases WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 对话接口 ──────────────────────────────────────────────────

app.get('/api/conversations', (req, res) => {
  try {
    const { project_id, role_tag, phase_id, role_id, status } = req.query;
    const conditions = [];
    const params = [];
    if (project_id) { conditions.push('c.project_id = ?'); params.push(project_id); }
    if (role_tag)   { conditions.push('c.role_tag = ?');   params.push(role_tag); }
    if (phase_id)   { conditions.push('c.phase_id = ?');   params.push(phase_id); }
    if (role_id)    { conditions.push('c.role_id = ?');     params.push(role_id); }
    if (status)     { conditions.push('c.status = ?');      params.push(status); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const rows = db.prepare(`
      SELECT c.*, r.name as role_name, r.avatar as role_avatar, r.color as role_color, r.ai_model as role_model,
             p.name as phase_name, p.color as phase_color
      FROM conversations c
      LEFT JOIN ai_roles r ON c.role_id = r.id
      LEFT JOIN phases p ON c.phase_id = p.id
      ${where}
      ORDER BY c.starred DESC, COALESCE(c.updated_at, c.created_at) DESC
    `).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/conversations/:id', (req, res) => {
  try {
    const row = db.prepare(`
      SELECT c.*, r.name as role_name, r.avatar as role_avatar, r.color as role_color, r.ai_model as role_model,
             p.name as phase_name, p.color as phase_color
      FROM conversations c
      LEFT JOIN ai_roles r ON c.role_id = r.id
      LEFT JOIN phases p ON c.phase_id = p.id
      WHERE c.id = ?
    `).get(req.params.id);
    if (!row) return res.status(404).json({ error: '对话不存在' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/conversations', (req, res) => {
  try {
    const { project_id, title, role_tag = '未分类', content = '', source = 'manual', messages = '[]', phase_id, role_id } = req.body;
    if (!project_id) return res.status(400).json({ error: '必须指定 project_id' });
    if (!title || !title.trim()) return res.status(400).json({ error: '标题不能为空' });
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(project_id);
    if (!project) return res.status(404).json({ error: `项目 ${project_id} 不存在` });
    const info = db.prepare(
      'INSERT INTO conversations (project_id, title, role_tag, content, source, messages, phase_id, role_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(project_id, title.trim(), role_tag, content, source, typeof messages === 'string' ? messages : JSON.stringify(messages), phase_id || null, role_id || null);
    const row = db.prepare('SELECT * FROM conversations WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新对话的状态/星标/阶段/角色
app.patch('/api/conversations/:id', (req, res) => {
  try {
    const { status, starred, phase_id, role_id, summary } = req.body;
    const updates = [];
    const params = [];
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (starred !== undefined) { updates.push('starred = ?'); params.push(starred); }
    if (phase_id !== undefined) { updates.push('phase_id = ?'); params.push(phase_id || null); }
    if (role_id !== undefined) { updates.push('role_id = ?'); params.push(role_id || null); }
    if (summary !== undefined) { updates.push('summary = ?'); params.push(summary); }
    if (updates.length === 0) return res.status(400).json({ error: '无可更新字段' });
    params.push(req.params.id);
    db.prepare(`UPDATE conversations SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    const row = db.prepare(`
      SELECT c.*, r.name as role_name, r.avatar as role_avatar, r.color as role_color, r.ai_model as role_model,
             p.name as phase_name, p.color as phase_color
      FROM conversations c
      LEFT JOIN ai_roles r ON c.role_id = r.id
      LEFT JOIN phases p ON c.phase_id = p.id
      WHERE c.id = ?
    `).get(req.params.id);
    res.json(row);
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

// ── 项目统计接口 ──────────────────────────────────────────────

app.get('/api/stats/:project_id', (req, res) => {
  try {
    const pid = req.params.project_id;
    const convCount = db.prepare('SELECT COUNT(*) as c FROM conversations WHERE project_id = ?').get(pid).c;
    const starredCount = db.prepare('SELECT COUNT(*) as c FROM conversations WHERE project_id = ? AND starred = 1').get(pid).c;
    const roleStats = db.prepare(`
      SELECT r.name, r.avatar, r.color, COUNT(c.id) as conv_count
      FROM ai_roles r
      LEFT JOIN conversations c ON c.role_id = r.id
      WHERE r.project_id = ?
      GROUP BY r.id
    `).all(pid);
    const phaseStats = db.prepare(`
      SELECT p.name, p.color, COUNT(c.id) as conv_count
      FROM phases p
      LEFT JOIN conversations c ON c.phase_id = p.id
      WHERE p.project_id = ?
      GROUP BY p.id
      ORDER BY p.sort_order
    `).all(pid);
    const sourceStats = db.prepare(`
      SELECT source, COUNT(*) as count FROM conversations WHERE project_id = ? GROUP BY source
    `).all(pid);
    res.json({ convCount, starredCount, roleStats, phaseStats, sourceStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 导入接口 ──────────────────────────────────────────────────

app.get('/api/import/scan', (req, res) => {
  try {
    const claudeSessions = scanClaudeSessions();
    const geminiSessions = scanGeminiSessions();
    const codexSessions = scanCodexSessions();
    const total = claudeSessions.length + geminiSessions.length + codexSessions.length;
    res.json({ claude: claudeSessions, gemini: geminiSessions, codex: codexSessions, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    const updated = [];
    const insertStmt = db.prepare(
      'INSERT INTO conversations (project_id, title, role_tag, content, source, messages, created_at, external_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const updateStmt = db.prepare(
      'UPDATE conversations SET messages = ?, content = ?, title = ?, updated_at = ? WHERE id = ?'
    );
    const getStmt = db.prepare('SELECT id FROM conversations WHERE external_id = ? AND external_id IS NOT NULL');

    const insertMany = db.transaction((items) => {
      for (const session of items) {
        let parsed;
        if (session.source === 'import-claude') parsed = getClaudeSessionMessages(session.filePath);
        else if (session.source === 'import-gemini') parsed = getGeminiSessionMessages(session.filePath);
        else if (session.source === 'import-codex') parsed = getCodexSessionMessages(session.filePath); // Assume we'll add this
        else continue;
        
        const messages = parsed.messages;
        if (messages.length === 0) continue;
        
        const preview = messages.slice(0, 4).map(m =>
          `[${m.role === 'user' ? '用户' : 'AI'}] ${m.content.substring(0, 200)}`
        ).join('\n\n');
        
        const roleTag = session.source.replace('import-', ''); 
        const createdAt = session.timestamp || new Date().toISOString();
        const externalId = session.sessionId || null;

        if (externalId) {
          const existing = getStmt.get(externalId);
          if (existing) {
            updateStmt.run(JSON.stringify(messages), preview, session.title, new Date().toISOString(), existing.id);
            updated.push({ id: existing.id, title: session.title, messageCount: messages.length });
            continue;
          }
        }

        const info = insertStmt.run(project_id, session.title, roleTag, preview, session.source, JSON.stringify(messages), createdAt, externalId);
        inserted.push({ id: Number(info.lastInsertRowid), title: session.title, messageCount: messages.length });
      }
    });
    insertMany(sessions);
    res.json({ success: true, imported: inserted.length, updated: updated.length, details: { inserted, updated } });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI Chat 代理接口 ──────────────────────────────────────────

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, project_id, title } = req.body;
    const API_URL = process.env.AI_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    const API_KEY = process.env.AI_API_KEY || '';
    if (!API_KEY) {
      return res.status(400).json({ error: '未配置 AI API Key。请设置环境变量 AI_API_KEY' });
    }
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'glm-4-flash',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: false
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || '调用 AI 接口失败' });
    const aiReply = data.choices?.[0]?.message?.content || '(无回复)';
    if (project_id) {
      const allMessages = [...messages, { role: 'assistant', content: aiReply }];
      const preview = allMessages.slice(0, 4).map(m =>
        `[${m.role === 'user' ? '用户' : 'AI'}] ${m.content.substring(0, 200)}`
      ).join('\n\n');
      const existingConv = title
        ? db.prepare('SELECT id FROM conversations WHERE project_id = ? AND title = ? AND source = ?').get(project_id, title, 'live-chat')
        : null;
      if (existingConv) {
        db.prepare('UPDATE conversations SET content = ?, messages = ? WHERE id = ?').run(preview, JSON.stringify(allMessages), existingConv.id);
      } else {
        const chatTitle = title || `对话 ${new Date().toLocaleString()}`;
        db.prepare('INSERT INTO conversations (project_id, title, role_tag, content, source, messages) VALUES (?, ?, ?, ?, ?, ?)')
          .run(project_id, chatTitle, 'AI Chat', preview, 'live-chat', JSON.stringify(allMessages));
      }
    }
    res.json({ reply: aiReply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 启动服务与 Watcher ──────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 AI Log 后端 v1.0 已启动：http://localhost:${PORT}`);
  
  // 启动后台 Watcher
  try {
    const { startWatcher } = require('./watcher.cjs');
    startWatcher(db, broadcastUpdate);
  } catch (err) {
    console.error('Watcher startup failed (is chokidar installed?):', err.message);
  }
});
