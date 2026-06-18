import React, { useState, useEffect } from 'react'
import { Modal } from '../Modal/Modal'
import { Button } from '../Button/Button'
import { Input } from '../Input/Input'
import { Icon } from '../Icon/Icon'
import type { ConnectionGroup } from '../../../types'
import './GroupModal.css'

export interface GroupModalProps {
  open: boolean
  group?: ConnectionGroup | null
  groups: ConnectionGroup[]
  parentGroupId?: string | null
  onClose: () => void
  onSave: (group: Omit<ConnectionGroup, 'id' | 'createdAt'>) => void
}

type GroupType = 'environment' | 'project'

export const GroupModal: React.FC<GroupModalProps> = ({
  open,
  group,
  groups,
  parentGroupId = null,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('')
  const [type, setType] = useState<GroupType>('project')
  const [parentId, setParentId] = useState<string | null>(null)

  const isEdit = !!group

  useEffect(() => {
    if (open) {
      if (group) {
        setName(group.name)
        setType(group.type)
        setParentId(group.parentId)
      } else {
        setName('')
        setType('project')
        setParentId(parentGroupId)
      }
    }
  }, [open, group, parentGroupId])

  const handleSave = () => {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      type,
      parentId: parentId || null,
    })
  }

  const renderParentOptions = () => {
    const options: JSX.Element[] = [
      <option key="" value="">
        根目录
      </option>,
    ]

    const excludedIds = new Set<string>()
    if (group) {
      const collectChildren = (parentId: string) => {
        groups
          .filter((g) => g.parentId === parentId)
          .forEach((child) => {
            excludedIds.add(child.id)
            collectChildren(child.id)
          })
      }
      excludedIds.add(group.id)
      collectChildren(group.id)
    }

    const buildOptions = (parentId: string | null, level: number) => {
      const childGroups = groups.filter(
        (g) => g.parentId === parentId && !excludedIds.has(g.id)
      )
      childGroups.forEach((g) => {
        options.push(
          <option key={g.id} value={g.id}>
            {'　'.repeat(level)}└ {g.name}
          </option>
        )
        buildOptions(g.id, level + 1)
      })
    }

    buildOptions(null, 0)
    return options
  }

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>
        取消
      </Button>
      <Button variant="primary" onClick={handleSave}>
        {isEdit ? '保存' : '创建'}
      </Button>
    </>
  )

  return (
    <Modal
      open={open}
      title={isEdit ? '编辑分组' : '新建分组'}
      width={420}
      onClose={onClose}
      footer={footer}
      className="group-modal"
    >
      <div className="group-modal__form">
        <Input
          label="分组名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="输入分组名称"
          autoFocus
        />

        <div className="group-modal__type-group">
          <label className="group-modal__type-label">分组类型</label>
          <div className="group-modal__type-options">
            <button
              type="button"
              className={`group-modal__type-btn ${type === 'project' ? 'active' : ''}`}
              onClick={() => setType('project')}
            >
              <Icon name="Folder" size={16} />
              项目
            </button>
            <button
              type="button"
              className={`group-modal__type-btn ${type === 'environment' ? 'active' : ''}`}
              onClick={() => setType('environment')}
            >
              <Icon name="Layers" size={16} />
              环境
            </button>
          </div>
        </div>

        <div className="group-modal__parent-select">
          <label className="group-modal__parent-label">上级分组</label>
          <select
            className="group-modal__select"
            value={parentId || ''}
            onChange={(e) => setParentId(e.target.value || null)}
          >
            {renderParentOptions()}
          </select>
        </div>
      </div>
    </Modal>
  )
}

export default GroupModal
