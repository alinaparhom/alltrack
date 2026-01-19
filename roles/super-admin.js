export const roleId = "Супер-администратор";

export function renderRole(user) {
  return `
    <section class="role-card">
      <div class="role-header">
        <span class="role-pill">${roleId}</span>
        <h1>Контроль системы и полный доступ</h1>
      </div>
      <p class="role-description">
        Управляйте всей экосистемой AllTrack, правами пользователей и
        настройками организаций.
      </p>
      <div class="role-grid">
        <div class="role-tile">
          <h3>Панель администрирования</h3>
          <p>Редактируйте пользователей и доступы.</p>
        </div>
        <div class="role-tile">
          <h3>Мониторинг процессов</h3>
          <p>Отслеживайте все ключевые статусы в одном месте.</p>
        </div>
      </div>
      <div class="role-user">${user}</div>
    </section>
  `;
}
