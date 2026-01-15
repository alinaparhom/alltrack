(() => {
  const formatNumber = (value) => new Intl.NumberFormat('ru-RU').format(value);
  let createButtonInitialized = false;
  let currentOrganizations = [];

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

  const addOrganizationCard = ({
    name,
    industry,
    numbering,
    list,
    count
  }) => {
    const index = currentOrganizations.length;
    const adminName = 'Не назначен';
    const orgStats = buildOrganizationStats(name, [], adminName, index);
    currentOrganizations = [...currentOrganizations, { ...orgStats, industry, numbering }];
    if (list) {
      list.innerHTML = currentOrganizations.map(renderOrganizationCard).join('');
    }
    if (count) {
      count.textContent = formatNumber(currentOrganizations.length);
    }
  };

  const initCreateButton = () => {
    const openButton = document.getElementById('superAdminOpenCreate');
    const panel = document.getElementById('superAdminCreatePanel');
    const label = document.getElementById('superAdminCreateLabel');
    const form = document.getElementById('superAdminCreateForm');
    const list = document.getElementById('superAdminOrgs');
    const count = document.getElementById('superAdminCount');
    const nameInput = document.getElementById('superAdminOrgName');
    const industryInput = document.getElementById('superAdminOrgIndustry');

    if (createButtonInitialized || !openButton || !panel || !label) {
      return;
    }
    createButtonInitialized = true;

    const setPanelState = (isOpen) => {
      panel.hidden = !isOpen;
      openButton.setAttribute('aria-expanded', String(isOpen));
      label.textContent = isOpen ? 'Свернуть создание' : 'Добавить организацию';
      if (isOpen) {
        if (nameInput) {
          nameInput.focus();
        }
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    setPanelState(false);
    openButton.addEventListener('click', () => {
      setPanelState(panel.hidden);
    });

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();

        const name = nameInput?.value?.trim();
        const industry = industryInput?.value?.trim();
        const numbering =
          form.querySelector('input[name="orgNumbering"]:checked')?.value || 'app';

        if (!name || !industry) {
          if (form.reportValidity) {
            form.reportValidity();
          } else if (nameInput && !name) {
            nameInput.focus();
          } else if (industryInput) {
            industryInput.focus();
          }
          return;
        }

        addOrganizationCard({
          name,
          industry,
          numbering,
          list,
          count
        });

        form.reset();
        const defaultNumbering = form.querySelector('input[name="orgNumbering"][value="app"]');
        if (defaultNumbering) {
          defaultNumbering.checked = true;
        }
        setPanelState(false);
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

    currentOrganizations = buildOrganizationsFromAccess(accessData);
    if (count) {
      count.textContent = formatNumber(currentOrganizations.length);
    }

    renderOrganizations(list, currentOrganizations);
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
