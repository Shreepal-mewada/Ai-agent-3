export default function TopBar({ activeTab, onTabChange, status, onExport }) {
  const statusConfig = {
    ready: { color: "#10b981", label: "Ready", dot: true },
    loading: { color: "#f59e0b", label: "Working…", dot: false },
    error: { color: "#ef4444", label: "Error", dot: true },
  };
  const s = statusConfig[status] || statusConfig.ready;

  return (
    <header
      className="flex items-center justify-between px-4 shrink-0"
      style={{
        height: "48px",
        background: "var(--background)",
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Left — Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center border border-foreground/30 bg-foreground/5">
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="text-foreground"
            >
              <rect x="1" y="1" width="6" height="6" rx="1" />
              <rect x="9" y="1" width="6" height="6" rx="1" opacity="0.5" />
              <rect x="1" y="9" width="6" height="6" rx="1" opacity="0.5" />
              <rect x="9" y="9" width="6" height="6" rx="1" />
            </svg>
          </div>
          <span
            className="text-lg font-semibold font-display tracking-tight"
            style={{ color: "var(--foreground)" }}
          >
            Optimus IDE
          </span>
        </div>
      </div>

      {/* Center — Tab switcher */}
      <div className="flex items-center gap-1 p-0.5 border border-foreground/15 bg-background">
        {[
          { id: "preview", label: "Preview" },
          { id: "files", label: "Files" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-1 text-xs font-mono transition-all duration-200 cursor-pointer ${
              activeTab === tab.id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right — status */}
      <div className="flex items-center gap-4">
        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded border border-foreground/15 hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            title="Export Project as ZIP"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export</span>
          </button>
        )}
        <div className="flex items-center gap-1.5">
          {s.dot ? (
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }}
            />
          ) : (
            <div
              className="w-4 h-4 rounded-full border-2 border-t-transparent"
              style={{
                borderColor: s.color,
                borderTopColor: "transparent",
                animation: "spin 0.8s linear infinite",
              }}
            />
          )}
          <span className="text-xs font-mono" style={{ color: s.color }}>
            {s.label}
          </span>
        </div>
      </div>
    </header>
  );
}
