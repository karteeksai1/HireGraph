import json
import os
from pinecone import Pinecone
from dotenv import load_dotenv
from huggingface_hub import InferenceClient

load_dotenv()

pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
index = pc.Index("hiregraph")

hf_client = InferenceClient(token=os.environ.get("HF_API_KEY"))

def get_embedding(text: str):
    response = hf_client.feature_extraction(
        text, 
        model="sentence-transformers/all-MiniLM-L6-v2"
    )
    
    res = response.tolist() if hasattr(response, "tolist") else response
    
    if isinstance(res, list) and len(res) > 0 and isinstance(res[0], list):
        return res[0]
    
    return res

def load_data_to_pinecone():
    with open("questions.json", "r") as f:
        questions = json.load(f)

    vectors_to_upsert = []
    for q in questions:
        print(f"Vectorizing: {q['title']}...")
        text_to_embed = f"{q['title']} - {q['text']}"
        embedding = get_embedding(text_to_embed)

        metadata = {
            "domain": q["domain"],
            "difficulty": q["difficulty"],
            "title": q["title"],
            "text": q["text"],
            "optimal_time": q["optimal_time"],
            "optimal_space": q["optimal_space"]
        }
        vectors_to_upsert.append((q["id"], embedding, metadata))

    index.upsert(vectors=vectors_to_upsert)
    print("Database successfully seeded!")

if __name__ == "__main__":
    load_data_to_pinecone()