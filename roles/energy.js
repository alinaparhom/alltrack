export const roleId = "Энергетик";

export function renderRole(user) {
  return `
    <section class="role-card">
      <div class="role-header">
        <span class="role-pill">${roleId}</span>
        <h1>Энергоэффективность и ресурсный баланс</h1>
      </div>
      <p class="role-description">
        Контролируйте энергопотребление и своевременное обслуживание систем.
      </p>
      <div class="role-grid">
        <div class="role-tile">
          <h3>Мониторинг нагрузки</h3>
          <p>Отслеживайте пики и аномалии потребления.</p>
        </div>
        <div class="role-tile">
          <h3>Планы оптимизации</h3>
          <p>Собирайте инициативы по экономии ресурсов.</p>
        </div>
      </div>
      <div class="role-user">${user}</div>
    </section>
  `;
}
