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

const contentEl = document.querySelector("[data-content]");
const userNameEl = document.querySelector("[data-user-name]");
const userOrgEl = document.querySelector("[data-user-org]");
const orgFilePath = "./organizations.json";
const usersFilePath = "./users.json";
const saveEndpoint = "./save.php";

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

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить ${path}`);
  }
  return response.json();
}

async function saveJson(path, data) {
  const payload = JSON.stringify({ path, data });

  try {
    const response = await fetch(saveEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    if (response.ok) {
      return;
    }
  } catch (error) {
    console.warn("Save endpoint недоступен, пробуем сохранить напрямую.", error);
  }

  const fallbackResponse = await fetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data, null, 2),
  });
  if (!fallbackResponse.ok) {
    throw new Error(`Не удалось сохранить ${path}`);
  }
}

function getToday() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}.${month}.${year}`;
}

function setupSuperAdmin() {
  const dashboardEl = contentEl.querySelector("[data-super-admin-dashboard]");
  const addOrgSection = contentEl.querySelector("[data-add-org-section]");
  const openAddOrgButton = contentEl.querySelector("[data-open-add-org]");
  const backButton = contentEl.querySelector("[data-back-dashboard]");
  const formEl = contentEl.querySelector("[data-add-org-form]");
  const messageEl = contentEl.querySelector("[data-form-message]");
  const orgCountEl = contentEl.querySelector("[data-org-count]");
  const userCountEl = contentEl.querySelector("[data-user-count]");

  if (!dashboardEl || !addOrgSection || !formEl) return;

  const showDashboard = () => {
    dashboardEl.classList.remove("is-hidden");
    addOrgSection.classList.add("is-hidden");
  };

  const showForm = () => {
    dashboardEl.classList.add("is-hidden");
    addOrgSection.classList.remove("is-hidden");
  };

  const updateStats = async () => {
    try {
      const [orgData, usersData] = await Promise.all([
        loadJson(orgFilePath),
        loadJson(usersFilePath),
      ]);
      if (orgCountEl) orgCountEl.textContent = orgData.organizations?.length ?? 0;
      if (userCountEl) userCountEl.textContent = usersData.users?.length ?? 0;
    } catch (error) {
      console.error(error);
    }
  };

  openAddOrgButton?.addEventListener("click", showForm);
  backButton?.addEventListener("click", showDashboard);

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (messageEl) messageEl.textContent = "Сохраняем данные...";

    const formData = new FormData(formEl);
    const fullName = String(formData.get("org-full-name") ?? "").trim();
    const shortName = String(formData.get("org-short-name") ?? "").trim();
    const lastName = String(formData.get("energy-last-name") ?? "").trim();
    const firstName = String(formData.get("energy-first-name") ?? "").trim();
    const middleName = String(formData.get("energy-middle-name") ?? "").trim();

    if (!fullName || !shortName || !lastName || !firstName || !middleName) {
      if (messageEl) messageEl.textContent = "Заполните все поля.";
      return;
    }

    try {
      const [orgData, usersData] = await Promise.all([
        loadJson(orgFilePath),
        loadJson(usersFilePath),
      ]);

      const nextOrgData = {
        organizations: [
          ...(orgData.organizations ?? []),
          {
            full_name: fullName,
            short_name: shortName,
            launch_date: getToday(),
          },
        ],
      };

      const nextUsersData = {
        users: [
          ...(usersData.users ?? []),
          {
            telegram_id: 0,
            full_name: `${lastName} ${firstName} ${middleName}`,
            organization: fullName,
            role: "Энергетик",
          },
        ],
      };

      await Promise.all([
        saveJson(orgFilePath, nextOrgData),
        saveJson(usersFilePath, nextUsersData),
      ]);

      formEl.reset();
      if (messageEl) {
        messageEl.textContent =
          "Организация добавлена. Созданы папка и базы для работы.";
      }
      await updateStats();
      showDashboard();
    } catch (error) {
      console.error(error);
      if (messageEl) {
        messageEl.textContent = "Не удалось сохранить данные. Проверьте сервер.";
      }
    }
  });

  updateStats();
}

async function loadUser() {
  const telegramId = getTelegramId();
  if (!telegramId) {
    renderError("Telegram ID не получен. Откройте приложение из Telegram.");
    if (userNameEl) userNameEl.textContent = "Гость";
    if (userOrgEl) userOrgEl.textContent = "Откройте приложение из Telegram";
    return;
  }

  try {
    const data = await loadJson(usersFilePath);
    const user = data.users?.find((item) => item.telegram_id === telegramId);

    if (!user) {
      renderError("Пользователь с таким ID не найден в базе.");
      if (userNameEl) userNameEl.textContent = "Гость";
      if (userOrgEl) userOrgEl.textContent = "Нет доступа к организации";
      return;
    }

    const renderRole = roleMap.get(user.role);
    if (!renderRole) {
      renderError("Для вашей роли ещё не создана страница.");
      if (userNameEl) userNameEl.textContent = formatShortName(user.full_name);
      if (userOrgEl) userOrgEl.textContent = user.organization ?? "Организация";
      return;
    }

    const userName = formatShortName(user.full_name);
    const userLabel = `Вы вошли как <strong>${userName}</strong>`;

    contentEl.innerHTML = renderRole(userLabel);
    if (userNameEl) userNameEl.textContent = userName;
    if (userOrgEl) userOrgEl.textContent = user.organization ?? "Организация";
    if (user.role === superAdminRole) {
      setupSuperAdmin();
    }
  } catch (error) {
    renderError("Возникла ошибка при загрузке данных.");
    if (userNameEl) userNameEl.textContent = "Гость";
    if (userOrgEl) userOrgEl.textContent = "Проверьте соединение";
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
