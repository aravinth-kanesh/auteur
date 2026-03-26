import os
import httpx
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"


async def search_films(query: str) -> list[dict]:
    """Search TMDB for films matching query. Returns top 5 results."""
    if not TMDB_API_KEY:
        return []
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{TMDB_BASE}/search/movie",
            params={"api_key": TMDB_API_KEY, "query": query, "page": 1},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

    results = []
    for item in data.get("results", [])[:5]:
        year = None
        release = item.get("release_date", "")
        if release:
            try:
                year = int(release[:4])
            except ValueError:
                pass
        results.append({
            "tmdb_id": item["id"],
            "title": item["title"],
            "year": year,
            "poster_path": f"{TMDB_IMAGE_BASE}{item['poster_path']}" if item.get("poster_path") else None,
            "overview": item.get("overview"),
        })
    return results


async def get_film_details(tmdb_id: int) -> dict | None:
    """Fetch full film details from TMDB including crew."""
    if not TMDB_API_KEY:
        return None
    async with httpx.AsyncClient() as client:
        movie_resp = await client.get(
            f"{TMDB_BASE}/movie/{tmdb_id}",
            params={"api_key": TMDB_API_KEY},
            timeout=10,
        )
        credits_resp = await client.get(
            f"{TMDB_BASE}/movie/{tmdb_id}/credits",
            params={"api_key": TMDB_API_KEY},
            timeout=10,
        )

    if movie_resp.status_code != 200:
        return None

    movie = movie_resp.json()
    credits = credits_resp.json() if credits_resp.status_code == 200 else {}

    year = None
    release = movie.get("release_date", "")
    if release:
        try:
            year = int(release[:4])
        except ValueError:
            pass

    genres = [g["name"] for g in movie.get("genres", [])]

    cast = [m["name"] for m in credits.get("cast", [])[:5]]

    director = None
    cinematographer = None
    for crew_member in credits.get("crew", []):
        if crew_member.get("job") == "Director" and director is None:
            director = crew_member["name"]
        if crew_member.get("job") == "Director of Photography" and cinematographer is None:
            cinematographer = crew_member["name"]

    return {
        "tmdb_id": movie["id"],
        "title": movie["title"],
        "year": year,
        "genres": genres,
        "director": director,
        "cast": cast,
        "cinematographer": cinematographer,
        "runtime": movie.get("runtime"),
        "overview": movie.get("overview"),
        "poster_path": f"{TMDB_IMAGE_BASE}{movie['poster_path']}" if movie.get("poster_path") else None,
    }
