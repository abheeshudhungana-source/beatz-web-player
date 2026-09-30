'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  House,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Pause,
  Heart,
  MoreHorizontal,
  Mic2,
  Share2,
  Copy,
  Volume2,
  VolumeX,
  Plus,
  Check,
  Loader2,
  X,
} from 'lucide-react';

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface LyricLine {
  text: string;
  startMs: number;
}

function parseSyncedLyrics(syncedLyrics: string): LyricLine[] {
  const lyricLines: LyricLine[] = [];

  for (const rawLine of syncedLyrics.split(/\r?\n/)) {
    const timestampPattern = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
    const timestamps: number[] = [];
    let match: RegExpExecArray | null;

    while ((match = timestampPattern.exec(rawLine)) !== null) {
      const fractionalMs = Number((match[3] ?? '').padEnd(3, '0').slice(0, 3));
      timestamps.push((Number(match[1]) * 60 + Number(match[2])) * 1000 + fractionalMs);
    }

    const text = rawLine.replace(timestampPattern, '').trim();
    if (text) {
      for (const startMs of timestamps) {
        lyricLines.push({ text, startMs });
      }
    }
  }

  return lyricLines.sort((first, second) => first.startMs - second.startMs);
}

export default function Home() {
  const { isAuthenticated, isLoading, user, accessToken, login, logout } = useSpotifyAuth();
  const { query: searchQuery, setQuery: setSearchQuery, results: searchResults, isSearching } = useSpotifySearch();
  const [addedTrackId, setAddedTrackId] = useState<string | null>(null);
  const [lyricsForCurrentTrack, setLyricsForCurrentTrack] = useState<LyricLine[]>([]);
  const [lyricsStatus, setLyricsStatus] = useState<'idle' | 'loading' | 'available' | 'unavailable'>('idle');
  const [isTrackOptionsOpen, setIsTrackOptionsOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<'home' | 'search'>('home');
  const mainContentRef = useRef<HTMLElement | null>(null);
  const searchSectionRef = useRef<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const lyricsViewportRef = useRef<HTMLDivElement | null>(null);
  const lyricsPanelRef = useRef<HTMLElement | null>(null);
  const activeLyricRef = useRef<HTMLParagraphElement | null>(null);
  const lastVolumeRef = useRef<number>(0.8);
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
    isShuffleEnabled,
    repeatMode,
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
    toggleShuffle,
    cycleRepeat,
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

  const lyricTrackId = currentTrack?.id;
  const lyricTrackName = currentTrack?.name;
  const lyricArtistName = currentTrack?.artists?.[0]?.name;
  const lyricAlbumName = currentTrack?.album?.name;
  const lyricDurationMs = currentTrack?.durationMs;

  useEffect(() => {
    if (!lyricTrackId || !lyricTrackName || !lyricArtistName) {
      setLyricsForCurrentTrack([]);
      setLyricsStatus('idle');
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      track_name: lyricTrackName,
      artist_name: lyricArtistName,
      duration: String(Math.round((lyricDurationMs ?? 0) / 1000)),
    });
    if (lyricAlbumName) {
      params.set('album_name', lyricAlbumName);
    }

    setLyricsForCurrentTrack([]);
    setLyricsStatus('loading');

    const lookupTimeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/lyrics?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error('Lyrics lookup failed');
        }

        const result = (await response.json()) as { syncedLyrics?: string | null };
        const lines = result.syncedLyrics ? parseSyncedLyrics(result.syncedLyrics) : [];
        setLyricsForCurrentTrack(lines);
        setLyricsStatus(lines.length ? 'available' : 'unavailable');
      } catch {
        if (!controller.signal.aborted) {
          setLyricsForCurrentTrack([]);
          setLyricsStatus('unavailable');
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(lookupTimeout);
      controller.abort();
    };
  }, [lyricTrackId, lyricTrackName, lyricArtistName, lyricAlbumName, lyricDurationMs]);

  const activeLyricIndex = useMemo(() => {
    if (!lyricsForCurrentTrack.length) {
      return -1;
    }

    for (let index = lyricsForCurrentTrack.length - 1; index >= 0; index -= 1) {
      if (progressMs >= lyricsForCurrentTrack[index].startMs) {
        return index;
      }
    }
    return -1;
  }, [lyricsForCurrentTrack, progressMs]);

  useEffect(() => {
    const viewport = lyricsViewportRef.current;
    const activeLine = activeLyricRef.current;

    if (!viewport || !activeLine || activeLyricIndex < 0) {
      return;
    }

    const viewportBounds = viewport.getBoundingClientRect();
    const lineBounds = activeLine.getBoundingClientRect();
    const centeredScrollTop =
      viewport.scrollTop +
      lineBounds.top -
      viewportBounds.top -
      (viewport.clientHeight - lineBounds.height) / 2;

    viewport.scrollTo({ top: centeredScrollTop, behavior: 'smooth' });
  }, [activeLyricIndex, currentTrack?.id]);

  const progressPercent = durationMs > 0 ? Math.min((progressMs / durationMs) * 100, 100) : 0;
  const currentProgressLabel = formatDuration(progressMs);
  const durationLabel = formatDuration(durationMs || 232000);
  const adTimeRemaining = Math.max(0, adState.adDurationMs - adState.adProgressMs);

  useEffect(() => {
    if (volume > 0) {
      lastVolumeRef.current = volume;
    }
  }, [volume]);

  const handleToggleMute = () => {
    if (volume > 0) {
      lastVolumeRef.current = volume;
      setVolume(0);
      return;
    }

    setVolume(lastVolumeRef.current > 0 ? lastVolumeRef.current : 0.8);
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    seekTo((Number(event.target.value) / 100) * durationMs);
  };

  const handleCopyTrackDetails = async () => {
    if (!currentTrack) return;
    try {
      await navigator.clipboard.writeText(`${currentTrack.name} - ${currentTrack.artists.map((artist) => artist.name).join(', ')}`);
      setIsTrackOptionsOpen(false);
    } catch {
      setIsTrackOptionsOpen(false);
    }
  };

  const handleShareTrack = async () => {
    if (!currentTrack) return;
    const trackUrl = `https://open.spotify.com/track/${currentTrack.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: currentTrack.name, text: currentTrack.artists.map((artist) => artist.name).join(', '), url: trackUrl });
      } else {
        await navigator.clipboard.writeText(`${currentTrack.name} - ${currentTrack.artists.map((artist) => artist.name).join(', ')} ${trackUrl}`);
      }
    } catch {
    }
    setIsTrackOptionsOpen(false);
  };

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
            <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-mono font-medium text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
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

      <div className="flex min-h-0 flex-1">
        <aside className="relative z-20 flex h-full w-16 shrink-0 border-r border-spotify-border bg-[#101010] px-2" aria-label="Primary navigation">
          <nav className="flex h-full w-full flex-col justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveNav('home');
                mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`group relative flex h-12 w-full items-center justify-center rounded-xl text-sm font-medium transition ${
                activeNav === 'home'
                  ? 'bg-spotify-elevated text-white'
                  : 'text-zinc-400 hover:bg-spotify-elevated/70 hover:text-white'
              }`}
              aria-current={activeNav === 'home' ? 'page' : undefined}
              aria-label="Home"
            >
              <House className={`h-5 w-5 shrink-0 ${activeNav === 'home' ? 'text-spotify-green' : 'group-hover:text-spotify-green'}`} />
              <span className="pointer-events-none absolute left-full z-30 ml-3 translate-x-1 whitespace-nowrap rounded-md border border-spotify-border bg-spotify-elevated px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">Home</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveNav('search');
                searchSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                searchInputRef.current?.focus({ preventScroll: true });
              }}
              className={`group relative flex h-12 w-full items-center justify-center rounded-xl text-sm font-medium transition ${
                activeNav === 'search'
                  ? 'bg-spotify-elevated text-white'
                  : 'text-zinc-400 hover:bg-spotify-elevated/70 hover:text-white'
              }`}
              aria-current={activeNav === 'search' ? 'page' : undefined}
              aria-label="Search"
            >
              <Search className={`h-5 w-5 shrink-0 ${activeNav === 'search' ? 'text-spotify-green' : 'group-hover:text-spotify-green'}`} />
              <span className="pointer-events-none absolute left-full z-30 ml-3 translate-x-1 whitespace-nowrap rounded-md border border-spotify-border bg-spotify-elevated px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">Search</span>
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main ref={mainContentRef} className="min-w-0 flex-1 space-y-8 overflow-y-auto p-6 lg:p-8">
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

        </div>

        <section ref={searchSectionRef} className="rounded-3xl border border-spotify-border bg-spotify-surface p-5 shadow-xl shadow-black/20">
          <div className="relative flex items-center gap-3 rounded-2xl border border-spotify-highlight bg-spotify-elevated px-4 py-3">
            <Search className="h-4 w-4 text-spotify-subtext shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search songs, artists, or albums (e.g. The Weeknd, Dua Lipa, Ed Sheeran)..."
              className="w-full bg-transparent text-sm text-white placeholder:text-spotify-subtext outline-none pr-8"
            />
            {searchQuery.trim().length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-zinc-300 transition hover:bg-white/20 hover:text-white"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {isSearching && (
              <Loader2 className="absolute right-10 h-4 w-4 text-spotify-green animate-spin shrink-0" />
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
                      <div className="group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-spotify-green/15 text-spotify-green shrink-0">
                        {track.album?.images?.[0]?.url ? (
                          <img src={track.album.images[0].url} alt={track.name} className="h-full w-full object-cover" />
                        ) : (
                          <Music className="h-5 w-5" />
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playTrack(track);
                          }}
                          className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/35 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                          title="Play track"
                          aria-label={`Play ${track.name}`}
                        >
                          <Play className="h-4 w-4 fill-current text-white ml-0.5" />
                        </button>
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

              <div className="rounded-2xl border border-spotify-border bg-spotify-elevated/40 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-spotify-subtext font-semibold">Up Next</p>
                  <span className="text-[10px] text-zinc-400 font-mono">{queue.upcomingTracks.length} tracks</span>
                </div>

                {queue.upcomingTracks.length > 0 ? (
                  <div className="space-y-2">
                    {queue.upcomingTracks.slice(0, 5).map((track, index) => (
                      <button
                        key={`${track.id}-${index}`}
                        onClick={() => playTrack(track)}
                        className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-transparent px-2 py-1.5 text-left transition hover:border-spotify-green/30 hover:bg-spotify-elevated/60"
                      >
                        <span className="w-4 text-center font-mono text-[10px] text-zinc-500">{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-white">{track.name}</p>
                          <p className="truncate text-[10px] text-spotify-subtext">
                            {track.artists.map((artist) => artist.name).join(', ')}
                          </p>
                        </div>
                        <span className="font-mono text-[10px] text-zinc-500">{formatDuration(track.durationMs)}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No tracks queued yet. Search for something to play next.</p>
                )}
              </div>
            </div>
          </section>

          <aside ref={lyricsPanelRef} id="lyrics-panel" className="rounded-3xl border border-spotify-border bg-spotify-surface p-5 shadow-xl shadow-black/20 flex flex-col">
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

              <div ref={lyricsViewportRef} className="max-h-72 space-y-2 overflow-y-auto scroll-smooth pr-2 text-sm leading-7">
                {lyricsStatus === 'loading' && <p className="text-zinc-500">Finding synchronized lyrics...</p>}
                {lyricsStatus === 'unavailable' && (
                  <p className="text-zinc-500">Synchronized lyrics are not available for this track.</p>
                )}
                {lyricsStatus === 'idle' && <p className="text-zinc-500">Select a track to view its lyrics.</p>}
                {lyricsForCurrentTrack.map((line, index) => {
                  const isActive = index === activeLyricIndex;

                  return (
                    <p
                      key={`${currentTrack?.id ?? 'track'}-${line.startMs}-${index}`}
                      ref={isActive ? activeLyricRef : null}
                      aria-current={isActive ? 'true' : undefined}
                      className={[
                        'rounded-r-md border-l-2 py-1 pl-3 pr-2 transition-colors duration-200',
                        isActive
                          ? 'border-spotify-green/70 bg-transparent font-bold text-white'
                          : 'border-transparent text-zinc-400',
                      ].join(' ')}
                    >
                      {line.text}
                    </p>
                  );
                })}
              </div>
            </div>

          </aside>
        </div>

        </main>
      </div>

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
          <div className="flex min-w-0 items-center gap-2 self-center">
            <div className="min-w-0">
              <p className="truncate font-semibold text-white text-sm">{nowPlaying.title}</p>
              <p className="truncate text-[11px] text-spotify-subtext">{nowPlaying.artist}</p>
            </div>
            <button
              className="self-center rounded-full p-1.5 text-zinc-400 hover:text-spotify-green transition"
              title="Like Song"
              aria-label="Like Song"
            >
              <Heart className="h-4 w-4" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTrackOptionsOpen((open) => !open)}
                className="rounded-full p-1.5 text-zinc-400 transition hover:bg-spotify-elevated hover:text-white"
                title="Track options"
                aria-label="Track options"
                aria-expanded={isTrackOptionsOpen}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {isTrackOptionsOpen && (
                <div className="absolute bottom-full left-0 z-30 mb-2 w-44 rounded-lg border border-spotify-border bg-[#202020] p-1 shadow-xl shadow-black/40" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleShareTrack()}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-zinc-200 transition hover:bg-white/10"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share track
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleCopyTrackDetails()}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-zinc-200 transition hover:bg-white/10"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy track details
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex w-[52%] max-w-[620px] flex-col items-center gap-1.5 px-6">
          <div className="flex items-center gap-5 text-zinc-300">
            <button
              type="button"
              onClick={toggleShuffle}
              className={`transition hover:text-white ${isShuffleEnabled ? 'text-spotify-green' : ''}`}
              title={isShuffleEnabled ? 'Turn shuffle off' : 'Turn shuffle on'}
              aria-label={isShuffleEnabled ? 'Turn shuffle off' : 'Turn shuffle on'}
              aria-pressed={isShuffleEnabled}
            >
              <Shuffle className="h-4 w-4" />
            </button>
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
            <button
              type="button"
              onClick={cycleRepeat}
              className={`relative transition hover:text-white ${repeatMode > 0 ? 'text-spotify-green' : ''}`}
              title={repeatMode === 0 ? 'Turn repeat on' : repeatMode === 1 ? 'Repeat current track' : 'Turn repeat off'}
              aria-label={repeatMode === 0 ? 'Turn repeat on' : repeatMode === 1 ? 'Repeat current track' : 'Turn repeat off'}
              aria-pressed={repeatMode > 0}
            >
              {repeatMode === 2 ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex items-center gap-3 w-full">
            <span className="text-[11px] font-mono text-zinc-400 w-8 text-right">
              {currentProgressLabel}
            </span>
            <div className="relative flex-1">
              <input
                type="range"
                min={0}
                max={100}
                step={0.1}
                value={progressPercent}
                onChange={handleSeek}
                style={{ ['--progress' as any]: `${progressPercent}%` }}
                className="slider-progress h-1.5 w-full cursor-pointer appearance-none rounded-full bg-spotify-elevated"
                aria-label="Seek through current track"
              />
            </div>
            <span className="text-[11px] font-mono text-zinc-400 w-8">
              {durationLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 w-[22%]">
          <button
            type="button"
            onClick={() => lyricsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className="rounded-full p-2 text-zinc-400 transition hover:bg-spotify-elevated hover:text-white"
            title="Go to lyrics"
            aria-label="Go to lyrics"
            aria-controls="lyrics-panel"
          >
            <Mic2 className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1 rounded-full bg-spotify-elevated px-1.5 py-1 text-zinc-200">
            <button
              type="button"
              onClick={handleToggleMute}
              className="flex items-center justify-center text-zinc-300 transition hover:text-white"
              aria-label={volume === 0 ? 'Unmute audio' : 'Mute audio'}
              title={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => {
                const nextVolume = Number(e.target.value);
                if (nextVolume > 0) {
                  lastVolumeRef.current = nextVolume;
                }
                setVolume(nextVolume);
              }}
              style={{ ['--progress' as any]: `${volume * 100}%` }}
              className="w-14 accent-spotify-green cursor-pointer"
              aria-label="Volume control"
            />
          </div>

          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-spotify-green/10 border border-spotify-green/30 px-2 py-1.5 text-[11px] font-semibold text-spotify-green hover:bg-spotify-green hover:text-black transition shadow-sm"
            title="Open Beatz AI Co-Pilot"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Beatz AI</span>
          </button>

          <button
            onClick={() => setQueueOpen(true)}
            className="rounded-full bg-spotify-elevated px-2 py-1.5 text-[11px] font-medium text-spotify-green hover:bg-spotify-green hover:text-black transition"
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
