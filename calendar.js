/* NEXUS — Unified personal calendar */
(() => {
  'use strict';

  const EV_KEY = 'nexus_calendar_v1';
  const MONTHS = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
  const WD = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];

  let viewY, viewM, selectedDate = null, editingId = null;

  function read(key, fb) {
    try {
      const r = localStorage.getItem(key);
      return r == null ? fb : JSON.parse(r);
    } catch (e) { return fb; }
  }
  function write(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function uid() { return 'ev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function iso(d) {
    const x = d instanceof Date ? d : new Date(d);
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const day = String(x.getDate()).padStart(2, '0');
    return x.getFullYear() + '-' + m + '-' + day;
  }
  function fmt(d) {
    if (!d) return '—';
    const p = String(d).slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : d;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function currentUser() {
    if (window.NexusCore) return NexusCore.getCurrentUser();
    try {
      const s = read('nexus_session_v1', null);
      if (!s || !s.userId || (s.expiresAt && s.expiresAt < Date.now())) return null;
      return (read('nexus_users_v1', []) || []).find(u => u.id === s.userId) || null;
    } catch (e) { return null; }
  }

  function linkedEmployee(user) {
    if (!user) return null;
    const hr = read('nexus_hr_ua_v2', {});
    const emps = Array.isArray(hr.employees) ? hr.employees : [];
    if (user.employeeId) {
      const byId = emps.find(e => e && e.id === user.employeeId);
      if (byId) return byId;
    }
    const n = String(user.fullName || user.username || '').toLowerCase().trim();
    if (!n) return null;
    return emps.find(e => {
      const en = String(e.fullName || '').toLowerCase().trim();
      return en && (en === n || en.includes(n) || n.includes(en));
    }) || null;
  }

  function loadCustomEvents() {
    const db = read(EV_KEY, { events: [] });
    return Array.isArray(db.events) ? db.events : [];
  }
  function saveCustomEvents(list) {
    write(EV_KEY, { events: list, updatedAt: new Date().toISOString() });
  }

  /** Aggregate all personal events for the current user */
  function collectEvents(user) {
    const emp = linkedEmployee(user);
    const empId = emp ? emp.id : null;
    const out = [];

    // Custom
    loadCustomEvents().filter(e => !e.userId || e.userId === (user && user.id)).forEach(e => {
      out.push({
        id: e.id, type: 'custom', title: e.title, start: e.start, end: e.end || e.start,
        note: e.note || '', source: 'Моя подія', remind: e.remind
      });
    });

    // Tasks deadlines
    const tasksDb = read('nexus_tasks_v1', { tasks: [] });
    const tasks = Array.isArray(tasksDb.tasks) ? tasksDb.tasks : (Array.isArray(tasksDb) ? tasksDb : []);
    tasks.filter(t => t && empId && t.employeeId === empId && (t.deadline || t.due)).forEach(t => {
      const d = String(t.deadline || t.due).slice(0, 10);
      out.push({
        id: 'task_' + t.id, type: 'task', title: t.title || t.name || 'Задача',
        start: d, end: d, note: t.status || '', source: 'Задачі'
      });
    });

    // Leaves & sick from employee
    if (emp) {
      (Array.isArray(emp.leaves) ? emp.leaves : []).forEach((l, i) => {
        const s = String(l.from || l.start || '').slice(0, 10);
        if (!s) return;
        out.push({
          id: 'leave_' + emp.id + '_' + i, type: 'leave',
          title: l.type || 'Відпустка', start: s, end: String(l.to || l.end || s).slice(0, 10),
          note: (l.days ? l.days + ' дн.' : ''), source: 'HR · Відпустка'
        });
      });
      const sick = Array.isArray(emp.sick) ? emp.sick : (Array.isArray(emp.sickLeaves) ? emp.sickLeaves : []);
      sick.forEach((l, i) => {
        const s = String(l.from || l.start || '').slice(0, 10);
        if (!s) return;
        out.push({
          id: 'sick_' + emp.id + '_' + i, type: 'sick',
          title: l.type || 'Лікарняний', start: s, end: String(l.to || l.end || s).slice(0, 10),
          note: '', source: 'HR · Лікарняний'
        });
      });
    }

    // Fleet service on my vehicles
    const fleet = read('nexus_fleet_v1', { vehicles: [], service: [] });
    const myVehIds = new Set((fleet.vehicles || []).filter(v => empId && v.employeeId === empId).map(v => v.id));
    (fleet.service || []).filter(s => s && myVehIds.has(s.vehicleId) && s.date).forEach(s => {
      const d = String(s.date).slice(0, 10);
      out.push({
        id: 'svc_' + s.id, type: 'service',
        title: s.title || s.work || 'Сервіс авто', start: d, end: d,
        note: s.cost != null ? (Number(s.cost).toLocaleString('uk-UA') + ' ₴') : '',
        source: 'Автопарк'
      });
    });

    return out;
  }

  function eventsOnDate(events, dateStr) {
    return events.filter(e => {
      const a = String(e.start || '').slice(0, 10);
      const b = String(e.end || e.start || '').slice(0, 10);
      return a && dateStr >= a && dateStr <= b;
    });
  }

  function renderGrid(events) {
    const grid = document.getElementById('cal-grid');
    const title = document.getElementById('cal-title');
    if (!grid) return;
    if (title) title.textContent = MONTHS[viewM] + ' ' + viewY;

    const first = new Date(viewY, viewM, 1);
    const startDow = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
    const today = iso(new Date());

    let h = '<div class="cal-wd">';
    WD.forEach(w => { h += '<div class="cal-wd-cell">' + w + '</div>'; });
    h += '</div><div class="cal-days">';

    for (let i = 0; i < startDow; i++) h += '<div class="cal-cell cal-cell--empty"></div>';

    for (let d = 1; d <= daysInMonth; d++) {
      const ds = iso(new Date(viewY, viewM, d));
      const dayEv = eventsOnDate(events, ds);
      const isToday = ds === today;
      const isSel = ds === selectedDate;
      const classes = ['cal-cell'];
      if (isToday) classes.push('cal-cell--today');
      if (isSel) classes.push('cal-cell--selected');
      if (dayEv.length) classes.push('cal-cell--has');

      h += '<button type="button" class="' + classes.join(' ') + '" data-date="' + ds + '">';
      h += '<span class="cal-day-num">' + d + '</span>';
      if (dayEv.length) {
        h += '<span class="cal-dots">';
        const types = [...new Set(dayEv.map(e => e.type))].slice(0, 4);
        types.forEach(t => { h += '<i class="dot dot-' + t + '"></i>'; });
        if (dayEv.length > 4) h += '<span class="cal-more">+' + (dayEv.length - 4) + '</span>';
        h += '</span>';
      }
      h += '</button>';
    }
    h += '</div>';
    grid.innerHTML = h;

    grid.querySelectorAll('.cal-cell[data-date]').forEach(el => {
      el.onclick = () => {
        selectedDate = el.getAttribute('data-date');
        renderGrid(events);
        renderDaySide(events);
      };
    });
  }

  function renderDaySide(events) {
    const list = document.getElementById('side-list');
    const dateEl = document.getElementById('side-date');
    if (!list) return;
    if (!selectedDate) {
      list.innerHTML = '<div class="empty">Оберіть день</div>';
      if (dateEl) dateEl.textContent = '—';
      return;
    }
    if (dateEl) dateEl.textContent = fmt(selectedDate);
    const dayEv = eventsOnDate(events, selectedDate);
    if (!dayEv.length) {
      list.innerHTML = '<div class="empty">Немає подій</div>';
      return;
    }
    list.innerHTML = dayEv.map(e =>
      '<div class="side-item side-item--' + e.type + '" data-id="' + esc(e.id) + '" data-type="' + e.type + '">' +
      '<div class="side-item__t">' + esc(e.title) + '</div>' +
      '<div class="side-item__m">' + esc(e.source) +
      (e.start !== e.end ? ' · ' + fmt(e.start) + '–' + fmt(e.end) : '') +
      (e.note ? ' · ' + esc(e.note) : '') + '</div></div>'
    ).join('');

    list.querySelectorAll('.side-item--custom').forEach(el => {
      el.style.cursor = 'pointer';
      el.onclick = () => openEventModal(el.getAttribute('data-id'));
    });
  }

  function renderUpcoming(events) {
    const el = document.getElementById('upcoming-list');
    if (!el) return;
    const today = iso(new Date());
    const limit = new Date();
    limit.setDate(limit.getDate() + 14);
    const lim = iso(limit);
    const upcoming = events
      .filter(e => e.end >= today && e.start <= lim)
      .sort((a, b) => String(a.start).localeCompare(String(b.start)))
      .slice(0, 12);
    if (!upcoming.length) {
      el.innerHTML = '<div class="empty">Немає подій на 14 днів</div>';
      return;
    }
    el.innerHTML = upcoming.map(e =>
      '<div class="side-item side-item--' + e.type + '">' +
      '<div class="side-item__t">' + esc(e.title) + '</div>' +
      '<div class="side-item__m">' + fmt(e.start) + (e.start !== e.end ? ' – ' + fmt(e.end) : '') +
      ' · ' + esc(e.source) + '</div></div>'
    ).join('');
  }

  function refresh() {
    const user = currentUser();
    if (!user) return;
    const events = collectEvents(user);
    renderGrid(events);
    renderDaySide(events);
    renderUpcoming(events);
    // reminders → notifications once per day key
    maybeRemind(user, events);
  }

  function maybeRemind(user, events) {
    const today = iso(new Date());
    const flagKey = 'nexus_cal_remind_' + today;
    if (sessionStorage.getItem(flagKey)) return;
    events.forEach(e => {
      if (e.type !== 'custom' || e.remind === '' || e.remind == null) return;
      const start = new Date(e.start + 'T12:00:00');
      const remindAt = new Date(start);
      remindAt.setDate(remindAt.getDate() - Number(e.remind || 0));
      if (iso(remindAt) === today && window.NexusCore && NexusCore.notify) {
        NexusCore.notify('Нагадування: ' + e.title + ' (' + fmt(e.start) + ')', 'info', { userId: user.id });
      }
    });
    sessionStorage.setItem(flagKey, '1');
  }

  function openEventModal(id) {
    editingId = id || null;
    const modal = document.getElementById('event-modal');
    const del = document.getElementById('ev-delete');
    document.getElementById('event-modal-title').textContent = id ? 'Редагувати подію' : 'Нова подія';
    if (id) {
      const ev = loadCustomEvents().find(x => x.id === id);
      if (!ev) return;
      document.getElementById('ev-title').value = ev.title || '';
      document.getElementById('ev-start').value = ev.start || '';
      document.getElementById('ev-end').value = ev.end || '';
      document.getElementById('ev-note').value = ev.note || '';
      document.getElementById('ev-remind').value = ev.remind != null ? String(ev.remind) : '';
      if (del) del.hidden = false;
    } else {
      document.getElementById('ev-title').value = '';
      document.getElementById('ev-start').value = selectedDate || iso(new Date());
      document.getElementById('ev-end').value = selectedDate || iso(new Date());
      document.getElementById('ev-note').value = '';
      document.getElementById('ev-remind').value = '';
      if (del) del.hidden = true;
    }
    modal.hidden = false;
  }

  function closeEventModal() {
    document.getElementById('event-modal').hidden = true;
    editingId = null;
  }

  function saveEvent() {
    const user = currentUser();
    if (!user) return;
    const title = (document.getElementById('ev-title').value || '').trim();
    const start = document.getElementById('ev-start').value;
    let end = document.getElementById('ev-end').value || start;
    const note = (document.getElementById('ev-note').value || '').trim();
    const remind = document.getElementById('ev-remind').value;
    if (!title || !start) { alert('Вкажіть назву та дату'); return; }
    if (end < start) end = start;
    let list = loadCustomEvents();
    if (editingId) {
      const i = list.findIndex(x => x.id === editingId);
      if (i >= 0) {
        list[i] = Object.assign({}, list[i], { title, start, end, note, remind: remind === '' ? null : Number(remind) });
      }
    } else {
      list.push({
        id: uid(), userId: user.id, title, start, end, note,
        remind: remind === '' ? null : Number(remind),
        createdAt: new Date().toISOString()
      });
    }
    saveCustomEvents(list);
    if (window.NexusCore && NexusCore.audit) NexusCore.audit(editingId ? 'calendar.update' : 'calendar.create', 'event', { title, start });
    closeEventModal();
    refresh();
  }

  function deleteEvent() {
    if (!editingId || !confirm('Видалити подію?')) return;
    saveCustomEvents(loadCustomEvents().filter(x => x.id !== editingId));
    if (window.NexusCore && NexusCore.audit) NexusCore.audit('calendar.delete', 'event', { id: editingId });
    closeEventModal();
    refresh();
  }

  function exportIcs() {
    const user = currentUser();
    if (!user) return;
    const events = collectEvents(user);
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NEXUS//Calendar//UK', 'CALSCALE:GREGORIAN'];
    events.forEach(e => {
      const s = String(e.start).replace(/-/g, '');
      const endDate = new Date(e.end + 'T12:00:00');
      endDate.setDate(endDate.getDate() + 1);
      const en = iso(endDate).replace(/-/g, '');
      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + e.id + '@nexus.local');
      lines.push('DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z');
      lines.push('DTSTART;VALUE=DATE:' + s);
      lines.push('DTEND;VALUE=DATE:' + en);
      lines.push('SUMMARY:' + String(e.title).replace(/[,;\\]/g, ' '));
      lines.push('DESCRIPTION:' + String((e.source || '') + ' ' + (e.note || '')).replace(/[,;\\]/g, ' '));
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'nexus-calendar.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function initTheme() {
    const btn = document.getElementById('btn-theme');
    if (!btn) return;
    btn.onclick = () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'auto';
      const next = cur === 'dark' ? 'light' : cur === 'light' ? 'auto' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('nexus_theme_v1', next); } catch (e) {}
    };
  }

  function init() {
    const user = currentUser();
    if (!user) {
      document.getElementById('auth-ov').style.display = '';
      return;
    }
    if (window.NexusCore && NexusCore.requireModule && !NexusCore.requireModule('calendar')) return;
    document.getElementById('auth-ov').style.display = 'none';
    document.getElementById('app').hidden = false;

    const n = new Date();
    viewY = n.getFullYear();
    viewM = n.getMonth();
    selectedDate = iso(n);

    document.getElementById('cal-prev').onclick = () => {
      viewM--; if (viewM < 0) { viewM = 11; viewY--; } refresh();
    };
    document.getElementById('cal-next').onclick = () => {
      viewM++; if (viewM > 11) { viewM = 0; viewY++; } refresh();
    };
    document.getElementById('cal-today').onclick = () => {
      const t = new Date(); viewY = t.getFullYear(); viewM = t.getMonth(); selectedDate = iso(t); refresh();
    };
    document.getElementById('btn-add').onclick = () => openEventModal(null);
    document.getElementById('btn-ics').onclick = exportIcs;
    document.getElementById('event-close').onclick = closeEventModal;
    document.getElementById('ev-cancel').onclick = closeEventModal;
    document.getElementById('ev-save').onclick = saveEvent;
    document.getElementById('ev-delete').onclick = deleteEvent;
    document.getElementById('event-modal').onclick = e => { if (e.target.id === 'event-modal') closeEventModal(); };

    initTheme();
    refresh();
    if (window.NexusCore && NexusCore.enforceReadOnly) NexusCore.enforceReadOnly();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
