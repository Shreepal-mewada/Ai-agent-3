import { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { io } from 'socket.io-client'
import { Terminal as TermIcon, ShieldCheck, AlertCircle } from 'lucide-react'

export default function Terminal({ sandboxId, showToast }) {
  const containerRef = useRef(null)
  const termRef = useRef(null)
  const fitAddonRef = useRef(null)
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)

  const initTerminal = useCallback(() => {
    if (!containerRef.current || termRef.current) return

    const term = new XTerm({
      theme: {
        background: '#0A0D14',
        foreground: '#F3F4F6',
        cursor: '#A58B6D',
        cursorAccent: '#0A0D14',
        selectionBackground: 'rgba(165, 139, 109, 0.25)',
        black: '#121620',
        red: '#9C3D3D',
        green: '#3D5A45',
        yellow: '#8E6C3A',
        blue: '#8C4C4C',
        magenta: '#8A4A4A',
        cyan: '#A58B6D',
        white: '#F3F4F6',
        brightBlack: '#4B5563',
        brightRed: '#B85C5C',
        brightGreen: '#547A60',
        brightYellow: '#B38E50',
        brightBlue: '#D27E7B',
        brightMagenta: '#A66B6B',
        brightCyan: '#C2B09B',
        brightWhite: '#FFFFFF',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 12,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.open(containerRef.current)
    fitAddon.fit()

    termRef.current = term
    fitAddonRef.current = fitAddon

    term.writeln('\x1b[33m╔══════════════════════════════════════╗\x1b[0m')
    term.writeln('\x1b[33m║      \x1b[1mAura Agent Sandbox Shell\x1b[0m\x1b[33m        ║\x1b[0m')
    term.writeln('\x1b[33m╚══════════════════════════════════════╝\x1b[0m')
    term.writeln('')
    term.writeln('\x1b[33mEstablishing secure telemetry tunnels...\x1b[0m')

    return term
  }, [])

  const connectSocket = useCallback((term) => {
    if (!sandboxId || !term) return

    const agentHost = `http://${sandboxId}.agent.localhost`

    try {
      const socket = io(agentHost, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })

      socketRef.current = socket

      socket.on('connect', () => {
        setConnected(true)
        setError(null)
        term.writeln('\x1b[32m✓ Connected to container sandbox shell\x1b[0m')
        term.writeln('')
      })

      socket.on('disconnect', () => {
        setConnected(false)
        term.writeln('\r\n\x1b[33m⚠ Disconnected from terminal shell. Reconnecting...\x1b[0m')
      })

      socket.on('connect_error', (err) => {
        setConnected(false)
        setError('Shell connection failed')
        term.writeln(`\r\n\x1b[31m✗ Shell connection error: ${err.message}\x1b[0m`)
      })

      socket.on('terminal-output', (data) => {
        term.write(data)
      })

      term.onData((data) => {
        socket.emit('terminal-input', data)
      })

    } catch (err) {
      setError(err.message)
    }
  }, [sandboxId])

  useEffect(() => {
    const term = initTerminal()
    if (term) connectSocket(term)

    return () => {
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null }
      if (termRef.current) { termRef.current.dispose(); termRef.current = null }
    }
  }, [initTerminal, connectSocket])

  // Handle resize
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        try { fitAddonRef.current.fit() } catch (_) { }
      }
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex flex-col h-full bg-[#0A0D14]">

      {/* Terminal Toolbar */}
      <div className="flex items-center justify-between px-3 shrink-0 h-8 bg-surface border-b border-outline/15">
        <div className="flex items-center gap-1.5">
          <TermIcon className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Shell Terminal</span>
        </div>
        
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-[10px] text-error font-semibold">{error}</span>
          )}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-primary' : 'bg-error'}`} />
            <span className="text-[9px] font-bold text-on-surface-variant">
              {connected ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* xterm terminal container */}
      <div ref={containerRef} className="flex-1 overflow-hidden" />
    </div>
  )
}
