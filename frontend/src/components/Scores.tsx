import { DecisionType } from '../types';
import { DIMENSIONS, Dimension, ScoreDetail } from '../lib/report';

export const DECISIONS: { key: DecisionType; label: string; meaning: string }[] = [
  { key: 'go', label: 'Go', meaning: 'Implement' },
  { key: 'hold', label: 'Hold', meaning: 'Revisit later' },
  { key: 'drop', label: 'Drop', meaning: 'Reject' },
];

const DECISION_STYLES: Record<DecisionType, { dot: string; chip: string; active: string }> = {
  go: { dot: 'bg-go', chip: 'bg-go-soft text-go', active: 'border-go bg-go-soft text-go' },
  hold: { dot: 'bg-hold', chip: 'bg-hold-soft text-hold', active: 'border-hold bg-hold-soft text-hold' },
  drop: { dot: 'bg-drop', chip: 'bg-drop-soft text-drop', active: 'border-drop bg-drop-soft text-drop' },
};

export function DecisionChip({ decision }: { decision: DecisionType }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${DECISION_STYLES[decision].chip}`}>
      <span className={`h-2 w-2 rounded-full ${DECISION_STYLES[decision].dot}`} aria-hidden />
      {DECISIONS.find((d) => d.key === decision)?.label}
    </span>
  );
}

/** Go / hold / drop as one segmented control. */
export function DecisionPicker({
  value,
  onChange,
  name,
}: {
  value: DecisionType | undefined;
  onChange: (decision: DecisionType) => void;
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={`Decision for ${name}`} className="inline-flex rounded-md border border-line bg-white p-0.5">
      {DECISIONS.map((d) => {
        const active = value === d.key;
        return (
          <button
            key={d.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(d.key)}
            title={d.meaning}
            className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? DECISION_STYLES[d.key].active : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${active ? DECISION_STYLES[d.key].dot : 'bg-line'}`} aria-hidden />
            {d.label}
          </button>
        );
      })}
    </div>
  );
}

/** Three 0-10 scores as labelled bars. */
export function ScoreBars({ scores }: { scores: Record<Dimension, ScoreDetail> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {DIMENSIONS.map((d) => (
        <div key={d.key}>
          <div className="flex items-baseline justify-between text-sm">
            <dt className="text-ink-soft" title={d.question}>{d.label}</dt>
            <dd className="font-semibold tabular-nums">{scores[d.key].score.toFixed(1)}</dd>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-paper" aria-hidden>
            <div className="h-1.5 rounded-full bg-route" style={{ width: `${scores[d.key].score * 10}%` }} />
          </div>
        </div>
      ))}
    </dl>
  );
}

export function AverageScore({ value }: { value: number }) {
  return (
    <div className="shrink-0 text-right">
      <div className="text-2xl font-semibold tabular-nums leading-none">{value.toFixed(1)}</div>
      <div className="mt-1 text-xs text-ink-faint">average / 10</div>
    </div>
  );
}
