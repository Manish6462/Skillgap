from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json, os, uuid, re
import httpx
from dotenv import load_dotenv

load_dotenv()

# ── LLM setup with fallback chain ─────────────────────────────────────────────
GEMINI_KEY  = os.getenv("GEMINI_API_KEY", "")
GROQ_KEY    = os.getenv("GROQ_API_KEY", "")
YOUTUBE_KEY = os.getenv("YOUTUBE_API_KEY", "AIzaSyCzaL1THvqeFFjryuQ9jY8K-BR-FKT_KSQ")

gemini_client = None
groq_client   = None

if GEMINI_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_KEY)
        gemini_client = genai
        print("✅ Gemini client ready")
    except Exception as e:
        print(f"⚠️  Gemini init failed: {e}")

if GROQ_KEY:
    try:
        from groq import Groq
        groq_client = Groq(api_key=GROQ_KEY)
        print("✅ Groq client ready")
    except Exception as e:
        print(f"⚠️  Groq init failed: {e}")

# PDF parser
try:
    import pdfplumber, io as _io
    def extract_pdf_text(file_bytes: bytes) -> str:
        with pdfplumber.open(_io.BytesIO(file_bytes)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    print("✅ PDF parser: pdfplumber")
except ImportError:
    try:
        import pypdf, io as _io
        def extract_pdf_text(file_bytes: bytes) -> str:
            reader = pypdf.PdfReader(_io.BytesIO(file_bytes))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        print("✅ PDF parser: pypdf")
    except ImportError:
        def extract_pdf_text(file_bytes: bytes) -> str:
            return file_bytes.decode("utf-8", errors="ignore")
        print("⚠️  No PDF parser — using raw text fallback")

app = FastAPI(title="SkillGap API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

sessions: dict = {}

# ── Pydantic models ───────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    jd_text: str
    resume_text: str

class ChatRequest(BaseModel):
    session_id: str
    message: str

class StartAssessmentRequest(BaseModel):
    session_id: str
    skill: str

class YouTubeRequest(BaseModel):
    skill: str
    level: str = "beginner"

# ── LLM helpers ───────────────────────────────────────────────────────────────
def call_llm(prompt: str) -> str:
    if gemini_client:
        try:
            model = gemini_client.GenerativeModel("gemini-2.0-flash")
            return model.generate_content(prompt).text
        except Exception as e:
            err = str(e).lower()
            if any(x in err for x in ["quota", "exhausted", "rate", "429"]):
                print("⚠️  Gemini quota hit — trying Groq")
            elif any(x in err for x in ["not found", "404"]):
                print("⚠️  Gemini model not found — trying Groq")
            else:
                print(f"⚠️  Gemini error: {e} — trying Groq")

    if groq_client:
        try:
            response = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
            )
            print("✅ Groq responded")
            return response.choices[0].message.content
        except Exception as e:
            print(f"⚠️  Groq error: {e} — using mock")

    print("⚠️  Using mock fallback — demo mode active")
    return _mock_response(prompt)

def call_llm_chat(messages: list) -> str:
    if gemini_client:
        try:
            system_msg = next((m["content"] for m in messages if m["role"] == "system"), "")
            history = [m for m in messages if m["role"] != "system"]
            model = gemini_client.GenerativeModel("gemini-2.0-flash", system_instruction=system_msg)
            gemini_history = [
                {"role": "user" if m["role"] == "user" else "model", "parts": [m["content"]]}
                for m in history[:-1]
            ]
            chat = model.start_chat(history=gemini_history)
            last_user = history[-1]["content"] if history and history[-1]["role"] == "user" else "Continue."
            return chat.send_message(last_user).text
        except Exception as e:
            print(f"⚠️  Gemini chat error: {e} — trying Groq")

    if groq_client:
        try:
            response = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.4,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"⚠️  Groq chat error: {e} — using mock")

    return _mock_chat_response(messages)

# ── Mock responses ────────────────────────────────────────────────────────────
def _mock_response(prompt: str) -> str:
    p = prompt.lower()
    if "extract skills from this resume" in p or ('"name":' in p and "years_experience" in p):
        return json.dumps({
            "name": "Demo Candidate", "years_experience": 2,
            "role_type": "Frontend Developer",
            "skills": [
                {"name": "React", "level": "intermediate", "evidence": "Built dashboards"},
                {"name": "JavaScript", "level": "intermediate", "evidence": "3 years experience"},
                {"name": "TypeScript", "level": "beginner", "evidence": "Some TypeScript"},
                {"name": "Python", "level": "beginner", "evidence": "Basic scripting"},
                {"name": "SQL", "level": "beginner", "evidence": "Basic queries"},
                {"name": "Docker", "level": "beginner", "evidence": "Read docs only"},
                {"name": "AWS", "level": "beginner", "evidence": "Deployed one script"},
            ]
        })
    if "extract required skills" in p or "role_title" in p:
        return json.dumps({
            "role_title": "Senior Full Stack Engineer", "company_type": "startup",
            "required_skills": [
                {"name": "React", "required_level": "expert", "priority": "must-have"},
                {"name": "TypeScript", "required_level": "advanced", "priority": "must-have"},
                {"name": "Python", "required_level": "advanced", "priority": "must-have"},
                {"name": "PostgreSQL", "required_level": "advanced", "priority": "must-have"},
                {"name": "Docker", "required_level": "advanced", "priority": "must-have"},
                {"name": "Kubernetes", "required_level": "advanced", "priority": "must-have"},
                {"name": "AWS", "required_level": "intermediate", "priority": "must-have"},
                {"name": "System Design", "required_level": "advanced", "priority": "must-have"},
            ]
        })
    if "verified_level" in p or ("score" in p and "strengths" in p):
        return json.dumps({
            "skill": "React", "verified_level": "intermediate", "score": 3,
            "strengths": ["Good understanding of hooks"],
            "gaps": ["Limited production-scale experience"],
            "summary": "Candidate shows solid React fundamentals but lacks depth in advanced patterns."
        })
    if "learning_paths" in p or "time_to_ready_weeks" in p:
        return json.dumps({
            "overview": "Strong frontend foundation. Focus on TypeScript, backend skills, and cloud infrastructure.",
            "time_to_ready_weeks": 16,
            "learning_paths": [
                {"skill": "TypeScript", "current_level": "beginner", "target_level": "advanced", "priority": "critical",
                 "why": "TypeScript is required at advanced level and foundational for this role.", "weeks_estimate": 4,
                 "resources": [{"title": "TypeScript Official Handbook", "url": "https://www.typescriptlang.org/docs/", "type": "docs", "hours": 10, "action": "Read chapters 1–6 and complete all exercises"}],
                 "bridge_skill": "Advanced React patterns"},
                {"skill": "System Design", "current_level": "none", "target_level": "advanced", "priority": "critical",
                 "why": "Senior engineers must architect systems.", "weeks_estimate": 5,
                 "resources": [{"title": "System Design Primer", "url": "https://github.com/donnemartin/system-design-primer", "type": "docs", "hours": 20, "action": "Work through the entire primer"}],
                 "bridge_skill": "Microservices and Docker"},
            ]
        })
    return json.dumps({"result": "processed", "message": "Demo mode active"})

_mock_questions = [
    "Can you explain what a React hook is and give an example of when you'd use useEffect?",
    "Walk me through how you would optimize a React component that is re-rendering too frequently.",
    "What happens when you call setState inside a useEffect with no dependency array?",
]

def _mock_chat_response(messages: list) -> str:
    user_turns = [m for m in messages if m.get("role") == "user"]
    turn = len(user_turns) - 1
    if turn < len(_mock_questions):
        return _mock_questions[turn]
    return "ASSESSMENT_COMPLETE\n\nThank you for your responses. Assessment recorded."

def parse_json_from_llm(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise

# ── Resource catalog ──────────────────────────────────────────────────────────
RESOURCE_CATALOG = {
    "python": [
        {"title": "Python for Everybody", "url": "https://www.coursera.org/specializations/python", "level": "beginner", "hours": 40, "type": "course"},
        {"title": "Real Python Tutorials", "url": "https://realpython.com", "level": "intermediate", "hours": 20, "type": "tutorials"},
        {"title": "Build a REST API project", "url": "https://fastapi.tiangolo.com/tutorial/", "level": "intermediate", "hours": 10, "type": "project"},
    ],
    "javascript": [
        {"title": "The Odin Project", "url": "https://www.theodinproject.com", "level": "beginner", "hours": 60, "type": "course"},
        {"title": "javascript.info", "url": "https://javascript.info", "level": "intermediate", "hours": 20, "type": "tutorials"},
    ],
    "react": [
        {"title": "React Docs Official Tutorial", "url": "https://react.dev/learn", "level": "beginner", "hours": 15, "type": "docs"},
        {"title": "Full Stack Open", "url": "https://fullstackopen.com/en/", "level": "intermediate", "hours": 25, "type": "course"},
    ],
    "sql": [
        {"title": "SQLZoo", "url": "https://sqlzoo.net", "level": "beginner", "hours": 10, "type": "interactive"},
        {"title": "Mode SQL Tutorial", "url": "https://mode.com/sql-tutorial/", "level": "intermediate", "hours": 8, "type": "tutorials"},
    ],
    "machine learning": [
        {"title": "fast.ai Practical Deep Learning", "url": "https://course.fast.ai", "level": "intermediate", "hours": 30, "type": "course"},
        {"title": "Google ML Crash Course", "url": "https://developers.google.com/machine-learning/crash-course", "level": "beginner", "hours": 15, "type": "course"},
        {"title": "Kaggle Learn", "url": "https://www.kaggle.com/learn", "level": "beginner", "hours": 20, "type": "interactive"},
    ],
    "docker": [
        {"title": "Docker Official Get Started", "url": "https://docs.docker.com/get-started/", "level": "beginner", "hours": 5, "type": "docs"},
        {"title": "Play with Docker", "url": "https://labs.play-with-docker.com", "level": "beginner", "hours": 8, "type": "interactive"},
    ],
    "kubernetes": [
        {"title": "Kubernetes Official Tutorials", "url": "https://kubernetes.io/docs/tutorials/", "level": "intermediate", "hours": 20, "type": "docs"},
        {"title": "KillerCoda K8s Scenarios", "url": "https://killercoda.com/kubernetes", "level": "intermediate", "hours": 15, "type": "interactive"},
    ],
    "aws": [
        {"title": "AWS Cloud Practitioner Essentials", "url": "https://aws.amazon.com/training/", "level": "beginner", "hours": 12, "type": "course"},
    ],
    "system design": [
        {"title": "System Design Primer", "url": "https://github.com/donnemartin/system-design-primer", "level": "intermediate", "hours": 20, "type": "docs"},
        {"title": "Grokking System Design", "url": "https://github.com/sharanyaa/grok_sdi_educative", "level": "intermediate", "hours": 15, "type": "tutorials"},
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

# ── YouTube search ────────────────────────────────────────────────────────────
async def fetch_youtube_videos(skill: str, level: str = "beginner") -> list:
    """Fetch top 3 YouTube tutorials for a skill from YouTube Data API v3."""
    level_query = {"beginner": "tutorial for beginners", "intermediate": "tutorial", "advanced": "advanced tutorial"}.get(level, "tutorial")
    query = f"{skill} {level_query}"

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": 3,
                "relevanceLanguage": "en",
                "videoDuration": "medium",  # 4–20 min — avoid too short/long
                "key": YOUTUBE_KEY,
            },
            timeout=10.0
        )
        resp.raise_for_status()
        data = resp.json()

    videos = []
    for item in data.get("items", []):
        vid_id  = item["id"]["videoId"]
        snippet = item["snippet"]
        videos.append({
            "videoId":      vid_id,
            "title":        snippet["title"],
            "channel":      snippet["channelTitle"],
            "thumbnail":    snippet["thumbnails"]["medium"]["url"],
            "url":          f"https://www.youtube.com/watch?v={vid_id}",
            "published":    snippet["publishedAt"][:10],
        })
    return videos

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    ai_status = "gemini" if gemini_client else ("groq" if groq_client else "mock")
    return {"status": "SkillGap API running", "ai_provider": ai_status}

@app.get("/api/health")
def health():
    return {
        "gemini": bool(gemini_client),
        "groq":   bool(groq_client),
        "youtube": bool(YOUTUBE_KEY),
        "mode":   "live" if (gemini_client or groq_client) else "demo",
    }

@app.post("/api/youtube")
async def youtube_search(req: YouTubeRequest):
    """Fetch YouTube tutorials for a skill — key stays server-side."""
    if not YOUTUBE_KEY:
        raise HTTPException(status_code=503, detail="YouTube API key not configured")
    try:
        videos = await fetch_youtube_videos(req.skill, req.level)
        return {"skill": req.skill, "videos": videos}
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"YouTube API error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"YouTube fetch failed: {str(e)}")

@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    contents = await file.read()
    try:
        text = extract_pdf_text(contents)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF extraction failed: {str(e)}")

@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    resume_prompt = f"""Extract skills from this resume as structured JSON.

Resume:
{req.resume_text}

Return ONLY valid JSON:
{{
  "name": "candidate name or Unknown",
  "years_experience": 0,
  "role_type": "inferred current role",
  "skills": [
    {{"name": "skill name", "level": "beginner|intermediate|advanced|expert", "evidence": "brief context"}}
  ]
}}
Extract up to 15 most relevant skills. Be conservative with levels."""

    jd_prompt = f"""Extract required skills from this job description as structured JSON.

Job Description:
{req.jd_text}

Return ONLY valid JSON:
{{
  "role_title": "job title",
  "company_type": "startup|enterprise|agency|unknown",
  "required_skills": [
    {{"name": "skill name", "required_level": "beginner|intermediate|advanced|expert", "priority": "must-have|nice-to-have"}}
  ]
}}"""

    try:
        resume_data = parse_json_from_llm(call_llm(resume_prompt))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume parsing failed: {str(e)}")

    try:
        jd_data = parse_json_from_llm(call_llm(jd_prompt))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"JD parsing failed: {str(e)}")

    level_map = {"beginner": 1, "intermediate": 2, "advanced": 3, "expert": 4}
    candidate_skills = {s["name"].lower(): s for s in resume_data.get("skills", [])}

    gaps = []
    for req_skill in jd_data.get("required_skills", []):
        skill_name     = req_skill["name"]
        skill_lower    = skill_name.lower()
        required_level = req_skill["required_level"]
        priority       = req_skill.get("priority", "must-have")

        candidate_match = None
        for cand_name, cand_data in candidate_skills.items():
            if skill_lower in cand_name or cand_name in skill_lower:
                candidate_match = cand_data
                break

        if candidate_match:
            cand_level = candidate_match["level"]
            gap_size   = level_map.get(required_level, 2) - level_map.get(cand_level, 1)
            severity   = "critical" if gap_size > 1 else "moderate" if gap_size == 1 else "none"
        else:
            cand_level = "none"
            severity   = "critical" if priority == "must-have" else "moderate"

        gaps.append({
            "skill":           skill_name,
            "required_level":  required_level,
            "candidate_level": cand_level,
            "severity":        severity,
            "priority":        priority,
            "evidence":        candidate_match.get("evidence", "") if candidate_match else "",
        })

    severity_order = {"critical": 0, "moderate": 1, "minor": 2, "none": 3}
    gaps.sort(key=lambda x: severity_order.get(x["severity"], 4))
    skills_to_assess = [g["skill"] for g in gaps if g["severity"] != "none"][:5]

    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "candidate":        resume_data,
        "jd":               jd_data,
        "gaps":             gaps,
        "skills_to_assess": skills_to_assess,
        "assessments":      {},
        "current_skill":    None,
        "conversation_history": [],
        "_system_prompt":   None,
    }

    return {
        "session_id":       session_id,
        "candidate":        resume_data,
        "jd":               jd_data,
        "gaps":             gaps,
        "skills_to_assess": skills_to_assess,
    }

@app.post("/api/start-assessment")
async def start_assessment(req: StartAssessmentRequest):
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    skill = req.skill
    session["current_skill"] = skill
    session["conversation_history"] = []

    candidate_level = next(
        (g["candidate_level"] for g in session["gaps"] if g["skill"].lower() == skill.lower()),
        "unknown"
    )

    system_prompt = f"""You are an expert technical interviewer assessing a candidate's proficiency in {skill}.

Candidate's claimed level: {candidate_level}
Role they are applying for: {session['jd'].get('role_title', 'unknown')}

Assess their ACTUAL proficiency through exactly 3 questions:
- Question 1 (Conceptual): Test core understanding
- Question 2 (Applied): Test practical problem-solving
- Question 3 (Edge case): Test depth and experience

Rules:
- Ask ONE question at a time.
- After each answer, give a brief acknowledgment (1 sentence), then ask the next question.
- After the 3rd answer, write exactly "ASSESSMENT_COMPLETE" on its own line, then give a 1-sentence summary.
- Be conversational and professional. Do not introduce yourself.

Start with Question 1 now."""

    session["_system_prompt"] = system_prompt
    messages = [
        {"role": "system",  "content": system_prompt},
        {"role": "user",    "content": f"Begin the {skill} assessment."}
    ]

    question = call_llm_chat(messages)
    session["conversation_history"] = [{"role": "assistant", "content": question}]

    return {"question": question, "skill": skill}

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    system_prompt = session.get("_system_prompt", "You are a technical interviewer.")
    session["conversation_history"].append({"role": "user", "content": req.message})

    messages = [{"role": "system", "content": system_prompt}] + session["conversation_history"]
    reply    = call_llm_chat(messages)
    session["conversation_history"].append({"role": "assistant", "content": reply})

    is_complete  = "ASSESSMENT_COMPLETE" in reply
    clean_reply  = reply.replace("ASSESSMENT_COMPLETE", "").strip()
    assessment_data = None

    if is_complete:
        history_text = "\n".join(
            f"{'Interviewer' if m['role']=='assistant' else 'Candidate'}: {m['content']}"
            for m in session["conversation_history"]
        )
        score_prompt = f"""Based on this assessment for "{session['current_skill']}", rate the candidate.

Conversation:
{history_text}

Return ONLY valid JSON:
{{
  "skill": "{session['current_skill']}",
  "verified_level": "beginner|intermediate|advanced|expert|none",
  "score": 3,
  "strengths": ["one strength"],
  "gaps": ["one gap"],
  "summary": "2 sentence assessment"
}}"""
        try:
            assessment_data = parse_json_from_llm(call_llm(score_prompt))
        except Exception:
            assessment_data = {
                "skill":          session["current_skill"],
                "verified_level": "intermediate",
                "score":          3,
                "strengths":      ["Demonstrated basic knowledge"],
                "gaps":           ["Needs more depth in advanced concepts"],
                "summary":        f"Candidate shows foundational knowledge of {session['current_skill']}."
            }
        session["assessments"][session["current_skill"]] = assessment_data

    return {"reply": clean_reply, "is_complete": is_complete, "assessment_data": assessment_data}

@app.post("/api/generate-plan")
async def generate_plan(req: StartAssessmentRequest):
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    assessments    = session["assessments"]
    gaps           = [g for g in session["gaps"] if g["severity"] != "none"]
    candidate      = session["candidate"]
    jd             = session["jd"]
    skill_resources = {g["skill"]: get_resources_for_skill(g["skill"]) for g in gaps}

    plan_prompt = f"""Create a personalized learning plan.

Candidate: {candidate.get('name','Candidate')}, {candidate.get('years_experience',0)} years experience
Target role: {jd.get('role_title','Unknown')}

Skill gaps:
{json.dumps(gaps, indent=2)}

Assessment results:
{json.dumps(assessments, indent=2) if assessments else "No assessments completed."}

Available resources per skill (use ONLY these):
{json.dumps(skill_resources, indent=2)}

Return ONLY valid JSON:
{{
  "overview": "2-sentence personalized summary",
  "time_to_ready_weeks": 12,
  "learning_paths": [
    {{
      "skill": "skill name",
      "current_level": "beginner",
      "target_level": "intermediate",
      "priority": "critical|moderate|minor",
      "why": "1 sentence why this matters",
      "weeks_estimate": 4,
      "resources": [
        {{"title": "from catalog", "url": "from catalog", "type": "course", "hours": 20, "action": "what to do"}}
      ],
      "bridge_skill": "optional next skill"
    }}
  ]
}}"""

    try:
        plan_data = parse_json_from_llm(call_llm(plan_prompt))
    except Exception:
        plan_data = {
            "overview": f"Based on the analysis, {candidate.get('name','the candidate')} needs to focus on bridging critical technical gaps.",
            "time_to_ready_weeks": 14,
            "learning_paths": [
                {
                    "skill":         g["skill"],
                    "current_level": g["candidate_level"],
                    "target_level":  g["required_level"],
                    "priority":      g["severity"],
                    "why":           f"{g['skill']} is a {g['priority']} requirement for this role.",
                    "weeks_estimate": 4 if g["severity"] == "critical" else 2,
                    "resources":     get_resources_for_skill(g["skill"])[:2],
                    "bridge_skill":  None,
                }
                for g in gaps[:4]
            ]
        }

    session["learning_plan"] = plan_data
    return plan_data

@app.get("/api/session/{session_id}")
def get_session(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {k: v for k, v in session.items() if not k.startswith("_")}
