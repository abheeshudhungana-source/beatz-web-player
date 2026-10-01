import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/spotify-auth';
import { MOCK_TRACKS } from '@/lib/spotify';

export const dynamic = 'force-dynamic';

export interface TopArtistItem {
  id: string;
  name: string;
  uri: string;
  imageUrl: string;
  genres: string[];
}

function getMockFallback(): TopArtistItem[] {
  return MOCK_TRACKS.map((t) => ({
    id: t.artists[0]?.id || 'mock-artist',
    name: t.artists[0]?.name || 'Artist',
    uri: t.artists[0]?.uri || '',
    imageUrl: t.artists[0]?.images?.[0]?.url || t.album?.images?.[0]?.url || '',
    genres: ['pop'],
  }));
}

export async function GET() {
  try {
    const accessToken = await getValidAccessToken();

    if (!accessToken) {
      return NextResponse.json({ artists: getMockFallback() });
    }

    // 1. Primary: Call Spotify Web API for user's actual top artists (medium_term = last 6 months)
    const response = await fetch(
      'https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=10',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const rawArtists = data.items || [];

      if (rawArtists.length > 0) {
        const artists: TopArtistItem[] = rawArtists.map((artist: any) => ({
          id: artist.id,
          name: artist.name,
          uri: artist.uri,
          imageUrl: artist.images?.[0]?.url || artist.images?.[1]?.url || '',
          genres: artist.genres || [],
        }));
        return NextResponse.json({ artists });
      }
    } else {
      console.warn(`[top-artists API] /v1/me/top/artists status ${response.status}. Trying recently-played fallback...`);
    }

    // 2. Secondary fallback: If user-top-read not yet granted or top artists is empty,
    // fetch recently played tracks (uses user-read-recently-played scope already granted)
    try {
      const recentRes = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=25', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (recentRes.ok) {
        const recentData = await recentRes.json();
        const items = recentData.items || [];
        const seen = new Set<string>();
        const recentArtists: TopArtistItem[] = [];

        for (const item of items) {
          const track = item.track;
          if (!track) continue;
          for (const artist of track.artists || []) {
            if (artist.id && !seen.has(artist.id)) {
              seen.add(artist.id);
              recentArtists.push({
                id: artist.id,
                name: artist.name,
                uri: artist.uri || `spotify:artist:${artist.id}`,
                imageUrl: track.album?.images?.[0]?.url || '',
                genres: [],
              });
            }
          }
        }

        if (recentArtists.length > 0) {
          return NextResponse.json({ artists: recentArtists.slice(0, 10) });
        }
      }
    } catch (recentErr) {
      console.warn('[top-artists API] Recently played fallback error:', recentErr);
    }

    // 3. Fallback: local catalog
    return NextResponse.json({ artists: getMockFallback() });
  } catch (error) {
    console.error('[top-artists API] Error fetching top artists:', error);
    return NextResponse.json({ artists: getMockFallback() });
  }
}
