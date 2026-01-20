export const roleId = "Энергетик";

export function renderRole(user) {
  return `
    <section class="role-card">
      <div class="dashboard">
        <div class="dashboard-header">
          <span class="role-pill">${roleId}</span>
        </div>
      </div>
    </section>
  `;
}
