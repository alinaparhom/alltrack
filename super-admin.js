(() => {
  const formatNumber = (value) => new Intl.NumberFormat('ru-RU').format(value);
  let createButtonInitialized = false;

  const buildStat = (label, value) =>
    `<div class="super-admin__stat"><span>${label}</span><strong>${value}</strong></div>`;

  const normalizeRole = (value = '') =>
    String(value)
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[‑–—]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();

  const isAdminRole = (value) => normalizeRole(value).includes('администратор');

  const normalizeFullName = (value = '') =>
    String(value)
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const getNodeAccessStore = () => {
    if (typeof window === 'undefined') {
      return null;
    }
    const nodeRequire =
      window.require || (typeof globalThis !== 'undefined' ? globalThis.require : undefined);
    const nodeProcess = window.process;
    if (!nodeRequire || !nodeProcess?.versions?.node) {
      return null;
    }
    const fs = nodeRequire('fs');
    const path = nodeRequire('path');
    const cwd = typeof nodeProcess.cwd === 'function' ? nodeProcess.cwd() : '.';
    return {
      fs,
      accessPath: path.join(cwd, 'access.json')
    };
  };

  const updateAccessJsonLocally = ({ organizationName, energyFullName }) => {
    const store = getNodeAccessStore();
    if (!store) {
      return { ok: false, reason: 'node-not-available' };
    }
    const { fs, accessPath } = store;
    const fallback = { superAdmins: [], organizations: {} };
    let accessData = fallback;
    if (fs.existsSync(accessPath)) {
      try {
        const raw = fs.readFileSync(accessPath, 'utf8');
        accessData = raw ? JSON.parse(raw) : fallback;
      } catch (error) {
        accessData = fallback;
      }
    }
    if (
      !accessData.organizations ||
      typeof accessData.organizations !== 'object' ||
      Array.isArray(accessData.organizations)
    ) {
      accessData.organizations = {};
    }
    const members = Array.isArray(accessData.organizations[organizationName])
      ? accessData.organizations[organizationName]
      : [];
    const normalizedTarget = normalizeFullName(energyFullName);
    const existingIndex = members.findIndex(
      (member) => normalizeFullName(member?.fullName) === normalizedTarget
    );
    if (existingIndex === -1) {
      members.push({ id: '', fullName: energyFullName, role: 'Энергетик' });
    } else if (members[existingIndex]?.id === undefined || members[existingIndex]?.id === null) {
      members[existingIndex].id = '';
    }
    accessData.organizations[organizationName] = members;
    try {
      fs.writeFileSync(accessPath, JSON.stringify(accessData, null, 2), 'utf8');
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error?.message || error };
    }
  };

  const buildOrganizationStats = (orgName, users = [], adminName, index) => {
    const userCount = users.length;
    const toolsTotal = Math.max(120, userCount * 24 + index * 31);
    const toolsCurrent = Math.max(40, Math.round(toolsTotal * 0.36));
    const toolsNoPhoto = Math.max(4, Math.round(toolsCurrent * (0.08 + (index % 3) * 0.04)));
    const feedbackTotal = Math.max(6, Math.round(userCount * 1.6 + index * 4));
    const feedbackDone = Math.max(1, feedbackTotal - (index % 4 + 1));
    return {
      name: orgName,
      admin: adminName || 'Не назначен',
      users: userCount,
      toolsTotal,
      toolsCurrent,
      toolsNoPhoto,
      feedbackTotal,
      feedbackDone
    };
  };

  const buildOrganizationsFromAccess = (accessData = {}) => {
    const organizations = accessData.organizations || {};
    return Object.entries(organizations).map(([name, users], index) => {
      const list = Array.isArray(users) ? users : [];
      const admin = list.find((member) => isAdminRole(member?.role));
      const adminName = admin?.fullName || admin?.full_name || admin?.name || admin?.fio || '';
      return buildOrganizationStats(name, list, adminName, index);
    });
  };

  const getShortName = (fullName = '') => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1]}`;
    }
    return fullName || '—';
  };

  const renderOrganizationCard = (org) => {
    const percent = org.toolsCurrent
      ? Math.round((org.toolsNoPhoto / org.toolsCurrent) * 100)
      : 0;
    return `
      <article class="super-admin__card glass">
        <div class="super-admin__card-head">
          <div>
            <h3>${org.name}</h3>
            <p>Админ: ${org.admin}</p>
          </div>
          <span class="super-admin__tag">${formatNumber(org.users)} чел.</span>
        </div>
        <div class="super-admin__stats">
          ${buildStat('Пользователи', formatNumber(org.users))}
          ${buildStat('Инструменты всего', formatNumber(org.toolsTotal))}
          ${buildStat('Инструменты сейчас', formatNumber(org.toolsCurrent))}
          ${buildStat('Без фото', `${formatNumber(org.toolsNoPhoto)} · ${percent}%`)}
          ${buildStat(
            'Обратная связь',
            `${formatNumber(org.feedbackDone)} / ${formatNumber(org.feedbackTotal)}`
          )}
        </div>
      </article>
    `;
  };

  const renderOrganizations = (container, organizations) => {
    if (!organizations.length) {
      container.innerHTML = `
        <article class="super-admin__card glass">
          <div class="super-admin__card-head">
            <div>
              <h3>Организаций нет</h3>
              <p>Добавьте первую организацию, чтобы начать работу.</p>
            </div>
          </div>
        </article>
      `;
      return;
    }
    container.innerHTML = organizations.map(renderOrganizationCard).join('');
  };

  const initCreateButton = () => {
    const openButton = document.getElementById('superAdminOpenCreate');
    const panel = document.getElementById('superAdminCreatePanel');
    const form = document.getElementById('superAdminCreateForm');
    const button = document.getElementById('superAdminCreateButton');
    const note = document.getElementById('superAdminCreateNote');
    const label = document.getElementById('superAdminCreateLabel');
    const orgNameInput = document.getElementById('superAdminOrgName');
    const energyNameInput = document.getElementById('superAdminEnergyName');
    const status = document.getElementById('superAdminCreateStatus');
    const details = document.getElementById('superAdminCreateDetails');
    const detailsText = document.getElementById('superAdminCreateDetailsText');
    const inviteLink = document.getElementById('superAdminInviteLink');
    const copyButton = document.getElementById('superAdminCopyLink');
    const shareButton = document.getElementById('superAdminShareLink');
    const botUsernameState = {
      value: '',
      loaded: false
    };

    if (createButtonInitialized || !openButton || !panel || !button || !note || !label) {
      return;
    }
    createButtonInitialized = true;

    const logAction = (level, message, payload = null) => {
      if (typeof window === 'undefined' || typeof window.logEvent !== 'function') {
        return;
      }
      window.logEvent(level, message, payload);
    };

    const getBotUsername = () => {
      if (botUsernameState.value) {
        return botUsernameState.value;
      }
      const rawUsername =
        window.ALLTRACK_BOT_USERNAME ||
        document.body?.dataset?.botUsername ||
        window.Telegram?.WebApp?.initDataUnsafe?.receiver?.username ||
        window.Telegram?.WebApp?.initDataUnsafe?.chat?.username ||
        '';
      return String(rawUsername).replace(/^@/, '').trim();
    };

    const loadBotUsername = async () => {
      if (botUsernameState.loaded) {
        return;
      }
      botUsernameState.loaded = true;
      try {
        const response = await fetch('./config');
        if (!response.ok) {
          throw new Error('config request failed');
        }
        const data = await response.json();
        if (data?.botUsername) {
          botUsernameState.value = String(data.botUsername).replace(/^@/, '').trim();
        }
        logAction('info', 'Конфигурация бота загружена', {
          hasBotUsername: Boolean(botUsernameState.value)
        });
      } catch (error) {
        logAction('warn', 'Не удалось загрузить конфигурацию бота', {
          message: error?.message || error
        });
      }
    };

    const buildInviteLink = (inviteId) => {
      const botUsername = getBotUsername();
      if (botUsername) {
        return `https://t.me/${botUsername}?startapp=${encodeURIComponent(inviteId)}`;
      }
      const inviteUrl = new URL(window.location.href);
      inviteUrl.searchParams.set('invite', inviteId);
      inviteUrl.searchParams.delete('startapp');
      inviteUrl.searchParams.delete('start_param');
      return inviteUrl.toString();
    };

    const setPanelState = (isOpen) => {
      panel.hidden = !isOpen;
      openButton.setAttribute('aria-expanded', String(isOpen));
      label.textContent = isOpen ? 'Свернуть создание' : 'Добавить организацию';
      if (isOpen) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      logAction('info', 'Панель создания организации переключена', { isOpen });
    };

    const setStatus = (message, state) => {
      if (!note || !status) {
        return;
      }
      note.hidden = false;
      status.textContent = message;
      if (state) {
        status.dataset.state = state;
      } else {
        delete status.dataset.state;
      }
    };

    const setDetails = (message) => {
      if (!details || !detailsText) {
        return;
      }
      const normalized = String(message || '').trim();
      if (!normalized) {
        details.hidden = true;
        details.removeAttribute('open');
        detailsText.textContent = '';
        return;
      }
      details.hidden = false;
      detailsText.textContent = normalized;
    };

    const setInviteLink = (value) => {
      if (!inviteLink) {
        return;
      }
      inviteLink.textContent = value || '—';
      inviteLink.href = value || '#';
      setShareAvailable(Boolean(value));
    };

    const setCopyAvailable = (available) => {
      if (!copyButton) {
        return;
      }
      copyButton.hidden = !available;
    };

    const setShareAvailable = (available) => {
      if (!shareButton) {
        return;
      }
      shareButton.hidden = !available;
    };

    const buildShareMessage = (linkToShare) =>
      `Откройте ссылку, чтобы подключиться к организации: ${linkToShare}`;

    const buildTelegramShareLink = (linkToShare) => {
      const message = buildShareMessage(linkToShare);
      return `https://t.me/share/url?url=${encodeURIComponent(
        linkToShare
      )}&text=${encodeURIComponent(message)}`;
    };

    let isCreating = false;

    const setCreateEnabled = (enabled) => {
      const isDisabled = !enabled || isCreating;
      button.disabled = isDisabled;
      button.setAttribute('aria-disabled', String(isDisabled));
      button.classList.toggle('is-disabled', isDisabled);
    };

    const updateCreateState = () => {
      const organizationName = orgNameInput?.value.trim();
      const energyFullName = energyNameInput?.value.trim();
      setCreateEnabled(Boolean(organizationName && energyFullName));
    };

    setPanelState(false);

    if (status) {
      status.textContent = 'Заполните данные и нажмите кнопку, чтобы получить ссылку.';
      delete status.dataset.state;
    }
    setDetails('');
    setInviteLink('');
    setCopyAvailable(false);
    setShareAvailable(false);
    updateCreateState();
    loadBotUsername();
    openButton.addEventListener('click', () => {
      setPanelState(panel.hidden);
      updateCreateState();
    });

    const normalizeWhitespace = (value = '') => value.replace(/\s+/g, ' ').trim();

    const truncateText = (value = '', maxLength = 220) => {
      if (!value) {
        return '';
      }
      if (value.length <= maxLength) {
        return value;
      }
      return `${value.slice(0, maxLength).trim()}…`;
    };

    const extractHtmlError = (rawText) => {
      if (!/<html/i.test(rawText)) {
        return '';
      }
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawText, 'text/html');
        const title = doc.querySelector('title')?.textContent || '';
        const bodyText = doc.body?.textContent || '';
        const merged = normalizeWhitespace([title, bodyText].filter(Boolean).join(' — '));
        return truncateText(merged);
      } catch (error) {
        return truncateText(normalizeWhitespace(String(rawText).replace(/<[^>]+>/g, ' ')));
      }
    };

    const parseErrorText = (rawText) => {
      if (!rawText) {
        return '';
      }
      const trimmed = String(rawText).trim();
      if (!trimmed) {
        return '';
      }
      const htmlDetails = extractHtmlError(trimmed);
      if (htmlDetails) {
        return htmlDetails;
      }
      try {
        const parsed = JSON.parse(trimmed);
        const message = parsed?.message ? String(parsed.message) : '';
        const details = parsed?.details ? String(parsed.details) : '';
        const error = parsed?.error ? String(parsed.error) : '';
        const reason = parsed?.reason ? String(parsed.reason) : '';
        const step = parsed?.step ? String(parsed.step) : '';
        const code = parsed?.code ? String(parsed.code) : '';
        const path = parsed?.path ? String(parsed.path) : '';
        const systemCode = parsed?.systemCode ? String(parsed.systemCode) : '';
        const combined = [message, details, error, reason].filter(Boolean).join(' · ');
        const meta = [
          step && `этап: ${step}`,
          code && `код: ${code}`,
          systemCode && `системный код: ${systemCode}`,
          path && `путь: ${path}`
        ]
          .filter(Boolean)
          .join(', ');
        if (combined && meta) {
          return `${combined} (${meta})`;
        }
        if (combined) {
          return combined;
        }
        if (meta) {
          return meta;
        }
      } catch (error) {
        return trimmed;
      }
      return trimmed;
    };

    const formatCreateError = ({
      status,
      statusText,
      body,
      details,
      endpoint,
      method,
      endpoints
    }) => {
      const baseLabel = status
        ? `Ошибка сервиса (HTTP ${status}${statusText ? ` ${statusText}` : ''})`
        : 'Ошибка сервиса';
      const requestLine = endpoint ? `Запрос: ${method || 'POST'} ${endpoint}.` : '';
      const routesLine =
        Array.isArray(endpoints) && endpoints.length
          ? `Проверенные маршруты: ${endpoints.join(', ')}.`
          : '';
      const hint =
        status === 404
          ? `Причина: маршрут создания организации не найден. Проверьте настройки сервера и прокси (nginx), а также совпадение путей.`
          : status === 405
            ? 'Причина: метод запроса запрещён. Проверьте, что сервер принимает POST.'
            : status === 401 || status === 403
              ? 'Причина: нет доступа. Проверьте авторизацию и права супер-администратора.'
              : '';
      const normalizedBody = parseErrorText(body);
      const detailMessage = details || normalizedBody;
      const detailLine = detailMessage
        ? `Подробности: ${detailMessage}.`
        : 'Подробности: нет ответа от сервера.';
      const stageLine = 'Этап: создание организации и получение ссылки.';
      return `${baseLabel}. ${detailLine} ${stageLine} ${requestLine} ${routesLine} ${hint}`.trim();
    };

    const formatCreateErrorDetails = ({
      status,
      statusText,
      body,
      endpoint,
      method,
      endpoints
    }) => {
      const lines = [];
      if (status) {
        lines.push(`HTTP статус: ${status}${statusText ? ` ${statusText}` : ''}`);
      }
      if (endpoint) {
        lines.push(`Запрос: ${method || 'POST'} ${endpoint}`);
      }
      if (Array.isArray(endpoints) && endpoints.length) {
        lines.push(`Проверенные маршруты: ${endpoints.join(', ')}`);
      }
      if (body) {
        lines.push(`Ответ сервера: ${parseErrorText(body) || String(body).trim()}`);
      }
      return lines.join('\n');
    };

    const seedAccessOrganization = async (payload) => {
      const endpoints = [
        './create-organization-step-1',
        './api/create-organization-step-1'
      ];
      let lastError = '';
      for (const endpoint of endpoints) {
        const apiUrl = new URL(endpoint, window.location.origin).toString();
        let response;
        logAction('info', 'Пробуем обновить access.json (шаг 1.1)', {
          endpoint: apiUrl,
          organizationName: payload?.organizationName,
          energyFullName: payload?.energyFullName
        });
        try {
          response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch (error) {
          lastError = `не удалось подключиться (${error?.message || error}).`;
          logAction('warn', 'Не удалось выполнить запрос шага 1.1', {
            endpoint: apiUrl,
            message: error?.message || error
          });
          continue;
        }
        if (response.ok) {
          logAction('info', 'access.json обновлён через сервер (шаг 1.1)', {
            endpoint: apiUrl,
            status: response.status
          });
          return { ok: true, source: 'server', endpoint: apiUrl };
        }
        const errorText = await response.text();
        lastError = parseErrorText(errorText) || errorText || `HTTP ${response.status}`;
        logAction('warn', 'Сервер шага 1.1 вернул ошибку', {
          endpoint: apiUrl,
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        if (response.status === 404) {
          continue;
        }
        return { ok: false, source: 'server', endpoint: apiUrl, reason: lastError };
      }
      return { ok: false, source: 'server', reason: lastError || 'Маршрут шага 1.1 недоступен.' };
    };

    const getCreateOrganizationResponse = async (payload) => {
      const endpoints = [
        './create-organizations',
        './api/create-organizations',
        './create-organization',
        './api/create-organization'
      ];
      let lastError = '';
      for (const endpoint of endpoints) {
        const apiUrl = new URL(endpoint, window.location.origin).toString();
        let response;
        logAction('info', 'Пробуем создать организацию', {
          endpoint: apiUrl,
          organizationName: payload?.organizationName,
          energyFullName: payload?.energyFullName
        });
        try {
          response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch (error) {
          lastError = formatCreateError({
            details: `не удалось подключиться (${error?.message || error}).`,
            endpoint: apiUrl,
            method: 'POST',
            endpoints
          });
          logAction('error', 'Не удалось выполнить запрос создания организации', {
            endpoint: apiUrl,
            message: error?.message || error
          });
          const enrichedError = new Error(lastError);
          enrichedError.details = formatCreateErrorDetails({
            body: error?.message || error,
            endpoint: apiUrl,
            method: 'POST',
            endpoints
          });
          if (endpoint === endpoints[endpoints.length - 1]) {
            throw enrichedError;
          }
          continue;
        }
        if (response.ok) {
          logAction('info', 'Ответ сервиса создания организации', {
            endpoint: apiUrl,
            status: response.status,
            statusText: response.statusText
          });
          return response;
        }
        const errorText = await response.text();
        lastError = formatCreateError({
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          endpoint: apiUrl,
          method: 'POST',
          endpoints
        });
        logAction('warn', 'Сервис создания организации вернул ошибку', {
          endpoint: apiUrl,
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        const enrichedError = new Error(lastError);
        enrichedError.details = formatCreateErrorDetails({
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          endpoint: apiUrl,
          method: 'POST',
          endpoints
        });
        if (response.status === 404) {
          continue;
        }
        throw enrichedError;
      }
      const fallbackError = new Error(lastError || 'Сервис создания организации недоступен.');
      fallbackError.details = formatCreateErrorDetails({
        body: lastError || 'Сервис создания организации недоступен.',
        endpoints
      });
      throw fallbackError;
    };

    const encodeInvitePayload = (payload) => {
      const json = JSON.stringify(payload);
      if (typeof TextEncoder !== 'undefined') {
        const bytes = new TextEncoder().encode(json);
        let binary = '';
        bytes.forEach((byte) => {
          binary += String.fromCharCode(byte);
        });
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      }
      return btoa(unescape(encodeURIComponent(json)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    };

    const buildLocalInviteLink = ({ organizationName, energyFullName }) => {
      const payload = {
        organizationName,
        energyFullName,
        createdAt: new Date().toISOString()
      };
      const inviteId = `direct-${encodeInvitePayload(payload)}`;
      return { inviteId, inviteLink: buildInviteLink(inviteId) };
    };

    const readCreateOrganizationResult = async (response) => {
      const rawText = await response.text();
      try {
        return JSON.parse(rawText);
      } catch (error) {
        const message = formatCreateError({
          status: response?.status,
          statusText: response?.statusText,
          body: rawText,
          details: 'ответ не является JSON.',
          method: 'POST'
        });
        const enrichedError = new Error(message);
        enrichedError.details = formatCreateErrorDetails({
          status: response?.status,
          statusText: response?.statusText,
          body: rawText,
          method: 'POST'
        });
        throw enrichedError;
      }
    };

    const isValidationError = (errorMessage = '') =>
      /уже существует|заполните|некорректн/i.test(errorMessage);

    const shouldFallbackToLocalInvite = (errorMessage = '') => !isValidationError(errorMessage);

    const createOrganization = async () => {
      if (!orgNameInput || !energyNameInput) {
        setStatus('Не удалось найти поля формы. Обновите страницу.', 'error');
        logAction('error', 'Форма создания организации не найдена');
        return;
      }
      const organizationName = orgNameInput.value.trim();
      const energyFullName = energyNameInput.value.trim();
      if (!organizationName || !energyFullName) {
        setStatus('Заполните название организации и ФИО энергетика.', 'error');
        setInviteLink('');
        setCopyAvailable(false);
        updateCreateState();
        logAction('warn', 'Попытка создать организацию с пустыми данными', {
          organizationName,
          energyFullName
        });
        return;
      }
      let accessResult = await seedAccessOrganization({ organizationName, energyFullName });
      if (!accessResult.ok) {
        const localResult = updateAccessJsonLocally({ organizationName, energyFullName });
        if (localResult.ok) {
          accessResult = { ok: true, source: 'local' };
          logAction('info', 'Организация добавлена в access.json локально (шаг 1.1)', {
            organizationName,
            energyFullName
          });
        } else {
          accessResult = {
            ok: false,
            source: 'local',
            reason: localResult.reason || accessResult.reason
          };
          logAction('warn', 'Не удалось обновить access.json (шаг 1.1)', {
            organizationName,
            energyFullName,
            reason: accessResult.reason
          });
        }
      }
      isCreating = true;
      setCreateEnabled(false);
      button.textContent = 'Создаём...';
      setStatus('Создаём организацию и ссылку приглашения...', 'success');
      setInviteLink('');
      setCopyAvailable(false);
      setDetails('');
      await loadBotUsername();
      logAction('info', 'Запрос создания организации отправлен', {
        organizationName,
        energyFullName
      });
      const localInvite = buildLocalInviteLink({ organizationName, energyFullName });
      try {
        const response = await getCreateOrganizationResponse({
          organizationName,
          organizations: organizationName,
          energyFullName
        });
        const result = await readCreateOrganizationResult(response);
        const inviteUrl =
          result.inviteLink ||
          (result.inviteId ? buildInviteLink(result.inviteId) : localInvite.inviteLink);
        setInviteLink(inviteUrl || '');
        setCopyAvailable(Boolean(inviteUrl));
        if (!result.inviteId && !result.inviteLink) {
          setStatus('Ссылка готова локально — отправьте её энергетику.', 'success');
          setDetails('');
          logAction('warn', 'Ответ сервиса без данных, ссылка создана локально', {
            organizationName,
            energyFullName,
            inviteId: localInvite.inviteId,
            inviteLink: localInvite.inviteLink
          });
        } else {
          setStatus('Ссылка готова — отправьте её энергетику.', 'success');
          setDetails('');
        }
        logAction('info', 'Организация создана, ссылка готова', {
          organizationName,
          inviteId: result.inviteId,
          inviteLink: inviteUrl
        });
      } catch (error) {
        const errorMessage = error?.message || 'Не удалось создать организацию.';
        const errorDetails = error?.details || '';
        if (shouldFallbackToLocalInvite(errorMessage)) {
          setInviteLink(localInvite.inviteLink);
          setCopyAvailable(Boolean(localInvite.inviteLink));
          const accessNote = accessResult.ok
            ? 'Организация записана в access.json.'
            : 'Не удалось записать организацию в access.json.';
          setStatus(
            `Сервис недоступен (${errorMessage}). ${accessNote} Ссылка готова локально — отправьте её энергетику.`,
            'success'
          );
          const details = [errorDetails || errorMessage];
          if (!accessResult.ok && accessResult.reason) {
            details.push(`Причина записи access.json: ${accessResult.reason}`);
          }
          setDetails(details.filter(Boolean).join('\n'));
          logAction('warn', 'Ссылка создана локально из-за сбоя сервиса', {
            organizationName,
            energyFullName,
            inviteId: localInvite.inviteId,
            inviteLink: localInvite.inviteLink,
            message: errorMessage,
            details: errorDetails,
            accessJson: accessResult
          });
        } else {
          setStatus(errorMessage, 'error');
          setDetails(errorDetails || errorMessage);
          logAction('error', 'Ошибка создания организации', {
            organizationName,
            energyFullName,
            message: errorMessage,
            details: errorDetails
          });
        }
      } finally {
        isCreating = false;
        updateCreateState();
        button.textContent = 'Создать организацию';
      }
    };

    const handleSubmit = (event) => {
      if (event) {
        event.preventDefault();
      }
      createOrganization();
    };

    button.addEventListener('click', handleSubmit);
    if (form) {
      form.addEventListener('submit', handleSubmit);
      form.addEventListener('input', updateCreateState);
      form.addEventListener('change', updateCreateState);
    }
    if (orgNameInput) {
      orgNameInput.addEventListener('input', updateCreateState);
      orgNameInput.addEventListener('blur', updateCreateState);
    }
    if (energyNameInput) {
      energyNameInput.addEventListener('input', updateCreateState);
      energyNameInput.addEventListener('blur', updateCreateState);
    }

    if (copyButton) {
      copyButton.addEventListener('click', async () => {
        if (!inviteLink || inviteLink.textContent === '—') {
          return;
        }
        try {
          await navigator.clipboard.writeText(inviteLink.textContent);
          setStatus('Ссылка скопирована. Можно отправлять энергетику.', 'success');
          logAction('info', 'Ссылка приглашения скопирована', {
            inviteLink: inviteLink.textContent
          });
        } catch (error) {
          setStatus('Не удалось скопировать ссылку. Скопируйте вручную.', 'error');
          logAction('error', 'Ошибка копирования ссылки приглашения', {
            message: error?.message || error
          });
        }
      });
    }

    if (shareButton) {
      shareButton.addEventListener('click', async () => {
        if (!inviteLink || inviteLink.textContent === '—') {
          return;
        }
        const linkToShare = inviteLink.textContent;
        const shareData = {
          title: 'Ссылка для энергетика',
          text: buildShareMessage(linkToShare),
          url: linkToShare
        };
        try {
          const telegramUrl = buildTelegramShareLink(linkToShare);
          const tgWebApp = window.Telegram?.WebApp;
          if (tgWebApp?.openTelegramLink) {
            tgWebApp.openTelegramLink(telegramUrl);
            setStatus('Открылся Telegram для выбора контакта и отправки ссылки.', 'success');
            logAction('info', 'Открыт Telegram WebApp share', {
              inviteLink: linkToShare
            });
            return;
          }
          if (navigator.share) {
            await navigator.share(shareData);
            setStatus('Открылся выбор контакта или приложения (Telegram).', 'success');
            logAction('info', 'Открыт системный выбор контакта для ссылки', {
              inviteLink: linkToShare
            });
            return;
          }
          window.open(telegramUrl, '_blank', 'noopener,noreferrer');
          setStatus('Открылся Telegram для отправки ссылки.', 'success');
          logAction('info', 'Открыт Telegram share для ссылки', {
            inviteLink: linkToShare
          });
        } catch (error) {
          setStatus('Не удалось открыть Telegram. Скопируйте ссылку вручную.', 'error');
          logAction('error', 'Ошибка при попытке отправить ссылку', {
            message: error?.message || error,
            inviteLink: linkToShare
          });
        }
      });
    }
  };

  window.initSuperAdminWorkspace = ({ fullName, accessData } = {}) => {
    const panel = document.getElementById('superAdminPanel');
    const nameField = document.getElementById('superAdminName');
    const shortNameField = document.getElementById('superAdminShortName');
    const list = document.getElementById('superAdminOrgs');
    const count = document.getElementById('superAdminCount');
    const defaultWorkspace = document.getElementById('defaultWorkspace');

    if (!panel || !list) {
      return;
    }

    if (nameField) {
      nameField.textContent = fullName || '—';
    }

    if (shortNameField) {
      shortNameField.textContent = getShortName(fullName);
    }

    const organizations = buildOrganizationsFromAccess(accessData);
    if (count) {
      count.textContent = formatNumber(organizations.length);
    }

    renderOrganizations(list, organizations);
    panel.hidden = false;

    initCreateButton();

    if (defaultWorkspace) {
      defaultWorkspace.hidden = true;
    }
  };

  window.resetSuperAdminWorkspace = () => {
    const panel = document.getElementById('superAdminPanel');
    const defaultWorkspace = document.getElementById('defaultWorkspace');

    if (panel) {
      panel.hidden = true;
    }
    if (defaultWorkspace) {
      defaultWorkspace.hidden = false;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCreateButton);
  } else {
    initCreateButton();
  }
})();
