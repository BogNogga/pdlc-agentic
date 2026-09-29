import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, RotateCcw, X } from 'lucide-react';
import { WorkflowSession } from './types';
import { ApiClient } from './api';
import Stepper, { Stage } from './components/Stepper';
import WorkingPanel from './components/WorkingPanel';
import SignalsStep from './components/SignalsStep';
import SelectStep from './components/SelectStep';
import DecideStep, { DecisionInput } from './components/DecideStep';
import PlansStep from './components/PlansStep';

type Job = 'opportunities' | 'scores' | 'plans';

/** The stage a job produces, so the stepper shows where the AI is working. */
const JOB_STAGE: Record<Job, Stage> = { opportunities: 'opportunities', scores: 'assessment', plans: 'plans' };

/** Maps the backend's workflow step onto the four stages people see. */
function stageFromStep(step: string): Stage {
  switch (step) {
    case 'opportunities_ready':
    case 'opportunities_selected':
    case 'assessing_opportunities':
      return 'opportunities';
    case 'assessments_ready':
    case 'decisions_ready':
    case 'generating_portfolio':
      return 'assessment';
    case 'portfolio_ready':
      return 'plans';
    default:
      return 'signals';
  }
}

function errorMessage(error: any, action: string): string {
  if (error?.code === 'ECONNABORTED') return `${action} took longer than 2 minutes and was stopped. Try again.`;
  if (error?.response?.status === 503) return 'The AI is not connected. Set OPENROUTER_API_KEY on the backend and try again.';
  if (error?.response?.status === 404) return 'This session no longer exists on the server. Start a new analysis.';
  const detail = error?.response?.data?.detail;
  return detail ? `${action} failed: ${detail}` : `${action} failed. Check that the backend is running and try again.`;
}

export default function App() {
  const [session, setSession] = useState<WorkflowSession | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [starting, setStarting] = useState(true);
  const [job, setJob] = useState<Job | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Set when someone steps back to an earlier stage; cleared by the next action.
  const [viewStage, setViewStage] = useState<Stage | null>(null);

  const startSession = async () => {
    setStarting(true);
    setError(null);
    setViewStage(null);
    try {
      const [created, health] = await Promise.all([
        ApiClient.createSession(),
        ApiClient.healthCheck().catch(() => ({ status: 'unhealthy', llm_status: 'unavailable' })),
      ]);
      setAiAvailable(health.llm_status === 'available');
      setSession(await ApiClient.getSession(created.session_id));
    } catch (e) {
      setSession(null);
      setError(errorMessage(e, 'Loading the signals'));
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    startSession();
  }, []);

  useEffect(() => {
    if (!job) return;
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [job]);

  /** Runs one AI job, then reloads the session so every view reads fresh data. */
  const runJob = async (kind: Job, action: string, work: (sessionId: string) => Promise<unknown>) => {
    if (!session) return;
    setJob(kind);
    setError(null);
    try {
      await work(session.session_id);
      setViewStage(null);
      setSession(await ApiClient.getSession(session.session_id));
    } catch (e) {
      setError(errorMessage(e, action));
    } finally {
      setJob(null);
    }
  };

  const generateOpportunities = () =>
    runJob('opportunities', 'Generating opportunities', (id) => ApiClient.generateOpportunities(id));

  const scoreOpportunities = (ids: string[]) =>
    runJob('scores', 'Scoring the opportunities', async (id) => {
      await ApiClient.selectOpportunities(id, ids);
      await ApiClient.assessOpportunities(id);
    });

  const writePlans = (decisions: DecisionInput[]) =>
    runJob('plans', 'Writing the plans', async (id) => {
      await ApiClient.makeDecisions(id, decisions);
      await ApiClient.generatePortfolio(id);
    });

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        {starting ? (
          <p className="flex items-center gap-3 text-ink-soft">
            <Loader2 className="h-5 w-5 animate-spin text-route" aria-hidden /> Loading signals
          </p>
        ) : (
          <div className="panel max-w-md p-6">
            <h1 className="flex items-center gap-2 font-semibold"><AlertCircle className="h-5 w-5 text-drop" /> Can't reach the backend</h1>
            <p className="mt-2 text-ink-soft">{error}</p>
            <button type="button" className="btn-primary mt-4" onClick={startSession}>Try again</button>
          </div>
        )}
      </div>
    );
  }

  const reached = stageFromStep(session.current_step);
  const stage = job ? JOB_STAGE[job] : viewStage ?? reached;

  const working = {
    opportunities: {
      title: 'Generating opportunities',
      detail: `The AI is reading ${session.signals.length} signals and grouping them into opportunities.`,
      expected: 'This usually takes 5 to 15 seconds.',
    },
    scores: {
      title: 'Scoring the opportunities',
      detail: 'Each selected opportunity is scored on desirability, feasibility and viability, all at the same time.',
      expected: 'This usually takes 5 to 15 seconds.',
    },
    plans: {
      title: 'Writing implementation plans',
      detail: 'The AI writes a plan for every go decision, all at the same time.',
      expected: 'This usually takes 10 to 30 seconds.',
    },
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-route text-sm font-bold text-white" aria-hidden>S</span>
              <span className="font-semibold">Signal to Portfolio</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className={`hidden items-center gap-1.5 sm:flex ${aiAvailable ? 'text-ink-soft' : 'text-drop'}`}>
                <span className={`h-2 w-2 rounded-full ${aiAvailable ? 'bg-go' : 'bg-drop'}`} aria-hidden />
                {aiAvailable ? 'AI connected' : 'AI not connected'}
              </span>
              {reached !== 'signals' && (
                <button type="button" className="btn-ghost" onClick={startSession} disabled={job !== null}>
                  <RotateCcw className="h-4 w-4" aria-hidden /> Start over
                </button>
              )}
            </div>
          </div>
          <div className="pb-4">
            <Stepper current={stage} reached={reached} working={job !== null} elapsed={elapsed} onSelect={setViewStage} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pt-8 sm:px-6">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-drop/30 bg-drop-soft p-4 text-sm text-drop" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p className="flex-1">{error}</p>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><X className="h-4 w-4" /></button>
          </div>
        )}

        {job ? (
          <WorkingPanel {...working[job]} elapsed={elapsed} />
        ) : stage === 'signals' ? (
          <SignalsStep signals={session.signals} aiAvailable={aiAvailable} onGenerate={generateOpportunities} />
        ) : stage === 'opportunities' ? (
          <SelectStep session={session} onScore={scoreOpportunities} onRegenerate={generateOpportunities} />
        ) : stage === 'assessment' ? (
          <DecideStep session={session} onSubmit={writePlans} onChangeSelection={() => setViewStage('opportunities')} />
        ) : (
          <PlansStep session={session} onChangeDecisions={() => setViewStage('assessment')} onStartOver={startSession} />
        )}
      </main>
    </div>
  );
}
