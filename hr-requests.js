/* NEXUS HR — Заявки (текст, як трудовий договір)
 * Шаблони в localStorage. ПІБ з картки співробітника поточного користувача.
 */
const HrRequests = (() => {
  'use strict';

  const KEY = 'nexus_hr_requests_v1';
  const HR_KEY = 'nexus_hr_ua_v2';
  const USERS_KEY = 'nexus_users_v1';
  const SESSION_KEY = 'nexus_session_v1';
  const MAX_BYTES = 2.5 * 1024 * 1024;

  let currentId = null;

  function loadStore() {
    try {
      if (window.NexusCore && NexusCore.read) {
        const d = NexusCore.read(KEY, { templates: [] });
        if (d && Array.isArray(d.templates)) return migrate(d);
      }
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && Array.isArray(p.templates)) return migrate(p);
      }
    } catch (e) {}
    return { templates: [] };
  }

  function migrate(store) {
    store.templates = (store.templates || []).map(t => {
      if (typeof t.fullText !== 'string') t.fullText = t.fullText || '';
      if (!t.name) t.name = (t.fileName || 'Заявка').replace(/\.docx$/i, '');
      return t;
    });
    return store;
  }

  function saveStore(store) {
    try {
      if (window.NexusCore && NexusCore.write) {
        const saved = NexusCore.write(KEY, store);
        syncTemplatesToSupabase(store);
        return saved;
      }
      localStorage.setItem(KEY, JSON.stringify(store));
      syncTemplatesToSupabase(store);
      return true;
    } catch (e) {
      alert('Не вдалося зберегти (можливо, закінчилося місце в браузері).');
      return false;
    }
  }

  function syncTemplatesToSupabase(store) {
    if (!window.nexusData) return;
    (store.templates || []).forEach(template => {
      nexusData.upsertHrRequestTemplate(template).catch(error =>
        alert('Помилка збереження шаблону заявки в Supabase: ' + (error.message || error))
      );
    });
  }

  function uid() {
    if (window.NexusCore && NexusCore.id) return NexusCore.id('req');
    return 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function getCurrentUser() {
    if (window.NexusCore && NexusCore.getCurrentUser) return NexusCore.getCurrentUser();
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const sess = JSON.parse(raw);
      if (!sess || !sess.userId) return null;
      if (sess.expiresAt && sess.expiresAt < Date.now()) return null;
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      return users.find(u => u.id === sess.userId) || null;
    } catch (e) {
      return null;
    }
  }

  function getEmployees() {
    try {
      const db = JSON.parse(localStorage.getItem(HR_KEY) || '{}');
      return Array.isArray(db.employees) ? db.employees : [];
    } catch (e) {
      return [];
    }
  }

  function getLinkedEmployee() {
    const user = getCurrentUser();
    if (!user) return null;
    const emps = getEmployees();
    if (user.employeeId) {
      const byId = emps.find(e => e.id === user.employeeId);
      if (byId) return byId;
    }
    const name = (user.fullName || '').trim().toLowerCase();
    if (name) {
      const byName = emps.find(e => (e.fullName || '').trim().toLowerCase() === name);
      if (byName) return byName;
    }
    return null;
  }

  function splitFullName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    return {
      lastName: parts[0] || '',
      firstName: parts[1] || '',
      middleName: parts.slice(2).join(' ') || '',
      fullName: String(fullName || '').trim()
    };
  }

  function personData() {
    const emp = getLinkedEmployee();
    const user = getCurrentUser();
    if (emp) {
      return { ...splitFullName(emp.fullName), position: emp.position || '', source: 'employee' };
    }
    if (user) {
      return { ...splitFullName(user.fullName || user.username || ''), position: '', source: 'user' };
    }
    return { lastName: '', firstName: '', middleName: '', fullName: '', position: '', source: 'none' };
  }

  function canEdit() {
    const u = getCurrentUser();
    if (!u) return false;
    if (window.NexusCore && typeof NexusCore.canEdit === 'function') return NexusCore.canEdit('hr');
    return u.role !== 'viewer';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function applyPlaceholders(text, p) {
    let out = String(text || '');
    const pairs = [
      ['{{ПІБ}}', p.fullName],
      ['{{Прізвище}}', p.lastName],
      ["{{Ім'я}}", p.firstName],
      ['{{Імя}}', p.firstName],
      ['{{ПоБатькові}}', p.middleName],
      ['{{Посада}}', p.position || ''],
      ['{{fullName}}', p.fullName],
      ['{{lastName}}', p.lastName],
      ['{{firstName}}', p.firstName],
      ['{{middleName}}', p.middleName],
      ['{{FULL_NAME}}', p.fullName],
      ['{{LAST_NAME}}', p.lastName],
      ['{{FIRST_NAME}}', p.firstName],
      ['{{MIDDLE_NAME}}', p.middleName],
      ['{{position}}', p.position || '']
    ];
    pairs.forEach(([a, b]) => { out = out.split(a).join(b || ''); });
    return out;
  }

  function renderUserBar() {
    const el = document.getElementById('req-user-bar');
    if (!el) return;
    const p = personData();
    if (p.source === 'none') {
      el.innerHTML = '<strong style="color:#b45309">Не авторизовано.</strong>';
      return;
    }
    const hint = p.source === 'employee'
      ? 'Дані з картки співробітника (як у трудовому договорі).'
      : 'Привʼяжіть користувача до співробітника — тоді ПІБ братиметься з картки.';
    el.innerHTML =
      '<div><strong>Підстановка для:</strong> ' + esc(p.fullName || '—') + '</div>' +
      '<div style="margin-top:4px;color:var(--text-muted,#64748b)">' +
      'Прізвище: <b>' + esc(p.lastName || '—') + '</b> · Імʼя: <b>' + esc(p.firstName || '—') + '</b> · По батькові: <b>' + esc(p.middleName || '—') + '</b>' +
      (p.position ? ' · Посада: <b>' + esc(p.position) + '</b>' : '') +
      '</div><div class="tsm tmu" style="margin-top:6px">' + esc(hint) + '</div>';
  }

  function renderList() {
    const store = loadStore();
    const list = store.templates.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'uk'));
    const count = document.getElementById('req-count');
    if (count) count.textContent = list.length;
    const el = document.getElementById('req-list');
    if (!el) return;
    if (!list.length) {
      el.innerHTML = '<div class="nx-empty" style="padding:16px"><strong>Список порожній</strong>Створіть заявку або імпортуйте файл.</div>';
      return;
    }
    el.innerHTML = list.map(t => {
      const active = t.id === currentId ? ' active' : '';
      const meta = (t.fullText || '').trim()
        ? ((t.fullText.trim().length) + ' символів')
        : (t.contentBase64 ? 'файл DOCX — додайте текст у редакторі' : 'немає тексту');
      return '<button type="button" class="req-list-item' + active + '" data-id="' + esc(t.id) + '">' +
        '<div class="req-list-item__name">' + esc(t.name || 'Без назви') + '</div>' +
        '<div class="req-list-item__meta">' + esc(meta) + '</div></button>';
    }).join('');
    el.querySelectorAll('.req-list-item').forEach(btn => {
      btn.addEventListener('click', () => openTemplate(btn.getAttribute('data-id')));
    });
  }

  function setEditorVisible(on) {
    const empty = document.getElementById('req-editor-empty');
    const ed = document.getElementById('req-editor');
    if (empty) empty.style.display = on ? 'none' : '';
    if (ed) ed.style.display = on ? '' : 'none';
  }

  function openTemplate(id) {
    const t = loadStore().templates.find(x => x.id === id);
    if (!t) return;
    currentId = id;
    setEditorVisible(true);
    const title = document.getElementById('req-title');
    const ta = document.getElementById('req-fulltext');
    if (title) {
      title.value = t.name || '';
      title.readOnly = !canEdit();
    }
    if (ta) {
      ta.value = t.fullText || '';
      ta.readOnly = !canEdit();
    }
    const saveBtn = document.getElementById('req-save-btn');
    const delBtn = document.getElementById('req-del-btn');
    if (saveBtn) saveBtn.style.display = canEdit() ? '' : 'none';
    if (delBtn) delBtn.style.display = canEdit() ? '' : 'none';
    renderList();
  }

  function defaultSampleText() {
    return [
      'Директору',
      '',
      'Заява',
      '',
      'Я, {{ПІБ}}, прошу …',
      '',
      'Прізвище: {{Прізвище}}',
      "Ім'я: {{Ім'я}}",
      'По батькові: {{ПоБатькові}}',
      '',
      'Дата: _______________',
      'Підпис: _______________'
    ].join('\n');
  }

  function newTemplate() {
    if (!canEdit()) { alert('Недостатньо прав'); return; }
    const store = loadStore();
    const t = {
      id: uid(),
      name: 'Нова заявка',
      fullText: defaultSampleText(),
      uploadedAt: new Date().toISOString()
    };
    store.templates.push(t);
    if (!saveStore(store)) return;
    openTemplate(t.id);
    render();
  }

  function saveCurrent() {
    if (!canEdit() || !currentId) return;
    const store = loadStore();
    const i = store.templates.findIndex(x => x.id === currentId);
    if (i < 0) return;
    const title = (document.getElementById('req-title')?.value || '').trim() || 'Без назви';
    const fullText = document.getElementById('req-fulltext')?.value || '';
    store.templates[i].name = title;
    store.templates[i].fullText = fullText;
    store.templates[i].updatedAt = new Date().toISOString();
    if (!saveStore(store)) return;
    if (window.NexusCore && NexusCore.audit) {
      NexusCore.audit('hr.requests.save', 'requests', { id: currentId, len: fullText.length });
    }
    renderList();
    alert('Текст заявки збережено');
  }

  function fillPersonIntoEditor() {
    const ta = document.getElementById('req-fulltext');
    if (!ta) return;
    const p = personData();
    if (!p.fullName) {
      alert('Немає ПІБ. Увійдіть і привʼяжіть користувача до співробітника.');
      return;
    }
    if (/\{\{/.test(ta.value)) {
      ta.value = applyPlaceholders(ta.value, p);
      return;
    }
    let v = applyPlaceholders(ta.value, p);
    const before = ta.value;
    if (v === before && !v.includes(p.fullName)) {
      v = v.replace(/\bПІБ\b\s*:?\s*/i, 'ПІБ: ' + p.fullName + '\n')
        .replace(/Прізвище\s*:?\s*/i, 'Прізвище: ' + p.lastName + '\n')
        .replace(/Ім['ʼ']?я\s*:?\s*/i, "Ім'я: " + p.firstName + '\n')
        .replace(/По батькові\s*:?\s*/i, 'По батькові: ' + p.middleName + '\n');
      if (v === before) {
        v = v.trimEnd() + '\n\n---\nПІБ: ' + p.fullName +
          '\nПрізвище: ' + p.lastName +
          "\nІм'я: " + p.firstName +
          '\nПо батькові: ' + p.middleName + '\n';
      }
    }
    ta.value = v;
  }

  function printCurrent() {
    const title = (document.getElementById('req-title')?.value || 'Заявка').trim();
    let text = document.getElementById('req-fulltext')?.value || '';
    const p = personData();
    if (p.fullName && /\{\{/.test(text)) text = applyPlaceholders(text, p);
    const w = window.open('', '_blank');
    if (!w) { alert('Дозвольте спливаючі вікна для друку'); return; }
    w.document.write(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
      '<style>body{font-family:"Times New Roman",serif;font-size:14pt;line-height:1.5;max-width:700px;margin:24px auto;white-space:pre-wrap}</style></head><body>' +
      '<pre style="font-family:inherit;white-space:pre-wrap;margin:0">' + esc(text) + '</pre>' +
      '<script>window.onload=function(){window.print()}<\/script></body></html>'
    );
    w.document.close();
  }

  function downloadTxt() {
    const title = (document.getElementById('req-title')?.value || 'zayavka').trim();
    let text = document.getElementById('req-fulltext')?.value || '';
    const p = personData();
    if (p.fullName && /\{\{/.test(text)) text = applyPlaceholders(text, p);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = title.replace(/[^\wа-яА-ЯіІїЇєЄґҐ\- ]+/g, '_').trim() + '.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function deleteCurrent() {
    if (!canEdit() || !currentId) return;
    if (!confirm('Видалити цю заявку?')) return;
    const store = loadStore();
    try {
      if (window.nexusData) await nexusData.deleteHrRequestTemplate(currentId);
    } catch (error) {
      alert('Помилка видалення шаблону з Supabase: ' + (error.message || error));
      return;
    }
    store.templates = store.templates.filter(t => t.id !== currentId);
    saveStore(store);
    currentId = null;
    setEditorVisible(false);
    render();
  }

  function stripXml(xml) {
    return String(xml || '')
      .replace(/<w:tab[^/]*\/>/g, '\t')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function extractDocxText(uint8) {
    if (typeof PizZip === 'undefined') throw new Error('PizZip не завантажено');
    const zip = new PizZip(uint8);
    const f = zip.file('word/document.xml');
    if (!f) throw new Error('Немає document.xml');
    return stripXml(f.asText());
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = String(r.result || '');
        const i = s.indexOf(',');
        resolve(i >= 0 ? s.slice(i + 1) : s);
      };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function base64ToUint8(b64) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  async function onFilesSelected(ev) {
    if (!canEdit()) {
      alert('Недостатньо прав');
      ev.target.value = '';
      return;
    }
    const files = Array.from(ev.target.files || []);
    if (!files.length) return;
    const store = loadStore();
    let added = 0;
    for (const f of files) {
      const lower = (f.name || '').toLowerCase();
      if (f.size > MAX_BYTES) {
        alert('«' + f.name + '» занадто великий');
        continue;
      }
      try {
        let fullText = '';
        let contentBase64 = '';
        if (lower.endsWith('.txt')) {
          fullText = await f.text();
        } else if (lower.endsWith('.docx')) {
          const b64 = await fileToBase64(f);
          contentBase64 = b64;
          try {
            fullText = extractDocxText(base64ToUint8(b64));
          } catch (e) {
            console.warn(e);
            fullText = '';
            alert('«' + f.name + '»: текст не витягнуто. Вставте текст вручну в редактор.');
          }
        } else {
          alert('Потрібні .docx або .txt: ' + f.name);
          continue;
        }
        store.templates.push({
          id: uid(),
          name: f.name.replace(/\.(docx|txt)$/i, ''),
          fileName: f.name,
          fullText,
          contentBase64: contentBase64 || undefined,
          size: f.size,
          uploadedAt: new Date().toISOString()
        });
        added++;
      } catch (e) {
        alert('Помилка: ' + f.name);
      }
    }
    if (added) {
      saveStore(store);
      render();
      const last = store.templates[store.templates.length - 1];
      if (last) openTemplate(last.id);
      alert('Додано: ' + added);
    }
    ev.target.value = '';
  }


  const SUB_KEY = 'nexus_hr_request_submissions_v1';
  let regFilter = 'all';

  function loadSubs() {
    try {
      const s = readStoreRaw(SUB_KEY) || { items: [] };
      return Array.isArray(s.items) ? s.items : [];
    } catch (e) { return []; }
  }

  function readStoreRaw(key) {
    try {
      if (window.NexusCore && NexusCore.read) return NexusCore.read(key, null);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function statusHtml(st) {
    const map = {
      draft: ['Чернетка', 'cab-req-status--draft'],
      pending_pm: ['Очікує PM', 'cab-req-status--pm'],
      pending_director: ['Очікує директора', 'cab-req-status--dir'],
      approved: ['Схвалено', 'cab-req-status--ok'],
      rejected: ['Відхилено', 'cab-req-status--no']
    };
    const m = map[st] || map.draft;
    return '<span class="cab-req-status ' + m[1] + '">' + esc(m[0]) + '</span>';
  }

  function filteredSubs() {
    const all = loadSubs();
    if (regFilter === 'pending') return all.filter(x => x.status === 'pending_pm' || x.status === 'pending_director');
    if (regFilter === 'approved') return all.filter(x => x.status === 'approved');
    if (regFilter === 'rejected') return all.filter(x => x.status === 'rejected');
    if (regFilter === 'draft') return all.filter(x => x.status === 'draft');
    return all;
  }

  function updateRegCounts() {
    const all = loadSubs();
    const set = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };
    set('hr-c-all', all.length);
    set('hr-c-pending', all.filter(x => x.status === 'pending_pm' || x.status === 'pending_director').length);
    set('hr-c-ok', all.filter(x => x.status === 'approved').length);
    set('hr-c-no', all.filter(x => x.status === 'rejected').length);
    set('hr-c-draft', all.filter(x => x.status === 'draft').length);
  }

  function renderRegistry() {
    updateRegCounts();
    const host = document.getElementById('req-registry-host');
    if (!host) return;
    const list = filteredSubs().slice().sort((a, b) =>
      String(b.updatedAt || b.submittedAt || b.createdAt || '')
        .localeCompare(String(a.updatedAt || a.submittedAt || a.createdAt || ''))
    );
    if (!list.length) {
      host.innerHTML = '<div class="nx-empty"><strong>Реєстр порожній</strong>Коли співробітник відправить заявку з кабінету — вона з\'явиться тут.</div>';
      return;
    }
    host.innerHTML =
      '<div style="overflow:auto"><table class="dt" style="width:100%;font-size:13px"><thead><tr>' +
      '<th>Назва</th><th>Співробітник</th><th>Статус</th><th>Оновлено</th><th></th></tr></thead><tbody>' +
      list.map(s => {
        const dt = String(s.updatedAt || s.submittedAt || s.createdAt || '').slice(0, 16).replace('T', ' ');
        const canPrint = s.status === 'approved';
        return '<tr>' +
          '<td><b>' + esc(s.title || 'Заявка') + '</b></td>' +
          '<td>' + esc(s.employeeName || s.userName || '—') + '</td>' +
          '<td>' + statusHtml(s.status) + '</td>' +
          '<td>' + esc(dt || '—') + '</td>' +
          '<td style="white-space:nowrap">' +
          '<button type="button" class="btn bs bxs" data-hr-open="' + esc(s.id) + '">Відкрити</button> ' +
          (canPrint
            ? '<button type="button" class="btn bp bxs" data-hr-print="' + esc(s.id) + '">🖨️</button>'
            : '<button type="button" class="btn bs bxs" disabled title="Лише після схвалення">🖨️</button>') +
          '</td></tr>';
      }).join('') +
      '</tbody></table></div>';

    host.querySelectorAll('[data-hr-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-hr-open');
        if (window.CabRequests && CabRequests.openSubmission) CabRequests.openSubmission(id);
        else alert('Модуль перегляду не завантажено');
      });
    });
    host.querySelectorAll('[data-hr-print]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-hr-print');
        if (window.CabRequests && CabRequests.printApproved) CabRequests.printApproved(id);
        else if (window.CabRequests) CabRequests.openSubmission(id);
      });
    });
  }

  function bindRegistryUi() {
    document.querySelectorAll('.req-subtab').forEach(btn => {
      if (btn.__hrSub) return;
      btn.__hrSub = true;
      btn.addEventListener('click', () => {
        const sub = btn.getAttribute('data-req-sub');
        document.querySelectorAll('.req-subtab').forEach(b => b.classList.toggle('active', b === btn));
        const reg = document.getElementById('req-panel-registry');
        const tpl = document.getElementById('req-panel-templates');
        if (reg) reg.style.display = sub === 'registry' ? '' : 'none';
        if (tpl) tpl.style.display = sub === 'templates' ? '' : 'none';
        if (sub === 'registry') renderRegistry();
        if (sub === 'templates') render();
      });
    });
    document.querySelectorAll('[data-reg-filter]').forEach(btn => {
      if (btn.__hrReg) return;
      btn.__hrReg = true;
      btn.addEventListener('click', () => {
        regFilter = btn.getAttribute('data-reg-filter') || 'all';
        document.querySelectorAll('[data-reg-filter]').forEach(b => b.classList.toggle('active', b === btn));
        renderRegistry();
      });
    });
    const ref = document.getElementById('req-reg-refresh');
    if (ref && !ref.__hrReg) {
      ref.__hrReg = true;
      ref.addEventListener('click', renderRegistry);
    }
  }


  function render() {
    bindRegistryUi();
    renderRegistry();
    renderUserBar();
    renderList();
    const up = document.getElementById('req-upload-btn');
    const neu = document.getElementById('req-new-btn');
    if (up) up.style.display = canEdit() ? '' : 'none';
    if (neu) neu.style.display = canEdit() ? '' : 'none';
    if (currentId) openTemplate(currentId);
  }

  function bind() {
    const map = [
      ['req-file', 'change', onFilesSelected],
      ['req-new-btn', 'click', newTemplate],
      ['req-save-btn', 'click', saveCurrent],
      ['req-fill-btn', 'click', fillPersonIntoEditor],
      ['req-print-btn', 'click', printCurrent],
      ['req-download-btn', 'click', downloadTxt],
      ['req-del-btn', 'click', deleteCurrent]
    ];
    map.forEach(([id, ev, fn]) => {
      const el = document.getElementById(id);
      if (el && !el.__hrReq) {
        el.__hrReq = true;
        el.addEventListener(ev, fn);
      }
    });
    document.querySelectorAll('.nb[data-tab="requests"]').forEach(b => {
      if (!b.__hrReqTab) {
        b.__hrReqTab = true;
        b.addEventListener('click', () => setTimeout(render, 0));
      }
    });
  }

  async function syncFromSupabase() {
    if (!window.nexusData) return;
    const cloud = await nexusData.listHrRequests();
    const localStore = loadStore();
    if (!cloud.templates.length && localStore.templates.length) {
      for (const template of localStore.templates) await nexusData.upsertHrRequestTemplate(template);
    } else {
      const templates = new Map(localStore.templates.map(template => [template.id, template]));
      cloud.templates.forEach(template => templates.set(template.id, template));
      saveStore({ templates: Array.from(templates.values()) });
    }

    const localRequests = loadSubs();
    if (!cloud.requests.length && localRequests.length) {
      for (const request of localRequests) await nexusData.upsertHrRequest(request);
    } else if (cloud.requests.length) {
      const requests = new Map(localRequests.map(request => [request.id, request]));
      cloud.requests.forEach(request => requests.set(request.id, request));
      const value = { items: Array.from(requests.values()) };
      if (window.NexusCore && NexusCore.write) NexusCore.write('nexus_hr_request_submissions_v1', value);
      else localStorage.setItem('nexus_hr_request_submissions_v1', JSON.stringify(value));
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
    if (location.hash === '#requests') setTimeout(render, 80);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { render, init, personData, openTemplate };
})();

window.HrRequests = HrRequests;
