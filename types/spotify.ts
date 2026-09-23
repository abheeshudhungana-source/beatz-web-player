export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  uri: string;
  images: SpotifyImage[];
}

export interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  durationMs: number;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  previewUrl?: string | null;
}

export interface SpotifyUserProfile {
  id: string;
  displayName: string;
  email: string;
  product: 'premium' | 'free' | 'open';
  images: SpotifyImage[];
}

export interface PlayerPlaybackState {
  deviceId: string | null;
  isReady: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  currentTrack: SpotifyTrack | null;
  progressMs: number;
  durationMs: number;
  volume: number; // 0.0 to 1.0
  shuffle: boolean;
  repeatMode: 0 | 1 | 2; // 0 = off, 1 = context, 2 = track
}

export interface QueueState {
  currentlyPlaying: SpotifyTrack | null;
  upcomingTracks: SpotifyTrack[];
  isLoading: boolean;
  error: string | null;
}

export interface AdBreakState {
  isAdPlaying: boolean;
  adDurationMs: number;
  adProgressMs: number;
  adIndex: number;
  totalAdsInBreak: number;
}

export interface AuthSession {
  isAuthenticated: boolean;
  accessToken: string | null;
  expiresAt: number | null;
  user: SpotifyUserProfile | null;
}
