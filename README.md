# Auteur: Your Personal Cinema Intelligence

A personal taste engine that learns what makes *you* a cinephile. Log every film, rate it, and let Auteur build a genuine model of your cinematic sensibility. Ask it anything: "Why do I always rate Villeneuve so highly?" or "Am I in a genre rut?" It answers by reasoning over your own watch history.

**Stack**: FastAPI · SQLite · sentence-transformers · ChromaDB · Ollama (local LLM) · React · Tailwind CSS · Recharts

---

## Setup

### Prerequisites

- Python 3.12
- Node.js 18+
- [Ollama](https://ollama.ai) (for local LLM)
- A free [TMDB API key](https://www.themoviedb.org/settings/api)

---

### Backend

```bash
cd backend

# Create and activate a virtualenv with Python 3.12
python3.12 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add your TMDB_API_KEY
# Optionally add ANTHROPIC_API_KEY for Claude fallback

# Start the backend
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

---

### LLM Setup (Ollama)

```bash
# Install Ollama: https://ollama.ai
# Then pull the model:
ollama pull llama3.2

# Make sure Ollama is running:
ollama serve
```

If Ollama is unavailable, Auteur falls back to Claude API if `ANTHROPIC_API_KEY` is set.

---

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Features

### Core
- **Film Search**: TMDB-powered search with live autocomplete and poster thumbnails
- **Film Logging**: Rate 1-10, add notes, stores full metadata and poster
- **Watch History**: Filterable grid by genre, decade, minimum rating; sortable by date/rating/title
- **Taste Profile**: Genre donut chart, decade preference bars, director affinity, generated cinematic identity paragraph
- **Film Brain Chat**: Full conversational RAG interface; questions are answered by reasoning over your actual watch history using local embeddings and an LLM

### How the intelligence works
1. Every film you log is embedded via `all-MiniLM-L6-v2` (runs locally, no API needed)
2. Embeddings are stored in a local ChromaDB vector store
3. When you ask a question, it's embedded and the most relevant films from your history are retrieved
4. Retrieved films and your taste stats are injected into the LLM context
5. The LLM answers by reasoning over *your* films, not generic knowledge

---

## Project Structure

```
auteur/
├── backend/
│   ├── main.py          # FastAPI app and all routes
│   ├── database.py      # SQLAlchemy models
│   ├── models.py        # Pydantic schemas
│   ├── tmdb.py          # TMDB API client
│   ├── embeddings.py    # sentence-transformers pipeline
│   ├── vector_store.py  # ChromaDB wrapper
│   ├── taste_engine.py  # Analysis: directors, genres, decades, LLM summaries
│   ├── llm.py           # LLM abstraction and RAG pipeline (Ollama with Anthropic fallback)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/       # Dashboard, LogFilm, WatchHistory, TasteProfile, Chat
        └── components/  # SearchBar, FilmCard, RatingModal, ChatInterface, StatsPanel
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=` | TMDB film search |
| GET | `/api/film/{tmdb_id}` | Full film details |
| POST | `/api/log` | Log a film with rating |
| GET | `/api/history` | Watch history (filterable, sortable) |
| GET | `/api/taste/stats` | Fast DB-only taste data (charts, directors, top films) |
| GET | `/api/taste` | Full taste profile including LLM-generated identity |
| POST | `/api/chat` | Streaming RAG chat response |
| GET | `/api/stats` | Summary stats (total films, hours, averages) |
| DELETE | `/api/film/{id}` | Remove a log entry |
