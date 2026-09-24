'use client';

import { useSpotifyQueue } from '@/hooks/useSpotifyQueue';
import { useBeatzStore } from '@/lib/store';
import { X, Play, Trash2, Music2, Sparkles } from 'lucide-react';
import { SpotifyTrack } from '@/types/spotify';

export default function QueueDrawer() {
  const isQueueOpen = useBeatzStore((state) => state.isQueueOpen);
  const setQueueOpen = useBeatzStore((state) => state.setQueueOpen);
  const playTrack = useBeatzStore((state) => state.playTrack);
  const playback = useBeatzStore((state) => state.playback);

  const { queue, isLoading, removeFromQueue } = useSpotifyQueue();

  if (!isQueueOpen) return null;

  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-spotify-surface/95 backdrop-blur-md border-l border-spotify-border shadow-2xl flex flex-col z-30 transition-transform">
      {/* Drawer Header */}
      <div className="h-16 px-6 border-b border-spotify-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music2 className="h-5 w-5 text-spotify-green" />
          <h2 className="font-bold text-white text-base">Play Queue</h2>
          <span className="text-[11px] bg-spotify-elevated text-zinc-300 px-2 py-0.5 rounded-full font-mono">
            {queue.upcomingTracks.length} upcoming
          </span>
        </div>

        <button
          onClick={() => setQueueOpen(false)}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-spotify-elevated rounded-full transition"
          title="Close Queue"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Currently Playing Card */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-spotify-subtext font-semibold">
            Now Playing
          </p>

          {playback.currentTrack ? (
            <div className="bg-spotify-elevated/70 border border-spotify-green/30 p-3 rounded-xl flex items-center gap-3">
              {playback.currentTrack.album?.images?.[0]?.url && (
                <img
                  src={playback.currentTrack.album.images[0].url}
                  alt={playback.currentTrack.name}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              )}
              <div className="overflow-hidden flex-1">
                <p className="font-semibold text-white text-sm truncate">
                  {playback.currentTrack.name}
                </p>
                <p className="text-xs text-spotify-subtext truncate">
                  {playback.currentTrack.artists.map((a) => a.name).join(', ')}
                </p>
              </div>

              <div className="flex items-center gap-1 text-spotify-green text-xs font-mono">
                <span className="h-2 w-2 rounded-full bg-spotify-green animate-pulse" />
                Live
              </div>
            </div>
          ) : (
            <div className="p-4 bg-spotify-elevated rounded-xl text-center text-xs text-zinc-400">
              No track currently active. Pick a song below!
            </div>
          )}
        </div>

        {/* Upcoming Tracks List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-spotify-subtext font-semibold">
              Next Up
            </p>
            {isLoading && <span className="text-[11px] text-zinc-500 animate-pulse">Syncing...</span>}
          </div>

          {queue.upcomingTracks.length === 0 ? (
            <div className="text-center py-10 space-y-2 text-zinc-500 text-xs">
              <Sparkles className="h-8 w-8 mx-auto text-zinc-600" />
              <p>Queue is empty.</p>
              <p className="text-[11px] text-zinc-600">
                Search songs or ask Beatz AI to curate a vibe!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {queue.upcomingTracks.map((track: SpotifyTrack, index: number) => (
                <div
                  key={`${track.id}-${index}`}
                  className="group flex items-center justify-between p-2.5 rounded-lg hover:bg-spotify-elevated transition border border-transparent hover:border-spotify-border"
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <span className="text-xs font-mono text-zinc-500 w-4 text-center">
                      {index + 1}
                    </span>

                    {track.album?.images?.[0]?.url ? (
                      <img
                        src={track.album.images[0].url}
                        alt={track.name}
                        className="h-10 w-10 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                        <Music2 className="h-4 w-4 text-zinc-500" />
                      </div>
                    )}

                    <div className="overflow-hidden flex-1">
                      <p className="font-medium text-white text-xs truncate group-hover:text-spotify-green transition">
                        {track.name}
                      </p>
                      <p className="text-[11px] text-spotify-subtext truncate">
                        {track.artists.map((a) => a.name).join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-2">
                    <span className="text-[11px] font-mono text-zinc-500">
                      {formatDuration(track.durationMs)}
                    </span>

                    <button
                      onClick={() => playTrack(track)}
                      className="p-1.5 hover:text-spotify-green text-zinc-400 opacity-0 group-hover:opacity-100 transition"
                      title="Play Now"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                    </button>

                    <button
                      onClick={() => removeFromQueue(track.id)}
                      className="p-1.5 hover:text-red-400 text-zinc-400 opacity-0 group-hover:opacity-100 transition"
                      title="Remove from Queue"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
