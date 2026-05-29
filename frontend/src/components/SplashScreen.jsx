import { useState, useEffect, useRef } from 'react'
import { Navigation } from './landing/Navigation'
import { HeroSection } from './landing/HeroSection'
import { Button } from './ui/button'
import { Plus, Terminal, RefreshCw, Layers, User, ArrowRight, Play, Loader2, LogIn, Search, Sparkles, ExternalLink, Clock } from 'lucide-react'

const getFormattedDate = (updatedAt, createdAt) => {
  const d = updatedAt || createdAt;
  if (!d) return 'Recently';
  const date = new Date(d);
  if (isNaN(date.getTime())) return 'Recently';
  
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SplashScreen({ onSandboxCreated }) {
  // Auth state
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Sandbox creation / startup states
  const [loading, setLoading] = useState(false)
  const [loadingProjectId, setLoadingProjectId] = useState(null)
  const [error, setError] = useState(null)
  const [dots, setDots] = useState('')
  const [title, setTitle] = useState('')
  const [loadingStep, setLoadingStep] = useState('') // 'project' | 'sandbox'

  // Projects list state
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)

  // Derived: filtered projects
  const filteredProjects = projects.filter(p =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Fetch current user session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          if (data.isAuthenticated && data.user) {
            setUser(data.user)
            fetchProjects()
          }
        }
      } catch (err) {
        console.error('Session check failed:', err)
      } finally {
        setAuthLoading(false)
      }
    }
    checkAuth()
  }, [])

  // Apply 90% zoom to the document body when on the landing page (not logged in)
  useEffect(() => {
    if (!user && !authLoading) {
      document.body.style.zoom = "0.9";
    } else {
      document.body.style.zoom = "1";
    }
    return () => {
      document.body.style.zoom = "1";
    };
  }, [user, authLoading]);

  // Consume any pending prompt from the landing page when the user becomes authenticated
  useEffect(() => {
    if (user) {
      const pendingPrompt = localStorage.getItem("pending_prompt");
      if (pendingPrompt) {
        // Clean up prompt to use as a project title (e.g. capitalize and remove prefixes)
        let cleanTitle = pendingPrompt
          .replace(/^(build|create|design)\s+(a\s+)?/i, "")
          .replace(/\.+$/, "")
          .trim();
        if (cleanTitle) {
          setTitle(cleanTitle);
        }
        localStorage.removeItem("pending_prompt");
      }
    }
  }, [user]);

  // Fetch projects list
  const fetchProjects = async () => {
    setProjectsLoading(true)
    try {
      const res = await fetch('/api/sandbox/project', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || [])
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    } finally {
      setProjectsLoading(false)
    }
  }

  // Dots animation for loaders
  useEffect(() => {
    if (!loading && !loadingProjectId) return
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 400)
    return () => clearInterval(interval)
  }, [loading, loadingProjectId])

  const handleLogin = () => {
    window.location.href = '/api/auth/google'
  }

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      if (res.ok) {
        setUser(null)
        setProjects([])
      }
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  // Open an existing project
  const handleOpenProject = async (projectId) => {
    setLoadingProjectId(projectId)
    setError(null)
    try {
      const sandboxRes = await fetch('/api/sandbox/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId })
      })
      if (!sandboxRes.ok) throw new Error(`Failed to start project (${sandboxRes.status})`)
      const sandboxData = await sandboxRes.json()
      onSandboxCreated(sandboxData)
    } catch (err) {
      setError(err.message || 'Failed to start project')
      setLoadingProjectId(null)
    }
  }

  // Create new project then start environment
  const handleCreate = async () => {
    const projectTitle = title.trim()
    if (!projectTitle) {
      setError('Please enter a project name')
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Step 1: Create the project
      setLoadingStep('project')
      const projectRes = await fetch('/api/sandbox/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: projectTitle })
      })
      if (!projectRes.ok) throw new Error(`Failed to create project (${projectRes.status})`)
      const projectData = await projectRes.json()
      const projectId = projectData.project._id

      // Step 2: Start the project environment
      setLoadingStep('sandbox')
      const sandboxRes = await fetch('/api/sandbox/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId })
      })
      if (!sandboxRes.ok) throw new Error(`Failed to start project (${sandboxRes.status})`)
      const sandboxData = await sandboxRes.json()
      onSandboxCreated(sandboxData)
    } catch (err) {
      setError(err.message || 'Failed to create project')
      setLoading(false)
      setLoadingStep('')
    }
  }

  const isAnyLoading = loading || loadingProjectId !== null

  return (
    <>
      {/* ── Auth loading ── */}
      {authLoading && (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
          <span className="text-sm font-mono text-muted-foreground">Checking authentication...</span>
        </div>
      )}

      {/* ── Not logged in: Landing page ── */}
      {!authLoading && !user && (
        <div className="relative min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-100/20 via-background to-stone-100/30 overflow-x-hidden noise-overlay flex flex-col justify-between">
          <Navigation
            user={user}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onStartCreating={() => { }}
          />
          <div className="flex-1 flex flex-col justify-center pt-20">
            <HeroSection
              user={user}
              onLogin={handleLogin}
              onStartCreating={() => { }}
            />
          </div>
          <footer className="relative py-6 border-t border-foreground/5 bg-background text-center shrink-0">
            <p className="text-xs text-muted-foreground font-mono">
              &copy; 2026 Optimus. All systems operational.
            </p>
          </footer>
        </div>
      )}

      {/* ── Logged in: Lovable-style full-page dashboard ── */}
      {!authLoading && user && (
        <div className="min-h-screen bg-background overflow-y-auto animate-fadeIn">

          {/* Top header bar */}
          <div className="border-b border-foreground/10 bg-background/95 backdrop-blur-sm sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
              {/* Logo */}
              <a href="#" className="flex items-center gap-2 shrink-0">
                <span className="font-display text-xl tracking-tight">Optimus</span>
                <span className="text-muted-foreground font-mono text-[10px] mt-0.5">TM</span>
              </a>

              <div className="flex items-center gap-3">
                {/* User avatar */}
                <div className="flex items-center gap-2">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full border border-foreground/10" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-bold">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-medium text-foreground/60 hidden sm:block">{user.name}</span>
                </div>

                {/* New project button */}
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  disabled={isAnyLoading}
                  className="flex items-center gap-1.5 bg-foreground text-background hover:bg-foreground/90 active:scale-95 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  New project
                </button>

                {/* Sign out */}
                <button
                  onClick={handleLogout}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Sign out"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-10">

            {/* Prompt bar */}
            <div className="mb-10">
              <div className="relative flex items-center bg-card border border-foreground/12 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.1)] focus-within:border-foreground/25 transition-all duration-300 px-5 py-4 gap-4">
                <Sparkles className="w-5 h-5 text-muted-foreground/50 shrink-0" />
                <input
                  type="text"
                  value={title}
                  onChange={e => { setTitle(e.target.value); setError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="What do you want to build today?"
                  className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground/35 outline-none border-none font-sans"
                />
                <button
                  onClick={handleCreate}
                  disabled={isAnyLoading || !title.trim()}
                  className="flex items-center gap-2 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150 cursor-pointer shrink-0"
                >
                  {isAnyLoading && !loadingProjectId
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <ArrowRight className="w-4 h-4" />
                  }
                  {isAnyLoading && !loadingProjectId
                    ? (loadingStep === 'project' ? 'Creating…' : 'Starting…')
                    : 'Start building'}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-xs text-destructive font-mono px-1">⚠️ {error}</p>
              )}
            </div>

            {/* Section header + search */}
            <div className="flex items-center justify-between mb-5 gap-4">
              <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">Your projects</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search…"
                    className="pl-9 pr-4 py-2 text-xs bg-card border border-foreground/10 rounded-lg outline-none focus:border-foreground/25 transition-colors w-44 placeholder:text-muted-foreground/35"
                  />
                </div>
                <button
                  onClick={fetchProjects}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${projectsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Projects grid */}
            {projectsLoading ? (
              <div className="flex justify-center items-center py-28">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProjects.length === 0 && !searchQuery ? (
              <div className="flex flex-col items-center justify-center py-28 text-center">
                <div className="w-14 h-14 rounded-2xl bg-foreground/5 flex items-center justify-center mb-4">
                  <Layers className="w-6 h-6 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No projects yet</p>
                <p className="text-xs text-muted-foreground">Describe what you want to build above</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-28 text-center">
                <p className="text-sm text-muted-foreground">No projects match "<span className="text-foreground font-medium">{searchQuery}</span>"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProjects.map((project, index) => {
                  const gradients = [
                    'from-violet-200 via-purple-100 to-fuchsia-200',
                    'from-blue-200 via-cyan-100 to-teal-200',
                    'from-amber-200 via-orange-100 to-yellow-200',
                    'from-emerald-200 via-green-100 to-lime-200',
                    'from-pink-200 via-rose-100 to-red-200',
                    'from-sky-200 via-blue-100 to-indigo-200',
                  ]
                  const grad = gradients[index % gradients.length]
                  const isCardLoading = loadingProjectId === project._id
                  return (
                    <div
                      key={project._id}
                      onClick={() => !isAnyLoading && handleOpenProject(project._id)}
                      className={`group relative flex flex-col rounded-xl border bg-card overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] ${
                        isCardLoading
                          ? 'border-foreground/25 shadow-md'
                          : 'border-foreground/8 shadow-sm hover:border-foreground/15'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className={`relative h-40 bg-gradient-to-br ${grad} overflow-hidden`}>
                        <div className="absolute inset-0 opacity-[0.15]"
                          style={{
                            backgroundImage: 'radial-gradient(circle, #00000022 1px, transparent 1px)',
                            backgroundSize: '18px 18px',
                          }}
                        />
                        {/* Browser mockup */}
                        <div className="absolute top-5 left-5 right-5 bg-white/50 backdrop-blur-sm rounded-lg p-2.5 border border-white/60 shadow-sm">
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="w-2 h-2 rounded-full bg-red-400/80" />
                            <span className="w-2 h-2 rounded-full bg-amber-400/80" />
                            <span className="w-2 h-2 rounded-full bg-green-400/80" />
                          </div>
                          <div className="h-1.5 bg-white/60 rounded-full w-3/4 mb-1.5" />
                          <div className="h-1.5 bg-white/40 rounded-full w-1/2" />
                        </div>
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/8 transition-colors duration-200 flex items-center justify-center">
                          {isCardLoading ? (
                            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3.5 py-2 flex items-center gap-2 shadow">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-foreground/70" />
                              <span className="text-xs font-medium text-foreground/70">Starting{dots}</span>
                            </div>
                          ) : (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-white/90 backdrop-blur-sm rounded-lg px-3.5 py-2 flex items-center gap-2 shadow">
                              <ExternalLink className="w-3.5 h-3.5 text-foreground/70" />
                              <span className="text-xs font-medium text-foreground/70">Open</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card body */}
                      <div className="p-3.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{project.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 shrink-0" />
                            {getFormattedDate(project.updatedAt, project.createdAt)}
                          </p>
                        </div>
                        {isCardLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* New Project Modal */}
          {showNewProjectModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm"
              onClick={() => setShowNewProjectModal(false)}
            >
              <div
                className="bg-card border border-foreground/10 rounded-2xl p-8 w-full max-w-md shadow-2xl animate-fadeIn"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold mb-1">New project</h3>
                <p className="text-sm text-muted-foreground mb-6">Give your project a name to get started.</p>
                <input
                  type="text"
                  value={title}
                  autoFocus
                  onChange={e => { setTitle(e.target.value); setError(null) }}
                  onKeyDown={e => e.key === 'Enter' && !isAnyLoading && handleCreate()}
                  placeholder="e.g. my-saas-app"
                  className="w-full bg-background border border-foreground/10 rounded-xl px-4 py-3 text-sm focus:border-foreground/30 outline-none transition-all mb-4 placeholder:text-muted-foreground/35"
                />
                {error && <p className="text-xs text-destructive font-mono mb-3">⚠️ {error}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowNewProjectModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-foreground/10 text-sm font-medium hover:bg-foreground/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={isAnyLoading || !title.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isAnyLoading && !loadingProjectId && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isAnyLoading && !loadingProjectId
                      ? (loadingStep === 'project' ? 'Creating…' : 'Starting…')
                      : 'Create project'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
