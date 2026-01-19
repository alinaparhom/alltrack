import { roleId as superAdminRole, renderRole as renderSuperAdmin } from "./roles/super-admin.js";
import { roleId as responsibleRole, renderRole as renderResponsible } from "./roles/responsible.js";
import { roleId as chiefEngineerRole, renderRole as renderChiefEngineer } from "./roles/chief-engineer.js";
import { roleId as leaderRole, renderRole as renderLeader } from "./roles/leader.js";
import { roleId as accountingRole, renderRole as renderAccounting } from "./roles/accounting.js";
import { roleId as energyRole, renderRole as renderEnergy } from "./roles/energy.js";

const roleMap = new Map([
  [superAdminRole, renderSuperAdmin],
  [responsibleRole, renderResponsible],
  [chiefEngineerRole, renderChiefEngineer],
  [leaderRole, renderLeader],
  [accountingRole, renderAccounting],
  [energyRole, renderEnergy],
]);

const statusEl = document.querySelector("[data-status]");
const contentEl = document.querySelector("[data-content]");

function getTelegramId() {
  const webApp = window.Telegram?.WebApp;
  return webApp?.initDataUnsafe?.user?.id ?? null;
}

function formatShortName(fullName = "") {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "Пользователь";
  }
  return parts.slice(0, 2).join(" ");
}

function renderError(message) {
  contentEl.innerHTML = `
    <section class="role-card">
      <div class="role-header">
        <span class="role-pill">Нет доступа</span>
        <h1>Мы не нашли вашу роль</h1>
      </div>
      <p class="role-description">
        ${message}
      </p>
      <div class="role-user">Проверьте доступ у администратора.</div>
    </section>
  `;
}

async function loadUser() {
  statusEl.textContent = "Определяем пользователя...";

  const telegramId = getTelegramId();
  if (!telegramId) {
    renderError("Telegram ID не получен. Откройте приложение из Telegram.");
    statusEl.textContent = "ID не получен";
    return;
  }

  try {
    const response = await fetch("./users.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Не удалось загрузить список пользователей");
    }

    const data = await response.json();
    const user = data.users?.find((item) => item.telegram_id === telegramId);

    if (!user) {
      renderError("Пользователь с таким ID не найден в базе.");
      statusEl.textContent = "Пользователь не найден";
      return;
    }

    const renderRole = roleMap.get(user.role);
    if (!renderRole) {
      renderError("Для вашей роли ещё не создана страница.");
      statusEl.textContent = "Роль не настроена";
      return;
    }

    const userName = formatShortName(user.full_name);
    const userLabel = `Вы вошли как <strong>${userName}</strong>`;

    contentEl.innerHTML = renderRole(userLabel);
    statusEl.textContent = `Роль: ${user.role}`;
  } catch (error) {
    renderError("Возникла ошибка при загрузке данных.");
    statusEl.textContent = "Ошибка загрузки";
    console.error(error);
  }
}

if (window.Telegram?.WebApp) {
  Telegram.WebApp.ready();
  Telegram.WebApp.expand();
  Telegram.WebApp.setHeaderColor("#f5f7ff");
  Telegram.WebApp.setBackgroundColor("#f5f7ff");
}

loadUser();
