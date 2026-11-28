/* NEXUS ERP — server data adapter */
(() => {
  'use strict';

  const client = () => window.nexusSupabase || window.supabaseClient || null;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const ID_MAP_KEY = 'nexus_cloud_id_map_v1';

  function isUuid(value) {
    return UUID_RE.test(String(value || ''));
  }

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

  function cloudId(schema, table, localId) {
    if (!localId) return null;
    if (isUuid(localId)) return localId;
    const mapKey = `${schema}.${table}:${localId}`;
    const map = JSON.parse(localStorage.getItem(ID_MAP_KEY) || '{}');
    if (map[mapKey]) return map[mapKey];
    map[mapKey] = uuid();
    localStorage.setItem(ID_MAP_KEY, JSON.stringify(map));
    return map[mapKey];
  }

  function localIdFor(schema, table, row) {
    const legacyId = row.metadata?.legacyId || row.code;
    if (legacyId) {
      const mapKey = `${schema}.${table}:${legacyId}`;
      const map = JSON.parse(localStorage.getItem(ID_MAP_KEY) || '{}');
      map[mapKey] = row.id;
      localStorage.setItem(ID_MAP_KEY, JSON.stringify(map));
      return legacyId;
    }
    return localIdFromCloud(schema, table, row.id);
  }

  function localIdFromCloud(schema, table, cloudValue) {
    const map = JSON.parse(localStorage.getItem(ID_MAP_KEY) || '{}');
    const prefix = `${schema}.${table}:`;
    const entry = Object.keys(map).find(key => key.startsWith(prefix) && map[key] === cloudValue);
    return entry ? entry.slice(prefix.length) : cloudValue;
  }

  async function tenantMembership() {
    const context = await getContext();
    const membership = (context?.memberships || []).find(item => item.status !== 'inactive') || context?.memberships?.[0];
    if (!membership?.tenant_id) throw new Error('Активний tenant не налаштовано');
    return { context, membership };
  }

  async function listTable(schema, table, orderColumn) {
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    let query = supabase.schema(schema).from(table).select('*');
    if (orderColumn) query = query.order(orderColumn);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async function upsertTable(schema, table, payload) {
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    const { error } = await supabase.schema(schema).from(table).upsert(payload);
    if (error) throw error;
  }

  async function deleteTableRow(schema, table, id) {
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    const { error } = await supabase.schema(schema).from(table).delete().eq('id', id);
    if (error) throw error;
  }

  async function existingId(schema, table, id) {
    if (!isUuid(id)) return null;
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    const { data, error } = await supabase.schema(schema).from(table).select('id').eq('id', id).maybeSingle();
    if (error) throw error;
    return data?.id || null;
  }

  async function rpc(name, params) {
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    const { data, error } = await supabase.rpc(name, params || {});
    if (error) throw error;
    return data;
  }

    function stripScan(contract) {
    const c = Object.assign({}, contract || {});
    if (c.scan && typeof c.scan === 'object' && c.scan.data) {
      const meta = Object.assign({}, c.scan);
      delete meta.data;
      meta.storedLocally = true;
      c.scan = meta;
    }
    return c;
  }
  async function listEmployees() {
    const [employees, leaveRows, paymentRows, sickRows] = await Promise.all([
      rpc('nexus_list_employees'),
      listTable('hr', 'leave_records', 'start_date'),
      listTable('hr', 'payroll_payments', 'period_start'),
      listTable('hr', 'sick_leave_records', 'start_date')
    ]);
    const leavesByEmployee = new Map();
    const paymentsByEmployee = new Map();
    const sickByEmployee = new Map();
    leaveRows.forEach(row => {
      if (!leavesByEmployee.has(row.employee_id)) {
        leavesByEmployee.set(row.employee_id, { leaves: [], unpaidPeriods: [], parentalPeriods: [] });
      }
      const groups = leavesByEmployee.get(row.employee_id);
      const meta = row.metadata || {};
      const value = {
        ...meta.localData,
        id: meta.legacyId || localIdFor('hr', 'leave_records', row),
        start: row.start_date,
        end: row.end_date,
        days: row.days == null ? meta.localData?.days : Number(row.days),
        type: row.type
      };
      if (row.type === 'unpaid') groups.unpaidPeriods.push(value);
      else if (row.type === 'parental') groups.parentalPeriods.push(value);
      else groups.leaves.push(value);
    });
    paymentRows.forEach(row => {
      if (!paymentsByEmployee.has(row.employee_id)) paymentsByEmployee.set(row.employee_id, []);
      const calculation = row.calculation || {};
      paymentsByEmployee.get(row.employee_id).push({
        ...calculation.localData,
        year: Number(String(row.period_start).slice(0, 4)),
        month: Number(String(row.period_start).slice(5, 7)),
        amount: Number(row.amount) || 0
      });
    });
    sickRows.forEach(row => {
      if (!sickByEmployee.has(row.employee_id)) sickByEmployee.set(row.employee_id, []);
      const meta = row.metadata || {};
      sickByEmployee.get(row.employee_id).push({
        ...meta.localData,
        id: meta.legacyId || localIdFor('hr', 'sick_leave_records', row),
        start: row.start_date,
        end: row.end_date || '',
        type: row.classification || 'sick'
      });
    });
    return (employees || []).filter(employee => employee.status !== 'archived').map(employee => {
      const leaveGroups = leavesByEmployee.get(employee.id) || { leaves: [], unpaidPeriods: [], parentalPeriods: [] };
      return {
        ...employee,
        leaves: leaveGroups.leaves,
        unpaidPeriods: leaveGroups.unpaidPeriods,
        parentalPeriods: leaveGroups.parentalPeriods,
        payments: paymentsByEmployee.get(employee.id) || [],
        sickLeaves: sickByEmployee.get(employee.id) || []
      };
    });
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
      p_branch_id: department.branchId || null,
      p_manager_employee_id: department.managerEmployeeId || null
    });
  }

  async function upsertEmployee(employee) {
    const { context, membership } = await tenantMembership();
    if (!membership.company_id) throw new Error('Для активного tenant не налаштовано компанію');
    const result = await rpc('nexus_upsert_employee', {
      p_id: employee.id,
      p_full_name: employee.fullName,
      p_position: employee.position || null,
      p_department_id: employee.departmentId || null,
      p_hire_date: employee.hireDate || null,
      p_birth_date: employee.birthDate || null,
      p_category: employee.category || null,
      p_status: employee.status || 'active',
       p_contract: stripScan(employee.contract),
      p_reservation: employee.reservation || {},
      p_personal_data: employee.personalData || {},
      p_metadata: {
        ...(employee.metadata || {}),
        baseLeaveDays: employee.baseLeaveDays,
        insuranceYears: employee.insuranceYears,
        projectIds: employee.projectIds || []
      }
    });
    const leaveItems = [
      ...(employee.leaves || []).map(record => ({ record, type: record.type || 'annual', key: record.id })),
      ...(employee.unpaidPeriods || []).map(record => ({
        record, type: 'unpaid', key: `unpaid:${record.start}:${record.end}`
      })),
      ...(employee.parentalPeriods || []).map(record => ({
        record, type: 'parental', key: `parental:${record.start}:${record.end}`
      }))
    ];
    const leavePayloads = leaveItems.map(({ record, type, key }) => {
      const { id: _localId, ...localData } = record;
      return {
        id: cloudId('hr', 'leave_records', key || `${employee.id}:${type}:${record.start}:${record.end}`),
        tenant_id: membership.tenant_id,
        employee_id: employee.id,
        type,
        start_date: record.start,
        end_date: record.end,
        days: record.days == null ? null : Number(record.days),
        status: record.status || 'approved',
        approver_id: null,
        comment: record.comment || null,
        metadata: { legacyId: key && !isUuid(key) ? String(key) : null, localData },
        created_by: isUuid(context.user_id) ? context.user_id : null
      };
    });
    if (leavePayloads.length) await upsertTable('hr', 'leave_records', leavePayloads);

    const periodEnd = (year, month) => new Date(Date.UTC(Number(year), Number(month), 0)).toISOString().slice(0, 10);
    const payrollRows = (employee.payments || []).map(payment => ({
      id: cloudId('hr', 'payroll_payments', `${employee.id}:${payment.year}-${payment.month}`),
      tenant_id: membership.tenant_id,
      company_id: membership.company_id,
      employee_id: employee.id,
      period_start: `${payment.year}-${String(payment.month).padStart(2, '0')}-01`,
      period_end: periodEnd(payment.year, payment.month),
      amount: Number(payment.amount) || 0,
      currency: employee.currency || 'UAH',
      status: payment.status || 'paid',
      calculation: { localData: payment }
    }));
    if (payrollRows.length) await upsertTable('hr', 'payroll_payments', payrollRows);

    const sickRows = (employee.sickLeaves || []).map(record => {
      const { id: _localId, ...localData } = record;
      return {
        id: cloudId('hr', 'sick_leave_records', record.id),
        tenant_id: membership.tenant_id,
        employee_id: employee.id,
        start_date: record.start,
        end_date: record.end || null,
        document_number: record.documentNumber || null,
        classification: record.type || 'sick',
        status: record.status || 'approved',
        metadata: { legacyId: isUuid(record.id) ? null : String(record.id), localData },
        updated_at: new Date().toISOString()
      };
    });
    if (sickRows.length) await upsertTable('hr', 'sick_leave_records', sickRows);
    return result;
  }

  async function deleteEmployee(id) {
    return rpc('nexus_delete_employee', { p_id: id });
  }

  async function archiveEmployee(id) {
    return rpc('nexus_archive_employee', { p_id: id });
  }

  async function listArchivedEmployees() {
    return rpc('nexus_list_archived_employees');
  }

  async function restoreEmployee(id) {
    return rpc('nexus_restore_employee', { p_id: id });
  }

  async function purgeEmployee(id) {
    return rpc('nexus_purge_employee', { p_id: id });
  }

  async function setDepartmentActive(id, isActive) {
    return rpc('nexus_set_department_active', { p_id: id, p_is_active: !!isActive });
  }

  async function purgeDepartment(id) {
    return rpc('nexus_purge_department', { p_id: id });
  }

  async function deleteHrLeave(id) {
    await deleteTableRow('hr', 'leave_records', cloudId('hr', 'leave_records', id));
  }

  async function deleteHrSickLeave(id) {
    await deleteTableRow('hr', 'sick_leave_records', cloudId('hr', 'sick_leave_records', id));
  }

  async function deleteHrPayrollPayment(employeeId, year, month) {
    const id = cloudId('hr', 'payroll_payments', `${employeeId}:${year}-${month}`);
    await deleteTableRow('hr', 'payroll_payments', id);
  }

  async function listProjects() {
    return rpc('nexus_list_projects');
  }

  async function upsertProject(project) {
    const contractId = project.contractId ? cloudId('documents', 'documents', project.contractId) : null;
    const addendumId = project.addendumId ? cloudId('documents', 'documents', project.addendumId) : null;
    const metadata = {
      ...(project.metadata || {}),
      manager: project.manager || project.metadata?.manager || '',
      contractName: project.contractName || project.metadata?.contractName || '',
      contractNum: project.contractNum || project.metadata?.contractNum || '',
      addendumName: project.addendumName || project.metadata?.addendumName || '',
      addendumNum: project.addendumNum || project.metadata?.addendumNum || '',
      customer: project.customer || project.metadata?.customer || '',
      amountSource: project.amountSource || project.metadata?.amountSource || 'contract',
      addendumAmount: Number(project.addendumAmount || project.metadata?.addendumAmount || 0)
    };
    const warnings = [];
    if (project.contractId && !isUuid(project.contractId)) {
      metadata.legacyContractId = project.contractId;
    } else {
      delete metadata.legacyContractId;
    }
    if (project.addendumId && !isUuid(project.addendumId)) {
      metadata.legacyAddendumId = project.addendumId;
    } else {
      delete metadata.legacyAddendumId;
    }
    const id = await rpc('nexus_upsert_project', {
      p_id: project.id,
      p_code: project.code,
      p_name: project.name,
      p_description: project.description || null,
      p_status: project.status || 'planning',
      p_contract_id: contractId,
      p_addendum_id: addendumId,
      p_amount: Number(project.contractAmount || project.amount || 0),
      p_currency: project.currency || 'UAH',
      p_start: project.start || null,
      p_end: project.end || null,
      p_metadata: metadata
    });
    return { id, warnings };
  }

  async function deleteProject(id) {
    return rpc('nexus_delete_project', { p_id: id });
  }

  async function listCrm() {
    const result = await rpc('nexus_list_crm');
    const parties = result?.parties || [];
    const activities = result?.activities || [];
    return {
      clients: parties.map(party => {
        const contacts = party.contacts || {};
        const addresses = party.addresses || {};
        const metadata = party.metadata || {};
        const id = metadata.legacyId || party.id;
        if (metadata.legacyId) {
          const map = JSON.parse(localStorage.getItem(ID_MAP_KEY) || '{}');
          map[`crm.parties:${metadata.legacyId}`] = party.id;
          localStorage.setItem(ID_MAP_KEY, JSON.stringify(map));
        }
        return {
          id,
          name: party.name,
          type: party.type,
          role: party.role,
          status: party.status,
          source: party.source || '',
          edrpou: party.tax_number || '',
          managerId: party.responsible_employee_id || '',
          contact: contacts.contact || '',
          position: contacts.position || '',
          phone: contacts.phone || '',
          email: contacts.email || '',
          website: contacts.website || '',
          city: addresses.city || '',
          address: addresses.address || '',
          tags: metadata.tags || '',
          notes: metadata.notes || '',
          createdAt: metadata.createdAt || '',
          updatedAt: party.updated_at || ''
        };
      }),
      activities: activities.map(activity => ({
        id: activity.metadata?.legacyId || activity.id,
        clientId: localIdFromCloud('crm', 'parties', activity.party_id),
        type: activity.type || 'note',
        text: activity.description || activity.subject || '',
        date: activity.activity_date ? String(activity.activity_date).slice(0, 10) : '',
        author: activity.metadata?.author || '',
        createdAt: activity.metadata?.createdAt || ''
      }))
    };
  }

  async function upsertCrmParty(client) {
    const [managerId] = await Promise.all([
      existingId('hr', 'employees', client.managerId)
    ]);
    return rpc('nexus_upsert_crm_party', {
      p_id: cloudId('crm', 'parties', client.id),
      p_name: client.name,
      p_type: client.type || 'company',
      p_role: client.role || 'customer',
      p_status: client.status || 'lead',
      p_source: client.source || null,
      p_tax_number: client.edrpou || null,
      p_responsible_employee_id: managerId,
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
        legacyId: isUuid(client.id) ? null : String(client.id),
        tags: client.tags || null,
        notes: client.notes || null,
        createdAt: client.createdAt || null
      }
    });
  }

  async function archiveCrmParty(id) {
    return rpc('nexus_archive_crm_party', { p_id: cloudId('crm', 'parties', id) });
  }

  async function upsertCrmActivity(activity) {
    const [projectId, employeeId] = await Promise.all([
      existingId('projects', 'projects', activity.projectId),
      existingId('hr', 'employees', activity.employeeId)
    ]);
    return rpc('nexus_upsert_crm_activity', {
      p_id: cloudId('crm', 'activities', activity.id),
      p_party_id: cloudId('crm', 'parties', activity.partyId),
      p_project_id: projectId,
      p_employee_id: employeeId,
      p_type: activity.type || 'note',
      p_activity_date: activity.activityDate || new Date().toISOString(),
      p_subject: activity.subject || null,
      p_description: activity.description || null,
      p_status: activity.status || 'open',
      p_metadata: {
        ...(activity.metadata || {}),
        legacyId: isUuid(activity.id) ? null : String(activity.id)
      }
    });
  }

  async function getContext() {
    return rpc('nexus_current_context');
  }

  async function listDocuments() {
    const rows = await listTable('documents', 'documents', 'created_at');
    return rows.map(row => {
      const meta = row.metadata || {};
      return {
        ...meta.localData,
        id: localIdFor('documents', 'documents', row),
        name: row.name || meta.name || '',
        type: row.type,
        num: row.number || '',
        projectId: row.project_id || meta.localData?.projectId || '',
        projectCode: meta.projectCode || '',
        projectName: meta.projectName || '',
        date: row.document_date || '',
        until: row.valid_until || '',
        amount: Number(row.amount) || 0,
        contractKind: row.contract_kind || '',
        clientId: row.party_id || meta.localData?.clientId || '',
        counter: meta.counter || '',
        edrpou: meta.edrpou || '',
        status: row.status,
        employeeId: row.responsible_employee_id || meta.localData?.employeeId || '',
        parentContractId: meta.legacyParentId || row.parent_document_id || '',
        link: meta.link || '',
        notes: meta.notes || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });
  }

  async function upsertDocument(document) {
    const { context, membership } = await tenantMembership();
    if (!membership.company_id) throw new Error('Для активного tenant не налаштовано компанію');
    const id = cloudId('documents', 'documents', document.id);
    const parentId = document.parentContractId
      ? cloudId('documents', 'documents', document.parentContractId)
      : null;
    const [partyId, projectId, employeeId] = await Promise.all([
      existingId('crm', 'parties', document.clientId),
      existingId('projects', 'projects', document.projectId),
      existingId('hr', 'employees', document.employeeId)
    ]);
    const { id: _localId, ...localData } = document;
    await upsertTable('documents', 'documents', {
      id,
      tenant_id: membership.tenant_id,
      company_id: membership.company_id,
      branch_id: membership.branch_id || null,
      type: document.type || 'other',
      status: document.status || 'draft',
      number: document.num || null,
      name: document.name || null,
      party_id: partyId,
      project_id: projectId,
      contract_kind: document.contractKind || null,
      parent_document_id: parentId,
      amount: Number(document.amount) || 0,
      currency: document.currency || 'UAH',
      document_date: document.date || null,
      valid_until: document.until || null,
      responsible_employee_id: employeeId,
      metadata: {
        legacyId: isUuid(document.id) ? null : String(document.id),
        legacyParentId: document.parentContractId || null,
        localData,
        projectCode: document.projectCode || '',
        projectName: document.projectName || '',
        counter: document.counter || '',
        edrpou: document.edrpou || '',
        link: document.link || '',
        notes: document.notes || ''
      },
      created_by: isUuid(context.user_id) ? context.user_id : null,
      updated_at: new Date().toISOString()
    });
    return id;
  }

  async function deleteDocument(id) {
    await deleteTableRow('documents', 'documents', cloudId('documents', 'documents', id));
  }

  async function listFinance() {
    const [categories, accounts, transactions] = await Promise.all([
      listTable('finance', 'categories', 'name'),
      listTable('finance', 'accounts', 'name'),
      listTable('finance', 'transactions', 'transaction_date')
    ]);
    return {
      categories: categories.map(row => ({
        id: localIdFor('finance', 'categories', row),
        name: row.name,
        type: row.type
      })),
      accounts: accounts.map(row => ({
        id: localIdFor('finance', 'accounts', row),
        name: row.name,
        type: row.type
      })),
      transactions: transactions.map(row => {
        const meta = row.metadata || {};
        return {
          ...meta.localData,
          id: localIdFor('finance', 'transactions', row),
          type: row.type,
          amount: Number(row.amount) || 0,
          date: row.transaction_date,
          categoryId: meta.legacyCategoryId || row.category_id || '',
          account: meta.localAccount || '',
          clientId: row.party_id || meta.localData?.clientId || '',
          counter: meta.counter || '',
          desc: row.description || '',
          projectId: row.project_id || meta.localData?.projectId || '',
          documentId: row.document_id || meta.localData?.documentId || ''
        };
      })
    };
  }

  async function upsertFinanceCategory(category, type) {
    const { membership } = await tenantMembership();
    const id = cloudId('finance', 'categories', category.id);
    await upsertTable('finance', 'categories', {
      id,
      tenant_id: membership.tenant_id,
      parent_id: null,
      code: String(category.id),
      name: category.name,
      type,
      is_active: true
    });
    return id;
  }

  async function upsertFinanceTransaction(operation, categories) {
    const { context, membership } = await tenantMembership();
    if (!membership.company_id) throw new Error('Для активного tenant не налаштовано компанію');
    const category = categories.find(item => item.id === operation.categoryId);
    if (!category) throw new Error('Категорію фінансової операції не знайдено');
    const categoryId = await upsertFinanceCategory(category, operation.type);
    const accountId = cloudId('finance', 'accounts', operation.account || 'other');
    const accountNames = { cash: 'Готівка', bank: 'Банк', card: 'Картка', other: 'Інше' };
    await upsertTable('finance', 'accounts', {
      id: accountId,
      tenant_id: membership.tenant_id,
      company_id: membership.company_id,
      branch_id: membership.branch_id || null,
      name: accountNames[operation.account] || String(operation.account || 'Інше'),
      type: operation.account || 'other',
      currency: 'UAH',
      metadata: { legacyId: String(operation.account || 'other') },
      is_active: true
    });
    const id = cloudId('finance', 'transactions', operation.id);
    const [partyId, projectId, documentId] = await Promise.all([
      existingId('crm', 'parties', operation.clientId),
      existingId('projects', 'projects', operation.projectId),
      existingId('documents', 'documents', operation.documentId)
    ]);
    const { id: _localId, ...localData } = operation;
    await upsertTable('finance', 'transactions', {
      id,
      tenant_id: membership.tenant_id,
      company_id: membership.company_id,
      branch_id: membership.branch_id || null,
      account_id: accountId,
      category_id: categoryId,
      party_id: partyId,
      project_id: projectId,
      document_id: documentId,
      type: operation.type,
      amount: Number(operation.amount),
      currency: 'UAH',
      transaction_date: operation.date,
      status: 'posted',
      description: operation.desc || null,
      metadata: {
        legacyId: isUuid(operation.id) ? null : String(operation.id),
        legacyCategoryId: category.id,
        localAccount: operation.account || 'other',
        counter: operation.counter || '',
        link: operation.link || '',
        localData
      },
      created_by: isUuid(context.user_id) ? context.user_id : null,
      updated_at: new Date().toISOString()
    });
    return id;
  }

  async function deleteFinanceTransaction(id) {
    await deleteTableRow('finance', 'transactions', cloudId('finance', 'transactions', id));
  }

  async function deleteFinanceCategory(id) {
    await deleteTableRow('finance', 'categories', cloudId('finance', 'categories', id));
  }

  async function listInventory() {
    const rows = await listTable('inventory', 'items', 'created_at');
    return rows.map(row => {
      const meta = row.metadata || {};
      return {
        ...meta.localData,
        id: localIdFor('inventory', 'items', row),
        name: row.name,
        category: row.category || 'other',
        inv: row.inventory_number || '',
        model: meta.model || '',
        serial: row.serial_number || '',
        cost: Number(row.purchase_price) || 0,
        date: row.purchase_date || '',
        status: row.status,
        employeeId: row.employee_id || meta.localData?.employeeId || '',
        projectId: row.project_id || meta.localData?.projectId || '',
        location: row.location || '',
        notes: meta.notes || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });
  }

  async function upsertInventoryItem(item) {
    const { membership } = await tenantMembership();
    if (!membership.company_id) throw new Error('Для активного tenant не налаштовано компанію');
    const [projectId, employeeId] = await Promise.all([
      existingId('projects', 'projects', item.projectId),
      existingId('hr', 'employees', item.employeeId)
    ]);
    const { id: _localId, ...localData } = item;
    await upsertTable('inventory', 'items', {
      id: cloudId('inventory', 'items', item.id),
      tenant_id: membership.tenant_id,
      company_id: membership.company_id,
      branch_id: membership.branch_id || null,
      project_id: projectId,
      employee_id: employeeId,
      inventory_number: item.inv || null,
      name: item.name,
      category: item.category || 'other',
      status: item.status || 'active',
      location: item.location || null,
      serial_number: item.serial || null,
      purchase_price: Number(item.cost) || 0,
      currency: item.currency || 'UAH',
      purchase_date: item.date || null,
      metadata: {
        legacyId: isUuid(item.id) ? null : String(item.id),
        model: item.model || '',
        notes: item.notes || '',
        localData
      },
      updated_at: new Date().toISOString()
    });
  }

  async function deleteInventoryItem(id) {
    await deleteTableRow('inventory', 'items', cloudId('inventory', 'items', id));
  }

  async function listFleet() {
    const [vehicles, cards, fuel, services, lines] = await Promise.all([
      listTable('fleet', 'vehicles', 'created_at'),
      listTable('fleet', 'fuel_cards', 'created_at'),
      listTable('fleet', 'fuel_transactions', 'transaction_date'),
      listTable('fleet', 'vehicle_service_records', 'service_date'),
      listTable('fleet', 'vehicle_service_lines', 'name')
    ]);
    const linesByRecord = new Map();
    lines.forEach(line => {
      if (!linesByRecord.has(line.service_record_id)) linesByRecord.set(line.service_record_id, []);
      linesByRecord.get(line.service_record_id).push({
        kind: line.kind,
        name: line.name,
        qty: Number(line.quantity) || 0,
        unit: line.unit || '',
        price: Number(line.unit_price) || 0,
        sum: Number(line.total) || 0
      });
    });
    return {
      vehicles: vehicles.map(row => {
        const meta = row.metadata || {};
        return {
          ...meta.localData,
          id: localIdFor('fleet', 'vehicles', row),
          plate: row.plate_number || '',
          make: row.make || '',
          model: row.model || '',
          vehicleType: row.vehicle_type || 'passenger',
          status: row.status,
          employeeId: row.employee_id || meta.localData?.employeeId || '',
          odometer: Number(row.odometer) || 0,
          vin: row.vin || '',
          invNumber: row.inventory_number || '',
          ownership: row.ownership_type || 'own',
          insuranceTo: row.insurance_until || '',
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      }),
      cards: cards.map(row => {
        const meta = row.metadata || {};
        return {
          ...meta.localData,
          id: localIdFor('fleet', 'fuel_cards', row),
          number: row.card_number,
          vehicleId: row.vehicle_id ? localIdFromCloud('fleet', 'vehicles', row.vehicle_id) : '',
          employeeId: meta.employeeId || '',
          holder: meta.holder || '',
          note: meta.note || '',
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      }),
      fuel: fuel.map(row => {
        const meta = row.metadata || {};
        return {
          ...meta.localData,
          id: localIdFor('fleet', 'fuel_transactions', row),
          vehicleId: row.vehicle_id ? localIdFromCloud('fleet', 'vehicles', row.vehicle_id) : '',
          cardId: row.card_id ? localIdFromCloud('fleet', 'fuel_cards', row.card_id) : '',
          employeeId: row.employee_id || meta.localData?.employeeId || '',
          date: row.transaction_date,
          liters: Number(row.quantity) || 0,
          cost: Number(row.amount) || 0,
          odometer: row.odometer == null ? null : Number(row.odometer),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      }),
      service: services.map(row => {
        const meta = row.metadata || {};
        return {
          ...meta.localData,
          id: localIdFor('fleet', 'vehicle_service_records', row),
          vehicleId: localIdFromCloud('fleet', 'vehicles', row.vehicle_id),
          date: row.service_date,
          workStatus: row.status,
          contractId: row.contract_id || meta.localData?.contractId || '',
          vendorId: row.vendor_party_id || meta.localData?.vendorId || '',
          cost: Number(row.amount) || 0,
          odometer: row.odometer == null ? null : Number(row.odometer),
          lines: linesByRecord.get(row.id) || meta.localData?.lines || [],
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      })
    };
  }

  async function syncFleetSnapshot(snapshot) {
    const { context, membership } = await tenantMembership();
    if (!membership.company_id) throw new Error('Для активного tenant не налаштовано компанію');
    const vehicles = snapshot.vehicles || [];
    const cards = snapshot.cards || [];
    const fuel = snapshot.fuel || [];
    const services = snapshot.service || [];
    const vehicleRows = await Promise.all(vehicles.map(async vehicle => {
      const [projectId, employeeId] = await Promise.all([
        existingId('projects', 'projects', vehicle.projectId),
        existingId('hr', 'employees', vehicle.employeeId)
      ]);
      const { id: _localId, ...localData } = vehicle;
      return {
        id: cloudId('fleet', 'vehicles', vehicle.id),
        tenant_id: membership.tenant_id,
        company_id: membership.company_id,
        branch_id: membership.branch_id || null,
        project_id: projectId,
        employee_id: employeeId,
        inventory_number: vehicle.invNumber || null,
        vehicle_type: vehicle.vehicleType || 'other',
        make: vehicle.make || null,
        model: vehicle.model || null,
        plate_number: vehicle.plate || null,
        vin: vehicle.vin || null,
        ownership_type: vehicle.ownership || 'own',
        status: vehicle.status || 'active',
        odometer: Number(vehicle.odometer) || 0,
        insurance_until: vehicle.insuranceTo || null,
        metadata: { legacyId: isUuid(vehicle.id) ? null : String(vehicle.id), localData },
        updated_at: new Date().toISOString()
      };
    }));
    if (vehicleRows.length) await upsertTable('fleet', 'vehicles', vehicleRows);

    const cardRows = cards.map(card => ({
      id: cloudId('fleet', 'fuel_cards', card.id),
      tenant_id: membership.tenant_id,
      vehicle_id: card.vehicleId && vehicles.some(v => v.id === card.vehicleId)
        ? cloudId('fleet', 'vehicles', card.vehicleId)
        : null,
      card_number: card.number,
      provider: card.provider || null,
      status: card.status || 'active',
      metadata: {
        legacyId: isUuid(card.id) ? null : String(card.id),
        employeeId: card.employeeId || '',
        holder: card.holder || '',
        note: card.note || '',
        localData: (({ id, ...rest }) => rest)(card)
      },
      updated_at: new Date().toISOString()
    }));
    if (cardRows.length) await upsertTable('fleet', 'fuel_cards', cardRows);

    const fuelRows = await Promise.all(fuel.map(async item => {
      const employeeId = await existingId('hr', 'employees', item.employeeId);
      const card = cards.find(record => record.id === item.cardId || record.number === item.cardNumber);
      const { id: _localId, ...localData } = item;
      return {
        id: cloudId('fleet', 'fuel_transactions', item.id),
        tenant_id: membership.tenant_id,
        vehicle_id: item.vehicleId && vehicles.some(v => v.id === item.vehicleId)
          ? cloudId('fleet', 'vehicles', item.vehicleId)
          : null,
        card_id: card ? cloudId('fleet', 'fuel_cards', card.id) : null,
        employee_id: employeeId,
        transaction_date: item.date,
        fuel_type: item.product || item.fuelType || null,
        quantity: Number(item.liters) || 0,
        amount: Number(item.cost) || 0,
        odometer: item.odometer == null ? null : Number(item.odometer),
        metadata: {
          legacyId: isUuid(item.id) ? null : String(item.id),
          localData
        },
        created_by: isUuid(context.user_id) ? context.user_id : null,
        updated_at: new Date().toISOString()
      };
    }));
    if (fuelRows.length) await upsertTable('fleet', 'fuel_transactions', fuelRows);

    for (const service of services) {
      const vehicle = vehicles.find(item => item.id === service.vehicleId);
      if (!vehicle) throw new Error('Не знайдено автомобіль для запису сервісу');
      const [vendorId, projectId] = await Promise.all([
        existingId('crm', 'parties', service.vendorId),
        existingId('projects', 'projects', service.projectId)
      ]);
      const { id: _localId, invoiceScan: _invoiceScan, ...localData } = service;
      const serviceId = cloudId('fleet', 'vehicle_service_records', service.id);
      await upsertTable('fleet', 'vehicle_service_records', {
        id: serviceId,
        tenant_id: membership.tenant_id,
        vehicle_id: cloudId('fleet', 'vehicles', vehicle.id),
        vendor_party_id: vendorId,
        contract_id: isUuid(service.contractId) ? service.contractId : null,
        project_id: projectId,
        service_date: service.date,
        odometer: service.odometer == null ? null : Number(service.odometer),
        description: service.description || service.comment || null,
        amount: Number(service.cost) || 0,
        status: service.workStatus || 'done',
        metadata: {
          legacyId: isUuid(service.id) ? null : String(service.id),
          localData,
          invoiceScanStoredLocally: !!_invoiceScan
        },
        created_by: isUuid(context.user_id) ? context.user_id : null,
        updated_at: new Date().toISOString()
      });
      const lines = (service.lines || []).map((line, index) => ({
        id: cloudId('fleet', 'vehicle_service_lines', `${service.id}:${index}`),
        tenant_id: membership.tenant_id,
        service_record_id: serviceId,
        kind: line.kind || 'work',
        name: line.name || 'Послуга',
        quantity: Number(line.qty) || 0,
        unit: line.unit || null,
        unit_price: Number(line.price) || 0,
        total: Number(line.sum) || 0
      }));
      const supabase = client();
      const { error } = await supabase.schema('fleet').from('vehicle_service_lines')
        .delete().eq('service_record_id', serviceId);
      if (error) throw error;
      if (lines.length) await upsertTable('fleet', 'vehicle_service_lines', lines);
    }
  }

  async function deleteFleetFuel(id) {
    await deleteTableRow('fleet', 'fuel_transactions', cloudId('fleet', 'fuel_transactions', id));
  }

  async function deleteFleetCard(id) {
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    const cloudCardId = cloudId('fleet', 'fuel_cards', id);
    const { error: updateError } = await supabase.schema('fleet').from('fuel_transactions')
      .update({ card_id: null }).eq('card_id', cloudCardId);
    if (updateError) throw updateError;
    await deleteTableRow('fleet', 'fuel_cards', cloudCardId);
  }

  async function deleteFleetService(id) {
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    const serviceId = cloudId('fleet', 'vehicle_service_records', id);
    const { error } = await supabase.schema('fleet').from('vehicle_service_lines')
      .delete().eq('service_record_id', serviceId);
    if (error) throw error;
    await deleteTableRow('fleet', 'vehicle_service_records', serviceId);
  }

  async function deleteFleetVehicle(id) {
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    const vehicleId = cloudId('fleet', 'vehicles', id);
    const { data: services, error: serviceError } = await supabase.schema('fleet')
      .from('vehicle_service_records').select('id').eq('vehicle_id', vehicleId);
    if (serviceError) throw serviceError;
    for (const service of services || []) {
      const { error } = await supabase.schema('fleet').from('vehicle_service_lines')
        .delete().eq('service_record_id', service.id);
      if (error) throw error;
    }
    const { error: linesError } = await supabase.schema('fleet').from('vehicle_service_records')
      .delete().eq('vehicle_id', vehicleId);
    if (linesError) throw linesError;
    const { error: fuelError } = await supabase.schema('fleet').from('fuel_transactions')
      .delete().eq('vehicle_id', vehicleId);
    if (fuelError) throw fuelError;
    const { error: cardsError } = await supabase.schema('fleet').from('fuel_cards')
      .update({ vehicle_id: null }).eq('vehicle_id', vehicleId);
    if (cardsError) throw cardsError;
    await deleteTableRow('fleet', 'vehicles', vehicleId);
  }

  async function listWarehouse() {
    const [warehouses, stockItems, moves, orders, lines] = await Promise.all([
      listTable('procurement', 'warehouses', 'created_at'),
      listTable('procurement', 'stock_items', 'created_at'),
      listTable('procurement', 'stock_moves', 'created_at'),
      listTable('procurement', 'purchase_orders', 'created_at'),
      listTable('procurement', 'purchase_order_lines', 'name')
    ]);
    const itemIds = new Map(stockItems.map(row => [row.id, row.metadata?.legacyItemId || row.id]));
    const warehouseIds = new Map(warehouses.map(row => [row.id, localIdFor('procurement', 'warehouses', row)]));
    const linesByOrder = new Map();
    lines.forEach(line => {
      if (!linesByOrder.has(line.order_id)) linesByOrder.set(line.order_id, []);
      linesByOrder.get(line.order_id).push({
        itemId: line.stock_item_id ? (itemIds.get(line.stock_item_id) || line.stock_item_id) : '',
        qty: Number(line.quantity) || 0,
        price: Number(line.unit_price) || 0,
        receivedQty: Number(line.metadata?.receivedQty) || 0
      });
    });
    const uniqueItems = new Map();
    stockItems.forEach(row => {
      const meta = row.metadata || {};
      const id = meta.legacyItemId || row.id;
      if (!uniqueItems.has(id)) {
        uniqueItems.set(id, {
          ...meta.localData,
          id,
          name: row.name,
          sku: row.sku || '',
          unit: row.unit,
          category: row.category || 'other',
          price: Number(row.average_cost) || 0,
          supplierId: meta.localData?.supplierId || '',
          notes: meta.localData?.notes || '',
          createdAt: row.created_at,
          updatedAt: row.updated_at
        });
      }
    });
    return {
      warehouses: warehouses.map(row => ({
        ...row.metadata?.localData,
        id: localIdFor('procurement', 'warehouses', row),
        name: row.name,
        city: row.metadata?.city || '',
        address: row.address || '',
        notes: row.metadata?.notes || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      items: Array.from(uniqueItems.values()),
      moves: moves.map(row => ({
        ...(() => {
          try { return JSON.parse(row.comment || '{}'); }
          catch (_) { return { note: row.comment || '' }; }
        })(),
        id: localIdFor('procurement', 'stock_moves', row),
        itemId: itemIds.get(row.stock_item_id) || row.stock_item_id,
        warehouseId: warehouseIds.get(row.warehouse_id) || row.warehouse_id,
        type: row.type,
        qty: Number(row.quantity) || 0,
        date: row.created_at ? String(row.created_at).slice(0, 10) : '',
        projectId: localIdFromCloud('projects', 'projects', row.project_id) || '',
        createdAt: row.created_at
      })),
      orders: orders.map(row => ({
        ...row.metadata?.localData,
        id: localIdFor('procurement', 'purchase_orders', row),
        date: row.metadata?.localData?.date || row.created_at?.slice(0, 10) || '',
        status: row.status,
        supplierId: row.supplier_party_id
          ? localIdFromCloud('crm', 'parties', row.supplier_party_id)
          : row.metadata?.localData?.supplierId || '',
        warehouseId: warehouseIds.get(row.warehouse_id) || row.warehouse_id,
        projectId: row.project_id
          ? localIdFromCloud('projects', 'projects', row.project_id)
          : row.metadata?.localData?.projectId || '',
        num: row.number || '',
        eta: row.expected_date || '',
        lines: linesByOrder.get(row.id) || row.metadata?.localData?.lines || [],
        updatedAt: row.updated_at,
        createdAt: row.created_at
      }))
    };
  }

  async function syncWarehouseSnapshot(snapshot) {
    const { context, membership } = await tenantMembership();
    if (!membership.company_id) throw new Error('Для активного tenant не налаштовано компанію');
    const warehouses = snapshot.warehouses || [];
    if (!warehouses.length) throw new Error('Створіть склад перед синхронізацією закупівель');
    const items = snapshot.items || [];
    const moves = snapshot.moves || [];
    const orders = snapshot.orders || [];
    const warehouseRows = warehouses.map(warehouse => {
      const { id: _localId, ...localData } = warehouse;
      return {
        id: cloudId('procurement', 'warehouses', warehouse.id),
        tenant_id: membership.tenant_id,
        company_id: membership.company_id,
        branch_id: membership.branch_id || null,
        name: warehouse.name || 'Склад',
        code: warehouse.code || null,
        address: warehouse.address || null,
        metadata: {
          legacyId: isUuid(warehouse.id) ? null : String(warehouse.id),
          city: warehouse.city || '',
          notes: warehouse.notes || '',
          localData
        },
        is_active: warehouse.isActive !== false,
        updated_at: new Date().toISOString()
      };
    });
    await upsertTable('procurement', 'warehouses', warehouseRows);

    const stockId = (itemId, warehouseId) =>
      cloudId('procurement', 'stock_items', `${itemId}|${warehouseId}`);
    const stockRows = [];
    for (const warehouse of warehouses) {
      for (const item of items) {
        const { id: _localId, ...localData } = item;
        const quantity = (moves.filter(move => move.itemId === item.id && move.warehouseId === warehouse.id)
          .slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
          .reduce((balance, move) => move.type === 'in' ? balance + Number(move.qty || 0)
            : move.type === 'out' ? balance - Number(move.qty || 0)
            : Number(move.qty) || 0, 0));
        stockRows.push({
          id: stockId(item.id, warehouse.id),
          tenant_id: membership.tenant_id,
          warehouse_id: cloudId('procurement', 'warehouses', warehouse.id),
          name: item.name,
          sku: item.sku || null,
          category: item.category || 'other',
          unit: item.unit || 'шт',
          quantity: Math.round(quantity * 1000) / 1000,
          reserved_quantity: 0,
          average_cost: Number(item.price) || 0,
          metadata: {
            legacyId: `${item.id}|${warehouse.id}`,
            legacyItemId: item.id,
            legacyWarehouseId: warehouse.id,
            localData
          },
          updated_at: new Date().toISOString()
        });
      }
    }
    if (stockRows.length) await upsertTable('procurement', 'stock_items', stockRows);

    const moveRows = await Promise.all(moves.map(async move => {
      const item = items.find(row => row.id === move.itemId);
      if (!item) throw new Error('Не знайдено номенклатуру для складського руху');
      const warehouse = warehouses.find(row => row.id === move.warehouseId) || warehouses[0];
      return {
        id: cloudId('procurement', 'stock_moves', move.id),
        tenant_id: membership.tenant_id,
        warehouse_id: cloudId('procurement', 'warehouses', warehouse.id),
        stock_item_id: stockId(item.id, warehouse.id),
        type: move.type,
        quantity: Number(move.qty) || 0,
        unit_cost: Number(item.price) || 0,
        project_id: await existingId('projects', 'projects', move.projectId),
        document_id: null,
        comment: JSON.stringify({
          docNum: move.docNum || '',
          note: move.note || '',
          supplierId: move.supplierId || '',
          departmentId: move.departmentId || '',
          department: move.department || '',
          siteCode: move.siteCode || '',
          recipientType: move.recipientType || '',
          recipientId: move.recipientId || '',
          userName: move.userName || ''
        }),
        created_by: isUuid(context.user_id) ? context.user_id : null,
        created_at: move.date ? new Date(move.date + 'T12:00:00').toISOString() : new Date().toISOString()
      };
    }));
    if (moveRows.length) await upsertTable('procurement', 'stock_moves', moveRows);

    for (const order of orders) {
      const warehouse = warehouses.find(row => row.id === order.warehouseId) || warehouses[0];
      const [supplierId, projectId] = await Promise.all([
        existingId('crm', 'parties', order.supplierId),
        existingId('projects', 'projects', order.projectId)
      ]);
      const orderId = cloudId('procurement', 'purchase_orders', order.id);
      const { id: _localId, ...localData } = order;
      const amount = (order.lines || []).reduce((sum, line) =>
        sum + (Number(line.qty) || 0) * (Number(line.price) || 0), 0);
      await upsertTable('procurement', 'purchase_orders', {
        id: orderId,
        tenant_id: membership.tenant_id,
        company_id: membership.company_id,
        warehouse_id: cloudId('procurement', 'warehouses', warehouse.id),
        supplier_party_id: supplierId,
        project_id: projectId,
        number: order.num || null,
        status: order.status || 'draft',
        currency: order.currency || 'UAH',
        amount,
        expected_date: order.eta || null,
        metadata: {
          legacyId: isUuid(order.id) ? null : String(order.id),
          localData,
          approvals: order.approvals || {}
        },
        created_by: isUuid(context.user_id) ? context.user_id : null,
        updated_at: new Date().toISOString()
      });
      const orderLines = (order.lines || []).map((line, index) => {
        const item = items.find(row => row.id === line.itemId);
        return {
          id: cloudId('procurement', 'purchase_order_lines', `${order.id}:${index}`),
          tenant_id: membership.tenant_id,
          order_id: orderId,
          stock_item_id: item ? stockId(item.id, warehouse.id) : null,
          name: item?.name || 'Позиція',
          quantity: Number(line.qty) || 0,
          unit: item?.unit || 'шт',
          unit_price: Number(line.price) || 0,
          total: (Number(line.qty) || 0) * (Number(line.price) || 0),
          metadata: { receivedQty: Number(line.receivedQty) || 0 }
        };
      });
      const supabase = client();
      const { error } = await supabase.schema('procurement').from('purchase_order_lines')
        .delete().eq('order_id', orderId);
      if (error) throw error;
      if (orderLines.length) await upsertTable('procurement', 'purchase_order_lines', orderLines);
    }
  }

  async function deleteWarehouseMove(id) {
    await deleteTableRow('procurement', 'stock_moves', cloudId('procurement', 'stock_moves', id));
  }

  async function deleteWarehouseOrder(id) {
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    const orderId = cloudId('procurement', 'purchase_orders', id);
    const { error } = await supabase.schema('procurement').from('purchase_order_lines')
      .delete().eq('order_id', orderId);
    if (error) throw error;
    await deleteTableRow('procurement', 'purchase_orders', orderId);
  }

  async function deleteWarehouseItem(id, warehouseIds) {
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    for (const warehouseId of warehouseIds) {
      const stockItemId = cloudId('procurement', 'stock_items', `${id}|${warehouseId}`);
      const { error: moveError } = await supabase.schema('procurement').from('stock_moves')
        .delete().eq('stock_item_id', stockItemId);
      if (moveError) throw moveError;
      await deleteTableRow('procurement', 'stock_items', stockItemId);
    }
  }

  async function deleteWarehouseLocation(id, itemIds) {
    for (const itemId of itemIds) {
      await deleteTableRow('procurement', 'stock_items', cloudId('procurement', 'stock_items', `${itemId}|${id}`));
    }
    await deleteTableRow('procurement', 'warehouses', cloudId('procurement', 'warehouses', id));
  }

  async function listMailMessages() {
    const rows = await listTable('core', 'mail_messages', 'sent_at');
    return rows.map(row => {
      const meta = row.metadata || {};
      return {
        ...meta.localData,
        id: localIdFor('core', 'mail_messages', row),
        type: 'internal',
        fromId: row.from_user_id,
        fromName: meta.fromName || '',
        toId: row.to_user_id,
        toName: meta.toName || '',
        subject: row.subject || '',
        body: row.body || '',
        at: row.sent_at,
        read: !!row.read_at,
        archived: !!row.archived
      };
    });
  }

  async function upsertMailMessage(message) {
    const { context, membership } = await tenantMembership();
    if (!isUuid(context.user_id) || message.fromId !== context.user_id) {
      throw new Error('Надсилати повідомлення від імені іншого користувача заборонено');
    }
    if (!isUuid(message.toId)) throw new Error('Одержувач має бути активним користувачем NEXUS');
    const { id: _localId, ...localData } = message;
    await upsertTable('core', 'mail_messages', {
      id: cloudId('core', 'mail_messages', message.id),
      tenant_id: membership.tenant_id,
      from_user_id: context.user_id,
      to_user_id: message.toId,
      subject: message.subject || null,
      body: message.body || null,
      folder: 'sent',
      archived: !!message.archived,
      read_at: null,
      sent_at: message.at || new Date().toISOString(),
      metadata: {
        legacyId: isUuid(message.id) ? null : String(message.id),
        fromName: message.fromName || '',
        toName: message.toName || '',
        localData
      },
      updated_at: new Date().toISOString()
    });
  }

  async function deleteMailMessage(id) {
    await deleteTableRow('core', 'mail_messages', cloudId('core', 'mail_messages', id));
  }

  async function listHrRequests() {
    const [templates, requests] = await Promise.all([
      listTable('hr', 'request_templates', 'created_at'),
      listTable('hr', 'requests', 'created_at')
    ]);
    return {
      templates: templates.map(row => {
        const data = row.template_data || {};
        const legacyId = data.legacyId || row.id;
        if (data.legacyId) {
          const map = JSON.parse(localStorage.getItem(ID_MAP_KEY) || '{}');
          map[`hr.request_templates:${data.legacyId}`] = row.id;
          localStorage.setItem(ID_MAP_KEY, JSON.stringify(map));
        }
        return { ...data.localData, id: legacyId, name: row.name, type: row.type, fullText: data.fullText || '' };
      }),
      requests: requests.map(row => {
        const data = row.form_data || {};
        const legacyId = data.legacyId || row.id;
        if (data.legacyId) {
          const map = JSON.parse(localStorage.getItem(ID_MAP_KEY) || '{}');
          map[`hr.requests:${data.legacyId}`] = row.id;
          localStorage.setItem(ID_MAP_KEY, JSON.stringify(map));
        }
        return {
          ...data,
          id: legacyId,
          templateId: data.templateId || '',
          employeeId: row.employee_id || data.employeeId || null,
          status: row.status,
          updatedAt: row.updated_at || data.updatedAt || '',
          createdAt: row.created_at || data.createdAt || ''
        };
      })
    };
  }

  async function upsertHrRequestTemplate(template) {
    const { membership } = await tenantMembership();
    const { id: _localId, contentBase64: _fileData, ...localData } = template;
    await upsertTable('hr', 'request_templates', {
      id: cloudId('hr', 'request_templates', template.id),
      tenant_id: membership.tenant_id,
      name: template.name || 'Заявка',
      type: template.type || 'general',
      template_url: template.templateUrl || null,
      template_data: {
        legacyId: isUuid(template.id) ? null : String(template.id),
        fullText: template.fullText || '',
        localData,
        fileContentOmitted: !!template.contentBase64
      },
      placeholders: template.placeholders || [],
      is_active: template.isActive !== false,
      updated_at: new Date().toISOString()
    });
  }

  async function deleteHrRequestTemplate(id) {
    await deleteTableRow('hr', 'request_templates', cloudId('hr', 'request_templates', id));
  }

  async function upsertHrRequest(request) {
    const { context, membership } = await tenantMembership();
    const [templateId, employeeId] = await Promise.all([
      existingId('hr', 'request_templates', cloudId('hr', 'request_templates', request.templateId)),
      existingId('hr', 'employees', request.employeeId)
    ]);
    await upsertTable('hr', 'requests', {
      id: cloudId('hr', 'requests', request.id),
      tenant_id: membership.tenant_id,
      template_id: templateId,
      employee_id: employeeId,
      initiated_by: isUuid(request.userId) ? request.userId : (isUuid(context.user_id) ? context.user_id : null),
      status: request.status || 'draft',
      form_data: {
        ...request,
        legacyId: isUuid(request.id) ? null : String(request.id)
      },
      updated_at: request.updatedAt || new Date().toISOString()
    });
  }

  async function deleteHrRequest(id) {
    await deleteTableRow('hr', 'requests', cloudId('hr', 'requests', id));
  }

  async function listTasks() {
    const rows = await listTable('projects', 'tasks', 'position');
    return rows.map(row => ({ ...row, id: localIdFor('projects', 'tasks', row) }));
  }

  async function upsertTask(task) {
    const supabase = client();
    if (!supabase) throw new Error('Supabase не підключено');
    const { context, membership } = await tenantMembership();
    const [projectId, employeeId] = await Promise.all([
      existingId('projects', 'projects', task.projectId),
      existingId('hr', 'employees', task.employeeId)
    ]);
    const { id: _localId, ...localData } = task;
    const payload = {
      id: cloudId('projects', 'tasks', task.id),
      tenant_id: membership.tenant_id,
      project_id: projectId,
      assignee_id: employeeId,
      title: task.title,
      description: task.description || null,
      status: task.status || 'backlog',
      priority: task.priority || 'normal',
      start_date: task.startDate || null,
      deadline: task.deadline || null,
      metadata: {
        ...(task.metadata || {}),
        legacyId: isUuid(task.id) ? null : String(task.id),
        localData
      },
      reporter_id: isUuid(context.user_id) ? context.user_id : null,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.schema('projects').from('tasks').upsert(payload);
    if (error) throw error;
  }

  async function deleteTask(id) {
    await deleteTableRow('projects', 'tasks', cloudId('projects', 'tasks', id));
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
    archiveEmployee,
    listArchivedEmployees,
    restoreEmployee,
    purgeEmployee,
    setDepartmentActive,
    purgeDepartment,
    deleteHrLeave,
    deleteHrSickLeave,
    deleteHrPayrollPayment,
    listProjects,
    upsertProject,
    deleteProject,
    listCrm,
    upsertCrmParty,
    archiveCrmParty,
    upsertCrmActivity,
    getContext,
    listDocuments,
    upsertDocument,
    deleteDocument,
    listFinance,
    upsertFinanceCategory,
    upsertFinanceTransaction,
    deleteFinanceTransaction,
    deleteFinanceCategory,
    listInventory,
    upsertInventoryItem,
    deleteInventoryItem,
    listFleet,
    syncFleetSnapshot,
    deleteFleetFuel,
    deleteFleetCard,
    deleteFleetService,
    deleteFleetVehicle,
    listWarehouse,
    syncWarehouseSnapshot,
    deleteWarehouseMove,
    deleteWarehouseOrder,
    deleteWarehouseItem,
    deleteWarehouseLocation,
    listMailMessages,
    upsertMailMessage,
    deleteMailMessage,
    listHrRequests,
    upsertHrRequestTemplate,
    deleteHrRequestTemplate,
    upsertHrRequest,
    deleteHrRequest,
    listTasks,
    upsertTask,
    deleteTask,
    listCalendarEvents,
    upsertCalendarEvent,
    deleteCalendarEvent
  });
})();
