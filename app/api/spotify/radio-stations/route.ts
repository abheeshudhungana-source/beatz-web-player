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
 * Imports Spotify's official or curated genre radio station.
 * 1. Searches Spotify for official `${genreName} Radio` playlist.
 * 2. Fetches playlist tracks directly from Spotify.
 * 3. Falls back to track search with genre filter.
 */
async function importSpotifyGenreRadio(
  accessToken: string,
  genreName: string,
  userArtistsInGenre: ArtistInfo[],
  limit = 30
): Promise<{ tracks: SpotifyTrack[]; coverUrl: string; description: string }> {
  const formattedGenre = formatGenreTitle(genreName);
  let importedTracks: SpotifyTrack[] = [];
  let coverUrl = '';
  let description = '';

  // 1. Search for official Spotify Radio playlist for this genre
  try {
    const query = `${formattedGenre} Radio`;
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=5`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (searchRes.ok) {
      const data = await searchRes.json();
      const playlists = data.playlists?.items || [];
      // Pick best match playlist (preferably with tracks)
      const best = playlists.find((p: any) => p && p.id && (p.tracks?.total ?? 0) >= 5) || playlists[0];

      if (best && best.id) {
        coverUrl = best.images?.[0]?.url || '';
        description = best.description || `Spotify's official ${formattedGenre} Radio station`;

        // Fetch the tracks from this radio station playlist
        const plRes = await fetch(
          `https://api.spotify.com/v1/playlists/${best.id}/tracks?limit=${limit}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (plRes.ok) {
          const plData = await plRes.json();
          const raw = (plData.items || [])
            .map((item: any) => item.track)
            .filter((t: any) => t && t.id);

          if (raw.length >= 5) {
            importedTracks = raw.map(mapSpotifyTrackDto);
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[radio-stations] Spotify playlist import error for ${genreName}:`, err);
  }

  // 2. Fallback: Search tracks directly by genre on Spotify
  if (importedTracks.length < 5) {
    try {
      const trackSearchRes = await fetch(
        `https://api.spotify.com/v1/search?q=genre:%22${encodeURIComponent(genreName)}%22&type=track&limit=${limit}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (trackSearchRes.ok) {
        const data = await trackSearchRes.json();
        const raw = (data.tracks?.items || []).filter((t: any) => t && t.id);
        if (raw.length > 0) {
          importedTracks = raw.map(mapSpotifyTrackDto);
        }
      }
    } catch (err) {
      console.warn(`[radio-stations] Spotify track search error for ${genreName}:`, err);
    }
  }

  // 3. Fallback: General keyword track search
  if (importedTracks.length < 5) {
    try {
      const generalSearchRes = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(genreName + ' hits')}&type=track&limit=${limit}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (generalSearchRes.ok) {
        const data = await generalSearchRes.json();
        const raw = (data.tracks?.items || []).filter((t: any) => t && t.id);
        if (raw.length > 0) {
          importedTracks = raw.map(mapSpotifyTrackDto);
        }
      }
    } catch {}
  }

  // 4. Also fetch user's top tracks by their own artists in this genre
  // to personalize the radio station with their favorites
  let userGenreTracks: SpotifyTrack[] = [];
  if (userArtistsInGenre.length > 0) {
    const top2Artists = userArtistsInGenre.slice(0, 2);
    const artistTrackBatches = await Promise.all(
      top2Artists.map((a) => fetchArtistTopTracks(accessToken, a.id))
    );
    userGenreTracks = artistTrackBatches.flatMap((b) => b.slice(0, 3));
  }

  // 5. Interleave user's favorites with Spotify's radio station tracks
  const finalTracks: SpotifyTrack[] = [];
  const seen = new Set<string>();

  // Add 1 user favorite, then 2 radio tracks, then 1 user favorite, etc.
  const userIdx = 0;
  const radioIdx = 0;
  const allCandidates = [...userGenreTracks, ...importedTracks];

  for (const track of allCandidates) {
    if (!seen.has(track.id)) {
      seen.add(track.id);
      finalTracks.push(track);
      if (finalTracks.length >= limit) break;
    }
  }

  if (!coverUrl && finalTracks.length > 0) {
    coverUrl = userArtistsInGenre[0]?.imageUrl || pickCover(finalTracks);
  }

  // Clean description with top artist names
  const artistNames = Array.from(
    new Set(finalTracks.flatMap((t) => t.artists.map((a) => a.name)))
  ).slice(0, 3);

  const finalDescription = artistNames.length > 0
    ? `Spotify ${formattedGenre} Radio • With ${artistNames.join(', ')} and more`
    : `Imported Spotify ${formattedGenre} Radio station`;

  return {
    tracks: finalTracks,
    coverUrl,
    description: finalDescription,
  };
}

/**
 * Extracts 4 distinct genres from the user's top artists.
 */
function extract4DistinctGenres(allArtists: ArtistInfo[]): Array<{ genre: string; artists: ArtistInfo[] }> {
  // Tally frequency of every genre
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

  // Sort by popularity in user's profile
  const sorted = Array.from(genreTally.entries())
    .sort((a, b) => b[1].count - a[1].count);

  const selected: Array<{ genre: string; artists: ArtistInfo[] }> = [];

  for (const [genre, data] of sorted) {
    if (selected.length >= 4) break;

    // Check distinctiveness: avoid almost identical strings (e.g. 'nepali pop' vs 'nepali pop rock')
    const words = genre.split(/\s+/);
    const isTooSimilar = selected.some((s) => {
      const sWords = s.genre.split(/\s+/);
      const sharedWords = words.filter((w) => w.length > 2 && sWords.includes(w));
      return sharedWords.length >= Math.min(words.length, sWords.length);
    });

    if (!isTooSimilar || selected.length + (sorted.length - sorted.indexOf([genre, data] as any)) <= 4) {
      selected.push({ genre, artists: data.artists });
    }
  }

  // If user has fewer than 4 genres, fill with remaining unique ones or sensible defaults
  const defaults = ['rock', 'pop', 'indie', 'acoustic'];
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
      const radioData = await importSpotifyGenreRadio(accessToken, genre, artists, 30);

      // If imported tracks exist, build genre radio card
      if (radioData.tracks.length > 0) {
        return {
          id: `genre-radio-${genre.replace(/\s+/g, '-')}`,
          title: `${formatted} Radio`,
          description: radioData.description,
          imageUrl: radioData.coverUrl || pickCover(radioData.tracks),
          badge: 'GENRE RADIO',
          tracks: radioData.tracks,
        };
      }
      return null;
    });

    const genreStations = (await Promise.all(genreRadioPromises)).filter(
      (s): s is RecommendedPlaylist => s !== null
    );

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
