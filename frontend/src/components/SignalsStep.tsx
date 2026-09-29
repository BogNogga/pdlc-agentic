import { useMemo, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { Signal } from '../types';
import ActionBar from './ActionBar';
import StepHeader from './StepHeader';

interface SignalsStepProps {
  signals: Signal[];
  aiAvailable: boolean;
  onGenerate: () => void;
}

export default function SignalsStep({ signals, aiAvailable, onGenerate }: SignalsStepProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    signals.forEach((s) => counts.set(s.category, (counts.get(s.category) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [signals]);

  const visible = signals.filter((s) => {
    const text = `${s.content} ${s.category} ${s.source}`.toLowerCase();
    return (!category || s.category === category) && (!query || text.includes(query.toLowerCase()));
  });

  return (
    <>
      <StepHeader title="Review the signals">
        {signals.length} signals are loaded from <code className="rounded bg-white px-1 text-sm">data/signals.csv</code>.
        The AI reads all of them and proposes up to 10 opportunities worth acting on.
      </StepHeader>

      {signals.length === 0 ? (
        <div className="panel p-6 text-ink-soft">
          No signals found. Add rows to <code>data/signals.csv</code> with the columns content, category and source, then reload.
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Search signals</span>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search signals"
                className="w-full rounded-md border border-line py-2 pl-9 pr-3 text-sm focus:border-route focus:outline-none"
              />
            </label>
            <label>
              <span className="sr-only">Filter by category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-route focus:outline-none sm:w-56"
              >
                <option value="">All categories ({signals.length})</option>
                {categories.map(([name, count]) => (
                  <option key={name} value={name}>{name} ({count})</option>
                ))}
              </select>
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-ink-soft">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Signal</th>
                  <th scope="col" className="hidden px-4 py-2 font-medium md:table-cell">Category</th>
                  <th scope="col" className="hidden px-4 py-2 font-medium lg:table-cell">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((s) => (
                  <tr key={s.id} className="align-top">
                    <td className="px-4 py-3">
                      {s.content}
                      <div className="mt-1 text-xs text-ink-faint md:hidden">{s.category}, {s.source}</div>
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-ink-soft md:table-cell">{s.category}</td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-ink-soft lg:table-cell">{s.source}</td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-ink-soft">No signals match this search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ActionBar
        status={aiAvailable ? `${signals.length} signals ready for analysis` : 'The AI is not connected. Set OPENROUTER_API_KEY on the backend.'}
      >
        <button type="button" className="btn-primary" onClick={onGenerate} disabled={!aiAvailable || signals.length === 0}>
          <Sparkles className="h-4 w-4" aria-hidden />
          Generate opportunities
        </button>
      </ActionBar>
    </>
  );
}
