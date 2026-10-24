/* ═══════════════════════════════════════════════════════════════════════
   NEXUS ENGENEERING — Дашборд KPI v1.0.1
   Аналитика по всем модулям с графиками Chart.js
   ═══════════════════════════════════════════════════════════════════════ */

const Dash = (() => {

  const USERS_KEY = 'nexus_users_v1';
  const SESSION_KEY = 'nexus_session_v1';
  const HR_KEY = 'nexus_hr_ua_v2';
  const INV_KEY = 'nexus_inventory_v1';
  const THEME_KEY = 'nexus_theme_v1';

  const CATS_EMP = {
    standard:     { name: 'Звичайна', icon: '👤' },
    disabled_1_2: { name: 'Інвалідність I–II', icon: '♿' },
    disabled_3:   { name: 'Інвалідність III', icon: '♿' },
    minor:        { name: 'Неповнолітній', icon: '🧑' },
    teacher:      { name: 'Педагог', icon: '📚' },
    custom:       { name: 'Інша', icon: '👤' }
  };

  const CATS_INV = {
    tech:      { name: 'Техніка', icon: '💻' },
    furniture: { name: 'Меблі', icon: '🪑' },
    transport: { name: 'Транспорт', icon: '🚗' },
    tool:      { name: 'Інструменти', icon: '🔧' },
    office:    { name: 'Офісне', icon: '📎' },
    other:     { name: 'Інше', icon: '📦' }
  };

  const STATUSES_INV = {
    active:  { name: 'В експлуатації', color: '#10b981' },
    repair:  { name: 'На ремонті', color: '#f59e0b' },
    storage: { name: 'На складі', color: '#3b82f6' },
    written: { name: 'Списано', color: '#94a3b8' }
  };

  let currentRange = 'quarter';
  let charts = {};

  const pad = n => String(n).padStart(2, '0');
  const fmtMoney = n => new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(Math.round(n || 0)) + ' ₴';
  const fmtNum = n => new Intl.NumberFormat('uk-UA').format(n || 0);

  function getThemeColors() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
      (document.documentElement.getAttribute('data-theme') === 'auto' &&
       window.matchMedia('(prefers-color-scheme: dark)').matches);
    return {
      text: dark ? '#e5e7eb' : '#0f172a',
      muted: dark ? '#94a3b8' : '#64748b',
      grid: dark ? 'rgba(148,163,184,.15)' : 'rgba(100,116,139,.1)'
    };
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const sess = JSON.parse(raw);
      if (!sess || !sess.userId) return null;
      if (sess.expiresAt && sess.expiresAt < Date.now()) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      return users.find(u => u.id === sess.userId) || null;
    } catch(e) { return null; }
  }

  function initAuth() {
    const user = getCurrentUser();
    if (!user) {
      try { sessionStorage.setItem('nexus_redirect_after_login', 'dashboard.html'); } catch(e){}
      location.href = 'index.html';
      return false;
    }
    const auth = document.getElementById('auth-ov');
    const app = document.getElementById('app');
    if (auth) auth.classList.add('hidden');
    if (app) app.classList.add('vis');

    const initials = (user.fullName || user.username).split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase();
    const roleMap = { admin: 'Адміністратор', manager: 'Менеджер', viewer: 'Перегляд' };
    document.getElementById('av').textContent = initials;
    document.getElementById('hun').textContent = user.fullName || user.username;
    document.getElementById('hur').textContent = roleMap[user.role] || user.role;
    return true;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    location.href = 'index.html';
  }

  function initTheme() {
    let current = localStorage.getItem(THEME_KEY) || 'auto';
    document.documentElement.setAttribute('data-theme', current);
    const updateIcon = () => {
      const icons = { light:'☀️', dark:'🌙', auto:'🌗' };
      document.querySelectorAll('.theme-btn').forEach(b => b.textContent = icons[current] || '🌗');
    };
    const MODES = ['light','dark','auto'];
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = MODES.indexOf(current);
        current = MODES[(idx+1) % MODES.length];
        document.documentElement.setAttribute('data-theme', current);
        localStorage.setItem(THEME_KEY, current);
        updateIcon();
        setTimeout(() => { destroyCharts(); renderCharts(); }, 100);
      });
    });
    updateIcon();
  }

  function loadHR() {
    try {
      const r = localStorage.getItem(HR_KEY);
      if (r) { const p = JSON.parse(r); if (p && p.employees) return p; }
    } catch(e){}
    return { employees: [] };
  }

  function loadInv() {
    try {
      const r = localStorage.getItem(INV_KEY);
      if (r) { const p = JSON.parse(r); if (p && p.items) return p; }
    } catch(e){}
    return { items: [] };
  }

  function getRangeStart() {
    const now = new Date();
    if (currentRange === 'all') return null;
    if (currentRange === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
    if (currentRange === 'quarter') return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    if (currentRange === 'year') return new Date(now.getFullYear(), 0, 1);
    return null;
  }

  function getMonthsList() {
    const months = [];
    const now = new Date();
    const start = getRangeStart();
    if (!start) {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ y: d.getFullYear(), m: d.getMonth() + 1 });
      }
    } else {
      let cur = new Date(start);
      while (cur <= now) {
        months.push({ y: cur.getFullYear(), m: cur.getMonth() + 1 });
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      }
    }
    return months;
  }

  function renderKPIs() {
    const hr = loadHR();
    const inv = loadInv();
    const emps = hr.employees || [];
    const items = inv.items || [];
    const today = new Date().toISOString().slice(0, 10);

    document.getElementById('kpi-emp').textContent = fmtNum(emps.length);

    const months = getMonthsList();
    let payrollSum = 0, payrollCount = 0;
    const lastMonths = months.slice(-3);
    lastMonths.forEach(m => {
      let monthTotal = 0;
      emps.forEach(e => {
        const p = (e.payments || []).find(x => x.year === m.y && x.month === m.m);
        monthTotal += p ? Number(p.amount) || 0 : 0;
      });
      if (monthTotal > 0) { payrollSum += monthTotal; payrollCount++; }
    });
    const payroll = payrollCount > 0 ? payrollSum / payrollCount : 0;
    document.getElementById('kpi-payroll').textContent = fmtMoney(payroll);

    let vac = 0;
    emps.forEach(e => (e.leaves || []).forEach(l => {
      if (l.start <= today && l.end >= today) vac++;
    }));
    document.getElementById('kpi-vac').textContent = fmtNum(vac);

    document.getElementById('kpi-inv').textContent = fmtNum(items.length);

    let sick = 0;
    emps.forEach(e => (e.sickLeaves || []).forEach(s => {
      if (s.start <= today && s.end >= today) sick++;
    }));
    document.getElementById('kpi-sick').textContent = fmtNum(sick);

    const cost = items.reduce((s, it) => s + (Number(it.cost) || 0), 0);
    document.getElementById('kpi-cost').textContent = fmtMoney(cost);
  }

  function destroyCharts() {
    Object.values(charts).forEach(c => { try { c.destroy(); } catch(e){} });
    charts = {};
  }

  function renderCharts() {
    const hr = loadHR();
    const inv = loadInv();
    const emps = hr.employees || [];
    const items = inv.items || [];
    const colors = getThemeColors();

    Chart.defaults.font.family = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = colors.text;

    const catCounts = {};
    emps.forEach(e => { catCounts[e.category || 'standard'] = (catCounts[e.category || 'standard'] || 0) + 1; });
    const catKeys = Object.keys(catCounts);
    const catLabels = catKeys.map(k => (CATS_EMP[k]?.name || k));
    const catData = catKeys.map(k => catCounts[k]);
    const catColors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4'];

    const ctx1 = document.getElementById('chart-emp-cat');
    if (ctx1) {
      charts.empCat = new Chart(ctx1, {
        type: 'doughnut',
        data: {
          labels: catLabels.length ? catLabels : ['Немає даних'],
          datasets: [{
            data: catData.length ? catData : [1],
            backgroundColor: catData.length ? catColors.slice(0, catData.length) : ['#e2e8f0'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: colors.text, padding: 14, boxWidth: 12 } }
          }
        }
      });
    }

    const months = getMonthsList();
    const monthLabels = months.map(m => {
      const names = ['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру'];
      return names[m.m - 1] + ' ' + String(m.y).slice(-2);
    });
    const payrollData = months.map(m => {
      let total = 0;
      emps.forEach(e => {
        const p = (e.payments || []).find(x => x.year === m.y && x.month === m.m);
        total += p ? Number(p.amount) || 0 : 0;
      });
      return total;
    });

    const ctx2 = document.getElementById('chart-payroll');
    if (ctx2) {
      charts.payroll = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: monthLabels,
          datasets: [{
            label: 'ФОТ, ₴',
            data: payrollData,
            backgroundColor: '#3b82f6',
            borderRadius: 6,
            maxBarThickness: 40
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: colors.muted }, grid: { display: false } },
            y: {
              ticks: {
                color: colors.muted,
                callback: v => v >= 1000 ? (v / 1000) + 'к' : v
              },
              grid: { color: colors.grid }
            }
          }
        }
      });
    }

    const vacData = months.map(m => {
      let days = 0;
      const first = `${m.y}-${pad(m.m)}-01`;
      const last = `${m.y}-${pad(m.m)}-31`;
      emps.forEach(e => (e.leaves || []).forEach(l => {
        if (l.start <= last && l.end >= first) {
          const s = l.start > first ? l.start : first;
          const e_ = l.end < last ? l.end : last;
          const d1 = new Date(s + 'T00:00:00');
          const d2 = new Date(e_ + 'T00:00:00');
          days += Math.max(0, Math.round((d2 - d1) / 86400000) + 1);
        }
      }));
      return days;
    });

    const ctx3 = document.getElementById('chart-vac');
    if (ctx3) {
      charts.vac = new Chart(ctx3, {
        type: 'bar',
        data: {
          labels: monthLabels,
          datasets: [{
            label: 'Днів',
            data: vacData,
            backgroundColor: '#10b981',
            borderRadius: 6,
            maxBarThickness: 40
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: colors.muted }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { color: colors.muted }, grid: { color: colors.grid } }
          }
        }
      });
    }

    const sickData = months.map(m => {
      let days = 0;
      const first = `${m.y}-${pad(m.m)}-01`;
      const last = `${m.y}-${pad(m.m)}-31`;
      emps.forEach(e => (e.sickLeaves || []).forEach(s => {
        if (s.start <= last && s.end >= first) {
          const s1 = s.start > first ? s.start : first;
          const e1 = s.end < last ? s.end : last;
          const d1 = new Date(s1 + 'T00:00:00');
          const d2 = new Date(e1 + 'T00:00:00');
          days += Math.max(0, Math.round((d2 - d1) / 86400000) + 1);
        }
      }));
      return days;
    });

    const ctx4 = document.getElementById('chart-sick');
    if (ctx4) {
      charts.sick = new Chart(ctx4, {
        type: 'line',
        data: {
          labels: monthLabels,
          datasets: [{
            label: 'Днів',
            data: sickData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239,68,68,.1)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#ef4444'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: colors.muted }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { color: colors.muted }, grid: { color: colors.grid } }
          }
        }
      });
    }

    const invCatCounts = {};
    items.forEach(it => { invCatCounts[it.category || 'other'] = (invCatCounts[it.category || 'other'] || 0) + 1; });
    const invCatKeys = Object.keys(invCatCounts);
    const invCatLabels = invCatKeys.map(k => (CATS_INV[k]?.name || k));
    const invCatData = invCatKeys.map(k => invCatCounts[k]);

    const ctx5 = document.getElementById('chart-inv-cat');
    if (ctx5) {
      charts.invCat = new Chart(ctx5, {
        type: 'doughnut',
        data: {
          labels: invCatLabels.length ? invCatLabels : ['Немає даних'],
          datasets: [{
            data: invCatData.length ? invCatData : [1],
            backgroundColor: invCatData.length ? ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#06b6d4','#94a3b8'] : ['#e2e8f0'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: colors.text, padding: 14, boxWidth: 12 } }
          }
        }
      });
    }

    const invStatusCounts = {};
    items.forEach(it => { invStatusCounts[it.status || 'active'] = (invStatusCounts[it.status || 'active'] || 0) + 1; });
    const invStKeys = Object.keys(invStatusCounts);
    const invStLabels = invStKeys.map(k => (STATUSES_INV[k]?.name || k));
    const invStData = invStKeys.map(k => invStatusCounts[k]);
    const invStColors = invStKeys.map(k => (STATUSES_INV[k]?.color || '#94a3b8'));

    const ctx6 = document.getElementById('chart-inv-status');
    if (ctx6) {
      charts.invStatus = new Chart(ctx6, {
        type: 'doughnut',
        data: {
          labels: invStLabels.length ? invStLabels : ['Немає даних'],
          datasets: [{
            data: invStData.length ? invStData : [1],
            backgroundColor: invStData.length ? invStColors : ['#e2e8f0'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: colors.text, padding: 14, boxWidth: 12 } }
          }
        }
      });
    }

    const period = document.getElementById('payroll-period');
    if (period && months.length) {
      const names = ['січень','лютий','березень','квітень','травень','червень','липень','серпень','вересень','жовтень','листопад','грудень'];
      period.textContent = `Період: ${names[months[0].m-1]} ${months[0].y} — ${names[months[months.length-1].m-1]} ${months[months.length-1].y}`;
    }
  }

  function renderTop() {
    const hr = loadHR();
    const emps = hr.employees || [];
    const list = emps.map(e => {
      const pays = (e.payments || []).filter(p => Number(p.amount) > 0);
      const avg = pays.length ? pays.reduce((s, p) => s + Number(p.amount), 0) / pays.length : 0;
      return { name: e.fullName, position: e.position, avg, count: pays.length };
    }).filter(x => x.avg > 0).sort((a, b) => b.avg - a.avg).slice(0, 5);

    const el = document.getElementById('top-employees');
    if (!el) return;

    if (!list.length) {
      el.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:30px;font-style:italic">Немає даних про виплати</div>';
      return;
    }

    const rankCls = ['gold', 'silver', 'bronze', '', ''];
    el.innerHTML = '<div class="top-list">' + list.map((x, i) => `
      <div class="top-item">
        <div class="top-item__rank ${rankCls[i]}">${i + 1}</div>
        <div class="top-item__info">
          <div class="top-item__name">${x.name}</div>
          <div class="top-item__pos">${x.position || '—'} · ${x.count} міс. даних</div>
        </div>
        <div class="top-item__value">${fmtMoney(x.avg)}</div>
      </div>
    `).join('') + '</div>';
  }

  function renderQuality() {
    const hr = loadHR();
    const inv = loadInv();
    const emps = hr.employees || [];
    const items = inv.items || [];

    const total = emps.length;
    if (!total) {
      document.getElementById('data-quality').innerHTML =
        '<div style="text-align:center;color:var(--text-muted);padding:20px;font-style:italic">Немає співробітників</div>';
      return;
    }

    const withPayments = emps.filter(e => (e.payments || []).length > 0).length;
    const withLeaves = emps.filter(e => (e.leaves || []).length > 0).length;
    const withSick = emps.filter(e => (e.sickLeaves || []).length > 0).length;
    const withBirthday = emps.filter(e => e.birthDate).length;
    const withEmp = items.filter(it => it.employeeId).length;

    const metrics = [
      { label: 'Виплати внесено', val: withPayments, total },
      { label: 'Відпустки внесено', val: withLeaves, total },
      { label: 'Лікарняні внесено', val: withSick, total },
      { label: 'Дата народження', val: withBirthday, total },
      { label: 'Інвентар закріплено', val: withEmp, total: items.length || 1 }
    ];

    document.getElementById('data-quality').innerHTML = metrics.map(m => {
      const pct = Math.round((m.val / m.total) * 100);
      const color = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warn)' : 'var(--danger)';
      return `<div class="quality-item">
        <div class="quality-item__label">${m.label}</div>
        <div class="quality-item__bar"><div class="quality-item__bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="quality-item__pct">${pct}%</div>
      </div>`;
    }).join('');
  }

  function renderAlerts() {
    const hr = loadHR();
    const inv = loadInv();
    const emps = hr.employees || [];
    const items = inv.items || [];
    const today = new Date().toISOString().slice(0, 10);
    const alerts = [];

    const noPay = emps.filter(e => !(e.payments || []).length);
    if (noPay.length > 0) {
      alerts.push({ type: 'warn', icon: '💰', text: `${noPay.length} співробітник(ів) без внесених виплат` });
    }

    const noOwner = items.filter(it => !it.employeeId && it.status === 'active');
    if (noOwner.length > 0) {
      alerts.push({ type: 'warn', icon: '📦', text: `${noOwner.length} одиниць інвентарю в експлуатації без закріплення` });
    }

    const onRepair = items.filter(it => it.status === 'repair');
    if (onRepair.length > 0) {
      alerts.push({ type: 'info', icon: '🔧', text: `${onRepair.length} одиниць інвентарю на ремонті` });
    }

    let onSick = 0;
    emps.forEach(e => (e.sickLeaves || []).forEach(s => {
      if (s.start <= today && s.end >= today) onSick++;
    }));
    if (onSick > 0) {
      alerts.push({ type: 'info', icon: '🏥', text: `${onSick} співробітник(ів) зараз на лікарняному` });
    }

    let onVac = 0;
    emps.forEach(e => (e.leaves || []).forEach(l => {
      if (l.start <= today && l.end >= today) onVac++;
    }));
    if (onVac > 0) {
      alerts.push({ type: 'info', icon: '🌴', text: `${onVac} співробітник(ів) зараз у відпустці` });
    }

    const noCost = items.filter(it => !it.cost || Number(it.cost) === 0);
    if (noCost.length > 0) {
      alerts.push({ type: 'warn', icon: '💸', text: `${noCost.length} одиниць інвентарю без вказаної вартості` });
    }

    const el = document.getElementById('alerts');
    if (!alerts.length) {
      el.innerHTML = '<div class="alert-item alert-ok"><div class="alert-item__icon">✅</div><div>Все гаразд — проблем не виявлено</div></div>';
      return;
    }

    el.innerHTML = alerts.map(a => `
      <div class="alert-item alert-${a.type}">
        <div class="alert-item__icon">${a.icon}</div>
        <div>${a.text}</div>
      </div>
    `).join('');
  }

  function renderSummary() {
    const hr = loadHR();
    const inv = loadInv();
    const emps = hr.employees || [];
    const items = inv.items || [];

    const now = new Date();
    const dateEl = document.getElementById('summary-date');
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    let totalYears = 0, countWithHire = 0;
    emps.forEach(e => {
      if (e.hireDate) {
        const h = new Date(e.hireDate);
        totalYears += (now - h) / (365.25 * 24 * 3600 * 1000);
        countWithHire++;
      }
    });
    const avgStazh = countWithHire ? (totalYears / countWithHire).toFixed(1) : '0';

    let totalPay = 0, payCount = 0;
    emps.forEach(e => (e.payments || []).forEach(p => { totalPay += Number(p.amount) || 0; payCount++; }));
    const avgPay = payCount ? totalPay / payCount : 0;

    const avgInvCost = items.length
      ? items.reduce((s, it) => s + (Number(it.cost) || 0), 0) / items.length
      : 0;

    const cells = [
      { label: 'Всього співробітників', value: fmtNum(emps.length) },
      { label: 'Середній стаж', value: avgStazh + ' р.' },
      { label: 'Середня виплата', value: fmtMoney(avgPay) },
      { label: 'Всього одиниць інвентарю', value: fmtNum(items.length) },
      { label: 'Середня вартість одиниці', value: fmtMoney(avgInvCost) },
      { label: 'Всього місяців з виплатами', value: fmtNum(payCount) }
    ];

    document.getElementById('summary').innerHTML = cells.map(c => `
      <div class="summary-item">
        <div class="summary-item__label">${c.label}</div>
        <div class="summary-item__value">${c.value}</div>
      </div>
    `).join('');
  }

  function setRange(r) {
    currentRange = r;
    document.querySelectorAll('.range-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.range === r);
    });
    render();
  }

  function render() {
    renderKPIs();
    destroyCharts();
    renderCharts();
    renderTop();
    renderQuality();
    renderAlerts();
    renderSummary();
  }

  function init() {
    if (window.NexusCore && NexusCore.requireModule && !NexusCore.requireModule('dashboard')) return;
    if (!initAuth()) return;
    initTheme();
    render();

    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', () => {
        if (localStorage.getItem(THEME_KEY) === 'auto') {
          setTimeout(() => { destroyCharts(); renderCharts(); }, 100);
        }
      });
    }
  }

  return { init, setRange, logout, render };
})();

window.Dash = Dash;

document.addEventListener('DOMContentLoaded', () => Dash.init());