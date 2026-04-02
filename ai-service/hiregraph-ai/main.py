import os
from fastapi import FastAPI
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

interviewer_prompt = """
You are a strict, senior FAANG software engineer conducting a technical coding interview.
The user is a candidate. 
Do not give away the direct answer to the problem. 
If their solution is suboptimal, point out the time or space complexity inefficiency and ask them to optimize it.
If they are completely stuck, provide a very small hint about which data structure to use.
Keep your responses concise, professional, and strictly related to Data Structures and Algorithms.
"""

app = FastAPI()

class UserInput(BaseModel):
    message: str

@app.get("/")
def read_root():
    return {"status": "HireGraph AI Service is running"}

@app.post("/ask")
async def ask_ai(user_input: UserInput):
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        config={
            "system_instruction": interviewer_prompt
        },
        contents=user_input.message
    )
    return {"reply": response.text}