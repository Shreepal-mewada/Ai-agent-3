import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SplashScreen({ onSandboxCreated }) {
  const [loading, setLoading] = useState(false)
  const [loadingProjectId, setLoadingProjectId] = useState(null)
  const [error, setError] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [loadingStep, setLoadingStep] = useState('') // 'project' | 'sandbox'
  const [loadingStage, setLoadingStage] = useState(0) // 0 to 3 for orchestration states

  // Auth and Projects state
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal and custom email states
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [email, setEmail] = useState('')
  const [emailNotice, setEmailNotice] = useState('')

  const textareaRef = useRef(null)
  const [placeholder, setPlaceholder] = useState('')

  // Placeholder typing effect animation
  useEffect(() => {
    const placeholders = [
      "Describe the workflow you want to automate...",
      "Build a personal CRM system...",
      "Analyze these quarterly reports...",
      "Generate a high-end UI layout...",
      "Create an automated invoice flow..."
    ]
    let pIndex = 0
    let charIndex = 0
    let isDeleting = false
    let timer

    const typeEffect = () => {
      const current = placeholders[pIndex]
      if (isDeleting) {
        setPlaceholder(current.substring(0, charIndex))
        charIndex--
        if (charIndex < 0) {
          isDeleting = false
          pIndex = (pIndex + 1) % placeholders.length
          timer = setTimeout(typeEffect, 500)
        } else {
          timer = setTimeout(typeEffect, 50)
        }
      } else {
        setPlaceholder(current.substring(0, charIndex))
        charIndex++
        if (charIndex > current.length) {
          isDeleting = true
          timer = setTimeout(typeEffect, 2000)
        } else {
          timer = setTimeout(typeEffect, 100)
        }
      }
    }

    typeEffect()
    return () => clearTimeout(timer)
  }, [])

  // Check auth and fetch projects
  useEffect(() => {
    const checkAuthAndFetchProjects = async () => {
      try {
        const res = await fetch('/api/sandbox/project', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setProjects(data.projects || [])
          setIsAuthenticated(true)

          // Check for pending prompt to auto-provision!
          const pending = sessionStorage.getItem('pending_prompt')
          if (pending) {
            autoSubmitPrompt(pending)
          }
        } else if (res.status === 401) {
          setIsAuthenticated(false)
        }
      } catch {
        setIsAuthenticated(false)
      } finally {
        setProjectsLoading(false)
      }
    }
    checkAuthAndFetchProjects()
  }, [])

  const autoSubmitPrompt = async (pendingText) => {
    setPrompt(pendingText)
    setLoading(true)
    setError(null)
    setLoadingStage(0)
    try {
      setLoadingStep('project')
      const projectTitle = pendingText.length > 25
        ? pendingText.slice(0, 25) + '...'
        : pendingText

      const projectRes = await fetch('/api/sandbox/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: projectTitle })
      })
      if (!projectRes.ok) throw new Error(`Failed to create project (${projectRes.status})`)
      const projectData = await projectRes.json()
      const projectId = projectData.project._id

      // Step 2: Start sandbox
      setLoadingStep('sandbox')
      const sandboxRes = await fetch('/api/sandbox/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId })
      })
      if (!sandboxRes.ok) throw new Error(`Failed to start sandbox (${sandboxRes.status})`)
      const sandboxData = await sandboxRes.json()

      setLoadingStage(3)
      setTimeout(() => {
        onSandboxCreated(sandboxData)
      }, 500)
    } catch (err) {
      setError(err.message || 'Failed to auto-create workspace')
      setLoading(false)
      setLoadingStep('')
      sessionStorage.removeItem('pending_prompt') // Clear it
    }
  }

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
    }
  }, [prompt])

  // Orchestrate loading stages
  useEffect(() => {
    if (!loading && !loadingProjectId) {
      setLoadingStage(0)
      return
    }

    const interval = setInterval(() => {
      setLoadingStage(prev => {
        if (prev < 3) return prev + 1
        return prev
      })
    }, 1500)

    return () => clearInterval(interval)
  }, [loading, loadingProjectId])

  // Start sandbox for an existing project
  const handleOpenProject = async (projectId) => {
    setLoadingProjectId(projectId)
    setError(null)
    setLoadingStage(0)
    try {
      const sandboxRes = await fetch('/api/sandbox/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId })
      })
      if (!sandboxRes.ok) throw new Error(`Failed to start sandbox (${sandboxRes.status})`)
      const sandboxData = await sandboxRes.json()

      setLoadingStage(3)
      setTimeout(() => {
        onSandboxCreated(sandboxData)
      }, 500)
    } catch (err) {
      setError(err.message || 'Failed to start sandbox')
      setLoadingProjectId(null)
    }
  }

  // Create new project
  const handleCreateProject = async (e) => {
    if (e) e.preventDefault()
    const finalPrompt = prompt.trim()
    if (!finalPrompt) {
      setError('Please enter a description or project name')
      return
    }

    if (!isAuthenticated) {
      sessionStorage.setItem('pending_prompt', finalPrompt)
      setShowAuthModal(true)
      return
    }

    setLoading(true)
    setError(null)
    setLoadingStage(0)
    try {
      setLoadingStep('project')
      const projectTitle = finalPrompt.length > 25
        ? finalPrompt.slice(0, 25) + '...'
        : finalPrompt

      const projectRes = await fetch('/api/sandbox/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: projectTitle })
      })
      if (!projectRes.ok) throw new Error(`Failed to create project (${projectRes.status})`)
      const projectData = await projectRes.json()
      const projectId = projectData.project._id

      sessionStorage.setItem('pending_prompt', finalPrompt)

      setLoadingStep('sandbox')
      const sandboxRes = await fetch('/api/sandbox/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId })
      })
      if (!sandboxRes.ok) throw new Error(`Failed to start sandbox (${sandboxRes.status})`)
      const sandboxData = await sandboxRes.json()

      setLoadingStage(3)
      setTimeout(() => {
        onSandboxCreated(sandboxData)
      }, 500)
    } catch (err) {
      setError(err.message || 'Failed to create workspace')
      setLoading(false)
      setLoadingStep('')
    }
  }

  const isAnyLoading = loading || loadingProjectId !== null

  const loadingStages = [
    { title: 'Initializing workspace...', desc: 'Setting up database registries and API keys' },
    { title: 'Starting sandbox...', desc: 'Provisioning isolated secure container runtime' },
    { title: 'Connecting AI agent...', desc: 'Hooking up intelligent orchestration models' },
    { title: 'Generating files...', desc: 'Writing workspace boilerplate structures' }
  ]

  const filteredProjects = projects.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCreateProject()
    }
  }

  // Smooth scroll reveal observer inside React
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('entrance-anim-active')
        }
      })
    }, observerOptions)

    const elements = document.querySelectorAll('.entrance-anim')
    elements.forEach(el => observer.observe(el))

    return () => {
      elements.forEach(el => observer.unobserve(el))
    }
  }, [projects, isAuthenticated])

  return (
    <div className="relative flex flex-col h-full w-full overflow-y-auto bg-background text-primary antialiased font-body-md selection:bg-primary-container selection:text-on-primary-container">
      
      {/* Noise Overlay */}
      <div className="noise-overlay"></div>

      {/* Background Blobs */}
      <div className="blob w-[500px] h-[500px] bg-secondary-container rounded-full -top-40 -left-40"></div>
      <div className="blob w-[600px] h-[600px] bg-tertiary-fixed-dim rounded-full top-1/2 -right-40"></div>

      {/* TopAppBar Navigation */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md border-b border-outline/5 h-20 flex items-center">
        <nav className="max-w-[1200px] mx-auto w-full px-gutter flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary font-bold text-headline-lg animate-none" data-icon="auto_awesome">auto_awesome</span>
            <span className="font-headline-lg text-headline-lg font-bold text-primary">Aura AI</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a className="text-on-surface-variant font-medium hover:text-primary transition-all duration-300" href="#">Models</a>
            <a className="text-on-surface-variant font-medium hover:text-primary transition-all duration-300" href="#">Enterprise</a>
            <a className="text-on-surface-variant font-medium hover:text-primary transition-all duration-300" href="#">Pricing</a>
          </div>

          <div>
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-on-surface-variant">Authenticated</span>
                <div className="w-8 h-8 rounded-full bg-surface-container-lowest border border-primary/25 flex items-center justify-center text-xs font-semibold text-primary">
                  FD
                </div>
              </div>
            ) : (
              <button 
                className="px-6 py-2.5 bg-primary-container text-surface border-none rounded-full font-label-md text-label-md hover:scale-[0.98] transition-all duration-200 active:scale-95 cursor-pointer shadow-sm"
                onClick={() => setShowAuthModal(true)}
              >
                Sign In
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* Main Container */}
      <main className="pt-32 pb-20 overflow-hidden flex-1">
        
        {/* Hero Section */}
        <section className="max-w-[1200px] mx-auto px-gutter text-center flex flex-col items-center">
          <div className="entrance-anim">
            <span className="inline-block py-1 px-3 mb-6 rounded-full bg-secondary-fixed text-on-secondary-fixed text-label-sm font-label-sm uppercase tracking-wider">
              Powered by Aura 4.0
            </span>
            <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary max-w-4xl mx-auto mb-6 leading-tight">
              Build something intelligent
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-12 leading-relaxed">
              Create AI-powered workflows and applications with natural conversation. Intuitive, fast, and designed for human-centric focus.
            </p>
          </div>

          {/* AI Prompt Box */}
          <div className="entrance-anim delay-1 w-full max-w-3xl relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-secondary-container to-tertiary-container rounded-[1.2rem] blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative glass-card p-4 rounded-xl shadow-sm">
              <form className="flex flex-col gap-4" id="ai-prompt-form" onSubmit={handleCreateProject}>
                <textarea 
                  ref={textareaRef}
                  value={prompt}
                  onChange={e => { setPrompt(e.target.value); setError(null) }}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent border-none focus:ring-0 text-body-lg placeholder:text-outline resize-none transition-all duration-300 outline-none" 
                  placeholder={placeholder}
                  required 
                  rows="3"
                  style={{ caretColor: 'var(--color-primary)' }}
                />
                <div className="flex items-center justify-between pt-2 border-t border-outline/10">
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-surface-variant/50 rounded-lg text-on-surface-variant transition-colors cursor-pointer" type="button" title="Attach Template">
                      <span className="material-symbols-outlined" data-icon="attachment">attachment</span>
                    </button>
                    <button className="p-2 hover:bg-surface-variant/50 rounded-lg text-on-surface-variant transition-colors cursor-pointer" type="button" title="Attach Media">
                      <span className="material-symbols-outlined" data-icon="image">image</span>
                    </button>
                    <button className="p-2 hover:bg-surface-variant/50 rounded-lg text-on-surface-variant transition-colors cursor-pointer" type="button" title="Voice Input">
                      <span className="material-symbols-outlined" data-icon="mic">mic</span>
                    </button>
                  </div>
                  <button 
                    className="flex items-center gap-2 px-6 py-2 bg-primary text-surface rounded-lg font-label-md transition-all hover:shadow-lg hover:shadow-primary/10 disabled:opacity-30 disabled:pointer-events-none cursor-pointer" 
                    type="submit"
                    disabled={!prompt.trim() || isAnyLoading}
                  >
                    <span>Generate</span>
                    <span className="material-symbols-outlined text-sm" data-icon="arrow_forward">arrow_forward</span>
                  </button>
                </div>
              </form>
            </div>

            {error && (
              <p className="mt-3 text-xs text-error text-center font-semibold">⚠ {error}</p>
            )}

            {/* Suggested preset prompts */}
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <span className="text-label-sm font-label-sm text-outline uppercase">Try:</span>
              {[
                "Build a client onboarding flow",
                "Analyze my sales PDF",
                "Create a Jira integration"
              ].map((sug, idx) => (
                <button 
                  key={idx}
                  type="button"
                  onClick={() => { setPrompt(sug); setError(null) }}
                  className="text-label-sm font-label-sm text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                >
                  "{sug}"
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Bento Grid Showcase */}
        <section className="max-w-[1200px] mx-auto px-gutter mt-32">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
            {/* Large Card */}
            <div className="md:col-span-8 glass-card rounded-xl overflow-hidden p-base entrance-anim delay-2">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-surface-container">
                <img 
                  alt="AI Visualization" 
                  className="w-full h-full object-cover mix-blend-multiply opacity-80" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDcJvt0WRkEORFKhx1QzjGo6X2ylGikNhx4xRXDtkPCjQ-rF-m6iLdLw0mcbkhQEm8pPVyBuIR7Fkc4zM3HKhSydDvP3pTJoyExX-qFpx1uC7ohSrHm0uiXP5FP1-i_JfdicvKzn-JHO1TGRHhkbaFjYX4CbYuApvkgWKnGVNzHVQhJRR8HsjLcib5zvgez8xf57eJu6h59Pvd3vOoTE4ZmNxMlMDrQ-5fRWoe2TVYy24YeqUu_o0zt8QOdDkeLyD_LjMKoUQQlsWw"
                />
                <div className="absolute inset-0 flex flex-col justify-end p-8 bg-gradient-to-t from-surface-container-high/80 to-transparent">
                  <h3 className="font-headline-lg text-headline-lg text-primary mb-2">Infinite Scalability</h3>
                  <p className="font-body-md text-on-surface-variant max-w-lg">Our neural engine adapts to your team's unique language and technical stack effortlessly.</p>
                </div>
              </div>
            </div>

            {/* Small Detail Cards */}
            <div className="md:col-span-4 flex flex-col gap-gutter">
              <div className="glass-card rounded-xl p-8 flex flex-col items-center text-center entrance-anim delay-3 h-full justify-center">
                <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center mb-6 text-surface">
                  <span className="material-symbols-outlined text-4xl" data-icon="security">security</span>
                </div>
                <h4 className="font-headline-lg text-headline-lg text-primary mb-2">Privacy First</h4>
                <p className="font-body-md text-on-surface-variant">Your data is never used for training. Period.</p>
              </div>
              <div className="glass-card rounded-xl p-8 flex flex-col items-center text-center entrance-anim delay-3 h-full justify-center">
                <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center mb-6 text-on-secondary-container">
                  <span className="material-symbols-outlined text-4xl" data-icon="bolt">bolt</span>
                </div>
                <h4 className="font-headline-lg text-headline-lg text-primary mb-2">Low Latency</h4>
                <p className="font-body-md text-on-surface-variant">Real-time collaboration across continents.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Existing Projects Dashboard */}
        {isAuthenticated && (
          <section className="max-w-[1200px] mx-auto px-gutter mt-24">
            <div className="w-full border-t border-outline/20 pt-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-headline-lg text-headline-lg text-primary tracking-tight">Recent Projects</h3>
                  <p className="font-body-md text-on-surface-variant">Reopen your secure automated developer sandboxes</p>
                </div>

                {/* Search projects */}
                {projects.length > 0 && (
                  <div className="relative flex items-center bg-surface-container-lowest/60 border border-outline/20 rounded-xl px-3 py-1.5 max-w-[240px] w-full shadow-sm focus-within:border-primary/60 transition-all">
                    <span className="material-symbols-outlined text-on-surface-variant/40 mr-2 text-sm animate-none" data-icon="search">search</span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Search projects..."
                      className="bg-transparent text-xs text-primary outline-none w-full placeholder-on-surface-variant/40"
                    />
                  </div>
                )}
              </div>

              {projectsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  <span className="text-xs text-on-surface-variant">Loading projects...</span>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12 rounded-2xl bg-surface-container-lowest/60 border border-dashed border-outline/25">
                  <span className="material-symbols-outlined text-on-surface-variant/35 mx-auto mb-2 text-3xl animate-none" data-icon="folder">folder</span>
                  <p className="text-xs font-semibold text-primary">No active sandboxes</p>
                  <p className="text-[10px] text-on-surface-variant mt-1">Submit a description above to instantiate your first environment.</p>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-12 text-xs text-on-surface-variant">
                  No matching projects found
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredProjects.map(project => (
                    <button
                      key={project._id}
                      onClick={() => handleOpenProject(project._id)}
                      disabled={isAnyLoading}
                      className="flex items-center justify-between p-4 rounded-xl text-left bg-surface-container-lowest/60 border border-outline/15 hover:border-primary/55 hover:shadow-md transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors shrink-0">
                          <span className="material-symbols-outlined text-primary text-xl animate-none" data-icon="folder">folder</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-primary truncate">{project.title}</h4>
                          <span className="text-[10px] text-on-surface-variant">Created {new Date(project.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-transparent group-hover:bg-primary/10 transition-all">
                        {loadingProjectId === project._id ? (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                        ) : (
                          <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-sm animate-none" data-icon="chevron_right">chevron_right</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-background border-t border-outline/5 py-12">
        <div className="max-w-[1200px] mx-auto px-gutter flex flex-col md:flex-row justify-between items-center gap-base">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <span className="material-symbols-outlined text-primary font-bold text-label-md animate-none" data-icon="auto_awesome">auto_awesome</span>
            <span className="font-label-md text-label-md font-bold text-primary">Aura AI</span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant text-center md:text-left">
            © 2026 Aura AI. Built for the future of focus.
          </p>
          <div className="flex gap-6">
            <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Documentation</a>
            <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Privacy Policy</a>
            <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Terms</a>
          </div>
        </div>
      </footer>

      {/* Staged Load Overlay Dialog */}
      <AnimatePresence>
        {isAnyLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-[6px] flex items-center justify-center px-6 font-sans font-medium"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-surface border border-outline/35 rounded-2xl p-8 max-w-[400px] w-full text-center shadow-[0_12px_48px_rgba(84,26,26,0.08)]"
            >
              {/* Spinner */}
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-[3px] border-primary/20" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-[3px] border-t-secondary border-r-transparent border-b-transparent border-l-transparent"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary animate-pulse text-xl" data-icon="auto_awesome">auto_awesome</span>
                </div>
              </div>

              {/* Step info */}
              <h3 className="text-base font-bold text-primary mb-1">
                {loadingStages[loadingStage].title}
              </h3>
              <p className="text-xs text-on-surface-variant mb-6 min-h-[32px] px-2 leading-relaxed font-normal">
                {loadingStages[loadingStage].desc}
              </p>

              {/* Progress checklist */}
              <div className="flex flex-col gap-2.5 text-left border-t border-outline/25 pt-5 max-w-[280px] mx-auto font-normal">
                {loadingStages.map((stage, idx) => {
                  const isActive = idx === loadingStage
                  const isDone = idx < loadingStage
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${isDone
                        ? 'bg-primary border-primary'
                        : isActive
                          ? 'border-primary bg-transparent'
                          : 'border-outline/35 bg-transparent'
                        }`}>
                        {isDone && (
                          <svg className="w-2.5 h-2.5 text-surface" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {isActive && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                        )}
                      </div>
                      <span className={`text-xs transition-colors ${isDone
                        ? 'text-primary/50 line-through decoration-primary/35'
                        : isActive
                          ? 'text-primary font-bold'
                          : 'text-on-surface-variant/40'
                        }`}>
                        {stage.title}
                      </span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal (Continue with Google / Email flow) */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-primary/20 backdrop-blur-md cursor-default"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative bg-surface border border-outline/25 w-full max-w-md p-8 rounded-2xl shadow-2xl z-10 text-center"
            >
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-surface-variant/50 rounded-full transition-colors cursor-pointer text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-sm" data-icon="close">close</span>
              </button>

              <div className="mb-6">
                <div className="w-12 h-12 bg-primary-container text-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-outline/10">
                  <span className="material-symbols-outlined text-xl" data-icon="auto_awesome">auto_awesome</span>
                </div>
                <h2 className="text-xl font-bold text-primary font-sans">Welcome to Aura AI</h2>
                <p className="text-xs text-on-surface-variant mt-2 font-semibold">Sign in to continue building</p>
              </div>

              {/* Google Button */}
              <a
                href="/api/auth/google"
                className="w-full flex items-center justify-center gap-3 px-6 py-3 border border-outline/30 rounded-lg bg-surface hover:bg-surface-variant transition-all font-bold text-sm text-primary cursor-pointer"
              >
                <img alt="Google" className="w-5 h-5 shrink-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6ZZ7vI0Azmv-r0O54vBUKIDNhJOF46WjoNIG41VogK5GxOBbEBbpa6g7Ox3ndW2Ux0RmTmqEU15ki2Q3xjsQMVjKMH5qd7oGWlxUZuMd3u-fcR9bz41bJv_CTRWnwS1rwTkvgoqrdrCQ40IkjHfy333cVsyftgTeXd2d0BME6RC5ZL_WC-AWLdyr_2fLmr83-V_7xVD4__G2T1vVFFRR-PhFu3kfDoevYOJpwpHMm1IFyDyT5aP0DrosExXxQMk5Q_IB7yyEJApg"/>
                Continue with Google
              </a>

              <div className="flex items-center gap-4 my-5">
                <div className="h-px flex-1 bg-outline/25"></div>
                <span className="text-[10px] font-bold text-outline tracking-wider uppercase font-sans">OR</span>
                <div className="h-px flex-1 bg-outline/25"></div>
              </div>

              <div className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailNotice('') }}
                  placeholder="Email address"
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline/35 rounded-lg text-sm text-primary placeholder-outline/40 focus:ring-2 focus:ring-primary/15 outline-none transition-all"
                />
                {emailNotice && (
                  <p className="text-[10px] font-bold text-error text-left px-1">⚠ {emailNotice}</p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!email) {
                      setEmailNotice('Please enter an email address.');
                      return;
                    }
                    setEmailNotice('Email login is disabled. Please sign in with Google above.');
                  }}
                  className="w-full py-2.5 bg-primary text-surface rounded-lg font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Continue with Email
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
