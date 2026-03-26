from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


class FilmSearchResult(BaseModel):
    tmdb_id: int
    title: str
    year: Optional[int] = None
    poster_path: Optional[str] = None
    overview: Optional[str] = None


class FilmDetails(BaseModel):
    tmdb_id: int
    title: str
    year: Optional[int] = None
    genres: list[str] = []
    director: Optional[str] = None
    cast: list[str] = []
    cinematographer: Optional[str] = None
    runtime: Optional[int] = None
    overview: Optional[str] = None
    poster_path: Optional[str] = None


class LogFilmRequest(BaseModel):
    tmdb_id: int
    user_rating: float = Field(ge=1.0, le=10.0)
    user_notes: Optional[str] = None
    watched_date: Optional[date] = None


class WatchedFilmResponse(BaseModel):
    id: int
    tmdb_id: int
    title: str
    year: Optional[int] = None
    genres: list[str] = []
    director: Optional[str] = None
    cast: list[str] = []
    cinematographer: Optional[str] = None
    runtime: Optional[int] = None
    overview: Optional[str] = None
    poster_path: Optional[str] = None
    user_rating: float
    user_notes: Optional[str] = None
    watched_date: Optional[date] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class DirectorAffinity(BaseModel):
    director: str
    film_count: int
    avg_rating: float
    films: list[str] = []


class GenreData(BaseModel):
    genre: str
    count: int
    avg_rating: float


class DecadeData(BaseModel):
    decade: str
    count: int
    avg_rating: float


class TasteProfile(BaseModel):
    director_affinity: list[DirectorAffinity] = []
    genre_distribution: list[GenreData] = []
    decade_preference: list[DecadeData] = []
    hidden_patterns: Optional[str] = None
    taste_summary: Optional[str] = None
    top_films: list[WatchedFilmResponse] = []


class Stats(BaseModel):
    total_films: int
    total_runtime_minutes: int
    top_director: Optional[str] = None
    top_genre: Optional[str] = None
    avg_rating: Optional[float] = None
    longest_film: Optional[str] = None
    most_recent: Optional[str] = None
