import { useRef, useState } from 'react'
import { RotateCw, ExternalLink, Globe, Loader2, Copy } from 'lucide-react'

export default function PreviewFrame({ previewUrl, showToast }) {
  const iframeRef = useRef(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)

  const handleRefresh = () => {
    setLoading(true)
    setRefreshKey(k => k + 1)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(previewUrl)
    showToast('Preview URL copied!', 'success')
  }

  return (
    <div className="flex flex-col h-full w-full bg-surface">
      
      {/* Browser Mockup Toolbar */}
      <div className="flex items-center gap-3 px-3 shrink-0 h-9 bg-background/40 border-b border-outline/15">

        {/* Traffic Light Windows Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-error/30 border border-error/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-on-tertiary-container/30 border border-on-tertiary-container/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-primary/20 border border-primary/30" />
        </div>

        {/* URL Path Box */}
        <div className="flex-1 flex items-center bg-surface border border-outline/15 rounded-lg px-2.5 h-6 min-w-0 select-text">
          <Globe className="w-3 h-3 text-primary/50 mr-2 shrink-0" />
          
          {loading && (
            <Loader2 className="w-3 h-3 text-primary animate-spin mr-2 shrink-0" />
          )}

          <span className="text-[10px] font-mono text-[#9CA3AF] truncate">
            {previewUrl}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button 
            onClick={handleCopyLink}
            className="p-1 rounded hover:bg-primary/5 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            title="Copy URL"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          
          <button 
            onClick={handleRefresh}
            className="p-1 rounded hover:bg-primary/5 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            title="Reload preview"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <a 
            href={previewUrl} 
            target="_blank" 
            rel="noreferrer"
            className="p-1 rounded hover:bg-primary/5 text-on-surface-variant hover:text-primary transition-colors cursor-pointer flex items-center justify-center"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Preview Web Frame */}
      <div className="flex-1 relative bg-white">
        <iframe
          key={refreshKey}
          ref={iframeRef}
          src={previewUrl}
          className="w-full h-full border-0 bg-white"
          title="Sandbox Preview"
          onLoad={() => setLoading(false)}
        />
      </div>

    </div>
  )
}
