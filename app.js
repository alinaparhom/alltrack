const getTelegramWebApp = () => (window.Telegram ? window.Telegram.WebApp : null);
let telegramReady = false;
const LOG_STORAGE_KEY = 'alltrack.logs';
const LOG_PENDING_KEY = 'alltrack.logs.pending';
const LOG_LIMIT = 250;
const LOG_PENDING_LIMIT = 500;
const LOG_FILE_NAMES = ['1alltrack.log', '1docks.log', '1miniapps.log'];
const LOG_ENDPOINTS = ['/api/log'];
const LOG_FLUSH_INTERVAL_MS = 15000;
const baseConsole = {
  log: console.log ? console.log.bind(console) : () => {},
  info: console.info ? console.info.bind(console) : () => {},
  warn: console.warn ? console.warn.bind(console) : () => {},
  error: console.error ? console.error.bind(console) : () => {}
};
const logFileHandlePromises = new Map();
let nodeFileWritePromise = null;
let logFlushTimer = null;
let isFlushingLogs = false;

const safeJsonParse = (value, fallback) => {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const memoryLogs = [];
const memoryPendingLogs = [];

const getSafeStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const testKey = '__alltrack_log_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch (error) {
    return null;
  }
};

const readLogs = () => {
  const storage = getSafeStorage();
  if (!storage) {
    return memoryLogs.slice();
  }
  return safeJsonParse(storage.getItem(LOG_STORAGE_KEY), []);
};

const readPendingLogs = () => {
  const storage = getSafeStorage();
  if (!storage) {
    return memoryPendingLogs.slice();
  }
  return safeJsonParse(storage.getItem(LOG_PENDING_KEY), []);
};

const writeLogs = (logs) => {
  const storage = getSafeStorage();
  if (!storage) {
    memoryLogs.length = 0;
    memoryLogs.push(...logs);
    return;
  }
  storage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
};

const writePendingLogs = (logs) => {
  const storage = getSafeStorage();
  if (!storage) {
    memoryPendingLogs.length = 0;
    memoryPendingLogs.push(...logs);
    return;
  }
  storage.setItem(LOG_PENDING_KEY, JSON.stringify(logs));
};

const formatLogPayload = (payload) => {
  if (payload === null || payload === undefined || payload === '') {
    return '';
  }
  if (typeof payload === 'string') {
    return payload;
  }
  try {
    return JSON.stringify(payload);
  } catch (error) {
    return String(payload);
  }
};

const buildLogContext = () => {
  const tg = getTelegramWebApp();
  return {
    page: typeof window !== 'undefined' ? window.location.href : '',
    visibility: typeof document !== 'undefined' ? document.visibilityState : 'unknown',
    online:
      typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
        ? navigator.onLine
        : null,
    viewport:
      typeof window !== 'undefined'
        ? {
            width: window.innerWidth,
            height: window.innerHeight,
            pixelRatio: window.devicePixelRatio || 1
          }
        : null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    telegram: {
      hasWebApp: Boolean(tg),
      platform: tg?.platform || '',
      version: tg?.version || '',
      initDataLength: tg?.initData ? tg.initData.length : 0
    }
  };
};

const normalizeLogPayload = (payload, level) => {
  const context = buildLogContext();
  if (payload instanceof Error) {
    return {
      error: {
        name: payload.name,
        message: payload.message,
        stack: payload.stack || ''
      },
      level,
      context
    };
  }
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return {
      ...payload,
      context
    };
  }
  if (payload) {
    return {
      details: payload,
      context
    };
  }
  return { context };
};

const buildLogLine = (entry) => {
  const payload = formatLogPayload(entry.payload);
  const payloadSegment = payload ? ` | ${payload}` : '';
  return `${entry.timestamp} [${entry.level}] ${entry.message}${payloadSegment}\n`;
};

const getLogFileHandle = async (fileName) => {
  if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
    return null;
  }
  if (!logFileHandlePromises.has(fileName)) {
    const promise = navigator.storage
      .getDirectory()
      .then((directoryHandle) => directoryHandle.getFileHandle(fileName, { create: true }))
      .catch(() => null);
    logFileHandlePromises.set(fileName, promise);
  }
  return logFileHandlePromises.get(fileName);
};

const appendLogToFile = async (entry) => {
  await Promise.all(
    LOG_FILE_NAMES.map(async (fileName) => {
      const handle = await getLogFileHandle(fileName);
      if (!handle) {
        return;
      }
      const writable = await handle.createWritable({ keepExistingData: true });
      const file = await handle.getFile();
      await writable.seek(file.size);
      await writable.write(buildLogLine(entry));
      await writable.close();
    })
  );
};

const getNodeFileWriter = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  const nodeRequire =
    window.require || (typeof globalThis !== 'undefined' ? globalThis.require : undefined);
  const nodeProcess = window.process;
  if (!nodeRequire || !nodeProcess?.versions?.node) {
    return null;
  }
  if (!nodeFileWritePromise) {
    nodeFileWritePromise = Promise.resolve().then(() => {
      const fs = nodeRequire('fs');
      const path = nodeRequire('path');
      const cwd = typeof nodeProcess.cwd === 'function' ? nodeProcess.cwd() : '.';
      return {
        appendLine: (fileName, line) =>
          fs.promises.appendFile(path.join(cwd, fileName), line, 'utf8')
      };
    });
  }
  return nodeFileWritePromise;
};

const appendLogToNodeFile = async (entry) => {
  const writer = await getNodeFileWriter();
  if (!writer) {
    return;
  }
  await Promise.all(
    LOG_FILE_NAMES.map((fileName) => writer.appendLine(fileName, buildLogLine(entry)))
  );
};

const appendLogToServer = async () => {
  await flushPendingLogs();
};

const buildLogEndpoints = () => {
  if (typeof window === 'undefined' || !window.location) {
    return LOG_ENDPOINTS;
  }
  const origin = window.location.origin || '';
  return LOG_ENDPOINTS.map((endpoint) => {
    try {
      return new URL(endpoint, origin || window.location.href).toString();
    } catch (error) {
      return endpoint;
    }
  });
};

const sendLogPayload = async (payload) => {
  if (typeof window === 'undefined' || !window.navigator) {
    return false;
  }
  const endpoints = buildLogEndpoints();
  try {
    if (window.navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'text/plain' });
      for (const endpoint of endpoints) {
        const sent = window.navigator.sendBeacon(endpoint, blob);
        if (sent) {
          return true;
        }
      }
    }
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: payload,
          keepalive: true
        });
        if (response.ok) {
          return true;
        }
      } catch (error) {
        continue;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
};

const buildLogBatch = (entries, limit = 8000, maxLines = 40) => {
  let size = 0;
  const lines = [];
  for (const entry of entries) {
    const line = buildLogLine(entry);
    if (lines.length >= maxLines) {
      break;
    }
    if (size + line.length > limit && lines.length > 0) {
      break;
    }
    lines.push(line);
    size += line.length;
  }
  return { payload: lines.join(''), count: lines.length };
};

const flushPendingLogs = async () => {
  if (isFlushingLogs) {
    return;
  }
  const pending = readPendingLogs();
  if (!pending.length) {
    return;
  }
  isFlushingLogs = true;
  try {
    let queue = pending.slice();
    while (queue.length) {
      const { payload, count } = buildLogBatch(queue);
      if (!count) {
        break;
      }
      const sent = await sendLogPayload(payload);
      if (!sent) {
        break;
      }
      queue = queue.slice(count);
      writePendingLogs(queue);
    }
  } finally {
    isFlushingLogs = false;
  }
};

const scheduleLogFlush = () => {
  if (logFlushTimer || typeof window === 'undefined') {
    return;
  }
  logFlushTimer = window.setInterval(() => {
    flushPendingLogs().catch(() => {});
  }, LOG_FLUSH_INTERVAL_MS);
};

const appendLogToStores = async (entry) => {
  await Promise.allSettled([
    appendLogToFile(entry),
    appendLogToNodeFile(entry),
    appendLogToServer(entry)
  ]);
};

const truncateLogText = (text, limit = 500) => {
  if (!text) {
    return '';
  }
  const normalized = String(text);
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit)}...`;
};

const summarizeRequestBody = (body) => {
  if (!body) {
    return null;
  }
  if (typeof body === 'string') {
    return truncateLogText(body);
  }
  if (body instanceof URLSearchParams) {
    return truncateLogText(body.toString());
  }
  if (body instanceof FormData) {
    return '[form-data]';
  }
  if (body instanceof Blob) {
    return `[blob ${body.type || 'unknown'}]`;
  }
  return truncateLogText(formatLogPayload(body));
};

const fetchWithLogging = async (label, url, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const payloadSummary = summarizeRequestBody(options.body);
  logEvent('info', 'API запрос', {
    label,
    method,
    url,
    payload: payloadSummary
  });
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  try {
    const response = await fetch(url, options);
    const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let bodyText = '';
    try {
      bodyText = await response.clone().text();
    } catch (error) {
      bodyText = '[не удалось прочитать тело ответа]';
    }
    logEvent(response.ok ? 'info' : 'warn', 'API ответ', {
      label,
      method,
      url,
      status: response.status,
      ok: response.ok,
      durationMs: Math.round(endedAt - startedAt),
      body: truncateLogText(bodyText)
    });
    return response;
  } catch (error) {
    logEvent('error', 'Ошибка API запроса', {
      label,
      method,
      url,
      message: error?.message || String(error),
      stack: error?.stack
    });
    throw error;
  }
};

const logEvent = (level, message, payload = null) => {
  const timestamp = new Date().toISOString();
  const enrichedPayload = normalizeLogPayload(payload, level);
  const entry = {
    timestamp,
    level,
    message,
    payload: enrichedPayload
  };
  const logs = readLogs();
  logs.push(entry);
  const trimmedLogs = logs.slice(-LOG_LIMIT);
  writeLogs(trimmedLogs);
  const pending = readPendingLogs();
  pending.push(entry);
  writePendingLogs(pending.slice(-LOG_PENDING_LIMIT));
  appendLogToStores(entry).catch(() => {});
  scheduleLogFlush();
  const consoleMethod =
    level === 'error' ? baseConsole.error : level === 'warn' ? baseConsole.warn : baseConsole.info;
  consoleMethod(`[${timestamp}] ${message}`, payload || '');
  if (level === 'error' || level === 'warn') {
    flushPendingLogs().catch(() => {});
  }
};

window.logEvent = logEvent;
window.fetchWithLogging = fetchWithLogging;

const serializeConsoleArg = (value) => {
  if (value instanceof Error) {
    return {
      error: {
        name: value.name,
        message: value.message,
        stack: value.stack || ''
      }
    };
  }
  if (value === undefined) {
    return '[undefined]';
  }
  if (typeof value === 'function') {
    return `[function ${value.name || 'anonymous'}]`;
  }
  if (value && typeof value === 'object') {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return String(value);
    }
  }
  return value;
};

const setupConsoleLogging = () => {
  if (typeof window === 'undefined' || !window.console) {
    return;
  }
  const buildHandler =
    (level, logLevel = level === 'log' || level === 'info' ? 'info' : level) =>
    (...args) => {
      if (baseConsole[level]) {
        baseConsole[level](...args);
      }
      logEvent(logLevel, `Console.${level}`, {
        args: args.map(serializeConsoleArg)
      });
    };
  window.console.log = buildHandler('log');
  window.console.info = buildHandler('info');
  window.console.warn = buildHandler('warn');
  window.console.error = buildHandler('error');
};

setupConsoleLogging();

window.getAlltrackLogs = () => readLogs();

window.addEventListener('error', (event) => {
  logEvent('error', 'Глобальная ошибка', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logEvent('error', 'Необработанное отклонение промиса', {
    reason: formatLogPayload(event.reason)
  });
});

const getElementLabel = (element) => {
  if (!element) {
    return '';
  }
  const ariaLabel = element.getAttribute?.('aria-label');
  if (ariaLabel) {
    return ariaLabel.trim();
  }
  const text = element.textContent?.replace(/\s+/g, ' ').trim();
  if (!text) {
    return '';
  }
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
};

const getElementInfo = (element) => {
  if (!element) {
    return null;
  }
  const tag = element.tagName ? element.tagName.toLowerCase() : 'unknown';
  const id = element.id ? `#${element.id}` : '';
  const className =
    typeof element.className === 'string' && element.className.trim()
      ? `.${element.className.trim().replace(/\s+/g, '.')}`
      : '';
  const name = element.getAttribute?.('name') || '';
  const type = element.getAttribute?.('type') || '';
  const role = element.getAttribute?.('role') || '';
  const label = getElementLabel(element);
  return {
    selector: `${tag}${id}${className}`,
    name,
    type,
    role,
    label
  };
};

const getElementValueSummary = (element) => {
  if (!element) {
    return null;
  }
  if (element instanceof HTMLInputElement) {
    if (element.type === 'password') {
      return '[скрыто]';
    }
    if (element.type === 'checkbox' || element.type === 'radio') {
      return element.checked ? 'checked' : 'unchecked';
    }
    return element.value ? element.value.slice(0, 120) : '';
  }
  if (element instanceof HTMLTextAreaElement) {
    return element.value ? element.value.slice(0, 120) : '';
  }
  if (element instanceof HTMLSelectElement) {
    return element.value;
  }
  return null;
};

const logUserAction = (event) => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  const info = getElementInfo(target);
  if (!info) {
    return;
  }
  const payload = {
    event: event.type,
    target: info
  };
  const valueSummary = getElementValueSummary(target);
  if (valueSummary !== null) {
    payload.value = valueSummary;
  }
  logEvent('info', 'Действие пользователя', payload);
};

const initUserActionLogging = () => {
  document.addEventListener('click', logUserAction, true);
  document.addEventListener('change', logUserAction, true);
  document.addEventListener('input', logUserAction, true);
  document.addEventListener('submit', logUserAction, true);
  document.addEventListener('touchstart', logUserAction, true);
  window.addEventListener('visibilitychange', () => {
    logEvent('info', 'Смена видимости вкладки', {
      state: document.visibilityState
    });
    if (document.visibilityState === 'hidden') {
      flushPendingLogs().catch(() => {});
    }
  });
  window.addEventListener('pagehide', () => {
    logEvent('info', 'Страница скрыта, сохраняем логи');
    flushPendingLogs().catch(() => {});
  });
  window.addEventListener('beforeunload', () => {
    logEvent('info', 'Страница закрывается, сохраняем логи');
    flushPendingLogs().catch(() => {});
  });
};

const ensureTelegramReady = () => {
  const tg = getTelegramWebApp();
  if (tg && !telegramReady) {
    tg.ready();
    tg.expand();
    telegramReady = true;
    logEvent('info', 'Telegram WebApp готов', {
      platform: tg.platform || 'unknown',
      version: tg.version || 'unknown'
    });
  }
};

const logTelegramContext = () => {
  const tg = getTelegramWebApp();
  logEvent('info', 'Контекст Telegram WebApp', {
    hasWebApp: Boolean(tg),
    hasInitDataUnsafe: Boolean(tg?.initDataUnsafe),
    initDataLength: tg?.initData ? tg.initData.length : 0,
    platform: tg?.platform || 'unknown'
  });
};

ensureTelegramReady();
logTelegramContext();
logEvent('info', 'Старт скрипта проверки доступа', {
  documentReady: document.readyState
});
logEvent('info', 'Приложение загружено');
logEvent('info', 'Mini Apps открыто', {
  url: typeof window !== 'undefined' ? window.location?.href || '' : '',
  referrer: typeof document !== 'undefined' ? document.referrer || '' : '',
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
});
initUserActionLogging();

document.addEventListener('DOMContentLoaded', () => {
  logEvent('info', 'DOM готов');
});

const accessPanel = document.getElementById('accessPanel');
const accessName = document.getElementById('accessName');
const accessRole = document.getElementById('accessRole');
const accessMeta = document.getElementById('accessMeta');
const accessId = document.getElementById('accessId');
const accessBadge = document.getElementById('accessBadge');
const accessAvatar = document.getElementById('accessAvatar');
const accessMessage = document.getElementById('accessMessage');
const accessOverlay = document.getElementById('accessOverlay');
const accessOverlayText = document.getElementById('accessOverlayText');
const accessOverlayId = document.getElementById('accessOverlayId');
const accessOverlayName = document.getElementById('accessOverlayName');
const accessOverlayRole = document.getElementById('accessOverlayRole');
const checkingOverlay = document.getElementById('checkingOverlay');
const checkingName = document.getElementById('checkingName');
const checkingRole = document.getElementById('checkingRole');
const checkingIdStatus = document.getElementById('checkingIdStatus');
const superAdminPanel = document.getElementById('superAdminPanel');
const defaultWorkspace = document.getElementById('defaultWorkspace');
let accessDataCache = null;

const getInviteIdFromUrl = () => {
  if (typeof window === 'undefined') {
    return '';
  }
  const params = new URLSearchParams(window.location?.search || '');
  const inviteParam =
    params.get('invite') || params.get('startapp') || params.get('start_param') || '';
  if (inviteParam) {
    return inviteParam;
  }
  const tg = getTelegramWebApp();
  const startParam = tg?.initDataUnsafe?.start_param;
  return typeof startParam === 'string' ? startParam.trim() : '';
};

const decodeInvitePayload = (inviteId) => {
  if (!inviteId || !inviteId.startsWith('direct-')) {
    return null;
  }
  const encoded = inviteId.slice('direct-'.length);
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  try {
    const binary = atob(`${normalized}${padding}`);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json =
      typeof TextDecoder !== 'undefined'
        ? new TextDecoder('utf-8').decode(bytes)
        : decodeURIComponent(escape(binary));
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
};

const clearInviteFromUrl = () => {
  if (typeof window === 'undefined' || !window.history?.replaceState) {
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.delete('invite');
  url.searchParams.delete('startapp');
  url.searchParams.delete('start_param');
  window.history.replaceState({}, document.title, url.toString());
};

const acceptInvite = async ({ inviteId, userId }) => {
  const apiUrl = new URL('./accept-invite', window.location.href).toString();
  const response = await fetchWithLogging('accept-invite', apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteId, userId })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Не удалось принять приглашение');
  }
  return response.json();
};

const acceptDirectInvite = async ({ inviteId, organizationName, energyFullName, userId }) => {
  const apiUrl = new URL('./accept-direct-invite', window.location.href).toString();
  const response = await fetchWithLogging('accept-direct-invite', apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteId, organizationName, energyFullName, userId })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Не удалось принять приглашение');
  }
  return response.json();
};

document.body.classList.add('is-checking');

const buttons = document.querySelectorAll('button');
buttons.forEach((button) => {
  button.addEventListener('click', () => {
    const tg = getTelegramWebApp();
    if (tg) {
      tg.HapticFeedback.selectionChanged();
    }
  });
});

const getInitDataFromLocation = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return searchParams.get('tgWebAppData') || hashParams.get('tgWebAppData');
};

const parseTelegramUser = (initData) => {
  if (!initData) {
    return null;
  }
  try {
    const params = new URLSearchParams(initData);
    const userValue = params.get('user');
    if (!userValue) {
      return null;
    }
    return JSON.parse(userValue);
  } catch (error) {
    return null;
  }
};

const getTelegramUser = () => {
  const tg = getTelegramWebApp();
  if (tg?.initDataUnsafe?.user) {
    return tg.initDataUnsafe.user;
  }
  const initData = tg?.initData || getInitDataFromLocation();
  const user = parseTelegramUser(initData);
  if (user) {
    return user;
  }
  const fallbackInitData = getInitDataFromLocation();
  return parseTelegramUser(fallbackInitData);
};

const getUserIdWithSource = () => {
  const tg = getTelegramWebApp();
  const unsafeId = tg?.initDataUnsafe?.user?.id;
  if (unsafeId !== undefined && unsafeId !== null) {
    return { id: String(unsafeId), source: 'tg.initDataUnsafe.user.id' };
  }
  const telegramId = getTelegramUser()?.id;
  if (telegramId !== undefined && telegramId !== null) {
    return { id: String(telegramId), source: 'parsed.initData.user.id' };
  }
  const urlId = new URLSearchParams(window.location.search).get('user_id');
  if (urlId) {
    return { id: urlId.trim(), source: 'url.user_id' };
  }
  return { id: null, source: 'not-found' };
};

const getUserId = () => getUserIdWithSource().id;

const normalizeId = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const digits = String(value).match(/\d+/g);
  if (!digits) {
    return null;
  }
  const normalized = digits.join('');
  return normalized.length ? normalized : null;
};

const buildIdVariants = (value) => {
  if (value === null || value === undefined) {
    return [];
  }
  const variants = new Set();
  const raw = String(value).trim();
  if (raw) {
    variants.add(raw);
    const compact = raw.replace(/\s+/g, '');
    if (compact) {
      variants.add(compact);
    }
  }
  const normalized = normalizeId(value);
  if (normalized) {
    variants.add(normalized);
    const numeric = Number(normalized);
    if (!Number.isNaN(numeric)) {
      variants.add(String(numeric));
    }
  }
  return Array.from(variants);
};

const isSameId = (leftValue, rightValue) => {
  if (leftValue === null || leftValue === undefined) {
    return false;
  }
  if (rightValue === null || rightValue === undefined) {
    return false;
  }
  const leftVariants = buildIdVariants(leftValue);
  const rightVariants = buildIdVariants(rightValue);
  if (!leftVariants.length || !rightVariants.length) {
    return false;
  }
  return leftVariants.some((leftVariant) => rightVariants.includes(leftVariant));
};

const normalizePersonName = (value) => {
  if (!value) {
    return '';
  }
  return String(value)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[‑–—]/g, '-')
    .replace(/[^a-zа-яё0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const isSamePersonName = (left, right) => {
  const leftNormalized = normalizePersonName(left);
  const rightNormalized = normalizePersonName(right);
  if (!leftNormalized || !rightNormalized) {
    return false;
  }
  return (
    leftNormalized === rightNormalized ||
    leftNormalized.includes(rightNormalized) ||
    rightNormalized.includes(leftNormalized)
  );
};

const getUserNameValue = (user) => {
  if (!user || typeof user !== 'object') {
    return '';
  }
  const directName = user.fullName || user.full_name || user.name || user.fio || '';
  if (directName) {
    return directName;
  }
  const lastName = user.lastName || user.last_name || user.surname || user.family_name || '';
  const firstName = user.firstName || user.first_name || user.given_name || user.name_first || '';
  const middleName = user.middleName || user.middle_name || user.patronymic || '';
  return [lastName, firstName, middleName].filter(Boolean).join(' ').trim();
};

const getUserIdValue = (user) => {
  if (typeof user === 'string' || typeof user === 'number') {
    return user;
  }
  if (!user || typeof user !== 'object') {
    return null;
  }
  return (
    user.ID ??
    user.Id ??
    user.id ??
    user.userId ??
    user.user_id ??
    user.telegramId ??
    user.telegram_id ??
    user.telegramID ??
    user.tgId ??
    user.tg_id
  );
};

const getUserUsernameValue = (user) => {
  if (!user || typeof user !== 'object') {
    return '';
  }
  return (
    user.username ||
    user.userName ||
    user.telegramUsername ||
    user.telegram_username ||
    user.tgUsername ||
    user.tg_username ||
    ''
  );
};

const hasIdField = (value) => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return (
    'id' in value ||
    'ID' in value ||
    'Id' in value ||
    'userId' in value ||
    'user_id' in value ||
    'telegramId' in value ||
    'telegram_id' in value ||
    'telegramID' in value ||
    'tgId' in value ||
    'tg_id' in value
  );
};

const getAccessList = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && Array.isArray(value.users)) {
    return value.users;
  }
  if (value && Array.isArray(value.list)) {
    return value.list;
  }
  if (value && typeof value === 'object') {
    if (hasIdField(value)) {
      return [value];
    }
    const values = Object.values(value);
    if (values.length) {
      const flattened = values.flatMap((item) => {
        if (!item) {
          return [];
        }
        if (Array.isArray(item)) {
          return item;
        }
        if (typeof item === 'object') {
          return [item];
        }
        return [];
      });
      const allObjects =
        flattened.length && flattened.every((item) => item && typeof item === 'object');
      if (allObjects && flattened.every((item) => hasIdField(item))) {
        return flattened;
      }
    }
    const mappedEntries = Object.entries(value)
      .map(([key, item]) => {
        if (item && typeof item === 'object') {
          if (hasIdField(item)) {
            return item;
          }
          return { id: key, ...item };
        }
        if (item !== null && item !== undefined) {
          return { id: key, role: item };
        }
        return null;
      })
      .filter(Boolean);
    if (mappedEntries.length) {
      return mappedEntries;
    }
  }
  return [];
};

const getSuperAdminsList = (data = {}) => {
  const candidates = [
    data.superAdmins,
    data.super_admins,
    data.superAdmin,
    data.super_admin,
    data.super
  ];
  for (const candidate of candidates) {
    const list = getAccessList(candidate);
    if (list.length) {
      return list;
    }
  }
  return [];
};

const normalizeRoleText = (value) => {
  if (!value) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeRoleText(item)).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    return normalizeRoleText(value.name || value.title || value.role || value.label);
  }
  return String(value);
};

const getUserRoleValue = (user) => {
  return (
    user?.role ||
    user?.role_name ||
    user?.roleName ||
    user?.position ||
    user?.accessRole ||
    user?.access_role ||
    user?.permission ||
    user?.permissions ||
    user?.group ||
    user?.group_name ||
    user?.access ||
    user?.title ||
    user?.roles
  );
};

const buildTelegramNameCandidates = (telegramUser) => {
  if (!telegramUser) {
    return [];
  }
  const firstName = telegramUser.first_name || '';
  const lastName = telegramUser.last_name || '';
  const candidates = [];
  if (lastName || firstName) {
    const lastFirst = [lastName, firstName].filter(Boolean).join(' ');
    const firstLast = [firstName, lastName].filter(Boolean).join(' ');
    if (lastFirst) {
      candidates.push(lastFirst);
    }
    if (firstLast) {
      candidates.push(firstLast);
    }
  }
  if (telegramUser.username) {
    candidates.push(`@${telegramUser.username}`);
    candidates.push(telegramUser.username);
  }
  return Array.from(new Set(candidates.filter(Boolean)));
};

const isMatchingByNameOrUsername = (user, candidates) => {
  if (!candidates.length) {
    return false;
  }
  const normalizedCandidates = candidates.map((candidate) => String(candidate).trim()).filter(Boolean);
  if (!normalizedCandidates.length) {
    return false;
  }
  const userName = getUserNameValue(user);
  const userUsername = getUserUsernameValue(user);
  const normalizedUserUsername = userUsername.replace(/^@/, '').toLowerCase();
  return normalizedCandidates.some((candidate) => {
    if (userName && isSamePersonName(userName, candidate)) {
      return true;
    }
    const normalizedCandidate = candidate.replace(/^@/, '').toLowerCase();
    return normalizedUserUsername && normalizedCandidate === normalizedUserUsername;
  });
};

const isSuperAdminRole = (roleValue) => {
  const normalized = normalizeRoleText(roleValue)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[‑–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return (
    normalized.includes('супер-администратор') ||
    normalized.includes('супер администратор') ||
    normalized.includes('суперадминистратор') ||
    normalized.includes('super-admin') ||
    normalized.includes('super admin')
  );
};

const buildAccessResult = ({
  user,
  organization,
  fallbackScope = 'organization',
  forceScope = null
}) => {
  if (forceScope) {
    return {
      user,
      scope: forceScope,
      organization
    };
  }
  const roleValue = getUserRoleValue(user);
  if (isSuperAdminRole(roleValue)) {
    return {
      user,
      scope: 'super',
      organization: 'Все организации'
    };
  }
  return {
    user,
    scope: fallbackScope,
    organization
  };
};

const findUserAccess = (userId, data) => {
  if (userId === null || userId === undefined || String(userId).trim() === '') {
    logEvent('warn', 'Поиск доступа: пустой ID пользователя', { userId });
    return null;
  }
  const resolvedUserId = String(userId).trim();
  const normalizedId = normalizeId(resolvedUserId);
  const userIdVariants = buildIdVariants(resolvedUserId);
  const superAdmins = getSuperAdminsList(data);
  logEvent('info', 'Поиск доступа: входные данные', {
    userId: resolvedUserId,
    normalizedId,
    userIdVariants,
    superAdmins: superAdmins.length,
    organizations: Object.keys(data?.organizations || {}).length
  });
  const matchesNormalizedId = (entry) => {
    const entryId = getUserIdValue(entry);
    const entryVariants = buildIdVariants(entryId);
    const normalizedEntryId = normalizeId(entryId);
    if (!userIdVariants.length) {
      return false;
    }
    if (normalizedId && normalizedEntryId && normalizedEntryId === normalizedId) {
      return true;
    }
    if (normalizedId && isSameId(entryId, normalizedId)) {
      return true;
    }
    if (isSameId(entryId, resolvedUserId)) {
      return true;
    }
    return entryVariants.some((variant) => userIdVariants.includes(variant));
  };

  const superAdmin = superAdmins.find((admin) => matchesNormalizedId(admin));
  if (superAdmins.length) {
    const checks = superAdmins.map((admin) => ({
      entryId: normalizeId(getUserIdValue(admin)),
      name: getUserNameValue(admin),
      role: normalizeRoleText(getUserRoleValue(admin)),
      matches: matchesNormalizedId(admin)
    }));
    logEvent('info', 'Проверка супер‑администраторов по ID', {
      userId: resolvedUserId,
      checks
    });
  }
  if (superAdmin) {
    logEvent('info', 'Поиск доступа: найден супер‑администратор по ID', {
      userId: resolvedUserId,
      entryId: normalizeId(getUserIdValue(superAdmin)),
      name: getUserNameValue(superAdmin)
    });
    return buildAccessResult({
      user: superAdmin,
      organization: 'Все организации',
      fallbackScope: 'organization',
      forceScope: 'super'
    });
  }
  const telegramUser = getTelegramUser();
  const telegramCandidates = buildTelegramNameCandidates(telegramUser);
  if (telegramCandidates.length) {
    const superAdminByName = superAdmins.find((admin) =>
      isMatchingByNameOrUsername(admin, telegramCandidates)
    );
    if (superAdminByName) {
      logEvent('info', 'Поиск доступа: найден супер‑администратор по имени/username', {
        userId: resolvedUserId,
        name: getUserNameValue(superAdminByName),
        candidates: telegramCandidates
      });
      return buildAccessResult({
        user: superAdminByName,
        organization: 'Все организации',
        fallbackScope: 'organization',
        forceScope: 'super'
      });
    }
  }

  const organizations = data.organizations || {};
  for (const [organization, users] of Object.entries(organizations)) {
    const list = getAccessList(users);
    if (!Array.isArray(list)) {
      continue;
    }
    const matched = list.find((user) => matchesNormalizedId(user));
    if (matched) {
      logEvent('info', 'Поиск доступа: найден пользователь по ID в организации', {
        userId: resolvedUserId,
        organization,
        entryId: normalizeId(getUserIdValue(matched)),
        role: normalizeRoleText(getUserRoleValue(matched))
      });
      return buildAccessResult({
        user: matched,
        organization,
        fallbackScope: 'organization'
      });
    }
    if (telegramCandidates.length) {
      const matchedByName = list.find((user) =>
        isMatchingByNameOrUsername(user, telegramCandidates)
      );
      if (matchedByName) {
        logEvent('info', 'Поиск доступа: найден пользователь по имени/username', {
          userId: resolvedUserId,
          organization,
          name: getUserNameValue(matchedByName),
          candidates: telegramCandidates,
          role: normalizeRoleText(getUserRoleValue(matchedByName))
        });
        return buildAccessResult({
          user: matchedByName,
          organization,
          fallbackScope: 'organization'
        });
      }
    }
  }

  logEvent('warn', 'Поиск доступа: совпадений не найдено', {
    userId: resolvedUserId,
    normalizedId,
    userIdVariants
  });
  return null;
};

const getShortName = (fullName = '') => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }
  return fullName || '—';
};

const getTelegramDisplayName = (tgUser) => {
  if (!tgUser) {
    return '';
  }
  const parts = [tgUser.last_name, tgUser.first_name].filter(Boolean);
  if (parts.length) {
    return parts.join(' ');
  }
  if (tgUser.username) {
    return `@${tgUser.username}`;
  }
  return tgUser.first_name || '';
};

const getUserFullName = (user, fallbackName = '') => {
  const directName = user?.fullName || user?.full_name || user?.name || user?.fio || '';
  if (directName) {
    return directName;
  }
  const lastName = user?.lastName || user?.last_name || user?.surname || user?.family_name || '';
  const firstName = user?.firstName || user?.first_name || user?.given_name || user?.name_first || '';
  const middleName = user?.middleName || user?.middle_name || user?.patronymic || '';
  const combined = [lastName, firstName, middleName].filter(Boolean).join(' ').trim();
  return combined || fallbackName || '';
};

const normalizeRoleValue = (value) => {
  if (!value) {
    return '';
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeRoleValue(item))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof value === 'object') {
    return normalizeRoleValue(value.name || value.title || value.role || value.label);
  }
  return String(value);
};

const collectRoleValues = (value, collector) => {
  if (!value) {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectRoleValues(item, collector));
    return;
  }
  if (typeof value === 'object') {
    collectRoleValues(value.name || value.title || value.role || value.label, collector);
    return;
  }
  const normalized = normalizeRoleValue(value).trim();
  if (normalized) {
    collector.push(normalized);
  }
};

const getUserRolesList = (user, scope) => {
  const roleValue =
    user?.role ||
    user?.role_name ||
    user?.roleName ||
    user?.position ||
    user?.accessRole ||
    user?.access_role ||
    user?.permission ||
    user?.permissions ||
    user?.group ||
    user?.group_name ||
    user?.access ||
    user?.title ||
    user?.roles;
  const roles = [];
  collectRoleValues(roleValue, roles);
  if (scope === 'super') {
    roles.push('Супер‑администратор');
  }
  return Array.from(new Set(roles));
};

const resolveEffectiveScope = ({ user, scope } = {}) => {
  const roleValue = getUserRoleValue(user);
  const roleText = normalizeRoleText(roleValue);
  const rolesList = getUserRolesList(user, scope);
  const isRoleSuper =
    scope === 'super' ||
    isSuperAdminRole(roleValue) ||
    isSuperAdminRole(roleText) ||
    isSuperAdminRole(rolesList);
  return {
    effectiveScope: isRoleSuper ? 'super' : scope,
    isRoleSuper,
    roleText,
    rolesList
  };
};

const getInitials = (fullName = '') => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '—';
  }
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  return initials || '—';
};

const resolveAccountInfo = ({ user, scope } = {}) => {
  const fullName = getUserFullName(user, getTelegramDisplayName(getTelegramUser()));
  const roles = getUserRolesList(user, scope);
  const role = roles.join(', ');
  return {
    fullName,
    role,
    roles
  };
};

const logResolvedAccess = ({ userId, access }) => {
  if (!access) {
    return;
  }
  const { fullName, role, roles } = resolveAccountInfo({
    user: access.user,
    scope: access.scope
  });
  logEvent('info', 'Данные пользователя из access.json', {
    userId: normalizeId(userId) || userId || null,
    fullName: fullName || null,
    organization: access.organization || null,
    role: role || null,
    roles,
    scope: access.scope || null
  });
};

const formatUserIdStatus = ({ userId, user, scope } = {}) => {
  const normalizedId = normalizeId(userId) || '—';
  const { fullName, role } = resolveAccountInfo({ user, scope });
  const safeName = fullName || '—';
  const safeRole = role || '—';
  return `ID: ${normalizedId}. Пользователь: ${safeName}. Роль: ${safeRole}. Код принят в работу: ${normalizedId}.`;
};

const updateUserIdIndicators = ({ userId, user, scope } = {}) => {
  const message = formatUserIdStatus({ userId, user, scope });
  if (accessId) {
    accessId.textContent = message;
  }
  if (checkingIdStatus) {
    checkingIdStatus.textContent = message;
  }
  if (accessOverlayId) {
    accessOverlayId.textContent = message;
  }
};

const updateCheckingAccount = ({ user, scope } = {}) => {
  const { fullName, role } = resolveAccountInfo({ user, scope });
  const displayName = getShortName(fullName);
  if (checkingName) {
    checkingName.textContent = displayName || '—';
  }
  if (checkingRole) {
    checkingRole.textContent = `Роль: ${role || '—'}`;
  }
};

const updateAccessOverlayAccount = ({ user, scope } = {}) => {
  const { fullName, role } = resolveAccountInfo({ user, scope });
  if (accessOverlayName) {
    accessOverlayName.textContent = fullName || '—';
  }
  if (accessOverlayRole) {
    accessOverlayRole.textContent = `Роль: ${role || 'не определена'}`;
  }
};

const setAccessOverlayVisibility = (visible, reason = '') => {
  if (!accessOverlay) {
    return;
  }
  const wasHidden = accessOverlay.hidden;
  accessOverlay.hidden = !visible;
  accessOverlay.style.display = visible ? '' : 'none';
  if (wasHidden !== accessOverlay.hidden) {
    logEvent('info', 'Состояние экрана доступа изменено', {
      visible,
      reason: reason || null
    });
  }
};

const setCheckingOverlayVisibility = (visible) => {
  if (!checkingOverlay) {
    return;
  }
  const wasHidden = checkingOverlay.hidden;
  checkingOverlay.hidden = !visible;
  checkingOverlay.style.display = visible ? '' : 'none';
  if (wasHidden !== checkingOverlay.hidden) {
    logEvent('info', 'Состояние экрана проверки изменено', {
      visible
    });
  }
};

const waitForTelegramUser = async ({ timeoutMs = 4000, intervalMs = 150 } = {}) => {
  logEvent('info', 'Ожидание Telegram ID', { timeoutMs, intervalMs });
  if (getUserIdWithSource().id) {
    logEvent('info', 'Telegram ID уже доступен');
    return true;
  }
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    ensureTelegramReady();
    if (getUserIdWithSource().id) {
      logEvent('info', 'Telegram ID получен в процессе ожидания');
      return true;
    }
  }
  logEvent('warn', 'Не удалось дождаться Telegram ID', { timeoutMs });
  return false;
};

const lockAccess = (message, { user, scope } = {}) => {
  document.body.classList.add('is-locked');
  document.body.classList.remove('is-checking');
  document.body.classList.remove('is-super-admin');
  delete document.body.dataset.accessScope;
  delete document.body.dataset.userRole;
  logEvent('warn', 'Доступ заблокирован', {
    message,
    scope: scope || 'unknown',
    userId: getUserId()
  });
  updateAccessOverlayAccount({ user, scope });
  updateUserIdIndicators({ userId: getUserId(), user, scope });
  if (accessOverlayText) {
    accessOverlayText.textContent = message;
  }
  setAccessOverlayVisibility(true, 'lockAccess');
  if (accessPanel) {
    accessPanel.hidden = true;
  }
};

const unlockAccess = ({ user, organization, scope, userId }) => {
  const { fullName: resolvedName, role: resolvedRole, roles: resolvedRoles } =
    resolveAccountInfo({ user, scope });
  const { effectiveScope, isRoleSuper, roleText, rolesList } = resolveEffectiveScope({
    user,
    scope
  });
  const effectiveOrganization = isRoleSuper ? 'Все организации' : organization;
  logEvent('info', 'Доступ открыт', {
    scope,
    effectiveScope,
    organization: effectiveOrganization,
    role: roleText || resolvedRole || null,
    roles: rolesList
  });
  document.body.classList.remove('is-locked');
  document.body.classList.remove('is-checking');
  document.body.classList.toggle('is-super-admin', effectiveScope === 'super');
  document.body.dataset.accessScope = effectiveScope;
  document.body.dataset.userRole = resolvedRole;
  setAccessOverlayVisibility(false, 'unlockAccess');
  setCheckingOverlayVisibility(false);
  if (accessPanel) {
    accessPanel.hidden = effectiveScope === 'super';
  }
  if (accessName) {
    accessName.textContent = getShortName(resolvedName);
  }
  if (accessRole) {
    accessRole.textContent = `Роль: ${resolvedRole || '—'}`;
  }
  if (accessMeta) {
    accessMeta.textContent = `Организация: ${effectiveOrganization}`;
  }
  updateUserIdIndicators({ userId, user, scope });
  if (accessMessage) {
    const rolesText = resolvedRoles.length ? resolvedRoles.join(', ') : '—';
    accessMessage.textContent = `Вошёл(а): ${resolvedName || '—'}. Доступные роли: ${rolesText}.`;
  }
  if (accessAvatar) {
    accessAvatar.textContent = getInitials(resolvedName);
  }
  if (accessBadge) {
    accessBadge.textContent =
      effectiveScope === 'super' ? 'Супер‑админ' : effectiveOrganization;
  }
  if (effectiveScope === 'super') {
    if (superAdminPanel) {
      superAdminPanel.hidden = false;
    }
    if (defaultWorkspace) {
      defaultWorkspace.hidden = true;
    }
    if (window.initSuperAdminWorkspace) {
      logEvent('info', 'Инициализация панели супер‑администратора', {
        userId: userId || getUserId()
      });
      window.initSuperAdminWorkspace({ fullName: resolvedName, accessData: accessDataCache });
    }
  } else {
    if (superAdminPanel) {
      superAdminPanel.hidden = true;
    }
    if (defaultWorkspace) {
      defaultWorkspace.hidden = false;
    }
    if (window.resetSuperAdminWorkspace) {
      window.resetSuperAdminWorkspace();
    }
  }
};

const initAccess = async () => {
  try {
    logEvent('info', 'Старт проверки доступа');
    updateCheckingAccount();
    const response = await fetchWithLogging('load-access', 'access.json', {
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error('Не удалось загрузить список доступов');
    }
    const data = await response.json();
    accessDataCache = data;
    const superAdmins = getSuperAdminsList(data);
    logEvent('info', 'Файл access.json загружен', {
      superAdmins: superAdmins.length,
      organizations: Object.keys(data?.organizations || {}).length
    });
    if (superAdmins.length) {
      const superAdminSummary = superAdmins.map((admin) => ({
        id: getUserIdValue(admin),
        normalizedId: normalizeId(getUserIdValue(admin)),
        name: getUserNameValue(admin),
        role: normalizeRoleText(getUserRoleValue(admin))
      }));
      const missingIdCount = superAdminSummary.filter((admin) => !admin.normalizedId).length;
      logEvent('info', 'Список супер‑администраторов (диагностика)', {
        count: superAdmins.length,
        missingIdCount,
        items: superAdminSummary
      });
    }
    await waitForTelegramUser();
    const { id: userId, source: userIdSource } = getUserIdWithSource();
    if (!userId) {
      logEvent('warn', 'Не удалось получить Telegram ID пользователя', { source: userIdSource });
      lockAccess('Не удалось определить ID пользователя. Откройте приложение через Telegram.', {
        user: getTelegramUser()
      });
      return;
    }
    const normalizedUserId = normalizeId(userId) || userId;
    logEvent('info', 'ID пользователя принят в работу', {
      userId: normalizedUserId,
      source: userIdSource
    });
    logEvent('info', 'ID пользователя получен', {
      userId: normalizedUserId,
      source: userIdSource
    });
    logEvent('info', 'Контрольные данные доступа', {
      userIdVariants: buildIdVariants(normalizedUserId),
      superAdmins: getSuperAdminsList(data).map((admin) => ({
        id: normalizeId(getUserIdValue(admin)),
        name: getUserNameValue(admin)
      }))
    });
    updateUserIdIndicators({ userId: normalizedUserId, user: getTelegramUser() });
    let access =
      findUserAccess(userId, data) ||
      (normalizedUserId ? findUserAccess(normalizedUserId, data) : null) ||
      (normalizedUserId ? findUserAccess(Number(normalizedUserId), data) : null);
    if (!access) {
      const inviteId = getInviteIdFromUrl();
      if (inviteId) {
        try {
          const invitePayload = decodeInvitePayload(inviteId);
          if (invitePayload?.organizationName && invitePayload?.energyFullName) {
            logEvent('info', 'Найдено локальное приглашение, пробуем принять', {
              inviteId,
              organizationName: invitePayload.organizationName
            });
            await acceptDirectInvite({
              inviteId,
              organizationName: invitePayload.organizationName,
              energyFullName: invitePayload.energyFullName,
              userId: normalizedUserId
            });
          } else {
            logEvent('info', 'Найдено приглашение, пробуем принять', { inviteId });
            await acceptInvite({ inviteId, userId: normalizedUserId });
          }
          const refreshedResponse = await fetchWithLogging('refresh-access', 'access.json', {
            cache: 'no-store'
          });
          if (refreshedResponse.ok) {
            accessDataCache = await refreshedResponse.json();
            access =
              findUserAccess(userId, accessDataCache) ||
              (normalizedUserId ? findUserAccess(normalizedUserId, accessDataCache) : null) ||
              (normalizedUserId
                ? findUserAccess(Number(normalizedUserId), accessDataCache)
                : null);
            if (access) {
              clearInviteFromUrl();
              logEvent('info', 'Приглашение принято, доступ обновлен', {
                inviteId,
                userId: normalizedUserId
              });
            }
          }
        } catch (error) {
          logEvent('warn', 'Не удалось принять приглашение', {
            inviteId,
            message: error?.message || error
          });
        }
      }
    }
    if (!access) {
      logEvent('warn', 'ID пользователя не найден в списке прав', {
        userId: normalizedUserId
      });
      lockAccess('Ваш ID не найден в списке прав. Обратитесь к супер‑администратору.', {
        user: getTelegramUser()
      });
      return;
    }
    const { effectiveScope, isRoleSuper, roleText, rolesList } = resolveEffectiveScope({
      user: access.user,
      scope: access.scope
    });
    if (isRoleSuper && access.scope !== 'super') {
      logEvent('warn', 'Роль определена как супер‑администратор, форсируем доступ', {
        userId: normalizedUserId,
        role: roleText || null,
        roles: rolesList,
        scopeBefore: access.scope
      });
    }
    access.scope = effectiveScope;
    if (access.scope === 'super') {
      access.organization = 'Все организации';
    }
    const accountInfo = resolveAccountInfo({ user: access.user, scope: access.scope });
    logEvent('info', 'Данные пользователя из access.json', {
      userId: normalizedUserId,
      fullName: accountInfo.fullName || null,
      organization: access.organization || null,
      role: accountInfo.role || null,
      roles: accountInfo.roles,
      scope: access.scope
    });
    logEvent('info', 'Доступ найден', {
      scope: access.scope,
      organization: access.organization || null
    });
    logResolvedAccess({ userId: normalizedUserId, access });
    if (access.scope === 'super') {
      document.body.classList.remove('is-checking');
      setCheckingOverlayVisibility(false);
      unlockAccess({ ...access, userId: normalizedUserId });
      return;
    }
    updateCheckingAccount({
      user: access.user,
      scope: access.scope
    });
    unlockAccess({ ...access, userId: normalizedUserId });
  } catch (error) {
    logEvent('error', 'Ошибка загрузки прав доступа', { message: error?.message || error });
    lockAccess('Ошибка загрузки прав доступа. Проверьте файл access.json.', {
      user: getTelegramUser()
    });
  } finally {
    setCheckingOverlayVisibility(false);
  }
};

initAccess();
