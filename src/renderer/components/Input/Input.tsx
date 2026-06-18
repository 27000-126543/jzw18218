import React, { forwardRef } from 'react'
import classNames from 'classnames'
import './Input.css'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  size?: 'sm' | 'md' | 'lg'
  prefixIcon?: React.ReactNode
  suffixIcon?: React.ReactNode
  wrapperClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, size = 'md', prefixIcon, suffixIcon, wrapperClassName, className, disabled, ...props }, ref) => {
    const wrapperClasses = classNames('input-wrapper', `input-wrapper--${size}`, wrapperClassName, {
      'input-wrapper--error': !!error,
      'input-wrapper--disabled': disabled,
    })

    const inputClasses = classNames('input', className)

    return (
      <div className={wrapperClasses}>
        {label && <label className="input__label">{label}</label>}
        <div className="input__container">
          {prefixIcon && <span className="input__icon input__icon--prefix">{prefixIcon}</span>}
          <input ref={ref} className={inputClasses} disabled={disabled} {...props} />
          {suffixIcon && <span className="input__icon input__icon--suffix">{suffixIcon}</span>}
        </div>
        {error && <span className="input__error">{error}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
