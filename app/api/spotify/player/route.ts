import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { spotifyFetch } from '@/lib/spotify';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, uri } = body;

    const cookieStore = cookies();
    const accessToken = cookieStore.get('spotify_access_token')?.value || null;

    if (!accessToken) {
      return NextResponse.json({ success: true, mode: 'local' });
    }

    if (action === 'next') {
      const res = await spotifyFetch<void>('/me/player/next', { method: 'POST' }, accessToken);
      return NextResponse.json({ success: res.status === 204 || res.status === 200, status: res.status });
    }

    if (action === 'previous') {
      const res = await spotifyFetch<void>('/me/player/previous', { method: 'POST' }, accessToken);
      return NextResponse.json({ success: res.status === 204 || res.status === 200, status: res.status });
    }

    if (action === 'play') {
      const payload: any = uri ? { uris: [uri] } : {};
      const res = await spotifyFetch<void>(
        '/me/player/play',
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        },
        accessToken
      );
      return NextResponse.json({ success: res.status === 204 || res.status === 200, status: res.status });
    }

    if (action === 'pause') {
      const res = await spotifyFetch<void>('/me/player/pause', { method: 'PUT' }, accessToken);
      return NextResponse.json({ success: res.status === 204 || res.status === 200, status: res.status });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.warn('[API player POST] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Player control error' });
  }
}
