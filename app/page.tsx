'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth';
import { useSpotifySearch } from '@/hooks/useSpotifySearch';
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer';
import { QueueDrawer } from '@/components/QueueDrawer';
import BeatzChatDrawer from '@/components/BeatzChatDrawer';
import { useBeatzStore } from '@/store/beatz-store';
import { MOCK_TRACKS } from '@/lib/spotify';
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
  Plus,
  Check,
  Loader2,
} from 'lucide-react';

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function Home() {
  const { isAuthenticated, isLoading, user, accessToken, login, logout } = useSpotifyAuth();
  const { query: searchQuery, setQuery: setSearchQuery, results: searchResults, isSearching } = useSpotifySearch();
  const [addedTrackId, setAddedTrackId] = useState<string | null>(null);
  const activeUser = user ?? {
    displayName: 'Demo User',
    product: 'premium',
    images: [],
  };

  // Mount the official Spotify Web Playback SDK streaming engine
  useSpotifyPlayer({
    accessToken,
    enabled: isAuthenticated,
  });

  const isSdkActive = useBeatzStore((state) => state.isSdkActive);
  const sdkError = useBeatzStore((state) => state.sdkError);

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
    isChatOpen,
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
    setChatOpen,
    playTrack,
    addToQueue,
  } = useBeatzStore();

  const handleAddToQueue = (e: React.MouseEvent, track: any) => {
    e.stopPropagation();
    addToQueue(track);
    setAddedTrackId(track.id);
    setTimeout(() => setAddedTrackId(null), 1500);
  };

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

  const displayTracks = useMemo(() => {
    if (searchResults.length > 0) return searchResults;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return MOCK_TRACKS.filter((track) => {
        const trackText = `${track.name} ${track.artists.map((artist) => artist.name).join(' ')}`.toLowerCase();
        return trackText.includes(q);
      });
    }
    return MOCK_TRACKS;
  }, [searchResults, searchQuery]);

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

  // Demo mode stays usable even when Spotify auth is not yet available.
  // The login action remains available, but the product shell loads for the prototype.
  return (
    <div className="flex h-screen flex-col bg-spotify-dark text-white select-none">
      {/* Top Header */}
      <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-spotify-border bg-spotify-surface/80 px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-spotify-green">
            <Music className="h-5 w-5 text-black" />
          </div>
          <span className="text-lg font-bold tracking-tight">BEATZ</span>
          {isSdkActive ? (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-mono font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Spotify SDK Active</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full border border-spotify-highlight bg-spotify-elevated px-2 py-0.5 text-[11px] font-mono font-medium text-spotify-green">
              <span>Preview Mode</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 rounded-full border border-spotify-highlight bg-spotify-elevated py-1.5 px-3">
            {activeUser.images?.[0]?.url ? (
              <img
                src={activeUser.images[0].url}
                alt={activeUser.displayName || 'User'}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-spotify-green text-xs font-bold text-black">
                {activeUser.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <span className="text-xs font-medium text-zinc-200">{activeUser.displayName || 'Connected'}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                activeUser.product === 'premium' ? 'bg-spotify-green/20 text-spotify-green' : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {activeUser.product || 'account'}
            </span>
          </div>

          {!isAuthenticated && (
            <button
              onClick={login}
              className="flex items-center gap-2 rounded-full border border-spotify-highlight bg-spotify-elevated px-3 py-1.5 text-xs text-zinc-200 transition hover:border-spotify-green/60"
            >
              <Play className="h-3.5 w-3.5 fill-current text-spotify-green" />
              <span>Connect Spotify</span>
            </button>
          )}

          {isAuthenticated && (
            <button
              onClick={logout}
              title="Log out"
              className="rounded-full p-2 text-spotify-subtext transition hover:bg-spotify-elevated hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 space-y-8 overflow-y-auto p-6 lg:p-8">
        {adState.isAdPlaying && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 shadow-lg shadow-rose-950/20 animate-in fade-in">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300">
                  Ad break in progress &bull; Break #{adState.adIndex}
                </p>
                <h3 className="mt-1 text-sm font-bold text-white">
                  Sponsored message: &ldquo;Upgrade to Beatz Premium for $12.99/mo to remove ads&rdquo;
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-rose-400/40 bg-rose-500/20 px-2.5 py-1 font-mono text-[10px] font-semibold text-rose-200">
                  {formatDuration(adTimeRemaining)} remaining
                </span>
                <button
                  onClick={finishAdBreak}
                  className="rounded-full bg-rose-500 hover:bg-rose-400 text-white text-[10px] font-semibold px-2.5 py-1 transition"
                  title="Simulate ad finish"
                >
                  Skip Demo Ad
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-spotify-subtext">
          {!adState.isAdPlaying && (
            <button
              onClick={() => triggerAdBreak()}
              className="rounded-full border border-spotify-border bg-spotify-surface px-2.5 py-1.5 text-[10px] font-semibold text-zinc-300 transition hover:border-spotify-green/50 hover:text-spotify-green"
            >
              Dev: Ad pacing
            </button>
          )}

          {activeUser.product === 'premium' && isSdkActive ? (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-300">
              Status: Premium SDK
            </span>
          ) : (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-amber-300">
              Status: Preview mode
            </span>
          )}
        </div>

        <section className="rounded-3xl border border-spotify-border bg-spotify-surface p-5 shadow-xl shadow-black/20">
          <div className="relative flex items-center gap-3 rounded-2xl border border-spotify-highlight bg-spotify-elevated px-4 py-3">
            <Search className="h-4 w-4 text-spotify-subtext shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search songs, artists, or albums (e.g. The Weeknd, Dua Lipa, Ed Sheeran)..."
              className="w-full bg-transparent text-sm text-white placeholder:text-spotify-subtext outline-none"
            />
            {isSearching && (
              <Loader2 className="h-4 w-4 text-spotify-green animate-spin shrink-0" />
            )}
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-200">
                {searchQuery ? `Search results for "${searchQuery}"` : '🔥 Popular this week'}
              </h3>
              <span className="text-[11px] text-spotify-subtext font-mono">{displayTracks.length} tracks</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {displayTracks.map((track) => {
                const isJustAdded = addedTrackId === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track)}
                    className="flex items-center justify-between rounded-2xl border border-spotify-border bg-spotify-elevated/60 p-3 text-left transition hover:border-spotify-green/40 hover:bg-spotify-elevated cursor-pointer group"
                  >
                    <div className="flex min-w-0 items-center gap-3 flex-1">
                      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-spotify-green/15 text-spotify-green shrink-0">
                        {track.album?.images?.[0]?.url ? (
                          <img src={track.album.images[0].url} alt={track.name} className="h-full w-full object-cover" />
                        ) : (
                          <Music className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white group-hover:text-spotify-green transition">{track.name}</p>
                        <p className="truncate text-[11px] text-spotify-subtext">
                          {track.artists.map((artist: any) => artist.name).join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-3 shrink-0 opacity-0 transition duration-200 group-hover:opacity-100">
                      <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
                        {formatDuration(track.durationMs)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleAddToQueue(e, track)}
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                          isJustAdded
                            ? 'bg-spotify-green text-black font-semibold'
                            : 'bg-spotify-highlight text-zinc-300 hover:bg-white hover:text-black'
                        }`}
                        title="Add to upcoming queue"
                      >
                        {isJustAdded ? (
                          <>
                            <Check className="h-3 w-3" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3" />
                            <span>Queue</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playTrack(track);
                        }}
                        className="rounded-full bg-white text-black p-1.5 transition hover:scale-105 active:scale-95 shadow-md shadow-white/10"
                        title="Play immediately"
                      >
                        <Play className="h-3.5 w-3.5 fill-black ml-0.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-spotify-border bg-spotify-surface p-6 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-spotify-subtext font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-spotify-green" />
                Queue Overview
              </div>
              <button
                onClick={() => setQueueOpen(true)}
                className="flex items-center gap-2 rounded-full border border-spotify-highlight bg-spotify-elevated px-3 py-1.5 text-xs text-zinc-200 transition hover:border-spotify-green/60"
              >
                <ListMusic className="h-3.5 w-3.5 text-spotify-green" />
                Open Queue
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-spotify-border bg-spotify-elevated/50 p-4">
                <p className="text-[11px] uppercase tracking-[0.25em] text-spotify-green font-semibold">Now Playing</p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-spotify-elevated border border-white/10 shadow-sm shadow-black/20">
                    {currentTrack?.album?.images?.[0]?.url ? (
                      <img src={currentTrack.album.images[0].url} alt={currentTrack.name} className="h-full w-full object-cover" />
                    ) : (
                      <Music className="h-7 w-7 text-spotify-green" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-black tracking-tight text-white">{nowPlaying.title}</h2>
                    <p className="mt-0.5 truncate text-sm text-spotify-subtext">{nowPlaying.artist}</p>
                  </div>
                </div>
              </div>

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

              <div className="flex items-center justify-center gap-4 pt-2">
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
                  className="ml-2 rounded-full bg-spotify-elevated p-3 text-zinc-400 hover:text-spotify-green transition"
                  title="Like Song"
                >
                  <Heart className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-spotify-border bg-spotify-surface p-5 shadow-xl shadow-black/20 flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Lyrics</h3>
              <span className="text-[11px] text-spotify-subtext font-mono">Now playing</span>
            </div>

            <div className="mt-4 flex-1 rounded-2xl border border-spotify-border bg-spotify-elevated/35 p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-spotify-elevated border border-white/10">
                  {currentTrack?.album?.images?.[0]?.url ? (
                    <img src={currentTrack.album.images[0].url} alt={currentTrack.name} className="h-full w-full object-cover" />
                  ) : (
                    <Music className="h-5 w-5 text-spotify-green" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{currentTrack?.name ?? 'No track selected'}</p>
                  <p className="truncate text-[11px] text-spotify-subtext">{currentTrack?.artists?.[0]?.name ?? 'Artist unavailable'}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm leading-7 text-zinc-300">
                <p>Here comes the sun, and I say</p>
                <p>It’s alright</p>
                <p>And I want to hold your hand</p>
                <p>To feel the rhythm in the night</p>
                <p className="text-zinc-500">—</p>
                <p className="text-zinc-500 italic">Lyrics preview for demo playback.</p>
              </div>
            </div>

            <button
              onClick={() => setQueueOpen(true)}
              className="mt-4 w-full rounded-xl bg-spotify-elevated hover:bg-spotify-green/10 hover:text-spotify-green border border-spotify-border py-2 text-xs font-semibold text-zinc-300 transition"
            >
              Open Queue Drawer
            </button>
          </aside>
        </div>

      </main>

      {/* Sticky Bottom Player Bar */}
      <footer className="flex h-24 shrink-0 items-center justify-between border-t border-spotify-border bg-spotify-surface px-6 text-xs text-spotify-subtext z-20">
        <div className="flex min-w-0 items-center gap-3 w-[22%]">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-spotify-elevated text-zinc-300 shadow-sm shadow-black/20">
            {currentTrack?.album?.images?.[0]?.url ? (
              <img src={currentTrack.album.images[0].url} alt={currentTrack.name} className="h-full w-full object-cover" />
            ) : (
              <Music className="h-6 w-6 text-spotify-green" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-white text-sm">{nowPlaying.title}</p>
            <p className="truncate text-[11px] text-spotify-subtext">{nowPlaying.artist}</p>
          </div>
        </div>

        <div className="flex w-[52%] max-w-[620px] flex-col items-center gap-1.5 px-6">
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
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-spotify-elevated">
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

        <div className="flex items-center justify-end gap-3 w-[22%]">
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
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-spotify-green/10 border border-spotify-green/30 px-3 py-1.5 text-[11px] font-semibold text-spotify-green hover:bg-spotify-green hover:text-black transition shadow-sm"
            title="Open Beatz AI Co-Pilot"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Beatz AI</span>
          </button>

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

      {/* Slide-Over Beatz AI Co-Pilot Chat Drawer */}
      <BeatzChatDrawer
        isOpen={isChatOpen}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
}
