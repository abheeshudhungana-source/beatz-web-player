import { create } from 'zustand';
import { AdBreakState, QueueState, SpotifyTrack } from '@/types/spotify';
import { MOCK_TRACKS, getPreviewAudioUrl } from '@/lib/spotify';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const initialQueue: QueueState = {
  currentlyPlaying: MOCK_TRACKS[0],
  upcomingTracks: MOCK_TRACKS.slice(1),
  isLoading: false,
  error: null,
};

const initialAdState: AdBreakState = {
  isAdPlaying: false,
  adDurationMs: 90000,
  adProgressMs: 0,
  adIndex: 0,
  totalAdsInBreak: 3,
};

interface BeatzStore {
  currentTrack: SpotifyTrack | null;
  queue: QueueState;
  isPlaying: boolean;
  durationMs: number;
  progressMs: number;
  volume: number;
  isReady: boolean;
  adState: AdBreakState;
  isQueueOpen: boolean;
  isChatOpen: boolean;

  // Spotify Web Playback SDK device bridge
  sdkDeviceId: string | null;
  isSdkActive: boolean;
  isPremium: boolean;
  sdkError: string | null;

  setSdkDeviceId: (deviceId: string | null) => void;
  setSdkActive: (active: boolean) => void;
  setIsPremium: (isPremium: boolean) => void;
  setSdkError: (error: string | null) => void;
  syncSdkState: (stateUpdate: {
    currentTrack?: SpotifyTrack;
    durationMs?: number;
    progressMs?: number;
    isPlaying?: boolean;
  }) => void;

  setCurrentTrack: (track: SpotifyTrack | null) => void;
  setQueue: (tracks: SpotifyTrack[] | QueueState) => void;
  addToQueue: (track: SpotifyTrack) => void;
  addMultipleToQueue: (tracks: SpotifyTrack[]) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  clearAndReplaceQueue: (tracks: SpotifyTrack[]) => void;
  playTrack: (track: SpotifyTrack) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setVolume: (value: number) => void;
  seekTo: (value: number) => void;
  tickPlayer: () => void;
  triggerAdBreak: () => void;
  finishAdBreak: () => void;
  toggleQueue: () => void;
  setQueueOpen: (open: boolean) => void;
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;
}

let previewAudio: HTMLAudioElement | null = null;

const getUpcomingQueueAfterCurrent = (currentTrack: SpotifyTrack | null, upcomingTracks: SpotifyTrack[] = []) =>
  upcomingTracks.filter((track) => track.id !== currentTrack?.id);

export const useBeatzStore = create<BeatzStore>((set, get) => ({
  currentTrack: initialQueue.currentlyPlaying,
  queue: initialQueue,
  isPlaying: false,
  durationMs: MOCK_TRACKS[0].durationMs,
  progressMs: 0,
  volume: 0.8,
  isReady: true,
  adState: initialAdState,
  isQueueOpen: false,
  isChatOpen: false,

  sdkDeviceId: null,
  isSdkActive: false,
  isPremium: false,
  sdkError: null,

  setSdkDeviceId: (deviceId) => set({ sdkDeviceId: deviceId }),
  setSdkActive: (active) => set({ isSdkActive: active }),
  setIsPremium: (isPremium) => set({ isPremium }),
  setSdkError: (error) => set({ sdkError: error }),
  syncSdkState: (stateUpdate) => {
    set((prev) => {
      const nextState = { ...prev, ...stateUpdate };
      // If currentTrack is updated via SDK and differs from queue.currentlyPlaying
      if (stateUpdate.currentTrack && stateUpdate.currentTrack.id !== prev.queue.currentlyPlaying?.id) {
        const upcoming = prev.queue.upcomingTracks;
        const matchIndex = upcoming.findIndex((t) => t.id === stateUpdate.currentTrack?.id);
        const newUpcoming = matchIndex !== -1 ? upcoming.slice(matchIndex + 1) : upcoming;

        nextState.queue = {
          ...prev.queue,
          currentlyPlaying: stateUpdate.currentTrack,
          upcomingTracks: newUpcoming,
        };
      }
      return nextState;
    });
  },

  setCurrentTrack: (track) =>
    set({
      currentTrack: track,
      durationMs: track?.durationMs ?? 0,
      progressMs: 0,
    }),

  setQueue: (input) => {
    if (Array.isArray(input)) {
      const nextTrack = input[0] ?? null;
      set({
        currentTrack: nextTrack,
        queue: {
          currentlyPlaying: nextTrack,
          upcomingTracks: getUpcomingQueueAfterCurrent(nextTrack, input.slice(1)),
          isLoading: false,
          error: null,
        },
        durationMs: nextTrack?.durationMs ?? 0,
        progressMs: 0,
      });
    } else {
      set({
        queue: {
          ...input,
          upcomingTracks: getUpcomingQueueAfterCurrent(input.currentlyPlaying ?? get().currentTrack, input.upcomingTracks),
        },
        currentTrack: input.currentlyPlaying ?? get().currentTrack,
      });
    }
  },

  addToQueue: (track) =>
    set((state) => ({
      queue: {
        ...state.queue,
        upcomingTracks: getUpcomingQueueAfterCurrent(state.currentTrack, [...state.queue.upcomingTracks, track]),
      },
    })),

  addMultipleToQueue: (tracks) =>
    set((state) => ({
      queue: {
        ...state.queue,
        upcomingTracks: [...state.queue.upcomingTracks, ...tracks],
      },
    })),

  removeFromQueue: (trackId) =>
    set((state) => ({
      queue: {
        ...state.queue,
        upcomingTracks: state.queue.upcomingTracks.filter((t) => t.id !== trackId),
      },
    })),

  clearQueue: () =>
    set((state) => ({
      queue: {
        ...state.queue,
        upcomingTracks: [],
      },
    })),

  clearAndReplaceQueue: (tracks) => {
    if (tracks.length === 0) {
      set((state) => ({
        queue: {
          ...state.queue,
          upcomingTracks: [],
        },
      }));
      return;
    }
    const [first, ...rest] = tracks;
    set((state) => ({
      queue: {
        ...state.queue,
        currentlyPlaying: first,
        upcomingTracks: rest,
      },
    }));
    get().playTrack(first);
  },

  playTrack: (track) => {
    const { isSdkActive, sdkDeviceId, queue } = get();

    // Reconcile queue: prune track (and preceding items) from upcoming list
    const upcomingWithoutSelected = getUpcomingQueueAfterCurrent(track, queue.upcomingTracks)
      .filter((item) => item.id !== queue.currentlyPlaying?.id);

    set({
      currentTrack: track,
      queue: {
        ...queue,
        currentlyPlaying: track,
        upcomingTracks: upcomingWithoutSelected,
        isLoading: false,
        error: null,
      },
      durationMs: track.durationMs,
      progressMs: 0,
      isPlaying: true,
    });

    const playFallbackAudio = () => {
      if (typeof window !== 'undefined') {
        try {
          if (previewAudio) {
            previewAudio.pause();
            previewAudio.src = '';
          }
          const audioUrl = getPreviewAudioUrl(track);
          previewAudio = new Audio(audioUrl);
          previewAudio.volume = get().volume;
          previewAudio.onended = () => {
            get().nextTrack();
          };

          const playPromise = previewAudio.play();
          if (playPromise !== undefined) {
            playPromise.catch((e) => console.warn('Audio play blocked / user gesture needed:', e));
          }
        } catch (err) {
          console.warn('Audio play error:', err);
        }
      }
    };

    // 1. If Spotify Web Playback SDK is connected and active:
    if (isSdkActive && sdkDeviceId) {
      if (typeof window !== 'undefined' && previewAudio) {
        previewAudio.pause();
        previewAudio.src = '';
      }

      fetch('/api/spotify/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'play',
          uri: track.uri,
          deviceId: sdkDeviceId,
        }),
      })
        .then((res) => {
          if (!res.ok) {
            console.warn('[Spotify SDK] Play request non-OK status (' + res.status + '). Falling back to preview audio.');
            playFallbackAudio();
          }
        })
        .catch((err) => {
          console.warn('[Spotify SDK] Network error streaming via Spotify SDK:', err);
          playFallbackAudio();
        });
      return;
    }

    // 2. Direct fallback: In-browser audio preview engine
    playFallbackAudio();
  },

  togglePlay: () => {
    const { isPlaying, currentTrack, volume, adState, isSdkActive, sdkDeviceId } = get();
    if (adState.isAdPlaying) return;

    const nextIsPlaying = !isPlaying;

    // 1. If Spotify Web Playback SDK is active:
    if (isSdkActive && sdkDeviceId) {
      set({ isPlaying: nextIsPlaying });
      fetch('/api/spotify/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: nextIsPlaying ? 'resume' : 'pause',
          deviceId: sdkDeviceId,
        }),
      }).catch(() => {});
      return;
    }

    // 2. Fallback preview audio toggle
    if (typeof window !== 'undefined' && currentTrack) {
      if (!previewAudio || previewAudio.src === '') {
        const audioUrl = getPreviewAudioUrl(currentTrack);
        previewAudio = new Audio(audioUrl);
        previewAudio.volume = volume;
        previewAudio.onended = () => {
          get().nextTrack();
        };
      }

      if (nextIsPlaying) {
        const playPromise = previewAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => console.warn('Audio play error:', e));
        }
        fetch('/api/spotify/player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'resume' }),
        }).catch(() => {});
      } else {
        previewAudio.pause();
        fetch('/api/spotify/player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'pause' }),
        }).catch(() => {});
      }
    }

    set({ isPlaying: nextIsPlaying });
  },

  nextTrack: () => {
    const state = get();
    const queue = state.queue.upcomingTracks;

    if (queue.length === 0) {
      // Clean end of queue: gracefully pause rather than endlessly cycling unrequested mock songs
      if (previewAudio) {
        previewAudio.pause();
        previewAudio.src = '';
      }
      set({
        isPlaying: false,
        progressMs: 0,
      });
      return;
    }

    const [next, ...rest] = queue;
    set({
      queue: {
        ...state.queue,
        currentlyPlaying: next,
        upcomingTracks: rest,
        isLoading: false,
        error: null,
      },
      currentTrack: next,
      durationMs: next.durationMs,
      progressMs: 0,
      isPlaying: true,
    });
    get().playTrack(next);
  },

  previousTrack: () => {
    const state = get();
    if (state.progressMs > 3000) {
      get().seekTo(0);
      return;
    }

    get().seekTo(0);
    if (state.currentTrack) {
      get().playTrack(state.currentTrack);
    }
  },

  setVolume: (value) => {
    const clamped = clamp(value, 0, 1);
    const { isSdkActive, sdkDeviceId } = get();

    if (previewAudio) {
      previewAudio.volume = clamped;
    }

    if (isSdkActive && sdkDeviceId) {
      fetch('/api/spotify/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'volume',
          volumePercent: clamped * 100,
          deviceId: sdkDeviceId,
        }),
      }).catch(() => {});
    }

    set({ volume: clamped });
  },

  seekTo: (value) => {
    const clamped = clamp(value, 0, get().durationMs || 0);
    const { isSdkActive, sdkDeviceId } = get();

    if (isSdkActive && sdkDeviceId) {
      fetch('/api/spotify/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'seek',
          positionMs: clamped,
          deviceId: sdkDeviceId,
        }),
      }).catch(() => {});
    } else if (previewAudio && previewAudio.duration && !isNaN(previewAudio.duration)) {
      const audioPercent = clamped / (get().durationMs || 1);
      previewAudio.currentTime = audioPercent * previewAudio.duration;
    }

    set({ progressMs: clamped });
  },

  tickPlayer: () =>
    set((state) => {
      if (state.adState.isAdPlaying) {
        const nextProgress = state.adState.adProgressMs + 1000;

        if (nextProgress >= state.adState.adDurationMs) {
          return {
            adState: {
              ...state.adState,
              isAdPlaying: false,
              adProgressMs: 0,
            },
            isPlaying: true,
          };
        }

        return {
          adState: {
            ...state.adState,
            adProgressMs: nextProgress,
          },
        };
      }

      if (!state.isPlaying) {
        return {};
      }

      if (state.isSdkActive) {
        return {};
      }

      const nextProgress = state.progressMs + 1000;

      if (nextProgress >= state.durationMs && state.durationMs > 0) {
        get().nextTrack();
        return {};
      }

      return {
        progressMs: nextProgress,
      };
    }),

  triggerAdBreak: () => {
    if (typeof window !== 'undefined' && previewAudio) {
      previewAudio.pause();
    }
    const { isSdkActive, sdkDeviceId } = get();
    if (isSdkActive && sdkDeviceId) {
      fetch('/api/spotify/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause', deviceId: sdkDeviceId }),
      }).catch(() => {});
    }
    set((state) => ({
      isPlaying: false,
      adState: {
        ...state.adState,
        isAdPlaying: true,
        adProgressMs: 0,
        adIndex: state.adState.adIndex + 1,
      },
    }));
  },

  finishAdBreak: () =>
    set((state) => ({
      isPlaying: true,
      adState: {
        ...state.adState,
        isAdPlaying: false,
        adProgressMs: 0,
      },
    })),

  toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
  setQueueOpen: (open) => set({ isQueueOpen: open }),
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  setChatOpen: (open) => set({ isChatOpen: open }),
}));
