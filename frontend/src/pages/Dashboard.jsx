import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusIcon, SparklesIcon } from '@heroicons/react/24/outline'
import FilmCard from '../components/FilmCard'
import StatsPanel from '../components/StatsPanel'
import RatingModal from '../components/RatingModal'

const PLACEHOLDER = 'https://via.placeholder.com/342x513/1A1A1A/6B6B6B?text=No+Poster'

export default function Dashboard() {
  const [recentFilms, setRecentFilms] = useState([])
  const [tasteSummary, setTasteSummary] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingFilms, setLoadingFilms] = useState(true)
  const [selectedFilm, setSelectedFilm] = useState(null)

  useEffect(() => {
    fetch('/api/history?sort=date')
      .then((r) => r.json())
      .then((data) => { setRecentFilms(data.slice(0, 8)); setLoadingFilms(false) })
      .catch(() => setLoadingFilms(false))
  }, [])

  useEffect(() => {
    // Share the same cache as TasteProfile so the text is always identical
    const cached = JSON.parse(localStorage.getItem('auteur_profile_cache') || 'null')

    fetch('/api/stats')
      .then((r) => r.json())
      .then((stats) => {
        const currentCount = stats.total_films ?? 0
        if (cached && cached.filmCount === currentCount && cached.profile?.taste_summary) {
          setTasteSummary(cached.profile.taste_summary)
          setLoadingSummary(false)
          return
        }

        // Film count changed or no cache — re-fetch and populate shared cache
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 60000)
        fetch('/api/taste', { signal: controller.signal })
          .then((r) => r.json())
          .then((data) => {
            setTasteSummary(data.taste_summary)
            localStorage.setItem('auteur_profile_cache', JSON.stringify({
              filmCount: currentCount,
              profile: data,
            }))
          })
          .catch(() => {})
          .finally(() => { clearTimeout(timeout); setLoadingSummary(false) })
      })
      .catch(() => setLoadingSummary(false))
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <p className="text-muted text-sm font-mono">{greeting}</p>
        <h1 className="font-display text-4xl font-bold text-text mt-1">Your Cinema</h1>
      </div>

      {(loadingSummary || tasteSummary) && (
        <div className="mb-8 bg-surface border border-gold/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <SparklesIcon className="w-4 h-4 text-gold" />
            <span className="text-gold text-xs uppercase tracking-widest font-mono">Your Cinematic Identity</span>
          </div>
          {loadingSummary ? (
            <div className="space-y-2">
              <div className="h-4 bg-surface-2 rounded animate-pulse w-full" />
              <div className="h-4 bg-surface-2 rounded animate-pulse w-4/5" />
            </div>
          ) : (
            <p className="font-display text-lg text-text leading-relaxed italic">
              "{tasteSummary}"
            </p>
          )}
        </div>
      )}

      <div className="mb-8">
        <StatsPanel />
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-text font-semibold text-lg">Recently Watched</h2>
          <Link to="/history" className="text-muted hover:text-gold text-sm font-mono transition-colors">
            View all →
          </Link>
        </div>

        {loadingFilms ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-36 flex-shrink-0 aspect-[2/3] bg-surface rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentFilms.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center">
            <p className="text-muted text-sm">No films logged yet.</p>
            <Link
              to="/log"
              className="mt-3 inline-block text-gold text-sm font-mono hover:underline"
            >
              Log your first film →
            </Link>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recentFilms.map((f) => (
              <div key={f.id} className="w-36 flex-shrink-0">
                <FilmCard film={f} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/chat"
          className="bg-surface border border-border rounded-2xl p-5 hover:border-gold/40 transition-all group"
        >
          <SparklesIcon className="w-6 h-6 text-gold mb-3" />
          <h3 className="text-text font-semibold">Ask Film Brain</h3>
          <p className="text-muted text-sm mt-1">
            "What patterns define my taste?" or "What should I watch tonight?"
          </p>
          <span className="text-gold text-sm font-mono mt-2 inline-block group-hover:translate-x-1 transition-transform">
            Open chat →
          </span>
        </Link>

        <Link
          to="/taste"
          className="bg-surface border border-border rounded-2xl p-5 hover:border-gold/40 transition-all group"
        >
          <div className="flex items-end gap-0.5 mb-3">
            {[8, 5, 9, 4, 7].map((h, i) => (
              <div
                key={i}
                className="w-3 bg-gold rounded-sm"
                style={{ height: `${h * 3}px`, opacity: 0.3 + h * 0.07 }}
              />
            ))}
          </div>
          <h3 className="text-text font-semibold">Taste Profile</h3>
          <p className="text-muted text-sm mt-1">
            Genre breakdown, director affinity, decade preferences, hidden patterns.
          </p>
          <span className="text-gold text-sm font-mono mt-2 inline-block group-hover:translate-x-1 transition-transform">
            View profile →
          </span>
        </Link>
      </div>

      <Link
        to="/log"
        aria-label="Log a film"
        className="fixed bottom-8 right-8 w-14 h-14 bg-gold rounded-full flex items-center justify-center shadow-lg hover:bg-gold-dim transition-colors z-30 group"
      >
        <PlusIcon className="w-6 h-6 text-bg" />
        <span className="absolute right-16 bg-surface border border-border text-text text-xs font-mono px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Log a film
        </span>
      </Link>
    </div>
  )
}
