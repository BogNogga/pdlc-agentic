import { useMemo, useState } from 'react';
import { ChevronDown, FileDown, FileJson, Loader2 } from 'lucide-react';
import { WorkflowSession } from '../types';
import { ReportOpportunity, buildReport, downloadBlob, reportFileName, reportToJson } from '../lib/report';
import ActionBar from './ActionBar';
import PlanView from './PlanView';
import StepHeader from './StepHeader';
import { AverageScore, DecisionChip, ScoreBars } from './Scores';

interface PlansStepProps {
  session: WorkflowSession;
  onChangeDecisions: () => void;
  onStartOver: () => void;
}

export default function PlansStep({ session, onChangeDecisions, onStartOver }: PlansStepProps) {
  const report = useMemo(() => buildReport(session), [session]);
  const goItems = report.opportunities.filter((o) => o.decision === 'go');
  const otherItems = report.opportunities.filter((o) => o.decision !== 'go');
  const [open, setOpen] = useState<string | null>(goItems[0]?.id ?? null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const downloadPdf = async () => {
    setPdfBusy(true);
    setPdfError(null);
    try {
      const { generatePdf } = await import('../lib/pdf');
      downloadBlob(generatePdf(report), reportFileName(report, 'pdf'));
    } catch (error) {
      console.error('PDF generation failed', error);
      setPdfError('The PDF could not be created. The JSON download still has all content.');
    } finally {
      setPdfBusy(false);
    }
  };

  const downloadJson = () =>
    downloadBlob(new Blob([reportToJson(report)], { type: 'application/json' }), reportFileName(report, 'json'));

  const { go, hold, drop } = report.summary;

  return (
    <>
      <StepHeader title="Your portfolio">
        {go} go, {hold} on hold and {drop} dropped.{' '}
        {go > 0 ? 'Each go decision has an implementation plan below.' : 'There are no go decisions, so no plans were written.'}
      </StepHeader>

      <section className="panel mb-8 p-5" aria-labelledby="downloads">
        <h2 id="downloads" className="font-semibold">Download the report</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <button type="button" className="btn-primary w-full sm:w-auto" onClick={downloadPdf} disabled={pdfBusy}>
              {pdfBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileDown className="h-4 w-4" aria-hidden />}
              Download PDF report
            </button>
            <p className="mt-2 text-sm text-ink-soft">
              For reading and sharing. An overview of every scored opportunity, then per go decision the scores,
              the reasoning, the signals behind it and the full plan.
            </p>
            {pdfError && <p className="mt-2 text-sm text-drop">{pdfError}</p>}
          </div>
          <div>
            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={downloadJson}>
              <FileJson className="h-4 w-4" aria-hidden />
              Download data (JSON)
            </button>
            <p className="mt-2 text-sm text-ink-soft">
              The same content as structured data, for spreadsheets or other tools. Opportunities appear by title with
              their scores, decision and plan.
            </p>
          </div>
        </div>
      </section>

      {goItems.length > 0 && (
        <section aria-labelledby="plans">
          <h2 id="plans" className="mb-3 text-lg font-semibold">Implementation plans</h2>
          <ul className="space-y-3">
            {goItems.map((o) => (
              <PlanItem key={o.id} opportunity={o} open={open === o.id} onToggle={() => setOpen(open === o.id ? null : o.id)} />
            ))}
          </ul>
        </section>
      )}

      {otherItems.length > 0 && (
        <section className="mt-8" aria-labelledby="others">
          <h2 id="others" className="mb-3 text-lg font-semibold">On hold and dropped</h2>
          <ul className="panel divide-y divide-line">
            {otherItems.map((o) => (
              <li key={o.id} className="flex gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{o.title}</span>
                    {o.decision && <DecisionChip decision={o.decision} />}
                  </div>
                  {o.decisionNote && <p className="mt-1 text-sm text-ink-soft">Note: {o.decisionNote}</p>}
                </div>
                {o.averageScore !== null && <AverageScore value={o.averageScore} />}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ActionBar status="Report ready to download">
        <button type="button" className="btn-secondary" onClick={onChangeDecisions}>Change decisions</button>
        <button type="button" className="btn-primary" onClick={onStartOver}>Start a new analysis</button>
      </ActionBar>
    </>
  );
}

function PlanItem({ opportunity: o, open, onToggle }: { opportunity: ReportOpportunity; open: boolean; onToggle: () => void }) {
  return (
    <li className="panel">
      <button type="button" className="flex w-full items-center gap-4 p-4 text-left" aria-expanded={open} onClick={onToggle}>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{o.title}</div>
          <div className="mt-1 text-sm text-ink-soft">{o.plan ? 'Plan ready' : 'No plan was returned for this opportunity'}</div>
        </div>
        {o.averageScore !== null && <AverageScore value={o.averageScore} />}
        <ChevronDown className={`h-5 w-5 shrink-0 text-ink-faint transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div className="space-y-6 border-t border-line p-4 sm:p-5">
          <p className="text-sm text-ink-soft">{o.description}</p>
          {o.scores && <ScoreBars scores={o.scores} />}
          {o.decisionNote && <p className="text-sm"><span className="font-medium">Your note:</span> {o.decisionNote}</p>}
          {o.plan && <PlanView plan={o.plan} />}
        </div>
      )}
    </li>
  );
}
