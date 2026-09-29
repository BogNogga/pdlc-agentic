import { useMemo, useState } from 'react';
import { DecisionType, WorkflowSession } from '../types';
import { DIMENSIONS, averageOf, buildReport } from '../lib/report';
import ActionBar from './ActionBar';
import StepHeader from './StepHeader';
import { AverageScore, DECISIONS, DecisionPicker, ScoreBars } from './Scores';

export interface DecisionInput {
  opportunity_id: string;
  decision: DecisionType;
  reasoning: string;
}

interface DecideStepProps {
  session: WorkflowSession;
  onSubmit: (decisions: DecisionInput[]) => void;
  onChangeSelection: () => void;
}

export default function DecideStep({ session, onSubmit, onChangeSelection }: DecideStepProps) {
  // Highest average first, so the strongest candidates are at the top.
  const items = useMemo(
    () => buildReport(session).opportunities
      .filter((o) => o.scores)
      .sort((a, b) => averageOf(b.scores!) - averageOf(a.scores!)),
    [session],
  );

  const [decisions, setDecisions] = useState<Record<string, DecisionType>>(() =>
    Object.fromEntries(session.decisions.map((d) => [d.opportunity_id, d.decision])));
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(session.decisions.map((d) => [d.opportunity_id, d.reasoning])));
  const [openReasons, setOpenReasons] = useState<string | null>(null);

  const decidedCount = items.filter((o) => decisions[o.id]).length;
  const goCount = items.filter((o) => decisions[o.id] === 'go').length;
  const allDecided = decidedCount === items.length;

  const setAll = (decision: DecisionType) => setDecisions(Object.fromEntries(items.map((o) => [o.id, decision])));

  const submit = () =>
    onSubmit(items.map((o) => ({ opportunity_id: o.id, decision: decisions[o.id], reasoning: notes[o.id] ?? '' })));

  return (
    <>
      <StepHeader title="Decide what goes ahead">
        Each opportunity is scored from 0 to 10.{' '}
        {DIMENSIONS.map((d, i) => (
          <span key={d.key}>
            <span className="font-medium text-ink">{d.label}</span>: {d.question.toLowerCase()}{i < DIMENSIONS.length - 1 ? ' ' : ''}
          </span>
        ))}
      </StepHeader>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-ink-soft">Sorted by average score, highest first</span>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-ink-soft">Set all to</span>
          {DECISIONS.map((d) => (
            <button key={d.key} type="button" className="btn-ghost" onClick={() => setAll(d.key)}>{d.label}</button>
          ))}
        </div>
      </div>

      <ul className="space-y-3">
        {items.map((o) => {
          const showReasons = openReasons === o.id;
          return (
            <li key={o.id} className="panel p-4 sm:p-5">
              <div className="flex gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{o.title}</h2>
                  <p className="mt-1 text-sm text-ink-soft">{o.description}</p>
                </div>
                <AverageScore value={o.averageScore!} />
              </div>

              <div className="mt-4">
                <ScoreBars scores={o.scores!} />
              </div>

              <button
                type="button"
                className="mt-3 text-sm text-route hover:underline"
                aria-expanded={showReasons}
                onClick={() => setOpenReasons(showReasons ? null : o.id)}
              >
                {showReasons ? 'Hide' : 'Why'} these scores
              </button>
              {showReasons && (
                <dl className="mt-2 space-y-2 rounded-md bg-paper p-3 text-sm">
                  {DIMENSIONS.map((d) => (
                    <div key={d.key}>
                      <dt className="font-medium">{d.label} {o.scores![d.key].score.toFixed(1)}</dt>
                      <dd className="text-ink-soft">{o.scores![d.key].reasoning}</dd>
                    </div>
                  ))}
                </dl>
              )}

              <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center">
                <DecisionPicker
                  name={o.title}
                  value={decisions[o.id]}
                  onChange={(decision) => setDecisions((prev) => ({ ...prev, [o.id]: decision }))}
                />
                {decisions[o.id] && (
                  <label className="flex-1">
                    <span className="sr-only">Note for {o.title}</span>
                    <input
                      type="text"
                      value={notes[o.id] ?? ''}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [o.id]: e.target.value }))}
                      placeholder="Add a note for the report (optional)"
                      className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-route focus:outline-none"
                    />
                  </label>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <ActionBar
        status={
          <span>
            <span className="font-semibold tabular-nums text-ink">{decidedCount}</span> of {items.length} decided
            {allDecided && goCount === 0 && '. No go decisions, so no plans will be written.'}
          </span>
        }
      >
        <button type="button" className="btn-secondary" onClick={onChangeSelection}>Change selection</button>
        <button type="button" className="btn-primary" onClick={submit} disabled={!allDecided}>
          {!allDecided
            ? 'Write plans'
            : goCount > 0
              ? `Write plans for ${goCount} go ${goCount === 1 ? 'decision' : 'decisions'}`
              : 'Finish without plans'}
        </button>
      </ActionBar>
    </>
  );
}
