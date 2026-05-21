import os
import json
import random
from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from groq import Groq
from pinecone import Pinecone
from dotenv import load_dotenv
from huggingface_hub import InferenceClient

load_dotenv()

groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
INDEX_NAME = os.environ.get("PINECONE_INDEX", "hiregraph")
index = pc.Index(INDEX_NAME)
hf_client = InferenceClient(token=os.environ.get("HF_API_KEY"))

EMPTY_BOILERPLATES = {"python": "", "javascript": "", "java": "", "cpp": "", "sql": ""}

def parse_metadata_json(metadata: dict, key: str, fallback):
    value = metadata.get(key, fallback)
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return fallback
    return value if value is not None else fallback

def generate_boilerplates(domain: str, title: str):
    if domain == "sql":
        return {**EMPTY_BOILERPLATES, "sql": "-- Write your query here\n"}
    if domain == "dsa":
        return {
            "python": "class Solution:\n    def solve(self):\n        pass\n",
            "javascript": "function solve() {\n  // Write your solution here\n}\n",
            "java": "class Solution {\n    public void solve() {\n        // Write your solution here\n    }\n}\n",
            "cpp": "class Solution {\npublic:\n    void solve() {\n        // Write your solution here\n    }\n};\n",
            "sql": ""
        }
    return EMPTY_BOILERPLATES.copy()

def generate_test_cases(domain: str, question_text: str):
    if domain not in {"dsa", "sql"}:
        return []

    prompt = f"""
    Generate exactly 2 concise sample test cases for this {domain.upper()} interview question.
    Question: {question_text}

    Respond in strict JSON:
    {{"test_cases": [{{"input": "string", "expected_output": "string"}}]}}
    """
    try:
        response = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"}
        )
        parsed = json.loads(response.choices[0].message.content)
        test_cases = parsed.get("test_cases", [])
        if isinstance(test_cases, list):
            return [
                {
                    "input": str(case.get("input", "")),
                    "expected_output": str(case.get("expected_output", ""))
                }
                for case in test_cases
                if isinstance(case, dict)
            ]
    except Exception:
        pass
    return []

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

def get_embedding(text: str):
    response = hf_client.feature_extraction(
        text, 
        model="sentence-transformers/all-MiniLM-L6-v2"
    )
    res = response.tolist() if hasattr(response, "tolist") else response
    if isinstance(res, list) and len(res) > 0 and isinstance(res[0], list):
        return res[0]
    return res

def retrieve_question(state: dict):
    raw_domain = str(state.get("domain", "dsa")).lower().strip()
    raw_difficulty = str(state.get("difficulty", "medium")).lower().strip()
    
    difficulty = "medium"
    if "easy" in raw_difficulty:
        difficulty = "easy"
    elif "hard" in raw_difficulty:
        difficulty = "hard"
        
    domain = "dsa"
    if "front" in raw_domain or "react" in raw_domain:
        domain = "react"
    elif "system" in raw_domain:
        domain = "system_design"
    elif "sql" in raw_domain or "database" in raw_domain:
        domain = "sql"
    elif "data" in raw_domain or "dsa" in raw_domain:
        domain = "dsa"
    
    try:
        search_query = f"{domain} {difficulty} interview question"
        query_embedding = get_embedding(search_query)
        
        search_results = index.query(
            vector=query_embedding,
            top_k=10,
            filter={
                "domain": {"$eq": domain},
                "difficulty": {"$eq": difficulty}
            },
            include_metadata=True
        )
        
        if isinstance(search_results, dict):
            matches = search_results.get('matches', [])
        else:
            matches = getattr(search_results, 'matches', [])
            
        if not matches:
            return {
                "question_title": "Error", 
                "question_text": f"No question found matching domain '{domain}' and difficulty '{difficulty}'.", 
                "test_cases": [], 
                "boilerplates": EMPTY_BOILERPLATES.copy()
            }
            
        match_node = random.choice(matches)
        
        if isinstance(match_node, dict):
            match_metadata = match_node.get('metadata', {})
        else:
            match_metadata = getattr(match_node, 'metadata', {})
        
        question_title = match_metadata.get("title", "Unknown Title")
        question_text = match_metadata.get("text", "No description available.")
        test_cases = parse_metadata_json(match_metadata, "test_cases_json", [])
        boilerplates = parse_metadata_json(match_metadata, "boilerplates_json", None)

        if not boilerplates:
            boilerplates = generate_boilerplates(domain, question_title)
        if not test_cases:
            test_cases = generate_test_cases(domain, question_text)

        return {
            "question_title": question_title,
            "question_text": question_text,
            "optimal_time": match_metadata.get("optimal_time", "N/A"),
            "optimal_space": match_metadata.get("optimal_space", "N/A"),
            "test_cases": test_cases, 
            "boilerplates": boilerplates
        }
    except Exception as e:
        exact_error = f"AI service error: {type(e).__name__} -> {str(e)}"
        return {
            "question_title": "System Error", 
            "question_text": exact_error, 
            "test_cases": [], 
            "boilerplates": EMPTY_BOILERPLATES.copy()
        }

def grade_submission(state: InterviewState):
    user_code = state.get("user_code", "").strip()
    language = state.get("language", "python")
    history_array = state.get("chat_history", [])
    
    lines = [line.strip() for line in user_code.split("\n") if line.strip()]
    
    is_boilerplate = False
    if len(lines) <= 3:
        last_line = lines[-1] if lines else ""
        if last_line in ["pass", "return", "return 0", "return []", ""] or last_line.endswith(":"):
            is_boilerplate = True
            
    is_gibberish = False
    if len(user_code) < 10 or len(user_code.split()) < 2:
        is_gibberish = True
        
    if is_boilerplate or is_gibberish or not user_code:
        return {
            "is_passed": False,
            "score": 0,
            "metrics": {"time_complexity": "N/A", "space_complexity": "N/A", "code_quality": "N/A"},
            "feedback": "Submission rejected. The provided input does not contain a legitimate code implementation or structural logic."
        }

    history_text = "\n".join(history_array[-4:]) if history_array else "No previous history."
    
    prompt = f"""
    You are a technical interviewer focusing strictly on algorithmic logic and complexity. Evaluate this code.
    Language: {language.upper()}
    Question: {state.get('question_text')}
    
    CRITICAL GRADING RULES:
    1. DO NOT penalize for missing input validation
    2. DO NOT penalize for generic function or class names like "solve", "solution", "main", etc.
    3. Focus ONLY on the core algorithmic logic, time complexity, and space complexity.
    4. ABSOLUTE ZERO TOLERANCE FOR GIBBERISH: If the candidate's code is composed of random letters, nonsense terms, or lacks structural keywords essential to programming syntax, you MUST fail them instantly. Set "is_passed" to false, "score" to 0, and state in the feedback that the submission is invalid text.
    
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
            model="llama-3.1-8b-instant",
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
            model="llama-3.1-8b-instant"
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
            model="llama-3.1-8b-instant",
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
