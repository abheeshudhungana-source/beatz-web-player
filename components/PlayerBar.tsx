'use client';

import { useBeatzStore } from '@/store/beatz-store';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ListMusic, MessageSquare } from 'lucide-react';

export default function PlayerBar() {
  const currentTrack = useBeatzStore((state) => state.currentTrack);
  const isPlaying = useBeatzStore((state) => state.isPlaying);
  const progressMs = useBeatzStore((state) => state.progressMs);
  const durationMs = useBeatzStore((state) => state.durationMs);
  const volume = useBeatzStore((state) => state.volume);
  const togglePlay = useBeatzStore((state) => state.togglePlay);
  const nextTrack = useBeatzStore((state) => state.nextTrack);
  const previousTrack = useBeatzStore((state) => state.previousTrack);
  const seekTo = useBeatzStore((state) => state.seekTo);
  const setVolume = useBeatzStore((state) => state.setVolume);
  const toggleQueue = useBeatzStore((state) => state.toggleQueue);
  const isQueueOpen = useBeatzStore((state) => state.isQueueOpen);
  const toggleChat = useBeatzStore((state) => state.toggleChat);
  const isChatOpen = useBeatzStore((state) => state.isChatOpen);

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

  return (
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
            onClick={previousTrack}
            className="hover:text-white transition disabled:opacity-40"
            title="Restart / Previous Track"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            onClick={togglePlay}
            className="h-9 w-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg shadow-white/10"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-black" />
            ) : (
              <Play className="h-4 w-4 fill-black ml-0.5" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="hover:text-white transition disabled:opacity-40"
            title="Next Track (Decoupled from ad penalties)"
          >
            <SkipForward className="h-4 w-4" />
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
      </div>
    </footer>
  );
}
