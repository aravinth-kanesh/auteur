import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import FilmCard from '../components/FilmCard'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { StarIcon } from '@heroicons/react/24/solid'

const GENRE_COLORS = [
  '#F5A623', '#E8834A', '#C95C70', '#9B6BD6', '#5B7EE5',
  '#4BBCC4', '#58C66B', '#B0C45A', '#E8D24A', '#C4A45A',
]

function TasteDNABar({ genres }) {
  const total = genres.reduce((sum, g) => sum + g.count, 0)
  if (!total) return null
  return (
    <div className="mt-4">
      <p className="text-muted text-xs uppercase tracking-widest font-mono mb-2">Taste DNA</p>
      <div className="flex rounded-full overflow-hidden h-4">
        {genres.slice(0, 8).map((g, i) => (
          <div
            key={g.genre}
            style={{ width: `${(g.count / total) * 100}%`, background: GENRE_COLORS[i % GENRE_COLORS.length] }}
            title={`${g.genre}: ${Math.round((g.count / total) * 100)}%`}
            className="transition-all"
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {genres.slice(0, 6).map((g, i) => (
          <div key={g.genre} className="flex items-center gap-1.5 text-xs text-muted">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: GENRE_COLORS[i % GENRE_COLORS.length] }}
            />
            {g.genre} <span className="text-text-dim">({Math.round((g.count / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 text-xs font-mono">
      <p className="text-text">{d.genre || d.decade}</p>
      <p className="text-gold">{d.count} films · avg {d.avg_rating}/10</p>
    </div>
  )
}

export default function TasteProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cached = JSON.parse(localStorage.getItem('auteur_profile_cache') || 'null')

    fetch('/api/stats')
      .then((r) => r.json())
      .then((stats) => {
        const currentCount = stats.total_films ?? 0
        if (cached && cached.filmCount === currentCount && cached.profile) {
          setProfile(cached.profile)
          setLoading(false)
          return
        }

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 60000)
        fetch('/api/taste', { signal: controller.signal })
          .then((r) => r.json())
          .then((d) => {
            setProfile(d)
            localStorage.setItem('auteur_profile_cache', JSON.stringify({
              filmCount: currentCount,
              profile: d,
            }))
          })
          .catch(() => {})
          .finally(() => { clearTimeout(timeout); setLoading(false) })
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-surface rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!profile || profile.top_films?.length === 0) {
    return (
      <div className="p-8 text-center py-20 text-muted">
        <p className="font-display text-xl">Not enough data yet.</p>
        <p className="text-sm mt-1">Log at least 3 films to see your taste profile.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl space-y-8">
      <h1 className="font-display text-3xl font-bold text-text">Taste Profile</h1>

      {profile.taste_summary && (
        <div className="bg-surface border border-gold/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <SparklesIcon className="w-4 h-4 text-gold" />
            <p className="text-gold text-xs uppercase tracking-widest font-mono">Cinematic Identity</p>
          </div>
          <p className="font-display text-lg text-text leading-relaxed italic">
            "{profile.taste_summary}"
          </p>
        </div>
      )}

      {profile.genre_distribution?.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <TasteDNABar genres={profile.genre_distribution} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {profile.genre_distribution?.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h3 className="text-text font-semibold mb-4">Genre Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={profile.genre_distribution.slice(0, 8)}
                  dataKey="count"
                  nameKey="genre"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {profile.genre_distribution.slice(0, 8).map((entry, i) => (
                    <Cell key={entry.genre} fill={GENRE_COLORS[i % GENRE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {profile.decade_preference?.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h3 className="text-text font-semibold mb-4">By Decade</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={profile.decade_preference} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                <XAxis dataKey="decade" tick={{ fill: '#6B6B6B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B6B6B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avg_rating" fill="#F5A623" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {profile.director_affinity?.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h3 className="text-text font-semibold mb-4">Director Affinity</h3>
          <div className="space-y-3">
            {profile.director_affinity.map((d) => (
              <div key={d.director} className="flex items-center gap-4">
                <div className="w-40 flex-shrink-0">
                  <p className="text-text text-sm font-medium">{d.director}</p>
                  <p className="text-muted text-xs font-mono">{d.film_count} film{d.film_count !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex-1 bg-surface-2 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gold transition-all"
                    style={{ width: `${(d.avg_rating / 10) * 100}%` }}
                  />
                </div>
                <div className="flex items-center gap-1 w-16 justify-end">
                  <StarIcon className="w-3 h-3 text-gold" />
                  <span className="text-gold font-mono text-sm">{d.avg_rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {profile.hidden_patterns && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h3 className="text-text font-semibold mb-3">Hidden Patterns</h3>
          <p className="text-text-dim text-sm leading-relaxed">{profile.hidden_patterns}</p>
        </div>
      )}

      {profile.top_films?.length > 0 && (
        <div>
          <h3 className="text-text font-semibold mb-4">Your Top Films</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {profile.top_films.map((f) => (
              <FilmCard key={f.id} film={f} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
