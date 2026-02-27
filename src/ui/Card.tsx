import { type PropsWithChildren } from 'react'

type CardProps = PropsWithChildren<{
  title?: string
}>

export function Card({ title, children }: CardProps) {
  return (
    <section
      style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        padding: 12,
      }}
    >
      {title ? <h2 style={{ margin: '0 0 8px 0', fontSize: 16 }}>{title}</h2> : null}
      {children}
    </section>
  )
}
