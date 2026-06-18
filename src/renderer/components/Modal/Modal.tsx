import React, { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import classNames from 'classnames'
import { Icon } from '../Icon/Icon'
import './Modal.css'

export interface ModalProps {
  open: boolean
  title?: string
  width?: number | string
  closable?: boolean
  maskClosable?: boolean
  onClose?: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  width = 520,
  closable = true,
  maskClosable = true,
  onClose,
  children,
  footer,
  className,
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  const handleMaskClick = () => {
    if (maskClosable && onClose) {
      onClose()
    }
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    }
  }

  if (!open) return null

  const modalContent = (
    <div className="modal-overlay" onClick={handleMaskClick}>
      <div
        className={classNames('modal', className)}
        style={{ width: typeof width === 'number' ? `${width}px` : width }}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || closable) && (
          <div className="modal__header">
            {title && <h3 className="modal__title">{title}</h3>}
            {closable && (
              <button className="modal__close" onClick={handleClose}>
                <Icon name="X" size={18} />
              </button>
            )}
          </div>
        )}
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default Modal
