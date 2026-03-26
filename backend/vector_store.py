from __future__ import annotations
import chromadb
from chromadb.config import Settings

_client: chromadb.PersistentClient | None = None
_collection = None

COLLECTION_NAME = "auteur_films"


def _get_collection():
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(
            path="./chroma_db",
            settings=Settings(anonymized_telemetry=False),
        )
        _collection = _client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def add_film(embedding_id: str, embedding: list[float], metadata: dict) -> None:
    col = _get_collection()
    # Chroma metadata values must be str/int/float/bool, not lists
    safe_meta = {}
    for k, v in metadata.items():
        if isinstance(v, list):
            safe_meta[k] = ", ".join(str(x) for x in v)
        elif v is None:
            safe_meta[k] = ""
        else:
            safe_meta[k] = v
    col.upsert(
        ids=[embedding_id],
        embeddings=[embedding],
        metadatas=[safe_meta],
    )


def query_films(
    query_embedding: list[float],
    n_results: int = 8,
    where: dict | None = None,
) -> list[dict]:
    col = _get_collection()
    count = col.count()
    if count == 0:
        return []
    n = min(n_results, count)
    kwargs = {"query_embeddings": [query_embedding], "n_results": n, "include": ["metadatas", "distances"]}
    if where:
        kwargs["where"] = where
    results = col.query(**kwargs)
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]
    out = []
    for meta, dist in zip(metadatas, distances):
        out.append({**meta, "similarity": 1 - dist})
    return out


def delete_film(embedding_id: str) -> None:
    col = _get_collection()
    col.delete(ids=[embedding_id])


def get_all_embeddings() -> list[dict]:
    """Return all stored embeddings with their metadata (for clustering)."""
    col = _get_collection()
    if col.count() == 0:
        return []
    results = col.get(include=["embeddings", "metadatas"])
    out = []
    for eid, emb, meta in zip(results["ids"], results["embeddings"], results["metadatas"]):
        out.append({"id": eid, "embedding": emb, "metadata": meta})
    return out
