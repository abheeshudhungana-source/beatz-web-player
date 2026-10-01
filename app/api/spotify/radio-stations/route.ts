import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/spotify-auth';
import { mapSpotifyTrackDto, MOCK_TRACKS } from '@/lib/spotify';
import type { SpotifyTrack } from '@/types/spotify';

export const dynamic = 'force-dynamic';

export interface RecommendedPlaylist {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  badge: string;
  tracks: SpotifyTrack[];
}

interface ArtistInfo {
  id: string;
  name: string;
  imageUrl: string;
  genres: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchTopArtists(
  accessToken: string,
  limit = 50
): Promise<ArtistInfo[]> {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=${limit}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      imageUrl: a.images?.[0]?.url || a.images?.[1]?.url || '',
      genres: a.genres || [],
    }));
  } catch {
    return [];
  }
}

async function fetchTopTracks(
  accessToken: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit = 50
): Promise<SpotifyTrack[]> {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map(mapSpotifyTrackDto);
  } catch {
    return [];
  }
}

async function fetchRecentlyPlayed(
  accessToken: string,
  limit = 50
): Promise<SpotifyTrack[]> {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const seen = new Set<string>();
    const tracks: SpotifyTrack[] = [];
    for (const item of data.items || []) {
      if (item.track && !seen.has(item.track.id)) {
        seen.add(item.track.id);
        tracks.push(mapSpotifyTrackDto(item.track));
      }
    }
    return tracks;
  } catch {
    return [];
  }
}

async function fetchArtistTopTracks(
  accessToken: string,
  artistId: string
): Promise<SpotifyTrack[]> {
  try {
    let res = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=from_token`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) {
      res = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    }
    if (!res.ok) return [];
    const data = await res.json();
    return (data.tracks || []).map(mapSpotifyTrackDto);
  } catch {
    return [];
  }
}

async function searchTracksByGenre(
  accessToken: string,
  genre: string,
  limit = 20
): Promise<SpotifyTrack[]> {
  try {
    const cleanGenre = genre.replace(/["']/g, '');
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=genre:%22${encodeURIComponent(cleanGenre)}%22&type=track&limit=${limit}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.tracks?.items || []).map(mapSpotifyTrackDto);
  } catch {
    return [];
  }
}

function pickCover(tracks: SpotifyTrack[], fallbackUrl = ''): string {
  for (const t of tracks) {
    const url = t.album?.images?.[0]?.url;
    if (url) return url;
  }
  return fallbackUrl;
}

/**
 * Computes affinity between two artists based on shared genre tags/roots.
 */
function scoreAffinity(lead: ArtistInfo, candidate: ArtistInfo): number {
  if (lead.id === candidate.id) return -1;
  let score = 0;
  const leadGenres = (lead.genres || []).map((g) => g.toLowerCase());
  const candGenres = (candidate.genres || []).map((g) => g.toLowerCase());

  if (leadGenres.length === 0 || candGenres.length === 0) {
    return 0;
  }

  for (const lg of leadGenres) {
    for (const cg of candGenres) {
      if (lg === cg) {
        score += 4;
      } else if (lg.includes(cg) || cg.includes(lg)) {
        score += 2.5;
      } else {
        const lWords = lg.split(/\s+/);
        const cWords = cg.split(/\s+/);
        const shared = lWords.filter((w) => w.length > 2 && cWords.includes(w));
        score += shared.length * 1.5;
      }
    }
  }

  return score;
}

/**
 * Interleaves songs from a lead artist and multiple related artists
 * into a rich, varied radio/playlist (round-robin mixing).
 */
function interleaveTracks(
  leadTracks: SpotifyTrack[],
  relatedTracksGroups: SpotifyTrack[][],
  maxTracks = 25
): SpotifyTrack[] {
  const result: SpotifyTrack[] = [];
  const seenIds = new Set<string>();

  const maxRounds = Math.max(leadTracks.length, ...relatedTracksGroups.map((g) => g.length), 1);

  for (let r = 0; r < maxRounds && result.length < maxTracks; r++) {
    // 1. One track from lead artist
    if (r < leadTracks.length) {
      const t = leadTracks[r];
      if (!seenIds.has(t.id)) {
        seenIds.add(t.id);
        result.push(t);
      }
    }
    // 2. One track from each related artist group
    for (const group of relatedTracksGroups) {
      if (r < group.length && result.length < maxTracks) {
        const t = group[r];
        if (!seenIds.has(t.id)) {
          seenIds.add(t.id);
          result.push(t);
        }
      }
    }
  }

  return result;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const accessToken = await getValidAccessToken();

    if (!accessToken) {
      const mock = buildMockPlaylists();
      return NextResponse.json({ playlists: mock, stations: mock });
    }

    // ── 1. Fetch user listening profile in parallel ──────────────────────────
    const [topArtistsRaw, topTracksMedium, recentTracks] = await Promise.all([
      fetchTopArtists(accessToken, 50),
      fetchTopTracks(accessToken, 'medium_term', 50),
      fetchRecentlyPlayed(accessToken, 50),
    ]);

    // Build unique artist pool (from top artists + top tracks + recent tracks)
    const artistMap = new Map<string, ArtistInfo>();

    for (const a of topArtistsRaw) {
      if (a.id && !artistMap.has(a.id)) {
        artistMap.set(a.id, a);
      }
    }

    // Also collect artists appearing on user's top tracks
    for (const track of [...topTracksMedium, ...recentTracks]) {
      for (const a of track.artists || []) {
        if (a.id && !artistMap.has(a.id)) {
          artistMap.set(a.id, {
            id: a.id,
            name: a.name,
            imageUrl: a.images?.[0]?.url || track.album?.images?.[0]?.url || '',
            genres: [],
          });
        }
      }
    }

    const allUserArtists = Array.from(artistMap.values());

    if (allUserArtists.length === 0 && topTracksMedium.length === 0) {
      const mock = buildMockPlaylists();
      return NextResponse.json({ playlists: mock, stations: mock });
    }

    const playlists: RecommendedPlaylist[] = [];

    // ── 2. Build User Customized Playlists Mixing Related Artists ────────────

    // We can create up to 3 distinct Daily Mixes clustering related artists
    const usedLeadIds = new Set<string>();
    const usedInCluster = new Set<string>();

    const clusterPromises: Promise<RecommendedPlaylist | null>[] = [];

    // Up to 3 lead artists from top artists
    for (let i = 0; i < allUserArtists.length && clusterPromises.length < 3; i++) {
      const candidateLead = allUserArtists[i];
      if (usedInCluster.has(candidateLead.id)) continue;

      usedLeadIds.add(candidateLead.id);
      usedInCluster.add(candidateLead.id);

      // Score other artists to find related artists in the same genre/style
      const otherArtists = allUserArtists.filter((a) => !usedLeadIds.has(a.id));
      const scored = otherArtists
        .map((a) => ({ artist: a, score: scoreAffinity(candidateLead, a) }))
        .sort((first, second) => second.score - first.score);

      // Select top 3-4 related artists
      let relatedArtists = scored
        .filter((s) => s.score > 0)
        .slice(0, 4)
        .map((s) => s.artist);

      // If no related artists shared genres in user's library, pick the closest adjacent artists
      if (relatedArtists.length < 2) {
        const fallbackPicks = otherArtists
          .filter((a) => !relatedArtists.some((r) => r.id === a.id))
          .slice(0, 3);
        relatedArtists = [...relatedArtists, ...fallbackPicks];
      }

      // Mark these as used so the next mix has a fresh distinct cluster
      for (const r of relatedArtists) {
        usedInCluster.add(r.id);
      }

      const clusterIndex = clusterPromises.length + 1;

      // Async builder for this cluster playlist
      clusterPromises.push(
        (async (): Promise<RecommendedPlaylist | null> => {
          // Fetch lead artist tracks + related artists tracks in parallel
          const [leadTracks, ...relatedTrackArrays] = await Promise.all([
            fetchArtistTopTracks(accessToken, candidateLead.id),
            ...relatedArtists.map((r) => fetchArtistTopTracks(accessToken, r.id)),
          ]);

          // If lead artist has very few tracks or related artists had none,
          // try genre search to discover authentic related tracks in this genre
          let extraGenreTracks: SpotifyTrack[][] = [];
          if (
            candidateLead.genres.length > 0 &&
            relatedTrackArrays.filter((arr) => arr.length > 0).length < 2
          ) {
            const discovered = await searchTracksByGenre(
              accessToken,
              candidateLead.genres[0],
              15
            );
            if (discovered.length > 0) {
              // Group discovered tracks by artist
              const discMap = new Map<string, SpotifyTrack[]>();
              for (const dt of discovered) {
                const aName = dt.artists[0]?.name || 'Artist';
                if (!discMap.has(aName)) discMap.set(aName, []);
                discMap.get(aName)!.push(dt);
              }
              extraGenreTracks = Array.from(discMap.values()).slice(0, 3);
            }
          }

          const allRelatedGroups = [
            ...relatedTrackArrays.filter((arr) => arr.length > 0),
            ...extraGenreTracks,
          ];

          // Interleave lead artist + related artists songs
          const mixedTracks = interleaveTracks(leadTracks, allRelatedGroups, 25);

          if (mixedTracks.length === 0) return null;

          // Extract unique artist names in this mix for the subtitle
          const featuredNames = Array.from(
            new Set(mixedTracks.flatMap((t) => t.artists.map((a) => a.name)))
          );
          const otherNames = featuredNames.filter(
            (n) => n.toLowerCase() !== candidateLead.name.toLowerCase()
          );

          const subtitle =
            otherNames.length > 0
              ? `With ${candidateLead.name}, ${otherNames.slice(0, 3).join(', ')} and more`
              : `Curated mix featuring ${candidateLead.name} and related sounds`;

          return {
            id: `playlist-daily-mix-${clusterIndex}-${candidateLead.id}`,
            title: `${candidateLead.name} & Friends Mix`,
            description: subtitle,
            imageUrl: candidateLead.imageUrl || pickCover(mixedTracks),
            badge: `DAILY MIX ${clusterIndex}`,
            tracks: mixedTracks,
          };
        })()
      );
    }

    const clusters = (await Promise.all(clusterPromises)).filter(
      (c): c is RecommendedPlaylist => c !== null
    );

    playlists.push(...clusters);

    // ── 3. Playlist: "Discovery Taste Mix" (Wide blend across 8-12 artists) ──
    const discoveryLeadArtists = allUserArtists.slice(0, 10);
    if (discoveryLeadArtists.length >= 2) {
      const trackArrays = await Promise.all(
        discoveryLeadArtists.slice(0, 8).map((a) => fetchArtistTopTracks(accessToken, a.id))
      );

      // Take 2 tracks from each artist and round-robin interleave
      const intermixed: SpotifyTrack[] = [];
      const seen = new Set<string>();
      const maxPerArtist = 3;

      for (let round = 0; round < maxPerArtist && intermixed.length < 25; round++) {
        for (const tracks of trackArrays) {
          if (round < tracks.length && intermixed.length < 25) {
            const t = tracks[round];
            if (!seen.has(t.id)) {
              seen.add(t.id);
              intermixed.push(t);
            }
          }
        }
      }

      if (intermixed.length > 0) {
        const top3Names = discoveryLeadArtists.slice(0, 3).map((a) => a.name).join(', ');
        playlists.push({
          id: 'playlist-discovery-blend',
          title: 'Discovery Taste Mix',
          description: `A rich mix blending ${top3Names} and related artists`,
          imageUrl: discoveryLeadArtists[0]?.imageUrl || pickCover(intermixed),
          badge: 'FOR YOU',
          tracks: intermixed,
        });
      }
    }

    // ── 4. Playlist: "Your Top Hits" (User's authentic top tracks) ───────────
    if (topTracksMedium.length > 0) {
      playlists.push({
        id: 'playlist-top-hits',
        title: 'Your Top Hits',
        description: 'Your most played favorites blended into one playlist',
        imageUrl: pickCover(topTracksMedium),
        badge: 'TOP PICKS',
        tracks: topTracksMedium.slice(0, 25),
      });
    }

    // ── 5. Playlist: "On Repeat / Recent Mix" ────────────────────────────────
    if (recentTracks.length > 0) {
      playlists.push({
        id: 'playlist-on-repeat',
        title: 'Recently Played Mix',
        description: 'Tracks and artists from your recent listening history',
        imageUrl: pickCover(recentTracks),
        badge: 'RECENT',
        tracks: recentTracks.slice(0, 25),
      });
    }

    const finalPlaylists = playlists.length > 0 ? playlists : buildMockPlaylists();

    return NextResponse.json({
      playlists: finalPlaylists,
      stations: finalPlaylists,
    });
  } catch (error) {
    console.error('[radio-stations] Error building customized playlists:', error);
    const mock = buildMockPlaylists();
    return NextResponse.json({ playlists: mock, stations: mock });
  }
}

// ── Curated High-Quality Mock Fallbacks ────────────────────────────────────────
function buildMockPlaylists(): RecommendedPlaylist[] {
  // Diverse, realistic mixes without Rick Astley as the primary track
  const indieVibe = MOCK_TRACKS.filter((t) => t.id === '3n3Ppam7vgaVa1iaRUc9Lp'); // M83
  const popVibe = MOCK_TRACKS.filter((t) => t.id === '0VjIjW4GlUZAMYd2vXMi3b'); // The Weeknd
  const chillVibe = MOCK_TRACKS.filter((t) => t.id === '7qiZfU4dY1lWllzX7mPBI3'); // Ed Sheeran
  const otherTracks = MOCK_TRACKS.filter(
    (t) => !['4cOdK2wGLETKBW3PvgPWqT'].includes(t.id)
  );

  return [
    {
      id: 'mock-mix-1',
      title: 'Daily Mix 1: Synth & Indie',
      description: 'With M83, The Weeknd and similar sounds',
      imageUrl: indieVibe[0]?.album?.images?.[0]?.url || MOCK_TRACKS[1].album?.images?.[0]?.url || '',
      badge: 'DAILY MIX 1',
      tracks: [MOCK_TRACKS[1], MOCK_TRACKS[2], MOCK_TRACKS[3], MOCK_TRACKS[4]],
    },
    {
      id: 'mock-mix-2',
      title: 'Daily Mix 2: Pop & Hits',
      description: 'With The Kid LAROI, Justin Bieber, Ed Sheeran and more',
      imageUrl: MOCK_TRACKS[3]?.album?.images?.[0]?.url || '',
      badge: 'DAILY MIX 2',
      tracks: [MOCK_TRACKS[3], MOCK_TRACKS[4], MOCK_TRACKS[1]],
    },
    {
      id: 'mock-mix-3',
      title: 'Acoustic & Chill Mix',
      description: 'Relaxed tracks curated for your easy listening',
      imageUrl: chillVibe[0]?.album?.images?.[0]?.url || MOCK_TRACKS[4].album?.images?.[0]?.url || '',
      badge: 'CHILL MIX',
      tracks: [MOCK_TRACKS[4], MOCK_TRACKS[3], MOCK_TRACKS[2]],
    },
    {
      id: 'mock-mix-4',
      title: 'Discovery Taste Mix',
      description: 'A blend of diverse artists and tracks',
      imageUrl: popVibe[0]?.album?.images?.[0]?.url || '',
      badge: 'FOR YOU',
      tracks: otherTracks.length > 0 ? otherTracks : MOCK_TRACKS,
    },
  ];
}
