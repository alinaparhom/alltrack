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
      return new URL(path, window.location.href).toString();
    } catch (error) {
      return path;
    }
  };

  const postCreateOrganization = async (payload) => {
    const url = buildApiUrl('./create-organization-step-1');
    const body = JSON.stringify(payload);
    const fetchWithLogging =
      typeof window !== 'undefined' && typeof window.fetchWithLogging === 'function'
        ? window.fetchWithLogging
        : null;
    const requestId = `super-admin-create-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    safeLogEvent('info', 'Супер-админ: отправка запроса на создание организации', {
      requestId,
      url,
      payload
    });
    const response = fetchWithLogging
      ? await fetchWithLogging('create-organization-step-1', url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        })
      : await fetch(url, {
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
      safeLogEvent('warn', 'Супер-админ: ошибка ответа сервера при создании организации', {
        status: response.status,
        requestId,
        url,
        response: data
      });
      throw error;
    }
    safeLogEvent('info', 'Супер-админ: ответ сервера при создании организации', {
      status: response.status,
      requestId,
      url,
      response: data || rawText
    });
    return data || { ok: true };
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
        if (!response || response.ok !== true) {
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
        const newOrg = buildOrganizationStats(
          fullName,
          [],
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
          status.textContent = 'Организация создана';
          status.dataset.state = 'success';
        }
      } catch (error) {
        updateFormState();
        const errorDetails =
          error?.details?.details ||
          error?.details?.message ||
          error?.details?.error ||
          null;
        const errorMessage =
          error?.message ||
          'Не удалось создать организацию. Проверьте подключение и данные.';
        if (status) {
          status.textContent = errorDetails
            ? `${errorMessage} (${errorDetails})`
            : errorMessage;
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
