import * as React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'text'
  asChild?: boolean
}

export function Button({ children, className = '', variant = 'primary', disabled, asChild, ...props }: ButtonProps) {
  const base =
    'inline-flex min-h-11 items-center justify-center rounded-md px-5 py-3 font-medium transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  const variants: Record<string, string> = {
    primary: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] focus-visible:outline-[var(--focus)]',
    secondary: 'bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] hover:bg-[#f0f1f2] focus-visible:outline-[var(--focus)]',
    danger: 'bg-[var(--danger)] text-white hover:#8f2019 focus-visible:outline-[var(--focus)]',
    text: 'text-[var(--ink)] underline underline-offset-4 hover:decoration-[var(--ink)] focus-visible:outline-[var(--focus)]',
  }
  const classes = `${base} ${variants[variant]} ${className}`.trim()
  if (asChild) {
    return (
      <span className={classes}>
        {React.Children.only(children)}
      </span>
    )
  }
  return (
    <button className={classes} disabled={disabled} {...props}>
      {children}
    </button>
  )
}
