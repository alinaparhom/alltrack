      }
      quickAccessListEl.appendChild(createQuickAccessItem(action));
    });
    updateQuickAccessOffset();
    syncQuickAccessPendingIndicator();
    updateEnergyAwaitingReplyStat({ count: awaitingReplyMoves.length });
    updateToolsReplacementIndicator();
    updateMyToolsBadge(myToolsCount);
  };

  const scrollToQuickAccess = () => {
    if (!quickAccessEl) return;
    const appScrollEl = document.querySelector(".app-scroll");
    if (!appScrollEl || appScrollEl.scrollTop > 0) return;
    const quickAccessRect = quickAccessEl.getBoundingClientRect();
    const scrollRect = appScrollEl.getBoundingClientRect();
    const targetTop = quickAccessRect.top - scrollRect.top + appScrollEl.scrollTop - 8;
    appScrollEl.scrollTo({ top: Math.max(0, targetTop), behavior: "auto" });
  };

  const renderQuickAccessPicker = () => {
    if (!quickAccessPickerGridEl) return;
    quickAccessPickerGridEl.innerHTML = "";
    quickAccessOptions.forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quick-access-option";
      button.dataset.actionId = action.id;
      if (quickAccessDraft.includes(action.id)) {
        button.classList.add("is-selected");
      }
      button.innerHTML = `
        <span class="quick-access-option__icon" aria-hidden="true">${action.icon}</span>
        <span class="quick-access-option__title">${action.title}</span>
        <span class="quick-access-option__check" aria-hidden="true">✓</span>
      `;
      quickAccessPickerGridEl.appendChild(button);
    });
  };

  const setQuickAccessMessage = (message = "") => {
    if (!quickAccessMessageEl) return;
    quickAccessMessageEl.textContent = message;
  };

  const renderEnergyGrid = () => {
    const quickAccessSet = new Set(quickAccessIds);
    gridEl.innerHTML = "";
    layoutToRender.forEach((item) => {
      if (item.type === "pending") {
        if (quickAccessSet.has("pending")) return;
        if (!energyPendingStatEl) return;
        energyPendingStatEl.classList.add("pending-stat--grid", "action-card");
        energyPendingStatEl.dataset.energyItem = "";
        energyPendingStatEl.dataset.energyItemType = "pending";
        energyPendingStatEl.dataset.actionId = "pending";
        gridEl.appendChild(energyPendingStatEl);
      } else if (item.type === "awaiting-reply") {
        if (quickAccessSet.has("awaiting-reply")) return;
        gridEl.appendChild(createEnergyAwaitingReplyCard());
      } else if (item.type === "action") {
        if (quickAccessSet.has(item.id)) return;
        const action = actionsMap.get(item.id);
        if (action) {
          gridEl.appendChild(createEnergyActionCard(action));
        }
      } else if (item.type === "group") {
        const filteredItems = item.items.filter(
          (actionId) => !quickAccessSet.has(actionId)
        );
        if (!filteredItems.length) return;
        gridEl.appendChild(createEnergyGroupCard({ ...item, items: filteredItems }, actionsMap));
      } else if (item.type === "toggle" && groupingPreference === "free") {
        gridEl.appendChild(createEnergyGroupToggleCard());
      }
    });
  };

  renderEnergyGrid();
  renderQuickAccessList();
  updateToolsReplacementIndicator();
  updateMyToolsBadge(myToolsCount);
  requestAnimationFrame(() => {
    scrollToQuickAccess();
  });

  if (quickAccessEl && typeof ResizeObserver !== "undefined") {
    if (!quickAccessEl.dataset.offsetObserverAttached) {
      const quickAccessObserver = new ResizeObserver(() => {
        updateQuickAccessOffset();
      });
      quickAccessObserver.observe(quickAccessEl);
      quickAccessEl.dataset.offsetObserverAttached = "true";
    }
  } else {
    updateQuickAccessOffset();
  }

  updateEnergyPendingStat({ count: pendingMoves.length, available: pendingMoves });
  updateEnergyAwaitingReplyStat({ count: awaitingReplyMoves.length });
  fitActionTitleTexts(gridEl);
  if (typeof ResizeObserver !== "undefined" && !gridEl.dataset.fitObserverAttached) {
    const fitObserver = new ResizeObserver(() => {
      fitActionTitleTexts(gridEl);
    });
    fitObserver.observe(gridEl);
    gridEl.dataset.fitObserverAttached = "true";
  }

  const groupToggle = contentEl.querySelector("[data-energy-group-toggle]");
  const allowGrouping =
    !isStrictAccessDashboard && !isChiefEngineerDashboard && groupingPreference === "free";
  let isGrouping = false;
  let blockClick = false;
  const selectedIds = new Set();
  let saveChain = Promise.resolve();
  let saveRequested = false;

  if (!allowGrouping && groupPanel) {
    groupPanel.classList.add("is-hidden");
  }

  const objectsState = {
    items: [],
    filter: "",
    isSaving: false,
    toolsCount: new Map(),
    editingId: null,
  };
  const demandState = {
    items: [],
    filtered: [],
    objects: [],
    users: [],
    toolSuggestions: [],
    toolsCatalog: [],
    objectCoordinates: new Map(),
    editingId: null,
    isSaving: false,
    mapView: "list",
    filters: {
      search: "",
      object: [],
      user: [],
      status: ["open"],
      view: "all",
    },
    path: {
      activeId: null,
      editable: false,
    },
  };
  const usersState = {
    users: [],
  };
  const addToolState = {
    tools: [],
    responsibleOptions: [],
    selectedResponsible: "",
    objectOptions: [],
    groupOptions: [],
    organizationName: "",
    orgFolder: "",
    numberType: "",
    isSaving: false,
  };
  const toolsViewOptions = new Set(["large", "table", "map"]);
  const normalizeToolsView = (value) =>
    toolsViewOptions.has(value) ? value : "table";
  const savedToolsView = normalizeToolsView(
    settingsData.users?.[context.userKey]?.energy?.toolsView ?? "table"
  );
  const toolsState = {
    tools: [],
    filtered: [],
    objects: [],
    view: savedToolsView,
    previousView: savedToolsView,
    mode: "user",
    addPhotoSelectedTool: null,
    filters: {
      group: [],
      object: [],
      status: [],
      responsible: [],
      name: [],
      manufacturer: [],
      model: [],
      photo: [],
    },
    search: "",
    orgFolder: "",
    numberKey: "Номер",
    numberLabel: "Номер",
    isSelecting: false,
    selectedIds: new Set(),
    toolMap: new Map(),
    activeReplacementResponsible: "",
    statusStandalone: "",
    searchSortDirection: "desc",
    grouping: "none",
    repairBrokenOnly: false,
    repairInRepairOnly: false,
  };
  if (!objectTrackingEnabled) {
    toolsMapEl?.classList.add("is-hidden");
    toolsState.view = "table";
    toolsState.previousView = "table";
    contentEl
      .querySelectorAll('[data-tools-filter="object"], [data-add-photo-filter="object"], [data-no-photo-filter="object"], [data-breakdowns-filter="object"], [data-tools-grouping-option="object"], [data-no-photo-grouping-option="object"], [data-breakdowns-grouping-option="object"], [data-demand-filter-object]')
      .forEach((element) => {
        const formField = element.closest(".form-field, .demand-filter");
        (formField || element).classList.add("is-hidden");
      });
    demandObjectInput?.removeAttribute("required");
    demandMapToggleEl?.classList.add("is-hidden");
    demandMapEl?.classList.add("is-hidden");
    if (demandSearchInput) demandSearchInput.placeholder = "Поиск по названию, автору...";
    if (demandObjectInput) demandObjectInput.value = defaultObjectName;
    if (toolsState.grouping === "object") toolsState.grouping = "none";
  }


  let toolsTopZoneLock = null;
  let toolsControlsWrapRafId = 0;
  let toolsControlsWrapObserver = null;
  const pendingMovesState = {
    pendingItems: [],
    allMoves: [],
    toolMap: new Map(),
    fineConfig: {},
    targetFullName: "",
    replacementMode: false,
    allReceiversMode: false,
    vacationStartAt: "",
    isSaving: false,
    bulkConfirmAction: null,
  };
  const awaitingReplyState = {
    items: [],
    toolMap: new Map(),
    isSaving: false,
    cancelMoveIndex: null,
  };
  const pendingMovePhotoViewerState = {
    files: [],
    index: 0,
    touchStartX: null,
    pointers: new Map(),
    basePinchDistance: null,
    scale: 1,
  };
  const infoPendingSortModes = [
    { value: "old", label: "Сначала старые" },
    { value: "new", label: "Сначала новые" },
    { value: "receiver", label: "По принимающему" },
    { value: "sender", label: "По передающему" },
  ];
  const infoPendingState = {
    allItems: [],
    filteredItems: [],
    toolMap: new Map(),
    fineConfig: {},
    receiverOptions: [],
    senderOptions: [],
    pendingDateKeys: new Set(),
    filters: {
      sort: "receiver",
      search: "",
      receiver: "",
      sender: "",
      dateFrom: "",
      dateTo: "",
    },
    visibleMonthDate: new Date(),
    isFiltersOpen: false,
    isDatePickerOpen: false,
    isSortOpen: false,
  };
  const infoMovesHistoryGroupModes = [
    { value: "sender", label: "По передающему" },
    { value: "receiver", label: "По принимающему" },
    { value: "date", label: "По дате" },
  ];
  const infoMovesHistorySortModes = [
    { value: "date-desc", label: "Сначала новые" },
    { value: "date-asc", label: "Сначала старые" },
    { value: "number-asc", label: "Номер ↑" },
    { value: "accounting-asc", label: "Бух.номер ↑" },
    { value: "user-asc", label: "Пользователь А-Я" },
  ];
  const infoMovesHistoryState = {
    items: [],
    filters: { search: "", view: "number", group: "none", sort: "date-desc", answer: "all", dateFrom: "", dateTo: "" },
    isSortOpen: false,
    isGroupOpen: false,
    isFiltersOpen: false,
    isDatePickerOpen: false,
  };
  const infoByDatesState = {
    activeTab: "registrations",
    filters: {
      dateFrom: "",
      dateTo: "",
    },
    visibleMonthDate: new Date(),
    registrations: [],
    moves: [],
    writeoffs: [],
    isCalendarCollapsed: false,
  };
  const pendingMovePhotoViewerEl = document.createElement("div");
  pendingMovePhotoViewerEl.className = "settings-modal pending-photo-viewer is-hidden";
  pendingMovePhotoViewerEl.innerHTML = `
    <div class="settings-modal__backdrop" data-pending-photo-viewer-backdrop></div>
    <section class="settings-modal__panel pending-photo-viewer__panel" role="dialog" aria-modal="true" aria-label="Фото инструмента">
      <header class="settings-modal__header pending-photo-viewer__header">
        <div class="pending-photo-viewer__title-row">
          <h2>Фото инструмента</h2>
          <p data-pending-photo-viewer-counter>1 / 1</p>
        </div>
        <button
          type="button"
          class="button-icon tools-modal__close pending-photo-viewer__close"
          data-pending-photo-viewer-close
          aria-label="Закрыть фото инструмента"
        >
          <span class="button-icon-emoji" aria-hidden="true">✕</span>
        </button>
      </header>
      <div class="settings-modal__body pending-photo-viewer__body">
        <div class="pending-photo-viewer__image-wrap" data-pending-photo-viewer-image-wrap>
          <img class="pending-photo-viewer__image" data-pending-photo-viewer-image alt="Фото инструмента" />
        </div>
      </div>
    </section>
  `;
  document.body.appendChild(pendingMovePhotoViewerEl);
  const pendingPhotoViewerImageEl = pendingMovePhotoViewerEl.querySelector(
    "[data-pending-photo-viewer-image]"
  );
  const pendingPhotoViewerCounterEl = pendingMovePhotoViewerEl.querySelector(
    "[data-pending-photo-viewer-counter]"
  );
  const pendingPhotoViewerImageWrapEl = pendingMovePhotoViewerEl.querySelector(
    "[data-pending-photo-viewer-image-wrap]"
  );
  const pendingPhotoViewerCloseButton = pendingMovePhotoViewerEl.querySelector(
    "[data-pending-photo-viewer-close]"
  );
  const pendingPhotoViewerBackdropEl = pendingMovePhotoViewerEl.querySelector(
    "[data-pending-photo-viewer-backdrop]"
  );
  const toolsNotesModalEl = document.createElement("div");
  toolsNotesModalEl.className = "settings-modal tools-notes-modal is-hidden";
  toolsNotesModalEl.innerHTML = `
    <div class="settings-modal__backdrop" data-tools-notes-backdrop></div>
    <section class="settings-modal__panel tools-notes-modal__panel" role="dialog" aria-modal="true" aria-label="Заметки по инструменту">
      <header class="settings-modal__header tools-notes-modal__header">
        <div class="tools-notes-modal__title-wrap">
          <span class="tools-notes-modal__icon">
            <span class="tools-notes-modal__emoji" aria-hidden="true">📝</span>
            <span class="tools-notes-modal__badge" data-tools-notes-count aria-live="polite">0</span>
          </span>
          <div>
            <h2 data-tools-notes-title>Заметки</h2>
            <p data-tools-notes-subtitle>История заметок по инструменту</p>
          </div>
        </div>
        <button type="button" class="button-icon tools-modal__close tools-notes-modal__close" data-tools-notes-close aria-label="Закрыть заметки">
          <span class="button-icon-emoji" aria-hidden="true">✕</span>
        </button>
      </header>
      <div class="settings-modal__body tools-notes-modal__body">
        <div class="tools-notes-list" data-tools-notes-list></div>
        <form class="tools-notes-form" data-tools-notes-form>
          <label class="tools-notes-form__label" for="tools-notes-text">Новая заметка</label>
          <textarea id="tools-notes-text" class="form-input tools-notes-form__textarea" data-tools-notes-text rows="4" placeholder="Напишите, что важно помнить по этому инструменту..."></textarea>
          <div class="tools-notes-form__footer">
            <p class="tools-notes-message" data-tools-notes-message aria-live="polite"></p>
            <button type="submit" class="action-primary tools-notes-form__save" data-tools-notes-save>Добавить</button>
          </div>
        </form>
      </div>
    </section>
  `;
  document.body.appendChild(toolsNotesModalEl);
  const toolsNotesTitleEl = toolsNotesModalEl.querySelector("[data-tools-notes-title]");
  const toolsNotesSubtitleEl = toolsNotesModalEl.querySelector("[data-tools-notes-subtitle]");
  const toolsNotesListEl = toolsNotesModalEl.querySelector("[data-tools-notes-list]");
  const toolsNotesCountEl = toolsNotesModalEl.querySelector("[data-tools-notes-count]");
  const toolsNotesFormEl = toolsNotesModalEl.querySelector("[data-tools-notes-form]");
  const toolsNotesTextEl = toolsNotesModalEl.querySelector("[data-tools-notes-text]");
  const toolsNotesMessageEl = toolsNotesModalEl.querySelector("[data-tools-notes-message]");
  const toolsNotesSaveButton = toolsNotesModalEl.querySelector("[data-tools-notes-save]");

  const toolsCancelMoveState = {
    move: null,
    moveIndex: null,
    tool: null,
    movesPayload: null,
    isSaving: false,
  };
  const toolsWriteOffPendingConfirmState = {
    tool: null,
    isSaving: false,
    orgFolder: "",
    activeHistoryTab: "",
    photos: [],
    moves: [],
    breakdowns: [],
    repairs: [],
  };
  const toolsEditState = {
    tool: null,
    matchNumber: "",
    matchAccounting: "",
    orgFolder: "",
    groupOptions: [],
    isSaving: false,
    accountingOnly: false,
  };
  let toolsEditKitRowCounter = 0;
  const toolsInfoState = {
    tool: null,
    orgFolder: "",
    tab: "moves",
    historyOpened: false,
    historyLoaded: false,
    moves: [],
    breakdowns: [],
    repairs: [],
    isSavingNote: false,
    photos: [],
    kitExpanded: false,
  };
  const toolsNotesState = {
    tool: null,
    orgFolder: "",
    isSaving: false,
  };
  let pendingMovesDeclineResolver = null;
  const toolsMoveState = {
    responsibleOptions: [],
    objectOptions: [],
    responsibleRoles: new Map(),
    responsibleTelegramIds: new Map(),
    selectedResponsibleNames: new Set(),
  };
  const addPhotoState = {
    tools: [],
    filtered: [],
    filters: {
      group: "",
      status: "",
      object: "",
      manufacturer: "",
      model: "",
    },
    search: "",
    orgFolder: "",
    openedFromNoPhoto: false,
  };
  const noPhotoState = {
    tools: [],
    filtered: [],
    filters: {
      group: [],
      status: [],
      object: [],
      responsible: [],
      name: [],
      manufacturer: [],
      model: [],
      photo: [],
    },
    search: "",
    orgFolder: "",
    toolMap: new Map(),
    sortDirection: "desc",
    grouping: "none",
    controlsReady: false,
  };
  const removePhotoState = {
    tools: [],
    filtered: [],
    search: "",
    orgFolder: "",
    toolMap: new Map(),
    selectedTool: null,
    toolPhotos: [],
    selectedFiles: new Set(),
  };
  const writeOffState = {
    tools: [],
    filtered: [],
    search: "",
    orgFolder: "",
    selectedIds: new Set(),
    toolMap: new Map(),
    selectedTools: [],
    confirmTools: [],
    isSaving: false,
    filterWriteOffOnly: false,
  };
  const breakdownsState = {
    tools: [],
    filtered: [],
    search: "",
    orgFolder: "",
    selectedTool: null,
    statusTool: null,
    toolMap: new Map(),
    photos: [],
    filters: {
      group: [],
      object: [],
      status: [],
      responsible: [],
      name: [],
      manufacturer: [],
      model: [],
      photo: [],
    },
    brokenOnly: false,
    view: "table",
    sortDirection: "desc",
    grouping: "none",
    filtersOpened: false,
    isSaving: false,
    isStatusSaving: false,
  };
  if (!objectTrackingEnabled) {
    if (noPhotoState.grouping === "object") noPhotoState.grouping = "none";
    if (breakdownsState.grouping === "object") breakdownsState.grouping = "none";
  }
  const repairState = {
    tools: [],
    filtered: [],
    search: "",
    orgFolder: "",
    statusFilter: "",
    toolMap: new Map(),
  };
  const repairFormState = {
    selectedTool: null,
    organizations: [],
    isSaving: false,
    mode: "send",
  };
  let addToolViewportListenersAttached = false;
  let breakdownViewportListenersAttached = false;
  const updateAddToolKeyboardOffset = () => {
    if (!addToolModalEl) return;
    const viewport = window.visualViewport;
    if (!viewport) {
      addToolModalEl.style.removeProperty("--keyboard-offset");
      return;
    }
    const offset = Math.max(
      0,
      window.innerHeight - viewport.height - viewport.offsetTop
    );
    addToolModalEl.style.setProperty("--keyboard-offset", `${offset}px`);
  };
  const attachAddToolViewportListeners = () => {
    const viewport = window.visualViewport;
    if (!viewport || addToolViewportListenersAttached) return;
    viewport.addEventListener("resize", updateAddToolKeyboardOffset);
    viewport.addEventListener("scroll", updateAddToolKeyboardOffset);
    addToolViewportListenersAttached = true;
  };
  const detachAddToolViewportListeners = () => {
    const viewport = window.visualViewport;
    if (!viewport || !addToolViewportListenersAttached) return;
    viewport.removeEventListener("resize", updateAddToolKeyboardOffset);
    viewport.removeEventListener("scroll", updateAddToolKeyboardOffset);
    addToolViewportListenersAttached = false;
  };
  const updateBreakdownKeyboardOffset = () => {
    if (!breakdownFormModalEl) return;
    const viewport = window.visualViewport;
    if (!viewport) {
      breakdownFormModalEl.style.removeProperty("--keyboard-offset");
      return;
    }
    const offset = Math.max(
      0,
      window.innerHeight - viewport.height - viewport.offsetTop
    );
    breakdownFormModalEl.style.setProperty("--keyboard-offset", `${offset}px`);
  };
  const attachBreakdownViewportListeners = () => {
    const viewport = window.visualViewport;
    if (!viewport || breakdownViewportListenersAttached) return;
    viewport.addEventListener("resize", updateBreakdownKeyboardOffset);
    viewport.addEventListener("scroll", updateBreakdownKeyboardOffset);
    breakdownViewportListenersAttached = true;
  };
  const detachBreakdownViewportListeners = () => {
    const viewport = window.visualViewport;
    if (!viewport || !breakdownViewportListenersAttached) return;
    viewport.removeEventListener("resize", updateBreakdownKeyboardOffset);
    viewport.removeEventListener("scroll", updateBreakdownKeyboardOffset);
    breakdownViewportListenersAttached = false;
  };
  const objectsPath = context.objectsPath ?? `./${context.orgFolderName}/Объекты.json`;
  const demandPath = context.demandPath ?? `./${context.orgFolderName}/Заявки.json`;
  const toolsDatabasePath =
    context.toolsDatabasePath ?? `./${context.orgFolderName}/База с инструментами.json`;
  const objectsFilterInput = objectsFormEl?.querySelector("[name='object-filter']");
  const objectsCreateNameInput = objectsCreateFormEl?.querySelector(
    "[name='object-name']"
  );
  const objectsCreateCoordinatesInput = objectsCreateFormEl?.querySelector(
    "[name='object-coordinates']"
  );
  const objectsEditNameInput = objectsEditFormEl?.querySelector(
    "[name='object-name']"
  );
  const objectsEditCoordinatesInput = objectsEditFormEl?.querySelector(
    "[name='object-coordinates']"
  );
  let selectedUsersOrgName = "";
  let selectedUsersOrgDisplayName = "";
  let selectedUsersOrgNames = [];
  let selectedVacationUser = null;

  const buildToolsMapBounds = (points) => {
    const safePoints = Array.isArray(points) ? points : [];
    if (!safePoints.length) return null;
    const latValues = safePoints.map((point) => point.coordinates.lat);
    const lngValues = safePoints.map((point) => point.coordinates.lng);
    const minLat = Math.min(...latValues);
    const maxLat = Math.max(...latValues);
    const minLng = Math.min(...lngValues);
    const maxLng = Math.max(...lngValues);
    const latPadding = Math.max(0.01, (maxLat - minLat) * 0.2);
    const lngPadding = Math.max(0.01, (maxLng - minLng) * 0.2);
    return {
      minLat: minLat - latPadding,
      maxLat: maxLat + latPadding,
      minLng: minLng - lngPadding,
      maxLng: maxLng + lngPadding,
    };
  };

  const buildYandexViewportBounds = (points) => {
    const bounds = buildToolsMapBounds(points);
    if (!bounds) return null;
    return [
      [bounds.minLat, bounds.minLng],
      [bounds.maxLat, bounds.maxLng],
    ];
  };

  const buildYandexStaticMapUrl = (points, bounds) => {
    const safePoints = Array.isArray(points) ? points : [];
    if (!safePoints.length) return "";
    const width = 640;
    const height = 420;

    const params = new URLSearchParams({
      lang: "ru_RU",
      l: "map",
      size: `${width},${height}`,
    });

    if (bounds) {
      const bbox = `${bounds.minLng.toFixed(6)},${bounds.minLat.toFixed(
        6
      )}~${bounds.maxLng.toFixed(6)},${bounds.maxLat.toFixed(6)}`;
      params.set("bbox", bbox);
    }

    return `https://static-maps.yandex.ru/1.x/?${params.toString()}`;
  };

  const collectToolsMapToolsForObject = (objectName) => {
    const targetObjectKey = sanitizeObjectName(objectName ?? "").toLowerCase();
    if (!targetObjectKey) return [];
    return (Array.isArray(toolsMapState.userTools) ? toolsMapState.userTools : []).filter(
      (tool) =>
        sanitizeObjectName(tool?.["Объект"] ?? tool?.object ?? "").toLowerCase() ===
        targetObjectKey
    );
  };

  const buildToolsMapObjectPopupHtml = (point) => {
    const objectName = String(point?.name ?? "").trim();
    if (!objectName) {
      return "<div class='tools-map-popup'><div class='tools-map-popup__empty'>Нет данных по объекту.</div></div>";
    }

    const objectTools = collectToolsMapToolsForObject(objectName);
    if (!objectTools.length) {
      return "<div class='tools-map-popup'><div class='tools-map-popup__empty'>У вас нет инструментов на этом объекте.</div></div>";
    }

    const groups = new Map();
    objectTools.forEach((tool) => {
      const title = String(tool?.["Наименование"] ?? "").trim() || "Без наименования";
      if (!groups.has(title)) {
        groups.set(title, []);
      }
      groups.get(title).push(tool);
    });

    const groupsHtml = Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "ru"))
      .map(([title, tools]) => {
        const toolsHtml = tools
          .map((tool) => {
            const number = resolveToolNumberValue(tool) || "Без номера";
            const status = String(tool?.["Статус"] ?? "").trim();
            return `<li class='tools-map-popup__item'>
              <span class='tools-map-popup__item-number'>${escapeHtml(number)}</span>
              ${
                status
                  ? `<span class='tools-map-popup__item-status'>${escapeHtml(status)}</span>`
                  : ""
              }
            </li>`;
          })
          .join("");

        return `<section class='tools-map-popup__group'>
          <div class='tools-map-popup__group-header'>
            <span class='tools-map-popup__group-title'>${escapeHtml(title)}</span>
            <span class='tools-map-popup__group-count'>${tools.length}</span>
          </div>
          <ul class='tools-map-popup__list'>${toolsHtml}</ul>
        </section>`;
      })
      .join("");

    return `<div class='tools-map-popup'>${groupsHtml}</div>`;
  };

  const projectToolsMapPoint = (point, bounds) => {
    if (!bounds) return { x: 0.5, y: 0.5 };
    const lngRange = bounds.maxLng - bounds.minLng || 0.001;
    const latRange = bounds.maxLat - bounds.minLat || 0.001;
    const rawX = (point.coordinates.lng - bounds.minLng) / lngRange;
    const rawY = 1 - (point.coordinates.lat - bounds.minLat) / latRange;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    return {
      x: clamp(rawX, 0.04, 0.96),
      y: clamp(rawY, 0.06, 0.94),
    };
  };

  const renderToolsMap = (points) => {
    if (!toolsMapCanvasEl || !toolsMapEl) return;
    const safePoints = Array.isArray(points) ? points : [];
    toolsMapState.points = safePoints;
    if (appTitleMetaEl) {
      appTitleMetaEl.textContent = `${safePoints.length} объектов`;
      appTitleMetaEl.classList.remove("is-hidden");
    }
    if (toolsMapCountEl) {
      const objectText = safePoints.length === 1 ? "объект" : "объектов";
      toolsMapCountEl.textContent = `${safePoints.length} ${objectText}`;
    }
    const mapContentEl = toolsMapLayerEl ?? toolsMapCanvasEl;
    const existingDots = mapContentEl.querySelectorAll(".tools-map-dot");
    existingDots.forEach((dot) => dot.remove());
    if (!safePoints.length) {
      toolsMapPlaceholderEl?.classList.remove("is-hidden");
      toolsMapCanvasEl.classList.remove("tools-map-canvas--map");
      if (toolsMapImageEl) {
        toolsMapImageEl.classList.add("is-hidden");
        toolsMapImageEl.removeAttribute("src");
      }
      if (toolsMapState.activated) {
        syncInteractiveToolsMap();
      }
      return;
    }
    toolsMapPlaceholderEl?.classList.add("is-hidden");
    toolsMapCanvasEl.classList.add("tools-map-canvas--map");
    const bounds = buildToolsMapBounds(safePoints);
    if (toolsMapImageEl) {
      const mapUrl = buildYandexStaticMapUrl(safePoints, bounds);
      toolsMapImageEl.src = mapUrl;
      toolsMapImageEl.classList.remove("is-hidden");
    }
    safePoints.forEach((point) => {
      const position = projectToolsMapPoint(point, bounds);
      const dot = document.createElement("button");
      dot.className = "tools-map-dot";
      dot.type = "button";
      dot.setAttribute("aria-label", point.name);
      dot.style.left = `${(position.x * 100).toFixed(2)}%`;
      dot.style.top = `${(position.y * 100).toFixed(2)}%`;
      dot.innerHTML = `
        <span class="tools-map-dot__title">${escapeHtml(point.name)}</span>
      `;
      dot.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void awakenToolsMap();
      });
      mapContentEl.appendChild(dot);
    });

    if (toolsMapState.activated) {
      syncInteractiveToolsMap();
    }
  };

  const setToolsMapCollapsedState = (collapsed) => {
    if (!toolsMapEl || !toolsMapToggleEls.length) return;
    isToolsMapCollapsed = Boolean(collapsed);
    toolsMapEl.classList.toggle("tools-map-card--collapsed", isToolsMapCollapsed);
    toolsMapCollapsedTriggerEl?.setAttribute("aria-expanded", String(!isToolsMapCollapsed));
    toolsMapToggleEls.forEach((toggleEl) => {
      const isHeaderToggle = toggleEl.classList.contains("tools-map-toggle--header");
      toggleEl.innerHTML = isHeaderToggle
        ? '<span aria-hidden="true">Карта</span>'
        : '<span aria-hidden="true">▾</span>';
      toggleEl.classList.toggle("is-collapsed", isToolsMapCollapsed);
      toggleEl.setAttribute("aria-expanded", String(!isToolsMapCollapsed));
      toggleEl.setAttribute(
        "aria-label",
        isToolsMapCollapsed ? "Развернуть карту" : "Свернуть карту"
      );
    });
    if (!isToolsMapCollapsed && !toolsMapState.activated) {
      toolsMapCanvasEl?.setAttribute(
        "aria-label",
        "Нажмите, чтобы оживить карту, масштабировать и перемещать"
      );
    }
    persistToolsMapCollapsedState();
  };

  const toolsMapState = {
    activated: false,
    points: [],
    userTools: [],
    map: null,
    markers: [],
    yandexPromise: null,
  };

  const syncToolsMapCanvasSquare = () => {
    if (!toolsMapCanvasEl) return;
    const canvasWidth = Math.round(toolsMapCanvasEl.clientWidth);
    if (!canvasWidth) return;
    toolsMapCanvasEl.style.height = `${canvasWidth}px`;
    toolsMapState.map?.container?.fitToViewport?.();
  };

  const ensureYandexMapsLoaded = () => {
    if (window.ymaps?.Map) {
      return Promise.resolve(window.ymaps);
    }

    if (toolsMapState.yandexPromise) {
      return toolsMapState.yandexPromise;
    }

    toolsMapState.yandexPromise = new Promise((resolve, reject) => {
      const resolveWhenReady = () => {
        if (!window.ymaps?.ready) {
          reject(new Error("API Яндекс.Карт не готов"));
          return;
        }
        window.ymaps.ready(() => resolve(window.ymaps));
      };

      const existingScript = document.getElementById("yandex-maps-js");
      if (existingScript) {
        existingScript.addEventListener("load", resolveWhenReady, { once: true });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Не удалось загрузить API Яндекс.Карт")),
          { once: true }
        );
        if (window.ymaps?.ready) {
          resolveWhenReady();
        }
        return;
      }

      const script = document.createElement("script");
      script.id = "yandex-maps-js";
      script.src = "https://api-maps.yandex.ru/2.1/?lang=ru_RU";
      script.onload = resolveWhenReady;
      script.onerror = () => reject(new Error("Не удалось загрузить API Яндекс.Карт"));
      document.body.appendChild(script);
    });

    return toolsMapState.yandexPromise;
  };

  const syncInteractiveToolsMap = () => {
    if (!toolsMapState.map || !window.ymaps) return;
    const safePoints = Array.isArray(toolsMapState.points) ? toolsMapState.points : [];
    toolsMapState.markers.forEach((marker) => {
      toolsMapState.map?.geoObjects.remove(marker);
    });
    toolsMapState.markers = [];

    if (!safePoints.length) {
      toolsMapState.map.setCenter([53.9, 27.56], 10, {
        duration: 240,
      });
      return;
    }

    const validCoordinates = safePoints
      .map((point) => {
        const lat = Number(point?.coordinates?.lat);
        const lng = Number(point?.coordinates?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return [lat, lng];
      })
      .filter(Boolean);

    if (validCoordinates.length === 1) {
      toolsMapState.map.setCenter(validCoordinates[0], 13, { duration: 260 });
    } else if (validCoordinates.length > 1) {
      const viewportBounds = buildYandexViewportBounds(safePoints);
      if (viewportBounds) {
        toolsMapState.map.setBounds(viewportBounds, {
          checkZoomRange: true,
          preciseZoom: true,
          useMapMargin: true,
          zoomMargin: [34, 34, 34, 34],
          duration: 260,
        });
      }
    }

    safePoints.forEach((point) => {
      const lat = Number(point?.coordinates?.lat);
      const lng = Number(point?.coordinates?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const safePointName = escapeHtml(point.name);
      const toolsCount = Number(point.count) || 0;

      const marker = new window.ymaps.Placemark(
        [lat, lng],
        {
          balloonContentHeader: safePointName,
          balloonContentBody: buildToolsMapObjectPopupHtml(point),
          hintContent: `${safePointName} · ${toolsCount}`,
          iconCaption: `${safePointName} · ${toolsCount}`,
        },
        {
          preset: "islands#blueCircleDotIconWithCaption",
        }
      );
      marker.__toolsPoint = point;
      marker.events.add("click", () => {
        marker.properties.set("balloonContentHeader", safePointName);
        marker.properties.set("balloonContentBody", buildToolsMapObjectPopupHtml(point));
        marker.balloon.open();
      });
      toolsMapState.map.geoObjects.add(marker);
      toolsMapState.markers.push(marker);
    });
  };

  const activateToolsMapInteraction = async () => {
    if (
      !toolsMapCanvasEl ||
      !toolsMapLayerEl ||
      toolsMapState.activated ||
      isToolsMapCollapsed
    ) {
      return;
    }

    try {
      await ensureYandexMapsLoaded();
      toolsMapState.activated = true;
      toolsMapCanvasEl.classList.add("tools-map-canvas--interactive");
      toolsMapCanvasEl.classList.add("tools-map-canvas--interactive-live");
      toolsMapCanvasEl.classList.add("tools-map-canvas--map");
      toolsMapCanvasEl.setAttribute(
        "aria-label",
        "Карта активна. Перемещайте карту и меняйте масштаб"
      );

      toolsMapPlaceholderEl?.classList.add("is-hidden");
      toolsMapImageEl?.classList.add("is-hidden");

      if (!toolsMapState.map) {
        toolsMapLayerEl.innerHTML = "";
        toolsMapState.map = new window.ymaps.Map(
          toolsMapLayerEl,
          {
            center: [53.9, 27.56],
            zoom: 10,
            controls: ["zoomControl", "geolocationControl"],
          },
          {
            suppressMapOpenBlock: true,
          }
        );
        window.setTimeout(() => {
          toolsMapState.map?.container?.fitToViewport?.();
        }, 80);
      }

      syncInteractiveToolsMap();
    } catch (error) {
      console.warn("Не удалось активировать интерактивную карту.", error);
      toolsMapCanvasEl.setAttribute(
        "aria-label",
        "Не удалось загрузить интерактивную карту, попробуйте позже"
      );
    }
  };

  const awakenToolsMap = async () => {
    if (!toolsMapCanvasEl || isToolsMapCollapsed) return;
    await activateToolsMapInteraction();
    toolsMapCanvasEl.classList.remove("tools-map-canvas--alive");
    window.requestAnimationFrame(() => {
      toolsMapCanvasEl.classList.add("tools-map-canvas--alive");
      window.setTimeout(() => {
        toolsMapCanvasEl.classList.remove("tools-map-canvas--alive");
      }, 720);
    });
  };

  if (toolsMapToggleEls.length) {
    toolsMapToggleEls.forEach((toggleEl) => {
      toggleEl.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setToolsMapCollapsedState(!isToolsMapCollapsed);
        window.requestAnimationFrame(syncToolsMapCanvasSquare);
      });
    });
  }

  if (toolsMapCollapsedTriggerEl) {
    const expandToolsMapFromCollapsedHeader = (event) => {
      if (!isToolsMapCollapsed) return;
      event.preventDefault();
      event.stopPropagation();
      setToolsMapCollapsedState(false);
      window.requestAnimationFrame(syncToolsMapCanvasSquare);
    };
    toolsMapCollapsedTriggerEl.addEventListener("click", expandToolsMapFromCollapsedHeader);
    toolsMapCollapsedTriggerEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      expandToolsMapFromCollapsedHeader(event);
    });
  }

  if (toolsMapCanvasEl) {
    syncToolsMapCanvasSquare();
    window.addEventListener("resize", syncToolsMapCanvasSquare);
    toolsMapCanvasEl.addEventListener("click", () => {
      void awakenToolsMap();
    });
    toolsMapCanvasEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      void awakenToolsMap();
    });
  }

  setToolsMapCollapsedState(loadToolsMapCollapsedState());

  const updateToolsMap = async () => {
    if (!objectTrackingEnabled || !toolsMapEl || !toolsMapCanvasEl) return;
    try {
      const [toolsRaw, objectsRaw] = await Promise.all([
        loadJson(toolsDatabasePath).catch(() => []),
        loadJson(objectsPath).catch(() => []),
      ]);
      const toolsList = normalizeToolsData(toolsRaw);
      const objectsList = normalizeObjectsData(objectsRaw);
      const points = buildToolsMapPoints(
        toolsList,
        objectsList,
        user.full_name ?? user.fullName ?? ""
      );
      const responsibleKey = normalizePersonName(user.full_name ?? user.fullName ?? "");
      toolsMapState.userTools = responsibleKey
        ? toolsList.filter((tool) => {
            const responsible = normalizePersonName(
              tool?.["Ответственный"] ?? tool?.responsible ?? tool?.user ?? tool?.owner ?? ""
            );
            return responsible === responsibleKey;
          })
        : [];
      renderToolsMap(points);
    } catch (error) {
      console.warn("Не удалось загрузить данные для карты инструментов.", error);
      renderToolsMap([]);
    }
  };

  if (objectTrackingEnabled) {
    updateToolsMap();
  }

  const setObjectsMessage = (message = "") => {
    if (objectsMessageEl) {
      objectsMessageEl.textContent = message;
    }
  };

  const setObjectsFilterValue = (value = "") => {
    objectsState.filter = String(value ?? "").trim();
    if (objectsFilterInput) {
      objectsFilterInput.value = objectsState.filter;
    }
  };

  const resetObjectsForm = () => {
    setObjectsFilterValue("");
    setObjectsMessage("");
  };

  const setObjectsCreateMessage = (message = "") => {
    if (objectsCreateMessageEl) {
      objectsCreateMessageEl.textContent = message;
    }
  };

  const setObjectsEditMessage = (message = "") => {
    if (objectsEditMessageEl) {
      objectsEditMessageEl.textContent = message;
    }
  };

  const resetObjectsCreateForm = () => {
    if (objectsCreateFormEl) {
      objectsCreateFormEl.reset();
    }
    setObjectsCreateMessage("");
  };

  const resetObjectsEditForm = () => {
    if (objectsEditFormEl) {
      objectsEditFormEl.reset();
    }
    objectsState.editingId = null;
    setObjectsEditMessage("");
  };

  const formatCoordinatesInput = (coordinates) => {
    if (!coordinates) return "";
    const lat = Number.isFinite(coordinates.lat) ? coordinates.lat : null;
    const lng = Number.isFinite(coordinates.lng) ? coordinates.lng : null;
    if (lat === null || lng === null) return "";
    return `${lat}, ${lng}`;
  };

  const parseCoordinatesInput = (value = "") => {
    const raw = String(value ?? "").trim();
    if (!raw) {
      return { coordinates: null, error: "" };
    }
    const parts = raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length !== 2) {
      return {
        coordinates: null,
        error: "Введите координаты в формате: 53.912103, 27.572346",
      };
    }
    const latValue = normalizeCoordinateValue(parts[0]);
    const lngValue = normalizeCoordinateValue(parts[1]);
    if (latValue === null || lngValue === null) {
      return { coordinates: null, error: "Введите корректные координаты." };
    }
    if (latValue < -90 || latValue > 90 || lngValue < -180 || lngValue > 180) {
      return {
        coordinates: null,
        error: "Координаты вне допустимого диапазона.",
      };
    }
    return { coordinates: { lat: latValue, lng: lngValue }, error: "" };
  };

  const buildObjectsToolCounts = (toolsList) => {
    const counts = new Map();
    toolsList.forEach((tool) => {
      if (!tool || typeof tool !== "object") return;
      const objectName = sanitizeObjectName(tool["Объект"] ?? tool.object ?? "");
      if (!objectName) return;
      const key = objectName.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  };

  const normalizeObjectCompare = (value = "") =>
    sanitizeObjectName(value).toLowerCase();

  const isObjectKeyName = (key = "") => {
    const normalized = String(key ?? "").trim().toLowerCase();
    if (!normalized) return false;
    return normalized.includes("объект") || ["object", "location"].includes(normalized);
  };

  const updateObjectNameInData = (data, oldName, newName) => {
    const oldNormalized = normalizeObjectCompare(oldName);
    if (!oldNormalized) return { data, changed: false };
    const updateNode = (node) => {
      if (Array.isArray(node)) {
        let changed = false;
        const next = node.map((item) => {
          const result = updateNode(item);
          if (result.changed) changed = true;
          return result.value;
        });
        return { value: changed ? next : node, changed };
      }
      if (node && typeof node === "object") {
        let changed = false;
        const next = { ...node };
        Object.entries(node).forEach(([key, value]) => {
          if (typeof value === "string" && isObjectKeyName(key)) {
            if (normalizeObjectCompare(value) === oldNormalized) {
              next[key] = newName;
              changed = true;
              return;
            }
          }
          if (value && typeof value === "object") {
            const result = updateNode(value);
            if (result.changed) {
              next[key] = result.value;
              changed = true;
            }
          }
        });
        return { value: changed ? next : node, changed };
      }
      return { value: node, changed: false };
    };
    const result = updateNode(data);
    return { data: result.value, changed: result.changed };
  };

  const replaceObjectNameInList = (list, oldName, newName) => {
    const oldNormalized = normalizeObjectCompare(oldName);
    return list.map((item) => {
      if (normalizeObjectCompare(item) === oldNormalized) {
        return newName;
      }
      return item;
    });
  };

  const replaceObjectNameInToolsList = (list, oldName, newName) => {
    const oldNormalized = normalizeObjectCompare(oldName);
    return list.map((tool) => {
      if (!tool || typeof tool !== "object") return tool;
      const currentName = String(tool?.["Объект"] ?? "").trim();
      if (normalizeObjectCompare(currentName) !== oldNormalized) return tool;
      return { ...tool, "Объект": newName };
    });
  };

  const replaceObjectNameInDemands = (list, oldName, newName) => {
    const oldNormalized = normalizeObjectCompare(oldName);
    return list.map((entry) => {
      if (!entry || typeof entry !== "object") return entry;
      const currentName = String(entry.object ?? "").trim();
      if (normalizeObjectCompare(currentName) !== oldNormalized) return entry;
      return { ...entry, object: newName };
    });
  };

  const formatObjectsToolsLabel = (count) => {
    const safeCount = Number.isFinite(count) ? count : 0;
    const mod10 = safeCount % 10;
    const mod100 = safeCount % 100;
    if (mod10 === 1 && mod100 !== 11) {
      return `${safeCount} инструмент`;
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
      return `${safeCount} инструмента`;
    }
    return `${safeCount} инструментов`;
  };

  const renderObjectsList = () => {
    if (!objectsItemsEl) return;
    objectsItemsEl.innerHTML = "";
    const query = objectsState.filter.toLowerCase();
    const filteredItems = objectsState.items.filter((item) => {
      if (!query) return true;
      return item.name.toLowerCase().includes(query);
    });
    const sortedItems = [...filteredItems].sort((a, b) => {
      const aName = normalizeObjectCompare(a?.name ?? "");
      const bName = normalizeObjectCompare(b?.name ?? "");
      return aName.localeCompare(bName, "ru", { numeric: true, sensitivity: "base" });
    });
    if (objectsCountEl) {
      objectsCountEl.textContent = query
        ? `${filteredItems.length}/${objectsState.items.length}`
        : String(objectsState.items.length);
    }
    if (objectsEmptyEl) {
      const isEmpty = filteredItems.length === 0;
      objectsEmptyEl.classList.toggle("is-hidden", !isEmpty);
      objectsEmptyEl.textContent = query
        ? "По фильтру ничего не найдено."
        : "Пока нет объектов.";
    }
    sortedItems.forEach((item) => {
      const itemEl = document.createElement("div");
      itemEl.className = "objects-item";
      itemEl.dataset.objectId = item.id;

      const contentEl = document.createElement("div");
      contentEl.className = "objects-item__content";

      const nameEl = document.createElement("div");
      nameEl.className = "objects-item__name";
      nameEl.textContent = item.name;

      const countKey = sanitizeObjectName(item.name).toLowerCase();
      const toolCount = objectsState.toolsCount.get(countKey) ?? 0;
      if (toolCount === 0) {
        itemEl.classList.add("objects-item--empty");
      }
      if (!item.coordinates) {
        itemEl.classList.add("objects-item--missing");
      }
      const toolsEl = document.createElement("div");
      toolsEl.className = "objects-item__tools";
      toolsEl.textContent = formatObjectsToolsLabel(toolCount);

      const actionsEl = document.createElement("div");
      actionsEl.className = "objects-item__actions";

      const editButton = document.createElement("button");
      editButton.className = "objects-item__button";
      editButton.type = "button";
      editButton.dataset.objectAction = "edit";
      editButton.textContent = "✎";
      editButton.setAttribute("aria-label", "Редактировать");
      editButton.title = "Редактировать";

      const deleteButton = document.createElement("button");
      deleteButton.className = "objects-item__button objects-item__button--danger";
      deleteButton.type = "button";
      deleteButton.dataset.objectAction = "delete";
      deleteButton.textContent = "✕";
      deleteButton.setAttribute("aria-label", "Удалить");
      deleteButton.title =
        toolCount > 0
          ? "Нельзя удалить: на объекте есть инструменты"
          : "Удалить";
      deleteButton.disabled = toolCount > 0;

      actionsEl.append(editButton, deleteButton);
      contentEl.append(nameEl, toolsEl);
      itemEl.append(contentEl, actionsEl);
      objectsItemsEl.appendChild(itemEl);
    });
  };

  const loadObjects = async () => {
    if (!objectsItemsEl) return;
    setObjectsMessage("Загружаем список объектов...");
    try {
      const [objectsRaw, toolsRaw] = await Promise.all([
        loadJson(objectsPath),
        loadJson(toolsDatabasePath).catch(() => []),
      ]);
      objectsState.items = normalizeObjectsData(objectsRaw);
      const toolsList = normalizeToolsData(toolsRaw);
      objectsState.toolsCount = buildObjectsToolCounts(toolsList);
      setObjectsMessage("");
    } catch (error) {
      console.warn("Не удалось загрузить объекты.", error);
      objectsState.items = [];
      objectsState.toolsCount = new Map();
      setObjectsMessage("Не удалось загрузить список объектов.");
    }
    renderObjectsList();
  };

  const saveObjects = async () => {
    if (objectsState.isSaving) return;
    objectsState.isSaving = true;
    setObjectsMessage("Сохраняем изменения...");
    try {
      await saveJson(objectsPath, objectsState.items, { user });
      setObjectsMessage("Список объектов сохранён.");
    } catch (error) {
      console.error(error);
      setObjectsMessage("Не удалось сохранить объекты. Проверьте сервер.");
    } finally {
      objectsState.isSaving = false;
    }
  };

  const openObjectsModal = async () => {
    if (!objectsModalEl) return;
    objectsModalEl.classList.remove("is-hidden");
    resetObjectsForm();
    await loadObjects();
  };

  const closeObjectsCreateModal = () => {
    if (!objectsCreateModalEl) return;
    objectsCreateModalEl.classList.add("is-hidden");
    resetObjectsCreateForm();
  };

  const openObjectsCreateModal = () => {
    if (!objectsCreateModalEl) return;
    objectsCreateModalEl.classList.remove("is-hidden");
    resetObjectsCreateForm();
    objectsCreateNameInput?.focus();
  };

  const closeObjectsEditModal = () => {
    if (!objectsEditModalEl) return;
    objectsEditModalEl.classList.add("is-hidden");
    resetObjectsEditForm();
  };

  const openObjectsEditModal = (item) => {
    if (!objectsEditModalEl || !item) return;
    objectsState.editingId = item.id;
    if (objectsEditNameInput) {
      objectsEditNameInput.value = item.name ?? "";
    }
    if (objectsEditCoordinatesInput) {
      objectsEditCoordinatesInput.value = formatCoordinatesInput(item.coordinates);
    }
    setObjectsEditMessage("");
    objectsEditModalEl.classList.remove("is-hidden");
  };

  const closeObjectsModal = () => {
    if (!objectsModalEl) return;
    objectsModalEl.classList.add("is-hidden");
    resetObjectsForm();
    setObjectsMessage("");
    closeObjectsCreateModal();
    closeObjectsEditModal();
  };

  if (objectsBackdropEl) {
    objectsBackdropEl.addEventListener("click", closeObjectsModal);
  }
  if (objectsCloseButton) {
    objectsCloseButton.addEventListener("click", closeObjectsModal);
  }
  if (objectsCreateBackdropEl) {
    objectsCreateBackdropEl.addEventListener("click", closeObjectsCreateModal);
  }
  if (objectsCreateCloseButton) {
    objectsCreateCloseButton.addEventListener("click", closeObjectsCreateModal);
  }
  if (objectsCreateCancelButton) {
    objectsCreateCancelButton.addEventListener("click", closeObjectsCreateModal);
  }
  if (objectsEditBackdropEl) {
    objectsEditBackdropEl.addEventListener("click", closeObjectsEditModal);
  }
  if (objectsEditCloseButton) {
    objectsEditCloseButton.addEventListener("click", closeObjectsEditModal);
  }
  if (objectsEditCancelButton) {
    objectsEditCancelButton.addEventListener("click", closeObjectsEditModal);
  }

  const setDemandMessage = (message = "") => {
    if (demandMessageEl) {
      demandMessageEl.textContent = message;
    }
  };

  const setDemandFormVisibility = (isOpen) => {
    if (!demandFormModalEl) return;
    demandFormModalEl.classList.toggle("is-hidden", !isOpen);
    if (demandToggleButton) {
      demandToggleButton.classList.toggle("is-active", isOpen);
      demandToggleButton.setAttribute("aria-expanded", String(isOpen));
    }
    // Не фокусируем поле автоматически: в Telegram Mini Apps это сразу открывает клавиатуру.
  };
  const setDemandFiltersVisibility = (isOpen) => {
    if (!demandFiltersPanel) return;
    demandFiltersPanel.classList.toggle("is-hidden", !isOpen);
    if (demandFiltersToggle) {
      demandFiltersToggle.classList.toggle("is-active", isOpen);
      demandFiltersToggle.setAttribute("aria-expanded", String(isOpen));
    }
  };

  const demandPriorityLabels = {
    red: "Высокий",
  };

  const pluralizeDemandDays = (count) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return "день";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
    return "дней";
  };

  const formatDemandCreatedLabel = (value) => {
    const createdDate = parseIsoDateValue(value);
    if (!createdDate) return "—";
    const days = getDaysDifference(new Date(), createdDate);
    return `${formatDateValue(createdDate)} (${days} ${pluralizeDemandDays(
      Math.abs(days)
    )})`;
  };

  const getSelectedDemandPriority = () => {
    const selected = Array.from(demandPriorityInputs || []).find(
      (input) => input.checked
    );
    return normalizeDemandPriority(selected?.value ?? "");
  };

  const setDemandPriorityValue = (value) => {
    const normalized = normalizeDemandPriority(value);
    Array.from(demandPriorityInputs || []).forEach((input) => {
      input.checked = input.value === normalized;
    });
  };

  const setDemandFormTitle = (mode = "add") => {
    if (!demandFormTitleEl) return;
    demandFormTitleEl.textContent =
      mode === "edit" ? "Редактирование заявки" : "Новая заявка";
  };

  const setDemandSubmitButton = (mode = "add") => {
    if (!demandSubmitButton) return;
    const isEdit = mode === "edit";
    demandSubmitButton.textContent = isEdit ? "Сохранить" : "Добавить";
    setDemandFormTitle(isEdit ? "edit" : "add");
  };


  let demandDateVisibleMonth = new Date();

  const buildDemandMonthDays = (monthDate) => {
    const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const leadingDays = (firstDay.getDay() + 6) % 7;
    const days = Array.from({ length: leadingDays }, () => null);
    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      days.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  };

  const updateDemandDateLabel = () => {
    const selectedDate = parseIsoDateValue(demandDateInput?.value ?? "");
    if (demandDateLabelEl) {
      demandDateLabelEl.textContent = selectedDate ? formatDateValue(selectedDate) : "Выберите дату";
    }
    demandDateTriggerEl?.classList.toggle("is-filled", Boolean(selectedDate));
  };

  const renderDemandDateCalendar = () => {
    if (!demandDateDaysEl || !demandDateMonthEl) return;
    const monthDate = new Date(demandDateVisibleMonth.getFullYear(), demandDateVisibleMonth.getMonth(), 1);
    const selectedIso = demandDateInput?.value ?? "";
    const todayIso = formatIsoDateValue(new Date());
    demandDateMonthEl.textContent = monthDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
    demandDateDaysEl.innerHTML = "";
    buildDemandMonthDays(monthDate).forEach((dayDate) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "demand-date-picker__day";
      if (!dayDate) {
        button.classList.add("is-empty");
        button.tabIndex = -1;
        demandDateDaysEl.append(button);
        return;
      }
      const iso = formatIsoDateValue(dayDate);
      button.textContent = String(dayDate.getDate());
      button.dataset.demandDateValue = iso;
      button.classList.toggle("is-today", iso === todayIso);
      button.classList.toggle("is-selected", iso === selectedIso);
      demandDateDaysEl.append(button);
    });
    updateDemandDateLabel();
  };

  const setDemandDateCalendarOpen = (isOpen) => {
    if (!demandDateCalendarEl) return;
    demandDateCalendarEl.classList.toggle("is-hidden", !isOpen);
    demandDateTriggerEl?.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) renderDemandDateCalendar();
  };

  const updateDemandSteps = () => {
    const values = {
      item:
        Boolean(sanitizeDemandLabel(demandItemInput?.value ?? "")) &&
        normalizeNumber(demandQuantityInput?.value ?? 0, 0) > 0,
      object: objectTrackingEnabled
        ? Boolean(sanitizeDemandLabel(demandObjectInput?.value ?? ""))
        : true,
      date: Boolean(normalizeDemandNeedDate(demandDateInput?.value ?? "")),
    };
    demandStepEls.forEach((stepEl) => {
      const step = stepEl.dataset.demandStep;
      stepEl.classList.toggle("is-complete", Boolean(values[step]));
    });
  };

  const resetDemandForm = () => {
    if (demandFormEl) {
      demandFormEl.reset();
    }
    demandState.editingId = null;
    setDemandSubmitButton("add");
    setDemandPriorityValue("");
    demandDateVisibleMonth = new Date();
    setDemandDateCalendarOpen(false);
    renderDemandDateCalendar();
    updateDemandSteps();
  };

  const startEditDemand = (entry) => {
    if (!entry) return;
    demandState.editingId = entry.id;
    setDemandFormVisibility(true);
    if (demandItemInput) demandItemInput.value = entry.item;
    if (demandQuantityInput) demandQuantityInput.value = String(entry.quantity);
    if (demandUnitInput) demandUnitInput.value = entry.unit;
    if (demandObjectInput) demandObjectInput.value = entry.object;
    if (demandDateInput) {
      demandDateInput.value = entry.needDate ?? "";
      const selectedDate = parseIsoDateValue(demandDateInput.value);
      if (selectedDate) demandDateVisibleMonth = selectedDate;
      renderDemandDateCalendar();
    }
    if (demandNoteInput) demandNoteInput.value = entry.note ?? "";
    setDemandPriorityValue(entry.priority ?? "");
    setDemandSubmitButton("edit");
    updateDemandSteps();
  };

  const updateDemandSummary = () => {
    const openCount = demandState.items.filter((item) => item.status === "open").length;
    if (demandOpenCountEl) demandOpenCountEl.textContent = String(openCount);
  };

  const applyDemandFilters = () => {
    const query = demandState.filters.search.trim().toLowerCase();
    const objectFilter = Array.isArray(demandState.filters.object) ? demandState.filters.object : [];
    const userFilter = Array.isArray(demandState.filters.user) ? demandState.filters.user : [];
    const statusFilter = Array.isArray(demandState.filters.status) ? demandState.filters.status : [demandState.filters.status || "open"];
    const viewFilter = demandState.filters.view;
    const currentUserKey = buildUserKey(user);
    demandState.filtered = demandState.items.filter((item) => {
      const isClosedView = viewFilter === "closed";
      if (isClosedView) {
        if (item.status !== "done") return false;
      } else if (item.status !== "open") {
        return false;
      }
      if (!isClosedView && statusFilter.length && !statusFilter.includes("all") && !statusFilter.includes(item.status)) return false;
      if (objectTrackingEnabled && objectFilter.length && !objectFilter.includes(item.object)) return false;
      if (userFilter.length && !userFilter.includes(item.requestedBy)) return false;
      if (viewFilter === "mine" && item.requestedById !== currentUserKey) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        item.item,
        objectTrackingEnabled ? item.object : "",
        item.requestedBy,
        item.note,
        item.needDate,
        demandPriorityLabels[normalizeDemandPriority(item.priority ?? "")],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
    demandState.filtered.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "open" ? -1 : 1;
      }
      const aDate = a.status === "done" ? getDemandClosedDate(a) || a.updatedAt || a.createdAt : a.createdAt;
      const bDate = b.status === "done" ? getDemandClosedDate(b) || b.updatedAt || b.createdAt : b.createdAt;
      return String(bDate).localeCompare(String(aDate), "ru");
    });
  };

  const demandStatusFilterLabels = { open: "Актуальные", done: "Закрытые", all: "Все" };

  const positionDemandDropdownMenu = (type, menu) => {
    const trigger = contentEl.querySelector(`[data-demand-filter-trigger="${type}"]`);
    if (!trigger || !menu) return;
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const sideGap = 12;
    const top = Math.min(rect.bottom + 8, Math.max(sideGap, viewportHeight - 180));
    const left = Math.max(sideGap, Math.min(rect.left, viewportWidth - rect.width - sideGap));
    const width = Math.min(rect.width, viewportWidth - sideGap * 2);
    const maxHeight = Math.max(160, viewportHeight - top - sideGap);
    menu.style.setProperty("--demand-dropdown-top", `${top}px`);
    menu.style.setProperty("--demand-dropdown-left", `${left}px`);
    menu.style.setProperty("--demand-dropdown-width", `${width}px`);
    menu.style.setProperty("--demand-dropdown-max-height", `${maxHeight}px`);
  };

  const getDemandFilterOptionValues = (type) =>
    Array.from(contentEl.querySelectorAll(`[data-demand-filter-options="${type}"] [data-demand-filter-value]`))
      .map((item) => String(item.dataset.demandFilterValue ?? ""))
      .filter(Boolean);

  const isDemandFilterAllSelected = (type) => {
    const values = Array.isArray(demandState.filters[type]) ? demandState.filters[type] : [];
    const optionValues = getDemandFilterOptionValues(type);
    return optionValues.length > 0 && optionValues.every((value) => values.includes(value));
  };

  const updateDemandFilterActionButtons = () => {
    demandFilterActionButtons.forEach((button) => {
      const type = button.dataset.demandFilterActionType;
      const selectedValues = Array.isArray(demandState.filters[type]) ? demandState.filters[type] : [];
      const allSelected = isDemandFilterAllSelected(type);
      button.dataset.demandFilterAction = selectedValues.length && allSelected ? "clear" : "select-all";
      button.textContent = selectedValues.length && allSelected ? "Снять всё" : "Выделить всё";
      button.setAttribute("aria-label", button.textContent);
    });
  };

  const setDemandDropdownOpen = (type, isOpen) => {
    demandFilterMenus.forEach((menu) => {
      const menuType = menu.dataset.demandFilterMenu;
      const shouldOpen = isOpen && menuType === type;
      if (shouldOpen) positionDemandDropdownMenu(menuType, menu);
      menu.classList.toggle("is-hidden", !shouldOpen);
      contentEl
        .querySelector(`[data-demand-filter-trigger="${menuType}"]`)
        ?.setAttribute("aria-expanded", String(shouldOpen));
    });
    updateDemandFilterActionButtons();
  };

  const updateDemandFilterTrigger = (type, value, fallback) => {
    const trigger = contentEl.querySelector(`[data-demand-filter-trigger="${type}"]`);
    if (!trigger) return;
    const values = Array.isArray(value) ? value : value ? [value] : [];
    const label = values.length > 1 ? `Выбрано: ${values.length}` : values[0] || fallback;
    trigger.textContent = label;
    const isDefaultStatus = type === "status" && values.length === 1 && values[0] === demandStatusFilterLabels.open;
    trigger.classList.toggle("is-selected", values.length > 0 && !isDefaultStatus);
  };

  const renderDemandDropdownOptions = (type, options, currentValue, emptyLabel) => {
    const optionsEl = contentEl.querySelector(`[data-demand-filter-options="${type}"]`);
    if (!optionsEl) return;
    const currentValues = Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : [];
    const normalizedOptions = options.filter(Boolean).sort((a, b) => a.label.localeCompare(b.label, "ru"));
    if (!normalizedOptions.length) {
      optionsEl.innerHTML = `<div class="tools-filter-dropdown__option demand-filter-dropdown__option is-empty">${escapeHtml(emptyLabel)}</div>`;
      return;
    }
    optionsEl.innerHTML = normalizedOptions
      .map((option, index) => {
        const isActive = currentValues.includes(option.value);
        const id = `demand-filter-${type}-${index}`;
        return `<label class="tools-filter-dropdown__option demand-filter-dropdown__option${isActive ? " is-active" : ""}" for="${id}" data-demand-filter-value="${escapeHtml(option.value)}" data-demand-filter-label="${escapeHtml(option.label)}"><input id="${id}" type="checkbox" ${isActive ? "checked" : ""} tabindex="-1" /> <span>${escapeHtml(option.label)}</span></label>`;
      })
      .join("");
  };

  const renderDemandFilterOptions = () => {
    const usedObjects = Array.from(new Set(demandState.items.map((item) => item.object))).filter(Boolean);
    const usedUsers = Array.from(new Set(demandState.items.map((item) => item.requestedBy))).filter(Boolean);
    demandState.filters.object = (Array.isArray(demandState.filters.object) ? demandState.filters.object : []).filter((value) => usedObjects.includes(value));
    demandState.filters.user = (Array.isArray(demandState.filters.user) ? demandState.filters.user : []).filter((value) => usedUsers.includes(value));
    demandState.filters.status = (Array.isArray(demandState.filters.status) ? demandState.filters.status : [demandState.filters.status || "open"]).filter(Boolean);
    if (!demandState.filters.status.length) demandState.filters.status = ["open"];
    if (demandFilterObjectEl) demandFilterObjectEl.value = demandState.filters.object.join(",");
    if (demandFilterUserEl) demandFilterUserEl.value = demandState.filters.user.join(",");
    if (demandFilterStatusEl) demandFilterStatusEl.value = demandState.filters.status.join(",");
    renderDemandDropdownOptions("object", usedObjects.map((value) => ({ value, label: value })), demandState.filters.object, "Все объекты");
    renderDemandDropdownOptions("user", usedUsers.map((value) => ({ value, label: value })), demandState.filters.user, "Все авторы");
    const usedStatuses = Array.from(new Set(demandState.items.map((item) => item.status))).filter(Boolean);
    const statusOptions = ["open", "done"].filter((value) => usedStatuses.includes(value)).map((value) => ({ value, label: demandStatusFilterLabels[value] }));
    renderDemandDropdownOptions("status", [...statusOptions, { value: "all", label: demandStatusFilterLabels.all }], demandState.filters.status, demandStatusFilterLabels.open);
    updateDemandFilterTrigger("object", demandState.filters.object, "Все объекты");
    updateDemandFilterTrigger("user", demandState.filters.user, "Все авторы");
    updateDemandFilterTrigger("status", demandState.filters.status.map((value) => demandStatusFilterLabels[value] ?? value), demandStatusFilterLabels.open);
    updateDemandFilterActionButtons();
  };

  const setDemandContentView = (view = "list") => {
    if (!objectTrackingEnabled) view = "list";
    demandState.mapView = view === "map" ? "map" : "list";
    const isMap = demandState.mapView === "map";
    demandListEl?.classList.toggle("is-hidden", isMap);
    demandMapEl?.classList.toggle("is-hidden", !isMap);
    demandEmptyEl?.classList.toggle("is-hidden", isMap || demandState.filtered.length > 0);
    if (demandMapToggleEl) {
      demandMapToggleEl.classList.toggle("is-active", isMap);
      demandMapToggleEl.setAttribute("aria-pressed", String(isMap));
      demandMapToggleEl.setAttribute(
        "aria-label",
        isMap ? "Показать список заявок" : "Показать карту заявок"
      );
      demandMapToggleEl.title = isMap ? "Показать список" : "Показать карту";
    }
  };

  const getDemandObjectCoordinates = (objectName, normalizedCoordinates) => {
    const safeName = String(objectName ?? "").trim();
    if (!safeName) return null;
    const direct = demandState.objectCoordinates.get(safeName);
    if (direct) return direct;
    return normalizedCoordinates.get(safeName.toLowerCase()) ?? null;
  };

  const buildDemandMapPoints = () => {
    const normalizedCoordinates = new Map(
      Array.from(demandState.objectCoordinates.entries()).map(([name, coordinates]) => [
        String(name ?? "").trim().toLowerCase(),
        coordinates,
      ])
    );
    const grouped = new Map();
    demandState.items.forEach((item) => {
      if (item.status !== "open") return;
      const objectName = String(item.object ?? "").trim();
      if (!objectName) return;
      const coordinates = getDemandObjectCoordinates(objectName, normalizedCoordinates);
      if (!coordinates) return;
      if (!grouped.has(objectName)) {
        grouped.set(objectName, {
          name: objectName,
          coordinates,
          items: [],
        });
      }
      grouped.get(objectName).items.push(item);
    });
    return Array.from(grouped.values())
      .map((entry) => ({
        ...entry,
        count: entry.items.length,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"));
  };

  const demandMapState = {
    activated: false,
    interactive: false,
    points: [],
    map: null,
    markers: [],
  };

  const demandRequestMapState = {
    map: null,
    markers: [],
    selectedDemandId: "",
  };

  const clearDemandRequestMapMarkers = () => {
    if (!demandRequestMapState.map) return;
    demandRequestMapState.markers.forEach((marker) => {
      demandRequestMapState.map?.geoObjects.remove(marker);
    });
    demandRequestMapState.markers = [];
  };

  const getDemandRequestMatchQuery = (demandItem) =>
    String(demandItem?.item ?? "").trim().toLowerCase();

  const buildDemandRequestMapData = (demandItem) => {
    if (!demandItem) return null;
    const normalizedCoordinates = new Map(
      Array.from(demandState.objectCoordinates.entries()).map(([name, coordinates]) => [
        String(name ?? "").trim().toLowerCase(),
        coordinates,
      ])
    );
    const targetObjectName = String(demandItem.object ?? "").trim();
    const targetCoordinates = getDemandObjectCoordinates(
      targetObjectName,
      normalizedCoordinates
    );
    const query = getDemandRequestMatchQuery(demandItem);

    const grouped = new Map();
    demandState.toolsCatalog.forEach((tool) => {
      const toolName = String(tool?.name ?? "").trim().toLowerCase();
      if (!toolName || !query || !toolName.includes(query)) return;
      const objectName = String(tool?.object ?? "").trim();
      if (!objectName) return;
      const coordinates = getDemandObjectCoordinates(objectName, normalizedCoordinates);
      if (!coordinates) return;
      if (!grouped.has(objectName)) {
        grouped.set(objectName, {
          name: objectName,
          coordinates,
          count: 0,
          tools: [],
        });
      }
      const responsible = String(
        tool?.responsible ?? tool?.["Ответственный"] ?? ""
      ).trim();
      grouped.get(objectName).count += 1;
      grouped.get(objectName).tools.push({
        name: String(tool?.name ?? "").trim(),
        responsible: responsible || "Без ответственного",
      });
    });

    const relatedPoints = Array.from(grouped.values())
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"));

    const targetPoint =
      targetObjectName && targetCoordinates
        ? {
            name: targetObjectName,
            coordinates: targetCoordinates,
          }
        : null;

    return {
      query,
      targetPoint,
      relatedPoints,
    };
  };

  const renderDemandRequestMap = (data) => {
    if (!demandRequestMapState.map || !window.ymaps) return;
    clearDemandRequestMapMarkers();
    if (!data) {
      demandRequestMapState.map.setCenter([53.9, 27.56], 10, { duration: 240 });
      return;
    }

    const boundsPoints = [];
    const pushBoundsPoint = (point) => {
      const lat = Number(point?.coordinates?.lat);
      const lng = Number(point?.coordinates?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      boundsPoints.push([lat, lng]);
      return [lat, lng];
    };

    const targetCoordinates = data.targetPoint ? pushBoundsPoint(data.targetPoint) : null;

    data.relatedPoints.forEach((point) => {
      const coordinates = pushBoundsPoint(point);
      if (!coordinates) return;
      const caption = `${point.name} · ${point.count} шт.`;
      const marker = new window.ymaps.Placemark(
        coordinates,
        {
          hintContent: caption,
          iconCaption: caption,
          balloonContentBody: buildDemandRequestMapBalloonContent(point),
        },
        {
          preset: "islands#blueCircleDotIconWithCaption",
        }
      );
      demandRequestMapState.map.geoObjects.add(marker);
      demandRequestMapState.markers.push(marker);
    });

    if (targetCoordinates) {
      const targetMarker = new window.ymaps.Placemark(
        targetCoordinates,
        {
          hintContent: `${data.targetPoint.name} · объект заявки`,
          iconCaption: "Объект заявки",
          balloonContentBody: "Объект, на который оформлена заявка",
        },
        {
          preset: "islands#redCircleDotIconWithCaption",
        }
      );
      demandRequestMapState.map.geoObjects.add(targetMarker);
      demandRequestMapState.markers.push(targetMarker);
    }

    if (!boundsPoints.length) {
      demandRequestMapState.map.setCenter([53.9, 27.56], 10, { duration: 240 });
      return;
    }

    if (boundsPoints.length === 1) {
      demandRequestMapState.map.setCenter(boundsPoints[0], 15, { duration: 260 });
      return;
    }

    demandRequestMapState.map.setBounds(boundsPoints, {
      checkZoomRange: true,
      zoomMargin: [34, 34, 34, 34],
      duration: 260,
    });
  };

  const ensureDemandRequestMapReady = async () => {
    if (!demandRequestMapCanvasEl || !demandRequestMapLayerEl) return;

    await ensureYandexMapsLoaded();

    if (!demandRequestMapState.map) {
      demandRequestMapLayerEl.innerHTML = "";
      demandRequestMapState.map = new window.ymaps.Map(
        demandRequestMapLayerEl,
        {
          center: [53.9, 27.56],
          zoom: 10,
          controls: ["zoomControl", "geolocationControl"],
        },
        {
          suppressMapOpenBlock: true,
        }
      );
      window.setTimeout(() => {
        demandRequestMapState.map?.container?.fitToViewport?.();
      }, 80);
    }

    ["drag", "scrollZoom", "multiTouch", "dblClickZoom"].forEach((behaviorName) => {
      demandRequestMapState.map?.behaviors?.enable?.(behaviorName);
    });
    if (!demandRequestMapState.map.controls.get("zoomControl")) {
      demandRequestMapState.map.controls.add("zoomControl");
    }
    if (!demandRequestMapState.map.controls.get("geolocationControl")) {
      demandRequestMapState.map.controls.add("geolocationControl");
    }
  };

  const buildDemandRequestMapBalloonContent = (point) => {
    const tools = Array.isArray(point?.tools) ? point.tools : [];
    const groupedByResponsible = new Map();

    tools.forEach((tool) => {
      const responsible = String(tool?.responsible ?? "").trim() || "Без ответственного";
      if (!groupedByResponsible.has(responsible)) {
        groupedByResponsible.set(responsible, []);
      }
      groupedByResponsible.get(responsible).push(String(tool?.name ?? "").trim() || "—");
    });

    const groupsMarkup = Array.from(groupedByResponsible.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "ru"))
      .map(([responsible, names]) => {
        const byName = new Map();
        names.forEach((name) => {
          byName.set(name, (byName.get(name) ?? 0) + 1);
        });
        const toolsText = Array.from(byName.entries())
          .sort((a, b) => a[0].localeCompare(b[0], "ru"))
          .map(([name, count]) => (count > 1 ? `${escapeHtml(name)} (${count})` : escapeHtml(name)))
          .join(", ");
        return `
          <div class="demand-request-popup__group">
            <div class="demand-request-popup__responsible">${escapeHtml(responsible)}</div>
            <div class="demand-request-popup__tools">${toolsText || "—"}</div>
          </div>
        `;
      })
      .join("");

    return `
      <div class="demand-request-popup">
        <div class="demand-request-popup__title">${escapeHtml(point?.name || "Объект")}</div>
        <div class="demand-request-popup__subtitle">Интересующие инструменты: ${escapeHtml(
          String(point?.count ?? tools.length)
        )}</div>
        <div class="demand-request-popup__list">${groupsMarkup || "<div class=\"demand-request-popup__empty\">Инструменты не найдены</div>"}</div>
      </div>
    `;
  };

  const buildDemandMapBalloonContent = (point) => {
    const lines = point.items
      .slice(0, 8)
      .map((entry) => {
        const requestedBy = escapeHtml(entry.requestedBy || "Без автора");
        const item = escapeHtml(entry.item || "—");
        const quantity = escapeHtml(String(entry.quantity ?? ""));
        const unit = escapeHtml(String(entry.unit ?? ""));
        return `<div class="demand-map-popup__item">Кому: ${requestedBy} · Нужно: ${item} · Кол-во: ${quantity} ${unit}</div>`;
      })
      .join("");
    const moreLine =
      point.items.length > 8
        ? `<div class="demand-map-popup__more">Ещё ${point.items.length - 8} заявок...</div>`
        : "";
    return `
      <div class="demand-map-popup">
        <div class="demand-map-popup__title">${escapeHtml(point.name)}</div>
        <div class="demand-map-popup__list">${lines}${moreLine}</div>
      </div>
    `;
  };

  const syncInteractiveDemandMap = ({ fitViewport = true } = {}) => {
    if (!demandMapState.map || !window.ymaps) return;
    const safePoints = Array.isArray(demandMapState.points) ? demandMapState.points : [];

    demandMapState.markers.forEach((marker) => {
      demandMapState.map?.geoObjects.remove(marker);
    });
    demandMapState.markers = [];

    if (!safePoints.length) {
      if (fitViewport) {
        demandMapState.map.setCenter([53.9, 27.56], 10, { duration: 240 });
      }
      return;
    }

    const bounds = safePoints
      .map((point) => {
        const lat = Number(point?.coordinates?.lat);
        const lng = Number(point?.coordinates?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return [lat, lng];
      })
      .filter(Boolean);

    if (fitViewport && bounds.length) {
      if (bounds.length === 1) {
        demandMapState.map.setCenter(bounds[0], 15, { duration: 260 });
      } else {
        demandMapState.map.setBounds(bounds, {
          checkZoomRange: true,
          zoomMargin: [34, 34, 34, 34],
          duration: 260,
        });
      }
    }

    safePoints.forEach((point) => {
      const lat = Number(point?.coordinates?.lat);
      const lng = Number(point?.coordinates?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const label = `${point.name} · ${point.count} заявок`;
      const marker = new window.ymaps.Placemark(
        [lat, lng],
        {
          balloonContentBody: buildDemandMapBalloonContent(point),
          hintContent: label,
          iconCaption: String(point.count),
        },
        {
          preset: "islands#blueCircleDotIconWithCaption",
        }
      );
      demandMapState.map.geoObjects.add(marker);
      demandMapState.markers.push(marker);
    });
  };

  const ensureDemandMapReady = async ({ interactive = false } = {}) => {
    if (!demandMapCanvasEl || !demandMapLayerEl) return;

    try {
      await ensureYandexMapsLoaded();
      demandMapState.activated = true;
      demandMapCanvasEl.classList.add("tools-map-canvas--map");
      demandMapPlaceholderEl?.classList.add("is-hidden");
      demandMapImageEl?.classList.add("is-hidden");

      if (!demandMapState.map) {
        demandMapLayerEl.innerHTML = "";
        demandMapState.map = new window.ymaps.Map(
          demandMapLayerEl,
          {
            center: [53.9, 27.56],
            zoom: 10,
            controls: ["zoomControl", "geolocationControl"],
          },
          {
            suppressMapOpenBlock: true,
          }
        );
        window.setTimeout(() => {
          demandMapState.map?.container?.fitToViewport?.();
        }, 80);
      }

      const interactiveBehaviors = ["drag", "scrollZoom", "multiTouch", "dblClickZoom"];
      demandMapState.interactive = Boolean(interactive);
      if (demandMapState.interactive) {
        demandMapCanvasEl.classList.add("tools-map-canvas--interactive");
        demandMapCanvasEl.classList.add("tools-map-canvas--interactive-live");
        demandMapCanvasEl.setAttribute(
          "aria-label",
          "Карта активна. Перемещайте карту и меняйте масштаб"
        );
        interactiveBehaviors.forEach((behaviorName) => {
          demandMapState.map?.behaviors?.enable?.(behaviorName);
        });
      } else {
        demandMapCanvasEl.classList.remove("tools-map-canvas--interactive");
        demandMapCanvasEl.classList.remove("tools-map-canvas--interactive-live");
        demandMapCanvasEl.setAttribute(
          "aria-label",
          "Карта предварительного просмотра. Нажмите, чтобы включить перемещение"
        );
        interactiveBehaviors.forEach((behaviorName) => {
          demandMapState.map?.behaviors?.disable?.(behaviorName);
        });
      }

      syncInteractiveDemandMap();
    } catch (error) {
      console.warn("Не удалось загрузить карту потребности.", error);
      demandMapCanvasEl.setAttribute(
        "aria-label",
        "Не удалось загрузить интерактивную карту, попробуйте позже"
      );
    }
  };

  const awakenDemandMap = async () => {
    if (!demandMapCanvasEl) return;
    await ensureDemandMapReady({ interactive: true });
    demandMapCanvasEl.classList.remove("tools-map-canvas--alive");
    window.requestAnimationFrame(() => {
      demandMapCanvasEl.classList.add("tools-map-canvas--alive");
      window.setTimeout(() => {
        demandMapCanvasEl.classList.remove("tools-map-canvas--alive");
      }, 720);
    });
  };

  const renderDemandMap = () => {
    if (!demandMapCanvasEl) return;
    const points = buildDemandMapPoints();
    demandMapState.points = points;

    if (!points.length) {
      demandMapPlaceholderEl?.classList.remove("is-hidden");
      demandMapCanvasEl.classList.remove("tools-map-canvas--map");
      if (demandMapImageEl) {
        demandMapImageEl.classList.add("is-hidden");
        demandMapImageEl.removeAttribute("src");
      }
      if (demandMapState.activated) {
        syncInteractiveDemandMap({ fitViewport: true });
      }
      return;
    }

    demandMapPlaceholderEl?.classList.add("is-hidden");
    demandMapCanvasEl.classList.add("tools-map-canvas--map");
    const bounds = buildToolsMapBounds(points);
    if (demandMapImageEl) {
      demandMapImageEl.src = buildYandexStaticMapUrl(points, bounds);
      demandMapImageEl.classList.remove("is-hidden");
    }

    void ensureDemandMapReady();
  };

  const demandPathSteps = [
    { id: 1, label: "Сформирована" },
    { id: 2, label: "Принята в работу" },
    { id: 3, label: "В работе" },
    { id: 4, label: "В пути" },
    { id: 5, label: "Получен" },
  ];

  const getDemandPath = (item) => {
    const path = item?.path && typeof item.path === "object" ? item.path : {};
    const doneSteps = Array.isArray(path.doneSteps) ? path.doneSteps : [];
    const normalized = new Set(
      doneSteps
        .map((step) => Number(step))
        .filter((step) => Number.isInteger(step) && step >= 1 && step <= 5)
    );
    normalized.add(1);
    if (item?.status === "done") normalized.add(5);
    const stepDates = path.stepDates && typeof path.stepDates === "object" ? { ...path.stepDates } : {};
    const createdDate = normalizeDemandNeedDate(item?.createdAt ?? item?.date ?? "") || getToday();
    if (!stepDates[1]) stepDates[1] = createdDate;
    if (item?.status === "done" && !stepDates[5]) {
      stepDates[5] = normalizeDemandNeedDate(item?.closedAt ?? item?.updatedAt ?? "") || getToday();
    }
    const legacyComment = String(path.commentStage3 ?? path.comment ?? "").trim();
    const comments = Array.isArray(path.comments)
      ? path.comments
          .map((comment) => {
            if (comment && typeof comment === "object") {
              const text = String(comment.text ?? comment.value ?? "").trim();
              if (!text) return null;
              return {
                text,
                date: normalizeDemandNeedDate(comment.date ?? comment.createdAt ?? "") || "",
              };
            }
            const text = String(comment ?? "").trim();
            return text ? { text, date: "" } : null;
          })
          .filter(Boolean)
      : [];
    if (legacyComment && !comments.some((comment) => comment.text === legacyComment)) {
      comments.push({ text: legacyComment, date: normalizeDemandNeedDate(item?.updatedAt ?? item?.createdAt ?? "") || "" });
    }
    return {
      doneSteps: Array.from(normalized).sort((a, b) => a - b),
      stepDates,
      commentStage3: comments.at(-1)?.text ?? "",
      comments,
    };
  };

  const getDemandPathStepDateLabel = (path, stepId) => {
    const label = formatDemandNeedDate(path.stepDates?.[stepId]);
    return label ? `Выполнено: ${label}` : "";
  };

  const setDemandPathEditable = (isEditable) => {
    demandState.path.editable = Boolean(isEditable);
    demandPathModalEl?.classList.toggle("is-editing", demandState.path.editable);
    if (demandPathEditButton) {
      demandPathEditButton.setAttribute("aria-pressed", String(demandState.path.editable));
      demandPathEditButton.title = demandState.path.editable ? "Сохранить путь" : "Редактировать";
      demandPathEditButton.setAttribute(
        "aria-label",
        demandState.path.editable ? "Сохранить путь заявки" : "Редактировать путь заявки"
      );
      const iconEl = demandPathEditButton.querySelector("span");
      if (iconEl) iconEl.textContent = demandState.path.editable ? "💾" : "✎";
    }
    demandPathStepsEl
      ?.querySelectorAll("input")
      .forEach((input) => {
        input.disabled = !demandState.path.editable || Number(input.value) === 1;
      });
    if (demandPathSaveButton) demandPathSaveButton.disabled = !demandState.path.editable;
  };

  const renderDemandPathModal = (item) => {
    if (!item || !demandPathStepsEl) return;
    const path = getDemandPath(item);
    const doneSet = new Set(path.doneSteps);
    if (demandPathTitleEl) demandPathTitleEl.textContent = "Путь заявки";
    if (demandPathItemEl) demandPathItemEl.textContent = item.item || "Заявка";
    if (demandPathMetaEl) {
      demandPathMetaEl.textContent = `${item.object || "Объект не указан"} · ${item.requestedBy || "Без автора"}`;
    }
    if (demandPathCommentEl) demandPathCommentEl.value = "";
    if (demandPathCommentSavedEl) {
      demandPathCommentSavedEl.innerHTML = "";
      path.comments.forEach((comment, index) => {
        const commentEl = document.createElement("div");
        commentEl.className = "demand-path-comment__item";
        const dateLabel = formatDemandNeedDate(comment.date);
        commentEl.innerHTML = `<span>Комментарий ${index + 1}${dateLabel ? ` · ${dateLabel}` : ""}</span><p>${escapeHtml(comment.text)}</p>`;
        demandPathCommentSavedEl.appendChild(commentEl);
      });
      demandPathCommentSavedEl.classList.toggle("is-hidden", !path.comments.length);
    }
    demandPathCommentFormEl?.classList.add("is-hidden");
    const commentBoxEl = demandPathCommentFormEl?.closest(".demand-path-comment");
    commentBoxEl?.classList.toggle("is-hidden", !path.comments.length);
    demandPathCommentAddButton?.setAttribute("aria-expanded", "false");
    const cardEl = demandPathStepsEl.closest(".demand-path-card");
    const priorityKey = normalizeDemandPriority(item.priority ?? "");
    const isImportant = priorityKey === "red";
    const isClosed = item.status === "done";
    const isOverdue = isClosed ? isDemandClosedLate(item) : isDemandOverdue(item);
    cardEl?.classList.toggle("demand-path-card--important", isImportant);
    cardEl?.classList.toggle("demand-path-card--overdue", isOverdue);
    cardEl?.classList.toggle("demand-path-card--important-overdue", isImportant && isOverdue);
    demandPathStepsEl.innerHTML = "";
    demandPathSteps.forEach((step) => {
      const row = document.createElement("label");
      row.className = `demand-path-step${doneSet.has(step.id) ? " is-done" : ""}`;
      const dateLabel = doneSet.has(step.id) ? getDemandPathStepDateLabel(path, step.id) : "";
      row.innerHTML = `
        <input type="checkbox" value="${step.id}" ${doneSet.has(step.id) ? "checked" : ""} />
        <span class="demand-path-step__dot" aria-hidden="true"></span>
        <span class="demand-path-step__text"><strong>${escapeHtml(step.label)}</strong>${dateLabel ? `<small>${escapeHtml(dateLabel)}</small>` : ""}</span>
      `;
      if (step.id === 3 && demandPathCommentAddButton) {
        row.classList.add("demand-path-step--with-action");
        row.appendChild(demandPathCommentAddButton);
      }
      demandPathStepsEl.appendChild(row);
      if (step.id === 3 && commentBoxEl) {
        demandPathStepsEl.appendChild(commentBoxEl);
      }
    });
    setDemandPathEditable(demandState.path.editable);
  };

  const openDemandPathModal = (item) => {
    if (!demandPathModalEl || !item) return;
    demandState.path.activeId = item.id;
    demandState.path.editable = false;
    if (demandPathMessageEl) demandPathMessageEl.textContent = "";
    renderDemandPathModal(item);
    demandPathModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const closeDemandPathModal = () => {
    if (!demandPathModalEl) return;
    demandPathModalEl.classList.add("is-hidden");
    demandState.path.activeId = null;
    demandState.path.editable = false;
    document.body.style.overflow = demandModalEl?.classList.contains("is-hidden") ? "" : "hidden";
  };

  const renderDemandList = () => {
    if (!demandListEl) return;
    applyDemandFilters();
    demandListEl.innerHTML = "";
    demandState.filtered.forEach((item) => {
      const card = document.createElement("div");
      const priorityKey = normalizeDemandPriority(item.priority ?? "");
      const isImportant = priorityKey === "red";
      const isClosed = item.status === "done";
      const isOverdue = isClosed ? isDemandClosedLate(item) : isDemandOverdue(item);
      card.className = "demand-card";
      if (isImportant) card.classList.add("demand-card--important");
      if (isOverdue) card.classList.add("demand-card--overdue");
      if (isImportant && isOverdue) card.classList.add("demand-card--important-overdue");
      if (isClosed) {
        card.classList.add("is-done");
      }
      const content = document.createElement("div");
      content.className = "demand-card__content";
      const title = document.createElement("div");
      title.className = "demand-card__title";
      const titleName = document.createElement("span");
      titleName.className = "demand-card__name";
      titleName.textContent = item.item;
      const titleQuantity = document.createElement("span");
      titleQuantity.className = "demand-card__quantity";
      titleQuantity.textContent = `×${item.quantity}`;
      if (isImportant || isOverdue) {
        const priorityDot = document.createElement("span");
        priorityDot.className = "demand-chip demand-chip--priority demand-card__priority-dot";
        if (isImportant && isOverdue) {
          priorityDot.classList.add("demand-chip--priority-mixed");
          priorityDot.setAttribute("aria-label", "Важная и просроченная заявка");
          priorityDot.title = "Важная и просроченная";
        } else if (isOverdue) {
          priorityDot.classList.add("demand-chip--priority-overdue");
          priorityDot.setAttribute("aria-label", "Просроченная заявка");
          priorityDot.title = "Просроченная";
        } else {
          priorityDot.classList.add("demand-chip--priority-important");
          priorityDot.setAttribute("aria-label", "Важная заявка");
          priorityDot.title = "Важная";
        }
        title.append(priorityDot);
      }
      title.append(titleName, titleQuantity);

      const meta = document.createElement("div");
      meta.className = "demand-card__meta";
      const needDateLabel = formatDemandNeedDate(item.needDate);
      const needDateText = needDateLabel || "не указано";
      const createdLabel = formatDemandCreatedLabel(item.createdAt);
      const closedDateLabel = formatDemandNeedDate(getDemandClosedDate(item));
      const secondaryDateLabel = isClosed ? closedDateLabel || "—" : createdLabel || "—";
      const secondaryDateTitle = isClosed ? "Дата закрытия" : "Дата создания";
      const metaItems = [
        objectTrackingEnabled ? { icon: "📍", value: item.object || "—" } : null,
        { icon: "👤", value: item.requestedBy || "Без автора" },
      ];
      metaItems.filter(Boolean).forEach(({ icon, value, className }) => {
        const line = document.createElement("div");
        line.className = ["demand-card__meta-line", className].filter(Boolean).join(" ");
        line.innerHTML = `<span class="demand-card__meta-icon" aria-hidden="true">${icon}</span><strong>${escapeHtml(value)}</strong>`;
        meta.appendChild(line);
      });

      const dates = document.createElement("div");
      dates.className = "demand-card__dates";
      [
        { icon: "📅", value: needDateText, title: "Срок заявки" },
        { icon: isClosed ? "✅" : "✨", value: secondaryDateLabel, title: secondaryDateTitle },
      ].forEach(({ icon, value, title }) => {
        const line = document.createElement("div");
        line.className = "demand-card__meta-line demand-card__meta-line--date";
        line.title = title;
        line.setAttribute("aria-label", `${title}: ${value}`);
        line.innerHTML = `<span class="demand-card__meta-icon" aria-hidden="true">${icon}</span><strong>${escapeHtml(value)}</strong>`;
        dates.appendChild(line);
      });
      meta.appendChild(dates);

      const chips = document.createElement("div");
      chips.className = "demand-card__tags";
      if (item.status !== "open") {
        const statusChip = document.createElement("span");
        statusChip.className = "demand-chip demand-chip--done";
        statusChip.textContent = "✅ Закрыта";
        chips.append(statusChip);
      }
      const note = document.createElement("div");
      note.className = "demand-card__note";
      note.textContent = item.note || "";

      const actions = document.createElement("div");
      actions.className = "demand-card__actions";
      const pathButton = document.createElement("button");
      pathButton.type = "button";
      pathButton.className = "demand-action demand-action--path";
      pathButton.dataset.demandAction = "path";
      pathButton.dataset.demandId = item.id;
      pathButton.innerHTML = "📋";
      pathButton.setAttribute("aria-label", "Показать этапы выполнения заявки");
      pathButton.title = "Этапы выполнения заявки";
      const toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = [
        "demand-action",
        "demand-action--primary",
        item.status === "open" ? "demand-action--complete" : "demand-action--restore",
      ].join(" ");
      toggleButton.dataset.demandAction = "toggle";
      toggleButton.dataset.demandId = item.id;
      toggleButton.innerHTML =
        item.status === "open" ? "✓" : "↺";
      toggleButton.setAttribute(
        "aria-label",
        item.status === "open" ? "Закрыть заявку" : "Вернуть в работу"
      );
      toggleButton.title =
        item.status === "open" ? "Закрыть заявку" : "Вернуть в работу";
      const requestMapButton = document.createElement("button");
      requestMapButton.type = "button";
      requestMapButton.className = "demand-action demand-action--map";
      requestMapButton.dataset.demandAction = "map";
      requestMapButton.dataset.demandId = item.id;
      requestMapButton.innerHTML = `<span class="demand-action__map" aria-hidden="true"><span class="demand-action__map-base">🗺️</span><span class="demand-action__map-lens">🔎</span></span>`;
      requestMapButton.setAttribute("aria-label", "Раскрыть карту заявки");
      requestMapButton.title = "Раскрыть карту заявки";
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "demand-action demand-action--edit";
      editButton.dataset.demandAction = "edit";
      editButton.dataset.demandId = item.id;
      editButton.innerHTML = "✎";
      editButton.setAttribute("aria-label", "Изменить заявку");
      editButton.title = "Изменить заявку";
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "demand-action demand-action--danger";
      deleteButton.dataset.demandAction = "delete";
      deleteButton.dataset.demandId = item.id;
      deleteButton.innerHTML = "🗑️";
      deleteButton.setAttribute("aria-label", "Удалить заявку");
      deleteButton.title = "Удалить заявку";
      actions.append(pathButton, deleteButton, requestMapButton, editButton, toggleButton);

      if (!note.textContent) {
        content.append(title, chips, meta);
      } else {
        content.append(title, chips, meta, note);
      }
      card.append(content, actions);
      demandListEl.appendChild(card);
    });
    updateDemandSummary();
    setDemandContentView(demandState.mapView);
    renderDemandMap();
  };

  const loadDemandReferences = async () => {
    try {
      const [objectsRaw, usersData, orgsData, toolsRaw] = await Promise.all([
        loadJson(objectsPath).catch(() => []),
        loadJson(usersFilePath).catch(() => ({ users: [] })),
        loadJson(orgFilePath).catch(() => ({ organizations: [] })),
        loadJson(toolsDatabasePath).catch(() => []),
      ]);
      const objectEntries = normalizeObjectsData(objectsRaw);
      demandState.objects = objectEntries
        .map((item) => item.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "ru"));
      demandState.objectCoordinates = new Map(
        objectEntries
          .filter((item) => item.name && item.coordinates)
          .map((item) => [item.name, item.coordinates])
      );
      const toolsList = normalizeToolsData(toolsRaw);
      const toolSuggestions = new Set();
      demandState.toolsCatalog = toolsList
        .map((tool) => {
          if (!tool || typeof tool !== "object") return null;
          const name = String(tool["Наименование"] ?? "").trim();
          const object = sanitizeObjectName(tool["Объект"] ?? tool.object ?? "");
          const responsible = String(
            tool["Ответственный"] ?? tool.responsible ?? tool.user ?? tool.owner ?? ""
          ).trim();
          if (name) toolSuggestions.add(name);
          if (!name || !object) return null;
          return { name, object, responsible };
        })
        .filter(Boolean);
      demandState.toolSuggestions = Array.from(toolSuggestions).sort((a, b) =>
        a.localeCompare(b, "ru")
      );
      const organizationName =
        context.orgFullName ??
        context.orgShortName ??
        context.orgFolderName ??
        currentUser?.organization ??
        "";
      const orgRecord = findOrganizationRecord(orgsData, organizationName);
      const orgNames = orgRecord ? getOrgNames(orgRecord) : [organizationName];
      const normalizedOrgNames = orgNames
        .map((name) => String(name ?? "").trim())
        .filter(Boolean);
      demandState.users = (usersData.users ?? [])
        .filter((entry) =>
          normalizedOrgNames.includes(String(entry?.organization ?? "").trim()) &&
          !isHiddenListUser(entry)
        )
        .map((entry) => ({
          name: String(entry?.full_name ?? "").trim(),
          role: String(entry?.role ?? "").trim(),
        }))
        .filter((entry) => entry.name)
        .sort((a, b) => a.name.localeCompare(b.name, "ru"));
      renderDemandFilterOptions();
    } catch (error) {
      console.warn("Не удалось загрузить справочники потребностей.", error);
    }
  };

  const loadDemandItems = async () => {
    try {
      const raw = await loadJson(demandPath);
      demandState.items = normalizeDemandData(raw);
    } catch (error) {
      demandState.items = [];
    }
    renderDemandFilterOptions();
    renderDemandList();
  };

  const saveDemandItems = async () => {
    if (demandState.isSaving) return;
    demandState.isSaving = true;
    setDemandMessage("Сохраняем изменения...");
    try {
      await saveJson(demandPath, demandState.items, { user });
      setDemandMessage("Готово! Заявки обновлены.");
    } catch (error) {
      console.error(error);
      setDemandMessage("Не удалось сохранить. Проверьте сервер.");
    } finally {
      demandState.isSaving = false;
    }
  };

  const openDemandModal = async () => {
    if (!demandModalEl) return;
    setDemandFormVisibility(false);
    setDemandFiltersVisibility(false);
    setDemandContentView("list");
    demandModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    resetDemandForm();
    await loadDemandReferences();
    await loadDemandItems();
  };

  const closeDemandModal = () => {
    if (!demandModalEl) return;
    demandModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
    setDemandFormVisibility(false);
    setDemandFiltersVisibility(false);
    setDemandContentView("list");
    closeDemandRequestMapModal();
    closeDemandPathModal();
    resetDemandForm();
    setDemandMessage("");
  };

  const closeDemandRequestMapModal = () => {
    if (!demandRequestMapModalEl) return;
    demandRequestMapModalEl.classList.add("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const openDemandRequestMapModal = async (demandItem) => {
    if (!demandRequestMapModalEl || !demandItem) return;
    demandRequestMapState.selectedDemandId = demandItem.id;

    const mapData = buildDemandRequestMapData(demandItem);
    if (demandRequestMapTitleEl) {
      demandRequestMapTitleEl.textContent = `Карта: ${demandItem.item || "заявка"}`;
    }
    if (demandRequestMapSubtitleEl) {
      const relatedCount = mapData?.relatedPoints?.length ?? 0;
      const baseText = mapData?.query
        ? `Совпадения по "${mapData.query}" на ${relatedCount} объектах`
        : "Нет названия инструмента для поиска";
      demandRequestMapSubtitleEl.textContent = mapData?.targetPoint
        ? `${baseText}. Красная метка — объект заявки.`
        : `${baseText}. Объект заявки без координат.`;
    }

    demandRequestMapModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";

    try {
      await ensureDemandRequestMapReady();
      renderDemandRequestMap(mapData);
      window.setTimeout(() => {
        demandRequestMapState.map?.container?.fitToViewport?.();
      }, 120);
    } catch (error) {
      console.warn("Не удалось открыть карту заявки.", error);
      if (demandRequestMapSubtitleEl) {
        demandRequestMapSubtitleEl.textContent =
          "Не удалось загрузить карту. Попробуйте позже.";
      }
    }
  };

  demandBackdropEl?.addEventListener("click", closeDemandModal);
  demandCloseButton?.addEventListener("click", closeDemandModal);
  demandRequestMapBackdropEl?.addEventListener("click", closeDemandRequestMapModal);
  demandRequestMapCloseButton?.addEventListener("click", closeDemandRequestMapModal);
  demandRequestMapModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDemandRequestMapModal();
    }
  });
  demandPathBackdropEl?.addEventListener("click", closeDemandPathModal);
  demandPathCloseButton?.addEventListener("click", closeDemandPathModal);
  demandPathCancelButton?.addEventListener("click", () => {
    const item = demandState.items.find((entry) => entry.id === demandState.path.activeId);
    demandState.path.editable = false;
    if (item) renderDemandPathModal(item);
  });
  demandPathEditButton?.addEventListener("click", () => {
    if (demandState.path.editable) {
      void saveDemandPathChanges();
      return;
    }
    setDemandPathEditable(true);
  });
  demandPathStepsEl?.addEventListener("change", (event) => {
    const input = event.target.closest("input");
    if (!input) return;
    input.closest(".demand-path-step")?.classList.toggle("is-done", input.checked);
  });
  demandPathCommentAddButton?.addEventListener("click", () => {
    const isOpen = !demandPathCommentFormEl?.classList.contains("is-hidden");
    const commentBoxEl = demandPathCommentFormEl?.closest(".demand-path-comment");
    commentBoxEl?.classList.remove("is-hidden");
    demandPathCommentFormEl?.classList.toggle("is-hidden", isOpen);
    demandPathCommentAddButton.setAttribute("aria-expanded", String(!isOpen));
    if (isOpen && !String(demandPathCommentSavedEl?.textContent ?? "").trim()) {
      commentBoxEl?.classList.add("is-hidden");
    }
    if (!isOpen) demandPathCommentEl?.focus();
  });
  const saveDemandPathChanges = async ({ saveCommentOnly = false } = {}) => {
    const id = demandState.path.activeId;
    if (!id) return;
    if (!saveCommentOnly && !demandState.path.editable) return;
    const currentItem = demandState.items.find((item) => item.id === id);
    const currentPath = getDemandPath(currentItem);
    const checkedSteps = saveCommentOnly
      ? currentPath.doneSteps
      : Array.from(demandPathStepsEl?.querySelectorAll("input:checked") ?? [])
        .map((input) => Number(input.value))
        .filter((step) => Number.isInteger(step));
    if (!checkedSteps.includes(1)) checkedSteps.unshift(1);
    const doneSteps = Array.from(new Set(checkedSteps)).sort((a, b) => a - b);
    const stepDates = { ...currentPath.stepDates };
    doneSteps.forEach((step) => {
      if (!stepDates[step]) stepDates[step] = getToday();
    });
    Object.keys(stepDates).forEach((step) => {
      if (step !== "1" && !doneSteps.includes(Number(step))) delete stepDates[step];
    });
    const newComment = String(demandPathCommentEl?.value ?? "").trim();
    const today = getToday();
    const comments = newComment ? [...currentPath.comments, { text: newComment, date: today }] : currentPath.comments;
    const commentStage3 = comments.at(-1)?.text ?? "";
    const shouldClose = doneSteps.includes(5);
    demandState.items = demandState.items.map((item) =>
      item.id === id
        ? {
            ...item,
            status: shouldClose ? "done" : item.status === "done" ? "open" : item.status,
            updatedAt: getToday(),
            closedAt: shouldClose ? getToday() : item.status === "done" ? "" : item.closedAt,
            path: {
              doneSteps,
              commentStage3,
              comments,
              stepDates,
            },
          }
        : item
    );
    if (demandPathMessageEl) demandPathMessageEl.textContent = saveCommentOnly ? "Сохраняем комментарий..." : "Сохраняем путь...";
    await saveDemandItems();
    const updated = demandState.items.find((item) => item.id === id);
    if (updated) renderDemandPathModal(updated);
    if (!saveCommentOnly) setDemandPathEditable(false);
    if (demandPathMessageEl) demandPathMessageEl.textContent = saveCommentOnly ? "Комментарий сохранён." : "Путь заявки сохранён.";
    renderDemandList();
  };
  demandPathSaveButton?.addEventListener("click", () => saveDemandPathChanges());
  demandPathCommentSaveButton?.addEventListener("click", () => saveDemandPathChanges({ saveCommentOnly: true }));
  demandPathModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDemandPathModal();
  });
  demandFormBackdropEl?.addEventListener("click", () => {
    resetDemandForm();
    setDemandFormVisibility(false);
    setDemandMessage("");
  });
  demandFormCloseButton?.addEventListener("click", () => {
    resetDemandForm();
    setDemandFormVisibility(false);
    setDemandMessage("");
  });
  demandToggleButton?.addEventListener("click", () => {
    resetDemandForm();
    setDemandMessage("");
    setDemandFormVisibility(true);
  });
  demandFiltersToggle?.addEventListener("click", () => {
    if (!demandFiltersPanel) return;
    const isOpen = !demandFiltersPanel.classList.contains("is-hidden");
    setDemandFiltersVisibility(!isOpen);
  });

  demandCancelButton?.addEventListener("click", () => {
    resetDemandForm();
    setDemandFormVisibility(false);
    setDemandMessage("");
  });

  demandDateTriggerEl?.addEventListener("click", () => {
    const isOpen = !demandDateCalendarEl?.classList.contains("is-hidden");
    const selectedDate = parseIsoDateValue(demandDateInput?.value ?? "");
    if (selectedDate) demandDateVisibleMonth = selectedDate;
    setDemandDateCalendarOpen(!isOpen);
  });
  demandDatePrevEl?.addEventListener("click", () => {
    demandDateVisibleMonth = new Date(demandDateVisibleMonth.getFullYear(), demandDateVisibleMonth.getMonth() - 1, 1);
    renderDemandDateCalendar();
  });
  demandDateNextEl?.addEventListener("click", () => {
    demandDateVisibleMonth = new Date(demandDateVisibleMonth.getFullYear(), demandDateVisibleMonth.getMonth() + 1, 1);
    renderDemandDateCalendar();
  });
  demandDateCloseEl?.addEventListener("click", () => {
    setDemandDateCalendarOpen(false);
    demandDateTriggerEl?.focus();
  });
  demandDateDaysEl?.addEventListener("click", (event) => {
    const dayButton = event.target.closest("[data-demand-date-value]");
    if (!dayButton || !demandDateInput) return;
    demandDateInput.value = dayButton.dataset.demandDateValue ?? "";
    demandDateInput.dispatchEvent(new Event("change", { bubbles: true }));
    setDemandDateCalendarOpen(false);
    renderDemandDateCalendar();
  });
  document.addEventListener("click", (event) => {
    if (!demandDatePickerEl || demandDatePickerEl.contains(event.target)) return;
    setDemandDateCalendarOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || demandDateCalendarEl?.classList.contains("is-hidden")) return;
    setDemandDateCalendarOpen(false);
    demandDateTriggerEl?.focus();
  });

  [demandItemInput, demandQuantityInput, demandObjectInput, demandDateInput].forEach(
    (inputEl) => {
      inputEl?.addEventListener("input", updateDemandSteps);
      inputEl?.addEventListener("change", updateDemandSteps);
    }
  );

  demandFormEl?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!demandFormEl) return;
    const title = sanitizeDemandLabel(demandItemInput?.value ?? "");
    const objectRaw = sanitizeDemandLabel(demandObjectInput?.value ?? "");
    const object = objectTrackingEnabled
      ? findOptionMatch(objectRaw, demandState.objects)
      : defaultObjectName;
    const quantity = normalizeNumber(demandQuantityInput?.value ?? 0, 0);
    const unit = "";
    const note = sanitizeDemandLabel(demandNoteInput?.value ?? "");
    const needDate = normalizeDemandNeedDate(demandDateInput?.value ?? "");
    const priority = getSelectedDemandPriority();
    if (!title || quantity <= 0) {
      setDemandMessage("Заполните название и количество.");
      return;
    }
    if (!needDate) {
      setDemandMessage("Укажите дату, когда нужно.");
      return;
    }
    if (objectTrackingEnabled && !object) {
      setDemandMessage(
        demandState.objects.length
          ? "Выберите объект из списка."
          : "В организации нет объектов."
      );
      return;
    }
    const userKey = buildUserKey(user);
    const userName = currentUser?.full_name ?? currentUser?.fullName ?? "Пользователь";
    const now = getToday();
    if (demandState.editingId) {
      demandState.items = demandState.items.map((item) =>
        item.id === demandState.editingId
          ? {
              ...item,
              item: title,
              object,
              quantity,
              unit,
              note,
              priority,
              needDate,
              updatedAt: now,
            }
          : item
      );
    } else {
      demandState.items.unshift({
        id: buildDemandId(),
        item: title,
        object,
        quantity,
        unit,
        note,
        priority,
        status: "open",
        requestedBy: userName,
        requestedById: userKey,
        needDate,
        createdAt: now,
        updatedAt: "",
        path: {
          doneSteps: [1],
          commentStage3: "",
          comments: [],
          stepDates: { 1: now },
        },
      });
    }
    resetDemandForm();
    setDemandFormVisibility(false);
    await saveDemandItems();
    renderDemandFilterOptions();
    renderDemandList();
  });

  demandSearchInput?.addEventListener("input", (event) => {
    demandState.filters.search = String(event.target.value ?? "");
    renderDemandList();
  });

  demandFilterTriggers.forEach((trigger) => {
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", () => {
      const type = trigger.dataset.demandFilterTrigger;
      const menu = contentEl.querySelector(`[data-demand-filter-menu="${type}"]`);
      setDemandDropdownOpen(type, menu?.classList.contains("is-hidden"));
    });
  });

  demandFilterActionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.demandFilterActionType;
      const action = button.dataset.demandFilterAction;
      if (!type || !action) return;
      const values = getDemandFilterOptionValues(type);
      const nextValues = action === "select-all" ? values : type === "status" ? ["open"] : [];
      if (type === "object") demandState.filters.object = nextValues;
      if (type === "user") demandState.filters.user = nextValues;
      if (type === "status") demandState.filters.status = nextValues;
      renderDemandFilterOptions();
      renderDemandList();
    });
  });

  demandFilterOptionsEls.forEach((optionsEl) => {
    optionsEl.addEventListener("click", (event) => {
      const option = event.target.closest("[data-demand-filter-value]");
      if (!option || option.classList.contains("is-empty")) return;
      event.preventDefault();
      const type = optionsEl.dataset.demandFilterOptions;
      const value = String(option.dataset.demandFilterValue ?? "");
      const currentValues = Array.isArray(demandState.filters[type]) ? demandState.filters[type] : [];
      let nextValues = [];
      if (value) {
        nextValues = currentValues.includes(value)
          ? currentValues.filter((item) => item !== value)
          : [...currentValues, value];
      }
      if (type === "status" && !nextValues.length) nextValues = ["open"];
      if (type === "object") demandState.filters.object = nextValues;
      if (type === "user") demandState.filters.user = nextValues;
      if (type === "status") demandState.filters.status = nextValues;
      renderDemandFilterOptions();
      renderDemandList();
    });
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-demand-dropdown]")) return;
    setDemandDropdownOpen("", false);
  });

  demandFilterViewEl?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-demand-view]");
    if (!button) return;
    const view = button.dataset.demandView;
    if (!view) return;
    demandState.filters.view = view;
    demandFilterViewEl
      .querySelectorAll("[data-demand-view]")
      .forEach((element) =>
        element.classList.toggle("is-active", element === button)
      );
    renderDemandList();
  });

  demandMapToggleEl?.addEventListener("click", () => {
    if (!objectTrackingEnabled) return;
    const nextView = demandState.mapView === "map" ? "list" : "map";
    setDemandContentView(nextView);
    if (nextView === "map") {
      renderDemandMap();
      void awakenDemandMap();
    }
  });

  if (demandMapCanvasEl) {
    demandMapCanvasEl.addEventListener("click", () => {
      void awakenDemandMap();
    });
    demandMapCanvasEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      void awakenDemandMap();
    });
  }

  demandListEl?.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-demand-action]");
    if (!action) return;
    const id = action.dataset.demandId;
    const type = action.dataset.demandAction;
    if (!id || !type) return;
    const entry = demandState.items.find((item) => item.id === id);
    if (!entry) return;
    if (type === "edit") {
      startEditDemand(entry);
      return;
    }
    if (type === "path") {
      openDemandPathModal(entry);
      return;
    }
    if (type === "toggle") {
      const nextStatus = entry.status === "open" ? "done" : "open";
      demandState.items = demandState.items.map((item) =>
        item.id === id
          ? (() => {
              const path = getDemandPath(item);
              const doneSteps = new Set(path.doneSteps);
              if (nextStatus === "done") {
                doneSteps.add(5);
              } else {
                doneSteps.delete(5);
              }
              return {
              ...item,
              status: nextStatus,
              updatedAt: getToday(),
              closedAt: nextStatus === "done" ? getToday() : "",
                path: {
                  ...path,
                  doneSteps: Array.from(doneSteps).sort((a, b) => a - b),
                  stepDates: {
                    ...path.stepDates,
                    ...(nextStatus === "done" ? { 5: getToday() } : {}),
                  },
                },
              };
            })()
          : item
      );
      await saveDemandItems();
      renderDemandList();
      return;
    }
    if (type === "delete") {
      const confirmDelete = window.confirm("Удалить эту потребность?");
      if (!confirmDelete) return;
      demandState.items = demandState.items.filter((item) => item.id !== id);
      await saveDemandItems();
      renderDemandList();
      return;
    }
    if (type === "map") {
      await openDemandRequestMapModal(entry);
    }
  });

  const setToolsSubtitle = (text) => {
    if (toolsSubtitleEl) {
      toolsSubtitleEl.textContent = text;
    }
  };

  const setToolsZoneSubtitle = (text = "") => {
    if (!toolsZoneSubtitleEl) return;
    toolsZoneSubtitleEl.textContent = "";
    toolsZoneSubtitleEl.classList.add("is-hidden");
  };

  const setToolsTitle = (text) => {
    if (toolsTitleEl) {
      toolsTitleEl.textContent = text;
    }
    if (toolsPanelEl) {
      toolsPanelEl.setAttribute("aria-label", text);
    }
  };

  const updateToolsReplacementPendingLinkVisibility = () => {
    if (!toolsOpenReplacementPendingButton) return;
    const shouldShow =
      toolsState.mode === "replacement" && Boolean(toolsState.activeReplacementResponsible);
    toolsOpenReplacementPendingButton.classList.toggle("is-hidden", !shouldShow);
  };

  const setToolsResponsibleFilterVisibility = (isVisible) => {
    toolsResponsibleFilterEls.forEach((element) => {
      element.classList.toggle("is-hidden", !isVisible);
    });
  };

  const updateToolsSortToggleUi = () => {
    if (!toolsSortToggleEl) return;
    const isDesc = toolsState.searchSortDirection === "desc";
    if (toolsSortToggleIconEl) {
      const directionClass = isDesc ? "is-desc" : "is-asc";
      toolsSortToggleIconEl.classList.remove("is-desc", "is-asc");
      toolsSortToggleIconEl.classList.add(directionClass);
    }
    toolsSortToggleEl.setAttribute(
      "aria-label",
      isDesc
        ? "Сортировка по номеру инструмента: по убыванию"
        : "Сортировка по номеру инструмента: по возрастанию"
    );
    toolsSortToggleEl.setAttribute(
      "title",
      isDesc
        ? "Сортировка по номеру инструмента: по убыванию"
        : "Сортировка по номеру инструмента: по возрастанию"
    );
  };

  const isRepairLikeMode = () =>
    toolsState.mode === "repair" || toolsState.mode === "write-off-pending";

  const setToolsSortToggleVisibility = () => {
    if (!toolsSortToggleEl) return;
    const shouldShow =
      toolsState.mode === "base" ||
      toolsState.mode === "search" ||
      toolsState.mode === "write-off-pending" ||
      toolsState.mode === "no-accounting-number" ||
      toolsState.mode === "add-photo" ||
      toolsState.mode === "remove-photo" ||
      toolsState.mode === "user" ||
      toolsState.mode === "move-other" ||
      isRepairLikeMode();
    toolsSortToggleEl.classList.toggle("is-hidden", !shouldShow);
  };

  const updateToolsBrokenOnlyToggleUi = () => {
    if (!toolsBrokenOnlyToggleEl) return;
    const isRepairMode = isRepairLikeMode();
    const isPressed = isRepairMode && Boolean(toolsState.repairBrokenOnly);
    toolsBrokenOnlyToggleEl.classList.toggle("is-hidden", !isRepairMode);
    toolsBrokenOnlyToggleEl.classList.toggle("is-active", isPressed);
    toolsBrokenOnlyToggleEl.setAttribute("aria-pressed", isPressed ? "true" : "false");
    const label = isPressed
      ? "Показаны только сломанные инструменты"
      : "Показать только сломанные инструменты";
    toolsBrokenOnlyToggleEl.setAttribute("aria-label", label);
    toolsBrokenOnlyToggleEl.setAttribute("title", isPressed ? "Показаны только сломанные" : "Только сломанные");
  };

  const updateToolsInRepairOnlyToggleUi = () => {
    if (!toolsInRepairOnlyToggleEl) return;
    const isRepairMode = isRepairLikeMode();
    const isPressed = isRepairMode && Boolean(toolsState.repairInRepairOnly);
    const isWriteOffMode = toolsState.mode === "write-off-pending";
    const iconEl = toolsInRepairOnlyToggleEl.querySelector(".tools-filters-toggle__icon");
    if (iconEl) {
      iconEl.textContent = isWriteOffMode ? "🧾" : "🛠️";
    }
    toolsInRepairOnlyToggleEl.classList.toggle("is-hidden", !isRepairMode);
    toolsInRepairOnlyToggleEl.classList.toggle("is-active", isPressed);
    toolsInRepairOnlyToggleEl.setAttribute("aria-pressed", isPressed ? "true" : "false");
    const label = isWriteOffMode
      ? isPressed
        ? "Показаны только инструменты со статусом «На списание»"
        : "Показать только инструменты со статусом «На списание»"
      : isPressed
        ? "Показаны только инструменты в ремонте"
        : "Показать только инструменты в ремонте";
    const title = isWriteOffMode
      ? isPressed
        ? "Показаны только «На списание»"
        : "Только «На списание»"
      : isPressed
        ? "Показаны только в ремонте"
        : "Только в ремонте";
    toolsInRepairOnlyToggleEl.setAttribute("aria-label", label);
    toolsInRepairOnlyToggleEl.setAttribute("title", title);
  };

  const syncToolsSearchPlacement = () => {
    if (!toolsSearchEl || !toolsSearchHomeEl || !toolsListEl) return;
    const shouldPlaceAfterList =
      toolsState.mode === "search" ||
      toolsState.mode === "user" ||
      toolsState.mode === "write-off-pending";
    if (shouldPlaceAfterList) {
      toolsListEl.insertAdjacentElement("afterend", toolsSearchEl);
      return;
    }
    toolsSearchHomeEl.insertBefore(toolsSearchEl, toolsSearchHomeEl.firstChild);
  };

  const setToolsMoveButtonVisibility = () => {
    if (!toolsMoveButtonEl) return;
    const shouldShow = toolsState.mode === "user" || toolsState.mode === "move-other";
    toolsMoveButtonEl.classList.toggle("is-hidden", !shouldShow);
  };

  const syncToolsModalModeClass = () => {
    if (!toolsModalEl) return;
    const isSearchLikeMode =
      toolsState.mode === "base" ||
      toolsState.mode === "search" ||
      toolsState.mode === "no-accounting-number" ||
      toolsState.mode === "add-photo" ||
      toolsState.mode === "remove-photo" ||
      toolsState.mode === "user" ||
      toolsState.mode === "move-other" ||
      isRepairLikeMode();
    toolsModalEl.classList.toggle("tools-modal--my-tools", false);
    toolsModalEl.classList.toggle("tools-modal--searching", isSearchLikeMode);
    toolsModalEl.classList.toggle(
      "tools-modal--global-search",
      toolsState.mode === "search" ||
        toolsState.mode === "user" ||
        toolsState.mode === "write-off-pending"
    );
    toolsModalEl.classList.toggle("tools-modal--search-page", toolsState.mode === "search");
    syncToolsSearchPlacement();
    setToolsSortToggleVisibility();
    updateToolsBrokenOnlyToggleUi();
    updateToolsInRepairOnlyToggleUi();
    setToolsMoveButtonVisibility();
    updateToolsSortToggleUi();
  };

  const isWriteOffPendingMode = () => toolsState.mode === "write-off-pending";

  const setToolsStatusStandaloneVisibility = (isVisible) => {
    toolsStatusFilterDropdownWrapEl?.classList.toggle("is-hidden", isVisible);
    toolsStatusStandaloneWrapEl?.classList.toggle("is-hidden", !isVisible);
  };

  const buildToolSelectionId = (tool, index) => {
    const number = String(tool?.["Номер"] ?? "").trim();
    if (number) return `number:${number}`;
    const accounting = String(tool?.["Бух.номер"] ?? "").trim();
    if (accounting) return `account:${accounting}`;
    return `index:${index}`;
  };

  const setToolsMoveMessage = (text = "", type = "") => {
    if (!toolsMoveMessageEl) return;
    toolsMoveMessageEl.textContent = text;
    toolsMoveMessageEl.classList.remove("is-error", "is-success", "is-info");
    if (type) {
      toolsMoveMessageEl.classList.add(`is-${type}`);
    }
  };

  const setToolsCancelMoveMessage = (text = "", type = "info") => {
    if (!toolsCancelMoveMessageEl) return;
    toolsCancelMoveMessageEl.textContent = text;
    toolsCancelMoveMessageEl.classList.remove("is-error", "is-success", "is-info");
    toolsCancelMoveMessageEl.classList.add(`is-${type}`);
  };

  const setToolsWriteOffPendingConfirmMessage = (text = "", type = "") => {
    if (!toolsWriteOffPendingConfirmMessageEl) return;
    toolsWriteOffPendingConfirmMessageEl.textContent = text;
    toolsWriteOffPendingConfirmMessageEl.classList.remove(
      "is-error",
      "is-success",
      "is-info"
    );
    if (type) {
      toolsWriteOffPendingConfirmMessageEl.classList.add(`is-${type}`);
    }
  };

  const isToolOnWriteOffPendingStatus = (tool) =>
    String(tool?.["Статус"] ?? "").trim().toLocaleLowerCase("ru") === "на списание";

  const syncToolsWriteOffPendingSubmitButtonUi = (tool) => {
    if (!toolsWriteOffPendingConfirmSubmitButton) return;
    if (isToolOnWriteOffPendingStatus(tool)) {
      toolsWriteOffPendingConfirmSubmitButton.textContent = "Исправный";
      toolsWriteOffPendingConfirmSubmitButton.dataset.action = "set-working";
      return;
    }
    toolsWriteOffPendingConfirmSubmitButton.textContent = "На списание";
    toolsWriteOffPendingConfirmSubmitButton.dataset.action = "set-writeoff-pending";
  };

  const buildToolDisplayTitle = (tool) => {
    const number = resolveToolNumberValue(tool);
    const name = String(tool?.["Наименование"] ?? "").trim();
    if (number && name) return `№${number} · ${name}`;
    if (name) return name;
    if (number) return `№${number}`;
    return "Инструмент";
  };

  const buildToolDisplayMeta = (tool) => {
    const accounting = String(tool?.["Бух.номер"] ?? "").trim();
    const object = String(tool?.["Объект"] ?? "").trim();
    const responsible = String(tool?.["Ответственный"] ?? "").trim();
    return [
      accounting ? `Бух.номер: ${accounting}` : "",
      objectTrackingEnabled && object ? `Объект: ${object}` : "",
      responsible ? `Ответственный: ${responsible}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  };

  const renderToolsWriteOffPendingConfirmDetails = (tool) => {
    if (!toolsWriteOffPendingConfirmDetailsEl) return;
    const details = [
      ["Номер", resolveToolNumberValue(tool)],
      ["Бухгалтерский номер", tool?.["Бух.номер"]],
      ["Наименование", tool?.["Наименование"]],
      ["Стоимость", tool?.["Стоимость"]],
      ["Дата покупки", tool?.["Дата покупки"]],
      ["Ответственный", tool?.["Ответственный"]],
      ["Объект", tool?.["Объект"]],
    ];
    toolsWriteOffPendingConfirmDetailsEl.innerHTML = "";
    details
      .filter(([label]) => objectTrackingEnabled || !isObjectRelatedLabel(label))
      .forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "tools-writeoff-pending-confirm-card__detail";
      const labelEl = document.createElement("div");
      labelEl.className = "tools-writeoff-pending-confirm-card__detail-label";
      labelEl.textContent = label;
      const valueEl = document.createElement("div");
      valueEl.className = "tools-writeoff-pending-confirm-card__detail-value";
      valueEl.textContent = formatInfoValue(value);
      row.append(labelEl, valueEl);
      toolsWriteOffPendingConfirmDetailsEl.appendChild(row);
    });
  };

  const resetToolsWriteOffPendingConfirmState = () => {
    toolsWriteOffPendingConfirmState.tool = null;
    toolsWriteOffPendingConfirmState.isSaving = false;
    toolsWriteOffPendingConfirmState.orgFolder = "";
    toolsWriteOffPendingConfirmState.activeHistoryTab = "";
    toolsWriteOffPendingConfirmState.photos = [];
    toolsWriteOffPendingConfirmState.moves = [];
    toolsWriteOffPendingConfirmState.breakdowns = [];
    toolsWriteOffPendingConfirmState.repairs = [];
    if (toolsWriteOffPendingConfirmSubmitButton) {
      toolsWriteOffPendingConfirmSubmitButton.disabled = false;
      toolsWriteOffPendingConfirmSubmitButton.textContent = "Исправный";
      toolsWriteOffPendingConfirmSubmitButton.dataset.action = "set-working";
    }
    if (toolsWriteOffPendingConfirmWriteOffButton) {
      toolsWriteOffPendingConfirmWriteOffButton.disabled = false;
    }
    if (toolsWriteOffPendingConfirmTitleEl) {
      toolsWriteOffPendingConfirmTitleEl.textContent = "—";
    }
    if (toolsWriteOffPendingConfirmMetaEl) {
      toolsWriteOffPendingConfirmMetaEl.textContent = "—";
    }
    if (toolsWriteOffPendingConfirmSubtitleEl) {
      toolsWriteOffPendingConfirmSubtitleEl.textContent = "";
    }
    if (toolsWriteOffPendingConfirmDetailsEl) {
      toolsWriteOffPendingConfirmDetailsEl.innerHTML = "";
    }
    if (toolsWriteOffPendingPhotoEl) {
      toolsWriteOffPendingPhotoEl.removeAttribute("src");
      toolsWriteOffPendingPhotoEl.classList.add("is-hidden");
    }
    if (toolsWriteOffPendingPhotoEmptyEl) {
      toolsWriteOffPendingPhotoEmptyEl.classList.remove("is-hidden");
      toolsWriteOffPendingPhotoEmptyEl.textContent = "Фото инструмента не найдено.";
    }
    if (toolsWriteOffPendingPhotoWrapEl) {
      toolsWriteOffPendingPhotoWrapEl.classList.remove("is-hidden");
    }
    if (toolsWriteOffPendingHistoryPanelEl) {
      toolsWriteOffPendingHistoryPanelEl.classList.add("is-hidden");
    }
    if (toolsWriteOffPendingHistorySummaryEl) {
      toolsWriteOffPendingHistorySummaryEl.textContent = "";
    }
    if (toolsWriteOffPendingHistoryListEl) {
      toolsWriteOffPendingHistoryListEl.innerHTML = "";
    }
    if (toolsWriteOffPendingHistoryEmptyEl) {
      toolsWriteOffPendingHistoryEmptyEl.classList.add("is-hidden");
      toolsWriteOffPendingHistoryEmptyEl.textContent = "";
    }
    toolsWriteOffPendingHistoryTabButtons.forEach((button) => {
      button.classList.remove("is-active");
      button.setAttribute("aria-selected", "false");
    });
    setToolsWriteOffPendingConfirmMessage();
  };

  const renderToolsWriteOffPendingHistory = (tab) => {
    if (!toolsWriteOffPendingHistorySummaryEl || !toolsWriteOffPendingHistoryListEl) return;
    toolsWriteOffPendingHistoryListEl.innerHTML = "";
    const entries =
      tab === "moves"
        ? toolsWriteOffPendingConfirmState.moves
        : tab === "breakdowns"
          ? toolsWriteOffPendingConfirmState.breakdowns
          : toolsWriteOffPendingConfirmState.repairs;
    const tabLabel =
      tab === "moves" ? "Перемещения" : tab === "breakdowns" ? "Поломки" : "Ремонты";
    toolsWriteOffPendingHistorySummaryEl.textContent = `${tabLabel}: ${entries.length}`;
    if (toolsWriteOffPendingHistoryEmptyEl) {
      toolsWriteOffPendingHistoryEmptyEl.classList.toggle("is-hidden", entries.length > 0);
      toolsWriteOffPendingHistoryEmptyEl.textContent = `${tabLabel} не найдены.`;
    }
    if (!entries.length) return;
    entries.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "tools-info-item";
      const title = document.createElement("div");
      title.className = "tools-info-item__title";
      const dateLabel =
        tab === "moves"
          ? entry?.["Дата перемещения"]
          : tab === "breakdowns"
            ? entry?.["Дата поломки"]
            : entry?.["Дата отправки в ремонт"];
      title.textContent = formatInfoValue(dateLabel);
      const grid = document.createElement("div");
      grid.className = "tools-info-item__grid";
      if (tab === "moves") {
        grid.append(
          ...[
            objectTrackingEnabled ? buildToolsInfoRow("Откуда", entry?.["Старый объект"]) : null,
            objectTrackingEnabled ? buildToolsInfoRow("Куда", entry?.["Новый объект"]) : null,
            buildToolsInfoRow("Переместил", entry?.["Переместил"]),
          ].filter(Boolean)
        );
      } else if (tab === "breakdowns") {
        grid.append(
          buildToolsInfoRow("Описание", entry?.["Описание поломки"]),
          buildToolsInfoRow("Дата ремонта", entry?.["Дата ремонта"] || "Сломан"),
          buildToolsInfoRow("Ответственный", entry?.["Ответственный"])
        );
      } else {
        grid.append(
          buildToolsInfoRow("Организация", entry?.["Организация"]),
          buildToolsInfoRow("Дата ремонта", entry?.["Дата ремонта"] || "В ремонте"),
          buildToolsInfoRow("Ответственный", entry?.["Ответственный"])
        );
      }
      item.append(title, grid);
      toolsWriteOffPendingHistoryListEl.appendChild(item);
    });
  };

  const setToolsWriteOffPendingHistoryTab = (tab = "") => {
    toolsWriteOffPendingConfirmState.activeHistoryTab = tab;
    const hasTab = Boolean(tab);
    if (toolsWriteOffPendingPhotoWrapEl) {
      toolsWriteOffPendingPhotoWrapEl.classList.toggle("is-hidden", hasTab);
    }
    if (toolsWriteOffPendingHistoryPanelEl) {
      toolsWriteOffPendingHistoryPanelEl.classList.toggle("is-hidden", !hasTab);
    }
    toolsWriteOffPendingHistoryTabButtons.forEach((button) => {
      const isActive = hasTab && button.dataset.toolsWriteoffPendingHistoryTab === tab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    if (hasTab) {
      renderToolsWriteOffPendingHistory(tab);
    }
  };

  const loadToolsWriteOffPendingConfirmDetails = async (tool) => {
    const orgFolder = toolsWriteOffPendingConfirmState.orgFolder;
    if (!tool || !orgFolder) return;
    const matcher = buildToolsInfoMatcher(tool);
    const primaryPhotoNumber = resolveToolPhotoNumber(tool);
    const toolNumber = String(tool?.["Номер"] ?? "").trim();
    const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
    try {
      const { files: photoFiles = [] } = await loadToolPhotoFiles(
        orgFolder,
        primaryPhotoNumber,
        toolNumber,
        accountingNumber
      );
      const isSameTool = toolsWriteOffPendingConfirmState.tool === tool;
      if (!isSameTool) return;
      toolsWriteOffPendingConfirmState.photos = Array.isArray(photoFiles) ? photoFiles : [];
      const firstPhoto = toolsWriteOffPendingConfirmState.photos[0];
      if (toolsWriteOffPendingPhotoEl && firstPhoto?.url) {
        toolsWriteOffPendingPhotoEl.src = firstPhoto.url;
        toolsWriteOffPendingPhotoEl.classList.remove("is-hidden");
      } else if (toolsWriteOffPendingPhotoEl) {
        toolsWriteOffPendingPhotoEl.classList.add("is-hidden");
      }
      if (toolsWriteOffPendingPhotoEmptyEl) {
        toolsWriteOffPendingPhotoEmptyEl.classList.toggle("is-hidden", Boolean(firstPhoto?.url));
      }

      const [rawMoves, rawBreakdowns, rawRepairs] = await Promise.all([
        loadJson(`./${orgFolder}/Перемещения.json`).catch(() => []),
        loadJson(`./${orgFolder}/Поломки.json`).catch(() => []),
        loadJson(`./${orgFolder}/Ремонты.json`).catch(() => []),
      ]);
      if (toolsWriteOffPendingConfirmState.tool !== tool) return;
      const moves = Array.isArray(rawMoves)
        ? rawMoves
        : Array.isArray(rawMoves?.moves)
          ? rawMoves.moves
          : [];
      const breakdowns = Array.isArray(rawBreakdowns)
        ? rawBreakdowns
        : Array.isArray(rawBreakdowns?.breakdowns)
          ? rawBreakdowns.breakdowns
          : [];
      const repairs = Array.isArray(rawRepairs)
        ? rawRepairs
        : Array.isArray(rawRepairs?.repairs)
          ? rawRepairs.repairs
          : [];
      toolsWriteOffPendingConfirmState.moves = moves.filter(matcher);
      toolsWriteOffPendingConfirmState.breakdowns = breakdowns.filter(matcher);
      toolsWriteOffPendingConfirmState.repairs = repairs.filter(matcher);
      if (toolsWriteOffPendingConfirmState.activeHistoryTab) {
        renderToolsWriteOffPendingHistory(
          toolsWriteOffPendingConfirmState.activeHistoryTab
        );
      }
    } catch (error) {
      console.warn("Не удалось загрузить фото и историю инструмента.", error);
    }
  };

  const closeToolsWriteOffPendingConfirmModal = () => {
    if (!toolsWriteOffPendingConfirmModalEl) return;
    toolsWriteOffPendingConfirmModalEl.classList.add("is-hidden");
    if (toolsModalEl && !toolsModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    resetToolsWriteOffPendingConfirmState();
  };

  const openToolsWriteOffPendingConfirmModal = (tool) => {
    if (!toolsWriteOffPendingConfirmModalEl || !tool) return;
    toolsWriteOffPendingConfirmState.tool = tool;
    toolsWriteOffPendingConfirmState.isSaving = false;
    toolsWriteOffPendingConfirmState.orgFolder =
      toolsState.orgFolder || context.orgFolderName || "";
    if (toolsWriteOffPendingConfirmSubmitButton) {
      toolsWriteOffPendingConfirmSubmitButton.disabled = false;
    }
    syncToolsWriteOffPendingSubmitButtonUi(tool);
    if (toolsWriteOffPendingConfirmTitleEl) {
      toolsWriteOffPendingConfirmTitleEl.textContent = buildToolDisplayTitle(tool);
    }
    if (toolsWriteOffPendingConfirmMetaEl) {
      const meta = buildToolDisplayMeta(tool);
      toolsWriteOffPendingConfirmMetaEl.textContent = meta || "Без дополнительных данных";
    }
    renderToolsWriteOffPendingConfirmDetails(tool);
    if (toolsWriteOffPendingConfirmSubtitleEl) {
      toolsWriteOffPendingConfirmSubtitleEl.textContent = "";
    }
    setToolsWriteOffPendingConfirmMessage();
    setToolsWriteOffPendingHistoryTab("");
    toolsWriteOffPendingConfirmModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    void loadToolsWriteOffPendingConfirmDetails(tool);
  };

  const setToolsEditMessage = (text = "", type = "") => {
    if (!toolsEditMessageEl) return;
    toolsEditMessageEl.textContent = text;
    toolsEditMessageEl.classList.remove("is-error", "is-success", "is-info");
    if (type) {
      toolsEditMessageEl.classList.add(`is-${type}`);
    }
  };

  const buildToolsEditMatcher = (tool) => {
    const number = normalizeToolNumberValue(tool?.["Номер"] ?? "");
    const accounting = String(tool?.["Бух.номер"] ?? "").trim();
    return (entry) => {
      if (number) {
        const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
        if (entryNumber === number) return true;
      }
      if (accounting) {
        const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
        if (entryAccounting === accounting) return true;
      }
      return false;
    };
  };

  const updateToolsEditPhotoCount = (count) => {
    const hasPhotos = Number(count) > 0;
    if (toolsEditPhotoCountEl) {
      toolsEditPhotoCountEl.textContent = String(count ?? 0);
      toolsEditPhotoCountEl.disabled = !hasPhotos;
      toolsEditPhotoCountEl.setAttribute(
        "aria-label",
        hasPhotos ? "Открыть фото инструмента" : "У инструмента нет фото"
      );
    }
    if (toolsEditRemovePhotoButton) {
      toolsEditRemovePhotoButton.disabled = !hasPhotos;
    }
  };

  const openToolsEditPhotoViewer = async () => {
    const tool = toolsEditState.tool;
    if (!tool) return;
    const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
    if (!(Number.isFinite(photoCount) && photoCount > 0)) return;
    await openPendingMovePhotoViewer({
      tool,
      fallbackNumber: resolveToolNumberValue(tool),
      title: buildToolDisplayTitle(tool),
    });
  };

  const resetToolsCancelMoveState = () => {
    toolsCancelMoveState.move = null;
    toolsCancelMoveState.moveIndex = null;
    toolsCancelMoveState.tool = null;
    toolsCancelMoveState.movesPayload = null;
    toolsCancelMoveState.isSaving = false;
    if (toolsCancelMoveConfirmButton) {
      toolsCancelMoveConfirmButton.disabled = true;
    }
  };

  const buildToolsCancelMoveInfo = (tool, move) => {
    const nameParts = [
      String(tool?.["Наименование"] ?? "").trim(),
      String(tool?.["Производитель"] ?? "").trim(),
      String(tool?.["Модель"] ?? "").trim(),
    ].filter(Boolean);
    const title = nameParts.length ? nameParts.join(" ") : "—";
    const number =
      String(move?.["Номер"] ?? "").trim() ||
      String(tool?.["Номер"] ?? "").trim() ||
      resolveToolNumberValue(tool) ||
      "—";
    const accountingNumber =
      String(move?.["Бух.номер"] ?? "").trim() ||
      String(tool?.["Бух.номер"] ?? "").trim() ||
      "—";
    const responsible = String(move?.["Принял"] ?? "").trim() || "—";
    const targetObject = String(move?.["Новый объект"] ?? "").trim() || "—";
    const moveDate = String(move?.["Дата перемещения"] ?? "").trim() || "—";
    return [
      `Инструмент: ${title}`,
      `Номер: ${number}`,
      `Бух.номер: ${accountingNumber}`,
      `Новый ответственный: ${responsible}`,
      objectTrackingEnabled ? `Новый объект: ${targetObject}` : "",
      `Дата перемещения: ${moveDate}`,
    ].filter(Boolean).join("\n");
  };

  const isToolSelectableForMove = (tool) => {
    if (
      toolsState.mode === "base" ||
      toolsState.mode === "search" ||
      toolsState.mode === "no-accounting-number" ||
      toolsState.mode === "write-off-pending" ||
      toolsState.mode === "repair"
    )
      return false;
    if (!tool) return false;
    if (tool.__pendingMove) return false;
    if (toolsState.mode === "move-other") return true;
    const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
    const hasPhoto = Number.isFinite(photoCount) && photoCount > 0;
    return hasPhoto;
  };

  const selectAllToolsForMove = () => {
    if (
      toolsState.mode === "base" ||
      toolsState.mode === "search" ||
      toolsState.mode === "no-accounting-number" ||
      toolsState.mode === "write-off-pending" ||
      toolsState.mode === "repair"
    ) return;
    const selectableIds = toolsState.filtered
      .filter((tool) => isToolSelectableForMove(tool))
      .map((tool) => String(tool?.__selectionId ?? "").trim())
      .filter(Boolean);
    if (!selectableIds.length) return;
    toolsState.isSelecting = true;
    const allAlreadySelected = selectableIds.every((id) =>
      toolsState.selectedIds.has(id)
    );
    if (allAlreadySelected) {
      selectableIds.forEach((id) => toolsState.selectedIds.delete(id));
    } else {
      selectableIds.forEach((id) => toolsState.selectedIds.add(id));
    }
    updateToolsSelectionUi();
    renderToolsList();
  };

  const updateToolsSelectionUi = () => {
    if (
      toolsState.mode === "base" ||
      toolsState.mode === "search" ||
      toolsState.mode === "no-accounting-number" ||
      isRepairLikeMode()
    ) {
      toolsState.isSelecting = false;
      toolsState.selectedIds.clear();
      if (toolsMoveButtonEl) {
        toolsMoveButtonEl.disabled = true;
      }
      if (toolsSelectionCancelButtonEl) {
        toolsSelectionCancelButtonEl.disabled = true;
      }
      if (toolsSelectionSelectAllButtonEl) {
        toolsSelectionSelectAllButtonEl.disabled = true;
        toolsSelectionSelectAllButtonEl.classList.remove("is-active");
        toolsSelectionSelectAllButtonEl.setAttribute("aria-pressed", "false");
      }
      if (toolsSelectionCountEl) {
        toolsSelectionCountEl.classList.add("is-hidden");
      }
      if (toolsModalEl) {
        toolsModalEl.classList.remove("tools-modal--selecting");
      }
      return;
    }
    const count = toolsState.selectedIds.size;
    if (toolsMoveButtonEl) {
      toolsMoveButtonEl.disabled = count === 0;
    }
    if (toolsSelectionCancelButtonEl) {
      toolsSelectionCancelButtonEl.disabled = false;
    }
    if (toolsSelectionSelectAllButtonEl) {
      const selectableIds = toolsState.filtered
        .filter((tool) => isToolSelectableForMove(tool))
        .map((tool) => String(tool?.__selectionId ?? "").trim())
        .filter(Boolean);
      const selectableCount = selectableIds.length;
      toolsSelectionSelectAllButtonEl.disabled = selectableCount === 0;
      const allSelected =
        selectableCount > 0 &&
        selectableIds.every((id) => toolsState.selectedIds.has(id));
      toolsSelectionSelectAllButtonEl.classList.toggle("is-active", allSelected);
      toolsSelectionSelectAllButtonEl.setAttribute("aria-pressed", allSelected ? "true" : "false");
    }
    if (toolsSelectionCountEl) {
      toolsSelectionCountEl.textContent = String(count);
      toolsSelectionCountEl.classList.toggle("is-hidden", !toolsState.isSelecting);
    }
    if (toolsMoveSubtitleEl) {
      if (count > 0) {
        const selectedTools = Array.from(toolsState.selectedIds)
          .map((id) => toolsState.toolMap.get(id))
          .filter(Boolean);
        const previewLimit = 6;
        const previewRows = selectedTools
          .slice(0, previewLimit)
          .map((tool) => {
            const number = escapeHtml(String(tool?.["Номер"] ?? "—").trim() || "—");
            const name = escapeHtml(String(tool?.["Наименование"] ?? "—").trim() || "—");
            const maker = escapeHtml(String(tool?.["Производитель"] ?? "—").trim() || "—");
            const model = escapeHtml(String(tool?.["Модель"] ?? "—").trim() || "—");
            return `<div>№ ${number} • ${name} • ${maker} • ${model}</div>`;
          })
          .join("");
        const remainingCount =
          selectedTools.length > previewLimit
            ? `<div>И ещё: ${selectedTools.length - previewLimit}</div>`
            : "";
        toolsMoveSubtitleEl.innerHTML = `
          <div>Выбрано инструментов: ${count}</div>
          <div style="display:grid;gap:4px;margin-top:6px;font-size:13px;">${previewRows}${remainingCount}</div>
        `;
      } else {
        toolsMoveSubtitleEl.textContent = "Выберите ответственного и объект";
      }
    }
    if (toolsModalEl) {
      toolsModalEl.classList.toggle("tools-modal--selecting", toolsState.isSelecting);
    }
  };

  const resetToolsSelection = () => {
    toolsState.isSelecting = false;
    toolsState.selectedIds.clear();
    updateToolsSelectionUi();
  };

  const resolveToolsNumberConfig = async () => {
    const fallback = { numberKey: "Номер", numberLabel: "Номер" };
    const orgName =
      context.orgFullName ??
      context.orgShortName ??
      user?.organization ??
      "";
    if (!orgName) return fallback;
    try {
      const orgData = await loadJson(orgFilePath);
      const orgRecord = findOrganizationRecord(orgData, orgName);
      const normalizedType = String(orgRecord?.number_type ?? "")
        .trim()
        .toLowerCase();
      const shouldUseAccountingNumber =
        normalizedType === "бухгалтерский номер";
      return {
        numberKey: shouldUseAccountingNumber ? "Бух.номер" : "Номер",
        numberLabel: shouldUseAccountingNumber ? "Бух.номер" : "Номер",
      };
    } catch (error) {
      console.warn("Не удалось определить тип номера организации.", error);
      return fallback;
    }
  };

  const isCompactToolsSearchMode = () =>
    ["search", "user", "write-off-pending"].includes(toolsState.mode);

  const syncToolsSearchPlaceholder = () => {
    if (!toolsSearchInput) return;
    const searchLabel =
      toolsState.numberLabel === "Бух.номер" ? "бух.номеру" : "номеру";
    const shouldHideSearchPlaceholder = isCompactToolsSearchMode();
    toolsSearchInput.placeholder = shouldHideSearchPlaceholder
      ? ""
      : `Поиск по ${searchLabel}, названию, модели...`;
    toolsSearchInput.setAttribute(
      "aria-label",
      shouldHideSearchPlaceholder
        ? "Поиск"
        : `Поиск по ${searchLabel}, названию, модели`
    );
  };

  const updateToolsNumberConfig = ({ numberKey, numberLabel }) => {
    toolsState.numberKey = numberKey;
    toolsState.numberLabel = numberLabel;
    syncToolsSearchPlaceholder();
  };

  const resolveToolNumberValue = (tool) => {
    const primary = String(tool?.[toolsState.numberKey] ?? "").trim();
    if (primary) return primary;
    const fallbackKey = toolsState.numberKey === "Бух.номер" ? "Номер" : "Бух.номер";
    return String(tool?.[fallbackKey] ?? "").trim();
  };

  const resolveToolPhotoNumber = (tool) => {
    const byNumber = String(tool?.["Номер"] ?? "").trim();
    return byNumber || resolveToolNumberValue(tool);
  };

  const resolveToolStatusTone = (tool) => {
    const status = String(tool?.["Статус"] ?? "").trim().toLowerCase();
    if (status === "сломан") return "broken";
    if (status === "в ремонте" || status === "ремонт") return "repair";
    if (status === "на списание") return "writeoff";
    return "";
  };

  const pluralizeDaysValue = (count) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return "день";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
    return "дней";
  };

  const formatDaysValue = (count) =>
    `${count} ${pluralizeDaysValue(Math.abs(count))}`;

  const formatInfoValue = (value) => {
    const raw = String(value ?? "").trim();
    return raw || "—";
  };

  const formatResponsibleShortName = (value) => {
    const parts = String(value ?? "").trim().split(/\s+/u).filter(Boolean);
    if (parts.length <= 2) return parts.join(" ") || "—";
    return parts.slice(0, 2).join(" ");
  };

  const resolveToolStatusColor = (tool, value) => {
    const status = String(value ?? tool?.["Статус"] ?? "").trim().toLowerCase();
    const tone = tool?.__statusTone || resolveToolStatusTone(tool);
    if (tone === "broken" || status === "сломан") return "#facc15";
    if (tone === "repair" || status === "в ремонте" || status === "ремонт") return "#fb923c";
    if (tone === "writeoff" || status === "на списание") return "#ef4444";
    if (Boolean(tool?.__pendingMove) || status === "в процессе перемещения" || status === "перемещается") return "#3b82f6";
    if (status === "рабочий" || status === "исправный") return "#22c55e";
    return "#94a3b8";
  };

  const formatSearchCostValue = (value) => {
    const normalizedValue = formatInfoValue(value);
    if (normalizedValue === "—") return normalizedValue;
    if (/(?:\bр\.?\b|₽|руб\.?|рублей|рубля)/iu.test(normalizedValue)) {
      return normalizedValue;
    }
    return `${normalizedValue} р.`;
  };

  const getToolKitItems = (tool) => {
    const rawKit = Array.isArray(tool?.["Комплектация"]) ? tool["Комплектация"] : [];
    return rawKit
      .map((item) => ({
        "Наименование": String(item?.["Наименование"] ?? "").trim(),
        "Количество": String(item?.["Количество"] ?? "").trim(),
        "Бух.номер": String(item?.["Бух.номер"] ?? "").trim(),
      }))
      .filter(
        (item) => item["Наименование"] || item["Количество"] || item["Бух.номер"]
      );
  };

  const closeToolsKitPreviewModal = () => {
    toolsKitPreviewModalEl.classList.add("is-hidden");
  };

  const openToolsKitPreviewModal = (tool) => {
    if (!toolsKitPreviewListEl) return;
    const items = getToolKitItems(tool);
    if (!items.length) return;
    const toolLabel =
      resolveToolNumberValue(tool) ||
      String(tool?.["Наименование"] ?? "").trim() ||
      "Инструмент";
    if (toolsKitPreviewTitleEl) {
      toolsKitPreviewTitleEl.textContent = `Комплектация · ${toolLabel}`;
    }
    toolsKitPreviewListEl.innerHTML = "";
    items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "tools-kit-preview-modal__item";
      const countLabel = formatInfoValue(item["Количество"]);
      const accountingLabel = formatInfoValue(item["Бух.номер"]);
      row.innerHTML = `
        <div class="tools-kit-preview-modal__item-title">${index + 1}. ${escapeHtml(
          formatInfoValue(item["Наименование"])
        )}</div>
        <div class="tools-kit-preview-modal__item-meta">
          <span>Кол-во: ${escapeHtml(countLabel)}</span>
          <span>Бух.номер: ${escapeHtml(accountingLabel)}</span>
        </div>
      `;
      toolsKitPreviewListEl.appendChild(row);
    });
    toolsKitPreviewModalEl.classList.remove("is-hidden");
  };

  const formatDateWithDays = ({ dateLabel, startDate, endDate }) => {
    if (!startDate) return formatInfoValue(dateLabel);
    const safeEndDate = endDate || new Date();
    const days = getDaysDifference(safeEndDate, startDate);
    const label = dateLabel || "—";
    return `${label} · ${formatDaysValue(days)}`;
  };

  const buildToolsInfoRow = (label, value) => {
    const row = document.createElement("div");
    row.className = "tools-info-item__row";
    const labelEl = document.createElement("span");
    labelEl.className = "tools-info-item__label";
    labelEl.textContent = label;
    const valueEl = document.createElement("span");
    valueEl.className = "tools-info-item__value";
    valueEl.textContent = formatInfoValue(value);
    row.append(labelEl, valueEl);
    return row;
  };

  const applyToolStatusClasses = (element, tool) => {
    if (!element) return;
    element.classList.toggle("tools-item--broken", tool.__statusTone === "broken");
    element.classList.toggle("tools-item--repair", tool.__statusTone === "repair");
    element.classList.toggle(
      "tools-item--writeoff",
      tool.__statusTone === "writeoff"
    );
  };

  const loadPendingMoves = async (orgFolder) => {
    const pendingNumbers = new Set();
    const pendingAccountingNumbers = new Set();
    if (!orgFolder) {
      return { pendingNumbers, pendingAccountingNumbers };
    }
    const movesPath = `./${orgFolder}/Перемещения.json`;
    try {
      const rawMoves = await loadJson(movesPath);
      const moves = Array.isArray(rawMoves)
        ? rawMoves
        : Array.isArray(rawMoves?.moves)
          ? rawMoves.moves
          : [];
      moves.forEach((move) => {
        const responseDate = String(move?.["Дата ответа"] ?? "").trim();
        if (responseDate) return;
        const number = String(move?.["Номер"] ?? "").trim();
        const accounting = String(move?.["Бух.номер"] ?? "").trim();
        if (number) pendingNumbers.add(number);
        if (accounting) pendingAccountingNumbers.add(accounting);
      });
    } catch (error) {
      console.warn("Не удалось загрузить перемещения.", error);
    }
    return { pendingNumbers, pendingAccountingNumbers };
  };

  const resolveLateReplyFine = (move, fineConfig) => {
    if (!fineConfig?.enabled) return 0;
    const daysLimit = normalizeNumber(fineConfig.days, 0);
    const amount = normalizeNumber(fineConfig.amount, 0);
    if (!amount) return 0;
    const moveDate = parseDateValue(move?.["Дата перемещения"]);
    if (!moveDate) return 0;
    const diffDays = getDaysDifference(new Date(), moveDate);
    if (diffDays <= daysLimit) return 0;
    const chargedDays = Math.max(0, diffDays - 1);
    return chargedDays * amount;
  };

  const buildPendingToolsMap = async (orgFolder) => {
    const map = new Map();
    if (!orgFolder) return map;
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    try {
      const raw = await loadJson(toolsPath);
      const tools = Array.isArray(raw) ? raw : Array.isArray(raw?.tools) ? raw.tools : [];
      tools.forEach((tool) => {
        const number = String(tool?.["Номер"] ?? "").trim();
        const accounting = String(tool?.["Бух.номер"] ?? "").trim();
        if (number) map.set(`n:${number}`, tool);
        if (accounting) map.set(`a:${accounting}`, tool);
        const normalizedNumber = normalizeToolNumberValue(number);
        const normalizedAccounting = normalizeToolNumberValue(accounting);
        if (normalizedNumber && !map.has(`nn:${normalizedNumber}`)) {
          map.set(`nn:${normalizedNumber}`, tool);
        }
        if (normalizedAccounting && !map.has(`an:${normalizedAccounting}`)) {
          map.set(`an:${normalizedAccounting}`, tool);
        }
      });
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов для перемещений.", error);
    }
    return map;
  };

  const resolvePendingToolByMove = (toolMap, move) => {
    if (!(toolMap instanceof Map) || !move) return null;
    const number = String(move?.["Номер"] ?? "").trim();
    const accounting = String(move?.["Бух.номер"] ?? "").trim();
    const normalizedNumber = normalizeToolNumberValue(number);
    const normalizedAccounting = normalizeToolNumberValue(accounting);
    return (
      toolMap.get(`n:${number}`) ??
      toolMap.get(`a:${accounting}`) ??
      toolMap.get(`nn:${normalizedNumber}`) ??
      toolMap.get(`an:${normalizedAccounting}`) ??
      null
    );
  };

  const isOwnAwaitingReplyMove = (move, currentUserName) => {
    if (!move || !currentUserName) return false;
    const movedByEnergy = normalizePersonName(move?.["Переместил энергетик"] ?? "");
    if (movedByEnergy) {
      const previousResponsible = normalizePersonName(
        move?.["Ответственный до перемещения"] ?? ""
      );
      return Boolean(previousResponsible && previousResponsible === currentUserName);
    }

    const movedBy = normalizePersonName(move?.["Переместил"] ?? "");
    if (!movedBy || movedBy !== currentUserName) return false;
    const previousResponsible = normalizePersonName(
      move?.["Ответственный до перемещения"] ?? ""
    );
    if (previousResponsible && previousResponsible !== currentUserName) {
      return false;
    }
    return true;
  };

  const syncToolsViewButtons = () => {
    toolsViewButtons.forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.toolsView === toolsState.view
      );
    });
    if (toolsSearchMapViewButtonEl) {
      toolsSearchMapViewButtonEl.classList.toggle(
        "is-active",
        toolsState.view === "map"
      );
    }
  };

  const canUseToolsMapView = () =>
    objectTrackingEnabled &&
    (toolsState.mode === "search" ||
      toolsState.mode === "no-accounting-number" ||
      toolsState.mode === "user");

  const sortToolsByNumber = (tools) => {
    const direction = toolsState.searchSortDirection === "asc" ? 1 : -1;
    return [...tools].sort((a, b) =>
      resolveToolNumberValue(a).localeCompare(resolveToolNumberValue(b), "ru", {
        numeric: true,
      }) * direction
    );
  };

  const getToolGroupingValue = (tool) => {
    if (!tool || toolsState.grouping === "none") return "";
    const normalizeGroupingStatusLabel = (rawStatus, movingNow = false) => {
      if (movingNow) return "Перемещается";
      const normalized = String(rawStatus ?? "").trim().toLocaleLowerCase("ru");
      if (!normalized) return "Не указан";
      if (normalized === "рабочий") return "Исправный";
      if (normalized === "в процессе перемещения") return "Перемещается";
      return String(rawStatus ?? "").trim();
    };
    if (toolsState.grouping === "responsible") {
      return formatFullName(String(tool?.["Ответственный"] ?? "").trim()) || "Не назначен";
    }
    if (toolsState.grouping === "object") {
      return objectTrackingEnabled
        ? String(tool?.["Объект"] ?? "").trim() || "Без объекта"
        : "";
    }
    if (toolsState.grouping === "status") {
      return normalizeGroupingStatusLabel(tool?.["Статус"], Boolean(tool?.__pendingMove));
    }
    if (toolsState.grouping === "name") {
      return String(tool?.["Наименование"] ?? "").trim() || "Без названия";
    }
    if (toolsState.grouping === "group") {
      return String(tool?.["Граппа инструментов"] ?? "").trim() || "Без группы";
    }
    return "";
  };

  const buildToolsGroupTitle = (group) => {
    const titleEl = document.createElement("div");
    titleEl.className = "tools-group-title";
    const labelEl = document.createElement("span");
    labelEl.textContent = String(group?.label ?? "").trim() || "Без названия";
    const metaEl = document.createElement("span");
    metaEl.className = "tools-group-title__meta";
    const groupItems = Array.isArray(group?.items) ? group.items : [];
    const totalCost = groupItems.reduce((sum, tool) => {
      const value = normalizeCostValue(tool?.["Стоимость"]);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
    metaEl.textContent = `Показано: ${groupItems.length} · На сумму: ${formatNotificationCostWithoutCurrency(totalCost)} р.`;
    titleEl.append(labelEl, metaEl);
    return titleEl;
  };

  const buildGroupedTools = (items) => {
    if (toolsState.grouping === "none") {
      return [{ label: "", items }];
    }
    const grouped = new Map();
    items.forEach((tool) => {
      const label = getToolGroupingValue(tool);
      if (!grouped.has(label)) {
        grouped.set(label, []);
      }
      grouped.get(label).push(tool);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "ru", { sensitivity: "base" }))
      .map(([label, groupItems]) => ({ label, items: groupItems }));
  };

  const syncToolsMapViewButtonVisibility = () => {
    if (!toolsSearchMapViewButtonEl) return;
    const shouldShowMapButton = canUseToolsMapView();
    toolsSearchMapViewButtonEl.classList.toggle("is-hidden", !shouldShowMapButton);
    if (!shouldShowMapButton && toolsState.view === "map") {
      toolsState.view = normalizeToolsView(toolsState.previousView);
    }
  };

  const lockToolsTopZoneHeights = ({ forceRefresh = false } = {}) => {
    if (!toolsHeaderEl) return;
    if (toolsTopZoneLock && !forceRefresh) return;
    const headerStyles = window.getComputedStyle(toolsHeaderEl);
    const titleEl = toolsHeaderEl.querySelector(".settings-modal__title");
    const titleStyles = titleEl ? window.getComputedStyle(titleEl) : null;
    const parseCssPixels = (value) => {
      const parsed = Number.parseFloat(value ?? "");
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    };
    const headerPaddingTop = parseCssPixels(headerStyles.paddingTop);
    const headerPaddingBottom = parseCssPixels(headerStyles.paddingBottom);
    const titleHeight = parseCssPixels(titleStyles?.height) ||
      parseCssPixels(titleStyles?.minHeight) ||
      parseCssPixels(headerStyles.getPropertyValue("--my-tools-header-title-height"));
    // Не используем getBoundingClientRect().height у всей шапки: в Telegram WebView
    // она может растянуться из-за малого количества карточек и сдвинуть поиск вниз.
    // Фиксируем только минимальную CSS-высоту заголовка, поэтому расстояние до
    // блока поиска не зависит от числа инструментов в списке.
    const stableHeaderHeight = headerPaddingTop + titleHeight + headerPaddingBottom;
    toolsTopZoneLock = {
      header: stableHeaderHeight > 0 ? stableHeaderHeight : 0,
    };
  };

  const resetToolsTopZoneStability = () => {
    toolsTopZoneLock = null;
    if (typeof window !== "undefined" && toolsControlsWrapRafId) {
      window.cancelAnimationFrame(toolsControlsWrapRafId);
      toolsControlsWrapRafId = 0;
    }
    toolsControlsEl?.classList.remove("tools-controls--wrapped");
    if (toolsHeaderEl) {
      toolsHeaderEl.style.minHeight = "";
      toolsHeaderEl.style.height = "";
    }
    toolsModalEl?.style.removeProperty("--tools-my-tools-header-offset");
  };

  const syncToolsTopZoneStability = () => {
    if (!toolsHeaderEl) return;
    // Эталон высоты берём из CSS и не подстраиваем под режим/контент.
    // Это убирает адаптивный отступ между заголовком и панелью управления.
    const shouldRefreshLock = !toolsTopZoneLock;
    lockToolsTopZoneHeights({ forceRefresh: shouldRefreshLock });
    // По UX-требованию верхняя зона (заголовок + поиск + переключатели + фильтры)
    // не должна менять высоту/отступы между режимами (в том числе при "Карта").
    if (toolsTopZoneLock?.header > 0) {
      toolsHeaderEl.style.minHeight = `${toolsTopZoneLock.header}px`;
      toolsHeaderEl.style.height = `${toolsTopZoneLock.header}px`;
      toolsModalEl?.style.setProperty(
        "--tools-my-tools-header-offset",
        `${toolsTopZoneLock.header}px`
      );
    }
  };

  const syncToolsControlsWrapState = () => {
    if (!toolsControlsEl || !toolsModalEl) return;
    const controlsRowEl = toolsControlsEl.querySelector(".tools-controls__row");
    if (!controlsRowEl) return;
    const hasHorizontalOverflow = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      if (element.classList.contains("is-hidden")) return false;
      if (element.offsetParent === null) return false;
      if (element.scrollWidth - element.clientWidth > 1) return true;
      const visibleChildren = Array.from(element.children).filter((child) => {
        if (!(child instanceof HTMLElement)) return false;
        if (child.classList.contains("is-hidden")) return false;
        return child.offsetParent !== null;
      });
      if (!visibleChildren.length) return false;
      const childrenWidth = visibleChildren.reduce(
        (total, child) => total + child.getBoundingClientRect().width,
        0
      );
      const styles = window.getComputedStyle(element);
      const gapValue = Number.parseFloat(styles.columnGap || styles.gap || "0");
      const gapWidth = Number.isFinite(gapValue)
        ? gapValue * Math.max(0, visibleChildren.length - 1)
        : 0;
      return childrenWidth + gapWidth - element.clientWidth > 1;
    };
    const isMyToolsMode = toolsModalEl.classList.contains("tools-modal--my-tools");
    if (!isMyToolsMode) {
      toolsControlsEl.classList.remove("tools-controls--wrapped");
      return;
    }
    const rowRect = controlsRowEl.getBoundingClientRect();
    if (!Number.isFinite(rowRect.width) || rowRect.width <= 0) {
      toolsControlsEl.classList.remove("tools-controls--wrapped");
      return;
    }
    const visibleChildren = Array.from(controlsRowEl.children).filter((element) => {
      if (!(element instanceof HTMLElement)) return false;
      if (element.classList.contains("is-hidden")) return false;
      return element.offsetParent !== null;
    });
    const totalChildrenWidth = visibleChildren.reduce((total, element) => {
      return total + element.getBoundingClientRect().width;
    }, 0);
    const computedStyles = window.getComputedStyle(controlsRowEl);
    const gap = Number.parseFloat(computedStyles.columnGap || computedStyles.gap || "0");
    const totalGap = Number.isFinite(gap) ? gap * Math.max(0, visibleChildren.length - 1) : 0;
    const hasOverflow =
      controlsRowEl.scrollWidth - controlsRowEl.clientWidth > 1 ||
      totalChildrenWidth + totalGap - rowRect.width > 1 ||
      hasHorizontalOverflow(toolsActionsEl) ||
      hasHorizontalOverflow(toolsFilterActionsEl);
    toolsControlsEl.classList.toggle("tools-controls--wrapped", hasOverflow);
  };

  const queueToolsControlsWrapSync = () => {
    if (typeof window === "undefined") return;
    if (toolsControlsWrapRafId) {
      window.cancelAnimationFrame(toolsControlsWrapRafId);
    }
    toolsControlsWrapRafId = window.requestAnimationFrame(() => {
      toolsControlsWrapRafId = 0;
      syncToolsControlsWrapState();
    });
  };

  if (typeof ResizeObserver !== "undefined" && toolsControlsEl && !toolsControlsWrapObserver) {
    const controlsRowEl = toolsControlsEl.querySelector(".tools-controls__row");
    toolsControlsWrapObserver = new ResizeObserver(() => {
      queueToolsControlsWrapSync();
    });
    toolsControlsWrapObserver.observe(toolsControlsEl);
    if (controlsRowEl) {
      toolsControlsWrapObserver.observe(controlsRowEl);
    }
  }

  const clearToolsList = () => {
    if (toolsListEl) {
      toolsListEl.innerHTML = "";
    }
  };

  const resolveToolsMapBounds = (mapBounds) => {
    if (!mapBounds) return null;
    if (Array.isArray(mapBounds) && mapBounds.length === 2) {
      const southWest = mapBounds[0];
      const northEast = mapBounds[1];
      if (
        Array.isArray(southWest) &&
        southWest.length === 2 &&
        Array.isArray(northEast) &&
        northEast.length === 2
      ) {
        return { southWest, northEast };
      }
    }
    const southWest = mapBounds.getSouthWest?.();
    const northEast = mapBounds.getNorthEast?.();
    if (!southWest || !northEast) return null;
    return { southWest, northEast };
  };

  const isToolsPointInBounds = (point, mapBounds) => {
    if (!point || !mapBounds) return false;
    const lat = Number(point?.coordinates?.lat);
    const lng = Number(point?.coordinates?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    const resolvedBounds = resolveToolsMapBounds(mapBounds);
    if (!resolvedBounds) return false;
    const { southWest, northEast } = resolvedBounds;
    return (
      lat >= southWest[0] &&
      lat <= northEast[0] &&
      lng >= southWest[1] &&
      lng <= northEast[1]
    );
  };

  const getVisibleToolsSearchPoints = (points) => {
    const safePoints = Array.isArray(points) ? points : [];
    const mapBounds = toolsSearchMapState.map?.getBounds?.();
    if (!mapBounds) {
      return safePoints;
    }
    return safePoints.filter((point) => isToolsPointInBounds(point, mapBounds));
  };

  const updateToolsZoneSubtitle = () => {
    // По требованию UX верхняя зона (заголовок/подзаголовок/поиск/переключатели)
    // не должна визуально меняться при переключении в режим карты.
    // Поэтому дополнительный подзаголовок по зоне карты всегда очищаем.
    setToolsZoneSubtitle("");
  };

  const collectFilteredToolsByObject = (objectName) => {
    const targetObject = sanitizeObjectName(objectName ?? "").toLowerCase();
    if (!targetObject) return [];
    return (Array.isArray(toolsState.filtered) ? toolsState.filtered : []).filter(
      (tool) =>
        sanitizeObjectName(tool?.["Объект"] ?? tool?.object ?? "").toLowerCase() ===
        targetObject
    );
  };

  const buildToolsSearchMapPopupHtml = (point) => {
    const objectName = String(point?.name ?? "").trim();
    if (!objectName) {
      return "<div class='tools-map-popup'><div class='tools-map-popup__empty'>Нет данных по объекту.</div></div>";
    }

    const objectTools = collectFilteredToolsByObject(objectName);
    if (!objectTools.length) {
      return `<div class='tools-map-popup'><div class='tools-map-popup__empty'>На объекте нет инструментов с учётом текущего поиска и фильтров.</div></div>`;
    }

    const groups = new Map();
    objectTools.forEach((tool) => {
      const responsible =
        formatFullName(String(tool?.["Ответственный"] ?? "").trim()) || "Не назначен";
      if (!groups.has(responsible)) {
        groups.set(responsible, []);
      }
      groups.get(responsible).push(tool);
    });

    const groupsHtml = Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "ru"))
      .map(([responsible, tools]) => {
        const toolsHtml = tools
          .map((tool) => {
            const number = resolveToolNumberValue(tool) || "Без номера";
            const title = [
              String(tool?.["Наименование"] ?? "").trim(),
              String(tool?.["Производитель"] ?? "").trim(),
              String(tool?.["Модель"] ?? "").trim(),
            ]
              .filter(Boolean)
              .join(" ");
            const status = String(tool?.["Статус"] ?? "").trim();
            return `<li class='tools-map-popup__item'>
              <span class='tools-map-popup__item-number'>${escapeHtml(number)}</span>
              <span class='tools-map-popup__item-text'>${escapeHtml(
                title || "Без названия"
              )}</span>
              ${
                status
                  ? `<span class='tools-map-popup__item-status'>${escapeHtml(status)}</span>`
                  : ""
              }
            </li>`;
          })
          .join("");

        return `<section class='tools-map-popup__group'>
          <div class='tools-map-popup__group-header'>
            <span class='tools-map-popup__group-title'>${escapeHtml(responsible)}</span>
            <span class='tools-map-popup__group-count'>${tools.length}</span>
          </div>
          <ul class='tools-map-popup__list'>${toolsHtml}</ul>
        </section>`;
      })
      .join("");

    return `<div class='tools-map-popup'>${groupsHtml}</div>`;
  };

  const hasActiveToolsSearchFilters = () => {
    if (toolsState.search.trim()) {
      return true;
    }

    return Object.values(toolsState.filters).some((value) =>
      String(value ?? "").trim()
    );
  };

  const renderToolsSearchMap = (points) => {
    if (!toolsSearchMapCanvasEl) return;
    const safePoints = Array.isArray(points) ? points : [];
    toolsSearchMapState.points = safePoints;
    const mapContentEl = toolsSearchMapCanvasEl;
    const existingDots = mapContentEl.querySelectorAll(".tools-map-dot");
    existingDots.forEach((dot) => dot.remove());

    if (!safePoints.length) {
      setToolsZoneSubtitle("");
      toolsSearchMapPlaceholderEl?.classList.remove("is-hidden");
      toolsSearchMapCanvasEl.classList.remove("tools-map-canvas--map");
      toolsSearchMapCanvasEl.classList.remove("tools-map-canvas--filtering");
      if (toolsSearchMapImageEl) {
        toolsSearchMapImageEl.classList.add("is-hidden");
        toolsSearchMapImageEl.removeAttribute("src");
      }
      if (toolsSearchMapState.activated) {
        syncInteractiveToolsSearchMap();
      }
      return;
    }

    toolsSearchMapPlaceholderEl?.classList.add("is-hidden");
    toolsSearchMapCanvasEl.classList.add("tools-map-canvas--map");
    const isFiltering = hasActiveToolsSearchFilters();
    toolsSearchMapCanvasEl.classList.toggle("tools-map-canvas--filtering", isFiltering);
    const bounds = buildToolsMapBounds(safePoints);
    if (toolsSearchMapImageEl) {
      const mapUrl = buildYandexStaticMapUrl(safePoints, bounds);
      toolsSearchMapImageEl.src = mapUrl;
      toolsSearchMapImageEl.classList.remove("is-hidden");
    }

    void ensureToolsSearchMapReady();
  };

  const toolsSearchMapState = {
    activated: false,
    interactive: false,
    points: [],
    map: null,
    markers: [],
    boundsListenerAttached: false,
  };

  const refreshToolsSearchMapViewportInfo = () => {
    if (!toolsSearchMapState.map || !window.ymaps) return;
    const mapBounds = toolsSearchMapState.map.getBounds?.();
    if (!mapBounds) return;

    syncInteractiveToolsSearchMap({ fitViewport: false });
  };

  const syncInteractiveToolsSearchMap = ({ fitViewport = true } = {}) => {
    if (!toolsSearchMapState.map || !window.ymaps) return;
    const safePoints = Array.isArray(toolsSearchMapState.points)
      ? toolsSearchMapState.points
      : [];
    const openedPointName = toolsSearchMapState.markers
      .find((marker) => marker?.balloon?.isOpen?.())
      ?.__toolsPoint?.name;

    toolsSearchMapState.markers.forEach((marker) => {
      toolsSearchMapState.map?.geoObjects.remove(marker);
    });
    toolsSearchMapState.markers = [];

    if (!safePoints.length) {
      if (!fitViewport) {
        updateToolsZoneSubtitle();
        return;
      }
      toolsSearchMapState.map.setCenter([53.9, 27.56], 10, {
        duration: 240,
      });
      updateToolsZoneSubtitle();
      return;
    }

    const validCoordinates = safePoints
      .map((point) => {
        const lat = Number(point?.coordinates?.lat);
        const lng = Number(point?.coordinates?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return [lat, lng];
      })
      .filter(Boolean);

    if (fitViewport && validCoordinates.length) {
      if (validCoordinates.length === 1) {
        toolsSearchMapState.map.setCenter(validCoordinates[0], 13, { duration: 260 });
      } else {
        const viewportBounds = buildYandexViewportBounds(safePoints);
        if (viewportBounds) {
          toolsSearchMapState.map.setBounds(viewportBounds, {
            checkZoomRange: true,
            preciseZoom: true,
            useMapMargin: true,
            zoomMargin: [34, 34, 34, 34],
            duration: 260,
          });
        }
      }
    }

    const visiblePoints = getVisibleToolsSearchPoints(safePoints);

    visiblePoints.forEach((point) => {
      const lat = Number(point?.coordinates?.lat);
      const lng = Number(point?.coordinates?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const toolsCount = Number(point.count) || 0;
      const label = `${point.name} · ${toolsCount} шт.`;

      const marker = new window.ymaps.Placemark(
        [lat, lng],
        {
          balloonContentHeader: escapeHtml(point.name),
          balloonContentBody: `Инструментов: ${toolsCount}`,
          hintContent: label,
          iconCaption: label,
        },
        {
          preset: "islands#blueCircleDotIconWithCaption",
        }
      );
      marker.__toolsPoint = point;
      const applyPopupContent = () => {
        const popupHtml = buildToolsSearchMapPopupHtml(point);
        marker.properties.set("balloonContentHeader", escapeHtml(point.name));
        marker.properties.set("balloonContentBody", popupHtml);
        marker.properties.set(
          "balloonContentFooter",
          `<button type="button" class="tools-map-popup__apply" data-tools-map-object="${escapeHtml(
            point.name
          )}">Применить фильтр по объекту</button>`
        );
      };

      marker.events.add("click", () => {
        applyPopupContent();
        marker.balloon.open();
      });
      toolsSearchMapState.map.geoObjects.add(marker);
      toolsSearchMapState.markers.push(marker);

      if (
        openedPointName &&
        String(openedPointName).trim().toLowerCase() ===
          String(point.name ?? "").trim().toLowerCase()
      ) {
        applyPopupContent();
        marker.balloon.open();
      }
    });

    updateToolsZoneSubtitle();
  };

  const activateToolsSearchMapInteraction = async () => {
    if (
      !toolsSearchMapCanvasEl ||
      !toolsSearchMapLayerEl
    ) {
      return;
    }

    await ensureToolsSearchMapReady({ interactive: true });
  };

  const ensureToolsSearchMapReady = async ({ interactive = false } = {}) => {
    if (!toolsSearchMapCanvasEl || !toolsSearchMapLayerEl) return;

    try {
      await ensureYandexMapsLoaded();
      toolsSearchMapState.activated = true;
      toolsSearchMapCanvasEl.classList.add("tools-map-canvas--map");

      toolsSearchMapPlaceholderEl?.classList.add("is-hidden");
      toolsSearchMapImageEl?.classList.add("is-hidden");

      if (!toolsSearchMapState.map) {
        toolsSearchMapLayerEl.innerHTML = "";
        toolsSearchMapState.map = new window.ymaps.Map(
          toolsSearchMapLayerEl,
          {
            center: [53.9, 27.56],
            zoom: 10,
            controls: ["zoomControl", "geolocationControl"],
          },
          {
            suppressMapOpenBlock: true,
          }
        );
        window.setTimeout(() => {
          toolsSearchMapState.map?.container?.fitToViewport?.();
        }, 80);
      }

      const interactiveBehaviors = [
        "drag",
        "scrollZoom",
        "multiTouch",
        "dblClickZoom",
      ];
      toolsSearchMapState.interactive = Boolean(interactive);
      if (toolsSearchMapState.interactive) {
        toolsSearchMapCanvasEl.classList.add("tools-map-canvas--interactive");
        toolsSearchMapCanvasEl.classList.add("tools-map-canvas--interactive-live");
        toolsSearchMapCanvasEl.setAttribute(
          "aria-label",
          "Карта активна. Перемещайте карту и меняйте масштаб"
        );
        interactiveBehaviors.forEach((behaviorName) => {
          toolsSearchMapState.map?.behaviors?.enable?.(behaviorName);
        });
        if (!toolsSearchMapState.map.controls.get("zoomControl")) {
          toolsSearchMapState.map.controls.add("zoomControl");
        }
        if (!toolsSearchMapState.map.controls.get("geolocationControl")) {
          toolsSearchMapState.map.controls.add("geolocationControl");
        }
      } else {
        toolsSearchMapCanvasEl.classList.remove("tools-map-canvas--interactive");
        toolsSearchMapCanvasEl.classList.remove("tools-map-canvas--interactive-live");
        toolsSearchMapCanvasEl.setAttribute(
          "aria-label",
          "Карта предварительного просмотра. Нажмите, чтобы включить перемещение"
        );
        interactiveBehaviors.forEach((behaviorName) => {
          toolsSearchMapState.map?.behaviors?.disable?.(behaviorName);
        });
        toolsSearchMapState.map.controls.remove("zoomControl");
        toolsSearchMapState.map.controls.remove("geolocationControl");
      }

      if (!toolsSearchMapState.boundsListenerAttached) {
        toolsSearchMapState.map.events.add("boundschange", () => {
          refreshToolsSearchMapViewportInfo();
        });
        toolsSearchMapState.boundsListenerAttached = true;
      }

      syncInteractiveToolsSearchMap();
    } catch (error) {
      console.warn("Не удалось загрузить карту поиска.", error);
      toolsSearchMapCanvasEl.setAttribute(
        "aria-label",
        "Не удалось загрузить интерактивную карту, попробуйте позже"
      );
    }
  };

  const awakenToolsSearchMap = async () => {
    if (!toolsSearchMapCanvasEl) return;
    await activateToolsSearchMapInteraction();
    toolsSearchMapCanvasEl.classList.remove("tools-map-canvas--alive");
    window.requestAnimationFrame(() => {
      toolsSearchMapCanvasEl.classList.add("tools-map-canvas--alive");
      window.setTimeout(() => {
        toolsSearchMapCanvasEl.classList.remove("tools-map-canvas--alive");
      }, 720);
    });
  };

  const normalizeToolNotes = (tool) => {
    const notes = tool?.["Заметки"] ?? tool?.notes ?? [];
    if (!Array.isArray(notes)) return [];
    return notes
      .map((note, sourceIndex) => ({
        text: String(note?.text ?? note?.["Текст"] ?? "").trim(),
        author: String(note?.author ?? note?.["Автор"] ?? "").trim(),
        authorId: String(note?.authorId ?? note?.["ID автора"] ?? "").trim(),
        createdAt: String(note?.createdAt ?? note?.["Дата"] ?? "").trim(),
        updatedAt: String(note?.updatedAt ?? note?.["Дата изменения"] ?? "").trim(),
        sourceIndex,
      }))
      .filter((note) => note.text);
  };

  const getCurrentToolNotesUserId = () =>
    String(currentUser?.telegram_id ?? currentUser?.telegramId ?? "").trim();

  const canEditToolNote = (note) => {
    const currentUserId = getCurrentToolNotesUserId();
    return Boolean(currentUserId && note?.authorId && note.authorId === currentUserId);
  };

  const buildToolNoteEditor = (note, onSaved) => {
    const actions = document.createElement("div");
    actions.className = "tools-note-item__actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "tools-note-item__edit";
    editButton.textContent = "Изменить";
    editButton.setAttribute("aria-label", "Редактировать свою заметку");
    actions.appendChild(editButton);
    editButton.addEventListener("click", () => {
      const item = editButton.closest("article");
      if (!item || item.classList.contains("is-editing")) return;
      item.classList.add("is-editing");
      const textEl = item.querySelector(".tools-note-item__text, .tools-info-item__note");
      if (textEl) textEl.hidden = true;
      actions.innerHTML = "";
      const textarea = document.createElement("textarea");
      textarea.className = "form-input tools-note-item__textarea";
      textarea.value = note.text;
      textarea.rows = 3;
      textarea.maxLength = 2000;
      textarea.setAttribute("aria-label", "Текст заметки");
      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.className = "action-primary tools-note-item__save";
      saveButton.textContent = "Сохранить";
      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "tools-note-item__cancel";
      cancelButton.textContent = "Отмена";
      actions.append(saveButton, cancelButton);
      item.insertBefore(textarea, actions);
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      cancelButton.addEventListener("click", () => onSaved());
      saveButton.addEventListener("click", async () => {
        const value = textarea.value.trim();
        if (!value) {
          textarea.focus();
          return;
        }
        saveButton.disabled = true;
        cancelButton.disabled = true;
        try {
          await updateToolNote(note, value);
          onSaved();
        } catch (error) {
          console.warn("Не удалось изменить заметку.", error);
          saveButton.disabled = false;
          cancelButton.disabled = false;
        }
      });
    });
    return actions;
  };

  const getToolNotesCount = (tool) => normalizeToolNotes(tool).length;

  const getRussianPlural = (count, one, few, many) => {
    const abs = Math.abs(Number(count)) % 100;
    const last = abs % 10;
    if (abs > 10 && abs < 20) return many;
    if (last > 1 && last < 5) return few;
    if (last === 1) return one;
    return many;
  };

  const formatToolNoteDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value || "только что";
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const buildToolsNotesButton = (tool, extraClass = "") => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = ["tools-notes-trigger", extraClass].filter(Boolean).join(" ");
    button.dataset.toolsNotesOpen = "true";
    const count = getToolNotesCount(tool);
    button.setAttribute(
      "aria-label",
      count > 0
        ? `Открыть заметки инструмента, записей: ${count}`
        : "Добавить заметку к инструменту"
    );
    button.innerHTML = `<span aria-hidden="true">📝</span>${
      count > 0 ? `<span class="tools-notes-trigger__count">${count}</span>` : ""
    }`;
    return button;
  };

  const renderToolsNotesList = () => {
    if (!toolsNotesListEl) return;
    const notes = normalizeToolNotes(toolsNotesState.tool);
    if (toolsNotesCountEl) {
      const count = notes.length;
      toolsNotesCountEl.textContent = String(count);
      toolsNotesCountEl.setAttribute("aria-label", `${count} ${getRussianPlural(count, "запись", "записи", "записей")}`);
    }
    toolsNotesListEl.innerHTML = "";
    if (!notes.length) {
      const empty = document.createElement("div");
      empty.className = "tools-notes-empty";
      empty.textContent =
        "Заметок пока нет. Добавьте первую — она сохранится с автором и датой.";
      toolsNotesListEl.appendChild(empty);
      return;
    }
    notes
      .slice()
      .reverse()
      .forEach((note) => {
        const item = document.createElement("article");
        item.className = "tools-note-item";
        const meta = document.createElement("div");
        meta.className = "tools-note-item__meta";
        meta.textContent = `${note.author || "Пользователь"} · ${formatToolNoteDate(
          note.createdAt
        )}${note.updatedAt ? " · изменено" : ""}`;
        const text = document.createElement("div");
        text.className = "tools-note-item__text";
        text.textContent = note.text;
        const dot = document.createElement("span");
        dot.className = "tools-note-item__dot";
        dot.setAttribute("aria-hidden", "true");
        item.append(dot);
        item.append(meta, text);
        if (canEditToolNote(note)) {
          item.appendChild(buildToolNoteEditor(note, renderToolsNotesList));
        }
        toolsNotesListEl.appendChild(item);
      });
  };

  const openToolsNotesModal = (tool) => {
    if (!toolsNotesModalEl || !tool) return;
    toolsNotesState.tool = tool;
    toolsNotesState.orgFolder = toolsState.orgFolder || context.orgFolderName || "";
    const number = resolveToolNumberValue(tool);
    const title =
      [tool?.["Наименование"], tool?.["Производитель"], tool?.["Модель"]]
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
        .join(" ") || "Инструмент";
    if (toolsNotesTitleEl) toolsNotesTitleEl.textContent = "Заметки";
    if (toolsNotesSubtitleEl) {
      toolsNotesSubtitleEl.textContent = `${title}${number ? ` · №${number}` : ""}`;
    }
    if (toolsNotesTextEl) toolsNotesTextEl.value = "";
    if (toolsNotesMessageEl) toolsNotesMessageEl.textContent = "";
    renderToolsNotesList();
    toolsNotesModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const closeToolsNotesModal = () => {
    toolsNotesModalEl?.classList.add("is-hidden");
    toolsNotesState.tool = null;
    toolsNotesState.isSaving = false;
    document.body.style.overflow = "";
  };

  const isSamePersistentTool = (source, target) => {
    const sourceNumber = String(source?.["Номер"] ?? "").trim();
    const targetNumber = String(target?.["Номер"] ?? "").trim();
    if (sourceNumber && targetNumber) return sourceNumber === targetNumber;
    const sourceAccounting = String(source?.["Бух.номер"] ?? "").trim();
    const targetAccounting = String(target?.["Бух.номер"] ?? "").trim();
    if (sourceAccounting && targetAccounting) return sourceAccounting === targetAccounting;
    return false;
  };

  const saveToolNote = async (text) => {
    const cleanText = String(text ?? "").trim();
    if (!cleanText || !toolsNotesState.tool || toolsNotesState.isSaving) return;
    const orgFolder =
      toolsNotesState.orgFolder || toolsState.orgFolder || context.orgFolderName || "";
    if (!orgFolder) throw new Error("Не удалось определить организацию.");
    toolsNotesState.isSaving = true;
    if (toolsNotesSaveButton) toolsNotesSaveButton.disabled = true;
    const author =
      String(
        currentUser?.full_name ?? currentUser?.fullName ?? currentUserLabel ?? "Пользователь"
      ).trim() || "Пользователь";
    const note = {
      text: cleanText,
      author,
      authorId: getCurrentToolNotesUserId(),
      createdAt: new Date().toISOString(),
    };
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    const raw = await loadJson(toolsPath);
    const tools = Array.isArray(raw) ? raw : Array.isArray(raw?.tools) ? raw.tools : [];
    const index = tools.findIndex((entry) =>
      isSamePersistentTool(entry, toolsNotesState.tool)
    );
    if (index < 0) throw new Error("Инструмент не найден в базе.");
    const updatedTool = {
      ...tools[index],
      "Заметки": [
        ...normalizeToolNotes(tools[index]).map(({ sourceIndex, ...entry }) => entry),
        note,
      ],
    };
    tools[index] = updatedTool;
    const payload = Array.isArray(raw) ? tools : { ...raw, tools };
    await saveJson(toolsPath, payload, { user: currentUser });
    const updatedRuntimeTool = {
      ...toolsNotesState.tool,
      "Заметки": updatedTool["Заметки"],
    };
    toolsNotesState.tool = updatedRuntimeTool;
    const updateRuntimeEntry = (entry) =>
      isSamePersistentTool(entry, updatedRuntimeTool)
        ? { ...entry, "Заметки": updatedTool["Заметки"] }
        : entry;
    toolsState.tools = toolsState.tools.map(updateRuntimeEntry);
    toolsState.filtered = toolsState.filtered.map(updateRuntimeEntry);
    toolsState.toolMap = new Map(toolsState.tools.map((entry) => [entry.__selectionId, entry]));
    if (toolsNotesTextEl) toolsNotesTextEl.value = "";
    renderToolsNotesList();
    renderToolsList();
    if (toolsNotesMessageEl) toolsNotesMessageEl.textContent = "Заметка сохранена.";
    toolsNotesState.isSaving = false;
    if (toolsNotesSaveButton) toolsNotesSaveButton.disabled = false;
  };

  const updateToolNote = async (note, text) => {
    if (!canEditToolNote(note)) {
      throw new Error("Можно редактировать только свои заметки.");
    }
    const cleanText = String(text ?? "").trim();
    if (!cleanText) throw new Error("Заметка не может быть пустой.");
    const isNotesModalOpen = !toolsNotesModalEl.classList.contains("is-hidden");
    const activeTool = isNotesModalOpen ? toolsNotesState.tool : toolsInfoState.tool;
    const orgFolder = (isNotesModalOpen
      ? toolsNotesState.orgFolder
      : toolsInfoState.orgFolder) || toolsState.orgFolder || context.orgFolderName || "";
    if (!activeTool || !orgFolder) throw new Error("Не удалось определить инструмент.");
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    const raw = await loadJson(toolsPath);
    const tools = Array.isArray(raw) ? raw : Array.isArray(raw?.tools) ? raw.tools : [];
    const toolIndex = tools.findIndex((entry) => isSamePersistentTool(entry, activeTool));
    if (toolIndex < 0) throw new Error("Инструмент не найден в базе.");
    const storedNotes = normalizeToolNotes(tools[toolIndex]);
    const storedNote = storedNotes.find((entry) => entry.sourceIndex === note.sourceIndex);
    if (!storedNote || !canEditToolNote(storedNote)) {
      throw new Error("Эта заметка принадлежит другому пользователю.");
    }
    const updatedNotes = storedNotes.map((entry) => ({
      text: entry.sourceIndex === note.sourceIndex ? cleanText : entry.text,
      author: entry.author,
      authorId: entry.authorId,
      createdAt: entry.createdAt,
      ...(entry.sourceIndex === note.sourceIndex
        ? { updatedAt: new Date().toISOString() }
        : entry.updatedAt ? { updatedAt: entry.updatedAt } : {}),
    }));
    tools[toolIndex] = { ...tools[toolIndex], "Заметки": updatedNotes };
    await saveJson(toolsPath, Array.isArray(raw) ? tools : { ...raw, tools }, { user: currentUser });
    const applyNotes = (entry) => isSamePersistentTool(entry, activeTool)
      ? { ...entry, "Заметки": updatedNotes }
      : entry;
    toolsState.tools = toolsState.tools.map(applyNotes);
    toolsState.filtered = toolsState.filtered.map(applyNotes);
    const updatedTool = { ...activeTool, "Заметки": updatedNotes };
    toolsNotesState.tool = updatedTool;
    if (toolsInfoState.tool && isSamePersistentTool(toolsInfoState.tool, activeTool)) {
      toolsInfoState.tool = updatedTool;
    }
    toolsState.toolMap = new Map(toolsState.tools.map((entry) => [entry.__selectionId, entry]));
    renderToolsList();
  };

  const renderToolCard = (
    tool,
    viewMode,
    orgFolder,
    toolIndex,
    options = {}
  ) => {
    const number = resolveToolNumberValue(tool);
    const photoNumber = resolveToolPhotoNumber(tool);
    const name = String(tool?.["Наименование"] ?? "").trim();
    const accountingName = String(tool?.["Наименование по бухгалтерии"] ?? "").trim();
    const manufacturer = String(tool?.["Производитель"] ?? "").trim();
    const model = String(tool?.["Модель"] ?? "").trim();
    const serialNumber = String(tool?.["Серийный номер"] ?? "").trim();
    const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
    const status = String(tool?.["Статус"] ?? "").trim();
    const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
    const hasPhoto = Number.isFinite(photoCount) && photoCount > 0;
    const isCompactMobile =
      viewMode === "compact" &&
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(max-width: 520px)").matches;
    const primaryNumber = number || photoNumber;
    const numberLine = primaryNumber || "Без номера";
    const lineParts = [
      primaryNumber,
      name || accountingName,
      manufacturer,
      model,
    ].filter(Boolean);
    const fullLine = lineParts.join(" ");
    const hasPrimaryInfo = lineParts.length > 0;
    const fallbackTitle = "Инструмент без данных";
    const infoLine = isCompactMobile ? numberLine : fullLine;
    const safeInfoLine = infoLine || numberLine || fallbackTitle;
    const bodyLine = isCompactMobile ? numberLine : safeInfoLine;
    const objectName = String(tool?.["Объект"] ?? "").trim();
    const secondaryLine = [
      [manufacturer, model].filter(Boolean).join(" · "),
      accountingNumber || "",
      serialNumber && serialNumber !== "-" ? `S/N: ${serialNumber}` : "",
      objectName,
    ]
      .filter(Boolean)
      .join(" · ");
    const fallbackSecondaryLine = "Данные заполняются";
    const isMovingNow = Boolean(tool?.__pendingMove);
    const shouldHighlightToolStatus = ["user", "move-other"].includes(toolsState.mode);
    const isSearchMode =
      toolsState.mode === "base" ||
      toolsState.mode === "search" ||
      toolsState.mode === "no-accounting-number" ||
      toolsState.mode === "user" ||
      toolsState.mode === "move-other" ||
      toolsState.mode === "repair" ||
      toolsState.mode === "write-off-pending";
    const shouldShowResponsibleAndToolStatus = true;
    const isLargeMyToolsCard = false;
    const kitItems = getToolKitItems(tool);
    const hasKit = kitItems.length > 0;
    const normalizeToolStatusLabel = (rawStatus, movingNow = false) => {
      if (movingNow) return "Перемещается";
      const normalized = String(rawStatus ?? "").trim().toLocaleLowerCase("ru");
      if (!normalized) return "не указан";
      if (normalized === "рабочий") return "Исправный";
      if (normalized === "в процессе перемещения") return "Перемещается";
      return String(rawStatus ?? "").trim();
    };
    const statusText = normalizeToolStatusLabel(status, isMovingNow);
    const responsible = String(tool?.["Ответственный"] ?? "").trim() || "не указан";
    const disableWorkingStatusAccent = Boolean(options?.disableWorkingStatusAccent);
    const getStatusAccentColor = (rawStatus) => {
      const normalized = String(rawStatus ?? "").trim().toLocaleLowerCase("ru");
      if (isLargeMyToolsCard && (normalized === "рабочий" || normalized === "исправный")) {
        return "";
      }
      if (disableWorkingStatusAccent && (normalized === "рабочий" || normalized === "исправный")) {
        return "";
      }
      if (normalized === "рабочий" || normalized === "исправный") return "#16a34a";
      if (normalized === "в ремонте") return "#ea580c";
      if (normalized === "сломан") return "#eab308";
      if (normalized === "на списание") return "#dc2626";
      if (normalized === "в процессе перемещения" || normalized === "перемещается") return "#2563eb";
      return "";
    };
    const getStatusToneClass = (rawStatus) => {
      const normalized = String(rawStatus ?? "").trim().toLocaleLowerCase("ru");
      if (normalized === "рабочий" || normalized === "исправный") return "tools-card__status-value--working";
      if (normalized === "в ремонте") return "tools-card__status-value--repair";
      if (normalized === "сломан") return "tools-card__status-value--broken";
      if (normalized === "на списание") return "tools-card__status-value--writeoff";
      if (normalized === "в процессе перемещения" || normalized === "перемещается") {
        return "tools-card__status-value--moving";
      }
      return "";
    };
    const appendResponsibleValue = (container, valueText) => {
      const normalized = String(valueText ?? "").trim() || "не указан";
      if (isSearchMode) {
        const [surname, ...rest] = normalized.split(/\s+/).filter(Boolean);
        if (surname) {
          const surnameEl = document.createElement("span");
          surnameEl.style.fontWeight = "700";
          surnameEl.textContent = surname;
          container.appendChild(surnameEl);
          if (rest.length > 0) {
            container.append(` ${rest.join(" ")}`);
          }
          return;
        }
      }
      container.textContent = normalized;
    };
    const createResponsibleStatusLine = () => {
      const line = document.createElement("div");
      line.className = "tools-card__responsible-status";
      if (!isSearchMode && toolsState.mode !== "add-photo" && toolsState.mode !== "remove-photo") {
        const responsibleLabel = document.createElement("span");
        responsibleLabel.textContent = "Ответственный: ";
        line.appendChild(responsibleLabel);
      }
      const responsibleValue = document.createElement("span");
      appendResponsibleValue(responsibleValue, responsible);
      line.appendChild(responsibleValue);
      line.append(" · ");
      const statusLabel = document.createElement("span");
      statusLabel.textContent = "";
      const statusValue = document.createElement("span");
      statusValue.textContent = statusText;
      statusValue.classList.add("tools-card__status-value");
      const statusToneClass = getStatusToneClass(statusText);
      if (statusToneClass) statusValue.classList.add(statusToneClass);
      statusValue.style.fontWeight = "700";
      const statusAccentColor = getStatusAccentColor(statusText);
      if (statusAccentColor) {
        statusValue.style.color = statusAccentColor;
      }
      line.append(statusLabel, statusValue);
      return line;
    };
    const fillToolStatusMeta = (container) => {
      if (!container) return;
      container.textContent = "";
      const value = document.createElement("span");
      value.className = "tools-card__status-value";
      const statusToneClass = getStatusToneClass(statusText);
      if (statusToneClass) value.classList.add(statusToneClass);
      value.textContent = statusText;
      const statusAccentColor = getStatusAccentColor(statusText);
      if (statusAccentColor) {
        value.style.color = statusAccentColor;
      }
      if (shouldHighlightToolStatus) {
        value.style.fontWeight = "700";
        value.style.textDecoration = "none";
      }
      container.append(value);
    };
    const myToolsPrimaryLine = fullLine || numberLine || fallbackTitle;
    const myToolsSecondaryLine = `${accountingNumber || "—"} / ${objectName || "—"}`;
    const safePhotoCount = Number.isFinite(photoCount) ? photoCount : 0;
    const shouldShowRemovePhotoCount = toolsState.mode === "remove-photo";
    const createRemovePhotoBadge = () => {
      const badge = document.createElement("div");
      badge.className = "remove-photo-badge remove-photo-badge--tool";
      const photoCountText = String(safePhotoCount);
      badge.setAttribute("aria-label", `У инструмента ${photoCountText} фото`);
      badge.textContent = photoCountText;
      return badge;
    };

    if (viewMode === "list") {
      const row = document.createElement("div");
      row.className = "tools-row";
      row.classList.toggle("tools-row--no-photo", !hasPhoto);
      row.classList.toggle("is-selected", toolsState.selectedIds.has(tool.__selectionId));
      row.classList.toggle("tools-item--pending-response", tool.__pendingMove);
      applyToolStatusClasses(row, tool);
      row.dataset.toolsItem = "true";
      row.dataset.toolId = tool.__selectionId;
      const main = document.createElement("div");
      main.className = "tools-row__main";
      const title = document.createElement("div");
      title.className = "tools-row__title";
      title.textContent = infoLine || "Без названия";
      const meta = document.createElement("div");
      meta.className = "tools-row__meta";
      const shouldHideAccountingLine =
        !isSearchMode && toolsState.numberKey === "Бух.номер" && accountingNumber === number;
      const accountingMetaLine = shouldHideAccountingLine
        ? ""
        : accountingNumber
          ? isSearchMode
            ? accountingNumber
            : accountingNumber
          : isSearchMode
            ? "Нет"
            : "Нет";
      const mainMetaLine = [
        tool?.["Граппа инструментов"],
        shouldHighlightToolStatus ? "" : tool?.["Статус"],
        tool?.["Объект"],
      ]
        .filter((value) => value && String(value).trim())
        .join(" · ");
      const costMetaLine = formatToolCostLabel(tool);
      meta.replaceChildren();
      if (mainMetaLine) {
        const mainMetaLineEl = document.createElement("div");
        mainMetaLineEl.textContent = mainMetaLine;
        meta.appendChild(mainMetaLineEl);
      }
      if (accountingMetaLine) {
        const accountingMetaLineEl = document.createElement("div");
        if (!accountingNumber && !shouldHideAccountingLine) {
          const missingAccountingEl = document.createElement("span");
          missingAccountingEl.textContent = "Нет";
          missingAccountingEl.style.color = "#dc2626";
          missingAccountingEl.style.fontWeight = "700";
          accountingMetaLineEl.appendChild(missingAccountingEl);
        } else {
          accountingMetaLineEl.textContent = accountingMetaLine;
        }
        meta.appendChild(accountingMetaLineEl);
      }
      if (costMetaLine) {
        const costMetaLineEl = document.createElement("div");
        costMetaLineEl.textContent = isSearchMode
          ? formatSearchCostValue(tool?.["Стоимость"])
          : formatToolCostValue(tool);
        meta.appendChild(costMetaLineEl);
      }
      if (shouldShowResponsibleAndToolStatus) {
        meta.appendChild(createResponsibleStatusLine());
      }
      if (shouldHighlightToolStatus) {
        const statusMeta = document.createElement("div");
        statusMeta.className = "tools-row__status";
        fillToolStatusMeta(statusMeta);
        if (shouldShowResponsibleAndToolStatus) {
          meta.appendChild(statusMeta);
        }
      }
      if (!mainMetaLine && !accountingMetaLine && !costMetaLine) {
        meta.textContent = "—";
        if (shouldShowResponsibleAndToolStatus) {
          meta.appendChild(createResponsibleStatusLine());
        }
      }
      main.append(title, meta);
      row.appendChild(main);
      row.appendChild(buildToolsNotesButton(tool, "tools-notes-trigger--row"));
      if (!hasPhoto) {
        const badge = document.createElement("div");
        badge.className = "tools-row__badge";
        badge.textContent = "Без фото";
        row.appendChild(badge);
      }
      if (hasKit) {
        const kitBadge = document.createElement("button");
        kitBadge.type = "button";
        kitBadge.className = "tools-kit-badge";
        kitBadge.dataset.toolsKitOpen = "true";
        kitBadge.textContent = `Комплектация: ${kitItems.length}`;
        kitBadge.setAttribute("aria-label", "Открыть комплектацию инструмента");
        row.appendChild(kitBadge);
      }
      if (shouldShowRemovePhotoCount) {
        row.classList.add("tools-row--remove-photo");
        row.appendChild(createRemovePhotoBadge());
      }
      return row;
    }

    const card = document.createElement("div");
    card.className = "tools-card";
    card.classList.toggle("tools-card--no-photo", !hasPhoto);
    card.classList.toggle(
      "tools-card--my-tools-large-no-photo",
      isLargeMyToolsCard && !hasPhoto
    );
    card.classList.toggle("is-selected", toolsState.selectedIds.has(tool.__selectionId));
    card.classList.toggle("tools-item--pending-response", tool.__pendingMove);
    applyToolStatusClasses(card, tool);
    card.dataset.toolsItem = "true";
    card.dataset.toolId = tool.__selectionId;

    const media = document.createElement("div");
    media.className = "tools-card__media";
    const img = document.createElement("img");
    img.alt = infoLine || "Инструмент";
    applyToolPhotoWithFallback({
      img,
      orgFolder,
      toolNumber: photoNumber,
      hasPhoto,
    });

    media.appendChild(img);
    card.appendChild(buildToolsNotesButton(tool, "tools-notes-trigger--card"));

    if (!hasPhoto) {
      const badge = document.createElement("div");
      badge.className = "tools-card__badge";
      if (hasKit) {
        badge.classList.add("tools-card__badge--with-kit");
      }
      badge.textContent = "Нет фото";
      media.appendChild(badge);
    }
    if (hasKit) {
      const kitBadge = document.createElement("button");
      kitBadge.type = "button";
      kitBadge.className = "tools-kit-badge tools-kit-badge--card";
      kitBadge.dataset.toolsKitOpen = "true";
      kitBadge.textContent = `Комплектация: ${kitItems.length}`;
      kitBadge.setAttribute("aria-label", "Открыть комплектацию инструмента");
      media.appendChild(kitBadge);
    }
    if (shouldShowRemovePhotoCount) {
      card.classList.add("tools-card--remove-photo");
      media.appendChild(createRemovePhotoBadge());
    }

    if (viewMode === "large" || isCompactMobile) {
      const shouldRenderOverlay = hasPhoto || isCompactMobile || isLargeMyToolsCard;
      if (shouldRenderOverlay) {
        const overlay = document.createElement("div");
        overlay.className = isCompactMobile
          ? "tools-card__overlay tools-card__overlay--compact"
          : "tools-card__overlay";
        const title = document.createElement("div");
        title.className = "tools-card__title";
        if (isLargeMyToolsCard) {
          title.classList.add("tools-card__title--my-tools");
        }
        title.textContent = isLargeMyToolsCard ? myToolsPrimaryLine : safeInfoLine;
        overlay.appendChild(title);
        const metaLine = document.createElement("div");
        metaLine.className = "tools-card__meta";
        if (isLargeMyToolsCard) {
          metaLine.classList.add("tools-card__meta--my-tools");
        }
        metaLine.textContent = isLargeMyToolsCard
          ? myToolsSecondaryLine
          : secondaryLine || objectName || fallbackSecondaryLine;
        overlay.appendChild(metaLine);
        if (!hasPrimaryInfo && !secondaryLine && !objectName) {
          overlay.classList.add("tools-card__overlay--empty");
          title.textContent = fallbackTitle;
          metaLine.textContent = fallbackSecondaryLine;
        }
        if (shouldShowResponsibleAndToolStatus) {
          const responsibleStatusLine = createResponsibleStatusLine();
          overlay.appendChild(responsibleStatusLine);
          if (isCompactMobile) {
            const statusMeta = document.createElement("div");
            statusMeta.className = "tools-card__status";
            fillToolStatusMeta(statusMeta);
            overlay.appendChild(statusMeta);
          }
        }
        if (isLargeMyToolsCard) {
          const statusLine = document.createElement("div");
          statusLine.className = "tools-card__status tools-card__status--my-tools tools-card__status-value";
          const statusToneClass = getStatusToneClass(statusText);
          if (statusToneClass) statusLine.classList.add(statusToneClass);
          statusLine.textContent = statusText || "не указан";
          const statusAccentColor = getStatusAccentColor(statusText);
          if (statusAccentColor) {
            statusLine.style.color = statusAccentColor;
          }
          overlay.appendChild(statusLine);
        }
        media.appendChild(overlay);
      }
      if (hasPhoto) {
        const photoButton = document.createElement("button");
        photoButton.type = "button";
        photoButton.className = "tools-card__photo-trigger";
        photoButton.dataset.pendingPhotoOpen = "true";
        photoButton.dataset.pendingPhotoMoveIndex = String(toolIndex);
        photoButton.setAttribute("aria-label", "Открыть фото инструмента");
        photoButton.textContent = "🖼️";
        media.appendChild(photoButton);
      }
      if (isCompactMobile) {
        card.appendChild(media);
        return card;
      }
      if (viewMode === "large" && (hasPhoto || isLargeMyToolsCard)) {
        card.appendChild(media);
        return card;
      }
    }

    const body = document.createElement("div");
    body.className = "tools-card__body";
    const title = document.createElement("div");
    title.className = "tools-card__title";
    if (isLargeMyToolsCard) {
      title.classList.add("tools-card__title--my-tools");
    }
    title.textContent = isLargeMyToolsCard ? myToolsPrimaryLine : bodyLine || fallbackTitle;
    body.appendChild(title);
    const metaLine = document.createElement("div");
    metaLine.className = "tools-card__meta";
    if (isLargeMyToolsCard) {
      metaLine.classList.add("tools-card__meta--my-tools");
    }
    metaLine.textContent = isLargeMyToolsCard
      ? myToolsSecondaryLine
      : secondaryLine || fallbackSecondaryLine;
    body.appendChild(metaLine);
    if (shouldShowResponsibleAndToolStatus) {
      const statusMeta = document.createElement("div");
      statusMeta.className = "tools-card__status";
      fillToolStatusMeta(statusMeta);
      const responsibleStatusLine = createResponsibleStatusLine();
      body.appendChild(responsibleStatusLine);
      body.appendChild(statusMeta);
    }
    if (isLargeMyToolsCard) {
      const statusLine = document.createElement("div");
      statusLine.className = "tools-card__status tools-card__status--my-tools tools-card__status-value";
      const statusToneClass = getStatusToneClass(statusText);
      if (statusToneClass) statusLine.classList.add(statusToneClass);
      statusLine.textContent = statusText || "не указан";
      const statusAccentColor = getStatusAccentColor(statusText);
      if (statusAccentColor) {
        statusLine.style.color = statusAccentColor;
      }
      body.appendChild(statusLine);
    }
    card.append(media, body);
    return card;
  };

  const buildToolObjectCell = (tool, fallbackObject = "") => {
    const objectCell = document.createElement("div");
    objectCell.className = "tools-table__cell tools-table__cell--object";
    const objectName =
      String(tool?.["Объект"] ?? "").trim() || String(fallbackObject ?? "").trim();
    objectCell.textContent = objectName || "—";
    objectCell.title = objectName || "Объект не указан";
    return objectCell;
  };

  const renderToolsTable = (items) => {
    const table = document.createElement("div");
    const isSearchLikeMode =
      toolsState.mode === "base" ||
      toolsState.mode === "search" ||
      toolsState.mode === "no-accounting-number" ||
      toolsState.mode === "add-photo" ||
      toolsState.mode === "remove-photo" ||
      toolsState.mode === "user" ||
      toolsState.mode === "move-other" ||
      toolsState.mode === "repair" ||
      toolsState.mode === "write-off-pending";
    table.className = "tools-table";
    const shouldHighlightToolStatus = ["user", "move-other"].includes(toolsState.mode);
    const isSearchMode =
      toolsState.mode === "base" ||
      toolsState.mode === "search" ||
      toolsState.mode === "no-accounting-number" ||
      toolsState.mode === "user" ||
      toolsState.mode === "move-other" ||
      toolsState.mode === "repair" ||
      toolsState.mode === "write-off-pending";
    const shouldUseSearchLayout = isSearchLikeMode;
    const normalizeToolStatusLabel = (rawStatus, movingNow = false) => {
      if (movingNow) return "Перемещается";
      const normalized = String(rawStatus ?? "").trim().toLocaleLowerCase("ru");
      if (!normalized) return "не указан";
      if (normalized === "рабочий") return "Исправный";
      if (normalized === "в процессе перемещения") return "Перемещается";
      return String(rawStatus ?? "").trim();
    };
    const getStatusAccentColor = (rawStatus) => {
      const normalized = String(rawStatus ?? "").trim().toLocaleLowerCase("ru");
      if (normalized === "в ремонте") return "#ea580c";
      if (normalized === "сломан") return "#eab308";
      if (normalized === "на списание") return "#dc2626";
      if (normalized === "в процессе перемещения" || normalized === "перемещается") return "#2563eb";
      return "";
    };
    const appendResponsibleValue = (container, valueText) => {
      const normalized = String(valueText ?? "").trim() || "не указан";
      if (isSearchMode) {
        const [surname, ...rest] = normalized.split(/\s+/).filter(Boolean);
        if (surname) {
          const surnameEl = document.createElement("span");
          surnameEl.style.fontWeight = "700";
          surnameEl.textContent = surname;
          container.appendChild(surnameEl);
          if (rest.length > 0) {
            container.append(` ${rest.join(" ")}`);
          }
          return;
        }
      }
      container.textContent = normalized;
    };

    items.forEach((tool, moveIndex) => {
      const row = document.createElement("div");
      row.className = "tools-table__row";
      row.classList.toggle("is-selected", toolsState.selectedIds.has(tool.__selectionId));
      row.classList.toggle("tools-item--pending-response", tool.__pendingMove);
      applyToolStatusClasses(row, tool);
      row.dataset.toolsItem = "true";
      row.dataset.toolId = tool.__selectionId;
      const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
      const hasPhoto = Number.isFinite(photoCount) && photoCount > 0;
      row.classList.toggle("tools-table__row--no-photo", !hasPhoto);
      const numberCell = document.createElement("div");
      numberCell.className = "tools-table__cell tools-table__cell--number";
      const number = resolveToolNumberValue(tool);
      const photoNumber = resolveToolPhotoNumber(tool);
      const objectName = String(tool?.["Объект"] ?? "").trim();
      const numberValueEl = document.createElement("div");
      numberValueEl.className = "tools-table__number-value";
      numberValueEl.textContent = number || "—";
      numberCell.appendChild(numberValueEl);
      if (objectTrackingEnabled) {
        const objectValueEl = document.createElement("div");
        objectValueEl.className = "tools-table__number-object";
        objectValueEl.textContent = objectName || "—";
        objectValueEl.title = objectName || "Объект не указан";
        numberCell.appendChild(objectValueEl);
      }
      const infoCell = document.createElement("div");
      infoCell.className = "tools-table__cell";
      const title = document.createElement("div");
      title.className = "tools-table__title";
      const name = String(tool?.["Наименование"] ?? "").trim();
      title.textContent = name || "Без названия";
      const meta = document.createElement("div");
      meta.className = "tools-table__meta tools-table__meta--stack";
      const manufacturer = String(tool?.["Производитель"] ?? "").trim();
      const model = String(tool?.["Модель"] ?? "").trim();
      const manufacturerModelLine = [manufacturer, model].filter(Boolean).join(" · ");
      const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
      const hideAccountingLine =
        !isSearchMode &&
        toolsState.numberKey === "Бух.номер" &&
        accountingNumber === number;
      const accountingLine = hideAccountingLine
        ? ""
        : accountingNumber
          ? accountingNumber
          : "Нет";
      const normalizedCostLine = isSearchMode
        ? formatSearchCostValue(tool?.["Стоимость"])
        : formatToolCostValue(tool);
      const accountingWithLabel = accountingLine;
      const accountingCostLineParts = [accountingWithLabel, normalizedCostLine].filter(Boolean);
      const accountingCostLine = accountingCostLineParts.join(" / ");
      const metaLines = isSearchMode
        ? [manufacturerModelLine, accountingCostLine].filter(Boolean)
        : [manufacturerModelLine, accountingCostLine].filter(Boolean);
      const isMovingNow = Boolean(tool?.__pendingMove);
      const status = String(tool?.["Статус"] ?? "").trim();
      const statusText = normalizeToolStatusLabel(status, isMovingNow);
      if (metaLines.length === 0) {
        meta.textContent = "—";
      } else {
        metaLines.forEach((line) => {
          const lineEl = document.createElement("div");
          if (line === accountingCostLine) {
            const [accountingPart, costPart] = accountingCostLineParts;
            if (accountingPart === "Нет") {
              const missingAccountingEl = document.createElement("span");
              missingAccountingEl.textContent = "Нет";
              missingAccountingEl.style.color = "#dc2626";
              missingAccountingEl.style.fontWeight = "700";
              lineEl.appendChild(missingAccountingEl);
              if (costPart) {
                lineEl.append(" / ", costPart);
              }
            } else {
              lineEl.textContent = line;
            }
          } else if (line === "Нет") {
            const missingAccountingEl = document.createElement("span");
            missingAccountingEl.textContent = "Нет";
            missingAccountingEl.style.color = "#dc2626";
            missingAccountingEl.style.fontWeight = "700";
            lineEl.appendChild(missingAccountingEl);
          } else {
            lineEl.textContent = line;
          }
          meta.appendChild(lineEl);
        });
      }
      if (toolsState.mode !== "user") {
        const responsibleLine = document.createElement("div");
        const responsibleValue = document.createElement("span");
        appendResponsibleValue(
          responsibleValue,
          String(tool?.["Ответственный"] ?? "").trim() || "не указан"
        );
        if (!isSearchMode && toolsState.mode !== "add-photo" && toolsState.mode !== "remove-photo") {
          const responsibleLabel = document.createElement("span");
          responsibleLabel.textContent = "Ответственный: ";
          responsibleLine.append(responsibleLabel, responsibleValue);
        } else {
          responsibleLine.append(responsibleValue);
        }
        meta.appendChild(responsibleLine);
      }

      const statusLine = document.createElement("div");
      const value = document.createElement("span");
      value.textContent = statusText;
      value.style.fontWeight = "700";
      value.style.textDecoration = "none";
      value.style.color = getStatusAccentColor(statusText);
      statusLine.append(value);
      meta.appendChild(statusLine);
      const kitItems = getToolKitItems(tool);
      if (kitItems.length > 0) {
        const kitLine = document.createElement("div");
        const kitBadge = document.createElement("button");
        kitBadge.type = "button";
        kitBadge.className = "tools-kit-badge tools-kit-badge--inline";
        kitBadge.dataset.toolsKitOpen = "true";
        kitBadge.textContent = `Комплектация: ${kitItems.length}`;
        kitBadge.setAttribute("aria-label", "Открыть комплектацию инструмента");
        kitLine.appendChild(kitBadge);
        meta.appendChild(kitLine);
      }

      if (shouldHighlightToolStatus && toolsState.mode !== "user") {
        const toolStatusLine = document.createElement("div");
        const toolStatusLabel = document.createElement("span");
        toolStatusLabel.textContent = "Статус инструмента:";
        toolStatusLabel.style.fontWeight = "700";
        toolStatusLabel.style.textDecoration = "none";
        const toolStatusValue = document.createElement("span");
        toolStatusValue.textContent = ` ${statusText}`;
        toolStatusValue.style.fontWeight = "700";
        toolStatusValue.style.textDecoration = "none";
        toolStatusLine.append(toolStatusLabel, toolStatusValue);
        meta.appendChild(toolStatusLine);
      }
      infoCell.append(title, meta);
      const photoCell = document.createElement("div");
      photoCell.className = "tools-table__cell tools-table__cell--thumb";
      const thumb = document.createElement("div");
      thumb.className = "tools-table__thumb";
      const img = document.createElement("img");
      img.className = "tools-table__thumb-image";
      img.alt = name || "Инструмент";
      applyToolPhotoWithFallback({
        img,
        orgFolder: toolsState.orgFolder,
        toolNumber: photoNumber,
        hasPhoto,
      });
      thumb.appendChild(img);
      if (hasPhoto) {
        thumb.dataset.pendingPhotoOpen = "true";
        thumb.dataset.pendingPhotoMoveIndex = String(moveIndex);
        thumb.setAttribute("role", "button");
        thumb.tabIndex = 0;
        thumb.setAttribute("aria-label", "Открыть фото инструмента");
      }
      photoCell.appendChild(thumb);
      if (shouldUseSearchLayout) {
        row.classList.add("tools-table__row--search");
      }
      photoCell.appendChild(buildToolsNotesButton(tool, "tools-notes-trigger--thumb"));
      if (toolsState.mode === "remove-photo") {
        const safePhotoCount = Number.isFinite(photoCount) ? photoCount : 0;
        const photoCountText = String(safePhotoCount);
        const photoBadgeEl = document.createElement("div");
        photoBadgeEl.className = "remove-photo-badge remove-photo-badge--tool";
        photoBadgeEl.setAttribute("aria-label", `У инструмента ${photoCountText} фото`);
        photoBadgeEl.textContent = photoCountText;
        row.classList.add("tools-table__row--remove-photo");
        row.append(numberCell, infoCell, photoCell, photoBadgeEl);
      } else {
        row.append(numberCell, infoCell, photoCell);
      }
      table.appendChild(row);
    });

    return table;
  };

  const renderToolsList = () => {
    if (!toolsListEl) return;
    clearToolsList();
    const viewMode = toolsState.view;
    const isMapView = viewMode === "map";
    toolsListEl.classList.toggle("is-large", viewMode === "large");
    toolsListEl.classList.toggle("is-compact", viewMode === "compact");
    toolsListEl.classList.toggle("is-table", viewMode === "table");
    toolsListEl.classList.toggle("is-hidden", isMapView);
    if (toolsSearchMapEl) {
      toolsSearchMapEl.classList.toggle("is-hidden", !isMapView);
    }
    if (toolsFilterActionsEl) {
      toolsFilterActionsEl.classList.remove("is-hidden");
    }
    if (toolsFiltersToggleEl) {
      toolsFiltersToggleEl.classList.remove("is-hidden");
    }
    const items = toolsState.filtered;
    const groupedItems = buildGroupedTools(items);
    if (isMapView) {
      const points = buildToolsMapPointsByObjects(items, toolsState.objects);
      renderToolsSearchMap(points);
    } else if (viewMode === "table") {
      groupedItems.forEach((group) => {
        if (toolsState.grouping !== "none") {
          toolsListEl.appendChild(buildToolsGroupTitle(group));
        }
        toolsListEl.appendChild(renderToolsTable(group.items));
      });
    } else {
      let cardIndex = 0;
      groupedItems.forEach((group) => {
        if (toolsState.grouping !== "none") {
          toolsListEl.appendChild(buildToolsGroupTitle(group));
        }
        group.items.forEach((tool) => {
          toolsListEl.appendChild(
            renderToolCard(tool, viewMode, toolsState.orgFolder, cardIndex)
          );
          cardIndex += 1;
        });
      });
    }
    if (toolsEmptyEl) {
      toolsEmptyEl.classList.toggle("is-hidden", isMapView || items.length > 0);
    }
    const filteredToolsCost = items.reduce((sum, tool) => {
      const toolCost = normalizeCostValue(tool?.["Стоимость"]);
      return sum + (Number.isFinite(toolCost) ? toolCost : 0);
    }, 0);
    setToolsSubtitle(
      `Показано ${items.length} из ${toolsState.tools.length} · На сумму ${formatNotificationCostWithoutCurrency(filteredToolsCost)} р.`
    );
    updateToolsFiltersUi();
    setToolsZoneSubtitle("");
    syncToolsViewButtons();
    syncToolsTopZoneStability();
    queueToolsControlsWrapSync();
    updateToolsSelectionUi();
  };

  const doesToolMatchSelectedFilters = (
    tool,
    { includeStandaloneStatus = false } = {}
  ) => {
    const hasSelected = (key) => {
      const selectedValues = Array.isArray(toolsState.filters[key])
        ? toolsState.filters[key]
        : [];
      if (selectedValues.length === 0) return false;
      return !isToolsFilterFullySelected(key, selectedValues);
    };
    const includesSelected = (key, value) =>
      toolsState.filters[key].includes(String(value ?? "").trim());
    if (
      hasSelected("group") &&
      !includesSelected("group", tool?.["Граппа инструментов"])
    ) {
      return false;
    }
    if (objectTrackingEnabled && hasSelected("object") && !includesSelected("object", tool?.["Объект"])) {
      return false;
    }
    const toolStatus = String(tool?.["Статус"] ?? "").trim();
    if (includeStandaloneStatus && isWriteOffPendingMode()) {
      const selectedStatus = String(toolsState.statusStandalone ?? "").trim();
      if (selectedStatus) {
        const isMovingSelected = selectedStatus === TOOLS_STATUS_MOVING_FILTER_VALUE;
        const isMovingTool = Boolean(tool?.__pendingMove);
        if (isMovingSelected ? !isMovingTool : toolStatus !== selectedStatus) {
          return false;
        }
      }
    } else if (hasSelected("status")) {
      const selectedStatuses = toolsState.filters.status;
      const regularStatusMatch = selectedStatuses.includes(toolStatus);
      const movingMatch =
        selectedStatuses.includes(TOOLS_STATUS_MOVING_FILTER_VALUE) &&
        Boolean(tool?.__pendingMove);
      if (!regularStatusMatch && !movingMatch) return false;
    }
    if (
      hasSelected("responsible") &&
      !includesSelected("responsible", tool?.["Ответственный"])
    ) {
      return false;
    }
    if (hasSelected("name") && !includesSelected("name", tool?.["Наименование"])) {
      return false;
    }
    if (
      hasSelected("manufacturer") &&
      !includesSelected("manufacturer", tool?.["Производитель"])
    ) {
      return false;
    }
    if (hasSelected("model") && !includesSelected("model", tool?.["Модель"])) {
      return false;
    }
    if (hasSelected("photo")) {
      const photoFilters = toolsState.filters.photo;
      const hasWith = photoFilters.includes("with");
      const hasWithout = photoFilters.includes("without");
      if (hasWith !== hasWithout) {
        const count = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
        const hasPhoto = Number.isFinite(count) && count > 0;
        if (hasWith && !hasPhoto) return false;
        if (hasWithout && hasPhoto) return false;
      }
    }
    return true;
  };

  const applyToolsFilters = () => {
    const search = toolsState.search.trim();
    const tokens = search ? search.split(/\s+/).filter(Boolean) : [];
    const filtered = toolsState.tools.filter((tool) => {
      if (toolsState.mode === "no-accounting-number") {
        const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
        if (accountingNumber) return false;
      }
      if (isRepairLikeMode() && toolsState.repairBrokenOnly) {
        const normalizedStatus = String(tool?.["Статус"] ?? "")
          .trim()
          .toLocaleLowerCase("ru");
        if (normalizedStatus !== "сломан") {
          return false;
        }
      }
      if (isRepairLikeMode() && toolsState.repairInRepairOnly) {
        const normalizedStatus = String(tool?.["Статус"] ?? "")
          .trim()
          .toLocaleLowerCase("ru");
        const requiredStatus = toolsState.mode === "write-off-pending" ? "на списание" : "в ремонте";
        if (normalizedStatus !== requiredStatus) {
          return false;
        }
      }
      if (!doesToolMatchSelectedFilters(tool, { includeStandaloneStatus: true })) {
        return false;
      }
      if (tokens.length) {
        const searchLine = tool.__searchLine ?? "";
        return tokens.every((token) => searchLine.includes(token));
      }
      return true;
    });
    toolsState.filtered = sortToolsByNumber(filtered);
    renderToolsList();
    if (writeOffModalEl && !writeOffModalEl.classList.contains("is-hidden")) {
      applyWriteOffFilters();
    }
  };

  const renderToolsFilterTriggerLabel = (containerEl, selectedValues) => {
    if (!containerEl) return;
    const triggerEl = containerEl.querySelector("[data-tools-filter-trigger]");
    if (!triggerEl) return;
    const key = String(containerEl.dataset.toolsFilter ?? "").trim();
    const safeValues = Array.isArray(selectedValues) ? selectedValues : [];
    const totalOptions = containerEl.querySelectorAll(
      'input[type="checkbox"][data-tools-filter-checkbox]'
    ).length;
    const isAllSelected = totalOptions > 0 && safeValues.length === totalOptions;
    const displayValues =
      key === "photo"
        ? safeValues.map((value) => (value === "with" ? "С фото" : "Без фото"))
        : key === "status"
          ? safeValues.map((value) => (String(value).trim() === "Рабочий" ? "Исправный" : value))
          : safeValues;
    if (!displayValues.length || isAllSelected) {
      triggerEl.textContent = "Все";
      triggerEl.classList.remove("is-active");
      return;
    }
    triggerEl.classList.add("is-active");
    triggerEl.textContent =
      displayValues.length === 1
        ? displayValues[0]
        : `Выбрано: ${displayValues.length}`;
  };

  const getToolsFilterAllValues = (containerEl) => {
    if (!containerEl) return [];
    return Array.from(
      containerEl.querySelectorAll('input[type="checkbox"][data-tools-filter-checkbox]')
    )
      .map((checkboxEl) => String(checkboxEl.value ?? "").trim())
      .filter(Boolean);
  };

  const syncToolsFilterSelectAllButton = (containerEl) => {
    if (!containerEl) return;
    const clearEl = containerEl.querySelector("[data-tools-filter-clear]");
    if (!clearEl) return;
    const allValues = getToolsFilterAllValues(containerEl);
    const checkedCount = containerEl.querySelectorAll(
      'input[type="checkbox"][data-tools-filter-checkbox]:checked'
    ).length;
    const isAllSelected = allValues.length > 0 && checkedCount === allValues.length;
    clearEl.textContent = isAllSelected ? "Отменить всё" : "Выбрать всё";
  };

  const selectAllToolsFilterValues = (key) => {
    if (!key) return;
    const containerEl = contentEl.querySelector(
      `.tools-filter-dropdown[data-tools-filter="${key}"]`
    );
    const allValues = getToolsFilterAllValues(containerEl);
    toolsState.filters[key] = allValues;
    syncToolsFilterValue(key, allValues);
  };

  const TOOLS_STATUS_MOVING_FILTER_VALUE = "__moving__";
  const TOOLS_STATUS_WORKING_VALUE = "Рабочий";
  const TOOLS_STATUS_WORKING_LABEL = "Исправный";

  const normalizeStatusFilterOption = (option) => {
    if (typeof option === "string") {
      const value = option.trim();
      if (!value) return { value: "", label: "" };
      return {
        value,
        label:
          value.toLocaleLowerCase("ru") === TOOLS_STATUS_WORKING_VALUE.toLocaleLowerCase("ru")
            ? TOOLS_STATUS_WORKING_LABEL
            : value,
      };
    }
    const value = String(option?.value ?? "").trim();
    const label = String(option?.label ?? value).trim();
    if (!value) return { value: "", label: "" };
    return { value, label: label || value };
  };

  const fillToolsFilterOptions = (key, values) => {
    const containerEls = contentEl.querySelectorAll(
      `.tools-filter-dropdown[data-tools-filter="${key}"]`
    );
    if (!containerEls.length) return;
    const currentValues = Array.isArray(toolsState.filters[key])
      ? toolsState.filters[key]
      : [];
    containerEls.forEach((containerEl) => {
      const optionsEl = containerEl.querySelector("[data-tools-filter-options]");
      if (!optionsEl) return;
      optionsEl.innerHTML = "";
      values.forEach((entry, index) => {
        const option =
          key === "status"
            ? normalizeStatusFilterOption(entry)
            : {
                value: String(entry ?? "").trim(),
                label: String(entry ?? "").trim(),
              };
        if (!option.value) return;
        const id = `tools-filter-${key}-${index}`;
        const optionLabelEl = document.createElement("label");
        optionLabelEl.className = "tools-filter-dropdown__option";
        optionLabelEl.setAttribute("for", id);
        const checkboxEl = document.createElement("input");
        checkboxEl.type = "checkbox";
        checkboxEl.id = id;
        checkboxEl.value = option.value;
        checkboxEl.checked = currentValues.includes(option.value);
        checkboxEl.dataset.toolsFilterCheckbox = key;
        const textEl = document.createElement("span");
        textEl.textContent = option.label;
        optionLabelEl.append(checkboxEl, textEl);
        optionsEl.appendChild(optionLabelEl);
      });
      renderToolsFilterTriggerLabel(containerEl, currentValues);
      syncToolsFilterSelectAllButton(containerEl);
    });
  };

  const syncToolsFilterValue = (key, values) => {
    const selectedValues = Array.isArray(values) ? values : [];
    const containerEls = contentEl.querySelectorAll(
      `.tools-filter-dropdown[data-tools-filter="${key}"]`
    );
    containerEls.forEach((containerEl) => {
      const checkboxes = containerEl.querySelectorAll(
        'input[type="checkbox"][data-tools-filter-checkbox]'
      );
      checkboxes.forEach((checkboxEl) => {
        checkboxEl.checked = selectedValues.includes(String(checkboxEl.value ?? "").trim());
      });
      renderToolsFilterTriggerLabel(containerEl, selectedValues);
      syncToolsFilterSelectAllButton(containerEl);
    });
  };

  const isToolsFilterFullySelected = (key, selectedValues) => {
    const containerEl = contentEl.querySelector(
      `.tools-filter-dropdown[data-tools-filter="${key}"]`
    );
    if (!containerEl) return false;
    const totalOptions = getToolsFilterAllValues(containerEl).length;
    const safeValues = Array.isArray(selectedValues) ? selectedValues : [];
    return totalOptions > 0 && safeValues.length === totalOptions;
  };

  const countAppliedToolsFilters = () => {
    const fromDropdowns = Object.entries(toolsState.filters).reduce(
      (total, [key, value]) => {
        if (!Array.isArray(value)) return total;
        if (isToolsFilterFullySelected(key, value)) return total;
        return total + value.length;
      },
      0
    );
    return (
      fromDropdowns +
      (isWriteOffPendingMode() && toolsState.statusStandalone ? 1 : 0) +
      (isRepairLikeMode() && toolsState.repairBrokenOnly ? 1 : 0) +
      (isRepairLikeMode() && toolsState.repairInRepairOnly ? 1 : 0)
    );
  };

  const updateToolsFiltersUi = () => {
    const appliedCount = countAppliedToolsFilters();
    const isFiltersPanelOpen = Boolean(
      toolsFiltersPanelEl?.classList.contains("is-open")
    );
    if (toolsFiltersToggleEl) {
      toolsFiltersToggleEl.classList.toggle("is-active", appliedCount > 0);
    }
    const statusEls = contentEl.querySelectorAll("[data-tools-filters-status]");
    statusEls.forEach((statusEl) => {
      statusEl.textContent =
        appliedCount > 0
          ? `Фильтры: ${appliedCount} выбр.`
          : isFiltersPanelOpen
            ? ""
            : "Фильтры не выбраны";
      statusEl.classList.toggle("is-active", appliedCount > 0);
    });
    const resetButtonEls = contentEl.querySelectorAll("[data-tools-filters-reset]");
    resetButtonEls.forEach((resetButtonEl) => {
      resetButtonEl.classList.toggle("is-hidden", appliedCount === 0);
    });
  };

  const resetToolsFilters = () => {
    Object.keys(toolsState.filters).forEach((key) => {
      toolsState.filters[key] = [];
      syncToolsFilterValue(key, []);
    });
    toolsState.statusStandalone = "";
    if (toolsStatusStandaloneEl) {
      toolsStatusStandaloneEl.value = "";
    }
    toolsState.repairBrokenOnly = false;
    toolsState.repairInRepairOnly = false;
    updateToolsBrokenOnlyToggleUi();
    updateToolsInRepairOnlyToggleUi();
    applyToolsFilters();
  };

  const prepareToolsFilters = () => {
    const collectValues = (field) => {
      const set = new Set();
      toolsState.tools.forEach((tool) => {
        const value = String(tool?.[field] ?? "").trim();
        if (value) set.add(value);
      });
      return Array.from(set).sort((a, b) =>
        a.localeCompare(b, "ru", { numeric: true })
      );
    };
    fillToolsFilterOptions("group", collectValues("Граппа инструментов"));
    fillToolsFilterOptions("object", collectValues("Объект"));
    const statusValues = collectValues("Статус");
    const statusOptions = statusValues.map((value) => ({
      value,
      label:
        value.toLocaleLowerCase("ru") === TOOLS_STATUS_WORKING_VALUE.toLocaleLowerCase("ru")
          ? TOOLS_STATUS_WORKING_LABEL
          : value,
    }));
    statusOptions.push({
      value: TOOLS_STATUS_MOVING_FILTER_VALUE,
      label: "Перемещается",
    });
    fillToolsFilterOptions("status", statusOptions);
    if (toolsStatusStandaloneEl) {
      const current = String(toolsState.statusStandalone ?? "").trim();
      const options = [{ value: "", label: "Все" }, ...statusOptions];
      toolsStatusStandaloneEl.innerHTML = options
        .map(
          (option) =>
            `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`
        )
        .join("");
      toolsStatusStandaloneEl.value = options.some((option) => option.value === current)
        ? current
        : "";
      toolsState.statusStandalone = toolsStatusStandaloneEl.value;
    }
    fillToolsFilterOptions("responsible", collectValues("Ответственный"));
    fillToolsFilterOptions("name", collectValues("Наименование"));
    fillToolsFilterOptions("manufacturer", collectValues("Производитель"));
    fillToolsFilterOptions("model", collectValues("Модель"));
    fillToolsFilterOptions(
      "photo",
      [
        { value: "with", label: "С фото" },
        { value: "without", label: "Без фото" },
      ].map((item) => item.label)
    );
    const photoContainerEl = contentEl.querySelector(
      '.tools-filter-dropdown[data-tools-filter="photo"]'
    );
    if (photoContainerEl) {
      const checkboxes = photoContainerEl.querySelectorAll(
        'input[type="checkbox"][data-tools-filter-checkbox="photo"]'
      );
      checkboxes.forEach((checkboxEl) => {
        const label = String(checkboxEl.value ?? "").trim();
        checkboxEl.value = label === "С фото" ? "with" : "without";
        checkboxEl.checked = toolsState.filters.photo.includes(checkboxEl.value);
      });
      renderToolsFilterTriggerLabel(photoContainerEl, toolsState.filters.photo);
    }
    updateToolsFiltersUi();
  };

  const loadUserTools = async () => {
    const orgFolder = context.orgFolderName ?? "";
    toolsState.orgFolder = orgFolder;
    if (!orgFolder) {
      toolsState.tools = [];
      toolsState.filtered = [];
      setToolsSubtitle("Не удалось определить организацию.");
      renderToolsList();
      return;
    }
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    const objectsPathLocal = `./${orgFolder}/Объекты.json`;
    let rawTools = [];
    let rawObjects = [];
    try {
      const raw = await loadJson(toolsPath);
      rawTools = Array.isArray(raw) ? raw : Array.isArray(raw?.tools) ? raw.tools : [];
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов.", error);
      rawTools = [];
    }
    try {
      const raw = await loadJson(objectsPathLocal);
      rawObjects = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.objects)
          ? raw.objects
          : [];
    } catch (error) {
      console.warn("Не удалось загрузить список объектов.", error);
      rawObjects = [];
    }
    const sourceResponsible =
      toolsState.mode === "replacement" && toolsState.activeReplacementResponsible
        ? toolsState.activeReplacementResponsible
        : user?.full_name ?? "";
    const userNameKey = normalizePersonName(sourceResponsible);
    const { pendingNumbers, pendingAccountingNumbers } =
      await loadPendingMoves(orgFolder);
    toolsState.tools = rawTools
      .filter(
        (tool) =>
          normalizePersonName(tool?.["Ответственный"] ?? "") === userNameKey
      )
      .map((tool, index) => {
        const selectionId = buildToolSelectionId(tool, index);
        const number = String(tool?.["Номер"] ?? "").trim();
        const accounting = String(tool?.["Бух.номер"] ?? "").trim();
        const hasPendingMove =
          (number && pendingNumbers.has(number)) ||
          (accounting && pendingAccountingNumbers.has(accounting));
        return {
          ...tool,
          __searchLine: buildToolSearchLine(tool),
          __selectionId: selectionId,
          __pendingMove: hasPendingMove,
          __statusTone: resolveToolStatusTone(tool),
        };
      })
      .sort((a, b) =>
        resolveToolNumberValue(a).localeCompare(resolveToolNumberValue(b), "ru", {
          numeric: true,
        })
      );
    toolsState.toolMap = new Map(
      toolsState.tools.map((tool) => [tool.__selectionId, tool])
    );
    toolsState.objects = normalizeObjectsData(rawObjects);
    resetToolsSelection();
    prepareToolsFilters();
    applyToolsFilters();
  };

  const loadBaseTools = async () => {
    const orgFolder = context.orgFolderName ?? "";
    toolsState.orgFolder = orgFolder;
    if (!orgFolder) {
      toolsState.tools = [];
      toolsState.filtered = [];
      setToolsSubtitle("Не удалось определить организацию.");
      renderToolsList();
      return;
    }
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    const objectsPathLocal = `./${orgFolder}/Объекты.json`;
    let rawTools = [];
    let rawObjects = [];
    try {
      const raw = await loadJson(toolsPath);
      rawTools = Array.isArray(raw) ? raw : Array.isArray(raw?.tools) ? raw.tools : [];
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов.", error);
      rawTools = [];
    }
    try {
      const raw = await loadJson(objectsPathLocal);
      rawObjects = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.objects)
          ? raw.objects
          : [];
    } catch (error) {
      console.warn("Не удалось загрузить список объектов.", error);
      rawObjects = [];
    }
    const { pendingNumbers, pendingAccountingNumbers } =
      await loadPendingMoves(orgFolder);
    toolsState.tools = rawTools
      .map((tool, index) => {
        const selectionId = buildToolSelectionId(tool, index);
        const number = String(tool?.["Номер"] ?? "").trim();
        const accounting = String(tool?.["Бух.номер"] ?? "").trim();
        const hasPendingMove =
          (number && pendingNumbers.has(number)) ||
          (accounting && pendingAccountingNumbers.has(accounting));
        return {
          ...tool,
          __searchLine: buildToolSearchLine(tool),
          __selectionId: selectionId,
          __pendingMove: hasPendingMove,
          __statusTone: resolveToolStatusTone(tool),
        };
      })
      .sort((a, b) =>
        resolveToolNumberValue(a).localeCompare(resolveToolNumberValue(b), "ru", {
          numeric: true,
        })
      );
    toolsState.toolMap = new Map(
      toolsState.tools.map((tool) => [tool.__selectionId, tool])
    );
    toolsState.objects = normalizeObjectsData(rawObjects);
    resetToolsSelection();
    prepareToolsFilters();
    applyToolsFilters();
  };

  const saveToolsViewPreference = async (view) => {
    try {
      const normalized = normalizeToolsView(view);
      const userSettings = context.settingsData.users?.[context.userKey] ?? {};
      context.settingsData.users[context.userKey] = {
        ...userSettings,
        energy: {
          ...(userSettings.energy ?? {}),
          toolsView: normalized,
        },
      };
      await saveJson(context.settingsPath, context.settingsData, {
        user: currentUser,
      });
    } catch (error) {
      console.warn("Не удалось сохранить вариант отображения инструментов.", error);
    }
  };

  let mechanismsModalEl = null;
  let organizationMechanisms = [];
  let organizationMechanismBookings = [];
  let organizationObjects = [];
  let mechanismsBookingControls = null;
  let mechanismsScheduleDays = 3;
  const mechanismsBookingFilters = { fullTitle: "", name: "", object: "all" };
  const mechanismsPath = `./${context.orgFolderName}/Механизмы.json`;
  const mechanismBookingsPath = `./${context.orgFolderName}/Брони механизмов.json`;

  const mechanismTitle = (item = {}) => [item.name, item.manufacturer, item.model].filter(Boolean).join(" ") || "Механизм";
  const mechanismPhoto = (item = {}) => {
    const source = item.photo ?? item.photoUrl ?? item["Фото"] ?? item.photos?.[0] ?? "";
    return String(source || "").trim();
  };
  const renderMechanismPhoto = (item, alt = "") => {
    const source = mechanismPhoto(item);
    return source
      ? `<img src="${escapeHtml(source)}" alt="${escapeHtml(alt)}" data-mechanism-photo-image>`
      : '<span aria-hidden="true">🚜</span>';
  };
  const extractOrganizationObjects = (data) => (Array.isArray(data) ? data : data?.objects || [])
    .map((item) => String(item?.name ?? item ?? "").trim()).filter(Boolean);

  const renderMechanismsBase = () => {
    const target = mechanismsModalEl?.querySelector("[data-mechanisms-overview]");
    if (!target) return;
    const scheduleDays = Array.from({ length: mechanismsScheduleDays }, (_, offset) => {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() + offset);
      return {
        key: date.toLocaleDateString("sv-SE"),
        label: date.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" }),
      };
    });
    const bookingsFor = (mechanism, date) => organizationMechanismBookings.filter((booking) =>
      String(booking.mechanismId) === String(mechanism.id) && String(booking.date) === date
    );
    const bookingTimeline = (mechanism, date) => {
      const workTimes = String(mechanism.workTime || "08:00–17:00").match(/\d{1,2}:\d{2}/g) || ["08:00", "17:00"];
      const [workFrom, workTo] = workTimes.length > 1 ? workTimes : ["08:00", "17:00"];
      const busy = bookingsFor(mechanism, date)
        .map((booking) => ({
          ...booking,
          timeFrom: String(booking.timeFrom || ""),
          timeTo: String(booking.timeTo || ""),
        }))
        .filter(({ timeFrom, timeTo }) => timeFrom < timeTo && timeTo > workFrom && timeFrom < workTo)
        .sort((a, b) => a.timeFrom.localeCompare(b.timeFrom));
      const free = [];
      let cursor = workFrom;
      busy.forEach(({ timeFrom, timeTo }) => {
        const start = timeFrom < workFrom ? workFrom : timeFrom;
        const end = timeTo > workTo ? workTo : timeTo;
        if (start > cursor) free.push({ timeFrom: cursor, timeTo: start });
        if (end > cursor) cursor = end;
      });
      if (cursor < workTo) free.push({ timeFrom: cursor, timeTo: workTo });
      return { busy, free, workFrom, workTo };
    };
    const availability = organizationMechanisms.map((mechanism) => {
      const todayBookings = bookingsFor(mechanism, scheduleDays[0].key);
      const { free } = bookingTimeline(mechanism, scheduleDays[0].key);
      return { mechanism, todayBookings, status: free.length ? (todayBookings.length ? "partial" : "free") : "busy" };
    }).filter((item) => item.status !== "busy");
    const normalizedFullTitle = mechanismsBookingFilters.fullTitle.trim().toLocaleLowerCase("ru-RU");
    const normalizedName = mechanismsBookingFilters.name.trim().toLocaleLowerCase("ru-RU");
    const filteredMechanisms = organizationMechanisms.filter((mechanism) => {
      const visibleBookings = scheduleDays.flatMap((day) => bookingsFor(mechanism, day.key));
      const matchesObject = mechanismsBookingFilters.object === "all"
        || visibleBookings.some((booking) => String(booking.object || "") === mechanismsBookingFilters.object);
      const fullTitle = mechanismTitle(mechanism).toLocaleLowerCase("ru-RU");
      const name = String(mechanism?.name ?? "").trim().toLocaleLowerCase("ru-RU");
      return (!normalizedFullTitle || fullTitle === normalizedFullTitle)
        && (!normalizedName || name === normalizedName)
        && matchesObject;
    });
    const renderSlot = (mechanism, day) => {
      const { busy, free } = bookingTimeline(mechanism, day.key);
      if (!busy.length) return `<button class="mechanisms-slot" type="button" data-mechanisms-booking-id="${escapeHtml(mechanism.id)}" data-mechanisms-booking-date="${escapeHtml(day.key)}">Свободно<br><b>${escapeHtml(free[0]?.timeFrom || "08:00")}–${escapeHtml(free[0]?.timeTo || "17:00")}</b></button>`;
      const intervals = [
        ...busy.map((booking) => ({ type: "busy", timeFrom: booking.timeFrom, html: `<button class="mechanisms-slot mechanisms-slot--busy" type="button" data-mechanisms-booking-details="${escapeHtml(booking.id)}" aria-label="Показать информацию о бронировании с ${escapeHtml(booking.timeFrom)} до ${escapeHtml(booking.timeTo)}"><span class="mechanisms-slot__state">Занято</span><b>${escapeHtml(booking.timeFrom)}–${escapeHtml(booking.timeTo)}</b><span>${escapeHtml(booking.object || "Объект не указан")}</span></button>` })),
        ...free.map((interval) => ({ type: "free", timeFrom: interval.timeFrom, html: `<button class="mechanisms-slot mechanisms-slot--free" type="button" data-mechanisms-booking-id="${escapeHtml(mechanism.id)}" data-mechanisms-booking-date="${escapeHtml(day.key)}" data-mechanisms-booking-from="${escapeHtml(interval.timeFrom)}" data-mechanisms-booking-to="${escapeHtml(interval.timeTo)}" aria-label="Забронировать свободное время с ${escapeHtml(interval.timeFrom)} до ${escapeHtml(interval.timeTo)}"><span class="mechanisms-slot__state">Свободно</span><b>${escapeHtml(interval.timeFrom)}–${escapeHtml(interval.timeTo)}</b><span>+ Забронировать</span></button>` })),
      ].sort((a, b) => a.timeFrom.localeCompare(b.timeFrom) || a.type.localeCompare(b.type));
      return intervals.map(({ html }) => html).join("");
    };
    const schedulePeriods = [{ days: 3, label: "3 дня" }, { days: 7, label: "7 дней" }, { days: 30, label: "Месяц" }];
    const renderSearchableFilter = ({ name, value, allValue, allLabel, placeholder, options }) => `<div class="mechanisms-filter-select" data-mechanisms-filter-select><label class="mechanisms-filter-search"><span class="mechanisms-filter-search__icon" aria-hidden="true">⌕</span><input type="search" inputmode="search" autocomplete="off" placeholder="${escapeHtml(placeholder)}" aria-label="${escapeHtml(placeholder)}" data-mechanisms-option-search></label><div class="mechanisms-filter-options" role="listbox">${[{ value: allValue, label: allLabel }, ...options].map((option) => `<button class="mechanisms-filter-option${value === option.value ? " is-selected" : ""}" type="button" role="option" aria-selected="${value === option.value}" data-mechanisms-filter-option="${escapeHtml(name)}" data-mechanisms-filter-value="${escapeHtml(option.value)}" data-mechanisms-option-label="${escapeHtml(option.label.toLocaleLowerCase("ru-RU"))}"><span>${escapeHtml(option.label)}</span><span class="mechanisms-filter-option__check" aria-hidden="true">✓</span></button>`).join("")}<div class="mechanisms-filter-options__empty" data-mechanisms-options-empty hidden>Ничего не найдено</div></div></div>`;
    const fullTitleOptions = [...new Set(organizationMechanisms.map(mechanismTitle).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "ru", { numeric: true }))
      .map((title) => ({ value: title, label: title }));
    const nameOptions = [...new Set(organizationMechanisms
      .map((mechanism) => String(mechanism?.name ?? "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "ru", { numeric: true }))
      .map((name) => ({ value: name, label: name }));
    const objectOptions = [...new Set(organizationObjects)]
      .sort((a, b) => a.localeCompare(b, "ru", { numeric: true }))
      .map((name) => ({ value: name, label: name }));
    const hasMechanismFilter = Boolean(normalizedFullTitle || normalizedName);
    const hasObjectFilter = mechanismsBookingFilters.object !== "all";
    const mechanismFilter = `<div class="mechanisms-column-filter" data-mechanisms-column-filter="mechanism"><button class="mechanisms-column-filter__toggle${hasMechanismFilter ? " is-active" : ""}" type="button" data-mechanisms-column-filter-toggle="mechanism" aria-label="Фильтр по наименованию механизма" aria-expanded="false"><span>Наименование</span><span aria-hidden="true">▾</span></button><div class="mechanisms-column-filter__menu mechanisms-column-filter__menu--mechanism" data-mechanisms-column-filter-menu hidden><div class="mechanisms-filter-group"><span class="mechanisms-column-filter__title">Полное название</span><small>Наименование, производитель и модель</small>${renderSearchableFilter({ name: "fullTitle", value: mechanismsBookingFilters.fullTitle, allValue: "", allLabel: "Все полные названия", placeholder: "Найти полное название", options: fullTitleOptions })}</div><div class="mechanisms-filter-group"><span class="mechanisms-column-filter__title">Только наименование</span><small>Без производителя и модели</small>${renderSearchableFilter({ name: "name", value: mechanismsBookingFilters.name, allValue: "", allLabel: "Все наименования", placeholder: "Найти наименование", options: nameOptions })}</div><button type="button" data-mechanisms-filter-reset="mechanism"${hasMechanismFilter ? "" : " hidden"}>Сбросить оба фильтра</button></div></div>`;
    const renderDayFilter = (day) => `<div class="mechanisms-column-filter" data-mechanisms-column-filter="${escapeHtml(day.key)}"><button class="mechanisms-column-filter__toggle${hasObjectFilter ? " is-active" : ""}" type="button" data-mechanisms-column-filter-toggle="${escapeHtml(day.key)}" aria-label="Фильтр столбца ${escapeHtml(day.label)}" aria-expanded="false"><span>${escapeHtml(day.label)}</span><span aria-hidden="true">▾</span></button><div class="mechanisms-column-filter__menu mechanisms-column-filter__menu--day" data-mechanisms-column-filter-menu hidden><span class="mechanisms-column-filter__title">Объект</span>${renderSearchableFilter({ name: "object", value: mechanismsBookingFilters.object, allValue: "all", allLabel: "Все объекты", placeholder: "Найти объект", options: objectOptions })}<button type="button" data-mechanisms-filter-reset="object"${hasObjectFilter ? "" : " hidden"}>Сбросить фильтр</button></div></div>`;
    target.innerHTML = organizationMechanisms.length ? `<div class="mechanisms-grid"><section class="mechanisms-card"><div class="mechanisms-card__top mechanisms-card__top--period"><div class="mechanisms-period" role="group" aria-label="Период таблицы бронирования">${schedulePeriods.map(({ days, label }) => `<button class="mechanisms-period__button${mechanismsScheduleDays === days ? " is-active" : ""}" type="button" data-mechanisms-period="${days}" aria-pressed="${mechanismsScheduleDays === days}">${label}</button>`).join("")}</div></div><div class="mechanisms-calendar" style="grid-template-columns:minmax(110px,1.1fr) repeat(${scheduleDays.length},minmax(120px,1fr))"><div class="mechanisms-calendar__day mechanisms-calendar__corner">${mechanismFilter}</div>${scheduleDays.map(renderDayFilter).join("")}${filteredMechanisms.map((mechanism) => `<div class="mechanisms-calendar__name">${escapeHtml(mechanismTitle(mechanism))}</div>${scheduleDays.map((day) => `<div>${renderSlot(mechanism, day)}</div>`).join("")}`).join("")}</div>${filteredMechanisms.length ? "" : `<div class="mechanisms-filter-empty"><b>Ничего не найдено</b><span>Измените фильтр в заголовке столбца</span><button type="button" data-mechanisms-filter-reset>Показать всё</button></div>`}</section>
      <section class="mechanisms-card"><div class="mechanisms-card__top"><h3>Можно забронировать сегодня</h3><strong class="mechanisms-available-count">${availability.length}</strong></div><div class="mechanisms-list">${availability.length ? availability.map(({ mechanism, todayBookings, status }) => `<button class="mechanisms-item" type="button" data-mechanisms-booking-id="${escapeHtml(mechanism.id)}"><span class="mechanisms-item__icon">${renderMechanismPhoto(mechanism)}</span><span class="mechanisms-item__body"><b>${escapeHtml(mechanismTitle(mechanism))}</b><span>${status === "partial" ? `Занято: ${todayBookings.map((booking) => `${escapeHtml(booking.timeFrom)}–${escapeHtml(booking.timeTo)}`).join(", ")}` : escapeHtml(mechanism.workTime || "Доступен весь рабочий день")}</span></span><span class="mechanisms-status ${status === "partial" ? "mechanisms-status--partial" : ""}">${status === "partial" ? "Частично свободен" : "Свободен"}</span></button>`).join("") : `<div class="mechanisms-availability-empty">На сегодня свободных интервалов нет</div>`}</div></section></div>` : `<div class="mechanisms-base-empty"><span>🚜</span><b>В базе пока нет механизмов</b><p>Механик может добавить технику во вкладке «Управление».</p></div>`;
  };

  const loadMechanismsBase = async () => {
    const target = mechanismsModalEl?.querySelector("[data-mechanisms-overview]");
    if (target) target.innerHTML = '<div class="mechanisms-base-empty"><span>⏳</span><b>Загружаем базу организации…</b></div>';
    const [mechanismsData, bookingsData, objectsData] = await Promise.all([
      loadJson(mechanismsPath).catch(() => ({ mechanisms: [] })),
      loadJson(mechanismBookingsPath).catch(() => ({ bookings: [] })),
      loadJson(`./${context.orgFolderName}/Объекты.json`).catch(() => []),
    ]);
    organizationMechanisms = Array.isArray(mechanismsData) ? mechanismsData : (mechanismsData?.mechanisms || []);
    organizationMechanismBookings = Array.isArray(bookingsData) ? bookingsData : (bookingsData?.bookings || []);
    organizationObjects = extractOrganizationObjects(objectsData);
    renderMechanismsBase();
  };

  const openMechanismsBooking = (mechanismId, bookingDate = "", timeFrom = "", timeTo = "") => {
    const dialog = mechanismsModalEl?.querySelector("[data-mechanisms-booking-dialog]");
    const form = dialog?.querySelector("form");
    const mechanism = organizationMechanisms.find((item) => String(item.id) === String(mechanismId));
    if (!dialog || !form || !mechanism) return;
    // Сначала показываем экран: ошибка в дополнительной настройке поля не должна
    // оставлять нажатие по свободной ячейке без видимого результата.
    dialog.hidden = false;
    form.reset();
    form.querySelector("[data-mechanisms-booking-warning]").hidden = true;
    form.querySelectorAll(".is-invalid").forEach((control) => control.classList.remove("is-invalid"));
    form.elements.mechanismId.value = mechanism.id;
    mechanismsBookingControls?.reset(bookingDate || new Date().toISOString().slice(0, 10));
    if (timeFrom) form.elements.timeFrom.value = timeFrom;
    if (timeTo) form.elements.timeTo.value = timeTo;
    form.querySelectorAll("[data-mechanism-schedule-label]").forEach((label) => { const input = label.closest("[data-mechanism-schedule-select]")?.querySelector('input[type="hidden"]'); if (input) label.textContent = input.value; });
    form.querySelector("[data-mechanisms-booking-source]").textContent = mechanismTitle(mechanism);
    form.querySelector("[data-booking-object-options]").innerHTML = organizationObjects.map((name) => `<button type="button" role="option" aria-selected="false" data-booking-object="${escapeHtml(name)}"><span>${escapeHtml(name)}</span><b aria-hidden="true">✓</b></button>`).join("") || "<p>Объекты пока не добавлены</p>";
    const photo = form.querySelector("[data-mechanisms-booking-photo]");
    photo.innerHTML = renderMechanismPhoto(mechanism, mechanismTitle(mechanism));
    const rate = Number(mechanism.hourlyRate || 0).toLocaleString("ru-RU", { maximumFractionDigits: 2 });
    form.querySelector("[data-mechanisms-booking-rate]").textContent = `${rate} Br/час`;
    requestAnimationFrame(() => form.querySelector("[data-booking-select-trigger]")?.focus());
  };

  const openMechanismsBookingDetails = (bookingId) => {
    const dialog = mechanismsModalEl?.querySelector("[data-mechanisms-booking-details-dialog]");
    const booking = organizationMechanismBookings.find((item) => String(item.id) === String(bookingId));
    if (!dialog || !booking) return;
    const mechanism = organizationMechanisms.find((item) => String(item.id) === String(booking.mechanismId));
    const date = new Date(`${booking.date}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
    dialog.querySelector("[data-mechanisms-booking-details-content]").innerHTML = `
      <div><span>Механизм</span><b>${escapeHtml(mechanismTitle(mechanism || { name: booking.mechanismTitle }))}</b></div>
      <div><span>Объект</span><b>${escapeHtml(booking.object || "Не указан")}</b></div>
      <div><span>Дата и время</span><b>${escapeHtml(date)}, ${escapeHtml(booking.timeFrom)}–${escapeHtml(booking.timeTo)}</b></div>
      ${booking.comment ? `<div><span>Комментарий</span><b>${escapeHtml(booking.comment)}</b></div>` : ""}
      ${booking.createdBy ? `<div><span>Забронировал</span><b>${escapeHtml(booking.createdBy)}</b></div>` : ""}`;
    dialog.hidden = false;
    dialog.querySelector("[data-mechanisms-booking-details-close]")?.focus();
  };

  const openMechanismsModal = () => {
    const isMechanic = String(user?.role ?? "").trim() === mechanicRole;
    if (!mechanismsModalEl) {
      const style = document.createElement("style");
      style.textContent = `
        .mechanisms-modal{position:fixed;inset:0;z-index:90;background:var(--bg)}
        .mechanisms-modal__panel{box-sizing:border-box;width:100%;height:100dvh;overflow:auto;padding:0 5px calc(24px + env(safe-area-inset-bottom));scrollbar-width:thin}
        .mechanisms-modal__head{position:sticky;top:0;z-index:3;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;margin:0;padding:clamp(16px,3vw,32px) 0 14px;width:100%;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(14px);box-shadow:0 9px 14px -18px rgba(15,23,42,.65)}.mechanisms-modal__title{margin:0;font-size:clamp(24px,4vw,32px);line-height:1.15}
        .mechanisms-tabs,.mechanisms-section{box-sizing:border-box;width:100%;max-width:none;margin-left:0;margin-right:0}.mechanisms-tabs{display:flex;gap:8px;overflow:auto;margin-top:20px;margin-bottom:16px;padding:2px;scrollbar-width:none}.mechanisms-tabs::-webkit-scrollbar{display:none}.mechanisms-tab{white-space:nowrap;border:1px solid rgba(148,163,184,.2);border-radius:12px;background:rgba(255,255,255,.48);padding:9px 12px;color:var(--muted);font:inherit;font-size:13px;font-weight:700;cursor:pointer}.mechanisms-tab.is-active{color:#fff;background:var(--accent);border-color:var(--accent);box-shadow:0 8px 18px rgba(59,125,255,.24)}
        .mechanisms-overview{display:grid;gap:14px}.mechanisms-summary{display:grid;grid-template-columns:auto minmax(180px,1fr);align-items:center;gap:14px;padding:12px 14px;border:1px solid rgba(148,163,184,.18);border-radius:16px;background:rgba(255,255,255,.58)}.mechanisms-summary__total{font-size:12px;color:var(--muted);white-space:nowrap}.mechanisms-summary__total b{display:block;color:var(--text);font-size:22px;line-height:1}.mechanisms-summary__chart{display:grid;gap:7px}.mechanisms-summary__line{display:flex;height:8px;overflow:hidden;border-radius:99px;background:rgba(148,163,184,.18)}.mechanisms-summary__segment{height:100%}.mechanisms-summary__segment--free{background:var(--success)}.mechanisms-summary__segment--busy{background:var(--accent)}.mechanisms-summary__segment--repair{background:#e05c61}.mechanisms-summary__legend{display:flex;flex-wrap:wrap;gap:5px 12px;color:var(--muted);font-size:11px}.mechanisms-summary__legend b{color:var(--text)}
        .mechanisms-grid{display:grid;grid-template-columns:1fr;gap:14px;width:100%}.mechanisms-card{box-sizing:border-box;width:100%;min-width:0;border:1px solid rgba(148,163,184,.2);border-radius:19px;background:rgba(255,255,255,.48);padding:16px}.mechanisms-card h3{margin:0;font-size:16px}.mechanisms-card__top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}.mechanisms-calendar{display:grid;grid-template-columns:64px repeat(3,minmax(80px,1fr));overflow:auto;border-top:1px solid rgba(148,163,184,.17);border-left:1px solid rgba(148,163,184,.17);margin-top:13px}.mechanisms-calendar>*{min-height:43px;padding:8px;border-right:1px solid rgba(148,163,184,.17);border-bottom:1px solid rgba(148,163,184,.17);font-size:11px}.mechanisms-calendar__day{font-weight:800;text-align:center;background:rgba(59,125,255,.06)}.mechanisms-calendar__name{font-weight:700;line-height:1.25}.mechanisms-slot{display:grid;gap:2px;width:100%;border:0;border-radius:8px;padding:6px;background:rgba(47,158,103,.14);color:#24764e;font:inherit;font-size:10px;line-height:1.25;text-align:left}.mechanisms-slot{cursor:pointer}.mechanisms-slot[data-mechanisms-booking-id]:hover,.mechanisms-slot[data-mechanisms-booking-id]:focus-visible{outline:2px solid rgba(47,158,103,.32)}.mechanisms-slot__state{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}.mechanisms-slot--busy{background:rgba(59,125,255,.14);color:#2763cd;cursor:pointer}.mechanisms-slot--busy:hover,.mechanisms-slot--busy:focus-visible{outline:2px solid rgba(59,125,255,.38);background:rgba(59,125,255,.2)}.mechanisms-slot--repair{background:rgba(239,68,68,.12);color:#bd3e45}.mechanisms-slot + .mechanisms-slot{margin-top:4px}
        .mechanisms-period{display:flex;gap:5px;width:max-content;margin-left:auto;padding:4px;border:1px solid rgba(148,163,184,.18);border-radius:13px;background:rgba(241,245,249,.72)}.mechanisms-period__button{min-height:34px;border:0;border-radius:9px;background:transparent;padding:7px 12px;color:var(--muted);font:inherit;font-size:11px;font-weight:800;white-space:nowrap;cursor:pointer}.mechanisms-period__button:hover,.mechanisms-period__button:focus-visible{outline:0;color:var(--accent);background:rgba(255,255,255,.72)}.mechanisms-period__button.is-active{color:#fff;background:var(--accent);box-shadow:0 6px 14px rgba(59,125,255,.22)}.mechanisms-calendar__corner,.mechanisms-calendar__name{position:sticky;left:0;z-index:2;background:color-mix(in srgb,var(--bg) 94%,white)}.mechanisms-calendar__corner{z-index:3}.mechanisms-available-count{display:grid;flex:0 0 34px;place-items:center;width:34px;height:34px;border-radius:12px;background:var(--accent-soft);color:var(--accent);font-size:16px}.mechanisms-list{display:grid;gap:8px;margin-top:8px}.mechanisms-item{display:flex;width:100%;align-items:center;gap:10px;padding:10px 0;border:0;border-bottom:1px solid rgba(148,163,184,.16);background:transparent;font:inherit;text-align:left;cursor:pointer}.mechanisms-item:last-child{border:0;padding-bottom:0}.mechanisms-item:not([data-mechanisms-booking]){cursor:default}.mechanisms-item[data-mechanisms-booking]:hover .mechanisms-item__body b{color:var(--accent)}.mechanisms-item__icon{width:34px;height:34px;display:grid;flex:0 0 34px;place-items:center;overflow:hidden;border-radius:11px;background:var(--accent-soft)}.mechanisms-item__icon img{width:100%;height:100%;object-fit:cover}.mechanisms-item__body{min-width:0;flex:1}.mechanisms-item__body b,.mechanisms-item__body span{display:block}.mechanisms-item__body span{margin-top:2px;color:var(--muted);font-size:11px}.mechanisms-status{font-size:10px;font-weight:800;border-radius:20px;padding:5px 7px;background:var(--success-soft);color:#24764e;text-align:center}.mechanisms-status--busy{background:var(--accent-soft);color:#2763cd}.mechanisms-status--partial{background:rgba(245,158,11,.14);color:#a16207}.mechanisms-availability-empty{padding:26px 10px;color:var(--muted);font-size:12px;text-align:center}
        .mechanisms-card__top--period{margin-top:0}.mechanisms-filter-empty{display:grid;place-items:center;gap:7px;min-height:150px;margin-top:13px;border:1px dashed rgba(148,163,184,.3);border-radius:14px;color:var(--muted);font-size:12px}.mechanisms-filter-empty b{color:var(--text);font-size:14px}.mechanisms-filter-empty button{border:0;border-radius:10px;background:var(--accent-soft);padding:8px 12px;color:var(--accent);font:inherit;font-size:11px;font-weight:800;cursor:pointer}
        .mechanisms-column-filter{position:relative;width:100%}.mechanisms-column-filter__toggle{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;min-height:28px;border:0;border-radius:8px;background:transparent;padding:4px;color:var(--text);font:inherit;font-size:11px;font-weight:800;cursor:pointer}.mechanisms-column-filter__toggle:hover,.mechanisms-column-filter__toggle:focus-visible{outline:0;background:rgba(59,125,255,.1);color:var(--accent)}.mechanisms-column-filter__toggle.is-active{background:var(--accent);color:#fff}.mechanisms-column-filter__toggle>span:last-child{font-size:9px}.mechanisms-column-filter__menu{position:absolute;z-index:20;top:calc(100% + 7px);left:0;display:grid;gap:10px;width:min(280px,calc(100vw - 38px));border:1px solid rgba(148,163,184,.24);border-radius:17px;background:rgba(255,255,255,.94);box-shadow:0 20px 50px rgba(15,23,42,.2);padding:12px;text-align:left;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}.mechanisms-column-filter__menu--day{left:auto;right:0}.mechanisms-column-filter__menu[hidden]{display:none}.mechanisms-column-filter__title{color:var(--text);font-size:12px;font-weight:850}.mechanisms-filter-select{display:grid;gap:8px}.mechanisms-filter-search{position:relative;display:block}.mechanisms-filter-search__icon{position:absolute;top:50%;left:12px;color:var(--muted);font-size:18px;transform:translateY(-52%);pointer-events:none}.mechanisms-filter-search input{box-sizing:border-box;width:100%;min-height:42px;border:1px solid rgba(148,163,184,.28);border-radius:12px;outline:0;background:rgba(248,250,252,.9);padding:0 12px 0 36px;color:var(--text);font:inherit;font-size:12px;-webkit-appearance:none}.mechanisms-filter-search input:focus{border-color:var(--accent);background:#fff;box-shadow:0 0 0 3px rgba(59,125,255,.1)}.mechanisms-filter-search input::-webkit-search-cancel-button{cursor:pointer}.mechanisms-filter-options{display:grid;gap:3px;max-height:min(250px,38dvh);overflow:auto;padding:3px;scrollbar-width:thin}.mechanisms-filter-option{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-height:40px;border:0;border-radius:10px;background:transparent;padding:8px 10px;color:var(--text);font:inherit;font-size:12px;text-align:left;cursor:pointer}.mechanisms-filter-option:hover,.mechanisms-filter-option:focus-visible{outline:0;background:var(--accent-soft);color:var(--accent)}.mechanisms-filter-option.is-selected{background:var(--accent-soft);color:var(--accent);font-weight:800}.mechanisms-filter-option__check{visibility:hidden;font-size:14px}.mechanisms-filter-option.is-selected .mechanisms-filter-option__check{visibility:visible}.mechanisms-filter-options__empty{padding:18px 8px;color:var(--muted);font-size:12px;text-align:center}.mechanisms-column-filter__menu>button{border:0;border-radius:10px;background:var(--accent-soft);padding:9px;color:var(--accent);font:inherit;font-size:11px;font-weight:800;cursor:pointer}
        .mechanisms-column-filter__menu--mechanism{width:min(580px,calc(100vw - 38px));grid-template-columns:repeat(2,minmax(0,1fr))}.mechanisms-column-filter__menu--mechanism>button{grid-column:1/-1}.mechanisms-filter-group{display:grid;align-content:start;gap:7px;min-width:0;border:1px solid rgba(148,163,184,.18);border-radius:14px;background:rgba(248,250,252,.62);padding:10px}.mechanisms-filter-group>small{margin-top:-4px;color:var(--muted);font-size:10px;line-height:1.35}
        @media(max-width:720px){.mechanisms-card__top--period{margin-top:0}.mechanisms-period{width:100%;margin-left:0}.mechanisms-period__button{flex:1}.mechanisms-column-filter__menu{position:fixed;z-index:30;top:auto;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));left:12px;width:auto;padding:14px;border-radius:18px;box-shadow:0 20px 60px rgba(15,23,42,.28)}}
        @media(max-width:720px){.mechanisms-column-filter__menu{max-height:calc(100dvh - 32px - env(safe-area-inset-bottom));overflow:auto}.mechanisms-column-filter__menu--mechanism{grid-template-columns:1fr}.mechanisms-column-filter__menu--mechanism>button{grid-column:auto}.mechanisms-filter-options{max-height:min(180px,24dvh)}}
        .mechanisms-schedule-select{position:relative}.mechanisms-schedule-select__trigger{display:flex;align-items:center;justify-content:space-between;gap:10px;box-sizing:border-box;width:100%;min-height:42px;border:1px solid rgba(148,163,184,.3);border-radius:11px;background:rgba(255,255,255,.78);padding:0 12px;color:var(--text);font:inherit;font-size:14px;text-align:left;cursor:pointer}.mechanisms-schedule-select__trigger:focus-visible,.mechanisms-schedule-select.is-open .mechanisms-schedule-select__trigger{outline:0;border-color:rgba(59,125,255,.65);box-shadow:0 0 0 3px rgba(59,125,255,.12);background:#fff}.mechanisms-schedule-select__chevron{flex:0 0 auto;width:7px;height:7px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:translateY(-2px) rotate(45deg);transition:transform .18s ease}.mechanisms-schedule-select.is-open .mechanisms-schedule-select__chevron{transform:translateY(2px) rotate(225deg)}.mechanisms-schedule-select__menu{position:absolute;z-index:12;top:calc(100% + 6px);left:0;right:0;display:grid;gap:3px;max-height:min(280px,45vh);overflow:auto;border:1px solid rgba(148,163,184,.22);border-radius:14px;background:rgba(255,255,255,.96);box-shadow:0 18px 45px rgba(15,23,42,.16);padding:6px;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.mechanisms-schedule-select__menu[hidden]{display:none}.mechanisms-schedule-select__option{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-height:42px;border:0;border-radius:10px;background:transparent;padding:9px 10px;color:var(--text);font:inherit;font-size:13px;text-align:left;cursor:pointer}.mechanisms-schedule-select__option:hover,.mechanisms-schedule-select__option:focus-visible{outline:0;background:var(--accent-soft)}.mechanisms-schedule-select__option.is-selected{background:var(--accent-soft);color:var(--accent);font-weight:800}.mechanisms-schedule-select__check{visibility:hidden;font-size:15px}.mechanisms-schedule-select__option.is-selected .mechanisms-schedule-select__check{visibility:visible}.mechanisms-section{display:none}.mechanisms-section.is-active{display:block}.mechanisms-placeholder{display:grid;place-items:center;min-height:250px;text-align:center;border:1px dashed rgba(59,125,255,.35);border-radius:20px;padding:24px;background:rgba(255,255,255,.34)}.mechanisms-placeholder__icon{font-size:30px}.mechanisms-placeholder h3{margin:10px 0 6px}.mechanisms-placeholder p{max-width:470px;margin:0;color:var(--muted);font-size:13px;line-height:1.5}.mechanisms-primary{border:0;border-radius:12px;background:var(--accent);color:#fff;padding:10px 12px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.mechanisms-management{display:grid;gap:14px;padding-bottom:74px}.mechanisms-management__intro,.mechanisms-management__form,.mechanisms-machine,.mechanisms-management__empty{border:1px solid rgba(148,163,184,.2);border-radius:19px;background:rgba(255,255,255,.58);box-shadow:0 10px 28px rgba(71,85,105,.05)}.mechanisms-management__intro{display:flex;justify-content:space-between;gap:18px;padding:18px}.mechanisms-management__intro h3,.mechanisms-management__form h4{margin:0;font-size:17px}.mechanisms-management__intro p:not(.mechanisms-management__eyebrow),.mechanisms-management__form-head span,.mechanisms-machine__head span{display:block;margin:5px 0 0;color:var(--muted);font-size:12px;line-height:1.45}.mechanisms-management__eyebrow{margin:0 0 4px;color:var(--accent);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}.mechanisms-management__count{min-width:75px;align-self:center;padding:10px;border-radius:14px;background:var(--accent-soft);text-align:center}.mechanisms-management__count b,.mechanisms-management__count span{display:block}.mechanisms-management__count b{font-size:20px}.mechanisms-management__count span{font-size:10px;color:var(--muted)}.mechanisms-management__form{padding:16px}.mechanisms-machine{padding:8px 8px 8px 16px}.mechanisms-management__form-head,.mechanisms-machine__head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.mechanisms-management__fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.mechanisms-management__field{display:grid;gap:5px;color:var(--muted);font-size:11px;font-weight:700}.mechanisms-management__field--wide{grid-column:span 2}.mechanisms-management__field input,.mechanisms-management__field select{box-sizing:border-box;width:100%;min-height:42px;border:1px solid rgba(148,163,184,.3);border-radius:11px;background:rgba(255,255,255,.78);padding:0 10px;color:var(--text);font:inherit;font-size:14px}.mechanisms-select{position:relative;display:block}.mechanisms-select::after{position:absolute;top:50%;right:12px;width:7px;height:7px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);content:"";pointer-events:none;transform:translateY(-70%) rotate(45deg)}.mechanisms-select select{appearance:none;padding-right:34px;cursor:pointer}.mechanisms-work-time{min-width:0;margin:0;padding:0;border:0}.mechanisms-work-time legend{padding:0}.mechanisms-work-time__range{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:end}.mechanisms-work-time__range label{display:grid;gap:5px}.mechanisms-work-time__range>span{padding-bottom:12px;color:var(--muted)}.mechanisms-photo{grid-column:span 2;display:flex;align-items:center;gap:12px;padding:11px;border:1px dashed rgba(59,125,255,.35);border-radius:14px;background:rgba(59,125,255,.035)}.mechanisms-photo__preview{display:grid;flex:0 0 62px;place-items:center;width:62px;height:62px;overflow:hidden;border-radius:12px;background:var(--accent-soft);font-size:26px}.mechanisms-photo__preview img,.mechanisms-machine__badge img{width:100%;height:100%;object-fit:cover}.mechanisms-photo__content{display:grid;min-width:0;gap:3px}.mechanisms-photo__content b{font-size:12px}.mechanisms-photo__content span{color:var(--muted);font-size:11px}.mechanisms-photo__actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:4px}.mechanisms-photo__upload,.mechanisms-photo__remove{border:0;border-radius:9px;background:var(--accent-soft);padding:7px 9px;color:var(--accent);font:inherit;font-size:11px;font-weight:800;cursor:pointer}.mechanisms-photo__upload{position:relative}.mechanisms-photo__upload input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}.mechanisms-photo.is-loading{pointer-events:none;opacity:.65}.mechanisms-photo.is-loading .mechanisms-photo__preview{animation:mechanisms-photo-pulse .9s ease-in-out infinite alternate}@keyframes mechanisms-photo-pulse{to{transform:scale(.94)}}.mechanisms-photo__remove{background:transparent;color:#c2414b}.mechanisms-management__list{display:grid;gap:10px}.mechanisms-machine__head{align-items:center}.mechanisms-machine__head>div:nth-child(2){min-width:0;flex:1}.mechanisms-machine__badge{display:grid;flex:0 0 68px;place-items:center;width:68px;height:68px;overflow:hidden;border-radius:16px;background:var(--accent-soft);font-size:28px}.mechanisms-machine__delete,.mechanisms-secondary{border:1px solid rgba(148,163,184,.28);border-radius:10px;background:rgba(255,255,255,.62);padding:9px 10px;color:var(--text);font:inherit;font-size:12px;font-weight:750;cursor:pointer}.mechanisms-machine__delete{color:#c2414b}.mechanisms-management__add-action{grid-column:span 2;display:flex;justify-content:flex-end;padding-top:2px}.mechanisms-management__add-action .mechanisms-primary{min-width:190px;min-height:44px}.mechanisms-management__field input:focus,.mechanisms-management__field select:focus{outline:0;border-color:rgba(59,125,255,.65);box-shadow:0 0 0 3px rgba(59,125,255,.12);background:#fff}.mechanisms-machine__actions{display:flex;justify-content:flex-end;margin-top:13px}.mechanisms-secondary{border-color:rgba(59,125,255,.32);color:var(--accent)}.mechanisms-management__empty{display:grid;place-items:center;min-height:160px;padding:18px;text-align:center}.mechanisms-management__empty span{font-size:30px}.mechanisms-management__empty b{margin-top:8px}.mechanisms-management__empty p{margin:5px 0 0;color:var(--muted);font-size:12px}.mechanisms-management__status{min-height:18px;margin:0;color:var(--success);font-size:12px;font-weight:700}.mechanisms-management__status.is-error{color:#c2414b}.mechanisms-management__open-add{position:fixed;z-index:5;left:50%;bottom:calc(10px + env(safe-area-inset-bottom));width:min(1440px,calc(100% - 2 * clamp(16px,4vw,56px)));min-height:50px;border-radius:15px;background:var(--accent);box-shadow:0 12px 28px rgba(59,125,255,.25);transform:translateX(-50%)}.mechanisms-machine__edit{display:grid;flex:0 0 56px;place-items:center;width:56px;height:56px;border:0;background:transparent;color:var(--accent);font-size:28px;line-height:1;cursor:pointer}.mechanisms-machine__edit span{display:block;margin:0;font-size:18.667px;line-height:1;transform:scaleX(-1)}.mechanisms-editor{position:fixed;z-index:1002;inset:0;display:grid;place-items:center;padding:20px}.mechanisms-editor[hidden]{display:none}.mechanisms-editor__backdrop{position:absolute;inset:0;border:0;background:rgba(15,23,42,.42);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}.mechanisms-editor__dialog{position:relative;width:min(680px,100%);max-height:calc(100dvh - 40px);overflow:auto;background:rgba(255,255,255,.94);box-shadow:0 24px 70px rgba(15,23,42,.22)}.mechanisms-editor__close{display:grid;flex:0 0 38px;place-items:center;width:38px;height:38px;border:0;border-radius:12px;background:rgba(148,163,184,.12);color:var(--muted);font-size:16px;cursor:pointer}.mechanisms-danger{margin-right:auto;border:0;background:transparent;padding:10px 2px;color:#c2414b;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.mechanisms-toast{min-height:18px;margin:12px auto 0;max-width:1440px;color:var(--success);font-size:12px;font-weight:700}
        /* Полноэкранный редактор механизма и фирменные выпадающие подсказки. */
        .mechanisms-editor{display:block;padding:0;background:linear-gradient(145deg,#f7faff,#eef4ff)}.mechanisms-editor__backdrop{display:none}.mechanisms-editor__dialog{box-sizing:border-box;width:100%;height:100dvh;max-height:none;overflow:auto;border:0;border-radius:0;background:rgba(248,251,255,.96);box-shadow:none;padding:max(24px,env(safe-area-inset-top)) max(24px,calc((100vw - 1040px)/2)) max(28px,env(safe-area-inset-bottom))}.mechanisms-editor__dialog .mechanisms-management__form-head{position:sticky;z-index:8;top:calc(-1 * max(24px,env(safe-area-inset-top)));margin:calc(-1 * max(24px,env(safe-area-inset-top))) calc(-1 * max(24px,calc((100vw - 1040px)/2))) 22px;padding:max(18px,env(safe-area-inset-top)) max(24px,calc((100vw - 1040px)/2)) 16px;background:rgba(248,251,255,.88);border-bottom:1px solid rgba(148,163,184,.18);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.mechanisms-editor__dialog .mechanisms-management__fields{margin-top:0}.mechanisms-suggest-field{position:relative}.mechanisms-suggestions{position:absolute;z-index:15;top:calc(100% + 5px);left:0;right:0;display:grid;gap:3px;overflow:auto;max-height:250px;padding:6px;border:1px solid rgba(148,163,184,.25);border-radius:14px;background:rgba(255,255,255,.97);box-shadow:0 18px 45px rgba(15,23,42,.14);backdrop-filter:blur(18px)}.mechanisms-suggestions[hidden]{display:none}.mechanisms-suggestions button{min-height:42px;border:0;border-radius:10px;background:transparent;padding:9px 11px;color:var(--text);font:inherit;font-size:13px;text-align:left;cursor:pointer}.mechanisms-suggestions button:hover,.mechanisms-suggestions button:focus-visible{outline:0;background:var(--accent-soft);color:var(--accent)}.mechanisms-time-select .mechanisms-schedule-select__menu{max-height:min(320px,45dvh)}.mechanisms-time-select .mechanisms-schedule-select__option:disabled{display:none}
        @media(max-width:720px){.mechanisms-editor__dialog{width:100%;height:100dvh;max-height:none;border-radius:0;padding:max(14px,env(safe-area-inset-top)) 14px calc(18px + env(safe-area-inset-bottom))}.mechanisms-editor__dialog .mechanisms-management__form-head{align-items:center;flex-direction:row;top:calc(-1 * max(14px,env(safe-area-inset-top)));margin:calc(-1 * max(14px,env(safe-area-inset-top))) -14px 18px;padding:max(12px,env(safe-area-inset-top)) 14px 12px}}
        .mechanisms-booking{position:fixed;inset:0;z-index:2;display:grid;place-items:center;padding:16px;background:rgba(15,23,42,.32);backdrop-filter:blur(5px)}.mechanisms-booking[hidden]{display:none}.mechanisms-booking__panel{width:min(100%,430px);border:1px solid rgba(148,163,184,.25);border-radius:20px;background:var(--glass);box-shadow:0 24px 70px rgba(15,23,42,.22);padding:20px}.mechanisms-booking__head{display:flex;align-items:start;justify-content:space-between;gap:12px}.mechanisms-booking h3{margin:0;font-size:18px}.mechanisms-booking p{margin:6px 0 0;color:var(--muted);font-size:13px}.mechanisms-booking__close{border:0;background:transparent;color:var(--muted);font-size:24px;line-height:1;cursor:pointer}.mechanisms-booking label{display:grid;gap:6px;margin-top:14px;color:var(--muted);font-size:12px;font-weight:700}.mechanisms-booking select{min-height:42px;border:1px solid rgba(148,163,184,.3);border-radius:11px;background:rgba(255,255,255,.7);padding:0 10px;color:var(--text);font:inherit}.mechanisms-booking__actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
        .mechanisms-booking-details__content{display:grid;gap:9px;margin-top:16px}.mechanisms-booking-details__content>div{display:grid;gap:4px;border:1px solid rgba(148,163,184,.18);border-radius:13px;background:rgba(255,255,255,.5);padding:11px 12px}.mechanisms-booking-details__content span{color:var(--muted);font-size:11px}.mechanisms-booking-details__content b{font-size:13px;line-height:1.4;overflow-wrap:anywhere}
        .mechanisms-base-head{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:20px;border:1px solid rgba(148,163,184,.2);border-radius:22px;background:linear-gradient(135deg,rgba(255,255,255,.82),rgba(228,239,255,.62));box-shadow:0 14px 38px rgba(71,85,105,.07)}.mechanisms-base-head span{color:var(--accent);font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}.mechanisms-base-head h3{margin:4px 0 0;font-size:21px}.mechanisms-base-head p{margin:5px 0 0;color:var(--muted);font-size:12px}.mechanisms-base-head>strong{display:grid;min-width:72px;place-items:center;padding:11px;border-radius:16px;background:rgba(255,255,255,.7);color:var(--text);font-size:24px}.mechanisms-base-head small{color:var(--muted);font-size:10px;font-weight:600}.mechanisms-base-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.mechanisms-base-item{display:flex;align-items:center;gap:12px;min-width:0;border:1px solid rgba(148,163,184,.19);border-radius:18px;background:rgba(255,255,255,.62);padding:11px;text-align:left;font:inherit;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease}.mechanisms-base-item:hover{transform:translateY(-1px);box-shadow:0 12px 28px rgba(71,85,105,.09)}.mechanisms-base-item__photo{display:grid;flex:0 0 58px;place-items:center;width:58px;height:58px;overflow:hidden;border-radius:14px;background:var(--accent-soft);font-size:25px}.mechanisms-base-item__photo img{width:100%;height:100%;object-fit:cover}.mechanisms-base-item__body{min-width:0;flex:1}.mechanisms-base-item__body b,.mechanisms-base-item__body small{display:block}.mechanisms-base-item__body small{overflow:hidden;margin-top:5px;color:var(--muted);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.mechanisms-base-item__action{border-radius:11px;background:var(--accent-soft);padding:8px 10px;color:var(--accent);font-size:11px;font-weight:800}.mechanisms-base-empty{grid-column:1/-1;display:grid;min-height:180px;place-items:center;align-content:center;text-align:center;border:1px dashed rgba(59,125,255,.3);border-radius:20px;background:rgba(255,255,255,.4);padding:20px}.mechanisms-base-empty>span{font-size:30px}.mechanisms-base-empty b{margin-top:8px}.mechanisms-base-empty p{margin:5px 0 0;color:var(--muted);font-size:12px}.mechanisms-bookings{margin-top:18px;padding:16px;border-radius:19px;background:rgba(255,255,255,.55)}.mechanisms-bookings h3{margin:0 0 8px;font-size:15px}.mechanisms-bookings>div{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid rgba(148,163,184,.16);font-size:12px}.mechanisms-bookings>div:last-child{border:0}.mechanisms-bookings span{color:var(--muted);text-align:right}.mechanisms-booking input,.mechanisms-booking textarea{box-sizing:border-box;width:100%;min-height:42px;border:1px solid rgba(148,163,184,.3);border-radius:11px;background:rgba(255,255,255,.7);padding:9px 10px;color:var(--text);font:inherit}.mechanisms-booking textarea{resize:vertical}.mechanisms-booking__times{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .mechanisms-booking--editor{z-index:95;display:block;padding:0;background:linear-gradient(145deg,#f7faff,#edf4ff);backdrop-filter:none}.mechanisms-booking--editor .mechanisms-booking__panel{box-sizing:border-box;width:100%;height:100dvh;overflow:auto;border:0;border-radius:0;background:rgba(248,251,255,.92);box-shadow:none;padding:max(24px,env(safe-area-inset-top)) max(24px,calc((100vw - 960px)/2)) calc(100px + env(safe-area-inset-bottom))}.mechanisms-booking--editor .mechanisms-booking__head{position:sticky;z-index:20;top:-24px;align-items:center;margin:-24px calc(-1 * max(24px,calc((100vw - 960px)/2))) 22px;padding:max(18px,env(safe-area-inset-top)) max(24px,calc((100vw - 960px)/2)) 16px;border-bottom:1px solid rgba(148,163,184,.16);background:rgba(248,251,255,.88);backdrop-filter:blur(18px)}.mechanisms-booking__eyebrow{display:block;margin-bottom:4px;color:var(--accent);font-size:10px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.mechanisms-booking--editor .mechanisms-booking__close{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:rgba(255,255,255,.75)}.mechanisms-booking__machine{display:grid;grid-template-columns:100px minmax(0,1fr);align-items:center;gap:18px;margin-bottom:18px;padding:14px;border:1px solid rgba(148,163,184,.18);border-radius:20px;background:linear-gradient(135deg,rgba(255,255,255,.82),rgba(224,236,255,.55))}.mechanisms-booking__photo{display:grid;place-items:center;width:100px;height:84px;overflow:hidden;border-radius:15px;background:var(--accent-soft);font-size:34px}.mechanisms-booking__photo img{width:100%;height:100%;object-fit:cover}.mechanisms-booking__machine b,.mechanisms-booking__machine span,.mechanisms-booking__machine strong{display:block}.mechanisms-booking__machine b{font-size:17px}.mechanisms-booking__machine span{margin-top:8px;color:var(--muted);font-size:11px}.mechanisms-booking__machine strong{margin-top:2px;color:#24764e}.mechanisms-booking__fields{display:grid;grid-template-columns:1fr 1fr;gap:16px}.mechanisms-booking__fields>label{margin:0}.mechanisms-booking__time-field,.mechanisms-booking__comment{grid-column:1/-1}.mechanisms-booking__time-field{margin:0;padding:0;border:0}.mechanisms-booking__time-field legend{padding:0;color:var(--muted);font-size:12px;font-weight:700}.mechanisms-booking__time-field label{margin-top:6px}.mechanisms-booking-control{display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;width:100%;min-height:50px;border:1px solid rgba(148,163,184,.27);border-radius:14px;background:rgba(255,255,255,.8);padding:0 14px;color:var(--text);font:inherit;text-align:left}.mechanisms-booking-control:focus-visible,.is-open>.mechanisms-booking-control{outline:0;border-color:var(--accent);box-shadow:0 0 0 3px rgba(59,125,255,.1)}.mechanisms-booking-control__chevron{width:8px;height:8px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:rotate(45deg)}.mechanisms-booking-control__calendar{color:var(--accent);font-size:22px}.mechanisms-booking--editor .mechanisms-booking__fields>label:first-child{max-width:320px}.mechanisms-booking--editor .mechanisms-booking__title{font-size:22px;font-weight:800;letter-spacing:-.02em}.mechanisms-booking-select__search{display:flex!important;align-items:center;gap:8px;margin:0 0 6px!important;padding:0 10px;border:1px solid rgba(148,163,184,.25);border-radius:11px;background:rgba(248,250,252,.9);color:var(--muted)}.mechanisms-booking-select__search input{box-sizing:border-box;width:100%;height:38px;border:0;outline:0;background:transparent;color:var(--text);font:inherit}.mechanisms-booking-select__options{max-height:min(210px,42dvh);overflow:auto;overscroll-behavior:contain}.mechanisms-booking-select__empty{text-align:center}.mechanisms-booking-select,.mechanisms-date{position:relative}.mechanisms-booking-select__menu,.mechanisms-date__popover{position:absolute;z-index:30;top:calc(100% + 7px);right:0;left:0;max-height:min(360px,calc(100dvh - 32px));overflow:auto;border:1px solid rgba(148,163,184,.2);border-radius:17px;background:rgba(255,255,255,.97);box-shadow:0 20px 50px rgba(15,23,42,.18);padding:7px;backdrop-filter:blur(20px)}.mechanisms-booking-select__menu[hidden],.mechanisms-date__popover[hidden]{display:none}.mechanisms-booking-select__menu button[hidden]{display:none}.mechanisms-booking-select__menu button{display:flex;justify-content:space-between;width:100%;min-height:44px;border:0;border-radius:11px;background:transparent;padding:10px;color:var(--text);font:inherit;text-align:left}.mechanisms-booking-select__menu button:hover,.mechanisms-booking-select__menu button.is-selected{background:var(--accent-soft);color:var(--accent)}.mechanisms-booking-select__menu button b{visibility:hidden}.mechanisms-booking-select__menu button.is-selected b{visibility:visible}.mechanisms-date__popover{padding:14px}.mechanisms-date__nav{display:grid;grid-template-columns:40px 1fr 40px;align-items:center;text-align:center}.mechanisms-date__nav b{text-transform:capitalize}.mechanisms-date__nav button{height:38px;border:0;border-radius:11px;background:var(--accent-soft);color:var(--accent);font-size:23px}.mechanisms-date__week,.mechanisms-date__days{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}.mechanisms-date__week{margin-top:10px;color:var(--muted);font-size:10px;text-align:center}.mechanisms-date__days{margin-top:5px}.mechanisms-date__days button{height:38px;border:0;border-radius:10px;background:transparent;color:var(--text);font:inherit;font-size:12px}.mechanisms-date__days button:hover{background:var(--accent-soft)}.mechanisms-date__days button.is-range{border-radius:0;background:rgba(59,125,255,.1);color:var(--accent)}.mechanisms-date__days button.is-start,.mechanisms-date__days button.is-end{background:var(--accent);color:#fff;font-weight:800}.mechanisms-date__days button:disabled{color:rgba(100,116,139,.35)}.mechanisms-date__popover>p{margin:10px 0 0;text-align:center}.mechanisms-booking-warning{display:flex;align-items:flex-start;gap:10px;grid-column:1/-1;margin:0;border:1px solid rgba(217,119,6,.25);border-radius:14px;background:rgba(255,247,224,.9);padding:11px 13px;color:#92400e;font-size:12px;line-height:1.4}.mechanisms-booking-warning[hidden]{display:none}.mechanisms-booking-warning span{font-size:17px}.mechanisms-booking-control.is-invalid,.mechanisms-schedule-select__trigger.is-invalid{border-color:#dc5963!important;box-shadow:0 0 0 3px rgba(220,89,99,.1)}.mechanisms-booking--editor .mechanisms-schedule-select__trigger{min-height:50px;border-radius:14px}.mechanisms-booking--editor .mechanisms-booking__actions{position:fixed;z-index:25;right:0;bottom:0;left:0;margin:0;padding:12px max(24px,calc((100vw - 960px)/2)) calc(12px + env(safe-area-inset-bottom));border-top:1px solid rgba(148,163,184,.18);background:rgba(248,251,255,.9);backdrop-filter:blur(18px)}.mechanisms-booking--editor .mechanisms-primary{width:min(100%,300px);min-height:50px;margin-left:auto;border-radius:14px} @media(max-width:720px){.mechanisms-booking--editor .mechanisms-booking__fields>label:first-child{max-width:none}.mechanisms-booking--editor .mechanisms-booking__panel{padding:max(14px,env(safe-area-inset-top)) 14px calc(96px + env(safe-area-inset-bottom))}.mechanisms-booking--editor .mechanisms-booking__head{top:-14px;margin:-14px -14px 18px;padding:max(12px,env(safe-area-inset-top)) 14px 12px}.mechanisms-booking__fields{grid-template-columns:1fr}.mechanisms-booking__time-field,.mechanisms-booking__comment{grid-column:auto}.mechanisms-booking__machine{grid-template-columns:76px 1fr;gap:12px}.mechanisms-booking__photo{width:76px;height:68px}.mechanisms-booking-select__menu,.mechanisms-date__popover{position:fixed;top:max(12px,env(safe-area-inset-top));right:12px;bottom:max(12px,env(safe-area-inset-bottom));left:12px;max-height:none}.mechanisms-booking--editor .mechanisms-booking__actions{padding:10px 14px calc(10px + env(safe-area-inset-bottom))}.mechanisms-booking--editor .mechanisms-primary{width:100%}}
        @media(max-width:720px){.mechanisms-base-head{padding:16px}.mechanisms-base-list{grid-template-columns:1fr}.mechanisms-base-item__action{padding:7px;font-size:10px}.mechanisms-bookings>div{display:grid;gap:4px}.mechanisms-bookings span{text-align:left}.mechanisms-modal__panel{padding:0 5px calc(18px + env(safe-area-inset-bottom))}.mechanisms-modal__head{padding:18px 0 12px}.mechanisms-summary{grid-template-columns:1fr;gap:10px}.mechanisms-summary__total{display:flex;align-items:baseline;gap:6px}.mechanisms-summary__total b{display:inline}.mechanisms-grid{grid-template-columns:1fr}.mechanisms-card{padding:14px}.mechanisms-calendar{grid-template-columns:59px repeat(3,minmax(74px,1fr))}.mechanisms-calendar>*{padding:7px 5px}.mechanisms-management__intro{padding:15px}.mechanisms-management__form{padding:14px}.mechanisms-machine{padding:7px 7px 7px 14px}.mechanisms-management__fields{grid-template-columns:1fr}.mechanisms-management__field--wide,.mechanisms-photo,.mechanisms-management__add-action{grid-column:auto}.mechanisms-management__add-action .mechanisms-primary{width:100%}.mechanisms-management__form-head{align-items:stretch;flex-direction:column}.mechanisms-management__form-head .mechanisms-primary{width:100%;min-height:44px}.mechanisms-machine__head{align-items:center}.mechanisms-machine__badge{flex-basis:62px;width:62px;height:62px}.mechanisms-management__open-add{width:calc(100% - 28px)}.mechanisms-editor{align-items:end;padding:0}.mechanisms-editor__dialog{width:100%;max-height:92dvh;border-radius:22px 22px 0 0;padding:18px 14px calc(18px + env(safe-area-inset-bottom))}.mechanisms-management__add-action{display:grid;grid-template-columns:1fr}.mechanisms-management__add-action .mechanisms-danger{grid-row:2;margin:3px auto 0}.mechanisms-booking{align-items:end;padding:0}.mechanisms-booking__panel{width:100%;border-radius:20px 20px 0 0;padding:20px 16px calc(20px + env(safe-area-inset-bottom))}}
        .mechanisms-editor__dialog .mechanisms-management__fields{padding-bottom:86px}
        .mechanisms-editor__close{border:0;border-radius:0;background:transparent;box-shadow:none}
        .mechanisms-management__add-action{position:fixed;z-index:20;right:0;bottom:0;left:0;display:flex;justify-content:flex-end;gap:10px;padding:12px max(24px,calc((100vw - 1040px)/2)) calc(12px + env(safe-area-inset-bottom));border-top:1px solid rgba(148,163,184,.2);background:rgba(248,251,255,.9);box-shadow:0 -12px 32px rgba(15,23,42,.08);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
        .mechanisms-save,.mechanisms-cancel{min-width:190px;min-height:48px;border:1px solid;border-radius:14px;padding:10px 16px;font:inherit;font-size:13px;font-weight:800;cursor:pointer;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);transition:transform .18s ease,box-shadow .18s ease,background .18s ease}.mechanisms-save{border-color:rgba(47,158,103,.28);background:linear-gradient(135deg,rgba(47,158,103,.2),rgba(255,255,255,.7));box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 8px 22px rgba(47,158,103,.14);color:#24764e}.mechanisms-cancel{border-color:rgba(217,85,93,.25);background:linear-gradient(135deg,rgba(217,85,93,.16),rgba(255,255,255,.68));box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 8px 22px rgba(217,85,93,.12);color:#b43f49}.mechanisms-save:hover,.mechanisms-save:focus-visible{outline:0;background:linear-gradient(135deg,rgba(47,158,103,.27),rgba(255,255,255,.78));box-shadow:0 0 0 3px rgba(47,158,103,.11),0 10px 26px rgba(47,158,103,.17)}.mechanisms-cancel:hover,.mechanisms-cancel:focus-visible{outline:0;background:linear-gradient(135deg,rgba(217,85,93,.23),rgba(255,255,255,.76));box-shadow:0 0 0 3px rgba(217,85,93,.1),0 10px 26px rgba(217,85,93,.15)}.mechanisms-save:active,.mechanisms-cancel:active{transform:translateY(1px)}
        @media(max-width:720px){.mechanisms-editor__dialog .mechanisms-management__fields{padding-bottom:82px}.mechanisms-management__add-action{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px 14px calc(10px + env(safe-area-inset-bottom))}.mechanisms-save,.mechanisms-cancel{width:100%;min-width:0;min-height:50px}.mechanisms-management__add-action .mechanisms-danger{position:absolute;right:14px;bottom:calc(76px + env(safe-area-inset-bottom));margin:0}}
      `;
      document.head.appendChild(style);
      mechanismsModalEl = document.createElement("div");
      mechanismsModalEl.className = "mechanisms-modal";
      mechanismsModalEl.innerHTML = `
        <section class="mechanisms-modal__panel" role="dialog" aria-modal="true" aria-label="Механизмы">
          <header class="mechanisms-modal__head"><h2 class="mechanisms-modal__title">Механизмы</h2><button class="button-icon tools-modal__close mechanisms-modal__close" type="button" data-mechanisms-close aria-label="Закрыть"><span class="button-icon-emoji" aria-hidden="true">✕</span></button></header>
          <nav class="mechanisms-tabs" aria-label="Разделы механизмов">
            <button class="mechanisms-tab is-active" type="button" data-mechanisms-tab="overview">Бронирование</button><button class="mechanisms-tab" type="button" data-mechanisms-tab="rent">Аренда</button><button class="mechanisms-tab" type="button" data-mechanisms-tab="requests">Заявки</button><button class="mechanisms-tab" type="button" data-mechanisms-tab="fact">Факт</button><button class="mechanisms-tab" type="button" data-mechanisms-tab="history">История</button><button class="mechanisms-tab" type="button" data-mechanisms-tab="repairs">Ремонты</button><button class="mechanisms-tab" type="button" data-mechanisms-tab="stats">Статистика</button>${isMechanic ? '<button class="mechanisms-tab" type="button" data-mechanisms-tab="management">Управление</button>' : ""}
          </nav>
          <div class="mechanisms-section is-active" data-mechanisms-section="overview" data-mechanisms-overview></div>
          <div class="mechanisms-section" data-mechanisms-section="fact"><div class="mechanisms-placeholder"><div><div class="mechanisms-placeholder__icon">⏱️</div><h3>План и факт работы</h3><p>Фиксируйте часы по каждому объекту: отработано, простой, сокращение или переработка.</p></div></div></div>
          <div class="mechanisms-section" data-mechanisms-section="history"><div class="mechanisms-placeholder"><div><div class="mechanisms-placeholder__icon">🗂️</div><h3>История механизмов</h3><p>Журнал покажет брони, перемещения и фактическую работу.</p></div></div></div>
          <div class="mechanisms-section" data-mechanisms-section="repairs"><div class="mechanisms-placeholder"><div><div class="mechanisms-placeholder__icon">🛠️</div><h3>Поломки и ремонты</h3><p>Здесь будет регистрация поломки и статус ремонта.</p></div></div></div>
          <div class="mechanisms-section" data-mechanisms-section="requests"><div class="mechanisms-placeholder"><div><div class="mechanisms-placeholder__icon">📨</div><h3>Заявки на технику</h3><p>Создавайте заявку с объектом, задачей и временем.</p></div></div></div>
          <div class="mechanisms-section" data-mechanisms-section="rent"><div class="mechanisms-placeholder"><div><div class="mechanisms-placeholder__icon">📊</div><h3>Аренда механизмов</h3><p>План и факт аренды будут содержать часы и ставку.</p></div></div></div>
          <div class="mechanisms-section" data-mechanisms-section="stats"><div class="mechanisms-placeholder"><div><div class="mechanisms-placeholder__icon">📈</div><h3>Статистика</h3><p>Загрузка парка, свободные часы и затраты.</p></div></div></div>
          ${isMechanic ? '<div class="mechanisms-section" data-mechanisms-section="management" data-mechanisms-management></div>' : ""}
          <div class="mechanisms-toast" data-mechanisms-toast aria-live="polite"></div>
        </section>
        <div class="mechanisms-booking mechanisms-booking--editor" data-mechanisms-booking-dialog role="dialog" aria-modal="true" aria-labelledby="mechanisms-booking-title" hidden><form class="mechanisms-booking__panel"><div class="mechanisms-booking__head"><div><h3 class="mechanisms-booking__title" id="mechanisms-booking-title">Бронирование техники</h3></div><button class="mechanisms-booking__close" type="button" data-mechanisms-booking-close aria-label="Закрыть">×</button></div><div class="mechanisms-booking__machine"><div class="mechanisms-booking__photo" data-mechanisms-booking-photo></div><div><b data-mechanisms-booking-source></b><span>Стоимость работы</span><strong data-mechanisms-booking-rate></strong></div></div><input type="hidden" name="mechanismId"><div class="mechanisms-booking__fields"><label>Объект${mechanismObjectSelect()}</label><label>Дата${mechanismDateRange()}</label><fieldset class="mechanisms-booking__time-field"><legend>Время работы</legend><div class="mechanisms-booking__times"><label>С${mechanismTimeSelect("timeFrom", MECHANISM_START_TIMES, "08:00", "Время начала")}</label><label>До${mechanismTimeSelect("timeTo", MECHANISM_END_TIMES, "17:00", "Время окончания")}</label></div></fieldset><label class="mechanisms-booking__comment">Комментарий<textarea name="comment" maxlength="300" rows="3" placeholder="Задача или дополнительная информация"></textarea></label><p class="mechanisms-booking-warning" data-mechanisms-booking-warning role="alert" hidden><span aria-hidden="true">⚠️</span><b data-mechanisms-booking-warning-text></b></p></div><div class="mechanisms-booking__actions"><button class="mechanisms-primary" type="submit">Сохранить бронь</button></div></form></div>
        <div class="mechanisms-booking" data-mechanisms-booking-details-dialog hidden><section class="mechanisms-booking__panel" role="dialog" aria-modal="true" aria-labelledby="mechanisms-booking-details-title"><div class="mechanisms-booking__head"><div><h3 id="mechanisms-booking-details-title">Информация о бронировании</h3><p>Актуальные данные выбранной брони</p></div><button class="mechanisms-booking__close" type="button" data-mechanisms-booking-details-close aria-label="Закрыть">×</button></div><div class="mechanisms-booking-details__content" data-mechanisms-booking-details-content></div></section></div>`;
      document.body.appendChild(mechanismsModalEl);
      const bookingForm = mechanismsModalEl.querySelector("[data-mechanisms-booking-dialog] form");
      mechanismsBookingControls = setupMechanismBookingControls(bookingForm);
      setupMechanismScheduleSelects(bookingForm);
      if (isMechanic) {
        const management = mechanismsModalEl.querySelector("[data-mechanisms-management]");
        createMechanismsManagement({
          container: management,
          path: `./${context.orgFolderName}/Механизмы.json`,
          loadJson,
          saveJson,
          user: currentUser,
        }).initialize();
      }
      mechanismsModalEl.addEventListener("error", (event) => {
        const image = event.target.closest?.("[data-mechanism-photo-image]");
        if (image) {
          const fallback = document.createElement("span");
          fallback.textContent = "🚜";
          fallback.setAttribute("aria-hidden", "true");
          image.replaceWith(fallback);
        }
      }, true);
      mechanismsModalEl.addEventListener("click", (event) => {
        if (event.target === mechanismsModalEl || event.target.closest("[data-mechanisms-close]")) {
          mechanismsModalEl.querySelector("[data-mechanisms-booking-dialog]").hidden = true;
          mechanismsModalEl.querySelector("[data-mechanisms-booking-details-dialog]").hidden = true;
          mechanismsModalEl.classList.add("is-hidden"); document.body.style.overflow = ""; return;
        }
        const columnFilterToggle = event.target.closest("[data-mechanisms-column-filter-toggle]");
        if (columnFilterToggle) {
          const filter = columnFilterToggle.closest("[data-mechanisms-column-filter]");
          const menu = filter?.querySelector("[data-mechanisms-column-filter-menu]");
          const willOpen = Boolean(menu?.hidden);
          mechanismsModalEl.querySelectorAll("[data-mechanisms-column-filter-menu]").forEach((item) => { item.hidden = true; });
          mechanismsModalEl.querySelectorAll("[data-mechanisms-column-filter-toggle]").forEach((item) => item.setAttribute("aria-expanded", "false"));
          if (menu) menu.hidden = !willOpen;
          columnFilterToggle.setAttribute("aria-expanded", String(willOpen));
          if (willOpen) menu?.querySelector("[data-mechanisms-option-search]")?.focus();
          return;
        }
        const filterReset = event.target.closest("[data-mechanisms-filter-reset]");
        if (filterReset) {
          const scope = filterReset.dataset.mechanismsFilterReset;
          if (scope === "mechanism") Object.assign(mechanismsBookingFilters, { fullTitle: "", name: "" });
          else if (scope === "object") mechanismsBookingFilters.object = "all";
          else Object.assign(mechanismsBookingFilters, { fullTitle: "", name: "", object: "all" });
          renderMechanismsBase();
          return;
        }
        const filterOption = event.target.closest("[data-mechanisms-filter-option]");
        if (filterOption) {
          mechanismsBookingFilters[filterOption.dataset.mechanismsFilterOption] = filterOption.dataset.mechanismsFilterValue;
          renderMechanismsBase();
          return;
        }
        const periodTrigger = event.target.closest("[data-mechanisms-period]");
        if (periodTrigger) {
          const nextPeriod = Number(periodTrigger.dataset.mechanismsPeriod);
          if ([3, 7, 30].includes(nextPeriod) && nextPeriod !== mechanismsScheduleDays) {
            mechanismsScheduleDays = nextPeriod;
            renderMechanismsBase();
          }
          return;
        }
        const bookingDetailsTrigger = event.target.closest("[data-mechanisms-booking-details]");
        if (bookingDetailsTrigger) { openMechanismsBookingDetails(bookingDetailsTrigger.dataset.mechanismsBookingDetails); return; }
        if (event.target.closest("[data-mechanisms-booking-details-close]") || event.target.closest("[data-mechanisms-booking-details-dialog]") === event.target) {
          mechanismsModalEl.querySelector("[data-mechanisms-booking-details-dialog]").hidden = true; return;
        }
        const bookingTrigger = event.target.closest("[data-mechanisms-booking-id]");
        if (bookingTrigger) { openMechanismsBooking(bookingTrigger.dataset.mechanismsBookingId, bookingTrigger.dataset.mechanismsBookingDate, bookingTrigger.dataset.mechanismsBookingFrom, bookingTrigger.dataset.mechanismsBookingTo); return; }
        if (event.target.closest("[data-mechanisms-booking-close]") || event.target.closest("[data-mechanisms-booking-dialog]") === event.target) {
          mechanismsModalEl.querySelector("[data-mechanisms-booking-dialog]").hidden = true; return;
        }
        const tab = event.target.closest("[data-mechanisms-tab]");
        if (tab) {
          const next = tab.dataset.mechanismsTab;
          mechanismsModalEl.querySelectorAll("[data-mechanisms-tab]").forEach((item) => item.classList.toggle("is-active", item.dataset.mechanismsTab === next));
          mechanismsModalEl.querySelectorAll("[data-mechanisms-section]").forEach((item) => item.classList.toggle("is-active", item.dataset.mechanismsSection === next));
          mechanismsModalEl.querySelector(".mechanisms-modal__panel")?.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
      const updateMechanismsFilter = (event) => {
        const optionSearch = event.target.closest("[data-mechanisms-option-search]");
        if (optionSearch && event.type === "input") {
          const query = optionSearch.value.trim().toLocaleLowerCase("ru-RU");
          const select = optionSearch.closest("[data-mechanisms-filter-select]");
          let visibleCount = 0;
          select?.querySelectorAll("[data-mechanisms-option-label]").forEach((option) => {
            const isVisible = !query || option.dataset.mechanismsOptionLabel.includes(query);
            option.hidden = !isVisible;
            if (isVisible) visibleCount += 1;
          });
          const empty = select?.querySelector("[data-mechanisms-options-empty]");
          if (empty) empty.hidden = visibleCount > 0;
          return;
        }
        const control = event.target.closest("[data-mechanisms-filter]");
        if (!control || event.type === "input") return;
        const filterName = control.dataset.mechanismsFilter;
        mechanismsBookingFilters[filterName] = control.value;
        renderMechanismsBase();
      };
      mechanismsModalEl.addEventListener("input", updateMechanismsFilter);
      mechanismsModalEl.addEventListener("change", updateMechanismsFilter);
      mechanismsModalEl.querySelector("[data-mechanisms-booking-dialog] form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const mechanism = organizationMechanisms.find((item) => String(item.id) === form.elements.mechanismId.value);
        const missing = [];
        if (!mechanism) missing.push("техника");
        if (!form.elements.object.value) missing.push("объект");
        if (!form.elements.dateFrom.value) missing.push("дата");
        if (!form.elements.timeFrom.value || !form.elements.timeTo.value || form.elements.timeFrom.value >= form.elements.timeTo.value) missing.push("корректное время");
        const warning = form.querySelector("[data-mechanisms-booking-warning]");
        form.querySelector("[data-booking-select-trigger]")?.classList.toggle("is-invalid", !form.elements.object.value);
        form.querySelector("[data-calendar-trigger]")?.classList.toggle("is-invalid", !form.elements.dateFrom.value);
        form.elements.timeFrom.closest("[data-mechanism-schedule-select]")?.querySelector("button")?.classList.toggle("is-invalid", missing.includes("корректное время"));
        form.elements.timeTo.closest("[data-mechanism-schedule-select]")?.querySelector("button")?.classList.toggle("is-invalid", missing.includes("корректное время"));
        if (missing.length) {
          warning.hidden = false;
          warning.querySelector("[data-mechanisms-booking-warning-text]").textContent = `Чтобы сохранить бронь, укажите: ${missing.join(", ")}.`;
          warning.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        warning.hidden = true;
        const submit = form.querySelector('[type="submit"]');
        submit.disabled = true;
        let addedBookingsCount = 0;
        try {
          const dates = [];
          const cursor = new Date(`${form.elements.dateFrom.value}T12:00:00`);
          const rangeEnd = new Date(`${(form.elements.dateTo.value || form.elements.dateFrom.value)}T12:00:00`);
          while (cursor <= rangeEnd) { dates.push(cursor.toLocaleDateString("sv-SE")); cursor.setDate(cursor.getDate() + 1); }
          const addedBookings = dates.map((date, index) => ({
            id: crypto.randomUUID?.() || `booking-${Date.now()}-${index}`,
            mechanismId: mechanism.id, mechanismTitle: mechanismTitle(mechanism),
            object: form.elements.object.value, date,
            timeFrom: form.elements.timeFrom.value, timeTo: form.elements.timeTo.value,
            comment: form.elements.comment.value.trim(),
            organization: String(user?.organization || context.orgFolderName || ""),
            createdAt: new Date().toISOString(), createdBy: String(currentUser?.full_name || currentUser?.name || ""),
          }));
          organizationMechanismBookings.push(...addedBookings);
          addedBookingsCount = addedBookings.length;
          await saveJson(mechanismBookingsPath, { bookings: organizationMechanismBookings, updatedAt: new Date().toISOString() }, { user: currentUser });
          mechanismsModalEl.querySelector("[data-mechanisms-booking-dialog]").hidden = true;
          mechanismsModalEl.querySelector("[data-mechanisms-toast]").textContent = "Бронь сохранена в базе организации";
          renderMechanismsBase();
        } catch (error) {
          if (addedBookingsCount) organizationMechanismBookings.splice(-addedBookingsCount, addedBookingsCount);
          mechanismsModalEl.querySelector("[data-mechanisms-toast]").textContent = "Не удалось сохранить бронь. Повторите попытку";
          console.error("Не удалось сохранить бронь механизма.", error);
        } finally { submit.disabled = false; }
      });
    }
    mechanismsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    loadMechanismsBase().catch((error) => {
      console.error("Не удалось загрузить базу механизмов.", error);
      const target = mechanismsModalEl.querySelector("[data-mechanisms-overview]");
      if (target) target.innerHTML = '<div class="mechanisms-base-empty"><span>⚠️</span><b>Не удалось загрузить базу организации</b><p>Закройте страницу и попробуйте снова.</p></div>';
    });
  };

  const openToolsModal = async (options = {}) => {
    if (!toolsModalEl) return;
    const objectFilter = sanitizeObjectName(options.objectFilter ?? "");
    resetToolsTopZoneStability();
    toolsState.mode = "user";
    setToolsStatusStandaloneVisibility(false);
    toolsState.activeReplacementResponsible = "";
    toolsState.searchSortDirection = "desc";
    toolsState.search = "";
    if (toolsSearchInput) toolsSearchInput.value = "";
    setToolsTitle("Мои инструменты");
    toolsState.filters.responsible = [];
    toolsState.filters.object = [];
    toolsState.view = "table";
    syncToolsFilterValue("responsible", []);
    syncToolsFilterValue("object", []);
    setToolsResponsibleFilterVisibility(false);
    syncToolsModalModeClass();
    updateToolsReplacementPendingLinkVisibility();
    syncToolsMapViewButtonVisibility();
    toolsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setToolsSubtitle("Загружаем список...");
    const numberConfig = await resolveToolsNumberConfig();
    updateToolsNumberConfig(numberConfig);
    await loadUserTools();
    if (objectFilter) {
      toolsState.filters.object = [objectFilter];
      syncToolsFilterValue("object", [objectFilter]);
      applyToolsFilters();
    }
    syncToolsViewButtons();
    if (
      toolsSearchInput &&
      (typeof window === "undefined" ||
        !window.matchMedia ||
        !window.matchMedia("(max-width: 520px)").matches)
    ) {
      toolsSearchInput.focus();
    }
  };

  const openReplacementToolsModal = async (replacementFullName = "") => {
    if (!toolsModalEl) return;
    const normalizedFullName = String(replacementFullName ?? "").trim();
    if (!normalizedFullName) return;
    resetToolsTopZoneStability();
    toolsState.activeReplacementResponsible = normalizedFullName;
    toolsState.mode = "replacement";
    setToolsStatusStandaloneVisibility(false);
    toolsState.filters.responsible = [];
    toolsState.filters.object = [];
    toolsState.view = normalizeToolsView(toolsState.previousView);
    syncToolsFilterValue("responsible", []);
    syncToolsFilterValue("object", []);
    setToolsResponsibleFilterVisibility(false);
    setToolsTitle(`Инструменты ${formatFullName(normalizedFullName)}`);
    syncToolsModalModeClass();
    updateToolsReplacementPendingLinkVisibility();
    syncToolsMapViewButtonVisibility();
    toolsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setToolsSubtitle("Загружаем список...");
    const numberConfig = await resolveToolsNumberConfig();
    updateToolsNumberConfig(numberConfig);
    await loadUserTools();
    syncToolsViewButtons();
    if (
      toolsSearchInput &&
      (typeof window === "undefined" ||
        !window.matchMedia ||
        !window.matchMedia("(max-width: 520px)").matches)
    ) {
      toolsSearchInput.focus();
    }
  };

  const openBaseModal = async () => {
    if (!toolsModalEl) return;
    resetToolsTopZoneStability();
    toolsState.mode = "base";
    setToolsStatusStandaloneVisibility(false);
    toolsState.activeReplacementResponsible = "";
    toolsState.view = normalizeToolsView(toolsState.previousView);
    setToolsTitle("База");
    setToolsResponsibleFilterVisibility(true);
    syncToolsModalModeClass();
    updateToolsReplacementPendingLinkVisibility();
    syncToolsMapViewButtonVisibility();
    toolsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setToolsSubtitle("Загружаем список...");
    const numberConfig = await resolveToolsNumberConfig();
    updateToolsNumberConfig(numberConfig);
    await loadBaseTools();
    syncToolsViewButtons();
    if (
      toolsSearchInput &&
      (typeof window === "undefined" ||
        !window.matchMedia ||
        !window.matchMedia("(max-width: 520px)").matches)
    ) {
      toolsSearchInput.focus();
    }
  };

  const openWriteOffPendingModal = async () => {
    if (!toolsModalEl) return;
    resetToolsTopZoneStability();
    toolsState.mode = "write-off-pending";
    toolsState.repairBrokenOnly = false;
    toolsState.repairInRepairOnly = false;
    toolsState.view = "table";
    toolsState.searchSortDirection = "desc";
    toolsState.activeReplacementResponsible = "";
    setToolsTitle("На списание");
    syncToolsSearchPlaceholder();
    setToolsStatusStandaloneVisibility(false);
    setToolsResponsibleFilterVisibility(true);
    syncToolsModalModeClass();
    updateToolsReplacementPendingLinkVisibility();
    syncToolsMapViewButtonVisibility();
    toolsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setToolsSubtitle("Загружаем список...");
    const numberConfig = await resolveToolsNumberConfig();
    updateToolsNumberConfig(numberConfig);
    await loadBaseTools();
    const userName = normalizePersonName(user?.full_name ?? user?.fullName ?? "");
    const canManageAllTools = isEnergyLikeRole(user?.role);
    if (!canManageAllTools && userName) {
      toolsState.tools = toolsState.tools.filter(
        (tool) => normalizePersonName(tool?.["Ответственный"] ?? "") === userName
      );
      toolsState.toolMap = new Map(
        toolsState.tools.map((tool) => [tool.__selectionId, tool])
      );
      prepareToolsFilters();
      applyToolsFilters();
    }
    syncToolsViewButtons();
    if (
      toolsSearchInput &&
      (typeof window === "undefined" ||
        !window.matchMedia ||
        !window.matchMedia("(max-width: 520px)").matches)
    ) {
      toolsSearchInput.focus();
    }
  };

  const openSearchModal = async () => {
    if (!toolsModalEl) return;
    resetToolsTopZoneStability();
    toolsState.mode = "search";
    toolsState.view = "table";
    toolsState.searchSortDirection = "desc";
    setToolsStatusStandaloneVisibility(false);
    setToolsTitle("Поиск");
    setToolsResponsibleFilterVisibility(true);
    syncToolsModalModeClass();
    updateToolsReplacementPendingLinkVisibility();
    syncToolsMapViewButtonVisibility();
    toolsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setToolsSubtitle("Загружаем список...");
    const numberConfig = await resolveToolsNumberConfig();
    updateToolsNumberConfig(numberConfig);
    await loadBaseTools();
    syncToolsViewButtons();
    if (
      toolsSearchInput &&
      (typeof window === "undefined" ||
        !window.matchMedia ||
        !window.matchMedia("(max-width: 520px)").matches)
    ) {
      toolsSearchInput.focus();
    }
  };

  const openNoAccountingNumberModal = async () => {
    if (!toolsModalEl) return;
    resetToolsTopZoneStability();
    toolsState.mode = "no-accounting-number";
    toolsState.view = "table";
    toolsState.searchSortDirection = "desc";
    setToolsStatusStandaloneVisibility(false);
    setToolsTitle("Без бух. номера");
    setToolsResponsibleFilterVisibility(true);
    syncToolsModalModeClass();
    updateToolsReplacementPendingLinkVisibility();
    syncToolsMapViewButtonVisibility();
    toolsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setToolsSubtitle("Загружаем список...");
    const numberConfig = await resolveToolsNumberConfig();
    updateToolsNumberConfig(numberConfig);
    await loadBaseTools();
    syncToolsViewButtons();
    if (
      toolsSearchInput &&
      (typeof window === "undefined" ||
        !window.matchMedia ||
        !window.matchMedia("(max-width: 520px)").matches)
    ) {
      toolsSearchInput.focus();
    }
  };

  const openMoveOtherModal = async () => {
    if (!toolsModalEl) return;
    resetToolsTopZoneStability();
    toolsState.mode = "move-other";
    setToolsStatusStandaloneVisibility(false);
    toolsState.view = "table";
    setToolsTitle("Переместить за других");
    setToolsResponsibleFilterVisibility(true);
    syncToolsModalModeClass();
    updateToolsReplacementPendingLinkVisibility();
    syncToolsMapViewButtonVisibility();
    toolsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setToolsSubtitle("Загружаем список...");
    const numberConfig = await resolveToolsNumberConfig();
    updateToolsNumberConfig(numberConfig);
    await loadBaseTools();
    syncToolsViewButtons();
    if (
      toolsSearchInput &&
      (typeof window === "undefined" ||
        !window.matchMedia ||
        !window.matchMedia("(max-width: 520px)").matches)
    ) {
      toolsSearchInput.focus();
    }
  };

  const closeToolsModal = () => {
    if (!toolsModalEl) return;
    toolsModalEl.classList.add("is-hidden");
    updateToolsReplacementPendingLinkVisibility();
    toolsModalEl.classList.remove("tools-modal--searching");
    toolsModalEl.classList.remove("tools-modal--global-search");
    toolsModalEl.classList.remove("tools-modal--search-page");
    toolsModalEl.classList.remove("tools-modal--my-tools");
    if (toolsState.mode === "add-photo") {
      closeAddPhotoDetailModal({ keepBodyLocked: false });
    }
    if (toolsState.mode === "remove-photo") {
      closeRemovePhotoModal({ keepBodyLocked: true });
    }
    document.body.style.overflow = "";
    resetToolsSelection();
    closeToolsMoveModal();
    closeToolsCancelMoveModal();
    if (toolsInfoModalEl && !toolsInfoModalEl.classList.contains("is-hidden")) {
      closeToolsInfoModal();
    }
    resetToolsTopZoneStability();
  };


  const setToolsEditAccountingOnlyMode = (enabled, tool = null) => {
    toolsEditState.accountingOnly = Boolean(enabled);
    toolsEditModalEl?.classList.toggle("tools-edit-modal--accounting-only", Boolean(enabled));
    const fieldsToToggle = [
      toolsEditNameInput,
      toolsEditManufacturerInput,
      toolsEditModelInput,
      toolsEditAccountingNameInput,
      toolsEditSerialInput,
      toolsEditGroupInput,
    ];
    fieldsToToggle.forEach((input) => {
      input?.closest(".form-field")?.classList.toggle("is-hidden", Boolean(enabled));
    });
    toolsEditKitBlockEl?.classList.toggle("is-hidden", Boolean(enabled));
    toolsEditPhotoInput?.closest(".tools-edit-photo-card")?.classList.toggle("is-hidden", Boolean(enabled));
    toolsEditDeleteButton?.closest(".tools-edit-actions--danger")?.classList.toggle("is-hidden", Boolean(enabled));
    if (!toolsEditQuickInfoEl) return;
    toolsEditQuickInfoEl.classList.toggle("is-hidden", !enabled);
    if (!enabled) {
      toolsEditQuickInfoEl.innerHTML = "";
      return;
    }
    const infoRows = [
      ["Наименование", tool?.["Наименование"]],
      ["Производитель", tool?.["Производитель"]],
      ["Модель", tool?.["Модель"]],
      ["Серийный номер", tool?.["Серийный номер"]],
      ["Ответственный", tool?.["Ответственный"]],
      ["Объект", tool?.["Объект"]],
    ].filter(([, value]) => String(value ?? "").trim());
    toolsEditQuickInfoEl.innerHTML = `
      <div class="tools-edit-quick-info__title">Информация об инструменте</div>
      <div class="tools-edit-quick-info__grid">
        ${infoRows
          .map(([label, value]) => `
            <div class="tools-edit-quick-info__item">
              <span>${escapeHtml(label)}</span>
              <b>${escapeHtml(String(value ?? "").trim())}</b>
            </div>
          `)
          .join("")}
      </div>
    `;
  };

  const closeToolsEditModal = () => {
    if (!toolsEditModalEl) return;
    toolsEditModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
    toolsEditState.tool = null;
    toolsEditState.matchNumber = "";
    toolsEditState.matchAccounting = "";
    toolsEditState.groupOptions = [];
    toolsEditState.isSaving = false;
    setToolsEditAccountingOnlyMode(false);
    setToolsEditMessage("");
    if (toolsEditPhotoInput) {
      toolsEditPhotoInput.value = "";
    }
    if (toolsEditKitListEl) {
      toolsEditKitListEl.innerHTML = "";
    }
    toolsEditKitRowCounter = 0;
    if (toolsEditKitToggleButton) {
      toolsEditKitToggleButton.setAttribute("aria-expanded", "false");
      toolsEditKitToggleButton.textContent = "Добавить комплектацию";
    }
    toolsEditKitPanelEl?.classList.add("is-hidden");
    toolsEditKitBlockEl?.classList.remove("is-open");
    toolsEditGroupSuggestionsEl?.classList.add("is-hidden");
  };

  const updateToolsEditGroupState = (inputEl, options, emptyPlaceholder) => {
    if (!inputEl) return;
    const basePlaceholder =
      inputEl.dataset.placeholder ?? "Выберите значение";
    const placeholderLabel = options.length ? basePlaceholder : emptyPlaceholder;
    if (inputEl instanceof HTMLSelectElement) {
      inputEl.innerHTML = [
        `<option value="">${escapeHtml(placeholderLabel)}</option>`,
        ...options.map(
          (option) =>
            `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`
        ),
      ].join("");
    } else if (toolsEditGroupOptionsEl) {
      toolsEditGroupOptionsEl.innerHTML = options
        .map((option) => `<option value="${escapeHtml(option)}"></option>`)
        .join("");
    }
    if (options.length) {
      inputEl.disabled = false;
      if (!(inputEl instanceof HTMLSelectElement)) {
        inputEl.placeholder = basePlaceholder;
      }
      return;
    }
    inputEl.disabled = true;
    if (!(inputEl instanceof HTMLSelectElement)) {
      inputEl.placeholder = emptyPlaceholder;
    }
    inputEl.value = "";
  };

  const loadToolsEditGroupOptions = async (orgFolder) => {
    if (!orgFolder) {
      toolsEditState.groupOptions = [];
      updateToolsEditGroupState(toolsEditGroupInput, [], "Нет групп");
      return;
    }
    const settingsPath = `./${orgFolder}/Настройки.json`;
    let rawSettings = {};
    try {
      rawSettings = await loadJson(settingsPath);
    } catch (error) {
      rawSettings = {};
    }
    const settingsData = ensureSettingsData(rawSettings);
    const organizationSettings = getEnergyOrganizationSettings(settingsData);
    const groupOptions = Array.isArray(organizationSettings.stcGroups)
      ? organizationSettings.stcGroups
      : [];
    toolsEditState.groupOptions = Array.from(
      new Set(
        groupOptions
          .map((group) => sanitizeToolGroupName(group))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "ru"));
    updateToolsEditGroupState(
      toolsEditGroupInput,
      toolsEditState.groupOptions,
      "Нет групп"
    );
  };

  const normalizeToolsKitItem = (item) => ({
    "Наименование": String(item?.["Наименование"] ?? "").trim(),
    "Количество": String(item?.["Количество"] ?? "").trim(),
    "Бух.номер": String(item?.["Бух.номер"] ?? "").trim(),
  });

  const setToolsEditKitExpanded = (expanded) => {
    if (!toolsEditKitToggleButton || !toolsEditKitPanelEl) return;
    toolsEditKitToggleButton.setAttribute("aria-expanded", expanded ? "true" : "false");
    toolsEditKitPanelEl.classList.toggle("is-hidden", !expanded);
    toolsEditKitBlockEl?.classList.toggle("is-open", expanded);
    toolsEditKitToggleButton.textContent = expanded
      ? "Скрыть комплектацию"
      : "Добавить комплектацию";
  };

  const createToolsEditKitRow = (item = null) => {
    if (!toolsEditKitListEl) return;
    toolsEditKitRowCounter += 1;
    const rowId = String(toolsEditKitRowCounter);
    const normalized = normalizeToolsKitItem(item);
    const rowEl = document.createElement("div");
    rowEl.className = "tools-edit-kit__row";
    rowEl.dataset.toolsEditKitRow = rowId;
    rowEl.innerHTML = `
      <label class="form-field form-field--required tools-edit-kit__field tools-edit-kit__field--name">
        <span class="form-label">Позиция комплекта</span>
        <input
          class="form-input"
          type="text"
          name="tools-edit-kit-name-${rowId}"
          value="${escapeHtml(normalized["Наименование"])}"
          placeholder="Например, кейс"
          autocomplete="off"
        />
      </label>
      <label class="form-field tools-edit-kit__field tools-edit-kit__field--count">
        <span class="form-label">Количество</span>
        <input
          class="form-input"
          type="text"
          inputmode="numeric"
          name="tools-edit-kit-count-${rowId}"
          value="${escapeHtml(normalized["Количество"])}"
          placeholder="Необязательно"
          autocomplete="off"
        />
      </label>
      <label class="form-field tools-edit-kit__field tools-edit-kit__field--accounting">
        <span class="form-label">Бух.номер</span>
        <input
          class="form-input"
          type="text"
          inputmode="text"
          name="tools-edit-kit-accounting-${rowId}"
          value="${escapeHtml(normalized["Бух.номер"])}"
          placeholder="Необязательно"
          autocomplete="off"
        />
      </label>
    `;
    toolsEditKitListEl.append(rowEl);
  };

  const fillToolsEditKitRows = (tool) => {
    if (!toolsEditKitListEl) return;
    toolsEditKitListEl.innerHTML = "";
    toolsEditKitRowCounter = 0;
    const kit = Array.isArray(tool?.["Комплектация"]) ? tool["Комплектация"] : [];
    const items = kit
      .map((item) => normalizeToolsKitItem(item))
      .filter(
        (item) =>
          item["Наименование"] || item["Количество"] || item["Бух.номер"]
      );
    if (items.length) {
      items.forEach((item) => createToolsEditKitRow(item));
      setToolsEditKitExpanded(true);
      return;
    }
    setToolsEditKitExpanded(false);
  };

  const collectToolsEditKitItems = () => {
    if (!toolsEditKitListEl) return [];
    const rows = Array.from(
      toolsEditKitListEl.querySelectorAll("[data-tools-edit-kit-row]")
    );
    return rows
      .map((row) => {
        const nameInput = row.querySelector('input[name^="tools-edit-kit-name-"]');
        const countInput = row.querySelector('input[name^="tools-edit-kit-count-"]');
        const accountingInput = row.querySelector(
          'input[name^="tools-edit-kit-accounting-"]'
        );
        return {
          item: {
            "Наименование": String(nameInput?.value ?? "").trim(),
            "Количество": String(countInput?.value ?? "").trim(),
            "Бух.номер": String(accountingInput?.value ?? "").trim(),
          },
          nameInput,
        };
      })
      .filter(
        ({ item }) =>
          item["Наименование"] || item["Количество"] || item["Бух.номер"]
      );
  };

  const setToolsInfoTab = (tab) => {
    toolsInfoState.tab = tab;
    toolsInfoTabButtons.forEach((button) => {
      const isActive = button.dataset.toolsInfoTab === tab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    toolsInfoPanels.forEach((panel) => {
      const isActive = panel.dataset.toolsInfoPanel === tab;
      panel.classList.toggle("is-active", isActive);
    });
  };

  const setToolsInfoHistoryOpened = (opened) => {
    toolsInfoState.historyOpened = Boolean(opened);
    if (toolsInfoHistoryToggleButton) {
      toolsInfoHistoryToggleButton.classList.toggle("is-active", toolsInfoState.historyOpened);
      toolsInfoHistoryToggleButton.setAttribute(
        "aria-pressed",
        toolsInfoState.historyOpened ? "true" : "false"
      );
    }
    if (toolsInfoPhotosSectionEl) {
      const hidePhotosSection = toolsInfoState.historyOpened || toolsState.mode === "search";
      toolsInfoPhotosSectionEl.classList.toggle("is-hidden", hidePhotosSection);
    }
    if (toolsInfoTabsEl) {
      toolsInfoTabsEl.classList.toggle("is-hidden", !toolsInfoState.historyOpened);
    }
    if (toolsInfoPanelsContainerEl) {
      toolsInfoPanelsContainerEl.classList.toggle("is-hidden", !toolsInfoState.historyOpened);
    }
    if (toolsInfoPanels.length) {
      toolsInfoPanels.forEach((panel) => {
        panel.classList.toggle("is-active", false);
      });
      if (toolsInfoState.historyOpened) {
        setToolsInfoTab(toolsInfoState.tab || "moves");
        if (!toolsInfoState.historyLoaded) {
          if (toolsInfoMovesSummaryEl) {
            toolsInfoMovesSummaryEl.textContent = "Загружаем перемещения...";
          }
          if (toolsInfoBreakdownsSummaryEl) {
            toolsInfoBreakdownsSummaryEl.textContent = "Загружаем поломки...";
          }
          if (toolsInfoRepairsSummaryEl) {
            toolsInfoRepairsSummaryEl.textContent = "Загружаем ремонты...";
          }
          renderToolsInfoNotes();
          void loadToolsInfoData({ includeHistory: true }).catch((error) => {
            console.warn("Не удалось загрузить историю инструмента.", error);
          });
        }
      }
    }
  };

  const renderToolsInfoKit = (tool) => {
    if (!toolsInfoKitEl || !toolsInfoKitToggleButton || !toolsInfoKitListEl) return;
    const isSearchMode = toolsState.mode === "search";
    if (isSearchMode) {
      toolsInfoKitToggleButton.classList.add("tools-info-inline-action", "tools-info-inline-action--emoji");
      toolsInfoKitToggleButton.classList.remove("button-secondary", "tools-info-kit__toggle");
      toolsInfoKitToggleButton.setAttribute("title", "Комплектация");
    } else {
      if (!toolsInfoKitEl.contains(toolsInfoKitToggleButton)) {
        toolsInfoKitEl.prepend(toolsInfoKitToggleButton);
      }
      toolsInfoKitToggleButton.classList.add("button-secondary", "tools-info-kit__toggle");
      toolsInfoKitToggleButton.classList.remove("tools-info-inline-action", "tools-info-inline-action--emoji");
      toolsInfoKitToggleButton.removeAttribute("title");
    }
    const kit = Array.isArray(tool?.["Комплектация"]) ? tool["Комплектация"] : [];
    const parseKitCount = (value) => {
      if (value == null) return 0;
      const normalized = String(value).replace(",", ".").trim();
      const parsed = Number.parseFloat(normalized);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    };
    const hasKit = kit.some((item) => {
      const name = String(item?.["Наименование"] ?? "").trim();
      const count = String(item?.["Количество"] ?? "").trim();
      const accounting = String(item?.["Бух.номер"] ?? "").trim();
      return Boolean(name || count || accounting);
    });
    const totalKitUnits = Math.round(
      kit.reduce((sum, item) => sum + parseKitCount(item?.["Количество"]), 0)
    );
    const kitToggleLabel = `Комплектация (${totalKitUnits})`;
    toolsInfoKitEl.classList.toggle("is-hidden", !isSearchMode && !hasKit);
    const kitUnavailable = isSearchMode && !hasKit;
    // В поиске значок комплектации остаётся на фото всегда: при отсутствии комплекта
    // он только приглушён и недоступен для нажатия.
    toolsInfoKitToggleButton.disabled = kitUnavailable;
    toolsInfoKitToggleButton.setAttribute("aria-disabled", kitUnavailable ? "true" : "false");
    toolsInfoKitToggleButton.classList.toggle("tools-info-inline-action--muted", kitUnavailable);
    if (!hasKit) {
      toolsInfoKitListEl.innerHTML = "";
      toolsInfoState.kitExpanded = false;
      toolsInfoKitContentEl?.classList.add("is-hidden");
      toolsInfoKitToggleButton.textContent = isSearchMode ? "🧰" : "Комплектация (0)";
      toolsInfoKitToggleButton.setAttribute("aria-label", "Комплектация отсутствует");
      return;
    }

    toolsInfoKitListEl.innerHTML = "";
    kit.forEach((item) => {
      const itemEl = document.createElement("div");
      itemEl.className = "tools-info-kit-item";
      const name = formatInfoValue(item?.["Наименование"]);
      const count = formatInfoValue(item?.["Количество"]);
      const accounting = formatInfoValue(item?.["Бух.номер"]);
      itemEl.innerHTML = `
        <div class="tools-info-kit-item__name">${escapeHtml(name)}</div>
        <div class="tools-info-kit-item__meta">
          <span>Кол-во: ${escapeHtml(count)}</span>
          <span>Бухгалтерский номер: ${escapeHtml(accounting)}</span>
        </div>
      `;
      toolsInfoKitListEl.appendChild(itemEl);
    });
    toolsInfoKitContentEl?.classList.toggle("is-hidden", !toolsInfoState.kitExpanded);
    toolsInfoKitToggleButton.textContent = isSearchMode ? "🧰" : kitToggleLabel;
    toolsInfoKitToggleButton.setAttribute("aria-label", kitToggleLabel);
  };

  const toggleToolsInfoKit = () => {
    if (toolsInfoKitEl?.classList.contains("is-hidden")) return;
    toolsInfoState.kitExpanded = !toolsInfoState.kitExpanded;
    if (toolsInfoState.tool) {
      renderToolsInfoKit(toolsInfoState.tool);
    }
  };

  const renderToolsInfoGrid = (tool) => {
    if (!toolsInfoGridEl) return;
    toolsInfoGridEl.innerHTML = "";
    const normalizedStatus = String(tool?.["Статус"] ?? "").trim().toLowerCase();
    const isWriteOffInfoMode =
      toolsState.mode === "write-off-pending" && normalizedStatus === "на списание";
    toolsInfoGridEl.classList.toggle("tools-info-grid--writeoff", isWriteOffInfoMode);
    const toolNumber =
      String(tool?.["Номер"] ?? "").trim() || resolveToolNumberValue(tool);
    const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
    const nameParts = [
      String(tool?.["Наименование"] ?? "").trim(),
      String(tool?.["Производитель"] ?? "").trim(),
      String(tool?.["Модель"] ?? "").trim(),
    ].filter(Boolean);
    const isSearchMode = toolsState.mode === "search";
    if (toolsInfoDocumentsButton) {
      toolsInfoDocumentsButton.classList.toggle("is-hidden", !isSearchMode);
    }
    if (!isSearchMode && toolsInfoHeaderActionsEl) {
      [toolsInfoCopyButton, toolsInfoDocumentsButton, toolsInfoShareButton, toolsInfoCloseButton].forEach((button) => {
        if (button) toolsInfoHeaderActionsEl.appendChild(button);
      });
    }
    if (toolsInfoDocumentsButton) {
      toolsInfoDocumentsButton.setAttribute("title", isSearchMode ? "Накладные" : "Документы");
      toolsInfoDocumentsButton.setAttribute(
        "aria-label",
        isSearchMode ? "Открыть накладные инструмента" : "Открыть документы инструмента"
      );
    }
    toolsInfoGridEl.classList.toggle("tools-info-grid--search-card", isSearchMode);
    const isMovingToolInSearch = isSearchMode && Boolean(tool?.__pendingMove);
    if (isSearchMode) {
      toolsInfoGridEl.innerHTML = `
        <div class="tools-info-search-hero">
          <div class="tools-info-search-photo">
            <button class="tools-info-search-photo__button" type="button" data-tools-info-cover-open aria-label="Открыть фото инструмента">
              <img data-tools-info-cover-image src="${escapeHtml(toolPhotoPlaceholder)}" alt="Фото инструмента" loading="lazy" />
            </button>
            <span class="tools-info-search-kit-slot" data-tools-info-search-kit-slot></span>
          </div>
          <div class="tools-info-search-main">
            <div class="tools-info-search-title">${escapeHtml(String(tool?.["Наименование"] ?? "").trim() || "Инструмент")}</div>
            <div class="tools-info-search-brand">${escapeHtml([tool?.["Производитель"], tool?.["Модель"]].map((v) => String(v ?? "").trim()).filter(Boolean).join(" · ") || "—")}</div>
            <div class="tools-info-search-numbers"><span>${escapeHtml(formatInfoValue(toolNumber))}</span><span>${escapeHtml(formatInfoValue(accountingNumber))}</span></div>
            ${isMovingToolInSearch ? `<div class="tools-info-search-badges"><span class="tools-info-search-moving" title="Инструмент ожидает принятия перемещения">↔ Перемещается</span></div>` : ""}
          </div>
          <div class="tools-info-search-actions" data-tools-info-search-actions aria-label="Действия с инструментом"></div>
        </div>
      `;
      const searchActionsEl = toolsInfoGridEl.querySelector("[data-tools-info-search-actions]");
      const searchKitSlotEl = toolsInfoGridEl.querySelector("[data-tools-info-search-kit-slot]");
      if (toolsInfoKitToggleButton) searchKitSlotEl?.appendChild(toolsInfoKitToggleButton);
      [
        toolsInfoCloseButton,
        toolsInfoDocumentsButton,
        toolsInfoCopyButton,
        toolsInfoShareButton,
      ].forEach((button) => {
        if (button) searchActionsEl?.appendChild(button);
      });
    }
    const info = isWriteOffInfoMode
      ? [
          { label: "Номер", value: toolNumber },
          { label: "Бухгалтерский номер", value: tool?.["Бух.номер"] },
          { label: "Наименование", value: nameParts.join(" ") },
          { label: "Стоимость", value: tool?.["Стоимость"] },
          { label: "Дата покупки", value: tool?.["Дата покупки"] },
          { label: "Ответственный", value: tool?.["Ответственный"] },
          { label: "Объект", value: tool?.["Объект"] },
        ]
      : [
      { label: "Номер", value: toolNumber },
      {
        label: "Бухгалтерский номер",
        value: tool?.["Бух.номер"],
        hideLabelInSearch: true,
      },
      { label: "Наименование", value: nameParts.join(" ") },
      {
        label: "Стоимость",
        value: tool?.["Стоимость"],
        hideLabelInSearch: true,
      },
      { label: "Дата покупки", value: tool?.["Дата покупки"] },
      { label: "Ответственный", value: tool?.["Ответственный"] },
      {
        label: "Объект",
        value: tool?.["Объект"],
        hideLabelInSearch: true,
      },
      { label: "Статус", value: tool?.["Статус"] },
    ];
    info
      .filter(({ label }) => objectTrackingEnabled || !isObjectRelatedLabel(label))
      .filter(({ label }) => !isSearchMode || ["Ответственный", "Объект", "Статус", "Стоимость", "Дата покупки"].includes(label))
      .forEach(({ label, value, hideLabelInSearch }) => {
      const row = document.createElement("div");
      row.className = "tools-info-row";
      if (isSearchMode) row.classList.add("tools-info-row--search");
      if (label === "Статус" && !isSearchMode) {
        row.classList.add("tools-info-row--status");
      }
      const labelEl = document.createElement("div");
      labelEl.className = "tools-info-label";
      const searchLabels = {
        "Ответственный": "👤 Ответственный",
        "Объект": "📍 Объект",
        "Статус": "Статус",
        "Стоимость": "💰 Стоимость",
        "Дата покупки": "📅 Покупка",
      };
      if (isSearchMode && label === "Статус") {
        const statusLabelDot = document.createElement("span");
        statusLabelDot.className = "tools-info-status-dot tools-info-status-dot--label";
        statusLabelDot.style.setProperty("--tools-info-status-color", resolveToolStatusColor(tool, value));
        statusLabelDot.setAttribute("aria-hidden", "true");
        const statusLabelText = document.createElement("span");
        statusLabelText.textContent = searchLabels[label] || label;
        labelEl.append(statusLabelDot, statusLabelText);
      } else {
        labelEl.textContent = isSearchMode ? (searchLabels[label] || label) : (hideLabelInSearch ? "" : label);
      }
      const valueEl = document.createElement("div");
      valueEl.className = "tools-info-value";
      const formattedValue = formatInfoValue(value);
      if (label === "Ответственный") {
        valueEl.textContent = formatResponsibleShortName(value);
      } else if (label === "Стоимость" && formattedValue !== "—") {
        valueEl.textContent = `${formattedValue} р.`;
      } else if (label === "Статус" && !isSearchMode) {
        const statusLine = document.createElement("div");
        statusLine.className = "tools-info-status-line";
        const statusText = document.createElement("span");
        statusText.className = "tools-info-status-text";
        statusText.textContent = normalizeToolsInfoStatus(value, Boolean(tool?.__pendingMove));
        statusLine.appendChild(statusText);
        const statusActions = document.createElement("div");
        statusActions.className = "tools-info-inline-actions";
        if (!isSearchMode) {
          [toolsInfoShareButton, toolsInfoCopyButton].forEach((button) => {
            if (!button) return;
            button.classList.add("tools-info-inline-action");
            statusActions.appendChild(button);
          });
        }
        if (statusActions.children.length) {
          statusLine.appendChild(statusActions);
        }
        valueEl.appendChild(statusLine);
      } else if (label === "Статус") {
        const statusBadge = document.createElement("span");
        statusBadge.className = "tools-info-status-badge";
        statusBadge.style.setProperty("--tools-info-status-color", resolveToolStatusColor(tool, value));
        const statusLabel = document.createElement("span");
        statusLabel.textContent = normalizeToolsInfoStatus(value, false);
        statusBadge.append(statusLabel);
        valueEl.appendChild(statusBadge);
      } else {
        valueEl.textContent = formattedValue;
      }
      row.append(labelEl, valueEl);
      toolsInfoGridEl.appendChild(row);
    });
  };

  const buildToolsInfoShareText = (tool) => {
    if (!tool) return "";
    const number =
      String(tool?.["Номер"] ?? "").trim() || resolveToolNumberValue(tool) || "—";
    const accounting = String(tool?.["Бух.номер"] ?? "").trim() || "—";
    const toolName = [
      String(tool?.["Наименование"] ?? "").trim(),
      String(tool?.["Производитель"] ?? "").trim(),
      String(tool?.["Модель"] ?? "").trim(),
    ]
      .filter(Boolean)
      .join(" ");
    const responsible = String(tool?.["Ответственный"] ?? "").trim() || "—";
    const objectName = String(tool?.["Объект"] ?? "").trim() || "—";
    const status = normalizeToolsInfoStatus(tool?.["Статус"], Boolean(tool?.__pendingMove));
    return [
      "Информация об инструменте:",
      `• Название: ${toolName || "—"}`,
      `• Номер: ${number}`,
      `• Бухгалтерский номер: ${accounting}`,
      `• Ответственный: ${responsible}`,
      objectTrackingEnabled ? `• Объект: ${objectName}` : "",
      `• Статус: ${status}`,
    ].filter(Boolean).join("\n");
  };

  const getToolsInfoSharePhotos = () => {
    if (!Array.isArray(toolsInfoState.photos)) return [];
    return toolsInfoState.photos
      .map((photo, index) => {
        const rawUrl = String(photo?.url ?? "").trim();
        if (!rawUrl) return null;
        try {
          const resolvedUrl = new URL(rawUrl, window.location.href);
          const fileName =
            String(photo?.name ?? "").trim() ||
            decodeURIComponent(resolvedUrl.pathname.split("/").pop() || "") ||
            `tool-photo-${index + 1}.jpg`;
          return { url: resolvedUrl.href, fileName };
        } catch (error) {
          return {
            url: rawUrl,
            fileName:
              String(photo?.name ?? "").trim() || `tool-photo-${index + 1}.jpg`,
          };
        }
      })
      .filter(Boolean);
  };

  const shareToolsInfoPhoto = async ({ tool, shareText }) => {
    if (!tool || typeof navigator?.share !== "function") return false;
    const photos = getToolsInfoSharePhotos();
    if (!photos.length) return false;
    const photoFiles = [];
    for (const photo of photos) {
      let response;
      try {
        response = await fetch(photo.url, { cache: "no-store", credentials: "include" });
      } catch (error) {
        console.warn("Не удалось загрузить фото для отправки.", error);
        continue;
      }
      if (!response?.ok) continue;
      const photoBlob = await response.blob();
      if (!photoBlob || !photoBlob.size) continue;
      const mimeType = String(photoBlob.type || "").trim() || "image/jpeg";
      const extension =
        mimeType === "image/png"
          ? "png"
          : mimeType === "image/webp"
            ? "webp"
            : "jpg";
      const safeFileName = String(photo.fileName || "").trim();
      const normalizedFileName = safeFileName
        ? safeFileName
            .normalize("NFKD")
            .replace(/[^a-zA-Z0-9._-]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
        : "";
      const fileNameBase = normalizedFileName || `tool-photo-${photoFiles.length + 1}`;
      const fileName = fileNameBase.includes(".")
        ? fileNameBase
        : `${fileNameBase}.${extension}`;
      photoFiles.push(new File([photoBlob], fileName, { type: mimeType }));
    }
    if (!photoFiles.length) return false;
    const sharePayload = {
      files: photoFiles,
      text: shareText,
      title: `Инструмент ${resolveToolNumberValue(tool) || ""}`.trim(),
    };
    try {
      await navigator.share(sharePayload);
      return true;
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.warn("Не удалось отправить фото инструмента.", error);
      }
    }
    try {
      await navigator.share({ files: photoFiles });
      return true;
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.warn("Не удалось отправить фото инструмента без текста.", error);
      }
      return false;
    }
  };

  const setToolsInfoSubtitleMessage = (message) => {
    if (!toolsInfoSubtitleEl) return;
    toolsInfoSubtitleEl.textContent = message;
    window.setTimeout(() => {
      if (toolsInfoState.tool && toolsInfoSubtitleEl.textContent === message) {
        toolsInfoSubtitleEl.textContent = "";
      }
    }, 1800);
  };

  const normalizeToolsInfoStatus = (rawStatus, movingNow = false) => {
    if (movingNow) return "Перемещается";
    const normalized = String(rawStatus ?? "").trim().toLocaleLowerCase("ru");
    if (!normalized) return "—";
    if (normalized === "рабочий") return "Исправный";
    if (normalized === "в процессе перемещения") return "Перемещается";
    return String(rawStatus ?? "").trim();
  };

  const applyToolsInfoPanelTone = (tool) => {
    if (!toolsInfoModalPanelEl) return;
    const shouldHighlightPending = Boolean(tool?.__pendingMove);
    toolsInfoModalPanelEl.classList.toggle(
      "tools-item--broken",
      tool?.__statusTone === "broken"
    );
    toolsInfoModalPanelEl.classList.toggle(
      "tools-item--repair",
      tool?.__statusTone === "repair"
    );
    toolsInfoModalPanelEl.classList.toggle(
      "tools-item--writeoff",
      tool?.__statusTone === "writeoff"
    );
    toolsInfoModalPanelEl.classList.toggle(
      "tools-item--pending-response",
      shouldHighlightPending
    );
    toolsInfoModalPanelEl.classList.toggle("tools-info-modal__panel--search", toolsState.mode === "search");
  };

  const buildToolsInfoMatcher = (tool) => {
    const number = normalizeToolNumberValue(tool?.["Номер"] ?? "");
    const accounting = String(tool?.["Бух.номер"] ?? "").trim();
    return (entry) => {
      const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
      const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
      if (number && entryNumber === number) return true;
      if (accounting && entryAccounting === accounting) return true;
      return false;
    };
  };

  const setToolsInfoTabBadge = (tab, count) => {
    const badge = toolsInfoTabBadges[tab];
    if (!badge) return;
    badge.textContent = String(count);
    badge.setAttribute("aria-label", `Количество: ${count}`);
  };

  const renderToolsInfoMoves = () => {
    if (toolsInfoMovesListEl) toolsInfoMovesListEl.innerHTML = "";
    const moves = toolsInfoState.moves.filter((move) => String(move?.["Ответ"] ?? "").trim());
    setToolsInfoTabBadge("moves", moves.length);
    if (toolsInfoMovesSummaryEl) {
      toolsInfoMovesSummaryEl.textContent = "";
    }
    if (toolsInfoMovesEmptyEl) {
      toolsInfoMovesEmptyEl.classList.add("is-hidden");
      toolsInfoMovesEmptyEl.textContent = "";
    }
    if (!toolsInfoMovesListEl) return;
    moves.forEach((move) => {
      const response = String(move?.["Ответ"] ?? "").trim().toLowerCase();
      const isRejected = response.includes("не прин") || response.includes("отказ");
      const isCancelled = response.includes("отмена");
      const isObjectChange = response.includes("смена объекта");
      const item = document.createElement("div");
      item.className = "tools-info-item";
      if (isRejected) item.classList.add("tools-info-item--danger");
      if (isCancelled) item.classList.add("tools-info-item--warning");
      if (isObjectChange) item.classList.add("tools-info-item--object");
      const title = document.createElement("div");
      title.className = "tools-info-item__title";
      title.textContent = formatInfoValue(move?.["Дата перемещения"]);
      const grid = document.createElement("div");
      grid.className = "tools-info-item__grid";
      const hasPreviousResponsible = Object.prototype.hasOwnProperty.call(
        move ?? {},
        "Ответственный до перемещения"
      );
      const previousResponsible = hasPreviousResponsible
        ? String(move?.["Ответственный до перемещения"] ?? "").trim()
        : "";
      const movedByEnergy = String(move?.["Переместил энергетик"] ?? "").trim();
      const senderSection = document.createElement("div");
      senderSection.className = "tools-info-item__move-section";
      const receiverSection = document.createElement("div");
      receiverSection.className = "tools-info-item__move-section";

      if (movedByEnergy) {
        senderSection.append(
          buildToolsInfoRow("Переместил энергетик", movedByEnergy),
          buildToolsInfoRow(
            "Ответственный до перемещения",
            previousResponsible
          )
        );
      } else {
        senderSection.append(buildToolsInfoRow("Переместил", move?.["Переместил"]));
        if (previousResponsible) {
          senderSection.append(
            buildToolsInfoRow(
              "Ответственный до перемещения",
              previousResponsible
            )
          );
        }
      }
      if (objectTrackingEnabled) {
        senderSection.append(buildToolsInfoRow("Старый объект", move?.["Старый объект"]));
      }
      receiverSection.append(buildToolsInfoRow("Принял", move?.["Принял"]));
      if (objectTrackingEnabled) {
        receiverSection.append(buildToolsInfoRow("Новый объект", move?.["Новый объект"]));
      }

      const divider = document.createElement("div");
      divider.className = "tools-info-item__move-divider";
      grid.append(senderSection, divider, receiverSection);
      if (move?.["Дата ответа"]) {
        grid.append(buildToolsInfoRow("Дата ответа", move?.["Дата ответа"]));
      }
      item.append(title, grid);
      const moveReason = String(move?.["Причина перемещения"] ?? "").trim();
      if (moveReason) {
        const note = document.createElement("div");
        note.className = "tools-info-item__note";
        note.textContent = `Причина перемещения: ${moveReason}`;
        item.appendChild(note);
      }
      const refusalReason = String(move?.["Причина отказа"] ?? "").trim();
      if (isRejected || refusalReason) {
        const reason = formatInfoValue(
          refusalReason || move?.["Комментарий к ответу"]
        );
        const note = document.createElement("div");
        note.className = "tools-info-item__note tools-info-item__note--danger";
        note.textContent = `Причина отказа: ${reason}`;
        item.appendChild(note);
      }
      toolsInfoMovesListEl.appendChild(item);
    });
  };

  const renderToolsInfoPhotos = () => {
    if (toolsInfoPhotosGridEl) toolsInfoPhotosGridEl.innerHTML = "";
    const files = Array.isArray(toolsInfoState.photos) ? toolsInfoState.photos : [];
    if (toolsInfoPhotosSummaryEl) {
      toolsInfoPhotosSummaryEl.textContent = files.length
        ? ""
        : "Фото пока не загружены.";
    }
    const coverImage = toolsInfoGridEl?.querySelector("[data-tools-info-cover-image]");
    if (coverImage) {
      coverImage.src = files[0]?.url || toolPhotoPlaceholder;
    }
    if (toolsInfoPhotosEmptyEl) {
      toolsInfoPhotosEmptyEl.classList.toggle("is-hidden", files.length > 0);
    }
    if (!toolsInfoPhotosGridEl || !files.length) return;
    files.forEach((file, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tools-info-photo-tile";
      button.setAttribute("aria-label", `Открыть фото ${index + 1}`);
      const image = document.createElement("img");
      image.className = "tools-info-photo-tile__image";
      image.src = file?.url || toolPhotoPlaceholder;
      image.alt = file?.name ? `Фото инструмента: ${file.name}` : `Фото ${index + 1}`;
      image.loading = "lazy";
      button.appendChild(image);
      button.addEventListener("click", () => {
        const tool = toolsInfoState.tool;
        if (!tool) return;
        openPendingMovePhotoViewer({
          tool,
          fallbackNumber: resolveToolNumberValue(tool),
          title: toolsInfoTitleEl?.textContent || "Инструмент",
        });
      });
      toolsInfoPhotosGridEl.appendChild(button);
    });
  };

  const renderToolsInfoBreakdowns = () => {
    if (toolsInfoBreakdownsListEl) toolsInfoBreakdownsListEl.innerHTML = "";
    const breakdowns = toolsInfoState.breakdowns;
    let totalDays = 0;
    breakdowns.forEach((entry) => {
      const startDate = parseDateValue(entry?.["Дата поломки"]);
      if (!startDate) return;
      const endDate = parseDateValue(entry?.["Дата ремонта"]) || new Date();
      totalDays += getDaysDifference(endDate, startDate);
    });
    setToolsInfoTabBadge("breakdowns", breakdowns.length);
    if (toolsInfoBreakdownsSummaryEl) {
      toolsInfoBreakdownsSummaryEl.textContent = breakdowns.length
        ? `Суммарно: ${formatDaysValue(totalDays)}`
        : "";
    }
    if (toolsInfoBreakdownsEmptyEl) {
      toolsInfoBreakdownsEmptyEl.classList.add("is-hidden");
      toolsInfoBreakdownsEmptyEl.textContent = "";
    }
    if (!toolsInfoBreakdownsListEl) return;
    breakdowns.forEach((entry) => {
      const startDate = parseDateValue(entry?.["Дата поломки"]);
      const endDate = parseDateValue(entry?.["Дата ремонта"]);
      const endLabel = endDate ? entry?.["Дата ремонта"] : "Сломан";
      const item = document.createElement("div");
      item.className = "tools-info-item";
      if (!endDate) {
        item.classList.add("tools-info-item--warning");
      }
      const title = document.createElement("div");
      title.className = "tools-info-item__title";
      title.textContent = formatInfoValue(entry?.["Дата поломки"]);
      const grid = document.createElement("div");
      grid.className = "tools-info-item__grid";
      const dateValue = formatDateWithDays({
        dateLabel: endLabel,
        startDate,
        endDate,
      });
      grid.append(
        buildToolsInfoRow("Дата ремонта", dateValue),
        buildToolsInfoRow("Описание поломки", entry?.["Описание поломки"]),
        buildToolsInfoRow("Ответственный", entry?.["Ответственный"])
      );
      item.append(title, grid);
      toolsInfoBreakdownsListEl.appendChild(item);
    });
  };

  const renderToolsInfoNotes = () => {
    if (!toolsInfoNotesListEl) return;
    const notes = normalizeToolNotes(toolsInfoState.tool);
    if (toolsInfoNotesSummaryEl) {
      const count = notes.length;
      setToolsInfoTabBadge("notes", count);
      toolsInfoNotesSummaryEl.textContent = "";
    }
    toolsInfoNotesListEl.innerHTML = "";
    notes.slice().reverse().forEach((note) => {
      const item = document.createElement("article");
      item.className = "tools-info-item tools-info-item--note";
      const title = document.createElement("div");
      title.className = "tools-info-item__title";
      title.textContent = `${note.author || "Пользователь"} · ${formatToolNoteDate(note.createdAt)}${note.updatedAt ? " · изменено" : ""}`;
      const text = document.createElement("div");
      text.className = "tools-info-item__note tools-note-item__text";
      text.textContent = note.text;
      item.append(title, text);
      if (canEditToolNote(note)) {
        item.appendChild(buildToolNoteEditor(note, renderToolsInfoNotes));
      }
      toolsInfoNotesListEl.appendChild(item);
    });
  };

  const saveToolsInfoNote = async () => {
    const cleanText = String(toolsInfoNotesInputEl?.value ?? "").trim();
    if (!cleanText || !toolsInfoState.tool || toolsInfoState.isSavingNote) return;
    toolsInfoState.isSavingNote = true;
    if (toolsInfoNotesSaveButton) toolsInfoNotesSaveButton.disabled = true;
    if (toolsInfoNotesMessageEl) toolsInfoNotesMessageEl.textContent = "Сохраняем...";
    try {
      toolsNotesState.tool = toolsInfoState.tool;
      toolsNotesState.orgFolder = toolsInfoState.orgFolder || toolsState.orgFolder || context.orgFolderName || "";
      await saveToolNote(cleanText);
      const freshTool = toolsNotesState.tool;
      toolsInfoState.tool = freshTool;
      if (toolsInfoNotesInputEl) toolsInfoNotesInputEl.value = "";
      renderToolsInfoGrid(freshTool);
      renderToolsInfoNotes();
      if (toolsInfoNotesMessageEl) toolsInfoNotesMessageEl.textContent = "Заметка добавлена.";
    } catch (error) {
      console.warn("Не удалось сохранить заметку из карточки инструмента.", error);
      if (toolsInfoNotesMessageEl) toolsInfoNotesMessageEl.textContent = "Не удалось сохранить заметку.";
    } finally {
      toolsInfoState.isSavingNote = false;
      if (toolsInfoNotesSaveButton) toolsInfoNotesSaveButton.disabled = false;
    }
  };

  const renderToolsInfoRepairs = () => {
    if (toolsInfoRepairsListEl) toolsInfoRepairsListEl.innerHTML = "";
    const repairs = toolsInfoState.repairs;
    let totalDays = 0;
    repairs.forEach((entry) => {
      const startDate = parseDateValue(entry?.["Дата отправки в ремонт"]);
      if (!startDate) return;
      const endDate = parseDateValue(entry?.["Дата ремонта"]) || new Date();
      totalDays += getDaysDifference(endDate, startDate);
    });
    setToolsInfoTabBadge("repairs", repairs.length);
    if (toolsInfoRepairsSummaryEl) {
      toolsInfoRepairsSummaryEl.textContent = repairs.length
        ? `Суммарно: ${formatDaysValue(totalDays)}`
        : "";
    }
    if (toolsInfoRepairsEmptyEl) {
      toolsInfoRepairsEmptyEl.classList.add("is-hidden");
      toolsInfoRepairsEmptyEl.textContent = "";
    }
    if (!toolsInfoRepairsListEl) return;
    repairs.forEach((entry) => {
      const startDate = parseDateValue(entry?.["Дата отправки в ремонт"]);
      const endDate = parseDateValue(entry?.["Дата ремонта"]);
      const endLabel = endDate ? entry?.["Дата ремонта"] : "В ремонте";
      const item = document.createElement("div");
      item.className = "tools-info-item";
      if (!endDate) {
        item.classList.add("tools-info-item--repair");
      }
      const title = document.createElement("div");
      title.className = "tools-info-item__title";
      title.textContent = formatInfoValue(entry?.["Дата отправки в ремонт"]);
      const grid = document.createElement("div");
      grid.className = "tools-info-item__grid";
      const dateValue = formatDateWithDays({
        dateLabel: endLabel,
        startDate,
        endDate,
      });
      const costValue =
        entry?.["Стоимость ремонта"] ?? entry?.["Предварительная стоимость ремонта"];
      grid.append(
        buildToolsInfoRow("Организация", entry?.["Организация"]),
        buildToolsInfoRow("Дата ремонта", dateValue),
        buildToolsInfoRow("Стоимость ремонта", costValue),
        buildToolsInfoRow("Ответственный", entry?.["Ответственный"])
      );
      item.append(title, grid);
      toolsInfoRepairsListEl.appendChild(item);
    });
  };

  const loadToolsInfoData = async ({ includeHistory = false } = {}) => {
    const tool = toolsInfoState.tool;
    const orgFolder = toolsInfoState.orgFolder;
    if (!tool || !orgFolder) {
      toolsInfoState.moves = [];
      toolsInfoState.breakdowns = [];
      toolsInfoState.repairs = [];
      toolsInfoState.photos = [];
      renderToolsInfoMoves();
      renderToolsInfoBreakdowns();
      renderToolsInfoRepairs();
      renderToolsInfoNotes();
      renderToolsInfoPhotos();
      return;
    }
    const matcher = buildToolsInfoMatcher(tool);
    const primaryPhotoNumber = resolveToolPhotoNumber(tool);
    const toolNumber = String(tool?.["Номер"] ?? "").trim();
    const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
    const { files: photoFiles = [] } = await loadToolPhotoFiles(
      orgFolder,
      primaryPhotoNumber,
      toolNumber,
      accountingNumber
    );
    toolsInfoState.photos = Array.isArray(photoFiles) ? photoFiles : [];
    renderToolsInfoPhotos();
    if (!includeHistory) {
      return;
    }
    const movesPath = `./${orgFolder}/Перемещения.json`;
    const movesHistoryPath = `./${orgFolder}/Перемещения история.json`;
    const breakdownsPath = `./${orgFolder}/Поломки.json`;
    const repairsPath = `./${orgFolder}/Ремонты.json`;
    const [rawMoves, rawMovesHistory, rawBreakdowns, rawRepairs] = await Promise.all([
      loadJson(movesPath).catch(() => []),
      loadJson(movesHistoryPath).catch(() => []),
      loadJson(breakdownsPath).catch(() => []),
      loadJson(repairsPath).catch(() => []),
    ]);
    const activeMoves = Array.isArray(rawMoves)
      ? rawMoves
      : Array.isArray(rawMoves?.moves)
        ? rawMoves.moves
        : [];
    const historyMoves = Array.isArray(rawMovesHistory)
      ? rawMovesHistory
      : Array.isArray(rawMovesHistory?.moves)
        ? rawMovesHistory.moves
        : [];
    const moves = [...activeMoves, ...historyMoves];
    const breakdowns = Array.isArray(rawBreakdowns)
      ? rawBreakdowns
      : Array.isArray(rawBreakdowns?.breakdowns)
        ? rawBreakdowns.breakdowns
        : [];
    const repairs = Array.isArray(rawRepairs)
      ? rawRepairs
      : Array.isArray(rawRepairs?.repairs)
        ? rawRepairs.repairs
        : [];
    toolsInfoState.moves = moves
      .filter(matcher)
      .filter(
        (move) =>
          String(move?.["Ответ"] ?? "").trim().toLowerCase() !== "отменено"
      )
      .sort((a, b) => {
        const aDate = parseDateValue(a?.["Дата перемещения"]);
        const bDate = parseDateValue(b?.["Дата перемещения"]);
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return bDate - aDate;
      });
    toolsInfoState.breakdowns = breakdowns
      .filter(matcher)
      .sort((a, b) => {
        const aDate = parseDateValue(a?.["Дата поломки"]);
        const bDate = parseDateValue(b?.["Дата поломки"]);
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return bDate - aDate;
      });
    toolsInfoState.repairs = repairs
      .filter(matcher)
      .sort((a, b) => {
        const aDate = parseDateValue(a?.["Дата отправки в ремонт"]);
        const bDate = parseDateValue(b?.["Дата отправки в ремонт"]);
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return bDate - aDate;
      });
    toolsInfoState.historyLoaded = true;
    renderToolsInfoMoves();
    renderToolsInfoBreakdowns();
    renderToolsInfoRepairs();
    renderToolsInfoNotes();
  };

  const closeToolsInfoModal = () => {
    if (!toolsInfoModalEl) return;
    toolsInfoModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
    toolsInfoState.tool = null;
    toolsInfoState.historyOpened = false;
    toolsInfoState.historyLoaded = false;
    toolsInfoState.photos = [];
    toolsInfoState.kitExpanded = false;
    if (toolsInfoCancelMoveButton) {
      toolsInfoCancelMoveButton.classList.add("is-hidden");
      toolsInfoCancelMoveButton.disabled = true;
    }
    applyToolsInfoPanelTone(null);
  };

  const syncToolsInfoMoveButtonVisibility = () => {
    if (!toolsInfoMoveButton) return;
    const shouldShowInInfoCard =
      toolsState.mode === "user" || toolsState.mode === "move-other";
    toolsInfoMoveButton.classList.toggle("is-hidden", !shouldShowInInfoCard);
  };

  const openToolsInfoModal = async (tool) => {
    if (!toolsInfoModalEl || !tool) return;
    toolsInfoState.tool = tool;
    toolsInfoState.orgFolder = toolsState.orgFolder || context.orgFolderName || "";
    const nameParts = [
      String(tool?.["Наименование"] ?? "").trim(),
      String(tool?.["Производитель"] ?? "").trim(),
      String(tool?.["Модель"] ?? "").trim(),
    ].filter(Boolean);
    const title = nameParts.length ? nameParts.join(" ") : "Инструмент";
    if (toolsInfoTitleEl) {
      toolsInfoTitleEl.textContent = title;
    }
    if (toolsInfoSubtitleEl) {
      toolsInfoSubtitleEl.textContent = "";
    }
    applyToolsInfoPanelTone(tool);
    toolsInfoState.kitExpanded = false;
    toolsInfoState.historyLoaded = false;
    renderToolsInfoKit(tool);
    renderToolsInfoGrid(tool);
    toolsInfoState.moves = [];
    toolsInfoState.breakdowns = [];
    toolsInfoState.repairs = [];
    renderToolsInfoMoves();
    renderToolsInfoBreakdowns();
    renderToolsInfoRepairs();
    renderToolsInfoNotes();
    if (toolsInfoPhotosSummaryEl) {
      toolsInfoPhotosSummaryEl.textContent = "Загружаем фото...";
    }
    if (toolsInfoMovesListEl) toolsInfoMovesListEl.innerHTML = "";
    if (toolsInfoBreakdownsListEl) toolsInfoBreakdownsListEl.innerHTML = "";
    if (toolsInfoRepairsListEl) toolsInfoRepairsListEl.innerHTML = "";
    if (toolsInfoNotesInputEl) toolsInfoNotesInputEl.value = "";
    if (toolsInfoNotesMessageEl) toolsInfoNotesMessageEl.textContent = "";
    if (toolsInfoMovesEmptyEl) toolsInfoMovesEmptyEl.classList.add("is-hidden");
    if (toolsInfoBreakdownsEmptyEl) {
      toolsInfoBreakdownsEmptyEl.classList.add("is-hidden");
    }
    if (toolsInfoRepairsEmptyEl) toolsInfoRepairsEmptyEl.classList.add("is-hidden");
    setToolsInfoTab("moves");
    setToolsInfoHistoryOpened(toolsState.mode === "search");
    syncToolsInfoMoveButtonVisibility();
    toolsInfoModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    await Promise.all([
      loadToolsInfoData({ includeHistory: toolsState.mode === "search" }),
      syncToolsInfoCancelMoveButton(tool),
    ]);
  };

  const openToolsEditModal = async (tool, options = {}) => {
    if (!toolsEditModalEl || !tool) return;
    toolsEditState.tool = tool;
    toolsEditState.matchNumber = normalizeToolNumberValue(tool?.["Номер"] ?? "");
    toolsEditState.matchAccounting = String(tool?.["Бух.номер"] ?? "").trim();
    toolsEditState.orgFolder = toolsState.orgFolder || context.orgFolderName || "";
    toolsEditState.isSaving = false;
    const toolNumber = resolveToolNumberValue(tool) || "—";
    const toolName = String(tool?.["Наименование"] ?? "").trim() || "Инструмент";
    const titleOverride = String(options.title ?? "").trim();
    if (toolsEditTitleEl) {
      toolsEditTitleEl.textContent = titleOverride || toolName;
    }
    if (toolsEditSubtitleEl) {
      toolsEditSubtitleEl.textContent = `№${toolNumber}`;
    }
    if (toolsEditAccountingInput) {
      toolsEditAccountingInput.value = String(tool?.["Бух.номер"] ?? "");
    }
    if (toolsEditNameInput) {
      toolsEditNameInput.value = String(tool?.["Наименование"] ?? "");
    }
    if (toolsEditManufacturerInput) {
      toolsEditManufacturerInput.value = String(tool?.["Производитель"] ?? "");
    }
    if (toolsEditModelInput) {
      toolsEditModelInput.value = String(tool?.["Модель"] ?? "");
    }
    if (toolsEditAccountingNameInput) {
      toolsEditAccountingNameInput.value = String(
        tool?.["Наименование по бухгалтерии"] ?? ""
      );
    }
    if (toolsEditSerialInput) {
      toolsEditSerialInput.value = String(tool?.["Серийный номер"] ?? "");
    }
    await loadToolsEditGroupOptions(toolsEditState.orgFolder);
    if (toolsEditGroupInput) {
      const groupValue = String(tool?.["Граппа инструментов"] ?? "").trim();
      const hasOption = toolsEditState.groupOptions.some(
        (option) => option === groupValue
      );
      toolsEditGroupInput.value = hasOption ? groupValue : "";
    }
    fillToolsEditKitRows(tool);
    setToolsEditAccountingOnlyMode(Boolean(options.accountingOnly), tool);
    const count = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
    updateToolsEditPhotoCount(Number.isFinite(count) ? count : 0);
    setToolsEditMessage("");
    toolsEditModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    if (options.focusAccounting && toolsEditAccountingInput) {
      toolsEditAccountingInput.focus();
      toolsEditAccountingInput.select?.();
    } else if (toolsEditNameInput) {
      toolsEditNameInput.focus();
    }
  };

  const applyToolsEditUpdateToState = (updatedFields) => {
    const matcher = buildToolsEditMatcher({
      "Номер": toolsEditState.matchNumber,
      "Бух.номер": toolsEditState.matchAccounting,
    });
    let updatedTool = null;
    toolsState.tools = toolsState.tools.map((entry, index) => {
      if (!matcher(entry)) return entry;
      const next = {
        ...entry,
        ...updatedFields,
      };
      next.__searchLine = buildToolSearchLine(next);
      next.__statusTone = resolveToolStatusTone(next);
      next.__selectionId = buildToolSelectionId(next, index);
      updatedTool = next;
      return next;
    });
    toolsState.toolMap = new Map(
      toolsState.tools.map((tool) => [tool.__selectionId, tool])
    );
    if (updatedTool) {
      toolsEditState.tool = updatedTool;
    }
    applyToolsFilters();
  };

  const saveToolsEditFields = async (updatedFields) => {
    const orgFolder = toolsEditState.orgFolder;
    const matcher = buildToolsEditMatcher({
      "Номер": toolsEditState.matchNumber,
      "Бух.номер": toolsEditState.matchAccounting,
    });
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    let toolsPayloadRaw = [];
    try {
      toolsPayloadRaw = await loadJson(toolsPath);
    } catch (error) {
      toolsPayloadRaw = [];
    }
    const toolsNormalized = normalizeCollectionPayload(toolsPayloadRaw, "tools");
    const toolIndex = toolsNormalized.items.findIndex(matcher);
    if (toolIndex < 0) {
      setToolsEditMessage("Инструмент не найден в базе.", "error");
      toolsEditState.isSaving = false;
      return;
    }
    const nextTool = {
      ...toolsNormalized.items[toolIndex],
      ...updatedFields,
    };
    const updatedTools = [...toolsNormalized.items];
    updatedTools[toolIndex] = nextTool;
    const updatedToolsPayload = toolsNormalized.wrapper
      ? { ...toolsNormalized.wrapper, [toolsNormalized.key]: updatedTools }
      : updatedTools;
    try {
      await saveEntries([
        {
          path: toolsPath,
          data: updatedToolsPayload,
          ...buildUploadUserMeta({ organizationName: context.orgFullName }),
        },
      ]);
      applyToolsEditUpdateToState(updatedFields);
      if (Object.prototype.hasOwnProperty.call(updatedFields, "Бух.номер")) {
        toolsEditState.matchAccounting = updatedFields["Бух.номер"];
      }
      setToolsEditMessage("Изменения сохранены.", "success");
    } catch (error) {
      console.error(error);
      setToolsEditMessage("Не удалось сохранить изменения.", "error");
    } finally {
      toolsEditState.isSaving = false;
    }
  };

  const markToolsPendingMoveInStates = (toolsForPending = []) => {
    if (!Array.isArray(toolsForPending) || !toolsForPending.length) return;
    const numbers = new Set();
    const accountingNumbers = new Set();
    toolsForPending.forEach((tool) => {
      const number = String(tool?.["Номер"] ?? "").trim();
      const accounting = String(tool?.["Бух.номер"] ?? "").trim();
      if (number) numbers.add(number);
      if (accounting) accountingNumbers.add(accounting);
    });
    if (!numbers.size && !accountingNumbers.size) return;
    const hasPendingMatch = (tool) => {
      const number = String(tool?.["Номер"] ?? "").trim();
      const accounting = String(tool?.["Бух.номер"] ?? "").trim();
      return (number && numbers.has(number)) || (accounting && accountingNumbers.has(accounting));
    };
    toolsState.tools = toolsState.tools.map((tool) =>
      hasPendingMatch(tool)
        ? {
            ...tool,
            __pendingMove: true,
          }
        : tool
    );
    toolsState.toolMap = new Map(
      toolsState.tools.map((tool) => [tool.__selectionId, tool])
    );
    if (Array.isArray(writeOffState?.tools) && writeOffState.tools.length) {
      writeOffState.tools = writeOffState.tools.map((tool) =>
        hasPendingMatch(tool)
          ? {
              ...tool,
              __pendingMove: true,
            }
          : tool
      );
      writeOffState.toolMap = new Map(
        writeOffState.tools.map((tool) => [tool.__selectionId, tool])
      );
      if (Array.isArray(writeOffState.filtered) && writeOffState.filtered.length) {
        writeOffState.filtered = writeOffState.filtered.map((tool) =>
          hasPendingMatch(tool)
            ? {
                ...tool,
                __pendingMove: true,
              }
            : tool
        );
      }
    }
  };

  const saveToolsEditChanges = async () => {
    if (toolsEditState.isSaving) return;
    const tool = toolsEditState.tool;
    if (!tool) return;
    const orgFolder = toolsEditState.orgFolder;
    if (!orgFolder) {
      setToolsEditMessage("Не удалось определить организацию.", "error");
      return;
    }
    toolsEditState.isSaving = true;
    setToolsEditMessage("Сохраняем изменения...", "info");

    if (toolsEditState.accountingOnly) {
      const accountingNumber = String(toolsEditAccountingInput?.value ?? "").trim();
      if (!accountingNumber) {
        setToolsEditMessage("Введите бух.номер.", "error");
        toolsEditAccountingInput?.focus();
        toolsEditState.isSaving = false;
        return;
      }
      await saveToolsEditFields({ "Бух.номер": accountingNumber });
      return;
    }

    const kitItems = collectToolsEditKitItems();
    const invalidKitItem = kitItems.find(({ item }) => !item["Наименование"]);
    if (invalidKitItem?.nameInput) {
      setToolsEditMessage(
        "Для позиции комплектации заполните наименование.",
        "error"
      );
      invalidKitItem.nameInput.focus();
      toolsEditState.isSaving = false;
      return;
    }

    const updatedFields = {
      "Бух.номер": String(toolsEditAccountingInput?.value ?? "").trim(),
      "Наименование": String(toolsEditNameInput?.value ?? "").trim(),
      "Производитель": String(toolsEditManufacturerInput?.value ?? "").trim(),
      "Модель": String(toolsEditModelInput?.value ?? "").trim(),
      "Наименование по бухгалтерии": String(
        toolsEditAccountingNameInput?.value ?? ""
      ).trim(),
      "Серийный номер": String(toolsEditSerialInput?.value ?? "").trim(),
      "Граппа инструментов": "",
      "Комплектация": kitItems.map(({ item }) => item),
    };
    if (!toolsEditState.groupOptions.length) {
      setToolsEditMessage("В организации нет групп инструментов.", "error");
      toolsEditGroupInput?.focus();
      toolsEditState.isSaving = false;
      return;
    }
    const groupName = findOptionMatch(
      toolsEditGroupInput?.value ?? "",
      toolsEditState.groupOptions
    );
    if (!groupName) {
      setToolsEditMessage("Выберите группу инструментов из списка.", "error");
      toolsEditGroupInput?.focus();
      toolsEditState.isSaving = false;
      return;
    }
    updatedFields["Граппа инструментов"] = groupName;
    await saveToolsEditFields(updatedFields);
  };

  const handleToolsEditDelete = async () => {
    if (toolsEditState.isSaving) return;
    const tool = toolsEditState.tool;
    if (!tool) return;
    const orgFolder = toolsEditState.orgFolder;
    if (!orgFolder) {
      setToolsEditMessage("Не удалось определить организацию.", "error");
      return;
    }
    const confirmDelete = window.confirm(
      "Удалить инструмент из базы? Он будет перенесён в «Списания» как удаление."
    );
    if (!confirmDelete) return;
    toolsEditState.isSaving = true;
    setToolsEditMessage("Удаляем инструмент...", "info");

    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    const writeOffPath = `./${orgFolder}/Списания.json`;
    const deleteDate = formatDateValue(new Date());
    const deleteUser = String(user?.full_name ?? "").trim();
    let toolsPayloadRaw = [];
    try {
      toolsPayloadRaw = await loadJson(toolsPath);
    } catch (error) {
      toolsPayloadRaw = [];
    }
    const toolsNormalized = normalizeCollectionPayload(toolsPayloadRaw, "tools");
    const matcher = buildToolsEditMatcher({
      "Номер": toolsEditState.matchNumber,
      "Бух.номер": toolsEditState.matchAccounting,
    });
    const removedTool = toolsNormalized.items.find(matcher);
    if (!removedTool) {
      setToolsEditMessage("Инструмент не найден в базе.", "error");
      toolsEditState.isSaving = false;
      return;
    }
    const updatedTools = toolsNormalized.items.filter((entry) => !matcher(entry));
    const updatedToolsPayload = toolsNormalized.wrapper
      ? { ...toolsNormalized.wrapper, [toolsNormalized.key]: updatedTools }
      : updatedTools;

    let writeOffRaw = [];
    try {
      writeOffRaw = await loadJson(writeOffPath);
    } catch (error) {
      writeOffRaw = [];
    }
    const writeOffNormalized = normalizeCollectionPayload(writeOffRaw, "items");
    const deleteEntry = {
      ...removedTool,
      "Тип списания": "Удаление",
      "Удалил": deleteUser,
      "Дата удаления": deleteDate,
    };
    const updatedWriteOff = [...writeOffNormalized.items, deleteEntry];
    const updatedWriteOffPayload = writeOffNormalized.wrapper
      ? { ...writeOffNormalized.wrapper, [writeOffNormalized.key]: updatedWriteOff }
      : updatedWriteOff;

    try {
      await saveEntries([
        { path: toolsPath, data: updatedToolsPayload, user },
        { path: writeOffPath, data: updatedWriteOffPayload, user },
      ]);
      toolsState.tools = toolsState.tools.filter((entry) => !matcher(entry));
      toolsState.toolMap = new Map(
        toolsState.tools.map((entry) => [entry.__selectionId, entry])
      );
      applyToolsFilters();
      setToolsEditMessage("Инструмент удалён.", "success");
      setTimeout(() => {
        closeToolsEditModal();
      }, 400);
    } catch (error) {
      console.error(error);
      setToolsEditMessage("Не удалось удалить инструмент.", "error");
    } finally {
      toolsEditState.isSaving = false;
    }
  };

  const handleToolsEditPhotoUpload = async (files) => {
    const tool = toolsEditState.tool;
    if (!tool || !files.length) return;
    const orgFolder = toolsEditState.orgFolder;
    if (!orgFolder) {
      setToolsEditMessage("Не удалось определить организацию.", "error");
      return;
    }
    const toolNumber = String(tool?.["Номер"] ?? "").trim();
    if (!toolNumber) {
      setToolsEditMessage("У инструмента нет номера для фото.", "error");
      return;
    }
    setToolsEditMessage("Загружаем фото...", "info");
    try {
      const tools = await loadToolsData(orgFolder);
      const normalized = normalizeToolNumberValue(toolNumber);
      const toolIndex = tools.findIndex(
        (entry) =>
          normalizeToolNumberValue(entry?.["Номер"] ?? "") === normalized
      );
      if (toolIndex < 0) {
        setToolsEditMessage("Инструмент не найден в базе.", "error");
        return;
      }
      const entries = [];
      for (const file of files) {
        const safeName = buildAddPhotoFileName(toolNumber, file);
        const content = await readFileAsBase64(file);
        entries.push({
          type: "file",
          path: `${orgFolder}/Фото инструментов/${safeName}`,
          content,
          encoding: "base64",
          mime: file.type || "image/*",
          ...buildUploadUserMeta({ organizationName: context.orgFullName }),
        });
      }
      await uploadPhotoEntriesInBatches(entries);
