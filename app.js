const tg = window.Telegram ? window.Telegram.WebApp : null;

if (tg) {
  tg.ready();
  tg.expand();
}

const accessPanel = document.getElementById('accessPanel');
const accessName = document.getElementById('accessName');
const accessMeta = document.getElementById('accessMeta');
const accessBadge = document.getElementById('accessBadge');
const accessOverlay = document.getElementById('accessOverlay');
const accessOverlayText = document.getElementById('accessOverlayText');

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

const lockAccess = (message) => {
  document.body.classList.add('is-locked');
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
  document.body.classList.remove('is-locked');
  if (accessOverlay) {
    accessOverlay.hidden = true;
  }
  if (accessPanel) {
    accessPanel.hidden = false;
  }
  if (accessName) {
    accessName.textContent = user.fullName;
  }
  if (accessMeta) {
    accessMeta.textContent = `${user.role} · ${organization}`;
  }
  if (accessBadge) {
    accessBadge.textContent = scope === 'super' ? 'Супер‑админ' : organization;
  }
};

const initAccess = async () => {
  try {
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
    unlockAccess(access);
  } catch (error) {
    lockAccess('Ошибка загрузки прав доступа. Проверьте файл access.json.');
  }
};

initAccess();
