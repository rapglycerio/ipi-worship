import { createClient } from '@supabase/supabase-js';

/**
 * SERVER-ONLY Supabase client using the `service_role` key, which bypasses RLS.
 *
 * NEVER import this from a Client Component. The key is read from
 * SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_ prefix), so Next.js keeps it out of
 * the browser bundle. It is used only by API route handlers and NextAuth
 * callbacks to perform privileged writes (role changes, deletes, user upserts)
 * that anonymous clients are no longer allowed to do.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
