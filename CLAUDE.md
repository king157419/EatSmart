# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EatSmart 健康管家** - An AI-powered health management system designed for diabetes patients recovering from acute pancreatitis. It helps users track meals, exercise, blood sugar, and provides personalized dietary advice.

## Development Commands

### Backend (FastAPI + Python)
```bash
# Install dependencies
cd backend && pip install -r requirements.txt

# Initialize knowledge base vectors (first time only)
cd backend && python -m rag.loader

# Start development server
cd backend && uvicorn main:app --reload --port 8000
```

### Frontend (Next.js)
```bash
# Install dependencies
cd frontend && npm install

# Start development server
cd frontend && npm run dev

# Build for production
cd frontend && npm run build

# Run linting
cd frontend && npm run lint
```

### Full Stack (Both servers)
```bash
# Terminal 1: Backend
cd D:\EatSmart\backend && uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd D:\EatSmart\frontend && npm run dev
```

## Environment Setup

Backend requires `.env` file in `backend/` directory:
```
DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here
OPENAI_API_KEY=sk-your-openai-api-key-here  # Optional, for embeddings
```

## Architecture

### Backend Structure (`backend/`)

```
backend/
├── main.py              # FastAPI entry point, API endpoints
├── config.py            # Centralized configuration
├── agents/
│   ├── chat_agent.py    # Main conversation agent (orchestrates RAG + memory)
│   └── record_agent.py  # Function-calling agent for extracting health data
├── rag/
│   ├── loader.py        # ChromaDB vector store builder
│   └── retriever.py     # RAG query interface
├── memory/
│   └── database.py      # SQLite async database for health records
├── food_db/
│   └── food_lookup.py   # Local Chinese food nutrition database
├── knowledge/           # Markdown knowledge base files
└── data/                # Persisted data (SQLite + ChromaDB)
```

### Key Data Flows

1. **Chat Flow** (`/api/chat`):
   - User message → `record_agent` extracts structured data via function calling
   - `retriever` performs RAG search on knowledge base
   - `database` fetches recent memory summary
   - DeepSeek LLM generates response with context

2. **Recording Flow** (`record_agent.py`):
   - Uses 6 function tools: `record_meal`, `record_exercise`, `record_sleep`, `record_blood_sugar`, `record_medication`, `record_feeling`
   - Local food database (`food_lookup.py`) provides accurate nutrition data when available
   - AI estimates nutrition for unknown foods

3. **RAG Flow** (`rag/retriever.py`):
   - ChromaDB stores vectorized knowledge base
   - Returns top-k chunks with source citations

### Frontend Structure (`frontend/`)

- Next.js 16 App Router (`src/app/`)
- Single-page chat interface with nutrition dashboard
- Real-time nutrition progress bars
- Recipe recommendation modal

## Critical Constraints

- **Fat intake < 30g/day** - Hard limit for pancreatitis patients
- **Carbs 150-250g/day** - Diabetes control
- Forbidden: fried foods, animal organs, alcohol, fatty meat, cream
- Allowed cooking methods: steaming, boiling, cold salad, low-oil stir-fry

## Long-Running Agent Harness (CRITICAL)

This project **strictly** follows [Anthropic's "Effective harnesses for long-running agents"](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents).

### Feature Tracking System

**ALWAYS maintain these files:**

1. **`features.json`** - JSON feature list with `passes` field:
   - `passes: 0` = pending/investigating
   - `passes: 1` = verified working
   - `passes: 2+` = needed multiple attempts (document why)

2. **`claude-progress.txt`** - Session-by-session progress log:
   - What was completed
   - What's in progress
   - Known issues (with solutions if found)
   - Test results
   - Next steps

### Session Start Protocol (MANDATORY)

**EVERY session MUST start with these steps:**

```bash
# 1. Confirm working directory
pwd

# 2. Check recent changes
git log --oneline -10

# 3. Read feature status
cat features.json

# 4. Read progress log
cat claude-progress.txt

# 5. Check if ports are occupied
netstat -ano | findstr :8000
netstat -ano | findstr :3000

# 6. Test backend health (if running)
curl http://localhost:8000/
```

### Before Marking Feature Complete (MANDATORY)

**NEVER say "完成" or "done" without:**

1. **Start the service** - Backend and/or frontend must be running
2. **Execute the feature** - Actually use the API/UI
3. **Verify the output** - Check the response/rendering is correct
4. **Update feature status** - Increment `passes` in `features.json`
5. **Log in progress file** - Document what was tested

**Example verification:**
```bash
# Test streaming chat
curl -X POST http://localhost:8000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "我今天吃了什么"}'

# Test recipe persistence
curl http://localhost:8000/api/recipe/saved
```

### Incremental Progress Rules

1. **One feature at a time** - Never batch multiple unrelated changes
2. **Test after each change** - Run the specific feature before moving on
3. **Commit working code only** - Each commit should leave codebase runnable
4. **Document failures immediately** - Add to `claude-progress.txt` if something breaks

### Port Management (Windows)

This project has frequent port conflicts. Always check before starting:

```bash
# Check what's using port 8000
netstat -ano | findstr :8000

# Kill all Python processes (if needed)
taskkill /F /IM python.exe

# Kill all Node processes (if needed)
taskkill /F /IM node.exe

# Delete Next.js cache (if frontend won't start)
rmdir /s /q frontend\.next
```

### Common Failure Modes (STRICTLY AVOID)

| Failure Mode | Symptom | Prevention |
|--------------|---------|------------|
| Declaring victory too early | Says "done" but feature doesn't work | ALWAYS test end-to-end first |
| Not reading progress file | Repeats same mistakes | Read `claude-progress.txt` at session start |
| Breaking existing features | New code breaks old functionality | Run basic flows after changes |
| Leaving bugs undocumented | Same bug appears again | Log in progress file with solution |
| Multiple processes on same port | "Address already in use" | Check ports before starting |
| Not updating feature status | Don't know what's working | Update `features.json` after verification |

### When Things Go Wrong

1. **Stop** - Don't continue adding code
2. **Diagnose** - Find the root cause (check logs, run tests)
3. **Fix** - Address the actual problem, not symptoms
4. **Document** - Add to `claude-progress.txt`
5. **Verify** - Test the fix works
6. **Continue** - Only then proceed with original task

### Example Session Workflow

```
1. Read features.json → See F11 (citation panel) has passes: 0
2. Read claude-progress.txt → See "citation panel not showing sources"
3. Check backend running → curl localhost:8000/
4. Implement fix → Modify chat_agent.py to filter sources
5. Test fix → Send chat message, check for citations
6. Update features.json → F11 passes: 1
7. Update progress.txt → "F11 verified - citations now showing"
8. Commit → "fix: add source relevance filter for citations"
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Main conversation endpoint (blocking) |
| POST | `/api/chat/stream` | Streaming chat with SSE (recommended) |
| POST | `/api/recipe` | Generate or get today's recipe (auto-saves) |
| GET | `/api/recipe/saved` | Get all saved recipes |
| DELETE | `/api/recipe/{id}` | Delete a saved recipe |
| GET | `/api/nutrition/today` | Today's nutrition summary |
| GET | `/api/nutrition/{date}` | Nutrition by date |
| GET | `/api/meals/today` | Today's meal records |
| GET | `/api/memory/summary` | 7-day health memory summary |
| PUT | `/api/nutrition/targets` | Update nutrition targets |
| POST | `/api/knowledge/reload` | Reload knowledge base |

## Database Schema

SQLite tables in `backend/data/memory.db`:
- `meals` - Food intake records with nutrition data
- `exercises` - Exercise records
- `sleep_records` - Sleep quality tracking
- `blood_sugar` - Blood glucose measurements
- `medications` - Medication tracking
- `body_feelings` - Subjective health notes
- `nutrition_targets` - Daily nutrition goals
- `saved_recipes` - Persisted daily recipes (id, recipe_date, title, content, created_at)
