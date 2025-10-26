import { createClient } from '@supabase/supabase-js';

// Server-side admin client (uses service role; do not expose to browser)
export function createSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, {
    // Ensure we use the public schema so writes are visible in the Supabase UI
    db: { schema: 'public' },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

