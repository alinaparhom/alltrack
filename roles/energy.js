export const roleId = "Энергетик";

export const energyActions = [
  { id: "tools", title: "Мои инструменты", icon: "🧰" },
  { id: "add-tool", title: "Добавить инструмент", icon: "➕" },
  { id: "base", title: "База", icon: "🗂️" },
  { id: "write-off", title: "Списать", icon: "🧾" },
  { id: "repair", title: "Ремонт", icon: "🛠️" },
  { id: "breakdowns", title: "Поломки", icon: "⚠️" },
  { id: "move", title: "Переместить за других", icon: "🚚" },
  { id: "info", title: "Информация", icon: "ℹ️" },
  { id: "upload", title: "Загрузить данные", icon: "📥" },
  { id: "download", title: "Выгрузить данные", icon: "📤" },
  { id: "add-photo", title: "Добавить фото", icon: "📷" },
  { id: "remove-photo", title: "Удалить фото", icon: "🗑️" },
  { id: "no-photo", title: "Без фото", icon: "🚫" },
  { id: "fines", title: "Штрафы", icon: "💸" },
  { id: "users", title: "Пользователи", icon: "👥" },
];

function renderActionCard(action) {
  return `
    <button class="action-card" type="button" data-energy-item data-energy-item-type="action" data-action-id="${action.id}">
      <span class="action-icon">${action.icon}</span>
      <div class="action-title">${action.title}</div>
    </button>
  `;
}

function renderGroupToggleCard() {
  return `
    <button
      class="action-card energy-group-toggle-card"
      type="button"
      data-energy-item
      data-energy-item-type="toggle"
      data-energy-group-toggle
      aria-label="Группировать"
      aria-pressed="false"
    >
      <span class="action-icon">🧩</span>
      <div class="action-title">Группировка</div>
    </button>
  `;
}

export function renderRole(user) {
  const actionsMarkup = energyActions.map(renderActionCard).join("");
  const groupToggleMarkup = renderGroupToggleCard();
  return `
    <section class="role-card">
      <div class="dashboard energy-dashboard">
        <div class="action-grid energy-grid" data-energy-grid>
          ${actionsMarkup}
          ${groupToggleMarkup}
        </div>
        <div class="energy-group-panel is-hidden" data-energy-group-panel>
          <div class="energy-group-info">
            <div class="energy-group-count" data-energy-selected-count>0</div>
            <div class="energy-group-text">Выберите минимум 2 плашки</div>
          </div>
          <div class="energy-group-actions">
            <button class="action-primary" type="button" data-energy-create-group disabled>
              Создать группу
            </button>
            <button class="action-secondary" type="button" data-energy-cancel-group>
              Отмена
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}
