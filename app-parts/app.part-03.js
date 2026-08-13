    removePhotoBackdropEl.addEventListener("click", closeRemovePhotoModal);
  }
  if (removePhotoCloseButton) {
    removePhotoCloseButton.addEventListener("click", closeRemovePhotoModal);
  }
  removePhotoModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeRemovePhotoModal();
    }
  });
  if (removePhotoBackButton) {
    removePhotoBackButton.addEventListener("click", () => {
      if (toolsModalEl && !toolsModalEl.classList.contains("is-hidden") && toolsState.mode === "remove-photo") {
        closeRemovePhotoModal({ keepBodyLocked: true });
        resetRemovePhotoSelection();
        return;
      }
      setRemovePhotoView("list");
      resetRemovePhotoSelection();
    });
  }
  if (removePhotoSearchInput) {
    removePhotoSearchInput.addEventListener("input", (event) => {
      removePhotoState.search = String(event.target.value ?? "").toLowerCase();
      applyRemovePhotoFilters();
    });
  }
  if (removePhotoListEl) {
    removePhotoListEl.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-photo-select]");
      if (!button) return;
      const toolId = button.dataset.removePhotoToolId;
      if (!toolId) return;
      const tool = removePhotoState.toolMap.get(toolId);
      openRemovePhotoTool(tool);
    });
    removePhotoListEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target.closest("[data-remove-photo-select]");
      if (!target) return;
      event.preventDefault();
      const toolId = target.dataset.removePhotoToolId;
      if (!toolId) return;
      const tool = removePhotoState.toolMap.get(toolId);
      openRemovePhotoTool(tool);
    });
  }
  if (removePhotoDeleteButton) {
    removePhotoDeleteButton.addEventListener("click", handleRemovePhotoDelete);
  }
  const setBreakdownsSubtitle = (text) => {
    if (breakdownsSubtitleEl) {
      breakdownsSubtitleEl.textContent = text;
    }
  };

  const setBreakdownsMessage = (text = "", tone = "") => {
    if (!breakdownsMessageEl) return;
    breakdownsMessageEl.textContent = text;
    breakdownsMessageEl.classList.remove("is-error", "is-success", "is-info");
    if (tone) {
      breakdownsMessageEl.classList.add(`is-${tone}`);
    }
  };

  const setRepairSubtitle = (text) => {
    if (repairSubtitleEl) {
      repairSubtitleEl.textContent = text;
    }
  };

  const setRepairMessage = (text = "", tone = "") => {
    if (!repairMessageEl) return;
    repairMessageEl.textContent = text;
    repairMessageEl.classList.remove("is-error", "is-success", "is-info");
    if (tone) {
      repairMessageEl.classList.add(`is-${tone}`);
    }
  };

  const setRepairFormMessage = (text = "", tone = "") => {
    if (!repairFormMessageEl) return;
    repairFormMessageEl.textContent = text;
    repairFormMessageEl.classList.remove("is-error", "is-success", "is-info");
    if (tone) {
      repairFormMessageEl.classList.add(`is-${tone}`);
    }
  };

  const clearRepairFormFieldErrors = () => {
    repairFormEl
      ?.querySelectorAll(".form-field.is-invalid")
      .forEach((field) => field.classList.remove("is-invalid"));
  };

  const markRepairFormFieldError = (target) => {
    const field = target?.closest?.(".form-field");
    if (field) {
      field.classList.add("is-invalid");
    }
  };

  const setBreakdownFormMessage = (text = "", tone = "") => {
    if (!breakdownFormMessageEl) return;
    breakdownFormMessageEl.textContent = text;
    breakdownFormMessageEl.classList.remove("is-error", "is-success", "is-info");
    if (tone) {
      breakdownFormMessageEl.classList.add(`is-${tone}`);
    }
  };

  const setBreakdownStatusMessage = (text = "", tone = "") => {
    if (!breakdownStatusMessageEl) return;
    breakdownStatusMessageEl.textContent = text;
    breakdownStatusMessageEl.classList.remove(
      "is-error",
      "is-success",
      "is-info"
    );
    if (tone) {
      breakdownStatusMessageEl.classList.add(`is-${tone}`);
    }
  };

  const clearBreakdownPhotoPreview = () => {
    if (!breakdownPhotoPreviewEl) return;
    breakdownPhotoPreviewEl.querySelectorAll("img").forEach((img) => {
      const url = img.dataset.objectUrl;
      if (url) {
        URL.revokeObjectURL(url);
      }
    });
    breakdownPhotoPreviewEl.innerHTML = "";
  };

  const updateBreakdownPhotoPreview = () => {
    if (!breakdownPhotoPreviewEl) return;
    clearBreakdownPhotoPreview();
    if (breakdownPhotoCountEl) {
      breakdownPhotoCountEl.textContent = String(breakdownsState.photos.length);
    }
    breakdownsState.photos.forEach((file, index) => {
      const item = document.createElement("div");
      item.className = "breakdown-photo-item";

      const img = document.createElement("img");
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      img.alt = "Фото поломки";
      img.dataset.objectUrl = objectUrl;
      item.appendChild(img);

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "breakdown-photo-remove";
      removeButton.textContent = "×";
      removeButton.setAttribute("aria-label", "Удалить фото");
      removeButton.addEventListener("click", () => {
        breakdownsState.photos.splice(index, 1);
        updateBreakdownPhotoPreview();
      });
      item.appendChild(removeButton);
      breakdownPhotoPreviewEl.appendChild(item);
    });
  };

  const buildBreakdownPhotoFileName = (toolNumber, dateValue, file) => {
    const rawNumber = String(toolNumber ?? "").trim() || "без_номера";
    const nameParts = String(file?.name ?? "").split(".");
    const nameExtension =
      nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
    let extension = nameExtension;
    if (!extension && file?.type) {
      const typeParts = file.type.split("/");
      extension = typeParts[typeParts.length - 1] ?? "";
    }
    const safeExtension = extension || "jpg";
    const suffix = buildRandomSuffix(2);
    const baseName = `${rawNumber}_${dateValue}_${suffix}.${safeExtension}`;
    return sanitizePhotoFileName(baseName);
  };

  let breakdownCameraStream = null;
  let breakdownCameraBlob = null;

  const resetBreakdownCameraUI = () => {
    if (breakdownCameraVideoEl) {
      breakdownCameraVideoEl.classList.remove("is-hidden");
    }
    if (breakdownCameraCanvasEl) {
      breakdownCameraCanvasEl.classList.add("is-hidden");
    }
    breakdownCameraCaptureButton?.classList.remove("is-hidden");
    breakdownCameraRetakeButton?.classList.add("is-hidden");
    breakdownCameraSaveButton?.classList.add("is-hidden");
    breakdownCameraBlob = null;
  };

  const stopBreakdownCameraStream = () => {
    if (breakdownCameraStream) {
      breakdownCameraStream.getTracks().forEach((track) => track.stop());
      breakdownCameraStream = null;
    }
    if (breakdownCameraVideoEl) {
      breakdownCameraVideoEl.srcObject = null;
    }
  };

  const openBreakdownCameraModal = async () => {
    if (!breakdownCameraModalEl) return false;
    breakdownCameraModalEl.classList.remove("is-hidden");
    resetBreakdownCameraUI();
    try {
      breakdownCameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (breakdownCameraVideoEl) {
        breakdownCameraVideoEl.srcObject = breakdownCameraStream;
        await breakdownCameraVideoEl.play();
      }
      return true;
    } catch (error) {
      console.warn("Не удалось открыть камеру для поломки.", error);
      stopBreakdownCameraStream();
      breakdownCameraModalEl.classList.add("is-hidden");
      return false;
    }
  };

  const closeBreakdownCameraModal = () => {
    if (!breakdownCameraModalEl) return;
    breakdownCameraModalEl.classList.add("is-hidden");
    stopBreakdownCameraStream();
    resetBreakdownCameraUI();
  };

  const captureBreakdownCameraFrame = () => {
    if (!breakdownCameraVideoEl || !breakdownCameraCanvasEl) return;
    const width = breakdownCameraVideoEl.videoWidth;
    const height = breakdownCameraVideoEl.videoHeight;
    if (!width || !height) return;
    breakdownCameraCanvasEl.width = width;
    breakdownCameraCanvasEl.height = height;
    const context = breakdownCameraCanvasEl.getContext("2d");
    if (!context) return;
    context.drawImage(breakdownCameraVideoEl, 0, 0, width, height);
    breakdownCameraCanvasEl.classList.remove("is-hidden");
    breakdownCameraVideoEl.classList.add("is-hidden");
    breakdownCameraCaptureButton?.classList.add("is-hidden");
    breakdownCameraRetakeButton?.classList.remove("is-hidden");
    breakdownCameraSaveButton?.classList.remove("is-hidden");
    breakdownCameraCanvasEl.toBlob(
      (blob) => {
        breakdownCameraBlob = blob;
      },
      "image/jpeg",
      0.92
    );
  };

  const applyBreakdownCameraSnapshot = () => {
    if (!breakdownCameraBlob) return;
    const fileName = `breakdown_${Date.now()}.jpg`;
    const photoFile = new File([breakdownCameraBlob], fileName, {
      type: breakdownCameraBlob.type || "image/jpeg",
    });
    breakdownsState.photos.push(photoFile);
    updateBreakdownPhotoPreview();
    closeBreakdownCameraModal();
  };

  let repairCameraStream = null;
  let repairCameraBlob = null;

  const resetRepairCameraUI = () => {
    if (repairCameraVideoEl) {
      repairCameraVideoEl.classList.remove("is-hidden");
    }
    if (repairCameraCanvasEl) {
      repairCameraCanvasEl.classList.add("is-hidden");
    }
    repairCameraCaptureButton?.classList.remove("is-hidden");
    repairCameraRetakeButton?.classList.add("is-hidden");
    repairCameraSaveButton?.classList.add("is-hidden");
    repairCameraBlob = null;
  };

  const stopRepairCameraStream = () => {
    if (repairCameraStream) {
      repairCameraStream.getTracks().forEach((track) => track.stop());
      repairCameraStream = null;
    }
    if (repairCameraVideoEl) {
      repairCameraVideoEl.srcObject = null;
    }
  };

  const openRepairCameraModal = async () => {
    if (!repairCameraModalEl) return false;
    repairCameraModalEl.classList.remove("is-hidden");
    resetRepairCameraUI();
    try {
      repairCameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (repairCameraVideoEl) {
        repairCameraVideoEl.srcObject = repairCameraStream;
        await repairCameraVideoEl.play();
      }
      return true;
    } catch (error) {
      console.warn("Не удалось открыть камеру для акта ремонта.", error);
      stopRepairCameraStream();
      repairCameraModalEl.classList.add("is-hidden");
      return false;
    }
  };

  const closeRepairCameraModal = () => {
    if (!repairCameraModalEl) return;
    repairCameraModalEl.classList.add("is-hidden");
    stopRepairCameraStream();
    resetRepairCameraUI();
  };

  const captureRepairCameraFrame = () => {
    if (!repairCameraVideoEl || !repairCameraCanvasEl) return;
    const width = repairCameraVideoEl.videoWidth;
    const height = repairCameraVideoEl.videoHeight;
    if (!width || !height) return;
    repairCameraCanvasEl.width = width;
    repairCameraCanvasEl.height = height;
    const context = repairCameraCanvasEl.getContext("2d");
    if (!context) return;
    context.drawImage(repairCameraVideoEl, 0, 0, width, height);
    repairCameraCanvasEl.classList.remove("is-hidden");
    repairCameraVideoEl.classList.add("is-hidden");
    repairCameraCaptureButton?.classList.add("is-hidden");
    repairCameraRetakeButton?.classList.remove("is-hidden");
    repairCameraSaveButton?.classList.remove("is-hidden");
    repairCameraCanvasEl.toBlob(
      (blob) => {
        repairCameraBlob = blob;
      },
      "image/jpeg",
      0.92
    );
  };

  const applyRepairCameraSnapshot = () => {
    if (!repairCameraBlob) return;
    const fileName = `repair_act_${Date.now()}.jpg`;
    const photoFile = new File([repairCameraBlob], fileName, {
      type: repairCameraBlob.type || "image/jpeg",
    });
    if (repairActPhotoInput instanceof HTMLInputElement) {
      const transfer = new DataTransfer();
      transfer.items.add(photoFile);
      repairActPhotoInput.files = transfer.files;
    }
    if (repairActInput instanceof HTMLInputElement) {
      repairActInput.value = "";
    }
    updateRepairActPickerState();
    closeRepairCameraModal();
  };

  const isBreakdownStatusBlocked = (tool) => {
    const tone = tool?.__statusTone ?? resolveToolStatusTone(tool);
    return tone === "repair" || tone === "writeoff";
  };

  const isRepairSelectionBlocked = (tool) => {
    const tone = tool?.__statusTone ?? resolveToolStatusTone(tool);
    return tone === "writeoff";
  };

  const isRepairSendBlocked = (tool) => {
    const tone = tool?.__statusTone ?? resolveToolStatusTone(tool);
    return tone === "repair" || tone === "writeoff";
  };

  const isRepairCompletionAllowed = (tool) => {
    const tone = tool?.__statusTone ?? resolveToolStatusTone(tool);
    return tone === "repair";
  };

  const normalizeBreakdownToolStatusLabel = (rawStatus, movingNow = false) => {
    if (movingNow) return "Перемещается";
    const normalized = String(rawStatus ?? "").trim().toLocaleLowerCase("ru");
    if (!normalized) return "—";
    if (normalized === "рабочий") return "Исправный";
    if (normalized === "в процессе перемещения") return "Перемещается";
    return String(rawStatus ?? "").trim();
  };

  const buildBreakdownToolInfoFields = (tool, options = {}) => {
    const { includeStatus = true } = options;
    const number = resolveToolNumberValue(tool);
    const name = String(tool?.["Наименование"] ?? "").trim();
    const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
    const toolCost = normalizeCostValue(tool?.["Стоимость"]);
    const purchaseDate = String(tool?.["Дата покупки"] ?? "").trim();
    const responsible = String(tool?.["Ответственный"] ?? "").trim();
    const objectName = String(tool?.["Объект"] ?? "").trim();
    const status = normalizeBreakdownToolStatusLabel(
      tool?.["Статус"],
      Boolean(tool?.__pendingMove)
    );
    return [
      { label: "Номер", value: number || "—" },
      { label: "Бухгалтерский номер", value: accountingNumber || "—" },
      { label: "Наименование", value: name || "—" },
      {
        label: "Стоимость",
        value:
          toolCost === null
            ? "—"
            : `${formatNotificationCostWithoutCurrency(toolCost)} р.`,
      },
      { label: "Дата покупки", value: purchaseDate || "—" },
      { label: "Ответственный", value: responsible || "—" },
      { label: "Объект", value: objectName || "—" },
      ...(includeStatus ? [{ label: "Статус", value: status || "—" }] : []),
    ];
  };

  const renderBreakdownToolInfoFields = (toolMetaElement, tool, options = {}) => {
    if (!toolMetaElement) return;
    const fields = buildBreakdownToolInfoFields(tool, options)
      .filter((field) => objectTrackingEnabled || !isObjectRelatedLabel(field.label));
    toolMetaElement.innerHTML = fields
      .map(
        (field) =>
          `<div class="breakdown-tool-field"><div class="breakdown-tool-field__label">${escapeHtml(
            field.label
          )}</div><div class="breakdown-tool-field__value">${escapeHtml(
            field.value
          )}</div></div>`
      )
      .join("");
  };

  const renderBreakdownStatusInfoFields = (infoMetaElement, entry) => {
    if (!infoMetaElement) return;
    const fields = entry
      ? [
          { label: "Дата поломки", value: entry?.["Дата поломки"] || "—" },
          {
            label: "Описание поломки",
            value: entry?.["Описание поломки"] || "—",
          },
          {
            label: "Кто отметил поломку",
            value: entry?.["Пользователь, который пометил поломку"] || "—",
          },
        ]
      : [
          {
            label: "Статус",
            value: "Данные о поломке не найдены.",
          },
        ];
    infoMetaElement.innerHTML = fields
      .map(
        (field) =>
          `<div class="breakdown-tool-field"><div class="breakdown-tool-field__label">${escapeHtml(
            field.label
          )}</div><div class="breakdown-tool-field__value">${escapeHtml(
            field.value
          )}</div></div>`
      )
      .join("");
  };

  const renderBreakdownsTable = (items) => {
    const table = document.createElement("div");
    table.className = "tools-table";

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
      if (
        normalized === "в процессе перемещения" ||
        normalized === "перемещается"
      ) {
        return "#2563eb";
      }
      return "";
    };
    const appendResponsibleValue = (container, valueText) => {
      const normalized = String(valueText ?? "").trim() || "не указан";
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
      container.textContent = normalized;
    };

    items.forEach((tool, moveIndex) => {
      const isBlocked = isBreakdownStatusBlocked(tool);
      const row = document.createElement("div");
      row.className = "tools-table__row";
      row.classList.toggle("tools-item--pending-response", tool.__pendingMove);
      row.dataset.breakdownsToolId = tool.__breakdownId;
      row.dataset.breakdownsSelect = tool.__breakdownId;
      row.classList.toggle("is-disabled", isBlocked);
      row.setAttribute("role", "button");
      if (isBlocked) {
        row.setAttribute("aria-disabled", "true");
      } else {
        row.tabIndex = 0;
      }
      applyToolStatusClasses(row, tool);

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
      const accountingLine = accountingNumber ? accountingNumber : "Нет";
      const normalizedCostLine = formatSearchCostValue(tool?.["Стоимость"]);
      const accountingCostLineParts = [accountingLine, normalizedCostLine].filter(Boolean);
      const accountingCostLine = accountingCostLineParts.join(" / ");
      const metaLines = [manufacturerModelLine, accountingCostLine].filter(Boolean);
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
          } else {
            lineEl.textContent = line;
          }
          meta.appendChild(lineEl);
        });
      }
      const responsibleLine = document.createElement("div");
      const responsibleValue = document.createElement("span");
      appendResponsibleValue(
        responsibleValue,
        String(tool?.["Ответственный"] ?? "").trim() || "не указан"
      );
      responsibleLine.append(responsibleValue);
      meta.appendChild(responsibleLine);

      const isMovingNow = Boolean(tool?.__pendingMove);
      const status = String(tool?.["Статус"] ?? "").trim();
      const statusText = normalizeToolStatusLabel(status, isMovingNow);
      const statusLine = document.createElement("div");
      const statusValue = document.createElement("span");
      statusValue.textContent = statusText;
      statusValue.style.fontWeight = "700";
      statusValue.style.textDecoration = "none";
      statusValue.style.color = getStatusAccentColor(statusText);
      statusLine.append(statusValue);
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
      infoCell.append(title, meta);

      const photoCell = document.createElement("div");
      photoCell.className = "tools-table__cell tools-table__cell--thumb";
      const thumb = document.createElement("div");
      thumb.className = "tools-table__thumb";
      const img = document.createElement("img");
      img.className = "tools-table__thumb-image";
      img.alt = name || "Инструмент";
      const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
      const hasPhoto = Number.isFinite(photoCount) && photoCount > 0;
      row.classList.toggle("tools-table__row--no-photo", !hasPhoto);
      applyToolPhotoWithFallback({
        img,
        orgFolder: breakdownsState.orgFolder,
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

      row.classList.add("tools-table__row--search");
      row.append(numberCell, infoCell, photoCell);
      table.appendChild(row);
    });
    return table;
  };

  const syncBreakdownsViewButtons = () => {
    breakdownsViewButtons.forEach((button) => {
      const view = button.dataset.breakdownsView;
      const isActive = view === breakdownsState.view;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  const syncBreakdownsSortToggle = () => {
    if (!breakdownsSortToggle) return;
    const isDesc = breakdownsState.sortDirection === "desc";
    breakdownsSortToggle.setAttribute(
      "aria-label",
      `Сортировка по номеру инструмента: ${isDesc ? "по убыванию" : "по возрастанию"}`
    );
    breakdownsSortToggle.title = `Сортировка по номеру инструмента: ${
      isDesc ? "по убыванию" : "по возрастанию"
    }`;
    const icon = breakdownsSortToggle.querySelector(".tools-sort-toggle__icon");
    if (icon) {
      icon.classList.toggle("is-desc", isDesc);
      icon.classList.toggle("is-asc", !isDesc);
    }
  };

  const syncBreakdownsBrokenOnlyToggle = () => {
    if (!breakdownsBrokenOnlyToggle) return;
    const isPressed = Boolean(breakdownsState.brokenOnly);
    breakdownsBrokenOnlyToggle.classList.toggle("is-active", isPressed);
    breakdownsBrokenOnlyToggle.setAttribute("aria-pressed", isPressed ? "true" : "false");
    const label = isPressed
      ? "Показаны только инструменты со статусом Сломан"
      : "Показать только инструменты со статусом Сломан";
    breakdownsBrokenOnlyToggle.setAttribute("aria-label", label);
    breakdownsBrokenOnlyToggle.setAttribute(
      "title",
      isPressed ? "Показаны только сломанные" : "Только сломанные"
    );
  };

  const setBreakdownsFiltersOpened = (opened) => {
    breakdownsState.filtersOpened = Boolean(opened);
    breakdownsFiltersPanel?.classList.toggle("is-open", breakdownsState.filtersOpened);
    breakdownsFilterActionsEl?.classList.toggle("is-open", breakdownsState.filtersOpened);
    if (breakdownsFiltersToggle) {
      breakdownsFiltersToggle.setAttribute(
        "aria-expanded",
        breakdownsState.filtersOpened ? "true" : "false"
      );
    }
  };

  const getBreakdownsFilterAllValues = (containerEl) => {
    if (!containerEl) return [];
    return Array.from(
      containerEl.querySelectorAll('input[type="checkbox"][data-breakdowns-filter-checkbox]')
    )
      .map((checkboxEl) => String(checkboxEl.value ?? "").trim())
      .filter(Boolean);
  };

  const getBreakdownsStatusLabel = (value) => {
    const normalized = String(value ?? "").trim();
    return normalized === "Рабочий" ? "Исправный" : normalized;
  };

  const renderBreakdownsFilterTriggerLabel = (containerEl, selectedValues) => {
    if (!containerEl) return;
    const triggerEl = containerEl.querySelector("[data-breakdowns-filter-trigger]");
    if (!triggerEl) return;
    const key = String(containerEl.dataset.breakdownsFilter ?? "").trim();
    const safeValues = Array.isArray(selectedValues) ? selectedValues : [];
    const totalOptions = getBreakdownsFilterAllValues(containerEl).length;
    const isAllSelected = totalOptions > 0 && safeValues.length === totalOptions;
    const displayValues =
      key === "photo"
        ? safeValues.map((value) => (value === "with" ? "С фото" : "Без фото"))
        : key === "status"
          ? safeValues.map((value) => getBreakdownsStatusLabel(value))
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

  const syncBreakdownsFilterSelectAllButton = (containerEl) => {
    if (!containerEl) return;
    const clearEl = containerEl.querySelector("[data-breakdowns-filter-clear]");
    if (!clearEl) return;
    const allValues = getBreakdownsFilterAllValues(containerEl);
    const checkedCount = containerEl.querySelectorAll(
      'input[type="checkbox"][data-breakdowns-filter-checkbox]:checked'
    ).length;
    const isAllSelected = allValues.length > 0 && checkedCount === allValues.length;
    clearEl.textContent = isAllSelected ? "Отменить всё" : "Выбрать всё";
  };

  const syncBreakdownsFilterValue = (key, values) => {
    const selectedValues = Array.isArray(values) ? values : [];
    const containerEl = contentEl.querySelector(
      `.tools-filter-dropdown[data-breakdowns-filter="${key}"]`
    );
    if (!containerEl) return;
    containerEl
      .querySelectorAll('input[type="checkbox"][data-breakdowns-filter-checkbox]')
      .forEach((checkboxEl) => {
        checkboxEl.checked = selectedValues.includes(String(checkboxEl.value ?? "").trim());
      });
    renderBreakdownsFilterTriggerLabel(containerEl, selectedValues);
    syncBreakdownsFilterSelectAllButton(containerEl);
  };

  const countAppliedBreakdownsFilters = () =>
    Object.values(breakdownsState.filters).reduce((total, value) => {
      return total + (Array.isArray(value) ? value.length : 0);
    }, 0);

  const updateBreakdownsFiltersUi = () => {
    const appliedCount = countAppliedBreakdownsFilters();
    if (breakdownsFiltersToggle) {
      breakdownsFiltersToggle.classList.toggle("is-active", appliedCount > 0);
    }
    breakdownsFiltersStatusEls.forEach((statusEl) => {
      statusEl.textContent = appliedCount > 0 ? `Фильтры: ${appliedCount} выбр.` : "Фильтры не выбраны";
      statusEl.classList.toggle("is-active", appliedCount > 0);
    });
    breakdownsFiltersResetEls.forEach((resetEl) => {
      resetEl.classList.toggle("is-hidden", appliedCount === 0);
    });
  };

  const setBreakdownsGroupingMenuOpen = (opened) => {
    const isOpen = Boolean(opened);
    breakdownsGroupingMenu?.classList.toggle("is-hidden", !isOpen);
    breakdownsGroupingDropdown?.classList.toggle("is-open", isOpen);
    breakdownsGroupingToggle?.setAttribute("aria-expanded", isOpen ? "true" : "false");
  };

  const syncBreakdownsGroupingUi = () => {
    breakdownsGroupingOptions.forEach((option) => {
      const isActive = option.dataset.breakdownsGroupingOption === breakdownsState.grouping;
      option.classList.toggle("is-active", isActive);
    });
    breakdownsGroupingToggle?.classList.toggle(
      "is-active",
      breakdownsState.grouping !== "none"
    );
  };

  const getBreakdownsGroupingValue = (tool) => {
    const grouping = breakdownsState.grouping;
    if (!tool || grouping === "none") return "";
    const normalizeGroupingStatusLabel = (rawStatus, movingNow = false) => {
      if (movingNow) return "Перемещается";
      const normalized = String(rawStatus ?? "").trim().toLocaleLowerCase("ru");
      if (!normalized) return "Не указан";
      if (normalized === "рабочий") return "Исправный";
      if (normalized === "ремонт") return "В ремонте";
      if (normalized === "в процессе перемещения") return "Перемещается";
      return String(rawStatus ?? "").trim();
    };
    if (grouping === "responsible") {
      return formatFullName(String(tool?.["Ответственный"] ?? "").trim()) || "Не назначен";
    }
    if (grouping === "object") {
      return objectTrackingEnabled
        ? String(tool?.["Объект"] ?? "").trim() || "Без объекта"
        : "";
    }
    if (grouping === "status") {
      return normalizeGroupingStatusLabel(tool?.["Статус"], Boolean(tool?.__pendingMove));
    }
    if (grouping === "name") {
      return String(tool?.["Наименование"] ?? "").trim() || "Без названия";
    }
    if (grouping === "group") {
      return String(tool?.["Граппа инструментов"] ?? "").trim() || "Без группы";
    }
    return "";
  };

  const buildGroupedBreakdowns = (items) => {
    if (breakdownsState.grouping === "none") {
      return [{ label: "", items }];
    }
    const grouped = new Map();
    items.forEach((tool) => {
      const label = getBreakdownsGroupingValue(tool);
      if (!grouped.has(label)) {
        grouped.set(label, []);
      }
      grouped.get(label).push(tool);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "ru", { sensitivity: "base" }))
      .map(([label, groupedItems]) => ({ label, items: groupedItems }));
  };

  const renderBreakdownsCards = (items) => {
    const fragment = document.createDocumentFragment();
    items.forEach((tool, index) => {
      const card = renderToolCard(tool, "large", breakdownsState.orgFolder, index, {
        disableWorkingStatusAccent: true,
      });
      const toolId = tool.__breakdownId;
      card.dataset.breakdownsToolId = toolId;
      card.dataset.breakdownsSelect = toolId;
      card.classList.add("tools-table__row--search");
      const isBlocked = isBreakdownStatusBlocked(tool);
      card.classList.toggle("is-disabled", isBlocked);
      card.setAttribute("role", "button");
      if (isBlocked) {
        card.setAttribute("aria-disabled", "true");
        card.removeAttribute("tabindex");
      } else {
        card.tabIndex = 0;
      }
      fragment.appendChild(card);
    });
    return fragment;
  };

  const renderBreakdownsList = () => {
    if (!breakdownsListEl) return;
    breakdownsListEl.innerHTML = "";
    breakdownsListEl.classList.toggle("is-table", breakdownsState.view === "table");
    breakdownsListEl.classList.toggle("is-large", breakdownsState.view === "large");

    const groupedItems = buildGroupedBreakdowns(breakdownsState.filtered);
    if (breakdownsState.view === "large") {
      groupedItems.forEach((group) => {
        if (breakdownsState.grouping !== "none") {
          breakdownsListEl.appendChild(buildToolsGroupTitle(group));
        }
        breakdownsListEl.appendChild(renderBreakdownsCards(group.items));
      });
    } else {
      groupedItems.forEach((group) => {
        if (breakdownsState.grouping !== "none") {
          breakdownsListEl.appendChild(buildToolsGroupTitle(group));
        }
        breakdownsListEl.appendChild(renderBreakdownsTable(group.items));
      });
    }
    if (breakdownsEmptyEl) {
      breakdownsEmptyEl.classList.toggle(
        "is-hidden",
        breakdownsState.filtered.length > 0
      );
    }
    const filteredBreakdownsCost = breakdownsState.filtered.reduce((sum, tool) => {
      const toolCost = normalizeCostValue(tool?.["Стоимость"]);
      return toolCost === null ? sum : sum + toolCost;
    }, 0);
    setBreakdownsSubtitle(
      `Показано ${breakdownsState.filtered.length} из ${breakdownsState.tools.length} · На сумму ${formatNotificationCostWithoutCurrency(filteredBreakdownsCost)} р.`
    );
  };

  const applyBreakdownsFilters = () => {
    const search = breakdownsState.search.trim();
    const tokens = search ? search.split(/\s+/).filter(Boolean) : [];
    const hasSelected = (key) =>
      Array.isArray(breakdownsState.filters[key]) && breakdownsState.filters[key].length > 0;
    const includesSelected = (key, rawValue) => {
      const normalized = String(rawValue ?? "").trim();
      return hasSelected(key) && breakdownsState.filters[key].includes(normalized);
    };
    breakdownsState.filtered = breakdownsState.tools
      .filter((tool) => {
        if (hasSelected("group") && !includesSelected("group", tool?.["Граппа инструментов"])) {
          return false;
        }
        if (objectTrackingEnabled && hasSelected("object") && !includesSelected("object", tool?.["Объект"])) {
          return false;
        }
        if (hasSelected("status") && !includesSelected("status", tool?.["Статус"])) {
          return false;
        }
        if (hasSelected("responsible") && !includesSelected("responsible", tool?.["Ответственный"])) {
          return false;
        }
        if (hasSelected("name") && !includesSelected("name", tool?.["Наименование"])) {
          return false;
        }
        if (hasSelected("manufacturer") && !includesSelected("manufacturer", tool?.["Производитель"])) {
          return false;
        }
        if (hasSelected("model") && !includesSelected("model", tool?.["Модель"])) {
          return false;
        }
        if (hasSelected("photo")) {
          const photoFilters = breakdownsState.filters.photo;
          const hasWith = photoFilters.includes("with");
          const hasWithout = photoFilters.includes("without");
          const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
          const hasPhoto = Number.isFinite(photoCount) && photoCount > 0;
          if (hasWith !== hasWithout) {
            if (hasWith && !hasPhoto) return false;
            if (hasWithout && hasPhoto) return false;
          }
          if (!hasWith && !hasWithout) {
            return false;
          }
        }
        if (breakdownsState.brokenOnly) {
          const normalizedStatus = String(tool?.["Статус"] ?? "")
            .trim()
            .toLocaleLowerCase("ru");
          if (normalizedStatus !== "сломан") {
            return false;
          }
        }
        if (!tokens.length) return true;
        const searchLine = tool.__searchLine ?? "";
        return tokens.every((token) => searchLine.includes(token));
      })
      .sort((a, b) => {
        const direction = breakdownsState.sortDirection === "asc" ? 1 : -1;
        return (
          resolveToolNumberValue(a).localeCompare(resolveToolNumberValue(b), "ru", {
            numeric: true,
            sensitivity: "base",
          }) * direction
        );
      });
    renderBreakdownsList();
    updateBreakdownsFiltersUi();
  };

  const renderRepairTable = (items) => {
    const table = document.createElement("div");
    table.className = "tools-table";
    const normalizeToolStatusLabel = (rawStatus, movingNow = false) => {
      if (movingNow) return "Перемещается";
      const normalized = String(rawStatus ?? "").trim().toLocaleLowerCase("ru");
      if (!normalized) return "не указан";
      if (normalized === "рабочий") return "Исправный";
      if (normalized === "ремонт") return "В ремонте";
      if (normalized === "в процессе перемещения") return "Перемещается";
      return String(rawStatus ?? "").trim();
    };
    const getStatusAccentColor = (rawStatus) => {
      const normalized = String(rawStatus ?? "").trim().toLocaleLowerCase("ru");
      if (normalized === "в ремонте" || normalized === "ремонт") return "#ea580c";
      if (normalized === "сломан") return "#eab308";
      if (normalized === "на списание") return "#dc2626";
      if (
        normalized === "в процессе перемещения" ||
        normalized === "перемещается"
      ) {
        return "#2563eb";
      }
      return "";
    };
    const appendResponsibleValue = (container, valueText) => {
      const normalized = String(valueText ?? "").trim() || "не указан";
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
      container.textContent = normalized;
    };

    items.forEach((tool, moveIndex) => {
      const isBlocked = isRepairSelectionBlocked(tool);
      const row = document.createElement("div");
      row.className = "tools-table__row";
      row.classList.toggle("tools-item--pending-response", tool.__pendingMove);
      row.dataset.repairToolId = tool.__repairId;
      row.setAttribute("role", "button");
      row.classList.toggle("is-disabled", isBlocked);
      if (isBlocked) {
        row.setAttribute("aria-disabled", "true");
      } else {
        row.tabIndex = 0;
      }
      applyToolStatusClasses(row, tool);

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
      const accountingLine = accountingNumber ? accountingNumber : "Нет";
      const normalizedCostLine = formatSearchCostValue(tool?.["Стоимость"]);
      const accountingCostLineParts = [accountingLine, normalizedCostLine].filter(Boolean);
      const accountingCostLine = accountingCostLineParts.join(" / ");
      const metaLines = [manufacturerModelLine, accountingCostLine].filter(Boolean);
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
          } else {
            lineEl.textContent = line;
          }
          meta.appendChild(lineEl);
        });
      }

      const responsibleLine = document.createElement("div");
      const responsibleValue = document.createElement("span");
      appendResponsibleValue(
        responsibleValue,
        String(tool?.["Ответственный"] ?? "").trim() || "не указан"
      );
      responsibleLine.append(responsibleValue);
      meta.appendChild(responsibleLine);

      const isMovingNow = Boolean(tool?.__pendingMove);
      const status = String(tool?.["Статус"] ?? "").trim();
      const statusText = normalizeToolStatusLabel(status, isMovingNow);
      const statusLine = document.createElement("div");
      const statusValue = document.createElement("span");
      statusValue.textContent = statusText;
      statusValue.style.fontWeight = "700";
      statusValue.style.textDecoration = "none";
      statusValue.style.color = getStatusAccentColor(statusText);
      statusLine.append(statusValue);
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
      infoCell.append(title, meta);

      const photoCell = document.createElement("div");
      photoCell.className = "tools-table__cell tools-table__cell--thumb";
      const thumb = document.createElement("div");
      thumb.className = "tools-table__thumb";
      const img = document.createElement("img");
      img.className = "tools-table__thumb-image";
      img.alt = name || "Инструмент";
      const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
      const hasPhoto = Number.isFinite(photoCount) && photoCount > 0;
      applyToolPhotoWithFallback({
        img,
        orgFolder: repairState.orgFolder,
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

      row.classList.add("tools-table__row--search");
      row.append(numberCell, infoCell, photoCell);
      table.appendChild(row);
    });
    return table;
  };

  const renderRepairList = () => {
    if (!repairListEl) return;
    repairListEl.innerHTML = "";
    repairListEl.appendChild(renderRepairTable(repairState.filtered));
    if (repairEmptyEl) {
      repairEmptyEl.classList.toggle("is-hidden", repairState.filtered.length > 0);
    }
    setRepairSubtitle(
      `Показано ${repairState.filtered.length} из ${repairState.tools.length}`
    );
  };

  const applyRepairFilters = () => {
    const search = repairState.search.trim();
    const tokens = search ? search.split(/\s+/).filter(Boolean) : [];
    repairState.filtered = repairState.tools.filter((tool) => {
      if (
        repairState.statusFilter &&
        String(tool?.["Статус"] ?? "").trim() !== repairState.statusFilter
      ) {
        return false;
      }
      if (!tokens.length) return true;
      const searchLine = tool.__searchLine ?? "";
      return tokens.every((token) => searchLine.includes(token));
    });
    renderRepairList();
  };

  const prepareRepairStatusFilter = () => {
    if (!repairStatusFilter) return;
    const values = new Set();
    repairState.tools.forEach((tool) => {
      const status = String(tool?.["Статус"] ?? "").trim();
      if (status) values.add(status);
    });
    const sortedValues = Array.from(values).sort((a, b) =>
      a.localeCompare(b, "ru", { numeric: true })
    );
    repairStatusFilter.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "Все";
    repairStatusFilter.appendChild(allOption);
    sortedValues.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      repairStatusFilter.appendChild(option);
    });
    if (repairState.statusFilter && !values.has(repairState.statusFilter)) {
      repairState.statusFilter = "";
    }
    repairStatusFilter.value = repairState.statusFilter;
  };

  const loadRepairTools = async () => {
    const orgFolder = context.orgFolderName ?? "";
    repairState.orgFolder = orgFolder;
    if (!orgFolder) {
      repairState.tools = [];
      repairState.filtered = [];
      setRepairSubtitle("Не удалось определить организацию.");
      renderRepairList();
      return;
    }
    const tools = await loadToolsData(orgFolder);
    const userName = normalizePersonName(user?.full_name ?? user?.fullName ?? "");
    const canManageAllTools = isEnergyLikeRole(user?.role);
    repairState.toolMap = new Map();
    repairState.tools = tools
      .filter((tool) => {
        if (canManageAllTools) return true;
        if (!userName) return true;
        return normalizePersonName(tool?.["Ответственный"] ?? "") === userName;
      })
      .map((tool, index) => {
        const enhanced = {
          ...tool,
          __searchLine: buildToolSearchLine(tool),
          __repairId: buildToolSelectionId(tool, index),
          __statusTone: resolveToolStatusTone(tool),
        };
        repairState.toolMap.set(enhanced.__repairId, enhanced);
        return enhanced;
      })
      .sort((a, b) =>
        String(resolveToolNumberValue(a) ?? "").localeCompare(
          String(resolveToolNumberValue(b) ?? ""),
          "ru",
          { numeric: true }
        )
      );
    prepareRepairStatusFilter();
    applyRepairFilters();
  };

  const loadRepairOrganizations = async () => {
    const orgFolder = repairState.orgFolder ?? context.orgFolderName ?? "";
    if (!orgFolder) {
      repairFormState.organizations = [];
      return;
    }
    const repairsPath = `./${orgFolder}/Ремонты.json`;
    const rawRepairs = await loadJson(repairsPath).catch(() => []);
    const repairs = Array.isArray(rawRepairs)
      ? rawRepairs
      : Array.isArray(rawRepairs?.repairs)
        ? rawRepairs.repairs
        : [];
    repairFormState.organizations = repairs
      .map((entry) => normalizeSuggestionValue(entry?.["Организация"] ?? ""))
      .filter(Boolean);
  };

  const fillBreakdownsFilterOptions = (key, values) => {
    const containerEl = contentEl.querySelector(
      `.tools-filter-dropdown[data-breakdowns-filter="${key}"]`
    );
    if (!containerEl) return;
    const optionsEl = containerEl.querySelector("[data-breakdowns-filter-options]");
    if (!optionsEl) return;
    const currentValues = Array.isArray(breakdownsState.filters[key])
      ? breakdownsState.filters[key]
      : [];
    const availableValues = values
      .map((entry) =>
        typeof entry === "object" && entry !== null
          ? {
              value: String(entry.value ?? "").trim(),
              label: String(entry.label ?? entry.value ?? "").trim(),
            }
          : { value: String(entry ?? "").trim(), label: String(entry ?? "").trim() }
      )
      .filter((entry) => entry.value);
    optionsEl.innerHTML = "";
    availableValues.forEach((entry, index) => {
      const id = `breakdowns-filter-${key}-${index}`;
      const optionLabelEl = document.createElement("label");
      optionLabelEl.className = "tools-filter-dropdown__option";
      optionLabelEl.setAttribute("for", id);
      const checkboxEl = document.createElement("input");
      checkboxEl.type = "checkbox";
      checkboxEl.id = id;
      checkboxEl.value = entry.value;
      checkboxEl.checked = currentValues.includes(entry.value);
      checkboxEl.dataset.breakdownsFilterCheckbox = key;
      const textEl = document.createElement("span");
      textEl.textContent = entry.label;
      optionLabelEl.append(checkboxEl, textEl);
      optionsEl.appendChild(optionLabelEl);
    });
    breakdownsState.filters[key] = currentValues.filter((value) =>
      availableValues.some((entry) => entry.value === value)
    );
    syncBreakdownsFilterValue(key, breakdownsState.filters[key]);
  };

  const prepareBreakdownsFilters = () => {
    const collectValues = (field) => {
      const set = new Set();
      breakdownsState.tools.forEach((tool) => {
        const value = String(tool?.[field] ?? "").trim();
        if (value) set.add(value);
      });
      return Array.from(set).sort((a, b) =>
        a.localeCompare(b, "ru", { numeric: true })
      );
    };

    fillBreakdownsFilterOptions("group", collectValues("Граппа инструментов"));
    fillBreakdownsFilterOptions("object", collectValues("Объект"));
    fillBreakdownsFilterOptions(
      "status",
      collectValues("Статус").map((value) => ({
        value,
        label: getBreakdownsStatusLabel(value),
      }))
    );
    fillBreakdownsFilterOptions("responsible", collectValues("Ответственный"));
    fillBreakdownsFilterOptions("name", collectValues("Наименование"));
    fillBreakdownsFilterOptions("manufacturer", collectValues("Производитель"));
    fillBreakdownsFilterOptions("model", collectValues("Модель"));

    fillBreakdownsFilterOptions("photo", [
      { value: "with", label: "С фото" },
      { value: "without", label: "Без фото" },
    ]);
    updateBreakdownsFiltersUi();
  };

  const loadBreakdownsTools = async () => {
    const orgFolder = context.orgFolderName ?? "";
    breakdownsState.orgFolder = orgFolder;
    if (!orgFolder) {
      breakdownsState.tools = [];
      breakdownsState.filtered = [];
      setBreakdownsSubtitle("Не удалось определить организацию.");
      renderBreakdownsList();
      return;
    }
    const tools = await loadToolsData(orgFolder);
    const userName = normalizePersonName(user?.full_name ?? user?.fullName ?? "");
    const canManageAllTools = isEnergyLikeRole(user?.role);
    const { pendingNumbers, pendingAccountingNumbers } =
      await loadPendingMoves(orgFolder);
    breakdownsState.toolMap = new Map();
    breakdownsState.tools = tools
      .filter((tool) => {
        if (canManageAllTools) return true;
        if (!userName) return true;
        return normalizePersonName(tool?.["Ответственный"] ?? "") === userName;
      })
      .map((tool, index) => {
        const number = String(tool?.["Номер"] ?? "").trim();
        const accounting = String(tool?.["Бух.номер"] ?? "").trim();
        const hasPendingMove =
          (number && pendingNumbers.has(number)) ||
          (accounting && pendingAccountingNumbers.has(accounting));
        const enhanced = {
          ...tool,
          __searchLine: buildToolSearchLine(tool),
          __breakdownId: buildToolSelectionId(tool, index),
          __pendingMove: hasPendingMove,
          __statusTone: resolveToolStatusTone(tool),
        };
        breakdownsState.toolMap.set(enhanced.__breakdownId, enhanced);
        return enhanced;
      })
      .sort((a, b) =>
        String(resolveToolNumberValue(a) ?? "").localeCompare(
          String(resolveToolNumberValue(b) ?? ""),
          "ru",
          { numeric: true }
        )
      );
    prepareBreakdownsFilters();
    applyBreakdownsFilters();
  };

  const resetBreakdownForm = () => {
    breakdownFormEl?.reset();
    breakdownsState.photos = [];
    breakdownsState.selectedTool = null;
    updateBreakdownPhotoPreview();
    setBreakdownFormMessage("");
  };

  const resetBreakdownStatusState = () => {
    breakdownsState.statusTool = null;
    breakdownsState.isStatusSaving = false;
    setBreakdownStatusMessage("");
  };

  const resetRepairForm = () => {
    repairFormEl?.reset();
    repairFormState.selectedTool = null;
    repairFormState.mode = "send";
    setRepairFormMessage("");
    if (repairActInput) {
      repairActInput.value = "";
    }
    if (repairActPhotoInput) {
      repairActPhotoInput.value = "";
    }
    if (repairFormCompleteSection) {
      repairFormCompleteSection
        .querySelectorAll(".form-file-option")
        .forEach((option) => option.classList.remove("is-filled"));
    }
  };

  const updateRepairActPickerState = () => {
    if (!repairFormCompleteSection) return;
    const fileOptions = repairFormCompleteSection.querySelectorAll(
      ".form-file-option"
    );
    fileOptions.forEach((option) => {
      const input = option.querySelector('input[type="file"]');
      const isFilled =
        input instanceof HTMLInputElement &&
        input.files &&
        input.files.length > 0;
      option.classList.toggle("is-filled", isFilled);
    });
    const isPhotoFilled =
      repairActPhotoInput instanceof HTMLInputElement &&
      repairActPhotoInput.files &&
      repairActPhotoInput.files.length > 0;
    const cameraButton = repairFormCompleteSection.querySelector(
      "[data-repair-camera-trigger]"
    );
    if (cameraButton) {
      cameraButton.classList.toggle("is-filled", isPhotoFilled);
    }
  };

  const resolveRepairActFile = () => {
    const photoFile =
      repairActPhotoInput instanceof HTMLInputElement &&
      repairActPhotoInput.files &&
      repairActPhotoInput.files.length > 0
        ? repairActPhotoInput.files[0]
        : null;
    if (photoFile) return photoFile;
    const file =
      repairActInput instanceof HTMLInputElement &&
      repairActInput.files &&
      repairActInput.files.length > 0
        ? repairActInput.files[0]
        : null;
    return file || null;
  };

  const setRepairFormMode = (mode) => {
    const resolvedMode = mode === "repaired" ? "repaired" : "send";
    repairFormState.mode = resolvedMode;
    repairFormSendSection?.classList.toggle(
      "is-hidden",
      resolvedMode !== "send"
    );
    repairFormCompleteSection?.classList.toggle(
      "is-hidden",
      resolvedMode !== "repaired"
    );
    repairInfoCardEl?.classList.toggle("is-hidden", resolvedMode !== "repaired");
    if (repairFormTitleEl) {
      repairFormTitleEl.textContent =
        resolvedMode === "repaired" ? "Возврат из ремонта" : "Отправка в ремонт";
    }
    if (repairFormSubtitleEl) {
      repairFormSubtitleEl.textContent =
        resolvedMode === "repaired"
          ? "Укажите стоимость и приложите акт"
          : "Проверьте данные инструмента";
    }
    if (repairFormSubmitButton) {
      repairFormSubmitButton.textContent =
        resolvedMode === "repaired" ? "Сохранить" : "Отправить в ремонт";
    }
    if (repairOrganizationInput) {
      repairOrganizationInput.required = resolvedMode === "send";
      repairOrganizationInput.disabled = resolvedMode !== "send";
    }
    if (repairDescriptionInput) {
      repairDescriptionInput.disabled = resolvedMode !== "send";
    }
    if (repairCostInput) {
      repairCostInput.disabled = resolvedMode !== "send";
    }
    if (repairFinalCostInput) {
      repairFinalCostInput.required = resolvedMode === "repaired";
      repairFinalCostInput.disabled = resolvedMode !== "repaired";
    }
    if (repairActInput) {
      repairActInput.disabled = resolvedMode !== "repaired";
    }
    if (repairActPhotoInput) {
      repairActPhotoInput.disabled = resolvedMode !== "repaired";
    }
  };

  const loadLatestRepairForTool = async (tool) => {
    const orgFolder = repairState.orgFolder ?? context.orgFolderName ?? "";
    if (!orgFolder || !tool) return null;
    const rawRepairs = await loadJson(`./${orgFolder}/Ремонты.json`).catch(() => []);
    const repairs = Array.isArray(rawRepairs)
      ? rawRepairs
      : Array.isArray(rawRepairs?.repairs)
        ? rawRepairs.repairs
        : [];
    if (!repairs.length) return null;
    const selectedNumber = normalizeToolNumberValue(tool?.["Номер"] ?? "");
    const selectedAccounting = String(tool?.["Бух.номер"] ?? "").trim();
    let matchedEntry = null;
    for (let index = repairs.length - 1; index >= 0; index -= 1) {
      const entry = repairs[index];
      const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
      const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
      const isMatched =
        (selectedNumber && entryNumber === selectedNumber) ||
        (selectedAccounting && entryAccounting === selectedAccounting);
      if (!isMatched) continue;
      matchedEntry = entry;
      if (!String(entry?.["Дата ремонта"] ?? "").trim()) {
        return entry;
      }
    }
    return matchedEntry;
  };

  const renderRepairInfoFields = (entry) => {
    if (!repairInfoMetaEl) return;
    const fields = entry
      ? [
          {
            label: "Дата поломки",
            value:
              entry?.["Дата поломки"] || entry?.["Дата отправки в ремонт"] || "—",
          },
          {
            label: "Описание поломки",
            value: entry?.["Предварительное описание ремонта"] || "—",
          },
          {
            label: "Кто отметил поломку",
            value: entry?.["Пользователь, который отправил в ремонт"] || "—",
          },
        ]
      : [
          {
            label: "Статус",
            value: "Данные о ремонте не найдены.",
          },
        ];
    repairInfoMetaEl.innerHTML = fields
      .map(
        (field) =>
          `<div class="breakdown-tool-field"><div class="breakdown-tool-field__label">${escapeHtml(
            field.label
          )}</div><div class="breakdown-tool-field__value">${escapeHtml(
            field.value
          )}</div></div>`
      )
      .join("");
  };

  const fillRepairToolInfo = async (tool) => {
    if (!tool) return;
    if (repairToolTitleEl) {
      repairToolTitleEl.textContent = "";
    }
    if (repairToolMetaEl) {
      renderBreakdownToolInfoFields(repairToolMetaEl, tool, { includeStatus: false });
    }
    if (repairInfoMetaEl) {
      renderRepairInfoFields(null);
    }
  };

  const openRepairFormModal = async (tool) => {
    if (!repairFormModalEl || !tool) return;
    resetRepairForm();
    repairFormState.selectedTool = tool;
    const mode = resolveToolStatusTone(tool) === "repair" ? "repaired" : "send";
    setRepairFormMode(mode);
    await fillRepairToolInfo(tool);
    if (mode === "send") {
      await loadRepairOrganizations();
    } else {
      const latestRepair = await loadLatestRepairForTool(tool);
      renderRepairInfoFields(latestRepair);
    }
    setRepairFormMessage("");
    updateRepairActPickerState();
    repairFormModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const closeRepairFormModal = () => {
    if (!repairFormModalEl) return;
    repairFormModalEl.classList.add("is-hidden");
    resetRepairForm();
    closeRepairCameraModal();
    if (repairModalEl && !repairModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const loadLatestBreakdownForTool = async (tool) => {
    const orgFolder = breakdownsState.orgFolder ?? "";
    if (!tool || !orgFolder) return null;
    const rawBreakdowns = await loadJson(`./${orgFolder}/Поломки.json`).catch(() => []);
    const breakdowns = Array.isArray(rawBreakdowns)
      ? rawBreakdowns
      : Array.isArray(rawBreakdowns?.breakdowns)
        ? rawBreakdowns.breakdowns
        : [];
    const matcher = buildToolsInfoMatcher(tool);
    const matched = breakdowns.filter(matcher);
    if (!matched.length) return null;
    const sorted = matched
      .map((entry, index) => ({
        entry,
        index,
        date: parseDateValue(entry?.["Дата поломки"]),
      }))
      .sort((a, b) => {
        const aTime = a.date ? a.date.getTime() : 0;
        const bTime = b.date ? b.date.getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;
        return b.index - a.index;
      });
    return sorted[0]?.entry ?? null;
  };

  const fillBreakdownStatusToolInfo = (tool) => {
    if (!tool) return;
    if (breakdownStatusSubtitleEl) {
      breakdownStatusSubtitleEl.textContent = "";
    }
    if (breakdownStatusToolTitleEl) {
      breakdownStatusToolTitleEl.textContent = "";
    }
    renderBreakdownToolInfoFields(breakdownStatusToolMetaEl, tool, { includeStatus: false });
    renderBreakdownStatusInfoFields(breakdownStatusInfoMetaEl, null);
  };

  const openBreakdownStatusModal = async (tool) => {
    if (!breakdownStatusModalEl || !tool) return;
    breakdownsState.statusTool = tool;
    fillBreakdownStatusToolInfo(tool);
    setBreakdownStatusMessage("");
    breakdownStatusModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    const latestBreakdown = await loadLatestBreakdownForTool(tool);
    if (breakdownsState.statusTool !== tool) return;
    renderBreakdownStatusInfoFields(breakdownStatusInfoMetaEl, latestBreakdown);
  };

  const closeBreakdownStatusModal = () => {
    if (!breakdownStatusModalEl) return;
    breakdownStatusModalEl.classList.add("is-hidden");
    resetBreakdownStatusState();
    if (breakdownsModalEl && !breakdownsModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const openBreakdownFormModal = (tool) => {
    if (!breakdownFormModalEl || !tool) return;
    breakdownsState.selectedTool = tool;
    breakdownsState.photos = [];
    updateBreakdownPhotoPreview();
    if (breakdownToolTitleEl) {
      breakdownToolTitleEl.textContent = "";
    }
    renderBreakdownToolInfoFields(breakdownToolMetaEl, tool);
    setBreakdownFormMessage("");
    breakdownFormModalEl.classList.remove("is-hidden");
    breakdownFormModalEl.classList.remove("is-input-focus");
    attachBreakdownViewportListeners();
    updateBreakdownKeyboardOffset();
    document.body.style.overflow = "hidden";
  };

  const closeBreakdownFormModal = () => {
    if (!breakdownFormModalEl) return;
    breakdownFormModalEl.classList.add("is-hidden");
    breakdownFormModalEl.classList.remove("is-input-focus");
    breakdownFormModalEl.style.removeProperty("--keyboard-offset");
    detachBreakdownViewportListeners();
    resetBreakdownForm();
    if (breakdownsModalEl && !breakdownsModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const applyBreakdownStatusRepaired = async () => {
    if (breakdownsState.isStatusSaving) return;
    const tool = breakdownsState.statusTool;
    if (!tool) {
      setBreakdownStatusMessage("Инструмент не выбран.", "error");
      return;
    }
    const orgFolder = breakdownsState.orgFolder ?? "";
    if (!orgFolder) {
      setBreakdownStatusMessage("Не удалось определить организацию.", "error");
      return;
    }
    breakdownsState.isStatusSaving = true;
    setBreakdownStatusMessage("Сохраняем данные...", "info");
    try {
      const toolsPath = `./${orgFolder}/База с инструментами.json`;
      const breakdownsPath = `./${orgFolder}/Поломки.json`;
      const [rawTools, rawBreakdowns] = await Promise.all([
        loadJson(toolsPath).catch(() => []),
        loadJson(breakdownsPath).catch(() => []),
      ]);
      const tools = normalizeToolsData(rawTools);
      const breakdowns = Array.isArray(rawBreakdowns)
        ? rawBreakdowns
        : Array.isArray(rawBreakdowns?.breakdowns)
          ? rawBreakdowns.breakdowns
          : [];
      const selectedNumber = normalizeToolNumberValue(tool?.["Номер"] ?? "");
      const selectedAccounting = String(tool?.["Бух.номер"] ?? "").trim();
      const toolIndex = tools.findIndex((entry) => {
        const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
        const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
        if (selectedNumber && entryNumber === selectedNumber) return true;
        if (selectedAccounting && entryAccounting === selectedAccounting) {
          return true;
        }
        return false;
      });
      if (toolIndex < 0) {
        setBreakdownStatusMessage("Инструмент не найден в базе.", "error");
        breakdownsState.isStatusSaving = false;
        return;
      }
      const dateValue = formatDateValue(new Date());
      const markerRaw = String(
        user?.full_name ?? user?.fullName ?? currentUser?.full_name ?? ""
      ).trim();
      const marker = markerRaw ? formatFullName(markerRaw) : "Пользователь";
      const updatedTools = [...tools];
      updatedTools[toolIndex] = {
        ...updatedTools[toolIndex],
        "Статус": "Рабочий",
      };
      const fixPayload = {
        "Дата ремонта": dateValue,
        "Пользователь, который пометил ремонт": marker,
      };
      const updatedBreakdowns = [...breakdowns];
      let breakdownIndex = -1;
      for (let index = updatedBreakdowns.length - 1; index >= 0; index -= 1) {
        const entry = updatedBreakdowns[index];
        const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
        const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
        if (selectedNumber && entryNumber === selectedNumber) {
          breakdownIndex = index;
          break;
        }
        if (selectedAccounting && entryAccounting === selectedAccounting) {
          breakdownIndex = index;
          break;
        }
      }
      if (breakdownIndex >= 0) {
        updatedBreakdowns[breakdownIndex] = {
          ...updatedBreakdowns[breakdownIndex],
          ...fixPayload,
        };
      } else {
        updatedBreakdowns.push({
          "Номер": String(tool?.["Номер"] ?? "").trim(),
          "Бух.номер": String(tool?.["Бух.номер"] ?? "").trim(),
          "Ответственный": String(tool?.["Ответственный"] ?? "").trim(),
          ...fixPayload,
        });
      }
      const meta = buildUploadUserMeta({ organizationName: context.orgFullName });
      await saveEntries([
        { path: toolsPath, data: updatedTools, ...meta },
        { path: breakdownsPath, data: updatedBreakdowns, ...meta },
      ]);
      syncToolStatusInStates(updatedTools[toolIndex], "Рабочий");
      await notifyFixBreakdown({
        tool: updatedTools[toolIndex],
        orgFolder,
        fixDate: dateValue,
        markedBy: marker,
      });
      setBreakdownStatusMessage("Статус обновлен.", "success");
      setTimeout(() => {
        closeBreakdownStatusModal();
      }, 500);
    } catch (error) {
      console.error(error);
      setBreakdownStatusMessage(
        "Не удалось сохранить изменения. Проверьте сервер.",
        "error"
      );
    } finally {
      breakdownsState.isStatusSaving = false;
    }
  };

  const applyBreakdownStatusWriteoff = async () => {
    if (breakdownsState.isStatusSaving) return;
    const tool = breakdownsState.statusTool;
    if (!tool) {
      setBreakdownStatusMessage("Инструмент не выбран.", "error");
      return;
    }
    const orgFolder = breakdownsState.orgFolder ?? "";
    if (!orgFolder) {
      setBreakdownStatusMessage("Не удалось определить организацию.", "error");
      return;
    }
    breakdownsState.isStatusSaving = true;
    setBreakdownStatusMessage("Сохраняем данные...", "info");
    try {
      const toolsPath = `./${orgFolder}/База с инструментами.json`;
      const writeOffPath = `./${orgFolder}/Списания.json`;
      const [rawTools, rawWriteOff] = await Promise.all([
        loadJson(toolsPath).catch(() => []),
        loadJson(writeOffPath).catch(() => []),
      ]);
      const tools = normalizeToolsData(rawTools);
      const selectedNumber = normalizeToolNumberValue(tool?.["Номер"] ?? "");
      const selectedAccounting = String(tool?.["Бух.номер"] ?? "").trim();
      const toolIndex = tools.findIndex((entry) => {
        const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
        const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
        if (selectedNumber && entryNumber === selectedNumber) return true;
        if (selectedAccounting && entryAccounting === selectedAccounting) {
          return true;
        }
        return false;
      });
      if (toolIndex < 0) {
        setBreakdownStatusMessage("Инструмент не найден в базе.", "error");
        breakdownsState.isStatusSaving = false;
        return;
      }
      const dateValue = formatDateValue(new Date());
      const markerRaw = String(
        user?.full_name ?? user?.fullName ?? currentUser?.full_name ?? ""
      ).trim();
      const marker = markerRaw ? formatFullName(markerRaw) : "Пользователь";
      const updatedTools = [...tools];
      updatedTools[toolIndex] = {
        ...updatedTools[toolIndex],
        "Статус": "На списание",
      };

      const baseWrapper =
        rawWriteOff && typeof rawWriteOff === "object" && !Array.isArray(rawWriteOff)
          ? { ...rawWriteOff }
          : {};
      const writeOffItems = Array.isArray(rawWriteOff)
        ? rawWriteOff
        : Array.isArray(rawWriteOff?.items)
          ? rawWriteOff.items
          : [];
      const pendingKey = "списокНаСписание";
      const pendingList = Array.isArray(baseWrapper[pendingKey])
        ? baseWrapper[pendingKey]
        : [];
      const pendingEntry = {
        "Номер": String(tool?.["Номер"] ?? "").trim(),
        "Бух.номер": String(tool?.["Бух.номер"] ?? "").trim(),
        "Ответственный": String(tool?.["Ответственный"] ?? "").trim(),
        "Дата постановки статуса \"На списание\"": dateValue,
        "Поставил статус": marker,
      };
      const pendingIndex = pendingList.findIndex((entry) => {
        const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
        const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
        if (selectedNumber && entryNumber === selectedNumber) return true;
        if (selectedAccounting && entryAccounting === selectedAccounting) {
          return true;
        }
        return false;
      });
      const updatedPending = [...pendingList];
      if (pendingIndex >= 0) {
        updatedPending[pendingIndex] = {
          ...updatedPending[pendingIndex],
          ...pendingEntry,
        };
      } else {
        updatedPending.push(pendingEntry);
      }
      const updatedWriteOffPayload = {
        ...baseWrapper,
        items: writeOffItems,
        [pendingKey]: updatedPending,
      };
      const meta = buildUploadUserMeta({ organizationName: context.orgFullName });
      await saveEntries([
        { path: toolsPath, data: updatedTools, ...meta },
        { path: writeOffPath, data: updatedWriteOffPayload, ...meta },
      ]);
      syncToolStatusInStates(updatedTools[toolIndex], "На списание");
      setBreakdownStatusMessage("Инструмент отправлен на списание.", "success");
      setTimeout(() => {
        closeBreakdownStatusModal();
      }, 500);
    } catch (error) {
      console.error(error);
      setBreakdownStatusMessage(
        "Не удалось сохранить изменения. Проверьте сервер.",
        "error"
      );
    } finally {
      breakdownsState.isStatusSaving = false;
    }
  };

  const handleBreakdownStatusAction = (action) => {
    if (action === "repaired") {
      void applyBreakdownStatusRepaired();
      return;
    }
    if (action === "writeoff") {
      void applyBreakdownStatusWriteoff();
      return;
    }
    if (action === "send-repair") {
      const tool = breakdownsState.statusTool;
      if (!tool) {
        setBreakdownStatusMessage("Инструмент не выбран.", "error");
        return;
      }
      repairState.orgFolder =
        breakdownsState.orgFolder ?? repairState.orgFolder ?? context.orgFolderName;
      closeBreakdownStatusModal();
      void openRepairFormModal(tool);
      return;
    }
    setBreakdownStatusMessage("Неизвестное действие.", "error");
  };

  const openRepairModal = async () => {
    if (!toolsModalEl) return;
    resetToolsTopZoneStability();
    toolsState.mode = "repair";
    toolsState.repairBrokenOnly = false;
    toolsState.repairInRepairOnly = false;
    toolsState.view = "table";
    toolsState.searchSortDirection = "desc";
    toolsState.activeReplacementResponsible = "";
    setToolsStatusStandaloneVisibility(false);
    setToolsTitle("Ремонт");
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

  const closeRepairModal = () => {
    if (!repairModalEl) return;
    repairModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
  };

  const openBreakdownsModal = async () => {
    if (!breakdownsModalEl) return;
    breakdownsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setBreakdownsSubtitle("Загружаем список...");
    setBreakdownsMessage("");
    const shouldOpenFiltersByDefault =
      typeof window === "undefined" ||
      !window.matchMedia ||
      !window.matchMedia("(max-width: 520px)").matches;
    setBreakdownsFiltersOpened(shouldOpenFiltersByDefault);
    syncBreakdownsViewButtons();
    syncBreakdownsSortToggle();
    await loadBreakdownsTools();
    if (
      breakdownsSearchInput &&
      (typeof window === "undefined" ||
        !window.matchMedia ||
        !window.matchMedia("(max-width: 520px)").matches)
    ) {
      breakdownsSearchInput.focus();
    }
  };

  const closeBreakdownsModal = () => {
    if (!breakdownsModalEl) return;
    breakdownsModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
  };

  const syncToolStatusInStates = (tool, status) => {
    if (!tool || !status) return;
    const number = normalizeToolNumberValue(tool?.["Номер"] ?? "");
    const accounting = String(tool?.["Бух.номер"] ?? "").trim();
    const updateTool = (entry) => {
      const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
      const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
      if (
        (number && entryNumber === number) ||
        (accounting && entryAccounting === accounting)
      ) {
        const updated = { ...entry, "Статус": status };
        updated.__statusTone = resolveToolStatusTone(updated);
        return updated;
      }
      return entry;
    };
    if (toolsState.tools.length) {
      toolsState.tools = toolsState.tools.map(updateTool);
      toolsState.filtered = toolsState.filtered.map(updateTool);
      if (toolsModalEl && !toolsModalEl.classList.contains("is-hidden")) {
        applyToolsFilters();
      }
    }
    breakdownsState.tools = breakdownsState.tools.map(updateTool);
    breakdownsState.filtered = breakdownsState.filtered.map(updateTool);
    breakdownsState.toolMap.forEach((value, key) => {
      const updated = updateTool(value);
      if (updated !== value) {
        breakdownsState.toolMap.set(key, updated);
      }
    });
    repairState.tools = repairState.tools.map(updateTool);
    repairState.filtered = repairState.filtered.map(updateTool);
    repairState.toolMap.forEach((value, key) => {
      const updated = updateTool(value);
      if (updated !== value) {
        repairState.toolMap.set(key, updated);
      }
    });
    prepareRepairStatusFilter();
    applyRepairFilters();
    prepareBreakdownsFilters();
    applyBreakdownsFilters();
  };

  const syncBrokenStatusInToolsState = (tool) => {
    syncToolStatusInStates(tool, "Сломан");
  };

  if (repairBackdropEl) {
    repairBackdropEl.addEventListener("click", closeRepairModal);
  }
  if (repairCloseButton) {
    repairCloseButton.addEventListener("click", closeRepairModal);
  }
  repairModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeRepairModal();
    }
  });
  if (repairSearchInput) {
    repairSearchInput.addEventListener("input", (event) => {
      repairState.search = String(event.target.value ?? "").toLowerCase();
      applyRepairFilters();
    });
  }
  if (repairStatusFilter) {
    repairStatusFilter.addEventListener("change", (event) => {
      repairState.statusFilter = String(event.target.value ?? "").trim();
      applyRepairFilters();
    });
  }
  if (repairListEl) {
    repairListEl.addEventListener("click", (event) => {
      const row = event.target.closest("[data-repair-tool-id]");
      if (!row) return;
      const toolId = row.dataset.repairToolId;
      if (!toolId) return;
      const tool = repairState.toolMap.get(toolId);
      if (!tool) return;
      if (isRepairSelectionBlocked(tool)) {
        setRepairMessage("Инструмент уже на списании.", "info");
        return;
      }
      openRepairFormModal(tool);
    });
    repairListEl.addEventListener("keydown", (event) => {
      if (!(event instanceof KeyboardEvent)) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      const row = event.target.closest("[data-repair-tool-id]");
      if (!row) return;
      event.preventDefault();
      row.click();
    });
  }
  if (repairFormBackdropEl) {
    repairFormBackdropEl.addEventListener("click", closeRepairFormModal);
  }
  if (repairFormCloseButton) {
    repairFormCloseButton.addEventListener("click", closeRepairFormModal);
  }
  if (repairFormCancelButton) {
    repairFormCancelButton.addEventListener("click", closeRepairFormModal);
  }
  repairFormModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeRepairFormModal();
    }
  });
  if (breakdownsBackdropEl) {
    breakdownsBackdropEl.addEventListener("click", closeBreakdownsModal);
  }
  if (breakdownsCloseButton) {
    breakdownsCloseButton.addEventListener("click", closeBreakdownsModal);
  }
  breakdownsModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeBreakdownsModal();
    }
  });
  if (breakdownsSearchInput) {
    breakdownsSearchInput.addEventListener("input", (event) => {
      breakdownsState.search = String(event.target.value ?? "").toLowerCase();
      applyBreakdownsFilters();
    });
  }
  const positionBreakdownsFilterMenu = (containerEl, menuEl) => {
    if (!containerEl || !menuEl || typeof window === "undefined") return;
    const triggerEl = containerEl.querySelector("[data-breakdowns-filter-trigger]");
    if (!triggerEl) return;
    const triggerRect = triggerEl.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const top = Math.max(8, Math.round(triggerRect.bottom + 6));
    const maxHeight = Math.max(180, Math.floor(viewportHeight - top - 12));
    menuEl.style.top = `${top}px`;
    menuEl.style.maxHeight = `${maxHeight}px`;
  };

  breakdownsFilterEls.forEach((containerEl) => {
    const key = String(containerEl.dataset.breakdownsFilter ?? "").trim();
    if (!key) return;
    const triggerEl = containerEl.querySelector("[data-breakdowns-filter-trigger]");
    const menuEl = containerEl.querySelector("[data-breakdowns-filter-menu]");
    const clearEl = containerEl.querySelector("[data-breakdowns-filter-clear]");
    if (!triggerEl || !menuEl) return;
    triggerEl.addEventListener("click", () => {
      const shouldOpen = menuEl.classList.contains("is-hidden");
      breakdownsFilterEls.forEach((itemEl) => {
        itemEl.classList.remove("is-open");
        itemEl.querySelector("[data-breakdowns-filter-menu]")?.classList.add("is-hidden");
      });
      containerEl.classList.toggle("is-open", shouldOpen);
      menuEl.classList.toggle("is-hidden", !shouldOpen);
      if (shouldOpen) {
        positionBreakdownsFilterMenu(containerEl, menuEl);
      }
    });
    menuEl.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.matches('input[type="checkbox"][data-breakdowns-filter-checkbox]')) return;
      const selectedValues = Array.from(
        containerEl.querySelectorAll(
          'input[type="checkbox"][data-breakdowns-filter-checkbox]:checked'
        )
      )
        .map((checkboxEl) => String(checkboxEl.value ?? "").trim())
        .filter(Boolean);
      breakdownsState.filters[key] = selectedValues;
      syncBreakdownsFilterValue(key, selectedValues);
      applyBreakdownsFilters();
    });
    if (clearEl) {
      clearEl.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const allValues = getBreakdownsFilterAllValues(containerEl);
        const selectedValues = Array.isArray(breakdownsState.filters[key])
          ? breakdownsState.filters[key]
          : [];
        const shouldClear = allValues.length > 0 && selectedValues.length === allValues.length;
        breakdownsState.filters[key] = shouldClear ? [] : [...allValues];
        syncBreakdownsFilterValue(key, breakdownsState.filters[key]);
        applyBreakdownsFilters();
      });
    }
  });
  breakdownsFiltersResetEls.forEach((buttonEl) => {
    buttonEl.addEventListener("click", () => {
      Object.keys(breakdownsState.filters).forEach((key) => {
        breakdownsState.filters[key] = [];
        syncBreakdownsFilterValue(key, []);
      });
      applyBreakdownsFilters();
    });
  });
  if (breakdownsViewButtons.length) {
    breakdownsViewButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const nextView = button.dataset.breakdownsView === "large" ? "large" : "table";
        if (breakdownsState.view === nextView) return;
        breakdownsState.view = nextView;
        syncBreakdownsViewButtons();
        renderBreakdownsList();
      });
    });
  }
  if (breakdownsSortToggle) {
    breakdownsSortToggle.addEventListener("click", () => {
      breakdownsState.sortDirection =
        breakdownsState.sortDirection === "desc" ? "asc" : "desc";
      syncBreakdownsSortToggle();
      applyBreakdownsFilters();
    });
  }
  if (breakdownsBrokenOnlyToggle) {
    breakdownsBrokenOnlyToggle.addEventListener("click", () => {
      breakdownsState.brokenOnly = !breakdownsState.brokenOnly;
      syncBreakdownsBrokenOnlyToggle();
      applyBreakdownsFilters();
    });
  }
  if (breakdownsFiltersToggle) {
    breakdownsFiltersToggle.addEventListener("click", () => {
      setBreakdownsFiltersOpened(!breakdownsState.filtersOpened);
    });
  }
  if (typeof window !== "undefined" && breakdownsFiltersPanel) {
    const mediaQuery = window.matchMedia("(max-width: 520px)");
    const syncBreakdownsFiltersVisibility = () => {
      setBreakdownsFiltersOpened(!mediaQuery.matches);
    };
    syncBreakdownsFiltersVisibility();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", syncBreakdownsFiltersVisibility);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(syncBreakdownsFiltersVisibility);
    }
  }
  if (typeof document !== "undefined") {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest(".tools-filter-dropdown[data-breakdowns-filter]")) return;
      breakdownsFilterEls.forEach((containerEl) => {
        containerEl.classList.remove("is-open");
        containerEl
          .querySelector("[data-breakdowns-filter-menu]")
          ?.classList.add("is-hidden");
      });
    });
  }

  if (typeof window !== "undefined") {
    const refreshOpenBreakdownsFilterMenus = () => {
      breakdownsFilterEls.forEach((containerEl) => {
        if (!containerEl.classList.contains("is-open")) return;
        const menuEl = containerEl.querySelector("[data-breakdowns-filter-menu]");
        positionBreakdownsFilterMenu(containerEl, menuEl);
      });
    };
    window.addEventListener("resize", refreshOpenBreakdownsFilterMenus);
    breakdownsFiltersPanel?.addEventListener("scroll", refreshOpenBreakdownsFilterMenus, {
      passive: true,
    });
  }
  if (breakdownsGroupingToggle) {
    breakdownsGroupingToggle.addEventListener("click", () => {
      const isOpen = !breakdownsGroupingMenu?.classList.contains("is-hidden");
      setBreakdownsGroupingMenuOpen(!isOpen);
    });
  }

  breakdownsGroupingOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const grouping = String(option.dataset.breakdownsGroupingOption ?? "").trim();
      if (!objectTrackingEnabled && grouping === "object") {
        setBreakdownsGroupingMenuOpen(false);
        return;
      }
      if (!grouping || grouping === breakdownsState.grouping) {
        setBreakdownsGroupingMenuOpen(false);
        return;
      }
      breakdownsState.grouping = grouping;
      syncBreakdownsGroupingUi();
      setBreakdownsGroupingMenuOpen(false);
      renderBreakdownsList();
    });
  });
  syncBreakdownsGroupingUi();
  syncBreakdownsBrokenOnlyToggle();
  if (breakdownsListEl) {
    breakdownsListEl.addEventListener("click", (event) => {
      const row = event.target.closest("[data-breakdowns-select]");
      if (!row) return;
      const toolId = row.dataset.breakdownsSelect;
      if (!toolId) return;
      const tool = breakdownsState.toolMap.get(toolId);
      if (!tool) return;
      const tone = tool?.__statusTone ?? resolveToolStatusTone(tool);
      if (tone === "broken") {
        openBreakdownStatusModal(tool);
        return;
      }
      if (isBreakdownStatusBlocked(tool)) {
        setBreakdownsMessage("Инструмент уже в ремонте или на списании.", "info");
        return;
      }
      openBreakdownFormModal(tool);
    });
    breakdownsListEl.addEventListener("keydown", (event) => {
      if (!(event instanceof KeyboardEvent)) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      const row = event.target.closest("[data-breakdowns-select]");
      if (!row) return;
      event.preventDefault();
      row.click();
    });
  }
  if (breakdownStatusBackdropEl) {
    breakdownStatusBackdropEl.addEventListener("click", closeBreakdownStatusModal);
  }
  if (breakdownStatusCloseButton) {
    breakdownStatusCloseButton.addEventListener("click", closeBreakdownStatusModal);
  }
  if (breakdownStatusCancelButton) {
    breakdownStatusCancelButton.addEventListener(
      "click",
      closeBreakdownStatusModal
    );
  }
  breakdownStatusModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeBreakdownStatusModal();
    }
  });
  if (breakdownStatusActionButtons.length) {
    breakdownStatusActionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.breakdownStatusAction ?? "";
        handleBreakdownStatusAction(action);
      });
    });
  }
  if (breakdownFormBackdropEl) {
    breakdownFormBackdropEl.addEventListener("click", closeBreakdownFormModal);
  }
  if (breakdownFormCloseButton) {
    breakdownFormCloseButton.addEventListener("click", closeBreakdownFormModal);
  }
  if (breakdownFormCancelButton) {
    breakdownFormCancelButton.addEventListener("click", closeBreakdownFormModal);
  }
  if (breakdownPhotoInput) {
    breakdownPhotoInput.addEventListener("change", (event) => {
      const files = Array.from(event.target.files ?? []);
      if (!files.length) return;
      breakdownsState.photos.push(...files);
      breakdownPhotoInput.value = "";
      updateBreakdownPhotoPreview();
    });
  }
  if (breakdownCameraTrigger) {
    breakdownCameraTrigger.addEventListener("click", async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setBreakdownFormMessage(
          "Камера недоступна. Выберите фото из галереи.",
          "info"
        );
        return;
      }
      const opened = await openBreakdownCameraModal();
      if (!opened) {
        setBreakdownFormMessage(
          "Камера недоступна. Выберите фото из галереи.",
          "info"
        );
      }
    });
  }
  if (breakdownCameraBackdropEl) {
    breakdownCameraBackdropEl.addEventListener(
      "click",
      closeBreakdownCameraModal
    );
  }
  if (breakdownCameraCloseButton) {
    breakdownCameraCloseButton.addEventListener(
      "click",
      closeBreakdownCameraModal
    );
  }
  if (breakdownCameraCancelButton) {
    breakdownCameraCancelButton.addEventListener(
      "click",
      closeBreakdownCameraModal
    );
  }
  if (breakdownCameraCaptureButton) {
    breakdownCameraCaptureButton.addEventListener(
      "click",
      captureBreakdownCameraFrame
    );
  }
  if (breakdownCameraRetakeButton) {
    breakdownCameraRetakeButton.addEventListener("click", () => {
      resetBreakdownCameraUI();
      breakdownCameraVideoEl?.play();
    });
  }
  if (breakdownCameraSaveButton) {
    breakdownCameraSaveButton.addEventListener(
      "click",
      applyBreakdownCameraSnapshot
    );
  }
  if (repairCameraTrigger) {
    repairCameraTrigger.addEventListener("click", async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setRepairFormMessage(
          "Камера недоступна. Прикрепите фото из галереи.",
          "info"
        );
        return;
      }
      const opened = await openRepairCameraModal();
      if (!opened) {
        setRepairFormMessage(
          "Камера недоступна. Прикрепите фото из галереи.",
          "info"
        );
      }
    });
  }
  if (repairCameraBackdropEl) {
    repairCameraBackdropEl.addEventListener("click", closeRepairCameraModal);
  }
  if (repairCameraCloseButton) {
    repairCameraCloseButton.addEventListener("click", closeRepairCameraModal);
  }
  if (repairCameraCancelButton) {
    repairCameraCancelButton.addEventListener("click", closeRepairCameraModal);
  }
  if (repairCameraCaptureButton) {
    repairCameraCaptureButton.addEventListener(
      "click",
      captureRepairCameraFrame
    );
  }
  if (repairCameraRetakeButton) {
    repairCameraRetakeButton.addEventListener("click", () => {
      resetRepairCameraUI();
      repairCameraVideoEl?.play();
    });
  }
  if (repairCameraSaveButton) {
    repairCameraSaveButton.addEventListener("click", applyRepairCameraSnapshot);
  }

  if (breakdownFormEl) {
    breakdownFormEl.noValidate = true;
    const scrollBreakdownInputIntoView = (target) => {
      const scrollContainer = breakdownFormBodyEl || breakdownFormModalEl;
      if (!scrollContainer || !(target instanceof HTMLElement)) return;
      const bodyRect = scrollContainer.getBoundingClientRect();
      const inputRect = target.getBoundingClientRect();
      const offset = 24;
      const nextTop =
        scrollContainer.scrollTop + (inputRect.top - bodyRect.top) - offset;
      scrollContainer.scrollTo({
        top: Math.max(nextTop, 0),
        behavior: "smooth",
      });
    };

    breakdownFormEl.addEventListener("focusin", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest("input, textarea, select")) return;
      breakdownFormModalEl?.classList.add("is-input-focus");
      updateBreakdownKeyboardOffset();
      scrollBreakdownInputIntoView(target);
      setTimeout(() => {
        updateBreakdownKeyboardOffset();
        scrollBreakdownInputIntoView(target);
      }, 150);
    });

    breakdownFormEl.addEventListener("focusout", () => {
      setTimeout(() => {
        if (!breakdownFormEl.contains(document.activeElement)) {
          breakdownFormModalEl?.classList.remove("is-input-focus");
          breakdownFormModalEl?.style.removeProperty("--keyboard-offset");
        }
      }, 0);
    });

    breakdownFormEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (breakdownsState.isSaving) {
        setBreakdownFormMessage("Сохранение уже выполняется. Подождите…", "info");
        return;
      }
      const tool = breakdownsState.selectedTool;
      if (!tool) {
        setBreakdownFormMessage("Инструмент не выбран.", "error");
        return;
      }
      if (isBreakdownStatusBlocked(tool)) {
        const status = String(tool?.["Статус"] ?? "").trim().toLowerCase();
        const message =
          status === "сломан"
            ? "Инструмент уже сломан."
            : "Нельзя пометить сломанным: инструмент уже в ремонте или на списании.";
        setBreakdownFormMessage(message, "error");
        return;
      }
      const description = String(breakdownDescriptionInput?.value ?? "").trim();
      if (!description) {
        setBreakdownFormMessage("Введите описание поломки.", "error");
        breakdownDescriptionInput?.focus();
        return;
      }
      const orgFolder = breakdownsState.orgFolder ?? "";
      if (!orgFolder) {
        setBreakdownFormMessage("Не удалось определить организацию.", "error");
        return;
      }
      breakdownsState.isSaving = true;
      setBreakdownFormMessage("Сохраняем данные...", "info");
      try {
        const toolsPath = `./${orgFolder}/База с инструментами.json`;
        const breakdownsPath = `./${orgFolder}/Поломки.json`;
        const [rawTools, rawBreakdowns] = await Promise.all([
          loadJson(toolsPath).catch(() => []),
          loadJson(breakdownsPath).catch(() => []),
        ]);
        const tools = normalizeToolsData(rawTools);
        const breakdowns = Array.isArray(rawBreakdowns)
          ? rawBreakdowns
          : Array.isArray(rawBreakdowns?.breakdowns)
            ? rawBreakdowns.breakdowns
            : [];
        const selectedNumber = normalizeToolNumberValue(tool?.["Номер"] ?? "");
        const selectedAccounting = String(tool?.["Бух.номер"] ?? "").trim();
        const toolIndex = tools.findIndex((entry) => {
          const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
          const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
          if (selectedNumber && entryNumber === selectedNumber) return true;
          if (selectedAccounting && entryAccounting === selectedAccounting) {
            return true;
          }
          return false;
        });
        if (toolIndex < 0) {
          setBreakdownFormMessage("Инструмент не найден в базе.", "error");
          breakdownsState.isSaving = false;
          return;
        }

        const dateValue = formatDateValue(new Date());
        const markerRaw = String(
          user?.full_name ?? user?.fullName ?? currentUser?.full_name ?? ""
        ).trim();
        const marker = markerRaw ? formatFullName(markerRaw) : "Пользователь";
        const updatedTools = [...tools];
        updatedTools[toolIndex] = {
          ...updatedTools[toolIndex],
          "Статус": "Сломан",
        };
        const breakdownEntry = {
          "Номер": String(tool?.["Номер"] ?? "").trim(),
          "Бух.номер": String(tool?.["Бух.номер"] ?? "").trim(),
          "Серийный номер": String(tool?.["Серийный номер"] ?? "").trim(),
          "Дата поломки": dateValue,
          "Описание поломки": description,
          "Ответственный": String(tool?.["Ответственный"] ?? "").trim(),
          "Пользователь, который пометил поломку": marker,
        };
        const updatedBreakdowns = [...breakdowns, breakdownEntry];
        const meta = buildUploadUserMeta({ organizationName: context.orgFullName });
        await saveEntries([
          { path: toolsPath, data: updatedTools, ...meta },
          { path: breakdownsPath, data: updatedBreakdowns, ...meta },
        ]);

        const breakdownPhotoNames = [];
        if (breakdownsState.photos.length) {
          setBreakdownFormMessage("Загружаем фото...", "info");
          const photoEntries = [];
          for (const file of breakdownsState.photos) {
            const safeName = buildBreakdownPhotoFileName(
              tool?.["Номер"] ?? "",
              dateValue,
              file
            );
            breakdownPhotoNames.push(safeName);
            const content = await readFileAsBase64(file);
            photoEntries.push({
              type: "file",
              path: `${orgFolder}/Фото поломок/${safeName}`,
              content,
              encoding: "base64",
              mime: file.type || "image/*",
              ...meta,
            });
          }
          await uploadPhotoEntriesInBatches(photoEntries, {
            onBatch: (currentBatch, totalBatches) => {
              setBreakdownFormMessage(
                `Загружаем фото (${currentBatch}/${totalBatches})...`,
                "info"
              );
            },
          });
        }

        await notifyToolBreakdown({
          tool: updatedTools[toolIndex],
          orgFolder,
          breakdownDate: dateValue,
          description,
          markedBy: marker,
          breakdownPhotos: breakdownPhotoNames,
        });

        syncBrokenStatusInToolsState(tool);
        setBreakdownsMessage("Поломка сохранена.", "success");
        closeBreakdownFormModal();
        await loadBreakdownsTools();
      } catch (error) {
        console.error(error);
        const reason =
          error instanceof Error && error.message
            ? `Причина: ${error.message}`
            : "Проверьте сервер.";
        setBreakdownFormMessage(`Не удалось сохранить. ${reason}`, "error");
      } finally {
        breakdownsState.isSaving = false;
      }
    });
  }

  if (repairFormEl) {
    repairFormEl.noValidate = true;
    const scrollRepairInputIntoView = (target) => {
      const scrollContainer = repairFormBodyEl || repairFormModalEl;
      if (!scrollContainer || !(target instanceof HTMLElement)) return;
      const bodyRect = scrollContainer.getBoundingClientRect();
      const inputRect = target.getBoundingClientRect();
      const offset = 24;
      const nextTop =
        scrollContainer.scrollTop + (inputRect.top - bodyRect.top) - offset;
      scrollContainer.scrollTo({
        top: Math.max(nextTop, 0),
        behavior: "smooth",
      });
    };

    repairFormEl.addEventListener("focusin", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest("input, textarea, select")) return;
      repairFormModalEl?.classList.add("is-input-focus");
      scrollRepairInputIntoView(target);
      setTimeout(() => {
        scrollRepairInputIntoView(target);
      }, 150);
    });

    repairFormEl.addEventListener("focusout", () => {
      setTimeout(() => {
        if (!repairFormEl.contains(document.activeElement)) {
          repairFormModalEl?.classList.remove("is-input-focus");
          repairFormModalEl?.style.removeProperty("--keyboard-offset");
        }
      }, 0);
    });

    if (repairActInput) {
      repairActInput.addEventListener("change", () => {
        if (repairActPhotoInput) {
          repairActPhotoInput.value = "";
        }
        updateRepairActPickerState();
      });
    }
    if (repairActPhotoInput) {
      repairActPhotoInput.addEventListener("change", () => {
        if (repairActInput) {
          repairActInput.value = "";
        }
        updateRepairActPickerState();
      });
    }

    repairFormEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (repairFormState.isSaving) {
        setRepairFormMessage("Сохранение уже выполняется. Подождите…", "info");
        return;
      }
      const tool = repairFormState.selectedTool;
      if (!tool) {
        setRepairFormMessage("Инструмент не выбран.", "error");
        return;
      }
      clearRepairFormFieldErrors();
      const orgFolder = repairState.orgFolder ?? "";
      if (!orgFolder) {
        setRepairFormMessage("Не удалось определить организацию.", "error");
        return;
      }
      const mode = repairFormState.mode ?? "send";
      if (mode === "send") {
        if (isRepairSendBlocked(tool)) {
          setRepairFormMessage(
            "Инструмент уже в ремонте или на списании.",
            "info"
          );
          return;
        }
        const organization = String(repairOrganizationInput?.value ?? "").trim();
        if (!organization) {
          setRepairFormMessage("Выберите организацию.", "error");
          repairOrganizationInput?.focus();
          markRepairFormFieldError(repairOrganizationInput);
          return;
        }
      } else if (!isRepairCompletionAllowed(tool)) {
        setRepairFormMessage("Инструмент не в ремонте.", "error");
        return;
      }
      const description = String(repairDescriptionInput?.value ?? "").trim();
      const cost = String(repairCostInput?.value ?? "").trim();
      const finalCostValue = normalizeCostValue(repairFinalCostInput?.value ?? "");
      const actFile = mode === "repaired" ? resolveRepairActFile() : null;
      if (mode === "repaired") {
        if (finalCostValue === null) {
          setRepairFormMessage("Введите корректную стоимость ремонта.", "error");
          repairFinalCostInput?.focus();
          markRepairFormFieldError(repairFinalCostInput);
          return;
        }
        if (!actFile) {
          setRepairFormMessage("Прикрепите акт ремонта.", "error");
          markRepairFormFieldError(
            repairActPhotoInput || repairActInput || repairFinalCostInput
          );
          return;
        }
      }
      repairFormState.isSaving = true;
      setRepairFormMessage("Сохраняем данные...", "info");
      try {
        const toolsPath = `./${orgFolder}/База с инструментами.json`;
        const repairsPath = `./${orgFolder}/Ремонты.json`;
        const [rawTools, rawRepairs] = await Promise.all([
          loadJson(toolsPath).catch(() => []),
          loadJson(repairsPath).catch(() => []),
        ]);
        const tools = normalizeToolsData(rawTools);
        const repairs = Array.isArray(rawRepairs)
          ? rawRepairs
          : Array.isArray(rawRepairs?.repairs)
            ? rawRepairs.repairs
            : [];
        const selectedNumber = normalizeToolNumberValue(tool?.["Номер"] ?? "");
        const selectedAccounting = String(tool?.["Бух.номер"] ?? "").trim();
        const toolIndex = tools.findIndex((entry) => {
          const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
          const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
          if (selectedNumber && entryNumber === selectedNumber) return true;
          if (selectedAccounting && entryAccounting === selectedAccounting) {
            return true;
          }
          return false;
        });
        if (toolIndex < 0) {
          setRepairFormMessage("Инструмент не найден в базе.", "error");
          repairFormState.isSaving = false;
          return;
        }
        const dateValue = formatDateValue(new Date());
        const markerRaw = String(
          user?.full_name ?? user?.fullName ?? currentUser?.full_name ?? ""
        ).trim();
        const marker = markerRaw ? formatFullName(markerRaw) : "Пользователь";
        const updatedTools = [...tools];
        if (mode === "repaired") {
          updatedTools[toolIndex] = {
            ...updatedTools[toolIndex],
            "Статус": "Рабочий",
          };
          const repairPayload = {
            "Стоимость ремонта": finalCostValue,
            "Дата ремонта": dateValue,
            "Пользователь, который вернул из ремонта": marker,
          };
          const updatedRepairs = [...repairs];
          let repairIndex = -1;
          for (let index = updatedRepairs.length - 1; index >= 0; index -= 1) {
            const entry = updatedRepairs[index];
            const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
            const entryAccounting = String(entry?.["Бух.номер"] ?? "").trim();
            if (selectedNumber && entryNumber === selectedNumber) {
              repairIndex = index;
              break;
            }
            if (selectedAccounting && entryAccounting === selectedAccounting) {
              repairIndex = index;
              break;
            }
          }
          if (repairIndex >= 0) {
            updatedRepairs[repairIndex] = {
              ...updatedRepairs[repairIndex],
              ...repairPayload,
            };
          } else {
            updatedRepairs.push({
              "Номер": String(tool?.["Номер"] ?? "").trim(),
              "Бух.номер": String(tool?.["Бух.номер"] ?? "").trim(),
              "Ответственный": String(tool?.["Ответственный"] ?? "").trim(),
              ...repairPayload,
            });
          }
          const actName = buildRepairActFileName(
            resolveToolNumberValue(tool) || "акт",
            dateValue,
            actFile?.name ?? ""
          );
          const actContent = await readFileAsBase64(actFile);
          const meta = buildUploadUserMeta({
            organizationName: context.orgFullName,
          });
          await saveEntriesViaEndpoint([
            {
              type: "file",
              path: `${orgFolder}/Акты ремонтов/${actName}`,
              content: actContent,
              encoding: "base64",
              mime: actFile?.type || "application/octet-stream",
              ...meta,
            },
            { path: toolsPath, data: updatedTools, ...meta },
            { path: repairsPath, data: updatedRepairs, ...meta },
          ]);
          const actFileUrl = buildRepairActUrl(orgFolder, actName);
          await notifyRepaired({
            tool: updatedTools[toolIndex],
            orgFolder,
            repairDate: dateValue,
            repairCost: finalCostValue,
            repairedBy: marker,
            actFileUrl,
          });
          syncToolStatusInStates(updatedTools[toolIndex], "Рабочий");
          setRepairMessage("Инструмент отремонтирован.", "success");
        } else {
          const organization = String(repairOrganizationInput?.value ?? "").trim();
          updatedTools[toolIndex] = {
            ...updatedTools[toolIndex],
            "Статус": "В ремонте",
          };
          const repairEntry = {
            "Номер": String(tool?.["Номер"] ?? "").trim(),
            "Бух.номер": String(tool?.["Бух.номер"] ?? "").trim(),
            "Ответственный": String(tool?.["Ответственный"] ?? "").trim(),
            "Организация": organization,
            "Предварительное описание ремонта": description,
            "Предварительная стоимость ремонта": cost,
            "Дата отправки в ремонт": dateValue,
            "Пользователь, который отправил в ремонт": marker,
          };
          const updatedRepairs = [...repairs, repairEntry];
          const meta = buildUploadUserMeta({
            organizationName: context.orgFullName,
          });
          await saveEntries([
            { path: toolsPath, data: updatedTools, ...meta },
            { path: repairsPath, data: updatedRepairs, ...meta },
          ]);

          await notifySendToRepair({
            tool: updatedTools[toolIndex],
            orgFolder,
            organizationName: organization,
            description,
            cost,
            repairDate: dateValue,
            markedBy: marker,
          });

          syncToolStatusInStates(updatedTools[toolIndex], "В ремонте");
          setRepairMessage("Инструмент отправлен в ремонт.", "success");
        }
        closeRepairFormModal();
        await loadRepairTools();
      } catch (error) {
        console.error(error);
        const reason =
          error instanceof Error && error.message
            ? `Причина: ${error.message}`
            : "Проверьте сервер.";
        setRepairFormMessage(`Не удалось сохранить. ${reason}`, "error");
      } finally {
        repairFormState.isSaving = false;
      }
    });
  }

  if (objectsFormEl) {
    objectsFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
    });
  }

  if (objectsCreateFormEl) {
    objectsCreateFormEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      const nameRaw = objectsCreateNameInput?.value ?? "";
      const name = sanitizeObjectName(nameRaw);
      if (!name) {
        setObjectsCreateMessage("Введите название объекта.");
        objectsCreateNameInput?.focus();
        return;
      }
      const { coordinates, error } = parseCoordinatesInput(
        objectsCreateCoordinatesInput?.value
      );
      if (error) {
        setObjectsCreateMessage(error);
        objectsCreateCoordinatesInput?.focus();
        return;
      }
      const duplicate = objectsState.items.some(
        (item) => item.name.toLowerCase() === name.toLowerCase()
      );
      if (duplicate) {
        setObjectsCreateMessage("Такой объект уже есть.");
        return;
      }
      const newItem = {
        id: buildObjectId(),
        name,
        coordinates: coordinates ?? null,
      };
      objectsState.items = [...objectsState.items, newItem];
      setObjectsFilterValue("");
      renderObjectsList();
      await saveObjects();
      closeObjectsCreateModal();
    });
  }

  if (objectsEditFormEl) {
    objectsEditFormEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (objectsState.isSaving) return;
      const item = objectsState.items.find(
        (entry) => entry.id === objectsState.editingId
      );
      if (!item) {
        setObjectsEditMessage("Не удалось найти объект.");
        return;
      }
      const nameRaw = objectsEditNameInput?.value ?? "";
      const name = sanitizeObjectName(nameRaw);
      if (!name) {
        setObjectsEditMessage("Введите название объекта.");
        objectsEditNameInput?.focus();
        return;
      }
      const { coordinates, error } = parseCoordinatesInput(
        objectsEditCoordinatesInput?.value
      );
      if (error) {
        setObjectsEditMessage(error);
        objectsEditCoordinatesInput?.focus();
        return;
      }
      const duplicate = objectsState.items.some(
        (entry) =>
          entry.id !== item.id && entry.name.toLowerCase() === name.toLowerCase()
      );
      if (duplicate) {
        setObjectsEditMessage("Такой объект уже есть.");
        return;
      }
      const oldName = item.name;
      objectsState.items = objectsState.items.map((entry) =>
        entry.id === item.id
          ? { ...entry, name, coordinates: coordinates ?? null }
          : entry
      );
      const nameChanged = normalizeObjectCompare(oldName) !== normalizeObjectCompare(name);
      if (nameChanged) {
        const oldKey = normalizeObjectCompare(oldName);
        const newKey = normalizeObjectCompare(name);
        const count = objectsState.toolsCount.get(oldKey);
        if (count !== undefined) {
          objectsState.toolsCount.set(newKey, count);
          objectsState.toolsCount.delete(oldKey);
        }
      }
      objectsState.isSaving = true;
      setObjectsEditMessage("Сохраняем изменения...");
      try {
        const entries = [];
        const meta = { user };
        entries.push({ path: objectsPath, data: objectsState.items, ...meta });
        if (nameChanged) {
          const orgFolder = context.orgFolderName ?? "";
          const movesPath = orgFolder ? `./${orgFolder}/Перемещения.json` : "";
          const updateTargets = [
            { key: "tools", path: toolsDatabasePath },
            { key: "demand", path: demandPath },
            ...(movesPath ? [{ key: "moves", path: movesPath }] : []),
          ];
          const results = await Promise.allSettled(
            updateTargets.map((target) => loadJson(target.path))
          );
          let updatedTools = null;
          results.forEach((result, index) => {
            if (result.status !== "fulfilled") return;
            const target = updateTargets[index];
            const update = updateObjectNameInData(result.value, oldName, name);
            if (!update.changed) return;
            entries.push({ path: target.path, data: update.data, ...meta });
            if (target.key === "tools") {
              updatedTools = update.data;
            }
          });
          if (updatedTools) {
            const normalizedTools = normalizeToolsData(updatedTools);
            objectsState.toolsCount = buildObjectsToolCounts(normalizedTools);
            toolsState.tools = replaceObjectNameInToolsList(
              toolsState.tools,
              oldName,
              name
            );
            toolsState.filtered = replaceObjectNameInToolsList(
              toolsState.filtered,
              oldName,
              name
            );
          }
          demandState.items = replaceObjectNameInDemands(
            demandState.items,
            oldName,
            name
          );
          demandState.filtered = replaceObjectNameInDemands(
            demandState.filtered,
            oldName,
            name
          );
          demandState.objects = replaceObjectNameInList(
            demandState.objects,
            oldName,
            name
          );
          addToolState.objectOptions = replaceObjectNameInList(
            addToolState.objectOptions,
            oldName,
            name
          );
          toolsMoveState.objectOptions = replaceObjectNameInList(
            toolsMoveState.objectOptions,
            oldName,
            name
          );
        }
        await saveEntries(entries);
        setObjectsEditMessage("Объект обновлён.");
        renderObjectsList();
        setTimeout(() => {
          closeObjectsEditModal();
        }, 400);
      } catch (error) {
        console.error(error);
        setObjectsEditMessage("Не удалось сохранить изменения.");
      } finally {
        objectsState.isSaving = false;
      }
    });
  }

  if (objectsFilterInput) {
    objectsFilterInput.addEventListener("input", (event) => {
      const value = event.target?.value ?? "";
      setObjectsFilterValue(value);
      renderObjectsList();
    });
  }

  if (objectsCreateButton) {
    objectsCreateButton.addEventListener("click", () => {
      openObjectsCreateModal();
    });
  }

  if (objectsListEl) {
    objectsListEl.addEventListener("click", async (event) => {
      const actionButton = event.target.closest("[data-object-action]");
      if (!actionButton) return;
      const itemEl = actionButton.closest("[data-object-id]");
      if (!itemEl) return;
      const itemId = itemEl.dataset.objectId;
      const item = objectsState.items.find((entry) => entry.id === itemId);
      if (!item) return;

      const action = actionButton.dataset.objectAction;
      if (action === "edit") {
        openObjectsEditModal(item);
        return;
      }
      if (action === "delete") {
        const countKey = sanitizeObjectName(item.name).toLowerCase();
        const toolCount = objectsState.toolsCount.get(countKey) ?? 0;
        if (toolCount > 0) {
          setObjectsMessage(
            "Нельзя удалить объект, пока на нем есть инструменты."
          );
          return;
        }
        const confirmDelete = window.confirm(
          `Удалить объект «${item.name}»?`
        );
        if (!confirmDelete) return;
        objectsState.items = objectsState.items.filter((entry) => entry.id !== itemId);
        renderObjectsList();
        await saveObjects();
      }
    });
  }

  const formatUserCount = (value) => {
    const count = Number(value) || 0;
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return `${count} пользователь`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
      return `${count} пользователя`;
    }
    return `${count} пользователей`;
  };

  const parseUserNameParts = (fullName = "") => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    return {
      lastName: parts[0] ?? "",
      firstName: parts[1] ?? "",
      middleName: parts[2] ?? "",
    };
  };

  const usersNameSuggestions = {
    firstNames: [],
    middleNames: [],
  };

  const updateUsersNameSuggestions = (users) => {
    const firstNames = new Set();
    const middleNames = new Set();
    users.forEach((entry) => {
      const fullName = String(entry?.full_name ?? "").trim();
      if (!fullName) return;
      const { firstName, middleName } = parseUserNameParts(fullName);
      if (firstName) firstNames.add(firstName);
      if (middleName) middleNames.add(middleName);
    });
    usersNameSuggestions.firstNames = Array.from(firstNames).sort();
    usersNameSuggestions.middleNames = Array.from(middleNames).sort();
  };

  const getFilteredSuggestions = (value, source) => {
    const safeValue = String(value ?? "").trim();
    if (!safeValue) return [];
    const normalized = safeValue.toLowerCase();
    return source
      .filter((item) => item.toLowerCase().startsWith(normalized))
      .slice(0, 6);
  };

  const setSuggestionOpenState = (containerEl, inputEl, isOpen) => {
    const fieldEl =
      inputEl?.closest(".form-field--selectable") ??
      containerEl?.closest(".form-field--selectable");
    fieldEl?.classList.toggle("is-suggestions-open", Boolean(isOpen));
  };

  const isSuggestionTogglePointer = (event, fieldEl) => {
    if (!event || !fieldEl) return false;
    const rect = fieldEl.getBoundingClientRect();
    const toggleZoneWidth = 56;
    return (
      event.clientX >= rect.right - toggleZoneWidth &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  };

  const attachSuggestionToggle = ({ inputEl, containerEl, show }) => {
    const fieldEl =
      inputEl?.closest(".form-field--selectable") ??
      containerEl?.closest(".form-field--selectable");
    if (!fieldEl || !inputEl || !containerEl || typeof show !== "function") return;
    if (fieldEl.dataset.suggestionToggleAttached === "true") return;

    fieldEl.dataset.suggestionToggleAttached = "true";
    fieldEl.setAttribute(
      "title",
      "Нажмите на галочку, чтобы открыть список, а на обратную галочку — скрыть"
    );

    let ignoreNextClick = false;

    const toggle = (event) => {
      if (event.type === "click" && ignoreNextClick) {
        ignoreNextClick = false;
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      if (!isSuggestionTogglePointer(event, fieldEl)) return false;
      if (event.type === "pointerdown" && event.button !== 0) return false;

      event.preventDefault();
      event.stopPropagation();

      if (event.type === "pointerdown") {
        ignoreNextClick = true;
      }

      const isOpen = !containerEl.classList.contains("is-hidden");
      if (isOpen) {
        hideSuggestions(containerEl, inputEl);
        return true;
      }

      inputEl.focus({ preventScroll: true });
      show();
      return true;
    };

    fieldEl.addEventListener("pointerdown", toggle);
    fieldEl.addEventListener("click", toggle);
  };

  const hideSuggestions = (containerEl, inputEl) => {
    if (!containerEl) return;
    containerEl.classList.add("is-hidden");
    inputEl?.setAttribute("aria-expanded", "false");
    setSuggestionOpenState(containerEl, inputEl, false);
  };

  const renderSuggestions = (containerEl, items, inputEl, onSelect = null) => {
    if (!containerEl) return;
    containerEl.setAttribute("role", "listbox");
    containerEl.innerHTML = "";
    if (!items.length) {
      hideSuggestions(containerEl, inputEl);
      return;
    }
    items.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "suggestions__item";
      button.setAttribute("role", "option");
      button.textContent = item;
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        if (inputEl) {
          inputEl.value = item;
          onSelect?.(item, inputEl);
          inputEl.dispatchEvent(new Event("input", { bubbles: true }));
          inputEl.dispatchEvent(new Event("change", { bubbles: true }));
        }
        hideSuggestions(containerEl, inputEl);
      });
      containerEl.appendChild(button);
    });
    containerEl.classList.remove("is-hidden");
    inputEl?.setAttribute("aria-expanded", "true");
    setSuggestionOpenState(containerEl, inputEl, true);
  };

  const attachSuggestions = (inputEl, containerEl, sourceKey) => {
    if (!inputEl || !containerEl) return;
    const update = () => {
      const source = usersNameSuggestions[sourceKey] ?? [];
      const items = getFilteredSuggestions(inputEl.value, source);
      renderSuggestions(containerEl, items, inputEl);
    };
    const hide = () => {
      hideSuggestions(containerEl, inputEl);
    };
    inputEl.addEventListener("input", () => {
      if (!inputEl.value.trim()) {
        hide();
        return;
      }
      update();
    });
    inputEl.addEventListener("focus", () => {
      if (inputEl.value.trim()) update();
    });
    inputEl.addEventListener("blur", () => {
      setTimeout(hide, 120);
    });
  };

  const attachDynamicSuggestions = ({
    inputEl,
    containerEl,
    getItems,
    showOnFocus = false,
    onSelect = null,
  }) => {
    if (!inputEl || !containerEl) return;
    const suggestionId =
      containerEl.id || `${inputEl.id || inputEl.name || "suggestions"}-listbox`;
    containerEl.id = suggestionId;
    containerEl.setAttribute("role", "listbox");
    inputEl.setAttribute("role", "combobox");
    inputEl.setAttribute("aria-autocomplete", "list");
    inputEl.setAttribute("aria-controls", suggestionId);
    inputEl.setAttribute("aria-expanded", "false");
    const update = () => {
      const items = getItems(inputEl.value);
      renderSuggestions(containerEl, items, inputEl, onSelect);
    };
    const hide = () => {
      hideSuggestions(containerEl, inputEl);
    };
    attachSuggestionToggle({ inputEl, containerEl, show: update });
    inputEl.addEventListener("input", () => {
      if (!inputEl.value.trim() && !showOnFocus) {
        hide();
        return;
      }
      update();
    });
    inputEl.addEventListener("focus", () => {
      if (showOnFocus || inputEl.value.trim()) {
        update();
      }
    });
    inputEl.addEventListener("blur", () => {
      setTimeout(hide, 120);
    });
  };

  const normalizeSuggestionValue = (value = "") => String(value ?? "").trim();

  const sanitizePhotoFileName = (name = "") => {
    const trimmed = String(name).trim();
    const cleaned = trimmed.replace(/[\\/:"*?<>|]+/g, "_");
    return cleaned.replace(/\s+/g, " ").trim();
  };

  const buildRandomSuffix = (length = 3) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let index = 0; index < length; index += 1) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  };

  const buildCommonSuggestions = (values, limit = 6) => {
    const counts = new Map();
    values.forEach((value) => {
      const normalized = normalizeSuggestionValue(value);
      if (!normalized) return;
      const key = normalized.toLowerCase();
      const entry = counts.get(key) ?? { value: normalized, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    });
    return Array.from(counts.values())
      .sort(
        (a, b) =>
          b.count - a.count || a.value.localeCompare(b.value, "ru")
      )
      .slice(0, limit)
      .map((item) => item.value);
  };

  const filterSuggestions = (values, query, limit = 6) => {
    const safeQuery = normalizeSuggestionValue(query).toLowerCase();
    if (!safeQuery) return [];
    const counts = new Map();
    values.forEach((value) => {
      const normalized = normalizeSuggestionValue(value);
      if (!normalized) return;
      const key = normalized.toLowerCase();
      const entry = counts.get(key) ?? { value: normalized, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    });
    return Array.from(counts.values())
      .filter((item) => item.value.toLowerCase().startsWith(safeQuery))
      .sort(
        (a, b) =>
          b.count - a.count || a.value.localeCompare(b.value, "ru")
      )
      .slice(0, limit)
      .map((item) => item.value);
  };

  const filterSelectableOptions = (options, query, limit = 8) => {
    const safeQuery = normalizeSuggestionValue(query).toLowerCase();
    const safeLimit = Number.isFinite(limit) ? limit : options.length;
    if (!safeQuery) return options.slice(0, safeLimit);
    return options
      .filter((item) => item.toLowerCase().includes(safeQuery))
      .slice(0, safeLimit);
  };

  attachSuggestions(
    usersAddFirstNameInput,
    usersAddFirstNameSuggestionsEl,
    "firstNames"
  );
  attachSuggestions(
    usersAddMiddleNameInput,
    usersAddMiddleNameSuggestionsEl,
    "middleNames"
  );

  const setAddToolMessage = (
    message = "",
    { tone = "info", asList = false } = {}
  ) => {
    if (!addToolMessageEl) return;
    addToolMessageEl.classList.remove("is-error", "is-success", "is-info");
    addToolMessageEl.classList.add(`is-${tone}`);
    addToolMessageEl.innerHTML = "";
    if (asList) {
      const list = document.createElement("ul");
      list.className = "form-message__list";
      message
        .filter(Boolean)
        .forEach((item) => {
          const listItem = document.createElement("li");
          listItem.textContent = item;
          list.appendChild(listItem);
        });
      addToolMessageEl.appendChild(list);
      return;
    }
    addToolMessageEl.textContent = message;
  };
  const scrollAddToolFooterIntoView = () => {
    const footerEl = addToolFormEl?.querySelector(".settings-modal__footer");
    if (!footerEl) return;
    footerEl.scrollIntoView({ behavior: "smooth", block: "end" });
  };
  const reportAddToolIssue = (message, { asList = false } = {}) => {
    setAddToolMessage(message, { tone: "error", asList });
    scrollAddToolFooterIntoView();
  };
  const resolveAddToolNumberLabel = () => {
    const normalized = String(addToolState.numberType ?? "").trim().toLowerCase();
    return normalized === "бухгалтерский номер" ? "Бух.номер" : "номер";
  };
  const resolveAddToolNumberLabelCapitalized = () => {
    const normalized = String(addToolState.numberType ?? "").trim().toLowerCase();
    return normalized === "бухгалтерский номер" ? "Бух.номер" : "Номер";
  };
  const isAddToolAccountingNumber = () =>
    resolveAddToolNumberLabelCapitalized() === "Бух.номер";
  let addToolSuccessTool = null;

  const closeAddToolSuccessModal = () => {
    if (!addToolSuccessModalEl) return;
    addToolSuccessModalEl.classList.add("is-hidden");
  };

  const continueAfterAddToolSuccess = () => {
    closeAddToolSuccessModal();
    closeAddToolModal();
    addToolSuccessTool = null;
  };

  const openCreatedToolPhotoModal = async () => {
    const tool = addToolSuccessTool;
    if (!tool) {
      continueAfterAddToolSuccess();
      return;
    }
    closeAddToolSuccessModal();
    closeAddToolModal();
    await openAddPhotoToolModalForTool(tool);
  };
  const openAddToolSuccessModal = ({ toolNumber, accountingNumber, tool } = {}) => {
    addToolSuccessTool = tool ?? null;
    if (!addToolSuccessModalEl) return;
    const numberLabel = resolveAddToolNumberLabelCapitalized();
    const isAccounting = numberLabel === "Бух.номер";
    const displayNumber = isAccounting ? accountingNumber : toolNumber;
    if (addToolSuccessTitleEl) {
      addToolSuccessTitleEl.textContent = isAccounting
        ? "Все готово!"
        : "Готово!";
    }
    if (addToolSuccessMessageEl) {
      addToolSuccessMessageEl.textContent = isAccounting
        ? `Присвоен Бух.номер ${displayNumber ?? "—"}.`
        : "Новая позиция добавлена в базу";
    }
    if (addToolSuccessLabelEl) {
      addToolSuccessLabelEl.textContent = `Присвоенный ${numberLabel}`;
    }
    if (addToolSuccessNumberEl) {
      addToolSuccessNumberEl.textContent = String(displayNumber ?? "—");
    }
    addToolSuccessModalEl.classList.remove("is-hidden");
  };

  const clearAddToolFieldErrors = () => {
    addToolFormEl
      ?.querySelectorAll(".form-field.is-invalid")
      .forEach((field) => field.classList.remove("is-invalid"));
  };

  const markAddToolFieldError = (target) => {
    const field = target?.closest?.(".form-field");
    if (field) {
      field.classList.add("is-invalid");
    }
  };

  const syncObjectTrackingFields = () => {
    const objectFields = [
      addToolObjectInput?.closest?.(".form-field"),
      toolsMoveObjectInput?.closest?.(".form-field"),
    ].filter(Boolean);
    objectFields.forEach((field) => {
      field.classList.toggle("is-hidden", !objectTrackingEnabled);
    });
    [addToolObjectInput, toolsMoveObjectInput].forEach((input) => {
      if (!input) return;
      input.required = objectTrackingEnabled;
      if (!objectTrackingEnabled) input.value = defaultObjectName;
    });
    if (toolsMoveSubtitleEl && !objectTrackingEnabled) {
      toolsMoveSubtitleEl.textContent = "Выберите ответственного";
    }
  };
  syncObjectTrackingFields();

  const getAddToolFieldInput = (key) => {
    const inputMap = {
      "Бух.номер": addToolAccountingNumberInput,
      "Наименование": addToolNameInput,
      "Производитель": addToolManufacturerInput,
      "Модель": addToolModelInput,
      "Наименование по бухгалтерии": addToolAccountingNameInput,
      "Стоимость": addToolCostInput,
      "Ответственный": addToolResponsibleInput,
      "Объект": addToolObjectInput,
      "Серийный номер": addToolSerialNumberInput,
      "Граппа инструментов": addToolGroupInput,
    };
    return inputMap[key] ?? null;
  };

  const getAddToolContextFilters = (excludeKey = "") => {
    const keys = [
      "Наименование",
      "Производитель",
      "Модель",
      "Наименование по бухгалтерии",
      "Стоимость",
      "Ответственный",
      "Объект",
      "Серийный номер",
      "Граппа инструментов",
    ];
    return keys
      .filter((key) => key !== excludeKey)
      .map((key) => ({
        key,
        value: normalizeSuggestionValue(getAddToolFieldInput(key)?.value ?? ""),
      }))
      .filter((item) => item.value);
  };

  const isSuggestionContextMatch = (sourceValue, filterValue) => {
    const normalizedSource = normalizeSuggestionValue(sourceValue).toLowerCase();
    const normalizedFilter = normalizeSuggestionValue(filterValue).toLowerCase();
    if (!normalizedFilter) return true;
    return normalizedSource.includes(normalizedFilter);
  };

  const getToolsForAddToolSuggestions = (excludeKey = "") => {
    const filters = getAddToolContextFilters(excludeKey);
    if (!filters.length) return addToolState.tools;
    return addToolState.tools.filter((tool) =>
      filters.every(({ key, value }) =>
        isSuggestionContextMatch(tool?.[key] ?? "", value)
      )
    );
  };

  const getToolValues = (key, { excludeKey = key } = {}) =>
    getToolsForAddToolSuggestions(excludeKey)
      .map((tool) => normalizeSuggestionValue(tool?.[key] ?? ""))
      .filter(Boolean);

  const mergeSuggestionValues = (...groups) => {
    const seen = new Set();
    return groups
      .flat()
      .map((item) => normalizeSuggestionValue(item))
      .filter((item) => {
        if (!item) return false;
        const key = item.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  const getToolContextSuggestions = (key, query, { options = [] } = {}) => {
    const historicalValues = getToolValues(key, { excludeKey: key });
    const commonValues = buildCommonSuggestions(historicalValues, 12);
    const values = mergeSuggestionValues(commonValues, options);
    if (!normalizeSuggestionValue(query)) {
      return values.slice(0, 6);
    }
    return filterSuggestions(values, query, 6);
  };

  const getKitRowInput = (rowEl, key) => {
    const selectorMap = {
      "Наименование": 'input[name^="tool-kit-name-"]',
      "Количество": 'input[name^="tool-kit-count-"]',
      "Бух.номер": 'input[name^="tool-kit-accounting-"]',
    };
    return rowEl?.querySelector(selectorMap[key] ?? "") ?? null;
  };

  const getKitRowContextFilters = (rowEl, excludeKey = "") =>
    ["Наименование", "Количество"]
      .filter((key) => key !== excludeKey)
      .map((key) => ({
        key,
        value: normalizeSuggestionValue(getKitRowInput(rowEl, key)?.value ?? ""),
      }))
      .filter((item) => item.value);

  const getToolKitSuggestions = (key, query, rowEl = null) => {
    const rowFilters = getKitRowContextFilters(rowEl, key);
    const values = getToolsForAddToolSuggestions("").flatMap((tool) => {
      const kitItems = Array.isArray(tool?.["Комплектация"])
        ? tool["Комплектация"]
        : [];
      return kitItems
        .filter((item) =>
          rowFilters.every(({ key: filterKey, value }) =>
            isSuggestionContextMatch(item?.[filterKey] ?? "", value)
          )
        )
        .map((item) => normalizeSuggestionValue(item?.[key] ?? ""));
    });
    if (!normalizeSuggestionValue(query)) {
      return buildCommonSuggestions(values, 6);
    }
    return filterSuggestions(values, query, 6);
  };

  const getToolNameSuggestions = (query) =>
    getToolContextSuggestions("Наименование", query);

  const getToolManufacturerSuggestions = (query) =>
    getToolContextSuggestions("Производитель", query);

  const getToolModelSuggestions = (query) =>
    getToolContextSuggestions("Модель", query);

  const getDemandToolSuggestions = (query) => {
    const values = [
      ...(demandState.items ?? []).map((item) => item.item),
      ...(demandState.toolSuggestions ?? []),
    ].filter(Boolean);
    if (!values.length) return [];
    if (!normalizeSuggestionValue(query)) {
      return buildCommonSuggestions(values, 6);
    }
    return filterSuggestions(values, query, 6);
  };

  const getSelectableSuggestions = (options, query, limit = 8) =>
    filterSelectableOptions(options, query, limit);

  const attachStrictOptionValue = (inputEl, getOptions, onResolve = null) => {
    if (!inputEl) return;
    inputEl.addEventListener("blur", () => {
      window.setTimeout(() => {
        const rawValue = normalizeSuggestionValue(inputEl.value);
        if (!rawValue) {
          onResolve?.("");
          return;
        }
        const matchedValue = findOptionMatch(rawValue, getOptions());
        inputEl.value = matchedValue || "";
        onResolve?.(matchedValue || "");
        inputEl.dispatchEvent(new Event("change", { bubbles: true }));
      }, 140);
    });
  };

  const attachStrictSearchSelect = ({
    inputEl,
    containerEl,
    getOptions,
    getSuggestions = null,
    onResolve = null,
  }) => {
    if (!inputEl || !containerEl) return;

    attachDynamicSuggestions({
      inputEl,
      containerEl,
      getItems: (query) => {
        if (typeof getSuggestions === "function") {
          return getSuggestions(query);
        }
        const options = getOptions();
        return getSelectableSuggestions(options, query, options.length);
      },
      showOnFocus: true,
      onSelect: (value) => {
        onResolve?.(value);
      },
    });

    inputEl.addEventListener("input", () => {
      const matchedValue = findOptionMatch(inputEl.value, getOptions());
      onResolve?.(matchedValue || "");
    });

    attachStrictOptionValue(inputEl, getOptions, onResolve);
  };


  const getUsersEditRoleOptions = () => getUsersEditableRoleOptions();
  if (usersEditRoleInput) {
    usersEditRoleInput.dataset.roleOptions = getUsersEditRoleOptions().join("|");
  }

  attachStrictSearchSelect({
    inputEl: usersEditRoleInput,
    containerEl: usersEditRoleSuggestionsEl,
    getOptions: getUsersEditRoleOptions,
    getSuggestions: () => getUsersEditRoleOptions(),
  });

  const getRepairOrganizationSuggestions = (query) => {
    const values = repairFormState.organizations ?? [];
    if (!normalizeSuggestionValue(query)) {
      return buildCommonSuggestions(values, 6);
    }
    return filterSuggestions(values, query, 6);
  };

  attachDynamicSuggestions({
    inputEl: addToolNameInput,
    containerEl: addToolNameSuggestionsEl,
    getItems: getToolNameSuggestions,
    showOnFocus: true,
  });

  addToolAccountingNumberSuggestionsEl?.classList.add("is-hidden");

  attachDynamicSuggestions({
    inputEl: demandItemInput,
    containerEl: demandToolsSuggestionsEl,
    getItems: getDemandToolSuggestions,
    showOnFocus: true,
  });

  attachDynamicSuggestions({
    inputEl: demandObjectInput,
    containerEl: demandObjectSuggestionsEl,
    getItems: (query) => getSelectableSuggestions(demandState.objects, query),
    showOnFocus: true,
  });

  attachDynamicSuggestions({
    inputEl: addToolManufacturerInput,
    containerEl: addToolManufacturerSuggestionsEl,
    getItems: getToolManufacturerSuggestions,
    showOnFocus: true,
  });

  const refreshManufacturerSuggestions = () => {
    if (!addToolManufacturerInput || !addToolManufacturerSuggestionsEl) return;
    if (
      !addToolManufacturerInput.value.trim() &&
      document.activeElement !== addToolManufacturerInput
    ) {
      addToolManufacturerSuggestionsEl.classList.add("is-hidden");
      return;
    }
    const items = getToolManufacturerSuggestions(
      addToolManufacturerInput.value
    );
    renderSuggestions(
      addToolManufacturerSuggestionsEl,
      items,
      addToolManufacturerInput
    );
  };

  addToolNameInput?.addEventListener("input", refreshManufacturerSuggestions);

  attachDynamicSuggestions({
    inputEl: addToolModelInput,
    containerEl: addToolModelSuggestionsEl,
    getItems: getToolModelSuggestions,
    showOnFocus: true,
  });

  attachDynamicSuggestions({
    inputEl: addToolAccountingNameInput,
    containerEl: addToolAccountingNameSuggestionsEl,
    getItems: (query) =>
      getToolContextSuggestions("Наименование по бухгалтерии", query),
    showOnFocus: true,
  });

  attachDynamicSuggestions({
    inputEl: addToolCostInput,
    containerEl: addToolCostSuggestionsEl,
    getItems: (query) => getToolContextSuggestions("Стоимость", query),
    showOnFocus: true,
  });

  attachDynamicSuggestions({
    inputEl: addToolSerialNumberInput,
    containerEl: addToolSerialNumberSuggestionsEl,
    getItems: (query) => getToolContextSuggestions("Серийный номер", query),
    showOnFocus: true,
  });

  attachDynamicSuggestions({
    inputEl: repairOrganizationInput,
    containerEl: repairOrganizationSuggestionsEl,
    getItems: getRepairOrganizationSuggestions,
    showOnFocus: true,
  });

  if (addToolResponsibleInput instanceof HTMLSelectElement) {
    addToolResponsibleInput.addEventListener("change", () => {
      addToolState.selectedResponsible = normalizeSuggestionValue(
        addToolResponsibleInput.value
      );
    });
  } else {
    attachStrictSearchSelect({
      inputEl: addToolResponsibleInput,
      containerEl: addToolResponsibleSuggestionsEl,
      getOptions: () => addToolState.responsibleOptions,
      onResolve: (value) => {
        addToolState.selectedResponsible = value;
      },
    });
  }

  attachStrictSearchSelect({
    inputEl: addToolObjectInput,
    containerEl: addToolObjectSuggestionsEl,
    getOptions: () => addToolState.objectOptions,
  });

  attachStrictSearchSelect({
    inputEl: addToolGroupInput,
    containerEl: addToolGroupSuggestionsEl,
    getOptions: () => addToolState.groupOptions,
  });

  if (!(toolsEditGroupInput instanceof HTMLSelectElement)) {
    attachDynamicSuggestions({
      inputEl: toolsEditGroupInput,
      containerEl: toolsEditGroupSuggestionsEl,
      getItems: (query) =>
        getSelectableSuggestions(toolsEditState.groupOptions, query),
      showOnFocus: true,
    });
  }

  attachDynamicSuggestions({
    inputEl: toolsMoveResponsibleInput,
    containerEl: toolsMoveResponsibleSuggestionsEl,
    getItems: (query) =>
      getSelectableSuggestions(toolsMoveState.responsibleOptions, query),
    showOnFocus: true,
  });

  if (toolsMoveObjectInput && toolsMoveObjectSuggestionsEl) {
    const hideToolsMoveObjectSuggestions = () => {
      toolsMoveObjectSuggestionsEl.classList.add("is-hidden");
    };
    toolsMoveObjectInput.addEventListener("input", () => {
      renderToolsMoveObjectSuggestions();
    });
    toolsMoveObjectInput.addEventListener("focus", () => {
      renderToolsMoveObjectSuggestions();
    });
    toolsMoveObjectInput.addEventListener("blur", () => {
      setTimeout(hideToolsMoveObjectSuggestions, 120);
    });
  }

  const updateAddToolSelectState = (inputEl, options, emptyPlaceholder) => {
    if (!inputEl) return;
    const basePlaceholder =
      inputEl.dataset.placeholder ?? "Выберите значение";
    if (options.length) {
      inputEl.disabled = false;
      inputEl.placeholder = basePlaceholder;
      return;
    }
    inputEl.disabled = true;
    inputEl.placeholder = emptyPlaceholder;
    inputEl.value = "";
  };

  const updateAddToolResponsibleOptions = () => {
    if (!(addToolResponsibleInput instanceof HTMLSelectElement)) return;
    const placeholder =
      addToolResponsibleInput.dataset.placeholder ?? "Выберите пользователя";
    addToolResponsibleInput.innerHTML = "";
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = addToolState.responsibleOptions.length
      ? placeholder
      : "Нет пользователей";
    placeholderOption.disabled = Boolean(addToolState.responsibleOptions.length);
    placeholderOption.selected = true;
    addToolResponsibleInput.appendChild(placeholderOption);
    addToolState.responsibleOptions.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      addToolResponsibleInput.appendChild(option);
    });
    addToolResponsibleInput.disabled = !addToolState.responsibleOptions.length;
    addToolResponsibleInput.value = "";
  };

  const updateToolsMoveSelectState = (inputEl, options, emptyPlaceholder) => {
    if (!inputEl) return;
    const basePlaceholder =
      inputEl.dataset.placeholder ?? "Выберите значение";
    if (options.length) {
      inputEl.disabled = false;
      inputEl.placeholder = basePlaceholder;
      return;
    }
    inputEl.disabled = true;
    inputEl.placeholder = emptyPlaceholder;
    inputEl.value = "";
  };

  const normalizeMoveOption = (value = "") =>
    String(value ?? "").trim().toLowerCase();

  const getToolsMoveBlockedObjects = (responsibleName) => {
    if (!isToolsMoveObjectChange(responsibleName)) return new Set();
    return new Set(
      Array.from(toolsState.selectedIds)
        .map((id) => toolsState.toolMap.get(id))
        .filter(Boolean)
        .map((tool) => normalizeMoveOption(tool?.["Объект"] ?? ""))
        .filter(Boolean)
    );
  };

  const resolveMoveOptionMatch = (value, options) => {
    const normalized = normalizeMoveOption(value);
    if (!normalized) return "";
    return (
      options.find((option) => normalizeMoveOption(option) === normalized) ?? ""
    );
  };

  const getToolsMoveObjectSuggestionItems = (query = "") => {
    const responsibleRaw = String(toolsMoveResponsibleInput?.value ?? "").trim();
    const responsible = resolveMoveOptionMatch(
      responsibleRaw,
      toolsMoveState.responsibleOptions
    );
    const blockedObjects = getToolsMoveBlockedObjects(responsible);
    const safeQuery = normalizeSuggestionValue(query).toLowerCase();
    return toolsMoveState.objectOptions
      .filter((item) =>
        !safeQuery ? true : item.toLowerCase().includes(safeQuery)
      )
      .slice(0, 8)
      .map((item) => ({
        value: item,
        disabled: blockedObjects.has(normalizeMoveOption(item)),
      }));
  };

  const renderToolsMoveObjectSuggestions = () => {
    if (!toolsMoveObjectInput || !toolsMoveObjectSuggestionsEl) return;
    const items = getToolsMoveObjectSuggestionItems(toolsMoveObjectInput.value);
    toolsMoveObjectSuggestionsEl.innerHTML = "";
    if (!items.length) {
      toolsMoveObjectSuggestionsEl.classList.add("is-hidden");
      return;
    }
    items.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "suggestions__item";
      if (item.disabled) {
        button.classList.add("suggestions__item--disabled");
        button.disabled = true;
      }
      button.textContent = item.disabled
        ? `${item.value} (текущий объект)`
        : item.value;
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        if (item.disabled) return;
        toolsMoveObjectInput.value = item.value;
        toolsMoveObjectInput.dispatchEvent(new Event("input", { bubbles: true }));
        toolsMoveObjectSuggestionsEl.classList.add("is-hidden");
      });
      toolsMoveObjectSuggestionsEl.appendChild(button);
    });
    toolsMoveObjectSuggestionsEl.classList.remove("is-hidden");
  };

  const isEnergyResponsible = (name) => {
    const normalizedName = normalizePersonName(name ?? "");
    if (!normalizedName) return false;
    const role = toolsMoveState.responsibleRoles.get(normalizedName) ?? "";
    return isEnergyLikeRole(role);
  };

  const isToolsMoveObjectChange = (responsibleName) => {
    const normalizedResponsible = normalizePersonName(responsibleName ?? "");
    if (!normalizedResponsible) return false;
    return toolsMoveState.selectedResponsibleNames.has(normalizedResponsible);
  };

  const buildToolsMoveObjectChangeNote = () => {
    const selectedTools = Array.from(toolsState.selectedIds)
      .map((id) => toolsState.toolMap.get(id))
      .filter(Boolean);
    const uniqueObjects = Array.from(
      new Set(
        selectedTools
          .map((tool) => String(tool?.["Объект"] ?? "").trim() || "Не указан")
          .filter(Boolean)
      )
    );
    if (!uniqueObjects.length) {
      return "Смена объекта: исходный объект не определён.";
    }
    if (uniqueObjects.length === 1) {
      return `Смена объекта: перенос с объекта «${uniqueObjects[0]}».`;
    }
    return `Смена объекта: перенос с объектов — ${uniqueObjects.join(", ")}.`;
  };

  const updateToolsMoveReasonState = (responsibleName) => {
    if (!toolsMoveReasonFieldEl || !toolsMoveReasonInput) return;
    const isObjectChangeMove = isToolsMoveObjectChange(responsibleName);
    const shouldRequire = isEnergyResponsible(responsibleName) && !isObjectChangeMove;
    const reasonHintEl = toolsMoveReasonFieldEl.querySelector(
      "[data-tools-move-reason-hint]"
    );
    const reasonLabelEl = toolsMoveReasonFieldEl.querySelector(
      "[data-tools-move-reason-label]"
    );
    const requiredPlaceholder =
      "Обязательно для роли «Энергетик». Например: причина перемещения";
    const optionalPlaceholder =
      "Необязательно. Например: требуется проверка или ремонт";
    toolsMoveReasonFieldEl.classList.toggle("form-field--required", shouldRequire);
    toolsMoveReasonInput.required = shouldRequire;
    toolsMoveReasonInput.setAttribute("aria-required", shouldRequire ? "true" : "false");
    toolsMoveReasonInput.placeholder = shouldRequire
      ? requiredPlaceholder
      : optionalPlaceholder;
    if (reasonLabelEl) {
      reasonLabelEl.textContent = shouldRequire
        ? "Комментарий к перемещению (обязательно)"
        : "Комментарий к перемещению (необязательно)";
    }
    if (reasonHintEl) {
      reasonHintEl.textContent = "";
      reasonHintEl.classList.add("is-hidden");
    }
    if (toolsMoveObjectChangeNoteEl) {
      toolsMoveObjectChangeNoteEl.classList.toggle("is-hidden", !isObjectChangeMove);
      if (isObjectChangeMove) {
        toolsMoveObjectChangeNoteEl.textContent = buildToolsMoveObjectChangeNote();
      }
    }
  };

  const updateAddToolFilledStates = () => {
    if (!addToolFormEl) return;
    const fields = addToolFormEl.querySelectorAll(".form-field");
    fields.forEach((field) => {
      const inputs = field.querySelectorAll("input, textarea, select");
      let hasValue = false;
      inputs.forEach((input) => {
        if (
          !(
            input instanceof HTMLInputElement ||
            input instanceof HTMLTextAreaElement ||
            input instanceof HTMLSelectElement
          )
        ) {
          return;
        }
        if (input.type === "file") {
          if (input.files && input.files.length > 0) {
            hasValue = true;
          }
          return;
        }
        if (input.type === "checkbox" || input.type === "radio") {
          if (input.checked) {
            hasValue = true;
          }
          return;
        }
        if (String(input.value).trim() !== "") {
          hasValue = true;
        }
      });
      field.classList.toggle("is-filled", hasValue);
    });

    const fileOptions = addToolFormEl.querySelectorAll(".form-file-option");
    fileOptions.forEach((option) => {
      const fileInput = option.querySelector('input[type="file"]');
      const isFilled =
        fileInput instanceof HTMLInputElement &&
        fileInput.files &&
        fileInput.files.length > 0;
      option.classList.toggle("is-filled", isFilled);
    });
  };

  let addToolCameraStream = null;
  let addToolCameraBlob = null;
  let addToolCameraMode = "invoice";
  let addToolCameraNoPhotoTargetTool = null;
  let addToolCameraNoPhotoOnCapture = null;
  let bypassAddToolCameraPicker = false;
  let addToolKitRowCounter = 0;

  const setAddToolKitExpanded = (expanded) => {
    if (!addToolKitToggleButton || !addToolKitPanelEl) return;
    addToolKitToggleButton.setAttribute("aria-expanded", expanded ? "true" : "false");
    addToolKitPanelEl.classList.toggle("is-hidden", !expanded);
    addToolKitBlockEl?.classList.toggle("is-open", expanded);
    addToolKitToggleButton.textContent = expanded
      ? "Скрыть комплектацию"
      : "Добавить комплектацию";
  };

  const createAddToolKitRow = (item = null) => {
    if (!addToolKitListEl) return null;
    addToolKitRowCounter += 1;
    const rowId = String(addToolKitRowCounter);
    const rowEl = document.createElement("div");
    rowEl.className = "add-tool-kit__row";
    rowEl.dataset.kitRow = rowId;
    rowEl.innerHTML = `
      <label class="form-field form-field--required add-tool-kit__field add-tool-kit__field--name">
        <span class="form-label">Позиция комплекта</span>
        <input class="form-input" type="text" name="tool-kit-name-${rowId}" placeholder="Например, кейс" autocomplete="off" />
        <div class="suggestions is-hidden" data-tool-kit-name-suggestions></div>
      </label>
      <label class="form-field add-tool-kit__field add-tool-kit__field--count">
        <span class="form-label">Количество</span>
        <input class="form-input" type="text" inputmode="numeric" name="tool-kit-count-${rowId}" placeholder="Необязательно" autocomplete="off" />
        <div class="suggestions is-hidden" data-tool-kit-count-suggestions></div>
      </label>
      <label class="form-field add-tool-kit__field add-tool-kit__field--accounting">
        <span class="form-label">Бух.номер</span>
        <input class="form-input" type="text" inputmode="text" name="tool-kit-accounting-${rowId}" placeholder="Необязательно" autocomplete="off" />
      </label>
      <button class="button-icon add-tool-kit__remove" type="button" data-add-tool-kit-remove aria-label="Удалить позицию">
        <span class="button-icon-emoji" aria-hidden="true">✕</span>
      </button>
    `;
    addToolKitListEl.append(rowEl);
    if (item && typeof item === "object") {
      const nameInput = rowEl.querySelector('input[name^="tool-kit-name-"]');
      const countInput = rowEl.querySelector('input[name^="tool-kit-count-"]');
      const accountingInput = rowEl.querySelector(
        'input[name^="tool-kit-accounting-"]'
      );
      if (nameInput) {
        nameInput.value = normalizeSuggestionValue(
          item.name ?? item["Наименование"] ?? ""
        );
      }
      if (countInput) {
        countInput.value = normalizeSuggestionValue(
          item.count ?? item["Количество"] ?? ""
        );
      }
      if (accountingInput) {
        accountingInput.value = normalizeSuggestionValue(
          item.accountingNumber ?? item["Бух.номер"] ?? ""
        );
      }
    }

    attachDynamicSuggestions({
      inputEl: rowEl.querySelector('input[name^="tool-kit-name-"]'),
      containerEl: rowEl.querySelector("[data-tool-kit-name-suggestions]"),
      getItems: (query) => getToolKitSuggestions("Наименование", query, rowEl),
      showOnFocus: true,
    });
    attachDynamicSuggestions({
      inputEl: rowEl.querySelector('input[name^="tool-kit-count-"]'),
      containerEl: rowEl.querySelector("[data-tool-kit-count-suggestions]"),
      getItems: (query) => getToolKitSuggestions("Количество", query, rowEl),
      showOnFocus: true,
    });
    return rowEl;
  };

  const clearAddToolKitRows = () => {
    if (!addToolKitListEl) return;
    addToolKitListEl.innerHTML = "";
    addToolKitRowCounter = 0;
  };

  const collectAddToolKitItems = () => {
    if (!addToolKitListEl) return [];
    const rows = Array.from(addToolKitListEl.querySelectorAll("[data-kit-row]"));
    return rows
      .map((row) => {
        const nameInput = row.querySelector('input[name^="tool-kit-name-"]');
        const countInput = row.querySelector('input[name^="tool-kit-count-"]');
        const accountingInput = row.querySelector(
          'input[name^="tool-kit-accounting-"]'
        );
        return {
          name: normalizeSuggestionValue(nameInput?.value ?? ""),
          count: normalizeSuggestionValue(countInput?.value ?? ""),
          accountingNumber: normalizeSuggestionValue(accountingInput?.value ?? ""),
          nameInput,
        };
      })
      .filter((item) => item.name || item.count || item.accountingNumber);
  };

  const resetAddToolCameraUI = () => {
    if (addToolCameraVideoEl) {
      addToolCameraVideoEl.classList.remove("is-hidden");
    }
    if (addToolCameraCanvasEl) {
      addToolCameraCanvasEl.classList.add("is-hidden");
    }
    addToolCameraCaptureButton?.classList.remove("is-hidden");
    addToolCameraRetakeButton?.classList.add("is-hidden");
    addToolCameraSaveButton?.classList.add("is-hidden");
    addToolCameraBlob = null;
  };

  const stopAddToolCameraStream = () => {
    if (addToolCameraStream) {
      addToolCameraStream.getTracks().forEach((track) => track.stop());
      addToolCameraStream = null;
    }
    if (addToolCameraVideoEl) {
      addToolCameraVideoEl.srcObject = null;
    }
  };

  const syncAddToolCameraModalContent = () => {
    const isNoPhotoMode = addToolCameraMode === "no-photo";
    if (addToolCameraTitleEl) {
      addToolCameraTitleEl.textContent = isNoPhotoMode
        ? "Фото инструмента"
        : "Фото накладной";
    }
    if (addToolCameraSubtitleEl) {
      addToolCameraSubtitleEl.textContent = isNoPhotoMode
        ? ""
        : "Сделайте снимок и подтвердите";
    }
    if (addToolCameraHintEl) {
      addToolCameraHintEl.textContent = isNoPhotoMode
        ? ""
        : "Держите накладную в кадре и нажмите «Сфотографировать».";
    }
    if (addToolCameraPanelEl) {
      addToolCameraPanelEl.setAttribute(
        "aria-label",
        isNoPhotoMode ? "Фото инструмента" : "Фото накладной"
      );
    }
  };

  const openAddToolCameraModal = async () => {
    if (!addToolCameraModalEl) return false;
    syncAddToolCameraModalContent();
    addToolCameraModalEl.classList.remove("is-hidden");
    resetAddToolCameraUI();
    try {
      addToolCameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (addToolCameraVideoEl) {
        addToolCameraVideoEl.srcObject = addToolCameraStream;
        await addToolCameraVideoEl.play();
      }
      return true;
    } catch (error) {
      console.warn("Не удалось открыть камеру для накладной.", error);
      stopAddToolCameraStream();
      addToolCameraModalEl.classList.add("is-hidden");
      return false;
    }
  };

  const closeAddToolCameraModal = () => {
    if (!addToolCameraModalEl) return;
    addToolCameraModalEl.classList.add("is-hidden");
    stopAddToolCameraStream();
    resetAddToolCameraUI();
  };

  const captureAddToolCameraFrame = () => {
    if (!addToolCameraVideoEl || !addToolCameraCanvasEl) return;
    const width = addToolCameraVideoEl.videoWidth;
    const height = addToolCameraVideoEl.videoHeight;
    if (!width || !height) return;
    addToolCameraCanvasEl.width = width;
    addToolCameraCanvasEl.height = height;
    const context = addToolCameraCanvasEl.getContext("2d");
    if (!context) return;
    context.drawImage(addToolCameraVideoEl, 0, 0, width, height);
    addToolCameraCanvasEl.classList.remove("is-hidden");
    addToolCameraVideoEl.classList.add("is-hidden");
    addToolCameraCaptureButton?.classList.add("is-hidden");
    addToolCameraRetakeButton?.classList.remove("is-hidden");
    addToolCameraSaveButton?.classList.remove("is-hidden");
    addToolCameraCanvasEl.toBlob(
      (blob) => {
        addToolCameraBlob = blob;
      },
      "image/jpeg",
      0.92
    );
  };

  const resolveAddToolCameraBlob = () =>
    new Promise((resolve) => {
      if (addToolCameraBlob) {
        resolve(addToolCameraBlob);
        return;
      }
      if (!addToolCameraCanvasEl || addToolCameraCanvasEl.classList.contains("is-hidden")) {
        resolve(null);
        return;
      }
      addToolCameraCanvasEl.toBlob(
        (blob) => resolve(blob),
        "image/jpeg",
        0.92
      );
    });

  const applyAddToolCameraSnapshot = async () => {
    const snapshotBlob = await resolveAddToolCameraBlob();
    if (!snapshotBlob) return;
    addToolCameraBlob = snapshotBlob;
    const fileName = `invoice_photo_${Date.now()}.jpg`;
    const photoFile = new File([snapshotBlob], fileName, {
      type: snapshotBlob.type || "image/jpeg",
    });

    if (addToolCameraMode === "no-photo" && addToolCameraNoPhotoTargetTool) {
      if (typeof addToolCameraNoPhotoOnCapture === "function") {
        await addToolCameraNoPhotoOnCapture(photoFile);
      } else {
        await handleAddPhotoUpload(addToolCameraNoPhotoTargetTool, photoFile);
      }
      addToolCameraMode = "invoice";
      addToolCameraNoPhotoTargetTool = null;
      addToolCameraNoPhotoOnCapture = null;
      closeAddToolCameraModal();
      return;
    }

    if (!addToolInvoicePhotoInput) return;
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(photoFile);
    addToolInvoicePhotoInput.files = dataTransfer.files;
    addToolInvoicePhotoInput.dispatchEvent(
      new Event("change", { bubbles: true })
    );
    updateAddToolFilledStates();
    closeAddToolCameraModal();
  };

  const resetAddToolForm = () => {
    addToolFormEl?.reset();
    setAddToolMessage("", { tone: "info" });
    clearAddToolFieldErrors();
    addToolNameSuggestionsEl?.classList.add("is-hidden");
    addToolManufacturerSuggestionsEl?.classList.add("is-hidden");
    addToolModelSuggestionsEl?.classList.add("is-hidden");
    addToolResponsibleSuggestionsEl?.classList.add("is-hidden");
    addToolObjectSuggestionsEl?.classList.add("is-hidden");
    addToolGroupSuggestionsEl?.classList.add("is-hidden");
    addToolState.selectedResponsible = "";
    if (addToolResponsibleInput instanceof HTMLSelectElement) {
      addToolResponsibleInput.value = "";
    }
    clearAddToolKitRows();
    setAddToolKitExpanded(false);
    updateAddToolFilledStates();
  };

  const updateAddToolAccountingRequirement = () => {
    if (!addToolAccountingNumberInput) return;
    if (!addToolAccountingNumberInput.dataset.placeholder) {
      addToolAccountingNumberInput.dataset.placeholder =
        addToolAccountingNumberInput.placeholder;
    }
    const isRequired = isAddToolAccountingNumber();
    addToolAccountingNumberInput.required = isRequired;
    addToolAccountingNumberInput.placeholder = isRequired
      ? "Введите Бух.номер"
      : addToolAccountingNumberInput.dataset.placeholder || "Можно оставить пустым";
    const field = addToolAccountingNumberInput.closest(".form-field");
    field?.classList.toggle("form-field--required", isRequired);
  };

  const buildNextToolNumber = (tools) => {
    let maxValue = 0;
    tools.forEach((tool) => {
      const raw = String(tool?.["Номер"] ?? "").replace(/\D/g, "");
      if (raw.length !== 5) return;
      const numeric = Number.parseInt(raw, 10);
      if (Number.isFinite(numeric) && numeric > maxValue) {
        maxValue = numeric;
      }
    });
    const nextValue = maxValue + 1;
    return String(nextValue).padStart(5, "0");
  };

  const buildInvoiceFileName = (toolNumber, dateValue, originalName = "") => {
    const extension = originalName.includes(".")
      ? originalName.split(".").pop()
      : "";
    const randomSuffix = buildRandomSuffix(3);
    const baseName = `${toolNumber}_${dateValue}_${randomSuffix}`;
    const rawName = extension ? `${baseName}.${extension}` : baseName;
    return sanitizePhotoFileName(rawName);
  };

  const buildRepairActFileName = (toolNumber, dateValue, originalName = "") => {
    const safeNumber = sanitizeFileName(String(toolNumber ?? "акт"));
    let extension = originalName.includes(".")
      ? originalName.split(".").pop()
      : "";
    if (!extension) {
      extension = "file";
    }
    const randomSuffix = buildRandomSuffix(2);
    const baseName = `${safeNumber}_${dateValue}_${randomSuffix}`;
    const rawName = `${baseName}.${extension}`;
    return sanitizePhotoFileName(rawName);
  };

  const findOptionMatch = (value, options) => {
    const normalized = normalizeSuggestionValue(value).toLowerCase();
    if (!normalized) return "";
    const match = options.find(
      (item) => item.toLowerCase() === normalized
    );
    return match ?? "";
  };

  const buildAddToolErrorMessage = (issues, prefix = "Не удалось загрузить данные.") => {
    if (!issues.length) return prefix;
    return `${prefix} ${issues.join(" ")}`.trim();
  };

  const formatSaveResponseMessage = (responseText) => {
    const raw = String(responseText ?? "").trim();
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.message) return String(parsed.message).trim();
      if (parsed?.error) return String(parsed.error).trim();
      if (parsed?.success === true) return "успешно";
      if (typeof parsed === "string") return parsed.trim();
      return JSON.stringify(parsed);
    } catch (error) {
      return raw;
    }
  };

  const buildSaveResponseSuffix = (responseText) => {
    const message = formatSaveResponseMessage(responseText);
    if (!message) return "";
    const normalized = message.endsWith(".") ? message : `${message}.`;
    return ` Ответ сервера: ${normalized}`;
  };

  const resolveAddToolOrganization = async () => {
    const issues = [];
    const telegramId = normalizeTelegramId(user?.telegram_id ?? user?.telegramId ?? null);
    const fullName = String(user?.full_name ?? user?.fullName ?? "").trim();

    if (!telegramId && !fullName) {
      issues.push("Не хватает данных пользователя (telegram_id или ФИО).");
    }

    let usersData = null;
    try {
      usersData = await loadJson(usersFilePath);
    } catch (error) {
      issues.push("Не удалось загрузить users.json.");
    }

    const organizationName = String(
      findUserOrganizationName(user, usersData ?? { users: [] })
    ).trim();
    if (!organizationName || organizationName === "Организация") {
      issues.push("В users.json у пользователя не указана организация.");
    }

    let orgsData = null;
    try {
      orgsData = await loadJson(orgFilePath);
    } catch (error) {
      issues.push("Не удалось загрузить organizations.json.");
    }

    const orgsList = Array.isArray(orgsData?.organizations)
      ? orgsData.organizations
      : [];
    const orgRecord = findOrganizationRecord(
      { organizations: orgsList },
      organizationName
    );
    const orgShortName = String(
      orgRecord?.short_name ?? context?.orgShortName ?? organizationName
    ).trim();
    const contextOrgFolder = sanitizeOrganizationFolderName(
      context?.orgFolderName ?? ""
    );
    const orgFolder =
      (contextOrgFolder && contextOrgFolder !== "Организация"
        ? contextOrgFolder
        : "") || sanitizeOrganizationFolderName(orgShortName);

    if (!orgFolder) {
      issues.push("Не удалось определить папку организации.");
    }

    return {
      organizationName,
      orgShortName,
      orgFolder,
      orgRecord,
      numberType: String(orgRecord?.number_type ?? "Номер приложения").trim(),
      issues,
    };
  };

  const loadAddToolReferences = async () => {
    setAddToolMessage("Загружаем данные...", { tone: "info" });
    try {
      const settle = (promise) =>
        promise.then(
          (value) => ({ status: "fulfilled", value }),
          (reason) => ({ status: "rejected", reason })
        );
      const resolution = await resolveAddToolOrganization();
      if (resolution.issues.length) {
        reportAddToolIssue(
          buildAddToolErrorMessage(
            resolution.issues,
            "Не удалось определить организацию пользователя."
          ),
          { asList: false }
        );
        return;
      }

      const organizationName = resolution.organizationName;
      const orgFolder = resolution.orgFolder;

      addToolState.organizationName = organizationName;
      addToolState.orgFolder = orgFolder;
      addToolState.numberType = resolution.numberType;
      updateAddToolAccountingRequirement();

      const toolsPath = `./${orgFolder}/База с инструментами.json`;
      const objectsPath = `./${orgFolder}/Объекты.json`;
      const settingsPath = `./${orgFolder}/Настройки.json`;
      const results = await Promise.all([
        settle(loadJson(toolsPath)),
        settle(loadJson(objectsPath)),
        settle(loadJson(settingsPath)),
        settle(loadJson(usersFilePath)),
        settle(loadJson(orgFilePath)),
      ]);
      const [
        toolsResult,
        objectsResult,
        rawSettingsResult,
        usersDataResult,
        orgsDataResult,
      ] = results;
      const tools =
        toolsResult.status === "fulfilled"
          ? normalizeToolsData(toolsResult.value)
          : [];
      const objects =
        objectsResult.status === "fulfilled"
          ? normalizeObjectsData(objectsResult.value)
          : [];
      const rawSettings =
        rawSettingsResult.status === "fulfilled" ? rawSettingsResult.value : {};
      const usersData =
        usersDataResult.status === "fulfilled"
          ? usersDataResult.value
          : { users: [] };
      const orgsData =
        orgsDataResult.status === "fulfilled"
          ? orgsDataResult.value
          : { organizations: [] };
      const usersList = Array.isArray(usersData?.users) ? usersData.users : [];
      const orgsSafe = {
        organizations: Array.isArray(orgsData?.organizations)
          ? orgsData.organizations
          : [],
      };
      const missingSources = [];
      if (toolsResult.status === "rejected") {
        missingSources.push(`Не найден файл "${toolsPath}".`);
      }
      if (objectsResult.status === "rejected") {
        missingSources.push(`Не найден файл "${objectsPath}".`);
      }
      if (rawSettingsResult.status === "rejected") {
        missingSources.push(`Не найден файл "${settingsPath}".`);
      }
      if (usersDataResult.status === "rejected") {
        missingSources.push("Не удалось загрузить users.json.");
      }
      if (orgsDataResult.status === "rejected") {
        missingSources.push("Не удалось загрузить organizations.json.");
      }
      if (missingSources.length) {
        reportAddToolIssue(buildAddToolErrorMessage(missingSources));
        return;
      }

      addToolState.tools = Array.isArray(tools) ? tools : [];

      const objectOptions = objectTrackingEnabled
        ? (Array.isArray(objects) ? objects : [])
            .map((item) => sanitizeObjectName(item?.name ?? item))
            .filter(Boolean)
        : [defaultObjectName];
      addToolState.objectOptions = Array.from(new Set(objectOptions)).sort(
        (a, b) => a.localeCompare(b, "ru")
      );

      const settingsData = ensureSettingsData(rawSettings);
      const organizationSettings = getEnergyOrganizationSettings(settingsData);
      const groupOptions = Array.isArray(organizationSettings.stcGroups)
        ? organizationSettings.stcGroups
        : [];
      addToolState.groupOptions = Array.from(
        new Set(
          groupOptions
            .map((group) => sanitizeToolGroupName(group))
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "ru"));

      const orgRecord =
        findOrganizationRecord(orgsSafe, organizationName) ?? resolution.orgRecord;
      addToolState.numberType = String(
        orgRecord?.number_type ?? resolution.numberType ?? "Номер приложения"
      ).trim();
      updateAddToolAccountingRequirement();
      const orgNames = [
        ...(orgRecord ? getOrgNames(orgRecord) : []),
        organizationName,
        resolution.orgShortName,
        context?.orgFullName,
        context?.orgShortName,
        context?.orgFolderName,
        orgFolder,
      ]
        .map((name) => String(name ?? "").trim())
        .filter(Boolean);
      const normalizedOrgNameSet = new Set(
        orgNames.map((name) => normalizeOrganizationName(name))
      );
      const normalizedOrgFolderSet = new Set(
        orgNames.map((name) => normalizeOrganizationFolder(name))
      );
      const responsibleOptions = usersList
        .filter((entry) => {
          const entryOrganization = String(entry?.organization ?? "").trim();
          if (!entryOrganization || !isOrganizationUserForResponsibleSelect(entry)) {
            return false;
          }
          return (
            normalizedOrgNameSet.has(normalizeOrganizationName(entryOrganization)) ||
            normalizedOrgFolderSet.has(normalizeOrganizationFolder(entryOrganization))
          );
        })
        .map((entry) => String(entry?.full_name ?? "").trim())
        .filter(Boolean);
      addToolState.responsibleOptions = Array.from(
        new Set(responsibleOptions)
      ).sort((a, b) => a.localeCompare(b, "ru"));

      addToolState.selectedResponsible = "";
      updateAddToolResponsibleOptions();
      updateAddToolSelectState(
        addToolResponsibleInput,
        addToolState.responsibleOptions,
        "Нет пользователей"
      );
      updateAddToolSelectState(
        addToolObjectInput,
        addToolState.objectOptions,
        "Нет объектов"
      );
      updateAddToolSelectState(
        addToolGroupInput,
        addToolState.groupOptions,
        "Нет групп"
      );

      setAddToolMessage("", { tone: "info" });
    } catch (error) {
      console.error(error);
      const reason = error?.message
        ? `Причина: ${String(error.message).trim()}.`
        : "";
      const issues = reason ? [reason] : [];
      reportAddToolIssue(buildAddToolErrorMessage(issues));
    }
  };

  const applyAddToolPrefill = (tool) => {
    if (!tool || typeof tool !== "object") return;
    const setValue = (input, value) => {
      if (!input) return;
      input.value = normalizeSuggestionValue(value ?? "");
    };
    setValue(addToolNameInput, tool["Наименование"]);
    setValue(addToolManufacturerInput, tool["Производитель"]);
    setValue(addToolModelInput, tool["Модель"]);
    setValue(
      addToolAccountingNameInput,
      tool["Наименование по бухгалтерии"] || tool["Наименование"]
    );
    setValue(addToolCostInput, tool["Стоимость"]);
    setValue(addToolResponsibleInput, tool["Ответственный"]);
    setValue(
      addToolObjectInput,
      objectTrackingEnabled ? tool["Объект"] : defaultObjectName
    );
    setValue(addToolGroupInput, tool["Граппа инструментов"]);
    addToolState.selectedResponsible = normalizeSuggestionValue(
      tool["Ответственный"] ?? ""
    );
    clearAddToolKitRows();
    const kitItems = Array.isArray(tool["Комплектация"])
      ? tool["Комплектация"]
      : [];
    if (kitItems.length) {
      setAddToolKitExpanded(true);
      kitItems.forEach((item) => createAddToolKitRow(item));
    } else {
      setAddToolKitExpanded(false);
    }
    updateAddToolFilledStates();
  };

  const openAddToolModal = async ({ prefillTool = null } = {}) => {
    if (!addToolModalEl) return;
    addToolModalEl.classList.remove("is-hidden");
    attachAddToolViewportListeners();
    updateAddToolKeyboardOffset();
    resetAddToolForm();
    await loadAddToolReferences();
    applyAddToolPrefill(prefillTool);
  };

  const closeAddToolModal = () => {
    if (!addToolModalEl) return;
    addToolModalEl.classList.add("is-hidden");
    addToolModalEl.classList.remove("is-input-focus");
    addToolModalEl.style.removeProperty("--keyboard-offset");
    detachAddToolViewportListeners();
    resetAddToolForm();
    closeAddToolSuccessModal();
    closeAddToolCameraModal();
  };

  const handleAddToolInvoicePhotoClick = async (event) => {
    if (!(event instanceof Event)) return;
    if (bypassAddToolCameraPicker) {
      bypassAddToolCameraPicker = false;
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const opened = await openAddToolCameraModal();
    if (!opened && addToolInvoicePhotoInput) {
      bypassAddToolCameraPicker = true;
      addToolInvoicePhotoInput.click();
      setAddToolMessage(
        "Камера недоступна. Выберите фото из галереи.",
        { tone: "warning" }
      );
    }
  };

  if (addToolBackdropEl) {
    addToolBackdropEl.addEventListener("click", closeAddToolModal);
  }
  if (addToolCloseButton) {
    addToolCloseButton.addEventListener("click", closeAddToolModal);
  }
  if (addToolCancelButton) {
    addToolCancelButton.addEventListener("click", closeAddToolModal);
  }
  if (addToolSuccessBackdropEl) {
    addToolSuccessBackdropEl.addEventListener(
      "click",
      closeAddToolSuccessModal
    );
  }
  if (addToolInvoicePhotoInput) {
    addToolInvoicePhotoInput.addEventListener(
      "click",
      handleAddToolInvoicePhotoClick
    );
  }
  if (addToolCameraBackdropEl) {
    addToolCameraBackdropEl.addEventListener("click", closeAddToolCameraModal);
  }
  if (addToolCameraCloseButton) {
    addToolCameraCloseButton.addEventListener("click", closeAddToolCameraModal);
  }
  if (addToolCameraCancelButton) {
    addToolCameraCancelButton.addEventListener("click", closeAddToolCameraModal);
  }
  if (addToolCameraCaptureButton) {
    addToolCameraCaptureButton.addEventListener(
      "click",
      captureAddToolCameraFrame
    );
  }
  if (addToolCameraRetakeButton) {
    addToolCameraRetakeButton.addEventListener("click", () => {
      resetAddToolCameraUI();
      addToolCameraVideoEl?.play();
    });
  }
  if (addToolCameraSaveButton) {
    addToolCameraSaveButton.addEventListener(
      "click",
      applyAddToolCameraSnapshot
    );
  }
  if (addToolSuccessCloseButton) {
    addToolSuccessCloseButton.addEventListener(
      "click",
      closeAddToolSuccessModal
    );
  }
  if (addToolSuccessConfirmButton) {
    addToolSuccessConfirmButton.addEventListener(
      "click",
      continueAfterAddToolSuccess
    );
  }
  if (addToolSuccessAddPhotoButton) {
    addToolSuccessAddPhotoButton.addEventListener("click", () => {
      openCreatedToolPhotoModal().catch((error) => {
        console.error("Не удалось открыть добавление фото для новой МТЦ.", error);
      });
    });
  }
  if (addToolSuccessRepeatButton) {
    addToolSuccessRepeatButton.addEventListener("click", () => {
      const sourceTool = addToolSuccessTool;
      closeAddToolSuccessModal();
      openAddToolModal({ prefillTool: sourceTool }).catch((error) => {
        console.error("Не удалось открыть новую МТЦ с повтором данных.", error);
        reportAddToolIssue(
          "Не удалось повторить данные. Откройте форму ещё раз."
        );
      });
    });
  }
  if (addToolKitToggleButton) {
    addToolKitToggleButton.addEventListener("click", () => {
      const isExpanded = addToolKitToggleButton.getAttribute("aria-expanded") === "true";
      const nextExpanded = !isExpanded;
      setAddToolKitExpanded(nextExpanded);
      if (nextExpanded && !addToolKitListEl?.children.length) {
        createAddToolKitRow();
        updateAddToolFilledStates();
      }
    });
  }
  if (addToolKitAddButton) {
    addToolKitAddButton.addEventListener("click", () => {
      createAddToolKitRow();
      updateAddToolFilledStates();
    });
  }
  if (addToolKitListEl) {
    addToolKitListEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const removeButton = target.closest("[data-add-tool-kit-remove]");
      if (!removeButton) return;
      const row = removeButton.closest("[data-kit-row]");
      row?.remove();
      if (!addToolKitListEl.children.length) {
        createAddToolKitRow();
      }
      updateAddToolFilledStates();
    });
  }

  if (addToolFormEl) {
    addToolFormEl.noValidate = true;
    const scrollAddToolInputIntoView = (target) => {
      const scrollContainer = addToolBodyEl || addToolPanelEl;
      if (!scrollContainer || !(target instanceof HTMLElement)) return;
      const bodyRect = scrollContainer.getBoundingClientRect();
      const inputRect = target.getBoundingClientRect();
      const offset = 24;
      const nextTop =
        scrollContainer.scrollTop + (inputRect.top - bodyRect.top) - offset;
      scrollContainer.scrollTo({
        top: Math.max(nextTop, 0),
        behavior: "smooth",
      });
    };

    addToolFormEl.addEventListener("focusin", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest("input, textarea, select")) return;
      addToolModalEl?.classList.add("is-input-focus");
      updateAddToolKeyboardOffset();
      scrollAddToolInputIntoView(target);
    });

    addToolFormEl.addEventListener("focusout", () => {
      setTimeout(() => {
        if (!addToolFormEl.contains(document.activeElement)) {
          addToolModalEl?.classList.remove("is-input-focus");
          addToolModalEl?.style.removeProperty("--keyboard-offset");
        }
      }, 0);
    });

    const clearFieldErrorOnInput = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const field = target.closest(".form-field");
      if (field?.classList.contains("is-invalid")) {
        field.classList.remove("is-invalid");
      }
    };

    const syncFilledFields = () => {
      updateAddToolFilledStates();
    };

    addToolFormEl.addEventListener("input", clearFieldErrorOnInput);
    addToolFormEl.addEventListener("change", clearFieldErrorOnInput);
    addToolFormEl.addEventListener("input", syncFilledFields);
    addToolFormEl.addEventListener("change", syncFilledFields);
    updateAddToolFilledStates();

    if (addToolInvoicePhotoPicker && addToolInvoicePhotoInputs.length) {
      addToolInvoicePhotoInputs.forEach((input) => {
        input.addEventListener("change", () => {
          addToolInvoicePhotoPicker.open = false;
        });
      });
    }

    addToolFormEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        if (addToolState.isSaving) {
          setAddToolMessage("Сохранение уже выполняется. Подождите…", {
            tone: "info",
          });
          scrollAddToolFooterIntoView();
          return;
        }
        setAddToolMessage("Проверяем данные...", { tone: "info" });
        const formData = new FormData(addToolFormEl);
        const accountingNumber = normalizeSuggestionValue(
          formData.get("tool-accounting-number")
        );
        const toolName = normalizeSuggestionValue(formData.get("tool-name"));
        const manufacturer = normalizeSuggestionValue(
          formData.get("tool-manufacturer")
        );
        const model = normalizeSuggestionValue(formData.get("tool-model"));
        const accountingName = normalizeSuggestionValue(
          formData.get("tool-accounting-name") || formData.get("tool-name")
        );
        const costValue = normalizeCostValue(formData.get("tool-cost"));
        const responsibleRaw = normalizeSuggestionValue(
          formData.get("tool-responsible")
        );
        const objectRaw = normalizeSuggestionValue(formData.get("tool-object"));
        const serialNumber = normalizeSuggestionValue(
          formData.get("tool-serial-number")
        );
        const groupRaw = normalizeSuggestionValue(formData.get("tool-group"));
        const invoiceFile = formData.get("tool-invoice");
        const invoicePhotoFile = formData.get("tool-invoice-photo");
        const invoiceAttachment =
          invoicePhotoFile instanceof File && invoicePhotoFile.size > 0
            ? invoicePhotoFile
            : invoiceFile;
        const kitItems = collectAddToolKitItems();

        const errors = [];
        let focusTarget = null;
        const invalidTargets = new Set();
        const pushError = (message, target) => {
          errors.push(message);
          if (!focusTarget && target) {
            focusTarget = target;
          }
          if (target) {
            invalidTargets.add(target);
          }
        };

        if (!toolName) {
          pushError("Введите наименование.", addToolNameInput);
        }
        if (isAddToolAccountingNumber() && !accountingNumber) {
          pushError("Введите Бух.номер.", addToolAccountingNumberInput);
        }
        if (!manufacturer) {
          pushError("Введите производителя.", addToolManufacturerInput);
        }
        if (!model) {
          pushError("Введите модель.", addToolModelInput);
        }
        if (costValue === null) {
          pushError("Введите корректную стоимость.", addToolCostInput);
        }

        if (!addToolState.responsibleOptions.length) {
          pushError("В организации нет пользователей.", addToolResponsibleInput);
        }
        const responsible = findOptionMatch(
          responsibleRaw,
          addToolState.responsibleOptions
        );
        if (addToolState.responsibleOptions.length && !responsible) {
          pushError("Выберите ответственного из списка.", addToolResponsibleInput);
        }

        if (objectTrackingEnabled && !addToolState.objectOptions.length) {
          pushError("В организации нет объектов.", addToolObjectInput);
        }
        const objectName = objectTrackingEnabled
          ? findOptionMatch(objectRaw, addToolState.objectOptions)
          : defaultObjectName;
        if (objectTrackingEnabled && addToolState.objectOptions.length && !objectName) {
          pushError("Выберите объект из списка.", addToolObjectInput);
        }

        if (!addToolState.groupOptions.length) {
          pushError("В организации нет групп инструментов.", addToolGroupInput);
        }
        const groupName = findOptionMatch(
          groupRaw,
          addToolState.groupOptions
        );
        if (addToolState.groupOptions.length && !groupName) {
          pushError(
            "Выберите группу инструментов из списка.",
            addToolGroupInput
          );
        }

        if (
          !(invoiceAttachment instanceof File) ||
          invoiceAttachment.size === 0
        ) {
          pushError("Прикрепите накладную.", addToolInvoiceInput);
        }
        kitItems.forEach((item) => {
          if (!item.name) {
            pushError(
              "Для позиции комплектации заполните наименование.",
              item.nameInput
            );
          }
        });

        if (errors.length) {
          clearAddToolFieldErrors();
          invalidTargets.forEach((target) => markAddToolFieldError(target));
          reportAddToolIssue(errors, { asList: true });
          focusTarget?.focus();
          return;
        }

        addToolState.isSaving = true;
        setAddToolMessage("Сохраняем данные...", { tone: "info" });

        try {
          if (!addToolState.orgFolder) {
            const orgResolution = await resolveAddToolOrganization();
            if (orgResolution?.orgFolder) {
              addToolState.organizationName = orgResolution.organizationName;
              addToolState.orgFolder = orgResolution.orgFolder;
              addToolState.numberType = orgResolution.numberType;
              updateAddToolAccountingRequirement();
            } else if (orgResolution?.issues?.length) {
              reportAddToolIssue(
                ["Не удалось сохранить инструмент.", ...orgResolution.issues],
                { asList: true }
              );
              return;
            }
          }
          if (!addToolState.orgFolder) {
            reportAddToolIssue(
              "Не удалось определить папку организации. Проверьте users.json и organizations.json."
            );
            return;
          }

          const dateValue = formatDateValue(new Date());
          const toolNumber = buildNextToolNumber(addToolState.tools);
          const invoiceName = buildInvoiceFileName(
            toolNumber,
            dateValue,
            invoiceAttachment.name
          );
          const invoiceContent = await readFileAsBase64(invoiceAttachment);
          const orgFolder = addToolState.orgFolder;
          const toolsPath = `./${orgFolder}/База с инструментами.json`;
          const invoicePath = `./${orgFolder}/Накладные покупка/${invoiceName}`;

          const nextTool = {
            "Номер": toolNumber,
            "Бух.номер": accountingNumber,
            "Наименование": toolName,
            "Производитель": manufacturer,
            "Модель": model,
            "Наименование по бухгалтерии": accountingName,
            "Стоимость": costValue,
            "Дата покупки": dateValue,
            "Ответственный": responsible,
            "Объект": objectName,
            "Серийный номер": serialNumber,
            "Граппа инструментов": groupName,
            "Комплектация": kitItems.map((item) => ({
              "Наименование": item.name,
              "Количество": item.count,
              "Бух.номер": item.accountingNumber,
            })),
            "Статус": "Рабочий",
            "Количество фото": 0,
          };

          const updatedTools = [...addToolState.tools, nextTool];
          const meta = buildUploadUserMeta({
            organizationName: addToolState.organizationName,
          });
          const saveResponseText = await saveEntriesViaEndpoint([
            {
              type: "file",
              path: invoicePath,
              content: invoiceContent,
              encoding: "base64",
              mime: invoiceAttachment.type || "application/octet-stream",
              ...meta,
            },
            {
              path: toolsPath,
              data: updatedTools,
              ...meta,
            },
          ]);

          addToolState.tools = updatedTools;
          const numberLabel = resolveAddToolNumberLabel();
          const displayNumber = isAddToolAccountingNumber()
            ? accountingNumber
            : toolNumber;
          const successMessage = isAddToolAccountingNumber()
            ? `Все готово! Присвоен Бух.номер ${displayNumber}.`
            : `Данные о новой позиции сохранены, ему присвоен ${numberLabel} ${toolNumber}.`;
          const responseSuffix = buildSaveResponseSuffix(saveResponseText);
          setAddToolMessage(`${successMessage}${responseSuffix}`, {
            tone: "success",
          });
          addToolFormEl.reset();
          updateAddToolFilledStates();
          openAddToolSuccessModal({
            toolNumber,
            accountingNumber: displayNumber,
            tool: nextTool,
          });
          const createdByRaw = String(
            currentUser?.full_name ?? currentUser?.fullName ?? ""
          ).trim();
          const createdBy = createdByRaw ? formatFullName(createdByRaw) : "";
          void notifyNewToolRegistration({
            tool: nextTool,
            organizationName: addToolState.organizationName,
            orgFolder: addToolState.orgFolder,
            createdBy,
            numberType: addToolState.numberType,
          });
        } catch (error) {
          console.error(error);
          const rawMessage = String(error?.message ?? "").trim();
          let normalizedMessage = rawMessage;
          if (rawMessage) {
            try {
              const parsed = JSON.parse(rawMessage);
              normalizedMessage =
                parsed?.error ??
                parsed?.message ??
                (typeof parsed === "string" ? parsed : rawMessage);
            } catch (parseError) {
              // keep raw text if it's not JSON
            }
          }
          const errorSuffix = normalizedMessage
            ? `Причина: ${normalizedMessage}.`
            : "Проверьте сервер.";
          reportAddToolIssue(
            `Не удалось сохранить инструмент. ${errorSuffix}`.trim()
          );
        } finally {
          addToolState.isSaving = false;
        }
      } catch (error) {
        console.error("Ошибка формы новой МТЦ.", error);
        addToolState.isSaving = false;
        const rawMessage = String(error?.message ?? "").trim();
        const errorSuffix = rawMessage
          ? `Причина: ${rawMessage}.`
          : "Проверьте консоль.";
        reportAddToolIssue(
          `Ошибка при обработке формы. ${errorSuffix}`.trim()
        );
      }
    });
  }

  const resetUsersInvite = () => {
    if (!usersInviteBox) return;
    usersInviteBox.classList.add("is-hidden");
    delete usersInviteBox.dataset.shareText;
    delete usersInviteBox.dataset.telegramLink;
    delete usersInviteBox.dataset.telegramAppLink;
    if (usersInviteLinkEl) {
      usersInviteLinkEl.value = "";
    }
    if (usersInviteHintEl) {
      usersInviteHintEl.textContent =
        "Нажмите на пользователя без ID в списке, чтобы сформировать новую ссылку.";
    }
    if (usersInviteNoteEl) {
      usersInviteNoteEl.textContent =
        "Откройте ссылку в Telegram — ID сохранится автоматически.";
    }
    if (usersInviteShareButton) usersInviteShareButton.disabled = true;
    if (usersInviteCopyButton) usersInviteCopyButton.disabled = true;
    if (usersInviteOpenButton) {
      usersInviteOpenButton.disabled = true;
      usersInviteOpenButton.textContent = "Открыть в Telegram";
    }
  };

  const resetUsersAddInvite = () => {
    if (!usersAddInviteBox) return;
    usersAddInviteBox.classList.add("is-hidden");
    delete usersAddInviteBox.dataset.shareText;
    delete usersAddInviteBox.dataset.telegramLink;
    delete usersAddInviteBox.dataset.telegramAppLink;
    if (usersAddInviteLinkEl) {
      usersAddInviteLinkEl.value = "";
    }
    if (usersAddInviteHintEl) {
      usersAddInviteHintEl.textContent =
        "Заполните данные пользователя и выберите роль.";
    }
    if (usersAddInviteNoteEl) {
      usersAddInviteNoteEl.textContent =
        "Откройте ссылку в Telegram — ID сохранится автоматически.";
    }
    if (usersAddInviteShareButton) usersAddInviteShareButton.disabled = true;
    if (usersAddInviteCopyButton) usersAddInviteCopyButton.disabled = true;
    if (usersAddInviteOpenButton) {
      usersAddInviteOpenButton.disabled = true;
      usersAddInviteOpenButton.textContent = "Открыть в Telegram";
    }
  };

  const resetUsersAddForm = () => {
    usersAddFormEl?.reset();
    resetUsersAddInvite();
    if (usersAddMessageEl) usersAddMessageEl.textContent = "";
    if (usersAddFirstNameSuggestionsEl) {
      usersAddFirstNameSuggestionsEl.classList.add("is-hidden");
    }
    if (usersAddMiddleNameSuggestionsEl) {
      usersAddMiddleNameSuggestionsEl.classList.add("is-hidden");
    }
  };

  const loadUsersContext = async () => {
    const [usersData, orgData] = await Promise.all([
      loadJson(usersFilePath).catch(() => ({ users: [] })),
      loadJson(orgFilePath).catch(() => ({ organizations: [] })),
    ]);
    const organizationName = findUserOrganizationName(user, usersData ?? { users: [] });
    const orgFullName = pickOrganizationFullName(orgData, organizationName);
    const orgShortName = pickOrganizationShortName(orgData, organizationName);
    const orgNames = Array.from(
      new Set([organizationName, orgFullName, orgShortName].filter(Boolean))
    );
    usersState.users = Array.isArray(usersData?.users) ? usersData.users : [];
    return {
      organizationName,
      orgDisplayName: orgFullName,
      orgNames,
      users: usersState.users,
    };
  };

  const buildOrgNameSets = (names) => {
    const normalizedNames = new Set();
    const normalizedFolders = new Set();
    names.forEach((name) => {
      normalizedNames.add(normalizeOrganizationName(name));
      normalizedFolders.add(normalizeOrganizationFolder(name));
    });
    return { normalizedNames, normalizedFolders };
  };

  const filterOrgUsers = (users, names) => {
    if (!names.length) return [];
    const { normalizedNames, normalizedFolders } = buildOrgNameSets(names);
    return users.filter((entry) => {
      const orgName = String(entry?.organization ?? "").trim();
      if (!orgName || !isVisibleUsersDirectoryUser(entry)) return false;
      return (
        normalizedNames.has(normalizeOrganizationName(orgName)) ||
        normalizedFolders.has(normalizeOrganizationFolder(orgName))
      );
    });
  };


  const filterOrgWorkers = (users, names) =>
    filterOrgUsersForRole(users, names, workerRole);

  const filterOrgUsersForRole = (users, names, role) => {
    if (!names.length) return [];
    const { normalizedNames, normalizedFolders } = buildOrgNameSets(names);
    return users.filter((entry) => {
      const orgName = String(entry?.organization ?? "").trim();
      if (!orgName || String(entry?.role ?? "").trim() !== role) return false;
      return (
        normalizedNames.has(normalizeOrganizationName(orgName)) ||
        normalizedFolders.has(normalizeOrganizationFolder(orgName))
      );
    });
  };

  const renderWorkersList = (workers) => {
    if (!workersListEl) return;
    workersListEl.innerHTML = "";
    if (workersEmptyEl) {
      workersEmptyEl.classList.toggle("is-hidden", workers.length > 0);
    }
    [...workers]
      .sort((a, b) =>
        formatFullName(String(a?.full_name ?? "").trim()).localeCompare(
          formatFullName(String(b?.full_name ?? "").trim()),
          "ru"
        )
      )
      .forEach((entry) => {
        const card = document.createElement("div");
        card.className = "users-details__card workers-page__card";

        const initials = document.createElement("div");
        initials.className = "users-details__initials";
        initials.textContent = getInitials(String(entry?.full_name ?? "").trim());

        const info = document.createElement("div");
        info.className = "users-details__info";

        const name = document.createElement("div");
        name.className = "users-details__name";
        name.textContent = formatFullName(String(entry?.full_name ?? "").trim());

        const meta = document.createElement("div");
        meta.className = "users-details__meta";

        const roleTag = document.createElement("span");
        roleTag.className = "users-details__tag users-details__tag--worker";
        roleTag.textContent = workerRole;
        meta.appendChild(roleTag);

        const position = String(entry?.position ?? "").trim();
        if (position) {
          const positionTag = document.createElement("span");
          positionTag.className = "users-details__status";
          positionTag.textContent = position;
          meta.appendChild(positionTag);
        }

        const telegramTag = document.createElement("span");
        telegramTag.className = "users-details__status is-linked";
        telegramTag.textContent = "Telegram ID не нужен";
        meta.appendChild(telegramTag);

        info.append(name, meta);
        card.append(initials, info);
        workersListEl.appendChild(card);
      });
  };

  const updateWorkersView = () => {
    if (!selectedUsersOrgName) return;
    const workers = filterOrgWorkers(usersState.users, selectedUsersOrgNames);
    if (workersCountEl) {
      workersCountEl.textContent = formatUserCount(workers.length);
    }
    renderWorkersList(workers);
  };

  const openWorkersModal = async () => {
    if (!workersModalEl) return;
    const { organizationName, orgDisplayName, orgNames, users } =
      await loadUsersContext();
    selectedUsersOrgName = organizationName;
    selectedUsersOrgDisplayName = orgDisplayName || organizationName;
    selectedUsersOrgNames = orgNames;
    if (workersOrgNameEl) {
      workersOrgNameEl.textContent = selectedUsersOrgDisplayName;
    }
    const workers = filterOrgWorkers(users, orgNames);
    if (workersCountEl) {
      workersCountEl.textContent = formatUserCount(workers.length);
    }
    renderWorkersList(workers);
    workersModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const closeWorkersAddModal = () => {
    if (!workersAddModalEl) return;
    workersAddModalEl.classList.add("is-hidden");
    workersAddFormEl?.reset();
    if (workersAddMessageEl) workersAddMessageEl.textContent = "";
  };

  const closeWorkersModal = () => {
    if (!workersModalEl) return;
    workersModalEl.classList.add("is-hidden");
    closeWorkersAddModal();
    document.body.style.overflow = "";
  };

  const openWorkersAddModal = async () => {
    if (!workersAddModalEl || !selectedUsersOrgName) return;
    const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
    usersState.users = Array.isArray(usersData?.users) ? usersData.users : [];
    if (workersAddOrgNameEl) {
      workersAddOrgNameEl.textContent = selectedUsersOrgDisplayName || selectedUsersOrgName;
    }
    workersAddFormEl?.reset();
    if (workersAddMessageEl) workersAddMessageEl.textContent = "";
    workersAddModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const getFineBalanceByTitle = (rawFines, userName, fineTitle) => {
    const summaryByUsers =
      rawFines && typeof rawFines === "object" && !Array.isArray(rawFines)
        ? rawFines["Штрафы по пользователям"]
        : null;
    if (!summaryByUsers || typeof summaryByUsers !== "object") return 0;
    const targetName = normalizePersonName(userName);
    const matchedEntry = Object.entries(summaryByUsers).find(([name]) => {
      return normalizePersonName(name) === targetName;
    });
    if (!matchedEntry) return 0;
    const userSummary = matchedEntry[1];
    const typeSummary =
      userSummary && typeof userSummary === "object" ? userSummary[fineTitle] : null;
    return normalizeCostValue(typeSummary?.["Остаток"] ?? 0) || 0;
  };

  const loadResponsibleVacationStats = async (entry) => {
    const fullName = String(entry?.full_name ?? "").trim();
    if (!fullName || !context.orgFolderName) {
      return { toolsCount: 0, fineItems: [] };
    }
    const settingsPath = `./${context.orgFolderName}/Настройки.json`;
    const finesPath = `./${context.orgFolderName}/Штрафы.json`;
    const toolsPath = `./${context.orgFolderName}/База с инструментами.json`;
    const [rawTools, settingsData, rawFines] = await Promise.all([
      loadJson(toolsPath).catch(() => []),
      loadJson(settingsPath).catch(() => ({})),
      loadJson(finesPath).catch(() => ({})),
    ]);
    const tools = normalizeToolsData(rawTools);
    const toolsCount = tools.filter((tool) => {
      return (
        normalizePersonName(tool?.["Ответственный"] ?? "") ===
        normalizePersonName(fullName)
      );
    }).length;

    const fineSettings = settingsData?.organization?.fines ?? {};
    const fineItems = Object.entries(fineSettings)
      .filter(([, config]) => Boolean(config?.enabled))
      .map(([key]) => {
        const title = fineTitleBySettingKey[key] ?? key;
        return {
          key,
          title,
          balance: getFineBalanceByTitle(rawFines, fullName, title),
        };
      });

    return { toolsCount, fineItems };
  };

  const renderVacationSearchResults = (options, query = "") => {
    if (!usersVacationSearchResultsEl) return;
    usersVacationSearchResultsEl.innerHTML = "";
    const normalizedQuery = normalizePersonName(query);
    const filtered = !normalizedQuery
      ? options
      : options.filter((item) => {
          const fullName = normalizePersonName(item?.full_name ?? "");
          const roleName = normalizePersonName(item?.role ?? "");
          return fullName.includes(normalizedQuery) || roleName.includes(normalizedQuery);
        });
    if (!filtered.length) {
      usersVacationSearchResultsEl.classList.remove("is-hidden");
      const empty = document.createElement("div");
      empty.className = "users-vacation__search-empty";
      empty.textContent = "Никого не нашли. Попробуйте другой запрос.";
      usersVacationSearchResultsEl.appendChild(empty);
      return;
    }
    filtered.forEach((item) => {
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.className = "users-vacation__search-option";
      optionButton.innerHTML = `<strong>${formatFullName(
        String(item?.full_name ?? "")
      )}</strong><span>${String(item?.role ?? "").trim()}</span>`;
      optionButton.addEventListener("click", () => {
        const fullName = String(item?.full_name ?? "").trim();
        if (usersVacationReplacerSelect) {
          usersVacationReplacerSelect.value = fullName;
        }
        if (usersVacationReplacerSearchInput) {
          usersVacationReplacerSearchInput.value = formatFullName(fullName);
          usersVacationReplacerSearchInput.focus();
        }
        void updateVacationReplacerPendingNote();
        usersVacationSearchResultsEl.classList.add("is-hidden");
      });
      usersVacationSearchResultsEl.appendChild(optionButton);
    });
    usersVacationSearchResultsEl.classList.remove("is-hidden");
  };

  const updateVacationReplacerPendingNote = async () => {
    if (!usersVacationReplacerPendingNoteEl) return;
    let replacerName = String(usersVacationReplacerSelect?.value ?? "").trim();
    if (!replacerName) {
      replacerName = String(usersVacationReplacerSearchInput?.value ?? "").trim();
    }
    let pendingCount = 0;
    let replacedUserPendingCount = 0;
    if (replacerName && context?.orgFolderName) {
      pendingCount = await loadUserPendingMovesCount(context.orgFolderName, {
        full_name: replacerName,
      });
    }
    if (selectedVacationUser?.full_name && context?.orgFolderName) {
      replacedUserPendingCount = await loadUserPendingMovesCount(context.orgFolderName, {
        full_name: String(selectedVacationUser.full_name).trim(),
      });
    }
    usersVacationReplacerPendingNoteEl.textContent =
      `Инструментов другого пользователя на принятии: ${pendingCount}. У заменяемого сотрудника на принятии: ${replacedUserPendingCount}`;
  };

  const fillVacationReplacers = (entry) => {
    if (!usersVacationReplacerSelect) return;
    usersVacationReplacerSelect.innerHTML = '<option value="">Выберите сотрудника</option>';
    const options = filterOrgUsers(usersState.users, selectedUsersOrgNames).filter((item) => {
      const role = String(item?.role ?? "").trim();
      return (
        (role === energyRole || role === responsibleRole) &&
        normalizePersonName(item?.full_name ?? "") !==
          normalizePersonName(entry?.full_name ?? "")
      );
    });
    usersVacationReplacerSelect.dataset.available = JSON.stringify(
      options.map((item) => ({
        full_name: String(item?.full_name ?? "").trim(),
        role: String(item?.role ?? "").trim(),
      }))
    );
    options.forEach((item) => {
      const option = document.createElement("option");
      option.value = String(item?.full_name ?? "").trim();
      option.textContent = `${formatFullName(option.value)} · ${String(
        item?.role ?? ""
      ).trim()}`;
      usersVacationReplacerSelect.appendChild(option);
    });
    if (usersVacationReplacerSearchInput) {
      usersVacationReplacerSearchInput.value = "";
    }
    if (usersVacationSearchResultsEl) {
      usersVacationSearchResultsEl.classList.add("is-hidden");
      usersVacationSearchResultsEl.innerHTML = "";
    }
    void updateVacationReplacerPendingNote();
  };

  const setVacationMessage = (message = "", type = "") => {
    if (!usersVacationMessageEl) return;
    usersVacationMessageEl.textContent = message;
    usersVacationMessageEl.dataset.type = type;
  };

  const closeUsersVacationModal = () => {
    if (!usersVacationModalEl) return;
    usersVacationModalEl.classList.add("is-hidden");
    if (usersVacationReplaceBox) {
      usersVacationReplaceBox.classList.add("is-hidden");
    }
    selectedVacationUser = null;
    if (usersVacationReplacerSearchInput) {
      usersVacationReplacerSearchInput.value = "";
    }
    if (usersVacationSearchResultsEl) {
      usersVacationSearchResultsEl.classList.add("is-hidden");
      usersVacationSearchResultsEl.innerHTML = "";
    }
    setVacationMessage("");
  };

  const openUsersVacationModal = async (entry) => {
    if (!usersVacationModalEl || !entry) return;
    selectedVacationUser = entry;
    const roleName = String(entry?.role ?? "").trim();
    if (usersVacationNameEl) {
      usersVacationNameEl.textContent = formatFullName(String(entry?.full_name ?? ""));
    }
    if (usersVacationRoleEl) {
      usersVacationRoleEl.textContent = roleName || "Роль не указана";
    }
    const stats = await loadResponsibleVacationStats(entry);
    if (usersVacationToolsCountEl) {
      usersVacationToolsCountEl.textContent = String(stats.toolsCount);
    }
    if (usersVacationFinesEl) {
      usersVacationFinesEl.innerHTML = "";
      if (!stats.fineItems.length) {
        const empty = document.createElement("div");
        empty.className = "users-vacation__fine-empty";
        empty.textContent = "Нет включённых типов штрафов.";
        usersVacationFinesEl.appendChild(empty);
      } else {
        stats.fineItems.forEach((item) => {
          const row = document.createElement("div");
          row.className = "users-vacation__fine-row";
          row.innerHTML = `<span>${item.title}</span><strong>Остаток: ${item.balance}</strong>`;
          usersVacationFinesEl.appendChild(row);
        });
      }
    }
    if (usersVacationReplaceBox) {
      usersVacationReplaceBox.classList.add("is-hidden");
    }
    const isVacation = Boolean(entry?.on_vacation);
    usersVacationTriggerButton?.classList.toggle("is-hidden", isVacation);
    usersVacationReturnButton?.classList.toggle("is-hidden", !isVacation);
    fillVacationReplacers(entry);
    setVacationMessage("");
    usersVacationModalEl.classList.remove("is-hidden");
  };

  const renderUsersDetails = (orgUsers, toolsCounts = new Map()) => {
    if (!usersDetailsListEl) return;
    usersDetailsListEl.innerHTML = "";
    if (usersDetailsEmptyEl) {
      usersDetailsEmptyEl.classList.toggle("is-hidden", orgUsers.length > 0);
    }
    const sortedUsers = [...orgUsers].sort((a, b) => {
      const aName = formatFullName(String(a?.full_name ?? "").trim());
      const bName = formatFullName(String(b?.full_name ?? "").trim());
      return aName.localeCompare(bName, "ru", {
        numeric: true,
        sensitivity: "base",
      });
    });

    sortedUsers.forEach((entry) => {
      const card = document.createElement("div");
      card.className = "users-details__card is-actionable";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");

      const avatar = createUserDetailsAvatar(entry);

      const info = document.createElement("div");
      info.className = "users-details__info";

      const name = document.createElement("div");
      name.className = "users-details__name";
      name.textContent = formatFullName(String(entry?.full_name ?? "").trim());

      const meta = document.createElement("div");
      meta.className = "users-details__meta";
      const roleTag = document.createElement("span");
      roleTag.className = "users-details__tag";
      const roleName = String(entry?.role ?? "роль").trim();
      roleTag.textContent = roleName;

      const toolsStats = toolsCounts.get(normalizePersonName(entry?.full_name ?? "")) ?? { count: 0, amount: 0 };
      const { countTag: toolsCountTag, amountTag: toolsAmountTag } = createUserToolsBadges(toolsStats);

      const telegramStatus = document.createElement("span");
      telegramStatus.className = "users-details__status";
      const hasTelegramId = Boolean(normalizeTelegramId(entry?.telegram_id));
      const isVacation = Boolean(entry?.on_vacation);
      const vacationReplacer = String(entry?.vacation_replacer ?? "").trim();
      telegramStatus.textContent = hasTelegramId
        ? "ID привязан"
        : "ID не привязан";
      telegramStatus.classList.toggle("is-linked", hasTelegramId);
      meta.append(roleTag, toolsCountTag, toolsAmountTag, telegramStatus);

      if (isVacation) {
        card.classList.add("is-vacation");
        const vacationTag = document.createElement("span");
        vacationTag.className = "users-details__status is-vacation";
        vacationTag.textContent = vacationReplacer
          ? `В отпуске · заменяет: ${formatFullName(vacationReplacer)}`
          : "В отпуске";
        meta.appendChild(vacationTag);
      }

      const editHint = document.createElement("span");
      editHint.className = "users-details__edit-hint";
      editHint.setAttribute("aria-hidden", "true");
      editHint.textContent = "✎";

      info.append(name, meta);
      card.append(avatar, info, editHint);
      card.setAttribute(
        "aria-label",
        `Редактировать данные пользователя: ${name.textContent}`
      );
      const handleEdit = () => {
        resetUsersInvite();
        openUsersEditModal(entry);
      };
      card.addEventListener("click", handleEdit);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleEdit();
        }
      });
      usersDetailsListEl.appendChild(card);
    });
  };

  const closeUsersEditModal = () => {
    if (!usersEditModalEl) return;
    usersEditModalEl.classList.add("is-hidden");
    usersEditFormEl?.reset();
    if (usersEditMessageEl) usersEditMessageEl.textContent = "";
    if (usersDetailsModalEl && !usersDetailsModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const openUsersEditModal = (editableUser) => {
    if (!usersEditModalEl || !usersEditFormEl || !editableUser) return;
    const userIndex = usersState.users.indexOf(editableUser);
    if (userIndex < 0) return;
    usersEditFormEl.elements["users-edit-index"].value = String(userIndex);
    const nameParts = splitPersonNameParts(editableUser?.full_name ?? "");
    usersEditFormEl.elements["users-edit-last-name"].value = nameParts.lastName;
    usersEditFormEl.elements["users-edit-first-name"].value = nameParts.firstName;
    usersEditFormEl.elements["users-edit-middle-name"].value = nameParts.middleName;
    usersEditFormEl.elements["users-edit-role"].value = String(editableUser?.role ?? "").trim();
    usersEditFormEl.elements["users-edit-position"].value = String(editableUser?.position ?? "").trim();
    usersEditFormEl.elements["users-edit-telegram-id"].value = String(editableUser?.telegram_id ?? "").trim();
    if (usersEditOrgNameEl) {
      usersEditOrgNameEl.textContent = String(editableUser?.organization ?? selectedUsersOrgDisplayName ?? selectedUsersOrgName ?? "—").trim() || "—";
    }
    if (usersEditMessageEl) usersEditMessageEl.textContent = "";
    usersEditModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const updateUsersDetailsView = async () => {
    if (!selectedUsersOrgName) return;
    const orgUsers = filterOrgUsers(usersState.users, selectedUsersOrgNames);
    if (usersDetailsCountEl) {
      usersDetailsCountEl.textContent = formatUserCount(orgUsers.length);
    }
    const toolsCounts = await loadOrganizationUserToolsCounts(context.orgFolderName);
    renderUsersDetails(orgUsers, toolsCounts);
  };

  const openUsersAddModal = async () => {
    if (!usersAddModalEl || !selectedUsersOrgName) return;
    const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
    usersState.users = Array.isArray(usersData?.users) ? usersData.users : [];
    updateUsersNameSuggestions(usersState.users);
    if (usersAddOrgNameEl) {
      usersAddOrgNameEl.textContent =
        selectedUsersOrgDisplayName || selectedUsersOrgName;
    }
    setMechanicRoleSelectionEnabled(
      usersAddFormEl,
      getEnergyOrganizationSettings(context.settingsData).dataUsage?.mechanisms === true
    );
    resetUsersAddForm();
    usersAddModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const closeUsersAddModal = () => {
    if (!usersAddModalEl) return;
    usersAddModalEl.classList.add("is-hidden");
    resetUsersAddForm();
    if (usersDetailsModalEl && !usersDetailsModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const openUsersDetailsModal = async () => {
    if (!usersDetailsModalEl) return;
    const { organizationName, orgDisplayName, orgNames, users } =
      await loadUsersContext();
    selectedUsersOrgName = organizationName;
    selectedUsersOrgDisplayName = orgDisplayName || organizationName;
    selectedUsersOrgNames = orgNames;
    updateUsersNameSuggestions(users);
    if (usersDetailsNameEl) {
      usersDetailsNameEl.textContent = selectedUsersOrgDisplayName;
    }
    const orgUsers = filterOrgUsers(users, orgNames);
    if (usersDetailsCountEl) {
      usersDetailsCountEl.textContent = formatUserCount(orgUsers.length);
    }
    const toolsCounts = await loadOrganizationUserToolsCounts(context.orgFolderName);
    renderUsersDetails(orgUsers, toolsCounts);
    resetUsersInvite();
    usersDetailsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const closeUsersDetailsModal = () => {
    if (!usersDetailsModalEl) return;
    usersDetailsModalEl.classList.add("is-hidden");
    if (usersAddModalEl) {
      usersAddModalEl.classList.add("is-hidden");
    }
    closeUsersVacationModal();
    closeUsersEditModal();
    resetUsersInvite();
    document.body.style.overflow = "";
  };

  const returnResponsibleFromVacation = async () => {
    if (!selectedVacationUser) return;
    const sourceName = String(selectedVacationUser?.full_name ?? "").trim();
    if (!sourceName) return;
    const isConfirmed = window.confirm(
      `Вернуть из отпуска ${formatFullName(sourceName)}?`
    );
    if (!isConfirmed) return;

    try {
      setVacationMessage("Сохраняем изменения...", "info");
      const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
      const nextUsers = Array.isArray(usersData?.users) ? [...usersData.users] : [];
      const targetIndex = nextUsers.findIndex((item) => {
        return (
          normalizePersonName(item?.full_name ?? "") ===
            normalizePersonName(sourceName) &&
          normalizeOrganizationName(item?.organization ?? "") ===
            normalizeOrganizationName(selectedVacationUser?.organization ?? "")
        );
      });
      if (targetIndex < 0) {
        setVacationMessage("Не удалось найти пользователя в users.json.", "error");
        return;
      }
      nextUsers[targetIndex] = {
        ...nextUsers[targetIndex],
        on_vacation: false,
        vacation_replacer: "",
        vacation_start_at: "",
      };
      await saveJson(usersFilePath, { users: nextUsers }, { user });
      usersState.users = nextUsers;
      updateUsersDetailsView();
      setVacationMessage("Готово. Сотрудник возвращён из отпуска.", "success");
      setTimeout(() => {
        closeUsersVacationModal();
      }, 500);
    } catch (error) {
      console.error(error);
      setVacationMessage("Не удалось вернуть сотрудника из отпуска.", "error");
    }
  };

  const applyResponsibleVacation = async () => {
    if (!selectedVacationUser) return;
    const replacerName = String(usersVacationReplacerSelect?.value ?? "").trim();
    if (!replacerName) {
      setVacationMessage("Выберите, кто заменяет ответственного.", "error");
      return;
    }
    const sourceName = String(selectedVacationUser?.full_name ?? "").trim();
    if (!sourceName) return;
    const isConfirmed = window.confirm(
      `Отправить в отпуск ${formatFullName(sourceName)} и назначить замену: ${formatFullName(
        replacerName
      )}?`
    );
    if (!isConfirmed) return;

    try {
      setVacationMessage("Сохраняем изменения...", "info");
      const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
      const nextUsers = Array.isArray(usersData?.users) ? [...usersData.users] : [];
      const targetIndex = nextUsers.findIndex((item) => {
        return (
          normalizePersonName(item?.full_name ?? "") ===
            normalizePersonName(sourceName) &&
          normalizeOrganizationName(item?.organization ?? "") ===
            normalizeOrganizationName(selectedVacationUser?.organization ?? "")
        );
      });
      if (targetIndex < 0) {
        setVacationMessage("Не удалось найти пользователя в users.json.", "error");
        return;
      }
      nextUsers[targetIndex] = {
        ...nextUsers[targetIndex],
        on_vacation: true,
        vacation_replacer: replacerName,
        vacation_start_at: new Date().toISOString(),
      };
      await saveJson(usersFilePath, { users: nextUsers }, { user });
      usersState.users = nextUsers;
      updateUsersDetailsView();
      setVacationMessage("Готово. Ответственный отправлен в отпуск.", "success");
      setTimeout(() => {
        closeUsersVacationModal();
      }, 500);
    } catch (error) {
      console.error(error);
      setVacationMessage("Не удалось сохранить отпуск. Попробуйте позже.", "error");
    }
  };

  const createResponsibleInvite = async (entry) => {
    if (!usersInviteBox || !entry) return;
    const fullName = String(entry?.full_name ?? "Ответственный").trim();
    const organizationName = String(
      entry?.organization ?? selectedUsersOrgName ?? ""
    ).trim();
    const roleName = String(entry?.role ?? responsibleRole).trim() || responsibleRole;
    const positionName = String(entry?.position ?? "").trim();
    if (!fullName || !organizationName) return;

    try {
      const registrationsData = await loadRegistrations();
      const registrations = registrationsData.registrations ?? [];
      const registrationToken = createRegistrationToken();
      const registrationsWithoutUser = registrations.filter(
        (item) =>
          !(
            item.user?.full_name === fullName &&
            item.user?.organization === organizationName &&
            item.user?.role === roleName
          )
      );
      const nextRegistrationsData = {
        registrations: [
          ...registrationsWithoutUser,
          {
            token: registrationToken,
            created_at: new Date().toISOString(),
            user: {
              full_name: fullName,
              organization: organizationName,
              role: roleName,
              position: positionName,
            },
          },
        ],
      };

      await saveJson(pendingRegistrationsFilePath, nextRegistrationsData, { user });

      const registrationLink = new URL(
        `${window.location.origin}${window.location.pathname}`
      );
      registrationLink.searchParams.set("registration", registrationToken);
      const botUsername = await resolveBotUsername();
      const telegramLinks = buildTelegramRegistrationLinks(
        botUsername,
        registrationToken
      );
      const fallbackLink = telegramLinks?.webLink ?? registrationLink.href;

      if (usersInviteHintEl) {
        usersInviteHintEl.textContent = "Ссылка для приглашения готова.";
      }
      if (usersInviteLinkEl) {
        usersInviteLinkEl.value = fallbackLink;
      }
      usersInviteBox.dataset.shareText = `Контакт пользователя: ${fullName}. Роль: ${roleName}. Организация: ${organizationName}.`;
      usersInviteBox.dataset.telegramLink = fallbackLink;
      if (telegramLinks?.appLink) {
        usersInviteBox.dataset.telegramAppLink = telegramLinks.appLink;
      } else {
        delete usersInviteBox.dataset.telegramAppLink;
      }
      if (usersInviteNoteEl) {
        usersInviteNoteEl.textContent = telegramLinks?.webLink
          ? "При открытии в Telegram ID сохранится автоматически."
          : "Бот ещё не указан. Скопируйте ссылку и отправьте её вручную.";
      }
      if (usersInviteShareButton) {
        usersInviteShareButton.disabled = !usersInviteLinkEl?.value;
      }
      if (usersInviteCopyButton) {
        usersInviteCopyButton.disabled = !usersInviteLinkEl?.value;
      }
      if (usersInviteOpenButton) {
        usersInviteOpenButton.disabled = !usersInviteLinkEl?.value;
        usersInviteOpenButton.textContent = telegramLinks?.webLink
          ? "Открыть в Telegram"
          : "Открыть ссылку";
      }
      usersInviteBox.classList.remove("is-hidden");
    } catch (error) {
      console.error(error);
      if (usersInviteNoteEl) {
        usersInviteNoteEl.textContent =
          "Не удалось сформировать ссылку. Попробуйте позже.";
      }
      usersInviteBox.classList.remove("is-hidden");
    }
  };

  workersBackdropEl?.addEventListener("click", closeWorkersModal);
  workersCloseButton?.addEventListener("click", closeWorkersModal);
  workersAddButton?.addEventListener("click", openWorkersAddModal);
  workersAddBackdropEl?.addEventListener("click", closeWorkersAddModal);
  workersAddCloseButton?.addEventListener("click", closeWorkersAddModal);
  workersAddCancelButton?.addEventListener("click", closeWorkersAddModal);
  workersAddFormEl?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedUsersOrgName) {
      if (workersAddMessageEl) workersAddMessageEl.textContent = "Организация не найдена.";
      return;
    }
    const formData = new FormData(workersAddFormEl);
    const lastName = String(formData.get("workers-add-last-name") ?? "").trim();
    const firstName = String(formData.get("workers-add-first-name") ?? "").trim();
    const middleName = String(formData.get("workers-add-middle-name") ?? "").trim();
    const position = String(formData.get("workers-add-position") ?? "").trim();
    if (!lastName || !firstName || !middleName) {
      if (workersAddMessageEl) workersAddMessageEl.textContent = "Заполните Фамилию, Имя и Отчество.";
      return;
    }
    const fullName = [lastName, firstName, middleName].join(" ").replace(/\s+/g, " ").trim();
    try {
      if (workersAddMessageEl) workersAddMessageEl.textContent = "Сохраняем рабочего...";
      const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
      const nextUsers = Array.isArray(usersData?.users) ? [...usersData.users] : [];
      const normalizedFullName = normalizePersonName(fullName);
      const normalizedOrg = normalizeOrganizationName(selectedUsersOrgName);
      const duplicate = nextUsers.some((entry) =>
        normalizePersonName(entry?.full_name ?? "") === normalizedFullName &&
        normalizeOrganizationName(entry?.organization ?? "") === normalizedOrg &&
        isWorkerUser(entry)
      );
      if (duplicate) {
        if (workersAddMessageEl) workersAddMessageEl.textContent = "Такой рабочий уже есть.";
        return;
      }
      nextUsers.push({
        telegram_id: workerTelegramIdMarker,
        full_name: fullName,
        organization: selectedUsersOrgName,
        role: workerRole,
        position,
      });
      await saveJson(usersFilePath, { users: nextUsers }, { user });
      usersState.users = nextUsers;
      updateWorkersView();
      if (workersAddMessageEl) workersAddMessageEl.textContent = "Рабочий сохранён.";
      setTimeout(closeWorkersAddModal, 450);
    } catch (error) {
      console.error(error);
      if (workersAddMessageEl) {
        workersAddMessageEl.textContent = "Не удалось сохранить рабочего. Проверьте сервер.";
      }
    }
  });

  usersDetailsBackdropEl?.addEventListener("click", closeUsersDetailsModal);
  usersDetailsCloseButton?.addEventListener("click", closeUsersDetailsModal);
  usersVacationBackdropEl?.addEventListener("click", closeUsersVacationModal);
  usersVacationCloseButton?.addEventListener("click", closeUsersVacationModal);
  usersVacationTriggerButton?.addEventListener("click", () => {
    usersVacationReplaceBox?.classList.remove("is-hidden");
    setVacationMessage("");
  });
  usersVacationCancelButton?.addEventListener("click", () => {
    usersVacationReplaceBox?.classList.add("is-hidden");
    setVacationMessage("");
  });
  usersVacationReturnButton?.addEventListener("click", returnResponsibleFromVacation);
  usersVacationReplacerSearchInput?.addEventListener("input", () => {
    let options = [];
    try {
      options = JSON.parse(usersVacationReplacerSelect?.dataset.available ?? "[]");
    } catch (error) {
      options = [];
    }
    renderVacationSearchResults(options, usersVacationReplacerSearchInput.value);
    void updateVacationReplacerPendingNote();
  });
  usersVacationReplacerSearchInput?.addEventListener("focus", () => {
    let options = [];
    try {
      options = JSON.parse(usersVacationReplacerSelect?.dataset.available ?? "[]");
    } catch (error) {
      options = [];
    }
    renderVacationSearchResults(options, usersVacationReplacerSearchInput.value);
  });
  usersVacationReplacerSearchInput?.addEventListener("blur", () => {
    window.setTimeout(() => {
      usersVacationSearchResultsEl?.classList.add("is-hidden");
    }, 120);
  });
  usersVacationReplacerSelect?.addEventListener("change", () => {
    void updateVacationReplacerPendingNote();
  });
  usersVacationConfirmButton?.addEventListener("click", applyResponsibleVacation);
  usersAddButton?.addEventListener("click", openUsersAddModal);
  usersEditBackdropEl?.addEventListener("click", closeUsersEditModal);
  usersEditCloseButton?.addEventListener("click", closeUsersEditModal);
  usersEditCancelButton?.addEventListener("click", closeUsersEditModal);
  usersAddBackdropEl?.addEventListener("click", closeUsersAddModal);
  usersAddCloseButton?.addEventListener("click", closeUsersAddModal);
  usersAddCancelButton?.addEventListener("click", closeUsersAddModal);
  if (usersInviteShareButton) usersInviteShareButton.disabled = true;
  if (usersInviteCopyButton) usersInviteCopyButton.disabled = true;
  if (usersInviteOpenButton) usersInviteOpenButton.disabled = true;
  usersInviteShareButton?.addEventListener("click", () => {
    const link = usersInviteLinkEl?.value?.trim();
    if (!link) return;
    const shareText =
      usersInviteBox?.dataset.shareText ??
      "Контакт ответственного. Отправляю ссылку для регистрации.";
    const telegramShareUrl = new URL("https://t.me/share/url");
    telegramShareUrl.searchParams.set("url", link);
    telegramShareUrl.searchParams.set("text", shareText);
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(telegramShareUrl.href);
    } else {
      window.open(telegramShareUrl.href, "_blank", "noopener");
    }
  });
  usersInviteOpenButton?.addEventListener("click", () => {
    const webLink = usersInviteBox?.dataset.telegramLink?.trim();
    const appLink = usersInviteBox?.dataset.telegramAppLink?.trim();
    if (!webLink && !appLink) return;
    if (window.Telegram?.WebApp?.openTelegramLink && webLink) {
      window.Telegram.WebApp.openTelegramLink(webLink);
    } else {
      window.location.href = appLink || webLink;
    }
  });
  usersInviteCopyButton?.addEventListener("click", async () => {
    if (!usersInviteLinkEl?.value) return;
    try {
      await navigator.clipboard.writeText(usersInviteLinkEl.value);
      if (usersInviteNoteEl) {
        usersInviteNoteEl.textContent = "Ссылка скопирована в буфер.";
      }
    } catch (error) {
      usersInviteLinkEl.select();
      document.execCommand("copy");
      if (usersInviteNoteEl) {
        usersInviteNoteEl.textContent = "Ссылка выделена для копирования.";
      }
    }
  });

  if (usersAddInviteShareButton) usersAddInviteShareButton.disabled = true;
  if (usersAddInviteCopyButton) usersAddInviteCopyButton.disabled = true;
  if (usersAddInviteOpenButton) usersAddInviteOpenButton.disabled = true;
  usersAddInviteShareButton?.addEventListener("click", () => {
    const link = usersAddInviteLinkEl?.value?.trim();
    if (!link) return;
    const shareText =
      usersAddInviteBox?.dataset.shareText ??
      "Контакт пользователя. Отправляю ссылку для регистрации.";
    const telegramShareUrl = new URL("https://t.me/share/url");
    telegramShareUrl.searchParams.set("url", link);
    telegramShareUrl.searchParams.set("text", shareText);
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(telegramShareUrl.href);
    } else {
      window.open(telegramShareUrl.href, "_blank", "noopener");
    }
  });
  usersAddInviteOpenButton?.addEventListener("click", () => {
    const webLink = usersAddInviteBox?.dataset.telegramLink?.trim();
    const appLink = usersAddInviteBox?.dataset.telegramAppLink?.trim();
    if (!webLink && !appLink) return;
    if (window.Telegram?.WebApp?.openTelegramLink && webLink) {
      window.Telegram.WebApp.openTelegramLink(webLink);
    } else {
      window.location.href = appLink || webLink;
    }
  });
  usersAddInviteCopyButton?.addEventListener("click", async () => {
    if (!usersAddInviteLinkEl?.value) return;
    try {
      await navigator.clipboard.writeText(usersAddInviteLinkEl.value);
      if (usersAddInviteNoteEl) {
        usersAddInviteNoteEl.textContent = "Ссылка скопирована в буфер.";
      }
    } catch (error) {
      usersAddInviteLinkEl.select();
      document.execCommand("copy");
      if (usersAddInviteNoteEl) {
        usersAddInviteNoteEl.textContent = "Ссылка выделена для копирования.";
      }
    }
  });

  const readUsersEditDraft = () => {
    if (!usersEditFormEl) return null;
    const formData = new FormData(usersEditFormEl);
    const fullName = buildPersonFullName(
      formData.get("users-edit-last-name"),
      formData.get("users-edit-first-name"),
      formData.get("users-edit-middle-name")
    );
    const roleName = String(formData.get("users-edit-role") ?? "").trim();
    const positionName = String(formData.get("users-edit-position") ?? "").trim();
    const userIndex = Number(formData.get("users-edit-index"));
    const sourceUser = Number.isInteger(userIndex) ? usersState.users[userIndex] : null;
    const organizationName = String(
      sourceUser?.organization ?? selectedUsersOrgDisplayName ?? selectedUsersOrgName ?? ""
    ).trim();
    return { fullName, roleName, positionName, organizationName, sourceUser };
  };

  const createInviteFromUsersEdit = async () => {
    if (!usersEditFormEl) return;
    const draft = readUsersEditDraft();
    if (!draft?.fullName || !draft.roleName || !draft.organizationName) {
      if (usersEditMessageEl) {
        usersEditMessageEl.textContent = "Заполните ФИО, роль и организацию для новой ссылки.";
      }
      return;
    }
    try {
      if (usersEditMessageEl) {
        usersEditMessageEl.textContent = "Создаём новую ссылку для перепривязки...";
      }
      const registrationsData = await loadRegistrations();
      const registrations = registrationsData.registrations ?? [];
      const registrationToken = createRegistrationToken();
      const registrationsWithoutUser = registrations.filter(
        (item) =>
          !(item.user?.full_name === draft.fullName &&
            item.user?.organization === draft.organizationName &&
            item.user?.role === draft.roleName)
      );
      await saveJson(pendingRegistrationsFilePath, {
        registrations: [
          ...registrationsWithoutUser,
          {
            token: registrationToken,
            created_at: new Date().toISOString(),
            user: {
              full_name: draft.fullName,
              organization: draft.organizationName,
              role: draft.roleName,
              position: draft.positionName,
            },
          },
        ],
      }, { user });

      const registrationLink = new URL(`${window.location.origin}${window.location.pathname}`);
      registrationLink.searchParams.set("registration", registrationToken);
      const botUsername = await resolveBotUsername();
      const telegramLinks = buildTelegramRegistrationLinks(botUsername, registrationToken);
      const fallbackLink = telegramLinks?.webLink ?? registrationLink.href;
      if (usersInviteHintEl) usersInviteHintEl.textContent = "Новая ссылка для перепривязки готова.";
      if (usersInviteLinkEl) usersInviteLinkEl.value = fallbackLink;
      if (usersInviteNoteEl) {
        usersInviteNoteEl.textContent = telegramLinks?.webLink
          ? "Отправьте ссылку пользователю: при открытии в Telegram ID перепривяжется автоматически."
          : "Бот ещё не указан. Скопируйте ссылку и отправьте её вручную.";
      }
      if (usersInviteBox) {
        usersInviteBox.dataset.shareText = `Контакт пользователя: ${draft.fullName}. Роль: ${draft.roleName}. Организация: ${draft.organizationName}.`;
        usersInviteBox.dataset.telegramLink = fallbackLink;
        if (telegramLinks?.appLink) {
          usersInviteBox.dataset.telegramAppLink = telegramLinks.appLink;
        } else {
          delete usersInviteBox.dataset.telegramAppLink;
        }
        usersInviteBox.classList.remove("is-hidden");
      }
      if (usersInviteShareButton) usersInviteShareButton.disabled = !usersInviteLinkEl?.value;
      if (usersInviteCopyButton) usersInviteCopyButton.disabled = !usersInviteLinkEl?.value;
      if (usersInviteOpenButton) {
        usersInviteOpenButton.disabled = !usersInviteLinkEl?.value;
        usersInviteOpenButton.textContent = telegramLinks?.webLink ? "Открыть в Telegram" : "Открыть ссылку";
      }
      if (usersEditMessageEl) {
        usersEditMessageEl.textContent = "Ссылка готова. При необходимости сохраните пустой Telegram ID, чтобы отвязать старый.";
      }
    } catch (error) {
      console.error(error);
      if (usersEditMessageEl) {
        usersEditMessageEl.textContent = "Не удалось создать ссылку. Попробуйте позже.";
      }
    }
  };

  const buildUserDeleteBlockers = async (orgFolderName, fullName) => {
    const targetName = normalizePersonName(fullName);
    if (!orgFolderName || !targetName) return { moves: [], tools: [] };
    const [rawMoves, rawToolsPrimary, rawToolsLegacy] = await Promise.all([
      loadJson(`./${orgFolderName}/Перемещения.json`).catch(() => []),
      loadJson(`./${orgFolderName}/База с инструментами.json`).catch(() => []),
      loadJson(`./${orgFolderName}/База инструментов.json`).catch(() => []),
    ]);
    const moves = (Array.isArray(rawMoves) ? rawMoves : Array.isArray(rawMoves?.moves) ? rawMoves.moves : []).filter((move) => {
      const receiver = normalizePersonName(move?.["Принял"] ?? "");
      const answerDate = String(move?.["Дата ответа"] ?? "").trim();
      return receiver === targetName && !answerDate;
    });
    const tools = [...normalizeToolsData(rawToolsPrimary), ...normalizeToolsData(rawToolsLegacy)].filter((tool) => {
      return normalizePersonName(tool?.["Ответственный"] ?? "") === targetName;
    });
    return { moves, tools };
  };

  const getUserDeleteItemCost = (item) => normalizeCostValue(item?.["Стоимость"]);
  const formatUserDeleteItemCost = (item) => {
    const cost = getUserDeleteItemCost(item);
    return Number.isFinite(cost) ? `${formatNotificationCostWithoutCurrency(cost)} р.` : "стоимость не указана";
  };
  const getUserDeleteItemsTotalCost = (items = []) =>
    items.reduce((sum, item) => {
      const cost = getUserDeleteItemCost(item);
      return sum + (Number.isFinite(cost) ? cost : 0);
    }, 0);

  const formatUserDeleteBlockers = ({ moves, tools }) => {
    const lines = ["Удалить из базы пользователя невозможно, так как на нём ещё есть данные:"];
    if (moves.length) {
      lines.push("", `Перемещения на принятии · сумма: ${formatNotificationCostWithoutCurrency(getUserDeleteItemsTotalCost(moves))} р.:`);
      moves.slice(0, 12).forEach((move) => {
        lines.push(`• №${move?.["Номер"] ?? "—"} · бух. №${move?.["Бух.номер"] ?? "—"} · ${move?.["Наименование"] ?? move?.["Новый объект"] ?? "без описания"} · ${formatUserDeleteItemCost(move)}`);
      });
      if (moves.length > 12) lines.push(`• ещё ${moves.length - 12}`);
    }
    if (tools.length) {
      lines.push("", `Инструменты в базе · сумма: ${formatNotificationCostWithoutCurrency(getUserDeleteItemsTotalCost(tools))} р.:`);
      tools.slice(0, 12).forEach((tool) => {
        lines.push(`• №${tool?.["Номер"] ?? "—"} · бух. №${tool?.["Бух.номер"] ?? "—"} · ${tool?.["Наименование"] ?? "без названия"} · ${formatUserDeleteItemCost(tool)}`);
      });
      if (tools.length > 12) lines.push(`• ещё ${tools.length - 12}`);
    }
    return lines.join("\n");
  };

  const openUsersDeleteBlockedModal = ({ moves = [], tools = [] } = {}) => {
    let modalEl = contentEl.querySelector("[data-users-delete-blocked-modal]");
    if (!modalEl) {
      modalEl = document.createElement("div");
      modalEl.className = "settings-modal users-delete-blocked-modal is-hidden";
      modalEl.dataset.usersDeleteBlockedModal = "";
      modalEl.innerHTML = `
        <div class="settings-modal__backdrop users-delete-blocked-modal__backdrop" data-users-delete-blocked-close></div>
        <div class="settings-modal__panel users-delete-blocked-modal__panel" role="alertdialog" aria-modal="true" aria-labelledby="users-delete-blocked-title">
          <div class="users-delete-blocked-modal__icon" aria-hidden="true">!</div>
          <div class="users-delete-blocked-modal__content">
            <p class="users-delete-blocked-modal__eyebrow">Удаление недоступно</p>
            <h2 class="users-delete-blocked-modal__title" id="users-delete-blocked-title">У пользователя ещё есть данные</h2>
            <p class="users-delete-blocked-modal__text">Перед удалением завершите перемещения на принятии и переназначьте инструменты.</p>
            <div class="users-delete-blocked-modal__summary" data-users-delete-blocked-summary></div>
          </div>
          <button class="action-primary users-delete-blocked-modal__button" type="button" data-users-delete-blocked-close>Понятно</button>
        </div>`;
      contentEl.appendChild(modalEl);
      modalEl.querySelectorAll("[data-users-delete-blocked-close]").forEach((button) => {
        button.addEventListener("click", () => modalEl.classList.add("is-hidden"));
      });
      modalEl.addEventListener("keydown", (event) => {
        if (event.key === "Escape") modalEl.classList.add("is-hidden");
      });
    }
    const summaryEl = modalEl.querySelector("[data-users-delete-blocked-summary]");
    if (summaryEl) {
      summaryEl.innerHTML = "";
      [
        { title: "Перемещения на принятии", count: moves.length, items: moves, icon: "↔", getText: (move) => `№${move?.["Номер"] ?? "—"} · бух. №${move?.["Бух.номер"] ?? "—"} · ${move?.["Наименование"] ?? move?.["Новый объект"] ?? "без описания"}` },
        { title: "Инструменты в базе", count: tools.length, items: tools, icon: "🧰", getText: (tool) => `№${tool?.["Номер"] ?? "—"} · бух. №${tool?.["Бух.номер"] ?? "—"} · ${tool?.["Наименование"] ?? "без названия"}` },
      ].filter((section) => section.count).forEach((section) => {
        const sectionEl = document.createElement("section");
        sectionEl.className = "users-delete-blocked-modal__section";
        const hiddenCount = Math.max(section.count - 4, 0);
        const sectionTotalCost = getUserDeleteItemsTotalCost(section.items);
        sectionEl.innerHTML = `
          <div class="users-delete-blocked-modal__section-head">
            <span class="users-delete-blocked-modal__section-icon" aria-hidden="true">${section.icon}</span>
            <strong>${section.title}</strong>
            <span>${section.count}</span>
          </div>
          <div class="users-delete-blocked-modal__section-total">Общая стоимость: <b>${formatNotificationCostWithoutCurrency(sectionTotalCost)} р.</b></div>
          <ul class="users-delete-blocked-modal__list"></ul>`;
        const listEl = sectionEl.querySelector(".users-delete-blocked-modal__list");
        const renderItems = (isExpanded = false) => {
          listEl.innerHTML = "";
          section.items.slice(0, isExpanded ? section.items.length : 4).forEach((item) => {
            const itemEl = document.createElement("li");
            const textEl = document.createElement("span");
            textEl.textContent = section.getText(item);
            const costEl = document.createElement("b");
            costEl.textContent = formatUserDeleteItemCost(item);
            itemEl.append(textEl, costEl);
            listEl.appendChild(itemEl);
          });
          if (hiddenCount && !isExpanded) {
            const moreItemEl = document.createElement("li");
            moreItemEl.className = "users-delete-blocked-modal__more-item";
            const moreButtonEl = document.createElement("button");
            moreButtonEl.className = "users-delete-blocked-modal__more";
            moreButtonEl.type = "button";
            moreButtonEl.textContent = `И ещё ${hiddenCount}`;
            moreButtonEl.setAttribute("aria-label", `Показать ещё ${hiddenCount} элементов в разделе ${section.title}`);
            moreButtonEl.addEventListener("click", () => renderItems(true));
            moreItemEl.appendChild(moreButtonEl);
            listEl.appendChild(moreItemEl);
          }
        };
        renderItems();
        summaryEl.appendChild(sectionEl);
      });
    }
    modalEl.classList.remove("is-hidden");
    modalEl.querySelector("[data-users-delete-blocked-close]:last-child")?.focus();
  };

  const deleteUsersEditUser = async () => {
    if (!usersEditFormEl) return;
    const formData = new FormData(usersEditFormEl);
    const userIndex = Number(formData.get("users-edit-index"));
    if (!Number.isInteger(userIndex) || userIndex < 0) {
      if (usersEditMessageEl) usersEditMessageEl.textContent = "Не удалось определить пользователя.";
      return;
    }
    try {
      if (usersEditMessageEl) usersEditMessageEl.textContent = "Проверяем перемещения и инструменты...";
      const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
      const nextUsers = Array.isArray(usersData?.users) ? [...usersData.users] : [];
      const removableUser = nextUsers[userIndex];
      if (!removableUser) throw new Error("Пользователь не найден");
      const fullName = String(removableUser?.full_name ?? "").trim();
      const blockers = await buildUserDeleteBlockers(context.orgFolderName, fullName);
      if (blockers.moves.length || blockers.tools.length) {
        const warning = formatUserDeleteBlockers(blockers);
        openUsersDeleteBlockedModal(blockers);
        if (usersEditMessageEl) usersEditMessageEl.textContent = warning;
        return;
      }
      const approved = window.confirm(`Удалить пользователя ${formatFullName(fullName)} из базы? Это действие нельзя отменить.`);
      if (!approved) {
        if (usersEditMessageEl) usersEditMessageEl.textContent = "Удаление отменено.";
        return;
      }
      nextUsers.splice(userIndex, 1);
      await saveJson(usersFilePath, { ...usersData, users: nextUsers }, { user });
      usersState.users = nextUsers;
      updateUsersNameSuggestions(nextUsers);
      updateUsersDetailsView();
      if (usersEditMessageEl) usersEditMessageEl.textContent = "Пользователь удалён.";
      setTimeout(closeUsersEditModal, 350);
    } catch (error) {
      console.error(error);
      if (usersEditMessageEl) usersEditMessageEl.textContent = "Не удалось удалить пользователя. Попробуйте позже.";
    }
  };

  usersEditClearTelegramButton?.addEventListener("click", () => {
    const telegramInput = usersEditFormEl?.elements?.["users-edit-telegram-id"];
    if (telegramInput) {
      telegramInput.value = "";
      telegramInput.focus();
    }
    if (usersEditMessageEl) {
      usersEditMessageEl.textContent = "Telegram ID очищен. Нажмите «Сохранить», чтобы отвязать пользователя.";
    }
  });
  usersEditCreateInviteButton?.addEventListener("click", createInviteFromUsersEdit);
  usersEditDeleteButton?.addEventListener("click", deleteUsersEditUser);

  usersEditFormEl?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!usersEditFormEl) return;
    if (usersEditMessageEl) usersEditMessageEl.textContent = "Сохраняем изменения...";
    const formData = new FormData(usersEditFormEl);
    const userIndex = Number(formData.get("users-edit-index"));
    const fullName = buildPersonFullName(
      formData.get("users-edit-last-name"),
      formData.get("users-edit-first-name"),
      formData.get("users-edit-middle-name")
    );
    const roleName = String(formData.get("users-edit-role") ?? "").trim();
    const positionName = String(formData.get("users-edit-position") ?? "").trim();
    const telegramId = String(formData.get("users-edit-telegram-id") ?? "").trim();
    if (!fullName || !roleName || !Number.isInteger(userIndex) || userIndex < 0) {
      if (usersEditMessageEl) usersEditMessageEl.textContent = "Заполните фамилию, имя и роль.";
      return;
    }
    const sourceUser = Number.isInteger(userIndex) ? usersState.users[userIndex] : null;
    const previousTelegramId = String(sourceUser?.telegram_id ?? "").trim();
    if (telegramId !== previousTelegramId) {
      const previousLabel = previousTelegramId || "пусто";
      const nextLabel = telegramId || "пусто";
      const approvedTelegramChange = window.confirm(
        `Подтвердите изменение Telegram ID: ${previousLabel} → ${nextLabel}. Продолжить?`
      );
      if (!approvedTelegramChange) {
        if (usersEditMessageEl) {
          usersEditMessageEl.textContent = "Изменение Telegram ID отменено.";
        }
        return;
      }
    }
    try {
      const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
      const nextUsers = Array.isArray(usersData?.users) ? [...usersData.users] : [];
      if (!nextUsers[userIndex]) throw new Error("Пользователь не найден");
      const previousFullName = String(nextUsers[userIndex]?.full_name ?? "").trim();
      nextUsers[userIndex] = {
        ...nextUsers[userIndex],
        full_name: fullName,
        role: roleName,
        position: positionName,
        telegram_id: telegramId,
      };
      const nameReplacementEntries = await buildOrganizationNameReplacementEntries(
        context.orgFolderName,
        previousFullName,
        fullName,
        { user }
      );
      await saveJsonBatch([
        { path: usersFilePath, data: { ...usersData, users: nextUsers }, user },
        ...nameReplacementEntries,
      ]);
      usersState.users = nextUsers;
      updateUsersNameSuggestions(nextUsers);
      updateUsersDetailsView();
      if (usersEditMessageEl) usersEditMessageEl.textContent = "Данные пользователя сохранены.";
      setTimeout(closeUsersEditModal, 450);
    } catch (error) {
      console.error(error);
      if (usersEditMessageEl) usersEditMessageEl.textContent = "Не удалось сохранить пользователя. Попробуйте позже.";
    }
  });

  usersAddFormEl?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (usersAddMessageEl) {
      usersAddMessageEl.textContent = "Сохраняем данные...";
    }
    const formData = new FormData(usersAddFormEl);
    const lastName = String(formData.get("users-add-last-name") ?? "").trim();
    const firstName = String(formData.get("users-add-first-name") ?? "").trim();
    const middleName = String(formData.get("users-add-middle-name") ?? "").trim();
    const roleName = String(formData.get("users-add-role") ?? "").trim();
    const positionName = String(formData.get("users-add-position") ?? "").trim();
    const organizationName = String(selectedUsersOrgName ?? "").trim();

    if (!organizationName) {
      if (usersAddMessageEl) {
        usersAddMessageEl.textContent = "Сначала выберите организацию.";
      }
      return;
    }

    if (!lastName || !firstName || !middleName || !roleName || !positionName) {
      if (usersAddMessageEl) {
        usersAddMessageEl.textContent = "Заполните все поля.";
      }
      return;
    }

    try {
      const [usersData, registrationsData] = await Promise.all([
        loadJson(usersFilePath),
        loadRegistrations(),
      ]);

      const fullName = `${lastName} ${firstName} ${middleName}`.trim();
      const nextUsersData = {
        users: [...(usersData.users ?? [])],
      };
      const existingUser = nextUsersData.users.find(
        (item) =>
          item.full_name === fullName &&
          item.organization === organizationName &&
          item.role === roleName
      );

      if (!existingUser) {
        nextUsersData.users.push({
          telegram_id: 0,
          full_name: fullName,
          organization: organizationName,
          role: roleName,
          position: positionName,
        });
      } else {
        existingUser.position = positionName;
      }

      const registrations = registrationsData.registrations ?? [];
      const existingRegistration = registrations.find(
        (item) =>
          item.user?.full_name === fullName &&
          item.user?.organization === organizationName &&
          item.user?.role === roleName
      );
      const registrationToken =
        existingRegistration?.token ?? createRegistrationToken();

      const nextRegistrationsData = existingRegistration
        ? {
            registrations: registrations.map((item) => {
              if (item !== existingRegistration) return item;
              return {
                ...item,
                user: {
                  ...(item.user ?? {}),
                  full_name: fullName,
                  organization: organizationName,
                  role: roleName,
                  position: positionName,
                },
              };
            }),
          }
        : {
            registrations: [
              ...registrations,
              {
                token: registrationToken,
                created_at: new Date().toISOString(),
                user: {
                  full_name: fullName,
                  organization: organizationName,
                  role: roleName,
                  position: positionName,
                },
              },
            ],
          };

      await saveEntries([
        { path: usersFilePath, data: nextUsersData },
        { path: pendingRegistrationsFilePath, data: nextRegistrationsData },
      ]);

      usersState.users = nextUsersData.users;
      updateUsersDetailsView();

      const registrationLink = new URL(
        `${window.location.origin}${window.location.pathname}`
      );
      registrationLink.searchParams.set("registration", registrationToken);
      const botUsername = await resolveBotUsername();
      const telegramLinks = buildTelegramRegistrationLinks(
        botUsername,
        registrationToken
      );
      const fallbackLink = telegramLinks?.webLink ?? registrationLink.href;

      if (usersAddMessageEl) {
        usersAddMessageEl.textContent = "Ссылка приглашения готова.";
      }
      if (usersAddInviteHintEl) {
        usersAddInviteHintEl.textContent = "Ссылка для приглашения готова.";
      }
      if (usersAddInviteLinkEl) {
        usersAddInviteLinkEl.value = fallbackLink;
      }
      if (usersAddInviteNoteEl) {
        usersAddInviteNoteEl.textContent = telegramLinks?.webLink
          ? "При открытии в Telegram ID сохранится автоматически."
          : "Бот ещё не указан. Скопируйте ссылку и отправьте её вручную.";
      }
      if (usersAddInviteBox) {
        usersAddInviteBox.dataset.shareText = `Контакт пользователя: ${fullName}. Роль: ${roleName}. Организация: ${organizationName}.`;
        usersAddInviteBox.dataset.telegramLink = fallbackLink;
        if (telegramLinks?.appLink) {
          usersAddInviteBox.dataset.telegramAppLink = telegramLinks.appLink;
        } else {
          delete usersAddInviteBox.dataset.telegramAppLink;
        }
        usersAddInviteBox.classList.remove("is-hidden");
      }
      if (usersAddInviteShareButton) {
        usersAddInviteShareButton.disabled = !usersAddInviteLinkEl?.value;
      }
      if (usersAddInviteCopyButton) {
        usersAddInviteCopyButton.disabled = !usersAddInviteLinkEl?.value;
      }
      if (usersAddInviteOpenButton) {
        usersAddInviteOpenButton.disabled = !usersAddInviteLinkEl?.value;
        usersAddInviteOpenButton.textContent = telegramLinks?.webLink
          ? "Открыть в Telegram"
          : "Открыть ссылку";
      }
      updateUsersNameSuggestions(nextUsersData.users);
    } catch (error) {
      console.error(error);
      if (usersAddMessageEl) {
        usersAddMessageEl.textContent =
          "Не удалось сохранить данные. Попробуйте позже.";
      }
    }
  });

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

  if (allowGrouping && pendingGroupingStart) {
    setGroupingState(true);
    pendingGroupingStart = false;
  }

  const saveLayout = async () => {
    const layout = buildEnergyLayoutFromDom(gridEl);
    const userSettings = settingsData.users?.[context.userKey] ?? {};
    settingsData.users[context.userKey] = {
      ...userSettings,
      energy: {
        ...(userSettings.energy ?? {}),
        layout,
        layoutCustomized: true,
      },
    };
    await saveJson(context.settingsPath, settingsData, { user });
  };

  const queueLayoutSave = () => {
    saveRequested = true;
    saveChain = saveChain
      .then(async () => {
        if (!saveRequested) return;
        saveRequested = false;
        await saveLayout();
      })
      .catch((error) => {
        console.warn("Не удалось сохранить порядок плашек.", error);
      });
  };

  const scheduleLayoutSave = () => {
    queueLayoutSave();
  };

  if (allowGrouping && groupToggle) {
    groupToggle.addEventListener("click", () => {
      setGroupingState(!isGrouping);
    });
  }

  if (allowGrouping && cancelGroupButton) {
    cancelGroupButton.addEventListener("click", () => {
      setGroupingState(false);
    });
  }

  if (allowGrouping && createGroupButton) {
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

  let settingsGroups = [...(organizationSettings.stcGroups ?? [])];
  let settingsMovesTableUsers = [];
  const renderSettingsBody = () => {
    if (!settingsBodyEl) return;
    settingsBodyEl.innerHTML = buildEnergySettingsMarkup({
      ...organizationSettings,
      stcGroups: settingsGroups,
      movesTableUsers: settingsMovesTableUsers,
    });
    const accordionItems = settingsBodyEl.querySelectorAll(
      "[data-settings-accordion]"
    );
    accordionItems.forEach((accordion) => {
      const toggle = accordion.querySelector("[data-settings-accordion-toggle]");
      if (!toggle) return;
      const isInitiallyOpen = false;
      accordion.classList.toggle("is-open", isInitiallyOpen);
      toggle.setAttribute("aria-expanded", String(isInitiallyOpen));
      toggle.addEventListener("click", () => {
        const nextState = !accordion.classList.contains("is-open");
        accordion.classList.toggle("is-open", nextState);
        toggle.setAttribute("aria-expanded", String(nextState));
      });
    });

    const updateSelectAllButtons = () => {
      const toolbarButtons = settingsBodyEl.querySelectorAll("[data-settings-select-all]");
      toolbarButtons.forEach((button) => {
        const toolbar = button.closest("[data-settings-choice-toolbar]");
        const list = toolbar?.nextElementSibling;
        const inputs = Array.from(list?.querySelectorAll('input[type="checkbox"]') ?? []);
        const hasInputs = inputs.length > 0;
        const allChecked = hasInputs && inputs.every((input) => input.checked);
        button.textContent = allChecked
          ? button.dataset.settingsClearLabel || "Снять все"
          : button.dataset.settingsSelectLabel || "Выбрать все";
        button.classList.toggle("is-clear", allChecked);
        button.disabled = !hasInputs;
      });
    };
    settingsBodyEl.querySelectorAll("[data-settings-select-all]").forEach((button) => {
      button.addEventListener("click", () => {
        const toolbar = button.closest("[data-settings-choice-toolbar]");
        const list = toolbar?.nextElementSibling;
        const inputs = Array.from(list?.querySelectorAll('input[type="checkbox"]') ?? []);
        const shouldCheck = inputs.some((input) => !input.checked);
        inputs.forEach((input) => {
          input.checked = shouldCheck;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        });
        updateSelectAllButtons();
      });
    });
    settingsBodyEl.addEventListener("change", (event) => {
      if (event.target?.matches?.('input[type="checkbox"]')) {
        updateSelectAllButtons();
      }
    });
    updateSelectAllButtons();
    const accessRoles = settingsBodyEl.querySelectorAll("[data-access-role]");
    accessRoles.forEach((role) => {
      const toggle = role.querySelector("[data-access-role-toggle]");
      if (!toggle) return;
      role.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.addEventListener("click", () => {
        const nextState = !role.classList.contains("is-open");
        role.classList.toggle("is-open", nextState);
        toggle.setAttribute("aria-expanded", String(nextState));
      });
    });
    const groupInput = settingsBodyEl.querySelector("[data-energy-group-input]");
    const groupAddButton = settingsBodyEl.querySelector(
      "[data-energy-group-add]"
    );
    const groupList = settingsBodyEl.querySelector("[data-energy-group-list]");

    const syncMailingGroupLists = () => {
      const groupLists = settingsBodyEl.querySelectorAll(
        "[data-mailing-tool-groups]"
      );
      groupLists.forEach((list) => {
        const mailingId = list.dataset.mailingId;
        if (!mailingId) return;
        const checkedGroups = new Set(
          Array.from(list.querySelectorAll("input[type=\"checkbox\"]"))
            .filter((input) => input.checked)
            .map((input) => input.value)
        );
        const groupChips =
          settingsGroups.length > 0
            ? settingsGroups
                .map(
                  (group) => `
                    <label class="settings-group-chip">
                      <input
                        type="checkbox"
                        name="mailing-${mailingId}-tool-groups"
                        value="${escapeHtml(group)}"
                        ${checkedGroups.has(group) ? "checked" : ""}
                      />
                      <span>${escapeHtml(group)}</span>
                    </label>
                  `
                )
                .join("")
            : `<span class="settings-chip is-muted">Нет групп инструментов</span>`;
        list.innerHTML = groupChips;
      });
    };

    const renderGroupList = () => {
      if (!groupList) return;
      const listMarkup =
        settingsGroups.length > 0
          ? settingsGroups
              .map(
                (name) => `
                  <button
                    type="button"
                    class="settings-group-card"
                    data-energy-group-chip
                    data-group-name="${escapeHtml(name)}"
                  >
                    <span class="settings-group-card__name">${escapeHtml(name)}</span>
                    <span class="settings-group-card__remove" aria-hidden="true">✕</span>
                  </button>
                `
              )
              .join("")
          : `<span class="settings-chip is-muted">Список пуст</span>`;
      groupList.innerHTML = listMarkup;
      syncMailingGroupLists();
    };

    const addGroup = () => {
      const value = String(groupInput?.value ?? "").trim();
      if (!value) return;
      if (!settingsGroups.includes(value)) {
        settingsGroups = [...settingsGroups, value];
      }
      if (groupInput) groupInput.value = "";
      renderGroupList();
    };

    if (groupAddButton) {
      groupAddButton.addEventListener("click", addGroup);
    }
    if (groupInput) {
      groupInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          addGroup();
        }
      });
    }
    if (groupList) {
      groupList.addEventListener("click", (event) => {
        const chip = event.target.closest("[data-energy-group-chip]");
        if (!chip) return;
        const name = chip.dataset.groupName;
        settingsGroups = settingsGroups.filter((item) => item !== name);
        renderGroupList();
      });
    }

    const syncCardState = (input) => {
      if (!input?.matches('input[type="checkbox"]')) return;
      if (!/(^fine-.*-enabled$|^mailing-.*-enabled$|^notification-.*-enabled$)/.test(input.name)) {
        return;
      }
      const card = input.closest("[data-settings-card]");
      if (!card) return;
      card.classList.toggle("is-disabled", !input.checked);
    };

    settingsBodyEl
      .querySelectorAll('input[type="checkbox"]')
      .forEach((input) => syncCardState(input));

    const syncMovesTableScheduleDays = () => {
      const scheduleType = settingsBodyEl.querySelector('input[name="moves-table-schedule-type"]:checked')?.value === "weekDays"
        ? "weekDays"
        : "monthDays";
      const monthDaysBox = settingsBodyEl.querySelector("[data-moves-table-month-days]");
      const weekDaysBox = settingsBodyEl.querySelector("[data-moves-table-week-days]");
      if (monthDaysBox) monthDaysBox.hidden = scheduleType !== "monthDays";
      if (weekDaysBox) weekDaysBox.hidden = scheduleType !== "weekDays";
    };
    settingsBodyEl
      .querySelectorAll('input[name="moves-table-schedule-type"]')
      .forEach((input) => input.addEventListener("change", syncMovesTableScheduleDays));
    syncMovesTableScheduleDays();

    const setMovesTableRecipientsChecked = (checked) => {
      settingsBodyEl
        .querySelectorAll('input[name="moves-table-recipients"]')
        .forEach((input) => {
          input.checked = checked;
        });
    };

    const selectAllMovesTableRecipients = settingsBodyEl.querySelector("[data-moves-table-select-all]");
    selectAllMovesTableRecipients?.addEventListener("click", () => {
      setMovesTableRecipientsChecked(true);
    });

    const clearAllMovesTableRecipients = settingsBodyEl.querySelector("[data-moves-table-clear-all]");
    clearAllMovesTableRecipients?.addEventListener("click", () => {
      setMovesTableRecipientsChecked(false);
    });

    const getMovesTableColumnOptions = () =>
      energyMovesTableColumnOptions.filter((option) =>
        organizationSettings.dataUsage?.object !== false || !["oldObject", "newObject"].includes(option.id)
      );

    const buildMovesTableColumnControl = (value, index) => {
      const options = getMovesTableColumnOptions();
      const selectedOption = options.find((option) => option.id === value);
      return `
        <div class="settings-moves-column" data-moves-table-column-wrap>
          <span>Столбец ${String.fromCharCode(65 + index)}</span>
          <input type="hidden" name="moves-table-columns" value="${escapeHtml(value)}" data-moves-table-column />
          <button class="settings-moves-column-select__trigger" type="button" data-moves-table-column-trigger aria-expanded="false">
            <span data-moves-table-column-label>${escapeHtml(selectedOption?.title ?? "Не заполнять")}</span>
            <span class="settings-moves-column-select__chevron" aria-hidden="true">⌄</span>
          </button>
          <div class="settings-moves-column-select__menu" data-moves-table-column-menu>
            <button class="settings-moves-column-select__option ${value ? "" : "is-selected"}" type="button" data-moves-table-column-option="">Не заполнять</button>
            ${options.map((option) => `
              <button class="settings-moves-column-select__option ${option.id === value ? "is-selected" : ""}" type="button" data-moves-table-column-option="${option.id}">${escapeHtml(option.title)}</button>
            `).join("")}
          </div>
        </div>
      `;
    };

    const closeMovesTableColumnMenus = (except = null) => {
      settingsBodyEl.querySelectorAll("[data-moves-table-column-wrap].is-open").forEach((wrap) => {
        if (wrap === except) return;
        wrap.classList.remove("is-open");
        wrap.querySelector("[data-moves-table-column-trigger]")?.setAttribute("aria-expanded", "false");
      });
    };

    const appendMovesTableColumnIfNeeded = () => {
      const columnsBox = settingsBodyEl.querySelector("[data-moves-table-columns]");
      if (!columnsBox) return;
      const selects = Array.from(columnsBox.querySelectorAll("[data-moves-table-column]"));
      const lastSelect = selects.at(-1);
      if (!lastSelect?.value || selects.length >= energyMovesTableColumnOptions.length) return;
      const wrapper = document.createElement("div");
      wrapper.innerHTML = buildMovesTableColumnControl("", selects.length);
      columnsBox.append(wrapper.firstElementChild);
    };

    settingsBodyEl.addEventListener("click", (event) => {
      const trigger = event.target?.closest?.("[data-moves-table-column-trigger]");
      if (trigger) {
        const wrap = trigger.closest("[data-moves-table-column-wrap]");
        const nextOpen = !wrap?.classList.contains("is-open");
        closeMovesTableColumnMenus(wrap);
        wrap?.classList.toggle("is-open", nextOpen);
        trigger.setAttribute("aria-expanded", String(nextOpen));
        return;
      }

      const option = event.target?.closest?.("[data-moves-table-column-option]");
      if (option) {
        const wrap = option.closest("[data-moves-table-column-wrap]");
        const input = wrap?.querySelector("[data-moves-table-column]");
        const label = wrap?.querySelector("[data-moves-table-column-label]");
        if (input) input.value = option.dataset.movesTableColumnOption ?? "";
        if (label) label.textContent = option.textContent.trim() || "Не заполнять";
        wrap?.querySelectorAll("[data-moves-table-column-option]").forEach((item) => item.classList.toggle("is-selected", item === option));
        closeMovesTableColumnMenus();
        appendMovesTableColumnIfNeeded();
        return;
      }

      if (!event.target?.closest?.("[data-moves-table-column-wrap]")) {
        closeMovesTableColumnMenus();
      }
    });

    settingsBodyEl.addEventListener("change", (event) => {
      syncCardState(event.target);
    });
  };

  const openSettingsModal = async () => {
    if (!settingsModalEl) return;
    settingsGroups = [...(organizationSettings.stcGroups ?? [])];
    settingsMovesTableUsers = [];
    settingsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
    settingsMovesTableUsers = getMovesTableRecipientUsers(usersData.users ?? [], context.orgFullName || user?.organization || "");
    renderSettingsBody();
  };

  const closeSettingsModal = () => {
    if (!settingsModalEl) return;
    settingsModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
    if (settingsMessageEl) settingsMessageEl.textContent = "";
  };

  const renderFeedbackFiles = () => {
    if (!feedbackFilesEl || !feedbackPhotosEl) return;
    const files = Array.from(feedbackPhotosEl.files ?? []);
    if (!files.length) {
      feedbackFilesEl.textContent = "Фото не выбраны.";
      return;
    }
    feedbackFilesEl.textContent = files
      .map((file, index) => `${index + 1}. ${file.name}`)
      .join("\n");
  };

  const syncFeedbackAnonymousHint = () => {
    if (!feedbackHintEl || !feedbackAnonymousEl) return;
    feedbackHintEl.textContent = feedbackAnonymousEl.checked
      ? "Обращение отправится анонимно. Ответ от администраторов вы не получите 😔"
      : "Обращение отправится с вашими данными, чтобы вам могли ответить 🙂";
  };

  const closeFeedbackModal = () => {
    if (!feedbackModalEl) return;
    feedbackModalEl.classList.add("is-hidden");
    closeFeedbackDetails();
    document.body.style.overflow = "";
    feedbackFormEl?.reset();
    if (feedbackStatusEl) feedbackStatusEl.textContent = "";
    renderFeedbackFiles();
    syncFeedbackAnonymousHint();
  };

  const openFeedbackModal = () => {
    if (!feedbackModalEl) return;
    feedbackModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    syncFeedbackAnonymousHint();
    renderFeedbackFiles();
  };

  const toggleResponsibleDownloadPicker = (isVisible = false) => {
    if (downloadResponsibleBoxEl) {
      downloadResponsibleBoxEl.classList.toggle("is-hidden", !isVisible);
    }
    if (downloadOptionsGridEl) {
      downloadOptionsGridEl.classList.toggle("is-hidden", isVisible);
    }
    if (downloadMovesBoxEl) {
      downloadMovesBoxEl.classList.add("is-hidden");
    }
    if (downloadSubtitleEl) {
      downloadSubtitleEl.textContent = isVisible
        ? downloadPickerMode === "status"
          ? "Выберите статус для выгрузки"
          : downloadPickerMode === "invoice"
            ? "Выберите инструмент для накладной"
            : "Выберите ответственного для выгрузки"
        : "Выберите раздел для выгрузки";
    }
    if (downloadResponsibleSearchLabelEl) {
      downloadResponsibleSearchLabelEl.textContent =
        downloadPickerMode === "status"
          ? "Выберите статус"
          : downloadPickerMode === "invoice"
            ? "Выберите инструмент"
            : "Выберите ответственного";
    }
    if (downloadResponsibleSearchEl) {
      downloadResponsibleSearchEl.placeholder =
        downloadPickerMode === "status"
          ? "Поиск по статусу"
          : downloadPickerMode === "invoice"
            ? "Поиск по номеру, названию, модели"
            : "Поиск по ФИО";
    }
  };

  const resetResponsibleDownloadPicker = () => {
    downloadPickerMode = "responsible";
    invoiceDownloadItemsCache = [];
    if (downloadResponsibleSearchEl) {
      downloadResponsibleSearchEl.value = "";
    }
    if (downloadResponsibleListEl) {
      downloadResponsibleListEl.innerHTML = "";
    }
    if (downloadMovesStartDateEl) {
      downloadMovesStartDateEl.value = "";
    }
    if (downloadMovesEndDateEl) {
      downloadMovesEndDateEl.value = "";
    }
    downloadMovesVisibleMonthDate = new Date();
    if (downloadMovesBoxEl) {
      downloadMovesBoxEl.classList.add("is-hidden");
    }
    if (downloadResponsibleBoxEl) {
      toggleResponsibleDownloadPicker(false);
    }
    responsibleDownloadToolsCache = [];
  };

  const closeDownloadModal = () => {
    if (!downloadModalEl) return;
    downloadModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
    if (preparedDownloadUrl) {
      URL.revokeObjectURL(preparedDownloadUrl);
      preparedDownloadUrl = "";
    }
    resetResponsibleDownloadPicker();
    if (downloadMessageEl) {
      downloadMessageEl.textContent = "";
    }
  };

  const openDownloadModal = () => {
    if (!downloadModalEl) return;
    downloadModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    resetResponsibleDownloadPicker();
    if (downloadMessageEl) {
      downloadMessageEl.textContent = "";
    }
  };

  const closeInfoModal = () => {
    if (!infoModalEl) return;
    infoModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
  };

  const openInfoModal = () => {
    if (!infoModalEl) return;
    infoModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const closeInfoRepairModal = () => {
    if (!infoRepairModalEl) return;
    infoRepairModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
  };

  const setInfoRepairValue = (key, value) => {
    const element = infoRepairValueEls[key];
    if (element) element.textContent = String(value ?? "—");
  };

  const getRepairToolKey = (entry) => {
    const number = normalizeToolNumberValue(entry?.["Номер"] ?? "");
    const accounting = String(entry?.["Бух.номер"] ?? "").trim().toLowerCase();
    return number ? `n:${number}` : accounting ? `a:${accounting}` : "";
  };

  const buildRepairToolMap = (tools) => {
    const map = new Map();
    tools.forEach((tool) => {
      const key = getRepairToolKey(tool);
      if (key) map.set(key, tool);
    });
    return map;
  };

  const getRepairEntryCost = (entry) =>
    normalizeCostValue(entry?.["Стоимость ремонта"]) ??
    normalizeCostValue(entry?.["Предварительная стоимость ремонта"]) ??
    0;

  const getRepairEntryLabel = (entry, tool, fieldName, fallback = "Не указано") =>
    String(tool?.[fieldName] ?? entry?.[fieldName] ?? "").trim() || fallback;

  const buildRepairGroups = (repairs, toolMap, fieldName) => {
    const groups = new Map();
    repairs.forEach((entry) => {
      const tool = toolMap.get(getRepairToolKey(entry));
      const title = getRepairEntryLabel(entry, tool, fieldName);
      const current = groups.get(title) ?? { title, count: 0, amount: 0 };
      current.count += 1;
      current.amount += getRepairEntryCost(entry);
      groups.set(title, current);
    });
    return Array.from(groups.values()).sort((a, b) => b.count - a.count || b.amount - a.amount).slice(0, 8);
  };

  const renderInfoRepairBars = (container, items, emptyText = "Нет данных") => {
    if (!container) return;
    container.innerHTML = "";
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "tools-empty";
      empty.textContent = emptyText;
      container.appendChild(empty);
      return;
    }
    const maxCount = Math.max(...items.map((item) => item.count), 1);
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "info-repair-bar";
      const top = document.createElement("div");
      top.className = "info-repair-bar__top";
      const title = document.createElement("span");
      title.textContent = item.title;
      const count = document.createElement("span");
      count.textContent = `${item.count} шт.`;
      top.append(title, count);
      const meta = document.createElement("div");
      meta.className = "info-repair-bar__meta";
      meta.textContent = `${formatNotificationCostWithoutCurrency(item.amount)} р. · ${item.count} шт.`;
      const track = document.createElement("div");
      track.className = "info-repair-bar__track";
      const fill = document.createElement("div");
      fill.className = "info-repair-bar__fill";
      fill.style.width = `${Math.max(8, Math.round((item.count / maxCount) * 100))}%`;
      track.appendChild(fill);
      row.append(top, meta, track);
      container.appendChild(row);
    });
  };

  const openInfoRepairModal = async () => {
    if (!infoRepairModalEl) return;
    infoRepairModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    if (infoRepairStatusEl) infoRepairStatusEl.textContent = "Загружаем аналитику ремонтов...";
    Object.keys(infoRepairValueEls).forEach((key) => setInfoRepairValue(key, "—"));

    const orgFolder = context.orgFolderName ?? "";
    const [tools, repairs] = await Promise.all([
      loadInfoStatisticsArray(orgFolder, "База с инструментами.json"),
      loadInfoStatisticsArray(orgFolder, "Ремонты.json"),
    ]);
    const toolMap = buildRepairToolMap(tools);
    const activeTools = tools.filter((tool) => String(tool?.["Статус"] ?? "").trim().toLocaleLowerCase("ru") === "в ремонте");
    const totalAmount = repairs.reduce((sum, entry) => sum + getRepairEntryCost(entry), 0);
    const averageAmount = repairs.length ? Math.round(totalAmount / repairs.length) : 0;
    const organizationGroups = buildRepairGroups(repairs, toolMap, "Организация");

    setInfoRepairValue("active", activeTools.length);
    setInfoRepairValue("total", repairs.length);
    setInfoRepairValue("sum", formatNotificationCostWithoutCurrency(totalAmount));
    setInfoRepairValue("orgs", organizationGroups.length);
    setInfoRepairValue("average", formatNotificationCostWithoutCurrency(averageAmount));
    if (infoRepairActiveCountEl) infoRepairActiveCountEl.textContent = `${activeTools.length} шт.`;

    if (infoRepairActiveListEl) {
      infoRepairActiveListEl.innerHTML = "";
      activeTools.slice(0, 20).forEach((tool) => {
        const key = getRepairToolKey(tool);
        const lastRepair = [...repairs].reverse().find((entry) => getRepairToolKey(entry) === key) ?? {};
        const item = document.createElement("div");
        item.className = "info-repair-item";
        const title = document.createElement("div");
        title.className = "info-repair-item__title";
        const name = document.createElement("span");
        name.textContent = `${resolveToolNumberValue(tool) || "—"} · ${String(tool?.["Наименование"] ?? "Без названия").trim()}`;
        const cost = document.createElement("span");
        cost.textContent = formatCostValueWithCurrency(lastRepair?.["Предварительная стоимость ремонта"], "—");
        title.append(name, cost);
        const meta = document.createElement("div");
        meta.className = "info-repair-item__meta";
        meta.textContent = [
          String(lastRepair?.["Организация"] ?? "Организация не указана").trim(),
          String(tool?.["Производитель"] ?? "").trim(),
          String(tool?.["Модель"] ?? "").trim(),
          String(lastRepair?.["Дата отправки в ремонт"] ?? "").trim(),
        ].filter(Boolean).join(" · ");
        item.title = meta.textContent;
        item.append(title, meta);
        infoRepairActiveListEl.appendChild(item);
      });
    }
    infoRepairActiveEmptyEl?.classList.toggle("is-hidden", activeTools.length > 0);
    renderInfoRepairBars(infoRepairOrgListEl, organizationGroups);
    renderInfoRepairBars(infoRepairManufacturerListEl, buildRepairGroups(repairs, toolMap, "Производитель"));
    renderInfoRepairBars(infoRepairModelListEl, buildRepairGroups(repairs, toolMap, "Модель"));
    renderInfoRepairBars(infoRepairNameListEl, buildRepairGroups(repairs, toolMap, "Наименование"));
    if (infoRepairStatusEl) infoRepairStatusEl.textContent = "Готово";
  };



  const getInfoInstructionPath = (title, type) => {
    const folder = type === "pdf" ? "instruction-pdf" : "instruction-videos";
    const extension = type === "pdf" ? ".pdf" : ".mp4";
    return `./${folder}/${encodeURIComponent(title)}${extension}`;
  };

  const getInfoInstructionPlaceholderPath = (title, type) => (
    `./instruction-placeholder.html?title=${encodeURIComponent(title)}&type=${encodeURIComponent(type)}`
  );

  const updateInfoInstructionActionAvailability = async (link, title, type) => {
    if (!link) return;
    const filePath = getInfoInstructionPath(title, type);
    try {
      const response = await fetch(filePath, { method: "HEAD", cache: "no-store" });
      if (response.ok) {
        link.href = filePath;
        link.classList.remove("is-missing");
        link.setAttribute("data-state", "ready");
        return;
      }
    } catch (error) {
      // Для локального открытия без сервера HEAD может быть недоступен — оставляем заглушку.
    }
    link.href = getInfoInstructionPlaceholderPath(title, type);
    link.classList.add("is-missing");
    link.setAttribute("data-state", "missing");
  };

  const renderInfoInstructions = () => {
    if (!infoInstructionsGridEl) return;
    infoInstructionsGridEl.innerHTML = "";
    infoInstructionsItems.forEach((title) => {
      const card = document.createElement("article");
      card.className = "info-instruction-link";
      card.innerHTML = `
        <span class="info-instruction-link__icon" aria-hidden="true">${infoInstructionIconMap.get(title) ?? "📘"}</span>
        <span class="info-instruction-link__title"></span>
        <span class="info-instruction-actions">
          <a class="info-instruction-action info-instruction-action--video" href="${getInfoInstructionPlaceholderPath(title, "video")}" target="_blank" rel="noopener noreferrer" aria-label="Открыть видеоинструкцию: ${title}" title="Видеоинструкция">
            <span class="info-instruction-action__icon" aria-hidden="true">▶</span>
            <span class="info-instruction-action__label">Видео</span>
          </a>
          <a class="info-instruction-action info-instruction-action--pdf" href="${getInfoInstructionPlaceholderPath(title, "pdf")}" target="_blank" rel="noopener noreferrer" aria-label="Открыть PDF-инструкцию: ${title}" title="PDF-инструкция">
            <span class="info-instruction-action__icon info-instruction-action__icon--pdf" aria-hidden="true"></span>
            <span class="info-instruction-action__label">PDF</span>
          </a>
        </span>`;
      const titleEl = card.querySelector(".info-instruction-link__title");
      if (titleEl) titleEl.textContent = title;
      infoInstructionsGridEl.appendChild(card);
      updateInfoInstructionActionAvailability(card.querySelector('a[aria-label^="Открыть видеоинструкцию"]'), title, "video");
      updateInfoInstructionActionAvailability(card.querySelector('a[aria-label^="Открыть PDF-инструкцию"]'), title, "pdf");
    });
  };

  const closeInfoInstructionsModal = () => {
    if (!infoInstructionsModalEl) return;
    infoInstructionsModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
  };
  const openInfoInstructionsModal = () => {
    if (!infoInstructionsModalEl) return;
    renderInfoInstructions();
    infoInstructionsModalEl.classList.remove("is-hidden");
    requestAnimationFrame(() => {
      const scrollBody = infoInstructionsModalEl.querySelector(".info-instructions-modal__body");
      scrollBody?.scrollTo({ top: 0, left: 0 });
    });
    document.body.style.overflow = "hidden";
  };

  const closeInfoFinesModal = () => {
    if (!infoFinesModalEl) return;
    infoFinesModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
  };
  const setInfoFinesValue = (key, value) => {
    const element = infoFinesValueEls[key];
    if (element) element.textContent = value;
  };
  const getFineInfoNumber = (value) => normalizeCostValue(value) || 0;
  const formatInfoFineMoney = (value) => formatFineMoney(getFineInfoNumber(value));
  const getInfoFinesOrganizationScope = async () => {
    const orgNames = new Set(
      [context.orgFullName, context.orgShortName, context.orgFolderName, currentUser?.organization]
        .map((name) => normalizeOrganizationName(name))
        .filter(Boolean)
    );
    const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
    const users = Array.isArray(usersData?.users) ? usersData.users : [];
    const allowedUsers = new Set();
    users.forEach((entry) => {
      const entryOrg = normalizeOrganizationName(entry?.organization ?? "");
      if (!entryOrg || !orgNames.has(entryOrg)) return;
      const fullName = normalizePersonName(entry?.full_name ?? entry?.fullName ?? "");
      if (fullName) allowedUsers.add(fullName);
    });
    return { orgNames, allowedUsers };
  };

  const isInfoFineInOrganizationScope = (fine, scope) => {
    const orgName = normalizeOrganizationName(
      fine?.["Организация"] ?? fine?.organization ?? fine?.org ?? ""
    );
    if (orgName) return scope.orgNames.has(orgName);
    const responsible = normalizePersonName(
      fine?.["Ответственный"] ?? fine?.["Пользователь"] ?? fine?.["Сотрудник"] ?? ""
    );
    return !scope.allowedUsers.size || !responsible || scope.allowedUsers.has(responsible);
  };

  const collectInfoFinesData = (rawFines, scope = { orgNames: new Set(), allowedUsers: new Set() }) => {
    const rawSummary = rawFines?.["Штрафы по пользователям"] && typeof rawFines["Штрафы по пользователям"] === "object"
      ? rawFines["Штрафы по пользователям"]
      : {};
    const summary = Object.fromEntries(
      Object.entries(rawSummary).filter(([userName]) => {
        const normalizedName = normalizePersonName(userName);
        return !scope.allowedUsers.size || !normalizedName || scope.allowedUsers.has(normalizedName);
      })
    );
    const types = new Map();
    const usersWithBalance = new Set();
    Object.entries(summary).forEach(([userName, userSummary]) => {
      if (!userSummary || typeof userSummary !== "object") return;
      Object.entries(userSummary).forEach(([typeName, typeSummary]) => {
        if (!typeSummary || typeof typeSummary !== "object") return;
        const balance = getFineInfoNumber(typeSummary["Остаток"]);
        if (balance <= 0) return;
        const key = String(typeName || "Другие штрафы");
        const item = types.get(key) ?? { title: key, balance: 0, users: [] };
        item.balance += balance;
        usersWithBalance.add(userName);
        item.users.push({ name: userName, balance });
        types.set(key, item);
      });
    });
    const history = Array.isArray(rawFines?.fines) ? rawFines.fines : Array.isArray(rawFines) ? rawFines : [];
    const months = new Map();
    history.forEach((fine) => {
      if (!isInfoFineInOrganizationScope(fine, scope)) return;
      const action = String(fine?.["Действие"] ?? "").trim().toLowerCase();
      const reason = String(fine?.["Причина"] ?? "").trim().toLowerCase();
      if (action && !action.includes("выстав")) return;
      if (!action && reason.includes("прощ")) return;
      const amount = getFineInfoNumber(fine?.["Сумма"]);
      if (!amount) return;
      const rawDate = String(fine?.["Дата"] ?? "").slice(0, 10);
      const monthKey = /^\d{4}-\d{2}/.test(rawDate) ? rawDate.slice(0, 7) : "Без даты";
      const type = String(fine?.["Тип штрафа"] ?? "Другие штрафы").trim() || "Другие штрафы";
      const responsible = String(fine?.["Ответственный"] ?? fine?.["Пользователь"] ?? fine?.["Сотрудник"] ?? "Не указан").trim() || "Не указан";
      const month = months.get(monthKey) ?? { key: monthKey, total: 0, count: 0, types: new Map(), users: new Map() };
      const typeItem = month.types.get(type) ?? { title: type, total: 0, count: 0 };
      const userItem = month.users.get(responsible) ?? { name: responsible, total: 0, count: 0, types: new Map() };
      const userTypeTotal = getFineInfoNumber(userItem.types.get(type));
      month.total += amount; month.count += 1; typeItem.total += amount; typeItem.count += 1;
      userItem.total += amount; userItem.count += 1; userItem.types.set(type, userTypeTotal + amount);
      month.types.set(type, typeItem); month.users.set(responsible, userItem); months.set(monthKey, month);
    });
    return { types: [...types.values()].sort((a,b)=>b.balance-a.balance || a.title.localeCompare(b.title, "ru")), months: [...months.values()].sort((a,b)=>String(b.key).localeCompare(String(a.key))), usersWithBalance };
  };
  const renderInfoFines = (rawFines, scope) => {
    const data = collectInfoFinesData(rawFines, scope);
    const totals = data.types.reduce((acc, item) => ({ balance: acc.balance + item.balance }), { balance: 0 });
    setInfoFinesValue("balance", formatInfoFineMoney(totals.balance));
    setInfoFinesValue("users", String(data.usersWithBalance.size));
    if (infoFinesTypesCountEl) infoFinesTypesCountEl.textContent = "";
    if (infoFinesMonthsCountEl) infoFinesMonthsCountEl.textContent = `${data.months.length} мес.`;
    if (infoFinesTypesEl) {
      infoFinesTypesEl.innerHTML = "";
      data.types.forEach((item) => {
        const card = document.createElement("article");
        card.className = "info-fines-type";
        const usersWithUnissuedFines = item.users.sort((a,b)=>b.balance-a.balance || a.name.localeCompare(b.name, "ru"));
        card.innerHTML = `<div class="info-fines-type__top"><h4></h4><strong>💰 ${formatInfoFineMoney(item.balance)} р.</strong></div><div class="info-fines-type__users" aria-label="Пользователи с невыставленными штрафами"></div>`;
        card.querySelector("h4").textContent = item.title;
        const usersEl = card.querySelector(".info-fines-type__users");
        if (usersEl) {
          if (usersWithUnissuedFines.length) {
            usersEl.innerHTML = '<span class="info-fines-type__users-title">👥 Пользователи с невыставленными штрафами:</span>';
            usersWithUnissuedFines.forEach((user) => {
              const row = document.createElement("span");
              row.className = "info-fines-type__user";
              row.textContent = `${formatFullName(user.name, 4)} — ${formatInfoFineMoney(user.balance)} р.`;
              usersEl.appendChild(row);
            });
          } else {
            usersEl.textContent = "✅ Нет сотрудников с невыставленными штрафами";
          }
        }
        infoFinesTypesEl.appendChild(card);
      });
    }
    infoFinesTypesEmptyEl?.classList.toggle("is-hidden", data.types.length > 0);
    if (infoFinesMonthsEl) {
      infoFinesMonthsEl.innerHTML = "";
      data.months.forEach((month) => {
        const date = /^\d{4}-\d{2}$/.test(month.key) ? new Date(`${month.key}-01T00:00:00`) : null;
        const title = date ? date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }) : month.key;
        const card = document.createElement("article");
        card.className = "info-fines-month";
        card.innerHTML = `<div class="info-fines-month__top"><h4></h4><strong>🧾 ${formatInfoFineMoney(month.total)} р.</strong><span>📝 ${month.count} записей</span></div><div class="info-fines-month__section-title">👥 Кому выставлено</div><div class="info-fines-month__users"></div><div class="info-fines-month__section-title">🏷️ По видам</div><div class="info-fines-month__rows"></div>`;
        card.querySelector("h4").textContent = title;
        const usersEl = card.querySelector(".info-fines-month__users");
        [...month.users.values()].sort((a,b)=>b.total-a.total || a.name.localeCompare(b.name, "ru")).forEach((user) => {
          const row = document.createElement("div");
          row.className = "info-fines-month__user";
          const name = document.createElement("span");
          name.textContent = formatFullName(user.name, 4);
          const total = document.createElement("strong");
          total.textContent = `💸 ${formatInfoFineMoney(user.total)} р.`;
          const details = document.createElement("small");
          const typeDetails = [...user.types.entries()]
            .sort((a,b)=>getFineInfoNumber(b[1])-getFineInfoNumber(a[1]))
            .map(([typeName, typeTotal]) => `${typeName}: ${formatInfoFineMoney(typeTotal)} р.`);
          details.textContent = typeDetails.length ? typeDetails.join(" · ") : `📝 ${user.count} зап.`;
          row.append(name, total, details);
          usersEl?.appendChild(row);
        });
        const rowsEl = card.querySelector(".info-fines-month__rows");
        [...month.types.values()].sort((a,b)=>b.total-a.total).forEach((type) => {
          const row = document.createElement("div");
          row.className = "info-fines-month__row";
          const name = document.createElement("span");
          name.textContent = type.title;
          const total = document.createElement("strong");
          total.textContent = `💸 ${formatInfoFineMoney(type.total)} р.`;
          const count = document.createElement("small");
          count.textContent = `📝 ${type.count} зап.`;
          row.append(name, total, count);
          rowsEl?.appendChild(row);
        });
        infoFinesMonthsEl.appendChild(card);
      });
    }
    infoFinesMonthsEmptyEl?.classList.toggle("is-hidden", data.months.length > 0);
  };
  const openInfoFinesModal = async () => {
    if (!infoFinesModalEl) return;
    infoFinesModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    if (infoFinesStatusEl) infoFinesStatusEl.textContent = "Загружаем штрафы...";
    try {
      const rawFines = await loadJson(`./${context.orgFolderName}/Штрафы.json`).catch(() => ({}));
      const scope = await getInfoFinesOrganizationScope();
      renderInfoFines(rawFines, scope);
      if (infoFinesStatusEl) {
        const orgTitle = context.orgFullName || context.orgShortName || context.orgFolderName || "организации";
        infoFinesStatusEl.textContent = `Данные обновлены только по организации: ${orgTitle}.`;
      }
    } catch (error) {
      console.error(error);
      if (infoFinesStatusEl) infoFinesStatusEl.textContent = "Не удалось загрузить информацию по штрафам.";
    }
  };
  const closeInfoStatisticsModal = () => {
    if (!infoStatisticsModalEl) return;
    infoStatisticsModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
  };

  const setInfoStatisticsValue = (key, value) => {
    const element = infoStatisticsValueEls[key];
    if (element) element.textContent = String(value ?? "—");
  };

  const loadInfoStatisticsArray = async (orgFolder, fileName) => {
    if (!orgFolder) return [];
    try {
      const data = await loadJson(`./${orgFolder}/${fileName}`);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn(`Не удалось загрузить ${fileName} для статистики.`, error);
      return [];
    }
  };

  const openInfoStatisticsModal = async () => {
    if (!infoStatisticsModalEl) return;
    infoStatisticsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    if (infoStatisticsStatusEl) infoStatisticsStatusEl.textContent = "Загружаем статистику...";
    Object.keys(infoStatisticsValueEls).forEach((key) => setInfoStatisticsValue(key, "—"));

    const orgFolder = context.orgFolderName ?? "";
    const [tools, moves, repairs, breakdowns, fines] = await Promise.all([
      loadInfoStatisticsArray(orgFolder, "База с инструментами.json"),
      loadInfoStatisticsArray(orgFolder, "Перемещения.json"),
      loadInfoStatisticsArray(orgFolder, "Ремонты.json"),
      loadInfoStatisticsArray(orgFolder, "Поломки.json"),
      loadInfoStatisticsArray(orgFolder, "Штрафы.json"),
    ]);
    const workingCount = tools.filter((tool) => {
      const status = String(tool?.["Статус"] ?? "").trim().toLocaleLowerCase("ru");
      return status === "исправен" || status === "в работе";
    }).length;

    setInfoStatisticsValue("tools", tools.length);
    setInfoStatisticsValue("working", workingCount);
    setInfoStatisticsValue("moves", moves.length);
    setInfoStatisticsValue("repairs", repairs.length);
    setInfoStatisticsValue("breakdowns", breakdowns.length);
    setInfoStatisticsValue("fines", fines.length);
    if (infoStatisticsStatusEl) infoStatisticsStatusEl.textContent = "Статистика обновлена.";
  };

  const triggerExcelDownload = async (fileBlob, blobUrl, fileName, serverFileUrl = "") => {
    if (!fileBlob || !blobUrl) return;

    if (typeof navigator !== "undefined" && typeof navigator.msSaveOrOpenBlob === "function") {
      navigator.msSaveOrOpenBlob(fileBlob, fileName);
      return;
    }

    const downloadHref = blobUrl;
    const tempLink = document.createElement("a");
    tempLink.href = downloadHref;
    tempLink.download = fileName;
    tempLink.rel = "noopener";
    tempLink.style.display = "none";
    document.body.append(tempLink);
    tempLink.click();
    tempLink.remove();

    const isTelegramMiniApp = Boolean(window.Telegram?.WebApp?.initDataUnsafe);
    if (serverFileUrl && isTelegramMiniApp) {
      const normalizedServerUrl = new URL(serverFileUrl, window.location.href).href;
      const telegramWebApp = window.Telegram?.WebApp;
      if (telegramWebApp?.openLink) {
        telegramWebApp.openLink(normalizedServerUrl);
      }
    }

    const isIos = /iPad|iPhone|iPod/i.test(navigator?.userAgent ?? "");
    if (isIos) {
      try {
        const fileReader = new FileReader();
        const dataUrl = await new Promise((resolve, reject) => {
          fileReader.onloadend = () => resolve(String(fileReader.result ?? ""));
          fileReader.onerror = reject;
          fileReader.readAsDataURL(fileBlob);
        });
        if (dataUrl) {
          window.open(dataUrl, "_blank", "noopener,noreferrer");
        }
      } catch (error) {
        console.warn("Не удалось открыть резервный сценарий загрузки для iOS.", error);
      }
    }
  };

  const showDownloadReadyMessage = (fileBlob, blobUrl, fileName, serverFileUrl = "") => {
    if (!downloadMessageEl) return;
    downloadMessageEl.innerHTML = "";
    const text = document.createElement("p");
    text.textContent = "Excel файл готов. Нажмите кнопку ниже, чтобы скачать.";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "download-ready-button";
    button.innerHTML = '<span aria-hidden="true">⬇️</span><span>Скачать Excel файл</span>';
    button.addEventListener("click", () => {
      triggerExcelDownload(fileBlob, blobUrl, fileName, serverFileUrl);
    });

    downloadMessageEl.append(text, button);

    if (serverFileUrl) {
      const link = document.createElement("a");
      link.href = serverFileUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Или скачайте по ссылке";
      link.className = "download-ready-link";
      downloadMessageEl.appendChild(link);
    }
  };

  const blobToBase64 = async (blob) => {
    const reader = new FileReader();
    const dataUrl = await new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(String(reader.result ?? ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const [, base64Part = ""] = String(dataUrl).split(",");
    return base64Part;
  };

  const buildExportFileName = (currentUserName, date) => {
    const sourceName = String(currentUserName ?? "").trim();
    const nameParts = sourceName.split(/\s+/).filter(Boolean);
    const rawSurname = nameParts[0] || "Пользователь";
    const surname = rawSurname.replace(/[\\/:*?"<>|]+/g, "_") || "Пользователь";
    const formattedDate = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    const formattedTime = [
      String(date.getHours()).padStart(2, "0"),
      String(date.getMinutes()).padStart(2, "0"),
      String(date.getSeconds()).padStart(2, "0"),
    ].join("-");
    return `${surname}_${formattedDate}_${formattedTime}.xlsx`;
  };

  const buildExportSheetTitle = (scope, responsibleName) => {
    const rawTitle =
      scope === "all"
        ? "Все инструменты"
        : scope === "no-photo"
          ? "Инструменты без фото"
        : scope === "status"
          ? `Статус · ${String(responsibleName ?? "").trim() || "Не указан"}`
        : scope === "responsible"
          ? `Инструменты · ${String(responsibleName ?? "").trim() || "Ответственный"}`
          : scope === "moves"
            ? "Перемещения"
          : "Мои инструменты";

    const sanitizedTitle = rawTitle
      .replace(/[\\/?*\[\]:]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return (sanitizedTitle || "Выгрузка").slice(0, 31);
  };

  const saveExportFileOnServer = async (orgFolder, fileName, fileBlob) => {
    const contentBase64 = await blobToBase64(fileBlob);
    const response = await fetch(saveEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries: [
          {
            type: "file",
            path: `${orgFolder}/Выгрузки/${fileName}`,
            content: contentBase64,
            encoding: "base64",
            ...buildUploadUserMeta({ organizationName: orgFolder }),
          },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`save failed: ${response.status}`);
    }
    return new URL(`./${orgFolder}/Выгрузки/${encodeURIComponent(fileName)}`, window.location.href).href;
  };

  const parseDateOnly = (value) => {
    const source = String(value ?? "").trim();
    if (!source) return null;
    const isoMatch = source.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const result = new Date(Number(year), Number(month) - 1, Number(day));
      return Number.isNaN(result.getTime()) ? null : result;
    }
    const ruMatch = source.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (ruMatch) {
      const [, day, month, year] = ruMatch;
      const result = new Date(Number(year), Number(month) - 1, Number(day));
      return Number.isNaN(result.getTime()) ? null : result;
    }
    const parsed = new Date(source);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  };

  const toDayTimestamp = (value) => {
    const parsed = parseDateOnly(value);
    return parsed ? parsed.getTime() : Number.NaN;
  };

  const toIsoDate = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateLabel = (value) => {
    const parsed = parseDateOnly(value);
    if (!parsed) return "";
    return parsed.toLocaleDateString("ru-RU");
  };

  const buildMonthMatrix = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekDayRaw = new Date(year, month, 1).getDay();
    const firstWeekDay = firstWeekDayRaw === 0 ? 7 : firstWeekDayRaw;
    const result = [];
    for (let i = 1; i < firstWeekDay; i += 1) {
      result.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      result.push(new Date(year, month, day));
    }
    return result;
  };

  const updateMovesSelectedRangeHint = () => {
    if (!downloadMovesSelectedRangeEl) return;
    const start = downloadMovesStartDateEl?.value ?? "";
    const end = downloadMovesEndDateEl?.value ?? "";
    if (!start && !end) {
      downloadMovesSelectedRangeEl.textContent =
        "Выберите начальную и конечную дату";
      return;
    }
    if (start && !end) {
      downloadMovesSelectedRangeEl.textContent = `Начало: ${formatDateLabel(start)}. Выберите конечную дату.`;
      return;
    }
    const startTs = toDayTimestamp(start);
    const endTs = toDayTimestamp(end);
    if (!Number.isFinite(startTs) || !Number.isFinite(endTs)) {
      downloadMovesSelectedRangeEl.textContent =
        "Выберите корректный диапазон дат";
      return;
    }
    const min = startTs <= endTs ? start : end;
    const max = startTs <= endTs ? end : start;
    if (min === max) {
      downloadMovesSelectedRangeEl.textContent = `Выбран 1 день: ${formatDateLabel(min)}`;
      return;
    }
    downloadMovesSelectedRangeEl.textContent = `Период: ${formatDateLabel(min)} — ${formatDateLabel(max)}`;
  };

  const renderMovesRangeCalendar = () => {
    if (!downloadMovesCalendarEl || !downloadMovesDaysEl || !downloadMovesMonthLabelEl) {
      return;
    }
    const monthDate = new Date(
      downloadMovesVisibleMonthDate.getFullYear(),
      downloadMovesVisibleMonthDate.getMonth(),
      1
    );
    downloadMovesMonthLabelEl.textContent = monthDate.toLocaleDateString("ru-RU", {
      month: "long",
      year: "numeric",
    });

    const startTs = toDayTimestamp(downloadMovesStartDateEl?.value ?? "");
    const endTsRaw = toDayTimestamp(downloadMovesEndDateEl?.value ?? "");
    const hasStart = Number.isFinite(startTs);
    const hasEnd = Number.isFinite(endTsRaw);
    const rangeStart = hasStart && hasEnd ? Math.min(startTs, endTsRaw) : startTs;
    const rangeEnd = hasStart && hasEnd ? Math.max(startTs, endTsRaw) : startTs;

    downloadMovesDaysEl.innerHTML = "";
    buildMonthMatrix(monthDate).forEach((dayDate) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "download-moves-calendar__day";
      if (!dayDate) {
        button.classList.add("is-empty");
        button.tabIndex = -1;
        downloadMovesDaysEl.append(button);
        return;
      }
      const iso = toIsoDate(dayDate);
      const ts = dayDate.getTime();
      button.textContent = String(dayDate.getDate());
      button.dataset.date = iso;
      if (hasStart && ts === startTs) {
        button.classList.add("is-selected");
      }
      if (hasEnd && ts === endTsRaw) {
        button.classList.add("is-selected");
      }
      if (hasStart && ts >= rangeStart && ts <= rangeEnd) {
        button.classList.add("is-in-range");
      }
      downloadMovesDaysEl.append(button);
    });

    updateMovesSelectedRangeHint();
  };

  const handleMovesDateSelect = (isoDate) => {
    if (!downloadMovesStartDateEl || !downloadMovesEndDateEl) return;
    const currentStart = downloadMovesStartDateEl.value;
    const currentEnd = downloadMovesEndDateEl.value;
    if (!currentStart || (currentStart && currentEnd)) {
      downloadMovesStartDateEl.value = isoDate;
      downloadMovesEndDateEl.value = "";
      renderMovesRangeCalendar();
      return;
    }
    downloadMovesEndDateEl.value = isoDate;
    renderMovesRangeCalendar();
  };

  const downloadMovesExcel = async ({ startDate = "", endDate = "" } = {}) => {
    if (!window.XLSX) {
      if (downloadMessageEl) {
        downloadMessageEl.textContent =
          "Модуль Excel не загружен. Обновите страницу и попробуйте снова.";
      }
      return;
    }

    const orgFolder = context.orgFolderName ?? "";
    if (!orgFolder) {
      if (downloadMessageEl) {
        downloadMessageEl.textContent = "Не удалось определить организацию пользователя.";
      }
      return;
    }

    const startTs = toDayTimestamp(startDate);
    const endTs = toDayTimestamp(endDate || startDate);
    if (!Number.isFinite(startTs) || !Number.isFinite(endTs)) {
      if (downloadMessageEl) {
        downloadMessageEl.textContent = "Выберите корректный диапазон дат.";
      }
      return;
    }

    const normalizedStart = Math.min(startTs, endTs);
    const normalizedEnd = Math.max(startTs, endTs);

    const rawMoves = await loadOrgMovesIncludingHistory(
      orgFolder,
      "перемещения для выгрузки"
    );


    const filteredMoves = rawMoves.filter((move) => {
      const answer = String(move?.["Ответ"] ?? "").trim().toLocaleLowerCase("ru");
      if (answer !== "принял") return false;
      const moveDateTs = toDayTimestamp(move?.["Дата ответа"]);
      if (!Number.isFinite(moveDateTs)) return false;
      return moveDateTs >= normalizedStart && moveDateTs <= normalizedEnd;
    });

    if (!filteredMoves.length) {
      if (downloadMessageEl) {
        downloadMessageEl.textContent =
          "За выбранный диапазон нет принятых перемещений.";
      }
      return;
    }

    let toolsData = [];
    try {
      const rawTools = await loadJson(`./${orgFolder}/База с инструментами.json`);
      toolsData = Array.isArray(rawTools)
        ? rawTools
        : Array.isArray(rawTools?.tools)
          ? rawTools.tools
          : [];
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов для выгрузки перемещений.", error);
    }

    const toolByNumber = new Map();
    const toolByAccounting = new Map();
    toolsData.forEach((tool) => {
      const numberKey = normalizeToolNumberValue(tool?.["Номер"] ?? "");
      const accountingKey = String(tool?.["Бух.номер"] ?? "")
        .trim()
        .toLowerCase();
      if (numberKey && !toolByNumber.has(numberKey)) {
        toolByNumber.set(numberKey, tool);
      }
      if (accountingKey && !toolByAccounting.has(accountingKey)) {
        toolByAccounting.set(accountingKey, tool);
      }
    });

    let usersData = null;
    try {
      usersData = await loadJson(usersFilePath);
    } catch (error) {
      console.warn("Не удалось загрузить users.json для выгрузки перемещений.", error);
    }
    const organizationName = findUserOrganizationName(user, usersData ?? { users: [] });

    const resolveToolForMove = (move) => {
      const numberKey = normalizeToolNumberValue(move?.["Номер"] ?? "");
      const accountingKey = String(move?.["Бух.номер"] ?? "")
        .trim()
        .toLowerCase();
      if (numberKey && toolByNumber.has(numberKey)) {
        return toolByNumber.get(numberKey);
      }
      if (accountingKey && toolByAccounting.has(accountingKey)) {
        return toolByAccounting.get(accountingKey);
      }
      return null;
    };

    const resolveUserIdForExport = (fullName) => {
      const userId = findUserTelegramId(usersData, {
        fullName,
        organization: organizationName,
      });
      return userId ? String(userId).trim() : "";
    };

    const removePatronymic = (fullName) => {
      const parts = String(fullName ?? "").trim().split(/\s+/).filter(Boolean);
      if (parts.length <= 2) {
        return parts.join(" ");
      }
      return parts.slice(0, 2).join(" ");
    };

    const exportRows = filteredMoves.map((move) => {
      const senderFullName = String(
        move?.["Ответственный до перемещения"] ||
          move?.["Переместил"] ||
          move?.["Переместил энергетик"] ||
          ""
      ).trim();
      const receiverFullName = String(move?.["Принял"] ?? "").trim();
      const senderName = removePatronymic(senderFullName);
      const receiverName = removePatronymic(receiverFullName);
      const tool = resolveToolForMove(move);
      return {
        "Дата перемещения": formatIsoDateValue(
          parseIsoDateValue(move?.["Дата перемещения"])
        ),
        "Дата принятия": formatIsoDateValue(parseIsoDateValue(move?.["Дата ответа"])),
        "Номер инструмента": String(move?.["Номер"] ?? "").trim(),
        "Бухгалтерский номер": String(move?.["Бух.номер"] ?? "").trim(),
        "Модель": String(tool?.["Модель"] ?? "").trim(),
        "Описание": String(tool?.["Наименование"] ?? "").trim(),
        "Сотрудник отправитель": senderName,
        "ID отправителя": resolveUserIdForExport(senderFullName),
        "Сотрудник получатель": receiverName,
        "ID получателя": resolveUserIdForExport(receiverFullName),
        "Старый объект": String(move?.["Старый объект"] ?? "").trim(),
        "Новый объект": String(move?.["Новый объект"] ?? "").trim(),
      };
    });

    const worksheet = window.XLSX.utils.json_to_sheet(exportRows, {
      header: [
        "Дата перемещения",
        "Дата принятия",
        "Номер инструмента",
        "Бухгалтерский номер",
        "Модель",
        "Описание",
        "Сотрудник отправитель",
        "ID отправителя",
        "Сотрудник получатель",
        "ID получателя",
        "Старый объект",
        "Новый объект",
      ],
    });
    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 15 },
      { wch: 19 },
      { wch: 21 },
      { wch: 9 },
      { wch: 30 },
      { wch: 23 },
      { wch: 16 },
      { wch: 34 },
      { wch: 15 },
      { wch: 15 },
      { wch: 14 },
    ];
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      buildExportSheetTitle("moves")
    );
    const outputArray = window.XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const fileBlob = new Blob([outputArray], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    if (preparedDownloadUrl) {
      URL.revokeObjectURL(preparedDownloadUrl);
    }
    const downloadUrl = URL.createObjectURL(fileBlob);
    preparedDownloadUrl = downloadUrl;
    const fileName = buildExportFileName(user?.full_name ?? "Перемещения", new Date());
    let serverFileUrl = "";
    try {
      serverFileUrl = await saveExportFileOnServer(orgFolder, fileName, fileBlob);
    } catch (error) {
      console.warn("Не удалось сохранить выгрузку перемещений на сервере.", error);
    }
    showDownloadReadyMessage(fileBlob, downloadUrl, fileName, serverFileUrl);
  };

  const openMovesDownloadPicker = () => {
    if (downloadResponsibleBoxEl) {
      downloadResponsibleBoxEl.classList.add("is-hidden");
    }
    if (downloadOptionsGridEl) {
      downloadOptionsGridEl.classList.add("is-hidden");
    }
    if (downloadMovesBoxEl) {
      downloadMovesBoxEl.classList.remove("is-hidden");
    }
    if (downloadSubtitleEl) {
      downloadSubtitleEl.textContent = "Выберите диапазон дат перемещений";
    }
    const todayIso = new Date().toISOString().slice(0, 10);
    if (downloadMovesStartDateEl && !downloadMovesStartDateEl.value) {
      downloadMovesStartDateEl.value = todayIso;
    }
    if (downloadMovesEndDateEl && !downloadMovesEndDateEl.value) {
      downloadMovesEndDateEl.value = "";
    }
    if (downloadMovesStartDateEl?.value) {
      const startDate = parseDateOnly(downloadMovesStartDateEl.value);
      if (startDate) {
        downloadMovesVisibleMonthDate = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          1
        );
      }
    }
    renderMovesRangeCalendar();
  };

  const collectResponsibleNamesForDownload = (tools) => {
    const unique = new Map();
    (Array.isArray(tools) ? tools : []).forEach((tool) => {
      const source = String(tool?.["Ответственный"] ?? "").trim();
      if (!source) return;
      const key = normalizePersonName(source);
      if (!key || unique.has(key)) return;
      unique.set(key, source);
    });
    return Array.from(unique.values()).sort((a, b) =>
      a.localeCompare(b, "ru", {
        sensitivity: "base",
      })
    );
  };

  const collectStatusesForDownload = (tools) => {
    const unique = new Map();
    (Array.isArray(tools) ? tools : []).forEach((tool) => {
      const status = String(tool?.["Статус"] ?? "").trim();
      const key = status.toLocaleLowerCase("ru");
      if (!status || !key || unique.has(key)) return;
      unique.set(key, status);
    });
    return Array.from(unique.values()).sort((a, b) =>
      a.localeCompare(b, "ru", {
        sensitivity: "base",
      })
    );
  };

  const downloadToolsExcel = async ({
    scope = "my",
    responsibleName = "",
    statusName = "",
  } = {}) => {
    if (!window.XLSX) {
      if (downloadMessageEl) {
        downloadMessageEl.textContent =
          "Модуль Excel не загружен. Обновите страницу и попробуйте снова.";
      }
      return;
    }

    const orgFolder = context.orgFolderName ?? "";
    if (!orgFolder) {
      if (downloadMessageEl) {
        downloadMessageEl.textContent =
          "Не удалось определить организацию пользователя.";
      }
      return;
    }
