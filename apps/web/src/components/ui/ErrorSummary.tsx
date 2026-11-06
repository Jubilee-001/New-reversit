interface ErrorSummaryProps {
  errors: { field: string; message: string }[]
  onFieldLink?: (field: string) => void
}

export function ErrorSummary({ errors, onFieldLink }: ErrorSummaryProps) {
  if (errors.length === 0) return null
  return (
    <div className="rounded-md border border-[var(--line)] bg-[#fbeeec] p-4">
      <h2 className="font-semibold text-[var(--danger)]">There is a problem</h2>
      <ul className="mt-2 list-disc list-inside text-sm text-[var(--ink)] space-y-1">
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
