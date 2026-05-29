import { useState, useRef, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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

  // Toast state
  const [toasts, setToasts] = useState([])

  // Terminal resize
  const [terminalHeight, setTerminalHeight] = useState(200)
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartH = useRef(0)

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const handleSandboxCreated = useCallback((data) => {
    const agentBase = `http://${data.sandboxId}.agent.localhost`
    setSandbox({ sandboxId: data.sandboxId, previewUrl: data.previewUrl, agentBase })
    setStatus('ready')
    showToast('Secure sandbox instance started!', 'success')
  }, [showToast])

  const handleFilesChanged = useCallback(() => {
    setFileRefreshKey(k => k + 1)
    showToast('Workspace files synchronized', 'success')
  }, [showToast])

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
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#F1E2D1] p-3 gap-2.5">
      
      {/* Toast notifications container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border bg-[#fff8f3] shadow-[0_10px_30px_rgba(84,26,26,0.06)] text-[#541A1A] border-[#541A1A]/20"
            >
              {toast.type === 'success' && <span className="text-[#8C4C4C] font-bold text-sm shrink-0">✓</span>}
              {toast.type === 'error' && <span className="text-[#9C3D3D] font-bold text-sm shrink-0">⚠</span>}
              {toast.type === 'info' && <span className="text-[#705A5A] font-bold text-sm shrink-0">✦</span>}
              <div className="flex-1 text-xs leading-normal font-medium">{toast.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Top bar header */}
      <div className="w-full bg-[#fff8f3] rounded-xl border border-[#541A1A]/15 shadow-[0_4px_20px_rgba(84,26,26,0.03)] overflow-hidden shrink-0">
        <TopBar
          sandboxId={sandboxId}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          status={status}
          showToast={showToast}
        />
      </div>

      {/* Main layout */}
      <div className="flex flex-1 gap-2.5 overflow-hidden w-full">

        {/* File Explorer sidebar */}
        <div className="w-56 shrink-0 bg-[#fff8f3] rounded-xl border border-[#541A1A]/15 shadow-[0_4px_20px_rgba(84,26,26,0.03)] overflow-hidden">
          <FileExplorer
            agentBase={agentBase}
            activeFile={activeFile}
            onFileSelect={handleFileSelect}
            refreshKey={fileRefreshKey}
            showToast={showToast}
          />
        </div>

        {/* Center — main content + terminal */}
        <div className="flex flex-col flex-1 gap-2.5 overflow-hidden h-full">

          {/* Main content area */}
          <div className="flex-1 bg-[#fff8f3] rounded-xl border border-[#541A1A]/15 shadow-[0_4px_20px_rgba(84,26,26,0.03)] overflow-hidden">
            {activeTab === 'preview' ? (
              <PreviewFrame previewUrl={previewUrl} showToast={showToast} />
            ) : (
              <FileViewer agentBase={agentBase} filePath={activeFile} showToast={showToast} />
            )}
          </div>

          {/* Drag handle */}
          <div
            className="shrink-0 flex items-center justify-center cursor-row-resize select-none h-1.5 hover:bg-[#541A1A]/10 rounded transition-colors"
            onMouseDown={handleDragStart}
            title="Drag to resize terminal">
            <div className="w-12 h-0.5 rounded-full bg-[#541A1A]/20" />
          </div>

          {/* Terminal */}
          <div className="shrink-0 bg-[#0A0D14] rounded-xl border border-[#541A1A]/15 shadow-[0_4px_20px_rgba(84,26,26,0.03)] overflow-hidden" style={{ height: `${terminalHeight}px` }}>
            <Terminal sandboxId={sandboxId} showToast={showToast} />
          </div>
        </div>

        {/* Right — AI Chat */}
        <div className="w-96 shrink-0 bg-[#fff8f3] rounded-xl border border-[#541A1A]/15 shadow-[0_4px_20px_rgba(84,26,26,0.03)] overflow-hidden">
          <AiChat
            sandboxId={sandboxId}
            onFilesChanged={handleFilesChanged}
            showToast={showToast}
          />
        </div>
      </div>
    </div>
  )
}
