const getTelegramWebApp = () => (window.Telegram ? window.Telegram.WebApp : null);
let telegramReady = false;
const LOG_STORAGE_KEY = 'alltrack.logs';
const LOG_LIMIT = 250;
const LOG_FILE_NAME = '1alltrack.log';
const LOG_ENDPOINT = '/log';
let logFileHandlePromise = null;
let nodeFileWritePromise = null;

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

const readLogs = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  return safeJsonParse(window.localStorage.getItem(LOG_STORAGE_KEY), []);
};

const writeLogs = (logs) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  window.localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
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

const buildLogLine = (entry) => {
  const payload = formatLogPayload(entry.payload);
  const payloadSegment = payload ? ` | ${payload}` : '';
  return `${entry.timestamp} [${entry.level}] ${entry.message}${payloadSegment}\n`;
};

const getLogFileHandle = async () => {
  if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
    return null;
  }
  if (!logFileHandlePromise) {
    logFileHandlePromise = navigator.storage
      .getDirectory()
      .then((directoryHandle) =>
        directoryHandle.getFileHandle(LOG_FILE_NAME, { create: true })
      )
      .catch(() => null);
  }
  return logFileHandlePromise;
};

const appendLogToFile = async (entry) => {
  const handle = await getLogFileHandle();
  if (!handle) {
    return;
  }
  const writable = await handle.createWritable({ keepExistingData: true });
  const file = await handle.getFile();
  await writable.seek(file.size);
  await writable.write(buildLogLine(entry));
  await writable.close();
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
        appendLine: (line) => fs.promises.appendFile(path.join(cwd, LOG_FILE_NAME), line, 'utf8')
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
  await writer.appendLine(buildLogLine(entry));
};

const appendLogToServer = async (entry) => {
  if (typeof window === 'undefined' || !window.navigator) {
    return;
  }
  if (!/^https?:$/.test(window.location?.protocol || '')) {
    return;
  }
  const logLine = buildLogLine(entry);
  if (window.navigator.sendBeacon) {
    const payload = new Blob([logLine], { type: 'text/plain' });
    const sent = window.navigator.sendBeacon(LOG_ENDPOINT, payload);
    if (sent) {
      return;
    }
  }
  await fetch(LOG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: logLine,
    keepalive: true
  });
};

const appendLogToStores = async (entry) => {
  await Promise.allSettled([
    appendLogToFile(entry),
    appendLogToNodeFile(entry),
    appendLogToServer(entry)
  ]);
};

const logEvent = (level, message, payload = null) => {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level,
    message,
    payload
  };
  const logs = readLogs();
  logs.push(entry);
  const trimmedLogs = logs.slice(-LOG_LIMIT);
  writeLogs(trimmedLogs);
  appendLogToStores(entry).catch(() => {});
  const consoleMethod =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  consoleMethod(`[${timestamp}] ${message}`, payload || '');
};

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
  document.addEventListener('submit', logUserAction, true);
  window.addEventListener('visibilitychange', () => {
    logEvent('info', 'Смена видимости вкладки', {
      state: document.visibilityState
    });
  });
};

const ensureTelegramReady = () => {
  const tg = getTelegramWebApp();
  if (tg && !telegramReady) {
    tg.ready();
    tg.expand();
    telegramReady = true;
  }
};

ensureTelegramReady();
logEvent('info', 'Приложение загружено');
initUserActionLogging();

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
      if (flattened.length && flattened.every((item) => item && typeof item === 'object')) {
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
    return null;
  }
  const resolvedUserId = String(userId).trim();
  const normalizedId = normalizeId(resolvedUserId);
  const userIdVariants = buildIdVariants(resolvedUserId);
  const superAdmins = getSuperAdminsList(data);
  const matchesNormalizedId = (entry) => {
    const entryId = getUserIdValue(entry);
    const entryVariants = buildIdVariants(entryId);
    if (!entryVariants.length || !userIdVariants.length) {
      return false;
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
  if (superAdmin) {
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
        return buildAccessResult({
          user: matchedByName,
          organization,
          fallbackScope: 'organization'
        });
      }
    }
  }

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

const formatUserIdStatus = ({ userId, user, scope } = {}) => {
  const normalizedId = normalizeId(userId) || '—';
  const { fullName, role } = resolveAccountInfo({ user, scope });
  const safeName = fullName || '—';
  const safeRole = role || '—';
  return `Telegram ID: ${normalizedId}. ${safeName}. Роль: ${safeRole}. Код принят в работу: ${normalizedId}.`;
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

const setCheckingOverlayVisibility = (visible) => {
  if (!checkingOverlay) {
    return;
  }
  checkingOverlay.hidden = !visible;
  checkingOverlay.style.display = visible ? '' : 'none';
};

const waitForTelegramUser = async ({ timeoutMs = 4000, intervalMs = 150 } = {}) => {
  if (getUserIdWithSource().id) {
    return true;
  }
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    ensureTelegramReady();
    if (getUserIdWithSource().id) {
      return true;
    }
  }
  return false;
};

const lockAccess = (message, { user, scope } = {}) => {
  document.body.classList.add('is-locked');
  document.body.classList.remove('is-checking');
  document.body.classList.remove('is-super-admin');
  delete document.body.dataset.accessScope;
  delete document.body.dataset.userRole;
  updateAccessOverlayAccount({ user, scope });
  updateUserIdIndicators({ userId: getUserId(), user, scope });
  if (accessOverlayText) {
    accessOverlayText.textContent = message;
  }
  if (accessOverlay) {
    accessOverlay.hidden = false;
  }
  if (accessPanel) {
    accessPanel.hidden = true;
  }
};

const unlockAccess = ({ user, organization, scope, userId }) => {
  const { fullName: resolvedName, role: resolvedRole, roles: resolvedRoles } =
    resolveAccountInfo({ user, scope });
  const isRoleSuper =
    scope === 'super' ||
    isSuperAdminRole(resolvedRole) ||
    isSuperAdminRole(resolvedRoles);
  const effectiveScope = isRoleSuper ? 'super' : scope;
  const effectiveOrganization = isRoleSuper ? 'Все организации' : organization;
  document.body.classList.remove('is-locked');
  document.body.classList.remove('is-checking');
  document.body.classList.toggle('is-super-admin', effectiveScope === 'super');
  document.body.dataset.accessScope = effectiveScope;
  document.body.dataset.userRole = resolvedRole;
  if (accessOverlay) {
    accessOverlay.hidden = true;
  }
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
    const response = await fetch('access.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Не удалось загрузить список доступов');
    }
    const data = await response.json();
    accessDataCache = data;
    logEvent('info', 'Файл access.json загружен', {
      superAdmins: getSuperAdminsList(data).length,
      organizations: Object.keys(data?.organizations || {}).length
    });
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
    const access =
      findUserAccess(userId, data) ||
      (normalizedUserId ? findUserAccess(normalizedUserId, data) : null) ||
      (normalizedUserId ? findUserAccess(Number(normalizedUserId), data) : null);
    if (!access) {
      logEvent('warn', 'ID пользователя не найден в списке прав', {
        userId: normalizedUserId
      });
      lockAccess('Ваш ID не найден в списке прав. Обратитесь к супер‑администратору.', {
        user: getTelegramUser()
      });
      return;
    }
    logEvent('info', 'Доступ найден', {
      scope: access.scope,
      organization: access.organization || null
    });
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
