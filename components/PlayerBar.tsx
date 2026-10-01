'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useBeatzStore } from '@/store/beatz-store';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Mic2, Volume2, VolumeX, ListMusic, MessageSquare, Laptop2, Crown, Music, X } from 'lucide-react';

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

export default function PlayerBar() {
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [lyricsForCurrentTrack, setLyricsForCurrentTrack] = useState<LyricLine[]>([]);
  const [lyricsStatus, setLyricsStatus] = useState<'idle' | 'loading' | 'available' | 'unavailable'>('idle');
  const lyricsViewportRef = useRef<HTMLDivElement | null>(null);
  const activeLyricRef = useRef<HTMLParagraphElement | null>(null);
  const currentTrack = useBeatzStore((state) => state.currentTrack);
  const isPlaying = useBeatzStore((state) => state.isPlaying);
  const isShuffleEnabled = useBeatzStore((state) => state.isShuffleEnabled);
  const repeatMode = useBeatzStore((state) => state.repeatMode);
  const progressMs = useBeatzStore((state) => state.progressMs);
  const durationMs = useBeatzStore((state) => state.durationMs);
  const volume = useBeatzStore((state) => state.volume);
  const isSdkActive = useBeatzStore((state) => state.isSdkActive);
  const togglePlay = useBeatzStore((state) => state.togglePlay);
  const toggleShuffle = useBeatzStore((state) => state.toggleShuffle);
  const cycleRepeat = useBeatzStore((state) => state.cycleRepeat);
  const nextTrack = useBeatzStore((state) => state.nextTrack);
  const previousTrack = useBeatzStore((state) => state.previousTrack);
  const seekTo = useBeatzStore((state) => state.seekTo);
  const setVolume = useBeatzStore((state) => state.setVolume);
  const toggleQueue = useBeatzStore((state) => state.toggleQueue);
  const isQueueOpen = useBeatzStore((state) => state.isQueueOpen);
  const toggleChat = useBeatzStore((state) => state.toggleChat);
  const isChatOpen = useBeatzStore((state) => state.isChatOpen);
  const isPremium = useBeatzStore((state) => state.isPremium);
  const sdkError = useBeatzStore((state) => state.sdkError);

  // Format millisecond timestamp to mm:ss
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const progressPercent = durationMs > 0 ? (progressMs / durationMs) * 100 : 0;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseFloat(e.target.value);
    const targetMs = (percent / 100) * durationMs;
    seekTo(targetMs);
  };

  useEffect(() => {
    const trackName = currentTrack?.name;
    const artistName = currentTrack?.artists?.[0]?.name;

    if (!trackName || !artistName) {
      setLyricsForCurrentTrack([]);
      setLyricsStatus('idle');
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
      duration: String(Math.round((currentTrack.durationMs ?? 0) / 1000)),
    });
    if (currentTrack.album?.name) {
      params.set('album_name', currentTrack.album.name);
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
  }, [currentTrack]);

  const activeLyricIndex = useMemo(() => {
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

    if (!isLyricsOpen || !viewport || !activeLine || activeLyricIndex < 0) {
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
  }, [activeLyricIndex, currentTrack?.id, isLyricsOpen]);

  // Show premium banner when SDK failed due to non-premium (sdkError set + not premium)
  const showPremiumBanner = !isPremium && !!sdkError;

  return (
    <>
      {/* Non-Premium Warning Banner */}
      {showPremiumBanner && (
        <div className="sticky bottom-24 z-30 mx-auto w-full max-w-2xl px-4 pb-2 pointer-events-none">
          <div className="flex items-center gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-amber-300 shadow-lg backdrop-blur-sm pointer-events-auto">
            <Crown className="h-4 w-4 shrink-0 text-amber-400" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold leading-tight">Spotify Premium required for full playback</p>
              <p className="text-[11px] text-amber-400/70 mt-0.5 truncate">Running in 30-second preview mode · Upgrade at spotify.com/premium</p>
            </div>
          </div>
        </div>
      )}

      <footer className="h-24 border-t border-spotify-border bg-spotify-surface px-6 flex items-center justify-between text-xs text-spotify-subtext z-20 sticky bottom-0">
      {/* Left: Track Information & Album Thumbnail */}
      <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
        {currentTrack?.album?.images?.[0]?.url ? (
          <img
            src={currentTrack.album.images[0].url}
            alt={currentTrack.name}
            className="h-14 w-14 rounded-lg object-cover shadow-md"
          />
        ) : (
          <div className="h-14 w-14 rounded-lg bg-spotify-elevated flex items-center justify-center text-zinc-500">
            <ListMusic className="h-6 w-6" />
          </div>
        )}

        <div className="overflow-hidden">
          <p className="font-semibold text-white truncate text-sm">
            {currentTrack?.name || 'No Track Selected'}
          </p>
          <p className="text-[12px] text-spotify-subtext truncate mt-0.5">
            {currentTrack?.artists?.map((a) => a.name).join(', ') || 'Select a song to play'}
          </p>
        </div>
      </div>

      {/* Center: Transport Controls & Scrubber */}
      <div className="flex flex-col items-center gap-2 w-2/4 max-w-xl">
        <div className="flex items-center gap-6 text-zinc-300">
          <button
            type="button"
            onClick={toggleShuffle}
            className={`transition hover:text-spotify-green ${isShuffleEnabled ? 'text-spotify-green' : 'text-zinc-400'}`}
            title={isShuffleEnabled ? 'Turn shuffle off' : 'Turn shuffle on'}
            aria-label={isShuffleEnabled ? 'Turn shuffle off' : 'Turn shuffle on'}
            aria-pressed={isShuffleEnabled}
          >
            <Shuffle className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={previousTrack}
            className="text-zinc-400 transition hover:text-spotify-green disabled:opacity-40"
            title="Restart / Previous Track"
            aria-label="Restart or previous track"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="h-9 w-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg shadow-white/10"
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-black" />
            ) : (
              <Play className="h-4 w-4 fill-black ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={nextTrack}
            className="text-zinc-400 transition hover:text-spotify-green disabled:opacity-40"
            title="Next Track (Decoupled from ad penalties)"
            aria-label="Next track"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={cycleRepeat}
            className={`transition hover:text-spotify-green ${repeatMode > 0 ? 'text-spotify-green' : 'text-zinc-400'}`}
            title={repeatMode === 0 ? 'Turn repeat on' : repeatMode === 1 ? 'Repeat context' : 'Repeat current track'}
            aria-label={repeatMode === 0 ? 'Turn repeat on' : repeatMode === 1 ? 'Repeat context' : 'Repeat current track'}
            aria-pressed={repeatMode > 0}
          >
            {repeatMode === 2 ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
          </button>
        </div>

        {/* Progress Scrubber */}
        <div className="flex items-center gap-3 w-full">
          <span className="text-[11px] font-mono text-zinc-400 w-9 text-right">
            {formatTime(progressMs)}
          </span>
          <div className="relative flex-1 flex items-center group">
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progressPercent}
              onChange={handleSeek}
              className="w-full h-1 bg-spotify-elevated rounded-full appearance-none cursor-pointer accent-spotify-green group-hover:h-1.5 transition-all"
            />
          </div>
          <span className="text-[11px] font-mono text-zinc-400 w-9">
            {formatTime(durationMs)}
          </span>
        </div>
      </div>

      {/* Right: Volume & Drawer Toggles */}
      <div className="flex items-center justify-end gap-4 w-1/4 min-w-[200px]">
        {/* Lyrics Toggle */}
        <button
          type="button"
          onClick={() => setIsLyricsOpen((open) => !open)}
          className={`p-2 rounded-full transition ${
            isLyricsOpen
              ? 'text-spotify-green bg-spotify-green/10'
              : 'text-zinc-400 hover:text-spotify-green hover:bg-spotify-elevated'
          }`}
          title={isLyricsOpen ? 'Close lyrics' : 'Open lyrics'}
          aria-label={isLyricsOpen ? 'Close lyrics' : 'Open lyrics'}
          aria-pressed={isLyricsOpen}
          aria-controls="lyrics-panel"
        >
          <Mic2 className="h-4 w-4" />
        </button>

        {/* Queue Drawer Button */}
        <button
          type="button"
          onClick={toggleQueue}
          className={`p-2 rounded-full transition flex items-center gap-1.5 ${
            isQueueOpen
              ? 'text-spotify-green bg-spotify-green/10'
              : 'text-zinc-400 hover:text-white hover:bg-spotify-elevated'
          }`}
          title="Toggle Queue"
        >
          <ListMusic className="h-4 w-4" />
          <span className="text-[11px] font-medium hidden sm:inline">Queue</span>
        </button>

        {/* AI Chat Drawer Button */}
        <button
          onClick={toggleChat}
          className={`p-2 rounded-full transition flex items-center gap-1.5 ${
            isChatOpen
              ? 'text-spotify-green bg-spotify-green/10'
              : 'text-zinc-400 hover:text-white hover:bg-spotify-elevated'
          }`}
          title="Toggle Beatz AI Co-Pilot"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="text-[11px] font-medium hidden sm:inline">Beatz AI</span>
        </button>

        {/* Volume Controls */}
        <div className="flex items-center gap-2 pl-2 border-l border-spotify-border">
          <button
            onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
            className="text-zinc-400 hover:text-white transition"
          >
            {volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-16 h-1 bg-spotify-elevated rounded-full appearance-none cursor-pointer accent-spotify-green"
          />
        </div>

        {/* Active Device Indicator */}
        <div
          title={isSdkActive ? 'Active: Beatz Web Player (Official Spotify SDK)' : 'Audio Preview Mode (Spotify Free)'}
          className="flex items-center gap-1.5 pl-2 text-zinc-400 border-l border-spotify-border/60"
        >
          <Laptop2 className={`h-4 w-4 transition ${isSdkActive ? 'text-spotify-green' : 'text-zinc-500'}`} />
          <span className={`text-[10px] font-mono hidden xl:inline ${isSdkActive ? 'text-spotify-green' : 'text-zinc-500'}`}>
            {isSdkActive ? 'SDK Online' : 'Preview'}
          </span>
        </div>
      </div>
    </footer>

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
    </>
  );
}
