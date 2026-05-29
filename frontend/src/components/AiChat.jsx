import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  Send, 
  Paperclip, 
  Terminal, 
  User, 
  Check, 
  Copy,
  Plus,
  RefreshCw,
  FolderOpen
} from 'lucide-react'

// Render activity logs from AI updates in a dark navy theme
function ActivityLog({ lines }) {
  if (!lines.length) return null
  return (
    <div className="mt-2.5 rounded-lg overflow-hidden border border-outline/30 bg-[#0A0D14]">
      {lines.map((line, i) => (
        <div 
          key={i} 
          className="flex items-start gap-2 px-3 py-1.5 text-[11px]"
          style={{ borderBottom: i < lines.length - 1 ? '1px solid rgba(84,26,26,0.08)' : 'none' }}
        >
          <span className="shrink-0 text-secondary">
            {line.type === 'reading' ? '📖' : line.type === 'updating' ? '✏️' : line.type === 'success' ? '✅' : '✦'}
          </span>
          <span className="font-mono text-[#9CA3AF] break-all">{line.text}</span>
        </div>
      ))}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3 bg-surface border border-outline/25 rounded-2xl w-fit">
      {[0, 1, 2].map(i => (
        <div 
          key={i} 
          className="w-1.5 h-1.5 rounded-full bg-primary"
          style={{
            animation: 'typing-dot 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`
          }} 
        />
      ))}
    </div>
  )
}

function parseActivityLine(line) {
  if (!line.trim()) return null
  if (line.startsWith('Reading files')) return { type: 'reading', text: line }
  if (line.startsWith('Updating files')) return { type: 'updating', text: line }
  if (line.toLowerCase().includes('success')) return { type: 'success', text: line }
  return { type: 'info', text: line }
}

export default function AiChat({ sandboxId, onFilesChanged, showToast }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I am Aura's agentic copilot. Describe what database, fintech, or insurance logic you want to build or change, and I'll modify the sandboxed codebase.",
      activity: [],
      time: Date.now()
    }
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  // Scroll to bottom on message updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Custom inline markdown parsing + block code rendering with Copy buttons
  const renderMarkdown = (text) => {
    if (!text) return ''
    const parts = text.split(/(```[\s\S]*?```)/g)
    
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const lines = part.split('\n')
        const header = lines[0].replace('```', '').trim() || 'code'
        const code = lines.slice(1, -1).join('\n')
        return (
          <div key={i} className="my-3 rounded-xl overflow-hidden border border-outline/30 bg-[#0A0D14] shadow-[0_4px_15px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#121620] border-b border-outline/30">
              <span className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">{header}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(code)
                  showToast('Copied code block', 'success')
                }}
                className="text-[10px] font-semibold text-secondary hover:bg-white/5 px-2.5 py-1 rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Copy className="w-3 h-3 text-secondary/80" />
                Copy
              </button>
            </div>
            <pre className="p-4 text-[11px] leading-relaxed overflow-x-auto text-[#F3F4F6] font-mono select-text">
              <code>{code}</code>
            </pre>
          </div>
        )
      }
      
      const lines = part.split('\n')
      return lines.map((line, lineIdx) => {
        if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
          const cleanLine = line.trim().replace(/^[\*\-]\s+/, '')
          return (
            <li key={lineIdx} className="ml-4 list-disc text-xs leading-relaxed text-[#9CA3AF] my-1 select-text">
              {parseInlineMarkdown(cleanLine)}
            </li>
          )
        }
        if (line.trim() === '') return <div key={lineIdx} className="h-1.5" />
        return (
          <p key={lineIdx} className="text-xs leading-relaxed text-[#9CA3AF] my-1.5 select-text">
            {parseInlineMarkdown(line)}
          </p>
        )
      })
    })
  }

  const parseInlineMarkdown = (line) => {
    const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g)
    return parts.map((chunk, idx) => {
      if (chunk.startsWith('**') && chunk.endsWith('**')) {
        return <strong key={idx} className="font-bold text-primary">{chunk.slice(2, -2)}</strong>
      }
      if (chunk.startsWith('`') && chunk.endsWith('`')) {
        return <code key={idx} className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 font-mono text-[10px] text-primary">{chunk.slice(1, -1)}</code>
      }
      return chunk
    })
  }

  const sendMessage = useCallback(async (customText) => {
    const text = (customText || input).trim()
    if (!text || streaming || !sandboxId) return

    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setStreaming(true)

    const userMsg = { role: 'user', content: text, activity: [], time: Date.now() }
    setMessages(prev => [...prev, userMsg])

    const aiMsgId = Date.now() + 1
    setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '', activity: [], time: Date.now(), pending: true }])

    let aiContent = ''
    let activityLines = []

    try {
      const response = await fetch('/api/ai/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text, projectId: sandboxId })
      })

      if (!response.ok) throw new Error(`Server response error (${response.status})`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const updateMsg = () => {
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId
            ? { ...m, content: aiContent || '', activity: [...activityLines], pending: !aiContent }
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
          ? 'Done! I have applied the code updates to the workspace successfully.'
          : 'Boilerplate updates successfully compiled.'
      }

      setMessages(prev => prev.map(m =>
        m.id === aiMsgId
          ? { ...m, content: aiContent, activity: activityLines, pending: false }
          : m
      ))

      onFilesChanged?.()
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === aiMsgId
          ? { ...m, content: `Failed to compile: ${err.message}`, activity: activityLines, pending: false }
          : m
      ))
      showToast(`Error: ${err.message}`, 'error')
    } finally {
      setStreaming(false)
    }
  }, [input, streaming, sandboxId, onFilesChanged, showToast])

  // Mount effect to check and auto-run pending prompt
  useEffect(() => {
    const pending = sessionStorage.getItem('pending_prompt')
    if (pending && sandboxId && !streaming) {
      sessionStorage.removeItem('pending_prompt')
      sendMessage(pending)
    }
  }, [sandboxId, streaming, sendMessage])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Preset prompts for welcome empty state
  const suggestedPrompts = [
    { text: "Automate an insurance risk ingestion JSON pipeline", label: "Fintech Ingestion" },
    { text: "Build a responsive C-suite risk metrics dashboard page", label: "Analytics UI" },
    { text: "Add a database syncing script with transaction locks", label: "Fintech Data" }
  ]

  return (
    <div className="flex flex-col h-full bg-surface text-primary select-none">
      
      {/* Panel Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 shrink-0 border-b border-outline/20 bg-surface">
        <div className="w-6.5 h-6.5 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <h2 className="text-xs font-bold tracking-tight text-primary uppercase">Aura Agent</h2>
          <p className="text-[10px] text-on-surface-variant font-medium leading-none mt-0.5">Orchestration System</p>
        </div>
        
        <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
          <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
          <span className="text-[9px] font-bold text-secondary">SECURED</span>
        </div>
      </div>

      {/* Messages View */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          return (
            <motion.div 
              key={msg.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {/* Message Content Card */}
              <div className="max-w-[90%] flex gap-2.5 items-start">
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20 shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                
                <div className="flex flex-col min-w-0">
                  <div 
                    className="px-3.5 py-2.5 rounded-2xl shadow-[0_4px_15px_rgba(84,26,26,0.04)] text-xs border"
                    style={{
                      background: isUser ? '#efe0cf' : '#ffffff',
                      borderColor: isUser ? 'var(--color-outline-variant)' : 'rgba(84, 26, 26, 0.15)',
                      borderBottomRightRadius: isUser ? '4px' : '16px',
                      borderBottomLeftRadius: isUser ? '16px' : '4px',
                    }}
                  >
                    {msg.pending && !msg.content ? (
                      <TypingIndicator />
                    ) : (
                      <div className="select-text whitespace-pre-wrap leading-relaxed">
                        {renderMarkdown(msg.content)}
                      </div>
                    )}
                  </div>

                  {msg.activity && msg.activity.length > 0 && (
                    <ActivityLog lines={msg.activity} />
                  )}

                  <span className="text-[9px] text-on-surface-variant/40 mt-1 px-1 font-medium">
                    {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20 shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}

        {/* Suggested prompts empty state */}
        {messages.length === 1 && !streaming && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-2 mt-6"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]/60 mb-1">
              Suggested operations
            </span>
            {suggestedPrompts.map((sug, idx) => (
              <button
                key={idx}
                onClick={() => setInput(sug.text)}
                className="w-full p-3 rounded-xl border border-outline/20 bg-surface hover:bg-primary/5 hover:border-primary/45 transition-all duration-200 text-left text-xs text-primary cursor-pointer font-medium flex items-center justify-between"
              >
                <span>{sug.text}</span>
                <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 shrink-0">
                  {sug.label}
                </span>
              </button>
            ))}
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input container bar */}
      <div className="p-3 border-t border-outline/20 bg-surface shrink-0">
        <div 
          className="flex items-end gap-2 rounded-xl p-2.5 bg-surface-container border border-outline/25 transition-all focus-within:border-primary/45 focus-within:shadow-[0_2px_12px_rgba(84,26,26,0.04)]"
        >
          <button 
            type="button"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer shrink-0"
            title="Attach visual assets"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>
          
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={sandboxId ? 'Prompt assistant changes...' : 'Ready...'}
            disabled={!sandboxId || streaming}
            rows={1}
            className="flex-1 resize-none text-xs outline-none bg-transparent py-1 text-primary placeholder-outline/45 max-h-24 leading-normal"
            style={{ 
              caretColor: 'var(--color-primary)',
              fontFamily: 'inherit'
            }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
            }}
          />

          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || !sandboxId || streaming}
            className="shrink-0 w-7.5 h-7.5 rounded-lg flex items-center justify-center transition-all bg-primary text-surface hover:bg-secondary hover:text-white disabled:opacity-30 disabled:pointer-events-none shadow-[0_1px_5px_rgba(84,26,26,0.1)] cursor-pointer"
          >
            {streaming ? (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-surface/30 border-t-surface animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        <p className="text-[10px] text-[#9CA3AF]/40 text-center mt-2 select-none">
          Enter to send · Shift+Enter for newline
        </p>
      </div>

    </div>
  )
}
