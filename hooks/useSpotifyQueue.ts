'use client';

import { useEffect, useState, useCallback } from 'react';
import { useBeatzStore } from '@/lib/store';
import { SpotifyTrack, QueueState } from '@/types/spotify';

export function useSpotifyQueue() {
  const queue = useBeatzStore((state) => state.queue);
  const setQueue = useBeatzStore((state) => state.setQueue);
  const addToQueueLocal = useBeatzStore((state) => state.addToQueue);
  const removeFromQueueLocal = useBeatzStore((state) => state.removeFromQueue);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/spotify/queue');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: QueueState = await res.json();
      setQueue(data);
    } catch (err: any) {
      console.warn('Using local queue state:', err.message);
      // Keep store queue as fallback
    } finally {
      setIsLoading(false);
    }
  }, [setQueue]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const addTrack = async (track: SpotifyTrack) => {
    // 1. Optimistic update in Zustand store so UI responds immediately
    addToQueueLocal(track);

    // 2. Sync with backend API
    try {
      const res = await fetch('/api/spotify/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: track.uri }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        console.warn('Failed to sync queue with Spotify API:', errorData);
      }
    } catch (err) {
      console.warn('Network error adding to Spotify queue:', err);
    }
  };

  return {
    queue,
    isLoading,
    error,
    refreshQueue: fetchQueue,
    addToQueue: addTrack,
    removeFromQueue: removeFromQueueLocal,
  };
}
