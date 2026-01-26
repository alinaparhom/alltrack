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
          <div class="stat-card">
            <div class="stat-card-header">
              <span class="stat-icon">👥</span>
              <div class="stat-label">Пользователей</div>
            </div>
            <div class="stat-row">
              <span class="stat-value" data-user-count>—</span>
              <span class="stat-pill">активных</span>
            </div>
          </div>
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
              <button
                class="button-icon orgs-details__upload"
                type="button"
                data-orgs-upload
                aria-label="Загрузить данные"
                title="Загрузить данные"
              >
                <span class="button-icon-emoji" aria-hidden="true">📥</span>
              </button>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}
