'use client';

import { useBeatzStore } from '@/store/beatz-store';
import { ListMusic, Play, Trash2, X, Sparkles } from 'lucide-react';
import { SpotifyTrack } from '@/types/spotify';

export interface QueueItem {
  id: string;
  title: string;
  artist: string;
  duration: string;
  accent: string;
}

interface QueueDrawerProps {
  isOpen?: boolean;
  items?: QueueItem[];
  currentItemId?: string;
  onClose?: () => void;
  onSelectTrack?: (item: QueueItem) => void;
}

export function QueueDrawer(props: QueueDrawerProps = {}) {
  const storeIsOpen = useBeatzStore((state) => state.isQueueOpen);
  const setStoreOpen = useBeatzStore((state) => state.setQueueOpen);
  const storeQueue = useBeatzStore((state) => state.queue);
  const playTrack = useBeatzStore((state) => state.playTrack);
  const removeFromQueue = useBeatzStore((state) => state.removeFromQueue);
  const currentTrack = useBeatzStore((state) => state.currentTrack);

  const isOpen = props.isOpen !== undefined ? props.isOpen : storeIsOpen;
  const handleClose = props.onClose || (() => setStoreOpen(false));

  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={handleClose}
      />

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-spotify-border bg-[#121212] shadow-2xl shadow-black/60 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-spotify-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-spotify-green text-black">
              <ListMusic className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-spotify-subtext">Queue</p>
              <h2 className="text-lg font-bold text-white">Up next</h2>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="rounded-full bg-spotify-elevated p-2 text-zinc-300 transition hover:text-white"
            aria-label="Close queue"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Now Playing Banner */}
          {currentTrack && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-spotify-subtext">
                Now Playing
              </p>
              <div className="flex items-center gap-3 rounded-2xl border border-spotify-green/40 bg-spotify-green/10 p-3">
                {currentTrack.album?.images?.[0]?.url ? (
                  <img
                    src={currentTrack.album.images[0].url}
                    alt={currentTrack.name}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-spotify-green/20 text-spotify-green font-bold">
                    🎵
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{currentTrack.name}</p>
                  <p className="truncate text-xs text-spotify-subtext">
                    {currentTrack.artists.map((a) => a.name).join(', ')}
                  </p>
                </div>
                <span className="flex items-center gap-1 font-mono text-xs text-spotify-green">
                  <span className="h-2 w-2 rounded-full bg-spotify-green animate-pulse" />
                  Live
                </span>
              </div>
            </div>
          )}

          {/* Upcoming List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-spotify-subtext">
                Upcoming ({storeQueue.upcomingTracks.length})
              </p>
            </div>

            {storeQueue.upcomingTracks.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                <Sparkles className="mx-auto mb-2 h-8 w-8 text-zinc-600" />
                <p>Queue is empty.</p>
                <p className="mt-1 text-zinc-600">Search for tracks or let Beatz AI curate a vibe!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {storeQueue.upcomingTracks.map((track: SpotifyTrack, index: number) => {
                  const isCurrent = currentTrack?.id === track.id;
                  return (
                    <div
                      key={`${track.id}-${index}`}
                      className={`group flex items-center justify-between rounded-xl border p-2.5 transition ${
                        isCurrent
                          ? 'border-spotify-green/50 bg-spotify-green/10'
                          : 'border-spotify-border bg-spotify-elevated/40 hover:border-spotify-green/30 hover:bg-spotify-elevated'
                      }`}
                    >
                      <button
                        onClick={() => playTrack(track)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className="w-4 text-center font-mono text-xs text-zinc-500">
                          {index + 1}
                        </span>

                        {track.album?.images?.[0]?.url ? (
                          <img
                            src={track.album.images[0].url}
                            alt={track.name}
                            className="h-10 w-10 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-xs font-bold text-zinc-400">
                            {track.name.charAt(0)}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-white group-hover:text-spotify-green transition">
                            {track.name}
                          </p>
                          <p className="truncate text-[11px] text-spotify-subtext">
                            {track.artists.map((a) => a.name).join(', ')}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-2 pl-2">
                        <span className="font-mono text-[11px] text-zinc-400">
                          {formatDuration(track.durationMs)}
                        </span>

                        <button
                          onClick={() => playTrack(track)}
                          className="p-1 text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-spotify-green transition"
                          title="Play Track"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                        </button>

                        <button
                          onClick={() => removeFromQueue(track.id)}
                          className="p-1 text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-red-400 transition"
                          title="Remove from Queue"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export default QueueDrawer;
