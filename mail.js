/* NEXUS — Corporate internal mail + mailto bridge */
(() => {
  'use strict';

  const MAIL_KEY = 'nexus_mail_v1';
  let folder = 'inbox';
  let selectedId = null;

  function read(key, fb) {
    try {
      const r = localStorage.getItem(key);
      return r == null ? fb : JSON.parse(r);
    } catch (e) { return fb; }
  }
  function write(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function uid() { return 'mail_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function fmt(d) {
    if (!d) return '—';
    const p = String(d).slice(0, 16).replace('T', ' ');
    return p;
  }

  function currentUser() {
    if (window.NexusCore) return NexusCore.getCurrentUser();
    try {
      const s = read('nexus_session_v1', null);
      if (!s || !s.userId || (s.expiresAt && s.expiresAt < Date.now())) return null;
      return (read('nexus_users_v1', []) || []).find(u => u.id === s.userId) || null;
    } catch (e) { return null; }
  }

  function loadMail() {
    const db = read(MAIL_KEY, { messages: [] });
    return Array.isArray(db.messages) ? db.messages : [];
  }
  function saveMail(list) {
    write(MAIL_KEY, { messages: list, updatedAt: new Date().toISOString() });
  }

  /** Merge system notifications into "system" folder view */
  function systemMessages(user) {
    const ntf = read('nexus_notifications_v1', []);
    if (!Array.isArray(ntf)) return [];
    return ntf
      .filter(n => !n.userId || n.userId === user.id)
      .map(n => ({
        id: 'sys_' + n.id,
        type: 'system',
        fromId: 'system',
        fromName: 'Система NEXUS',
        toId: user.id,
        toName: user.fullName || user.username,
        subject: n.type === 'error' ? 'Помилка / попередження' : n.type === 'success' ? 'Успішна дія' : 'Сповіщення',
        body: n.message || '',
        at: n.at,
        read: !!n.read,
        folder: 'system'
      }));
  }

  function visibleMessages(user) {
    const all = loadMail();
    const q = (document.getElementById('mail-q')?.value || '').toLowerCase().trim();
    let list = [];
    if (folder === 'inbox') {
      list = all.filter(m => m.toId === user.id && !m.archived && m.type !== 'system');
    } else if (folder === 'sent') {
      list = all.filter(m => m.fromId === user.id && !m.archived);
    } else if (folder === 'archive') {
      list = all.filter(m => (m.toId === user.id || m.fromId === user.id) && m.archived);
    } else if (folder === 'system') {
      list = systemMessages(user);
    }
    list = list.slice().sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
    if (q) {
      list = list.filter(m =>
        (m.subject || '').toLowerCase().includes(q) ||
        (m.body || '').toLowerCase().includes(q) ||
        (m.fromName || '').toLowerCase().includes(q) ||
        (m.toName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  function updateCounts(user) {
    const all = loadMail();
    const inboxUnread = all.filter(m => m.toId === user.id && !m.read && !m.archived).length;
    const sysUnread = systemMessages(user).filter(m => !m.read).length;
    const ci = document.getElementById('cnt-inbox');
    const cs = document.getElementById('cnt-system');
    if (ci) ci.textContent = inboxUnread ? String(inboxUnread) : '';
    if (cs) cs.textContent = sysUnread ? String(sysUnread) : '';
  }

  function renderList(user) {
    const host = document.getElementById('mail-list');
    if (!host) return;
    const list = visibleMessages(user);
    updateCounts(user);
    if (!list.length) {
      host.innerHTML = '<div class="empty">Немає повідомлень</div>';
      return;
    }
    host.innerHTML = list.map(m =>
      '<button type="button" class="mail-item' + (!m.read ? ' mail-item--unread' : '') +
      (selectedId === m.id ? ' mail-item--active' : '') + '" data-id="' + esc(m.id) + '">' +
      '<div class="mail-item__top"><span class="mail-item__from">' + esc(folder === 'sent' ? (m.toName || '—') : (m.fromName || '—')) +
      '</span><span class="mail-item__date">' + esc(fmt(m.at).slice(0, 16)) + '</span></div>' +
      '<div class="mail-item__subj">' + esc(m.subject || '(без теми)') + '</div>' +
      '<div class="mail-item__prev">' + esc((m.body || '').slice(0, 90)) + '</div></button>'
    ).join('');

    host.querySelectorAll('.mail-item').forEach(el => {
      el.onclick = () => {
        selectedId = el.getAttribute('data-id');
        openMessage(user, selectedId);
        renderList(user);
      };
    });
  }

  function openMessage(user, id) {
    const pane = document.getElementById('mail-read');
    if (!pane) return;
    let m = loadMail().find(x => x.id === id);
    if (!m && String(id).startsWith('sys_')) {
      m = systemMessages(user).find(x => x.id === id);
    }
    if (!m) {
      pane.innerHTML = '<div class="empty-read">Оберіть повідомлення</div>';
      return;
    }

    // mark read
    if (!String(id).startsWith('sys_') && m.toId === user.id && !m.read) {
      const all = loadMail();
      const i = all.findIndex(x => x.id === id);
      if (i >= 0) { all[i].read = true; saveMail(all); m.read = true; }
    }
    if (String(id).startsWith('sys_')) {
      const ntf = read('nexus_notifications_v1', []);
      if (Array.isArray(ntf)) {
        const nid = id.replace(/^sys_/, '');
        const updated = ntf.map(n => n.id === nid ? Object.assign({}, n, { read: true }) : n);
        write('nexus_notifications_v1', updated);
      }
    }

    pane.innerHTML =
      '<div class="read-head">' +
      '<div class="read-subj">' + esc(m.subject || '(без теми)') + '</div>' +
      '<div class="read-meta">Від: <b>' + esc(m.fromName) + '</b> · Кому: <b>' + esc(m.toName) + '</b> · ' + esc(fmt(m.at)) + '</div>' +
      '</div>' +
      '<div class="read-body">' + esc(m.body).replace(/\n/g, '<br>') + '</div>' +
      '<div class="read-actions">' +
      (m.type !== 'system' && m.toId === user.id
        ? '<button type="button" class="btn bs" id="btn-reply">Відповісти</button>' : '') +
      (m.type !== 'system'
        ? '<button type="button" class="btn bs" id="btn-archive">' + (m.archived ? 'З архіву' : 'В архів') + '</button>' : '') +
      (m.type !== 'system' && (m.toId === user.id || m.fromId === user.id)
        ? '<button type="button" class="btn bd" id="btn-del">Видалити</button>' : '') +
      '</div>';

    const reply = document.getElementById('btn-reply');
    if (reply) reply.onclick = () => openCompose({ toId: m.fromId, subject: 'Re: ' + (m.subject || '') });
    const arch = document.getElementById('btn-archive');
    if (arch) arch.onclick = () => {
      const all = loadMail();
      const i = all.findIndex(x => x.id === id);
      if (i >= 0) { all[i].archived = !all[i].archived; saveMail(all); renderList(user); openMessage(user, id); }
    };
    const del = document.getElementById('btn-del');
    if (del) del.onclick = () => {
      if (!confirm('Видалити повідомлення?')) return;
      saveMail(loadMail().filter(x => x.id !== id));
      selectedId = null;
      document.getElementById('mail-read').innerHTML = '<div class="empty-read">Оберіть повідомлення</div>';
      renderList(user);
    };
  }

  function openCompose(pre) {
    pre = pre || {};
    const modal = document.getElementById('compose-modal');
    const users = (read('nexus_users_v1', []) || []).filter(u => u && u.id);
    const me = currentUser();
    const sel = document.getElementById('c-to');
    sel.innerHTML = '<option value="">— оберіть користувача NEXUS —</option>' +
      users.filter(u => !me || u.id !== me.id).map(u =>
        '<option value="' + esc(u.id) + '"' + (pre.toId === u.id ? ' selected' : '') + '>' +
        esc((u.fullName || u.username) + ' (' + u.username + ')') + '</option>'
      ).join('');
    document.getElementById('c-email').value = '';
    document.getElementById('c-subject').value = pre.subject || '';
    document.getElementById('c-body').value = pre.body || '';
    modal.hidden = false;
  }

  function closeCompose() {
    document.getElementById('compose-modal').hidden = true;
  }

  function sendInternal() {
    const me = currentUser();
    if (!me) return;
    const toId = document.getElementById('c-to').value;
    const subject = (document.getElementById('c-subject').value || '').trim();
    const body = (document.getElementById('c-body').value || '').trim();
    if (!toId) { alert('Оберіть одержувача в NEXUS'); return; }
    if (!subject || !body) { alert('Вкажіть тему і текст'); return; }
    const users = read('nexus_users_v1', []) || [];
    const to = users.find(u => u.id === toId);
    if (!to) { alert('Користувача не знайдено'); return; }
    const msg = {
      id: uid(),
      type: 'internal',
      fromId: me.id,
      fromName: me.fullName || me.username,
      toId: to.id,
      toName: to.fullName || to.username,
      subject, body,
      at: new Date().toISOString(),
      read: false,
      archived: false
    };
    const list = loadMail();
    list.push(msg);
    saveMail(list);
    if (window.NexusCore && NexusCore.notify) {
      NexusCore.notify('Нове повідомлення від ' + msg.fromName + ': ' + subject, 'info', { userId: to.id });
    }
    if (window.NexusCore && NexusCore.audit) {
      NexusCore.audit('mail.send', 'mail', { toId, subject });
    }
    closeCompose();
    folder = 'sent';
    setFolderActive();
    selectedId = msg.id;
    renderList(me);
    openMessage(me, msg.id);
  }

  function sendMailto() {
    const email = (document.getElementById('c-email').value || '').trim();
    const subject = (document.getElementById('c-subject').value || '').trim();
    const body = (document.getElementById('c-body').value || '').trim();
    if (!email) { alert('Вкажіть зовнішню email-адресу'); return; }
    const url = 'mailto:' + encodeURIComponent(email) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
    window.location.href = url;
    // also log as sent copy for the user
    const me = currentUser();
    if (me) {
      const list = loadMail();
      list.push({
        id: uid(), type: 'external',
        fromId: me.id, fromName: me.fullName || me.username,
        toId: '', toName: email, subject, body,
        at: new Date().toISOString(), read: true, archived: false, external: true
      });
      saveMail(list);
      if (window.NexusCore && NexusCore.audit) NexusCore.audit('mail.mailto', 'mail', { email, subject });
    }
    closeCompose();
  }

  function setFolderActive() {
    document.querySelectorAll('.mail-folder').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-folder') === folder);
    });
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
    if (window.NexusCore && NexusCore.requireModule && !NexusCore.requireModule('mail')) return;
    document.getElementById('auth-ov').style.display = 'none';
    document.getElementById('app').hidden = false;

    document.querySelectorAll('.mail-folder').forEach(btn => {
      btn.onclick = () => {
        folder = btn.getAttribute('data-folder');
        selectedId = null;
        setFolderActive();
        document.getElementById('mail-read').innerHTML = '<div class="empty-read">Оберіть повідомлення</div>';
        renderList(user);
      };
    });
    document.getElementById('mail-q').oninput = () => renderList(user);
    document.getElementById('btn-compose').onclick = () => openCompose();
    document.getElementById('compose-close').onclick = closeCompose;
    document.getElementById('c-cancel').onclick = closeCompose;
    document.getElementById('c-send-internal').onclick = sendInternal;
    document.getElementById('c-send-mailto').onclick = sendMailto;
    document.getElementById('compose-modal').onclick = e => { if (e.target.id === 'compose-modal') closeCompose(); };

    initTheme();
    renderList(user);
    if (window.NexusCore && NexusCore.enforceReadOnly) NexusCore.enforceReadOnly();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
