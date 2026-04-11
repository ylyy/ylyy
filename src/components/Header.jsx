// src/components/Header.jsx
export default function Header({
  activeProject,
  conversationsCount,
  searchQuery,
  setSearchQuery,
  setShowAddConv,
  setShowImport,
  setShowChat
}) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between shadow-sm z-10 gap-x-4">
      <div className="flex items-center gap-3 min-w-fit">
        <h2 className="text-lg font-semibold text-gray-800">
          {activeProject ? activeProject.name : '选择或创建一个项目'}
        </h2>
        {activeProject && (
          <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">
            {conversationsCount} 记录
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChat(true)}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-md shadow-purple-100 flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>🤖</span>
            <span>AI 对话</span>
          </button>

          <button
            onClick={() => setShowAddConv(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>+</span>
            <span>手动记录</span>
          </button>
        </div>
      )}
    </header>
  )
}
