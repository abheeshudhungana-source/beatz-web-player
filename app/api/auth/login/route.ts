import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_REDIRECT_URI,
  SPOTIFY_SCOPES,
  generateCodeVerifier,
  generateCodeChallenge,
} from '@/lib/spotify-auth';

export async function GET() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Store code_verifier in a secure, HTTP-only cookie for verification during callback
  const cookieStore = cookies();
  cookieStore.set('spotify_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  if (!SPOTIFY_CLIENT_ID) {
    throw new Error('Missing Spotify configuration: NEXT_PUBLIC_SPOTIFY_CLIENT_ID is not set.');
  }

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.set('client_id', SPOTIFY_CLIENT_ID);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', SPOTIFY_REDIRECT_URI);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('scope', SPOTIFY_SCOPES);
  authUrl.searchParams.set('show_dialog', 'true');

  return NextResponse.redirect(authUrl.toString());
}
