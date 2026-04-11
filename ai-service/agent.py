import os
import json
import time
from typing import TypedDict, List
from dotenv import load_dotenv
from google import genai
from pinecone import Pinecone
from langgraph.graph import StateGraph, END
from groq import Groq

load_dotenv()

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
index = pc.Index("hiregraph-dsa-v2")
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

class InterviewState(TypedDict):
    domain: str
    topic: str
    language: str
    question_text: str
    optimal_time: str
    optimal_space: str
    optimal_data_structure: str
    user_code: str
    is_passed: bool
    score: int         
    metrics: dict       
    feedback: str
    chat_history: List[dict]

def retrieve_question(state: InterviewState):
    topic_query = state.get("topic", "Linked Lists")
    domain_query = state.get("domain", "dsa")
    
    embedding_response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=topic_query
    )
    
    query_vector = embedding_response.embeddings[0].values
    
    search_results = index.query(
        vector=query_vector,
        top_k=1,
        namespace=domain_query,
        include_metadata=True
    )
    
    if not search_results['matches']:
        return {
            "question_text": f"Could not find a specific question for {topic_query} in the {domain_query} domain.",
            "optimal_time": "N/A",
            "optimal_space": "N/A",
            "optimal_data_structure": "N/A"
        }
        
    metadata = search_results['matches'][0]['metadata']
    
    return {
        "question_text": metadata.get("question", ""),
        "optimal_time": metadata.get("optimal_time", ""),
        "optimal_space": metadata.get("optimal_space", ""),
        "optimal_data_structure": metadata.get("optimal_data_structure", "")
    }

def grade_submission(state: InterviewState):
    user_code = state.get("user_code", "")
    language = state.get("language", "python")
    history_array = state.get("chat_history", [])
    
    # Format the last 4 interactions so the AI doesn't get overwhelmed
    history_text = "\n".join(history_array[-4:]) if history_array else "No previous history."
    
    if not user_code:
        return {"is_passed": False, "score": 0, "metrics": {}, "feedback": "No code provided."}

    prompt = f"""
    You are a strict but supportive FAANG interviewer. Evaluate this code.
    Programming Language: {language.upper()}
    Question: {state.get('question_text')}
    Target Time Complexity: {state.get('optimal_time')}
    Target Space Complexity: {state.get('optimal_space')}
    Target Data Structure: {state.get('optimal_data_structure')}
    
    Previous Conversation Context:
    {history_text}
    
    Candidate's Latest Code:
    {user_code}
    
    EVALUATION RULES:
    1. If the code is fully optimal and meets all target complexities: Set "is_passed" to true, score 85-100, and congratulate them.
    2. If the code works but is brute-force (suboptimal time/space): Set "is_passed" to false, score 50-80, and ask them a follow-up question to optimize it. Do NOT give them the exact answer.
    3. If the code is broken/fails edge cases: Set "is_passed" to false, score 0-49, and give a specific hint about where it fails.
    
    Respond strictly in JSON format with exactly four keys:
    "is_passed" (boolean), "score" (integer 0-100), "metrics" (JSON object with keys: "time_complexity", "space_complexity", "code_quality"), and "feedback" (string).
    """
    
    try:
        response = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        raw_text = response.choices[0].message.content
        result = json.loads(raw_text)
        return {
            "is_passed": result.get("is_passed", False),
            "score": result.get("score", 0),
            "metrics": result.get("metrics", {}),
            "feedback": result.get("feedback", "Error parsing feedback.")
        }
    except Exception as e:
        print(f"\n--- GROQ ERROR --- \n{str(e)}\n------------------\n")
        return {"is_passed": False, "score": 0, "metrics": {}, "feedback": "System Error: Evaluation failed. Please try again."}
    user_code = state.get("user_code", "")
    language = state.get("language", "python")
    
    if not user_code:
        return {"is_passed": False, "score": 0, "metrics": {}, "feedback": "No code provided."}

    prompt = f"""
    You are a strict FAANG interviewer. Evaluate this code.
    Programming Language: {language.upper()}
    Question: {state.get('question_text')}
    Required Time Complexity: {state.get('optimal_time')}
    Required Space Complexity: {state.get('optimal_space')}
    Required Data Structure: {state.get('optimal_data_structure')}
    
    Candidate Code:
    {user_code}
    
    Respond strictly in JSON format with exactly four keys:
    "is_passed": true if the code is logically correct and meets requirements, false otherwise.
    "score": an integer from 0 to 100 representing the overall quality and correctness.
    "metrics": a nested JSON object with three keys: "time_complexity" (string rating), "space_complexity" (string rating), and "code_quality" (string rating like "Poor", "Good", "Excellent").
    "feedback": A professional explanation of the score and actionable hints for improvement.
    """
    
    try:
        response = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        raw_text = response.choices[0].message.content
        result = json.loads(raw_text)
        return {
            "is_passed": result.get("is_passed", False),
            "score": result.get("score", 0),
            "metrics": result.get("metrics", {}),
            "feedback": result.get("feedback", "Error parsing feedback.")
        }
    except Exception as e:
        print(f"\n--- GROQ ERROR --- \n{str(e)}\n------------------\n")
        return {"is_passed": False, "score": 0, "metrics": {}, "feedback": "System Error: Evaluation failed. Please try again."}
    user_code = state.get("user_code", "")
    language = state.get("language", "python")
    
    if not user_code:
        return {"is_passed": False, "feedback": "No code provided."}

    prompt = f"""
    You are a strict FAANG interviewer. Evaluate this code.
    Programming Language: {language.upper()}
    Question: {state.get('question_text')}
    Required Time Complexity: {state.get('optimal_time')}
    Required Space Complexity: {state.get('optimal_space')}
    Required Data Structure: {state.get('optimal_data_structure')}
    
    Candidate Code:
    {user_code}
    
    Respond strictly in JSON format with exactly two keys:
    "is_passed": true if the code is logically correct, follows {language.upper()} best practices, AND meets the required complexities. False otherwise.
    "feedback": A short, professional explanation of why it passed or failed. If it failed, give a hint.
    """
    
    try:
        response = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        raw_text = response.choices[0].message.content
        result = json.loads(raw_text)
        return {
            "is_passed": result.get("is_passed", False),
            "feedback": result.get("feedback", "Error parsing feedback.")
        }
    except Exception as e:
        print(f"\n--- GROQ ERROR --- \n{str(e)}\n------------------\n")
        return {"is_passed": False, "feedback": "System Error: Evaluation failed. Please try again."}

def provide_hint(state: InterviewState):
    return state

def route_evaluation(state: InterviewState):
    if state.get("is_passed"):
        return END
    return "hint"

workflow = StateGraph(InterviewState)

workflow.add_node("retrieve", retrieve_question)
workflow.add_node("grade", grade_submission)
workflow.add_node("hint", provide_hint)

workflow.set_entry_point("retrieve")
workflow.add_edge("retrieve", "grade")
workflow.add_conditional_edges("grade", route_evaluation)
workflow.add_edge("hint", END)

graph = workflow.compile()