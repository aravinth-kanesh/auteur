import { useState } from 'react'
import SearchBar from '../components/SearchBar'
import RatingModal from '../components/RatingModal'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function LogFilm() {
  const [selectedFilm, setSelectedFilm] = useState(null)
  const [recentlyLogged, setRecentlyLogged] = useState([])

  function handleLogged(film) {
    setRecentlyLogged((prev) => [film, ...prev.slice(0, 4)])
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl font-bold text-text mb-2">Log a Film</h1>
      <p className="text-muted text-sm mb-8 font-mono">Search and rate a film you've watched.</p>

      <SearchBar onSelect={setSelectedFilm} placeholder="Search by title..." />

      {recentlyLogged.length > 0 && (
        <div className="mt-10">
          <p className="text-muted text-xs uppercase tracking-widest font-mono mb-3">Just Logged</p>
          <div className="space-y-2">
            {recentlyLogged.map((f) => (
              <div key={f.id} className="flex items-center gap-3 bg-surface border border-border rounded-xl p-3 animate-slide-up">
                {f.poster_path && (
                  <img src={f.poster_path} alt={f.title} className="w-10 h-14 object-cover rounded" />
                )}
                <div>
                  <p className="text-text text-sm font-medium">{f.title}</p>
                  <p className="text-muted text-xs font-mono">{f.year} · {f.user_rating}/10</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!recentlyLogged.length && (
        <div className="mt-16 text-center text-muted">
          <MagnifyingGlassIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Search for a film above to get started.</p>
        </div>
      )}

      {selectedFilm && (
        <RatingModal
          film={selectedFilm}
          onClose={() => setSelectedFilm(null)}
          onLogged={handleLogged}
        />
      )}
    </div>
  )
}
