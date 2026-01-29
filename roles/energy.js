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
                  <label class="form-field">
                    <span class="form-label">Бух.номер</span>
                    <input
                      class="form-input"
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
                  <label class="form-field form-field--required">
                    <span class="form-label">Накладная (обязательно)</span>
                    <input
                      class="form-input"
                      type="file"
                      name="tool-invoice"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      required
                    />
                    <span class="form-hint">Необходимо прикрепить накладную.</span>
                  </label>
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
                <h2>Готово!</h2>
                <p>Новая позиция добавлена в базу</p>
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
                <div class="success-card__label">Присвоенный номер</div>
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
