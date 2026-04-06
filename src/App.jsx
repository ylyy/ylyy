import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ConversationList from './components/ConversationList'
import AddConversationModal from './components/AddConversationModal'
import ImportModal from './components/ImportModal'
import ChatPanel from './components/ChatPanel'

const API_BASE = 'http://localhost:3001/api'

function App() {
  // 项目状态
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [isAddingProject, setIsAddingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  // 对话列表及过滤状态
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState('All')

  // 对话表单弹窗状态
  const [showAddConv, setShowAddConv] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newRole, setNewRole] = useState('未分类')
  const [newContent, setNewContent] = useState('')

  // 导入弹窗状态
  const [showImport, setShowImport] = useState(false)

  // AI Chat 面板状态
  const [showChat, setShowChat] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProjectId) {
      fetchConversations(selectedProjectId)
    } else {
      setConversations([])
    }
  }, [selectedProjectId])

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`)
      const data = await res.json()
      setProjects(data)
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id)
      }
    } catch (err) {
      console.error('Failed to fetch projects', err)
    }
  }

  const fetchConversations = async (projectId) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/conversations?project_id=${projectId}`)
      const data = await res.json()
      setConversations(data)
    } catch (err) {
      console.error('Failed to fetch conversations', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProject = async (e) => {
    e.preventDefault()
    if (!newProjectName.trim()) return
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName })
      })
      const newProj = await res.json()
      setProjects([newProj, ...projects])
      setSelectedProjectId(newProj.id)
      setNewProjectName('')
      setIsAddingProject(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddConversation = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    try {
      const res = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProjectId,
          title: newTitle,
          role_tag: newRole,
          content: newContent
        })
      })
      const newConv = await res.json()
      setConversations([newConv, ...conversations])
      setNewTitle('')
      setNewContent('')
      setShowAddConv(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteProject = async (id, e) => {
    e.stopPropagation()
    if (!confirm('确定删除该项目及所有对话吗？')) return
    try {
      await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' })
      setProjects(projects.filter(p => p.id !== id))
      if (selectedProjectId === id) setSelectedProjectId(null)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteConversation = async (id) => {
    if (!confirm('确定删除此对话吗？')) return
    try {
      await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' })
      setConversations(conversations.filter(c => c.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const handleImportComplete = (data) => {
    // 导入完成后刷新当前对话列表
    if (selectedProjectId) {
      fetchConversations(selectedProjectId)
    }
  }

  const handleChatNewMessage = () => {
    // AI Chat 产生新消息后刷新对话列表
    if (selectedProjectId) {
      fetchConversations(selectedProjectId)
    }
  }

  const activeProject = projects.find(p => p.id === selectedProjectId)

  // 过滤逻辑
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          conv.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTag = selectedTag === 'All' || conv.role_tag === selectedTag
    return matchesSearch && matchesTag
  })

  const allTags = ['All', ...new Set(conversations.map(c => c.role_tag))]

  return (
    <div className="flex h-screen bg-[#f3f4f6]">
      <Sidebar 
        projects={projects}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        isAddingProject={isAddingProject}
        setIsAddingProject={setIsAddingProject}
        newProjectName={newProjectName}
        setNewProjectName={setNewProjectName}
        handleAddProject={handleAddProject}
        handleDeleteProject={handleDeleteProject}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          activeProject={activeProject}
          conversationsCount={conversations.length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setShowAddConv={setShowAddConv}
          setShowImport={setShowImport}
          setShowChat={setShowChat}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <ConversationList 
            activeProject={activeProject}
            filteredConversations={filteredConversations}
            allTags={allTags}
            selectedTag={selectedTag}
            setSelectedTag={setSelectedTag}
            handleDeleteConversation={handleDeleteConversation}
            conversationsLength={conversations.length}
          />
        </main>
      </div>

      <AddConversationModal 
        showAddConv={showAddConv}
        setShowAddConv={setShowAddConv}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        newRole={newRole}
        setNewRole={setNewRole}
        newContent={newContent}
        setNewContent={setNewContent}
        handleAddConversation={handleAddConversation}
      />

      <ImportModal
        show={showImport}
        onClose={() => setShowImport(false)}
        projectId={selectedProjectId}
        onImportComplete={handleImportComplete}
      />

      <ChatPanel
        show={showChat}
        onClose={() => setShowChat(false)}
        projectId={selectedProjectId}
        onNewChat={handleChatNewMessage}
      />
    </div>
  )
}

export default App
