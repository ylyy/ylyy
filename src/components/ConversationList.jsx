// src/components/ConversationList.jsx
export default function ConversationList({
  activeProject,
  filteredConversations,
  allTags,
  selectedTag,
  setSelectedTag,
  handleDeleteConversation,
  conversationsLength
}) {
  if (!activeProject) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <div className="text-6xl mb-4 animate-bounce">👈</div>
        <p className="text-sm">从左侧选择一个项目开始记录您的 AI 对话</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 标签过滤栏 */}
      {conversationsLength > 0 && (
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
            {conversationsLength === 0 ? '该项目下暂无对话记录' : '未找到匹配的对话'}
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
  )
}
