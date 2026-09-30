'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth';
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer';
import { useSpotifySearch } from '@/hooks/useSpotifySearch';
import { MOCK_TRACKS } from '@/lib/spotify';
import { useBeatzStore } from '@/store/beatz-store';
import { QueueDrawer } from '@/components/QueueDrawer';
import BeatzChatDrawer from '@/components/BeatzChatDrawer';
import PlayerBar from '@/components/PlayerBar';
import { Check, House, Loader2, Music, Play, Plus, Search } from 'lucide-react';
import type { SpotifyTrack } from '@/types/spotify';

interface RecentSearch {
  key: string;
  label: string;
  query: string;
  imageUrl?: string;
}

const BROWSE_CATEGORIES = [
  { name: 'Made For You', color: 'bg-[#6040a0]' },
  { name: 'New Releases', color: 'bg-[#236a50]' },
  { name: 'Hip-Hop', color: 'bg-[#a33b48]' },
  { name: 'Workout', color: 'bg-[#bb572e]' },
  { name: 'Deep Focus', color: 'bg-[#315d76]' },
  { name: 'Pop', color: 'bg-[#a43d70]' },
  { name: 'Dance / Electronic', color: 'bg-[#5447a1]' },
  { name: 'Mood', color: 'bg-[#4e713c]' },
  { name: 'Indie', color: 'bg-[#9b6a27]' },
  { name: 'Rock', color: 'bg-[#7b3c35]' },
  { name: 'Chill', color: 'bg-[#34727b]' },
  { name: 'R&B', color: 'bg-[#673e79]' },
];

function makeRecentSearches(tracks: SpotifyTrack[]): RecentSearch[] {
  return tracks.slice(0, 6).map((track) => ({
    key: track.id,
    label: track.artists[0]?.name ?? track.name,
    query: track.artists[0]?.name ?? track.name,
    imageUrl: track.album?.images?.[0]?.url,
  }));
}

export default function SearchPage() {
  const { isAuthenticated, accessToken } = useSpotifyAuth();
  const { query, setQuery, results, isSearching } = useSpotifySearch();
  const addToQueue = useBeatzStore((state) => state.addToQueue);
  const playTrack = useBeatzStore((state) => state.playTrack);
  const tickPlayer = useBeatzStore((state) => state.tickPlayer);
  const isChatOpen = useBeatzStore((state) => state.isChatOpen);
  const setChatOpen = useBeatzStore((state) => state.setChatOpen);
  const [recentSearches, setRecentSearches] = useState(() => makeRecentSearches(MOCK_TRACKS));
  const [addedTrackIds, setAddedTrackIds] = useState<Record<string, boolean>>({});

  useSpotifyPlayer({ accessToken, enabled: isAuthenticated });

  useEffect(() => {
    const interval = window.setInterval(tickPlayer, 1000);
    return () => window.clearInterval(interval);
  }, [tickPlayer]);

  useEffect(() => {
    const stored = window.localStorage.getItem('beatz-recent-searches');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as RecentSearch[];
      if (Array.isArray(parsed) && parsed.length) {
        setRecentSearches(parsed.slice(0, 6));
      }
    } catch {
      window.localStorage.removeItem('beatz-recent-searches');
    }
  }, []);

  const matchingTracks = useMemo(() => {
    if (!query.trim()) return [];
    if (results.length) return results;
    const normalizedQuery = query.trim().toLowerCase();
    return MOCK_TRACKS.filter((track) =>
      `${track.name} ${track.artists.map((artist) => artist.name).join(' ')}`.toLowerCase().includes(normalizedQuery)
    );
  }, [query, results]);

  const rememberSearch = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    const matchingTrack = MOCK_TRACKS.find((track) =>
      `${track.name} ${track.artists.map((artist) => artist.name).join(' ')}`.toLowerCase().includes(normalized.toLowerCase())
    );
    const item: RecentSearch = {
      key: normalized.toLowerCase(),
      label: normalized,
      query: normalized,
      imageUrl: matchingTrack?.album?.images?.[0]?.url,
    };
    const nextRecentSearches = [item, ...recentSearches.filter((recent) => recent.key !== item.key)].slice(0, 6);
    setRecentSearches(nextRecentSearches);
    window.localStorage.setItem('beatz-recent-searches', JSON.stringify(nextRecentSearches));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    rememberSearch(query);
  };

  const handleAddToQueue = (track: SpotifyTrack) => {
    addToQueue(track);
    setAddedTrackIds((previous) => ({ ...previous, [track.id]: true }));
    window.setTimeout(() => {
      setAddedTrackIds((previous) => ({ ...previous, [track.id]: false }));
    }, 1500);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-spotify-dark text-white">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-spotify-border bg-spotify-surface/90 px-6 backdrop-blur">
        <Link href="/" className="flex items-center gap-3 text-white" aria-label="Beatz home">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-spotify-green text-black"><Music className="h-5 w-5" /></span>
          <span className="text-lg font-bold tracking-tight">BEATZ</span>
        </Link>
        <span className="text-xs font-medium text-spotify-subtext">Search &amp; discover</span>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-16 shrink-0 border-r border-spotify-border bg-[#101010] px-2" aria-label="Primary navigation">
          <nav className="flex h-full w-full flex-col items-center justify-center gap-3">
            <Link href="/" className="group relative flex h-12 w-full items-center justify-center rounded-xl text-zinc-400 transition hover:bg-spotify-elevated/70 hover:text-white" aria-label="Home">
              <House className="h-5 w-5 transition group-hover:text-spotify-green" />
              <span className="pointer-events-none absolute left-full z-30 ml-3 translate-x-1 whitespace-nowrap rounded-md border border-spotify-border bg-spotify-elevated px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">Home</span>
            </Link>
            <Link href="/search" className="group relative flex h-12 w-full items-center justify-center rounded-xl bg-spotify-elevated text-white" aria-current="page" aria-label="Search">
              <Search className="h-5 w-5 text-spotify-green" />
              <span className="pointer-events-none absolute left-full z-30 ml-3 whitespace-nowrap rounded-md border border-spotify-border bg-spotify-elevated px-3 py-2 text-xs text-white shadow-lg">Search</span>
            </Link>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1500px] space-y-10 px-5 pb-32 pt-8 sm:px-8 lg:px-12">
            <form onSubmit={handleSubmit} className="relative max-w-3xl">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="What do you want to listen to?"
                className="h-14 w-full rounded-full border border-spotify-border bg-[#242424] pl-14 pr-12 text-sm text-white outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:bg-[#2a2a2a]"
                aria-label="Search songs, artists, and albums"
              />
              {isSearching && <Loader2 className="absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-spotify-green" />}
            </form>

            {query.trim() ? (
              <section className="space-y-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-spotify-subtext">Search results</p>
                    <h1 className="mt-1 truncate text-2xl font-bold text-white">{query}</h1>
                  </div>
                  <span className="shrink-0 text-xs text-spotify-subtext">{matchingTracks.length} tracks</span>
                </div>
                {matchingTracks.length ? (
                  <div className="divide-y divide-white/5">
                    {matchingTracks.map((track) => (
                      <div key={track.id} className="group flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-white/5">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-[#242424]">
                          <Music className="absolute inset-0 m-auto h-5 w-5 text-zinc-500" />
                          {track.album?.images?.[0]?.url && <img src={track.album.images[0].url} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} className="relative h-full w-full object-cover" />}
                        </div>
                        <button type="button" onClick={() => playTrack(track)} className="min-w-0 flex-1 text-left">
                          <span className="block truncate text-sm font-medium text-white group-hover:text-spotify-green">{track.name}</span>
                          <span className="mt-1 block truncate text-xs text-spotify-subtext">{track.artists.map((artist) => artist.name).join(', ')} · {track.album.name}</span>
                        </button>
                        <button type="button" onClick={() => handleAddToQueue(track)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-spotify-green hover:text-black" aria-label={addedTrackIds[track.id] ? `${track.name} added` : `Add ${track.name} to queue`} title={addedTrackIds[track.id] ? 'Added to queue' : 'Add to queue'}>
                          {addedTrackIds[track.id] ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : !isSearching ? (
                  <p className="rounded-xl border border-spotify-border bg-spotify-surface p-5 text-sm text-spotify-subtext">No matches found. Try another song or artist.</p>
                ) : null}
              </section>
            ) : (
              <>
                <section className="space-y-4">
                  <div className="flex items-end justify-between gap-4">
                    <h1 className="text-xl font-bold text-white">Recent Searches</h1>
                    <span className="text-xs text-spotify-subtext">Your shortcuts</span>
                  </div>
                  <div className="no-scrollbar flex gap-6 overflow-x-auto pb-2">
                    {recentSearches.map((recent) => (
                      <button key={recent.key} type="button" onClick={() => { setQuery(recent.query); rememberSearch(recent.query); }} className="group flex w-24 shrink-0 flex-col items-center gap-3 text-center">
                        <span className="relative aspect-square w-20 overflow-hidden rounded-full bg-[#242424] ring-1 ring-white/10 transition group-hover:ring-spotify-green/70">
                          <Music className="absolute inset-0 m-auto h-6 w-6 text-zinc-500" />
                          {recent.imageUrl && <img src={recent.imageUrl} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} className="relative h-full w-full object-cover" />}
                        </span>
                        <span className="w-full truncate text-xs font-medium text-zinc-300 transition group-hover:text-white">{recent.label}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-xl font-bold text-white">Browse All</h2>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
                    {BROWSE_CATEGORIES.map((category, index) => {
                      const track = MOCK_TRACKS[index % MOCK_TRACKS.length];
                      return (
                        <button key={category.name} type="button" onClick={() => setQuery(category.name)} className={`group relative aspect-[1.18] min-h-40 overflow-hidden rounded-lg ${category.color} p-4 text-left transition duration-200 hover:brightness-110`}>
                          <span className="relative z-10 block max-w-[75%] text-lg font-bold leading-tight text-white">{category.name}</span>
                          <span className="absolute -bottom-2 -right-3 h-24 w-24 rotate-[18deg] overflow-hidden rounded-md bg-black/20 shadow-xl transition duration-300 group-hover:-translate-y-2 group-hover:-rotate-6">
                            <Music className="absolute inset-0 m-auto h-8 w-8 text-white/60" />
                            {track.album?.images?.[0]?.url && <img src={track.album.images[0].url} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} className="relative h-full w-full object-cover" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      <PlayerBar />
      <QueueDrawer />
      <BeatzChatDrawer isOpen={isChatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
