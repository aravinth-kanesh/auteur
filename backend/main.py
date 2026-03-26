from __future__ import annotations
import json
from contextlib import asynccontextmanager
from datetime import date
from typing import AsyncGenerator

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import WatchedFilm, get_db, init_db
from embeddings import embed_film, embed_query
from llm import build_rag_messages, query_llm, stream_llm
from models import (
    ChatRequest,
    FilmDetails,
    FilmSearchResult,
    LogFilmRequest,
    Stats,
    TasteProfile,
    WatchedFilmResponse,
)
from taste_engine import (
    get_decade_preference,
    get_director_affinity,
    get_genre_distribution,
    get_hidden_patterns,
    get_stats,
    get_taste_summary,
    get_top_films,
)
from tmdb import get_film_details, search_films
from vector_store import add_film, delete_film, query_films


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Auteur", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

@app.get("/api/search", response_model=list[FilmSearchResult])
async def search(q: str = Query(..., min_length=1)):
    results = await search_films(q)
    return results


@app.get("/api/film/{tmdb_id}", response_model=FilmDetails)
async def film_details(tmdb_id: int):
    details = await get_film_details(tmdb_id)
    if not details:
        raise HTTPException(status_code=404, detail="Film not found")
    return details


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def _embed_and_store(film_dict: dict, user_rating: float, user_notes: str | None, embedding_id: str):
    """Background task: embed the film and store in ChromaDB."""
    try:
        vector = embed_film(film_dict, user_rating, user_notes)
        metadata = {
            "title": film_dict.get("title", ""),
            "year": film_dict.get("year") or 0,
            "director": film_dict.get("director") or "",
            "genres": film_dict.get("genres", []),
            "user_rating": user_rating,
            "user_notes": user_notes or "",
            "tmdb_id": film_dict.get("tmdb_id", 0),
        }
        add_film(embedding_id, vector, metadata)
    except Exception as e:
        print(f"[Embedding error] {e}")


@app.post("/api/log", response_model=WatchedFilmResponse)
async def log_film(
    req: LogFilmRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # Fetch film details from TMDB
    details = await get_film_details(req.tmdb_id)
    if not details:
        raise HTTPException(status_code=404, detail="Film not found on TMDB")

    # Check if already logged — update if so
    existing = db.query(WatchedFilm).filter(WatchedFilm.tmdb_id == req.tmdb_id).first()
    if existing:
        existing.user_rating = req.user_rating
        existing.user_notes = req.user_notes
        existing.watched_date = req.watched_date or date.today()
        db.commit()
        db.refresh(existing)
        film_obj = existing
    else:
        embedding_id = f"film_{req.tmdb_id}"
        film_obj = WatchedFilm(
            tmdb_id=req.tmdb_id,
            title=details["title"],
            year=details.get("year"),
            genres=json.dumps(details.get("genres", [])),
            director=details.get("director"),
            cast=json.dumps(details.get("cast", [])),
            cinematographer=details.get("cinematographer"),
            runtime=details.get("runtime"),
            overview=details.get("overview"),
            poster_path=details.get("poster_path"),
            user_rating=req.user_rating,
            user_notes=req.user_notes,
            watched_date=req.watched_date or date.today(),
            embedding_id=embedding_id,
        )
        db.add(film_obj)
        db.commit()
        db.refresh(film_obj)

    background_tasks.add_task(
        _embed_and_store,
        {**details, "tmdb_id": req.tmdb_id},
        req.user_rating,
        req.user_notes,
        film_obj.embedding_id,
    )

    return _to_response(film_obj)


@app.delete("/api/film/{film_id}")
async def delete_film_entry(film_id: int, db: Session = Depends(get_db)):
    film = db.query(WatchedFilm).filter(WatchedFilm.id == film_id).first()
    if not film:
        raise HTTPException(status_code=404, detail="Film not found")
    if film.embedding_id:
        try:
            delete_film(film.embedding_id)
        except Exception:
            pass
    db.delete(film)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# History
# ---------------------------------------------------------------------------

@app.get("/api/history", response_model=list[WatchedFilmResponse])
def history(
    sort: str = Query("date", regex="^(date|rating|title)$"),
    genre: str | None = Query(None),
    min_rating: float | None = Query(None, ge=1, le=10),
    decade: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(WatchedFilm)
    films = q.all()

    # Filter
    if genre:
        films = [f for f in films if genre in f.genres_list()]
    if min_rating is not None:
        films = [f for f in films if f.user_rating >= min_rating]
    if decade:
        decade_start = int(decade.rstrip("s"))
        films = [f for f in films if f.year and decade_start <= f.year < decade_start + 10]

    # Sort
    if sort == "rating":
        films.sort(key=lambda f: f.user_rating, reverse=True)
    elif sort == "title":
        films.sort(key=lambda f: f.title.lower())
    else:
        films.sort(key=lambda f: f.created_at or "", reverse=True)

    return [_to_response(f) for f in films]


# ---------------------------------------------------------------------------
# Taste + Stats
# ---------------------------------------------------------------------------

@app.get("/api/taste", response_model=TasteProfile)
async def taste_profile(db: Session = Depends(get_db)):
    directors = get_director_affinity(db)
    genres = get_genre_distribution(db)
    decades = get_decade_preference(db)
    top_films = get_top_films(db, 10)

    hidden = await get_hidden_patterns(db, query_llm)
    summary = await get_taste_summary(db, query_llm)

    return TasteProfile(
        director_affinity=directors,
        genre_distribution=genres,
        decade_preference=decades,
        hidden_patterns=hidden,
        taste_summary=summary,
        top_films=[_to_response(f) for f in top_films],
    )


@app.get("/api/stats", response_model=Stats)
def stats(db: Session = Depends(get_db)):
    return get_stats(db)


# ---------------------------------------------------------------------------
# Chat (streaming RAG)
# ---------------------------------------------------------------------------

@app.post("/api/chat")
async def chat(req: ChatRequest, db: Session = Depends(get_db)):
    # Embed the query
    try:
        q_embedding = embed_query(req.message)
        retrieved = query_films(q_embedding, n_results=8)
    except Exception:
        retrieved = []

    # Enrich retrieved metadata with DB data for notes
    stats_data = get_stats(db)

    history_dicts = [{"role": m.role, "content": m.content} for m in req.history]
    messages = build_rag_messages(req.message, retrieved, stats_data, history_dicts)

    async def event_stream() -> AsyncGenerator[str, None]:
        async for chunk in stream_llm(messages):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {"status": "ok", "app": "Auteur"}


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _to_response(f: WatchedFilm) -> WatchedFilmResponse:
    return WatchedFilmResponse(
        id=f.id,
        tmdb_id=f.tmdb_id,
        title=f.title,
        year=f.year,
        genres=f.genres_list(),
        director=f.director,
        cast=f.cast_list(),
        cinematographer=f.cinematographer,
        runtime=f.runtime,
        overview=f.overview,
        poster_path=f.poster_path,
        user_rating=f.user_rating,
        user_notes=f.user_notes,
        watched_date=f.watched_date,
        created_at=f.created_at,
    )
