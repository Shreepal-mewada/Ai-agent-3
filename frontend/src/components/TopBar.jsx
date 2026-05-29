export default function TopBar({ sandboxId, activeTab, onTabChange, status }) {
  const shortId = sandboxId ? sandboxId.slice(0, 8) + '…' : ''

  const statusConfig = {
    ready: { color: '#10b981', label: 'Ready', dot: true },
    loading: { color: '#f59e0b', label: 'Working…', dot: false },
    error: { color: '#ef4444', label: 'Error', dot: true },
  }
  const s = statusConfig[status] || statusConfig.ready

  return (
    <header className="flex items-center justify-between px-4 shrink-0"
      style={{
        height: '48px',
        background: 'var(--background)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(12px)'
      }}>

      {/* Left — Logo + sandbox ID */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center border border-foreground/30 bg-foreground/5">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-foreground">
              <rect x="1" y="1" width="6" height="6" rx="1"/>
              <rect x="9" y="1" width="6" height="6" rx="1" opacity="0.5"/>
              <rect x="1" y="9" width="6" height="6" rx="1" opacity="0.5"/>
              <rect x="9" y="9" width="6" height="6" rx="1"/>
            </svg>
          </div>
          <span className="text-sm font-semibold font-display tracking-tight" style={{ color: 'var(--foreground)' }}>Optimus IDE</span>
        </div>

        {sandboxId && (
          <div className="flex items-center gap-2 px-2 py-0.5 rounded border border-foreground/15 bg-foreground/5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
            <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              {shortId}
            </span>
          </div>
        )}
      </div>

      {/* Center — Tab switcher */}
      <div className="flex items-center gap-1 p-0.5 border border-foreground/15 bg-background">
        {[
          { id: 'preview', label: 'Preview' },
          { id: 'files', label: 'Files' }
        ].map(tab => (
          <button key={tab.id} onClick={() => onTabChange(tab.id)}
            className={`px-4 py-1 text-xs font-mono transition-all duration-200 cursor-pointer ${
              activeTab === tab.id 
                ? "bg-foreground text-background" 
                : "text-muted-foreground hover:text-foreground"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right — status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {s.dot ? (
            <div className="w-2 h-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent"
              style={{ borderColor: s.color, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          )}
          <span className="text-xs font-mono" style={{ color: s.color }}>{s.label}</span>
        </div>
      </div>
    </header>
  )
}
