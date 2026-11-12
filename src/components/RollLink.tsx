import type { AnchorHTMLAttributes } from 'react'

/** A link whose text rolls up to an accent copy on hover. */
export default function RollLink({ children, className = '', ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a {...props} className={`roll ${className}`}>
      <span className="roll__text">{children}</span>
      <span className="roll__text" aria-hidden="true">
        {children}
      </span>
    </a>
  )
}
