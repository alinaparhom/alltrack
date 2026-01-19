export const roleId = "Супер-администратор";

export function renderRole(user) {
  return `
    <section class="role-card">
      <div class="dashboard" data-super-admin-dashboard>
        <div class="section-pill"><span class="section-icon">📊</span>Статистика</div>
        <div class="dashboard-stats">
          <div class="stat-card">
            <div class="stat-card-header">
              <span class="stat-icon">🏢</span>
              <div class="stat-label">Организаций</div>
            </div>
            <div class="stat-row">
              <span class="stat-value" data-org-count>—</span>
              <span class="stat-pill">в реестре</span>
            </div>
          </div>
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
                Отправьте ссылку в Telegram. После открытия она закрепит пользователя за этой
                организацией.
              </p>
              <div class="registration-actions">
                <div class="registration-link-row">
                  <input
                    class="form-input"
                    type="text"
                    readonly
                    aria-label="Ссылка для регистрации"
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
                </div>
                <button class="button-secondary" type="button" data-copy-registration>
                  Скопировать ссылку
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  `;
}
