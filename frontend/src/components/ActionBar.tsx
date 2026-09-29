import { ReactNode } from 'react';

interface ActionBarProps {
  /** What the person needs to know before acting, e.g. "3 of 10 selected". */
  status: ReactNode;
  children: ReactNode;
}

/** Bar pinned to the bottom of every step that holds the next action. */
export default function ActionBar({ status, children }: ActionBarProps) {
  return (
    <>
      <div className="h-8 shrink-0" aria-hidden />
      {/* Negative inline margin stretches the bar to the viewport edges from inside the centred column. */}
      <div className="sticky bottom-0 z-10 mt-auto border-t border-line bg-white/95 backdrop-blur [margin-inline:calc(50%-50vw)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="text-sm text-ink-soft">{status}</div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">{children}</div>
        </div>
      </div>
    </>
  );
}
