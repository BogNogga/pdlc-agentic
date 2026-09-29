"""
API routes for the Signal-to-Opportunity Analysis system.
Contains all FastAPI endpoint definitions.
"""

import asyncio
import logging
from typing import List
from datetime import datetime

from fastapi import APIRouter, HTTPException, status
from pydantic import ValidationError

from ..models import (
    SessionCreateResponse, OpportunityGenerationResponse,
    OpportunitySelectionRequest, OpportunitySelectionResponse,
    Decision
)
from ..services.csv_service import csv_service
from ..services.lcel_service import lcel_service
from ..services.session_service import session_service

logger = logging.getLogger(__name__)

# Create API router
router = APIRouter(prefix="/api")


@router.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Signal-to-Opportunity Analysis API",
        "version": "0.1.0",
        "docs": "/docs"
    }


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    llm_status = "available" if lcel_service.get_llm() else "unavailable"
    return {
        "status": "healthy",
        "llm_status": llm_status,
        "active_sessions": session_service.get_session_count(),
        "timestamp": datetime.now().isoformat()
    }


@router.get("/validate-csv")
async def validate_csv_file(csv_path: str = "data/signals.csv"):
    """
    Validate CSV file structure and content without creating a session.
    Useful for debugging and validation purposes.
    """
    return csv_service.validate_csv_file(csv_path)


@router.post("/sessions", response_model=SessionCreateResponse)
async def create_session():
    """Create a new workflow session and load signals from CSV."""
    try:
        # Load signals from CSV file with enhanced error handling
        signals = []
        csv_load_message = ""
        
        try:
            signals = csv_service.load_signals_from_csv("data/signals.csv")
            csv_load_message = f"Successfully loaded {len(signals)} signals from CSV"
            logger.info(csv_load_message)
            
        except FileNotFoundError:
            csv_load_message = "CSV file not found, creating empty session"
            logger.warning(csv_load_message)
            
        except ValueError as e:
            csv_load_message = f"CSV validation error: {str(e)}"
            logger.error(csv_load_message)
            # For validation errors, we might want to return an error instead of empty session
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=csv_load_message
            )
            
        except Exception as e:
            csv_load_message = f"Unexpected error loading CSV: {str(e)}"
            logger.error(csv_load_message)
            # Continue with empty signals list for unexpected errors
        
        # Create session using session service
        session = session_service.create_session(signals)
        
        return SessionCreateResponse(
            session_id=session.session_id,
            signals_count=len(signals),
            message=csv_load_message
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Session creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Session creation failed: {str(e)}"
        )


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get session data and current status."""
    try:
        return session_service.get_session_summary(session_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/sessions/{session_id}/generate-opportunities", response_model=OpportunityGenerationResponse)
async def generate_opportunities(session_id: str):
    """Generate opportunities from signals using LCEL chain."""
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if not session.signals:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No signals available for opportunity generation"
        )
    
    try:
        # Update status to in progress FIRST
        session.current_step = "generating_opportunities"
        session_service.update_session_step_status(session_id, "generate_opportunities", "in_progress")
        
        # Generate opportunities using LCEL service
        opportunities = await lcel_service.generate_opportunities(session.signals)
        
        # Update session with generated opportunities
        session_service.update_session_opportunities(session_id, opportunities)
        
        logger.info(f"Generated {len(opportunities)} opportunities for session {session_id}")
        
        return OpportunityGenerationResponse(
            opportunities=[opp.model_dump() for opp in opportunities],
            count=len(opportunities),
            message=f"Generated {len(opportunities)} opportunities successfully"
        )
        
    except ValueError as e:
        session_service.update_session_step_status(session_id, "generate_opportunities", "failed")
        if "LLM service not available" in str(e):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLM service not available. Please set OPENROUTER_API_KEY environment variable."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )
    except Exception as e:
        logger.error(f"Opportunity generation failed: {e}")
        session_service.update_session_step_status(session_id, "generate_opportunities", "failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Opportunity generation failed: {str(e)}"
        )


@router.post("/sessions/{session_id}/select-opportunities", response_model=OpportunitySelectionResponse)
async def select_opportunities(session_id: str, request: OpportunitySelectionRequest):
    """Select up to 10 opportunities for assessment."""
    try:
        session_service.update_session_selection(session_id, request.selected_ids)
        
        logger.info(f"Selected {len(request.selected_ids)} opportunities for session {session_id}")
        
        return OpportunitySelectionResponse(
            selected_count=len(request.selected_ids),
            message=f"Selected {len(request.selected_ids)} opportunities for assessment"
        )
        
    except ValueError as e:
        if "Session" in str(e) and "not found" in str(e):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )


@router.post("/sessions/{session_id}/assess-opportunities")
async def assess_opportunities(session_id: str):
    """Assess selected opportunities using LCEL chain."""
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if not session.selected_opportunity_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No opportunities selected for assessment"
        )
    
    try:
        # Update status to in progress FIRST
        session.current_step = "assessing_opportunities"
        session_service.update_session_step_status(session_id, "assess_opportunities", "in_progress")
        
        # Assess all selected opportunities concurrently; each LLM call takes several seconds
        opportunities_by_id = {o.id: o for o in session.opportunities}
        selected = [opportunities_by_id[opp_id] for opp_id in session.selected_opportunity_ids if opp_id in opportunities_by_id]
        results = await asyncio.gather(
            *(lcel_service.assess_opportunity(opp) for opp in selected),
            return_exceptions=True
        )

        assessments = []
        errors = []

        for opp, result in zip(selected, results):
            if isinstance(result, BaseException):
                error_msg = f"Failed to assess opportunity {opp.id}: {str(result)}"
                logger.error(error_msg)
                errors.append(error_msg)
            else:
                assessments.append(result)
        
        if not assessments:
            raise ValueError("Failed to assess any opportunities")
        
        # Update session with assessments
        session_service.update_session_assessments(session_id, assessments)
        
        response_data = {
            "assessments": [a.model_dump() for a in assessments],
            "count": len(assessments),
            "message": f"Assessed {len(assessments)} opportunities successfully"
        }
        
        if errors:
            response_data["errors"] = errors
        
        return response_data
        
    except ValueError as e:
        session_service.update_session_step_status(session_id, "assess_opportunities", "failed")
        if "LLM service not available" in str(e):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLM service not available. Please set OPENROUTER_API_KEY environment variable."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )
    except Exception as e:
        logger.error(f"Assessment failed: {e}")
        session_service.update_session_step_status(session_id, "assess_opportunities", "failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Assessment failed: {str(e)}"
        )


@router.post("/sessions/{session_id}/make-decisions")
async def make_decisions(session_id: str, decisions: List[dict]):
    """Record user decisions for assessed opportunities."""
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    try:
        decision_objects = []
        for decision_data in decisions:
            # Validate required fields
            if "opportunity_id" not in decision_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing required field: opportunity_id"
                )
            if "decision" not in decision_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing required field: decision"
                )
            
            decision = Decision(
                opportunity_id=decision_data["opportunity_id"],
                decision=decision_data["decision"],
                reasoning=decision_data.get("reasoning", "")
            )
            decision_objects.append(decision)
        
        # Update session with decisions
        session_service.update_session_decisions(session_id, decision_objects)
        
        return {
            "decisions": [d.model_dump() for d in decision_objects],
            "count": len(decision_objects),
            "message": f"Recorded {len(decision_objects)} decisions successfully"
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions (like validation errors above)
        raise
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid decision data: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Decision recording failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Decision recording failed: {str(e)}"
        )


@router.post("/sessions/{session_id}/generate-portfolio")
async def generate_portfolio(session_id: str):
    """Generate final portfolio using LCEL chain."""
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    try:
        # Update status to in progress FIRST
        session.current_step = "generating_portfolio"
        session_service.update_session_step_status(session_id, "generate_portfolio", "in_progress")
        
        # Collect GO opportunities that have an assessment
        go_items = []

        for decision in session.decisions:
            if decision.decision == "go":
                opp = next((o for o in session.opportunities if o.id == decision.opportunity_id), None)
                assessment = next((a for a in session.assessments if a.opportunity_id == decision.opportunity_id), None)

                if opp and assessment:
                    go_items.append((opp, assessment))

        # Generate the individual portfolios concurrently; each LLM call takes several seconds
        portfolios = await asyncio.gather(*(
            lcel_service.generate_individual_portfolio(
                opp.title,
                opp.description,
                {
                    'desirability_score': assessment.desirability_score,
                    'desirability_reasoning': assessment.desirability_reasoning,
                    'feasibility_score': assessment.feasibility_score,
                    'feasibility_reasoning': assessment.feasibility_reasoning,
                    'viability_score': assessment.viability_score,
                    'viability_reasoning': assessment.viability_reasoning
                }
            )
            for opp, assessment in go_items
        ))

        individual_portfolios = {opp.id: portfolio for (opp, _), portfolio in zip(go_items, portfolios)}
        
        # Create final portfolio structure with individual portfolios
        portfolio_data = {
            "individual_portfolios": individual_portfolios,
            "summary": {
                "total_go_opportunities": len([d for d in session.decisions if d.decision == "go"]),
                "total_hold_opportunities": len([d for d in session.decisions if d.decision == "hold"]),
                "total_drop_opportunities": len([d for d in session.decisions if d.decision == "drop"])
            }
        }
        
        # Update session with portfolio
        session_service.update_session_portfolio(session_id, portfolio_data)
        
        return {
            "portfolio": portfolio_data,
            "message": "Individual portfolios generated successfully"
        }
        
    except ValueError as e:
        session_service.update_session_step_status(session_id, "generate_portfolio", "failed")
        if "LLM service not available" in str(e):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLM service not available. Please set OPENROUTER_API_KEY environment variable."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )
    except Exception as e:
        logger.error(f"Portfolio generation failed: {e}")
        session_service.update_session_step_status(session_id, "generate_portfolio", "failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Portfolio generation failed: {str(e)}"
        )