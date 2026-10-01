'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useBeatzStore } from '@/lib/store';
import { SpotifyTrack, QueueState } from '@/types/spotify';

export function useSpotifyQueue(enabled = true) {
  const queue = useBeatzStore((state) => state.queue);
  const setQueue = useBeatzStore((state) => state.setQueue);
  const addToQueueLocal = useBeatzStore((state) => state.addToQueue);
  const removeFromQueueLocal = useBeatzStore((state) => state.removeFromQueue);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchQueue = useCallback(async () => {
    if (!enabled || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/spotify/queue');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: QueueState = await res.json();
      if (data.error) throw new Error(data.error);
      setQueue(data);
    } catch (err: any) {
      console.warn('Using local queue state:', err.message);
      setError(err.message || 'Failed to refresh Spotify queue');
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [enabled, setQueue]);

  useEffect(() => {
    if (!enabled) return;

    void fetchQueue();
    const interval = window.setInterval(() => void fetchQueue(), 5000);
    return () => window.clearInterval(interval);
  }, [enabled, fetchQueue]);

  const addTrack = (track: SpotifyTrack) => {
    addToQueueLocal(track);
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
