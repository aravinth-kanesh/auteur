from __future__ import annotations
import os
from typing import AsyncGenerator
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OLLAMA_MODEL = "llama3.2"
OLLAMA_BASE = "http://localhost:11434"

SYSTEM_PROMPT = """You are the user's personal cinema intelligence, called Auteur. You will be given a list of films the user has actually watched and rated, provided in the context below.

STRICT RULES:
- Only reference films that appear explicitly in the provided context. Never invent or assume additional films the user has watched.
- Only state facts about a film (director, genre, cast) that are provided in the context. Never infer or guess a film's director or attributes from your training knowledge.
- If the context has too few films to answer well, say so honestly rather than speculating.
- Be insightful and specific, but only about what is actually in the data."""


async def _try_ollama(messages: list[dict], stream: bool = False):
    """Attempt to use local Ollama instance."""
    import httpx
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": stream,
    }
    if stream:
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", f"{OLLAMA_BASE}/api/chat", json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    import json
                    try:
                        data = json.loads(line)
                        chunk = data.get("message", {}).get("content", "")
                        if chunk:
                            yield chunk
                        if data.get("done"):
                            return
                    except Exception:
                        continue
    else:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(f"{OLLAMA_BASE}/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()
            yield data.get("message", {}).get("content", "")


async def _try_anthropic(messages: list[dict], stream: bool = False):
    """Fall back to Anthropic Claude API."""
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

    # Split system from messages
    system = next((m["content"] for m in messages if m["role"] == "system"), SYSTEM_PROMPT)
    user_messages = [m for m in messages if m["role"] != "system"]

    if stream:
        async with client.messages.stream(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=system,
            messages=user_messages,
        ) as stream_ctx:
            async for text in stream_ctx.text_stream:
                yield text
    else:
        resp = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=system,
            messages=user_messages,
        )
        yield resp.content[0].text


async def stream_llm(messages: list[dict]) -> AsyncGenerator[str, None]:
    """Stream LLM response, trying Ollama first then Anthropic."""
    tried_ollama = False
    try:
        async for chunk in _try_ollama(messages, stream=True):
            tried_ollama = True
            yield chunk
        return
    except Exception:
        pass

    if not tried_ollama and ANTHROPIC_API_KEY:
        try:
            async for chunk in _try_anthropic(messages, stream=True):
                yield chunk
            return
        except Exception:
            pass

    yield "I'm unable to connect to an LLM right now. Please ensure Ollama is running (`ollama serve`) or set ANTHROPIC_API_KEY in your .env file."


async def query_llm(prompt: str, system: str = SYSTEM_PROMPT) -> str:
    """Single non-streaming LLM call, tries Ollama then Anthropic."""
    messages = [{"role": "system", "content": system}, {"role": "user", "content": prompt}]
    try:
        result = ""
        async for chunk in _try_ollama(messages, stream=False):
            result += chunk
        return result
    except Exception:
        pass

    if ANTHROPIC_API_KEY:
        try:
            result = ""
            async for chunk in _try_anthropic(messages, stream=False):
                result += chunk
            return result
        except Exception:
            pass

    return ""


def build_rag_messages(
    user_message: str,
    retrieved_films: list[dict],
    taste_stats: dict,
    history: list[dict],
) -> list[dict]:
    """Build the full message list for the RAG-powered chat."""
    # Build context from retrieved films
    film_context_lines = []
    for film in retrieved_films:
        rating = film.get("user_rating", "?")
        title = film.get("title", "Unknown")
        year = film.get("year", "")
        director = film.get("director", "")
        genres = film.get("genres", "")
        notes = film.get("user_notes", "")
        line = f"- {title} ({year}) | Dir: {director} | Genres: {genres} | Your rating: {rating}/10"
        if notes:
            line += f" | Your notes: {notes}"
        film_context_lines.append(line)

    # Build taste stats summary
    stats_lines = []
    if taste_stats.get("total_films"):
        stats_lines.append(f"Total films logged: {taste_stats['total_films']}")
    if taste_stats.get("top_director"):
        stats_lines.append(f"Most-watched director: {taste_stats['top_director']}")
    if taste_stats.get("top_genre"):
        stats_lines.append(f"Most-watched genre: {taste_stats['top_genre']}")
    if taste_stats.get("avg_rating"):
        stats_lines.append(f"Average rating: {taste_stats['avg_rating']}/10")

    context = ""
    if film_context_lines:
        context += "Relevant films from their watch history:\n" + "\n".join(film_context_lines) + "\n\n"
    if stats_lines:
        context += "Their overall stats:\n" + "\n".join(stats_lines) + "\n\n"

    system = SYSTEM_PROMPT
    if context:
        system += f"\n\nContext about their watch history:\n{context}"

    messages = [{"role": "system", "content": system}]
    for msg in history[-10:]:  # Keep last 10 messages for context
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_message})
    return messages
