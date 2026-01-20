export const roleId = "Энергетик";

export function renderRole(user) {
  return `
    <section class="role-card">
      <div class="dashboard">
        <div class="action-grid">
          <button class="action-card" type="button">
            <span class="action-icon">🧰</span>
            <div class="action-title">Мои инструменты</div>
          </button>
          <button class="action-card" type="button">
            <span class="action-icon">➕</span>
            <div class="action-title">Добавить инструмент</div>
          </button>
          <button class="action-card" type="button">
            <span class="action-icon">🗂️</span>
            <div class="action-title">База</div>
          </button>
          <button class="action-card" type="button">
            <span class="action-icon">🧾</span>
            <div class="action-title">Списать</div>
          </button>
          <button class="action-card" type="button">
            <span class="action-icon">🛠️</span>
            <div class="action-title">Ремонт</div>
          </button>
          <button class="action-card" type="button">
            <span class="action-icon">⚠️</span>
            <div class="action-title">Поломки</div>
          </button>
          <button class="action-card" type="button">
            <span class="action-icon">✅</span>
            <div class="action-title">Переместить за других</div>
          </button>
          <button class="action-card" type="button">
            <span class="action-icon">ℹ️</span>
            <div class="action-title">Информация</div>
          </button>
          <button class="action-card" type="button">
            <span class="action-icon">📥</span>
            <div class="action-title">Загрузить данные</div>
          </button>
          <button class="action-card" type="button">
            <span class="action-icon">📤</span>
            <div class="action-title">Выгрузить данные</div>
          </button>
          <button class="action-card" type="button">
            <span class="action-icon">📷</span>
            <div class="action-title">Добавить фото</div>
          </button>
          <button class="action-card" type="button">
            <span class="action-icon">🗑️</span>
            <div class="action-title">Удалить фото</div>
          </button>
          <button class="action-card" type="button">
            <span class="action-icon">🚫</span>
            <div class="action-title">Без фото</div>
          </button>
          <button class="action-card" type="button">
            <span class="action-icon">💸</span>
            <div class="action-title">Штрафы</div>
          </button>
          <button class="action-card" type="button">
            <span class="action-icon">👥</span>
            <div class="action-title">Пользователи</div>
          </button>
        </div>
      </div>
    </section>
  `;
}
