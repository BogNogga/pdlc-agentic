import { Loader2 } from 'lucide-react';
import { formatElapsed } from './Stepper';

interface WorkingPanelProps {
  title: string;
  detail: string;
  expected: string;
  elapsed: number;
}

/** Shown while the backend waits on the AI. No fake sub-steps: just what runs and for how long. */
export default function WorkingPanel({ title, detail, expected, elapsed }: WorkingPanelProps) {
  return (
    <div className="panel mx-auto mt-6 flex max-w-xl items-start gap-4 p-6" role="status" aria-live="polite">
      <Loader2 className="mt-0.5 h-6 w-6 shrink-0 animate-spin text-route" aria-hidden />
      <div className="min-w-0">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-ink-soft">{detail}</p>
        <p className="mt-4 text-sm text-ink-faint">
          <span className="font-medium tabular-nums text-ink">{formatElapsed(elapsed)}</span> elapsed. {expected}
        </p>
      </div>
    </div>
  );
}
