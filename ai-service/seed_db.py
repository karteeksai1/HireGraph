import json
import os
from pathlib import Path

from dotenv import load_dotenv
from huggingface_hub import InferenceClient
from pinecone import Pinecone

load_dotenv()

INDEX_NAME = os.environ.get("PINECONE_INDEX", "hiregraph")
QUESTIONS_PATH = Path(__file__).resolve().parents[1] / "backend" / "questions.json"

pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
index = pc.Index(INDEX_NAME)
hf_client = InferenceClient(token=os.environ.get("HF_API_KEY"))

EMPTY_BOILERPLATES = {"python": "", "javascript": "", "java": "", "cpp": "", "sql": ""}

def get_embedding(text: str):
    response = hf_client.feature_extraction(
        text,
        model="sentence-transformers/all-MiniLM-L6-v2"
    )
    res = response.tolist() if hasattr(response, "tolist") else response
    if isinstance(res, list) and len(res) > 0 and isinstance(res[0], list):
        return res[0]
    return res

def default_boilerplates(domain: str):
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

def load_data_to_pinecone():
    with QUESTIONS_PATH.open("r", encoding="utf-8") as f:
        questions = json.load(f)

    vectors_to_upsert = []
    for q in questions:
        print(f"Vectorizing: {q['title']}...")
        text_to_embed = f"{q['domain']} {q['difficulty']} {q['title']} - {q['text']}"
        embedding = get_embedding(text_to_embed)
        boilerplates = q.get("boilerplates") or default_boilerplates(q["domain"])
        test_cases = q.get("test_cases", [])

        vectors_to_upsert.append({
            "id": q["id"],
            "values": embedding,
            "metadata": {
                "domain": q["domain"],
                "difficulty": q["difficulty"],
                "title": q["title"],
                "text": q["text"],
                "optimal_time": q.get("optimal_time", "N/A"),
                "optimal_space": q.get("optimal_space", "N/A"),
                "test_cases_json": json.dumps(test_cases),
                "boilerplates_json": json.dumps(boilerplates)
            }
        })

    index.upsert(vectors=vectors_to_upsert)
    print(f"Seeded {len(vectors_to_upsert)} questions into Pinecone index '{INDEX_NAME}'.")

if __name__ == "__main__":
    load_data_to_pinecone()
