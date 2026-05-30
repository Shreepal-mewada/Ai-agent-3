import { useState, useRef, useCallback } from 'react'
import SplashScreen from './components/SplashScreen'
import TopBar from './components/TopBar'
import FileExplorer from './components/FileExplorer'
import PreviewFrame from './components/PreviewFrame'
import FileViewer from './components/FileViewer'
import Terminal from './components/Terminal'
import AiChat from './components/AiChat'
import LoadingScreen from './components/LoadingScreen'

function parseActivityLine(line) {
  if (!line.trim()) return null
  if (line.startsWith('Reading files')) return { type: 'reading', text: line }
  if (line.startsWith('Updating files')) return { type: 'updating', text: line }
  if (line.toLowerCase().includes('success')) return { type: 'success', text: line }
  return { type: 'info', text: line }
}

export default function App() {
  // Sandbox state
  const [sandbox, setSandbox] = useState(null) // { sandboxId, previewUrl, agentBase }
  const [sandboxReady, setSandboxReady] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [status, setStatus] = useState('ready')

  // UI state
  const [activeTab, setActiveTab] = useState('preview') // 'preview' | 'files'
  const [activeFile, setActiveFile] = useState(null)
  const [fileRefreshKey, setFileRefreshKey] = useState(0)
  const [showTerminal, setShowTerminal] = useState(false)

  // AI Chat state (lifted)
  const [aiMessages, setAiMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I can modify your project. Describe what you want to build or change, and I'll update the code for you.",
      activity: [],
      time: Date.now()
    }
  ])
  const [aiStreaming, setAiStreaming] = useState(false)

  // Terminal resize
  const [terminalHeight, setTerminalHeight] = useState(220)
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartH = useRef(0)

  const handleFilesChanged = useCallback(() => {
    setFileRefreshKey(k => k + 1)
  }, [])

  const sendAiMessage = useCallback(async (text, customSandboxId = null) => {
    const activeSandboxId = customSandboxId || sandbox?.sandboxId
    if (!text || !activeSandboxId) return

    setAiStreaming(true)

    const userMsg = { role: 'user', content: text, activity: [], time: Date.now() }
    setAiMessages(prev => [...prev, userMsg])

    const aiMsgId = Date.now() + 1
    setAiMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '', activity: [], time: Date.now(), pending: true }])

    let aiContent = ''
    let activityLines = []

    try {
      const response = await fetch('/api/ai/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text, projectId: activeSandboxId })
      })

      if (!response.ok) throw new Error(`Server error: ${response.status}`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const updateMsg = () => {
        setAiMessages(prev => prev.map(m =>
          m.id === aiMsgId
            ? { ...m, content: aiContent || '…', activity: [...activityLines], pending: !aiContent }
            : m
        ))
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.trim()) continue
          const parsed = parseActivityLine(line)
          if (parsed) {
            activityLines = [...activityLines, parsed]
            if (parsed.type === 'info' && line.length > 30) {
              aiContent = line
            }
          }
          updateMsg()
        }
      }

      if (!aiContent) {
        const updates = activityLines.filter(l => l.type === 'success')
        aiContent = updates.length
          ? 'Done! Files have been updated successfully.'
          : 'Changes applied to your project.'
      }

      setAiMessages(prev => prev.map(m =>
        m.id === aiMsgId
          ? { ...m, content: aiContent, activity: activityLines, pending: false }
          : m
      ))

      handleFilesChanged()
    } catch (err) {
      setAiMessages(prev => prev.map(m =>
        m.id === aiMsgId
          ? { ...m, content: `Error: ${err.message}`, activity: activityLines, pending: false }
          : m
      ))
    } finally {
      setAiStreaming(false)
    }
  }, [sandbox, handleFilesChanged])

  const handleSandboxCreated = useCallback((data, initialPrompt = '') => {
    const agentBase = `http://${data.sandboxId}.agent.localhost`
    setSandbox({ sandboxId: data.sandboxId, previewUrl: data.previewUrl, agentBase })
    setSandboxReady(false)
    setLoadingStatus('Initializing workspace...')

    // If there is an initial prompt, trigger it immediately in the background
    if (initialPrompt && initialPrompt.trim()) {
      sendAiMessage(initialPrompt, data.sandboxId)
    }

    // Polling interval to check preview server readiness
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`${agentBase}/preview-status`)
        if (res.ok) {
          const statusData = await res.json()
          if (statusData.ready) {
            clearInterval(interval)
            setSandboxReady(true)
            setLoadingStatus('Ready!')
          }
        }
      } catch (err) {
        // Agent container not started yet
      }
      
      if (attempts > 90) { // 90 seconds timeout
        clearInterval(interval)
        setSandboxReady(true)
      }
    }, 1000)
  }, [sendAiMessage])

  const handleFileSelect = useCallback((path) => {
    setActiveFile(path)
    setActiveTab('files')
  }, [])

  const handleExportWorkspace = useCallback(async () => {
    if (!sandbox?.sandboxId || !sandbox?.agentBase) return
    setStatus('loading')
    try {
      const res = await fetch(`${sandbox.agentBase}/export`)
      if (!res.ok) throw new Error(`Export failed: ${res.statusText}`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `project-${sandbox.sandboxId.slice(0, 8)}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      setStatus('ready')
    } catch (err) {
      console.error("Export workspace error:", err)
      setStatus('error')
      alert("Failed to export project: " + err.message)
    }
  }, [sandbox])

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

  if (!sandboxReady) {
    return (
      <LoadingScreen
        messages={aiMessages}
        streaming={aiStreaming}
        loadingStatus={loadingStatus}
      />
    )
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
        onExport={handleExportWorkspace}
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
            messages={aiMessages}
            streaming={aiStreaming}
            onSendMessage={sendAiMessage}
          />
        </div>
      </div>
    </div>
  )
}
