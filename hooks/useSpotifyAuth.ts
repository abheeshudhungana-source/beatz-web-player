'use client';

import { useState, useEffect, useCallback } from 'react';
import { SpotifyUserProfile } from '@/types/spotify';

export function useSpotifyAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<SpotifyUserProfile | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/token');
      const data = await res.json();

      if (data.isAuthenticated && data.accessToken) {
        setIsAuthenticated(true);
        setAccessToken(data.accessToken);
        setUser(data.user);
      } else {
        setIsAuthenticated(false);
        setAccessToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to verify Spotify session:', err);
      setIsAuthenticated(false);
      setAccessToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = () => {
    window.location.href = '/api/auth/login';
  };

  const logout = () => {
    window.location.href = '/api/auth/logout';
  };

  return {
    isAuthenticated,
    isLoading,
    accessToken,
    user,
    checkAuth,
    login,
    logout,
  };
}
