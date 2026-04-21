/**
 * Data Access Layer for Supabase
 * 
 * Maps between DB rows and the app's TypeScript types.
 * All queries go through this module.
 */

import { supabase } from './supabase';
import type {
  MasterSong,
  SongVersion,
  ChordBlock,
  TheologicalAnalysis,
  Playlist,
  WorshipArrangement,
  LiturgicalTag,
  ChordLine,
  StageDirectionItem,
} from '@/types';

// === SONGS ===

export async function fetchAllSongs(): Promise<MasterSong[]> {
  // Fetch master songs with nested relations
  const { data: songs, error } = await supabase
    .from('master_songs')
    .select(`
      *,
      song_liturgical_tags(tag_id),
      theological_analyses(*),
      song_versions(
        *,
        version_artists(artist_name),
        chord_blocks(*)
      )
    `)
    .order('title');

  if (error) {
    console.error('Error fetching songs:', error);
    return [];
  }

  return (songs || []).map(mapDbSongToMasterSong);
}

export async function fetchSongById(id: string): Promise<MasterSong | null> {
  const { data, error } = await supabase
    .from('master_songs')
    .select(`
      *,
      song_liturgical_tags(tag_id),
      theological_analyses(*),
      song_versions(
        *,
        version_artists(artist_name),
        chord_blocks(*)
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapDbSongToMasterSong(data);
}

export async function searchSongs(query: string): Promise<MasterSong[]> {
  const { data, error } = await supabase
    .from('master_songs')
    .select(`
      *,
      song_liturgical_tags(tag_id),
      theological_analyses(*),
      song_versions(
        *,
        version_artists(artist_name),
        chord_blocks(*)
      )
    `)
    .or(`title.ilike.%${query}%,searchable_lyrics.ilike.%${query}%`)
    .order('title');

  if (error) return [];
  return (data || []).map(mapDbSongToMasterSong);
}

// === INSERT SONG ===

export async function insertSong(song: Omit<MasterSong, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
  // 1. Insert master song
  const { data: masterData, error: masterError } = await supabase
    .from('master_songs')
    .insert({
      title: song.title,
      original_composer: song.originalComposer || null,
      nature: song.nature,
      searchable_lyrics: song.searchableLyrics || null,
    })
    .select('id')
    .single();

  if (masterError || !masterData) {
    console.error('Error inserting song:', masterError);
    return null;
  }

  const songId = masterData.id;

  // 2. Insert liturgical tags
  if (song.liturgicalTags.length > 0) {
    await supabase.from('song_liturgical_tags').insert(
      song.liturgicalTags.map((tag) => ({ song_id: songId, tag_id: tag }))
    );
  }

  // 3. Insert analysis if provided
  if (song.analysis) {
    await supabase.from('theological_analyses').insert({
      song_id: songId,
      status: song.analysis.status,
      justification: song.analysis.justification,
      analyzed_by: song.analysis.analyzedBy,
      analyzed_at: song.analysis.analyzedAt || null,
      scripture_references: song.analysis.scriptureReferences || [],
    });
  }

  // 4. Insert versions with blocks
  for (const version of song.versions) {
    const { data: versionData, error: versionError } = await supabase
      .from('song_versions')
      .insert({
        master_song_id: songId,
        key: version.key,
        bpm: version.bpm,
        youtube_url: version.youtubeUrl || null,
        source_url: version.sourceUrl || null,
        is_default: version.isDefault,
      })
      .select('id')
      .single();

    if (versionError || !versionData) continue;

    const versionId = versionData.id;

    // Insert artists
    if (version.artists.length > 0) {
      await supabase.from('version_artists').insert(
        version.artists.map((name) => ({ version_id: versionId, artist_name: name }))
      );
    }

    // Insert blocks
    for (let i = 0; i < version.blocks.length; i++) {
      const block = version.blocks[i];
      await supabase.from('chord_blocks').insert({
        version_id: versionId,
        type: block.type,
        label: block.label,
        sort_order: i,
        repeat_count: block.repeatCount,
        directions: JSON.stringify(block.directions),
        lines: JSON.stringify(block.lines),
      });
    }
  }

  return songId;
}

// === PLAYLISTS ===

export async function fetchAllPlaylists(): Promise<Playlist[]> {
  const { data, error } = await supabase
    .from('playlists')
    .select(`
      *,
      worship_arrangements(*)
    `)
    .order('service_date', { ascending: false });

  if (error) return [];
  return (data || []).map(mapDbPlaylistToPlaylist);
}

export async function fetchPlaylistById(id: string): Promise<Playlist | null> {
  const { data, error } = await supabase
    .from('playlists')
    .select(`
      *,
      worship_arrangements(*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapDbPlaylistToPlaylist(data);
}

// === MAPPERS ===

function mapDbSongToMasterSong(row: any): MasterSong {
  const analysis = row.theological_analyses?.[0];
  const versions = (row.song_versions || [])
    .map((v: any): SongVersion => ({
      id: v.id,
      masterSongId: v.master_song_id,
      artists: (v.version_artists || []).map((a: any) => a.artist_name),
      key: v.key,
      bpm: v.bpm,
      blocks: (v.chord_blocks || [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((b: any): ChordBlock => ({
          id: b.id,
          type: b.type,
          label: b.label,
          lines: typeof b.lines === 'string' ? JSON.parse(b.lines) : b.lines,
          directions: typeof b.directions === 'string' ? JSON.parse(b.directions) : (b.directions || []),
          repeatCount: b.repeat_count,
        })),
      youtubeUrl: v.youtube_url || undefined,
      sourceUrl: v.source_url || undefined,
      isDefault: v.is_default,
      createdAt: v.created_at,
      updatedAt: v.updated_at,
    }));

  return {
    id: row.id,
    title: row.title,
    originalComposer: row.original_composer || undefined,
    nature: row.nature,
    liturgicalTags: (row.song_liturgical_tags || []).map((t: any) => t.tag_id),
    analysis: analysis
      ? {
          id: analysis.id,
          status: analysis.status,
          justification: analysis.justification || '',
          analyzedBy: analysis.analyzed_by || '',
          analyzedAt: analysis.analyzed_at || '',
          scriptureReferences: analysis.scripture_references || [],
        }
      : undefined,
    versions,
    searchableLyrics: row.searchable_lyrics || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbPlaylistToPlaylist(row: any): Playlist {
  return {
    id: row.id,
    name: row.name,
    serviceType: row.service_type,
    serviceDate: row.service_date,
    arrangements: (row.worship_arrangements || [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((a: any): WorshipArrangement => ({
        id: a.id,
        versionId: a.version_id,
        masterSongId: a.master_song_id,
        blockOrder: a.block_order || [],
        customDirections: a.custom_directions || undefined,
        transposedKey: a.transposed_key || undefined,
        createdAt: a.created_at,
      })),
    createdBy: row.created_by || 'Sistema',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
