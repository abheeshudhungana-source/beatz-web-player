import crypto from 'crypto';

export const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
export const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
export const SPOTIFY_REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://127.0.0.1:3000/api/auth/callback/spotify';

function assertSpotifyConfig() {
  if (!SPOTIFY_CLIENT_ID) {
    throw new Error('Missing Spotify configuration: NEXT_PUBLIC_SPOTIFY_CLIENT_ID is not set.');
  }

  if (!SPOTIFY_CLIENT_SECRET) {
    throw new Error('Missing Spotify configuration: SPOTIFY_CLIENT_SECRET is not set.');
  }
}

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

export function getRedirectUri(requestOrigin?: string): string {
  if (process.env.NEXT_PUBLIC_REDIRECT_URI) {
    return process.env.NEXT_PUBLIC_REDIRECT_URI;
  }
  if (requestOrigin) {
    return `${requestOrigin}/api/auth/callback/spotify`;
  }
  return 'http://127.0.0.1:3000/api/auth/callback/spotify';
}

/**
 * Exchanges authorization code and code verifier for Spotify access and refresh tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  customRedirectUri?: string
) {
  assertSpotifyConfig();

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID!,
    grant_type: 'authorization_code',
    code,
    redirect_uri: customRedirectUri || getRedirectUri(),
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
  assertSpotifyConfig();

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID!,
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

/**
 * Reads the current access token from cookies and proactively refreshes it if expired.
 */
export async function getValidAccessToken(): Promise<string | null> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    let accessToken = cookieStore.get('spotify_access_token')?.value;
    const refreshToken = cookieStore.get('spotify_refresh_token')?.value;
    const expiresAtStr = cookieStore.get('spotify_token_expires_at')?.value;

    const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;
    const isExpired = !accessToken || (expiresAt > 0 && Date.now() > expiresAt - 60 * 1000);

    if (isExpired && refreshToken) {
      const refreshed = await refreshAccessToken(refreshToken);
      const refreshedAccessToken = typeof refreshed.access_token === 'string' ? refreshed.access_token : null;

      if (refreshedAccessToken) {
        const tokenToStore = refreshedAccessToken;
        accessToken = tokenToStore;
        const newExpiresAt = Date.now() + refreshed.expires_in * 1000;

        try {
          cookieStore.set('spotify_access_token', tokenToStore, {
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
        } catch {
          // In contexts where cookies cannot be mutated (e.g. read-only prerender), ignore mutation error
        }
      }
    }

    return accessToken || null;
  } catch (err) {
    console.error('[getValidAccessToken] Error obtaining fresh token:', err);
    return null;
  }
}
