from __future__ import annotations
from functools import lru_cache
from sentence_transformers import SentenceTransformer

MODEL_NAME = "all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    return SentenceTransformer(MODEL_NAME)


def build_film_text(film: dict, user_rating: float, user_notes: str | None) -> str:
    genres = film.get("genres", [])
    if isinstance(genres, str):
        import json
        try:
            genres = json.loads(genres)
        except Exception:
            genres = []

    cast = film.get("cast", [])
    if isinstance(cast, str):
        import json
        try:
            cast = json.loads(cast)
        except Exception:
            cast = []

    return f"""Title: {film.get('title', '')} ({film.get('year', '')})
Director: {film.get('director', 'Unknown')}
Cinematographer: {film.get('cinematographer', 'Unknown')}
Genres: {', '.join(genres) if genres else 'Unknown'}
Cast: {', '.join(cast[:3]) if cast else 'Unknown'}
Overview: {film.get('overview', '')}
User rating: {user_rating}/10
User notes: {user_notes or 'none'}"""


def embed_text(text: str) -> list[float]:
    model = _get_model()
    vector = model.encode(text, convert_to_numpy=True)
    return vector.tolist()


def embed_film(film: dict, user_rating: float, user_notes: str | None) -> list[float]:
    text = build_film_text(film, user_rating, user_notes)
    return embed_text(text)


def embed_query(query: str) -> list[float]:
    return embed_text(query)
