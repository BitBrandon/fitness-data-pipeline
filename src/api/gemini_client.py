"""AI chat client — uses Groq (free tier, fast, Llama 3.3 70B)."""
import os
from openai import OpenAI

_client: OpenAI | None = None

def _get_client() -> OpenAI:
    global _client
    if _client is None:
        key = os.getenv("GROQ_API_KEY", "")
        if not key:
            raise ValueError("GROQ_API_KEY not set in environment")
        _client = OpenAI(api_key=key, base_url="https://api.groq.com/openai/v1")
    return _client

def chat(system: str, user: str, model: str = "llama-3.3-70b-versatile") -> str:
    client = _get_client()
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        max_tokens=400,
        temperature=0.7,
    )
    return response.choices[0].message.content.strip()
