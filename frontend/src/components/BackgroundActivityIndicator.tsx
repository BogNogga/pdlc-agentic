import React, { useState, useEffect } from 'react';
import { Loader2, Brain, Zap, FileSearch, CheckSquare, CheckCircle, ArrowRight } from 'lucide-react';

interface BackgroundActivityIndicatorProps {
  currentStep: string;
  isLoading: boolean;
  signalsCount?: number;
  selectedCount?: number;
}

const BackgroundActivityIndicator: React.FC<BackgroundActivityIndicatorProps> = ({
  currentStep,
  isLoading,
  signalsCount = 0,
  selectedCount = 0
}) => {
  const [currentActivity, setCurrentActivity] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showPhaseTransition, setShowPhaseTransition] = useState(false);
  const [previousStep, setPreviousStep] = useState('');

  // Detect phase transitions
  useEffect(() => {
    if (previousStep && previousStep !== currentStep && isLoading) {
      setShowPhaseTransition(true);
      const timer = setTimeout(() => setShowPhaseTransition(false), 3000);
      return () => clearTimeout(timer);
    }
    setPreviousStep(currentStep);
  }, [currentStep, isLoading, previousStep]);

  const getPhaseTransitionInfo = () => {
    switch (currentStep) {
      case 'generating_opportunities':
        return {
          from: 'Signal Loading Complete',
          to: 'AI Opportunity Generation',
          description: 'Transitioning from data loading to AI analysis phase'
        };
      case 'assessing_opportunities':
        return {
          from: 'Opportunity Selection Complete',
          to: 'AI Assessment Phase',
          description: `Starting detailed assessment of ${selectedCount} selected opportunities`
        };
      case 'generating_portfolio':
        return {
          from: 'Strategic Decisions Complete',
          to: 'Portfolio Generation',
          description: 'Creating comprehensive portfolio specification'
        };
      default:
        return null;
    }
  };

  const getActivityDetails = () => {
    switch (currentStep) {
      case 'generating_opportunities':
        return {
          icon: <Brain className="h-6 w-6 text-blue-500" />,
          title: 'Generate Strategic Opportunities',
          subtitle: 'AI analyzing signals to identify improvement opportunities',
          activities: [
            'Preparing organizational signals for AI analysis',
            'Sending signals to DeepSeek V4.1 Flash via OpenRouter',
            'AI analyzing operational patterns and themes',
            'Generating 8-12 strategic opportunities',
            'Validating opportunity-signal relationships',
            'Formatting opportunities with descriptions',
            'Storing opportunities in session'
          ],
          estimatedTime: '30-60 seconds',
          progressSteps: 7
        };
      
      case 'assessing_opportunities':
        return {
          icon: <Zap className="h-6 w-6 text-purple-500" />,
          title: 'Assess Strategic Opportunities',
          subtitle: 'AI conducting detailed feasibility assessment',
          activities: [
            'Preparing selected opportunities for assessment',
            'AI analyzing passenger desirability factors',
            'Evaluating technical and infrastructure feasibility',
            'Assessing financial viability and ROI',
            'Calculating comprehensive 0-10 scores',
            'Generating detailed reasoning for each dimension',
            'Storing assessment results'
          ],
          estimatedTime: `${selectedCount * 8}-${selectedCount * 15} seconds`,
          progressSteps: 7
        };
      
      case 'generating_portfolio':
        return {
          icon: <CheckSquare className="h-6 w-6 text-green-500" />,
          title: 'Generate Portfolio Specification',
          subtitle: 'AI creating comprehensive implementation roadmap',
          activities: [
            'Organizing decisions by strategic priority',
            'AI creating implementation roadmap',
            'Calculating resource requirements',
            'Defining organizational KPIs and metrics',
            'Conducting operational risk assessment',
            'Developing monitoring and maintenance plans',
            'Generating comprehensive portfolio document'
          ],
          estimatedTime: '45-90 seconds',
          progressSteps: 7
        };
      
      default:
        return {
          icon: <FileSearch className="h-6 w-6 text-gray-500" />,
          title: 'Processing Organizational Data',
          subtitle: 'Loading and validating operational data',
          activities: ['Processing organizational operational data...'],
          estimatedTime: 'A few moments',
          progressSteps: 1
        };
    }
  };

  const activityDetails = getActivityDetails();
  const phaseTransition = getPhaseTransitionInfo();

  // Simulate progress animation
  useEffect(() => {
    if (!isLoading) {
      setCurrentActivity(0);
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentActivity(prev => {
        const next = (prev + 1) % activityDetails.activities.length;
        return next;
      });
      
      setProgress(prev => {
        const increment = 100 / (activityDetails.progressSteps * 10);
        return Math.min(prev + increment, 95);
      });
    }, 2500); // Slightly slower for better readability

    return () => clearInterval(interval);
  }, [isLoading, activityDetails.activities.length, activityDetails.progressSteps]);

  // Reset progress when step changes
  useEffect(() => {
    setProgress(0);
    setCurrentActivity(0);
  }, [currentStep]);

  if (!isLoading) return null;

  // Show phase transition animation
  if (showPhaseTransition && phaseTransition) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <span className="font-medium text-green-700">{phaseTransition.from}</span>
            </div>
            <ArrowRight className="h-6 w-6 text-blue-500 animate-pulse" />
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
              <span className="font-medium text-blue-700">{phaseTransition.to}</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">{phaseTransition.description}</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full animate-pulse w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="animate-pulse">
            {activityDetails.icon}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{activityDetails.title}</h3>
            {activityDetails.subtitle && (
              <p className="text-sm text-gray-600 mb-1">{activityDetails.subtitle}</p>
            )}
            <p className="text-xs text-gray-500">Estimated time: {activityDetails.estimatedTime}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{Math.round(progress)}%</div>
          <div className="text-xs text-gray-500">Complete</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current Activity */}
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-sm font-medium text-gray-900">Current Activity:</span>
        </div>
        <p className="text-sm text-gray-700 ml-6 animate-pulse">
          {activityDetails.activities[currentActivity]}
        </p>
      </div>

      {/* Activity List */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-600 mb-2">Processing Steps:</div>
        {activityDetails.activities.map((activity, index) => (
          <div key={index} className="flex items-center space-x-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${
              index < currentActivity ? 'bg-green-500' :
              index === currentActivity ? 'bg-blue-500 animate-pulse' :
              'bg-gray-300'
            }`} />
            <span className={`${
              index < currentActivity ? 'text-green-700 line-through' :
              index === currentActivity ? 'text-blue-700 font-medium' :
              'text-gray-500'
            }`}>
              {activity}
            </span>
          </div>
        ))}
      </div>

      {/* Context Information */}
      <div className="mt-4 pt-4 border-t border-blue-200">
        <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
          {currentStep === 'generating_opportunities' && (
            <>
              <div className="text-center">
                <div className="font-semibold text-blue-600">{signalsCount}</div>
                <div>Organizational Signals</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-purple-600">8-12</div>
                <div>Target Opportunities</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-600">DeepSeek V4.1 Flash</div>
                <div>AI Model</div>
              </div>
            </>
          )}
          
          {currentStep === 'assessing_opportunities' && (
            <>
              <div className="text-center">
                <div className="font-semibold text-blue-600">{selectedCount}</div>
                <div>Strategic Opportunities</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-purple-600">3</div>
                <div>Assessment Dimensions</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-600">0-10</div>
                <div>Scoring Scale</div>
              </div>
            </>
          )}
          
          {currentStep === 'generating_portfolio' && (
            <>
              <div className="text-center">
                <div className="font-semibold text-blue-600">GO/HOLD/DROP</div>
                <div>Decision Types</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-purple-600">7</div>
                <div>Portfolio Sections</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-600">Strategic</div>
                <div>Analysis Level</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Technical Details */}
      <div className="mt-3 text-xs text-gray-500">
        <details className="cursor-pointer">
          <summary className="hover:text-gray-700">Technical Details</summary>
          <div className="mt-2 space-y-1 ml-4">
            <div>• Using DeepSeek V4.1 Flash via OpenRouter for organizational analysis</div>
            <div>• LangChain LCEL for structured workflows</div>
            <div>• Domain-specific JSON schema validation</div>
            <div>• Retry logic with exponential backoff</div>
            <div>• Real-time operations progress tracking</div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default BackgroundActivityIndicator;