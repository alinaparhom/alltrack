export const roleId = "Энергетик";

export const energyActions = [
  { id: "tools", title: "Мои инструменты", icon: "🔧" },
  { id: "add-tool", title: "Новая единица", icon: '<span class="action-icon--positive">✚</span>' },
  { id: "base", title: "Редактировать базу", icon: "🗂️" },
  { id: "search", title: "Поиск", icon: "🔍" },
  { id: "move-other", title: "Переместить за других", icon: "↔️" },
  { id: "write-off", title: "Списать", icon: "🧾" },
  { id: "write-off-pending", title: "На списание", icon: "📋" },
  { id: "repair", title: "Ремонт", icon: "🛠️" },
  { id: "breakdowns", title: "Поломки", icon: "⚠️" },
  { id: "demand", title: "Заявки", icon: "📌" },
  { id: "objects", title: "Объекты", icon: "🏢" },
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
        <div class="tools-map-card" data-tools-map>
          <div
            class="tools-map-header"
            data-tools-map-collapsed-trigger
            role="button"
            tabindex="0"
            aria-label="Развернуть карту объектов"
          >
            <div class="tools-map-collapsed-info">
              <span class="tools-map-collapsed-logo" aria-hidden="true">BM</span>
              <div class="tools-map-collapsed-site"><strong>bimmax.pro</strong></div>
            </div>
            <div class="tools-map-header-actions">
              <button
                class="tools-map-toggle tools-map-toggle--header"
                type="button"
                data-tools-map-toggle
                aria-expanded="true"
                aria-label="Свернуть карту"
              >
                <span aria-hidden="true">Карта</span>
              </button>
            </div>
          </div>
          <div
            class="tools-map-canvas"
            data-tools-map-canvas
            tabindex="0"
            role="button"
            aria-label="Нажмите, чтобы оживить карту, масштабировать и перемещать"
          >
            <div class="tools-map-layer" data-tools-map-layer>
              <img
                class="tools-map-image is-hidden"
                data-tools-map-image
                alt="Карта объектов"
                loading="lazy"
              />
              <div class="tools-map-placeholder" data-tools-map-placeholder>
                Пока нет координат объектов.
              </div>
            </div>
            <button
              class="tools-map-toggle tools-map-toggle--overlay"
              type="button"
              data-tools-map-toggle-overlay
              aria-expanded="true"
              aria-label="Свернуть карту"
            >
              <span aria-hidden="true">▾</span>
            </button>
          </div>
        </div>
        <div class="energy-actions-scroll" data-energy-actions-scroll>
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
        <div class="feedback-modal settings-modal is-hidden" data-energy-feedback-modal>
          <div class="settings-modal__backdrop" data-energy-feedback-backdrop></div>
          <div
            class="settings-modal__panel feedback-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Обратная связь"
          >
            <div class="settings-modal__header feedback-modal__header">
              <div class="settings-modal__title">
                <h2>Обратная связь</h2>
                <p class="feedback-modal__subtitle">Напишите пожелание, проблему или предложение</p>
              </div>
              <button
                class="button-icon"
                type="button"
                data-energy-feedback-close
                aria-label="Закрыть окно обратной связи"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <form class="settings-modal__form feedback-modal__form" data-energy-feedback-form>
              <div class="settings-modal__body feedback-modal__body">
                <div class="form-field">
                  <label for="feedback-message">Текст обращения</label>
                  <textarea
                    id="feedback-message"
                    class="form-input"
                    data-energy-feedback-message
                    rows="5"
                    placeholder="Например: неудобный экран, нет нужной функции, есть идея..."
                    required
                  ></textarea>
                </div>
                <label class="feedback-modal__anonymous">
                  <input type="checkbox" data-energy-feedback-anonymous />
                  <span>Отправить анонимно</span>
                </label>
                <p class="feedback-modal__hint" data-energy-feedback-hint>
                  Если отправите анонимно, ответ на обращение получить не получится. ☹️
                </p>
                <div class="form-field">
                  <label for="feedback-photos">Фото (можно несколько)</label>
                  <input
                    id="feedback-photos"
                    class="form-input"
                    type="file"
                    accept="image/*"
                    multiple
                    data-energy-feedback-photos
                  />
                  <div class="feedback-modal__files" data-energy-feedback-files></div>
                </div>
                <div class="form-message" data-energy-feedback-message-status></div>
              </div>
              <div class="settings-modal__footer feedback-modal__footer">
                <button class="action-secondary" type="button" data-energy-feedback-cancel>
                  Отмена
                </button>
                <button class="action-primary" type="submit">Отправить</button>
              </div>
            </form>
          </div>
        </div>
        <div class="download-modal settings-modal is-hidden" data-energy-download-modal>
          <div class="settings-modal__backdrop" data-energy-download-backdrop></div>
          <div
            class="settings-modal__panel download-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Выгрузить данные"
          >
            <div class="settings-modal__header download-modal__header">
              <div class="settings-modal__title">
                <h2>Выгрузить данные</h2>
                <p data-energy-download-subtitle>Выберите раздел для выгрузки</p>
              </div>
              <button
                class="button-icon"
                type="button"
                data-energy-download-close
                aria-label="Закрыть окно выгрузки"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body download-modal__body">
              <div class="download-modal__grid" data-download-options-grid>
                <button type="button" class="download-option" data-download-option="my-tools">Мои инструменты</button>
                <button type="button" class="download-option" data-download-option="all-tools">По всем инструментам</button>
                <button type="button" class="download-option" data-download-option="responsible">По ответственному</button>
                <button type="button" class="download-option" data-download-option="no-photo">Без фото</button>
                <button type="button" class="download-option" data-download-option="status">По статусу</button>
                <button type="button" class="download-option" data-download-option="moves">Перемещения</button>
                <button type="button" class="download-option" data-download-option="invoice">Накладная на покупку</button>
              </div>
              <div class="download-responsible is-hidden" data-download-responsible-box>
                <label class="download-responsible__search" for="download-responsible-search">
                  <span>Выберите ответственного</span>
                  <input
                    id="download-responsible-search"
                    class="form-input"
                    type="search"
                    placeholder="Начните вводить ФИО"
                    autocomplete="off"
                    data-download-responsible-search
                  />
                </label>
                <div class="download-responsible__list" data-download-responsible-list></div>
              </div>
              <div class="download-responsible is-hidden" data-download-moves-box>
                <div class="download-moves-calendar" data-download-moves-calendar>
                  <div class="download-moves-calendar__header">
                    <button
                      type="button"
                      class="download-moves-calendar__nav"
                      data-download-moves-prev-month
                      aria-label="Предыдущий месяц"
                    >
                      ←
                    </button>
                    <div class="download-moves-calendar__month" data-download-moves-month-label>
                      Месяц
                    </div>
                    <button
                      type="button"
                      class="download-moves-calendar__nav"
                      data-download-moves-next-month
                      aria-label="Следующий месяц"
                    >
                      →
                    </button>
                  </div>
                  <div class="download-moves-calendar__weekdays" aria-hidden="true">
                    <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>
                  </div>
                  <div class="download-moves-calendar__days" data-download-moves-days></div>
                  <div class="download-moves-calendar__selected" data-download-moves-selected-range>
                    Выберите начальную и конечную дату
                  </div>
                </div>
                <input id="download-moves-start-date" type="hidden" data-download-moves-start-date />
                <input id="download-moves-end-date" type="hidden" data-download-moves-end-date />
                <button
                  type="button"
                  class="action-primary"
                  data-download-moves-generate
                >
                  Сформировать
                </button>
              </div>
              <div class="form-message" data-energy-download-message></div>
            </div>
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
                    id="objects-filter-input"
                    name="object-filter"
                    placeholder="Поиск по объектам"
                    aria-label="Быстрый поиск по объектам"
                    autocomplete="off"
                  />
                  <button
                    class="objects-form__submit"
                    type="button"
                    data-energy-objects-create
                    aria-label="Создать новый объект"
                  >
                    +
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
                  Пока нет объектов.
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          class="objects-create-modal settings-modal is-hidden"
          data-energy-objects-create-modal
        >
          <div
            class="settings-modal__backdrop"
            data-energy-objects-create-backdrop
          ></div>
          <div
            class="settings-modal__panel objects-create-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Создание нового объекта"
          >
            <div class="settings-modal__header objects-create-modal__header">
              <div class="settings-modal__title">
                <h2>Новый объект</h2>
                <p>Введите название и координаты объекта</p>
              </div>
              <button
                class="button-icon objects-modal__close"
                type="button"
                data-energy-objects-create-close
                aria-label="Закрыть окно создания объекта"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <form
              class="objects-create-form form-card"
              data-energy-objects-create-form
            >
              <div class="form-field">
                <label class="form-label" for="objects-create-name">
                  Название объекта
                </label>
                <input
                  class="form-input"
                  id="objects-create-name"
                  name="object-name"
                  placeholder="Например: Склад Ленина"
                  autocomplete="off"
                  required
                />
              </div>
              <div class="form-field">
                <label class="form-label" for="objects-create-coordinates">
                  Координаты (широта, долгота)
                </label>
                <input
                  class="form-input"
                  id="objects-create-coordinates"
                  name="object-coordinates"
                  placeholder="53.912103, 27.572346"
                  autocomplete="off"
                  inputmode="decimal"
                />
                <span class="form-hint">
                  Можно оставить пустым — объект будет подсвечен красным.
                </span>
              </div>
              <div class="objects-create-actions">
                <button
                  class="action-secondary"
                  type="button"
                  data-energy-objects-create-cancel
                >
                  Отмена
                </button>
                <button class="action-primary" type="submit">
                  Сохранить
                </button>
              </div>
              <div class="form-message" data-energy-objects-create-message></div>
            </form>
          </div>
        </div>
        <div
          class="objects-edit-modal settings-modal is-hidden"
          data-energy-objects-edit-modal
        >
          <div
            class="settings-modal__backdrop"
            data-energy-objects-edit-backdrop
          ></div>
          <div
            class="settings-modal__panel objects-edit-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Редактирование объекта"
          >
            <div class="settings-modal__header objects-create-modal__header">
              <div class="settings-modal__title">
                <h2>Редактирование объекта</h2>
                <p>Исправьте название или координаты</p>
              </div>
              <button
                class="button-icon objects-modal__close"
                type="button"
                data-energy-objects-edit-close
                aria-label="Закрыть окно редактирования объекта"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <form
              class="objects-edit-form form-card"
              data-energy-objects-edit-form
            >
              <div class="form-field">
                <label class="form-label" for="objects-edit-name">
                  Название объекта
                </label>
                <input
                  class="form-input"
                  id="objects-edit-name"
                  name="object-name"
                  placeholder="Например: Склад Ленина"
                  autocomplete="off"
                  required
                />
              </div>
              <div class="form-field">
                <label class="form-label" for="objects-edit-coordinates">
                  Координаты (широта, долгота)
                </label>
                <input
                  class="form-input"
                  id="objects-edit-coordinates"
                  name="object-coordinates"
                  placeholder="53.912103, 27.572346"
                  autocomplete="off"
                  inputmode="decimal"
                />
                <span class="form-hint">
                  Оставьте пустым, если координаты неизвестны.
                </span>
              </div>
              <div class="objects-create-actions">
                <button
                  class="action-secondary"
                  type="button"
                  data-energy-objects-edit-cancel
                >
                  Отмена
                </button>
                <button class="action-primary" type="submit">
                  Сохранить
                </button>
              </div>
              <div class="form-message" data-energy-objects-edit-message></div>
            </form>
          </div>
        </div>
        <div class="demand-modal settings-modal is-hidden" data-demand-modal>
          <div class="settings-modal__backdrop" data-demand-backdrop></div>
          <div
            class="settings-modal__panel demand-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Заявки"
          >
            <div class="settings-modal__header demand-modal__header">
              <div class="settings-modal__title">
                <h2>Заявки</h2>
                <p data-demand-subtitle>Собираем потребности по объектам</p>
              </div>
              <button
                class="button-icon demand-modal__close"
                type="button"
                data-demand-close
                aria-label="Закрыть окно потребностей"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body demand-modal__body">
              <div class="demand-summary" data-demand-summary>
                <div class="demand-summary__main">
                  <span class="demand-summary__count" data-demand-open-count>0</span>
                  <span class="demand-summary__label">актуальных заявок</span>
                </div>
                <div class="demand-summary__actions">
                  <button
                    class="demand-summary__add"
                    type="button"
                    data-demand-toggle-form
                    aria-label="Добавить заявку"
                    aria-expanded="false"
                  >
                    +
                  </button>
                </div>
              </div>
              <div class="demand-filters">
                <div class="demand-filters__bar">
                  <label class="demand-search">
                    <input
                      class="form-input"
                      type="search"
                      placeholder="Поиск по названию, объекту, автору..."
                      data-demand-search
                    />
                  </label>
                  <button
                    class="demand-filters__toggle"
                    type="button"
                    data-demand-filters-toggle
                    aria-label="Фильтры"
                    aria-expanded="false"
                  >
                    <span class="demand-filters__icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" role="presentation" focusable="false" fill="none">
                        <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                        <circle cx="15" cy="7" r="2.5" fill="currentColor" />
                        <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                        <circle cx="9" cy="17" r="2.5" fill="currentColor" />
                      </svg>
                    </span>
                  </button>
                </div>
                <div class="demand-filters__tabs">
                  <div class="demand-toggle" data-demand-filter-view>
                    <button
                      class="demand-toggle__button is-active"
                      type="button"
                      data-demand-view="all"
                    >
                      Все
                    </button>
                    <button
                      class="demand-toggle__button"
                      type="button"
                      data-demand-view="mine"
                    >
                      Мои
                    </button>
                  </div>
                </div>
                <div class="demand-filters__panel is-hidden" data-demand-filters-panel>
                  <div class="demand-filter-row">
                    <label class="demand-filter">
                      <span>Объект</span>
                      <select class="form-input" data-demand-filter-object>
                        <option value="">Все объекты</option>
                      </select>
                    </label>
                    <label class="demand-filter">
                      <span>Автор</span>
                      <select class="form-input" data-demand-filter-user>
                        <option value="">Все пользователи</option>
                      </select>
                    </label>
                  </div>
                  <div class="demand-filter-row demand-filter-row--secondary">
                    <label class="demand-filter">
                      <span>Статус</span>
                      <select class="form-input" data-demand-filter-status>
                        <option value="open" selected>Актуальные</option>
                        <option value="done">Закрытые</option>
                        <option value="all">Все</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>
              <div class="demand-list" data-demand-list></div>
              <div class="demand-empty is-hidden" data-demand-empty>
                Пока нет потребностей. Добавьте первую заявку сверху.
              </div>
            </div>
          </div>
        </div>
        <div class="demand-form-modal settings-modal is-hidden" data-demand-form-modal>
          <div class="settings-modal__backdrop" data-demand-form-backdrop></div>
          <div
            class="settings-modal__panel demand-form-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Заявка"
          >
            <div class="settings-modal__header demand-form-modal__header">
              <div class="settings-modal__title">
                <h2 data-demand-form-title>Новая заявка</h2>
                <p>Заполните нужный инструмент и детали</p>
              </div>
              <button
                class="button-icon demand-form-modal__close"
                type="button"
                data-demand-form-close
                aria-label="Закрыть окно заявки"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body demand-form-modal__body">
              <form class="demand-form form-card" data-demand-form>
                <div class="demand-form__grid">
                  <label class="form-field">
                    <span class="form-label">Что нужно</span>
                    <div class="suggestions-field">
                      <input
                        class="form-input"
                        type="text"
                        placeholder="Например, перфоратор"
                        data-demand-item
                        autocomplete="off"
                        required
                      />
                      <div
                        class="suggestions is-hidden"
                        data-demand-tools-suggestions
                      ></div>
                    </div>
                  </label>
                  <label class="form-field demand-form__quantity">
                    <span class="form-label">Количество</span>
                    <div class="demand-quantity">
                      <input
                        class="form-input"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="1"
                        data-demand-quantity
                        required
                      />
                      <select class="form-input" data-demand-unit>
                        <option value="шт" selected>шт</option>
                        <option value="компл">компл</option>
                        <option value="м">м</option>
                        <option value="м²">м²</option>
                        <option value="м³">м³</option>
                        <option value="кг">кг</option>
                        <option value="л">л</option>
                      </select>
                    </div>
                  </label>
                  <label class="form-field">
                    <span class="form-label">Объект</span>
                    <div class="suggestions-field">
                      <input
                        class="form-input"
                        type="text"
                        placeholder="Выберите объект"
                        data-demand-object
                        autocomplete="off"
                        required
                      />
                      <div
                        class="suggestions is-hidden"
                        data-demand-object-suggestions
                      ></div>
                    </div>
                  </label>
                  <label class="form-field demand-form__date">
                    <span class="form-label">Когда нужно</span>
                    <input
                      class="form-input"
                      type="date"
                      data-demand-date
                      required
                    />
                  </label>
                </div>
                <label class="form-field">
                  <span class="form-label">Приоритет</span>
                  <div class="demand-priority">
                    <label class="demand-priority__option demand-priority__option--red">
                      <input
                        type="radio"
                        name="demand-priority"
                        value="red"
                        data-demand-priority
                      />
                      <span>Высокий</span>
                    </label>
                    <label class="demand-priority__option demand-priority__option--yellow">
                      <input
                        type="radio"
                        name="demand-priority"
                        value="yellow"
                        data-demand-priority
                      />
                      <span>Средний</span>
                    </label>
                    <label class="demand-priority__option demand-priority__option--green">
                      <input
                        type="radio"
                        name="demand-priority"
                        value="green"
                        data-demand-priority
                        checked
                      />
                      <span>Низкий</span>
                    </label>
                  </div>
                </label>
                <label class="form-field">
                  <span class="form-label">Комментарий</span>
                  <textarea
                    class="form-input demand-form__note"
                    rows="2"
                    placeholder="Срок, особенности, пояснения..."
                    data-demand-note
                  ></textarea>
                </label>
                <div class="demand-form__actions">
                  <button class="action-secondary" type="button" data-demand-cancel>
                    Отмена
                  </button>
                  <button class="action-primary" type="submit" data-demand-submit>
                    Добавить
                  </button>
                </div>
                <div class="form-message" data-demand-message></div>
              </form>
            </div>
          </div>
        </div>
        <div class="demand-request-map-modal settings-modal is-hidden" data-demand-request-map-modal>
          <div
            class="settings-modal__backdrop"
            data-demand-request-map-backdrop
          ></div>
          <div
            class="settings-modal__panel demand-request-map-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Карта заявки"
          >
            <div class="settings-modal__header demand-request-map-modal__header">
              <div class="settings-modal__title">
                <h2 data-demand-request-map-title>Карта заявки</h2>
                <p data-demand-request-map-subtitle>Загружаем объекты...</p>
              </div>
              <button
                class="button-icon demand-request-map-modal__close"
                type="button"
                data-demand-request-map-close
                aria-label="Закрыть карту заявки"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body demand-request-map-modal__body">
              <div
                class="tools-map-canvas demand-request-map__canvas"
                data-demand-request-map-canvas
                tabindex="0"
                role="button"
                aria-label="Карта активна. Перемещайте карту и меняйте масштаб"
              >
                <div class="tools-map-layer" data-demand-request-map-layer></div>
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
            data-tools-panel
          >
            <div class="settings-modal__header tools-modal__header">
              <div class="settings-modal__title">
                <h2 data-tools-title>Мои инструменты</h2>
                <p data-tools-subtitle>Загружаем список...</p>
                <p class="tools-zone-subtitle is-hidden" data-tools-zone-subtitle></p>
              </div>
              <div class="tools-modal__header-actions">
                <button
                  class="button-icon tools-modal__pending-link is-hidden"
                  type="button"
                  data-tools-open-replacement-pending
                  aria-label="Открыть принятие перемещений за сотрудника в отпуске"
                  title="Принятие за сотрудника в отпуске"
                >
                  <span class="button-icon-emoji" aria-hidden="true">📥</span>
                </button>
                <button
                  class="button-icon tools-modal__close"
                  type="button"
                  data-tools-close
                  aria-label="Закрыть список инструментов"
                >
                  <span class="button-icon-emoji" aria-hidden="true">✕</span>
                </button>
              </div>
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
                        class="tools-view-button is-active"
                        type="button"
                        data-tools-view="table"
                      >
                        Таблица
                      </button>
                      <button
                        class="tools-view-button is-hidden"
                        type="button"
                        data-tools-view="map"
                        data-tools-search-map-view
                        aria-label="Карта"
                        title="Карта"
                      >
                        Карта
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
                      0
                    </div>
                    <button
                      class="action-secondary tools-cancel-button"
                      type="button"
                      data-tools-selection-cancel
                    >
                      Отменить
                    </button>
                    <button
                      class="action-secondary tools-select-all-button"
                      type="button"
                      data-tools-selection-select-all
                      aria-label="Выделить все доступные для перемещения инструменты"
                      title="Выделить все доступные для перемещения инструменты"
                    >
                      <span class="tools-select-all-check" aria-hidden="true"></span>
                    </button>
                    <div class="tools-filter-actions" role="group" aria-label="Сортировка и фильтры">
                    <button
                      class="tools-filters-toggle is-hidden"
                      type="button"
                      data-tools-broken-only-toggle
                        aria-label="Показать только сломанные инструменты"
                        title="Только сломанные"
                        aria-pressed="false"
                      >
                        <span class="tools-filters-toggle__icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" focusable="false">
                            <path d="M11.3 3.95a.8.8 0 0 1 1.4 0l8 14a.8.8 0 0 1-.7 1.2H4a.8.8 0 0 1-.7-1.2l8-14Zm.7 4.6a.75.75 0 0 0-.75.75v4.7a.75.75 0 1 0 1.5 0V9.3a.75.75 0 0 0-.75-.75Zm0 8.95a.95.95 0 1 0 0-1.9.95.95 0 0 0 0 1.9Z" />
                          </svg>
                        </span>
                      </button>
                      <button
                        class="tools-filters-toggle is-hidden"
                        type="button"
                        data-tools-in-repair-only-toggle
                        aria-label="Показать только инструменты в ремонте"
                        title="Только в ремонте"
                        aria-pressed="false"
                      >
                        <span class="tools-filters-toggle__icon" aria-hidden="true">
                          🛠️
                        </span>
                      </button>
                      <div class="tools-grouping-dropdown" data-tools-grouping-dropdown>
                        <button
                          class="tools-filters-toggle tools-grouping-toggle"
                          type="button"
                          data-tools-grouping-toggle
                          aria-expanded="false"
                          aria-label="Группировка инструментов"
                          title="Группировка инструментов"
                        >
                          <span class="tools-filters-toggle__icon tools-grouping-toggle__icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" focusable="false">
                              <path d="M5 6.25A1.25 1.25 0 0 1 6.25 5h3.5A1.25 1.25 0 0 1 11 6.25v1.5A1.25 1.25 0 0 1 9.75 9h-3.5A1.25 1.25 0 0 1 5 7.75v-1.5Zm8 0A1.25 1.25 0 0 1 14.25 5h3.5A1.25 1.25 0 0 1 19 6.25v1.5A1.25 1.25 0 0 1 17.75 9h-3.5A1.25 1.25 0 0 1 13 7.75v-1.5Zm-4 5A1.25 1.25 0 0 1 10.25 10h3.5A1.25 1.25 0 0 1 15 11.25v1.5A1.25 1.25 0 0 1 13.75 14h-3.5A1.25 1.25 0 0 1 9 12.75v-1.5Zm-4 5A1.25 1.25 0 0 1 6.25 15h3.5A1.25 1.25 0 0 1 11 16.25v1.5A1.25 1.25 0 0 1 9.75 19h-3.5A1.25 1.25 0 0 1 5 17.75v-1.5Zm8 0A1.25 1.25 0 0 1 14.25 15h3.5A1.25 1.25 0 0 1 19 16.25v1.5A1.25 1.25 0 0 1 17.75 19h-3.5A1.25 1.25 0 0 1 13 17.75v-1.5Z" />
                            </svg>
                          </span>
                        </button>
                        <div class="tools-grouping-dropdown__menu is-hidden" data-tools-grouping-menu>
                          <button type="button" class="tools-grouping-option is-active" data-tools-grouping-option="none">Без группировки</button>
                          <button type="button" class="tools-grouping-option" data-tools-grouping-option="responsible">По ответственному</button>
                          <button type="button" class="tools-grouping-option" data-tools-grouping-option="object">По объекту</button>
                          <button type="button" class="tools-grouping-option" data-tools-grouping-option="status">По статусу</button>
                          <button type="button" class="tools-grouping-option" data-tools-grouping-option="name">По наименованию</button>
                          <button type="button" class="tools-grouping-option" data-tools-grouping-option="group">По группам</button>
                        </div>
                      </div>
                      <button
                        class="tools-filters-toggle tools-sort-toggle"
                        type="button"
                        data-tools-sort-toggle
                        aria-label="Сортировка по номеру инструмента: по убыванию"
                        title="Сортировка по номеру инструмента: по убыванию"
                      >
                        <span class="tools-sort-toggle__icon is-desc" aria-hidden="true">
                          <svg class="tools-sort-toggle__chevron" viewBox="0 0 24 24" focusable="false">
                            <path d="M5 8.5L12 15.5L19 8.5" />
                          </svg>
                        </span>
                      </button>
                      <button
                        class="tools-filters-toggle"
                        type="button"
                        data-tools-filters-toggle
                        aria-expanded="false"
                        aria-controls="tools-filters-panel"
                        aria-label="Фильтры"
                      >
                        <span class="tools-filters-toggle__icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" focusable="false" fill="none">
                            <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                            <circle cx="15" cy="7" r="2.5" fill="currentColor" />
                            <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                            <circle cx="9" cy="17" r="2.5" fill="currentColor" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
                <div class="tools-filters" id="tools-filters-panel" data-tools-filters-panel>
                  <label class="tools-filter">
                    <span>Группа</span>
                    <div class="tools-filter-dropdown" data-tools-filter="group">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-tools-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-tools-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-tools-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-tools-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter">
                    <span>Объект</span>
                    <div class="tools-filter-dropdown" data-tools-filter="object">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-tools-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-tools-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-tools-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-tools-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter" data-tools-status-filter-dropdown>
                    <span>Статус</span>
                    <div class="tools-filter-dropdown" data-tools-filter="status">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-tools-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-tools-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-tools-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-tools-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter" data-tools-responsible-filter>
                    <span>Ответственный</span>
                    <div class="tools-filter-dropdown" data-tools-filter="responsible">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-tools-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-tools-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-tools-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-tools-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter">
                    <span>Наименование</span>
                    <div class="tools-filter-dropdown" data-tools-filter="name">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-tools-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-tools-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-tools-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-tools-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter">
                    <span>Производитель</span>
                    <div class="tools-filter-dropdown" data-tools-filter="manufacturer">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-tools-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-tools-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-tools-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-tools-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter">
                    <span>Модель</span>
                    <div class="tools-filter-dropdown" data-tools-filter="model">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-tools-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-tools-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-tools-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-tools-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter">
                    <span>Фото</span>
                    <div class="tools-filter-dropdown" data-tools-filter="photo">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-tools-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-tools-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-tools-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-tools-filter-options></div>
                      </div>
                    </div>
                  </label>
                </div>
                <div class="tools-standalone-filter is-hidden" data-tools-status-standalone-wrap>
                  <label class="tools-filter tools-filter--standalone">
                    <span>По статусу</span>
                    <select class="form-input" data-tools-status-standalone>
                      <option value="">Все</option>
                    </select>
                  </label>
                </div>
              </div>
              <div class="tools-list" data-tools-list></div>
              <div class="tools-search-map is-hidden" data-tools-search-map>
                <div
                  class="tools-map-canvas tools-search-map__canvas"
                  role="button"
                  tabindex="0"
                  data-tools-search-map-canvas
                  aria-label="Нажмите, чтобы оживить карту, масштабировать и перемещать"
                >
                  <img
                    class="tools-map-image is-hidden"
                    data-tools-search-map-image
                    alt="Карта объектов"
                  />
                  <div class="tools-map-layer" data-tools-search-map-layer></div>
                  <div class="tools-map-placeholder" data-tools-search-map-placeholder>
                    Нет объектов с координатами для выбранных фильтров.
                  </div>
                </div>
              </div>
              <div class="tools-empty is-hidden" data-tools-empty>
                Инструменты не найдены. Попробуйте сбросить фильтры или поиск.
              </div>
            </div>
          </div>
        </div>
        <div
          class="settings-modal is-hidden tools-writeoff-pending-confirm-modal"
          data-tools-writeoff-pending-confirm-modal
        >
          <div
            class="settings-modal__backdrop"
            data-tools-writeoff-pending-confirm-backdrop
          ></div>
          <div
            class="settings-modal__panel tools-writeoff-pending-confirm-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Подтверждение смены статуса"
          >
            <div class="settings-modal__header tools-writeoff-pending-confirm-modal__header">
              <div class="settings-modal__title">
                <div class="tools-writeoff-pending-confirm-modal__heading-row">
                  <h2>Решение по инструменту</h2>
                  <button
                    class="button-icon"
                    type="button"
                    data-tools-writeoff-pending-confirm-close
                    aria-label="Закрыть подтверждение"
                  >
                    <span class="button-icon-emoji" aria-hidden="true">✕</span>
                  </button>
                </div>
                <p data-tools-writeoff-pending-confirm-subtitle></p>
              </div>
            </div>
            <div class="settings-modal__body">
              <div class="form-card tools-writeoff-pending-confirm-card">
                <div
                  class="tools-writeoff-pending-confirm-card__details"
                  data-tools-writeoff-pending-confirm-details
                ></div>
              </div>
              <div class="tools-writeoff-pending-confirm-history">
                <div
                  class="tools-writeoff-pending-confirm-history__tabs"
                  role="tablist"
                  aria-label="История инструмента"
                >
                  <button
                    type="button"
                    class="tools-writeoff-pending-confirm-history__tab"
                    data-tools-writeoff-pending-history-tab="moves"
                  >
                    Перемещения
                  </button>
                  <button
                    type="button"
                    class="tools-writeoff-pending-confirm-history__tab"
                    data-tools-writeoff-pending-history-tab="breakdowns"
                  >
                    Поломки
                  </button>
                  <button
                    type="button"
                    class="tools-writeoff-pending-confirm-history__tab"
                    data-tools-writeoff-pending-history-tab="repairs"
                  >
                    Ремонты
                  </button>
                </div>
                <div
                  class="tools-writeoff-pending-confirm-photo"
                  data-tools-writeoff-pending-photo-wrap
                >
                  <img
                    class="tools-writeoff-pending-confirm-photo__image"
                    data-tools-writeoff-pending-photo
                    alt="Фото инструмента"
                    loading="lazy"
                  />
                  <div
                    class="tools-writeoff-pending-confirm-photo__empty is-hidden"
                    data-tools-writeoff-pending-photo-empty
                  >
                    Фото инструмента не найдено.
                  </div>
                </div>
                <div
                  class="tools-writeoff-pending-confirm-history__panel is-hidden"
                  data-tools-writeoff-pending-history-panel
                >
                  <div
                    class="tools-writeoff-pending-confirm-history__summary"
                    data-tools-writeoff-pending-history-summary
                  ></div>
                  <div
                    class="tools-writeoff-pending-confirm-history__list"
                    data-tools-writeoff-pending-history-list
                  ></div>
                  <div
                    class="tools-writeoff-pending-confirm-history__empty is-hidden"
                    data-tools-writeoff-pending-history-empty
                  ></div>
                </div>
              </div>
              <div class="form-message" data-tools-writeoff-pending-confirm-message></div>
            </div>
            <div class="settings-modal__footer tools-writeoff-pending-confirm-actions">
              <button
                class="action-primary tools-writeoff-pending-confirm-actions__submit"
                type="button"
                data-tools-writeoff-pending-confirm-submit
              >
                Исправный
              </button>
              <button
                class="action-primary tools-writeoff-pending-confirm-actions__writeoff"
                type="button"
                data-tools-writeoff-pending-confirm-writeoff
              >
                Списать
              </button>
            </div>
          </div>
        </div>
        <div class="tools-modal settings-modal is-hidden" data-tools-edit-modal>
          <div class="settings-modal__backdrop" data-tools-edit-backdrop></div>
          <div
            class="settings-modal__panel tools-edit-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Редактирование инструмента"
          >
            <div class="settings-modal__header tools-modal__header">
              <div class="settings-modal__title">
                <h2 data-tools-edit-title>Инструмент</h2>
                <p data-tools-edit-subtitle>Редактирование</p>
              </div>
              <button
                class="button-icon tools-modal__close"
                type="button"
                data-tools-edit-close
                aria-label="Закрыть редактирование"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body tools-edit-modal__body">
              <form class="tools-edit-form" data-tools-edit-form>
                <div class="tools-edit-grid">
                  <label class="form-field">
                    <span class="form-label">Бух.номер</span>
                    <input
                      class="form-input"
                      type="text"
                      inputmode="text"
                      data-tools-edit-accounting
                    />
                  </label>
                  <label class="form-field">
                    <span class="form-label">Наименование</span>
                    <input
                      class="form-input"
                      type="text"
                      inputmode="text"
                      data-tools-edit-name
                    />
                  </label>
                  <label class="form-field">
                    <span class="form-label">Производитель</span>
                    <input
                      class="form-input"
                      type="text"
                      inputmode="text"
                      data-tools-edit-manufacturer
                    />
                  </label>
                  <label class="form-field">
                    <span class="form-label">Модель</span>
                    <input
                      class="form-input"
                      type="text"
                      inputmode="text"
                      data-tools-edit-model
                    />
                  </label>
                  <label class="form-field tools-edit-field--full">
                    <span class="form-label">Наименование по бухгалтерии</span>
                    <input
                      class="form-input"
                      type="text"
                      inputmode="text"
                      data-tools-edit-accounting-name
                    />
                  </label>
                  <label class="form-field">
                    <span class="form-label">Серийный номер</span>
                    <input
                      class="form-input"
                      type="text"
                      inputmode="text"
                      data-tools-edit-serial
                    />
                  </label>
                  <label class="form-field">
                    <span class="form-label">Группа инструментов</span>
                    <div class="suggestions-field">
                      <input
                        class="form-input"
                        type="text"
                        inputmode="text"
                        data-placeholder="Выберите группу из списка"
                        data-tools-edit-group
                        autocomplete="off"
                      />
                      <div
                        class="suggestions is-hidden"
                        data-tools-edit-group-suggestions
                      ></div>
                    </div>
                  </label>
                </div>
                <div class="form-card tools-edit-kit" data-tools-edit-kit-block>
                  <button
                    class="action-secondary tools-edit-kit__toggle"
                    type="button"
                    data-tools-edit-kit-toggle
                    aria-expanded="false"
                  >
                    Добавить комплектацию
                  </button>
                  <div class="tools-edit-kit__panel is-hidden" data-tools-edit-kit-panel>
                    <div class="tools-edit-kit__title">Комплектация</div>
                    <div class="tools-edit-kit__list" data-tools-edit-kit-list></div>
                    <button
                      class="action-secondary tools-edit-kit__add"
                      type="button"
                      data-tools-edit-kit-add
                    >
                      + Добавить позицию
                    </button>
                  </div>
                </div>
                <div class="form-card tools-edit-photo-card">
                  <div class="tools-edit-photo-header">
                    Фото инструмента
                    <button
                      class="tools-edit-photo-count"
                      type="button"
                      data-tools-edit-photo-count
                      aria-label="Открыть фото инструмента"
                    >
                      0
                    </button>
                  </div>
                  <div class="tools-edit-photo-actions">
                    <label class="action-secondary tools-edit-photo-add">
                      Добавить фото
                      <input
                        class="tools-edit-photo-input"
                        type="file"
                        accept="image/*"
                        multiple
                        data-tools-edit-photo-add
                      />
                    </label>
                    <button
                      class="action-secondary"
                      type="button"
                      data-tools-edit-photo-remove
                    >
                      Удалить фото
                    </button>
                  </div>
                </div>
                <div class="form-message" data-tools-edit-message></div>
                <div class="tools-edit-action-groups">
                  <div class="tools-edit-actions tools-edit-actions--danger">
                    <button
                      class="action-danger tools-edit-actions__delete"
                      type="button"
                      data-tools-edit-delete
                    >
                      Удалить инструмент
                    </button>
                  </div>
                  <div class="tools-edit-actions tools-edit-actions--save">
                    <div class="tools-edit-actions__main">
                      <button
                        class="action-primary tools-edit-actions__save"
                        type="submit"
                        data-tools-edit-save
                      >
                        Сохранить
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div class="tools-modal settings-modal is-hidden tools-info-modal" data-tools-info-modal>
          <div class="settings-modal__backdrop" data-tools-info-backdrop></div>
          <div
            class="settings-modal__panel tools-info-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Информация об инструменте"
          >
            <div class="settings-modal__header tools-modal__header">
              <div class="settings-modal__title">
                <h2 data-tools-info-title>Инструмент</h2>
                <p data-tools-info-subtitle></p>
              </div>
              <button
                class="button-icon tools-modal__close"
                type="button"
                data-tools-info-close
                aria-label="Закрыть окно информации"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body tools-info-modal__body">
              <div class="tools-info-card">
                <div class="tools-info-grid" data-tools-info-grid></div>
                <div class="tools-info-kit is-hidden" data-tools-info-kit>
                  <button
                    class="button-secondary tools-info-kit__toggle"
                    type="button"
                    data-tools-info-kit-toggle
                  >
                    Комплектация (0)
                  </button>
                  <div
                    class="tools-info-kit__content is-hidden"
                    data-tools-info-kit-content
                  >
                    <div class="tools-info-kit__list" data-tools-info-kit-list></div>
                  </div>
                </div>
              </div>
              <div class="tools-info-top-actions">
                <div class="tools-info-top-actions-row">
                  <button
                    class="tools-info-history-menu__trigger"
                    type="button"
                    data-tools-info-history-toggle
                    aria-pressed="false"
                  >
                    История
                  </button>
                  <button
                    class="action-primary tools-info-move"
                    type="button"
                    data-tools-info-move
                  >
                    Переместить
                  </button>
                </div>
                <div class="tools-info-actions-right">
                  <div class="tools-info-quick-actions is-hidden" aria-hidden="true">
                    <button
                      class="button-icon tools-info-quick-action tools-info-inline-action"
                      type="button"
                      data-tools-info-share
                      aria-label="Поделиться инструментом"
                      title="Поделиться"
                    >
                      <span class="tools-info-inline-action__icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                          <circle cx="6.5" cy="12" r="3.5" fill="currentColor"></circle>
                          <circle cx="17.5" cy="5.5" r="3.5" fill="currentColor"></circle>
                          <circle cx="17.5" cy="18.5" r="3.5" fill="currentColor"></circle>
                          <path
                            d="M9.7 10.1l4.7-2.8M9.7 13.9l4.7 2.8"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.9"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          ></path>
                        </svg>
                      </span>
                    </button>
                    <button
                      class="button-icon tools-info-quick-action tools-info-inline-action"
                      type="button"
                      data-tools-info-copy
                      aria-label="Скопировать информацию об инструменте"
                      title="Копировать"
                    >
                      <span
                        class="tools-info-inline-action__icon tools-info-inline-action__icon--copy"
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                          <rect
                            x="7"
                            y="7"
                            width="12"
                            height="12"
                            rx="2.5"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.2"
                          ></rect>
                          <rect
                            x="4"
                            y="4"
                            width="12"
                            height="12"
                            rx="2.5"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.2"
                          ></rect>
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
                <div
                  class="tools-info-tabs is-hidden"
                  role="tablist"
                  aria-label="История"
                  data-tools-info-tabs
                >
                  <button
                    class="tools-info-tab"
                    type="button"
                    role="tab"
                    aria-selected="false"
                    data-tools-info-tab="moves"
                  >
                    Перемещения
                  </button>
                  <button
                    class="tools-info-tab"
                    type="button"
                    role="tab"
                    aria-selected="false"
                    data-tools-info-tab="breakdowns"
                  >
                    Поломки
                  </button>
                  <button
                    class="tools-info-tab"
                    type="button"
                    role="tab"
                    aria-selected="false"
                    data-tools-info-tab="repairs"
                  >
                    Ремонты
                  </button>
                </div>
              </div>
              <section class="tools-info-photos" data-tools-info-photos>
                <div class="tools-info-summary" data-tools-info-photos-summary></div>
                <div class="tools-info-photos-grid" data-tools-info-photos-grid></div>
                <div class="tools-info-empty is-hidden" data-tools-info-photos-empty>
                  Фото инструмента пока не загружены.
                </div>
              </section>
              <div class="tools-info-panels" data-tools-info-panels>
                <section class="tools-info-panel" data-tools-info-panel="moves">
                  <div class="tools-info-summary" data-tools-info-moves-summary></div>
                  <div class="tools-info-list" data-tools-info-moves-list></div>
                  <div class="tools-info-empty is-hidden" data-tools-info-moves-empty>
                    Перемещений пока нет.
                  </div>
                </section>
                <section class="tools-info-panel" data-tools-info-panel="breakdowns">
                  <div class="tools-info-summary" data-tools-info-breakdowns-summary></div>
                  <div class="tools-info-list" data-tools-info-breakdowns-list></div>
                  <div class="tools-info-empty is-hidden" data-tools-info-breakdowns-empty>
                    Поломок пока нет.
                  </div>
                </section>
                <section class="tools-info-panel" data-tools-info-panel="repairs">
                  <div class="tools-info-summary" data-tools-info-repairs-summary></div>
                  <div class="tools-info-list" data-tools-info-repairs-list></div>
                  <div class="tools-info-empty is-hidden" data-tools-info-repairs-empty>
                    Ремонтов пока нет.
                  </div>
                </section>
              </div>
            </div>
            <div class="settings-modal__footer tools-info-modal__footer">
              <button
                class="action-secondary is-hidden"
                type="button"
                data-tools-info-cancel-move
              >
                Отменить
              </button>
            </div>
          </div>
        </div>
        <div class="settings-modal is-hidden writeoff-modal" data-writeoff-modal>
          <div class="settings-modal__backdrop" data-writeoff-backdrop></div>
          <div
            class="settings-modal__panel writeoff-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Списание инструментов"
          >
            <div class="settings-modal__header writeoff-modal__header">
              <div class="settings-modal__title">
                <h2>Списание</h2>
                <p data-writeoff-subtitle>Выберите инструменты для списания</p>
              </div>
              <button
                class="button-icon tools-modal__close"
                type="button"
                data-writeoff-close
                aria-label="Закрыть окно списания"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body writeoff-modal__body">
              <label class="tools-search writeoff-search">
                <input
                  class="form-input tools-search__input"
                  type="search"
                  placeholder="Поиск по бух.номеру"
                  data-writeoff-search
                  autocomplete="off"
                />
              </label>
              <div class="writeoff-selection" data-writeoff-selection>
                <div class="writeoff-selection__block writeoff-selection__block--count">
                  <span class="writeoff-selection__count-label">Выбрано:</span>
                  <strong class="writeoff-selection__count-value" data-writeoff-count>0</strong>
                </div>
                <button
                  class="writeoff-selection__block writeoff-selection__block--status writeoff-selection__status-toggle"
                  type="button"
                  data-writeoff-status-only
                >
                  На списание
                </button>
                <div
                  class="writeoff-selection__block writeoff-selection__block--filters tools-filter-actions"
                  role="group"
                  aria-label="Фильтры"
                >
                  <button
                    class="tools-filters-toggle writeoff-selection__filters-toggle"
                    type="button"
                    data-writeoff-filter
                    aria-expanded="false"
                    aria-controls="writeoff-filters-panel"
                    aria-label="Фильтры"
                  >
                    <span class="tools-filters-toggle__icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false" fill="none">
                        <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                        <circle cx="15" cy="7" r="2.5" fill="currentColor" />
                        <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                        <circle cx="9" cy="17" r="2.5" fill="currentColor" />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>
              <div class="tools-filters" id="writeoff-filters-panel" data-writeoff-filters-panel>
                <label class="tools-filter">
                  <span>Группа</span>
                  <div class="tools-filter-dropdown" data-tools-filter="group">
                    <button type="button" class="form-input tools-filter-dropdown__trigger" data-tools-filter-trigger>
                      Все
                    </button>
                    <div class="tools-filter-dropdown__menu is-hidden" data-tools-filter-menu>
                      <button type="button" class="tools-filter-dropdown__clear" data-tools-filter-clear>
                        Выбрать всё
                      </button>
                      <div class="tools-filter-dropdown__options" data-tools-filter-options></div>
                    </div>
                  </div>
                </label>
                <label class="tools-filter">
                  <span>Объект</span>
                  <div class="tools-filter-dropdown" data-tools-filter="object">
                    <button type="button" class="form-input tools-filter-dropdown__trigger" data-tools-filter-trigger>
                      Все
                    </button>
                    <div class="tools-filter-dropdown__menu is-hidden" data-tools-filter-menu>
                      <button type="button" class="tools-filter-dropdown__clear" data-tools-filter-clear>
                        Выбрать всё
                      </button>
                      <div class="tools-filter-dropdown__options" data-tools-filter-options></div>
                    </div>
                  </div>
                </label>
                <label class="tools-filter">
                  <span>Статус</span>
                  <div class="tools-filter-dropdown" data-tools-filter="status">
                    <button type="button" class="form-input tools-filter-dropdown__trigger" data-tools-filter-trigger>
                      Все
                    </button>
                    <div class="tools-filter-dropdown__menu is-hidden" data-tools-filter-menu>
                      <button type="button" class="tools-filter-dropdown__clear" data-tools-filter-clear>
                        Выбрать всё
                      </button>
                      <div class="tools-filter-dropdown__options" data-tools-filter-options></div>
                    </div>
                  </div>
                </label>
                <label class="tools-filter">
                  <span>Ответственный</span>
                  <div class="tools-filter-dropdown" data-tools-filter="responsible">
                    <button type="button" class="form-input tools-filter-dropdown__trigger" data-tools-filter-trigger>
                      Все
                    </button>
                    <div class="tools-filter-dropdown__menu is-hidden" data-tools-filter-menu>
                      <button type="button" class="tools-filter-dropdown__clear" data-tools-filter-clear>
                        Выбрать всё
                      </button>
                      <div class="tools-filter-dropdown__options" data-tools-filter-options></div>
                    </div>
                  </div>
                </label>
                <label class="tools-filter">
                  <span>Наименование</span>
                  <div class="tools-filter-dropdown" data-tools-filter="name">
                    <button type="button" class="form-input tools-filter-dropdown__trigger" data-tools-filter-trigger>
                      Все
                    </button>
                    <div class="tools-filter-dropdown__menu is-hidden" data-tools-filter-menu>
                      <button type="button" class="tools-filter-dropdown__clear" data-tools-filter-clear>
                        Выбрать всё
                      </button>
                      <div class="tools-filter-dropdown__options" data-tools-filter-options></div>
                    </div>
                  </div>
                </label>
                <label class="tools-filter">
                  <span>Производитель</span>
                  <div class="tools-filter-dropdown" data-tools-filter="manufacturer">
                    <button type="button" class="form-input tools-filter-dropdown__trigger" data-tools-filter-trigger>
                      Все
                    </button>
                    <div class="tools-filter-dropdown__menu is-hidden" data-tools-filter-menu>
                      <button type="button" class="tools-filter-dropdown__clear" data-tools-filter-clear>
                        Выбрать всё
                      </button>
                      <div class="tools-filter-dropdown__options" data-tools-filter-options></div>
                    </div>
                  </div>
                </label>
                <label class="tools-filter">
                  <span>Модель</span>
                  <div class="tools-filter-dropdown" data-tools-filter="model">
                    <button type="button" class="form-input tools-filter-dropdown__trigger" data-tools-filter-trigger>
                      Все
                    </button>
                    <div class="tools-filter-dropdown__menu is-hidden" data-tools-filter-menu>
                      <button type="button" class="tools-filter-dropdown__clear" data-tools-filter-clear>
                        Выбрать всё
                      </button>
                      <div class="tools-filter-dropdown__options" data-tools-filter-options></div>
                    </div>
                  </div>
                </label>
                <label class="tools-filter">
                  <span>Фото</span>
                  <div class="tools-filter-dropdown" data-tools-filter="photo">
                    <button type="button" class="form-input tools-filter-dropdown__trigger" data-tools-filter-trigger>
                      Все
                    </button>
                    <div class="tools-filter-dropdown__menu is-hidden" data-tools-filter-menu>
                      <button type="button" class="tools-filter-dropdown__clear" data-tools-filter-clear>
                        Выбрать всё
                      </button>
                      <div class="tools-filter-dropdown__options" data-tools-filter-options></div>
                    </div>
                  </div>
                </label>
                <div class="tools-filters-controls">
                  <div class="tools-filters-status" data-tools-filters-status>Фильтры не выбраны</div>
                  <button type="button" class="tools-filters-reset is-hidden" data-tools-filters-reset>Сбросить всё</button>
                </div>
              </div>
              <div class="writeoff-list" data-writeoff-list></div>
              <div class="tools-empty is-hidden" data-writeoff-empty>
                Инструменты не найдены. Попробуйте другой бух.номер.
              </div>
              <div class="form-message" data-writeoff-message></div>
            </div>
            <div class="settings-modal__footer writeoff-modal__footer">
              <button
                class="action-secondary"
                type="button"
                data-writeoff-cancel
              >
                Отмена
              </button>
              <button
                class="action-primary"
                type="button"
                data-writeoff-next
              >
                Списать
              </button>
            </div>
          </div>
        </div>
        <div
          class="settings-modal is-hidden writeoff-confirm-modal"
          data-writeoff-confirm-modal
        >
          <div
            class="settings-modal__backdrop"
            data-writeoff-confirm-backdrop
          ></div>
          <div
            class="settings-modal__panel writeoff-confirm-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Подтверждение списания"
          >
            <div class="settings-modal__header writeoff-confirm-modal__header">
              <div class="settings-modal__title">
                <h2>Подтверждение списания</h2>
                <p data-writeoff-confirm-subtitle>
                  Проверьте список и добавьте акт.
                </p>
              </div>
              <button
                class="button-icon"
                type="button"
                data-writeoff-confirm-close
                aria-label="Закрыть подтверждение"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <form class="settings-modal__body" data-writeoff-confirm-form>
              <div class="form-card writeoff-confirm-card">
                <div class="writeoff-confirm-title">
                  Выбрано инструментов:
                  <strong data-writeoff-confirm-count>0</strong>
                </div>
                <div class="writeoff-confirm-list" data-writeoff-confirm-list></div>
              </div>
              <label class="form-field">
                <span class="form-label">Акты на списание</span>
                <input
                  class="form-input"
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.heic"
                  multiple
                  data-writeoff-acts
                  required
                />
                <span class="form-hint">
                  Можно загрузить фото или документ.
                </span>
              </label>
              <div class="form-message" data-writeoff-confirm-message></div>
              <div class="writeoff-confirm-actions">
                <button
                  class="action-secondary"
                  type="button"
                  data-writeoff-confirm-cancel
                >
                  Отмена
                </button>
                <button class="action-primary" type="submit">
                  Подтвердить списание
                </button>
              </div>
            </form>
          </div>
        </div>
        <div
          class="settings-modal is-hidden tools-cancel-move-modal"
          data-tools-cancel-move-modal
        >
          <div
            class="settings-modal__backdrop"
            data-tools-cancel-move-backdrop
          ></div>
          <div
            class="settings-modal__panel tools-cancel-move-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Отмена перемещения"
          >
            <div class="settings-modal__header tools-cancel-move-modal__header">
              <div class="settings-modal__title tools-cancel-move-modal__title">
                <div class="tools-cancel-move-modal__title-row">
                  <h2>Отмена перемещения</h2>
                  <button
                    class="button-icon tools-cancel-move-modal__close"
                    type="button"
                    data-tools-cancel-move-close
                    aria-label="Закрыть окно отмены"
                  >
                    <span class="button-icon-emoji" aria-hidden="true">✕</span>
                  </button>
                </div>
                <p>Перемещение ещё ожидает ответа.</p>
              </div>
            </div>
            <div class="settings-modal__body">
              <div
                class="tools-cancel-move-info"
                data-tools-cancel-move-info
              ></div>
              <div class="form-message" data-tools-cancel-move-message></div>
            </div>
            <div class="settings-modal__footer tools-cancel-move-actions">
              <button
                class="action-danger tools-cancel-move-actions__keep"
                type="button"
                data-tools-cancel-move-cancel
              >
                Не отменять
              </button>
              <button
                class="action-primary tools-cancel-move-actions__confirm"
                type="button"
                data-tools-cancel-move-confirm
              >
                Отменить перемещение
              </button>
            </div>
          </div>
        </div>
        <div class="tools-modal settings-modal is-hidden" data-pending-moves-modal>
          <div class="settings-modal__backdrop" data-pending-moves-backdrop></div>
          <div
            class="settings-modal__panel tools-modal__panel pending-moves-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="На принятии"
          >
            <div class="settings-modal__header tools-modal__header">
              <div class="settings-modal__title">
                <h2>На принятии</h2>
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
              <div class="tools-list is-table" data-pending-moves-list></div>
              <div class="tools-empty is-hidden" data-pending-moves-empty>
                Нет инструментов, которые ждут ответа.
              </div>
              <div class="form-message" data-pending-moves-message></div>
            </div>
            <div class="settings-modal__footer pending-moves-modal__footer">
              <div class="pending-moves-actions" data-pending-moves-actions>
                <button
                  class="action-secondary pending-moves-action-button pending-moves-action-button--decline"
                  type="button"
                  data-pending-moves-decline-all
                >
                  Не принять всё
                </button>
                <button
                  class="action-primary pending-moves-action-button pending-moves-action-button--accept"
                  type="button"
                  data-pending-moves-accept-all
                >
                  Принять всё
                </button>
              </div>
            </div>
            <div class="pending-moves-loading is-hidden" data-pending-moves-loading aria-hidden="true">
              <div class="pending-moves-loading__box" role="status" aria-live="polite">
                <div class="pending-moves-loading__spinner" aria-hidden="true">🛠️</div>
                <p>Применяем действие...</p>
              </div>
            </div>
          </div>
        </div>
        <div class="tools-modal settings-modal is-hidden" data-awaiting-reply-modal>
          <div class="settings-modal__backdrop" data-awaiting-reply-backdrop></div>
          <div
            class="settings-modal__panel tools-modal__panel pending-moves-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Отправлено"
          >
            <div class="settings-modal__header tools-modal__header">
              <div class="settings-modal__title">
                <h2>Отправлено</h2>
                <p data-awaiting-reply-subtitle>Загружаем список...</p>
              </div>
              <button
                class="button-icon tools-modal__close"
                type="button"
                data-awaiting-reply-close
                aria-label="Закрыть список моих перемещений"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body tools-modal__body">
              <div class="tools-list is-table" data-awaiting-reply-list></div>
              <div class="tools-empty is-hidden" data-awaiting-reply-empty>
                По вашим перемещениям все ответы уже получены.
              </div>
              <div class="form-message" data-awaiting-reply-message></div>
            </div>
          </div>
        </div>
        <div
          class="settings-modal is-hidden pending-moves-bulk-confirm-modal"
          data-awaiting-reply-cancel-confirm-modal
        >
          <div
            class="settings-modal__backdrop"
            data-awaiting-reply-cancel-confirm-backdrop
          ></div>
          <div
            class="settings-modal__panel pending-moves-bulk-confirm-modal__panel pending-moves-decline-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Подтверждение отмены перемещения"
          >
            <div class="settings-modal__header pending-moves-decline-modal__header">
              <div class="settings-modal__title pending-moves-decline-modal__title-row">
                <h2>Отменить перемещение?</h2>
                <button
                  class="button-icon tools-modal__close pending-moves-decline-modal__close"
                  type="button"
                  data-awaiting-reply-cancel-confirm-close
                  aria-label="Закрыть окно подтверждения"
                >
                  <span class="button-icon-emoji" aria-hidden="true">✕</span>
                </button>
              </div>
            </div>
            <div class="settings-modal__body pending-moves-bulk-confirm-body">
              <p class="pending-moves-bulk-confirm-text">
                Вы действительно хотите отменить перемещение "Номер" - "Бух.номер" "Наименование" "Производитель" "Модель"
              </p>
            </div>
            <div class="settings-modal__footer pending-moves-bulk-confirm-actions pending-moves-decline-actions">
              <button
                class="action-secondary pending-moves-decline-actions__cancel pending-moves-bulk-confirm-cancel"
                type="button"
                data-awaiting-reply-cancel-confirm-cancel
              >
                Не отменять
              </button>
              <button
                class="action-danger pending-moves-decline-actions__submit pending-moves-bulk-confirm-submit pending-moves-bulk-confirm-submit--decline"
                type="button"
                data-awaiting-reply-cancel-confirm-submit
              >
                Отменить
              </button>
            </div>
          </div>
        </div>
        <div
          class="settings-modal is-hidden pending-moves-bulk-confirm-modal"
          data-pending-moves-bulk-confirm-modal
        >
          <div
            class="settings-modal__backdrop"
            data-pending-moves-bulk-confirm-backdrop
          ></div>
          <div
            class="settings-modal__panel pending-moves-bulk-confirm-modal__panel pending-moves-decline-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Подтверждение массового действия"
          >
            <div class="settings-modal__header pending-moves-decline-modal__header">
              <div class="settings-modal__title pending-moves-decline-modal__title-row">
                <h2 data-pending-moves-bulk-confirm-title>Подтвердите действие</h2>
                <button
                  class="button-icon tools-modal__close pending-moves-decline-modal__close"
                  type="button"
                  data-pending-moves-bulk-confirm-close
                  aria-label="Закрыть окно подтверждения"
                >
                  <span class="button-icon-emoji" aria-hidden="true">✕</span>
                </button>
              </div>
            </div>
            <div class="settings-modal__body pending-moves-bulk-confirm-body">
              <p class="pending-moves-bulk-confirm-text" data-pending-moves-bulk-confirm-text></p>
              <div class="form-field pending-moves-decline-field pending-moves-bulk-confirm-reason is-hidden" data-pending-moves-bulk-confirm-reason-block>
                <span class="form-label">Причина отказа</span>
                <textarea
                  class="form-input pending-moves-decline-textarea"
                  data-pending-moves-bulk-confirm-reason
                  rows="4"
                  placeholder="Коротко опишите причину"
                ></textarea>
              </div>
            </div>
            <div class="settings-modal__footer pending-moves-bulk-confirm-actions pending-moves-decline-actions">
              <button
                class="action-secondary pending-moves-decline-actions__cancel pending-moves-bulk-confirm-cancel"
                type="button"
                data-pending-moves-bulk-confirm-cancel
              >
                Отмена
              </button>
              <button
                class="action-primary pending-moves-decline-actions__submit pending-moves-bulk-confirm-submit"
                type="button"
                data-pending-moves-bulk-confirm-submit
              >
                Подтвердить
              </button>
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
            <div class="settings-modal__header pending-moves-decline-modal__header">
              <div class="settings-modal__title pending-moves-decline-modal__title-row">
                <h2>Почему не принимаете?</h2>
              </div>
            </div>
            <form class="settings-modal__body" data-pending-moves-decline-form>
              <div class="form-field pending-moves-decline-field">
                <span class="form-label">Причина</span>
                <textarea
                  class="form-input pending-moves-decline-textarea"
                  rows="4"
                  placeholder="Например: инструмент не получен, нет комплекта..."
                  data-pending-moves-decline-reason
                  required
                ></textarea>
              </div>
              <div class="form-field pending-moves-decline-field">
                <span class="form-label">Фото отказов (необязательно)</span>
                <input
                  class="form-input pending-moves-decline-file"
                  type="file"
                  accept="image/*"
                  data-pending-moves-decline-photo
                />
              </div>
              <div class="pending-moves-decline-actions">
                <button
                  class="action-secondary pending-moves-decline-actions__cancel"
                  type="button"
                  data-pending-moves-decline-cancel
                >
                  Отмена
                </button>
                <button
                  class="action-primary pending-moves-decline-actions__submit"
                  type="submit"
                >
                  Не принять
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
                  <label class="form-field form-field--required tools-move-modal__fixed-field">
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
                  <label class="form-field form-field--required tools-move-modal__fixed-field">
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
                  <label class="form-field" data-tools-move-reason-field>
                    <span class="form-label" data-tools-move-reason-label>Комментарий к перемещению (необязательно)</span>
                    <textarea
                      class="form-input"
                      rows="3"
                      placeholder="Необязательно. Например: требуется проверка или ремонт"
                      data-tools-move-reason
                    ></textarea>
                    <span class="form-hint is-hidden" data-tools-move-reason-hint></span>
                  </label>
                  <div class="tools-move-object-change-note is-hidden" data-tools-move-object-change-note>
                    🔄 Смена объекта
                  </div>
                </div>
                <div class="form-message" data-tools-move-message></div>
              </div>
              <div class="settings-modal__footer tools-move-modal__actions">
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
            aria-label="Управление фото"
          >
            <div class="settings-modal__header tools-modal__header">
              <div class="settings-modal__title settings-modal__title--single-line">
                <h2 data-add-photo-detail-title>Управление фото</h2>
              </div>
              <button
                class="button-icon tools-modal__close"
                type="button"
                data-add-photo-close
                aria-label="Закрыть карточку инструмента"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body tools-modal__body" data-add-photo-detail-body>
              <div class="tools-info-card tools-info-card--add-photo-hint">
                <div class="tools-info-card__title">Выберите инструмент</div>
                <div class="tools-info-card__grid">
                  <div class="tools-info-card__label">КАК РАБОТАТЬ</div>
                  <div class="tools-info-card__value">
                    Откройте «Добавить фото», выберите инструмент из общего списка и загрузите новое фото.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="tools-modal settings-modal is-hidden" data-no-photo-modal>
          <div class="settings-modal__backdrop" data-no-photo-backdrop></div>
          <div
            class="settings-modal__panel tools-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Без фото"
          >
            <div class="settings-modal__header tools-modal__header">
              <div class="settings-modal__title">
                <h2>Без фото</h2>
                <p data-no-photo-subtitle>Загружаем список...</p>
              </div>
              <button
                class="button-icon tools-modal__close"
                type="button"
                data-no-photo-close
                aria-label="Закрыть список инструментов"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body tools-modal__body">
              <div class="tools-controls">
                <div class="tools-controls__row tools-controls__row--no-photo-search">
                  <label class="tools-search">
                    <input
                      class="form-input tools-search__input"
                      type="search"
                      placeholder="Поиск по номеру, бух.номеру, названию..."
                      data-no-photo-search
                      autocomplete="off"
                    />
                  </label>
                  <div class="tools-actions tools-actions--no-photo" role="group" aria-label="Группировка, сортировка и фильтры">
                    <button
                      class="tools-filters-toggle is-hidden"
                      type="button"
                      data-no-photo-filters-toggle
                      aria-expanded="false"
                      aria-controls="no-photo-filters-panel"
                      aria-label="Фильтры"
                    >
                      <span class="tools-filters-toggle__icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false" fill="none">
                          <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                          <circle cx="15" cy="7" r="2.5" fill="currentColor" />
                          <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                          <circle cx="9" cy="17" r="2.5" fill="currentColor" />
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
                <div
                  class="tools-filters"
                  id="no-photo-filters-panel"
                  data-no-photo-filters-panel
                >
                  <label class="tools-filter">
                    <span>Группа</span>
                    <div class="tools-filter-dropdown" data-no-photo-filter="group">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-no-photo-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-no-photo-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-no-photo-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-no-photo-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter">
                    <span>Объект</span>
                    <div class="tools-filter-dropdown" data-no-photo-filter="object">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-no-photo-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-no-photo-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-no-photo-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-no-photo-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter">
                    <span>Статус</span>
                    <div class="tools-filter-dropdown" data-no-photo-filter="status">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-no-photo-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-no-photo-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-no-photo-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-no-photo-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter">
                    <span>Ответственный</span>
                    <div class="tools-filter-dropdown" data-no-photo-filter="responsible">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-no-photo-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-no-photo-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-no-photo-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-no-photo-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter">
                    <span>Наименование</span>
                    <div class="tools-filter-dropdown" data-no-photo-filter="name">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-no-photo-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-no-photo-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-no-photo-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-no-photo-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter">
                    <span>Производитель</span>
                    <div class="tools-filter-dropdown" data-no-photo-filter="manufacturer">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-no-photo-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-no-photo-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-no-photo-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-no-photo-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter">
                    <span>Модель</span>
                    <div class="tools-filter-dropdown" data-no-photo-filter="model">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-no-photo-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-no-photo-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-no-photo-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-no-photo-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter">
                    <span>Фото</span>
                    <div class="tools-filter-dropdown" data-no-photo-filter="photo">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-no-photo-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-no-photo-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-no-photo-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-no-photo-filter-options></div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              <div class="tools-list is-table" data-no-photo-list></div>
              <div class="tools-empty is-hidden" data-no-photo-empty>
                Инструменты без фото не найдены. Попробуйте изменить поисковый запрос.
              </div>
            </div>
          </div>
        </div>
        <div class="tools-modal settings-modal is-hidden" data-no-photo-tool-modal>
          <div class="settings-modal__backdrop" data-no-photo-tool-backdrop></div>
          <div
            class="settings-modal__panel tools-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Карточка инструмента без фото"
          >
            <div class="settings-modal__header tools-modal__header">
              <div class="settings-modal__title">
                <h2>Инструмент без фото</h2>
                <p data-no-photo-tool-subtitle>Загружаем данные инструмента...</p>
              </div>
              <button
                class="button-icon tools-modal__close"
                type="button"
                data-no-photo-tool-close
                aria-label="Закрыть карточку инструмента"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body tools-modal__body">
              <div data-no-photo-tool-content></div>
            </div>
          </div>
        </div>
        <div class="tools-modal settings-modal is-hidden" data-remove-photo-modal>
          <div class="settings-modal__backdrop" data-remove-photo-backdrop></div>
          <div
            class="settings-modal__panel tools-modal__panel remove-photo-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Удалить фото"
          >
            <div class="settings-modal__header tools-modal__header">
              <div class="settings-modal__title">
                <h2>Удалить фото</h2>
                <p data-remove-photo-subtitle>Загружаем список...</p>
              </div>
              <button
                class="button-icon tools-modal__close"
                type="button"
                data-remove-photo-close
                aria-label="Закрыть окно удаления фото"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body tools-modal__body">
              <div class="remove-photo-view" data-remove-photo-view="list">
                <div class="tools-controls">
                  <div class="tools-controls__row">
                    <label class="tools-search">
                      <input
                        class="form-input tools-search__input"
                        type="search"
                        placeholder="Поиск по номеру, названию, модели..."
                        data-remove-photo-search
                        autocomplete="off"
                      />
                    </label>
                  </div>
                </div>
                <div class="tools-list is-table" data-remove-photo-list></div>
                <div class="tools-empty is-hidden" data-remove-photo-empty>
                  Инструменты с фото не найдены. Попробуйте изменить поиск.
                </div>
              </div>
              <div
                class="remove-photo-view is-hidden"
                data-remove-photo-view="photos"
              >
                <div class="remove-photo-tool">
                  <button
                    class="button-icon remove-photo-back"
                    type="button"
                    data-remove-photo-back
                    aria-label="Вернуться к списку инструментов"
                  >
                    <span class="button-icon-emoji" aria-hidden="true">←</span>
                  </button>
                  <div class="remove-photo-tool__info">
                    <div class="remove-photo-tool__title" data-remove-photo-tool-title>
                      Инструмент
                    </div>
                    <div class="remove-photo-tool__meta" data-remove-photo-tool-meta></div>
                  </div>
                </div>
                <div class="remove-photo-photos" data-remove-photo-photos></div>
                <div class="remove-photo-empty is-hidden" data-remove-photo-photos-empty>
                  Для этого инструмента фото не найдены.
                </div>
                <div class="remove-photo-actions">
                  <div class="remove-photo-selected">
                    Выбрано: <span data-remove-photo-selected>0</span>
                  </div>
                  <button
                    class="action-primary"
                    type="button"
                    data-remove-photo-delete
                    disabled
                  >
                    Удалить выбранные
                  </button>
                </div>
                <div class="form-message" data-remove-photo-message></div>
              </div>
            </div>
          </div>
        </div>
        <div class="tools-modal settings-modal is-hidden breakdowns-modal" data-breakdowns-modal>
          <div class="settings-modal__backdrop" data-breakdowns-backdrop></div>
          <div
            class="settings-modal__panel tools-modal__panel breakdowns-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Поломки"
          >
            <div class="settings-modal__header tools-modal__header">
              <div class="settings-modal__title">
                <h2>Поломки</h2>
                <p data-breakdowns-subtitle>Выберите инструмент для фиксации поломки</p>
              </div>
              <button
                class="button-icon tools-modal__close"
                type="button"
                data-breakdowns-close
                aria-label="Закрыть список инструментов"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div
              class="settings-modal__body tools-modal__body"
              style="padding-inline: 5px;"
            >
              <div class="tools-controls">
                <div class="tools-controls__row">
                  <label class="tools-search breakdowns-search">
                    <input
                      class="form-input tools-search__input"
                      type="search"
                      placeholder="Поиск по номеру, названию, модели..."
                      data-breakdowns-search
                      autocomplete="off"
                    />
                  </label>
                  <div class="tools-actions">
                    <div
                      class="tools-view-toggle"
                      role="group"
                      aria-label="Вариант отображения"
                      data-breakdowns-view-toggle
                    >
                      <button class="tools-view-button" type="button" data-breakdowns-view="large">
                        Крупные
                      </button>
                      <button class="tools-view-button is-active" type="button" data-breakdowns-view="table">
                        Таблица
                      </button>
                    </div>
                    <div class="tools-filter-actions" role="group" aria-label="Сортировка и фильтры">
                      <button
                        class="tools-filters-toggle"
                        type="button"
                        data-breakdowns-broken-only-toggle
                        aria-label="Показать только инструменты со статусом Сломан"
                        title="Только сломанные"
                        aria-pressed="false"
                      >
                        <span class="tools-filters-toggle__icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" focusable="false">
                            <path d="M11.3 3.95a.8.8 0 0 1 1.4 0l8 14a.8.8 0 0 1-.7 1.2H4a.8.8 0 0 1-.7-1.2l8-14Zm.7 4.6a.75.75 0 0 0-.75.75v4.7a.75.75 0 1 0 1.5 0V9.3a.75.75 0 0 0-.75-.75Zm0 8.95a.95.95 0 1 0 0-1.9.95.95 0 0 0 0 1.9Z" />
                          </svg>
                        </span>
                      </button>
                      <div class="tools-grouping-dropdown" data-breakdowns-grouping-dropdown>
                        <button
                          class="tools-filters-toggle tools-grouping-toggle"
                          type="button"
                          data-breakdowns-grouping-toggle
                          aria-expanded="false"
                          aria-label="Группировка инструментов"
                          title="Группировка инструментов"
                        >
                          <span class="tools-filters-toggle__icon tools-grouping-toggle__icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" focusable="false">
                              <path d="M5 6.25A1.25 1.25 0 0 1 6.25 5h3.5A1.25 1.25 0 0 1 11 6.25v1.5A1.25 1.25 0 0 1 9.75 9h-3.5A1.25 1.25 0 0 1 5 7.75v-1.5Zm8 0A1.25 1.25 0 0 1 14.25 5h3.5A1.25 1.25 0 0 1 19 6.25v1.5A1.25 1.25 0 0 1 17.75 9h-3.5A1.25 1.25 0 0 1 13 7.75v-1.5Zm-4 5A1.25 1.25 0 0 1 10.25 10h3.5A1.25 1.25 0 0 1 15 11.25v1.5A1.25 1.25 0 0 1 13.75 14h-3.5A1.25 1.25 0 0 1 9 12.75v-1.5Zm-4 5A1.25 1.25 0 0 1 6.25 15h3.5A1.25 1.25 0 0 1 11 16.25v1.5A1.25 1.25 0 0 1 9.75 19h-3.5A1.25 1.25 0 0 1 5 17.75v-1.5Zm8 0A1.25 1.25 0 0 1 14.25 15h3.5A1.25 1.25 0 0 1 19 16.25v1.5A1.25 1.25 0 0 1 17.75 19h-3.5A1.25 1.25 0 0 1 13 17.75v-1.5Z" />
                            </svg>
                          </span>
                        </button>
                        <div class="tools-grouping-dropdown__menu is-hidden" data-breakdowns-grouping-menu>
                          <button type="button" class="tools-grouping-option is-active" data-breakdowns-grouping-option="none">Без группировки</button>
                          <button type="button" class="tools-grouping-option" data-breakdowns-grouping-option="responsible">По ответственному</button>
                          <button type="button" class="tools-grouping-option" data-breakdowns-grouping-option="object">По объекту</button>
                          <button type="button" class="tools-grouping-option" data-breakdowns-grouping-option="status">По статусу</button>
                          <button type="button" class="tools-grouping-option" data-breakdowns-grouping-option="name">По наименованию</button>
                          <button type="button" class="tools-grouping-option" data-breakdowns-grouping-option="group">По группам</button>
                        </div>
                      </div>
                      <button
                        class="tools-filters-toggle tools-sort-toggle"
                        type="button"
                        data-breakdowns-sort-toggle
                        aria-label="Сортировка по номеру инструмента: по убыванию"
                        title="Сортировка по номеру инструмента: по убыванию"
                      >
                        <span class="tools-sort-toggle__icon is-desc" aria-hidden="true">
                          <svg class="tools-sort-toggle__chevron" viewBox="0 0 24 24" focusable="false">
                            <path d="M5 8.5L12 15.5L19 8.5" />
                          </svg>
                        </span>
                      </button>
                      <button
                        class="tools-filters-toggle"
                        type="button"
                        data-breakdowns-filters-toggle
                        aria-expanded="false"
                        aria-controls="breakdowns-filters-panel"
                        aria-label="Фильтры"
                      >
                        <span class="tools-filters-toggle__icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" focusable="false" fill="none">
                            <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                            <circle cx="15" cy="7" r="2.5" fill="currentColor" />
                            <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                            <circle cx="9" cy="17" r="2.5" fill="currentColor" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
                <div class="tools-filters" id="breakdowns-filters-panel" data-breakdowns-filters-panel>
                  <label class="tools-filter">
                    <span>Группа</span>
                    <div class="tools-filter-dropdown" data-breakdowns-filter="group">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-breakdowns-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-breakdowns-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-breakdowns-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-breakdowns-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter">
                    <span>Объект</span>
                    <div class="tools-filter-dropdown" data-breakdowns-filter="object">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-breakdowns-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-breakdowns-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-breakdowns-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-breakdowns-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter">
                    <span>Статус</span>
                    <div class="tools-filter-dropdown" data-breakdowns-filter="status">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-breakdowns-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-breakdowns-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-breakdowns-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-breakdowns-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter">
                    <span>Ответственный</span>
                    <div class="tools-filter-dropdown" data-breakdowns-filter="responsible">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-breakdowns-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-breakdowns-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-breakdowns-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-breakdowns-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter">
                    <span>Наименование</span>
                    <div class="tools-filter-dropdown" data-breakdowns-filter="name">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-breakdowns-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-breakdowns-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-breakdowns-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-breakdowns-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter">
                    <span>Производитель</span>
                    <div class="tools-filter-dropdown" data-breakdowns-filter="manufacturer">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-breakdowns-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-breakdowns-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-breakdowns-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-breakdowns-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter">
                    <span>Модель</span>
                    <div class="tools-filter-dropdown" data-breakdowns-filter="model">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-breakdowns-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-breakdowns-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-breakdowns-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-breakdowns-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <label class="tools-filter">
                    <span>Фото</span>
                    <div class="tools-filter-dropdown" data-breakdowns-filter="photo">
                      <button type="button" class="form-input tools-filter-dropdown__trigger" data-breakdowns-filter-trigger>
                        Все
                      </button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-breakdowns-filter-menu>
                        <button type="button" class="tools-filter-dropdown__clear" data-breakdowns-filter-clear>
                          Выбрать всё
                        </button>
                        <div class="tools-filter-dropdown__options" data-breakdowns-filter-options></div>
                      </div>
                    </div>
                  </label>
                  <div class="tools-filters-controls">
                    <div class="tools-filters-status" data-breakdowns-filters-status>Фильтры не выбраны</div>
                    <button type="button" class="tools-filters-reset is-hidden" data-breakdowns-filters-reset>Сбросить всё</button>
                  </div>
                </div>
              </div>
              <div class="tools-list is-table breakdowns-list" data-breakdowns-list></div>
              <div class="tools-empty is-hidden" data-breakdowns-empty>
                Инструменты не найдены. Попробуйте другой поиск.
              </div>
              <div class="form-message" data-breakdowns-message></div>
            </div>
          </div>
        </div>
        <div class="tools-modal settings-modal is-hidden breakdowns-modal repair-modal" data-repair-modal>
          <div class="settings-modal__backdrop" data-repair-backdrop></div>
          <div
            class="settings-modal__panel tools-modal__panel breakdowns-modal__panel repair-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Ремонт"
          >
            <div class="settings-modal__header tools-modal__header">
              <div class="settings-modal__title">
                <h2>Ремонт</h2>
                <p data-repair-subtitle>Выберите инструмент для ремонта</p>
              </div>
              <button
                class="button-icon tools-modal__close"
                type="button"
                data-repair-close
                aria-label="Закрыть список инструментов"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body tools-modal__body">
              <div class="tools-controls">
                <div class="tools-controls__row">
                  <label class="tools-search breakdowns-search">
                    <input
                      class="form-input tools-search__input"
                      type="search"
                      placeholder="Поиск по номеру, названию, модели..."
                      data-repair-search
                      autocomplete="off"
                    />
                  </label>
                </div>
                <div class="tools-controls__row">
                  <label class="tools-quick-filter breakdowns-status-filter">
                    <span>По статусу</span>
                    <select
                      class="form-input"
                      data-repair-status-filter
                      aria-label="Статус"
                    >
                      <option value="">Всё</option>
                    </select>
                  </label>
                </div>
              </div>
              <div class="tools-list is-table breakdowns-list" data-repair-list></div>
              <div class="tools-empty is-hidden" data-repair-empty>
                Инструменты не найдены. Попробуйте другой поиск.
              </div>
              <div class="form-message" data-repair-message></div>
            </div>
          </div>
        </div>
        <div
          class="settings-modal is-hidden repair-form-modal"
          data-repair-form-modal
        >
          <div class="settings-modal__backdrop" data-repair-form-backdrop></div>
          <div
            class="settings-modal__panel repair-form-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Отправка в ремонт"
          >
            <div class="settings-modal__header repair-form__header">
              <div class="settings-modal__title">
                <h2 data-repair-form-title>Отправка в ремонт</h2>
                <p data-repair-form-subtitle>Проверьте данные инструмента</p>
              </div>
              <button
                class="button-icon tools-modal__close"
                type="button"
                data-repair-form-close
                aria-label="Закрыть окно отправки в ремонт"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <form class="settings-modal__form repair-form" data-repair-form>
              <div class="settings-modal__body repair-form__body">
                <div class="breakdown-tool-card breakdown-tool-card--highlight">
                  <div class="breakdown-tool-caption">Информация об инструменте</div>
                  <div class="breakdown-tool-title" data-repair-tool-title>
                    —
                  </div>
                  <div class="breakdown-tool-meta" data-repair-tool-meta></div>
                </div>
                <div
                  class="breakdown-tool-card breakdown-tool-card--details is-hidden"
                  data-repair-info-card
                >
                  <div class="breakdown-tool-caption">Информация о ремонте</div>
                  <div class="breakdown-tool-meta" data-repair-info-meta></div>
                </div>
                <div class="repair-form__section" data-repair-form-send>
                  <label class="form-field form-field--required">
                    <span class="form-label">Организация</span>
                    <div class="suggestions-field">
                      <input
                        class="form-input"
                        type="text"
                        name="repair-organization"
                        data-repair-organization
                        placeholder="Куда отправляем инструмент"
                        autocomplete="off"
                        required
                      />
                      <div
                        class="suggestions is-hidden"
                        data-repair-organization-suggestions
                      ></div>
                    </div>
                  </label>
                  <label class="form-field">
                    <span class="form-label">Предварительное описание ремонта</span>
                    <textarea
                      class="form-input"
                      name="repair-description"
                      data-repair-description
                      rows="3"
                      placeholder="Опишите, что нужно сделать"
                    ></textarea>
                  </label>
                  <label class="form-field">
                    <span class="form-label">Предварительная стоимость ремонта</span>
                    <input
                      class="form-input"
                      type="text"
                      inputmode="decimal"
                      name="repair-cost"
                      data-repair-cost
                      placeholder="Например, 2 500"
                    />
                  </label>
                </div>
                <div class="repair-form__section is-hidden" data-repair-form-complete>
                  <label class="form-field form-field--required">
                    <span class="form-label">Стоимость ремонта</span>
                    <input
                      class="form-input"
                      type="text"
                      inputmode="decimal"
                      name="repair-final-cost"
                      data-repair-final-cost
                      placeholder="Например, 2 500"
                      required
                    />
                  </label>
                  <div class="form-field form-field--required">
                    <span class="form-label">Акт ремонта</span>
                    <div class="form-file-row">
                      <label class="form-file-option">
                        <input
                          class="form-input form-input--file"
                          type="file"
                          name="repair-act"
                          data-repair-act
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        />
                        <span class="form-file-button" aria-hidden="true">
                          Добавить файл
                        </span>
                      </label>
                      <input
                        class="form-input form-input--file is-hidden"
                        type="file"
                        name="repair-act-photo"
                        data-repair-act-photo
                        accept="image/*"
                      />
                      <button
                        class="form-file-option form-file-option--button"
                        type="button"
                        data-repair-camera-trigger
                      >
                        <span class="form-file-button" aria-hidden="true">
                          Сделать фото
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="settings-modal__footer repair-form__footer">
                <div
                  class="form-message form-message--inline"
                  role="status"
                  aria-live="polite"
                  data-repair-form-message
                ></div>
                <div class="settings-modal__actions repair-form__actions">
                  <button
                    class="action-secondary"
                    type="button"
                    data-repair-form-cancel
                  >
                    Отмена
                  </button>
                  <button
                    class="action-primary"
                    type="submit"
                    data-repair-form-submit
                  >
                    Отправить в ремонт
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        <div
          class="settings-modal is-hidden breakdown-status-modal"
          data-breakdown-status-modal
        >
          <div
            class="settings-modal__backdrop"
            data-breakdown-status-backdrop
          ></div>
          <div
            class="settings-modal__panel breakdown-status-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Статус поломки"
          >
            <div class="settings-modal__header breakdown-form__header">
              <div class="settings-modal__title">
                <h2>Поломка: статус</h2>
                <p data-breakdown-status-subtitle>
                  Проверьте данные инструмента
                </p>
              </div>
              <button
                class="button-icon breakdown-form__close"
                type="button"
                data-breakdown-status-close
                aria-label="Закрыть окно статуса"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body breakdown-form__body">
              <div class="breakdown-tool-card breakdown-tool-card--highlight">
                <div class="breakdown-tool-caption">Информация об инструменте</div>
                <div class="breakdown-tool-title" data-breakdown-status-tool-title>
                  —
                </div>
                <div class="breakdown-tool-meta" data-breakdown-status-tool-meta></div>
              </div>
              <div class="breakdown-tool-card breakdown-tool-card--details">
                <div class="breakdown-tool-caption">Информация о поломке</div>
                <div class="breakdown-tool-meta" data-breakdown-status-info-meta></div>
              </div>
            </div>
            <div class="settings-modal__footer breakdown-form__footer">
              <div
                class="form-message form-message--inline"
                role="status"
                aria-live="polite"
                data-breakdown-status-message
              ></div>
              <div class="settings-modal__actions breakdown-form__actions">
                <button
                  class="action-secondary breakdown-form__cancel"
                  type="button"
                  data-breakdown-status-action="send-repair"
                >
                  Отправить в ремонт
                </button>
                <button
                  class="action-primary breakdown-form__submit"
                  type="button"
                  data-breakdown-status-action="repaired"
                >
                  Пометить исправный
                </button>
              </div>
            </div>
          </div>
        </div>
        <div
          class="settings-modal camera-modal is-hidden"
          data-repair-camera-modal
        >
          <div class="settings-modal__backdrop" data-repair-camera-backdrop></div>
          <div
            class="settings-modal__panel camera-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Фото акта ремонта"
          >
            <div class="settings-modal__header camera-modal__header">
              <div class="settings-modal__title">
                <h2>Фото акта ремонта</h2>
                <p data-add-tool-camera-subtitle>Сделайте снимок и подтвердите</p>
              </div>
              <button
                class="button-icon camera-modal__close"
                type="button"
                data-repair-camera-close
                aria-label="Закрыть камеру"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body camera-modal__body">
              <div class="camera-preview" data-repair-camera-preview>
                <video
                  class="camera-preview__video"
                  data-repair-camera-video
                  autoplay
                  playsinline
                ></video>
                <canvas
                  class="camera-preview__canvas is-hidden"
                  data-repair-camera-canvas
                ></canvas>
              </div>
              <div class="camera-hint" data-repair-camera-hint>
                Сфотографируйте акт ремонта и подтвердите снимок.
              </div>
            </div>
            <div class="settings-modal__footer camera-modal__footer">
              <button
                class="action-secondary"
                type="button"
                data-repair-camera-cancel
              >
                Отмена
              </button>
              <button
                class="action-primary"
                type="button"
                data-repair-camera-capture
              >
                Сфотографировать
              </button>
              <button
                class="action-secondary is-hidden"
                type="button"
                data-repair-camera-retake
              >
                Переснять
              </button>
              <button
                class="action-primary is-hidden"
                type="button"
                data-repair-camera-save
              >
                Использовать фото
              </button>
            </div>
          </div>
        </div>
        <div
          class="settings-modal is-hidden breakdown-form-modal"
          data-breakdown-form-modal
        >
          <div
            class="settings-modal__backdrop"
            data-breakdown-form-backdrop
          ></div>
          <div
            class="settings-modal__panel breakdown-form-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Поломка инструмента"
          >
            <div class="settings-modal__header breakdown-form__header">
              <div class="settings-modal__title">
                <h2>Поломка инструмента</h2>
                
              </div>
              <button
                class="button-icon breakdown-form__close"
                type="button"
                data-breakdown-form-close
                aria-label="Закрыть форму поломки"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <form class="settings-modal__form breakdown-form" data-breakdown-form>
              <div class="settings-modal__body breakdown-form__body">
                <div class="breakdown-tool-card breakdown-tool-card--highlight">
                  <div class="breakdown-tool-caption">Информация об инструменте</div>
                  <div class="breakdown-tool-title" data-breakdown-tool-title>
                    —
                  </div>
                  <div class="breakdown-tool-meta" data-breakdown-tool-meta></div>
                </div>
                <label class="form-field form-field--required">
                  <textarea
                    class="form-input"
                    name="breakdown-description"
                    data-breakdown-description
                    rows="3"
                    placeholder="Опишите, что случилось и что не работает"
                    required
                  ></textarea>
                </label>
                <div class="form-field">
                  <span class="form-label">Фото поломки</span>
                  <div class="form-file-row breakdown-photo-actions">
                    <label class="form-file-option breakdown-photo-actions__item">
                      <input
                        class="form-input form-input--file"
                        type="file"
                        accept="image/*"
                        multiple
                        data-breakdown-photo-input
                      />
                      <span class="form-file-button" aria-hidden="true">
                        Выбрать фото
                      </span>
                    </label>
                    <button
                      class="form-file-option form-file-option--button breakdown-photo-actions__item"
                      type="button"
                      data-breakdown-camera-trigger
                    >
                      <span class="form-file-button" aria-hidden="true">
                        Сделать фото
                      </span>
                    </button>
                  </div>
                  <div class="breakdown-photo-summary">
                    Добавлено фото: <strong data-breakdown-photo-count>0</strong>
                  </div>
                  <div class="breakdown-photo-grid" data-breakdown-photo-preview></div>
                </div>
              </div>
              <div class="settings-modal__footer breakdown-form__footer">
                <div
                  class="form-message form-message--inline"
                  role="status"
                  aria-live="polite"
                  data-breakdown-form-message
                ></div>
                <div class="settings-modal__actions breakdown-form__actions">
                  <button
                    class="action-secondary breakdown-form__cancel"
                    type="button"
                    data-breakdown-form-cancel
                  >
                    Отмена
                  </button>
                  <button class="action-primary breakdown-form__submit" type="submit">
                    Пометить сломанным
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        <div
          class="settings-modal camera-modal is-hidden"
          data-breakdown-camera-modal
        >
          <div
            class="settings-modal__backdrop"
            data-breakdown-camera-backdrop
          ></div>
          <div
            class="settings-modal__panel camera-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Фото поломки"
          >
            <div class="settings-modal__header camera-modal__header">
              <div class="settings-modal__title">
                <h2>Фото поломки</h2>
                <p data-add-tool-camera-subtitle>Сделайте снимок и подтвердите</p>
              </div>
              <button
                class="button-icon camera-modal__close"
                type="button"
                data-breakdown-camera-close
                aria-label="Закрыть камеру"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body camera-modal__body">
              <div class="camera-preview" data-breakdown-camera-preview>
                <video
                  class="camera-preview__video"
                  data-breakdown-camera-video
                  autoplay
                  playsinline
                ></video>
                <canvas
                  class="camera-preview__canvas is-hidden"
                  data-breakdown-camera-canvas
                ></canvas>
              </div>
              <div class="camera-hint" data-breakdown-camera-hint>
                Сфотографируйте поломку и подтвердите снимок.
              </div>
            </div>
            <div class="settings-modal__footer camera-modal__footer">
              <button
                class="action-secondary"
                type="button"
                data-breakdown-camera-cancel
              >
                Отмена
              </button>
              <button
                class="action-primary"
                type="button"
                data-breakdown-camera-capture
              >
                Сфотографировать
              </button>
              <button
                class="action-secondary is-hidden"
                type="button"
                data-breakdown-camera-retake
              >
                Переснять
              </button>
              <button
                class="action-primary is-hidden"
                type="button"
                data-breakdown-camera-save
              >
                Использовать фото
              </button>
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
              </div>
              <button
                class="button-icon tools-modal__close add-tool-modal__close"
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
                    <div
                      class="suggestions is-hidden"
                      data-tool-accounting-number-suggestions
                    ></div>
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
                      id="tool-accounting-name-input"
                      type="text"
                      name="tool-accounting-name"
                      placeholder="Можно оставить пустым"
                      autocomplete="off"
                    />
                    <div
                      class="suggestions is-hidden"
                      data-tool-accounting-name-suggestions
                    ></div>
                  </label>
                  <label class="form-field form-field--required">
                    <span class="form-label">Стоимость</span>
                    <input
                      class="form-input"
                      id="tool-cost-input"
                      type="text"
                      inputmode="decimal"
                      name="tool-cost"
                      placeholder="Например, 12500"
                      autocomplete="off"
                      required
                    />
                    <div
                      class="suggestions is-hidden"
                      data-tool-cost-suggestions
                    ></div>
                  </label>
                  <label class="form-field form-field--required form-field--selectable">
                    <span class="form-label">Ответственный</span>
                    <select
                      class="form-input form-input--selectable form-select--selectable"
                      id="tool-responsible-input"
                      name="tool-responsible"
                      data-placeholder="Выберите пользователя"
                      required
                    >
                      <option value="">Выберите пользователя</option>
                    </select>
                  </label>
                  <label class="form-field form-field--required form-field--selectable">
                    <span class="form-label">Объект</span>
                    <input
                      class="form-input form-input--selectable"
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
                      id="tool-serial-number-input"
                      type="text"
                      name="tool-serial-number"
                      placeholder="Можно оставить пустым"
                      autocomplete="off"
                    />
                    <div
                      class="suggestions is-hidden"
                      data-tool-serial-number-suggestions
                    ></div>
                  </label>
                  <label class="form-field form-field--required form-field--selectable">
                    <span class="form-label">Группа инструментов</span>
                    <input
                      class="form-input form-input--selectable"
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
                  <div class="add-tool-kit" data-add-tool-kit>
                    <button
                      class="action-secondary add-tool-kit__toggle"
                      type="button"
                      data-add-tool-kit-toggle
                      aria-expanded="false"
                    >
                      Добавить комплектацию
                    </button>
                    <div
                      class="add-tool-kit__panel is-hidden"
                      data-add-tool-kit-panel
                    >
                      <div class="add-tool-kit__title">Комплектация</div>
                      <p class="add-tool-kit__hint">
                        Добавьте, что идёт в комплекте. Количество и бух.номер —
                        необязательно.
                      </p>
                      <div class="add-tool-kit__list" data-add-tool-kit-list></div>
                      <button
                        class="action-secondary add-tool-kit__add"
                        type="button"
                        data-add-tool-kit-add
                      >
                        + Добавить позицию
                      </button>
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
                      class="action-danger add-tool-modal__cancel"
                      type="button"
                      data-add-tool-cancel
                    >
                      Отмена
                    </button>
                    <button class="action-primary add-tool-modal__save" type="submit">Сохранить</button>
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
                <p data-add-tool-camera-subtitle>Сделайте снимок и подтвердите</p>
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
                  class="settings-modal users-vacation-modal is-hidden"
                  data-users-vacation-modal
                >
                  <div
                    class="settings-modal__backdrop"
                    data-users-vacation-backdrop
                  ></div>
                  <div
                    class="settings-modal__panel users-vacation-modal__panel"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Управление отпуском ответственного"
                  >
                    <div class="settings-modal__header users-vacation-modal__header">
                      <div class="settings-modal__title users-vacation-modal__title">
                        <div class="users-vacation-modal__headline">
                          <h3 data-users-vacation-name>Ответственный</h3>
                          <button
                            class="button-icon users-vacation-modal__close"
                            type="button"
                            data-users-vacation-close
                            aria-label="Закрыть окно отпуска"
                          >
                            <span class="button-icon-emoji" aria-hidden="true">✕</span>
                          </button>
                        </div>
                        <p data-users-vacation-role>—</p>
                      </div>
                    </div>
                    <div class="settings-modal__body users-vacation-modal__body">
                      <div class="users-vacation__stats">
                        <div class="users-vacation__stat-card">
                          <span class="users-vacation__stat-label">Инструментов</span>
                          <strong data-users-vacation-tools-count>0</strong>
                        </div>
                        <div class="users-vacation__fines" data-users-vacation-fines></div>
                      </div>
                      <div class="users-vacation__controls">
                        <button
                          class="action-primary users-vacation__trigger"
                          type="button"
                          data-users-vacation-trigger
                        >
                          Отпуск
                        </button>
                        <button
                          class="action-secondary users-vacation__return is-hidden"
                          type="button"
                          data-users-vacation-return
                        >
                          Вернуть из отпуска
                        </button>
                        <div class="users-vacation__replace is-hidden" data-users-vacation-replace>
                          <div
                            class="users-vacation__replacer-pending-note"
                            data-users-vacation-replacer-pending-note
                          >
                            Инструментов другого пользователя на принятии: 0
                          </div>
                          <label class="form-label" for="users-vacation-replacer">
                            Кто заменяет
                          </label>
                          <input
                            class="form-input users-vacation__search"
                            type="search"
                            id="users-vacation-replacer-search"
                            data-users-vacation-replacer-search
                            placeholder="Быстрый поиск по ФИО"
                            autocomplete="off"
                          />
                          <select
                            class="form-input"
                            id="users-vacation-replacer"
                            data-users-vacation-replacer
                          >
                            <option value="">Выберите сотрудника</option>
                          </select>
                          <div
                            class="users-vacation__search-results is-hidden"
                            data-users-vacation-search-results
                          ></div>
                          <div class="users-vacation__actions">
                            <button
                              class="action-primary"
                              type="button"
                              data-users-vacation-confirm
                            >
                              Подтвердить
                            </button>
                            <button
                              class="action-secondary"
                              type="button"
                              data-users-vacation-cancel
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                        <div
                          class="form-message users-vacation__message"
                          role="status"
                          data-users-vacation-message
                        ></div>
                      </div>
                    </div>
                  </div>
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
                      <option value="Контроль">Контроль</option>
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
        <div class="settings-modal info-hub-modal is-hidden" data-energy-info-modal>
          <div class="settings-modal__backdrop" data-energy-info-backdrop></div>
          <div
            class="settings-modal__panel info-hub-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Раздел информации"
          >
            <div class="settings-modal__header info-hub-modal__header info-hub-modal__header--compact">
              <div class="settings-modal__title">
                <h2>Информация</h2>
              </div>
              <button
                class="button-icon"
                type="button"
                data-energy-info-close
                aria-label="Закрыть окно информации"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body info-hub-modal__body">
              <div class="info-hub-modal__grid" data-energy-info-grid>
                <button type="button" class="info-hub-option" data-energy-info-option="instructions">
                  <span class="info-hub-option__icon" aria-hidden="true">📘</span>
                  <span class="info-hub-option__text">Инструкции</span>
                </button>
                <button type="button" class="info-hub-option" data-energy-info-option="pending-list">
                  <span class="info-hub-option__icon" aria-hidden="true">📥</span>
                  <span class="info-hub-option__text">Список на принятии</span>
                </button>
                <button type="button" class="info-hub-option" data-energy-info-option="moves-history">
                  <span class="info-hub-option__icon" aria-hidden="true">🧭</span>
                  <span class="info-hub-option__text">История перемещений</span>
                </button>
                <button type="button" class="info-hub-option" data-energy-info-option="by-dates">
                  <span class="info-hub-option__icon" aria-hidden="true">📅</span>
                  <span class="info-hub-option__text">По датам</span>
                </button>
                <button type="button" class="info-hub-option" data-energy-info-option="repair">
                  <span class="info-hub-option__icon" aria-hidden="true">🛠️</span>
                  <span class="info-hub-option__text">Ремонт</span>
                </button>
                <button type="button" class="info-hub-option" data-energy-info-option="fines">
                  <span class="info-hub-option__icon" aria-hidden="true">💸</span>
                  <span class="info-hub-option__text">Штрафы</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="settings-modal info-pending-list-modal is-hidden" data-info-pending-modal>
          <div class="settings-modal__backdrop" data-info-pending-backdrop></div>
          <div
            class="settings-modal__panel tools-modal__panel info-pending-list-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Список на принятии"
          >
            <div class="settings-modal__header tools-modal__header">
              <div class="settings-modal__title">
                <h2>Список на принятии</h2>
                <p data-info-pending-subtitle>Загружаем список...</p>
              </div>
              <button
                class="button-icon"
                type="button"
                data-info-pending-close
                aria-label="Закрыть список на принятии"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body tools-modal__body info-pending-list-modal__body">
              <div class="info-pending-controls">
                <label class="form-field">
                  <span>Сортировка</span>
                  <div class="tools-filter-dropdown info-pending-sort-dropdown" data-info-pending-sort-dropdown>
                    <button
                      type="button"
                      class="form-input tools-filter-dropdown__trigger"
                      data-info-pending-sort-trigger
                      aria-expanded="false"
                    >Сначала старые</button>
                    <div class="tools-filter-dropdown__menu is-hidden" data-info-pending-sort-menu>
                      <div class="tools-filter-dropdown__options" data-info-pending-sort-options></div>
                    </div>
                    <input type="hidden" data-info-pending-sort value="old" />
                  </div>
                </label>
                <div class="info-pending-filters">
                  <button
                    type="button"
                    class="button-icon info-pending-filters__toggle"
                    data-info-pending-filters-toggle
                    aria-label="Открыть фильтры"
                    aria-expanded="false"
                  >
                    <span class="button-icon-emoji" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false" fill="none">
                        <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                        <circle cx="15" cy="7" r="2.5" fill="currentColor" />
                        <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                        <circle cx="9" cy="17" r="2.5" fill="currentColor" />
                      </svg>
                    </span>
                  </button>
                  <div class="info-pending-filters__panel is-hidden" data-info-pending-filters-panel>
                    <label class="form-field">
                      <span>Принимающий</span>
                      <div
                        class="tools-filter-dropdown info-pending-responsible-dropdown"
                        data-info-pending-person-dropdown="receiver"
                      >
                        <button
                          type="button"
                          class="form-input tools-filter-dropdown__trigger"
                          data-info-pending-person-trigger
                        >Все принимающие</button>
                        <div class="tools-filter-dropdown__menu is-hidden" data-info-pending-person-menu>
                          <button type="button" class="tools-filter-dropdown__clear" data-info-pending-person-clear>
                            Все принимающие
                          </button>
                          <div class="tools-filter-dropdown__options" data-info-pending-person-options></div>
                        </div>
                        <input type="hidden" data-info-pending-filter-receiver />
                      </div>
                    </label>
                    <label class="form-field">
                      <span>Передающий</span>
                      <div
                        class="tools-filter-dropdown info-pending-responsible-dropdown"
                        data-info-pending-person-dropdown="sender"
                      >
                        <button
                          type="button"
                          class="form-input tools-filter-dropdown__trigger"
                          data-info-pending-person-trigger
                        >Все передающие</button>
                        <div class="tools-filter-dropdown__menu is-hidden" data-info-pending-person-menu>
                          <button type="button" class="tools-filter-dropdown__clear" data-info-pending-person-clear>
                            Все передающие
                          </button>
                          <div class="tools-filter-dropdown__options" data-info-pending-person-options></div>
                        </div>
                        <input type="hidden" data-info-pending-filter-sender />
                      </div>
                    </label>
                    <div class="form-field">
                      <span>Дата перемещения</span>
                      <button
                        type="button"
                        class="form-input info-pending-date-trigger"
                        data-info-pending-date-trigger
                        aria-label="Выбрать дату перемещения"
                      >Выберите дату</button>
                      <input type="hidden" data-info-pending-filter-date-from />
                      <input type="hidden" data-info-pending-filter-date-to />
                    </div>
                    <div class="download-moves-calendar info-pending-calendar" data-info-pending-calendar>
                      <div class="download-moves-calendar__header">
                        <button
                          type="button"
                          class="download-moves-calendar__nav"
                          data-info-pending-calendar-prev
                          aria-label="Предыдущий месяц"
                        >◀</button>
                        <div class="download-moves-calendar__month" data-info-pending-calendar-month-label></div>
                        <button
                          type="button"
                          class="download-moves-calendar__nav"
                          data-info-pending-calendar-next
                          aria-label="Следующий месяц"
                        >▶</button>
                      </div>
                      <div class="download-moves-calendar__weekdays" aria-hidden="true">
                        <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>
                      </div>
                      <div class="download-moves-calendar__days" data-info-pending-calendar-days></div>
                      <div class="download-moves-calendar__selected" data-info-pending-calendar-selected-range></div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="tools-list is-table" data-info-pending-list></div>
              <div class="tools-empty is-hidden" data-info-pending-empty>
                Нет перемещений без ответа.
              </div>
            </div>
          </div>
        </div>
        <div class="settings-modal info-moves-history-modal is-hidden" data-info-moves-history-modal>
          <div class="settings-modal__backdrop" data-info-moves-history-backdrop></div>
          <div
            class="settings-modal__panel info-moves-history-modal__panel info-moves-history-modal__panel--fullscreen"
            role="dialog"
            aria-modal="true"
            aria-label="История перемещений"
          >
            <div class="settings-modal__header info-moves-history-modal__header">
              <div class="settings-modal__title">
                <h2>История перемещений</h2>
              </div>
              <button
                class="button-icon"
                type="button"
                data-info-moves-history-close
                aria-label="Закрыть историю перемещений"
              >
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body info-moves-history-modal__body">
              <div class="info-moves-history-filters-controls">
                <button
                  type="button"
                  class="button-secondary info-moves-history-filters-toggle"
                  data-info-moves-history-filters-toggle
                  aria-expanded="false"
                >Фильтры</button>
                <button
                  type="button"
                  class="button-secondary info-moves-history-reset-all is-hidden"
                  data-info-moves-history-reset-all
                >Сбросить все</button>
              </div>
              <div class="info-moves-history-filters is-hidden" data-info-moves-history-filters-panel>
                <div class="info-moves-history-filters__row">
                  <label class="form-field">
                    <span class="info-moves-history-filter-label">Номер инструмента <button type="button" class="info-moves-history-filter-reset is-hidden" data-info-moves-history-reset="number">Сбросить</button></span>
                    <input
                      class="form-input"
                      type="text"
                      placeholder="Например, 157"
                      data-info-moves-history-filter-number
                      inputmode="numeric"
                    />
                  </label>
                  <label class="form-field">
                    <span class="info-moves-history-filter-label">Бух.номер <button type="button" class="info-moves-history-filter-reset is-hidden" data-info-moves-history-reset="accounting">Сбросить</button></span>
                    <input
                      class="form-input"
                      type="text"
                      placeholder="Введите бух.номер"
                      data-info-moves-history-filter-accounting
                    />
                  </label>
                </div>
                <div class="info-moves-history-filters__row">
                  <label class="form-field">
                    <span class="info-moves-history-filter-label">По передающему <button type="button" class="info-moves-history-filter-reset is-hidden" data-info-moves-history-reset="sender">Сбросить</button></span>
                    <div
                      class="tools-filter-dropdown info-moves-history-responsible-dropdown"
                      data-info-moves-history-person-dropdown="sender"
                    >
                      <button
                        type="button"
                        class="form-input tools-filter-dropdown__trigger"
                        data-info-moves-history-person-trigger
                      >Все передающие</button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-info-moves-history-person-menu>
                        <input
                          type="search"
                          class="form-input tools-filter-dropdown__search"
                          placeholder="Поиск ответственного"
                          data-info-moves-history-person-search
                        />
                        <button type="button" class="tools-filter-dropdown__clear" data-info-moves-history-person-clear>
                          Все передающие
                        </button>
                        <div class="tools-filter-dropdown__options" data-info-moves-history-person-options></div>
                      </div>
                      <input type="hidden" data-info-moves-history-filter-sender />
                    </div>
                  </label>
                  <label class="form-field">
                    <span class="info-moves-history-filter-label">По принимающему <button type="button" class="info-moves-history-filter-reset is-hidden" data-info-moves-history-reset="receiver">Сбросить</button></span>
                    <div
                      class="tools-filter-dropdown info-moves-history-responsible-dropdown"
                      data-info-moves-history-person-dropdown="receiver"
                    >
                      <button
                        type="button"
                        class="form-input tools-filter-dropdown__trigger"
                        data-info-moves-history-person-trigger
                      >Все принимающие</button>
                      <div class="tools-filter-dropdown__menu is-hidden" data-info-moves-history-person-menu>
                        <input
                          type="search"
                          class="form-input tools-filter-dropdown__search"
                          placeholder="Поиск ответственного"
                          data-info-moves-history-person-search
                        />
                        <button type="button" class="tools-filter-dropdown__clear" data-info-moves-history-person-clear>
                          Все принимающие
                        </button>
                        <div class="tools-filter-dropdown__options" data-info-moves-history-person-options></div>
                      </div>
                      <input type="hidden" data-info-moves-history-filter-receiver />
                    </div>
                  </label>
                </div>
                <div class="info-moves-history-filters__row info-moves-history-filters__row--dates">
                  <div class="form-field info-moves-history-date-field">
                    <span class="info-moves-history-filter-label">Дата перемещения <button type="button" class="info-moves-history-filter-reset is-hidden" data-info-moves-history-reset="moveDate">Сбросить</button></span>
                    <button
                      type="button"
                      class="form-input info-moves-history-date-trigger"
                      data-info-moves-history-move-date-trigger
                      aria-label="Выбрать дату перемещения"
                    >Выберите дату</button>
                    <input type="hidden" data-info-moves-history-filter-move-date-from />
                    <input type="hidden" data-info-moves-history-filter-move-date-to />
                    <div class="download-moves-calendar is-hidden" data-info-moves-history-move-calendar>
                      <div class="download-moves-calendar__header">
                        <button type="button" class="download-moves-calendar__nav" data-info-moves-history-move-calendar-prev aria-label="Предыдущий месяц">◀</button>
                        <div class="download-moves-calendar__month" data-info-moves-history-move-calendar-month-label></div>
                        <button type="button" class="download-moves-calendar__nav" data-info-moves-history-move-calendar-next aria-label="Следующий месяц">▶</button>
                      </div>
                      <div class="download-moves-calendar__weekdays" aria-hidden="true">
                        <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>
                      </div>
                      <div class="download-moves-calendar__days" data-info-moves-history-move-calendar-days></div>
                      <div class="download-moves-calendar__selected" data-info-moves-history-move-calendar-selected-range></div>
                    </div>
                  </div>
                  <div class="form-field info-moves-history-date-field">
                    <span class="info-moves-history-filter-label">Дата ответа <button type="button" class="info-moves-history-filter-reset is-hidden" data-info-moves-history-reset="responseDate">Сбросить</button></span>
                    <button
                      type="button"
                      class="form-input info-moves-history-date-trigger"
                      data-info-moves-history-response-date-trigger
                      aria-label="Выбрать дату ответа"
                    >Выберите дату</button>
                    <input type="hidden" data-info-moves-history-filter-response-date-from />
                    <input type="hidden" data-info-moves-history-filter-response-date-to />
                    <div class="download-moves-calendar is-hidden" data-info-moves-history-response-calendar>
                      <div class="download-moves-calendar__header">
                        <button type="button" class="download-moves-calendar__nav" data-info-moves-history-response-calendar-prev aria-label="Предыдущий месяц">◀</button>
                        <div class="download-moves-calendar__month" data-info-moves-history-response-calendar-month-label></div>
                        <button type="button" class="download-moves-calendar__nav" data-info-moves-history-response-calendar-next aria-label="Следующий месяц">▶</button>
                      </div>
                      <div class="download-moves-calendar__weekdays" aria-hidden="true">
                        <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>
                      </div>
                      <div class="download-moves-calendar__days" data-info-moves-history-response-calendar-days></div>
                      <div class="download-moves-calendar__selected" data-info-moves-history-response-calendar-selected-range></div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="info-moves-history-summary" data-info-moves-history-summary></div>
              <div class="info-moves-history-list" data-info-moves-history-list></div>
              <div class="tools-empty is-hidden" data-info-moves-history-empty>
                Перемещения не найдены.
              </div>
            </div>
          </div>
        </div>
        <div class="settings-modal info-by-dates-modal is-hidden" data-info-by-dates-modal>
          <div class="settings-modal__backdrop" data-info-by-dates-backdrop></div>
          <div
            class="settings-modal__panel info-by-dates-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Действия по датам"
          >
            <div class="settings-modal__header info-by-dates-modal__header">
              <div class="settings-modal__title">
                <h2>По датам</h2>
                <p data-info-by-dates-subtitle>Выберите дату или диапазон дат.</p>
              </div>
              <button class="button-icon" type="button" data-info-by-dates-close aria-label="Закрыть">
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body info-by-dates-modal__body">
              <div class="info-by-dates-calendar" data-info-by-dates-calendar>
                <div class="download-moves-calendar__header">
                  <button type="button" class="download-moves-calendar__nav" data-info-by-dates-calendar-prev aria-label="Предыдущий месяц">◀</button>
                  <div class="download-moves-calendar__month" data-info-by-dates-calendar-month-label></div>
                  <button type="button" class="download-moves-calendar__nav" data-info-by-dates-calendar-next aria-label="Следующий месяц">▶</button>
                </div>
                <div class="info-by-dates-calendar__actions">
                  <button
                    type="button"
                    class="info-by-dates-calendar__action-button info-by-dates-calendar__action-button--ghost"
                    data-info-by-dates-reset-dates
                  >
                    Сбросить даты
                  </button>
                  <button
                    type="button"
                    class="info-by-dates-calendar__action-button info-by-dates-calendar__action-button--accent"
                    data-info-by-dates-toggle-calendar
                  >
                    Свернуть календарь
                  </button>
                </div>
                <div class="download-moves-calendar__weekdays" aria-hidden="true">
                  <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>
                </div>
                <div class="download-moves-calendar__days" data-info-by-dates-calendar-days></div>
                <div class="download-moves-calendar__selected" data-info-by-dates-calendar-selected-range></div>
              </div>

              <div class="info-by-dates-tabs" data-info-by-dates-tabs>
                <button type="button" class="info-by-dates-tab is-active" data-info-by-dates-tab="registrations">Регистрация</button>
                <button type="button" class="info-by-dates-tab" data-info-by-dates-tab="moves">Перемещения</button>
                <button type="button" class="info-by-dates-tab" data-info-by-dates-tab="writeoff">Списания</button>
              </div>

              <div class="info-by-dates-summary" data-info-by-dates-summary></div>
              <div class="info-by-dates-list" data-info-by-dates-list></div>
              <div class="tools-empty is-hidden" data-info-by-dates-empty>За выбранные даты данных нет.</div>
            </div>
          </div>
        </div>
        <div class="settings-modal fines-modal is-hidden" data-fines-modal>
          <div class="settings-modal__backdrop" data-fines-backdrop></div>
          <div
            class="settings-modal__panel fines-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Выставление штрафов"
          >
            <div class="settings-modal__header fines-modal__header">
              <div class="settings-modal__title">
                <h2>Штрафы</h2>
              </div>
              <button class="button-icon fines-modal__close" type="button" data-fines-close aria-label="Закрыть штрафы">
                <span class="button-icon-emoji" aria-hidden="true">✕</span>
              </button>
            </div>
            <div class="settings-modal__body fines-modal__body">
              <div class="fines-tabs" role="tablist" aria-label="Разделы штрафов">
                <button class="fines-tab is-active" type="button" data-fines-tab="lateReply">Поздний ответ</button>
                <button class="fines-tab" type="button" data-fines-tab="movedByEnergy">Перемещения энергетиком</button>
                <button class="fines-tab" type="button" data-fines-tab="noPhoto">Нет фото</button>
              </div>
              <div class="fines-status" data-fines-status>Загружаем штрафы…</div>
              <div class="fines-list" data-fines-list></div>
              <div class="tools-empty fines-empty is-hidden" data-fines-empty>
                По этой вкладке нет ответственных с остатком штрафа.
              </div>
            </div>
            <div class="settings-modal__footer fines-modal__footer">
              <button class="button-secondary fines-reset-button" type="button" data-fines-reset>
                Сбросить
              </button>
              <button class="action-primary fines-submit-button" type="button" data-fines-submit>
                Выставить
              </button>
            </div>
          </div>
        </div>
        <div class="quick-access" data-quick-access>
          <div class="quick-access-list" data-quick-access-list></div>
        </div>
      </div>
    </section>
  `;
}
