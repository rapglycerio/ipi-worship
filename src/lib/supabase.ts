import { createClient } from '@supabase/supabase-js';

// Fallback vazio para que o build do Next.js não quebre quando as variáveis
// de ambiente não estão presentes (e.g., na CI sem .env.local).
// Em runtime, as variáveis reais devem estar configuradas.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
