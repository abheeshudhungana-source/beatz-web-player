# Product Requirements Document: Net New Build

**Build Name:** Beatz  
**Owner:** Abheeshu Dhungana (Backend Architecture & AI Lead), Erick Marcatoma (Frontend & UI/UX Design Lead)  
**Date:** September 23, 2026  
**Status:** Approved & Ready for Sprint Execution  

---

## 1. PROBLEM

Active music listeners on ad-supported streaming tiers (such as Spotify Free) are denied basic agency over their listening experience: they are forced into passive, station-based shuffle mode on mobile, barred from selecting specific songs on-demand, and penalized with a strict 6-skip-per-hour threshold. When users attempt to navigate around unwanted songs, the platform punishes them by compounding intrusive 30-second to 2-minute ad blocks. Furthermore, modern streaming platforms lack any real-time, interactive conversational assistance: Spotify’s "AI DJ" is a rigid, one-way synthetic voice that cannot receive user feedback, accept text requests, or adapt dynamically to conversational context.

### Supporting Context
* **Hostile Free Tier UX:** If an ad-supported Spotify mobile user skips tracks frequently, they hit a hard 6-skip lockout per hour and trigger an additional 1.5 to 6 minutes of consecutive penalty ads on top of the standard 1 to 8 minutes of baseline ad time.
* **Passive vs. Active AI:** While Spotify invested heavily in algorithmic recommendations and its voice-based "DJ", 0% of major streaming apps offer an interactive, conversational chatbot where users can ask for specific musical vibes, song lore, or natural-language queue curation.
* **Drop-off Point:** Industry research indicates that unpredictable, consecutive mid-track ad interruptions are the #1 driver of app abandonment and session termination among ad-supported listeners.

---

## 1a. OPPORTUNITY

By replacing the punitive shuffle-only model with **100% on-demand track selection** and embedding an **interactive AI Music Chatbot ("Beatz AI")**, Beatz transforms the free audio tier from a frustrating hostage experience into an active, delightful discovery tool. For the business, this removes the friction driving users away and creates an intensely retentive audience whose higher daily active minutes fund a transparent, predictable ad model (3–5 ads/hour, 45s–2.5m each) while providing a natural, high-converting funnel into premium subscriptions.

### Market Opportunity
The global music streaming market continues its multi-year expansion, with global recorded music revenues reaching **$31.7 billion** in 2025 (IFPI Global Music Report 2026). Streaming accounts for over 70% ($22+ billion) of total industry revenue. By solving the core friction of ad-supported streaming and supercharging it with generative conversational curation, Beatz captures a massive underserved segment of the global 800M+ ad-supported user base who crave on-demand agency without an immediate upfront subscription.

---

## 1b. USERS & NEEDS

### Primary User
* **Active Free-Tier Music Listeners:** Daily commuters, students, and professionals who use music streaming during work or exercise, want full control over their audio queue, and are willing to accept predictable, transparent ad breaks in exchange for true on-demand song choice.

### Secondary Users
* **Music Explorers & Curious Listeners:** Users who want to discover new genres, understand the lore/history of songs they are listening to, and curate custom playlists through conversational dialogue rather than tedious search filtering.
* **Audio Advertisers:** Brands seeking engaged, non-resentful listeners through scheduled, high-completion audio units placed at natural session transitions.

### Key User Needs
* **Need 1 (On-Demand Agency):** *As an active music listener, I need to search and play specific songs immediately on demand because my daily activities require precise mood curation, and forced shuffle ruins my workflow.*
* **Need 2 (Frictionless Navigation):** *As a free-tier user, I need to skip and reorder tracks without arbitrary 6-skip limits or punitive penalty ad loops because my taste changes in real time.*
* **Need 3 (Conversational Discovery):** *As a music explorer, I need to converse with an AI chatbot using natural language to build queues ("Queue 5 upbeat funk songs for coding") and learn about the artists I'm streaming.*
* **Need 4 (Predictable Ad Transparency):** *As a listener, I need clear countdown timers and predictable ad pacing so I know exactly when an ad break will end and audio will resume.*

---

## 2. PROPOSED SOLUTION

**Beatz** is an AI-powered, high-performance web streaming application that provides **100% on-demand track playback, real-time queue orchestration, and a conversational AI co-pilot** for modern listeners. Users simply search for any song or ask the embedded **Beatz AI Chatbot** to curate a vibe using plain English, and the system instantly streams the music, updates the interactive queue, and shares context about the tracks. The platform sustains free on-demand access through a transparent, decoupled ad model (3–5 scheduled breaks per hour, lasting 45s to 2.5m) featuring live countdown timers and zero skip penalties. As a result, listeners gain complete agency over their audio, discover music through natural conversation, and enjoy an uninterrupted, non-punitive listening flow.

---

## 2a. VALUE PROPOSITION

> **Active free-tier music listeners who struggle with restrictive shuffle-only playback, punitive skip lockouts, and passive recommendation feeds use Beatz, an AI-powered streaming web client, to play any song on demand and curate dynamic queues conversationally. Unlike Spotify Free which enforces forced shuffle and punitive ad penalties, Beatz delivers complete on-demand control, an interactive AI Music Chatbot, and transparent, predictable ad breaks, helping users maintain uninterrupted auditory immersion.**

---

## 2b. TOP 3 MVP VALUE PROPS

* **The Vitamin (Table Stakes):** A comprehensive Spotify catalog search and persistent, responsive audio player bar with instant play/pause, live scrubbing, and volume control.
* **The Painkiller (Core Problem Solver):** Complete on-demand playback with zero skip limits and zero penalty ad loops, decoupling ad delivery from user navigation.
* **The Steroid (The Standout Moat):** **Beatz AI Conversational Chatbot**, an integrated co-pilot powered by LLM tool calling that builds queues on the fly from natural-language prompts, shifts playlist vibes dynamically, and explains artist lore in real time.

---

## 2c. GOALS & NON-GOALS

### Goals (Outcomes to Achieve)
1. **Restore Complete User Agency:** Enable 100% on-demand track selection and unlimited skips across all tiers without triggering penalty ad loops.
2. **Launch Conversational Audio Curation:** Deploy the Beatz AI Chatbot with direct tool-calling integration into the active queue and playback engine.
3. **Establish Predictable, Non-Punitive Ad Economics:** Monetize non-paying users with a stable, transparent schedule of 3–5 ad breaks per hour (45s to 2.5m) featuring active countdown timers.
4. **Drive High Session Retention:** Increase average daily session length and user return rates by eliminating the #1 cause of streaming churn (hostile skip penalties).

### Non-Goals (Explicitly Out of Scope for MVP)
1. **Offline Device Caching & DRM Downloads:** Out of scope for a 1-week web sprint; requires complex encrypted local storage and native device sandboxing.
2. **Social Activity Streams & Collaborative Playlists:** Friend feeds, direct messaging, and multi-user live listening rooms are deferred to v2.
3. **Synced Karaoke Lyrics Engine:** Line-by-line lyric time-stamping and rendering is deferred to preserve engineering velocity on audio and AI core.

---

## 2d. SUCCESS METRICS

| Goal | Signal | Metric | Baseline (Spotify Free) | Target (Beatz MVP) |
|---|---|---|---|---|
| **Eliminate Skip Penalties** | Users skip freely without hitting lockouts | % of sessions hitting skip limit | 34% hit 6-skip lockout | **0%** (Limit eliminated) |
| **Increase Session Engagement** | Users stay active and keep streaming | Average session duration | 24 minutes | **> 38 minutes** (+58%) |
| **Conversational Curation Adoption** | Users interact with Beatz AI co-pilot | % of sessions utilizing Chatbot | 0% (No chatbot exists) | **> 40% of active sessions** |
| **AI Action Conversion Rate** | Chatbot suggestions are queued/played | Tool Execution Success Rate | N/A | **> 70%** acceptance rate |
| **Ad Retention & Flow Preservation** | Users stay through scheduled ad breaks | Post-ad drop-off rate | High drop-off (~28%) | **< 12% post-ad churn** |

---

## 3. REQUIREMENTS

### User Journey 1: Taking Control of Playback & Active Queue
*Goal: As a listener, I want to play any song on demand and manipulate my upcoming queue with zero artificial limits.*

#### Sub-journey 1.1: Audio Transport & Sticky Player Bar
* **[P0]** User can play and pause audio instantly from a sticky bottom player dock.
* **[P0]** User can skip forward to the next track or backward to the previous track without hitting a skip limit.
* **[P0]** User can scrub through the track timeline using an interactive seeker bar showing current progress and total duration (`mm:ss`).
* **[P0]** User can adjust and mute volume via a continuous slider.
* **[P0]** User can view currently playing track metadata (high-res album art, track title, artist name).
* **[P1]** User can toggle Shuffle and Repeat modes (Off / Repeat All / Repeat One).

#### Sub-journey 1.2: Interactive Queue Management
* **[P0]** User can open a slide-over Queue Drawer showing the currently playing track and all upcoming tracks.
* **[P0]** User can add any song from search results to the upcoming queue with a single click.
* **[P1]** User can reorder tracks in the upcoming queue via drag-and-drop or up/down controls.
* **[P1]** User can remove individual tracks from the upcoming queue.
* **[P2]** User can clear the entire upcoming queue with one confirmation click.

#### Sub-journey 1.3: Catalog Search
* **[P0]** User can search Spotify's global catalog via a debounced search input.
* **[P0]** User can view matching results showing track title, artist, album, and duration.
* **[P0]** User can trigger immediate playback of any search result ("Play Now").

---

### User Journey 2: Conversational Curation via Beatz AI Chatbot
*Goal: As a listener, I want to converse with an AI co-pilot in plain English to build queues, alter musical vibes, and discover song lore.*

#### Sub-journey 2.1: Conversational Interface
* **[P0]** User can toggle open the Beatz AI Chatbot panel from the player interface.
* **[P0]** User can submit natural language prompts (e.g., *"Queue up 5 high-energy synthwave songs for coding"*).
* **[P0]** User can see real-time streaming AI text responses formatted conversationally.
* **[P1]** User can tap 1-click Quick Prompt Chips (e.g., *"⚡ Boost Energy"*, *"🧠 Deep Focus"*, *"❓ Explain This Song"*).

#### Sub-journey 2.2: AI Tool Calling & Queue Execution
* **[P0]** System parses natural language requests into structured tool calls (`search_and_queue`, `play_track_now`).
* **[P0]** User sees interactive song recommendation cards rendered directly inside the chat thread.
* **[P0]** User can click "Play Now" or "Add to Queue" on any in-chat song card.
* **[P1]** User can ask questions about the currently playing song (lore, history, lyrical meaning) and receive contextual answers based on active track metadata.
* **[P1]** User can request vibe shifts (e.g., *"Make this queue moodier"*), and the system automatically updates the upcoming queue.

---

### User Journey 3: Transparent, Non-Punitive Ad Experience
*Goal: As a free listener, I want predictable ad breaks with clear time transparency rather than surprise penalty blocks.*

#### Sub-journey 3.1: Scheduled Ad Delivery
* **[P0]** System schedules 3–5 ad breaks per hour, lasting between 45 seconds and 2.5 minutes total.
* **[P0]** System completely decouples ad triggers from user skip frequency (skipping a track never triggers an ad penalty).
* **[P0]** System automatically pauses the active Spotify audio stream when an ad break begins and resumes playback when it concludes.

#### Sub-journey 3.2: Visual Transparency & Lockout Controls
* **[P0]** User sees a prominent, non-dismissible Ad Countdown Overlay (*"Ad break in progress: 1:15 remaining"*).
* **[P0]** System locks transport controls (seek, skip next) during active ad playback to prevent audio desync.
* **[P1]** User sees an upgrade call-to-action (*"Go Beatz Premium for $12.99/mo to remove all ads"*).

---

## 4. APPENDIX & TECHNICAL SPECIFICATIONS

### 4a. Technical Architecture & Component Division

```
┌────────────────────────────────────────────────────────────────────────┐
│                   FRONTEND & UI/UX LEAD: Erick                         │
│  • Modern Spotify Dark Theme & responsive layout shell                 │
│  • Sticky Player Bar (Seeker scrubber, transport buttons, volume)      │
│  • Slide-Over Queue Drawer (Upcoming list, reorder animations)         │
│  • Beatz AI Chat Drawer (Message bubbles, prompt chips, song cards)    │
│  • Ad Countdown Interstitial Overlay                                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Bound via Custom React Hooks
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                BACKEND ARCHITECTURE & AI LEAD: Abheeshu                │
│  • Spotify Developer App & OAuth 2.0 PKCE auth flow                    │
│  • Spotify Web Playback SDK streaming engine & browser device transfer │
│  • REST API Client wrappers (/v1/me/player/queue, /v1/search)          │
│  • LLM Chatbot Route (/api/chat) with Gemini Function Calling          │
│  • Ad Scheduler Engine (3-5 breaks/hr, timer & stream pause logic)     │
│  • Zustand Global Store & typed hooks (useSpotifyPlayer, useBeatzChat) │
└────────────────────────────────────────────────────────────────────────┘
```

### 4b. LLM Tool Calling Schema (Beatz AI Co-Pilot)
```typescript
interface SearchAndQueueTool {
  name: "search_and_queue_tracks";
  parameters: {
    query: string;           // e.g. "synthwave for coding"
    numberOfTracks: number;  // 1 to 5
    rationale: string;       // Context shown to user
  };
}

interface PlayTrackNowTool {
  name: "play_track_now";
  parameters: {
    trackNameOrUri: string;
    artistName?: string;
  };
}

interface ExplainCurrentTrackTool {
  name: "explain_current_track";
  parameters: {
    trackId: string;
    focusArea: "lore" | "composition" | "artist_background";
  };
}
```

### 4c. Technical Constraints & Prerequisites
1. **Spotify Premium Streaming Requirement:** The official Spotify Web Playback SDK requires an authenticated user with Spotify Premium to stream audio directly into the browser. Free-tier users can authenticate, search, curate queues, and use the AI Chatbot, but audio playback transfer requires Premium credentials due to Spotify's API DRM policy.
2. **Browser Autoplay Security:** Web browsers (Chrome, Safari, Firefox) require an explicit user gesture (click) before starting an audio context. Playback cannot start automatically on initial page load without a click.
3. **OAuth Token Lifespan:** Spotify access tokens expire after 3,600 seconds (1 hour). Backend automatically executes refresh token rotation in the background to ensure sessions do not drop mid-playback.
