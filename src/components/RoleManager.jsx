// src/components/RoleManager.jsx
// AI 角色管理面板
import { useState } from 'react'

const API_BASE = 'http://localhost:3001/api'
const AVATARS = ['🤖', '🏗️', '💻', '📊', '🧪', '🎨', '📝', '🔍', '🛡️', '📦', '🚀', '🧠', '🎯', '⚡']
const COLORS = ['#6366f1', '#f97316', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#64748b']

export default function RoleManager({ show, onClose, projectId, roles, onRolesChange }) {
  const [newName, setNewName] = useState('')
  const [newModel, setNewModel] = useState('')
  const [newAvatar, setNewAvatar] = useState('🤖')
  const [newColor, setNewColor] = useState('#6366f1')
  const [editingId, setEditingId] = useState(null)

  const handleAdd = async () => {
    if (!newName.trim()) return
    const res = await fetch(`${API_BASE}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, name: newName, ai_model: newModel, avatar: newAvatar, color: newColor })
    })
    if (res.ok) {
      setNewName('')
      setNewModel('')
      setNewAvatar('🤖')
      setNewColor('#6366f1')
      onRolesChange?.()
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('删除此角色？关联的对话不会被删除。')) return
    await fetch(`${API_BASE}/roles/${id}`, { method: 'DELETE' })
    onRolesChange?.()
  }

  const handleUpdate = async (role) => {
    await fetch(`${API_BASE}/roles/${role.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(role)
    })
    setEditingId(null)
    onRolesChange?.()
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[80vh] flex flex-col scale-in">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">👥</span>
            <h3 className="font-bold text-gray-800">AI 角色管理</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 已有角色列表 */}
          {roles?.map(role => (
            <div key={role.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ backgroundColor: role.color + '20' }}>
                {role.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-800">{role.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{role.ai_model || '未指定'}</span>
                </div>
                <div className="w-3 h-3 rounded-full mt-1" style={{ backgroundColor: role.color }} />
              </div>
              <button onClick={() => handleDelete(role.id)}
                className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                🗑️
              </button>
            </div>
          ))}

          {roles?.length === 0 && (
            <div className="text-center py-8 text-gray-300 text-sm">
              <p className="text-3xl mb-2">👥</p>
              <p>暂无角色，创建您的第一个 AI 助手吧</p>
            </div>
          )}

          {/* 新建角色 */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">新建角色</p>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="角色名称 (如: 架构师)"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                <input value={newModel} onChange={e => setNewModel(e.target.value)} placeholder="AI 模型 (如: Claude)"
                  className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>

              <div>
                <span className="text-[10px] text-gray-400 block mb-1">头像</span>
                <div className="flex gap-1.5 flex-wrap">
                  {AVATARS.map(a => (
                    <button key={a} onClick={() => setNewAvatar(a)}
                      className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                        newAvatar === a ? 'bg-indigo-100 ring-2 ring-indigo-500 scale-110' : 'bg-gray-50 hover:bg-gray-100'
                      }`}>{a}</button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 block mb-1">颜色</span>
                <div className="flex gap-1.5">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setNewColor(c)}
                      className={`w-6 h-6 rounded-full transition-all ${
                        newColor === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-110'
                      }`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>

              <button onClick={handleAdd} disabled={!newName.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]">
                + 添加角色
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
