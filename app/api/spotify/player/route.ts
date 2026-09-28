import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { spotifyFetch } from '@/lib/spotify';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, uri, deviceId, positionMs, volumePercent } = body;

    const cookieStore = cookies();
    const accessToken = cookieStore.get('spotify_access_token')?.value || null;

    if (!accessToken) {
      return NextResponse.json({ success: true, mode: 'local' });
    }

    // 1. Device Transfer: Activate Web Playback SDK player in this browser tab
    if (action === 'transfer' && deviceId) {
      const res = await spotifyFetch<void>(
        '/me/player',
        {
          method: 'PUT',
          body: JSON.stringify({
            device_ids: [deviceId],
            play: false,
          }),
        },
        accessToken
      );
      return NextResponse.json({
        success: res.status === 204 || res.status === 200,
        status: res.status,
        error: res.error,
      });
    }

    // 2. Play Track on Specific Device or Active Session
    if (action === 'play') {
      const endpoint = deviceId
        ? `/me/player/play?device_id=${encodeURIComponent(deviceId)}`
        : '/me/player/play';
      const payload: any = uri ? { uris: [uri] } : {};
      const res = await spotifyFetch<void>(
        endpoint,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        },
        accessToken
      );
      return NextResponse.json({
        success: res.status === 204 || res.status === 200,
        status: res.status,
        error: res.error,
      });
    }

    // 3. Pause Playback
    if (action === 'pause') {
      const endpoint = deviceId
        ? `/me/player/pause?device_id=${encodeURIComponent(deviceId)}`
        : '/me/player/pause';
      const res = await spotifyFetch<void>(endpoint, { method: 'PUT' }, accessToken);
      return NextResponse.json({
        success: res.status === 204 || res.status === 200,
        status: res.status,
        error: res.error,
      });
    }

    // 4. Skip to Next Track
    if (action === 'next') {
      const endpoint = deviceId
        ? `/me/player/next?device_id=${encodeURIComponent(deviceId)}`
        : '/me/player/next';
      const res = await spotifyFetch<void>(endpoint, { method: 'POST' }, accessToken);
      return NextResponse.json({
        success: res.status === 204 || res.status === 200,
        status: res.status,
        error: res.error,
      });
    }

    // 5. Skip to Previous Track
    if (action === 'previous') {
      const endpoint = deviceId
        ? `/me/player/previous?device_id=${encodeURIComponent(deviceId)}`
        : '/me/player/previous';
      const res = await spotifyFetch<void>(endpoint, { method: 'POST' }, accessToken);
      return NextResponse.json({
        success: res.status === 204 || res.status === 200,
        status: res.status,
        error: res.error,
      });
    }

    // 6. Seek to Position (ms)
    if (action === 'seek' && typeof positionMs === 'number') {
      const endpoint = `/me/player/seek?position_ms=${Math.round(positionMs)}${deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : ''}`;
      const res = await spotifyFetch<void>(endpoint, { method: 'PUT' }, accessToken);
      return NextResponse.json({
        success: res.status === 204 || res.status === 200,
        status: res.status,
        error: res.error,
      });
    }

    // 7. Set Volume (0-100)
    if (action === 'volume' && typeof volumePercent === 'number') {
      const endpoint = `/me/player/volume?volume_percent=${Math.round(volumePercent)}${deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : ''}`;
      const res = await spotifyFetch<void>(endpoint, { method: 'PUT' }, accessToken);
      return NextResponse.json({
        success: res.status === 204 || res.status === 200,
        status: res.status,
        error: res.error,
      });
    }

    return NextResponse.json({ error: 'Unknown or incomplete action payload' }, { status: 400 });
  } catch (error: any) {
    console.warn('[API player POST] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Player control error' });
  }
}
