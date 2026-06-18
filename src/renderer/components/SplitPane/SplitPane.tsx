import { useState, useRef, useCallback, useEffect, ReactNode } from 'react'
import './SplitPane.css'

interface SplitPaneProps {
  leftPane: ReactNode
  rightPane: ReactNode
  initialLeftWidth?: number
  minLeftWidth?: number
  minRightWidth?: number
  className?: string
}

export const SplitPane = ({
  leftPane,
  rightPane,
  initialLeftWidth = 70,
  minLeftWidth = 30,
  minRightWidth = 200,
  className = '',
}: SplitPaneProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth)
  const [isDragging, setIsDragging] = useState(false)
  const isDraggingRef = useRef(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    isDraggingRef.current = true
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return

      const container = containerRef.current
      const containerRect = container.getBoundingClientRect()
      const containerWidth = containerRect.width
      const mouseX = e.clientX - containerRect.left

      const leftWidthPercent = (mouseX / containerWidth) * 100

      const minLeftPercent = minLeftWidth
      const minRightPercent = (minRightWidth / containerWidth) * 100
      const maxLeftPercent = 100 - minRightPercent

      const clampedWidth = Math.max(
        minLeftPercent,
        Math.min(leftWidthPercent, maxLeftPercent)
      )

      setLeftWidth(clampedWidth)
    },
    [minLeftWidth, minRightWidth]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    isDraggingRef.current = false
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div ref={containerRef} className={`split-pane ${className}`}>
      <div
        className="split-pane-left"
        style={{ width: `${leftWidth}%` }}
      >
        {leftPane}
      </div>
      <div
        className={`split-pane-divider ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <div className="divider-handle">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      <div
        className="split-pane-right"
        style={{ width: `${100 - leftWidth}%` }}
      >
        {rightPane}
      </div>
    </div>
  )
}

export default SplitPane
