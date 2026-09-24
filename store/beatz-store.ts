import { create } from 'zustand';
import { AdBreakState, QueueState, SpotifyTrack } from '@/types/spotify';
import { MOCK_TRACKS } from '@/lib/spotify';

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
    if (typeof window !== 'undefined') {
      if (previewAudio) {
        previewAudio.pause();
      }
      if (track.previewUrl) {
        previewAudio = new Audio(track.previewUrl);
        previewAudio.volume = get().volume;
        previewAudio.play().catch((e) => console.warn('Audio play blocked:', e));
      }
    }

    set({
      currentTrack: track,
      durationMs: track.durationMs,
      progressMs: 0,
      isPlaying: true,
    });
  },

  togglePlay: () => {
    const { isPlaying, currentTrack, volume, adState } = get();
    if (adState.isAdPlaying) return;

    const nextIsPlaying = !isPlaying;

    if (typeof window !== 'undefined' && currentTrack?.previewUrl) {
      if (!previewAudio) {
        previewAudio = new Audio(currentTrack.previewUrl);
        previewAudio.volume = volume;
      }
      if (nextIsPlaying) {
        previewAudio.play().catch((e) => console.warn('Audio play error:', e));
      } else {
        previewAudio.pause();
      }
    }

    set({ isPlaying: nextIsPlaying });
  },

  nextTrack: () => {
    const state = get();
    const queue = state.queue.upcomingTracks;

    if (queue.length === 0) return;

    const [next, ...rest] = queue;
    if (typeof window !== 'undefined' && previewAudio) {
      previewAudio.pause();
    }
    if (typeof window !== 'undefined' && next.previewUrl) {
      previewAudio = new Audio(next.previewUrl);
      previewAudio.volume = state.volume;
      previewAudio.play().catch(() => {});
    }

    set({
      currentTrack: next,
      queue: {
        currentlyPlaying: next,
        upcomingTracks: rest,
        isLoading: false,
        error: null,
      },
      durationMs: next.durationMs,
      progressMs: 0,
      isPlaying: true,
    });
  },

  previousTrack: () => {
    const state = get();
    const current = state.currentTrack;
    if (!current) return;

    if (typeof window !== 'undefined' && previewAudio) {
      previewAudio.currentTime = 0;
    }
    set({
      progressMs: 0,
      isPlaying: true,
    });
  },

  setVolume: (value) => {
    const clamped = clamp(value, 0, 1);
    if (previewAudio) {
      previewAudio.volume = clamped;
    }
    set({ volume: clamped });
  },

  seekTo: (value) => {
    const clamped = clamp(value, 0, get().durationMs || 0);
    if (previewAudio) {
      previewAudio.currentTime = clamped / 1000;
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

      const nextProgress = state.progressMs + 1000;

      if (nextProgress >= state.durationMs) {
        const { queue } = state;
        const [nextTrack, ...rest] = queue.upcomingTracks;

        if (nextTrack) {
          return {
            currentTrack: nextTrack,
            queue: {
              currentlyPlaying: nextTrack,
              upcomingTracks: rest,
              isLoading: false,
              error: null,
            },
            progressMs: 0,
            durationMs: nextTrack.durationMs,
          };
        }

        return {
          isPlaying: false,
          progressMs: state.durationMs,
        };
      }

      return {
        progressMs: nextProgress,
      };
    }),

  triggerAdBreak: () => {
    if (typeof window !== 'undefined' && previewAudio) {
      previewAudio.pause();
    }
    set((state) => ({
      isPlaying: false,
      adState: {
        ...state.adState,
        isAdPlaying: true,
        adDurationMs: 45000 + Math.floor(Math.random() * 105000),
        adProgressMs: 0,
        adIndex: state.adState.adIndex + 1,
        totalAdsInBreak: 3 + Math.floor(Math.random() * 3),
      },
    }));
  },

  finishAdBreak: () =>
    set((state) => ({
      adState: {
        ...state.adState,
        isAdPlaying: false,
        adProgressMs: 0,
      },
      isPlaying: true,
    })),

  toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
  setQueueOpen: (open) => set({ isQueueOpen: open }),
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  setChatOpen: (open) => set({ isChatOpen: open }),
}));
