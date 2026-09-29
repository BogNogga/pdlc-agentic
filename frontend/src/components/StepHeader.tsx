import { ReactNode } from 'react';

/** Title that says what to do on this step, plus one line of context. */
export default function StepHeader({ title, children }: { title: string; children: ReactNode }) {
  return (
    <header className="mb-6 max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">{title}</h1>
      <p className="mt-2 text-ink-soft">{children}</p>
    </header>
  );
}
