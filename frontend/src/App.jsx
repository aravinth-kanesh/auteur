import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import {
  ChatBubbleLeftRightIcon,
  FilmIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  QueueListIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

import Dashboard from './pages/Dashboard'
import LogFilm from './pages/LogFilm'
import WatchHistory from './pages/WatchHistory'
import TasteProfile from './pages/TasteProfile'
import Chat from './pages/Chat'

const NAV = [
  { to: '/', label: 'Home', Icon: HomeIcon, exact: true },
  { to: '/log', label: 'Log Film', Icon: MagnifyingGlassIcon },
  { to: '/history', label: 'History', Icon: QueueListIcon },
  { to: '/taste', label: 'Taste', Icon: SparklesIcon },
  { to: '/chat', label: 'Film Brain', Icon: ChatBubbleLeftRightIcon },
]

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-surface border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-7 border-b border-border">
        <div className="flex items-center gap-2">
          <FilmIcon className="w-5 h-5 text-gold" />
          <span className="font-display text-xl font-bold text-text tracking-wide">Auteur</span>
        </div>
        <p className="text-muted text-xs mt-1 font-mono">your cinema intelligence</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ to, label, Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group ${
                isActive
                  ? 'bg-surface-2 text-gold'
                  : 'text-text-dim hover:text-text hover:bg-surface-2'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-gold' : 'text-muted group-hover:text-text-dim'}`} />
                <span>{label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gold" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border">
        <p className="text-muted text-xs font-mono">v0.1.0</p>
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-bg">
        <Sidebar />
        <main className="ml-56 flex-1 min-h-screen">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/log" element={<LogFilm />} />
            <Route path="/history" element={<WatchHistory />} />
            <Route path="/taste" element={<TasteProfile />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
