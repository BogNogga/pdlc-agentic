import { humanize, planSections } from '../lib/report';

/** Renders any plan value: text as a paragraph, lists as bullets, objects as labelled groups. */
function PlanValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return null;
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc space-y-1 pl-5 marker:text-ink-faint">
        {value.map((item, index) => (
          <li key={index}>{typeof item === 'object' ? <PlanValue value={item} /> : String(item)}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === 'object') {
    return (
      <dl className="space-y-3">
        {Object.entries(value as Record<string, unknown>).map(([key, inner]) => (
          <div key={key}>
            <dt className="font-medium text-ink">{humanize(key)}</dt>
            <dd className="mt-0.5 text-ink-soft"><PlanValue value={inner} /></dd>
          </div>
        ))}
      </dl>
    );
  }
  return <p>{String(value)}</p>;
}

/** Roadmap phases as columns, each with its timeline on top. */
function Roadmap({ value }: { value: unknown }) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return <PlanValue value={value} />;
  const phases = Object.entries(value as Record<string, unknown>);
  return (
    <ol className="grid gap-3 md:grid-cols-3">
      {phases.map(([name, phase]) => {
        const { timeline, ...details } = (phase && typeof phase === 'object' ? phase : { detail: phase }) as Record<string, unknown>;
        return (
          <li key={name} className="rounded-md border border-line p-3">
            <div className="font-semibold text-ink">{humanize(name)}</div>
            {timeline ? <div className="text-xs font-medium text-route">{String(timeline)}</div> : null}
            <div className="mt-2 text-ink-soft"><PlanValue value={details} /></div>
          </li>
        );
      })}
    </ol>
  );
}

export default function PlanView({ plan }: { plan: Record<string, unknown> }) {
  return (
    <div className="space-y-6 text-sm">
      {planSections(plan).map((section) => (
        <section key={section.key}>
          <h3 className="mb-2 text-base font-semibold text-ink">{section.label}</h3>
          <div className="text-ink-soft">
            {section.key === 'implementation_roadmap' ? <Roadmap value={section.value} /> : <PlanValue value={section.value} />}
          </div>
        </section>
      ))}
    </div>
  );
}
