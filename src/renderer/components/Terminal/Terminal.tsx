import { useEffect, useRef, useState } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import './Terminal.css'

interface TerminalProps {
  sessionId: string
  isConnected: boolean
}

export const TerminalComponent = ({
  sessionId,
  isConnected,
}: TerminalProps) => {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!terminalRef.current) return

    const xterm = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        cursorAccent: '#1e1e1e',
        selectionBackground: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff',
      },
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      scrollback: 10000,
      allowTransparency: false,
    })

    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)

    xterm.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = xterm
    fitAddonRef.current = fitAddon
    setIsReady(true)

    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        try {
          fitAddonRef.current.fit()
          const cols = xtermRef.current.cols
          const rows = xtermRef.current.rows
          window.electronAPI.ssh.resize(sessionId, cols, rows)
        } catch (e) {
          // ignore resize errors
        }
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      xterm.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
      setIsReady(false)
    }
  }, [sessionId])

  useEffect(() => {
    if (!xtermRef.current || !isReady) return

    const disposable = xtermRef.current.onData((data) => {
      if (isConnected) {
        window.electronAPI.ssh.write(sessionId, data)
      }
    })

    return () => {
      disposable.dispose()
    }
  }, [sessionId, isConnected, isReady])

  useEffect(() => {
    if (!isReady) return

    const cleanup = window.electronAPI.ssh.onData(sessionId, (data) => {
      if (xtermRef.current) {
        xtermRef.current.write(data)
      }
    })

    return cleanup
  }, [sessionId, isReady])

  useEffect(() => {
    if (!isReady || !fitAddonRef.current || !xtermRef.current) return

    try {
      fitAddonRef.current.fit()
      const cols = xtermRef.current.cols
      const rows = xtermRef.current.rows
      if (cols > 0 && rows > 0 && isConnected) {
        window.electronAPI.ssh.resize(sessionId, cols, rows)
      }
    } catch (e) {
      // ignore
    }
  }, [isReady, sessionId, isConnected])

  useEffect(() => {
    if (!xtermRef.current) return

    if (!isConnected) {
      xtermRef.current.write('\r\n\x1b[33m[连接已断开]\x1b[0m\r\n')
    }
  }, [isConnected])

  return (
    <div className="terminal-container">
      <div className="terminal-status-bar">
        <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
        <span className="status-text">{isConnected ? '已连接' : '未连接'}</span>
        <span className="session-id">会话: {sessionId}</span>
      </div>
      <div ref={terminalRef} className="terminal-wrapper" />
    </div>
  )
}

export default TerminalComponent
