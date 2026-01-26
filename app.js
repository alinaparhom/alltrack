import { roleId as superAdminRole, renderRole as renderSuperAdmin } from "./roles/super-admin.js";
import { roleId as responsibleRole, renderRole as renderResponsible } from "./roles/responsible.js";
import { roleId as chiefEngineerRole, renderRole as renderChiefEngineer } from "./roles/chief-engineer.js";
import { roleId as leaderRole, renderRole as renderLeader } from "./roles/leader.js";
import { roleId as accountingRole, renderRole as renderAccounting } from "./roles/accounting.js";
import {
  roleId as energyRole,
  renderRole as renderEnergy,
  energyActions,
} from "./roles/energy.js";

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
const userInitialsEl = document.querySelector("[data-user-initials]");
const appUserEl = document.querySelector("[data-app-user]");
const userSettingsTriggerEl = document.querySelector("[data-user-settings-trigger]");
const superAdminStatEl = document.querySelector("[data-super-admin-stat]");
const energyPendingStatEl = document.querySelector("[data-energy-pending-stat]");
const energyPendingIconEl = document.querySelector("[data-energy-pending-icon]");
const energyPendingCountEl = document.querySelector("[data-energy-pending-count]");
const settingsBackButtonEl = document.querySelector(
  "[data-settings-back-header]"
);
const orgFilePath = "./organizations.json";
const usersFilePath = "./users.json";
const pendingRegistrationsFilePath = "./pending-registrations.json";
const saveEndpoint = "./save.php";
const authLogFilePath = "./auth-log.json";
const authLogLimit = 200;
const fallbackBotToken = "8549452123:AAGxveuJSVf-xpNHQYTDKDmuMmHjGRVeDj0";
const botUsernameCacheKey = "alltrack-bot-username";
const initDataCacheKey = "alltrack-init-data";
const initDataLocalCacheKey = "alltrack-init-data-local";
const cacheBuster =
  window.ALLTRACK_CACHE_BUSTER || new Date().toISOString().replace(/\D/g, "");
const defaultPreferences = {
  iconStyle: "icon-title",
  grouping: "free",
  theme: "telegram",
};
const energySettingsRoles = [
  responsibleRole,
  chiefEngineerRole,
  leaderRole,
  accountingRole,
];
const energyFineOptions = [
  { id: "lateReply", title: "Поздний ответ", defaultDays: 3, defaultAmount: 0 },
  { id: "noPhoto", title: "Нет фото", defaultDays: 1, defaultAmount: 0 },
  {
    id: "movedByEnergy",
    title: "Перемещение энергетиком",
    defaultDays: 0,
    defaultAmount: 0,
  },
];
const energyMailingOptions = [
  {
    id: "awaitingReply",
    title: "Ожидают ответа",
    defaultDays: ["Пн"],
    defaultTime: "09:00",
  },
  {
    id: "repairs",
    title: "Ремонты",
    defaultDays: ["Вт"],
    defaultTime: "10:00",
  },
  {
    id: "noPhoto",
    title: "Без фото",
    defaultDays: ["Ср"],
    defaultTime: "11:00",
  },
  {
    id: "noAccountingNumber",
    title: "Без бух.номера",
    defaultDays: ["Чт"],
    defaultTime: "12:00",
  },
];
const energyWeekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
let currentUser = null;
let currentUserLabel = "";
let currentPreferences = { ...defaultPreferences };
let currentSettingsContext = null;
let pendingGroupingStart = false;
const energyDashboardRoles = new Set([
  energyRole,
  responsibleRole,
  chiefEngineerRole,
  leaderRole,
  accountingRole,
]);
const energyResponsibleAccessRoles = new Set([
  chiefEngineerRole,
  leaderRole,
  accountingRole,
]);

function withCacheBuster(path) {
  if (!cacheBuster) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${cacheBuster}`;
}

function normalizeTelegramId(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const numericValue = Math.trunc(value);
    if (!numericValue) return null;
    return String(numericValue);
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d-]/g, "");
  if (!cleaned || cleaned === "0") return null;
  return cleaned;
}

function parseInitDataUser(initData) {
  if (!initData) return null;

  const parseFromString = (value) => {
    const params = new URLSearchParams(value);
    const userRaw = params.get("user");
    if (!userRaw) return null;
    return JSON.parse(userRaw);
  };

  try {
    const directUser = parseFromString(initData);
    if (directUser) return directUser;

    const decoded = decodeURIComponent(initData);
    if (decoded && decoded !== initData) {
      return parseFromString(decoded);
    }
  } catch (error) {
    console.warn("Не удалось разобрать initData пользователя.", error);
    return null;
  }

  return null;
}

function collectTelegramContext() {
  const webApp = window.Telegram?.WebApp ?? null;
  const initData = webApp?.initData ?? null;
  const unsafeUser = webApp?.initDataUnsafe?.user ?? null;
  const urlInitData = getInitDataFromUrl();
  const initDataUser = parseInitDataUser(initData);
  const urlInitDataUser = parseInitDataUser(urlInitData);

  const idFromUnsafe = normalizeTelegramId(unsafeUser?.id ?? null);
  const idFromInitData = normalizeTelegramId(initDataUser?.id ?? null);
  const idFromUrl = normalizeTelegramId(urlInitDataUser?.id ?? null);

  return {
    webAppAvailable: Boolean(webApp),
    platform: webApp?.platform ?? null,
    version: webApp?.version ?? null,
    initDataLength: initData?.length ?? 0,
    urlInitDataLength: urlInitData?.length ?? 0,
    unsafeUserId: unsafeUser?.id ?? null,
    parsedInitDataUserId: initDataUser?.id ?? null,
    parsedUrlInitDataUserId: urlInitDataUser?.id ?? null,
    resolvedId: idFromUnsafe ?? idFromInitData ?? idFromUrl ?? null,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };
}

function cacheInitData(value) {
  if (!value) return;
  try {
    sessionStorage.setItem(initDataCacheKey, value);
  } catch (error) {
    console.warn("Не удалось сохранить initData в sessionStorage.", error);
  }
  try {
    localStorage.setItem(initDataLocalCacheKey, value);
  } catch (error) {
    console.warn("Не удалось сохранить initData в localStorage.", error);
  }
}

function getCachedInitData() {
  try {
    const cachedSession = sessionStorage.getItem(initDataCacheKey);
    if (cachedSession) return cachedSession;
  } catch (error) {
    console.warn("Не удалось прочитать initData из sessionStorage.", error);
  }
  try {
    return localStorage.getItem(initDataLocalCacheKey);
  } catch (error) {
    console.warn("Не удалось прочитать initData из localStorage.", error);
    return null;
  }
}

function getInitDataFromUrl() {
  const url = new URL(window.location.href);
  const queryData = url.searchParams.get("tgWebAppData");
  if (queryData) {
    cacheInitData(queryData);
    return queryData;
  }
  if (!url.hash) return null;
  const rawHash = url.hash.replace(/^#/, "");
  const hashParams = new URLSearchParams(rawHash);
  const hashData = hashParams.get("tgWebAppData");
  if (hashData) {
    cacheInitData(hashData);
    return hashData;
  }
  try {
    const decodedHash = decodeURIComponent(rawHash);
    if (decodedHash !== rawHash) {
      const decodedParams = new URLSearchParams(decodedHash);
      const decodedData = decodedParams.get("tgWebAppData");
      if (decodedData) {
        cacheInitData(decodedData);
        return decodedData;
      }
    }
  } catch (error) {
    console.warn("Не удалось декодировать параметры Telegram из hash.", error);
  }
  const cached = getCachedInitData();
  return cached || null;
}

function getTelegramId() {
  const webApp = window.Telegram?.WebApp;
  const initData = webApp?.initData ?? null;
  if (initData) {
    cacheInitData(initData);
  }
  return collectTelegramContext().resolvedId;
}

async function waitForTelegramId({ timeoutMs = 12000, intervalMs = 200 } = {}) {
  const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
  let telegramId = getTelegramId();
  while (!telegramId) {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - startTime >= timeoutMs) {
      return null;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    telegramId = getTelegramId();
  }
  return telegramId;
}

async function appendAuthLog(step, detail = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    step,
    detail,
  };

  try {
    const current = await loadJson(authLogFilePath).catch(() => ({ entries: [] }));
    const entries = Array.isArray(current.entries) ? current.entries : [];
    const nextEntries = [...entries, entry].slice(-authLogLimit);
    await saveEntries([{ path: authLogFilePath, data: { entries: nextEntries } }]);
  } catch (error) {
    console.warn("Не удалось сохранить лог авторизации.", error);
  }
}

function getTelegramBotUsername() {
  const webApp = window.Telegram?.WebApp;
  return (
    webApp?.initDataUnsafe?.receiver?.username ??
    webApp?.initDataUnsafe?.chat?.username ??
    null
  );
}

async function resolveBotUsername() {
  const telegramUsername = getTelegramBotUsername();
  if (telegramUsername) return telegramUsername;

  const cached = localStorage.getItem(botUsernameCacheKey);
  if (cached) return cached;

  if (!fallbackBotToken) return null;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${fallbackBotToken}/getMe`
    );
    if (!response.ok) return null;
    const data = await response.json();
    const username = data?.result?.username ?? null;
    if (username) {
      localStorage.setItem(botUsernameCacheKey, username);
    }
    return username;
  } catch (error) {
    console.warn("Не удалось получить имя бота.", error);
    return null;
  }
}

function getRegistrationToken() {
  const url = new URL(window.location.href);
  const urlToken =
    url.searchParams.get("registration") || url.searchParams.get("reg");
  const startToken = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  return urlToken || startToken || null;
}

function formatShortName(fullName = "") {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "Пользователь";
  }
  return parts.slice(0, 2).join(" ");
}

function formatFullName(fullName = "", maxParts = 3) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "Пользователь";
  }
  return parts.slice(0, maxParts).join(" ");
}

function getInitials(fullName = "") {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function normalizePreferences(preferences = {}) {
  const iconStyleOptions = new Set(["icon-only", "icon-title", "icon-title-below"]);
  const groupingOptions = new Set(["none", "free", "all-group"]);
  const themeOptions = new Set(["light", "dark", "telegram"]);
  return {
    iconStyle: iconStyleOptions.has(preferences.iconStyle)
      ? preferences.iconStyle
      : defaultPreferences.iconStyle,
    grouping: groupingOptions.has(preferences.grouping)
      ? preferences.grouping
      : defaultPreferences.grouping,
    theme: themeOptions.has(preferences.theme) ? preferences.theme : defaultPreferences.theme,
  };
}

function resolveThemePreference(themePreference) {
  if (themePreference === "light" || themePreference === "dark") {
    return themePreference;
  }
  const telegramScheme = window.Telegram?.WebApp?.colorScheme;
  if (telegramScheme === "dark") return "dark";
  if (telegramScheme === "light") return "light";
  if (window.matchMedia?.("(prefers-color-scheme: dark)")?.matches) {
    return "dark";
  }
  return "light";
}

function setThemeColorMeta(color) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", color);
  }
}

function applyUserPreferences(preferences) {
  const normalized = normalizePreferences(preferences);
  document.body?.setAttribute("data-icon-style", normalized.iconStyle);
  const resolvedTheme = resolveThemePreference(normalized.theme);
  document.body?.setAttribute("data-theme", resolvedTheme);
  document.body?.setAttribute("data-theme-preference", normalized.theme);
  if (resolvedTheme === "dark") {
    setThemeColorMeta("#0f1422");
    if (window.Telegram?.WebApp) {
      Telegram.WebApp.setHeaderColor("#0f1422");
      Telegram.WebApp.setBackgroundColor("#0f1422");
    }
  } else {
    setThemeColorMeta("#f5f7ff");
    if (window.Telegram?.WebApp) {
      Telegram.WebApp.setHeaderColor("#f5f7ff");
      Telegram.WebApp.setBackgroundColor("#f5f7ff");
    }
  }
  return normalized;
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

function renderUserSettingsView(user, preferences) {
  const normalized = normalizePreferences(preferences);
  return `
    <section class="role-card">
      <div class="settings-header">
        <div class="settings-title">
          <span class="role-pill">Настройки</span>
        </div>
      </div>
      <form class="form-grid" data-settings-form>
        <div class="settings-section">
          <div class="settings-section-title">Вид значков на странице</div>
          <div class="toggle-group toggle-group--visual">
            <label>
              <input
                class="toggle-input"
                type="radio"
                name="icon-style"
                value="icon-only"
                ${normalized.iconStyle === "icon-only" ? "checked" : ""}
              />
              <span class="toggle-option toggle-option--visual">
                <span class="toggle-visual toggle-visual--icon-only">
                  <span class="toggle-visual-tile">
                    <span class="toggle-visual-icon"></span>
                  </span>
                  <span class="toggle-visual-tile">
                    <span class="toggle-visual-icon"></span>
                  </span>
                  <span class="toggle-visual-tile">
                    <span class="toggle-visual-icon"></span>
                  </span>
                </span>
                <span class="toggle-label">Только значок</span>
              </span>
            </label>
            <label>
              <input
                class="toggle-input"
                type="radio"
                name="icon-style"
                value="icon-title"
                ${normalized.iconStyle === "icon-title" ? "checked" : ""}
              />
              <span class="toggle-option toggle-option--visual">
                <span class="toggle-visual toggle-visual--icon-title">
                  <span class="toggle-visual-tile">
                    <span class="toggle-visual-icon"></span>
                    <span class="toggle-visual-line"></span>
                  </span>
                  <span class="toggle-visual-tile">
                    <span class="toggle-visual-icon"></span>
                    <span class="toggle-visual-line"></span>
                  </span>
                </span>
                <span class="toggle-label">Значок и название</span>
              </span>
            </label>
            <label>
              <input
                class="toggle-input"
                type="radio"
                name="icon-style"
                value="icon-title-below"
                ${normalized.iconStyle === "icon-title-below" ? "checked" : ""}
              />
              <span class="toggle-option toggle-option--visual">
                <span class="toggle-visual toggle-visual--icon-title-below">
                  <span class="toggle-visual-tile">
                    <span class="toggle-visual-icon"></span>
                    <span class="toggle-visual-line"></span>
                  </span>
                  <span class="toggle-visual-tile">
                    <span class="toggle-visual-icon"></span>
                    <span class="toggle-visual-line"></span>
                  </span>
                </span>
                <span class="toggle-label">Название под значком</span>
              </span>
            </label>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">Группировка функций</div>
          <input type="hidden" name="grouping" value="free" />
          <button
            class="settings-group-button"
            type="button"
            data-settings-grouping
          >
            <span class="settings-group-icon" aria-hidden="true">🧩</span>
            <span>Группировка</span>
          </button>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">Тема</div>
          <div class="toggle-group">
            <label>
              <input
                class="toggle-input"
                type="radio"
                name="theme"
                value="light"
                ${normalized.theme === "light" ? "checked" : ""}
              />
              <span class="toggle-option">Светлая</span>
            </label>
            <label>
              <input
                class="toggle-input"
                type="radio"
                name="theme"
                value="dark"
                ${normalized.theme === "dark" ? "checked" : ""}
              />
              <span class="toggle-option">Тёмная</span>
            </label>
            <label>
              <input
                class="toggle-input"
                type="radio"
                name="theme"
                value="telegram"
                ${normalized.theme === "telegram" ? "checked" : ""}
              />
              <span class="toggle-option">Как в Telegram</span>
            </label>
          </div>
        </div>
        <div class="form-message" data-settings-message></div>
      </form>
    </section>
  `;
}

async function loadJson(path) {
  const response = await fetch(withCacheBuster(path), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить ${path}`);
  }
  return response.json();
}

async function saveJsonFallback(path, data) {
  const fallbackResponse = await fetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data, null, 2),
  });
  if (!fallbackResponse.ok) {
    throw new Error(`Не удалось сохранить ${path}`);
  }
}

async function saveEntries(entries) {
  const payload = JSON.stringify({ entries });

  try {
    const response = await fetch(saveEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    if (response.ok) {
      return;
    }
    const errorText = await response.text();
    console.warn("Save endpoint вернул ошибку.", errorText);
  } catch (error) {
    console.warn("Save endpoint недоступен, пробуем сохранить напрямую.", error);
  }

  for (const { path, data } of entries) {
    await saveJsonFallback(path, data);
  }
}

async function saveJson(path, data, meta = {}) {
  return saveEntries([{ path, data, ...meta }]);
}

function isDefaultEnergyLayout(layout, actions) {
  if (!Array.isArray(layout) || layout.length === 0) return true;
  const hasGroup = layout.some((item) => item?.type === "group");
  if (hasGroup) return false;
  const defaultOrder = actions.map((action) => action.id);
  const actionOrder = layout
    .filter((item) => item?.type === "action")
    .map((item) => item.id);
  if (actionOrder.length === 0) return true;
  return actionOrder.every((actionId, index) => actionId === defaultOrder[index]);
}

function normalizeEnergyLayout(layout, actions, options = {}) {
  const { forceToggleLast = false } = options;
  const actionIds = new Set(actions.map((action) => action.id));
  const normalized = [];
  const usedIds = new Set();
  let hasToggle = false;

  if (Array.isArray(layout)) {
    layout.forEach((item) => {
      if (!item || typeof item !== "object") return;
      if (item.type === "action") {
        const actionId = item.id;
        if (actionIds.has(actionId) && !usedIds.has(actionId)) {
          normalized.push({ type: "action", id: actionId });
          usedIds.add(actionId);
        }
        return;
      }
      if (item.type === "toggle") {
        if (!hasToggle) {
          normalized.push({ type: "toggle" });
          hasToggle = true;
        }
        return;
      }
      if (item.type === "group") {
        const groupItems = Array.isArray(item.items) ? item.items : [];
        const filteredItems = groupItems.filter(
          (actionId) => actionIds.has(actionId) && !usedIds.has(actionId)
        );
        filteredItems.forEach((actionId) => usedIds.add(actionId));
        if (filteredItems.length > 0) {
          normalized.push({
            type: "group",
            id: item.id ?? `group-${Date.now()}`,
            name: item.name ?? "Группа",
            items: filteredItems,
          });
        }
      }
    });
  }

  actions.forEach((action) => {
    if (!usedIds.has(action.id)) {
      normalized.push({ type: "action", id: action.id });
    }
  });

  if (!hasToggle) {
    normalized.push({ type: "toggle" });
  }

  if (forceToggleLast) {
    const toggleIndex = normalized.findIndex((item) => item.type === "toggle");
    if (toggleIndex !== -1 && toggleIndex !== normalized.length - 1) {
      const [toggleItem] = normalized.splice(toggleIndex, 1);
      normalized.push(toggleItem);
    }
  }

  return normalized;
}

function updateEnergyPendingStat(count = 0) {
  if (!energyPendingStatEl) return;
  const pendingCount = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0;
  const isWaiting = pendingCount > 0;
  const isReady = !isWaiting;

  energyPendingStatEl.classList.toggle("is-waiting", isWaiting);
  energyPendingStatEl.classList.toggle("is-ready", isReady);
  energyPendingStatEl.setAttribute(
    "aria-label",
    isWaiting
      ? `На принятии ${pendingCount} инструментов`
      : "По всем запросам ответ дан"
  );
  energyPendingStatEl.setAttribute(
    "title",
    isWaiting
      ? `На принятии ${pendingCount} инструментов`
      : "По всем запросам ответ дан"
  );

  if (energyPendingIconEl) {
    energyPendingIconEl.textContent = isWaiting ? "⏳" : "✅";
  }
  if (energyPendingCountEl) {
    energyPendingCountEl.textContent = String(pendingCount);
    energyPendingCountEl.classList.toggle("is-hidden", !isWaiting);
  }
}

function applyGroupingPreference(layout, actions, preference) {
  if (preference === "none") {
    return actions.map((action) => ({ type: "action", id: action.id }));
  }
  if (preference === "all-group") {
    return [
      {
        type: "group",
        id: "group-all",
        name: "Все блоки",
        items: actions.map((action) => action.id),
      },
    ];
  }
  return layout;
}

function createEnergyActionCard(action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "action-card";
  button.dataset.energyItem = "";
  button.dataset.energyItemType = "action";
  button.dataset.actionId = action.id;
  button.innerHTML = `
    <span class="action-icon">${action.icon}</span>
    <div class="action-title action-title--fit">${action.title}</div>
  `;
  return button;
}

function createEnergyGroupCard(group, actionsMap) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "action-card action-group";
  button.dataset.energyItem = "";
  button.dataset.energyItemType = "group";
  button.dataset.groupId = group.id;
  button.dataset.groupName = group.name;
  button.dataset.groupItems = JSON.stringify(group.items);

  const iconsMarkup = group.items
    .map((actionId) => actionsMap.get(actionId))
    .filter(Boolean)
    .slice(0, 4)
    .map((action) => `<span class="group-icon">${action.icon}</span>`)
    .join("");
  const extraCount = group.items.length - 4;
  const extraMarkup =
    extraCount > 0
      ? `<span class="group-icon group-icon-more">+${extraCount}</span>`
      : "";

  button.innerHTML = `
    <div class="group-icon-stack">
      ${iconsMarkup}${extraMarkup}
    </div>
    <div class="action-title action-title--fit">
      <div class="group-title">${group.name}</div>
    </div>
  `;
  return button;
}

function createEnergyGroupToggleCard() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "action-card energy-group-toggle-card";
  button.dataset.energyItem = "";
  button.dataset.energyItemType = "toggle";
  button.dataset.energyFeedback = "";
  button.setAttribute("aria-label", "Обратная связь");
  button.innerHTML = `
    <span class="action-icon">💬</span>
    <div class="action-title action-title--fit">Обратная связь</div>
  `;
  return button;
}

const ACTION_TITLE_MIN_FONT_SIZE = 9;
const ACTION_TITLE_FIT_STEP = 0.5;

function fitActionTitleElement(titleEl) {
  if (!titleEl) return;
  titleEl.style.removeProperty("font-size");
  const computed = window.getComputedStyle(titleEl);
  const baseSize = Number.parseFloat(computed.fontSize) || 14;

  const isOverflowing = () =>
    titleEl.scrollWidth > titleEl.clientWidth + 1 ||
    titleEl.scrollHeight > titleEl.clientHeight + 1;

  if (!isOverflowing()) {
    return;
  }

  let fontSize = baseSize;
  const maxSteps = Math.ceil((baseSize - ACTION_TITLE_MIN_FONT_SIZE) / ACTION_TITLE_FIT_STEP);
  for (let step = 0; step <= maxSteps; step += 1) {
    fontSize = Math.max(
      ACTION_TITLE_MIN_FONT_SIZE,
      baseSize - ACTION_TITLE_FIT_STEP * (step + 1)
    );
    titleEl.style.fontSize = `${fontSize}px`;
    if (!isOverflowing()) {
      break;
    }
  }
}

function fitActionTitleTexts(container = document) {
  const titles = container.querySelectorAll(".action-title--fit");
  titles.forEach((title) => fitActionTitleElement(title));
}

function buildEnergyLayoutFromDom(gridEl) {
  const layout = [];
  const items = Array.from(gridEl.querySelectorAll("[data-energy-item]"));
  items.forEach((item) => {
    const type = item.dataset.energyItemType;
    if (type === "action") {
      const actionId = item.dataset.actionId;
      if (actionId) layout.push({ type: "action", id: actionId });
    } else if (type === "group") {
      let groupItems = [];
      if (item.dataset.groupItems) {
        try {
          groupItems = JSON.parse(item.dataset.groupItems);
        } catch (error) {
          groupItems = [];
        }
      }
      layout.push({
        type: "group",
        id: item.dataset.groupId ?? `group-${Date.now()}`,
        name: item.dataset.groupName ?? "Группа",
        items: Array.isArray(groupItems) ? groupItems : [],
      });
    } else if (type === "toggle") {
      layout.push({ type: "toggle" });
    }
  });
  return layout;
}

const normalizeOrganizationName = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[«»"'`]/g, "")
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeOrganizationFolder = (value = "") =>
  sanitizeOrganizationFolderName(value).toLowerCase();

function pickOrganizationShortName(orgData, orgName) {
  if (!orgName) return "Организация";
  const targetName = normalizeOrganizationName(orgName);
  const targetFolder = normalizeOrganizationFolder(orgName);
  const organizations = orgData?.organizations ?? [];

  const exactMatch =
    organizations.find((org) => {
      const fullName = normalizeOrganizationName(org.full_name);
      const fullFolder = normalizeOrganizationFolder(org.full_name);
      return fullName === targetName || fullFolder === targetFolder;
    }) ??
    organizations.find((org) => {
      const shortName = normalizeOrganizationName(org.short_name);
      const shortFolder = normalizeOrganizationFolder(org.short_name);
      return shortName === targetName || shortFolder === targetFolder;
    });

  if (exactMatch?.short_name) {
    return exactMatch.short_name;
  }

  const fuzzyMatch = organizations.find((org) => {
    const fullName = normalizeOrganizationName(org.full_name);
    const shortName = normalizeOrganizationName(org.short_name);
    const fullFolder = normalizeOrganizationFolder(org.full_name);
    const shortFolder = normalizeOrganizationFolder(org.short_name);
    return (
      (shortName && targetName.includes(shortName)) ||
      (fullName && targetName.includes(fullName)) ||
      (shortName && shortName.includes(targetName)) ||
      (fullName && fullName.includes(targetName)) ||
      (shortFolder && targetFolder.includes(shortFolder)) ||
      (fullFolder && fullFolder.includes(targetFolder))
    );
  });

  return fuzzyMatch?.short_name ?? orgName;
}

function pickOrganizationFullName(orgData, orgName) {
  if (!orgName) return "Организация";
  const targetName = normalizeOrganizationName(orgName);
  const targetFolder = normalizeOrganizationFolder(orgName);
  const organizations = orgData?.organizations ?? [];

  const exactMatch =
    organizations.find((org) => {
      const fullName = normalizeOrganizationName(org.full_name);
      const fullFolder = normalizeOrganizationFolder(org.full_name);
      return fullName === targetName || fullFolder === targetFolder;
    }) ??
    organizations.find((org) => {
      const shortName = normalizeOrganizationName(org.short_name);
      const shortFolder = normalizeOrganizationFolder(org.short_name);
      return shortName === targetName || shortFolder === targetFolder;
    });

  if (exactMatch?.full_name) {
    return exactMatch.full_name;
  }

  const fuzzyMatch = organizations.find((org) => {
    const fullName = normalizeOrganizationName(org.full_name);
    const shortName = normalizeOrganizationName(org.short_name);
    const fullFolder = normalizeOrganizationFolder(org.full_name);
    const shortFolder = normalizeOrganizationFolder(org.short_name);
    return (
      (shortName && targetName.includes(shortName)) ||
      (fullName && targetName.includes(fullName)) ||
      (shortName && shortName.includes(targetName)) ||
      (fullName && fullName.includes(targetName)) ||
      (shortFolder && targetFolder.includes(shortFolder)) ||
      (fullFolder && targetFolder.includes(fullFolder))
    );
  });

  return fuzzyMatch?.full_name ?? orgName;
}

async function resolveOrganizationShortName(orgName) {
  if (!orgName) return "Организация";
  const orgData = await loadJson(orgFilePath).catch(() => ({ organizations: [] }));
  return pickOrganizationShortName(orgData, orgName);
  /*
  const normalizeName = (value = "") =>
    String(value)
      .trim()
      .toLowerCase()
      .replace(/[«»"'`]/g, "")
      .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  const normalizeFolder = (value = "") =>
    sanitizeOrganizationFolderName(value).toLowerCase();
  const targetName = normalizeName(orgName);
  const targetFolder = normalizeFolder(orgName);
  const match = orgData.organizations?.find((org) => {
    const fullName = normalizeName(org.full_name);
    const shortName = normalizeName(org.short_name);
    const fullFolder = normalizeFolder(org.full_name);
    const shortFolder = normalizeFolder(org.short_name);
    if (
      fullName === targetName ||
      shortName === targetName ||
      fullFolder === targetFolder ||
      shortFolder === targetFolder
    ) {
      return true;
    }
    return (
      (shortName && targetName.includes(shortName)) ||
      (fullName && targetName.includes(fullName)) ||
      (shortName && shortName.includes(targetName)) ||
      (fullName && fullName.includes(targetName)) ||
      (shortFolder && targetFolder.includes(shortFolder)) ||
      (fullFolder && targetFolder.includes(fullFolder))
    );
  });
  */
}

function sanitizeOrganizationFolderName(name = "") {
  const trimmed = String(name).trim();
  const cleaned = trimmed.replace(/[\/\\:*?"<>|]+/g, "_");
  return cleaned.replace(/\s+/g, " ").trim();
}

function buildUserKey(user) {
  return user.telegram_id && Number(user.telegram_id) > 0
    ? `tg-${user.telegram_id}`
    : [user.full_name ?? "user", user.organization ?? "", user.role ?? ""].join("|");
}

function ensureSettingsData(raw) {
  const base = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  if (!base.users || typeof base.users !== "object" || Array.isArray(base.users)) {
    base.users = {};
  }
  if (
    !base.organization ||
    typeof base.organization !== "object" ||
    Array.isArray(base.organization)
  ) {
    base.organization = {};
  }
  return base;
}

function sanitizeObjectName(value = "") {
  return String(value).trim().replace(/\s+/g, " ");
}

function buildObjectId() {
  return `obj-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeObjectsData(raw) {
  const rawItems = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object"
      ? raw.objects
      : [];
  if (!Array.isArray(rawItems)) return [];
  const ids = new Set();
  return rawItems
    .map((item) => {
      if (typeof item === "string") {
        const name = sanitizeObjectName(item);
        if (!name) return null;
        const id = buildObjectId();
        ids.add(id);
        return { id, name };
      }
      if (!item || typeof item !== "object") return null;
      const name = sanitizeObjectName(item.name ?? item.title ?? "");
      if (!name) return null;
      let id = String(item.id ?? "").trim();
      if (!id || ids.has(id)) {
        id = buildObjectId();
      }
      ids.add(id);
      return { id, name };
    })
    .filter(Boolean);
}

function buildRoleKey(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEnergyOrganizationDefaults() {
  const actionIds = energyActions.map((action) => action.id);
  const access = {};
  energySettingsRoles.forEach((role) => {
    access[role] = [...actionIds];
  });
  const fines = {};
  energyFineOptions.forEach((option) => {
    fines[option.id] = {
      enabled: true,
      days: option.defaultDays,
      amount: option.defaultAmount,
    };
  });
  const mailings = {};
  energyMailingOptions.forEach((option) => {
    mailings[option.id] = {
      enabled: true,
      days: option.defaultDays,
      time: option.defaultTime,
    };
  });
  return {
    access,
    stcGroups: [],
    fines,
    mailings,
  };
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function normalizeDays(value, fallback = []) {
  const fallbackDays = Array.isArray(fallback)
    ? fallback.filter((day) => energyWeekDays.includes(day))
    : [];
  const rawValues = Array.isArray(value) ? value : [value];
  const normalized = rawValues
    .map((day) => String(day ?? "").trim())
    .filter((day) => energyWeekDays.includes(day));
  const unique = Array.from(new Set(normalized));
  return unique.length ? unique : fallbackDays;
}

function normalizeTime(value, fallback) {
  const normalized = String(value ?? "").trim();
  if (/^\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }
  return fallback;
}

function normalizeEnergyOrganizationSettings(raw) {
  const defaults = buildEnergyOrganizationDefaults();
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const access = {};
  energySettingsRoles.forEach((role) => {
    const allowed = Array.isArray(source.access?.[role])
      ? source.access[role]
      : defaults.access[role];
    access[role] = allowed.filter((actionId) =>
      defaults.access[role].includes(actionId)
    );
  });
  const stcGroups = Array.isArray(source.stcGroups)
    ? source.stcGroups.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const fines = {};
  energyFineOptions.forEach((option) => {
    const data = source.fines?.[option.id] ?? {};
    fines[option.id] = {
      enabled: Boolean(data.enabled ?? defaults.fines[option.id].enabled),
      days: normalizeNumber(data.days, defaults.fines[option.id].days),
      amount: normalizeNumber(data.amount, defaults.fines[option.id].amount),
    };
  });
  const mailings = {};
  energyMailingOptions.forEach((option) => {
    const data = source.mailings?.[option.id] ?? {};
    mailings[option.id] = {
      enabled: Boolean(data.enabled ?? defaults.mailings[option.id].enabled),
      days: normalizeDays(
        data.days ?? data.day,
        defaults.mailings[option.id].days
      ),
      time: normalizeTime(data.time, defaults.mailings[option.id].time),
    };
  });
  return {
    access,
    stcGroups,
    fines,
    mailings,
  };
}

function getEnergyOrganizationSettings(settingsData) {
  const normalized = normalizeEnergyOrganizationSettings(settingsData.organization);
  settingsData.organization = normalized;
  return normalized;
}

function buildEnergySettingsMarkup(settings) {
  const accessMarkup = energySettingsRoles
    .map((role) => {
      const roleKey = buildRoleKey(role);
      const allowed = new Set(settings.access?.[role] ?? []);
      const actionMarkup = energyActions
        .map((action) => {
          const isChecked = allowed.has(action.id);
          return `
            <label class="settings-tag">
              <input
                type="checkbox"
                name="access-${roleKey}"
                value="${action.id}"
                ${isChecked ? "checked" : ""}
              />
              <span>${action.icon} ${escapeHtml(action.title)}</span>
            </label>
          `;
        })
        .join("");
      return `
        <div class="settings-role" data-access-role="${roleKey}">
          <button
            class="settings-role__header"
            type="button"
            data-access-role-toggle
            aria-expanded="false"
          >
            <span class="settings-chip">${escapeHtml(role)}</span>
            <span class="settings-role__icon" aria-hidden="true">⌄</span>
          </button>
          <div class="settings-role__content">
            <div class="settings-tag-grid">${actionMarkup}</div>
          </div>
        </div>
      `;
    })
    .join("");

  const groupChips =
    settings.stcGroups.length > 0
      ? settings.stcGroups
          .map(
            (name) => `
              <button
                type="button"
                class="settings-chip"
                data-energy-group-chip
                data-group-name="${escapeHtml(name)}"
              >
                <span>${escapeHtml(name)}</span>
                <span aria-hidden="true">✕</span>
              </button>
            `
          )
          .join("")
      : `<span class="settings-chip is-muted">Список пуст</span>`;

  const finesMarkup = energyFineOptions
    .map((option) => {
      const fine = settings.fines?.[option.id] ?? {};
      const hasDaysField = option.id !== "movedByEnergy";
      return `
        <div class="settings-fine-card">
          <div class="settings-fine-card__header">
            <label class="settings-inline">
              <input
                type="checkbox"
                name="fine-${option.id}-enabled"
                ${fine.enabled ? "checked" : ""}
              />
              <span>${escapeHtml(option.title)}</span>
            </label>
          </div>
          <div class="settings-fine-card__fields">
            ${
              hasDaysField
                ? `
                  <label class="settings-fine-field">
                    <span>Срок</span>
                    <input
                      class="form-input"
                      type="number"
                      min="0"
                      inputmode="numeric"
                      name="fine-${option.id}-days"
                      value="${escapeHtml(fine.days ?? 0)}"
                    />
                  </label>
                `
                : ""
            }
            <label class="settings-fine-field">
              <span>Размер</span>
              <input
                class="form-input"
                type="number"
                min="0"
                inputmode="numeric"
                name="fine-${option.id}-amount"
                value="${escapeHtml(fine.amount ?? 0)}"
              />
            </label>
          </div>
        </div>
      `;
    })
    .join("");

  const mailingsMarkup = energyMailingOptions
    .map((option) => {
      const mailing = settings.mailings?.[option.id] ?? {};
      const selectedDays = new Set(mailing.days ?? []);
      const dayOptions = energyWeekDays
        .map(
          (day) => `
            <label class="settings-day-chip">
              <input
                type="checkbox"
                name="mailing-${option.id}-days"
                value="${day}"
                ${selectedDays.has(day) ? "checked" : ""}
              />
              <span>${day}</span>
            </label>
          `
        )
        .join("");
      return `
        <div class="settings-mailing-card">
          <div class="settings-mailing-card__header">
            <label class="settings-inline">
              <input
                type="checkbox"
                name="mailing-${option.id}-enabled"
                ${mailing.enabled ? "checked" : ""}
              />
              <span>${escapeHtml(option.title)}</span>
            </label>
          </div>
          <div class="settings-mailing-card__fields">
            <div class="settings-mailing-field">
              <span>Дни недели</span>
              <div class="settings-day-grid">
                ${dayOptions}
              </div>
            </div>
            <label class="settings-mailing-field">
              <span>Время</span>
              <input
                class="form-input"
                type="time"
                name="mailing-${option.id}-time"
                value="${escapeHtml(mailing.time ?? "")}"
              />
            </label>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="settings-accordion" data-settings-accordion>
      <button
        class="settings-accordion__header"
        type="button"
        data-settings-accordion-toggle
        aria-expanded="false"
      >
        <span class="settings-accordion__title">Права доступа</span>
        <span class="settings-accordion__icon" aria-hidden="true">⌄</span>
      </button>
      <div class="settings-accordion__content">
        <div class="settings-list">${accessMarkup}</div>
      </div>
    </div>
    <div class="settings-accordion" data-settings-accordion>
      <button
        class="settings-accordion__header"
        type="button"
        data-settings-accordion-toggle
        aria-expanded="false"
      >
        <span class="settings-accordion__title">Группы МТЦ</span>
        <span class="settings-accordion__icon" aria-hidden="true">⌄</span>
      </button>
      <div class="settings-accordion__content">
        <div class="settings-accordion__hint">
          Укажите, на какие группы делятся МТЦ.
        </div>
        <div class="settings-row settings-row--columns">
          <input
            class="form-input"
            type="text"
            inputmode="text"
            placeholder="Например, Склад, Цех, Вахта"
            data-energy-group-input
          />
          <button class="action-secondary" type="button" data-energy-group-add>
            Добавить
          </button>
        </div>
        <div class="settings-inline" data-energy-group-list>
          ${groupChips}
        </div>
      </div>
    </div>
    <div class="settings-accordion" data-settings-accordion>
      <button
        class="settings-accordion__header"
        type="button"
        data-settings-accordion-toggle
        aria-expanded="false"
      >
        <span class="settings-accordion__title">Штрафы</span>
        <span class="settings-accordion__icon" aria-hidden="true">⌄</span>
      </button>
      <div class="settings-accordion__content">
        <div class="settings-fines">${finesMarkup}</div>
      </div>
    </div>
    <div class="settings-accordion" data-settings-accordion>
      <button
        class="settings-accordion__header"
        type="button"
        data-settings-accordion-toggle
        aria-expanded="false"
      >
        <span class="settings-accordion__title">Рассылки</span>
        <span class="settings-accordion__icon" aria-hidden="true">⌄</span>
      </button>
      <div class="settings-accordion__content">
        <div class="settings-mailings">
          ${mailingsMarkup}
        </div>
      </div>
    </div>
  `;
}

async function resolveUserSettingsContext(user) {
  const orgShortName = await resolveUserOrganizationShortName(user);
  const orgFullName = await resolveUserOrganizationFullName(user);
  const orgFolderName =
    sanitizeOrganizationFolderName(orgShortName) || "Организация";
  const settingsPath = `./${orgFolderName}/Настройки.json`;
  const objectsPath = `./${orgFolderName}/Объекты.json`;
  const userKey = buildUserKey(user);
  const settingsData = ensureSettingsData(
    await loadJson(settingsPath).catch(() => ({ users: {} }))
  );
  return {
    orgFullName,
    orgShortName,
    orgFolderName,
    settingsPath,
    objectsPath,
    userKey,
    settingsData,
  };
}

async function saveUserPreferences(context, preferences) {
  const normalized = normalizePreferences(preferences);
  context.settingsData.users[context.userKey] = {
    ...(context.settingsData.users[context.userKey] ?? {}),
    preferences: normalized,
  };
  await saveJson(context.settingsPath, context.settingsData, { user: currentUser });
  return normalized;
}

function findUserOrganizationName(user, usersData) {
  const telegramIdKey = normalizeTelegramId(user?.telegram_id);
  let matchedUser = null;

  if (telegramIdKey) {
    matchedUser = usersData.users?.find(
      (item) => normalizeTelegramId(item.telegram_id) === telegramIdKey
    );
  }

  if (!matchedUser) {
    matchedUser = usersData.users?.find(
      (item) =>
        item.full_name === user?.full_name &&
        item.organization === user?.organization &&
        item.role === user?.role
    );
  }

  return matchedUser?.organization ?? user?.organization ?? "Организация";
}

async function resolveUserOrganizationShortName(user) {
  const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
  const orgData = await loadJson(orgFilePath).catch(() => ({ organizations: [] }));
  const organizationName = findUserOrganizationName(user, usersData);
  return pickOrganizationShortName(orgData, organizationName);
}

async function resolveUserOrganizationFullName(user) {
  const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
  const orgData = await loadJson(orgFilePath).catch(() => ({ organizations: [] }));
  const organizationName = findUserOrganizationName(user, usersData);
  return pickOrganizationFullName(orgData, organizationName);
}

function resolveEnergyAccessRole(role) {
  if (energyResponsibleAccessRoles.has(role)) {
    return responsibleRole;
  }
  return role;
}

async function setupEnergyDashboard(user, preferences, contextOverride) {
  const gridEl = contentEl.querySelector("[data-energy-grid]");
  if (!gridEl) return;

  const groupPanel = contentEl.querySelector("[data-energy-group-panel]");
  const createGroupButton = contentEl.querySelector("[data-energy-create-group]");
  const cancelGroupButton = contentEl.querySelector("[data-energy-cancel-group]");
  const selectedCountEl = contentEl.querySelector("[data-energy-selected-count]");
  const settingsModalEl = contentEl.querySelector("[data-energy-settings-modal]");
  const settingsFormEl = contentEl.querySelector("[data-energy-settings-form]");
  const settingsBodyEl = contentEl.querySelector("[data-energy-settings-body]");
  const settingsMessageEl = contentEl.querySelector("[data-energy-settings-message]");
  const settingsCloseButton = contentEl.querySelector("[data-energy-settings-close]");
  const settingsCancelButton = contentEl.querySelector("[data-energy-settings-cancel]");
  const settingsBackdropEl = contentEl.querySelector("[data-energy-settings-backdrop]");
  const objectsModalEl = contentEl.querySelector("[data-energy-objects-modal]");
  const objectsBackdropEl = contentEl.querySelector("[data-energy-objects-backdrop]");
  const objectsCloseButton = contentEl.querySelector("[data-energy-objects-close]");
  const objectsFormEl = contentEl.querySelector("[data-energy-objects-form]");
  const objectsSubmitButton = contentEl.querySelector("[data-energy-objects-submit]");
  const objectsCancelButton = contentEl.querySelector("[data-energy-objects-cancel]");
  const objectsMessageEl = contentEl.querySelector("[data-energy-objects-message]");
  const objectsListEl = contentEl.querySelector("[data-energy-objects-list]");
  const objectsItemsEl = contentEl.querySelector("[data-energy-objects-items]");
  const objectsEmptyEl = contentEl.querySelector("[data-energy-objects-empty]");
  const objectsCountEl = contentEl.querySelector("[data-energy-objects-count]");
  const objectsSubtitleEl = contentEl.querySelector("[data-energy-objects-subtitle]");

  const context = contextOverride || (await resolveUserSettingsContext(user));
  const settingsData = context.settingsData;
  const organizationSettings = getEnergyOrganizationSettings(settingsData);
  const accessRole = resolveEnergyAccessRole(user.role);
  const accessList = organizationSettings.access?.[accessRole];
  const hasAccessConfig = Array.isArray(accessList);
  const availableActions = hasAccessConfig
    ? energyActions.filter((action) => accessList.includes(action.id))
    : energyActions;
  const actionsMap = new Map(availableActions.map((action) => [action.id, action]));
  const savedLayout = settingsData.users?.[context.userKey]?.energy?.layout;
  const pendingMoves =
    settingsData.users?.[context.userKey]?.energy?.pendingMoves ?? 0;
  const layoutCustomized =
    settingsData.users?.[context.userKey]?.energy?.layoutCustomized ?? false;
  const normalizedPreferences = normalizePreferences(preferences);
  const groupingPreference = normalizedPreferences.grouping;
  const normalizedLayout = normalizeEnergyLayout(savedLayout, availableActions, {
    forceToggleLast:
      !layoutCustomized && isDefaultEnergyLayout(savedLayout, availableActions),
  });
  const layoutToRender = applyGroupingPreference(
    normalizedLayout,
    availableActions,
    groupingPreference
  );

  gridEl.innerHTML = "";
  layoutToRender.forEach((item) => {
    if (item.type === "action") {
      const action = actionsMap.get(item.id);
      if (action) {
        gridEl.appendChild(createEnergyActionCard(action));
      }
    } else if (item.type === "group") {
      gridEl.appendChild(createEnergyGroupCard(item, actionsMap));
    } else if (item.type === "toggle" && groupingPreference === "free") {
      gridEl.appendChild(createEnergyGroupToggleCard());
    }
  });

  updateEnergyPendingStat(pendingMoves);
  fitActionTitleTexts(gridEl);
  if (typeof ResizeObserver !== "undefined" && !gridEl.dataset.fitObserverAttached) {
    const fitObserver = new ResizeObserver(() => {
      fitActionTitleTexts(gridEl);
    });
    fitObserver.observe(gridEl);
    gridEl.dataset.fitObserverAttached = "true";
  }

  const groupToggle = contentEl.querySelector("[data-energy-group-toggle]");
  const allowGrouping = groupingPreference === "free";
  let isGrouping = false;
  let blockClick = false;
  const selectedIds = new Set();
  let saveChain = Promise.resolve();
  let saveRequested = false;

  if (!allowGrouping && groupPanel) {
    groupPanel.classList.add("is-hidden");
  }

  const objectsState = {
    items: [],
    editingId: null,
    isSaving: false,
  };
  const objectsPath = context.objectsPath ?? `./${context.orgFolderName}/Объекты.json`;
  const objectsNameInput = objectsFormEl?.querySelector("[name='object-name']");

  if (objectsSubtitleEl) {
    const orgLabel =
      context.orgFullName ?? context.orgShortName ?? context.orgFolderName ?? "";
    objectsSubtitleEl.textContent = orgLabel;
  }

  const setObjectsMessage = (message = "") => {
    if (objectsMessageEl) {
      objectsMessageEl.textContent = message;
    }
  };

  const setObjectsSubmitButton = (mode = "add") => {
    if (!objectsSubmitButton) return;
    const isEdit = mode === "edit";
    const label = isEdit ? "Сохранить изменения" : "Добавить объект";
    objectsSubmitButton.dataset.mode = isEdit ? "edit" : "add";
    objectsSubmitButton.textContent = isEdit ? "✓" : "+";
    objectsSubmitButton.setAttribute("aria-label", label);
    objectsSubmitButton.title = label;
  };

  const resetObjectsForm = () => {
    if (objectsFormEl) {
      objectsFormEl.reset();
    }
    objectsState.editingId = null;
    setObjectsSubmitButton("add");
    if (objectsCancelButton) {
      objectsCancelButton.classList.add("is-hidden");
    }
  };

  const startEditObject = (item) => {
    objectsState.editingId = item.id;
    if (objectsNameInput) {
      objectsNameInput.value = item.name;
      objectsNameInput.focus();
    }
    setObjectsSubmitButton("edit");
    if (objectsCancelButton) {
      objectsCancelButton.classList.remove("is-hidden");
    }
  };

  const renderObjectsList = () => {
    if (!objectsItemsEl) return;
    objectsItemsEl.innerHTML = "";
    if (objectsCountEl) {
      objectsCountEl.textContent = String(objectsState.items.length);
    }
    if (objectsEmptyEl) {
      objectsEmptyEl.classList.toggle("is-hidden", objectsState.items.length > 0);
    }
    objectsState.items.forEach((item) => {
      const itemEl = document.createElement("div");
      itemEl.className = "objects-item";
      itemEl.dataset.objectId = item.id;

      const nameEl = document.createElement("div");
      nameEl.className = "objects-item__name";
      nameEl.textContent = item.name;

      const actionsEl = document.createElement("div");
      actionsEl.className = "objects-item__actions";

      const editButton = document.createElement("button");
      editButton.className = "objects-item__button";
      editButton.type = "button";
      editButton.dataset.objectAction = "edit";
      editButton.textContent = "✎";
      editButton.setAttribute("aria-label", "Редактировать");
      editButton.title = "Редактировать";

      const deleteButton = document.createElement("button");
      deleteButton.className = "objects-item__button objects-item__button--danger";
      deleteButton.type = "button";
      deleteButton.dataset.objectAction = "delete";
      deleteButton.textContent = "✕";
      deleteButton.setAttribute("aria-label", "Удалить");
      deleteButton.title = "Удалить";

      actionsEl.append(editButton, deleteButton);
      itemEl.append(nameEl, actionsEl);
      objectsItemsEl.appendChild(itemEl);
    });
  };

  const loadObjects = async () => {
    if (!objectsItemsEl) return;
    setObjectsMessage("Загружаем список объектов...");
    try {
      const raw = await loadJson(objectsPath);
      objectsState.items = normalizeObjectsData(raw);
      setObjectsMessage("");
    } catch (error) {
      console.warn("Не удалось загрузить объекты.", error);
      objectsState.items = [];
      setObjectsMessage("Не удалось загрузить список объектов.");
    }
    renderObjectsList();
  };

  const saveObjects = async () => {
    if (objectsState.isSaving) return;
    objectsState.isSaving = true;
    setObjectsMessage("Сохраняем изменения...");
    try {
      await saveJson(objectsPath, objectsState.items, { user });
      setObjectsMessage("Список объектов сохранён.");
    } catch (error) {
      console.error(error);
      setObjectsMessage("Не удалось сохранить объекты. Проверьте сервер.");
    } finally {
      objectsState.isSaving = false;
    }
  };

  const openObjectsModal = async () => {
    if (!objectsModalEl) return;
    objectsModalEl.classList.remove("is-hidden");
    resetObjectsForm();
    await loadObjects();
    if (objectsNameInput) {
      objectsNameInput.focus();
    }
  };

  const closeObjectsModal = () => {
    if (!objectsModalEl) return;
    objectsModalEl.classList.add("is-hidden");
    resetObjectsForm();
    setObjectsMessage("");
  };

  if (objectsBackdropEl) {
    objectsBackdropEl.addEventListener("click", closeObjectsModal);
  }
  if (objectsCloseButton) {
    objectsCloseButton.addEventListener("click", closeObjectsModal);
  }
  if (objectsCancelButton) {
    objectsCancelButton.addEventListener("click", () => {
      resetObjectsForm();
      setObjectsMessage("");
    });
  }

  if (objectsFormEl) {
    objectsFormEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!objectsNameInput) return;
      const name = sanitizeObjectName(objectsNameInput.value);
      if (!name) {
        setObjectsMessage("Введите название объекта.");
        return;
      }

      if (objectsState.editingId) {
        const target = objectsState.items.find(
          (item) => item.id === objectsState.editingId
        );
        if (target) {
          target.name = name;
        }
      } else {
        objectsState.items.unshift({ id: buildObjectId(), name });
      }

      renderObjectsList();
      await saveObjects();
      resetObjectsForm();
    });
  }

  if (objectsListEl) {
    objectsListEl.addEventListener("click", async (event) => {
      const actionButton = event.target.closest("[data-object-action]");
      if (!actionButton) return;
      const itemEl = actionButton.closest("[data-object-id]");
      if (!itemEl) return;
      const itemId = itemEl.dataset.objectId;
      const item = objectsState.items.find((entry) => entry.id === itemId);
      if (!item) return;

      const action = actionButton.dataset.objectAction;
      if (action === "edit") {
        startEditObject(item);
        return;
      }
      if (action === "delete") {
        const confirmDelete = window.confirm(
          `Удалить объект «${item.name}»?`
        );
        if (!confirmDelete) return;
        objectsState.items = objectsState.items.filter((entry) => entry.id !== itemId);
        renderObjectsList();
        await saveObjects();
      }
    });
  }

  const updateGroupPanel = () => {
    if (selectedCountEl) {
      selectedCountEl.textContent = selectedIds.size;
    }
    if (createGroupButton) {
      createGroupButton.disabled = selectedIds.size < 2;
    }
  };

  const setGroupingState = (enabled) => {
    isGrouping = enabled;
    gridEl.classList.toggle("is-grouping", enabled);
    if (groupPanel) {
      groupPanel.classList.toggle("is-hidden", !enabled);
    }
    if (groupToggle) {
      groupToggle.setAttribute(
        "aria-label",
        enabled ? "Завершить группировку" : "Группировать"
      );
      groupToggle.setAttribute("aria-pressed", String(enabled));
    }
    if (!enabled) {
      selectedIds.clear();
      gridEl
        .querySelectorAll(".action-card.is-selected")
        .forEach((card) => card.classList.remove("is-selected"));
      updateGroupPanel();
    }
  };

  if (allowGrouping && pendingGroupingStart) {
    setGroupingState(true);
    pendingGroupingStart = false;
  }

  const saveLayout = async () => {
    const layout = buildEnergyLayoutFromDom(gridEl);
    const userSettings = settingsData.users?.[context.userKey] ?? {};
    settingsData.users[context.userKey] = {
      ...userSettings,
      energy: {
        ...(userSettings.energy ?? {}),
        layout,
        layoutCustomized: true,
      },
    };
    await saveJson(context.settingsPath, settingsData, { user });
  };

  const queueLayoutSave = () => {
    saveRequested = true;
    saveChain = saveChain
      .then(async () => {
        if (!saveRequested) return;
        saveRequested = false;
        await saveLayout();
      })
      .catch((error) => {
        console.warn("Не удалось сохранить порядок плашек.", error);
      });
  };

  const scheduleLayoutSave = () => {
    queueLayoutSave();
  };

  if (allowGrouping && groupToggle) {
    groupToggle.addEventListener("click", () => {
      setGroupingState(!isGrouping);
    });
  }

  if (allowGrouping && cancelGroupButton) {
    cancelGroupButton.addEventListener("click", () => {
      setGroupingState(false);
    });
  }

  if (allowGrouping && createGroupButton) {
    createGroupButton.addEventListener("click", async () => {
      if (selectedIds.size < 2) return;
      const groupName = window
        .prompt("Название группы", "Моя группа")
        ?.trim();
      if (!groupName) return;

      const selectedCards = Array.from(
        gridEl.querySelectorAll(".action-card.is-selected")
      );
      const selectedActionIds = selectedCards
        .map((card) => card.dataset.actionId)
        .filter(Boolean);
      if (selectedActionIds.length < 2) return;

      const groupId = `group-${Date.now()}`;
      const groupItem = {
        type: "group",
        id: groupId,
        name: groupName,
        items: selectedActionIds,
      };

      const allItems = Array.from(gridEl.children);
      const firstIndex = allItems.findIndex((item) =>
        item.classList.contains("is-selected")
      );
      const groupCard = createEnergyGroupCard(groupItem, actionsMap);
      if (firstIndex >= 0) {
        gridEl.insertBefore(groupCard, allItems[firstIndex]);
      } else {
        gridEl.appendChild(groupCard);
      }
      selectedCards.forEach((card) => card.remove());
      setGroupingState(false);
      await saveLayout();
    });
  }

  let settingsGroups = [...(organizationSettings.stcGroups ?? [])];
  const renderSettingsBody = () => {
    if (!settingsBodyEl) return;
    settingsBodyEl.innerHTML = buildEnergySettingsMarkup({
      ...organizationSettings,
      stcGroups: settingsGroups,
    });
    const accordionItems = settingsBodyEl.querySelectorAll(
      "[data-settings-accordion]"
    );
    accordionItems.forEach((accordion) => {
      const toggle = accordion.querySelector("[data-settings-accordion-toggle]");
      if (!toggle) return;
      accordion.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.addEventListener("click", () => {
        const nextState = !accordion.classList.contains("is-open");
        accordion.classList.toggle("is-open", nextState);
        toggle.setAttribute("aria-expanded", String(nextState));
      });
    });
    const accessRoles = settingsBodyEl.querySelectorAll("[data-access-role]");
    accessRoles.forEach((role) => {
      const toggle = role.querySelector("[data-access-role-toggle]");
      if (!toggle) return;
      role.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.addEventListener("click", () => {
        const nextState = !role.classList.contains("is-open");
        role.classList.toggle("is-open", nextState);
        toggle.setAttribute("aria-expanded", String(nextState));
      });
    });
    const groupInput = settingsBodyEl.querySelector("[data-energy-group-input]");
    const groupAddButton = settingsBodyEl.querySelector(
      "[data-energy-group-add]"
    );
    const groupList = settingsBodyEl.querySelector("[data-energy-group-list]");

    const renderGroupList = () => {
      if (!groupList) return;
      const listMarkup =
        settingsGroups.length > 0
          ? settingsGroups
              .map(
                (name) => `
                  <button
                    type="button"
                    class="settings-chip"
                    data-energy-group-chip
                    data-group-name="${escapeHtml(name)}"
                  >
                    <span>${escapeHtml(name)}</span>
                    <span aria-hidden="true">✕</span>
                  </button>
                `
              )
              .join("")
          : `<span class="settings-chip is-muted">Список пуст</span>`;
      groupList.innerHTML = listMarkup;
    };

    const addGroup = () => {
      const value = String(groupInput?.value ?? "").trim();
      if (!value) return;
      if (!settingsGroups.includes(value)) {
        settingsGroups = [...settingsGroups, value];
      }
      if (groupInput) groupInput.value = "";
      renderGroupList();
    };

    if (groupAddButton) {
      groupAddButton.addEventListener("click", addGroup);
    }
    if (groupInput) {
      groupInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          addGroup();
        }
      });
    }
    if (groupList) {
      groupList.addEventListener("click", (event) => {
        const chip = event.target.closest("[data-energy-group-chip]");
        if (!chip) return;
        const name = chip.dataset.groupName;
        settingsGroups = settingsGroups.filter((item) => item !== name);
        renderGroupList();
      });
    }
  };

  const openSettingsModal = () => {
    if (!settingsModalEl) return;
    settingsGroups = [...(organizationSettings.stcGroups ?? [])];
    renderSettingsBody();
    settingsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const closeSettingsModal = () => {
    if (!settingsModalEl) return;
    settingsModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
    if (settingsMessageEl) settingsMessageEl.textContent = "";
  };

  settingsBackdropEl?.addEventListener("click", closeSettingsModal);
  settingsCloseButton?.addEventListener("click", closeSettingsModal);
  settingsCancelButton?.addEventListener("click", closeSettingsModal);
  settingsModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSettingsModal();
    }
  });

  settingsFormEl?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!settingsFormEl) return;
    if (settingsMessageEl) {
      settingsMessageEl.textContent = "Сохраняем настройки...";
    }
    const formData = new FormData(settingsFormEl);
    const nextAccess = {};
    energySettingsRoles.forEach((role) => {
      const roleKey = buildRoleKey(role);
      const values = formData.getAll(`access-${roleKey}`).map(String);
      nextAccess[role] = values;
    });
    const nextFines = {};
    energyFineOptions.forEach((option) => {
      const enabled = formData.get(`fine-${option.id}-enabled`) !== null;
      nextFines[option.id] = {
        enabled,
        days: normalizeNumber(formData.get(`fine-${option.id}-days`), 0),
        amount: normalizeNumber(formData.get(`fine-${option.id}-amount`), 0),
      };
    });
    const nextMailings = {};
    energyMailingOptions.forEach((option) => {
      nextMailings[option.id] = {
        enabled: formData.get(`mailing-${option.id}-enabled`) !== null,
        days: normalizeDays(
          formData.getAll(`mailing-${option.id}-days`),
          option.defaultDays
        ),
        time: normalizeTime(
          formData.get(`mailing-${option.id}-time`),
          option.defaultTime
        ),
      };
    });
    settingsData.organization = normalizeEnergyOrganizationSettings({
      access: nextAccess,
      stcGroups: settingsGroups,
      fines: nextFines,
      mailings: nextMailings,
    });
    try {
      await saveJson(context.settingsPath, settingsData, { user });
      if (settingsMessageEl) {
        settingsMessageEl.textContent = "Настройки сохранены для организации.";
      }
      closeSettingsModal();
      await renderUserRoleView();
    } catch (error) {
      console.error(error);
      if (settingsMessageEl) {
        settingsMessageEl.textContent =
          "Не удалось сохранить настройки. Проверьте сервер.";
      }
    }
  });

  gridEl.addEventListener("click", (event) => {
    if (blockClick) return;
    const targetCard = event.target.closest("[data-energy-item]");
    if (!targetCard) return;
    if (
      !isGrouping &&
      targetCard.dataset.energyItemType === "action" &&
      targetCard.dataset.actionId === "settings"
    ) {
      openSettingsModal();
      return;
    }
    if (
      !isGrouping &&
      targetCard.dataset.energyItemType === "action" &&
      targetCard.dataset.actionId === "objects"
    ) {
      openObjectsModal();
      return;
    }
    if (blockClick || !isGrouping || !allowGrouping) return;
    const card = targetCard;
    const itemType = targetCard.dataset.energyItemType;
    if (itemType === "action") {
      const actionId = targetCard.dataset.actionId;
      if (!actionId) return;
      targetCard.classList.toggle("is-selected");
      if (targetCard.classList.contains("is-selected")) {
        selectedIds.add(actionId);
      } else {
        selectedIds.delete(actionId);
      }
      updateGroupPanel();
      return;
    }
    if (itemType !== "group") return;

    const groupName = card.dataset.groupName ?? "Группа";
    const confirmUngroup = window.confirm(`Разгруппировать «${groupName}»?`);
    if (!confirmUngroup) return;

    let groupItems = [];
    if (card.dataset.groupItems) {
      try {
        groupItems = JSON.parse(card.dataset.groupItems);
      } catch (error) {
        groupItems = [];
      }
    }
    if (!Array.isArray(groupItems) || groupItems.length === 0) return;

    const parent = card.parentElement;
    if (!parent) return;
    const insertBeforeNode = card.nextSibling;
    card.remove();
    groupItems.forEach((actionId) => {
      const action = actionsMap.get(actionId);
      if (!action) return;
      const actionCard = createEnergyActionCard(action);
      if (insertBeforeNode) {
        parent.insertBefore(actionCard, insertBeforeNode);
      } else {
        parent.appendChild(actionCard);
      }
    });
    fitActionTitleTexts(gridEl);
    scheduleLayoutSave();
  });

  const dragState = {
    item: null,
    pointerId: null,
    pointerType: null,
    holdTimer: null,
    isDragging: false,
    pointerStartX: 0,
    pointerStartY: 0,
    startCenterX: 0,
    startCenterY: 0,
    lastPointerX: 0,
    lastPointerY: 0,
    rafId: null,
  };
  const animateEnergyReorder = (firstRects) => {
    const items = Array.from(gridEl.querySelectorAll("[data-energy-item]"));
    items.forEach((item) => {
      if (item === dragState.item) return;
      const firstRect = firstRects.get(item);
      if (!firstRect) return;
      const lastRect = item.getBoundingClientRect();
      const deltaX = firstRect.left - lastRect.left;
      const deltaY = firstRect.top - lastRect.top;
      if (deltaX || deltaY) {
        item.animate(
          [
            { transform: `translate(${deltaX}px, ${deltaY}px)` },
            { transform: "translate(0, 0)" },
          ],
          {
            duration: 260,
            easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
          }
        );
      }
    });
  };

  const clearDrag = async () => {
    if (dragState.holdTimer) {
      window.clearTimeout(dragState.holdTimer);
      dragState.holdTimer = null;
    }
    if (dragState.rafId) {
      cancelAnimationFrame(dragState.rafId);
      dragState.rafId = null;
    }
    if (dragState.item) {
      dragState.item.classList.remove("is-dragging");
      dragState.item.style.removeProperty("--drag-x");
      dragState.item.style.removeProperty("--drag-y");
    }
    if (dragState.isDragging) {
      gridEl.classList.remove("is-dragging");
      dragState.isDragging = false;
      blockClick = true;
      await saveLayout();
      setTimeout(() => {
        blockClick = false;
      }, 0);
    }
    dragState.item = null;
    dragState.pointerId = null;
    dragState.pointerType = null;
  };

  const updateDragTransform = (clientX, clientY) => {
    if (!dragState.item) return;
    const deltaX = clientX - dragState.startCenterX;
    const deltaY = clientY - dragState.startCenterY;
    dragState.item.style.setProperty("--drag-x", `${deltaX}px`);
    dragState.item.style.setProperty("--drag-y", `${deltaY}px`);
  };

  gridEl.addEventListener("pointerdown", (event) => {
    if (isGrouping) return;
    const card = event.target.closest("[data-energy-item]");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    dragState.item = card;
    dragState.pointerId = event.pointerId;
    dragState.pointerType = event.pointerType;
    dragState.pointerStartX = event.clientX;
    dragState.pointerStartY = event.clientY;
    dragState.lastPointerX = event.clientX;
    dragState.lastPointerY = event.clientY;
    dragState.startCenterX = rect.left + rect.width / 2;
    dragState.startCenterY = rect.top + rect.height / 2;
    dragState.holdTimer = window.setTimeout(() => {
      if (!dragState.item) return;
      dragState.isDragging = true;
      dragState.item.classList.add("is-dragging");
      gridEl.classList.add("is-dragging");
      card.setPointerCapture(dragState.pointerId);
      updateDragTransform(dragState.lastPointerX, dragState.lastPointerY);
    }, event.pointerType === "touch" ? 280 : 200);
  });

  gridEl.addEventListener("pointermove", (event) => {
    if (!dragState.item) return;
    dragState.lastPointerX = event.clientX;
    dragState.lastPointerY = event.clientY;
    if (!dragState.isDragging) {
      const moved =
        Math.abs(event.clientX - dragState.pointerStartX) > 8 ||
        Math.abs(event.clientY - dragState.pointerStartY) > 8;
      if (moved && dragState.holdTimer) {
        window.clearTimeout(dragState.holdTimer);
        dragState.holdTimer = null;
      }
      return;
    }
    if (event.cancelable && dragState.pointerType === "touch") {
      event.preventDefault();
    }
    if (dragState.rafId) {
      cancelAnimationFrame(dragState.rafId);
    }
    dragState.rafId = requestAnimationFrame(() => {
      updateDragTransform(event.clientX, event.clientY);
    });
    const target = document
      .elementsFromPoint(event.clientX, event.clientY)
      .map((element) => element.closest?.("[data-energy-item]"))
      .find((element) => element && element !== dragState.item);
    if (!target || target === dragState.item) return;
    const items = Array.from(gridEl.querySelectorAll("[data-energy-item]"));
    const firstRects = new Map(
      items.map((item) => [item, item.getBoundingClientRect()])
    );
    const draggedRect = dragState.item.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const shouldInsertAfter = event.clientY > rect.top + rect.height / 2;
    gridEl.insertBefore(
      dragState.item,
      shouldInsertAfter ? target.nextSibling : target
    );
    const updatedRect = dragState.item.getBoundingClientRect();
    dragState.startCenterX += updatedRect.left - draggedRect.left;
    dragState.startCenterY += updatedRect.top - draggedRect.top;
    animateEnergyReorder(firstRects);
    scheduleLayoutSave();
  });

  gridEl.addEventListener("pointerup", () => {
    clearDrag();
  });

  gridEl.addEventListener("pointercancel", () => {
    clearDrag();
  });
}

function createRegistrationToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${randomPart}`;
}

function buildTelegramRegistrationLinks(botUsername, token) {
  if (!botUsername || !token) return null;
  const webLink = new URL(`https://t.me/${botUsername}`);
  webLink.searchParams.set("startapp", token);
  const appLink = new URL("tg://resolve");
  appLink.searchParams.set("domain", botUsername);
  appLink.searchParams.set("startapp", token);
  return { webLink: webLink.href, appLink: appLink.href };
}

async function loadRegistrations() {
  try {
    return await loadJson(pendingRegistrationsFilePath);
  } catch (error) {
    console.warn("Не удалось загрузить временные регистрации.", error);
    return { registrations: [] };
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
  const registrationBox = contentEl.querySelector("[data-registration-box]");
  const registrationLinkEl = contentEl.querySelector(
    "[data-registration-link]"
  );
  const openTelegramButton = contentEl.querySelector("[data-open-telegram]");
  const shareTelegramButton = contentEl.querySelector("[data-share-telegram]");
  const copyRegistrationButton = contentEl.querySelector(
    "[data-copy-registration]"
  );
  const telegramNoteEl = contentEl.querySelector("[data-telegram-note]");
  const openOrgsButtons = contentEl.querySelectorAll("[data-open-orgs]");
  const openUsersButtons = contentEl.querySelectorAll("[data-open-users]");
  const orgsModalEl = contentEl.querySelector("[data-orgs-modal]");
  const orgsBackdropEl = contentEl.querySelector("[data-orgs-backdrop]");
  const orgsCloseButton = contentEl.querySelector("[data-orgs-close]");
  const orgsDetailsModalEl = contentEl.querySelector(
    "[data-orgs-details-modal]"
  );
  const orgsDetailsBackdropEl = contentEl.querySelector(
    "[data-orgs-details-backdrop]"
  );
  const orgsDetailsCloseButton = contentEl.querySelector(
    "[data-orgs-details-close]"
  );
  const orgsListEl = contentEl.querySelector("[data-orgs-list]");
  const orgsEmptyEl = contentEl.querySelector("[data-orgs-empty]");
  const orgsDetailsNameEl = contentEl.querySelector(
    "[data-orgs-details-name]"
  );
  const orgsDetailsLaunchEl = contentEl.querySelector(
    "[data-orgs-details-launch]"
  );
  const orgsDetailUsersEl = contentEl.querySelector("[data-orgs-detail-users]");
  const orgsDetailToolsTotalEl = contentEl.querySelector(
    "[data-orgs-detail-tools-total]"
  );
  const orgsDetailToolsActiveEl = contentEl.querySelector(
    "[data-orgs-detail-tools-active]"
  );
  const orgsEnergyListEl = contentEl.querySelector("[data-orgs-energy-list]");
  const energyInviteBox = contentEl.querySelector("[data-energy-invite-box]");
  const energyInviteHintEl = contentEl.querySelector("[data-energy-invite-hint]");
  const energyInviteNoteEl = contentEl.querySelector("[data-energy-invite-note]");
  const energyInviteLinkEl = contentEl.querySelector("[data-energy-invite-link]");
  const energyInviteShareButton = contentEl.querySelector(
    "[data-energy-invite-share]"
  );
  const energyInviteCopyButton = contentEl.querySelector(
    "[data-energy-invite-copy]"
  );
  const energyInviteOpenButton = contentEl.querySelector(
    "[data-energy-invite-open]"
  );
  const usersModalEl = contentEl.querySelector("[data-users-modal]");
  const usersBackdropEl = contentEl.querySelector("[data-users-backdrop]");
  const usersCloseButton = contentEl.querySelector("[data-users-close]");
  const usersOrgsListEl = contentEl.querySelector("[data-users-orgs-list]");
  const usersOrgsEmptyEl = contentEl.querySelector("[data-users-orgs-empty]");
  const usersDetailsModalEl = contentEl.querySelector(
    "[data-users-details-modal]"
  );
  const usersDetailsBackdropEl = contentEl.querySelector(
    "[data-users-details-backdrop]"
  );
  const usersDetailsCloseButton = contentEl.querySelector(
    "[data-users-details-close]"
  );
  const usersDetailsNameEl = contentEl.querySelector(
    "[data-users-details-name]"
  );
  const usersDetailsCountEl = contentEl.querySelector(
    "[data-users-details-count]"
  );
  const usersDetailsListEl = contentEl.querySelector(
    "[data-users-details-list]"
  );
  const usersDetailsEmptyEl = contentEl.querySelector(
    "[data-users-details-empty]"
  );
  const usersInviteBox = contentEl.querySelector("[data-users-invite-box]");
  const usersInviteHintEl = contentEl.querySelector("[data-users-invite-hint]");
  const usersInviteNoteEl = contentEl.querySelector("[data-users-invite-note]");
  const usersInviteLinkEl = contentEl.querySelector("[data-users-invite-link]");
  const usersInviteShareButton = contentEl.querySelector(
    "[data-users-invite-share]"
  );
  const usersInviteCopyButton = contentEl.querySelector(
    "[data-users-invite-copy]"
  );
  const usersInviteOpenButton = contentEl.querySelector(
    "[data-users-invite-open]"
  );
  const usersAddButton = contentEl.querySelector("[data-users-add]");
  const usersAddModalEl = contentEl.querySelector("[data-users-add-modal]");
  const usersAddBackdropEl = contentEl.querySelector("[data-users-add-backdrop]");
  const usersAddCloseButton = contentEl.querySelector("[data-users-add-close]");
  const usersAddCancelButton = contentEl.querySelector("[data-users-add-cancel]");
  const usersAddFormEl = contentEl.querySelector("[data-users-add-form]");
  const usersAddMessageEl = contentEl.querySelector("[data-users-add-message]");
  const usersAddOrgNameEl = contentEl.querySelector("[data-users-add-org-name]");
  const usersAddFirstNameInput = contentEl.querySelector(
    "#users-add-first-name"
  );
  const usersAddMiddleNameInput = contentEl.querySelector(
    "#users-add-middle-name"
  );
  const usersAddFirstNameSuggestionsEl = contentEl.querySelector(
    "[data-users-add-first-name-suggestions]"
  );
  const usersAddMiddleNameSuggestionsEl = contentEl.querySelector(
    "[data-users-add-middle-name-suggestions]"
  );
  const usersAddInviteBox = contentEl.querySelector(
    "[data-users-add-invite-box]"
  );
  const usersAddInviteHintEl = contentEl.querySelector(
    "[data-users-add-invite-hint]"
  );
  const usersAddInviteNoteEl = contentEl.querySelector(
    "[data-users-add-invite-note]"
  );
  const usersAddInviteLinkEl = contentEl.querySelector(
    "[data-users-add-invite-link]"
  );
  const usersAddInviteShareButton = contentEl.querySelector(
    "[data-users-add-invite-share]"
  );
  const usersAddInviteCopyButton = contentEl.querySelector(
    "[data-users-add-invite-copy]"
  );
  const usersAddInviteOpenButton = contentEl.querySelector(
    "[data-users-add-invite-open]"
  );

  if (!dashboardEl || !addOrgSection || !formEl) return;

  const showDashboard = () => {
    dashboardEl.classList.remove("is-hidden");
    addOrgSection.classList.add("is-hidden");
  };

  const showForm = () => {
    dashboardEl.classList.add("is-hidden");
    addOrgSection.classList.remove("is-hidden");
    if (registrationBox) {
      registrationBox.classList.add("is-hidden");
      delete registrationBox.dataset.shareText;
      delete registrationBox.dataset.telegramLink;
      delete registrationBox.dataset.telegramAppLink;
    }
    if (messageEl) messageEl.textContent = "";
    if (shareTelegramButton) shareTelegramButton.disabled = true;
    if (openTelegramButton) openTelegramButton.disabled = true;
    if (copyRegistrationButton) copyRegistrationButton.disabled = true;
    if (openTelegramButton) openTelegramButton.textContent = "Открыть в Telegram";
    if (telegramNoteEl) {
      telegramNoteEl.textContent =
        "Ссылка создастся через бот или как веб-ссылка. Откройте её в Telegram, чтобы ID сохранился автоматически.";
    }
  };

  const getCollectionCount = (data, fallbackKey) => {
    if (Array.isArray(data)) return data.length;
    if (!data || typeof data !== "object") return 0;
    const collection = data[fallbackKey];
    return Array.isArray(collection) ? collection.length : 0;
  };

  const updateStats = async () => {
    try {
      const [orgData, usersData] = await Promise.all([
        loadJson(orgFilePath),
        loadJson(usersFilePath),
      ]);
      if (orgCountEl) {
        orgCountEl.textContent = getCollectionCount(orgData, "organizations");
      }
      if (userCountEl) {
        userCountEl.textContent = getCollectionCount(usersData, "users");
      }
    } catch (error) {
      console.error(error);
      if (orgCountEl) orgCountEl.textContent = "0";
      if (userCountEl) userCountEl.textContent = "0";
    }
  };

  const formatUserCount = (value) => {
    const count = Number(value) || 0;
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return `${count} пользователь`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
      return `${count} пользователя`;
    }
    return `${count} пользователей`;
  };

  const loadOrgsAndUsers = async () => {
    const [orgData, usersData] = await Promise.all([
      loadJson(orgFilePath),
      loadJson(usersFilePath),
    ]);
    const organizations = Array.isArray(orgData?.organizations)
      ? orgData.organizations
      : [];
    const users = Array.isArray(usersData?.users) ? usersData.users : [];
    orgsState.organizations = organizations;
    orgsState.users = users;
    return { organizations, users };
  };

  const buildUserCountsMap = (users) => {
    const counts = new Map();
    users.forEach((user) => {
      const orgName = String(user?.organization ?? "").trim();
      if (!orgName) return;
      counts.set(orgName, (counts.get(orgName) ?? 0) + 1);
    });
    return counts;
  };

  const getOrgUserCount = (org, counts) => {
    const orgNames = getOrgNames(org);
    return orgNames.reduce((total, name) => total + (counts.get(name) ?? 0), 0);
  };

  const orgsState = {
    organizations: [],
    users: [],
  };
  let selectedOrgName = "";
  let selectedUsersOrgName = "";

  const getOrgDisplayName = (org) => {
    const name = String(org?.full_name ?? org?.fullName ?? "").trim();
    return name || "Организация без названия";
  };

  const getOrgNames = (org) => {
    const names = new Set();
    const fullName = String(org?.full_name ?? org?.fullName ?? "").trim();
    const shortName = String(org?.short_name ?? org?.shortName ?? "").trim();
    if (fullName) names.add(fullName);
    if (shortName) names.add(shortName);
    return Array.from(names);
  };

  const pluralize = (count, one, few, many) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  };

  const parseLaunchDate = (value) => {
    if (!value) return null;
    const [day, month, year] = String(value).split(".").map(Number);
    if (!day || !month || !year) return null;
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  };

  const formatWorkDuration = (launchDate) => {
    if (!launchDate) return "";
    const now = new Date();
    if (launchDate > now) return "запуск впереди";
    let years = now.getFullYear() - launchDate.getFullYear();
    let months = now.getMonth() - launchDate.getMonth();
    let days = now.getDate() - launchDate.getDate();
    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    const parts = [];
    if (years > 0) {
      parts.push(
        `${years} ${pluralize(years, "год", "года", "лет")}`
      );
    }
    if (months > 0 && parts.length < 2) {
      parts.push(
        `${months} ${pluralize(months, "месяц", "месяца", "месяцев")}`
      );
    }
    if (!parts.length) {
      const safeDays = Math.max(days, 1);
      parts.push(
        `${safeDays} ${pluralize(safeDays, "день", "дня", "дней")}`
      );
    }
    return parts.join(" ");
  };

  const resetEnergyInvite = () => {
    if (!energyInviteBox) return;
    energyInviteBox.classList.add("is-hidden");
    delete energyInviteBox.dataset.shareText;
    delete energyInviteBox.dataset.telegramLink;
    delete energyInviteBox.dataset.telegramAppLink;
    if (energyInviteLinkEl) {
      energyInviteLinkEl.value = "";
    }
    if (energyInviteHintEl) {
      energyInviteHintEl.textContent =
        "Выберите энергетика в списке, чтобы сформировать ссылку.";
    }
    if (energyInviteNoteEl) {
      energyInviteNoteEl.textContent =
        "Откройте ссылку в Telegram — ID сохранится автоматически.";
    }
    if (energyInviteShareButton) energyInviteShareButton.disabled = true;
    if (energyInviteCopyButton) energyInviteCopyButton.disabled = true;
    if (energyInviteOpenButton) {
      energyInviteOpenButton.disabled = true;
      energyInviteOpenButton.textContent = "Открыть в Telegram";
    }
  };

  const resetUsersInvite = () => {
    if (!usersInviteBox) return;
    usersInviteBox.classList.add("is-hidden");
    delete usersInviteBox.dataset.shareText;
    delete usersInviteBox.dataset.telegramLink;
    delete usersInviteBox.dataset.telegramAppLink;
    if (usersInviteLinkEl) {
      usersInviteLinkEl.value = "";
    }
    if (usersInviteHintEl) {
      usersInviteHintEl.textContent =
        "Нажмите на ответственного без ID в списке, чтобы сформировать ссылку.";
    }
    if (usersInviteNoteEl) {
      usersInviteNoteEl.textContent =
        "Откройте ссылку в Telegram — ID сохранится автоматически.";
    }
    if (usersInviteShareButton) usersInviteShareButton.disabled = true;
    if (usersInviteCopyButton) usersInviteCopyButton.disabled = true;
    if (usersInviteOpenButton) {
      usersInviteOpenButton.disabled = true;
      usersInviteOpenButton.textContent = "Открыть в Telegram";
    }
  };

  const resetUsersAddInvite = () => {
    if (!usersAddInviteBox) return;
    usersAddInviteBox.classList.add("is-hidden");
    delete usersAddInviteBox.dataset.shareText;
    delete usersAddInviteBox.dataset.telegramLink;
    delete usersAddInviteBox.dataset.telegramAppLink;
    if (usersAddInviteLinkEl) {
      usersAddInviteLinkEl.value = "";
    }
    if (usersAddInviteHintEl) {
      usersAddInviteHintEl.textContent =
        "Заполните данные пользователя и выберите роль.";
    }
    if (usersAddInviteNoteEl) {
      usersAddInviteNoteEl.textContent =
        "Откройте ссылку в Telegram — ID сохранится автоматически.";
    }
    if (usersAddInviteShareButton) usersAddInviteShareButton.disabled = true;
    if (usersAddInviteCopyButton) usersAddInviteCopyButton.disabled = true;
    if (usersAddInviteOpenButton) {
      usersAddInviteOpenButton.disabled = true;
      usersAddInviteOpenButton.textContent = "Открыть в Telegram";
    }
  };

  const resetUsersAddForm = () => {
    usersAddFormEl?.reset();
    resetUsersAddInvite();
    if (usersAddMessageEl) usersAddMessageEl.textContent = "";
    if (usersAddFirstNameSuggestionsEl) {
      usersAddFirstNameSuggestionsEl.classList.add("is-hidden");
    }
    if (usersAddMiddleNameSuggestionsEl) {
      usersAddMiddleNameSuggestionsEl.classList.add("is-hidden");
    }
  };

  const parseUserNameParts = (fullName = "") => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    return {
      lastName: parts[0] ?? "",
      firstName: parts[1] ?? "",
      middleName: parts[2] ?? "",
    };
  };

  const usersNameSuggestions = {
    firstNames: [],
    middleNames: [],
  };

  const updateUsersNameSuggestions = (users) => {
    const firstNames = new Set();
    const middleNames = new Set();
    users.forEach((user) => {
      const fullName = String(user?.full_name ?? "").trim();
      if (!fullName) return;
      const { lastName, firstName, middleName } = parseUserNameParts(fullName);
      if (firstName) firstNames.add(firstName);
      if (middleName) middleNames.add(middleName);
    });
    usersNameSuggestions.firstNames = Array.from(firstNames).sort();
    usersNameSuggestions.middleNames = Array.from(middleNames).sort();
  };

  const getFilteredSuggestions = (value, source) => {
    const safeValue = String(value ?? "").trim();
    if (!safeValue) return [];
    const normalized = safeValue.toLowerCase();
    return source
      .filter((item) => item.toLowerCase().startsWith(normalized))
      .slice(0, 6);
  };

  const renderSuggestions = (containerEl, items, inputEl) => {
    if (!containerEl) return;
    containerEl.innerHTML = "";
    if (!items.length) {
      containerEl.classList.add("is-hidden");
      return;
    }
    items.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "suggestions__item";
      button.textContent = item;
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        if (inputEl) {
          inputEl.value = item;
          inputEl.dispatchEvent(new Event("input", { bubbles: true }));
        }
        containerEl.classList.add("is-hidden");
      });
      containerEl.appendChild(button);
    });
    containerEl.classList.remove("is-hidden");
  };

  const attachSuggestions = (inputEl, containerEl, sourceKey) => {
    if (!inputEl || !containerEl) return;
    const update = () => {
      const source = usersNameSuggestions[sourceKey] ?? [];
      const items = getFilteredSuggestions(inputEl.value, source);
      renderSuggestions(containerEl, items, inputEl);
    };
    const hide = () => {
      containerEl.classList.add("is-hidden");
    };
    inputEl.addEventListener("input", () => {
      if (!inputEl.value.trim()) {
        hide();
        return;
      }
      update();
    });
    inputEl.addEventListener("focus", () => {
      if (inputEl.value.trim()) update();
    });
    inputEl.addEventListener("blur", () => {
      setTimeout(hide, 120);
    });
  };

  attachSuggestions(
    usersAddFirstNameInput,
    usersAddFirstNameSuggestionsEl,
    "firstNames"
  );
  attachSuggestions(
    usersAddMiddleNameInput,
    usersAddMiddleNameSuggestionsEl,
    "middleNames"
  );

  const createResponsibleInvite = async (user) => {
    if (!usersInviteBox || !user) return;
    const fullName = String(user?.full_name ?? "Ответственный").trim();
    const organizationName = String(
      user?.organization ?? selectedUsersOrgName ?? ""
    ).trim();
    const roleName = String(user?.role ?? responsibleRole).trim() || responsibleRole;
    if (!fullName || !organizationName) return;

    try {
      const registrationsData = await loadRegistrations();
      const registrations = registrationsData.registrations ?? [];
      const existing = registrations.find(
        (item) =>
          item.user?.full_name === fullName &&
          item.user?.organization === organizationName &&
          item.user?.role === roleName
      );
      const registrationToken = existing?.token ?? createRegistrationToken();

      if (!existing) {
        const nextRegistrationsData = {
          registrations: [
            ...registrations,
            {
              token: registrationToken,
              created_at: new Date().toISOString(),
              user: {
                full_name: fullName,
                organization: organizationName,
                role: roleName,
              },
            },
          ],
        };
        await saveEntries([
          { path: pendingRegistrationsFilePath, data: nextRegistrationsData },
        ]);
      }

      const registrationLink = new URL(
        `${window.location.origin}${window.location.pathname}`
      );
      registrationLink.searchParams.set("registration", registrationToken);
      const botUsername = await resolveBotUsername();
      const telegramLinks = buildTelegramRegistrationLinks(
        botUsername,
        registrationToken
      );
      const fallbackLink = telegramLinks?.webLink ?? registrationLink.href;

      if (usersInviteHintEl) {
        usersInviteHintEl.textContent = "Ссылка для приглашения готова.";
      }
      if (usersInviteLinkEl) {
        usersInviteLinkEl.value = fallbackLink;
      }
      usersInviteBox.dataset.shareText = `Контакт ответственного: ${fullName}. Организация: ${organizationName}.`;
      usersInviteBox.dataset.telegramLink = fallbackLink;
      if (telegramLinks?.appLink) {
        usersInviteBox.dataset.telegramAppLink = telegramLinks.appLink;
      } else {
        delete usersInviteBox.dataset.telegramAppLink;
      }
      if (usersInviteNoteEl) {
        usersInviteNoteEl.textContent = telegramLinks?.webLink
          ? "При открытии в Telegram ID сохранится автоматически и ответственный сразу увидит свою страницу."
          : "Бот ещё не указан. Скопируйте ссылку и отправьте её вручную.";
      }
      if (usersInviteShareButton) {
        usersInviteShareButton.disabled = !usersInviteLinkEl?.value;
      }
      if (usersInviteCopyButton) {
        usersInviteCopyButton.disabled = !usersInviteLinkEl?.value;
      }
      if (usersInviteOpenButton) {
        usersInviteOpenButton.disabled = !usersInviteLinkEl?.value;
        usersInviteOpenButton.textContent = telegramLinks?.webLink
          ? "Открыть в Telegram"
          : "Открыть ссылку";
      }
      usersInviteBox.classList.remove("is-hidden");
    } catch (error) {
      console.error(error);
      if (usersInviteNoteEl) {
        usersInviteNoteEl.textContent =
          "Не удалось сформировать ссылку. Попробуйте позже.";
      }
      usersInviteBox.classList.remove("is-hidden");
    }
  };

  const createEnergyInvite = async (user) => {
    if (!energyInviteBox || !user) return;
    const energyFullName = String(user?.full_name ?? "Энергетик").trim();
    const organizationName = String(
      user?.organization ?? selectedOrgName ?? ""
    ).trim();
    if (!energyFullName || !organizationName) return;

    try {
      const registrationsData = await loadRegistrations();
      const registrations = registrationsData.registrations ?? [];
      const existing = registrations.find(
        (item) =>
          item.user?.full_name === energyFullName &&
          item.user?.organization === organizationName &&
          item.user?.role === "Энергетик"
      );
      const registrationToken = existing?.token ?? createRegistrationToken();

      if (!existing) {
        const nextRegistrationsData = {
          registrations: [
            ...registrations,
            {
              token: registrationToken,
              created_at: new Date().toISOString(),
              user: {
                full_name: energyFullName,
                organization: organizationName,
                role: "Энергетик",
              },
            },
          ],
        };
        await saveEntries([
          { path: pendingRegistrationsFilePath, data: nextRegistrationsData },
        ]);
      }

      const registrationLink = new URL(
        `${window.location.origin}${window.location.pathname}`
      );
      registrationLink.searchParams.set("registration", registrationToken);
      const botUsername = await resolveBotUsername();
      const telegramLinks = buildTelegramRegistrationLinks(
        botUsername,
        registrationToken
      );
      const fallbackLink = telegramLinks?.webLink ?? registrationLink.href;

      if (energyInviteHintEl) {
        energyInviteHintEl.textContent = "Ссылка для приглашения готова.";
      }
      if (energyInviteLinkEl) {
        energyInviteLinkEl.value = fallbackLink;
      }
      energyInviteBox.dataset.shareText = `Контакт энергетика: ${energyFullName}. Организация: ${organizationName}.`;
      energyInviteBox.dataset.telegramLink = fallbackLink;
      if (telegramLinks?.appLink) {
        energyInviteBox.dataset.telegramAppLink = telegramLinks.appLink;
      } else {
        delete energyInviteBox.dataset.telegramAppLink;
      }
      if (energyInviteNoteEl) {
        energyInviteNoteEl.textContent = telegramLinks?.webLink
          ? "При открытии в Telegram ID сохранится автоматически и энергетик сразу увидит свою страницу."
          : "Бот ещё не указан. Скопируйте ссылку и отправьте её вручную.";
      }
      if (energyInviteShareButton) {
        energyInviteShareButton.disabled = !energyInviteLinkEl?.value;
      }
      if (energyInviteCopyButton) {
        energyInviteCopyButton.disabled = !energyInviteLinkEl?.value;
      }
      if (energyInviteOpenButton) {
        energyInviteOpenButton.disabled = !energyInviteLinkEl?.value;
        energyInviteOpenButton.textContent = telegramLinks?.webLink
          ? "Открыть в Telegram"
          : "Открыть ссылку";
      }
      energyInviteBox.classList.remove("is-hidden");
    } catch (error) {
      console.error(error);
      if (energyInviteNoteEl) {
        energyInviteNoteEl.textContent =
          "Не удалось сформировать ссылку. Попробуйте позже.";
      }
      energyInviteBox.classList.remove("is-hidden");
    }
  };

  const renderEnergyList = (energyUsers) => {
    if (!orgsEnergyListEl) return;
    orgsEnergyListEl.innerHTML = "";
    if (!energyUsers.length) {
      const empty = document.createElement("div");
      empty.className = "orgs-energy__empty";
      empty.textContent = "Энергетики не добавлены.";
      orgsEnergyListEl.appendChild(empty);
      resetEnergyInvite();
      return;
    }

    energyUsers.forEach((user) => {
      const card = document.createElement("div");
      card.className = "orgs-energy__item";

      const name = document.createElement("div");
      name.className = "orgs-energy__name";
      name.textContent = String(user?.full_name ?? "Без имени").trim();

      const status = document.createElement("div");
      const hasId = Number(user?.telegram_id) !== 0;
      status.className = `orgs-energy__status${
        hasId ? " orgs-energy__status--ok" : ""
      }`;
      status.textContent = hasId
        ? "ID привязан"
        : "ID не указан · нажмите, чтобы пригласить";

      if (!hasId) {
        card.classList.add("is-actionable");
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute(
          "aria-label",
          `Пригласить энергетика ${name.textContent}`
        );
        const handleInvite = () => {
          createEnergyInvite(user);
        };
        card.addEventListener("click", handleInvite);
        card.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleInvite();
          }
        });
      }

      card.append(name, status);
      orgsEnergyListEl.appendChild(card);
    });
  };

  const selectOrganization = (orgName) => {
    if (!orgName) {
      return;
    }
    resetEnergyInvite();
    const org = orgsState.organizations.find(
      (item) => getOrgDisplayName(item) === orgName
    );
    if (!org) {
      return;
    }

    selectedOrgName = orgName;
    if (orgsDetailsNameEl) {
      orgsDetailsNameEl.textContent = orgName;
    }
    if (orgsDetailsLaunchEl) {
      const launchDateRaw = String(
        org?.launch_date ?? org?.launchDate ?? ""
      ).trim();
      const launchDate = parseLaunchDate(launchDateRaw);
      const duration = formatWorkDuration(launchDate);
      const suffix = duration ? ` (${duration})` : "";
      orgsDetailsLaunchEl.textContent = launchDateRaw
        ? `Дата запуска: ${launchDateRaw}${suffix}`
        : "Дата запуска: —";
    }

    const orgNames = getOrgNames(org);
    const orgUsers = orgsState.users.filter((user) => {
      const name = String(user?.organization ?? "").trim();
      return orgNames.includes(name) || name === orgName;
    });
    if (orgsDetailUsersEl) {
      orgsDetailUsersEl.textContent = formatUserCount(orgUsers.length);
    }
    if (orgsDetailToolsTotalEl) {
      orgsDetailToolsTotalEl.textContent = "—";
    }
    if (orgsDetailToolsActiveEl) {
      orgsDetailToolsActiveEl.textContent = "—";
    }
    const energyUsers = orgUsers.filter(
      (user) => String(user?.role ?? "").trim() === "Энергетик"
    );
    renderEnergyList(energyUsers);

    if (orgsListEl) {
      orgsListEl.querySelectorAll(".orgs-row").forEach((row) => {
        row.classList.toggle("is-active", row.dataset.orgName === orgName);
      });
    }

    if (orgsDetailsModalEl) {
      orgsDetailsModalEl.classList.remove("is-hidden");
      document.body.style.overflow = "hidden";
    }
  };

  const renderOrganizationsList = async () => {
    if (!orgsListEl) return;
    orgsListEl.innerHTML = "";
    if (orgsEmptyEl) {
      orgsEmptyEl.textContent =
        "Пока нет организаций. Добавьте первую организацию через кнопку «Добавить организацию».";
    }
    try {
      const { organizations, users } = await loadOrgsAndUsers();
      const counts = buildUserCountsMap(users);
      if (orgsEmptyEl) {
        orgsEmptyEl.classList.toggle("is-hidden", organizations.length > 0);
      }
      if (organizations.length === 0) {
        selectedOrgName = "";
      }
      organizations.forEach((org) => {
        const safeName = getOrgDisplayName(org);
        const count = getOrgUserCount(org, counts);

        const row = document.createElement("div");
        row.className = "orgs-row";
        row.dataset.orgName = safeName;

        const button = document.createElement("button");
        button.className = "orgs-row__button";
        button.type = "button";

        const main = document.createElement("div");
        main.className = "orgs-row__main";

        const title = document.createElement("div");
        title.className = "orgs-row__name";
        title.textContent = safeName;

        const meta = document.createElement("div");
        meta.className = "orgs-row__meta";

        const usersItem = document.createElement("div");
        usersItem.className = "orgs-row__meta-item";
        const usersLabel = document.createElement("span");
        usersLabel.className = "orgs-row__meta-label";
        usersLabel.textContent = `Пользователей ${count}`;
        usersItem.append(usersLabel);

        const toolsItem = document.createElement("div");
        toolsItem.className = "orgs-row__meta-item";
        const toolsLabel = document.createElement("span");
        toolsLabel.className = "orgs-row__meta-label";
        toolsLabel.textContent = "Единиц МТЦ";
        const toolsValue = document.createElement("span");
        toolsValue.className = "orgs-row__meta-value";
        toolsValue.textContent = "—";
        toolsItem.append(toolsLabel, toolsValue);

        meta.append(usersItem, toolsItem);
        main.append(title, meta);

        const chevron = document.createElement("span");
        chevron.className = "orgs-row__chevron";
        chevron.setAttribute("aria-hidden", "true");
        chevron.textContent = "›";

        button.append(main, chevron);
        row.append(button);
        orgsListEl.appendChild(row);

        button.addEventListener("click", () => {
          selectOrganization(safeName);
        });
      });
    } catch (error) {
      console.error(error);
      if (orgsEmptyEl) {
        orgsEmptyEl.classList.remove("is-hidden");
        orgsEmptyEl.textContent =
          "Не удалось загрузить список организаций. Попробуйте позже.";
      }
    }
  };

  const renderUsersOrganizationsList = async () => {
    if (!usersOrgsListEl) return;
    usersOrgsListEl.innerHTML = "";
    if (usersOrgsEmptyEl) {
      usersOrgsEmptyEl.textContent =
        "Пока нет организаций. Добавьте первую организацию через кнопку «Добавить организацию».";
    }
    try {
      const { organizations, users } = await loadOrgsAndUsers();
      const counts = buildUserCountsMap(users);
      if (usersOrgsEmptyEl) {
        usersOrgsEmptyEl.classList.toggle("is-hidden", organizations.length > 0);
      }
      if (organizations.length === 0) {
        selectedUsersOrgName = "";
      }
      organizations.forEach((org) => {
        const safeName = getOrgDisplayName(org);
        const count = getOrgUserCount(org, counts);

        const row = document.createElement("div");
        row.className = "users-orgs__row";
        row.dataset.orgName = safeName;

        const button = document.createElement("button");
        button.className = "users-orgs__button";
        button.type = "button";

        const name = document.createElement("div");
        name.className = "users-orgs__name";
        name.textContent = safeName;

        const countLabel = document.createElement("div");
        countLabel.className = "users-orgs__count";
        countLabel.textContent = formatUserCount(count);

        button.append(name, countLabel);
        row.append(button);
        usersOrgsListEl.appendChild(row);

        button.addEventListener("click", () => {
          selectUsersOrganization(safeName);
        });
      });
    } catch (error) {
      console.error(error);
      if (usersOrgsEmptyEl) {
        usersOrgsEmptyEl.classList.remove("is-hidden");
        usersOrgsEmptyEl.textContent =
          "Не удалось загрузить список организаций. Попробуйте позже.";
      }
    }
  };

  const renderUsersDetails = (orgUsers) => {
    if (!usersDetailsListEl) return;
    usersDetailsListEl.innerHTML = "";
    if (usersDetailsEmptyEl) {
      usersDetailsEmptyEl.classList.toggle("is-hidden", orgUsers.length > 0);
    }
    orgUsers.forEach((user) => {
      const card = document.createElement("div");
      card.className = "users-details__card";

      const initials = document.createElement("div");
      initials.className = "users-details__initials";
      initials.textContent = getInitials(String(user?.full_name ?? "").trim());

      const info = document.createElement("div");
      info.className = "users-details__info";

      const name = document.createElement("div");
      name.className = "users-details__name";
      name.textContent = formatFullName(String(user?.full_name ?? "").trim());

      const meta = document.createElement("div");
      meta.className = "users-details__meta";
      const roleTag = document.createElement("span");
      roleTag.className = "users-details__tag";
      const roleName = String(user?.role ?? "роль").trim();
      roleTag.textContent = roleName;

      const telegramStatus = document.createElement("span");
      telegramStatus.className = "users-details__status";
      const hasTelegramId = Boolean(normalizeTelegramId(user?.telegram_id));
      const canInvite = roleName === responsibleRole && !hasTelegramId;
      telegramStatus.textContent = hasTelegramId
        ? "ID привязан"
        : canInvite
          ? "ID не привязан · нажмите, чтобы пригласить"
          : "ID не привязан";
      telegramStatus.classList.toggle("is-linked", hasTelegramId);
      meta.append(roleTag, telegramStatus);

      info.append(name, meta);
      card.append(initials, info);
      if (canInvite) {
        card.classList.add("is-actionable");
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute(
          "aria-label",
          `Пригласить ответственного ${name.textContent}`
        );
        const handleInvite = () => {
          createResponsibleInvite(user);
        };
        card.addEventListener("click", handleInvite);
        card.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleInvite();
          }
        });
      }
      usersDetailsListEl.appendChild(card);
    });
  };

  const selectUsersOrganization = (orgName) => {
    if (!orgName) return;
    resetUsersInvite();
    selectedUsersOrgName = orgName;
    if (usersDetailsNameEl) {
      usersDetailsNameEl.textContent = orgName;
    }

    const org = orgsState.organizations.find(
      (item) => getOrgDisplayName(item) === orgName
    );
    const orgNames = org ? getOrgNames(org) : [orgName];
    const orgUsers = orgsState.users.filter((user) => {
      const name = String(user?.organization ?? "").trim();
      return orgNames.includes(name) || name === orgName;
    });

    if (usersDetailsCountEl) {
      usersDetailsCountEl.textContent = formatUserCount(orgUsers.length);
    }

    renderUsersDetails(orgUsers);

    if (usersOrgsListEl) {
      usersOrgsListEl.querySelectorAll(".users-orgs__row").forEach((row) => {
        row.classList.toggle("is-active", row.dataset.orgName === orgName);
      });
    }

    if (usersDetailsModalEl) {
      usersDetailsModalEl.classList.remove("is-hidden");
      document.body.style.overflow = "hidden";
    }
  };

  const updateUsersDetailsView = () => {
    if (!selectedUsersOrgName) return;
    const org = orgsState.organizations.find(
      (item) => getOrgDisplayName(item) === selectedUsersOrgName
    );
    const orgNames = org ? getOrgNames(org) : [selectedUsersOrgName];
    const orgUsers = orgsState.users.filter((user) => {
      const name = String(user?.organization ?? "").trim();
      return orgNames.includes(name) || name === selectedUsersOrgName;
    });

    if (usersDetailsCountEl) {
      usersDetailsCountEl.textContent = formatUserCount(orgUsers.length);
    }

    renderUsersDetails(orgUsers);
  };

  const openUsersAddModal = async () => {
    if (!usersAddModalEl || !selectedUsersOrgName) return;
    const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
    orgsState.users = Array.isArray(usersData?.users) ? usersData.users : [];
    updateUsersNameSuggestions(orgsState.users);
    if (usersAddOrgNameEl) {
      usersAddOrgNameEl.textContent = selectedUsersOrgName;
    }
    resetUsersAddForm();
    usersAddModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const closeUsersAddModal = () => {
    if (!usersAddModalEl) return;
    usersAddModalEl.classList.add("is-hidden");
    resetUsersAddForm();
    if (usersDetailsModalEl && !usersDetailsModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else if (usersModalEl && !usersModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const openUsersModal = async () => {
    if (!usersModalEl) return;
    await renderUsersOrganizationsList();
    usersModalEl.classList.remove("is-hidden");
    if (usersDetailsModalEl) {
      usersDetailsModalEl.classList.add("is-hidden");
    }
    if (usersAddModalEl) {
      usersAddModalEl.classList.add("is-hidden");
    }
    resetUsersInvite();
    document.body.style.overflow = "hidden";
  };

  const closeUsersModal = () => {
    if (!usersModalEl) return;
    usersModalEl.classList.add("is-hidden");
    if (usersDetailsModalEl) {
      usersDetailsModalEl.classList.add("is-hidden");
    }
    if (usersAddModalEl) {
      usersAddModalEl.classList.add("is-hidden");
    }
    resetUsersInvite();
    document.body.style.overflow = "";
  };

  const closeUsersDetailsModal = () => {
    if (!usersDetailsModalEl) return;
    usersDetailsModalEl.classList.add("is-hidden");
    if (usersAddModalEl) {
      usersAddModalEl.classList.add("is-hidden");
    }
    resetUsersInvite();
    if (usersModalEl && !usersModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const openOrgsModal = async () => {
    if (!orgsModalEl) return;
    await renderOrganizationsList();
    orgsModalEl.classList.remove("is-hidden");
    if (orgsDetailsModalEl) {
      orgsDetailsModalEl.classList.add("is-hidden");
    }
    document.body.style.overflow = "hidden";
  };

  const closeOrgsModal = () => {
    if (!orgsModalEl) return;
    orgsModalEl.classList.add("is-hidden");
    if (orgsDetailsModalEl) {
      orgsDetailsModalEl.classList.add("is-hidden");
    }
    resetEnergyInvite();
    document.body.style.overflow = "";
  };

  const closeOrgsDetailsModal = () => {
    if (!orgsDetailsModalEl) return;
    orgsDetailsModalEl.classList.add("is-hidden");
    resetEnergyInvite();
    if (orgsModalEl && !orgsModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  openAddOrgButton?.addEventListener("click", showForm);
  backButton?.addEventListener("click", showDashboard);
  openOrgsButtons.forEach((button) => {
    button.addEventListener("click", openOrgsModal);
  });
  openUsersButtons.forEach((button) => {
    button.addEventListener("click", openUsersModal);
  });
  orgsBackdropEl?.addEventListener("click", closeOrgsModal);
  orgsCloseButton?.addEventListener("click", closeOrgsModal);
  orgsDetailsBackdropEl?.addEventListener("click", closeOrgsDetailsModal);
  orgsDetailsCloseButton?.addEventListener("click", closeOrgsDetailsModal);
  usersBackdropEl?.addEventListener("click", closeUsersModal);
  usersCloseButton?.addEventListener("click", closeUsersModal);
  usersDetailsBackdropEl?.addEventListener("click", closeUsersDetailsModal);
  usersDetailsCloseButton?.addEventListener("click", closeUsersDetailsModal);
  usersAddButton?.addEventListener("click", openUsersAddModal);
  usersAddBackdropEl?.addEventListener("click", closeUsersAddModal);
  usersAddCloseButton?.addEventListener("click", closeUsersAddModal);
  usersAddCancelButton?.addEventListener("click", closeUsersAddModal);
  if (shareTelegramButton) shareTelegramButton.disabled = true;
  shareTelegramButton?.addEventListener("click", () => {
    const link = registrationLinkEl?.value?.trim();
    if (!link) return;
    const shareText =
      registrationBox?.dataset.shareText ??
      "Контакт энергетика. Отправляю ссылку для регистрации.";
    const telegramShareUrl = new URL("https://t.me/share/url");
    telegramShareUrl.searchParams.set("url", link);
    telegramShareUrl.searchParams.set("text", shareText);
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(telegramShareUrl.href);
    } else {
      window.open(telegramShareUrl.href, "_blank", "noopener");
    }
  });
  openTelegramButton?.addEventListener("click", () => {
    const webLink = registrationBox?.dataset.telegramLink?.trim();
    const appLink = registrationBox?.dataset.telegramAppLink?.trim();
    if (!webLink && !appLink) return;
    if (window.Telegram?.WebApp?.openTelegramLink && webLink) {
      window.Telegram.WebApp.openTelegramLink(webLink);
    } else {
      window.location.href = appLink || webLink;
    }
  });
  copyRegistrationButton?.addEventListener("click", async () => {
    if (!registrationLinkEl?.value) return;
    try {
      await navigator.clipboard.writeText(registrationLinkEl.value);
      if (messageEl) messageEl.textContent = "Ссылка скопирована в буфер.";
    } catch (error) {
      registrationLinkEl.select();
      document.execCommand("copy");
      if (messageEl) messageEl.textContent = "Ссылка выделена для копирования.";
    }
  });
  if (energyInviteShareButton) energyInviteShareButton.disabled = true;
  if (energyInviteCopyButton) energyInviteCopyButton.disabled = true;
  if (energyInviteOpenButton) energyInviteOpenButton.disabled = true;
  energyInviteShareButton?.addEventListener("click", () => {
    const link = energyInviteLinkEl?.value?.trim();
    if (!link) return;
    const shareText =
      energyInviteBox?.dataset.shareText ??
      "Контакт энергетика. Отправляю ссылку для регистрации.";
    const telegramShareUrl = new URL("https://t.me/share/url");
    telegramShareUrl.searchParams.set("url", link);
    telegramShareUrl.searchParams.set("text", shareText);
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(telegramShareUrl.href);
    } else {
      window.open(telegramShareUrl.href, "_blank", "noopener");
    }
  });
  energyInviteOpenButton?.addEventListener("click", () => {
    const webLink = energyInviteBox?.dataset.telegramLink?.trim();
    const appLink = energyInviteBox?.dataset.telegramAppLink?.trim();
    if (!webLink && !appLink) return;
    if (window.Telegram?.WebApp?.openTelegramLink && webLink) {
      window.Telegram.WebApp.openTelegramLink(webLink);
    } else {
      window.location.href = appLink || webLink;
    }
  });
  energyInviteCopyButton?.addEventListener("click", async () => {
    if (!energyInviteLinkEl?.value) return;
    try {
      await navigator.clipboard.writeText(energyInviteLinkEl.value);
      if (energyInviteNoteEl) {
        energyInviteNoteEl.textContent = "Ссылка скопирована в буфер.";
      }
    } catch (error) {
      energyInviteLinkEl.select();
      document.execCommand("copy");
      if (energyInviteNoteEl) {
        energyInviteNoteEl.textContent = "Ссылка выделена для копирования.";
      }
    }
  });
  if (usersInviteShareButton) usersInviteShareButton.disabled = true;
  if (usersInviteCopyButton) usersInviteCopyButton.disabled = true;
  if (usersInviteOpenButton) usersInviteOpenButton.disabled = true;
  usersInviteShareButton?.addEventListener("click", () => {
    const link = usersInviteLinkEl?.value?.trim();
    if (!link) return;
    const shareText =
      usersInviteBox?.dataset.shareText ??
      "Контакт ответственного. Отправляю ссылку для регистрации.";
    const telegramShareUrl = new URL("https://t.me/share/url");
    telegramShareUrl.searchParams.set("url", link);
    telegramShareUrl.searchParams.set("text", shareText);
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(telegramShareUrl.href);
    } else {
      window.open(telegramShareUrl.href, "_blank", "noopener");
    }
  });
  usersInviteOpenButton?.addEventListener("click", () => {
    const webLink = usersInviteBox?.dataset.telegramLink?.trim();
    const appLink = usersInviteBox?.dataset.telegramAppLink?.trim();
    if (!webLink && !appLink) return;
    if (window.Telegram?.WebApp?.openTelegramLink && webLink) {
      window.Telegram.WebApp.openTelegramLink(webLink);
    } else {
      window.location.href = appLink || webLink;
    }
  });
  usersInviteCopyButton?.addEventListener("click", async () => {
    if (!usersInviteLinkEl?.value) return;
    try {
      await navigator.clipboard.writeText(usersInviteLinkEl.value);
      if (usersInviteNoteEl) {
        usersInviteNoteEl.textContent = "Ссылка скопирована в буфер.";
      }
    } catch (error) {
      usersInviteLinkEl.select();
      document.execCommand("copy");
      if (usersInviteNoteEl) {
        usersInviteNoteEl.textContent = "Ссылка выделена для копирования.";
      }
    }
  });

  if (usersAddInviteShareButton) usersAddInviteShareButton.disabled = true;
  if (usersAddInviteCopyButton) usersAddInviteCopyButton.disabled = true;
  if (usersAddInviteOpenButton) usersAddInviteOpenButton.disabled = true;
  usersAddInviteShareButton?.addEventListener("click", () => {
    const link = usersAddInviteLinkEl?.value?.trim();
    if (!link) return;
    const shareText =
      usersAddInviteBox?.dataset.shareText ??
      "Контакт пользователя. Отправляю ссылку для регистрации.";
    const telegramShareUrl = new URL("https://t.me/share/url");
    telegramShareUrl.searchParams.set("url", link);
    telegramShareUrl.searchParams.set("text", shareText);
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(telegramShareUrl.href);
    } else {
      window.open(telegramShareUrl.href, "_blank", "noopener");
    }
  });
  usersAddInviteOpenButton?.addEventListener("click", () => {
    const webLink = usersAddInviteBox?.dataset.telegramLink?.trim();
    const appLink = usersAddInviteBox?.dataset.telegramAppLink?.trim();
    if (!webLink && !appLink) return;
    if (window.Telegram?.WebApp?.openTelegramLink && webLink) {
      window.Telegram.WebApp.openTelegramLink(webLink);
    } else {
      window.location.href = appLink || webLink;
    }
  });
  usersAddInviteCopyButton?.addEventListener("click", async () => {
    if (!usersAddInviteLinkEl?.value) return;
    try {
      await navigator.clipboard.writeText(usersAddInviteLinkEl.value);
      if (usersAddInviteNoteEl) {
        usersAddInviteNoteEl.textContent = "Ссылка скопирована в буфер.";
      }
    } catch (error) {
      usersAddInviteLinkEl.select();
      document.execCommand("copy");
      if (usersAddInviteNoteEl) {
        usersAddInviteNoteEl.textContent = "Ссылка выделена для копирования.";
      }
    }
  });

  usersAddFormEl?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (usersAddMessageEl) {
      usersAddMessageEl.textContent = "Сохраняем данные...";
    }
    const formData = new FormData(usersAddFormEl);
    const lastName = String(formData.get("users-add-last-name") ?? "").trim();
    const firstName = String(formData.get("users-add-first-name") ?? "").trim();
    const middleName = String(formData.get("users-add-middle-name") ?? "").trim();
    const roleName = String(formData.get("users-add-role") ?? "").trim();
    const organizationName = String(selectedUsersOrgName ?? "").trim();

    if (!organizationName) {
      if (usersAddMessageEl) {
        usersAddMessageEl.textContent = "Сначала выберите организацию.";
      }
      return;
    }

    if (!lastName || !firstName || !middleName || !roleName) {
      if (usersAddMessageEl) {
        usersAddMessageEl.textContent = "Заполните все поля.";
      }
      return;
    }

    try {
      const [usersData, registrationsData] = await Promise.all([
        loadJson(usersFilePath),
        loadRegistrations(),
      ]);

      const fullName = `${lastName} ${firstName} ${middleName}`.trim();
      const nextUsersData = {
        users: [...(usersData.users ?? [])],
      };
      const existingUser = nextUsersData.users.find(
        (item) =>
          item.full_name === fullName &&
          item.organization === organizationName &&
          item.role === roleName
      );

      if (!existingUser) {
        nextUsersData.users.push({
          telegram_id: 0,
          full_name: fullName,
          organization: organizationName,
          role: roleName,
        });
      }

      const registrations = registrationsData.registrations ?? [];
      const existingRegistration = registrations.find(
        (item) =>
          item.user?.full_name === fullName &&
          item.user?.organization === organizationName &&
          item.user?.role === roleName
      );
      const registrationToken =
        existingRegistration?.token ?? createRegistrationToken();

      const nextRegistrationsData = existingRegistration
        ? { registrations }
        : {
            registrations: [
              ...registrations,
              {
                token: registrationToken,
                created_at: new Date().toISOString(),
                user: {
                  full_name: fullName,
                  organization: organizationName,
                  role: roleName,
                },
              },
            ],
          };

      await saveEntries([
        { path: usersFilePath, data: nextUsersData },
        { path: pendingRegistrationsFilePath, data: nextRegistrationsData },
      ]);

      orgsState.users = nextUsersData.users;
      updateUsersDetailsView();
      await renderUsersOrganizationsList();

      const registrationLink = new URL(
        `${window.location.origin}${window.location.pathname}`
      );
      registrationLink.searchParams.set("registration", registrationToken);
      const botUsername = await resolveBotUsername();
      const telegramLinks = buildTelegramRegistrationLinks(
        botUsername,
        registrationToken
      );
      const fallbackLink = telegramLinks?.webLink ?? registrationLink.href;

      if (usersAddMessageEl) {
        usersAddMessageEl.textContent = "Ссылка приглашения готова.";
      }
      if (usersAddInviteHintEl) {
        usersAddInviteHintEl.textContent = "Ссылка для приглашения готова.";
      }
      if (usersAddInviteLinkEl) {
        usersAddInviteLinkEl.value = fallbackLink;
      }
      if (usersAddInviteNoteEl) {
        usersAddInviteNoteEl.textContent = telegramLinks?.webLink
          ? "При открытии в Telegram ID сохранится автоматически."
          : "Бот ещё не указан. Скопируйте ссылку и отправьте её вручную.";
      }
      if (usersAddInviteBox) {
        usersAddInviteBox.dataset.shareText = `Контакт пользователя: ${fullName}. Роль: ${roleName}. Организация: ${organizationName}.`;
        usersAddInviteBox.dataset.telegramLink = fallbackLink;
        if (telegramLinks?.appLink) {
          usersAddInviteBox.dataset.telegramAppLink = telegramLinks.appLink;
        } else {
          delete usersAddInviteBox.dataset.telegramAppLink;
        }
        usersAddInviteBox.classList.remove("is-hidden");
      }
      if (usersAddInviteShareButton) {
        usersAddInviteShareButton.disabled = !usersAddInviteLinkEl?.value;
      }
      if (usersAddInviteCopyButton) {
        usersAddInviteCopyButton.disabled = !usersAddInviteLinkEl?.value;
      }
      if (usersAddInviteOpenButton) {
        usersAddInviteOpenButton.disabled = !usersAddInviteLinkEl?.value;
        usersAddInviteOpenButton.textContent = telegramLinks?.webLink
          ? "Открыть в Telegram"
          : "Открыть ссылку";
      }
      updateUsersNameSuggestions(nextUsersData.users);
    } catch (error) {
      console.error(error);
      if (usersAddMessageEl) {
        usersAddMessageEl.textContent =
          "Не удалось сохранить данные. Попробуйте позже.";
      }
    }
  });

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (messageEl) messageEl.textContent = "Сохраняем данные...";

    const formData = new FormData(formEl);
    const fullName = String(formData.get("org-full-name") ?? "").trim();
    const shortName = String(formData.get("org-short-name") ?? "").trim();
    const numberType = String(formData.get("org-number-type") ?? "").trim();
    const lastName = String(formData.get("energy-last-name") ?? "").trim();
    const firstName = String(formData.get("energy-first-name") ?? "").trim();
    const middleName = String(formData.get("energy-middle-name") ?? "").trim();

    if (
      !fullName ||
      !shortName ||
      !numberType ||
      !lastName ||
      !firstName ||
      !middleName
    ) {
      if (messageEl) messageEl.textContent = "Заполните все поля.";
      return;
    }

    try {
      const [orgData, usersData, registrationsData] = await Promise.all([
        loadJson(orgFilePath),
        loadJson(usersFilePath),
        loadRegistrations(),
      ]);

      const energyFullName = `${lastName} ${firstName} ${middleName}`;
      const nextOrgData = {
        organizations: [
          ...(orgData.organizations ?? []),
          {
            full_name: fullName,
            short_name: shortName,
            number_type: numberType,
            launch_date: getToday(),
          },
        ],
      };

      const nextUsersData = {
        users: [
          ...(usersData.users ?? []),
          {
            telegram_id: 0,
            full_name: energyFullName,
            organization: fullName,
            role: "Энергетик",
          },
        ],
      };

      const registrationToken = createRegistrationToken();
      const registrationLink = new URL(
        `${window.location.origin}${window.location.pathname}`
      );
      registrationLink.searchParams.set("registration", registrationToken);
      const botUsername = await resolveBotUsername();
      const telegramLinks = buildTelegramRegistrationLinks(
        botUsername,
        registrationToken
      );

      const nextRegistrationsData = {
        registrations: [
          ...(registrationsData.registrations ?? []),
          {
            token: registrationToken,
            created_at: new Date().toISOString(),
            user: {
              full_name: energyFullName,
              organization: fullName,
              role: "Энергетик",
            },
          },
        ],
      };

      await saveEntries([
        { path: orgFilePath, data: nextOrgData },
        { path: usersFilePath, data: nextUsersData },
        { path: pendingRegistrationsFilePath, data: nextRegistrationsData },
      ]);

      formEl.reset();
      if (messageEl) {
        messageEl.textContent = telegramLinks?.webLink
          ? "Организация добавлена. Ссылка готова — откройте её в Telegram, чтобы ID записался автоматически."
          : "Организация добавлена. Бот не указан — используйте копирование ссылки.";
      }
      if (registrationLinkEl) {
        registrationLinkEl.value = telegramLinks?.webLink ?? registrationLink.href;
      }
      if (registrationBox) {
        registrationBox.dataset.shareText = `Контакт энергетика: ${energyFullName}. Организация: ${fullName}.`;
        const fallbackLink = telegramLinks?.webLink ?? registrationLink.href;
        registrationBox.dataset.telegramLink = fallbackLink;
        if (telegramLinks?.appLink) {
          registrationBox.dataset.telegramAppLink = telegramLinks.appLink;
        }
        registrationBox.classList.remove("is-hidden");
      }
      if (shareTelegramButton) {
        shareTelegramButton.disabled = !registrationLinkEl?.value;
      }
      if (copyRegistrationButton) {
        copyRegistrationButton.disabled = !registrationLinkEl?.value;
      }
      if (openTelegramButton) {
        openTelegramButton.disabled = !registrationLinkEl?.value;
        openTelegramButton.textContent = telegramLinks?.webLink
          ? "Открыть в Telegram"
          : "Открыть ссылку";
      }
      if (telegramNoteEl) {
        telegramNoteEl.textContent = telegramLinks?.webLink
          ? "При открытии в Telegram ID сохранится автоматически и энергетик сразу увидит свою страницу."
          : "Бот ещё не указан. Скопируйте ссылку и отправьте её вручную.";
      }
      await updateStats();
    } catch (error) {
      console.error(error);
      if (messageEl) {
        messageEl.textContent = "Не удалось сохранить данные. Проверьте сервер.";
      }
    }
  });

  resetEnergyInvite();
  resetUsersInvite();
  updateStats();
}

async function renderUserRoleView() {
  if (!currentUser) return;
  const renderRole = roleMap.get(currentUser.role);
  if (!renderRole) return;
  const isEnergyDashboardRole = energyDashboardRoles.has(currentUser.role);

  const userName = formatShortName(currentUser.full_name);
  if (!currentUserLabel) {
    currentUserLabel = `Вы вошли как <strong>${userName}</strong>`;
  }

  contentEl.innerHTML = renderRole(currentUserLabel);
  if (userNameEl) userNameEl.textContent = userName;
  if (userOrgEl) userOrgEl.textContent = currentUser.organization ?? "Организация";
  if (userInitialsEl) {
    userInitialsEl.textContent = getInitials(currentUser.full_name ?? "");
  }
  if (appUserEl) {
    appUserEl.classList.add("is-hidden");
  }
  if (settingsBackButtonEl) {
    settingsBackButtonEl.classList.add("is-hidden");
  }
  if (superAdminStatEl) {
    superAdminStatEl.classList.toggle("is-hidden", currentUser.role !== superAdminRole);
  }
  if (energyPendingStatEl) {
    energyPendingStatEl.classList.toggle("is-hidden", !isEnergyDashboardRole);
  }
  document.body?.classList.toggle(
    "is-energy-role",
    isEnergyDashboardRole
  );
  if (currentUser.role === superAdminRole) {
    setupSuperAdmin();
  }
  if (isEnergyDashboardRole) {
    await setupEnergyDashboard(currentUser, currentPreferences, currentSettingsContext);
  }
}

async function showUserSettings() {
  if (!currentUser) return;
  if (!currentSettingsContext) {
    currentSettingsContext = await resolveUserSettingsContext(currentUser);
  }
  const savedPreferences =
    currentSettingsContext.settingsData.users?.[currentSettingsContext.userKey]
      ?.preferences ?? {};
  currentPreferences = normalizePreferences({
    ...currentPreferences,
    ...savedPreferences,
  });
  applyUserPreferences(currentPreferences);

  const userName = formatShortName(currentUser.full_name);
  if (userNameEl) userNameEl.textContent = userName;
  if (userOrgEl) userOrgEl.textContent = currentUser.organization ?? "Организация";
  if (userInitialsEl) {
    userInitialsEl.textContent = getInitials(currentUser.full_name ?? "");
  }
  if (appUserEl) {
    appUserEl.classList.remove("is-hidden");
  }
  if (energyPendingStatEl) {
    energyPendingStatEl.classList.add("is-hidden");
  }
  if (settingsBackButtonEl) {
    settingsBackButtonEl.classList.remove("is-hidden");
  }
  contentEl.innerHTML = renderUserSettingsView(currentUser, currentPreferences);

  const backButton = contentEl.querySelector("[data-settings-back]");
  const formEl = contentEl.querySelector("[data-settings-form]");
  const messageEl = contentEl.querySelector("[data-settings-message]");
  const groupingButton = contentEl.querySelector("[data-settings-grouping]");
  const groupingInput = formEl?.querySelector("[name='grouping']");
  let messageTimer = null;

  const updateMessage = (text) => {
    if (!messageEl) return;
    messageEl.textContent = text;
    if (messageTimer) window.clearTimeout(messageTimer);
    messageTimer = window.setTimeout(() => {
      messageEl.textContent = "";
    }, 2000);
  };

  const handleFormChange = async () => {
    if (!formEl) return;
    const formData = new FormData(formEl);
    const nextPreferences = normalizePreferences({
      iconStyle: formData.get("icon-style"),
      grouping: formData.get("grouping"),
      theme: formData.get("theme"),
    });
    currentPreferences = applyUserPreferences(nextPreferences);
    currentPreferences = await saveUserPreferences(
      currentSettingsContext,
      currentPreferences
    );
    updateMessage("Сохранено");
  };

  const handleBack = () => {
    renderUserRoleView();
  };

  const handleGroupingClick = async () => {
    if (groupingInput) {
      groupingInput.value = "free";
    }
    pendingGroupingStart = true;
    await handleFormChange();
    renderUserRoleView();
  };

  if (settingsBackButtonEl) {
    settingsBackButtonEl.onclick = handleBack;
  }
  if (backButton) {
    backButton.onclick = handleBack;
  }
  if (groupingButton) {
    groupingButton.onclick = handleGroupingClick;
  }
  formEl?.addEventListener("change", handleFormChange);
}

function buildAuthorizedLabel(user) {
  const fullName = user.full_name?.trim() || "Пользователь";
  const roleTitle = user.role ?? "роль";
  return `Вы авторизованы в базе как <strong>${fullName}</strong> (${roleTitle}).`;
}

async function applyRegistrationToken(telegramId, token) {
  const registrationsData = await loadRegistrations();
  const registrations = registrationsData.registrations ?? [];
  const registration = registrations.find((item) => item.token === token);

  if (!registration) {
    return null;
  }

  const usersData = await loadJson(usersFilePath);
  const telegramIdKey = normalizeTelegramId(telegramId);
  const existingUser = usersData.users?.find(
    (item) => normalizeTelegramId(item.telegram_id) === telegramIdKey
  );

  let resolvedUser = existingUser;
  if (!resolvedUser) {
    resolvedUser = usersData.users?.find(
      (item) =>
        item.telegram_id === 0 &&
        item.full_name === registration.user?.full_name &&
        item.organization === registration.user?.organization &&
        item.role === registration.user?.role
    );
  }

  if (!resolvedUser) {
    resolvedUser = {
      telegram_id: telegramId,
      full_name: registration.user?.full_name ?? "Пользователь",
      organization: registration.user?.organization ?? "Организация",
      role: registration.user?.role ?? "Энергетик",
    };
    usersData.users = [...(usersData.users ?? []), resolvedUser];
  } else {
    resolvedUser.telegram_id = telegramId;
  }

  const nextRegistrationsData = {
    registrations: registrations.filter((item) => item.token !== token),
  };

  await saveEntries([
    { path: usersFilePath, data: usersData },
    { path: pendingRegistrationsFilePath, data: nextRegistrationsData },
  ]);

  return resolvedUser;
}

async function loadUser() {
  const initialContext = collectTelegramContext();
  void appendAuthLog("init", initialContext);

  const telegramId = await waitForTelegramId({ timeoutMs: 20000, intervalMs: 250 });
  if (!telegramId) {
    renderError("Telegram ID не получен. Откройте приложение из Telegram.");
    if (userNameEl) userNameEl.textContent = "Гость";
    if (userOrgEl) userOrgEl.textContent = "Откройте приложение из Telegram";
    if (userInitialsEl) userInitialsEl.textContent = "??";
    void appendAuthLog("telegram_id_missing", collectTelegramContext());
    return;
  }

  try {
    const registrationToken = getRegistrationToken();
    let user = null;
    let userLabel = "";
    const telegramIdKey = normalizeTelegramId(telegramId);
    void appendAuthLog("telegram_id_resolved", { telegramId: telegramIdKey });

    if (registrationToken) {
      user = await applyRegistrationToken(telegramId, registrationToken);
      if (user) {
        userLabel = buildAuthorizedLabel(user);
      }
    }

    if (!user) {
      const data = await loadJson(usersFilePath);
      user = data.users?.find(
        (item) => normalizeTelegramId(item.telegram_id) === telegramIdKey
      );
      userLabel = `Вы вошли как <strong>${formatShortName(
        user?.full_name ?? ""
      )}</strong>`;
    }

    if (!user) {
      renderError("Пользователь с таким ID не найден в базе.");
      if (userNameEl) userNameEl.textContent = "Гость";
      if (userOrgEl) userOrgEl.textContent = "Нет доступа к организации";
      void appendAuthLog("user_not_found", {
        telegramId: telegramIdKey,
        registrationToken: registrationToken ?? null,
      });
      return;
    }

    const renderRole = roleMap.get(user.role);
    if (!renderRole) {
      renderError("Для вашей роли ещё не создана страница.");
      if (userNameEl) userNameEl.textContent = formatShortName(user.full_name);
      if (userOrgEl) userOrgEl.textContent = user.organization ?? "Организация";
      void appendAuthLog("role_missing", {
        telegramId: telegramIdKey,
        role: user.role ?? null,
      });
      return;
    }

    currentUser = user;
    currentUserLabel = userLabel;
    currentSettingsContext = await resolveUserSettingsContext(user);
    const savedPreferences =
      currentSettingsContext.settingsData.users?.[currentSettingsContext.userKey]
        ?.preferences ?? {};
    currentPreferences = applyUserPreferences({
      ...defaultPreferences,
      ...savedPreferences,
    });

    await renderUserRoleView();
    void appendAuthLog("role_rendered", {
      telegramId: telegramIdKey,
      role: user.role ?? null,
    });
  } catch (error) {
    renderError("Возникла ошибка при загрузке данных.");
    if (userNameEl) userNameEl.textContent = "Гость";
    if (userOrgEl) userOrgEl.textContent = "Проверьте соединение";
    if (userInitialsEl) userInitialsEl.textContent = "??";
    console.error(error);
    void appendAuthLog("load_error", {
      message: error?.message ?? String(error),
    });
  }
}

if (window.Telegram?.WebApp) {
  Telegram.WebApp.ready();
  Telegram.WebApp.expand();
  Telegram.WebApp.setHeaderColor("#f5f7ff");
  Telegram.WebApp.setBackgroundColor("#f5f7ff");
  document.body?.classList.add("is-telegram");
}

userSettingsTriggerEl?.addEventListener("click", () => {
  showUserSettings();
});

loadUser();
