import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { refreshAccessToken } from '@/lib/spotify-auth';

export async function GET() {
  const cookieStore = cookies();
  let accessToken = cookieStore.get('spotify_access_token')?.value;
  const refreshToken = cookieStore.get('spotify_refresh_token')?.value;
  const expiresAtStr = cookieStore.get('spotify_token_expires_at')?.value;

  if (!refreshToken) {
    return NextResponse.json({
      isAuthenticated: false,
      accessToken: null,
      user: null,
    });
  }

  const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;
  const isExpiringSoon = Date.now() > expiresAt - 5 * 60 * 1000; // Refresh within 5 minutes of expiry

  // Auto-refresh token if missing or expiring soon
  if (!accessToken || isExpiringSoon) {
    try {
      const refreshed = await refreshAccessToken(refreshToken);
      accessToken = refreshed.access_token;
      const newExpiresAt = Date.now() + refreshed.expires_in * 1000;

      cookieStore.set('spotify_access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: refreshed.expires_in,
        path: '/',
      });

      cookieStore.set('spotify_token_expires_at', newExpiresAt.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: refreshed.expires_in,
        path: '/',
      });
    } catch (err) {
      console.error('Failed to auto-refresh token:', err);
      return NextResponse.json({
        isAuthenticated: false,
        accessToken: null,
        error: 'refresh_failed',
      });
    }
  }

  // Fetch current user profile to verify account status (e.g. Premium vs Free)
  try {
    const userRes = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (userRes.ok) {
      const userData = await userRes.json();
      return NextResponse.json({
        isAuthenticated: true,
        accessToken,
        user: {
          id: userData.id,
          displayName: userData.display_name,
          email: userData.email,
          product: userData.product, // 'premium' | 'free'
          images: userData.images || [],
        },
      });
    }
  } catch (err) {
    console.error('Error fetching user profile:', err);
  }

  return NextResponse.json({
    isAuthenticated: true,
    accessToken,
    user: null,
  });
}
