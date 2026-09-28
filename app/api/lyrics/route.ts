import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trackName = searchParams.get('track_name')?.trim();
  const artistName = searchParams.get('artist_name')?.trim();
  const albumName = searchParams.get('album_name')?.trim();
  const duration = Number(searchParams.get('duration'));

  if (!trackName || !artistName || trackName.length > 200 || artistName.length > 200) {
    return NextResponse.json({ error: 'A valid track name and artist are required.' }, { status: 400 });
  }

  const lyricsUrl = new URL('https://lrclib.net/api/get');
  lyricsUrl.searchParams.set('track_name', trackName);
  lyricsUrl.searchParams.set('artist_name', artistName);
  if (albumName && albumName.length <= 200) {
    lyricsUrl.searchParams.set('album_name', albumName);
  }
  if (Number.isFinite(duration) && duration >= 1 && duration <= 3600) {
    lyricsUrl.searchParams.set('duration', String(duration));
  }

  try {
    const response = await fetch(lyricsUrl, {
      headers: {
        'User-Agent': 'BEATZ Web Player/0.1 (https://github.com/abheeshudhungana-source/beatz-web-player)',
      },
      next: { revalidate: 3600 },
    });

    if (response.status === 404) {
      return NextResponse.json({ syncedLyrics: null });
    }
    if (response.status === 429) {
      return NextResponse.json(
        { error: 'Lyrics lookup is temporarily rate limited.' },
        { status: 503, headers: { 'Retry-After': response.headers.get('Retry-After') ?? '5' } },
      );
    }
    if (!response.ok) {
      return NextResponse.json({ error: 'Lyrics service is unavailable.' }, { status: 502 });
    }

    const result = (await response.json()) as { syncedLyrics?: unknown };
    return NextResponse.json({
      syncedLyrics: typeof result.syncedLyrics === 'string' ? result.syncedLyrics : null,
    });
  } catch {
    return NextResponse.json({ error: 'Lyrics service is unavailable.' }, { status: 502 });
  }
}