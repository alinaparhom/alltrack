const tg = window.Telegram ? window.Telegram.WebApp : null;

if (tg) {
  tg.ready();
  tg.expand();
}

const accessPanel = document.getElementById('accessPanel');
const accessName = document.getElementById('accessName');
const accessRole = document.getElementById('accessRole');
const accessMeta = document.getElementById('accessMeta');
const accessBadge = document.getElementById('accessBadge');
const accessAvatar = document.getElementById('accessAvatar');
const accessOverlay = document.getElementById('accessOverlay');
const accessOverlayText = document.getElementById('accessOverlayText');
const checkingOverlay = document.getElementById('checkingOverlay');
const checkingName = document.getElementById('checkingName');
const checkingRole = document.getElementById('checkingRole');

document.body.classList.add('is-checking');

const buttons = document.querySelectorAll('button');
buttons.forEach((button) => {
  button.addEventListener('click', () => {
    if (tg) {
      tg.HapticFeedback.selectionChanged();
    }
  });
});

const getUserId = () => {
  const telegramId = tg?.initDataUnsafe?.user?.id;
  if (telegramId) {
    return telegramId;
  }
  const urlId = new URLSearchParams(window.location.search).get('user_id');
  return urlId ? Number(urlId) : null;
};

const findUserAccess = (userId, data) => {
  const superAdmin = data.superAdmins?.find((admin) => admin.id === userId);
  if (superAdmin) {
    return {
      user: superAdmin,
      scope: 'super',
      organization: 'Все организации'
    };
  }

  const organizations = data.organizations || {};
  for (const [organization, users] of Object.entries(organizations)) {
    const matched = users.find((user) => user.id === userId);
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

const getUserFullName = (user) => {
  return user?.fullName || user?.full_name || user?.name || '';
};

const getUserRole = (user) => {
  return user?.role || user?.position || user?.access || '';
};

const getInitials = (fullName = '') => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '—';
  }
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  return initials || '—';
};

const updateCheckingAccount = ({ fullName, role } = {}) => {
  const displayName = getShortName(fullName || getTelegramDisplayName(tg?.initDataUnsafe?.user));
  if (checkingName) {
    checkingName.textContent = displayName || '—';
  }
  if (checkingRole) {
    checkingRole.textContent = `Роль: ${role || '—'}`;
  }
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

const unlockAccess = ({ user, organization, scope }) => {
  const resolvedName = getUserFullName(user);
  const resolvedRole = getUserRole(user);
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
  if (accessAvatar) {
    accessAvatar.textContent = getInitials(resolvedName);
  }
  if (accessBadge) {
    accessBadge.textContent = scope === 'super' ? 'Супер‑админ' : organization;
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
    const userId = getUserId();
    if (!userId) {
      lockAccess('Не удалось определить ID пользователя. Откройте приложение через Telegram.');
      return;
    }
    const access = findUserAccess(userId, data);
    if (!access) {
      lockAccess('Ваш ID не найден в списке прав. Обратитесь к супер‑администратору.');
      return;
    }
    updateCheckingAccount({
      fullName: getUserFullName(access.user),
      role: getUserRole(access.user)
    });
    unlockAccess(access);
  } catch (error) {
    lockAccess('Ошибка загрузки прав доступа. Проверьте файл access.json.');
  } finally {
    if (checkingOverlay) {
      checkingOverlay.hidden = true;
    }
  }
};

initAccess();
