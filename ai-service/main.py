import os
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from agent import graph, retrieve_question, get_chat_response, dry_run_code

app = FastAPI()

class GradeRequest(BaseModel):
    topic: str
    domain: str
    language: str
    user_code: str
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

@app.post("/question")
async def get_question(request: QuestionRequest):
    result = retrieve_question({"domain": request.domain, "difficulty": request.difficulty, "previous_topic": request.previous_topic})
    return result

@app.post("/grade")
async def evaluate_submission(request: GradeRequest):
    initial_state = {
        "topic": request.topic,
        "domain": request.domain,
        "language": request.language,
        "user_code": request.user_code,
        "chat_history": request.chat_history,
        "question_text": request.topic 
    }
    result = graph.invoke(initial_state)
    return {
        "is_passed": result.get("is_passed", False),
        "score": result.get("score", 0),
        "metrics": result.get("metrics", {}),
        "feedback": result.get("feedback", "")
    }

@app.post("/chat")
async def handle_chat(request: ChatRequest):
    reply = get_chat_response(request.domain, request.chat_history, request.message, request.question)
    return {"reply": reply}

@app.post("/run")
async def handle_run(request: RunRequest):
    result = dry_run_code(request.code, request.language, request.test_cases)
    return result