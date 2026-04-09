import os
from dotenv import load_dotenv
from google import genai
from pinecone import Pinecone

load_dotenv()

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
index = pc.Index("hiregraph-dsa-v2")

interview_database = {
    "dsa": [
        {
            "id": "dsa-1",
            "topic": "Linked Lists",
            "question": "Given head, the head of a linked list, determine if the linked list has a cycle in it.",
            "optimal_time": "O(N)",
            "optimal_space": "O(1)",
            "optimal_data_structure": "Two Pointers (Slow/Fast)"
        },
        {
            "id": "dsa-2",
            "topic": "Arrays",
            "question": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
            "optimal_time": "O(N)",
            "optimal_space": "O(N)",
            "optimal_data_structure": "Hash Map"
        }
    ],
    "system-design": [
        {
            "id": "sd-1",
            "topic": "Rate Limiting",
            "question": "Design a distributed rate limiter for a public API that allows 100 requests per minute per user.",
            "optimal_time": "O(1) read/write per request",
            "optimal_space": "O(Users)",
            "optimal_data_structure": "Redis (Token Bucket or Sliding Window Log)"
        },
        {
            "id": "sd-2",
            "topic": "Microservices",
            "question": "Explain how you would handle distributed transactions across three separate microservices to guarantee data consistency.",
            "optimal_time": "N/A",
            "optimal_space": "N/A",
            "optimal_data_structure": "Saga Pattern or Two-Phase Commit (2PC)"
        }
    ],
    "frontend": [
        {
            "id": "fe-1",
            "topic": "React Hooks",
            "question": "Explain the difference between useEffect and useLayoutEffect, and provide a scenario where useLayoutEffect is strictly required.",
            "optimal_time": "N/A",
            "optimal_space": "N/A",
            "optimal_data_structure": "React rendering lifecycle knowledge"
        },
        {
            "id": "fe-2",
            "topic": "State Management",
            "question": "Implement a global theme provider (dark/light mode) in React without using Redux or Zustand. Justify your architectural choices.",
            "optimal_time": "N/A",
            "optimal_space": "N/A",
            "optimal_data_structure": "React Context API"
        }
    ],
    "sql": [
        {
            "id": "sql-1",
            "topic": "Window Functions",
            "question": "Write a SQL query to find the top 3 highest paid employees in each department. A department can have less than 3 employees.",
            "optimal_time": "O(N log N) database execution",
            "optimal_space": "O(N)",
            "optimal_data_structure": "DENSE_RANK() OVER (PARTITION BY ...)"
        },
        {
            "id": "sql-2",
            "topic": "Query Optimization",
            "question": "Your SELECT query joining the 'users' and 'orders' tables is taking 5 seconds. Walk me through exactly how you diagnose and fix the N+1 query problem.",
            "optimal_time": "O(1) query execution via batching",
            "optimal_space": "O(N) memory allocation",
            "optimal_data_structure": "JOINs or Eager Loading"
        }
    ]
}

for namespace, questions in interview_database.items():
    print(f"Processing namespace: {namespace}")
    
    vectors_to_upsert = []
    
    for item in questions:
        response = client.models.embed_content(
            model="gemini-embedding-001",
            contents=item["topic"]
        )
        embedding = response.embeddings[0].values
        
        vectors_to_upsert.append({
            "id": item["id"],
            "values": embedding,
            "metadata": {
                "question": item["question"],
                "optimal_time": item["optimal_time"],
                "optimal_space": item["optimal_space"],
                "optimal_data_structure": item["optimal_data_structure"]
            }
        })
    
    index.upsert(vectors=vectors_to_upsert, namespace=namespace)

print("\nMulti-Domain Database seeded successfully!")