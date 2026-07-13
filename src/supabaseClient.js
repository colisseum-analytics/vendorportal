import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Surfaces a clear message in the browser console instead of a
  // cryptic network error if setup isn't finished yet.
  console.warn(
    'Supabase env vars are missing. Copy .env.example to .env.local (or set ' +
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in your host) and restart.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
