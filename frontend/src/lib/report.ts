/**
 * Builds one readable report from a finished session. The results page,
 * the PDF and the JSON download all render this same structure.
 */

import { DecisionType, WorkflowSession } from '../types';

export type Dimension = 'desirability' | 'feasibility' | 'viability';

export const DIMENSIONS: { key: Dimension; label: string; question: string }[] = [
  { key: 'desirability', label: 'Desirability', question: 'Do people want it?' },
  { key: 'feasibility', label: 'Feasibility', question: 'Can we deliver it?' },
  { key: 'viability', label: 'Viability', question: 'Is it worth the cost?' },
];

export interface ScoreDetail {
  score: number;
  reasoning: string;
}

export interface ReportSignal {
  id: string;
  category: string;
  source: string;
  text: string;
}

export interface ReportOpportunity {
  id: string;
  title: string;
  description: string;
  decision: DecisionType | null;
  decisionNote: string;
  averageScore: number | null;
  scores: Record<Dimension, ScoreDetail> | null;
  sourceSignals: ReportSignal[];
  plan: Record<string, unknown> | null;
}

export interface Report {
  generatedAt: Date;
  signalCount: number;
  summary: Record<DecisionType, number>;
  opportunities: ReportOpportunity[];
}

const DECISION_ORDER: Record<DecisionType, number> = { go: 0, hold: 1, drop: 2 };

export function averageOf(scores: Record<Dimension, ScoreDetail>): number {
  return (scores.desirability.score + scores.feasibility.score + scores.viability.score) / 3;
}

export function buildReport(session: WorkflowSession): Report {
  const portfolios = (session.final_portfolio?.individual_portfolios ?? {}) as Record<string, Record<string, unknown>>;

  const opportunities: ReportOpportunity[] = session.selected_opportunity_ids.flatMap((id) => {
    const opportunity = session.opportunities.find((o) => o.id === id);
    if (!opportunity) return [];
    const assessment = session.assessments.find((a) => a.opportunity_id === id);
    const decision = session.decisions.find((d) => d.opportunity_id === id);

    const scores = assessment
      ? {
          desirability: { score: assessment.desirability_score, reasoning: assessment.desirability_reasoning },
          feasibility: { score: assessment.feasibility_score, reasoning: assessment.feasibility_reasoning },
          viability: { score: assessment.viability_score, reasoning: assessment.viability_reasoning },
        }
      : null;

    return [{
      id,
      title: opportunity.title,
      description: opportunity.description,
      decision: decision?.decision ?? null,
      decisionNote: decision?.reasoning ?? '',
      averageScore: scores ? averageOf(scores) : null,
      scores,
      sourceSignals: opportunity.source_signals.flatMap((signalId) => {
        const signal = session.signals.find((s) => s.id === signalId);
        return signal ? [{ id: signal.id, category: signal.category, source: signal.source, text: signal.content }] : [];
      }),
      plan: portfolios[id] ?? null,
    }];
  });

  opportunities.sort((a, b) => {
    const byDecision = (a.decision ? DECISION_ORDER[a.decision] : 3) - (b.decision ? DECISION_ORDER[b.decision] : 3);
    return byDecision !== 0 ? byDecision : (b.averageScore ?? 0) - (a.averageScore ?? 0);
  });

  const count = (type: DecisionType) => opportunities.filter((o) => o.decision === type).length;

  return {
    generatedAt: new Date(),
    signalCount: session.signals.length,
    summary: { go: count('go'), hold: count('hold'), drop: count('drop') },
    opportunities,
  };
}

// --- Plan sections -----------------------------------------------------------

const SECTION_LABELS: Record<string, string> = {
  executive_summary: 'Summary',
  implementation_roadmap: 'Roadmap',
  resource_requirements: 'Resources',
  success_metrics: 'Success metrics',
  risk_assessment: 'Risks',
  monitoring_plan: 'Monitoring',
};

/** Plan sections in reading order; sections the model added on its own come last. */
export function planSections(plan: Record<string, unknown>): { key: string; label: string; value: unknown }[] {
  const known = Object.keys(SECTION_LABELS).filter((key) => key in plan);
  const extra = Object.keys(plan).filter((key) => !(key in SECTION_LABELS));
  return [...known, ...extra].map((key) => ({ key, label: SECTION_LABELS[key] ?? humanize(key), value: plan[key] }));
}

const ACRONYMS: Record<string, string> = { kpi: 'KPI', kpis: 'KPIs', roi: 'ROI', hr: 'HR', it: 'IT', okrs: 'OKRs' };

/** "financial_kpis" -> "Financial KPIs", "phase_1" -> "Phase 1". */
export function humanize(key: string): string {
  return key
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (ACRONYMS[lower]) return ACRONYMS[lower];
      return index === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    })
    .join(' ');
}

/** Turns any plan value into plain text lines, for places that cannot nest (table cells). */
export function toLines(value: unknown): string[] {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) return value.flatMap(toLines);
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).map(([key, inner]) => `${humanize(key)}: ${toLines(inner).join('; ')}`);
  }
  return [String(value)];
}

// --- Downloads -----------------------------------------------------------------

export function reportFileName(report: Report, extension: 'pdf' | 'json'): string {
  return `portfolio-report-${report.generatedAt.toISOString().slice(0, 10)}.${extension}`;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Self-describing JSON: titles and scores inline, no bare opportunity IDs to look up. */
export function reportToJson(report: Report): string {
  const data = {
    report: 'Portfolio decision report',
    generated_at: report.generatedAt.toISOString(),
    how_to_read:
      'Each opportunity was scored 0-10 by the AI on desirability (do people want it?), feasibility (can we deliver it?) '
      + 'and viability (is it worth the cost?). "decision" is your go/hold/drop choice. "implementation_plan" is the '
      + 'AI-written plan, only present for go decisions.',
    signals_analyzed: report.signalCount,
    decisions: report.summary,
    opportunities: report.opportunities.map((o) => ({
      title: o.title,
      description: o.description,
      decision: o.decision,
      decision_note: o.decisionNote || null,
      average_score: o.averageScore === null ? null : Number(o.averageScore.toFixed(1)),
      scores: o.scores,
      based_on_signals: o.sourceSignals.map((s) => ({ category: s.category, source: s.source, signal: s.text })),
      implementation_plan: o.plan,
      id: o.id,
    })),
  };
  return JSON.stringify(data, null, 2);
}
