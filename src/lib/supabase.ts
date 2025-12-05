import { createClient } from "@supabase/supabase-js";

// Single Supabase browser client shared across the application.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing environment variable: VITE_SUPABASE_URL");
}

if (!supabaseAnonKey) {
  throw new Error("Missing environment variable: VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
