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
  handleDeleteProject
}) {
  return (
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
  )
}
