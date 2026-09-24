'use client';

import { useState, useEffect, useRef } from 'react';
import { SpotifyTrack } from '@/types/spotify';
import { MOCK_TRACKS } from '@/lib/spotify';

export function useSpotifySearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsSearching(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setResults(data.tracks || []);
      } catch (err) {
        console.warn('Falling back to local catalog search:', err);
        const qLower = query.toLowerCase();
        const fallback = MOCK_TRACKS.filter(
          (t) =>
            t.name.toLowerCase().includes(qLower) ||
            t.artists.some((a) => a.name.toLowerCase().includes(qLower))
        );
        setResults(fallback);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  return {
    query,
    setQuery,
    results,
    isSearching,
    clearSearch: () => setQuery(''),
  };
}
