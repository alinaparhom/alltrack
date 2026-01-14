const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const ORGANIZATIONS_FILE = path.join(DATA_DIR, 'organizations.json');
const ORGANIZATIONS_DIR = path.join(DATA_DIR, 'organizations');
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

const formatTimestamp = () => new Date().toISOString();

const appendLogLine = (line, callback) => {
  const text = line.endsWith('\n') ? line : `${line}\n`;
  fs.appendFile(LOG_FILE, text, 'utf8', callback);
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
  const nextContent = JSON.stringify(organizationsPayload, null, 2);
  const currentContent = fs.existsSync(ORGANIZATIONS_FILE)
    ? fs.readFileSync(ORGANIZATIONS_FILE, 'utf8')
    : '';

  if (currentContent.trim() !== nextContent.trim()) {
    fs.writeFileSync(ORGANIZATIONS_FILE, nextContent, 'utf8');
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
  const stored = readJsonFile(ORGANIZATIONS_FILE, { organizations: [] });
  const rawList = Array.isArray(stored)
    ? stored
    : Array.isArray(stored.organizations)
      ? stored.organizations
      : [];
  return rawList
    .map((entry) => (typeof entry === 'string' ? entry : entry?.name))
    .filter((entry) => typeof entry === 'string' && entry.trim().length);
};

const saveOrganizationsList = (list) => {
  writeJsonFile(ORGANIZATIONS_FILE, { organizations: list });
};

const generateInviteId = () =>
  `invite-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getBaseUrl = (req) => {
  const protoHeader = req.headers['x-forwarded-proto'];
  const protocol = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader || 'http';
  const host = req.headers.host || 'localhost';
  return `${protocol}://${host}`;
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
      send(res, 400, 'Некорректные данные');
      return;
    }
    const organizationName = String(payload.organizationName || '').trim();
    const energyFullName = String(payload.energyFullName || '').trim();
    if (!organizationName || !energyFullName) {
      send(res, 400, 'Заполните название организации и ФИО энергетика.');
      return;
    }
    const organizations = getOrganizationsList();
    if (organizations.includes(organizationName)) {
      send(res, 409, 'Такая организация уже существует.');
      return;
    }

    ensureOrganizationAssets(organizationName);
    const nextOrganizations = [...organizations, organizationName];
    saveOrganizationsList(nextOrganizations);

    const invitesData = readJsonFile(INVITES_FILE, { invites: [] });
    const invites = Array.isArray(invitesData.invites) ? invitesData.invites : [];
    const inviteId = generateInviteId();
    invites.push({
      id: inviteId,
      organizationName,
      energyFullName,
      createdAt: formatTimestamp()
    });
    writeJsonFile(INVITES_FILE, { invites });

    const inviteLink = `${getBaseUrl(req)}/?invite=${encodeURIComponent(inviteId)}`;
    send(res, 200, JSON.stringify({ inviteId, inviteLink }), {
      'Content-Type': 'application/json; charset=utf-8'
    });
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
      send(res, 400, 'Некорректные данные');
      return;
    }
    const inviteId = String(payload.inviteId || '').trim();
    const userId = normalizeIdValue(payload.userId);
    if (!inviteId || userId === undefined || userId === null || userId === '') {
      send(res, 400, 'Не хватает данных для подтверждения приглашения.');
      return;
    }
    const invitesData = readJsonFile(INVITES_FILE, { invites: [] });
    const invites = Array.isArray(invitesData.invites) ? invitesData.invites : [];
    const inviteIndex = invites.findIndex((invite) => invite.id === inviteId);
    if (inviteIndex === -1) {
      send(res, 404, 'Приглашение не найдено.');
      return;
    }
    const invite = invites[inviteIndex];
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
    if (!alreadyExists) {
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

  if (req.method === 'POST' && req.url.startsWith('/log')) {
    handleLog(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/create-organization') {
    handleCreateOrganization(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/accept-invite') {
    handleAcceptInvite(req, res);
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
