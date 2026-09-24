'use client';

import { useSpotifyAuth } from '@/hooks/useSpotifyAuth';
import { Music, Sparkles, ListMusic, Play, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';

import TrackSearch from '@/components/TrackSearch';
import PlayerBar from '@/components/PlayerBar';
import QueueDrawer from '@/components/QueueDrawer';

export default function Home() {
  const { isAuthenticated, isLoading, user, login, logout } = useSpotifyAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-spotify-dark">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-spotify-green border-t-transparent" />
          <p className="text-sm font-medium text-spotify-subtext">Loading Beatz...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated View: Spotify OAuth Connect Screen
  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-[#1e1e1e] to-spotify-dark">
        <div className="max-w-md w-full text-center space-y-8 bg-spotify-surface border border-spotify-border p-10 rounded-2xl shadow-2xl">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-2xl bg-spotify-green flex items-center justify-center shadow-lg shadow-spotify-green/20">
              <Music className="h-10 w-10 text-black" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-white">BEATZ</h1>
            <p className="text-sm text-spotify-subtext leading-relaxed">
              The AI-Powered Spotify Web Player. Free on-demand song choice, real-time queue orchestration, and conversational music discovery.
            </p>
          </div>

          <div className="space-y-3 text-left bg-spotify-elevated p-4 rounded-xl border border-spotify-highlight text-xs text-zinc-300">
            <div className="flex items-center gap-2 text-spotify-green font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Free On-Demand Track Selection</span>
            </div>
            <div className="flex items-center gap-2 text-spotify-green font-semibold">
              <Sparkles className="h-4 w-4" />
              <span>Beatz AI Conversational Co-Pilot</span>
            </div>
            <div className="flex items-center gap-2 text-spotify-green font-semibold">
              <ListMusic className="h-4 w-4" />
              <span>Real-Time Interactive Queue Manager</span>
            </div>
          </div>

          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 bg-spotify-green hover:bg-spotify-green-hover text-black font-bold py-4 px-6 rounded-full transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-spotify-green/25"
          >
            <Play className="h-5 w-5 fill-black" />
            <span>Connect with Spotify</span>
          </button>

          <p className="text-[11px] text-zinc-500">
            Powered by Spotify Web Playback SDK & OAuth 2.0 PKCE.
          </p>
        </div>
      </main>
    );
  }

  // Authenticated View: Base Application Shell (Day 2 Active Layout)
  return (
    <div className="flex h-screen flex-col bg-spotify-dark text-white select-none">
      {/* Top Navigation Header */}
      <header className="h-16 border-b border-spotify-border bg-spotify-surface/80 backdrop-blur px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-spotify-green flex items-center justify-center">
            <Music className="h-5 w-5 text-black" />
          </div>
          <span className="font-bold text-lg tracking-tight">BEATZ</span>
          <span className="text-[11px] bg-spotify-elevated text-spotify-green px-2 py-0.5 rounded-full font-mono font-medium border border-spotify-highlight">
            Day 2 Active
          </span>
        </div>

        {/* User Status Bar */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-spotify-elevated py-1.5 px-3 rounded-full border border-spotify-highlight">
            {user?.images?.[0]?.url ? (
              <img
                src={user.images[0].url}
                alt={user.displayName || 'User'}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-spotify-green text-black text-xs font-bold flex items-center justify-center">
                {user?.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <span className="text-xs font-medium text-zinc-200">{user?.displayName || 'Connected'}</span>
            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
              user?.product === 'premium'
                ? 'bg-spotify-green/20 text-spotify-green'
                : 'bg-amber-500/20 text-amber-400'
            }`}>
              {user?.product || 'account'}
            </span>
          </div>

          <button
            onClick={logout}
            title="Log out"
            className="p-2 text-spotify-subtext hover:text-white hover:bg-spotify-elevated rounded-full transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 space-y-8">
        {user?.product !== 'premium' && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3 text-amber-300 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Spotify Free Account Detected</p>
              <p className="text-xs text-amber-400/80 mt-1">
                You can search tracks, organize queues, and converse with Beatz AI! Direct in-browser audio streaming requires an active Spotify Premium account due to Spotify SDK API restrictions. Audio previews are supported for instant listening.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-white">Welcome back, {user?.displayName || 'Listener'}</h2>
          <p className="text-sm text-spotify-subtext">
            Search tracks and organize your active queue below.
          </p>
        </div>

        {/* Live Search & Queue Orchestration Component */}
        <TrackSearch />

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-spotify-surface border border-spotify-border p-6 rounded-2xl space-y-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              1
            </div>
            <h3 className="font-bold text-lg text-white">On-Demand Audio</h3>
            <p className="text-xs text-spotify-subtext leading-relaxed">
              No forced shuffle. Pick any song from Spotify&apos;s global catalog with zero skip penalties.
            </p>
          </div>

          <div className="bg-spotify-surface border border-spotify-border p-6 rounded-2xl space-y-3">
            <div className="h-10 w-10 rounded-xl bg-spotify-green/20 text-spotify-green flex items-center justify-center font-bold">
              2
            </div>
            <h3 className="font-bold text-lg text-white">Beatz AI Co-Pilot</h3>
            <p className="text-xs text-spotify-subtext leading-relaxed">
              Conversational music curation. Prompt the bot to build queues, alter vibes, and explain track lore.
            </p>
          </div>

          <div className="bg-spotify-surface border border-spotify-border p-6 rounded-2xl space-y-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              3
            </div>
            <h3 className="font-bold text-lg text-white">Transparent Ad Pacing</h3>
            <p className="text-xs text-spotify-subtext leading-relaxed">
              Predictable 3–5 ads/hour with visual countdown timers, decoupled from your navigation controls.
            </p>
          </div>
        </div>
      </main>

      {/* Slide-Over Queue Drawer */}
      <QueueDrawer />

      {/* Persistent Bottom Player Bar */}
      <PlayerBar />
    </div>
  );
}
