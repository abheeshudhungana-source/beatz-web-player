'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth';
import { QueueDrawer } from '@/components/QueueDrawer';
import TrackSearch from '@/components/TrackSearch';
import { useBeatzStore } from '@/store/beatz-store';
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

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function Home() {
  const { isAuthenticated, isLoading, user, login, logout } = useSpotifyAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const {
    currentTrack,
    queue,
    isPlaying,
    progressMs,
    durationMs,
    volume,
    isReady,
    adState,
    isQueueOpen,
    togglePlay,
    nextTrack,
    previousTrack,
    setVolume,
    seekTo,
    tickPlayer,
    triggerAdBreak,
    finishAdBreak,
    toggleQueue,
    setQueueOpen,
    playTrack,
  } = useBeatzStore();

  // Tick the player time forward every second
  useEffect(() => {
    const interval = setInterval(() => {
      tickPlayer();
    }, 1000);

    return () => clearInterval(interval);
  }, [tickPlayer]);

  // Predictable ad pacing simulator (3–5 breaks per hour)
  useEffect(() => {
    if (!isPlaying || adState.isAdPlaying) {
      return;
    }

    const timeout = setTimeout(() => {
      if (Math.random() > 0.35) {
        triggerAdBreak();
      }
    }, 25000 + Math.random() * 25000);

    return () => clearTimeout(timeout);
  }, [isPlaying, adState.isAdPlaying, triggerAdBreak]);

  const nowPlaying = useMemo(() => {
    const track = currentTrack ?? queue.currentlyPlaying ?? queue.upcomingTracks[0];

    if (!track) {
      return { title: 'No track selected', artist: 'Beatz AI', duration: '0:00' };
    }

    return {
      title: track.name,
      artist: track.artists?.[0]?.name ?? 'Spotify Artist',
      duration: formatDuration(track.durationMs),
    };
  }, [currentTrack, queue]);

  const progressPercent = durationMs > 0 ? Math.min((progressMs / durationMs) * 100, 100) : 0;
  const currentProgressLabel = formatDuration(progressMs);
  const durationLabel = formatDuration(durationMs || 232000);
  const adTimeRemaining = Math.max(0, adState.adDurationMs - adState.adProgressMs);

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
              <span>Predictable 3–5 Ad Breaks / Hour</span>
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
            Powered by Spotify Web Playback SDK &amp; OAuth 2.0 PKCE.
          </p>
        </div>
      </main>
    );
  }

  // Authenticated View: Complete Sprint Days 1–4 Application Shell
  return (
    <div className="flex h-screen flex-col bg-spotify-dark text-white select-none">
      {/* Top Header */}
      <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-spotify-border bg-spotify-surface/80 px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-spotify-green">
            <Music className="h-5 w-5 text-black" />
          </div>
          <span className="text-lg font-bold tracking-tight">BEATZ</span>
          <span className="rounded-full border border-spotify-highlight bg-spotify-elevated px-2 py-0.5 text-[11px] font-mono font-medium text-spotify-green">
            Days 1–4 Live
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setQueueOpen(true)}
            className="flex items-center gap-2 rounded-full border border-spotify-highlight bg-spotify-elevated px-3 py-1.5 text-xs text-zinc-200 transition hover:border-spotify-green/60"
          >
            <ListMusic className="h-3.5 w-3.5 text-spotify-green" />
            <span>Queue ({queue.upcomingTracks.length})</span>
          </button>

          <div className="hidden min-w-[220px] items-center gap-2 rounded-full border border-spotify-highlight bg-spotify-elevated px-3 py-1.5 text-spotify-subtext sm:flex">
            <Search className="h-3.5 w-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search tracks or artists"
              className="w-full bg-transparent text-xs text-white placeholder:text-spotify-subtext outline-none"
            />
          </div>

          <div className="flex items-center gap-3 rounded-full border border-spotify-highlight bg-spotify-elevated py-1.5 px-3">
            {user?.images?.[0]?.url ? (
              <img
                src={user.images[0].url}
                alt={user.displayName || 'User'}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-spotify-green text-xs font-bold text-black">
                {user?.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <span className="text-xs font-medium text-zinc-200">{user?.displayName || 'Connected'}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                user?.product === 'premium' ? 'bg-spotify-green/20 text-spotify-green' : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {user?.product || 'account'}
            </span>
          </div>

          <button
            onClick={logout}
            title="Log out"
            className="rounded-full p-2 text-spotify-subtext transition hover:bg-spotify-elevated hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 space-y-8 overflow-y-auto p-6 lg:p-8">
        {/* Ad Break Interstitial Countdown Overlay (Day 4 Core Value Prop) */}
        {adState.isAdPlaying && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 shadow-lg shadow-rose-950/20 animate-in fade-in">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-300">
                  Ad break in progress &bull; Break #{adState.adIndex}
                </p>
                <h3 className="mt-1 text-lg font-bold text-white">
                  Sponsored message: &ldquo;Upgrade to Beatz Premium for $12.99/mo to remove ads&rdquo;
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-rose-400/40 bg-rose-500/20 px-3 py-1 font-mono text-sm font-semibold text-rose-200">
                  {formatDuration(adTimeRemaining)} remaining
                </span>
                <button
                  onClick={finishAdBreak}
                  className="rounded-full bg-rose-500 hover:bg-rose-400 text-white text-xs font-semibold px-3 py-1 transition"
                  title="Simulate ad finish"
                >
                  Skip Demo Ad
                </button>
              </div>
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-rose-950/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-400 to-orange-300 transition-all duration-1000"
                style={{ width: `${(adState.adProgressMs / adState.adDurationMs) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Ad Scheduler Simulation Banner */}
        {!adState.isAdPlaying && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-spotify-border bg-spotify-surface p-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-spotify-subtext font-semibold">
                Predictable Ad Pacing
              </p>
              <h3 className="mt-1 text-base font-bold text-white">
                3–5 ad breaks per hour &bull; Decoupled from user skips
              </h3>
            </div>
            <button
              onClick={() => triggerAdBreak()}
              className="rounded-full bg-spotify-elevated hover:bg-spotify-green hover:text-black border border-spotify-border px-4 py-2 text-xs font-semibold text-zinc-200 transition"
            >
              Simulate Ad Break
            </button>
          </div>
        )}

        {/* Free Tier Notice */}
        {user?.product !== 'premium' && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Spotify Free Account Detected</p>
              <p className="mt-1 text-xs text-amber-400/80">
                You can search tracks, organize queues, and stream instant 30-second audio previews! Full uninterrupted SDK streaming activates for Spotify Premium accounts.
              </p>
            </div>
          </div>
        )}

        <section className="rounded-3xl border border-spotify-border bg-spotify-surface p-5 shadow-xl shadow-black/20">
          <div className="flex items-center gap-3 rounded-2xl border border-spotify-highlight bg-spotify-elevated px-4 py-3">
            <Search className="h-4 w-4 text-spotify-subtext" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search the Beatz library"
              className="w-full bg-transparent text-sm text-white placeholder:text-spotify-subtext outline-none"
            />
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-200">
                {searchTerm ? 'Search results' : 'Popular this week'}
              </h3>
              <span className="text-[11px] text-spotify-subtext">{searchTerm ? 2 : 4} tracks</span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-spotify-border bg-spotify-surface p-6 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-spotify-subtext font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-spotify-green" />
                Featured Audio Player
              </div>
              <button
                onClick={() => setQueueOpen(true)}
                className="flex items-center gap-2 rounded-full border border-spotify-highlight bg-spotify-elevated px-3 py-1.5 text-xs text-zinc-200 transition hover:border-spotify-green/60"
              >
                <ListMusic className="h-3.5 w-3.5 text-spotify-green" />
                Queue
              </button>
            </div>

            <div className="mt-6 grid items-center gap-6 md:grid-cols-[200px_1fr]">
              <div className="h-[200px] rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-spotify-green p-3 shadow-2xl shadow-violet-900/40">
                {currentTrack?.album?.images?.[0]?.url ? (
                  <img
                    src={currentTrack.album.images[0].url}
                    alt={currentTrack.name}
                    className="h-full w-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-xl border border-white/20 bg-black/10 backdrop-blur-sm">
                    <Music className="h-16 w-16 text-white/90" />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.25em] text-spotify-green font-semibold">
                    Now Playing
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-white">{nowPlaying.title}</h2>
                  <p className="mt-0.5 text-sm text-spotify-subtext">{nowPlaying.artist}</p>
                </div>

                {/* Progress Scrubber */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-spotify-subtext">
                    <span>{currentProgressLabel}</span>
                    <span>{durationLabel}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-spotify-elevated">
                    <div
                      className="h-full rounded-full bg-spotify-green transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Transport Buttons */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={previousTrack}
                    className="rounded-full bg-spotify-elevated p-3 text-zinc-200 transition hover:text-white"
                    title="Previous Track"
                  >
                    <SkipBack className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (adState.isAdPlaying) {
                        finishAdBreak();
                        return;
                      }
                      togglePlay();
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-lg shadow-white/20 transition hover:scale-105 active:scale-95"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5 fill-current" />
                    ) : (
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={nextTrack}
                    className="rounded-full bg-spotify-elevated p-3 text-zinc-200 transition hover:text-white"
                    title="Next Track"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>

                  <button
                    className="ml-auto rounded-full bg-spotify-elevated p-3 text-zinc-400 hover:text-spotify-green transition"
                    title="Like Song"
                  >
                    <Heart className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Up Next Preview Aside */}
          <aside className="rounded-3xl border border-spotify-border bg-spotify-surface p-5 shadow-xl shadow-black/20 flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Up Next in Queue</h3>
              <span className="text-[11px] text-spotify-subtext font-mono">
                {queue.upcomingTracks.length} upcoming
              </span>
            </div>

            <div className="mt-4 space-y-2.5 flex-1 overflow-y-auto max-h-[220px]">
              {queue.upcomingTracks.slice(0, 4).map((track, index) => (
                <button
                  key={`${track.id}-${index}`}
                  onClick={() => playTrack(track)}
                  className="flex w-full items-center justify-between rounded-xl border border-spotify-border bg-spotify-elevated/40 p-2.5 text-left transition hover:border-spotify-green/40 hover:bg-spotify-elevated group"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-xs font-bold text-zinc-400">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-white group-hover:text-spotify-green transition">
                        {track.name}
                      </p>
                      <p className="truncate text-[11px] text-spotify-subtext">
                        {track.artists?.[0]?.name}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-zinc-400">
                    {formatDuration(track.durationMs)}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setQueueOpen(true)}
              className="mt-4 w-full rounded-xl bg-spotify-elevated hover:bg-spotify-green/10 hover:text-spotify-green border border-spotify-border py-2 text-xs font-semibold text-zinc-300 transition"
            >
              Open Full Queue Drawer
            </button>
          </aside>
        </div>

        {/* Live Track Search & Queue Addition Component */}
        <TrackSearch />

        {/* Value Prop & Vibe Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-spotify-border bg-spotify-surface p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-spotify-subtext">
              Current Vibe
            </p>
            <h3 className="mt-3 text-lg font-bold text-white">On-Demand Freedom</h3>
            <p className="mt-1 text-xs text-spotify-subtext leading-relaxed">
              Play any track without forced mobile shuffle or 6-skip lockouts.
            </p>
          </div>

          <div className="rounded-2xl border border-spotify-border bg-spotify-surface p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-spotify-subtext">
              Coming Day 5
            </p>
            <h3 className="mt-3 text-lg font-bold text-white">Beatz AI Co-Pilot</h3>
            <p className="mt-1 text-xs text-spotify-subtext leading-relaxed">
              Gemini-powered chatbot with native tool-calling to manipulate your queue in real time.
            </p>
          </div>

          <div className="rounded-2xl border border-spotify-border bg-spotify-surface p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-spotify-subtext">
              Store &amp; SDK Status
            </p>
            <h3 className="mt-3 text-lg font-bold text-white">
              {isReady ? 'State Synchronized' : 'Initializing'}
            </h3>
            <p className="mt-1 text-xs text-spotify-subtext leading-relaxed">
              Zustand player store, queue manager, and ad scheduler are unified across Day 1–4 specs.
            </p>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Player Bar */}
      <footer className="flex h-24 shrink-0 items-center justify-between border-t border-spotify-border bg-spotify-surface px-6 text-xs text-spotify-subtext z-20">
        <div className="flex min-w-0 items-center gap-3 w-1/4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-spotify-elevated text-zinc-300">
            <Music className="h-6 w-6 text-spotify-green" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-white text-sm">{nowPlaying.title}</p>
            <p className="truncate text-[11px] text-spotify-subtext">{nowPlaying.artist}</p>
          </div>
        </div>

        <div className="flex max-w-xl flex-1 flex-col items-center gap-1.5 px-6">
          <div className="flex items-center gap-5 text-zinc-300">
            <button
              onClick={previousTrack}
              className="transition hover:text-white"
              title="Previous"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              onClick={() => (adState.isAdPlaying ? finishAdBreak() : togglePlay())}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:scale-105 active:scale-95 shadow-md shadow-white/10"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="transition hover:text-white"
              title="Next (Decoupled from ads)"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 w-full">
            <span className="text-[11px] font-mono text-zinc-400 w-8 text-right">
              {currentProgressLabel}
            </span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-spotify-elevated">
              <div
                className="h-full rounded-full bg-spotify-green"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-zinc-400 w-8">
              {durationLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 w-1/4">
          <div className="flex items-center gap-2 rounded-full bg-spotify-elevated px-2 py-1 text-zinc-200">
            <Volume2 className="h-4 w-4" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-16 accent-spotify-green cursor-pointer"
              aria-label="Volume control"
            />
          </div>

          <button
            onClick={() => setQueueOpen(true)}
            className="rounded-full bg-spotify-elevated px-3 py-1.5 text-[11px] font-medium text-spotify-green hover:bg-spotify-green hover:text-black transition"
          >
            Queue
          </button>
        </div>
      </footer>

      {/* Slide-Over Queue Drawer */}
      <QueueDrawer
        isOpen={isQueueOpen}
        onClose={() => setQueueOpen(false)}
      />
    </div>
  );
}
