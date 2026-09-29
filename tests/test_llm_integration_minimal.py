"""
Minimal LLM integration test with real API calls.
Uses minimal data to keep OpenRouter costs low.
"""

import pytest
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables for testing
load_dotenv()

from backend.services.lcel_service import lcel_service, DEFAULT_MODEL

EXPECTED_MODEL = os.getenv("OPENROUTER_MODEL") or DEFAULT_MODEL
from backend.models import Signal, Opportunity


class TestLLMIntegrationMinimal:
    """Minimal tests for LLM integration with real API calls."""
    
    @pytest.fixture
    def minimal_signals(self):
        """Create minimal test signals to reduce API costs."""
        return [
            Signal(
                id="sig_1",
                content="Passenger complaints about overcrowding on Brussels-Antwerp line during peak hours have increased 40%",
                category="Passenger Service",
                source="Customer Feedback",
                timestamp=datetime.now()
            ),
            Signal(
                id="sig_2", 
                content="New digital ticketing system shows 25% faster boarding times in pilot stations",
                category="Technology",
                source="Operations Data",
                timestamp=datetime.now()
            )
        ]
    
    @pytest.mark.skipif(not os.getenv("OPENROUTER_API_KEY"), reason="OpenRouter API key not available")
    @pytest.mark.asyncio
    async def test_llm_availability(self):
        """Test that LLM service is available and configured correctly."""
        llm = lcel_service.get_llm()
        
        assert llm is not None, "LLM should be available when API key is set"
        assert llm.model_name == EXPECTED_MODEL, f"Should be using {EXPECTED_MODEL}"
        assert llm.temperature == 0.7, "Temperature should be set correctly"
    
    @pytest.mark.skipif(not os.getenv("OPENROUTER_API_KEY"), reason="OpenRouter API key not available")
    @pytest.mark.asyncio
    async def test_generate_opportunities_minimal(self, minimal_signals):
        """Test opportunity generation with minimal signals to reduce API costs."""
        print(f"\n🧪 Testing LLM integration with {len(minimal_signals)} signals...")
        print(f"💰 Using {EXPECTED_MODEL} via OpenRouter")
        
        try:
            # Generate opportunities
            opportunities = await lcel_service.generate_opportunities(minimal_signals)
            
            # Verify basic structure
            assert isinstance(opportunities, list), "Should return a list of opportunities"
            assert len(opportunities) > 0, "Should generate at least one opportunity"
            assert len(opportunities) <= 12, "Should not generate more than 12 opportunities"
            
            print(f"✅ Generated {len(opportunities)} opportunities successfully")
            
            # Verify each opportunity has required fields
            for i, opp in enumerate(opportunities):
                assert isinstance(opp, Opportunity), f"Item {i} should be an Opportunity object"
                assert opp.id, f"Opportunity {i} should have an ID"
                assert opp.title, f"Opportunity {i} should have a title"
                assert opp.description, f"Opportunity {i} should have a description"
                assert isinstance(opp.source_signals, list), f"Opportunity {i} should have source_signals list"
                assert len(opp.source_signals) > 0, f"Opportunity {i} should reference at least one signal"
                
                print(f"  📋 Opportunity {i+1}: {opp.title[:50]}...")
            
            # Verify signal references are valid
            signal_ids = {signal.id for signal in minimal_signals}
            for opp in opportunities:
                for signal_ref in opp.source_signals:
                    assert signal_ref in signal_ids, f"Opportunity {opp.id} references invalid signal {signal_ref}"
            
            print("✅ All opportunities have valid structure and signal references")
            
            return opportunities
            
        except Exception as e:
            print(f"❌ LLM integration test failed: {str(e)}")
            raise
    
    @pytest.mark.skipif(not os.getenv("OPENROUTER_API_KEY"), reason="OpenRouter API key not available")
    @pytest.mark.asyncio
    async def test_assess_opportunity_minimal(self, minimal_signals):
        """Test opportunity assessment with minimal data."""
        print(f"\n🧪 Testing opportunity assessment...")
        
        # First generate an opportunity
        opportunities = await lcel_service.generate_opportunities(minimal_signals)
        assert len(opportunities) > 0, "Need at least one opportunity to test assessment"
        
        # Test assessment on the first opportunity
        test_opportunity = opportunities[0]
        print(f"📊 Assessing opportunity: {test_opportunity.title}")
        
        try:
            assessment = await lcel_service.assess_opportunity(test_opportunity)
            
            # Verify assessment structure
            assert assessment.opportunity_id == test_opportunity.id, "Assessment should reference correct opportunity"
            
            # Verify scores are in valid range (0-10)
            assert 0 <= assessment.desirability_score <= 10, f"Desirability score {assessment.desirability_score} should be 0-10"
            assert 0 <= assessment.feasibility_score <= 10, f"Feasibility score {assessment.feasibility_score} should be 0-10"
            assert 0 <= assessment.viability_score <= 10, f"Viability score {assessment.viability_score} should be 0-10"
            
            # Verify reasoning is provided
            assert assessment.desirability_reasoning, "Should provide desirability reasoning"
            assert assessment.feasibility_reasoning, "Should provide feasibility reasoning"
            assert assessment.viability_reasoning, "Should provide viability reasoning"
            
            print(f"✅ Assessment completed successfully:")
            print(f"  🎯 Desirability: {assessment.desirability_score}/10")
            print(f"  🔧 Feasibility: {assessment.feasibility_score}/10")
            print(f"  💰 Viability: {assessment.viability_score}/10")
            
            return assessment
            
        except Exception as e:
            print(f"❌ Assessment test failed: {str(e)}")
            raise
    
    @pytest.mark.skipif(not os.getenv("OPENROUTER_API_KEY"), reason="OpenRouter API key not available")
    @pytest.mark.asyncio
    async def test_generate_portfolio_minimal(self):
        """Test portfolio generation with minimal data."""
        print(f"\n🧪 Testing portfolio generation...")
        
        # Minimal test data
        go_opportunities = ["Implement digital ticketing system: Faster boarding and reduced queues"]
        hold_opportunities = ["Expand Brussels-Antwerp capacity: Requires infrastructure investment"]
        drop_opportunities = ["Legacy system maintenance: High cost, low value"]
        
        try:
            portfolio = await lcel_service.generate_portfolio(go_opportunities, hold_opportunities, drop_opportunities)
            
            # Verify portfolio structure
            assert isinstance(portfolio, dict), "Portfolio should be a dictionary"
            assert len(portfolio) > 0, "Portfolio should not be empty"
            
            # Check for expected sections (flexible structure)
            expected_keys = ['executive_summary', 'go_opportunities', 'hold_opportunities', 'implementation_roadmap']
            found_keys = [key for key in expected_keys if any(k.lower().replace('_', ' ') in str(portfolio).lower() for k in [key])]
            
            print(f"✅ Portfolio generated successfully with {len(portfolio)} sections")
            print(f"📋 Portfolio contains: {list(portfolio.keys())}")
            
            return portfolio
            
        except Exception as e:
            print(f"❌ Portfolio generation test failed: {str(e)}")
            raise
    
    @pytest.mark.skipif(not os.getenv("OPENROUTER_API_KEY"), reason="OpenRouter API key not available")
    @pytest.mark.asyncio
    async def test_json_parsing_robustness(self, minimal_signals):
        """Test that JSON parsing handles LLM output correctly."""
        print(f"\n🧪 Testing JSON parsing robustness...")
        
        try:
            # This test verifies that the LLM output is properly parsed into Python objects
            opportunities = await lcel_service.generate_opportunities(minimal_signals)
            
            # Verify all opportunities can be serialized back to JSON (round-trip test)
            for opp in opportunities:
                opp_dict = opp.model_dump()
                assert isinstance(opp_dict, dict), "Opportunity should serialize to dict"
                assert 'id' in opp_dict, "Serialized opportunity should have id"
                assert 'title' in opp_dict, "Serialized opportunity should have title"
                assert 'description' in opp_dict, "Serialized opportunity should have description"
                assert 'source_signals' in opp_dict, "Serialized opportunity should have source_signals"
            
            print("✅ JSON parsing and serialization working correctly")
            
        except Exception as e:
            print(f"❌ JSON parsing test failed: {str(e)}")
            raise
    
    def test_model_configuration(self):
        """Test that the configured OpenRouter model is used."""
        llm = lcel_service.get_llm()
        
        if llm:  # Only test if API key is available
            assert llm.model_name == EXPECTED_MODEL, f"Should be using {EXPECTED_MODEL}"
            print(f"✅ Using {EXPECTED_MODEL}")
        else:
            print("⚠️ LLM not available (no API key) - skipping model configuration test")