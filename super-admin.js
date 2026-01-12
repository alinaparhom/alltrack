(() => {
  const mockOrganizations = [
    {
      name: 'Северный склад',
      admin: 'Анна Петрова',
      users: 48,
      toolsTotal: 1230,
      toolsCurrent: 418,
      toolsNoPhoto: 37,
      feedbackTotal: 54,
      feedbackDone: 41
    },
    {
      name: 'Ремонтный центр',
      admin: 'Илья Смирнов',
      users: 29,
      toolsTotal: 760,
      toolsCurrent: 212,
      toolsNoPhoto: 18,
      feedbackTotal: 33,
      feedbackDone: 28
    },
    {
      name: 'Офис «Центр»',
      admin: 'Мария Кузнецова',
      users: 62,
      toolsTotal: 1485,
      toolsCurrent: 560,
      toolsNoPhoto: 52,
      feedbackTotal: 71,
      feedbackDone: 64
    }
  ];

  const formatNumber = (value) => new Intl.NumberFormat('ru-RU').format(value);

  const buildStat = (label, value) =>
    `<div class="super-admin__stat"><span>${label}</span><strong>${value}</strong></div>`;

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

  const renderOrganizations = (container) => {
    container.innerHTML = mockOrganizations.map(renderOrganizationCard).join('');
  };

  window.initSuperAdminWorkspace = ({ fullName } = {}) => {
    const panel = document.getElementById('superAdminPanel');
    const nameField = document.getElementById('superAdminName');
    const list = document.getElementById('superAdminOrgs');
    const defaultWorkspace = document.getElementById('defaultWorkspace');

    if (!panel || !list) {
      return;
    }

    if (nameField) {
      nameField.textContent = fullName || '—';
    }

    renderOrganizations(list);
    panel.hidden = false;

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
