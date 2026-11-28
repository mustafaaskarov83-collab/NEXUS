-- Enable Anonymous Sign-Ins in Supabase Auth before publishing guest.html.

create table if not exists hr.guest_application_settings (
  id smallint primary key default 1 check (id = 1),
  tenant_id uuid not null,
  company_id uuid not null,
  configured_by uuid not null,
  configured_at timestamptz not null default now()
);

create table if not exists hr.guest_applications (
  id uuid primary key,
  tenant_id uuid not null,
  company_id uuid not null,
  guest_user_id uuid not null,
  full_name text not null,
  phone text not null,
  email text,
  message text,
  files jsonb not null default '[]'::jsonb,
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'accepted', 'rejected')),
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guest_applications_company_created_idx
  on hr.guest_applications (tenant_id, company_id, created_at desc);
create index if not exists guest_applications_guest_created_idx
  on hr.guest_applications (guest_user_id, created_at desc);

alter table hr.guest_application_settings enable row level security;
alter table hr.guest_applications enable row level security;
revoke all on hr.guest_application_settings from public, anon, authenticated;
revoke all on hr.guest_applications from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'guest-applications',
  'guest-applications',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.nexus_guest_can_upload_files(p_guest_user_id text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select
    (select auth.jwt() ->> 'is_anonymous') = 'true'
    and (select auth.uid())::text = p_guest_user_id
    and (
      select count(*) < 18
      from storage.objects o
      where o.bucket_id = 'guest-applications'
        and (storage.foldername(o.name))[1] = p_guest_user_id
    );
$function$;

revoke all on function public.nexus_guest_can_upload_files(text) from public, anon;
grant execute on function public.nexus_guest_can_upload_files(text) to authenticated;

drop policy if exists guest_applications_guest_upload on storage.objects;
create policy guest_applications_guest_upload
on storage.objects for insert to authenticated
with check (
  bucket_id = 'guest-applications'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and cardinality(storage.foldername(name)) = 2
  and public.nexus_guest_can_upload_files((select auth.uid())::text)
);

drop policy if exists guest_applications_bucket_insert_guard on storage.objects;
create policy guest_applications_bucket_insert_guard
on storage.objects as restrictive for insert to authenticated
with check (
  bucket_id <> 'guest-applications'
  or (
    (select auth.jwt() ->> 'is_anonymous') = 'true'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and cardinality(storage.foldername(name)) = 2
    and public.nexus_guest_can_upload_files((select auth.uid())::text)
  )
);

drop policy if exists guest_applications_guest_delete on storage.objects;
create policy guest_applications_guest_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'guest-applications'
  and (select auth.jwt() ->> 'is_anonymous') = 'true'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists guest_applications_bucket_delete_guard on storage.objects;
create policy guest_applications_bucket_delete_guard
on storage.objects as restrictive for delete to authenticated
using (
  bucket_id <> 'guest-applications'
  or (
    (select auth.jwt() ->> 'is_anonymous') = 'true'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
);

create or replace function public.nexus_guest_application_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_tenant uuid;
  v_company uuid;
  v_configured boolean;
begin
  select m.tenant_id, m.company_id
  into v_tenant, v_company
  from core.memberships m
  where m.user_id = (select auth.uid())
    and m.status = 'active'
  order by m.created_at
  limit 1;

  if v_tenant is null or not core.has_permission(v_tenant, 'hr.read') then
    raise exception 'hr.read permission required';
  end if;

  select exists (
    select 1
    from hr.guest_application_settings s
    where s.id = 1
      and s.tenant_id = v_tenant
      and (v_company is null or s.company_id = v_company)
  ) into v_configured;

  return jsonb_build_object('configured', v_configured);
end;
$function$;

create or replace function public.nexus_configure_guest_applications()
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_tenant uuid;
  v_company uuid;
begin
  select m.tenant_id, m.company_id
  into v_tenant, v_company
  from core.memberships m
  where m.user_id = (select auth.uid())
    and m.status = 'active'
  order by m.created_at
  limit 1;

  if v_tenant is null or v_company is null then
    raise exception 'Active tenant and company membership required';
  end if;
  if not core.has_permission(v_tenant, 'hr.write') then
    raise exception 'hr.write permission required';
  end if;
  if exists (
    select 1
    from hr.guest_application_settings s
    where s.id = 1
      and (s.tenant_id <> v_tenant or s.company_id <> v_company)
  ) then
    raise exception 'Guest applications are already configured for another company';
  end if;

  insert into hr.guest_application_settings (id, tenant_id, company_id, configured_by)
  values (1, v_tenant, v_company, (select auth.uid()))
  on conflict (id) do update set
    tenant_id = excluded.tenant_id,
    company_id = excluded.company_id,
    configured_by = excluded.configured_by,
    configured_at = now();
end;
$function$;

create or replace function public.nexus_submit_guest_application(
  p_id uuid,
  p_full_name text,
  p_phone text,
  p_email text default null,
  p_message text default null,
  p_consent boolean default false,
  p_files jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_tenant uuid;
  v_company uuid;
  v_guest_user uuid := (select auth.uid());
begin
  if v_guest_user is null or (select auth.jwt() ->> 'is_anonymous') is distinct from 'true' then
    raise exception 'Anonymous guest session required';
  end if;
  if p_id is null then
    raise exception 'Application id is required';
  end if;
  if coalesce(trim(p_full_name), '') = '' or length(p_full_name) > 160 then
    raise exception 'Full name is required and must be at most 160 characters';
  end if;
  if coalesce(trim(p_phone), '') = '' or length(p_phone) > 40 then
    raise exception 'Phone is required and must be at most 40 characters';
  end if;
  if p_email is not null and length(p_email) > 254 then
    raise exception 'Email must be at most 254 characters';
  end if;
  if p_message is not null and length(p_message) > 5000 then
    raise exception 'Message must be at most 5000 characters';
  end if;
  if not coalesce(p_consent, false) then
    raise exception 'Consent to personal data processing is required';
  end if;
  if jsonb_typeof(coalesce(p_files, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_files, '[]'::jsonb)) > 6 then
    raise exception 'Invalid files list';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_files, '[]'::jsonb)) f
    where coalesce(f ->> 'path', '') not like
      v_guest_user::text || '/' || p_id::text || '/%'
      or coalesce(f ->> 'name', '') = ''
      or coalesce(f ->> 'size', '') !~ '^[0-9]+$'
      or case
        when coalesce(f ->> 'size', '') ~ '^[0-9]+$'
          then (f ->> 'size')::bigint > 10485760
        else true
      end
      or coalesce(f ->> 'type', '') not in (
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png'
      )
  ) then
    raise exception 'Invalid file metadata';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_files, '[]'::jsonb)) f
    where not exists (
      select 1
      from storage.objects o
      where o.bucket_id = 'guest-applications'
        and o.name = f ->> 'path'
    )
  ) then
    raise exception 'One or more uploaded files could not be found';
  end if;
  if (
    select count(*)
    from hr.guest_applications a
    where a.guest_user_id = v_guest_user
      and a.created_at > now() - interval '24 hours'
  ) >= 3 then
    raise exception 'Submission limit reached. Try again later.';
  end if;

  select s.tenant_id, s.company_id
  into v_tenant, v_company
  from hr.guest_application_settings s
  where s.id = 1;
  if v_tenant is null or v_company is null then
    raise exception 'Guest applications are not configured yet';
  end if;

  insert into hr.guest_applications (
    id, tenant_id, company_id, guest_user_id,
    full_name, phone, email, message, files, consent_at
  )
  values (
    p_id, v_tenant, v_company, v_guest_user,
    trim(p_full_name), trim(p_phone), nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_message, '')), ''), coalesce(p_files, '[]'::jsonb), now()
  );
  return p_id;
end;
$function$;

create or replace function public.nexus_list_guest_applications()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_tenant uuid;
  v_company uuid;
  v_result jsonb;
begin
  select m.tenant_id, m.company_id
  into v_tenant, v_company
  from core.memberships m
  where m.user_id = (select auth.uid())
    and m.status = 'active'
  order by m.created_at
  limit 1;
  if v_tenant is null or not core.has_permission(v_tenant, 'hr.read') then
    raise exception 'hr.read permission required';
  end if;

  select coalesce(jsonb_agg(to_jsonb(applications) order by applications.created_at desc), '[]'::jsonb)
  into v_result
  from (
    select a.id, a.full_name, a.phone, a.email, a.message, a.files,
      a.status, a.consent_at, a.created_at, a.updated_at
    from hr.guest_applications a
    where a.tenant_id = v_tenant
      and (v_company is null or a.company_id = v_company)
    order by a.created_at desc
    limit 200
  ) applications;
  return v_result;
end;
$function$;

create or replace function public.nexus_update_guest_application_status(
  p_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_tenant uuid;
  v_company uuid;
begin
  select m.tenant_id, m.company_id
  into v_tenant, v_company
  from core.memberships m
  where m.user_id = (select auth.uid())
    and m.status = 'active'
  order by m.created_at
  limit 1;
  if v_tenant is null or not core.has_permission(v_tenant, 'hr.write') then
    raise exception 'hr.write permission required';
  end if;
  if p_status is null or p_status not in ('new', 'reviewing', 'accepted', 'rejected') then
    raise exception 'Invalid application status';
  end if;

  update hr.guest_applications a
  set status = p_status, updated_at = now()
  where a.id = p_id
    and a.tenant_id = v_tenant
    and (v_company is null or a.company_id = v_company);
  if not found then
    raise exception 'Guest application not found';
  end if;
end;
$function$;

create or replace function public.nexus_can_read_guest_application_file(
  p_guest_user_id text,
  p_application_id text
)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from hr.guest_applications a
    join core.memberships m
      on m.tenant_id = a.tenant_id
     and m.user_id = (select auth.uid())
     and m.status = 'active'
    where a.guest_user_id::text = p_guest_user_id
      and a.id::text = p_application_id
      and (m.company_id is null or m.company_id = a.company_id)
      and core.has_permission(a.tenant_id, 'hr.read')
  );
$function$;

revoke all on function public.nexus_can_read_guest_application_file(text, text) from public, anon;
grant execute on function public.nexus_can_read_guest_application_file(text, text) to authenticated;

drop policy if exists guest_applications_private_read on storage.objects;
create policy guest_applications_private_read
on storage.objects for select to authenticated
using (
  bucket_id = 'guest-applications'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.nexus_can_read_guest_application_file(
      (storage.foldername(name))[1],
      (storage.foldername(name))[2]
    )
  )
);

drop policy if exists guest_applications_bucket_read_guard on storage.objects;
create policy guest_applications_bucket_read_guard
on storage.objects as restrictive for select to authenticated
using (
  bucket_id <> 'guest-applications'
  or (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.nexus_can_read_guest_application_file(
      (storage.foldername(name))[1],
      (storage.foldername(name))[2]
    )
  )
);

revoke all on function public.nexus_guest_application_settings() from public, anon;
revoke all on function public.nexus_configure_guest_applications() from public, anon;
revoke all on function public.nexus_submit_guest_application(uuid, text, text, text, text, boolean, jsonb) from public, anon;
revoke all on function public.nexus_list_guest_applications() from public, anon;
revoke all on function public.nexus_update_guest_application_status(uuid, text) from public, anon;
revoke all on function public.nexus_can_read_guest_application_file(text, text) from public, anon;
revoke all on function public.nexus_guest_can_upload_files(text) from public, anon;
grant execute on function public.nexus_guest_application_settings() to authenticated;
grant execute on function public.nexus_configure_guest_applications() to authenticated;
grant execute on function public.nexus_submit_guest_application(uuid, text, text, text, text, boolean, jsonb) to authenticated;
grant execute on function public.nexus_list_guest_applications() to authenticated;
grant execute on function public.nexus_update_guest_application_status(uuid, text) to authenticated;
grant execute on function public.nexus_can_read_guest_application_file(text, text) to authenticated;
grant execute on function public.nexus_guest_can_upload_files(text) to authenticated;
