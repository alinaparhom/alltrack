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
const superAdminPanel = document.getElementById('superAdminPanel');
const defaultWorkspace = document.getElementById('defaultWorkspace');

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

const isSameId = (leftValue, rightValue) => {
  if (leftValue === null || leftValue === undefined) {
    return false;
  }
  if (rightValue === null || rightValue === undefined) {
    return false;
  }
  const leftNormalized = normalizeId(leftValue);
  const rightNormalized = normalizeId(rightValue);
  if (leftNormalized && rightNormalized) {
    return leftNormalized === rightNormalized;
  }
  return String(leftValue).trim() === String(rightValue).trim();
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
    if (values.length && values.every((item) => item && typeof item === 'object')) {
      return values;
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
  const normalizedId = normalizeId(userId);
  if (!normalizedId) {
    return null;
  }
  const superAdmins = getSuperAdminsList(data);
  const matchesNormalizedId = (entry) => {
    const entryId = normalizeId(getUserIdValue(entry));
    return Boolean(entryId && entryId === normalizedId);
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

const lockAccess = (message) => {
  document.body.classList.add('is-locked');
  document.body.classList.remove('is-checking');
  document.body.classList.remove('is-super-admin');
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
  updateUserIdIndicators(userId);
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
      window.initSuperAdminWorkspace({ fullName: resolvedName });
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
    updateCheckingAccount();
    const response = await fetch('access.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Не удалось загрузить список доступов');
    }
    const data = await response.json();
    await waitForTelegramUser();
    const { id: userId, source: userIdSource } = getUserIdWithSource();
    if (!userId) {
      lockAccess('Не удалось определить ID пользователя. Откройте приложение через Telegram.');
      return;
    }
    const normalizedUserId = normalizeId(userId) || userId;
    console.info(
      `ID пользователя принят в работу: ${normalizedUserId}. Источник: ${userIdSource}`
    );
    updateUserIdIndicators(normalizedUserId);
    const access = findUserAccess(normalizedUserId, data);
    if (!access) {
      lockAccess('Ваш ID не найден в списке прав. Обратитесь к супер‑администратору.');
      return;
    }
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
    lockAccess('Ошибка загрузки прав доступа. Проверьте файл access.json.');
  } finally {
    setCheckingOverlayVisibility(false);
  }
};

initAccess();
