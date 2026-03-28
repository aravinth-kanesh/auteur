import { StarIcon, TrashIcon } from '@heroicons/react/24/solid'

const PLACEHOLDER = 'https://via.placeholder.com/342x513/1A1A1A/6B6B6B?text=No+Poster'

export default function FilmCard({ film, onDelete, onClick }) {
  const rating = film.user_rating
  const interactive = !!(onClick || onDelete)

  return (
    <div
      className={`relative group rounded-xl overflow-hidden bg-surface border border-border animate-fade-in transition-all duration-200 ${interactive ? 'cursor-pointer hover:border-gold/40 hover:scale-[1.02]' : ''}`}
      onClick={() => onClick && onClick(film)}
    >
      <div className="relative poster-vignette aspect-[2/3] overflow-hidden">
        <img
          src={film.poster_path || PLACEHOLDER}
          alt={film.title}
          className={`w-full h-full object-cover transition-transform duration-300 ${interactive ? 'group-hover:scale-105' : ''}`}
          onError={(e) => { e.target.src = PLACEHOLDER }}
          loading="lazy"
        />
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1">
          <StarIcon className="w-3 h-3 text-gold" />
          <span className="text-gold font-mono text-xs font-medium">{rating?.toFixed(1)}</span>
        </div>
      </div>

      <div className="p-3">
        <h3 className="font-display text-sm font-semibold text-text leading-snug line-clamp-1">
          {film.title}
        </h3>
        <p className="text-muted text-xs mt-0.5 font-mono truncate">
          {film.year || '-'}{film.director ? ` · ${film.director}` : ''}
        </p>
        <div className="flex flex-wrap gap-1 mt-2 min-h-[44px] content-start">
          {film.genres?.slice(0, 2).map((g) => (
            <span key={g} className="text-xs bg-surface-2 text-muted px-2 py-0.5 rounded-full h-fit">
              {g}
            </span>
          ))}
        </div>
      </div>

      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(film) }}
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-sm rounded-lg p-1.5 text-muted hover:text-red-400"
        >
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
