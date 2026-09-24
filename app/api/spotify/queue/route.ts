import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getQueue, addToQueue, SPOTIFY_TRACK_URI_REGEX } from '@/lib/spotify';

export async function GET() {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('spotify_access_token')?.value || null;

    const queueState = await getQueue(accessToken);
    return NextResponse.json(queueState);
  } catch (error: any) {
    console.error('[API queue GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue', message: 'Internal service error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body.uri !== 'string') {
      return NextResponse.json(
        { error: 'Invalid payload. "uri" string field is required.' },
        { status: 400 }
      );
    }

    const { uri } = body;

    // Strict validation against Spotify Track URI pattern (Security Checklist Item 3.2)
    if (!SPOTIFY_TRACK_URI_REGEX.test(uri)) {
      return NextResponse.json(
        { error: 'Invalid Spotify track URI format. Expected format: spotify:track:[22 alphanumeric chars]' },
        { status: 400 }
      );
    }

    const cookieStore = cookies();
    const accessToken = cookieStore.get('spotify_access_token')?.value || null;

    const result = await addToQueue(uri, accessToken);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {
    console.error('[API queue POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to add track to queue', message: 'Internal service error' },
      { status: 500 }
    );
  }
}
