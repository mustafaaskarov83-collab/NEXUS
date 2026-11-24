/* NEXUS ERP — server data adapter */
(() => {
  'use strict';

  const client = () => window.nexusSupabase || window.supabaseClient || null;

  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const h = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  }

  async function rpc(name, params) {
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    const { data, error } = await supabase.rpc(name, params || {});
    if (error) throw error;
    return data;
  }

  async function listEmployees() {
    return rpc('nexus_list_employees');
  }

  async function listDepartments() {
    return rpc('nexus_list_departments');
  }

  async function upsertDepartment(department) {
    return rpc('nexus_upsert_department', {
      p_id: department.id,
      p_name: department.name,
      p_code: department.code || null,
      p_parent_id: department.parentId || null,
      p_branch_id: department.branchId || null
    });
  }

  async function upsertEmployee(employee) {
    return rpc('nexus_upsert_employee', {
      p_id: employee.id,
      p_full_name: employee.fullName,
      p_position: employee.position || null,
      p_department_id: employee.departmentId || null,
      p_hire_date: employee.hireDate || null,
      p_birth_date: employee.birthDate || null,
      p_category: employee.category || null,
      p_status: employee.status || 'active',
      p_contract: employee.contract || {},
      p_reservation: employee.reservation || {},
      p_personal_data: employee.personalData || {},
      p_metadata: employee.metadata || {}
    });
  }

  async function deleteEmployee(id) {
    return rpc('nexus_delete_employee', { p_id: id });
  }

  async function listProjects() {
    return rpc('nexus_list_projects');
  }

  async function upsertProject(project) {
    return rpc('nexus_upsert_project', {
      p_id: project.id,
      p_code: project.code,
      p_name: project.name,
      p_description: project.description || null,
      p_status: project.status || 'planning',
      p_contract_id: project.contractId || null,
      p_addendum_id: project.addendumId || null,
      p_amount: Number(project.contractAmount || project.amount || 0),
      p_currency: project.currency || 'UAH',
      p_start: project.start || null,
      p_end: project.end || null,
      p_metadata: project.metadata || {}
    });
  }

  async function deleteProject(id) {
    return rpc('nexus_delete_project', { p_id: id });
  }

  async function listCrm() {
    return rpc('nexus_list_crm');
  }

  async function upsertCrmParty(client) {
    return rpc('nexus_upsert_crm_party', {
      p_id: client.id,
      p_name: client.name,
      p_type: client.type || 'company',
      p_role: client.role || 'customer',
      p_status: client.status || 'lead',
      p_source: client.source || null,
      p_tax_number: client.edrpou || null,
      p_responsible_employee_id: client.managerId || null,
      p_contacts: {
        contact: client.contact || null,
        position: client.position || null,
        phone: client.phone || null,
        email: client.email || null,
        website: client.website || null
      },
      p_addresses: {
        city: client.city || null,
        address: client.address || null
      },
      p_metadata: {
        tags: client.tags || null,
        notes: client.notes || null,
        createdAt: client.createdAt || null
      }
    });
  }

  async function archiveCrmParty(id) {
    return rpc('nexus_archive_crm_party', { p_id: id });
  }

  async function upsertCrmActivity(activity) {
    return rpc('nexus_upsert_crm_activity', {
      p_id: activity.id,
      p_party_id: activity.partyId,
      p_project_id: activity.projectId || null,
      p_employee_id: activity.employeeId || null,
      p_type: activity.type || 'note',
      p_activity_date: activity.activityDate || new Date().toISOString(),
      p_subject: activity.subject || null,
      p_description: activity.description || null,
      p_status: activity.status || 'open',
      p_metadata: activity.metadata || {}
    });
  }

  async function getContext() {
    return rpc('nexus_current_context');
  }

  async function listTasks() {
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    const { data, error } = await supabase.schema('projects').from('tasks').select('*').order('position').order('created_at');
    if (error) throw error;
    return data || [];
  }

  async function upsertTask(task) {
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    const context = await getContext();
    const tenantId = context?.memberships?.[0]?.tenant_id;
    if (!tenantId) throw new Error('Активний tenant не налаштовано');
    const payload = {
      id: task.id,
      tenant_id: tenantId,
      project_id: task.projectId || null,
      assignee_id: task.employeeId || null,
      title: task.title,
      description: task.description || null,
      status: task.status || 'backlog',
      priority: task.priority || 'normal',
      start_date: task.startDate || null,
      deadline: task.deadline || null,
      metadata: task.metadata || {},
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.schema('projects').from('tasks').upsert(payload);
    if (error) throw error;
  }

  async function deleteTask(id) {
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    const { error } = await supabase.schema('projects').from('tasks').delete().eq('id', id);
    if (error) throw error;
  }

  async function listCalendarEvents() {
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    const { data, error } = await supabase.schema('core').from('calendar_events').select('*').order('start_at');
    if (error) throw error;
    return data || [];
  }

  async function upsertCalendarEvent(event) {
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    const context = await getContext();
    const membership = context?.memberships?.[0];
    if (!membership?.tenant_id) throw new Error('Активний tenant не налаштовано');
    const payload = {
      id: event.id,
      tenant_id: membership.tenant_id,
      owner_user_id: context.user_id,
      title: event.title,
      start_at: event.startAt,
      end_at: event.endAt || event.startAt,
      all_day: event.allDay !== false,
      type: event.type || 'custom',
      reminder: event.reminder || {},
      metadata: event.metadata || {},
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.schema('core').from('calendar_events').upsert(payload);
    if (error) throw error;
  }

  async function deleteCalendarEvent(id) {
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    const { error } = await supabase.schema('core').from('calendar_events').delete().eq('id', id);
    if (error) throw error;
  }

  window.nexusData = Object.freeze({
    uuid,
    rpc,
    listEmployees,
    listDepartments,
    upsertDepartment,
    upsertEmployee,
    deleteEmployee,
    listProjects,
    upsertProject,
    deleteProject,
    listCrm,
    upsertCrmParty,
    archiveCrmParty,
    upsertCrmActivity,
    getContext,
    listTasks,
    upsertTask,
    deleteTask,
    listCalendarEvents,
    upsertCalendarEvent,
    deleteCalendarEvent
  });
})();
