'use client';

import { ListMusic, Play, X } from 'lucide-react';

export interface QueueItem {
  id: string;
  title: string;
  artist: string;
  duration: string;
  accent: string;
}

interface QueueDrawerProps {
  isOpen: boolean;
  items: QueueItem[];
  currentItemId?: string;
  onClose: () => void;
  onSelectTrack?: (item: QueueItem) => void;
}

export function QueueDrawer({ isOpen, items, currentItemId, onClose, onSelectTrack }: QueueDrawerProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-spotify-border bg-[#121212] shadow-2xl shadow-black/60 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
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
            onClick={onClose}
            className="rounded-full bg-spotify-elevated p-2 text-zinc-300 transition hover:text-white"
            aria-label="Close queue"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {items.map((item) => {
            const isActive = item.id === currentItemId;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTrack?.(item)}
                className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition ${
                  isActive
                    ? 'border-spotify-green/60 bg-spotify-green/10'
                    : 'border-spotify-border bg-spotify-elevated/60 hover:border-spotify-green/30'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-[11px] font-bold ${item.accent}`}>
                    {isActive ? <Play className="h-3.5 w-3.5 fill-current" /> : item.title.charAt(0)}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{item.title}</p>
                    <p className="truncate text-[11px] text-spotify-subtext">{item.artist}</p>
                  </div>
                </div>

                <span className="text-[11px] text-zinc-300">{item.duration}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
}
