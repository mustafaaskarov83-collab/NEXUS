/* NEXUS — реєстр заявок (черга PM за проектами + директор) */
(function () {
  'use strict';

  var filter = 'inbox';

  function user() {
    return window.NexusCore && NexusCore.getCurrentUser ? NexusCore.getCurrentUser() : null;
  }

  function ensureAuth() {
    var u = user();
    if (!u) {
      try { sessionStorage.setItem('nexus_redirect_after_login', 'requests.html'); } catch (e) {}
      location.href = 'index.html';
      return false;
    }
    return true;
  }

  function canPmRole(u) { return u && (u.role === 'admin' || u.role === 'manager'); }
  function canDir(u) { return u && u.role === 'admin'; }
  function canSeeAll(u) { return canPmRole(u); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function statusHtml(st) {
    var map = {
      draft: ['Чернетка', 'cab-req-status--draft'],
      pending_pm: ['Очікує PM', 'cab-req-status--pm'],
      pending_director: ['Очікує директора', 'cab-req-status--dir'],
      approved: ['Схвалено', 'cab-req-status--ok'],
      rejected: ['Відхилено', 'cab-req-status--no']
    };
    var m = map[st] || map.draft;
    return '<span class="cab-req-status ' + m[1] + '">' + esc(m[0]) + '</span>';
  }

  function allItems() {
    try {
      var raw = localStorage.getItem('nexus_hr_request_submissions_v1');
      var p = raw ? JSON.parse(raw) : { items: [] };
      return Array.isArray(p.items) ? p.items : [];
    } catch (e) { return []; }
  }

  function normName(s) {
    return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function loadProjects() {
    try {
      var raw = localStorage.getItem('nexus_projects_v1');
      var p = raw ? JSON.parse(raw) : null;
      return p && Array.isArray(p.projects) ? p.projects : [];
    } catch (e) { return []; }
  }

  function userNames(u) {
    var names = [];
    if (u.fullName) names.push(normName(u.fullName));
    if (u.username) names.push(normName(u.username));
    try {
      var hr = JSON.parse(localStorage.getItem('nexus_hr_ua_v2') || '{}');
      var emps = hr.employees || [];
      if (u.employeeId) {
        var e = emps.find(function (x) { return x.id === u.employeeId; });
        if (e && e.fullName) names.push(normName(e.fullName));
      }
    } catch (e) {}
    return names;
  }

  function managedProjectIds(u) {
    var names = userNames(u);
    return loadProjects().filter(function (p) {
      if (p.managerUserId && p.managerUserId === u.id) return true;
      var m = normName(p.manager);
      return m && names.some(function (n) {
        return n === m || m.indexOf(n) >= 0 || n.indexOf(m) >= 0;
      });
    }).map(function (p) { return p.id; });
  }

  function subProjectIds(x) {
    if (x.projectIds && x.projectIds.length) return x.projectIds;
    try {
      var hr = JSON.parse(localStorage.getItem('nexus_hr_ua_v2') || '{}');
      var emps = hr.employees || [];
      var emp = x.employeeId ? emps.find(function (e) { return e.id === x.employeeId; }) : null;
      if (!emp && x.employeeName) {
        var n = normName(x.employeeName);
        emp = emps.find(function (e) { return normName(e.fullName) === n; });
      }
      if (!emp) return [];
      if (Array.isArray(emp.projectIds)) return emp.projectIds;
      if (emp.projectId) return [emp.projectId];
    } catch (e) {}
    return [];
  }

  function myItems(u) {
    var empId = u.employeeId || null;
    try {
      var hr = JSON.parse(localStorage.getItem('nexus_hr_ua_v2') || '{}');
      var emps = hr.employees || [];
      if (!empId && u.fullName) {
        var e = emps.find(function (x) {
          return (x.fullName || '').trim().toLowerCase() === (u.fullName || '').trim().toLowerCase();
        });
        if (e) empId = e.id;
      }
    } catch (e) {}
    return allItems().filter(function (x) {
      return x.userId === u.id || (empId && x.employeeId === empId);
    });
  }

  /** Черга: admin — усі PM+директор; manager — лише pending_pm своїх проектів */
  function inboxItems(u) {
    var all = allItems();
    var list = [];
    if (canDir(u)) {
      all.forEach(function (x) {
        if (x.status === 'pending_pm' || x.status === 'pending_director') list.push(x);
      });
    } else if (u && u.role === 'manager') {
      var managed = managedProjectIds(u);
      all.forEach(function (x) {
        if (x.status !== 'pending_pm') return;
        var ep = subProjectIds(x);
        if (ep.some(function (pid) { return managed.indexOf(pid) >= 0; })) list.push(x);
      });
    }
    var seen = {};
    return list.filter(function (x) {
      if (seen[x.id]) return false;
      seen[x.id] = true;
      return true;
    });
  }

  function filtered(u) {
    var all = allItems();
    var base = canSeeAll(u) ? all : myItems(u);
    if (filter === 'inbox') return inboxItems(u);
    if (filter === 'mine') return myItems(u);
    if (filter === 'pending') {
      return base.filter(function (x) {
        return x.status === 'pending_pm' || x.status === 'pending_director' || x.status === 'draft';
      });
    }
    if (filter === 'approved') return base.filter(function (x) { return x.status === 'approved'; });
    if (filter === 'rejected') return base.filter(function (x) { return x.status === 'rejected'; });
    return base;
  }

  function sortItems(list) {
    return list.slice().sort(function (a, b) {
      return String(b.updatedAt || b.submittedAt || b.createdAt || '')
        .localeCompare(String(a.updatedAt || a.submittedAt || a.createdAt || ''));
    });
  }

  function updateCounts(u) {
    var all = allItems();
    var mine = myItems(u);
    var inbox = inboxItems(u);
    var base = canSeeAll(u) ? all : mine;
    function set(id, n) {
      var el = document.getElementById(id);
      if (el) el.textContent = n;
    }
    set('c-inbox', inbox.length);
    set('c-mine', mine.length);
    set('c-all', base.length);
    set('c-pending', base.filter(function (x) {
      return x.status === 'pending_pm' || x.status === 'pending_director' || x.status === 'draft';
    }).length);
    set('c-ok', base.filter(function (x) { return x.status === 'approved'; }).length);
    set('c-no', base.filter(function (x) { return x.status === 'rejected'; }).length);
  }

  function roleHint(u) {
    var el = document.getElementById('req-role-hint');
    if (!el) return;
    var inbox = inboxItems(u).length;
    if (canDir(u)) {
      el.innerHTML = '<strong>Директор (admin).</strong> Бачите і підписуєте всі заявки. «На погодженні» — черга PM і фінальний етап.' +
        (inbox ? ' Зараз у черзі: <b>' + inbox + '</b>.' : ' Черга порожня.');
    } else if (u && u.role === 'manager') {
      el.innerHTML = '<strong>Project manager.</strong> У черзі лише заявки співробітників <b>ваших</b> проектів (у картці проекту поле «Керівник» = ваше ПІБ).' +
        (inbox ? ' У черзі: <b>' + inbox + '</b>.' : ' Немає заявок по ваших проектах.');
    } else {
      el.innerHTML = '<strong>Ваші заявки.</strong> Створіть → відправте. Друк після схвалення PM вашого проекту і директора.';
    }
  }

  function render() {
    var u = user();
    if (!u) return;
    updateCounts(u);
    roleHint(u);
    var host = document.getElementById('req-list-host');
    if (!host) return;
    var list = sortItems(filtered(u));
    if (!list.length) {
      var msg = 'Список порожній.';
      if (filter === 'inbox') msg = 'Немає заявок, що очікують вашого погодження.';
      if (filter === 'mine') msg = 'Ви ще не створювали заявок.';
      host.innerHTML = '<div class="req-empty">' + msg + '</div>';
      return;
    }
    host.innerHTML =
      '<table class="req-table"><thead><tr>' +
      '<th>Назва</th><th>Автор</th><th>Статус</th><th>Оновлено</th><th></th>' +
      '</tr></thead><tbody>' +
      list.map(function (s) {
        var dt = String(s.updatedAt || s.submittedAt || s.createdAt || '').slice(0, 16).replace('T', ' ');
        return '<tr class="row-click" data-id="' + esc(s.id) + '">' +
          '<td><b>' + esc(s.title || 'Заявка') + '</b></td>' +
          '<td>' + esc(s.employeeName || s.userName || '—') + '</td>' +
          '<td>' + statusHtml(s.status) + '</td>' +
          '<td>' + esc(dt || '—') + '</td>' +
          '<td><button type="button" class="btn bs bsm" data-open="' + esc(s.id) + '">Відкрити</button></td>' +
          '</tr>';
      }).join('') +
      '</tbody></table>';

    host.querySelectorAll('[data-open]').forEach(function (el) {
      el.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var id = el.getAttribute('data-open');
        if (id && window.CabRequests) CabRequests.openSubmission(id);
      });
    });
    host.querySelectorAll('tr.row-click').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-id');
        if (id && window.CabRequests) CabRequests.openSubmission(id);
      });
    });
  }

  function bind() {
    var neu = document.getElementById('req-page-new');
    if (neu) neu.addEventListener('click', function () {
      if (window.CabRequests) CabRequests.openNew();
    });
    var ref = document.getElementById('req-page-refresh');
    if (ref) ref.addEventListener('click', render);

    document.querySelectorAll('#req-filters [data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        filter = btn.getAttribute('data-filter') || 'inbox';
        document.querySelectorAll('#req-filters [data-filter]').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        render();
      });
    });

    var u = user();
    if (u && u.role === 'viewer') {
      filter = 'mine';
      document.querySelectorAll('#req-filters [data-filter]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-filter') === 'mine');
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!ensureAuth()) return;
    bind();
    render();
    setInterval(render, 5000);
  });
})();
