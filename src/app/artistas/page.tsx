'use client';

import { useMemo } from 'react';
import { mockSongs, getDefaultVersion } from '@/data/mock-songs';
import Link from 'next/link';
import {
  Users,
  Music2,
  ChevronRight,
  Disc3,
} from 'lucide-react';

interface ArtistInfo {
  name: string;
  songCount: number;
  songs: { id: string; title: string }[];
}

export default function ArtistasPage() {
  const artists = useMemo(() => {
    const map = new Map<string, ArtistInfo>();

    mockSongs.forEach((song) => {
      song.versions.forEach((v) => {
        v.artists.forEach((artist) => {
          const existing = map.get(artist);
          if (existing) {
            // Avoid duplicate songs for same artist
            if (!existing.songs.some((s) => s.id === song.id)) {
              existing.songCount++;
              existing.songs.push({ id: song.id, title: song.title });
            }
          } else {
            map.set(artist, {
              name: artist,
              songCount: 1,
              songs: [{ id: song.id, title: song.title }],
            });
          }
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => b.songCount - a.songCount);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-5 md:px-8 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Artistas</h1>
            <p className="text-xs text-muted">{artists.length} artista(s) no repertório</p>
          </div>
        </div>
      </div>

      {/* Artist Cards */}
      <div className="px-5 md:px-8 pb-12 space-y-2">
        {artists.map((artist, i) => (
          <div
            key={artist.name}
            className="bg-card border border-border rounded-xl p-4 hover:border-accent/30 transition-all duration-200 animate-slide-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full bg-accent-subtle flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-accent">
                  {artist.name.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{artist.name}</h3>
                <p className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                  <Disc3 className="w-3 h-3" />
                  {artist.songCount} música{artist.songCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Song List */}
            <div className="mt-3 space-y-1">
              {artist.songs.map((song) => (
                <Link
                  key={song.id}
                  href={`/musica/${song.id}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-elevated hover:bg-border transition-colors text-xs cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Music2 className="w-3.5 h-3.5 text-subtle shrink-0" />
                    <span className="text-muted group-hover:text-accent transition-colors truncate">
                      {song.title}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-subtle group-hover:text-accent transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
