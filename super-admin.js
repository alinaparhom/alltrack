(() => {
  const formatNumber = (value) => new Intl.NumberFormat('ru-RU').format(value);
  let currentOrganizations = [];
  let createPanelInitialized = false;

  const buildStat = (label, value) =>
    `<div class="super-admin__stat"><span>${label}</span><strong>${value}</strong></div>`;

  const normalizeRole = (value = '') =>
    String(value)
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[‑–—]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();

  const normalizeFullName = (value = '') =>
    String(value)
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const isAdminRole = (value) => normalizeRole(value).includes('администратор');

  const getOrganizationMembers = (entry) => {
    if (Array.isArray(entry)) {
      return entry;
    }
    if (entry && typeof entry === 'object') {
      if (Array.isArray(entry.users)) {
        return entry.users;
      }
      if (Array.isArray(entry.members)) {
        return entry.members;
      }
      if (Array.isArray(entry.list)) {
        return entry.list;
      }
    }
    return [];
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
      const list = getOrganizationMembers(users);
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

  const updateDashboardCounters = (organizations = []) => {
    const orgTotal = organizations.length;
    const userTotal = organizations.reduce((sum, org) => sum + (org.users || 0), 0);
    const feedbackPending = organizations.reduce((sum, org) => {
      const total = org.feedbackTotal || 0;
      const done = org.feedbackDone || 0;
      return sum + Math.max(0, total - done);
    }, 0);
    const incidentTotal = Math.max(0, Math.round(userTotal / 90));

    const orgTotalField = document.getElementById('superAdminOrgTotal');
    const userTotalField = document.getElementById('superAdminUserTotal');
    const feedbackTotalField = document.getElementById('superAdminFeedbackTotal');
    const incidentTotalField = document.getElementById('superAdminIncidentTotal');

    if (orgTotalField) {
      orgTotalField.textContent = formatNumber(orgTotal);
    }
    if (userTotalField) {
      userTotalField.textContent = formatNumber(userTotal);
    }
    if (feedbackTotalField) {
      feedbackTotalField.textContent = formatNumber(feedbackPending);
    }
    if (incidentTotalField) {
      incidentTotalField.textContent = formatNumber(incidentTotal);
    }
  };

  const safeLogEvent = (level, message, payload = null) => {
    if (typeof window !== 'undefined' && typeof window.logEvent === 'function') {
      window.logEvent(level, message, payload);
    }
  };

  const buildApiUrl = (path) => {
    if (typeof window === 'undefined' || !window.location) {
      return path;
    }
    try {
      if (/^https?:\/\//i.test(path)) {
        return path;
      }
      const base = window.location.href;
      const normalizedPath = path.replace(/^\.?\//, '');
      return new URL(path.startsWith('/') ? path : normalizedPath, base).toString();
    } catch (error) {
      return path;
    }
  };

  const buildEndpointVariants = (path) => {
    if (typeof window === 'undefined' || !window.location || /^https?:\/\//i.test(path)) {
      return [path];
    }
    const normalizedPath = path.replace(/^\.?\//, '');
    const originBase = window.location.origin || window.location.href;
    const originUrl = new URL(`/${normalizedPath}`, originBase).toString();
    const currentUrl = buildApiUrl(path);
    return Array.from(new Set([originUrl, currentUrl]));
  };

  const CREATE_ORG_ENDPOINTS = Array.from(
    new Set([
      '/api/create-organization',
      '/create-organization',
      '/api/create-organizations',
      '/create-organizations',
      'api/create-organization',
      'create-organization',
      'api/create-organizations',
      'create-organizations'
    ])
  );

  const postCreateOrganization = async (payload) => {
    const body = JSON.stringify(payload);
    const fetchWithLogging =
      typeof window !== 'undefined' && typeof window.fetchWithLogging === 'function'
        ? window.fetchWithLogging
        : null;
    const requestId = `super-admin-create-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const endpoints = Array.from(
      new Set(CREATE_ORG_ENDPOINTS.flatMap((endpoint) => buildEndpointVariants(endpoint)))
    );
    let lastError = null;

    for (const endpoint of endpoints) {
      const endpointLabel = `create-organization:${endpoint}`;
      safeLogEvent('info', 'Супер-админ: отправка запроса на создание организации', {
        requestId,
        url: endpoint,
        payload
      });
      const response = fetchWithLogging
        ? await fetchWithLogging(endpointLabel, endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
          })
        : await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
          });
      const rawText = await response.text();
      let data = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch (error) {
        data = rawText;
      }
      if (!response.ok) {
        const message =
          typeof data === 'string'
            ? data
            : data?.message || `Ошибка сохранения (${response.status})`;
        const error = new Error(message);
        error.details = typeof data === 'string' ? null : data;
        error.status = response.status;
        safeLogEvent(
          'warn',
          'Супер-админ: ошибка ответа сервера при создании организации',
          {
            status: response.status,
            requestId,
            url: endpoint,
            response: data
          }
        );
        lastError = error;
        if (![404, 405].includes(response.status)) {
          throw error;
        }
        continue;
      }
      safeLogEvent('info', 'Супер-админ: ответ сервера при создании организации', {
        status: response.status,
        requestId,
        url: endpoint,
        response: data || rawText
      });
      return data || { ok: true };
    }

    if (lastError) {
      throw lastError;
    }
    const fallbackError = new Error('Не удалось обратиться к серверу создания организации.');
    fallbackError.status = 404;
    throw fallbackError;
  };

  const fetchAccessSnapshot = async () => {
    const url = buildApiUrl('/access.json');
    const fetchWithLogging =
      typeof window !== 'undefined' && typeof window.fetchWithLogging === 'function'
        ? window.fetchWithLogging
        : null;
    const response = fetchWithLogging
      ? await fetchWithLogging('load-access-snapshot', url, { cache: 'no-store' })
      : await fetch(url, { cache: 'no-store' });
    const rawText = await response.text();
    let data = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch (error) {
      data = rawText;
    }
    if (!response.ok || typeof data !== 'object' || !data) {
      const message =
        typeof data === 'string'
          ? data
          : data?.message || `Ошибка загрузки access.json (${response.status})`;
      const error = new Error(message);
      error.details = typeof data === 'string' ? null : data;
      error.status = response.status;
      throw error;
    }
    return data;
  };

  const verifyAccessSaved = async ({ organizationName, shortName, energyFullName }) => {
    const accessData = await fetchAccessSnapshot();
    const entry = accessData.organizations?.[organizationName];
    if (!entry) {
      const error = new Error('Организация не найдена в access.json.');
      error.details = { organizationName };
      throw error;
    }
    const members = getOrganizationMembers(entry);
    const normalizedEnergy = normalizeFullName(energyFullName);
    const hasEnergy = members.some(
      (member) =>
        normalizeFullName(member?.fullName) === normalizedEnergy &&
        normalizeRole(member?.role).includes('энергетик') &&
        member?.id === ''
    );
    const storedShortName = entry.shortName || entry.short_name || '';
    const shortNameOk = shortName ? storedShortName === shortName : Boolean(storedShortName);
    if (!hasEnergy || !shortNameOk) {
      const error = new Error('Запись access.json не совпадает с введёнными данными.');
      error.details = {
        organizationName,
        energyFullName,
        storedShortName,
        expectedShortName: shortName,
        membersCount: members.length
      };
      throw error;
    }
    return entry;
  };

  const getReadableErrorDetails = (error) => {
    if (!error) {
      return '';
    }
    const directDetails = error?.details;
    if (typeof directDetails === 'string') {
      return directDetails;
    }
    if (directDetails && typeof directDetails === 'object') {
      const knownKeys = ['details', 'message', 'error', 'description', 'info'];
      for (const key of knownKeys) {
        if (typeof directDetails[key] === 'string' && directDetails[key].trim()) {
          return directDetails[key].trim();
        }
      }
    }
    return '';
  };

  const buildCreatePreview = ({ fullName, shortName, energyLead, schemeLabel }) => {
    if (!fullName && !shortName && !energyLead) {
      return 'Здесь появится краткая карточка новой организации.';
    }
    const nameLine = fullName ? `«${fullName}»` : 'Название не указано';
    const shortLine = shortName ? `Коротко: ${shortName}` : 'Короткое название не указано';
    const energyLine = energyLead ? `Энергетик: ${energyLead}` : 'Энергетик не указан';
    const schemeLine = schemeLabel ? `Схема: ${schemeLabel}` : 'Схема не выбрана';
    return [nameLine, shortLine, energyLine, schemeLine].join(' · ');
  };

  const setupCreatePanel = (panel) => {
    const toggle = document.getElementById('superAdminOpenCreate');
    const label = document.getElementById('superAdminCreateLabel');
    const createPanel = document.getElementById('superAdminCreatePanel');
    const closeButton = document.getElementById('superAdminCloseCreate');
    const form = document.getElementById('superAdminCreateForm');
    const fullNameInput = document.getElementById('superAdminOrgFullName');
    const shortNameInput = document.getElementById('superAdminOrgShortName');
    const energyLeadInput = document.getElementById('superAdminOrgEnergyLead');
    const submitButton = document.getElementById('superAdminCreateSubmit');
    const preview = document.getElementById('superAdminCreatePreview');
    const status = document.getElementById('superAdminCreateStatus');

    if (!toggle || !label || !createPanel || !form || !submitButton) {
      return;
    }

    let shortNameTouched = false;
    let isSubmitting = false;

    const updatePreview = () => {
      const schemeInput = form.querySelector('input[name="numberingScheme"]:checked');
      const schemeLabel =
        schemeInput?.value === 'accounting'
          ? 'Бухгалтерский номер'
          : schemeInput
          ? 'Номер приложения'
          : '';
      const payload = {
        fullName: fullNameInput?.value.trim() || '',
        shortName: shortNameInput?.value.trim() || '',
        energyLead: energyLeadInput?.value.trim() || '',
        schemeLabel
      };
      if (preview) {
        preview.textContent = buildCreatePreview(payload);
      }
    };

    const updateFormState = () => {
      const isValid =
        fullNameInput?.value.trim() &&
        shortNameInput?.value.trim() &&
        energyLeadInput?.value.trim();
      if (submitButton) {
        submitButton.disabled = !isValid;
        submitButton.classList.toggle('is-disabled', !isValid);
      }
      if (status && !isSubmitting) {
        status.textContent = isValid ? 'Готово к сохранению' : 'Заполните поля';
        status.dataset.state = isValid ? 'success' : 'error';
      }
      updatePreview();
    };

    const togglePanel = (isOpen) => {
      createPanel.hidden = !isOpen;
      toggle.setAttribute('aria-expanded', String(isOpen));
      label.textContent = isOpen ? 'Скрыть форму' : 'Добавить организацию';
      safeLogEvent('info', 'Супер-админ: переключение формы добавления организации', {
        isOpen
      });
    };

    toggle.addEventListener('click', () => {
      togglePanel(createPanel.hidden);
    });

    if (closeButton) {
      closeButton.addEventListener('click', () => {
        togglePanel(false);
      });
    }

    if (fullNameInput) {
      fullNameInput.addEventListener('input', () => {
        if (!shortNameTouched && shortNameInput) {
          shortNameInput.value = getShortName(fullNameInput.value.trim());
        }
        updateFormState();
      });
      fullNameInput.addEventListener('change', () => {
        safeLogEvent('info', 'Супер-админ: заполнено наименование организации', {
          value: fullNameInput.value.trim()
        });
      });
    }

    if (shortNameInput) {
      shortNameInput.addEventListener('input', () => {
        shortNameTouched = true;
        updateFormState();
      });
      shortNameInput.addEventListener('change', () => {
        safeLogEvent('info', 'Супер-админ: заполнено короткое название организации', {
          value: shortNameInput.value.trim()
        });
      });
    }

    if (energyLeadInput) {
      energyLeadInput.addEventListener('input', updateFormState);
      energyLeadInput.addEventListener('change', () => {
        safeLogEvent('info', 'Супер-админ: заполнено ФИО энергетика', {
          value: energyLeadInput.value.trim()
        });
      });
    }

    form.addEventListener('change', (event) => {
      if (event.target?.name === 'numberingScheme') {
        const schemeLabel =
          event.target.value === 'accounting'
            ? 'Бухгалтерский номер'
            : 'Номер приложения';
        safeLogEvent('info', 'Супер-админ: выбрана схема нумерации', {
          scheme: event.target.value,
          label: schemeLabel
        });
        updateFormState();
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (isSubmitting) {
        return;
      }
      const fullName = fullNameInput?.value.trim();
      const shortName = shortNameInput?.value.trim();
      const energyLead = energyLeadInput?.value.trim();
      if (!fullName || !shortName || !energyLead) {
        safeLogEvent('warn', 'Супер-админ: попытка сохранить организацию без всех полей', {
          fullName,
          shortName,
          energyLead
        });
        updateFormState();
        return;
      }
      isSubmitting = true;
      if (status) {
        status.textContent = 'Сохраняем организацию...';
        status.dataset.state = 'success';
      }
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.classList.add('is-disabled');
      }
      try {
        safeLogEvent('info', 'Супер-админ: отправлена форма создания организации', {
          fullName,
          shortName,
          energyLead,
          scheme: form.querySelector('input[name="numberingScheme"]:checked')?.value || ''
        });
        const response = await postCreateOrganization({
          organizationName: fullName,
          shortName,
          energyFullName: energyLead
        });
        const responseOk =
          response &&
          (response.ok === true ||
            Boolean(response.inviteId) ||
            Boolean(response.inviteLink) ||
            Boolean(response.accessEntry));
        if (!responseOk) {
          const error = new Error(
            'Сервер не подтвердил сохранение организации. Попробуйте ещё раз.'
          );
          error.details = response;
          throw error;
        }
        const accessMembers = getOrganizationMembers(response?.accessEntry);
        const expectedMember = accessMembers.some(
          (member) =>
            normalizeFullName(member?.fullName) === normalizeFullName(energyLead) &&
            normalizeRole(member?.role).includes('энергетик')
        );
        if (!response?.ok || !expectedMember) {
          const error = new Error(
            'Не удалось подтвердить запись организации в access.json. Попробуйте ещё раз.'
          );
          error.details = response;
          throw error;
        }
        const verifiedEntry = await verifyAccessSaved({
          organizationName: fullName,
          shortName,
          energyFullName: energyLead
        });
        const newOrg = buildOrganizationStats(
          fullName,
          getOrganizationMembers(verifiedEntry),
          energyLead,
          currentOrganizations.length
        );
        newOrg.shortName = shortName;
        currentOrganizations = [newOrg, ...currentOrganizations];
        const list = document.getElementById('superAdminOrgs');
        const count = document.getElementById('superAdminCount');
        if (list) {
          renderOrganizations(list, currentOrganizations);
        }
        if (count) {
          count.textContent = formatNumber(currentOrganizations.length);
        }
        updateDashboardCounters(currentOrganizations);
        safeLogEvent('info', 'Супер-админ: организация сохранена в access.json', {
          fullName,
          shortName,
          energyLead,
          response,
          scheme: form.querySelector('input[name="numberingScheme"]:checked')?.value || ''
        });
        form.reset();
        shortNameTouched = false;
        updateFormState();
        if (status) {
          status.textContent = 'Организация успешно добавлена.';
          status.dataset.state = 'success';
        }
      } catch (error) {
        updateFormState();
        const errorDetails = getReadableErrorDetails(error);
        const errorMessage =
          error?.message ||
          'Не удалось создать организацию. Проверьте подключение и данные.';
        const statusCode = error?.status ? `Код: ${error.status}` : '';
        const combinedDetails = [errorDetails, statusCode].filter(Boolean).join(' · ');
        if (status) {
          status.textContent = combinedDetails
            ? `Ошибка сохранения: ${errorMessage} (${combinedDetails})`
            : `Ошибка сохранения: ${errorMessage}`;
          status.dataset.state = 'error';
        }
        if (typeof console !== 'undefined' && console.error) {
          console.error('Ошибка создания организации:', error);
        }
        safeLogEvent('error', 'Супер-админ: ошибка создания организации', {
          message: errorMessage,
          details: errorDetails,
          stack: error?.stack,
          status: error?.status,
          response: error?.details || null,
          fullName,
          shortName,
          energyLead
        });
      } finally {
        isSubmitting = false;
      }
    });

    updateFormState();
    safeLogEvent('info', 'Супер-админ: форма добавления организации инициализирована');
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

    currentOrganizations = buildOrganizationsFromAccess(accessData);
    if (count) {
      count.textContent = formatNumber(currentOrganizations.length);
    }

    renderOrganizations(list, currentOrganizations);
    updateDashboardCounters(currentOrganizations);
    panel.hidden = false;

    if (defaultWorkspace) {
      defaultWorkspace.hidden = true;
    }

    if (!createPanelInitialized) {
      setupCreatePanel(panel);
      createPanelInitialized = true;
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

})();
