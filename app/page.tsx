'use client';

import { useSpotifyAuth } from '@/hooks/useSpotifyAuth';
import {
  Music,
  Sparkles,
  ListMusic,
  Play,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Search,
  SkipBack,
  SkipForward,
  Pause,
  Heart,
  Volume2,
} from 'lucide-react';

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

  // Authenticated View: Day 2 Player & Queue Shell
  const queueTracks = [
    { title: 'Midnight City', artist: 'M83', duration: '3:52', accent: 'bg-blue-500/15 text-blue-300', active: true },
    { title: 'Afterdark', artist: 'Cyril', duration: '4:18', accent: 'bg-violet-500/15 text-violet-300', active: false },
    { title: 'Bohemian Rhapsody', artist: 'Queen', duration: '5:54', accent: 'bg-pink-500/15 text-pink-300', active: false },
    { title: 'Night Drive', artist: 'Nils Frahm', duration: '3:41', accent: 'bg-emerald-500/15 text-emerald-300', active: false },
    { title: 'Lush Life', artist: 'Zara Larsson', duration: '4:07', accent: 'bg-orange-500/15 text-orange-300', active: false },
  ];

  const nowPlaying = queueTracks[0];
  const progress = 38;

  return (
    <div className="flex h-screen flex-col bg-spotify-dark text-white select-none">
      <header className="h-16 border-b border-spotify-border bg-spotify-surface/80 backdrop-blur px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-spotify-green flex items-center justify-center">
            <Music className="h-5 w-5 text-black" />
          </div>
          <span className="font-bold text-lg tracking-tight">BEATZ</span>
          <span className="text-[11px] bg-spotify-elevated text-spotify-green px-2 py-0.5 rounded-full font-mono font-medium border border-spotify-highlight">
            Day 2 UI
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-spotify-elevated px-3 py-1.5 rounded-full border border-spotify-highlight text-spotify-subtext">
            <Search className="h-3.5 w-3.5" />
            <span className="text-[11px]">Search library</span>
          </div>

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

      <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8">
        {user?.product !== 'premium' && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3 text-amber-300 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Spotify Free Account Detected</p>
              <p className="text-xs text-amber-400/80 mt-1">
                Playback controls are mocked in this Day 2 UI, while the SDK integration is still reserved for later milestones.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <section className="bg-spotify-surface border border-spotify-border rounded-3xl p-6 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-spotify-subtext text-xs uppercase tracking-[0.2em]">
                <Sparkles className="h-3.5 w-3.5 text-spotify-green" />
                Now Playing
              </div>
              <button className="flex items-center gap-2 bg-spotify-elevated text-xs text-zinc-200 px-3 py-1.5 rounded-full border border-spotify-highlight hover:border-spotify-green/60 transition">
                <ListMusic className="h-3.5 w-3.5 text-spotify-green" />
                Queue
              </button>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr] items-center">
              <div className="h-[220px] rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-spotify-green p-3 shadow-2xl shadow-violet-900/40">
                <div className="flex h-full w-full items-center justify-center rounded-xl border border-white/20 bg-black/10 backdrop-blur-sm">
                  <Music className="h-20 w-20 text-white/90" />
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.25em] text-spotify-green">Daily Mix</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-white">{nowPlaying.title}</h2>
                  <p className="mt-1 text-sm text-spotify-subtext">{nowPlaying.artist}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-300">
                  <span className="rounded-full border border-spotify-highlight bg-spotify-elevated px-2.5 py-1">Synthwave</span>
                  <span className="rounded-full border border-spotify-highlight bg-spotify-elevated px-2.5 py-1">Night drive</span>
                  <span className="rounded-full border border-spotify-highlight bg-spotify-elevated px-2.5 py-1">4.8K plays</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-spotify-subtext">
                    <span>1:42</span>
                    <span>3:52</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-spotify-elevated">
                    <div className="h-full rounded-full bg-spotify-green" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button className="p-3 rounded-full bg-spotify-elevated text-zinc-200 hover:text-white transition">
                    <SkipBack className="h-5 w-5" />
                  </button>
                  <button className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg shadow-white/20 transition hover:scale-105">
                    <Pause className="h-6 w-6 fill-current" />
                  </button>
                  <button className="p-3 rounded-full bg-spotify-elevated text-zinc-200 hover:text-white transition">
                    <SkipForward className="h-5 w-5" />
                  </button>
                  <button className="ml-auto p-3 rounded-full bg-spotify-elevated text-zinc-200 hover:text-white transition">
                    <Heart className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside className="bg-spotify-surface border border-spotify-border rounded-3xl p-5 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Up next</h3>
              <span className="text-[11px] text-spotify-subtext">5 tracks</span>
            </div>

            <div className="mt-4 space-y-3">
              {queueTracks.map((track, index) => (
                <div
                  key={track.title}
                  className={`flex items-center justify-between rounded-2xl border p-3 transition ${
                    track.active
                      ? 'border-spotify-green/50 bg-spotify-green/10'
                      : 'border-spotify-border bg-spotify-elevated/60 hover:border-spotify-green/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-bold ${track.accent}`}>
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{track.title}</p>
                      <p className="truncate text-[11px] text-spotify-subtext">{track.artist}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-300">{track.duration}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-spotify-surface border border-spotify-border rounded-2xl p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-spotify-subtext">Current vibe</p>
            <h3 className="mt-4 text-xl font-bold text-white">Late-night focus</h3>
            <p className="mt-2 text-sm text-spotify-subtext">Crisp synth textures and warm basslines for deep work sessions.</p>
          </div>

          <div className="bg-spotify-surface border border-spotify-border rounded-2xl p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-spotify-subtext">Mood shift</p>
            <h3 className="mt-4 text-xl font-bold text-white">Boost energy</h3>
            <p className="mt-2 text-sm text-spotify-subtext">Swap the lane toward brighter drums and more rhythmic movement.</p>
          </div>

          <div className="bg-spotify-surface border border-spotify-border rounded-2xl p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-spotify-subtext">AI brief</p>
            <h3 className="mt-4 text-xl font-bold text-white">Queue ready</h3>
            <p className="mt-2 text-sm text-spotify-subtext">Beatz AI can reshape the queue with a single prompt in the next milestone.</p>
          </div>
        </div>
      </main>

      <footer className="h-24 border-t border-spotify-border bg-spotify-surface px-6 flex items-center justify-between text-xs text-spotify-subtext">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-spotify-green flex items-center justify-center text-zinc-50 shadow-lg shadow-violet-900/30">
            <Music className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{nowPlaying.title}</p>
            <p className="truncate text-[11px] text-spotify-subtext">{nowPlaying.artist}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5 flex-1 px-6 max-w-xl">
          <div className="flex items-center gap-5 text-zinc-300">
            <button className="hover:text-white transition"><SkipBack className="h-4 w-4" /></button>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black hover:scale-105 transition">
              <Play className="h-4 w-4 fill-current ml-0.5" />
            </button>
            <button className="hover:text-white transition"><SkipForward className="h-4 w-4" /></button>
          </div>
          <div className="w-full bg-spotify-elevated h-1.5 rounded-full overflow-hidden">
            <div className="bg-spotify-green h-full rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full bg-spotify-elevated text-zinc-200 hover:text-white transition">
            <Volume2 className="h-4 w-4" />
          </button>
          <span className="text-[11px] bg-spotify-elevated px-3 py-1 rounded-full border border-spotify-highlight text-spotify-green">
            OAuth Ready
          </span>
        </div>
      </footer>
    </div>
  );
}
