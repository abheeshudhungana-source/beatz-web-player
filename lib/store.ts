import { create } from 'zustand';
import { SpotifyTrack, PlayerPlaybackState, QueueState } from '@/types/spotify';
import { MOCK_TRACKS, MOCK_QUEUE_STATE } from '@/lib/spotify';

interface BeatzStoreState {
  // Player Playback State
  playback: PlayerPlaybackState;
  setPlayback: (partial: Partial<PlayerPlaybackState>) => void;
  togglePlay: () => void;
  seekTo: (progressMs: number) => void;
  setVolume: (volume: number) => void;

  // Queue State
  queue: QueueState;
  setQueue: (queue: QueueState) => void;
  addToQueue: (track: SpotifyTrack) => void;
  removeFromQueue: (trackId: string) => void;

  // Track Play Action (supports 30s preview audio for Spotify Free / mock development)
  playTrack: (track: SpotifyTrack) => void;

  // UI Drawers & Overlays
  isQueueOpen: boolean;
  isChatOpen: boolean;
  toggleQueue: () => void;
  toggleChat: () => void;
  setQueueOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
}

// Global audio element reference for mock / preview clip playback
let previewAudio: HTMLAudioElement | null = null;

export const useBeatzStore = create<BeatzStoreState>((set, get) => ({
  playback: {
    deviceId: null,
    isReady: true,
    isPlaying: false,
    isPaused: true,
    currentTrack: MOCK_TRACKS[0],
    progressMs: 0,
    durationMs: MOCK_TRACKS[0].durationMs,
    volume: 0.8,
    shuffle: false,
    repeatMode: 0,
  },

  setPlayback: (partial) =>
    set((state) => ({
      playback: { ...state.playback, ...partial },
    })),

  togglePlay: () => {
    const { playback } = get();
    const newIsPlaying = !playback.isPlaying;

    if (typeof window !== 'undefined' && playback.currentTrack?.previewUrl) {
      if (!previewAudio) {
        previewAudio = new Audio(playback.currentTrack.previewUrl);
        previewAudio.volume = playback.volume;
      }

      if (newIsPlaying) {
        previewAudio.play().catch((e) => console.warn('Preview audio autoplay blocked:', e));
      } else {
        previewAudio.pause();
      }
    }

    set((state) => ({
      playback: {
        ...state.playback,
        isPlaying: newIsPlaying,
        isPaused: !newIsPlaying,
      },
    }));
  },

  seekTo: (progressMs) => {
    const clampedProgress = Math.max(0, progressMs);
    if (previewAudio) {
      previewAudio.currentTime = clampedProgress / 1000;
    }
    set((state) => ({
      playback: {
        ...state.playback,
        progressMs: clampedProgress,
      },
    }));
  },

  setVolume: (volume) => {
    const clampedVol = Math.max(0, Math.min(1, volume));
    if (previewAudio) {
      previewAudio.volume = clampedVol;
    }
    set((state) => ({
      playback: {
        ...state.playback,
        volume: clampedVol,
      },
    }));
  },

  queue: MOCK_QUEUE_STATE,

  setQueue: (queue) => set({ queue }),

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
        previewAudio.volume = get().playback.volume;
        previewAudio.play().catch((e) => console.warn('Audio play blocked:', e));
      }
    }

    set((state) => ({
      playback: {
        ...state.playback,
        currentTrack: track,
        durationMs: track.durationMs,
        progressMs: 0,
        isPlaying: true,
        isPaused: false,
      },
    }));
  },

  isQueueOpen: false,
  isChatOpen: false,
  toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  setQueueOpen: (open) => set({ isQueueOpen: open }),
  setChatOpen: (open) => set({ isChatOpen: open }),
}));
