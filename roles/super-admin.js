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
          <button class="stat-card stat-card--action" type="button" data-open-feedback>
            <div class="stat-card-header">
              <span class="stat-icon">💬</span>
              <div class="stat-label">Обратная связь</div>
            </div>
            <div class="stat-row">
              <span class="stat-value" data-feedback-pending-count>—</span>
              <span class="stat-pill">не обработано</span>
            </div>
          </button>
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
      <div class="settings-modal feedback-modal is-hidden" data-feedback-modal>
        <div class="settings-modal__backdrop" data-feedback-backdrop></div>
        <div
          class="settings-modal__panel feedback-modal__panel"
          role="dialog"
          aria-modal="true"
          aria-label="Обращения пользователей"
        >
          <div class="settings-modal__header feedback-modal__header">
            <div class="settings-modal__title">
              <h2>Обратная связь</h2>
              <p data-feedback-summary>Загружаем обращения...</p>
            </div>
            <button
              class="button-icon feedback-modal__close"
              type="button"
              data-feedback-close
              aria-label="Закрыть окно обратной связи"
            >
              <span class="button-icon-emoji" aria-hidden="true">✕</span>
            </button>
          </div>
          <div class="settings-modal__body feedback-modal__body">
            <div class="feedback-tabs" role="tablist" aria-label="Разделы обращений">
              <button
                class="feedback-tab is-active"
                type="button"
                role="tab"
                aria-selected="true"
                data-feedback-tab="new"
              >
                Новые
                <span class="feedback-tab__count" data-feedback-count="new">0</span>
              </button>
              <button
                class="feedback-tab"
                type="button"
                role="tab"
                aria-selected="false"
                data-feedback-tab="in-progress"
              >
                В работе
                <span class="feedback-tab__count" data-feedback-count="in-progress">0</span>
              </button>
              <button
                class="feedback-tab"
                type="button"
                role="tab"
                aria-selected="false"
                data-feedback-tab="closed"
              >
                Закрытые
                <span class="feedback-tab__count" data-feedback-count="closed">0</span>
              </button>
            </div>
            <div class="feedback-board" data-feedback-board>
              <section class="feedback-column" data-feedback-column="new">
                <div class="feedback-column__head">
                  <h3>Новые</h3>
                </div>
                <div class="feedback-column__list" data-feedback-list="new"></div>
              </section>
              <section class="feedback-column" data-feedback-column="in-progress">
                <div class="feedback-column__head">
                  <h3>В работе</h3>
                </div>
                <div class="feedback-column__list" data-feedback-list="in-progress"></div>
              </section>
              <section class="feedback-column" data-feedback-column="closed">
                <div class="feedback-column__head">
                  <h3>Закрытые</h3>
                </div>
                <div class="feedback-column__list" data-feedback-list="closed"></div>
              </section>
            </div>
            <div class="form-message" data-feedback-status></div>
          </div>
        </div>
      </div>
      <div class="settings-modal feedback-details-modal is-hidden" data-feedback-details-modal>
        <div class="settings-modal__backdrop" data-feedback-details-backdrop></div>
        <div
          class="settings-modal__panel feedback-details-modal__panel"
          role="dialog"
          aria-modal="true"
          aria-label="Детали обращения"
        >
          <div class="settings-modal__header feedback-details-modal__header">
            <div class="settings-modal__title">
              <div class="feedback-details-modal__title-row" style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
                <h2 data-feedback-details-title>Обращение</h2>
                <button
                  class="button-icon feedback-details-modal__close"
                  type="button"
                  data-feedback-details-close
                  aria-label="Закрыть детали обращения"
                >
                  <span class="button-icon-emoji" aria-hidden="true">✕</span>
                </button>
              </div>
              <p data-feedback-details-meta>Загрузка...</p>
            </div>
          </div>
          <div class="settings-modal__body feedback-details-modal__body">
            <div class="feedback-details-card">
              <div class="feedback-details-card__text" data-feedback-details-text></div>
              <div class="feedback-details-card__photos" data-feedback-details-photos></div>
            </div>
            <div class="feedback-details-actions">
              <button class="action-secondary" type="button" data-feedback-action="reject">
                Отклонить
              </button>
              <button class="action-secondary" type="button" data-feedback-action="in-progress">
                Взять в работу
              </button>
              <button class="action-primary" type="button" data-feedback-action="close">
                Закрыть задачу
              </button>
            </div>
            <div class="form-message" data-feedback-details-status></div>
          </div>
        </div>
      </div>
      <div
        class="feedback-photo-viewer is-hidden"
        data-feedback-photo-viewer
        style="position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.72);backdrop-filter:blur(6px);"
        role="dialog"
        aria-modal="true"
        aria-label="Просмотр фото"
      >
        <button
          type="button"
          data-feedback-photo-close
          aria-label="Закрыть полноэкранное фото"
          style="position:absolute;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));min-width:56px;height:44px;padding:0 14px;border-radius:14px;border:1px solid rgba(255,255,255,.45);background:rgba(255,255,255,.2);backdrop-filter:blur(8px);color:#fff;font-size:22px;line-height:1;display:inline-flex;align-items:center;justify-content:center;"
        >
          ✕
        </button>
        <img
          data-feedback-photo-image
          alt=""
          style="max-width:min(100%,980px);max-height:calc(100vh - 32px);width:auto;height:auto;border-radius:16px;box-shadow:0 24px 48px rgba(15,23,42,.45);object-fit:contain;background:#fff;"
        />
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
                  <button
                    class="orgs-details__upload orgs-details__upload--photo"
                    type="button"
                    data-orgs-upload-photo
                    aria-label="Загрузить фото"
                  >
                    <span class="orgs-details__upload-icon" aria-hidden="true">🖼️</span>
                    <span class="orgs-details__upload-text">Загрузить фото</span>
                  </button>
                  <button
                    class="orgs-details__upload orgs-details__upload--groups"
                    type="button"
                    data-orgs-manage-groups
                    aria-label="Управление группами"
                  >
                    <span class="orgs-details__upload-icon" aria-hidden="true">🧩</span>
                    <span class="orgs-details__upload-text">Управление группами</span>
                  </button>
                  <input
                    class="orgs-details__upload-input"
                    type="file"
                    accept=".xlsx,.xls"
                    data-orgs-upload-input
                    aria-label="Загрузить Excel файл"
                  />
                  <input
                    class="orgs-details__upload-input"
                    type="file"
                    accept="image/*"
                    multiple
                    data-orgs-upload-photo-input
                    aria-label="Загрузить фото организации"
                  />
                  <div class="orgs-details__upload-progress is-hidden" data-orgs-upload-progress>
                    <div class="upload-progress__header">
                      <span class="upload-progress__label">Обработка фото</span>
                      <span class="upload-progress__value" data-orgs-upload-progress-value>0%</span>
                    </div>
                    <div
                      class="upload-progress__track"
                      role="progressbar"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-valuenow="0"
                      data-orgs-upload-progress-track
                    >
                      <div class="upload-progress__fill" data-orgs-upload-progress-fill></div>
                      <div class="upload-progress__thumb" data-orgs-upload-progress-thumb>
                        <span class="upload-progress__thumb-icon" aria-hidden="true">🛠️</span>
                      </div>
                    </div>
                    <div class="upload-progress__hint" data-orgs-upload-progress-hint>
                      Готовим инструменты к загрузке...
                    </div>
                  </div>
                  <div class="orgs-details__upload-status" data-orgs-upload-status role="status"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="settings-modal orgs-groups-modal is-hidden" data-orgs-groups-modal>
        <div class="settings-modal__backdrop" data-orgs-groups-backdrop></div>
        <div
          class="settings-modal__panel orgs-groups-modal__panel"
          role="dialog"
          aria-modal="true"
          aria-label="Группы рассылок"
        >
          <div class="settings-modal__header orgs-groups-modal__header">
            <div class="settings-modal__title">
              <h2>Группы рассылок</h2>
              <p data-orgs-groups-subtitle>Организация</p>
            </div>
            <button
              class="button-icon orgs-groups-modal__close"
              type="button"
              data-orgs-groups-close
              aria-label="Закрыть окно групп"
            >
              <span class="button-icon-emoji" aria-hidden="true">✕</span>
            </button>
          </div>
          <form class="settings-modal__form" data-orgs-groups-form>
            <div class="settings-modal__body orgs-groups-modal__body">
              <div class="orgs-groups__list" data-orgs-groups-list></div>
              <button class="action-secondary orgs-groups__add" type="button" data-orgs-groups-add>
                Добавить группу
              </button>
            </div>
            <div class="settings-modal__footer orgs-groups-modal__footer">
              <button class="action-primary orgs-groups__save" type="submit" data-orgs-groups-save>
                Сохранить
              </button>
            </div>
            <div class="form-message" data-orgs-groups-message></div>
          </form>
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
                <div class="registration-title">Приглашение для пользователя</div>
                <p class="registration-hint" data-users-invite-hint>
                  Нажмите на пользователя без ID в списке, чтобы сформировать новую ссылку.
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
                <div class="form-field">
                  <label class="form-label" for="users-add-position">Должность</label>
                  <input
                    class="form-input"
                    type="text"
                    id="users-add-position"
                    name="users-add-position"
                    autocomplete="organization-title"
                    placeholder="Например: мастер участка"
                    required
                  />
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
