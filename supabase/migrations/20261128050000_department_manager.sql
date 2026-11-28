-- Adds a department manager link for the HR module.

alter table core.departments
  add column if not exists manager_employee_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'departments_manager_employee_fk'
      and conrelid = 'core.departments'::regclass
  ) then
    alter table core.departments
      add constraint departments_manager_employee_fk
      foreign key (manager_employee_id)
      references hr.employees(id)
      on delete set null;
  end if;
end
$$;

create or replace function public.nexus_list_departments()
returns jsonb
language sql
stable
set search_path to ''
as $function$
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',d.id,
   'company_id',d.company_id,
   'branch_id',d.branch_id,
   'parent_id',d.parent_id,
   'name',d.name,
   'code',d.code,
   'is_active',d.is_active,
   'manager_employee_id',d.manager_employee_id
 ) order by d.name),'[]'::jsonb)
 from core.departments d
 join core.memberships m on m.tenant_id=d.tenant_id
   and m.user_id=(select auth.uid())
   and m.status='active'
 where (m.company_id is null or m.company_id=d.company_id)
   and core.has_permission(d.tenant_id,'hr.read');
$function$;

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
  select m.tenant_id,m.company_id
  into v_tenant,v_company
  from core.memberships m
  where m.user_id=(select auth.uid())
    and m.status='active'
  order by m.created_at
  limit 1;

  if v_tenant is null or v_company is null then
    raise exception 'Active tenant and company membership required';
  end if;
  if not core.has_permission(v_tenant,'hr.write') then
    raise exception 'hr.write permission required';
  end if;
  if coalesce(trim(p_name),'')='' then
    raise exception 'Department name is required';
  end if;

  if p_manager_employee_id is not null
     and not exists (
       select 1
       from hr.employees e
       where e.id=p_manager_employee_id
         and e.tenant_id=v_tenant
     ) then
    raise exception 'Department manager must belong to the active company';
  end if;

  insert into core.departments(
    id,
    tenant_id,
    company_id,
    branch_id,
    parent_id,
    name,
    code,
    manager_employee_id
  )
  values(
    p_id,
    v_tenant,
    v_company,
    p_branch_id,
    p_parent_id,
    trim(p_name),
    nullif(trim(coalesce(p_code,'')),''),
    p_manager_employee_id
  )
  on conflict(id) do update set
    branch_id=excluded.branch_id,
    parent_id=excluded.parent_id,
    name=excluded.name,
    code=excluded.code,
    manager_employee_id=excluded.manager_employee_id,
    updated_at=now();

  return p_id;
end;
$function$;
