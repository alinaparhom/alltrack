export const roleId = "Ответственный";

export function renderRole(user) {
  return `
    <section class="role-card">
      <div class="role-header">
        <span class="role-pill">${roleId}</span>
        <h1>Координация задач и команд</h1>
      </div>
      <p class="role-description">
        Держите под контролем исполнителей, сроки и отчётность по объектам.
      </p>
      <div class="role-grid">
        <div class="role-tile">
          <h3>Статусы работ</h3>
          <p>Быстро отмечайте этапы выполнения задач.</p>
        </div>
        <div class="role-tile">
          <h3>Коммуникация</h3>
          <p>Собирайте обратную связь от сотрудников.</p>
        </div>
      </div>
      <div class="role-user">${user}</div>
    </section>
  `;
}
