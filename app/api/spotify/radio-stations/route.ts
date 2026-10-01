import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/spotify-auth';
import { mapSpotifyTrackDto, MOCK_TRACKS } from '@/lib/spotify';
import type { SpotifyTrack } from '@/types/spotify';

export const dynamic = 'force-dynamic';

export interface RadioStation {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  badge: 'RADIO';
  seedArtistId: string | null;
  tracks: SpotifyTrack[];
}

async function fetchRecommendations(
  accessToken: string,
  seedArtistIds: string[],
  seedGenres: string[],
  limit = 20
): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams();
  if (seedArtistIds.length > 0) params.set('seed_artists', seedArtistIds.slice(0, 5).join(','));
  if (seedGenres.length > 0) params.set('seed_genres', seedGenres.slice(0, Math.max(0, 5 - seedArtistIds.length)).join(','));
  params.set('limit', String(limit));

  const res = await fetch(`https://api.spotify.com/v1/recommendations?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    console.warn(`[radio-stations] Recommendations API status ${res.status}`);
    return [];
  }

  const data = await res.json();
  return (data.tracks || []).map(mapSpotifyTrackDto);
}

export async function GET() {
  try {
    const accessToken = await getValidAccessToken();

    if (!accessToken) {
      return NextResponse.json({ stations: buildMockStations() });
    }

    // ── Step 1: Fetch user's top artists (seeding material) ──────────────────
    let topArtists: Array<{
      id: string;
      name: string;
      imageUrl: string;
      genres: string[];
    }> = [];

    const topRes = await fetch(
      'https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=10',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (topRes.ok) {
      const topData = await topRes.json();
      topArtists = (topData.items || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        imageUrl: a.images?.[0]?.url || '',
        genres: (a.genres || []).slice(0, 2),
      }));
    }

    // ── Step 2: Fallback — recently played if top artists empty ─────────────
    if (topArtists.length === 0) {
      const recentRes = await fetch(
        'https://api.spotify.com/v1/me/player/recently-played?limit=50',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (recentRes.ok) {
        const recentData = await recentRes.json();
        const seen = new Set<string>();
        for (const item of recentData.items || []) {
          const track = item.track;
          if (!track) continue;
          for (const artist of track.artists || []) {
            if (artist.id && !seen.has(artist.id)) {
              seen.add(artist.id);
              topArtists.push({
                id: artist.id,
                name: artist.name,
                imageUrl: track.album?.images?.[0]?.url || '',
                genres: [],
              });
            }
          }
        }
        topArtists = topArtists.slice(0, 10);
      }
    }

    if (topArtists.length === 0) {
      return NextResponse.json({ stations: buildMockStations() });
    }

    // ── Step 3: Build Radio Stations in parallel ─────────────────────────────
    // Station configs: top 4 individual artist radios + 1 discovery mix
    const stationArtists = topArtists.slice(0, 4);

    // All genre seeds from top artists (deduplicated)
    const allGenres = Array.from(
      new Set(topArtists.flatMap((a) => a.genres))
    );

    const stationPromises: Promise<RadioStation>[] = [
      // Artist-specific radios (top 4 most listened artists)
      ...stationArtists.map(async (artist, idx): Promise<RadioStation> => {
        const tracks = await fetchRecommendations(accessToken, [artist.id], artist.genres, 20);
        const otherArtistNames = tracks
          .flatMap((t) => t.artists.map((a) => a.name))
          .filter((n) => n !== artist.name)
          .slice(0, 3)
          .join(', ');

        return {
          id: `radio-artist-${artist.id}-${idx}`,
          title: `${artist.name} Radio`,
          description: otherArtistNames
            ? `With ${otherArtistNames} and more`
            : `Based on ${artist.name}'s style`,
          imageUrl: artist.imageUrl,
          badge: 'RADIO',
          seedArtistId: artist.id,
          tracks: tracks.length > 0 ? tracks : MOCK_TRACKS.slice(0, 10),
        };
      }),

      // Discovery Mix: seeded with top 3 artists + their genres
      (async (): Promise<RadioStation> => {
        const seedIds = stationArtists.slice(0, 3).map((a) => a.id);
        const tracks = await fetchRecommendations(accessToken, seedIds, allGenres, 20);
        const coverArtist = stationArtists[0];

        return {
          id: 'radio-discovery-mix',
          title: 'Discovery Mix',
          description: `Tracks you'll love based on your listening taste`,
          imageUrl: coverArtist?.imageUrl || '',
          badge: 'RADIO',
          seedArtistId: null,
          tracks: tracks.length > 0 ? tracks : MOCK_TRACKS,
        };
      })(),
    ];

    const stations = await Promise.all(stationPromises);

    return NextResponse.json({ stations });
  } catch (error) {
    console.error('[radio-stations] Error building radio stations:', error);
    return NextResponse.json({ stations: buildMockStations() });
  }
}

// ── Mock fallback stations ────────────────────────────────────────────────────
function buildMockStations(): RadioStation[] {
  return [
    {
      id: 'radio-mock-1',
      title: 'Your Daily Mix',
      description: 'Based on your recent listening',
      imageUrl: MOCK_TRACKS[0].album?.images?.[0]?.url || '',
      badge: 'RADIO',
      seedArtistId: null,
      tracks: MOCK_TRACKS.slice(0, 8),
    },
    {
      id: 'radio-mock-2',
      title: 'Pop Hits Radio',
      description: 'Fresh pop tracks you might love',
      imageUrl: MOCK_TRACKS[1].album?.images?.[0]?.url || '',
      badge: 'RADIO',
      seedArtistId: null,
      tracks: MOCK_TRACKS.slice(1),
    },
    {
      id: 'radio-mock-3',
      title: 'Discover Weekly',
      description: 'New music tailored for you',
      imageUrl: MOCK_TRACKS[2].album?.images?.[0]?.url || '',
      badge: 'RADIO',
      seedArtistId: null,
      tracks: MOCK_TRACKS.slice(2),
    },
  ];
}
