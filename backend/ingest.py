import json
import os
import requests
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
index = pc.Index("hiregraph")

HF_API_KEY = os.environ.get("HF_API_KEY")
HF_API_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"

def get_embedding(text: str):
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    response = requests.post(HF_API_URL, headers=headers, json={"inputs": [text]})
    
    if response.status_code != 200:
        raise Exception(f"Hugging Face API failed: {response.text}")
        
    return response.json()[0]

def load_data_to_pinecone():
    with open("questions.json", "r") as f:
        questions = json.load(f)

    vectors_to_upsert = []
    for q in questions:
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

if __name__ == "__main__":
    load_data_to_pinecone()