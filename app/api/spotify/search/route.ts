import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { searchTracks } from '@/lib/spotify';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 10;

    if (!query || query.trim() === '') {
      return NextResponse.json({ tracks: [] });
    }

    // Security: Input length clamping (max 100 characters to prevent ReDoS / payload abuse)
    if (query.length > 100) {
      return NextResponse.json(
        { error: 'Query too long. Maximum allowed length is 100 characters.' },
        { status: 400 }
      );
    }

    const cookieStore = cookies();
    const accessToken = cookieStore.get('spotify_access_token')?.value || null;

    const tracks = await searchTracks(query, accessToken, limit);
    return NextResponse.json({ tracks });
  } catch (error: any) {
    console.error('[API search] Internal error:', error);
    // Error sanitization: Never expose internal stack trace
    return NextResponse.json(
      { error: 'Failed to search Spotify catalog', message: 'Internal service error' },
      { status: 500 }
    );
  }
}
