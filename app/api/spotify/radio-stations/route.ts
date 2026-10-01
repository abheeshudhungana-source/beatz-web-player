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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatGenreTitle(rawGenre: string): string {
  if (!rawGenre) return 'Music';
  return rawGenre
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function pickCover(tracks: SpotifyTrack[], fallbackUrl = ''): string {
  for (const t of tracks) {
    const url = t.album?.images?.[0]?.url;
    if (url) return url;
  }
  return fallbackUrl;
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
 * Imports Spotify's official or curated genre radio station tracks.
 * Combines direct Spotify track search for the genre with user's favorite artists in that genre.
 * Guaranteed to never return empty tracks.
 */
async function importSpotifyGenreRadio(
  accessToken: string,
  genreName: string,
  userArtistsInGenre: ArtistInfo[],
  fallbackPool: SpotifyTrack[],
  limit = 30
): Promise<{ tracks: SpotifyTrack[]; coverUrl: string; description: string }> {
  const formattedGenre = formatGenreTitle(genreName);
  let radioTracks: SpotifyTrack[] = [];
  let coverUrl = '';

  // 1. Direct Spotify track search for this genre (e.g. "nepali rock" or "pop" or "indie")
  try {
    const cleanQuery = genreName.replace(/["']/g, '').trim();
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(cleanQuery)}&type=track&limit=${limit}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (res.ok) {
      const data = await res.json();
      const raw = (data.tracks?.items || []).filter((t: any) => t && t.id);
      if (raw.length > 0) {
        radioTracks = raw.map(mapSpotifyTrackDto);
      }
    }
  } catch (err) {
    console.warn(`[radio-stations] track search error for ${genreName}:`, err);
  }

  // 2. Fetch top tracks from the user's favorite artists in this genre
  let userArtistTracks: SpotifyTrack[] = [];
  if (userArtistsInGenre.length > 0) {
    const targetArtists = userArtistsInGenre.slice(0, 3);
    const trackBatches = await Promise.all(
      targetArtists.map((a) => fetchArtistTopTracks(accessToken, a.id))
    );
    userArtistTracks = trackBatches.flatMap((b) => b.slice(0, 4));
    coverUrl = targetArtists[0]?.imageUrl || '';
  }

  // 3. Try playlist search if we still need more tracks or artwork
  if (radioTracks.length < 10) {
    try {
      const plSearchRes = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(formattedGenre + ' Radio')}&type=playlist&limit=3`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (plSearchRes.ok) {
        const plData = await plSearchRes.json();
        const firstPl = plData.playlists?.items?.[0];
        if (firstPl?.id) {
          if (!coverUrl) coverUrl = firstPl.images?.[0]?.url || '';
          const trRes = await fetch(
            `https://api.spotify.com/v1/playlists/${firstPl.id}/tracks?limit=20`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (trRes.ok) {
            const trData = await trRes.json();
            const items = (trData.items || []).map((i: any) => i.track).filter((t: any) => t && t.id);
            if (items.length > 0) {
              radioTracks.push(...items.map(mapSpotifyTrackDto));
            }
          }
        }
      }
    } catch {}
  }

  // 4. Combine user's favorite artist tracks + radio tracks (interleave)
  const combined: SpotifyTrack[] = [];
  const seen = new Set<string>();

  const maxLen = Math.max(userArtistTracks.length, radioTracks.length);
  for (let i = 0; i < maxLen && combined.length < limit; i++) {
    if (i < userArtistTracks.length) {
      const t = userArtistTracks[i];
      if (!seen.has(t.id)) {
        seen.add(t.id);
        combined.push(t);
      }
    }
    if (i < radioTracks.length && combined.length < limit) {
      const t = radioTracks[i];
      if (!seen.has(t.id)) {
        seen.add(t.id);
        combined.push(t);
      }
    }
  }

  // 5. Solid safety guarantee: if combined is still empty, supplement from fallbackPool
  if (combined.length < 5 && fallbackPool.length > 0) {
    for (const t of fallbackPool) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        combined.push(t);
        if (combined.length >= 10) break;
      }
    }
  }

  if (!coverUrl && combined.length > 0) {
    coverUrl = pickCover(combined);
  }

  const featuredArtists = Array.from(
    new Set(combined.flatMap((t) => t.artists.map((a) => a.name)))
  ).slice(0, 3);

  const description = featuredArtists.length > 0
    ? `Spotify ${formattedGenre} Radio • With ${featuredArtists.join(', ')} and more`
    : `Imported Spotify ${formattedGenre} Radio station`;

  return {
    tracks: combined,
    coverUrl,
    description,
  };
}

/**
 * Extracts 4 distinct genres from the user's top artists.
 */
function extract4DistinctGenres(allArtists: ArtistInfo[]): Array<{ genre: string; artists: ArtistInfo[] }> {
  const genreTally = new Map<string, { count: number; artists: ArtistInfo[] }>();

  for (const artist of allArtists) {
    for (const raw of artist.genres || []) {
      const g = raw.trim().toLowerCase();
      if (!g) continue;
      if (!genreTally.has(g)) {
        genreTally.set(g, { count: 0, artists: [] });
      }
      const entry = genreTally.get(g)!;
      entry.count += 1;
      if (!entry.artists.some((a) => a.id === artist.id)) {
        entry.artists.push(artist);
      }
    }
  }

  const sorted = Array.from(genreTally.entries()).sort((a, b) => b[1].count - a[1].count);
  const selected: Array<{ genre: string; artists: ArtistInfo[] }> = [];

  for (const [genre, data] of sorted) {
    if (selected.length >= 4) break;

    // Check if this genre is too similar to an already selected genre
    const words = genre.split(/\s+/);
    const isTooSimilar = selected.some((s) => {
      const sWords = s.genre.split(/\s+/);
      const sharedWords = words.filter((w) => w.length > 2 && sWords.includes(w));
      return sharedWords.length >= Math.min(words.length, sWords.length);
    });

    if (!isTooSimilar) {
      selected.push({ genre, artists: data.artists });
    }
  }

  // If still fewer than 4 distinct genres, pull distinct ones from defaults or general terms
  const defaults = ['rock', 'pop', 'indie', 'acoustic', 'hip hop', 'r&b'];
  for (const d of defaults) {
    if (selected.length >= 4) break;
    if (!selected.some((s) => s.genre.includes(d))) {
      selected.push({
        genre: d,
        artists: allArtists.filter((a) => a.genres?.some((g) => g.includes(d))),
      });
    }
  }

  return selected.slice(0, 4);
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

    // ── Option 1: "Your Top Hits" ───────────────────────────────────────────
    if (topTracks.length > 0) {
      playlists.push({
        id: 'playlist-top-hits',
        title: 'Your Top Hits',
        description: 'Your most played tracks and personal favorites',
        imageUrl: pickCover(topTracks),
        badge: 'TOP PICKS',
        tracks: topTracks.slice(0, 25),
      });
    }

    // ── Options 2 to 5: 4 Different Genre Radio Stations ────────────────────
    const top4Genres = extract4DistinctGenres(topArtists);

    const genreRadioPromises = top4Genres.map(async ({ genre, artists }) => {
      const formatted = formatGenreTitle(genre);
      const radioData = await importSpotifyGenreRadio(
        accessToken,
        genre,
        artists,
        topTracks,
        30
      );

      return {
        id: `genre-radio-${genre.replace(/[^a-zA-Z0-9]/g, '-')}`,
        title: `${formatted} Radio`,
        description: radioData.description,
        imageUrl: radioData.coverUrl || pickCover(radioData.tracks) || (topArtists[0]?.imageUrl ?? ''),
        badge: 'GENRE RADIO',
        tracks: radioData.tracks.length > 0 ? radioData.tracks : (topTracks.length > 0 ? topTracks : MOCK_TRACKS),
      };
    });

    const genreStations = await Promise.all(genreRadioPromises);
    playlists.push(...genreStations);

    const finalPlaylists = playlists.length > 0 ? playlists : buildMockPlaylists();

    return NextResponse.json({
      playlists: finalPlaylists,
      stations: finalPlaylists,
    });
  } catch (error) {
    console.error('[radio-stations] Error importing genre radio stations:', error);
    const mock = buildMockPlaylists();
    return NextResponse.json({ playlists: mock, stations: mock });
  }
}

// ── Curated High-Quality Mock Fallbacks ────────────────────────────────────────
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
      title: 'Indie & Rock Radio',
      description: "Spotify's official Indie & Rock Radio • With M83 and more",
      imageUrl: MOCK_TRACKS[2]?.album?.images?.[0]?.url || '',
      badge: 'GENRE RADIO',
      tracks: [MOCK_TRACKS[2], MOCK_TRACKS[1], MOCK_TRACKS[3]],
    },
    {
      id: 'mock-genre-pop',
      title: 'Pop Hits Radio',
      description: "Spotify's official Pop Radio • With The Weeknd, The Kid LAROI and more",
      imageUrl: MOCK_TRACKS[1]?.album?.images?.[0]?.url || '',
      badge: 'GENRE RADIO',
      tracks: [MOCK_TRACKS[1], MOCK_TRACKS[3], MOCK_TRACKS[4]],
    },
    {
      id: 'mock-genre-acoustic',
      title: 'Acoustic & Chill Radio',
      description: "Spotify's official Acoustic Radio • With Ed Sheeran and more",
      imageUrl: MOCK_TRACKS[4]?.album?.images?.[0]?.url || '',
      badge: 'GENRE RADIO',
      tracks: [MOCK_TRACKS[4], MOCK_TRACKS[2], MOCK_TRACKS[3]],
    },
    {
      id: 'mock-genre-hiphop',
      title: 'Modern Hip-Hop Radio',
      description: "Spotify's official Hip-Hop Radio • Top trending streams",
      imageUrl: MOCK_TRACKS[3]?.album?.images?.[0]?.url || '',
      badge: 'GENRE RADIO',
      tracks: [MOCK_TRACKS[3], MOCK_TRACKS[1], MOCK_TRACKS[4]],
    },
  ];
}
