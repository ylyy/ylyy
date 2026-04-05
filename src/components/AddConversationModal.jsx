// src/components/AddConversationModal.jsx
export default function AddConversationModal({
  showAddConv,
  setShowAddConv,
  newTitle,
  setNewTitle,
  newRole,
  setNewRole,
  newContent,
  setNewContent,
  handleAddConversation
}) {
  if (!showAddConv) return null;

  return (
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
  )
}
