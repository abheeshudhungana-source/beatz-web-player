'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useBeatzStore } from '@/store/beatz-store';
import { SpotifyTrack } from '@/types/spotify';

export interface UseSpotifyPlayerArgs {
  accessToken: string | null;
  enabled: boolean;
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
        getCurrentState: () => Promise<any | null>;
      };
    };
  }
}

export function useSpotifyPlayer({ accessToken, enabled }: UseSpotifyPlayerArgs) {
  const playerRef = useRef<any | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  const {
    setSdkDeviceId,
    setSdkActive,
    setIsPremium,
    setSdkError,
    syncSdkState,
  } = useBeatzStore();
  const volume = useBeatzStore((state) => state.volume);

  const getFreshToken = useCallback(async (callback: (token: string) => void) => {
    try {
      const res = await fetch('/api/auth/token');
      const data = await res.json();
      if (data.accessToken) {
        callback(data.accessToken);
        if (data.user?.product === 'premium') {
          setIsPremium(true);
        }
      } else if (accessToken) {
        callback(accessToken);
      }
    } catch {
      if (accessToken) callback(accessToken);
    }
  }, [accessToken, setIsPremium]);

  useEffect(() => {
    if (!enabled || !accessToken) {
      return;
    }

    setIsInitializing(true);
    let progressPoll: ReturnType<typeof setInterval> | null = null;

    // 1. Inject Spotify Web Playback SDK script tag if not already on page
    const existingScript = document.querySelector('script[data-spotify-sdk="true"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      script.dataset.spotifySdk = 'true';
      document.body.appendChild(script);
    }

    // 2. Initialize Player instance
    const initializePlayer = () => {
      if (playerRef.current || !window.Spotify) {
        return;
      }

      const player = new window.Spotify.Player({
        name: 'Beatz Web Player',
        getOAuthToken: getFreshToken,
        volume: useBeatzStore.getState().volume,
      });

      playerRef.current = player;

      // Event: Player successfully registered with Spotify's audio backend
      player.addListener('ready', async ({ device_id }: { device_id: string }) => {
        console.log('[Spotify Web SDK] Device ready with ID:', device_id);
        setSdkDeviceId(device_id);
        setSdkActive(true);
        setSdkReady(true);
        setIsInitializing(false);
        setSdkError(null);
        setIsPremium(true);

        progressPoll = setInterval(() => {
          void player.getCurrentState().then((state: any) => {
            if (!state) return;

            syncSdkState({
              progressMs: state.position ?? 0,
              durationMs: state.duration,
              isPlaying: !state.paused,
            });
          }).catch(() => {});
        }, 500);

        // Auto-transfer Spotify playback to this browser device
        try {
          await fetch('/api/spotify/player', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'transfer', deviceId: device_id }),
          });
          console.log('[Spotify Web SDK] Playback transferred to Beatz Web Player');
        } catch (err) {
          console.warn('[Spotify Web SDK] Transfer request error:', err);
        }
      });

      // Event: Device offline
      player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.warn('[Spotify Web SDK] Device offline:', device_id);
        setSdkActive(false);
        setSdkReady(false);
      });

      // Event: Playback state changed (track changed, paused, resumed, seeked)
      player.addListener('player_state_changed', (state: any) => {
        if (!state) return;

        const rawTrack = state.track_window?.current_track;
        if (rawTrack) {
          const mappedTrack: SpotifyTrack = {
            id: rawTrack.id || 'spotify-sdk-track',
            uri: rawTrack.uri || `spotify:track:${rawTrack.id}`,
            name: rawTrack.name || 'Playing Track',
            durationMs: state.duration || rawTrack.duration_ms || 180000,
            artists: (rawTrack.artists || []).map((a: any) => ({
              id: a.uri || a.name,
              name: a.name,
              uri: a.uri || '',
            })),
            album: {
              id: rawTrack.album?.uri || 'album-id',
              name: rawTrack.album?.name || '',
              uri: rawTrack.album?.uri || '',
              images: (rawTrack.album?.images || []).map((img: any) => ({
                url: img.url,
                height: img.height ?? 300,
                width: img.width ?? 300,
              })),
            },
            previewUrl: null,
          };

          syncSdkState({
            currentTrack: mappedTrack,
            durationMs: state.duration || mappedTrack.durationMs,
            progressMs: state.position || 0,
            isPlaying: !state.paused,
          });
        } else {
          syncSdkState({ isPlaying: !state.paused });
        }
      });

      // Event: Account Error (fires if user is not Spotify Premium)
      player.addListener('account_error', (error: any) => {
        console.warn('[Spotify Web SDK] Account Error (Premium Required):', error.message);
        setIsPremium(false);
        setSdkActive(false);
        setSdkError('Spotify Premium required for in-browser streaming. Audio preview mode is active.');
      });

      // Event: Authentication Error
      player.addListener('authentication_error', (error: any) => {
        console.warn('[Spotify Web SDK] Auth Error:', error.message);
        setSdkActive(false);
        setSdkError('Authentication failed. Please reconnect Spotify.');
      });

      // Event: Playback Error
      player.addListener('playback_error', (error: any) => {
        console.warn('[Spotify Web SDK] Playback Error:', error.message);
      });

      player.connect();
    };

    if (window.Spotify) {
      initializePlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initializePlayer;
    }

    return () => {
      if (progressPoll) {
        clearInterval(progressPoll);
      }
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
    };
  }, [accessToken, enabled, getFreshToken, setSdkDeviceId, setSdkActive, setIsPremium, setSdkError, syncSdkState]);

  useEffect(() => {
    void playerRef.current?.setVolume(volume).catch(() => {});
  }, [volume]);

  return {
    isInitializing,
    sdkReady,
    player: playerRef.current,
  };
}
