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

/** POST JSON to a server route that authorizes the action; returns its `ok`. */
async function postOk(url: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return false;
    const json = await res.json().catch(() => ({ ok: false }));
    return json?.ok === true;
  } catch {
    return false;
  }
}

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
    .order('title')
    .range(0, 9999);

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
  // PostgREST's `.or()` uses commas/parens as syntax and `%`/`_` as LIKE
  // wildcards. Strip those so a search like "graça, paz (2x)" can't break the
  // filter or inject wildcards.
  const safe = query.replace(/[,()%_*\\"]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!safe) return [];

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
    .or(`title.ilike.%${safe}%,searchable_lyrics.ilike.%${safe}%`)
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
      is_adjusted: song.isAdjusted ?? false,
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

// === PLAYLIST CRUD ===

export async function createPlaylist(data: {
  name: string;
  serviceType: string;
  serviceDate: string | null;
}): Promise<string | null> {
  const { data: result, error } = await supabase
    .from('playlists')
    .insert({
      name: data.name,
      service_type: data.serviceType,
      service_date: data.serviceDate,
      // created_by é UUID FK para auth.users — deixamos null (NextAuth não usa Supabase Auth)
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating playlist:', error);
    return null;
  }
  return result.id;
}

export async function updatePlaylist(
  id: string,
  data: { name?: string; serviceType?: string; serviceDate?: string | null }
): Promise<boolean> {
  const patch: Record<string, string | null> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.serviceType !== undefined) patch.service_type = data.serviceType;
  if (data.serviceDate !== undefined) patch.service_date = data.serviceDate;

  const { error } = await supabase.from('playlists').update(patch).eq('id', id);
  if (error) {
    console.error('Error updating playlist:', error);
    return false;
  }
  return true;
}

export async function deletePlaylist(id: string): Promise<boolean> {
  // Routed through a server endpoint that verifies the session — anon clients
  // can no longer delete playlists directly (RLS denies it).
  return postOk('/api/playlists/delete', { id });
}

export async function addSongToPlaylist(data: {
  playlistId: string;
  masterSongId: string;
  versionId: string;
  sortOrder: number;
}): Promise<string | null> {
  const { data: result, error } = await supabase
    .from('worship_arrangements')
    .insert({
      playlist_id: data.playlistId,
      master_song_id: data.masterSongId,
      version_id: data.versionId,
      sort_order: data.sortOrder,
      block_order: [],
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error adding song to playlist:', error);
    return null;
  }
  return result.id;
}

export async function removeArrangementFromPlaylist(arrangementId: string): Promise<boolean> {
  const { error } = await supabase
    .from('worship_arrangements')
    .delete()
    .eq('id', arrangementId);
  if (error) {
    console.error('Error removing arrangement:', error);
    return false;
  }
  return true;
}

export async function updateArrangementKey(
  arrangementId: string,
  key: string | null
): Promise<boolean> {
  const { error } = await supabase
    .from('worship_arrangements')
    .update({ transposed_key: key })
    .eq('id', arrangementId);
  if (error) {
    console.error('Error updating arrangement key:', error);
    return false;
  }
  return true;
}

export async function updateArrangementOrders(
  updates: { id: string; sortOrder: number }[]
): Promise<boolean> {
  const results = await Promise.all(
    updates.map(({ id, sortOrder }) =>
      supabase.from('worship_arrangements').update({ sort_order: sortOrder }).eq('id', id)
    )
  );
  return results.every(({ error }) => !error);
}

// === SONG CRUD ===

export async function deleteSong(id: string): Promise<boolean> {
  // Admin-only, enforced server-side (RLS denies anon DELETE on master_songs).
  return postOk('/api/admin/delete-song', { id });
}

export async function updateSongMetadata(
  id: string,
  data: {
    title?: string;
    originalComposer?: string;
    nature?: string;
    liturgicalTags?: LiturgicalTag[];
    isAdjusted?: boolean;
  }
): Promise<boolean> {
  const patch: Record<string, string | boolean | null> = {};
  if (data.title !== undefined) patch.title = data.title;
  if (data.originalComposer !== undefined) patch.original_composer = data.originalComposer || null;
  if (data.nature !== undefined) patch.nature = data.nature;
  if (data.isAdjusted !== undefined) patch.is_adjusted = data.isAdjusted;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from('master_songs').update(patch).eq('id', id);
    if (error) {
      console.error('Error updating song:', error);
      return false;
    }
  }

  if (data.liturgicalTags !== undefined) {
    await supabase.from('song_liturgical_tags').delete().eq('song_id', id);
    if (data.liturgicalTags.length > 0) {
      await supabase.from('song_liturgical_tags').insert(
        data.liturgicalTags.map((tag) => ({ song_id: id, tag_id: tag }))
      );
    }
  }

  return true;
}

export async function updateVersionBlocks(
  versionId: string,
  blocks: import('@/types').ChordBlock[]
): Promise<boolean> {
  // Delete all existing blocks for this version
  const { error: deleteError } = await supabase
    .from('chord_blocks')
    .delete()
    .eq('version_id', versionId);

  if (deleteError) {
    console.error('Error deleting blocks:', deleteError);
    return false;
  }

  // Re-insert in new order
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const { error } = await supabase.from('chord_blocks').insert({
      version_id: versionId,
      type: block.type,
      label: block.label,
      sort_order: i,
      repeat_count: block.repeatCount,
      directions: JSON.stringify(block.directions),
      lines: JSON.stringify(block.lines),
    });
    if (error) {
      console.error('Error inserting block:', error);
      return false;
    }
  }

  return true;
}

export async function updateVersionMetadata(
  versionId: string,
  data: {
    key?: string;
    bpm?: number;
    youtubeUrl?: string;
    artists?: string[];
  }
): Promise<boolean> {
  const patch: Record<string, unknown> = {};
  if (data.key !== undefined) patch.key = data.key;
  if (data.bpm !== undefined) patch.bpm = data.bpm;
  if (data.youtubeUrl !== undefined) patch.youtube_url = data.youtubeUrl || null;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from('song_versions').update(patch).eq('id', versionId);
    if (error) {
      console.error('Error updating version:', error);
      return false;
    }
  }

  if (data.artists !== undefined) {
    await supabase.from('version_artists').delete().eq('version_id', versionId);
    if (data.artists.length > 0) {
      await supabase.from('version_artists').insert(
        data.artists.map((name) => ({ version_id: versionId, artist_name: name }))
      );
    }
  }

  return true;
}

// === SUGGESTIONS ===

export async function fetchSuggestions(): Promise<import('@/types').SongSuggestion[]> {
  const { data, error } = await supabase
    .from('song_suggestions')
    .select('*, master_songs(id, title, nature)')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    masterSongId: row.master_song_id,
    suggestedByEmail: row.suggested_by_email,
    suggestedByName: row.suggested_by_name,
    message: row.message || undefined,
    createdAt: row.created_at,
    songTitle: row.master_songs?.title,
    songNature: row.master_songs?.nature,
  }));
}

export async function addSuggestion(data: {
  masterSongId: string;
  email: string;
  name: string;
  message?: string;
}): Promise<boolean> {
  const { error } = await supabase.from('song_suggestions').insert({
    master_song_id: data.masterSongId,
    suggested_by_email: data.email,
    suggested_by_name: data.name,
    message: data.message || null,
  });
  if (error) { console.error('Error adding suggestion:', error); return false; }
  return true;
}

export async function removeSuggestion(id: string): Promise<boolean> {
  const { error } = await supabase.from('song_suggestions').delete().eq('id', id);
  if (error) { console.error('Error removing suggestion:', error); return false; }
  return true;
}

// === THEOLOGICAL ANALYSIS ===

/**
 * Create or replace the theological analysis (parecer pastoral) for a song.
 * There's no unique constraint on song_id, and the reader takes the first row,
 * so we delete any existing rows and insert a fresh one to avoid duplicates.
 */
export async function upsertSongAnalysis(
  songId: string,
  data: {
    status: 'approved' | 'rejected' | 'pending';
    justification: string;
    analyzedBy: string;
    scriptureReferences?: string[];
  }
): Promise<boolean> {
  await supabase.from('theological_analyses').delete().eq('song_id', songId);
  const { error } = await supabase.from('theological_analyses').insert({
    song_id: songId,
    status: data.status,
    justification: data.justification || null,
    analyzed_by: data.analyzedBy || null,
    analyzed_at: new Date().toISOString(),
    scripture_references: data.scriptureReferences ?? [],
  });
  if (error) { console.error('Error saving analysis:', error); return false; }
  return true;
}

// === USER MANAGEMENT ===

export interface AppUserRecord {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
  role: string;
  createdAt: string;
  lastSeen: string;
}

export async function fetchAllUsers(): Promise<AppUserRecord[]> {
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('Error fetching users:', error); return []; }
  return (data || []).map((row: any) => ({
    id: row.id,
    email: row.email,
    name: row.display_name ?? null,
    image: row.photo_url ?? null,
    isAdmin: row.role === 'admin',
    role: row.role,
    createdAt: row.created_at,
    lastSeen: row.last_seen,
  }));
}

export async function setUserAdmin(userId: string, admin: boolean): Promise<boolean> {
  // Admin-only, enforced server-side (RLS denies anon writes to app_users, so
  // nobody can self-promote by calling Supabase directly).
  return postOk('/api/admin/set-role', { userId, admin });
}

// NOTE: getUserRole / upsertAppUser moved to src/lib/data-admin.ts — they run
// server-side with the service_role key (app_users is read-only for anon).

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
    isAdjusted: row.is_adjusted ?? false,
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
    createdBy: 'Equipe', // created_by no DB é UUID FK para auth.users; exibe nome genérico
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
