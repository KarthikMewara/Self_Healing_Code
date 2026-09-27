import os
import asyncio
import uuid
import json
import sqlite3

# 1. WINDOWS CACHE BYPASS (MUST BE AT THE VERY TOP)
local_cache_path = os.path.abspath("./hf_cache")
os.environ["HF_HOME"] = local_cache_path
os.environ["HF_DATASETS_CACHE"] = os.path.join(local_cache_path, "datasets")
os.environ["HF_HUB_CACHE"] = os.path.join(local_cache_path, "hub")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI
import chromadb
from chromadb.utils import embedding_functions

from typing import Optional
import urllib.request
import urllib.parse

# 1.1 LOAD GOOGLE OAUTH CREDENTIALS FROM google.env
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")

def load_google_env():
    global GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
    env_path = os.path.join(os.path.dirname(__file__), "google.env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        if k == "GOOGLE_CLIENT_ID":
                            GOOGLE_CLIENT_ID = v
                        elif k == "GOOGLE_CLIENT_SECRET":
                            GOOGLE_CLIENT_SECRET = v
        except Exception as err:
            print(f"[!] Error reading google.env: {err}")
    if GOOGLE_CLIENT_ID:
        os.environ["GOOGLE_CLIENT_ID"] = GOOGLE_CLIENT_ID
    if GOOGLE_CLIENT_SECRET:
        os.environ["GOOGLE_CLIENT_SECRET"] = GOOGLE_CLIENT_SECRET

load_google_env()

# 2. INITIALIZE SQLITE DATABASE FOR CHAT MEMORY & AUTH SESSIONS
def init_db():
    conn = sqlite3.connect("sessions.db")
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS chat_sessions
                 (session_id TEXT PRIMARY KEY,
                  original_code TEXT,
                  fixed_code TEXT,
                  explanation TEXT)''')
                  
    # Live Google & System Users
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id TEXT PRIMARY KEY,
                  email TEXT UNIQUE,
                  name TEXT,
                  picture TEXT,
                  provider TEXT DEFAULT 'google',
                  company_tenant TEXT DEFAULT 'Default Open-Source',
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  login_count INTEGER DEFAULT 1)''')
                  
    # Audit log of every sign-in
    c.execute('''CREATE TABLE IF NOT EXISTS login_logs
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id TEXT,
                  email TEXT,
                  name TEXT,
                  provider TEXT,
                  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

init_db()

app = FastAPI(title="Self-Healing Code Engine API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

omniroute_client = OpenAI(base_url="http://localhost:20128/v1", api_key="omniroute")
chroma_client = chromadb.PersistentClient(path="./chroma_db")
hf_embedder = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

# 3. API SCHEMAS
class SearchRequest(BaseModel):
    source_code: str
    error_trace: str

class HealRequest(BaseModel):
    language: str
    source_code: str
    error_trace: str
    user_context: str = ""

class ChatRequest(BaseModel):
    session_id: str
    message: str

# 4. EXISTING ENDPOINTS
@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/v1/training/stats")
async def get_training_stats():
    try:
        collection = chroma_client.get_collection("company_code_fixes")
        db_data = collection.get(include=["metadatas"])
        metadatas = db_data["metadatas"]
        python_count = sum(1 for m in metadatas if m.get("language") == "python")
        js_count = sum(1 for m in metadatas if m.get("language") == "javascript")
        syntax_errors = sum(1 for m in metadatas if m.get("category") == "syntax_error")
        return {
            "status": "success", "total_embedded_fixes": len(metadatas),
            "analytics": {
                "language_distribution": {"python": python_count, "javascript": js_count},
                "error_categories": {"syntax_failures": syntax_errors, "logic_optimizations": len(metadatas) - syntax_errors}
            }
        }
    except Exception:
        return {"status": "error"}

@app.post("/api/v1/search")
async def search_historical_fixes(request: SearchRequest):
    collection = chroma_client.get_collection(name="company_code_fixes", embedding_function=hf_embedder)
    search_query = f"Problem: {request.error_trace}\nCode: {request.source_code}"
    results = collection.query(query_texts=[search_query], n_results=3)
    return {"status": "success", "matches": results["documents"][0], "metadata": results["metadatas"][0]}

# 5. THE UPDATED HEALING ENDPOINT (NOW SAVES TO SQLITE)
@app.post("/api/v1/heal")
async def heal_code_stream(request: HealRequest):
    async def event_generator():
        yield f"event: status\ndata: {json.dumps({'step': 'retrieval', 'message': 'Searching company database...'})}\n\n"
        await asyncio.sleep(0.5)
        
        try:
            collection = chroma_client.get_collection("company_code_fixes", embedding_function=hf_embedder)
            search_query = f"Problem: {request.error_trace}\nCode: {request.source_code}"
            rag_results = collection.query(query_texts=[search_query], n_results=2)
            context_docs = "\n\n".join(rag_results["documents"][0])
            
            yield f"event: status\ndata: {json.dumps({'step': 'analysis', 'message': 'Context found. AI generating patch...'})}\n\n"
            
            system_prompt = f"You are an expert {request.language.upper()} code debugger. Follow the syntax and best practices of {request.language}. Output ONLY valid JSON with 'fixed_code' and 'explanation' keys."
            user_prompt = f"--- Context ---\n{context_docs}\n--- Code ---\n{request.source_code}\n--- Error ---\n{request.error_trace}"
            
            response = omniroute_client.chat.completions.create(
                model="auto",
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                temperature=0.1
            )
            
            ai_text = response.choices[0].message.content.strip()
            if ai_text.startswith("```json"):
                ai_text = ai_text.replace("```json", "", 1).removesuffix("```").strip()
                
            parsed_response = json.loads(ai_text)
            
            # UNIQUE TO STEP 5: SAVE THE SESSION TO THE DATABASE
            session_id_str = str(uuid.uuid4())
            fixed_code = parsed_response.get("fixed_code", "")
            explanation = parsed_response.get("explanation", "")
            
            conn = sqlite3.connect("sessions.db")
            c = conn.cursor()
            c.execute("INSERT INTO chat_sessions VALUES (?, ?, ?, ?)", (session_id_str, request.source_code, fixed_code, explanation))
            conn.commit()
            conn.close()
            
            complete_payload = {
                "session_id": session_id_str,
                "original_code": request.source_code,
                "fixed_code": fixed_code,
                "explanation": explanation
            }
            
            yield f"event: complete\ndata: {json.dumps(complete_payload)}\n\n"
            
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': f'Pipeline failed: {str(e)}'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# 6. THE NEW CHAT ENDPOINT
@app.post("/api/v1/chat")
async def follow_up_chat(request: ChatRequest):
    """Retrieves session memory and allows the user to ask questions about the fix."""
    try:
        # Pull the historical fix from the SQLite database
        conn = sqlite3.connect("sessions.db")
        c = conn.cursor()
        c.execute("SELECT original_code, fixed_code, explanation FROM chat_sessions WHERE session_id=?", (request.session_id,))
        row = c.fetchone()
        conn.close()

        if not row:
            return {"error": "Session not found."}

        orig_code, fixed_code, explanation = row

        # Inject the database memory into OmniRoute
        system_prompt = "You are a helpful coding assistant. You recently helped the user fix a bug. Use the provided context to answer their question."
        user_prompt = f"--- Original Code ---\n{orig_code}\n\n--- Fixed Code ---\n{fixed_code}\n\n--- Your Explanation ---\n{explanation}\n\n--- User's Follow-up Question ---\n{request.message}"

        response = omniroute_client.chat.completions.create(
            model="auto",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3
        )

        return {"reply_markdown": response.choices[0].message.content.strip()}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/v1/history")
async def get_history():
    """Fetches all past AI healing sessions for the frontend History table."""
    try:
        conn = sqlite3.connect("sessions.db")
        c = conn.cursor()
        # Fetch the session ID, original broken code, fixed code, and explanation
        c.execute("SELECT session_id, original_code, fixed_code, explanation FROM chat_sessions")
        rows = c.fetchall()
        conn.close()
        
        # Format it into a JSON array for the React table
        history_list = [
            {"session_id": r[0], "original_code": r[1], "fixed_code": r[2], "explanation": r[3]}
            for r in rows
        ]
        return {"status": "success", "data": history_list}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# 6. GOOGLE AUTH & USER SESSIONS TRACKING ENDPOINTS
class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None
    access_token: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None

class EmailLoginRequest(BaseModel):
    email: str
    name: Optional[str] = None
    provider: Optional[str] = "email"

def verify_google_identity(credential: Optional[str] = None, access_token: Optional[str] = None) -> dict:
    """Verifies Google ID token or Access Token against official Google OAuth2 APIs."""
    info = {}
    if credential:
        try:
            url = f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(credential)}"
            req = urllib.request.Request(url, headers={"User-Agent": "Self-Healing-Engine/1.0"})
            with urllib.request.urlopen(req, timeout=6) as resp:
                if resp.status == 200:
                    payload = json.loads(resp.read().decode())
                    info = {
                        "sub": payload.get("sub"),
                        "email": payload.get("email"),
                        "name": payload.get("name") or payload.get("email", "").split("@")[0],
                        "picture": payload.get("picture", "")
                    }
        except Exception as e:
            print(f"[!] ID token verification warning: {e}")

    if not info and access_token:
        try:
            url = "https://www.googleapis.com/oauth2/v3/userinfo"
            req = urllib.request.Request(url, headers={"Authorization": f"Bearer {access_token}", "User-Agent": "Self-Healing-Engine/1.0"})
            with urllib.request.urlopen(req, timeout=6) as resp:
                if resp.status == 200:
                    payload = json.loads(resp.read().decode())
                    info = {
                        "sub": payload.get("sub"),
                        "email": payload.get("email"),
                        "name": payload.get("name") or payload.get("email", "").split("@")[0],
                        "picture": payload.get("picture", "")
                    }
        except Exception as e:
            print(f"[!] Access token verification warning: {e}")

    return info

@app.get("/api/v1/auth/config")
async def get_auth_config():
    """Returns the Google Client ID from google.env so frontend stays dynamically synced."""
    return {
        "status": "success",
        "google_client_id": GOOGLE_CLIENT_ID,
        "configured": bool(GOOGLE_CLIENT_ID)
    }

@app.post("/api/v1/auth/google")
async def google_login(request: GoogleAuthRequest):
    """Authenticates a Google user via Google Token/Credential and records to SQLite sessions.db."""
    try:
        # Verify with Google API
        google_data = verify_google_identity(request.credential, request.access_token)
        
        email = google_data.get("email") or (request.email.strip().lower() if request.email else None)
        if not email:
            return {"status": "error", "message": "Failed to extract verified email from Google identity."}
            
        name = google_data.get("name") or request.name or email.split("@")[0].replace(".", " ").title()
        picture = google_data.get("picture") or request.picture or ""
        user_id = google_data.get("sub") or f"google_{uuid.uuid4().hex[:12]}"
        
        conn = sqlite3.connect("sessions.db")
        c = conn.cursor()
        
        # Upsert user record
        c.execute('''INSERT INTO users (id, email, name, picture, provider, last_login, login_count)
                     VALUES (?, ?, ?, ?, 'google', CURRENT_TIMESTAMP, 1)
                     ON CONFLICT(email) DO UPDATE SET
                        last_login = CURRENT_TIMESTAMP,
                        login_count = users.login_count + 1,
                        name = excluded.name,
                        picture = CASE WHEN excluded.picture != '' THEN excluded.picture ELSE users.picture END''',
                  (user_id, email, name, picture))
                  
        # Record audit log
        c.execute('''INSERT INTO login_logs (user_id, email, name, provider)
                     VALUES (?, ?, ?, 'google')''',
                  (user_id, email, name))
        conn.commit()
        
        c.execute("SELECT id, email, name, picture, provider, company_tenant, created_at, last_login, login_count FROM users WHERE email = ?", (email,))
        row = c.fetchone()
        conn.close()
        
        user_obj = {
            "id": row[0],
            "email": row[1],
            "name": row[2],
            "picture": row[3],
            "provider": row[4],
            "company_tenant": row[5],
            "created_at": row[6],
            "last_login": row[7],
            "login_count": row[8]
        }
        return {"status": "success", "user": user_obj}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/v1/auth/login")
async def standard_login(request: EmailLoginRequest):
    """Records an email or guest login into SQLite users & login_logs."""
    try:
        email = request.email.strip().lower()
        if not email:
            return {"status": "error", "message": "Email is required"}
            
        name = request.name or email.split("@")[0].replace(".", " ").title()
        user_id = f"usr_{uuid.uuid4().hex[:10]}"
        provider = request.provider or "email"
        
        conn = sqlite3.connect("sessions.db")
        c = conn.cursor()
        c.execute('''INSERT INTO users (id, email, name, picture, provider, last_login, login_count)
                     VALUES (?, ?, ?, '', ?, CURRENT_TIMESTAMP, 1)
                     ON CONFLICT(email) DO UPDATE SET
                        last_login = CURRENT_TIMESTAMP,
                        login_count = users.login_count + 1,
                        name = excluded.name''',
                  (user_id, email, name, provider))
                  
        c.execute('''INSERT INTO login_logs (user_id, email, name, provider)
                     VALUES (?, ?, ?, ?)''',
                  (user_id, email, name, provider))
        conn.commit()
        
        c.execute("SELECT id, email, name, picture, provider, company_tenant, created_at, last_login, login_count FROM users WHERE email = ?", (email,))
        row = c.fetchone()
        conn.close()
        
        return {
            "status": "success",
            "user": {
                "id": row[0], "email": row[1], "name": row[2], "picture": row[3],
                "provider": row[4], "company_tenant": row[5], "created_at": row[6],
                "last_login": row[7], "login_count": row[8]
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/v1/auth/users")
async def get_all_users():
    """Returns all registered users stored in SQLite sessions.db."""
    try:
        conn = sqlite3.connect("sessions.db")
        c = conn.cursor()
        c.execute("SELECT id, email, name, picture, provider, company_tenant, created_at, last_login, login_count FROM users ORDER BY last_login DESC")
        rows = c.fetchall()
        conn.close()
        
        users = [
            {
                "id": r[0], "email": r[1], "name": r[2], "picture": r[3],
                "provider": r[4], "company_tenant": r[5], "created_at": r[6],
                "last_login": r[7], "login_count": r[8]
            }
            for r in rows
        ]
        return {"status": "success", "total": len(users), "users": users}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/v1/auth/stats")
async def get_auth_statistics():
    """Returns aggregate login counts, active users, and login audit logs from sessions.db."""
    try:
        conn = sqlite3.connect("sessions.db")
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM users")
        total_users = c.fetchone()[0]
        
        c.execute("SELECT COUNT(*) FROM login_logs")
        total_logins = c.fetchone()[0]
        
        c.execute("SELECT id, user_id, email, name, provider, timestamp FROM login_logs ORDER BY timestamp DESC LIMIT 25")
        log_rows = c.fetchall()
        
        c.execute("SELECT id, email, name, picture, provider, company_tenant, created_at, last_login, login_count FROM users ORDER BY last_login DESC")
        user_rows = c.fetchall()
        conn.close()
        
        return {
            "status": "success",
            "total_users": total_users,
            "total_logins": total_logins,
            "recent_logs": [
                {"id": r[0], "user_id": r[1], "email": r[2], "name": r[3], "provider": r[4], "timestamp": r[5]}
                for r in log_rows
            ],
            "users": [
                {"id": r[0], "email": r[1], "name": r[2], "picture": r[3], "provider": r[4], "company_tenant": r[5], "created_at": r[6], "last_login": r[7], "login_count": r[8]}
                for r in user_rows
            ]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)