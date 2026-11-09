import * as React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'text'
  asChild?: boolean
}

export function Button({ children, className = '', variant = 'primary', disabled, asChild, ...props }: ButtonProps) {
  const base =
    'inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:pointer-events-none disabled:opacity-50 active:translate-y-px'
  const variants: Record<string, string> = {
    primary: 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/10 hover:bg-indigo-700 hover:shadow-md',
    secondary: 'border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50',
    danger: 'bg-rose-700 text-white shadow-sm hover:bg-rose-800',
    text: 'px-2 text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:text-indigo-900 hover:decoration-indigo-700',
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
