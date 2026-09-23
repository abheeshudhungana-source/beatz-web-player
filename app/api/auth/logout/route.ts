import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = cookies();
  cookieStore.delete('spotify_access_token');
  cookieStore.delete('spotify_refresh_token');
  cookieStore.delete('spotify_token_expires_at');
  cookieStore.delete('spotify_code_verifier');

  const url = new URL('/', request.url);
  return NextResponse.redirect(url);
}
