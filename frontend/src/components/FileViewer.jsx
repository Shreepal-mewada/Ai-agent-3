import { useState, useEffect } from 'react'
import { FileCode2, Loader2 } from 'lucide-react'

const LANGUAGE_MAP = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  css: 'css', html: 'html', json: 'json', md: 'markdown',
  py: 'python', sh: 'bash', yml: 'yaml', yaml: 'yaml',
}

function getLanguage(filename) {
  const ext = filename.split('.').pop()?.toLowerCase()
  return LANGUAGE_MAP[ext] || 'plaintext'
}

export default function FileViewer({ agentBase, filePath, showToast }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!agentBase || !filePath) return
    const fetchFile = async () => {
      setLoading(true)
      setError(null)
      setContent(null)
      try {
        const res = await fetch(`${agentBase}/read-files?files=${encodeURIComponent(filePath)}`)
        const data = await res.json()
        const fileData = data.files?.[0]
        if (fileData) {
          const fileContent = Object.values(fileData)[0]
          setContent(fileContent)
        } else {
          setError('File not found or empty')
        }
      } catch (err) {
        setError('Failed to load file')
      } finally {
        setLoading(false)
      }
    }
    fetchFile()
  }, [agentBase, filePath])

  if (!filePath) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 bg-surface text-on-surface-variant">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/20 border border-primary/30">
          <FileCode2 className="w-6 h-6 text-secondary/70" />
        </div>
        <p className="text-xs font-semibold text-primary">No file selected</p>
        <p className="text-[10px] text-on-surface-variant/60">Select a file from the explorer to edit or inspect.</p>
      </div>
    )
  }

  const filename = filePath.split('/').pop()
  const lang = getLanguage(filePath)

  return (
    <div className="flex flex-col h-full bg-surface text-primary">
      
      {/* File Editor Tab Bar */}
      <div className="flex items-center gap-2 px-3 shrink-0 h-9 bg-background/40 border-b border-outline/15">
        <div className="flex items-center gap-2 px-3.5 py-1 rounded-t-lg bg-surface border-t border-x border-outline/15 -mb-[1px] relative z-10">
          <span className="text-xs font-bold text-primary">
            {filename}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-primary/10 text-primary">
            {lang}
          </span>
        </div>
      </div>

      {/* Code Text Content Box */}
      <div className="flex-1 overflow-auto relative bg-surface">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/60 z-20">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        )}
        
        {error && (
          <div className="p-6 text-xs text-error font-semibold">{error}</div>
        )}
        
        {content !== null && !loading && (
          <pre className="p-5 text-[11px] leading-relaxed overflow-auto h-full text-primary font-mono select-text"
            style={{ 
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              whiteSpace: 'pre-wrap', 
              wordBreak: 'break-all' 
            }}
          >
            <code>{content}</code>
          </pre>
        )}
      </div>

    </div>
  )
}
