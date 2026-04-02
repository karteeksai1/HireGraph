from typing import TypedDict, List
from langgraph.graph import StateGraph, END

class InterviewState(TypedDict):
    question_text: str
    optimal_time: str
    optimal_space: str
    optimal_data_structure: str
    user_code: str
    is_passed: bool
    feedback: str
    chat_history: List[dict]

def retrieve_question(state: InterviewState):
    return state

def grade_submission(state: InterviewState):
    return state

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

app = workflow.compile()