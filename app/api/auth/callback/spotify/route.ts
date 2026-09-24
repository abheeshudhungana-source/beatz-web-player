import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForTokens } from '@/lib/spotify-auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    console.error('Spotify Auth Callback Error:', error);
    return NextResponse.redirect(new URL('/?error=access_denied', request.url));
  }

  const cookieStore = cookies();
  const codeVerifier = cookieStore.get('spotify_code_verifier')?.value;

  if (!codeVerifier) {
    console.error('Missing code_verifier cookie in Spotify callback');
    return NextResponse.redirect(new URL('/?error=missing_verifier', request.url));
  }

  try {
    const redirectUriUsed = cookieStore.get('spotify_redirect_uri_used')?.value;
    const tokens = await exchangeCodeForTokens(code, codeVerifier, redirectUriUsed);
    const expiresAt = Date.now() + tokens.expires_in * 1000;

    // Set secure HTTP-only cookies
    cookieStore.set('spotify_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in,
      path: '/',
    });

    if (tokens.refresh_token) {
      cookieStore.set('spotify_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
    }

    cookieStore.set('spotify_token_expires_at', expiresAt.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in,
      path: '/',
    });

    // Clean up temporary verifier and redirect cookies
    cookieStore.delete('spotify_code_verifier');
    cookieStore.delete('spotify_redirect_uri_used');

    return NextResponse.redirect(new URL('/', request.url));
  } catch (err: any) {
    console.error('Failed to exchange Spotify authorization code:', err);
    return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url));
  }
}
