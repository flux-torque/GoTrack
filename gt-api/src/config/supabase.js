/**
 * @file supabase.js
 * @description Supabase admin client using the service_role key.
 * This client bypasses Row Level Security and has full DB access.
 * NEVER expose this client or the service_role key to the frontend.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[config/supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from .env');
  process.exit(1);
}

/**
 * Admin Supabase client — server-side only.
 * Use this for all DB operations inside gt-api routes.
 */
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
