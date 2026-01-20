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
const superAdminStatEl = document.querySelector("[data-super-admin-stat]");
const energyPendingStatEl = document.querySelector("[data-energy-pending-stat]");
const energyPendingIconEl = document.querySelector("[data-energy-pending-icon]");
const energyPendingTextEl = document.querySelector("[data-energy-pending-text]");
const energyPendingCountEl = document.querySelector("[data-energy-pending-count]");
const orgFilePath = "./organizations.json";
const usersFilePath = "./users.json";
const pendingRegistrationsFilePath = "./pending-registrations.json";
const saveEndpoint = "./save.php";
const fallbackBotToken = "8549452123:AAGxveuJSVf-xpNHQYTDKDmuMmHjGRVeDj0";
const botUsernameCacheKey = "alltrack-bot-username";

function normalizeTelegramId(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return String(Math.trunc(value));
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d-]/g, "");
  return cleaned || null;
}

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

function getInitDataFromUrl() {
  const url = new URL(window.location.href);
  const queryData = url.searchParams.get("tgWebAppData");
  if (queryData) return queryData;
  if (!url.hash) return null;
  const rawHash = url.hash.replace(/^#/, "");
  const hashParams = new URLSearchParams(rawHash);
  const hashData = hashParams.get("tgWebAppData");
  if (hashData) return hashData;
  try {
    const decodedHash = decodeURIComponent(rawHash);
    if (decodedHash !== rawHash) {
      const decodedParams = new URLSearchParams(decodedHash);
      return decodedParams.get("tgWebAppData");
    }
  } catch (error) {
    console.warn("Не удалось декодировать параметры Telegram из hash.", error);
  }
  return null;
}

function getTelegramId() {
  const webApp = window.Telegram?.WebApp;
  const unsafeId = webApp?.initDataUnsafe?.user?.id ?? null;
  const initDataUser = parseInitDataUser(webApp?.initData);
  const urlInitDataUser = parseInitDataUser(getInitDataFromUrl());
  const rawId = unsafeId ?? initDataUser?.id ?? urlInitDataUser?.id ?? null;
  return normalizeTelegramId(rawId);
}

async function waitForTelegramId({ timeoutMs = 6000, intervalMs = 200 } = {}) {
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

function getInitials(fullName = "") {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
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

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
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

async function saveJson(path, data) {
  return saveEntries([{ path, data }]);
}

function normalizeEnergyLayout(layout, actions) {
  const actionIds = new Set(actions.map((action) => action.id));
  const normalized = [];
  const usedIds = new Set();
  let hasToggle = false;

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

  if (!hasToggle) {
    normalized.push({ type: "toggle" });
  }

  return normalized;
}

function updateEnergyPendingStat(count = 0) {
  if (!energyPendingStatEl) return;
  const pendingCount = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0;
  const isWaiting = pendingCount > 0;

  energyPendingStatEl.classList.toggle("is-waiting", isWaiting);
  energyPendingStatEl.setAttribute(
    "aria-label",
    isWaiting
      ? `Ожидается ${pendingCount} ответов по перемещениям`
      : "Ответов по перемещениям не требуется"
  );

  if (energyPendingIconEl) {
    energyPendingIconEl.textContent = isWaiting ? "⏳" : "✅";
  }
  if (energyPendingTextEl) {
    energyPendingTextEl.textContent = isWaiting
      ? `Нужно ответить: ${pendingCount}`
      : "Ответов не ждут";
  }
  if (energyPendingCountEl) {
    energyPendingCountEl.textContent = String(pendingCount);
    energyPendingCountEl.classList.toggle("is-hidden", !isWaiting);
  }
}

function createEnergyActionCard(action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "action-card";
  button.dataset.energyItem = "";
  button.dataset.energyItemType = "action";
  button.dataset.actionId = action.id;
  button.innerHTML = `
    <span class="action-icon">${action.icon}</span>
    <div class="action-title">${action.title}</div>
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
    <div class="action-title">
      <div class="group-title">${group.name}</div>
      <div class="group-subtitle">${group.items.length} блока</div>
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
  button.dataset.energyGroupToggle = "";
  button.setAttribute("aria-label", "Группировать");
  button.setAttribute("aria-pressed", "false");
  button.innerHTML = `
    <span class="action-icon">🧩</span>
    <div class="action-title">Группировка</div>
  `;
  return button;
}

function buildEnergyLayoutFromDom(gridEl) {
  const layout = [];
  const items = Array.from(gridEl.querySelectorAll("[data-energy-item]"));
  items.forEach((item) => {
    const type = item.dataset.energyItemType;
    if (type === "action") {
      const actionId = item.dataset.actionId;
      if (actionId) layout.push({ type: "action", id: actionId });
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

async function resolveOrganizationShortName(orgName) {
  if (!orgName) return "Организация";
  const orgData = await loadJson(orgFilePath);
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
  return match?.short_name ?? orgName;
}

function sanitizeOrganizationFolderName(name = "") {
  const trimmed = String(name).trim();
  const cleaned = trimmed.replace(/[\/\\:*?"<>|]+/g, "_");
  return cleaned.replace(/\s+/g, " ").trim();
}

async function setupEnergyDashboard(user) {
  const gridEl = contentEl.querySelector("[data-energy-grid]");
  if (!gridEl) return;

  const groupPanel = contentEl.querySelector("[data-energy-group-panel]");
  const createGroupButton = contentEl.querySelector("[data-energy-create-group]");
  const cancelGroupButton = contentEl.querySelector("[data-energy-cancel-group]");
  const selectedCountEl = contentEl.querySelector("[data-energy-selected-count]");

  const actionsMap = new Map(energyActions.map((action) => [action.id, action]));
  const orgShortName = await resolveOrganizationShortName(user.organization);
  const orgFolderName =
    sanitizeOrganizationFolderName(orgShortName) || "Организация";
  const settingsPath = `./${orgFolderName}/Настройки.json`;
  const userKey =
    user.telegram_id && Number(user.telegram_id) > 0
      ? `tg-${user.telegram_id}`
      : [
          user.full_name ?? "user",
          user.organization ?? "",
          user.role ?? "",
        ].join("|");

  let settingsData = await loadJson(settingsPath).catch(() => ({ users: {} }));
  if (!settingsData || typeof settingsData !== "object") {
    settingsData = { users: {} };
  }
  if (!settingsData.users || typeof settingsData.users !== "object") {
    settingsData.users = {};
  }

  const savedLayout = settingsData.users?.[userKey]?.energy?.layout;
  const pendingMoves = settingsData.users?.[userKey]?.energy?.pendingMoves ?? 0;
  const normalizedLayout = normalizeEnergyLayout(savedLayout, energyActions);

  gridEl.innerHTML = "";
  normalizedLayout.forEach((item) => {
    if (item.type === "action") {
      const action = actionsMap.get(item.id);
      if (action) {
        gridEl.appendChild(createEnergyActionCard(action));
      }
    } else if (item.type === "group") {
      gridEl.appendChild(createEnergyGroupCard(item, actionsMap));
    } else if (item.type === "toggle") {
      gridEl.appendChild(createEnergyGroupToggleCard());
    }
  });

  updateEnergyPendingStat(pendingMoves);

  const groupToggle = contentEl.querySelector("[data-energy-group-toggle]");
  let isGrouping = false;
  let blockClick = false;
  const selectedIds = new Set();
  let saveTimer = null;

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

  const saveLayout = async () => {
    const layout = buildEnergyLayoutFromDom(gridEl);
    const userSettings = settingsData.users?.[userKey] ?? {};
    settingsData.users[userKey] = {
      ...userSettings,
      energy: {
        ...(userSettings.energy ?? {}),
        layout,
      },
    };
    await saveJson(settingsPath, settingsData);
  };

  const scheduleLayoutSave = () => {
    if (saveTimer) {
      window.clearTimeout(saveTimer);
    }
    saveTimer = window.setTimeout(() => {
      saveLayout().catch((error) => {
        console.warn("Не удалось сохранить порядок плашек.", error);
      });
    }, 350);
  };

  if (groupToggle) {
    groupToggle.addEventListener("click", () => {
      setGroupingState(!isGrouping);
    });
  }

  if (cancelGroupButton) {
    cancelGroupButton.addEventListener("click", () => {
      setGroupingState(false);
    });
  }

  if (createGroupButton) {
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

  gridEl.addEventListener("click", (event) => {
    if (blockClick || !isGrouping) return;
    const card = event.target.closest("[data-energy-item]");
    if (!card || card.dataset.energyItemType !== "action") return;
    const actionId = card.dataset.actionId;
    if (!actionId) return;
    card.classList.toggle("is-selected");
    if (card.classList.contains("is-selected")) {
      selectedIds.add(actionId);
    } else {
      selectedIds.delete(actionId);
    }
    updateGroupPanel();
  });

  const dragState = {
    item: null,
    pointerId: null,
    holdTimer: null,
    isDragging: false,
    pointerStartX: 0,
    pointerStartY: 0,
    startCenterX: 0,
    startCenterY: 0,
    lastPointerX: 0,
    lastPointerY: 0,
    rafId: null,
  };
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
  };

  const updateDragTransform = (clientX, clientY) => {
    if (!dragState.item) return;
    const deltaX = clientX - dragState.startCenterX;
    const deltaY = clientY - dragState.startCenterY;
    dragState.item.style.setProperty("--drag-x", `${deltaX}px`);
    dragState.item.style.setProperty("--drag-y", `${deltaY}px`);
  };

  gridEl.addEventListener("pointerdown", (event) => {
    if (isGrouping) return;
    const card = event.target.closest("[data-energy-item]");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    dragState.item = card;
    dragState.pointerId = event.pointerId;
    dragState.pointerStartX = event.clientX;
    dragState.pointerStartY = event.clientY;
    dragState.lastPointerX = event.clientX;
    dragState.lastPointerY = event.clientY;
    dragState.startCenterX = rect.left + rect.width / 2;
    dragState.startCenterY = rect.top + rect.height / 2;
    dragState.holdTimer = window.setTimeout(() => {
      if (!dragState.item) return;
      dragState.isDragging = true;
      dragState.item.classList.add("is-dragging");
      gridEl.classList.add("is-dragging");
      card.setPointerCapture(dragState.pointerId);
      updateDragTransform(dragState.lastPointerX, dragState.lastPointerY);
    }, 200);
  });

  gridEl.addEventListener("pointermove", (event) => {
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
    if (dragState.rafId) {
      cancelAnimationFrame(dragState.rafId);
    }
    dragState.rafId = requestAnimationFrame(() => {
      updateDragTransform(event.clientX, event.clientY);
    });
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
  });

  gridEl.addEventListener("pointerup", () => {
    clearDrag();
  });

  gridEl.addEventListener("pointercancel", () => {
    clearDrag();
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

  const updateStats = async () => {
    try {
      const [orgData, usersData] = await Promise.all([
        loadJson(orgFilePath),
        loadJson(usersFilePath),
      ]);
      if (orgCountEl) orgCountEl.textContent = orgData.organizations?.length ?? 0;
      if (userCountEl) userCountEl.textContent = usersData.users?.length ?? 0;
    } catch (error) {
      console.error(error);
    }
  };

  openAddOrgButton?.addEventListener("click", showForm);
  backButton?.addEventListener("click", showDashboard);
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

  updateStats();
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
  const telegramId = await waitForTelegramId();
  if (!telegramId) {
    renderError("Telegram ID не получен. Откройте приложение из Telegram.");
    if (userNameEl) userNameEl.textContent = "Гость";
    if (userOrgEl) userOrgEl.textContent = "Откройте приложение из Telegram";
    if (userInitialsEl) userInitialsEl.textContent = "??";
    return;
  }

  try {
    const registrationToken = getRegistrationToken();
    let user = null;
    let userLabel = "";
    const telegramIdKey = normalizeTelegramId(telegramId);

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
      return;
    }

    const renderRole = roleMap.get(user.role);
    if (!renderRole) {
      renderError("Для вашей роли ещё не создана страница.");
      if (userNameEl) userNameEl.textContent = formatShortName(user.full_name);
      if (userOrgEl) userOrgEl.textContent = user.organization ?? "Организация";
      return;
    }

    const userName = formatShortName(user.full_name);
    if (!userLabel) {
      userLabel = `Вы вошли как <strong>${userName}</strong>`;
    }

    contentEl.innerHTML = renderRole(userLabel);
    if (userNameEl) userNameEl.textContent = userName;
    if (userOrgEl) userOrgEl.textContent = user.organization ?? "Организация";
    if (userInitialsEl) userInitialsEl.textContent = getInitials(user.full_name ?? "");
    if (appUserEl) {
      appUserEl.classList.toggle("is-hidden", user.role === superAdminRole);
    }
    if (superAdminStatEl) {
      superAdminStatEl.classList.toggle("is-hidden", user.role !== superAdminRole);
    }
    if (energyPendingStatEl) {
      energyPendingStatEl.classList.toggle("is-hidden", user.role !== energyRole);
    }
    if (user.role === superAdminRole) {
      setupSuperAdmin();
    }
    if (user.role === energyRole) {
      await setupEnergyDashboard(user);
    }
  } catch (error) {
    renderError("Возникла ошибка при загрузке данных.");
    if (userNameEl) userNameEl.textContent = "Гость";
    if (userOrgEl) userOrgEl.textContent = "Проверьте соединение";
    if (userInitialsEl) userInitialsEl.textContent = "??";
    console.error(error);
  }
}

if (window.Telegram?.WebApp) {
  Telegram.WebApp.ready();
  Telegram.WebApp.expand();
  Telegram.WebApp.setHeaderColor("#f5f7ff");
  Telegram.WebApp.setBackgroundColor("#f5f7ff");
}

loadUser();
