# BEATZ: Master Implementation Plan & Architecture Spec
**Sprint Duration:** 1-Week MVP  
**Product:** Beatz (Lightweight Spotify Web Player & Queue Manager)  
**Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Zustand, Spotify Web Playback SDK, Spotify Web API  

---

## Team Division of Labor

To work in parallel without blocking each other, we use a **Contract-First Architecture**:
* **Backend & API Architecture Lead (You):** Auth (OAuth 2.0 PKCE / token refresh), Spotify Web API wrappers, Web Playback SDK initialization & device transfer, Zustand global store, and custom React hooks (`useSpotifyPlayer`, `useSpotifyQueue`, `useAuth`).
* **Frontend & Design Lead (Your Partner):** UI components (Player bar, queue drawer, search view), Tailwind styling & animations, layout responsiveness, user interaction polish, and binding to your custom hooks.

---

## 1. System Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                FRONTEND (Partner)                               │
│                                                                                 │
│   ┌────────────────────────┐  ┌─────────────────────────┐  ┌────────────────┐   │
│   │  Sticky Bottom Player  │  │   Active Queue Drawer   │  │ Search & List  │   │
│   │  (Scrubber, Transport) │  │   (Reorder, Item Cards) │  │ (Track Cards)  │   │
│   └───────────┬────────────┘  └────────────┬────────────┘  └────────┬───────┘   │
└───────────────┼────────────────────────────┼────────────────────────┼───────────┘
                │                            │                        │
                ▼                            ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CONTRACT HOOKS & STORE (You)                            │
│                                                                                 │
│   ┌──────────────────────┐  ┌───────────────────────┐  ┌────────────────────┐   │
│   │  useSpotifyPlayer()  │  │   useSpotifyQueue()   │  │     useAuth()      │   │
│   └──────────┬───────────┘  └───────────┬───────────┘  └─────────┬──────────┘   │
│              │                          │                        │              │
│              ▼                          ▼                        ▼              │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                    Zustand Global Player Store                          │   │
│   │  { currentTrack, isPlaying, progressMs, durationMs, queue, volume... }  │   │
│   └──────────────────────┬──────────────────────────┬───────────────────────┘   │
└──────────────────────────┼──────────────────────────┼───────────────────────────┘
                           │                          │
              ┌────────────┴─────────────┐            │
              ▼                          ▼            ▼
┌───────────────────────────┐  ┌──────────────────────────────────────────────────┐
│  Spotify Web Playback SDK │  │               Spotify REST API                   │
│  (Real-Time Audio Stream) │  │  (GET /queue, POST /queue, GET /search, Play)    │
└───────────────────────────┘  └──────────────────────────────────────────────────┘
```

---

## 2. Shared Data Contracts (`types/spotify.ts`)

Both frontend and backend will code against these exact TypeScript interfaces:

```typescript
// types/spotify.ts

export interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
}

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  uri: string;
  images: SpotifyImage[];
}

export interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  durationMs: number;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  previewUrl?: string | null;
}

export interface QueueState {
  currentlyPlaying: SpotifyTrack | null;
  upcomingTracks: SpotifyTrack[];
  isLoading: boolean;
  error: string | null;
}

export interface PlayerPlaybackState {
  deviceId: string | null;
  isReady: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  currentTrack: SpotifyTrack | null;
  progressMs: number;
  durationMs: number;
  volume: number; // 0.0 to 1.0
  shuffle: boolean;
  repeatMode: 0 | 1 | 2; // 0 = off, 1 = context, 2 = track
}
```

---

## 3. Backend Track: Step-by-Step Architecture (Your Deliverables)

### Milestone B1: Spotify App Registration & Auth Setup
1. Register application at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard).
2. Set Redirect URI: `http://localhost:3000/api/auth/callback/spotify` (and production URL).
3. Request required OAuth Scopes:
   - `streaming` (for Web Playback SDK)
   - `user-read-email` & `user-read-private` (account verification)
   - `user-read-playback-state` & `user-modify-playback-state` (transport control)
   - `user-read-currently-playing` (live sync)

### Milestone B2: API Wrappers (`lib/spotify.ts`)
Create resilient REST API clients for the frontend to consume:
- `fetchCurrentQueue(accessToken: string): Promise<QueueState>`
- `addToSpotifyQueue(uri: string, accessToken: string): Promise<boolean>`
- `searchTracks(query: string, accessToken: string): Promise<SpotifyTrack[]>`
- `transferPlaybackToDevice(deviceId: string, accessToken: string): Promise<void>`

### Milestone B3: Web Playback SDK Engine & Zustand Store (`store/usePlayerStore.ts`)
1. Dynamically inject `https://sdk.scdn.co/spotify-player.js`.
2. Define `window.onSpotifyWebPlaybackSDKReady`.
3. Wire up listeners:
   - `ready`: capture `device_id` and auto-transfer active playback.
   - `not_ready`: handle device disconnection.
   - `player_state_changed`: pipe current position, duration, and track info directly to the Zustand store.
   - `account_error`: show friendly message if account is not Spotify Premium.

---

## 4. Frontend Track: UI Components & Design (Your Partner's Deliverables)

### Theme Palette (Spotify Dark Aesthetic)
* Background Primary: `#121212`
* Background Surface (Cards/Player): `#181818`
* Background Hover/Border: `#282828`
* Brand Accent / Highlights: `#1DB954` (Spotify Green)
* Text Primary: `#FFFFFF`
* Text Muted / Subtitles: `#A7A7A7`

### Milestone F1: App Layout & Navigation
* Responsive full-height container with sticky player bar anchored at bottom (`fixed bottom-0 left-0 right-0 h-24`).
* Top search header with instant query clearing and debounced input.
* Main content view for track results or active queue view.

### Milestone F2: Persistent Player Bar Component (`components/PlayerBar.tsx`)
* **Left Section:** Album art thumbnail (64x64), Track Title (bold, truncated), Artist Names (muted, truncated).
* **Center Section:**
  * Transport buttons: Shuffle, Previous, Big Play/Pause Toggle, Next, Repeat.
  * Time Scrubber: Current timestamp (`01:24`), custom draggable range slider, Total duration (`03:45`).
* **Right Section:**
  * Queue Drawer toggle button (with active badge count).
  * Volume icon (Mute toggle) + Volume slider (`0%` - `100%`).

### Milestone F3: Interactive Queue Drawer (`components/QueueDrawer.tsx`)
* Slide-over right drawer or modal overlay.
* "Now Playing" highlight card.
* "Next in Queue" list view with smooth hover effects, track duration, and clear/remove action buttons.
* Optimistic drag-and-drop or up/down reordering.

---

## 5. Day-by-Day Parallel Sprint Plan

| Day | Backend Track (You) | Frontend Track (Your Partner) |
|---|---|---|
| **Day 1** | Register Spotify App, configure `.env.local`, setup Next.js auth routes / PKCE token handler. | Scaffold Next.js + Tailwind project, configure color tokens, build basic application layout shell. |
| **Day 2** | Build `lib/spotify.ts` API wrappers (`/queue`, `/search`, `/play`). Create mock data responses. | Build static `PlayerBar` UI with mock data (`currentTrack`, duration slider, dummy play/pause state). |
| **Day 3** | Implement Web Playback SDK initialization script and `window.Spotify.Player` lifecycle bindings. | Build static `QueueDrawer` UI with mock upcoming tracks list and open/close drawer transitions. |
| **Day 4** | Build Zustand player store and implement `transferPlaybackToDevice()` with auto-activation. | Connect `PlayerBar` UI to Zustand store hooks (`togglePlay`, `seek`, `setVolume`, `next`, `prev`). |
| **Day 5** | Connect Queue API (`GET /v1/me/player/queue` & `POST /v1/me/player/queue`) with optimistic state updates. | Connect `QueueDrawer` and build `SearchBar` with debounced input and "Add to Queue" button. |
| **Day 6** | Error boundaries: Non-Premium 403 handling, token auto-refresh interval, rate-limit retries. | Responsive design polish (mobile bottom sheet vs desktop dock), hover states, volume transitions. |
| **Day 7** | End-to-end integration test (Auth -> Stream -> Queue -> Search), Vercel production deployment. | Final aesthetic polish, typography alignment, empty states ("Queue is empty"), demo prep. |

---

## 6. Copy-Paste Code Scaffolding

### A. Backend Store (`store/usePlayerStore.ts`)
```typescript
import { create } from 'zustand';
import { PlayerPlaybackState, SpotifyTrack } from '@/types/spotify';

interface PlayerStore extends PlayerPlaybackState {
  setPlayerState: (state: Partial<PlayerPlaybackState>) => void;
  setCurrentTrack: (track: SpotifyTrack | null) => void;
  setProgress: (progressMs: number) => void;
  setVolume: (volume: number) => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  deviceId: null,
  isReady: false,
  isPlaying: false,
  isPaused: true,
  currentTrack: null,
  progressMs: 0,
  durationMs: 0,
  volume: 0.8,
  shuffle: false,
  repeatMode: 0,
  setPlayerState: (newState) => set((prev) => ({ ...prev, ...newState })),
  setCurrentTrack: (track) => set({ currentTrack: track }),
  setProgress: (progressMs) => set({ progressMs }),
  setVolume: (volume) => set({ volume }),
}));
```

### B. Frontend Custom Hook Contract (`hooks/useSpotifyPlayer.ts`)
```typescript
import { usePlayerStore } from '@/store/usePlayerStore';

export function useSpotifyPlayer() {
  const state = usePlayerStore();

  const togglePlay = async () => {
    if (!window.spotifyPlayerInstance) return;
    await window.spotifyPlayerInstance.togglePlay();
  };

  const nextTrack = async () => {
    if (!window.spotifyPlayerInstance) return;
    await window.spotifyPlayerInstance.nextTrack();
  };

  const previousTrack = async () => {
    if (!window.spotifyPlayerInstance) return;
    await window.spotifyPlayerInstance.previousTrack();
  };

  const seek = async (positionMs: number) => {
    if (!window.spotifyPlayerInstance) return;
    await window.spotifyPlayerInstance.seek(positionMs);
    usePlayerStore.getState().setProgress(positionMs);
  };

  const changeVolume = async (volume: number) => {
    if (!window.spotifyPlayerInstance) return;
    await window.spotifyPlayerInstance.setVolume(volume);
    usePlayerStore.getState().setVolume(volume);
  };

  return {
    ...state,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
    changeVolume,
  };
}
```

---

## 7. Crucial Edge Cases & Gotchas
1. **Spotify Premium Check:** Free tier users will get a `403 Forbidden` error when transferring playback. Have the frontend render an informative banner: *"Streaming requires an active Spotify Premium account. You can still search and manage queues."*
2. **Token Expiration:** Spotify OAuth access tokens expire after 3,600 seconds (1 hour). Backend must implement refresh token rotation so music doesn't cut out mid-session.
3. **Browser Autoplay Restrictions:** Browsers (Chrome/Safari) block audio from playing automatically without an initial user gesture. Ensure playback begins after an explicit click event.
