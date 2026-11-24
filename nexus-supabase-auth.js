/* NEXUS ERP — Supabase Auth bridge */
(() => {
  'use strict';

  const client = () => window.nexusSupabase || window.supabaseClient || null;

  function normalizeUsername(login) {
    return String(login || '').trim().toLowerCase();
  }

  function authEmailForUsername(login) {
    const username = normalizeUsername(login);
    if (!/^[a-z0-9][a-z0-9_.-]{1,30}[a-z0-9]$/.test(username) || username.includes('..')) {
      throw new Error('Логін має містити 3–32 латинські літери, цифри або символи _ . -');
    }
    return `${username}@login.nexus.invalid`;
  }

  function normalizeContext(context) {
    const memberships = Array.isArray(context?.memberships) ? context.memberships : [];
    const permissions = Array.isArray(context?.permissions) ? context.permissions : [];
    const membership = memberships[0] || null;
    return {
      userId: context?.user_id || null,
      memberships,
      membership,
      tenantId: membership?.tenant_id || null,
      companyId: membership?.company_id || null,
      branchId: membership?.branch_id || null,
      permissions
    };
  }

  async function getSession() {
    const supabase = client();
    if (!supabase) return { session: null, user: null, context: null };
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session) return { session: null, user: null, context: null };
    const contextResult = await supabase.rpc('nexus_current_context');
    const profileResult = await supabase.rpc('nexus_profile');
    if (contextResult.error) throw contextResult.error;
    if (profileResult.error) throw profileResult.error;
    return {
      session: data.session,
      user: data.session.user,
      context: normalizeContext(contextResult.data),
      profile: profileResult.data || null
    };
  }

  async function signIn(login, password) {
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    const email = authEmailForUsername(login);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return getSession();
  }

  async function manageUsers(payload) {
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    const { data, error } = await supabase.functions.invoke('nexus-user-admin', { body: payload });
    if (error) {
      let message = error.message || 'Помилка керування користувачами';
      if (error.context && typeof error.context.clone === 'function') {
        try {
          const response = await error.context.clone().json();
          if (response?.error) message = response.error;
        } catch (parseError) {
          console.error('[NEXUS] Не вдалося прочитати відповідь функції керування користувачами:', parseError);
        }
      }
      throw new Error(message);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function createTenant(name, companyName, companyCode) {
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    const { data, error } = await supabase.rpc('nexus_create_tenant', {
      p_tenant_name: name,
      p_company_name: companyName,
      p_company_code: companyCode || null
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const supabase = client();
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  window.nexusAuth = Object.freeze({
    getSession,
    signIn,
    manageUsers,
    createTenant,
    signOut,
    normalizeUsername
  });
})();
