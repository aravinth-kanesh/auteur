from __future__ import annotations
import asyncio
from collections import defaultdict
from datetime import datetime
from sqlalchemy.orm import Session
from database import WatchedFilm

LLM_TIMEOUT = 30  # seconds


def get_director_affinity(db: Session) -> list[dict]:
    films = db.query(WatchedFilm).filter(WatchedFilm.director.isnot(None)).all()
    director_data: dict[str, dict] = defaultdict(lambda: {"ratings": [], "films": []})
    for f in films:
        if f.director:
            director_data[f.director]["ratings"].append(f.user_rating)
            director_data[f.director]["films"].append(f.title)

    result = []
    for director, data in director_data.items():
        result.append({
            "director": director,
            "film_count": len(data["ratings"]),
            "avg_rating": round(sum(data["ratings"]) / len(data["ratings"]), 1),
            "films": data["films"],
        })

    result.sort(key=lambda x: (x["film_count"], x["avg_rating"]), reverse=True)
    return result[:5]


def get_genre_distribution(db: Session) -> list[dict]:
    films = db.query(WatchedFilm).all()
    genre_data: dict[str, dict] = defaultdict(lambda: {"count": 0, "ratings": []})
    for f in films:
        genres = f.genres_list()
        for genre in genres:
            genre_data[genre]["count"] += 1
            genre_data[genre]["ratings"].append(f.user_rating)

    result = []
    for genre, data in genre_data.items():
        result.append({
            "genre": genre,
            "count": data["count"],
            "avg_rating": round(sum(data["ratings"]) / len(data["ratings"]), 1),
        })
    result.sort(key=lambda x: x["count"], reverse=True)
    return result


def get_decade_preference(db: Session) -> list[dict]:
    films = db.query(WatchedFilm).filter(WatchedFilm.year.isnot(None)).all()
    decade_data: dict[str, dict] = defaultdict(lambda: {"count": 0, "ratings": []})
    for f in films:
        if f.year:
            decade = f"{(f.year // 10) * 10}s"
            decade_data[decade]["count"] += 1
            decade_data[decade]["ratings"].append(f.user_rating)

    result = []
    for decade, data in decade_data.items():
        result.append({
            "decade": decade,
            "count": data["count"],
            "avg_rating": round(sum(data["ratings"]) / len(data["ratings"]), 1),
        })
    result.sort(key=lambda x: x["decade"])
    return result


def get_top_films(db: Session, limit: int = 10) -> list[WatchedFilm]:
    return (
        db.query(WatchedFilm)
        .order_by(WatchedFilm.user_rating.desc())
        .limit(limit)
        .all()
    )


def get_stats(db: Session) -> dict:
    films = db.query(WatchedFilm).all()
    if not films:
        return {
            "total_films": 0,
            "total_runtime_minutes": 0,
            "top_director": None,
            "top_genre": None,
            "avg_rating": None,
            "longest_film": None,
            "most_recent": None,
        }

    total_runtime = sum(f.runtime or 0 for f in films)
    ratings = [f.user_rating for f in films if f.user_rating is not None]
    avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else None

    director_counts: dict[str, int] = defaultdict(int)
    for f in films:
        if f.director:
            director_counts[f.director] += 1
    top_director = max(director_counts, key=director_counts.get) if director_counts else None

    genre_counts: dict[str, int] = defaultdict(int)
    for f in films:
        for g in f.genres_list():
            genre_counts[g] += 1
    top_genre = max(genre_counts, key=genre_counts.get) if genre_counts else None

    longest = max(films, key=lambda f: f.runtime or 0)
    most_recent = max(films, key=lambda f: f.created_at or datetime.min)

    return {
        "total_films": len(films),
        "total_runtime_minutes": total_runtime,
        "top_director": top_director,
        "top_genre": top_genre,
        "avg_rating": avg_rating,
        "longest_film": longest.title if longest.runtime else None,
        "most_recent": most_recent.title,
    }


async def get_hidden_patterns(db: Session, llm_fn) -> str | None:
    high_rated = (
        db.query(WatchedFilm)
        .filter(WatchedFilm.user_rating >= 8.0)
        .order_by(WatchedFilm.user_rating.desc())
        .limit(15)
        .all()
    )
    if len(high_rated) < 3:
        return None

    film_summaries = []
    for f in high_rated:
        genres = f.genres_list()
        film_summaries.append(
            f"- {f.title} ({f.year}) | Dir: {f.director} | "
            f"Genres: {', '.join(genres)} | Rating: {f.user_rating}/10"
        )

    prompt = (
        "Here are the films this person rated 8/10 or higher:\n\n"
        + "\n".join(film_summaries)
        + "\n\nIn 2-3 sentences, identify the hidden common threads and patterns "
        "across these highly-rated films. Be specific and insightful. "
        "Write with confidence — do not hedge, qualify, or mention data limitations."
    )
    try:
        return await asyncio.wait_for(llm_fn(prompt), timeout=LLM_TIMEOUT)
    except (asyncio.TimeoutError, Exception):
        return None


async def get_taste_summary(db: Session, llm_fn) -> str | None:
    top_films = get_top_films(db, limit=10)
    if len(top_films) < 3:
        return None

    film_lines = []
    for f in top_films:
        genres = f.genres_list()
        film_lines.append(
            f"- {f.title} ({f.year}) | Dir: {f.director} | "
            f"Genres: {', '.join(genres)} | Rating: {f.user_rating}/10"
            + (f" | Notes: {f.user_notes}" if f.user_notes else "")
        )

    directors = get_director_affinity(db)
    top_dir_str = ", ".join(
        f"{d['director']} ({d['film_count']} films, avg {d['avg_rating']})"
        for d in directors[:3]
    )

    prompt = (
        "Based on this person's top-rated films:\n\n"
        + "\n".join(film_lines)
        + f"\n\nFavourite directors: {top_dir_str or 'various'}\n\n"
        "Write a 2-3 sentence paragraph describing their cinematic identity: "
        "their tastes, what they value in film, their sensibility. "
        "Be evocative and specific. Write in second person ('You are...'). "
        "Write with confidence — do not hedge, qualify, or mention data limitations. "
        "Never reference ratings, averages, or film counts directly."
    )
    try:
        return await asyncio.wait_for(llm_fn(prompt), timeout=LLM_TIMEOUT)
    except (asyncio.TimeoutError, Exception):
        return None
