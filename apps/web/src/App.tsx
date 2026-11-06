export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <span className="text-xl font-semibold">ReverseIt</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          A debit went wrong. We help you complain, in writing.
        </h1>
        <p className="mt-4 max-w-[65ch] text-[var(--muted)]">
          ReverseIt helps you draft a formal complaint to your bank, shows the
          CBN timeline that applies, and keeps a record you can escalate with.
          It does not move money or contact the bank for you.
        </p>
        <a
          href="/start"
          className="mt-8 inline-flex min-h-11 items-center rounded-md bg-[var(--accent)] px-5 py-3 font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Start your complaint
        </a>
      </main>
      <footer className="border-t border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto max-w-3xl px-4 py-6 text-sm text-[var(--muted)]">
          ReverseIt is not a bank, not legal advice, and not affiliated with the
          CBN or any bank.
        </div>
      </footer>
    </div>
  );
}
