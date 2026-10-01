import type { Metadata } from 'next';
import { useEffect } from 'react';
import './globals.css';
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth';
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer';
import { useBeatzStore } from '@/store/beatz-store';
import { QueueDrawer } from '@/components/QueueDrawer';
import BeatzChatDrawer from '@/components/BeatzChatDrawer';
import PlayerBar from '@/components/PlayerBar';

export const metadata: Metadata = {
  title: 'Beatz - AI-Powered Spotify Web Player',
  description: 'Unlocking free on-demand track selection, real-time queue orchestration, and conversational AI music curation.',
};

function AppShell({ children }: { children: React.ReactNode }) {
  'use client';

  const { isAuthenticated, accessToken } = useSpotifyAuth();
  const tickPlayer = useBeatzStore((state) => state.tickPlayer);
  const isQueueOpen = useBeatzStore((state) => state.isQueueOpen);
  const setQueueOpen = useBeatzStore((state) => state.setQueueOpen);
  const isChatOpen = useBeatzStore((state) => state.isChatOpen);
  const setChatOpen = useBeatzStore((state) => state.setChatOpen);

  useSpotifyPlayer({ accessToken, enabled: isAuthenticated });

  useEffect(() => {
    const interval = window.setInterval(() => {
      tickPlayer();
    }, 1000);

    return () => window.clearInterval(interval);
  }, [tickPlayer]);

  return (
    <>
      {children}
      <PlayerBar />
      <QueueDrawer isOpen={isQueueOpen} onClose={() => setQueueOpen(false)} />
      <BeatzChatDrawer isOpen={isChatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-spotify-dark text-white min-h-screen antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
