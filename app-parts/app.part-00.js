const roleMap = new Map([
  [superAdminRole, renderSuperAdmin],
  [responsibleRole, renderResponsible],
  [mechanicRole, renderMechanic],
  [chiefEngineerRole, renderChiefEngineer],
  [leaderRole, renderLeader],
  [accountingRole, renderAccounting],
  [energyRole, renderEnergy],
  [controlRole, renderControl],
]);
const normalizedRoleMap = new Map(
  Array.from(roleMap.entries()).map(([roleId, render]) => [
    String(roleId ?? "").trim().toLowerCase(),
    roleId,
  ])
);

const contentEl = document.querySelector("[data-content]");
const userNameEl = document.querySelector("[data-user-name]");
const userOrgEl = document.querySelector("[data-user-org]");
const userPositionEl = document.querySelector("[data-user-position]");
const userInitialsEl = document.querySelector("[data-user-initials]");
const userPhotoEl = document.querySelector("[data-user-photo]");
const appUserEl = document.querySelector("[data-app-user]");
const userSettingsTriggerEl = document.querySelector("[data-user-settings-trigger]");
const superAdminStatEl = document.querySelector("[data-super-admin-stat]");
const energyPendingStatEl = document.querySelector("[data-energy-pending-stat]");
const energyPendingIconEl = document.querySelector("[data-energy-pending-icon]");
const energyPendingCountEl = document.querySelector("[data-energy-pending-count]");
const energyPendingWrapperEl = document.querySelector("[data-energy-pending-wrapper]");
const energyPendingStatusEl = document.querySelector("[data-energy-pending-status]");
const appTitleMetaEl = document.querySelector("[data-app-title-meta]");
const appTitleTextEl = document.querySelector("[data-app-title-text]");
const appTitlePositionEl = document.querySelector("[data-app-title-position]");
const settingsBackButtonEl = document.querySelector(
  "[data-settings-back-header]"
);
const orgFilePath = "./organizations.json";
const usersFilePath = "./users.json";
const pendingRegistrationsFilePath = "./pending-registrations.json";
const feedbackRequestsFilePath = "./feedback-requests.json";
const saveEndpoint = "./save.php";
const authLogFilePath = "./auth-log.json";
const authLogLimit = 200;
const fallbackBotToken = "8549452123:AAGxveuJSVf-xpNHQYTDKDmuMmHjGRVeDj0";
const botUsernameCacheKey = "alltrack-bot-username";
const initDataCacheKey = "alltrack-init-data";
const cacheBuster =
  window.ALLTRACK_CACHE_BUSTER || new Date().toISOString().replace(/\D/g, "");
const defaultPreferences = {
  iconStyle: "icon-title",
  grouping: "free",
  theme: "telegram",
};
const pendingAcceptanceMailingDefault = {
  days: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
  time: "18:00",
};
const quickAccessDefaults = ["breakdowns", "info", "search", "tools", "move"];
const energyExtraAccessOptions = [{ id: "awaiting-reply", title: "Отправлено", icon: "📤" }];
const noAccountingNumberAction = { id: "no-accounting-number", title: "Без бух. номера", icon: "🏷️" };
const accountingFixedDashboardActions = [
  { id: "workers", title: "Рабочие", icon: "👷" },
  { id: "accept-other", title: "Принять за других", icon: "✅" },
];
const energyAccessOptions = [...energyActions, ...energyExtraAccessOptions];
const strictAccessDashboardRoles = new Set([accountingRole]);
const strictSettingsAccessRoles = new Set([accountingRole]);
const explicitAccessDashboardRoles = new Set([accountingRole]);
const energyManagerRoles = new Set([energyRole, controlRole, accountingRole]);
const quickAccessLimit = 5;
const isIosMobile =
  /iP(ad|hone|od)/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const toolsReplacementActionPrefix = "tools-replacement:";
const energySettingsRoles = [
  responsibleRole,
  chiefEngineerRole,
  leaderRole,
  accountingRole,
  controlRole,
];
const getEnergySettingsAccessRoles = (dataUsage = {}) =>
  dataUsage?.mechanisms === true
    ? [...energySettingsRoles, mechanicRole]
    : energySettingsRoles;
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
const fineTitleBySettingKey = {
  lateReply: "Поздний ответ",
  noPhoto: "Нет фото",
  movedByEnergy: "Перемещение энергетиком",
};
const energyMailingOptions = [
  {
    id: "moveReplies",
    title: "Ответы на перемещения",
    defaultDays: ["Пт"],
    defaultTime: "13:00",
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
const defaultObjectName = "-";
const energyDataUsageOptions = [
  { id: "object", title: "Объект" },
  { id: "serialNumber", title: "Серийный номер" },
  { id: "cost", title: "Стоимость" },
  { id: "serviceLife", title: "Срок службы" },
  { id: "mechanisms", title: "Механизмы" },
];
const energyMovesTableColumnOptions = [
  { id: "appNumber", title: "Номер" },
  { id: "accountingNumber", title: "Бух.номер" },
  { id: "moveDate", title: "Дата перемещения" },
  { id: "acceptDate", title: "Дата принятия" },
  { id: "sender", title: "Передающий" },
  { id: "receiver", title: "Принимающий" },
  { id: "movedBy", title: "Переместил" },
  { id: "oldObject", title: "Старый объект" },
  { id: "newObject", title: "Новый объект" },
  { id: "name", title: "Наименование" },
  { id: "manufacturer", title: "Производитель" },
  { id: "model", title: "Модель" },
  { id: "moverId", title: "ID перемещающего" },
  { id: "receiverId", title: "ID принимающего" },
];
const energyMovesTableMonthDays = ["first", "last", "every7", "15", "16", "everyDay"];
const energyWeekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const weekDayOptions = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
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
      position: currentUser?.position ?? "",
      organization: organizationName || currentUser?.organization || "",
    },
  };
};
const energyDashboardRoles = new Set([
  energyRole,
  controlRole,
  responsibleRole,
  chiefEngineerRole,
  leaderRole,
  accountingRole,
  mechanicRole,
]);
const energyResponsibleAccessRoles = new Set([leaderRole]);
const responsibleLikeRoles = new Set([responsibleRole, mechanicRole, chiefEngineerRole]);
const isControlRole = (role) => String(role ?? "").trim() === controlRole;
const workerRole = "Рабочий";
const workerTelegramIdMarker = "не нужен";
const usersEditableRoleOptions = Array.from(
  new Set([...roleMap.keys(), workerRole].map((role) => String(role ?? "").trim()).filter(Boolean))
);
const getUsersEditableRoleOptions = (settingsData = currentSettingsContext?.settingsData) => {
  const mechanismsEnabled = getEnergyOrganizationSettings(settingsData).dataUsage?.mechanisms === true;
  return usersEditableRoleOptions.filter(
    (role) => role !== mechanicRole || mechanismsEnabled
  );
};
const setMechanicRoleSelectionEnabled = (form, enabled) => {
  const select = form?.elements?.["users-add-role"];
  const option = select?.querySelector('option[value="Механик"]');
  if (!option) return;
  option.hidden = !enabled;
  option.disabled = !enabled;
  if (!enabled && select.value === mechanicRole) select.value = "";
};
const isWorkerRole = (role) => String(role ?? "").trim() === workerRole;
const isWorkerUser = (entry) => isWorkerRole(entry?.role);
const isHiddenListUser = (entry) => isControlRole(entry?.role);
const isVisibleUsersDirectoryUser = (entry) =>
  !isHiddenListUser(entry) && !isWorkerUser(entry);
const isOrganizationUserForResponsibleSelect = (entry) =>
  Boolean(String(entry?.full_name ?? "").trim());
const isEnergyLikeRole = (role) => {
  const normalized = String(role ?? "").trim();
  return energyManagerRoles.has(normalized);
};
function normalizeRoleValue(role) {
  return String(role ?? "").trim();
}

function resolveRoleId(role) {
  const normalized = normalizeRoleValue(role).toLowerCase();
  return normalizedRoleMap.get(normalized) ?? null;
}
const globalLoadingEl = document.querySelector("[data-global-loading]");
const globalLoadingState = {
  activeRequests: 0,
  delayTimer: null,
};

if (isIosMobile) {
  document.body?.classList.add("is-ios");
}

function setGlobalLoadingVisible(isVisible) {
  if (!globalLoadingEl) return;
  const visible = Boolean(isVisible);
  globalLoadingEl.classList.toggle("is-visible", visible);
  globalLoadingEl.setAttribute("aria-hidden", String(!visible));
}

function updateGlobalLoadingState(change) {
  globalLoadingState.activeRequests = Math.max(
    0,
    globalLoadingState.activeRequests + change
  );

  if (globalLoadingState.activeRequests > 0) {
    if (globalLoadingState.delayTimer) return;
    globalLoadingState.delayTimer = window.setTimeout(() => {
      globalLoadingState.delayTimer = null;
      if (globalLoadingState.activeRequests > 0) {
        setGlobalLoadingVisible(true);
      }
    }, 140);
    return;
  }

  if (globalLoadingState.delayTimer) {
    window.clearTimeout(globalLoadingState.delayTimer);
    globalLoadingState.delayTimer = null;
  }
  setGlobalLoadingVisible(false);
}

const nativeFetch = window.fetch.bind(window);
window.fetch = (...args) => {
  updateGlobalLoadingState(1);
  return nativeFetch(...args).finally(() => {
    updateGlobalLoadingState(-1);
  });
};

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

function formatIsoDateValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseDateValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parts = text.split(".");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map((item) => Number.parseInt(item, 10));
  if (!day || !month || !year) return null;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parseIsoDateValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map((item) => Number(item));
    const parsed = new Date(year, month - 1, day);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }
  return parseDateValue(text);
}

function normalizeDemandNeedDate(value) {
  const parsed = parseIsoDateValue(value);
  if (!parsed) return "";
  return formatIsoDateValue(parsed);
}

function formatDemandNeedDate(value) {
  const parsed = parseIsoDateValue(value);
  if (!parsed) return "";
  return formatDateValue(parsed);
}

function getDaysDifference(laterDate, earlierDate) {
  if (!(laterDate instanceof Date) || !(earlierDate instanceof Date)) return 0;
  const start = new Date(
    earlierDate.getFullYear(),
    earlierDate.getMonth(),
    earlierDate.getDate()
  );
  const end = new Date(
    laterDate.getFullYear(),
    laterDate.getMonth(),
    laterDate.getDate()
  );
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / 86400000);
}

function isDemandOverdue(item) {
  if (!item || item.status !== "open") return false;
  const needDate = parseIsoDateValue(item.needDate);
  if (!needDate) return false;
  return getDaysDifference(new Date(), needDate) > 0;
}

function getDemandClosedDate(item) {
  return normalizeDemandNeedDate(item?.closedAt ?? item?.closed_at ?? item?.completedAt ?? item?.completed_at ?? item?.updatedAt ?? "");
}

function isDemandClosedLate(item) {
  if (!item || item.status === "open") return false;
  const needDate = parseIsoDateValue(item.needDate);
  const closedDate = parseIsoDateValue(getDemandClosedDate(item));
  if (!needDate || !closedDate) return false;
  return getDaysDifference(closedDate, needDate) > 0;
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

async function loadUserPendingMoves(orgFolderName, user) {
  if (!orgFolderName || !user) return [];
  const userName = normalizePersonName(user.full_name ?? user.fullName ?? "");
  if (!userName) return [];
  const movesPath = `./${orgFolderName}/Перемещения.json`;
  try {
    const rawMoves = await loadJson(movesPath);
    const moves = Array.isArray(rawMoves)
      ? rawMoves
      : Array.isArray(rawMoves?.moves)
        ? rawMoves.moves
        : [];
    return moves.filter((move) => {
      const responseDate = String(move?.["Дата ответа"] ?? "").trim();
      if (responseDate) return false;
      const acceptedBy = normalizePersonName(move?.["Принял"] ?? "");
      if (!acceptedBy || acceptedBy !== userName) return false;
      return true;
    });
  } catch (error) {
    console.warn("Не удалось загрузить перемещения для счётчика.", error);
  }
  return [];
}

async function loadUserPendingMovesCount(orgFolderName, user) {
  const moves = await loadUserPendingMoves(orgFolderName, user);
  return moves.length;
}

async function loadUserAwaitingReplyMoves(orgFolderName, user) {
  if (!orgFolderName || !user) return [];
  const userName = normalizePersonName(user.full_name ?? user.fullName ?? "");
  if (!userName) return [];
  const movesPath = `./${orgFolderName}/Перемещения.json`;
  try {
    const rawMoves = await loadJson(movesPath);
    const moves = Array.isArray(rawMoves)
      ? rawMoves
      : Array.isArray(rawMoves?.moves)
        ? rawMoves.moves
        : [];
    return moves.filter((move) => {
      const responseDate = String(move?.["Дата ответа"] ?? "").trim();
      if (responseDate) return false;
      const movedByEnergy = normalizePersonName(move?.["Переместил энергетик"] ?? "");
      if (movedByEnergy) {
        const responsibleBeforeMove = normalizePersonName(
          move?.["Ответственный до перемещения"] ?? ""
        );
        return responsibleBeforeMove && responsibleBeforeMove === userName;
      }
      const movedBy = normalizePersonName(move?.["Переместил"] ?? "");
      return movedBy && movedBy === userName;
    });
  } catch (error) {
    console.warn("Не удалось загрузить отправленные перемещения для счётчика.", error);
  }
  return [];
}

async function loadOrganizationUserToolsCounts(orgFolderName) {
  if (!orgFolderName) return new Map();
  const toolsPath = `./${orgFolderName}/База с инструментами.json`;
  try {
    const rawTools = await loadJson(toolsPath);
    const tools = Array.isArray(rawTools)
      ? rawTools
      : Array.isArray(rawTools?.tools)
        ? rawTools.tools
        : [];
    return tools.reduce((stats, tool) => {
      const responsible = normalizePersonName(tool?.["Ответственный"] ?? "");
      if (!responsible) return stats;
      const current = stats.get(responsible) ?? { count: 0, amount: 0 };
      const cost = normalizeCostValue(tool?.["Стоимость"]);
      stats.set(responsible, {
        count: current.count + 1,
        amount: current.amount + (Number.isFinite(cost) ? cost : 0),
      });
      return stats;
    }, new Map());
  } catch (error) {
    console.warn("Не удалось загрузить инструменты для счётчика.", error);
  }
  return new Map();
}

async function loadUserToolsCount(orgFolderName, user) {
  const userName = normalizePersonName(user?.full_name ?? user?.fullName ?? "");
  if (!userName) return 0;
  const counts = await loadOrganizationUserToolsCounts(orgFolderName);
  const stats = counts.get(userName);
  return typeof stats === "number" ? stats : stats?.count ?? 0;
}

function getUserToolsStats(stats) {
  const count = typeof stats === "number" ? stats : stats?.count;
  const amount = typeof stats === "number" ? 0 : stats?.amount;
  const safeCount = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0;
  const safeAmount = Number.isFinite(Number(amount)) ? Math.max(0, Number(amount)) : 0;
  return {
    count: safeCount,
    amount: Math.round(safeAmount),
  };
}

function formatUserToolsBadgeText(stats) {
  const { count, amount } = getUserToolsStats(stats);
  return `${count} ед. · ${amount.toLocaleString("ru-RU")} р.`;
}

function createUserToolsBadges(stats) {
  const { count, amount } = getUserToolsStats(stats);
  const countTag = document.createElement("span");
  countTag.className = "users-details__tools-count";
  countTag.textContent = `${count} ед.`;
  countTag.title = `Количество единиц: ${count}`;

  const amountTag = document.createElement("span");
  amountTag.className = "users-details__tools-count users-details__tools-count--amount";
  amountTag.textContent = `${amount.toLocaleString("ru-RU")} р.`;
  amountTag.title = `Суммарная стоимость: ${amount.toLocaleString("ru-RU")} р.`;

  return { countTag, amountTag };
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

function buildRemovePhotoSearchLine(tool) {
  return [
    tool?.["Номер"],
    tool?.["Бух.номер"],
    tool?.["Наименование"],
    tool?.["Производитель"],
    tool?.["Модель"],
    tool?.["Статус"],
    tool?.["Объект"],
    tool?.["Граппа инструментов"],
  ]
    .filter((value) => value !== null && value !== undefined && String(value).trim())
    .join(" ")
    .toLowerCase();
}

function buildRemovePhotoNumberSearchLine(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const variants = new Set([raw, ...getToolNumberVariants(raw)]);
  return Array.from(variants).join(" ").toLowerCase();
}

function buildWriteOffSearchLine(tool) {
  return [
    tool?.["Бух.номер"],
    tool?.["Номер"],
    tool?.["Наименование"],
    tool?.["Производитель"],
    tool?.["Модель"],
    tool?.["Статус"],
    tool?.["Объект"],
    tool?.["Граппа инструментов"],
  ]
    .filter((value) => value !== null && value !== undefined && String(value).trim())
    .join(" ")
    .toLowerCase();
}

function buildWriteOffNumberSearchLine(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const variants = new Set([raw, ...getToolNumberVariants(raw)]);
  return Array.from(variants).join(" ").toLowerCase();
}

const toolPhotoExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
const toolPhotoUrlCache = new Map();
const toolPhotoMissingCache = new Set();
const toolPhotoDirectoryIndexCache = new Map();

function buildToolPhotoDirectoryCacheKey(orgFolder, folderName) {
  return `${String(orgFolder ?? "").trim()}::${String(folderName ?? "").trim()}`;
}

function collectToolPhotoNumberFromFileName(fileName) {
  const leadingNumber = getLeadingToolNumberFromFileName(fileName);
  if (leadingNumber) return leadingNumber;
  const fallbackMatch = String(fileName).match(/^(\d+)[_-]/);
  return fallbackMatch ? fallbackMatch[1] : "";
}

function extractDirectoryListingLinks(html = "") {
  if (!html) return [];
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return Array.from(doc.querySelectorAll("a"))
      .map((link) => link.getAttribute("href"))
      .filter(Boolean);
  }
  const matches = Array.from(html.matchAll(/href=["']([^"']+)["']/gi));
  return matches.map((match) => match[1]).filter(Boolean);
}

function extractFileNameFromHref(href = "") {
  if (!href) return "";
  const cleaned = href.split("#")[0].split("?")[0];
  if (!cleaned || cleaned.endsWith("/")) return "";
  const parts = cleaned.split("/");
  return parts[parts.length - 1] || "";
}

function getLeadingToolNumberFromFileName(fileName) {
  if (!fileName) return "";
  const match = String(fileName).match(/^(?:№|N)?\s*(\d+)/i);
  return match ? match[1] : "";
}

async function resolvePhotoUrlFromListingEndpointInFolder(
  orgFolder,
  folderName,
  toolNumber
) {
  if (!orgFolder || !folderName || !toolNumber) return null;
  const variants = getToolNumberVariants(toolNumber);
  if (!variants.length) return null;
  const normalizedVariants = new Set(
    variants.map((variant) => normalizeToolNumberValue(variant))
  );
  const payload = JSON.stringify({
    entries: [
      {
        type: "list-photos",
        path: `${orgFolder}/${folderName}`,
        ...buildUploadUserMeta(),
      },
    ],
  });
  let responseText = "";
  try {
    const response = await fetch(saveEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    responseText = await response.text();
    if (!response.ok) return null;
  } catch (error) {
    return null;
  }
  if (!responseText) return null;
  try {
    const parsed = JSON.parse(responseText);
    const files = Array.isArray(parsed?.files) ? parsed.files : [];
    for (const file of files) {
      let decodedName = file;
      try {
        decodedName = decodeURIComponent(file);
      } catch (error) {
        decodedName = file;
      }
      const extension = decodedName.split(".").pop()?.toLowerCase() || "";
      if (!toolPhotoExtensions.has(extension)) continue;
      const leadingNumber = getLeadingToolNumberFromFileName(decodedName);
      if (!leadingNumber) continue;
      const normalized = normalizeToolNumberValue(leadingNumber);
      if (
        !normalizedVariants.has(normalized) &&
        !normalizedVariants.has(leadingNumber)
      ) {
        continue;
      }
      return new URL(
        `./${orgFolder}/${folderName}/${encodeURIComponent(decodedName)}`,
        window.location.href
      ).toString();
    }
  } catch (error) {
    return null;
  }
  return null;
}

async function resolvePhotoUrlFromDirectoryListingInFolder(
  orgFolder,
  folderName,
  toolNumber
) {
  if (!orgFolder || !toolNumber) return null;
  const variants = getToolNumberVariants(toolNumber);
  if (!variants.length) return null;
  const normalizedVariants = new Set(
    variants.map((variant) => normalizeToolNumberValue(variant))
  );
  const endpointResolved = await resolvePhotoUrlFromListingEndpointInFolder(
    orgFolder,
    folderName,
    toolNumber
  );
  if (endpointResolved) return endpointResolved;
  const folderPath = `./${orgFolder}/${folderName}/`;
  let response;
  try {
    response = await fetch(folderPath, { cache: "no-store" });
  } catch (error) {
    return null;
  }
  if (!response.ok) return null;
  const html = await response.text();
  const links = extractDirectoryListingLinks(html);
  for (const link of links) {
    const fileName = extractFileNameFromHref(link);
    if (!fileName) continue;
    let decoded = fileName;
    try {
      decoded = decodeURIComponent(fileName);
    } catch (error) {
      decoded = fileName;
    }
    const match = decoded.match(/^(\d+)[_-]/);
    if (!match) continue;
    const extension = decoded.split(".").pop()?.toLowerCase() || "";
    if (!toolPhotoExtensions.has(extension)) continue;
    const normalized = normalizeToolNumberValue(match[1]);
    if (
      !normalizedVariants.has(normalized) &&
      !normalizedVariants.has(match[1])
    ) {
      continue;
    }
    try {
      const url = new URL(link, new URL(folderPath, window.location.href));
      return url.toString();
    } catch (error) {
      continue;
    }
  }
  return null;
}

async function resolvePhotoUrlFromDirectoryListing(orgFolder, toolNumber) {
  return await resolvePhotoUrlFromDirectoryListingInFolder(
    orgFolder,
    "Фото инструментов",
    toolNumber
  );
}

async function getToolPhotoDirectoryIndexForFolder(orgFolder, folderName) {
  if (!orgFolder || !folderName) return null;
  const cacheKey = buildToolPhotoDirectoryCacheKey(orgFolder, folderName);
  if (toolPhotoDirectoryIndexCache.has(cacheKey)) {
    return toolPhotoDirectoryIndexCache.get(cacheKey);
  }
  const loader = (async () => {
    const index = new Map();
    const endpointPayload = JSON.stringify({
      entries: [
        {
          type: "list-photos",
          path: `${orgFolder}/${folderName}`,
          ...buildUploadUserMeta(),
        },
      ],
    });
    try {
      const response = await fetch(saveEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: endpointPayload,
      });
      const text = await response.text();
      if (response.ok && text) {
        const parsed = JSON.parse(text);
        const files = Array.isArray(parsed?.files) ? parsed.files : [];
        for (const file of files) {
          let decoded = file;
          try {
            decoded = decodeURIComponent(file);
          } catch (error) {
            decoded = file;
          }
          const extension = decoded.split(".").pop()?.toLowerCase() || "";
          if (!toolPhotoExtensions.has(extension)) continue;
          const number = collectToolPhotoNumberFromFileName(decoded);
          if (!number) continue;
          index.set(
            normalizeToolNumberValue(number),
            new URL(
              `./${orgFolder}/${folderName}/${encodeURIComponent(decoded)}`,
              window.location.href
            ).toString()
          );
        }
      }
    } catch (error) {
      // Ничего: попробуем fallback ниже.
    }
    if (index.size) return index;
    const folderPath = `./${orgFolder}/${folderName}/`;
    const response = await fetch(folderPath, { cache: "no-store" });
    if (!response.ok) return index;
    const html = await response.text();
    const links = extractDirectoryListingLinks(html);
    for (const link of links) {
      const fileName = extractFileNameFromHref(link);
      if (!fileName) continue;
      let decoded = fileName;
      try {
        decoded = decodeURIComponent(fileName);
      } catch (error) {
        decoded = fileName;
      }
      const extension = decoded.split(".").pop()?.toLowerCase() || "";
      if (!toolPhotoExtensions.has(extension)) continue;
      const number = collectToolPhotoNumberFromFileName(decoded);
      if (!number) continue;
      const absoluteUrl = new URL(link, new URL(folderPath, window.location.href));
      index.set(normalizeToolNumberValue(number), absoluteUrl.toString());
    }
    return index;
  })().catch(() => null);
  toolPhotoDirectoryIndexCache.set(cacheKey, loader);
  return loader;
}

function buildToolPhotoCandidatesForFolder(orgFolder, folderName, toolNumber) {
  if (!orgFolder) return [];
  const variants = getToolNumberVariants(toolNumber);
  if (!variants.length) return [];
  const extensions = Array.from(toolPhotoExtensions);
  const suffixes = ["", "_1", "-1"];
  const candidates = [];
  variants.forEach((variant) => {
    suffixes.forEach((suffix) => {
      extensions.forEach((ext) => {
        candidates.push(`./${orgFolder}/${folderName}/${variant}${suffix}.${ext}`);
      });
    });
  });
  return candidates;
}

function buildToolPhotoCandidates(orgFolder, toolNumber) {
  return buildToolPhotoCandidatesForFolder(
    orgFolder,
    "Фото инструментов",
    toolNumber
  );
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
  </svg>`
)}`;

const applyToolPhotoWithFallback = ({
  img,
  orgFolder,
  toolNumber,
  hasPhoto,
}) => {
  if (!(img instanceof HTMLImageElement)) return;
  img.loading = "lazy";
  img.decoding = "async";
  const normalizedToolNumber = normalizeToolNumberValue(toolNumber);
  const cacheKey = `${String(orgFolder ?? "").trim()}::${normalizedToolNumber}`;
  const candidates = hasPhoto
    ? buildToolPhotoCandidates(orgFolder, toolNumber)
    : [];
  let candidateIndex = 0;
  const fallbackToDirectoryListing = async () => {
    if (!orgFolder || !toolNumber) {
      if (cacheKey) toolPhotoMissingCache.add(cacheKey);
      return;
    }
    const resolved = await resolvePhotoUrlFromDirectoryListing(
      orgFolder,
      toolNumber
    );
    if (resolved) {
      if (cacheKey) {
        toolPhotoUrlCache.set(cacheKey, resolved);
        toolPhotoMissingCache.delete(cacheKey);
      }
      img.src = resolved;
      img.classList.remove("is-placeholder");
      return;
    }
    if (cacheKey) toolPhotoMissingCache.add(cacheKey);
  };
  const markLoaded = () => {
    if (img.classList.contains("is-placeholder")) {
      return;
    }
    if (cacheKey) {
      toolPhotoUrlCache.set(cacheKey, img.src);
      toolPhotoMissingCache.delete(cacheKey);
    }
    img.classList.remove("is-placeholder");
    img
      .closest(".tools-card__media")
      ?.querySelector(".tools-card__badge")
      ?.remove();
    img
      .closest(".tools-table__row")
      ?.classList.remove("tools-table__row--no-photo");
    img
      .closest(".tools-row")
      ?.classList.remove("tools-row--no-photo");
  };
  const setPlaceholder = () => {
    img.onerror = null;
    img.onload = null;
    img.src = toolPhotoPlaceholder;
    img.classList.add("is-placeholder");
    fallbackToDirectoryListing();
  };
  const tryCandidate = () => {
    if (candidateIndex >= candidates.length) {
      setPlaceholder();
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
    markLoaded();
  };
  if (cacheKey && toolPhotoUrlCache.has(cacheKey)) {
    img.src = toolPhotoUrlCache.get(cacheKey);
    return;
  }
  const resolvedFromDirectoryCache = async () => {
    const index = await getToolPhotoDirectoryIndexForFolder(
      orgFolder,
      "Фото инструментов"
    );
    const numberVariants = getToolNumberVariants(toolNumber)
      .map((variant) => normalizeToolNumberValue(variant))
      .filter(Boolean);
    for (const variant of numberVariants) {
      const value = index?.get(variant);
      if (!value) continue;
      toolPhotoUrlCache.set(cacheKey, value);
      toolPhotoMissingCache.delete(cacheKey);
      img.src = value;
      return true;
    }
    return false;
  };
  if (cacheKey && toolPhotoMissingCache.has(cacheKey)) {
    img.src = toolPhotoPlaceholder;
    img.classList.add("is-placeholder");
    return;
  }
  if (hasPhoto) {
    resolvedFromDirectoryCache().then((resolved) => {
      if (resolved) return;
      if (candidates.length) {
        tryCandidate();
        return;
      }
      setPlaceholder();
    });
  } else if (candidates.length) {
    tryCandidate();
  } else {
    setPlaceholder();
  }
};

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


function extractTelegramUserPhotoUrl() {
  const webApp = window.Telegram?.WebApp;
  const candidates = [
    webApp?.initDataUnsafe?.user?.photo_url,
    parseInitDataUser(webApp?.initData)?.photo_url,
    parseInitDataUser(getInitDataFromUrl())?.photo_url,
  ];

  for (const candidate of candidates) {
    const value = String(candidate ?? "").trim();
    if (value) return value;
  }

  return "";
}

function buildUserPhotoSrc(path) {
  const rawPath = String(path ?? "").trim();
  if (!rawPath) return "";
  if (/^https?:\/\//i.test(rawPath)) return rawPath;
  const normalized = rawPath
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "");
  const encodedPath = normalized
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  if (!encodedPath) return "";
  return `./${encodedPath}`;
}

function resolvePreferredUserPhotoUrl(user, { forceTelegram = false } = {}) {
  const customPhotoPath = forceTelegram ? "" : String(user?.profile_photo ?? "").trim();
  if (customPhotoPath) {
    return buildUserPhotoSrc(customPhotoPath);
  }
  return extractTelegramUserPhotoUrl();
}

function getUserPhotoCandidates(user, { forceInitials = false } = {}) {
  if (forceInitials) return [];

  const candidates = [];
  const customPhotoPath = String(user?.profile_photo ?? "").trim();
  if (customPhotoPath) {
    candidates.push(buildUserPhotoSrc(customPhotoPath));
  }

  const savedTelegramPhoto = String(user?.telegram_photo_url ?? "").trim();
  if (savedTelegramPhoto) {
    candidates.push(savedTelegramPhoto);
  }

  const currentTelegramId = normalizeTelegramId(window.Telegram?.WebApp?.initDataUnsafe?.user?.id);
  const userTelegramId = normalizeTelegramId(user?.telegram_id);
  const telegramPhoto = currentTelegramId && currentTelegramId === userTelegramId
    ? extractTelegramUserPhotoUrl()
    : "";
  if (telegramPhoto) {
    candidates.push(telegramPhoto);
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

async function syncCurrentUserTelegramPhoto(user) {
  const telegramPhoto = extractTelegramUserPhotoUrl();
  const telegramId = normalizeTelegramId(user?.telegram_id);
  if (!telegramPhoto || !telegramId) return user;

  const currentSavedPhoto = String(user?.telegram_photo_url ?? "").trim();
  if (currentSavedPhoto === telegramPhoto) return user;

  try {
    const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
    const users = Array.isArray(usersData?.users) ? [...usersData.users] : [];
    const userIndex = users.findIndex(
      (item) => normalizeTelegramId(item?.telegram_id) === telegramId
    );
    if (userIndex < 0) return user;

    users[userIndex] = {
      ...users[userIndex],
      telegram_photo_url: telegramPhoto,
    };
    await saveJson(usersFilePath, { ...usersData, users }, { user });
    return {
      ...user,
      telegram_photo_url: telegramPhoto,
    };
  } catch (error) {
    console.warn("Не удалось сохранить фото Telegram пользователя.", error);
    return user;
  }
}

function createUserDetailsAvatar(user) {
  const avatar = document.createElement("div");
  avatar.className = "users-details__avatar";

  const initials = document.createElement("span");
  initials.className = "users-details__initials";
  initials.textContent = getInitials(String(user?.full_name ?? "").trim());
  avatar.appendChild(initials);

  const photoCandidates = getUserPhotoCandidates(user);
  if (photoCandidates.length) {
    const photo = document.createElement("img");
    photo.className = "users-details__photo";
    photo.src = photoCandidates[0];
    photo.alt = `Фото ${formatFullName(String(user?.full_name ?? "").trim()) || "пользователя"}`;
    photo.loading = "lazy";
    photo.decoding = "async";
    let candidateIndex = 0;
    photo.addEventListener("load", () => {
      avatar.dataset.hasPhoto = "true";
    });
    photo.addEventListener("error", () => {
      candidateIndex += 1;
      if (photoCandidates[candidateIndex]) {
        photo.src = photoCandidates[candidateIndex];
        return;
      }
      photo.remove();
      delete avatar.dataset.hasPhoto;
    });
    avatar.appendChild(photo);
  }

  return avatar;
}

function updateHeaderUserBadge(fullName = "", { forceInitials = false } = {}) {
  const initials = getInitials(fullName);
  if (userInitialsEl) {
    userInitialsEl.textContent = initials;
  }

  if (!userPhotoEl) return;

  const photoCandidates = getUserPhotoCandidates(currentUser, { forceInitials });
  const badgeEl = userPhotoEl.closest(".app-title-badge");
  let candidateIndex = 0;

  const applyNoPhotoState = () => {
    userPhotoEl.classList.add("is-hidden");
    userPhotoEl.removeAttribute("src");
    userPhotoEl.onerror = null;
    userPhotoEl.onload = null;
    if (badgeEl) {
      badgeEl.dataset.hasPhoto = "false";
    }
  };

  const tryNextCandidate = () => {
    if (candidateIndex >= photoCandidates.length) {
      applyNoPhotoState();
      return;
    }

    const nextPhotoUrl = photoCandidates[candidateIndex];
    candidateIndex += 1;
    userPhotoEl.classList.remove("is-hidden");
    if (badgeEl) {
      badgeEl.dataset.hasPhoto = "true";
    }
    userPhotoEl.onload = () => {
      userPhotoEl.onerror = null;
      userPhotoEl.onload = null;
    };
    userPhotoEl.onerror = () => {
      tryNextCandidate();
    };
    userPhotoEl.src = nextPhotoUrl;
  };

  if (!photoCandidates.length) {
    applyNoPhotoState();
    return;
  }

  tryNextCandidate();
}

function applyUserSettingsHeader() {
  if (appTitleTextEl) {
    appTitleTextEl.textContent = "Мой профиль";
  }
  if (appTitlePositionEl) {
    appTitlePositionEl.textContent = "";
  }
  updateHeaderUserBadge(currentUser?.full_name ?? "");
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
}

function getCachedInitData() {
  try {
    const cachedSession = sessionStorage.getItem(initDataCacheKey);
    if (cachedSession) return cachedSession;
  } catch (error) {
    console.warn("Не удалось прочитать initData из sessionStorage.", error);
  }
  return null;
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


function resolveTelegramUserDisplayName() {
  const webApp = window.Telegram?.WebApp;
  const unsafeUser = webApp?.initDataUnsafe?.user ?? null;
  const initDataUser = parseInitDataUser(webApp?.initData ?? null);
  const urlInitDataUser = parseInitDataUser(getInitDataFromUrl());
  const candidate = unsafeUser ?? initDataUser ?? urlInitDataUser;
  if (!candidate) return "";
  const parts = [candidate.first_name, candidate.last_name]
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
  return parts.join(" ").trim();
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

const visitLogSessionStorageKey = "alltrack-visit-log-session-id";
let visitLogSessionId = "";
let visitLogOpened = false;
let visitLogClosed = false;

function createVisitLogSessionId() {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `visit-${randomPart}`;
}

function createMovementId() {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `move-${randomPart}`;
}

function getVisitLogSessionId() {
  if (visitLogSessionId) return visitLogSessionId;
  try {
    visitLogSessionId = sessionStorage.getItem(visitLogSessionStorageKey) || "";
    if (!visitLogSessionId) {
      visitLogSessionId = createVisitLogSessionId();
      sessionStorage.setItem(visitLogSessionStorageKey, visitLogSessionId);
    }
  } catch (error) {
    visitLogSessionId = createVisitLogSessionId();
  }
  return visitLogSessionId;
}

function buildVisitLogPayload(action) {
  if (!currentUser) return null;
  return {
    entries: [
      {
        type: "visit-log",
        action,
        session_id: getVisitLogSessionId(),
        user: {
          telegram_id: currentUser.telegram_id ?? null,
          full_name: currentUser.full_name ?? currentUser.fullName ?? "",
          role: currentUser.role ?? "",
          position: currentUser.position ?? "",
          organization: currentUser.organization ?? "",
        },
      },
    ],
  };
}

async function writeVisitLog(action, { keepalive = false } = {}) {
  const payload = buildVisitLogPayload(action);
  if (!payload) return;
  const body = JSON.stringify(payload);

  if (keepalive && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const sent = navigator.sendBeacon(
      saveEndpoint,
      new Blob([body], { type: "application/json" })
    );
    if (sent) return;
  }

  await fetch(saveEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive,
  });
}

function registerVisitLogCloseHandlers() {
  if (registerVisitLogCloseHandlers.registered) return;
  registerVisitLogCloseHandlers.registered = true;
  const close = () => {
    if (visitLogClosed || !visitLogOpened) return;
    visitLogClosed = true;
    void writeVisitLog("close", { keepalive: true }).catch((error) => {
      console.warn("Не удалось записать выход из приложения.", error);
    });
  };
  window.addEventListener("pagehide", close);
  window.addEventListener("beforeunload", close);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") close();
  });
}

async function startVisitLog() {
  if (visitLogOpened || !currentUser) return;
  visitLogOpened = true;
  visitLogClosed = false;
  registerVisitLogCloseHandlers();
  try {
    await writeVisitLog("open");
  } catch (error) {
    console.warn("Не удалось записать вход в приложение.", error);
  }
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
    return `${value.toLocaleString("ru-RU")} р.`;
  }
  const text = String(value ?? "").trim();
  return text ? text : "—";
}

function formatNotificationCostWithoutCurrency(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString("ru-RU");
  }
  const text = String(value ?? "").trim();
  if (!text) return "—";
  return text
    .replace(/\s?₽/g, "")
    .replace(/\s?(руб\.|рублей|рубля)/gi, "")
    .trim();
}

function formatToolCostLabel(tool) {
  return `Стоимость: ${formatNotificationCost(tool?.["Стоимость"])}`;
}

function formatToolCostValue(tool) {
  return formatNotificationCost(tool?.["Стоимость"]);
}

function formatCostValueWithCurrency(value, fallback = "—") {
  const text = formatNotificationCost(value);
  if (!text || text === "—") return fallback;
  return /(?:₽|р\.|руб(?:\.|л(?:ей|я)?)?)/i.test(text) ? text : `${text} р.`;
}

function formatDesktopProfileReportAmount(value) {
  const amount = normalizeCostValue(value) || 0;
  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(amount)} Br`;
}

function appendPersonNameWithBoldSurname(container, value, fallback = "—") {
  if (!container) return;
  const normalized = String(value ?? "").trim() || fallback;
  const [surname, ...rest] = normalized.split(/\s+/).filter(Boolean);
  if (!surname) {
    container.textContent = fallback;
    return;
  }
  const surnameEl = document.createElement("span");
  surnameEl.style.fontWeight = "700";
  surnameEl.textContent = surname;
  container.appendChild(surnameEl);
  if (rest.length > 0) {
    container.append(` ${rest.join(" ")}`);
  }
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
  const telegramGroups = normalizeTelegramGroupsList(
    settingsData?.organization?.telegramGroups ?? []
  );
  const groupsByKey = new Map();
  telegramGroups.forEach((group) => {
    const idKey = String(group.telegramId ?? "").trim();
    const nameKey = String(group.name ?? "").trim();
    if (idKey) groupsByKey.set(idKey, group);
    if (nameKey) groupsByKey.set(nameKey, group);
  });
  const raw = Array.isArray(source) ? source : [source];
  const unique = new Set();
  raw.forEach((value) => {
    const rawValue = String(value ?? "").trim();
    const directId = normalizeTelegramId(rawValue);
    if (directId) {
      unique.add(directId);
      return;
    }
    const mappedGroup = groupsByKey.get(rawValue);
    const mappedId = normalizeTelegramId(mappedGroup?.telegramId ?? null);
    if (mappedId) {
      unique.add(mappedId);
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

function getWeekDayShortName(date = new Date()) {
  const weekDayIndex = date.getDay();
  const map = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  return map[weekDayIndex] ?? "";
}

function buildNewToolNotificationMessage(
  tool,
  { organizationName, createdBy, numberType, objectTrackingEnabled = true } = {}
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
    objectTrackingEnabled
      ? `5. Объект: ${escapeTelegramHtml(
          formatNotificationValue(tool?.["Объект"])
        )}`
      : "",
    `${objectTrackingEnabled ? 6 : 5}. Дата покупки: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Дата покупки"])
    )}`,
    "",
    creatorLine,
  ];
  return lines.filter((line) => line !== "").join("\n");
}

function buildMoveToolNotificationMessage(
  tool,
  {
    movedBy,
    responsible,
    targetObject,
    oldObject,
    moveReason,
    vacationNote,
    moveKind,
    objectTrackingEnabled = true,
  } = {}
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
    moveKind === "objectChange"
      ? "🏗️<b><u>СМЕНА ОБЪЕКТА</u></b>"
      : "📦📦📦<b><u>ПЕРЕМЕЩЕНИЕ ИНСТРУМЕНТА</u></b>",
    `1. Номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Номер"])
    )}`,
    `2. Бух.номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Бух.номер"])
    )}`,
    `3. ${escapeTelegramHtml(titleLine)}`,
    ...(objectTrackingEnabled
      ? [
          `4. Старый объект: ${escapeTelegramHtml(
            formatNotificationValue(oldObject)
          )}`,
          `5. Новый объект: ${escapeTelegramHtml(
            formatNotificationValue(targetObject)
          )}`,
        ]
      : []),
  ];
  lines.push(
    `${objectTrackingEnabled ? 6 : 4}. Ответственный: ${escapeTelegramHtml(
      formatNotificationValue(responsible)
    )}`
  );
  if (moveReason) {
    lines.push(
      `${objectTrackingEnabled ? 7 : 5}. Причина перемещения: ${escapeTelegramHtml(
        formatNotificationValue(moveReason)
      )}`
    );
  }
  if (moveKind === "objectChange") {
    lines.push("7. Ответ: Смена объекта");
  }
  lines.push(
    "",
    `Переместил: ${escapeTelegramHtml(
      formatNotificationValue(movedBy)
    )}`
  );
  if (vacationNote) {
    lines.push(escapeTelegramHtml(formatNotificationValue(vacationNote)));
  }
  return lines.join("\n");
}

function buildMoveByEnergyNotificationMessage(
  tool,
  {
    movedBy,
    oldObject,
    targetObject,
    oldResponsible,
    newResponsible,
    fineNote,
    objectTrackingEnabled = true,
  } = {}
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
    "😤ПЕРЕМЕЩЕНИЕ ЭНЕРГЕТИКОМ",
    `1. Номер: ${escapeTelegramHtml(formatNotificationValue(tool?.["Номер"]))}`,
    `2. Бух.номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Бух.номер"])
    )}`,
    `3. ${escapeTelegramHtml(titleLine)}`,
    ...(objectTrackingEnabled
      ? [
          `4. Старый объект: ${escapeTelegramHtml(formatNotificationValue(oldObject))}`,
          `5. Новый объект: ${escapeTelegramHtml(
            formatNotificationValue(targetObject)
          )}`,
        ]
      : []),
    `${objectTrackingEnabled ? 6 : 4}. Прошлый ответственный: ${escapeTelegramHtml(
      formatNotificationValue(oldResponsible)
    )}`,
    `${objectTrackingEnabled ? 7 : 5}. Новый ответственный: ${escapeTelegramHtml(
      formatNotificationValue(newResponsible)
    )}`,
    `Переместил: ${escapeTelegramHtml(formatNotificationValue(movedBy))}`,
  ];
  if (fineNote) {
    lines.push("", escapeTelegramHtml(formatNotificationValue(fineNote)));
  }
  return lines.join("\n");
}

function buildMoveToolResponsibleMessage(
  tool,
  {
    movedBy,
    movedByEnergy,
    oldObject,
    targetObject,
    fineNote,
    moveReason,
    vacationNote,
    previousResponsible,
    objectTrackingEnabled = true,
  } = {}
) {
  const titleParts = [
    formatNotificationValue(tool?.["Наименование"], ""),
    formatNotificationValue(tool?.["Производитель"], ""),
    formatNotificationValue(tool?.["Модель"], ""),
  ]
    .map((part) => part.trim())
    .filter(Boolean);
  const titleLine = titleParts.length ? titleParts.join(" ") : "—";
  const energyMover = String(movedByEnergy ?? "").trim();
  const senderLabel = energyMover ? "Переместил энергетик" : "Переместил";
  const previousResponsibleLabel = energyMover
    ? "Ответственный"
    : "Ответственный до перемещения";
  const lines = [
    "🔔 Вам переместили инструмент",
    `1. Номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Номер"])
    )}`,
    `2. Бух.номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Бух.номер"])
    )}`,
    `3. ${escapeTelegramHtml(titleLine)}`,
    ...(objectTrackingEnabled
      ? [
          `4. Старый объект: ${escapeTelegramHtml(
            formatNotificationValue(oldObject)
          )}`,
          `5. Новый объект: ${escapeTelegramHtml(
            formatNotificationValue(targetObject)
          )}`,
        ]
      : []),
  ];
  if (previousResponsible) {
    lines.push(
      `${objectTrackingEnabled ? 6 : 4}. ${previousResponsibleLabel}: ${escapeTelegramHtml(
        formatNotificationValue(previousResponsible)
      )}`
    );
  }
  if (moveReason) {
    const reasonLineNumber = (objectTrackingEnabled ? 6 : 4) + (previousResponsible ? 1 : 0);
    lines.push(
      `${reasonLineNumber}. Причина перемещения: ${escapeTelegramHtml(
        formatNotificationValue(moveReason)
      )}`
    );
  }
  lines.push(
    "",
    `${senderLabel}: ${escapeTelegramHtml(
      formatNotificationValue(energyMover || movedBy)
    )}`
  );
  if (vacationNote) {
    lines.push(escapeTelegramHtml(formatNotificationValue(vacationNote)));
  }
  if (fineNote) {
    lines.push("", escapeTelegramHtml(fineNote));
  }
  return lines.join("\n");
}

function buildMoveDecisionNotificationMessage(
  tool,
  {
    decision,
    movedBy,
    respondedBy,
    targetObject,
    oldObject,
    reason,
    moveReason,
    isForMover = false,
    objectTrackingEnabled = true,
  } = {}
) {
  const titleParts = [
    formatNotificationValue(tool?.["Наименование"], ""),
    formatNotificationValue(tool?.["Производитель"], ""),
    formatNotificationValue(tool?.["Модель"], ""),
  ]
    .map((part) => part.trim())
    .filter(Boolean);
  const titleLine = titleParts.length ? titleParts.join(" ") : "—";
  const isAccepted = decision === "Принял";
  const header = isForMover
    ? isAccepted
      ? "✅ Ваше перемещение принято"
      : "❌ Ваше перемещение не приняли"
    : isAccepted
      ? "✅✅✅<b><u>ИНСТРУМЕНТ ПРИНЯТ</u></b>"
      : "❌❌❌<b><u>ИНСТРУМЕНТ НЕ ПРИНЯТ</u></b>";
  const lines = [
    header,
    `1. Номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Номер"])
    )}`,
    `2. Бух.номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Бух.номер"])
    )}`,
    `3. ${escapeTelegramHtml(titleLine)}`,
    ...(objectTrackingEnabled
      ? [
          `4. Старый объект: ${escapeTelegramHtml(
            formatNotificationValue(oldObject)
          )}`,
          `5. Новый объект: ${escapeTelegramHtml(
            formatNotificationValue(targetObject)
          )}`,
        ]
      : []),
  ];
  if (moveReason) {
    lines.push(
      `${objectTrackingEnabled ? 6 : 4}. Причина перемещения: ${escapeTelegramHtml(
        formatNotificationValue(moveReason)
      )}`
    );
  }
  if (respondedBy) {
    lines.push("", `Ответил: ${escapeTelegramHtml(respondedBy)}`);
  }
  if (movedBy) {
    lines.push(`Переместил: ${escapeTelegramHtml(movedBy)}`);
  }
  if (!isAccepted && reason) {
    lines.push(`Причина отказа: ${escapeTelegramHtml(reason)}`);
  }
  return lines.join("\n");
}

function buildWriteOffNotificationMessage(
  tool,
  { writeOffDate, wroteOffBy, objectTrackingEnabled = true } = {}
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
    "🧾🧾🧾<b><u>СПИСАНИЕ ИНСТРУМЕНТА</u></b>",
    `1. Номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Номер"])
    )}`,
    `2. Бух.номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Бух.номер"])
    )}`,
    `3. ${escapeTelegramHtml(titleLine)}`,
    `4. Стоимость: ${escapeTelegramHtml(
      formatNotificationCost(tool?.["Стоимость"])
    )}`,
    `5. Ответственный: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Ответственный"])
    )}`,
    ...(objectTrackingEnabled
      ? [
          `6. Объект: ${escapeTelegramHtml(
            formatNotificationValue(tool?.["Объект"])
          )}`,
        ]
      : []),
    `${objectTrackingEnabled ? 7 : 6}. Дата списания: ${escapeTelegramHtml(
      formatNotificationValue(writeOffDate)
    )}`,
    `${objectTrackingEnabled ? 8 : 7}. Списал: ${escapeTelegramHtml(
      formatNotificationValue(wroteOffBy)
    )}`,
  ];
  return lines.join("\n");
}

function buildBreakdownNotificationMessage(
  tool,
  { breakdownDate, description, markedBy, objectTrackingEnabled = true } = {}
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
    "⚠️⚠️⚠️<b><u>ПОЛОМКА ИНСТРУМЕНТА</u></b>",
    `1. Номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Номер"])
    )}`,
    `2. Бух.номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Бух.номер"])
    )}`,
    `3. ${escapeTelegramHtml(titleLine)}`,
    `4. Ответственный: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Ответственный"])
    )}`,
    ...(objectTrackingEnabled
      ? [
          `5. Объект: ${escapeTelegramHtml(
            formatNotificationValue(tool?.["Объект"])
          )}`,
        ]
      : []),
    `${objectTrackingEnabled ? 6 : 5}. Описание: ${escapeTelegramHtml(
      formatNotificationValue(description)
    )}`,
    `${objectTrackingEnabled ? 7 : 6}. Дата поломки: ${escapeTelegramHtml(
      formatNotificationValue(breakdownDate)
    )}`,
    `${objectTrackingEnabled ? 8 : 7}. Отметил: ${escapeTelegramHtml(
      formatNotificationValue(markedBy)
    )}`,
  ];
  return lines.join("\n");
}

function buildFixBreakdownNotificationMessage(
  tool,
  { fixDate, markedBy, objectTrackingEnabled = true } = {}
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
    "✅✅✅<b><u>ИНСТРУМЕНТ ОТРЕМОНТИРОВАН</u></b>",
    `1. Номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Номер"])
    )}`,
    `2. Бух.номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Бух.номер"])
    )}`,
    `3. ${escapeTelegramHtml(titleLine)}`,
    `4. Ответственный: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Ответственный"])
    )}`,
    ...(objectTrackingEnabled
      ? [
          `5. Объект: ${escapeTelegramHtml(
            formatNotificationValue(tool?.["Объект"])
          )}`,
        ]
      : []),
    `${objectTrackingEnabled ? 6 : 5}. Дата ремонта: ${escapeTelegramHtml(
      formatNotificationValue(fixDate)
    )}`,
    `${objectTrackingEnabled ? 7 : 6}. Отметил: ${escapeTelegramHtml(
      formatNotificationValue(markedBy)
    )}`,
  ];
  return lines.join("\n");
}

function buildSendToRepairNotificationMessage(
  tool,
  { organizationName, description, cost, repairDate, markedBy } = {}
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
    "🛠️🛠️🛠️<b><u>ОТПРАВЛЕН В РЕМОНТ</u></b>",
    `1. Номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Номер"])
    )}`,
    `2. Бух.номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Бух.номер"])
    )}`,
    `3. ${escapeTelegramHtml(titleLine)}`,
    `4. Ответственный: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Ответственный"])
    )}`,
    `5. Организация: ${escapeTelegramHtml(
      formatNotificationValue(organizationName)
    )}`,
  ];
  if (description) {
    lines.push(
      `6. Описание: ${escapeTelegramHtml(
        formatNotificationValue(description)
      )}`
    );
  }
  if (cost) {
    lines.push(
      `7. Стоимость: ${escapeTelegramHtml(formatNotificationCost(cost))}`
    );
  }
  lines.push(
    `8. Дата отправки: ${escapeTelegramHtml(
      formatNotificationValue(repairDate)
    )}`,
    `9. Отправил: ${escapeTelegramHtml(
      formatNotificationValue(markedBy)
    )}`
  );
  return lines.join("\n");
}

function buildRepairedNotificationMessage(
  tool,
  { repairDate, repairCost, repairedBy } = {}
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
    "✅✅✅<b><u>ИНСТРУМЕНТ ОТРЕМОНТИРОВАН</u></b>",
    `1. Номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Номер"])
    )}`,
    `2. Бух.номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Бух.номер"])
    )}`,
    `3. ${escapeTelegramHtml(titleLine)}`,
    `4. Ответственный: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Ответственный"])
    )}`,
  ];
  if (repairCost !== null && repairCost !== undefined && repairCost !== "") {
    lines.push(
      `5. Стоимость ремонта: ${escapeTelegramHtml(
        formatNotificationCost(repairCost)
      )}`
    );
  }
  lines.push(
    `6. Дата ремонта: ${escapeTelegramHtml(
      formatNotificationValue(repairDate)
    )}`,
    `7. Вернул из ремонта: ${escapeTelegramHtml(
      formatNotificationValue(repairedBy)
    )}`
  );
  return lines.join("\n");
}

function buildMoveCancelResponsibleMessage(
  tool,
  { movedBy, canceledBy, targetObject, oldObject, moveReason, objectTrackingEnabled = true } = {}
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
    "⚪️ Перемещение отменено",
    `1. Номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Номер"])
    )}`,
    `2. Бух.номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Бух.номер"])
    )}`,
    `3. ${escapeTelegramHtml(titleLine)}`,
    ...(objectTrackingEnabled
      ? [
          `4. Старый объект: ${escapeTelegramHtml(
            formatNotificationValue(oldObject)
          )}`,
          `5. Новый объект: ${escapeTelegramHtml(
            formatNotificationValue(targetObject)
          )}`,
        ]
      : []),
  ];
  if (moveReason) {
    lines.push(
      `${objectTrackingEnabled ? 6 : 4}. Причина перемещения: ${escapeTelegramHtml(
        formatNotificationValue(moveReason)
      )}`
    );
  }
  if (movedBy) {
    lines.push("", `Переместил: ${escapeTelegramHtml(movedBy)}`);
  }
  if (canceledBy) {
    lines.push(`Отменил: ${escapeTelegramHtml(canceledBy)}`);
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

async function sendTelegramMessage(chatId, text, { parseMode = "HTML" } = {}) {
  if (!fallbackBotToken || !chatId || !text) {
    return { ok: false, status: null, errorText: "некорректные данные" };
  }
  const payload = {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  };
  if (parseMode) {
    payload.parse_mode = parseMode;
  }
  const response = await fetch(
    `https://api.telegram.org/bot${fallbackBotToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

async function sendTelegramDocument(chatId, documentUrl, caption) {
  if (!fallbackBotToken || !chatId || !documentUrl) {
    return { ok: false, status: null, errorText: "некорректные данные" };
  }
  const response = await fetch(
    `https://api.telegram.org/bot${fallbackBotToken}/sendDocument`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        document: documentUrl,
        caption: caption ?? "",
        parse_mode: "HTML",
      }),
    }
  );
  const errorText = await parseTelegramError(response);
  if (!response.ok) {
    console.warn("Не удалось отправить документ в Telegram.", {
      chatId,
      status: response.status,
      errorText,
    });
  }
  return { ok: response.ok, status: response.status, errorText };
}

async function sendTelegramMediaGroup(chatId, media) {
  if (!fallbackBotToken || !chatId || !Array.isArray(media) || !media.length) {
    return { ok: false, status: null, errorText: "некорректные данные" };
  }
  const response = await fetch(
    `https://api.telegram.org/bot${fallbackBotToken}/sendMediaGroup`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        media,
      }),
    }
  );
  const errorText = await parseTelegramError(response);
  if (!response.ok) {
    console.warn("Не удалось отправить медиагруппу в Telegram.", {
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
      const headResponse = await fetch(candidate, { method: "HEAD" });
      if (headResponse.ok) {
        return new URL(candidate, window.location.href).toString();
      }
      const getResponse = await fetch(candidate, { cache: "no-store" });
      if (getResponse.ok) {
        return new URL(candidate, window.location.href).toString();
      }
    } catch (error) {
      continue;
    }
  }
  return await resolvePhotoUrlFromDirectoryListing(orgFolder, toolNumber);
}

async function resolveWriteOffPhotoUrl(orgFolder, toolNumber) {
  if (!orgFolder || !toolNumber) return null;
  const candidates = [
    ...buildToolPhotoCandidatesForFolder(
      orgFolder,
      "Фото инструментов. Списание",
      toolNumber
    ),
    ...buildToolPhotoCandidatesForFolder(
      orgFolder,
      "Фото инструментов",
      toolNumber
    ),
  ];
  if (!candidates.length) return null;
  for (const candidate of candidates) {
    try {
      const headResponse = await fetch(candidate, { method: "HEAD" });
      if (headResponse.ok) {
        return new URL(candidate, window.location.href).toString();
      }
      const getResponse = await fetch(candidate, { cache: "no-store" });
      if (getResponse.ok) {
        return new URL(candidate, window.location.href).toString();
      }
    } catch (error) {
      continue;
    }
  }
  const fromWriteOff = await resolvePhotoUrlFromDirectoryListingInFolder(
    orgFolder,
    "Фото инструментов. Списание",
    toolNumber
  );
  if (fromWriteOff) return fromWriteOff;
  return await resolvePhotoUrlFromDirectoryListing(orgFolder, toolNumber);
}

function buildDeclinePhotoUrl(orgFolder, fileName) {
  if (!orgFolder || !fileName) return "";
  const folderSegment = encodeURIComponent("Фото отказов");
  const orgSegment = encodeURIComponent(orgFolder);
  const fileSegment = encodeURIComponent(fileName);
  return new URL(
    `./${orgSegment}/${folderSegment}/${fileSegment}`,
    window.location.href
  ).toString();
}

function buildBreakdownPhotoUrl(orgFolder, fileName) {
  if (!orgFolder || !fileName) return "";
  const folderSegment = encodeURIComponent("Фото поломок");
  const orgSegment = encodeURIComponent(orgFolder);
  const fileSegment = encodeURIComponent(fileName);
  return new URL(
    `./${orgSegment}/${folderSegment}/${fileSegment}`,
    window.location.href
  ).toString();
}

function buildRepairActUrl(orgFolder, fileName) {
  if (!orgFolder || !fileName) return "";
  const folderSegment = encodeURIComponent("Акты ремонтов");
  const orgSegment = encodeURIComponent(orgFolder);
  const fileSegment = encodeURIComponent(fileName);
  return new URL(
    `./${orgSegment}/${folderSegment}/${fileSegment}`,
    window.location.href
  ).toString();
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
      objectTrackingEnabled: isObjectTrackingEnabled(settingsData),
    });
    await Promise.all(
      groupIds.map((chatId) => sendTelegramMessage(chatId, message))
    );
  } catch (error) {
    console.warn("Не удалось отправить уведомление о новом инструменте.", error);
  }
}

async function notifyWriteOffTool({
  tool,
  orgFolder,
  organizationName,
  writeOffDate,
  wroteOffBy,
}) {
  const result = {
    sent: false,
    reasons: [],
  };
  if (!tool || !orgFolder) {
    result.reasons.push("не переданы данные о списании");
    return result;
  }
  if (!fallbackBotToken) {
    result.reasons.push("не задан токен Telegram‑бота");
    return result;
  }
  const settingsPath = `./${orgFolder}/Настройки.json`;
  try {
    const settingsData = await loadJson(settingsPath);
    const groupsEnabled = isNotificationEnabled(settingsData, "writeOff");
    const groupIds = groupsEnabled
      ? extractNotificationGroups(settingsData, "writeOff")
      : [];
    const writeOffMessage = buildWriteOffNotificationMessage(tool, {
      writeOffDate,
      wroteOffBy,
      organizationName,
      objectTrackingEnabled: isObjectTrackingEnabled(settingsData),
    });
    let groupSent = false;
    const groupErrors = [];
    if (!groupsEnabled) {
      result.reasons.push("уведомления в группах выключены в Настройки.json");
    } else if (!groupIds.length) {
      result.reasons.push("не выбраны группы для уведомлений");
    } else {
      const shouldAttach = isNotificationPhotoEnabled(settingsData, "writeOff");
      if (shouldAttach) {
        const photoNumber = resolveToolPhotoNumberForNotification(tool);
        const photoUrl = await resolveWriteOffPhotoUrl(orgFolder, photoNumber);
        if (photoUrl) {
          const sendResults = await Promise.all(
            groupIds.map(async (chatId) => {
              const photoResult = await sendTelegramPhoto(
                chatId,
                photoUrl,
                writeOffMessage
              );
              if (photoResult.ok) return { ok: true };
              groupErrors.push(formatTelegramSendError(photoResult));
              const messageResult = await sendTelegramMessage(
                chatId,
                writeOffMessage
              );
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
                writeOffMessage
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
            const messageResult = await sendTelegramMessage(
              chatId,
              writeOffMessage
            );
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
    result.sent = groupSent;
  } catch (error) {
    console.warn("Не удалось отправить уведомление о списании.", error);
    const message = error?.message ? `: ${error.message}` : "";
    result.reasons.push(`ошибка при отправке уведомлений${message}`);
  }
  return result;
}

async function notifyToolBreakdown({
  tool,
  orgFolder,
  breakdownDate,
  description,
  markedBy,
  breakdownPhotos = [],
} = {}) {
  if (!tool || !orgFolder) return;
  if (!fallbackBotToken) return;
  const settingsPath = `./${orgFolder}/Настройки.json`;
  try {
    const settingsData = await loadJson(settingsPath);
    const groupsEnabled = isNotificationEnabled(settingsData, "toolBreakdown");
    const groupIds = groupsEnabled
      ? extractNotificationGroups(settingsData, "toolBreakdown")
      : [];
    if (!groupsEnabled || !groupIds.length) return;
    const message = buildBreakdownNotificationMessage(tool, {
      breakdownDate,
      description,
      markedBy,
      objectTrackingEnabled: isObjectTrackingEnabled(settingsData),
    });
    const photoUrls = [];
    if (breakdownPhotos.length) {
      breakdownPhotos.forEach((fileName) => {
        const url = buildBreakdownPhotoUrl(orgFolder, fileName);
        if (url) photoUrls.push(url);
      });
    }
    if (isNotificationPhotoEnabled(settingsData, "toolBreakdown")) {
      const photoNumber = resolveToolPhotoNumberForNotification(tool);
      const toolPhotoUrl = await resolveAvailablePhotoUrl(orgFolder, photoNumber);
      if (toolPhotoUrl) {
        photoUrls.push(toolPhotoUrl);
      }
    }
    const uniquePhotoUrls = Array.from(new Set(photoUrls)).slice(0, 10);
    const sendToGroup = async (chatId) => {
      if (!uniquePhotoUrls.length) {
        await sendTelegramMessage(chatId, message);
        return;
      }
      if (uniquePhotoUrls.length === 1) {
        const result = await sendTelegramPhoto(
          chatId,
          uniquePhotoUrls[0],
          message
        );
        if (!result.ok) {
          await sendTelegramMessage(chatId, message);
        }
        return;
      }
      const media = uniquePhotoUrls.map((url, index) => ({
        type: "photo",
        media: url,
        ...(index === 0 ? { caption: message, parse_mode: "HTML" } : {}),
      }));
      const result = await sendTelegramMediaGroup(chatId, media);
      if (!result.ok) {
        let hasSent = false;
        for (let index = 0; index < uniquePhotoUrls.length; index += 1) {
          const caption = index === 0 ? message : "";
          const fallbackResult = await sendTelegramPhoto(
            chatId,
            uniquePhotoUrls[index],
            caption
          );
          if (fallbackResult.ok) {
            hasSent = true;
          }
        }
        if (!hasSent) {
          await sendTelegramMessage(chatId, message);
        }
      }
    };
    await Promise.all(groupIds.map((chatId) => sendToGroup(chatId)));
  } catch (error) {
    console.warn("Не удалось отправить уведомление о поломке.", error);
  }
}

async function notifyFixBreakdown({
  tool,
  orgFolder,
  fixDate,
  markedBy,
} = {}) {
  if (!tool || !orgFolder) return;
  if (!fallbackBotToken) return;
  const settingsPath = `./${orgFolder}/Настройки.json`;
  try {
    const settingsData = await loadJson(settingsPath);
    const groupsEnabled = isNotificationEnabled(settingsData, "fixBreakdown");
    const groupIds = groupsEnabled
      ? extractNotificationGroups(settingsData, "fixBreakdown")
      : [];
    if (!groupsEnabled || !groupIds.length) return;
    const message = buildFixBreakdownNotificationMessage(tool, {
      fixDate,
      markedBy,
      objectTrackingEnabled: isObjectTrackingEnabled(settingsData),
    });
    const shouldAttach = isNotificationPhotoEnabled(
      settingsData,
      "fixBreakdown"
    );
    let photoUrl = "";
    if (shouldAttach) {
      const photoNumber = resolveToolPhotoNumberForNotification(tool);
      const resolved = await resolveAvailablePhotoUrl(orgFolder, photoNumber);
      if (resolved) photoUrl = resolved;
    }
    const sendToGroup = async (chatId) => {
      if (!photoUrl) {
        await sendTelegramMessage(chatId, message);
        return;
      }
      const result = await sendTelegramPhoto(chatId, photoUrl, message);
      if (!result.ok) {
        await sendTelegramMessage(chatId, message);
      }
    };
    await Promise.all(groupIds.map((chatId) => sendToGroup(chatId)));
  } catch (error) {
    console.warn("Не удалось отправить уведомление об устранении поломки.", error);
  }
}

async function notifySendToRepair({
  tool,
  orgFolder,
  organizationName,
  description,
  cost,
  repairDate,
  markedBy,
} = {}) {
  if (!tool || !orgFolder) return;
  if (!fallbackBotToken) return;
  const settingsPath = `./${orgFolder}/Настройки.json`;
  try {
    const settingsData = await loadJson(settingsPath);
    const groupsEnabled = isNotificationEnabled(settingsData, "sendToRepair");
    const groupIds = groupsEnabled
      ? extractNotificationGroups(settingsData, "sendToRepair")
      : [];
    if (!groupsEnabled || !groupIds.length) return;
    const message = buildSendToRepairNotificationMessage(tool, {
      organizationName,
      description,
      cost,
      repairDate,
      markedBy,
    });
    const attachSetting =
      settingsData?.notifications?.sendToRepair?.attachPhoto ??
      settingsData?.organization?.notifications?.sendToRepair?.attachPhoto;
    const shouldAttach = attachSetting === false;
    let photoUrl = "";
    if (shouldAttach) {
      const photoNumber = resolveToolPhotoNumberForNotification(tool);
      const resolved = await resolveAvailablePhotoUrl(orgFolder, photoNumber);
      if (resolved) photoUrl = resolved;
    }
    const sendToGroup = async (chatId) => {
      if (!photoUrl) {
        await sendTelegramMessage(chatId, message);
        return;
      }
      const result = await sendTelegramPhoto(chatId, photoUrl, message);
      if (!result.ok) {
        await sendTelegramMessage(chatId, message);
      }
    };
    await Promise.all(groupIds.map((chatId) => sendToGroup(chatId)));
  } catch (error) {
    console.warn("Не удалось отправить уведомление об отправке в ремонт.", error);
  }
}

async function notifyRepaired({
  tool,
  orgFolder,
  repairDate,
  repairCost,
  repairedBy,
  actFileUrl,
} = {}) {
  if (!tool || !orgFolder) return;
  if (!fallbackBotToken) return;
  const settingsPath = `./${orgFolder}/Настройки.json`;
  try {
    const settingsData = await loadJson(settingsPath);
    const groupsEnabled = isNotificationEnabled(settingsData, "repaired");
    const groupIds = groupsEnabled
      ? extractNotificationGroups(settingsData, "repaired")
      : [];
    if (!groupsEnabled || !groupIds.length) return;
    const message = buildRepairedNotificationMessage(tool, {
      repairDate,
      repairCost,
      repairedBy,
    });
    const shouldAttach = isNotificationPhotoEnabled(settingsData, "repaired");
    let toolPhotoUrl = "";
    if (shouldAttach) {
      const photoNumber = resolveToolPhotoNumberForNotification(tool);
      const resolved = await resolveAvailablePhotoUrl(orgFolder, photoNumber);
      if (resolved) toolPhotoUrl = resolved;
    }
    const sendToGroup = async (chatId) => {
      if (actFileUrl) {
        if (toolPhotoUrl) {
          const media = [
            {
              type: "photo",
              media: toolPhotoUrl,
              caption: message,
              parse_mode: "HTML",
            },
            {
              type: "document",
              media: actFileUrl,
            },
          ];
          const result = await sendTelegramMediaGroup(chatId, media);
          if (result.ok) return;
        }
        let messageSent = false;
        if (toolPhotoUrl) {
          const photoResult = await sendTelegramPhoto(
            chatId,
            toolPhotoUrl,
            message
          );
          if (!photoResult.ok) {
            await sendTelegramMessage(chatId, message);
            messageSent = true;
          } else {
            messageSent = true;
          }
        } else {
          await sendTelegramMessage(chatId, message);
          messageSent = true;
        }
        const docResult = await sendTelegramDocument(chatId, actFileUrl, "");
        if (!docResult.ok) {
          if (!messageSent) {
            await sendTelegramMessage(chatId, message);
          }
        }
        return;
      }
      if (toolPhotoUrl) {
        await sendTelegramPhoto(chatId, toolPhotoUrl, message);
        return;
      }
      await sendTelegramMessage(chatId, message);
    };
    await Promise.all(groupIds.map((chatId) => sendToGroup(chatId)));
  } catch (error) {
    console.warn("Не удалось отправить уведомление о ремонте.", error);
  }
}

function findUserEntry(usersData, { fullName, organization }) {
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
  return match ?? null;
}

function findUserTelegramId(usersData, { fullName, organization }) {
  return normalizeTelegramId(
    findUserEntry(usersData, { fullName, organization })?.telegram_id
  );
}

function findAccountingTelegramIds(usersData, organization) {
  const normalizedOrg = String(organization ?? "").trim().toLowerCase();
  const ids = (usersData?.users ?? [])
    .filter((entry) => {
      if (String(entry?.role ?? "").trim() !== accountingRole) return false;
      if (!normalizedOrg) return true;
      return String(entry?.organization ?? "").trim().toLowerCase() === normalizedOrg;
    })
    .map((entry) => normalizeTelegramId(entry?.telegram_id))
    .filter(Boolean);
  return Array.from(new Set(ids));
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

function getMovedByEnergyFineAmount(settingsData) {
  const fine = settingsData?.organization?.fines?.movedByEnergy ?? {};
  if (!fine.enabled) return 0;
  return Math.max(0, normalizeNumber(fine.amount, 0));
}

function buildMovedByEnergyFineNote(settingsData) {
  const amount = getMovedByEnergyFineAmount(settingsData);
  if (!amount) return "";
  return `Назначен штраф за перемещение энергетиком: ${formatNotificationCost(amount)}.`;
}

function resolveToolPhotoNumberForNotification(tool) {
  const byNumber = String(tool?.["Номер"] ?? "").trim();
  const byAccounting = String(tool?.["Бух.номер"] ?? "").trim();
  return byNumber || byAccounting;
}

function resolveMoveDecisionPhotoNumber(tool, move) {
  const fromTool = resolveToolPhotoNumberForNotification(tool);
  if (fromTool) return fromTool;
  const byNumber = String(move?.["Номер"] ?? "").trim();
  const byAccounting = String(move?.["Бух.номер"] ?? "").trim();
  return byNumber || byAccounting;
}

async function notifyMoveTool({
  tool,
  orgFolder,
  organizationName,
  responsibleName,
  responsibleTelegramId,
  targetObject,
  movedBy,
  moveReason,
  vacationNote,
  notificationId = "moveTool",
  fineNote,
  previousResponsible,
  movedByEnergy,
  moveKind = "default",
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
    const groupsEnabled = isNotificationEnabled(settingsData, notificationId);
    const groupIds = groupsEnabled
      ? extractNotificationGroups(settingsData, notificationId)
      : [];
    const oldObject = String(tool?.["Объект"] ?? "").trim();
    const oldResponsible =
      String(previousResponsible ?? "").trim() ||
      String(tool?.["Ответственный"] ?? "").trim();
    const moveMessage =
      notificationId === "moveByEnergy"
        ? buildMoveByEnergyNotificationMessage(tool, {
            movedBy,
            oldObject,
            targetObject,
            oldResponsible,
            newResponsible: responsibleName,
            fineNote,
            objectTrackingEnabled: isObjectTrackingEnabled(settingsData),
          })
        : buildMoveToolNotificationMessage(tool, {
            movedBy,
            responsible: responsibleName,
            targetObject,
            oldObject,
            moveReason,
            vacationNote,
            moveKind,
            objectTrackingEnabled: isObjectTrackingEnabled(settingsData),
          });
    const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
    const responsibleEntry = findUserEntry(usersData, {
      fullName: responsibleName,
      organization: organizationName,
    });
    const isWorkerResponsible = isWorkerUser(responsibleEntry);
    const accountingTelegramIds = isWorkerResponsible
      ? findAccountingTelegramIds(usersData, organizationName)
      : [];
    const notifyAccountingAboutWorkerMove = async () => {
      if (!isWorkerResponsible) return false;
      if (!accountingTelegramIds.length) {
        result.reasons.push("у бухгалтерии не указан Telegram ID");
        return false;
      }
      const accountingMessage = `${moveMessage}\n\nПолучатель — рабочий без Telegram ID. Уведомление отправлено бухгалтерии организации.`;
      const sendResults = await Promise.all(
        accountingTelegramIds.map((chatId) =>
          sendTelegramMessage(chatId, accountingMessage)
        )
      );
      const sent = sendResults.some((entry) => entry?.ok);
      if (!sent) {
        const errors = sendResults
          .map((entry) => formatTelegramSendError(entry))
          .filter(Boolean);
        result.reasons.push(
          errors.length
            ? `не удалось отправить бухгалтерии (${Array.from(new Set(errors)).join("; ")})`
            : "не удалось отправить бухгалтерии"
        );
      }
      return sent;
    };
    let accountingSent = false;
    let groupSent = false;
    const groupErrors = [];
    if (!groupsEnabled) {
      result.suppressedBySettings = true;
      accountingSent = await notifyAccountingAboutWorkerMove();
      result.sent = accountingSent;
      return result;
    } else if (!groupIds.length) {
      result.reasons.push("не выбраны группы для уведомлений");
    } else {
      const shouldAttach = isNotificationPhotoEnabled(settingsData, notificationId);
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

    accountingSent = await notifyAccountingAboutWorkerMove();
    const resolvedResponsibleId = isWorkerResponsible
      ? ""
      : normalizeTelegramId(responsibleTelegramId) ||
        normalizeTelegramId(responsibleEntry?.telegram_id);
    let responsibleSent = false;
    if (resolvedResponsibleId) {
      const lateReplyFineNote = buildLateReplyFineNote(settingsData);
      const combinedFineNote = [lateReplyFineNote, fineNote]
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
        .join("\n");
      const responsibleMessage = buildMoveToolResponsibleMessage(tool, {
        movedBy,
        movedByEnergy,
        oldObject,
        targetObject,
        fineNote: combinedFineNote,
        moveReason,
        vacationNote,
        previousResponsible: oldResponsible,
        objectTrackingEnabled: isObjectTrackingEnabled(settingsData),
      });
      const responsibleResult = await sendTelegramMessage(
        resolvedResponsibleId,
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
    } else if (!isWorkerResponsible) {
      result.reasons.push("у ответственного не указан Telegram ID");
    }
    result.sent = groupSent || responsibleSent || accountingSent;
  } catch (error) {
    console.warn("Не удалось отправить уведомление о перемещении.", error);
    const message = error?.message ? `: ${error.message}` : "";
    result.reasons.push(`ошибка при отправке уведомлений${message}`);
  }
  return result;
}

async function notifyMoveDecision({
  tool,
  move,
  orgFolder,
  organizationName,
  decision,
  reason,
  respondedBy,
  declinePhotoUrl,
} = {}) {
  if (!tool || !move || !orgFolder) return;
  if (!fallbackBotToken) return;
  const notificationId = decision === "Принял" ? "acceptTool" : "declineTool";
  const settingsPath = `./${orgFolder}/Настройки.json`;
  try {
    const settingsData = await loadJson(settingsPath);
    const groupsEnabled = isNotificationEnabled(settingsData, notificationId);
    const groupIds = groupsEnabled
      ? extractNotificationGroups(settingsData, notificationId)
      : [];
    const moveMessage = buildMoveDecisionNotificationMessage(tool, {
      decision,
      movedBy: String(move?.["Переместил"] ?? "").trim(),
      respondedBy,
      targetObject: String(move?.["Новый объект"] ?? "").trim(),
      oldObject: String(move?.["Старый объект"] ?? "").trim(),
      reason,
      moveReason: String(move?.["Причина перемещения"] ?? "").trim(),
      isForMover: false,
      objectTrackingEnabled: isObjectTrackingEnabled(settingsData),
    });
    if (groupsEnabled && groupIds.length) {
      const shouldAttach = isNotificationPhotoEnabled(
        settingsData,
        notificationId
      );
      const sendGroupMessage = async (chatId) => {
        if (declinePhotoUrl) {
          const photoResult = await sendTelegramPhoto(
            chatId,
            declinePhotoUrl,
            moveMessage
          );
          if (!photoResult.ok) {
            await sendTelegramMessage(chatId, moveMessage);
          }
          return;
        }
        if (shouldAttach) {
          const photoNumber = resolveMoveDecisionPhotoNumber(tool, move);
          const photoUrl = await resolveAvailablePhotoUrl(orgFolder, photoNumber);
          if (photoUrl) {
            await sendTelegramPhoto(chatId, photoUrl, moveMessage);
            return;
          }
        }
        await sendTelegramMessage(chatId, moveMessage);
      };
      await Promise.all(groupIds.map((chatId) => sendGroupMessage(chatId)));
    }

    const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
    const moverTelegramId = findUserTelegramId(usersData, {
      fullName: String(move?.["Переместил"] ?? "").trim(),
      organization: organizationName,
    });
    if (moverTelegramId) {
      const moverMessage = buildMoveDecisionNotificationMessage(tool, {
        decision,
        movedBy: String(move?.["Переместил"] ?? "").trim(),
        respondedBy,
        targetObject: String(move?.["Новый объект"] ?? "").trim(),
        oldObject: String(move?.["Старый объект"] ?? "").trim(),
        reason,
        moveReason: String(move?.["Причина перемещения"] ?? "").trim(),
        isForMover: true,
        objectTrackingEnabled: isObjectTrackingEnabled(settingsData),
      });
      const shouldAttach = isNotificationPhotoEnabled(
        settingsData,
        notificationId
      );
      if (declinePhotoUrl) {
        const photoResult = await sendTelegramPhoto(
          moverTelegramId,
          declinePhotoUrl,
          moverMessage
        );
        if (!photoResult.ok) {
          await sendTelegramMessage(moverTelegramId, moverMessage);
        }
      } else if (shouldAttach) {
        const photoNumber = resolveMoveDecisionPhotoNumber(tool, move);
        const photoUrl = await resolveAvailablePhotoUrl(orgFolder, photoNumber);
        if (photoUrl) {
          await sendTelegramPhoto(moverTelegramId, photoUrl, moverMessage);
        } else {
          await sendTelegramMessage(moverTelegramId, moverMessage);
        }
      } else {
        await sendTelegramMessage(moverTelegramId, moverMessage);
      }
    }
  } catch (error) {
    console.warn("Не удалось отправить уведомление о решении.", error);
  }
}

async function notifyMoveCancel({
  tool,
  move,
  orgFolder,
  organizationName,
  canceledBy,
} = {}) {
  if (!tool || !move || !orgFolder) return;
  if (!fallbackBotToken) return;
  const settingsPath = `./${orgFolder}/Настройки.json`;
  try {
    const settingsData = await loadJson(settingsPath);
    const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
    const responsibleTelegramId = findUserTelegramId(usersData, {
      fullName: String(move?.["Принял"] ?? "").trim(),
      organization: organizationName,
    });
    if (!responsibleTelegramId) return;
    const cancelMessage = buildMoveCancelResponsibleMessage(tool, {
      movedBy: String(move?.["Переместил"] ?? "").trim(),
      canceledBy,
      targetObject: String(move?.["Новый объект"] ?? "").trim(),
      oldObject: String(move?.["Старый объект"] ?? "").trim(),
      moveReason: String(move?.["Причина перемещения"] ?? "").trim(),
      objectTrackingEnabled: isObjectTrackingEnabled(settingsData),
    });
    const shouldAttach = isNotificationPhotoEnabled(
      settingsData,
      "moveTool"
    );
    if (shouldAttach) {
      const photoNumber = resolveMoveDecisionPhotoNumber(tool, move);
      const photoUrl = await resolveAvailablePhotoUrl(orgFolder, photoNumber);
      if (photoUrl) {
        const photoResult = await sendTelegramPhoto(
          responsibleTelegramId,
          photoUrl,
          cancelMessage
        );
        if (photoResult.ok) return;
      }
    }
    await sendTelegramMessage(responsibleTelegramId, cancelMessage);
  } catch (error) {
    console.warn("Не удалось отправить уведомление об отмене.", error);
  }
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
  const activeResults = results.filter(
    (entry) => !entry?.suppressedBySettings
  );
  const summary = buildNotificationSummary(activeResults);
  const sentCount = activeResults.filter((entry) => entry?.sent).length;
  const allSent =
    activeResults.length === 0 || sentCount === activeResults.length;
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

function formatHeaderUserName(fullName = "") {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "Пользователь";
  }
  if (parts.length === 1) {
    return parts[0];
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


function splitPersonNameParts(fullName = "") {
  const parts = String(fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    lastName: parts[0] ?? "",
    firstName: parts[1] ?? "",
    middleName: parts.slice(2).join(" "),
  };
}

function buildPersonFullName(lastName = "", firstName = "", middleName = "") {
  return [lastName, firstName, middleName]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

function replacePersonNameInJsonValue(value, oldFullName, newFullName) {
  const oldName = String(oldFullName ?? "").trim();
  const newName = String(newFullName ?? "").trim();
  if (!oldName || !newName || normalizePersonName(oldName) === normalizePersonName(newName)) {
    return { value, changed: false };
  }
  const oldNameKey = normalizePersonName(oldName);
  if (typeof value === "string") {
    return normalizePersonName(value) === oldNameKey
      ? { value: newName, changed: true }
      : { value, changed: false };
  }
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const result = replacePersonNameInJsonValue(item, oldName, newName);
      changed = changed || result.changed;
      return result.value;
    });
    return { value: changed ? next : value, changed };
  }
  if (value && typeof value === "object") {
    let changed = false;
    const next = {};
    Object.entries(value).forEach(([key, item]) => {
      const result = replacePersonNameInJsonValue(item, oldName, newName);
      changed = changed || result.changed;
      next[key] = result.value;
    });
    return { value: changed ? next : value, changed };
  }
  return { value, changed: false };
}

const organizationUserNameJsonFiles = [
  "Настройки.json",
  "Объекты.json",
  "База с инструментами.json",
  "Перемещения.json",
  "Перемещения история.json",
  "Заявки.json",
  "Штрафы.json",
  "Ремонты.json",
  "Списания.json",
  "Поломки.json",
];

async function buildOrganizationNameReplacementEntries(orgFolderName, oldFullName, newFullName, meta = {}) {
  const orgFolder = String(orgFolderName ?? "").trim();
  if (!orgFolder || normalizePersonName(oldFullName) === normalizePersonName(newFullName)) {
    return [];
  }
  const entries = [];
  await Promise.all(
    organizationUserNameJsonFiles.map(async (fileName) => {
      const path = `./${orgFolder}/${fileName}`;
      try {
        const data = await loadJson(path);
        const result = replacePersonNameInJsonValue(data, oldFullName, newFullName);
        if (result.changed) {
          entries.push({ path, data: result.value, ...meta });
        }
      } catch (error) {
        // Файл может отсутствовать у организации — это нормально.
      }
    })
  );
  return entries;
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

function normalizePendingAcceptanceMailing(raw = {}) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const normalizedDays = Array.isArray(source.days)
    ? source.days
        .map((day) => String(day ?? "").trim())
        .filter((day) => weekDayOptions.includes(day))
    : [];
  const days = normalizedDays.length
    ? [...new Set(normalizedDays)]
    : [...pendingAcceptanceMailingDefault.days];

  const parsedTime = String(source.time ?? "").trim();
  const time = /^([01]\d|2[0-3]):([0-5]\d)$/.test(parsedTime)
    ? parsedTime
    : pendingAcceptanceMailingDefault.time;

  return { days, time };
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


function setUserSettingsMode(isActive) {
  document.body?.classList.toggle("is-user-settings", Boolean(isActive));
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

function renderUserSettingsView(user, preferences, pendingAcceptanceMailing) {
  const normalized = normalizePreferences(preferences);
  const mailingSchedule = normalizePendingAcceptanceMailing(pendingAcceptanceMailing);
  const userPosition = String(user?.position ?? "").trim();
  const fullName = String(user?.full_name ?? "Пользователь").trim() || "Пользователь";
  const roleTitle = String(user?.role ?? "Роль не указана").trim() || "Роль не указана";
  const organizationTitle = String(user?.organization ?? "Организация").trim() || "Организация";
  return `
    <section class="role-card user-settings-page">
      <form class="form-grid user-settings-form" data-settings-form>
        <div class="user-settings-hero">
          <div class="user-settings-hero__glow" aria-hidden="true"></div>
          <div class="settings-profile-photo settings-profile-photo--hero">
            <div class="settings-profile-photo__preview settings-profile-photo__preview--hero">
              <img
                src="${escapeHtml(resolvePreferredUserPhotoUrl(user))}"
                alt="Фото пользователя"
                data-settings-photo-preview
              />
            </div>
            <label class="settings-profile-photo__button settings-photo-action">
              <span aria-hidden="true">📷</span>
              <span>Заменить</span>
              <input
                class="settings-profile-photo__input"
                type="file"
                accept="image/*"
                data-settings-photo-input
              />
            </label>
          </div>
          <div class="user-settings-hero__content">
            <h1>${escapeHtml(formatShortName(fullName) || fullName)}</h1>
            <div class="user-settings-hero__meta">
              <span>${escapeHtml(roleTitle)}</span>
              <span>${escapeHtml(organizationTitle)}</span>
            </div>
            <label class="user-settings-position" for="user-settings-position">
              <span class="user-settings-position__label">Должность</span>
              <input
                class="user-settings-position__input"
                type="text"
                id="user-settings-position"
                name="user-position"
                value="${escapeHtml(userPosition)}"
                placeholder="Укажите должность"
                autocomplete="organization-title"
              />
            </label>
          </div>
        </div>
        <div class="settings-section settings-section--home-screen">
          <div class="settings-section-head settings-section-head--compact">
            <span class="settings-section-icon" aria-hidden="true">🧭</span>
            <div>
              <div class="settings-section-title">Главный экран</div>
              <p>Как показывать кнопки функций</p>
            </div>
          </div>
          <div class="settings-home-options" role="radiogroup" aria-label="Вид кнопок на главном экране">
            <label class="settings-home-option">
              <input
                class="toggle-input"
                type="radio"
                name="icon-style"
                value="icon-only"
                ${normalized.iconStyle === "icon-only" ? "checked" : ""}
              />
              <span class="settings-home-card">
                <span class="settings-home-card__preview settings-home-card__preview--icons" aria-hidden="true">
                  <span></span><span></span><span></span>
                </span>
                <span class="settings-home-card__text">
                  <span class="settings-home-card__title">Компактно</span>
                  <span class="settings-home-card__hint">Только значки</span>
                </span>
              </span>
            </label>
            <label class="settings-home-option">
              <input
                class="toggle-input"
                type="radio"
                name="icon-style"
                value="icon-title"
                ${normalized.iconStyle === "icon-title" ? "checked" : ""}
              />
              <span class="settings-home-card">
                <span class="settings-home-card__preview settings-home-card__preview--row" aria-hidden="true">
                  <span></span><i></i>
                </span>
                <span class="settings-home-card__text">
                  <span class="settings-home-card__title">Понятно</span>
                  <span class="settings-home-card__hint">Значок + название</span>
                </span>
              </span>
            </label>
            <label class="settings-home-option">
              <input
                class="toggle-input"
                type="radio"
                name="icon-style"
                value="icon-title-below"
                ${normalized.iconStyle === "icon-title-below" ? "checked" : ""}
              />
              <span class="settings-home-card">
                <span class="settings-home-card__preview settings-home-card__preview--stack" aria-hidden="true">
                  <span></span><i></i>
                </span>
                <span class="settings-home-card__text">
                  <span class="settings-home-card__title">Воздушно</span>
                  <span class="settings-home-card__hint">Название снизу</span>
                </span>
              </span>
            </label>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-section-head">
            <span class="settings-section-icon" aria-hidden="true">🔔</span>
            <div>
              <div class="settings-section-title">Напоминания</div>
            </div>
          </div>
          <div class="settings-weekdays" role="group" aria-label="Дни рассылки">
            ${weekDayOptions
              .map(
                (day) => `
              <label class="settings-weekday-option">
                <input
                  class="settings-weekday-input"
                  type="checkbox"
                  name="pending-mailing-days"
                  value="${day}"
                  ${mailingSchedule.days.includes(day) ? "checked" : ""}
                />
                <span class="settings-day-chip">${day}</span>
              </label>
            `
              )
              .join("")}
          </div>
          <div class="form-field settings-field-card">
            <label class="form-label" for="user-settings-pending-mailing-time">Время рассылки</label>
            <input
              class="form-input"
              type="time"
              id="user-settings-pending-mailing-time"
              name="pending-mailing-time"
              value="${mailingSchedule.time}"
            />
          </div>
        </div>
        <div class="settings-section settings-section--compact">
          <div class="settings-section-head">
            <span class="settings-section-icon" aria-hidden="true">🧩</span>
            <div>
              <div class="settings-section-title">Порядок функций</div>
            </div>
          </div>
          <input type="hidden" name="grouping" value="free" />
          <button
            class="settings-group-button"
            type="button"
            data-settings-grouping
          >
            <span class="settings-group-icon" aria-hidden="true">↕</span>
            <span>Настроить</span>
          </button>
        </div>
        <div class="settings-section settings-section--theme">
          <div class="settings-section-head settings-section-head--theme">
            <span class="settings-section-icon" aria-hidden="true">🎨</span>
            <div>
              <div class="settings-section-title">Тема</div>
              <p>Выберите оформление</p>
            </div>
          </div>
          <div class="toggle-group toggle-group--theme" role="radiogroup" aria-label="Тема приложения">
            <label class="theme-choice">
              <input
                class="toggle-input"
                type="radio"
                name="theme"
                value="light"
                ${normalized.theme === "light" ? "checked" : ""}
              />
              <span class="theme-choice__button">
                <span class="theme-choice__icon" aria-hidden="true">☀️</span>
                <span>Светлая</span>
              </span>
            </label>
            <label class="theme-choice">
              <input
                class="toggle-input"
                type="radio"
                name="theme"
                value="dark"
                ${normalized.theme === "dark" ? "checked" : ""}
              />
              <span class="theme-choice__button">
                <span class="theme-choice__icon" aria-hidden="true">🌙</span>
                <span>Тёмная</span>
              </span>
            </label>
            <label class="theme-choice">
              <input
                class="toggle-input"
                type="radio"
                name="theme"
                value="telegram"
                ${normalized.theme === "telegram" ? "checked" : ""}
              />
              <span class="theme-choice__button">
                <span class="theme-choice__icon" aria-hidden="true">💬</span>
                <span>Telegram</span>
              </span>
            </label>
          </div>
        </div>
        <div class="form-message user-settings-message" data-settings-message aria-live="polite"></div>
      </form>
    </section>
  `;
}

async function saveCurrentUserPosition(positionValue) {
  if (!currentUser) return;
  const nextPosition = String(positionValue ?? "").trim().replace(/\s+/g, " ");
  const currentPosition = String(currentUser.position ?? "").trim();
  if (nextPosition === currentPosition) return;

  const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
  const users = Array.isArray(usersData?.users) ? [...usersData.users] : [];
  const telegramIdKey = normalizeTelegramId(currentUser.telegram_id);
  const userIndex = users.findIndex(
    (item) => normalizeTelegramId(item?.telegram_id) === telegramIdKey
  );
  if (userIndex < 0) return;

  users[userIndex] = {
    ...users[userIndex],
    position: nextPosition,
  };

  await saveJson(usersFilePath, { users }, { user: currentUser });
  currentUser = {
    ...currentUser,
    position: nextPosition,
  };
}

async function saveCurrentUserProfilePhoto(file, context) {
  if (!currentUser) {
    throw new Error("Пользователь не найден.");
  }
  if (!file) {
    throw new Error("Файл не выбран.");
  }
  if (!String(file.type ?? "").startsWith("image/")) {
    throw new Error("Нужен файл изображения.");
  }
  const userId = normalizeTelegramId(currentUser.telegram_id);
  if (!userId) {
    throw new Error("Не найден ID пользователя Telegram.");
  }

  const orgFolder = String(context?.orgFolderName ?? "").trim();
  if (!orgFolder) {
    throw new Error("Не удалось определить папку организации.");
  }

  const extension = resolveProfilePhotoExtension(file);
  const fileName = `${userId}.${extension}`;
  const targetPath = `${orgFolder}/Фото пользователей/${fileName}`;
  const content = await readFileAsBase64(file);

  await uploadPhotoEntriesInBatches([
    {
      type: "file",
      path: targetPath,
      content,
      encoding: "base64",
      mime: file.type || "image/*",
      ...buildUploadUserMeta({ organizationName: context?.orgFullName }),
    },
  ]);

  const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
  const users = Array.isArray(usersData?.users) ? [...usersData.users] : [];
  const userIndex = users.findIndex(
    (item) => normalizeTelegramId(item?.telegram_id) === userId
  );
  if (userIndex >= 0) {
    users[userIndex] = {
      ...users[userIndex],
      profile_photo: targetPath,
    };
    await saveJson(usersFilePath, { users }, { user: currentUser });
  }

  currentUser = {
    ...currentUser,
    profile_photo: targetPath,
  };

  return targetPath;
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
  { onBatch, batchSize = 2, retryCount = 1, retryDelayMs = 350 } = {}
) {
  if (!entries.length) return;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const saveWithRetry = async (payload) => {
    let lastError = null;
    const attempts = Math.max(0, Number.parseInt(retryCount, 10)) + 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        await saveEntriesViaEndpoint(payload);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < attempts - 1) {
          await wait(retryDelayMs);
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Не удалось сохранить данные.");
  };

  const totalBatches = Math.ceil(entries.length / batchSize);
  for (let index = 0; index < totalBatches; index += 1) {
    const batch = entries.slice(index * batchSize, (index + 1) * batchSize);
    try {
      await saveWithRetry(batch);
    } catch (error) {
      if (batch.length === 1) {
        throw error;
      }
      for (const entry of batch) {
        await saveWithRetry([entry]);
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

async function saveJsonBatch(entries = []) {
  if (!Array.isArray(entries) || !entries.length) return;
  return saveEntries(entries);
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

function getFileExtensionFromName(name = "") {
  const fileName = String(name).trim();
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "";
  const safeExtension = String(extension ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 10);
  return safeExtension || "jpg";
}

function resolveProfilePhotoExtension(file) {
  const mimeType = String(file?.type ?? "").trim().toLowerCase();
  const extensionFromMime = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  }[mimeType];
  if (extensionFromMime) {
    return extensionFromMime;
  }

  const extensionFromName = getFileExtensionFromName(file?.name ?? "");
  const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
  if (allowedExtensions.has(extensionFromName)) {
    return extensionFromName === "jpeg" ? "jpg" : extensionFromName;
  }

  throw new Error(
    "Формат фото не поддерживается. Выберите JPG, PNG, WEBP или GIF."
  );
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
  const {
    forceToggleLast = false,
    includePending = true,
    includeAwaitingReply = true,
    includeToggle = true,
  } = options;
  const actionIds = new Set(actions.map((action) => action.id));
  const normalized = [];
  const usedIds = new Set();
  let hasToggle = false;
  let hasPending = false;
  let hasAwaitingReply = false;

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
      if (item.type === "pending") {
        if (!includePending) return;
        if (!hasPending) {
          normalized.push({ type: "pending" });
          hasPending = true;
        }
        return;
      }
      if (item.type === "awaiting-reply") {
        if (!includeAwaitingReply) return;
        if (!hasAwaitingReply) {
          normalized.push({ type: "awaiting-reply" });
          hasAwaitingReply = true;
        }
        return;
      }
      if (item.type === "toggle") {
        if (!includeToggle) return;
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

  if (includePending && !hasPending) {
    normalized.unshift({ type: "pending" });
    hasPending = true;
  }

  if (includeAwaitingReply && !hasAwaitingReply) {
    normalized.splice(hasPending ? 1 : 0, 0, { type: "awaiting-reply" });
  }

  if (includeToggle && !hasToggle) {
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

function updateEnergyPendingStat({ count = 0, available = [] } = {}) {
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
  if (energyPendingStatusEl) {
    energyPendingStatusEl.textContent = "";
  }
  if (energyPendingCountEl) {
    energyPendingCountEl.textContent = String(pendingCount);
    energyPendingCountEl.classList.toggle("is-hidden", !isWaiting);
  }
  if (energyPendingWrapperEl) {
    energyPendingWrapperEl.dataset.pendingMoves = JSON.stringify(available || []);
    energyPendingWrapperEl.dataset.pendingCount = String(pendingCount);
  }

  const quickAccessPendingIcons = document.querySelectorAll(
    "[data-quick-access-pending-icon]"
  );
  quickAccessPendingIcons.forEach((iconEl) => {
    iconEl.textContent = isWaiting ? "⏳" : "✅";
  });

  const quickAccessPendingCounts = document.querySelectorAll(
    "[data-quick-access-pending-count]"
  );
  quickAccessPendingCounts.forEach((countEl) => {
    countEl.textContent = String(pendingCount);
    countEl.classList.toggle("is-hidden", !isWaiting);
  });

  const quickAccessPendingButtons = document.querySelectorAll(
    "[data-quick-access-pending]"
  );
  quickAccessPendingButtons.forEach((button) => {
    button.setAttribute(
      "title",
      isWaiting ? `Перемещения: ${pendingCount}` : "Перемещения: все приняты"
    );
    button.setAttribute(
      "aria-label",
      isWaiting ? `Перемещения: ${pendingCount}` : "Перемещения: все приняты"
    );
  });
}

function updateEnergyAwaitingReplyStat({ count = 0 } = {}) {
  const safeCount = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0;
  const hasItems = safeCount > 0;
  const icons = document.querySelectorAll("[data-awaiting-reply-icon]");
  icons.forEach((iconEl) => {
    iconEl.textContent = hasItems ? "📤" : "✅";
  });
  const counts = document.querySelectorAll("[data-awaiting-reply-count]");
  counts.forEach((countEl) => {
    countEl.textContent = String(safeCount);
    countEl.classList.toggle("is-hidden", !hasItems);
  });
  const buttons = document.querySelectorAll(
    "[data-awaiting-reply-button], [data-quick-access-awaiting-reply]"
  );
  const title = hasItems
    ? `Отправлено: ${safeCount}`
    : "По моим перемещениям ответы получены";
  buttons.forEach((button) => {
    button.setAttribute("title", title);
    button.setAttribute("aria-label", title);
  });
}

function applyGroupingPreference(layout, actions, preference, options = {}) {
  const { includeSystemCards = true } = options;
  const systemItems = includeSystemCards
    ? [{ type: "pending" }, { type: "awaiting-reply" }]
    : [];
  if (preference === "none") {
    return [
      ...systemItems,
      ...actions.map((action) => ({ type: "action", id: action.id })),
    ];
  }
  if (preference === "all-group") {
    return [
      ...systemItems,
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

function isToolsReplacementActionId(actionId) {
  return (
    typeof actionId === "string" && actionId.startsWith(toolsReplacementActionPrefix)
  );
}

function createEnergyActionCard(action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "action-card";
  button.dataset.energyItem = "";
  button.dataset.energyItemType = "action";
  button.dataset.actionId = action.id;
  if (isToolsReplacementActionId(action.id)) {
    button.dataset.toolsReplacementActionId = action.id;
  }
  const replacementBadge =
    isToolsReplacementActionId(action.id)
      ? `<span class="action-card__badge is-hidden" data-tools-replacement-count data-tools-replacement-action-id="${action.id}"></span>`
      : "";
  const toolsBadge =
    action.id === "tools"
      ? '<span class="action-card__badge" data-my-tools-count>0</span>'
      : "";
  button.innerHTML = `
    <span class="action-icon">${action.icon}</span>
    <div class="action-title action-title--fit">${action.title}</div>
    ${replacementBadge}
    ${toolsBadge}
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

function createEnergyAwaitingReplyCard() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "pending-stat pending-stat--grid action-card";
  button.dataset.energyItem = "";
  button.dataset.energyItemType = "awaiting-reply";
  button.dataset.actionId = "awaiting-reply";
  button.dataset.awaitingReplyButton = "true";
  button.innerHTML = `
    <span class="pending-icon" data-awaiting-reply-icon aria-hidden="true">📤</span>
    <span class="pending-info">
      <span class="pending-title">Отправлено</span>
    </span>
    <span class="pending-badge is-hidden" data-awaiting-reply-count>0</span>
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
    } else if (type === "pending") {
      layout.push({ type: "pending" });
    } else if (type === "awaiting-reply") {
      layout.push({ type: "awaiting-reply" });
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

function sanitizeFileName(value = "") {
  return String(value)
    .trim()
    .replace(/[\/\\:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_");
}

function buildObjectId() {
  return `obj-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeCoordinateValue(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeDemandLabel(value = "") {
  return String(value).trim().replace(/\s+/g, " ");
}

function normalizeDemandPriority(value = "") {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["red", "high", "urgent", "высокий", "красный"].includes(normalized)) {
    return "red";
  }
  return "";
}

function buildDemandId() {
  return `demand-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
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
      const lat = normalizeCoordinateValue(
        item.lat ??
          item.latitude ??
          item.coords?.lat ??
          item.coordinates?.lat ??
          item.coordinates?.latitude
      );
      const lng = normalizeCoordinateValue(
        item.lng ??
          item.lon ??
          item.longitude ??
          item.coords?.lng ??
          item.coords?.lon ??
          item.coordinates?.lng ??
          item.coordinates?.lon ??
          item.coordinates?.longitude
      );
      const coordinates =
        lat !== null && lng !== null
          ? { lat, lng }
          : null;
      return { id, name, coordinates };
    })
    .filter(Boolean);
}

function normalizeDemandData(raw) {
  const rawItems = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object"
      ? raw.demands ?? raw.items ?? raw.requests
      : [];
  if (!Array.isArray(rawItems)) return [];
  const ids = new Set();
  return rawItems
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const title = sanitizeDemandLabel(item.item ?? item.title ?? item.name ?? "");
      const object = sanitizeDemandLabel(item.object ?? item.location ?? "");
      if (!title || !object) return null;
      let id = String(item.id ?? "").trim();
      if (!id || ids.has(id)) {
        id = buildDemandId();
      }
      ids.add(id);
      const quantity = normalizeNumber(item.quantity ?? item.count ?? item.qty ?? 1, 1);
      const unit = sanitizeDemandLabel(item.unit ?? item.units ?? "шт") || "шт";
      const requestedBy = sanitizeDemandLabel(item.requestedBy ?? item.user ?? "");
      const requestedById = sanitizeDemandLabel(
        item.requestedById ?? item.userId ?? ""
      );
      const note = sanitizeDemandLabel(item.note ?? item.comment ?? "");
      const priority = normalizeDemandPriority(item.priority ?? item.priorityColor ?? "");
      const status = item.status === "done" ? "done" : "open";
      const createdAt = sanitizeDemandLabel(item.createdAt ?? item.date ?? "") || getToday();
      const updatedAt = sanitizeDemandLabel(item.updatedAt ?? "");
      const closedAt = getDemandClosedDate(item);
      const pathSource =
        item.path && typeof item.path === "object"
          ? item.path
          : item.route && typeof item.route === "object"
            ? item.route
            : {};
      const rawDoneSteps = Array.isArray(pathSource.doneSteps)
        ? pathSource.doneSteps
        : Array.isArray(item.pathDoneSteps)
          ? item.pathDoneSteps
          : [];
      const doneSteps = Array.from(
        new Set(
          rawDoneSteps
            .map((step) => Number(step))
            .filter((step) => Number.isInteger(step) && step >= 1 && step <= 5)
        )
      );
      if (!doneSteps.includes(1)) doneSteps.unshift(1);
      if (status === "done" && !doneSteps.includes(5)) doneSteps.push(5);
      const legacyPathComment = sanitizeDemandLabel(
        pathSource.commentStage3 ?? pathSource.comment ?? item.pathComment ?? ""
      );
      const pathComments = Array.isArray(pathSource.comments)
        ? pathSource.comments
            .map((comment) => sanitizeDemandLabel(comment))
            .filter(Boolean)
        : legacyPathComment
          ? [legacyPathComment]
          : [];
      const pathComment = pathComments.at(-1) ?? legacyPathComment;
      const needDate = normalizeDemandNeedDate(
        item.needDate ??
          item.neededDate ??
          item.requiredDate ??
          item.dueDate ??
          item.deadline ??
          ""
      );
      return {
        id,
        item: title,
        object,
        quantity,
        unit,
        requestedBy,
        requestedById,
        note,
        priority,
        status,
        needDate,
        createdAt,
        updatedAt,
        closedAt,
        path: {
          doneSteps,
          commentStage3: pathComment,
          comments: pathComments,
        },
      };
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

function isValidMapCoordinate(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return false;
  return true;
}

function buildToolsMapPoints(toolsList, objectsList, userName = "") {
  const userKey = normalizePersonName(userName);
  if (!userKey) return [];
  const counts = new Map();
  toolsList.forEach((tool) => {
    if (!tool || typeof tool !== "object") return;
    const responsible = normalizePersonName(
      tool["Ответственный"] ?? tool.responsible ?? tool.user ?? tool.owner ?? ""
    );
    if (!responsible || responsible !== userKey) return;
    const objectName = sanitizeObjectName(tool["Объект"] ?? tool.object ?? "");
    if (!objectName) return;
    const key = objectName.toLowerCase();
    const current = counts.get(key) ?? { name: objectName, count: 0 };
    current.count += 1;
    counts.set(key, current);
  });

  return objectsList
    .map((objectItem) => {
      if (!objectItem || typeof objectItem !== "object") return null;
      const objectName = sanitizeObjectName(objectItem.name ?? objectItem.title ?? "");
      if (!objectName) return null;
      const entry = counts.get(objectName.toLowerCase());
      if (!entry) return null;
      const coordinates = objectItem.coordinates;
      if (!coordinates) return null;
      const lat = Number(coordinates.lat);
      const lng = Number(coordinates.lng);
      if (!isValidMapCoordinate(lat, lng)) return null;
      return {
        name: objectName,
        count: entry.count,
        coordinates: { lat, lng },
      };
    })
    .filter(Boolean);
}

function buildToolsMapPointsByObjects(toolsList, objectsList) {
  const counts = new Map();
  toolsList.forEach((tool) => {
    if (!tool || typeof tool !== "object") return;
    const objectName = sanitizeObjectName(tool["Объект"] ?? tool.object ?? "");
    if (!objectName) return;
    const key = objectName.toLowerCase();
    const current = counts.get(key) ?? { name: objectName, count: 0 };
    current.count += 1;
    counts.set(key, current);
  });

  return objectsList
    .map((objectItem) => {
      if (!objectItem || typeof objectItem !== "object") return null;
      const objectName = sanitizeObjectName(objectItem.name ?? objectItem.title ?? "");
      if (!objectName) return null;
      const entry = counts.get(objectName.toLowerCase());
      if (!entry) return null;
      const coordinates = objectItem.coordinates;
      if (!coordinates) return null;
      const lat = Number(coordinates.lat);
      const lng = Number(coordinates.lng);
      if (!isValidMapCoordinate(lat, lng)) return null;
      return {
        name: objectName,
        count: entry.count,
        coordinates: { lat, lng },
      };
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
  const actionIds = energyAccessOptions.map((action) => action.id);
  const access = {};
  getEnergySettingsAccessRoles({ mechanisms: true }).forEach((role) => {
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
  const dataUsage = {};
  energyDataUsageOptions.forEach((option) => {
    dataUsage[option.id] = option.id !== "mechanisms";
  });
  return {
    access,
    stcGroups: [],
    telegramGroups: [],
    fines,
    mailings,
    notifications,
    dataUsage,
    movesTable: {
      recipients: [],
      scheduleType: "monthDays",
      monthDays: ["first"],
      weekDays: ["Пн"],
      time: "09:00",
      periodDays: 7,
      includeSendDay: false,
      columns: ["moveDate", "name", "movedBy", "oldObject", "newObject"],
    },
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


function normalizeMovesTableSettings(value, { users = [], objectTrackingEnabled = true } = {}) {
  const defaults = buildEnergyOrganizationDefaults().movesTable;
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const allowedRecipients = new Set(
    users.map((item) => String(item.telegram_id ?? item.id ?? item.full_name ?? "").trim()).filter(Boolean)
  );
  const rawRecipients = Array.isArray(source.recipients) ? source.recipients : defaults.recipients;
  const recipients = rawRecipients
    .map((item) => String(item ?? "").trim())
    .filter((item) => item && (!allowedRecipients.size || allowedRecipients.has(item)));
  const scheduleType = source.scheduleType === "weekDays" ? "weekDays" : "monthDays";
  const monthDays = Array.isArray(source.monthDays)
    ? source.monthDays.map((item) => String(item ?? "").trim()).filter((item) => energyMovesTableMonthDays.includes(item))
    : defaults.monthDays;
  const weekDays = normalizeDays(source.weekDays, defaults.weekDays);
  const allowedColumns = energyMovesTableColumnOptions
    .filter((option) => objectTrackingEnabled || !["oldObject", "newObject"].includes(option.id))
    .map((option) => option.id);
  const columns = (Array.isArray(source.columns) ? source.columns : defaults.columns)
    .map((item) => String(item ?? "").trim())
    .filter((item) => allowedColumns.includes(item));
  return {
    recipients: Array.from(new Set(recipients)),
    scheduleType,
    monthDays: Array.from(new Set(monthDays.length ? monthDays : defaults.monthDays)),
    weekDays,
    time: normalizeTime(source.time, defaults.time),
    periodDays: Math.max(1, normalizeNumber(source.periodDays, defaults.periodDays)),
    includeSendDay: Boolean(source.includeSendDay ?? defaults.includeSendDay),
    columns: columns.length ? columns : defaults.columns.filter((item) => allowedColumns.includes(item)),
  };
}

function getMovesTableUserKey(user = {}) {
  return String(user.telegram_id ?? user.id ?? user.full_name ?? "").trim();
}

function getMovesTableRecipientUsers(users = [], organizationName = "") {
  const org = normalizeOrganizationName(organizationName);
  return users
    .filter((entry) => {
      if (isHiddenListUser(entry)) return false;
      const role = String(entry?.role ?? "").trim();
      const isAllowedRole = role === energyRole || role === accountingRole;
      if (!isAllowedRole) return false;
      const entryOrg = normalizeOrganizationName(entry?.organization ?? "");
      return !org || !entryOrg || entryOrg === org;
    })
    .map((entry) => ({
      key: getMovesTableUserKey(entry),
      name: String(entry?.full_name ?? entry?.fullName ?? "Пользователь").trim(),
      role: String(entry?.role ?? "").trim(),
      telegramId: String(entry?.telegram_id ?? "").trim(),
    }))
    .filter((entry) => entry.key);
}

function normalizeEnergyOrganizationSettings(raw) {
  const defaults = buildEnergyOrganizationDefaults();
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const telegramGroups = normalizeTelegramGroupsList(source.telegramGroups);
  const dataUsage = {};
  energyDataUsageOptions.forEach((option) => {
    const data = source.dataUsage?.[option.id];
    dataUsage[option.id] =
      typeof data === "boolean" ? data : defaults.dataUsage[option.id];
  });
  const access = {};
  getEnergySettingsAccessRoles(dataUsage).forEach((role) => {
    const roleAccessFromSettings = source.access?.[role];
    const hasRoleAccessInSettings = Array.isArray(roleAccessFromSettings);
    const fallbackRole =
      role === chiefEngineerRole || role === mechanicRole ? responsibleRole : role;
    const fallbackAccessFromSettings = source.access?.[fallbackRole];
    const allowed = hasRoleAccessInSettings
      ? roleAccessFromSettings
      : strictSettingsAccessRoles.has(role)
      ? []
      : Array.isArray(fallbackAccessFromSettings)
      ? fallbackAccessFromSettings
      : defaults.access[fallbackRole] ?? defaults.access[role];
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
  const movesTable = normalizeMovesTableSettings(source.movesTable, {
    objectTrackingEnabled: dataUsage.object !== false,
  });
  return {
    access,
    stcGroups,
    telegramGroups,
    fines,
    mailings,
    notifications,
    dataUsage,
    movesTable,
  };
}


function isObjectTrackingEnabled(settingsData) {
  const source = settingsData?.organization ? settingsData.organization : settingsData;
  const value = source?.dataUsage?.object;
  return value !== false;
}

function isObjectRelatedLabel(label) {
  return String(label ?? "").toLocaleLowerCase("ru").includes("объект");
}


async function applyDefaultObjectValues(orgFolderName, user) {
  const orgFolder = String(orgFolderName ?? "").trim();
  if (!orgFolder) return;
  const entries = [];
  const toolsPath = `./${orgFolder}/База с инструментами.json`;
  const movesPath = `./${orgFolder}/Перемещения.json`;

  try {
    const rawTools = await loadJson(toolsPath);
    const normalized = normalizeCollectionPayload(rawTools, "tools");
    let hasChanges = false;
    const tools = normalized.items.map((tool) => {
      if (String(tool?.["Объект"] ?? "").trim() === defaultObjectName) return tool;
      hasChanges = true;
      return { ...tool, "Объект": defaultObjectName };
    });
    if (hasChanges) {
      entries.push({
        path: toolsPath,
        data: normalized.wrapper
          ? { ...normalized.wrapper, [normalized.key]: tools }
          : tools,
        user,
      });
    }
  } catch (error) {
    console.warn("Не удалось проставить объект по умолчанию в базе инструментов.", error);
  }

  try {
    const rawMoves = await loadJson(movesPath);
    const normalized = normalizeCollectionPayload(rawMoves, "moves");
    let hasChanges = false;
    const moves = normalized.items.map((move) => {
      const oldObject = String(move?.["Старый объект"] ?? "").trim();
      const newObject = String(move?.["Новый объект"] ?? "").trim();
      if (oldObject === defaultObjectName && newObject === defaultObjectName) return move;
      hasChanges = true;
      return {
        ...move,
        "Старый объект": defaultObjectName,
        "Новый объект": defaultObjectName,
      };
    });
    if (hasChanges) {
      entries.push({
        path: movesPath,
        data: normalized.wrapper
          ? { ...normalized.wrapper, [normalized.key]: moves }
          : moves,
        user,
      });
    }
  } catch (error) {
    console.warn("Не удалось проставить объект по умолчанию в перемещениях.", error);
  }

  if (entries.length) {
    await saveJsonBatch(entries);
  }
}

function getEnergyOrganizationSettings(settingsData) {
  const normalized = normalizeEnergyOrganizationSettings(settingsData.organization);
  settingsData.organization = normalized;
  return normalized;
}

function buildEnergySettingsMarkup(settings) {
  const accessMarkup = getEnergySettingsAccessRoles(settings.dataUsage)
    .map((role) => {
      const roleKey = buildRoleKey(role);
      const allowed = new Set(settings.access?.[role] ?? []);
      const actionMarkup = energyAccessOptions
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
        <div class="settings-role settings-fine-card" data-access-role="${roleKey}">
          <button
            class="settings-role__header settings-fine-card__header"
            type="button"
            data-access-role-toggle
            aria-expanded="false"
          >
            <span class="settings-role__title">${escapeHtml(role)}</span>
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
                class="settings-group-card"
                data-energy-group-chip
                data-group-name="${escapeHtml(name)}"
              >
                <span class="settings-group-card__name">${escapeHtml(name)}</span>
                <span class="settings-group-card__remove" aria-hidden="true">✕</span>
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
        <div class="settings-fine-card ${fine.enabled ? "" : "is-disabled"}" data-settings-card>
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
                return `
                  <div class="settings-telegram-group">
                    <div class="settings-telegram-group__header">
                      <div class="settings-telegram-group__title">${groupLabel}</div>
                    </div>
                    <div class="settings-telegram-group__fields">
                      <div class="settings-telegram-field">
                        <div class="settings-choice-toolbar" data-settings-choice-toolbar>
                          <span class="settings-choice-toolbar__hint">Дни недели</span>
                          <button
                            class="settings-choice-toolbar__button"
                            type="button"
                            data-settings-select-all
                            data-settings-select-label="Все дни"
                            data-settings-clear-label="Снять дни"
                          >Все дни</button>
                        </div>
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
        <div class="settings-mailing-card ${mailing.enabled ? "" : "is-disabled"}" data-settings-card>
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
              <div class="settings-choice-toolbar" data-settings-choice-toolbar>
                <span class="settings-choice-toolbar__hint">Быстрый выбор групп</span>
                <button
                  class="settings-choice-toolbar__button"
                  type="button"
                  data-settings-select-all
                  data-settings-select-label="Выбрать все"
                  data-settings-clear-label="Снять все"
                >Выбрать все</button>
              </div>
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
                const label = escapeHtml(group.name || "Группа");
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
        <div class="settings-notification-card ${notification.enabled ? "" : "is-disabled"}" data-settings-card>
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
  const dataUsageMarkup = energyDataUsageOptions
    .map((option) => {
      const isEnabled = settings.dataUsage?.[option.id] !== false;
      return `
        <label class="settings-group-chip">
          <input
            type="checkbox"
            name="data-usage-${option.id}"
            ${isEnabled ? "checked" : ""}
          />
          <span>${escapeHtml(option.title)}</span>
        </label>
      `;
    })
    .join("");

  const movesTable = normalizeMovesTableSettings(settings.movesTable, {
    users: settings.movesTableUsers ?? [],
    objectTrackingEnabled: settings.dataUsage?.object !== false,
  });
  const movesRecipients = settings.movesTableUsers ?? [];
  const selectedRecipients = new Set(movesTable.recipients);
  const recipientMarkup = movesRecipients.length
    ? movesRecipients
        .map((item) => `
          <label class="settings-group-chip settings-group-chip--person">
            <input type="checkbox" name="moves-table-recipients" value="${escapeHtml(item.key)}" ${selectedRecipients.has(item.key) ? "checked" : ""} />
            <span>${escapeHtml(item.name)} · ${escapeHtml(item.role)}</span>
          </label>
        `)
        .join("")
    : `<span class="settings-chip is-muted">Нет пользователей с ролями Энергетик или Бухгалтерия</span>`;
  const monthDayLabels = new Map([
    ["first", "Первый день"],
    ["last", "Последний день"],
    ["every7", "Каждый 7-й день"],
    ["15", "15 число"],
    ["16", "16 число"],
    ["everyDay", "Каждый день"],
  ]);
  const monthDayMarkup = energyMovesTableMonthDays.map((day) => `
    <label class="settings-day-chip">
      <input type="checkbox" name="moves-table-month-days" value="${day}" ${movesTable.monthDays.includes(day) ? "checked" : ""} />
      <span>${monthDayLabels.get(day)}</span>
    </label>
  `).join("");
  const weekDayMarkup = energyWeekDays.map((day) => `
    <label class="settings-day-chip">
      <input type="checkbox" name="moves-table-week-days" value="${day}" ${movesTable.weekDays.includes(day) ? "checked" : ""} />
      <span>${day}</span>
    </label>
  `).join("");
  const columnOptions = energyMovesTableColumnOptions.filter((option) => settings.dataUsage?.object !== false || !["oldObject", "newObject"].includes(option.id));
  const renderMovesTableColumnSelect = (value, index) => {
    const selectedOption = columnOptions.find((option) => option.id === value);
    return `
      <div class="settings-moves-column" data-moves-table-column-wrap>
        <span>Столбец ${String.fromCharCode(65 + index)}</span>
        <input type="hidden" name="moves-table-columns" value="${escapeHtml(value)}" data-moves-table-column />
        <button
          class="settings-moves-column-select__trigger"
          type="button"
          data-moves-table-column-trigger
          aria-expanded="false"
        >
          <span data-moves-table-column-label>${escapeHtml(selectedOption?.title ?? "Не заполнять")}</span>
          <span class="settings-moves-column-select__chevron" aria-hidden="true">⌄</span>
        </button>
        <div class="settings-moves-column-select__menu" data-moves-table-column-menu>
          <button class="settings-moves-column-select__option ${value ? "" : "is-selected"}" type="button" data-moves-table-column-option="">Не заполнять</button>
          ${columnOptions.map((option) => `
            <button
              class="settings-moves-column-select__option ${option.id === value ? "is-selected" : ""}"
              type="button"
              data-moves-table-column-option="${option.id}"
            >${escapeHtml(option.title)}</button>
          `).join("")}
        </div>
      </div>
    `;
  };
  const columnSelects = [...movesTable.columns, ""].slice(0, columnOptions.length).map(renderMovesTableColumnSelect).join("");

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
          <button
            class="settings-add-icon-button"
            type="button"
            data-energy-group-add
            aria-label="Добавить группу МТЦ"
            title="Добавить группу"
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
        <div class="settings-existing-groups" data-energy-group-list>
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
    <div class="settings-accordion" data-settings-accordion>
      <button class="settings-accordion__header" type="button" data-settings-accordion-toggle aria-expanded="false">
        <span class="settings-accordion__title">Таблица перемещений</span>
        <span class="settings-accordion__icon" aria-hidden="true">⌄</span>
      </button>
      <div class="settings-accordion__content">
        <div class="settings-moves-table">
          <div class="settings-accordion__hint">Настройте, кому и когда автоматически отправлять таблицу принятых перемещений.</div>
          <div class="settings-moves-section">
            <span class="settings-moves-title">Кому отправлять</span>
            <div class="settings-moves-actions">
              <button class="action-secondary settings-moves-select-all" type="button" data-moves-table-select-all>Выбрать всех</button>
              <button class="action-secondary settings-moves-clear-all" type="button" data-moves-table-clear-all>Снять всё</button>
            </div>
            <div class="settings-group-chip-list">${recipientMarkup}</div>
          </div>
          <div class="settings-moves-section">
            <span class="settings-moves-title">Когда отправлять</span>
            <div class="settings-moves-mode" data-moves-table-schedule-mode>
              <label class="settings-group-chip settings-group-chip--large"><input type="radio" name="moves-table-schedule-type" value="monthDays" ${movesTable.scheduleType === "weekDays" ? "" : "checked"} /><span>По числам месяца</span></label>
              <label class="settings-group-chip settings-group-chip--large"><input type="radio" name="moves-table-schedule-type" value="weekDays" ${movesTable.scheduleType === "weekDays" ? "checked" : ""} /><span>По дням недели</span></label>
            </div>
            <div class="settings-schedule-days" data-moves-table-month-days ${movesTable.scheduleType === "weekDays" ? "hidden" : ""}>
              <div class="settings-schedule-days__hint">Выберите числа месяца для автоматической отправки.</div>
              <div class="settings-day-grid">${monthDayMarkup}</div>
            </div>
            <div class="settings-schedule-days" data-moves-table-week-days ${movesTable.scheduleType === "weekDays" ? "" : "hidden"}>
              <div class="settings-schedule-days__hint">Выберите дни недели для автоматической отправки.</div>
              <div class="settings-day-grid">${weekDayMarkup}</div>
            </div>
          </div>
          <div class="settings-moves-grid">
            <label class="settings-fine-field"><span>Время</span><input class="form-input" type="time" name="moves-table-time" value="${escapeHtml(movesTable.time)}" /></label>
            <label class="settings-fine-field"><span>Период, дней</span><input class="form-input" type="number" min="1" inputmode="numeric" name="moves-table-period-days" value="${escapeHtml(movesTable.periodDays)}" list="moves-table-period-presets" /><datalist id="moves-table-period-presets"><option value="1"><option value="3"><option value="7"><option value="14"><option value="15"></datalist></label>
          </div>
          <label class="settings-inline"><input type="checkbox" name="moves-table-include-send-day" ${movesTable.includeSendDay ? "checked" : ""} /><span>Включать перемещения за день отправки</span></label>
          <div class="settings-moves-section">
            <span class="settings-moves-title">Столбцы таблицы</span>
            <div class="settings-moves-columns" data-moves-table-columns>${columnSelects}</div>
          </div>
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
        <span class="settings-accordion__title">Данные</span>
        <span class="settings-accordion__icon" aria-hidden="true">⌄</span>
      </button>
      <div class="settings-accordion__content">
        <div class="settings-group-chip-list settings-group-chip-list--column">
          ${dataUsageMarkup}
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
  const demandPath = `./${orgFolderName}/Заявки.json`;
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
    demandPath,
    userKey,
    settingsData,
  };
}

async function saveUserPreferences(context, preferences, pendingAcceptanceMailing) {
  const normalized = normalizePreferences(preferences);
  const currentMailing = normalizePendingAcceptanceMailing(pendingAcceptanceMailing);
  context.settingsData.users[context.userKey] = {
    ...(context.settingsData.users[context.userKey] ?? {}),
    preferences: normalized,
    pendingAcceptanceMailing: currentMailing,
  };
  await saveJson(context.settingsPath, context.settingsData, { user: currentUser });
  return {
    preferences: normalized,
    pendingAcceptanceMailing: currentMailing,
  };
}

function findUserOrganizationName(user, usersData) {
  const directOrganization = String(user?.organization ?? "").trim();
  if (directOrganization) {
    return directOrganization;
  }

  const telegramIdKey = normalizeTelegramId(user?.telegram_id);
  const normalizedFullName = normalizePersonName(user?.full_name ?? user?.fullName ?? "");
  const normalizedRole = String(user?.role ?? "").trim();
  const normalizedPosition = String(user?.position ?? "").trim();
  const usersList = Array.isArray(usersData?.users) ? usersData.users : [];
  let matchedUser = null;

  if (telegramIdKey) {
    const telegramMatches = usersList.filter(
      (item) => normalizeTelegramId(item.telegram_id) === telegramIdKey
    );
    if (telegramMatches.length === 1) {
      matchedUser = telegramMatches[0];
    } else if (telegramMatches.length > 1) {
      matchedUser =
        telegramMatches.find(
          (item) =>
            normalizePersonName(item?.full_name ?? "") === normalizedFullName &&
            String(item?.role ?? "").trim() === normalizedRole &&
            String(item?.position ?? "").trim() === normalizedPosition
        ) ??
        telegramMatches.find(
          (item) =>
            normalizePersonName(item?.full_name ?? "") === normalizedFullName &&
            String(item?.role ?? "").trim() === normalizedRole
        ) ??
        telegramMatches.find(
          (item) => normalizePersonName(item?.full_name ?? "") === normalizedFullName
        ) ??
        null;
    }
  }

  if (!matchedUser) {
    matchedUser = usersList.find(
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

async function resolveOrganizationNumberType(organizationName) {
  const normalizedName = String(organizationName ?? "").trim();
  if (!normalizedName) return "";
  try {
    const orgData = await loadJson(orgFilePath);
    const orgRecord = findOrganizationRecord(orgData, normalizedName);
    return String(orgRecord?.number_type ?? "").trim();
  } catch (error) {
    console.warn("Не удалось определить тип номера организации.", error);
    return "";
  }
}

function resolveEnergyDashboardActionsForRole(settingsData, role) {
  const organizationSettings = getEnergyOrganizationSettings(settingsData);
  const objectTrackingEnabled = isObjectTrackingEnabled(organizationSettings);
  const accessRole = resolveEnergyAccessRole(role);
  const accessList = organizationSettings.access?.[accessRole];
  const hasAccessConfig = Array.isArray(accessList);
  const requiresExplicitAccess = explicitAccessDashboardRoles.has(accessRole);
  let actions = hasAccessConfig
    ? energyActions.filter((action) => accessList.includes(action.id))
    : requiresExplicitAccess
    ? []
    : [...energyActions];
  if (!objectTrackingEnabled) {
    actions = actions.filter((action) => action.id !== "objects");
  }
  if (organizationSettings.dataUsage?.mechanisms) {
    actions = [...actions, mechanismsAction];
  }
  if (accessRole === accountingRole) {
    const existingActionIds = new Set(actions.map((action) => action.id));
    actions = [
      ...actions,
      ...accountingFixedDashboardActions.filter(
        (action) => !existingActionIds.has(action.id)
      ),
    ];
  }
  return actions;
}

async function setupEnergyDashboard(user, preferences, contextOverride) {
  const gridEl = contentEl.querySelector("[data-energy-grid]");
  if (!gridEl) return;

  const desktopProfilePanelEl = contentEl.querySelector("[data-energy-profile-panel]");
  const desktopProfilePhotoWrapEl = contentEl.querySelector("[data-energy-profile-photo-wrap]");
  const desktopProfilePhotoEl = contentEl.querySelector("[data-energy-profile-photo]");
  const desktopProfileInitialsEl = contentEl.querySelector("[data-energy-profile-initials]");
  const desktopProfileNameEl = contentEl.querySelector("[data-energy-profile-name]");
  const desktopProfilePositionEl = contentEl.querySelector("[data-energy-profile-position]");
  const desktopProfileReportCountEl = contentEl.querySelector("[data-energy-profile-report-count]");
  const desktopProfileReportAmountEl = contentEl.querySelector("[data-energy-profile-report-amount]");
  const desktopProfileObjectsCountEl = contentEl.querySelector("[data-energy-profile-objects-count]");
  const syncDesktopProfileStats = async () => {
    if (!desktopProfileReportCountEl && !desktopProfileReportAmountEl && !desktopProfileObjectsCountEl) return;
    const userName = normalizePersonName(user?.full_name ?? user?.fullName ?? "");
    const toolsDatabasePath =
      contextOverride?.toolsDatabasePath ??
      `./${contextOverride?.orgFolderName ?? ""}/База с инструментами.json`;
    try {
      const tools = normalizeToolsData(await loadJson(toolsDatabasePath).catch(() => []));
      const userTools = tools.filter(
        (tool) => normalizePersonName(tool?.["Ответственный"] ?? "") === userName
      );
      const reportAmount = userTools.reduce((sum, tool) => {
        const value = normalizeCostValue(tool?.["Стоимость"]);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0);
      const objectsCount = new Set(
        userTools
          .map((tool) => sanitizeObjectName(tool?.["Объект"] ?? tool?.object ?? ""))
          .filter(Boolean)
          .map((name) => name.toLowerCase())
      ).size;
      if (desktopProfileReportCountEl) desktopProfileReportCountEl.textContent = String(userTools.length);
      if (desktopProfileReportAmountEl) {
        desktopProfileReportAmountEl.textContent = formatDesktopProfileReportAmount(reportAmount);
      }
      if (desktopProfileObjectsCountEl) desktopProfileObjectsCountEl.textContent = String(objectsCount);
    } catch (error) {
      console.warn("Не удалось загрузить статистику профиля.", error);
    }
  };
  const syncDesktopProfilePanel = () => {
    if (!desktopProfilePanelEl) return;
    const fullName = String(user?.full_name ?? user?.fullName ?? "").trim();
    if (desktopProfileNameEl) {
      desktopProfileNameEl.textContent = formatHeaderUserName(fullName);
    }
    if (desktopProfilePositionEl) {
      desktopProfilePositionEl.textContent =
        String(user?.position ?? "").trim() || "Должность не указана";
    }
    if (desktopProfileInitialsEl) {
      desktopProfileInitialsEl.textContent = getInitials(fullName);
    }
    if (!(desktopProfilePhotoEl instanceof HTMLImageElement)) return;

    const photoCandidates = getUserPhotoCandidates(user);
    let candidateIndex = 0;
    const applyNoPhotoState = () => {
      desktopProfilePhotoEl.classList.add("is-hidden");
      desktopProfilePhotoEl.removeAttribute("src");
      desktopProfilePhotoEl.onerror = null;
      desktopProfilePhotoEl.onload = null;
      if (desktopProfilePhotoWrapEl) desktopProfilePhotoWrapEl.dataset.hasPhoto = "false";
    };
    const tryNextCandidate = () => {
      if (candidateIndex >= photoCandidates.length) {
        applyNoPhotoState();
        return;
      }
      const nextPhotoUrl = photoCandidates[candidateIndex];
      candidateIndex += 1;
      desktopProfilePhotoEl.classList.remove("is-hidden");
      if (desktopProfilePhotoWrapEl) desktopProfilePhotoWrapEl.dataset.hasPhoto = "true";
      desktopProfilePhotoEl.onload = () => {
        desktopProfilePhotoEl.onerror = null;
        desktopProfilePhotoEl.onload = null;
      };
      desktopProfilePhotoEl.onerror = tryNextCandidate;
      desktopProfilePhotoEl.src = nextPhotoUrl;
    };
    if (!photoCandidates.length) {
      applyNoPhotoState();
      return;
    }
    tryNextCandidate();
  };
  syncDesktopProfilePanel();
  syncDesktopProfileStats();

  const groupPanel = contentEl.querySelector("[data-energy-group-panel]");
  const createGroupButton = contentEl.querySelector("[data-energy-create-group]");
  const cancelGroupButton = contentEl.querySelector("[data-energy-cancel-group]");
  const selectedCountEl = contentEl.querySelector("[data-energy-selected-count]");
  const quickAccessListEl = contentEl.querySelector("[data-quick-access-list]");
  const quickAccessEl = contentEl.querySelector("[data-quick-access]");
  const quickAccessEmptyEl = contentEl.querySelector("[data-quick-access-empty]");
  const quickAccessEditButton = contentEl.querySelector("[data-quick-access-edit]");
  const quickAccessPickerEl = contentEl.querySelector("[data-quick-access-picker]");
  const quickAccessPickerGridEl = contentEl.querySelector(
    "[data-quick-access-picker-grid]"
  );
  const quickAccessCancelButton = contentEl.querySelector(
    "[data-quick-access-cancel]"
  );
  const quickAccessSaveButton = contentEl.querySelector("[data-quick-access-save]");
  const quickAccessMessageEl = contentEl.querySelector("[data-quick-access-message]");
  const toolsMapEl = contentEl.querySelector("[data-tools-map]");
  const toolsMapCanvasEl = contentEl.querySelector("[data-tools-map-canvas]");
  const toolsMapLayerEl = contentEl.querySelector("[data-tools-map-layer]");
  const toolsMapImageEl = contentEl.querySelector("[data-tools-map-image]");
  const toolsMapPlaceholderEl = contentEl.querySelector("[data-tools-map-placeholder]");
  const toolsMapCountEl = contentEl.querySelector("[data-tools-map-count]");
  const toolsMapToggleEls = Array.from(
    contentEl.querySelectorAll("[data-tools-map-toggle], [data-tools-map-toggle-overlay]")
  );
  const toolsMapCollapsedTriggerEl = contentEl.querySelector(
    "[data-tools-map-collapsed-trigger]"
  );
  let isToolsMapCollapsed = false;
  const toolsMapCollapsedStorageKey = (() => {
    const userKeyParts = [
      user?.id,
      user?.chat_id,
      user?.username,
      user?.full_name,
      user?.organization,
      user?.role,
    ]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);
    const userKey = userKeyParts.join("|") || "anonymous";
    return `alltrack:tools-map-collapsed:${userKey}`;
  })();
  const loadToolsMapCollapsedState = () => {
    try {
      return localStorage.getItem(toolsMapCollapsedStorageKey) === "1";
    } catch (error) {
      console.warn("Не удалось прочитать состояние карты из localStorage.", error);
      return false;
    }
  };
  const persistToolsMapCollapsedState = () => {
    try {
      localStorage.setItem(toolsMapCollapsedStorageKey, isToolsMapCollapsed ? "1" : "0");
    } catch (error) {
      console.warn("Не удалось сохранить состояние карты в localStorage.", error);
    }
  };
  const updateQuickAccessOffset = () => {
    if (!quickAccessEl) return;
    document.documentElement.style.setProperty("--quick-access-offset", "96px");
  };

  if (energyPendingStatEl) {
    energyPendingStatEl.classList.add("pending-stat--grid", "action-card");
    energyPendingStatEl.dataset.energyItem = "";
    energyPendingStatEl.dataset.energyItemType = "pending";
    energyPendingStatEl.dataset.actionId = "pending";
    if (!gridEl.contains(energyPendingStatEl)) {
      gridEl.prepend(energyPendingStatEl);
    }
  }
  const settingsModalEl = contentEl.querySelector("[data-energy-settings-modal]");
  const settingsFormEl = contentEl.querySelector("[data-energy-settings-form]");
  const settingsBodyEl = contentEl.querySelector("[data-energy-settings-body]");
  const settingsMessageEl = contentEl.querySelector("[data-energy-settings-message]");
  const settingsCloseButton = contentEl.querySelector("[data-energy-settings-close]");
  const settingsCancelButton = contentEl.querySelector("[data-energy-settings-cancel]");
  const settingsBackdropEl = contentEl.querySelector("[data-energy-settings-backdrop]");
  const feedbackModalEl = contentEl.querySelector("[data-energy-feedback-modal]");
  const feedbackFormEl = contentEl.querySelector("[data-energy-feedback-form]");
  const feedbackBackdropEl = contentEl.querySelector("[data-energy-feedback-backdrop]");
  const feedbackCloseButton = contentEl.querySelector("[data-energy-feedback-close]");
  const feedbackCancelButton = contentEl.querySelector("[data-energy-feedback-cancel]");
  const feedbackAnonymousEl = contentEl.querySelector("[data-energy-feedback-anonymous]");
  const feedbackHintEl = contentEl.querySelector("[data-energy-feedback-hint]");
  const feedbackMessageEl = contentEl.querySelector("[data-energy-feedback-message]");
  const feedbackPhotosEl = contentEl.querySelector("[data-energy-feedback-photos]");
  const feedbackFilesEl = contentEl.querySelector("[data-energy-feedback-files]");
  const feedbackStatusEl = contentEl.querySelector("[data-energy-feedback-message-status]");
  const downloadModalEl = contentEl.querySelector("[data-energy-download-modal]");
  const downloadBackdropEl = contentEl.querySelector("[data-energy-download-backdrop]");
  const downloadCloseButton = contentEl.querySelector("[data-energy-download-close]");
  const downloadOptionsEl = contentEl.querySelector("[data-energy-download-modal]");
  const infoModalEl = contentEl.querySelector("[data-energy-info-modal]");
  const infoBackdropEl = contentEl.querySelector("[data-energy-info-backdrop]");
  const infoCloseButton = contentEl.querySelector("[data-energy-info-close]");
  const infoGridEl = contentEl.querySelector("[data-energy-info-grid]");
  const infoRepairModalEl = contentEl.querySelector("[data-info-repair-modal]");
  const infoRepairBackdropEl = contentEl.querySelector("[data-info-repair-backdrop]");
  const infoRepairCloseButton = contentEl.querySelector("[data-info-repair-close]");
  const infoRepairSubtitleEl = contentEl.querySelector("[data-info-repair-subtitle]");
  const infoRepairStatusEl = contentEl.querySelector("[data-info-repair-status]");
  const infoRepairActiveListEl = contentEl.querySelector("[data-info-repair-active-list]");
  const infoRepairActiveEmptyEl = contentEl.querySelector("[data-info-repair-active-empty]");
  const infoRepairActiveCountEl = contentEl.querySelector("[data-info-repair-active-count]");
  const infoRepairOrgListEl = contentEl.querySelector("[data-info-repair-org-list]");
  const infoRepairManufacturerListEl = contentEl.querySelector("[data-info-repair-manufacturer-list]");
  const infoRepairModelListEl = contentEl.querySelector("[data-info-repair-model-list]");
  const infoRepairNameListEl = contentEl.querySelector("[data-info-repair-name-list]");
  const infoRepairValueEls = {
    active: contentEl.querySelector("[data-info-repair-active]"),
    total: contentEl.querySelector("[data-info-repair-total]"),
    sum: contentEl.querySelector("[data-info-repair-sum]"),
    orgs: contentEl.querySelector("[data-info-repair-orgs]"),
    average: contentEl.querySelector("[data-info-repair-average]"),
  };
  const infoStatisticsModalEl = contentEl.querySelector("[data-info-statistics-modal]");
  const infoStatisticsBackdropEl = contentEl.querySelector("[data-info-statistics-backdrop]");
  const infoStatisticsCloseButton = contentEl.querySelector("[data-info-statistics-close]");
  const infoStatisticsStatusEl = contentEl.querySelector("[data-info-statistics-status]");
  const infoStatisticsValueEls = {
    tools: contentEl.querySelector("[data-info-statistics-tools]"),
    working: contentEl.querySelector("[data-info-statistics-working]"),
    moves: contentEl.querySelector("[data-info-statistics-moves]"),
    repairs: contentEl.querySelector("[data-info-statistics-repairs]"),
    breakdowns: contentEl.querySelector("[data-info-statistics-breakdowns]"),
    fines: contentEl.querySelector("[data-info-statistics-fines]"),
  };
  const infoFinesModalEl = contentEl.querySelector("[data-info-fines-modal]");
  const infoFinesBackdropEl = contentEl.querySelector("[data-info-fines-backdrop]");
  const infoFinesCloseButton = contentEl.querySelector("[data-info-fines-close]");
  const infoFinesStatusEl = contentEl.querySelector("[data-info-fines-status]");
  const infoFinesTypesEl = contentEl.querySelector("[data-info-fines-types]");
  const infoFinesTypesEmptyEl = contentEl.querySelector("[data-info-fines-types-empty]");
  const infoFinesMonthsEl = contentEl.querySelector("[data-info-fines-months]");
  const infoFinesMonthsEmptyEl = contentEl.querySelector("[data-info-fines-months-empty]");
  const infoFinesTypesCountEl = contentEl.querySelector("[data-info-fines-types-count]");
  const infoFinesMonthsCountEl = contentEl.querySelector("[data-info-fines-months-count]");
  const infoInstructionsModalEl = contentEl.querySelector("[data-info-instructions-modal]");
  const infoInstructionsBackdropEl = contentEl.querySelector("[data-info-instructions-backdrop]");
  const infoInstructionsCloseButton = contentEl.querySelector("[data-info-instructions-close]");
  const infoInstructionsGridEl = contentEl.querySelector("[data-info-instructions-grid]");
  const infoInstructionsItems = [
    "Переместить",
    "Отменить перемещение",
    "Принять",
    "Не принять",
    "Найти инструмент",
    "Сломано",
    "В ремонт",
    "Отремонтировано",
    "Новая единица",
    "На списание",
    "Списать",
    "Добавить фото",
    "Удалить фото",
    "Отредактировать базу",
    "Пользователи",
    "Объекты",
  ];
  const infoInstructionIconMap = new Map([
    ["Переместить", "🔁"],
    ["Отменить перемещение", "↩️"],
    ["Принять", "✅"],
    ["Не принять", "🚫"],
    ["Найти инструмент", "🔎"],
    ["Сломано", "🛠️"],
    ["В ремонт", "🧰"],
    ["Отремонтировано", "✨"],
    ["Новая единица", "➕"],
    ["На списание", "🧾"],
    ["Списать", "♻️"],
    ["Добавить фото", "📸"],
    ["Удалить фото", "🗑️"],
    ["Отредактировать базу", "✏️"],
    ["Пользователи", "👥"],
    ["Объекты", "📍"],
  ]);
  const infoFinesValueEls = {
    balance: contentEl.querySelector("[data-info-fines-balance]"),
    issued: contentEl.querySelector("[data-info-fines-issued]"),
    accrued: contentEl.querySelector("[data-info-fines-accrued]"),
    users: contentEl.querySelector("[data-info-fines-users]"),
  };
  const downloadOptionsGridEl = contentEl.querySelector("[data-download-options-grid]");
  const downloadSubtitleEl = contentEl.querySelector("[data-energy-download-subtitle]");
  const downloadMessageEl = contentEl.querySelector("[data-energy-download-message]");
  const downloadResponsibleBoxEl = contentEl.querySelector("[data-download-responsible-box]");
  const downloadResponsibleSearchEl = contentEl.querySelector("[data-download-responsible-search]");
  const downloadResponsibleListEl = contentEl.querySelector("[data-download-responsible-list]");
  const downloadResponsibleSearchLabelEl = downloadResponsibleBoxEl?.querySelector(".download-responsible__search span");
  const downloadMovesBoxEl = contentEl.querySelector("[data-download-moves-box]");
  const downloadMovesCalendarEl = contentEl.querySelector("[data-download-moves-calendar]");
  const downloadMovesMonthLabelEl = contentEl.querySelector("[data-download-moves-month-label]");
  const downloadMovesDaysEl = contentEl.querySelector("[data-download-moves-days]");
  const downloadMovesSelectedRangeEl = contentEl.querySelector(
    "[data-download-moves-selected-range]"
  );
  const downloadMovesPrevMonthButton = contentEl.querySelector(
    "[data-download-moves-prev-month]"
  );
  const downloadMovesNextMonthButton = contentEl.querySelector(
    "[data-download-moves-next-month]"
  );
  const downloadMovesStartDateEl = contentEl.querySelector("[data-download-moves-start-date]");
  const downloadMovesEndDateEl = contentEl.querySelector("[data-download-moves-end-date]");
  const downloadMovesGenerateButton = contentEl.querySelector("[data-download-moves-generate]");
  let preparedDownloadUrl = "";
  let responsibleDownloadToolsCache = [];
  let invoiceDownloadItemsCache = [];
  let downloadPickerMode = "responsible";
  let downloadMovesVisibleMonthDate = new Date();
  const objectsModalEl = contentEl.querySelector("[data-energy-objects-modal]");
  const objectsBackdropEl = contentEl.querySelector("[data-energy-objects-backdrop]");
  const objectsCloseButton = contentEl.querySelector("[data-energy-objects-close]");
  const objectsFormEl = contentEl.querySelector("[data-energy-objects-form]");
  const objectsCreateButton = contentEl.querySelector("[data-energy-objects-create]");
  const objectsMessageEl = contentEl.querySelector("[data-energy-objects-message]");
  const objectsListEl = contentEl.querySelector("[data-energy-objects-list]");
  const objectsItemsEl = contentEl.querySelector("[data-energy-objects-items]");
  const objectsEmptyEl = contentEl.querySelector("[data-energy-objects-empty]");
  const objectsCountEl = contentEl.querySelector("[data-energy-objects-count]");
  const objectsCreateModalEl = contentEl.querySelector(
    "[data-energy-objects-create-modal]"
  );
  const objectsEditModalEl = contentEl.querySelector(
    "[data-energy-objects-edit-modal]"
  );
  const objectsCreateBackdropEl = contentEl.querySelector(
    "[data-energy-objects-create-backdrop]"
  );
  const objectsEditBackdropEl = contentEl.querySelector(
    "[data-energy-objects-edit-backdrop]"
  );
  const objectsCreateCloseButton = contentEl.querySelector(
    "[data-energy-objects-create-close]"
  );
  const objectsEditCloseButton = contentEl.querySelector(
    "[data-energy-objects-edit-close]"
  );
  const objectsCreateCancelButton = contentEl.querySelector(
    "[data-energy-objects-create-cancel]"
  );
  const objectsEditCancelButton = contentEl.querySelector(
    "[data-energy-objects-edit-cancel]"
  );
  const objectsCreateFormEl = contentEl.querySelector(
    "[data-energy-objects-create-form]"
  );
  const objectsEditFormEl = contentEl.querySelector(
    "[data-energy-objects-edit-form]"
  );
  const objectsCreateMessageEl = contentEl.querySelector(
    "[data-energy-objects-create-message]"
  );
  const objectsEditMessageEl = contentEl.querySelector(
    "[data-energy-objects-edit-message]"
  );
  const demandModalEl = contentEl.querySelector("[data-demand-modal]");
  const demandBackdropEl = contentEl.querySelector("[data-demand-backdrop]");
  const demandCloseButton = contentEl.querySelector("[data-demand-close]");
  const demandFormModalEl = contentEl.querySelector("[data-demand-form-modal]");
  const demandFormBackdropEl = contentEl.querySelector("[data-demand-form-backdrop]");
  const demandFormCloseButton = contentEl.querySelector("[data-demand-form-close]");
  const demandFormTitleEl = contentEl.querySelector("[data-demand-form-title]");
  const demandFormEl = contentEl.querySelector("[data-demand-form]");
  const demandToggleButton = contentEl.querySelector("[data-demand-toggle-form]");
  const demandItemInput = contentEl.querySelector("[data-demand-item]");
  const demandQuantityInput = contentEl.querySelector("[data-demand-quantity]");
  const demandUnitInput = contentEl.querySelector("[data-demand-unit]");
  const demandObjectInput = contentEl.querySelector("[data-demand-object]");
  const demandObjectSuggestionsEl = contentEl.querySelector(
    "[data-demand-object-suggestions]"
  );
  const demandToolsSuggestionsEl = contentEl.querySelector(
    "[data-demand-tools-suggestions]"
  );
  const demandPriorityInputs = contentEl.querySelectorAll("[data-demand-priority]");
  const demandNoteInput = contentEl.querySelector("[data-demand-note]");
  const demandDateInput = contentEl.querySelector("[data-demand-date]");
  const demandDatePickerEl = contentEl.querySelector("[data-demand-date-picker]");
  const demandDateTriggerEl = contentEl.querySelector("[data-demand-date-trigger]");
  const demandDateLabelEl = contentEl.querySelector("[data-demand-date-label]");
  const demandDateCalendarEl = contentEl.querySelector("[data-demand-date-calendar]");
  const demandDateMonthEl = contentEl.querySelector("[data-demand-date-month]");
  const demandDateDaysEl = contentEl.querySelector("[data-demand-date-days]");
  const demandDatePrevEl = contentEl.querySelector("[data-demand-date-prev]");
  const demandDateNextEl = contentEl.querySelector("[data-demand-date-next]");
  const demandDateCloseEl = contentEl.querySelector("[data-demand-date-close]");
  const demandStepEls = contentEl.querySelectorAll("[data-demand-step]");
  const demandMessageEl = contentEl.querySelector("[data-demand-message]");
  const demandSubmitButton = contentEl.querySelector("[data-demand-submit]");
  const demandCancelButton = contentEl.querySelector("[data-demand-cancel]");
  const demandSearchInput = contentEl.querySelector("[data-demand-search]");
  const demandFiltersToggle = contentEl.querySelector("[data-demand-filters-toggle]");
  const demandFiltersPanel = contentEl.querySelector("[data-demand-filters-panel]");
  const demandFilterObjectEl = contentEl.querySelector("[data-demand-filter-object]");
  const demandFilterUserEl = contentEl.querySelector("[data-demand-filter-user]");
  const demandFilterStatusEl = contentEl.querySelector("[data-demand-filter-status]");
  const demandFilterTriggers = contentEl.querySelectorAll("[data-demand-filter-trigger]");
  const demandFilterMenus = contentEl.querySelectorAll("[data-demand-filter-menu]");
  const demandFilterOptionsEls = contentEl.querySelectorAll("[data-demand-filter-options]");
  const demandFilterActionButtons = contentEl.querySelectorAll("[data-demand-filter-action]");
  const demandFilterViewEl = contentEl.querySelector("[data-demand-filter-view]");
  const demandMapToggleEl = contentEl.querySelector("[data-demand-map-toggle]");
  const demandListEl = contentEl.querySelector("[data-demand-list]");
  const demandMapEl = contentEl.querySelector("[data-demand-map]");
  const demandMapCanvasEl = contentEl.querySelector("[data-demand-map-canvas]");
  const demandMapLayerEl = contentEl.querySelector("[data-demand-map-layer]");
  const demandMapImageEl = contentEl.querySelector("[data-demand-map-image]");
  const demandMapPlaceholderEl = contentEl.querySelector("[data-demand-map-placeholder]");
  const demandRequestMapModalEl = contentEl.querySelector(
    "[data-demand-request-map-modal]"
  );
  const demandRequestMapBackdropEl = contentEl.querySelector(
    "[data-demand-request-map-backdrop]"
  );
  const demandRequestMapCloseButton = contentEl.querySelector(
    "[data-demand-request-map-close]"
  );
  const demandRequestMapCanvasEl = contentEl.querySelector(
    "[data-demand-request-map-canvas]"
  );
  const demandRequestMapLayerEl = contentEl.querySelector(
    "[data-demand-request-map-layer]"
  );
  const demandRequestMapTitleEl = contentEl.querySelector(
    "[data-demand-request-map-title]"
  );
  const demandRequestMapSubtitleEl = contentEl.querySelector(
    "[data-demand-request-map-subtitle]"
  );
  const demandPathModalEl = contentEl.querySelector("[data-demand-path-modal]");
  const demandPathBackdropEl = contentEl.querySelector("[data-demand-path-backdrop]");
  const demandPathCloseButton = contentEl.querySelector("[data-demand-path-close]");
  const demandPathTitleEl = contentEl.querySelector("[data-demand-path-title]");
  const demandPathItemEl = contentEl.querySelector("[data-demand-path-item]");
  const demandPathMetaEl = contentEl.querySelector("[data-demand-path-meta]");
  const demandPathStepsEl = contentEl.querySelector("[data-demand-path-steps]");
  const demandPathEditButton = contentEl.querySelector("[data-demand-path-edit]");
  const demandPathCommentEl = contentEl.querySelector("[data-demand-path-comment]");
  const demandPathCommentAddButton = contentEl.querySelector("[data-demand-path-comment-add]");
  const demandPathCommentSaveButton = contentEl.querySelector("[data-demand-path-comment-save]");
  const demandPathCommentFormEl = contentEl.querySelector("[data-demand-path-comment-form]");
  const demandPathCommentSavedEl = contentEl.querySelector("[data-demand-path-comment-saved]");
  const demandPathSaveButton = contentEl.querySelector("[data-demand-path-save]");
  const demandPathCancelButton = contentEl.querySelector("[data-demand-path-cancel]");
  const demandPathMessageEl = contentEl.querySelector("[data-demand-path-message]");
  const demandEmptyEl = contentEl.querySelector("[data-demand-empty]");
  const demandSubtitleEl = contentEl.querySelector("[data-demand-subtitle]");
  const demandOpenCountEl = contentEl.querySelector("[data-demand-open-count]");
  const toolsModalEl = contentEl.querySelector("[data-tools-modal]");
  const toolsPanelEl = contentEl.querySelector("[data-tools-panel]");
  const toolsBackdropEl = contentEl.querySelector("[data-tools-backdrop]");
  const toolsCloseButton = contentEl.querySelector("[data-tools-close]");
  const toolsOpenReplacementPendingButton = contentEl.querySelector(
    "[data-tools-open-replacement-pending]"
  );
  const toolsSearchInput = contentEl.querySelector("[data-tools-search]");
  const toolsSearchEl = toolsSearchInput?.closest(".tools-search") ?? null;
  const toolsSearchHomeEl = toolsSearchEl?.parentElement ?? null;
  const toolsListEl = contentEl.querySelector("[data-tools-list]");
  const toolsSearchMapEl = contentEl.querySelector("[data-tools-search-map]");
  const toolsSearchMapCanvasEl = contentEl.querySelector(
    "[data-tools-search-map-canvas]"
  );
  const toolsSearchMapLayerEl = contentEl.querySelector("[data-tools-search-map-layer]");
  const toolsSearchMapImageEl = contentEl.querySelector("[data-tools-search-map-image]");
  const toolsSearchMapPlaceholderEl = contentEl.querySelector(
    "[data-tools-search-map-placeholder]"
  );
  const toolsSearchMapViewButtonEl = contentEl.querySelector(
    "[data-tools-search-map-view]"
  );
  const toolsKitPreviewModalEl = document.createElement("div");
  toolsKitPreviewModalEl.className = "tools-kit-preview-modal is-hidden";
  toolsKitPreviewModalEl.innerHTML = `
    <div class="tools-kit-preview-modal__backdrop" data-tools-kit-preview-close></div>
    <section class="tools-kit-preview-modal__panel" role="dialog" aria-modal="true" aria-label="Комплектация инструмента">
      <header class="tools-kit-preview-modal__header">
        <h3 class="tools-kit-preview-modal__title" data-tools-kit-preview-title>Комплектация</h3>
        <button type="button" class="icon-button tools-kit-preview-modal__close" data-tools-kit-preview-close aria-label="Закрыть окно комплектации">
          <span aria-hidden="true">✕</span>
        </button>
      </header>
      <div class="tools-kit-preview-modal__body">
        <div class="tools-kit-preview-modal__list" data-tools-kit-preview-list></div>
      </div>
    </section>
  `;
  contentEl.appendChild(toolsKitPreviewModalEl);
  const toolsKitPreviewTitleEl = toolsKitPreviewModalEl.querySelector(
    "[data-tools-kit-preview-title]"
  );
  const toolsKitPreviewListEl = toolsKitPreviewModalEl.querySelector(
    "[data-tools-kit-preview-list]"
  );
  const toolsEmptyEl = contentEl.querySelector("[data-tools-empty]");
  const toolsSubtitleEl = contentEl.querySelector("[data-tools-subtitle]");
  const toolsHeaderEl = contentEl.querySelector(".tools-modal__header");
  const toolsControlsEl = contentEl.querySelector(".tools-controls");
  const toolsZoneSubtitleEl = contentEl.querySelector("[data-tools-zone-subtitle]");
  const toolsTitleEl = contentEl.querySelector("[data-tools-title]");
  const toolsViewButtons = contentEl.querySelectorAll("[data-tools-view]");
  const toolsFilterEls = contentEl.querySelectorAll(".tools-filter-dropdown[data-tools-filter]");
  const toolsResponsibleFilterEls = contentEl.querySelectorAll(
    "[data-tools-responsible-filter]"
  );
  const toolsFiltersPanelEl = contentEl.querySelector(
    "[data-tools-filters-panel]"
  );
  const toolsFiltersToggleEl = contentEl.querySelector(
    "[data-tools-filters-toggle]"
  );
  const toolsFilterActionsEl = contentEl.querySelector(".tools-filter-actions");
  const toolsGroupingDropdownEl = contentEl.querySelector("[data-tools-grouping-dropdown]");
  const toolsGroupingToggleEl = contentEl.querySelector("[data-tools-grouping-toggle]");
  const toolsGroupingMenuEl = contentEl.querySelector("[data-tools-grouping-menu]");
  const toolsGroupingOptionEls = contentEl.querySelectorAll("[data-tools-grouping-option]");
  const toolsSortToggleEl = contentEl.querySelector("[data-tools-sort-toggle]");
  const toolsBrokenOnlyToggleEl = contentEl.querySelector(
    "[data-tools-broken-only-toggle]"
  );
  const toolsInRepairOnlyToggleEl = contentEl.querySelector(
    "[data-tools-in-repair-only-toggle]"
  );
  const toolsSortToggleIconEl = toolsSortToggleEl?.querySelector(
    ".tools-sort-toggle__icon"
  );
  if (toolsFiltersPanelEl) {
    const hasStatus = toolsFiltersPanelEl.querySelector("[data-tools-filters-status]");
    if (!hasStatus) {
      const controls = document.createElement("div");
      controls.className = "tools-filters-controls";
      controls.innerHTML = `
        <div class="tools-filters-status" data-tools-filters-status>Фильтры не выбраны</div>
        <button type="button" class="tools-filters-reset is-hidden" data-tools-filters-reset>Сбросить всё</button>
      `;
      toolsFiltersPanelEl.appendChild(controls);
    }
  }
  const toolsViewToggleEl = contentEl.querySelector("[data-tools-view-toggle]");
  const toolsStatusFilterDropdownWrapEl = contentEl.querySelector("[data-tools-status-filter-dropdown]");
  const toolsStatusStandaloneWrapEl = contentEl.querySelector("[data-tools-status-standalone-wrap]");
  const toolsStatusStandaloneEl = contentEl.querySelector("[data-tools-status-standalone]");
  const toolsMoveButtonEl = contentEl.querySelector("[data-tools-move-trigger]");
  const toolsSelectionCancelButtonEl = contentEl.querySelector(
    "[data-tools-selection-cancel]"
  );
  const toolsSelectionSelectAllButtonEl = contentEl.querySelector(
    "[data-tools-selection-select-all]"
  );
  const toolsSelectionCountEl = contentEl.querySelector(
    "[data-tools-selection-count]"
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
  const toolsMoveReasonFieldEl = contentEl.querySelector(
    "[data-tools-move-reason-field]"
  );
  const toolsMoveReasonInput = contentEl.querySelector("[data-tools-move-reason]");
  const toolsMoveObjectChangeNoteEl = contentEl.querySelector(
    "[data-tools-move-object-change-note]"
  );
  const toolsMoveMessageEl = contentEl.querySelector("[data-tools-move-message]");
  const toolsMoveSubtitleEl = contentEl.querySelector("[data-tools-move-subtitle]");
  const toolsEditModalEl = contentEl.querySelector("[data-tools-edit-modal]");
  const toolsEditBackdropEl = contentEl.querySelector("[data-tools-edit-backdrop]");
  const toolsEditCloseButton = contentEl.querySelector("[data-tools-edit-close]");
  const toolsEditCancelButton = contentEl.querySelector("[data-tools-edit-cancel]");
  const toolsEditFormEl = contentEl.querySelector("[data-tools-edit-form]");
  const toolsEditDeleteButton = contentEl.querySelector("[data-tools-edit-delete]");
  const toolsEditMessageEl = contentEl.querySelector("[data-tools-edit-message]");
  const toolsEditTitleEl = contentEl.querySelector("[data-tools-edit-title]");
  const toolsEditSubtitleEl = contentEl.querySelector("[data-tools-edit-subtitle]");
  const toolsEditQuickInfoEl = contentEl.querySelector("[data-tools-edit-quick-info]");
  const toolsInfoModalEl = contentEl.querySelector("[data-tools-info-modal]");
  const toolsInfoModalPanelEl = contentEl.querySelector(".tools-info-modal__panel");
  const toolsInfoBackdropEl = contentEl.querySelector("[data-tools-info-backdrop]");
  const toolsInfoCloseButton = contentEl.querySelector("[data-tools-info-close]");
  const toolsInfoTitleEl = contentEl.querySelector("[data-tools-info-title]");
  const toolsInfoSubtitleEl = contentEl.querySelector("[data-tools-info-subtitle]");
  const toolsInfoGridEl = contentEl.querySelector("[data-tools-info-grid]");
  const toolsInfoKitEl = contentEl.querySelector("[data-tools-info-kit]");
  const toolsInfoKitToggleButton = contentEl.querySelector(
    "[data-tools-info-kit-toggle]"
  );
  const toolsInfoKitContentEl = contentEl.querySelector(
    "[data-tools-info-kit-content]"
  );
  const toolsInfoKitListEl = contentEl.querySelector("[data-tools-info-kit-list]");
  const toolsInfoPhotosSectionEl = contentEl.querySelector("[data-tools-info-photos]");
  const toolsInfoPhotosSummaryEl = contentEl.querySelector(
    "[data-tools-info-photos-summary]"
  );
  const toolsInfoPhotosGridEl = contentEl.querySelector("[data-tools-info-photos-grid]");
  const toolsInfoPhotosEmptyEl = contentEl.querySelector("[data-tools-info-photos-empty]");
  const toolsInfoTabButtons = Array.from(
    contentEl.querySelectorAll("[data-tools-info-tab]")
  );
  const toolsInfoTabsEl = contentEl.querySelector("[data-tools-info-tabs]");
  const toolsInfoTabBadges = {
    moves: contentEl.querySelector('[data-tools-info-tab-badge="moves"]'),
    repairs: contentEl.querySelector('[data-tools-info-tab-badge="repairs"]'),
    breakdowns: contentEl.querySelector('[data-tools-info-tab-badge="breakdowns"]'),
    notes: contentEl.querySelector('[data-tools-info-tab-badge="notes"]'),
  };
  const toolsInfoPanelsContainerEl = contentEl.querySelector(
    "[data-tools-info-panels]"
  );
  const toolsInfoPanels = Array.from(
    contentEl.querySelectorAll("[data-tools-info-panel]")
  );
  const toolsInfoMovesSummaryEl = contentEl.querySelector(
    "[data-tools-info-moves-summary]"
  );
  const toolsInfoMovesListEl = contentEl.querySelector(
    "[data-tools-info-moves-list]"
  );
  const toolsInfoMovesEmptyEl = contentEl.querySelector(
    "[data-tools-info-moves-empty]"
  );
  const toolsInfoBreakdownsSummaryEl = contentEl.querySelector(
    "[data-tools-info-breakdowns-summary]"
  );
  const toolsInfoBreakdownsListEl = contentEl.querySelector(
    "[data-tools-info-breakdowns-list]"
  );
  const toolsInfoBreakdownsEmptyEl = contentEl.querySelector(
    "[data-tools-info-breakdowns-empty]"
  );
  const toolsInfoRepairsSummaryEl = contentEl.querySelector(
    "[data-tools-info-repairs-summary]"
  );
  const toolsInfoRepairsListEl = contentEl.querySelector(
    "[data-tools-info-repairs-list]"
  );
  const toolsInfoRepairsEmptyEl = contentEl.querySelector(
    "[data-tools-info-repairs-empty]"
  );
  const toolsInfoNotesSummaryEl = contentEl.querySelector(
    "[data-tools-info-notes-summary]"
  );
  const toolsInfoNotesListEl = contentEl.querySelector("[data-tools-info-notes-list]");
  const toolsInfoNotesFormEl = contentEl.querySelector("[data-tools-info-notes-form]");
  const toolsInfoNotesInputEl = contentEl.querySelector("[data-tools-info-notes-input]");
  const toolsInfoNotesSaveButton = contentEl.querySelector("[data-tools-info-notes-save]");
  const toolsInfoNotesMessageEl = contentEl.querySelector("[data-tools-info-notes-message]");
  const toolsInfoCancelMoveButton = contentEl.querySelector(
    "[data-tools-info-cancel-move]"
  );
  const toolsInfoMoveButton = contentEl.querySelector("[data-tools-info-move]");
  const toolsInfoShareButton = contentEl.querySelector("[data-tools-info-share]");
  const toolsInfoCopyButton = contentEl.querySelector("[data-tools-info-copy]");
  const toolsInfoDocumentsButton = contentEl.querySelector("[data-tools-info-documents]");
  const toolsInfoHeaderActionsEl = contentEl.querySelector(".tools-info-header-actions");
  const toolsInfoHistoryToggleButton = contentEl.querySelector(
    "[data-tools-info-history-toggle]"
  );
  const toolsEditAccountingInput = contentEl.querySelector(
    "[data-tools-edit-accounting]"
  );
  const toolsEditNameInput = contentEl.querySelector("[data-tools-edit-name]");
  const toolsEditManufacturerInput = contentEl.querySelector(
    "[data-tools-edit-manufacturer]"
  );
  const toolsEditModelInput = contentEl.querySelector("[data-tools-edit-model]");
  const toolsEditAccountingNameInput = contentEl.querySelector(
    "[data-tools-edit-accounting-name]"
  );
  const toolsEditSerialInput = contentEl.querySelector("[data-tools-edit-serial]");
  const toolsEditGroupInput = contentEl.querySelector("[data-tools-edit-group]");
  const toolsEditGroupOptionsEl = contentEl.querySelector(
    "[data-tools-edit-group-options]"
  );
  const toolsEditGroupSuggestionsEl = contentEl.querySelector(
    "[data-tools-edit-group-suggestions]"
  );
  const toolsEditKitBlockEl = contentEl.querySelector("[data-tools-edit-kit-block]");
  const toolsEditKitToggleButton = contentEl.querySelector(
    "[data-tools-edit-kit-toggle]"
  );
  const toolsEditKitPanelEl = contentEl.querySelector("[data-tools-edit-kit-panel]");
  const toolsEditKitListEl = contentEl.querySelector("[data-tools-edit-kit-list]");
  const toolsEditKitAddButton = contentEl.querySelector("[data-tools-edit-kit-add]");
  const toolsEditPhotoInput = contentEl.querySelector("[data-tools-edit-photo-add]");
  const toolsEditPhotoCountEl = contentEl.querySelector(
    "[data-tools-edit-photo-count]"
  );
  const toolsEditRemovePhotoButton = contentEl.querySelector(
    "[data-tools-edit-photo-remove]"
  );
  const addPhotoModalEl = contentEl.querySelector("[data-add-photo-modal]");
  const addPhotoBackdropEl = contentEl.querySelector(
    "[data-add-photo-backdrop]"
  );
  const addPhotoCloseButton = contentEl.querySelector("[data-add-photo-close]");
  const addPhotoDetailTitleEl = contentEl.querySelector(
    "[data-add-photo-detail-title]"
  );
  const addPhotoDetailSubtitleEl = contentEl.querySelector(
    "[data-add-photo-detail-subtitle]"
  );
  const addPhotoDetailBodyEl = contentEl.querySelector(
    "[data-add-photo-detail-body]"
  );
  const addPhotoSearchInput = contentEl.querySelector(
    "[data-add-photo-search]"
  );
  const addPhotoListEl = contentEl.querySelector("[data-add-photo-list]");
  const addPhotoEmptyEl = contentEl.querySelector("[data-add-photo-empty]");
  const addPhotoFilterEls = contentEl.querySelectorAll(
    "[data-add-photo-filter]"
  );
  const addPhotoFiltersPanelEl = contentEl.querySelector(
    "[data-add-photo-filters-panel]"
  );
  const addPhotoFiltersToggleEl = contentEl.querySelector(
    "[data-add-photo-filters-toggle]"
  );
  if (addPhotoFiltersToggleEl) addPhotoFiltersToggleEl.style.display = "none";
  const noPhotoModalEl = contentEl.querySelector("[data-no-photo-modal]");
  const noPhotoBackdropEl = contentEl.querySelector(
    "[data-no-photo-backdrop]"
  );
  const noPhotoCloseButton = contentEl.querySelector("[data-no-photo-close]");
  const noPhotoSearchInput = contentEl.querySelector(
    "[data-no-photo-search]"
  );
  const noPhotoListEl = contentEl.querySelector("[data-no-photo-list]");
  const noPhotoEmptyEl = contentEl.querySelector("[data-no-photo-empty]");
  const noPhotoSubtitleEl = contentEl.querySelector(
    "[data-no-photo-subtitle]"
  );
  const noPhotoFilterDropdownEls = contentEl.querySelectorAll(
    ".tools-filter-dropdown[data-no-photo-filter]"
  );
  const noPhotoFiltersPanelEl = contentEl.querySelector(
    "[data-no-photo-filters-panel]"
  );
  const noPhotoFiltersToggleEl = contentEl.querySelector(
    "[data-no-photo-filters-toggle]"
  );
  const noPhotoToolModalEl = contentEl.querySelector("[data-no-photo-tool-modal]");
  const noPhotoToolBackdropEl = contentEl.querySelector(
    "[data-no-photo-tool-backdrop]"
  );
  const noPhotoToolCloseButton = contentEl.querySelector(
    "[data-no-photo-tool-close]"
  );
  let noPhotoToolContentEl = contentEl.querySelector(
    "[data-no-photo-tool-content]"
  );
  const noPhotoToolSubtitleEl = contentEl.querySelector(
    "[data-no-photo-tool-subtitle]"
  );
  const removePhotoModalEl = contentEl.querySelector("[data-remove-photo-modal]");
  const removePhotoBackdropEl = contentEl.querySelector(
    "[data-remove-photo-backdrop]"
  );
  const removePhotoCloseButton = contentEl.querySelector(
    "[data-remove-photo-close]"
  );
  const removePhotoSearchInput = contentEl.querySelector(
    "[data-remove-photo-search]"
  );
  const removePhotoListEl = contentEl.querySelector("[data-remove-photo-list]");
  const removePhotoEmptyEl = contentEl.querySelector("[data-remove-photo-empty]");
  const removePhotoSubtitleEl = contentEl.querySelector(
    "[data-remove-photo-subtitle]"
  );
  const removePhotoViews = contentEl.querySelectorAll(
    "[data-remove-photo-view]"
  );
  const removePhotoBackButton = contentEl.querySelector(
    "[data-remove-photo-back]"
  );
  const removePhotoToolTitleEl = contentEl.querySelector(
    "[data-remove-photo-tool-title]"
  );
  const removePhotoToolMetaEl = contentEl.querySelector(
    "[data-remove-photo-tool-meta]"
  );
  const removePhotoPhotosEl = contentEl.querySelector(
    "[data-remove-photo-photos]"
  );
  const removePhotoPhotosEmptyEl = contentEl.querySelector(
    "[data-remove-photo-photos-empty]"
  );
  const removePhotoDeleteButton = contentEl.querySelector(
    "[data-remove-photo-delete]"
  );
  const removePhotoSelectedCountEl = contentEl.querySelector(
    "[data-remove-photo-selected]"
  );
  const removePhotoMessageEl = contentEl.querySelector(
    "[data-remove-photo-message]"
  );
  const breakdownsModalEl = contentEl.querySelector("[data-breakdowns-modal]");
  const breakdownsBackdropEl = contentEl.querySelector(
    "[data-breakdowns-backdrop]"
  );
  const breakdownsCloseButton = contentEl.querySelector(
    "[data-breakdowns-close]"
  );
  const breakdownsSearchInput = contentEl.querySelector(
    "[data-breakdowns-search]"
  );
  const breakdownsFilterEls = contentEl.querySelectorAll(
    '.tools-filter-dropdown[data-breakdowns-filter]'
  );
  const breakdownsViewButtons = Array.from(
    contentEl.querySelectorAll("[data-breakdowns-view]")
  );
  const breakdownsSortToggle = contentEl.querySelector(
    "[data-breakdowns-sort-toggle]"
  );
  const breakdownsBrokenOnlyToggle = contentEl.querySelector(
    "[data-breakdowns-broken-only-toggle]"
  );
  const breakdownsFiltersToggle = contentEl.querySelector(
    "[data-breakdowns-filters-toggle]"
  );
  const breakdownsFilterActionsEl = breakdownsFiltersToggle?.closest(".tools-filter-actions");
  const breakdownsGroupingDropdown = contentEl.querySelector(
    "[data-breakdowns-grouping-dropdown]"
  );
  const breakdownsGroupingToggle = contentEl.querySelector(
    "[data-breakdowns-grouping-toggle]"
  );
  const breakdownsGroupingMenu = contentEl.querySelector(
    "[data-breakdowns-grouping-menu]"
  );
  const breakdownsGroupingOptions = Array.from(
    contentEl.querySelectorAll("[data-breakdowns-grouping-option]")
  );
  const breakdownsFiltersPanel = contentEl.querySelector(
    "[data-breakdowns-filters-panel]"
  );
  const breakdownsFiltersStatusEls = contentEl.querySelectorAll(
    "[data-breakdowns-filters-status]"
  );
  const breakdownsFiltersResetEls = contentEl.querySelectorAll(
    "[data-breakdowns-filters-reset]"
  );
  const breakdownsListEl = contentEl.querySelector("[data-breakdowns-list]");
  const breakdownsEmptyEl = contentEl.querySelector("[data-breakdowns-empty]");
  const breakdownsSubtitleEl = contentEl.querySelector(
    "[data-breakdowns-subtitle]"
  );
  const breakdownsMessageEl = contentEl.querySelector(
    "[data-breakdowns-message]"
  );
  const repairModalEl = contentEl.querySelector("[data-repair-modal]");
  const repairBackdropEl = contentEl.querySelector("[data-repair-backdrop]");
  const repairCloseButton = contentEl.querySelector("[data-repair-close]");
  const repairSearchInput = contentEl.querySelector("[data-repair-search]");
  const repairStatusFilter = contentEl.querySelector(
    "[data-repair-status-filter]"
  );
  const repairListEl = contentEl.querySelector("[data-repair-list]");
  const repairEmptyEl = contentEl.querySelector("[data-repair-empty]");
  const repairSubtitleEl = contentEl.querySelector("[data-repair-subtitle]");
  const repairMessageEl = contentEl.querySelector("[data-repair-message]");
  const repairFormModalEl = contentEl.querySelector("[data-repair-form-modal]");
  const repairFormBackdropEl = contentEl.querySelector(
    "[data-repair-form-backdrop]"
  );
  const repairFormCloseButton = contentEl.querySelector(
    "[data-repair-form-close]"
  );
  const repairFormCancelButton = contentEl.querySelector(
    "[data-repair-form-cancel]"
  );
  const repairFormEl = contentEl.querySelector("[data-repair-form]");
  const repairFormBodyEl = repairFormEl?.querySelector(".repair-form__body");
  const repairFormSubtitleEl = contentEl.querySelector(
    "[data-repair-form-subtitle]"
  );
  const repairFormTitleEl = contentEl.querySelector("[data-repair-form-title]");
  const repairToolTitleEl = contentEl.querySelector("[data-repair-tool-title]");
  const repairToolMetaEl = contentEl.querySelector("[data-repair-tool-meta]");
  const repairInfoCardEl = contentEl.querySelector("[data-repair-info-card]");
  const repairInfoMetaEl = contentEl.querySelector("[data-repair-info-meta]");
  const repairFormSendSection = contentEl.querySelector(
    "[data-repair-form-send]"
  );
  const repairFormCompleteSection = contentEl.querySelector(
    "[data-repair-form-complete]"
  );
  const repairOrganizationInput = contentEl.querySelector(
    "[data-repair-organization]"
  );
  const repairOrganizationSuggestionsEl = contentEl.querySelector(
    "[data-repair-organization-suggestions]"
  );
  const repairDescriptionInput = contentEl.querySelector(
    "[data-repair-description]"
  );
  const repairCostInput = contentEl.querySelector("[data-repair-cost]");
  const repairFinalCostInput = contentEl.querySelector(
    "[data-repair-final-cost]"
  );
  const repairActInput = contentEl.querySelector("[data-repair-act]");
  const repairActPhotoInput = contentEl.querySelector(
    "[data-repair-act-photo]"
  );
  const repairCameraTrigger = contentEl.querySelector(
    "[data-repair-camera-trigger]"
  );
  const repairFormMessageEl = contentEl.querySelector(
    "[data-repair-form-message]"
  );
  const repairFormSubmitButton = contentEl.querySelector(
    "[data-repair-form-submit]"
  );
  const breakdownStatusModalEl = contentEl.querySelector(
    "[data-breakdown-status-modal]"
  );
  const breakdownStatusBackdropEl = contentEl.querySelector(
    "[data-breakdown-status-backdrop]"
  );
  const breakdownStatusCloseButton = contentEl.querySelector(
    "[data-breakdown-status-close]"
  );
  const breakdownStatusCancelButton = contentEl.querySelector(
    "[data-breakdown-status-cancel]"
  );
  const breakdownStatusSubtitleEl = contentEl.querySelector(
    "[data-breakdown-status-subtitle]"
  );
  const breakdownStatusToolTitleEl = contentEl.querySelector(
    "[data-breakdown-status-tool-title]"
  );
  const breakdownStatusToolMetaEl = contentEl.querySelector(
    "[data-breakdown-status-tool-meta]"
  );
  const breakdownStatusInfoMetaEl = contentEl.querySelector(
    "[data-breakdown-status-info-meta]"
  );
  const breakdownStatusMessageEl = contentEl.querySelector(
    "[data-breakdown-status-message]"
  );
  const breakdownStatusActionButtons = Array.from(
    contentEl.querySelectorAll("[data-breakdown-status-action]")
  );
  const breakdownFormModalEl = contentEl.querySelector(
    "[data-breakdown-form-modal]"
  );
  const breakdownFormBackdropEl = contentEl.querySelector(
    "[data-breakdown-form-backdrop]"
  );
  const breakdownFormCloseButton = contentEl.querySelector(
    "[data-breakdown-form-close]"
  );
  const breakdownFormCancelButton = contentEl.querySelector(
    "[data-breakdown-form-cancel]"
  );
  const breakdownFormEl = contentEl.querySelector("[data-breakdown-form]");
  const breakdownFormBodyEl = breakdownFormEl?.querySelector(
    ".breakdown-form__body"
  );
  const breakdownFormSubtitleEl = contentEl.querySelector(
    "[data-breakdown-form-subtitle]"
  );
  const breakdownToolTitleEl = contentEl.querySelector(
    "[data-breakdown-tool-title]"
  );
  const breakdownToolMetaEl = contentEl.querySelector(
    "[data-breakdown-tool-meta]"
  );
  const breakdownDescriptionInput = contentEl.querySelector(
    "[data-breakdown-description]"
  );
  const breakdownPhotoInput = contentEl.querySelector(
    "[data-breakdown-photo-input]"
  );
  const breakdownPhotoPreviewEl = contentEl.querySelector(
    "[data-breakdown-photo-preview]"
  );
  const breakdownPhotoCountEl = contentEl.querySelector(
    "[data-breakdown-photo-count]"
  );
  const breakdownCameraTrigger = contentEl.querySelector(
    "[data-breakdown-camera-trigger]"
  );
  const breakdownFormMessageEl = contentEl.querySelector(
    "[data-breakdown-form-message]"
  );
  const breakdownCameraModalEl = contentEl.querySelector(
    "[data-breakdown-camera-modal]"
  );
  const breakdownCameraBackdropEl = contentEl.querySelector(
    "[data-breakdown-camera-backdrop]"
  );
  const breakdownCameraCloseButton = contentEl.querySelector(
    "[data-breakdown-camera-close]"
  );
  const breakdownCameraCancelButton = contentEl.querySelector(
    "[data-breakdown-camera-cancel]"
  );
  const breakdownCameraCaptureButton = contentEl.querySelector(
    "[data-breakdown-camera-capture]"
  );
  const breakdownCameraRetakeButton = contentEl.querySelector(
    "[data-breakdown-camera-retake]"
  );
  const breakdownCameraSaveButton = contentEl.querySelector(
    "[data-breakdown-camera-save]"
  );
  const breakdownCameraVideoEl = contentEl.querySelector(
    "[data-breakdown-camera-video]"
  );
  const breakdownCameraCanvasEl = contentEl.querySelector(
    "[data-breakdown-camera-canvas]"
  );
  const repairCameraModalEl = contentEl.querySelector(
    "[data-repair-camera-modal]"
  );
  const repairCameraBackdropEl = contentEl.querySelector(
    "[data-repair-camera-backdrop]"
  );
  const repairCameraCloseButton = contentEl.querySelector(
    "[data-repair-camera-close]"
  );
  const repairCameraCancelButton = contentEl.querySelector(
    "[data-repair-camera-cancel]"
  );
  const repairCameraCaptureButton = contentEl.querySelector(
    "[data-repair-camera-capture]"
  );
  const repairCameraRetakeButton = contentEl.querySelector(
    "[data-repair-camera-retake]"
  );
  const repairCameraSaveButton = contentEl.querySelector(
    "[data-repair-camera-save]"
  );
  const repairCameraVideoEl = contentEl.querySelector(
    "[data-repair-camera-video]"
  );
  const repairCameraCanvasEl = contentEl.querySelector(
    "[data-repair-camera-canvas]"
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
  const addToolSuccessAddPhotoButton = contentEl.querySelector(
    "[data-add-tool-success-add-photo]"
  );
  const addToolSuccessRepeatButton = contentEl.querySelector(
    "[data-add-tool-success-repeat]"
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
  const addToolAccountingNameInput = contentEl.querySelector(
    "#tool-accounting-name-input"
  );
  const addToolCostInput = contentEl.querySelector("#tool-cost-input");
  const addToolSerialNumberInput = contentEl.querySelector(
    "#tool-serial-number-input"
  );
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
  const addToolCameraPanelEl = addToolCameraModalEl?.querySelector(
    ".settings-modal__panel"
  );
  const addToolCameraTitleEl = addToolCameraModalEl?.querySelector("h2");
  const addToolCameraSubtitleEl = addToolCameraModalEl?.querySelector("[data-add-tool-camera-subtitle]");
  const addToolCameraHintEl = contentEl.querySelector("[data-add-tool-camera-hint]");
  const addToolInvoicePhotoPicker = contentEl.querySelector(
    "[data-tool-invoice-photo-picker]"
  );
  const addToolInvoicePhotoInputs =
    addToolInvoicePhotoPicker?.querySelectorAll(
      '[name="tool-invoice-photo"]'
    ) ?? [];
  const addToolAccountingNumberSuggestionsEl = contentEl.querySelector(
    "[data-tool-accounting-number-suggestions]"
  );
  const addToolNameSuggestionsEl = contentEl.querySelector(
    "[data-tool-name-suggestions]"
  );
  const addToolManufacturerSuggestionsEl = contentEl.querySelector(
    "[data-tool-manufacturer-suggestions]"
  );
  const addToolModelSuggestionsEl = contentEl.querySelector(
    "[data-tool-model-suggestions]"
  );
  const addToolAccountingNameSuggestionsEl = contentEl.querySelector(
    "[data-tool-accounting-name-suggestions]"
  );
  const addToolCostSuggestionsEl = contentEl.querySelector(
    "[data-tool-cost-suggestions]"
  );
  const addToolSerialNumberSuggestionsEl = contentEl.querySelector(
    "[data-tool-serial-number-suggestions]"
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
  const addToolKitBlockEl = contentEl.querySelector("[data-add-tool-kit]");
  const addToolKitToggleButton = contentEl.querySelector(
    "[data-add-tool-kit-toggle]"
  );
  const addToolKitPanelEl = contentEl.querySelector("[data-add-tool-kit-panel]");
  const addToolKitListEl = contentEl.querySelector("[data-add-tool-kit-list]");
  const addToolKitAddButton = contentEl.querySelector("[data-add-tool-kit-add]");
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
  const usersVacationModalEl = contentEl.querySelector(
    "[data-users-vacation-modal]"
  );
  const usersVacationBackdropEl = contentEl.querySelector(
    "[data-users-vacation-backdrop]"
  );
  const usersVacationCloseButton = contentEl.querySelector(
    "[data-users-vacation-close]"
  );
  const usersVacationNameEl = contentEl.querySelector(
    "[data-users-vacation-name]"
  );
  const usersVacationRoleEl = contentEl.querySelector(
    "[data-users-vacation-role]"
  );
  const usersVacationToolsCountEl = contentEl.querySelector(
    "[data-users-vacation-tools-count]"
  );
  const usersVacationFinesEl = contentEl.querySelector(
    "[data-users-vacation-fines]"
  );
  const usersVacationTriggerButton = contentEl.querySelector(
    "[data-users-vacation-trigger]"
  );
  const usersVacationReturnButton = contentEl.querySelector(
    "[data-users-vacation-return]"
  );
  const usersVacationReplaceBox = contentEl.querySelector(
    "[data-users-vacation-replace]"
  );
  const usersVacationReplacerSelect = contentEl.querySelector(
    "[data-users-vacation-replacer]"
  );
  const usersVacationReplacerSearchInput = contentEl.querySelector(
    "[data-users-vacation-replacer-search]"
  );
  const usersVacationReplacerPendingNoteEl = contentEl.querySelector(
    "[data-users-vacation-replacer-pending-note]"
  );
  const usersVacationSearchResultsEl = contentEl.querySelector(
    "[data-users-vacation-search-results]"
  );
  const usersVacationConfirmButton = contentEl.querySelector(
    "[data-users-vacation-confirm]"
  );
  const usersVacationCancelButton = contentEl.querySelector(
    "[data-users-vacation-cancel]"
  );
  const usersVacationMessageEl = contentEl.querySelector(
    "[data-users-vacation-message]"
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
  const usersEditModalEl = contentEl.querySelector("[data-users-edit-modal]");
  const usersEditBackdropEl = contentEl.querySelector("[data-users-edit-backdrop]");
  const usersEditCloseButton = contentEl.querySelector("[data-users-edit-close]");
  const usersEditCancelButton = contentEl.querySelector("[data-users-edit-cancel]");
  const usersEditFormEl = contentEl.querySelector("[data-users-edit-form]");
  const usersEditRoleInput = contentEl.querySelector("[data-users-edit-role-input]");
  const usersEditRoleSuggestionsEl = contentEl.querySelector("[data-users-edit-role-suggestions]");
  const usersEditMessageEl = contentEl.querySelector("[data-users-edit-message]");
  const usersEditOrgNameEl = contentEl.querySelector("[data-users-edit-org-name]");
  const usersEditClearTelegramButton = contentEl.querySelector("[data-users-edit-clear-telegram]");
  const usersEditCreateInviteButton = contentEl.querySelector("[data-users-edit-create-invite]");
  const usersEditDeleteButton = contentEl.querySelector("[data-users-edit-delete]");
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
  const workersModalEl = contentEl.querySelector("[data-workers-modal]");
  const workersBackdropEl = contentEl.querySelector("[data-workers-backdrop]");
  const workersCloseButton = contentEl.querySelector("[data-workers-close]");
  const workersOrgNameEl = contentEl.querySelector("[data-workers-org-name]");
  const workersCountEl = contentEl.querySelector("[data-workers-count]");
  const workersListEl = contentEl.querySelector("[data-workers-list]");
  const workersEmptyEl = contentEl.querySelector("[data-workers-empty]");
  const workersAddButton = contentEl.querySelector("[data-workers-add]");
  const workersAddModalEl = contentEl.querySelector("[data-workers-add-modal]");
  const workersAddBackdropEl = contentEl.querySelector("[data-workers-add-backdrop]");
  const workersAddCloseButton = contentEl.querySelector("[data-workers-add-close]");
  const workersAddCancelButton = contentEl.querySelector("[data-workers-add-cancel]");
  const workersAddFormEl = contentEl.querySelector("[data-workers-add-form]");
  const workersAddOrgNameEl = contentEl.querySelector("[data-workers-add-org-name]");
  const workersAddMessageEl = contentEl.querySelector("[data-workers-add-message]");
  const pendingMovesModalEl = contentEl.querySelector(
    "[data-pending-moves-modal]"
  );
  const pendingMovesBackdropEl = contentEl.querySelector(
    "[data-pending-moves-backdrop]"
  );
  const pendingMovesCloseButton = contentEl.querySelector(
    "[data-pending-moves-close]"
  );
  const pendingMovesListEl = contentEl.querySelector(
    "[data-pending-moves-list]"
  );
  const pendingMovesEmptyEl = contentEl.querySelector(
    "[data-pending-moves-empty]"
  );
  const pendingMovesSubtitleEl = contentEl.querySelector(
    "[data-pending-moves-subtitle]"
  );
  const pendingMovesMessageEl = contentEl.querySelector(
    "[data-pending-moves-message]"
  );
  const pendingMovesLoadingEl = contentEl.querySelector(
    "[data-pending-moves-loading]"
  );
  const pendingMovesActionsEl = contentEl.querySelector(
    "[data-pending-moves-actions]"
  );
  const pendingMovesAcceptAllButton = contentEl.querySelector(
    "[data-pending-moves-accept-all]"
  );
  const pendingMovesDeclineAllButton = contentEl.querySelector(
    "[data-pending-moves-decline-all]"
  );
  const pendingMovesBulkConfirmModalEl = contentEl.querySelector(
    "[data-pending-moves-bulk-confirm-modal]"
  );
  const pendingMovesBulkConfirmBackdropEl = contentEl.querySelector(
    "[data-pending-moves-bulk-confirm-backdrop]"
  );
  const pendingMovesBulkConfirmCancelButton = contentEl.querySelector(
    "[data-pending-moves-bulk-confirm-cancel]"
  );
  const pendingMovesBulkConfirmCloseButton = contentEl.querySelector(
    "[data-pending-moves-bulk-confirm-close]"
  );
  const pendingMovesBulkConfirmSubmitButton = contentEl.querySelector(
    "[data-pending-moves-bulk-confirm-submit]"
  );
  const pendingMovesBulkConfirmTitleEl = contentEl.querySelector(
    "[data-pending-moves-bulk-confirm-title]"
  );
  const pendingMovesBulkConfirmTextEl = contentEl.querySelector(
    "[data-pending-moves-bulk-confirm-text]"
  );
  const pendingMovesBulkConfirmReasonBlockEl = contentEl.querySelector(
    "[data-pending-moves-bulk-confirm-reason-block]"
  );
  const pendingMovesBulkConfirmReasonEl = contentEl.querySelector(
    "[data-pending-moves-bulk-confirm-reason]"
  );
  const pendingMovesDeclineModalEl = contentEl.querySelector(
    "[data-pending-moves-decline-modal]"
  );
  const pendingMovesDeclineBackdropEl = contentEl.querySelector(
    "[data-pending-moves-decline-backdrop]"
  );
  const pendingMovesDeclineCloseButton = contentEl.querySelector(
    "[data-pending-moves-decline-close]"
  );
  const pendingMovesDeclineFormEl = contentEl.querySelector(
    "[data-pending-moves-decline-form]"
  );
  const pendingMovesDeclineReasonEl = contentEl.querySelector(
    "[data-pending-moves-decline-reason]"
  );
  const pendingMovesDeclinePhotoInput = contentEl.querySelector(
    "[data-pending-moves-decline-photo]"
  );
  const pendingMovesDeclineCancelButton = contentEl.querySelector(
    "[data-pending-moves-decline-cancel]"
  );
  const pendingMovesDeclineMessageEl = contentEl.querySelector(
    "[data-pending-moves-decline-message]"
  );
  const awaitingReplyModalEl = contentEl.querySelector("[data-awaiting-reply-modal]");
  const awaitingReplyBackdropEl = contentEl.querySelector(
    "[data-awaiting-reply-backdrop]"
  );
  const awaitingReplyCloseButton = contentEl.querySelector(
    "[data-awaiting-reply-close]"
  );
  const awaitingReplySubtitleEl = contentEl.querySelector(
    "[data-awaiting-reply-subtitle]"
  );
  const awaitingReplyListEl = contentEl.querySelector("[data-awaiting-reply-list]");
  const awaitingReplyEmptyEl = contentEl.querySelector("[data-awaiting-reply-empty]");
  const awaitingReplyMessageEl = contentEl.querySelector(
    "[data-awaiting-reply-message]"
  );
  const awaitingReplyCancelConfirmModalEl = contentEl.querySelector(
    "[data-awaiting-reply-cancel-confirm-modal]"
  );
  const awaitingReplyCancelConfirmBackdropEl = contentEl.querySelector(
    "[data-awaiting-reply-cancel-confirm-backdrop]"
  );
  const awaitingReplyCancelConfirmCloseButton = contentEl.querySelector(
    "[data-awaiting-reply-cancel-confirm-close]"
  );
  const awaitingReplyCancelConfirmCancelButton = contentEl.querySelector(
    "[data-awaiting-reply-cancel-confirm-cancel]"
  );
  const awaitingReplyCancelConfirmSubmitButton = contentEl.querySelector(
    "[data-awaiting-reply-cancel-confirm-submit]"
  );
  const awaitingReplyCancelConfirmTextEl = awaitingReplyCancelConfirmModalEl?.querySelector(
    ".pending-moves-bulk-confirm-text"
  );
  const infoPendingModalEl = contentEl.querySelector("[data-info-pending-modal]");
  const infoPendingBackdropEl = contentEl.querySelector(
    "[data-info-pending-backdrop]"
  );
  const infoPendingCloseButton = contentEl.querySelector(
    "[data-info-pending-close]"
  );
  const infoPendingSubtitleEl = contentEl.querySelector(
    "[data-info-pending-subtitle]"
  );
  const infoPendingListEl = contentEl.querySelector("[data-info-pending-list]");
  const infoPendingEmptyEl = contentEl.querySelector("[data-info-pending-empty]");
  const infoPendingSortEl = contentEl.querySelector("[data-info-pending-sort]");
  const infoPendingSearchEl = contentEl.querySelector("[data-info-pending-search]");
  const infoPendingSortDropdownEl = contentEl.querySelector("[data-info-pending-sort-dropdown]");
  const infoPendingSortTriggerEl = contentEl.querySelector("[data-info-pending-sort-trigger]");
  const infoPendingSortMenuEl = contentEl.querySelector("[data-info-pending-sort-menu]");
  const infoPendingSortOptionsEl = contentEl.querySelector("[data-info-pending-sort-options]");
  const infoPendingSortModeButtonEls = contentEl.querySelectorAll("[data-info-pending-sort-mode]");
  const infoPendingControlsContainerEl = contentEl.querySelector(".info-pending-controls");
  const infoPendingFilterReceiverEl = contentEl.querySelector(
    "[data-info-pending-filter-receiver]"
  );
  const infoPendingFilterSenderEl = contentEl.querySelector(
    "[data-info-pending-filter-sender]"
  );
  const infoPendingFilterDateFromEl = contentEl.querySelector(
    "[data-info-pending-filter-date-from]"
  );
  const infoPendingFilterDateToEl = contentEl.querySelector(
    "[data-info-pending-filter-date-to]"
  );
  const infoPendingFiltersToggleEl = contentEl.querySelector(
    "[data-info-pending-filters-toggle]"
  );
  const infoPendingFiltersPanelEl = contentEl.querySelector(
    "[data-info-pending-filters-panel]"
  );
  const infoPendingPersonDropdownEls = contentEl.querySelectorAll(
    "[data-info-pending-person-dropdown]"
  );
  const infoPendingDateTriggerEl = contentEl.querySelector(
    "[data-info-pending-date-trigger]"
  );
  const infoPendingCalendarEl = contentEl.querySelector(
    "[data-info-pending-calendar]"
  );
  const infoPendingCalendarPrevEl = contentEl.querySelector(
    "[data-info-pending-calendar-prev]"
  );
  const infoPendingCalendarNextEl = contentEl.querySelector(
    "[data-info-pending-calendar-next]"
  );
  const infoPendingCalendarMonthLabelEl = contentEl.querySelector(
    "[data-info-pending-calendar-month-label]"
  );
  const infoPendingCalendarDaysEl = contentEl.querySelector(
    "[data-info-pending-calendar-days]"
  );
  const infoPendingCalendarSelectedRangeEl = contentEl.querySelector(
    "[data-info-pending-calendar-selected-range]"
  );
  const infoMovesHistoryModalEl = contentEl.querySelector(
    "[data-info-moves-history-modal]"
  );
  const infoMovesHistoryBackdropEl = contentEl.querySelector(
    "[data-info-moves-history-backdrop]"
  );
  const infoMovesHistoryCloseButton = contentEl.querySelector(
    "[data-info-moves-history-close]"
  );
  const infoMovesHistorySearchEl = contentEl.querySelector("[data-info-moves-history-search]");
  const infoMovesHistoryViewEl = contentEl.querySelector("[data-info-moves-history-view]");
  const infoMovesHistoryGroupEl = contentEl.querySelector("[data-info-moves-history-group]");
  const infoMovesHistorySortEl = contentEl.querySelector("[data-info-moves-history-sort]");
  const infoMovesHistorySortDropdownEl = contentEl.querySelector("[data-info-moves-history-sort-dropdown]");
  const infoMovesHistorySortTriggerEl = contentEl.querySelector("[data-info-moves-history-sort-trigger]");
  const infoMovesHistorySortMenuEl = contentEl.querySelector("[data-info-moves-history-sort-menu]");
  const infoMovesHistorySortOptionsEl = contentEl.querySelector("[data-info-moves-history-sort-options]");
  const infoMovesHistoryGroupDropdownEl = contentEl.querySelector("[data-info-moves-history-group-dropdown]");
  const infoMovesHistoryGroupTriggerEl = contentEl.querySelector("[data-info-moves-history-group-trigger]");
  const infoMovesHistoryGroupMenuEl = contentEl.querySelector("[data-info-moves-history-group-menu]");
  const infoMovesHistoryGroupOptionsEl = contentEl.querySelector("[data-info-moves-history-group-options]");
  const infoMovesHistoryFiltersToggleEl = contentEl.querySelector("[data-info-moves-history-filters-toggle]");
  const infoMovesHistoryFiltersPanelEl = contentEl.querySelector("[data-info-moves-history-filters-panel]");
  const infoMovesHistoryAnswerEl = contentEl.querySelector("[data-info-moves-history-answer]");
  const infoMovesHistoryDateTriggerEl = contentEl.querySelector("[data-info-moves-history-date-trigger]");
  const infoMovesHistoryDatePopoverEl = contentEl.querySelector("[data-info-moves-history-date-popover]");
  const infoMovesHistoryDateFromEl = contentEl.querySelector("[data-info-moves-history-date-from]");
  const infoMovesHistoryDateToEl = contentEl.querySelector("[data-info-moves-history-date-to]");
  const infoMovesHistoryResetEl = contentEl.querySelector("[data-info-moves-history-reset]");
  const infoMovesHistorySummaryEl = contentEl.querySelector("[data-info-moves-history-summary]");
  const infoMovesHistoryListEl = contentEl.querySelector("[data-info-moves-history-list]");
  const infoMovesHistoryEmptyEl = contentEl.querySelector("[data-info-moves-history-empty]");
  const infoByDatesModalEl = contentEl.querySelector("[data-info-by-dates-modal]");
  const infoByDatesBackdropEl = contentEl.querySelector("[data-info-by-dates-backdrop]");
  const infoByDatesCloseButton = contentEl.querySelector("[data-info-by-dates-close]");
  const infoByDatesListEl = contentEl.querySelector("[data-info-by-dates-list]");
  const infoByDatesEmptyEl = contentEl.querySelector("[data-info-by-dates-empty]");
  const infoByDatesTabEls = contentEl.querySelectorAll("[data-info-by-dates-tab]");
  const infoByDatesCalendarEl = contentEl.querySelector("[data-info-by-dates-calendar]");
  const infoByDatesCalendarDaysEl = contentEl.querySelector("[data-info-by-dates-calendar-days]");
  const infoByDatesCalendarMonthLabelEl = contentEl.querySelector(
    "[data-info-by-dates-calendar-month-label]"
  );
  const infoByDatesCalendarSelectedRangeEl = contentEl.querySelector(
    "[data-info-by-dates-calendar-selected-range]"
  );
  const infoByDatesCalendarPrevEl = contentEl.querySelector("[data-info-by-dates-calendar-prev]");
  const infoByDatesCalendarNextEl = contentEl.querySelector("[data-info-by-dates-calendar-next]");
  const infoByDatesResetDatesEl = contentEl.querySelector("[data-info-by-dates-reset-dates]");
  const infoByDatesToggleCalendarEl = contentEl.querySelector(
    "[data-info-by-dates-toggle-calendar]"
  );
  const toolsCancelMoveModalEl = contentEl.querySelector(
    "[data-tools-cancel-move-modal]"
  );
  const toolsCancelMoveBackdropEl = contentEl.querySelector(
    "[data-tools-cancel-move-backdrop]"
  );
  const toolsCancelMoveCloseButton = contentEl.querySelector(
    "[data-tools-cancel-move-close]"
  );
  const toolsCancelMoveCancelButton = contentEl.querySelector(
    "[data-tools-cancel-move-cancel]"
  );
  const toolsCancelMoveConfirmButton = contentEl.querySelector(
    "[data-tools-cancel-move-confirm]"
  );
  const toolsCancelMoveInfoEl = contentEl.querySelector(
    "[data-tools-cancel-move-info]"
  );
  const toolsCancelMoveMessageEl = contentEl.querySelector(
    "[data-tools-cancel-move-message]"
  );
  const toolsWriteOffPendingConfirmModalEl = contentEl.querySelector(
    "[data-tools-writeoff-pending-confirm-modal]"
  );
  const toolsWriteOffPendingConfirmBackdropEl = contentEl.querySelector(
    "[data-tools-writeoff-pending-confirm-backdrop]"
  );
  const toolsWriteOffPendingConfirmCloseButton = contentEl.querySelector(
    "[data-tools-writeoff-pending-confirm-close]"
  );
  const toolsWriteOffPendingConfirmCancelButton = contentEl.querySelector(
    "[data-tools-writeoff-pending-confirm-cancel]"
  );
  const toolsWriteOffPendingConfirmSubmitButton = contentEl.querySelector(
    "[data-tools-writeoff-pending-confirm-submit]"
  );
  const toolsWriteOffPendingConfirmWriteOffButton = contentEl.querySelector(
    "[data-tools-writeoff-pending-confirm-writeoff]"
  );
  const toolsWriteOffPendingConfirmSubtitleEl = contentEl.querySelector(
    "[data-tools-writeoff-pending-confirm-subtitle]"
  );
  const toolsWriteOffPendingConfirmTitleEl = contentEl.querySelector(
    "[data-tools-writeoff-pending-confirm-title]"
  );
  const toolsWriteOffPendingConfirmMetaEl = contentEl.querySelector(
    "[data-tools-writeoff-pending-confirm-meta]"
  );
  const toolsWriteOffPendingConfirmDetailsEl = contentEl.querySelector(
    "[data-tools-writeoff-pending-confirm-details]"
  );
  const toolsWriteOffPendingConfirmMessageEl = contentEl.querySelector(
    "[data-tools-writeoff-pending-confirm-message]"
  );
  const toolsWriteOffPendingHistoryTabButtons = contentEl.querySelectorAll(
    "[data-tools-writeoff-pending-history-tab]"
  );
  const toolsWriteOffPendingPhotoWrapEl = contentEl.querySelector(
    "[data-tools-writeoff-pending-photo-wrap]"
  );
  const toolsWriteOffPendingPhotoEl = contentEl.querySelector(
    "[data-tools-writeoff-pending-photo]"
  );
  const toolsWriteOffPendingPhotoEmptyEl = contentEl.querySelector(
    "[data-tools-writeoff-pending-photo-empty]"
  );
  const toolsWriteOffPendingHistoryPanelEl = contentEl.querySelector(
    "[data-tools-writeoff-pending-history-panel]"
  );
  const toolsWriteOffPendingHistorySummaryEl = contentEl.querySelector(
    "[data-tools-writeoff-pending-history-summary]"
  );
  const toolsWriteOffPendingHistoryListEl = contentEl.querySelector(
    "[data-tools-writeoff-pending-history-list]"
  );
  const toolsWriteOffPendingHistoryEmptyEl = contentEl.querySelector(
    "[data-tools-writeoff-pending-history-empty]"
  );
  const writeOffModalEl = contentEl.querySelector("[data-writeoff-modal]");
  const writeOffBackdropEl = contentEl.querySelector("[data-writeoff-backdrop]");
  const writeOffCloseButton = contentEl.querySelector("[data-writeoff-close]");
  const writeOffCancelButton = contentEl.querySelector("[data-writeoff-cancel]");
  const writeOffSearchInput = contentEl.querySelector("[data-writeoff-search]");
  const writeOffListEl = contentEl.querySelector("[data-writeoff-list]");
  const writeOffEmptyEl = contentEl.querySelector("[data-writeoff-empty]");
  const writeOffCountEl = contentEl.querySelector("[data-writeoff-count]");
  const writeOffSubtitleEl = contentEl.querySelector("[data-writeoff-subtitle]");
  const writeOffMessageEl = contentEl.querySelector("[data-writeoff-message]");
  const writeOffNextButton = contentEl.querySelector("[data-writeoff-next]");
  const writeOffStatusOnlyButton = contentEl.querySelector("[data-writeoff-status-only]");
  const writeOffFilterButton = contentEl.querySelector("[data-writeoff-filter]");
  const writeOffFiltersPanelEl = contentEl.querySelector("[data-writeoff-filters-panel]");
  if (writeOffFiltersPanelEl) {
    const hasStatus = writeOffFiltersPanelEl.querySelector("[data-tools-filters-status]");
    if (!hasStatus) {
      const controls = document.createElement("div");
      controls.className = "tools-filters-controls";
      controls.innerHTML = `
        <div class="tools-filters-status" data-tools-filters-status>Фильтры не выбраны</div>
        <button type="button" class="tools-filters-reset is-hidden" data-tools-filters-reset>Сбросить всё</button>
      `;
      writeOffFiltersPanelEl.appendChild(controls);
    }
  }
  const writeOffConfirmModalEl = contentEl.querySelector(
    "[data-writeoff-confirm-modal]"
  );
  const writeOffConfirmBackdropEl = contentEl.querySelector(
    "[data-writeoff-confirm-backdrop]"
  );
  const writeOffConfirmCloseButton = contentEl.querySelector(
    "[data-writeoff-confirm-close]"
  );
  const writeOffConfirmCancelButton = contentEl.querySelector(
    "[data-writeoff-confirm-cancel]"
  );
  const writeOffConfirmFormEl = contentEl.querySelector(
    "[data-writeoff-confirm-form]"
  );
  const writeOffConfirmListEl = contentEl.querySelector(
    "[data-writeoff-confirm-list]"
  );
  const writeOffConfirmCountEl = contentEl.querySelector(
    "[data-writeoff-confirm-count]"
  );
  const writeOffConfirmMessageEl = contentEl.querySelector(
    "[data-writeoff-confirm-message]"
  );
  const writeOffConfirmSubmitButton = contentEl.querySelector(
    "[data-writeoff-confirm-submit]"
  );
  const writeOffActsInput = contentEl.querySelector("[data-writeoff-acts]");
  const finesModalEl = contentEl.querySelector("[data-fines-modal]");
  const finesBackdropEl = contentEl.querySelector("[data-fines-backdrop]");
  const finesCloseButton = contentEl.querySelector("[data-fines-close]");
  const finesStatusEl = contentEl.querySelector("[data-fines-status]");
  const finesListEl = contentEl.querySelector("[data-fines-list]");
  const finesEmptyEl = contentEl.querySelector("[data-fines-empty]");
  const finesTabButtons = Array.from(contentEl.querySelectorAll("[data-fines-tab]"));
  const finesResetButton = contentEl.querySelector("[data-fines-reset]");
  const finesSubmitButton = contentEl.querySelector("[data-fines-submit]");

  const context = contextOverride || (await resolveUserSettingsContext(user));
  const isChiefEngineerDashboard = user?.role === chiefEngineerRole;
  const isStrictAccessDashboard = strictAccessDashboardRoles.has(user?.role);
  const settingsData = context.settingsData;
  const organizationSettings = getEnergyOrganizationSettings(settingsData);
  const objectTrackingEnabled = isObjectTrackingEnabled(organizationSettings);
  const finesTabsConfig = [
    { id: "lateReply", title: "Поздний ответ" },
    { id: "movedByEnergy", title: "Перемещения энергетиком" },
    { id: "noPhoto", title: "Нет фото" },
  ];
  const finesTabTitleById = new Map(
    finesTabsConfig.map((item) => [item.id, item.title])
  );
  const finesState = {
    activeTab: "lateReply",
    rawFines: {},
    itemsByTab: new Map(),
    isSaving: false,
  };
  const formatFineMoney = (value) => {
    const amount = normalizeCostValue(value) || 0;
    return new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: 2,
    }).format(amount);
  };
  const setFinesStatus = (message = "", type = "") => {
    if (!finesStatusEl) return;
    const normalizedMessage = String(message ?? "").trim();
    finesStatusEl.textContent = normalizedMessage;
    finesStatusEl.classList.toggle("is-hidden", !normalizedMessage);
    finesStatusEl.classList.toggle("is-error", type === "error");
    finesStatusEl.classList.toggle("is-success", type === "success");
  };
  const getFineSummaryValue = (summary, key) => normalizeCostValue(summary?.[key]) || 0;
  const normalizeFineSummaryForIssue = (summary) => ({
    ...createMoveFineSummary(),
    ...(summary && typeof summary === "object" ? summary : {}),
  });
  const buildFineItemsByTab = (rawFines) => {
    const source =
      rawFines?.["Штрафы по пользователям"] &&
      typeof rawFines["Штрафы по пользователям"] === "object"
        ? rawFines["Штрафы по пользователям"]
        : {};
    const result = new Map();
    finesTabsConfig.forEach((tab) => {
      const items = Object.entries(source)
        .map(([responsible, userSummary]) => {
          const summary = normalizeFineSummaryForIssue(userSummary?.[tab.title]);
          const balance = getFineSummaryValue(summary, "Остаток");
          return {
            responsible: String(responsible ?? "").trim(),
            balance,
          };
        })
        .filter((item) => item.responsible && item.balance > 0)
        .sort((a, b) => a.responsible.localeCompare(b.responsible, "ru"));
      result.set(tab.id, items);
    });
    return result;
  };
  const setFinesSavingState = (isSaving) => {
    finesState.isSaving = Boolean(isSaving);
    finesSubmitButton && (finesSubmitButton.disabled = finesState.isSaving);
    finesResetButton && (finesResetButton.disabled = finesState.isSaving);
    finesTabButtons.forEach((button) => {
      button.disabled = finesState.isSaving;
    });
  };
  const roundFineAmount = (value) => {
    const amount = normalizeCostValue(value) || 0;
    return Math.max(0, Number(amount.toFixed(2)));
  };
  const formatFineInputValue = (value) => {
    const amount = roundFineAmount(value);
    return amount ? String(Number(amount.toFixed(2))) : "0";
  };
  const renderFinesTab = () => {
    if (!finesListEl) return;
    const items = finesState.itemsByTab.get(finesState.activeTab) ?? [];
    finesTabButtons.forEach((button) => {
      const isActive = button.dataset.finesTab === finesState.activeTab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
    finesListEl.innerHTML = "";
    finesEmptyEl?.classList.toggle("is-hidden", items.length > 0);
    if (!items.length) {
      setFinesStatus("");
      return;
    }
    setFinesStatus("");
    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "fines-card";
      card.dataset.responsible = item.responsible;
      const balance = roundFineAmount(item.balance);
      card.dataset.balance = String(balance);
      card.innerHTML = `
        <div class="fines-card__header">
          <div class="fines-card__name"></div>
          <div class="fines-card__balance">Остаток: ${formatFineMoney(balance)} р.</div>
        </div>
        <div class="fines-card__fields">
          <label class="fines-field">
            <span>Выставить</span>
            <input
              class="form-input"
              type="number"
              inputmode="decimal"
              min="0"
              max="${String(Number(balance.toFixed(2)))}"
              step="0.01"
              placeholder="0"
              data-fines-issue
            />
          </label>
          <label class="fines-field">
            <span>Простить</span>
            <input
              class="form-input"
              type="number"
              inputmode="decimal"
              min="0"
              max="${String(Number(balance.toFixed(2)))}"
              step="0.01"
              placeholder="0"
              data-fines-forgive
            />
          </label>
        </div>
        <div class="fines-card__hint" data-fines-card-hint hidden></div>
      `;
      const nameEl = card.querySelector(".fines-card__name");
      if (nameEl) nameEl.textContent = item.responsible;
      finesListEl.appendChild(card);
    });
  };
  const resetCurrentFinesTab = () => {
    finesListEl
      ?.querySelectorAll("[data-fines-issue], [data-fines-forgive]")
      .forEach((input) => {
        input.value = "";
      });
    finesListEl?.querySelectorAll("[data-fines-card-hint]").forEach((hintEl) => {
      hintEl.textContent = "";
      hintEl.hidden = true;
    });
    setFinesStatus("Поля на текущей вкладке сброшены.");
  };
  const closeFinesModal = () => {
    if (!finesModalEl) return;
    finesModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
    setFinesStatus("");
  };
  const openFinesModal = async () => {
    if (!finesModalEl) return;
    finesModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setFinesStatus("Загружаем штрафы…");
    finesListEl && (finesListEl.innerHTML = "");
    finesEmptyEl?.classList.add("is-hidden");
    try {
      const finesPath = `./${context.orgFolderName}/Штрафы.json`;
      finesState.rawFines = await loadJson(finesPath).catch(() => ({}));
      finesState.itemsByTab = buildFineItemsByTab(finesState.rawFines);
      renderFinesTab();
    } catch (error) {
      console.error(error);
      setFinesStatus("Не удалось загрузить Штрафы.json.", "error");
    }
  };
  const syncFineInputPair = (changedInput) => {
    const card = changedInput.closest(".fines-card");
    if (!card) return;
    const issueInput = card.querySelector("[data-fines-issue]");
    const forgiveInput = card.querySelector("[data-fines-forgive]");
    const hintEl = card.querySelector("[data-fines-card-hint]");
    const balance = roundFineAmount(card.dataset.balance);
    const issueRawValue = normalizeCostValue(issueInput?.value);
    const issueValue = roundFineAmount(issueRawValue);
    const forgiveMax = Math.max(0, balance - issueValue);
    if (issueInput) issueInput.max = String(Number(balance.toFixed(2)));
    if (forgiveInput) forgiveInput.max = String(Number(forgiveMax.toFixed(2)));

    let limitedAmount = null;
    if (changedInput === issueInput) {
      const changedValue = normalizeCostValue(changedInput.value);
      if (changedValue === null) {
        if (forgiveInput) forgiveInput.value = "";
        if (hintEl) {
          hintEl.textContent = "";
          hintEl.hidden = true;
        }
        return;
      }
      const nextIssue = Math.min(Math.max(0, changedValue), balance);
      if (nextIssue !== changedValue) {
        limitedAmount = balance;
        changedInput.value = formatFineInputValue(nextIssue);
      }
      if (forgiveInput) {
        const nextForgive = Math.max(0, balance - nextIssue);
        forgiveInput.max = String(Number(nextForgive.toFixed(2)));
        forgiveInput.value = formatFineInputValue(nextForgive);
      }
    } else if (changedInput === forgiveInput) {
      const changedValue = normalizeCostValue(changedInput.value);
      if (changedValue === null) {
        if (hintEl) {
          hintEl.textContent = "";
          hintEl.hidden = true;
        }
        return;
      }
      const nextForgive = Math.min(Math.max(0, changedValue), forgiveMax);
      if (nextForgive !== changedValue) {
        limitedAmount = forgiveMax;
        changedInput.value = formatFineInputValue(nextForgive);
      }
    }

    if (hintEl) {
      if (limitedAmount !== null) {
        hintEl.textContent = `Сумма ограничена остатком: максимум ${formatFineMoney(limitedAmount)} р.`;
        hintEl.hidden = false;
      } else {
        hintEl.textContent = "";
        hintEl.hidden = true;
      }
    }
  };
  const collectCurrentFinesChanges = () => {
    const changes = [];
    finesListEl?.querySelectorAll(".fines-card").forEach((card) => {
      const responsible = String(card.dataset.responsible ?? "").trim();
      const balance = roundFineAmount(card.dataset.balance);
      const issue = roundFineAmount(card.querySelector("[data-fines-issue]")?.value);
      const limitedIssue = Math.min(issue, balance);
      const forgive = roundFineAmount(card.querySelector("[data-fines-forgive]")?.value);
      const limitedForgive = Math.min(forgive, Math.max(0, balance - limitedIssue));
      if (!responsible || balance <= 0 || (!limitedIssue && !limitedForgive)) return;
      changes.push({
        responsible,
        balance,
        issue: limitedIssue,
        forgive: limitedForgive,
      });
    });
    return changes;
  };
  const buildFinesIssuedMessage = (tabTitle, changes) => {
    const issued = changes.filter((item) => item.issue > 0);
    if (!issued.length) return "";
    const organizationName = context.orgFullName || context.orgFolderName || "Организация";
    const lines = [
      "💸 <b>Выставлены штрафы</b>",
      `Организация: ${escapeTelegramHtml(organizationName)}`,
      `Раздел: ${escapeTelegramHtml(tabTitle)}`,
      "",
      ...issued.map(
        (item) =>
          `• ${escapeTelegramHtml(formatFullName(item.responsible, 4))}: ${escapeTelegramHtml(formatFineMoney(item.issue))} р.`
      ),
    ];
    return lines.join("\n");
  };
  const notifyFinesIssued = async (tabTitle, changes) => {
    const freshSettings = await loadJson(context.settingsPath).catch(() => settingsData);
    if (!isNotificationEnabled(freshSettings, "finesIssued")) {
      return { sent: 0, total: 0 };
    }
    const message = buildFinesIssuedMessage(tabTitle, changes);
    if (!message) return { sent: 0, total: 0 };
    const groupIds = extractNotificationGroups(freshSettings, "finesIssued");
    if (!groupIds.length) return { sent: 0, total: 0 };
    const results = await Promise.all(
      groupIds.map((chatId) => sendTelegramMessage(chatId, message))
    );
    return {
      sent: results.filter((result) => result.ok).length,
      total: results.length,
    };
  };
  const submitCurrentFinesTab = async () => {
    if (finesState.isSaving) return;
    const tabTitle = finesTabTitleById.get(finesState.activeTab) ?? "Штрафы";
    const changes = collectCurrentFinesChanges();
    if (!changes.length) {
      setFinesStatus("Заполните хотя бы одно поле на текущей вкладке.", "error");
      return;
    }
    setFinesSavingState(true);
    setFinesStatus("Сохраняем штрафы…");
    try {
      const finesPath = `./${context.orgFolderName}/Штрафы.json`;
      const rawFines = await loadJson(finesPath).catch(() => finesState.rawFines || {});
      const nextFines = rawFines && typeof rawFines === "object" && !Array.isArray(rawFines)
        ? { ...rawFines }
        : {};
      const summaryByUser =
        nextFines["Штрафы по пользователям"] &&
        typeof nextFines["Штрафы по пользователям"] === "object"
          ? { ...nextFines["Штрафы по пользователям"] }
          : {};
      const today = new Date().toISOString().slice(0, 10);
      const history = Array.isArray(nextFines.fines) ? [...nextFines.fines] : [];
      const appliedChanges = [];
      changes.forEach((change) => {
        const userSummary =
          summaryByUser[change.responsible] &&
          typeof summaryByUser[change.responsible] === "object"
            ? { ...summaryByUser[change.responsible] }
            : createMoveFineSummaryByType();
        const fineSummary = normalizeFineSummaryForIssue(userSummary[tabTitle]);
        const currentBalance = roundFineAmount(getFineSummaryValue(fineSummary, "Остаток"));
        const issue = Math.min(roundFineAmount(change.issue), currentBalance);
        const forgive = Math.min(roundFineAmount(change.forgive), Math.max(0, currentBalance - issue));
        if (issue || forgive) {
          appliedChanges.push({
            responsible: change.responsible,
            balance: currentBalance,
            issue,
            forgive,
          });
        }
        fineSummary["Выставленные штрафы"] =
          getFineSummaryValue(fineSummary, "Выставленные штрафы") + issue;
        fineSummary["Простили"] = getFineSummaryValue(fineSummary, "Простили") + forgive;
        fineSummary["Остаток"] = Math.max(0, currentBalance - issue - forgive);
        userSummary[tabTitle] = fineSummary;
        summaryByUser[change.responsible] = userSummary;
        if (issue > 0) {
          history.push({
            Дата: today,
            Ответственный: change.responsible,
            Сумма: issue,
            Причина: `Выставлен штраф: ${tabTitle}`,
            "Тип штрафа": tabTitle,
            Действие: "Выставили",
          });
        }
        if (forgive > 0) {
          history.push({
            Дата: today,
            Ответственный: change.responsible,
            Сумма: forgive,
            Причина: `Прощён штраф: ${tabTitle}`,
            "Тип штрафа": tabTitle,
            Действие: "Простили",
          });
        }
      });
      nextFines["Штрафы по пользователям"] = summaryByUser;
      nextFines.fines = history;
      await saveJson(finesPath, nextFines, { user });
      finesState.rawFines = nextFines;
      finesState.itemsByTab = buildFineItemsByTab(nextFines);
      renderFinesTab();
      const notificationResult = await notifyFinesIssued(tabTitle, appliedChanges).catch((error) => {
        console.warn("Не удалось отправить уведомление о штрафах.", error);
        return { sent: 0, total: 0, failed: true };
      });
      const notifyText = notificationResult.total
        ? ` Уведомления: ${notificationResult.sent}/${notificationResult.total}.`
        : "";
      setFinesStatus(`Штрафы по вкладке «${tabTitle}» сохранены.${notifyText}`, "success");
    } catch (error) {
      console.error(error);
      setFinesStatus("Не удалось сохранить штрафы. Проверьте сервер.", "error");
    } finally {
      setFinesSavingState(false);
    }
  };
  finesBackdropEl?.addEventListener("click", closeFinesModal);
  finesCloseButton?.addEventListener("click", closeFinesModal);
  finesResetButton?.addEventListener("click", resetCurrentFinesTab);
  finesSubmitButton?.addEventListener("click", submitCurrentFinesTab);
  finesTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.dataset.finesTab;
      if (!tabId || tabId === finesState.activeTab || finesState.isSaving) return;
      finesState.activeTab = tabId;
      renderFinesTab();
    });
  });
  finesListEl?.addEventListener("input", (event) => {
    const target = event.target.closest("[data-fines-issue], [data-fines-forgive]");
    if (!target) return;
    syncFineInputPair(target);
  });
  const resolveVacationReplacements = async () => {
    try {
      const usersData = await loadJson(usersFilePath);
      const usersList = Array.isArray(usersData?.users) ? usersData.users : [];
      const replacerName = normalizePersonName(user?.full_name ?? user?.fullName ?? "");
      const replacerOrg = normalizeOrganizationName(user?.organization ?? "");
      if (!replacerName) return [];
      return usersList
        .filter((entry) => {
          const isVacation = Boolean(entry?.on_vacation);
          if (!isVacation) return false;
          const entryOrg = normalizeOrganizationName(entry?.organization ?? "");
          if (replacerOrg && entryOrg && replacerOrg !== entryOrg) return false;
          return normalizePersonName(entry?.vacation_replacer ?? "") === replacerName;
        })
        .map((entry) => ({
          fullName: String(entry?.full_name ?? "").trim(),
          vacationStartAt: String(entry?.vacation_start_at ?? "").trim(),
        }))
        .filter((entry) => Boolean(entry.fullName));
    } catch (error) {
      console.warn("Не удалось определить замещаемых сотрудников.", error);
      return [];
    }
  };
  const vacationReplacements = await resolveVacationReplacements();
  const replacementVacationStartMap = new Map(
    vacationReplacements.map((entry) => [entry.fullName, entry.vacationStartAt])
  );
  const replacementPendingCountMap = new Map();
  for (const replacement of vacationReplacements) {
    const pendingCount =
      replacement?.fullName && context?.orgFolderName
        ? await loadUserPendingMovesCount(context.orgFolderName, {
            full_name: replacement.fullName,
          })
        : 0;
    replacementPendingCountMap.set(replacement.fullName, pendingCount);
  }
  const accessRole = resolveEnergyAccessRole(user.role);
  const accessList = organizationSettings.access?.[accessRole];
  const hasAccessConfig = Array.isArray(accessList);
  let availableActions = resolveEnergyDashboardActionsForRole(settingsData, user.role);
  const organizationNumberType = await resolveOrganizationNumberType(
    context.orgFullName || context.orgShortName || user?.organization
  );
  const shouldShowNoAccountingNumberAction =
    organizationNumberType.toLocaleLowerCase("ru") === "номер приложения";
  if (shouldShowNoAccountingNumberAction) {
    const existingActionIds = new Set(availableActions.map((action) => action.id));
    if (!existingActionIds.has(noAccountingNumberAction.id)) {
      availableActions = [...availableActions, noAccountingNumberAction];
    }
  }
  const requiresExplicitAccess = explicitAccessDashboardRoles.has(accessRole);
  const hasAwaitingReplyAccess = hasAccessConfig
    ? accessList.includes("awaiting-reply")
    : !requiresExplicitAccess;
  if (vacationReplacements.length > 0 && availableActions.some((action) => action.id === "tools")) {
    const replacementActions = vacationReplacements.map((replacement) => ({
      id: `${toolsReplacementActionPrefix}${replacement.fullName}`,
      title: `Инструменты ${formatFullName(replacement.fullName)}`,
      icon: "🧰",
      replacementFullName: replacement.fullName,
      vacationStartAt: replacement.vacationStartAt,
    }));
    availableActions = [...availableActions, ...replacementActions];
  }
  const pendingQuickAccessOption = {
    id: "pending",
    title: "На принятии",
    icon: "🚚",
  };
  const awaitingReplyQuickAccessOption = {
    id: "awaiting-reply",
    title: "Отправлено",
    icon: "📤",
  };
  const actionsMap = new Map(availableActions.map((action) => [action.id, action]));
  const quickAccessOptions = isStrictAccessDashboard
    ? [
        ...availableActions,
        ...(hasAwaitingReplyAccess ? [awaitingReplyQuickAccessOption] : []),
      ]
    : isChiefEngineerDashboard
    ? [
        ...availableActions,
        ...(hasAwaitingReplyAccess ? [awaitingReplyQuickAccessOption] : []),
      ]
    : [
        ...availableActions,
        pendingQuickAccessOption,
        ...(hasAwaitingReplyAccess ? [awaitingReplyQuickAccessOption] : []),
      ];
  const quickAccessOptionsMap = new Map(
    quickAccessOptions.map((action) => [action.id, action])
  );
  const savedLayout = settingsData.users?.[context.userKey]?.energy?.layout;
  const pendingMoves = await loadUserPendingMoves(context.orgFolderName, user);
  const awaitingReplyMoves = await loadUserAwaitingReplyMoves(context.orgFolderName, user);
  const layoutCustomized =
    settingsData.users?.[context.userKey]?.energy?.layoutCustomized ?? false;
  const normalizedPreferences = normalizePreferences(preferences);
  const groupingPreference = normalizedPreferences.grouping;
  const normalizedLayout = normalizeEnergyLayout(savedLayout, availableActions, {
    forceToggleLast:
      !layoutCustomized && isDefaultEnergyLayout(savedLayout, availableActions),
    includePending: !isStrictAccessDashboard,
    includeAwaitingReply: !isStrictAccessDashboard || hasAwaitingReplyAccess,
    includeToggle: !isStrictAccessDashboard,
  });
  const layoutToRenderRaw = applyGroupingPreference(
    normalizedLayout,
    availableActions,
    groupingPreference,
    { includeSystemCards: !isStrictAccessDashboard }
  );
  const layoutToRender = (isChiefEngineerDashboard
    ? layoutToRenderRaw
        .flatMap((item) => {
          if (item?.type === "action" && item.id) return [{ type: "action", id: item.id }];
          if (item?.type === "group" && Array.isArray(item.items)) {
            return item.items.map((actionId) => ({ type: "action", id: actionId }));
          }
          return [];
        })
        .filter(
          (item, index, list) =>
            list.findIndex((candidate) => candidate.id === item.id) === index
        )
    : layoutToRenderRaw).filter((item) =>
    hasAwaitingReplyAccess ? true : item?.type !== "awaiting-reply"
  );

  const resolveQuickAccessIds = () => {
    if (isStrictAccessDashboard) return [];
    const saved = settingsData.users?.[context.userKey]?.energy?.quickAccess;
    const baseList =
      Array.isArray(saved) && saved.length > 0 ? saved : quickAccessDefaults;
    const filtered = baseList.filter((id) => quickAccessOptionsMap.has(id));
    if (filtered.length > 0) {
      return filtered.slice(0, quickAccessLimit);
    }
    const fallback = quickAccessDefaults.filter((id) => quickAccessOptionsMap.has(id));
    if (fallback.length > 0) {
      return fallback.slice(0, quickAccessLimit);
    }
    const firstAction = availableActions[0]?.id;
    return firstAction ? [firstAction] : [];
  };

  let quickAccessIds = resolveQuickAccessIds();
  if (isStrictAccessDashboard) {
    quickAccessEl?.classList.add("is-hidden");
  }
  let quickAccessDraft = [...quickAccessIds];
  let myToolsCount =
    context?.orgFolderName && user
      ? await loadUserToolsCount(context.orgFolderName, user)
      : 0;

  const updateMyToolsBadge = (count) => {
    const safeCount = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0;
    const badgeTitle = `Мои инструменты: ${safeCount}`;
    document
      .querySelectorAll("[data-my-tools-count]")
      .forEach((badgeEl) => {
        badgeEl.textContent = String(safeCount);
        const parentButton = badgeEl.closest("button");
        if (parentButton) {
          parentButton.setAttribute("title", badgeTitle);
          parentButton.setAttribute("aria-label", badgeTitle);
        }
      });
  };

  const getQuickAccessOrderFromDom = () => {
    if (!quickAccessListEl) return [];
    return Array.from(quickAccessListEl.querySelectorAll("[data-action-id]"))
      .map((item) => item.dataset.actionId)
      .filter(Boolean);
  };

  const createQuickAccessItem = (action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-access-item";
    button.dataset.actionId = action.id;
    button.dataset.energyItemType = "action";
    button.setAttribute("aria-label", action.title);
    if (isToolsReplacementActionId(action.id)) {
      button.dataset.toolsReplacementActionId = action.id;
    }
    const replacementBadge = isToolsReplacementActionId(action.id)
      ? `<span class="quick-access-item__badge is-hidden" data-tools-replacement-count data-tools-replacement-action-id="${action.id}"></span>`
      : "";
    const toolsBadge =
      action.id === "tools"
        ? '<span class="quick-access-item__badge" data-my-tools-count>0</span>'
        : "";
    const iconMarkup = isToolsReplacementActionId(action.id)
      ? `<span aria-hidden="true" data-tools-replacement-icon data-tools-replacement-action-id="${action.id}">${action.icon}</span>`
      : `<span aria-hidden="true">${action.icon}</span>`;
    button.innerHTML = `${iconMarkup}${replacementBadge}${toolsBadge}`;
    return button;
  };

  const updateToolsReplacementIndicator = () => {
    const replacementButtons = document.querySelectorAll("button[data-tools-replacement-action-id]");
    replacementButtons.forEach((button) => {
      const actionId = button.dataset.toolsReplacementActionId;
      if (!actionId) return;
      const replacementFullName = actionId.replace(toolsReplacementActionPrefix, "");
      const normalizedCount = Number.isFinite(Number(replacementPendingCountMap.get(replacementFullName)))
        ? Math.max(0, Number(replacementPendingCountMap.get(replacementFullName)))
        : 0;
      const hasPending = normalizedCount > 0;
      const iconEl = button.querySelector("[data-tools-replacement-icon]");
      if (iconEl) {
        iconEl.textContent = hasPending ? "⏳" : "🧰";
      }
      const countElements = button.querySelectorAll("[data-tools-replacement-count]");
      countElements.forEach((element) => {
        element.textContent = String(normalizedCount);
        element.classList.toggle("is-hidden", !hasPending);
      });
      const title = hasPending
        ? `Инструменты ${formatFullName(replacementFullName)}: на принятии ${normalizedCount}`
        : `Инструменты ${formatFullName(replacementFullName)}: все приняты`;
      button.setAttribute("title", title);
      button.setAttribute("aria-label", title);
    });
  };

  const createQuickAccessPendingItem = (action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-access-item quick-access-item--pending";
    button.dataset.actionId = action.id;
    button.dataset.energyItemType = "pending";
    button.dataset.quickAccessPending = "true";
    button.setAttribute("aria-label", action.title);
    button.innerHTML = `
      <span class="quick-access-item__icon" data-quick-access-pending-icon aria-hidden="true">
        🚚
      </span>
      <span class="quick-access-item__badge is-hidden" data-quick-access-pending-count>
        0
      </span>
    `;
    return button;
  };

  const createQuickAccessAwaitingReplyItem = (action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-access-item quick-access-item--pending";
    button.dataset.actionId = action.id;
    button.dataset.energyItemType = "awaiting-reply";
    button.dataset.quickAccessAwaitingReply = "true";
    button.setAttribute("aria-label", action.title);
    button.innerHTML = `
      <span class="quick-access-item__icon" data-awaiting-reply-icon aria-hidden="true">
        📤
      </span>
      <span class="quick-access-item__badge is-hidden" data-awaiting-reply-count>
        0
      </span>
    `;
    return button;
  };

  const syncQuickAccessPendingIndicator = () => {
    if (!energyPendingWrapperEl) return;
    const pendingCount = Number(energyPendingWrapperEl.dataset.pendingCount ?? 0);
    let pendingMoves = [];
    if (energyPendingWrapperEl.dataset.pendingMoves) {
      try {
        pendingMoves = JSON.parse(energyPendingWrapperEl.dataset.pendingMoves);
      } catch (error) {
        pendingMoves = [];
      }
    }
    updateEnergyPendingStat({ count: pendingCount, available: pendingMoves });
  };

  const renderQuickAccessList = () => {
    if (!quickAccessListEl) return;
    quickAccessListEl.innerHTML = "";
    quickAccessEmptyEl?.classList.toggle("is-hidden", quickAccessIds.length > 0);
    quickAccessIds.forEach((actionId) => {
      const action = quickAccessOptionsMap.get(actionId);
      if (!action) return;
      if (actionId === "pending") {
        quickAccessListEl.appendChild(createQuickAccessPendingItem(action));
        return;
      }
      if (actionId === "awaiting-reply") {
        quickAccessListEl.appendChild(createQuickAccessAwaitingReplyItem(action));
        return;
