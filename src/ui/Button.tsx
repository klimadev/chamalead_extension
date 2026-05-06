import { type ButtonHTMLAttributes, type PropsWithChildren } from 'react'

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>

export function Button({ children, className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      {...rest}
      className={`button ${className ?? ''}`.trim()}
    >
      {children}
    </button>
  )
}
