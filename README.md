# Beatz 🎵

> The AI-Powered Spotify Web Player. Unlocking free on-demand track selection & conversational AI music curation.

Built as part of a 1-week focused clone sprint, **Beatz** cuts through the clutter of official streaming apps to deliver a lean, ultra-responsive audio experience that directly solves Spotify's biggest consumer frustrations:

1. **Free On-Demand Listening:** Unlike Spotify Free which locks mobile users into forced shuffle mode, Beatz allows users to pick and play *any* song on demand (monetized by 3–5 ads/hr at 45s–2.5m).
2. **Conversational AI Music Chatbot ("Beatz AI"):** Spotify has no interactive chatbot. Beatz embeds an interactive AI co-pilot that can curate queues, shift vibes, and explain song lore via natural language using LLM tool calling.

---

## 🌟 Core Features

- **Conversational AI Co-Pilot ("Beatz AI"):** Talk to the embedded chatbot to generate queues (*"Put on 5 upbeat funk tracks for coding"*), shift vibes (*"Make this vibe darker"*), or ask trivia about the currently playing song.
- **Persistent Sticky Player:** Real-time play/pause, seek scrubber, volume control, and dynamic metadata display (album artwork, artist, title).
- **Interactive Queue Drawer:** Slide-over queue manager with active playback status, upcoming track ordering, and one-click removal.
- **On-Demand Catalog Search:** Debounced search querying Spotify's global catalog with direct "Play Now" and "Add to Queue" capabilities.
- **Audio Streaming Engine:** Powered by the official Spotify Web Playback SDK for direct in-browser audio delivery.

---

## 👥 The Team & Division of Labor

- **Backend Architecture & AI Lead:** [Abheeshu Dhungana](https://github.com/)  
  *Spotify App setup, OAuth 2.0 PKCE flow, Web Playback SDK streaming engine, REST API wrappers (`/queue`, `/search`), AI Chatbot backend (`/api/chat` with tool calling), Ad Scheduler engine (3–5 ads/hr), Zustand global store, and custom React hooks (`useSpotifyPlayer`, `useBeatzChat`).*
- **Frontend & UI/UX Design Lead:** [Erick Marcatoma](https://github.com/)  
  *Design system, dark Spotify theme layout, sticky bottom player bar, slide-over queue drawer, Beatz AI chatbot drawer with quick prompt chips, in-chat track recommendation cards, and ad interstitial countdown overlay.*

---

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router, TypeScript)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [Lucide React](https://lucide.dev/)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **AI & Audio Engine:** Spotify Web Playback SDK + Spotify Web API + Gemini / LLM API
- **Auth:** OAuth 2.0 with PKCE

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/beatz-web-player.git
cd beatz-web-player
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your credentials:
```env
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/auth/callback/spotify
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Install Dependencies & Run
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚠️ Notes on Spotify Web Playback SDK
The official Spotify Web Playback SDK requires an authenticated user with an active **Spotify Premium account** to stream audio directly through the web browser. Free-tier accounts can authenticate, chat with Beatz AI, and browse metadata, but audio streaming is restricted by Spotify's API.
