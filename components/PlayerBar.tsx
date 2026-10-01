'use client';

import { useState } from 'react';
import { useBeatzStore } from '@/store/beatz-store';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Mic2, Volume2, VolumeX, ListMusic, MessageSquare, Laptop2, Crown } from 'lucide-react';

export default function PlayerBar() {
  const [isLyricsActive, setIsLyricsActive] = useState(false);
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
        {/* Queue Drawer Button */}
        <button
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

        {/* Lyrics Toggle */}
        <button
          type="button"
          onClick={() => setIsLyricsActive((active) => !active)}
          className={`p-2 rounded-full transition ${
            isLyricsActive
              ? 'text-spotify-green bg-spotify-green/10'
              : 'text-zinc-400 hover:text-spotify-green hover:bg-spotify-elevated'
          }`}
          title={isLyricsActive ? 'Turn lyrics indicator off' : 'Turn lyrics indicator on'}
          aria-label={isLyricsActive ? 'Turn lyrics indicator off' : 'Turn lyrics indicator on'}
          aria-pressed={isLyricsActive}
        >
          <Mic2 className="h-4 w-4" />
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
    </>
  );
}
