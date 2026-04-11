import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ConversationList from './components/ConversationList'
import ConversationDetail from './components/ConversationDetail'
import AddConversationModal from './components/AddConversationModal'
import ImportModal from './components/ImportModal'
import ChatPanel from './components/ChatPanel'
import RoleManager from './components/RoleManager'
import Dashboard from './components/Dashboard'

const API_BASE = 'http://localhost:3001/api'

function App() {
  // 项目
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [isAddingProject, setIsAddingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  // 对话
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState('All')

  // 新增状态：阶段 & 角色
  const [phases, setPhases] = useState([])
  const [roles, setRoles] = useState([])
  const [selectedPhase, setSelectedPhase] = useState(null)
  const [selectedRoleFilter, setSelectedRoleFilter] = useState(null)

  // 视图
  const [currentView, setCurrentView] = useState('list') // list | phases | dashboard

  // 弹窗/面板
  const [showAddConv, setShowAddConv] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showRoleManager, setShowRoleManager] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState(null)

  // 对话表单
  const [newTitle, setNewTitle] = useState('')
  const [newRole, setNewRole] = useState('未分类')
  const [newContent, setNewContent] = useState('')

  useEffect(() => { fetchProjects() }, [])

  // 监听后端 Watcher 自动同步事件 (SSE)
  useEffect(() => {
    const evtSource = new EventSource(`${API_BASE}/events`);
    evtSource.onmessage = (event) => {
      if (event.data === 'update') {
        console.log('🔄 后台自动同步数据，正在刷新列表...');
        fetchProjects();
        if (selectedProjectId) {
          fetchConversations(selectedProjectId);
        }
      }
    };
    return () => evtSource.close();
  }, [selectedProjectId]);


  useEffect(() => {
    if (selectedProjectId) {
      fetchConversations(selectedProjectId)
      fetchPhases(selectedProjectId)
      fetchRoles(selectedProjectId)
      setSelectedPhase(null)
      setSelectedRoleFilter(null)
      setSelectedTag('All')
    } else {
      setConversations([])
      setPhases([])
      setRoles([])
    }
  }, [selectedProjectId])

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`)
      const data = await res.json()
      setProjects(data)
      if (data.length > 0 && !selectedProjectId) setSelectedProjectId(data[0].id)
    } catch (err) { console.error(err) }
  }

  const fetchConversations = async (pid) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/conversations?project_id=${pid}`)
      setConversations(await res.json())
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const fetchPhases = async (pid) => {
    try {
      const res = await fetch(`${API_BASE}/phases?project_id=${pid}`)
      setPhases(await res.json())
    } catch (err) { console.error(err) }
  }

  const fetchRoles = async (pid) => {
    try {
      const res = await fetch(`${API_BASE}/roles?project_id=${pid}`)
      setRoles(await res.json())
    } catch (err) { console.error(err) }
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
    } catch (err) { console.error(err) }
  }

  const handleAddConversation = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    try {
      const res = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: selectedProjectId, title: newTitle, role_tag: newRole, content: newContent })
      })
      const newConv = await res.json()
      setConversations([newConv, ...conversations])
      setNewTitle(''); setNewContent(''); setShowAddConv(false)
    } catch (err) { console.error(err) }
  }

  const handleDeleteProject = async (id, e) => {
    e.stopPropagation()
    if (!confirm('确定删除该项目及所有对话吗？')) return
    try {
      await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' })
      setProjects(projects.filter(p => p.id !== id))
      if (selectedProjectId === id) setSelectedProjectId(null)
    } catch (err) { console.error(err) }
  }

  const handleDeleteConversation = async (id) => {
    if (!confirm('确定删除此对话吗？')) return
    try {
      await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' })
      setConversations(conversations.filter(c => c.id !== id))
      if (selectedConversation?.id === id) setSelectedConversation(null)
    } catch (err) { console.error(err) }
  }

  const handleConversationUpdate = (updated) => {
    setConversations(conversations.map(c => c.id === updated.id ? updated : c))
    setSelectedConversation(updated)
  }

  const handleRefresh = () => {
    if (selectedProjectId) {
      fetchConversations(selectedProjectId)
      fetchProjects() // refresh stats
    }
  }

  const activeProject = projects.find(p => p.id === selectedProjectId)

  // 过滤逻辑
  const filteredConversations = conversations.filter(conv => {
    const matchSearch = !searchQuery ||
      conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.content || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchTag = selectedTag === 'All' || conv.role_tag === selectedTag
    const matchPhase = !selectedPhase || conv.phase_id === selectedPhase
    const matchRole = !selectedRoleFilter || conv.role_id === selectedRoleFilter
    return matchSearch && matchTag && matchPhase && matchRole
  })

  const allTags = ['All', ...new Set(conversations.map(c => c.role_tag).filter(Boolean))]

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
        currentView={currentView}
        setCurrentView={setCurrentView}
        roles={roles}
        onManageRoles={() => setShowRoleManager(true)}
        selectedRoleFilter={selectedRoleFilter}
        setSelectedRoleFilter={setSelectedRoleFilter}
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
          {currentView === 'dashboard' ? (
            <Dashboard projectId={selectedProjectId} projectName={activeProject?.name} />
          ) : (
            <ConversationList
              activeProject={activeProject}
              filteredConversations={filteredConversations}
              allTags={allTags}
              selectedTag={selectedTag}
              setSelectedTag={setSelectedTag}
              handleDeleteConversation={handleDeleteConversation}
              conversationsLength={conversations.length}
              onConversationClick={setSelectedConversation}
              phases={phases}
              selectedPhase={selectedPhase}
              setSelectedPhase={setSelectedPhase}
            />
          )}
        </main>
      </div>

      {/* 对话详情面板 */}
      {selectedConversation && (
        <ConversationDetail
          conversation={selectedConversation}
          phases={phases}
          roles={roles}
          onUpdate={handleConversationUpdate}
          onClose={() => setSelectedConversation(null)}
        />
      )}

      <AddConversationModal
        showAddConv={showAddConv} setShowAddConv={setShowAddConv}
        newTitle={newTitle} setNewTitle={setNewTitle}
        newRole={newRole} setNewRole={setNewRole}
        newContent={newContent} setNewContent={setNewContent}
        handleAddConversation={handleAddConversation}
      />

      <ImportModal
        show={showImport}
        onClose={() => setShowImport(false)}
        projectId={selectedProjectId}
        onImportComplete={handleRefresh}
      />

      <ChatPanel
        show={showChat}
        onClose={() => setShowChat(false)}
        projectId={selectedProjectId}
        onNewChat={handleRefresh}
      />

      <RoleManager
        show={showRoleManager}
        onClose={() => setShowRoleManager(false)}
        projectId={selectedProjectId}
        roles={roles}
        onRolesChange={() => fetchRoles(selectedProjectId)}
      />
    </div>
  )
}

export default App
