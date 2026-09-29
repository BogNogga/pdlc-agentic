"""
Minimal end-to-end test with real API calls.
Tests the complete workflow with minimal data to verify integration.
"""

import os
import pytest
from fastapi.testclient import TestClient
from dotenv import load_dotenv

# Load environment variables for testing
load_dotenv()

from backend.main import app


class TestEndToEndMinimal:
    """Minimal end-to-end test with real LLM calls."""
    
    @pytest.fixture
    def client(self):
        """Create a test client for FastAPI app."""
        return TestClient(app)
    
    @pytest.mark.skipif(not os.getenv("OPENROUTER_API_KEY"), reason="OpenRouter API key not available")
    @pytest.mark.asyncio
    async def test_complete_workflow_minimal(self, client):
        """Test the complete workflow with minimal API calls."""
        print("\n🚀 Starting minimal end-to-end workflow test...")
        print("💰 Using the OpenRouter model with minimal selections to keep costs low")
        
        # Step 1: Create session
        print("\n📋 Step 1: Creating session...")
        response = client.post("/api/sessions")
        assert response.status_code == 200
        
        session_data = response.json()
        session_id = session_data["session_id"]
        signals_count = session_data["signals_count"]
        
        print(f"✅ Session created: {session_id}")
        print(f"📊 Loaded {signals_count} Belgian railway signals")
        
        # Step 2: Get session details
        print("\n📋 Step 2: Retrieving session details...")
        response = client.get(f"/api/sessions/{session_id}")
        assert response.status_code == 200
        
        session_details = response.json()
        assert session_details["current_step"] == "loaded"
        assert len(session_details["signals"]) == signals_count
        
        print(f"✅ Session details retrieved")
        print(f"📈 Current step: {session_details['current_step']}")
        
        # Step 3: Generate opportunities (REAL LLM CALL)
        print("\n🧠 Step 3: Generating opportunities with LLM...")
        response = client.post(f"/api/sessions/{session_id}/generate-opportunities")
        assert response.status_code == 200
        
        opportunities_data = response.json()
        opportunities_count = opportunities_data["count"]
        
        print(f"✅ Generated {opportunities_count} opportunities")
        print("📋 Sample opportunities:")
        for i, opp in enumerate(opportunities_data["opportunities"][:3]):  # Show first 3
            print(f"  {i+1}. {opp['title']}")
        
        # Step 4: Select opportunities
        print("\n🎯 Step 4: Selecting opportunities...")
        # Select first 2 opportunities to minimize assessment costs
        selected_ids = [opp["id"] for opp in opportunities_data["opportunities"][:2]]
        
        selection_request = {"selected_ids": selected_ids}
        response = client.post(f"/api/sessions/{session_id}/select-opportunities", json=selection_request)
        assert response.status_code == 200
        
        selection_data = response.json()
        print(f"✅ Selected {selection_data['selected_count']} opportunities for assessment")
        
        # Step 5: Assess opportunities (REAL LLM CALLS)
        print("\n📊 Step 5: Assessing opportunities with LLM...")
        response = client.post(f"/api/sessions/{session_id}/assess-opportunities")
        assert response.status_code == 200
        
        assessment_data = response.json()
        assessments_count = assessment_data["count"]
        
        print(f"✅ Completed {assessments_count} assessments")
        print("📈 Assessment scores:")
        for assessment in assessment_data["assessments"]:
            opp_id = assessment["opportunity_id"]
            desirability = assessment["desirability_score"]
            feasibility = assessment["feasibility_score"]
            viability = assessment["viability_score"]
            print(f"  {opp_id}: D={desirability}/10, F={feasibility}/10, V={viability}/10")
        
        # Step 6: Make decisions
        print("\n🎯 Step 6: Making strategic decisions...")
        decisions = []
        for assessment in assessment_data["assessments"]:
            # Simple decision logic: GO if average score > 7, HOLD if > 5, else DROP
            avg_score = (assessment["desirability_score"] + assessment["feasibility_score"] + assessment["viability_score"]) / 3
            
            if avg_score > 7:
                decision = "go"
            elif avg_score > 5:
                decision = "hold"
            else:
                decision = "drop"
            
            decisions.append({
                "opportunity_id": assessment["opportunity_id"],
                "decision": decision,
                "reasoning": f"Average score: {avg_score:.1f}/10"
            })
        
        response = client.post(f"/api/sessions/{session_id}/make-decisions", json=decisions)
        assert response.status_code == 200
        
        decisions_data = response.json()
        print(f"✅ Made {decisions_data['count']} strategic decisions")
        
        decision_summary = {}
        for decision in decisions_data["decisions"]:
            dec_type = decision["decision"]
            decision_summary[dec_type] = decision_summary.get(dec_type, 0) + 1
        
        print(f"📊 Decision summary: {decision_summary}")
        
        # Step 7: Generate portfolio (REAL LLM CALL)
        print("\n📋 Step 7: Generating portfolio with LLM...")
        response = client.post(f"/api/sessions/{session_id}/generate-portfolio")
        assert response.status_code == 200
        
        portfolio_data = response.json()
        portfolio = portfolio_data["portfolio"]
        
        print(f"✅ Portfolio generated successfully")
        print(f"📋 Portfolio sections: {list(portfolio.keys())}")
        
        # Step 8: Final session verification
        print("\n🔍 Step 8: Final session verification...")
        response = client.get(f"/api/sessions/{session_id}")
        assert response.status_code == 200
        
        final_session = response.json()
        assert final_session["current_step"] == "portfolio_ready"
        assert len(final_session["opportunities"]) == opportunities_count
        assert len(final_session["assessments"]) == assessments_count
        assert len(final_session["decisions"]) == len(decisions)
        assert final_session["final_portfolio"] is not None
        
        print(f"✅ Final session state verified")
        print(f"📈 Final step: {final_session['current_step']}")
        
        print("\n🎉 Complete workflow test PASSED!")
        print("💰 Total LLM calls made: ~3 (opportunities + assessments + portfolio)")
        print("🚀 All data parsing and integration working correctly")
        
        return {
            "session_id": session_id,
            "signals_count": signals_count,
            "opportunities_count": opportunities_count,
            "assessments_count": assessments_count,
            "decisions_count": len(decisions),
            "portfolio_sections": len(portfolio)
        }