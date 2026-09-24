import { create } from 'zustand';
import { AdBreakState, QueueState, SpotifyTrack } from '@/types/spotify';

const mockTracks: SpotifyTrack[] = [
  {
    id: 'midnight-city',
    uri: 'spotify:track:midnight_city',
    name: 'Midnight City',
    durationMs: 232000,
    artists: [{ id: 'm83', name: 'M83', uri: 'spotify:artist:m83' }],
    album: {
      id: 'hurry-up-album',
      name: 'Hurry Up, We\'re Dreaming',
      uri: 'spotify:album:hurry-up',
      images: [{ url: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80', height: 640, width: 640 }],
    },
  },
  {
    id: 'afterdark',
    uri: 'spotify:track:afterdark',
    name: 'Afterdark',
    durationMs: 258000,
    artists: [{ id: 'cyril', name: 'Cyril', uri: 'spotify:artist:cyril' }],
    album: {
      id: 'afterdark-album',
      name: 'Night Mode',
      uri: 'spotify:album:afterdark',
      images: [{ url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80', height: 640, width: 640 }],
    },
  },
  {
    id: 'bohemian-rhapsody',
    uri: 'spotify:track:bohemian-rhapsody',
    name: 'Bohemian Rhapsody',
    durationMs: 354000,
    artists: [{ id: 'queen', name: 'Queen', uri: 'spotify:artist:queen' }],
    album: {
      id: 'queen-album',
      name: 'A Night at the Opera',
      uri: 'spotify:album:queen',
      images: [{ url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80', height: 640, width: 640 }],
    },
  },
  {
    id: 'night-drive',
    uri: 'spotify:track:night-drive',
    name: 'Night Drive',
    durationMs: 221000,
    artists: [{ id: 'nils-frahm', name: 'Nils Frahm', uri: 'spotify:artist:nils-frahm' }],
    album: {
      id: 'night-drive-album',
      name: 'Drive by Echoes',
      uri: 'spotify:album:night-drive',
      images: [{ url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=80', height: 640, width: 640 }],
    },
  },
  {
    id: 'lush-life',
    uri: 'spotify:track:lush-life',
    name: 'Lush Life',
    durationMs: 247000,
    artists: [{ id: 'zara', name: 'Zara Larsson', uri: 'spotify:artist:zara' }],
    album: {
      id: 'lush-life-album',
      name: 'So Good',
      uri: 'spotify:album:lush-life',
      images: [{ url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80', height: 640, width: 640 }],
    },
  },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const initialQueue: QueueState = {
  currentlyPlaying: mockTracks[0],
  upcomingTracks: mockTracks.slice(1),
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
  setCurrentTrack: (track: SpotifyTrack | null) => void;
  setQueue: (tracks: SpotifyTrack[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setVolume: (value: number) => void;
  seekTo: (value: number) => void;
  tickPlayer: () => void;
  triggerAdBreak: () => void;
  finishAdBreak: () => void;
}

export const useBeatzStore = create<BeatzStore>((set, get) => ({
  currentTrack: initialQueue.currentlyPlaying,
  queue: initialQueue,
  isPlaying: false,
  durationMs: mockTracks[0].durationMs,
  progressMs: 92000,
  volume: 0.6,
  isReady: true,
  adState: initialAdState,

  setCurrentTrack: (track) =>
    set({
      currentTrack: track,
      durationMs: track?.durationMs ?? 0,
      progressMs: 0,
    }),

  setQueue: (tracks) => {
    const nextTrack = tracks[0] ?? null;
    set({
      currentTrack: nextTrack,
      queue: {
        currentlyPlaying: nextTrack,
        upcomingTracks: tracks.slice(1),
        isLoading: false,
        error: null,
      },
      durationMs: nextTrack?.durationMs ?? 0,
      progressMs: 0,
    });
  },

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  nextTrack: () => {
    const state = get();
    const queue = state.queue.upcomingTracks;

    if (queue.length === 0) {
      return;
    }

    const [next, ...rest] = queue;
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

    if (!current) {
      return;
    }

    const previousTrack = state.queue.currentlyPlaying ?? current;
    set({
      currentTrack: previousTrack,
      durationMs: previousTrack.durationMs,
      progressMs: 0,
      isPlaying: true,
    });
  },

  setVolume: (value) => set({ volume: clamp(value, 0, 1) }),

  seekTo: (value) =>
    set((state) => ({
      progressMs: clamp(value, 0, state.durationMs || 0),
    })),

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

  triggerAdBreak: () =>
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
    })),

  finishAdBreak: () =>
    set((state) => ({
      adState: {
        ...state.adState,
        isAdPlaying: false,
        adProgressMs: 0,
      },
      isPlaying: true,
    })),
}));
