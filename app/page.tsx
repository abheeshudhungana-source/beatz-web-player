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
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Pause,
  MoreHorizontal,
  Share2,
  Copy,
  Volume2,
  VolumeX,
  Plus,
  Check,
} from 'lucide-react';

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, accessToken, login, logout } = useSpotifyAuth();
  const [addedTrackId, setAddedTrackId] = useState<string | null>(null);
  const [isTrackOptionsOpen, setIsTrackOptionsOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<'home' | 'search'>('home');
  const mainContentRef = useRef<HTMLElement | null>(null);
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
    clearAndReplaceQueue,
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

  // Live Spotify Top Artists state for the authenticated user
  const [liveTopArtists, setLiveTopArtists] = useState<Array<{ id: string; name: string; imageUrl: string }>>([]);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/spotify/top-artists')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && Array.isArray(data.artists) && data.artists.length > 0) {
          setLiveTopArtists(data.artists);
        }
      })
      .catch((err) => console.warn('[top-artists] Fallback to local catalog:', err));

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, currentTrack?.id]);

  // Live Personalized Recommended Playlists for "Made For You" section
  const [radioStations, setRadioStations] = useState<Array<{
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    badge: string;
    tracks: import('@/types/spotify').SpotifyTrack[];
  }>>([]);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/spotify/radio-stations')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const items = data?.playlists ?? data?.stations ?? [];
        if (isMounted && Array.isArray(items) && items.length > 0) {
          setRadioStations(items);
        }
      })
      .catch((err) => console.warn('[radio-stations] Fetch error:', err));

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Handle clicking an artist: find or search their track and play immediately
  const handlePlayArtist = async (artistName: string) => {
    // Check if we already have a track by this artist locally
    const localMatch = [...jumpBackTracks, ...MOCK_TRACKS].find((t) =>
      t.artists.some((a) => a.name.toLowerCase() === artistName.toLowerCase())
    );

    if (localMatch) {
      playTrack(localMatch);
      return;
    }

    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(artistName)}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.tracks && data.tracks.length > 0) {
          playTrack(data.tracks[0]);
        }
      }
    } catch (err) {
      console.error('Failed to play artist track:', err);
    }
  };

  const topArtists = useMemo(() => {
    // If live authentic artists are available from Spotify API, use them!
    if (liveTopArtists.length > 0) {
      return liveTopArtists.map((artist, index) => ({
        artist: {
          id: artist.id,
          name: artist.name,
          uri: `spotify:artist:${artist.id}`,
          images: artist.imageUrl ? [{ url: artist.imageUrl, height: 300, width: 300 }] : [],
        },
        imageUrl: artist.imageUrl,
        cardId: `${artist.id}-${index}`,
      }));
    }

    // Fallback: extract from played / mock tracks
    const sourceTracks = [...jumpBackTracks, ...MOCK_TRACKS];
    const seenArtistNames = new Set<string>();
    const uniqueArtists = sourceTracks.flatMap((track) => track.artists.map((artist) => ({ artist, track }))).filter(({ artist }) => {
      if (!artist?.name || seenArtistNames.has(artist.name.toLowerCase())) return false;
      seenArtistNames.add(artist.name.toLowerCase());
      return true;
    });
    if (!uniqueArtists.length) return [];
    return Array.from({ length: Math.min(25, Math.max(uniqueArtists.length, 6)) }, (_, index) => {
      const item = uniqueArtists[index % uniqueArtists.length];
      return {
        artist: item.artist,
        imageUrl: item.artist?.images?.[0]?.url || item.track.album?.images?.[0]?.url || '',
        cardId: `${item?.artist?.id || 'artist'}-${index}`,
      };
    });
  }, [liveTopArtists, jumpBackTracks]);

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
        <button
            type="button"
            onClick={() => {
              setActiveNav('home');
              mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
            aria-label="Go to Home"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-spotify-green">
              <Music className="h-5 w-5 text-black" />
            </div>
            <span className="text-lg font-bold tracking-tight">BEATZ</span>
          </button>
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
              <span className="pointer-events-none absolute left-full z-30 ml-3 translate-x-1 whitespace-nowrap rounded-md border border-spotify-border bg-spotify-elevated px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">Search</span>
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

          <div className="space-y-10 p-6 pb-32 lg:space-y-12 lg:p-8 lg:pb-32">
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
          <div className="flex items-baseline gap-3">
            <h2 className="text-xl font-bold text-white">Made For You</h2>
            <span className="text-xs text-spotify-subtext">Your Top Hits &amp; Spotify Genre Radios</span>
          </div>
          <div className="no-scrollbar flex gap-5 overflow-x-auto scroll-smooth pb-2">
            {(radioStations.length > 0 ? radioStations : [
              {
                id: 'placeholder-top-hits',
                title: 'Your Top Hits',
                description: 'Your personal top favorites and most played tracks',
                imageUrl: MOCK_TRACKS[1]?.album?.images?.[0]?.url ?? '',
                badge: 'TOP PICKS',
                tracks: [MOCK_TRACKS[1], MOCK_TRACKS[2], MOCK_TRACKS[3]],
              },
              {
                id: 'placeholder-genre-1',
                title: 'Indie & Rock Radio',
                description: 'Spotify official Indie & Rock Radio',
                imageUrl: MOCK_TRACKS[2]?.album?.images?.[0]?.url ?? '',
                badge: 'GENRE RADIO',
                tracks: [MOCK_TRACKS[2], MOCK_TRACKS[1], MOCK_TRACKS[3]],
              },
              {
                id: 'placeholder-genre-2',
                title: 'Pop Hits Radio',
                description: 'Spotify official Pop Radio station',
                imageUrl: MOCK_TRACKS[1]?.album?.images?.[0]?.url ?? '',
                badge: 'GENRE RADIO',
                tracks: [MOCK_TRACKS[1], MOCK_TRACKS[3], MOCK_TRACKS[4]],
              },
              {
                id: 'placeholder-genre-3',
                title: 'Acoustic & Chill Radio',
                description: 'Spotify official Acoustic Radio station',
                imageUrl: MOCK_TRACKS[4]?.album?.images?.[0]?.url ?? '',
                badge: 'GENRE RADIO',
                tracks: [MOCK_TRACKS[4], MOCK_TRACKS[2], MOCK_TRACKS[3]],
              },
              {
                id: 'placeholder-genre-4',
                title: 'Modern Hip-Hop Radio',
                description: 'Spotify official Hip-Hop Radio station',
                imageUrl: MOCK_TRACKS[3]?.album?.images?.[0]?.url ?? '',
                badge: 'GENRE RADIO',
                tracks: [MOCK_TRACKS[3], MOCK_TRACKS[1], MOCK_TRACKS[4]],
              },
            ]).map((station) => (
              <button
                key={station.id}
                type="button"
                onClick={() => clearAndReplaceQueue(station.tracks)}
                className="group w-40 shrink-0 text-left sm:w-48"
                aria-label={`Play ${station.title}`}
              >
                <div className="relative aspect-square overflow-hidden rounded-lg bg-spotify-elevated">
                  <ArtworkImage src={station.imageUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
                  {/* Dynamic badge */}
                  <span className="absolute left-2 top-2 rounded-sm bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-spotify-green">
                    {station.badge}
                  </span>
                  {/* Hover play button */}
                  <span className="absolute bottom-3 right-3 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-spotify-green text-black opacity-0 shadow-xl transition group-hover:translate-y-0 group-hover:opacity-100">
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  </span>
                </div>
                <span className="mt-3 block truncate text-sm font-semibold text-white">{station.title}</span>
                <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-spotify-subtext">{station.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">Your Top Artists</h2>
          <div className="no-scrollbar flex gap-5 overflow-x-auto scroll-smooth pb-2">
            {topArtists.map(({ artist, imageUrl, cardId }) => {
              const displayImageUrl = imageUrl || artist.images?.[0]?.url;

              return (
                <button
                  key={cardId}
                  type="button"
                  onClick={() => handlePlayArtist(artist.name)}
                  className="group flex w-32 shrink-0 flex-col items-center text-center"
                  aria-label={`Play ${artist.name}`}
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-full bg-spotify-elevated shadow-lg shadow-black/20 ring-1 ring-white/10 transition group-hover:ring-spotify-green/70">
                    <ArtworkImage
                      src={displayImageUrl}
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

    </div>
  );
}
