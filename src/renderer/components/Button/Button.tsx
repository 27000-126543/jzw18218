import React from 'react'
import classNames from 'classnames'
import { Icon } from '../Icon/Icon'
import './Button.css'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  block?: boolean
  loading?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  block = false,
  loading = false,
  className,
  children,
  disabled,
  ...props
}) => {
  const isDisabled = disabled || loading

  const classes = classNames(
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    {
      'btn--block': block,
      'btn--disabled': isDisabled,
      'btn--loading': loading,
    },
    className
  )

  return (
    <button className={classes} disabled={isDisabled} {...props}>
      {loading && (
        <span className="btn__loading">
          <Icon name="Loader2" size={16} className="btn__spinner" />
        </span>
      )}
      {!loading && icon && iconPosition === 'left' && <span className="btn__icon">{icon}</span>}
      {children && <span className="btn__text">{children}</span>}
      {!loading && icon && iconPosition === 'right' && <span className="btn__icon">{icon}</span>}
    </button>
  )
}

export default Button
