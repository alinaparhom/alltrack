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
        <div class="statistics-card">
          <div class="statistics-header">
            <div>
              <div class="statistics-title">Статистика</div>
              <div class="statistics-subtitle">Сводка за неделю</div>
            </div>
            <span class="statistics-pill">Онлайн</span>
          </div>
          <div class="statistics-grid">
            <div class="statistics-item">
              <div class="statistics-label">Операции</div>
              <div class="statistics-value">1 248</div>
            </div>
            <div class="statistics-item">
              <div class="statistics-label">Инциденты</div>
              <div class="statistics-value">18</div>
            </div>
            <div class="statistics-item">
              <div class="statistics-label">Новые заявки</div>
              <div class="statistics-value">34</div>
            </div>
            <div class="statistics-item">
              <div class="statistics-label">В работе</div>
              <div class="statistics-value">7</div>
            </div>
          </div>
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
