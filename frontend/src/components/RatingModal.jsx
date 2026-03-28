import { useEffect, useState } from 'react'
import { XMarkIcon, StarIcon } from '@heroicons/react/24/solid'
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const PLACEHOLDER = 'https://via.placeholder.com/500x750/1A1A1A/6B6B6B?text=No+Poster'

export default function RatingModal({ film, onClose, onLogged }) {
  const [details, setDetails] = useState(null)
  const [rating, setRating] = useState(7)
  const [hoverRating, setHoverRating] = useState(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(true)

  useEffect(() => {
    if (!film) return
    const controller = new AbortController()
    fetch(`/api/film/${film.tmdb_id}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => { setDetails(d); setLoadingDetails(false) })
      .catch((e) => { if (e.name !== 'AbortError') { setDetails(film); setLoadingDetails(false) } })
    return () => controller.abort()
  }, [film?.tmdb_id])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const resp = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: film.tmdb_id,
          user_rating: rating,
          user_notes: notes || null,
          watched_date: new Date().toISOString().split('T')[0],
        }),
      })
      if (!resp.ok) throw new Error('Failed to log')
      const logged = await resp.json()
      toast.success(`Logged "${logged.title}"`)
      onLogged(logged)
      onClose()
    } catch (err) {
      toast.error('Failed to log film. Is the backend running?')
    } finally {
      setSubmitting(false)
    }
  }

  if (!film) return null
  const data = details || film
  const displayRating = hoverRating ?? rating

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl overflow-hidden animate-slide-up shadow-2xl">
        <div className="flex">
          <div className="w-48 flex-shrink-0 self-start">
            <img
              src={data.poster_path || PLACEHOLDER}
              alt={data.title}
              className="w-full aspect-[2/3] object-cover"
              onError={(e) => { e.target.src = PLACEHOLDER }}
            />
          </div>

          <div className="flex-1 p-6 flex flex-col">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted hover:text-text transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            <div className="flex-1">
              <h2 className="font-display text-2xl font-bold text-text leading-tight">
                {data.title}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-muted text-sm font-mono">
                {data.year && <span>{data.year}</span>}
                {data.runtime && <span>{data.runtime} min</span>}
                {data.director && <span>Dir. {data.director}</span>}
              </div>

              {loadingDetails ? (
                <div className="mt-3 h-4 bg-surface-2 rounded animate-pulse w-3/4" />
              ) : (
                <>
                  {data.genres && data.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {data.genres.map((g) => (
                        <span key={g} className="text-xs bg-surface-2 text-text-dim px-2 py-0.5 rounded-full">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}

                  {data.overview && (
                    <p className="text-text-dim text-sm mt-3 line-clamp-3 leading-relaxed">
                      {data.overview}
                    </p>
                  )}

                  {data.cast && data.cast.length > 0 && (
                    <p className="text-muted text-xs mt-2 font-mono">
                      {data.cast.slice(0, 3).join(' · ')}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-text-dim text-xs uppercase tracking-widest mb-2 font-mono">Your Rating</p>
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="transition-transform hover:scale-110"
                  >
                    {n <= displayRating ? (
                      <StarIcon className="w-5 h-5 text-gold" />
                    ) : (
                      <StarOutlineIcon className="w-5 h-5 text-border" />
                    )}
                  </button>
                ))}
                <span className="ml-2 text-gold font-mono font-bold text-lg">{displayRating}</span>
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you think? (optional)"
                rows={2}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-text placeholder-muted text-sm resize-none focus:outline-none focus:border-gold transition-colors"
              />

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="mt-3 w-full bg-gold text-bg font-semibold py-2.5 rounded-lg hover:bg-gold-dim transition-colors disabled:opacity-50 text-sm"
              >
                {submitting ? 'Logging...' : 'Log Film'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
