interface StepIndicatorProps {
  step: number
  total: number
}

const FLOW_STEPS = [
  'Add alert',
  'Verify details',
  'Choose issue',
  'Review & send',
]

export function StepIndicator({ step, total }: StepIndicatorProps) {
  const steps = FLOW_STEPS.slice(0, total)
  return (
    <nav aria-label="Complaint progress" className="mb-9 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:mb-10 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Your complaint</p>
        <p className="font-mono text-xs font-medium tabular-nums text-slate-600">
          <span className="text-indigo-700">{String(step).padStart(2, '0')}</span>
          <span className="mx-1.5 text-slate-400">/</span>
          {String(total).padStart(2, '0')}
        </p>
      </div>
      <ol className="flex items-start">
        {steps.map((label, index) => {
          const number = index + 1
          const complete = number < step
          const current = number === step
          return (
            <li key={label} aria-current={current ? 'step' : undefined} className="min-w-0 flex-1">
              <div className="flex items-center">
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full border text-[11px] font-semibold transition-colors sm:size-8 ${
                    complete
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : current
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-4 ring-indigo-50'
                        : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  {String(number).padStart(2, '0')}
                </span>
                {number < steps.length && (
                  <span
                    aria-hidden="true"
                    className={`mx-1.5 h-px flex-1 sm:mx-2 ${
                      complete ? 'bg-indigo-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
              <span className={`mt-2 block pr-1 text-[10px] font-semibold leading-4 sm:text-xs ${
                current ? 'text-slate-950' : complete ? 'text-slate-600' : 'text-slate-500'
              }`}>
                {label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
