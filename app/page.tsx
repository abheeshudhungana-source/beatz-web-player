'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth';
import { QueueDrawer, QueueItem } from '@/components/QueueDrawer';
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

const queueTracks: QueueItem[] = [
  { id: 'midnight-city', title: 'Midnight City', artist: 'M83', duration: '3:52', accent: 'bg-blue-500/15 text-blue-300' },
  { id: 'afterdark', title: 'Afterdark', artist: 'Cyril', duration: '4:18', accent: 'bg-violet-500/15 text-violet-300' },
  { id: 'bohemian-rhapsody', title: 'Bohemian Rhapsody', artist: 'Queen', duration: '5:54', accent: 'bg-pink-500/15 text-pink-300' },
  { id: 'night-drive', title: 'Night Drive', artist: 'Nils Frahm', duration: '3:41', accent: 'bg-emerald-500/15 text-emerald-300' },
  { id: 'lush-life', title: 'Lush Life', artist: 'Zara Larsson', duration: '4:07', accent: 'bg-orange-500/15 text-orange-300' },
];

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function Home() {
  const { isAuthenticated, isLoading, user, login, logout } = useSpotifyAuth();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState('midnight-city');

  const {
    currentTrack,
    queue,
    isPlaying,
    progressMs,
    durationMs,
    volume,
    isReady,
    adState,
    togglePlay,
    nextTrack,
    previousTrack,
    setVolume,
    seekTo,
    tickPlayer,
    triggerAdBreak,
    finishAdBreak,
  } = useBeatzStore();

  useEffect(() => {
    const interval = setInterval(() => {
      tickPlayer();
    }, 1000);

    return () => clearInterval(interval);
  }, [tickPlayer]);

  useEffect(() => {
    if (!isPlaying || adState.isAdPlaying) {
      return;
    }

    const timeout = setTimeout(() => {
      if (Math.random() > 0.25) {
        triggerAdBreak();
      }
    }, 20000 + Math.random() * 20000);

    return () => clearTimeout(timeout);
  }, [isPlaying, adState.isAdPlaying, triggerAdBreak]);

  const queueSummary = useMemo(() => {
    const selected = queueTracks.find((track) => track.id === selectedTrackId) ?? queueTracks[0];
    return selected;
  }, [selectedTrackId]);

  const nowPlaying = useMemo(() => {
    const track = currentTrack ?? queue.currentlyPlaying ?? queue.upcomingTracks[0];

    if (!track) {
      return { title: 'No track selected', artist: 'Beatz AI', duration: '0:00' };
    }

    return {
      title: track.name,
      artist: track.artists[0]?.name ?? 'Spotify artist',
      duration: formatDuration(track.durationMs),
    };
  }, [currentTrack, queue]);

  const progress = durationMs > 0 ? Math.min((progressMs / durationMs) * 100, 100) : 38;
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

  return (
    <div className="flex h-screen flex-col bg-spotify-dark text-white select-none">
      <header className="z-10 flex h-16 items-center justify-between border-b border-spotify-border bg-spotify-surface/80 px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-spotify-green">
            <Music className="h-5 w-5 text-black" />
          </div>
          <span className="text-lg font-bold tracking-tight">BEATZ</span>
          <span className="rounded-full border border-spotify-highlight bg-spotify-elevated px-2 py-0.5 text-[11px] font-mono font-medium text-spotify-green">
            Day 3
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsQueueOpen(true)}
            className="hidden items-center gap-2 rounded-full border border-spotify-highlight bg-spotify-elevated px-3 py-1.5 text-[11px] text-zinc-200 hover:text-white sm:flex"
          >
            <ListMusic className="h-3.5 w-3.5 text-spotify-green" />
            Queue
          </button>

          <div className="hidden items-center gap-2 rounded-full border border-spotify-highlight bg-spotify-elevated px-3 py-1.5 text-spotify-subtext sm:flex">
            <Search className="h-3.5 w-3.5" />
            <span className="text-[11px]">Search library</span>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-spotify-highlight bg-spotify-elevated py-1.5 px-3">
            {user?.images?.[0]?.url ? (
              <img src={user.images[0].url} alt={user.displayName || 'User'} className="h-6 w-6 rounded-full object-cover" />
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

          <button onClick={logout} title="Log out" className="rounded-full p-2 text-spotify-subtext transition hover:bg-spotify-elevated hover:text-white">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 space-y-8 overflow-y-auto p-6 lg:p-8">
        {adState.isAdPlaying && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 shadow-lg shadow-rose-950/20">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-rose-300">Ad break in progress</p>
                <h3 className="mt-1 text-lg font-bold text-white">Premium message: “Go Beatz Premium for $12.99/mo”</h3>
              </div>
              <span className="rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-sm font-semibold text-rose-100">
                {formatDuration(adTimeRemaining)} remaining
              </span>
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-rose-950/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-400 to-orange-300"
                style={{ width: `${(adState.adProgressMs / adState.adDurationMs) * 100}%` }}
              />
            </div>
          </div>
        )}

        {!adState.isAdPlaying && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-spotify-border bg-spotify-surface p-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-spotify-subtext">Ad scheduler</p>
              <h3 className="mt-1 text-lg font-bold text-white">3–5 ad breaks per hour</h3>
            </div>
            <button
              onClick={() => triggerAdBreak()}
              className="rounded-full bg-spotify-green px-4 py-2 text-sm font-semibold text-black transition hover:bg-spotify-green-hover"
            >
              Simulate ad break
            </button>
          </div>
        )}

        {user?.product !== 'premium' && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Spotify Free Account Detected</p>
              <p className="mt-1 text-xs text-amber-400/80">
                Day 4 keeps playback and queue orchestration in the Zustand store while the SDK remains ready for the premium path.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-spotify-border bg-spotify-surface p-6 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-spotify-subtext">
                <Sparkles className="h-3.5 w-3.5 text-spotify-green" />
                Now Playing
              </div>
              <button
                onClick={() => setIsQueueOpen(true)}
                className="flex items-center gap-2 rounded-full border border-spotify-highlight bg-spotify-elevated px-3 py-1.5 text-xs text-zinc-200 transition hover:border-spotify-green/60"
              >
                <ListMusic className="h-3.5 w-3.5 text-spotify-green" />
                Queue
              </button>
            </div>

            <div className="mt-6 grid items-center gap-6 md:grid-cols-[220px_1fr]">
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
                    <span>{currentProgressLabel}</span>
                    <span>{durationLabel}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-spotify-elevated">
                    <div className="h-full rounded-full bg-spotify-green" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={previousTrack} className="rounded-full bg-spotify-elevated p-3 text-zinc-200 transition hover:text-white">
                    <SkipBack className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (adState.isAdPlaying) {
                        finishAdBreak();
                        return;
                      }

                      togglePlay();
                    }}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg shadow-white/20 transition hover:scale-105"
                    aria-label={isPlaying ? 'Pause playback' : 'Play playback'}
                  >
                    {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-0.5" />}
                  </button>
                  <button onClick={nextTrack} className="rounded-full bg-spotify-elevated p-3 text-zinc-200 transition hover:text-white">
                    <SkipForward className="h-5 w-5" />
                  </button>
                  <button className="ml-auto rounded-full bg-spotify-elevated p-3 text-zinc-200 transition hover:text-white">
                    <Heart className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-spotify-border bg-spotify-surface p-5 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Up next</h3>
              <span className="text-[11px] text-spotify-subtext">{queue.upcomingTracks.length + 1} tracks</span>
            </div>

            <div className="mt-4 space-y-3">
              {[queue.currentlyPlaying, ...queue.upcomingTracks].filter(Boolean).map((track, index) => (
                <button
                  key={track?.id ?? index}
                  onClick={() => {
                    setSelectedTrackId(track?.id ?? queueSummary.id);
                    setIsQueueOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition ${
                    track?.id === selectedTrackId ? 'border-spotify-green/50 bg-spotify-green/10' : 'border-spotify-border bg-spotify-elevated/60 hover:border-spotify-green/30'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-bold ${queueTracks[index % queueTracks.length].accent}`}>
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{track?.name}</p>
                      <p className="truncate text-[11px] text-spotify-subtext">{track?.artists[0]?.name}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-300">{formatDuration(track?.durationMs ?? 0)}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-spotify-border bg-spotify-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-spotify-subtext">Current vibe</p>
            <h3 className="mt-4 text-xl font-bold text-white">Late-night focus</h3>
            <p className="mt-2 text-sm text-spotify-subtext">Crisp synth textures and warm basslines for deep work sessions.</p>
          </div>

          <div className="rounded-2xl border border-spotify-border bg-spotify-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-spotify-subtext">Mood shift</p>
            <h3 className="mt-4 text-xl font-bold text-white">Boost energy</h3>
            <p className="mt-2 text-sm text-spotify-subtext">Swap the lane toward brighter drums and more rhythmic movement.</p>
          </div>

          <div className="rounded-2xl border border-spotify-border bg-spotify-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-spotify-subtext">SDK + store</p>
            <h3 className="mt-4 text-xl font-bold text-white">{isReady ? 'State healthy' : 'Bridge warming'}</h3>
            <p className="mt-2 text-sm text-spotify-subtext">
              {adState.isAdPlaying ? `Ad break ${adState.adIndex} underway` : 'Player state and ad scheduler are synced via Zustand.'}
            </p>
          </div>
        </div>
      </main>

      <footer className="flex h-24 items-center justify-between border-t border-spotify-border bg-spotify-surface px-6 text-xs text-spotify-subtext">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-spotify-green text-zinc-50 shadow-lg shadow-violet-900/30">
            <Music className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{nowPlaying.title}</p>
            <p className="truncate text-[11px] text-spotify-subtext">{nowPlaying.artist}</p>
          </div>
        </div>

        <div className="flex max-w-xl flex-1 flex-col items-center gap-1.5 px-6">
          <div className="flex items-center gap-5 text-zinc-300">
            <button onClick={previousTrack} className="transition hover:text-white"><SkipBack className="h-4 w-4" /></button>
            <button onClick={() => (adState.isAdPlaying ? finishAdBreak() : togglePlay())} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:scale-105">
              {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
            </button>
            <button onClick={nextTrack} className="transition hover:text-white"><SkipForward className="h-4 w-4" /></button>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-spotify-elevated">
            <div className="h-full rounded-full bg-spotify-green" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-spotify-elevated px-2 py-1 text-zinc-200">
            <Volume2 className="h-4 w-4" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              className="w-20 accent-spotify-green"
              aria-label="Volume control"
            />
          </div>
          <button onClick={() => setIsQueueOpen(true)} className="rounded-full bg-spotify-elevated px-3 py-1.5 text-[11px] text-spotify-green transition hover:text-white">
            Open queue
          </button>
        </div>
      </footer>

      <QueueDrawer
        isOpen={isQueueOpen}
        items={queueTracks}
        currentItemId={selectedTrackId}
        onClose={() => setIsQueueOpen(false)}
        onSelectTrack={(item) => {
          setSelectedTrackId(item.id);
          setIsQueueOpen(false);
          seekTo(0);
        }}
      />
    </div>
  );
}
