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
const DOCKS_LOG_FILE = path.join(ROOT_DIR, '1docks.log');
const LOG_FILES = [LOG_FILE, DOCKS_LOG_FILE];
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

const send = (req, res, statusCode, body, headers = {}) => {
  res.writeHead(statusCode, headers);
  res.end(body);
};

const sendJson = (req, res, statusCode, payload) => {
  send(
    req,
    res,
    statusCode,
    JSON.stringify(payload),
    {
      'Content-Type': 'application/json; charset=utf-8'
    },
    payload
  );
};

const buildErrorPayload = (message, details, meta = {}) => ({
  message,
  details,
  serverTime: formatTimestamp(),
  ...meta
});

const buildStepError = ({
  message,
  details,
  step,
  code,
  path: targetPath,
  systemCode,
  debug
}) => {
  const error = new Error(message);
  error.payload = buildErrorPayload(message, details, {
    step,
    code,
    path: targetPath,
    systemCode,
    debug
  });
  return error;
};

const formatTimestamp = () => new Date().toISOString();

const ensureLogFile = () => {
  LOG_FILES.forEach((filePath) => {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '', 'utf8');
    }
  });
};

const appendLogLine = (line, callback) => {
  const text = line.endsWith('\n') ? line : `${line}\n`;
  ensureLogFile();
  let pending = LOG_FILES.length;
  let lastError = null;
  LOG_FILES.forEach((filePath) => {
    fs.appendFile(filePath, text, 'utf8', (error) => {
      if (error) {
        lastError = error;
        console.error(`Ошибка записи лога (${filePath}):`, error);
      }
      pending -= 1;
      if (pending === 0 && callback) {
        callback(lastError);
      }
    });
  });
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

const truncateLogText = (text, limit = 1200) => {
  if (!text) {
    return '';
  }
  const normalized = String(text);
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit)}...`;
};

const buildFileSystemStatus = (targetPath) => {
  const status = {
    path: targetPath,
    exists: false,
    type: 'missing',
    readable: false,
    writable: false
  };
  try {
    if (!fs.existsSync(targetPath)) {
      return status;
    }
    status.exists = true;
    const stats = fs.statSync(targetPath);
    status.type = stats.isDirectory() ? 'directory' : stats.isFile() ? 'file' : 'other';
    try {
      fs.accessSync(targetPath, fs.constants.R_OK);
      status.readable = true;
    } catch (error) {
      status.readable = false;
    }
    try {
      fs.accessSync(targetPath, fs.constants.W_OK);
      status.writable = true;
    } catch (error) {
      status.writable = false;
    }
    if (stats.isFile()) {
      status.size = stats.size;
    }
    if (stats.isDirectory()) {
      try {
        status.entries = fs.readdirSync(targetPath).slice(0, 50);
      } catch (error) {
        status.entries = ['[не удалось прочитать содержимое папки]'];
      }
    }
    return status;
  } catch (error) {
    return {
      ...status,
      error: error?.message || String(error)
    };
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

const logApiResponse = (action, statusCode, payload) => {
  logAction(`${action}_response`, {
    statusCode,
    payload
  });
};

const logServerError = (event, error) => {
  logAction('server_error', {
    event,
    message: error?.message || String(error),
    stack: error?.stack,
    code: error?.code
  });
};

const summarizeLogPayload = (payload) => {
  if (payload === null || payload === undefined) {
    return '';
  }
  if (typeof payload === 'string') {
    return truncateLogText(payload);
  }
  return truncateLogText(safeStringify(payload));
};

const buildRequestId = () =>
  `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getRequestMeta = (req) => ({
  requestId: req.requestId,
  method: req.method,
  url: req.url
});

const CREATE_ORG_ENDPOINTS = [
  '/create-organization',
  '/api/create-organization',
  '/create-organizations',
  '/api/create-organizations'
];

const buildCreateOrgExpectedPayload = () => ({
  required: ['organizationName', 'energyFullName'],
  example: {
    organizationName: 'ООО "Пример"',
    energyFullName: 'Иванов Иван Иванович'
  }
});

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '';
};

const logRequestStart = (req) => {
  logAction('http_request', {
    ...getRequestMeta(req),
    ip: getClientIp(req),
    host: req.headers.host,
    forwarded: {
      proto: req.headers['x-forwarded-proto'],
      host: req.headers['x-forwarded-host'],
      for: req.headers['x-forwarded-for']
    },
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
      referer: req.headers.referer,
      origin: req.headers.origin
    }
  });
};

const attachRequestBodyLogger = (req, limit = 2000) => {
  const method = (req.method || '').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return;
  }
  let body = '';
  let truncated = false;
  req.on('data', (chunk) => {
    if (truncated) {
      return;
    }
    const text = chunk.toString('utf8');
    if (body.length + text.length > limit) {
      const remaining = limit - body.length;
      if (remaining > 0) {
        body += text.slice(0, remaining);
      }
      truncated = true;
      return;
    }
    body += text;
  });
  req.on('end', () => {
    if (!body && !truncated) {
      logAction('http_request_body', {
        ...getRequestMeta(req),
        body: '[empty]'
      });
      return;
    }
    const suffix = truncated ? '...[truncated]' : '';
    logAction('http_request_body', {
      ...getRequestMeta(req),
      body: `${truncateLogText(body, limit)}${suffix}`
    });
  });
};

process.on('uncaughtException', (error) => {
  logServerError('uncaughtException', error);
});

process.on('unhandledRejection', (error) => {
  logServerError('unhandledRejection', error);
});

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
    logAction('json_read_failed', {
      file: filePath,
      message: error?.message || error,
      stack: error?.stack
    });
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

const seedOrganizationAccess = ({ organizationName, energyFullName }) => {
  const accessData = readJsonFile(ACCESS_FILE, { superAdmins: [], organizations: {} });
  if (
    !accessData.organizations ||
    typeof accessData.organizations !== 'object' ||
    Array.isArray(accessData.organizations)
  ) {
    accessData.organizations = {};
  }
  const existingMembers = Array.isArray(accessData.organizations[organizationName])
    ? accessData.organizations[organizationName]
    : [];
  const membersBefore = existingMembers.length;
  accessData.organizations[organizationName] = addPlaceholderMember(
    existingMembers,
    energyFullName
  );
  writeJsonFile(ACCESS_FILE, accessData);
  return {
    accessData,
    membersBefore,
    membersAfter: accessData.organizations[organizationName]?.length || 0
  };
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

const buildCreateOrgDebugSnapshot = (organizationName) => ({
  accessFile: buildFileSystemStatus(ACCESS_FILE),
  organizationsFile: buildFileSystemStatus(ORGANIZATIONS_FILE),
  legacyOrganizationsFile: buildFileSystemStatus(LEGACY_ORGANIZATIONS_FILE),
  dataDir: buildFileSystemStatus(DATA_DIR),
  organizationsDir: buildFileSystemStatus(ORGANIZATIONS_DIR),
  organizationDir: organizationName
    ? buildFileSystemStatus(buildOrganizationPath(organizationName))
    : null
});

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
  logApiResponse('get_config', 200, { botUsername });
  send(
    req,
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
      callback(null, data, body);
    } catch (error) {
      callback(error, null, body);
    }
  });
};

const handleCreateOrganization = (req, res) => {
  parseJsonBody(req, (error, payload, rawBody) => {
    if (error) {
      logAction('create_org_invalid_payload', {
        ...getRequestMeta(req),
        error: error?.message || error,
        rawBody: truncateLogText(rawBody, 1200)
      });
      const errorPayload = buildErrorPayload(
        'Некорректные данные',
        error?.message || 'JSON не распознан.',
        {
          requestId: req.requestId,
          url: req.url,
          contentType: req.headers['content-type'],
          contentLength: req.headers['content-length'],
          rawBodySize: rawBody ? rawBody.length : 0,
          hint: 'Проверьте, что запрос содержит валидный JSON.',
          expectedPayload: buildCreateOrgExpectedPayload()
        }
      );
      logApiResponse('create_org', 400, errorPayload);
      sendJson(req, res, 400, errorPayload);
      return;
    }
    try {
      const rawOrganizationName =
        payload.organizationName ?? payload.organization ?? payload.organizations;
      const organizationName =
        typeof rawOrganizationName === 'string' ? rawOrganizationName.trim() : '';
      const energyFullName = String(payload.energyFullName || '').trim();
      if (!payload.organizationName && (payload.organization || payload.organizations)) {
        logAction('create_org_payload_alias', {
          ...getRequestMeta(req),
          organizationName,
          payload
        });
      }
      logAction('create_org_payload_received', {
        ...getRequestMeta(req),
        organizationName,
        energyFullName,
        payloadKeys: Object.keys(payload || {}),
        rawBodySize: rawBody ? rawBody.length : 0
      });
      if (!organizationName || !energyFullName) {
        logAction('create_org_missing_fields', {
          ...getRequestMeta(req),
          organizationName,
          energyFullName,
          payload
        });
        const errorPayload = buildErrorPayload(
          'Заполните название организации и ФИО энергетика.',
          'Одно или несколько полей пустые.',
          {
            requestId: req.requestId,
            organizationName,
            energyFullName,
            url: req.url,
            expectedPayload: buildCreateOrgExpectedPayload()
          }
        );
        logApiResponse('create_org', 400, errorPayload);
        sendJson(req, res, 400, errorPayload);
        return;
      }
      const organizations = getOrganizationsList();
      if (organizations.includes(organizationName)) {
        logAction('create_org_duplicate', {
          ...getRequestMeta(req),
          organizationName,
          energyFullName
        });
        const errorPayload = buildErrorPayload(
          'Такая организация уже существует.',
          'Попробуйте другое название.',
          {
            requestId: req.requestId,
            organizationName
          }
        );
        logApiResponse('create_org', 409, errorPayload);
        sendJson(req, res, 409, errorPayload);
        return;
      }

      logAction('create_org_start', {
        ...getRequestMeta(req),
        organizationName,
        energyFullName,
        payload,
        storageSnapshot: buildCreateOrgDebugSnapshot(organizationName)
      });

      try {
        logAction('create_org_step_start', {
          ...getRequestMeta(req),
          step: '1.1',
          file: 'access.json',
          organizationName,
          energyFullName,
          fileStatus: buildFileSystemStatus(ACCESS_FILE)
        });
        const seedResult = seedOrganizationAccess({ organizationName, energyFullName });
        logAction('create_org_step_snapshot', {
          ...getRequestMeta(req),
          step: '1.1',
          organizationName,
          existingMembersCount: seedResult.membersBefore
        });
        logAction('create_org_step_success', {
          ...getRequestMeta(req),
          step: '1.1',
          file: 'access.json',
          organizationName,
          membersCount: seedResult.membersAfter,
          fileStatus: buildFileSystemStatus(ACCESS_FILE)
        });
      } catch (error) {
        logAction('create_org_step_error', {
          ...getRequestMeta(req),
          step: '1.1',
          file: 'access.json',
          organizationName,
          message: error?.message || error,
          stack: error?.stack,
          fileStatus: buildFileSystemStatus(ACCESS_FILE)
        });
        throw buildStepError({
          message: 'Не удалось создать организацию.',
          details: `Шаг 1.1 (access.json: организация и первый пользователь) завершился ошибкой: ${
            error?.message || error
          }`,
          step: '1.1',
          code: 'create_org_access',
          path: 'access.json',
          systemCode: error?.code,
          debug: buildCreateOrgDebugSnapshot(organizationName)
        });
      }

      try {
        logAction('create_org_step_start', {
          ...getRequestMeta(req),
          step: '1.2',
          file: 'data/organizations/organizations.json',
          organizationName,
          fileStatus: buildFileSystemStatus(ORGANIZATIONS_FILE),
          legacyFileStatus: buildFileSystemStatus(LEGACY_ORGANIZATIONS_FILE)
        });
        const nextOrganizations = [...organizations, organizationName];
        saveOrganizationsList(nextOrganizations);
        logAction('create_org_step_success', {
          ...getRequestMeta(req),
          step: '1.2',
          file: 'data/organizations/organizations.json',
          organizationName,
          totalOrganizations: nextOrganizations.length,
          previousOrganizations: organizations.length,
          fileStatus: buildFileSystemStatus(ORGANIZATIONS_FILE),
          legacyFileStatus: buildFileSystemStatus(LEGACY_ORGANIZATIONS_FILE)
        });
      } catch (error) {
        logAction('create_org_step_error', {
          ...getRequestMeta(req),
          step: '1.2',
          file: 'data/organizations/organizations.json',
          organizationName,
          message: error?.message || error,
          stack: error?.stack,
          fileStatus: buildFileSystemStatus(ORGANIZATIONS_FILE),
          legacyFileStatus: buildFileSystemStatus(LEGACY_ORGANIZATIONS_FILE)
        });
        throw buildStepError({
          message: 'Не удалось создать организацию.',
          details: `Шаг 1.2 (data/organizations/organizations.json: список организаций) завершился ошибкой: ${
            error?.message || error
          }`,
          step: '1.2',
          code: 'create_org_list',
          path: 'data/organizations/organizations.json',
          systemCode: error?.code,
          debug: buildCreateOrgDebugSnapshot(organizationName)
        });
      }

      try {
        const organizationPath = buildOrganizationPath(organizationName);
        logAction('create_org_step_start', {
          ...getRequestMeta(req),
          step: '1.3',
          path: `data/organizations/${sanitizeOrganizationName(organizationName)}`,
          organizationName,
          folderStatus: buildFileSystemStatus(organizationPath)
        });
        ensureOrganizationAssets(organizationName);
        const filesStatus = ORGANIZATION_DATABASE_FILES.map((fileName) => ({
          name: fileName,
          exists: fs.existsSync(path.join(organizationPath, fileName))
        }));
        const foldersStatus = ORGANIZATION_MEDIA_FOLDERS.map((folder) => ({
          name: folder,
          exists: fs.existsSync(path.join(organizationPath, folder))
        }));
        logAction('create_org_step_success', {
          ...getRequestMeta(req),
          step: '1.3',
          path: `data/organizations/${sanitizeOrganizationName(organizationName)}`,
          organizationName,
          files: ORGANIZATION_DATABASE_FILES,
          folders: ORGANIZATION_MEDIA_FOLDERS,
          folderStatus: buildFileSystemStatus(organizationPath),
          filesStatus,
          foldersStatus
        });
      } catch (error) {
        logAction('create_org_step_error', {
          ...getRequestMeta(req),
          step: '1.3',
          path: `data/organizations/${sanitizeOrganizationName(organizationName)}`,
          organizationName,
          message: error?.message || error,
          stack: error?.stack,
          folderStatus: buildFileSystemStatus(
            buildOrganizationPath(organizationName)
          )
        });
        throw buildStepError({
          message: 'Не удалось создать организацию.',
          details: `Шаг 1.3 (data/organizations/<имя>: папка и файлы) завершился ошибкой: ${
            error?.message || error
          }`,
          step: '1.3',
          code: 'create_org_assets',
          path: `data/organizations/${sanitizeOrganizationName(organizationName)}`,
          systemCode: error?.code,
          debug: buildCreateOrgDebugSnapshot(organizationName)
        });
      }

      let inviteId;
      try {
        logAction('create_org_step_start', {
          ...getRequestMeta(req),
          step: '1.4',
          file: 'data/invites.json',
          organizationName,
          fileStatus: buildFileSystemStatus(INVITES_FILE)
        });
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
        logAction('create_org_step_success', {
          ...getRequestMeta(req),
          step: '1.4',
          file: 'data/invites.json',
          inviteId,
          organizationName,
          fileStatus: buildFileSystemStatus(INVITES_FILE)
        });
      } catch (error) {
        logAction('create_org_step_error', {
          ...getRequestMeta(req),
          step: '1.4',
          file: 'data/invites.json',
          organizationName,
          message: error?.message || error,
          stack: error?.stack,
          fileStatus: buildFileSystemStatus(INVITES_FILE)
        });
        throw buildStepError({
          message: 'Не удалось создать организацию.',
          details: `Шаг 1.4 (data/invites.json: сохранение приглашения) завершился ошибкой: ${
            error?.message || error
          }`,
          step: '1.4',
          code: 'create_org_invite',
          path: 'data/invites.json',
          systemCode: error?.code,
          debug: buildCreateOrgDebugSnapshot(organizationName)
        });
      }

      const inviteLink = buildInviteLink(req, inviteId);
      logAction('create_org_success', {
        ...getRequestMeta(req),
        organizationName,
        energyFullName,
        inviteId,
        inviteLink
      });
      logApiResponse('create_org', 200, { inviteId, inviteLink });
      sendJson(req, res, 200, { inviteId, inviteLink });
    } catch (createError) {
      const basePayload =
        createError?.payload ||
        buildErrorPayload(
          'Ошибка сервиса создания организации.',
          createError?.message || 'Неизвестная ошибка.',
          {
            organizationName,
            energyFullName,
            url: req.url
          }
        );
      const errorPayload = {
        ...basePayload,
        requestId: req.requestId,
        debug: basePayload?.debug || buildCreateOrgDebugSnapshot(organizationName)
      };
      logAction('create_org_failed', {
        ...getRequestMeta(req),
        message: createError?.message || createError,
        stack: createError?.stack,
        payload: createError?.payload
      });
      logApiResponse('create_org', 500, errorPayload);
      sendJson(req, res, 500, errorPayload);
    }
  });
};

const handleSeedAccessOrganization = (req, res) => {
  parseJsonBody(req, (error, payload, rawBody) => {
    if (error) {
      logAction('seed_access_invalid_payload', {
        ...getRequestMeta(req),
        error: error?.message || error,
        rawBody: truncateLogText(rawBody, 1200)
      });
      const errorPayload = buildErrorPayload(
        'Некорректные данные',
        error?.message || 'JSON не распознан.',
        {
          requestId: req.requestId,
          url: req.url,
          contentType: req.headers['content-type'],
          contentLength: req.headers['content-length'],
          rawBodySize: rawBody ? rawBody.length : 0,
          hint: 'Проверьте, что запрос содержит валидный JSON.',
          expectedPayload: buildCreateOrgExpectedPayload()
        }
      );
      logApiResponse('seed_access', 400, errorPayload);
      sendJson(req, res, 400, errorPayload);
      return;
    }
    try {
      const rawOrganizationName =
        payload.organizationName ?? payload.organization ?? payload.organizations;
      const organizationName =
        typeof rawOrganizationName === 'string' ? rawOrganizationName.trim() : '';
      const energyFullName = String(payload.energyFullName || '').trim();
      logAction('seed_access_payload_received', {
        ...getRequestMeta(req),
        organizationName,
        energyFullName,
        payloadKeys: Object.keys(payload || {}),
        rawBodySize: rawBody ? rawBody.length : 0
      });
      if (!organizationName || !energyFullName) {
        logAction('seed_access_missing_fields', {
          ...getRequestMeta(req),
          organizationName,
          energyFullName,
          payload
        });
        const errorPayload = buildErrorPayload(
          'Заполните название организации и ФИО энергетика.',
          'Одно или несколько полей пустые.',
          {
            requestId: req.requestId,
            organizationName,
            energyFullName,
            url: req.url,
            expectedPayload: buildCreateOrgExpectedPayload()
          }
        );
        logApiResponse('seed_access', 400, errorPayload);
        sendJson(req, res, 400, errorPayload);
        return;
      }
      logAction('seed_access_start', {
        ...getRequestMeta(req),
        organizationName,
        energyFullName,
        fileStatus: buildFileSystemStatus(ACCESS_FILE)
      });
      const seedResult = seedOrganizationAccess({ organizationName, energyFullName });
      logAction('seed_access_success', {
        ...getRequestMeta(req),
        organizationName,
        membersBefore: seedResult.membersBefore,
        membersAfter: seedResult.membersAfter,
        fileStatus: buildFileSystemStatus(ACCESS_FILE)
      });
      const responsePayload = {
        ok: true,
        organizationName,
        membersCount: seedResult.membersAfter
      };
      logApiResponse('seed_access', 200, responsePayload);
      sendJson(req, res, 200, responsePayload);
    } catch (seedError) {
      logAction('seed_access_failed', {
        ...getRequestMeta(req),
        message: seedError?.message || seedError,
        stack: seedError?.stack
      });
      const errorPayload = buildErrorPayload(
        'Не удалось обновить access.json.',
        seedError?.message || 'Неизвестная ошибка.',
        {
          requestId: req.requestId,
          url: req.url
        }
      );
      logApiResponse('seed_access', 500, errorPayload);
      sendJson(req, res, 500, errorPayload);
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
      logApiResponse('accept_invite', 400, { message: 'Некорректные данные' });
      send(req, res, 400, 'Некорректные данные');
      return;
    }
    const inviteId = String(payload.inviteId || '').trim();
    const userId = normalizeIdValue(payload.userId);
    if (!inviteId || userId === undefined || userId === null || userId === '') {
      logAction('accept_invite_missing_fields', { inviteId, userId });
      logApiResponse('accept_invite', 400, {
        message: 'Не хватает данных для подтверждения приглашения.'
      });
      send(req, res, 400, 'Не хватает данных для подтверждения приглашения.');
      return;
    }
    const invitesData = readJsonFile(INVITES_FILE, { invites: [] });
    const invites = Array.isArray(invitesData.invites) ? invitesData.invites : [];
    const inviteIndex = invites.findIndex((invite) => invite.id === inviteId);
    if (inviteIndex === -1) {
      logAction('accept_invite_not_found', { inviteId, userId });
      logApiResponse('accept_invite', 404, { message: 'Приглашение не найдено.' });
      send(req, res, 404, 'Приглашение не найдено.');
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
    logApiResponse('accept_invite', 200, {
      organizationName: invite.organizationName,
      fullName: invite.energyFullName
    });
    send(
      req,
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
      logApiResponse('accept_direct', 400, { message: 'Некорректные данные' });
      send(req, res, 400, 'Некорректные данные');
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
      logApiResponse('accept_direct', 400, {
        message: 'Не хватает данных для подтверждения приглашения.'
      });
      send(req, res, 400, 'Не хватает данных для подтверждения приглашения.');
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
    logApiResponse('accept_direct', 200, {
      organizationName,
      fullName: energyFullName
    });
    send(
      req,
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
    const rawLines = trimmed
      ? body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      : [];
    const lines = rawLines.length ? rawLines : ['[empty]'];
    logAction('client_log_received', {
      ...getRequestMeta(req),
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'],
      lineCount: lines.length,
      payload: truncateLogText(lines[0] || '[empty]', 2000)
    });
    let index = 0;
    const writeNext = () => {
      if (index >= lines.length) {
        send(req, res, 204, '');
        return;
      }
      const logLinePayload = truncateLogText(lines[index], 2000);
      const logLine = `${formatTimestamp()} CLIENT_LOG ${req.requestId || 'unknown'} ${getClientIp(
        req
      )} ${truncateLogText(req.headers['user-agent'] || '', 200)} ${logLinePayload}`;
      appendLogLine(logLine, (error) => {
        if (error) {
          logAction('client_log_write_failed', {
            ...getRequestMeta(req),
            error: error?.message || error
          });
          send(req, res, 500, 'Ошибка записи лога');
          return;
        }
        index += 1;
        writeNext();
      });
    };
    writeNext();
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
  req.requestId = buildRequestId();
  logRequestStart(req);
  attachRequestBodyLogger(req);
  const responseCapture = {
    size: 0,
    text: '',
    truncated: false
  };
  const MAX_RESPONSE_LOG_BYTES = 4000;
  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);

  const shouldCaptureResponse = () => {
    const contentType = res.getHeader('Content-Type');
    if (!contentType) {
      return true;
    }
    const type = String(contentType).toLowerCase();
    return (
      type.startsWith('text/') ||
      type.includes('application/json') ||
      type.includes('application/javascript') ||
      type.includes('application/xml') ||
      type.includes('application/x-www-form-urlencoded')
    );
  };

  const captureResponseChunk = (chunk, encoding) => {
    if (!chunk || responseCapture.truncated || !shouldCaptureResponse()) {
      return;
    }
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
    const remaining = MAX_RESPONSE_LOG_BYTES - responseCapture.size;
    if (remaining <= 0) {
      responseCapture.truncated = true;
      return;
    }
    const slice = buffer.slice(0, remaining);
    responseCapture.size += slice.length;
    responseCapture.text += slice.toString('utf8');
    if (responseCapture.size >= MAX_RESPONSE_LOG_BYTES) {
      responseCapture.truncated = true;
    }
  };

  res.write = (chunk, encoding, callback) => {
    captureResponseChunk(chunk, encoding);
    return originalWrite(chunk, encoding, callback);
  };

  res.end = (chunk, encoding, callback) => {
    captureResponseChunk(chunk, encoding);
    return originalEnd(chunk, encoding, callback);
  };

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const url = req.url || '-';
    const method = req.method || '-';
    const status = res.statusCode;
    const logLine = `${formatTimestamp()} REQUEST ${req.requestId} ${method} ${url} ${status} ${durationMs}ms`;
    appendLogLine(logLine, (error) => {
      if (error) {
        console.error('Ошибка записи лога:', error);
      }
    });
    logAction('http_response', {
      requestId: req.requestId,
      method,
      url,
      statusCode: status,
      durationMs,
      headers: res.getHeaders(),
      payload: summarizeLogPayload(
        responseCapture.truncated
          ? `${responseCapture.text}...[truncated]`
          : responseCapture.text
      )
    });
  });

  if (!req.url) {
    send(req, res, 400, 'Некорректный запрос');
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
    (normalizedPath === '/create-organization' ||
      normalizedPath === '/api/create-organization' ||
      normalizedPath === '/create-organizations' ||
      normalizedPath === '/api/create-organizations')
  ) {
    handleCreateOrganization(req, res);
    return;
  }

  if (
    req.method === 'POST' &&
    (normalizedPath === '/create-organization-step-1' ||
      normalizedPath === '/api/create-organization-step-1')
  ) {
    handleSeedAccessOrganization(req, res);
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

  if (req.method === 'POST') {
    logAction('api_route_missing', {
      ...getRequestMeta(req),
      normalizedPath,
      host: req.headers.host,
      forwarded: {
        proto: req.headers['x-forwarded-proto'],
        host: req.headers['x-forwarded-host'],
        for: req.headers['x-forwarded-for']
      },
      headers: {
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length'],
        referer: req.headers.referer,
        origin: req.headers.origin,
        'user-agent': req.headers['user-agent']
      }
    });
    const errorPayload = buildErrorPayload(
      'Маршрут не найден.',
      'Проверьте путь и настройки nginx/proxy.',
      {
        requestId: req.requestId,
        url: req.url,
        normalizedPath,
        method: req.method,
        host: req.headers.host,
        forwarded: {
          proto: req.headers['x-forwarded-proto'],
          host: req.headers['x-forwarded-host'],
          for: req.headers['x-forwarded-for']
        },
        knownCreateOrganizationRoutes: CREATE_ORG_ENDPOINTS,
        hint:
          'Если используется nginx, проверьте, что location проксирует запросы на backend и не удаляет /api.'
      }
    );
    logApiResponse('api_route_missing', 404, errorPayload);
    sendJson(req, res, 404, errorPayload);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    logAction('method_not_allowed', {
      ...getRequestMeta(req),
      normalizedPath
    });
    const errorPayload = buildErrorPayload(
      'Метод не поддерживается.',
      'Используйте корректный HTTP-метод.',
      {
        requestId: req.requestId,
        url: req.url,
        normalizedPath
      }
    );
    logApiResponse('method_not_allowed', 405, errorPayload);
    sendJson(req, res, 405, errorPayload);
    return;
  }

  const filePath = resolveFilePath(req.url);
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      logAction('static_file_missing', {
        ...getRequestMeta(req),
        path: filePath,
        error: error?.message || error
      });
      send(req, res, 404, 'Файл не найден');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    const stream = fs.createReadStream(filePath);
    stream.on('error', (streamError) => {
      logAction('static_file_error', {
        ...getRequestMeta(req),
        path: filePath,
        error: streamError?.message || streamError
      });
      if (!res.headersSent) {
        send(req, res, 500, 'Ошибка чтения файла');
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`AllTrack доступен на http://localhost:${PORT}`);
});
