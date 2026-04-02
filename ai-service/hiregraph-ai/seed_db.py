import os
from dotenv import load_dotenv
from google import genai
from pinecone import Pinecone, ServerlessSpec

load_dotenv()

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))

index_name = "hiregraph-dsa-v2"

if index_name not in [idx.name for idx in pc.list_indexes()]:
    pc.create_index(
        name=index_name,
        dimension=3072,
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1"
        )
    )

index = pc.Index(index_name)

dsa_rubric = [
    {
        "id": "q1_two_sum",
        "question": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        "optimal_time": "O(n)",
        "optimal_space": "O(n)",
        "optimal_data_structure": "Hash Map",
        "topic": "Arrays"
    },
    {
        "id": "q2_linked_list_cycle",
        "question": "Given head, the head of a linked list, determine if the linked list has a cycle in it.",
        "optimal_time": "O(n)",
        "optimal_space": "O(1)",
        "optimal_data_structure": "Two Pointers (Floyd's Tortoise and Hare)",
        "topic": "Linked Lists"
    },
    {
        "id": "q3_valid_parentheses",
        "question": "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
        "optimal_time": "O(n)",
        "optimal_space": "O(n)",
        "optimal_data_structure": "Stack",
        "topic": "Stacks"
    }
]

vectors_to_upsert = []

for item in dsa_rubric:
    combined_text = f"Question: {item['question']} Optimal Time: {item['optimal_time']} Optimal Data Structure: {item['optimal_data_structure']}"
    
    embedding_response = client.models.embed_content(
        model="gemini-embedding-004",
        contents=combined_text
    )
    
    vector_values = embedding_response.embeddings[0].values
    
    metadata = {
        "question": item["question"],
        "optimal_time": item["optimal_time"],
        "optimal_space": item["optimal_space"],
        "optimal_data_structure": item["optimal_data_structure"],
        "topic": item["topic"]
    }
    
    vectors_to_upsert.append((item["id"], vector_values, metadata))

index.upsert(vectors=vectors_to_upsert)
print("Database seeded successfully with DSA rubrics.")