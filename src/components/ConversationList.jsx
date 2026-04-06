// src/components/ConversationList.jsx
const STATUS_ICONS = { active: '🔵', adopted: '✅', pending: '⚠️', archived: '📦' }

export default function ConversationList({
  activeProject,
  filteredConversations,
  allTags,
  selectedTag,
  setSelectedTag,
  handleDeleteConversation,
  conversationsLength,
  onConversationClick,
  phases,
  selectedPhase,
  setSelectedPhase
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
      {/* 过滤栏 */}
      {conversationsLength > 0 && (
        <div className="space-y-3">
          {/* 阶段过滤 */}
          {phases?.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-1 shrink-0">阶段:</span>
              <button
                onClick={() => setSelectedPhase?.(null)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                  !selectedPhase ? 'bg-gray-800 border-gray-800 text-white' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300'
                }`}
              >全部</button>
              {phases.map(p => (
                <button key={p.id}
                  onClick={() => setSelectedPhase?.(p.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                    selectedPhase === p.id
                      ? 'text-white shadow-sm'
                      : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300'
                  }`}
                  style={selectedPhase === p.id ? { backgroundColor: p.color, borderColor: p.color } : {}}
                >{p.name}</button>
              ))}
            </div>
          )}

          {/* 角色标签过滤 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-1 shrink-0">角色:</span>
            {allTags.map(tag => (
              <button key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                  selectedTag === tag
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                  : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300'
                }`}
              >{tag}</button>
            ))}
          </div>
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
          <div key={conv.id}
            onClick={() => onConversationClick?.(conv)}
            className="glass-card rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all relative group cursor-pointer border-l-4 hover:translate-x-1"
            style={{ borderLeftColor: conv.role_color || (conv.starred ? '#f59e0b' : 'transparent') }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {/* AI 角色头像 */}
                {conv.role_avatar ? (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm"
                    style={{ backgroundColor: (conv.role_color || '#6366f1') + '18' }}>
                    {conv.role_avatar}
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 bg-gray-100 shadow-sm">
                    💬
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {conv.starred ? <span className="text-sm">⭐</span> : null}
                    {conv.role_name && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: conv.role_color || '#6366f1' }}>
                        {conv.role_name}
                      </span>
                    )}
                    {!conv.role_name && conv.role_tag && conv.role_tag !== '未分类' && (
                      <span className="bg-gray-100 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter">
                        {conv.role_tag}
                      </span>
                    )}
                    {conv.phase_name && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                        style={{ borderColor: conv.phase_color, color: conv.phase_color }}>
                        {conv.phase_name}
                      </span>
                    )}
                    {conv.status && conv.status !== 'active' && (
                      <span className="text-[10px]">{STATUS_ICONS[conv.status]}</span>
                    )}
                    <span className="text-[10px] text-gray-400">
                      {new Date(conv.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                    {conv.title}
                  </h3>
                  {conv.summary && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{conv.summary}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                {conv.messages && conv.messages !== '[]' && (
                  <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                    {(() => { try { return JSON.parse(conv.messages).length } catch { return 0 } })()}条
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id) }}
                  className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* 内容预览 */}
            {conv.content && (
              <div className="text-gray-500 text-xs leading-relaxed line-clamp-2 pl-[52px]">
                {conv.content}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
