(() => {
  'use strict';

  const MAX_FILE_BYTES = 10 * 1024 * 1024;
  const MAX_FILES = 6;
  const MIME_BY_EXT = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png'
  };
  const ALLOWED_EXT = new Set(Object.keys(MIME_BY_EXT));

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function asMessage(error) {
    return String(error && (error.message || error) || 'Невідома помилка');
  }

  function selectedFiles() {
    const resume = document.getElementById('guest-resume');
    const docs = document.getElementById('guest-documents');
    return [
      ...(resume && resume.files ? Array.from(resume.files) : []),
      ...(docs && docs.files ? Array.from(docs.files) : [])
    ];
  }

  function validateFiles(files) {
    if (files.length > MAX_FILES) throw new Error('Можна додати не більше 6 файлів разом із резюме.');
    files.forEach(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXT.has(ext)) throw new Error('Недозволений формат файлу: ' + file.name);
      if (file.size > MAX_FILE_BYTES) throw new Error('Файл «' + file.name + '» перевищує 10 МБ.');
    });
  }

  function setStatus(message, kind) {
    const status = document.getElementById('guest-status');
    if (!status) return;
    status.textContent = message;
    status.className = 'guest-status' + (kind ? ' ' + kind : '');
  }

  async function guestSession(client) {
    const { data: current, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (current.session && current.session.user && current.session.user.is_anonymous) {
      return current.session.user;
    }
    const { data, error } = await client.auth.signInAnonymously();
    if (error) throw error;
    if (!data.user || !data.session) throw new Error('Не вдалося створити гостьовий сеанс.');
    return data.user;
  }

  async function submit(event) {
    event.preventDefault();
    const client = window.nexusGuestSupabase;
    const form = document.getElementById('guest-application-form');
    const button = document.getElementById('guest-submit');
    if (!client || !form) {
      setStatus('Гостьовий модуль не підключений до Supabase.', 'error');
      return;
    }
    if (document.getElementById('guest-website').value) {
      setStatus('Не вдалося надіслати анкету.', 'error');
      return;
    }
    const files = selectedFiles();
    const uploaded = [];
    let submissionResponseReceived = false;
    button.disabled = true;
    setStatus('Надсилання анкети та документів…');
    try {
      validateFiles(files);
      const user = await guestSession(client);
      const applicationId = crypto.randomUUID();
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop().toLowerCase();
        const path = user.id + '/' + applicationId + '/' + crypto.randomUUID() + '.' + ext;
        const { error } = await client.storage.from('guest-applications').upload(path, file, {
          contentType: MIME_BY_EXT[ext],
          upsert: false
        });
        if (error) throw error;
        uploaded.push({
          path,
          name: file.name,
          size: file.size,
          type: MIME_BY_EXT[ext]
        });
      }

      const payload = {
        p_id: applicationId,
        p_full_name: document.getElementById('guest-name').value.trim(),
        p_phone: document.getElementById('guest-phone').value.trim(),
        p_email: document.getElementById('guest-email').value.trim() || null,
        p_message: document.getElementById('guest-message').value.trim() || null,
        p_consent: document.getElementById('guest-consent').checked,
        p_files: uploaded
      };
      const { error } = await client.rpc('nexus_submit_guest_application', payload);
      submissionResponseReceived = true;
      if (error) throw error;
      form.reset();
      setStatus('Дякуємо! Анкету надіслано до відділу HR. Ми зв’яжемося з вами за вказаними контактами.', 'success');
    } catch (error) {
      if (uploaded.length && submissionResponseReceived) {
        const { error: cleanupError } = await client.storage.from('guest-applications')
          .remove(uploaded.map(file => file.path));
        if (cleanupError) console.error('[NEXUS guest] Не вдалося прибрати незбережені файли:', cleanupError);
      } else if (uploaded.length) {
        console.warn('[NEXUS guest] Не видаляю файли після невизначеної відповіді submit; перевірте чергу HR перед повторною відправкою.');
      }
      console.error('[NEXUS guest] Не вдалося надіслати анкету:', error);
      setStatus('Не вдалося надіслати анкету: ' + asMessage(error), 'error');
    } finally {
      button.disabled = false;
    }
  }

  function initGuestForm() {
    const form = document.getElementById('guest-application-form');
    if (form) form.addEventListener('submit', submit);
  }

  function esc(value) {
    return escapeHtml(value);
  }

  async function listApplications(client) {
    const { data, error } = await client.rpc('nexus_list_guest_applications');
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  function statusLabel(status) {
    return ({
      new: 'Нова',
      reviewing: 'На розгляді',
      accepted: 'Запрошено',
      rejected: 'Відмовлено'
    })[status] || status;
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('uk-UA');
  }

  async function loadHrInbox() {
    const client = window.nexusSupabase;
    const status = document.getElementById('guest-applications-status');
    const list = document.getElementById('guest-applications-list');
    const setup = document.getElementById('guest-applications-setup');
    const detail = document.getElementById('guest-application-detail');
    if (!client || !list || !status) return;
    if (window.Auth && Auth.can && !Auth.can('read')) {
      status.textContent = 'Для перегляду потрібен доступ до HR.';
      return;
    }
    if (setup && window.Auth && Auth.can) setup.hidden = !Auth.can('edit');
    status.textContent = 'Завантаження анкет…';
    detail.innerHTML = '';
    list.innerHTML = '';
    try {
      const { data: config, error: configError } = await client.rpc('nexus_guest_application_settings');
      if (configError) throw configError;
      if (!config || !config.configured) {
        status.textContent = 'Прийом анкет ще не налаштований для цієї компанії.';
        list.innerHTML = '';
        return;
      }
      if (setup) setup.hidden = true;
      const applications = await listApplications(client);
      status.textContent = applications.length
        ? 'Анкет: ' + applications.length
        : 'Поки що гостьових анкет немає.';
      if (!applications.length) return;

      list.innerHTML = '<div style="overflow-x:auto"><table class="dt"><thead><tr>' +
        '<th>Кандидат</th><th>Контакти</th><th>Надіслано</th><th>Статус</th><th></th>' +
        '</tr></thead><tbody>' + applications.map(item =>
          '<tr>' +
          '<td><b>' + esc(item.full_name) + '</b></td>' +
          '<td>' + esc(item.phone) + (item.email ? '<div class="tsm">' + esc(item.email) + '</div>' : '') + '</td>' +
          '<td>' + esc(formatDate(item.created_at)) + '</td>' +
          '<td><select class="guest-status-select" data-candidate-id="' + esc(item.id) + '">' +
          ['new', 'reviewing', 'accepted', 'rejected'].map(value =>
            '<option value="' + value + '"' + (item.status === value ? ' selected' : '') + '>' + esc(statusLabel(value)) + '</option>'
          ).join('') + '</select></td>' +
          '<td><button type="button" class="btn bs bxs guest-detail-button" data-candidate-id="' + esc(item.id) + '">Переглянути</button></td>' +
          '</tr>'
        ).join('') + '</tbody></table></div>';

      list.querySelectorAll('.guest-status-select').forEach(select =>
        select.addEventListener('change', () => updateStatus(client, select))
      );
      list.querySelectorAll('.guest-detail-button').forEach(button =>
        button.addEventListener('click', () => showDetails(client, applications.find(x => x.id === button.dataset.candidateId)))
      );
    } catch (error) {
      console.error('[NEXUS HR] Не вдалося завантажити анкети кандидатів:', error);
      status.textContent = 'Не вдалося завантажити анкети: ' + asMessage(error);
    }
  }

  async function updateStatus(client, select) {
    select.disabled = true;
    try {
      const { error } = await client.rpc('nexus_update_guest_application_status', {
        p_id: select.dataset.candidateId,
        p_status: select.value
      });
      if (error) throw error;
    } catch (error) {
      console.error('[NEXUS HR] Не вдалося змінити статус анкети:', error);
      alert('Не вдалося змінити статус: ' + asMessage(error));
      await loadHrInbox();
    } finally {
      select.disabled = false;
    }
  }

  async function showDetails(client, application) {
    const detail = document.getElementById('guest-application-detail');
    if (!detail || !application) return;
    detail.innerHTML = '<div class="tm">Завантаження деталей та документів…</div>';
    try {
      const files = Array.isArray(application.files) ? application.files : [];
      const links = await Promise.all(files.map(async file => {
        const { data, error } = await client.storage.from('guest-applications').createSignedUrl(file.path, 300);
        if (error) throw error;
        return '<li><a href="' + esc(data.signedUrl) + '" target="_blank" rel="noopener noreferrer">' +
          esc(file.name || 'Документ') + '</a> <span class="tsm">(' + Math.ceil((Number(file.size) || 0) / 1024) + ' KB)</span></li>';
      }));
      detail.innerHTML =
        '<div class="c"><div class="ch"><div class="ct">' + esc(application.full_name) + '</div>' +
        '<button type="button" class="btn bs bsm" id="guest-detail-close">Закрити</button></div>' +
        '<div><b>Телефон:</b> ' + esc(application.phone) +
        (application.email ? '<br><b>Email:</b> ' + esc(application.email) : '') +
        '<br><b>Надіслано:</b> ' + esc(formatDate(application.created_at)) +
        '<br><b>Повідомлення:</b><p style="white-space:pre-wrap;margin:8px 0">' + esc(application.message || '—') + '</p>' +
        '<b>Файли:</b>' + (links.length ? '<ul>' + links.join('') + '</ul>' : '<div class="tsm">Файли не додані.</div>') +
        '</div></div>';
      document.getElementById('guest-detail-close').addEventListener('click', () => { detail.innerHTML = ''; });
    } catch (error) {
      console.error('[NEXUS HR] Не вдалося відкрити документи кандидата:', error);
      detail.innerHTML = '<div class="tm">Не вдалося відкрити документи: ' + esc(asMessage(error)) + '</div>';
    }
  }

  async function configureHrInbox() {
    const client = window.nexusSupabase;
    if (!client) return;
    const button = document.getElementById('guest-applications-setup');
    const status = document.getElementById('guest-applications-status');
    button.disabled = true;
    try {
      const { error } = await client.rpc('nexus_configure_guest_applications');
      if (error) throw error;
      await loadHrInbox();
    } catch (error) {
      console.error('[NEXUS HR] Не вдалося підключити гостьовий прийом анкет:', error);
      status.textContent = 'Не вдалося підключити прийом анкет: ' + asMessage(error);
    } finally {
      button.disabled = false;
    }
  }

  function initHrInbox() {
    if (!document.getElementById('guest-applications-list')) return;
    document.getElementById('guest-applications-refresh')
      .addEventListener('click', loadHrInbox);
    document.getElementById('guest-applications-setup')
      .addEventListener('click', configureHrInbox);
    document.querySelectorAll('.nb[data-tab="candidates"]').forEach(button =>
      button.addEventListener('click', loadHrInbox)
    );
    if (location.hash === '#candidates') loadHrInbox();
  }

  const guestPage = document.getElementById('guest-application-form');
  if (guestPage) initGuestForm();
  else initHrInbox();
})();
