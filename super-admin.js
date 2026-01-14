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
    const inviteLink = document.getElementById('superAdminInviteLink');
    const copyButton = document.getElementById('superAdminCopyLink');

    if (createButtonInitialized || !openButton || !panel || !button || !note || !label) {
      return;
    }
    createButtonInitialized = true;

    const setPanelState = (isOpen) => {
      panel.hidden = !isOpen;
      openButton.setAttribute('aria-expanded', String(isOpen));
      label.textContent = isOpen ? 'Свернуть создание' : 'Добавить организацию';
      if (isOpen) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
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

    const setInviteLink = (value) => {
      if (!inviteLink) {
        return;
      }
      inviteLink.textContent = value || '—';
      inviteLink.href = value || '#';
    };

    const setCopyAvailable = (available) => {
      if (!copyButton) {
        return;
      }
      copyButton.hidden = !available;
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
    setInviteLink('');
    setCopyAvailable(false);
    updateCreateState();

    openButton.addEventListener('click', () => {
      setPanelState(panel.hidden);
      updateCreateState();
    });

    const getCreateOrganizationResponse = async (payload) => {
      const endpoints = ['./create-organization', './api/create-organization'];
      let lastErrorText = '';
      for (const endpoint of endpoints) {
        const apiUrl = new URL(endpoint, window.location.href).toString();
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          return response;
        }
        lastErrorText = await response.text();
        if (response.status === 404) {
          continue;
        }
        throw new Error(formatCreateError(lastErrorText));
      }
      throw new Error(formatCreateError(lastErrorText));
    };

    const formatCreateError = (errorText) => {
      if (!errorText) {
        return 'Не удалось создать организацию.';
      }
      if (/<html/i.test(errorText)) {
        return 'Сервис создания организации недоступен. Попробуйте позже.';
      }
      return errorText;
    };

    const createOrganization = async () => {
      if (!orgNameInput || !energyNameInput) {
        setStatus('Не удалось найти поля формы. Обновите страницу.', 'error');
        return;
      }
      const organizationName = orgNameInput.value.trim();
      const energyFullName = energyNameInput.value.trim();
      if (!organizationName || !energyFullName) {
        setStatus('Заполните название организации и ФИО энергетика.', 'error');
        setInviteLink('');
        setCopyAvailable(false);
        updateCreateState();
        return;
      }
      isCreating = true;
      setCreateEnabled(false);
      button.textContent = 'Создаём...';
      setStatus('Создаём организацию и ссылку приглашения...', 'success');
      setInviteLink('');
      setCopyAvailable(false);
      try {
        const response = await getCreateOrganizationResponse({
          organizationName,
          energyFullName
        });
        const result = await response.json();
        setInviteLink(result.inviteLink || '');
        setCopyAvailable(Boolean(result.inviteLink));
        setStatus('Ссылка готова — отправьте её энергетику.', 'success');
      } catch (error) {
        setStatus(error?.message || 'Не удалось создать организацию.', 'error');
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
        } catch (error) {
          setStatus('Не удалось скопировать ссылку. Скопируйте вручную.', 'error');
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
