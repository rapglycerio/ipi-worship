'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { MasterSong, Playlist } from '@/types';
import { fetchAllSongs, searchSongs as searchSongsApi, fetchAllPlaylists, fetchPrivatePlaylists } from '@/lib/data';

/**
 * Hook to fetch and cache songs from Supabase.
 * Falls back to mock data when Supabase is unavailable.
 */
export function useSongs() {
  const [songs, setSongs] = useState<MasterSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSongs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllSongs();
      if (data.length > 0) {
        setSongs(data);
      } else {
        // Fallback to mock data if DB is empty
        const { mockSongs } = await import('@/data/mock-songs');
        setSongs(mockSongs);
      }
    } catch (e) {
      console.warn('Supabase fetch failed, using mock data:', e);
      setError('Falha ao conectar com o banco de dados');
      const { mockSongs } = await import('@/data/mock-songs');
      setSongs(mockSongs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

  const searchSongs = useCallback(async (query: string): Promise<MasterSong[]> => {
    if (!query.trim()) return songs;
    try {
      const results = await searchSongsApi(query);
      return results.length > 0 ? results : songs.filter((s) => {
        const q = query.toLowerCase();
        return (
          s.title?.toLowerCase().includes(q) ||
          s.versions?.some((v) => v.artists?.some((a) => a?.toLowerCase().includes(q))) || false
        );
      });
    } catch {
      // Local filter fallback
      const q = query.toLowerCase();
      return songs.filter((s) =>
        s.title?.toLowerCase().includes(q) ||
        s.versions?.some((v) => v.artists?.some((a) => a?.toLowerCase().includes(q))) || false
      );
    }
  }, [songs]);

  return { songs, loading, error, refetch: loadSongs, searchSongs };
}

/**
 * Hook to fetch playlists from Supabase.
 */
export function usePlaylists() {
  const { data: session } = useSession();
  const ownerEmail = session?.user?.email ?? null;
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPlaylists = useCallback(async () => {
    setLoading(true);
    try {
      const [publicData, privateData] = await Promise.all([
        fetchAllPlaylists(),
        ownerEmail ? fetchPrivatePlaylists() : Promise.resolve([]),
      ]);
      const data = [...privateData, ...publicData];
      if (data.length > 0) {
        setPlaylists(data);
      } else {
        // Fallback to mock
        const { mockPlaylist } = await import('@/data/mock-songs');
        setPlaylists([mockPlaylist]);
      }
    } catch {
      const { mockPlaylist } = await import('@/data/mock-songs');
      setPlaylists([mockPlaylist]);
    } finally {
      setLoading(false);
    }
  }, [ownerEmail]);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  return { playlists, loading, refetch: loadPlaylists };
}
