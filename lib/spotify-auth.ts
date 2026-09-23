import crypto from 'crypto';

export const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || 'ff95dd361a7a45aa86664f92ea3f3e6c';
export const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '2b164da4ed2f4714a3b159b38fddeddc';
export const SPOTIFY_REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/spotify';

export const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-modify-public',
  'playlist-modify-private',
].join(' ');

/**
 * Generates a random cryptographically secure string for PKCE code verifier
 */
export function generateCodeVerifier(length = 64): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomBytes = crypto.randomBytes(length);
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(randomBytes[i] % possible.length);
  }
  return text;
}

/**
 * Generates S256 code challenge from a code verifier for PKCE
 */
export function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return hash.toString('base64url');
}

/**
 * Exchanges authorization code and code verifier for Spotify access and refresh tokens
 */
export async function exchangeCodeForTokens(code: string, codeVerifier: string) {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  // If Client Secret is present, use HTTP Basic Auth for maximum reliability
  if (SPOTIFY_CLIENT_SECRET) {
    const basicAuth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    headers['Authorization'] = `Basic ${basicAuth}`;
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers,
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spotify token exchange failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Refreshes an expired access token using the refresh token
 */
export async function refreshAccessToken(refreshToken: string) {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (SPOTIFY_CLIENT_SECRET) {
    const basicAuth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    headers['Authorization'] = `Basic ${basicAuth}`;
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers,
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spotify token refresh failed (${response.status}): ${errorText}`);
  }

  return response.json();
}
