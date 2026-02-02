export const roleId = "Энергетик";

export const energyActions = [
  { id: "tools", title: "Мои инструменты", icon: "🧰" },
  { id: "add-tool", title: "Новая МТЦ", icon: "➕" },
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
        <div class="tools-modal settings-modal is-hidden" data-tools-modal>
          <div class="settings-modal__backdrop" data-tools-backdrop></div>
          <div
            class="settings-modal__panel tools-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Мои инструменты"
          >
            <div class="settings-modal__header tools-modal__header">
              <div class="settings-modal__title">
                <h2>Мои инструменты</h2>
                <p data-tools-subtitle>Загружаем список...</p>
              </div>
              <button
                class="button-icon tools-modal__close"
                type="button"
                data-tools-close
                aria-label="Закрыть список инструментов"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body tools-modal__body">
              <div class="tools-controls">
                <div class="tools-controls__row">
                  <label class="tools-search">
                    <input
                      class="form-input tools-search__input"
                      type="search"
                      placeholder="Поиск по номеру, названию, модели..."
                      data-tools-search
                      autocomplete="off"
                    />
                  </label>
                  <div class="tools-actions">
                    <div
                      class="tools-view-toggle"
                      role="group"
                      aria-label="Вариант отображения"
                      data-tools-view-toggle
                    >
                      <button
                        class="tools-view-button"
                        type="button"
                        data-tools-view="large"
                      >
                        Крупные
                      </button>
                      <button
                        class="tools-view-button"
                        type="button"
                        data-tools-view="compact"
                      >
                        Обычные
                      </button>
                      <button
                        class="tools-view-button"
                        type="button"
                        data-tools-view="list"
                      >
                        Список
                      </button>
                      <button
                        class="tools-view-button is-active"
                        type="button"
                        data-tools-view="table"
                      >
                        Таблица
                      </button>
                    </div>
                    <button
                      class="action-primary tools-move-button"
                      type="button"
                      data-tools-move-trigger
                    >
                      Переместить
                    </button>
                    <div
                      class="tools-selection-count is-hidden"
                      data-tools-selection-count
                      aria-live="polite"
                    >
                      Выбрано: 0
                    </div>
                    <button
                      class="action-secondary tools-cancel-button"
                      type="button"
                      data-tools-selection-cancel
                    >
                      Отменить
                    </button>
                    <button
                      class="tools-filters-toggle"
                      type="button"
                      data-tools-filters-toggle
                      aria-expanded="false"
                      aria-controls="tools-filters-panel"
                      aria-label="Фильтры"
                    >
                      <svg
                        class="tools-filters-toggle__icon"
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        focusable="false"
                      >
                        <path
                          d="M3 5.5a1 1 0 0 1 1-1h16a1 1 0 0 1 .8 1.6L14 13.5v4.1a1 1 0 0 1-1.5.86l-3-1.8a1 1 0 0 1-.5-.86v-2.7L3.2 6.1a1 1 0 0 1-.2-.6z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="tools-filters" id="tools-filters-panel" data-tools-filters-panel>
                  <label class="tools-filter">
                    <span>Группа</span>
                    <select class="form-input" data-tools-filter="group"></select>
                  </label>
                  <label class="tools-filter">
                    <span>Статус</span>
                    <select class="form-input" data-tools-filter="status"></select>
                  </label>
                  <label class="tools-filter">
                    <span>Объект</span>
                    <select class="form-input" data-tools-filter="object"></select>
                  </label>
                  <label class="tools-filter">
                    <span>Производитель</span>
                    <select
                      class="form-input"
                      data-tools-filter="manufacturer"
                    ></select>
                  </label>
                  <label class="tools-filter">
                    <span>Модель</span>
                    <select class="form-input" data-tools-filter="model"></select>
                  </label>
                  <label class="tools-filter">
                    <span>Фото</span>
                    <select class="form-input" data-tools-filter="photo"></select>
                  </label>
                </div>
              </div>
              <div class="tools-list" data-tools-list></div>
              <div class="tools-empty is-hidden" data-tools-empty>
                Инструменты не найдены. Попробуйте сбросить фильтры или поиск.
              </div>
            </div>
          </div>
        </div>
        <div class="tools-modal settings-modal is-hidden" data-pending-moves-modal>
          <div class="settings-modal__backdrop" data-pending-moves-backdrop></div>
          <div
            class="settings-modal__panel tools-modal__panel pending-moves-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Ожидают ответа"
          >
            <div class="settings-modal__header tools-modal__header">
              <div class="settings-modal__title">
                <h2>Ожидают ответа</h2>
                <p data-pending-moves-subtitle>Проверяем список...</p>
              </div>
              <button
                class="button-icon tools-modal__close"
                type="button"
                data-pending-moves-close
                aria-label="Закрыть список ожиданий"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body tools-modal__body">
              <div class="pending-moves-actions">
                <button
                  class="action-secondary pending-moves-action-button pending-moves-action-button--decline"
                  type="button"
                  data-pending-moves-decline-all
                >
                  Не принять все
                </button>
                <button
                  class="action-primary pending-moves-action-button pending-moves-action-button--accept"
                  type="button"
                  data-pending-moves-accept-all
                >
                  Принять все
                </button>
              </div>
              <div class="tools-list is-table" data-pending-moves-list></div>
              <div class="tools-empty is-hidden" data-pending-moves-empty>
                Нет инструментов, которые ждут ответа.
              </div>
              <div class="form-message" data-pending-moves-message></div>
            </div>
          </div>
        </div>
        <div
          class="settings-modal is-hidden pending-moves-decline-modal"
          data-pending-moves-decline-modal
        >
          <div
            class="settings-modal__backdrop"
            data-pending-moves-decline-backdrop
          ></div>
          <div
            class="settings-modal__panel pending-moves-decline-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Причина отказа"
          >
            <div class="settings-modal__header">
              <div class="settings-modal__title">
                <h2>Почему не принимаете?</h2>
                <p>Причина обязательна и попадёт в историю перемещений.</p>
              </div>
              <button
                class="button-icon"
                type="button"
                data-pending-moves-decline-close
                aria-label="Закрыть окно причины"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <form class="settings-modal__body" data-pending-moves-decline-form>
              <label class="form-field">
                <span class="form-label">Причина</span>
                <textarea
                  class="form-input pending-moves-decline-textarea"
                  rows="4"
                  placeholder="Например: инструмент не получен, нет комплекта..."
                  data-pending-moves-decline-reason
                  required
                ></textarea>
              </label>
              <label class="form-field">
                <span class="form-label">Фото отказа (необязательно)</span>
                <input
                  class="form-input pending-moves-decline-file"
                  type="file"
                  accept="image/*"
                  data-pending-moves-decline-photo
                />
                <span class="form-hint">
                  Фото добавится в уведомление и сохранится в папку «Фото отказов».
                </span>
              </label>
              <div class="pending-moves-decline-actions">
                <button
                  class="action-secondary"
                  type="button"
                  data-pending-moves-decline-cancel
                >
                  Отмена
                </button>
                <button class="action-primary" type="submit">
                  Сохранить причину
                </button>
              </div>
              <div class="form-message" data-pending-moves-decline-message></div>
            </form>
          </div>
        </div>
        <div class="settings-modal tools-move-modal is-hidden" data-tools-move-modal>
          <div class="settings-modal__backdrop" data-tools-move-backdrop></div>
          <div
            class="settings-modal__panel tools-move-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Перемещение инструментов"
          >
            <div class="settings-modal__header">
              <div class="settings-modal__title">
                <h2>Перемещение</h2>
                <p data-tools-move-subtitle>Выберите ответственного и объект</p>
              </div>
              <button
                class="button-icon tools-move-modal__close"
                type="button"
                data-tools-move-close
                aria-label="Закрыть окно перемещения"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <form class="settings-modal__form" data-tools-move-form>
              <div class="settings-modal__body">
                <div class="form-card form-grid">
                  <label class="form-field form-field--required">
                    <span class="form-label">Ответственный</span>
                    <input
                      class="form-input"
                      type="text"
                      data-tools-move-responsible
                      data-placeholder="Выберите ответственного"
                      placeholder="Выберите ответственного"
                      autocomplete="off"
                      required
                    />
                    <div
                      class="suggestions is-hidden"
                      data-tools-move-responsible-suggestions
                    ></div>
                  </label>
                  <label class="form-field form-field--required">
                    <span class="form-label">Объект</span>
                    <input
                      class="form-input"
                      type="text"
                      data-tools-move-object
                      data-placeholder="Выберите объект"
                      placeholder="Выберите объект"
                      autocomplete="off"
                      required
                    />
                    <div
                      class="suggestions is-hidden"
                      data-tools-move-object-suggestions
                    ></div>
                  </label>
                  <label
                    class="form-field form-field--required is-hidden"
                    data-tools-move-reason-field
                  >
                    <span class="form-label">Причина перемещения</span>
                    <textarea
                      class="form-input"
                      rows="3"
                      placeholder="Например: срочный ремонт, смена объекта"
                      data-tools-move-reason
                    ></textarea>
                    <span class="form-hint">
                      Причина обязательна, если выбран энергетик.
                    </span>
                  </label>
                </div>
                <div class="form-message" data-tools-move-message></div>
              </div>
              <div class="settings-modal__footer">
                <button
                  class="action-secondary"
                  type="button"
                  data-tools-move-cancel
                >
                  Отмена
                </button>
                <button class="action-primary" type="submit">
                  Переместить
                </button>
              </div>
            </form>
          </div>
        </div>
        <div class="tools-modal settings-modal is-hidden" data-add-photo-modal>
          <div class="settings-modal__backdrop" data-add-photo-backdrop></div>
          <div
            class="settings-modal__panel tools-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Добавить фото"
          >
            <div class="settings-modal__header tools-modal__header">
              <div class="settings-modal__title">
                <h2>Добавить фото</h2>
                <p data-add-photo-subtitle>Загружаем список...</p>
              </div>
              <button
                class="button-icon tools-modal__close"
                type="button"
                data-add-photo-close
                aria-label="Закрыть список инструментов"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body tools-modal__body">
              <div class="tools-controls">
                <div class="tools-controls__row">
                  <label class="tools-search">
                    <input
                      class="form-input tools-search__input"
                      type="search"
                      placeholder="Поиск по номеру, бух.номеру, названию..."
                      data-add-photo-search
                      autocomplete="off"
                    />
                  </label>
                  <div class="tools-actions">
                    <button
                      class="tools-filters-toggle"
                      type="button"
                      data-add-photo-filters-toggle
                      aria-expanded="false"
                      aria-controls="add-photo-filters-panel"
                      aria-label="Фильтры"
                    >
                      <svg
                        class="tools-filters-toggle__icon"
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        focusable="false"
                      >
                        <path
                          d="M3 5.5a1 1 0 0 1 1-1h16a1 1 0 0 1 .8 1.6L14 13.5v4.1a1 1 0 0 1-1.5.86l-3-1.8a1 1 0 0 1-.5-.86v-2.7L3.2 6.1a1 1 0 0 1-.2-.6z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div
                  class="tools-filters"
                  id="add-photo-filters-panel"
                  data-add-photo-filters-panel
                >
                  <label class="tools-filter">
                    <span>Группа</span>
                    <select class="form-input" data-add-photo-filter="group"></select>
                  </label>
                  <label class="tools-filter">
                    <span>Статус</span>
                    <select class="form-input" data-add-photo-filter="status"></select>
                  </label>
                  <label class="tools-filter">
                    <span>Объект</span>
                    <select class="form-input" data-add-photo-filter="object"></select>
                  </label>
                  <label class="tools-filter">
                    <span>Производитель</span>
                    <select
                      class="form-input"
                      data-add-photo-filter="manufacturer"
                    ></select>
                  </label>
                  <label class="tools-filter">
                    <span>Модель</span>
                    <select class="form-input" data-add-photo-filter="model"></select>
                  </label>
                </div>
              </div>
              <div class="tools-list is-table" data-add-photo-list></div>
              <div class="tools-empty is-hidden" data-add-photo-empty>
                Инструменты без фото не найдены. Попробуйте изменить фильтры.
              </div>
            </div>
          </div>
        </div>
        <div class="settings-modal add-tool-modal is-hidden" data-add-tool-modal>
          <div class="settings-modal__backdrop" data-add-tool-backdrop></div>
          <div
            class="settings-modal__panel add-tool-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Новая МТЦ"
          >
            <div class="settings-modal__header add-tool-modal__header">
              <div class="settings-modal__title">
                <h2>Новая МТЦ</h2>
                <p data-add-tool-subtitle>Заполните карточку инструмента</p>
              </div>
              <button
                class="button-icon add-tool-modal__close"
                type="button"
                data-add-tool-close
                aria-label="Закрыть форму добавления"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <form class="settings-modal__form" data-add-tool-form>
              <div class="settings-modal__body">
                <div class="form-card form-grid">
                  <label class="form-field" data-add-tool-accounting-field>
                    <span class="form-label">Бух.номер</span>
                    <input
                      class="form-input"
                      id="tool-accounting-number-input"
                      type="text"
                      inputmode="numeric"
                      name="tool-accounting-number"
                      placeholder="Можно оставить пустым"
                      autocomplete="off"
                    />
                  </label>
                  <label class="form-field form-field--required">
                    <span class="form-label">Наименование</span>
                    <input
                      class="form-input"
                      id="tool-name-input"
                      type="text"
                      name="tool-name"
                      placeholder="Например, Перфоратор"
                      autocomplete="off"
                      required
                    />
                    <div
                      class="suggestions is-hidden"
                      data-tool-name-suggestions
                    ></div>
                  </label>
                  <label class="form-field form-field--required">
                    <span class="form-label">Производитель</span>
                    <input
                      class="form-input"
                      id="tool-manufacturer-input"
                      type="text"
                      name="tool-manufacturer"
                      placeholder="Начните вводить"
                      autocomplete="off"
                      required
                    />
                    <div
                      class="suggestions is-hidden"
                      data-tool-manufacturer-suggestions
                    ></div>
                  </label>
                  <label class="form-field form-field--required">
                    <span class="form-label">Модель</span>
                    <input
                      class="form-input"
                      id="tool-model-input"
                      type="text"
                      name="tool-model"
                      placeholder="Начните вводить"
                      autocomplete="off"
                      required
                    />
                    <div
                      class="suggestions is-hidden"
                      data-tool-model-suggestions
                    ></div>
                  </label>
                  <label class="form-field">
                    <span class="form-label">Наименование по бухгалтерии</span>
                    <input
                      class="form-input"
                      type="text"
                      name="tool-accounting-name"
                      placeholder="Можно оставить пустым"
                      autocomplete="off"
                    />
                  </label>
                  <label class="form-field form-field--required">
                    <span class="form-label">Стоимость</span>
                    <input
                      class="form-input"
                      type="text"
                      inputmode="decimal"
                      name="tool-cost"
                      placeholder="Например, 12500"
                      autocomplete="off"
                      required
                    />
                  </label>
                  <label class="form-field form-field--required">
                    <span class="form-label">Ответственный</span>
                    <input
                      class="form-input"
                      id="tool-responsible-input"
                      type="text"
                      name="tool-responsible"
                      data-placeholder="Выберите из списка"
                      placeholder="Выберите из списка"
                      autocomplete="off"
                      required
                    />
                    <div
                      class="suggestions is-hidden"
                      data-tool-responsible-suggestions
                    ></div>
                  </label>
                  <label class="form-field form-field--required">
                    <span class="form-label">Объект</span>
                    <input
                      class="form-input"
                      id="tool-object-input"
                      type="text"
                      name="tool-object"
                      data-placeholder="Выберите объект"
                      placeholder="Выберите объект"
                      autocomplete="off"
                      required
                    />
                    <div
                      class="suggestions is-hidden"
                      data-tool-object-suggestions
                    ></div>
                  </label>
                  <label class="form-field">
                    <span class="form-label">Серийный номер</span>
                    <input
                      class="form-input"
                      type="text"
                      name="tool-serial-number"
                      placeholder="Можно оставить пустым"
                      autocomplete="off"
                    />
                  </label>
                  <label class="form-field form-field--required">
                    <span class="form-label">Граппа инструментов</span>
                    <input
                      class="form-input"
                      id="tool-group-input"
                      type="text"
                      name="tool-group"
                      data-placeholder="Выберите группу"
                      placeholder="Выберите группу"
                      autocomplete="off"
                      required
                    />
                    <div
                      class="suggestions is-hidden"
                      data-tool-group-suggestions
                    ></div>
                  </label>
                  <div class="form-field form-field--required">
                    <span class="form-label">Накладная (обязательно)</span>
                    <div class="form-file-row">
                      <label class="form-file-option">
                        <input
                          class="form-input form-input--file"
                          type="file"
                          name="tool-invoice"
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        />
                        <span class="form-file-button" aria-hidden="true">
                          Добавить файл
                        </span>
                      </label>
                      <label class="form-file-option">
                        <input
                          class="form-input form-input--file"
                          type="file"
                          name="tool-invoice-photo"
                          accept="image/*"
                          capture="environment"
                        />
                        <span class="form-file-button" aria-hidden="true">
                          Добавить фото
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div class="settings-modal__footer add-tool-modal__footer">
                <div class="add-tool-modal__footer-row">
                  <div
                    class="form-message form-message--inline"
                    role="status"
                    aria-live="polite"
                    data-add-tool-message
                  ></div>
                  <div class="settings-modal__actions add-tool-modal__actions">
                    <button
                      class="action-secondary"
                      type="button"
                      data-add-tool-cancel
                    >
                      Отмена
                    </button>
                    <button class="action-primary" type="submit">Сохранить</button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
        <div
          class="settings-modal camera-modal is-hidden"
          data-add-tool-camera-modal
        >
          <div
            class="settings-modal__backdrop"
            data-add-tool-camera-backdrop
          ></div>
          <div
            class="settings-modal__panel camera-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Фото накладной"
          >
            <div class="settings-modal__header camera-modal__header">
              <div class="settings-modal__title">
                <h2>Фото накладной</h2>
                <p>Сделайте снимок и подтвердите</p>
              </div>
              <button
                class="button-icon camera-modal__close"
                type="button"
                data-add-tool-camera-close
                aria-label="Закрыть камеру"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body camera-modal__body">
              <div class="camera-preview" data-add-tool-camera-preview>
                <video
                  class="camera-preview__video"
                  data-add-tool-camera-video
                  autoplay
                  playsinline
                ></video>
                <canvas
                  class="camera-preview__canvas is-hidden"
                  data-add-tool-camera-canvas
                ></canvas>
              </div>
              <div class="camera-hint" data-add-tool-camera-hint>
                Держите накладную в кадре и нажмите «Сфотографировать».
              </div>
            </div>
            <div class="settings-modal__footer camera-modal__footer">
              <button
                class="action-secondary"
                type="button"
                data-add-tool-camera-cancel
              >
                Отмена
              </button>
              <button
                class="action-primary"
                type="button"
                data-add-tool-camera-capture
              >
                Сфотографировать
              </button>
              <button
                class="action-secondary is-hidden"
                type="button"
                data-add-tool-camera-retake
              >
                Переснять
              </button>
              <button
                class="action-primary is-hidden"
                type="button"
                data-add-tool-camera-save
              >
                Использовать фото
              </button>
            </div>
          </div>
        </div>
        <div
          class="settings-modal add-tool-success-modal is-hidden"
          data-add-tool-success-modal
        >
          <div
            class="settings-modal__backdrop"
            data-add-tool-success-backdrop
          ></div>
          <div
            class="settings-modal__panel add-tool-success-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Новая МТЦ сохранена"
          >
            <div class="settings-modal__header add-tool-success-modal__header">
              <div class="settings-modal__title">
                <h2 data-add-tool-success-title>Готово!</h2>
                <p data-add-tool-success-message>Новая позиция добавлена в базу</p>
              </div>
              <button
                class="button-icon add-tool-success-modal__close"
                type="button"
                data-add-tool-success-close
                aria-label="Закрыть окно"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body add-tool-success-modal__body">
              <div class="success-card">
                <div class="success-card__label" data-add-tool-success-label>
                  Присвоенный номер
                </div>
                <div class="success-card__number" data-add-tool-success-number>
                  —
                </div>
                <div class="success-card__note">
                  Данные сохранены и доступны в списке МТЦ.
                </div>
              </div>
            </div>
            <div class="settings-modal__footer add-tool-success-modal__footer">
              <button
                class="action-primary"
                type="button"
                data-add-tool-success-confirm
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
        <div class="settings-modal users-details-modal is-hidden" data-users-details-modal>
          <div class="settings-modal__backdrop" data-users-details-backdrop></div>
          <div
            class="settings-modal__panel users-details-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Пользователи организации"
          >
            <div class="settings-modal__header users-details-modal__header">
              <div class="settings-modal__title users-details-modal__title">
                <h2 data-users-details-name>Организация</h2>
                <p data-users-details-count>—</p>
              </div>
              <button
                class="button-icon users-details-modal__close"
                type="button"
                data-users-details-close
                aria-label="Закрыть окно пользователей организации"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body users-details-modal__body">
              <div class="users-details">
                <button class="users-details__add" type="button" data-users-add>
                  <span class="users-details__add-icon" aria-hidden="true">➕</span>
                  <span class="users-details__add-text">Добавить пользователя</span>
                </button>
                <div class="users-details__list" data-users-details-list></div>
                <div class="users-details__empty is-hidden" data-users-details-empty>
                  В этой организации ещё нет пользователей.
                </div>
                <div
                  class="registration-box users-details__invite is-hidden"
                  data-users-invite-box
                >
                  <div class="registration-title">Приглашение для ответственного</div>
                  <p class="registration-hint" data-users-invite-hint>
                    Нажмите на ответственного без ID в списке, чтобы сформировать ссылку.
                  </p>
                  <p class="registration-note" data-users-invite-note>
                    Откройте ссылку в Telegram — ID сохранится автоматически.
                  </p>
                  <ul class="registration-steps">
                    <li><strong>1.</strong> Откройте ссылку в Telegram.</li>
                    <li><strong>2.</strong> Подтвердите запуск мини‑приложения.</li>
                    <li><strong>3.</strong> ID сохранится автоматически.</li>
                  </ul>
                  <div class="registration-actions">
                    <div class="registration-links">
                      <div class="registration-link-row">
                        <input
                          class="form-input"
                          type="text"
                          readonly
                          aria-label="Ссылка для открытия в Telegram"
                          data-users-invite-link
                        />
                        <button
                          class="button-icon"
                          type="button"
                          data-users-invite-share
                          aria-label="Отправить контакт в Telegram"
                          title="Отправить контакт в Telegram"
                        >
                          <span class="button-icon-emoji">✈️</span>
                        </button>
                        <button
                          class="button-icon"
                          type="button"
                          data-users-invite-copy
                          aria-label="Скопировать ссылку"
                          title="Скопировать ссылку"
                        >
                          <span class="button-icon-emoji">📋</span>
                        </button>
                      </div>
                    </div>
                    <div class="registration-buttons">
                      <button
                        class="action-primary button-telegram"
                        type="button"
                        data-users-invite-open
                      >
                        Открыть в Telegram
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="settings-modal users-add-modal is-hidden" data-users-add-modal>
          <div class="settings-modal__backdrop" data-users-add-backdrop></div>
          <div
            class="settings-modal__panel users-add-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Добавить пользователя"
          >
            <div class="settings-modal__header users-add-modal__header">
              <div class="settings-modal__title">
                <h2>Новый пользователь</h2>
                <div class="users-add__meta">
                  <span>Организация:</span>
                  <span class="users-add__org" data-users-add-org-name>—</span>
                </div>
              </div>
              <button
                class="button-icon users-add-modal__close"
                type="button"
                data-users-add-close
                aria-label="Закрыть окно добавления пользователя"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body users-add-modal__body">
              <div class="form-card users-add__form">
                <form class="form-grid" data-users-add-form>
                  <div class="form-field">
                    <label class="form-label" for="users-add-last-name">Фамилия</label>
                    <input
                      class="form-input"
                      type="text"
                      id="users-add-last-name"
                      name="users-add-last-name"
                      autocomplete="family-name"
                      placeholder="Иванов"
                      required
                    />
                  </div>
                  <div class="form-field">
                    <label class="form-label" for="users-add-first-name">Имя</label>
                    <input
                      class="form-input"
                      type="text"
                      id="users-add-first-name"
                      name="users-add-first-name"
                      autocomplete="given-name"
                      placeholder="Иван"
                      required
                    />
                    <div
                      class="suggestions is-hidden"
                      role="listbox"
                      aria-label="Подсказки по имени"
                      data-users-add-first-name-suggestions
                    ></div>
                  </div>
                  <div class="form-field">
                    <label class="form-label" for="users-add-middle-name">Отчество</label>
                    <input
                      class="form-input"
                      type="text"
                      id="users-add-middle-name"
                      name="users-add-middle-name"
                      autocomplete="additional-name"
                      placeholder="Иванович"
                      required
                    />
                    <div
                      class="suggestions is-hidden"
                      role="listbox"
                      aria-label="Подсказки по отчеству"
                      data-users-add-middle-name-suggestions
                    ></div>
                  </div>
                  <div class="form-field">
                    <label class="form-label" for="users-add-role">Роль пользователя</label>
                    <select class="form-input" id="users-add-role" name="users-add-role" required>
                      <option value="" disabled selected>Выберите роль</option>
                      <option value="Бухгалтерия">Бухгалтерия</option>
                      <option value="Главный инженер">Главный инженер</option>
                      <option value="Энергетик">Энергетик</option>
                      <option value="Руководитель">Руководитель</option>
                      <option value="Ответственный">Ответственный</option>
                    </select>
                  </div>
                  <p class="users-add__note">
                    После сохранения появится ссылка‑приглашение для регистрации пользователя.
                  </p>
                  <div class="form-actions">
                    <button class="action-primary" type="submit">Сформировать ссылку</button>
                    <button class="button-secondary" type="button" data-users-add-cancel>
                      Отменить
                    </button>
                  </div>
                  <div class="form-message" role="status" data-users-add-message></div>
                  <div
                    class="registration-box users-details__invite is-hidden"
                    data-users-add-invite-box
                  >
                    <div class="registration-title">Ссылка для нового пользователя</div>
                    <p class="registration-hint" data-users-add-invite-hint>
                      Заполните данные пользователя и выберите роль.
                    </p>
                    <p class="registration-note" data-users-add-invite-note>
                      Откройте ссылку в Telegram — ID сохранится автоматически.
                    </p>
                    <ul class="registration-steps">
                      <li><strong>1.</strong> Откройте ссылку в Telegram.</li>
                      <li><strong>2.</strong> Подтвердите запуск мини‑приложения.</li>
                      <li><strong>3.</strong> ID сохранится автоматически.</li>
                    </ul>
                    <div class="registration-actions">
                      <div class="registration-links">
                        <div class="registration-link-row">
                          <input
                            class="form-input"
                            type="text"
                            readonly
                            aria-label="Ссылка для открытия в Telegram"
                            data-users-add-invite-link
                          />
                          <button
                            class="button-icon"
                            type="button"
                            data-users-add-invite-share
                            aria-label="Отправить контакт в Telegram"
                            title="Отправить контакт в Telegram"
                          >
                            <span class="button-icon-emoji">✈️</span>
                          </button>
                          <button
                            class="button-icon"
                            type="button"
                            data-users-add-invite-copy
                            aria-label="Скопировать ссылку"
                            title="Скопировать ссылку"
                          >
                            <span class="button-icon-emoji">📋</span>
                          </button>
                        </div>
                      </div>
                      <div class="registration-buttons">
                        <button
                          class="action-primary button-telegram"
                          type="button"
                          data-users-add-invite-open
                        >
                          Открыть в Telegram
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}
