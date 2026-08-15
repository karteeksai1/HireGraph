import os
from functools import wraps
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import groq

load_dotenv()

from agent import graph, retrieve_question, get_chat_response, dry_run_code, warmup_model

app = FastAPI()

def handle_groq_exceptions(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)

        except groq.RateLimitError as e:
            print("\n========== GROQ RATE LIMIT ERROR ==========")
            print("ERROR:", repr(e))
            print("STATUS:", getattr(e, "status_code", None))
            print("BODY:", getattr(e, "body", None))

            if getattr(e, "response", None):
                print("HEADERS:", dict(e.response.headers))

            print("===========================================\n")

            raise HTTPException(
                status_code=429,
                detail=f"Groq API Rate Limit Exceeded: {str(e)}"
            )

        except groq.BadRequestError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid/Deprecated Groq Model Request: {str(e)}"
            )

        except groq.APIError as e:
            raise HTTPException(
                status_code=502,
                detail=f"Groq API Error: {str(e)}"
            )

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Internal Server Error: {str(e)}"
            )

    return wrapper

class GradeRequest(BaseModel):
    topic: str
    domain: str
    language: str
    user_code: str
    question_text: str = ""
    chat_history: list = []

class QuestionRequest(BaseModel):
    domain: str
    difficulty: str = "medium"
    previous_topic: str = ""

class ChatRequest(BaseModel):
    domain: str
    message: str
    chat_history: list = []
    question: str

class RunRequest(BaseModel):
    code: str
    language: str
    test_cases: list

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.post("/warmup")
@handle_groq_exceptions
async def warmup():
    return warmup_model()

@app.post("/question")
@handle_groq_exceptions
async def get_question(request: QuestionRequest):
    result = retrieve_question({"domain": request.domain, "difficulty": request.difficulty, "previous_topic": request.previous_topic})
    return result

@app.post("/grade")
@handle_groq_exceptions
async def evaluate_submission(request: GradeRequest):
    initial_state = {
        "topic": request.topic,
        "domain": request.domain,
        "language": request.language,
        "user_code": request.user_code,
        "chat_history": request.chat_history,
        "question_text": request.question_text or request.topic
    }
    result = graph.invoke(initial_state)
    return {
        "is_passed": result.get("is_passed", False),
        "score": result.get("score", 0),
        "metrics": result.get("metrics", {}),
        "feedback": result.get("feedback", "")
    }

@app.post("/chat")
@handle_groq_exceptions
async def handle_chat(request: ChatRequest):
    reply = get_chat_response(request.domain, request.chat_history, request.message, request.question)
    return {"reply": reply}

@app.post("/run")
@handle_groq_exceptions
async def handle_run(request: RunRequest):
    result = dry_run_code(request.code, request.language, request.test_cases)
    return result
