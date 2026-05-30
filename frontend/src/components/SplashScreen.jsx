import { useState, useEffect, useRef } from "react";
import { Navigation } from "./landing/Navigation";
import { HeroSection } from "./landing/HeroSection";
import { Button } from "./ui/button";
import {
  Plus,
  Terminal,
  RefreshCw,
  Layers,
  User,
  ArrowRight,
  Play,
  Loader2,
  LogIn,
  Search,
  Sparkles,
  ExternalLink,
  Clock,
  Download,
  Home,
  Compass,
  Plug,
  Star,
  Users,
  Settings,
  HelpCircle,
  Mic,
  ArrowUp,
  Menu,
  X,
  Gift,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Folder,
} from "lucide-react";

const getFormattedDate = (updatedAt, createdAt) => {
  const d = updatedAt || createdAt;
  if (!d) return "Recently";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function SplashScreen({ onSandboxCreated }) {
  // Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Sandbox creation / startup states
  const [loading, setLoading] = useState(false);
  const [loadingProjectId, setLoadingProjectId] = useState(null);
  const [error, setError] = useState(null);
  const [dots, setDots] = useState("");
  const [title, setTitle] = useState("");
  const [loadingStep, setLoadingStep] = useState(""); // 'project' | 'sandbox'

  // Projects list state
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  // Sidebar / UI states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const promptRef = useRef(null);

  const showToast = (message) => {
    setToast(message);
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleHomeClick = () => {
    setSearchQuery("");
    setTitle("");
    setIsMobileMenuOpen(false);
    if (promptRef.current) {
      promptRef.current.focus();
      promptRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleSearchClick = () => {
    setIsMobileMenuOpen(false);
    const searchInput = document.getElementById("project-search-input");
    if (searchInput) {
      searchInput.focus();
      searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleAllProjectsClick = () => {
    setSearchQuery("");
    setIsMobileMenuOpen(false);
    const projectsSection = document.getElementById("projects-section");
    if (projectsSection) {
      projectsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Auto-resize prompt textarea
  useEffect(() => {
    const textarea = promptRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [title]);

  // Derived: filtered projects
  const filteredProjects = projects.filter((p) =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Fetch current user session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.isAuthenticated && data.user) {
            setUser(data.user);
            fetchProjects();
          }
        }
      } catch (err) {
        console.error("Session check failed:", err);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

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
    setProjectsLoading(true);
    try {
      const res = await fetch("/api/sandbox/project", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setProjectsLoading(false);
    }
  };

  // Dots animation for loaders
  useEffect(() => {
    if (!loading && !loadingProjectId) return;
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(interval);
  }, [loading, loadingProjectId]);

  const handleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setUser(null);
        setProjects([]);
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Open an existing project
  const handleOpenProject = async (projectId) => {
    setLoadingProjectId(projectId);
    setError(null);
    try {
      const sandboxRes = await fetch("/api/sandbox/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId }),
      });
      if (!sandboxRes.ok)
        throw new Error(`Failed to start project (${sandboxRes.status})`);
      const sandboxData = await sandboxRes.json();
      onSandboxCreated(sandboxData);
    } catch (err) {
      setError(err.message || "Failed to start project");
      setLoadingProjectId(null);
    }
  };

  // Create new project then start environment
  const handleCreate = async () => {
    const projectTitle = title.trim();
    if (!projectTitle) {
      setError("Please enter a project name");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Step 1: Create the project
      setLoadingStep("project");
      const projectRes = await fetch("/api/sandbox/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: projectTitle }),
      });
      if (!projectRes.ok)
        throw new Error(`Failed to create project (${projectRes.status})`);
      const projectData = await projectRes.json();
      const projectId = projectData.project._id;

      // Step 2: Start the project environment
      setLoadingStep("sandbox");
      const sandboxRes = await fetch("/api/sandbox/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId }),
      });
      if (!sandboxRes.ok)
        throw new Error(`Failed to start project (${sandboxRes.status})`);
      const sandboxData = await sandboxRes.json();
      onSandboxCreated(sandboxData, projectTitle);
    } catch (err) {
      setError(err.message || "Failed to create project");
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleExportProject = async (projectId, projectTitle) => {
    showToast(`Preparing export for ${projectTitle}...`);
    try {
      const res = await fetch(`/api/sandbox/project/${projectId}/export`, {
        credentials: "include"
      });
      
      if (!res.ok) {
        let errMsg = "Export failed";
        try {
          const errData = await res.json();
          errMsg = errData.message || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectTitle.replace(/[^a-zA-Z0-9-_]/g, "_")}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast("Project exported successfully!");
    } catch (err) {
      console.error("Export error:", err);
      setError(err.message || "Failed to export project");
      showToast("Failed to export project.");
    }
  };

  const isAnyLoading = loading || loadingProjectId !== null;

  return (
    <>
      {/* ── Auth loading ── */}
      {authLoading && (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
          <span className="text-sm font-mono text-muted-foreground">
            Checking authentication...
          </span>
        </div>
      )}

      {/* ── Not logged in: Landing page ── */}
      {!authLoading && !user && (
        <div className="relative min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-100/20 via-background to-stone-100/30 overflow-x-hidden noise-overlay flex flex-col justify-between">
          <Navigation
            user={user}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onStartCreating={() => {}}
          />
          <div className="flex-1 flex flex-col justify-center pt-20">
            <HeroSection
              user={user}
              onLogin={handleLogin}
              onStartCreating={() => {}}
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
        <div className="flex min-h-screen bg-background text-foreground overflow-hidden">
          {/* 1. SideNavBar - Desktop & Collapsible Tablet */}
          <aside
            className={`hidden md:flex flex-col border-r border-border bg-card/60 backdrop-blur-md shadow-sm fixed left-0 top-0 h-screen overflow-y-auto z-40 transition-all duration-300 ${
              isSidebarCollapsed ? "w-20 p-4" : "w-72 p-6"
            }`}
          >
            {/* Header / Workspace Switcher (with collapse toggle) */}
            <div
              className={`relative flex items-center gap-3 mb-8 p-2 rounded-lg overflow-hidden justify-between`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-foreground/5 flex-shrink-0 flex items-center justify-center border border-border">
                  <Layers className="w-4 h-4 text-foreground/70" />
                </div>
                {!isSidebarCollapsed && (
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold tracking-tight text-sm text-foreground truncate">
                      Shree's Workspace
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      Personal Workspace
                    </span>
                  </div>
                )}
              </div>

              {/* Toggle Collapse Button - moved to header */}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground/60 hover:text-foreground flex items-center justify-center transition-all cursor-pointer ${isSidebarCollapsed ? "absolute top-3 left-1/2 -translate-x-1/2" : "ml-2"}`}
                title={
                  isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
                }
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Primary Nav */}
            <div className="flex flex-col gap-1 mb-auto">
              <button
                onClick={handleHomeClick}
                className={`nav-item ${!searchQuery ? "active" : ""} ${isSidebarCollapsed ? "justify-center" : ""}`}
                title="Home"
              >
                <Home className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && (
                  <span className="tracking-tight">Home</span>
                )}
              </button>

              <button
                onClick={handleSearchClick}
                className={`nav-item ${isSidebarCollapsed ? "justify-center" : "justify-start"}`}
                title="Search"
              >
                <Search className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span className="tracking-tight">Search</span>
                    <span className="text-[9px] bg-foreground/5 px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                      Ctrl K
                    </span>
                  </div>
                )}
              </button>

              <button
                onClick={handleAllProjectsClick}
                className={`nav-item ${searchQuery === "" ? "active" : ""} ${isSidebarCollapsed ? "justify-center" : ""}`}
                title="All projects"
              >
                <Folder className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && (
                  <span className="tracking-tight">All projects</span>
                )}
              </button>
            </div>

            <div className="mt-8 flex flex-col gap-2 border-t border-border pt-4">
              {/* Sign out */}
              <button
                onClick={handleLogout}
                className={`nav-item hover:text-red-400 ${isSidebarCollapsed ? "justify-center" : ""}`}
                title="Sign out"
              >
                <LogOut className="w-4 h-4 shrink-0 text-red-500/70" />
                {!isSidebarCollapsed && (
                  <span className="tracking-tight text-red-500/80">
                    Sign out
                  </span>
                )}
              </button>

              {/* footer toggle removed - moved to header */}
            </div>
          </aside>

          {/* 2. Mobile Drawer Navigation Menu */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <aside
                className="relative w-72 bg-card border-r border-border p-6 flex flex-col h-full overflow-y-auto z-50 animate-fadeIn"
                style={{ animationDuration: "200ms" }}
              >
                {/* Close Button */}
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg bg-foreground/5 border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Workspace Switcher in Drawer */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center border border-border">
                    <Layers className="w-4 h-4 text-foreground/70" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-sm truncate">
                      Shree's Workspace
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Personal Workspace
                    </span>
                  </div>
                </div>

                {/* Navigation Items */}
                <div className="flex flex-col gap-1 mb-auto">
                  <button
                    onClick={handleHomeClick}
                    className={`nav-item ${!searchQuery ? "active" : ""}`}
                  >
                    <Home className="w-4 h-4" />
                    <span>Home</span>
                  </button>
                  <button onClick={handleSearchClick} className="nav-item">
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </button>
                  <button
                    onClick={handleAllProjectsClick}
                    className={`nav-item ${searchQuery === "" ? "active" : ""}`}
                  >
                    <Folder className="w-4 h-4" />
                    <span>All projects</span>
                  </button>
                </div>

                {/* Footer Section */}
                <div className="mt-8 border-t border-border pt-4 flex flex-col gap-2">
                  <button
                    onClick={handleLogout}
                    className="nav-item text-red-500/80 hover:text-red-400"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </aside>
            </div>
          )}

          {/* 3. Main content canvas */}
          <main
            className={`flex-1 transition-all duration-300 relative min-h-screen mesh-gradient flex flex-col overflow-y-auto ${
              isSidebarCollapsed ? "md:ml-20" : "md:ml-72"
            }`}
          >
            {/* Ambient Background Grid Lines overlay */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-[0.25]">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, var(--foreground) 0.5px, transparent 0.5px)",
                  backgroundSize: "24px 24px",
                  opacity: 0.05,
                }}
              />
            </div>

            {/* Mobile Header (Hamburger Menu Bar) */}
            <header className="md:hidden flex items-center justify-between p-4 bg-card/85 border-b border-border backdrop-blur-md sticky top-0 z-30 w-full shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-foreground/5 flex items-center justify-center border border-border">
                  <Layers className="w-3.5 h-3.5 text-foreground/75" />
                </div>
                <span className="font-semibold tracking-tight text-sm text-foreground">
                  Shree's Workspace
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 rounded-lg bg-foreground/5 hover:bg-foreground/10 text-foreground transition-all cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
            </header>

            {/* Main Area Content Wrapper */}
            <div className="flex-1 flex flex-col justify-between relative z-10 w-full max-w-5xl mx-auto px-6 py-12 md:py-16">
              {/* Centered Prompt Section */}
              <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full text-center py-8">
                {/* Greeting Header */}
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-8">
                  What should we build,{" "}
                  {user.name ? user.name.split(" ")[0] : "Shree"}?
                </h1>

                {/* Prompt Box Container */}
                <div className="w-full relative">
                  <div className="glass-panel rounded-2xl p-2 flex flex-col sm:flex-row items-center gap-2 border border-border focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-foreground/5 transition-all duration-300 bg-card/85 shadow-md">
                    {/* Plus Button */}
                    <button
                      onClick={() => setShowNewProjectModal(true)}
                      className="p-3 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-xl transition-all hidden sm:flex shrink-0 cursor-pointer"
                      title="New Project"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    {/* Textarea Input */}
                    <textarea
                      id="prompt-textarea"
                      ref={promptRef}
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleCreate();
                        }
                      }}
                      placeholder="Describe your app idea in detail..."
                      rows={1}
                      className="flex-1 bg-transparent border-none text-foreground placeholder:text-muted-foreground/45 focus:ring-0 resize-none min-h-[48px] py-3.5 px-3 outline-none w-full"
                    />

                    {/* Right actions */}
                    <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end px-2 sm:px-0 pb-1.5 sm:pb-0 border-t sm:border-t-0 border-border sm:border-l pt-2 sm:pt-0 sm:pl-3">
                      {/* Submit button */}
                      <button
                        onClick={handleCreate}
                        disabled={isAnyLoading || !title.trim()}
                        className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
                        title="Start Building"
                      >
                        {isAnyLoading && !loadingProjectId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ArrowUp className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="mt-2 text-xs text-red-500 font-mono px-1 text-left">
                      ⚠️ {error}
                    </p>
                  )}

                  {/* Suggestion Chips */}
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <button
                      onClick={() =>
                        setTitle(
                          "Create a professional CRM dashboard with task lists and graphs",
                        )
                      }
                      className="px-3.5 py-1.5 rounded-full bg-foreground/5 hover:bg-foreground/10 active:scale-95 border border-border text-foreground text-[11px] font-medium transition-all cursor-pointer"
                    >
                      Create a CRM dashboard
                    </button>
                    <button
                      onClick={() =>
                        setTitle(
                          "Build a personal portfolio site with dark mode and contact form",
                        )
                      }
                      className="px-3.5 py-1.5 rounded-full bg-foreground/5 hover:bg-foreground/10 active:scale-95 border border-border text-foreground text-[11px] font-medium transition-all cursor-pointer"
                    >
                      Build a personal portfolio
                    </button>
                    <button
                      onClick={() =>
                        setTitle(
                          "Generate an API documentation browser with live request sandbox",
                        )
                      }
                      className="px-3.5 py-1.5 rounded-full bg-foreground/5 hover:bg-foreground/10 active:scale-95 border border-border text-foreground text-[11px] font-medium transition-all cursor-pointer"
                    >
                      Generate an API tool
                    </button>
                  </div>
                </div>
              </div>

              {/* Projects Section */}
              <div id="projects-section" className="w-full mt-12">
                {/* Section Header / Tabs */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 border-b border-border pb-4 gap-4">
                  <div className="flex overflow-x-auto hide-scrollbar gap-2">
                    <button
                      onClick={handleAllProjectsClick}
                      className="px-4 py-2 text-xs font-semibold text-foreground border-b-2 border-foreground whitespace-nowrap"
                    >
                      My projects
                    </button>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    {/* Search Field */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/45" />
                      <input
                        id="project-search-input"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search projects..."
                        className="pl-9 pr-4 py-2 text-xs bg-card border border-border rounded-xl outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/5 transition-all w-48 placeholder:text-muted-foreground/35 text-foreground"
                      />
                    </div>

                    {/* Refresh Button */}
                    <button
                      onClick={fetchProjects}
                      className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all cursor-pointer"
                      title="Refresh Projects"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${projectsLoading ? "animate-spin" : ""}`}
                      />
                    </button>
                  </div>
                </div>

                {/* Projects Grid Display */}
                {projectsLoading ? (
                  <div className="flex justify-center items-center py-24">
                    <Loader2 className="w-6 h-6 animate-spin text-foreground/70" />
                  </div>
                ) : filteredProjects.length === 0 && !searchQuery ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center glass-panel rounded-2xl border border-border p-8">
                    <div className="w-12 h-12 rounded-xl bg-foreground/5 flex items-center justify-center mb-3">
                      <Folder className="w-5 h-5 text-foreground/60" />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">
                      No projects yet
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                      Describe what you want to build in the prompt box above to
                      start.
                    </p>
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <p className="text-sm text-muted-foreground">
                      No projects match "
                      <span className="text-foreground font-semibold">
                        {searchQuery}
                      </span>
                      "
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project, index) => {
                      const gradients = [
                        "from-neutral-100 via-neutral-200/30 to-stone-100",
                        "from-stone-100 via-stone-200/30 to-zinc-100",
                        "from-zinc-100 via-zinc-200/30 to-slate-100",
                        "from-slate-100 via-slate-200/30 to-neutral-100",
                      ];
                      const grad = gradients[index % gradients.length];
                      const isCardLoading = loadingProjectId === project._id;
                      return (
                        <div
                          key={project._id}
                          onClick={() =>
                            !isAnyLoading && handleOpenProject(project._id)
                          }
                          className={`group rounded-2xl border border-border bg-card overflow-hidden card-hover cursor-pointer ${
                            isCardLoading ? "border-foreground/30" : ""
                          }`}
                        >
                          {/* Simulated Thumbnail */}
                          <div
                            className={`aspect-video w-full bg-gradient-to-br ${grad} relative overflow-hidden flex items-center justify-center`}
                          >
                            <div
                              className="absolute inset-0 opacity-[0.05]"
                              style={{
                                backgroundImage:
                                  "radial-gradient(circle, var(--foreground) 1px, transparent 1px)",
                                backgroundSize: "16px 16px",
                              }}
                            />

                            {/* Visual Browser Mockup */}
                            <div className="w-[80%] bg-card/90 rounded-xl p-3 border border-border shadow-md transform group-hover:scale-102 transition-transform duration-300">
                              <div className="flex items-center gap-1.5 mb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-foreground/15" />
                                <span className="w-1.5 h-1.5 rounded-full bg-foreground/15" />
                                <span className="w-1.5 h-1.5 rounded-full bg-foreground/15" />
                              </div>
                              <div className="h-2 bg-foreground/15 rounded-full w-[70%] mb-1.5" />
                              <div className="h-1.5 bg-foreground/5 rounded-full w-[45%]" />
                            </div>

                            {/* Hover overlay details */}
                            <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              {isCardLoading ? (
                                <div className="bg-card/95 backdrop-blur-md rounded-xl px-4 py-2 flex items-center gap-2 border border-border shadow-sm">
                                  <Loader2 className="w-4 h-4 animate-spin text-foreground/75" />
                                  <span className="text-xs font-semibold text-foreground">
                                    Starting{dots}
                                  </span>
                                </div>
                              ) : (
                                <div className="bg-card/95 backdrop-blur-md rounded-xl px-4 py-2 flex items-center gap-2 border border-border shadow-sm">
                                  <ExternalLink className="w-4 h-4 text-foreground/75" />
                                  <span className="text-xs font-semibold text-foreground">
                                    Open Sandbox
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Card Body */}
                          <div className="p-4 flex items-center justify-between gap-3 border-t border-border">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-sm truncate text-foreground group-hover:text-foreground/80 transition-colors">
                                {project.title}
                              </h3>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  Last edited{" "}
                                  {getFormattedDate(
                                    project.updatedAt,
                                    project.createdAt,
                                  )}
                                </span>
                              </p>
                            </div>
                            {isCardLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-foreground/70 shrink-0" />
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportProject(project._id, project.title);
                                }}
                                className="p-2 rounded-xl hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-all cursor-pointer shrink-0"
                                title="Export Project as ZIP"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Copy */}
            <footer className="py-6 border-t border-border bg-card/60 backdrop-blur-md text-center shrink-0">
              <p className="text-[10px] text-muted-foreground font-mono">
                &copy; 2026 Optimus. All systems operational.
              </p>
            </footer>
          </main>

          {/* New Project Modal */}
          {showNewProjectModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setShowNewProjectModal(false)}
            >
              <div
                className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center border border-border text-foreground/75">
                    <Folder className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    New project
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mb-6">
                  Give your project a name to initialize its microservice
                  workspace sandbox.
                </p>

                <input
                  type="text"
                  value={title}
                  autoFocus
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !isAnyLoading && handleCreate()
                  }
                  placeholder="e.g. ecommerce-platform"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-foreground/30 focus:ring-1 focus:ring-foreground/5 outline-none transition-all mb-4 placeholder:text-muted-foreground/35 text-foreground"
                />

                {error && (
                  <p className="text-xs text-destructive font-mono mb-3">
                    ⚠️ {error}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowNewProjectModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-foreground/5 transition-colors cursor-pointer text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={isAnyLoading || !title.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isAnyLoading && !loadingProjectId && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {isAnyLoading && !loadingProjectId
                      ? loadingStep === "project"
                        ? "Creating…"
                        : "Starting…"
                      : "Create project"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Toast Notification */}
          {toast && (
            <div className="fixed bottom-6 right-6 z-50 bg-card text-foreground border border-border rounded-xl px-5 py-3 shadow-lg backdrop-blur-md flex items-center gap-2.5 animate-fadeIn">
              <Sparkles className="w-4 h-4 text-foreground/80 animate-pulse" />
              <span className="text-sm font-medium">{toast}</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
