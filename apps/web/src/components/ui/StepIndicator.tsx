interface StepIndicatorProps {
  step: number
  total: number
}

export function StepIndicator({ step, total }: StepIndicatorProps) {
  return (
    <div className="mb-8">
      <p className="text-sm text-[var(--muted)]">
        Step {step} of {total}
      </p>
    </div>
  )
}
