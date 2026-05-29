import { useState, useEffect } from 'react'
import { Navigation } from './landing/Navigation'
import { HeroSection } from './landing/HeroSection'
import { Button } from './ui/button'
import { Plus, Terminal, RefreshCw, Layers, User, ArrowRight, Play, Loader2, LogIn } from 'lucide-react'

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

  // Open an existing project sandbox
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
      if (!sandboxRes.ok) throw new Error(`Failed to start sandbox (${sandboxRes.status})`)
      const sandboxData = await sandboxRes.json()
      onSandboxCreated(sandboxData)
    } catch (err) {
      setError(err.message || 'Failed to start sandbox')
      setLoadingProjectId(null)
    }
  }

  // Create new project then start sandbox
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

      // Step 2: Start the sandbox
      setLoadingStep('sandbox')
      const sandboxRes = await fetch('/api/sandbox/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId })
      })
      if (!sandboxRes.ok) throw new Error(`Failed to start sandbox (${sandboxRes.status})`)
      const sandboxData = await sandboxRes.json()
      onSandboxCreated(sandboxData)
    } catch (err) {
      setError(err.message || 'Failed to create sandbox')
      setLoading(false)
      setLoadingStep('')
    }
  }

  const isAnyLoading = loading || loadingProjectId !== null

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden noise-overlay flex flex-col justify-between">
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
              <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-4">
                <span className="w-8 h-px bg-foreground/30" />
                Developer Workspace
              </span>
              <h2 className="text-4xl lg:text-5xl font-display tracking-tight text-foreground">
                Welcome back, {user.name}
              </h2>
              <p className="text-md text-muted-foreground mt-2">
                Resume an active sandbox or launch a new environment instantly.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 items-start">
              {/* Left Column: Create Project Form */}
              <div className="lg:col-span-1 border border-foreground p-6 bg-card">
                <h3 className="text-lg font-display mb-6 pb-4 border-b border-foreground/10 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create Sandbox
                </h3>

                {isAnyLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 bg-foreground/[0.01]">
                    <Loader2 className="w-8 h-8 animate-spin text-foreground mb-4" />
                    <span className="text-sm font-mono font-medium text-foreground">
                      {loadingProjectId
                        ? `Starting sandbox${dots}`
                        : loadingStep === 'project'
                          ? `Creating project${dots}`
                          : `Starting sandbox${dots}`}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-mono uppercase text-muted-foreground mb-2">
                        Project Name
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={e => { setTitle(e.target.value); setError(null) }}
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        placeholder="e.g. counter-app"
                        className="w-full bg-background border border-foreground/20 px-4 py-3 text-sm focus:border-foreground outline-none transition-colors"
                      />
                    </div>

                    <Button
                      onClick={handleCreate}
                      disabled={isAnyLoading}
                      className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 rounded-full cursor-pointer flex items-center justify-center font-medium gap-2"
                    >
                      Launch Sandbox
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {error && (
                  <div className="mt-6 p-4 border border-destructive/20 bg-destructive/5 text-destructive text-xs font-mono">
                    ⚠️ {error}
                  </div>
                )}
              </div>

              {/* Right Column: Recent Projects */}
              <div className="lg:col-span-2 border border-foreground/10 p-6 bg-card">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-foreground/10">
                  <h3 className="text-lg font-display flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    My Active Sandboxes
                  </h3>
                  <button
                    onClick={fetchProjects}
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
                  <div className="text-center py-16 bg-foreground/[0.01] border border-dashed border-foreground/10">
                    <span className="block text-sm text-muted-foreground mb-2">No active projects found</span>
                    <span className="text-xs text-muted-foreground">Type a name on the left to spawn your first sandbox.</span>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {projects.map((project) => (
                      <div
                        key={project._id}
                        onClick={() => !isAnyLoading && handleOpenProject(project._id)}
                        className={`group border border-foreground/10 p-5 flex flex-col justify-between hover:border-foreground transition-all duration-300 cursor-pointer bg-background relative overflow-hidden ${loadingProjectId === project._id ? 'border-foreground bg-foreground/[0.01]' : ''
                          }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-mono text-xs text-muted-foreground">
                              {project._id.slice(-6).toUpperCase()}
                            </span>
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                          </div>
                          <h4 className="text-lg font-display text-foreground group-hover:translate-x-1 transition-transform duration-300">
                            {project.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Last updated {new Date(project.updatedAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-foreground/5 flex items-center justify-between">
                          <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                            <Terminal className="w-3.5 h-3.5" /> Node env
                          </span>
                          {loadingProjectId === project._id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-foreground" />
                          ) : (
                            <span className="text-xs font-medium text-foreground group-hover:underline flex items-center gap-1">
                              Resume <Play className="w-3 h-3 fill-foreground" />
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
