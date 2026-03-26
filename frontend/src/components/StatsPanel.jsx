import { useEffect, useState } from 'react'
import { ClockIcon, FilmIcon, StarIcon, UserIcon } from '@heroicons/react/24/outline'

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs uppercase tracking-widest font-mono">{label}</span>
      </div>
      <p className="text-text font-display text-2xl font-bold">{value ?? '—'}</p>
      {sub && <p className="text-muted text-xs font-mono">{sub}</p>}
    </div>
  )
}

export default function StatsPanel() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  const hours = stats ? Math.floor(stats.total_runtime_minutes / 60) : null
  const mins = stats ? stats.total_runtime_minutes % 60 : null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        icon={FilmIcon}
        label="Films Logged"
        value={stats?.total_films}
      />
      <StatCard
        icon={ClockIcon}
        label="Hours Watched"
        value={hours != null ? `${hours}h ${mins}m` : null}
        sub="total runtime"
      />
      <StatCard
        icon={UserIcon}
        label="Top Director"
        value={stats?.top_director}
        sub="most watched"
      />
      <StatCard
        icon={StarIcon}
        label="Avg Rating"
        value={stats?.avg_rating ? `${stats.avg_rating}/10` : null}
        sub={stats?.top_genre ? `fav genre: ${stats.top_genre}` : null}
      />
    </div>
  )
}
