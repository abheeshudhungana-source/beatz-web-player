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

export async function GET() {
  try {
    const accessToken = await getValidAccessToken();

    if (!accessToken) {
      // Fallback: extract artists from mock catalog
      const fallbackArtists: TopArtistItem[] = MOCK_TRACKS.map((t) => ({
        id: t.artists[0]?.id || 'mock-artist',
        name: t.artists[0]?.name || 'Artist',
        uri: t.artists[0]?.uri || '',
        imageUrl: t.album?.images?.[0]?.url || '',
        genres: ['pop'],
      }));
      return NextResponse.json({ artists: fallbackArtists });
    }

    // Call Spotify Web API for user's actual top artists (medium_term = last 6 months)
    const response = await fetch(
      'https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=10',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn(`[top-artists API] Spotify returned status ${response.status}`);
      // If 403 (scope not yet granted or user has no listening history), return mock catalog
      const fallbackArtists: TopArtistItem[] = MOCK_TRACKS.map((t) => ({
        id: t.artists[0]?.id || 'mock-artist',
        name: t.artists[0]?.name || 'Artist',
        uri: t.artists[0]?.uri || '',
        imageUrl: t.album?.images?.[0]?.url || '',
        genres: ['pop'],
      }));
      return NextResponse.json({ artists: fallbackArtists });
    }

    const data = await response.json();
    const rawArtists = data.items || [];

    const artists: TopArtistItem[] = rawArtists.map((artist: any) => ({
      id: artist.id,
      name: artist.name,
      uri: artist.uri,
      imageUrl: artist.images?.[0]?.url || artist.images?.[1]?.url || '',
      genres: artist.genres || [],
    }));

    // If user's top artists is empty (e.g. brand new Spotify account), fallback gracefully
    if (artists.length === 0) {
      const fallbackArtists: TopArtistItem[] = MOCK_TRACKS.map((t) => ({
        id: t.artists[0]?.id || 'mock-artist',
        name: t.artists[0]?.name || 'Artist',
        uri: t.artists[0]?.uri || '',
        imageUrl: t.album?.images?.[0]?.url || '',
        genres: ['pop'],
      }));
      return NextResponse.json({ artists: fallbackArtists });
    }

    return NextResponse.json({ artists });
  } catch (error) {
    console.error('[top-artists API] Error fetching top artists:', error);
    return NextResponse.json({ artists: [] }, { status: 500 });
  }
}
