/**
 * Renders a Report as an A4 PDF. Loaded on demand (dynamic import) so jsPDF
 * stays out of the main bundle.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DecisionType } from '../types';
import { DIMENSIONS, Report, ReportOpportunity, humanize, planSections, toLines } from './report';

type RGB = [number, number, number];

const INK: RGB = [23, 33, 43];
const SOFT: RGB = [74, 86, 100];
const LINE: RGB = [220, 225, 231];
const ROUTE: RGB = [31, 94, 140];
const DECISION_COLORS: Record<DecisionType, RGB> = { go: [30, 122, 70], hold: [168, 106, 18], drop: [180, 35, 24] };

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM = PAGE_HEIGHT - MARGIN - 6; // leave room for the footer

const PT_TO_MM = 0.3528;

/**
 * The built-in PDF fonts only cover Latin-1 (plus a few extras such as the euro sign),
 * so swap common typographic characters for plain equivalents and drop the rest.
 */
function clean(text: string): string {
  return text
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/[→⇒]/g, '->')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/×/g, 'x')
    .replace(/[   ]/g, ' ')
    .replace(/[^\x00-\xFF€•]/g, '');
}

class PdfWriter {
  doc = new jsPDF({ unit: 'mm', format: 'a4' });
  y = MARGIN;

  ensureSpace(height: number) {
    if (this.y + height > BOTTOM) this.newPage();
  }

  newPage() {
    this.doc.addPage();
    this.y = MARGIN;
  }

  gap(mm: number) {
    this.y += mm;
  }

  text(value: string, options: { size?: number; bold?: boolean; color?: RGB; indent?: number; after?: number } = {}) {
    const { size = 10, bold = false, color = INK, indent = 0, after = 1.5 } = options;
    const lineHeight = size * PT_TO_MM * 1.4;
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
    this.doc.setFontSize(size);
    this.doc.setTextColor(...color);
    const lines = this.doc.splitTextToSize(clean(value), CONTENT_WIDTH - indent) as string[];
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      this.doc.text(line, MARGIN + indent, this.y + size * PT_TO_MM);
      this.y += lineHeight;
    }
    this.y += after;
  }

  heading(value: string, level: 1 | 2 | 3) {
    const size = { 1: 16, 2: 12.5, 3: 10.5 }[level];
    this.ensureSpace(size * PT_TO_MM * 1.4 + 12);
    this.gap(level === 1 ? 0 : 2.5);
    this.text(value, { size, bold: true, after: level === 3 ? 1 : 2.5 });
  }

  bullets(items: string[], indent = 0) {
    for (const item of items) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9.5);
      this.ensureSpace(5);
      this.doc.setTextColor(...SOFT);
      this.doc.text('•', MARGIN + indent, this.y + 9.5 * PT_TO_MM);
      this.text(item, { size: 9.5, indent: indent + 4, after: 0.8 });
    }
    this.gap(1.2);
  }

  /** Renders any plan value: strings as paragraphs, arrays as bullets, objects as labelled blocks. */
  value(value: unknown, indent = 0) {
    if (value === null || value === undefined || value === '') return;
    if (Array.isArray(value)) {
      const simple = value.every((item) => typeof item !== 'object' || item === null);
      if (simple) this.bullets(value.map(String), indent);
      else value.forEach((item) => this.value(item, indent));
      return;
    }
    if (typeof value === 'object') {
      for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
        this.text(humanize(key), { size: 9.5, bold: true, color: SOFT, indent, after: 0.6 });
        this.value(inner, indent);
      }
      return;
    }
    this.text(String(value), { size: 9.5, indent, after: 2 });
  }

  table(options: Parameters<typeof autoTable>[1]) {
    autoTable(this.doc, {
      startY: this.y,
      margin: { left: MARGIN, right: MARGIN, bottom: PAGE_HEIGHT - BOTTOM },
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8.5, textColor: INK, lineColor: LINE, lineWidth: 0.2, cellPadding: 2, valign: 'top' },
      headStyles: { fillColor: [244, 246, 248], textColor: SOFT, fontStyle: 'bold' },
      ...options,
    });
    this.y = ((this.doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY) + 5;
  }

  footer() {
    const pages = this.doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
      this.doc.setPage(page);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(...SOFT);
      this.doc.setDrawColor(...LINE);
      this.doc.line(MARGIN, PAGE_HEIGHT - MARGIN, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - MARGIN);
      this.doc.text('Portfolio decision report', MARGIN, PAGE_HEIGHT - MARGIN + 4.5);
      this.doc.text(`Page ${page} of ${pages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - MARGIN + 4.5, { align: 'right' });
    }
  }
}

const decisionLabel = (decision: DecisionType | null) => (decision ? decision.toUpperCase() : 'Undecided');

function writeCover(pdf: PdfWriter, report: Report) {
  const date = report.generatedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  pdf.text('Portfolio decision report', { size: 22, bold: true, after: 2 });
  pdf.text(`Generated on ${date} from ${report.signalCount} organisational signals.`, { color: SOFT, after: 6 });

  pdf.heading('How to read this report', 2);
  pdf.text(
    'An AI model turned the signals into opportunities and scored each selected opportunity from 0 to 10 on three '
      + 'questions: desirability (do people want it?), feasibility (can we deliver it?) and viability (is it worth the '
      + 'cost?). A person then decided per opportunity: go (implement), hold (revisit later) or drop. Every go '
      + 'opportunity has an AI-written implementation plan in this report.',
    { size: 9.5, color: SOFT, after: 4 },
  );

  pdf.heading('Decisions at a glance', 2);
  const { go, hold, drop } = report.summary;
  pdf.text(`${go} go, ${hold} on hold, ${drop} dropped.`, { after: 3 });

  pdf.table({
    head: [['#', 'Opportunity', 'Desir.', 'Feas.', 'Viab.', 'Average', 'Decision']],
    body: report.opportunities.map((o, index) => [
      String(index + 1),
      clean(o.title),
      o.scores ? o.scores.desirability.score.toFixed(1) : '-',
      o.scores ? o.scores.feasibility.score.toFixed(1) : '-',
      o.scores ? o.scores.viability.score.toFixed(1) : '-',
      o.averageScore === null ? '-' : o.averageScore.toFixed(1),
      decisionLabel(o.decision),
    ]),
    columnStyles: {
      0: { cellWidth: 8 },
      2: { halign: 'right', cellWidth: 14 },
      3: { halign: 'right', cellWidth: 14 },
      4: { halign: 'right', cellWidth: 14 },
      5: { halign: 'right', cellWidth: 17, fontStyle: 'bold' },
      6: { cellWidth: 20, fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const decision = report.opportunities[data.row.index]?.decision;
        if (decision) data.cell.styles.textColor = DECISION_COLORS[decision];
      }
    },
  });
}

function writeOpportunity(pdf: PdfWriter, opportunity: ReportOpportunity, number: number) {
  pdf.heading(`${number}. ${opportunity.title}`, 1);

  const score = opportunity.averageScore === null ? '' : `   Average score ${opportunity.averageScore.toFixed(1)} / 10`;
  pdf.text(`${decisionLabel(opportunity.decision)}${score}`, {
    size: 10,
    bold: true,
    color: opportunity.decision ? DECISION_COLORS[opportunity.decision] : SOFT,
    after: 3,
  });
  pdf.text(opportunity.description, { size: 10, after: 3 });

  if (opportunity.decisionNote) {
    pdf.text(`Decision note: ${opportunity.decisionNote}`, { size: 9.5, color: SOFT, after: 3 });
  }

  if (opportunity.scores) {
    const scores = opportunity.scores;
    pdf.table({
      head: [['Question', 'Score', 'Why']],
      body: DIMENSIONS.map((d) => [`${d.label}\n${d.question}`, scores[d.key].score.toFixed(1), clean(scores[d.key].reasoning)]),
      columnStyles: { 0: { cellWidth: 36, fontStyle: 'bold' }, 1: { cellWidth: 14, halign: 'right' } },
    });
  }

  if (opportunity.sourceSignals.length > 0) {
    pdf.heading('Based on these signals', 3);
    pdf.bullets(opportunity.sourceSignals.map((s) => `${s.text} (${s.category}, ${s.source})`));
  }

  if (opportunity.plan) {
    pdf.gap(2);
    pdf.doc.setDrawColor(...ROUTE);
    pdf.doc.setLineWidth(0.6);
    pdf.ensureSpace(20);
    pdf.doc.line(MARGIN, pdf.y, MARGIN + 18, pdf.y);
    pdf.gap(4);
    pdf.heading('Implementation plan', 2);
    for (const section of planSections(opportunity.plan)) {
      pdf.heading(section.label, 3);
      if (section.key === 'implementation_roadmap') writeRoadmap(pdf, section.value);
      else pdf.value(section.value);
    }
  }
}

/** Roadmap phases side by side in a table: one row per phase. */
function writeRoadmap(pdf: PdfWriter, roadmap: unknown) {
  if (!roadmap || typeof roadmap !== 'object' || Array.isArray(roadmap)) {
    pdf.value(roadmap);
    return;
  }
  const phases = Object.entries(roadmap as Record<string, unknown>);
  const fields = Array.from(new Set(phases.flatMap(([, phase]) =>
    phase && typeof phase === 'object' ? Object.keys(phase as object) : []))).filter((f) => f !== 'timeline');

  pdf.table({
    head: [['Phase', ...fields.map(humanize)]],
    body: phases.map(([name, phase]) => {
      const details = (phase && typeof phase === 'object' ? phase : {}) as Record<string, unknown>;
      const timeline = details.timeline ? `\n${String(details.timeline)}` : '';
      return [
        clean(`${humanize(name)}${timeline}`),
        ...fields.map((field) => toLines(details[field]).map((line) => `• ${clean(line)}`).join('\n')),
      ];
    }),
    columnStyles: { 0: { cellWidth: 24, fontStyle: 'bold' } },
    styles: { font: 'helvetica', fontSize: 8, textColor: INK, lineColor: LINE, lineWidth: 0.2, cellPadding: 2, valign: 'top' },
  });
}

export function generatePdf(report: Report): Blob {
  const pdf = new PdfWriter();
  writeCover(pdf, report);

  const withPlans = report.opportunities.filter((o) => o.decision === 'go');
  const others = report.opportunities.filter((o) => o.decision !== 'go');

  withPlans.forEach((opportunity, index) => {
    pdf.newPage();
    writeOpportunity(pdf, opportunity, index + 1);
  });

  if (others.length > 0) {
    pdf.newPage();
    pdf.text('On hold and dropped', { size: 18, bold: true, after: 4 });
    others.forEach((opportunity, index) => {
      if (index > 0) pdf.gap(4);
      writeOpportunity(pdf, opportunity, withPlans.length + index + 1);
    });
  }

  pdf.footer();
  return pdf.doc.output('blob');
}
