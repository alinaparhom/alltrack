export const roleId = "Энергетик";

export const energyActions = [
  { id: "tools", title: "Мои инструменты", icon: "🧰" },
  { id: "add-tool", title: "Добавить инструмент", icon: "➕" },
  { id: "base", title: "База", icon: "🗂️" },
  { id: "write-off", title: "Списать", icon: "🧾" },
  { id: "repair", title: "Ремонт", icon: "🛠️" },
  { id: "breakdowns", title: "Поломки", icon: "⚠️" },
  { id: "demand", title: "Потребность", icon: "📌" },
  { id: "objects", title: "Объекты", icon: "🏢" },
  { id: "move", title: "Переместить за других", icon: "🚚" },
  { id: "info", title: "Информация", icon: "ℹ️" },
  { id: "download", title: "Выгрузить данные", icon: "📤" },
  { id: "add-photo", title: "Добавить фото", icon: "📷" },
  { id: "remove-photo", title: "Удалить фото", icon: "🗑️" },
  { id: "no-photo", title: "Без фото", icon: "🚫" },
  { id: "fines", title: "Штрафы", icon: "💸" },
  { id: "users", title: "Пользователи", icon: "👥" },
  { id: "settings", title: "Настройки", icon: "⚙️" },
];

function renderActionCard(action) {
  const settingsClass = action.id === "settings" ? " action-card--settings" : "";
  return `
    <button class="action-card${settingsClass}" type="button" data-energy-item data-energy-item-type="action" data-action-id="${action.id}">
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
      data-energy-feedback
      aria-label="Обратная связь"
    >
      <span class="action-icon">💬</span>
      <div class="action-title">Обратная связь</div>
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
        <div class="settings-modal is-hidden" data-energy-settings-modal>
          <div class="settings-modal__backdrop" data-energy-settings-backdrop></div>
          <div
            class="settings-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Настройки организации"
          >
            <div class="settings-modal__header">
              <div class="settings-modal__title">
                <h2>Настройки организации</h2>
              </div>
            </div>
            <form class="settings-modal__form" data-energy-settings-form>
              <div class="settings-modal__body" data-energy-settings-body></div>
              <div class="settings-modal__footer">
                <button
                  class="action-secondary"
                  type="button"
                  data-energy-settings-cancel
                >
                  Отмена
                </button>
                <button class="action-primary" type="submit">Сохранить</button>
              </div>
              <div class="form-message" data-energy-settings-message></div>
            </form>
          </div>
        </div>
        <div class="objects-modal settings-modal is-hidden" data-energy-objects-modal>
          <div class="settings-modal__backdrop" data-energy-objects-backdrop></div>
          <div
            class="settings-modal__panel objects-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Объекты"
          >
            <div class="settings-modal__header objects-modal__header">
              <div class="settings-modal__title">
                <h2>Объекты</h2>
                <p data-energy-objects-subtitle>Управляйте списком объектов</p>
              </div>
              <button
                class="button-icon objects-modal__close"
                type="button"
                data-energy-objects-close
                aria-label="Закрыть окно объектов"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body objects-modal__body">
              <form class="objects-form form-card" data-energy-objects-form>
                <div class="form-field objects-form__input">
                  <input
                    class="form-input"
                    id="objects-name-input"
                    name="object-name"
                    placeholder="Название объекта"
                    aria-label="Название объекта"
                    autocomplete="off"
                    required
                  />
                  <button
                    class="objects-form__submit"
                    type="submit"
                    data-energy-objects-submit
                    aria-label="Добавить объект"
                  >
                    +
                  </button>
                </div>
                <div class="objects-form__actions">
                  <button
                    class="action-secondary is-hidden"
                    type="button"
                    data-energy-objects-cancel
                  >
                    Отмена
                  </button>
                </div>
                <div class="form-message" data-energy-objects-message></div>
              </form>
              <div class="objects-list" data-energy-objects-list>
                <div class="objects-list__items">
                  <div class="objects-list__header">
                    <span class="objects-list__title">Список объектов</span>
                    <span class="objects-count" data-energy-objects-count>0</span>
                  </div>
                  <div class="objects-list__grid" data-energy-objects-items></div>
                </div>
                <div class="objects-empty is-hidden" data-energy-objects-empty>
                  Пока нет объектов. Добавьте первый объект выше.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}
