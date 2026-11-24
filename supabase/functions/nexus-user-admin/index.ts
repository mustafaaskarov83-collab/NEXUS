import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const usernamePattern = /^[A-Za-z0-9][A-Za-z0-9_.-]{1,30}[A-Za-z0-9]$/;
const authEmailDomain = '@login.nexus.invalid';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return jsonResponse({ error: 'Authentication required' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error('Required Supabase function environment variables are missing');
    return jsonResponse({ error: 'User management service is not configured' }, 500);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userResult, error: authError } = await callerClient.auth.getUser();
  if (authError || !userResult.user) return jsonResponse({ error: 'Authentication required' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }

  const action = body.action;
  const userId = String(body.userId || '');

  if (action === 'list') {
    const { data, error } = await callerClient.rpc('nexus_admin_list_users');
    if (error) return jsonResponse({ error: error.message }, 403);
    return jsonResponse({ users: data || [] });
  }

  if (action === 'create') {
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!usernamePattern.test(username) || username.includes('..')) return jsonResponse({ error: 'Invalid username' }, 400);
    if (password.length < 8) return jsonResponse({ error: 'Password must be at least 8 characters' }, 400);
    if (!['admin', 'manager', 'viewer'].includes(String(body.role))) {
      return jsonResponse({ error: 'Invalid role' }, 400);
    }

    const { error: permissionError } = await callerClient.rpc('nexus_admin_list_users');
    if (permissionError) return jsonResponse({ error: permissionError.message }, 403);

    const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
      email: `${username}${authEmailDomain}`,
      password,
      email_confirm: true,
      user_metadata: { full_name: String(body.fullName || username).trim() },
      app_metadata: { username },
    });
    if (createError || !created.user) {
      return jsonResponse({ error: createError?.message || 'Could not create user' }, 400);
    }

    const { error: saveError } = await callerClient.rpc('nexus_admin_save_user', {
      p_user_id: created.user.id,
      p_username: username,
      p_full_name: String(body.fullName || username).trim(),
      p_employee_id: body.employeeId || null,
      p_role: body.role,
      p_modules: Array.isArray(body.modules) ? body.modules : [],
    });
    if (saveError) {
      const { error: cleanupError } = await serviceClient.auth.admin.deleteUser(created.user.id);
      if (cleanupError) console.error('Failed to remove incomplete user:', cleanupError.message);
      return jsonResponse({ error: saveError.message }, 400);
    }
    return jsonResponse({ userId: created.user.id });
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    return jsonResponse({ error: 'Invalid user ID' }, 400);
  }

  const { data: users, error: listError } = await callerClient.rpc('nexus_admin_list_users');
  if (listError) return jsonResponse({ error: listError.message }, 403);
  const target = Array.isArray(users) ? users.find((item: { id?: string }) => item.id === userId) : null;
  if (!target) return jsonResponse({ error: 'User does not belong to this tenant' }, 404);

  if (action === 'update') {
    const username = String(body.username || '').trim().toLowerCase();
    if (!usernamePattern.test(username) || username.includes('..')) return jsonResponse({ error: 'Invalid username' }, 400);
    const { error } = await callerClient.rpc('nexus_admin_save_user', {
      p_user_id: userId,
      p_username: username,
      p_full_name: String(body.fullName || username).trim(),
      p_employee_id: body.employeeId || null,
      p_role: body.role,
      p_modules: Array.isArray(body.modules) ? body.modules : [],
    });
    if (error) return jsonResponse({ error: error.message }, 400);
    return jsonResponse({ userId });
  }

  if (action === 'reset_password') {
    const password = String(body.password || '');
    if (password.length < 8) return jsonResponse({ error: 'Password must be at least 8 characters' }, 400);
    const { error } = await serviceClient.auth.admin.updateUserById(userId, { password });
    if (error) return jsonResponse({ error: error.message }, 400);
    return jsonResponse({ userId });
  }

  if (action === 'suspend') {
    const { error: suspendError } = await callerClient.rpc('nexus_admin_suspend_user', { p_user_id: userId });
    if (suspendError) return jsonResponse({ error: suspendError.message }, 400);
    const { error: banError } = await serviceClient.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
    if (banError) {
      console.error('Membership suspended but auth ban failed:', banError.message);
      return jsonResponse({ error: 'Account access was disabled, but auth suspension did not complete' }, 500);
    }
    return jsonResponse({ userId });
  }

  return jsonResponse({ error: 'Unknown action' }, 400);
});
