import { type ButtonHTMLAttributes, type PropsWithChildren } from 'react'

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>

export function Button({ children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      style={{
        border: 'none',
        borderRadius: 8,
        padding: '8px 12px',
        fontWeight: 600,
        background: '#0f172a',
        color: '#ffffff',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
