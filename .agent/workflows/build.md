---
description: Build and run EatSmart health management system
---
// turbo-all

## Backend Setup
1. Install Python dependencies
```bash
cd D:\EatSmart\backend && pip install -r requirements.txt
```
2. Initialize knowledge base vectors
```bash
cd D:\EatSmart\backend && python -m rag.loader
```
3. Start backend server
```bash
cd D:\EatSmart\backend && uvicorn main:app --reload --port 8000
```

## Frontend Setup
4. Install frontend dependencies
```bash
cd D:\EatSmart\frontend && npm install
```
5. Start frontend dev server
```bash
cd D:\EatSmart\frontend && npm run dev
```
