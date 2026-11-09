interface ErrorSummaryProps {
  errors: { field: string; message: string }[]
  onFieldLink?: (field: string) => void
}

export function ErrorSummary({ errors, onFieldLink }: ErrorSummaryProps) {
  if (errors.length === 0) return null
  return (
    <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4" role="alert">
      <h2 className="font-semibold text-rose-900">There is a problem</h2>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-rose-900">
        {errors.map(({ field, message }, i) => (
          <li key={i}>
            {onFieldLink ? (
              <button
                type="button"
                className="text-[var(--accent)] underline underline-offset-4 hover:decoration-[var(--accent)] p-0 m-0 min-h-[auto] bg-none border-none font-normal"
                onClick={() => onFieldLink(field)}
              >
                {message}
              </button>
            ) : (
              message
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
