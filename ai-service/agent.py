import os
import json
from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

class InterviewState(TypedDict):
    domain: str
    difficulty: str
    topic: str
    language: str
    question_text: str
    user_code: str
    is_passed: bool
    score: int
    metrics: dict
    feedback: str
    chat_history: List[dict]

def retrieve_question(state: dict):
    domain = state.get("domain", "dsa")
    difficulty = state.get("difficulty", "medium")
    previous = state.get("previous_topic", "")
    
    avoid_clause = f"Do NOT ask about or generate a question related to: {previous}." if previous else ""
    
    prompt = f"""
    You possess an internal database of 100 standard software engineering interview questions for the domain: {domain.upper()}.
    Select ONE question from this database matching the difficulty level: {difficulty.upper()}.
    {avoid_clause}
    
    Return a strict JSON object with exactly these keys:
    "question_title": A short name for the question.
    "question_text": The full problem description.
    "optimal_time": The target time complexity.
    "optimal_space": The target space complexity.
    "optimal_data_structure": The target data structure.
    "test_cases": An array of exactly 2 JSON objects, each with "input" (string) and "expected_output" (string).
    "boilerplates": A JSON object containing starter code templates for the keys: "python", "javascript", "java", "cpp", "sql". Example for python: "class Solution:\n    def solve(self, nums):"
    """
    
    try:
        response = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        return {"question_title": "Error", "question_text": "Failed to generate.", "test_cases": [], "boilerplates": {"python": "", "javascript": "", "java": "", "cpp": "", "sql": ""}}

def grade_submission(state: InterviewState):
    user_code = state.get("user_code", "")
    language = state.get("language", "python")
    history_array = state.get("chat_history", [])
    
    history_text = "\n".join(history_array[-4:]) if history_array else "No previous history."
    
    prompt = f"""
    You are a technical interviewer focusing strictly on algorithmic logic and complexity. Evaluate this code.
    Language: {language.upper()}
    Question: {state.get('question_text')}
    
    CRITICAL GRADING RULES:
    1. DO NOT penalize for missing input validation (e.g., checking if an array is null, checking isinstance(), or validating data types). Assume inputs passed to the function are always perfectly valid.
    2. DO NOT penalize for generic function or class names like "solve", "solution", "main", etc.
    3. Focus ONLY on the core algorithmic logic, time complexity, and space complexity.
    
    Context:
    {history_text}
    
    Candidate Code:
    {user_code}
    
    Respond in strict JSON:
    "is_passed" (boolean),
    "score" (0-100),
    "metrics": {{"time_complexity": "...", "space_complexity": "...", "code_quality": "..."}},
    "feedback": "string"
    """
    
    try:
        response = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)
        return {
            "is_passed": result.get("is_passed", False),
            "score": result.get("score", 0),
            "metrics": result.get("metrics", {}),
            "feedback": result.get("feedback", "")
        }
    except Exception as e:
        return {"is_passed": False, "score": 0, "metrics": {}, "feedback": "System Error"}

def get_chat_response(domain: str, history: list, message: str, question: str):
    history_text = "\n".join(history[-4:]) if history else ""
    
    prompt = f"""
    You are a FAANG technical interviewer. The candidate is currently solving: {question}.
    Domain: {domain.upper()}
    
    Recent Chat:
    {history_text}
    
    Candidate Message: {message}
    
    Provide a helpful but brief hint or response. Do NOT give them the exact code answer. Keep it conversational.
    Respond in plain text.
    """
    
    try:
        response = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile"
        )
        return response.choices[0].message.content
    except:
        return "Connection interrupted. Recalibrate and transmit again."

def dry_run_code(code: str, language: str, test_cases: list):
    prompt = f"""
    You are a code execution engine. Dry-run the following {language.upper()} code against these test cases.
    Code:
    {code}
    
    Test Cases:
    {json.dumps(test_cases)}
    
    Return strict JSON with an array "results" containing objects with "actual_output" (string) and "passed" (boolean).
    """
    try:
        response = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except:
        return {"results": [{"actual_output": "Execution Error", "passed": False}, {"actual_output": "Execution Error", "passed": False}]}

graph_builder = StateGraph(InterviewState)
graph_builder.add_node("grade_submission", grade_submission)
graph_builder.set_entry_point("grade_submission")
graph_builder.add_edge("grade_submission", END)
graph = graph_builder.compile()