// src/components/ChatPanel.jsx
import { useState, useRef, useEffect } from 'react'

const API_BASE = 'http://localhost:3001/api'

export default function ChatPanel({ show, onClose, projectId, onNewChat }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatTitle, setChatTitle] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (show) {
      setMessages([])
      setInput('')
      setChatTitle('')
    }
  }, [show])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMsg = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    // 第一条消息时自动生成标题
    if (!chatTitle) {
      setChatTitle(userMsg.content.substring(0, 40))
    }

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          project_id: projectId,
          title: chatTitle || userMsg.content.substring(0, 40)
        })
      })
      const data = await res.json()

      if (data.error) {
        setMessages([...newMessages, {
          role: 'assistant',
          content: `⚠️ ${data.error}`
        }])
      } else {
        setMessages([...newMessages, {
          role: 'assistant',
          content: data.reply
        }])
        // 通知父组件刷新对话列表
        onNewChat?.()
      }
    } catch (err) {
      setMessages([...newMessages, {
        role: 'assistant',
        content: '⚠️ 网络错误，无法连接到 AI 服务'
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl z-40 flex flex-col border-l border-gray-200 chat-panel-slide">
      {/* Header */}
      <div className="h-14 bg-gradient-to-r from-indigo-600 to-purple-600 px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-white">
          <span className="text-lg">🤖</span>
          <span className="font-bold text-sm">AI 助手</span>
          {chatTitle && (
            <span className="text-white/60 text-xs ml-2 truncate max-w-[200px]">· {chatTitle}</span>
          )}
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white text-sm">✕</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-300">
            <div className="text-5xl mb-4">💬</div>
            <p className="text-sm text-center">开始和 AI 对话吧<br/>
            <span className="text-xs text-gray-300">对话将自动保存到当前项目</span></p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-br-md'
                : 'bg-gray-100 text-gray-800 rounded-bl-md'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 px-4 py-3 rounded-2xl rounded-bl-md text-sm">
              <span className="inline-flex gap-1">
                <span className="animate-bounce" style={{animationDelay: '0ms'}}>●</span>
                <span className="animate-bounce" style={{animationDelay: '150ms'}}>●</span>
                <span className="animate-bounce" style={{animationDelay: '300ms'}}>●</span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100 shrink-0">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            rows={2}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-4 rounded-xl transition-all active:scale-95 shrink-0"
          >
            ➤
          </button>
        </div>
        <p className="text-[10px] text-gray-300 mt-2 text-center">
          需要配置 AI_API_KEY 环境变量才能使用
        </p>
      </div>
    </div>
  )
}
