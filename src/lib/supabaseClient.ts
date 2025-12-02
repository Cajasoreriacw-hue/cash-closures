import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } from '$env/static/private';

let supabase: SupabaseClient | null = null;

if (VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY) {
  supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
}

export { supabase };
