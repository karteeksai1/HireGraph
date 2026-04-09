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
    domain: str
    topic: str
    language: str
    question_text: str
    optimal_time: str
    optimal_space: str
    optimal_data_structure: str
    user_code: str
    is_passed: bool
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
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
    except Exception as e:
        return {"is_passed": False, "feedback": "The AI is currently experiencing high traffic. Please wait a moment and click Submit again."}
    
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
workflow.add_edge("hint", END)

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
        "domain": "dsa",
        "topic": "Linked Lists",
        "language": "python",
        "user_code": mock_perfect_code
    }
    
    print("AI is evaluating the submission...")
    result = graph.invoke(initial_state)
    
    print(f"\nQuestion: {result.get('question_text')}")
    print(f"Passed: {result.get('is_passed')}")
    print(f"AI Feedback: {result.get('feedback')}\n")