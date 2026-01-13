(() => {
  const formatNumber = (value) => new Intl.NumberFormat('ru-RU').format(value);

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
    const button = document.getElementById('superAdminCreateButton');
    const note = document.getElementById('superAdminCreateNote');
    if (!button || !note) {
      return;
    }
    button.addEventListener('click', () => {
      note.hidden = false;
      note.textContent = 'Функция в разработке. Скоро будет доступна.';
    });
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
})();
