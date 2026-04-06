// src/components/ConversationDetail.jsx
// 对话详情面板 — 完整聊天气泡视图
import { useState, useEffect, useRef } from 'react'

const API_BASE = 'http://localhost:3001/api'

const STATUS_MAP = {
  active: { label: '进行中', icon: '🔵', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  adopted: { label: '已采纳', icon: '✅', color: 'bg-green-50 text-green-700 border-green-200' },
  pending: { label: '待验证', icon: '⚠️', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  archived: { label: '已归档', icon: '📦', color: 'bg-gray-50 text-gray-500 border-gray-200' },
}

export default function ConversationDetail({ conversation, phases, roles, onUpdate, onClose }) {
  const [messages, setMessages] = useState([])
  const [showMeta, setShowMeta] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (conversation?.messages) {
      try {
        const parsed = typeof conversation.messages === 'string'
          ? JSON.parse(conversation.messages)
          : conversation.messages
        setMessages(parsed)
      } catch { setMessages([]) }
    } else {
      setMessages([])
    }
  }, [conversation])

  const handleStatusChange = async (status) => {
    const res = await fetch(`${API_BASE}/conversations/${conversation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    const updated = await res.json()
    onUpdate?.(updated)
  }

  const handleStarToggle = async () => {
    const res = await fetch(`${API_BASE}/conversations/${conversation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred: conversation.starred ? 0 : 1 })
    })
    const updated = await res.json()
    onUpdate?.(updated)
  }

  const handlePhaseChange = async (phaseId) => {
    const res = await fetch(`${API_BASE}/conversations/${conversation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase_id: phaseId || null })
    })
    const updated = await res.json()
    onUpdate?.(updated)
  }

  const handleRoleChange = async (roleId) => {
    const res = await fetch(`${API_BASE}/conversations/${conversation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id: roleId || null })
    })
    const updated = await res.json()
    onUpdate?.(updated)
  }

  if (!conversation) return null

  const st = STATUS_MAP[conversation.status] || STATUS_MAP.active

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex">
      {/* 主面板 */}
      <div className="flex-1" onClick={onClose} />

      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col chat-panel-slide">
        {/* Header */}
        <div className="shrink-0 border-b border-gray-100">
          <div className="px-6 py-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                {conversation.role_avatar && (
                  <span className="text-lg">{conversation.role_avatar}</span>
                )}
                <h2 className="text-lg font-bold text-gray-900 truncate">{conversation.title}</h2>
                <button onClick={handleStarToggle} className="text-lg hover:scale-110 transition-transform">
                  {conversation.starred ? '⭐' : '☆'}
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {conversation.role_name && (
                  <span className="px-2 py-0.5 rounded-full text-white font-medium"
                    style={{ backgroundColor: conversation.role_color || '#6366f1' }}>
                    {conversation.role_name}
                  </span>
                )}
                {conversation.phase_name && (
                  <span className="px-2 py-0.5 rounded-full border font-medium"
                    style={{ borderColor: conversation.phase_color, color: conversation.phase_color }}>
                    {conversation.phase_name}
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${st.color}`}>
                  {st.icon} {st.label}
                </span>
                <span className="text-gray-400">
                  {new Date(conversation.created_at).toLocaleString()} · {messages.length} 条消息
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl shrink-0 mt-1">✕</button>
          </div>

          {/* 分类工具栏 */}
          <div className="px-6 pb-3 flex items-center gap-2 text-[11px]">
            <button onClick={() => setShowMeta(!showMeta)}
              className="text-gray-400 hover:text-indigo-600 flex items-center gap-1 transition-colors">
              ⚙️ {showMeta ? '收起' : '管理'}
            </button>
          </div>

          {showMeta && (
            <div className="px-6 pb-4 space-y-3 bg-gray-50/50 border-t border-gray-100 pt-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-12 shrink-0">阶段</span>
                <select value={conversation.phase_id || ''} onChange={e => handlePhaseChange(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="">未分配</option>
                  {phases?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-12 shrink-0">角色</span>
                <select value={conversation.role_id || ''} onChange={e => handleRoleChange(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="">未分配</option>
                  {roles?.map(r => <option key={r.id} value={r.id}>{r.avatar} {r.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-12 shrink-0">状态</span>
                <div className="flex gap-1.5">
                  {Object.entries(STATUS_MAP).map(([key, val]) => (
                    <button key={key} onClick={() => handleStatusChange(key)}
                      className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${
                        conversation.status === key ? val.color + ' font-bold shadow-sm' : 'border-gray-200 text-gray-400 hover:border-gray-300'
                      }`}>
                      {val.icon} {val.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 对话消息列表 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-300">
              <div className="text-4xl mb-3">💭</div>
              <p className="text-sm">此对话暂无消息记录</p>
              {conversation.content && (
                <div className="mt-4 max-w-md text-xs text-gray-400 bg-gray-50 p-4 rounded-xl whitespace-pre-wrap">
                  {conversation.content}
                </div>
              )}
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] group relative`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.timestamp && (
                    <span className="text-[10px] text-gray-300 mt-1 block px-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
