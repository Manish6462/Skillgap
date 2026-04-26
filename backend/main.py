from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import json
import os
from dotenv import load_dotenv

import google.generativeai as genai
import pdfplumber

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI(title="SkillGap API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory session store (good enough for hackathon) ──────────────────────
sessions: dict = {}

# ── Models ───────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    jd_text: str
    resume_text: str

class ChatRequest(BaseModel):
    session_id: str
    message: str

class StartAssessmentRequest(BaseModel):
    session_id: str
    skill: str

# ── Helpers ───────────────────────────────────────────────────────────────────

def extract_pdf_text(file_bytes: bytes) -> str:
    import io
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)

def gemini_flash():
    return genai.GenerativeModel("gemini-2.5-flash")

def call_gemini(prompt: str):
    model = gemini_flash()

    try:
        response = model.generate_content(prompt)
        return response.text

    except Exception as e:
        error_msg = str(e).lower()

        # Quota exceeded (your current issue)
        if "quota" in error_msg or "resourceexhausted" in error_msg:
            return {"error": "API limit reached. Please try again later."}

        # Invalid API key
        elif "api key" in error_msg or "permission" in error_msg:
            return {"error": "Invalid API key. Please check configuration."}

        # Rate limit (temporary)
        elif "rate" in error_msg:
            return {"error": "Too many requests. Please wait and try again."}

        # Fallback
        return {"error": "Something went wrong. Please try again."}

def parse_json_from_llm(text: str) -> dict:
    """Strip markdown fences and parse JSON."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())

# ── Resource catalog (curated, no hallucination risk) ────────────────────────

RESOURCE_CATALOG = {
    "python": [
        {"title": "Python for Everybody", "url": "https://www.coursera.org/specializations/python", "level": "beginner", "hours": 40, "type": "course"},
        {"title": "Real Python Tutorials", "url": "https://realpython.com", "level": "intermediate", "hours": 20, "type": "tutorials"},
        {"title": "Build a REST API project", "url": "https://fastapi.tiangolo.com/tutorial/", "level": "intermediate", "hours": 10, "type": "project"},
    ],
    "javascript": [
        {"title": "The Odin Project", "url": "https://www.theodinproject.com", "level": "beginner", "hours": 60, "type": "course"},
        {"title": "javascript.info", "url": "https://javascript.info", "level": "intermediate", "hours": 20, "type": "tutorials"},
        {"title": "Build a Todo App with Vanilla JS", "url": "https://developer.mozilla.org/en-US/docs/Learn/JavaScript", "level": "beginner", "hours": 8, "type": "project"},
    ],
    "react": [
        {"title": "React Docs Official Tutorial", "url": "https://react.dev/learn", "level": "beginner", "hours": 15, "type": "docs"},
        {"title": "Full Stack Open (React section)", "url": "https://fullstackopen.com/en/", "level": "intermediate", "hours": 25, "type": "course"},
        {"title": "Build a GitHub profile viewer", "url": "https://github.com", "level": "intermediate", "hours": 10, "type": "project"},
    ],
    "sql": [
        {"title": "SQLZoo", "url": "https://sqlzoo.net", "level": "beginner", "hours": 10, "type": "interactive"},
        {"title": "Mode SQL Tutorial", "url": "https://mode.com/sql-tutorial/", "level": "intermediate", "hours": 8, "type": "tutorials"},
        {"title": "Build a query explorer project", "url": "https://github.com", "level": "intermediate", "hours": 12, "type": "project"},
    ],
    "machine learning": [
        {"title": "fast.ai Practical Deep Learning", "url": "https://course.fast.ai", "level": "intermediate", "hours": 30, "type": "course"},
        {"title": "Google ML Crash Course", "url": "https://developers.google.com/machine-learning/crash-course", "level": "beginner", "hours": 15, "type": "course"},
        {"title": "Kaggle Learn", "url": "https://www.kaggle.com/learn", "level": "beginner", "hours": 20, "type": "interactive"},
    ],
    "docker": [
        {"title": "Docker Official Get Started", "url": "https://docs.docker.com/get-started/", "level": "beginner", "hours": 5, "type": "docs"},
        {"title": "Play with Docker", "url": "https://labs.play-with-docker.com", "level": "beginner", "hours": 8, "type": "interactive"},
        {"title": "Containerize a Python app", "url": "https://docs.docker.com/language/python/", "level": "intermediate", "hours": 6, "type": "project"},
    ],
    "kubernetes": [
        {"title": "Kubernetes Official Tutorials", "url": "https://kubernetes.io/docs/tutorials/", "level": "intermediate", "hours": 20, "type": "docs"},
        {"title": "KillerCoda K8s Scenarios", "url": "https://killercoda.com/kubernetes", "level": "intermediate", "hours": 15, "type": "interactive"},
    ],
    "aws": [
        {"title": "AWS Cloud Practitioner Essentials", "url": "https://aws.amazon.com/training/learn-about/cloud-practitioner/", "level": "beginner", "hours": 12, "type": "course"},
        {"title": "A Cloud Guru free tier", "url": "https://acloudguru.com", "level": "intermediate", "hours": 20, "type": "course"},
    ],
    "system design": [
        {"title": "System Design Primer (GitHub)", "url": "https://github.com/donnemartin/system-design-primer", "level": "intermediate", "hours": 20, "type": "docs"},
        {"title": "Grokking System Design (free version)", "url": "https://github.com/sharanyaa/grok_sdi_educative", "level": "intermediate", "hours": 15, "type": "tutorials"},
    ],
    "typescript": [
        {"title": "TypeScript Official Handbook", "url": "https://www.typescriptlang.org/docs/", "level": "beginner", "hours": 10, "type": "docs"},
        {"title": "Execute Program TypeScript", "url": "https://www.executeprogram.com/courses/typescript", "level": "intermediate", "hours": 12, "type": "interactive"},
    ],
    "default": [
        {"title": "freeCodeCamp", "url": "https://www.freecodecamp.org", "level": "beginner", "hours": 20, "type": "course"},
        {"title": "The Odin Project", "url": "https://www.theodinproject.com", "level": "beginner", "hours": 40, "type": "course"},
        {"title": "MDN Web Docs", "url": "https://developer.mozilla.org", "level": "intermediate", "hours": 15, "type": "docs"},
    ]
}

def get_resources_for_skill(skill_name: str) -> list:
    skill_lower = skill_name.lower()
    for key in RESOURCE_CATALOG:
        if key in skill_lower or skill_lower in key:
            return RESOURCE_CATALOG[key]
    return RESOURCE_CATALOG["default"]

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "SkillGap API running"}

@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Extract text from uploaded PDF resume."""
    contents = await file.read()
    try:
        text = extract_pdf_text(contents)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF extraction failed: {str(e)}")

@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    """
    Parse resume + JD → structured skill profiles → gap report.
    Returns a session_id for subsequent assessment calls.
    """
    import uuid

    # Step 1: Parse resume
    resume_prompt = f"""Extract skills from this resume as structured JSON.

Resume:
{req.resume_text}

Return ONLY valid JSON (no markdown fences) in this exact format:
{{
  "name": "candidate name or Unknown",
  "years_experience": 0,
  "role_type": "inferred current role",
  "skills": [
    {{"name": "skill name", "level": "beginner|intermediate|advanced|expert", "evidence": "brief quote or context from resume"}}
  ]
}}

Extract up to 15 most relevant skills. Be conservative with levels — most people claiming 'expert' are 'advanced' at best."""

    
    result = call_gemini(resume_prompt)

    # Handle error response
    if isinstance(result, dict) and "error" in result:
        return result

    resume_data = parse_json_from_llm(result)

    # Step 2: Parse JD
    jd_prompt = f"""Extract required skills from this job description as structured JSON.

Job Description:
{req.jd_text}

Return ONLY valid JSON (no markdown fences) in this exact format:
{{
  "role_title": "job title",
  "company_type": "startup|enterprise|agency|unknown",
  "required_skills": [
    {{"name": "skill name", "required_level": "beginner|intermediate|advanced|expert", "priority": "must-have|nice-to-have"}}
  ]
}}

Focus on technical/measurable skills. Infer required levels from context (e.g. '5+ years' = advanced/expert)."""

    jd_data = parse_json_from_llm(call_gemini(jd_prompt))

    # Step 3: Gap analysis (pure logic, no LLM)
    level_map = {"beginner": 1, "intermediate": 2, "advanced": 3, "expert": 4}
    candidate_skills = {s["name"].lower(): s for s in resume_data.get("skills", [])}

    gaps = []
    for req_skill in jd_data.get("required_skills", []):
        skill_name = req_skill["name"]
        skill_lower = skill_name.lower()
        required_level = req_skill["required_level"]
        priority = req_skill.get("priority", "must-have")

        # Find best match in candidate skills
        candidate_match = None
        for cand_name, cand_data in candidate_skills.items():
            if skill_lower in cand_name or cand_name in skill_lower:
                candidate_match = cand_data
                break

        if candidate_match:
            cand_level = candidate_match["level"]
            req_num = level_map.get(required_level, 2)
            cand_num = level_map.get(cand_level, 1)
            gap_size = req_num - cand_num
            if gap_size > 1:
                severity = "critical"
            elif gap_size == 1:
                severity = "moderate"
            elif gap_size <= 0:
                severity = "none"
            else:
                severity = "minor"
        else:
            cand_level = "none"
            severity = "critical" if priority == "must-have" else "moderate"

        gaps.append({
            "skill": skill_name,
            "required_level": required_level,
            "candidate_level": cand_level,
            "severity": severity,
            "priority": priority,
            "evidence": candidate_match.get("evidence", "") if candidate_match else ""
        })

    # Sort: critical first, then moderate, then minor
    severity_order = {"critical": 0, "moderate": 1, "minor": 2, "none": 3}
    gaps.sort(key=lambda x: severity_order.get(x["severity"], 4))

    # Determine skills to assess (gaps that aren't 'none')
    skills_to_assess = [g["skill"] for g in gaps if g["severity"] != "none"][:5]

    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "candidate": resume_data,
        "jd": jd_data,
        "gaps": gaps,
        "skills_to_assess": skills_to_assess,
        "assessments": {},  # skill -> {score, conversation}
        "current_skill": None,
        "conversation_history": [],
        "assessment_complete": False,
    }

    return {
        "session_id": session_id,
        "candidate": resume_data,
        "jd": jd_data,
        "gaps": gaps,
        "skills_to_assess": skills_to_assess,
    }

@app.post("/api/start-assessment")
async def start_assessment(req: StartAssessmentRequest):
    """Begin assessment for a specific skill — returns first question."""
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    skill = req.skill
    session["current_skill"] = skill
    session["conversation_history"] = []

    candidate_level = "unknown"
    for gap in session["gaps"]:
        if gap["skill"].lower() == skill.lower():
            candidate_level = gap["candidate_level"]
            break

    system_prompt = f"""You are an expert technical interviewer assessing a candidate's proficiency in {skill}.

Candidate's claimed level: {candidate_level}
Role they're applying for: {session['jd'].get('role_title', 'unknown')}

Your job is to assess their ACTUAL proficiency through 3 targeted questions using this tier system:
- Tier 1 (Conceptual): Test understanding of core concepts
- Tier 2 (Applied): Test ability to solve real problems  
- Tier 3 (Edge cases): Test depth and experience with hard scenarios

Rules:
- Ask ONE question at a time. Never ask multiple questions.
- Keep questions concise and specific.
- After each answer, acknowledge briefly (1 sentence max), then ask the next question.
- After 3 questions, say exactly: "ASSESSMENT_COMPLETE" on its own line, then give a 1-sentence summary.
- Be conversational, not robotic. You are a friendly but rigorous interviewer.

Start with your Tier 1 question now. Do not introduce yourself. Just ask the question."""

    model = genai.GenerativeModel("gemini-2.5-flash", system_instruction=system_prompt)
    chat = model.start_chat()
    response = chat.send_message(f"Begin the {skill} assessment.")

    question = response.text.strip()
    session["conversation_history"] = [
        {"role": "model", "parts": question}
    ]
    session["_chat_obj"] = chat  # store chat object in session

    return {"question": question, "skill": skill, "tier": 1}

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """Send a candidate answer, get next question or assessment complete signal."""
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    chat = session.get("_chat_obj")
    if not chat:
        raise HTTPException(status_code=400, detail="No active assessment. Call /api/start-assessment first.")

    response = chat.send_message(req.message)
    reply = response.text.strip()

    session["conversation_history"].append({"role": "user", "parts": req.message})
    session["conversation_history"].append({"role": "model", "parts": reply})

    is_complete = "ASSESSMENT_COMPLETE" in reply
    clean_reply = reply.replace("ASSESSMENT_COMPLETE", "").strip()

    if is_complete:
        # Score this skill using a separate Gemini call
        history_text = "\n".join(
            f"{'Interviewer' if m['role'] == 'model' else 'Candidate'}: {m['parts']}"
            for m in session["conversation_history"]
        )
        score_prompt = f"""Based on this assessment conversation for the skill "{session['current_skill']}", 
rate the candidate's actual proficiency.

Conversation:
{history_text}

Return ONLY valid JSON (no markdown):
{{
  "skill": "{session['current_skill']}",
  "verified_level": "beginner|intermediate|advanced|expert|none",
  "score": 1-5,
  "strengths": ["one strength"],
  "gaps": ["one specific gap identified"],
  "summary": "2 sentence assessment summary"
}}"""
        score_data = parse_json_from_llm(call_gemini(score_prompt))
        session["assessments"][session["current_skill"]] = score_data

    return {
        "reply": clean_reply,
        "is_complete": is_complete,
        "assessment_data": session["assessments"].get(session["current_skill"]) if is_complete else None,
    }

@app.post("/api/generate-plan")
async def generate_plan(req: StartAssessmentRequest):
    """Generate personalized learning plan from completed assessments."""
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    assessments = session["assessments"]
    gaps = session["gaps"]
    candidate = session["candidate"]
    jd = session["jd"]

    # Build context for LLM
    assessment_summary = json.dumps(assessments, indent=2) if assessments else "No assessments completed yet."
    gap_summary = json.dumps([g for g in gaps if g["severity"] != "none"], indent=2)

    # Get resources for each gap skill
    skill_resources = {}
    for gap in gaps:
        if gap["severity"] != "none":
            skill_resources[gap["skill"]] = get_resources_for_skill(gap["skill"])

    plan_prompt = f"""Create a personalized learning plan for this candidate.

Candidate: {candidate.get('name', 'Candidate')}, {candidate.get('years_experience', 0)} years experience
Target role: {jd.get('role_title', 'Unknown')}

Skill gaps identified:
{gap_summary}

Assessment results (verified proficiency):
{assessment_summary}

Available resources per skill (use ONLY these, do not invent others):
{json.dumps(skill_resources, indent=2)}

Return ONLY valid JSON (no markdown):
{{
  "overview": "2-sentence personalized summary for this candidate",
  "time_to_ready_weeks": 12,
  "learning_paths": [
    {{
      "skill": "skill name",
      "current_level": "beginner",
      "target_level": "intermediate", 
      "priority": "critical|moderate|minor",
      "why": "1 sentence explaining why this skill matters for the role",
      "weeks_estimate": 4,
      "resources": [
        {{
          "title": "resource title from catalog",
          "url": "url from catalog",
          "type": "course|tutorials|project|docs|interactive",
          "hours": 20,
          "action": "what to do with this resource (1 sentence)"
        }}
      ],
      "bridge_skill": "adjacent skill to learn after this one (optional)"
    }}
  ]
}}

Prioritize critical gaps first. Only include skills with severity != none. Be specific and encouraging."""

    plan_data = parse_json_from_llm(call_gemini(plan_prompt))

    session["learning_plan"] = plan_data
    return plan_data

@app.get("/api/session/{session_id}")
def get_session(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    # Return session data without internal chat object
    return {k: v for k, v in session.items() if k not in ["_chat_obj"]}
