export const roleId = "Супер-администратор";

export function renderRole(user) {
  return `
    <section class="role-card">
      <div class="role-header">
        <span class="role-pill">${roleId}</span>
        <h1>Главный обзор системы</h1>
      </div>
      <div class="dashboard">
        <div class="dashboard-header">
          <p class="role-description">
            Быстрый доступ к ключевым метрикам и действиям. Детали открываются при
            нажатии на блок.
          </p>
          <div class="dashboard-subtitle">Сегодня · обновлено 2 минуты назад</div>
        </div>
        <div class="dashboard-stats">
          <div class="stat-card">
            <div class="stat-row">
              <span class="stat-label">Подключено организаций</span>
              <span class="stat-pill">активные</span>
            </div>
            <div class="stat-row">
              <span class="stat-value">128</span>
              <span class="stat-meta">+6 за неделю</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-row">
              <span class="stat-label">Пользователи приложения</span>
              <span class="stat-pill">всего</span>
            </div>
            <div class="stat-row">
              <span class="stat-value">2 845</span>
              <span class="stat-meta">из них 1 932 активны</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-row">
              <span class="stat-label">Обратная связь</span>
              <span class="stat-pill">важно</span>
            </div>
            <div class="stat-row">
              <span class="stat-value">42</span>
              <span class="stat-meta">27 отработано</span>
            </div>
            <div class="progress"><span></span></div>
          </div>
        </div>
        <div class="action-grid">
          <button class="action-card" type="button">
            <div class="action-title">Оплаты</div>
            <div class="action-description">
              Контролируйте статусы платежей и задолженности.
            </div>
            <div class="action-note">Нажмите для детализации</div>
          </button>
          <button class="action-card" type="button">
            <div class="action-title">Настройки</div>
            <div class="action-description">
              Управляйте правами, тарифами и параметрами платформы.
            </div>
            <div class="action-note">Нажмите для детализации</div>
          </button>
          <button class="action-card" type="button">
            <div class="action-title">Добавить организацию</div>
            <div class="action-description">
              Быстрое подключение новой организации к AllTrack.
            </div>
            <div class="action-note">Откроется форма создания</div>
          </button>
          <button class="action-card" type="button">
            <div class="action-title">Добавить пользователя</div>
            <div class="action-description">
              Пригласите сотрудника и назначьте роль.
            </div>
            <div class="action-note">Откроется форма добавления</div>
          </button>
          <button class="action-card" type="button">
            <div class="action-title">Выгрузить данные</div>
            <div class="action-description">
              Экспортируйте отчёты по организациям и оплатам.
            </div>
            <div class="action-note">Выберите формат выгрузки</div>
          </button>
        </div>
      </div>
      <div class="role-user">${user}</div>
    </section>
  `;
}
