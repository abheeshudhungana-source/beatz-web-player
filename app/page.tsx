'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth';
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
  MoreHorizontal,
  Mic2,
  Share2,
  Copy,
  Volume2,
  VolumeX,
  Plus,
  Check,
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

const CURATED_PLAYLISTS = [
  'After Hours Drive',
  'Dreamwave',
  'Dance Floor Essentials',
  'Acoustic Weekend',
  'Fresh Finds',
  'Focus Mode',
  'Bright Side',
  'Soft Landing',
  'On Repeat',
  'Daily Blend',
];

function ArtworkImage({ src, alt, className }: { src?: string; alt: string; className: string }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center bg-[#242424] text-zinc-500 ${className}`}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
      >
        <Music className="h-6 w-6" />
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
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
  const router = useRouter();
  const { isAuthenticated, isLoading, user, accessToken, login, logout } = useSpotifyAuth();
  const [addedTrackId, setAddedTrackId] = useState<string | null>(null);
  const [lyricsForCurrentTrack, setLyricsForCurrentTrack] = useState<LyricLine[]>([]);
  const [lyricsStatus, setLyricsStatus] = useState<'idle' | 'loading' | 'available' | 'unavailable'>('idle');
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isTrackOptionsOpen, setIsTrackOptionsOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<'home' | 'search'>('home');
  const mainContentRef = useRef<HTMLElement | null>(null);
  const lyricsViewportRef = useRef<HTMLDivElement | null>(null);
  const activeLyricRef = useRef<HTMLParagraphElement | null>(null);
  const lastVolumeRef = useRef<number>(0.8);
  const activeUser = user ?? {
    displayName: 'Demo User',
    product: 'premium',
    images: [],
  };

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

  const displayTracks = MOCK_TRACKS;
  const jumpBackTracks = useMemo(() => {
    const tracks = [
      ...(currentTrack ? [currentTrack] : []),
      ...(queue.currentlyPlaying && queue.currentlyPlaying.id !== currentTrack?.id ? [queue.currentlyPlaying] : []),
      ...queue.upcomingTracks,
    ];
    const uniqueTracks = Array.from(new Map(tracks.map((track) => [track.id, track] as const)).values());
    return (uniqueTracks.length ? uniqueTracks : MOCK_TRACKS).slice(0, 8);
  }, [currentTrack, queue.currentlyPlaying, queue.upcomingTracks]);
  const topArtists = useMemo(() => {
    const sourceTracks = [...jumpBackTracks, ...MOCK_TRACKS];
    const seenArtistNames = new Set<string>();
    const uniqueArtists = sourceTracks.flatMap((track) => track.artists.map((artist) => ({ artist, track }))).filter(({ artist }) => {
      if (!artist?.name || seenArtistNames.has(artist.name.toLowerCase())) return false;
      seenArtistNames.add(artist.name.toLowerCase());
      return true;
    });
    if (!uniqueArtists.length) return [];
    return Array.from({ length: Math.min(10, Math.max(uniqueArtists.length, 6)) }, (_, index) => {
      const item = uniqueArtists[index % uniqueArtists.length];
      return {
        ...item,
        cardId: `${item?.artist?.id || 'artist'}-${index}`,
      };
    });
  }, [jumpBackTracks]);

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
      <header className={`z-10 flex h-16 shrink-0 items-center justify-between border-b border-spotify-border bg-spotify-surface/80 px-6 backdrop-blur transition-[margin] duration-300 ${isLyricsOpen ? 'md:mr-80 lg:mr-96' : ''}`}>
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

      <div className={`flex min-h-0 flex-1 transition-[margin] duration-300 ${isLyricsOpen ? 'md:mr-80 lg:mr-96' : ''}`}>
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
                router.push('/search');
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
        <main ref={mainContentRef} className="min-w-0 flex-1 overflow-y-auto">
          <div className="sticky top-0 z-20 border-b border-spotify-border bg-spotify-dark/95 px-6 py-3 backdrop-blur lg:px-8">
            <button
              onClick={() => triggerAdBreak()}
              disabled={adState.isAdPlaying}
              className="rounded-full border border-spotify-border bg-spotify-surface px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-spotify-green/50 hover:text-spotify-green disabled:cursor-not-allowed disabled:opacity-50"
            >
              Dev: Ad pacing
            </button>
          </div>

          <div className="space-y-10 p-6 lg:space-y-12 lg:p-8">
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

        <section className="space-y-4">
          <div>
            <p className="text-sm font-medium text-spotify-subtext">Your music, right where you left it</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white md:text-4xl">Good afternoon</h1>
          </div>
          <h2 className="pt-1 text-xl font-bold text-white">Jump Back In</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-3">
            {jumpBackTracks.map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => playTrack(track)}
                className="group flex min-w-0 items-center gap-3 overflow-hidden rounded-lg bg-spotify-elevated/65 text-left transition hover:bg-[#303030]"
              >
                <ArtworkImage src={track.album?.images?.[0]?.url} alt="" className="h-14 w-14 object-cover" />
                <span className="min-w-0 flex-1 py-2 pr-3">
                  <span className="block truncate text-xs font-semibold text-white group-hover:text-spotify-green">{track.name}</span>
                  <span className="mt-1 block truncate text-[10px] text-spotify-subtext">{track.artists.map((artist) => artist.name).join(', ')}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-xl font-bold text-white">Popular this week</h2>
            <span className="text-[11px] text-spotify-subtext font-mono">{displayTracks.length} tracks</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {displayTracks.map((track) => {
              const isJustAdded = addedTrackId === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => playTrack(track)}
                  className="group flex cursor-pointer items-center justify-between rounded-2xl border border-spotify-border bg-spotify-elevated/60 p-3 text-left transition hover:border-spotify-green/40 hover:bg-spotify-elevated"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-spotify-green/15 text-spotify-green">
                      <ArtworkImage src={track.album?.images?.[0]?.url} alt={track.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          playTrack(track);
                        }}
                        className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/35 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        title="Play track"
                        aria-label={`Play ${track.name}`}
                      >
                        <Play className="ml-0.5 h-4 w-4 fill-current text-white" />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white transition group-hover:text-spotify-green">{track.name}</p>
                      <p className="truncate text-[11px] text-spotify-subtext">{track.artists.map((artist) => artist.name).join(', ')}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pl-3 opacity-0 transition duration-200 group-hover:opacity-100">
                    <span className="hidden font-mono text-[11px] text-zinc-400 sm:inline">{formatDuration(track.durationMs)}</span>
                    <button
                      type="button"
                      onClick={(event) => handleAddToQueue(event, track)}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${isJustAdded ? 'bg-spotify-green font-semibold text-black' : 'bg-spotify-highlight text-zinc-300 hover:bg-white hover:text-black'}`}
                      title="Add to upcoming queue"
                    >
                      {isJustAdded ? <><Check className="h-3 w-3" /><span>Added</span></> : <><Plus className="h-3 w-3" /><span>Queue</span></>}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        playTrack(track);
                      }}
                      className="rounded-full bg-white p-1.5 text-black shadow-md shadow-white/10 transition hover:scale-105 active:scale-95"
                      title="Play immediately"
                    >
                      <Play className="ml-0.5 h-3.5 w-3.5 fill-black" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">Made For You</h2>
          <div className="no-scrollbar flex gap-5 overflow-x-auto scroll-smooth pb-2">
            {CURATED_PLAYLISTS.map((title, index) => {
              const track = MOCK_TRACKS[index % MOCK_TRACKS.length];
              return (
              <button
                key={title}
                type="button"
                onClick={() => playTrack(track)}
                className="group w-40 shrink-0 text-left sm:w-48"
                aria-label={`Play ${title}`}
              >
                <div className="relative aspect-square overflow-hidden rounded-lg bg-spotify-elevated">
                  <ArtworkImage src={track.album?.images?.[0]?.url} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
                  <span className="absolute bottom-3 right-3 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-spotify-green text-black opacity-0 shadow-xl transition group-hover:translate-y-0 group-hover:opacity-100">
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  </span>
                </div>
                <span className="mt-3 block truncate text-sm font-semibold text-white">{title}</span>
                <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-spotify-subtext">Made for you from {track.name}</span>
              </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">Your Top Artists</h2>
          <div className="no-scrollbar flex gap-5 overflow-x-auto scroll-smooth pb-2">
            {topArtists.map(({ artist, track, cardId }) => {
              const artistImageUrl = artist.images?.[0]?.url ?? track.album?.images?.[0]?.url;

              return (
                <button
                  key={cardId}
                  type="button"
                  onClick={() => playTrack(track)}
                  className="group flex w-32 shrink-0 flex-col items-center text-center"
                  aria-label={`Play ${artist.name}`}
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-full bg-spotify-elevated shadow-lg shadow-black/20 ring-1 ring-white/10 transition group-hover:ring-spotify-green/70">
                    <ArtworkImage
                      src={artist.images?.[0]?.url || track.album?.images?.[0]?.url}
                      alt={artist.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <span className="mt-3 w-full truncate text-sm font-medium text-white group-hover:text-spotify-green">{artist.name}</span>
                </button>
              );
            })}
          </div>
        </section>

          </div>
        </main>
      </div>

      <aside
        id="lyrics-panel"
        aria-label="Lyrics panel"
        aria-hidden={!isLyricsOpen}
        className={`fixed right-0 top-0 bottom-24 z-30 flex w-[min(100vw,20rem)] flex-col border-l border-spotify-border bg-spotify-surface p-5 shadow-2xl shadow-black/40 transition-[transform,opacity] duration-300 md:w-80 lg:w-96 ${
          isLyricsOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-full opacity-0'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Lyrics</h3>
            <p className="mt-0.5 text-[11px] text-spotify-subtext">Now playing</p>
          </div>
          <button
            type="button"
            onClick={() => setIsLyricsOpen(false)}
            className="rounded-full p-2 text-zinc-400 transition hover:bg-spotify-elevated hover:text-white"
            title="Close lyrics"
            aria-label="Close lyrics panel"
            tabIndex={isLyricsOpen ? 0 : -1}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-2xl border border-spotify-border bg-spotify-elevated/35 p-4">
          <div className="mb-4 flex shrink-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-spotify-elevated">
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

          <div ref={lyricsViewportRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto scroll-smooth pr-2 text-sm leading-7">
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
  );
}
