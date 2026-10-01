import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/spotify-auth';
import { mapSpotifyTrackDto, MOCK_TRACKS } from '@/lib/spotify';
import type { SpotifyTrack } from '@/types/spotify';

export const dynamic = 'force-dynamic';

export interface RadioStation {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  badge: 'RADIO';
  seedArtistId: string | null;
  tracks: SpotifyTrack[];
}

// ── Fetchers ─────────────────────────────────────────────────────────────────

/**
 * Fetch an artist's top tracks (still fully available, no special scope needed).
 * Market defaults to 'US' but Spotify also accepts 'from_token'.
 */
async function fetchArtistTopTracks(
  accessToken: string,
  artistId: string,
  market = 'US'
): Promise<SpotifyTrack[]> {
  const res = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    console.warn(`[radio-stations] artist top-tracks ${artistId} status ${res.status}`);
    return [];
  }
  const data = await res.json();
  return (data.tracks || []).map(mapSpotifyTrackDto);
}

/**
 * Fetch related artists for a given artist, then get their top track each —
 * used to build variety in the Discovery Mix.
 */
async function fetchRelatedArtistsTracks(
  accessToken: string,
  artistId: string,
  limit = 10
): Promise<SpotifyTrack[]> {
  const relatedRes = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/related-artists`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!relatedRes.ok) return [];

  const relatedData = await relatedRes.json();
  const relatedArtists: Array<{ id: string; name: string }> = (relatedData.artists || []).slice(0, limit);

  const trackPromises = relatedArtists.map((a) => fetchArtistTopTracks(accessToken, a.id));
  const trackArrays = await Promise.all(trackPromises);

  // One top track per related artist, shuffled for freshness
  const tracks = trackArrays
    .map((arr) => arr[0])
    .filter((t): t is SpotifyTrack => !!t);

  return shuffle(tracks);
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const accessToken = await getValidAccessToken();

    if (!accessToken) {
      return NextResponse.json({ stations: buildMockStations() });
    }

    // ── Step 1: Fetch user's top artists (seeding material) ──────────────────
    let topArtists: Array<{
      id: string;
      name: string;
      imageUrl: string;
      genres: string[];
    }> = [];

    const topRes = await fetch(
      'https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=10',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (topRes.ok) {
      const topData = await topRes.json();
      topArtists = (topData.items || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        imageUrl: a.images?.[0]?.url || '',
        genres: (a.genres || []).slice(0, 2),
      }));
    }

    // ── Step 2: Fallback — recently played if top artists empty ─────────────
    if (topArtists.length === 0) {
      const recentRes = await fetch(
        'https://api.spotify.com/v1/me/player/recently-played?limit=50',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (recentRes.ok) {
        const recentData = await recentRes.json();
        const seen = new Set<string>();
        for (const item of recentData.items || []) {
          const track = item.track;
          if (!track) continue;
          for (const artist of track.artists || []) {
            if (artist.id && !seen.has(artist.id)) {
              seen.add(artist.id);
              topArtists.push({
                id: artist.id,
                name: artist.name,
                imageUrl: track.album?.images?.[0]?.url || '',
                genres: [],
              });
            }
          }
        }
        topArtists = topArtists.slice(0, 10);
      }
    }

    if (topArtists.length === 0) {
      return NextResponse.json({ stations: buildMockStations() });
    }

    // ── Step 3: Build artist radios using /v1/artists/{id}/top-tracks ────────
    // Top 4 individual artist radios + 1 Discovery Mix
    const stationArtists = topArtists.slice(0, 4);

    const artistRadioPromises: Promise<RadioStation>[] = stationArtists.map(
      async (artist): Promise<RadioStation> => {
        // Primary: artist's own top tracks
        const ownTracks = await fetchArtistTopTracks(accessToken, artist.id);

        // Secondary: a few tracks from 3 related artists for variety
        const relatedTracks = await fetchRelatedArtistsTracks(accessToken, artist.id, 3);

        // Merge: start with artist's own songs, then sprinkle in related
        const merged = [...ownTracks.slice(0, 12), ...relatedTracks.slice(0, 8)];

        // Build a subtitle from unique non-seed artist names in the station
        const otherNames = Array.from(
          new Set(
            merged
              .flatMap((t) => t.artists.map((a) => a.name))
              .filter((n) => n.toLowerCase() !== artist.name.toLowerCase())
          )
        ).slice(0, 3);

        return {
          id: `radio-artist-${artist.id}`,
          title: `${artist.name} Radio`,
          description: otherNames.length
            ? `With ${otherNames.join(', ')} and more`
            : `Based on ${artist.name}'s style`,
          imageUrl: artist.imageUrl,
          badge: 'RADIO',
          seedArtistId: artist.id,
          tracks: merged.length > 0 ? merged : MOCK_TRACKS.slice(0, 10),
        };
      }
    );

    // ── Step 4: Discovery Mix ────────────────────────────────────────────────
    const discoveryPromise: Promise<RadioStation> = (async () => {
      // Take top tracks from artist #2, #3, #4 (not #1 — saved for their own radio)
      // and shuffle them together
      const discoveryArtists = topArtists.slice(1, 5);
      const trackBatches = await Promise.all(
        discoveryArtists.map((a) => fetchArtistTopTracks(accessToken, a.id))
      );
      const allTracks = shuffle(trackBatches.flat()).slice(0, 20);
      const coverArtist = topArtists[0];

      return {
        id: 'radio-discovery-mix',
        title: 'Discovery Mix',
        description: "Fresh tracks you'll love based on your listening taste",
        imageUrl: coverArtist?.imageUrl || '',
        badge: 'RADIO',
        seedArtistId: null,
        tracks: allTracks.length > 0 ? allTracks : MOCK_TRACKS,
      };
    })();

    const [discoveryStation, ...artistStations] = await Promise.all([
      discoveryPromise,
      ...artistRadioPromises,
    ]);

    // Order: artist radios first, discovery mix last
    const stations = [...artistStations, discoveryStation];

    return NextResponse.json({ stations });
  } catch (error) {
    console.error('[radio-stations] Error building radio stations:', error);
    return NextResponse.json({ stations: buildMockStations() });
  }
}

// ── Mock fallback stations ────────────────────────────────────────────────────
function buildMockStations(): RadioStation[] {
  return [
    {
      id: 'radio-mock-1',
      title: 'Your Daily Mix',
      description: 'Based on your recent listening',
      imageUrl: MOCK_TRACKS[0].album?.images?.[0]?.url || '',
      badge: 'RADIO',
      seedArtistId: null,
      tracks: MOCK_TRACKS,
    },
    {
      id: 'radio-mock-2',
      title: 'Pop Hits Radio',
      description: 'Fresh pop tracks you might love',
      imageUrl: MOCK_TRACKS[1].album?.images?.[0]?.url || '',
      badge: 'RADIO',
      seedArtistId: null,
      tracks: MOCK_TRACKS.slice(1),
    },
    {
      id: 'radio-mock-3',
      title: 'Discover Weekly',
      description: 'New music tailored for you',
      imageUrl: MOCK_TRACKS[2].album?.images?.[0]?.url || '',
      badge: 'RADIO',
      seedArtistId: null,
      tracks: MOCK_TRACKS.slice(2),
    },
  ];
}
