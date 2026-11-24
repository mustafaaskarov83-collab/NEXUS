CREATE OR REPLACE FUNCTION public.nexus_admin_list_users()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_tenant uuid;
  v_result jsonb;
BEGIN
  SELECT m.tenant_id
  INTO v_tenant
  FROM core.memberships m
  WHERE m.user_id = (SELECT auth.uid())
    AND m.status = 'active'
  ORDER BY m.created_at
  LIMIT 1;

  IF v_tenant IS NULL OR NOT core.has_permission(v_tenant, 'users.manage') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.user_id,
        'username', coalesce(u.raw_app_meta_data ->> 'username', split_part(u.email, '@', 1), ''),
        'fullName', CASE
          WHEN p.display_name IS NULL OR p.display_name LIKE '%@login.nexus.invalid'
            THEN coalesce(u.raw_app_meta_data ->> 'username', split_part(u.email, '@', 1), '')
          ELSE p.display_name
        END,
        'employeeId', p.preferences ->> 'employee_id',
        'role', coalesce(
          nullif(p.preferences ->> 'nexus_role', ''),
          CASE
          WHEN EXISTS (
            SELECT 1
            FROM core.membership_roles mr
            JOIN core.roles r ON r.id = mr.role_id
            WHERE mr.membership_id = m.id
              AND r.code IN ('owner', 'tenant_admin')
          ) THEN 'admin'
          WHEN EXISTS (
            SELECT 1
            FROM core.membership_roles mr
            JOIN core.roles r ON r.id = mr.role_id
            WHERE mr.membership_id = m.id
              AND r.code = 'viewer'
          ) THEN 'viewer'
          ELSE 'manager'
          END
        ),
        'modules', coalesce(p.preferences -> 'nexus_modules', '[]'::jsonb),
        'status', m.status
      )
      ORDER BY p.display_name, u.raw_app_meta_data ->> 'username'
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM core.memberships m
  JOIN auth.users u ON u.id = m.user_id
  LEFT JOIN core.profiles p ON p.id = m.user_id
  WHERE m.tenant_id = v_tenant;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.nexus_admin_save_user(
  p_user_id uuid,
  p_username text,
  p_full_name text,
  p_employee_id uuid,
  p_role text,
  p_modules text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_tenant uuid;
  v_company uuid;
  v_membership uuid;
  v_role uuid;
  v_modules text[];
  v_permissions text[];
  v_role_code text;
BEGIN
  SELECT m.tenant_id, m.company_id
  INTO v_tenant, v_company
  FROM core.memberships m
  WHERE m.user_id = (SELECT auth.uid())
    AND m.status = 'active'
  ORDER BY m.created_at
  LIMIT 1;

  IF v_tenant IS NULL OR NOT core.has_permission(v_tenant, 'users.manage') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id) THEN
    RAISE EXCEPTION 'User does not exist';
  END IF;
  IF coalesce(p_username, '') !~ '^[A-Za-z0-9][A-Za-z0-9_.-]{1,30}[A-Za-z0-9]$'
    OR position('..' IN coalesce(p_username, '')) > 0 THEN
    RAISE EXCEPTION 'Invalid username';
  END IF;
  IF p_role IS NULL OR p_role NOT IN ('admin', 'manager', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE lower(coalesce(u.raw_app_meta_data ->> 'username', '')) = lower(p_username)
      AND u.id <> p_user_id
  ) THEN
    RAISE EXCEPTION 'Username already exists';
  END IF;
  IF p_employee_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM hr.employees e
    WHERE e.id = p_employee_id AND e.tenant_id = v_tenant
  ) THEN
    RAISE EXCEPTION 'Employee does not belong to this tenant';
  END IF;

  v_modules := CASE WHEN p_role = 'admin' THEN ARRAY['*'] ELSE coalesce(p_modules, ARRAY[]::text[]) END;
  IF p_role <> 'admin' AND cardinality(v_modules) = 0 THEN
    RAISE EXCEPTION 'At least one module is required';
  END IF;
  IF p_role <> 'admin' AND EXISTS (
    SELECT 1
    FROM unnest(v_modules) AS selected(module_name)
    WHERE selected.module_name <> ALL(ARRAY[
      'dashboard', 'hr', 'inventory', 'fleet', 'documents', 'projects',
      'tasks', 'finance', 'crm', 'calendar', 'mail', 'reports', 'audit', 'warehouse'
    ])
  ) THEN
    RAISE EXCEPTION 'Invalid module selection';
  END IF;

  INSERT INTO core.profiles AS current_profile (id, display_name, preferences)
  VALUES (
    p_user_id,
    nullif(trim(coalesce(p_full_name, '')), ''),
    jsonb_build_object(
      'username', lower(p_username),
      'employee_id', p_employee_id,
      'nexus_modules', to_jsonb(v_modules),
      'nexus_role', p_role
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET display_name = excluded.display_name,
      preferences = current_profile.preferences || excluded.preferences,
      updated_at = now();

  SELECT m.id
  INTO v_membership
  FROM core.memberships m
  WHERE m.user_id = p_user_id
    AND m.tenant_id = v_tenant
  LIMIT 1;

  IF v_membership IS NULL THEN
    INSERT INTO core.memberships (tenant_id, user_id, company_id, status)
    VALUES (v_tenant, p_user_id, v_company, 'active')
    RETURNING id INTO v_membership;
  ELSE
    UPDATE core.memberships
    SET status = 'active', company_id = v_company, updated_at = now()
    WHERE id = v_membership;
  END IF;

  IF p_role = 'admin' THEN
    SELECT r.id INTO v_role
    FROM core.roles r
    WHERE r.tenant_id = v_tenant AND r.code = 'tenant_admin';
    IF v_role IS NULL THEN
      RAISE EXCEPTION 'Tenant administrator role is missing';
    END IF;
  ELSE
    v_role_code := 'user_' || replace(p_user_id::text, '-', '');
    INSERT INTO core.roles (tenant_id, name, code, is_system)
    VALUES (v_tenant, CASE WHEN p_role = 'viewer' THEN 'Viewer' ELSE 'Manager' END, v_role_code, false)
    ON CONFLICT (tenant_id, code) DO UPDATE
    SET name = excluded.name, updated_at = now()
    RETURNING id INTO v_role;

    DELETE FROM core.role_permissions WHERE role_id = v_role;
    IF p_role = 'viewer' THEN
      SELECT coalesce(array_agg(DISTINCT permission_code), ARRAY[]::text[])
      INTO v_permissions
      FROM unnest(v_modules) AS selected(module_name)
      CROSS JOIN LATERAL unnest(
        CASE selected.module_name
          WHEN 'hr' THEN ARRAY['hr.read']
          WHEN 'inventory' THEN ARRAY['inventory.read']
          WHEN 'fleet' THEN ARRAY['fleet.read']
          WHEN 'documents' THEN ARRAY['documents.read']
          WHEN 'projects' THEN ARRAY['projects.read']
          WHEN 'tasks' THEN ARRAY['projects.read']
          WHEN 'finance' THEN ARRAY['finance.read']
          WHEN 'crm' THEN ARRAY['crm.read']
          WHEN 'calendar' THEN ARRAY['calendar.read']
          WHEN 'mail' THEN ARRAY['mail.read']
          WHEN 'audit' THEN ARRAY['audit.read']
          WHEN 'requests' THEN ARRAY['hr.read']
          WHEN 'warehouse' THEN ARRAY['inventory.read', 'procurement.read']
          WHEN 'reports' THEN ARRAY['hr.read', 'crm.read', 'projects.read', 'documents.read', 'finance.read', 'inventory.read', 'procurement.read', 'fleet.read', 'audit.read']
          ELSE ARRAY[]::text[]
        END
      ) AS requested(permission_code)
      JOIN core.permissions permission ON permission.code = requested.permission_code;
    ELSE
      SELECT coalesce(array_agg(DISTINCT permission_code), ARRAY[]::text[])
      INTO v_permissions
      FROM unnest(v_modules) AS selected(module_name)
      CROSS JOIN LATERAL unnest(
        CASE selected.module_name
          WHEN 'hr' THEN ARRAY['hr.read', 'hr.write']
          WHEN 'inventory' THEN ARRAY['inventory.read', 'inventory.write']
          WHEN 'fleet' THEN ARRAY['fleet.read', 'fleet.write']
          WHEN 'documents' THEN ARRAY['documents.read', 'documents.write']
          WHEN 'projects' THEN ARRAY['projects.read', 'projects.write']
          WHEN 'tasks' THEN ARRAY['projects.read', 'projects.write']
          WHEN 'finance' THEN ARRAY['finance.read', 'finance.write']
          WHEN 'crm' THEN ARRAY['crm.read', 'crm.write']
          WHEN 'calendar' THEN ARRAY['calendar.read']
          WHEN 'mail' THEN ARRAY['mail.read']
          WHEN 'audit' THEN ARRAY['audit.read']
          WHEN 'requests' THEN ARRAY['hr.read', 'hr.write']
          WHEN 'warehouse' THEN ARRAY['inventory.read', 'inventory.write', 'procurement.read', 'procurement.write']
          WHEN 'reports' THEN ARRAY['hr.read', 'crm.read', 'projects.read', 'documents.read', 'finance.read', 'inventory.read', 'procurement.read', 'fleet.read', 'audit.read']
          ELSE ARRAY[]::text[]
        END
      ) AS requested(permission_code)
      JOIN core.permissions permission ON permission.code = requested.permission_code;
    END IF;

    INSERT INTO core.role_permissions (role_id, permission_id)
    SELECT v_role, permission.id
    FROM core.permissions permission
    WHERE permission.code = ANY(v_permissions);
  END IF;

  DELETE FROM core.membership_roles WHERE membership_id = v_membership;
  INSERT INTO core.membership_roles (membership_id, role_id) VALUES (v_membership, v_role);

  RETURN jsonb_build_object('user_id', p_user_id, 'membership_id', v_membership);
END;
$function$;

CREATE OR REPLACE FUNCTION public.nexus_admin_suspend_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT m.tenant_id
  INTO v_tenant
  FROM core.memberships m
  WHERE m.user_id = (SELECT auth.uid())
    AND m.status = 'active'
  ORDER BY m.created_at
  LIMIT 1;

  IF v_tenant IS NULL OR NOT core.has_permission(v_tenant, 'users.manage') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  IF p_user_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Cannot suspend your own account';
  END IF;

  UPDATE core.memberships
  SET status = 'suspended', updated_at = now()
  WHERE user_id = p_user_id AND tenant_id = v_tenant;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User does not belong to this tenant';
  END IF;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.nexus_create_tenant(
  p_tenant_name text,
  p_company_name text,
  p_company_code text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF EXISTS (
    SELECT 1 FROM core.memberships m WHERE m.user_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Authenticated user already has a tenant membership';
  END IF;
  IF EXISTS (SELECT 1 FROM core.tenants) THEN
    RAISE EXCEPTION 'Initial tenant has already been created';
  END IF;
  RETURN core.create_tenant_with_company(p_tenant_name, p_company_name, p_company_code);
END;
$function$;

REVOKE ALL ON FUNCTION public.nexus_admin_list_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.nexus_admin_save_user(uuid, text, text, uuid, text, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.nexus_admin_suspend_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.nexus_create_tenant(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION core.create_tenant_with_company(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nexus_admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.nexus_admin_save_user(uuid, text, text, uuid, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nexus_admin_suspend_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nexus_create_tenant(text, text, text) TO authenticated;
