# BEATZ: Master Implementation Plan & Architecture Spec
**Sprint Duration:** 1-Week MVP  
**Product:** Beatz (AI-Powered Spotify Web Player & Queue Orchestrator)  
**Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Zustand, Spotify Web Playback SDK, Spotify Web API, Gemini / LLM API  

---

## Executive Summary & Core Value Proposition

**Beatz** solves Spotify's two biggest limitations:
1. **Free On-Demand Listening:** Unlike Spotify Free which forces shuffle mode on mobile, Beatz allows users to pick and play *any* song on demand (monetized by a higher ad density: 3–5 ads/hr, 45s–2.5m each).
2. **Conversational AI Music Chatbot ("Beatz AI"):** Spotify offers no interactive chatbot. Beatz integrates a conversational AI co-pilot capable of curating queues, modifying vibes via natural language, and answering music trivia about the active track using LLM Tool Calling.

---

## Team Division of Labor (Contract-First)

* **Backend & API Architecture Lead (You):**
  - Spotify OAuth 2.0 PKCE flow & token refresh rotation.
  - Spotify Web Playback SDK streaming engine and device transfer.
  - REST API wrappers (`/queue`, `/search`, `/player`).
  - **AI Chatbot Backend:** `/api/chat` route with LLM Function Calling (`searchAndQueue`, `playTrack`, `getCurrentlyPlaying`, `explainTrack`).
  - **Ad Scheduler Engine:** State machine handling 3–5 ad breaks/hr (45s–2.5m), pausing playback, and locking controls.
  - Zustand global store & custom React hooks (`useSpotifyPlayer`, `useSpotifyQueue`, `useBeatzChat`).

* **Frontend & UI/UX Design Lead (Erick):**
  - Dark Spotify design system & responsive layout shell.
  - Sticky bottom player bar with scrubber, transport buttons, and volume control.
  - Slide-over interactive queue drawer with optimistic reordering.
  - **Chatbot UI Drawer / Widget:** Message thread, quick prompt chips ("⚡ Boost Energy", "🧠 Deep Focus", "❓ Song Trivia"), and playable track recommendation cards.
  - **Ad Break Interstitial Banner:** Countdown overlay (*"Ad break in progress: 1:30 remaining"*).

---

## 1. System Architecture & Data Flow

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                FRONTEND (Erick)                                   │
│                                                                                   │
│   ┌──────────────────────┐  ┌───────────────────────┐  ┌──────────────────────┐   │
│   │ Sticky Player Bar    │  │ Interactive Queue     │  │ Beatz AI Chat Drawer │   │
│   │ (Transport, Scrubber)│  │ (Slide-over, Reorder) │  │ (Messages, Chips)    │   │
│   └──────────┬───────────┘  └───────────┬───────────┘  └──────────┬───────────┘   │
└──────────────┼──────────────────────────┼─────────────────────────┼───────────────┘
               │                          │                         │
               ▼                          ▼                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                          CONTRACT HOOKS & STORE (You)                             │
│                                                                                   │
│   ┌─────────────────────┐    ┌────────────────────┐    ┌──────────────────────┐   │
│   │ useSpotifyPlayer()  │    │ useSpotifyQueue()  │    │   useBeatzChat()     │   │
│   └──────────┬──────────┘    └──────────┬─────────┘    └──────────┬───────────┘   │
│              │                          │                         │               │
│              ▼                          ▼                         ▼               │
│   ┌───────────────────────────────────────────────────────────────────────────┐   │
│   │                     Zustand Global Player Store                           │   │
│   │  { currentTrack, isPlaying, queue, adState, chatHistory, volume... }      │   │
│   └──────────┬──────────────────────────┬─────────────────────────┬───────────┘   │
└──────────────┼──────────────────────────┼─────────────────────────┼───────────────┘
               │                          │                         │
               ▼                          ▼                         ▼
┌──────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│ Spotify Web Playback SDK │ │   Spotify REST API      │ │ LLM API (/api/chat)     │
│ (Streaming Audio Engine) │ │ (Queue, Search, Control)│ │ (Tool Calling Engine)   │
└──────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘
```

---

## 2. Shared Data Contracts (`types/spotify.ts`)

```typescript
export interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
}

export interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  durationMs: number;
  artists: SpotifyArtist[];
  album: {
    id: string;
    name: string;
    images: { url: string; height: number; width: number }[];
  };
}

export interface QueueState {
  currentlyPlaying: SpotifyTrack | null;
  upcomingTracks: SpotifyTrack[];
  isLoading: boolean;
}

export interface AdBreakState {
  isAdPlaying: boolean;
  adDurationMs: number;
  adProgressMs: number;
  adIndex: number;
  totalAdsInBreak: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestedTracks?: SpotifyTrack[];
  actionExecuted?: 'queued' | 'played' | 'info';
  timestamp: number;
}
```

---

## 3. AI Chatbot Tool Calling Definition (Backend `/api/chat`)

When the user chats with **Beatz AI**, the backend provides these executable tools to the LLM:

1. `search_and_queue_tracks(query: string, count: number)`: Automatically finds songs matching user's vibe and appends them to the queue.
2. `play_track_now(track_query: string)`: Finds the best matching track and starts playback immediately.
3. `get_current_playback_context()`: Inspects currently playing artist, song, and genre to answer trivia or find sonic matches.
4. `clear_and_replace_queue(genre_or_mood: string)`: Wipes the upcoming queue and generates a fresh set of matching songs.

---

## 4. 7-Day Parallel Sprint Plan

| Day | Backend & API Track (You) | Frontend & Design Track (Erick) |
|---|---|---|
| **Day 1** | App setup on Spotify Dashboard, OAuth 2.0 PKCE auth flow, token refresh handler | Next.js + Tailwind scaffold, Spotify dark color tokens, app layout shell |
| **Day 2** | `lib/spotify.ts` API wrappers (`/queue`, `/search`) with mock fallback data | Static `PlayerBar` UI with mock song metadata, transport buttons, scrubber |
| **Day 3** | Web Playback SDK script injection, device ID registration, stream lifecycle bridge | Static `QueueDrawer` slide-over component with mock song queue and transitions |
| **Day 4** | Build Zustand player store + Ad Scheduler engine (3-5 ads/hr, 45s-2.5m) | Connect `PlayerBar` to Zustand hooks; build Ad interstitial countdown banner |
| **Day 5** | Build `/api/chat` route with LLM tool calling (`search_and_queue`, `play_track`) | Build `BeatzChat` slide-over widget with prompt chips and track cards |
| **Day 6** | Connect Chatbot tools to live player state; 403 Non-Premium banner handling | Mobile vs desktop responsive polish, chat bubble animations, empty states |
| **Day 7** | End-to-end integration (Auth -> Play -> Queue -> Chat -> Ads) & Vercel deployment | Final typography & layout consistency, presentation slides & demo walkthrough |
