import { useState, useRef, useCallback } from 'react'
import SplashScreen from './components/SplashScreen'
import TopBar from './components/TopBar'
import FileExplorer from './components/FileExplorer'
import PreviewFrame from './components/PreviewFrame'
import FileViewer from './components/FileViewer'
import Terminal from './components/Terminal'
import AiChat from './components/AiChat'

export default function App() {
  // Sandbox state
  const [sandbox, setSandbox] = useState(null) // { sandboxId, previewUrl, agentBase }
  const [status, setStatus] = useState('ready')

  // UI state
  const [activeTab, setActiveTab] = useState('preview') // 'preview' | 'files'
  const [activeFile, setActiveFile] = useState(null)
  const [fileRefreshKey, setFileRefreshKey] = useState(0)
  const [showTerminal, setShowTerminal] = useState(false)

  // Terminal resize
  const [terminalHeight, setTerminalHeight] = useState(220)
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartH = useRef(0)


  const handleSandboxCreated = useCallback((data) => {
    const agentBase = `http://${data.sandboxId}.agent.localhost`
    setSandbox({ sandboxId: data.sandboxId, previewUrl: data.previewUrl, agentBase })
    setStatus('ready')
  }, [])

  const handleFilesChanged = useCallback(() => {
    setFileRefreshKey(k => k + 1)
  }, [])

  const handleFileSelect = useCallback((path) => {
    setActiveFile(path)
    setActiveTab('files')
  }, [])

  // Drag to resize terminal
  const handleDragStart = (e) => {
    isDragging.current = true
    dragStartY.current = e.clientY
    dragStartH.current = terminalHeight

    const onMove = (ev) => {
      if (!isDragging.current) return
      const delta = dragStartY.current - ev.clientY
      const newH = Math.min(Math.max(dragStartH.current + delta, 80), 500)
      setTerminalHeight(newH)
    }
    const onUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // Landing / splash
  if (!sandbox) {
    return <SplashScreen onSandboxCreated={handleSandboxCreated} />
  }

  const { sandboxId, previewUrl, agentBase } = sandbox

  return (
    <div className="flex flex-col h-full w-full overflow-hidden"
      style={{ background: 'var(--background)', zoom: 0.8, overflow: 'hidden' }}>

      {/* Top bar */}
      <TopBar
        sandboxId={sandboxId}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        status={status}
      />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* File Explorer sidebar */}
        <FileExplorer
          agentBase={agentBase}
          activeFile={activeFile}
          onFileSelect={handleFileSelect}
          refreshKey={fileRefreshKey}
        />

        {/* Center — main content + terminal */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Main content area */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'preview' ? (
              <PreviewFrame
                previewUrl={previewUrl}
                showTerminal={showTerminal}
                onToggleTerminal={() => setShowTerminal(prev => !prev)}
              />
            ) : (
              <FileViewer agentBase={agentBase} filePath={activeFile} />
            )}
          </div>

          {/* Bottom status strip when terminal is closed */}
          {!showTerminal && (
            <div 
              onClick={() => setShowTerminal(true)}
              className="shrink-0 flex items-center justify-between px-4 text-xs font-mono select-none cursor-pointer hover:bg-foreground/[0.02] transition-colors"
              style={{
                height: '28px',
                background: 'var(--background)',
                borderTop: '1px solid var(--border)',
                color: 'var(--text-secondary)'
              }}
              title="Click to open terminal"
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Web Environment Online</span>
              </div>
              <div className="flex items-center gap-2 text-amber-700 hover:text-amber-800 font-semibold transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="inline mr-1">
                  <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
                </svg>
                <span>Open Terminal</span>
              </div>
            </div>
          )}

          {showTerminal && (
            <>
              {/* Drag handle */}
              <div
                className="shrink-0 flex items-center justify-center cursor-row-resize select-none"
                style={{ height: '6px', background: 'var(--background)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', zIndex: 10 }}
                onMouseDown={handleDragStart}
                title="Drag to resize terminal">
                <div className="w-12 h-0.5 rounded-full" style={{ background: 'var(--foreground)' }} />
              </div>

              {/* Terminal */}
              <div className="shrink-0 overflow-hidden" style={{ height: `${terminalHeight}px` }}>
                <Terminal sandboxId={sandboxId} />
              </div>
            </>
          )}
        </div>

        {/* Right — AI Chat */}
        <div className="shrink-0 overflow-hidden" style={{ width: '340px' }}>
          <AiChat
            sandboxId={sandboxId}
            onFilesChanged={handleFilesChanged}
          />
        </div>
      </div>
    </div>
  )
}
