'use client';

import React, { useEffect } from 'react';
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth';
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer';
import { useBeatzStore } from '@/store/beatz-store';
import { QueueDrawer } from '@/components/QueueDrawer';
import BeatzChatDrawer from '@/components/BeatzChatDrawer';
import PlayerBar from '@/components/PlayerBar';

export default function AppShell({ children }: { children: React.ReactNode }) {
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
