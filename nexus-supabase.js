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

  // NEXUS data facade: schema('hr').from('x') -> public view hr_x (RLS applies)
  const FACADE = {
    hr: ['leave_records','payroll_payments','sick_leave_records','request_templates','requests'],
    projects: ['tasks'],
    documents: ['documents'],
    finance: ['categories','accounts','transactions'],
    inventory: ['items'],
    fleet: ['vehicles','fuel_cards','fuel_transactions','vehicle_service_records','vehicle_service_lines'],
    procurement: ['warehouses','stock_items','stock_moves','purchase_orders','purchase_order_lines'],
    core: ['calendar_events','mail_messages']
  };
  const rawClient = window.nexusSupabase;
  const rawSchema = rawClient.schema.bind(rawClient);
  rawClient.schema = (name) => {
    const allowed = FACADE[name];
    if (!allowed) return rawSchema(name);
    return {
      from(table) {
        if (!allowed.includes(table)) return rawSchema(name).from(table);
        const q = rawClient.from(`${name}_${table}`);
        const up = q.upsert.bind(q);
        q.upsert = (values, opts) => up(values, { onConflict: 'id', ...(opts || {}) });
        return q;
      }
    };
  };
})();
