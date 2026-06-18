import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ChevronRight,
  ChevronUp,
  Upload,
  Download,
  Trash2,
  FolderPlus,
  File,
  Folder,
  ChevronLeft,
  RefreshCw,
} from 'lucide-react'
import type { SFTPFile } from '../../../types'
import './SFTPPanel.css'

interface SFTPPanelProps {
  sessionId: string
  isOpen: boolean
  onToggle: () => void
  initialPath?: string
}

export const SFTPPanel = ({
  sessionId,
  isOpen,
  onToggle,
  initialPath = '/',
}: SFTPPanelProps) => {
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [files, setFiles] = useState<SFTPFile[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFiles = useCallback(async () => {
    if (!sessionId) return

    setLoading(true)
    try {
      const fileList = await window.electronAPI.sftp.list(sessionId, currentPath)
      setFiles(fileList)
    } catch (error) {
      console.error('Failed to load files:', error)
    } finally {
      setLoading(false)
    }
  }, [sessionId, currentPath])

  useEffect(() => {
    if (isOpen && sessionId) {
      loadFiles()
    }
  }, [isOpen, sessionId, loadFiles])

  const handleFileDoubleClick = (file: SFTPFile) => {
    if (file.isDirectory) {
      const newPath = currentPath.endsWith('/')
        ? `${currentPath}${file.name}`
        : `${currentPath}/${file.name}`
      setCurrentPath(newPath)
      setSelectedFile(null)
    }
  }

  const handleFileClick = (file: SFTPFile) => {
    setSelectedFile(file.name)
  }

  const handleGoUp = () => {
    if (currentPath === '/' || currentPath === '') return

    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    const newPath = '/' + parts.join('/')
    setCurrentPath(newPath || '/')
    setSelectedFile(null)
  }

  const handleBreadcrumbClick = (index: number) => {
    const parts = currentPath.split('/').filter(Boolean)
    const newParts = parts.slice(0, index + 1)
    const newPath = '/' + newParts.join('/')
    setCurrentPath(newPath || '/')
    setSelectedFile(null)
  }

  const formatFileSize = (size: number): string => {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getBreadcrumbs = (): string[] => {
    return currentPath.split('/').filter(Boolean)
  }

  const handleUpload = async () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !sessionId) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const remotePath = currentPath.endsWith('/')
        ? `${currentPath}${file.name}`
        : `${currentPath}/${file.name}`

      try {
        const localPath = (file as any).path
        await window.electronAPI.sftp.upload(sessionId, localPath, remotePath)
      } catch (error) {
        console.error('Upload failed:', error)
      }
    }

    loadFiles()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDownload = async () => {
    if (!selectedFile || !sessionId) return

    const remotePath = currentPath.endsWith('/')
      ? `${currentPath}${selectedFile}`
      : `${currentPath}/${selectedFile}`

    try {
      const localPath = await (window as any).electronAPI.sftp.download(
        sessionId,
        remotePath,
        selectedFile
      )
      console.log('Downloaded to:', localPath)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const handleDelete = async () => {
    if (!selectedFile || !sessionId) return
    if (!confirm(`确定要删除 ${selectedFile} 吗？`)) return

    const remotePath = currentPath.endsWith('/')
      ? `${currentPath}${selectedFile}`
      : `${currentPath}/${selectedFile}`

    try {
      await window.electronAPI.sftp.delete(sessionId, remotePath)
      setSelectedFile(null)
      loadFiles()
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  const handleNewFolder = async () => {
    if (!newFolderName.trim() || !sessionId) return

    const remotePath = currentPath.endsWith('/')
      ? `${currentPath}${newFolderName.trim()}`
      : `${currentPath}/${newFolderName.trim()}`

    try {
      await window.electronAPI.sftp.mkdir(sessionId, remotePath)
      setShowNewFolderModal(false)
      setNewFolderName('')
      loadFiles()
    } catch (error) {
      console.error('Create folder failed:', error)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (!files || files.length === 0 || !sessionId) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const remotePath = currentPath.endsWith('/')
        ? `${currentPath}${file.name}`
        : `${currentPath}/${file.name}`

      try {
        const localPath = (file as any).path
        await window.electronAPI.sftp.upload(sessionId, localPath, remotePath)
      } catch (error) {
        console.error('Upload failed:', error)
      }
    }

    loadFiles()
  }

  const handleRefresh = () => {
    loadFiles()
  }

  const sortedFiles = [...files].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1
    if (!a.isDirectory && b.isDirectory) return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div className={`sftp-panel ${isOpen ? 'open' : 'closed'}`}>
      <button className="sftp-toggle-btn" onClick={onToggle} title={isOpen ? '收起' : '展开'}>
        {isOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {isOpen && (
        <div className="sftp-content">
          <div className="sftp-header">
            <span className="sftp-title">文件传输</span>
            <div className="sftp-toolbar">
              <button className="toolbar-btn" onClick={handleRefresh} title="刷新">
                <RefreshCw size={14} />
              </button>
              <button className="toolbar-btn" onClick={handleUpload} title="上传">
                <Upload size={14} />
              </button>
              <button
                className="toolbar-btn"
                onClick={handleDownload}
                disabled={!selectedFile}
                title="下载"
              >
                <Download size={14} />
              </button>
              <button
                className="toolbar-btn"
                onClick={handleDelete}
                disabled={!selectedFile}
                title="删除"
              >
                <Trash2 size={14} />
              </button>
              <button
                className="toolbar-btn"
                onClick={() => setShowNewFolderModal(true)}
                title="新建文件夹"
              >
                <FolderPlus size={14} />
              </button>
            </div>
          </div>

          <div className="sftp-breadcrumb">
            <button className="breadcrumb-btn" onClick={handleGoUp} title="上级目录">
              <ChevronUp size={14} />
            </button>
            <span className="breadcrumb-separator">/</span>
            <button
              className="breadcrumb-root"
              onClick={() => {
                setCurrentPath('/')
                setSelectedFile(null)
              }}
            >
              根目录
            </button>
            {getBreadcrumbs().map((crumb, index) => (
              <span key={index} className="breadcrumb-item">
                <span className="breadcrumb-separator">/</span>
                <button onClick={() => handleBreadcrumbClick(index)}>{crumb}</button>
              </span>
            ))}
          </div>

          <div
            className={`sftp-file-list ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {loading ? (
              <div className="sftp-loading">加载中...</div>
            ) : (
              <>
                {sortedFiles.length === 0 ? (
                  <div className="sftp-empty">目录为空</div>
                ) : (
                  sortedFiles.map((file) => (
                    <div
                      key={file.name}
                      className={`sftp-file-item ${
                        selectedFile === file.name ? 'selected' : ''
                      }`}
                      onClick={() => handleFileClick(file)}
                      onDoubleClick={() => handleFileDoubleClick(file)}
                    >
                      <span className="file-icon">
                        {file.isDirectory ? (
                          <Folder size={16} color="#dcdcaa" />
                        ) : (
                          <File size={16} color="#d4d4d4" />
                        )}
                      </span>
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">
                        {file.isDirectory ? '-' : formatFileSize(file.size)}
                      </span>
                      <span className="file-time">{formatDate(file.modifyTime)}</span>
                    </div>
                  ))
                )}
              </>
            )}

            {isDragging && (
              <div className="drag-overlay">
                <span>释放文件以上传</span>
              </div>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {showNewFolderModal && (
        <div className="modal-overlay" onClick={() => setShowNewFolderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>新建文件夹</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="文件夹名称"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNewFolder()
                if (e.key === 'Escape') setShowNewFolderModal(false)
              }}
            />
            <div className="modal-actions">
              <button onClick={() => setShowNewFolderModal(false)}>取消</button>
              <button onClick={handleNewFolder} className="primary">
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SFTPPanel
