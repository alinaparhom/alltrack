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
            Быстрый доступ к ключевым метрикам и действиям системы.
          </p>
          <div class="dashboard-subtitle">Сегодня · обновлено 2 минуты назад</div>
        </div>
        <div class="section-pill">Статистика</div>
        <div class="dashboard-stats">
          <div class="stat-card">
            <div class="stat-row">
              <span class="stat-label">Организаций</span>
              <span class="stat-pill">в реестре</span>
            </div>
            <div class="stat-row">
              <span class="stat-value">12</span>
              <span class="stat-meta">+2 за неделю</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-row">
              <span class="stat-label">Пользователей</span>
              <span class="stat-pill">активных</span>
            </div>
            <div class="stat-row">
              <span class="stat-value">284</span>
              <span class="stat-meta">+18 за неделю</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-row">
              <span class="stat-label">Обратная связь</span>
              <span class="stat-pill">в работе</span>
            </div>
            <div class="stat-row">
              <span class="stat-value">9</span>
              <span class="stat-meta">3 без ответа</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-row">
              <span class="stat-label">Инцидентов</span>
              <span class="stat-pill">в работе</span>
            </div>
            <div class="stat-row">
              <span class="stat-value">3</span>
              <span class="stat-meta">1 новый</span>
            </div>
          </div>
        </div>
        <div class="action-grid">
          <button class="action-card" type="button">
            <div class="action-title">Оплаты</div>
          </button>
          <button class="action-card" type="button">
            <div class="action-title">Настройки</div>
          </button>
          <button class="action-card" type="button">
            <div class="action-title">Добавить организацию</div>
          </button>
          <button class="action-card" type="button">
            <div class="action-title">Добавить пользователя</div>
          </button>
          <button class="action-card" type="button">
            <div class="action-title">Выгрузить данные</div>
          </button>
        </div>
      </div>
      <div class="role-user">${user}</div>
    </section>
  `;
}
