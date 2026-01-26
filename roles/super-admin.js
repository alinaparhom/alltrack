export const roleId = "Супер-администратор";

export function renderRole(user) {
  return `
    <section class="role-card">
      <div class="dashboard" data-super-admin-dashboard>
        <div class="dashboard-stats">
          <button class="stat-card stat-card--action" type="button" data-open-orgs>
            <div class="stat-card-header">
              <span class="stat-icon">🏢</span>
              <div class="stat-label">Организаций</div>
            </div>
            <div class="stat-row">
              <span class="stat-value" data-org-count>—</span>
              <span class="stat-pill">в реестре</span>
            </div>
          </button>
          <button class="stat-card stat-card--action" type="button" data-open-users>
            <div class="stat-card-header">
              <span class="stat-icon">👥</span>
              <div class="stat-label">Пользователей</div>
            </div>
            <div class="stat-row">
              <span class="stat-value" data-user-count>—</span>
              <span class="stat-pill">активных</span>
            </div>
          </button>
          <div class="stat-card">
            <div class="stat-card-header">
              <span class="stat-icon">💬</span>
              <div class="stat-label">Обратная связь</div>
            </div>
            <div class="stat-row">
              <span class="stat-value">9</span>
              <span class="stat-pill">в работе</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-header">
              <span class="stat-icon">🛡️</span>
              <div class="stat-label">Инцидентов</div>
            </div>
            <div class="stat-row">
              <span class="stat-value">3</span>
              <span class="stat-pill">в работе</span>
            </div>
          </div>
        </div>
        <div class="action-grid">
          <button class="action-card" type="button">
            <span class="action-icon">💳</span>
            <div class="action-title">Оплаты</div>
          </button>
          <button class="action-card" type="button">
            <span class="action-icon">⚙️</span>
            <div class="action-title">Настройки</div>
          </button>
          <button class="action-card" type="button">
            <span class="action-icon">👤</span>
            <div class="action-title">Добавить пользователя</div>
          </button>
          <button class="action-card" type="button">
            <span class="action-icon">📤</span>
            <div class="action-title">Выгрузить данные</div>
          </button>
        </div>
        <button class="action-primary" type="button" data-open-add-org>
          <span class="action-icon">➕</span>
          Добавить организацию
        </button>
      </div>
      <div class="dashboard is-hidden" data-add-org-section>
        <div class="section-pill"><span class="section-icon">🏢</span>Добавить организацию</div>
        <div class="form-card">
          <form class="form-grid" data-add-org-form>
            <div class="form-field">
              <label class="form-label" for="org-full-name">Наименование организации</label>
              <input
                class="form-input"
                type="text"
                id="org-full-name"
                name="org-full-name"
                autocomplete="organization"
                placeholder="ООО «Пример»"
                required
              />
            </div>
            <div class="form-field">
              <label class="form-label" for="org-short-name">Краткое название организации</label>
              <input
                class="form-input"
                type="text"
                id="org-short-name"
                name="org-short-name"
                autocomplete="organization"
                placeholder="Пример"
                required
              />
            </div>
            <div class="form-field">
              <span class="form-label">Тип номера организации</span>
              <div class="toggle-group" role="radiogroup" aria-label="Тип номера организации">
                <input
                  class="toggle-input"
                  type="radio"
                  id="org-number-application"
                  name="org-number-type"
                  value="Номер приложения"
                  checked
                  required
                />
                <label class="toggle-option" for="org-number-application">
                  Номер приложения
                </label>
                <input
                  class="toggle-input"
                  type="radio"
                  id="org-number-accounting"
                  name="org-number-type"
                  value="Бухгалтерский номер"
                  required
                />
                <label class="toggle-option" for="org-number-accounting">
                  Бухгалтерский номер
                </label>
              </div>
            </div>
            <div class="form-field">
              <label class="form-label" for="energy-last-name">Фамилия энергетика</label>
              <input
                class="form-input"
                type="text"
                id="energy-last-name"
                name="energy-last-name"
                autocomplete="family-name"
                placeholder="Иванов"
                required
              />
            </div>
            <div class="form-field">
              <label class="form-label" for="energy-first-name">Имя энергетика</label>
              <input
                class="form-input"
                type="text"
                id="energy-first-name"
                name="energy-first-name"
                autocomplete="given-name"
                placeholder="Иван"
                required
              />
            </div>
            <div class="form-field">
              <label class="form-label" for="energy-middle-name">Отчество энергетика</label>
              <input
                class="form-input"
                type="text"
                id="energy-middle-name"
                name="energy-middle-name"
                autocomplete="additional-name"
                placeholder="Иванович"
                required
              />
            </div>
            <div class="form-actions">
              <button class="action-primary" type="submit">Сохранить</button>
              <button class="button-secondary" type="button" data-back-dashboard>
                Отменить
              </button>
            </div>
            <div class="form-message" role="status" data-form-message></div>
            <div class="registration-box is-hidden" data-registration-box>
              <div class="registration-title">Ссылка для регистрации энергетика</div>
              <p class="registration-hint">
                Отправьте ссылку в Telegram. При открытии в приложении Telegram ID пользователя
                сразу сохранится в базе, и он попадёт на страницу своей роли.
              </p>
              <p class="registration-note" data-telegram-note>
                Если бот ещё не настроен, используйте копирование ссылки.
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
                      data-registration-link
                    />
                    <button
                      class="button-icon"
                      type="button"
                      data-share-telegram
                      aria-label="Отправить контакт в Telegram"
                      title="Отправить контакт в Telegram"
                    >
                      <span class="button-icon-emoji">✈️</span>
                    </button>
                    <button
                      class="button-icon"
                      type="button"
                      data-copy-registration
                      aria-label="Скопировать ссылку"
                      title="Скопировать ссылку"
                    >
                      <span class="button-icon-emoji">📋</span>
                    </button>
                  </div>
                </div>
                <div class="registration-buttons">
                  <button class="action-primary button-telegram" type="button" data-open-telegram>
                    Открыть в Telegram
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
      <div class="settings-modal orgs-modal is-hidden" data-orgs-modal>
        <div class="settings-modal__backdrop" data-orgs-backdrop></div>
        <div
          class="settings-modal__panel orgs-modal__panel"
          role="dialog"
          aria-modal="true"
          aria-label="Организации"
        >
          <div class="settings-modal__header orgs-modal__header">
            <div class="settings-modal__title">
              <h2>Организации</h2>
            </div>
            <button
              class="button-icon orgs-modal__close"
              type="button"
              data-orgs-close
              aria-label="Закрыть окно организаций"
            >
              <span class="button-icon-emoji" aria-hidden="true">✕</span>
            </button>
          </div>
          <div class="settings-modal__body orgs-modal__body">
            <div class="orgs-layout">
              <div class="orgs-table">
                <div class="orgs-table__body" data-orgs-list></div>
                <div class="orgs-empty is-hidden" data-orgs-empty>
                  Пока нет организаций. Добавьте первую организацию через кнопку «Добавить организацию».
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="settings-modal orgs-details-modal is-hidden" data-orgs-details-modal>
        <div class="settings-modal__backdrop" data-orgs-details-backdrop></div>
        <div
          class="settings-modal__panel orgs-details-modal__panel"
          role="dialog"
          aria-modal="true"
          aria-label="Детали организации"
        >
          <div class="settings-modal__header orgs-details-modal__header">
            <div class="settings-modal__title orgs-details-modal__title">
              <h2 data-orgs-details-name>Организация</h2>
              <p data-orgs-details-launch>Дата запуска</p>
            </div>
            <button
              class="button-icon orgs-details-modal__close"
              type="button"
              data-orgs-details-close
              aria-label="Закрыть окно деталей"
            >
              <span class="button-icon-emoji" aria-hidden="true">✕</span>
            </button>
          </div>
          <div class="settings-modal__body orgs-details-modal__body">
            <div class="orgs-details">
              <div class="orgs-details__hero" aria-hidden="true"></div>
              <div class="orgs-details__content">
                <div class="orgs-details__header">
                  <div class="orgs-details__title" aria-hidden="true"></div>
                </div>
                <div class="orgs-metrics">
                  <div class="orgs-metric">
                    <div class="orgs-metric__label">Пользователей</div>
                    <div class="orgs-metric__value" data-orgs-detail-users>—</div>
                  </div>
                  <div class="orgs-metric">
                    <div class="orgs-metric__label">Инструментов в базе</div>
                    <div class="orgs-metric__value" data-orgs-detail-tools-total>—</div>
                    <div class="orgs-metric__hint">концепция</div>
                  </div>
                  <div class="orgs-metric">
                    <div class="orgs-metric__label">Инструментов в работе</div>
                    <div class="orgs-metric__value" data-orgs-detail-tools-active>—</div>
                    <div class="orgs-metric__hint">концепция</div>
                  </div>
                </div>
                <div class="orgs-energy">
                  <div class="orgs-energy__header">
                    <h4>Энергетики</h4>
                  </div>
                  <div class="orgs-energy__list" data-orgs-energy-list></div>
                  <div class="registration-box orgs-energy__invite is-hidden" data-energy-invite-box>
                    <div class="registration-title">Приглашение для энергетика</div>
                    <p class="registration-hint" data-energy-invite-hint>
                      Выберите энергетика в списке, чтобы сформировать ссылку.
                    </p>
                    <p class="registration-note" data-energy-invite-note>
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
                            data-energy-invite-link
                          />
                          <button
                            class="button-icon"
                            type="button"
                            data-energy-invite-share
                            aria-label="Отправить контакт в Telegram"
                            title="Отправить контакт в Telegram"
                          >
                            <span class="button-icon-emoji">✈️</span>
                          </button>
                          <button
                            class="button-icon"
                            type="button"
                            data-energy-invite-copy
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
                          data-energy-invite-open
                        >
                          Открыть в Telegram
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    class="orgs-details__upload"
                    type="button"
                    data-orgs-upload
                    aria-label="Загрузить данные"
                  >
                    <span class="orgs-details__upload-icon" aria-hidden="true">📥</span>
                    <span class="orgs-details__upload-text">Загрузить данные</span>
                  </button>
                  <input
                    class="orgs-details__upload-input"
                    type="file"
                    accept=".xlsx,.xls"
                    data-orgs-upload-input
                    aria-label="Загрузить Excel файл"
                  />
                  <div class="orgs-details__upload-status" data-orgs-upload-status role="status"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="settings-modal users-modal is-hidden" data-users-modal>
        <div class="settings-modal__backdrop" data-users-backdrop></div>
        <div
          class="settings-modal__panel users-modal__panel"
          role="dialog"
          aria-modal="true"
          aria-label="Пользователи"
        >
          <div class="settings-modal__header users-modal__header">
            <div class="settings-modal__title">
              <h2>Пользователи</h2>
              <p class="users-modal__subtitle">Все организации</p>
            </div>
            <button
              class="button-icon users-modal__close"
              type="button"
              data-users-close
              aria-label="Закрыть окно пользователей"
            >
              <span class="button-icon-emoji" aria-hidden="true">✕</span>
            </button>
          </div>
          <div class="settings-modal__body users-modal__body">
            <div class="users-orgs">
              <div class="users-orgs__list" data-users-orgs-list></div>
              <div class="users-orgs__empty is-hidden" data-users-orgs-empty>
                Пока нет организаций. Добавьте первую организацию через кнопку «Добавить организацию».
              </div>
            </div>
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
    </section>
  `;
}
