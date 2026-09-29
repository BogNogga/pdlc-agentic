# Agentic PDLC Signal to Portfolio Decisioning

A domain-agnostic workflow-based LLM application that transforms organizational signals into actionable opportunities through a step-by-step process with user interaction points.

## Overview

This system provides a complete pipeline from CSV signal loading to structured decision output, with progress visualization showing what's happening under the hood with checkmarks when steps complete. The architecture uses HTTP REST API for communication, LangChain LCEL chains for LLM processing, and a React/Vite frontend for progress visualization.

The application is designed to be domain-agnostic and can work with any type of organizational signals. The included sample data uses railway operational signals as an example, but the system can be adapted to any industry or domain.

## Features

- **CSV Signal Loading**: Load organizational signals from CSV files
- **AI-Powered Transformation**: Convert signals to opportunities using LangChain LCEL chains
- **Interactive Selection**: Select up to 10 most promising opportunities
- **Multi-Dimensional Assessment**: Evaluate opportunities across desirability, feasibility, and viability
- **Decision Making**: Make go/hold/drop decisions for each opportunity
- **Portfolio Generation**: Generate comprehensive portfolio specifications
- **Progress Tracking**: Visual progress indicators with step-by-step completion

## Architecture

- **Backend**: Python with FastAPI, LangChain LCEL, Pydantic
- **Frontend**: React with Vite, TypeScript, Tailwind CSS
- **State Management**: Simple session storage (Python dict or Redis)
- **Communication**: HTTP REST API with polling for progress
- **LLM Integration**: OpenRouter (default model `deepseek/deepseek-v4.1-flash`) via LangChain LCEL chains
- **Data Source**: CSV file for initial signals

## Prerequisites

- Python 3.11+
- Node.js 18+
- OpenRouter API key
- uv (Python package manager)

## Setup Instructions

### 1. Clone and Setup Python Backend

```bash
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Python dependencies
uv sync

# Install development dependencies (optional)
uv sync --group dev
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```bash
OPENROUTER_API_KEY=your_openrouter_api_key_here
# Optional: use a different OpenRouter model
# OPENROUTER_MODEL=deepseek/deepseek-v4.1-flash
# Optional: enable reasoning (low, medium or high). Off by default: ~3x slower and ~5x pricier per call.
# OPENROUTER_REASONING=low
```

### 3. Setup Frontend

```bash
cd frontend
npm install
```

### 4. Prepare Signal Data

The system loads signals from `data/signals.csv` in the project root. A sample file is included with organizational signal data. You can modify this file to include your own signals with the following columns:

- `content`: The signal description
- `category`: Signal category (e.g., "Customer Service", "Technology")
- `source`: Signal source (e.g., "Support Tickets", "Market Research")

## Running the Application

### Start the Backend Server

```bash
# Using the run script
uv run python run_server.py

# Or directly with uvicorn
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### Start the Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Usage

1. **Initialize Session**: The application automatically loads signals from `data/signals.csv`
2. **Run Analysis**: Click "Run Analysis" to generate opportunities from signals
3. **Select Opportunities**: Choose up to 10 most promising opportunities
4. **Assessment**: AI evaluates each opportunity (implementation in progress)
5. **Make Decisions**: Choose go/hold/drop for each opportunity (implementation in progress)
6. **Generate Portfolio**: AI creates final portfolio specifications (implementation in progress)

## API Endpoints

- `POST /api/sessions` - Create new workflow session
- `GET /api/sessions/{session_id}` - Get session data
- `POST /api/sessions/{session_id}/generate-opportunities` - Generate opportunities
- `POST /api/sessions/{session_id}/select-opportunities` - Select opportunities
- `GET /health` - Health check

## Development

### Running Tests

```bash
# Python tests
uv run pytest

# Frontend tests (when implemented)
cd frontend
npm test
```

### Code Structure

```
├── backend/
│   ├── __init__.py            # Backend package
│   ├── main.py                # FastAPI server + LCEL chains
│   └── models.py              # Pydantic data models
├── data/
│   └── signals.csv            # Signal data
├── tests/
│   ├── __init__.py
│   ├── data/                  # Test data files
│   └── test_models.py         # Model tests
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Main application
│   │   ├── api.ts             # API client
│   │   ├── types.ts           # TypeScript types
│   │   └── components/        # React components
│   └── package.json           # Frontend dependencies
├── run_server.py              # Server startup script
└── pyproject.toml             # Python dependencies
```

## Current Implementation Status

✅ **Completed:**
- Project structure and dependencies
- CSV signal loading
- LangChain LCEL chains for opportunity generation
- FastAPI REST API endpoints
- React frontend with progress visualization
- Opportunity selection interface

🚧 **In Progress:**
- Opportunity assessment with progress tracking
- Decision making interface
- Portfolio generation
- Final validation and approval

## Contributing

1. Follow the existing code structure and patterns
2. Add tests for new functionality
3. Update documentation for API changes
4. Use TypeScript for frontend development
5. Follow Python type hints for backend code

## License

This project is licensed under the MIT License.