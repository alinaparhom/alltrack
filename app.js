const getTelegramWebApp = () => (window.Telegram ? window.Telegram.WebApp : null);
let telegramReady = false;

const ensureTelegramReady = () => {
  const tg = getTelegramWebApp();
  if (tg && !telegramReady) {
    tg.ready();
    tg.expand();
    telegramReady = true;
  }
};

ensureTelegramReady();

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
const checkingOverlay = document.getElementById('checkingOverlay');
const checkingName = document.getElementById('checkingName');
const checkingRole = document.getElementById('checkingRole');
const checkingIdStatus = document.getElementById('checkingIdStatus');

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

const getUserId = () => {
  const telegramId = getTelegramUser()?.id;
  if (telegramId !== undefined && telegramId !== null) {
    return String(telegramId);
  }
  const urlId = new URLSearchParams(window.location.search).get('user_id');
  return urlId ? urlId.trim() : null;
};

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

const getUserIdValue = (user) => {
  if (!user || typeof user !== 'object') {
    return null;
  }
  return (
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
  return [];
};

const findUserAccess = (userId, data) => {
  const normalizedId = normalizeId(userId);
  if (!normalizedId) {
    return null;
  }
  const superAdmins = getAccessList(data.superAdmins);
  const superAdmin = superAdmins.find(
    (admin) => normalizeId(getUserIdValue(admin)) === normalizedId
  );
  if (superAdmin) {
    return {
      user: superAdmin,
      scope: 'super',
      organization: 'Все организации'
    };
  }

  const organizations = data.organizations || {};
  for (const [organization, users] of Object.entries(organizations)) {
    const list = getAccessList(users);
    if (!Array.isArray(list)) {
      continue;
    }
    const matched = list.find(
      (user) => normalizeId(getUserIdValue(user)) === normalizedId
    );
    if (matched) {
      return {
        user: matched,
        scope: 'organization',
        organization
      };
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

const formatUserIdStatus = (userId) => {
  const normalizedId = normalizeId(userId) || '—';
  return `Telegram ID: ${normalizedId}. Код принят в работу: ${normalizedId}.`;
};

const updateUserIdIndicators = (userId) => {
  const message = formatUserIdStatus(userId);
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

const waitForTelegramUser = async ({ timeoutMs = 4000, intervalMs = 150 } = {}) => {
  if (getUserId()) {
    return true;
  }
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    ensureTelegramReady();
    if (getUserId()) {
      return true;
    }
  }
  return false;
};

const lockAccess = (message) => {
  document.body.classList.add('is-locked');
  document.body.classList.remove('is-checking');
  delete document.body.dataset.accessScope;
  delete document.body.dataset.userRole;
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
  document.body.classList.remove('is-locked');
  document.body.classList.remove('is-checking');
  document.body.dataset.accessScope = scope;
  document.body.dataset.userRole = resolvedRole;
  if (accessOverlay) {
    accessOverlay.hidden = true;
  }
  if (accessPanel) {
    accessPanel.hidden = false;
  }
  if (accessName) {
    accessName.textContent = getShortName(resolvedName);
  }
  if (accessRole) {
    accessRole.textContent = `Роль: ${resolvedRole || '—'}`;
  }
  if (accessMeta) {
    accessMeta.textContent = `Организация: ${organization}`;
  }
  updateUserIdIndicators(userId);
  if (accessMessage) {
    const rolesText = resolvedRoles.length ? resolvedRoles.join(', ') : '—';
    accessMessage.textContent = `Вошёл(а): ${resolvedName || '—'}. Доступные роли: ${rolesText}.`;
  }
  if (accessAvatar) {
    accessAvatar.textContent = getInitials(resolvedName);
  }
  if (accessBadge) {
    accessBadge.textContent = scope === 'super' ? 'Супер‑админ' : organization;
  }
  if (scope === 'super' && window.initSuperAdminWorkspace) {
    window.initSuperAdminWorkspace({ fullName: resolvedName });
  } else if (window.resetSuperAdminWorkspace) {
    window.resetSuperAdminWorkspace();
  }
};

const initAccess = async () => {
  try {
    updateCheckingAccount();
    const response = await fetch('access.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Не удалось загрузить список доступов');
    }
    const data = await response.json();
    await waitForTelegramUser();
    const userId = getUserId();
    if (!userId) {
      lockAccess('Не удалось определить ID пользователя. Откройте приложение через Telegram.');
      return;
    }
    updateUserIdIndicators(userId);
    const access = findUserAccess(userId, data);
    if (!access) {
      lockAccess('Ваш ID не найден в списке прав. Обратитесь к супер‑администратору.');
      return;
    }
    updateCheckingAccount({
      user: access.user,
      scope: access.scope
    });
    unlockAccess({ ...access, userId });
  } catch (error) {
    lockAccess('Ошибка загрузки прав доступа. Проверьте файл access.json.');
  } finally {
    if (checkingOverlay) {
      checkingOverlay.hidden = true;
    }
  }
};

initAccess();
