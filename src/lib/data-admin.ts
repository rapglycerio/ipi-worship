/**
 * SERVER-ONLY data access for privileged operations.
 *
 * These functions use the service_role client (bypasses RLS) and must only be
 * called from API route handlers or NextAuth callbacks — never from the client.
 * They back the operations that anonymous clients are no longer allowed to do
 * directly: changing user roles, registering users, and deleting songs/playlists.
 */
import { supabaseAdmin } from './supabase-admin';
import { supabase } from './supabase';

export async function getUserRole(email: string): Promise<string | null> {
  // Read-only and app_users SELECT stays public — use the anon client so that
  // role resolution keeps working even before the service_role key is set
  // (only privileged WRITES below require it).
  const { data, error } = await supabase
    .from('app_users')
    .select('role')
    .eq('email', email)
    .single();
  if (error || !data) return null;
  return data.role;
}

export async function upsertAppUser(user: {
  email: string;
  displayName: string;
  photoUrl?: string;
}): Promise<void> {
  await supabaseAdmin.from('app_users').upsert(
    {
      email: user.email,
      display_name: user.displayName,
      photo_url: user.photoUrl ?? null,
      last_seen: new Date().toISOString(),
    },
    { onConflict: 'email' }
  );
}

export async function setUserAdmin(userId: string, admin: boolean): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('app_users')
    .update({ role: admin ? 'admin' : 'member' })
    .eq('id', userId);
  if (error) { console.error('setUserAdmin:', error); return false; }
  return true;
}

export async function deleteSong(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from('master_songs').delete().eq('id', id);
  if (error) { console.error('deleteSong:', error); return false; }
  return true;
}

export async function deletePlaylist(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from('playlists').delete().eq('id', id);
  if (error) { console.error('deletePlaylist:', error); return false; }
  return true;
}

/** Playlists particulares do dono — RLS bloqueia isso para o cliente anônimo. */
export async function getPrivatePlaylistsForOwner(email: string): Promise<unknown[]> {
  const { data, error } = await supabaseAdmin
    .from('playlists')
    .select('*, worship_arrangements(*)')
    .eq('is_private', true)
    .eq('owner_email', email);
  if (error) { console.error('getPrivatePlaylistsForOwner:', error); return []; }
  return data ?? [];
}

/** app_users é só-leitura pra anon — salvar a preferência exige service_role. */
export async function setViewModePreference(email: string, viewMode: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('app_users')
    .update({ preferred_view_mode: viewMode })
    .eq('email', email);
  if (error) { console.error('setViewModePreference:', error); return false; }
  return true;
}
