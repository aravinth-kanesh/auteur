import { useEffect, useState } from 'react'
import FilmCard from '../components/FilmCard'
import toast from 'react-hot-toast'
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'

const SORT_OPTIONS = [
  { value: 'date', label: 'Date Logged' },
  { value: 'rating', label: 'Rating' },
  { value: 'title', label: 'Title' },
]

const DECADE_OPTIONS = ['1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s']

export default function WatchHistory() {
  const [films, setFilms] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('date')
  const [minRating, setMinRating] = useState(1)
  const [decade, setDecade] = useState('')
  const [genre, setGenre] = useState('')
  const [allGenres, setAllGenres] = useState([])

  function fetchFilms() {
    setLoading(true)
    const params = new URLSearchParams({ sort })
    if (minRating > 1) params.set('min_rating', minRating)
    if (decade) params.set('decade', decade)
    if (genre) params.set('genre', genre)
    fetch(`/api/history?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setFilms(data)
        // Collect all unique genres
        const genres = new Set()
        data.forEach((f) => f.genres?.forEach((g) => genres.add(g)))
        setAllGenres([...genres].sort())
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchFilms() }, [sort, minRating, decade, genre])

  async function handleDelete(film) {
    if (!confirm(`Remove "${film.title}" from your history?`)) return
    await fetch(`/api/film/${film.id}`, { method: 'DELETE' })
    toast.success(`Removed "${film.title}"`)
    fetchFilms()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-text">Watch History</h1>
          <p className="text-muted text-sm font-mono mt-1">{films.length} films logged</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-surface border border-border rounded-xl">
        <div className="flex items-center gap-1.5 text-muted">
          <AdjustmentsHorizontalIcon className="w-4 h-4" />
          <span className="text-xs font-mono">Filters</span>
        </div>

        <div className="w-px h-4 bg-border" />

        <div className="flex items-center gap-2">
          <label className="text-muted text-xs font-mono whitespace-nowrap">Sort</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-32 bg-surface-2 border border-border text-text text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-gold"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="w-px h-4 bg-border" />

        <div className="flex items-center gap-2">
          <label className="text-muted text-xs font-mono whitespace-nowrap">Min Rating</label>
          <div className="flex items-center gap-1.5">
            <input
              type="range"
              min={1}
              max={10}
              step={0.5}
              value={minRating}
              onChange={(e) => setMinRating(parseFloat(e.target.value))}
              className="w-20 accent-gold"
            />
            <span className="text-gold font-mono text-sm w-6">{minRating}</span>
          </div>
        </div>

        <div className="w-px h-4 bg-border" />

        {allGenres.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-muted text-xs font-mono">Genre</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-32 bg-surface-2 border border-border text-text text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-gold"
            >
              <option value="">All</option>
              {allGenres.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <label className="text-muted text-xs font-mono">Decade</label>
          <select
            value={decade}
            onChange={(e) => setDecade(e.target.value)}
            className="w-32 bg-surface-2 border border-border text-text text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-gold"
          >
            <option value="">All</option>
            {DECADE_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {(minRating > 1 || decade || genre) && (
          <button
            onClick={() => { setMinRating(1); setDecade(''); setGenre('') }}
            className="text-muted hover:text-gold text-xs font-mono transition-colors ml-auto"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : films.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <p className="font-display text-xl">No films yet.</p>
          <p className="text-sm mt-1">Log a film to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {films.map((f) => (
            <FilmCard key={f.id} film={f} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
