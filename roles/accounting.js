export const roleId = "Бухгалтерия";

export function renderRole(user) {
  return `
    <section class="role-card">
      <div class="role-header">
        <span class="role-pill">${roleId}</span>
        <h1>Финансовый контроль и расчёты</h1>
      </div>
      <p class="role-description">
        Ведите платежи, контролируйте бюджеты и готовьте документы.
      </p>
      <div class="role-grid">
        <div class="role-tile">
          <h3>Платёжный календарь</h3>
          <p>Отмечайте оплату счетов и обязательств.</p>
        </div>
        <div class="role-tile">
          <h3>Бюджетирование</h3>
          <p>Сравнивайте плановые и фактические траты.</p>
        </div>
      </div>
      <div class="role-user">${user}</div>
    </section>
  `;
}
