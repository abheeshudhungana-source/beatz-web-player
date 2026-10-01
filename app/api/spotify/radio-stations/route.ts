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

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchTopTracks(
  accessToken: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit = 20
): Promise<SpotifyTrack[]> {
  const res = await fetch(
    `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []).map(mapSpotifyTrackDto);
}

async function fetchArtistTopTracks(
  accessToken: string,
  artistId: string,
  market = 'US'
): Promise<SpotifyTrack[]> {
  const res = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.tracks || []).map(mapSpotifyTrackDto);
}

async function fetchRecentlyPlayed(
  accessToken: string,
  limit = 20
): Promise<SpotifyTrack[]> {
  const res = await fetch(
    `https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  // Deduplicate by track id
  const seen = new Set<string>();
  const tracks: SpotifyTrack[] = [];
  for (const item of data.items || []) {
    if (item.track && !seen.has(item.track.id)) {
      seen.add(item.track.id);
      tracks.push(mapSpotifyTrackDto(item.track));
    }
  }
  return tracks;
}

async function fetchTopArtists(
  accessToken: string,
  limit = 10
): Promise<Array<{ id: string; name: string; imageUrl: string }>> {
  const res = await fetch(
    `https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []).map((a: any) => ({
    id: a.id,
    name: a.name,
    imageUrl: a.images?.[0]?.url || '',
  }));
}

function pickCover(tracks: SpotifyTrack[], fallbackUrl = ''): string {
  for (const t of tracks) {
    const url = t.album?.images?.[0]?.url;
    if (url) return url;
  }
  return fallbackUrl;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const accessToken = await getValidAccessToken();

    if (!accessToken) {
      return NextResponse.json({ playlists: buildMockPlaylists() });
    }

    // Fetch all raw data in parallel
    const [topTracksMedium, topTracksShort, recentTracks, topArtists] = await Promise.all([
      fetchTopTracks(accessToken, 'medium_term', 20),
      fetchTopTracks(accessToken, 'short_term', 20),
      fetchRecentlyPlayed(accessToken, 30),
      fetchTopArtists(accessToken, 6),
    ]);

    // If we got nothing at all, return mock
    if (!topTracksMedium.length && !recentTracks.length && !topArtists.length) {
      return NextResponse.json({ playlists: buildMockPlaylists() });
    }

    const playlists: RecommendedPlaylist[] = [];

    // ── Playlist 1: Your Top Hits (medium_term top tracks) ───────────────────
    if (topTracksMedium.length > 0) {
      playlists.push({
        id: 'playlist-top-hits',
        title: 'Your Top Hits',
        description: 'Your most played tracks over the last 6 months',
        imageUrl: pickCover(topTracksMedium),
        badge: 'TOP PICKS',
        tracks: topTracksMedium,
      });
    }

    // ── Playlist 2: On Repeat (short_term — last 4 weeks) ────────────────────
    if (topTracksShort.length > 0) {
      playlists.push({
        id: 'playlist-on-repeat',
        title: 'On Repeat',
        description: "What you've been playing a lot lately",
        imageUrl: pickCover(topTracksShort),
        badge: 'THIS MONTH',
        tracks: topTracksShort,
      });
    }

    // ── Playlist 3: Recently Played ───────────────────────────────────────────
    if (recentTracks.length > 0) {
      playlists.push({
        id: 'playlist-recently-played',
        title: 'Recently Played',
        description: 'Tracks you listened to recently',
        imageUrl: pickCover(recentTracks),
        badge: 'RECENT',
        tracks: recentTracks,
      });
    }

    // ── Playlists 4-6: Top Artist deep dives ──────────────────────────────────
    // Fetch top tracks for top 3 artists in parallel
    const artistTrackResults = await Promise.all(
      topArtists.slice(0, 3).map(async (artist) => ({
        artist,
        tracks: await fetchArtistTopTracks(accessToken, artist.id),
      }))
    );

    for (const { artist, tracks } of artistTrackResults) {
      if (tracks.length === 0) continue;
      playlists.push({
        id: `playlist-artist-${artist.id}`,
        title: `${artist.name} Essentials`,
        description: `Best of ${artist.name}`,
        imageUrl: artist.imageUrl || pickCover(tracks),
        badge: 'ARTIST MIX',
        tracks,
      });
    }

    // ── Playlist 7: Discovery Mix (unique tracks from artists 4-6) ────────────
    const discoveryArtists = topArtists.slice(3, 6);
    if (discoveryArtists.length > 0) {
      const discoveryResults = await Promise.all(
        discoveryArtists.map((a) => fetchArtistTopTracks(accessToken, a.id))
      );
      const discoveryTracks = discoveryResults
        .flat()
        .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i) // dedupe
        .slice(0, 20);

      if (discoveryTracks.length > 0) {
        playlists.push({
          id: 'playlist-discovery-mix',
          title: 'Discovery Mix',
          description: `Fresh picks based on artists you love`,
          imageUrl: discoveryArtists[0]
            ? topArtists.find((a) => a.id === discoveryArtists[0].id)?.imageUrl || pickCover(discoveryTracks)
            : pickCover(discoveryTracks),
          badge: 'FOR YOU',
          tracks: discoveryTracks,
        });
      }
    }

    return NextResponse.json({ playlists });
  } catch (error) {
    console.error('[radio-stations] Error building playlists:', error);
    return NextResponse.json({ playlists: buildMockPlaylists() });
  }
}

// ── Mock fallback ─────────────────────────────────────────────────────────────
function buildMockPlaylists(): RecommendedPlaylist[] {
  return [
    {
      id: 'mock-playlist-1',
      title: 'Your Top Hits',
      description: 'Your most played tracks',
      imageUrl: MOCK_TRACKS[0]?.album?.images?.[0]?.url || '',
      badge: 'TOP PICKS',
      tracks: MOCK_TRACKS.slice(0, 5),
    },
    {
      id: 'mock-playlist-2',
      title: 'On Repeat',
      description: "What you've had on loop",
      imageUrl: MOCK_TRACKS[1]?.album?.images?.[0]?.url || '',
      badge: 'THIS MONTH',
      tracks: MOCK_TRACKS.slice(1, 6),
    },
    {
      id: 'mock-playlist-3',
      title: 'Recently Played',
      description: 'Your recent listening history',
      imageUrl: MOCK_TRACKS[2]?.album?.images?.[0]?.url || '',
      badge: 'RECENT',
      tracks: MOCK_TRACKS.slice(2),
    },
  ];
}
