# SkillGap AI

Conversational skill assessment + personalized learning plan generator.  
Built with React + FastAPI + Google Gemini Flash (free tier).

---

## Project structure

```
skillgap/
├── backend/
│   ├── main.py          # FastAPI app — all routes
│   ├── requirements.txt
│   ├── render.yaml      # One-click Render deploy config
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx            # Main app — all steps
    │   ├── api.js             # API client
    │   ├── index.js
    │   └── components/
    │       ├── GapReport.jsx      # Skill gap panel
    │       └── LearningPlan.jsx   # Learning plan output
    ├── public/index.html
    ├── package.json
    └── vercel.json
```

---

## Setup

### 1. Get a free Gemini API key

Go to https://aistudio.google.com/app/apikey → Create API key (free, no credit card).

### 2. Backend — run locally

```bash
cd backend
python -m venv venv
venv\Scripts\activate       
pip install -r requirements.txt

cp .env.example .env
# Edit .env and paste your GEMINI_API_KEY

uvicorn main:app --reload --port 8000
```

API is now running at http://localhost:8000  
Docs at http://localhost:8000/docs

### 3. Frontend — run locally

```bash
cd frontend
npm install
npm start
```

App opens at http://localhost:3000 (proxies API calls to :8000 automatically).

---

## Deploy to production (free)

### Backend → Render

1. Push this repo to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your repo, set root directory to `backend/`
4. Render auto-detects `render.yaml`
5. Add environment variable: `GEMINI_API_KEY` = your key
6. Deploy → copy the `https://your-app.onrender.com` URL

### Frontend → Vercel

1. Go to https://vercel.com → New Project → Import from GitHub
2. Set root directory to `frontend/`
3. Add environment variable: `REACT_APP_API_URL` = your Render URL (e.g. `https://skillgap-api.onrender.com`)
4. Deploy

---

## How it works

1. **Input** — Paste a job description + resume (or upload PDF)
2. **Analysis** — Gemini Flash parses both → structured skill profiles → gap report
3. **Assessment** — Click any skill gap → 3-question conversational assessment probes actual proficiency
4. **Learning plan** — Gaps + verified scores → personalized plan with curated resources + timelines

### Assessment tier system
- Tier 1 (Conceptual): "What is X?" — tests surface knowledge
- Tier 2 (Applied): "How would you use X to solve Y?" — tests practical skill
- Tier 3 (Edge): "What breaks when Z happens?" — tests depth and experience

### Scoring
Each skill gets a 1–5 score based on the conversation. The gap report updates live as assessments complete.

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/upload-pdf` | Extract text from PDF resume |
| POST | `/api/analyze` | Parse JD + resume → gap report + session |
| POST | `/api/start-assessment` | Begin 3-question assessment for a skill |
| POST | `/api/chat` | Send answer → get next question or completion |
| POST | `/api/generate-plan` | Generate personalized learning plan |
| GET  | `/api/session/{id}` | Get full session state |

---

## Edge cases handled

- **No quantifiable skills**: Falls back to open-ended project-based questions
- **Vague JD**: Infers likely technical skills from role title + industry  
- **Over-qualified candidate**: Detects when candidate exceeds requirements, flips to role-fit report
- **Entry-level**: Recalibrates rubric to foundational tier, shows time-to-ready estimate
- **Evasive answers**: Re-probes once, then marks as "unable to assess" with low confidence
- **PDF upload failure**: Graceful fallback to paste text

---

## Demo scenarios

Two sample files you can use for the live demo:

**Scenario A (dramatic gaps)** — Junior frontend dev applying for Senior Full Stack role.  
Shows: critical gaps in system design, DevOps, backend; strong learning plan with 16-week estimate.

**Scenario B (near fit)** — Mid-level Python developer applying for ML Engineer role.  
Shows: moderate gaps in ML frameworks; targeted 6-week upskilling plan.
