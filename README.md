# ClaimFlow — AI Insurance Claims Triage

ClaimFlow is an AI-powered claims triage system that automatically routes auto insurance collision claims to the correct adjuster queue based on deterministic risk assessment and fraud detection. Built as a Tenex AI Strategist engagement demonstration.

**Status:** In development

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Project Structure
- `backend/` - FastAPI application
- `frontend/` - React + Vite application
- `data/` - Synthetic claims and response data
- `tests/` - Accuracy and edge case tests
- `docs/` - Architecture and strategy documentation
- `presentation/` - Tenex engagement deck guide
- `outputs/` - Test reports and results
