import { useEffect, useRef, useState } from 'react'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'

const TMDB_PLACEHOLDER = 'https://via.placeholder.com/40x60/1A1A1A/6B6B6B?text=?'

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function SearchBar({ onSelect, placeholder = 'Search for a film...' }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 300)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      setOpen(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setResults(data)
          setOpen(true)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [debouncedQuery])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSelect(film) {
    setQuery('')
    setOpen(false)
    setResults([])
    onSelect(film)
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-surface border border-border rounded-xl pl-10 pr-10 py-3 text-text placeholder-muted focus:outline-none focus:border-gold transition-colors text-sm"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setOpen(false) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-surface border border-border rounded-xl overflow-hidden z-50 shadow-2xl animate-fade-in">
          {loading ? (
            <div className="px-4 py-3 text-muted text-sm">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-muted text-sm">No results found.</div>
          ) : (
            results.map((film) => (
              <button
                key={film.tmdb_id}
                onClick={() => handleSelect(film)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors text-left group"
              >
                <img
                  src={film.poster_path || TMDB_PLACEHOLDER}
                  alt={film.title}
                  className="w-9 h-14 object-cover rounded flex-shrink-0 bg-surface-2"
                  onError={(e) => { e.target.src = TMDB_PLACEHOLDER }}
                />
                <div className="min-w-0">
                  <p className="text-text text-sm font-medium truncate group-hover:text-gold transition-colors">
                    {film.title}
                  </p>
                  <p className="text-muted text-xs">{film.year || '-'}</p>
                  {film.overview && (
                    <p className="text-muted text-xs mt-0.5 line-clamp-1">{film.overview}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
