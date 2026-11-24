/* NEXUS — заявки в особистому кабінеті
 * Шаблон → чернетка → на PM → на директора → схвалено (друк) / відхилено
 */
const CabRequests = (() => {
  'use strict';

  const TPL_KEY = 'nexus_hr_requests_v1';
  const SUB_KEY = 'nexus_hr_request_submissions_v1';
  const HR_KEY = 'nexus_hr_ua_v2';
  const USERS_KEY = 'nexus_users_v1';
  const SESSION_KEY = 'nexus_session_v1';

  const STATUS = {
    draft: { label: 'Чернетка', cls: 'cab-req-status--draft' },
    pending_pm: { label: 'Очікує PM', cls: 'cab-req-status--pm' },
    pending_director: { label: 'Очікує директора', cls: 'cab-req-status--dir' },
    approved: { label: 'Схвалено', cls: 'cab-req-status--ok' },
    rejected: { label: 'Відхилено', cls: 'cab-req-status--no' }
  };

  function read(key, fb) {
    try {
      if (window.NexusCore && NexusCore.read) return NexusCore.read(key, fb);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fb;
    } catch (e) { return fb; }
  }

  function write(key, val) {
    try {
      if (window.NexusCore && NexusCore.write) return NexusCore.write(key, val);
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      alert('Не вдалося зберегти дані');
      return false;
    }
  }

  function uid() {
    if (window.NexusCore && NexusCore.id) return NexusCore.id('sub');
    return 'sub_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function now() { return new Date().toISOString(); }

  function getUser() {
    if (window.NexusCore && NexusCore.getCurrentUser) return NexusCore.getCurrentUser();
    try {
      const sess = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (!sess || !sess.userId) return null;
      if (sess.expiresAt && sess.expiresAt < Date.now()) return null;
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      return users.find(u => u.id === sess.userId) || null;
    } catch (e) { return null; }
  }

  /** admin | manager | viewer */
  function roleOf(user) {
    user = user || getUser();
    if (!user) return '';
    const r = String(user.role || '').toLowerCase().trim();
    if (r === 'admin' || r === 'administrator' || r === 'директор' || r === 'адмін' || r === 'админ') return 'admin';
    if (r === 'manager' || r === 'менеджер' || r === 'pm') return 'manager';
    if (r === 'viewer' || r === 'перегляд' || r === 'просмотр') return 'viewer';
    return r;
  }

  function getEmployees() {
    const db = read(HR_KEY, { employees: [] });
    return Array.isArray(db.employees) ? db.employees : [];
  }

  function linkedEmployee(user) {
    user = user || getUser();
    if (!user) return null;
    const emps = getEmployees();
    if (user.employeeId) {
      const e = emps.find(x => x.id === user.employeeId);
      if (e) return e;
    }
    const n = (user.fullName || '').trim().toLowerCase();
    if (n) return emps.find(x => (x.fullName || '').trim().toLowerCase() === n) || null;
    return null;
  }

  function splitName(fullName) {
    const p = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    return { lastName: p[0] || '', firstName: p[1] || '', middleName: p.slice(2).join(' ') || '', fullName: String(fullName || '').trim() };
  }

  function personFromUser() {
    const emp = linkedEmployee();
    const user = getUser();
    if (emp) return { ...splitName(emp.fullName), position: emp.position || '', employeeId: emp.id, source: 'employee' };
    if (user) return { ...splitName(user.fullName || user.username), position: '', employeeId: null, source: 'user' };
    return { lastName: '', firstName: '', middleName: '', fullName: '', position: '', employeeId: null, source: 'none' };
  }

  function applyPlaceholders(text, p) {
    let out = String(text || '');
    const pairs = [
      ['{{ПІБ}}', p.fullName], ['{{Прізвище}}', p.lastName], ["{{Ім'я}}", p.firstName],
      ['{{Імя}}', p.firstName], ['{{ПоБатькові}}', p.middleName], ['{{Посада}}', p.position || ''],
      ['{{fullName}}', p.fullName], ['{{lastName}}', p.lastName], ['{{firstName}}', p.firstName],
      ['{{middleName}}', p.middleName], ['{{position}}', p.position || '']
    ];
    pairs.forEach(([a, b]) => { out = out.split(a).join(b || ''); });
    return out;
  }

  function templates() {
    const s = read(TPL_KEY, { templates: [] });
    return Array.isArray(s.templates) ? s.templates : [];
  }

  function loadSubs() {
    const s = read(SUB_KEY, { items: [] });
    return Array.isArray(s.items) ? s.items : [];
  }

  function saveSubs(items) {
    const saved = write(SUB_KEY, { items: items });
    if (window.nexusData) {
      items.forEach(item => {
        nexusData.upsertHrRequest(item).catch(error =>
          alert('Помилка збереження заявки в Supabase: ' + (error.message || error))
        );
      });
    }
    return saved;
  }

  function canApproveDirector(user) {
    return roleOf(user) === 'admin';
  }

  function loadProjects() {
    try {
      if (window.NexusCore && NexusCore.getProjects) return NexusCore.getProjects() || [];
      const raw = localStorage.getItem('nexus_projects_v1');
      const p = raw ? JSON.parse(raw) : null;
      return p && Array.isArray(p.projects) ? p.projects : [];
    } catch (e) { return []; }
  }

  /** Нормалізація імені для порівняння */
  function normName(s) {
    return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /** Імена, якими можна впізнати поточного користувача як PM проекту */
  function userMatchNames(user) {
    user = user || getUser();
    if (!user) return [];
    const names = new Set();
    if (user.fullName) names.add(normName(user.fullName));
    if (user.username) names.add(normName(user.username));
    const emp = linkedEmployee(user);
    if (emp && emp.fullName) names.add(normName(emp.fullName));
    return Array.from(names).filter(Boolean);
  }

  /** Проекти, де user зазначений керівником (поле manager у проекті) */
  function projectsManagedBy(user) {
    user = user || getUser();
    if (!user) return [];
    const names = userMatchNames(user);
    if (!names.length) return [];
    return loadProjects().filter(p => {
      if (p.managerUserId && p.managerUserId === user.id) return true;
      if (p.managerEmployeeId) {
        const emp = linkedEmployee(user);
        if (emp && p.managerEmployeeId === emp.id) return true;
      }
      const m = normName(p.manager);
      return m && names.some(n => n === m || m.includes(n) || n.includes(m));
    });
  }

  /** projectIds співробітника-автора заявки */
  function employeeProjectIds(sub) {
    if (sub && Array.isArray(sub.projectIds) && sub.projectIds.length) return sub.projectIds;
    const emps = getEmployees();
    let emp = null;
    if (sub && sub.employeeId) emp = emps.find(e => e.id === sub.employeeId) || null;
    if (!emp && sub && sub.employeeName) {
      const n = normName(sub.employeeName);
      emp = emps.find(e => normName(e.fullName) === n) || null;
    }
    if (!emp) return [];
    if (Array.isArray(emp.projectIds)) return emp.projectIds.filter(Boolean);
    if (emp.projectId) return [emp.projectId];
    return [];
  }

  /**
   * Право на етап PM:
   * - admin (директор) — завжди
   * - manager — лише якщо веде хоча б один проект співробітника-автора
   * - viewer — ніколи
   */
  function canApprovePm(user, sub) {
    user = user || getUser();
    if (!user) return false;
    if (roleOf(user) === 'admin') return true;
    if (roleOf(user) !== 'manager') return false;
    if (!sub) {
      // Чи є хоч одна заявка, яку цей PM може підписати
      return inboxPm(user).length > 0 || projectsManagedBy(user).length > 0;
    }
    const managed = projectsManagedBy(user).map(p => p.id);
    if (!managed.length) return false;
    const empProjects = employeeProjectIds(sub);
    if (!empProjects.length) return false; // немає проекту — лише директор
    return empProjects.some(pid => managed.includes(pid));
  }

  function managedProjectLabels(user, sub) {
    const managed = projectsManagedBy(user);
    const empP = new Set(employeeProjectIds(sub));
    return managed.filter(p => empP.has(p.id)).map(p => (p.code ? p.code + ' — ' : '') + (p.name || p.id));
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function statusHtml(st) {
    const m = STATUS[st] || STATUS.draft;
    return '<span class="cab-req-status ' + m.cls + '">' + esc(m.label) + '</span>';
  }

  function mySubs(user) {
    user = user || getUser();
    if (!user) return [];
    const emp = linkedEmployee(user);
    return loadSubs().filter(x =>
      x.userId === user.id ||
      (emp && x.employeeId && x.employeeId === emp.id)
    ).sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
  }

  function inboxPm(user) {
    user = user || getUser();
    return loadSubs().filter(x => {
      if (x.status !== 'pending_pm') return false;
      if (!user) return false;
      if (roleOf(user) === 'admin') return true;
      if (roleOf(user) !== 'manager') return false;
      const managed = projectsManagedBy(user).map(p => p.id);
      if (!managed.length) return false;
      const empProjects = employeeProjectIds(x);
      if (!empProjects.length) return false;
      return empProjects.some(pid => managed.includes(pid));
    }).sort((a, b) => String(a.submittedAt || '').localeCompare(String(b.submittedAt || '')));
  }

  function inboxDirector() {
    return loadSubs().filter(x => x.status === 'pending_director')
      .sort((a, b) => String(a.submittedAt || '').localeCompare(String(b.submittedAt || '')));
  }

  function renderCabinetCard() {
    const body = document.getElementById('cab-requests-body');
    const inboxBtn = document.getElementById('cab-req-inbox');
    if (!body) return;
    const user = getUser();
    if (!user) {
      body.innerHTML = '<div class="cabinet-empty">Увійдіть у систему</div>';
      if (inboxBtn) inboxBtn.style.display = 'none';
      return;
    }

    const list = mySubs(user).slice(0, 6);
    if (!list.length) {
      body.innerHTML = '<div class="cabinet-empty">Заявок ще немає. Натисніть «Нова заявка».</div>';
    } else {
      body.innerHTML = list.map(s =>
        '<div class="cab-row" style="cursor:pointer" data-sub="' + esc(s.id) + '">' +
        '<div class="cab-row__icon">📄</div><div class="cab-row__main">' +
        '<div class="cab-row__title">' + esc(s.title || 'Заявка') + '</div>' +
        '<div class="cab-row__meta">' + statusHtml(s.status) +
        (s.updatedAt ? ' · ' + esc(String(s.updatedAt).slice(0, 10)) : '') +
        '</div></div></div>'
      ).join('');
      body.querySelectorAll('[data-sub]').forEach(el => {
        el.addEventListener('click', () => openSubmission(el.getAttribute('data-sub')));
      });
    }

    if (inboxBtn) {
      const n = (canApprovePm(user) ? inboxPm().length : 0) + (canApproveDirector(user) ? inboxDirector().length : 0);
      // avoid double-count if admin sees both queues - count unique ids
      const ids = new Set();
      if (canApprovePm(user)) inboxPm().forEach(x => ids.add(x.id));
      if (canApproveDirector(user)) inboxDirector().forEach(x => ids.add(x.id));
      if (ids.size) {
        inboxBtn.style.display = '';
        inboxBtn.textContent = '📥 На погодження (' + ids.size + ')';
      } else {
        inboxBtn.style.display = canApprovePm(user) || canApproveDirector(user) ? '' : 'none';
        if (canApprovePm(user) || canApproveDirector(user)) inboxBtn.textContent = '📥 На погодження';
      }
    }
  }

  function openModal(title, html) {
    const m = document.getElementById('cab-req-modal');
    const t = document.getElementById('cab-req-modal-title');
    const b = document.getElementById('cab-req-modal-body');
    if (!m || !b) return;
    if (t) t.textContent = title || 'Заявка';
    b.innerHTML = html;
    m.classList.add('open');
    m.style.display = 'flex';
  }

  function closeModal() {
    const m = document.getElementById('cab-req-modal');
    if (!m) return;
    m.classList.remove('open');
    m.style.display = 'none';
  }

  function openNew() {
    const user = getUser();
    if (!user) { alert('Увійдіть у систему'); return; }
    const tpls = templates().filter(t => (t.fullText || '').trim() || t.name);
    if (!tpls.length) {
      openModal('Нова заявка',
        '<p>Немає шаблонів заявок.</p>' +
        '<p class="tsm tmu">Адміністратор може додати їх у <a href="hr.html#requests">Кадровий облік → Заявки</a>.</p>' +
        '<p style="margin-top:12px"><button type="button" class="btn bs" id="cab-req-blank">Створити порожню заявку</button></p>'
      );
      document.getElementById('cab-req-blank')?.addEventListener('click', () => startFromTemplate(null));
      return;
    }
    openModal('Оберіть тип заявки',
      '<div style="display:flex;flex-direction:column;gap:8px">' +
      tpls.map(t =>
        '<button type="button" class="btn bs" style="justify-content:flex-start;text-align:left" data-tpl="' + esc(t.id) + '">' +
        '📄 ' + esc(t.name || 'Без назви') + '</button>'
      ).join('') +
      '<button type="button" class="btn bs" id="cab-req-blank">Порожня заявка</button></div>'
    );
    document.querySelectorAll('[data-tpl]').forEach(btn => {
      btn.addEventListener('click', () => startFromTemplate(btn.getAttribute('data-tpl')));
    });
    document.getElementById('cab-req-blank')?.addEventListener('click', () => startFromTemplate(null));
  }

  function startFromTemplate(tplId) {
    const user = getUser();
    const p = personFromUser();
    let title = 'Заявка';
    let text = 'Я, {{ПІБ}}, прошу …\n\nПрізвище: {{Прізвище}}\nІм\'я: {{Ім\'я}}\nПо батькові: {{ПоБатькові}}\n';
    if (tplId) {
      const t = templates().find(x => x.id === tplId);
      if (t) {
        title = t.name || title;
        text = t.fullText || text;
      }
    }
    text = applyPlaceholders(text, p);
    const items = loadSubs();
    const sub = {
      id: uid(),
      templateId: tplId || null,
      title,
      text,
      status: 'draft',
      userId: user.id,
      userName: user.fullName || user.username,
      employeeId: p.employeeId,
      employeeName: p.fullName,
      createdAt: now(),
      updatedAt: now(),
      submittedAt: null,
      pmBy: null, pmAt: null, pmName: null,
      dirBy: null, dirAt: null, dirName: null,
      rejectReason: '',
      rejectedBy: null,
      projectIds: []
    };
    sub.projectIds = employeeProjectIds(sub);
    items.push(sub);
    saveSubs(items);
    if (window.NexusCore && NexusCore.audit) {
      NexusCore.audit('request.create', 'request', { id: sub.id, title });
    }
    openSubmission(sub.id);
    renderCabinetCard();
  }

  function getSub(id) {
    return loadSubs().find(x => x.id === id) || null;
  }

  function openSubmission(id) {
    const s = getSub(id);
    if (!s) { alert('Заявку не знайдено'); return; }
    const user = getUser();
    const isOwner = user && (s.userId === user.id || (linkedEmployee(user) && s.employeeId === linkedEmployee(user).id));
    const editable = isOwner && s.status === 'draft';
    const canPm = s.status === 'pending_pm' && canApprovePm(user, s);
    const canDir = canApproveDirector(user) && s.status === 'pending_director';
    const canPrint = s.status === 'approved';
    const isAdmin = roleOf(user) === 'admin';

    let html = '';
    html += '<div style="margin-bottom:10px">' + statusHtml(s.status) +
      ' <span class="tsm tmu">· ' + esc(s.employeeName || s.userName || '') +
      (user ? ' · ви: ' + esc(user.username || '') + ' (' + esc(roleOf(user) || user.role || '') + ')' : '') +
      '</span></div>';

    if (isAdmin && s.status === 'draft') {
      html += '<div style="padding:10px;border-radius:8px;background:#fff7ed;color:#9a3412;margin-bottom:12px;font-size:13px">' +
        '<b>Заявка ще в чернетці.</b> Кнопки схвалення зʼявляться після «Відправити на погодження». ' +
        (isOwner ? 'Натисніть «Відправити на погодження» нижче.' : 'Це має зробити автор заявки (або відкрийте її під його обліком).') +
        '</div>';
    }
    if (isAdmin && s.status === 'pending_pm' && !canPm) {
      html += '<div style="padding:10px;border-radius:8px;background:#fef2f2;color:#991b1b;margin-bottom:12px;font-size:13px">' +
        'Статус «Очікує PM», але право підпису не визначилось. Перевірте роль admin у профілі користувача.</div>';
    }
    if (isAdmin && s.status === 'approved') {
      html += '<div style="padding:10px;border-radius:8px;background:#ecfdf5;color:#065f46;margin-bottom:12px;font-size:13px">Вже схвалено — доступний друк.</div>';
    }

    if (s.status === 'rejected' && s.rejectReason) {
      html += '<div style="padding:10px;border-radius:8px;background:#fef2f2;color:#991b1b;margin-bottom:12px;font-size:13px">Відхилено: ' + esc(s.rejectReason) + '</div>';
    }

    html += '<div class="ff" style="margin-bottom:10px"><label>Назва</label>' +
      '<input id="cab-req-title" ' + (editable ? '' : 'readonly') + ' value="' + esc(s.title) + '" style="width:100%"></div>';
    html += '<div style="font-weight:600;margin-bottom:6px">Текст</div>';
    html += '<textarea id="cab-req-text" rows="14" style="width:100%;font:13px/1.45 inherit;padding:10px;border-radius:8px;border:1px solid #e2e8f0;resize:vertical" ' +
      (editable ? '' : 'readonly') + '>' + esc(s.text) + '</textarea>';

    // timeline
    html += '<div style="margin-top:14px;font-size:12px;color:#64748b;line-height:1.55">';
    html += '<div>1. Подання: ' + (s.submittedAt ? esc(String(s.submittedAt).slice(0, 16).replace('T', ' ')) : '—') + '</div>';
    const pids = employeeProjectIds(s);
    const projs = loadProjects().filter(p => pids.includes(p.id));
    const projHint = projs.length
      ? projs.map(p => (p.code || '') + ' / PM: ' + (p.manager || '—')).join('; ')
      : 'проект не вказано — підпис лише директора (admin)';
    html += '<div>2. PM: ' + (s.pmAt ? esc((s.pmName || '') + ' · ' + String(s.pmAt).slice(0, 16).replace('T', ' ')) : 'очікує') +
      ' <span class="tsm tmu">(' + esc(projHint) + ')</span></div>';
    html += '<div>3. Директор: ' + (s.dirAt ? esc((s.dirName || '') + ' · ' + String(s.dirAt).slice(0, 16).replace('T', ' ')) : 'очікує') + '</div>';
    html += '</div>';

    html += '<div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:8px">';
    if (editable) {
      html += '<button type="button" class="btn bp bsm" id="cab-req-save">💾 Зберегти</button>';
      html += '<button type="button" class="btn bp bsm" id="cab-req-submit">📤 Відправити на погодження</button>';
      html += '<button type="button" class="btn bd bsm" id="cab-req-del">Видалити</button>';
    } else if (isAdmin && s.status === 'draft') {
      html += '<button type="button" class="btn bp bsm" id="cab-req-submit">📤 Відправити на погодження (від імені адміна)</button>';
    }
    if (canPm) {
      html += '<button type="button" class="btn bp bsm" id="cab-req-pm-ok">✅ Схвалити (PM)</button>';
      html += '<button type="button" class="btn bd bsm" id="cab-req-pm-no">✕ Відхилити</button>';
    }
    if (canDir) {
      html += '<button type="button" class="btn bp bsm" id="cab-req-dir-ok">✅ Схвалити (директор)</button>';
      html += '<button type="button" class="btn bd bsm" id="cab-req-dir-no">✕ Відхилити</button>';
    }
    if (canPrint) {
      html += '<button type="button" class="btn bp bsm" id="cab-req-print">🖨️ Друкувати</button>';
    } else if (isOwner || canPm || canDir) {
      html += '<button type="button" class="btn bs bsm" disabled title="Друк після схвалення директором">🖨️ Друк недоступний</button>';
    }
    html += '<button type="button" class="btn bs bsm" id="cab-req-close">Закрити</button>';
    html += '</div>';

    if (!canPrint && s.status !== 'draft' && s.status !== 'rejected') {
      html += '<p class="tsm tmu" style="margin-top:10px">Друк можливий лише після схвалення project manager і директора.</p>';
    }

    openModal(s.title || 'Заявка', html);

    document.getElementById('cab-req-close')?.addEventListener('click', closeModal);
    document.getElementById('cab-req-save')?.addEventListener('click', () => saveDraft(id));
    document.getElementById('cab-req-submit')?.addEventListener('click', () => submit(id));
    document.getElementById('cab-req-del')?.addEventListener('click', () => removeDraft(id));
    document.getElementById('cab-req-pm-ok')?.addEventListener('click', () => approvePm(id));
    document.getElementById('cab-req-pm-no')?.addEventListener('click', () => reject(id, 'pm'));
    document.getElementById('cab-req-dir-ok')?.addEventListener('click', () => approveDirector(id));
    document.getElementById('cab-req-dir-no')?.addEventListener('click', () => reject(id, 'director'));
    document.getElementById('cab-req-print')?.addEventListener('click', () => printApproved(id));
  }

  function saveDraft(id) {
    const items = loadSubs();
    const i = items.findIndex(x => x.id === id);
    if (i < 0) return;
    if (items[i].status !== 'draft') return;
    items[i].title = (document.getElementById('cab-req-title')?.value || '').trim() || 'Заявка';
    items[i].text = document.getElementById('cab-req-text')?.value || '';
    items[i].updatedAt = now();
    saveSubs(items);
    alert('Збережено');
    renderCabinetCard();
    openSubmission(id);
  }

  function submit(id) {
    const items = loadSubs();
    const i = items.findIndex(x => x.id === id);
    if (i < 0) return;
    if (items[i].status !== 'draft') return;
    const u0 = getUser();
    const ownerOk = u0 && (items[i].userId === u0.id || (linkedEmployee(u0) && items[i].employeeId === linkedEmployee(u0).id));
    if (!ownerOk && roleOf(u0) !== 'admin') {
      alert('Лише автор заявки або адміністратор може відправити чернетку.');
      return;
    }
    const title = (document.getElementById('cab-req-title')?.value || items[i].title || '').trim();
    const text = document.getElementById('cab-req-text')?.value ?? items[i].text;
    if (!text.trim()) { alert('Заповніть текст заявки'); return; }
    if (!confirm('Відправити заявку на погодження project manager?')) return;
    items[i].title = title;
    items[i].text = text;
    items[i].status = 'pending_pm';
    items[i].submittedAt = now();
    items[i].updatedAt = now();
    items[i].rejectReason = '';
    items[i].projectIds = employeeProjectIds(items[i]);
    saveSubs(items);
    if (window.NexusCore && NexusCore.audit) {
      NexusCore.audit('request.submit', 'request', { id });
    }
    if (window.NexusCore && NexusCore.notify) {
      NexusCore.notify('Заявку відправлено на погодження PM', 'success');
    }
    renderCabinetCard();
    openSubmission(id);
  }

  function approvePm(id) {
    const items = loadSubs();
    const i = items.findIndex(x => x.id === id);
    if (i < 0 || items[i].status !== 'pending_pm') return;
    if (!canApprovePm(getUser(), items[i])) {
      alert('Немає права підпису: ви не є project manager проекту цього співробітника. Підписати може PM його проекту або директор (admin).');
      return;
    }
    const u = getUser();
    items[i].status = 'pending_director';
    items[i].pmBy = u.id;
    items[i].pmName = u.fullName || u.username;
    items[i].pmAt = now();
    items[i].updatedAt = now();
    saveSubs(items);
    if (window.NexusCore && NexusCore.audit) NexusCore.audit('request.pm_approve', 'request', { id });
    if (window.NexusCore && NexusCore.notify) NexusCore.notify('Заявку схвалено PM → директор', 'success');
    renderCabinetCard();
    openSubmission(id);
  }

  function approveDirector(id) {
    if (!canApproveDirector()) return;
    const items = loadSubs();
    const i = items.findIndex(x => x.id === id);
    if (i < 0 || items[i].status !== 'pending_director') return;
    const u = getUser();
    items[i].status = 'approved';
    items[i].dirBy = u.id;
    items[i].dirName = u.fullName || u.username;
    items[i].dirAt = now();
    items[i].updatedAt = now();
    saveSubs(items);
    if (window.NexusCore && NexusCore.audit) NexusCore.audit('request.dir_approve', 'request', { id });
    if (window.NexusCore && NexusCore.notify) NexusCore.notify('Заявку повністю схвалено — можна друкувати', 'success');
    renderCabinetCard();
    openSubmission(id);
  }

  function reject(id, stage) {
    const reason = prompt('Причина відхилення:');
    if (reason === null) return;
    const items = loadSubs();
    const i = items.findIndex(x => x.id === id);
    if (i < 0) return;
    const u = getUser();
    if (stage === 'pm') {
      if (items[i].status !== 'pending_pm') return;
      if (!canApprovePm(u, items[i])) { alert('Немає права відхилити цю заявку (не ваш проект).'); return; }
    }
    if (stage === 'director') {
      if (items[i].status !== 'pending_director') return;
      if (!canApproveDirector(u)) return;
    }
    items[i].status = 'rejected';
    items[i].rejectReason = reason || ('Відхилено (' + stage + ')');
    items[i].rejectedBy = u ? (u.fullName || u.username) : stage;
    items[i].updatedAt = now();
    saveSubs(items);
    if (window.NexusCore && NexusCore.audit) NexusCore.audit('request.reject', 'request', { id, stage });
    renderCabinetCard();
    openSubmission(id);
  }

  async function removeDraft(id) {
    const s = getSub(id);
    if (!s || s.status !== 'draft') return;
    if (!confirm('Видалити чернетку?')) return;
    try {
      if (window.nexusData) await nexusData.deleteHrRequest(id);
    } catch (error) {
      alert('Помилка видалення заявки з Supabase: ' + (error.message || error));
      return;
    }
    saveSubs(loadSubs().filter(x => x.id !== id));
    closeModal();
    renderCabinetCard();
  }

  function printApproved(id) {
    const s = getSub(id);
    if (!s || s.status !== 'approved') {
      alert('Друк дозволено лише після схвалення project manager і директора.');
      return;
    }
    const w = window.open('', '_blank');
    if (!w) { alert('Дозвольте спливаючі вікна'); return; }
    const stamp = 'Схвалено: PM — ' + esc(s.pmName || '') + ' (' + esc(String(s.pmAt || '').slice(0, 16)) + '); ' +
      'Директор — ' + esc(s.dirName || '') + ' (' + esc(String(s.dirAt || '').slice(0, 16)) + ')';
    w.document.write(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(s.title) + '</title>' +
      '<style>body{font-family:"Times New Roman",serif;font-size:13pt;line-height:1.45;max-width:720px;margin:24px auto}' +
      'pre{white-space:pre-wrap;font-family:inherit;margin:0}' +
      '.stamp{margin-top:24px;font-size:11pt;color:#333;border-top:1px solid #999;padding-top:10px}</style></head><body>' +
      '<pre>' + esc(s.text) + '</pre>' +
      '<div class="stamp">' + stamp + '</div>' +
      '<script>onload=function(){print()}<\/script></body></html>'
    );
    w.document.close();
  }

  function openInbox() {
    const user = getUser();
    if (!user) return;
    let rows = [];
    if (canApprovePm(user)) {
      inboxPm().forEach(s => rows.push({ s, stage: 'PM' }));
    }
    if (canApproveDirector(user)) {
      inboxDirector().forEach(s => rows.push({ s, stage: 'Директор' }));
    }
    // unique by id prefer showing
    const seen = new Set();
    rows = rows.filter(r => {
      if (seen.has(r.s.id)) return false;
      seen.add(r.s.id);
      return true;
    });
    if (!rows.length) {
      openModal('На погодження', '<div class="cabinet-empty">Немає заявок, що очікують вашого рішення.</div>');
      return;
    }
    openModal('На погодження',
      '<div style="display:flex;flex-direction:column;gap:8px">' +
      rows.map(r =>
        '<button type="button" class="btn bs" style="text-align:left;justify-content:flex-start" data-open="' + esc(r.s.id) + '">' +
        '<span style="font-weight:650">' + esc(r.s.title) + '</span><br>' +
        '<span class="tsm tmu">' + esc(r.s.employeeName || r.s.userName || '') + ' · етап: ' + esc(r.stage) + '</span></button>'
      ).join('') + '</div>'
    );
    document.querySelectorAll('[data-open]').forEach(b => {
      b.addEventListener('click', () => openSubmission(b.getAttribute('data-open')));
    });
  }

  function bind() {
    document.getElementById('cab-req-new')?.addEventListener('click', openNew);
    document.getElementById('cab-req-open-all')?.addEventListener('click', () => {
      location.href = 'requests.html';
    });
    document.getElementById('cab-req-inbox')?.addEventListener('click', () => { location.href = 'requests.html'; });
  }

  function render() {
    renderCabinetCard();
  }

  async function syncFromSupabase() {
    if (!window.nexusData) return;
    const cloud = await nexusData.listHrRequests();
    const localTemplates = templates();
    const templateMap = new Map(localTemplates.map(template => [template.id, template]));
    if (!cloud.templates.length && localTemplates.length) {
      for (const template of localTemplates) await nexusData.upsertHrRequestTemplate(template);
    } else {
      cloud.templates.forEach(template => templateMap.set(template.id, template));
      if (cloud.templates.length) write(TPL_KEY, { templates: Array.from(templateMap.values()) });
    }

    const localSubs = loadSubs();
    if (!cloud.requests.length && localSubs.length) {
      for (const submission of localSubs) await nexusData.upsertHrRequest(submission);
    } else if (cloud.requests.length) {
      const requestMap = new Map(localSubs.map(submission => [submission.id, submission]));
      cloud.requests.forEach(submission => requestMap.set(submission.id, submission));
      write(SUB_KEY, { items: Array.from(requestMap.values()) });
    }
  }

  async function init() {
    bind();
    try {
      await syncFromSupabase();
    } catch (error) {
      alert('Помилка завантаження заявок із Supabase: ' + (error.message || error));
    }
    render();
    // hook after portal cabinet
    const prev = window.Portal && Portal.renderCabinet;
    if (window.Portal && !Portal.__cabReqHooked) {
      Portal.__cabReqHooked = true;
      const orig = Portal.renderCabinet.bind(Portal);
      // can't easily replace exported freeze - just poll / listen
    }
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) render();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { init(); setTimeout(render, 200); });
  } else {
    init();
    setTimeout(render, 200);
  }

  // re-render when portal refreshes cabinet (MutationObserver light)
  setInterval(() => {
    const el = document.getElementById('cab-requests-body');
    if (el && el.innerHTML.indexOf('Завантаження') >= 0) render();
  }, 1500);


  /**
   * API для NEXUS AI / зовнішніх скриптів.
   * opts: { dateFrom, dateTo, title?, text?, submit?, silent? }
   * dateFrom/dateTo: YYYY-MM-DD або DD.MM.YYYY
   * submit: true → одразу на погодження PM (pending_pm)
   * Повне схвалення PM+директор можливе лише з їхніх облікових записів (або admin може форсувати forceApprove).
   */
  function createVacationRequest(opts) {
    opts = opts || {};
    const user = getUser();
    if (!user) {
      return { ok: false, error: 'Користувач не увійшов у систему. Відкрийте index.html і увійдіть.' };
    }
    const p = personFromUser();
    function normDate(d) {
      d = String(d || '').trim();
      let m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) return m[1] + '-' + m[2] + '-' + m[3];
      m = d.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
      if (m) {
        const dd = String(m[1]).padStart(2, '0');
        const mm = String(m[2]).padStart(2, '0');
        return m[3] + '-' + mm + '-' + dd;
      }
      return d;
    }
    const dateFrom = normDate(opts.dateFrom);
    const dateTo = normDate(opts.dateTo);
    if (!dateFrom || !dateTo) {
      return { ok: false, error: 'Вкажіть дати: dateFrom і dateTo (наприклад 01.12.2026 і 10.12.2026).' };
    }
    const title = (opts.title || ('Заява на відпустку ' + dateFrom + ' — ' + dateTo)).trim();
    let text = opts.text;
    if (!text) {
      text =
        'Я, ' + (p.fullName || user.fullName || user.username) +
        (p.position ? ', ' + p.position : '') +
        ', прошу надати мені щорічну відпустку з ' + dateFrom + ' по ' + dateTo + ' включно.\\n\\n' +
        'Прізвище: ' + (p.lastName || '') + '\\n' +
        "Ім'я: " + (p.firstName || '') + '\\n' +
        'По батькові: ' + (p.middleName || '') + '\\n\\n' +
        'Прошу погодити заявку project manager та директором.';
    }
    text = applyPlaceholders(text, p);

    const items = loadSubs();
    const sub = {
      id: uid(),
      templateId: null,
      title: title,
      text: text,
      status: 'draft',
      userId: user.id,
      userName: user.fullName || user.username,
      employeeId: p.employeeId,
      employeeName: p.fullName || user.fullName || user.username,
      createdAt: now(),
      updatedAt: now(),
      submittedAt: null,
      pmBy: null, pmAt: null, pmName: null,
      dirBy: null, dirAt: null, dirName: null,
      rejectReason: '',
      rejectedBy: null,
      projectIds: [],
      dateFrom: dateFrom,
      dateTo: dateTo,
      source: 'nexus_ai_v02'
    };
    sub.projectIds = employeeProjectIds(sub);
    items.push(sub);
    saveSubs(items);
    if (window.NexusCore && NexusCore.audit) {
      NexusCore.audit('request.create', 'request', { id: sub.id, title: sub.title, source: 'ai' });
    }

    let submitted = false;
    let forceNote = '';
    if (opts.submit) {
      const i = items.findIndex(x => x.id === sub.id);
      if (i >= 0) {
        items[i].status = 'pending_pm';
        items[i].submittedAt = now();
        items[i].updatedAt = now();
        items[i].projectIds = employeeProjectIds(items[i]);
        saveSubs(items);
        submitted = true;
        if (window.NexusCore && NexusCore.audit) {
          NexusCore.audit('request.submit', 'request', { id: sub.id, source: 'ai' });
        }
        if (window.NexusCore && NexusCore.notify) {
          NexusCore.notify('Заявку відправлено на погодження PM', 'success');
        }
      }
    }

    // forceApprove: only admin — optional skip of full chain for demo (not default)
    if (opts.forceApprove && roleOf(user) === 'admin') {
      const i = items.findIndex(x => x.id === sub.id);
      if (i >= 0) {
        items[i].status = 'approved';
        items[i].submittedAt = items[i].submittedAt || now();
        items[i].pmAt = now();
        items[i].pmName = user.fullName || user.username;
        items[i].pmBy = user.id;
        items[i].dirAt = now();
        items[i].dirName = user.fullName || user.username;
        items[i].dirBy = user.id;
        items[i].updatedAt = now();
        saveSubs(items);
        forceNote = ' Адмін форсував повне схвалення (PM+директор).';
        if (window.NexusCore && NexusCore.notify) {
          NexusCore.notify('Заявку повністю схвалено (AI / admin)', 'success');
        }
      }
    }

    try { renderCabinetCard(); } catch (e) {}
    try { if (typeof render === 'function') render(); } catch (e) {}

    return {
      ok: true,
      id: sub.id,
      title: sub.title,
      status: (loadSubs().find(x => x.id === sub.id) || sub).status,
      dateFrom: dateFrom,
      dateTo: dateTo,
      employeeName: sub.employeeName,
      submitted: submitted,
      message:
        'Створено заявку «' + sub.title + '» для ' + sub.employeeName +
        ' (' + dateFrom + ' — ' + dateTo + '). Статус: ' +
        (loadSubs().find(x => x.id === sub.id) || sub).status +
        (submitted ? ' Відправлено на погодження project manager (далі — директор).' : ' Чернетка — можна відправити на погодження вручну.') +
        forceNote
    };
  }

  return { render, closeModal, openNew, openSubmission, openInbox, printApproved, createVacationRequest };

})();

window.CabRequests = CabRequests;
