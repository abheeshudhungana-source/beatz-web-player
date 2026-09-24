'use client';

import { useSpotifySearch } from '@/hooks/useSpotifySearch';
import { useSpotifyQueue } from '@/hooks/useSpotifyQueue';
import { useBeatzStore } from '@/lib/store';
import { Search, Plus, Play, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { SpotifyTrack } from '@/types/spotify';

export default function TrackSearch() {
  const { query, setQuery, results, isSearching } = useSpotifySearch();
  const { addToQueue } = useSpotifyQueue();
  const playTrack = useBeatzStore((state) => state.playTrack);
  const [addedTrackId, setAddedTrackId] = useState<string | null>(null);

  const handleAdd = (track: SpotifyTrack) => {
    addToQueue(track);
    setAddedTrackId(track.id);
    setTimeout(() => setAddedTrackId(null), 1500);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Search &amp; Queue Songs</h3>
          <p className="text-xs text-spotify-subtext">
            Search Spotify&apos;s catalog and add songs directly to your queue.
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs, artists, or albums (e.g. The Weeknd, Blinding Lights)..."
          className="w-full bg-spotify-elevated border border-spotify-border focus:border-spotify-green text-sm text-white pl-11 pr-10 py-3 rounded-xl outline-none placeholder:text-zinc-500 transition-all shadow-inner"
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-spotify-green animate-spin" />
        )}
      </div>

      {/* Search Results Grid */}
      {results.length > 0 && (
        <div className="bg-spotify-surface border border-spotify-border rounded-2xl p-4 divide-y divide-spotify-border/40">
          {results.map((track) => {
            const isJustAdded = addedTrackId === track.id;
            return (
              <div
                key={track.id}
                className="flex items-center justify-between py-3 px-2 hover:bg-spotify-elevated rounded-xl transition group"
              >
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                  {track.album?.images?.[0]?.url ? (
                    <img
                      src={track.album.images[0].url}
                      alt={track.name}
                      className="h-12 w-12 rounded-lg object-cover shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      🎵
                    </div>
                  )}

                  <div className="overflow-hidden flex-1">
                    <p className="font-semibold text-white text-sm truncate group-hover:text-spotify-green transition">
                      {track.name}
                    </p>
                    <p className="text-xs text-spotify-subtext truncate">
                      {track.artists.map((a) => a.name).join(', ')} &bull; {track.album.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pl-3">
                  <button
                    onClick={() => playTrack(track)}
                    className="flex items-center gap-1.5 bg-white/10 hover:bg-white text-white hover:text-black text-xs font-semibold py-1.5 px-3 rounded-full transition"
                    title="Play track preview immediately"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>Play</span>
                  </button>

                  <button
                    onClick={() => handleAdd(track)}
                    disabled={isJustAdded}
                    className={`flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-full transition ${
                      isJustAdded
                        ? 'bg-spotify-green text-black'
                        : 'bg-spotify-elevated hover:bg-spotify-green/20 text-zinc-300 hover:text-spotify-green border border-spotify-border hover:border-spotify-green/40'
                    }`}
                    title="Add to queue"
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
