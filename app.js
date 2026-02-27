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
const energyPendingWrapperEl = document.querySelector("[data-energy-pending-wrapper]");
const energyPendingStatusEl = document.querySelector("[data-energy-pending-status]");
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
const initDataLocalCacheKey = "alltrack-init-data-local";
const cacheBuster =
  window.ALLTRACK_CACHE_BUSTER || new Date().toISOString().replace(/\D/g, "");
const defaultPreferences = {
  iconStyle: "icon-title",
  grouping: "free",
  theme: "telegram",
};
const quickAccessDefaults = ["breakdowns", "info", "search", "tools", "move"];
const quickAccessLimit = 5;
const toolsReplacementActionPrefix = "tools-replacement:";
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
const fineTitleBySettingKey = {
  lateReply: "Поздний ответ",
  noPhoto: "Нет фото",
  movedByEnergy: "Перемещение энергетиком",
};
const energyMailingOptions = [
  {
    id: "awaitingReply",
    title: "Ожидают ответа",
    defaultDays: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    defaultTime: "22:40",
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
    <text x="160" y="206" text-anchor="middle" font-size="14" fill="#94a3b8" font-family="Inter, sans-serif">Нет фото</text>
  </svg>`
)}`;

const applyToolPhotoWithFallback = ({
  img,
  orgFolder,
  toolNumber,
  hasPhoto,
}) => {
  if (!(img instanceof HTMLImageElement)) return;
  const candidates = hasPhoto
    ? buildToolPhotoCandidates(orgFolder, toolNumber)
    : [];
  let candidateIndex = 0;
  const fallbackToDirectoryListing = async () => {
    if (!orgFolder || !toolNumber) return;
    const resolved = await resolvePhotoUrlFromDirectoryListing(
      orgFolder,
      toolNumber
    );
    if (resolved) {
      img.src = resolved;
      img.classList.remove("is-placeholder");
    }
  };
  const markLoaded = () => {
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
  if (candidates.length) {
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

function getWeekDayShortName(date = new Date()) {
  const weekDayIndex = date.getDay();
  const map = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  return map[weekDayIndex] ?? "";
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
  { movedBy, responsible, targetObject, oldObject, moveReason, vacationNote } = {}
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
  ];
  lines.push(
    `6. Ответственный: ${escapeTelegramHtml(
      formatNotificationValue(responsible)
    )}`
  );
  if (moveReason) {
    lines.push(
      `7. Причина перемещения: ${escapeTelegramHtml(
        formatNotificationValue(moveReason)
      )}`
    );
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
  { movedBy, oldObject, targetObject, oldResponsible, newResponsible } = {}
) {
  const titleParts = [
    formatNotificationValue(tool?.["Наименование"], ""),
    formatNotificationValue(tool?.["Производитель"], ""),
    formatNotificationValue(tool?.["Модель"], ""),
  ]
    .map((part) => part.trim())
    .filter(Boolean);
  const titleLine = titleParts.length ? titleParts.join(" ") : "—";
  return [
    "😤ПЕРЕМЕЩЕНИЕ ЭНЕРГЕТИКОМ",
    `1. Номер: ${escapeTelegramHtml(formatNotificationValue(tool?.["Номер"]))}`,
    `2. Бух.номер: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Бух.номер"])
    )}`,
    `3. ${escapeTelegramHtml(titleLine)}`,
    `4. Старый объект: ${escapeTelegramHtml(formatNotificationValue(oldObject))}`,
    `5. Новый объект: ${escapeTelegramHtml(
      formatNotificationValue(targetObject)
    )}`,
    `6. Прошлый ответственный: ${escapeTelegramHtml(
      formatNotificationValue(oldResponsible)
    )}`,
    `7. Новый ответственный: ${escapeTelegramHtml(
      formatNotificationValue(newResponsible)
    )}`,
    `Переместил: ${escapeTelegramHtml(formatNotificationValue(movedBy))}`,
  ].join("\n");
}

function buildMoveToolResponsibleMessage(
  tool,
  { movedBy, oldObject, targetObject, fineNote, moveReason, vacationNote } = {}
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
  ];
  lines.push(
    `5. Новый объект: ${escapeTelegramHtml(
      formatNotificationValue(targetObject)
    )}`
  );
  if (moveReason) {
    lines.push(
      `6. Причина перемещения: ${escapeTelegramHtml(
        formatNotificationValue(moveReason)
      )}`
    );
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
    `4. Старый объект: ${escapeTelegramHtml(
      formatNotificationValue(oldObject)
    )}`,
  ];
  lines.push(
    `5. Новый объект: ${escapeTelegramHtml(
      formatNotificationValue(targetObject)
    )}`
  );
  if (moveReason) {
    lines.push(
      `6. Причина перемещения: ${escapeTelegramHtml(
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
  { writeOffDate, wroteOffBy } = {}
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
    `6. Объект: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Объект"])
    )}`,
    `7. Дата списания: ${escapeTelegramHtml(
      formatNotificationValue(writeOffDate)
    )}`,
    `8. Списал: ${escapeTelegramHtml(
      formatNotificationValue(wroteOffBy)
    )}`,
  ];
  return lines.join("\n");
}

function buildBreakdownNotificationMessage(
  tool,
  { breakdownDate, description, markedBy } = {}
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
    `5. Объект: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Объект"])
    )}`,
    `6. Описание: ${escapeTelegramHtml(
      formatNotificationValue(description)
    )}`,
    `7. Дата поломки: ${escapeTelegramHtml(
      formatNotificationValue(breakdownDate)
    )}`,
    `8. Отметил: ${escapeTelegramHtml(
      formatNotificationValue(markedBy)
    )}`,
  ];
  return lines.join("\n");
}

function buildFixBreakdownNotificationMessage(
  tool,
  { fixDate, markedBy } = {}
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
    `5. Объект: ${escapeTelegramHtml(
      formatNotificationValue(tool?.["Объект"])
    )}`,
    `6. Дата ремонта: ${escapeTelegramHtml(
      formatNotificationValue(fixDate)
    )}`,
    `7. Отметил: ${escapeTelegramHtml(
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
  { movedBy, canceledBy, targetObject, oldObject, moveReason } = {}
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
    `4. Старый объект: ${escapeTelegramHtml(
      formatNotificationValue(oldObject)
    )}`,
    `5. Новый объект: ${escapeTelegramHtml(
      formatNotificationValue(targetObject)
    )}`,
  ];
  if (moveReason) {
    lines.push(
      `6. Причина перемещения: ${escapeTelegramHtml(
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
    const oldResponsible = String(tool?.["Ответственный"] ?? "").trim();
    const moveMessage =
      notificationId === "moveByEnergy"
        ? buildMoveByEnergyNotificationMessage(tool, {
            movedBy,
            oldObject,
            targetObject,
            oldResponsible,
            newResponsible: responsibleName,
          })
        : buildMoveToolNotificationMessage(tool, {
            movedBy,
            responsible: responsibleName,
            targetObject,
            oldObject,
            moveReason,
            vacationNote,
          });
    let groupSent = false;
    const groupErrors = [];
    if (!groupsEnabled) {
      result.suppressedBySettings = true;
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

    const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
    const resolvedResponsibleId =
      normalizeTelegramId(responsibleTelegramId) ||
      findUserTelegramId(usersData, {
        fullName: responsibleName,
        organization: organizationName,
      });
    let responsibleSent = false;
    if (resolvedResponsibleId) {
      const fineNote = buildLateReplyFineNote(settingsData);
      const responsibleMessage = buildMoveToolResponsibleMessage(tool, {
        movedBy,
        oldObject,
        targetObject,
        fineNote: fineNote || "",
        moveReason,
        vacationNote,
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

function getFileExtensionFromName(name = "") {
  const fileName = String(name).trim();
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "";
  const safeExtension = String(extension ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 10);
  return safeExtension || "jpg";
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
  let hasPending = false;

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
        if (!hasPending) {
          normalized.push({ type: "pending" });
          hasPending = true;
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

  if (!hasPending) {
    normalized.unshift({ type: "pending" });
    hasPending = true;
  }

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
    energyPendingStatusEl.textContent = isWaiting
      ? `На принятии: ${pendingCount}`
      : "Все приняты";
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

function applyGroupingPreference(layout, actions, preference) {
  if (preference === "none") {
    return [
      { type: "pending" },
      ...actions.map((action) => ({ type: "action", id: action.id })),
    ];
  }
  if (preference === "all-group") {
    return [
      { type: "pending" },
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
  button.innerHTML = `
    <span class="action-icon">${action.icon}</span>
    <div class="action-title action-title--fit">${action.title}</div>
    ${replacementBadge}
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
    } else if (type === "pending") {
      layout.push({ type: "pending" });
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
  if (["yellow", "medium", "средний", "желтый", "жёлтый"].includes(normalized)) {
    return "yellow";
  }
  if (["green", "low", "низкий", "зелёный", "зеленый"].includes(normalized)) {
    return "green";
  }
  return "green";
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
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
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
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
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
  const toolsMapCountEl = contentEl.querySelector("[data-tools-map-count]");
  const toolsMapPlaceholderEl = contentEl.querySelector("[data-tools-map-placeholder]");
  const toolsMapToggleEl = contentEl.querySelector("[data-tools-map-toggle]");
  let isToolsMapCollapsed = false;
  const updateQuickAccessOffset = () => {
    if (!quickAccessEl) return;
    const rect = quickAccessEl.getBoundingClientRect();
    const offset = Math.max(0, Math.ceil(rect.height) + 6);
    document.documentElement.style.setProperty(
      "--quick-access-offset",
      `${offset}px`
    );
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
  const objectsSubtitleEl = contentEl.querySelector("[data-energy-objects-subtitle]");
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
  const demandMessageEl = contentEl.querySelector("[data-demand-message]");
  const demandSubmitButton = contentEl.querySelector("[data-demand-submit]");
  const demandCancelButton = contentEl.querySelector("[data-demand-cancel]");
  const demandSearchInput = contentEl.querySelector("[data-demand-search]");
  const demandFiltersToggle = contentEl.querySelector("[data-demand-filters-toggle]");
  const demandFiltersPanel = contentEl.querySelector("[data-demand-filters-panel]");
  const demandFilterObjectEl = contentEl.querySelector("[data-demand-filter-object]");
  const demandFilterUserEl = contentEl.querySelector("[data-demand-filter-user]");
  const demandFilterStatusEl = contentEl.querySelector("[data-demand-filter-status]");
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
  const toolsEmptyEl = contentEl.querySelector("[data-tools-empty]");
  const toolsSubtitleEl = contentEl.querySelector("[data-tools-subtitle]");
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
  const toolsInfoModalEl = contentEl.querySelector("[data-tools-info-modal]");
  const toolsInfoBackdropEl = contentEl.querySelector("[data-tools-info-backdrop]");
  const toolsInfoCloseButton = contentEl.querySelector("[data-tools-info-close]");
  const toolsInfoTitleEl = contentEl.querySelector("[data-tools-info-title]");
  const toolsInfoSubtitleEl = contentEl.querySelector("[data-tools-info-subtitle]");
  const toolsInfoGridEl = contentEl.querySelector("[data-tools-info-grid]");
  const toolsInfoTabButtons = Array.from(
    contentEl.querySelectorAll("[data-tools-info-tab]")
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
  const noPhotoFilterEls = contentEl.querySelectorAll(
    "[data-no-photo-filter]"
  );
  const noPhotoFiltersPanelEl = contentEl.querySelector(
    "[data-no-photo-filters-panel]"
  );
  const noPhotoFiltersToggleEl = contentEl.querySelector(
    "[data-no-photo-filters-toggle]"
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
  const breakdownsStatusFilter = contentEl.querySelector(
    "[data-breakdowns-status-filter]"
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
  const pendingMovesAcceptAllButton = contentEl.querySelector(
    "[data-pending-moves-accept-all]"
  );
  const pendingMovesDeclineAllButton = contentEl.querySelector(
    "[data-pending-moves-decline-all]"
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
  const writeOffFilterButton = contentEl.querySelector("[data-writeoff-filter]");
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
  const writeOffActsInput = contentEl.querySelector("[data-writeoff-acts]");

  const context = contextOverride || (await resolveUserSettingsContext(user));
  const settingsData = context.settingsData;
  const organizationSettings = getEnergyOrganizationSettings(settingsData);
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
  let availableActions = hasAccessConfig
    ? energyActions.filter((action) => accessList.includes(action.id))
    : energyActions;
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
    title: "Перемещения",
    icon: "🚚",
  };
  const actionsMap = new Map(availableActions.map((action) => [action.id, action]));
  const quickAccessOptions = [...availableActions, pendingQuickAccessOption];
  const quickAccessOptionsMap = new Map(
    quickAccessOptions.map((action) => [action.id, action])
  );
  const savedLayout = settingsData.users?.[context.userKey]?.energy?.layout;
  const pendingMoves = await loadUserPendingMoves(context.orgFolderName, user);
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

  const resolveQuickAccessIds = () => {
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
  let quickAccessDraft = [...quickAccessIds];

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
    const iconMarkup = isToolsReplacementActionId(action.id)
      ? `<span aria-hidden="true" data-tools-replacement-icon data-tools-replacement-action-id="${action.id}">${action.icon}</span>`
      : `<span aria-hidden="true">${action.icon}</span>`;
    button.innerHTML = `${iconMarkup}${replacementBadge}`;
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
      quickAccessListEl.appendChild(createQuickAccessItem(action));
    });
    updateQuickAccessOffset();
    syncQuickAccessPendingIndicator();
    updateToolsReplacementIndicator();
  };

  const scrollToQuickAccess = () => {
    if (!quickAccessEl) return;
    const appScrollEl = document.querySelector(".app-scroll");
    if (!appScrollEl || appScrollEl.scrollTop > 0) return;
    const quickAccessRect = quickAccessEl.getBoundingClientRect();
    const scrollRect = appScrollEl.getBoundingClientRect();
    const targetTop = quickAccessRect.top - scrollRect.top + appScrollEl.scrollTop - 8;
    appScrollEl.scrollTo({ top: Math.max(0, targetTop), behavior: "auto" });
  };

  const renderQuickAccessPicker = () => {
    if (!quickAccessPickerGridEl) return;
    quickAccessPickerGridEl.innerHTML = "";
    quickAccessOptions.forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quick-access-option";
      button.dataset.actionId = action.id;
      if (quickAccessDraft.includes(action.id)) {
        button.classList.add("is-selected");
      }
      button.innerHTML = `
        <span class="quick-access-option__icon" aria-hidden="true">${action.icon}</span>
        <span class="quick-access-option__title">${action.title}</span>
        <span class="quick-access-option__check" aria-hidden="true">✓</span>
      `;
      quickAccessPickerGridEl.appendChild(button);
    });
  };

  const setQuickAccessMessage = (message = "") => {
    if (!quickAccessMessageEl) return;
    quickAccessMessageEl.textContent = message;
  };

  const renderEnergyGrid = () => {
    const quickAccessSet = new Set(quickAccessIds);
    gridEl.innerHTML = "";
    layoutToRender.forEach((item) => {
      if (item.type === "pending") {
        if (quickAccessSet.has("pending")) return;
        if (!energyPendingStatEl) return;
        energyPendingStatEl.classList.add("pending-stat--grid", "action-card");
        energyPendingStatEl.dataset.energyItem = "";
        energyPendingStatEl.dataset.energyItemType = "pending";
        energyPendingStatEl.dataset.actionId = "pending";
        gridEl.appendChild(energyPendingStatEl);
      } else if (item.type === "action") {
        if (quickAccessSet.has(item.id)) return;
        const action = actionsMap.get(item.id);
        if (action) {
          gridEl.appendChild(createEnergyActionCard(action));
        }
      } else if (item.type === "group") {
        const filteredItems = item.items.filter(
          (actionId) => !quickAccessSet.has(actionId)
        );
        if (!filteredItems.length) return;
        gridEl.appendChild(createEnergyGroupCard({ ...item, items: filteredItems }, actionsMap));
      } else if (item.type === "toggle" && groupingPreference === "free") {
        gridEl.appendChild(createEnergyGroupToggleCard());
      }
    });
  };

  renderEnergyGrid();
  renderQuickAccessList();
  updateToolsReplacementIndicator();
  requestAnimationFrame(() => {
    scrollToQuickAccess();
  });

  if (quickAccessEl && typeof ResizeObserver !== "undefined") {
    if (!quickAccessEl.dataset.offsetObserverAttached) {
      const quickAccessObserver = new ResizeObserver(() => {
        updateQuickAccessOffset();
      });
      quickAccessObserver.observe(quickAccessEl);
      quickAccessEl.dataset.offsetObserverAttached = "true";
    }
  } else {
    updateQuickAccessOffset();
  }

  updateEnergyPendingStat({ count: pendingMoves.length, available: pendingMoves });
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
    filter: "",
    isSaving: false,
    toolsCount: new Map(),
    editingId: null,
  };
  const demandState = {
    items: [],
    filtered: [],
    objects: [],
    users: [],
    toolSuggestions: [],
    toolsCatalog: [],
    objectCoordinates: new Map(),
    editingId: null,
    isSaving: false,
    mapView: "list",
    filters: {
      search: "",
      object: "",
      user: "",
      status: "open",
      view: "all",
    },
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
  const toolsViewOptions = new Set(["large", "compact", "table", "map"]);
  const normalizeToolsView = (value) =>
    toolsViewOptions.has(value) ? value : "table";
  const savedToolsView = normalizeToolsView(
    settingsData.users?.[context.userKey]?.energy?.toolsView ?? "table"
  );
  const toolsState = {
    tools: [],
    filtered: [],
    objects: [],
    view: savedToolsView,
    previousView: savedToolsView,
    mode: "user",
    filters: {
      group: [],
      object: [],
      status: [],
      responsible: [],
      manufacturer: [],
      model: [],
      photo: [],
    },
    search: "",
    orgFolder: "",
    numberKey: "Номер",
    numberLabel: "Номер",
    isSelecting: false,
    selectedIds: new Set(),
    toolMap: new Map(),
    activeReplacementResponsible: "",
  };
  const pendingMovesState = {
    pendingItems: [],
    allMoves: [],
    toolMap: new Map(),
    fineConfig: {},
    targetFullName: "",
    replacementMode: false,
    vacationStartAt: "",
    isSaving: false,
  };
  const toolsCancelMoveState = {
    move: null,
    moveIndex: null,
    tool: null,
    movesPayload: null,
    isSaving: false,
  };
  const toolsEditState = {
    tool: null,
    matchNumber: "",
    matchAccounting: "",
    orgFolder: "",
    isSaving: false,
  };
  const toolsInfoState = {
    tool: null,
    orgFolder: "",
    tab: "moves",
    moves: [],
    breakdowns: [],
    repairs: [],
  };
  let pendingMovesDeclineResolver = null;
  const toolsMoveState = {
    responsibleOptions: [],
    objectOptions: [],
    responsibleRoles: new Map(),
    responsibleTelegramIds: new Map(),
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
  const noPhotoState = {
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
    toolMap: new Map(),
  };
  const removePhotoState = {
    tools: [],
    filtered: [],
    search: "",
    orgFolder: "",
    toolMap: new Map(),
    selectedTool: null,
    toolPhotos: [],
    selectedFiles: new Set(),
  };
  const writeOffState = {
    tools: [],
    filtered: [],
    search: "",
    orgFolder: "",
    selectedIds: new Set(),
    toolMap: new Map(),
    selectedTools: [],
    isSaving: false,
    filterWriteOffOnly: false,
  };
  const breakdownsState = {
    tools: [],
    filtered: [],
    search: "",
    orgFolder: "",
    selectedTool: null,
    statusTool: null,
    toolMap: new Map(),
    photos: [],
    statusFilter: "",
    isSaving: false,
    isStatusSaving: false,
  };
  const repairState = {
    tools: [],
    filtered: [],
    search: "",
    orgFolder: "",
    statusFilter: "",
    toolMap: new Map(),
  };
  const repairFormState = {
    selectedTool: null,
    organizations: [],
    isSaving: false,
    mode: "send",
  };
  let addToolViewportListenersAttached = false;
  let breakdownViewportListenersAttached = false;
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
  const updateBreakdownKeyboardOffset = () => {
    if (!breakdownFormModalEl) return;
    const viewport = window.visualViewport;
    if (!viewport) {
      breakdownFormModalEl.style.removeProperty("--keyboard-offset");
      return;
    }
    const offset = Math.max(
      0,
      window.innerHeight - viewport.height - viewport.offsetTop
    );
    breakdownFormModalEl.style.setProperty("--keyboard-offset", `${offset}px`);
  };
  const attachBreakdownViewportListeners = () => {
    const viewport = window.visualViewport;
    if (!viewport || breakdownViewportListenersAttached) return;
    viewport.addEventListener("resize", updateBreakdownKeyboardOffset);
    viewport.addEventListener("scroll", updateBreakdownKeyboardOffset);
    breakdownViewportListenersAttached = true;
  };
  const detachBreakdownViewportListeners = () => {
    const viewport = window.visualViewport;
    if (!viewport || !breakdownViewportListenersAttached) return;
    viewport.removeEventListener("resize", updateBreakdownKeyboardOffset);
    viewport.removeEventListener("scroll", updateBreakdownKeyboardOffset);
    breakdownViewportListenersAttached = false;
  };
  const objectsPath = context.objectsPath ?? `./${context.orgFolderName}/Объекты.json`;
  const demandPath = context.demandPath ?? `./${context.orgFolderName}/Заявки.json`;
  const toolsDatabasePath =
    context.toolsDatabasePath ?? `./${context.orgFolderName}/База с инструментами.json`;
  const objectsFilterInput = objectsFormEl?.querySelector("[name='object-filter']");
  const objectsCreateNameInput = objectsCreateFormEl?.querySelector(
    "[name='object-name']"
  );
  const objectsCreateCoordinatesInput = objectsCreateFormEl?.querySelector(
    "[name='object-coordinates']"
  );
  const objectsEditNameInput = objectsEditFormEl?.querySelector(
    "[name='object-name']"
  );
  const objectsEditCoordinatesInput = objectsEditFormEl?.querySelector(
    "[name='object-coordinates']"
  );
  let selectedUsersOrgName = "";
  let selectedUsersOrgDisplayName = "";
  let selectedUsersOrgNames = [];
  let selectedVacationUser = null;

  if (objectsSubtitleEl) {
    const orgLabel =
      context.orgFullName ?? context.orgShortName ?? context.orgFolderName ?? "";
    objectsSubtitleEl.textContent = orgLabel;
  }

  const buildToolsMapBounds = (points) => {
    const safePoints = Array.isArray(points) ? points : [];
    if (!safePoints.length) return null;
    const latValues = safePoints.map((point) => point.coordinates.lat);
    const lngValues = safePoints.map((point) => point.coordinates.lng);
    const minLat = Math.min(...latValues);
    const maxLat = Math.max(...latValues);
    const minLng = Math.min(...lngValues);
    const maxLng = Math.max(...lngValues);
    const latPadding = Math.max(0.01, (maxLat - minLat) * 0.2);
    const lngPadding = Math.max(0.01, (maxLng - minLng) * 0.2);
    return {
      minLat: minLat - latPadding,
      maxLat: maxLat + latPadding,
      minLng: minLng - lngPadding,
      maxLng: maxLng + lngPadding,
    };
  };

  const buildYandexStaticMapUrl = (points, bounds) => {
    const safePoints = Array.isArray(points) ? points : [];
    if (!safePoints.length) return "";
    const width = 640;
    const height = 420;

    const params = new URLSearchParams({
      lang: "ru_RU",
      l: "map",
      size: `${width},${height}`,
    });

    if (bounds) {
      const bbox = `${bounds.minLng.toFixed(6)},${bounds.minLat.toFixed(
        6
      )}~${bounds.maxLng.toFixed(6)},${bounds.maxLat.toFixed(6)}`;
      params.set("bbox", bbox);
    }

    return `https://static-maps.yandex.ru/1.x/?${params.toString()}`;
  };

  const openToolsModalWithObjectFilter = async (objectName) => {
    const safeObjectName = sanitizeObjectName(objectName);
    await openToolsModal({ objectFilter: safeObjectName });
  };

  const projectToolsMapPoint = (point, bounds) => {
    if (!bounds) return { x: 0.5, y: 0.5 };
    const lngRange = bounds.maxLng - bounds.minLng || 0.001;
    const latRange = bounds.maxLat - bounds.minLat || 0.001;
    const rawX = (point.coordinates.lng - bounds.minLng) / lngRange;
    const rawY = 1 - (point.coordinates.lat - bounds.minLat) / latRange;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    return {
      x: clamp(rawX, 0.04, 0.96),
      y: clamp(rawY, 0.06, 0.94),
    };
  };

  const renderToolsMap = (points) => {
    if (!toolsMapCanvasEl || !toolsMapEl) return;
    const safePoints = Array.isArray(points) ? points : [];
    toolsMapState.points = safePoints;
    if (toolsMapCountEl) {
      toolsMapCountEl.textContent = `${safePoints.length} объектов`;
    }
    const mapContentEl = toolsMapLayerEl ?? toolsMapCanvasEl;
    const existingDots = mapContentEl.querySelectorAll(".tools-map-dot");
    existingDots.forEach((dot) => dot.remove());
    if (!safePoints.length) {
      toolsMapPlaceholderEl?.classList.remove("is-hidden");
      toolsMapCanvasEl.classList.remove("tools-map-canvas--map");
      if (toolsMapImageEl) {
        toolsMapImageEl.classList.add("is-hidden");
        toolsMapImageEl.removeAttribute("src");
      }
      if (toolsMapState.activated) {
        syncInteractiveToolsMap();
      }
      return;
    }
    toolsMapPlaceholderEl?.classList.add("is-hidden");
    toolsMapCanvasEl.classList.add("tools-map-canvas--map");
    const bounds = buildToolsMapBounds(safePoints);
    if (toolsMapImageEl) {
      const mapUrl = buildYandexStaticMapUrl(safePoints, bounds);
      toolsMapImageEl.src = mapUrl;
      toolsMapImageEl.classList.remove("is-hidden");
    }
    safePoints.forEach((point) => {
      const position = projectToolsMapPoint(point, bounds);
      const dot = document.createElement("button");
      dot.className = "tools-map-dot";
      dot.type = "button";
      dot.setAttribute("aria-label", `${point.name}: ${point.count} инструментов`);
      dot.style.left = `${(position.x * 100).toFixed(2)}%`;
      dot.style.top = `${(position.y * 100).toFixed(2)}%`;
      dot.innerHTML = `
        <span class="tools-map-dot__title">${escapeHtml(point.name)}</span>
        <span class="tools-map-dot__count">${point.count}</span>
      `;
      dot.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void openToolsModalWithObjectFilter(point.name);
      });
      mapContentEl.appendChild(dot);
    });

    if (toolsMapState.activated) {
      syncInteractiveToolsMap();
    }
  };

  const setToolsMapCollapsedState = (collapsed) => {
    if (!toolsMapEl || !toolsMapToggleEl) return;
    isToolsMapCollapsed = Boolean(collapsed);
    toolsMapEl.classList.toggle("tools-map-card--collapsed", isToolsMapCollapsed);
    toolsMapToggleEl.innerHTML = '<span aria-hidden="true">▾</span>';
    toolsMapToggleEl.classList.toggle("is-collapsed", isToolsMapCollapsed);
    toolsMapToggleEl.setAttribute("aria-expanded", String(!isToolsMapCollapsed));
    toolsMapToggleEl.setAttribute(
      "aria-label",
      isToolsMapCollapsed ? "Развернуть карту" : "Свернуть карту"
    );
    if (!isToolsMapCollapsed && !toolsMapState.activated) {
      toolsMapCanvasEl?.setAttribute(
        "aria-label",
        "Нажмите, чтобы оживить карту, масштабировать и перемещать"
      );
    }
  };

  const toolsMapState = {
    activated: false,
    points: [],
    map: null,
    markers: [],
    yandexPromise: null,
  };

  const ensureYandexMapsLoaded = () => {
    if (window.ymaps?.Map) {
      return Promise.resolve(window.ymaps);
    }

    if (toolsMapState.yandexPromise) {
      return toolsMapState.yandexPromise;
    }

    toolsMapState.yandexPromise = new Promise((resolve, reject) => {
      const resolveWhenReady = () => {
        if (!window.ymaps?.ready) {
          reject(new Error("API Яндекс.Карт не готов"));
          return;
        }
        window.ymaps.ready(() => resolve(window.ymaps));
      };

      const existingScript = document.getElementById("yandex-maps-js");
      if (existingScript) {
        existingScript.addEventListener("load", resolveWhenReady, { once: true });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Не удалось загрузить API Яндекс.Карт")),
          { once: true }
        );
        if (window.ymaps?.ready) {
          resolveWhenReady();
        }
        return;
      }

      const script = document.createElement("script");
      script.id = "yandex-maps-js";
      script.src = "https://api-maps.yandex.ru/2.1/?lang=ru_RU";
      script.onload = resolveWhenReady;
      script.onerror = () => reject(new Error("Не удалось загрузить API Яндекс.Карт"));
      document.body.appendChild(script);
    });

    return toolsMapState.yandexPromise;
  };

  const syncInteractiveToolsMap = () => {
    if (!toolsMapState.map || !window.ymaps) return;
    const safePoints = Array.isArray(toolsMapState.points) ? toolsMapState.points : [];
    toolsMapState.markers.forEach((marker) => {
      toolsMapState.map?.geoObjects.remove(marker);
    });
    toolsMapState.markers = [];

    if (!safePoints.length) {
      toolsMapState.map.setCenter([53.9, 27.56], 10, {
        duration: 240,
      });
      return;
    }

    const bounds = [];
    safePoints.forEach((point) => {
      const lat = Number(point?.coordinates?.lat);
      const lng = Number(point?.coordinates?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const safePointName = escapeHtml(point.name);
      const toolsCount = Number(point.count) || 0;

      bounds.push([lat, lng]);
      const marker = new window.ymaps.Placemark(
        [lat, lng],
        {
          balloonContentHeader: safePointName,
          balloonContentBody: `Инструментов: ${toolsCount}`,
          hintContent: `${safePointName} · ${toolsCount}`,
          iconCaption: `${safePointName} · ${toolsCount}`,
        },
        {
          preset: "islands#blueCircleDotIconWithCaption",
        }
      );
      marker.__toolsPoint = point;
      marker.events.add("click", () => {
        void openToolsModalWithObjectFilter(point.name);
      });
      toolsMapState.map.geoObjects.add(marker);
      toolsMapState.markers.push(marker);
    });

    if (bounds.length) {
      if (bounds.length === 1) {
        toolsMapState.map.setCenter(bounds[0], 15, { duration: 260 });
        return;
      }
      toolsMapState.map.setBounds(bounds, {
        checkZoomRange: true,
        zoomMargin: [34, 34, 34, 34],
        duration: 260,
      });
    }
  };

  const activateToolsMapInteraction = async () => {
    if (
      !toolsMapCanvasEl ||
      !toolsMapLayerEl ||
      toolsMapState.activated ||
      isToolsMapCollapsed
    ) {
      return;
    }

    try {
      await ensureYandexMapsLoaded();
      toolsMapState.activated = true;
      toolsMapCanvasEl.classList.add("tools-map-canvas--interactive");
      toolsMapCanvasEl.classList.add("tools-map-canvas--interactive-live");
      toolsMapCanvasEl.classList.add("tools-map-canvas--map");
      toolsMapCanvasEl.setAttribute(
        "aria-label",
        "Карта активна. Перемещайте карту и меняйте масштаб"
      );

      toolsMapPlaceholderEl?.classList.add("is-hidden");
      toolsMapImageEl?.classList.add("is-hidden");

      if (!toolsMapState.map) {
        toolsMapLayerEl.innerHTML = "";
        toolsMapState.map = new window.ymaps.Map(
          toolsMapLayerEl,
          {
            center: [53.9, 27.56],
            zoom: 10,
            controls: ["zoomControl", "geolocationControl"],
          },
          {
            suppressMapOpenBlock: true,
          }
        );
        window.setTimeout(() => {
          toolsMapState.map?.container?.fitToViewport?.();
        }, 80);
      }

      syncInteractiveToolsMap();
    } catch (error) {
      console.warn("Не удалось активировать интерактивную карту.", error);
      toolsMapCanvasEl.setAttribute(
        "aria-label",
        "Не удалось загрузить интерактивную карту, попробуйте позже"
      );
    }
  };

  const awakenToolsMap = async () => {
    if (!toolsMapCanvasEl || isToolsMapCollapsed) return;
    await activateToolsMapInteraction();
    toolsMapCanvasEl.classList.remove("tools-map-canvas--alive");
    window.requestAnimationFrame(() => {
      toolsMapCanvasEl.classList.add("tools-map-canvas--alive");
      window.setTimeout(() => {
        toolsMapCanvasEl.classList.remove("tools-map-canvas--alive");
      }, 720);
    });
  };

  if (toolsMapToggleEl) {
    toolsMapToggleEl.addEventListener("click", () => {
      setToolsMapCollapsedState(!isToolsMapCollapsed);
    });
  }

  if (toolsMapCanvasEl) {
    toolsMapCanvasEl.addEventListener("click", () => {
      void awakenToolsMap();
    });
    toolsMapCanvasEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      void awakenToolsMap();
    });
  }

  const updateToolsMap = async () => {
    if (!toolsMapEl || !toolsMapCanvasEl) return;
    try {
      const [toolsRaw, objectsRaw] = await Promise.all([
        loadJson(toolsDatabasePath).catch(() => []),
        loadJson(objectsPath).catch(() => []),
      ]);
      const toolsList = normalizeToolsData(toolsRaw);
      const objectsList = normalizeObjectsData(objectsRaw);
      const points = buildToolsMapPoints(
        toolsList,
        objectsList,
        user.full_name ?? user.fullName ?? ""
      );
      renderToolsMap(points);
    } catch (error) {
      console.warn("Не удалось загрузить данные для карты инструментов.", error);
      renderToolsMap([]);
    }
  };

  updateToolsMap();

  const setObjectsMessage = (message = "") => {
    if (objectsMessageEl) {
      objectsMessageEl.textContent = message;
    }
  };

  const setObjectsFilterValue = (value = "") => {
    objectsState.filter = String(value ?? "").trim();
    if (objectsFilterInput) {
      objectsFilterInput.value = objectsState.filter;
    }
  };

  const resetObjectsForm = () => {
    setObjectsFilterValue("");
    setObjectsMessage("");
  };

  const setObjectsCreateMessage = (message = "") => {
    if (objectsCreateMessageEl) {
      objectsCreateMessageEl.textContent = message;
    }
  };

  const setObjectsEditMessage = (message = "") => {
    if (objectsEditMessageEl) {
      objectsEditMessageEl.textContent = message;
    }
  };

  const resetObjectsCreateForm = () => {
    if (objectsCreateFormEl) {
      objectsCreateFormEl.reset();
    }
    setObjectsCreateMessage("");
  };

  const resetObjectsEditForm = () => {
    if (objectsEditFormEl) {
      objectsEditFormEl.reset();
    }
    objectsState.editingId = null;
    setObjectsEditMessage("");
  };

  const formatCoordinatesInput = (coordinates) => {
    if (!coordinates) return "";
    const lat = Number.isFinite(coordinates.lat) ? coordinates.lat : null;
    const lng = Number.isFinite(coordinates.lng) ? coordinates.lng : null;
    if (lat === null || lng === null) return "";
    return `${lat}, ${lng}`;
  };

  const parseCoordinatesInput = (value = "") => {
    const raw = String(value ?? "").trim();
    if (!raw) {
      return { coordinates: null, error: "" };
    }
    const parts = raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length !== 2) {
      return {
        coordinates: null,
        error: "Введите координаты в формате: 53.912103, 27.572346",
      };
    }
    const latValue = normalizeCoordinateValue(parts[0]);
    const lngValue = normalizeCoordinateValue(parts[1]);
    if (latValue === null || lngValue === null) {
      return { coordinates: null, error: "Введите корректные координаты." };
    }
    if (latValue < -90 || latValue > 90 || lngValue < -180 || lngValue > 180) {
      return {
        coordinates: null,
        error: "Координаты вне допустимого диапазона.",
      };
    }
    return { coordinates: { lat: latValue, lng: lngValue }, error: "" };
  };

  const buildObjectsToolCounts = (toolsList) => {
    const counts = new Map();
    toolsList.forEach((tool) => {
      if (!tool || typeof tool !== "object") return;
      const objectName = sanitizeObjectName(tool["Объект"] ?? tool.object ?? "");
      if (!objectName) return;
      const key = objectName.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  };

  const normalizeObjectCompare = (value = "") =>
    sanitizeObjectName(value).toLowerCase();

  const isObjectKeyName = (key = "") => {
    const normalized = String(key ?? "").trim().toLowerCase();
    if (!normalized) return false;
    return normalized.includes("объект") || ["object", "location"].includes(normalized);
  };

  const updateObjectNameInData = (data, oldName, newName) => {
    const oldNormalized = normalizeObjectCompare(oldName);
    if (!oldNormalized) return { data, changed: false };
    const updateNode = (node) => {
      if (Array.isArray(node)) {
        let changed = false;
        const next = node.map((item) => {
          const result = updateNode(item);
          if (result.changed) changed = true;
          return result.value;
        });
        return { value: changed ? next : node, changed };
      }
      if (node && typeof node === "object") {
        let changed = false;
        const next = { ...node };
        Object.entries(node).forEach(([key, value]) => {
          if (typeof value === "string" && isObjectKeyName(key)) {
            if (normalizeObjectCompare(value) === oldNormalized) {
              next[key] = newName;
              changed = true;
              return;
            }
          }
          if (value && typeof value === "object") {
            const result = updateNode(value);
            if (result.changed) {
              next[key] = result.value;
              changed = true;
            }
          }
        });
        return { value: changed ? next : node, changed };
      }
      return { value: node, changed: false };
    };
    const result = updateNode(data);
    return { data: result.value, changed: result.changed };
  };

  const replaceObjectNameInList = (list, oldName, newName) => {
    const oldNormalized = normalizeObjectCompare(oldName);
    return list.map((item) => {
      if (normalizeObjectCompare(item) === oldNormalized) {
        return newName;
      }
      return item;
    });
  };

  const replaceObjectNameInToolsList = (list, oldName, newName) => {
    const oldNormalized = normalizeObjectCompare(oldName);
    return list.map((tool) => {
      if (!tool || typeof tool !== "object") return tool;
      const currentName = String(tool?.["Объект"] ?? "").trim();
      if (normalizeObjectCompare(currentName) !== oldNormalized) return tool;
      return { ...tool, "Объект": newName };
    });
  };

  const replaceObjectNameInDemands = (list, oldName, newName) => {
    const oldNormalized = normalizeObjectCompare(oldName);
    return list.map((entry) => {
      if (!entry || typeof entry !== "object") return entry;
      const currentName = String(entry.object ?? "").trim();
      if (normalizeObjectCompare(currentName) !== oldNormalized) return entry;
      return { ...entry, object: newName };
    });
  };

  const formatObjectsToolsLabel = (count) => {
    const safeCount = Number.isFinite(count) ? count : 0;
    const mod10 = safeCount % 10;
    const mod100 = safeCount % 100;
    if (mod10 === 1 && mod100 !== 11) {
      return `${safeCount} инструмент`;
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
      return `${safeCount} инструмента`;
    }
    return `${safeCount} инструментов`;
  };

  const renderObjectsList = () => {
    if (!objectsItemsEl) return;
    objectsItemsEl.innerHTML = "";
    const query = objectsState.filter.toLowerCase();
    const filteredItems = objectsState.items.filter((item) => {
      if (!query) return true;
      return item.name.toLowerCase().includes(query);
    });
    const sortedItems = [...filteredItems].sort((a, b) => {
      const aName = normalizeObjectCompare(a?.name ?? "");
      const bName = normalizeObjectCompare(b?.name ?? "");
      return aName.localeCompare(bName, "ru", { numeric: true, sensitivity: "base" });
    });
    if (objectsCountEl) {
      objectsCountEl.textContent = query
        ? `${filteredItems.length}/${objectsState.items.length}`
        : String(objectsState.items.length);
    }
    if (objectsEmptyEl) {
      const isEmpty = filteredItems.length === 0;
      objectsEmptyEl.classList.toggle("is-hidden", !isEmpty);
      objectsEmptyEl.textContent = query
        ? "По фильтру ничего не найдено."
        : "Пока нет объектов.";
    }
    sortedItems.forEach((item) => {
      const itemEl = document.createElement("div");
      itemEl.className = "objects-item";
      itemEl.dataset.objectId = item.id;

      const contentEl = document.createElement("div");
      contentEl.className = "objects-item__content";

      const nameEl = document.createElement("div");
      nameEl.className = "objects-item__name";
      nameEl.textContent = item.name;

      const countKey = sanitizeObjectName(item.name).toLowerCase();
      const toolCount = objectsState.toolsCount.get(countKey) ?? 0;
      if (toolCount === 0) {
        itemEl.classList.add("objects-item--empty");
      }
      if (!item.coordinates) {
        itemEl.classList.add("objects-item--missing");
      }
      const toolsEl = document.createElement("div");
      toolsEl.className = "objects-item__tools";
      toolsEl.textContent = formatObjectsToolsLabel(toolCount);

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
      deleteButton.title =
        toolCount > 0
          ? "Нельзя удалить: на объекте есть инструменты"
          : "Удалить";
      deleteButton.disabled = toolCount > 0;

      actionsEl.append(editButton, deleteButton);
      contentEl.append(nameEl, toolsEl);
      itemEl.append(contentEl, actionsEl);
      objectsItemsEl.appendChild(itemEl);
    });
  };

  const loadObjects = async () => {
    if (!objectsItemsEl) return;
    setObjectsMessage("Загружаем список объектов...");
    try {
      const [objectsRaw, toolsRaw] = await Promise.all([
        loadJson(objectsPath),
        loadJson(toolsDatabasePath).catch(() => []),
      ]);
      objectsState.items = normalizeObjectsData(objectsRaw);
      const toolsList = normalizeToolsData(toolsRaw);
      objectsState.toolsCount = buildObjectsToolCounts(toolsList);
      setObjectsMessage("");
    } catch (error) {
      console.warn("Не удалось загрузить объекты.", error);
      objectsState.items = [];
      objectsState.toolsCount = new Map();
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
    objectsFilterInput?.focus();
  };

  const closeObjectsCreateModal = () => {
    if (!objectsCreateModalEl) return;
    objectsCreateModalEl.classList.add("is-hidden");
    resetObjectsCreateForm();
  };

  const openObjectsCreateModal = () => {
    if (!objectsCreateModalEl) return;
    objectsCreateModalEl.classList.remove("is-hidden");
    resetObjectsCreateForm();
    objectsCreateNameInput?.focus();
  };

  const closeObjectsEditModal = () => {
    if (!objectsEditModalEl) return;
    objectsEditModalEl.classList.add("is-hidden");
    resetObjectsEditForm();
  };

  const openObjectsEditModal = (item) => {
    if (!objectsEditModalEl || !item) return;
    objectsState.editingId = item.id;
    if (objectsEditNameInput) {
      objectsEditNameInput.value = item.name ?? "";
    }
    if (objectsEditCoordinatesInput) {
      objectsEditCoordinatesInput.value = formatCoordinatesInput(item.coordinates);
    }
    setObjectsEditMessage("");
    objectsEditModalEl.classList.remove("is-hidden");
    objectsEditNameInput?.focus();
  };

  const closeObjectsModal = () => {
    if (!objectsModalEl) return;
    objectsModalEl.classList.add("is-hidden");
    resetObjectsForm();
    setObjectsMessage("");
    closeObjectsCreateModal();
    closeObjectsEditModal();
  };

  if (objectsBackdropEl) {
    objectsBackdropEl.addEventListener("click", closeObjectsModal);
  }
  if (objectsCloseButton) {
    objectsCloseButton.addEventListener("click", closeObjectsModal);
  }
  if (objectsCreateBackdropEl) {
    objectsCreateBackdropEl.addEventListener("click", closeObjectsCreateModal);
  }
  if (objectsCreateCloseButton) {
    objectsCreateCloseButton.addEventListener("click", closeObjectsCreateModal);
  }
  if (objectsCreateCancelButton) {
    objectsCreateCancelButton.addEventListener("click", closeObjectsCreateModal);
  }
  if (objectsEditBackdropEl) {
    objectsEditBackdropEl.addEventListener("click", closeObjectsEditModal);
  }
  if (objectsEditCloseButton) {
    objectsEditCloseButton.addEventListener("click", closeObjectsEditModal);
  }
  if (objectsEditCancelButton) {
    objectsEditCancelButton.addEventListener("click", closeObjectsEditModal);
  }

  const setDemandMessage = (message = "") => {
    if (demandMessageEl) {
      demandMessageEl.textContent = message;
    }
  };

  const setDemandFormVisibility = (isOpen) => {
    if (!demandFormModalEl) return;
    demandFormModalEl.classList.toggle("is-hidden", !isOpen);
    if (demandToggleButton) {
      demandToggleButton.classList.toggle("is-active", isOpen);
      demandToggleButton.setAttribute("aria-expanded", String(isOpen));
    }
    if (isOpen) demandItemInput?.focus();
  };
  const setDemandFiltersVisibility = (isOpen) => {
    if (!demandFiltersPanel) return;
    demandFiltersPanel.classList.toggle("is-hidden", !isOpen);
    if (demandFiltersToggle) {
      demandFiltersToggle.classList.toggle("is-active", isOpen);
      demandFiltersToggle.setAttribute("aria-expanded", String(isOpen));
    }
  };

  const demandPriorityLabels = {
    red: "Высокий",
    yellow: "Средний",
    green: "Низкий",
  };

  const pluralizeDemandDays = (count) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return "день";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
    return "дней";
  };

  const formatDemandCreatedLabel = (value) => {
    const createdDate = parseIsoDateValue(value);
    if (!createdDate) return "—";
    const days = getDaysDifference(new Date(), createdDate);
    return `${formatDateValue(createdDate)} (${days} ${pluralizeDemandDays(
      Math.abs(days)
    )})`;
  };

  const getSelectedDemandPriority = () => {
    const selected = Array.from(demandPriorityInputs || []).find(
      (input) => input.checked
    );
    return normalizeDemandPriority(selected?.value ?? "green");
  };

  const setDemandPriorityValue = (value) => {
    const normalized = normalizeDemandPriority(value);
    Array.from(demandPriorityInputs || []).forEach((input) => {
      input.checked = input.value === normalized;
    });
  };

  const setDemandFormTitle = (mode = "add") => {
    if (!demandFormTitleEl) return;
    demandFormTitleEl.textContent =
      mode === "edit" ? "Редактирование заявки" : "Новая заявка";
  };

  const setDemandSubmitButton = (mode = "add") => {
    if (!demandSubmitButton) return;
    const isEdit = mode === "edit";
    demandSubmitButton.textContent = isEdit ? "Сохранить" : "Добавить";
    setDemandFormTitle(isEdit ? "edit" : "add");
  };

  const resetDemandForm = () => {
    if (demandFormEl) {
      demandFormEl.reset();
    }
    demandState.editingId = null;
    setDemandSubmitButton("add");
    setDemandPriorityValue("green");
  };

  const startEditDemand = (entry) => {
    if (!entry) return;
    demandState.editingId = entry.id;
    setDemandFormVisibility(true);
    if (demandItemInput) demandItemInput.value = entry.item;
    if (demandQuantityInput) demandQuantityInput.value = String(entry.quantity);
    if (demandUnitInput) demandUnitInput.value = entry.unit;
    if (demandObjectInput) demandObjectInput.value = entry.object;
    if (demandDateInput) demandDateInput.value = entry.needDate ?? "";
    if (demandNoteInput) demandNoteInput.value = entry.note ?? "";
    setDemandPriorityValue(entry.priority ?? "green");
    setDemandSubmitButton("edit");
    demandItemInput?.focus();
  };

  const updateDemandSummary = () => {
    const openCount = demandState.items.filter((item) => item.status === "open").length;
    if (demandOpenCountEl) demandOpenCountEl.textContent = String(openCount);
  };

  const applyDemandFilters = () => {
    const query = demandState.filters.search.trim().toLowerCase();
    const objectFilter = demandState.filters.object;
    const userFilter = demandState.filters.user;
    const statusFilter = demandState.filters.status;
    const viewFilter = demandState.filters.view;
    const currentUserKey = buildUserKey(user);
    demandState.filtered = demandState.items.filter((item) => {
      if (item.status !== "open") return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (objectFilter && item.object !== objectFilter) return false;
      if (userFilter && item.requestedBy !== userFilter) return false;
      if (viewFilter === "mine" && item.requestedById !== currentUserKey) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        item.item,
        item.object,
        item.requestedBy,
        item.note,
        item.needDate,
        demandPriorityLabels[normalizeDemandPriority(item.priority ?? "")],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
    demandState.filtered.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "open" ? -1 : 1;
      }
      return String(b.createdAt).localeCompare(String(a.createdAt), "ru");
    });
  };

  const renderDemandFilterOptions = () => {
    if (demandFilterObjectEl) {
      const options = Array.from(
        new Set([
          ...demandState.objects,
          ...demandState.items.map((item) => item.object),
        ])
      ).filter(Boolean);
      demandFilterObjectEl.innerHTML = `
        <option value="">Все объекты</option>
        ${options
          .sort((a, b) => a.localeCompare(b, "ru"))
          .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
          .join("")}
      `;
      demandFilterObjectEl.value = demandState.filters.object;
    }
    if (demandFilterUserEl) {
      const options = Array.from(
        new Set([
          ...demandState.users.map((item) => item.name),
          ...demandState.items.map((item) => item.requestedBy),
        ])
      ).filter(Boolean);
      demandFilterUserEl.innerHTML = `
        <option value="">Все пользователи</option>
        ${options
          .sort((a, b) => a.localeCompare(b, "ru"))
          .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
          .join("")}
      `;
      demandFilterUserEl.value = demandState.filters.user;
    }
  };

  const setDemandContentView = (view = "list") => {
    demandState.mapView = view === "map" ? "map" : "list";
    const isMap = demandState.mapView === "map";
    demandListEl?.classList.toggle("is-hidden", isMap);
    demandMapEl?.classList.toggle("is-hidden", !isMap);
    demandEmptyEl?.classList.toggle("is-hidden", isMap || demandState.filtered.length > 0);
    if (demandMapToggleEl) {
      demandMapToggleEl.classList.toggle("is-active", isMap);
      demandMapToggleEl.setAttribute("aria-pressed", String(isMap));
      demandMapToggleEl.setAttribute(
        "aria-label",
        isMap ? "Показать список заявок" : "Показать карту заявок"
      );
      demandMapToggleEl.title = isMap ? "Показать список" : "Показать карту";
    }
  };

  const getDemandObjectCoordinates = (objectName, normalizedCoordinates) => {
    const safeName = String(objectName ?? "").trim();
    if (!safeName) return null;
    const direct = demandState.objectCoordinates.get(safeName);
    if (direct) return direct;
    return normalizedCoordinates.get(safeName.toLowerCase()) ?? null;
  };

  const buildDemandMapPoints = () => {
    const normalizedCoordinates = new Map(
      Array.from(demandState.objectCoordinates.entries()).map(([name, coordinates]) => [
        String(name ?? "").trim().toLowerCase(),
        coordinates,
      ])
    );
    const grouped = new Map();
    demandState.items.forEach((item) => {
      if (item.status !== "open") return;
      const objectName = String(item.object ?? "").trim();
      if (!objectName) return;
      const coordinates = getDemandObjectCoordinates(objectName, normalizedCoordinates);
      if (!coordinates) return;
      if (!grouped.has(objectName)) {
        grouped.set(objectName, {
          name: objectName,
          coordinates,
          items: [],
        });
      }
      grouped.get(objectName).items.push(item);
    });
    return Array.from(grouped.values())
      .map((entry) => ({
        ...entry,
        count: entry.items.length,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"));
  };

  const demandMapState = {
    activated: false,
    interactive: false,
    points: [],
    map: null,
    markers: [],
  };

  const demandRequestMapState = {
    map: null,
    markers: [],
    selectedDemandId: "",
  };

  const clearDemandRequestMapMarkers = () => {
    if (!demandRequestMapState.map) return;
    demandRequestMapState.markers.forEach((marker) => {
      demandRequestMapState.map?.geoObjects.remove(marker);
    });
    demandRequestMapState.markers = [];
  };

  const getDemandRequestMatchQuery = (demandItem) =>
    String(demandItem?.item ?? "").trim().toLowerCase();

  const buildDemandRequestMapData = (demandItem) => {
    if (!demandItem) return null;
    const normalizedCoordinates = new Map(
      Array.from(demandState.objectCoordinates.entries()).map(([name, coordinates]) => [
        String(name ?? "").trim().toLowerCase(),
        coordinates,
      ])
    );
    const targetObjectName = String(demandItem.object ?? "").trim();
    const targetCoordinates = getDemandObjectCoordinates(
      targetObjectName,
      normalizedCoordinates
    );
    const query = getDemandRequestMatchQuery(demandItem);

    const grouped = new Map();
    demandState.toolsCatalog.forEach((tool) => {
      const toolName = String(tool?.name ?? "").trim().toLowerCase();
      if (!toolName || !query || !toolName.includes(query)) return;
      const objectName = String(tool?.object ?? "").trim();
      if (!objectName) return;
      const coordinates = getDemandObjectCoordinates(objectName, normalizedCoordinates);
      if (!coordinates) return;
      if (!grouped.has(objectName)) {
        grouped.set(objectName, {
          name: objectName,
          coordinates,
          count: 0,
          tools: [],
        });
      }
      const responsible = String(
        tool?.responsible ?? tool?.["Ответственный"] ?? ""
      ).trim();
      grouped.get(objectName).count += 1;
      grouped.get(objectName).tools.push({
        name: String(tool?.name ?? "").trim(),
        responsible: responsible || "Без ответственного",
      });
    });

    const relatedPoints = Array.from(grouped.values())
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"));

    const targetPoint =
      targetObjectName && targetCoordinates
        ? {
            name: targetObjectName,
            coordinates: targetCoordinates,
          }
        : null;

    return {
      query,
      targetPoint,
      relatedPoints,
    };
  };

  const renderDemandRequestMap = (data) => {
    if (!demandRequestMapState.map || !window.ymaps) return;
    clearDemandRequestMapMarkers();
    if (!data) {
      demandRequestMapState.map.setCenter([53.9, 27.56], 10, { duration: 240 });
      return;
    }

    const boundsPoints = [];
    const pushBoundsPoint = (point) => {
      const lat = Number(point?.coordinates?.lat);
      const lng = Number(point?.coordinates?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      boundsPoints.push([lat, lng]);
      return [lat, lng];
    };

    const targetCoordinates = data.targetPoint ? pushBoundsPoint(data.targetPoint) : null;

    data.relatedPoints.forEach((point) => {
      const coordinates = pushBoundsPoint(point);
      if (!coordinates) return;
      const caption = `${point.name} · ${point.count} шт.`;
      const marker = new window.ymaps.Placemark(
        coordinates,
        {
          hintContent: caption,
          iconCaption: caption,
          balloonContentBody: buildDemandRequestMapBalloonContent(point),
        },
        {
          preset: "islands#blueCircleDotIconWithCaption",
        }
      );
      demandRequestMapState.map.geoObjects.add(marker);
      demandRequestMapState.markers.push(marker);
    });

    if (targetCoordinates) {
      const targetMarker = new window.ymaps.Placemark(
        targetCoordinates,
        {
          hintContent: `${data.targetPoint.name} · объект заявки`,
          iconCaption: "Объект заявки",
          balloonContentBody: "Объект, на который оформлена заявка",
        },
        {
          preset: "islands#redCircleDotIconWithCaption",
        }
      );
      demandRequestMapState.map.geoObjects.add(targetMarker);
      demandRequestMapState.markers.push(targetMarker);
    }

    if (!boundsPoints.length) {
      demandRequestMapState.map.setCenter([53.9, 27.56], 10, { duration: 240 });
      return;
    }

    if (boundsPoints.length === 1) {
      demandRequestMapState.map.setCenter(boundsPoints[0], 15, { duration: 260 });
      return;
    }

    demandRequestMapState.map.setBounds(boundsPoints, {
      checkZoomRange: true,
      zoomMargin: [34, 34, 34, 34],
      duration: 260,
    });
  };

  const ensureDemandRequestMapReady = async () => {
    if (!demandRequestMapCanvasEl || !demandRequestMapLayerEl) return;

    await ensureYandexMapsLoaded();

    if (!demandRequestMapState.map) {
      demandRequestMapLayerEl.innerHTML = "";
      demandRequestMapState.map = new window.ymaps.Map(
        demandRequestMapLayerEl,
        {
          center: [53.9, 27.56],
          zoom: 10,
          controls: ["zoomControl", "geolocationControl"],
        },
        {
          suppressMapOpenBlock: true,
        }
      );
      window.setTimeout(() => {
        demandRequestMapState.map?.container?.fitToViewport?.();
      }, 80);
    }

    ["drag", "scrollZoom", "multiTouch", "dblClickZoom"].forEach((behaviorName) => {
      demandRequestMapState.map?.behaviors?.enable?.(behaviorName);
    });
    if (!demandRequestMapState.map.controls.get("zoomControl")) {
      demandRequestMapState.map.controls.add("zoomControl");
    }
    if (!demandRequestMapState.map.controls.get("geolocationControl")) {
      demandRequestMapState.map.controls.add("geolocationControl");
    }
  };

  const buildDemandRequestMapBalloonContent = (point) => {
    const tools = Array.isArray(point?.tools) ? point.tools : [];
    const groupedByResponsible = new Map();

    tools.forEach((tool) => {
      const responsible = String(tool?.responsible ?? "").trim() || "Без ответственного";
      if (!groupedByResponsible.has(responsible)) {
        groupedByResponsible.set(responsible, []);
      }
      groupedByResponsible.get(responsible).push(String(tool?.name ?? "").trim() || "—");
    });

    const groupsMarkup = Array.from(groupedByResponsible.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "ru"))
      .map(([responsible, names]) => {
        const byName = new Map();
        names.forEach((name) => {
          byName.set(name, (byName.get(name) ?? 0) + 1);
        });
        const toolsText = Array.from(byName.entries())
          .sort((a, b) => a[0].localeCompare(b[0], "ru"))
          .map(([name, count]) => (count > 1 ? `${escapeHtml(name)} (${count})` : escapeHtml(name)))
          .join(", ");
        return `
          <div class="demand-request-popup__group">
            <div class="demand-request-popup__responsible">${escapeHtml(responsible)}</div>
            <div class="demand-request-popup__tools">${toolsText || "—"}</div>
          </div>
        `;
      })
      .join("");

    return `
      <div class="demand-request-popup">
        <div class="demand-request-popup__title">${escapeHtml(point?.name || "Объект")}</div>
        <div class="demand-request-popup__subtitle">Интересующие инструменты: ${escapeHtml(
          String(point?.count ?? tools.length)
        )}</div>
        <div class="demand-request-popup__list">${groupsMarkup || "<div class=\"demand-request-popup__empty\">Инструменты не найдены</div>"}</div>
      </div>
    `;
  };

  const buildDemandMapBalloonContent = (point) => {
    const lines = point.items
      .slice(0, 8)
      .map((entry) => {
        const requestedBy = escapeHtml(entry.requestedBy || "Без автора");
        const item = escapeHtml(entry.item || "—");
        const quantity = escapeHtml(String(entry.quantity ?? ""));
        const unit = escapeHtml(String(entry.unit ?? ""));
        return `<div class="demand-map-popup__item">Кому: ${requestedBy} · Нужно: ${item} · Кол-во: ${quantity} ${unit}</div>`;
      })
      .join("");
    const moreLine =
      point.items.length > 8
        ? `<div class="demand-map-popup__more">Ещё ${point.items.length - 8} заявок...</div>`
        : "";
    return `
      <div class="demand-map-popup">
        <div class="demand-map-popup__title">${escapeHtml(point.name)}</div>
        <div class="demand-map-popup__list">${lines}${moreLine}</div>
      </div>
    `;
  };

  const syncInteractiveDemandMap = ({ fitViewport = true } = {}) => {
    if (!demandMapState.map || !window.ymaps) return;
    const safePoints = Array.isArray(demandMapState.points) ? demandMapState.points : [];

    demandMapState.markers.forEach((marker) => {
      demandMapState.map?.geoObjects.remove(marker);
    });
    demandMapState.markers = [];

    if (!safePoints.length) {
      if (fitViewport) {
        demandMapState.map.setCenter([53.9, 27.56], 10, { duration: 240 });
      }
      return;
    }

    const bounds = safePoints
      .map((point) => {
        const lat = Number(point?.coordinates?.lat);
        const lng = Number(point?.coordinates?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return [lat, lng];
      })
      .filter(Boolean);

    if (fitViewport && bounds.length) {
      if (bounds.length === 1) {
        demandMapState.map.setCenter(bounds[0], 15, { duration: 260 });
      } else {
        demandMapState.map.setBounds(bounds, {
          checkZoomRange: true,
          zoomMargin: [34, 34, 34, 34],
          duration: 260,
        });
      }
    }

    safePoints.forEach((point) => {
      const lat = Number(point?.coordinates?.lat);
      const lng = Number(point?.coordinates?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const label = `${point.name} · ${point.count} заявок`;
      const marker = new window.ymaps.Placemark(
        [lat, lng],
        {
          balloonContentBody: buildDemandMapBalloonContent(point),
          hintContent: label,
          iconCaption: String(point.count),
        },
        {
          preset: "islands#blueCircleDotIconWithCaption",
        }
      );
      demandMapState.map.geoObjects.add(marker);
      demandMapState.markers.push(marker);
    });
  };

  const ensureDemandMapReady = async ({ interactive = false } = {}) => {
    if (!demandMapCanvasEl || !demandMapLayerEl) return;

    try {
      await ensureYandexMapsLoaded();
      demandMapState.activated = true;
      demandMapCanvasEl.classList.add("tools-map-canvas--map");
      demandMapPlaceholderEl?.classList.add("is-hidden");
      demandMapImageEl?.classList.add("is-hidden");

      if (!demandMapState.map) {
        demandMapLayerEl.innerHTML = "";
        demandMapState.map = new window.ymaps.Map(
          demandMapLayerEl,
          {
            center: [53.9, 27.56],
            zoom: 10,
            controls: ["zoomControl", "geolocationControl"],
          },
          {
            suppressMapOpenBlock: true,
          }
        );
        window.setTimeout(() => {
          demandMapState.map?.container?.fitToViewport?.();
        }, 80);
      }

      const interactiveBehaviors = ["drag", "scrollZoom", "multiTouch", "dblClickZoom"];
      demandMapState.interactive = Boolean(interactive);
      if (demandMapState.interactive) {
        demandMapCanvasEl.classList.add("tools-map-canvas--interactive");
        demandMapCanvasEl.classList.add("tools-map-canvas--interactive-live");
        demandMapCanvasEl.setAttribute(
          "aria-label",
          "Карта активна. Перемещайте карту и меняйте масштаб"
        );
        interactiveBehaviors.forEach((behaviorName) => {
          demandMapState.map?.behaviors?.enable?.(behaviorName);
        });
      } else {
        demandMapCanvasEl.classList.remove("tools-map-canvas--interactive");
        demandMapCanvasEl.classList.remove("tools-map-canvas--interactive-live");
        demandMapCanvasEl.setAttribute(
          "aria-label",
          "Карта предварительного просмотра. Нажмите, чтобы включить перемещение"
        );
        interactiveBehaviors.forEach((behaviorName) => {
          demandMapState.map?.behaviors?.disable?.(behaviorName);
        });
      }

      syncInteractiveDemandMap();
    } catch (error) {
      console.warn("Не удалось загрузить карту потребности.", error);
      demandMapCanvasEl.setAttribute(
        "aria-label",
        "Не удалось загрузить интерактивную карту, попробуйте позже"
      );
    }
  };

  const awakenDemandMap = async () => {
    if (!demandMapCanvasEl) return;
    await ensureDemandMapReady({ interactive: true });
    demandMapCanvasEl.classList.remove("tools-map-canvas--alive");
    window.requestAnimationFrame(() => {
      demandMapCanvasEl.classList.add("tools-map-canvas--alive");
      window.setTimeout(() => {
        demandMapCanvasEl.classList.remove("tools-map-canvas--alive");
      }, 720);
    });
  };

  const renderDemandMap = () => {
    if (!demandMapCanvasEl) return;
    const points = buildDemandMapPoints();
    demandMapState.points = points;

    if (!points.length) {
      demandMapPlaceholderEl?.classList.remove("is-hidden");
      demandMapCanvasEl.classList.remove("tools-map-canvas--map");
      if (demandMapImageEl) {
        demandMapImageEl.classList.add("is-hidden");
        demandMapImageEl.removeAttribute("src");
      }
      if (demandMapState.activated) {
        syncInteractiveDemandMap({ fitViewport: true });
      }
      return;
    }

    demandMapPlaceholderEl?.classList.add("is-hidden");
    demandMapCanvasEl.classList.add("tools-map-canvas--map");
    const bounds = buildToolsMapBounds(points);
    if (demandMapImageEl) {
      demandMapImageEl.src = buildYandexStaticMapUrl(points, bounds);
      demandMapImageEl.classList.remove("is-hidden");
    }

    void ensureDemandMapReady();
  };

  const renderDemandList = () => {
    if (!demandListEl) return;
    applyDemandFilters();
    demandListEl.innerHTML = "";
    demandState.filtered.forEach((item) => {
      const card = document.createElement("div");
      const priorityKey = normalizeDemandPriority(item.priority ?? "green");
      card.className = `demand-card demand-card--priority-${priorityKey}`;
      if (item.status === "done") {
        card.classList.add("is-done");
      }
      const content = document.createElement("div");
      content.className = "demand-card__content";
      const title = document.createElement("div");
      title.className = "demand-card__title";
      const titleName = document.createElement("span");
      titleName.className = "demand-card__name";
      titleName.textContent = item.item;
      const titleQuantity = document.createElement("span");
      titleQuantity.className = "demand-card__quantity";
      titleQuantity.textContent = `${item.quantity} ${item.unit}`;
      title.append(titleName, titleQuantity);

      const meta = document.createElement("div");
      meta.className = "demand-card__meta";
      const needDateLabel = formatDemandNeedDate(item.needDate);
      const needDateText = needDateLabel || "не указано";
      const createdLabel = formatDemandCreatedLabel(item.createdAt);
      const metaItems = [
        { label: "Объект", value: item.object || "—" },
        { label: "Ответственный", value: item.requestedBy || "Без автора" },
        { label: "Нужно", value: needDateText },
        { label: "Создано", value: createdLabel },
      ];
      metaItems.forEach(({ label, value }) => {
        const line = document.createElement("div");
        line.className = "demand-card__meta-line";
        line.textContent = `${label}: ${value}`;
        meta.appendChild(line);
      });

      const note = document.createElement("div");
      note.className = "demand-card__note";
      note.textContent = item.note || "";

      const actions = document.createElement("div");
      actions.className = "demand-card__actions";
      const toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = "demand-action demand-action--primary";
      toggleButton.dataset.demandAction = "toggle";
      toggleButton.dataset.demandId = item.id;
      toggleButton.innerHTML =
        item.status === "open" ? "✓" : "↺";
      toggleButton.setAttribute(
        "aria-label",
        item.status === "open" ? "Закрыть заявку" : "Вернуть в работу"
      );
      toggleButton.title =
        item.status === "open" ? "Закрыть заявку" : "Вернуть в работу";
      const requestMapButton = document.createElement("button");
      requestMapButton.type = "button";
      requestMapButton.className = "demand-action";
      requestMapButton.dataset.demandAction = "map";
      requestMapButton.dataset.demandId = item.id;
      requestMapButton.innerHTML = "🗺️";
      requestMapButton.setAttribute("aria-label", "Открыть карту заявки");
      requestMapButton.title = "Открыть карту заявки";
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "demand-action";
      editButton.dataset.demandAction = "edit";
      editButton.dataset.demandId = item.id;
      editButton.innerHTML = "✎";
      editButton.setAttribute("aria-label", "Изменить заявку");
      editButton.title = "Изменить заявку";
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "demand-action demand-action--danger";
      deleteButton.dataset.demandAction = "delete";
      deleteButton.dataset.demandId = item.id;
      deleteButton.innerHTML = "✕";
      deleteButton.setAttribute("aria-label", "Удалить заявку");
      deleteButton.title = "Удалить заявку";
      actions.append(toggleButton, requestMapButton, editButton, deleteButton);

      if (!note.textContent) {
        content.append(title, meta);
        card.append(content, actions);
      } else {
        content.append(title, meta, note);
        card.append(content, actions);
      }
      demandListEl.appendChild(card);
    });
    updateDemandSummary();
    setDemandContentView(demandState.mapView);
    renderDemandMap();
  };

  const loadDemandReferences = async () => {
    try {
      const [objectsRaw, usersData, orgsData, toolsRaw] = await Promise.all([
        loadJson(objectsPath).catch(() => []),
        loadJson(usersFilePath).catch(() => ({ users: [] })),
        loadJson(orgFilePath).catch(() => ({ organizations: [] })),
        loadJson(toolsDatabasePath).catch(() => []),
      ]);
      const objectEntries = normalizeObjectsData(objectsRaw);
      demandState.objects = objectEntries
        .map((item) => item.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "ru"));
      demandState.objectCoordinates = new Map(
        objectEntries
          .filter((item) => item.name && item.coordinates)
          .map((item) => [item.name, item.coordinates])
      );
      const toolsList = normalizeToolsData(toolsRaw);
      const toolSuggestions = new Set();
      demandState.toolsCatalog = toolsList
        .map((tool) => {
          if (!tool || typeof tool !== "object") return null;
          const name = String(tool["Наименование"] ?? "").trim();
          const object = sanitizeObjectName(tool["Объект"] ?? tool.object ?? "");
          const responsible = String(
            tool["Ответственный"] ?? tool.responsible ?? tool.user ?? tool.owner ?? ""
          ).trim();
          if (name) toolSuggestions.add(name);
          if (!name || !object) return null;
          return { name, object, responsible };
        })
        .filter(Boolean);
      demandState.toolSuggestions = Array.from(toolSuggestions).sort((a, b) =>
        a.localeCompare(b, "ru")
      );
      const organizationName =
        context.orgFullName ??
        context.orgShortName ??
        context.orgFolderName ??
        currentUser?.organization ??
        "";
      const orgRecord = findOrganizationRecord(orgsData, organizationName);
      const orgNames = orgRecord ? getOrgNames(orgRecord) : [organizationName];
      const normalizedOrgNames = orgNames
        .map((name) => String(name ?? "").trim())
        .filter(Boolean);
      demandState.users = (usersData.users ?? [])
        .filter((entry) =>
          normalizedOrgNames.includes(String(entry?.organization ?? "").trim())
        )
        .map((entry) => ({
          name: String(entry?.full_name ?? "").trim(),
          role: String(entry?.role ?? "").trim(),
        }))
        .filter((entry) => entry.name)
        .sort((a, b) => a.name.localeCompare(b.name, "ru"));
      renderDemandFilterOptions();
    } catch (error) {
      console.warn("Не удалось загрузить справочники потребностей.", error);
    }
  };

  const loadDemandItems = async () => {
    try {
      const raw = await loadJson(demandPath);
      demandState.items = normalizeDemandData(raw);
    } catch (error) {
      demandState.items = [];
    }
    renderDemandFilterOptions();
    renderDemandList();
  };

  const saveDemandItems = async () => {
    if (demandState.isSaving) return;
    demandState.isSaving = true;
    setDemandMessage("Сохраняем изменения...");
    try {
      await saveJson(demandPath, demandState.items, { user });
      setDemandMessage("Готово! Заявки обновлены.");
    } catch (error) {
      console.error(error);
      setDemandMessage("Не удалось сохранить. Проверьте сервер.");
    } finally {
      demandState.isSaving = false;
    }
  };

  const openDemandModal = async () => {
    if (!demandModalEl) return;
    if (demandSubtitleEl) {
      demandSubtitleEl.textContent =
        context.orgFullName ?? context.orgShortName ?? context.orgFolderName ?? "";
    }
    setDemandFormVisibility(false);
    setDemandFiltersVisibility(false);
    setDemandContentView("list");
    demandModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    resetDemandForm();
    await loadDemandReferences();
    await loadDemandItems();
  };

  const closeDemandModal = () => {
    if (!demandModalEl) return;
    demandModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
    setDemandFormVisibility(false);
    setDemandFiltersVisibility(false);
    setDemandContentView("list");
    closeDemandRequestMapModal();
    resetDemandForm();
    setDemandMessage("");
  };

  const closeDemandRequestMapModal = () => {
    if (!demandRequestMapModalEl) return;
    demandRequestMapModalEl.classList.add("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const openDemandRequestMapModal = async (demandItem) => {
    if (!demandRequestMapModalEl || !demandItem) return;
    demandRequestMapState.selectedDemandId = demandItem.id;

    const mapData = buildDemandRequestMapData(demandItem);
    if (demandRequestMapTitleEl) {
      demandRequestMapTitleEl.textContent = `Карта: ${demandItem.item || "заявка"}`;
    }
    if (demandRequestMapSubtitleEl) {
      const relatedCount = mapData?.relatedPoints?.length ?? 0;
      const baseText = mapData?.query
        ? `Совпадения по "${mapData.query}" на ${relatedCount} объектах`
        : "Нет названия инструмента для поиска";
      demandRequestMapSubtitleEl.textContent = mapData?.targetPoint
        ? `${baseText}. Красная метка — объект заявки.`
        : `${baseText}. Объект заявки без координат.`;
    }

    demandRequestMapModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";

    try {
      await ensureDemandRequestMapReady();
      renderDemandRequestMap(mapData);
      window.setTimeout(() => {
        demandRequestMapState.map?.container?.fitToViewport?.();
      }, 120);
    } catch (error) {
      console.warn("Не удалось открыть карту заявки.", error);
      if (demandRequestMapSubtitleEl) {
        demandRequestMapSubtitleEl.textContent =
          "Не удалось загрузить карту. Попробуйте позже.";
      }
    }
  };

  demandBackdropEl?.addEventListener("click", closeDemandModal);
  demandCloseButton?.addEventListener("click", closeDemandModal);
  demandRequestMapBackdropEl?.addEventListener("click", closeDemandRequestMapModal);
  demandRequestMapCloseButton?.addEventListener("click", closeDemandRequestMapModal);
  demandRequestMapModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDemandRequestMapModal();
    }
  });
  demandFormBackdropEl?.addEventListener("click", () => {
    resetDemandForm();
    setDemandFormVisibility(false);
    setDemandMessage("");
  });
  demandFormCloseButton?.addEventListener("click", () => {
    resetDemandForm();
    setDemandFormVisibility(false);
    setDemandMessage("");
  });
  demandToggleButton?.addEventListener("click", () => {
    resetDemandForm();
    setDemandMessage("");
    setDemandFormVisibility(true);
  });
  demandFiltersToggle?.addEventListener("click", () => {
    if (!demandFiltersPanel) return;
    const isOpen = !demandFiltersPanel.classList.contains("is-hidden");
    setDemandFiltersVisibility(!isOpen);
  });

  demandCancelButton?.addEventListener("click", () => {
    resetDemandForm();
    setDemandFormVisibility(false);
    setDemandMessage("");
  });

  demandFormEl?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!demandFormEl) return;
    const title = sanitizeDemandLabel(demandItemInput?.value ?? "");
    const objectRaw = sanitizeDemandLabel(demandObjectInput?.value ?? "");
    const object = findOptionMatch(objectRaw, demandState.objects);
    const quantity = normalizeNumber(demandQuantityInput?.value ?? 0, 0);
    const unit = sanitizeDemandLabel(demandUnitInput?.value ?? "шт") || "шт";
    const note = sanitizeDemandLabel(demandNoteInput?.value ?? "");
    const needDate = normalizeDemandNeedDate(demandDateInput?.value ?? "");
    const priority = getSelectedDemandPriority();
    if (!title || quantity <= 0) {
      setDemandMessage("Заполните название и количество.");
      return;
    }
    if (!needDate) {
      setDemandMessage("Укажите дату, когда нужно.");
      return;
    }
    if (!object) {
      setDemandMessage(
        demandState.objects.length
          ? "Выберите объект из списка."
          : "В организации нет объектов."
      );
      return;
    }
    const userKey = buildUserKey(user);
    const userName = currentUser?.full_name ?? currentUser?.fullName ?? "Пользователь";
    const now = getToday();
    if (demandState.editingId) {
      demandState.items = demandState.items.map((item) =>
        item.id === demandState.editingId
          ? {
              ...item,
              item: title,
              object,
              quantity,
              unit,
              note,
              priority,
              needDate,
              updatedAt: now,
            }
          : item
      );
    } else {
      demandState.items.unshift({
        id: buildDemandId(),
        item: title,
        object,
        quantity,
        unit,
        note,
        priority,
        status: "open",
        requestedBy: userName,
        requestedById: userKey,
        needDate,
        createdAt: now,
        updatedAt: "",
      });
    }
    resetDemandForm();
    setDemandFormVisibility(false);
    await saveDemandItems();
    renderDemandFilterOptions();
    renderDemandList();
  });

  demandSearchInput?.addEventListener("input", (event) => {
    demandState.filters.search = String(event.target.value ?? "");
    renderDemandList();
  });

  demandFilterObjectEl?.addEventListener("change", (event) => {
    demandState.filters.object = String(event.target.value ?? "");
    renderDemandList();
  });

  demandFilterUserEl?.addEventListener("change", (event) => {
    demandState.filters.user = String(event.target.value ?? "");
    renderDemandList();
  });

  demandFilterStatusEl?.addEventListener("change", (event) => {
    demandState.filters.status = String(event.target.value ?? "open");
    renderDemandList();
  });

  demandFilterViewEl?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-demand-view]");
    if (!button) return;
    const view = button.dataset.demandView;
    if (!view) return;
    demandState.filters.view = view;
    demandFilterViewEl
      .querySelectorAll("[data-demand-view]")
      .forEach((element) =>
        element.classList.toggle("is-active", element === button)
      );
    renderDemandList();
  });

  demandMapToggleEl?.addEventListener("click", () => {
    const nextView = demandState.mapView === "map" ? "list" : "map";
    setDemandContentView(nextView);
    if (nextView === "map") {
      renderDemandMap();
      void awakenDemandMap();
    }
  });

  if (demandMapCanvasEl) {
    demandMapCanvasEl.addEventListener("click", () => {
      void awakenDemandMap();
    });
    demandMapCanvasEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      void awakenDemandMap();
    });
  }

  demandListEl?.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-demand-action]");
    if (!action) return;
    const id = action.dataset.demandId;
    const type = action.dataset.demandAction;
    if (!id || !type) return;
    const entry = demandState.items.find((item) => item.id === id);
    if (!entry) return;
    if (type === "edit") {
      startEditDemand(entry);
      return;
    }
    if (type === "toggle") {
      const nextStatus = entry.status === "open" ? "done" : "open";
      demandState.items = demandState.items.map((item) =>
        item.id === id
          ? { ...item, status: nextStatus, updatedAt: getToday() }
          : item
      );
      await saveDemandItems();
      renderDemandList();
      return;
    }
    if (type === "delete") {
      const confirmDelete = window.confirm("Удалить эту потребность?");
      if (!confirmDelete) return;
      demandState.items = demandState.items.filter((item) => item.id !== id);
      await saveDemandItems();
      renderDemandList();
      return;
    }
    if (type === "map") {
      await openDemandRequestMapModal(entry);
    }
  });

  const setToolsSubtitle = (text) => {
    if (toolsSubtitleEl) {
      toolsSubtitleEl.textContent = text;
    }
  };

  const setToolsZoneSubtitle = (text = "") => {
    if (!toolsZoneSubtitleEl) return;
    toolsZoneSubtitleEl.textContent = text;
    toolsZoneSubtitleEl.classList.toggle("is-hidden", !text);
  };

  const setToolsTitle = (text) => {
    if (toolsTitleEl) {
      toolsTitleEl.textContent = text;
    }
    if (toolsPanelEl) {
      toolsPanelEl.setAttribute("aria-label", text);
    }
  };

  const updateToolsReplacementPendingLinkVisibility = () => {
    if (!toolsOpenReplacementPendingButton) return;
    const shouldShow =
      toolsState.mode === "replacement" && Boolean(toolsState.activeReplacementResponsible);
    toolsOpenReplacementPendingButton.classList.toggle("is-hidden", !shouldShow);
  };

  const setToolsResponsibleFilterVisibility = (isVisible) => {
    toolsResponsibleFilterEls.forEach((element) => {
      element.classList.toggle("is-hidden", !isVisible);
    });
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

  const setToolsCancelMoveMessage = (text = "", type = "info") => {
    if (!toolsCancelMoveMessageEl) return;
    toolsCancelMoveMessageEl.textContent = text;
    toolsCancelMoveMessageEl.classList.remove("is-error", "is-success", "is-info");
    toolsCancelMoveMessageEl.classList.add(`is-${type}`);
  };

  const setToolsEditMessage = (text = "", type = "") => {
    if (!toolsEditMessageEl) return;
    toolsEditMessageEl.textContent = text;
    toolsEditMessageEl.classList.remove("is-error", "is-success", "is-info");
    if (type) {
      toolsEditMessageEl.classList.add(`is-${type}`);
    }
  };

  const buildToolsEditMatcher = (tool) => {
    const number = normalizeToolNumberValue(tool?.["Номер"] ?? "");
    const accounting = String(tool?.["Бух.номер"] ?? "").trim();
    return (entry) => {
      if (number) {
        const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
        if (entryNumber === number) return true;
      }
      if (accounting) {
        const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
        if (entryAccounting === accounting) return true;
      }
      return false;
    };
  };

  const updateToolsEditPhotoCount = (count) => {
    if (toolsEditPhotoCountEl) {
      toolsEditPhotoCountEl.textContent = String(count ?? 0);
    }
    if (toolsEditRemovePhotoButton) {
      toolsEditRemovePhotoButton.disabled = !count;
    }
  };

  const resetToolsCancelMoveState = () => {
    toolsCancelMoveState.move = null;
    toolsCancelMoveState.moveIndex = null;
    toolsCancelMoveState.tool = null;
    toolsCancelMoveState.movesPayload = null;
    toolsCancelMoveState.isSaving = false;
    if (toolsCancelMoveConfirmButton) {
      toolsCancelMoveConfirmButton.disabled = true;
    }
  };

  const buildToolsCancelMoveInfo = (tool, move) => {
    const nameParts = [
      String(tool?.["Наименование"] ?? "").trim(),
      String(tool?.["Производитель"] ?? "").trim(),
      String(tool?.["Модель"] ?? "").trim(),
    ].filter(Boolean);
    const title = nameParts.length ? nameParts.join(" ") : "—";
    const number =
      String(move?.["Номер"] ?? "").trim() ||
      String(move?.["Бух.номер"] ?? "").trim() ||
      resolveToolNumberValue(tool) ||
      "—";
    const responsible = String(move?.["Принял"] ?? "").trim() || "—";
    const targetObject = String(move?.["Новый объект"] ?? "").trim() || "—";
    const moveDate = String(move?.["Дата перемещения"] ?? "").trim() || "—";
    return [
      `Инструмент: ${title}`,
      `Номер: ${number}`,
      `Новый ответственный: ${responsible}`,
      `Новый объект: ${targetObject}`,
      `Дата перемещения: ${moveDate}`,
    ].join("\n");
  };

  const isToolSelectableForMove = (tool) => {
    if (toolsState.mode === "base" || toolsState.mode === "search")
      return false;
    if (!tool) return false;
    if (tool.__pendingMove) return false;
    if (toolsState.mode === "move-other") return true;
    const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
    const hasPhoto = Number.isFinite(photoCount) && photoCount > 0;
    return hasPhoto;
  };

  const selectAllToolsForMove = () => {
    if (toolsState.mode === "base" || toolsState.mode === "search") return;
    const selectableIds = toolsState.filtered
      .filter((tool) => isToolSelectableForMove(tool))
      .map((tool) => String(tool?.__selectionId ?? "").trim())
      .filter(Boolean);
    if (!selectableIds.length) return;
    toolsState.isSelecting = true;
    const allAlreadySelected = selectableIds.every((id) =>
      toolsState.selectedIds.has(id)
    );
    if (allAlreadySelected) {
      selectableIds.forEach((id) => toolsState.selectedIds.delete(id));
    } else {
      selectableIds.forEach((id) => toolsState.selectedIds.add(id));
    }
    updateToolsSelectionUi();
    renderToolsList();
  };

  const updateToolsSelectionUi = () => {
    if (toolsState.mode === "base" || toolsState.mode === "search") {
      toolsState.isSelecting = false;
      toolsState.selectedIds.clear();
      if (toolsMoveButtonEl) {
        toolsMoveButtonEl.disabled = true;
      }
      if (toolsSelectionCancelButtonEl) {
        toolsSelectionCancelButtonEl.disabled = true;
      }
      if (toolsSelectionSelectAllButtonEl) {
        toolsSelectionSelectAllButtonEl.disabled = true;
        toolsSelectionSelectAllButtonEl.classList.remove("is-active");
        toolsSelectionSelectAllButtonEl.setAttribute("aria-pressed", "false");
      }
      if (toolsSelectionCountEl) {
        toolsSelectionCountEl.classList.add("is-hidden");
      }
      if (toolsModalEl) {
        toolsModalEl.classList.remove("tools-modal--selecting");
      }
      return;
    }
    const count = toolsState.selectedIds.size;
    if (toolsMoveButtonEl) {
      toolsMoveButtonEl.disabled = count === 0;
    }
    if (toolsSelectionCancelButtonEl) {
      toolsSelectionCancelButtonEl.disabled = false;
    }
    if (toolsSelectionSelectAllButtonEl) {
      const selectableIds = toolsState.filtered
        .filter((tool) => isToolSelectableForMove(tool))
        .map((tool) => String(tool?.__selectionId ?? "").trim())
        .filter(Boolean);
      const selectableCount = selectableIds.length;
      toolsSelectionSelectAllButtonEl.disabled = selectableCount === 0;
      const allSelected =
        selectableCount > 0 &&
        selectableIds.every((id) => toolsState.selectedIds.has(id));
      toolsSelectionSelectAllButtonEl.classList.toggle("is-active", allSelected);
      toolsSelectionSelectAllButtonEl.setAttribute("aria-pressed", allSelected ? "true" : "false");
    }
    if (toolsSelectionCountEl) {
      toolsSelectionCountEl.textContent = `Выбрано: ${count}`;
      toolsSelectionCountEl.classList.toggle("is-hidden", !toolsState.isSelecting);
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

  const resolveToolStatusTone = (tool) => {
    const status = String(tool?.["Статус"] ?? "").trim().toLowerCase();
    if (status === "сломан") return "broken";
    if (status === "в ремонте") return "repair";
    if (status === "на списание") return "writeoff";
    return "";
  };

  const pluralizeDaysValue = (count) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return "день";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
    return "дней";
  };

  const formatDaysValue = (count) =>
    `${count} ${pluralizeDaysValue(Math.abs(count))}`;

  const formatInfoValue = (value) => {
    const raw = String(value ?? "").trim();
    return raw || "—";
  };

  const formatDateWithDays = ({ dateLabel, startDate, endDate }) => {
    if (!startDate) return formatInfoValue(dateLabel);
    const safeEndDate = endDate || new Date();
    const days = getDaysDifference(safeEndDate, startDate);
    const label = dateLabel || "—";
    return `${label} · ${formatDaysValue(days)}`;
  };

  const buildToolsInfoRow = (label, value) => {
    const row = document.createElement("div");
    row.className = "tools-info-item__row";
    const labelEl = document.createElement("span");
    labelEl.className = "tools-info-item__label";
    labelEl.textContent = label;
    const valueEl = document.createElement("span");
    valueEl.className = "tools-info-item__value";
    valueEl.textContent = formatInfoValue(value);
    row.append(labelEl, valueEl);
    return row;
  };

  const applyToolStatusClasses = (element, tool) => {
    if (!element) return;
    element.classList.toggle("tools-item--broken", tool.__statusTone === "broken");
    element.classList.toggle("tools-item--repair", tool.__statusTone === "repair");
    element.classList.toggle(
      "tools-item--writeoff",
      tool.__statusTone === "writeoff"
    );
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

  const resolveLateReplyFine = (move, fineConfig) => {
    if (!fineConfig?.enabled) return 0;
    const daysLimit = normalizeNumber(fineConfig.days, 0);
    const amount = normalizeNumber(fineConfig.amount, 0);
    if (!amount) return 0;
    const moveDate = parseDateValue(move?.["Дата перемещения"]);
    if (!moveDate) return 0;
    const diffDays = getDaysDifference(new Date(), moveDate);
    if (diffDays <= daysLimit) return 0;
    const chargedDays = Math.max(0, diffDays - 1);
    return chargedDays * amount;
  };

  const buildPendingToolsMap = async (orgFolder) => {
    const map = new Map();
    if (!orgFolder) return map;
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    try {
      const raw = await loadJson(toolsPath);
      const tools = Array.isArray(raw) ? raw : Array.isArray(raw?.tools) ? raw.tools : [];
      tools.forEach((tool) => {
        const number = String(tool?.["Номер"] ?? "").trim();
        const accounting = String(tool?.["Бух.номер"] ?? "").trim();
        if (number) map.set(`n:${number}`, tool);
        if (accounting) map.set(`a:${accounting}`, tool);
      });
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов для перемещений.", error);
    }
    return map;
  };

  const syncToolsViewButtons = () => {
    toolsViewButtons.forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.toolsView === toolsState.view
      );
    });
    if (toolsSearchMapViewButtonEl) {
      toolsSearchMapViewButtonEl.classList.toggle(
        "is-active",
        toolsState.view === "map"
      );
    }
  };

  const clearToolsList = () => {
    if (toolsListEl) {
      toolsListEl.innerHTML = "";
    }
  };

  const resolveToolsMapBounds = (mapBounds) => {
    if (!mapBounds) return null;
    if (Array.isArray(mapBounds) && mapBounds.length === 2) {
      const southWest = mapBounds[0];
      const northEast = mapBounds[1];
      if (
        Array.isArray(southWest) &&
        southWest.length === 2 &&
        Array.isArray(northEast) &&
        northEast.length === 2
      ) {
        return { southWest, northEast };
      }
    }
    const southWest = mapBounds.getSouthWest?.();
    const northEast = mapBounds.getNorthEast?.();
    if (!southWest || !northEast) return null;
    return { southWest, northEast };
  };

  const isToolsPointInBounds = (point, mapBounds) => {
    if (!point || !mapBounds) return false;
    const lat = Number(point?.coordinates?.lat);
    const lng = Number(point?.coordinates?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    const resolvedBounds = resolveToolsMapBounds(mapBounds);
    if (!resolvedBounds) return false;
    const { southWest, northEast } = resolvedBounds;
    return (
      lat >= southWest[0] &&
      lat <= northEast[0] &&
      lng >= southWest[1] &&
      lng <= northEast[1]
    );
  };

  const getVisibleToolsSearchPoints = (points) => {
    const safePoints = Array.isArray(points) ? points : [];
    const mapBounds = toolsSearchMapState.map?.getBounds?.();
    if (!mapBounds) {
      return safePoints;
    }
    return safePoints.filter((point) => isToolsPointInBounds(point, mapBounds));
  };

  const updateToolsZoneSubtitle = () => {
    if (toolsState.view !== "map" || !toolsSearchMapState.map) {
      setToolsZoneSubtitle("");
      return;
    }
    const visibleObjectNames = new Set(
      getVisibleToolsSearchPoints(toolsSearchMapState.points)
        .map((point) => String(point.name ?? "").trim().toLowerCase())
        .filter(Boolean)
    );

    if (!visibleObjectNames.size) {
      setToolsZoneSubtitle("В текущей зоне карты: 0 инструментов");
      return;
    }

    const visibleToolsCount = toolsState.filtered.reduce((sum, tool) => {
      const objectName = sanitizeObjectName(tool?.["Объект"] ?? tool?.object ?? "").toLowerCase();
      return visibleObjectNames.has(objectName) ? sum + 1 : sum;
    }, 0);

    setToolsZoneSubtitle(`В текущей зоне карты: ${visibleToolsCount} инструментов`);
  };

  const collectFilteredToolsByObject = (objectName) => {
    const targetObject = sanitizeObjectName(objectName ?? "").toLowerCase();
    if (!targetObject) return [];
    return (Array.isArray(toolsState.filtered) ? toolsState.filtered : []).filter(
      (tool) =>
        sanitizeObjectName(tool?.["Объект"] ?? tool?.object ?? "").toLowerCase() ===
        targetObject
    );
  };

  const buildToolsSearchMapPopupHtml = (point) => {
    const objectName = String(point?.name ?? "").trim();
    if (!objectName) {
      return "<div class='tools-map-popup'><div class='tools-map-popup__empty'>Нет данных по объекту.</div></div>";
    }

    const objectTools = collectFilteredToolsByObject(objectName);
    if (!objectTools.length) {
      return `<div class='tools-map-popup'><div class='tools-map-popup__empty'>На объекте нет инструментов с учётом текущего поиска и фильтров.</div></div>`;
    }

    const groups = new Map();
    objectTools.forEach((tool) => {
      const responsible =
        formatFullName(String(tool?.["Ответственный"] ?? "").trim()) || "Не назначен";
      if (!groups.has(responsible)) {
        groups.set(responsible, []);
      }
      groups.get(responsible).push(tool);
    });

    const groupsHtml = Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "ru"))
      .map(([responsible, tools]) => {
        const toolsHtml = tools
          .map((tool) => {
            const number = resolveToolNumberValue(tool) || "Без номера";
            const title = [
              String(tool?.["Наименование"] ?? "").trim(),
              String(tool?.["Производитель"] ?? "").trim(),
              String(tool?.["Модель"] ?? "").trim(),
            ]
              .filter(Boolean)
              .join(" ");
            const status = String(tool?.["Статус"] ?? "").trim();
            return `<li class='tools-map-popup__item'>
              <span class='tools-map-popup__item-number'>${escapeHtml(number)}</span>
              <span class='tools-map-popup__item-text'>${escapeHtml(
                title || "Без названия"
              )}</span>
              ${
                status
                  ? `<span class='tools-map-popup__item-status'>${escapeHtml(status)}</span>`
                  : ""
              }
            </li>`;
          })
          .join("");

        return `<section class='tools-map-popup__group'>
          <div class='tools-map-popup__group-header'>
            <span class='tools-map-popup__group-title'>${escapeHtml(responsible)}</span>
            <span class='tools-map-popup__group-count'>${tools.length}</span>
          </div>
          <ul class='tools-map-popup__list'>${toolsHtml}</ul>
        </section>`;
      })
      .join("");

    return `<div class='tools-map-popup'>${groupsHtml}</div>`;
  };

  const hasActiveToolsSearchFilters = () => {
    if (toolsState.search.trim()) {
      return true;
    }

    return Object.values(toolsState.filters).some((value) =>
      String(value ?? "").trim()
    );
  };

  const renderToolsSearchMap = (points) => {
    if (!toolsSearchMapCanvasEl) return;
    const safePoints = Array.isArray(points) ? points : [];
    toolsSearchMapState.points = safePoints;
    const mapContentEl = toolsSearchMapCanvasEl;
    const existingDots = mapContentEl.querySelectorAll(".tools-map-dot");
    existingDots.forEach((dot) => dot.remove());

    if (!safePoints.length) {
      setToolsZoneSubtitle("");
      toolsSearchMapPlaceholderEl?.classList.remove("is-hidden");
      toolsSearchMapCanvasEl.classList.remove("tools-map-canvas--map");
      toolsSearchMapCanvasEl.classList.remove("tools-map-canvas--filtering");
      if (toolsSearchMapImageEl) {
        toolsSearchMapImageEl.classList.add("is-hidden");
        toolsSearchMapImageEl.removeAttribute("src");
      }
      if (toolsSearchMapState.activated) {
        syncInteractiveToolsSearchMap();
      }
      return;
    }

    toolsSearchMapPlaceholderEl?.classList.add("is-hidden");
    toolsSearchMapCanvasEl.classList.add("tools-map-canvas--map");
    const isFiltering = hasActiveToolsSearchFilters();
    toolsSearchMapCanvasEl.classList.toggle("tools-map-canvas--filtering", isFiltering);
    const bounds = buildToolsMapBounds(safePoints);
    if (toolsSearchMapImageEl) {
      const mapUrl = buildYandexStaticMapUrl(safePoints, bounds);
      toolsSearchMapImageEl.src = mapUrl;
      toolsSearchMapImageEl.classList.remove("is-hidden");
    }

    void ensureToolsSearchMapReady();
  };

  const toolsSearchMapState = {
    activated: false,
    interactive: false,
    points: [],
    map: null,
    markers: [],
    boundsListenerAttached: false,
  };

  const refreshToolsSearchMapViewportInfo = () => {
    if (!toolsSearchMapState.map || !window.ymaps) return;
    const mapBounds = toolsSearchMapState.map.getBounds?.();
    if (!mapBounds) return;

    syncInteractiveToolsSearchMap({ fitViewport: false });
  };

  const syncInteractiveToolsSearchMap = ({ fitViewport = true } = {}) => {
    if (!toolsSearchMapState.map || !window.ymaps) return;
    const safePoints = Array.isArray(toolsSearchMapState.points)
      ? toolsSearchMapState.points
      : [];
    const openedPointName = toolsSearchMapState.markers
      .find((marker) => marker?.balloon?.isOpen?.())
      ?.__toolsPoint?.name;

    toolsSearchMapState.markers.forEach((marker) => {
      toolsSearchMapState.map?.geoObjects.remove(marker);
    });
    toolsSearchMapState.markers = [];

    if (!safePoints.length) {
      if (!fitViewport) {
        updateToolsZoneSubtitle();
        return;
      }
      toolsSearchMapState.map.setCenter([53.9, 27.56], 10, {
        duration: 240,
      });
      updateToolsZoneSubtitle();
      return;
    }

    const bounds = safePoints
      .map((point) => {
        const lat = Number(point?.coordinates?.lat);
        const lng = Number(point?.coordinates?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return [lat, lng];
      })
      .filter(Boolean);

    if (fitViewport && bounds.length) {
      if (bounds.length === 1) {
        toolsSearchMapState.map.setCenter(bounds[0], 15, { duration: 260 });
      } else {
        toolsSearchMapState.map.setBounds(bounds, {
          checkZoomRange: true,
          zoomMargin: [34, 34, 34, 34],
          duration: 260,
        });
      }
    }

    const visiblePoints = getVisibleToolsSearchPoints(safePoints);

    visiblePoints.forEach((point) => {
      const lat = Number(point?.coordinates?.lat);
      const lng = Number(point?.coordinates?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const toolsCount = Number(point.count) || 0;
      const label = `${point.name} · ${toolsCount} шт.`;

      const marker = new window.ymaps.Placemark(
        [lat, lng],
        {
          balloonContentHeader: escapeHtml(point.name),
          balloonContentBody: `Инструментов: ${toolsCount}`,
          hintContent: label,
          iconCaption: label,
        },
        {
          preset: "islands#blueCircleDotIconWithCaption",
        }
      );
      marker.__toolsPoint = point;
      const applyPopupContent = () => {
        const popupHtml = buildToolsSearchMapPopupHtml(point);
        marker.properties.set("balloonContentHeader", escapeHtml(point.name));
        marker.properties.set("balloonContentBody", popupHtml);
        marker.properties.set(
          "balloonContentFooter",
          `<button type="button" class="tools-map-popup__apply" data-tools-map-object="${escapeHtml(
            point.name
          )}">Применить фильтр по объекту</button>`
        );
      };

      marker.events.add("click", () => {
        applyPopupContent();
        marker.balloon.open();
      });
      toolsSearchMapState.map.geoObjects.add(marker);
      toolsSearchMapState.markers.push(marker);

      if (
        openedPointName &&
        String(openedPointName).trim().toLowerCase() ===
          String(point.name ?? "").trim().toLowerCase()
      ) {
        applyPopupContent();
        marker.balloon.open();
      }
    });

    updateToolsZoneSubtitle();
  };

  const activateToolsSearchMapInteraction = async () => {
    if (
      !toolsSearchMapCanvasEl ||
      !toolsSearchMapLayerEl
    ) {
      return;
    }

    await ensureToolsSearchMapReady({ interactive: true });
  };

  const ensureToolsSearchMapReady = async ({ interactive = false } = {}) => {
    if (!toolsSearchMapCanvasEl || !toolsSearchMapLayerEl) return;

    try {
      await ensureYandexMapsLoaded();
      toolsSearchMapState.activated = true;
      toolsSearchMapCanvasEl.classList.add("tools-map-canvas--map");

      toolsSearchMapPlaceholderEl?.classList.add("is-hidden");
      toolsSearchMapImageEl?.classList.add("is-hidden");

      if (!toolsSearchMapState.map) {
        toolsSearchMapLayerEl.innerHTML = "";
        toolsSearchMapState.map = new window.ymaps.Map(
          toolsSearchMapLayerEl,
          {
            center: [53.9, 27.56],
            zoom: 10,
            controls: ["zoomControl", "geolocationControl"],
          },
          {
            suppressMapOpenBlock: true,
          }
        );
        window.setTimeout(() => {
          toolsSearchMapState.map?.container?.fitToViewport?.();
        }, 80);
      }

      const interactiveBehaviors = [
        "drag",
        "scrollZoom",
        "multiTouch",
        "dblClickZoom",
      ];
      toolsSearchMapState.interactive = Boolean(interactive);
      if (toolsSearchMapState.interactive) {
        toolsSearchMapCanvasEl.classList.add("tools-map-canvas--interactive");
        toolsSearchMapCanvasEl.classList.add("tools-map-canvas--interactive-live");
        toolsSearchMapCanvasEl.setAttribute(
          "aria-label",
          "Карта активна. Перемещайте карту и меняйте масштаб"
        );
        interactiveBehaviors.forEach((behaviorName) => {
          toolsSearchMapState.map?.behaviors?.enable?.(behaviorName);
        });
        if (!toolsSearchMapState.map.controls.get("zoomControl")) {
          toolsSearchMapState.map.controls.add("zoomControl");
        }
        if (!toolsSearchMapState.map.controls.get("geolocationControl")) {
          toolsSearchMapState.map.controls.add("geolocationControl");
        }
      } else {
        toolsSearchMapCanvasEl.classList.remove("tools-map-canvas--interactive");
        toolsSearchMapCanvasEl.classList.remove("tools-map-canvas--interactive-live");
        toolsSearchMapCanvasEl.setAttribute(
          "aria-label",
          "Карта предварительного просмотра. Нажмите, чтобы включить перемещение"
        );
        interactiveBehaviors.forEach((behaviorName) => {
          toolsSearchMapState.map?.behaviors?.disable?.(behaviorName);
        });
        toolsSearchMapState.map.controls.remove("zoomControl");
        toolsSearchMapState.map.controls.remove("geolocationControl");
      }

      if (!toolsSearchMapState.boundsListenerAttached) {
        toolsSearchMapState.map.events.add("boundschange", () => {
          refreshToolsSearchMapViewportInfo();
        });
        toolsSearchMapState.boundsListenerAttached = true;
      }

      syncInteractiveToolsSearchMap();
    } catch (error) {
      console.warn("Не удалось загрузить карту поиска.", error);
      toolsSearchMapCanvasEl.setAttribute(
        "aria-label",
        "Не удалось загрузить интерактивную карту, попробуйте позже"
      );
    }
  };

  const awakenToolsSearchMap = async () => {
    if (!toolsSearchMapCanvasEl) return;
    await activateToolsSearchMapInteraction();
    toolsSearchMapCanvasEl.classList.remove("tools-map-canvas--alive");
    window.requestAnimationFrame(() => {
      toolsSearchMapCanvasEl.classList.add("tools-map-canvas--alive");
      window.setTimeout(() => {
        toolsSearchMapCanvasEl.classList.remove("tools-map-canvas--alive");
      }, 720);
    });
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
      applyToolStatusClasses(row, tool);
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
    applyToolStatusClasses(card, tool);
    card.dataset.toolsItem = "true";
    card.dataset.toolId = tool.__selectionId;

    const media = document.createElement("div");
    media.className = "tools-card__media";
    const img = document.createElement("img");
    img.alt = infoLine || "Инструмент";
    applyToolPhotoWithFallback({
      img,
      orgFolder,
      toolNumber: photoNumber,
      hasPhoto,
    });

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
      applyToolStatusClasses(row, tool);
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
      applyToolPhotoWithFallback({
        img,
        orgFolder: toolsState.orgFolder,
        toolNumber: photoNumber,
        hasPhoto,
      });
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
    const isMapView = viewMode === "map";
    toolsListEl.classList.toggle("is-large", viewMode === "large");
    toolsListEl.classList.toggle("is-compact", viewMode === "compact");
    toolsListEl.classList.toggle("is-table", viewMode === "table");
    toolsListEl.classList.toggle("is-hidden", isMapView);
    if (toolsSearchMapEl) {
      toolsSearchMapEl.classList.toggle("is-hidden", !isMapView);
    }
    const items = toolsState.filtered;
    if (isMapView) {
      const points = buildToolsMapPointsByObjects(items, toolsState.objects);
      renderToolsSearchMap(points);
    } else if (viewMode === "table") {
      toolsListEl.appendChild(renderToolsTable(items));
    } else {
      items.forEach((tool) => {
        toolsListEl.appendChild(
          renderToolCard(tool, viewMode, toolsState.orgFolder)
        );
      });
    }
    if (toolsEmptyEl) {
      toolsEmptyEl.classList.toggle("is-hidden", isMapView || items.length > 0);
    }
    setToolsSubtitle(
      `Показано ${items.length} из ${toolsState.tools.length}`
    );
    updateToolsFiltersUi();
    if (!isMapView || !toolsSearchMapState.activated) {
      setToolsZoneSubtitle("");
    } else {
      updateToolsZoneSubtitle();
    }
    syncToolsViewButtons();
    updateToolsSelectionUi();
  };

  const applyToolsFilters = () => {
    const search = toolsState.search.trim();
    const tokens = search ? search.split(/\s+/).filter(Boolean) : [];
    toolsState.filtered = toolsState.tools.filter((tool) => {
      const hasSelected = (key) =>
        Array.isArray(toolsState.filters[key]) && toolsState.filters[key].length > 0;
      const includesSelected = (key, value) =>
        toolsState.filters[key].includes(String(value ?? "").trim());
      if (
        hasSelected("group") &&
        !includesSelected("group", tool?.["Граппа инструментов"])
      ) {
        return false;
      }
      if (
        hasSelected("object") &&
        !includesSelected("object", tool?.["Объект"])
      ) {
        return false;
      }
      if (
        hasSelected("status") &&
        !includesSelected("status", tool?.["Статус"])
      ) {
        return false;
      }
      if (
        hasSelected("responsible") &&
        !includesSelected("responsible", tool?.["Ответственный"])
      ) {
        return false;
      }
      if (
        hasSelected("manufacturer") &&
        !includesSelected("manufacturer", tool?.["Производитель"])
      ) {
        return false;
      }
      if (
        hasSelected("model") &&
        !includesSelected("model", tool?.["Модель"])
      ) {
        return false;
      }
      if (hasSelected("photo")) {
        const photoFilters = toolsState.filters.photo;
        const hasWith = photoFilters.includes("with");
        const hasWithout = photoFilters.includes("without");
        if (hasWith !== hasWithout) {
          const count = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
          const hasPhoto = Number.isFinite(count) && count > 0;
          if (hasWith && !hasPhoto) {
            return false;
          }
          if (hasWithout && hasPhoto) {
            return false;
          }
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

  const renderToolsFilterTriggerLabel = (containerEl, selectedValues) => {
    if (!containerEl) return;
    const triggerEl = containerEl.querySelector("[data-tools-filter-trigger]");
    if (!triggerEl) return;
    const key = String(containerEl.dataset.toolsFilter ?? "").trim();
    const safeValues = Array.isArray(selectedValues) ? selectedValues : [];
    const displayValues =
      key === "photo"
        ? safeValues.map((value) => (value === "with" ? "С фото" : "Без фото"))
        : safeValues;
    if (!displayValues.length) {
      triggerEl.textContent = "Все";
      triggerEl.classList.remove("is-active");
      return;
    }
    triggerEl.classList.add("is-active");
    triggerEl.textContent =
      displayValues.length === 1
        ? displayValues[0]
        : `Выбрано: ${displayValues.length}`;
  };

  const fillToolsFilterOptions = (key, values) => {
    const containerEls = contentEl.querySelectorAll(
      `.tools-filter-dropdown[data-tools-filter="${key}"]`
    );
    if (!containerEls.length) return;
    const currentValues = Array.isArray(toolsState.filters[key])
      ? toolsState.filters[key]
      : [];
    containerEls.forEach((containerEl) => {
      const optionsEl = containerEl.querySelector("[data-tools-filter-options]");
      if (!optionsEl) return;
      optionsEl.innerHTML = "";
      values.forEach((value, index) => {
        const id = `tools-filter-${key}-${index}`;
        const optionLabelEl = document.createElement("label");
        optionLabelEl.className = "tools-filter-dropdown__option";
        optionLabelEl.setAttribute("for", id);
        const checkboxEl = document.createElement("input");
        checkboxEl.type = "checkbox";
        checkboxEl.id = id;
        checkboxEl.value = value;
        checkboxEl.checked = currentValues.includes(value);
        checkboxEl.dataset.toolsFilterCheckbox = key;
        const textEl = document.createElement("span");
        textEl.textContent = value;
        optionLabelEl.append(checkboxEl, textEl);
        optionsEl.appendChild(optionLabelEl);
      });
      renderToolsFilterTriggerLabel(containerEl, currentValues);
    });
  };

  const syncToolsFilterValue = (key, values) => {
    const selectedValues = Array.isArray(values) ? values : [];
    const containerEls = contentEl.querySelectorAll(
      `.tools-filter-dropdown[data-tools-filter="${key}"]`
    );
    containerEls.forEach((containerEl) => {
      const checkboxes = containerEl.querySelectorAll(
        'input[type="checkbox"][data-tools-filter-checkbox]'
      );
      checkboxes.forEach((checkboxEl) => {
        checkboxEl.checked = selectedValues.includes(String(checkboxEl.value ?? "").trim());
      });
      renderToolsFilterTriggerLabel(containerEl, selectedValues);
    });
  };

  const countAppliedToolsFilters = () =>
    Object.values(toolsState.filters).reduce((total, value) => {
      if (!Array.isArray(value)) return total;
      return total + value.length;
    }, 0);

  const updateToolsFiltersUi = () => {
    const appliedCount = countAppliedToolsFilters();
    if (toolsFiltersToggleEl) {
      toolsFiltersToggleEl.classList.toggle("is-active", appliedCount > 0);
      toolsFiltersToggleEl.dataset.appliedCount = String(appliedCount);
    }
    const statusEl = contentEl.querySelector("[data-tools-filters-status]");
    if (statusEl) {
      statusEl.textContent =
        appliedCount > 0
          ? `Фильтры: ${appliedCount} выбр.`
          : "Фильтры не выбраны";
      statusEl.classList.toggle("is-active", appliedCount > 0);
    }
    const resetButtonEl = contentEl.querySelector("[data-tools-filters-reset]");
    if (resetButtonEl) {
      resetButtonEl.classList.toggle("is-hidden", appliedCount === 0);
    }
  };

  const resetToolsFilters = () => {
    Object.keys(toolsState.filters).forEach((key) => {
      toolsState.filters[key] = [];
      syncToolsFilterValue(key, []);
    });
    applyToolsFilters();
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
    fillToolsFilterOptions("object", collectValues("Объект"));
    fillToolsFilterOptions("status", collectValues("Статус"));
    fillToolsFilterOptions("responsible", collectValues("Ответственный"));
    fillToolsFilterOptions("manufacturer", collectValues("Производитель"));
    fillToolsFilterOptions("model", collectValues("Модель"));
    fillToolsFilterOptions(
      "photo",
      [
        { value: "with", label: "С фото" },
        { value: "without", label: "Без фото" },
      ].map((item) => item.label)
    );
    const photoContainerEl = contentEl.querySelector(
      '.tools-filter-dropdown[data-tools-filter="photo"]'
    );
    if (photoContainerEl) {
      const checkboxes = photoContainerEl.querySelectorAll(
        'input[type="checkbox"][data-tools-filter-checkbox="photo"]'
      );
      checkboxes.forEach((checkboxEl) => {
        const label = String(checkboxEl.value ?? "").trim();
        checkboxEl.value = label === "С фото" ? "with" : "without";
        checkboxEl.checked = toolsState.filters.photo.includes(checkboxEl.value);
      });
      renderToolsFilterTriggerLabel(photoContainerEl, toolsState.filters.photo);
    }
    updateToolsFiltersUi();
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
    const objectsPathLocal = `./${orgFolder}/Объекты.json`;
    let rawTools = [];
    let rawObjects = [];
    try {
      const raw = await loadJson(toolsPath);
      rawTools = Array.isArray(raw) ? raw : Array.isArray(raw?.tools) ? raw.tools : [];
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов.", error);
      rawTools = [];
    }
    try {
      const raw = await loadJson(objectsPathLocal);
      rawObjects = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.objects)
          ? raw.objects
          : [];
    } catch (error) {
      console.warn("Не удалось загрузить список объектов.", error);
      rawObjects = [];
    }
    const sourceResponsible =
      toolsState.mode === "replacement" && toolsState.activeReplacementResponsible
        ? toolsState.activeReplacementResponsible
        : user?.full_name ?? "";
    const userNameKey = normalizePersonName(sourceResponsible);
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
          __statusTone: resolveToolStatusTone(tool),
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
    toolsState.objects = normalizeObjectsData(rawObjects);
    resetToolsSelection();
    prepareToolsFilters();
    applyToolsFilters();
  };

  const loadBaseTools = async () => {
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
    const objectsPathLocal = `./${orgFolder}/Объекты.json`;
    let rawTools = [];
    let rawObjects = [];
    try {
      const raw = await loadJson(toolsPath);
      rawTools = Array.isArray(raw) ? raw : Array.isArray(raw?.tools) ? raw.tools : [];
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов.", error);
      rawTools = [];
    }
    try {
      const raw = await loadJson(objectsPathLocal);
      rawObjects = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.objects)
          ? raw.objects
          : [];
    } catch (error) {
      console.warn("Не удалось загрузить список объектов.", error);
      rawObjects = [];
    }
    const { pendingNumbers, pendingAccountingNumbers } =
      await loadPendingMoves(orgFolder);
    toolsState.tools = rawTools
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
          __statusTone: resolveToolStatusTone(tool),
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
    toolsState.objects = normalizeObjectsData(rawObjects);
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

  const openToolsModal = async (options = {}) => {
    if (!toolsModalEl) return;
    const objectFilter = sanitizeObjectName(options.objectFilter ?? "");
    toolsState.mode = "user";
    toolsState.activeReplacementResponsible = "";
    setToolsTitle("Мои инструменты");
    toolsState.filters.responsible = [];
    toolsState.filters.object = [];
    toolsState.view = normalizeToolsView(toolsState.previousView);
    syncToolsFilterValue("responsible", []);
    syncToolsFilterValue("object", []);
    setToolsResponsibleFilterVisibility(false);
    updateToolsReplacementPendingLinkVisibility();
    toolsSearchMapViewButtonEl?.classList.add("is-hidden");
    toolsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setToolsSubtitle("Загружаем список...");
    const numberConfig = await resolveToolsNumberConfig();
    updateToolsNumberConfig(numberConfig);
    await loadUserTools();
    if (objectFilter) {
      toolsState.filters.object = [objectFilter];
      syncToolsFilterValue("object", [objectFilter]);
      applyToolsFilters();
    }
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

  const openReplacementToolsModal = async (replacementFullName = "") => {
    if (!toolsModalEl) return;
    const normalizedFullName = String(replacementFullName ?? "").trim();
    if (!normalizedFullName) return;
    toolsState.activeReplacementResponsible = normalizedFullName;
    toolsState.mode = "replacement";
    toolsState.filters.responsible = [];
    toolsState.filters.object = [];
    toolsState.view = normalizeToolsView(toolsState.previousView);
    syncToolsFilterValue("responsible", []);
    syncToolsFilterValue("object", []);
    setToolsResponsibleFilterVisibility(false);
    setToolsTitle(`Инструменты ${formatFullName(normalizedFullName)}`);
    updateToolsReplacementPendingLinkVisibility();
    toolsSearchMapViewButtonEl?.classList.add("is-hidden");
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

  const openBaseModal = async () => {
    if (!toolsModalEl) return;
    toolsState.mode = "base";
    toolsState.activeReplacementResponsible = "";
    toolsState.view = normalizeToolsView(toolsState.previousView);
    setToolsTitle("База");
    setToolsResponsibleFilterVisibility(true);
    updateToolsReplacementPendingLinkVisibility();
    toolsSearchMapViewButtonEl?.classList.add("is-hidden");
    toolsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setToolsSubtitle("Загружаем список...");
    const numberConfig = await resolveToolsNumberConfig();
    updateToolsNumberConfig(numberConfig);
    await loadBaseTools();
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

  const openSearchModal = async () => {
    if (!toolsModalEl) return;
    toolsState.mode = "search";
    toolsState.view = "table";
    setToolsTitle("Поиск");
    setToolsResponsibleFilterVisibility(true);
    updateToolsReplacementPendingLinkVisibility();
    toolsSearchMapViewButtonEl?.classList.remove("is-hidden");
    toolsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setToolsSubtitle("Загружаем список...");
    const numberConfig = await resolveToolsNumberConfig();
    updateToolsNumberConfig(numberConfig);
    await loadBaseTools();
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

  const openMoveOtherModal = async () => {
    if (!toolsModalEl) return;
    toolsState.mode = "move-other";
    toolsState.view = normalizeToolsView(toolsState.previousView);
    setToolsTitle("Переместить за других");
    setToolsResponsibleFilterVisibility(true);
    updateToolsReplacementPendingLinkVisibility();
    toolsSearchMapViewButtonEl?.classList.add("is-hidden");
    toolsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setToolsSubtitle("Загружаем список...");
    const numberConfig = await resolveToolsNumberConfig();
    updateToolsNumberConfig(numberConfig);
    await loadBaseTools();
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
    updateToolsReplacementPendingLinkVisibility();
    toolsModalEl.classList.remove("tools-modal--searching");
    document.body.style.overflow = "";
    resetToolsSelection();
    closeToolsMoveModal();
    closeToolsCancelMoveModal();
    if (toolsInfoModalEl && !toolsInfoModalEl.classList.contains("is-hidden")) {
      closeToolsInfoModal();
    }
  };

  const closeToolsEditModal = () => {
    if (!toolsEditModalEl) return;
    toolsEditModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
    toolsEditState.tool = null;
    toolsEditState.matchNumber = "";
    toolsEditState.matchAccounting = "";
    toolsEditState.isSaving = false;
    setToolsEditMessage("");
    if (toolsEditPhotoInput) {
      toolsEditPhotoInput.value = "";
    }
  };

  const setToolsInfoTab = (tab) => {
    toolsInfoState.tab = tab;
    toolsInfoTabButtons.forEach((button) => {
      const isActive = button.dataset.toolsInfoTab === tab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    toolsInfoPanels.forEach((panel) => {
      const isActive = panel.dataset.toolsInfoPanel === tab;
      panel.classList.toggle("is-active", isActive);
    });
  };

  const renderToolsInfoGrid = (tool) => {
    if (!toolsInfoGridEl) return;
    toolsInfoGridEl.innerHTML = "";
    const toolNumber =
      String(tool?.["Номер"] ?? "").trim() || resolveToolNumberValue(tool);
    const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
    const nameParts = [
      String(tool?.["Наименование"] ?? "").trim(),
      String(tool?.["Производитель"] ?? "").trim(),
      String(tool?.["Модель"] ?? "").trim(),
    ].filter(Boolean);
    const info = [
      { label: "Номер", value: toolNumber },
      { label: "Бух.номер", value: accountingNumber },
      { label: "Наименование", value: nameParts.join(" ") },
      { label: "Стоимость", value: tool?.["Стоимость"] },
      { label: "Дата покупки", value: tool?.["Дата покупки"] },
      { label: "Ответственный", value: tool?.["Ответственный"] },
      { label: "Объект", value: tool?.["Объект"] },
      { label: "Статус", value: tool?.["Статус"] },
    ];
    info.forEach(({ label, value }) => {
      const row = document.createElement("div");
      row.className = "tools-info-row";
      const labelEl = document.createElement("div");
      labelEl.className = "tools-info-label";
      labelEl.textContent = label;
      const valueEl = document.createElement("div");
      valueEl.className = "tools-info-value";
      valueEl.textContent = formatInfoValue(value);
      row.append(labelEl, valueEl);
      toolsInfoGridEl.appendChild(row);
    });
  };

  const buildToolsInfoMatcher = (tool) => {
    const number = normalizeToolNumberValue(tool?.["Номер"] ?? "");
    const accounting = String(tool?.["Бух.номер"] ?? "").trim();
    return (entry) => {
      const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
      const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
      if (number && entryNumber === number) return true;
      if (accounting && entryAccounting === accounting) return true;
      return false;
    };
  };

  const renderToolsInfoMoves = () => {
    if (toolsInfoMovesListEl) toolsInfoMovesListEl.innerHTML = "";
    const moves = toolsInfoState.moves;
    if (toolsInfoMovesSummaryEl) {
      toolsInfoMovesSummaryEl.textContent = moves.length
        ? `Всего перемещений: ${moves.length}`
        : "Перемещений пока нет.";
    }
    if (toolsInfoMovesEmptyEl) {
      toolsInfoMovesEmptyEl.classList.toggle("is-hidden", moves.length > 0);
    }
    if (!toolsInfoMovesListEl) return;
    moves.forEach((move) => {
      const response = String(move?.["Ответ"] ?? "").trim().toLowerCase();
      const isRejected = response === "не принял";
      const item = document.createElement("div");
      item.className = "tools-info-item";
      if (isRejected) {
        item.classList.add("tools-info-item--danger");
      }
      const title = document.createElement("div");
      title.className = "tools-info-item__title";
      title.textContent = formatInfoValue(move?.["Дата перемещения"]);
      const grid = document.createElement("div");
      grid.className = "tools-info-item__grid";
      grid.append(
        buildToolsInfoRow("Переместил", move?.["Переместил"]),
        buildToolsInfoRow("Старый объект", move?.["Старый объект"]),
        buildToolsInfoRow("Принял", move?.["Принял"]),
        buildToolsInfoRow("Новый объект", move?.["Новый объект"])
      );
      item.append(title, grid);
      if (isRejected) {
        const reason = formatInfoValue(move?.["Причина отказа"]);
        const note = document.createElement("div");
        note.className = "tools-info-item__note";
        note.textContent = `Причина отказа: ${reason}`;
        item.appendChild(note);
      }
      toolsInfoMovesListEl.appendChild(item);
    });
  };

  const renderToolsInfoBreakdowns = () => {
    if (toolsInfoBreakdownsListEl) toolsInfoBreakdownsListEl.innerHTML = "";
    const breakdowns = toolsInfoState.breakdowns;
    let totalDays = 0;
    breakdowns.forEach((entry) => {
      const startDate = parseDateValue(entry?.["Дата поломки"]);
      if (!startDate) return;
      const endDate = parseDateValue(entry?.["Дата ремонта"]) || new Date();
      totalDays += getDaysDifference(endDate, startDate);
    });
    if (toolsInfoBreakdownsSummaryEl) {
      toolsInfoBreakdownsSummaryEl.textContent = breakdowns.length
        ? `Поломок: ${breakdowns.length} · Суммарно: ${formatDaysValue(totalDays)}`
        : "Поломок пока нет.";
    }
    if (toolsInfoBreakdownsEmptyEl) {
      toolsInfoBreakdownsEmptyEl.classList.toggle(
        "is-hidden",
        breakdowns.length > 0
      );
    }
    if (!toolsInfoBreakdownsListEl) return;
    breakdowns.forEach((entry) => {
      const startDate = parseDateValue(entry?.["Дата поломки"]);
      const endDate = parseDateValue(entry?.["Дата ремонта"]);
      const endLabel = endDate ? entry?.["Дата ремонта"] : "Сломан";
      const item = document.createElement("div");
      item.className = "tools-info-item";
      if (!endDate) {
        item.classList.add("tools-info-item--warning");
      }
      const title = document.createElement("div");
      title.className = "tools-info-item__title";
      title.textContent = formatInfoValue(entry?.["Дата поломки"]);
      const grid = document.createElement("div");
      grid.className = "tools-info-item__grid";
      const dateValue = formatDateWithDays({
        dateLabel: endLabel,
        startDate,
        endDate,
      });
      grid.append(
        buildToolsInfoRow("Дата ремонта", dateValue),
        buildToolsInfoRow("Описание поломки", entry?.["Описание поломки"]),
        buildToolsInfoRow("Ответственный", entry?.["Ответственный"])
      );
      item.append(title, grid);
      toolsInfoBreakdownsListEl.appendChild(item);
    });
  };

  const renderToolsInfoRepairs = () => {
    if (toolsInfoRepairsListEl) toolsInfoRepairsListEl.innerHTML = "";
    const repairs = toolsInfoState.repairs;
    let totalDays = 0;
    repairs.forEach((entry) => {
      const startDate = parseDateValue(entry?.["Дата отправки в ремонт"]);
      if (!startDate) return;
      const endDate = parseDateValue(entry?.["Дата ремонта"]) || new Date();
      totalDays += getDaysDifference(endDate, startDate);
    });
    if (toolsInfoRepairsSummaryEl) {
      toolsInfoRepairsSummaryEl.textContent = repairs.length
        ? `Ремонтов: ${repairs.length} · Суммарно: ${formatDaysValue(totalDays)}`
        : "Ремонтов пока нет.";
    }
    if (toolsInfoRepairsEmptyEl) {
      toolsInfoRepairsEmptyEl.classList.toggle("is-hidden", repairs.length > 0);
    }
    if (!toolsInfoRepairsListEl) return;
    repairs.forEach((entry) => {
      const startDate = parseDateValue(entry?.["Дата отправки в ремонт"]);
      const endDate = parseDateValue(entry?.["Дата ремонта"]);
      const endLabel = endDate ? entry?.["Дата ремонта"] : "В ремонте";
      const item = document.createElement("div");
      item.className = "tools-info-item";
      if (!endDate) {
        item.classList.add("tools-info-item--repair");
      }
      const title = document.createElement("div");
      title.className = "tools-info-item__title";
      title.textContent = formatInfoValue(entry?.["Дата отправки в ремонт"]);
      const grid = document.createElement("div");
      grid.className = "tools-info-item__grid";
      const dateValue = formatDateWithDays({
        dateLabel: endLabel,
        startDate,
        endDate,
      });
      const costValue =
        entry?.["Стоимость ремонта"] ?? entry?.["Предварительная стоимость ремонта"];
      grid.append(
        buildToolsInfoRow("Организация", entry?.["Организация"]),
        buildToolsInfoRow("Дата ремонта", dateValue),
        buildToolsInfoRow("Стоимость ремонта", costValue),
        buildToolsInfoRow("Ответственный", entry?.["Ответственный"])
      );
      item.append(title, grid);
      toolsInfoRepairsListEl.appendChild(item);
    });
  };

  const loadToolsInfoData = async () => {
    const tool = toolsInfoState.tool;
    const orgFolder = toolsInfoState.orgFolder;
    if (!tool || !orgFolder) {
      toolsInfoState.moves = [];
      toolsInfoState.breakdowns = [];
      toolsInfoState.repairs = [];
      renderToolsInfoMoves();
      renderToolsInfoBreakdowns();
      renderToolsInfoRepairs();
      return;
    }
    const matcher = buildToolsInfoMatcher(tool);
    const movesPath = `./${orgFolder}/Перемещения.json`;
    const breakdownsPath = `./${orgFolder}/Поломки.json`;
    const repairsPath = `./${orgFolder}/Ремонты.json`;
    const [rawMoves, rawBreakdowns, rawRepairs] = await Promise.all([
      loadJson(movesPath).catch(() => []),
      loadJson(breakdownsPath).catch(() => []),
      loadJson(repairsPath).catch(() => []),
    ]);
    const moves = Array.isArray(rawMoves)
      ? rawMoves
      : Array.isArray(rawMoves?.moves)
        ? rawMoves.moves
        : [];
    const breakdowns = Array.isArray(rawBreakdowns)
      ? rawBreakdowns
      : Array.isArray(rawBreakdowns?.breakdowns)
        ? rawBreakdowns.breakdowns
        : [];
    const repairs = Array.isArray(rawRepairs)
      ? rawRepairs
      : Array.isArray(rawRepairs?.repairs)
        ? rawRepairs.repairs
        : [];
    toolsInfoState.moves = moves
      .filter(matcher)
      .filter(
        (move) =>
          String(move?.["Ответ"] ?? "").trim().toLowerCase() !== "отменено"
      )
      .sort((a, b) => {
        const aDate = parseDateValue(a?.["Дата перемещения"]);
        const bDate = parseDateValue(b?.["Дата перемещения"]);
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return bDate - aDate;
      });
    toolsInfoState.breakdowns = breakdowns
      .filter(matcher)
      .sort((a, b) => {
        const aDate = parseDateValue(a?.["Дата поломки"]);
        const bDate = parseDateValue(b?.["Дата поломки"]);
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return bDate - aDate;
      });
    toolsInfoState.repairs = repairs
      .filter(matcher)
      .sort((a, b) => {
        const aDate = parseDateValue(a?.["Дата отправки в ремонт"]);
        const bDate = parseDateValue(b?.["Дата отправки в ремонт"]);
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return bDate - aDate;
      });
    renderToolsInfoMoves();
    renderToolsInfoBreakdowns();
    renderToolsInfoRepairs();
  };

  const closeToolsInfoModal = () => {
    if (!toolsInfoModalEl) return;
    toolsInfoModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
    toolsInfoState.tool = null;
  };

  const openToolsInfoModal = async (tool) => {
    if (!toolsInfoModalEl || !tool) return;
    toolsInfoState.tool = tool;
    toolsInfoState.orgFolder = toolsState.orgFolder || context.orgFolderName || "";
    const toolNumber = resolveToolNumberValue(tool) || "—";
    const nameParts = [
      String(tool?.["Наименование"] ?? "").trim(),
      String(tool?.["Производитель"] ?? "").trim(),
      String(tool?.["Модель"] ?? "").trim(),
    ].filter(Boolean);
    const title = nameParts.length ? nameParts.join(" ") : "Инструмент";
    if (toolsInfoTitleEl) {
      toolsInfoTitleEl.textContent = title;
    }
    if (toolsInfoSubtitleEl) {
      toolsInfoSubtitleEl.textContent = `№${toolNumber}`;
    }
    renderToolsInfoGrid(tool);
    if (toolsInfoMovesSummaryEl) {
      toolsInfoMovesSummaryEl.textContent = "Загружаем перемещения...";
    }
    if (toolsInfoBreakdownsSummaryEl) {
      toolsInfoBreakdownsSummaryEl.textContent = "Загружаем поломки...";
    }
    if (toolsInfoRepairsSummaryEl) {
      toolsInfoRepairsSummaryEl.textContent = "Загружаем ремонты...";
    }
    if (toolsInfoMovesListEl) toolsInfoMovesListEl.innerHTML = "";
    if (toolsInfoBreakdownsListEl) toolsInfoBreakdownsListEl.innerHTML = "";
    if (toolsInfoRepairsListEl) toolsInfoRepairsListEl.innerHTML = "";
    if (toolsInfoMovesEmptyEl) toolsInfoMovesEmptyEl.classList.add("is-hidden");
    if (toolsInfoBreakdownsEmptyEl) {
      toolsInfoBreakdownsEmptyEl.classList.add("is-hidden");
    }
    if (toolsInfoRepairsEmptyEl) toolsInfoRepairsEmptyEl.classList.add("is-hidden");
    setToolsInfoTab("moves");
    toolsInfoModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    await loadToolsInfoData();
  };

  const openToolsEditModal = (tool) => {
    if (!toolsEditModalEl || !tool) return;
    toolsEditState.tool = tool;
    toolsEditState.matchNumber = normalizeToolNumberValue(tool?.["Номер"] ?? "");
    toolsEditState.matchAccounting = String(tool?.["Бух.номер"] ?? "").trim();
    toolsEditState.orgFolder = toolsState.orgFolder || context.orgFolderName || "";
    toolsEditState.isSaving = false;
    const toolNumber = resolveToolNumberValue(tool) || "—";
    const toolName = String(tool?.["Наименование"] ?? "").trim() || "Инструмент";
    if (toolsEditTitleEl) {
      toolsEditTitleEl.textContent = toolName;
    }
    if (toolsEditSubtitleEl) {
      toolsEditSubtitleEl.textContent = `№${toolNumber}`;
    }
    if (toolsEditAccountingInput) {
      toolsEditAccountingInput.value = String(tool?.["Бух.номер"] ?? "");
    }
    if (toolsEditNameInput) {
      toolsEditNameInput.value = String(tool?.["Наименование"] ?? "");
    }
    if (toolsEditManufacturerInput) {
      toolsEditManufacturerInput.value = String(tool?.["Производитель"] ?? "");
    }
    if (toolsEditModelInput) {
      toolsEditModelInput.value = String(tool?.["Модель"] ?? "");
    }
    if (toolsEditAccountingNameInput) {
      toolsEditAccountingNameInput.value = String(
        tool?.["Наименование по бухгалтерии"] ?? ""
      );
    }
    if (toolsEditSerialInput) {
      toolsEditSerialInput.value = String(tool?.["Серийный номер"] ?? "");
    }
    if (toolsEditGroupInput) {
      toolsEditGroupInput.value = String(tool?.["Граппа инструментов"] ?? "");
    }
    const count = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
    updateToolsEditPhotoCount(Number.isFinite(count) ? count : 0);
    setToolsEditMessage("");
    toolsEditModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    if (toolsEditNameInput) {
      toolsEditNameInput.focus();
    }
  };

  const applyToolsEditUpdateToState = (updatedFields) => {
    const matcher = buildToolsEditMatcher({
      "Номер": toolsEditState.matchNumber,
      "Бух.номер": toolsEditState.matchAccounting,
    });
    let updatedTool = null;
    toolsState.tools = toolsState.tools.map((entry, index) => {
      if (!matcher(entry)) return entry;
      const next = {
        ...entry,
        ...updatedFields,
      };
      next.__searchLine = buildToolSearchLine(next);
      next.__statusTone = resolveToolStatusTone(next);
      next.__selectionId = buildToolSelectionId(next, index);
      updatedTool = next;
      return next;
    });
    toolsState.toolMap = new Map(
      toolsState.tools.map((tool) => [tool.__selectionId, tool])
    );
    if (updatedTool) {
      toolsEditState.tool = updatedTool;
    }
    applyToolsFilters();
  };

  const saveToolsEditChanges = async () => {
    if (toolsEditState.isSaving) return;
    const tool = toolsEditState.tool;
    if (!tool) return;
    const orgFolder = toolsEditState.orgFolder;
    if (!orgFolder) {
      setToolsEditMessage("Не удалось определить организацию.", "error");
      return;
    }
    toolsEditState.isSaving = true;
    setToolsEditMessage("Сохраняем изменения...", "info");

    const updatedFields = {
      "Бух.номер": String(toolsEditAccountingInput?.value ?? "").trim(),
      "Наименование": String(toolsEditNameInput?.value ?? "").trim(),
      "Производитель": String(toolsEditManufacturerInput?.value ?? "").trim(),
      "Модель": String(toolsEditModelInput?.value ?? "").trim(),
      "Наименование по бухгалтерии": String(
        toolsEditAccountingNameInput?.value ?? ""
      ).trim(),
      "Серийный номер": String(toolsEditSerialInput?.value ?? "").trim(),
      "Граппа инструментов": String(toolsEditGroupInput?.value ?? "").trim(),
    };
    const matcher = buildToolsEditMatcher({
      "Номер": toolsEditState.matchNumber,
      "Бух.номер": toolsEditState.matchAccounting,
    });
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    let toolsPayloadRaw = [];
    try {
      toolsPayloadRaw = await loadJson(toolsPath);
    } catch (error) {
      toolsPayloadRaw = [];
    }
    const toolsNormalized = normalizeCollectionPayload(toolsPayloadRaw, "tools");
    const toolIndex = toolsNormalized.items.findIndex(matcher);
    if (toolIndex < 0) {
      setToolsEditMessage("Инструмент не найден в базе.", "error");
      toolsEditState.isSaving = false;
      return;
    }
    const nextTool = {
      ...toolsNormalized.items[toolIndex],
      ...updatedFields,
    };
    const updatedTools = [...toolsNormalized.items];
    updatedTools[toolIndex] = nextTool;
    const updatedToolsPayload = toolsNormalized.wrapper
      ? { ...toolsNormalized.wrapper, [toolsNormalized.key]: updatedTools }
      : updatedTools;
    try {
      await saveEntries([
        {
          path: toolsPath,
          data: updatedToolsPayload,
          ...buildUploadUserMeta({ organizationName: context.orgFullName }),
        },
      ]);
      applyToolsEditUpdateToState(updatedFields);
      toolsEditState.matchAccounting = updatedFields["Бух.номер"];
      setToolsEditMessage("Изменения сохранены.", "success");
    } catch (error) {
      console.error(error);
      setToolsEditMessage("Не удалось сохранить изменения.", "error");
    } finally {
      toolsEditState.isSaving = false;
    }
  };

  const handleToolsEditDelete = async () => {
    if (toolsEditState.isSaving) return;
    const tool = toolsEditState.tool;
    if (!tool) return;
    const orgFolder = toolsEditState.orgFolder;
    if (!orgFolder) {
      setToolsEditMessage("Не удалось определить организацию.", "error");
      return;
    }
    const confirmDelete = window.confirm(
      "Удалить инструмент из базы? Он будет перенесён в «Списания» как удаление."
    );
    if (!confirmDelete) return;
    toolsEditState.isSaving = true;
    setToolsEditMessage("Удаляем инструмент...", "info");

    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    const writeOffPath = `./${orgFolder}/Списания.json`;
    const deleteDate = formatDateValue(new Date());
    const deleteUser = String(user?.full_name ?? "").trim();
    let toolsPayloadRaw = [];
    try {
      toolsPayloadRaw = await loadJson(toolsPath);
    } catch (error) {
      toolsPayloadRaw = [];
    }
    const toolsNormalized = normalizeCollectionPayload(toolsPayloadRaw, "tools");
    const matcher = buildToolsEditMatcher({
      "Номер": toolsEditState.matchNumber,
      "Бух.номер": toolsEditState.matchAccounting,
    });
    const removedTool = toolsNormalized.items.find(matcher);
    if (!removedTool) {
      setToolsEditMessage("Инструмент не найден в базе.", "error");
      toolsEditState.isSaving = false;
      return;
    }
    const updatedTools = toolsNormalized.items.filter((entry) => !matcher(entry));
    const updatedToolsPayload = toolsNormalized.wrapper
      ? { ...toolsNormalized.wrapper, [toolsNormalized.key]: updatedTools }
      : updatedTools;

    let writeOffRaw = [];
    try {
      writeOffRaw = await loadJson(writeOffPath);
    } catch (error) {
      writeOffRaw = [];
    }
    const writeOffNormalized = normalizeCollectionPayload(writeOffRaw, "items");
    const deleteEntry = {
      ...removedTool,
      "Тип списания": "Удаление",
      "Удалил": deleteUser,
      "Дата удаления": deleteDate,
    };
    const updatedWriteOff = [...writeOffNormalized.items, deleteEntry];
    const updatedWriteOffPayload = writeOffNormalized.wrapper
      ? { ...writeOffNormalized.wrapper, [writeOffNormalized.key]: updatedWriteOff }
      : updatedWriteOff;

    try {
      await saveEntries([
        { path: toolsPath, data: updatedToolsPayload, user },
        { path: writeOffPath, data: updatedWriteOffPayload, user },
      ]);
      toolsState.tools = toolsState.tools.filter((entry) => !matcher(entry));
      toolsState.toolMap = new Map(
        toolsState.tools.map((entry) => [entry.__selectionId, entry])
      );
      applyToolsFilters();
      setToolsEditMessage("Инструмент удалён.", "success");
      setTimeout(() => {
        closeToolsEditModal();
      }, 400);
    } catch (error) {
      console.error(error);
      setToolsEditMessage("Не удалось удалить инструмент.", "error");
    } finally {
      toolsEditState.isSaving = false;
    }
  };

  const handleToolsEditPhotoUpload = async (files) => {
    const tool = toolsEditState.tool;
    if (!tool || !files.length) return;
    const orgFolder = toolsEditState.orgFolder;
    if (!orgFolder) {
      setToolsEditMessage("Не удалось определить организацию.", "error");
      return;
    }
    const toolNumber = String(tool?.["Номер"] ?? "").trim();
    if (!toolNumber) {
      setToolsEditMessage("У инструмента нет номера для фото.", "error");
      return;
    }
    setToolsEditMessage("Загружаем фото...", "info");
    try {
      const tools = await loadToolsData(orgFolder);
      const normalized = normalizeToolNumberValue(toolNumber);
      const toolIndex = tools.findIndex(
        (entry) =>
          normalizeToolNumberValue(entry?.["Номер"] ?? "") === normalized
      );
      if (toolIndex < 0) {
        setToolsEditMessage("Инструмент не найден в базе.", "error");
        return;
      }
      const entries = [];
      for (const file of files) {
        const safeName = buildAddPhotoFileName(toolNumber, file);
        const content = await readFileAsBase64(file);
        entries.push({
          type: "file",
          path: `${orgFolder}/Фото инструментов/${safeName}`,
          content,
          encoding: "base64",
          mime: file.type || "image/*",
          ...buildUploadUserMeta({ organizationName: context.orgFullName }),
        });
      }
      await uploadPhotoEntriesInBatches(entries);
      const current = Number.parseInt(
        tools[toolIndex]?.["Количество фото"] ?? 0,
        10
      );
      const safeCurrent = Number.isFinite(current) ? current : 0;
      const nextCount = safeCurrent + files.length;
      tools[toolIndex] = {
        ...tools[toolIndex],
        "Количество фото": nextCount,
      };
      await saveEntries([
        {
          path: `${orgFolder}/База с инструментами.json`,
          data: tools,
          ...buildUploadUserMeta({ organizationName: context.orgFullName }),
        },
      ]);
      applyToolsEditUpdateToState({ "Количество фото": nextCount });
      updateToolsEditPhotoCount(nextCount);
      setToolsEditMessage("Фото загружены.", "success");
    } catch (error) {
      console.error(error);
      setToolsEditMessage("Не удалось загрузить фото.", "error");
    } finally {
      if (toolsEditPhotoInput) {
        toolsEditPhotoInput.value = "";
      }
    }
  };

  const setWriteOffSubtitle = (text) => {
    if (writeOffSubtitleEl) {
      writeOffSubtitleEl.textContent = text;
    }
  };

  const setWriteOffMessage = (text = "", type = "") => {
    if (!writeOffMessageEl) return;
    writeOffMessageEl.textContent = text;
    writeOffMessageEl.classList.remove("is-error", "is-success", "is-info");
    if (type) {
      writeOffMessageEl.classList.add(`is-${type}`);
    }
  };

  const setWriteOffConfirmMessage = (text = "", type = "") => {
    if (!writeOffConfirmMessageEl) return;
    writeOffConfirmMessageEl.textContent = text;
    writeOffConfirmMessageEl.classList.remove("is-error", "is-success", "is-info");
    if (type) {
      writeOffConfirmMessageEl.classList.add(`is-${type}`);
    }
  };

  const updateWriteOffSelectionUi = () => {
    const count = writeOffState.selectedIds.size;
    if (writeOffCountEl) {
      writeOffCountEl.textContent = String(count);
    }
    if (writeOffNextButton) {
      writeOffNextButton.disabled = count === 0;
    }
  };

  const updateWriteOffFilterButton = () => {
    if (!writeOffFilterButton) return;
    writeOffFilterButton.classList.toggle(
      "is-active",
      writeOffState.filterWriteOffOnly
    );
    writeOffFilterButton.textContent = writeOffState.filterWriteOffOnly
      ? "Показаны «На списание»"
      : "Только «На списание»";
  };

  const renderWriteOffList = () => {
    if (!writeOffListEl) return;
    writeOffListEl.innerHTML = "";
    writeOffState.filtered.forEach((tool) => {
      const item = document.createElement("div");
      item.className = "writeoff-item";
      item.dataset.writeoffId = tool.__selectionId;
      const statusText = String(tool?.["Статус"] ?? "").trim().toLowerCase();
      if (statusText === "на списание") {
        item.classList.add("writeoff-item--pending");
      }
      if (writeOffState.selectedIds.has(tool.__selectionId)) {
        item.classList.add("is-selected");
      }
      const check = document.createElement("div");
      check.className = "writeoff-item__check";
      check.textContent = writeOffState.selectedIds.has(tool.__selectionId) ? "✓" : "";
      const content = document.createElement("div");
      const title = document.createElement("div");
      title.className = "writeoff-item__title";
      const accounting = String(tool?.["Бух.номер"] ?? "").trim();
      const number = String(tool?.["Номер"] ?? "").trim();
      const name = String(tool?.["Наименование"] ?? "").trim();
      title.textContent =
        [accounting || number, name].filter(Boolean).join(" · ") || "Без названия";
      const meta = document.createElement("div");
      meta.className = "writeoff-item__meta";
      meta.textContent = [
        accounting ? `Бух.номер: ${accounting}` : "",
        number && number !== accounting ? `Номер: ${number}` : "",
        tool?.["Объект"],
        tool?.["Статус"],
      ]
        .filter((value) => value && String(value).trim())
        .join(" · ");
      content.append(title, meta);
      item.append(check, content);
      writeOffListEl.appendChild(item);
    });
    if (writeOffEmptyEl) {
      writeOffEmptyEl.classList.toggle("is-hidden", writeOffState.filtered.length > 0);
    }
    updateWriteOffSelectionUi();
  };

  const applyWriteOffFilters = () => {
    const query = writeOffState.search.trim();
    const tokens = query ? query.split(/\s+/).filter(Boolean) : [];
    const availableTools = writeOffState.filterWriteOffOnly
      ? writeOffState.tools.filter(
          (tool) =>
            String(tool?.["Статус"] ?? "").trim().toLowerCase() === "на списание"
        )
      : writeOffState.tools;
    if (tokens.length) {
      const numericTokens = tokens.filter((token) => /\d/.test(token));
      if (numericTokens.length === tokens.length) {
        writeOffState.filtered = availableTools.filter((tool) => {
          const searchLine = tool.__accountingSearchLine ?? "";
          return numericTokens.every((token) => searchLine.includes(token));
        });
      } else {
        writeOffState.filtered = availableTools.filter((tool) => {
          const searchLine = tool.__searchLine ?? "";
          return tokens.every((token) => searchLine.includes(token));
        });
      }
    } else {
      writeOffState.filtered = [...availableTools];
    }
    renderWriteOffList();
  };

  const loadWriteOffTools = async () => {
    const orgFolder = context.orgFolderName ?? "";
    writeOffState.orgFolder = orgFolder;
    if (!orgFolder) {
      writeOffState.tools = [];
      writeOffState.filtered = [];
      setWriteOffSubtitle("Не удалось определить организацию.");
      renderWriteOffList();
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
    writeOffState.toolMap.clear();
    writeOffState.tools = rawTools
      .map((tool, index) => {
        const selectionId = buildToolSelectionId(tool, index);
        const entry = {
          ...tool,
          __selectionId: selectionId,
          __searchLine: buildWriteOffSearchLine(tool),
          __accountingSearchLine: buildWriteOffNumberSearchLine(
            tool?.["Бух.номер"]
          ),
        };
        writeOffState.toolMap.set(selectionId, entry);
        return entry;
      })
      .sort((a, b) =>
        resolveToolNumberValue(a).localeCompare(resolveToolNumberValue(b), "ru", {
          numeric: true,
        })
      );
    applyWriteOffFilters();
  };

  const resetWriteOffState = () => {
    writeOffState.search = "";
    writeOffState.selectedIds.clear();
    writeOffState.selectedTools = [];
    writeOffState.filterWriteOffOnly = false;
    if (writeOffSearchInput) {
      writeOffSearchInput.value = "";
    }
    updateWriteOffFilterButton();
    updateWriteOffSelectionUi();
  };

  const openWriteOffModal = async () => {
    if (!writeOffModalEl) return;
    writeOffModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setWriteOffSubtitle("Загружаем инструменты...");
    setWriteOffMessage("");
    resetWriteOffState();
    await loadWriteOffTools();
    setWriteOffSubtitle(
      `Инструментов: ${writeOffState.tools.length}`
    );
    if (
      writeOffSearchInput &&
      (typeof window === "undefined" ||
        !window.matchMedia ||
        !window.matchMedia("(max-width: 520px)").matches)
    ) {
      writeOffSearchInput.focus();
    }
  };

  const closeWriteOffModal = () => {
    if (!writeOffModalEl) return;
    writeOffModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
    setWriteOffMessage("");
    resetWriteOffState();
  };

  const renderWriteOffConfirmList = (tools) => {
    if (!writeOffConfirmListEl) return;
    writeOffConfirmListEl.innerHTML = "";
    tools.forEach((tool) => {
      const accounting = String(tool?.["Бух.номер"] ?? "").trim();
      const number = String(tool?.["Номер"] ?? "").trim();
      const name = String(tool?.["Наименование"] ?? "").trim();
      const item = document.createElement("div");
      item.className = "writeoff-confirm-item";
      item.textContent =
        [accounting || number, name].filter(Boolean).join(" · ") || "Инструмент";
      writeOffConfirmListEl.appendChild(item);
    });
  };

  const openWriteOffConfirmModal = () => {
    if (!writeOffConfirmModalEl) return;
    const selectedTools = Array.from(writeOffState.selectedIds)
      .map((id) => writeOffState.toolMap.get(id))
      .filter(Boolean);
    if (!selectedTools.length) {
      setWriteOffMessage("Сначала выберите инструменты.", "error");
      return;
    }
    writeOffState.selectedTools = selectedTools;
    renderWriteOffConfirmList(selectedTools);
    if (writeOffConfirmCountEl) {
      writeOffConfirmCountEl.textContent = String(selectedTools.length);
    }
    if (writeOffActsInput) {
      writeOffActsInput.value = "";
    }
    setWriteOffConfirmMessage("");
    writeOffConfirmModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const closeWriteOffConfirmModal = () => {
    if (!writeOffConfirmModalEl) return;
    writeOffConfirmModalEl.classList.add("is-hidden");
    setWriteOffConfirmMessage("");
    if (writeOffModalEl && !writeOffModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const collectWriteOffMatchKeys = (tools) => {
    const keys = new Set();
    tools.forEach((tool) => {
      const number = String(tool?.["Номер"] ?? "").trim();
      const accounting = String(tool?.["Бух.номер"] ?? "").trim();
      if (number) keys.add(`n:${number}`);
      if (accounting) keys.add(`a:${accounting}`);
    });
    return keys;
  };

  const buildWriteOffFileChunks = (numbers, maxLength = 160) => {
    const chunks = [];
    let current = [];
    let currentLength = 0;
    numbers.forEach((number) => {
      const safe = sanitizeFileName(String(number ?? "").trim());
      if (!safe) return;
      const nextLength = currentLength ? currentLength + safe.length + 1 : safe.length;
      if (nextLength > maxLength && current.length) {
        chunks.push([...current]);
        current = [safe];
        currentLength = safe.length;
      } else {
        current.push(safe);
        currentLength = nextLength;
      }
    });
    if (current.length) {
      chunks.push(current);
    }
    return chunks.length ? chunks : [["акт"]];
  };

  const filterToolPhotoFiles = (files, tools) => {
    if (!files.length || !tools.length) return [];
    const variants = new Set();
    tools.forEach((tool) => {
      const numbers = [tool?.["Номер"], tool?.["Бух.номер"]];
      numbers.forEach((value) => {
        const list = getToolNumberVariants(value);
        list.forEach((item) =>
          variants.add(normalizeToolNumberValue(item))
        );
      });
    });
    return files.filter((fileName) => {
      const decoded = String(fileName ?? "");
      const match = decoded.match(/(\d+)/);
      if (!match) return false;
      const normalized = normalizeToolNumberValue(match[1]);
      return normalized && variants.has(normalized);
    });
  };

  const applyWriteOff = async () => {
    if (writeOffState.isSaving) return;
    const selectedTools = writeOffState.selectedTools.length
      ? writeOffState.selectedTools
      : Array.from(writeOffState.selectedIds)
          .map((id) => writeOffState.toolMap.get(id))
          .filter(Boolean);
    if (!selectedTools.length) {
      setWriteOffConfirmMessage("Сначала выберите инструменты.", "error");
      return;
    }
    const actFiles = Array.from(writeOffActsInput?.files ?? []);
    if (!actFiles.length) {
      setWriteOffConfirmMessage("Добавьте акт на списание.", "error");
      return;
    }
    if (!context.orgFolderName) {
      setWriteOffConfirmMessage("Не удалось определить организацию.", "error");
      return;
    }
    writeOffState.isSaving = true;
    setWriteOffConfirmMessage("Списываем инструменты...", "info");

    const orgFolder = context.orgFolderName;
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    const writeOffPath = `./${orgFolder}/Списания.json`;
    const movesPath = `./${orgFolder}/Перемещения.json`;
    const movesHistoryPath = `./${orgFolder}/Перемещения история.json`;
    const writeOffDate = formatDateValue(new Date());
    const writeOffUser = String(user?.full_name ?? "").trim();
    const matchKeys = collectWriteOffMatchKeys(selectedTools);

    let toolsPayloadRaw = [];
    try {
      toolsPayloadRaw = await loadJson(toolsPath);
    } catch (error) {
      toolsPayloadRaw = [];
    }
    const toolsNormalized = normalizeCollectionPayload(toolsPayloadRaw, "tools");
    const remainingTools = toolsNormalized.items.filter((tool) => {
      const number = String(tool?.["Номер"] ?? "").trim();
      const accounting = String(tool?.["Бух.номер"] ?? "").trim();
      if (number && matchKeys.has(`n:${number}`)) return false;
      if (accounting && matchKeys.has(`a:${accounting}`)) return false;
      return true;
    });
    const updatedToolsPayload = toolsNormalized.wrapper
      ? { ...toolsNormalized.wrapper, [toolsNormalized.key]: remainingTools }
      : remainingTools;

    let writeOffRaw = [];
    try {
      writeOffRaw = await loadJson(writeOffPath);
    } catch (error) {
      writeOffRaw = [];
    }
    const writeOffNormalized = normalizeCollectionPayload(writeOffRaw, "items");
    const writeOffEntries = selectedTools.map((tool) => ({
      ...tool,
      "Дата списания": writeOffDate,
      "Списал": writeOffUser,
    }));
    const updatedWriteOff = [
      ...writeOffNormalized.items,
      ...writeOffEntries,
    ];
    const updatedWriteOffPayload = writeOffNormalized.wrapper
      ? { ...writeOffNormalized.wrapper, [writeOffNormalized.key]: updatedWriteOff }
      : updatedWriteOff;

    let movesRaw = [];
    try {
      movesRaw = await loadJson(movesPath);
    } catch (error) {
      movesRaw = [];
    }
    const movesNormalized = normalizeCollectionPayload(movesRaw, "moves");
    const movedFromActive = [];
    const remainingMoves = movesNormalized.items.filter((move) => {
      const number = String(move?.["Номер"] ?? "").trim();
      const accounting = String(move?.["Бух.номер"] ?? "").trim();
      const shouldMove =
        (number && matchKeys.has(`n:${number}`)) ||
        (accounting && matchKeys.has(`a:${accounting}`));
      if (shouldMove) {
        movedFromActive.push(move);
      }
      return !shouldMove;
    });
    const updatedMovesPayload = movesNormalized.wrapper
      ? { ...movesNormalized.wrapper, [movesNormalized.key]: remainingMoves }
      : remainingMoves;

    let historyRaw = [];
    try {
      historyRaw = await loadJson(movesHistoryPath);
    } catch (error) {
      historyRaw = [];
    }
    const historyNormalized = normalizeCollectionPayload(historyRaw, "moves");
    const updatedHistory = [
      ...historyNormalized.items,
      ...movedFromActive,
    ];
    const updatedHistoryPayload = historyNormalized.wrapper
      ? { ...historyNormalized.wrapper, [historyNormalized.key]: updatedHistory }
      : updatedHistory;

    const listToolPhotos = async () => {
      const payload = JSON.stringify({
        entries: [
          {
            type: "list-photos",
            path: `${orgFolder}/Фото инструментов`,
            ...buildUploadUserMeta({ organizationName: context.orgFullName }),
          },
        ],
      });
      const response = await fetch(saveEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      if (!response.ok) {
        throw new Error("Не удалось загрузить список фото.");
      }
      const responseText = await response.text();
      if (!responseText) return [];
      const parsed = JSON.parse(responseText);
      return Array.isArray(parsed?.files) ? parsed.files : [];
    };

    const buildActFileName = (base, index, chunkIndex, extension) => {
      const suffixes = [];
      if (actFiles.length > 1) {
        suffixes.push(`акт${index + 1}`);
      }
      if (chunkIndex > 0) {
        suffixes.push(`часть${chunkIndex + 1}`);
      }
      const suffix = suffixes.length ? `_${suffixes.join("_")}` : "";
      return `${base}${suffix}.${extension}`;
    };

    try {
      const entries = [
        { path: toolsPath, data: updatedToolsPayload, user },
        { path: writeOffPath, data: updatedWriteOffPayload, user },
        { path: movesPath, data: updatedMovesPayload, user },
        { path: movesHistoryPath, data: updatedHistoryPayload, user },
      ];
      await saveEntries(entries);

      let movedPhotosCount = 0;
      try {
        const files = await listToolPhotos();
        const targetFiles = filterToolPhotoFiles(files, selectedTools);
        if (targetFiles.length) {
          const moveEntries = targetFiles.map((fileName) => ({
            type: "move-file",
            from: `${orgFolder}/Фото инструментов/${fileName}`,
            to: `${orgFolder}/Фото инструментов. Списание/${fileName}`,
            ...buildUploadUserMeta({ organizationName: context.orgFullName }),
          }));
          await saveEntriesViaEndpoint(moveEntries);
          movedPhotosCount = targetFiles.length;
        }
      } catch (error) {
        console.warn("Не удалось перенести фото списания.", error);
      }

      const numbers = selectedTools
        .map((tool) => String(tool?.["Бух.номер"] ?? "").trim())
        .filter(Boolean);
      if (!numbers.length) {
        numbers.push(
          ...selectedTools
            .map((tool) => String(tool?.["Номер"] ?? "").trim())
            .filter(Boolean)
        );
      }
      const chunks = buildWriteOffFileChunks(numbers);
      const fileEntries = [];
      for (let index = 0; index < actFiles.length; index += 1) {
        const file = actFiles[index];
        const base64 = await readFileAsBase64(file);
        const nameParts = String(file?.name ?? "").split(".");
        let extension =
          nameParts.length > 1 ? nameParts.pop().toLowerCase() : "";
        if (!extension && file?.type) {
          const typeParts = file.type.split("/");
          extension = typeParts[typeParts.length - 1] || "";
        }
        if (!extension) {
          extension = "file";
        }
        chunks.forEach((chunk, chunkIndex) => {
          const base = chunk.join("_") || "акт";
          const fileName = buildActFileName(base, index, chunkIndex, extension);
          fileEntries.push({
            type: "file",
            path: `${orgFolder}/Акты списания/${fileName}`,
            content: base64,
            encoding: "base64",
            ...buildUploadUserMeta({ organizationName: context.orgFullName }),
          });
        });
      }
      if (fileEntries.length) {
        await uploadPhotoEntriesInBatches(fileEntries);
      }

      const photoMessage = movedPhotosCount
        ? ` Фото перенесено: ${movedPhotosCount}.`
        : "";
      const notificationResults = await Promise.all(
        selectedTools.map((tool) =>
          notifyWriteOffTool({
            tool,
            orgFolder,
            organizationName: context.orgFullName,
            writeOffDate,
            wroteOffBy: writeOffUser,
          })
        )
      );
      const notificationStatus = analyzeNotificationResults(notificationResults);
      const notificationSummary = notificationStatus.summary
        ? ` ${notificationStatus.summary}`
        : "";
      setWriteOffConfirmMessage(
        `Списание выполнено.${photoMessage}${notificationSummary}`,
        notificationStatus.allSent ? "success" : "error"
      );
      await loadWriteOffTools();
      resetWriteOffState();
      setTimeout(() => {
        closeWriteOffConfirmModal();
        closeWriteOffModal();
      }, 700);
    } catch (error) {
      console.error(error);
      setWriteOffConfirmMessage(
        "Не удалось списать инструменты. Проверьте сервер.",
        "error"
      );
    } finally {
      writeOffState.isSaving = false;
    }
  };

  const setPendingMovesSubtitle = (text) => {
    if (pendingMovesSubtitleEl) {
      pendingMovesSubtitleEl.textContent = text;
    }
  };

  const setPendingMovesMessage = (text, type = "info") => {
    if (!pendingMovesMessageEl) return;
    pendingMovesMessageEl.textContent = text;
    pendingMovesMessageEl.classList.remove("is-error", "is-success", "is-info");
    pendingMovesMessageEl.classList.add(`is-${type}`);
  };

  const setPendingMovesDeclineMessage = (text = "", type = "") => {
    if (!pendingMovesDeclineMessageEl) return;
    pendingMovesDeclineMessageEl.textContent = text;
    pendingMovesDeclineMessageEl.classList.remove("is-error", "is-success", "is-info");
    if (type) {
      pendingMovesDeclineMessageEl.classList.add(`is-${type}`);
    }
  };

  const closePendingMovesDeclineModal = (shouldResolve = true) => {
    if (!pendingMovesDeclineModalEl) return;
    pendingMovesDeclineModalEl.classList.add("is-hidden");
    if (pendingMovesDeclineReasonEl) {
      pendingMovesDeclineReasonEl.value = "";
    }
    if (pendingMovesDeclinePhotoInput) {
      pendingMovesDeclinePhotoInput.value = "";
    }
    setPendingMovesDeclineMessage("");
    if (pendingMovesDeclineResolver && shouldResolve) {
      pendingMovesDeclineResolver({ reason: "", photoFile: null });
      pendingMovesDeclineResolver = null;
    }
  };

  const openPendingMovesDeclineModal = () => {
    if (!pendingMovesDeclineModalEl) return;
    pendingMovesDeclineModalEl.classList.remove("is-hidden");
    if (pendingMovesDeclineReasonEl) {
      pendingMovesDeclineReasonEl.focus();
    }
  };

  const requestPendingMovesDeclineReason = () =>
    new Promise((resolve) => {
      if (!pendingMovesDeclineModalEl || !pendingMovesDeclineFormEl) {
        const reason = window.prompt("Укажите причину отказа") ?? "";
        resolve({ reason: reason.trim(), photoFile: null });
        return;
      }
      pendingMovesDeclineResolver = resolve;
      setPendingMovesDeclineMessage("");
      if (pendingMovesDeclinePhotoInput) {
        pendingMovesDeclinePhotoInput.value = "";
      }
      openPendingMovesDeclineModal();
    });

  const normalizeCollectionPayload = (raw, key) => {
    if (Array.isArray(raw)) {
      return { items: raw, wrapper: null, key: null };
    }
    if (raw && Array.isArray(raw[key])) {
      return { items: raw[key], wrapper: raw, key };
    }
    return {
      items: [],
      wrapper: raw && typeof raw === "object" ? raw : null,
      key: raw && typeof raw === "object" ? key : null,
    };
  };

  const findPendingMoveForTool = (moves, tool) => {
    if (!tool || !moves.length) return null;
    const number = String(tool?.["Номер"] ?? "").trim();
    const accounting = String(tool?.["Бух.номер"] ?? "").trim();
    const moverName = normalizePersonName(user?.full_name ?? "");
    const matchIndex = moves.findIndex((move) => {
      const responseDate = String(move?.["Дата ответа"] ?? "").trim();
      if (responseDate) return false;
      const moveNumber = String(move?.["Номер"] ?? "").trim();
      const moveAccounting = String(move?.["Бух.номер"] ?? "").trim();
      const sameTool =
        (number && moveNumber && number === moveNumber) ||
        (accounting && moveAccounting && accounting === moveAccounting);
      if (!sameTool) return false;
      const movedBy = normalizePersonName(move?.["Переместил"] ?? "");
      return moverName ? movedBy === moverName : true;
    });
    if (matchIndex < 0) return null;
    return { move: moves[matchIndex], moveIndex: matchIndex };
  };

  const openToolsCancelMoveModal = async (tool) => {
    if (!toolsCancelMoveModalEl) return;
    resetToolsCancelMoveState();
    toolsCancelMoveModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setToolsCancelMoveMessage("Проверяем перемещение...", "info");
    if (toolsCancelMoveInfoEl) {
      toolsCancelMoveInfoEl.textContent = "";
    }
    const orgFolder = context.orgFolderName ?? "";
    if (!orgFolder) {
      setToolsCancelMoveMessage("Не удалось определить организацию.", "error");
      return;
    }
    const movesPath = `./${orgFolder}/Перемещения.json`;
    try {
      const rawMoves = await loadJson(movesPath);
      const normalizedMoves = normalizeCollectionPayload(rawMoves, "moves");
      const pendingEntry = findPendingMoveForTool(
        normalizedMoves.items,
        tool
      );
      if (!pendingEntry) {
        setToolsCancelMoveMessage(
          "Перемещение не найдено или уже закрыто.",
          "error"
        );
        return;
      }
      toolsCancelMoveState.move = pendingEntry.move;
      toolsCancelMoveState.moveIndex = pendingEntry.moveIndex;
      toolsCancelMoveState.tool = tool;
      toolsCancelMoveState.movesPayload = normalizedMoves;
      if (toolsCancelMoveInfoEl) {
        toolsCancelMoveInfoEl.textContent = buildToolsCancelMoveInfo(
          tool,
          pendingEntry.move
        );
      }
      if (toolsCancelMoveConfirmButton) {
        toolsCancelMoveConfirmButton.disabled = false;
      }
      setToolsCancelMoveMessage("", "info");
    } catch (error) {
      console.warn("Не удалось загрузить перемещения для отмены.", error);
      setToolsCancelMoveMessage(
        "Не удалось загрузить перемещения. Попробуйте позже.",
        "error"
      );
    }
  };

  const closeToolsCancelMoveModal = () => {
    if (!toolsCancelMoveModalEl) return;
    toolsCancelMoveModalEl.classList.add("is-hidden");
    if (toolsModalEl && !toolsModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    setToolsCancelMoveMessage("");
    resetToolsCancelMoveState();
  };

  const applyToolsMoveCancel = async () => {
    if (toolsCancelMoveState.isSaving) return;
    const { move, moveIndex, tool, movesPayload } = toolsCancelMoveState;
    if (!move || moveIndex === null || moveIndex === undefined) {
      setToolsCancelMoveMessage(
        "Перемещение не найдено для отмены.",
        "error"
      );
      return;
    }
    toolsCancelMoveState.isSaving = true;
    setToolsCancelMoveMessage("Отменяем перемещение...", "info");
    const responseDate = formatDateValue(new Date());
    const updatedMoves = [...movesPayload.items];
    updatedMoves[moveIndex] = {
      ...move,
      "Дата ответа": responseDate,
      Ответ: "Отменено",
      "Отменил": String(user?.full_name ?? "").trim(),
      "Дата отмены": responseDate,
    };
    const movesPath = `./${context.orgFolderName}/Перемещения.json`;
    const movesPayloadOut = movesPayload.wrapper
      ? { ...movesPayload.wrapper, [movesPayload.key]: updatedMoves }
      : updatedMoves;
    try {
      await saveJson(movesPath, movesPayloadOut, { user });
      const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
      const organizationName = findUserOrganizationName(user, usersData);
      await notifyMoveCancel({
        tool,
        move: updatedMoves[moveIndex],
        orgFolder: context.orgFolderName,
        organizationName,
        canceledBy: String(user?.full_name ?? "").trim(),
      });
      setToolsCancelMoveMessage("Перемещение отменено.", "success");
      await loadUserTools();
      await refreshPendingMovesIndicator();
      setTimeout(() => {
        closeToolsCancelMoveModal();
      }, 600);
    } catch (error) {
      console.error(error);
      setToolsCancelMoveMessage("Не удалось отменить перемещение.", "error");
    } finally {
      toolsCancelMoveState.isSaving = false;
    }
  };

  const resolveMoveFineAmount = (move) => {
    const candidates = [
      move?.["Штраф за ответ"],
      move?.["Штраф"],
      move?.["Сумма штрафа"],
      move?.["Штраф (руб)"],
    ];
    for (const candidate of candidates) {
      const amount = normalizeCostValue(candidate);
      if (amount) return amount;
    }
    return 0;
  };
  const splitMoveFineByVacation = (move, totalFine, vacationStartAt) => {
    const normalizedFine = normalizeCostValue(totalFine) || 0;
    if (!normalizedFine) {
      return { beforeVacation: 0, afterVacation: 0 };
    }
    const vacationStartDate = parseDateValue(vacationStartAt);
    const moveDate = parseDateValue(move?.["Дата перемещения"]);
    const responseDate = parseDateValue(move?.["Дата ответа"]) ?? new Date();
    if (!vacationStartDate || !moveDate || !responseDate) {
      return { beforeVacation: normalizedFine, afterVacation: 0 };
    }

    const daysLimit = normalizeNumber(pendingMovesState.fineConfig?.days, 0);
    const amountPerDay = normalizeNumber(pendingMovesState.fineConfig?.amount, 0);
    if (!amountPerDay) {
      return { beforeVacation: normalizedFine, afterVacation: 0 };
    }

    const startFineAt = new Date(moveDate);
    startFineAt.setDate(startFineAt.getDate() + Math.max(0, daysLimit + 1));

    const chargedDaysTotal = Math.max(0, Math.round(normalizedFine / amountPerDay));
    if (!chargedDaysTotal) {
      return { beforeVacation: 0, afterVacation: 0 };
    }

    let beforeDays = 0;
    for (let dayIndex = 0; dayIndex < chargedDaysTotal; dayIndex += 1) {
      const dayDate = new Date(startFineAt);
      dayDate.setDate(startFineAt.getDate() + dayIndex);
      if (dayDate >= responseDate) break;
      if (dayDate < vacationStartDate) {
        beforeDays += 1;
      }
    }
    const afterDays = Math.max(0, chargedDaysTotal - beforeDays);
    const beforeVacation = beforeDays * amountPerDay;
    const afterVacation = normalizedFine - beforeVacation;
    return {
      beforeVacation: Math.max(0, beforeVacation),
      afterVacation: Math.max(0, afterVacation),
    };
  };


  const fineMoveTypeTitles = [
    "Поздний ответ",
    "Нет фото",
    "Перемещения энергетиком",
  ];

  const normalizeMoveFineType = (move) => {
    const rawType = String(
      move?.["Тип штрафа"] ?? move?.["Вид штрафа"] ?? ""
    )
      .trim()
      .toLowerCase();
    const rawReason = String(
      move?.["Причина штрафа"] ?? move?.["Причина"] ?? ""
    )
      .trim()
      .toLowerCase();
    const source = `${rawType} ${rawReason}`;
    if (source.includes("фото")) return "Нет фото";
    if (source.includes("энерг") && source.includes("перемещ")) {
      return "Перемещения энергетиком";
    }
    if (source.includes("позд") || source.includes("ответ")) {
      return "Поздний ответ";
    }
    return "Поздний ответ";
  };

  const createMoveFineSummary = () => ({
    "Штрафы по отвеченным перемещениям": 0,
    "Выставленные штрафы": 0,
    Простили: 0,
    Остаток: 0,
  });

  const createMoveFineSummaryByType = () => {
    const summaryByType = {};
    fineMoveTypeTitles.forEach((title) => {
      summaryByType[title] = createMoveFineSummary();
    });
    return summaryByType;
  };

  const applyMoveFinesSummaryUpdates = (rawFines, summaryUpdates) => {
    const fallbackBase =
      rawFines && typeof rawFines === "object" && !Array.isArray(rawFines)
        ? { ...rawFines }
        : {};
    const finesList = Array.isArray(rawFines)
      ? [...rawFines]
      : Array.isArray(fallbackBase.fines)
      ? [...fallbackBase.fines]
      : [];
    const summaryByUser =
      fallbackBase["Штрафы по пользователям"] &&
      typeof fallbackBase["Штрафы по пользователям"] === "object"
        ? { ...fallbackBase["Штрафы по пользователям"] }
        : {};

    summaryUpdates.forEach((userFineMap, userName) => {
      const normalizedUserName = String(userName ?? "").trim();
      if (!normalizedUserName) return;
      const userSummary =
        summaryByUser[normalizedUserName] &&
        typeof summaryByUser[normalizedUserName] === "object"
          ? { ...summaryByUser[normalizedUserName] }
          : createMoveFineSummaryByType();

      fineMoveTypeTitles.forEach((title) => {
        const currentTypeSummary =
          userSummary[title] && typeof userSummary[title] === "object"
            ? {
                ...createMoveFineSummary(),
                ...userSummary[title],
              }
            : createMoveFineSummary();
        const increase = normalizeCostValue(userFineMap.get(title)) || 0;
        if (increase > 0) {
          currentTypeSummary["Штрафы по отвеченным перемещениям"] =
            (
              normalizeCostValue(
                currentTypeSummary["Штрафы по отвеченным перемещениям"]
              ) || 0
            ) + increase;
          currentTypeSummary["Остаток"] =
            (normalizeCostValue(currentTypeSummary["Остаток"]) || 0) + increase;
        }
        currentTypeSummary["Выставленные штрафы"] =
          normalizeCostValue(currentTypeSummary["Выставленные штрафы"]) || 0;
        currentTypeSummary["Простили"] =
          normalizeCostValue(currentTypeSummary["Простили"]) || 0;
        userSummary[title] = currentTypeSummary;
      });
      summaryByUser[normalizedUserName] = userSummary;
    });

    return {
      ...fallbackBase,
      fines: finesList,
      "Штрафы по пользователям": summaryByUser,
    };
  };

  const buildMoveFineEntry = (move, amount, responseDate, decision, reason) => {
    const fineType = normalizeMoveFineType(move);
    const baseReason =
      String(move?.["Причина штрафа"] ?? move?.["Причина"] ?? "").trim() ||
      "Штраф за ответ";
    const entry = {
      Дата: responseDate,
      Ответственный: String(move?.["Принял"] ?? "").trim(),
      Сумма: amount,
      Причина: baseReason,
      "Тип штрафа": fineType,
    };
    return entry;
  };

  const buildToolIndexMap = (tools) => {
    const map = new Map();
    tools.forEach((tool, index) => {
      const number = String(tool?.["Номер"] ?? "").trim();
      const accounting = String(tool?.["Бух.номер"] ?? "").trim();
      if (number) map.set(`n:${number}`, index);
      if (accounting) map.set(`a:${accounting}`, index);
    });
    return map;
  };

  const renderPendingMovesList = () => {
    if (!pendingMovesListEl) return;
    pendingMovesListEl.innerHTML = "";
    const items = pendingMovesState.pendingItems;
    if (!items.length) {
      pendingMovesEmptyEl?.classList.remove("is-hidden");
      return;
    }
    pendingMovesEmptyEl?.classList.add("is-hidden");
    const table = document.createElement("div");
    table.className = "tools-table pending-moves-tools-table";

    items.forEach((item) => {
      const { move, tool, moveIndex, fineAmount } = item;
      const row = document.createElement("div");
      row.className = "tools-table__row";
      row.dataset.moveIndex = String(moveIndex);
      const numberCell = document.createElement("div");
      numberCell.className = "tools-table__cell tools-table__cell--number";
      const number =
        String(move?.["Номер"] ?? "").trim() ||
        String(move?.["Бух.номер"] ?? "").trim();
      numberCell.textContent = number || "—";

      const infoCell = document.createElement("div");
      infoCell.className = "tools-table__cell";
      const title = document.createElement("div");
      title.className = "tools-table__title";
      const meansName = String(tool?.["Наименование"] ?? "").trim();
      title.textContent = meansName || "Без названия";
      const meta = document.createElement("div");
      meta.className = "tools-table__meta tools-table__meta--stack";
      const manufacturer = String(tool?.["Производитель"] ?? "").trim();
      const model = String(tool?.["Модель"] ?? "").trim();
      const sender = String(move?.["Переместил"] ?? "").trim();
      const moveDate = String(move?.["Дата перемещения"] ?? "").trim();
      const metaLines = [
        [manufacturer, model].filter(Boolean).join(" · "),
        sender ? `Отправил: ${sender}` : "",
        moveDate ? `Дата перемещения: ${moveDate}` : "",
      ].filter(Boolean);
      metaLines.forEach((line) => {
        const lineEl = document.createElement("div");
        lineEl.className = line.includes("Отправил")
          ? "pending-move-responsible"
          : "pending-move-meta";
        lineEl.textContent = line;
        meta.appendChild(lineEl);
      });
      infoCell.append(title, meta);
      if (fineAmount > 0) {
        const fine = document.createElement("div");
        fine.className = "pending-move-fine";
        fine.textContent = `Штраф: ${formatNotificationCostWithoutCurrency(
          fineAmount
        )}`;
        infoCell.appendChild(fine);
      }

      const photoCell = document.createElement("div");
      photoCell.className = "tools-table__cell tools-table__cell--thumb";
      const thumb = document.createElement("div");
      thumb.className = "tools-table__thumb";
      const img = document.createElement("img");
      img.className = "tools-table__thumb-image";
      img.alt = meansName || "Инструмент";
      const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
      const hasPhoto = Number.isFinite(photoCount) && photoCount > 0;
      const photoNumber =
        String(tool?.["Номер"] ?? "").trim() ||
        String(tool?.["Бух.номер"] ?? "").trim() ||
        number;
      applyToolPhotoWithFallback({
        img,
        orgFolder: toolsState.orgFolder,
        toolNumber: photoNumber,
        hasPhoto,
      });
      thumb.appendChild(img);
      photoCell.appendChild(thumb);

      const actionsCell = document.createElement("div");
      actionsCell.className = "tools-table__cell tools-table__cell--actions";
      actionsCell.innerHTML = `
        <button class=\"pending-move-action pending-move-action--decline\" type=\"button\" data-pending-move-action=\"decline\" data-move-index=\"${moveIndex}\" aria-label=\"Не принять\">Не принять</button>
        <button class=\"pending-move-action pending-move-action--accept\" type=\"button\" data-pending-move-action=\"accept\" data-move-index=\"${moveIndex}\" aria-label=\"Принять\">Принять</button>
      `;
      row.append(numberCell, infoCell, photoCell, actionsCell);
      table.appendChild(row);
    });

    pendingMovesListEl.appendChild(table);
  };

  const loadPendingMovesList = async (options = {}) => {
    const orgFolder = context.orgFolderName ?? "";
    pendingMovesState.pendingItems = [];
    pendingMovesState.allMoves = [];
    pendingMovesState.fineConfig = {};
    if (!orgFolder) {
      setPendingMovesSubtitle("Организация не найдена.");
      renderPendingMovesList();
      return;
    }
    toolsState.orgFolder = orgFolder;
    setPendingMovesSubtitle("Загружаем список...");
    const movesPath = `./${orgFolder}/Перемещения.json`;
    let moves = [];
    try {
      const rawMoves = await loadJson(movesPath);
      moves = Array.isArray(rawMoves)
        ? rawMoves
        : Array.isArray(rawMoves?.moves)
          ? rawMoves.moves
          : [];
    } catch (error) {
      console.warn("Не удалось загрузить перемещения.", error);
      moves = [];
    }
    pendingMovesState.allMoves = moves;
    pendingMovesState.toolMap = await buildPendingToolsMap(orgFolder);

    const targetFullName = String(options?.targetFullName ?? "").trim();
    const pendingUserName = targetFullName || String(user?.full_name ?? "").trim();
    const userName = normalizePersonName(pendingUserName);
    const fineConfig = settingsData?.organization?.fines?.lateReply ?? {};
    const replacementMode = Boolean(options?.replacementMode);
    const vacationStartAt = String(options?.vacationStartAt ?? "").trim();
    pendingMovesState.fineConfig = fineConfig;
    pendingMovesState.targetFullName = targetFullName;
    pendingMovesState.replacementMode = replacementMode;
    pendingMovesState.vacationStartAt = vacationStartAt;
    const pendingItems = moves
      .map((move, index) => ({ move, moveIndex: index }))
      .filter(({ move }) => {
        const responseDate = String(move?.["Дата ответа"] ?? "").trim();
        if (responseDate) return false;
        const acceptedBy = normalizePersonName(move?.["Принял"] ?? "");
        if (!acceptedBy || acceptedBy !== userName) return false;
        return true;
      })
      .map((entry) => {
        const number = String(entry.move?.["Номер"] ?? "").trim();
        const accounting = String(entry.move?.["Бух.номер"] ?? "").trim();
        const tool =
          pendingMovesState.toolMap.get(`n:${number}`) ??
          pendingMovesState.toolMap.get(`a:${accounting}`) ??
          null;
        return {
          ...entry,
          tool,
          fineAmount: resolveLateReplyFine(entry.move, fineConfig),
        };
      })
      .sort((a, b) => {
        const senderA = normalizePersonName(a.move?.["Переместил"] ?? "");
        const senderB = normalizePersonName(b.move?.["Переместил"] ?? "");
        const senderCompare = senderA.localeCompare(senderB, "ru");
        if (senderCompare !== 0) return senderCompare;
        const numA =
          String(a.move?.["Номер"] ?? "").trim() ||
          String(a.move?.["Бух.номер"] ?? "").trim();
        const numB =
          String(b.move?.["Номер"] ?? "").trim() ||
          String(b.move?.["Бух.номер"] ?? "").trim();
        return numA.localeCompare(numB, "ru", { numeric: true });
      });

    pendingMovesState.pendingItems = pendingItems;
    const subtitlePrefix = targetFullName
      ? `Ожидают ответа за ${formatFullName(targetFullName)}`
      : "Ожидают ответа";
    setPendingMovesSubtitle(`${subtitlePrefix}: ${pendingItems.length}`);
    renderPendingMovesList();
  };

  const refreshPendingMovesIndicator = async () => {
    const moves = await loadUserPendingMoves(context.orgFolderName, user);
    updateEnergyPendingStat({ count: moves.length, available: moves });
  };

  const closePendingMovesModal = () => {
    if (!pendingMovesModalEl) return;
    pendingMovesModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
    if (pendingMovesMessageEl) {
      pendingMovesMessageEl.textContent = "";
      pendingMovesMessageEl.classList.remove("is-error", "is-success", "is-info");
    }
  };

  const openPendingMovesModal = async (options = {}) => {
    if (!pendingMovesModalEl) return;
    pendingMovesModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    await loadPendingMovesList(options);
  };

  const applyPendingMovesDecision = async ({ moveIndexes, decision }) => {
    if (pendingMovesState.isSaving) return;
    if (!moveIndexes.length) {
      setPendingMovesMessage("Нет перемещений для ответа.", "info");
      return;
    }
    let declineReason = "";
    let declinePhotoFile = null;
    if (decision === "Не принял") {
      const declinePayload = await requestPendingMovesDeclineReason();
      declineReason = String(declinePayload?.reason ?? "").trim();
      declinePhotoFile = declinePayload?.photoFile ?? null;
      if (!declineReason) {
        return;
      }
    }
    pendingMovesState.isSaving = true;
    setPendingMovesMessage("Сохраняем ответы...", "info");
    const updatedMoves = [...pendingMovesState.allMoves];
    const responseDate = formatDateValue(new Date());
    const declinePhotoEntries = [];
    const declinePhotoNames = new Map();
    let declinePhotoContent = "";
    if (decision === "Не принял" && declinePhotoFile) {
      try {
        declinePhotoContent = await readFileAsBase64(declinePhotoFile);
      } catch (error) {
        console.error(error);
        setPendingMovesMessage(
          "Не удалось прочитать фото отказа. Попробуйте снова.",
          "error"
        );
        pendingMovesState.isSaving = false;
        return;
      }
    }
    const acceptedFineSummaryUpdates = new Map();
    let toolsPayload = null;
    let toolsNormalized = null;
    let toolsIndexMap = null;
    if (decision === "Принял") {
      const toolsPath = `./${context.orgFolderName}/База с инструментами.json`;
      try {
        const rawTools = await loadJson(toolsPath);
        toolsNormalized = normalizeCollectionPayload(rawTools, "tools");
        toolsIndexMap = buildToolIndexMap(toolsNormalized.items);
      } catch (error) {
        console.warn("Не удалось загрузить базу инструментов.", error);
      }
    }
    const resolveToolForMove = (move) => {
      const number = String(move?.["Номер"] ?? "").trim();
      const accounting = String(move?.["Бух.номер"] ?? "").trim();
      if (toolsNormalized && toolsIndexMap) {
        const toolIndex =
          (number && toolsIndexMap.get(`n:${number}`)) ??
          (accounting && toolsIndexMap.get(`a:${accounting}`));
        if (toolIndex !== undefined) {
          return toolsNormalized.items[toolIndex];
        }
      }
      return (
        pendingMovesState.toolMap?.get(`n:${number}`) ??
        pendingMovesState.toolMap?.get(`a:${accounting}`) ??
        null
      );
    };

    moveIndexes.forEach((index) => {
      const move = updatedMoves[index];
      if (!move) return;
      const fineAmount =
        resolveMoveFineAmount(move) ||
        (decision === "Принял"
          ? resolveLateReplyFine(move, pendingMovesState.fineConfig)
          : 0);
      if (fineAmount > 0) {
        if (decision === "Принял") {
          const acceptedBy = String(move?.["Принял"] ?? "").trim();
          const fineType = normalizeMoveFineType(move);
          const isReplacementMode =
            pendingMovesState.replacementMode &&
            Boolean(pendingMovesState.targetFullName) &&
            Boolean(pendingMovesState.vacationStartAt);
          let acceptedFineAmount = fineAmount;
          let replacementFineAmount = 0;

          if (isReplacementMode) {
            const splitFine = splitMoveFineByVacation(
              move,
              fineAmount,
              pendingMovesState.vacationStartAt
            );
            acceptedFineAmount = splitFine.beforeVacation;
            replacementFineAmount = splitFine.afterVacation;
            updatedMoves[index] = {
              ...move,
              "Штраф до отпуска": acceptedFineAmount,
              "Штраф в отпуске": replacementFineAmount,
              "Ответственный в отпуске": pendingMovesState.targetFullName,
            };
          }

          const addFineToUserSummary = (fullName, amount) => {
            const normalizedUser = String(fullName ?? "").trim();
            const normalizedAmount = normalizeCostValue(amount) || 0;
            if (!normalizedUser || !normalizedAmount) return;
            if (!acceptedFineSummaryUpdates.has(normalizedUser)) {
              acceptedFineSummaryUpdates.set(normalizedUser, new Map());
            }
            const userFineMap = acceptedFineSummaryUpdates.get(normalizedUser);
            const current = normalizeCostValue(userFineMap.get(fineType)) || 0;
            userFineMap.set(fineType, current + normalizedAmount);
          };

          addFineToUserSummary(acceptedBy, acceptedFineAmount);
          if (replacementFineAmount > 0) {
            addFineToUserSummary(pendingMovesState.targetFullName, replacementFineAmount);
          }

          updatedMoves[index] = {
            ...updatedMoves[index],
            "Штраф за ответ": fineAmount,
            "Штраф по отвеченному перемещению": fineAmount,
            "Тип штрафа": fineType,
          };
        }
      }
      if (decision === "Принял" && toolsNormalized && toolsIndexMap) {
        const number = String(move?.["Номер"] ?? "").trim();
        const accounting = String(move?.["Бух.номер"] ?? "").trim();
        const toolIndex =
          (number && toolsIndexMap.get(`n:${number}`)) ??
          (accounting && toolsIndexMap.get(`a:${accounting}`));
        if (toolIndex !== undefined) {
          const tool = toolsNormalized.items[toolIndex];
          toolsNormalized.items[toolIndex] = {
            ...tool,
            Ответственный: String(move?.["Принял"] ?? "").trim(),
            Объект: String(move?.["Новый объект"] ?? "").trim(),
          };
        }
      }
      updatedMoves[index] = {
        ...updatedMoves[index],
        "Дата ответа": responseDate,
        Ответ: decision,
      };
      if (decision === "Не принял") {
        updatedMoves[index]["Причина отказа"] = declineReason;
        if (declinePhotoContent) {
          const toolNumber =
            String(move?.["Номер"] ?? "").trim() ||
            String(move?.["Бух.номер"] ?? "").trim() ||
            "без_номера";
          const fileName = buildDeclinePhotoFileName(
            toolNumber,
            responseDate,
            declinePhotoFile
          );
          updatedMoves[index]["Фото отказа"] = fileName;
          declinePhotoNames.set(index, fileName);
          declinePhotoEntries.push({
            type: "file",
            path: `${context.orgFolderName}/Фото отказов/${fileName}`,
            content: declinePhotoContent,
            encoding: "base64",
            mime: declinePhotoFile?.type || "image/*",
            ...buildUploadUserMeta({ organizationName: context.orgFullName }),
          });
        }
      }
    });
    const movesPath = `./${context.orgFolderName}/Перемещения.json`;
    if (toolsNormalized) {
      toolsPayload = toolsNormalized.wrapper
        ? { ...toolsNormalized.wrapper, [toolsNormalized.key]: toolsNormalized.items }
        : toolsNormalized.items;
    }
    let finesPayload = null;
    if (acceptedFineSummaryUpdates.size) {
      const finesPath = `./${context.orgFolderName}/Штрафы.json`;
      try {
        const rawFines = await loadJson(finesPath);
        finesPayload = applyMoveFinesSummaryUpdates(rawFines, acceptedFineSummaryUpdates);
      } catch (error) {
        finesPayload = applyMoveFinesSummaryUpdates({}, acceptedFineSummaryUpdates);
      }
    }
    try {
      if (declinePhotoEntries.length) {
        await uploadPhotoEntriesInBatches(declinePhotoEntries);
      }
      const entries = [{ path: movesPath, data: updatedMoves, user }];
      if (toolsPayload) {
        entries.push({
          path: `./${context.orgFolderName}/База с инструментами.json`,
          data: toolsPayload,
          user,
        });
      }
      if (finesPayload) {
        entries.push({
          path: `./${context.orgFolderName}/Штрафы.json`,
          data: finesPayload,
          user,
        });
      }
      await saveEntries(entries);
      pendingMovesState.allMoves = updatedMoves;
      setPendingMovesMessage("Ответы сохранены.", "success");
      const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
      const organizationName = findUserOrganizationName(user, usersData);
      const responderName = String(user?.full_name ?? "").trim();
      await Promise.all(
        moveIndexes.map(async (index) => {
          const move = updatedMoves[index];
          if (!move) return;
          const tool = resolveToolForMove(move);
          if (!tool) return;
          const declinePhotoName = declinePhotoNames.get(index);
          const declinePhotoUrl = declinePhotoName
            ? buildDeclinePhotoUrl(context.orgFolderName, declinePhotoName)
            : "";
          await notifyMoveDecision({
            tool,
            move,
            orgFolder: context.orgFolderName,
            organizationName,
            decision,
            reason: decision === "Не принял" ? declineReason : "",
            respondedBy: responderName,
            declinePhotoUrl,
          });
        })
      );
      await loadPendingMovesList({
        targetFullName: pendingMovesState.targetFullName,
        replacementMode: pendingMovesState.replacementMode,
        vacationStartAt: pendingMovesState.vacationStartAt,
      });
      await refreshPendingMovesIndicator();
    } catch (error) {
      console.error(error);
      setPendingMovesMessage("Не удалось сохранить ответы.", "error");
    } finally {
      pendingMovesState.isSaving = false;
    }
  };

  if (toolsBackdropEl) {
    toolsBackdropEl.addEventListener("click", closeToolsModal);
  }
  if (toolsCloseButton) {
    toolsCloseButton.addEventListener("click", closeToolsModal);
  }

  if (toolsOpenReplacementPendingButton) {
    toolsOpenReplacementPendingButton.addEventListener("click", () => {
      if (!toolsState.activeReplacementResponsible) return;
      closeToolsModal();
      openPendingMovesModal({
        targetFullName: toolsState.activeReplacementResponsible,
        replacementMode: true,
        vacationStartAt:
          replacementVacationStartMap.get(toolsState.activeReplacementResponsible) ?? "",
      });
    });
  }
  toolsModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeToolsModal();
    }
  });
  if (toolsEditBackdropEl) {
    toolsEditBackdropEl.addEventListener("click", closeToolsEditModal);
  }
  if (toolsEditCloseButton) {
    toolsEditCloseButton.addEventListener("click", closeToolsEditModal);
  }
  if (toolsEditCancelButton) {
    toolsEditCancelButton.addEventListener("click", closeToolsEditModal);
  }
  toolsEditModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeToolsEditModal();
    }
  });
  if (toolsInfoBackdropEl) {
    toolsInfoBackdropEl.addEventListener("click", closeToolsInfoModal);
  }
  if (toolsInfoCloseButton) {
    toolsInfoCloseButton.addEventListener("click", closeToolsInfoModal);
  }
  toolsInfoModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeToolsInfoModal();
    }
  });
  if (toolsInfoTabButtons.length) {
    toolsInfoTabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tab = button.dataset.toolsInfoTab;
        if (!tab) return;
        setToolsInfoTab(tab);
      });
    });
  }
  if (toolsEditFormEl) {
    toolsEditFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
      saveToolsEditChanges();
    });
  }
  if (toolsEditDeleteButton) {
    toolsEditDeleteButton.addEventListener("click", handleToolsEditDelete);
  }
  if (toolsEditPhotoInput) {
    toolsEditPhotoInput.addEventListener("change", () => {
      const files = Array.from(toolsEditPhotoInput.files ?? []);
      if (files.length) {
        handleToolsEditPhotoUpload(files);
      }
    });
  }
  if (toolsEditRemovePhotoButton) {
    toolsEditRemovePhotoButton.addEventListener("click", () => {
      const tool = toolsEditState.tool;
      if (!tool) return;
      if (!removePhotoModalEl) return;
      removePhotoModalEl.classList.remove("is-hidden");
      document.body.style.overflow = "hidden";
      removePhotoState.orgFolder =
        toolsEditState.orgFolder || context.orgFolderName || "";
      resetRemovePhotoSelection();
      openRemovePhotoTool(tool);
    });
  }

  if (writeOffBackdropEl) {
    writeOffBackdropEl.addEventListener("click", closeWriteOffModal);
  }
  if (writeOffCloseButton) {
    writeOffCloseButton.addEventListener("click", closeWriteOffModal);
  }
  if (writeOffCancelButton) {
    writeOffCancelButton.addEventListener("click", closeWriteOffModal);
  }
  writeOffModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeWriteOffModal();
    }
  });
  if (writeOffSearchInput) {
    writeOffSearchInput.addEventListener("input", (event) => {
      writeOffState.search = String(event.target.value ?? "").toLowerCase();
      applyWriteOffFilters();
    });
  }
  if (writeOffFilterButton) {
    writeOffFilterButton.addEventListener("click", () => {
      writeOffState.filterWriteOffOnly = !writeOffState.filterWriteOffOnly;
      updateWriteOffFilterButton();
      applyWriteOffFilters();
    });
  }
  if (writeOffListEl) {
    writeOffListEl.addEventListener("click", (event) => {
      const item = event.target.closest("[data-writeoff-id]");
      if (!item) return;
      const toolId = item.dataset.writeoffId;
      if (!toolId) return;
      if (writeOffState.selectedIds.has(toolId)) {
        writeOffState.selectedIds.delete(toolId);
        item.classList.remove("is-selected");
      } else {
        writeOffState.selectedIds.add(toolId);
        item.classList.add("is-selected");
      }
      const checkEl = item.querySelector(".writeoff-item__check");
      if (checkEl) {
        checkEl.textContent = writeOffState.selectedIds.has(toolId) ? "✓" : "";
      }
      updateWriteOffSelectionUi();
    });
  }
  if (writeOffNextButton) {
    writeOffNextButton.addEventListener("click", openWriteOffConfirmModal);
  }

  if (writeOffConfirmBackdropEl) {
    writeOffConfirmBackdropEl.addEventListener("click", closeWriteOffConfirmModal);
  }
  if (writeOffConfirmCloseButton) {
    writeOffConfirmCloseButton.addEventListener("click", closeWriteOffConfirmModal);
  }
  if (writeOffConfirmCancelButton) {
    writeOffConfirmCancelButton.addEventListener("click", closeWriteOffConfirmModal);
  }
  writeOffConfirmModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeWriteOffConfirmModal();
    }
  });
  if (writeOffConfirmFormEl) {
    writeOffConfirmFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
      applyWriteOff();
    });
  }

  if (toolsCancelMoveBackdropEl) {
    toolsCancelMoveBackdropEl.addEventListener("click", closeToolsCancelMoveModal);
  }
  if (toolsCancelMoveCloseButton) {
    toolsCancelMoveCloseButton.addEventListener("click", closeToolsCancelMoveModal);
  }
  if (toolsCancelMoveCancelButton) {
    toolsCancelMoveCancelButton.addEventListener("click", closeToolsCancelMoveModal);
  }
  if (toolsCancelMoveConfirmButton) {
    toolsCancelMoveConfirmButton.addEventListener("click", applyToolsMoveCancel);
  }
  toolsCancelMoveModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeToolsCancelMoveModal();
    }
  });

  if (pendingMovesBackdropEl) {
    pendingMovesBackdropEl.addEventListener("click", closePendingMovesModal);
  }
  if (pendingMovesCloseButton) {
    pendingMovesCloseButton.addEventListener("click", closePendingMovesModal);
  }
  pendingMovesModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePendingMovesModal();
    }
  });
  if (energyPendingWrapperEl) {
    energyPendingWrapperEl.addEventListener("click", () => {
      if (energyPendingWrapperEl.classList.contains("is-hidden")) return;
      openPendingMovesModal();
    });
  }
  if (pendingMovesListEl) {
    pendingMovesListEl.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-pending-move-action]");
      if (!actionButton) return;
      const moveIndex = Number.parseInt(
        actionButton.dataset.moveIndex ?? "",
        10
      );
      if (!Number.isFinite(moveIndex)) return;
      const action = actionButton.dataset.pendingMoveAction;
      if (action === "accept") {
        applyPendingMovesDecision({
          moveIndexes: [moveIndex],
          decision: "Принял",
        });
      } else if (action === "decline") {
        applyPendingMovesDecision({
          moveIndexes: [moveIndex],
          decision: "Не принял",
        });
      }
    });
  }
  if (pendingMovesAcceptAllButton) {
    pendingMovesAcceptAllButton.addEventListener("click", () => {
      const indexes = pendingMovesState.pendingItems.map(
        (item) => item.moveIndex
      );
      applyPendingMovesDecision({ moveIndexes: indexes, decision: "Принял" });
    });
  }
  if (pendingMovesDeclineAllButton) {
    pendingMovesDeclineAllButton.addEventListener("click", () => {
      const indexes = pendingMovesState.pendingItems.map(
        (item) => item.moveIndex
      );
      applyPendingMovesDecision({
        moveIndexes: indexes,
        decision: "Не принял",
      });
    });
  }
  if (pendingMovesDeclineBackdropEl) {
    pendingMovesDeclineBackdropEl.addEventListener("click", () =>
      closePendingMovesDeclineModal(true)
    );
  }
  if (pendingMovesDeclineCloseButton) {
    pendingMovesDeclineCloseButton.addEventListener("click", () =>
      closePendingMovesDeclineModal(true)
    );
  }
  if (pendingMovesDeclineCancelButton) {
    pendingMovesDeclineCancelButton.addEventListener("click", () =>
      closePendingMovesDeclineModal(true)
    );
  }
  if (pendingMovesDeclineFormEl) {
    pendingMovesDeclineFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
      const reason = String(pendingMovesDeclineReasonEl?.value ?? "").trim();
      if (!reason) {
        setPendingMovesDeclineMessage("Укажите причину отказа.", "error");
        pendingMovesDeclineReasonEl?.focus();
        return;
      }
      const photoFile = pendingMovesDeclinePhotoInput?.files?.[0] ?? null;
      if (photoFile && photoFile.type && !photoFile.type.startsWith("image/")) {
        setPendingMovesDeclineMessage("Добавьте фото в формате изображения.", "error");
        return;
      }
      const resolver = pendingMovesDeclineResolver;
      pendingMovesDeclineResolver = null;
      closePendingMovesDeclineModal(false);
      if (resolver) {
        resolver({ reason, photoFile });
      }
    });
  }

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

  const toolsFiltersResetButtonEl = contentEl.querySelector(
    "[data-tools-filters-reset]"
  );
  if (toolsFiltersResetButtonEl) {
    toolsFiltersResetButtonEl.addEventListener("click", () => {
      resetToolsFilters();
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

  const closeAllToolsFilterDropdowns = () => {
    toolsFilterEls.forEach((containerEl) => {
      const menuEl = containerEl.querySelector("[data-tools-filter-menu]");
      menuEl?.classList.add("is-hidden");
      containerEl.classList.remove("is-open");
    });
  };

  toolsFilterEls.forEach((containerEl) => {
    const key = containerEl.dataset.toolsFilter;
    const triggerEl = containerEl.querySelector("[data-tools-filter-trigger]");
    const menuEl = containerEl.querySelector("[data-tools-filter-menu]");
    const clearEl = containerEl.querySelector("[data-tools-filter-clear]");
    if (triggerEl && menuEl) {
      triggerEl.addEventListener("click", () => {
        const isOpen = !menuEl.classList.contains("is-hidden");
        closeAllToolsFilterDropdowns();
        menuEl.classList.toggle("is-hidden", isOpen);
        containerEl.classList.toggle("is-open", !isOpen);
      });
    }
    if (clearEl && key) {
      clearEl.addEventListener("click", () => {
        toolsState.filters[key] = [];
        syncToolsFilterValue(key, []);
        applyToolsFilters();
      });
    }

    containerEl.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;
      if (!key) return;
      const selectedValues = Array.from(
        containerEl.querySelectorAll('input[type="checkbox"][data-tools-filter-checkbox]:checked')
      )
        .map((inputEl) => String(inputEl.value ?? "").trim())
        .filter(Boolean);
      toolsState.filters[key] = selectedValues;
      if (key === "photo" && selectedValues.length > 1) {
        toolsState.filters[key] = selectedValues;
      }
      syncToolsFilterValue(key, toolsState.filters[key]);
      applyToolsFilters();
    });
  });

  if (typeof document !== "undefined") {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".tools-filter-dropdown")) return;
      closeAllToolsFilterDropdowns();
    });
  }

  toolsViewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button === toolsSearchMapViewButtonEl) {
        return;
      }
      const view = button.dataset.toolsView;
      if (!view) return;
      toolsState.view = normalizeToolsView(view);
      if (toolsState.view !== "map") {
        toolsState.previousView = toolsState.view;
      }
      syncToolsViewButtons();
      renderToolsList();
      saveToolsViewPreference(view);
    });
  });

  if (toolsSearchMapViewButtonEl) {
    toolsSearchMapViewButtonEl.addEventListener("click", () => {
      if (toolsState.mode !== "search") return;
      if (toolsState.view === "map") {
        toolsState.view = normalizeToolsView(toolsState.previousView);
      } else {
        toolsState.view = "map";
      }
      syncToolsViewButtons();
      renderToolsList();
    });
  }

  if (toolsSearchMapCanvasEl) {
    toolsSearchMapCanvasEl.addEventListener("click", () => {
      void awakenToolsSearchMap();
    });
    toolsSearchMapCanvasEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      void awakenToolsSearchMap();
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("click", (event) => {
      const trigger = event.target?.closest?.("[data-tools-map-object]");
      if (!trigger) return;
      const objectName = String(trigger.dataset.toolsMapObject ?? "").trim();
      if (!objectName) return;
      toolsState.filters.object = [objectName];
      syncToolsFilterValue("object", [objectName]);
      applyToolsFilters();
      toolsSearchMapState.map?.balloon?.close?.();
    });
  }

  function closeToolsMoveModal() {
    if (!toolsMoveModalEl) return;
    toolsMoveModalEl.classList.add("is-hidden");
    setToolsMoveMessage("");
  }

  const openToolsMoveModal = async () => {
    if (!toolsMoveModalEl) return;
    if (toolsState.mode === "base") return;
    if (toolsState.selectedIds.size === 0) return;
    const selectedTools = Array.from(toolsState.selectedIds)
      .map((id) => toolsState.toolMap.get(id))
      .filter(Boolean);
    const selectedResponsibleNames = new Set(
      selectedTools
        .map((tool) => normalizePersonName(tool?.["Ответственный"] ?? ""))
        .filter(Boolean)
    );
    setToolsMoveMessage("");
    updateToolsSelectionUi();
    const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
    const orgName = findUserOrganizationName(user, usersData);
    const normalizeOrg = (value) => String(value ?? "").trim().toLowerCase();
    const orgKey = normalizeOrg(orgName);
    const orgUsers = (usersData.users ?? []).filter(
      (entry) => normalizeOrg(entry.organization) === orgKey
    );
    const shouldSkipToolOwner = (entry) => {
      const normalizedEntryName = normalizePersonName(entry?.full_name ?? "");
      return Boolean(
        normalizedEntryName && selectedResponsibleNames.has(normalizedEntryName)
      );
    };
    const userOptions = orgUsers
      .filter((entry) => !shouldSkipToolOwner(entry))
      .map((entry) => String(entry?.full_name ?? "").trim())
      .filter(Boolean);

    toolsMoveState.responsibleOptions = Array.from(new Set(userOptions)).sort(
      (a, b) => a.localeCompare(b, "ru")
    );
    toolsMoveState.responsibleRoles = new Map(
      orgUsers
        .map((entry) => [
          normalizePersonName(entry.full_name ?? ""),
          String(entry.role ?? "").trim(),
        ])
        .filter(([name]) => name)
    );
    toolsMoveState.responsibleTelegramIds = new Map(
      orgUsers
        .map((entry) => [
          normalizePersonName(entry.full_name ?? ""),
          normalizeTelegramId(entry.telegram_id),
        ])
        .filter(([name, id]) => name && id)
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
    updateToolsMoveReasonState("");
    if (toolsMoveReasonInput) {
      toolsMoveReasonInput.value = "";
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
  if (toolsMoveResponsibleInput) {
    const syncMoveReason = () => {
      const responsibleRaw = String(toolsMoveResponsibleInput.value ?? "").trim();
      const responsible = resolveMoveOptionMatch(
        responsibleRaw,
        toolsMoveState.responsibleOptions
      );
      updateToolsMoveReasonState(responsible);
    };
    toolsMoveResponsibleInput.addEventListener("input", syncMoveReason);
    toolsMoveResponsibleInput.addEventListener("blur", syncMoveReason);
  }
  if (toolsSelectionCancelButtonEl) {
    toolsSelectionCancelButtonEl.addEventListener("click", () => {
      resetToolsSelection();
      renderToolsList();
    });
  }
  if (toolsSelectionSelectAllButtonEl) {
    toolsSelectionSelectAllButtonEl.addEventListener("click", () => {
      selectAllToolsForMove();
    });
  }

  if (toolsMoveFormEl) {
    toolsMoveFormEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      const selectedTools = Array.from(toolsState.selectedIds)
        .map((id) => toolsState.toolMap.get(id))
        .filter(Boolean);
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
      const responsibleTelegramId =
        toolsMoveState.responsibleTelegramIds.get(
          normalizePersonName(responsible)
        ) ?? null;
      const moveReason = String(toolsMoveReasonInput?.value ?? "").trim();
      if (isEnergyResponsible(responsible) && !moveReason) {
        setToolsMoveMessage("Укажите причину перемещения.", "error");
        toolsMoveReasonInput?.focus();
        return;
      }

      if (!selectedTools.length) {
        setToolsMoveMessage("Сначала выберите инструменты.", "error");
        return;
      }

      const now = new Date();
      const eligibleEntries = [];
      const eligibleTools = [];
      const isMoveByReplacement = toolsState.mode === "replacement";
      const allowMoveWithoutPhoto = toolsState.mode === "move-other";
      const vacationNote = isMoveByReplacement
        ? "Отправлено другим пользователем, так как ответственный в отпуске"
        : "";
      let skippedCount = 0;

      selectedTools.forEach((tool) => {
        const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
        const hasAccountingNumber =
          accountingNumber &&
          accountingNumber.toLowerCase() !== "нет номера";
        const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
        const hasPhoto = Number.isFinite(photoCount) && photoCount > 0;
        const isEligibleByPhoto = allowMoveWithoutPhoto ? true : hasPhoto;
        if (!hasAccountingNumber || !isEligibleByPhoto) {
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
          "Причина перемещения": moveReason,
          "Примечание к отправке": vacationNote,
          Статус: String(tool?.["Статус"] ?? "").trim(),
        });
      });

      if (!eligibleEntries.length) {
        const requirementMessage = allowMoveWithoutPhoto
          ? "Для перемещения нужен бух.номер."
          : "Для перемещения нужен бух.номер и хотя бы одно фото.";
        setToolsMoveMessage(
          requirementMessage,
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
              responsibleTelegramId,
              targetObject,
              movedBy: String(user?.full_name ?? "").trim(),
              moveReason,
              vacationNote,
              notificationId:
                toolsState.mode === "move-other" ? "moveByEnergy" : "moveTool",
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
      if (toolsState.mode === "base" || toolsState.mode === "search")
        return;
      if (toolsState.isSelecting) return;
      const item = event.target.closest("[data-tools-item]");
      if (!item) return;
      const tool = toolsState.toolMap.get(item.dataset.toolId);
      if (!isToolSelectableForMove(tool)) return;
      if (event.cancelable) {
        event.preventDefault();
      }
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
      if (toolsState.mode === "base") {
        const tool = toolsState.toolMap.get(item.dataset.toolId);
        if (tool) {
          openToolsEditModal(tool);
        }
        return;
      }
      if (toolsState.mode === "search") {
        const tool = toolsState.toolMap.get(item.dataset.toolId);
        if (tool) {
          openToolsInfoModal(tool);
        }
        return;
      }
      if (toolsSelectState.suppressClick) {
        toolsSelectState.suppressClick = false;
        return;
      }
      const tool = toolsState.toolMap.get(item.dataset.toolId);
      if (!toolsState.isSelecting) {
        if (tool) {
          openToolsInfoModal(tool);
        }
        return;
      }
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

  const buildDeclinePhotoFileName = (toolNumber, responseDate, file) => {
    const rawNumber = String(toolNumber ?? "").trim() || "без_номера";
    const nameParts = String(file?.name ?? "").split(".");
    const nameExtension =
      nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
    let extension = nameExtension;
    if (!extension && file?.type) {
      const typeParts = file.type.split("/");
      extension = typeParts[typeParts.length - 1] ?? "";
    }
    const safeExtension = extension || "jpg";
    const suffix = buildRandomSuffix(2);
    const baseName = `${rawNumber}_${responseDate}_${suffix}.${safeExtension}`;
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
    if (
      toolsEditState.tool &&
      normalizeToolNumberValue(toolsEditState.tool?.["Номер"] ?? "") ===
        normalized
    ) {
      const current = Number.parseInt(
        toolsEditState.tool?.["Количество фото"] ?? 0,
        10
      );
      const safeCurrent = Number.isFinite(current) ? current : 0;
      const nextCount = safeCurrent + 1;
      toolsEditState.tool = { ...toolsEditState.tool, "Количество фото": nextCount };
      updateToolsEditPhotoCount(nextCount);
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

  const setNoPhotoSubtitle = (text) => {
    if (noPhotoSubtitleEl) {
      noPhotoSubtitleEl.textContent = text;
    }
  };

  const clearNoPhotoList = () => {
    if (noPhotoListEl) {
      noPhotoListEl.innerHTML = "";
    }
  };

  const renderNoPhotoTable = (items) => {
    const table = document.createElement("div");
    table.className = "tools-table tools-table--no-photo";

    items.forEach((tool) => {
      const row = document.createElement("div");
      row.className = "tools-table__row tools-table__row--no-photo";
      row.dataset.noPhotoId = tool.__noPhotoId;

      const numberCell = document.createElement("div");
      numberCell.className = "tools-table__cell tools-table__cell--number";
      const number = String(tool?.["Номер"] ?? "").trim();
      numberCell.textContent = number || "—";

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
      const status = String(tool?.["Статус"] ?? "").trim();

      const accountingLine = document.createElement("div");
      accountingLine.textContent = `Бух.номер: ${accountingNumber || "—"}`;
      const detailsLine = document.createElement("div");
      detailsLine.textContent = [
        `Производитель: ${manufacturer || "—"}`,
        `Модель: ${model || "—"}`,
        status ? `Статус: ${status}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      meta.append(accountingLine, detailsLine);
      infoCell.append(title, meta);

      const actionCell = document.createElement("div");
      actionCell.className = "tools-table__cell tools-table__cell--action";
      const actionButton = document.createElement("button");
      actionButton.className = "action-secondary";
      actionButton.type = "button";
      actionButton.dataset.noPhotoOpen = "true";
      actionButton.textContent = "Карточка";
      actionCell.appendChild(actionButton);

      row.append(numberCell, infoCell, actionCell);
      table.appendChild(row);
    });

    return table;
  };

  const renderNoPhotoList = () => {
    if (!noPhotoListEl) return;
    clearNoPhotoList();
    noPhotoListEl.classList.add("is-table");
    const items = noPhotoState.filtered;
    noPhotoListEl.appendChild(renderNoPhotoTable(items));
    if (noPhotoEmptyEl) {
      noPhotoEmptyEl.classList.toggle("is-hidden", items.length > 0);
    }
    setNoPhotoSubtitle(
      `Показано ${items.length} из ${noPhotoState.tools.length}`
    );
  };

  const applyNoPhotoFilters = () => {
    const search = noPhotoState.search.trim();
    const tokens = search ? search.split(/\s+/).filter(Boolean) : [];
    noPhotoState.filtered = noPhotoState.tools.filter((tool) => {
      if (
        noPhotoState.filters.group &&
        String(tool?.["Граппа инструментов"] ?? "").trim() !==
          noPhotoState.filters.group
      ) {
        return false;
      }
      if (
        noPhotoState.filters.status &&
        String(tool?.["Статус"] ?? "").trim() !== noPhotoState.filters.status
      ) {
        return false;
      }
      if (
        noPhotoState.filters.object &&
        String(tool?.["Объект"] ?? "").trim() !== noPhotoState.filters.object
      ) {
        return false;
      }
      if (
        noPhotoState.filters.manufacturer &&
        String(tool?.["Производитель"] ?? "").trim() !==
          noPhotoState.filters.manufacturer
      ) {
        return false;
      }
      if (
        noPhotoState.filters.model &&
        String(tool?.["Модель"] ?? "").trim() !== noPhotoState.filters.model
      ) {
        return false;
      }
      if (tokens.length) {
        const searchLine = tool.__searchLine ?? "";
        return tokens.every((token) => searchLine.includes(token));
      }
      return true;
    });
    renderNoPhotoList();
  };

  const fillNoPhotoFilterOptions = (key, values) => {
    const selectEl = contentEl.querySelector(
      `[data-no-photo-filter="${key}"]`
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
    selectEl.value = noPhotoState.filters[key] ?? "";
  };

  const prepareNoPhotoFilters = () => {
    const collectValues = (field) => {
      const set = new Set();
      noPhotoState.tools.forEach((tool) => {
        const value = String(tool?.[field] ?? "").trim();
        if (value) set.add(value);
      });
      return Array.from(set).sort((a, b) =>
        a.localeCompare(b, "ru", { numeric: true })
      );
    };
    fillNoPhotoFilterOptions("group", collectValues("Граппа инструментов"));
    fillNoPhotoFilterOptions("status", collectValues("Статус"));
    fillNoPhotoFilterOptions("object", collectValues("Объект"));
    fillNoPhotoFilterOptions("manufacturer", collectValues("Производитель"));
    fillNoPhotoFilterOptions("model", collectValues("Модель"));
  };

  const loadNoPhotoTools = async () => {
    const orgFolder = context.orgFolderName ?? "";
    noPhotoState.orgFolder = orgFolder;
    if (!orgFolder) {
      noPhotoState.tools = [];
      noPhotoState.filtered = [];
      noPhotoState.toolMap.clear();
      setNoPhotoSubtitle("Не удалось определить организацию.");
      renderNoPhotoList();
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
    noPhotoState.toolMap.clear();
    noPhotoState.tools = rawTools
      .filter((tool) => {
        const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
        return !(Number.isFinite(photoCount) && photoCount > 0);
      })
      .map((tool, index) => {
        const selectionId = buildToolSelectionId(tool, index);
        const entry = {
          ...tool,
          __searchLine: buildAddPhotoSearchLine(tool),
          __noPhotoId: selectionId,
        };
        noPhotoState.toolMap.set(selectionId, entry);
        return entry;
      })
      .sort((a, b) =>
        String(a?.["Номер"] ?? "").localeCompare(String(b?.["Номер"] ?? ""), "ru", {
          numeric: true,
        })
      );
    prepareNoPhotoFilters();
    applyNoPhotoFilters();
  };

  const openNoPhotoModal = async () => {
    if (!noPhotoModalEl) return;
    noPhotoModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setNoPhotoSubtitle("Загружаем список...");
    await loadNoPhotoTools();
    if (
      noPhotoSearchInput &&
      (typeof window === "undefined" ||
        !window.matchMedia ||
        !window.matchMedia("(max-width: 520px)").matches)
    ) {
      noPhotoSearchInput.focus();
    }
  };

  const closeNoPhotoModal = () => {
    if (!noPhotoModalEl) return;
    noPhotoModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
  };

  if (noPhotoBackdropEl) {
    noPhotoBackdropEl.addEventListener("click", closeNoPhotoModal);
  }
  if (noPhotoCloseButton) {
    noPhotoCloseButton.addEventListener("click", closeNoPhotoModal);
  }
  noPhotoModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNoPhotoModal();
    }
  });

  if (noPhotoSearchInput) {
    noPhotoSearchInput.addEventListener("input", (event) => {
      noPhotoState.search = String(event.target.value ?? "").toLowerCase();
      applyNoPhotoFilters();
    });
  }

  const setNoPhotoFiltersOpen = (isOpen) => {
    if (noPhotoFiltersPanelEl) {
      noPhotoFiltersPanelEl.classList.toggle("is-open", isOpen);
    }
    if (noPhotoFiltersToggleEl) {
      noPhotoFiltersToggleEl.setAttribute("aria-expanded", String(isOpen));
    }
  };

  if (noPhotoFiltersToggleEl) {
    noPhotoFiltersToggleEl.addEventListener("click", () => {
      const isOpen = noPhotoFiltersPanelEl?.classList.contains("is-open");
      setNoPhotoFiltersOpen(!isOpen);
    });
  }

  if (typeof window !== "undefined" && noPhotoFiltersPanelEl) {
    const mediaQuery = window.matchMedia("(max-width: 520px)");
    const syncFiltersVisibility = () => {
      setNoPhotoFiltersOpen(!mediaQuery.matches);
    };
    syncFiltersVisibility();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", syncFiltersVisibility);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(syncFiltersVisibility);
    }
  }

  noPhotoFilterEls.forEach((selectEl) => {
    selectEl.addEventListener("change", (event) => {
      const target = event.target;
      const key = target?.dataset?.noPhotoFilter;
      if (!key) return;
      noPhotoState.filters[key] = String(target.value ?? "");
      applyNoPhotoFilters();
    });
  });

  if (noPhotoListEl) {
    noPhotoListEl.addEventListener("click", (event) => {
      const row = event.target.closest("[data-no-photo-id]");
      if (!row) return;
      const toolId = row.dataset.noPhotoId;
      if (!toolId) return;
      const tool = noPhotoState.toolMap.get(toolId);
      if (!tool) return;
      openToolsInfoModal(tool);
    });
  }

  const setRemovePhotoSubtitle = (text) => {
    if (removePhotoSubtitleEl) {
      removePhotoSubtitleEl.textContent = text;
    }
  };

  const setRemovePhotoMessage = (text = "", tone = "") => {
    if (!removePhotoMessageEl) return;
    removePhotoMessageEl.textContent = text;
    removePhotoMessageEl.classList.toggle("is-error", tone === "error");
    removePhotoMessageEl.classList.toggle("is-success", tone === "success");
    if (!tone) {
      removePhotoMessageEl.classList.remove("is-error", "is-success");
    }
  };

  const setRemovePhotoView = (view) => {
    removePhotoViews.forEach((viewEl) => {
      const isActive = viewEl.dataset.removePhotoView === view;
      viewEl.classList.toggle("is-hidden", !isActive);
    });
    if (view === "list") {
      setRemovePhotoMessage("");
    }
  };

  const clearRemovePhotoList = () => {
    if (removePhotoListEl) {
      removePhotoListEl.innerHTML = "";
    }
  };

  const buildRemovePhotoThumb = ({
    orgFolder,
    toolNumber,
    hasPhoto,
    altText,
  }) => {
    const thumb = document.createElement("div");
    thumb.className = "tools-table__thumb remove-photo-thumb";
    const img = document.createElement("img");
    img.className = "tools-table__thumb-image";
    img.alt = altText;
    applyToolPhotoWithFallback({
      img,
      orgFolder,
      toolNumber,
      hasPhoto,
    });
    thumb.appendChild(img);
    return thumb;
  };

  const renderRemovePhotoTable = (items) => {
    const table = document.createElement("div");
    table.className = "tools-table tools-table--remove-photo";

    items.forEach((tool) => {
      const row = document.createElement("div");
      row.className = "tools-table__row remove-photo-row";
      row.dataset.removePhotoToolId = tool.__removeId;
      row.dataset.removePhotoSelect = "true";
      row.setAttribute("role", "button");
      row.tabIndex = 0;

      const numberCell = document.createElement("div");
      numberCell.className = "tools-table__cell tools-table__cell--number";
      const number = resolveToolNumberValue(tool);
      numberCell.textContent = number || "—";

      const infoCell = document.createElement("div");
      infoCell.className = "tools-table__cell";
      const title = document.createElement("div");
      title.className = "tools-table__title";
      const name = String(tool?.["Наименование"] ?? "").trim();
      title.textContent = name || "Без названия";
      const meta = document.createElement("div");
      meta.className = "tools-table__meta tools-table__meta--stack";
      const manufacturer = String(tool?.["Производитель"] ?? "").trim();
      const model = String(tool?.["Модель"] ?? "").trim();
      const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
      const count = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
      const safeCount = Number.isFinite(count) ? count : 0;
      meta.innerHTML = `
        <div>Производитель: ${manufacturer || "—"} · Модель: ${model || "—"}</div>
        <div>Бух.номер: ${accountingNumber || "—"}</div>
        <div class="remove-photo-count">Фото: ${safeCount}</div>
      `;
      infoCell.append(title, meta);

      const photoCell = document.createElement("div");
      photoCell.className = "tools-table__cell tools-table__cell--thumb";
      const photoNumber = resolveToolPhotoNumber(tool);
      const thumb = buildRemovePhotoThumb({
        orgFolder: removePhotoState.orgFolder,
        toolNumber: photoNumber,
        hasPhoto: safeCount > 0,
        altText: name || "Инструмент",
      });
      photoCell.appendChild(thumb);

      row.append(numberCell, infoCell, photoCell);
      table.appendChild(row);
    });

    return table;
  };

  const renderRemovePhotoList = () => {
    if (!removePhotoListEl) return;
    clearRemovePhotoList();
    const items = removePhotoState.filtered;
    removePhotoListEl.classList.add("is-table");
    removePhotoListEl.appendChild(renderRemovePhotoTable(items));
    if (removePhotoEmptyEl) {
      removePhotoEmptyEl.classList.toggle("is-hidden", items.length > 0);
    }
    setRemovePhotoSubtitle(
      `Показано ${items.length} из ${removePhotoState.tools.length}`
    );
  };

  const applyRemovePhotoFilters = () => {
    const search = removePhotoState.search.trim();
    const tokens = search ? search.split(/\s+/).filter(Boolean) : [];
    if (!tokens.length) {
      removePhotoState.filtered = removePhotoState.tools.slice();
      renderRemovePhotoList();
      return;
    }
    const numericTokens = tokens
      .map((token) => token.replace(/\D/g, ""))
      .filter(Boolean);
    const isNumericSearch = numericTokens.length === tokens.length;
    if (isNumericSearch) {
      const numberMatches = removePhotoState.tools.filter((tool) => {
        const searchLine = tool.__numberSearchLine ?? "";
        return numericTokens.every((token) => searchLine.includes(token));
      });
      if (numberMatches.length) {
        removePhotoState.filtered = numberMatches;
        renderRemovePhotoList();
        return;
      }
      removePhotoState.filtered = removePhotoState.tools.filter((tool) => {
        const searchLine = tool.__accountingSearchLine ?? "";
        return numericTokens.every((token) => searchLine.includes(token));
      });
      renderRemovePhotoList();
      return;
    }
    removePhotoState.filtered = removePhotoState.tools.filter((tool) => {
      const searchLine = tool.__searchLine ?? "";
      return tokens.every((token) => searchLine.includes(token));
    });
    renderRemovePhotoList();
  };

  const loadRemovePhotoTools = async () => {
    const orgFolder = context.orgFolderName ?? "";
    removePhotoState.orgFolder = orgFolder;
    if (!orgFolder) {
      removePhotoState.tools = [];
      removePhotoState.filtered = [];
      setRemovePhotoSubtitle("Не удалось определить организацию.");
      renderRemovePhotoList();
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
    removePhotoState.toolMap.clear();
    removePhotoState.tools = rawTools
      .filter((tool) => {
        const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
        return Number.isFinite(photoCount) && photoCount > 0;
      })
      .map((tool, index) => {
        const entry = {
          ...tool,
          __removeId: `remove-${index}`,
          __searchLine: buildRemovePhotoSearchLine(tool),
          __numberSearchLine: buildRemovePhotoNumberSearchLine(tool?.["Номер"]),
          __accountingSearchLine: buildRemovePhotoNumberSearchLine(
            tool?.["Бух.номер"]
          ),
        };
        removePhotoState.toolMap.set(entry.__removeId, entry);
        return entry;
      })
      .sort((a, b) =>
        resolveToolNumberValue(a).localeCompare(resolveToolNumberValue(b), "ru", {
          numeric: true,
        })
      );
    applyRemovePhotoFilters();
  };

  const resetRemovePhotoSelection = () => {
    removePhotoState.selectedTool = null;
    removePhotoState.toolPhotos = [];
    removePhotoState.selectedFiles.clear();
    if (removePhotoToolTitleEl) removePhotoToolTitleEl.textContent = "";
    if (removePhotoToolMetaEl) removePhotoToolMetaEl.textContent = "";
    if (removePhotoPhotosEl) removePhotoPhotosEl.innerHTML = "";
    if (removePhotoPhotosEmptyEl) {
      removePhotoPhotosEmptyEl.classList.add("is-hidden");
    }
    if (removePhotoSelectedCountEl) {
      removePhotoSelectedCountEl.textContent = "0";
    }
    if (removePhotoDeleteButton) {
      removePhotoDeleteButton.disabled = true;
    }
  };

  const getToolNumberFromFileName = (fileName) => {
    if (!fileName) return "";
    const match = String(fileName).match(/^(?:№|N)?\s*(\d+)/i);
    return match ? match[1] : "";
  };

  const listPhotoFilesViaEndpoint = async (orgFolder) => {
    if (!orgFolder) return [];
    const payload = JSON.stringify({
      entries: [
        {
          type: "list-photos",
          path: `${orgFolder}/Фото инструментов`,
          ...buildUploadUserMeta({ organizationName: context.orgFullName }),
        },
      ],
    });
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
        `Не удалось загрузить каталог фото. Код ответа: ${response.status}.`;
      throw new Error(message);
    }
    if (!responseText) return [];
    try {
      const parsed = JSON.parse(responseText);
      return Array.isArray(parsed?.files) ? parsed.files : [];
    } catch (error) {
      console.warn("Не удалось распарсить список фото.", error);
      return [];
    }
  };

  const loadToolPhotoFiles = async (orgFolder, ...toolNumbers) => {
    if (!orgFolder) return { files: [], errorMessage: "" };
    const numbers = toolNumbers
      .flat()
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);
    if (!numbers.length) return { files: [], errorMessage: "" };
    const variants = numbers.flatMap((value) => getToolNumberVariants(value));
    if (!variants.length) return { files: [], errorMessage: "" };
    const normalizedVariants = new Set(
      variants.map((variant) => normalizeToolNumberValue(variant))
    );
    const files = [];
    const seen = new Set();
    const registerFileName = (fileName) => {
      if (!fileName) return;
      let decodedName = fileName;
      try {
        decodedName = decodeURIComponent(fileName);
      } catch (error) {
        decodedName = fileName;
      }
      const extension = decodedName.split(".").pop()?.toLowerCase() || "";
      if (!toolPhotoExtensions.has(extension)) return;
      const leadingNumber = getToolNumberFromFileName(decodedName);
      if (!leadingNumber) return;
      const normalized = normalizeToolNumberValue(leadingNumber);
      if (
        !normalizedVariants.has(normalized) &&
        !normalizedVariants.has(leadingNumber)
      ) {
        return;
      }
      if (seen.has(decodedName)) return;
      seen.add(decodedName);
      files.push({
        name: decodedName,
        url: `./${orgFolder}/Фото инструментов/${encodeURIComponent(decodedName)}`,
      });
    };
    let endpointError = "";
    try {
      const endpointFiles = await listPhotoFilesViaEndpoint(orgFolder);
      if (endpointFiles.length) {
        endpointFiles.forEach(registerFileName);
        return {
          files: files.sort((a, b) =>
            a.name.localeCompare(b.name, "ru", { numeric: true })
          ),
          errorMessage: "",
        };
      }
    } catch (error) {
      endpointError = error?.message || "";
    }
    const folderPath = `./${orgFolder}/Фото инструментов/`;
    let response;
    let errorMessage = "";
    try {
      response = await fetch(folderPath, { cache: "no-store" });
    } catch (error) {
      console.warn("Не удалось загрузить каталог фото.", error);
      return {
        files: [],
        errorMessage: "Не удалось загрузить каталог фото. Проверьте подключение.",
      };
    }
    if (!response.ok) {
      return {
        files: [],
        errorMessage:
          endpointError ||
          `Не удалось загрузить каталог фото. Код ответа: ${response.status}.`,
      };
    }
    const html = await response.text();
    const links = extractDirectoryListingLinks(html);
    links.forEach((link) => {
      const fileName = extractFileNameFromHref(link);
      registerFileName(fileName);
    });
    return {
      files: files.sort((a, b) =>
        a.name.localeCompare(b.name, "ru", { numeric: true })
      ),
      errorMessage,
    };
  };

  const updateRemovePhotoSelection = () => {
    if (removePhotoSelectedCountEl) {
      removePhotoSelectedCountEl.textContent = String(
        removePhotoState.selectedFiles.size
      );
    }
    if (removePhotoDeleteButton) {
      removePhotoDeleteButton.disabled = removePhotoState.selectedFiles.size === 0;
    }
  };

  const renderRemovePhotoPhotos = () => {
    if (!removePhotoPhotosEl) return;
    removePhotoPhotosEl.innerHTML = "";
    removePhotoState.selectedFiles.clear();
    updateRemovePhotoSelection();
    const files = removePhotoState.toolPhotos;
    if (!files.length) {
      if (removePhotoPhotosEmptyEl) {
        removePhotoPhotosEmptyEl.classList.remove("is-hidden");
      }
      return;
    }
    if (removePhotoPhotosEmptyEl) {
      removePhotoPhotosEmptyEl.classList.add("is-hidden");
    }
    files.forEach((file) => {
      const card = document.createElement("label");
      card.className = "remove-photo-card";
      card.dataset.photoName = file.name;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "remove-photo-checkbox";
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          removePhotoState.selectedFiles.add(file.name);
          card.classList.add("is-selected");
        } else {
          removePhotoState.selectedFiles.delete(file.name);
          card.classList.remove("is-selected");
        }
        updateRemovePhotoSelection();
      });

      const img = document.createElement("img");
      img.src = file.url;
      img.alt = "Фото инструмента";
      img.loading = "lazy";
      img.className = "remove-photo-image";

      const name = document.createElement("span");
      name.className = "remove-photo-name";
      name.textContent = file.name;

      card.append(checkbox, img, name);
      removePhotoPhotosEl.appendChild(card);
    });
  };

  const openRemovePhotoTool = async (tool) => {
    if (!tool) return;
    resetRemovePhotoSelection();
    removePhotoState.selectedTool = tool;
    const toolNumber = resolveToolNumberValue(tool);
    const toolName = String(tool?.["Наименование"] ?? "").trim() || "Инструмент";
    const manufacturer = String(tool?.["Производитель"] ?? "").trim();
    const model = String(tool?.["Модель"] ?? "").trim();
    if (removePhotoToolTitleEl) {
      removePhotoToolTitleEl.textContent = `${toolName} · №${toolNumber || "—"}`;
    }
    if (removePhotoToolMetaEl) {
      removePhotoToolMetaEl.textContent = [manufacturer, model]
        .filter(Boolean)
        .join(" · ");
    }
    setRemovePhotoSubtitle("Выберите фото для удаления");
    setRemovePhotoMessage("Загружаем фото...");
    setRemovePhotoView("photos");
    const primaryPhotoNumber = resolveToolPhotoNumber(tool);
    const numberValue = String(tool?.["Номер"] ?? "").trim();
    const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
    const { files, errorMessage } = await loadToolPhotoFiles(
      removePhotoState.orgFolder,
      primaryPhotoNumber,
      numberValue,
      accountingNumber
    );
    removePhotoState.toolPhotos = files;
    if (errorMessage) {
      setRemovePhotoMessage(errorMessage, "error");
    } else {
      setRemovePhotoMessage("");
    }
    renderRemovePhotoPhotos();
  };

  const syncToolsPhotoCountAfterDelete = (toolNumber, nextCount) => {
    if (nextCount === null) return;
    const normalized = normalizeToolNumberValue(toolNumber);
    const updateTool = (tool) => {
      if (normalizeToolNumberValue(tool?.["Номер"] ?? "") !== normalized) {
        return tool;
      }
      return {
        ...tool,
        "Количество фото": nextCount,
      };
    };
    if (toolsState.tools.length) {
      toolsState.tools = toolsState.tools.map(updateTool);
      toolsState.filtered = toolsState.filtered.map(updateTool);
      if (toolsModalEl && !toolsModalEl.classList.contains("is-hidden")) {
        applyToolsFilters();
      }
    }
    removePhotoState.tools = removePhotoState.tools
      .map(updateTool)
      .filter((tool) => {
        const count = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
        return Number.isFinite(count) && count > 0;
      });
    applyRemovePhotoFilters();
    if (
      toolsEditState.tool &&
      normalizeToolNumberValue(toolsEditState.tool?.["Номер"] ?? "") ===
        normalized
    ) {
      toolsEditState.tool = {
        ...toolsEditState.tool,
        "Количество фото": nextCount,
      };
      updateToolsEditPhotoCount(nextCount);
    }
  };

  const handleRemovePhotoDelete = async () => {
    const tool = removePhotoState.selectedTool;
    if (!tool) return;
    const orgFolder = removePhotoState.orgFolder;
    if (!orgFolder) return;
    const selectedFiles = Array.from(removePhotoState.selectedFiles);
    if (!selectedFiles.length) return;
    const confirmDelete = window.confirm(
      `Удалить выбранные фото (${selectedFiles.length})?`
    );
    if (!confirmDelete) return;
    setRemovePhotoMessage("Удаляем фото...");
    try {
      const deleteEntries = selectedFiles.map((fileName) => ({
        type: "delete-file",
        path: `${orgFolder}/Фото инструментов/${fileName}`,
        ...buildUploadUserMeta({ organizationName: context.orgFullName }),
      }));
      await saveEntriesViaEndpoint(deleteEntries);

      const tools = await loadToolsData(orgFolder);
      const normalized = normalizeToolNumberValue(tool?.["Номер"] ?? "");
      const toolIndex = tools.findIndex(
        (entry) =>
          normalizeToolNumberValue(entry?.["Номер"] ?? "") === normalized
      );
      let nextCount = null;
      if (toolIndex >= 0) {
        const current = Number.parseInt(
          tools[toolIndex]?.["Количество фото"] ?? 0,
          10
        );
        const safeCurrent = Number.isFinite(current) ? current : 0;
        nextCount = Math.max(0, safeCurrent - selectedFiles.length);
        tools[toolIndex] = {
          ...tools[toolIndex],
          "Количество фото": nextCount,
        };
        await saveEntries([
          {
            path: `${orgFolder}/База с инструментами.json`,
            data: tools,
            ...buildUploadUserMeta({ organizationName: context.orgFullName }),
          },
        ]);
      }

      removePhotoState.toolPhotos = removePhotoState.toolPhotos.filter(
        (file) => !removePhotoState.selectedFiles.has(file.name)
      );
      removePhotoState.selectedFiles.clear();
      updateRemovePhotoSelection();
      renderRemovePhotoPhotos();
      syncToolsPhotoCountAfterDelete(tool?.["Номер"] ?? "", nextCount);
      if (!removePhotoState.toolPhotos.length) {
        setRemovePhotoMessage("Фото удалены. Возвращаемся к списку.", "success");
        setTimeout(() => {
          setRemovePhotoView("list");
          resetRemovePhotoSelection();
        }, 500);
        return;
      }
      setRemovePhotoMessage("Фото удалены.", "success");
    } catch (error) {
      console.error(error);
      setRemovePhotoMessage(
        "Не удалось удалить фото. Проверьте сервер.",
        "error"
      );
    }
  };

  const openRemovePhotoModal = async () => {
    if (!removePhotoModalEl) return;
    removePhotoModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setRemovePhotoView("list");
    resetRemovePhotoSelection();
    setRemovePhotoSubtitle("Загружаем список...");
    await loadRemovePhotoTools();
    if (
      removePhotoSearchInput &&
      (typeof window === "undefined" ||
        !window.matchMedia ||
        !window.matchMedia("(max-width: 520px)").matches)
    ) {
      removePhotoSearchInput.focus();
    }
  };

  const closeRemovePhotoModal = () => {
    if (!removePhotoModalEl) return;
    removePhotoModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
  };

  if (removePhotoBackdropEl) {
    removePhotoBackdropEl.addEventListener("click", closeRemovePhotoModal);
  }
  if (removePhotoCloseButton) {
    removePhotoCloseButton.addEventListener("click", closeRemovePhotoModal);
  }
  removePhotoModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeRemovePhotoModal();
    }
  });
  if (removePhotoBackButton) {
    removePhotoBackButton.addEventListener("click", () => {
      setRemovePhotoView("list");
      resetRemovePhotoSelection();
    });
  }
  if (removePhotoSearchInput) {
    removePhotoSearchInput.addEventListener("input", (event) => {
      removePhotoState.search = String(event.target.value ?? "").toLowerCase();
      applyRemovePhotoFilters();
    });
  }
  if (removePhotoListEl) {
    removePhotoListEl.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-photo-select]");
      if (!button) return;
      const toolId = button.dataset.removePhotoToolId;
      if (!toolId) return;
      const tool = removePhotoState.toolMap.get(toolId);
      openRemovePhotoTool(tool);
    });
    removePhotoListEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target.closest("[data-remove-photo-select]");
      if (!target) return;
      event.preventDefault();
      const toolId = target.dataset.removePhotoToolId;
      if (!toolId) return;
      const tool = removePhotoState.toolMap.get(toolId);
      openRemovePhotoTool(tool);
    });
  }
  if (removePhotoDeleteButton) {
    removePhotoDeleteButton.addEventListener("click", handleRemovePhotoDelete);
  }
  const setBreakdownsSubtitle = (text) => {
    if (breakdownsSubtitleEl) {
      breakdownsSubtitleEl.textContent = text;
    }
  };

  const setBreakdownsMessage = (text = "", tone = "") => {
    if (!breakdownsMessageEl) return;
    breakdownsMessageEl.textContent = text;
    breakdownsMessageEl.classList.remove("is-error", "is-success", "is-info");
    if (tone) {
      breakdownsMessageEl.classList.add(`is-${tone}`);
    }
  };

  const setRepairSubtitle = (text) => {
    if (repairSubtitleEl) {
      repairSubtitleEl.textContent = text;
    }
  };

  const setRepairMessage = (text = "", tone = "") => {
    if (!repairMessageEl) return;
    repairMessageEl.textContent = text;
    repairMessageEl.classList.remove("is-error", "is-success", "is-info");
    if (tone) {
      repairMessageEl.classList.add(`is-${tone}`);
    }
  };

  const setRepairFormMessage = (text = "", tone = "") => {
    if (!repairFormMessageEl) return;
    repairFormMessageEl.textContent = text;
    repairFormMessageEl.classList.remove("is-error", "is-success", "is-info");
    if (tone) {
      repairFormMessageEl.classList.add(`is-${tone}`);
    }
  };

  const clearRepairFormFieldErrors = () => {
    repairFormEl
      ?.querySelectorAll(".form-field.is-invalid")
      .forEach((field) => field.classList.remove("is-invalid"));
  };

  const markRepairFormFieldError = (target) => {
    const field = target?.closest?.(".form-field");
    if (field) {
      field.classList.add("is-invalid");
    }
  };

  const setBreakdownFormMessage = (text = "", tone = "") => {
    if (!breakdownFormMessageEl) return;
    breakdownFormMessageEl.textContent = text;
    breakdownFormMessageEl.classList.remove("is-error", "is-success", "is-info");
    if (tone) {
      breakdownFormMessageEl.classList.add(`is-${tone}`);
    }
  };

  const setBreakdownStatusMessage = (text = "", tone = "") => {
    if (!breakdownStatusMessageEl) return;
    breakdownStatusMessageEl.textContent = text;
    breakdownStatusMessageEl.classList.remove(
      "is-error",
      "is-success",
      "is-info"
    );
    if (tone) {
      breakdownStatusMessageEl.classList.add(`is-${tone}`);
    }
  };

  const clearBreakdownPhotoPreview = () => {
    if (!breakdownPhotoPreviewEl) return;
    breakdownPhotoPreviewEl.querySelectorAll("img").forEach((img) => {
      const url = img.dataset.objectUrl;
      if (url) {
        URL.revokeObjectURL(url);
      }
    });
    breakdownPhotoPreviewEl.innerHTML = "";
  };

  const updateBreakdownPhotoPreview = () => {
    if (!breakdownPhotoPreviewEl) return;
    clearBreakdownPhotoPreview();
    if (breakdownPhotoCountEl) {
      breakdownPhotoCountEl.textContent = String(breakdownsState.photos.length);
    }
    breakdownsState.photos.forEach((file, index) => {
      const item = document.createElement("div");
      item.className = "breakdown-photo-item";

      const img = document.createElement("img");
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      img.alt = "Фото поломки";
      img.dataset.objectUrl = objectUrl;
      item.appendChild(img);

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "breakdown-photo-remove";
      removeButton.textContent = "×";
      removeButton.setAttribute("aria-label", "Удалить фото");
      removeButton.addEventListener("click", () => {
        breakdownsState.photos.splice(index, 1);
        updateBreakdownPhotoPreview();
      });
      item.appendChild(removeButton);
      breakdownPhotoPreviewEl.appendChild(item);
    });
  };

  const buildBreakdownPhotoFileName = (toolNumber, dateValue, file) => {
    const rawNumber = String(toolNumber ?? "").trim() || "без_номера";
    const nameParts = String(file?.name ?? "").split(".");
    const nameExtension =
      nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
    let extension = nameExtension;
    if (!extension && file?.type) {
      const typeParts = file.type.split("/");
      extension = typeParts[typeParts.length - 1] ?? "";
    }
    const safeExtension = extension || "jpg";
    const suffix = buildRandomSuffix(2);
    const baseName = `${rawNumber}_${dateValue}_${suffix}.${safeExtension}`;
    return sanitizePhotoFileName(baseName);
  };

  let breakdownCameraStream = null;
  let breakdownCameraBlob = null;

  const resetBreakdownCameraUI = () => {
    if (breakdownCameraVideoEl) {
      breakdownCameraVideoEl.classList.remove("is-hidden");
    }
    if (breakdownCameraCanvasEl) {
      breakdownCameraCanvasEl.classList.add("is-hidden");
    }
    breakdownCameraCaptureButton?.classList.remove("is-hidden");
    breakdownCameraRetakeButton?.classList.add("is-hidden");
    breakdownCameraSaveButton?.classList.add("is-hidden");
    breakdownCameraBlob = null;
  };

  const stopBreakdownCameraStream = () => {
    if (breakdownCameraStream) {
      breakdownCameraStream.getTracks().forEach((track) => track.stop());
      breakdownCameraStream = null;
    }
    if (breakdownCameraVideoEl) {
      breakdownCameraVideoEl.srcObject = null;
    }
  };

  const openBreakdownCameraModal = async () => {
    if (!breakdownCameraModalEl) return false;
    breakdownCameraModalEl.classList.remove("is-hidden");
    resetBreakdownCameraUI();
    try {
      breakdownCameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (breakdownCameraVideoEl) {
        breakdownCameraVideoEl.srcObject = breakdownCameraStream;
        await breakdownCameraVideoEl.play();
      }
      return true;
    } catch (error) {
      console.warn("Не удалось открыть камеру для поломки.", error);
      stopBreakdownCameraStream();
      breakdownCameraModalEl.classList.add("is-hidden");
      return false;
    }
  };

  const closeBreakdownCameraModal = () => {
    if (!breakdownCameraModalEl) return;
    breakdownCameraModalEl.classList.add("is-hidden");
    stopBreakdownCameraStream();
    resetBreakdownCameraUI();
  };

  const captureBreakdownCameraFrame = () => {
    if (!breakdownCameraVideoEl || !breakdownCameraCanvasEl) return;
    const width = breakdownCameraVideoEl.videoWidth;
    const height = breakdownCameraVideoEl.videoHeight;
    if (!width || !height) return;
    breakdownCameraCanvasEl.width = width;
    breakdownCameraCanvasEl.height = height;
    const context = breakdownCameraCanvasEl.getContext("2d");
    if (!context) return;
    context.drawImage(breakdownCameraVideoEl, 0, 0, width, height);
    breakdownCameraCanvasEl.classList.remove("is-hidden");
    breakdownCameraVideoEl.classList.add("is-hidden");
    breakdownCameraCaptureButton?.classList.add("is-hidden");
    breakdownCameraRetakeButton?.classList.remove("is-hidden");
    breakdownCameraSaveButton?.classList.remove("is-hidden");
    breakdownCameraCanvasEl.toBlob(
      (blob) => {
        breakdownCameraBlob = blob;
      },
      "image/jpeg",
      0.92
    );
  };

  const applyBreakdownCameraSnapshot = () => {
    if (!breakdownCameraBlob) return;
    const fileName = `breakdown_${Date.now()}.jpg`;
    const photoFile = new File([breakdownCameraBlob], fileName, {
      type: breakdownCameraBlob.type || "image/jpeg",
    });
    breakdownsState.photos.push(photoFile);
    updateBreakdownPhotoPreview();
    closeBreakdownCameraModal();
  };

  let repairCameraStream = null;
  let repairCameraBlob = null;

  const resetRepairCameraUI = () => {
    if (repairCameraVideoEl) {
      repairCameraVideoEl.classList.remove("is-hidden");
    }
    if (repairCameraCanvasEl) {
      repairCameraCanvasEl.classList.add("is-hidden");
    }
    repairCameraCaptureButton?.classList.remove("is-hidden");
    repairCameraRetakeButton?.classList.add("is-hidden");
    repairCameraSaveButton?.classList.add("is-hidden");
    repairCameraBlob = null;
  };

  const stopRepairCameraStream = () => {
    if (repairCameraStream) {
      repairCameraStream.getTracks().forEach((track) => track.stop());
      repairCameraStream = null;
    }
    if (repairCameraVideoEl) {
      repairCameraVideoEl.srcObject = null;
    }
  };

  const openRepairCameraModal = async () => {
    if (!repairCameraModalEl) return false;
    repairCameraModalEl.classList.remove("is-hidden");
    resetRepairCameraUI();
    try {
      repairCameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (repairCameraVideoEl) {
        repairCameraVideoEl.srcObject = repairCameraStream;
        await repairCameraVideoEl.play();
      }
      return true;
    } catch (error) {
      console.warn("Не удалось открыть камеру для акта ремонта.", error);
      stopRepairCameraStream();
      repairCameraModalEl.classList.add("is-hidden");
      return false;
    }
  };

  const closeRepairCameraModal = () => {
    if (!repairCameraModalEl) return;
    repairCameraModalEl.classList.add("is-hidden");
    stopRepairCameraStream();
    resetRepairCameraUI();
  };

  const captureRepairCameraFrame = () => {
    if (!repairCameraVideoEl || !repairCameraCanvasEl) return;
    const width = repairCameraVideoEl.videoWidth;
    const height = repairCameraVideoEl.videoHeight;
    if (!width || !height) return;
    repairCameraCanvasEl.width = width;
    repairCameraCanvasEl.height = height;
    const context = repairCameraCanvasEl.getContext("2d");
    if (!context) return;
    context.drawImage(repairCameraVideoEl, 0, 0, width, height);
    repairCameraCanvasEl.classList.remove("is-hidden");
    repairCameraVideoEl.classList.add("is-hidden");
    repairCameraCaptureButton?.classList.add("is-hidden");
    repairCameraRetakeButton?.classList.remove("is-hidden");
    repairCameraSaveButton?.classList.remove("is-hidden");
    repairCameraCanvasEl.toBlob(
      (blob) => {
        repairCameraBlob = blob;
      },
      "image/jpeg",
      0.92
    );
  };

  const applyRepairCameraSnapshot = () => {
    if (!repairCameraBlob) return;
    const fileName = `repair_act_${Date.now()}.jpg`;
    const photoFile = new File([repairCameraBlob], fileName, {
      type: repairCameraBlob.type || "image/jpeg",
    });
    if (repairActPhotoInput instanceof HTMLInputElement) {
      const transfer = new DataTransfer();
      transfer.items.add(photoFile);
      repairActPhotoInput.files = transfer.files;
    }
    if (repairActInput instanceof HTMLInputElement) {
      repairActInput.value = "";
    }
    updateRepairActPickerState();
    closeRepairCameraModal();
  };

  const isBreakdownStatusBlocked = (tool) => {
    const tone = tool?.__statusTone ?? resolveToolStatusTone(tool);
    return tone === "repair" || tone === "writeoff";
  };

  const isRepairSelectionBlocked = (tool) => {
    const tone = tool?.__statusTone ?? resolveToolStatusTone(tool);
    return tone === "writeoff";
  };

  const isRepairSendBlocked = (tool) => {
    const tone = tool?.__statusTone ?? resolveToolStatusTone(tool);
    return tone === "repair" || tone === "writeoff";
  };

  const isRepairCompletionAllowed = (tool) => {
    const tone = tool?.__statusTone ?? resolveToolStatusTone(tool);
    return tone === "repair";
  };

  const renderBreakdownsTable = (items) => {
    const table = document.createElement("div");
    table.className = "tools-table tools-table--breakdowns";

    items.forEach((tool) => {
      const isBlocked = isBreakdownStatusBlocked(tool);
      const row = document.createElement("div");
      row.className = "tools-table__row";
      row.dataset.breakdownsToolId = tool.__breakdownId;
      row.dataset.breakdownsSelect = tool.__breakdownId;
      row.classList.toggle("is-disabled", isBlocked);
      row.setAttribute("role", "button");
      if (isBlocked) {
        row.setAttribute("aria-disabled", "true");
      } else {
        row.tabIndex = 0;
      }
      applyToolStatusClasses(row, tool);

      const numberCell = document.createElement("div");
      numberCell.className = "tools-table__cell tools-table__cell--number";
      const number = resolveToolNumberValue(tool);
      numberCell.textContent = number || "—";

      const infoCell = document.createElement("div");
      infoCell.className = "tools-table__cell";
      const title = document.createElement("div");
      title.className = "tools-table__title";
      const name = String(tool?.["Наименование"] ?? "").trim();
      title.textContent = name || "Без названия";

      const meta = document.createElement("div");
      meta.className = "tools-table__meta tools-table__meta--stack";
      const manufacturer = String(tool?.["Производитель"] ?? "").trim();
      const model = String(tool?.["Модель"] ?? "").trim();
      const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
      const status = String(tool?.["Статус"] ?? "").trim();
      const lineTop = document.createElement("div");
      lineTop.textContent = [
        `Производитель: ${manufacturer || "—"}`,
        `Модель: ${model || "—"}`,
      ].join(" · ");
      const lineBottom = document.createElement("div");
      lineBottom.textContent = [
        `Бух.номер: ${accountingNumber || "—"}`,
        `Статус: ${status || "—"}`,
      ].join(" · ");
      meta.append(lineTop, lineBottom);
      infoCell.append(title, meta);

      row.append(numberCell, infoCell);
      table.appendChild(row);
    });
    return table;
  };

  const renderBreakdownsList = () => {
    if (!breakdownsListEl) return;
    breakdownsListEl.innerHTML = "";
    breakdownsListEl.appendChild(renderBreakdownsTable(breakdownsState.filtered));
    if (breakdownsEmptyEl) {
      breakdownsEmptyEl.classList.toggle(
        "is-hidden",
        breakdownsState.filtered.length > 0
      );
    }
    setBreakdownsSubtitle(
      `Показано ${breakdownsState.filtered.length} из ${breakdownsState.tools.length}`
    );
  };

  const applyBreakdownsFilters = () => {
    const search = breakdownsState.search.trim();
    const tokens = search ? search.split(/\s+/).filter(Boolean) : [];
    breakdownsState.filtered = breakdownsState.tools.filter((tool) => {
      if (
        breakdownsState.statusFilter &&
        String(tool?.["Статус"] ?? "").trim() !== breakdownsState.statusFilter
      ) {
        return false;
      }
      if (!tokens.length) return true;
      const searchLine = tool.__searchLine ?? "";
      return tokens.every((token) => searchLine.includes(token));
    });
    renderBreakdownsList();
  };

  const renderRepairTable = (items) => {
    const table = document.createElement("div");
    table.className = "tools-table tools-table--breakdowns";

    items.forEach((tool) => {
      const isBlocked = isRepairSelectionBlocked(tool);
      const row = document.createElement("div");
      row.className = "tools-table__row";
      row.dataset.repairToolId = tool.__repairId;
      row.setAttribute("role", "button");
      row.classList.toggle("is-disabled", isBlocked);
      if (isBlocked) {
        row.setAttribute("aria-disabled", "true");
      } else {
        row.tabIndex = 0;
      }
      applyToolStatusClasses(row, tool);

      const numberCell = document.createElement("div");
      numberCell.className = "tools-table__cell tools-table__cell--number";
      const number = resolveToolNumberValue(tool);
      numberCell.textContent = number || "—";

      const infoCell = document.createElement("div");
      infoCell.className = "tools-table__cell";
      const title = document.createElement("div");
      title.className = "tools-table__title";
      const name = String(tool?.["Наименование"] ?? "").trim();
      title.textContent = name || "Без названия";

      const meta = document.createElement("div");
      meta.className = "tools-table__meta tools-table__meta--stack";
      const manufacturer = String(tool?.["Производитель"] ?? "").trim();
      const model = String(tool?.["Модель"] ?? "").trim();
      const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
      const status = String(tool?.["Статус"] ?? "").trim();
      const lineTop = document.createElement("div");
      lineTop.textContent = [
        `Производитель: ${manufacturer || "—"}`,
        `Модель: ${model || "—"}`,
      ].join(" · ");
      const lineBottom = document.createElement("div");
      lineBottom.textContent = [
        `Бух.номер: ${accountingNumber || "—"}`,
        `Статус: ${status || "—"}`,
      ].join(" · ");
      meta.append(lineTop, lineBottom);
      infoCell.append(title, meta);

      row.append(numberCell, infoCell);
      table.appendChild(row);
    });
    return table;
  };

  const renderRepairList = () => {
    if (!repairListEl) return;
    repairListEl.innerHTML = "";
    repairListEl.appendChild(renderRepairTable(repairState.filtered));
    if (repairEmptyEl) {
      repairEmptyEl.classList.toggle("is-hidden", repairState.filtered.length > 0);
    }
    setRepairSubtitle(
      `Показано ${repairState.filtered.length} из ${repairState.tools.length}`
    );
  };

  const applyRepairFilters = () => {
    const search = repairState.search.trim();
    const tokens = search ? search.split(/\s+/).filter(Boolean) : [];
    repairState.filtered = repairState.tools.filter((tool) => {
      if (
        repairState.statusFilter &&
        String(tool?.["Статус"] ?? "").trim() !== repairState.statusFilter
      ) {
        return false;
      }
      if (!tokens.length) return true;
      const searchLine = tool.__searchLine ?? "";
      return tokens.every((token) => searchLine.includes(token));
    });
    renderRepairList();
  };

  const prepareRepairStatusFilter = () => {
    if (!repairStatusFilter) return;
    const values = new Set();
    repairState.tools.forEach((tool) => {
      const status = String(tool?.["Статус"] ?? "").trim();
      if (status) values.add(status);
    });
    const sortedValues = Array.from(values).sort((a, b) =>
      a.localeCompare(b, "ru", { numeric: true })
    );
    repairStatusFilter.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "Все";
    repairStatusFilter.appendChild(allOption);
    sortedValues.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      repairStatusFilter.appendChild(option);
    });
    if (repairState.statusFilter && !values.has(repairState.statusFilter)) {
      repairState.statusFilter = "";
    }
    repairStatusFilter.value = repairState.statusFilter;
  };

  const loadRepairTools = async () => {
    const orgFolder = context.orgFolderName ?? "";
    repairState.orgFolder = orgFolder;
    if (!orgFolder) {
      repairState.tools = [];
      repairState.filtered = [];
      setRepairSubtitle("Не удалось определить организацию.");
      renderRepairList();
      return;
    }
    const tools = await loadToolsData(orgFolder);
    const userName = normalizePersonName(user?.full_name ?? user?.fullName ?? "");
    const canManageAllTools = user?.role === energyRole;
    repairState.toolMap = new Map();
    repairState.tools = tools
      .filter((tool) => {
        if (canManageAllTools) return true;
        if (!userName) return true;
        return normalizePersonName(tool?.["Ответственный"] ?? "") === userName;
      })
      .map((tool, index) => {
        const enhanced = {
          ...tool,
          __searchLine: buildToolSearchLine(tool),
          __repairId: buildToolSelectionId(tool, index),
          __statusTone: resolveToolStatusTone(tool),
        };
        repairState.toolMap.set(enhanced.__repairId, enhanced);
        return enhanced;
      })
      .sort((a, b) =>
        String(resolveToolNumberValue(a) ?? "").localeCompare(
          String(resolveToolNumberValue(b) ?? ""),
          "ru",
          { numeric: true }
        )
      );
    prepareRepairStatusFilter();
    applyRepairFilters();
  };

  const loadRepairOrganizations = async () => {
    const orgFolder = repairState.orgFolder ?? context.orgFolderName ?? "";
    if (!orgFolder) {
      repairFormState.organizations = [];
      return;
    }
    const repairsPath = `./${orgFolder}/Ремонты.json`;
    const rawRepairs = await loadJson(repairsPath).catch(() => []);
    const repairs = Array.isArray(rawRepairs)
      ? rawRepairs
      : Array.isArray(rawRepairs?.repairs)
        ? rawRepairs.repairs
        : [];
    repairFormState.organizations = repairs
      .map((entry) => normalizeSuggestionValue(entry?.["Организация"] ?? ""))
      .filter(Boolean);
  };

  const prepareBreakdownsStatusFilter = () => {
    if (!breakdownsStatusFilter) return;
    const values = new Set();
    breakdownsState.tools.forEach((tool) => {
      const status = String(tool?.["Статус"] ?? "").trim();
      if (status) values.add(status);
    });
    const sortedValues = Array.from(values).sort((a, b) =>
      a.localeCompare(b, "ru", { numeric: true })
    );
    breakdownsStatusFilter.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "Все";
    breakdownsStatusFilter.appendChild(allOption);
    sortedValues.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      breakdownsStatusFilter.appendChild(option);
    });
    if (breakdownsState.statusFilter && !values.has(breakdownsState.statusFilter)) {
      breakdownsState.statusFilter = "";
    }
    breakdownsStatusFilter.value = breakdownsState.statusFilter;
  };

  const loadBreakdownsTools = async () => {
    const orgFolder = context.orgFolderName ?? "";
    breakdownsState.orgFolder = orgFolder;
    if (!orgFolder) {
      breakdownsState.tools = [];
      breakdownsState.filtered = [];
      setBreakdownsSubtitle("Не удалось определить организацию.");
      renderBreakdownsList();
      return;
    }
    const tools = await loadToolsData(orgFolder);
    const userName = normalizePersonName(user?.full_name ?? user?.fullName ?? "");
    const canManageAllTools = user?.role === energyRole;
    breakdownsState.toolMap = new Map();
    breakdownsState.tools = tools
      .filter((tool) => {
        if (canManageAllTools) return true;
        if (!userName) return true;
        return normalizePersonName(tool?.["Ответственный"] ?? "") === userName;
      })
      .map((tool, index) => {
        const enhanced = {
          ...tool,
          __searchLine: buildToolSearchLine(tool),
          __breakdownId: buildToolSelectionId(tool, index),
          __statusTone: resolveToolStatusTone(tool),
        };
        breakdownsState.toolMap.set(enhanced.__breakdownId, enhanced);
        return enhanced;
      })
      .sort((a, b) =>
        String(resolveToolNumberValue(a) ?? "").localeCompare(
          String(resolveToolNumberValue(b) ?? ""),
          "ru",
          { numeric: true }
        )
      );
    prepareBreakdownsStatusFilter();
    applyBreakdownsFilters();
  };

  const resetBreakdownForm = () => {
    breakdownFormEl?.reset();
    breakdownsState.photos = [];
    breakdownsState.selectedTool = null;
    updateBreakdownPhotoPreview();
    setBreakdownFormMessage("");
  };

  const resetBreakdownStatusState = () => {
    breakdownsState.statusTool = null;
    breakdownsState.isStatusSaving = false;
    setBreakdownStatusMessage("");
  };

  const resetRepairForm = () => {
    repairFormEl?.reset();
    repairFormState.selectedTool = null;
    repairFormState.mode = "send";
    setRepairFormMessage("");
    if (repairActInput) {
      repairActInput.value = "";
    }
    if (repairActPhotoInput) {
      repairActPhotoInput.value = "";
    }
    if (repairFormCompleteSection) {
      repairFormCompleteSection
        .querySelectorAll(".form-file-option")
        .forEach((option) => option.classList.remove("is-filled"));
    }
  };

  const updateRepairActPickerState = () => {
    if (!repairFormCompleteSection) return;
    const fileOptions = repairFormCompleteSection.querySelectorAll(
      ".form-file-option"
    );
    fileOptions.forEach((option) => {
      const input = option.querySelector('input[type="file"]');
      const isFilled =
        input instanceof HTMLInputElement &&
        input.files &&
        input.files.length > 0;
      option.classList.toggle("is-filled", isFilled);
    });
    const isPhotoFilled =
      repairActPhotoInput instanceof HTMLInputElement &&
      repairActPhotoInput.files &&
      repairActPhotoInput.files.length > 0;
    const cameraButton = repairFormCompleteSection.querySelector(
      "[data-repair-camera-trigger]"
    );
    if (cameraButton) {
      cameraButton.classList.toggle("is-filled", isPhotoFilled);
    }
  };

  const resolveRepairActFile = () => {
    const photoFile =
      repairActPhotoInput instanceof HTMLInputElement &&
      repairActPhotoInput.files &&
      repairActPhotoInput.files.length > 0
        ? repairActPhotoInput.files[0]
        : null;
    if (photoFile) return photoFile;
    const file =
      repairActInput instanceof HTMLInputElement &&
      repairActInput.files &&
      repairActInput.files.length > 0
        ? repairActInput.files[0]
        : null;
    return file || null;
  };

  const setRepairFormMode = (mode) => {
    const resolvedMode = mode === "repaired" ? "repaired" : "send";
    repairFormState.mode = resolvedMode;
    repairFormSendSection?.classList.toggle(
      "is-hidden",
      resolvedMode !== "send"
    );
    repairFormCompleteSection?.classList.toggle(
      "is-hidden",
      resolvedMode !== "repaired"
    );
    if (repairFormTitleEl) {
      repairFormTitleEl.textContent =
        resolvedMode === "repaired" ? "Возврат из ремонта" : "Отправка в ремонт";
    }
    if (repairFormSubtitleEl) {
      repairFormSubtitleEl.textContent =
        resolvedMode === "repaired"
          ? "Укажите стоимость и приложите акт"
          : "Проверьте данные инструмента";
    }
    if (repairFormSubmitButton) {
      repairFormSubmitButton.textContent =
        resolvedMode === "repaired" ? "Сохранить" : "Отправить в ремонт";
    }
    if (repairOrganizationInput) {
      repairOrganizationInput.required = resolvedMode === "send";
      repairOrganizationInput.disabled = resolvedMode !== "send";
    }
    if (repairDescriptionInput) {
      repairDescriptionInput.disabled = resolvedMode !== "send";
    }
    if (repairCostInput) {
      repairCostInput.disabled = resolvedMode !== "send";
    }
    if (repairFinalCostInput) {
      repairFinalCostInput.required = resolvedMode === "repaired";
      repairFinalCostInput.disabled = resolvedMode !== "repaired";
    }
    if (repairActInput) {
      repairActInput.disabled = resolvedMode !== "repaired";
    }
    if (repairActPhotoInput) {
      repairActPhotoInput.disabled = resolvedMode !== "repaired";
    }
  };

  const fillRepairToolInfo = (tool) => {
    if (!tool) return;
    const number = resolveToolNumberValue(tool);
    const name = String(tool?.["Наименование"] ?? "").trim();
    if (repairFormSubtitleEl) {
      repairFormSubtitleEl.textContent = `Инструмент №${number || "—"} · ${
        name || "Без названия"
      }`;
    }
    if (repairToolTitleEl) {
      repairToolTitleEl.textContent = name || "Инструмент";
    }
    if (repairToolMetaEl) {
      const manufacturer = String(tool?.["Производитель"] ?? "").trim();
      const model = String(tool?.["Модель"] ?? "").trim();
      const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
      const status = String(tool?.["Статус"] ?? "").trim();
      repairToolMetaEl.textContent = [
        `Бух.номер: ${accountingNumber || "—"}`,
        `Производитель: ${manufacturer || "—"}`,
        `Модель: ${model || "—"}`,
        `Статус: ${status || "—"}`,
      ].join(" · ");
    }
  };

  const openRepairFormModal = async (tool) => {
    if (!repairFormModalEl || !tool) return;
    resetRepairForm();
    repairFormState.selectedTool = tool;
    const statusText = String(tool?.["Статус"] ?? "").trim().toLowerCase();
    const mode = statusText === "в ремонте" ? "repaired" : "send";
    setRepairFormMode(mode);
    fillRepairToolInfo(tool);
    if (mode === "send") {
      await loadRepairOrganizations();
    }
    setRepairFormMessage("");
    updateRepairActPickerState();
    repairFormModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setTimeout(() => {
      if (mode === "repaired") {
        repairFinalCostInput?.focus();
      } else {
        repairOrganizationInput?.focus();
      }
    }, 0);
  };

  const closeRepairFormModal = () => {
    if (!repairFormModalEl) return;
    repairFormModalEl.classList.add("is-hidden");
    resetRepairForm();
    closeRepairCameraModal();
    if (repairModalEl && !repairModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const fillBreakdownStatusToolInfo = (tool) => {
    if (!tool) return;
    const number = resolveToolNumberValue(tool);
    const name = String(tool?.["Наименование"] ?? "").trim();
    if (breakdownStatusSubtitleEl) {
      breakdownStatusSubtitleEl.textContent = `Инструмент №${number || "—"} · ${
        name || "Без названия"
      }`;
    }
    if (breakdownStatusToolTitleEl) {
      breakdownStatusToolTitleEl.textContent = name || "Инструмент";
    }
    if (breakdownStatusToolMetaEl) {
      const manufacturer = String(tool?.["Производитель"] ?? "").trim();
      const model = String(tool?.["Модель"] ?? "").trim();
      const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
      const status = String(tool?.["Статус"] ?? "").trim();
      breakdownStatusToolMetaEl.textContent = [
        `Бух.номер: ${accountingNumber || "—"}`,
        `Производитель: ${manufacturer || "—"}`,
        `Модель: ${model || "—"}`,
        `Статус: ${status || "—"}`,
      ].join(" · ");
    }
  };

  const openBreakdownStatusModal = (tool) => {
    if (!breakdownStatusModalEl || !tool) return;
    breakdownsState.statusTool = tool;
    fillBreakdownStatusToolInfo(tool);
    setBreakdownStatusMessage("");
    breakdownStatusModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const closeBreakdownStatusModal = () => {
    if (!breakdownStatusModalEl) return;
    breakdownStatusModalEl.classList.add("is-hidden");
    resetBreakdownStatusState();
    if (breakdownsModalEl && !breakdownsModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const openBreakdownFormModal = (tool) => {
    if (!breakdownFormModalEl || !tool) return;
    breakdownsState.selectedTool = tool;
    breakdownsState.photos = [];
    updateBreakdownPhotoPreview();
    const number = resolveToolNumberValue(tool);
    const name = String(tool?.["Наименование"] ?? "").trim();
    if (breakdownFormSubtitleEl) {
      breakdownFormSubtitleEl.textContent = `Инструмент №${number || "—"} · ${
        name || "Без названия"
      }`;
    }
    if (breakdownToolTitleEl) {
      breakdownToolTitleEl.textContent = name || "Инструмент";
    }
    if (breakdownToolMetaEl) {
      const manufacturer = String(tool?.["Производитель"] ?? "").trim();
      const model = String(tool?.["Модель"] ?? "").trim();
      const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
      const status = String(tool?.["Статус"] ?? "").trim();
      breakdownToolMetaEl.textContent = [
        `Бух.номер: ${accountingNumber || "—"}`,
        `Производитель: ${manufacturer || "—"}`,
        `Модель: ${model || "—"}`,
        `Статус: ${status || "—"}`,
      ].join(" · ");
    }
    setBreakdownFormMessage("");
    breakdownFormModalEl.classList.remove("is-hidden");
    breakdownFormModalEl.classList.remove("is-input-focus");
    attachBreakdownViewportListeners();
    updateBreakdownKeyboardOffset();
    document.body.style.overflow = "hidden";
    breakdownDescriptionInput?.focus();
  };

  const closeBreakdownFormModal = () => {
    if (!breakdownFormModalEl) return;
    breakdownFormModalEl.classList.add("is-hidden");
    breakdownFormModalEl.classList.remove("is-input-focus");
    breakdownFormModalEl.style.removeProperty("--keyboard-offset");
    detachBreakdownViewportListeners();
    resetBreakdownForm();
    if (breakdownsModalEl && !breakdownsModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const applyBreakdownStatusRepaired = async () => {
    if (breakdownsState.isStatusSaving) return;
    const tool = breakdownsState.statusTool;
    if (!tool) {
      setBreakdownStatusMessage("Инструмент не выбран.", "error");
      return;
    }
    const orgFolder = breakdownsState.orgFolder ?? "";
    if (!orgFolder) {
      setBreakdownStatusMessage("Не удалось определить организацию.", "error");
      return;
    }
    breakdownsState.isStatusSaving = true;
    setBreakdownStatusMessage("Сохраняем данные...", "info");
    try {
      const toolsPath = `./${orgFolder}/База с инструментами.json`;
      const breakdownsPath = `./${orgFolder}/Поломки.json`;
      const [rawTools, rawBreakdowns] = await Promise.all([
        loadJson(toolsPath).catch(() => []),
        loadJson(breakdownsPath).catch(() => []),
      ]);
      const tools = normalizeToolsData(rawTools);
      const breakdowns = Array.isArray(rawBreakdowns)
        ? rawBreakdowns
        : Array.isArray(rawBreakdowns?.breakdowns)
          ? rawBreakdowns.breakdowns
          : [];
      const selectedNumber = normalizeToolNumberValue(tool?.["Номер"] ?? "");
      const selectedAccounting = String(tool?.["Бух.номер"] ?? "").trim();
      const toolIndex = tools.findIndex((entry) => {
        const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
        const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
        if (selectedNumber && entryNumber === selectedNumber) return true;
        if (selectedAccounting && entryAccounting === selectedAccounting) {
          return true;
        }
        return false;
      });
      if (toolIndex < 0) {
        setBreakdownStatusMessage("Инструмент не найден в базе.", "error");
        breakdownsState.isStatusSaving = false;
        return;
      }
      const dateValue = formatDateValue(new Date());
      const markerRaw = String(
        user?.full_name ?? user?.fullName ?? currentUser?.full_name ?? ""
      ).trim();
      const marker = markerRaw ? formatFullName(markerRaw) : "Пользователь";
      const updatedTools = [...tools];
      updatedTools[toolIndex] = {
        ...updatedTools[toolIndex],
        "Статус": "Рабочий",
      };
      const fixPayload = {
        "Дата ремонта": dateValue,
        "Пользователь, который пометил ремонт": marker,
      };
      const updatedBreakdowns = [...breakdowns];
      let breakdownIndex = -1;
      for (let index = updatedBreakdowns.length - 1; index >= 0; index -= 1) {
        const entry = updatedBreakdowns[index];
        const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
        const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
        if (selectedNumber && entryNumber === selectedNumber) {
          breakdownIndex = index;
          break;
        }
        if (selectedAccounting && entryAccounting === selectedAccounting) {
          breakdownIndex = index;
          break;
        }
      }
      if (breakdownIndex >= 0) {
        updatedBreakdowns[breakdownIndex] = {
          ...updatedBreakdowns[breakdownIndex],
          ...fixPayload,
        };
      } else {
        updatedBreakdowns.push({
          "Номер": String(tool?.["Номер"] ?? "").trim(),
          "Бух.номер": String(tool?.["Бух.номер"] ?? "").trim(),
          "Ответственный": String(tool?.["Ответственный"] ?? "").trim(),
          ...fixPayload,
        });
      }
      const meta = buildUploadUserMeta({ organizationName: context.orgFullName });
      await saveEntries([
        { path: toolsPath, data: updatedTools, ...meta },
        { path: breakdownsPath, data: updatedBreakdowns, ...meta },
      ]);
      syncToolStatusInStates(updatedTools[toolIndex], "Рабочий");
      await notifyFixBreakdown({
        tool: updatedTools[toolIndex],
        orgFolder,
        fixDate: dateValue,
        markedBy: marker,
      });
      setBreakdownStatusMessage("Статус обновлен.", "success");
      setTimeout(() => {
        closeBreakdownStatusModal();
      }, 500);
    } catch (error) {
      console.error(error);
      setBreakdownStatusMessage(
        "Не удалось сохранить изменения. Проверьте сервер.",
        "error"
      );
    } finally {
      breakdownsState.isStatusSaving = false;
    }
  };

  const applyBreakdownStatusWriteoff = async () => {
    if (breakdownsState.isStatusSaving) return;
    const tool = breakdownsState.statusTool;
    if (!tool) {
      setBreakdownStatusMessage("Инструмент не выбран.", "error");
      return;
    }
    const orgFolder = breakdownsState.orgFolder ?? "";
    if (!orgFolder) {
      setBreakdownStatusMessage("Не удалось определить организацию.", "error");
      return;
    }
    breakdownsState.isStatusSaving = true;
    setBreakdownStatusMessage("Сохраняем данные...", "info");
    try {
      const toolsPath = `./${orgFolder}/База с инструментами.json`;
      const writeOffPath = `./${orgFolder}/Списания.json`;
      const [rawTools, rawWriteOff] = await Promise.all([
        loadJson(toolsPath).catch(() => []),
        loadJson(writeOffPath).catch(() => []),
      ]);
      const tools = normalizeToolsData(rawTools);
      const selectedNumber = normalizeToolNumberValue(tool?.["Номер"] ?? "");
      const selectedAccounting = String(tool?.["Бух.номер"] ?? "").trim();
      const toolIndex = tools.findIndex((entry) => {
        const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
        const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
        if (selectedNumber && entryNumber === selectedNumber) return true;
        if (selectedAccounting && entryAccounting === selectedAccounting) {
          return true;
        }
        return false;
      });
      if (toolIndex < 0) {
        setBreakdownStatusMessage("Инструмент не найден в базе.", "error");
        breakdownsState.isStatusSaving = false;
        return;
      }
      const dateValue = formatDateValue(new Date());
      const markerRaw = String(
        user?.full_name ?? user?.fullName ?? currentUser?.full_name ?? ""
      ).trim();
      const marker = markerRaw ? formatFullName(markerRaw) : "Пользователь";
      const updatedTools = [...tools];
      updatedTools[toolIndex] = {
        ...updatedTools[toolIndex],
        "Статус": "На списание",
      };

      const baseWrapper =
        rawWriteOff && typeof rawWriteOff === "object" && !Array.isArray(rawWriteOff)
          ? { ...rawWriteOff }
          : {};
      const writeOffItems = Array.isArray(rawWriteOff)
        ? rawWriteOff
        : Array.isArray(rawWriteOff?.items)
          ? rawWriteOff.items
          : [];
      const pendingKey = "списокНаСписание";
      const pendingList = Array.isArray(baseWrapper[pendingKey])
        ? baseWrapper[pendingKey]
        : [];
      const pendingEntry = {
        "Номер": String(tool?.["Номер"] ?? "").trim(),
        "Бух.номер": String(tool?.["Бух.номер"] ?? "").trim(),
        "Ответственный": String(tool?.["Ответственный"] ?? "").trim(),
        "Дата постановки статуса \"На списание\"": dateValue,
        "Поставил статус": marker,
      };
      const pendingIndex = pendingList.findIndex((entry) => {
        const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
        const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
        if (selectedNumber && entryNumber === selectedNumber) return true;
        if (selectedAccounting && entryAccounting === selectedAccounting) {
          return true;
        }
        return false;
      });
      const updatedPending = [...pendingList];
      if (pendingIndex >= 0) {
        updatedPending[pendingIndex] = {
          ...updatedPending[pendingIndex],
          ...pendingEntry,
        };
      } else {
        updatedPending.push(pendingEntry);
      }
      const updatedWriteOffPayload = {
        ...baseWrapper,
        items: writeOffItems,
        [pendingKey]: updatedPending,
      };
      const meta = buildUploadUserMeta({ organizationName: context.orgFullName });
      await saveEntries([
        { path: toolsPath, data: updatedTools, ...meta },
        { path: writeOffPath, data: updatedWriteOffPayload, ...meta },
      ]);
      syncToolStatusInStates(updatedTools[toolIndex], "На списание");
      setBreakdownStatusMessage("Инструмент отправлен на списание.", "success");
      setTimeout(() => {
        closeBreakdownStatusModal();
      }, 500);
    } catch (error) {
      console.error(error);
      setBreakdownStatusMessage(
        "Не удалось сохранить изменения. Проверьте сервер.",
        "error"
      );
    } finally {
      breakdownsState.isStatusSaving = false;
    }
  };

  const handleBreakdownStatusAction = (action) => {
    if (action === "repaired") {
      void applyBreakdownStatusRepaired();
      return;
    }
    if (action === "writeoff") {
      void applyBreakdownStatusWriteoff();
      return;
    }
    if (action === "send-repair") {
      const tool = breakdownsState.statusTool;
      if (!tool) {
        setBreakdownStatusMessage("Инструмент не выбран.", "error");
        return;
      }
      repairState.orgFolder =
        breakdownsState.orgFolder ?? repairState.orgFolder ?? context.orgFolderName;
      closeBreakdownStatusModal();
      void openRepairFormModal(tool);
      return;
    }
    setBreakdownStatusMessage("Неизвестное действие.", "error");
  };

  const openRepairModal = async () => {
    if (!repairModalEl) return;
    repairModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setRepairSubtitle("Загружаем список...");
    setRepairMessage("");
    await loadRepairTools();
    if (
      repairSearchInput &&
      (typeof window === "undefined" ||
        !window.matchMedia ||
        !window.matchMedia("(max-width: 520px)").matches)
    ) {
      repairSearchInput.focus();
    }
  };

  const closeRepairModal = () => {
    if (!repairModalEl) return;
    repairModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
  };

  const openBreakdownsModal = async () => {
    if (!breakdownsModalEl) return;
    breakdownsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setBreakdownsSubtitle("Загружаем список...");
    setBreakdownsMessage("");
    await loadBreakdownsTools();
    if (
      breakdownsSearchInput &&
      (typeof window === "undefined" ||
        !window.matchMedia ||
        !window.matchMedia("(max-width: 520px)").matches)
    ) {
      breakdownsSearchInput.focus();
    }
  };

  const closeBreakdownsModal = () => {
    if (!breakdownsModalEl) return;
    breakdownsModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
  };

  const syncToolStatusInStates = (tool, status) => {
    if (!tool || !status) return;
    const number = normalizeToolNumberValue(tool?.["Номер"] ?? "");
    const accounting = String(tool?.["Бух.номер"] ?? "").trim();
    const updateTool = (entry) => {
      const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
      const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
      if (
        (number && entryNumber === number) ||
        (accounting && entryAccounting === accounting)
      ) {
        const updated = { ...entry, "Статус": status };
        updated.__statusTone = resolveToolStatusTone(updated);
        return updated;
      }
      return entry;
    };
    if (toolsState.tools.length) {
      toolsState.tools = toolsState.tools.map(updateTool);
      toolsState.filtered = toolsState.filtered.map(updateTool);
      if (toolsModalEl && !toolsModalEl.classList.contains("is-hidden")) {
        applyToolsFilters();
      }
    }
    breakdownsState.tools = breakdownsState.tools.map(updateTool);
    breakdownsState.filtered = breakdownsState.filtered.map(updateTool);
    breakdownsState.toolMap.forEach((value, key) => {
      const updated = updateTool(value);
      if (updated !== value) {
        breakdownsState.toolMap.set(key, updated);
      }
    });
    repairState.tools = repairState.tools.map(updateTool);
    repairState.filtered = repairState.filtered.map(updateTool);
    repairState.toolMap.forEach((value, key) => {
      const updated = updateTool(value);
      if (updated !== value) {
        repairState.toolMap.set(key, updated);
      }
    });
    prepareRepairStatusFilter();
    applyRepairFilters();
    prepareBreakdownsStatusFilter();
    applyBreakdownsFilters();
  };

  const syncBrokenStatusInToolsState = (tool) => {
    syncToolStatusInStates(tool, "Сломан");
  };

  if (repairBackdropEl) {
    repairBackdropEl.addEventListener("click", closeRepairModal);
  }
  if (repairCloseButton) {
    repairCloseButton.addEventListener("click", closeRepairModal);
  }
  repairModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeRepairModal();
    }
  });
  if (repairSearchInput) {
    repairSearchInput.addEventListener("input", (event) => {
      repairState.search = String(event.target.value ?? "").toLowerCase();
      applyRepairFilters();
    });
  }
  if (repairStatusFilter) {
    repairStatusFilter.addEventListener("change", (event) => {
      repairState.statusFilter = String(event.target.value ?? "").trim();
      applyRepairFilters();
    });
  }
  if (repairListEl) {
    repairListEl.addEventListener("click", (event) => {
      const row = event.target.closest("[data-repair-tool-id]");
      if (!row) return;
      const toolId = row.dataset.repairToolId;
      if (!toolId) return;
      const tool = repairState.toolMap.get(toolId);
      if (!tool) return;
      if (isRepairSelectionBlocked(tool)) {
        setRepairMessage("Инструмент уже на списании.", "info");
        return;
      }
      openRepairFormModal(tool);
    });
    repairListEl.addEventListener("keydown", (event) => {
      if (!(event instanceof KeyboardEvent)) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      const row = event.target.closest("[data-repair-tool-id]");
      if (!row) return;
      event.preventDefault();
      row.click();
    });
  }
  if (repairFormBackdropEl) {
    repairFormBackdropEl.addEventListener("click", closeRepairFormModal);
  }
  if (repairFormCloseButton) {
    repairFormCloseButton.addEventListener("click", closeRepairFormModal);
  }
  if (repairFormCancelButton) {
    repairFormCancelButton.addEventListener("click", closeRepairFormModal);
  }
  repairFormModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeRepairFormModal();
    }
  });
  if (breakdownsBackdropEl) {
    breakdownsBackdropEl.addEventListener("click", closeBreakdownsModal);
  }
  if (breakdownsCloseButton) {
    breakdownsCloseButton.addEventListener("click", closeBreakdownsModal);
  }
  breakdownsModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeBreakdownsModal();
    }
  });
  if (breakdownsSearchInput) {
    breakdownsSearchInput.addEventListener("input", (event) => {
      breakdownsState.search = String(event.target.value ?? "").toLowerCase();
      applyBreakdownsFilters();
    });
  }
  if (breakdownsStatusFilter) {
    breakdownsStatusFilter.addEventListener("change", (event) => {
      breakdownsState.statusFilter = String(event.target.value ?? "").trim();
      applyBreakdownsFilters();
    });
  }
  if (breakdownsListEl) {
    breakdownsListEl.addEventListener("click", (event) => {
      const row = event.target.closest("[data-breakdowns-select]");
      if (!row) return;
      const toolId = row.dataset.breakdownsSelect;
      if (!toolId) return;
      const tool = breakdownsState.toolMap.get(toolId);
      if (!tool) return;
      const tone = tool?.__statusTone ?? resolveToolStatusTone(tool);
      if (tone === "broken") {
        openBreakdownStatusModal(tool);
        return;
      }
      if (isBreakdownStatusBlocked(tool)) {
        setBreakdownsMessage("Инструмент уже в ремонте или на списании.", "info");
        return;
      }
      openBreakdownFormModal(tool);
    });
    breakdownsListEl.addEventListener("keydown", (event) => {
      if (!(event instanceof KeyboardEvent)) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      const row = event.target.closest("[data-breakdowns-select]");
      if (!row) return;
      event.preventDefault();
      row.click();
    });
  }
  if (breakdownStatusBackdropEl) {
    breakdownStatusBackdropEl.addEventListener("click", closeBreakdownStatusModal);
  }
  if (breakdownStatusCloseButton) {
    breakdownStatusCloseButton.addEventListener("click", closeBreakdownStatusModal);
  }
  if (breakdownStatusCancelButton) {
    breakdownStatusCancelButton.addEventListener(
      "click",
      closeBreakdownStatusModal
    );
  }
  breakdownStatusModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeBreakdownStatusModal();
    }
  });
  if (breakdownStatusActionButtons.length) {
    breakdownStatusActionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.breakdownStatusAction ?? "";
        handleBreakdownStatusAction(action);
      });
    });
  }
  if (breakdownFormBackdropEl) {
    breakdownFormBackdropEl.addEventListener("click", closeBreakdownFormModal);
  }
  if (breakdownFormCloseButton) {
    breakdownFormCloseButton.addEventListener("click", closeBreakdownFormModal);
  }
  if (breakdownFormCancelButton) {
    breakdownFormCancelButton.addEventListener("click", closeBreakdownFormModal);
  }
  if (breakdownPhotoInput) {
    breakdownPhotoInput.addEventListener("change", (event) => {
      const files = Array.from(event.target.files ?? []);
      if (!files.length) return;
      breakdownsState.photos.push(...files);
      breakdownPhotoInput.value = "";
      updateBreakdownPhotoPreview();
    });
  }
  if (breakdownCameraTrigger) {
    breakdownCameraTrigger.addEventListener("click", async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setBreakdownFormMessage(
          "Камера недоступна. Выберите фото из галереи.",
          "info"
        );
        return;
      }
      const opened = await openBreakdownCameraModal();
      if (!opened) {
        setBreakdownFormMessage(
          "Камера недоступна. Выберите фото из галереи.",
          "info"
        );
      }
    });
  }
  if (breakdownCameraBackdropEl) {
    breakdownCameraBackdropEl.addEventListener(
      "click",
      closeBreakdownCameraModal
    );
  }
  if (breakdownCameraCloseButton) {
    breakdownCameraCloseButton.addEventListener(
      "click",
      closeBreakdownCameraModal
    );
  }
  if (breakdownCameraCancelButton) {
    breakdownCameraCancelButton.addEventListener(
      "click",
      closeBreakdownCameraModal
    );
  }
  if (breakdownCameraCaptureButton) {
    breakdownCameraCaptureButton.addEventListener(
      "click",
      captureBreakdownCameraFrame
    );
  }
  if (breakdownCameraRetakeButton) {
    breakdownCameraRetakeButton.addEventListener("click", () => {
      resetBreakdownCameraUI();
      breakdownCameraVideoEl?.play();
    });
  }
  if (breakdownCameraSaveButton) {
    breakdownCameraSaveButton.addEventListener(
      "click",
      applyBreakdownCameraSnapshot
    );
  }
  if (repairCameraTrigger) {
    repairCameraTrigger.addEventListener("click", async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setRepairFormMessage(
          "Камера недоступна. Прикрепите фото из галереи.",
          "info"
        );
        return;
      }
      const opened = await openRepairCameraModal();
      if (!opened) {
        setRepairFormMessage(
          "Камера недоступна. Прикрепите фото из галереи.",
          "info"
        );
      }
    });
  }
  if (repairCameraBackdropEl) {
    repairCameraBackdropEl.addEventListener("click", closeRepairCameraModal);
  }
  if (repairCameraCloseButton) {
    repairCameraCloseButton.addEventListener("click", closeRepairCameraModal);
  }
  if (repairCameraCancelButton) {
    repairCameraCancelButton.addEventListener("click", closeRepairCameraModal);
  }
  if (repairCameraCaptureButton) {
    repairCameraCaptureButton.addEventListener(
      "click",
      captureRepairCameraFrame
    );
  }
  if (repairCameraRetakeButton) {
    repairCameraRetakeButton.addEventListener("click", () => {
      resetRepairCameraUI();
      repairCameraVideoEl?.play();
    });
  }
  if (repairCameraSaveButton) {
    repairCameraSaveButton.addEventListener("click", applyRepairCameraSnapshot);
  }

  if (breakdownFormEl) {
    breakdownFormEl.noValidate = true;
    const scrollBreakdownInputIntoView = (target) => {
      const scrollContainer = breakdownFormBodyEl || breakdownFormModalEl;
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

    breakdownFormEl.addEventListener("focusin", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest("input, textarea, select")) return;
      breakdownFormModalEl?.classList.add("is-input-focus");
      updateBreakdownKeyboardOffset();
      scrollBreakdownInputIntoView(target);
      setTimeout(() => {
        updateBreakdownKeyboardOffset();
        scrollBreakdownInputIntoView(target);
      }, 150);
    });

    breakdownFormEl.addEventListener("focusout", () => {
      setTimeout(() => {
        if (!breakdownFormEl.contains(document.activeElement)) {
          breakdownFormModalEl?.classList.remove("is-input-focus");
          breakdownFormModalEl?.style.removeProperty("--keyboard-offset");
        }
      }, 0);
    });

    breakdownFormEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (breakdownsState.isSaving) {
        setBreakdownFormMessage("Сохранение уже выполняется. Подождите…", "info");
        return;
      }
      const tool = breakdownsState.selectedTool;
      if (!tool) {
        setBreakdownFormMessage("Инструмент не выбран.", "error");
        return;
      }
      if (isBreakdownStatusBlocked(tool)) {
        const status = String(tool?.["Статус"] ?? "").trim().toLowerCase();
        const message =
          status === "сломан"
            ? "Инструмент уже сломан."
            : "Нельзя пометить сломанным: инструмент уже в ремонте или на списании.";
        setBreakdownFormMessage(message, "error");
        return;
      }
      const description = String(breakdownDescriptionInput?.value ?? "").trim();
      if (!description) {
        setBreakdownFormMessage("Введите описание поломки.", "error");
        breakdownDescriptionInput?.focus();
        return;
      }
      const orgFolder = breakdownsState.orgFolder ?? "";
      if (!orgFolder) {
        setBreakdownFormMessage("Не удалось определить организацию.", "error");
        return;
      }
      breakdownsState.isSaving = true;
      setBreakdownFormMessage("Сохраняем данные...", "info");
      try {
        const toolsPath = `./${orgFolder}/База с инструментами.json`;
        const breakdownsPath = `./${orgFolder}/Поломки.json`;
        const [rawTools, rawBreakdowns] = await Promise.all([
          loadJson(toolsPath).catch(() => []),
          loadJson(breakdownsPath).catch(() => []),
        ]);
        const tools = normalizeToolsData(rawTools);
        const breakdowns = Array.isArray(rawBreakdowns)
          ? rawBreakdowns
          : Array.isArray(rawBreakdowns?.breakdowns)
            ? rawBreakdowns.breakdowns
            : [];
        const selectedNumber = normalizeToolNumberValue(tool?.["Номер"] ?? "");
        const selectedAccounting = String(tool?.["Бух.номер"] ?? "").trim();
        const toolIndex = tools.findIndex((entry) => {
          const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
          const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
          if (selectedNumber && entryNumber === selectedNumber) return true;
          if (selectedAccounting && entryAccounting === selectedAccounting) {
            return true;
          }
          return false;
        });
        if (toolIndex < 0) {
          setBreakdownFormMessage("Инструмент не найден в базе.", "error");
          breakdownsState.isSaving = false;
          return;
        }

        const dateValue = formatDateValue(new Date());
        const markerRaw = String(
          user?.full_name ?? user?.fullName ?? currentUser?.full_name ?? ""
        ).trim();
        const marker = markerRaw ? formatFullName(markerRaw) : "Пользователь";
        const updatedTools = [...tools];
        updatedTools[toolIndex] = {
          ...updatedTools[toolIndex],
          "Статус": "Сломан",
        };
        const breakdownEntry = {
          "Номер": String(tool?.["Номер"] ?? "").trim(),
          "Бух.номер": String(tool?.["Бух.номер"] ?? "").trim(),
          "Серийный номер": String(tool?.["Серийный номер"] ?? "").trim(),
          "Дата поломки": dateValue,
          "Описание поломки": description,
          "Ответственный": String(tool?.["Ответственный"] ?? "").trim(),
          "Пользователь, который пометил поломку": marker,
        };
        const updatedBreakdowns = [...breakdowns, breakdownEntry];
        const meta = buildUploadUserMeta({ organizationName: context.orgFullName });
        await saveEntries([
          { path: toolsPath, data: updatedTools, ...meta },
          { path: breakdownsPath, data: updatedBreakdowns, ...meta },
        ]);

        const breakdownPhotoNames = [];
        if (breakdownsState.photos.length) {
          setBreakdownFormMessage("Загружаем фото...", "info");
          const photoEntries = [];
          for (const file of breakdownsState.photos) {
            const safeName = buildBreakdownPhotoFileName(
              tool?.["Номер"] ?? "",
              dateValue,
              file
            );
            breakdownPhotoNames.push(safeName);
            const content = await readFileAsBase64(file);
            photoEntries.push({
              type: "file",
              path: `${orgFolder}/Фото поломок/${safeName}`,
              content,
              encoding: "base64",
              mime: file.type || "image/*",
              ...meta,
            });
          }
          await uploadPhotoEntriesInBatches(photoEntries, {
            onBatch: (currentBatch, totalBatches) => {
              setBreakdownFormMessage(
                `Загружаем фото (${currentBatch}/${totalBatches})...`,
                "info"
              );
            },
          });
        }

        await notifyToolBreakdown({
          tool: updatedTools[toolIndex],
          orgFolder,
          breakdownDate: dateValue,
          description,
          markedBy: marker,
          breakdownPhotos: breakdownPhotoNames,
        });

        syncBrokenStatusInToolsState(tool);
        setBreakdownsMessage("Поломка сохранена.", "success");
        closeBreakdownFormModal();
        await loadBreakdownsTools();
      } catch (error) {
        console.error(error);
        const reason =
          error instanceof Error && error.message
            ? `Причина: ${error.message}`
            : "Проверьте сервер.";
        setBreakdownFormMessage(`Не удалось сохранить. ${reason}`, "error");
      } finally {
        breakdownsState.isSaving = false;
      }
    });
  }

  if (repairFormEl) {
    repairFormEl.noValidate = true;
    const scrollRepairInputIntoView = (target) => {
      const scrollContainer = repairFormBodyEl || repairFormModalEl;
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

    repairFormEl.addEventListener("focusin", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest("input, textarea, select")) return;
      repairFormModalEl?.classList.add("is-input-focus");
      scrollRepairInputIntoView(target);
      setTimeout(() => {
        scrollRepairInputIntoView(target);
      }, 150);
    });

    repairFormEl.addEventListener("focusout", () => {
      setTimeout(() => {
        if (!repairFormEl.contains(document.activeElement)) {
          repairFormModalEl?.classList.remove("is-input-focus");
          repairFormModalEl?.style.removeProperty("--keyboard-offset");
        }
      }, 0);
    });

    if (repairActInput) {
      repairActInput.addEventListener("change", () => {
        if (repairActPhotoInput) {
          repairActPhotoInput.value = "";
        }
        updateRepairActPickerState();
      });
    }
    if (repairActPhotoInput) {
      repairActPhotoInput.addEventListener("change", () => {
        if (repairActInput) {
          repairActInput.value = "";
        }
        updateRepairActPickerState();
      });
    }

    repairFormEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (repairFormState.isSaving) {
        setRepairFormMessage("Сохранение уже выполняется. Подождите…", "info");
        return;
      }
      const tool = repairFormState.selectedTool;
      if (!tool) {
        setRepairFormMessage("Инструмент не выбран.", "error");
        return;
      }
      clearRepairFormFieldErrors();
      const orgFolder = repairState.orgFolder ?? "";
      if (!orgFolder) {
        setRepairFormMessage("Не удалось определить организацию.", "error");
        return;
      }
      const mode = repairFormState.mode ?? "send";
      if (mode === "send") {
        if (isRepairSendBlocked(tool)) {
          setRepairFormMessage(
            "Инструмент уже в ремонте или на списании.",
            "info"
          );
          return;
        }
        const organization = String(repairOrganizationInput?.value ?? "").trim();
        if (!organization) {
          setRepairFormMessage("Выберите организацию.", "error");
          repairOrganizationInput?.focus();
          markRepairFormFieldError(repairOrganizationInput);
          return;
        }
      } else if (!isRepairCompletionAllowed(tool)) {
        setRepairFormMessage("Инструмент не в ремонте.", "error");
        return;
      }
      const description = String(repairDescriptionInput?.value ?? "").trim();
      const cost = String(repairCostInput?.value ?? "").trim();
      const finalCostValue = normalizeCostValue(repairFinalCostInput?.value ?? "");
      const actFile = mode === "repaired" ? resolveRepairActFile() : null;
      if (mode === "repaired") {
        if (finalCostValue === null) {
          setRepairFormMessage("Введите корректную стоимость ремонта.", "error");
          repairFinalCostInput?.focus();
          markRepairFormFieldError(repairFinalCostInput);
          return;
        }
        if (!actFile) {
          setRepairFormMessage("Прикрепите акт ремонта.", "error");
          markRepairFormFieldError(
            repairActPhotoInput || repairActInput || repairFinalCostInput
          );
          return;
        }
      }
      repairFormState.isSaving = true;
      setRepairFormMessage("Сохраняем данные...", "info");
      try {
        const toolsPath = `./${orgFolder}/База с инструментами.json`;
        const repairsPath = `./${orgFolder}/Ремонты.json`;
        const [rawTools, rawRepairs] = await Promise.all([
          loadJson(toolsPath).catch(() => []),
          loadJson(repairsPath).catch(() => []),
        ]);
        const tools = normalizeToolsData(rawTools);
        const repairs = Array.isArray(rawRepairs)
          ? rawRepairs
          : Array.isArray(rawRepairs?.repairs)
            ? rawRepairs.repairs
            : [];
        const selectedNumber = normalizeToolNumberValue(tool?.["Номер"] ?? "");
        const selectedAccounting = String(tool?.["Бух.номер"] ?? "").trim();
        const toolIndex = tools.findIndex((entry) => {
          const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
          const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
          if (selectedNumber && entryNumber === selectedNumber) return true;
          if (selectedAccounting && entryAccounting === selectedAccounting) {
            return true;
          }
          return false;
        });
        if (toolIndex < 0) {
          setRepairFormMessage("Инструмент не найден в базе.", "error");
          repairFormState.isSaving = false;
          return;
        }
        const dateValue = formatDateValue(new Date());
        const markerRaw = String(
          user?.full_name ?? user?.fullName ?? currentUser?.full_name ?? ""
        ).trim();
        const marker = markerRaw ? formatFullName(markerRaw) : "Пользователь";
        const updatedTools = [...tools];
        if (mode === "repaired") {
          updatedTools[toolIndex] = {
            ...updatedTools[toolIndex],
            "Статус": "Рабочий",
          };
          const repairPayload = {
            "Стоимость ремонта": finalCostValue,
            "Дата ремонта": dateValue,
            "Пользователь, который вернул из ремонта": marker,
          };
          const updatedRepairs = [...repairs];
          let repairIndex = -1;
          for (let index = updatedRepairs.length - 1; index >= 0; index -= 1) {
            const entry = updatedRepairs[index];
            const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
            const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
            if (selectedNumber && entryNumber === selectedNumber) {
              repairIndex = index;
              break;
            }
            if (selectedAccounting && entryAccounting === selectedAccounting) {
              repairIndex = index;
              break;
            }
          }
          if (repairIndex >= 0) {
            updatedRepairs[repairIndex] = {
              ...updatedRepairs[repairIndex],
              ...repairPayload,
            };
          } else {
            updatedRepairs.push({
              "Номер": String(tool?.["Номер"] ?? "").trim(),
              "Бух.номер": String(tool?.["Бух.номер"] ?? "").trim(),
              "Ответственный": String(tool?.["Ответственный"] ?? "").trim(),
              ...repairPayload,
            });
          }
          const actName = buildRepairActFileName(
            resolveToolNumberValue(tool) || "акт",
            dateValue,
            actFile?.name ?? ""
          );
          const actContent = await readFileAsBase64(actFile);
          const meta = buildUploadUserMeta({
            organizationName: context.orgFullName,
          });
          await saveEntriesViaEndpoint([
            {
              type: "file",
              path: `${orgFolder}/Акты ремонтов/${actName}`,
              content: actContent,
              encoding: "base64",
              mime: actFile?.type || "application/octet-stream",
              ...meta,
            },
            { path: toolsPath, data: updatedTools, ...meta },
            { path: repairsPath, data: updatedRepairs, ...meta },
          ]);
          const actFileUrl = buildRepairActUrl(orgFolder, actName);
          await notifyRepaired({
            tool: updatedTools[toolIndex],
            orgFolder,
            repairDate: dateValue,
            repairCost: finalCostValue,
            repairedBy: marker,
            actFileUrl,
          });
          syncToolStatusInStates(updatedTools[toolIndex], "Рабочий");
          setRepairMessage("Инструмент отремонтирован.", "success");
        } else {
          const organization = String(repairOrganizationInput?.value ?? "").trim();
          updatedTools[toolIndex] = {
            ...updatedTools[toolIndex],
            "Статус": "В ремонте",
          };
          const repairEntry = {
            "Номер": String(tool?.["Номер"] ?? "").trim(),
            "Бух.номер": String(tool?.["Бух.номер"] ?? "").trim(),
            "Ответственный": String(tool?.["Ответственный"] ?? "").trim(),
            "Организация": organization,
            "Предварительное описание ремонта": description,
            "Предварительная стоимость ремонта": cost,
            "Дата отправки в ремонт": dateValue,
            "Пользователь, который отправил в ремонт": marker,
          };
          const updatedRepairs = [...repairs, repairEntry];
          const meta = buildUploadUserMeta({
            organizationName: context.orgFullName,
          });
          await saveEntries([
            { path: toolsPath, data: updatedTools, ...meta },
            { path: repairsPath, data: updatedRepairs, ...meta },
          ]);

          await notifySendToRepair({
            tool: updatedTools[toolIndex],
            orgFolder,
            organizationName: organization,
            description,
            cost,
            repairDate: dateValue,
            markedBy: marker,
          });

          syncToolStatusInStates(updatedTools[toolIndex], "В ремонте");
          setRepairMessage("Инструмент отправлен в ремонт.", "success");
        }
        closeRepairFormModal();
        await loadRepairTools();
      } catch (error) {
        console.error(error);
        const reason =
          error instanceof Error && error.message
            ? `Причина: ${error.message}`
            : "Проверьте сервер.";
        setRepairFormMessage(`Не удалось сохранить. ${reason}`, "error");
      } finally {
        repairFormState.isSaving = false;
      }
    });
  }

  if (objectsFormEl) {
    objectsFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
    });
  }

  if (objectsCreateFormEl) {
    objectsCreateFormEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      const nameRaw = objectsCreateNameInput?.value ?? "";
      const name = sanitizeObjectName(nameRaw);
      if (!name) {
        setObjectsCreateMessage("Введите название объекта.");
        objectsCreateNameInput?.focus();
        return;
      }
      const { coordinates, error } = parseCoordinatesInput(
        objectsCreateCoordinatesInput?.value
      );
      if (error) {
        setObjectsCreateMessage(error);
        objectsCreateCoordinatesInput?.focus();
        return;
      }
      const duplicate = objectsState.items.some(
        (item) => item.name.toLowerCase() === name.toLowerCase()
      );
      if (duplicate) {
        setObjectsCreateMessage("Такой объект уже есть.");
        return;
      }
      const newItem = {
        id: buildObjectId(),
        name,
        coordinates: coordinates ?? null,
      };
      objectsState.items = [...objectsState.items, newItem];
      setObjectsFilterValue("");
      renderObjectsList();
      await saveObjects();
      closeObjectsCreateModal();
    });
  }

  if (objectsEditFormEl) {
    objectsEditFormEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (objectsState.isSaving) return;
      const item = objectsState.items.find(
        (entry) => entry.id === objectsState.editingId
      );
      if (!item) {
        setObjectsEditMessage("Не удалось найти объект.");
        return;
      }
      const nameRaw = objectsEditNameInput?.value ?? "";
      const name = sanitizeObjectName(nameRaw);
      if (!name) {
        setObjectsEditMessage("Введите название объекта.");
        objectsEditNameInput?.focus();
        return;
      }
      const { coordinates, error } = parseCoordinatesInput(
        objectsEditCoordinatesInput?.value
      );
      if (error) {
        setObjectsEditMessage(error);
        objectsEditCoordinatesInput?.focus();
        return;
      }
      const duplicate = objectsState.items.some(
        (entry) =>
          entry.id !== item.id && entry.name.toLowerCase() === name.toLowerCase()
      );
      if (duplicate) {
        setObjectsEditMessage("Такой объект уже есть.");
        return;
      }
      const oldName = item.name;
      objectsState.items = objectsState.items.map((entry) =>
        entry.id === item.id
          ? { ...entry, name, coordinates: coordinates ?? null }
          : entry
      );
      const nameChanged = normalizeObjectCompare(oldName) !== normalizeObjectCompare(name);
      if (nameChanged) {
        const oldKey = normalizeObjectCompare(oldName);
        const newKey = normalizeObjectCompare(name);
        const count = objectsState.toolsCount.get(oldKey);
        if (count !== undefined) {
          objectsState.toolsCount.set(newKey, count);
          objectsState.toolsCount.delete(oldKey);
        }
      }
      objectsState.isSaving = true;
      setObjectsEditMessage("Сохраняем изменения...");
      try {
        const entries = [];
        const meta = { user };
        entries.push({ path: objectsPath, data: objectsState.items, ...meta });
        if (nameChanged) {
          const orgFolder = context.orgFolderName ?? "";
          const movesPath = orgFolder ? `./${orgFolder}/Перемещения.json` : "";
          const updateTargets = [
            { key: "tools", path: toolsDatabasePath },
            { key: "demand", path: demandPath },
            ...(movesPath ? [{ key: "moves", path: movesPath }] : []),
          ];
          const results = await Promise.allSettled(
            updateTargets.map((target) => loadJson(target.path))
          );
          let updatedTools = null;
          results.forEach((result, index) => {
            if (result.status !== "fulfilled") return;
            const target = updateTargets[index];
            const update = updateObjectNameInData(result.value, oldName, name);
            if (!update.changed) return;
            entries.push({ path: target.path, data: update.data, ...meta });
            if (target.key === "tools") {
              updatedTools = update.data;
            }
          });
          if (updatedTools) {
            const normalizedTools = normalizeToolsData(updatedTools);
            objectsState.toolsCount = buildObjectsToolCounts(normalizedTools);
            toolsState.tools = replaceObjectNameInToolsList(
              toolsState.tools,
              oldName,
              name
            );
            toolsState.filtered = replaceObjectNameInToolsList(
              toolsState.filtered,
              oldName,
              name
            );
          }
          demandState.items = replaceObjectNameInDemands(
            demandState.items,
            oldName,
            name
          );
          demandState.filtered = replaceObjectNameInDemands(
            demandState.filtered,
            oldName,
            name
          );
          demandState.objects = replaceObjectNameInList(
            demandState.objects,
            oldName,
            name
          );
          addToolState.objectOptions = replaceObjectNameInList(
            addToolState.objectOptions,
            oldName,
            name
          );
          toolsMoveState.objectOptions = replaceObjectNameInList(
            toolsMoveState.objectOptions,
            oldName,
            name
          );
        }
        await saveEntries(entries);
        setObjectsEditMessage("Объект обновлён.");
        renderObjectsList();
        setTimeout(() => {
          closeObjectsEditModal();
        }, 400);
      } catch (error) {
        console.error(error);
        setObjectsEditMessage("Не удалось сохранить изменения.");
      } finally {
        objectsState.isSaving = false;
      }
    });
  }

  if (objectsFilterInput) {
    objectsFilterInput.addEventListener("input", (event) => {
      const value = event.target?.value ?? "";
      setObjectsFilterValue(value);
      renderObjectsList();
    });
  }

  if (objectsCreateButton) {
    objectsCreateButton.addEventListener("click", () => {
      openObjectsCreateModal();
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
        openObjectsEditModal(item);
        return;
      }
      if (action === "delete") {
        const countKey = sanitizeObjectName(item.name).toLowerCase();
        const toolCount = objectsState.toolsCount.get(countKey) ?? 0;
        if (toolCount > 0) {
          setObjectsMessage(
            "Нельзя удалить объект, пока на нем есть инструменты."
          );
          return;
        }
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

  const getDemandToolSuggestions = (query) => {
    const values = [
      ...(demandState.items ?? []).map((item) => item.item),
      ...(demandState.toolSuggestions ?? []),
    ].filter(Boolean);
    if (!values.length) return [];
    if (!normalizeSuggestionValue(query)) {
      return buildCommonSuggestions(values, 6);
    }
    return filterSuggestions(values, query, 6);
  };

  const getSelectableSuggestions = (options, query) =>
    filterSelectableOptions(options, query, 8);

  const getRepairOrganizationSuggestions = (query) => {
    const values = repairFormState.organizations ?? [];
    if (!normalizeSuggestionValue(query)) {
      return buildCommonSuggestions(values, 6);
    }
    return filterSuggestions(values, query, 6);
  };

  attachDynamicSuggestions({
    inputEl: addToolNameInput,
    containerEl: addToolNameSuggestionsEl,
    getItems: getToolNameSuggestions,
  });

  attachDynamicSuggestions({
    inputEl: demandItemInput,
    containerEl: demandToolsSuggestionsEl,
    getItems: getDemandToolSuggestions,
    showOnFocus: true,
  });

  attachDynamicSuggestions({
    inputEl: demandObjectInput,
    containerEl: demandObjectSuggestionsEl,
    getItems: (query) => getSelectableSuggestions(demandState.objects, query),
    showOnFocus: true,
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
    inputEl: repairOrganizationInput,
    containerEl: repairOrganizationSuggestionsEl,
    getItems: getRepairOrganizationSuggestions,
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

  const isEnergyResponsible = (name) => {
    const normalizedName = normalizePersonName(name ?? "");
    if (!normalizedName) return false;
    const role = toolsMoveState.responsibleRoles.get(normalizedName) ?? "";
    return String(role).trim().toLowerCase() === "энергетик";
  };

  const updateToolsMoveReasonState = (responsibleName) => {
    if (!toolsMoveReasonFieldEl || !toolsMoveReasonInput) return;
    const shouldRequire = isEnergyResponsible(responsibleName);
    toolsMoveReasonFieldEl.classList.toggle("is-hidden", !shouldRequire);
    toolsMoveReasonInput.required = shouldRequire;
    if (!shouldRequire) {
      toolsMoveReasonInput.value = "";
    }
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
  let addToolKitRowCounter = 0;

  const setAddToolKitExpanded = (expanded) => {
    if (!addToolKitToggleButton || !addToolKitPanelEl) return;
    addToolKitToggleButton.setAttribute("aria-expanded", expanded ? "true" : "false");
    addToolKitPanelEl.classList.toggle("is-hidden", !expanded);
    addToolKitBlockEl?.classList.toggle("is-open", expanded);
    addToolKitToggleButton.textContent = expanded
      ? "Скрыть комплектацию"
      : "Добавить комплектацию";
  };

  const createAddToolKitRow = () => {
    if (!addToolKitListEl) return;
    addToolKitRowCounter += 1;
    const rowId = String(addToolKitRowCounter);
    const rowEl = document.createElement("div");
    rowEl.className = "add-tool-kit__row";
    rowEl.dataset.kitRow = rowId;
    rowEl.innerHTML = `
      <label class="form-field form-field--required add-tool-kit__field add-tool-kit__field--name">
        <span class="form-label">Позиция комплекта</span>
        <input class="form-input" type="text" name="tool-kit-name-${rowId}" placeholder="Например, кейс" autocomplete="off" />
      </label>
      <label class="form-field add-tool-kit__field add-tool-kit__field--count">
        <span class="form-label">Количество</span>
        <input class="form-input" type="text" inputmode="numeric" name="tool-kit-count-${rowId}" placeholder="Необязательно" autocomplete="off" />
      </label>
      <label class="form-field add-tool-kit__field add-tool-kit__field--accounting">
        <span class="form-label">Бух.номер</span>
        <input class="form-input" type="text" inputmode="numeric" name="tool-kit-accounting-${rowId}" placeholder="Необязательно" autocomplete="off" />
      </label>
      <button class="button-icon add-tool-kit__remove" type="button" data-add-tool-kit-remove aria-label="Удалить позицию">
        <span class="button-icon-emoji" aria-hidden="true">✕</span>
      </button>
    `;
    addToolKitListEl.append(rowEl);
  };

  const clearAddToolKitRows = () => {
    if (!addToolKitListEl) return;
    addToolKitListEl.innerHTML = "";
    addToolKitRowCounter = 0;
  };

  const collectAddToolKitItems = () => {
    if (!addToolKitListEl) return [];
    const rows = Array.from(addToolKitListEl.querySelectorAll("[data-kit-row]"));
    return rows
      .map((row) => {
        const nameInput = row.querySelector('input[name^="tool-kit-name-"]');
        const countInput = row.querySelector('input[name^="tool-kit-count-"]');
        const accountingInput = row.querySelector(
          'input[name^="tool-kit-accounting-"]'
        );
        return {
          name: normalizeSuggestionValue(nameInput?.value ?? ""),
          count: normalizeSuggestionValue(countInput?.value ?? ""),
          accountingNumber: normalizeSuggestionValue(accountingInput?.value ?? ""),
          nameInput,
        };
      })
      .filter((item) => item.name || item.count || item.accountingNumber);
  };

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
    clearAddToolKitRows();
    setAddToolKitExpanded(false);
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

  const buildRepairActFileName = (toolNumber, dateValue, originalName = "") => {
    const safeNumber = sanitizeFileName(String(toolNumber ?? "акт"));
    let extension = originalName.includes(".")
      ? originalName.split(".").pop()
      : "";
    if (!extension) {
      extension = "file";
    }
    const randomSuffix = buildRandomSuffix(2);
    const baseName = `${safeNumber}_${dateValue}_${randomSuffix}`;
    const rawName = `${baseName}.${extension}`;
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
  if (addToolKitToggleButton) {
    addToolKitToggleButton.addEventListener("click", () => {
      const isExpanded = addToolKitToggleButton.getAttribute("aria-expanded") === "true";
      const nextExpanded = !isExpanded;
      setAddToolKitExpanded(nextExpanded);
      if (nextExpanded && !addToolKitListEl?.children.length) {
        createAddToolKitRow();
        updateAddToolFilledStates();
      }
    });
  }
  if (addToolKitAddButton) {
    addToolKitAddButton.addEventListener("click", () => {
      createAddToolKitRow();
      updateAddToolFilledStates();
    });
  }
  if (addToolKitListEl) {
    addToolKitListEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const removeButton = target.closest("[data-add-tool-kit-remove]");
      if (!removeButton) return;
      const row = removeButton.closest("[data-kit-row]");
      row?.remove();
      if (!addToolKitListEl.children.length) {
        createAddToolKitRow();
      }
      updateAddToolFilledStates();
    });
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
        const kitItems = collectAddToolKitItems();

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
        kitItems.forEach((item) => {
          if (!item.name) {
            pushError(
              "Для позиции комплектации заполните наименование.",
              item.nameInput
            );
          }
        });

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
            "Комплектация": kitItems.map((item) => ({
              "Наименование": item.name,
              "Количество": item.count,
              "Бух.номер": item.accountingNumber,
            })),
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

  const getFineBalanceByTitle = (rawFines, userName, fineTitle) => {
    const summaryByUsers =
      rawFines && typeof rawFines === "object" && !Array.isArray(rawFines)
        ? rawFines["Штрафы по пользователям"]
        : null;
    if (!summaryByUsers || typeof summaryByUsers !== "object") return 0;
    const targetName = normalizePersonName(userName);
    const matchedEntry = Object.entries(summaryByUsers).find(([name]) => {
      return normalizePersonName(name) === targetName;
    });
    if (!matchedEntry) return 0;
    const userSummary = matchedEntry[1];
    const typeSummary =
      userSummary && typeof userSummary === "object" ? userSummary[fineTitle] : null;
    return normalizeCostValue(typeSummary?.["Остаток"] ?? 0) || 0;
  };

  const loadResponsibleVacationStats = async (entry) => {
    const fullName = String(entry?.full_name ?? "").trim();
    if (!fullName || !context.orgFolderName) {
      return { toolsCount: 0, fineItems: [] };
    }
    const settingsPath = `./${context.orgFolderName}/Настройки.json`;
    const finesPath = `./${context.orgFolderName}/Штрафы.json`;
    const toolsPath = `./${context.orgFolderName}/База с инструментами.json`;
    const [rawTools, settingsData, rawFines] = await Promise.all([
      loadJson(toolsPath).catch(() => []),
      loadJson(settingsPath).catch(() => ({})),
      loadJson(finesPath).catch(() => ({})),
    ]);
    const tools = normalizeToolsData(rawTools);
    const toolsCount = tools.filter((tool) => {
      return (
        normalizePersonName(tool?.["Ответственный"] ?? "") ===
        normalizePersonName(fullName)
      );
    }).length;

    const fineSettings = settingsData?.organization?.fines ?? {};
    const fineItems = Object.entries(fineSettings)
      .filter(([, config]) => Boolean(config?.enabled))
      .map(([key]) => {
        const title = fineTitleBySettingKey[key] ?? key;
        return {
          key,
          title,
          balance: getFineBalanceByTitle(rawFines, fullName, title),
        };
      });

    return { toolsCount, fineItems };
  };

  const renderVacationSearchResults = (options, query = "") => {
    if (!usersVacationSearchResultsEl) return;
    usersVacationSearchResultsEl.innerHTML = "";
    const normalizedQuery = normalizePersonName(query);
    const filtered = !normalizedQuery
      ? options
      : options.filter((item) => {
          const fullName = normalizePersonName(item?.full_name ?? "");
          const roleName = normalizePersonName(item?.role ?? "");
          return fullName.includes(normalizedQuery) || roleName.includes(normalizedQuery);
        });
    if (!filtered.length) {
      usersVacationSearchResultsEl.classList.remove("is-hidden");
      const empty = document.createElement("div");
      empty.className = "users-vacation__search-empty";
      empty.textContent = "Никого не нашли. Попробуйте другой запрос.";
      usersVacationSearchResultsEl.appendChild(empty);
      return;
    }
    filtered.forEach((item) => {
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.className = "users-vacation__search-option";
      optionButton.innerHTML = `<strong>${formatFullName(
        String(item?.full_name ?? "")
      )}</strong><span>${String(item?.role ?? "").trim()}</span>`;
      optionButton.addEventListener("click", () => {
        const fullName = String(item?.full_name ?? "").trim();
        if (usersVacationReplacerSelect) {
          usersVacationReplacerSelect.value = fullName;
        }
        if (usersVacationReplacerSearchInput) {
          usersVacationReplacerSearchInput.value = formatFullName(fullName);
          usersVacationReplacerSearchInput.focus();
        }
        void updateVacationReplacerPendingNote();
        usersVacationSearchResultsEl.classList.add("is-hidden");
      });
      usersVacationSearchResultsEl.appendChild(optionButton);
    });
    usersVacationSearchResultsEl.classList.remove("is-hidden");
  };

  const updateVacationReplacerPendingNote = async () => {
    if (!usersVacationReplacerPendingNoteEl) return;
    let replacerName = String(usersVacationReplacerSelect?.value ?? "").trim();
    if (!replacerName) {
      replacerName = String(usersVacationReplacerSearchInput?.value ?? "").trim();
    }
    let pendingCount = 0;
    let replacedUserPendingCount = 0;
    if (replacerName && context?.orgFolderName) {
      pendingCount = await loadUserPendingMovesCount(context.orgFolderName, {
        full_name: replacerName,
      });
    }
    if (selectedVacationUser?.full_name && context?.orgFolderName) {
      replacedUserPendingCount = await loadUserPendingMovesCount(context.orgFolderName, {
        full_name: String(selectedVacationUser.full_name).trim(),
      });
    }
    usersVacationReplacerPendingNoteEl.textContent =
      `Инструментов другого пользователя на принятии: ${pendingCount}. У заменяемого сотрудника на принятии: ${replacedUserPendingCount}`;
  };

  const fillVacationReplacers = (entry) => {
    if (!usersVacationReplacerSelect) return;
    usersVacationReplacerSelect.innerHTML = '<option value="">Выберите сотрудника</option>';
    const options = filterOrgUsers(usersState.users, selectedUsersOrgNames).filter((item) => {
      const role = String(item?.role ?? "").trim();
      return (
        (role === energyRole || role === responsibleRole) &&
        normalizePersonName(item?.full_name ?? "") !==
          normalizePersonName(entry?.full_name ?? "")
      );
    });
    usersVacationReplacerSelect.dataset.available = JSON.stringify(
      options.map((item) => ({
        full_name: String(item?.full_name ?? "").trim(),
        role: String(item?.role ?? "").trim(),
      }))
    );
    options.forEach((item) => {
      const option = document.createElement("option");
      option.value = String(item?.full_name ?? "").trim();
      option.textContent = `${formatFullName(option.value)} · ${String(
        item?.role ?? ""
      ).trim()}`;
      usersVacationReplacerSelect.appendChild(option);
    });
    if (usersVacationReplacerSearchInput) {
      usersVacationReplacerSearchInput.value = "";
    }
    if (usersVacationSearchResultsEl) {
      usersVacationSearchResultsEl.classList.add("is-hidden");
      usersVacationSearchResultsEl.innerHTML = "";
    }
    void updateVacationReplacerPendingNote();
  };

  const setVacationMessage = (message = "", type = "") => {
    if (!usersVacationMessageEl) return;
    usersVacationMessageEl.textContent = message;
    usersVacationMessageEl.dataset.type = type;
  };

  const closeUsersVacationModal = () => {
    if (!usersVacationModalEl) return;
    usersVacationModalEl.classList.add("is-hidden");
    if (usersVacationReplaceBox) {
      usersVacationReplaceBox.classList.add("is-hidden");
    }
    selectedVacationUser = null;
    if (usersVacationReplacerSearchInput) {
      usersVacationReplacerSearchInput.value = "";
    }
    if (usersVacationSearchResultsEl) {
      usersVacationSearchResultsEl.classList.add("is-hidden");
      usersVacationSearchResultsEl.innerHTML = "";
    }
    setVacationMessage("");
  };

  const openUsersVacationModal = async (entry) => {
    if (!usersVacationModalEl || !entry) return;
    selectedVacationUser = entry;
    const roleName = String(entry?.role ?? "").trim();
    if (usersVacationNameEl) {
      usersVacationNameEl.textContent = formatFullName(String(entry?.full_name ?? ""));
    }
    if (usersVacationRoleEl) {
      usersVacationRoleEl.textContent = roleName || "Роль не указана";
    }
    const stats = await loadResponsibleVacationStats(entry);
    if (usersVacationToolsCountEl) {
      usersVacationToolsCountEl.textContent = String(stats.toolsCount);
    }
    if (usersVacationFinesEl) {
      usersVacationFinesEl.innerHTML = "";
      if (!stats.fineItems.length) {
        const empty = document.createElement("div");
        empty.className = "users-vacation__fine-empty";
        empty.textContent = "Нет включённых типов штрафов.";
        usersVacationFinesEl.appendChild(empty);
      } else {
        stats.fineItems.forEach((item) => {
          const row = document.createElement("div");
          row.className = "users-vacation__fine-row";
          row.innerHTML = `<span>${item.title}</span><strong>Остаток: ${item.balance}</strong>`;
          usersVacationFinesEl.appendChild(row);
        });
      }
    }
    if (usersVacationReplaceBox) {
      usersVacationReplaceBox.classList.add("is-hidden");
    }
    const isVacation = Boolean(entry?.on_vacation);
    usersVacationTriggerButton?.classList.toggle("is-hidden", isVacation);
    usersVacationReturnButton?.classList.toggle("is-hidden", !isVacation);
    fillVacationReplacers(entry);
    setVacationMessage("");
    usersVacationModalEl.classList.remove("is-hidden");
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
      const isResponsible = roleName === responsibleRole;
      const isVacation = Boolean(entry?.on_vacation);
      const vacationReplacer = String(entry?.vacation_replacer ?? "").trim();
      telegramStatus.textContent = hasTelegramId ? "ID привязан" : "ID не привязан";
      telegramStatus.classList.toggle("is-linked", hasTelegramId);
      meta.append(roleTag, telegramStatus);

      if (isVacation) {
        card.classList.add("is-vacation");
        const vacationTag = document.createElement("span");
        vacationTag.className = "users-details__status is-vacation";
        vacationTag.textContent = vacationReplacer
          ? `В отпуске · заменяет: ${formatFullName(vacationReplacer)}`
          : "В отпуске";
        meta.appendChild(vacationTag);
      }

      info.append(name, meta);
      card.append(initials, info);
      const isCurrentUserCard =
        normalizePersonName(entry?.full_name ?? "") ===
        normalizePersonName(currentUser?.full_name ?? currentUser?.fullName ?? "");
      if (isResponsible || isCurrentUserCard) {
        card.classList.add("is-actionable");
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute(
          "aria-label",
          `Открыть карточку пользователя: ${name.textContent}`
        );
        const handleOpenVacation = () => {
          openUsersVacationModal(entry);
        };
        card.addEventListener("click", handleOpenVacation);
        card.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleOpenVacation();
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
    closeUsersVacationModal();
    resetUsersInvite();
    document.body.style.overflow = "";
  };

  const returnResponsibleFromVacation = async () => {
    if (!selectedVacationUser) return;
    const sourceName = String(selectedVacationUser?.full_name ?? "").trim();
    if (!sourceName) return;
    const isConfirmed = window.confirm(
      `Вернуть из отпуска ${formatFullName(sourceName)}?`
    );
    if (!isConfirmed) return;

    try {
      setVacationMessage("Сохраняем изменения...", "info");
      const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
      const nextUsers = Array.isArray(usersData?.users) ? [...usersData.users] : [];
      const targetIndex = nextUsers.findIndex((item) => {
        return (
          normalizePersonName(item?.full_name ?? "") ===
            normalizePersonName(sourceName) &&
          normalizeOrganizationName(item?.organization ?? "") ===
            normalizeOrganizationName(selectedVacationUser?.organization ?? "")
        );
      });
      if (targetIndex < 0) {
        setVacationMessage("Не удалось найти пользователя в users.json.", "error");
        return;
      }
      nextUsers[targetIndex] = {
        ...nextUsers[targetIndex],
        on_vacation: false,
        vacation_replacer: "",
        vacation_start_at: "",
      };
      await saveJson(usersFilePath, { users: nextUsers }, { user });
      usersState.users = nextUsers;
      updateUsersDetailsView();
      setVacationMessage("Готово. Сотрудник возвращён из отпуска.", "success");
      setTimeout(() => {
        closeUsersVacationModal();
      }, 500);
    } catch (error) {
      console.error(error);
      setVacationMessage("Не удалось вернуть сотрудника из отпуска.", "error");
    }
  };

  const applyResponsibleVacation = async () => {
    if (!selectedVacationUser) return;
    const replacerName = String(usersVacationReplacerSelect?.value ?? "").trim();
    if (!replacerName) {
      setVacationMessage("Выберите, кто заменяет ответственного.", "error");
      return;
    }
    const sourceName = String(selectedVacationUser?.full_name ?? "").trim();
    if (!sourceName) return;
    const isConfirmed = window.confirm(
      `Отправить в отпуск ${formatFullName(sourceName)} и назначить замену: ${formatFullName(
        replacerName
      )}?`
    );
    if (!isConfirmed) return;

    try {
      setVacationMessage("Сохраняем изменения...", "info");
      const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
      const nextUsers = Array.isArray(usersData?.users) ? [...usersData.users] : [];
      const targetIndex = nextUsers.findIndex((item) => {
        return (
          normalizePersonName(item?.full_name ?? "") ===
            normalizePersonName(sourceName) &&
          normalizeOrganizationName(item?.organization ?? "") ===
            normalizeOrganizationName(selectedVacationUser?.organization ?? "")
        );
      });
      if (targetIndex < 0) {
        setVacationMessage("Не удалось найти пользователя в users.json.", "error");
        return;
      }
      nextUsers[targetIndex] = {
        ...nextUsers[targetIndex],
        on_vacation: true,
        vacation_replacer: replacerName,
        vacation_start_at: new Date().toISOString(),
      };
      await saveJson(usersFilePath, { users: nextUsers }, { user });
      usersState.users = nextUsers;
      updateUsersDetailsView();
      setVacationMessage("Готово. Ответственный отправлен в отпуск.", "success");
      setTimeout(() => {
        closeUsersVacationModal();
      }, 500);
    } catch (error) {
      console.error(error);
      setVacationMessage("Не удалось сохранить отпуск. Попробуйте позже.", "error");
    }
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
  usersVacationBackdropEl?.addEventListener("click", closeUsersVacationModal);
  usersVacationCloseButton?.addEventListener("click", closeUsersVacationModal);
  usersVacationTriggerButton?.addEventListener("click", () => {
    usersVacationReplaceBox?.classList.remove("is-hidden");
    setVacationMessage("");
  });
  usersVacationCancelButton?.addEventListener("click", () => {
    usersVacationReplaceBox?.classList.add("is-hidden");
    setVacationMessage("");
  });
  usersVacationReturnButton?.addEventListener("click", returnResponsibleFromVacation);
  usersVacationReplacerSearchInput?.addEventListener("input", () => {
    let options = [];
    try {
      options = JSON.parse(usersVacationReplacerSelect?.dataset.available ?? "[]");
    } catch (error) {
      options = [];
    }
    renderVacationSearchResults(options, usersVacationReplacerSearchInput.value);
    void updateVacationReplacerPendingNote();
  });
  usersVacationReplacerSearchInput?.addEventListener("focus", () => {
    let options = [];
    try {
      options = JSON.parse(usersVacationReplacerSelect?.dataset.available ?? "[]");
    } catch (error) {
      options = [];
    }
    renderVacationSearchResults(options, usersVacationReplacerSearchInput.value);
  });
  usersVacationReplacerSearchInput?.addEventListener("blur", () => {
    window.setTimeout(() => {
      usersVacationSearchResultsEl?.classList.add("is-hidden");
    }, 120);
  });
  usersVacationReplacerSelect?.addEventListener("change", () => {
    void updateVacationReplacerPendingNote();
  });
  usersVacationConfirmButton?.addEventListener("click", applyResponsibleVacation);
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

    const syncCardState = (input) => {
      if (!input?.matches('input[type="checkbox"]')) return;
      if (!/(^fine-.*-enabled$|^mailing-.*-enabled$|^notification-.*-enabled$)/.test(input.name)) {
        return;
      }
      const card = input.closest("[data-settings-card]");
      if (!card) return;
      card.classList.toggle("is-disabled", !input.checked);
    };

    settingsBodyEl
      .querySelectorAll('input[type="checkbox"]')
      .forEach((input) => syncCardState(input));

    settingsBodyEl.addEventListener("change", (event) => {
      syncCardState(event.target);
    });
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

  const renderFeedbackFiles = () => {
    if (!feedbackFilesEl || !feedbackPhotosEl) return;
    const files = Array.from(feedbackPhotosEl.files ?? []);
    if (!files.length) {
      feedbackFilesEl.textContent = "Фото не выбраны.";
      return;
    }
    feedbackFilesEl.textContent = files
      .map((file, index) => `${index + 1}. ${file.name}`)
      .join("\n");
  };

  const syncFeedbackAnonymousHint = () => {
    if (!feedbackHintEl || !feedbackAnonymousEl) return;
    feedbackHintEl.textContent = feedbackAnonymousEl.checked
      ? "Обращение отправится анонимно. Ответ от администраторов вы не получите."
      : "Обращение отправится с вашими данными, чтобы вам могли ответить.";
  };

  const closeFeedbackModal = () => {
    if (!feedbackModalEl) return;
    feedbackModalEl.classList.add("is-hidden");
    closeFeedbackDetails();
    document.body.style.overflow = "";
    feedbackFormEl?.reset();
    if (feedbackStatusEl) feedbackStatusEl.textContent = "";
    renderFeedbackFiles();
    syncFeedbackAnonymousHint();
  };

  const openFeedbackModal = () => {
    if (!feedbackModalEl) return;
    feedbackModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    syncFeedbackAnonymousHint();
    renderFeedbackFiles();
  };

  feedbackBackdropEl?.addEventListener("click", closeFeedbackModal);
  feedbackCloseButton?.addEventListener("click", closeFeedbackModal);
  feedbackCancelButton?.addEventListener("click", closeFeedbackModal);
  feedbackAnonymousEl?.addEventListener("change", syncFeedbackAnonymousHint);
  feedbackPhotosEl?.addEventListener("change", renderFeedbackFiles);
  feedbackModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeFeedbackModal();
    }
  });

  feedbackFormEl?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = String(feedbackMessageEl?.value ?? "").trim();
    const isAnonymous = Boolean(feedbackAnonymousEl?.checked);
    const photoFiles = Array.from(feedbackPhotosEl?.files ?? []);

    if (!message) {
      if (feedbackStatusEl) feedbackStatusEl.textContent = "Напишите текст обращения.";
      return;
    }

    if (feedbackStatusEl) {
      feedbackStatusEl.textContent = "Сохраняем обращение...";
    }

    try {
      const photos = [];
      for (const file of photoFiles) {
        const content = await readFileAsBase64(file);
        photos.push({
          content,
          extension: getFileExtensionFromName(file.name),
        });
      }

      const payload = {
        type: "feedback-request",
        text: message,
        anonymous: isAnonymous,
        organization: currentUser?.organization ?? user?.organization ?? "",
        createdBy: {
          telegram_id: currentUser?.telegram_id ?? null,
          full_name: currentUser?.full_name ?? currentUser?.fullName ?? user?.full_name ?? "",
          role: currentUser?.role ?? user?.role ?? "",
          organization: currentUser?.organization ?? user?.organization ?? "",
        },
        photos,
      };

      await saveEntriesViaEndpoint([payload]);
      if (feedbackStatusEl) {
        feedbackStatusEl.textContent = "Спасибо! Обращение отправлено.";
      }
      setTimeout(() => {
        closeFeedbackModal();
      }, 700);
    } catch (error) {
      console.error(error);
      if (feedbackStatusEl) {
        feedbackStatusEl.textContent =
          error instanceof Error
            ? error.message
            : "Не удалось отправить обращение. Попробуйте ещё раз.";
      }
    }
  });

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

  const openQuickAccessPicker = () => {
    if (!quickAccessPickerEl) return;
    quickAccessDraft = [...quickAccessIds];
    renderQuickAccessPicker();
    setQuickAccessMessage(`Выбрано ${quickAccessDraft.length} из ${quickAccessLimit}`);
    quickAccessPickerEl.classList.remove("is-hidden");
  };

  const closeQuickAccessPicker = () => {
    if (!quickAccessPickerEl) return;
    quickAccessPickerEl.classList.add("is-hidden");
    setQuickAccessMessage("");
  };

  const handleEnergyAction = (actionId) => {
    if (!actionId) return false;
    if (actionId === "pending") {
      openPendingMovesModal();
      return true;
    }
    if (actionId === "settings") {
      openSettingsModal();
      return true;
    }
    if (actionId === "objects") {
      openObjectsModal();
      return true;
    }
    if (actionId === "users") {
      openUsersDetailsModal();
      return true;
    }
    if (actionId === "tools") {
      openToolsModal();
      return true;
    }
    if (isToolsReplacementActionId(actionId)) {
      const replacementFullName = actionId.replace(toolsReplacementActionPrefix, "");
      openReplacementToolsModal(replacementFullName);
      return true;
    }
    if (actionId === "base") {
      openBaseModal();
      return true;
    }
    if (actionId === "search") {
      openSearchModal();
      return true;
    }
    if (actionId === "move-other") {
      openMoveOtherModal();
      return true;
    }
    if (actionId === "add-photo") {
      openAddPhotoModal();
      return true;
    }
    if (actionId === "no-photo") {
      openNoPhotoModal();
      return true;
    }
    if (actionId === "remove-photo") {
      openRemovePhotoModal();
      return true;
    }
    if (actionId === "add-tool") {
      openAddToolModal();
      return true;
    }
    if (actionId === "write-off") {
      openWriteOffModal();
      return true;
    }
    if (actionId === "repair") {
      openRepairModal();
      return true;
    }
    if (actionId === "breakdowns") {
      openBreakdownsModal();
      return true;
    }
    if (actionId === "demand") {
      openDemandModal();
      return true;
    }
    return false;
  };

  quickAccessEditButton?.addEventListener("click", openQuickAccessPicker);
  quickAccessCancelButton?.addEventListener("click", closeQuickAccessPicker);
  quickAccessPickerGridEl?.addEventListener("click", (event) => {
    const option = event.target.closest("[data-action-id]");
    if (!option) return;
    const actionId = option.dataset.actionId;
    if (!actionId) return;
    const isSelected = quickAccessDraft.includes(actionId);
    if (!isSelected && quickAccessDraft.length >= quickAccessLimit) {
      setQuickAccessMessage(`Можно выбрать максимум ${quickAccessLimit} плашек.`);
      return;
    }
    quickAccessDraft = isSelected
      ? quickAccessDraft.filter((id) => id !== actionId)
      : [...quickAccessDraft, actionId];
    option.classList.toggle("is-selected", !isSelected);
    setQuickAccessMessage(`Выбрано ${quickAccessDraft.length} из ${quickAccessLimit}`);
  });

  const persistQuickAccessIds = async (nextIds, { renderGrid = false } = {}) => {
    quickAccessIds = nextIds.slice(0, quickAccessLimit);
    settingsData.users = settingsData.users ?? {};
    const currentUserSettings = settingsData.users?.[context.userKey] ?? {};
    settingsData.users[context.userKey] = {
      ...currentUserSettings,
      energy: {
        ...(currentUserSettings.energy ?? {}),
        quickAccess: quickAccessIds,
      },
    };
    try {
      setQuickAccessMessage("Сохраняем быстрый доступ...");
      await saveJson(context.settingsPath, settingsData, { user });
      renderQuickAccessList();
      if (renderGrid) {
        renderEnergyGrid();
        fitActionTitleTexts(gridEl);
      }
      closeQuickAccessPicker();
      setQuickAccessMessage("");
      return true;
    } catch (error) {
      console.error(error);
      setQuickAccessMessage("Не удалось сохранить. Проверьте соединение.");
      return false;
    }
  };

  quickAccessSaveButton?.addEventListener("click", async () => {
    if (quickAccessDraft.length === 0) {
      setQuickAccessMessage("Нужно выбрать хотя бы одну плашку.");
      return;
    }
    await persistQuickAccessIds(quickAccessDraft, { renderGrid: true });
  });

  quickAccessListEl?.addEventListener("click", (event) => {
    if (blockClick) return;
    const quickButton = event.target.closest("[data-action-id]");
    if (!quickButton) return;
    handleEnergyAction(quickButton.dataset.actionId);
  });

  gridEl.addEventListener("click", (event) => {
    if (blockClick) return;
    const targetCard = event.target.closest("[data-energy-item]");
    if (!targetCard) return;
    if (!isGrouping && Object.prototype.hasOwnProperty.call(targetCard.dataset, "energyFeedback")) {
      openFeedbackModal();
      return;
    }
    if (
      !isGrouping &&
      targetCard.dataset.energyItemType === "action" &&
      handleEnergyAction(targetCard.dataset.actionId)
    ) {
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
    source: null,
  };
  let quickAccessOrderDirty = false;
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
  const animateQuickAccessReorder = (firstRects) => {
    if (!quickAccessListEl) return;
    const items = Array.from(quickAccessListEl.querySelectorAll(".quick-access-item"));
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
            duration: 220,
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
    dragState.source = null;
    quickAccessOrderDirty = false;
  };

  const updateDragTransform = (clientX, clientY) => {
    if (!dragState.item) return;
    const deltaX = clientX - dragState.startCenterX;
    const deltaY = clientY - dragState.startCenterY;
    dragState.item.style.setProperty("--drag-x", `${deltaX}px`);
    dragState.item.style.setProperty("--drag-y", `${deltaY}px`);
  };

  const startDrag = (event, card, source) => {
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
    dragState.source = source;
    if (source === "quick") {
      quickAccessOrderDirty = false;
    }
    dragState.holdTimer = window.setTimeout(() => {
      if (!dragState.item) return;
      dragState.isDragging = true;
      dragState.item.classList.add("is-dragging");
      if (source === "grid") {
        gridEl.classList.add("is-dragging");
      }
      card.setPointerCapture(dragState.pointerId);
      updateDragTransform(dragState.lastPointerX, dragState.lastPointerY);
    }, event.pointerType === "touch" ? 280 : 200);
  };

  gridEl.addEventListener("pointerdown", (event) => {
    if (isGrouping) return;
    const card = event.target.closest("[data-energy-item]");
    if (!card) return;
    startDrag(event, card, "grid");
  });

  const handleDragMove = (event) => {
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
    if (dragState.source === "grid") {
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
      return;
    }
    if (dragState.source === "quick" && quickAccessListEl) {
      const target = document
        .elementsFromPoint(event.clientX, event.clientY)
        .map((element) => element.closest?.(".quick-access-item"))
        .find((element) => element && element !== dragState.item);
      if (!target || target === dragState.item) return;
      if (!quickAccessListEl.contains(target)) return;
      const items = Array.from(
        quickAccessListEl.querySelectorAll(".quick-access-item")
      );
      const firstRects = new Map(
        items.map((item) => [item, item.getBoundingClientRect()])
      );
      const draggedRect = dragState.item.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const centerX = rect.left + rect.width / 2;
      const shouldInsertAfter =
        event.clientY > centerY ||
        (Math.abs(event.clientY - centerY) < rect.height / 2 &&
          event.clientX > centerX);
      quickAccessListEl.insertBefore(
        dragState.item,
        shouldInsertAfter ? target.nextSibling : target
      );
      const updatedRect = dragState.item.getBoundingClientRect();
      dragState.startCenterX += updatedRect.left - draggedRect.left;
      dragState.startCenterY += updatedRect.top - draggedRect.top;
      animateQuickAccessReorder(firstRects);
      quickAccessOrderDirty = true;
    }
  };

  const isPointInside = (element, x, y) => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  };

  const resolveDropZone = (x, y) => {
    if (quickAccessEl && isPointInside(quickAccessEl, x, y)) {
      return "quick";
    }
    if (gridEl && isPointInside(gridEl, x, y)) {
      return "grid";
    }
    return null;
  };

  const insertActionIntoGrid = (action, clientX, clientY) => {
    if (!action) return;
    const card = createEnergyActionCard(action);
    const target = document
      .elementsFromPoint(clientX, clientY)
      .map((element) => element.closest?.("[data-energy-item]"))
      .find((element) => element && gridEl.contains(element));
    if (target) {
      const rect = target.getBoundingClientRect();
      const shouldInsertAfter = clientY > rect.top + rect.height / 2;
      gridEl.insertBefore(card, shouldInsertAfter ? target.nextSibling : target);
    } else {
      gridEl.appendChild(card);
    }
    fitActionTitleTexts(gridEl);
  };

  const insertPendingIntoGrid = (clientX, clientY) => {
    if (!energyPendingStatEl) return;
    const card = energyPendingStatEl;
    card.classList.add("pending-stat--grid", "action-card");
    card.dataset.energyItem = "";
    card.dataset.energyItemType = "pending";
    card.dataset.actionId = "pending";
    const target = document
      .elementsFromPoint(clientX, clientY)
      .map((element) => element.closest?.("[data-energy-item]"))
      .find((element) => element && gridEl.contains(element));
    if (target) {
      const rect = target.getBoundingClientRect();
      const shouldInsertAfter = clientY > rect.top + rect.height / 2;
      gridEl.insertBefore(card, shouldInsertAfter ? target.nextSibling : target);
    } else {
      gridEl.appendChild(card);
    }
  };

  const handleDrop = async () => {
    if (!dragState.isDragging || !dragState.item) return;
    const dropZone = resolveDropZone(dragState.lastPointerX, dragState.lastPointerY);
    const actionId = dragState.item.dataset.actionId;
    const itemType = dragState.item.dataset.energyItemType;
    if (dragState.source === "grid" && dropZone === "quick") {
      if (!actionId || (itemType !== "action" && itemType !== "pending")) return;
      if (quickAccessIds.includes(actionId)) return;
      if (quickAccessIds.length >= quickAccessLimit) {
        setQuickAccessMessage(`Можно выбрать максимум ${quickAccessLimit} плашек.`);
        return;
      }
      const nextQuickAccess = [...quickAccessIds, actionId];
      dragState.item.remove();
      scheduleLayoutSave();
      await persistQuickAccessIds(nextQuickAccess);
    }
    if (dragState.source === "quick" && dropZone === "grid") {
      if (!actionId) return;
      if (!quickAccessIds.includes(actionId)) return;
      const nextQuickAccess = quickAccessIds.filter((id) => id !== actionId);
      if (actionId === "pending") {
        insertPendingIntoGrid(dragState.lastPointerX, dragState.lastPointerY);
      } else {
        const action = actionsMap.get(actionId);
        insertActionIntoGrid(action, dragState.lastPointerX, dragState.lastPointerY);
      }
      scheduleLayoutSave();
      await persistQuickAccessIds(nextQuickAccess);
    }
    if (dragState.source === "quick" && quickAccessOrderDirty && dropZone !== "grid") {
      const nextOrder = getQuickAccessOrderFromDom();
      if (nextOrder.length > 0) {
        await persistQuickAccessIds(nextOrder);
      }
      quickAccessOrderDirty = false;
    }
  };

  gridEl.addEventListener("pointermove", handleDragMove);

  gridEl.addEventListener("pointerup", async () => {
    await handleDrop();
    await clearDrag();
  });

  gridEl.addEventListener("pointercancel", async () => {
    await clearDrag();
  });

  quickAccessListEl?.addEventListener("pointerdown", (event) => {
    const card = event.target.closest("[data-action-id]");
    if (!card) return;
    startDrag(event, card, "quick");
  });

  quickAccessListEl?.addEventListener("pointermove", handleDragMove);

  quickAccessListEl?.addEventListener("pointerup", async () => {
    await handleDrop();
    await clearDrag();
  });

  quickAccessListEl?.addEventListener("pointercancel", async () => {
    await clearDrag();
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
  const openFeedbackButtons = contentEl.querySelectorAll("[data-open-feedback]");
  const feedbackPendingCountEl = contentEl.querySelector(
    "[data-feedback-pending-count]"
  );
  const feedbackModalEl = contentEl.querySelector("[data-feedback-modal]");
  const feedbackBackdropEl = contentEl.querySelector("[data-feedback-backdrop]");
  const feedbackCloseButton = contentEl.querySelector("[data-feedback-close]");
  const feedbackSummaryEl = contentEl.querySelector("[data-feedback-summary]");
  const feedbackStatusEl = contentEl.querySelector("[data-feedback-status]");
  const feedbackTabButtons = contentEl.querySelectorAll("[data-feedback-tab]");
  const feedbackDetailsModalEl = contentEl.querySelector(
    "[data-feedback-details-modal]"
  );
  const feedbackDetailsBackdropEl = contentEl.querySelector(
    "[data-feedback-details-backdrop]"
  );
  const feedbackDetailsCloseButton = contentEl.querySelector(
    "[data-feedback-details-close]"
  );
  const feedbackDetailsTitleEl = contentEl.querySelector(
    "[data-feedback-details-title]"
  );
  const feedbackDetailsMetaEl = contentEl.querySelector(
    "[data-feedback-details-meta]"
  );
  const feedbackDetailsTextEl = contentEl.querySelector(
    "[data-feedback-details-text]"
  );
  const feedbackDetailsPhotosEl = contentEl.querySelector(
    "[data-feedback-details-photos]"
  );
  const feedbackDetailsStatusEl = contentEl.querySelector(
    "[data-feedback-details-status]"
  );
  const feedbackPhotoViewerEl = contentEl.querySelector(
    "[data-feedback-photo-viewer]"
  );
  const feedbackPhotoViewerImageEl = contentEl.querySelector(
    "[data-feedback-photo-image]"
  );
  const feedbackPhotoViewerCloseButton = contentEl.querySelector(
    "[data-feedback-photo-close]"
  );
  const feedbackActionButtons = contentEl.querySelectorAll("[data-feedback-action]");
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
      await loadFeedbackRequests();
    } catch (error) {
      console.error(error);
      if (orgCountEl) orgCountEl.textContent = "0";
      if (userCountEl) userCountEl.textContent = "0";
      if (feedbackPendingCountEl) feedbackPendingCountEl.textContent = "0";
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
  const feedbackState = {
    requests: [],
    activeRequestId: null,
  };

  const feedbackStatusMeta = {
    new: { label: "Новые", tone: "new" },
    "in-progress": { label: "В работе", tone: "progress" },
    closed: { label: "Закрытые", tone: "closed" },
    rejected: { label: "Отклонено", tone: "closed" },
  };

  const normalizeFeedbackStatus = (value) => {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (["new", "новый", "новые", "без ответа"].includes(normalized)) {
      return "new";
    }
    if (["in-progress", "in_progress", "в работе", "work"].includes(normalized)) {
      return "in-progress";
    }
    if (["closed", "закрыто", "закрыт", "done"].includes(normalized)) {
      return "closed";
    }
    if (["rejected", "reject", "отклонено", "отклонить", "отклонен"].includes(normalized)) {
      return "rejected";
    }
    return "new";
  };

  const parseFeedbackDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFeedbackAuthor = (request) => {
    if (request?.anonymous) return "Анонимно";
    const name = String(request?.createdBy?.full_name ?? "").trim();
    return name || "Автор не указан";
  };

  const setFeedbackStatusMessage = (message = "", tone = "") => {
    if (!feedbackStatusEl) return;
    feedbackStatusEl.textContent = message;
    feedbackStatusEl.classList.remove("is-success", "is-error");
    if (tone === "success") feedbackStatusEl.classList.add("is-success");
    if (tone === "error") feedbackStatusEl.classList.add("is-error");
  };

  const getFeedbackBucket = (status) =>
    status === "rejected" ? "closed" : status;

  const getFeedbackCounts = () => {
    const counts = { new: 0, "in-progress": 0, closed: 0 };
    feedbackState.requests.forEach((item) => {
      const status = normalizeFeedbackStatus(item?.status);
      const bucket = getFeedbackBucket(status);
      counts[bucket] += 1;
    });
    return counts;
  };

  const updateFeedbackSummary = () => {
    const counts = getFeedbackCounts();
    const pending = counts.new + counts["in-progress"];
    if (feedbackPendingCountEl) {
      feedbackPendingCountEl.textContent = String(pending);
    }
    if (feedbackSummaryEl) {
      feedbackSummaryEl.textContent = `Не обработано: ${pending} · В работе: ${counts["in-progress"]} · Закрыто/отклонено: ${counts.closed} · Всего: ${feedbackState.requests.length}`;
    }

    ["new", "in-progress", "closed"].forEach((key) => {
      const countEl = contentEl.querySelector(`[data-feedback-count="${key}"]`);
      if (countEl) countEl.textContent = String(counts[key]);
    });
  };


  const setActiveFeedbackTab = (status = "new") => {
    const nextStatus = normalizeFeedbackStatus(status);
    const tabButtons = Array.from(feedbackTabButtons || []);
    tabButtons.forEach((button) => {
      const isActive = button?.dataset?.feedbackTab === nextStatus;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    ["new", "in-progress", "closed"].forEach((key) => {
      const columnEl = contentEl.querySelector(`[data-feedback-column="${key}"]`);
      if (!columnEl) return;
      const isActive = key === nextStatus;
      columnEl.classList.toggle("is-active", isActive);
      columnEl.setAttribute("aria-hidden", isActive ? "false" : "true");
    });
  };

  const saveFeedbackStatus = async (requestId, nextStatus, { notifyUser = true } = {}) => {
    const nextRequests = feedbackState.requests.map((item) => {
      if (Number(item?.id) !== Number(requestId)) return item;
      return { ...item, status: nextStatus, updatedAt: new Date().toISOString() };
    });
    const lastId = nextRequests.reduce((max, item) => {
      const id = Number(item?.id) || 0;
      return Math.max(max, id);
    }, 0);

    await saveJson(feedbackRequestsFilePath, {
      lastId,
      requests: nextRequests,
    }, { user: currentUser });

    feedbackState.requests = nextRequests;
    renderFeedbackBoard();

    const updatedRequest = nextRequests.find(
      (item) => Number(item?.id) === Number(requestId)
    );
    if (
      notifyUser &&
      updatedRequest &&
      !updatedRequest?.anonymous &&
      updatedRequest?.createdBy?.telegram_id
    ) {
      try {
        await saveEntriesViaEndpoint([
          {
            type: "feedback-status-update",
            requestId: Number(updatedRequest.id),
            status: nextStatus,
            organization: updatedRequest.organization ?? "",
            text: updatedRequest.text ?? "",
            createdBy: updatedRequest.createdBy ?? {},
          },
        ]);
      } catch (error) {
        console.warn("Не удалось отправить уведомление пользователю по обращению.", error);
      }
    }
  };

  const openFeedbackPhotoViewer = ({ src = "", alt = "" } = {}) => {
    if (!feedbackPhotoViewerEl || !feedbackPhotoViewerImageEl || !src) return;
    feedbackPhotoViewerImageEl.src = src;
    feedbackPhotoViewerImageEl.alt = alt || "Фото обращения";
    feedbackPhotoViewerEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const closeFeedbackPhotoViewer = () => {
    if (!feedbackPhotoViewerEl || !feedbackPhotoViewerImageEl) return;
    feedbackPhotoViewerEl.classList.add("is-hidden");
    feedbackPhotoViewerImageEl.src = "";
    feedbackPhotoViewerImageEl.alt = "";
    if (
      (feedbackDetailsModalEl && !feedbackDetailsModalEl.classList.contains("is-hidden")) ||
      (feedbackModalEl && !feedbackModalEl.classList.contains("is-hidden")) ||
      (orgsModalEl && !orgsModalEl.classList.contains("is-hidden")) ||
      (usersModalEl && !usersModalEl.classList.contains("is-hidden"))
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const renderFeedbackDetails = (requestId) => {
    const request = feedbackState.requests.find(
      (item) => Number(item?.id) === Number(requestId)
    );
    if (!request) return;

    if (feedbackDetailsTitleEl) {
      feedbackDetailsTitleEl.textContent = `Обращение #${request.id}`;
    }
    if (feedbackDetailsMetaEl) {
      feedbackDetailsMetaEl.textContent = `${parseFeedbackDate(request?.createdAt) || "Дата не указана"} · ${getFeedbackAuthor(request)}`;
    }
    if (feedbackDetailsTextEl) {
      feedbackDetailsTextEl.textContent = String(request?.text ?? "").trim() || "Без текста";
    }
    if (feedbackDetailsPhotosEl) {
      feedbackDetailsPhotosEl.innerHTML = "";
      const photos = Array.isArray(request?.photos) ? request.photos : [];
      if (!photos.length) {
        const empty = document.createElement("div");
        empty.className = "feedback-empty";
        empty.textContent = "Фото не прикреплены";
        feedbackDetailsPhotosEl.appendChild(empty);
      } else {
        photos.forEach((photoName, index) => {
          const image = document.createElement("img");
          image.className = "feedback-details-photo";
          image.loading = "lazy";
          image.decoding = "async";
          image.src = withCacheBuster(`./feedback-photos/${encodeURIComponent(String(photoName))}`);
          image.alt = `Фото ${index + 1} к обращению #${request.id}`;
          image.role = "button";
          image.tabIndex = 0;
          image.addEventListener("click", () => {
            openFeedbackPhotoViewer({ src: image.src, alt: image.alt });
          });
          image.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFeedbackPhotoViewer({ src: image.src, alt: image.alt });
            }
          });
          feedbackDetailsPhotosEl.appendChild(image);
        });
      }
    }

    feedbackActionButtons.forEach((button) => {
      const action = button?.dataset?.feedbackAction;
      if (!action) return;
      let mappedStatus = "new";
      if (action === "reject") mappedStatus = "rejected";
      if (action === "in-progress") mappedStatus = "in-progress";
      if (action === "close") mappedStatus = "closed";
      const currentStatus = normalizeFeedbackStatus(request?.status);
      button.disabled = mappedStatus === currentStatus;
    });
  };

  const openFeedbackDetails = (requestId) => {
    if (!feedbackDetailsModalEl) return;
    feedbackState.activeRequestId = Number(requestId);
    if (feedbackDetailsStatusEl) feedbackDetailsStatusEl.textContent = "";
    renderFeedbackDetails(requestId);
    feedbackDetailsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const closeFeedbackDetails = () => {
    if (!feedbackDetailsModalEl) return;
    closeFeedbackPhotoViewer();
    feedbackDetailsModalEl.classList.add("is-hidden");
    feedbackState.activeRequestId = null;
    if (feedbackDetailsStatusEl) feedbackDetailsStatusEl.textContent = "";
    if (
      (feedbackModalEl && !feedbackModalEl.classList.contains("is-hidden")) ||
      (orgsModalEl && !orgsModalEl.classList.contains("is-hidden")) ||
      (usersModalEl && !usersModalEl.classList.contains("is-hidden"))
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const renderFeedbackBoard = () => {
    const grouped = {
      new: [],
      "in-progress": [],
      closed: [],
    };
    feedbackState.requests.forEach((item) => {
      const status = normalizeFeedbackStatus(item?.status);
      const bucket = getFeedbackBucket(status);
      grouped[bucket].push({ ...item, status });
    });

    ["new", "in-progress", "closed"].forEach((key) => {
      const listEl = contentEl.querySelector(`[data-feedback-list="${key}"]`);
      if (!listEl) return;
      listEl.innerHTML = "";
      const items = grouped[key];
      if (!items.length) {
        const emptyEl = document.createElement("div");
        emptyEl.className = "feedback-empty";
        emptyEl.textContent = "Пока пусто";
        listEl.appendChild(emptyEl);
        return;
      }

      items
        .sort((a, b) => Number(b?.id ?? 0) - Number(a?.id ?? 0))
        .forEach((request) => {
          const card = document.createElement("article");
          card.className = "feedback-item";
          card.role = "button";
          card.tabIndex = 0;

          const top = document.createElement("div");
          top.className = "feedback-item__top";

          const idEl = document.createElement("div");
          idEl.className = "feedback-item__id";
          idEl.textContent = `#${request?.id ?? "—"}`;

          const dateEl = document.createElement("div");
          dateEl.className = "feedback-item__date";
          dateEl.textContent = parseFeedbackDate(request?.createdAt) || "Дата не указана";

          top.append(idEl, dateEl);

          const orgEl = document.createElement("div");
          orgEl.className = "feedback-item__org";
          orgEl.textContent = String(request?.organization ?? "Организация не указана").trim() || "Организация не указана";

          const authorEl = document.createElement("div");
          authorEl.className = "feedback-item__author";
          authorEl.textContent = `Автор: ${getFeedbackAuthor(request)}`;

          const textEl = document.createElement("div");
          textEl.className = "feedback-item__text";
          textEl.textContent = String(request?.text ?? "").trim() || "Без текста";

          const actions = document.createElement("div");
          actions.className = "feedback-item__actions";
          actions.textContent = "Открыть →";

          card.addEventListener("click", () => openFeedbackDetails(request.id));
          card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFeedbackDetails(request.id);
            }
          });

          card.append(top, orgEl, authorEl, textEl, actions);
          listEl.appendChild(card);
        });
    });

    updateFeedbackSummary();
  };

  const loadFeedbackRequests = async () => {
    const data = await loadJson(feedbackRequestsFilePath).catch(() => ({ requests: [] }));
    const requests = Array.isArray(data?.requests) ? data.requests : [];
    feedbackState.requests = requests.map((item, index) => ({
      ...item,
      id: Number(item?.id) || index + 1,
      status: normalizeFeedbackStatus(item?.status),
    }));
    renderFeedbackBoard();
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

  const loadToolsData = async (orgFolder) => {
    if (!orgFolder) return [];
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    try {
      const raw = await loadJson(toolsPath);
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.tools)) return raw.tools;
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов организации.", error);
    }
    return [];
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

  const openFeedbackModal = async () => {
    if (!feedbackModalEl) return;
    setFeedbackStatusMessage("");
    if (feedbackSummaryEl) feedbackSummaryEl.textContent = "Загружаем обращения...";
    try {
      await loadFeedbackRequests();
    } catch (error) {
      console.error(error);
      setFeedbackStatusMessage("Не удалось загрузить обращения.", "error");
    }
    feedbackModalEl.classList.remove("is-hidden");
    setActiveFeedbackTab("new");
    document.body.style.overflow = "hidden";
  };

  const closeFeedbackModal = () => {
    if (!feedbackModalEl) return;
    feedbackModalEl.classList.add("is-hidden");
    closeFeedbackDetails();
    if (
      (orgsModalEl && !orgsModalEl.classList.contains("is-hidden")) ||
      (usersModalEl && !usersModalEl.classList.contains("is-hidden"))
    ) {
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
  openFeedbackButtons.forEach((button) => {
    button.addEventListener("click", openFeedbackModal);
  });
  feedbackTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveFeedbackTab(button?.dataset?.feedbackTab || "new");
    });
  });
  feedbackActionButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const requestId = feedbackState.activeRequestId;
      if (!requestId) return;
      const action = button?.dataset?.feedbackAction;
      let nextStatus = "new";
      if (action === "reject") nextStatus = "rejected";
      if (action === "in-progress") nextStatus = "in-progress";
      if (action === "close") nextStatus = "closed";
      if (feedbackDetailsStatusEl) {
        feedbackDetailsStatusEl.textContent = "Сохраняем статус...";
      }
      try {
        await saveFeedbackStatus(requestId, nextStatus);
        renderFeedbackDetails(requestId);
        setActiveFeedbackTab(getFeedbackBucket(nextStatus));
        if (feedbackDetailsStatusEl) {
          feedbackDetailsStatusEl.textContent = `Статус изменён: ${feedbackStatusMeta[nextStatus]?.label ?? "обновлено"}.`;
        }
      } catch (error) {
        console.error(error);
        if (feedbackDetailsStatusEl) {
          feedbackDetailsStatusEl.textContent = "Не удалось изменить статус.";
        }
      }
    });
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
  feedbackBackdropEl?.addEventListener("click", closeFeedbackModal);
  feedbackCloseButton?.addEventListener("click", closeFeedbackModal);
  feedbackDetailsBackdropEl?.addEventListener("click", closeFeedbackDetails);
  feedbackDetailsCloseButton?.addEventListener("click", closeFeedbackDetails);
  feedbackPhotoViewerCloseButton?.addEventListener("click", closeFeedbackPhotoViewer);
  feedbackPhotoViewerEl?.addEventListener("click", (event) => {
    if (event.target === feedbackPhotoViewerEl) {
      closeFeedbackPhotoViewer();
    }
  });
  feedbackPhotoViewerEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeFeedbackPhotoViewer();
    }
  });
  feedbackDetailsModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (feedbackPhotoViewerEl && !feedbackPhotoViewerEl.classList.contains("is-hidden")) {
        closeFeedbackPhotoViewer();
      } else {
        closeFeedbackDetails();
      }
    }
  });
  feedbackModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeFeedbackModal();
    }
  });
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
