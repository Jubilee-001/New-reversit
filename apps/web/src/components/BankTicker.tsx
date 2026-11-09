const BANKS = [
  { name: 'OPay', domain: 'opayweb.com' },
  { name: 'Moniepoint', domain: 'moniepoint.com' },
  { name: 'PalmPay', domain: 'palmpay.com' },
  { name: 'Kuda', domain: 'kuda.com' },
  { name: 'GTBank', domain: 'gtbank.com' },
  { name: 'Access Bank', domain: 'accessbankplc.com' },
  { name: 'Zenith Bank', domain: 'zenithbank.com' },
  { name: 'UBA', domain: 'ubagroup.com' },
  { name: 'First Bank', domain: 'firstbankgroup.com' },
]

function LogoSet({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <div className="flex shrink-0 items-center">
      {BANKS.map((bank) => (
        <div
          key={`${bank.name}${duplicate ? '-duplicate' : ''}`}
          className="flex h-8 shrink-0 items-center justify-center px-4"
        >
          <img
            src={`https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(`https://${bank.domain}/`)}&sz=128`}
            alt={duplicate ? '' : bank.name}
            aria-hidden={duplicate ? true : undefined}
            loading="lazy"
            decoding="async"
            className="h-5 w-auto max-w-[120px] object-contain grayscale opacity-50 contrast-125 transition-all duration-300 ease-in-out hover:scale-105 hover:grayscale-0 hover:opacity-100 sm:h-6 dark:opacity-40"
          />
        </div>
      ))}
    </div>
  )
}

export function BankTicker() {
  return (
    <section aria-label="Supported banks and payment services" className="border-y border-slate-200 bg-[#F8FAFC]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="mb-6 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Supported across Nigerian banks &amp; licensed payment service banks
        </p>
        <div className="marquee-container relative overflow-hidden" aria-label="Bank and payment service logos">
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-20 bg-gradient-to-r from-[#F8FAFC] to-transparent" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-20 bg-gradient-to-l from-[#F8FAFC] to-transparent" />
          <div className="flex w-max animate-marquee motion-reduce:animate-none">
            <LogoSet />
            <LogoSet duplicate />
          </div>
        </div>
        <p className="mt-4 text-center text-[10px] text-slate-600">
          Names are examples of commonly used services, not endorsements or integrations.
        </p>
      </div>
    </section>
  )
}
