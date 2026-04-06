// src/components/Sidebar.jsx
export default function Sidebar({
  projects,
  selectedProjectId,
  setSelectedProjectId,
  isAddingProject,
  setIsAddingProject,
  newProjectName,
  setNewProjectName,
  handleAddProject,
  handleDeleteProject,
  currentView,
  setCurrentView,
  roles,
  onManageRoles,
  selectedRoleFilter,
  setSelectedRoleFilter
}) {
  return (
    <div className="w-72 bg-[#111827] text-gray-300 flex flex-col shadow-2xl">
      {/* Logo */}
      <div className="p-5 border-b border-gray-800 flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">
          A
        </div>
        <div>
          <span className="text-lg font-bold text-white tracking-tight block leading-tight">AI Log</span>
          <span className="text-[10px] text-gray-500 tracking-wider">协作管理系统</span>
        </div>
      </div>

      {/* 视图切换 */}
      <div className="px-3 pt-4 pb-2">
        <div className="flex bg-gray-800/50 rounded-xl p-1 gap-1">
          {[
            { key: 'list', icon: '📋', label: '列表' },
            { key: 'phases', icon: '📂', label: '阶段' },
            { key: 'dashboard', icon: '📊', label: '总览' }
          ].map(v => (
            <button key={v.key}
              onClick={() => setCurrentView?.(v.key)}
              className={`flex-1 text-xs py-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                currentView === v.key
                  ? 'bg-indigo-600 text-white font-bold shadow-lg'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span>{v.icon}</span>
              <span>{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 项目列表 */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">项目</span>
          <button onClick={() => setIsAddingProject(true)} className="text-gray-400 hover:text-white">
            <span className="text-lg">+</span>
          </button>
        </div>

        {isAddingProject && (
          <form onSubmit={handleAddProject} className="px-3 mb-3">
            <input autoFocus value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              placeholder="项目名称..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              onBlur={() => !newProjectName && setIsAddingProject(false)}
            />
          </form>
        )}

        {projects.map(proj => (
          <div key={proj.id}
            onClick={() => setSelectedProjectId(proj.id)}
            className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer sidebar-item ${
              selectedProjectId === proj.id ? 'active-sidebar text-white shadow-lg' : 'hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3 truncate flex-1 min-w-0">
              <span className="text-xs opacity-50">#</span>
              <div className="truncate">
                <span className="truncate text-sm font-medium block">{proj.name}</span>
                <span className="text-[10px] text-gray-500">{proj.conv_count || 0} 对话</span>
              </div>
            </div>
            <button onClick={(e) => handleDeleteProject(proj.id, e)}
              className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 text-xs px-1 shrink-0">✕</button>
          </div>
        ))}
      </div>

      {/* AI 角色过滤 */}
      {roles?.length > 0 && (
        <div className="px-3 py-3 border-t border-gray-800">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI 角色</span>
            <button onClick={onManageRoles} className="text-gray-500 hover:text-indigo-400 text-[10px]">管理</button>
          </div>
          <div className="space-y-0.5">
            <button
              onClick={() => setSelectedRoleFilter?.(null)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
                !selectedRoleFilter ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span>👥</span><span>全部角色</span>
            </button>
            {roles.map(r => (
              <button key={r.id}
                onClick={() => setSelectedRoleFilter?.(r.id)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
                  selectedRoleFilter === r.id ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <span>{r.avatar}</span>
                <span className="truncate">{r.name}</span>
                <span className="text-[10px] text-gray-600 ml-auto">{r.ai_model}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 border-t border-gray-800 text-[10px] text-gray-600 text-center uppercase tracking-widest">
        v1.0.0 · AI 协作管理
      </div>
    </div>
  )
}
