export const roleId = "Руководитель";

export function renderRole(user) {
  return `
    <section class="role-card">
      <div class="role-header">
        <span class="role-pill">${roleId}</span>
        <h1>Стратегия и ключевые показатели</h1>
      </div>
      <p class="role-description">
        Получайте сводку по объектам, финансам и эффективности команд.
      </p>
      <div class="role-grid">
        <div class="role-tile">
          <h3>Дашборд KPI</h3>
          <p>Смотрите основные метрики в режиме реального времени.</p>
        </div>
        <div class="role-tile">
          <h3>Сводные отчёты</h3>
          <p>Экспортируйте ключевые данные для совещаний.</p>
        </div>
      </div>
      <div class="role-user">${user}</div>
    </section>
  `;
}
