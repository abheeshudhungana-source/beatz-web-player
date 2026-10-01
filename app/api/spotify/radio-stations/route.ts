import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/spotify-auth';
import { mapSpotifyTrackDto, MOCK_TRACKS } from '@/lib/spotify';
import type { SpotifyTrack } from '@/types/spotify';

export const dynamic = 'force-dynamic';

export interface RecommendedPlaylist {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  badge: string;
  tracks: SpotifyTrack[];
}

interface ArtistInfo {
  id: string;
  name: string;
  imageUrl: string;
  genres: string[];
}

interface GenreStationConfig {
  id: string;
  title: string;
  badge: string;
  genreKeywords: string[];
  searchQuery: string;
  curatedFallback: SpotifyTrack[];
}

// ── Strict Genre Catalog Definitions ──────────────────────────────────────────

const GENRE_CATALOG: GenreStationConfig[] = [
  {
    id: 'genre-nepali-rock',
    title: 'Nepali Rock Radio',
    badge: 'NEPALI ROCK',
    genreKeywords: ['nepali rock', 'nepali indie', 'nepali metal', 'nepali pop rock'],
    searchQuery: 'nepali rock',
    curatedFallback: [],
  },
  {
    id: 'genre-rock',
    title: 'Rock & Alternative Radio',
    badge: 'ROCK RADIO',
    genreKeywords: ['rock', 'alternative rock', 'grunge', 'metal', 'punk', 'hard rock', 'modern rock', 'indie rock'],
    searchQuery: 'rock hits classics',
    curatedFallback: [MOCK_TRACKS[2]], // M83 / Alternative
  },
  {
    id: 'genre-pop',
    title: 'Pop Hits Radio',
    badge: 'POP RADIO',
    genreKeywords: ['pop', 'dance pop', 'electropop', 'synthpop', 'teen pop', 'post-teen pop', 'desi pop'],
    searchQuery: 'top pop hits',
    curatedFallback: [MOCK_TRACKS[1], MOCK_TRACKS[3], MOCK_TRACKS[4]], // The Weeknd, The Kid LAROI, Ed Sheeran
  },
  {
    id: 'genre-indie',
    title: 'Indie & Alt Radio',
    badge: 'INDIE RADIO',
    genreKeywords: ['indie', 'indie pop', 'indie folk', 'bedroom pop', 'lo-fi', 'alt z', 'shoegaze'],
    searchQuery: 'indie rock essentials',
    curatedFallback: [MOCK_TRACKS[2], MOCK_TRACKS[3]],
  },
  {
    id: 'genre-acoustic',
    title: 'Acoustic & Chill Radio',
    badge: 'ACOUSTIC RADIO',
    genreKeywords: ['acoustic', 'folk', 'singer-songwriter', 'unplugged', 'chill', 'ambient', 'nepali folk'],
    searchQuery: 'acoustic chill pop hits',
    curatedFallback: [MOCK_TRACKS[4], MOCK_TRACKS[2]], // Ed Sheeran / Chill
  },
  {
    id: 'genre-hiphop',
    title: 'Hip-Hop & R&B Radio',
    badge: 'HIP-HOP RADIO',
    genreKeywords: ['hip hop', 'rap', 'trap', 'r&b', 'urban contemporary', 'desi hip hop'],
    searchQuery: 'hip hop hits',
    curatedFallback: [MOCK_TRACKS[3], MOCK_TRACKS[1]],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickCover(tracks: SpotifyTrack[], fallbackUrl = ''): string {
  for (const t of tracks) {
    const url = t.album?.images?.[0]?.url;
    if (url) return url;
  }
  return fallbackUrl;
}

function artistMatchesGenre(artist: ArtistInfo, config: GenreStationConfig): boolean {
  const genres = (artist.genres || []).map((g) => g.toLowerCase());
  return genres.some((g) => config.genreKeywords.some((kw) => g.includes(kw)));
}

async function fetchTopArtists(
  accessToken: string,
  limit = 50
): Promise<ArtistInfo[]> {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=${limit}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      imageUrl: a.images?.[0]?.url || a.images?.[1]?.url || '',
      genres: a.genres || [],
    }));
  } catch {
    return [];
  }
}

async function fetchTopTracks(
  accessToken: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit = 50
): Promise<SpotifyTrack[]> {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map(mapSpotifyTrackDto);
  } catch {
    return [];
  }
}

async function fetchArtistTopTracks(
  accessToken: string,
  artistId: string
): Promise<SpotifyTrack[]> {
  try {
    let res = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=from_token`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) {
      res = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    }
    if (!res.ok) return [];
    const data = await res.json();
    return (data.tracks || []).map(mapSpotifyTrackDto);
  } catch {
    return [];
  }
}

/**
 * Searches Spotify for verified tracks matching the genre query.
 */
async function searchSpotifyGenreTracks(
  accessToken: string,
  query: string,
  limit = 25
): Promise<SpotifyTrack[]> {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const raw = (data.tracks?.items || []).filter((t: any) => t && t.id);
    return raw.map(mapSpotifyTrackDto);
  } catch {
    return [];
  }
}

/**
 * Builds a strictly genre-classified radio station:
 * - Only includes user's artists who strictly match this genre.
 * - Imports authentic Spotify genre search tracks.
 * - NEVER cross-contaminates with unrelated top hits.
 */
async function buildAccurateGenreStation(
  accessToken: string,
  config: GenreStationConfig,
  matchingArtists: ArtistInfo[]
): Promise<RecommendedPlaylist> {
  // 1. Fetch tracks for user's verified artists in this genre
  let userArtistTracks: SpotifyTrack[] = [];
  if (matchingArtists.length > 0) {
    const topArtists = matchingArtists.slice(0, 3);
    const batches = await Promise.all(
      topArtists.map((a) => fetchArtistTopTracks(accessToken, a.id))
    );
    userArtistTracks = batches.flatMap((b) => b.slice(0, 4));
  }

  // 2. Fetch authentic Spotify genre tracks for this station
  const spotifyGenreTracks = await searchSpotifyGenreTracks(
    accessToken,
    config.searchQuery,
    25
  );

  // 3. Interleave user's verified artists in this genre with Spotify genre tracks
  const combinedTracks: SpotifyTrack[] = [];
  const seen = new Set<string>();

  const maxLen = Math.max(userArtistTracks.length, spotifyGenreTracks.length);
  for (let i = 0; i < maxLen && combinedTracks.length < 25; i++) {
    if (i < userArtistTracks.length) {
      const t = userArtistTracks[i];
      if (!seen.has(t.id)) {
        seen.add(t.id);
        combinedTracks.push(t);
      }
    }
    if (i < spotifyGenreTracks.length && combinedTracks.length < 25) {
      const t = spotifyGenreTracks[i];
      if (!seen.has(t.id)) {
        seen.add(t.id);
        combinedTracks.push(t);
      }
    }
  }

  // 4. Use curated fallback if network searches were empty (never general top hits)
  if (combinedTracks.length === 0 && config.curatedFallback.length > 0) {
    combinedTracks.push(...config.curatedFallback);
  }

  const coverUrl = matchingArtists[0]?.imageUrl || pickCover(combinedTracks);

  const featuredNames = Array.from(
    new Set(combinedTracks.flatMap((t) => t.artists.map((a) => a.name)))
  ).slice(0, 3);

  const description = featuredNames.length > 0
    ? `Authentic ${config.title} • Featuring ${featuredNames.join(', ')} and more`
    : `Pure ${config.title} station`;

  return {
    id: config.id,
    title: config.title,
    description,
    imageUrl: coverUrl,
    badge: config.badge,
    tracks: combinedTracks,
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const accessToken = await getValidAccessToken();

    if (!accessToken) {
      const mock = buildMockPlaylists();
      return NextResponse.json({ playlists: mock, stations: mock });
    }

    // ── 1. Fetch user listening profile in parallel ──────────────────────────
    const [topArtists, topTracks] = await Promise.all([
      fetchTopArtists(accessToken, 50),
      fetchTopTracks(accessToken, 'medium_term', 50),
    ]);

    if (topArtists.length === 0 && topTracks.length === 0) {
      const mock = buildMockPlaylists();
      return NextResponse.json({ playlists: mock, stations: mock });
    }

    const playlists: RecommendedPlaylist[] = [];

    // ── Option 1: "Your Top Hits" (Dedicated top hits playlist) ─────────────
    if (topTracks.length > 0) {
      playlists.push({
        id: 'playlist-top-hits',
        title: 'Your Top Hits',
        description: 'Your personal top favorites and most played tracks across all genres',
        imageUrl: pickCover(topTracks),
        badge: 'TOP PICKS',
        tracks: topTracks.slice(0, 25),
      });
    }

    // ── Classify and Select 4 Distinct Genres Based on User Listening ────────
    // Score each genre by how many of user's top artists match it
    const scoredGenres = GENRE_CATALOG.map((config) => {
      const matchingArtists = topArtists.filter((a) => artistMatchesGenre(a, config));
      return {
        config,
        matchingArtists,
        score: matchingArtists.length,
      };
    });

    // Sort by matching artist count (genres user actually listens to rank highest)
    scoredGenres.sort((a, b) => b.score - a.score);

    // Pick top 4 genre configs
    const top4GenreConfigs = scoredGenres.slice(0, 4);

    // Build each genre station strictly adhering to its genre
    const genreStationPromises = top4GenreConfigs.map(({ config, matchingArtists }) =>
      buildAccurateGenreStation(accessToken, config, matchingArtists)
    );

    const genreStations = await Promise.all(genreStationPromises);
    playlists.push(...genreStations);

    const finalPlaylists = playlists.length > 0 ? playlists : buildMockPlaylists();

    return NextResponse.json({
      playlists: finalPlaylists,
      stations: finalPlaylists,
    });
  } catch (error) {
    console.error('[radio-stations] Error classifying genre stations:', error);
    const mock = buildMockPlaylists();
    return NextResponse.json({ playlists: mock, stations: mock });
  }
}

// ── Clean Curated Mock Fallbacks ──────────────────────────────────────────────
function buildMockPlaylists(): RecommendedPlaylist[] {
  return [
    {
      id: 'mock-top-hits',
      title: 'Your Top Hits',
      description: 'Your personal top favorites and most played tracks',
      imageUrl: MOCK_TRACKS[1]?.album?.images?.[0]?.url || '',
      badge: 'TOP PICKS',
      tracks: [MOCK_TRACKS[1], MOCK_TRACKS[2], MOCK_TRACKS[3], MOCK_TRACKS[4]],
    },
    {
      id: 'mock-genre-rock',
      title: 'Rock & Alternative Radio',
      description: 'Authentic Rock Radio • With M83 and iconic alternative tracks',
      imageUrl: MOCK_TRACKS[2]?.album?.images?.[0]?.url || '',
      badge: 'ROCK RADIO',
      tracks: [MOCK_TRACKS[2], MOCK_TRACKS[1]],
    },
    {
      id: 'mock-genre-pop',
      title: 'Pop Hits Radio',
      description: 'Pure Pop Hits • Featuring The Weeknd, The Kid LAROI and more',
      imageUrl: MOCK_TRACKS[1]?.album?.images?.[0]?.url || '',
      badge: 'POP RADIO',
      tracks: [MOCK_TRACKS[1], MOCK_TRACKS[3], MOCK_TRACKS[4]],
    },
    {
      id: 'mock-genre-indie',
      title: 'Indie & Alt Radio',
      description: 'Pure Indie sounds • Featuring M83, The Kid LAROI and more',
      imageUrl: MOCK_TRACKS[3]?.album?.images?.[0]?.url || '',
      badge: 'INDIE RADIO',
      tracks: [MOCK_TRACKS[2], MOCK_TRACKS[3]],
    },
    {
      id: 'mock-genre-acoustic',
      title: 'Acoustic & Chill Radio',
      description: 'Acoustic & Relaxed Radio • Featuring Ed Sheeran and more',
      imageUrl: MOCK_TRACKS[4]?.album?.images?.[0]?.url || '',
      badge: 'ACOUSTIC RADIO',
      tracks: [MOCK_TRACKS[4], MOCK_TRACKS[2]],
    },
  ];
}
