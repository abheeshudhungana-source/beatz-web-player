# Beatz 🎵

> A high-performance, focused web player and real-time audio queue orchestration client for Spotify.

Built as part of a 1-week focused clone sprint, **Beatz** cuts through the clutter of official streaming apps to deliver a lean, ultra-responsive audio experience centered around active session playback and queue manipulation.

---

## 🌟 Core Features

- **Persistent Sticky Player:** Real-time play/pause, seek scrubber, volume control, and dynamic metadata display (album artwork, artist, title).
- **Interactive Queue Drawer:** Slide-over queue manager with active playback status, upcoming track ordering, and one-click removal.
- **On-Demand Catalog Search:** Debounced search querying Spotify's global catalog with direct "Add to Queue" capabilities.
- **Audio Streaming Engine:** Powered by the official Spotify Web Playback SDK for direct in-browser audio delivery.

---

## 👥 The Team & Division of Labor

- **Backend Architecture & APIs Lead:** [Abheeshu Dhungana](https://github.com/)  
  *Spotify App setup, OAuth 2.0 PKCE flow, Web Playback SDK integration, REST API wrappers (`/queue`, `/search`), Zustand global store, and custom React hooks (`useSpotifyPlayer`).*
- **Frontend & UI/UX Design Lead:** [Erick Marcatoma](https://github.com/)  
  *Design system, dark Spotify theme layout, sticky bottom player bar, slide-over queue drawer, search view, and responsive design.*

---

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router, TypeScript)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [Lucide React](https://lucide.dev/)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Audio & API:** Spotify Web Playback SDK & Spotify Web API
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
Fill in your credentials from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard):
```env
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/auth/callback/spotify
```

### 3. Install Dependencies & Run
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚠️ Notes on Spotify Web Playback SDK
The official Spotify Web Playback SDK requires an authenticated user with an active **Spotify Premium account** to stream audio directly through the web browser. Free-tier accounts can authenticate and browse metadata, but audio streaming is restricted by Spotify's API.
