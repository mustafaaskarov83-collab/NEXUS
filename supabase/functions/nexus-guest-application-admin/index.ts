import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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
    return jsonResponse({ error: 'Candidate deletion service is not configured' }, 500);
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

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }
  if (!isRecord(parsedBody)) return jsonResponse({ error: 'Invalid request body' }, 400);
  const body = parsedBody;
  if (!isUuid(body.id)) return jsonResponse({ error: 'Invalid application ID' }, 400);

  const { data: purge, error: prepareError } = await callerClient.rpc('nexus_prepare_guest_application_purge', {
    p_id: body.id,
  });
  if (prepareError) return jsonResponse({ error: prepareError.message }, 403);
  if (!purge || purge.id !== body.id || !isUuid(purge.guest_user_id) || !Array.isArray(purge.files)) {
    console.error('Candidate purge preparation returned an invalid payload');
    return jsonResponse({ error: 'Candidate deletion could not be prepared' }, 500);
  }

  const paths: string[] = [];
  for (const file of purge.files) {
    if (!file || typeof file.path !== 'string') {
      return jsonResponse({ error: 'Candidate file metadata is invalid' }, 500);
    }
    const pathParts = file.path.split('/');
    if (
      pathParts.length !== 3
      || pathParts[0] !== purge.guest_user_id
      || pathParts[1] !== body.id
      || pathParts.some((part: string) => !part || part === '.' || part === '..')
    ) {
      return jsonResponse({ error: 'Candidate file path is invalid' }, 500);
    }
    paths.push(file.path);
  }

  if (paths.length) {
    const { error: storageError } = await serviceClient.storage
      .from('guest-applications')
      .remove(paths);
    if (storageError) {
      console.error('Candidate files could not be removed:', storageError.message);
      return jsonResponse({ error: 'Candidate files could not be removed; retry the deletion' }, 500);
    }
  }

  const { error: finishError } = await callerClient.rpc('nexus_finish_guest_application_purge', {
    p_id: body.id,
  });
  if (finishError) {
    console.error('Candidate files removed but database record remains:', finishError.message);
    return jsonResponse({ error: 'Files were removed, but the record could not be deleted; retry the deletion' }, 500);
  }

  return jsonResponse({ id: body.id });
});
