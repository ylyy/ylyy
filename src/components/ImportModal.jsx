// src/components/ImportModal.jsx
import { useState, useEffect } from 'react'

const API_BASE = 'http://localhost:3001/api'

export default function ImportModal({ show, onClose, projectId, onImportComplete }) {
  const [scanning, setScanning] = useState(false)
  const [importing, setImporting] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [selected, setSelected] = useState(new Set())

  useEffect(() => {
    if (show) {
      handleScan()
    }
  }, [show])

  const handleScan = async () => {
    setScanning(true)
    setScanResult(null)
    setSelected(new Set())
    try {
      const res = await fetch(`${API_BASE}/import/scan`)
      const data = await res.json()
      setScanResult(data)
      // 默认全选
      const allIds = new Set()
      data.claude?.forEach(s => allIds.add(s.id))
      data.gemini?.forEach(s => allIds.add(s.id))
      setSelected(allIds)
    } catch (err) {
      console.error('Scan failed', err)
    } finally {
      setScanning(false)
    }
  }

  const toggleSelect = (id) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const toggleAll = () => {
    if (!scanResult) return
    const all = [...(scanResult.claude || []), ...(scanResult.gemini || [])]
    if (selected.size === all.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(all.map(s => s.id)))
    }
  }

  const handleImport = async () => {
    if (!projectId || selected.size === 0) return
    setImporting(true)
    try {
      const allSessions = [...(scanResult.claude || []), ...(scanResult.gemini || [])]
      const toImport = allSessions.filter(s => selected.has(s.id))

      const res = await fetch(`${API_BASE}/import/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessions: toImport, project_id: projectId })
      })
      const data = await res.json()

      if (data.success) {
        onImportComplete?.(data)
        onClose()
      }
    } catch (err) {
      console.error('Import failed', err)
    } finally {
      setImporting(false)
    }
  }

  if (!show) return null

  const allSessions = scanResult
    ? [...(scanResult.claude || []), ...(scanResult.gemini || [])]
    : []

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl">📥</span>
            <h3 className="font-bold text-gray-800">导入 AI 对话记录</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {scanning ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="text-4xl mb-4 animate-spin">🔄</div>
              <p className="text-sm">正在扫描本地 AI 对话记录...</p>
            </div>
          ) : scanResult && allSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-sm">未找到可导入的对话记录</p>
              <p className="text-xs mt-2 text-gray-300">支持 Claude Code CLI 和 Gemini CLI 的本地对话</p>
            </div>
          ) : scanResult ? (
            <div className="space-y-4">
              {/* 统计 & 全选 */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">
                  找到 <span className="font-bold text-indigo-600">{allSessions.length}</span> 个会话，
                  已选 <span className="font-bold text-indigo-600">{selected.size}</span> 个
                </p>
                <button
                  onClick={toggleAll}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {selected.size === allSessions.length ? '取消全选' : '全选'}
                </button>
              </div>

              {/* Claude 会话 */}
              {scanResult.claude?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Claude Code</span>
                    <span className="text-xs text-gray-400">{scanResult.claude.length} 个会话</span>
                  </div>
                  <div className="space-y-2">
                    {scanResult.claude.map(session => (
                      <SessionItem key={session.id} session={session} selected={selected.has(session.id)} onToggle={() => toggleSelect(session.id)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Gemini 会话 */}
              {scanResult.gemini?.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Gemini CLI</span>
                    <span className="text-xs text-gray-400">{scanResult.gemini.length} 个会话</span>
                  </div>
                  <div className="space-y-2">
                    {scanResult.gemini.map(session => (
                      <SessionItem key={session.id} session={session} selected={selected.has(session.id)} onToggle={() => toggleSelect(session.id)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-colors">
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={importing || selected.size === 0}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-medium py-3 rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {importing ? (
              <><span className="animate-spin">⏳</span> 导入中...</>
            ) : (
              <>📥 导入 {selected.size} 个会话</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function SessionItem({ session, selected, onToggle }) {
  return (
    <div
      onClick={onToggle}
      className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
        selected
          ? 'border-indigo-300 bg-indigo-50/60'
          : 'border-gray-100 bg-white hover:bg-gray-50'
      }`}
    >
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
        selected ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
      }`}>
        {selected && <span className="text-white text-xs">✓</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{session.title}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] text-gray-400">
            {session.messageCount} 条消息
          </span>
          {session.timestamp && (
            <span className="text-[10px] text-gray-400">
              {new Date(session.timestamp).toLocaleDateString()}
            </span>
          )}
        </div>
        {session.preview && (
          <p className="text-xs text-gray-400 mt-1 truncate">{session.preview}</p>
        )}
      </div>
    </div>
  )
}
