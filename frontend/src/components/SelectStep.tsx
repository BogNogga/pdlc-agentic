import { useState } from 'react';
import { Check } from 'lucide-react';
import { WorkflowSession } from '../types';
import ActionBar from './ActionBar';
import StepHeader from './StepHeader';

const MAX_SELECTED = 10;

interface SelectStepProps {
  session: WorkflowSession;
  onScore: (ids: string[]) => void;
  onRegenerate: () => void;
}

export default function SelectStep({ session, onScore, onRegenerate }: SelectStepProps) {
  const [selected, setSelected] = useState<string[]>(session.selected_opportunity_ids);
  const [openSignals, setOpenSignals] = useState<string | null>(null);
  const full = selected.length >= MAX_SELECTED;

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : full ? prev : [...prev, id]));

  const allIds = session.opportunities.slice(0, MAX_SELECTED).map((o) => o.id);

  return (
    <>
      <StepHeader title="Pick the opportunities worth scoring">
        The AI proposed {session.opportunities.length} opportunities from your signals. Select up to {MAX_SELECTED}.
        Each selected opportunity gets a score for desirability, feasibility and viability.
      </StepHeader>

      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-ink-soft">{session.opportunities.length} opportunities</span>
        <div className="flex gap-1">
          <button type="button" className="btn-ghost" onClick={() => setSelected(allIds)}>Select all</button>
          <button type="button" className="btn-ghost" onClick={() => setSelected([])} disabled={selected.length === 0}>Clear</button>
        </div>
      </div>

      <ul className="space-y-3">
        {session.opportunities.map((opportunity) => {
          const isSelected = selected.includes(opportunity.id);
          const disabled = !isSelected && full;
          const signals = opportunity.source_signals
            .map((id) => session.signals.find((s) => s.id === id))
            .filter((s): s is NonNullable<typeof s> => Boolean(s));
          const showSignals = openSignals === opportunity.id;

          return (
            <li
              key={opportunity.id}
              className={`panel transition-colors ${isSelected ? 'border-route ring-1 ring-route' : ''} ${disabled ? 'opacity-50' : ''}`}
            >
              <label className={`flex gap-4 p-4 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => toggle(opportunity.id)}
                />
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-route peer-focus-visible:ring-offset-2 ${
                    isSelected ? 'border-route bg-route text-white' : 'border-line bg-white'
                  }`}
                  aria-hidden
                >
                  {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{opportunity.title}</span>
                  <span className="mt-1 block text-sm text-ink-soft">{opportunity.description}</span>
                </span>
              </label>

              {signals.length > 0 && (
                <div className="border-t border-line px-4 py-2 pl-[3.25rem]">
                  <button
                    type="button"
                    className="text-sm text-route hover:underline"
                    aria-expanded={showSignals}
                    onClick={() => setOpenSignals(showSignals ? null : opportunity.id)}
                  >
                    {showSignals ? 'Hide' : 'Show'} the {signals.length} {signals.length === 1 ? 'signal' : 'signals'} behind this
                  </button>
                  {showSignals && (
                    <ul className="mt-2 space-y-1.5 pb-1 text-sm text-ink-soft">
                      {signals.map((s) => (
                        <li key={s.id}>
                          {s.content} <span className="text-ink-faint">({s.category})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <ActionBar
        status={
          <span>
            <span className="font-semibold tabular-nums text-ink">{selected.length}</span> of {MAX_SELECTED} selected
            {full && ', the maximum'}
          </span>
        }
      >
        <button type="button" className="btn-secondary" onClick={onRegenerate}>Generate new opportunities</button>
        <button type="button" className="btn-primary" onClick={() => onScore(selected)} disabled={selected.length === 0}>
          Score {selected.length || ''} {selected.length === 1 ? 'opportunity' : 'opportunities'}
        </button>
      </ActionBar>
    </>
  );
}
