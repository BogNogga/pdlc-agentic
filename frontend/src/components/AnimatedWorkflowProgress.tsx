import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Loader2, AlertCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { WorkflowSession } from '../types';

interface AnimatedWorkflowProgressProps {
  session: WorkflowSession;
  loading: boolean;
}

interface WorkflowStep {
  key: string;
  title: string;
  description: string;
  status: string;
  estimatedTime?: string;
  subtasks?: string[];
  completedSubtasks?: string[];
  timestamp?: string;
}

const AnimatedWorkflowProgress: React.FC<AnimatedWorkflowProgressProps> = ({
  session,
  loading
}) => {
  const [currentSubtask, setCurrentSubtask] = useState(0);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStepExpansion = (stepKey: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepKey)) {
      newExpanded.delete(stepKey);
    } else {
      newExpanded.add(stepKey);
    }
    setExpandedSteps(newExpanded);
  };

  // Map current session step to workflow step status
  const getStepStatus = (stepKey: string) => {
    // First, check if we have explicit step status from backend
    if (session.step_status && session.step_status[stepKey]) {
      return session.step_status[stepKey];
    }
    
    // Define the step order for proper progression tracking
    const stepOrder = [
      'load_signals',
      'generate_opportunities', 
      'select_opportunities',
      'assess_opportunities',
      'make_decisions',
      'generate_portfolio',
      'validate_portfolio'
    ];
    
    const currentStepIndex = getCurrentStepIndex(session.current_step);
    const thisStepIndex = stepOrder.indexOf(stepKey);
    
    // If loading and this step matches current operation, show as in_progress
    if (loading) {
      switch (session.current_step) {
        case 'generating_opportunities':
          if (stepKey === 'generate_opportunities') return 'in_progress';
          break;
        case 'assessing_opportunities':
          if (stepKey === 'assess_opportunities') return 'in_progress';
          break;
        case 'generating_portfolio':
          if (stepKey === 'generate_portfolio') return 'in_progress';
          break;
      }
    }
    
    // Determine status based on step progression
    if (thisStepIndex < currentStepIndex) {
      return 'completed';
    } else if (thisStepIndex === currentStepIndex) {
      // Check if current step is in progress
      if (loading && (
        session.current_step === 'generating_opportunities' && stepKey === 'generate_opportunities' ||
        session.current_step === 'assessing_opportunities' && stepKey === 'assess_opportunities' ||
        session.current_step === 'generating_portfolio' && stepKey === 'generate_portfolio'
      )) {
        return 'in_progress';
      }
      // For user interaction steps, they're pending until completed
      if (stepKey === 'select_opportunities' || stepKey === 'make_decisions' || stepKey === 'validate_portfolio') {
        return 'pending';
      }
      return 'pending';
    } else {
      return 'pending';
    }
  };
  
  // Helper function to get current step index for progression tracking
  const getCurrentStepIndex = (currentStep: string): number => {
    switch (currentStep) {
      case 'loaded': return 1; // load_signals completed
      case 'generating_opportunities': return 1; // load_signals completed, generate_opportunities in progress
      case 'opportunities_ready': return 2; // generate_opportunities completed
      case 'opportunities_selected': return 3; // select_opportunities completed
      case 'assessing_opportunities': return 3; // select_opportunities completed, assess_opportunities in progress
      case 'assessments_ready': return 4; // assess_opportunities completed
      case 'decisions_ready': return 5; // make_decisions completed
      case 'generating_portfolio': return 5; // make_decisions completed, generate_portfolio in progress
      case 'portfolio_ready': return 6; // generate_portfolio completed
      default: return 0;
    }
  };

  const steps: WorkflowStep[] = [
    {
      key: 'load_signals',
      title: '1. Load Organizational Signals',
      description: 'Loading and validating organizational signal data',
      status: getStepStatus('load_signals'),
      estimatedTime: '5-10 seconds',
      subtasks: [
        'Reading CSV file from data directory',
        'Validating signal data structure',
        'Checking required columns (content, category, source)',
        'Processing signal content and metadata',
        'Storing signals in session memory'
      ],
      completedSubtasks: getStepStatus('load_signals') === 'completed' ? [
        `Loaded ${session.signals?.length || 0} organizational signals`,
        'Validated data structure and required fields',
        'Processed signal categories and sources',
        'Stored signals in session for analysis'
      ] : [],
      timestamp: getStepStatus('load_signals') === 'completed' ? new Date().toLocaleTimeString() : undefined
    },
    {
      key: 'generate_opportunities',
      title: '2. Generate Strategic Opportunities',
      description: 'AI analyzing signals to identify improvement opportunities',
      status: getStepStatus('generate_opportunities'),
      estimatedTime: '30-60 seconds',
      subtasks: [
        'Preparing organizational signals for AI analysis',
        'Sending signals to DeepSeek V4.1 Flash via OpenRouter',
        'AI analyzing operational patterns and themes',
        'Generating 8-12 strategic opportunities',
        'Validating opportunity-signal relationships',
        'Formatting opportunities with descriptions',
        'Storing opportunities in session'
      ],
      completedSubtasks: getStepStatus('generate_opportunities') === 'completed' ? [
        `Generated ${session.opportunities?.length || 0} strategic opportunities`,
        'AI analyzed organizational patterns and themes',
        'Validated opportunity-signal relationships',
        'Formatted opportunities with detailed descriptions'
      ] : [],
      timestamp: getStepStatus('generate_opportunities') === 'completed' ? new Date().toLocaleTimeString() : undefined
    },
    {
      key: 'select_opportunities',
      title: '3. Select Top Opportunities',
      description: 'User selecting most promising opportunities for assessment',
      status: getStepStatus('select_opportunities'),
      estimatedTime: 'User dependent',
      subtasks: [
        'Displaying generated opportunities to user',
        'Waiting for user to review opportunities',
        'User selecting up to 10 opportunities',
        'Validating selection criteria',
        'Storing selected opportunity IDs'
      ],
      completedSubtasks: getStepStatus('select_opportunities') === 'completed' ? [
        `Selected ${session.selected_opportunity_ids?.length || 0} opportunities for assessment`,
        'User reviewed all generated opportunities',
        'Validated selection meets criteria (max 10)',
        'Stored selected opportunity IDs for assessment'
      ] : [],
      timestamp: getStepStatus('select_opportunities') === 'completed' ? new Date().toLocaleTimeString() : undefined
    },
    {
      key: 'assess_opportunities',
      title: '4. Assess Strategic Opportunities',
      description: 'AI conducting detailed feasibility assessment',
      status: getStepStatus('assess_opportunities'),
      estimatedTime: `${(session.selected_opportunity_ids?.length || 5) * 8}-${(session.selected_opportunity_ids?.length || 5) * 15} seconds`,
      subtasks: [
        'Preparing selected opportunities for assessment',
        'AI analyzing stakeholder desirability factors',
        'Evaluating technical and operational feasibility',
        'Assessing financial viability and ROI',
        'Calculating comprehensive 0-10 scores',
        'Generating detailed reasoning for each dimension',
        'Storing assessment results'
      ],
      completedSubtasks: getStepStatus('assess_opportunities') === 'completed' ? [
        `Assessed ${session.assessments?.length || 0} opportunities across 3 dimensions`,
        'AI analyzed desirability, feasibility, and viability',
        'Generated detailed reasoning for each assessment',
        'Calculated comprehensive 0-10 scores for all dimensions'
      ] : [],
      timestamp: getStepStatus('assess_opportunities') === 'completed' ? new Date().toLocaleTimeString() : undefined
    },
    {
      key: 'make_decisions',
      title: '5. Make Strategic Decisions',
      description: 'User making Go/Hold/Drop decisions for each opportunity',
      status: getStepStatus('make_decisions'),
      estimatedTime: 'User dependent',
      subtasks: [
        'Displaying assessment results to user',
        'User reviewing desirability/feasibility/viability scores',
        'User making Go/Hold/Drop decisions',
        'Optional: User providing decision reasoning',
        'Validating all decisions are complete',
        'Storing decision data'
      ],
      completedSubtasks: getStepStatus('make_decisions') === 'completed' ? [
        `Made decisions for ${session.decisions?.length || 0} opportunities`,
        'User reviewed all assessment scores and reasoning',
        'Completed Go/Hold/Drop decisions for all opportunities',
        'Validated all decisions are complete'
      ] : [],
      timestamp: getStepStatus('make_decisions') === 'completed' ? new Date().toLocaleTimeString() : undefined
    },
    {
      key: 'generate_portfolio',
      title: '6. Generate Portfolio Specification',
      description: 'AI creating comprehensive implementation roadmap',
      status: getStepStatus('generate_portfolio'),
      estimatedTime: '45-90 seconds',
      subtasks: [
        'Organizing decisions by strategic priority',
        'AI creating implementation roadmap',
        'Calculating resource requirements',
        'Defining organizational KPIs and metrics',
        'Conducting operational risk assessment',
        'Developing monitoring and maintenance plans',
        'Generating comprehensive portfolio document'
      ],
      completedSubtasks: getStepStatus('generate_portfolio') === 'completed' ? [
        'Generated comprehensive portfolio specification',
        'Created implementation roadmap with priorities',
        'Calculated resource requirements and timelines',
        'Defined success metrics and KPIs'
      ] : [],
      timestamp: getStepStatus('generate_portfolio') === 'completed' ? new Date().toLocaleTimeString() : undefined
    },
    {
      key: 'validate_portfolio',
      title: '7. Validate & Review',
      description: 'Final review and approval of portfolio specification',
      status: getStepStatus('validate_portfolio'),
      estimatedTime: 'User dependent',
      subtasks: [
        'Displaying complete portfolio specification',
        'User reviewing implementation roadmap',
        'User validating resource requirements',
        'User approving success metrics',
        'Final portfolio approval and download'
      ],
      completedSubtasks: getStepStatus('validate_portfolio') === 'completed' ? [
        'Portfolio specification reviewed and approved',
        'Implementation roadmap validated',
        'Resource requirements confirmed',
        'Success metrics approved'
      ] : [],
      timestamp: getStepStatus('validate_portfolio') === 'completed' ? new Date().toLocaleTimeString() : undefined
    }
  ];

  // Animation for active subtasks
  useEffect(() => {
    const activeStep = steps.find(step => step.status === 'in_progress');
    if (activeStep && loading) {
      const interval = setInterval(() => {
        setCurrentSubtask(prev => (prev + 1) % (activeStep.subtasks?.length || 1));
        setAnimationPhase(prev => (prev + 1) % 4); // For dot animation
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [loading, steps]);

  const getStepIcon = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepStatusText = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return 'Waiting';
    }
  };

  const getAnimatedDots = () => {
    const dots = ['', '.', '..', '...'];
    return dots[animationPhase];
  };

  return (
    <div className="bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Workflow Progress</h2>
        <p className="text-sm text-gray-600 mt-1">
          Agentic PDLC Signal to Portfolio Decisioning
        </p>
      </div>

      <div className="p-4 space-y-4">
        {steps.map((step) => (
          <div key={step.key} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Step Header */}
            <div 
              className={`p-4 cursor-pointer transition-colors ${
                step.status === 'completed' ? 'bg-green-50 hover:bg-green-100' :
                step.status === 'in_progress' ? 'bg-blue-50 hover:bg-blue-100' :
                step.status === 'failed' ? 'bg-red-50 hover:bg-red-100' :
                'bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={() => toggleStepExpansion(step.key)}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getStepIcon(step)}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 text-sm">
                      {step.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                      {step.timestamp && (
                        <span className="text-xs text-gray-500">
                          {step.timestamp}
                        </span>
                      )}
                      {expandedSteps.has(step.key) ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {step.description}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      step.status === 'completed' ? 'bg-green-100 text-green-800' :
                      step.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      step.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getStepStatusText(step)}
                    </span>
                    {step.estimatedTime && (
                      <span className="text-xs text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {step.estimatedTime}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable Content */}
            {expandedSteps.has(step.key) && (
              <div className="border-t border-gray-200 bg-white">
                {/* Current Progress (for in-progress steps) */}
                {step.status === 'in_progress' && step.subtasks && (
                  <div className="p-4 border-b border-gray-100">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Current Progress
                    </h4>
                    <div className="space-y-2">
                      {step.subtasks.map((subtask, idx) => (
                        <div 
                          key={idx} 
                          className={`text-xs flex items-center space-x-2 ${
                            idx === currentSubtask ? 'text-blue-600 font-medium' : 'text-gray-500'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${
                            idx < currentSubtask ? 'bg-green-500' :
                            idx === currentSubtask ? 'bg-blue-500' :
                            'bg-gray-300'
                          }`} />
                          <span>
                            {subtask}
                            {idx === currentSubtask && getAnimatedDots()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Tasks (for completed steps) */}
                {step.status === 'completed' && step.completedSubtasks && step.completedSubtasks.length > 0 && (
                  <div className="p-4 border-b border-gray-100">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Completed Tasks
                    </h4>
                    <div className="space-y-1">
                      {step.completedSubtasks.map((task, idx) => (
                        <div key={idx} className="text-xs text-gray-600 flex items-center space-x-2">
                          <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                          <span>{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Planned Tasks (for pending steps) */}
                {step.status === 'pending' && step.subtasks && (
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Planned Tasks
                    </h4>
                    <div className="space-y-1">
                      {step.subtasks.map((task, idx) => (
                        <div key={idx} className="text-xs text-gray-500 flex items-center space-x-2">
                          <Circle className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span>{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Overall Progress */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-sm text-gray-600">
          <div className="flex justify-between items-center mb-2">
            <span>Overall Progress</span>
            <span>
              {steps.filter(s => s.status === 'completed').length}/{steps.length} 
              ({Math.round((steps.filter(s => s.status === 'completed').length / steps.length) * 100)}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(steps.filter(s => s.status === 'completed').length / steps.length) * 100}%` 
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedWorkflowProgress;