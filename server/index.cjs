// server/index.cjs
// 启动：在 server/ 目录下运行 node index.cjs
// 或在根目录运行：npm run server

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

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
    const { project_id, title, role_tag = '未分类', content = '' } = req.body;
    if (!project_id) return res.status(400).json({ error: '必须指定 project_id' });
    if (!title || !title.trim()) return res.status(400).json({ error: '标题不能为空' });
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(project_id);
    if (!project) return res.status(404).json({ error: `项目 ${project_id} 不存在` });
    const info = db.prepare(
      'INSERT INTO conversations (project_id, title, role_tag, content) VALUES (?, ?, ?, ?)'
    ).run(project_id, title.trim(), role_tag, content);
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

app.listen(PORT, () => {
  console.log(`🚀 后端已启动：http://localhost:${PORT}`);
  console.log(`   测试：http://localhost:${PORT}/api/projects`);
});
