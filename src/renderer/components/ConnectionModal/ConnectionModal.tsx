import React, { useState, useEffect } from 'react'
import { Modal } from '../Modal/Modal'
import { Button } from '../Button/Button'
import { Input } from '../Input/Input'
import { Icon } from '../Icon/Icon'
import type { SSHConnection, ConnectionGroup } from '../../../types'
import './ConnectionModal.css'

export interface ConnectionModalProps {
  open: boolean
  connection?: SSHConnection | null
  groups: ConnectionGroup[]
  onClose: () => void
  onSave: (connection: Omit<SSHConnection, 'id' | 'createdAt' | 'updatedAt'>) => void
  onTest?: (connection: Omit<SSHConnection, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>
}

type AuthType = 'password' | 'privateKey'

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  open,
  connection,
  groups,
  onClose,
  onSave,
  onTest,
}) => {
  const [name, setName] = useState('')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('22')
  const [username, setUsername] = useState('')
  const [authType, setAuthType] = useState<AuthType>('password')
  const [password, setPassword] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [groupId, setGroupId] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)

  const isEdit = !!connection

  useEffect(() => {
    if (open) {
      if (connection) {
        setName(connection.name)
        setHost(connection.host)
        setPort(String(connection.port))
        setUsername(connection.username)
        setAuthType(connection.authType)
        setPassword(connection.password || '')
        setPrivateKey(connection.privateKey || '')
        setPassphrase(connection.passphrase || '')
        setGroupId(connection.groupId || '')
      } else {
        setName('')
        setHost('')
        setPort('22')
        setUsername('')
        setAuthType('password')
        setPassword('')
        setPrivateKey('')
        setPassphrase('')
        setGroupId('')
      }
      setTestResult(null)
    }
  }, [open, connection])

  const getConnectionData = () => ({
    name,
    host,
    port: parseInt(port, 10) || 22,
    username,
    authType,
    password: authType === 'password' ? password : undefined,
    privateKey: authType === 'privateKey' ? privateKey : undefined,
    passphrase: authType === 'privateKey' ? passphrase || undefined : undefined,
    groupId: groupId || '',
  })

  const handleSave = () => {
    if (!name || !host || !username) return
    onSave(getConnectionData())
  }

  const handleTest = async () => {
    if (!onTest || !host || !username) return
    setTesting(true)
    setTestResult(null)
    try {
      const success = await onTest(getConnectionData())
      setTestResult(success ? 'success' : 'error')
    } catch {
      setTestResult('error')
    } finally {
      setTesting(false)
    }
  }

  const handleSelectKeyFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept='.pem,.key,.*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          setPrivateKey(event.target?.result as string)
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const renderGroupOptions = () => {
    const options: JSX.Element[] = [
      <option key="" value="">
        未分组
      </option>,
    ]

    const buildOptions = (parentId: string | null, level: number) => {
      const childGroups = groups.filter((g) => g.parentId === parentId)
      childGroups.forEach((group) => {
        options.push(
          <option key={group.id} value={group.id}>
            {'　'.repeat(level)}└ {group.name}
          </option>
        )
        buildOptions(group.id, level + 1)
      })
    }

    buildOptions(null, 0)
    return options
  }

  const footer = (
    <>
      <div className="connection-modal__test-result">
        {testResult === 'success' && (
          <span className="connection-modal__test-success">
            <Icon name="CheckCircle" size={14} />
            连接成功
          </span>
        )}
        {testResult === 'error' && (
          <span className="connection-modal__test-error">
            <Icon name="XCircle" size={14} />
            连接失败
          </span>
        )}
      </div>
      <Button variant="ghost" onClick={onClose}>
        取消
      </Button>
      <Button variant="secondary" onClick={handleTest} loading={testing}>
        <Icon name="Zap" size={14} />
        测试连接
      </Button>
      <Button variant="primary" onClick={handleSave}>
        {isEdit ? '保存' : '创建'}
      </Button>
    </>
  )

  return (
    <Modal
      open={open}
      title={isEdit ? '编辑连接' : '新建连接'}
      width={560}
      onClose={onClose}
      footer={footer}
      className="connection-modal"
    >
      <div className="connection-modal__form">
        <Input
          label="连接名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="输入连接名称"
        />

        <div className="connection-modal__row">
          <Input
            label="主机地址"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="192.168.1.1"
            wrapperClassName="connection-modal__flex-1"
          />
          <Input
            label="端口"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="22"
            wrapperClassName="connection-modal__port-input"
          />
        </div>

        <Input
          label="用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="root"
        />

        <div className="connection-modal__auth-tabs">
          <button
            type="button"
            className={`connection-modal__auth-tab ${authType === 'password' ? 'active' : ''}`}
            onClick={() => setAuthType('password')}
          >
            密码认证
          </button>
          <button
            type="button"
            className={`connection-modal__auth-tab ${authType === 'privateKey' ? 'active' : ''}`}
            onClick={() => setAuthType('privateKey')}
          >
            私钥认证
          </button>
        </div>

        {authType === 'password' && (
          <Input
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入密码"
          />
        )}

        {authType === 'privateKey' && (
          <>
            <div className="connection-modal__key-section">
              <label className="connection-modal__key-label">私钥内容</label>
              <div className="connection-modal__key-actions">
                <Button size="sm" variant="ghost" onClick={handleSelectKeyFile}>
                  <Icon name="FileUp" size={14} />
                  选择文件
                </Button>
              </div>
            </div>
            <textarea
              className="connection-modal__key-textarea"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="粘贴私钥内容或选择私钥文件..."
              rows={6}
            />
            <Input
              label="私钥密码（可选）"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="如果私钥有密码请填写"
            />
          </>
        )}

        <div className="connection-modal__group-select">
          <label className="connection-modal__group-label">所属分组</label>
          <select
            className="connection-modal__select"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            {renderGroupOptions()}
          </select>
        </div>
      </div>
    </Modal>
  )
}

export default ConnectionModal
