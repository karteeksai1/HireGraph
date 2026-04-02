import os
import json
from typing import TypedDict, List
from dotenv import load_dotenv
from google import genai
from pinecone import Pinecone
from langgraph.graph import StateGraph, END

load_dotenv()

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
index = pc.Index("hiregraph-dsa-v2")

class InterviewState(TypedDict):
    topic: str
    question_text: str
    optimal_time: str
    optimal_space: str
    optimal_data_structure: str
    user_code: str
    is_passed: bool
    feedback: str
    chat_history: List[dict]

def retrieve_question(state: InterviewState):
    topic_query = state.get("topic", "Arrays")
    
    embedding_response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=topic_query
    )
    
    query_vector = embedding_response.embeddings[0].values
    
    search_results = index.query(
        vector=query_vector,
        top_k=1,
        include_metadata=True
    )
    
    metadata = search_results['matches'][0]['metadata']
    
    return {
        "question_text": metadata["question"],
        "optimal_time": metadata["optimal_time"],
        "optimal_space": metadata["optimal_space"],
        "optimal_data_structure": metadata["optimal_data_structure"]
    }

def grade_submission(state: InterviewState):
    user_code = state.get("user_code", "")
    
    if not user_code:
        return {"is_passed": False, "feedback": "No code provided."}

    prompt = f"""
    You are a strict FAANG interviewer. Evaluate this code.
    Question: {state.get('question_text')}
    Required Time Complexity: {state.get('optimal_time')}
    Required Space Complexity: {state.get('optimal_space')}
    Required Data Structure: {state.get('optimal_data_structure')}
    
    Candidate Code:
    {user_code}
    
    Respond strictly in JSON format with exactly two keys:
    "is_passed": true if the code is logically correct AND meets the required complexities. False otherwise.
    "feedback": A short, professional explanation of why it passed or failed. If it failed, give a hint.
    """
    
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt
    )
    
    raw_text = response.text.strip()
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:-3].strip()
    elif raw_text.startswith("```"):
        raw_text = raw_text[3:-3].strip()
        
    try:
        result = json.loads(raw_text)
        return {
            "is_passed": result.get("is_passed", False),
            "feedback": result.get("feedback", "Error parsing feedback.")
        }
    except:
        return {"is_passed": False, "feedback": "Failed to parse AI JSON response."}

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
workflow.add_edge("hint", "grade")

graph = workflow.compile()

if __name__ == "__main__":
    mock_perfect_code = """
def hasCycle(head):
    slow, fast = head, head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True
    return False
    """
    
    initial_state = {
        "topic": "Linked Lists",
        "user_code": mock_perfect_code
    }
    
    print("AI is evaluating the submission...")
    result = graph.invoke(initial_state)
    
    print(f"\nQuestion: {result.get('question_text')}")
    print(f"Passed: {result.get('is_passed')}")
    print(f"AI Feedback: {result.get('feedback')}\n")