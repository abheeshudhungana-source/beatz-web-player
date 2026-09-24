import { SpotifyTrack, QueueState, PlayerPlaybackState } from '@/types/spotify';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// Strict regex pattern for Spotify Track URIs to prevent injection
export const SPOTIFY_TRACK_URI_REGEX = /^spotify:track:[a-zA-Z0-9]{22}$/;

// ============================================================================
// MOCK DATA FALLBACKS (Enables testing for Free accounts & offline prototyping)
// ============================================================================

export const MOCK_TRACKS: SpotifyTrack[] = [
  {
    id: '4cOdK2wGLETKBW3PvgPWqT',
    uri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT',
    name: 'Never Gonna Give You Up',
    durationMs: 213573,
    artists: [{ id: '0gxyHStUvyUt4ReWW1hDOv', name: 'Rick Astley', uri: 'spotify:artist:0gxyHStUvyUt4ReWW1hDOv' }],
    album: {
      id: '50ZZv3e6n9R086eJ6N05Yn',
      name: 'Whenever You Need Somebody',
      uri: 'spotify:album:50ZZv3e6n9R086eJ6N05Yn',
      images: [
        { url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop', height: 300, width: 300 },
      ],
    },
    previewUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
  },
  {
    id: '0VjIjW4GlUZAMYd2vXMi3b',
    uri: 'spotify:track:0VjIjW4GlUZAMYd2vXMi3b',
    name: 'Blinding Lights',
    durationMs: 200040,
    artists: [{ id: '1Xyo4u8uXC1ZmMpatF05PJ', name: 'The Weeknd', uri: 'spotify:artist:1Xyo4u8uXC1ZmMpatF05PJ' }],
    album: {
      id: '4yP0hdKOJ9vRAx08ag48yb',
      name: 'After Hours',
      uri: 'spotify:album:4yP0hdKOJ9vRAx08ag48yb',
      images: [
        { url: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&h=300&fit=crop', height: 300, width: 300 },
      ],
    },
    previewUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=electronic-future-beats-117997.mp3',
  },
  {
    id: '3n3Ppam7vgaVa1iaRUc9Lp',
    uri: 'spotify:track:3n3Ppam7vgaVa1iaRUc9Lp',
    name: 'Midnight City',
    durationMs: 243264,
    artists: [{ id: '63YrHGBh2vTdl5alGiHRBi', name: 'M83', uri: 'spotify:artist:63YrHGBh2vTdl5alGiHRBi' }],
    album: {
      id: '6AamvwB832uPz9e8u6G4aQ',
      name: 'Hurry Up, We\'re Dreaming',
      uri: 'spotify:album:6AamvwB832uPz9e8u6G4aQ',
      images: [
        { url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&h=300&fit=crop', height: 300, width: 300 },
      ],
    },
    previewUrl: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77cb7.mp3?filename=synthwave-80s-110045.mp3',
  },
  {
    id: '1rqqCSm0Q5VIviLAapigu0',
    uri: 'spotify:track:1rqqCSm0Q5VIviLAapigu0',
    name: 'Stay',
    durationMs: 141805,
    artists: [
      { id: '2tIP7wuaVjypo8uaKKu0e3', name: 'The Kid LAROI', uri: 'spotify:artist:2tIP7wuaVjypo8uaKKu0e3' },
      { id: '1uNFoZAHBGtllmzznpCI3s', name: 'Justin Bieber', uri: 'spotify:artist:1uNFoZAHBGtllmzznpCI3s' },
    ],
    album: {
      id: '4qZNW3VpD95zS9eM5Vv1t9',
      name: 'F*CK LOVE 3+: OVER YOU',
      uri: 'spotify:album:4qZNW3VpD95zS9eM5Vv1t9',
      images: [
        { url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop', height: 300, width: 300 },
      ],
    },
    previewUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=chill-abstract-intention-12099.mp3',
  },
  {
    id: '7qiZfU4dY1lWllzX7mPBI3',
    uri: 'spotify:track:7qiZfU4dY1lWllzX7mPBI3',
    name: 'Shape of You',
    durationMs: 233712,
    artists: [{ id: '6eUKZXaKkcviH0Ku9w2n3V', name: 'Ed Sheeran', uri: 'spotify:artist:6eUKZXaKkcviH0Ku9w2n3V' }],
    album: {
      id: '3T4tUhGYe2VJn7LJb0v977',
      name: '÷ (Divide)',
      uri: 'spotify:album:3T4tUhGYe2VJn7LJb0v977',
      images: [
        { url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop', height: 300, width: 300 },
      ],
    },
    previewUrl: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_bb630cc098.mp3?filename=groove-ambient-112192.mp3',
  },
];

export const MOCK_QUEUE_STATE: QueueState = {
  currentlyPlaying: MOCK_TRACKS[0],
  upcomingTracks: MOCK_TRACKS.slice(1),
  isLoading: false,
  error: null,
};

// ============================================================================
// RESILIENT SPOTIFY FETCH WRAPPER WITH EXPONENTIAL BACKOFF (HTTP 429 DEFENSE)
// ============================================================================

interface FetchOptions extends RequestInit {
  maxRetries?: number;
  baseBackoffMs?: number;
}

export async function spotifyFetch<T>(
  endpoint: string,
  options: FetchOptions = {},
  accessToken?: string | null
): Promise<{ data: T | null; status: number; error: string | null }> {
  if (!accessToken) {
    return { data: null, status: 401, error: 'unauthorized_missing_token' };
  }

  const { maxRetries = 2, baseBackoffMs = 500, ...fetchConfig } = options;
  const url = endpoint.startsWith('http') ? endpoint : `${SPOTIFY_API_BASE}${endpoint}`;

  const headers = new Headers(fetchConfig.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (!headers.has('Content-Type') && fetchConfig.body) {
    headers.set('Content-Type', 'application/json');
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...fetchConfig,
        headers,
      });

      // Handle HTTP 429 (Rate-limited) with exponential backoff & jitter
      if (response.status === 429) {
        if (attempt === maxRetries) {
          return { data: null, status: 429, error: 'rate_limit_exceeded' };
        }

        const retryAfterHeader = response.headers.get('Retry-After');
        const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 1;
        const jitterMs = Math.floor(Math.random() * 200);
        const waitMs = (retryAfterSeconds * 1000) + jitterMs;

        console.warn(`[Spotify 429] Rate limited on ${endpoint}. Retrying in ${waitMs}ms (Attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      // 204 No Content (normal for playback commands like transfer or play/pause)
      if (response.status === 204) {
        return { data: null, status: 204, error: null };
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown upstream error');
        return { data: null, status: response.status, error: errorText };
      }

      const json = await response.json();
      return { data: json as T, status: response.status, error: null };
    } catch (err: unknown) {
      if (attempt === maxRetries) {
        const errorMsg = err instanceof Error ? err.message : 'Network fetch failure';
        return { data: null, status: 500, error: errorMsg };
      }
      const backoff = baseBackoffMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  return { data: null, status: 500, error: 'maximum_retries_exceeded' };
}

// ============================================================================
// DATA NORMALIZER (Maps Spotify Raw DTO to Clean Beatz Track Contract)
// ============================================================================

export function mapSpotifyTrackDto(rawTrack: any): SpotifyTrack {
  return {
    id: rawTrack.id,
    uri: rawTrack.uri,
    name: rawTrack.name,
    durationMs: rawTrack.duration_ms || 0,
    artists: (rawTrack.artists || []).map((artist: any) => ({
      id: artist.id,
      name: artist.name,
      uri: artist.uri,
    })),
    album: {
      id: rawTrack.album?.id || '',
      name: rawTrack.album?.name || '',
      uri: rawTrack.album?.uri || '',
      images: rawTrack.album?.images || [],
    },
    previewUrl: rawTrack.preview_url || null,
  };
}

// ============================================================================
// PUBLIC CLIENT WRAPPERS
// ============================================================================

/**
 * Searches the Spotify track catalog with input clamping and sanitization
 */
export async function searchTracks(
  query: string,
  accessToken: string | null,
  limit: number = 10
): Promise<SpotifyTrack[]> {
  // Input sanitization & security bounds
  const sanitizedQuery = (query || '').trim().slice(0, 100);
  const clampedLimit = Math.max(1, Math.min(20, limit));

  if (!sanitizedQuery) {
    return [];
  }

  // If no access token (e.g. offline or unauthenticated UI test), filter mock tracks
  if (!accessToken) {
    const qLower = sanitizedQuery.toLowerCase();
    const filtered = MOCK_TRACKS.filter(
      (t) =>
        t.name.toLowerCase().includes(qLower) ||
        t.artists.some((a) => a.name.toLowerCase().includes(qLower))
    );
    return filtered.length > 0 ? filtered : MOCK_TRACKS;
  }

  const endpoint = `/search?q=${encodeURIComponent(sanitizedQuery)}&type=track&limit=${clampedLimit}`;
  const res = await spotifyFetch<{ tracks: { items: any[] } }>(endpoint, {}, accessToken);

  if (res.data && res.data.tracks && Array.isArray(res.data.tracks.items)) {
    return res.data.tracks.items.map(mapSpotifyTrackDto);
  }

  // Fallback to mock search results if rate-limited or error occurs
  console.warn(`[searchTracks] Falling back to mock catalog for query: "${sanitizedQuery}"`);
  return MOCK_TRACKS;
}

/**
 * Retrieves the current playback queue from Spotify
 */
export async function getQueue(accessToken: string | null): Promise<QueueState> {
  if (!accessToken) {
    return MOCK_QUEUE_STATE;
  }

  const res = await spotifyFetch<{ currently_playing: any; queue: any[] }>(
    '/me/player/queue',
    {},
    accessToken
  );

  if (res.data) {
    return {
      currentlyPlaying: res.data.currently_playing ? mapSpotifyTrackDto(res.data.currently_playing) : null,
      upcomingTracks: (res.data.queue || []).map(mapSpotifyTrackDto),
      isLoading: false,
      error: null,
    };
  }

  // If Spotify returns 404/204 or user has no active playing device, return mock queue
  return MOCK_QUEUE_STATE;
}

/**
 * Adds a track to the active user's Spotify queue with strict URI validation
 */
export async function addToQueue(
  trackUri: string,
  accessToken: string | null
): Promise<{ success: boolean; message: string }> {
  // Security validation: ensure valid Spotify Track URI format
  if (!SPOTIFY_TRACK_URI_REGEX.test(trackUri)) {
    return {
      success: false,
      message: 'Invalid Spotify track URI format. Must match spotify:track:[22 characters]',
    };
  }

  if (!accessToken) {
    // In mock mode, allow simulating successful queue addition
    return { success: true, message: 'Track added to mock queue successfully.' };
  }

  const endpoint = `/me/player/queue?uri=${encodeURIComponent(trackUri)}`;
  const res = await spotifyFetch<void>(endpoint, { method: 'POST' }, accessToken);

  if (res.status === 204 || res.status === 200) {
    return { success: true, message: 'Track added to queue successfully.' };
  }

  return {
    success: false,
    message: res.error || `Failed to add track to queue (Status ${res.status})`,
  };
}

/**
 * Gets active playback state from Spotify (player, current track, progress)
 */
export async function getPlaybackState(accessToken: string | null): Promise<PlayerPlaybackState | null> {
  if (!accessToken) {
    return {
      deviceId: 'mock-device-id',
      isReady: true,
      isPlaying: false,
      isPaused: true,
      currentTrack: MOCK_TRACKS[0],
      progressMs: 30000,
      durationMs: MOCK_TRACKS[0].durationMs,
      volume: 0.8,
      shuffle: false,
      repeatMode: 0,
    };
  }

  const res = await spotifyFetch<any>('/me/player', {}, accessToken);

  if (res.data && res.data.item) {
    return {
      deviceId: res.data.device?.id || null,
      isReady: true,
      isPlaying: !!res.data.is_playing,
      isPaused: !res.data.is_playing,
      currentTrack: mapSpotifyTrackDto(res.data.item),
      progressMs: res.data.progress_ms || 0,
      durationMs: res.data.item.duration_ms || 0,
      volume: typeof res.data.device?.volume_percent === 'number' ? res.data.device.volume_percent / 100 : 0.8,
      shuffle: !!res.data.shuffle_state,
      repeatMode: res.data.repeat_state === 'track' ? 2 : res.data.repeat_state === 'context' ? 1 : 0,
    };
  }

  return null;
}
