import { type PropsWithChildren } from 'react'

type CardProps = PropsWithChildren<{
  title?: string
  className?: string
}>

export function Card({ title, className, children }: CardProps) {
  return (
    <section className={`card ${className ?? ''}`.trim()}>
      {title ? <h2 className="card-title">{title}</h2> : null}
      {children}
    </section>
  )
}
