import { Check } from 'lucide-react';

export type Stage = 'signals' | 'opportunities' | 'assessment' | 'plans';

export const STAGES: { key: Stage; label: string; task: string }[] = [
  { key: 'signals', label: 'Signals', task: 'Review the input' },
  { key: 'opportunities', label: 'Opportunities', task: 'Pick up to 10' },
  { key: 'assessment', label: 'Assessment', task: 'Decide go, hold or drop' },
  { key: 'plans', label: 'Plans', task: 'Read and download' },
];

export const stageIndex = (stage: Stage) => STAGES.findIndex((s) => s.key === stage);

export function formatElapsed(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

interface StepperProps {
  current: Stage;
  /** Furthest stage the session has data for; earlier stages can be revisited. */
  reached: Stage;
  working: boolean;
  elapsed: number;
  onSelect: (stage: Stage) => void;
}

export default function Stepper({ current, reached, working, elapsed, onSelect }: StepperProps) {
  const currentIndex = stageIndex(current);
  const reachedIndex = stageIndex(reached);

  return (
    <nav aria-label="Progress">
      <p className="mb-3 text-sm text-ink-soft sm:hidden">
        Step {currentIndex + 1} of {STAGES.length}: <span className="font-medium text-ink">{STAGES[currentIndex].label}</span>
      </p>
      <ol className="flex items-start">
        {STAGES.map((stage, index) => {
          const done = index < currentIndex || (index <= reachedIndex && index !== currentIndex);
          const isCurrent = index === currentIndex;
          const canOpen = !working && !isCurrent && index <= reachedIndex;
          const status = isCurrent ? (working ? `AI working, ${formatElapsed(elapsed)}` : 'Your turn') : stage.task;

          const station = (
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                isCurrent
                  ? 'border-route bg-white text-route'
                  : done
                    ? 'border-route bg-route text-white'
                    : 'border-line bg-white text-ink-faint'
              }`}
            >
              {done && !isCurrent ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
              {isCurrent && working && (
                <span className="absolute inset-0 rounded-full border-2 border-route motion-safe:animate-ping" aria-hidden />
              )}
            </span>
          );

          const label = (
            <span className="mt-2 hidden min-w-0 flex-col sm:flex">
              <span className={`text-sm font-semibold ${isCurrent || done ? 'text-ink' : 'text-ink-faint'}`}>{stage.label}</span>
              <span className={`text-xs ${isCurrent ? 'text-route' : 'text-ink-faint'}`}>{status}</span>
            </span>
          );

          return (
            <li key={stage.key} className="relative flex flex-1 flex-col last:flex-none sm:last:w-40">
              <div className="flex items-center">
                {canOpen ? (
                  <button
                    type="button"
                    onClick={() => onSelect(stage.key)}
                    className="relative rounded-full"
                    title={`Back to ${stage.label.toLowerCase()}`}
                  >
                    {station}
                  </button>
                ) : (
                  <span className="relative" aria-current={isCurrent ? 'step' : undefined}>{station}</span>
                )}
                {index < STAGES.length - 1 && (
                  <span className={`mx-2 h-0.5 flex-1 rounded ${index < reachedIndex ? 'bg-route' : 'bg-line'}`} aria-hidden />
                )}
              </div>
              {canOpen ? (
                <button type="button" onClick={() => onSelect(stage.key)} className="text-left">{label}</button>
              ) : (
                label
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
