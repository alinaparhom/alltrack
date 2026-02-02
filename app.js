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
const energyNotificationOptions = [
  { id: "newTool", title: "Новый инструмент" },
  { id: "moveTool", title: "Перемещение инструмента" },
  { id: "acceptTool", title: "Принятие инструмента" },
  { id: "declineTool", title: "Отказ от принятия" },
  { id: "moveByEnergy", title: "Перемещение энергетиком" },
  { id: "toolBreakdown", title: "Поломка инструмента" },
  { id: "fixBreakdown", title: "Устранение поломки" },
  { id: "sendToRepair", title: "Отправлен в ремонт" },
  { id: "repaired", title: "Отремонтирован" },
  { id: "writeOff", title: "Списание" },
  { id: "finesIssued", title: "Выставленные штрафы" },
];
const energyWeekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
let currentUser = null;
let currentUserLabel = "";
let currentPreferences = { ...defaultPreferences };
let currentSettingsContext = null;
let pendingGroupingStart = false;
const buildUploadUserMeta = ({ organizationName } = {}) => {
  if (!organizationName && !currentUser) return {};
  return {
    user: {
      telegram_id: currentUser?.telegram_id ?? null,
      full_name: currentUser?.full_name ?? currentUser?.fullName ?? "",
      role: currentUser?.role ?? "",
      organization: organizationName || currentUser?.organization || "",
    },
  };
};
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

function formatDateValue(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getFullYear()}`;
}

function normalizeCostValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
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

function normalizePersonName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

async function loadUserPendingMovesCount(orgFolderName, user) {
  if (!orgFolderName || !user) return 0;
  const userName = normalizePersonName(user.full_name ?? user.fullName ?? "");
  if (!userName) return 0;
  const movesPath = `./${orgFolderName}/Перемещения.json`;
  try {
    const rawMoves = await loadJson(movesPath);
    const moves = Array.isArray(rawMoves)
      ? rawMoves
      : Array.isArray(rawMoves?.moves)
        ? rawMoves.moves
        : [];
    return moves.reduce((count, move) => {
      const responseDate = String(move?.["Дата ответа"] ?? "").trim();
      if (responseDate) return count;
      const acceptedBy = normalizePersonName(move?.["Принял"] ?? "");
      if (!acceptedBy || acceptedBy !== userName) return count;
      return count + 1;
    }, 0);
  } catch (error) {
    console.warn("Не удалось загрузить перемещения для счётчика.", error);
  }
  return 0;
}

function getToolNumberVariants(value) {
  const raw = String(value ?? "").trim();
  const match = raw.match(/\d+/);
  if (!match) return [];
  const digits = match[0];
  const noLeading = digits.replace(/^0+/, "") || "0";
  const variants = new Set([digits, noLeading]);
  return Array.from(variants).filter(Boolean);
}

function normalizeToolNumberValue(value) {
  const raw = String(value ?? "");
  const match = raw.match(/\d+/);
  if (!match) return "";
  const trimmed = match[0].replace(/^0+/, "");
  return trimmed || "0";
}

function buildToolSearchLine(tool) {
  return [
    tool?.["Номер"],
    tool?.["Наименование"],
    tool?.["Производитель"],
    tool?.["Модель"],
    tool?.["Статус"],
    tool?.["Объект"],
    tool?.["Граппа инструментов"],
    tool?.["Бух.номер"],
    tool?.["Серийный номер"],
  ]
    .filter((value) => value !== null && value !== undefined && String(value).trim())
    .join(" ")
    .toLowerCase();
}

function buildAddPhotoSearchLine(tool) {
  return [
    tool?.["Номер"],
    tool?.["Бух.номер"],
    tool?.["Наименование"],
    tool?.["Производитель"],
    tool?.["Модель"],
    tool?.["Дата покупки"],
    tool?.["Статус"],
    tool?.["Объект"],
    tool?.["Граппа инструментов"],
  ]
    .filter((value) => value !== null && value !== undefined && String(value).trim())
    .join(" ")
    .toLowerCase();
}

function buildToolPhotoCandidates(orgFolder, toolNumber) {
  if (!orgFolder) return [];
  const variants = getToolNumberVariants(toolNumber);
  if (!variants.length) return [];
  const extensions = ["jpg", "jpeg", "png", "webp"];
  const suffixes = ["", "_1", "-1"];
  const candidates = [];
  variants.forEach((variant) => {
    suffixes.forEach((suffix) => {
      extensions.forEach((ext) => {
        candidates.push(`./${orgFolder}/Фото инструментов/${variant}${suffix}.${ext}`);
      });
    });
  });
  return candidates;
}

const toolPhotoPlaceholder = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#eef2ff"/>
        <stop offset="100%" stop-color="#ffffff"/>
      </linearGradient>
    </defs>
    <rect width="320" height="240" fill="url(#bg)"/>
    <rect x="24" y="24" width="272" height="192" rx="24" fill="#f1f5f9" stroke="#cbd5f5" stroke-width="2"/>
    <path d="M106 138h108v24H106z" fill="#cbd5f5"/>
    <circle cx="120" cy="110" r="18" fill="#cbd5f5"/>
    <path d="M150 170l28-36 22 28 18-22 36 30H150z" fill="#dbeafe"/>
    <text x="160" y="206" text-anchor="middle" font-size="14" fill="#94a3b8" font-family="Inter, sans-serif">Нет фото</text>
  </svg>`
)}`;

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

function formatNotificationValue(value, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString();
  }
  const text = String(value ?? "").trim();
  return text ? text : fallback;
}

function formatNotificationCost(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value.toLocaleString("ru-RU")} ₽`;
  }
  const text = String(value ?? "").trim();
  return text ? text : "—";
}

function escapeTelegramHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function extractNotificationGroups(settingsData, notificationId) {
  const source =
    settingsData?.notifications?.[notificationId]?.groups ??
    settingsData?.organization?.notifications?.[notificationId]?.groups ??
    [];
  const raw = Array.isArray(source) ? source : [source];
  const unique = new Set();
  raw.forEach((value) => {
    const normalized = normalizeTelegramId(value);
    if (normalized) {
      unique.add(normalized);
    }
  });
  return Array.from(unique);
}

function isNotificationEnabled(settingsData, notificationId) {
  const value =
    settingsData?.notifications?.[notificationId]?.enabled ??
    settingsData?.organization?.notifications?.[notificationId]?.enabled;
  return Boolean(value);
}

function isNotificationPhotoEnabled(settingsData, notificationId) {
  const value =
    settingsData?.notifications?.[notificationId]?.attachPhoto ??
    settingsData?.organization?.notifications?.[notificationId]?.attachPhoto;
  return Boolean(value);
}

function buildNewToolNotificationMessage(
  tool,
  { organizationName, createdBy, numberType } = {}
) {
  const normalizedNumberType = String(numberType ?? "").trim().toLowerCase();
  const shouldUseAccountingNumber =
    normalizedNumberType === "бухгалтерский номер";
  const numberLabel = shouldUseAccountingNumber ? "Бух.номер" : "Номер";
  const numberValue = shouldUseAccountingNumber
    ? tool?.["Бух.номер"]
    : tool?.["Номер"];
  const creatorLine = `Добавил: ${escapeTelegramHtml(
    formatNotificationValue(createdBy)
  )}`;
  const nameParts = [
    formatNotificationValue(tool?.["Наименование"], ""),
    formatNotificationValue(tool?.["Производитель"], ""),
    formatNotificationValue(tool?.["Модель"], ""),
  ]
    .map((part) => part.trim())
    .filter(Boolean);
  const titleLine =
    nameParts.length > 0 ? nameParts.join(" ") : "—";
  const lines = [
    "💡💡💡<b><u>НОВЫЙ ИНСТРУМЕНТ</u></b>",
    `1. ${numberLabel}: ${escapeTelegramHtml(
      formatNotificationValue(numberValue)
    )}`,
    `2. ${escapeTelegramHtml(titleLine)}`,
    `3. Стоимость: ${escapeTelegramHtml(
      formatNotificationCost(tool?.["Стоимость"])
    )}`,
    `4. Ответственный: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Ответственный"])
    )}`,
    `5. Объект: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Объект"])
    )}`,
    `6. Дата покупки: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Дата покупки"])
    )}`,
    "",
    creatorLine,
  ];
  return lines.join("\n");
}

function buildMoveToolNotificationMessage(
  tool,
  { movedBy, responsible, targetObject, oldObject } = {}
) {
  const titleParts = [
    formatNotificationValue(tool?.["Наименование"], ""),
    formatNotificationValue(tool?.["Производитель"], ""),
    formatNotificationValue(tool?.["Модель"], ""),
  ]
    .map((part) => part.trim())
    .filter(Boolean);
  const titleLine = titleParts.length ? titleParts.join(" ") : "—";
  const lines = [
    "📦📦📦<b><u>ПЕРЕМЕЩЕНИЕ ИНСТРУМЕНТА</u></b>",
    `1. Номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Номер"])
    )}`,
    `2. Бух.номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Бух.номер"])
    )}`,
    `3. ${escapeTelegramHtml(titleLine)}`,
    `4. Старый объект: ${escapeTelegramHtml(
      formatNotificationValue(oldObject)
    )}`,
    `5. Новый объект: ${escapeTelegramHtml(
      formatNotificationValue(targetObject)
    )}`,
    `6. Ответственный: ${escapeTelegramHtml(
      formatNotificationValue(responsible)
    )}`,
    "",
    `Переместил: ${escapeTelegramHtml(
      formatNotificationValue(movedBy)
    )}`,
  ];
  return lines.join("\n");
}

function buildMoveToolResponsibleMessage(
  tool,
  { movedBy, oldObject, targetObject, fineNote } = {}
) {
  const titleParts = [
    formatNotificationValue(tool?.["Наименование"], ""),
    formatNotificationValue(tool?.["Производитель"], ""),
    formatNotificationValue(tool?.["Модель"], ""),
  ]
    .map((part) => part.trim())
    .filter(Boolean);
  const titleLine = titleParts.length ? titleParts.join(" ") : "—";
  const lines = [
    "🔔 Вам переместили инструмент",
    `1. Номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Номер"])
    )}`,
    `2. Бух.номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Бух.номер"])
    )}`,
    `3. ${escapeTelegramHtml(titleLine)}`,
    `4. Старый объект: ${escapeTelegramHtml(
      formatNotificationValue(oldObject)
    )}`,
    `5. Новый объект: ${escapeTelegramHtml(
      formatNotificationValue(targetObject)
    )}`,
    "",
    `Переместил: ${escapeTelegramHtml(
      formatNotificationValue(movedBy)
    )}`,
  ];
  if (fineNote) {
    lines.push("", escapeTelegramHtml(fineNote));
  }
  return lines.join("\n");
}

async function parseTelegramError(response) {
  if (!response || response.ok) return "";
  const rawText = await response.text().catch(() => "");
  if (!rawText) return "";
  try {
    const parsed = JSON.parse(rawText);
    return (
      parsed?.description ||
      parsed?.error ||
      parsed?.message ||
      rawText
    );
  } catch (error) {
    return rawText;
  }
}

function formatTelegramSendError({ status, errorText } = {}) {
  const parts = [];
  if (status) parts.push(`HTTP ${status}`);
  if (errorText) parts.push(errorText);
  return parts.join(": ").trim() || "неизвестная ошибка Telegram API";
}

async function sendTelegramMessage(chatId, text) {
  if (!fallbackBotToken || !chatId || !text) {
    return { ok: false, status: null, errorText: "некорректные данные" };
  }
  const response = await fetch(
    `https://api.telegram.org/bot${fallbackBotToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    }
  );
  const errorText = await parseTelegramError(response);
  if (!response.ok) {
    console.warn("Не удалось отправить сообщение в Telegram.", {
      chatId,
      status: response.status,
      errorText,
    });
  }
  return { ok: response.ok, status: response.status, errorText };
}

async function sendTelegramPhoto(chatId, photoUrl, caption) {
  if (!fallbackBotToken || !chatId || !photoUrl) {
    return { ok: false, status: null, errorText: "некорректные данные" };
  }
  const response = await fetch(
    `https://api.telegram.org/bot${fallbackBotToken}/sendPhoto`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption: caption ?? "",
        parse_mode: "HTML",
      }),
    }
  );
  const errorText = await parseTelegramError(response);
  if (!response.ok) {
    console.warn("Не удалось отправить фото в Telegram.", {
      chatId,
      status: response.status,
      errorText,
    });
  }
  return { ok: response.ok, status: response.status, errorText };
}

async function resolveAvailablePhotoUrl(orgFolder, toolNumber) {
  if (!orgFolder || !toolNumber) return null;
  const candidates = buildToolPhotoCandidates(orgFolder, toolNumber);
  if (!candidates.length) return null;
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { method: "HEAD" });
      if (response.ok) {
        return new URL(candidate, window.location.href).toString();
      }
    } catch (error) {
      try {
        const response = await fetch(candidate);
        if (response.ok) {
          return new URL(candidate, window.location.href).toString();
        }
      } catch (innerError) {
        continue;
      }
    }
  }
  return null;
}

async function notifyNewToolRegistration({
  tool,
  organizationName,
  orgFolder,
  createdBy,
  numberType,
}) {
  if (!tool || !orgFolder) return;
  if (!fallbackBotToken) return;
  const settingsPath = `./${orgFolder}/Настройки.json`;
  try {
    const settingsData = await loadJson(settingsPath);
    if (!isNotificationEnabled(settingsData, "newTool")) return;
    const groupIds = extractNotificationGroups(settingsData, "newTool");
    if (!groupIds.length) return;
    const message = buildNewToolNotificationMessage(tool, {
      organizationName,
      createdBy,
      numberType,
    });
    await Promise.all(
      groupIds.map((chatId) => sendTelegramMessage(chatId, message))
    );
  } catch (error) {
    console.warn("Не удалось отправить уведомление о новом инструменте.", error);
  }
}

function findUserTelegramId(usersData, { fullName, organization }) {
  const normalizedName = normalizePersonName(fullName ?? "");
  const normalizedOrg = String(organization ?? "").trim().toLowerCase();
  const users = usersData?.users ?? [];
  let match = users.find((entry) => {
    const entryName = normalizePersonName(entry?.full_name ?? "");
    if (normalizedName && entryName !== normalizedName) return false;
    if (!normalizedOrg) return true;
    return String(entry?.organization ?? "").trim().toLowerCase() === normalizedOrg;
  });
  if (!match && normalizedName) {
    match = users.find(
      (entry) =>
        normalizePersonName(entry?.full_name ?? "") === normalizedName
    );
  }
  return normalizeTelegramId(match?.telegram_id);
}

function buildLateReplyFineNote(settingsData) {
  const fine = settingsData?.organization?.fines?.lateReply ?? {};
  if (!fine.enabled) return "";
  const days = normalizeNumber(fine.days, 0);
  const amount = normalizeNumber(fine.amount, 0);
  if (!days && !amount) return "";
  const daysText = days ? `${days}` : "0";
  const amountText = formatNotificationCost(amount || 0);
  return `У вас ${daysText} дней на ответ, далее штраф ${amountText} за каждый день без ответа.`;
}

function resolveToolPhotoNumberForNotification(tool) {
  const byNumber = String(tool?.["Номер"] ?? "").trim();
  const byAccounting = String(tool?.["Бух.номер"] ?? "").trim();
  return byNumber || byAccounting;
}

async function notifyMoveTool({
  tool,
  orgFolder,
  organizationName,
  responsibleName,
  targetObject,
  movedBy,
}) {
  const result = {
    sent: false,
    reasons: [],
  };
  if (!tool || !orgFolder) {
    result.reasons.push("не переданы данные о перемещении");
    return result;
  }
  if (!fallbackBotToken) {
    result.reasons.push("не задан токен Telegram‑бота");
    return result;
  }
  const settingsPath = `./${orgFolder}/Настройки.json`;
  try {
    const settingsData = await loadJson(settingsPath);
    const groupsEnabled = isNotificationEnabled(settingsData, "moveTool");
    const groupIds = groupsEnabled
      ? extractNotificationGroups(settingsData, "moveTool")
      : [];
    const oldObject = String(tool?.["Объект"] ?? "").trim();
    const moveMessage = buildMoveToolNotificationMessage(tool, {
      movedBy,
      responsible: responsibleName,
      targetObject,
      oldObject,
    });
    let groupSent = false;
    const groupErrors = [];
    if (!groupsEnabled) {
      result.reasons.push("уведомления в группах выключены в Настройки.json");
    } else if (!groupIds.length) {
      result.reasons.push("не выбраны группы для уведомлений");
    } else {
      const shouldAttach = isNotificationPhotoEnabled(settingsData, "moveTool");
      if (shouldAttach) {
        const photoNumber = resolveToolPhotoNumberForNotification(tool);
        const photoUrl = await resolveAvailablePhotoUrl(orgFolder, photoNumber);
        if (photoUrl) {
          const sendResults = await Promise.all(
            groupIds.map(async (chatId) => {
              const photoResult = await sendTelegramPhoto(
                chatId,
                photoUrl,
                moveMessage
              );
              if (photoResult.ok) return { ok: true };
              groupErrors.push(formatTelegramSendError(photoResult));
              const messageResult = await sendTelegramMessage(chatId, moveMessage);
              if (!messageResult.ok) {
                groupErrors.push(formatTelegramSendError(messageResult));
              }
              return messageResult;
            })
          );
          groupSent = sendResults.some((entry) => entry?.ok);
        } else {
          const sendResults = await Promise.all(
            groupIds.map(async (chatId) => {
              const messageResult = await sendTelegramMessage(
                chatId,
                moveMessage
              );
              if (!messageResult.ok) {
                groupErrors.push(formatTelegramSendError(messageResult));
              }
              return messageResult;
            })
          );
          groupSent = sendResults.some((entry) => entry?.ok);
        }
      } else {
        const sendResults = await Promise.all(
          groupIds.map(async (chatId) => {
            const messageResult = await sendTelegramMessage(chatId, moveMessage);
            if (!messageResult.ok) {
              groupErrors.push(formatTelegramSendError(messageResult));
            }
            return messageResult;
          })
        );
        groupSent = sendResults.some((entry) => entry?.ok);
      }
      if (!groupSent) {
        const uniqueErrors = Array.from(new Set(groupErrors.filter(Boolean)));
        if (uniqueErrors.length) {
          result.reasons.push(
            `не удалось отправить уведомление в группы (${uniqueErrors.join(
              "; "
            )})`
          );
        } else {
          result.reasons.push("не удалось отправить уведомление в группы");
        }
      }
    }

    const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
    const responsibleTelegramId = findUserTelegramId(usersData, {
      fullName: responsibleName,
      organization: organizationName,
    });
    let responsibleSent = false;
    if (responsibleTelegramId) {
      const fineNote = buildLateReplyFineNote(settingsData);
      const responsibleMessage = buildMoveToolResponsibleMessage(tool, {
        movedBy,
        oldObject,
        targetObject,
        fineNote: fineNote || "",
      });
      const responsibleResult = await sendTelegramMessage(
        responsibleTelegramId,
        responsibleMessage
      );
      responsibleSent = responsibleResult.ok;
      if (!responsibleResult.ok) {
        result.reasons.push(
          `не удалось отправить ответственному (${formatTelegramSendError(
            responsibleResult
          )})`
        );
      }
    } else {
      result.reasons.push("у ответственного не указан Telegram ID");
    }
    result.sent = groupSent || responsibleSent;
  } catch (error) {
    console.warn("Не удалось отправить уведомление о перемещении.", error);
    const message = error?.message ? `: ${error.message}` : "";
    result.reasons.push(`ошибка при отправке уведомлений${message}`);
  }
  return result;
}

function buildNotificationSummary(results = []) {
  if (!results.length) return "";
  const reasons = [
    ...new Set(
      results.flatMap((entry) => entry?.reasons ?? []).filter(Boolean)
    ),
  ];
  const sentCount = results.filter((entry) => entry?.sent).length;
  if (sentCount === results.length) {
    return "Уведомления отправлены.";
  }
  if (sentCount > 0) {
    return reasons.length
      ? `Уведомления отправлены частично, так как ${reasons.join("; ")}.`
      : "Уведомления отправлены частично.";
  }
  return reasons.length
    ? `Уведомления не отправлены, так как ${reasons.join("; ")}.`
    : "Уведомления не отправлены.";
}

function analyzeNotificationResults(results = []) {
  const summary = buildNotificationSummary(results);
  const sentCount = results.filter((entry) => entry?.sent).length;
  const allSent = results.length > 0 && sentCount === results.length;
  return {
    summary,
    allSent,
    shouldHoldOnError: Boolean(summary) && !allSent,
  };
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

async function saveEntriesViaEndpoint(entries) {
  const payload = JSON.stringify({ entries });
  const response = await fetch(saveEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  let responseText = "";
  try {
    responseText = await response.text();
  } catch (error) {
    console.warn("Не удалось прочитать ответ сервера.", error);
  }
  if (!response.ok) {
    let errorText = responseText;
    if (responseText) {
      try {
        const parsed = JSON.parse(responseText);
        errorText =
          parsed?.error ??
          parsed?.message ??
          (typeof parsed === "string" ? parsed : responseText);
      } catch (error) {
        // ignore json parse errors
      }
    }
    const message =
      errorText ||
      `Не удалось сохранить данные. Код ответа: ${response.status}.`;
    throw new Error(message);
  }
  return responseText;
}

async function uploadPhotoEntriesInBatches(
  entries,
  { onBatch, batchSize = 2 } = {}
) {
  if (!entries.length) return;
  const totalBatches = Math.ceil(entries.length / batchSize);
  for (let index = 0; index < totalBatches; index += 1) {
    const batch = entries.slice(index * batchSize, (index + 1) * batchSize);
    try {
      await saveEntriesViaEndpoint(batch);
    } catch (error) {
      if (batch.length === 1) {
        throw error;
      }
      for (const entry of batch) {
        await saveEntriesViaEndpoint([entry]);
      }
    }
    if (onBatch) {
      onBatch(index + 1, totalBatches);
    }
  }
}

const unploadPhotoEntriesInBatches = (...args) =>
  uploadPhotoEntriesInBatches(...args);

if (typeof window !== "undefined") {
  window.uploadPhotoEntriesInBatches = uploadPhotoEntriesInBatches;
  window.unploadPhotoEntriesInBatches = unploadPhotoEntriesInBatches;
}

async function saveJson(path, data, meta = {}) {
  return saveEntries([{ path, data, ...meta }]);
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Некорректные данные файла."));
        return;
      }
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = () => {
      reject(reader.error || new Error("Не удалось прочитать файл."));
    };
    reader.readAsDataURL(file);
  });
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

function findOrganizationRecord(orgData, orgName) {
  if (!orgName) return null;
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

  if (exactMatch) return exactMatch;

  return (
    organizations.find((org) => {
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
    }) ?? null
  );
}

function getOrgDisplayName(org) {
  const name = String(org?.full_name ?? org?.fullName ?? "").trim();
  return name || "Организация без названия";
}

function getOrgNames(org) {
  const names = new Set();
  const fullName = String(org?.full_name ?? org?.fullName ?? "").trim();
  const shortName = String(org?.short_name ?? org?.shortName ?? "").trim();
  if (fullName) names.add(fullName);
  if (shortName) names.add(shortName);
  return Array.from(names);
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

function sanitizeToolGroupName(value = "") {
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

function normalizeToolsData(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    if (Array.isArray(raw.tools)) return raw.tools;
    if (Array.isArray(raw.items)) return raw.items;
  }
  return [];
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
      toolGroups: [],
      telegramSchedule: {},
    };
  });
  const notifications = {};
  energyNotificationOptions.forEach((option) => {
    notifications[option.id] = {
      enabled: false,
      groups: [],
      attachPhoto: true,
    };
  });
  return {
    access,
    stcGroups: [],
    telegramGroups: [],
    fines,
    mailings,
    notifications,
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

function normalizeGroupsByDay(value, allowedGroups = []) {
  const allowed = new Set(
    Array.isArray(allowedGroups)
      ? allowedGroups.map((group) => String(group ?? "").trim()).filter(Boolean)
      : []
  );
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const normalized = {};
  energyWeekDays.forEach((day) => {
    const raw = Array.isArray(source[day]) ? source[day] : [];
    const groups = raw
      .map((group) => String(group ?? "").trim())
      .filter((group) => allowed.has(group));
    if (groups.length > 0) {
      normalized[day] = Array.from(new Set(groups));
    }
  });
  return normalized;
}

function normalizeTelegramGroupEntry(entry = {}) {
  const name = String(entry.name ?? entry.title ?? "").trim();
  const telegramId = String(entry.telegramId ?? entry.telegram_id ?? "").trim();
  return { name, telegramId };
}

function normalizeTelegramGroupsList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeTelegramGroupEntry(item ?? {}))
    .filter((item) => item.name || item.telegramId);
}

function getTelegramGroupKey(group = {}) {
  return String(group.telegramId || group.name || "").trim();
}

function normalizeTelegramGroupSelection(value, allowedGroups = []) {
  const allowedKeys = new Set(
    allowedGroups.map((group) => getTelegramGroupKey(group)).filter(Boolean)
  );
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((group) => String(group ?? "").trim())
    .filter((group) => allowedKeys.has(group));
  return Array.from(new Set(normalized));
}

function normalizeMailingToolGroups(value, allowedGroups = []) {
  const allowed = new Set(
    Array.isArray(allowedGroups)
      ? allowedGroups.map((group) => String(group ?? "").trim()).filter(Boolean)
      : []
  );
  const raw = Array.isArray(value) ? value : [];
  const normalized = raw
    .map((group) => String(group ?? "").trim())
    .filter((group) => allowed.has(group));
  return Array.from(new Set(normalized));
}

function normalizeTelegramSchedule(value, telegramGroups = [], defaults = {}) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const fallbackDays = Array.isArray(defaults.days) ? defaults.days : [];
  const fallbackTime = defaults.time;
  const normalized = {};
  telegramGroups.forEach((group) => {
    const key = getTelegramGroupKey(group);
    if (!key) return;
    const entry = source[key] ?? {};
    const days = Array.isArray(entry.days)
      ? normalizeDays(entry.days, [])
      : normalizeDays(fallbackDays, []);
    const time = normalizeTime(entry.time ?? fallbackTime, fallbackTime);
    normalized[key] = { days, time };
  });
  return normalized;
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
  const telegramGroups = normalizeTelegramGroupsList(source.telegramGroups);
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
    const legacyDays = Array.isArray(data.days ?? data.day)
      ? data.days ?? data.day
      : null;
    const legacyTime = normalizeTime(data.time, defaults.mailings[option.id].time);
    const legacyGroupsByDay = normalizeGroupsByDay(data.groupsByDay, stcGroups);
    const legacyToolGroups = Object.values(legacyGroupsByDay).flat();
    const toolGroups = Array.isArray(data.toolGroups)
      ? normalizeMailingToolGroups(data.toolGroups, stcGroups)
      : normalizeMailingToolGroups(legacyToolGroups, stcGroups);
    const telegramSchedule = normalizeTelegramSchedule(
      data.telegramSchedule,
      telegramGroups,
      {
        days: legacyDays ?? defaults.mailings[option.id].days,
        time: legacyTime,
      }
    );
    mailings[option.id] = {
      enabled: Boolean(data.enabled ?? defaults.mailings[option.id].enabled),
      toolGroups,
      telegramSchedule,
    };
  });
  const notifications = {};
  energyNotificationOptions.forEach((option) => {
    const data = source.notifications?.[option.id] ?? {};
    notifications[option.id] = {
      enabled: Boolean(
        data.enabled ?? defaults.notifications[option.id].enabled
      ),
      groups: normalizeTelegramGroupSelection(data.groups, telegramGroups),
      attachPhoto: Boolean(
        data.attachPhoto ?? defaults.notifications[option.id].attachPhoto
      ),
    };
  });
  return {
    access,
    stcGroups,
    telegramGroups,
    fines,
    mailings,
    notifications,
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

  const telegramGroups = normalizeTelegramGroupsList(settings.telegramGroups);
  const mailingsMarkup = energyMailingOptions
    .map((option) => {
      const mailing = settings.mailings?.[option.id] ?? {};
      const groupOptions = Array.isArray(settings.stcGroups)
        ? settings.stcGroups
        : [];
      const selectedToolGroups = new Set(mailing.toolGroups ?? []);
      const toolGroupsMarkup =
        groupOptions.length > 0
          ? groupOptions
              .map(
                (group) => `
                  <label class="settings-group-chip">
                    <input
                      type="checkbox"
                      name="mailing-${option.id}-tool-groups"
                      value="${escapeHtml(group)}"
                      ${selectedToolGroups.has(group) ? "checked" : ""}
                    />
                    <span>${escapeHtml(group)}</span>
                  </label>
                `
              )
              .join("")
          : `<span class="settings-chip is-muted">Нет групп инструментов</span>`;
      const telegramMarkup =
        telegramGroups.length > 0
          ? telegramGroups
              .map((group, index) => {
                const key = getTelegramGroupKey(group);
                const schedule = mailing.telegramSchedule?.[key] ?? {};
                const selectedDays = new Set(schedule.days ?? []);
                const dayOptions = energyWeekDays
                  .map(
                    (day) => `
                      <label class="settings-day-chip">
                        <input
                          type="checkbox"
                          name="mailing-${option.id}-tg-${index}-days"
                          value="${day}"
                          ${selectedDays.has(day) ? "checked" : ""}
                        />
                        <span>${day}</span>
                      </label>
                    `
                  )
                  .join("");
                const groupLabel = escapeHtml(group.name || "Группа Telegram");
                const groupId = escapeHtml(group.telegramId || "");
                return `
                  <div class="settings-telegram-group">
                    <div class="settings-telegram-group__header">
                      <div class="settings-telegram-group__title">${groupLabel}</div>
                      ${
                        groupId
                          ? `<div class="settings-telegram-group__id">ID: ${groupId}</div>`
                          : ""
                      }
                    </div>
                    <div class="settings-telegram-group__fields">
                      <div class="settings-telegram-field">
                        <span>Дни недели</span>
                        <div class="settings-day-grid">
                          ${dayOptions}
                        </div>
                      </div>
                      <label class="settings-telegram-field">
                        <span>Время</span>
                        <input
                          class="form-input"
                          type="time"
                          name="mailing-${option.id}-tg-${index}-time"
                          value="${escapeHtml(schedule.time ?? option.defaultTime)}"
                        />
                      </label>
                    </div>
                  </div>
                `;
              })
              .join("")
          : `<div class="settings-empty-note">Сначала добавьте Telegram‑группы в настройках организации.</div>`;
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
            <div class="settings-mailing-field settings-mailing-field--full">
              <span>Группы инструментов</span>
              <div
                class="settings-group-chip-list"
                data-mailing-tool-groups
                data-mailing-id="${option.id}"
              >
                ${toolGroupsMarkup}
              </div>
            </div>
            <div class="settings-mailing-field settings-mailing-field--full">
              <span>Группы Telegram: дни и время рассылки</span>
              <div class="settings-telegram-groups">
                ${telegramMarkup}
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
  const notificationsMarkup = energyNotificationOptions
    .map((option) => {
      const notification = settings.notifications?.[option.id] ?? {};
      const selectedGroups = new Set(notification.groups ?? []);
      const groupOptionsMarkup =
        telegramGroups.length > 0
          ? telegramGroups
              .map((group) => {
                const groupKey = getTelegramGroupKey(group);
                const label = escapeHtml(group.name || group.telegramId || "Группа");
                return `
                  <label class="settings-group-chip">
                    <input
                      type="checkbox"
                      name="notification-${option.id}-groups"
                      value="${escapeHtml(groupKey)}"
                      ${selectedGroups.has(groupKey) ? "checked" : ""}
                    />
                    <span>${label}</span>
                  </label>
                `;
              })
              .join("")
          : `<div class="settings-empty-note">Добавьте Telegram‑группы в настройках организации.</div>`;
      return `
        <div class="settings-notification-card">
          <div class="settings-notification-card__header">
            <label class="settings-inline settings-notification-card__title">
              <input
                type="checkbox"
                name="notification-${option.id}-enabled"
                ${notification.enabled ? "checked" : ""}
              />
              <span>${escapeHtml(option.title)}</span>
            </label>
            <label class="settings-inline settings-inline--compact settings-notification-card__photo">
              <input
                type="checkbox"
                name="notification-${option.id}-photo"
                ${notification.attachPhoto ? "checked" : ""}
              />
              <span>Фото инструмента</span>
            </label>
          </div>
          <div class="settings-notification-card__fields">
            <div class="settings-notification-field settings-notification-field--full">
              <span>Telegram‑группы</span>
              <div class="settings-group-chip-list">
                ${groupOptionsMarkup}
              </div>
            </div>
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
    <div class="settings-accordion" data-settings-accordion>
      <button
        class="settings-accordion__header"
        type="button"
        data-settings-accordion-toggle
        aria-expanded="false"
      >
        <span class="settings-accordion__title">Уведомления</span>
        <span class="settings-accordion__icon" aria-hidden="true">⌄</span>
      </button>
      <div class="settings-accordion__content">
        <div class="settings-notifications">
          ${notificationsMarkup}
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
  const toolsModalEl = contentEl.querySelector("[data-tools-modal]");
  const toolsBackdropEl = contentEl.querySelector("[data-tools-backdrop]");
  const toolsCloseButton = contentEl.querySelector("[data-tools-close]");
  const toolsSearchInput = contentEl.querySelector("[data-tools-search]");
  const toolsListEl = contentEl.querySelector("[data-tools-list]");
  const toolsEmptyEl = contentEl.querySelector("[data-tools-empty]");
  const toolsSubtitleEl = contentEl.querySelector("[data-tools-subtitle]");
  const toolsViewButtons = contentEl.querySelectorAll("[data-tools-view]");
  const toolsFilterEls = contentEl.querySelectorAll("[data-tools-filter]");
  const toolsFiltersPanelEl = contentEl.querySelector(
    "[data-tools-filters-panel]"
  );
  const toolsFiltersToggleEl = contentEl.querySelector(
    "[data-tools-filters-toggle]"
  );
  const toolsViewToggleEl = contentEl.querySelector("[data-tools-view-toggle]");
  const toolsMoveButtonEl = contentEl.querySelector("[data-tools-move-trigger]");
  const toolsSelectionCancelButtonEl = contentEl.querySelector(
    "[data-tools-selection-cancel]"
  );
  const toolsMoveModalEl = contentEl.querySelector("[data-tools-move-modal]");
  const toolsMoveBackdropEl = contentEl.querySelector(
    "[data-tools-move-backdrop]"
  );
  const toolsMoveCloseButton = contentEl.querySelector("[data-tools-move-close]");
  const toolsMoveCancelButton = contentEl.querySelector(
    "[data-tools-move-cancel]"
  );
  const toolsMoveFormEl = contentEl.querySelector("[data-tools-move-form]");
  const toolsMoveResponsibleInput = contentEl.querySelector(
    "[data-tools-move-responsible]"
  );
  const toolsMoveResponsibleSuggestionsEl = contentEl.querySelector(
    "[data-tools-move-responsible-suggestions]"
  );
  const toolsMoveObjectInput = contentEl.querySelector("[data-tools-move-object]");
  const toolsMoveObjectSuggestionsEl = contentEl.querySelector(
    "[data-tools-move-object-suggestions]"
  );
  const toolsMoveMessageEl = contentEl.querySelector("[data-tools-move-message]");
  const toolsMoveSubtitleEl = contentEl.querySelector("[data-tools-move-subtitle]");
  const addPhotoModalEl = contentEl.querySelector("[data-add-photo-modal]");
  const addPhotoBackdropEl = contentEl.querySelector(
    "[data-add-photo-backdrop]"
  );
  const addPhotoCloseButton = contentEl.querySelector("[data-add-photo-close]");
  const addPhotoSearchInput = contentEl.querySelector(
    "[data-add-photo-search]"
  );
  const addPhotoListEl = contentEl.querySelector("[data-add-photo-list]");
  const addPhotoEmptyEl = contentEl.querySelector("[data-add-photo-empty]");
  const addPhotoSubtitleEl = contentEl.querySelector(
    "[data-add-photo-subtitle]"
  );
  const addPhotoFilterEls = contentEl.querySelectorAll(
    "[data-add-photo-filter]"
  );
  const addPhotoFiltersPanelEl = contentEl.querySelector(
    "[data-add-photo-filters-panel]"
  );
  const addPhotoFiltersToggleEl = contentEl.querySelector(
    "[data-add-photo-filters-toggle]"
  );
  const addToolModalEl = contentEl.querySelector("[data-add-tool-modal]");
  const addToolBackdropEl = contentEl.querySelector("[data-add-tool-backdrop]");
  const addToolCloseButton = contentEl.querySelector("[data-add-tool-close]");
  const addToolFormEl = contentEl.querySelector("[data-add-tool-form]");
  const addToolMessageEl = contentEl.querySelector("[data-add-tool-message]");
  const addToolSubtitleEl = contentEl.querySelector("[data-add-tool-subtitle]");
  const addToolCancelButton = contentEl.querySelector("[data-add-tool-cancel]");
  const addToolBodyEl = addToolFormEl?.querySelector(".settings-modal__body");
  const addToolPanelEl = addToolModalEl?.querySelector(".settings-modal__panel");
  const addToolSuccessModalEl = contentEl.querySelector(
    "[data-add-tool-success-modal]"
  );
  const addToolSuccessBackdropEl = contentEl.querySelector(
    "[data-add-tool-success-backdrop]"
  );
  const addToolSuccessCloseButton = contentEl.querySelector(
    "[data-add-tool-success-close]"
  );
  const addToolSuccessConfirmButton = contentEl.querySelector(
    "[data-add-tool-success-confirm]"
  );
  const addToolSuccessNumberEl = contentEl.querySelector(
    "[data-add-tool-success-number]"
  );
  const addToolSuccessTitleEl = contentEl.querySelector(
    "[data-add-tool-success-title]"
  );
  const addToolSuccessMessageEl = contentEl.querySelector(
    "[data-add-tool-success-message]"
  );
  const addToolSuccessLabelEl = contentEl.querySelector(
    "[data-add-tool-success-label]"
  );
  const addToolNameInput = contentEl.querySelector("#tool-name-input");
  const addToolManufacturerInput = contentEl.querySelector(
    "#tool-manufacturer-input"
  );
  const addToolModelInput = contentEl.querySelector("#tool-model-input");
  const addToolAccountingNumberInput = contentEl.querySelector(
    "#tool-accounting-number-input"
  );
  const addToolCostInput = contentEl.querySelector('[name="tool-cost"]');
  const addToolResponsibleInput = contentEl.querySelector(
    "#tool-responsible-input"
  );
  const addToolObjectInput = contentEl.querySelector("#tool-object-input");
  const addToolGroupInput = contentEl.querySelector("#tool-group-input");
  const addToolInvoiceInput = contentEl.querySelector('[name="tool-invoice"]');
  const addToolInvoicePhotoInput = contentEl.querySelector(
    '[name="tool-invoice-photo"]'
  );
  const addToolCameraModalEl = contentEl.querySelector(
    "[data-add-tool-camera-modal]"
  );
  const addToolCameraBackdropEl = contentEl.querySelector(
    "[data-add-tool-camera-backdrop]"
  );
  const addToolCameraCloseButton = contentEl.querySelector(
    "[data-add-tool-camera-close]"
  );
  const addToolCameraCancelButton = contentEl.querySelector(
    "[data-add-tool-camera-cancel]"
  );
  const addToolCameraCaptureButton = contentEl.querySelector(
    "[data-add-tool-camera-capture]"
  );
  const addToolCameraRetakeButton = contentEl.querySelector(
    "[data-add-tool-camera-retake]"
  );
  const addToolCameraSaveButton = contentEl.querySelector(
    "[data-add-tool-camera-save]"
  );
  const addToolCameraVideoEl = contentEl.querySelector(
    "[data-add-tool-camera-video]"
  );
  const addToolCameraCanvasEl = contentEl.querySelector(
    "[data-add-tool-camera-canvas]"
  );
  const addToolInvoicePhotoPicker = contentEl.querySelector(
    "[data-tool-invoice-photo-picker]"
  );
  const addToolInvoicePhotoInputs =
    addToolInvoicePhotoPicker?.querySelectorAll(
      '[name="tool-invoice-photo"]'
    ) ?? [];
  const addToolNameSuggestionsEl = contentEl.querySelector(
    "[data-tool-name-suggestions]"
  );
  const addToolManufacturerSuggestionsEl = contentEl.querySelector(
    "[data-tool-manufacturer-suggestions]"
  );
  const addToolModelSuggestionsEl = contentEl.querySelector(
    "[data-tool-model-suggestions]"
  );
  const addToolResponsibleSuggestionsEl = contentEl.querySelector(
    "[data-tool-responsible-suggestions]"
  );
  const addToolObjectSuggestionsEl = contentEl.querySelector(
    "[data-tool-object-suggestions]"
  );
  const addToolGroupSuggestionsEl = contentEl.querySelector(
    "[data-tool-group-suggestions]"
  );
  const usersDetailsModalEl = contentEl.querySelector("[data-users-details-modal]");
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
  const pendingMoves = await loadUserPendingMovesCount(context.orgFolderName, user);
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
  const usersState = {
    users: [],
  };
  const addToolState = {
    tools: [],
    responsibleOptions: [],
    objectOptions: [],
    groupOptions: [],
    organizationName: "",
    orgFolder: "",
    numberType: "",
    isSaving: false,
  };
  const toolsViewOptions = new Set(["large", "compact", "list", "table"]);
  const normalizeToolsView = (value) =>
    toolsViewOptions.has(value) ? value : "table";
  const savedToolsView = normalizeToolsView(
    settingsData.users?.[context.userKey]?.energy?.toolsView ?? "table"
  );
  const toolsState = {
    tools: [],
    filtered: [],
    view: savedToolsView,
    filters: {
      group: "",
      status: "",
      object: "",
      manufacturer: "",
      model: "",
      photo: "",
    },
    search: "",
    orgFolder: "",
    numberKey: "Номер",
    numberLabel: "Номер",
    isSelecting: false,
    selectedIds: new Set(),
    toolMap: new Map(),
  };
  const toolsMoveState = {
    responsibleOptions: [],
    objectOptions: [],
  };
  const addPhotoState = {
    tools: [],
    filtered: [],
    filters: {
      group: "",
      status: "",
      object: "",
      manufacturer: "",
      model: "",
    },
    search: "",
    orgFolder: "",
  };
  let addToolViewportListenersAttached = false;
  const updateAddToolKeyboardOffset = () => {
    if (!addToolModalEl) return;
    const viewport = window.visualViewport;
    if (!viewport) {
      addToolModalEl.style.removeProperty("--keyboard-offset");
      return;
    }
    const offset = Math.max(
      0,
      window.innerHeight - viewport.height - viewport.offsetTop
    );
    addToolModalEl.style.setProperty("--keyboard-offset", `${offset}px`);
  };
  const attachAddToolViewportListeners = () => {
    const viewport = window.visualViewport;
    if (!viewport || addToolViewportListenersAttached) return;
    viewport.addEventListener("resize", updateAddToolKeyboardOffset);
    viewport.addEventListener("scroll", updateAddToolKeyboardOffset);
    addToolViewportListenersAttached = true;
  };
  const detachAddToolViewportListeners = () => {
    const viewport = window.visualViewport;
    if (!viewport || !addToolViewportListenersAttached) return;
    viewport.removeEventListener("resize", updateAddToolKeyboardOffset);
    viewport.removeEventListener("scroll", updateAddToolKeyboardOffset);
    addToolViewportListenersAttached = false;
  };
  const objectsPath = context.objectsPath ?? `./${context.orgFolderName}/Объекты.json`;
  const objectsNameInput = objectsFormEl?.querySelector("[name='object-name']");
  let selectedUsersOrgName = "";
  let selectedUsersOrgDisplayName = "";
  let selectedUsersOrgNames = [];

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

  const setToolsSubtitle = (text) => {
    if (toolsSubtitleEl) {
      toolsSubtitleEl.textContent = text;
    }
  };

  const buildToolSelectionId = (tool, index) => {
    const number = String(tool?.["Номер"] ?? "").trim();
    if (number) return `number:${number}`;
    const accounting = String(tool?.["Бух.номер"] ?? "").trim();
    if (accounting) return `account:${accounting}`;
    return `index:${index}`;
  };

  const setToolsMoveMessage = (text = "", type = "") => {
    if (!toolsMoveMessageEl) return;
    toolsMoveMessageEl.textContent = text;
    toolsMoveMessageEl.classList.remove("is-error", "is-success", "is-info");
    if (type) {
      toolsMoveMessageEl.classList.add(`is-${type}`);
    }
  };

  const isToolSelectableForMove = (tool) => {
    if (!tool) return false;
    if (tool.__pendingMove) return false;
    const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
    const hasPhoto = Number.isFinite(photoCount) && photoCount > 0;
    return hasPhoto;
  };

  const updateToolsSelectionUi = () => {
    const count = toolsState.selectedIds.size;
    if (toolsMoveButtonEl) {
      toolsMoveButtonEl.disabled = count === 0;
    }
    if (toolsSelectionCancelButtonEl) {
      toolsSelectionCancelButtonEl.disabled = count === 0;
    }
    if (toolsMoveSubtitleEl) {
      toolsMoveSubtitleEl.textContent =
        count > 0
          ? `Выбрано инструментов: ${count}`
          : "Выберите ответственного и объект";
    }
    if (toolsModalEl) {
      toolsModalEl.classList.toggle("tools-modal--selecting", toolsState.isSelecting);
    }
  };

  const resetToolsSelection = () => {
    toolsState.isSelecting = false;
    toolsState.selectedIds.clear();
    updateToolsSelectionUi();
  };

  const resolveToolsNumberConfig = async () => {
    const fallback = { numberKey: "Номер", numberLabel: "Номер" };
    const orgName =
      context.orgFullName ??
      context.orgShortName ??
      user?.organization ??
      "";
    if (!orgName) return fallback;
    try {
      const orgData = await loadJson(orgFilePath);
      const orgRecord = findOrganizationRecord(orgData, orgName);
      const normalizedType = String(orgRecord?.number_type ?? "")
        .trim()
        .toLowerCase();
      const shouldUseAccountingNumber =
        normalizedType === "бухгалтерский номер";
      return {
        numberKey: shouldUseAccountingNumber ? "Бух.номер" : "Номер",
        numberLabel: shouldUseAccountingNumber ? "Бух.номер" : "Номер",
      };
    } catch (error) {
      console.warn("Не удалось определить тип номера организации.", error);
      return fallback;
    }
  };

  const updateToolsNumberConfig = ({ numberKey, numberLabel }) => {
    toolsState.numberKey = numberKey;
    toolsState.numberLabel = numberLabel;
    if (toolsSearchInput) {
      const searchLabel =
        numberLabel === "Бух.номер" ? "бух.номеру" : "номеру";
      toolsSearchInput.placeholder = `Поиск по ${searchLabel}, названию, модели...`;
    }
  };

  const resolveToolNumberValue = (tool) => {
    const primary = String(tool?.[toolsState.numberKey] ?? "").trim();
    if (primary) return primary;
    const fallbackKey = toolsState.numberKey === "Бух.номер" ? "Номер" : "Бух.номер";
    return String(tool?.[fallbackKey] ?? "").trim();
  };

  const resolveToolPhotoNumber = (tool) => {
    const byNumber = String(tool?.["Номер"] ?? "").trim();
    return byNumber || resolveToolNumberValue(tool);
  };

  const loadPendingMoves = async (orgFolder) => {
    const pendingNumbers = new Set();
    const pendingAccountingNumbers = new Set();
    if (!orgFolder) {
      return { pendingNumbers, pendingAccountingNumbers };
    }
    const movesPath = `./${orgFolder}/Перемещения.json`;
    try {
      const rawMoves = await loadJson(movesPath);
      const moves = Array.isArray(rawMoves)
        ? rawMoves
        : Array.isArray(rawMoves?.moves)
          ? rawMoves.moves
          : [];
      moves.forEach((move) => {
        const responseDate = String(move?.["Дата ответа"] ?? "").trim();
        if (responseDate) return;
        const number = String(move?.["Номер"] ?? "").trim();
        const accounting = String(move?.["Бух.номер"] ?? "").trim();
        if (number) pendingNumbers.add(number);
        if (accounting) pendingAccountingNumbers.add(accounting);
      });
    } catch (error) {
      console.warn("Не удалось загрузить перемещения.", error);
    }
    return { pendingNumbers, pendingAccountingNumbers };
  };

  const syncToolsViewButtons = () => {
    toolsViewButtons.forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.toolsView === toolsState.view
      );
    });
  };

  const clearToolsList = () => {
    if (toolsListEl) {
      toolsListEl.innerHTML = "";
    }
  };

  const renderToolCard = (tool, viewMode, orgFolder) => {
    const number = resolveToolNumberValue(tool);
    const photoNumber = resolveToolPhotoNumber(tool);
    const name = String(tool?.["Наименование"] ?? "").trim();
    const manufacturer = String(tool?.["Производитель"] ?? "").trim();
    const model = String(tool?.["Модель"] ?? "").trim();
    const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
    const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
    const hasPhoto = Number.isFinite(photoCount) && photoCount > 0;
    const isCompactMobile =
      viewMode === "compact" &&
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(max-width: 520px)").matches;
    const numberLine = number || "Без номера";
    const lineParts = [number, name, manufacturer, model].filter(Boolean);
    const fullLine = lineParts.join(" ");
    const infoLine = isCompactMobile ? numberLine : fullLine;
    const bodyLine = isCompactMobile ? numberLine : infoLine;

    if (viewMode === "list") {
      const row = document.createElement("div");
      row.className = "tools-row";
      row.classList.toggle("tools-row--no-photo", !hasPhoto);
      row.classList.toggle("is-selected", toolsState.selectedIds.has(tool.__selectionId));
      row.classList.toggle("tools-item--pending-response", tool.__pendingMove);
      row.dataset.toolsItem = "true";
      row.dataset.toolId = tool.__selectionId;
      const main = document.createElement("div");
      main.className = "tools-row__main";
      const title = document.createElement("div");
      title.className = "tools-row__title";
      title.textContent = infoLine || "Без названия";
      const meta = document.createElement("div");
      meta.className = "tools-row__meta";
      meta.textContent = [
        toolsState.numberKey === "Бух.номер" && accountingNumber === number
          ? ""
          : accountingNumber,
        tool?.["Граппа инструментов"],
        tool?.["Статус"],
        tool?.["Объект"],
      ]
        .filter((value) => value && String(value).trim())
        .join(" · ");
      main.append(title, meta);
      row.appendChild(main);
      if (!hasPhoto) {
        const badge = document.createElement("div");
        badge.className = "tools-row__badge";
        badge.textContent = "Без фото";
        row.appendChild(badge);
      }
      return row;
    }

    const card = document.createElement("div");
    card.className = "tools-card";
    card.classList.toggle("is-selected", toolsState.selectedIds.has(tool.__selectionId));
    card.classList.toggle("tools-item--pending-response", tool.__pendingMove);
    card.dataset.toolsItem = "true";
    card.dataset.toolId = tool.__selectionId;

    const media = document.createElement("div");
    media.className = "tools-card__media";
    const img = document.createElement("img");
    img.alt = infoLine || "Инструмент";

    const candidates = hasPhoto
      ? buildToolPhotoCandidates(orgFolder, photoNumber)
      : [];
    let candidateIndex = 0;
    const tryCandidate = () => {
      if (candidateIndex >= candidates.length) {
        img.onerror = null;
        img.onload = null;
        img.src = toolPhotoPlaceholder;
        return;
      }
      const next = candidates[candidateIndex];
      candidateIndex += 1;
      img.src = next;
    };
    img.onerror = () => {
      tryCandidate();
    };
    img.onload = () => {};
    if (candidates.length) {
      tryCandidate();
    } else {
      img.src = toolPhotoPlaceholder;
    }

    media.appendChild(img);

    if (!hasPhoto) {
      const badge = document.createElement("div");
      badge.className = "tools-card__badge";
      badge.textContent = "Нет фото";
      media.appendChild(badge);
    }

    if (viewMode === "large" || isCompactMobile) {
      const overlay = document.createElement("div");
      overlay.className = isCompactMobile
        ? "tools-card__overlay tools-card__overlay--compact"
        : "tools-card__overlay";
      const title = document.createElement("div");
      title.className = "tools-card__title";
      title.textContent = infoLine || "Без названия";
      overlay.appendChild(title);
      media.appendChild(overlay);
      if (viewMode === "large" || isCompactMobile) {
        card.appendChild(media);
        return card;
      }
    }

    const body = document.createElement("div");
    body.className = "tools-card__body";
    const title = document.createElement("div");
    title.className = "tools-card__title";
    title.textContent = bodyLine || "Без названия";
    body.appendChild(title);
    card.append(media, body);
    return card;
  };

  const renderToolsTable = (items) => {
    const table = document.createElement("div");
    table.className = "tools-table";

    items.forEach((tool) => {
      const row = document.createElement("div");
      row.className = "tools-table__row";
      row.classList.toggle("is-selected", toolsState.selectedIds.has(tool.__selectionId));
      row.classList.toggle("tools-item--pending-response", tool.__pendingMove);
      row.dataset.toolsItem = "true";
      row.dataset.toolId = tool.__selectionId;
      const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
      const hasPhoto = Number.isFinite(photoCount) && photoCount > 0;
      row.classList.toggle("tools-table__row--no-photo", !hasPhoto);
      const numberCell = document.createElement("div");
      numberCell.className = "tools-table__cell tools-table__cell--number";
      const number = resolveToolNumberValue(tool);
      const photoNumber = resolveToolPhotoNumber(tool);
      numberCell.textContent = number || "—";
      const infoCell = document.createElement("div");
      infoCell.className = "tools-table__cell";
      const title = document.createElement("div");
      title.className = "tools-table__title";
      const name = String(tool?.["Наименование"] ?? "").trim();
      title.textContent = name || "Без названия";
      const meta = document.createElement("div");
      meta.className = "tools-table__meta";
      const manufacturer = String(tool?.["Производитель"] ?? "").trim();
      const model = String(tool?.["Модель"] ?? "").trim();
      meta.textContent = [manufacturer, model].filter(Boolean).join(" · ") || "—";
      infoCell.append(title, meta);
      const photoCell = document.createElement("div");
      photoCell.className = "tools-table__cell tools-table__cell--thumb";
      const thumb = document.createElement("div");
      thumb.className = "tools-table__thumb";
      const img = document.createElement("img");
      img.className = "tools-table__thumb-image";
      img.alt = name || "Инструмент";
      const candidates = hasPhoto
        ? buildToolPhotoCandidates(toolsState.orgFolder, photoNumber)
        : [];
      let candidateIndex = 0;
      const tryCandidate = () => {
        if (candidateIndex >= candidates.length) {
          img.onerror = null;
          img.onload = null;
          img.src = toolPhotoPlaceholder;
          img.classList.add("is-placeholder");
          return;
        }
        const next = candidates[candidateIndex];
        candidateIndex += 1;
        img.src = next;
      };
      img.onerror = () => {
        tryCandidate();
      };
      img.onload = () => {
        img.classList.remove("is-placeholder");
      };
      if (candidates.length) {
        tryCandidate();
      } else {
        img.src = toolPhotoPlaceholder;
        img.classList.add("is-placeholder");
      }
      thumb.appendChild(img);
      photoCell.appendChild(thumb);
      row.append(numberCell, infoCell, photoCell);
      table.appendChild(row);
    });

    return table;
  };

  const renderToolsList = () => {
    if (!toolsListEl) return;
    clearToolsList();
    const viewMode = toolsState.view;
    toolsListEl.classList.toggle("is-large", viewMode === "large");
    toolsListEl.classList.toggle("is-compact", viewMode === "compact");
    toolsListEl.classList.toggle("is-list", viewMode === "list");
    toolsListEl.classList.toggle("is-table", viewMode === "table");
    const items = toolsState.filtered;
    if (viewMode === "table") {
      toolsListEl.appendChild(renderToolsTable(items));
    } else {
      items.forEach((tool) => {
        toolsListEl.appendChild(
          renderToolCard(tool, viewMode, toolsState.orgFolder)
        );
      });
    }
    if (toolsEmptyEl) {
      toolsEmptyEl.classList.toggle("is-hidden", items.length > 0);
    }
    setToolsSubtitle(
      `Показано ${items.length} из ${toolsState.tools.length}`
    );
    syncToolsViewButtons();
    updateToolsSelectionUi();
  };

  const applyToolsFilters = () => {
    const search = toolsState.search.trim();
    const tokens = search ? search.split(/\s+/).filter(Boolean) : [];
    toolsState.filtered = toolsState.tools.filter((tool) => {
      if (
        toolsState.filters.group &&
        String(tool?.["Граппа инструментов"] ?? "").trim() !==
          toolsState.filters.group
      ) {
        return false;
      }
      if (
        toolsState.filters.status &&
        String(tool?.["Статус"] ?? "").trim() !== toolsState.filters.status
      ) {
        return false;
      }
      if (
        toolsState.filters.object &&
        String(tool?.["Объект"] ?? "").trim() !== toolsState.filters.object
      ) {
        return false;
      }
      if (
        toolsState.filters.manufacturer &&
        String(tool?.["Производитель"] ?? "").trim() !==
          toolsState.filters.manufacturer
      ) {
        return false;
      }
      if (
        toolsState.filters.model &&
        String(tool?.["Модель"] ?? "").trim() !== toolsState.filters.model
      ) {
        return false;
      }
      if (toolsState.filters.photo) {
        const count = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
        const hasPhoto = Number.isFinite(count) && count > 0;
        if (toolsState.filters.photo === "with" && !hasPhoto) {
          return false;
        }
        if (toolsState.filters.photo === "without" && hasPhoto) {
          return false;
        }
      }
      if (tokens.length) {
        const searchLine = tool.__searchLine ?? "";
        return tokens.every((token) => searchLine.includes(token));
      }
      return true;
    });
    renderToolsList();
  };

  const fillToolsFilterOptions = (key, values) => {
    const selectEl = contentEl.querySelector(`[data-tools-filter="${key}"]`);
    if (!selectEl) return;
    selectEl.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "Все";
    selectEl.appendChild(allOption);
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      selectEl.appendChild(option);
    });
    selectEl.value = toolsState.filters[key] ?? "";
  };

  const prepareToolsFilters = () => {
    const collectValues = (field) => {
      const set = new Set();
      toolsState.tools.forEach((tool) => {
        const value = String(tool?.[field] ?? "").trim();
        if (value) set.add(value);
      });
      return Array.from(set).sort((a, b) =>
        a.localeCompare(b, "ru", { numeric: true })
      );
    };
    fillToolsFilterOptions("group", collectValues("Граппа инструментов"));
    fillToolsFilterOptions("status", collectValues("Статус"));
    fillToolsFilterOptions("object", collectValues("Объект"));
    fillToolsFilterOptions("manufacturer", collectValues("Производитель"));
    fillToolsFilterOptions("model", collectValues("Модель"));
    const photoSelect = contentEl.querySelector('[data-tools-filter="photo"]');
    if (photoSelect) {
      photoSelect.innerHTML = "";
      [
        { value: "", label: "Все" },
        { value: "with", label: "С фото" },
        { value: "without", label: "Без фото" },
      ].forEach((option) => {
        const opt = document.createElement("option");
        opt.value = option.value;
        opt.textContent = option.label;
        photoSelect.appendChild(opt);
      });
      photoSelect.value = toolsState.filters.photo ?? "";
    }
  };

  const loadUserTools = async () => {
    const orgFolder = context.orgFolderName ?? "";
    toolsState.orgFolder = orgFolder;
    if (!orgFolder) {
      toolsState.tools = [];
      toolsState.filtered = [];
      setToolsSubtitle("Не удалось определить организацию.");
      renderToolsList();
      return;
    }
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    let rawTools = [];
    try {
      const raw = await loadJson(toolsPath);
      rawTools = Array.isArray(raw) ? raw : Array.isArray(raw?.tools) ? raw.tools : [];
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов.", error);
      rawTools = [];
    }
    const userNameKey = normalizePersonName(user?.full_name ?? "");
    const { pendingNumbers, pendingAccountingNumbers } =
      await loadPendingMoves(orgFolder);
    toolsState.tools = rawTools
      .filter(
        (tool) =>
          normalizePersonName(tool?.["Ответственный"] ?? "") === userNameKey
      )
      .map((tool, index) => {
        const selectionId = buildToolSelectionId(tool, index);
        const number = String(tool?.["Номер"] ?? "").trim();
        const accounting = String(tool?.["Бух.номер"] ?? "").trim();
        const hasPendingMove =
          (number && pendingNumbers.has(number)) ||
          (accounting && pendingAccountingNumbers.has(accounting));
        return {
          ...tool,
          __searchLine: buildToolSearchLine(tool),
          __selectionId: selectionId,
          __pendingMove: hasPendingMove,
        };
      })
      .sort((a, b) =>
        resolveToolNumberValue(a).localeCompare(resolveToolNumberValue(b), "ru", {
          numeric: true,
        })
      );
    toolsState.toolMap = new Map(
      toolsState.tools.map((tool) => [tool.__selectionId, tool])
    );
    resetToolsSelection();
    prepareToolsFilters();
    applyToolsFilters();
  };

  const saveToolsViewPreference = async (view) => {
    try {
      const normalized = normalizeToolsView(view);
      const userSettings = context.settingsData.users?.[context.userKey] ?? {};
      context.settingsData.users[context.userKey] = {
        ...userSettings,
        energy: {
          ...(userSettings.energy ?? {}),
          toolsView: normalized,
        },
      };
      await saveJson(context.settingsPath, context.settingsData, {
        user: currentUser,
      });
    } catch (error) {
      console.warn("Не удалось сохранить вариант отображения инструментов.", error);
    }
  };

  const openToolsModal = async () => {
    if (!toolsModalEl) return;
    toolsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setToolsSubtitle("Загружаем список...");
    const numberConfig = await resolveToolsNumberConfig();
    updateToolsNumberConfig(numberConfig);
    await loadUserTools();
    syncToolsViewButtons();
    if (
      toolsSearchInput &&
      (typeof window === "undefined" ||
        !window.matchMedia ||
        !window.matchMedia("(max-width: 520px)").matches)
    ) {
      toolsSearchInput.focus();
    }
  };

  const closeToolsModal = () => {
    if (!toolsModalEl) return;
    toolsModalEl.classList.add("is-hidden");
    toolsModalEl.classList.remove("tools-modal--searching");
    document.body.style.overflow = "";
    resetToolsSelection();
    closeToolsMoveModal();
  };

  if (toolsBackdropEl) {
    toolsBackdropEl.addEventListener("click", closeToolsModal);
  }
  if (toolsCloseButton) {
    toolsCloseButton.addEventListener("click", closeToolsModal);
  }
  toolsModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeToolsModal();
    }
  });

  if (toolsSearchInput) {
    toolsSearchInput.addEventListener("input", (event) => {
      toolsState.search = String(event.target.value ?? "").toLowerCase();
      applyToolsFilters();
    });
  }

  const setToolsFiltersOpen = (isOpen) => {
    if (toolsFiltersPanelEl) {
      toolsFiltersPanelEl.classList.toggle("is-open", isOpen);
    }
    if (toolsFiltersToggleEl) {
      toolsFiltersToggleEl.setAttribute("aria-expanded", String(isOpen));
    }
  };

  if (toolsFiltersToggleEl) {
    toolsFiltersToggleEl.addEventListener("click", () => {
      const isOpen = toolsFiltersPanelEl?.classList.contains("is-open");
      setToolsFiltersOpen(!isOpen);
    });
  }

  if (typeof window !== "undefined" && toolsFiltersPanelEl) {
    const mediaQuery = window.matchMedia("(max-width: 520px)");
    const syncFiltersVisibility = () => {
      setToolsFiltersOpen(!mediaQuery.matches);
    };
    syncFiltersVisibility();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", syncFiltersVisibility);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(syncFiltersVisibility);
    }
  }

  toolsFilterEls.forEach((selectEl) => {
    selectEl.addEventListener("change", (event) => {
      const target = event.target;
      const key = target?.dataset?.toolsFilter;
      if (!key) return;
      toolsState.filters[key] = String(target.value ?? "");
      applyToolsFilters();
    });
  });

  toolsViewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.toolsView;
      if (!view) return;
      toolsState.view = normalizeToolsView(view);
      syncToolsViewButtons();
      renderToolsList();
      saveToolsViewPreference(view);
    });
  });

  function closeToolsMoveModal() {
    if (!toolsMoveModalEl) return;
    toolsMoveModalEl.classList.add("is-hidden");
    setToolsMoveMessage("");
  }

  const openToolsMoveModal = async () => {
    if (!toolsMoveModalEl) return;
    if (toolsState.selectedIds.size === 0) return;
    setToolsMoveMessage("");
    updateToolsSelectionUi();
    const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
    const orgName = findUserOrganizationName(user, usersData);
    const normalizeOrg = (value) => String(value ?? "").trim().toLowerCase();
    const orgKey = normalizeOrg(orgName);
    const currentUserName = normalizePersonName(user?.full_name ?? "");
    const currentTelegramId = normalizeTelegramId(user?.telegram_id);
    const userOptions = (usersData.users ?? [])
      .filter((entry) => normalizeOrg(entry.organization) === orgKey)
      .filter((entry) => {
        const sameTelegram =
          currentTelegramId &&
          normalizeTelegramId(entry.telegram_id) === currentTelegramId;
        const sameName =
          normalizePersonName(entry.full_name ?? "") === currentUserName;
        return !(sameTelegram || sameName);
      })
      .map((entry) => String(entry.full_name ?? "").trim())
      .filter(Boolean);

    toolsMoveState.responsibleOptions = userOptions.sort((a, b) =>
      a.localeCompare(b, "ru")
    );
    if (toolsMoveResponsibleInput) {
      toolsMoveResponsibleInput.value = "";
      updateToolsMoveSelectState(
        toolsMoveResponsibleInput,
        toolsMoveState.responsibleOptions,
        "Нет доступных пользователей"
      );
      toolsMoveResponsibleSuggestionsEl?.classList.add("is-hidden");
    }

    let objectOptions = [];
    try {
      const rawObjects = await loadJson(objectsPath);
      objectOptions = normalizeObjectsData(rawObjects)
        .map((item) => String(item?.name ?? "").trim())
        .filter(Boolean);
    } catch (error) {
      console.warn("Не удалось загрузить объекты для перемещения.", error);
    }

    toolsMoveState.objectOptions = objectOptions.sort((a, b) =>
      a.localeCompare(b, "ru")
    );
    if (toolsMoveObjectInput) {
      toolsMoveObjectInput.value = "";
      updateToolsMoveSelectState(
        toolsMoveObjectInput,
        toolsMoveState.objectOptions,
        "Нет объектов"
      );
      toolsMoveObjectSuggestionsEl?.classList.add("is-hidden");
    }

    toolsMoveModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  if (toolsMoveBackdropEl) {
    toolsMoveBackdropEl.addEventListener("click", closeToolsMoveModal);
  }
  if (toolsMoveCloseButton) {
    toolsMoveCloseButton.addEventListener("click", closeToolsMoveModal);
  }
  if (toolsMoveCancelButton) {
    toolsMoveCancelButton.addEventListener("click", closeToolsMoveModal);
  }

  if (toolsMoveButtonEl) {
    toolsMoveButtonEl.addEventListener("click", openToolsMoveModal);
  }
  if (toolsSelectionCancelButtonEl) {
    toolsSelectionCancelButtonEl.addEventListener("click", () => {
      resetToolsSelection();
      renderToolsList();
    });
  }

  if (toolsMoveFormEl) {
    toolsMoveFormEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      const responsibleRaw = String(
        toolsMoveResponsibleInput?.value ?? ""
      ).trim();
      const targetObjectRaw = String(toolsMoveObjectInput?.value ?? "").trim();
      const responsible = resolveMoveOptionMatch(
        responsibleRaw,
        toolsMoveState.responsibleOptions
      );
      const targetObject = resolveMoveOptionMatch(
        targetObjectRaw,
        toolsMoveState.objectOptions
      );
      if (!responsible || !targetObject) {
        setToolsMoveMessage("Выберите ответственного и объект.", "error");
        return;
      }

      const selectedTools = Array.from(toolsState.selectedIds)
        .map((id) => toolsState.toolMap.get(id))
        .filter(Boolean);
      if (!selectedTools.length) {
        setToolsMoveMessage("Сначала выберите инструменты.", "error");
        return;
      }

      const now = new Date();
      const eligibleEntries = [];
      const eligibleTools = [];
      let skippedCount = 0;

      selectedTools.forEach((tool) => {
        const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
        const hasAccountingNumber =
          accountingNumber &&
          accountingNumber.toLowerCase() !== "нет номера";
        const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
        const hasPhoto = Number.isFinite(photoCount) && photoCount > 0;
        if (!hasAccountingNumber || !hasPhoto) {
          skippedCount += 1;
          return;
        }
        eligibleTools.push(tool);
        eligibleEntries.push({
          Номер: String(tool?.["Номер"] ?? "").trim(),
          "Бух.номер": accountingNumber,
          "Дата перемещения": formatDateValue(now),
          "Дата ответа": "",
          Переместил: String(user?.full_name ?? "").trim(),
          Принял: responsible,
          "Старый объект": String(tool?.["Объект"] ?? "").trim(),
          "Новый объект": targetObject,
          Статус: String(tool?.["Статус"] ?? "").trim(),
        });
      });

      if (!eligibleEntries.length) {
        setToolsMoveMessage(
          "Для перемещения нужен бух.номер и хотя бы одно фото.",
          "error"
        );
        return;
      }

      const movesPath = `./${context.orgFolderName}/Перемещения.json`;
      let movesData = [];
      try {
        const rawMoves = await loadJson(movesPath);
        movesData = Array.isArray(rawMoves)
          ? rawMoves
          : Array.isArray(rawMoves?.moves)
            ? rawMoves.moves
            : [];
      } catch (error) {
        movesData = [];
      }

      const updatedMoves = [...movesData, ...eligibleEntries];
      try {
        await saveJson(movesPath, updatedMoves, { user });
        const message = skippedCount
          ? `Перемещение создано: ${eligibleEntries.length}. Пропущено: ${skippedCount}.`
          : `Перемещение создано: ${eligibleEntries.length}.`;
        setToolsMoveMessage(message, "success");
        const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
        const organizationName = findUserOrganizationName(user, usersData);
        const notificationResults = await Promise.all(
          eligibleTools.map((tool) =>
            notifyMoveTool({
              tool,
              orgFolder: context.orgFolderName,
              organizationName,
              responsibleName: responsible,
              targetObject,
              movedBy: String(user?.full_name ?? "").trim(),
            })
          )
        );
        const notificationStatus = analyzeNotificationResults(notificationResults);
        if (notificationStatus.summary) {
          setToolsMoveMessage(
            `${message} ${notificationStatus.summary}`,
            notificationStatus.allSent ? "success" : "error"
          );
        }
        if (notificationStatus.shouldHoldOnError) {
          return;
        }
        setTimeout(() => {
          closeToolsMoveModal();
          resetToolsSelection();
          renderToolsList();
        }, 600);
      } catch (error) {
        console.error(error);
        setToolsMoveMessage("Не удалось сохранить перемещение.", "error");
      }
    });
  }

  const toolsSelectState = {
    holdTimer: null,
    startX: 0,
    startY: 0,
    suppressClick: false,
  };

  const clearToolsHold = () => {
    if (toolsSelectState.holdTimer) {
      window.clearTimeout(toolsSelectState.holdTimer);
      toolsSelectState.holdTimer = null;
    }
  };

  if (toolsListEl) {
    toolsListEl.addEventListener("pointerdown", (event) => {
      if (toolsState.isSelecting) return;
      const item = event.target.closest("[data-tools-item]");
      if (!item) return;
      const tool = toolsState.toolMap.get(item.dataset.toolId);
      if (!isToolSelectableForMove(tool)) return;
      toolsSelectState.startX = event.clientX;
      toolsSelectState.startY = event.clientY;
      toolsSelectState.suppressClick = false;
      clearToolsHold();
      toolsSelectState.holdTimer = window.setTimeout(() => {
        toolsState.isSelecting = true;
        toolsState.selectedIds.add(item.dataset.toolId);
        item.classList.add("is-selected");
        toolsSelectState.suppressClick = true;
        updateToolsSelectionUi();
      }, event.pointerType === "touch" ? 320 : 240);
    });

    toolsListEl.addEventListener("pointermove", (event) => {
      if (!toolsSelectState.holdTimer) return;
      const moved =
        Math.abs(event.clientX - toolsSelectState.startX) > 8 ||
        Math.abs(event.clientY - toolsSelectState.startY) > 8;
      if (moved) {
        clearToolsHold();
      }
    });

    toolsListEl.addEventListener("pointerup", () => {
      clearToolsHold();
    });

    toolsListEl.addEventListener("pointercancel", () => {
      clearToolsHold();
    });

    toolsListEl.addEventListener("click", (event) => {
      const item = event.target.closest("[data-tools-item]");
      if (!item) return;
      if (toolsSelectState.suppressClick) {
        toolsSelectState.suppressClick = false;
        return;
      }
      if (!toolsState.isSelecting) return;
      const tool = toolsState.toolMap.get(item.dataset.toolId);
      if (!isToolSelectableForMove(tool)) return;
      const toolId = item.dataset.toolId;
      if (toolsState.selectedIds.has(toolId)) {
        toolsState.selectedIds.delete(toolId);
        item.classList.remove("is-selected");
      } else {
        toolsState.selectedIds.add(toolId);
        item.classList.add("is-selected");
      }
      if (toolsState.selectedIds.size === 0) {
        toolsState.isSelecting = false;
        renderToolsList();
        return;
      }
      updateToolsSelectionUi();
    });
  }
  const setAddPhotoSubtitle = (text) => {
    if (addPhotoSubtitleEl) {
      addPhotoSubtitleEl.textContent = text;
    }
  };

  const clearAddPhotoList = () => {
    if (addPhotoListEl) {
      addPhotoListEl.innerHTML = "";
    }
  };

  const renderAddPhotoTable = (items) => {
    const table = document.createElement("div");
    table.className = "tools-table tools-table--add-photo";

    items.forEach((tool) => {
      const row = document.createElement("div");
      row.className = "tools-table__row";

      const numberCell = document.createElement("div");
      numberCell.className = "tools-table__cell tools-table__cell--number";
      const number = String(tool?.["Номер"] ?? "").trim();
      numberCell.textContent = number || "—";
      row.dataset.addPhotoNumber = number;

      const infoCell = document.createElement("div");
      infoCell.className = "tools-table__cell";
      const title = document.createElement("div");
      title.className = "tools-table__title";
      const name = String(tool?.["Наименование"] ?? "").trim();
      title.textContent = name || "Без названия";

      const meta = document.createElement("div");
      meta.className = "tools-table__meta tools-table__meta--stack";
      const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
      const manufacturer = String(tool?.["Производитель"] ?? "").trim();
      const model = String(tool?.["Модель"] ?? "").trim();
      const purchaseDate = String(tool?.["Дата покупки"] ?? "").trim();

      const accountingLine = document.createElement("div");
      accountingLine.textContent = `Бух.номер: ${accountingNumber || "—"}`;
      const detailsLine = document.createElement("div");
      detailsLine.textContent = [
        `Производитель: ${manufacturer || "—"}`,
        `Модель: ${model || "—"}`,
        `Дата покупки: ${purchaseDate || "—"}`,
      ].join(" · ");
      meta.append(accountingLine, detailsLine);
      infoCell.append(title, meta);

      const photoCell = document.createElement("div");
      photoCell.className = "tools-table__cell tools-table__cell--thumb";
      const thumb = document.createElement("label");
      thumb.className = "tools-table__thumb tools-table__thumb--plus";
      thumb.setAttribute(
        "aria-label",
        number ? `Добавить фото для №${number}` : "Добавить фото"
      );
      const icon = document.createElement("span");
      icon.className = "tools-table__thumb-icon";
      icon.textContent = "+";
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.className = "tools-table__thumb-input";
      fileInput.addEventListener("change", async () => {
        const [file] = fileInput.files ?? [];
        if (!file) return;
        fileInput.value = "";
        await handleAddPhotoUpload(tool, file);
      });
      thumb.append(icon, fileInput);
      photoCell.appendChild(thumb);

      row.append(numberCell, infoCell, photoCell);
      table.appendChild(row);
    });

    return table;
  };

  const renderAddPhotoList = () => {
    if (!addPhotoListEl) return;
    clearAddPhotoList();
    addPhotoListEl.classList.add("is-table");
    const items = addPhotoState.filtered;
    addPhotoListEl.appendChild(renderAddPhotoTable(items));
    if (addPhotoEmptyEl) {
      addPhotoEmptyEl.classList.toggle("is-hidden", items.length > 0);
    }
    setAddPhotoSubtitle(
      `Показано ${items.length} из ${addPhotoState.tools.length}`
    );
  };

  const buildAddPhotoFileName = (toolNumber, file) => {
    const rawNumber = String(toolNumber ?? "").trim();
    const nameParts = String(file?.name ?? "").split(".");
    const nameExtension =
      nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
    let extension = nameExtension;
    if (!extension && file?.type) {
      const typeParts = file.type.split("/");
      extension = typeParts[typeParts.length - 1] ?? "";
    }
    const safeExtension = extension || "jpg";
    const suffix = buildRandomSuffix(4);
    const baseName = `${rawNumber}_${suffix}.${safeExtension}`;
    return sanitizePhotoFileName(baseName);
  };

  const loadToolsData = async (orgFolder) => {
    if (!orgFolder) return [];
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    try {
      const raw = await loadJson(toolsPath);
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.tools)) return raw.tools;
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов.", error);
    }
    return [];
  };

  const updateAddPhotoAfterSave = (toolNumber) => {
    const normalized = normalizeToolNumberValue(toolNumber);
    addPhotoState.tools = addPhotoState.tools.filter(
      (tool) =>
        normalizeToolNumberValue(tool?.["Номер"] ?? "") !== normalized
    );
    applyAddPhotoFilters();
  };

  const syncToolsPhotoCount = (toolNumber) => {
    const normalized = normalizeToolNumberValue(toolNumber);
    const updateTool = (tool) => {
      if (normalizeToolNumberValue(tool?.["Номер"] ?? "") !== normalized) {
        return tool;
      }
      const current = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
      const safeCurrent = Number.isFinite(current) ? current : 0;
      return { ...tool, "Количество фото": safeCurrent + 1 };
    };
    if (toolsState.tools.length) {
      toolsState.tools = toolsState.tools.map(updateTool);
      toolsState.filtered = toolsState.filtered.map(updateTool);
      if (toolsModalEl && !toolsModalEl.classList.contains("is-hidden")) {
        applyToolsFilters();
      }
    }
  };

  const handleAddPhotoUpload = async (tool, file) => {
    const toolNumber = String(tool?.["Номер"] ?? "").trim();
    if (!toolNumber) {
      setAddPhotoSubtitle("У инструмента нет номера для сохранения фото.");
      return;
    }
    const orgFolder = addPhotoState.orgFolder ?? "";
    if (!orgFolder) {
      setAddPhotoSubtitle("Не удалось определить организацию.");
      return;
    }

    setAddPhotoSubtitle("Загружаем фото...");

    try {
      const tools = await loadToolsData(orgFolder);
      if (!tools.length) {
        setAddPhotoSubtitle("Не найдена база инструментов.");
        return;
      }
      const normalized = normalizeToolNumberValue(toolNumber);
      const toolIndex = tools.findIndex(
        (entry) =>
          normalizeToolNumberValue(entry?.["Номер"] ?? "") === normalized
      );
      if (toolIndex < 0) {
        setAddPhotoSubtitle("Инструмент не найден в базе.");
        return;
      }

      const safeName = buildAddPhotoFileName(toolNumber, file);
      const content = await readFileAsBase64(file);
      const photoEntry = {
        type: "file",
        path: `${orgFolder}/Фото инструментов/${safeName}`,
        content,
        encoding: "base64",
        mime: file.type || "image/*",
        ...buildUploadUserMeta({ organizationName: context.orgFullName }),
      };
      await uploadPhotoEntriesInBatches([photoEntry]);

      const current = Number.parseInt(tools[toolIndex]?.["Количество фото"] ?? 0, 10);
      const safeCurrent = Number.isFinite(current) ? current : 0;
      const updatedTool = {
        ...tools[toolIndex],
        "Количество фото": safeCurrent + 1,
      };
      const updatedTools = [...tools];
      updatedTools[toolIndex] = updatedTool;
      await saveEntries([
        {
          path: `${orgFolder}/База с инструментами.json`,
          data: updatedTools,
          ...buildUploadUserMeta({ organizationName: context.orgFullName }),
        },
      ]);

      updateAddPhotoAfterSave(toolNumber);
      syncToolsPhotoCount(toolNumber);
      setAddPhotoSubtitle(`Фото сохранено для №${toolNumber}.`);
    } catch (error) {
      console.error(error);
      const reason =
        error instanceof Error && error.message
          ? `Причина: ${error.message}`
          : "Не удалось определить причину.";
      setAddPhotoSubtitle(`Не удалось загрузить фото. ${reason}`);
      setTimeout(() => {
        applyAddPhotoFilters();
      }, 2500);
    }
  };

  const applyAddPhotoFilters = () => {
    const search = addPhotoState.search.trim();
    const tokens = search ? search.split(/\s+/).filter(Boolean) : [];
    addPhotoState.filtered = addPhotoState.tools.filter((tool) => {
      if (
        addPhotoState.filters.group &&
        String(tool?.["Граппа инструментов"] ?? "").trim() !==
          addPhotoState.filters.group
      ) {
        return false;
      }
      if (
        addPhotoState.filters.status &&
        String(tool?.["Статус"] ?? "").trim() !== addPhotoState.filters.status
      ) {
        return false;
      }
      if (
        addPhotoState.filters.object &&
        String(tool?.["Объект"] ?? "").trim() !== addPhotoState.filters.object
      ) {
        return false;
      }
      if (
        addPhotoState.filters.manufacturer &&
        String(tool?.["Производитель"] ?? "").trim() !==
          addPhotoState.filters.manufacturer
      ) {
        return false;
      }
      if (
        addPhotoState.filters.model &&
        String(tool?.["Модель"] ?? "").trim() !== addPhotoState.filters.model
      ) {
        return false;
      }
      if (tokens.length) {
        const searchLine = tool.__searchLine ?? "";
        return tokens.every((token) => searchLine.includes(token));
      }
      return true;
    });
    renderAddPhotoList();
  };

  const fillAddPhotoFilterOptions = (key, values) => {
    const selectEl = contentEl.querySelector(
      `[data-add-photo-filter="${key}"]`
    );
    if (!selectEl) return;
    selectEl.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "Все";
    selectEl.appendChild(allOption);
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      selectEl.appendChild(option);
    });
    selectEl.value = addPhotoState.filters[key] ?? "";
  };

  const prepareAddPhotoFilters = () => {
    const collectValues = (field) => {
      const set = new Set();
      addPhotoState.tools.forEach((tool) => {
        const value = String(tool?.[field] ?? "").trim();
        if (value) set.add(value);
      });
      return Array.from(set).sort((a, b) =>
        a.localeCompare(b, "ru", { numeric: true })
      );
    };
    fillAddPhotoFilterOptions("group", collectValues("Граппа инструментов"));
    fillAddPhotoFilterOptions("status", collectValues("Статус"));
    fillAddPhotoFilterOptions("object", collectValues("Объект"));
    fillAddPhotoFilterOptions("manufacturer", collectValues("Производитель"));
    fillAddPhotoFilterOptions("model", collectValues("Модель"));
  };

  const loadAddPhotoTools = async () => {
    const orgFolder = context.orgFolderName ?? "";
    addPhotoState.orgFolder = orgFolder;
    if (!orgFolder) {
      addPhotoState.tools = [];
      addPhotoState.filtered = [];
      setAddPhotoSubtitle("Не удалось определить организацию.");
      renderAddPhotoList();
      return;
    }
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    let rawTools = [];
    try {
      const raw = await loadJson(toolsPath);
      rawTools = Array.isArray(raw) ? raw : Array.isArray(raw?.tools) ? raw.tools : [];
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов.", error);
      rawTools = [];
    }
    addPhotoState.tools = rawTools
      .filter((tool) => {
        const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
        return !(Number.isFinite(photoCount) && photoCount > 0);
      })
      .map((tool) => ({
        ...tool,
        __searchLine: buildAddPhotoSearchLine(tool),
      }))
      .sort((a, b) =>
        String(a?.["Номер"] ?? "").localeCompare(String(b?.["Номер"] ?? ""), "ru", {
          numeric: true,
        })
      );
    prepareAddPhotoFilters();
    applyAddPhotoFilters();
  };

  const openAddPhotoModal = async () => {
    if (!addPhotoModalEl) return;
    addPhotoModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setAddPhotoSubtitle("Загружаем список...");
    await loadAddPhotoTools();
    if (
      addPhotoSearchInput &&
      (typeof window === "undefined" ||
        !window.matchMedia ||
        !window.matchMedia("(max-width: 520px)").matches)
    ) {
      addPhotoSearchInput.focus();
    }
  };

  const closeAddPhotoModal = () => {
    if (!addPhotoModalEl) return;
    addPhotoModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
  };

  if (addPhotoBackdropEl) {
    addPhotoBackdropEl.addEventListener("click", closeAddPhotoModal);
  }
  if (addPhotoCloseButton) {
    addPhotoCloseButton.addEventListener("click", closeAddPhotoModal);
  }
  addPhotoModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAddPhotoModal();
    }
  });

  if (addPhotoSearchInput) {
    addPhotoSearchInput.addEventListener("input", (event) => {
      addPhotoState.search = String(event.target.value ?? "").toLowerCase();
      applyAddPhotoFilters();
    });
  }

  const setAddPhotoFiltersOpen = (isOpen) => {
    if (addPhotoFiltersPanelEl) {
      addPhotoFiltersPanelEl.classList.toggle("is-open", isOpen);
    }
    if (addPhotoFiltersToggleEl) {
      addPhotoFiltersToggleEl.setAttribute("aria-expanded", String(isOpen));
    }
  };

  if (addPhotoFiltersToggleEl) {
    addPhotoFiltersToggleEl.addEventListener("click", () => {
      const isOpen = addPhotoFiltersPanelEl?.classList.contains("is-open");
      setAddPhotoFiltersOpen(!isOpen);
    });
  }

  if (typeof window !== "undefined" && addPhotoFiltersPanelEl) {
    const mediaQuery = window.matchMedia("(max-width: 520px)");
    const syncFiltersVisibility = () => {
      setAddPhotoFiltersOpen(!mediaQuery.matches);
    };
    syncFiltersVisibility();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", syncFiltersVisibility);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(syncFiltersVisibility);
    }
  }

  addPhotoFilterEls.forEach((selectEl) => {
    selectEl.addEventListener("change", (event) => {
      const target = event.target;
      const key = target?.dataset?.addPhotoFilter;
      if (!key) return;
      addPhotoState.filters[key] = String(target.value ?? "");
      applyAddPhotoFilters();
    });
  });
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
    users.forEach((entry) => {
      const fullName = String(entry?.full_name ?? "").trim();
      if (!fullName) return;
      const { firstName, middleName } = parseUserNameParts(fullName);
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

  const attachDynamicSuggestions = ({
    inputEl,
    containerEl,
    getItems,
    showOnFocus = false,
  }) => {
    if (!inputEl || !containerEl) return;
    const update = () => {
      const items = getItems(inputEl.value);
      renderSuggestions(containerEl, items, inputEl);
    };
    const hide = () => {
      containerEl.classList.add("is-hidden");
    };
    inputEl.addEventListener("input", () => {
      if (!inputEl.value.trim() && !showOnFocus) {
        hide();
        return;
      }
      update();
    });
    inputEl.addEventListener("focus", () => {
      if (showOnFocus || inputEl.value.trim()) {
        update();
      }
    });
    inputEl.addEventListener("blur", () => {
      setTimeout(hide, 120);
    });
  };

  const normalizeSuggestionValue = (value = "") => String(value ?? "").trim();

  const sanitizePhotoFileName = (name = "") => {
    const trimmed = String(name).trim();
    const cleaned = trimmed.replace(/[\\/:"*?<>|]+/g, "_");
    return cleaned.replace(/\s+/g, " ").trim();
  };

  const buildRandomSuffix = (length = 3) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let index = 0; index < length; index += 1) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  };

  const buildCommonSuggestions = (values, limit = 6) => {
    const counts = new Map();
    values.forEach((value) => {
      const normalized = normalizeSuggestionValue(value);
      if (!normalized) return;
      const key = normalized.toLowerCase();
      const entry = counts.get(key) ?? { value: normalized, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    });
    return Array.from(counts.values())
      .sort(
        (a, b) =>
          b.count - a.count || a.value.localeCompare(b.value, "ru")
      )
      .slice(0, limit)
      .map((item) => item.value);
  };

  const filterSuggestions = (values, query, limit = 6) => {
    const safeQuery = normalizeSuggestionValue(query).toLowerCase();
    if (!safeQuery) return [];
    const counts = new Map();
    values.forEach((value) => {
      const normalized = normalizeSuggestionValue(value);
      if (!normalized) return;
      const key = normalized.toLowerCase();
      const entry = counts.get(key) ?? { value: normalized, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    });
    return Array.from(counts.values())
      .filter((item) => item.value.toLowerCase().startsWith(safeQuery))
      .sort(
        (a, b) =>
          b.count - a.count || a.value.localeCompare(b.value, "ru")
      )
      .slice(0, limit)
      .map((item) => item.value);
  };

  const filterSelectableOptions = (options, query, limit = 8) => {
    const safeQuery = normalizeSuggestionValue(query).toLowerCase();
    if (!safeQuery) return options.slice(0, limit);
    return options
      .filter((item) => item.toLowerCase().includes(safeQuery))
      .slice(0, limit);
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

  const setAddToolMessage = (
    message = "",
    { tone = "info", asList = false } = {}
  ) => {
    if (!addToolMessageEl) return;
    addToolMessageEl.classList.remove("is-error", "is-success", "is-info");
    addToolMessageEl.classList.add(`is-${tone}`);
    addToolMessageEl.innerHTML = "";
    if (asList) {
      const list = document.createElement("ul");
      list.className = "form-message__list";
      message
        .filter(Boolean)
        .forEach((item) => {
          const listItem = document.createElement("li");
          listItem.textContent = item;
          list.appendChild(listItem);
        });
      addToolMessageEl.appendChild(list);
      return;
    }
    addToolMessageEl.textContent = message;
  };
  const scrollAddToolFooterIntoView = () => {
    const footerEl = addToolFormEl?.querySelector(".settings-modal__footer");
    if (!footerEl) return;
    footerEl.scrollIntoView({ behavior: "smooth", block: "end" });
  };
  const reportAddToolIssue = (message, { asList = false } = {}) => {
    setAddToolMessage(message, { tone: "error", asList });
    scrollAddToolFooterIntoView();
  };
  const resolveAddToolNumberLabel = () => {
    const normalized = String(addToolState.numberType ?? "").trim().toLowerCase();
    return normalized === "бухгалтерский номер" ? "Бух.номер" : "номер";
  };
  const resolveAddToolNumberLabelCapitalized = () => {
    const normalized = String(addToolState.numberType ?? "").trim().toLowerCase();
    return normalized === "бухгалтерский номер" ? "Бух.номер" : "Номер";
  };
  const isAddToolAccountingNumber = () =>
    resolveAddToolNumberLabelCapitalized() === "Бух.номер";
  const closeAddToolSuccessModal = () => {
    if (!addToolSuccessModalEl) return;
    addToolSuccessModalEl.classList.add("is-hidden");
  };
  const openAddToolSuccessModal = ({ toolNumber, accountingNumber } = {}) => {
    if (!addToolSuccessModalEl) return;
    const numberLabel = resolveAddToolNumberLabelCapitalized();
    const isAccounting = numberLabel === "Бух.номер";
    const displayNumber = isAccounting ? accountingNumber : toolNumber;
    if (addToolSuccessTitleEl) {
      addToolSuccessTitleEl.textContent = isAccounting
        ? "Все готово!"
        : "Готово!";
    }
    if (addToolSuccessMessageEl) {
      addToolSuccessMessageEl.textContent = isAccounting
        ? `Присвоен Бух.номер ${displayNumber ?? "—"}.`
        : "Новая позиция добавлена в базу";
    }
    if (addToolSuccessLabelEl) {
      addToolSuccessLabelEl.textContent = `Присвоенный ${numberLabel}`;
    }
    if (addToolSuccessNumberEl) {
      addToolSuccessNumberEl.textContent = String(displayNumber ?? "—");
    }
    addToolSuccessModalEl.classList.remove("is-hidden");
  };

  const clearAddToolFieldErrors = () => {
    addToolFormEl
      ?.querySelectorAll(".form-field.is-invalid")
      .forEach((field) => field.classList.remove("is-invalid"));
  };

  const markAddToolFieldError = (target) => {
    const field = target?.closest?.(".form-field");
    if (field) {
      field.classList.add("is-invalid");
    }
  };

  const getToolValues = (
    key,
    {
      nameFilter = "",
      manufacturerFilter = "",
      nameMatchMode = "startsWith",
      manufacturerMatchMode = "startsWith",
    } = {}
  ) => {
    const normalizedName = normalizeSuggestionValue(nameFilter).toLowerCase();
    const normalizedManufacturer =
      normalizeSuggestionValue(manufacturerFilter).toLowerCase();
    const matchesFilter = (value, filter, mode = "startsWith") => {
      if (!filter) return true;
      const normalizedValue = normalizeSuggestionValue(value).toLowerCase();
      if (mode === "equals") return normalizedValue === filter;
      if (mode === "includes") return normalizedValue.includes(filter);
      return normalizedValue.startsWith(filter);
    };
    return addToolState.tools
      .filter((tool) => {
        if (
          !matchesFilter(
            tool?.["Наименование"] ?? "",
            normalizedName,
            nameMatchMode
          ) ||
          !matchesFilter(
            tool?.["Производитель"] ?? "",
            normalizedManufacturer,
            manufacturerMatchMode
          )
        ) {
          return false;
        }
        return true;
      })
      .map((tool) => normalizeSuggestionValue(tool?.[key] ?? ""))
      .filter(Boolean);
  };

  const getToolNameSuggestions = (query) => {
    if (!normalizeSuggestionValue(query)) return [];
    return filterSuggestions(getToolValues("Наименование"), query, 6);
  };

  const getToolManufacturerSuggestions = (query) => {
    const rawName = addToolNameInput?.value ?? "";
    const normalizedName = normalizeSuggestionValue(rawName).toLowerCase();
    const hasExactNameMatch = normalizedName
      ? addToolState.tools.some((tool) => {
          const name = normalizeSuggestionValue(tool?.["Наименование"] ?? "");
          return name.toLowerCase() === normalizedName;
        })
      : false;
    const values = getToolValues("Производитель", {
      nameFilter: rawName,
      nameMatchMode: hasExactNameMatch ? "equals" : "startsWith",
    });
    if (!normalizeSuggestionValue(query)) {
      return buildCommonSuggestions(values, 6);
    }
    return filterSuggestions(values, query, 6);
  };

  const getToolModelSuggestions = (query) => {
    const values = getToolValues("Модель", {
      nameFilter: addToolNameInput?.value ?? "",
      manufacturerFilter: addToolManufacturerInput?.value ?? "",
    });
    if (!normalizeSuggestionValue(query)) {
      return buildCommonSuggestions(values, 6);
    }
    return filterSuggestions(values, query, 6);
  };

  const getSelectableSuggestions = (options, query) =>
    filterSelectableOptions(options, query, 8);

  attachDynamicSuggestions({
    inputEl: addToolNameInput,
    containerEl: addToolNameSuggestionsEl,
    getItems: getToolNameSuggestions,
  });

  attachDynamicSuggestions({
    inputEl: addToolManufacturerInput,
    containerEl: addToolManufacturerSuggestionsEl,
    getItems: getToolManufacturerSuggestions,
    showOnFocus: true,
  });

  const refreshManufacturerSuggestions = () => {
    if (!addToolManufacturerInput || !addToolManufacturerSuggestionsEl) return;
    if (
      !addToolManufacturerInput.value.trim() &&
      document.activeElement !== addToolManufacturerInput
    ) {
      addToolManufacturerSuggestionsEl.classList.add("is-hidden");
      return;
    }
    const items = getToolManufacturerSuggestions(
      addToolManufacturerInput.value
    );
    renderSuggestions(
      addToolManufacturerSuggestionsEl,
      items,
      addToolManufacturerInput
    );
  };

  addToolNameInput?.addEventListener("input", refreshManufacturerSuggestions);

  attachDynamicSuggestions({
    inputEl: addToolModelInput,
    containerEl: addToolModelSuggestionsEl,
    getItems: getToolModelSuggestions,
    showOnFocus: true,
  });

  attachDynamicSuggestions({
    inputEl: addToolResponsibleInput,
    containerEl: addToolResponsibleSuggestionsEl,
    getItems: (query) =>
      getSelectableSuggestions(addToolState.responsibleOptions, query),
    showOnFocus: true,
  });

  attachDynamicSuggestions({
    inputEl: addToolObjectInput,
    containerEl: addToolObjectSuggestionsEl,
    getItems: (query) =>
      getSelectableSuggestions(addToolState.objectOptions, query),
    showOnFocus: true,
  });

  attachDynamicSuggestions({
    inputEl: addToolGroupInput,
    containerEl: addToolGroupSuggestionsEl,
    getItems: (query) =>
      getSelectableSuggestions(addToolState.groupOptions, query),
    showOnFocus: true,
  });

  attachDynamicSuggestions({
    inputEl: toolsMoveResponsibleInput,
    containerEl: toolsMoveResponsibleSuggestionsEl,
    getItems: (query) =>
      getSelectableSuggestions(toolsMoveState.responsibleOptions, query),
    showOnFocus: true,
  });

  attachDynamicSuggestions({
    inputEl: toolsMoveObjectInput,
    containerEl: toolsMoveObjectSuggestionsEl,
    getItems: (query) =>
      getSelectableSuggestions(toolsMoveState.objectOptions, query),
    showOnFocus: true,
  });

  const updateAddToolSelectState = (inputEl, options, emptyPlaceholder) => {
    if (!inputEl) return;
    const basePlaceholder =
      inputEl.dataset.placeholder ?? "Выберите значение";
    if (options.length) {
      inputEl.disabled = false;
      inputEl.placeholder = basePlaceholder;
      return;
    }
    inputEl.disabled = true;
    inputEl.placeholder = emptyPlaceholder;
    inputEl.value = "";
  };

  const updateToolsMoveSelectState = (inputEl, options, emptyPlaceholder) => {
    if (!inputEl) return;
    const basePlaceholder =
      inputEl.dataset.placeholder ?? "Выберите значение";
    if (options.length) {
      inputEl.disabled = false;
      inputEl.placeholder = basePlaceholder;
      return;
    }
    inputEl.disabled = true;
    inputEl.placeholder = emptyPlaceholder;
    inputEl.value = "";
  };

  const normalizeMoveOption = (value = "") =>
    String(value ?? "").trim().toLowerCase();

  const resolveMoveOptionMatch = (value, options) => {
    const normalized = normalizeMoveOption(value);
    if (!normalized) return "";
    return (
      options.find((option) => normalizeMoveOption(option) === normalized) ?? ""
    );
  };

  const updateAddToolFilledStates = () => {
    if (!addToolFormEl) return;
    const fields = addToolFormEl.querySelectorAll(".form-field");
    fields.forEach((field) => {
      const inputs = field.querySelectorAll("input, textarea, select");
      let hasValue = false;
      inputs.forEach((input) => {
        if (
          !(
            input instanceof HTMLInputElement ||
            input instanceof HTMLTextAreaElement ||
            input instanceof HTMLSelectElement
          )
        ) {
          return;
        }
        if (input.type === "file") {
          if (input.files && input.files.length > 0) {
            hasValue = true;
          }
          return;
        }
        if (input.type === "checkbox" || input.type === "radio") {
          if (input.checked) {
            hasValue = true;
          }
          return;
        }
        if (String(input.value).trim() !== "") {
          hasValue = true;
        }
      });
      field.classList.toggle("is-filled", hasValue);
    });

    const fileOptions = addToolFormEl.querySelectorAll(".form-file-option");
    fileOptions.forEach((option) => {
      const fileInput = option.querySelector('input[type="file"]');
      const isFilled =
        fileInput instanceof HTMLInputElement &&
        fileInput.files &&
        fileInput.files.length > 0;
      option.classList.toggle("is-filled", isFilled);
    });
  };

  let addToolCameraStream = null;
  let addToolCameraBlob = null;
  let bypassAddToolCameraPicker = false;

  const resetAddToolCameraUI = () => {
    if (addToolCameraVideoEl) {
      addToolCameraVideoEl.classList.remove("is-hidden");
    }
    if (addToolCameraCanvasEl) {
      addToolCameraCanvasEl.classList.add("is-hidden");
    }
    addToolCameraCaptureButton?.classList.remove("is-hidden");
    addToolCameraRetakeButton?.classList.add("is-hidden");
    addToolCameraSaveButton?.classList.add("is-hidden");
    addToolCameraBlob = null;
  };

  const stopAddToolCameraStream = () => {
    if (addToolCameraStream) {
      addToolCameraStream.getTracks().forEach((track) => track.stop());
      addToolCameraStream = null;
    }
    if (addToolCameraVideoEl) {
      addToolCameraVideoEl.srcObject = null;
    }
  };

  const openAddToolCameraModal = async () => {
    if (!addToolCameraModalEl) return false;
    addToolCameraModalEl.classList.remove("is-hidden");
    resetAddToolCameraUI();
    try {
      addToolCameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (addToolCameraVideoEl) {
        addToolCameraVideoEl.srcObject = addToolCameraStream;
        await addToolCameraVideoEl.play();
      }
      return true;
    } catch (error) {
      console.warn("Не удалось открыть камеру для накладной.", error);
      stopAddToolCameraStream();
      addToolCameraModalEl.classList.add("is-hidden");
      return false;
    }
  };

  const closeAddToolCameraModal = () => {
    if (!addToolCameraModalEl) return;
    addToolCameraModalEl.classList.add("is-hidden");
    stopAddToolCameraStream();
    resetAddToolCameraUI();
  };

  const captureAddToolCameraFrame = () => {
    if (!addToolCameraVideoEl || !addToolCameraCanvasEl) return;
    const width = addToolCameraVideoEl.videoWidth;
    const height = addToolCameraVideoEl.videoHeight;
    if (!width || !height) return;
    addToolCameraCanvasEl.width = width;
    addToolCameraCanvasEl.height = height;
    const context = addToolCameraCanvasEl.getContext("2d");
    if (!context) return;
    context.drawImage(addToolCameraVideoEl, 0, 0, width, height);
    addToolCameraCanvasEl.classList.remove("is-hidden");
    addToolCameraVideoEl.classList.add("is-hidden");
    addToolCameraCaptureButton?.classList.add("is-hidden");
    addToolCameraRetakeButton?.classList.remove("is-hidden");
    addToolCameraSaveButton?.classList.remove("is-hidden");
    addToolCameraCanvasEl.toBlob(
      (blob) => {
        addToolCameraBlob = blob;
      },
      "image/jpeg",
      0.92
    );
  };

  const applyAddToolCameraSnapshot = () => {
    if (!addToolInvoicePhotoInput || !addToolCameraBlob) return;
    const fileName = `invoice_photo_${Date.now()}.jpg`;
    const photoFile = new File([addToolCameraBlob], fileName, {
      type: addToolCameraBlob.type || "image/jpeg",
    });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(photoFile);
    addToolInvoicePhotoInput.files = dataTransfer.files;
    addToolInvoicePhotoInput.dispatchEvent(
      new Event("change", { bubbles: true })
    );
    updateAddToolFilledStates();
    closeAddToolCameraModal();
  };

  const resetAddToolForm = () => {
    addToolFormEl?.reset();
    setAddToolMessage("", { tone: "info" });
    clearAddToolFieldErrors();
    addToolNameSuggestionsEl?.classList.add("is-hidden");
    addToolManufacturerSuggestionsEl?.classList.add("is-hidden");
    addToolModelSuggestionsEl?.classList.add("is-hidden");
    addToolResponsibleSuggestionsEl?.classList.add("is-hidden");
    addToolObjectSuggestionsEl?.classList.add("is-hidden");
    addToolGroupSuggestionsEl?.classList.add("is-hidden");
    updateAddToolFilledStates();
  };

  const updateAddToolAccountingRequirement = () => {
    if (!addToolAccountingNumberInput) return;
    if (!addToolAccountingNumberInput.dataset.placeholder) {
      addToolAccountingNumberInput.dataset.placeholder =
        addToolAccountingNumberInput.placeholder;
    }
    const isRequired = isAddToolAccountingNumber();
    addToolAccountingNumberInput.required = isRequired;
    addToolAccountingNumberInput.placeholder = isRequired
      ? "Введите Бух.номер"
      : addToolAccountingNumberInput.dataset.placeholder || "Можно оставить пустым";
    const field = addToolAccountingNumberInput.closest(".form-field");
    field?.classList.toggle("form-field--required", isRequired);
  };

  const buildNextToolNumber = (tools) => {
    let maxValue = 0;
    tools.forEach((tool) => {
      const raw = String(tool?.["Номер"] ?? "").replace(/\D/g, "");
      if (raw.length !== 5) return;
      const numeric = Number.parseInt(raw, 10);
      if (Number.isFinite(numeric) && numeric > maxValue) {
        maxValue = numeric;
      }
    });
    const nextValue = maxValue + 1;
    return String(nextValue).padStart(5, "0");
  };

  const buildInvoiceFileName = (toolNumber, dateValue, originalName = "") => {
    const extension = originalName.includes(".")
      ? originalName.split(".").pop()
      : "";
    const randomSuffix = buildRandomSuffix(3);
    const baseName = `${toolNumber}_${dateValue}_${randomSuffix}`;
    const rawName = extension ? `${baseName}.${extension}` : baseName;
    return sanitizePhotoFileName(rawName);
  };

  const findOptionMatch = (value, options) => {
    const normalized = normalizeSuggestionValue(value).toLowerCase();
    if (!normalized) return "";
    const match = options.find(
      (item) => item.toLowerCase() === normalized
    );
    return match ?? "";
  };

  const buildAddToolErrorMessage = (issues, prefix = "Не удалось загрузить данные.") => {
    if (!issues.length) return prefix;
    return `${prefix} ${issues.join(" ")}`.trim();
  };

  const formatSaveResponseMessage = (responseText) => {
    const raw = String(responseText ?? "").trim();
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.message) return String(parsed.message).trim();
      if (parsed?.error) return String(parsed.error).trim();
      if (parsed?.success === true) return "успешно";
      if (typeof parsed === "string") return parsed.trim();
      return JSON.stringify(parsed);
    } catch (error) {
      return raw;
    }
  };

  const buildSaveResponseSuffix = (responseText) => {
    const message = formatSaveResponseMessage(responseText);
    if (!message) return "";
    const normalized = message.endsWith(".") ? message : `${message}.`;
    return ` Ответ сервера: ${normalized}`;
  };

  const resolveAddToolOrganization = async () => {
    const issues = [];
    const telegramId = normalizeTelegramId(user?.telegram_id ?? user?.telegramId ?? null);
    const fullName = String(user?.full_name ?? user?.fullName ?? "").trim();

    if (!telegramId && !fullName) {
      issues.push("Не хватает данных пользователя (telegram_id или ФИО).");
    }

    let usersData = null;
    try {
      usersData = await loadJson(usersFilePath);
    } catch (error) {
      issues.push("Не удалось загрузить users.json.");
    }

    const usersList = Array.isArray(usersData?.users) ? usersData.users : [];
    let matchedUser = null;
    if (telegramId && fullName) {
      matchedUser = usersList.find(
        (item) =>
          normalizeTelegramId(item?.telegram_id ?? null) === telegramId &&
          String(item?.full_name ?? "").trim() === fullName
      );
    }
    if (!matchedUser && telegramId) {
      matchedUser = usersList.find(
        (item) => normalizeTelegramId(item?.telegram_id ?? null) === telegramId
      );
    }
    if (!matchedUser && fullName) {
      matchedUser = usersList.find(
        (item) => String(item?.full_name ?? "").trim() === fullName
      );
    }

    if (!matchedUser) {
      issues.push("Пользователь не найден в users.json.");
    }

    const organizationName = String(matchedUser?.organization ?? "").trim();
    if (!organizationName) {
      issues.push("В users.json у пользователя не указана организация.");
    }

    let orgsData = null;
    try {
      orgsData = await loadJson(orgFilePath);
    } catch (error) {
      issues.push("Не удалось загрузить organizations.json.");
    }

    const orgsList = Array.isArray(orgsData?.organizations)
      ? orgsData.organizations
      : [];
    const orgRecord = findOrganizationRecord(
      { organizations: orgsList },
      organizationName
    );
    if (organizationName && !orgRecord) {
      issues.push(
        `Организация "${organizationName}" не найдена в organizations.json.`
      );
    }

    const orgShortName = String(orgRecord?.short_name ?? "").trim();
    if (organizationName && !orgShortName) {
      issues.push(
        `В organizations.json нет short_name для "${organizationName}".`
      );
    }

    const orgFolder = sanitizeOrganizationFolderName(orgShortName);
    if (orgShortName && !orgFolder) {
      issues.push("Не удалось определить папку организации по short_name.");
    }

    return {
      organizationName,
      orgShortName,
      orgFolder,
      numberType: String(orgRecord?.number_type ?? "Номер приложения").trim(),
      issues,
    };
  };

  const loadAddToolReferences = async () => {
    setAddToolMessage("Загружаем данные...", { tone: "info" });
    try {
      const settle = (promise) =>
        promise.then(
          (value) => ({ status: "fulfilled", value }),
          (reason) => ({ status: "rejected", reason })
        );
      const resolution = await resolveAddToolOrganization();
      if (resolution.issues.length) {
        reportAddToolIssue(
          buildAddToolErrorMessage(
            resolution.issues,
            "Не удалось определить организацию пользователя."
          ),
          { asList: false }
        );
        return;
      }

      const organizationName = resolution.organizationName;
      const orgFolder = resolution.orgFolder;

      addToolState.organizationName = organizationName;
      addToolState.orgFolder = orgFolder;
      addToolState.numberType = resolution.numberType;
      updateAddToolAccountingRequirement();

      const toolsPath = `./${orgFolder}/База с инструментами.json`;
      const objectsPath = `./${orgFolder}/Объекты.json`;
      const settingsPath = `./${orgFolder}/Настройки.json`;
      const results = await Promise.all([
        settle(loadJson(toolsPath)),
        settle(loadJson(objectsPath)),
        settle(loadJson(settingsPath)),
        settle(loadJson(usersFilePath)),
        settle(loadJson(orgFilePath)),
      ]);
      const [
        toolsResult,
        objectsResult,
        rawSettingsResult,
        usersDataResult,
        orgsDataResult,
      ] = results;
      const tools =
        toolsResult.status === "fulfilled"
          ? normalizeToolsData(toolsResult.value)
          : [];
      const objects =
        objectsResult.status === "fulfilled"
          ? normalizeObjectsData(objectsResult.value)
          : [];
      const rawSettings =
        rawSettingsResult.status === "fulfilled" ? rawSettingsResult.value : {};
      const usersData =
        usersDataResult.status === "fulfilled"
          ? usersDataResult.value
          : { users: [] };
      const orgsData =
        orgsDataResult.status === "fulfilled"
          ? orgsDataResult.value
          : { organizations: [] };
      const usersList = Array.isArray(usersData?.users) ? usersData.users : [];
      const orgsSafe = {
        organizations: Array.isArray(orgsData?.organizations)
          ? orgsData.organizations
          : [],
      };
      const missingSources = [];
      if (toolsResult.status === "rejected") {
        missingSources.push(`Не найден файл "${toolsPath}".`);
      }
      if (objectsResult.status === "rejected") {
        missingSources.push(`Не найден файл "${objectsPath}".`);
      }
      if (rawSettingsResult.status === "rejected") {
        missingSources.push(`Не найден файл "${settingsPath}".`);
      }
      if (usersDataResult.status === "rejected") {
        missingSources.push("Не удалось загрузить users.json.");
      }
      if (orgsDataResult.status === "rejected") {
        missingSources.push("Не удалось загрузить organizations.json.");
      }
      if (missingSources.length) {
        reportAddToolIssue(buildAddToolErrorMessage(missingSources));
        return;
      }

      addToolState.tools = Array.isArray(tools) ? tools : [];

      const objectOptions = (Array.isArray(objects) ? objects : [])
        .map((item) => sanitizeObjectName(item?.name ?? item))
        .filter(Boolean);
      addToolState.objectOptions = Array.from(new Set(objectOptions)).sort(
        (a, b) => a.localeCompare(b, "ru")
      );

      const settingsData = ensureSettingsData(rawSettings);
      const organizationSettings = getEnergyOrganizationSettings(settingsData);
      const groupOptions = Array.isArray(organizationSettings.stcGroups)
        ? organizationSettings.stcGroups
        : [];
      addToolState.groupOptions = Array.from(
        new Set(
          groupOptions
            .map((group) => sanitizeToolGroupName(group))
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "ru"));

      const orgRecord = findOrganizationRecord(orgsSafe, organizationName);
      addToolState.numberType = String(
        orgRecord?.number_type ?? "Номер приложения"
      ).trim();
      updateAddToolAccountingRequirement();
      const orgNames = orgRecord ? getOrgNames(orgRecord) : [organizationName];
      const normalizedOrgNames = orgNames
        .map((name) => String(name ?? "").trim())
        .filter(Boolean);
      const responsibleOptions = usersList
        .filter((entry) =>
          normalizedOrgNames.includes(String(entry?.organization ?? "").trim())
        )
        .map((entry) => String(entry?.full_name ?? "").trim())
        .filter(Boolean);
      addToolState.responsibleOptions = Array.from(
        new Set(responsibleOptions)
      ).sort((a, b) => a.localeCompare(b, "ru"));

      updateAddToolSelectState(
        addToolResponsibleInput,
        addToolState.responsibleOptions,
        "Нет ответственных"
      );
      updateAddToolSelectState(
        addToolObjectInput,
        addToolState.objectOptions,
        "Нет объектов"
      );
      updateAddToolSelectState(
        addToolGroupInput,
        addToolState.groupOptions,
        "Нет групп"
      );

      if (addToolSubtitleEl) {
        addToolSubtitleEl.textContent = "Заполните карточку инструмента";
      }
      setAddToolMessage("", { tone: "info" });
    } catch (error) {
      console.error(error);
      const reason = error?.message
        ? `Причина: ${String(error.message).trim()}.`
        : "";
      const issues = reason ? [reason] : [];
      reportAddToolIssue(buildAddToolErrorMessage(issues));
    }
  };

  const openAddToolModal = async () => {
    if (!addToolModalEl) return;
    addToolModalEl.classList.remove("is-hidden");
    attachAddToolViewportListeners();
    updateAddToolKeyboardOffset();
    resetAddToolForm();
    await loadAddToolReferences();
    addToolNameInput?.focus();
  };

  const closeAddToolModal = () => {
    if (!addToolModalEl) return;
    addToolModalEl.classList.add("is-hidden");
    addToolModalEl.classList.remove("is-input-focus");
    addToolModalEl.style.removeProperty("--keyboard-offset");
    detachAddToolViewportListeners();
    resetAddToolForm();
    closeAddToolSuccessModal();
    closeAddToolCameraModal();
  };

  const handleAddToolInvoicePhotoClick = async (event) => {
    if (!(event instanceof Event)) return;
    if (bypassAddToolCameraPicker) {
      bypassAddToolCameraPicker = false;
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const opened = await openAddToolCameraModal();
    if (!opened && addToolInvoicePhotoInput) {
      bypassAddToolCameraPicker = true;
      addToolInvoicePhotoInput.click();
      setAddToolMessage(
        "Камера недоступна. Выберите фото из галереи.",
        { tone: "warning" }
      );
    }
  };

  if (addToolBackdropEl) {
    addToolBackdropEl.addEventListener("click", closeAddToolModal);
  }
  if (addToolCloseButton) {
    addToolCloseButton.addEventListener("click", closeAddToolModal);
  }
  if (addToolCancelButton) {
    addToolCancelButton.addEventListener("click", closeAddToolModal);
  }
  if (addToolSuccessBackdropEl) {
    addToolSuccessBackdropEl.addEventListener(
      "click",
      closeAddToolSuccessModal
    );
  }
  if (addToolInvoicePhotoInput) {
    addToolInvoicePhotoInput.addEventListener(
      "click",
      handleAddToolInvoicePhotoClick
    );
  }
  if (addToolCameraBackdropEl) {
    addToolCameraBackdropEl.addEventListener("click", closeAddToolCameraModal);
  }
  if (addToolCameraCloseButton) {
    addToolCameraCloseButton.addEventListener("click", closeAddToolCameraModal);
  }
  if (addToolCameraCancelButton) {
    addToolCameraCancelButton.addEventListener("click", closeAddToolCameraModal);
  }
  if (addToolCameraCaptureButton) {
    addToolCameraCaptureButton.addEventListener(
      "click",
      captureAddToolCameraFrame
    );
  }
  if (addToolCameraRetakeButton) {
    addToolCameraRetakeButton.addEventListener("click", () => {
      resetAddToolCameraUI();
      addToolCameraVideoEl?.play();
    });
  }
  if (addToolCameraSaveButton) {
    addToolCameraSaveButton.addEventListener(
      "click",
      applyAddToolCameraSnapshot
    );
  }
  if (addToolSuccessCloseButton) {
    addToolSuccessCloseButton.addEventListener(
      "click",
      closeAddToolSuccessModal
    );
  }
  if (addToolSuccessConfirmButton) {
    addToolSuccessConfirmButton.addEventListener(
      "click",
      closeAddToolSuccessModal
    );
  }

  if (addToolFormEl) {
    addToolFormEl.noValidate = true;
    const scrollAddToolInputIntoView = (target) => {
      const scrollContainer = addToolPanelEl || addToolBodyEl;
      if (!scrollContainer || !(target instanceof HTMLElement)) return;
      const bodyRect = scrollContainer.getBoundingClientRect();
      const inputRect = target.getBoundingClientRect();
      const offset = 24;
      const nextTop =
        scrollContainer.scrollTop + (inputRect.top - bodyRect.top) - offset;
      scrollContainer.scrollTo({
        top: Math.max(nextTop, 0),
        behavior: "smooth",
      });
    };

    addToolFormEl.addEventListener("focusin", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest("input, textarea, select")) return;
      addToolModalEl?.classList.add("is-input-focus");
      updateAddToolKeyboardOffset();
      scrollAddToolInputIntoView(target);
    });

    addToolFormEl.addEventListener("focusout", () => {
      setTimeout(() => {
        if (!addToolFormEl.contains(document.activeElement)) {
          addToolModalEl?.classList.remove("is-input-focus");
          addToolModalEl?.style.removeProperty("--keyboard-offset");
        }
      }, 0);
    });

    const clearFieldErrorOnInput = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const field = target.closest(".form-field");
      if (field?.classList.contains("is-invalid")) {
        field.classList.remove("is-invalid");
      }
    };

    const syncFilledFields = () => {
      updateAddToolFilledStates();
    };

    addToolFormEl.addEventListener("input", clearFieldErrorOnInput);
    addToolFormEl.addEventListener("change", clearFieldErrorOnInput);
    addToolFormEl.addEventListener("input", syncFilledFields);
    addToolFormEl.addEventListener("change", syncFilledFields);
    updateAddToolFilledStates();

    if (addToolInvoicePhotoPicker && addToolInvoicePhotoInputs.length) {
      addToolInvoicePhotoInputs.forEach((input) => {
        input.addEventListener("change", () => {
          addToolInvoicePhotoPicker.open = false;
        });
      });
    }

    addToolFormEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        if (addToolState.isSaving) {
          setAddToolMessage("Сохранение уже выполняется. Подождите…", {
            tone: "info",
          });
          scrollAddToolFooterIntoView();
          return;
        }
        setAddToolMessage("Проверяем данные...", { tone: "info" });
        const formData = new FormData(addToolFormEl);
        const accountingNumber = normalizeSuggestionValue(
          formData.get("tool-accounting-number")
        );
        const toolName = normalizeSuggestionValue(formData.get("tool-name"));
        const manufacturer = normalizeSuggestionValue(
          formData.get("tool-manufacturer")
        );
        const model = normalizeSuggestionValue(formData.get("tool-model"));
        const accountingName = normalizeSuggestionValue(
          formData.get("tool-accounting-name")
        );
        const costValue = normalizeCostValue(formData.get("tool-cost"));
        const responsibleRaw = normalizeSuggestionValue(
          formData.get("tool-responsible")
        );
        const objectRaw = normalizeSuggestionValue(formData.get("tool-object"));
        const serialNumber = normalizeSuggestionValue(
          formData.get("tool-serial-number")
        );
        const groupRaw = normalizeSuggestionValue(formData.get("tool-group"));
        const invoiceFile = formData.get("tool-invoice");
        const invoicePhotoFile = formData.get("tool-invoice-photo");
        const invoiceAttachment =
          invoicePhotoFile instanceof File && invoicePhotoFile.size > 0
            ? invoicePhotoFile
            : invoiceFile;

        const errors = [];
        let focusTarget = null;
        const invalidTargets = new Set();
        const pushError = (message, target) => {
          errors.push(message);
          if (!focusTarget && target) {
            focusTarget = target;
          }
          if (target) {
            invalidTargets.add(target);
          }
        };

        if (!toolName) {
          pushError("Введите наименование.", addToolNameInput);
        }
        if (isAddToolAccountingNumber() && !accountingNumber) {
          pushError("Введите Бух.номер.", addToolAccountingNumberInput);
        }
        if (!manufacturer) {
          pushError("Введите производителя.", addToolManufacturerInput);
        }
        if (!model) {
          pushError("Введите модель.", addToolModelInput);
        }
        if (costValue === null) {
          pushError("Введите корректную стоимость.", addToolCostInput);
        }

        if (!addToolState.responsibleOptions.length) {
          pushError("В организации нет ответственных.", addToolResponsibleInput);
        }
        const responsible = findOptionMatch(
          responsibleRaw,
          addToolState.responsibleOptions
        );
        if (addToolState.responsibleOptions.length && !responsible) {
          pushError(
            "Выберите ответственного из списка.",
            addToolResponsibleInput
          );
        }

        if (!addToolState.objectOptions.length) {
          pushError("В организации нет объектов.", addToolObjectInput);
        }
        const objectName = findOptionMatch(
          objectRaw,
          addToolState.objectOptions
        );
        if (addToolState.objectOptions.length && !objectName) {
          pushError("Выберите объект из списка.", addToolObjectInput);
        }

        if (!addToolState.groupOptions.length) {
          pushError("В организации нет групп инструментов.", addToolGroupInput);
        }
        const groupName = findOptionMatch(
          groupRaw,
          addToolState.groupOptions
        );
        if (addToolState.groupOptions.length && !groupName) {
          pushError(
            "Выберите группу инструментов из списка.",
            addToolGroupInput
          );
        }

        if (
          !(invoiceAttachment instanceof File) ||
          invoiceAttachment.size === 0
        ) {
          pushError("Прикрепите накладную.", addToolInvoiceInput);
        }

        if (errors.length) {
          clearAddToolFieldErrors();
          invalidTargets.forEach((target) => markAddToolFieldError(target));
          reportAddToolIssue(errors, { asList: true });
          focusTarget?.focus();
          return;
        }

        addToolState.isSaving = true;
        setAddToolMessage("Сохраняем данные...", { tone: "info" });

        try {
          if (!addToolState.orgFolder) {
            const orgResolution = await resolveAddToolOrganization();
            if (orgResolution?.orgFolder) {
              addToolState.organizationName = orgResolution.organizationName;
              addToolState.orgFolder = orgResolution.orgFolder;
              addToolState.numberType = orgResolution.numberType;
              updateAddToolAccountingRequirement();
            } else if (orgResolution?.issues?.length) {
              reportAddToolIssue(
                ["Не удалось сохранить инструмент.", ...orgResolution.issues],
                { asList: true }
              );
              return;
            }
          }
          if (!addToolState.orgFolder) {
            reportAddToolIssue(
              "Не удалось определить папку организации. Проверьте users.json и organizations.json."
            );
            return;
          }

          const dateValue = formatDateValue(new Date());
          const toolNumber = buildNextToolNumber(addToolState.tools);
          const invoiceName = buildInvoiceFileName(
            toolNumber,
            dateValue,
            invoiceAttachment.name
          );
          const invoiceContent = await readFileAsBase64(invoiceAttachment);
          const orgFolder = addToolState.orgFolder;
          const toolsPath = `./${orgFolder}/База с инструментами.json`;
          const invoicePath = `./${orgFolder}/Накладные покупка/${invoiceName}`;

          const nextTool = {
            "Номер": toolNumber,
            "Бух.номер": accountingNumber,
            "Наименование": toolName,
            "Производитель": manufacturer,
            "Модель": model,
            "Наименование по бухгалтерии": accountingName,
            "Стоимость": costValue,
            "Дата покупки": dateValue,
            "Ответственный": responsible,
            "Объект": objectName,
            "Серийный номер": serialNumber,
            "Граппа инструментов": groupName,
            "Статус": "Рабочий",
            "Количество фото": 0,
          };

          const updatedTools = [...addToolState.tools, nextTool];
          const meta = buildUploadUserMeta({
            organizationName: addToolState.organizationName,
          });
          const saveResponseText = await saveEntriesViaEndpoint([
            {
              type: "file",
              path: invoicePath,
              content: invoiceContent,
              encoding: "base64",
              mime: invoiceAttachment.type || "application/octet-stream",
              ...meta,
            },
            {
              path: toolsPath,
              data: updatedTools,
              ...meta,
            },
          ]);

          addToolState.tools = updatedTools;
          const numberLabel = resolveAddToolNumberLabel();
          const displayNumber = isAddToolAccountingNumber()
            ? accountingNumber
            : toolNumber;
          const successMessage = isAddToolAccountingNumber()
            ? `Все готово! Присвоен Бух.номер ${displayNumber}.`
            : `Данные о новой позиции сохранены, ему присвоен ${numberLabel} ${toolNumber}.`;
          const responseSuffix = buildSaveResponseSuffix(saveResponseText);
          setAddToolMessage(`${successMessage}${responseSuffix}`, {
            tone: "success",
          });
          addToolFormEl.reset();
          updateAddToolFilledStates();
          openAddToolSuccessModal({
            toolNumber,
            accountingNumber: displayNumber,
          });
          const createdByRaw = String(
            currentUser?.full_name ?? currentUser?.fullName ?? ""
          ).trim();
          const createdBy = createdByRaw ? formatFullName(createdByRaw) : "";
          void notifyNewToolRegistration({
            tool: nextTool,
            organizationName: addToolState.organizationName,
            orgFolder: addToolState.orgFolder,
            createdBy,
            numberType: addToolState.numberType,
          });
        } catch (error) {
          console.error(error);
          const rawMessage = String(error?.message ?? "").trim();
          let normalizedMessage = rawMessage;
          if (rawMessage) {
            try {
              const parsed = JSON.parse(rawMessage);
              normalizedMessage =
                parsed?.error ??
                parsed?.message ??
                (typeof parsed === "string" ? parsed : rawMessage);
            } catch (parseError) {
              // keep raw text if it's not JSON
            }
          }
          const errorSuffix = normalizedMessage
            ? `Причина: ${normalizedMessage}.`
            : "Проверьте сервер.";
          reportAddToolIssue(
            `Не удалось сохранить инструмент. ${errorSuffix}`.trim()
          );
        } finally {
          addToolState.isSaving = false;
        }
      } catch (error) {
        console.error("Ошибка формы новой МТЦ.", error);
        addToolState.isSaving = false;
        const rawMessage = String(error?.message ?? "").trim();
        const errorSuffix = rawMessage
          ? `Причина: ${rawMessage}.`
          : "Проверьте консоль.";
        reportAddToolIssue(
          `Ошибка при обработке формы. ${errorSuffix}`.trim()
        );
      }
    });
  }

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

  const loadUsersContext = async () => {
    const [usersData, orgData] = await Promise.all([
      loadJson(usersFilePath).catch(() => ({ users: [] })),
      loadJson(orgFilePath).catch(() => ({ organizations: [] })),
    ]);
    const organizationName = findUserOrganizationName(user, usersData);
    const orgFullName = pickOrganizationFullName(orgData, organizationName);
    const orgShortName = pickOrganizationShortName(orgData, organizationName);
    const orgNames = Array.from(
      new Set([organizationName, orgFullName, orgShortName].filter(Boolean))
    );
    usersState.users = Array.isArray(usersData?.users) ? usersData.users : [];
    return {
      organizationName,
      orgDisplayName: orgFullName,
      orgNames,
      users: usersState.users,
    };
  };

  const buildOrgNameSets = (names) => {
    const normalizedNames = new Set();
    const normalizedFolders = new Set();
    names.forEach((name) => {
      normalizedNames.add(normalizeOrganizationName(name));
      normalizedFolders.add(normalizeOrganizationFolder(name));
    });
    return { normalizedNames, normalizedFolders };
  };

  const filterOrgUsers = (users, names) => {
    if (!names.length) return [];
    const { normalizedNames, normalizedFolders } = buildOrgNameSets(names);
    return users.filter((entry) => {
      const orgName = String(entry?.organization ?? "").trim();
      if (!orgName) return false;
      return (
        normalizedNames.has(normalizeOrganizationName(orgName)) ||
        normalizedFolders.has(normalizeOrganizationFolder(orgName))
      );
    });
  };

  const renderUsersDetails = (orgUsers) => {
    if (!usersDetailsListEl) return;
    usersDetailsListEl.innerHTML = "";
    if (usersDetailsEmptyEl) {
      usersDetailsEmptyEl.classList.toggle("is-hidden", orgUsers.length > 0);
    }
    orgUsers.forEach((entry) => {
      const card = document.createElement("div");
      card.className = "users-details__card";

      const initials = document.createElement("div");
      initials.className = "users-details__initials";
      initials.textContent = getInitials(String(entry?.full_name ?? "").trim());

      const info = document.createElement("div");
      info.className = "users-details__info";

      const name = document.createElement("div");
      name.className = "users-details__name";
      name.textContent = formatFullName(String(entry?.full_name ?? "").trim());

      const meta = document.createElement("div");
      meta.className = "users-details__meta";
      const roleTag = document.createElement("span");
      roleTag.className = "users-details__tag";
      const roleName = String(entry?.role ?? "роль").trim();
      roleTag.textContent = roleName;

      const telegramStatus = document.createElement("span");
      telegramStatus.className = "users-details__status";
      const hasTelegramId = Boolean(normalizeTelegramId(entry?.telegram_id));
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
          createResponsibleInvite(entry);
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

  const updateUsersDetailsView = () => {
    if (!selectedUsersOrgName) return;
    const orgUsers = filterOrgUsers(usersState.users, selectedUsersOrgNames);
    if (usersDetailsCountEl) {
      usersDetailsCountEl.textContent = formatUserCount(orgUsers.length);
    }
    renderUsersDetails(orgUsers);
  };

  const openUsersAddModal = async () => {
    if (!usersAddModalEl || !selectedUsersOrgName) return;
    const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
    usersState.users = Array.isArray(usersData?.users) ? usersData.users : [];
    updateUsersNameSuggestions(usersState.users);
    if (usersAddOrgNameEl) {
      usersAddOrgNameEl.textContent =
        selectedUsersOrgDisplayName || selectedUsersOrgName;
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
    } else {
      document.body.style.overflow = "";
    }
  };

  const openUsersDetailsModal = async () => {
    if (!usersDetailsModalEl) return;
    const { organizationName, orgDisplayName, orgNames, users } =
      await loadUsersContext();
    selectedUsersOrgName = organizationName;
    selectedUsersOrgDisplayName = orgDisplayName || organizationName;
    selectedUsersOrgNames = orgNames;
    updateUsersNameSuggestions(users);
    if (usersDetailsNameEl) {
      usersDetailsNameEl.textContent = selectedUsersOrgDisplayName;
    }
    const orgUsers = filterOrgUsers(users, orgNames);
    if (usersDetailsCountEl) {
      usersDetailsCountEl.textContent = formatUserCount(orgUsers.length);
    }
    renderUsersDetails(orgUsers);
    resetUsersInvite();
    usersDetailsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const closeUsersDetailsModal = () => {
    if (!usersDetailsModalEl) return;
    usersDetailsModalEl.classList.add("is-hidden");
    if (usersAddModalEl) {
      usersAddModalEl.classList.add("is-hidden");
    }
    resetUsersInvite();
    document.body.style.overflow = "";
  };

  const createResponsibleInvite = async (entry) => {
    if (!usersInviteBox || !entry) return;
    const fullName = String(entry?.full_name ?? "Ответственный").trim();
    const organizationName = String(
      entry?.organization ?? selectedUsersOrgName ?? ""
    ).trim();
    const roleName = String(entry?.role ?? responsibleRole).trim() || responsibleRole;
    if (!fullName || !organizationName) return;

    try {
      const registrationsData = await loadRegistrations();
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

      await saveJson(pendingRegistrationsFilePath, nextRegistrationsData, { user });

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
          ? "При открытии в Telegram ID сохранится автоматически."
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

  usersDetailsBackdropEl?.addEventListener("click", closeUsersDetailsModal);
  usersDetailsCloseButton?.addEventListener("click", closeUsersDetailsModal);
  usersAddButton?.addEventListener("click", openUsersAddModal);
  usersAddBackdropEl?.addEventListener("click", closeUsersAddModal);
  usersAddCloseButton?.addEventListener("click", closeUsersAddModal);
  usersAddCancelButton?.addEventListener("click", closeUsersAddModal);
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

      usersState.users = nextUsersData.users;
      updateUsersDetailsView();

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

    const syncMailingGroupLists = () => {
      const groupLists = settingsBodyEl.querySelectorAll(
        "[data-mailing-tool-groups]"
      );
      groupLists.forEach((list) => {
        const mailingId = list.dataset.mailingId;
        if (!mailingId) return;
        const checkedGroups = new Set(
          Array.from(list.querySelectorAll("input[type=\"checkbox\"]"))
            .filter((input) => input.checked)
            .map((input) => input.value)
        );
        const groupChips =
          settingsGroups.length > 0
            ? settingsGroups
                .map(
                  (group) => `
                    <label class="settings-group-chip">
                      <input
                        type="checkbox"
                        name="mailing-${mailingId}-tool-groups"
                        value="${escapeHtml(group)}"
                        ${checkedGroups.has(group) ? "checked" : ""}
                      />
                      <span>${escapeHtml(group)}</span>
                    </label>
                  `
                )
                .join("")
            : `<span class="settings-chip is-muted">Нет групп инструментов</span>`;
        list.innerHTML = groupChips;
      });
    };

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
      syncMailingGroupLists();
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
    const telegramGroups = normalizeTelegramGroupsList(
      settingsData.organization?.telegramGroups ?? organizationSettings.telegramGroups
    );
    energyMailingOptions.forEach((option) => {
      const toolGroups = normalizeMailingToolGroups(
        formData.getAll(`mailing-${option.id}-tool-groups`),
        settingsGroups
      );
      const telegramSchedule = {};
      telegramGroups.forEach((group, index) => {
        const key = getTelegramGroupKey(group);
        if (!key) return;
        const selectedDays = normalizeDays(
          formData.getAll(`mailing-${option.id}-tg-${index}-days`),
          []
        );
        telegramSchedule[key] = {
          days: selectedDays,
          time: normalizeTime(
            formData.get(`mailing-${option.id}-tg-${index}-time`),
            option.defaultTime
          ),
        };
      });
      nextMailings[option.id] = {
        enabled: formData.get(`mailing-${option.id}-enabled`) !== null,
        toolGroups,
        telegramSchedule,
      };
    });
    const nextNotifications = {};
    energyNotificationOptions.forEach((option) => {
      nextNotifications[option.id] = {
        enabled: formData.get(`notification-${option.id}-enabled`) !== null,
        groups: normalizeTelegramGroupSelection(
          formData.getAll(`notification-${option.id}-groups`),
          telegramGroups
        ),
        attachPhoto: formData.get(`notification-${option.id}-photo`) !== null,
      };
    });
    settingsData.organization = normalizeEnergyOrganizationSettings({
      access: nextAccess,
      stcGroups: settingsGroups,
      telegramGroups:
        settingsData.organization?.telegramGroups ??
        organizationSettings.telegramGroups,
      fines: nextFines,
      mailings: nextMailings,
      notifications: nextNotifications,
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
    if (
      !isGrouping &&
      targetCard.dataset.energyItemType === "action" &&
      targetCard.dataset.actionId === "users"
    ) {
      openUsersDetailsModal();
      return;
    }
    if (
      !isGrouping &&
      targetCard.dataset.energyItemType === "action" &&
      targetCard.dataset.actionId === "tools"
    ) {
      openToolsModal();
      return;
    }
    if (
      !isGrouping &&
      targetCard.dataset.energyItemType === "action" &&
      targetCard.dataset.actionId === "add-photo"
    ) {
      openAddPhotoModal();
      return;
    }
    if (
      !isGrouping &&
      targetCard.dataset.energyItemType === "action" &&
      targetCard.dataset.actionId === "add-tool"
    ) {
      openAddToolModal();
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
  const orgsUploadButton = contentEl.querySelector("[data-orgs-upload]");
  const orgsUploadInput = contentEl.querySelector("[data-orgs-upload-input]");
  const orgsUploadPhotoButton = contentEl.querySelector(
    "[data-orgs-upload-photo]"
  );
  const orgsUploadPhotoInput = contentEl.querySelector(
    "[data-orgs-upload-photo-input]"
  );
  const orgsUploadStatusEl = contentEl.querySelector(
    "[data-orgs-upload-status]"
  );
  const orgsUploadProgressEl = contentEl.querySelector(
    "[data-orgs-upload-progress]"
  );
  const orgsUploadProgressValueEl = contentEl.querySelector(
    "[data-orgs-upload-progress-value]"
  );
  const orgsUploadProgressFillEl = contentEl.querySelector(
    "[data-orgs-upload-progress-fill]"
  );
  const orgsUploadProgressThumbEl = contentEl.querySelector(
    "[data-orgs-upload-progress-thumb]"
  );
  const orgsUploadProgressTrackEl = contentEl.querySelector(
    "[data-orgs-upload-progress-track]"
  );
  const orgsUploadProgressHintEl = contentEl.querySelector(
    "[data-orgs-upload-progress-hint]"
  );
  const orgsManageGroupsButton = contentEl.querySelector(
    "[data-orgs-manage-groups]"
  );
  const orgsGroupsModalEl = contentEl.querySelector("[data-orgs-groups-modal]");
  const orgsGroupsBackdropEl = contentEl.querySelector(
    "[data-orgs-groups-backdrop]"
  );
  const orgsGroupsCloseButton = contentEl.querySelector(
    "[data-orgs-groups-close]"
  );
  const orgsGroupsCancelButton = contentEl.querySelector(
    "[data-orgs-groups-cancel]"
  );
  const orgsGroupsFormEl = contentEl.querySelector("[data-orgs-groups-form]");
  const orgsGroupsListEl = contentEl.querySelector("[data-orgs-groups-list]");
  const orgsGroupsAddButton = contentEl.querySelector("[data-orgs-groups-add]");
  const orgsGroupsSaveButton = contentEl.querySelector("[data-orgs-groups-save]");
  const orgsGroupsMessageEl = contentEl.querySelector(
    "[data-orgs-groups-message]"
  );
  const orgsGroupsSubtitleEl = contentEl.querySelector(
    "[data-orgs-groups-subtitle]"
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
  let orgsGroupsContext = null;

  const setUploadStatus = (message = "", tone = "info") => {
    if (!orgsUploadStatusEl) return;
    orgsUploadStatusEl.textContent = message;
    orgsUploadStatusEl.classList.remove("is-success", "is-error");
    if (tone === "success") {
      orgsUploadStatusEl.classList.add("is-success");
    } else if (tone === "error") {
      orgsUploadStatusEl.classList.add("is-error");
    }
  };

  const setUploadProgress = (value = 0, options = {}) => {
    if (!orgsUploadProgressEl) return;
    const safeValue = Math.min(100, Math.max(0, Number(value) || 0));
    const { label, hint } = options;
    orgsUploadProgressEl.classList.remove("is-hidden");
    if (orgsUploadProgressValueEl) {
      orgsUploadProgressValueEl.textContent = `${Math.round(safeValue)}%`;
    }
    if (orgsUploadProgressFillEl) {
      orgsUploadProgressFillEl.style.width = `${safeValue}%`;
    }
    if (orgsUploadProgressThumbEl) {
      orgsUploadProgressThumbEl.style.left = `${safeValue}%`;
    }
    if (orgsUploadProgressTrackEl) {
      orgsUploadProgressTrackEl.setAttribute(
        "aria-valuenow",
        String(Math.round(safeValue))
      );
    }
    if (orgsUploadProgressHintEl && hint) {
      orgsUploadProgressHintEl.textContent = hint;
    }
    if (orgsUploadProgressEl && label) {
      const labelEl = orgsUploadProgressEl.querySelector(".upload-progress__label");
      if (labelEl) labelEl.textContent = label;
    }
  };

  const clearUploadProgress = () => {
    if (!orgsUploadProgressEl) return;
    orgsUploadProgressEl.classList.add("is-hidden");
    if (orgsUploadProgressFillEl) {
      orgsUploadProgressFillEl.style.width = "0%";
    }
    if (orgsUploadProgressThumbEl) {
      orgsUploadProgressThumbEl.style.left = "0%";
    }
    if (orgsUploadProgressValueEl) {
      orgsUploadProgressValueEl.textContent = "0%";
    }
    if (orgsUploadProgressTrackEl) {
      orgsUploadProgressTrackEl.setAttribute("aria-valuenow", "0");
    }
  };

  const clearUploadStatus = () => {
    setUploadStatus("");
  };

  const buildSelectedOrgFolderName = () => {
    if (!selectedOrgName) return "";
    const shortName = pickOrganizationShortName(
      { organizations: orgsState.organizations },
      selectedOrgName
    );
    return sanitizeOrganizationFolderName(shortName || selectedOrgName);
  };

  const normalizeTelegramGroupName = (value = "") =>
    String(value ?? "").trim();

  const normalizeTelegramGroupId = (value = "") => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) return "";
    return trimmed;
  };

  const normalizeTelegramGroupEntry = (entry = {}) => {
    const name = normalizeTelegramGroupName(entry.name ?? entry.title ?? "");
    const telegramId = normalizeTelegramGroupId(
      entry.telegramId ?? entry.telegram_id ?? ""
    );
    return { name, telegramId };
  };

  const normalizeTelegramGroups = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => normalizeTelegramGroupEntry(item ?? {}))
      .filter((item) => item.name || item.telegramId);
  };

  const resolvePhotoFileName = (name = "") => {
    if (typeof sanitizePhotoFileName === "function") {
      return sanitizePhotoFileName(name);
    }
    const trimmed = String(name ?? "").trim();
    const cleaned = trimmed.replace(/[\\/:"*?<>|]+/g, "_");
    return cleaned.replace(/\s+/g, " ").trim();
  };

  const parsePhotoKeyFromName = (fileName) => {
    if (!fileName) return "";
    const baseName = String(fileName).replace(/\.[^.]+$/, "");
    const match = baseName.match(/^(\d+)(?:_|$)/);
    if (!match) return "";
    return normalizeToolNumberValue(match[1]);
  };

  const resolveUploadOrganization = async () => {
    const fallbackOrg = selectedOrgName || currentUser?.organization || "";
    let organizationName = fallbackOrg;
    try {
      const usersData = await loadJson(usersFilePath);
      const users = Array.isArray(usersData?.users) ? usersData.users : [];
      const telegramId = normalizeTelegramId(currentUser?.telegram_id ?? null);
      const matchedUser =
        users.find(
          (user) =>
            telegramId && normalizeTelegramId(user?.telegram_id ?? null) === telegramId
        ) ??
        users.find(
          (user) =>
            String(user?.full_name ?? "").trim() ===
              String(currentUser?.full_name ?? "").trim() &&
            String(user?.organization ?? "").trim() ===
              String(currentUser?.organization ?? "").trim() &&
            String(user?.role ?? "").trim() === String(currentUser?.role ?? "").trim()
        );
      if (matchedUser?.organization) {
        organizationName = String(matchedUser.organization).trim();
      }
    } catch (error) {
      console.warn("Не удалось определить организацию пользователя.", error);
    }

    if (!organizationName) {
      return {
        organizationName: "",
        orgFolder: "",
        numberType: "",
      };
    }

    let orgData = null;
    try {
      orgData = await loadJson(orgFilePath);
    } catch (error) {
      console.warn("Не удалось загрузить список организаций.", error);
    }

    const orgRecord = orgData ? findOrganizationRecord(orgData, organizationName) : null;
    const shortName = orgRecord?.short_name ?? organizationName;
    const orgFolder = sanitizeOrganizationFolderName(shortName || organizationName);
    return {
      organizationName,
      orgFolder,
      numberType: String(orgRecord?.number_type ?? "Номер приложения").trim(),
    };
  };

  const normalizePurchaseDate = (value) => {
    if (!value) return "";
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return formatDateValue(value);
    }
    if (typeof value === "number" && window.XLSX?.SSF?.parse_date_code) {
      const parsed = window.XLSX.SSF.parse_date_code(value);
      if (parsed?.y && parsed?.m && parsed?.d) {
        const day = String(parsed.d).padStart(2, "0");
        const month = String(parsed.m).padStart(2, "0");
        return `${day}.${month}.${parsed.y}`;
      }
    }
    return String(value).trim();
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

  const parseExcelToolsData = (sheet) => {
    const rows = window.XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    });
    if (!rows.length) {
      return { tools: [], objects: [], toolGroups: [] };
    }
    const tools = [];
    const objectsSet = new Set();
    const toolGroupsSet = new Set();
    const columnMap = [
      { key: "Номер", index: 0 },
      { key: "Бух.номер", index: 1 },
      { key: "Наименование", index: 2 },
      { key: "Производитель", index: 3 },
      { key: "Модель", index: 4 },
      { key: "Наименование по бухгалтерии", index: 5 },
      { key: "Стоимость", index: 6 },
      { key: "Дата покупки", index: 7 },
      { key: "Ответственный", index: 8 },
      { key: "Объект", index: 9 },
      { key: "Серийный номер", index: 10 },
      { key: "Граппа инструментов", index: 11 },
    ];

    rows.slice(1).forEach((row) => {
      if (!Array.isArray(row)) return;
      const entry = {};
      let hasValue = false;
      columnMap.forEach(({ key, index }) => {
        const value = row[index];
        let normalized = value;
        if (key === "Стоимость") {
          normalized = normalizeCostValue(value);
          if (normalized === null) {
            normalized = "";
          }
        } else if (key === "Дата покупки") {
          normalized = normalizePurchaseDate(value);
        } else if (key === "Граппа инструментов") {
          normalized = sanitizeToolGroupName(value);
        } else {
          normalized = String(value ?? "").trim();
        }
        if (normalized !== "" && normalized !== null) {
          hasValue = true;
        }
        entry[key] = normalized;
      });

      if (!hasValue) return;
      entry["Статус"] = "Рабочий";
      entry["Количество фото"] = 0;
      const objectName = sanitizeObjectName(entry["Объект"] ?? "");
      if (objectName) {
        objectsSet.add(objectName);
        entry["Объект"] = objectName;
      }
      const toolGroupName = sanitizeToolGroupName(
        entry["Граппа инструментов"] ?? ""
      );
      if (toolGroupName) {
        toolGroupsSet.add(toolGroupName);
        entry["Граппа инструментов"] = toolGroupName;
      }
      tools.push(entry);
    });

    return {
      tools,
      objects: Array.from(objectsSet),
      toolGroups: Array.from(toolGroupsSet),
    };
  };

  async function loadObjectsData(orgFolder) {
    const objectsPath = `./${orgFolder}/Объекты.json`;
    try {
      const raw = await loadJson(objectsPath);
      return normalizeObjectsData(raw);
    } catch (error) {
      console.warn("Не удалось загрузить список объектов.", error);
      return [];
    }
  }

  const mergeObjects = (existingObjects, newObjects) => {
    const normalizedSet = new Set(
      existingObjects.map((item) => sanitizeObjectName(item.name).toLowerCase())
    );
    const merged = [...existingObjects];
    newObjects.forEach((name) => {
      const normalized = sanitizeObjectName(name);
      if (!normalized) return;
      const key = normalized.toLowerCase();
      if (normalizedSet.has(key)) return;
      normalizedSet.add(key);
      merged.push({ id: buildObjectId(), name: normalized });
    });
    return merged;
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

  const setGroupsMessage = (message = "") => {
    if (orgsGroupsMessageEl) {
      orgsGroupsMessageEl.textContent = message;
    }
  };

  const buildGroupsSignature = (groups = []) =>
    JSON.stringify(
      groups.map((group) => ({
        name: String(group?.name ?? "").trim(),
        telegramId: String(group?.telegramId ?? "").trim(),
      }))
    );

  const setGroupsSaveState = (hasChanges) => {
    if (!orgsGroupsSaveButton) return;
    orgsGroupsSaveButton.disabled = !hasChanges;
    orgsGroupsSaveButton.classList.toggle("is-active", hasChanges);
  };

  const updateGroupStatus = (row, value) => {
    const statusEl = row.querySelector("[data-group-status]");
    if (!statusEl) return;
    const connected = Boolean(normalizeTelegramGroupId(value));
    statusEl.textContent = connected ? "Подключена" : "Не подключена";
    statusEl.classList.toggle("is-connected", connected);
  };

  const createGroupsEmptyState = () => {
    const empty = document.createElement("div");
    empty.className = "orgs-groups__empty";
    empty.textContent = "Добавьте первую группу для рассылок.";
    return empty;
  };

  const renderGroupsList = (groups = []) => {
    if (!orgsGroupsListEl) return;
    orgsGroupsListEl.innerHTML = "";
    if (groups.length === 0) {
      orgsGroupsListEl.appendChild(createGroupsEmptyState());
      return;
    }

    groups.forEach((group) => {
      const row = document.createElement("div");
      row.className = "orgs-groups__row";
      row.dataset.orgsGroupRow = "true";
      row.innerHTML = `
        <div class="orgs-groups__fields">
          <label class="orgs-groups__field">
            <span>Название рассылки</span>
            <input
              class="form-input"
              type="text"
              inputmode="text"
              placeholder="Например, Утренний отчёт"
              data-group-field="name"
              value="${escapeHtml(group.name)}"
            />
          </label>
          <label class="orgs-groups__field">
            <span>ID группы</span>
            <div class="orgs-groups__id-row">
              <input
                class="form-input"
                type="text"
                inputmode="numeric"
                placeholder="-1001234567890"
                data-group-field="telegramId"
                value="${escapeHtml(group.telegramId)}"
              />
              <span class="orgs-groups__status" data-group-status></span>
            </div>
          </label>
        </div>
        <div class="orgs-groups__actions">
          <button
            class="action-danger orgs-groups__remove"
            type="button"
            data-group-remove
            aria-label="Удалить группу"
          >
            Удалить группу
          </button>
        </div>
      `;
      const idInput = row.querySelector('[data-group-field="telegramId"]');
      if (idInput) {
        updateGroupStatus(row, idInput.value);
        idInput.addEventListener("input", (event) => {
          updateGroupStatus(row, event.target.value);
        });
      }
      row.addEventListener("input", () => {
        updateGroupsSaveState();
      });
      const removeButton = row.querySelector("[data-group-remove]");
      removeButton?.addEventListener("click", () => {
        row.remove();
        if (orgsGroupsListEl && orgsGroupsListEl.children.length === 0) {
          orgsGroupsListEl.appendChild(createGroupsEmptyState());
        }
        updateGroupsSaveState();
      });
      orgsGroupsListEl.appendChild(row);
    });
  };

  const collectGroupsFromForm = (includeEmpty = false) => {
    if (!orgsGroupsListEl) return [];
    const rows = Array.from(
      orgsGroupsListEl.querySelectorAll("[data-orgs-group-row]")
    );
    const groups = rows.map((row) => {
      const nameInput = row.querySelector('[data-group-field="name"]');
      const telegramIdInput = row.querySelector(
        '[data-group-field="telegramId"]'
      );
      return normalizeTelegramGroupEntry({
        name: nameInput?.value ?? "",
        telegramId: telegramIdInput?.value ?? "",
      });
    });
    if (includeEmpty) {
      return groups;
    }
    return groups.filter((item) => item.name || item.telegramId);
  };

  const updateGroupsSaveState = () => {
    if (!orgsGroupsContext) return;
    const currentSignature = buildGroupsSignature(
      collectGroupsFromForm(true)
    );
    const baseSignature =
      orgsGroupsContext.initialGroupsSignature ?? buildGroupsSignature([]);
    setGroupsSaveState(currentSignature !== baseSignature);
  };

  const openOrgsGroupsModal = async () => {
    if (!orgsGroupsModalEl) return;
    if (!selectedOrgName) {
      setUploadStatus("Сначала выберите организацию.", "error");
      return;
    }
    const orgFolder = buildSelectedOrgFolderName();
    if (!orgFolder) {
      setUploadStatus("Не удалось определить папку организации.", "error");
      return;
    }
    const settingsPath = `./${orgFolder}/Настройки.json`;
    const settingsData = ensureSettingsData(
      await loadJson(settingsPath).catch(() => ({ users: {} }))
    );
    const groups = normalizeTelegramGroups(
      settingsData.organization?.telegramGroups ?? []
    );
    orgsGroupsContext = {
      settingsPath,
      settingsData,
      initialGroupsSignature: buildGroupsSignature(groups),
    };
    renderGroupsList(groups);
    if (orgsGroupsSubtitleEl) {
      orgsGroupsSubtitleEl.textContent = selectedOrgName;
    }
    setGroupsMessage("");
    updateGroupsSaveState();
    orgsGroupsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const closeOrgsGroupsModal = () => {
    if (!orgsGroupsModalEl) return;
    orgsGroupsModalEl.classList.add("is-hidden");
    setGroupsMessage("");
    orgsGroupsContext = null;
    if (orgsDetailsModalEl && !orgsDetailsModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else if (orgsModalEl && !orgsModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const handleUploadPhotos = async (files) => {
    const fileList = Array.from(files ?? []);
    if (!fileList.length) return;

    setUploadStatus("Проверяем фото...");
    setUploadProgress(2, {
      label: "Подготовка фото",
      hint: "Проверяем названия и типы файлов...",
    });
    if (orgsUploadPhotoButton) orgsUploadPhotoButton.disabled = true;

    try {
      const { orgFolder, numberType } = await resolveUploadOrganization();
      if (!orgFolder) {
        setUploadStatus("Не удалось определить организацию пользователя.", "error");
        setUploadProgress(0, {
          label: "Ошибка",
          hint: "Не удалось определить организацию.",
        });
        return;
      }

      const tools = await loadToolsData(orgFolder);
      if (!tools.length) {
        setUploadStatus("Сначала загрузите базу инструментов.", "error");
        setUploadProgress(0, {
          label: "Нет базы",
          hint: "Сначала загрузите базу инструментов.",
        });
        return;
      }

      const numberKey = "Номер";
      const toolIndexByNumber = new Map();
      tools.forEach((tool, index) => {
        const key = normalizeToolNumberValue(tool?.[numberKey]);
        if (!key) return;
        if (!toolIndexByNumber.has(key)) {
          toolIndexByNumber.set(key, index);
        }
      });

      if (!toolIndexByNumber.size) {
        setUploadStatus(
          "В базе инструментов не найдены номера для проверки фото.",
          "error"
        );
        setUploadProgress(0, {
          label: "Нет номеров",
          hint: "Проверьте, что в базе заполнена колонка «Номер».",
        });
        return;
      }

      const matchedFiles = [];
      const matchedCounts = new Map();
      const skipped = {
        invalidName: 0,
        noMatch: 0,
        nonImage: 0,
        invalidSamples: [],
        noMatchSamples: [],
        nonImageSamples: [],
      };

      fileList.forEach((file) => {
        if (file.type && !file.type.startsWith("image/")) {
          skipped.nonImage += 1;
          if (skipped.nonImageSamples.length < 5) {
            skipped.nonImageSamples.push(file.name);
          }
          return;
        }
        const key = parsePhotoKeyFromName(file.name);
        if (!key) {
          skipped.invalidName += 1;
          if (skipped.invalidSamples.length < 5) {
            skipped.invalidSamples.push(file.name);
          }
          return;
        }
        const toolIndex = toolIndexByNumber.get(key);
        if (toolIndex === undefined) {
          skipped.noMatch += 1;
          if (skipped.noMatchSamples.length < 5) {
            skipped.noMatchSamples.push(file.name);
          }
          return;
        }
        const safeName = resolvePhotoFileName(file.name) || file.name;
        matchedFiles.push({ file, toolIndex, safeName });
        matchedCounts.set(toolIndex, (matchedCounts.get(toolIndex) ?? 0) + 1);
      });

      if (!matchedFiles.length) {
        const parts = [];
        if (skipped.invalidName) {
          const examples = skipped.invalidSamples.length
            ? ` Например: ${skipped.invalidSamples.join(", ")}.`
            : "";
          parts.push(`Без номера: ${skipped.invalidName}.${examples}`);
        }
        if (skipped.noMatch) {
          const examples = skipped.noMatchSamples.length
            ? ` Например: ${skipped.noMatchSamples.join(", ")}.`
            : "";
          parts.push(
            `Номера не найдены в базе: ${skipped.noMatch}.${examples}`
          );
        }
        if (skipped.nonImage) {
          const examples = skipped.nonImageSamples.length
            ? ` Например: ${skipped.nonImageSamples.join(", ")}.`
            : "";
          parts.push(`Не фото: ${skipped.nonImage}.${examples}`);
        }
        const hint = parts.length
          ? parts.join(" ")
          : "Файлы не совпали с номерами из базы.";
        setUploadStatus(
          "Нет фото с корректными номерами для загрузки.",
          "error"
        );
        setUploadProgress(0, {
          label: "Нет совпадений",
          hint,
        });
        return;
      }

      setUploadStatus(`Загружаем фото (${matchedFiles.length} шт.)...`);
      setUploadProgress(10, {
        label: "Обработка фото",
        hint: "Подготавливаем изображения...",
      });

      const fileEntries = [];
      const totalFiles = matchedFiles.length;
      for (let index = 0; index < matchedFiles.length; index += 1) {
        const { file, safeName } = matchedFiles[index];
        const content = await readFileAsBase64(file);
        fileEntries.push({
          type: "file",
          path: `${orgFolder}/Фото инструментов/${safeName}`,
          content,
          encoding: "base64",
          mime: file.type || "image/*",
          ...buildUploadUserMeta({ organizationName: selectedOrgName }),
        });
        const progress = 10 + ((index + 1) / totalFiles) * 50;
        setUploadProgress(progress, {
          label: "Обработка фото",
          hint: `Готовим файл ${index + 1} из ${totalFiles}...`,
        });
      }

      const updatedTools = tools.map((tool, index) => {
        const count = matchedCounts.get(index) ?? 0;
        if (!count) return tool;
        const current = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
        const safeCurrent = Number.isFinite(current) ? current : 0;
        return { ...tool, "Количество фото": safeCurrent + count };
      });

      await uploadPhotoEntriesInBatches(fileEntries, {
        onBatch: (currentBatch, totalBatches) => {
          const progress = 60 + (currentBatch / totalBatches) * 25;
          setUploadProgress(progress, {
            label: "Загрузка фото",
            hint: `Передаём фото ${currentBatch} из ${totalBatches}...`,
          });
        },
      });

      setUploadProgress(90, {
        label: "Синхронизация",
        hint: "Обновляем базу инструментов...",
      });
      await saveEntries([
        {
          path: `${orgFolder}/База с инструментами.json`,
          data: updatedTools,
          ...buildUploadUserMeta({ organizationName: selectedOrgName }),
        },
      ]);

      const skippedTotal = skipped.invalidName + skipped.noMatch + skipped.nonImage;
      const skippedParts = [];
      if (skipped.invalidName) {
        skippedParts.push(`без номера: ${skipped.invalidName}`);
      }
      if (skipped.noMatch) {
        skippedParts.push(`нет в базе: ${skipped.noMatch}`);
      }
      if (skipped.nonImage) {
        skippedParts.push(`не фото: ${skipped.nonImage}`);
      }
      const skippedNote = skippedParts.length
        ? ` Пропущено ${skippedTotal} (${skippedParts.join(", ")}).`
        : "";
      setUploadStatus(
        `Фото загружены: ${matchedFiles.length}.${skippedNote}`,
        "success"
      );
      setUploadProgress(100, {
        label: "Готово",
        hint: "Фото загружены и сохранены.",
      });
    } catch (error) {
      console.error(error);
      const reason =
        error instanceof Error && error.message
          ? `Причина: ${error.message}`
          : "Не удалось определить причину.";
      setUploadStatus(
        `Не удалось загрузить фото. ${reason}`,
        "error"
      );
      setUploadProgress(0, {
        label: "Ошибка",
        hint: reason,
      });
    } finally {
      if (orgsUploadPhotoButton) orgsUploadPhotoButton.disabled = false;
    }
  };

  const handleUploadTools = async (file) => {
    if (!file) return;
    if (!selectedOrgName) {
      setUploadStatus("Сначала выберите организацию.", "error");
      return;
    }
    if (!window.XLSX) {
      setUploadStatus("Модуль Excel не загружен. Обновите страницу.", "error");
      return;
    }

    const orgFolder = buildSelectedOrgFolderName();
    if (!orgFolder) {
      setUploadStatus("Не удалось определить папку организации.", "error");
      return;
    }

    setUploadStatus("Читаем Excel файл...");
    if (orgsUploadButton) orgsUploadButton.disabled = true;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = window.XLSX.read(buffer, {
        type: "array",
        cellDates: true,
      });
      const sheetName = workbook.SheetNames.find(
        (name) => String(name ?? "").trim().toLowerCase() === "выгрузка"
      );
      const sheet = sheetName ? workbook.Sheets[sheetName] : null;
      if (!sheet) {
        throw new Error('Лист "Выгрузка" не найден.');
      }

      const { tools, objects, toolGroups } = parseExcelToolsData(sheet);
      if (!tools.length) {
        setUploadStatus("В листе «Выгрузка» нет данных для загрузки.", "error");
        return;
      }

      const existingObjects = await loadObjectsData(orgFolder);
      const mergedObjects = mergeObjects(existingObjects, objects);
      const meta = buildUploadUserMeta({ organizationName: selectedOrgName });
      const basePath = `./${orgFolder}`;
      const settingsPath = `${basePath}/Настройки.json`;
      const settingsData = ensureSettingsData(
        await loadJson(settingsPath).catch(() => ({}))
      );
      const organizationSettings = getEnergyOrganizationSettings(settingsData);
      const existingGroups = Array.isArray(organizationSettings.stcGroups)
        ? organizationSettings.stcGroups
        : [];
      const nextGroups = Array.from(
        new Set(
          [...existingGroups, ...(toolGroups ?? [])]
            .map((group) => sanitizeToolGroupName(group))
            .filter(Boolean)
        )
      );
      const addedGroupsCount = Math.max(
        0,
        nextGroups.length - existingGroups.length
      );
      if (addedGroupsCount > 0) {
        settingsData.organization = {
          ...organizationSettings,
          stcGroups: nextGroups,
        };
      }
      const entries = [
        {
          path: `${basePath}/База с инструментами.json`,
          data: tools,
          ...meta,
        },
        {
          path: `${basePath}/Объекты.json`,
          data: mergedObjects,
          ...meta,
        },
      ];
      if (addedGroupsCount > 0) {
        entries.push({
          path: settingsPath,
          data: settingsData,
          ...meta,
        });
      }
      await saveEntries(entries);

      if (orgsDetailToolsTotalEl) {
        orgsDetailToolsTotalEl.textContent = String(tools.length);
      }
      const groupsNote =
        addedGroupsCount > 0
          ? ` Групп МТЦ добавлено: ${addedGroupsCount}.`
          : "";
      setUploadStatus(
        `Загружено позиций: ${tools.length}. Новых объектов: ${
          mergedObjects.length - existingObjects.length
        }.${groupsNote}`,
        "success"
      );
    } catch (error) {
      console.error(error);
      const fallbackMessage =
        "Не удалось обработать файл. Проверьте лист «Выгрузка» и формат данных.";
      const errorMessage =
        error instanceof Error && error.message ? error.message : "";
      setUploadStatus(errorMessage || fallbackMessage, "error");
    } finally {
      if (orgsUploadButton) orgsUploadButton.disabled = false;
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
    if (orgsGroupsModalEl) {
      orgsGroupsModalEl.classList.add("is-hidden");
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
    if (orgsGroupsModalEl && !orgsGroupsModalEl.classList.contains("is-hidden")) {
      orgsGroupsModalEl.classList.add("is-hidden");
    }
    resetEnergyInvite();
    clearUploadStatus();
    clearUploadProgress();
    if (orgsUploadInput) {
      orgsUploadInput.value = "";
    }
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
  orgsManageGroupsButton?.addEventListener("click", openOrgsGroupsModal);
  orgsGroupsBackdropEl?.addEventListener("click", closeOrgsGroupsModal);
  orgsGroupsCloseButton?.addEventListener("click", closeOrgsGroupsModal);
  orgsGroupsCancelButton?.addEventListener("click", closeOrgsGroupsModal);
  orgsGroupsAddButton?.addEventListener("click", () => {
    const groups = collectGroupsFromForm();
    groups.push({ name: "", telegramId: "" });
    renderGroupsList(groups);
    updateGroupsSaveState();
  });
  orgsGroupsFormEl?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!orgsGroupsContext) return;
    const groups = collectGroupsFromForm();
    const hasInvalid = groups.some(
      (group) => !group.name || !group.telegramId
    );
    if (hasInvalid) {
      setGroupsMessage("Заполните название и ID для каждой рассылки.");
      return;
    }
    setGroupsMessage("Сохраняем настройки групп...");
    try {
      orgsGroupsContext.settingsData.organization = {
        ...(orgsGroupsContext.settingsData.organization ?? {}),
        telegramGroups: groups,
      };
      await saveJson(
        orgsGroupsContext.settingsPath,
        orgsGroupsContext.settingsData,
        { user: currentUser }
      );
      orgsGroupsContext.initialGroupsSignature = buildGroupsSignature(groups);
      updateGroupsSaveState();
      setGroupsMessage("Группы рассылок сохранены.");
    } catch (error) {
      console.error(error);
      setGroupsMessage("Не удалось сохранить группы. Попробуйте позже.");
    }
  });
  orgsUploadButton?.addEventListener("click", () => {
    if (!selectedOrgName) {
      setUploadStatus("Сначала выберите организацию.", "error");
      return;
    }
    if (orgsUploadInput) {
      orgsUploadInput.click();
    }
  });
  orgsUploadPhotoButton?.addEventListener("click", () => {
    if (!currentUser) {
      setUploadStatus("Не удалось определить пользователя.", "error");
      return;
    }
    if (orgsUploadPhotoInput) {
      orgsUploadPhotoInput.click();
    }
  });
  orgsUploadInput?.addEventListener("change", async (event) => {
    const file = event.target?.files?.[0];
    await handleUploadTools(file);
    if (orgsUploadInput) {
      orgsUploadInput.value = "";
    }
  });
  orgsUploadPhotoInput?.addEventListener("change", async (event) => {
    const files = event.target?.files ?? [];
    await handleUploadPhotos(files);
    if (orgsUploadPhotoInput) {
      orgsUploadPhotoInput.value = "";
    }
  });
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
