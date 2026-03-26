import json
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, Float, String, Text, Date, DateTime
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = "sqlite:///./auteur.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class WatchedFilm(Base):
    __tablename__ = "watched_films"

    id = Column(Integer, primary_key=True, index=True)
    tmdb_id = Column(Integer, unique=True, index=True)
    title = Column(Text, nullable=False)
    year = Column(Integer)
    genres = Column(Text)          # JSON array
    director = Column(Text)
    cast = Column(Text)            # JSON array, top 5
    cinematographer = Column(Text)
    runtime = Column(Integer)
    overview = Column(Text)
    poster_path = Column(Text)
    user_rating = Column(Float)    # 1.0–10.0
    user_notes = Column(Text)
    watched_date = Column(Date)
    embedding_id = Column(Text)    # ChromaDB doc id
    created_at = Column(DateTime, default=datetime.utcnow)

    def genres_list(self):
        return json.loads(self.genres) if self.genres else []

    def cast_list(self):
        return json.loads(self.cast) if self.cast else []


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
