import { useState, useEffect } from 'react'

const API_BASE = 'http://localhost:3001/api'

function App() {
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [isAddingProject, setIsAddingProject] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState('All')

  // 对话表单状态
  const [showAddConv, setShowAddConv] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newRole, setNewRole] = useState('未分类')
  const [newContent, setNewContent] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProjectId) {
      fetchConversations(selectedProjectId)
    } else {
      setConversations([])
    }
  }, [selectedProjectId])

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`)
      const data = await res.json()
      setProjects(data)
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id)
      }
    } catch (err) {
      console.error('Failed to fetch projects', err)
    }
  }

  const fetchConversations = async (projectId) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/conversations?project_id=${projectId}`)
      const data = await res.json()
      setConversations(data)
    } catch (err) {
      console.error('Failed to fetch conversations', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProject = async (e) => {
    e.preventDefault()
    if (!newProjectName.trim()) return
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName })
      })
      const newProj = await res.json()
      setProjects([newProj, ...projects])
      setSelectedProjectId(newProj.id)
      setNewProjectName('')
      setIsAddingProject(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddConversation = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    try {
      const res = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProjectId,
          title: newTitle,
          role_tag: newRole,
          content: newContent
        })
      })
      const newConv = await res.json()
      setConversations([newConv, ...conversations])
      setNewTitle('')
      setNewContent('')
      setShowAddConv(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteProject = async (id, e) => {
    e.stopPropagation()
    if (!confirm('确定删除该项目及所有对话吗？')) return
    try {
      await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' })
      setProjects(projects.filter(p => p.id !== id))
      if (selectedProjectId === id) setSelectedProjectId(null)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteConversation = async (id) => {
    if (!confirm('确定删除此对话吗？')) return
    try {
      await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' })
      setConversations(conversations.filter(c => c.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const activeProject = projects.find(p => p.id === selectedProjectId)

  // 过滤逻辑
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          conv.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTag = selectedTag === 'All' || conv.role_tag === selectedTag
    return matchesSearch && matchesTag
  })

  // 获取该项目下所有的角色标签用于过滤
  const allTags = ['All', ...new Set(conversations.map(c => c.role_tag))]

  return (
    <div className="flex h-screen bg-[#f3f4f6]">
      {/* 侧边栏 */}
      <div className="w-64 bg-[#111827] text-gray-300 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">
            A
          </div>
          <span className="text-xl font-bold text-white tracking-tight">AI Log</span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">项目列表</span>
            <button 
              onClick={() => setIsAddingProject(true)}
              className="text-gray-400 hover:text-white"
            >
              <span className="text-lg">+</span>
            </button>
          </div>

          {isAddingProject && (
            <form onSubmit={handleAddProject} className="px-3 mb-4">
              <input
                autoFocus
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="项目名称..."
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                onBlur={() => !newProjectName && setIsAddingProject(false)}
              />
            </form>
          )}

          {projects.map(proj => (
            <div
              key={proj.id}
              onClick={() => setSelectedProjectId(proj.id)}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer sidebar-item ${
                selectedProjectId === proj.id ? 'active-sidebar text-white shadow-lg' : 'hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <span className="text-xs opacity-50">#</span>
                <span className="truncate text-sm font-medium">{proj.name}</span>
              </div>
              <button
                onClick={(e) => handleDeleteProject(proj.id, e)}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 text-xs px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-800 text-[10px] text-gray-500 text-center uppercase tracking-widest">
          Version 0.4.0
        </div>
      </div>

      {/* 主界面 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between shadow-sm z-10 gap-x-4">
          <div className="flex items-center gap-3 min-w-fit">
            <h2 className="text-lg font-semibold text-gray-800">
              {activeProject ? activeProject.name : '选择或创建一个项目'}
            </h2>
            {activeProject && (
              <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">
                {conversations.length} 记录
              </span>
            )}
          </div>

          {activeProject && (
            <div className="flex-1 max-w-md mx-4">
              <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors">🔍</span>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜索标题或内容..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          )}

          {activeProject && (
            <button
              onClick={() => setShowAddConv(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md shadow-indigo-100 flex items-center gap-2 whitespace-nowrap"
            >
              <span>+</span>
              <span>记录新对话</span>
            </button>
          )}
        </header>

        {/* 内容区 */}
        <main className="flex-1 overflow-y-auto p-8">
          {!activeProject ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <div className="text-6xl mb-4 animate-bounce">👈</div>
              <p className="text-sm">从左侧选择一个项目开始记录您的 AI 对话</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* 标签过滤栏 */}
              {conversations.length > 0 && (
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 noscrollbar">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-2">Filter:</span>
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                        selectedTag === tag 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                        : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              {filteredConversations.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                  <div className="text-4xl mb-4 opacity-50">🔍</div>
                  <p className="text-sm italic">
                    {conversations.length === 0 ? '该项目下暂无对话记录' : '未找到匹配的对话'}
                  </p>
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <div key={conv.id} className="glass-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative group border-l-4 border-l-transparent hover:border-l-indigo-400">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="bg-gray-100 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter">
                            {conv.role_tag}
                          </span>
                          <span className="text-xs text-gray-400 font-light">
                            {new Date(conv.created_at).toLocaleString()}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{conv.title}</h3>
                      </div>
                      <button
                        onClick={() => handleDeleteConversation(conv.id)}
                        className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="text-sm underline underline-offset-4 decoration-current decoration-from-font opacity-70">删除</span>
                      </button>
                    </div>
                    <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                      {conv.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>

      {/* 新增对话弹窗 */}
      {showAddConv && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden scale-in">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">记录新对话</h3>
              <button 
                onClick={() => setShowAddConv(false)}
                className="text-gray-400 hover:text-gray-600"
              >✕</button>
            </div>
            <form onSubmit={handleAddConversation} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">对话标题</label>
                <input
                  autoFocus
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="例如: 讨论代码重构"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">角色/标签</label>
                <input
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  placeholder="项目经理, 后端专家..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">详细内容 (可选)</label>
                <textarea
                  rows={4}
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="记录关键的 Prompt 或 AI 的回复..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddConv(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
                >
                  保存记录
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
