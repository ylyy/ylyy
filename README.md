# AI 对话管理系统

## 第一次启动（只需做一次）

### 第一步：安装前端依赖
```bash
# 在项目根目录 my-ai-log/ 下运行
npm install
```

### 第二步：安装后端依赖
```bash
# 进入 server 目录
cd server
npm install

# 回到根目录
cd ..
```

---

## 每次开发时启动（需要开两个终端窗口）

### 终端 1 — 启动前端
```bash
# 在项目根目录
npm run dev
# 访问 http://localhost:5173
```

### 终端 2 — 启动后端
```bash
# 在 server/ 目录
cd server
node index.cjs

# 或者用 nodemon 自动重启（推荐）
npx nodemon index.cjs
# 访问 http://localhost:3001/api/projects
```

---

## 项目结构
```
my-ai-log/
├── index.html          # HTML 入口
├── package.json        # 前端依赖
├── vite.config.js      # Vite 配置（含 API 代理）
├── tailwind.config.js  # Tailwind 配置
├── postcss.config.js
├── ailog.db            # SQLite 数据库（首次启动后端后自动生成）
├── src/
│   ├── main.jsx        # React 入口
│   ├── App.jsx         # 主组件（Day 4 会填充）
│   └── index.css       # 全局样式
└── server/
    ├── package.json    # 后端依赖
    └── index.cjs       # Express 后端（Day 3 完整接口）
```

---

## 测试接口（用浏览器或 curl）

```bash
# 新建项目
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "我的第一个项目"}'

# 查看所有项目
curl http://localhost:3001/api/projects

# 新建对话
curl -X POST http://localhost:3001/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"project_id": 1, "title": "测试对话", "role_tag": "工程师", "content": "这是内容"}'
```
