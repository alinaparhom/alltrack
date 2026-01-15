const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const ORGANIZATIONS_DIR = path.join(DATA_DIR, 'organizations');
const ORGANIZATIONS_FILE = path.join(ORGANIZATIONS_DIR, 'organizations.json');
const LEGACY_ORGANIZATIONS_FILE = path.join(DATA_DIR, 'organizations.json');
const ACCESS_FILE = path.join(ROOT_DIR, 'access.json');
const LOG_FILE = path.join(ROOT_DIR, '1alltrack.log');
const INVITES_FILE = path.join(DATA_DIR, 'invites.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const send = (res, statusCode, body, headers = {}) => {
  res.writeHead(statusCode, headers);
  res.end(body);
};

const sendJson = (res, statusCode, payload) => {
  send(res, statusCode, JSON.stringify(payload), {
    'Content-Type': 'application/json; charset=utf-8'
  });
};

const buildErrorPayload = (message, details, meta = {}) => ({
  message,
  details,
  ...meta
});

const buildStepError = ({ message, details, step, code, path: targetPath, systemCode }) => {
  const error = new Error(message);
  error.payload = buildErrorPayload(message, details, {
    step,
    code,
    path: targetPath,
    systemCode
  });
  return error;
};

const formatTimestamp = () => new Date().toISOString();

const ensureLogFile = () => {
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '', 'utf8');
  }
};

const appendLogLine = (line, callback) => {
  const text = line.endsWith('\n') ? line : `${line}\n`;
  ensureLogFile();
  fs.appendFile(LOG_FILE, text, 'utf8', callback);
};

const safeStringify = (value) => {
  if (value === undefined) {
    return '';
  }
  try {
    return JSON.stringify(value);
  } catch (error) {
    return '"[unserializable]"';
  }
};

const logAction = (action, payload = null) => {
  const details = payload ? ` ${safeStringify(payload)}` : '';
  appendLogLine(`${formatTimestamp()} ACTION ${action}${details}`, (error) => {
    if (error) {
      console.error('Ошибка записи лога:', error);
    }
  });
};

const ORGANIZATION_DATABASE_FILES = [
  'Объекты.json',
  'Пользователи.json',
  'Штрафы.json',
  'Инструменты.json',
  'Перемещения.json',
  'Списания.json',
  'Поломки.json',
  'Ремонт.json',
  'Настройки.json'
];

const ORGANIZATION_MEDIA_FOLDERS = [
  'Фото инструментов',
  'Фото поломок',
  'Фото отказов',
  'Акты ремонтов',
  'Акты списаний'
];

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const sanitizeOrganizationName = (name) => name.replace(/[\\/]/g, '-').trim();

const ensureJsonFile = (filePath, defaultValue) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
  }
};

const readJsonFile = (filePath, fallback) => {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
};

const writeJsonFile = (filePath, payload) => {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
};

const normalizeFullName = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const isEmptyId = (value) => value === '' || value === null || value === undefined;

const addPlaceholderMember = (members, fullName) => {
  const normalizedName = normalizeFullName(fullName);
  const existingIndex = members.findIndex(
    (member) => normalizeFullName(member?.fullName) === normalizedName
  );
  if (existingIndex !== -1) {
    if (isEmptyId(members[existingIndex]?.id)) {
      members[existingIndex].id = '';
    }
    return members;
  }
  members.push({
    id: '',
    fullName,
    role: 'Энергетик'
  });
  return members;
};

const assignMemberId = (members, fullName, userId) => {
  const normalizedName = normalizeFullName(fullName);
  const matchIndex = members.findIndex(
    (member) =>
      normalizeFullName(member?.fullName) === normalizedName && isEmptyId(member?.id)
  );
  if (matchIndex !== -1) {
    members[matchIndex].id = userId;
    return { members, updated: true };
  }
  return { members, updated: false };
};

const writeIfChanged = (filePath, payload) => {
  const nextContent = JSON.stringify(payload, null, 2);
  const currentContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  if (currentContent.trim() !== nextContent.trim()) {
    writeJsonFile(filePath, payload);
  }
};

const parseOrganizationsPayload = (stored) => {
  if (!stored) {
    return [];
  }
  const rawList = Array.isArray(stored)
    ? stored
    : Array.isArray(stored.organizations)
      ? stored.organizations
      : [];
  return rawList
    .map((entry) => (typeof entry === 'string' ? entry : entry?.name))
    .filter((entry) => typeof entry === 'string' && entry.trim().length);
};

const ensureOrganizationsStorage = () => {
  if (!fs.existsSync(ACCESS_FILE)) {
    return;
  }

  const accessData = readJsonFile(ACCESS_FILE, {});
  const organizations = Object.keys(accessData.organizations || {});

  ensureDir(DATA_DIR);
  ensureDir(ORGANIZATIONS_DIR);

  organizations.forEach((name) => {
    const folderName = sanitizeOrganizationName(name);
    const organizationPath = path.join(ORGANIZATIONS_DIR, folderName);
    ensureDir(organizationPath);

    ORGANIZATION_DATABASE_FILES.forEach((fileName) => {
      ensureJsonFile(path.join(organizationPath, fileName), []);
    });

    ORGANIZATION_MEDIA_FOLDERS.forEach((folder) => {
      ensureDir(path.join(organizationPath, folder));
    });
  });

  const organizationsPayload = {
    organizations
  };
  writeIfChanged(ORGANIZATIONS_FILE, organizationsPayload);
  if (fs.existsSync(LEGACY_ORGANIZATIONS_FILE)) {
    writeIfChanged(LEGACY_ORGANIZATIONS_FILE, organizationsPayload);
  }
};

const buildOrganizationPath = (name) =>
  path.join(ORGANIZATIONS_DIR, sanitizeOrganizationName(name));

const ensureOrganizationAssets = (name) => {
  ensureDir(DATA_DIR);
  ensureDir(ORGANIZATIONS_DIR);
  const organizationPath = buildOrganizationPath(name);
  ensureDir(organizationPath);

  ORGANIZATION_DATABASE_FILES.forEach((fileName) => {
    ensureJsonFile(path.join(organizationPath, fileName), []);
  });

  ORGANIZATION_MEDIA_FOLDERS.forEach((folder) => {
    ensureDir(path.join(organizationPath, folder));
  });
};

const getOrganizationsList = () => {
  const primaryList = parseOrganizationsPayload(
    readJsonFile(ORGANIZATIONS_FILE, null)
  );
  if (primaryList.length) {
    return primaryList;
  }
  const legacyList = parseOrganizationsPayload(
    readJsonFile(LEGACY_ORGANIZATIONS_FILE, null)
  );
  if (legacyList.length) {
    saveOrganizationsList(legacyList);
  }
  return legacyList;
};

const saveOrganizationsList = (list) => {
  ensureDir(DATA_DIR);
  ensureDir(ORGANIZATIONS_DIR);
  const payload = { organizations: list };
  writeJsonFile(ORGANIZATIONS_FILE, payload);
  writeJsonFile(LEGACY_ORGANIZATIONS_FILE, payload);
};

const generateInviteId = () =>
  `invite-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeBotUsername = (value) => {
  if (!value) {
    return '';
  }
  return String(value).replace(/^@/, '').trim();
};

const getTelegramBotUsername = () =>
  normalizeBotUsername(process.env.TELEGRAM_BOT_USERNAME || process.env.BOT_USERNAME);

const getBaseUrl = (req) => {
  const protoHeader = req.headers['x-forwarded-proto'];
  const protocol = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader || 'http';
  const host = req.headers.host || 'localhost';
  return `${protocol}://${host}`;
};

const buildInviteLink = (req, inviteId) => {
  const botUsername = getTelegramBotUsername();
  if (botUsername) {
    return `https://t.me/${botUsername}?startapp=${encodeURIComponent(inviteId)}`;
  }
  return `${getBaseUrl(req)}/?invite=${encodeURIComponent(inviteId)}`;
};

const handleConfig = (req, res) => {
  const botUsername = getTelegramBotUsername();
  logAction('get_config', { hasBotUsername: Boolean(botUsername) });
  send(
    res,
    200,
    JSON.stringify({
      botUsername
    }),
    {
      'Content-Type': 'application/json; charset=utf-8'
    }
  );
};

const parseJsonBody = (req, callback) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    try {
      const data = body ? JSON.parse(body) : {};
      callback(null, data);
    } catch (error) {
      callback(error);
    }
  });
};

const handleCreateOrganization = (req, res) => {
  parseJsonBody(req, (error, payload) => {
    if (error) {
      logAction('create_org_invalid_payload');
      sendJson(
        res,
        400,
        buildErrorPayload('Некорректные данные', error?.message || 'JSON не распознан.')
      );
      return;
    }
    try {
      const organizationName = String(payload.organizationName || '').trim();
      const energyFullName = String(payload.energyFullName || '').trim();
      if (!organizationName || !energyFullName) {
        logAction('create_org_missing_fields', { organizationName, energyFullName });
        sendJson(
          res,
          400,
          buildErrorPayload(
            'Заполните название организации и ФИО энергетика.',
            'Одно или несколько полей пустые.'
          )
        );
        return;
      }
      const organizations = getOrganizationsList();
      if (organizations.includes(organizationName)) {
        logAction('create_org_duplicate', { organizationName, energyFullName });
        sendJson(
          res,
          409,
          buildErrorPayload(
            'Такая организация уже существует.',
            'Попробуйте другое название.'
          )
        );
        return;
      }

      logAction('create_org_start', { organizationName, energyFullName });

      try {
        const accessData = readJsonFile(ACCESS_FILE, { superAdmins: [], organizations: {} });
        if (!accessData.organizations || typeof accessData.organizations !== 'object') {
          accessData.organizations = {};
        }
        const existingMembers = Array.isArray(accessData.organizations[organizationName])
          ? accessData.organizations[organizationName]
          : [];
        accessData.organizations[organizationName] = addPlaceholderMember(
          existingMembers,
          energyFullName
        );
        writeJsonFile(ACCESS_FILE, accessData);
      } catch (error) {
        throw buildStepError({
          message: 'Не удалось создать организацию.',
          details: `Шаг 1.1 (access.json: организация и первый пользователь) завершился ошибкой: ${
            error?.message || error
          }`,
          step: '1.1',
          code: 'create_org_access',
          path: 'access.json',
          systemCode: error?.code
        });
      }

      try {
        const nextOrganizations = [...organizations, organizationName];
        saveOrganizationsList(nextOrganizations);
      } catch (error) {
        throw buildStepError({
          message: 'Не удалось создать организацию.',
          details: `Шаг 1.2 (data/organizations/organizations.json: список организаций) завершился ошибкой: ${
            error?.message || error
          }`,
          step: '1.2',
          code: 'create_org_list',
          path: 'data/organizations/organizations.json',
          systemCode: error?.code
        });
      }

      try {
        ensureOrganizationAssets(organizationName);
      } catch (error) {
        throw buildStepError({
          message: 'Не удалось создать организацию.',
          details: `Шаг 1.3 (data/organizations/<имя>: папка и файлы) завершился ошибкой: ${
            error?.message || error
          }`,
          step: '1.3',
          code: 'create_org_assets',
          path: `data/organizations/${sanitizeOrganizationName(organizationName)}`,
          systemCode: error?.code
        });
      }

      let inviteId;
      try {
        const invitesData = readJsonFile(INVITES_FILE, { invites: [] });
        const invites = Array.isArray(invitesData.invites) ? invitesData.invites : [];
        inviteId = generateInviteId();
        invites.push({
          id: inviteId,
          organizationName,
          energyFullName,
          createdAt: formatTimestamp()
        });
        writeJsonFile(INVITES_FILE, { invites });
      } catch (error) {
        throw buildStepError({
          message: 'Не удалось создать организацию.',
          details: `Шаг 1.4 (data/invites.json: сохранение приглашения) завершился ошибкой: ${
            error?.message || error
          }`,
          step: '1.4',
          code: 'create_org_invite',
          path: 'data/invites.json',
          systemCode: error?.code
        });
      }

      const inviteLink = buildInviteLink(req, inviteId);
      logAction('create_org_success', {
        organizationName,
        energyFullName,
        inviteId,
        inviteLink
      });
      sendJson(res, 200, { inviteId, inviteLink });
    } catch (createError) {
      const errorPayload =
        createError?.payload ||
        buildErrorPayload(
          'Ошибка сервиса создания организации.',
          createError?.message || 'Неизвестная ошибка.'
        );
      logAction('create_org_failed', {
        message: createError?.message || createError,
        stack: createError?.stack,
        payload: createError?.payload
      });
      sendJson(res, 500, errorPayload);
    }
  });
};

const normalizeIdValue = (value) => {
  if (value === null || value === undefined) {
    return value;
  }
  const text = String(value).trim();
  if (!text) {
    return value;
  }
  const numeric = Number(text);
  return Number.isNaN(numeric) ? text : numeric;
};

const handleAcceptInvite = (req, res) => {
  parseJsonBody(req, (error, payload) => {
    if (error) {
      logAction('accept_invite_invalid_payload');
      send(res, 400, 'Некорректные данные');
      return;
    }
    const inviteId = String(payload.inviteId || '').trim();
    const userId = normalizeIdValue(payload.userId);
    if (!inviteId || userId === undefined || userId === null || userId === '') {
      logAction('accept_invite_missing_fields', { inviteId, userId });
      send(res, 400, 'Не хватает данных для подтверждения приглашения.');
      return;
    }
    const invitesData = readJsonFile(INVITES_FILE, { invites: [] });
    const invites = Array.isArray(invitesData.invites) ? invitesData.invites : [];
    const inviteIndex = invites.findIndex((invite) => invite.id === inviteId);
    if (inviteIndex === -1) {
      logAction('accept_invite_not_found', { inviteId, userId });
      send(res, 404, 'Приглашение не найдено.');
      return;
    }
    const invite = invites[inviteIndex];
    logAction('accept_invite_start', {
      inviteId,
      userId,
      organizationName: invite.organizationName
    });
    const accessData = readJsonFile(ACCESS_FILE, { superAdmins: [], organizations: {} });
    if (!accessData.organizations || typeof accessData.organizations !== 'object') {
      accessData.organizations = {};
    }
    const existingMembers = Array.isArray(accessData.organizations[invite.organizationName])
      ? accessData.organizations[invite.organizationName]
      : [];
    const alreadyExists = existingMembers.some(
      (member) => normalizeIdValue(member?.id) === userId
    );
    let didUpdate = false;
    if (!alreadyExists) {
      const updateResult = assignMemberId(existingMembers, invite.energyFullName, userId);
      didUpdate = updateResult.updated;
    }
    if (!alreadyExists && !didUpdate) {
      existingMembers.push({
        id: userId,
        fullName: invite.energyFullName,
        role: 'Энергетик'
      });
    }
    accessData.organizations[invite.organizationName] = existingMembers;
    writeJsonFile(ACCESS_FILE, accessData);

    const organizations = getOrganizationsList();
    if (!organizations.includes(invite.organizationName)) {
      saveOrganizationsList([...organizations, invite.organizationName]);
      ensureOrganizationAssets(invite.organizationName);
    }

    invites.splice(inviteIndex, 1);
    writeJsonFile(INVITES_FILE, { invites });

    logAction('accept_invite_success', {
      inviteId,
      userId,
      organizationName: invite.organizationName
    });
    send(
      res,
      200,
      JSON.stringify({
        organizationName: invite.organizationName,
        fullName: invite.energyFullName
      }),
      {
        'Content-Type': 'application/json; charset=utf-8'
      }
    );
  });
};

const handleAcceptDirectInvite = (req, res) => {
  parseJsonBody(req, (error, payload) => {
    if (error) {
      logAction('accept_direct_invalid_payload');
      send(res, 400, 'Некорректные данные');
      return;
    }
    const organizationName = String(payload.organizationName || '').trim();
    const energyFullName = String(payload.energyFullName || '').trim();
    const userId = normalizeIdValue(payload.userId);
    const inviteId = String(payload.inviteId || '').trim();
    if (!organizationName || !energyFullName || userId === undefined || userId === null || userId === '') {
      logAction('accept_direct_missing_fields', {
        organizationName,
        energyFullName,
        userId,
        inviteId
      });
      send(res, 400, 'Не хватает данных для подтверждения приглашения.');
      return;
    }
    logAction('accept_direct_start', {
      inviteId,
      userId,
      organizationName
    });
    const accessData = readJsonFile(ACCESS_FILE, { superAdmins: [], organizations: {} });
    if (!accessData.organizations || typeof accessData.organizations !== 'object') {
      accessData.organizations = {};
    }
    const existingMembers = Array.isArray(accessData.organizations[organizationName])
      ? accessData.organizations[organizationName]
      : [];
    const alreadyExists = existingMembers.some(
      (member) => normalizeIdValue(member?.id) === userId
    );
    let didUpdate = false;
    if (!alreadyExists) {
      const updateResult = assignMemberId(existingMembers, energyFullName, userId);
      didUpdate = updateResult.updated;
    }
    if (!alreadyExists && !didUpdate) {
      existingMembers.push({
        id: userId,
        fullName: energyFullName,
        role: 'Энергетик'
      });
    }
    accessData.organizations[organizationName] = existingMembers;
    writeJsonFile(ACCESS_FILE, accessData);

    const organizations = getOrganizationsList();
    if (!organizations.includes(organizationName)) {
      saveOrganizationsList([...organizations, organizationName]);
      ensureOrganizationAssets(organizationName);
    }

    logAction('accept_direct_success', {
      inviteId,
      userId,
      organizationName
    });
    send(
      res,
      200,
      JSON.stringify({
        organizationName,
        fullName: energyFullName
      }),
      {
        'Content-Type': 'application/json; charset=utf-8'
      }
    );
  });
};

ensureOrganizationsStorage();

const handleLog = (req, res) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    const trimmed = body.trim();
    const logLine = `${formatTimestamp()} CLIENT_LOG ${trimmed || '[empty]'}`;
    appendLogLine(logLine, (error) => {
      if (error) {
        send(res, 500, 'Ошибка записи лога');
        return;
      }
      send(res, 204, '');
    });
  });
};

const resolveFilePath = (urlPath) => {
  const safePath = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = path.normalize(safePath).replace(/^([/\\])+/, '');
  const target = normalized === '' ? 'index.html' : normalized;
  return path.join(ROOT_DIR, target);
};

const server = http.createServer((req, res) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const url = req.url || '-';
    const method = req.method || '-';
    const status = res.statusCode;
    const logLine = `${formatTimestamp()} REQUEST ${method} ${url} ${status} ${durationMs}ms`;
    appendLogLine(logLine, (error) => {
      if (error) {
        console.error('Ошибка записи лога:', error);
      }
    });
  });

  if (!req.url) {
    send(res, 400, 'Некорректный запрос');
    return;
  }

  const urlPath = req.url.split('?')[0];
  const normalizedPath =
    urlPath.length > 1 && urlPath.endsWith('/') ? urlPath.slice(0, -1) : urlPath;

  if (req.method === 'POST' && normalizedPath.startsWith('/log')) {
    handleLog(req, res);
    return;
  }

  if (
    req.method === 'POST' &&
    (normalizedPath === '/create-organization' || normalizedPath === '/api/create-organization')
  ) {
    handleCreateOrganization(req, res);
    return;
  }

  if (
    req.method === 'POST' &&
    (normalizedPath === '/accept-invite' || normalizedPath === '/api/accept-invite')
  ) {
    handleAcceptInvite(req, res);
    return;
  }

  if (
    req.method === 'POST' &&
    (normalizedPath === '/accept-direct-invite' || normalizedPath === '/api/accept-direct-invite')
  ) {
    handleAcceptDirectInvite(req, res);
    return;
  }

  if (req.method === 'GET' && normalizedPath === '/config') {
    handleConfig(req, res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Метод не поддерживается');
    return;
  }

  const filePath = resolveFilePath(req.url);
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      send(res, 404, 'Файл не найден');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`AllTrack доступен на http://localhost:${PORT}`);
});
