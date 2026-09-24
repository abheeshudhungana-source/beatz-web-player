'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface PlayerTrack {
  id: string;
  uri: string;
  name: string;
  durationMs: number;
  artists: Array<{ id: string; name: string; uri: string }>;
  album: {
    id: string;
    name: string;
    uri: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
}

export interface UseSpotifyPlayerArgs {
  accessToken: string | null;
  enabled: boolean;
}

export interface UseSpotifyPlayerResult {
  deviceId: string | null;
  isReady: boolean;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  volume: number;
  currentTrack: PlayerTrack | null;
  isLoading: boolean;
  togglePlay: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setVolume: (nextVolume: number) => void;
  seekTo: (positionMs: number) => void;
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => {
        addListener: (event: string, callback: (state: any) => void) => void;
        removeListener: (event: string, callback: (state: any) => void) => void;
        connect: () => Promise<boolean>;
        disconnect: () => void;
        pause: () => Promise<void>;
        resume: () => Promise<void>;
        nextTrack: () => Promise<void>;
        previousTrack: () => Promise<void>;
        seek: (positionMs: number) => Promise<void>;
        setVolume: (volume: number) => Promise<void>;
      };
    };
  }
}

const defaultTrack: PlayerTrack = {
  id: 'midnight-city',
  uri: 'spotify:track:midnight-city',
  name: 'Midnight City',
  durationMs: 232000,
  artists: [{ id: 'm83', name: 'M83', uri: 'spotify:artist:m83' }],
  album: {
    id: 'midnight-city-album',
    name: 'Hurry Up, We’re Dreaming',
    uri: 'spotify:album:midnight-city',
    images: [{ url: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80', height: 640, width: 640 }],
  },
};

export function useSpotifyPlayer({ accessToken, enabled }: UseSpotifyPlayerArgs): UseSpotifyPlayerResult {
  const playerRef = useRef<any | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressMs, setProgressMs] = useState(100000);
  const [durationMs, setDurationMs] = useState(defaultTrack.durationMs);
  const [volume, setVolumeState] = useState(0.5);
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(defaultTrack);
  const [isLoading, setIsLoading] = useState(false);

  const setVolume = useCallback(async (nextVolume: number) => {
    const safeVolume = Math.max(0, Math.min(1, nextVolume));
    setVolumeState(safeVolume);

    if (playerRef.current && isReady) {
      try {
        await playerRef.current.setVolume(safeVolume);
      } catch (error) {
        console.warn('Unable to set Spotify volume:', error);
      }
    }
  }, [isReady]);

  const togglePlay = useCallback(async () => {
    if (!playerRef.current || !isReady) {
      setIsPlaying((prev) => !prev);
      return;
    }

    try {
      if (isPlaying) {
        await playerRef.current.pause();
      } else {
        await playerRef.current.resume();
      }
      setIsPlaying((prev) => !prev);
    } catch (error) {
      console.warn('Unable to toggle Spotify playback:', error);
    }
  }, [isPlaying, isReady]);

  const nextTrack = useCallback(async () => {
    if (!playerRef.current || !isReady) {
      return;
    }

    try {
      await playerRef.current.nextTrack();
    } catch (error) {
      console.warn('Unable to skip to next track:', error);
    }
  }, [isReady]);

  const previousTrack = useCallback(async () => {
    if (!playerRef.current || !isReady) {
      return;
    }

    try {
      await playerRef.current.previousTrack();
    } catch (error) {
      console.warn('Unable to skip to previous track:', error);
    }
  }, [isReady]);

  const seekTo = useCallback(async (positionMs: number) => {
    const safePosition = Math.max(0, Math.min(positionMs, durationMs));
    setProgressMs(safePosition);

    if (playerRef.current && isReady) {
      try {
        await playerRef.current.seek(safePosition);
      } catch (error) {
        console.warn('Unable to seek Spotify playback:', error);
      }
    }
  }, [durationMs, isReady]);

  useEffect(() => {
    if (!enabled || !accessToken) {
      return;
    }

    const existingScript = document.querySelector('script[data-spotify-sdk="true"]');
    if (existingScript) {
      if (window.Spotify) {
        window.onSpotifyWebPlaybackSDKReady?.();
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    script.dataset.spotifySdk = 'true';
    script.onload = () => {
      window.onSpotifyWebPlaybackSDKReady?.();
    };
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [accessToken, enabled]);

  useEffect(() => {
    if (!enabled || !accessToken || !window.Spotify) {
      return;
    }

    const bootstrapPlayer = () => {
      if (playerRef.current) {
        return;
      }

      const SpotifyPlayer = window.Spotify;
      if (!SpotifyPlayer) {
        return;
      }

      const player = new SpotifyPlayer.Player({
        name: 'Beatz Web Player',
        getOAuthToken: (cb) => cb(accessToken),
        volume: volume,
      });

      playerRef.current = player;

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        setDeviceId(device_id);
        setIsReady(true);
        setIsLoading(false);
      });

      player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.warn('Spotify player not ready on device:', device_id);
        setIsReady(false);
      });

      player.addListener('player_state_changed', (state: any) => {
        if (!state) {
          return;
        }

        const track = state.track_window?.current_track;
        if (track) {
          setCurrentTrack({
            id: track.id ?? 'spotify-current',
            uri: track.uri ?? 'spotify:track:current',
            name: track.name ?? 'Current track',
            durationMs: track.duration_ms ?? 0,
            artists: (track.artists ?? []).map((artist: any) => ({
              id: artist.id ?? `${artist.name}-id`,
              name: artist.name ?? 'Artist',
              uri: artist.uri ?? `spotify:artist:${artist.name}`,
            })),
            album: {
              id: track.album?.id ?? 'spotify-album',
              name: track.album?.name ?? 'Album',
              uri: track.album?.uri ?? 'spotify:album:current',
              images: (track.album?.images ?? []).map((image: any) => ({
                url: image.url,
                height: image.height ?? 640,
                width: image.width ?? 640,
              })),
            },
          });
          setDurationMs(track.duration_ms ?? 0);
          setProgressMs(state.position ?? 0);
        }

        setIsPlaying(!state.paused);
      });

      player.connect();
    };

    window.onSpotifyWebPlaybackSDKReady = bootstrapPlayer;
    window.onSpotifyWebPlaybackSDKReady();

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
      window.onSpotifyWebPlaybackSDKReady = undefined;
    };
  }, [accessToken, enabled, volume]);

  return {
    deviceId,
    isReady,
    isPlaying,
    progressMs,
    durationMs,
    volume,
    currentTrack,
    isLoading,
    togglePlay,
    nextTrack,
    previousTrack,
    setVolume,
    seekTo,
  };
}
