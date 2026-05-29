import { 
  Sparkles, 
  Eye, 
  FileText, 
  Copy, 
  ExternalLink,
  ShieldCheck, 
  AlertCircle,
  Activity,
  LogOut
} from 'lucide-react'

export default function TopBar({ sandboxId, activeTab, onTabChange, status, showToast }) {
  const shortId = sandboxId ? sandboxId.slice(0, 8) + '…' : ''
  const previewUrl = `http://${sandboxId}.preview.localhost`

  const statusConfig = {
    ready: { color: '#8C4C4C', label: 'Synced', icon: ShieldCheck, bg: 'rgba(140,76,76,0.08)' },
    loading: { color: '#8E6C3A', label: 'Processing', icon: Activity, bg: 'rgba(142,108,58,0.08)' },
    error: { color: '#9C3D3D', label: 'Failed', icon: AlertCircle, bg: 'rgba(156,61,61,0.08)' },
  }
  const s = statusConfig[status] || statusConfig.ready
  const StatusIcon = s.icon

  const handleCopyLink = () => {
    if (!sandboxId) return
    navigator.clipboard.writeText(previewUrl)
    showToast('Preview link copied!', 'success')
  }

  const handleLogout = () => {
    document.cookie = 'token=; Max-Age=0; path=/;'
    window.location.href = '/'
  }

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-[#fff8f3] text-[#541A1A] select-none h-13 border-b border-[#541A1A]/15">
      
      {/* Left — Logo and Status Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6.5 h-6.5 rounded-lg flex items-center justify-center bg-[#541A1A]/10 border border-[#541A1A]/20">
            <Sparkles className="w-3.5 h-3.5 text-[#541A1A]" />
          </div>
          <span className="text-xs font-bold tracking-tight text-[#380508] uppercase hidden sm:inline font-sans">Aura Workspace</span>
        </div>

        {sandboxId && (
          <div 
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[10px] font-semibold transition-all duration-150"
            style={{ 
              color: s.color, 
              borderColor: s.color + '25',
              background: s.bg 
            }}
          >
            <StatusIcon className={`w-3.5 h-3.5 ${status === 'loading' ? 'animate-pulse' : ''}`} />
            <span className="font-mono text-[9px] uppercase tracking-wider">{s.label}</span>
          </div>
        )}
      </div>

      {/* Center — View Tab Switcher */}
      <div className="flex items-center gap-1 p-1 bg-[#F1E2D1] border border-[#541A1A]/12 rounded-xl shrink-0">
        {[
          { id: 'preview', icon: Eye, label: 'Preview' },
          { id: 'files', icon: FileText, label: 'Editor' }
        ].map(tab => {
          const TabIcon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button 
              key={tab.id} 
              onClick={() => onTabChange(tab.id)}
              className="px-3.5 py-1 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-1.5"
              style={isActive ? {
                background: '#fff8f3',
                color: '#541A1A',
                border: '1px solid rgba(84,26,26,0.2)',
                boxShadow: '0 2px 8px rgba(84,26,26,0.04)'
              } : {
                color: '#705A5A',
                border: '1px solid transparent'
              }}
            >
              <TabIcon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-2">
        {sandboxId && (
          <>
            <button 
              onClick={handleCopyLink}
              className="p-1.5 rounded-lg text-[#705A5A] hover:text-[#541A1A] hover:bg-[#541A1A]/6 transition-colors cursor-pointer flex items-center justify-center"
              title="Copy Preview URL"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <a 
              href={previewUrl} 
              target="_blank" 
              rel="noreferrer"
              className="p-1.5 rounded-lg text-[#705A5A] hover:text-[#541A1A] hover:bg-[#541A1A]/6 transition-colors cursor-pointer flex items-center justify-center"
              title="Open Live Site"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </>
        )}

        <div className="w-px h-4 bg-[#541A1A]/15 mx-1" />

        <button 
          onClick={handleLogout}
          className="p-1.5 rounded-lg text-[#705A5A] hover:text-[#9C3D3D] hover:bg-[#9C3D3D]/5 transition-colors cursor-pointer flex items-center justify-center"
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

    </header>
  )
}
