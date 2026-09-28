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
  removeFromQueue: (trackId: string) => void;
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
  syncSdkState: (stateUpdate) => set((prev) => ({ ...prev, ...stateUpdate })),

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
          upcomingTracks: input.slice(1),
          isLoading: false,
          error: null,
        },
        durationMs: nextTrack?.durationMs ?? 0,
        progressMs: 0,
      });
    } else {
      set({
        queue: input,
        currentTrack: input.currentlyPlaying ?? get().currentTrack,
      });
    }
  },

  addToQueue: (track) =>
    set((state) => ({
      queue: {
        ...state.queue,
        upcomingTracks: [...state.queue.upcomingTracks, track],
      },
    })),

  removeFromQueue: (trackId) =>
    set((state) => ({
      queue: {
        ...state.queue,
        upcomingTracks: state.queue.upcomingTracks.filter((t) => t.id !== trackId),
      },
    })),

  playTrack: (track) => {
    const { isSdkActive, sdkDeviceId } = get();

    // 1. If Spotify Web Playback SDK is connected and active:
    if (isSdkActive && sdkDeviceId) {
      if (typeof window !== 'undefined' && previewAudio) {
        previewAudio.pause();
        previewAudio.src = '';
      }

      set({
        currentTrack: track,
        durationMs: track.durationMs,
        progressMs: 0,
        isPlaying: true,
      });

      // Target playback specifically to the in-browser Web Playback SDK device
      fetch('/api/spotify/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'play',
          uri: track.uri,
          deviceId: sdkDeviceId,
        }),
      }).catch((err) => console.warn('Failed to stream via Spotify SDK:', err));
      return;
    }

    // 2. Fallback: In-browser audio preview engine
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

      // Also notify any external active Spotify session
      fetch('/api/spotify/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'play', uri: track.uri }),
      }).catch(() => {});
    }

    set({
      currentTrack: track,
      durationMs: track.durationMs,
      progressMs: 0,
      isPlaying: true,
    });
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
          action: nextIsPlaying ? 'play' : 'pause',
          uri: currentTrack?.uri,
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
          body: JSON.stringify({ action: 'play', uri: currentTrack.uri }),
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
      // If queue is empty, cycle to the next song in catalog so playback continues seamlessly
      const allTracks = MOCK_TRACKS;
      const currentIndex = allTracks.findIndex((t) => t.id === state.currentTrack?.id);
      const nextIndex = (currentIndex + 1) % allTracks.length;
      get().playTrack(allTracks[nextIndex]);
    } else {
      const [next, ...rest] = queue;
      set({
        queue: {
          currentlyPlaying: next,
          upcomingTracks: rest.length > 0 ? rest : MOCK_TRACKS.filter((t) => t.id !== next.id),
          isLoading: false,
          error: null,
        },
      });
      get().playTrack(next);
    }
  },

  previousTrack: () => {
    const state = get();
    if (state.progressMs > 3000) {
      get().seekTo(0);
      return;
    }

    const allTracks = MOCK_TRACKS;
    const currentIndex = allTracks.findIndex((t) => t.id === state.currentTrack?.id);
    const prevIndex = (currentIndex - 1 + allTracks.length) % allTracks.length;
    get().playTrack(allTracks[prevIndex]);
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

      // If SDK is active, Spotify SDK automatically fires player_state_changed with exact positionMs
      // but tick forward 1s locally for ultra-smooth UI progress
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
