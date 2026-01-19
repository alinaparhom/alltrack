export const roleId = "Главный инженер";

export function renderRole(user) {
  return `
    <section class="role-card">
      <div class="role-header">
        <span class="role-pill">${roleId}</span>
        <h1>Технический контроль объектов</h1>
      </div>
      <p class="role-description">
        Следите за техническим состоянием, проверками и планами обслуживания.
      </p>
      <div class="role-grid">
        <div class="role-tile">
          <h3>Журнал оборудования</h3>
          <p>Просматривайте состояние и историю сервиса.</p>
        </div>
        <div class="role-tile">
          <h3>Планы работ</h3>
          <p>Утверждайте графики и приоритеты.</p>
        </div>
      </div>
      <div class="role-user">${user}</div>
    </section>
  `;
}
