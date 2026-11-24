/* NEXUS ERP — Supabase client configuration */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://ympjloemmczbhiusosep.supabase.co';
  const SUPABASE_KEY = 'sb_publishable__8HImmQ5wLSTmIKz1N6cgQ_3GPF-J9-';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('[NEXUS] Supabase JS library is not loaded');
    return;
  }

  window.nexusSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  window.supabaseClient = window.nexusSupabase;
})();
