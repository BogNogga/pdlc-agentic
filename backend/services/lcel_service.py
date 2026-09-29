"""
LangChain LCEL service for LLM processing chains.
Handles all LLM interactions and chain orchestration.
"""

import os
import logging
from typing import Dict, List, Any, Optional, Tuple

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_openai import ChatOpenAI

from ..models import Signal, Opportunity, Assessment

logger = logging.getLogger(__name__)

# OpenRouter exposes an OpenAI-compatible API, so ChatOpenAI works with a different base URL.
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = "deepseek/deepseek-v4.1-flash"
# Reasoning is off by default: with it on, a call takes ~3x longer and costs ~5x more,
# while the prompts only ask for structured JSON. Set OPENROUTER_REASONING to low/medium/high to enable it.
REASONING_EFFORTS = {"low", "medium", "high"}
# OpenRouter's default price-first routing sometimes picks an fp4-quantized provider that needs
# minutes for a single response. Prefer the fastest providers and skip fp4 ones.
PROVIDER_PREFERENCES = {
    "sort": "throughput",
    "quantizations": ["int8", "fp8", "fp16", "bf16", "fp32", "unknown"],
}
# Abort a stuck call so the retry loops below can try again.
REQUEST_TIMEOUT_SECONDS = 60


class LCELService:
    """Service for managing LangChain LCEL chains and LLM interactions."""
    
    def __init__(self):
        self.llm: Optional[ChatOpenAI] = None
        self._chains_cache: Optional[Tuple] = None
    
    def get_llm(self) -> Optional[ChatOpenAI]:
        """Get or initialize the LLM instance."""
        if self.llm is None:
            api_key = os.getenv("OPENROUTER_API_KEY")
            if not api_key:
                logger.warning("OPENROUTER_API_KEY not set. LLM functionality will be limited.")
                return None
            effort = (os.getenv("OPENROUTER_REASONING") or "").strip().lower()
            reasoning = {"effort": effort} if effort in REASONING_EFFORTS else {"enabled": False}
            self.llm = ChatOpenAI(
                model=os.getenv("OPENROUTER_MODEL") or DEFAULT_MODEL,
                temperature=0.7,
                api_key=api_key,
                base_url=OPENROUTER_BASE_URL,
                timeout=REQUEST_TIMEOUT_SECONDS,
                max_retries=0,
                extra_body={"reasoning": reasoning, "provider": PROVIDER_PREFERENCES},
            )
        return self.llm
    
    def create_lcel_chains(self) -> Tuple[Optional[Any], Optional[Any], Optional[Any]]:
        """Create and return the LangChain LCEL processing chains with enhanced error handling."""
        if self._chains_cache:
            return self._chains_cache
            
        current_llm = self.get_llm()
        if not current_llm:
            return None, None, None
        
        # Enhanced JSON output parser with validation
        json_parser = JsonOutputParser()
        
        # Chain 1: Signals to Opportunities
        signals_to_opportunities_prompt = ChatPromptTemplate.from_template("""
You are an expert business analyst analyzing organizational signals to identify potential opportunities.

SIGNALS TO ANALYZE:
{signals}

TASK: Generate exactly 10 actionable business opportunities based on these signals.

REQUIREMENTS FOR EACH OPPORTUNITY:
1. Must be specific and actionable (not vague or generic)
2. Must reference at least one valid source signal ID from the input
3. Must have clear business value and impact
4. Must be realistic and achievable within organizational constraints
5. Should address root causes identified in the signals
6. Should leverage organizational strengths or market opportunities

OUTPUT FORMAT: Return ONLY a valid JSON array with this exact structure:
[
  {{
    "id": "opp_1",
    "title": "Clear, concise opportunity title (max 80 characters)",
    "description": "Detailed description explaining the opportunity, its business impact, and implementation approach (200-400 characters)",
    "source_signals": ["sig_1", "sig_2"]
  }}
]

VALIDATION RULES:
- All source_signals must reference valid signal IDs from the input signals
- Each opportunity must have a unique ID starting with "opp_"
- Titles must be concise but descriptive
- Descriptions must explain both the opportunity and its expected business impact
- Generate exactly 10 opportunities (no more, no less)

IMPORTANT: Return ONLY the JSON array, no additional text or explanation.
""")
        
        # Chain 2: Opportunity Assessment
        assessment_prompt = ChatPromptTemplate.from_template("""
You are an expert business analyst conducting a comprehensive opportunity assessment.

OPPORTUNITY TO ASSESS:
{opportunity}

TASK: Assess this opportunity across three critical dimensions with detailed analysis.

ASSESSMENT DIMENSIONS:
1. DESIRABILITY (0-10): How much do users/stakeholders want this?
   - Consider market demand, user needs, strategic alignment
   - Evaluate customer pain points and satisfaction potential
   - Assess competitive advantage and differentiation

2. FEASIBILITY (0-10): How technically/operationally achievable is this?
   - Consider available resources, capabilities, constraints
   - Evaluate technical complexity and implementation timeline
   - Assess organizational readiness and change management needs

3. VIABILITY (0-10): How sustainable/profitable is this?
   - Consider business model, costs, revenue potential
   - Evaluate ROI, payback period, and financial sustainability
   - Assess market size, pricing strategy, and scalability

OUTPUT FORMAT: Return ONLY valid JSON with this exact structure:
{{
  "desirability_score": 7.5,
  "feasibility_score": 6.0,
  "viability_score": 8.0,
  "desirability_reasoning": "Detailed explanation of market demand, user needs, and strategic fit with specific evidence and examples",
  "feasibility_reasoning": "Detailed explanation of technical/operational achievability with resource requirements and timeline considerations",
  "viability_reasoning": "Detailed explanation of business sustainability with financial projections and market analysis"
}}

REQUIREMENTS:
- Scores must be between 0.0 and 10.0 (decimals allowed)
- Reasoning must be specific, actionable, and evidence-based (minimum 50 characters each)
- Consider both positive aspects and potential challenges
- Provide concrete examples and data points where possible

IMPORTANT: Return ONLY the JSON object, no additional text or explanation.
""")
        
        # Chain 3: Final Portfolio Generation
        portfolio_prompt = ChatPromptTemplate.from_template("""
You are a senior strategy consultant creating a comprehensive portfolio specification.

DECISION SUMMARY:
GO Opportunities (Approved for implementation):
{go_opportunities}

HOLD Opportunities (Deferred for later consideration):
{hold_opportunities}

DROPPED Opportunities (Rejected):
{dropped_opportunities}

TASK: Create a comprehensive portfolio specification with actionable recommendations.

OUTPUT FORMAT: Return ONLY valid JSON with this structure:
{{
  "executive_summary": {{
    "overview": "High-level portfolio summary with key themes and strategic direction",
    "total_opportunities": "Number breakdown by decision type",
    "expected_impact": "Overall expected business impact and value creation",
    "strategic_alignment": "How this portfolio aligns with organizational goals"
  }},
  "implementation_roadmap": {{
    "phase_1": {{
      "timeline": "0-6 months",
      "opportunities": ["List of GO opportunities for immediate implementation"],
      "key_milestones": ["Critical milestones and deliverables"],
      "success_criteria": ["Measurable success indicators"]
    }},
    "phase_2": {{
      "timeline": "6-18 months",
      "opportunities": ["List of GO opportunities for later implementation"],
      "key_milestones": ["Critical milestones and deliverables"],
      "success_criteria": ["Measurable success indicators"]
    }}
  }},
  "resource_requirements": {{
    "human_resources": "Staffing needs, roles, and skill requirements",
    "budget_estimate": "High-level budget requirements and allocation",
    "technology_needs": "Technology infrastructure and tool requirements",
    "external_support": "Consulting, vendor, or partnership needs"
  }},
  "success_metrics": {{
    "financial_kpis": ["Revenue, cost savings, ROI metrics"],
    "operational_kpis": ["Efficiency, quality, customer satisfaction metrics"],
    "strategic_kpis": ["Market position, innovation, capability metrics"]
  }},
  "risk_assessment": {{
    "high_risks": ["Major risks with significant impact potential"],
    "mitigation_strategies": ["Specific actions to address identified risks"],
    "contingency_plans": ["Alternative approaches if primary plans fail"]
  }},
  "monitoring_plan": {{
    "hold_opportunities": "Strategy for monitoring and re-evaluating HOLD opportunities",
    "review_schedule": "Regular review cadence and decision points",
    "escalation_criteria": "When to escalate issues or make portfolio changes"
  }}
}}

REQUIREMENTS:
- Provide specific, actionable recommendations
- Include concrete timelines, metrics, and resource estimates
- Address both opportunities and risks comprehensively
- Ensure alignment between different portfolio components

IMPORTANT: Return ONLY the JSON object, no additional text or explanation.
""")
        
        # Create chains with validation
        signals_to_opportunities_chain = (
            signals_to_opportunities_prompt 
            | current_llm 
            | json_parser
        )
        
        assessment_chain = (
            assessment_prompt
            | current_llm
            | json_parser
        )
        
        portfolio_chain = (
            portfolio_prompt
            | current_llm
            | json_parser
        )
        
        self._chains_cache = (signals_to_opportunities_chain, assessment_chain, portfolio_chain)
        return self._chains_cache
    
    async def generate_opportunities(self, signals: List[Signal]) -> List[Opportunity]:
        """Generate opportunities from signals using LCEL chain."""
        signals_chain, _, _ = self.create_lcel_chains()
        if not signals_chain:
            raise ValueError("LLM service not available")
        
        # Prepare signals text for LLM
        signals_text = "\n".join([
            f"{signal.id}: {signal.content} (Category: {signal.category}, Source: {signal.source})"
            for signal in signals
        ])
        
        # Process with LCEL chain with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                logger.info(f"Generating opportunities (attempt {attempt + 1}/{max_retries})")
                opportunities_data = await signals_chain.ainvoke({"signals": signals_text})
                
                # Validate and convert to Opportunity objects
                opportunities = []
                valid_signal_ids = {signal.id for signal in signals}
                
                for opp_data in opportunities_data:
                    try:
                        # Validate signal references
                        source_signals = opp_data.get('source_signals', [])
                        if not all(sig_id in valid_signal_ids for sig_id in source_signals):
                            logger.warning(f"Opportunity {opp_data.get('id')} has invalid signal references")
                            continue
                            
                        opportunity = Opportunity.create_from_llm_output(opp_data)
                        opportunities.append(opportunity)
                    except Exception as e:
                        logger.warning(f"Failed to create opportunity from LLM output: {e}")
                        continue
                
                if not opportunities:
                    raise ValueError("No valid opportunities generated")
                
                logger.info(f"Successfully generated {len(opportunities)} opportunities")
                return opportunities
                
            except Exception as e:
                logger.error(f"Opportunity generation attempt {attempt + 1} failed: {e}")
                if attempt == max_retries - 1:
                    raise
                continue
        
        raise ValueError("Failed to generate opportunities after all retries")
    
    async def assess_opportunity(self, opportunity: Opportunity) -> Assessment:
        """Assess a single opportunity using LCEL chain."""
        _, assessment_chain, _ = self.create_lcel_chains()
        if not assessment_chain:
            raise ValueError("LLM service not available")
        
        # Prepare opportunity text for LLM
        opp_text = f"Title: {opportunity.title}\nDescription: {opportunity.description}\nSource Signals: {', '.join(opportunity.source_signals)}"
        
        # Process with LCEL chain with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                logger.info(f"Assessing opportunity {opportunity.id} (attempt {attempt + 1}/{max_retries})")
                assessment_data = await assessment_chain.ainvoke({"opportunity": opp_text})
                
                # Create and validate assessment
                assessment = Assessment.create_from_llm_output(opportunity.id, assessment_data)
                logger.info(f"Successfully assessed opportunity {opportunity.id}")
                return assessment
                
            except Exception as e:
                logger.error(f"Assessment attempt {attempt + 1} failed for {opportunity.id}: {e}")
                if attempt == max_retries - 1:
                    raise
                continue
        
        raise ValueError(f"Failed to assess opportunity {opportunity.id} after all retries")
    
    async def generate_individual_portfolio(self, opportunity_title: str, opportunity_description: str, assessment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate individual portfolio for a specific opportunity."""
        _, _, portfolio_chain = self.create_lcel_chains()
        if not portfolio_chain:
            raise ValueError("LLM service not available")
        
        # Create individual portfolio prompt
        individual_portfolio_prompt = ChatPromptTemplate.from_template("""
You are a senior strategy consultant creating a detailed implementation plan for a specific opportunity.

OPPORTUNITY DETAILS:
Title: {opportunity_title}
Description: {opportunity_description}

ASSESSMENT SCORES:
- Desirability: {desirability_score}/10 - {desirability_reasoning}
- Feasibility: {feasibility_score}/10 - {feasibility_reasoning}  
- Viability: {viability_score}/10 - {viability_reasoning}

TASK: Create a comprehensive implementation specification for this specific opportunity.

OUTPUT FORMAT: Return ONLY valid JSON with this structure:
{{
  "executive_summary": {{
    "overview": "High-level summary of this opportunity and its strategic value",
    "business_impact": "Expected business impact and value creation for this opportunity",
    "strategic_alignment": "How this opportunity aligns with organizational goals",
    "implementation_priority": "Priority level and urgency for implementation"
  }},
  "implementation_roadmap": {{
    "phase_1": {{
      "timeline": "0-3 months",
      "key_activities": ["Specific activities for this opportunity in phase 1"],
      "milestones": ["Critical milestones and deliverables"],
      "success_criteria": ["Measurable success indicators for phase 1"]
    }},
    "phase_2": {{
      "timeline": "3-9 months",
      "key_activities": ["Specific activities for this opportunity in phase 2"],
      "milestones": ["Critical milestones and deliverables"],
      "success_criteria": ["Measurable success indicators for phase 2"]
    }},
    "phase_3": {{
      "timeline": "9-18 months",
      "key_activities": ["Specific activities for this opportunity in phase 3"],
      "milestones": ["Critical milestones and deliverables"],
      "success_criteria": ["Measurable success indicators for phase 3"]
    }}
  }},
  "resource_requirements": {{
    "human_resources": "Specific staffing needs, roles, and skill requirements for this opportunity",
    "budget_estimate": "Detailed budget requirements and cost breakdown",
    "technology_needs": "Technology infrastructure and tools needed",
    "external_support": "Consulting, vendor, or partnership requirements"
  }},
  "success_metrics": {{
    "financial_kpis": ["Revenue, cost savings, ROI metrics specific to this opportunity"],
    "operational_kpis": ["Efficiency, quality, performance metrics"],
    "strategic_kpis": ["Market position, innovation, capability metrics"]
  }},
  "risk_assessment": {{
    "implementation_risks": ["Specific risks for implementing this opportunity"],
    "mitigation_strategies": ["Concrete actions to address identified risks"],
    "contingency_plans": ["Alternative approaches if primary implementation fails"]
  }},
  "monitoring_plan": {{
    "review_schedule": "Regular review cadence and decision points",
    "key_indicators": ["Early warning indicators to monitor"],
    "escalation_criteria": ["When to escalate issues or make changes"]
  }}
}}

REQUIREMENTS:
- Focus specifically on this one opportunity, not a general portfolio
- Provide concrete, actionable recommendations
- Include specific timelines, metrics, and resource estimates
- Address both opportunities and risks for this specific initiative

IMPORTANT: Return ONLY the JSON object, no additional text or explanation.
""")
        
        # Create individual portfolio chain
        individual_chain = individual_portfolio_prompt | self.get_llm() | JsonOutputParser()
        
        # Process with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                logger.info(f"Generating individual portfolio for '{opportunity_title}' (attempt {attempt + 1}/{max_retries})")
                portfolio_data = await individual_chain.ainvoke({
                    "opportunity_title": opportunity_title,
                    "opportunity_description": opportunity_description,
                    "desirability_score": assessment_data.get('desirability_score', 0),
                    "desirability_reasoning": assessment_data.get('desirability_reasoning', ''),
                    "feasibility_score": assessment_data.get('feasibility_score', 0),
                    "feasibility_reasoning": assessment_data.get('feasibility_reasoning', ''),
                    "viability_score": assessment_data.get('viability_score', 0),
                    "viability_reasoning": assessment_data.get('viability_reasoning', '')
                })
                
                logger.info(f"Successfully generated individual portfolio for '{opportunity_title}'")
                return portfolio_data
                
            except Exception as e:
                logger.error(f"Individual portfolio generation attempt {attempt + 1} failed for '{opportunity_title}': {e}")
                if attempt == max_retries - 1:
                    raise
                continue
        
        raise ValueError(f"Failed to generate individual portfolio for '{opportunity_title}' after all retries")

    async def generate_portfolio(self, go_opportunities: List[str], hold_opportunities: List[str], dropped_opportunities: List[str]) -> Dict[str, Any]:
        """Generate final portfolio using LCEL chain."""
        _, _, portfolio_chain = self.create_lcel_chains()
        if not portfolio_chain:
            raise ValueError("LLM service not available")
        
        # Process with LCEL chain with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                logger.info(f"Generating portfolio (attempt {attempt + 1}/{max_retries})")
                portfolio_data = await portfolio_chain.ainvoke({
                    "go_opportunities": "\n".join(go_opportunities),
                    "hold_opportunities": "\n".join(hold_opportunities),
                    "dropped_opportunities": "\n".join(dropped_opportunities)
                })
                
                logger.info("Successfully generated portfolio")
                return portfolio_data
                
            except Exception as e:
                logger.error(f"Portfolio generation attempt {attempt + 1} failed: {e}")
                if attempt == max_retries - 1:
                    raise
                continue
        
        raise ValueError("Failed to generate portfolio after all retries")


# Global service instance
lcel_service = LCELService()