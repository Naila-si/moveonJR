import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

console.log('[ENV] URL =', JSON.stringify(url));
console.log('[ENV] KEY present =', !!key);
try {
  console.log('[ENV] Hostname =', new URL(url).hostname);
} catch (e) {
  console.error('URL env invalid:', e);
}

export const supabase = createClient(url, key);
