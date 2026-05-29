import { useState, useEffect } from 'react'
import { Navigation } from './landing/Navigation'
import { HeroSection } from './landing/HeroSection'
import { Button } from './ui/button'
import { Plus, Terminal, RefreshCw, Layers, User, ArrowRight, Play, Loader2, LogIn } from 'lucide-react'

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
    <div className="relative min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-100/20 via-background to-stone-100/30 overflow-x-hidden noise-overlay flex flex-col justify-between">
      <Navigation
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onStartCreating={() => { }}
      />

      <div className="flex-1 flex flex-col justify-center pt-20">
        {authLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
            <span className="text-sm font-mono text-muted-foreground">Checking authentication...</span>
          </div>
        ) : !user ? (
          /* Show Hero Section when not logged in */
          <HeroSection
            user={user}
            onLogin={handleLogin}
            onStartCreating={() => { }}
          />
        ) : (
          /* Show Developer Workspace Dashboard directly when logged in */
          <div className="max-w-[1400px] w-full mx-auto px-6 lg:px-12 py-12 animate-fadeIn">
            <div className="mb-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-600/10 text-amber-800 border border-amber-600/20 mb-4 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                Developer Workspace
              </span>
              <h2 className="text-4xl lg:text-5xl font-display tracking-tight text-foreground">
                Welcome back, <span className="bg-gradient-to-r from-amber-700 to-stone-700 bg-clip-text text-transparent font-semibold">{user.name}</span>
              </h2>
              <p className="text-md text-muted-foreground mt-2">
                Resume your recent work or create a new project instantly.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 items-start">
              {/* Left Column: Create Project Form */}
              <div className="lg:col-span-1 border border-foreground/10 rounded-2xl p-8 bg-card/70 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.01)] hover:shadow-[0_8px_30px_rgb(180,83,9,0.04)] transition-all duration-500">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-foreground/5">
                  <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-700 flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">Create a Project</h3>
                    <p className="text-xs text-muted-foreground">Start a fresh environment</p>
                  </div>
                </div>

                {isAnyLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 bg-foreground/[0.01] rounded-xl border border-foreground/5">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-4" />
                    <span className="text-sm font-mono font-medium text-foreground">
                      {loadingProjectId
                        ? `Starting project${dots}`
                        : loadingStep === 'project'
                          ? `Creating project${dots}`
                          : `Starting project${dots}`}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Project Name
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={e => { setTitle(e.target.value); setError(null) }}
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        placeholder="e.g. counter-app"
                        className="w-full bg-background/50 border border-foreground/10 rounded-xl px-4 py-3.5 text-sm focus:border-amber-600 focus:ring-4 focus:ring-amber-600/5 outline-none transition-all duration-300 placeholder:text-muted-foreground/40 shadow-inner"
                      />
                    </div>

                    <Button
                      onClick={handleCreate}
                      disabled={isAnyLoading}
                      className="w-full h-12 bg-gradient-to-r from-amber-700 to-stone-700 hover:from-amber-800 hover:to-stone-800 text-white rounded-xl cursor-pointer flex items-center justify-center font-medium gap-2 shadow-lg shadow-amber-700/15 hover:shadow-xl hover:shadow-amber-700/25 transition-all duration-300 hover:-translate-y-0.5"
                    >
                      Create Project
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {error && (
                  <div className="mt-6 p-4 border border-destructive/20 bg-destructive/5 text-destructive text-xs font-mono rounded-xl">
                    ⚠️ {error}
                  </div>
                )}
              </div>

              {/* Right Column: Recent Projects */}
              <div className="lg:col-span-2 border border-foreground/10 rounded-2xl p-8 bg-card/70 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.01)] hover:shadow-[0_8px_30px_rgb(180,83,9,0.04)] transition-all duration-500">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-foreground/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-600/10 text-stone-700 flex items-center justify-center">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-foreground">Your Projects</h3>
                      <p className="text-xs text-muted-foreground">Manage and resume active environments</p>
                    </div>
                  </div>
                  <button
                    onClick={fetchProjects}
                    className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-200 cursor-pointer"
                    title="Refresh List"
                  >
                    <RefreshCw className={`w-4 h-4 ${projectsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {projectsLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-16 bg-foreground/[0.01] border border-dashed border-foreground/10 rounded-xl">
                    <span className="block text-sm text-muted-foreground mb-2">No active projects found</span>
                    <span className="text-xs text-muted-foreground">Type a name on the left to create your first project.</span>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4 overflow-y-auto" style={{ maxHeight: '460px', paddingRight: '4px' }}>
                    {projects.map((project) => (
                      <div
                        key={project._id}
                        onClick={() => !isAnyLoading && handleOpenProject(project._id)}
                        className={`group border border-foreground/10 border-t-4 border-t-amber-700/40 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md hover:shadow-amber-700/5 hover:border-amber-600/30 hover:border-t-amber-600 hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-card relative overflow-hidden ${loadingProjectId === project._id ? 'border-amber-600 border-t-amber-600 bg-amber-600/[0.01] shadow-md shadow-amber-600/[0.02]' : ''
                          }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-mono text-[10px] text-muted-foreground bg-foreground/5 px-2 py-0.5 rounded">
                              {project._id.slice(-6).toUpperCase()}
                            </span>
                            <div className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </div>
                          </div>
                          <h4 className="text-lg font-sans font-semibold text-foreground group-hover:text-amber-700 transition-colors duration-300">
                            {project.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Last updated {getFormattedDate(project.updatedAt, project.createdAt)}
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-foreground/5 flex items-center justify-between">
                          <span className="text-xs font-mono text-muted-foreground flex items-center gap-1.5 bg-foreground/[0.02] px-2.5 py-1 rounded-md border border-foreground/5">
                            <Terminal className="w-3.5 h-3.5 text-muted-foreground/60" /> Node.js
                          </span>
                          {loadingProjectId === project._id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                          ) : (
                            <span className="text-xs font-semibold text-amber-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform duration-300">
                              Open Project <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative py-6 border-t border-foreground/5 bg-background text-center shrink-0">
        <p className="text-xs text-muted-foreground font-mono">
          &copy; 2026 Optimus. All systems operational.
        </p>
      </footer>
    </div>
  )
}
