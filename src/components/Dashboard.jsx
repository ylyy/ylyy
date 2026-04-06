// src/components/Dashboard.jsx
// 项目总览 Dashboard — 鸟瞰全局视图
import { useState, useEffect } from 'react'

const API_BASE = 'http://localhost:3001/api'

export default function Dashboard({ projectId, projectName }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) fetchStats()
  }, [projectId])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/stats/${projectId}`)
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!projectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <div className="text-6xl mb-4">📊</div>
        <p className="text-sm">选择一个项目查看总览</p>
      </div>
    )
  }

  if (loading || !stats) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-4xl animate-spin">🔄</div>
      </div>
    )
  }

  const maxRoleConv = Math.max(...(stats.roleStats.map(r => r.conv_count) || [0]), 1)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        📊 <span>{projectName}</span> <span className="text-gray-400 font-normal text-sm">项目总览</span>
      </h2>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">总对话</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{stats.convCount}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">⭐ 已星标</div>
          <div className="text-3xl font-bold text-amber-500 mt-1">{stats.starredCount}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">数据来源</div>
          <div className="text-3xl font-bold text-indigo-600 mt-1">{stats.sourceStats.length}</div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {stats.sourceStats.map(s => (
              <span key={s.source} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {s.source}: {s.count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* AI 角色工作量 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          👥 AI 角色工作量分布
        </h3>
        {stats.roleStats.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">暂无角色数据</p>
        ) : (
          <div className="space-y-3">
            {stats.roleStats.map((role, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                  style={{ backgroundColor: (role.color || '#6366f1') + '18' }}>
                  {role.avatar}
                </div>
                <span className="text-sm font-medium text-gray-700 w-20 shrink-0 truncate">{role.name}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div className="h-full rounded-full flex items-center px-2 text-[10px] text-white font-bold transition-all duration-500"
                    style={{
                      width: `${Math.max((role.conv_count / maxRoleConv) * 100, 8)}%`,
                      backgroundColor: role.color || '#6366f1'
                    }}>
                    {role.conv_count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 阶段进度 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          📂 阶段进度
        </h3>
        {stats.phaseStats.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">暂无阶段数据</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {stats.phaseStats.map((phase, i) => (
              <div key={i} className="flex-1 min-w-[120px] bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: phase.color }}>
                  {phase.conv_count}
                </div>
                <p className="text-xs font-medium text-gray-700 truncate">{phase.name}</p>
                <p className="text-[10px] text-gray-400">{phase.conv_count} 条对话</p>
                {i < stats.phaseStats.length - 1 && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-300">→</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
