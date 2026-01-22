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
  { id: "awaitingReply", title: "Ожидают ответа", defaultDay: "Пн", defaultTime: "09:00" },
  { id: "repairs", title: "Ремонты", defaultDay: "Вт", defaultTime: "10:00" },
  { id: "noPhoto", title: "Без фото", defaultDay: "Ср", defaultTime: "11:00" },
  {
    id: "noAccountingNumber",
    title: "Без бух.номера",
    defaultDay: "Чт",
    defaultTime: "12:00",
  },
];
const energyWeekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
let currentUser = null;
let currentUserLabel = "";
let currentPreferences = { ...defaultPreferences };
let currentSettingsContext = null;
let pendingGroupingStart = false;

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
      day: option.defaultDay,
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

function normalizeDay(value, fallback) {
  const normalized = String(value ?? "").trim();
  if (energyWeekDays.includes(normalized)) {
    return normalized;
  }
  return fallback;
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
      day: normalizeDay(data.day, defaults.mailings[option.id].day),
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
      const dayOptions = energyWeekDays
        .map(
          (day) => `
            <option value="${day}" ${
              mailing.day === day ? "selected" : ""
            }>${day}</option>
          `
        )
        .join("");
      return `
        <div class="settings-table__row">
          <label class="settings-inline">
            <input
              type="checkbox"
              name="mailing-${option.id}-enabled"
              ${mailing.enabled ? "checked" : ""}
            />
            <span>${escapeHtml(option.title)}</span>
          </label>
          <select class="form-input" name="mailing-${option.id}-day">
            ${dayOptions}
          </select>
          <input
            class="form-input"
            type="time"
            name="mailing-${option.id}-time"
            value="${escapeHtml(mailing.time ?? "")}"
          />
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
        <div class="settings-accordion__hint">
          Настройте, какие рассылки активны, в какие дни и во сколько.
        </div>
        <div class="settings-table">
          <div class="settings-table__row settings-table__header">
            <div>Тип рассылки</div>
            <div>День</div>
            <div>Время</div>
          </div>
          ${mailingsMarkup}
        </div>
      </div>
    </div>
  `;
}

async function resolveUserSettingsContext(user) {
  const orgShortName = await resolveUserOrganizationShortName(user);
  const orgFolderName =
    sanitizeOrganizationFolderName(orgShortName) || "Организация";
  const settingsPath = `./${orgFolderName}/Настройки.json`;
  const userKey = buildUserKey(user);
  const settingsData = ensureSettingsData(
    await loadJson(settingsPath).catch(() => ({ users: {} }))
  );
  return {
    orgShortName,
    orgFolderName,
    settingsPath,
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

async function resolveUserOrganizationShortName(user) {
  const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
  const orgData = await loadJson(orgFilePath).catch(() => ({ organizations: [] }));
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

  const organizationName =
    matchedUser?.organization ?? user?.organization ?? "Организация";
  return pickOrganizationShortName(orgData, organizationName);
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

  const context = contextOverride || (await resolveUserSettingsContext(user));
  const settingsData = context.settingsData;
  const organizationSettings = getEnergyOrganizationSettings(settingsData);
  const accessList = organizationSettings.access?.[user.role];
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
        day: normalizeDay(
          formData.get(`mailing-${option.id}-day`),
          option.defaultDay
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

  updateStats();
}

async function renderUserRoleView() {
  if (!currentUser) return;
  const renderRole = roleMap.get(currentUser.role);
  if (!renderRole) return;

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
    energyPendingStatEl.classList.toggle("is-hidden", currentUser.role !== energyRole);
  }
  document.body?.classList.toggle(
    "is-energy-role",
    currentUser.role === energyRole
  );
  if (currentUser.role === superAdminRole) {
    setupSuperAdmin();
  }
  if (currentUser.role === energyRole) {
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
