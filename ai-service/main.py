import os
from fastapi import FastAPI
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv
from agent import graph
from agent import retrieve_question

load_dotenv()

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

personas = {
    "dsa": """
        You are a strict, senior FAANG software engineer conducting a technical coding interview.
        Do not give away the direct answer. 
        If their solution is suboptimal, point out the time or space complexity inefficiency.
        If they are stuck, provide a small hint about which data structure to use.
    """,
    "frontend": """
        You are a Lead Frontend Engineer conducting a React and Node.js interview.
        Do not give away the direct answer.
        Challenge the candidate on component re-rendering, hook dependencies, state management, and API integration.
        Ensure their code follows modern ES6+ and React best practices.
    """,
    "behavioral": """
        You are a strict but fair Engineering Manager conducting a behavioral interview.
        Do not let the candidate get away with vague answers.
        Force them to use the STAR method (Situation, Task, Action, Result).
        If they don't specify their exact personal contribution to a project, ask them to clarify.
    """
}

app = FastAPI()

class UserInput(BaseModel):
    message: str
    domain: str = "dsa" 

class GradeRequest(BaseModel):
    topic: str
    domain: str
    language: str
    user_code: str
    chat_history: list = []

class QuestionRequest(BaseModel):
    topic: str
    domain: str

@app.post("/question")
async def get_question(request: QuestionRequest):
    initial_state = {
        "domain": request.domain,
        "topic": request.topic,
        "language": "python",
        "user_code": "",
        "question_text": "",
        "optimal_time": "",
        "optimal_space": "",
        "optimal_data_structure": "",
        "is_passed": False,
        "feedback": "",
        "chat_history": []
    }
    
    result = retrieve_question(initial_state)
    return {"question": result.get("question_text", "Question not found.")}

@app.get("/")
def read_root():
    return {"status": "HireGraph AI Service is running"}

@app.post("/ask")
async def ask_ai(user_input: UserInput):
    system_prompt = personas.get(user_input.domain, personas["dsa"])
    
    dynamic_model = genai.GenerativeModel(
        model_name='gemini-2.5-flash',
        system_instruction=system_prompt
    )
    
    response = dynamic_model.generate_content(user_input.message)
    return {"reply": response.text}

@app.post("/grade")
async def evaluate_submission(request: GradeRequest):
    initial_state = {
        "topic": request.topic,
        "domain": request.domain,
        "language": request.language,
        "user_code": request.user_code,
        "chat_history": request.chat_history
    }
    
    result = graph.invoke(initial_state)
    
    return {
        "is_passed": result.get("is_passed", False),
        "score": result.get("score", 0),
        "metrics": result.get("metrics", {}),
        "feedback": result.get("feedback", "Error generating feedback.")
    }