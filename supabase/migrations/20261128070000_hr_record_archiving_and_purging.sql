alter table hr.guest_applications
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid,
  add column if not exists purge_pending_at timestamptz;

create index if not exists guest_applications_archived_idx
  on hr.guest_applications (tenant_id, company_id, archived_at desc)
  where archived_at is not null;

create index if not exists employees_archived_idx
  on hr.employees (tenant_id, company_id, archived_at desc)
  where status = 'archived';

create or replace function public.nexus_upsert_department(
  p_id uuid,
  p_name text,
  p_code text default null::text,
  p_parent_id uuid default null::uuid,
  p_branch_id uuid default null::uuid,
  p_manager_employee_id uuid default null::uuid
)
returns uuid
language plpgsql
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
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Department name is required';
  end if;
  if p_manager_employee_id is not null
     and not exists (
       select 1
       from hr.employees e
       where e.id = p_manager_employee_id
         and e.tenant_id = v_tenant
         and e.company_id = v_company
         and e.status = 'active'
     ) then
    raise exception 'Department manager must be an active employee in the current company';
  end if;

  insert into core.departments (
    id, tenant_id, company_id, branch_id, parent_id, name, code, manager_employee_id
  )
  values (
    p_id, v_tenant, v_company, p_branch_id, p_parent_id, trim(p_name),
    nullif(trim(coalesce(p_code, '')), ''), p_manager_employee_id
  )
  on conflict (id) do update set
    branch_id = excluded.branch_id,
    parent_id = excluded.parent_id,
    name = excluded.name,
    code = excluded.code,
    manager_employee_id = excluded.manager_employee_id,
    updated_at = now();

  return p_id;
end;
$function$;

create or replace function public.nexus_archive_employee(p_id uuid)
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

  if exists (
    select 1
    from core.departments d
    join hr.employees e on e.id = d.manager_employee_id
    where e.id = p_id
      and d.tenant_id = v_tenant
      and (v_company is null or d.company_id = v_company)
  ) then
    raise exception 'Assign another department manager before archiving this employee';
  end if;

  update hr.employees e
  set status = 'archived',
      archived_at = now(),
      updated_by = (select auth.uid()),
      updated_at = now()
  where e.id = p_id
    and e.tenant_id = v_tenant
    and (v_company is null or e.company_id = v_company)
    and e.status <> 'archived';
  if not found then
    raise exception 'Active employee not found';
  end if;
end;
$function$;

create or replace function public.nexus_list_archived_employees()
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

  select coalesce(jsonb_agg(to_jsonb(archived) order by archived.archived_at desc), '[]'::jsonb)
  into v_result
  from (
    select e.id, e.full_name, e.position, e.department_id,
      d.code as department_code, d.name as department_name, e.archived_at
    from hr.employees e
    left join core.departments d
      on d.id = e.department_id
     and d.tenant_id = e.tenant_id
    where e.tenant_id = v_tenant
      and (v_company is null or e.company_id = v_company)
      and e.status = 'archived'
    order by e.archived_at desc
    limit 500
  ) archived;
  return v_result;
end;
$function$;

create or replace function public.nexus_restore_employee(p_id uuid)
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

  update hr.employees e
  set status = 'active',
      archived_at = null,
      updated_by = (select auth.uid()),
      updated_at = now()
  where e.id = p_id
    and e.tenant_id = v_tenant
    and (v_company is null or e.company_id = v_company)
    and e.status = 'archived';
  if not found then
    raise exception 'Archived employee not found';
  end if;
end;
$function$;

create or replace function public.nexus_purge_employee(p_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_tenant uuid;
  v_company uuid;
  v_employee uuid;
  v_reference record;
  v_has_reference boolean;
begin
  select m.tenant_id, m.company_id
  into v_tenant, v_company
  from core.memberships m
  where m.user_id = (select auth.uid())
    and m.status = 'active'
  order by m.created_at
  limit 1;
  if v_tenant is null or not core.has_permission(v_tenant, 'users.manage') then
    raise exception 'users.manage permission required';
  end if;

  select e.id into v_employee
  from hr.employees e
  where e.id = p_id
    and e.tenant_id = v_tenant
    and (v_company is null or e.company_id = v_company)
    and e.status = 'archived';
  if v_employee is null then
    raise exception 'Archived employee not found';
  end if;

  if exists (
    select 1
    from core.profiles p
    where p.preferences ->> 'employee_id' = p_id::text
  ) then
    raise exception 'Employee is still linked to a user account';
  end if;

  for v_reference in
    select c.conrelid::regclass as relation_name, source_column.attname as column_name
    from pg_constraint c
    cross join lateral unnest(c.conkey) with ordinality as source_key(attnum, position)
    join lateral unnest(c.confkey) with ordinality as target_key(attnum, position)
      on target_key.position = source_key.position
    join pg_attribute source_column
      on source_column.attrelid = c.conrelid
     and source_column.attnum = source_key.attnum
    join pg_attribute target_column
      on target_column.attrelid = c.confrelid
     and target_column.attnum = target_key.attnum
    where c.contype = 'f'
      and c.confrelid = 'hr.employees'::regclass
      and target_column.attname = 'id'
  loop
    execute format(
      'select exists (select 1 from %s where %I = $1)',
      v_reference.relation_name,
      v_reference.column_name
    )
    into v_has_reference
    using p_id;
    if v_has_reference then
      raise exception 'Employee is still referenced by %', v_reference.relation_name;
    end if;
  end loop;

  for v_reference in
    select format('%I.%I', n.nspname, t.relname)::regclass as relation_name,
      a.attname as column_name
    from pg_attribute a
    join pg_class t on t.oid = a.attrelid
    join pg_namespace n on n.oid = t.relnamespace
    where t.relkind in ('r', 'p')
      and a.attnum > 0
      and not a.attisdropped
      and a.atttypid = 'uuid'::regtype
      and a.attname in ('employee_id', 'responsible_employee_id', 'manager_employee_id', 'assignee_id')
  loop
    execute format(
      'select exists (select 1 from %s where %I = $1)',
      v_reference.relation_name,
      v_reference.column_name
    )
    into v_has_reference
    using p_id;
    if v_has_reference then
      raise exception 'Employee is still referenced by %', v_reference.relation_name;
    end if;
  end loop;

  delete from hr.employees e
  where e.id = p_id
    and e.tenant_id = v_tenant
    and (v_company is null or e.company_id = v_company)
    and e.status = 'archived';
  if not found then
    raise exception 'Archived employee not found';
  end if;
end;
$function$;

create or replace function public.nexus_set_department_active(p_id uuid, p_is_active boolean)
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
  if p_is_active is null then
    raise exception 'Department state is required';
  end if;

  update core.departments d
  set is_active = p_is_active,
      updated_at = now()
  where d.id = p_id
    and d.tenant_id = v_tenant
    and (v_company is null or d.company_id = v_company);
  if not found then
    raise exception 'Department not found';
  end if;
end;
$function$;

create or replace function public.nexus_purge_department(p_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_tenant uuid;
  v_company uuid;
  v_department uuid;
  v_reference record;
  v_has_reference boolean;
begin
  select m.tenant_id, m.company_id
  into v_tenant, v_company
  from core.memberships m
  where m.user_id = (select auth.uid())
    and m.status = 'active'
  order by m.created_at
  limit 1;
  if v_tenant is null or not core.has_permission(v_tenant, 'users.manage') then
    raise exception 'users.manage permission required';
  end if;

  select d.id into v_department
  from core.departments d
  where d.id = p_id
    and d.tenant_id = v_tenant
    and (v_company is null or d.company_id = v_company)
    and d.is_active = false;
  if v_department is null then
    raise exception 'Archived department not found';
  end if;

  if exists (select 1 from hr.employees e where e.department_id = p_id) then
    raise exception 'Department still has employees';
  end if;
  if exists (select 1 from core.departments d where d.parent_id = p_id) then
    raise exception 'Department still has child departments';
  end if;

  for v_reference in
    select c.conrelid::regclass as relation_name, source_column.attname as column_name
    from pg_constraint c
    cross join lateral unnest(c.conkey) with ordinality as source_key(attnum, position)
    join lateral unnest(c.confkey) with ordinality as target_key(attnum, position)
      on target_key.position = source_key.position
    join pg_attribute source_column
      on source_column.attrelid = c.conrelid
     and source_column.attnum = source_key.attnum
    join pg_attribute target_column
      on target_column.attrelid = c.confrelid
     and target_column.attnum = target_key.attnum
    where c.contype = 'f'
      and c.confrelid = 'core.departments'::regclass
      and target_column.attname = 'id'
  loop
    execute format(
      'select exists (select 1 from %s where %I = $1)',
      v_reference.relation_name,
      v_reference.column_name
    )
    into v_has_reference
    using p_id;
    if v_has_reference then
      raise exception 'Department is still referenced by %', v_reference.relation_name;
    end if;
  end loop;

  for v_reference in
    select format('%I.%I', n.nspname, t.relname)::regclass as relation_name,
      a.attname as column_name
    from pg_attribute a
    join pg_class t on t.oid = a.attrelid
    join pg_namespace n on n.oid = t.relnamespace
    where t.relkind in ('r', 'p')
      and a.attnum > 0
      and not a.attisdropped
      and a.atttypid = 'uuid'::regtype
      and a.attname in ('department_id', 'parent_department_id', 'parent_id')
  loop
    execute format(
      'select exists (select 1 from %s where %I = $1)',
      v_reference.relation_name,
      v_reference.column_name
    )
    into v_has_reference
    using p_id;
    if v_has_reference then
      raise exception 'Department is still referenced by %', v_reference.relation_name;
    end if;
  end loop;

  delete from core.departments d
  where d.id = p_id
    and d.tenant_id = v_tenant
    and (v_company is null or d.company_id = v_company)
    and d.is_active = false;
  if not found then
    raise exception 'Archived department not found';
  end if;
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
      and a.archived_at is null
    order by a.created_at desc
    limit 200
  ) applications;
  return v_result;
end;
$function$;

create or replace function public.nexus_list_archived_guest_applications()
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
      a.status, a.consent_at, a.created_at, a.updated_at, a.archived_at,
      a.purge_pending_at is not null as purge_pending
    from hr.guest_applications a
    where a.tenant_id = v_tenant
      and (v_company is null or a.company_id = v_company)
      and a.archived_at is not null
    order by a.archived_at desc
    limit 200
  ) applications;
  return v_result;
end;
$function$;

create or replace function public.nexus_archive_guest_application(p_id uuid, p_archived boolean)
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
  if p_archived is null then
    raise exception 'Archive state is required';
  end if;

  update hr.guest_applications a
  set archived_at = case when p_archived then coalesce(a.archived_at, now()) else null end,
      archived_by = case when p_archived then (select auth.uid()) else null end,
      updated_at = now()
  where a.id = p_id
    and a.tenant_id = v_tenant
    and (v_company is null or a.company_id = v_company)
    and a.purge_pending_at is null
    and (p_archived or a.archived_at is not null);
  if not found then
    raise exception 'Guest application not found or purge is already pending';
  end if;
end;
$function$;

create or replace function public.nexus_prepare_guest_application_purge(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_tenant uuid;
  v_company uuid;
  v_application hr.guest_applications%rowtype;
begin
  select m.tenant_id, m.company_id
  into v_tenant, v_company
  from core.memberships m
  where m.user_id = (select auth.uid())
    and m.status = 'active'
  order by m.created_at
  limit 1;
  if v_tenant is null or not core.has_permission(v_tenant, 'users.manage') then
    raise exception 'users.manage permission required';
  end if;

  select a.* into v_application
  from hr.guest_applications a
  where a.id = p_id
    and a.tenant_id = v_tenant
    and (v_company is null or a.company_id = v_company)
    and a.archived_at is not null
  for update;
  if not found then
    raise exception 'Archived guest application not found';
  end if;

  if jsonb_typeof(coalesce(v_application.files, '[]'::jsonb)) <> 'array'
     or exists (
       select 1
       from jsonb_array_elements(coalesce(v_application.files, '[]'::jsonb)) as file_entry(item)
       where jsonb_typeof(file_entry.item) <> 'object'
          or coalesce(file_entry.item ->> 'path', '') !~
            ('^' || v_application.guest_user_id::text || '/' || v_application.id::text || '/[^/]+$')
     ) then
    raise exception 'Candidate file metadata is invalid';
  end if;

  update hr.guest_applications
  set purge_pending_at = coalesce(purge_pending_at, now())
  where id = p_id
    and tenant_id = v_tenant
    and (v_company is null or company_id = v_company)
    and archived_at is not null;

  return jsonb_build_object(
    'id', v_application.id,
    'guest_user_id', v_application.guest_user_id,
    'files', coalesce(v_application.files, '[]'::jsonb)
  );
end;
$function$;

create or replace function public.nexus_finish_guest_application_purge(p_id uuid)
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
  if v_tenant is null or not core.has_permission(v_tenant, 'users.manage') then
    raise exception 'users.manage permission required';
  end if;

  delete from hr.guest_applications a
  where a.id = p_id
    and a.tenant_id = v_tenant
    and (v_company is null or a.company_id = v_company)
    and a.archived_at is not null
    and a.purge_pending_at is not null;
  if not found then
    raise exception 'Guest application purge is not pending';
  end if;
end;
$function$;

revoke all on function public.nexus_archive_employee(uuid) from public, anon;
revoke all on function public.nexus_list_archived_employees() from public, anon;
revoke all on function public.nexus_restore_employee(uuid) from public, anon;
revoke all on function public.nexus_purge_employee(uuid) from public, anon;
revoke all on function public.nexus_set_department_active(uuid, boolean) from public, anon;
revoke all on function public.nexus_purge_department(uuid) from public, anon;
revoke all on function public.nexus_list_archived_guest_applications() from public, anon;
revoke all on function public.nexus_archive_guest_application(uuid, boolean) from public, anon;
revoke all on function public.nexus_prepare_guest_application_purge(uuid) from public, anon;
revoke all on function public.nexus_finish_guest_application_purge(uuid) from public, anon;

grant execute on function public.nexus_archive_employee(uuid) to authenticated;
grant execute on function public.nexus_list_archived_employees() to authenticated;
grant execute on function public.nexus_restore_employee(uuid) to authenticated;
grant execute on function public.nexus_purge_employee(uuid) to authenticated;
grant execute on function public.nexus_set_department_active(uuid, boolean) to authenticated;
grant execute on function public.nexus_purge_department(uuid) to authenticated;
grant execute on function public.nexus_list_archived_guest_applications() to authenticated;
grant execute on function public.nexus_archive_guest_application(uuid, boolean) to authenticated;
grant execute on function public.nexus_prepare_guest_application_purge(uuid) to authenticated;
grant execute on function public.nexus_finish_guest_application_purge(uuid) to authenticated;
