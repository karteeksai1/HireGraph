import json
import os
import google.generativeai as genai
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

# 1. Initialize Pinecone
pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
index_name = "hiregraph" # Make sure this matches your Pinecone index name!
index = pc.Index(index_name)

# 2. Initialize Gemini for Embeddings
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

def get_embedding(text: str):
    # Uses Google's text embedding model to convert the question into an array of numbers
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type="retrieval_document"
    )
    return result['embedding']

def load_data_to_pinecone():
    print("Loading questions.json...")
    with open("questions.json", "r") as f:
        questions = json.load(f)

    vectors_to_upsert = []

    for q in questions:
        print(f"Vectorizing: {q['title']}...")
        
        # We embed a combination of the title and the text so the AI understands the core concept
        text_to_embed = f"{q['title']} - {q['text']}"
        embedding = get_embedding(text_to_embed)

        # This is the "Metadata" we talked about in your interview!
        metadata = {
            "domain": q["domain"],
            "difficulty": q["difficulty"],
            "title": q["title"],
            "text": q["text"],
            "optimal_time": q["optimal_time"],
            "optimal_space": q["optimal_space"]
        }

        # Structure required by Pinecone: (id, vector_array, metadata_dict)
        vectors_to_upsert.append((q["id"], embedding, metadata))

    # Push all the vectorized questions to Pinecone in one big batch
    print(f"Uploading {len(vectors_to_upsert)} questions to Pinecone...")
    index.upsert(vectors=vectors_to_upsert)
    print("✅ Database successfully seeded!")

if __name__ == "__main__":
    load_data_to_pinecone()