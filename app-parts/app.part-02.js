      const current = Number.parseInt(
        tools[toolIndex]?.["Количество фото"] ?? 0,
        10
      );
      const safeCurrent = Number.isFinite(current) ? current : 0;
      const nextCount = safeCurrent + files.length;
      tools[toolIndex] = {
        ...tools[toolIndex],
        "Количество фото": nextCount,
      };
      await saveEntries([
        {
          path: `${orgFolder}/База с инструментами.json`,
          data: tools,
          ...buildUploadUserMeta({ organizationName: context.orgFullName }),
        },
      ]);
      applyToolsEditUpdateToState({ "Количество фото": nextCount });
      updateToolsEditPhotoCount(nextCount);
      setToolsEditMessage("Фото загружены.", "success");
    } catch (error) {
      console.error(error);
      setToolsEditMessage("Не удалось загрузить фото.", "error");
    } finally {
      if (toolsEditPhotoInput) {
        toolsEditPhotoInput.value = "";
      }
    }
  };

  const setWriteOffSubtitle = (text) => {
    if (writeOffSubtitleEl) {
      writeOffSubtitleEl.textContent = text;
    }
  };

  const setWriteOffMessage = (text = "", type = "") => {
    if (!writeOffMessageEl) return;
    writeOffMessageEl.textContent = text;
    writeOffMessageEl.classList.remove("is-error", "is-success", "is-info");
    if (type) {
      writeOffMessageEl.classList.add(`is-${type}`);
    }
  };

  const setWriteOffConfirmMessage = (text = "", type = "") => {
    if (!writeOffConfirmMessageEl) return;
    writeOffConfirmMessageEl.textContent = text;
    writeOffConfirmMessageEl.classList.remove("is-error", "is-success", "is-info");
    if (type) {
      writeOffConfirmMessageEl.classList.add(`is-${type}`);
    }
  };

  const updateWriteOffSelectionUi = () => {
    const count = writeOffState.selectedIds.size;
    if (writeOffCountEl) {
      writeOffCountEl.textContent = String(count);
    }
    if (writeOffNextButton) {
      writeOffNextButton.disabled = count === 0;
    }
  };

  const countAppliedWriteOffFilters = () =>
    Object.values(toolsState.filters).reduce((total, value) => {
      if (!Array.isArray(value)) return total;
      return total + value.length;
    }, 0);

  const updateWriteOffFilterButton = () => {
    const isStatusOnly = writeOffState.filterWriteOffOnly;
    const appliedFiltersCount = countAppliedWriteOffFilters();
    const hasAppliedFilters = appliedFiltersCount > 0;
    const isFiltersOpen = Boolean(writeOffFiltersPanelEl?.classList.contains("is-open"));
    if (writeOffStatusOnlyButton) {
      writeOffStatusOnlyButton.classList.toggle("is-active", isStatusOnly);
      writeOffStatusOnlyButton.setAttribute("aria-pressed", isStatusOnly ? "true" : "false");
    }
    if (!writeOffFilterButton) return;
    const labelEl = writeOffFilterButton.querySelector(".tools-filters-toggle__label");
    if (labelEl) {
      labelEl.textContent = "Фильтры";
    }
    writeOffFilterButton.classList.toggle("is-active", hasAppliedFilters || isFiltersOpen);
    const ariaLabel = hasAppliedFilters ? `Фильтры: выбрано ${appliedFiltersCount}` : "Фильтры";
    writeOffFilterButton.setAttribute("aria-label", ariaLabel);
  };

  const toggleWriteOffStatusOnly = () => {
    writeOffState.filterWriteOffOnly = !writeOffState.filterWriteOffOnly;
    updateWriteOffFilterButton();
    applyWriteOffFilters();
  };

  const getWriteOffToolsTotalCost = (tools = []) =>
    tools.reduce((sum, tool) => {
      const value = normalizeCostValue(tool?.["Стоимость"]);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

  const formatWriteOffToolsSummary = (tools = []) => {
    const totalCost = getWriteOffToolsTotalCost(tools);
    return `Инструментов: ${tools.length} · На сумму ${formatNotificationCostWithoutCurrency(totalCost)} р.`;
  };

  const setWriteOffFiltersOpen = (isOpen) => {
    if (!writeOffFiltersPanelEl) return;
    writeOffFiltersPanelEl.classList.toggle("is-open", isOpen);
    if (writeOffFilterButton) {
      writeOffFilterButton.classList.toggle("is-active", isOpen);
      writeOffFilterButton.setAttribute("aria-expanded", String(isOpen));
    }
  };

  const renderWriteOffList = () => {
    if (!writeOffListEl) return;
    writeOffListEl.innerHTML = "";
    writeOffState.filtered.forEach((tool) => {
      const item = document.createElement("div");
      item.className = "writeoff-item";
      item.dataset.writeoffId = tool.__selectionId;
      item.classList.toggle("tools-item--pending-response", Boolean(tool?.__pendingMove));
      applyToolStatusClasses(item, tool);
      if (writeOffState.selectedIds.has(tool.__selectionId)) {
        item.classList.add("is-selected");
      }
      const check = document.createElement("div");
      check.className = "writeoff-item__check";
      check.textContent = writeOffState.selectedIds.has(tool.__selectionId) ? "✓" : "";
      const content = document.createElement("div");
      content.className = "writeoff-item__content";
      const details = document.createElement("div");
      details.className = "writeoff-item__details";
      const accountingColumn = document.createElement("div");
      accountingColumn.className = "writeoff-item__column writeoff-item__column--accounting";
      const infoColumn = document.createElement("div");
      infoColumn.className = "writeoff-item__column writeoff-item__column--info";
      const title = document.createElement("div");
      title.className = "writeoff-item__title";
      const accounting = String(tool?.["Бух.номер"] ?? "").trim();
      const number = String(tool?.["Номер"] ?? "").trim();
      const name = String(tool?.["Наименование"] ?? "").trim();
      title.textContent = name || "Без названия";
      const accountingValue = document.createElement("div");
      accountingValue.className = "writeoff-item__accounting-value";
      accountingValue.textContent = accounting || number || "—";
      const meta = document.createElement("div");
      meta.className = "writeoff-item__meta";
      const isMovingNow = Boolean(tool?.__pendingMove);
      const statusText = normalizeToolsInfoStatus(tool?.["Статус"], isMovingNow);
      const objectLine = document.createElement("div");
      objectLine.className = "writeoff-item__meta-line writeoff-item__meta-line--main";
      const objectValue = String(tool?.["Объект"] ?? "").trim() || "—";
      const numberValue = number || accounting || "—";
      objectLine.textContent = `№ ${numberValue} · Объект: ${objectValue}`;
      const responsibleValue = String(tool?.["Ответственный"] ?? "").trim();
      const responsibleLine = document.createElement("div");
      responsibleLine.className = "writeoff-item__meta-line";
      responsibleLine.textContent = responsibleValue || "—";
      const costLine = document.createElement("div");
      costLine.textContent = formatToolCostLabel(tool);
      const statusLine = document.createElement("div");
      statusLine.className = "writeoff-item__status-line";
      const statusLabel = document.createElement("span");
      statusLabel.className = "writeoff-item__status-label";
      statusLabel.textContent = "Статус:";
      const statusBadge = document.createElement("span");
      statusBadge.className = "writeoff-item__status-badge tools-card__status-value";
      const normalizedStatus = String(statusText ?? "").trim().toLocaleLowerCase("ru");
      const statusToneClass =
        normalizedStatus === "рабочий" || normalizedStatus === "исправный"
          ? "tools-card__status-value--working"
          : normalizedStatus === "в ремонте"
            ? "tools-card__status-value--repair"
            : normalizedStatus === "сломан"
              ? "tools-card__status-value--broken"
              : normalizedStatus === "на списание"
                ? "tools-card__status-value--writeoff"
                : normalizedStatus === "в процессе перемещения" || normalizedStatus === "перемещается"
                  ? "tools-card__status-value--moving"
                  : "";
      if (statusToneClass) statusBadge.classList.add(statusToneClass);
      statusBadge.textContent = statusText || "—";
      statusLine.append(statusLabel, statusBadge);
      meta.append(objectLine, responsibleLine, costLine, statusLine);
      accountingColumn.append(accountingValue);
      infoColumn.append(title, meta);
      details.append(accountingColumn, infoColumn);
      content.append(details);
      item.append(check, content);
      writeOffListEl.appendChild(item);
    });
    if (writeOffEmptyEl) {
      writeOffEmptyEl.classList.toggle("is-hidden", writeOffState.filtered.length > 0);
    }
    updateWriteOffSelectionUi();
  };

  const prepareWriteOffFilters = () => {
    const collectValues = (field) => {
      const set = new Set();
      writeOffState.tools.forEach((tool) => {
        const value = String(tool?.[field] ?? "").trim();
        if (value) set.add(value);
      });
      return Array.from(set).sort((a, b) =>
        a.localeCompare(b, "ru", { numeric: true })
      );
    };

    fillToolsFilterOptions("group", collectValues("Граппа инструментов"));
    fillToolsFilterOptions("object", collectValues("Объект"));
    fillToolsFilterOptions("status", collectValues("Статус"));
    fillToolsFilterOptions("responsible", collectValues("Ответственный"));
    fillToolsFilterOptions("name", collectValues("Наименование"));
    fillToolsFilterOptions("model", collectValues("Модель"));
    fillToolsFilterOptions(
      "photo",
      [
        { value: "with", label: "С фото" },
        { value: "without", label: "Без фото" },
      ].map((item) => item.label)
    );

    const photoContainerEl = contentEl.querySelector(
      '.writeoff-modal .tools-filter-dropdown[data-tools-filter="photo"]'
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
  };

  const applyWriteOffFilters = () => {
    const query = writeOffState.search.trim();
    const tokens = query ? query.split(/\s+/).filter(Boolean) : [];
    const availableTools = writeOffState.filterWriteOffOnly
      ? writeOffState.tools.filter(
          (tool) =>
            String(tool?.["Статус"] ?? "").trim().toLowerCase() === "на списание"
        )
      : writeOffState.tools;
    const filteredByDropdowns = availableTools.filter((tool) =>
      doesToolMatchSelectedFilters(tool)
    );
    if (tokens.length) {
      const numericTokens = tokens.filter((token) => /\d/.test(token));
      if (numericTokens.length === tokens.length) {
        writeOffState.filtered = filteredByDropdowns.filter((tool) => {
          const searchLine = tool.__accountingSearchLine ?? "";
          return numericTokens.every((token) => searchLine.includes(token));
        });
      } else {
        writeOffState.filtered = filteredByDropdowns.filter((tool) => {
          const searchLine = tool.__searchLine ?? "";
          return tokens.every((token) => searchLine.includes(token));
        });
      }
    } else {
      writeOffState.filtered = [...filteredByDropdowns];
    }
    renderWriteOffList();
    updateWriteOffFilterButton();
  };

  const loadWriteOffTools = async () => {
    const orgFolder = context.orgFolderName ?? "";
    writeOffState.orgFolder = orgFolder;
    if (!orgFolder) {
      writeOffState.tools = [];
      writeOffState.filtered = [];
      setWriteOffSubtitle("Не удалось определить организацию.");
      renderWriteOffList();
      return;
    }
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    let rawTools = [];
    try {
      const raw = await loadJson(toolsPath);
      rawTools = Array.isArray(raw) ? raw : Array.isArray(raw?.tools) ? raw.tools : [];
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов.", error);
      rawTools = [];
    }
    const { pendingNumbers, pendingAccountingNumbers } =
      await loadPendingMoves(orgFolder);
    writeOffState.toolMap.clear();
    writeOffState.tools = rawTools
      .map((tool, index) => {
        const selectionId = buildToolSelectionId(tool, index);
        const number = String(tool?.["Номер"] ?? "").trim();
        const accounting = String(tool?.["Бух.номер"] ?? "").trim();
        const hasPendingMove =
          (number && pendingNumbers.has(number)) ||
          (accounting && pendingAccountingNumbers.has(accounting));
        const entry = {
          ...tool,
          __selectionId: selectionId,
          __searchLine: buildWriteOffSearchLine(tool),
          __accountingSearchLine: buildWriteOffNumberSearchLine(
            tool?.["Бух.номер"]
          ),
          __pendingMove: hasPendingMove,
          __statusTone: resolveToolStatusTone(tool),
        };
        writeOffState.toolMap.set(selectionId, entry);
        return entry;
      })
      .sort((a, b) =>
        resolveToolNumberValue(a).localeCompare(resolveToolNumberValue(b), "ru", {
          numeric: true,
        })
      );
    prepareWriteOffFilters();
    applyWriteOffFilters();
  };

  const resetWriteOffState = () => {
    writeOffState.search = "";
    writeOffState.selectedIds.clear();
    writeOffState.selectedTools = [];
    writeOffState.confirmTools = [];
    writeOffState.filterWriteOffOnly = false;
    if (writeOffSearchInput) {
      writeOffSearchInput.value = "";
    }
    setWriteOffFiltersOpen(false);
    updateWriteOffFilterButton();
    updateWriteOffSelectionUi();
  };

  const openWriteOffModal = async () => {
    if (!writeOffModalEl) return;
    writeOffModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setWriteOffSubtitle("Загружаем инструменты...");
    setWriteOffMessage("");
    resetWriteOffState();
    await loadWriteOffTools();
    setWriteOffSubtitle(formatWriteOffToolsSummary(writeOffState.tools));
    if (
      writeOffSearchInput &&
      (typeof window === "undefined" ||
        !window.matchMedia ||
        !window.matchMedia("(max-width: 520px)").matches)
    ) {
      writeOffSearchInput.focus();
    }
  };

  const closeWriteOffModal = () => {
    if (!writeOffModalEl) return;
    writeOffModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
    setWriteOffMessage("");
    resetWriteOffState();
  };

  const updateWriteOffConfirmSelectionUi = () => {
    const count = writeOffState.selectedTools.length;
    if (writeOffConfirmCountEl) {
      writeOffConfirmCountEl.textContent = String(count);
    }
    if (writeOffConfirmSubmitButton) {
      writeOffConfirmSubmitButton.disabled = count === 0;
    }
  };

  const getWriteOffConfirmToolId = (tool, index = 0) =>
    String(tool?.__selectionId ?? buildToolSelectionId(tool, index));

  const renderWriteOffConfirmList = (tools) => {
    if (!writeOffConfirmListEl) return;
    writeOffConfirmListEl.innerHTML = "";
    tools.forEach((tool, index) => {
      const accounting = String(tool?.["Бух.номер"] ?? "").trim();
      const number = String(tool?.["Номер"] ?? "").trim();
      const name = String(tool?.["Наименование"] ?? "").trim();
      const item = document.createElement("button");
      item.className = "writeoff-confirm-item is-selected";
      item.type = "button";
      item.dataset.writeoffConfirmId = getWriteOffConfirmToolId(tool, index);
      item.setAttribute("aria-pressed", "true");
      item.textContent =
        [accounting || number, name].filter(Boolean).join(" · ") || "Инструмент";
      writeOffConfirmListEl.appendChild(item);
    });
    updateWriteOffConfirmSelectionUi();
  };

  const openWriteOffConfirmModal = () => {
    if (!writeOffConfirmModalEl) return;
    const selectedTools = Array.from(writeOffState.selectedIds)
      .map((id) => writeOffState.toolMap.get(id))
      .filter(Boolean);
    if (!selectedTools.length) {
      setWriteOffMessage("Сначала выберите инструменты.", "error");
      return;
    }
    writeOffState.confirmTools = selectedTools;
    writeOffState.selectedTools = [...selectedTools];
    renderWriteOffConfirmList(selectedTools);
    if (writeOffActsInput) {
      writeOffActsInput.value = "";
    }
    setWriteOffConfirmMessage("");
    writeOffConfirmModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const closeWriteOffConfirmModal = () => {
    if (!writeOffConfirmModalEl) return;
    writeOffConfirmModalEl.classList.add("is-hidden");
    setWriteOffConfirmMessage("");
    if (writeOffModalEl && !writeOffModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const collectWriteOffMatchKeys = (tools) => {
    const keys = new Set();
    tools.forEach((tool) => {
      const number = String(tool?.["Номер"] ?? "").trim();
      const accounting = String(tool?.["Бух.номер"] ?? "").trim();
      if (number) keys.add(`n:${number}`);
      if (accounting) keys.add(`a:${accounting}`);
    });
    return keys;
  };

  const buildWriteOffFileChunks = (numbers, maxLength = 160) => {
    const chunks = [];
    let current = [];
    let currentLength = 0;
    numbers.forEach((number) => {
      const safe = sanitizeFileName(String(number ?? "").trim());
      if (!safe) return;
      const nextLength = currentLength ? currentLength + safe.length + 1 : safe.length;
      if (nextLength > maxLength && current.length) {
        chunks.push([...current]);
        current = [safe];
        currentLength = safe.length;
      } else {
        current.push(safe);
        currentLength = nextLength;
      }
    });
    if (current.length) {
      chunks.push(current);
    }
    return chunks.length ? chunks : [["акт"]];
  };

  const filterToolPhotoFiles = (files, tools) => {
    if (!files.length || !tools.length) return [];
    const variants = new Set();
    tools.forEach((tool) => {
      const numbers = [tool?.["Номер"], tool?.["Бух.номер"]];
      numbers.forEach((value) => {
        const list = getToolNumberVariants(value);
        list.forEach((item) =>
          variants.add(normalizeToolNumberValue(item))
        );
      });
    });
    return files.filter((fileName) => {
      const decoded = String(fileName ?? "");
      const match = decoded.match(/(\d+)/);
      if (!match) return false;
      const normalized = normalizeToolNumberValue(match[1]);
      return normalized && variants.has(normalized);
    });
  };

  const applyWriteOff = async () => {
    if (writeOffState.isSaving) return;
    const selectedTools = writeOffConfirmModalEl &&
      !writeOffConfirmModalEl.classList.contains("is-hidden")
      ? writeOffState.selectedTools
      : writeOffState.selectedTools.length
        ? writeOffState.selectedTools
        : Array.from(writeOffState.selectedIds)
            .map((id) => writeOffState.toolMap.get(id))
            .filter(Boolean);
    if (!selectedTools.length) {
      setWriteOffConfirmMessage("Сначала выберите инструменты.", "error");
      return;
    }
    const actFiles = Array.from(writeOffActsInput?.files ?? []);
    if (!actFiles.length) {
      setWriteOffConfirmMessage("Добавьте акт на списание.", "error");
      return;
    }
    if (!context.orgFolderName) {
      setWriteOffConfirmMessage("Не удалось определить организацию.", "error");
      return;
    }
    writeOffState.isSaving = true;
    setWriteOffConfirmMessage("Списываем инструменты...", "info");

    const orgFolder = context.orgFolderName;
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    const writeOffPath = `./${orgFolder}/Списания.json`;
    const movesPath = `./${orgFolder}/Перемещения.json`;
    const movesHistoryPath = `./${orgFolder}/Перемещения история.json`;
    const writeOffDate = formatDateValue(new Date());
    const writeOffUser = String(user?.full_name ?? "").trim();
    const matchKeys = collectWriteOffMatchKeys(selectedTools);

    let toolsPayloadRaw = [];
    try {
      toolsPayloadRaw = await loadJson(toolsPath);
    } catch (error) {
      toolsPayloadRaw = [];
    }
    const toolsNormalized = normalizeCollectionPayload(toolsPayloadRaw, "tools");
    const remainingTools = toolsNormalized.items.filter((tool) => {
      const number = String(tool?.["Номер"] ?? "").trim();
      const accounting = String(tool?.["Бух.номер"] ?? "").trim();
      if (number && matchKeys.has(`n:${number}`)) return false;
      if (accounting && matchKeys.has(`a:${accounting}`)) return false;
      return true;
    });
    const updatedToolsPayload = toolsNormalized.wrapper
      ? { ...toolsNormalized.wrapper, [toolsNormalized.key]: remainingTools }
      : remainingTools;

    let writeOffRaw = [];
    try {
      writeOffRaw = await loadJson(writeOffPath);
    } catch (error) {
      writeOffRaw = [];
    }
    const writeOffNormalized = normalizeCollectionPayload(writeOffRaw, "items");
    const writeOffEntries = selectedTools.map((tool) => ({
      ...tool,
      "Дата списания": writeOffDate,
      "Списал": writeOffUser,
    }));
    const updatedWriteOff = [
      ...writeOffNormalized.items,
      ...writeOffEntries,
    ];
    const updatedWriteOffPayload = writeOffNormalized.wrapper
      ? { ...writeOffNormalized.wrapper, [writeOffNormalized.key]: updatedWriteOff }
      : updatedWriteOff;

    let movesRaw = [];
    try {
      movesRaw = await loadJson(movesPath);
    } catch (error) {
      movesRaw = [];
    }
    const movesNormalized = normalizeCollectionPayload(movesRaw, "moves");
    const movedFromActive = [];
    const remainingMoves = movesNormalized.items.filter((move) => {
      const number = String(move?.["Номер"] ?? "").trim();
      const accounting = String(move?.["Бух.номер"] ?? "").trim();
      const shouldMove =
        (number && matchKeys.has(`n:${number}`)) ||
        (accounting && matchKeys.has(`a:${accounting}`));
      if (shouldMove) {
        movedFromActive.push(move);
      }
      return !shouldMove;
    });
    const updatedMovesPayload = movesNormalized.wrapper
      ? { ...movesNormalized.wrapper, [movesNormalized.key]: remainingMoves }
      : remainingMoves;

    let historyRaw = [];
    try {
      historyRaw = await loadJson(movesHistoryPath);
    } catch (error) {
      historyRaw = [];
    }
    const historyNormalized = normalizeCollectionPayload(historyRaw, "moves");
    const updatedHistory = [
      ...historyNormalized.items,
      ...movedFromActive,
    ];
    const updatedHistoryPayload = historyNormalized.wrapper
      ? { ...historyNormalized.wrapper, [historyNormalized.key]: updatedHistory }
      : updatedHistory;

    const listToolPhotos = async () => {
      const payload = JSON.stringify({
        entries: [
          {
            type: "list-photos",
            path: `${orgFolder}/Фото инструментов`,
            ...buildUploadUserMeta({ organizationName: context.orgFullName }),
          },
        ],
      });
      const response = await fetch(saveEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      if (!response.ok) {
        throw new Error("Не удалось загрузить список фото.");
      }
      const responseText = await response.text();
      if (!responseText) return [];
      const parsed = JSON.parse(responseText);
      return Array.isArray(parsed?.files) ? parsed.files : [];
    };

    const buildActFileName = (base, index, chunkIndex, extension) => {
      const suffixes = [];
      if (actFiles.length > 1) {
        suffixes.push(`акт${index + 1}`);
      }
      if (chunkIndex > 0) {
        suffixes.push(`часть${chunkIndex + 1}`);
      }
      const suffix = suffixes.length ? `_${suffixes.join("_")}` : "";
      return `${base}${suffix}.${extension}`;
    };

    try {
      const entries = [
        { path: toolsPath, data: updatedToolsPayload, user },
        { path: writeOffPath, data: updatedWriteOffPayload, user },
        { path: movesPath, data: updatedMovesPayload, user },
        { path: movesHistoryPath, data: updatedHistoryPayload, user },
      ];
      await saveEntries(entries);

      let movedPhotosCount = 0;
      try {
        const files = await listToolPhotos();
        const targetFiles = filterToolPhotoFiles(files, selectedTools);
        if (targetFiles.length) {
          const moveEntries = targetFiles.map((fileName) => ({
            type: "move-file",
            from: `${orgFolder}/Фото инструментов/${fileName}`,
            to: `${orgFolder}/Фото инструментов. Списание/${fileName}`,
            ...buildUploadUserMeta({ organizationName: context.orgFullName }),
          }));
          await saveEntriesViaEndpoint(moveEntries);
          movedPhotosCount = targetFiles.length;
        }
      } catch (error) {
        console.warn("Не удалось перенести фото списания.", error);
      }

      const numbers = selectedTools
        .map((tool) => String(tool?.["Бух.номер"] ?? "").trim())
        .filter(Boolean);
      if (!numbers.length) {
        numbers.push(
          ...selectedTools
            .map((tool) => String(tool?.["Номер"] ?? "").trim())
            .filter(Boolean)
        );
      }
      const chunks = buildWriteOffFileChunks(numbers);
      const fileEntries = [];
      for (let index = 0; index < actFiles.length; index += 1) {
        const file = actFiles[index];
        const base64 = await readFileAsBase64(file);
        const nameParts = String(file?.name ?? "").split(".");
        let extension =
          nameParts.length > 1 ? nameParts.pop().toLowerCase() : "";
        if (!extension && file?.type) {
          const typeParts = file.type.split("/");
          extension = typeParts[typeParts.length - 1] || "";
        }
        if (!extension) {
          extension = "file";
        }
        chunks.forEach((chunk, chunkIndex) => {
          const base = chunk.join("_") || "акт";
          const fileName = buildActFileName(base, index, chunkIndex, extension);
          fileEntries.push({
            type: "file",
            path: `${orgFolder}/Акты списания/${fileName}`,
            content: base64,
            encoding: "base64",
            ...buildUploadUserMeta({ organizationName: context.orgFullName }),
          });
        });
      }
      if (fileEntries.length) {
        await uploadPhotoEntriesInBatches(fileEntries);
      }

      const photoMessage = movedPhotosCount
        ? ` Фото перенесено: ${movedPhotosCount}.`
        : "";
      const notificationResults = await Promise.all(
        selectedTools.map((tool) =>
          notifyWriteOffTool({
            tool,
            orgFolder,
            organizationName: context.orgFullName,
            writeOffDate,
            wroteOffBy: writeOffUser,
          })
        )
      );
      const notificationStatus = analyzeNotificationResults(notificationResults);
      const notificationSummary = notificationStatus.summary
        ? ` ${notificationStatus.summary}`
        : "";
      setWriteOffConfirmMessage(
        `Списание выполнено.${photoMessage}${notificationSummary}`,
        notificationStatus.allSent ? "success" : "error"
      );
      await loadWriteOffTools();
      resetWriteOffState();
      setTimeout(() => {
        closeWriteOffConfirmModal();
        closeWriteOffModal();
      }, 700);
    } catch (error) {
      console.error(error);
      setWriteOffConfirmMessage(
        "Не удалось списать инструменты. Проверьте сервер.",
        "error"
      );
    } finally {
      writeOffState.isSaving = false;
    }
  };

  const setPendingMovesSubtitle = (text) => {
    if (!pendingMovesSubtitleEl) return;
    const subtitle = String(text ?? "").trim();
    pendingMovesSubtitleEl.textContent = subtitle;
    pendingMovesSubtitleEl.classList.toggle("is-hidden", !subtitle);
    pendingMovesSubtitleEl.setAttribute("aria-hidden", String(!subtitle));
  };

  const setPendingMovesBulkActionsVisible = (isVisible) => {
    if (!pendingMovesActionsEl) return;
    const visible = Boolean(isVisible);
    pendingMovesActionsEl.classList.toggle("is-hidden", !visible);
    pendingMovesActionsEl.setAttribute("aria-hidden", String(!visible));
  };

  const setPendingMovesMessage = (text, type = "info") => {
    if (!pendingMovesMessageEl) return;
    pendingMovesMessageEl.textContent = text;
    pendingMovesMessageEl.classList.remove("is-error", "is-success", "is-info");
    pendingMovesMessageEl.classList.add(`is-${type}`);
  };

  const setPendingMovesSavingState = (isSaving) => {
    const saving = Boolean(isSaving);
    pendingMovesState.isSaving = saving;
    pendingMovesModalEl?.classList.toggle("is-loading", saving);
    if (pendingMovesLoadingEl) {
      pendingMovesLoadingEl.classList.toggle("is-hidden", !saving);
      pendingMovesLoadingEl.setAttribute("aria-hidden", String(!saving));
    }
    pendingMovesModalEl?.setAttribute("aria-busy", String(saving));
  };

  const setPendingMovesDeclineMessage = (text = "", type = "") => {
    if (!pendingMovesDeclineMessageEl) return;
    pendingMovesDeclineMessageEl.textContent = text;
    pendingMovesDeclineMessageEl.classList.remove("is-error", "is-success", "is-info");
    if (type) {
      pendingMovesDeclineMessageEl.classList.add(`is-${type}`);
    }
  };

  const closePendingMovesDeclineModal = (shouldResolve = true) => {
    if (!pendingMovesDeclineModalEl) return;
    pendingMovesDeclineModalEl.classList.add("is-hidden");
    if (pendingMovesDeclineReasonEl) {
      pendingMovesDeclineReasonEl.value = "";
    }
    if (pendingMovesDeclinePhotoInput) {
      pendingMovesDeclinePhotoInput.value = "";
    }
    setPendingMovesDeclineMessage("");
    if (pendingMovesDeclineResolver && shouldResolve) {
      pendingMovesDeclineResolver({ reason: "", photoFile: null });
      pendingMovesDeclineResolver = null;
    }
  };

  const openPendingMovesDeclineModal = () => {
    if (!pendingMovesDeclineModalEl) return;
    pendingMovesDeclineModalEl.classList.remove("is-hidden");
    if (pendingMovesDeclineReasonEl) {
      pendingMovesDeclineReasonEl.focus();
    }
  };

  const requestPendingMovesDeclineReason = () =>
    new Promise((resolve) => {
      if (!pendingMovesDeclineModalEl || !pendingMovesDeclineFormEl) {
        const reason = window.prompt("Укажите причину отказа") ?? "";
        resolve({ reason: reason.trim(), photoFile: null });
        return;
      }
      pendingMovesDeclineResolver = resolve;
      setPendingMovesDeclineMessage("");
      if (pendingMovesDeclinePhotoInput) {
        pendingMovesDeclinePhotoInput.value = "";
      }
      openPendingMovesDeclineModal();
    });

  const normalizeCollectionPayload = (raw, key) => {
    if (Array.isArray(raw)) {
      return { items: raw, wrapper: null, key: null };
    }
    if (raw && Array.isArray(raw[key])) {
      return { items: raw[key], wrapper: raw, key };
    }
    return {
      items: [],
      wrapper: raw && typeof raw === "object" ? raw : null,
      key: raw && typeof raw === "object" ? key : null,
    };
  };

  const findPendingMoveForTool = (moves, tool) => {
    if (!tool || !moves.length) return null;
    const number = String(tool?.["Номер"] ?? "").trim();
    const accounting = String(tool?.["Бух.номер"] ?? "").trim();
    const moverName = normalizePersonName(user?.full_name ?? "");
    const matchIndex = moves.findIndex((move) => {
      const responseDate = String(move?.["Дата ответа"] ?? "").trim();
      if (responseDate) return false;
      const moveNumber = String(move?.["Номер"] ?? "").trim();
      const moveAccounting = String(move?.["Бух.номер"] ?? "").trim();
      const sameTool =
        (number && moveNumber && number === moveNumber) ||
        (accounting && moveAccounting && accounting === moveAccounting);
      if (!sameTool) return false;
      const movedBy = normalizePersonName(move?.["Переместил"] ?? "");
      return moverName ? movedBy === moverName : true;
    });
    if (matchIndex < 0) return null;
    return { move: moves[matchIndex], moveIndex: matchIndex };
  };

  const syncToolsInfoCancelMoveButton = async (tool) => {
    if (!toolsInfoCancelMoveButton) return;
    toolsInfoCancelMoveButton.classList.add("is-hidden");
    toolsInfoCancelMoveButton.disabled = true;
    if (toolsState.mode === "search") {
      toolsInfoCancelMoveButton.setAttribute("aria-hidden", "true");
      return;
    }
    toolsInfoCancelMoveButton.removeAttribute("aria-hidden");
    if (!tool) return;
    const orgFolder = context.orgFolderName ?? "";
    if (!orgFolder) return;
    try {
      const rawMoves = await loadJson(`./${orgFolder}/Перемещения.json`);
      const normalizedMoves = normalizeCollectionPayload(rawMoves, "moves");
      const pendingEntry = findPendingMoveForTool(normalizedMoves.items, tool);
      if (!pendingEntry) return;
      toolsInfoCancelMoveButton.classList.remove("is-hidden");
      toolsInfoCancelMoveButton.disabled = false;
    } catch (error) {
      console.warn("Не удалось проверить возможность отмены перемещения.", error);
    }
  };

  const registerMoveCancelFine = async (move) => {
    const orgFolder = context.orgFolderName ?? "";
    if (!orgFolder) return;
    const fineConfig = settingsData?.organization?.fines?.lateReply ?? {};
    const lateReplyFineAmount = resolveLateReplyFine(move, fineConfig);
    if (!lateReplyFineAmount) return;
    const finedUser = String(move?.["Принял"] ?? "").trim();
    if (!finedUser) return;
    const summaryUpdates = new Map([[finedUser, new Map([["Поздний ответ", lateReplyFineAmount]])]]);
    const finesPath = `./${orgFolder}/Штрафы.json`;
    let rawFines = {};
    try {
      rawFines = await loadJson(finesPath);
    } catch (error) {
      rawFines = {};
    }
    const finesPayload = applyMoveFinesSummaryUpdates(rawFines, summaryUpdates);
    await saveJson(finesPath, finesPayload, { user });
  };

  const registerNoPhotoFineForTool = async (tool, amount) => {
    const orgFolder = context.orgFolderName ?? noPhotoState.orgFolder ?? addPhotoState.orgFolder ?? "";
    const fineAmount = normalizeCostValue(amount);
    if (!orgFolder || !fineAmount) return;

    const finedUser = String(tool?.["Ответственный"] ?? "").trim();
    if (!finedUser) return;

    const toolNumber = String(tool?.["Номер"] ?? "").trim();
    const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
    const identifier = toolNumber || accountingNumber || "без номера";
    const fineDate = new Date().toISOString().slice(0, 10);
    const finesPath = `./${orgFolder}/Штрафы.json`;

    let rawFines = {};
    try {
      rawFines = await loadJson(finesPath);
    } catch (error) {
      rawFines = {};
    }

    const summaryUpdates = new Map([
      [finedUser, new Map([["Нет фото", fineAmount]])],
    ]);
    const finesPayload = applyMoveFinesSummaryUpdates(rawFines, summaryUpdates);
    const currentFineList = Array.isArray(finesPayload?.fines)
      ? finesPayload.fines
      : [];
    const nextFineList = [
      ...currentFineList,
      {
        Дата: fineDate,
        Ответственный: finedUser,
        Сумма: fineAmount,
        Причина: `Зафиксирован штраф за отсутствие фото инструмента №${identifier}`,
        "Тип штрафа": "Нет фото",
      },
    ];

    await saveJson(
      finesPath,
      {
        ...finesPayload,
        fines: nextFineList,
      },
      { user }
    );
  };


  const openToolsCancelMoveModal = async (tool) => {
    if (!toolsCancelMoveModalEl) return;
    resetToolsCancelMoveState();
    toolsCancelMoveModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setToolsCancelMoveMessage("Проверяем перемещение...", "info");
    if (toolsCancelMoveInfoEl) {
      toolsCancelMoveInfoEl.textContent = "";
    }
    const orgFolder = context.orgFolderName ?? "";
    if (!orgFolder) {
      setToolsCancelMoveMessage("Не удалось определить организацию.", "error");
      return;
    }
    const movesPath = `./${orgFolder}/Перемещения.json`;
    try {
      const rawMoves = await loadJson(movesPath);
      const normalizedMoves = normalizeCollectionPayload(rawMoves, "moves");
      const pendingEntry = findPendingMoveForTool(
        normalizedMoves.items,
        tool
      );
      if (!pendingEntry) {
        setToolsCancelMoveMessage(
          "Перемещение не найдено или уже закрыто.",
          "error"
        );
        return;
      }
      toolsCancelMoveState.move = pendingEntry.move;
      toolsCancelMoveState.moveIndex = pendingEntry.moveIndex;
      toolsCancelMoveState.tool = tool;
      toolsCancelMoveState.movesPayload = normalizedMoves;
      if (toolsCancelMoveInfoEl) {
        toolsCancelMoveInfoEl.textContent = buildToolsCancelMoveInfo(
          tool,
          pendingEntry.move
        );
      }
      if (toolsCancelMoveConfirmButton) {
        toolsCancelMoveConfirmButton.disabled = false;
      }
      setToolsCancelMoveMessage("", "info");
    } catch (error) {
      console.warn("Не удалось загрузить перемещения для отмены.", error);
      setToolsCancelMoveMessage(
        "Не удалось загрузить перемещения. Попробуйте позже.",
        "error"
      );
    }
  };

  const closeToolsCancelMoveModal = () => {
    if (!toolsCancelMoveModalEl) return;
    toolsCancelMoveModalEl.classList.add("is-hidden");
    if (toolsModalEl && !toolsModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    setToolsCancelMoveMessage("");
    resetToolsCancelMoveState();
  };

  const applyToolsMoveCancel = async () => {
    if (toolsCancelMoveState.isSaving) return;
    const { move, moveIndex, tool, movesPayload } = toolsCancelMoveState;
    if (!move || moveIndex === null || moveIndex === undefined) {
      setToolsCancelMoveMessage(
        "Перемещение не найдено для отмены.",
        "error"
      );
      return;
    }
    toolsCancelMoveState.isSaving = true;
    setToolsCancelMoveMessage("Отменяем перемещение...", "info");
    const responseDate = formatDateValue(new Date());
    const fineConfig = settingsData?.organization?.fines?.lateReply ?? {};
    const lateReplyFineAmount = resolveLateReplyFine(move, fineConfig);
    const updatedMoves = [...movesPayload.items];
    updatedMoves[moveIndex] = {
      ...move,
      "Дата ответа": responseDate,
      Ответ: "Отмена перемещения",
      "Комментарий к ответу": "Отмена перемещения пользователем",
      "Отменил": String(user?.full_name ?? "").trim(),
      "Дата отмены": responseDate,
      ...(lateReplyFineAmount > 0
        ? {
            "Штраф за ответ": lateReplyFineAmount,
            "Тип штрафа": "Поздний ответ",
            "Штраф за поздний ответ": "Да",
          }
        : {}),
    };
    const movesPath = `./${context.orgFolderName}/Перемещения.json`;
    const movesPayloadOut = movesPayload.wrapper
      ? { ...movesPayload.wrapper, [movesPayload.key]: updatedMoves }
      : updatedMoves;
    try {
      await saveJson(movesPath, movesPayloadOut, { user });
      await registerMoveCancelFine(updatedMoves[moveIndex]);
      const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
      const organizationName = findUserOrganizationName(user, usersData);
      await notifyMoveCancel({
        tool,
        move: updatedMoves[moveIndex],
        orgFolder: context.orgFolderName,
        organizationName,
        canceledBy: String(user?.full_name ?? "").trim(),
      });
      setToolsCancelMoveMessage("Перемещение отменено.", "success");
      await loadUserTools();
      await refreshPendingMovesIndicator();
      await refreshAwaitingReplyIndicator();
      setTimeout(() => {
        closeToolsCancelMoveModal();
      }, 600);
    } catch (error) {
      console.error(error);
      setToolsCancelMoveMessage("Не удалось отменить перемещение.", "error");
    } finally {
      toolsCancelMoveState.isSaving = false;
    }
  };

  const resolveMoveFineAmount = (move) => {
    const candidates = [
      move?.["Штраф за ответ"],
      move?.["Штраф"],
      move?.["Сумма штрафа"],
      move?.["Штраф (руб)"],
    ];
    for (const candidate of candidates) {
      const amount = normalizeCostValue(candidate);
      if (amount) return amount;
    }
    return 0;
  };
  const splitMoveFineByVacation = (move, totalFine, vacationStartAt) => {
    const normalizedFine = normalizeCostValue(totalFine) || 0;
    if (!normalizedFine) {
      return { beforeVacation: 0, afterVacation: 0 };
    }
    const vacationStartDate = parseDateValue(vacationStartAt);
    const moveDate = parseDateValue(move?.["Дата перемещения"]);
    const responseDate = parseDateValue(move?.["Дата ответа"]) ?? new Date();
    if (!vacationStartDate || !moveDate || !responseDate) {
      return { beforeVacation: normalizedFine, afterVacation: 0 };
    }

    const daysLimit = normalizeNumber(pendingMovesState.fineConfig?.days, 0);
    const amountPerDay = normalizeNumber(pendingMovesState.fineConfig?.amount, 0);
    if (!amountPerDay) {
      return { beforeVacation: normalizedFine, afterVacation: 0 };
    }

    const startFineAt = new Date(moveDate);
    startFineAt.setDate(startFineAt.getDate() + Math.max(0, daysLimit + 1));

    const chargedDaysTotal = Math.max(0, Math.round(normalizedFine / amountPerDay));
    if (!chargedDaysTotal) {
      return { beforeVacation: 0, afterVacation: 0 };
    }

    let beforeDays = 0;
    for (let dayIndex = 0; dayIndex < chargedDaysTotal; dayIndex += 1) {
      const dayDate = new Date(startFineAt);
      dayDate.setDate(startFineAt.getDate() + dayIndex);
      if (dayDate >= responseDate) break;
      if (dayDate < vacationStartDate) {
        beforeDays += 1;
      }
    }
    const afterDays = Math.max(0, chargedDaysTotal - beforeDays);
    const beforeVacation = beforeDays * amountPerDay;
    const afterVacation = normalizedFine - beforeVacation;
    return {
      beforeVacation: Math.max(0, beforeVacation),
      afterVacation: Math.max(0, afterVacation),
    };
  };


  const fineMoveTypeTitles = [
    "Поздний ответ",
    "Нет фото",
    "Перемещения энергетиком",
  ];

  const normalizeMoveFineType = (move) => {
    const rawType = String(
      move?.["Тип штрафа"] ?? move?.["Вид штрафа"] ?? ""
    )
      .trim()
      .toLowerCase();
    const rawReason = String(
      move?.["Причина штрафа"] ?? move?.["Причина"] ?? ""
    )
      .trim()
      .toLowerCase();
    const source = `${rawType} ${rawReason}`;
    if (source.includes("фото")) return "Нет фото";
    if (source.includes("энерг") && source.includes("перемещ")) {
      return "Перемещения энергетиком";
    }
    if (source.includes("позд") || source.includes("ответ")) {
      return "Поздний ответ";
    }
    return "Поздний ответ";
  };

  const createMoveFineSummary = () => ({
    "Штрафы по отвеченным перемещениям": 0,
    "Выставленные штрафы": 0,
    Простили: 0,
    Остаток: 0,
  });

  const createMoveFineSummaryByType = () => {
    const summaryByType = {};
    fineMoveTypeTitles.forEach((title) => {
      summaryByType[title] = createMoveFineSummary();
    });
    return summaryByType;
  };

  const applyMoveFinesSummaryUpdates = (rawFines, summaryUpdates) => {
    const fallbackBase =
      rawFines && typeof rawFines === "object" && !Array.isArray(rawFines)
        ? { ...rawFines }
        : {};
    const finesList = Array.isArray(rawFines)
      ? [...rawFines]
      : Array.isArray(fallbackBase.fines)
      ? [...fallbackBase.fines]
      : [];
    const summaryByUser =
      fallbackBase["Штрафы по пользователям"] &&
      typeof fallbackBase["Штрафы по пользователям"] === "object"
        ? { ...fallbackBase["Штрафы по пользователям"] }
        : {};

    summaryUpdates.forEach((userFineMap, userName) => {
      const normalizedUserName = String(userName ?? "").trim();
      if (!normalizedUserName) return;
      const userSummary =
        summaryByUser[normalizedUserName] &&
        typeof summaryByUser[normalizedUserName] === "object"
          ? { ...summaryByUser[normalizedUserName] }
          : createMoveFineSummaryByType();

      fineMoveTypeTitles.forEach((title) => {
        const currentTypeSummary =
          userSummary[title] && typeof userSummary[title] === "object"
            ? {
                ...createMoveFineSummary(),
                ...userSummary[title],
              }
            : createMoveFineSummary();
        const increase = normalizeCostValue(userFineMap.get(title)) || 0;
        if (increase > 0) {
          currentTypeSummary["Штрафы по отвеченным перемещениям"] =
            (
              normalizeCostValue(
                currentTypeSummary["Штрафы по отвеченным перемещениям"]
              ) || 0
            ) + increase;
          currentTypeSummary["Остаток"] =
            (normalizeCostValue(currentTypeSummary["Остаток"]) || 0) + increase;
        }
        currentTypeSummary["Выставленные штрафы"] =
          normalizeCostValue(currentTypeSummary["Выставленные штрафы"]) || 0;
        currentTypeSummary["Простили"] =
          normalizeCostValue(currentTypeSummary["Простили"]) || 0;
        userSummary[title] = currentTypeSummary;
      });
      summaryByUser[normalizedUserName] = userSummary;
    });

    return {
      ...fallbackBase,
      fines: finesList,
      "Штрафы по пользователям": summaryByUser,
    };
  };

  const buildMoveFineEntry = (move, amount, responseDate, decision, reason) => {
    const fineType = normalizeMoveFineType(move);
    const baseReason =
      String(move?.["Причина штрафа"] ?? move?.["Причина"] ?? "").trim() ||
      "Штраф за ответ";
    const entry = {
      Дата: responseDate,
      Ответственный: String(move?.["Принял"] ?? "").trim(),
      Сумма: amount,
      Причина: baseReason,
      "Тип штрафа": fineType,
    };
    return entry;
  };

  const buildToolIndexMap = (tools) => {
    const map = new Map();
    tools.forEach((tool, index) => {
      const number = String(tool?.["Номер"] ?? "").trim();
      const accounting = String(tool?.["Бух.номер"] ?? "").trim();
      if (number) map.set(`n:${number}`, index);
      if (accounting) map.set(`a:${accounting}`, index);
    });
    return map;
  };

  const closePendingMovePhotoViewer = () => {
    pendingMovePhotoViewerEl.classList.add("is-hidden");
    pendingMovePhotoViewerState.files = [];
    pendingMovePhotoViewerState.index = 0;
    pendingMovePhotoViewerState.touchStartX = null;
    pendingMovePhotoViewerState.pointers.clear();
    pendingMovePhotoViewerState.basePinchDistance = null;
    pendingMovePhotoViewerState.scale = 1;
    if (pendingPhotoViewerImageEl instanceof HTMLImageElement) {
      pendingPhotoViewerImageEl.removeAttribute("src");
      pendingPhotoViewerImageEl.alt = "Фото инструмента";
      pendingPhotoViewerImageEl.style.transform = "scale(1)";
    }
    if (pendingPhotoViewerCounterEl instanceof HTMLElement) {
      pendingPhotoViewerCounterEl.textContent = "1 / 1";
    }
  };

  const renderPendingMovePhotoViewer = () => {
    const files = pendingMovePhotoViewerState.files;
    const total = files.length;
    if (!total) {
      closePendingMovePhotoViewer();
      return;
    }
    if (pendingMovePhotoViewerState.index < 0) {
      pendingMovePhotoViewerState.index = total - 1;
    }
    if (pendingMovePhotoViewerState.index >= total) {
      pendingMovePhotoViewerState.index = 0;
    }
    const current = files[pendingMovePhotoViewerState.index];
    if (pendingPhotoViewerImageEl instanceof HTMLImageElement) {
      pendingPhotoViewerImageEl.src = current?.url ?? toolPhotoPlaceholder;
      pendingPhotoViewerImageEl.alt = current?.name
        ? `Фото инструмента: ${current.name}`
        : "Фото инструмента";
    }
    if (pendingPhotoViewerCounterEl instanceof HTMLElement) {
      pendingPhotoViewerCounterEl.textContent = `${pendingMovePhotoViewerState.index + 1} / ${total}`;
    }
    pendingMovePhotoViewerState.scale = 1;
    pendingMovePhotoViewerState.basePinchDistance = null;
    pendingMovePhotoViewerState.pointers.clear();
    pendingPhotoViewerImageEl.style.transform = "scale(1)";
  };

  const shiftPendingMovePhotoViewer = (step) => {
    if (!pendingMovePhotoViewerState.files.length) return;
    pendingMovePhotoViewerState.index += step;
    renderPendingMovePhotoViewer();
  };

  const setPendingPhotoViewerScale = (nextScale) => {
    if (!(pendingPhotoViewerImageEl instanceof HTMLImageElement)) return;
    const normalized = Math.min(4, Math.max(1, Number(nextScale) || 1));
    pendingMovePhotoViewerState.scale = normalized;
    pendingPhotoViewerImageEl.style.transform = `scale(${normalized})`;
  };

  const openPendingMovePhotoViewer = async ({ tool, fallbackNumber, title }) => {
    const orgFolder = toolsState.orgFolder || context.orgFolderName || "";
    if (!orgFolder || !tool) return;
    const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
    if (!(Number.isFinite(photoCount) && photoCount > 0)) return;
    const primaryPhotoNumber = resolveToolPhotoNumber(tool);
    const numberValue = String(tool?.["Номер"] ?? "").trim();
    const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
    const { files } = await loadToolPhotoFiles(
      orgFolder,
      primaryPhotoNumber,
      fallbackNumber,
      numberValue,
      accountingNumber
    );
    if (!files.length) return;
    pendingMovePhotoViewerState.files = files;
    pendingMovePhotoViewerState.index = 0;
    pendingMovePhotoViewerState.touchStartX = null;
    pendingMovePhotoViewerEl.classList.remove("is-hidden");
    renderPendingMovePhotoViewer();
    if (pendingPhotoViewerImageEl instanceof HTMLImageElement) {
      pendingPhotoViewerImageEl.alt = title
        ? `Фото инструмента ${title}`
        : "Фото инструмента";
    }
  };

  const renderPendingMovesList = () => {
    if (!pendingMovesListEl) return;
    pendingMovesListEl.innerHTML = "";
    const items = pendingMovesState.pendingItems;
    pendingMovesModalEl?.classList.toggle(
      "pending-moves-modal--empty",
      !items.length
    );
    if (!items.length) {
      pendingMovesEmptyEl?.classList.remove("is-hidden");
      setPendingMovesBulkActionsVisible(false);
      return;
    }
    pendingMovesEmptyEl?.classList.add("is-hidden");
    setPendingMovesBulkActionsVisible(true);
    const table = document.createElement("div");
    table.className = "tools-table pending-moves-tools-table";

    let currentReceiverGroup = "";
    items.forEach((item) => {
      const { move, tool, moveIndex, fineAmount } = item;
      const receiver = String(move?.["Принял"] ?? "").trim() || "Не указан принимающий";
      if (pendingMovesState.allReceiversMode && receiver !== currentReceiverGroup) {
        currentReceiverGroup = receiver;
        const groupRow = document.createElement("div");
        groupRow.className = "tools-table__row awaiting-reply-group-row";
        const groupCell = document.createElement("div");
        groupCell.className = "tools-table__cell awaiting-reply-group-cell";
        groupCell.setAttribute("role", "heading");
        groupCell.setAttribute("aria-level", "3");
        groupCell.textContent = `Принимающий: ${receiver}`;
        groupRow.appendChild(groupCell);
        table.appendChild(groupRow);
      }
      const row = document.createElement("div");
      row.className = "tools-table__row";
      row.dataset.moveIndex = String(moveIndex);
      const number =
        String(move?.["Номер"] ?? "").trim() ||
        String(move?.["Бух.номер"] ?? "").trim();
      const displayNumber = number || "—";
      const numberCell = document.createElement("div");
      numberCell.className = "tools-table__cell tools-table__cell--number pending-move-number-cell";
      numberCell.textContent = displayNumber;
      const infoCell = document.createElement("div");
      infoCell.className = "tools-table__cell pending-move-main-cell";
      const title = document.createElement("div");
      title.className = "tools-table__title";
      const meansName = String(tool?.["Наименование"] ?? "").trim();
      title.textContent = meansName || "Без названия";
      const meta = document.createElement("div");
      meta.className = "tools-table__meta tools-table__meta--stack";
      const manufacturer = String(tool?.["Производитель"] ?? "").trim();
      const model = String(tool?.["Модель"] ?? "").trim();
      const accountingNumber =
        String(tool?.["Бух.номер"] ?? "").trim() ||
        String(move?.["Бух.номер"] ?? "").trim() ||
        "—";
      const toolCost = normalizeCostValue(tool?.["Стоимость"]);
      const toolCostText = Number.isFinite(toolCost)
        ? `${formatNotificationCostWithoutCurrency(toolCost)} р.`
        : "—";
      const sender = String(move?.["Переместил"] ?? "").trim();
      const moveDate = String(move?.["Дата перемещения"] ?? "").trim();
      const hasPreviousResponsible = Object.prototype.hasOwnProperty.call(
        move ?? {},
        "Ответственный до перемещения"
      );
      const previousResponsible = hasPreviousResponsible
        ? String(move?.["Ответственный до перемещения"] ?? "").trim()
        : "";
      const movedByEnergy = String(move?.["Переместил энергетик"] ?? "").trim();
      const senderValue = movedByEnergy || sender;
      const senderLabel = movedByEnergy ? "Переместил энергетик" : "Переместил";
      const senderShortName = formatFullName(senderValue, 2);
      const previousResponsibleLabel = movedByEnergy
        ? "Ответственный"
        : "Ответственный до перемещения";
      const previousResponsibleShortName = formatFullName(previousResponsible, 2);
      const moveReason = String(move?.["Причина перемещения"] ?? "").trim();
      const sendReason = String(move?.["Причина отправки"] ?? "").trim();
      const moveComment = moveReason || sendReason;
      const moveCommentLabel = moveReason ? "Причина перемещения" : "Причина отправки";
      const sourceObject = String(move?.["Старый объект"] ?? "").trim();
      const targetObject = String(move?.["Новый объект"] ?? "").trim();
      const moveRoute =
        objectTrackingEnabled && (sourceObject || targetObject)
          ? `${sourceObject || "—"} ➜ ${targetObject || "—"}`
          : "";
      const receiverShortName = formatFullName(receiver, 2);
      const metaLines = [
        {
          text: pendingMovesState.allReceiversMode && receiverShortName
            ? `Принимает: ${receiverShortName}`
            : "",
          className: "pending-move-responsible",
          label: "Принимает",
          value: receiverShortName,
        },
        {
          text: [manufacturer, model].filter(Boolean).join(" · "),
          className: "pending-move-meta",
        },
        {
          text: `${accountingNumber} · ${toolCostText}`,
          className: "pending-move-meta",
        },
        {
          text: senderValue
            ? movedByEnergy
              ? `${senderLabel}: ${senderShortName}`
              : senderShortName
            : "",
          className: "pending-move-responsible",
          label: senderLabel,
          value: senderShortName,
        },
        {
          text: moveRoute,
          className: "pending-move-meta",
        },
        {
          text: previousResponsible
            ? `${previousResponsibleLabel}: ${previousResponsibleShortName}`
            : "",
          className: "pending-move-responsible",
          label: previousResponsibleLabel,
          value: previousResponsibleShortName,
        },
        {
          text: moveComment ? `${moveCommentLabel}: ${moveComment}` : "",
          className: "pending-move-comment",
        },
        {
          text: moveDate,
          className: "pending-move-meta",
          isMoveDate: true,
        },
      ].filter((item) => item.text);
      metaLines.forEach((line) => {
        const lineEl = document.createElement("div");
        lineEl.className = line.className;
        if (line.isMoveDate) {
          lineEl.textContent = line.text;
          if (fineAmount > 0) {
            const fineEl = document.createElement("span");
            fineEl.className = "pending-move-meta__fine";
            fineEl.textContent = ` · Штраф: ${formatNotificationCostWithoutCurrency(
              fineAmount
            )} р.`;
            lineEl.appendChild(fineEl);
          }
        } else if (
          line.label &&
          line.value &&
          line.label === "Переместил энергетик"
        ) {
          const labelEl = document.createElement("strong");
          labelEl.textContent = line.label;
          lineEl.append(labelEl, document.createTextNode(`: ${line.value}`));
        } else if (
          line.label &&
          line.value &&
          normalizePersonName(line.label).startsWith("ответственный")
        ) {
          lineEl.textContent = line.value;
        } else if (line.className === "pending-move-comment" && moveComment) {
          const labelEl = document.createElement("span");
          labelEl.textContent = `${moveCommentLabel}: `;
          const valueEl = document.createElement("strong");
          const underlinedValueEl = document.createElement("u");
          underlinedValueEl.textContent = moveComment;
          valueEl.appendChild(underlinedValueEl);
          lineEl.append(labelEl, valueEl);
        } else {
          lineEl.textContent = line.text;
        }
        meta.appendChild(lineEl);
      });
      infoCell.append(title, meta);

      const photoCell = document.createElement("div");
      photoCell.className = "tools-table__cell tools-table__cell--thumb";
      const thumb = document.createElement("div");
      thumb.className = "tools-table__thumb";
      const img = document.createElement("img");
      img.className = "tools-table__thumb-image";
      img.alt = meansName || "Инструмент";
      const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
      const hasPhoto = Number.isFinite(photoCount) && photoCount > 0;
      const photoNumber =
        String(tool?.["Номер"] ?? "").trim() ||
        String(tool?.["Бух.номер"] ?? "").trim() ||
        number;
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

      const actionsCell = document.createElement("div");
      actionsCell.className = "tools-table__cell tools-table__cell--actions";
      const kitItems = getToolKitItems(tool);
      if (kitItems.length) {
        const kitButton = document.createElement("button");
        kitButton.className = "pending-move-action pending-move-action--kit";
        kitButton.type = "button";
        kitButton.dataset.pendingKitOpen = "true";
        kitButton.dataset.moveIndex = String(moveIndex);
        kitButton.textContent = "Комплектация";
        kitButton.setAttribute("aria-label", "Открыть комплектацию инструмента");
        actionsCell.appendChild(kitButton);
      }
      const declineButton = document.createElement("button");
      declineButton.className = "pending-move-action pending-move-action--decline";
      declineButton.type = "button";
      declineButton.dataset.pendingMoveAction = "decline";
      declineButton.dataset.moveIndex = String(moveIndex);
      declineButton.textContent = "Не принять";
      declineButton.setAttribute("aria-label", "Не принять");
      const acceptButton = document.createElement("button");
      acceptButton.className = "pending-move-action pending-move-action--accept";
      acceptButton.type = "button";
      acceptButton.dataset.pendingMoveAction = "accept";
      acceptButton.dataset.moveIndex = String(moveIndex);
      acceptButton.textContent = "Принять";
      acceptButton.setAttribute("aria-label", "Принять");
      actionsCell.append(declineButton, acceptButton);
      row.append(numberCell, infoCell, photoCell, actionsCell);
      table.appendChild(row);
    });

    pendingMovesListEl.appendChild(table);
  };

  const loadPendingMovesList = async (options = {}) => {
    const orgFolder = context.orgFolderName ?? "";
    pendingMovesState.pendingItems = [];
    pendingMovesState.allMoves = [];
    pendingMovesState.fineConfig = {};
    if (!orgFolder) {
      setPendingMovesSubtitle("Организация не найдена.");
      renderPendingMovesList();
      return;
    }
    toolsState.orgFolder = orgFolder;
    setPendingMovesSubtitle("Загружаем список...");
    const movesPath = `./${orgFolder}/Перемещения.json`;
    let moves = [];
    try {
      const rawMoves = await loadJson(movesPath);
      moves = Array.isArray(rawMoves)
        ? rawMoves
        : Array.isArray(rawMoves?.moves)
          ? rawMoves.moves
          : [];
    } catch (error) {
      console.warn("Не удалось загрузить перемещения.", error);
      moves = [];
    }
    pendingMovesState.allMoves = moves;
    pendingMovesState.toolMap = await buildPendingToolsMap(orgFolder);

    const targetFullName = String(options?.targetFullName ?? "").trim();
    const pendingUserName = targetFullName || String(user?.full_name ?? "").trim();
    const userName = normalizePersonName(pendingUserName);
    const fineConfig = settingsData?.organization?.fines?.lateReply ?? {};
    const replacementMode = Boolean(options?.replacementMode);
    const allReceiversMode = Boolean(options?.allReceiversMode);
    const vacationStartAt = String(options?.vacationStartAt ?? "").trim();
    pendingMovesState.fineConfig = fineConfig;
    pendingMovesState.targetFullName = targetFullName;
    pendingMovesState.replacementMode = replacementMode;
    pendingMovesState.allReceiversMode = allReceiversMode;
    pendingMovesState.vacationStartAt = vacationStartAt;
    const pendingItems = moves
      .map((move, index) => ({ move, moveIndex: index }))
      .filter(({ move }) => {
        const responseDate = String(move?.["Дата ответа"] ?? "").trim();
        if (responseDate) return false;
        const acceptedBy = normalizePersonName(move?.["Принял"] ?? "");
        if (!acceptedBy) return false;
        if (allReceiversMode) return true;
        return acceptedBy === userName;
      })
      .map((entry) => {
        const number = String(entry.move?.["Номер"] ?? "").trim();
        const accounting = String(entry.move?.["Бух.номер"] ?? "").trim();
        const tool =
          pendingMovesState.toolMap.get(`n:${number}`) ??
          pendingMovesState.toolMap.get(`a:${accounting}`) ??
          null;
        return {
          ...entry,
          tool,
          fineAmount: resolveLateReplyFine(entry.move, fineConfig),
        };
      })
      .sort((a, b) => {
        if (allReceiversMode) {
          const receiverA = normalizePersonName(a.move?.["Принял"] ?? "");
          const receiverB = normalizePersonName(b.move?.["Принял"] ?? "");
          const receiverCompare = receiverA.localeCompare(receiverB, "ru");
          if (receiverCompare !== 0) return receiverCompare;
        }
        const senderA = normalizePersonName(a.move?.["Переместил"] ?? "");
        const senderB = normalizePersonName(b.move?.["Переместил"] ?? "");
        const senderCompare = senderA.localeCompare(senderB, "ru");
        if (senderCompare !== 0) return senderCompare;
        const numA =
          String(a.move?.["Номер"] ?? "").trim() ||
          String(a.move?.["Бух.номер"] ?? "").trim();
        const numB =
          String(b.move?.["Номер"] ?? "").trim() ||
          String(b.move?.["Бух.номер"] ?? "").trim();
        return numA.localeCompare(numB, "ru", { numeric: true });
      });

    pendingMovesState.pendingItems = pendingItems;
    if (!pendingItems.length) {
      setPendingMovesSubtitle("");
    } else {
      const totalFineAmount = pendingItems.reduce(
        (sum, item) => sum + Number(item?.fineAmount ?? 0),
        0
      );
      const subtitlePrefix = allReceiversMode
        ? "Принять за других"
        : targetFullName
        ? `На принятии за ${formatFullName(targetFullName)}`
        : "На принятии";
      const totalPendingToolsCost = pendingItems.reduce((sum, item) => {
        const toolCost = normalizeCostValue(item?.tool?.["Стоимость"]);
        return sum + (Number.isFinite(toolCost) ? toolCost : 0);
      }, 0);
      const fineText =
        totalFineAmount > 0
          ? ` · Штраф: ${formatNotificationCostWithoutCurrency(totalFineAmount)} р.`
          : " · Штраф: 0";
      const totalCostText = ` · На сумму: ${formatNotificationCostWithoutCurrency(totalPendingToolsCost)} р.`;
      setPendingMovesSubtitle(
        `${subtitlePrefix}: ${pendingItems.length}${fineText}${totalCostText}`
      );
    }
    renderPendingMovesList();
  };

  const refreshPendingMovesIndicator = async () => {
    const moves = await loadUserPendingMoves(context.orgFolderName, user);
    updateEnergyPendingStat({ count: moves.length, available: moves });
  };

  const refreshAwaitingReplyIndicator = async () => {
    const moves = await loadUserAwaitingReplyMoves(context.orgFolderName, user);
    updateEnergyAwaitingReplyStat({ count: moves.length });
  };

  const setAwaitingReplySubtitle = (text = "") => {
    if (!awaitingReplySubtitleEl) return;
    awaitingReplySubtitleEl.textContent = text;
  };

  const setAwaitingReplyMessage = (text = "", type = "info") => {
    if (!awaitingReplyMessageEl) return;
    awaitingReplyMessageEl.textContent = text;
    awaitingReplyMessageEl.classList.remove("is-error", "is-success", "is-info");
    if (!text) return;
    awaitingReplyMessageEl.classList.add(
      type === "error" ? "is-error" : type === "success" ? "is-success" : "is-info"
    );
  };

  const resolveAwaitingReplySenderMeta = (move) => {
    const movedByEnergy = String(move?.["Переместил энергетик"] ?? "").trim();
    if (movedByEnergy) {
      return {
        senderLabel: "За пользователя переместил энергетик",
        senderValue: movedByEnergy,
        detailsLabel: "",
        detailsValue: "",
      };
    }
    return {
      senderLabel: "",
      senderValue: "",
      detailsLabel: "",
      detailsValue: "",
    };
  };

  const renderAwaitingReplyList = () => {
    if (!awaitingReplyListEl) return;
    awaitingReplyListEl.innerHTML = "";
    const items = awaitingReplyState.items;
    if (!items.length) {
      awaitingReplyEmptyEl?.classList.remove("is-hidden");
      return;
    }
    awaitingReplyEmptyEl?.classList.add("is-hidden");
    const table = document.createElement("div");
    table.className = "tools-table pending-moves-tools-table awaiting-reply-tools-table";
    const receiverStats = items.reduce((acc, { move, tool }) => {
      const receiver = String(move?.["Принял"] ?? "").trim() || "Не указан принимающий";
      if (!acc[receiver]) {
        acc[receiver] = { count: 0, amount: 0 };
      }
      acc[receiver].count += 1;
      const toolCost = normalizeCostValue(tool?.["Стоимость"]);
      const moveCost = normalizeCostValue(move?.["Стоимость"]);
      const itemCost = Number.isFinite(toolCost)
        ? toolCost
        : Number.isFinite(moveCost)
          ? moveCost
          : 0;
      acc[receiver].amount += itemCost;
      return acc;
    }, {});
    let currentReceiver = "";
    items.forEach(({ move, moveIndex, tool }) => {
      const receiver = String(move?.["Принял"] ?? "").trim() || "Не указан принимающий";
      if (receiver !== currentReceiver) {
        currentReceiver = receiver;
        const stats = receiverStats[receiver] ?? { count: 0, amount: 0 };
        const receiverCostText = `${formatNotificationCostWithoutCurrency(stats.amount)} р.`;
        const groupRow = document.createElement("div");
        groupRow.className = "tools-table__row awaiting-reply-group-row";
        const groupCell = document.createElement("div");
        groupCell.className = "tools-table__cell awaiting-reply-group-cell";
        groupCell.setAttribute("role", "heading");
        groupCell.setAttribute("aria-level", "3");
        const groupTitleLine = document.createElement("div");
        groupTitleLine.textContent = `${receiver} · ${stats.count} шт.`;
        const groupAmountLine = document.createElement("div");
        groupAmountLine.textContent = `На сумму: ${receiverCostText}`;
        groupCell.append(groupTitleLine, groupAmountLine);
        groupRow.appendChild(groupCell);
        table.appendChild(groupRow);
      }
      const row = document.createElement("div");
      row.className = "tools-table__row";
      const number =
        String(move?.["Номер"] ?? "").trim() ||
        String(move?.["Бух.номер"] ?? "").trim();
      const numberCell = document.createElement("div");
      numberCell.className = "tools-table__cell tools-table__cell--number pending-move-number-cell";
      numberCell.textContent = number || "—";
      const infoCell = document.createElement("div");
      infoCell.className = "tools-table__cell pending-move-main-cell";
      const title = document.createElement("div");
      title.className = "tools-table__title";
      const meansName = String(tool?.["Наименование"] ?? "").trim();
      title.textContent = meansName || "Без названия";
      const meta = document.createElement("div");
      meta.className = "tools-table__meta tools-table__meta--stack";
      const manufacturer = String(tool?.["Производитель"] ?? "").trim();
      const model = String(tool?.["Модель"] ?? "").trim();
      const accountingNumber =
        String(tool?.["Бух.номер"] ?? "").trim() ||
        String(move?.["Бух.номер"] ?? "").trim() ||
        "—";
      const lateReplyFineAmount = resolveLateReplyFine(
        move,
        awaitingReplyState.fineConfig
      );
      const moveDate = String(move?.["Дата перемещения"] ?? "").trim();
      const moveComment = String(move?.["Причина перемещения"] ?? "").trim();
      const sourceObject = String(move?.["Старый объект"] ?? "").trim();
      const targetObject = String(move?.["Новый объект"] ?? "").trim();
      const senderMeta = resolveAwaitingReplySenderMeta(move);
      const moveRoute =
        objectTrackingEnabled && (sourceObject || targetObject)
          ? `${sourceObject || "—"} ➜ ${targetObject || "—"}`
          : "";
      const toolCost = normalizeCostValue(tool?.["Стоимость"]);
      const moveCost = normalizeCostValue(move?.["Стоимость"]);
      const itemCost = Number.isFinite(toolCost)
        ? toolCost
        : Number.isFinite(moveCost)
          ? moveCost
          : null;
      const itemCostText = Number.isFinite(itemCost)
        ? `${formatNotificationCostWithoutCurrency(itemCost)} р.`
        : "—";
      const metaLines = [
        [manufacturer, model].filter(Boolean).join(" · "),
        `${accountingNumber} · ${itemCostText}`,
        moveRoute,
        senderMeta.senderValue
          ? `${senderMeta.senderLabel}: ${senderMeta.senderValue}`
          : "",
        senderMeta.detailsValue
          ? `${senderMeta.detailsLabel}: ${senderMeta.detailsValue}`
          : "",
        `Штраф: ${formatNotificationCostWithoutCurrency(
          lateReplyFineAmount
        )} р.`,
        moveComment,
        moveDate,
      ].filter(Boolean);
      const senderLineText = senderMeta.senderValue
        ? `${senderMeta.senderLabel}: ${senderMeta.senderValue}`
        : "";
      metaLines.forEach((text, lineIndex) => {
        const line = document.createElement("div");
        const isComment = moveComment && text === moveComment;
        line.className = isComment
          ? "pending-move-comment"
          : "pending-move-meta";
        if (!isComment && senderLineText && text === senderLineText) {
          line.classList.add("pending-move-meta--center");
        }
        if (isComment) {
          const valueEl = document.createElement("strong");
          valueEl.textContent = moveComment;
          line.append(valueEl);
        } else {
          line.textContent = text;
        }
        if (lineIndex === metaLines.length - 1) {
          line.classList.add("pending-move-meta--date");
        }
        meta.appendChild(line);
      });
      infoCell.append(title, meta);
      const photoCell = document.createElement("div");
      photoCell.className = "tools-table__cell tools-table__cell--thumb";
      const thumb = document.createElement("div");
      thumb.className = "tools-table__thumb";
      const img = document.createElement("img");
      img.className = "tools-table__thumb-image";
      img.alt = meansName || "Инструмент";
      const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
      const hasPhoto = Number.isFinite(photoCount) && photoCount > 0;
      const photoNumber =
        String(tool?.["Номер"] ?? "").trim() ||
        String(tool?.["Бух.номер"] ?? "").trim() ||
        number;
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
      const actionsCell = document.createElement("div");
      actionsCell.className = "tools-table__cell tools-table__cell--actions";
      actionsCell.innerHTML = `
        <button class="pending-move-action pending-move-action--cancel" type="button" data-awaiting-reply-action="cancel" data-move-index="${moveIndex}" aria-label="Отменить перемещение">Отменить перемещение</button>
      `;
      row.append(numberCell, infoCell, photoCell, actionsCell);
      table.appendChild(row);
    });
    awaitingReplyListEl.appendChild(table);
  };

  const loadAwaitingReplyList = async () => {
    const orgFolder = context.orgFolderName ?? "";
    if (!orgFolder) {
      awaitingReplyState.items = [];
      setAwaitingReplySubtitle("Организация не найдена.");
      renderAwaitingReplyList();
      return;
    }
    toolsState.orgFolder = orgFolder;
    awaitingReplyState.fineConfig = settingsData?.organization?.fines?.lateReply ?? {};
    let moves = [];
    try {
      const rawMoves = await loadJson(`./${orgFolder}/Перемещения.json`);
      moves = Array.isArray(rawMoves)
        ? rawMoves
        : Array.isArray(rawMoves?.moves)
          ? rawMoves.moves
          : [];
    } catch (error) {
      console.warn("Не удалось загрузить отправленные перемещения.", error);
    }
    awaitingReplyState.toolMap = await buildPendingToolsMap(orgFolder);
    const currentUserName = normalizePersonName(user?.full_name ?? "");
    awaitingReplyState.items = moves
      .map((move, moveIndex) => ({ move, moveIndex }))
      .map((entry) => {
        const tool = resolvePendingToolByMove(awaitingReplyState.toolMap, entry.move);
        return { ...entry, tool };
      })
      .filter(({ move }) => {
        if (String(move?.["Дата ответа"] ?? "").trim()) return false;
        if (!isOwnAwaitingReplyMove(move, currentUserName)) return false;
        return true;
      })
      .sort((a, b) => {
        const receiverA = String(a.move?.["Принял"] ?? "").trim();
        const receiverB = String(b.move?.["Принял"] ?? "").trim();
        const byReceiver = receiverA.localeCompare(receiverB, "ru");
        if (byReceiver !== 0) return byReceiver;
        const aDate = parseDateValue(a.move?.["Дата перемещения"]);
        const bDate = parseDateValue(b.move?.["Дата перемещения"]);
        const aTs = aDate instanceof Date ? aDate.getTime() : 0;
        const bTs = bDate instanceof Date ? bDate.getTime() : 0;
        return bTs - aTs;
      });
    const awaitingReplyTotalAmount = awaitingReplyState.items.reduce((sum, { tool, move }) => {
      const toolCost = normalizeCostValue(tool?.["Стоимость"]);
      if (Number.isFinite(toolCost)) return sum + toolCost;
      const moveCost = normalizeCostValue(move?.["Стоимость"]);
      if (Number.isFinite(moveCost)) return sum + moveCost;
      return sum;
    }, 0);
    setAwaitingReplySubtitle(
      `На принятии: ${awaitingReplyState.items.length} · На сумму: ${formatNotificationCostWithoutCurrency(awaitingReplyTotalAmount)} р.`,
    );
    renderAwaitingReplyList();
  };

  const closeAwaitingReplyModal = () => {
    awaitingReplyModalEl?.classList.add("is-hidden");
    closeAwaitingReplyCancelConfirmModal();
    if (pendingMovesModalEl && !pendingMovesModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    setAwaitingReplyMessage("");
  };

  const openAwaitingReplyModal = async () => {
    if (!awaitingReplyModalEl) return;
    awaitingReplyModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setAwaitingReplySubtitle("Загружаем список...");
    await loadAwaitingReplyList();
  };

  const closeAwaitingReplyCancelConfirmModal = () => {
    if (!awaitingReplyCancelConfirmModalEl) return;
    awaitingReplyCancelConfirmModalEl.classList.add("is-hidden");
    awaitingReplyState.cancelMoveIndex = null;
  };

  const openAwaitingReplyCancelConfirmModal = (moveIndex) => {
    if (!awaitingReplyCancelConfirmModalEl) return;
    if (!Number.isFinite(moveIndex)) return;
    awaitingReplyState.cancelMoveIndex = moveIndex;
    const item = awaitingReplyState.items.find((entry) => entry.moveIndex === moveIndex);
    const move = item?.move ?? {};
    const tool = item?.tool ?? {};
    const number =
      String(move?.["Номер"] ?? "").trim() ||
      String(tool?.["Номер"] ?? "").trim() ||
      "—";
    const accounting =
      String(move?.["Бух.номер"] ?? "").trim() ||
      String(tool?.["Бух.номер"] ?? "").trim() ||
      "—";
    const name =
      String(move?.["Наименование"] ?? "").trim() ||
      String(tool?.["Наименование"] ?? "").trim() ||
      "—";
    const manufacturer =
      String(move?.["Производитель"] ?? "").trim() ||
      String(tool?.["Производитель"] ?? "").trim() ||
      "—";
    const model =
      String(move?.["Модель"] ?? "").trim() ||
      String(tool?.["Модель"] ?? "").trim() ||
      "—";
    if (awaitingReplyCancelConfirmTextEl) {
      awaitingReplyCancelConfirmTextEl.textContent =
        `Вы действительно хотите отменить перемещение "${number}" - "${accounting}" "${name}" "${manufacturer}" "${model}"`;
    }
    awaitingReplyCancelConfirmModalEl.classList.remove("is-hidden");
  };

  const confirmAwaitingReplyCancel = async () => {
    const moveIndex = awaitingReplyState.cancelMoveIndex;
    closeAwaitingReplyCancelConfirmModal();
    if (!Number.isFinite(moveIndex)) return;
    await applyAwaitingReplyCancel(moveIndex);
  };

  const applyAwaitingReplyCancel = async (moveIndex) => {
    if (awaitingReplyState.isSaving) return;
    if (!Number.isFinite(moveIndex)) return;
    const item = awaitingReplyState.items.find((entry) => entry.moveIndex === moveIndex);
    if (!item) return;
    awaitingReplyState.isSaving = true;
    setAwaitingReplyMessage("Отменяем перемещение...", "info");
    const orgFolder = context.orgFolderName ?? "";
    try {
      const rawMoves = await loadJson(`./${orgFolder}/Перемещения.json`);
      const movesPayload = normalizeCollectionPayload(rawMoves, "moves");
      const move = movesPayload.items[moveIndex];
      if (!move || String(move?.["Дата ответа"] ?? "").trim()) {
        setAwaitingReplyMessage("Перемещение уже обработано.", "error");
        return;
      }
      const responseDate = formatDateValue(new Date());
      const fineConfig = settingsData?.organization?.fines?.lateReply ?? {};
      const lateReplyFineAmount = resolveLateReplyFine(move, fineConfig);
      const updatedMoves = [...movesPayload.items];
      updatedMoves[moveIndex] = {
        ...move,
        "Дата ответа": responseDate,
        Ответ: "Отмена перемещения",
        "Комментарий к ответу": "Отмена перемещения пользователем",
        "Отменил": String(user?.full_name ?? "").trim(),
        "Дата отмены": responseDate,
        ...(lateReplyFineAmount > 0
          ? {
              "Штраф за ответ": lateReplyFineAmount,
              "Тип штрафа": "Поздний ответ",
              "Штраф за поздний ответ": "Да",
            }
          : {}),
      };
      const movesPath = `./${orgFolder}/Перемещения.json`;
      const movesPayloadOut = movesPayload.wrapper
        ? { ...movesPayload.wrapper, [movesPayload.key]: updatedMoves }
        : updatedMoves;
      await saveJson(movesPath, movesPayloadOut, { user });
      await registerMoveCancelFine(updatedMoves[moveIndex]);
      const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
      const organizationName = findUserOrganizationName(user, usersData);
      await notifyMoveCancel({
        tool: item.tool,
        move: updatedMoves[moveIndex],
        orgFolder: context.orgFolderName,
        organizationName,
        canceledBy: String(user?.full_name ?? "").trim(),
      });
      setAwaitingReplyMessage("Перемещение отменено.", "success");
      await loadAwaitingReplyList();
      await refreshPendingMovesIndicator();
      await refreshAwaitingReplyIndicator();
    } catch (error) {
      console.error(error);
      setAwaitingReplyMessage("Не удалось отменить перемещение.", "error");
    } finally {
      awaitingReplyState.isSaving = false;
    }
  };

  const closePendingMovesModal = () => {
    if (!pendingMovesModalEl) return;
    if (pendingMovesState.isSaving) return;
    pendingMovesModalEl.classList.add("is-hidden");
    closePendingMovesBulkConfirmModal();
    document.body.style.overflow = "";
    if (pendingMovesMessageEl) {
      pendingMovesMessageEl.textContent = "";
      pendingMovesMessageEl.classList.remove("is-error", "is-success", "is-info");
    }
    setPendingMovesSavingState(false);
  };

  const openPendingMovesModal = async (options = {}) => {
    if (!pendingMovesModalEl) return;
    pendingMovesModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    await loadPendingMovesList(options);
  };

  const closePendingMovesBulkConfirmModal = () => {
    if (!pendingMovesBulkConfirmModalEl) return;
    pendingMovesBulkConfirmModalEl.classList.add("is-hidden");
    pendingMovesState.bulkConfirmAction = null;
    if (pendingMovesBulkConfirmReasonEl) {
      pendingMovesBulkConfirmReasonEl.value = "";
      pendingMovesBulkConfirmReasonEl.classList.remove("is-invalid");
    }
    pendingMovesBulkConfirmReasonBlockEl?.classList.add("is-hidden");
    pendingMovesBulkConfirmSubmitButton?.classList.remove(
      "pending-moves-bulk-confirm-submit--accept",
      "pending-moves-bulk-confirm-submit--decline"
    );
  };

  const getPendingMovesTotalCost = () =>
    pendingMovesState.pendingItems.reduce((sum, item) => {
      const toolCost = normalizeCostValue(item?.tool?.["Стоимость"]);
      return sum + (Number.isFinite(toolCost) ? toolCost : 0);
    }, 0);

  const openPendingMovesBulkConfirmModal = (action) => {
    if (!pendingMovesBulkConfirmModalEl || pendingMovesState.isSaving) return;
    const total = pendingMovesState.pendingItems.length;
    if (!total) {
      setPendingMovesMessage("Нет инструментов для массового действия.", "info");
      return;
    }
    const isAccept = action === "accept";
    pendingMovesState.bulkConfirmAction = action;
    if (pendingMovesBulkConfirmTitleEl) {
      pendingMovesBulkConfirmTitleEl.textContent = isAccept
        ? "Принять все инструменты?"
        : "Не принять все инструменты?";
    }
    if (pendingMovesBulkConfirmTextEl) {
      const totalPendingToolsCost = getPendingMovesTotalCost();
      pendingMovesBulkConfirmTextEl.textContent = isAccept
        ? `Будут приняты все (${total}) ожидающих инструментов
на общую сумму ${formatNotificationCostWithoutCurrency(totalPendingToolsCost)} р.`
        : "";
      pendingMovesBulkConfirmTextEl.style.whiteSpace = "pre-line";
      pendingMovesBulkConfirmTextEl.classList.toggle("is-hidden", !isAccept);
    }
    if (pendingMovesBulkConfirmSubmitButton) {
      pendingMovesBulkConfirmSubmitButton.textContent = isAccept
        ? "Да, принять всё"
        : "Не принять всё";
      pendingMovesBulkConfirmSubmitButton.classList.toggle(
        "pending-moves-bulk-confirm-submit--accept",
        isAccept
      );
      pendingMovesBulkConfirmSubmitButton.classList.toggle(
        "pending-moves-bulk-confirm-submit--decline",
        !isAccept
      );
    }
    pendingMovesBulkConfirmReasonBlockEl?.classList.toggle("is-hidden", isAccept);
    if (!isAccept && pendingMovesBulkConfirmReasonEl) {
      pendingMovesBulkConfirmReasonEl.value = "";
      pendingMovesBulkConfirmReasonEl.classList.remove("is-invalid");
      pendingMovesBulkConfirmReasonEl.focus();
    }
    pendingMovesBulkConfirmModalEl.classList.remove("is-hidden");
  };

  const applyPendingMovesBulkAction = () => {
    const action = pendingMovesState.bulkConfirmAction;
    if (!action) return;
    const indexes = pendingMovesState.pendingItems.map((item) => item.moveIndex);
    if (action === "accept") {
      closePendingMovesBulkConfirmModal();
      applyPendingMovesDecision({ moveIndexes: indexes, decision: "Принял" });
      return;
    }
    const declineReason = String(pendingMovesBulkConfirmReasonEl?.value ?? "").trim();
    if (!declineReason) {
      pendingMovesBulkConfirmReasonEl?.classList.add("is-invalid");
      pendingMovesBulkConfirmReasonEl?.focus();
      return;
    }
    pendingMovesBulkConfirmReasonEl?.classList.remove("is-invalid");
    closePendingMovesBulkConfirmModal();
    applyPendingMovesDecision({
      moveIndexes: indexes,
      decision: "Не принял",
      declineReason,
    });
  };

  const resolveInfoPendingSender = (move) => {
    const movedBy = String(move?.["Переместил"] ?? "").trim();
    if (movedBy) return movedBy;
    const movedByEnergy = String(move?.["Переместил энергетик"] ?? "").trim();
    const previousResponsible = String(move?.["Ответственный до перемещения"] ?? "").trim();
    return movedByEnergy ? previousResponsible : "";
  };

  const buildInfoPendingResponsibleOptions = () => {
    const receiverSet = new Set();
    const senderSet = new Set();
    infoPendingState.allItems.forEach(({ move }) => {
      const receiver = String(move?.["Принял"] ?? "").trim();
      const sender = String(resolveInfoPendingSender(move) ?? "").trim();
      if (receiver) receiverSet.add(receiver);
      if (sender) senderSet.add(sender);
    });
    infoPendingState.receiverOptions = Array.from(receiverSet).sort((a, b) =>
      a.localeCompare(b, "ru")
    );
    infoPendingState.senderOptions = Array.from(senderSet).sort((a, b) =>
      a.localeCompare(b, "ru")
    );
  };

  const setInfoPendingPersonDropdownOpen = (key, isOpen) => {
    infoPendingPersonDropdownEls.forEach((dropdownEl) => {
      const dropdownKey = String(dropdownEl.dataset.infoPendingPersonDropdown ?? "").trim();
      const shouldOpen = dropdownKey === key && Boolean(isOpen);
      dropdownEl.classList.toggle("is-open", shouldOpen);
      const menuEl = dropdownEl.querySelector("[data-info-pending-person-menu]");
      menuEl?.classList.toggle("is-hidden", !shouldOpen);
      const triggerEl = dropdownEl.querySelector("[data-info-pending-person-trigger]");
      triggerEl?.setAttribute("aria-expanded", String(shouldOpen));
    });
  };

  const setInfoPendingSortDropdownOpen = (isOpen) => {
    const shouldOpen = Boolean(isOpen);
    infoPendingState.isSortOpen = shouldOpen;
    infoPendingSortDropdownEl?.classList.toggle("is-open", shouldOpen);
    infoPendingSortMenuEl?.classList.toggle("is-hidden", !shouldOpen);
    infoPendingSortTriggerEl?.setAttribute("aria-expanded", String(shouldOpen));
  };

  const renderInfoPendingSortDropdown = () => {
    if (!(infoPendingSortOptionsEl instanceof HTMLElement)) return;
    const currentValue = String(infoPendingState.filters.sort ?? "old");
    const currentOption =
      infoPendingSortModes.find((option) => option.value === currentValue) ??
      infoPendingSortModes[0];
    if (infoPendingSortEl instanceof HTMLInputElement) {
      infoPendingSortEl.value = currentOption.value;
    }
    if (infoPendingSortTriggerEl instanceof HTMLElement) {
      const sortLabel = `Сортировка: ${currentOption.label}`;
      infoPendingSortTriggerEl.setAttribute("aria-label", sortLabel);
      infoPendingSortTriggerEl.title = sortLabel;
      infoPendingSortTriggerEl.classList.toggle(
        "is-active",
        currentOption.value !== "old"
      );
    }
    infoPendingSortModeButtonEls.forEach((buttonEl) => {
      const mode = String(buttonEl.dataset.infoPendingSortMode ?? "").trim();
      const isActive = mode === currentOption.value;
      buttonEl.classList.toggle("is-active", isActive);
      buttonEl.setAttribute("aria-pressed", String(isActive));
    });

    infoPendingSortOptionsEl.innerHTML = "";
    infoPendingSortModes.forEach((option, index) => {
      const id = `info-pending-sort-${index}`;
      const optionLabelEl = document.createElement("label");
      optionLabelEl.className = "tools-filter-dropdown__option";
      optionLabelEl.setAttribute("for", id);
      const radioEl = document.createElement("input");
      radioEl.type = "radio";
      radioEl.id = id;
      radioEl.name = "info-pending-sort";
      radioEl.value = option.value;
      radioEl.checked = option.value === currentOption.value;
      radioEl.dataset.infoPendingSortOption = option.value;
      const textEl = document.createElement("span");
      textEl.textContent = option.label;
      optionLabelEl.append(radioEl, textEl);
      infoPendingSortOptionsEl.append(optionLabelEl);
    });
  };

  const renderInfoPendingPersonDropdown = (key, values, emptyLabel, currentValue) => {
    const dropdownEl = contentEl.querySelector(
      `[data-info-pending-person-dropdown="${key}"]`
    );
    if (!dropdownEl) return;
    const optionsEl = dropdownEl.querySelector("[data-info-pending-person-options]");
    const clearButtonEl = dropdownEl.querySelector("[data-info-pending-person-clear]");
    const triggerEl = dropdownEl.querySelector("[data-info-pending-person-trigger]");
    const hiddenInputEl =
      key === "receiver" ? infoPendingFilterReceiverEl : infoPendingFilterSenderEl;
    if (!(optionsEl instanceof HTMLElement) || !(triggerEl instanceof HTMLElement)) return;

    if (clearButtonEl) {
      clearButtonEl.textContent = emptyLabel;
      clearButtonEl.classList.toggle("is-active", !currentValue);
    }

    optionsEl.innerHTML = "";
    values.forEach((value, index) => {
      const id = `info-pending-${key}-${index}`;
      const optionLabelEl = document.createElement("label");
      optionLabelEl.className = "tools-filter-dropdown__option";
      optionLabelEl.setAttribute("for", id);
      const radioEl = document.createElement("input");
      radioEl.type = "radio";
      radioEl.id = id;
      radioEl.name = `info-pending-${key}`;
      radioEl.value = value;
      radioEl.checked = value === currentValue;
      radioEl.dataset.infoPendingPersonOption = key;
      const textEl = document.createElement("span");
      textEl.textContent = value;
      optionLabelEl.append(radioEl, textEl);
      optionsEl.append(optionLabelEl);
    });

    const safeCurrentValue = values.includes(currentValue) ? currentValue : "";
    if (hiddenInputEl) {
      hiddenInputEl.value = safeCurrentValue;
    }
    triggerEl.classList.toggle("is-active", Boolean(safeCurrentValue));
    triggerEl.textContent = safeCurrentValue || emptyLabel;
  };

  const updateInfoPendingResponsibleFilters = () => {
    const receiverValue = String(infoPendingState.filters.receiver ?? "");
    const senderValue = String(infoPendingState.filters.sender ?? "");
    renderInfoPendingPersonDropdown(
      "receiver",
      infoPendingState.receiverOptions,
      "Все принявшие",
      receiverValue
    );
    renderInfoPendingPersonDropdown(
      "sender",
      infoPendingState.senderOptions,
      "Все переместившие",
      senderValue
    );
  };

  const applyInfoPendingFiltersAndSort = () => {
    const searchFilter = String(infoPendingState.filters.search ?? "").trim().toLocaleLowerCase("ru");
    const receiverFilter = normalizePersonName(infoPendingState.filters.receiver);
    const senderFilter = normalizePersonName(infoPendingState.filters.sender);
    const dateFrom = parseIsoDateValue(infoPendingState.filters.dateFrom);
    const dateTo = parseIsoDateValue(infoPendingState.filters.dateTo);
    const toTs = (date) =>
      date instanceof Date
        ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
        : null;
    const fromTs = toTs(dateFrom);
    const toDateTs = toTs(dateTo);

    const filtered = infoPendingState.allItems.filter((item) => {
      const receiver = normalizePersonName(item.move?.["Принял"] ?? "");
      const sender = normalizePersonName(resolveInfoPendingSender(item.move));
      if (searchFilter) {
        const searchableText = [
          item.move?.["Номер"],
          item.move?.["Бух.номер"],
          item.move?.["Дата перемещения"],
          item.move?.["Переместил"],
          item.move?.["Принял"],
          item.move?.["Старый объект"],
          item.move?.["Новый объект"],
          item.move?.["Причина перемещения"],
          item.tool?.["Наименование"],
          item.tool?.["Марка"],
          item.tool?.["Модель"],
          item.tool?.["Серийный номер"],
        ]
          .map((value) => String(value ?? "").toLocaleLowerCase("ru"))
          .join(" ");
        if (!searchableText.includes(searchFilter)) return false;
      }
      if (receiverFilter && !receiver.includes(receiverFilter)) return false;
      if (senderFilter && !sender.includes(senderFilter)) return false;
      const moveDate = parseDateValue(item.move?.["Дата перемещения"]);
      const moveTs = toTs(moveDate);
      if (fromTs !== null && (moveTs === null || moveTs < fromTs)) return false;
      if (toDateTs !== null && (moveTs === null || moveTs > toDateTs)) return false;
      return true;
    });

    const byDateAsc = (a, b) => {
      const aDate = parseDateValue(a.move?.["Дата перемещения"]);
      const bDate = parseDateValue(b.move?.["Дата перемещения"]);
      const aTs = aDate instanceof Date ? aDate.getTime() : Number.MAX_SAFE_INTEGER;
      const bTs = bDate instanceof Date ? bDate.getTime() : Number.MAX_SAFE_INTEGER;
      if (aTs !== bTs) return aTs - bTs;
      return a.moveIndex - b.moveIndex;
    };

    filtered.sort((a, b) => {
      const mode = infoPendingState.filters.sort;
      if (mode === "new") return byDateAsc(b, a);
      if (mode === "receiver") {
        const receiverA = normalizePersonName(a.move?.["Принял"] ?? "");
        const receiverB = normalizePersonName(b.move?.["Принял"] ?? "");
        const compare = receiverA.localeCompare(receiverB, "ru");
        if (compare !== 0) return compare;
        return byDateAsc(a, b);
      }
      if (mode === "sender") {
        const senderA = normalizePersonName(resolveInfoPendingSender(a.move));
        const senderB = normalizePersonName(resolveInfoPendingSender(b.move));
        const compare = senderA.localeCompare(senderB, "ru");
        if (compare !== 0) return compare;
        return byDateAsc(a, b);
      }
      return byDateAsc(a, b);
    });

    infoPendingState.filteredItems = filtered;
  };

  const renderInfoPendingList = () => {
    if (!infoPendingListEl) return;
    infoPendingListEl.innerHTML = "";
    const items = infoPendingState.filteredItems;
    if (infoPendingSubtitleEl) {
      const total = infoPendingState.allItems.length;
      infoPendingSubtitleEl.textContent =
        items.length === total
          ? `Перемещений без ответа: ${items.length}`
          : `Показано: ${items.length} из ${total}`;
    }
    if (!items.length) {
      infoPendingEmptyEl?.classList.remove("is-hidden");
      return;
    }
    infoPendingEmptyEl?.classList.add("is-hidden");

    const table = document.createElement("div");
    table.className = "tools-table pending-moves-tools-table info-pending-tools-table";
    const groupMode = String(infoPendingState.filters.sort ?? "old");
    const formatInfoPendingMovesCount = (count) => {
      const value = Math.abs(Number(count) || 0);
      const mod10 = value % 10;
      const mod100 = value % 100;
      if (mod10 === 1 && mod100 !== 11) return `${count} перемещение`;
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
        return `${count} перемещения`;
      }
      return `${count} перемещений`;
    };
    const normalizeInfoPendingGroupTitle = (value) =>
      String(value ?? "")
        .trim()
        .replace(/^(принял|переместил)\s*:?\s*/iu, "")
        .trim();
    const groupedStats = items.reduce((acc, item) => {
      if (groupMode !== "receiver" && groupMode !== "sender") return acc;
      const { move, tool } = item;
      const groupValue =
        groupMode === "receiver"
          ? String(move?.["Принял"] ?? "").trim()
          : String(resolveInfoPendingSender(move) ?? "").trim();
      const groupTitle = normalizeInfoPendingGroupTitle(groupValue) || "Не указан";
      if (!acc[groupTitle]) {
        acc[groupTitle] = { count: 0, amount: 0, fine: 0 };
      }
      acc[groupTitle].count += 1;
      const itemFine = Number(item.fineAmount);
      if (Number.isFinite(itemFine) && itemFine > 0) {
        acc[groupTitle].fine += itemFine;
      }
      const toolCost = normalizeCostValue(tool?.["Стоимость"]);
      const moveCost = normalizeCostValue(move?.["Стоимость"]);
      acc[groupTitle].amount += Number.isFinite(toolCost)
        ? toolCost
        : Number.isFinite(moveCost)
          ? moveCost
          : 0;
      return acc;
    }, {});
    let currentGroupTitle = "";

    items.forEach((item) => {
      const { move, tool, fineAmount } = item;
      if (groupMode === "receiver" || groupMode === "sender") {
        const groupValue =
          groupMode === "receiver"
            ? String(move?.["Принял"] ?? "").trim()
            : String(resolveInfoPendingSender(move) ?? "").trim();
        const groupTitle = normalizeInfoPendingGroupTitle(groupValue) || "Не указан";
        if (groupTitle !== currentGroupTitle) {
          currentGroupTitle = groupTitle;
          const groupRow = document.createElement("div");
          groupRow.className = "tools-table__row awaiting-reply-group-row info-pending-group-row";
          const groupCell = document.createElement("div");
          groupCell.className = "tools-table__cell awaiting-reply-group-cell info-pending-group-cell";
          groupCell.setAttribute("role", "heading");
          groupCell.setAttribute("aria-level", "3");
          const stats = groupedStats[groupTitle] ?? { count: 0, amount: 0, fine: 0 };
          const groupTitleLine = document.createElement("div");
          groupTitleLine.className = "info-pending-group-cell__title";
          groupTitleLine.textContent = groupTitle;
          const groupSummaryLine = document.createElement("div");
          groupSummaryLine.className = "info-pending-group-cell__summary";
          const groupFineText = `штраф ${formatNotificationCostWithoutCurrency(stats.fine)} р.`;
          groupSummaryLine.append(
            document.createTextNode(formatInfoPendingMovesCount(stats.count)),
            document.createTextNode(" · "),
            document.createTextNode(
              `стоимость ${formatNotificationCostWithoutCurrency(stats.amount)} р.`
            ),
            document.createTextNode(" · ")
          );
          const groupFineEl = document.createElement("span");
          groupFineEl.className = "info-pending-group-cell__fine";
          groupFineEl.textContent = groupFineText;
          groupSummaryLine.appendChild(groupFineEl);
          groupCell.append(groupTitleLine, groupSummaryLine);
          groupRow.appendChild(groupCell);
          table.appendChild(groupRow);
        }
      }
      const row = document.createElement("div");
      row.className = "tools-table__row";

      const number =
        String(move?.["Номер"] ?? "").trim() ||
        String(move?.["Бух.номер"] ?? "").trim();
      const displayNumber = number || "—";
      const numberCell = document.createElement("div");
      numberCell.className = "tools-table__cell tools-table__cell--number pending-move-number-cell";
      numberCell.textContent = displayNumber;
      const infoCell = document.createElement("div");
      infoCell.className = "tools-table__cell pending-move-main-cell";
      const title = document.createElement("div");
      title.className = "tools-table__title";
      const meansName = String(tool?.["Наименование"] ?? "").trim();
      title.textContent = meansName || "Без названия";

      const meta = document.createElement("div");
      meta.className = "tools-table__meta tools-table__meta--stack";
      const receiver = String(move?.["Принял"] ?? "").trim();
      const sender = String(resolveInfoPendingSender(move) ?? "").trim();
      const senderEnergy = String(move?.["Переместил энергетик"] ?? "").trim();
      const moveDate = String(move?.["Дата перемещения"] ?? "").trim();
      const moveComment = String(move?.["Причина перемещения"] ?? "").trim();
      const sourceObject = String(move?.["Старый объект"] ?? "").trim();
      const targetObject = String(move?.["Новый объект"] ?? "").trim();
      const toolAmount = formatToolCostLabel(tool);
      const moveRoute =
        objectTrackingEnabled && sourceObject && targetObject
          ? `${sourceObject} → ${targetObject}`
          : objectTrackingEnabled && sourceObject
            ? `${sourceObject} → —`
            : objectTrackingEnabled && targetObject
              ? `— → ${targetObject}`
              : "";
      const appendMetaLine = (text, className = "pending-move-meta") => {
        if (!text) return;
        const lineEl = document.createElement("div");
        lineEl.className = className;
        lineEl.textContent = text;
        meta.appendChild(lineEl);
      };
      const appendResponsibleMetaLine = (label, fullName) => {
        const normalizedLabel = normalizePersonName(label);
        const value = String(fullName ?? "").trim();
        if (!normalizedLabel || !value) return;
        const lineEl = document.createElement("div");
        lineEl.className = "pending-move-meta pending-move-responsible";
        const visibleLabel =
          label === "Переместил энергетик" ? "Энергетик" : "";
        if (visibleLabel) {
          lineEl.textContent = `${visibleLabel}: `;
        }
        const [surname, ...rest] = value.split(/\s+/);
        if (surname) {
          const surnameEl = document.createElement("strong");
          surnameEl.textContent = surname;
          lineEl.appendChild(surnameEl);
          if (rest.length) {
            lineEl.appendChild(document.createTextNode(` ${rest.join(" ")}`));
          }
        } else {
          lineEl.appendChild(document.createTextNode(value));
        }
        meta.appendChild(lineEl);
      };

      if (receiver && groupMode !== "receiver") {
        appendResponsibleMetaLine("Принял", receiver);
      }
      if (sender && groupMode !== "sender") {
        appendResponsibleMetaLine("Переместил", sender);
      }
      if (senderEnergy && senderEnergy !== sender && groupMode !== "sender") {
        appendResponsibleMetaLine("Переместил энергетик", senderEnergy);
      }
      appendMetaLine(toolAmount, "pending-move-meta pending-move-cost");
      if (moveRoute) {
        const routeEl = document.createElement("div");
        routeEl.className = "pending-move-meta pending-move-route";

        const routeFromEl = document.createElement("span");
        routeFromEl.className = "pending-move-route__point";
        routeFromEl.textContent = sourceObject || "—";

        const routeSeparatorEl = document.createElement("span");
        routeSeparatorEl.className = "pending-move-route__separator";
        routeSeparatorEl.setAttribute("aria-hidden", "true");
        routeSeparatorEl.textContent = "➜";

        const routeToEl = document.createElement("span");
        routeToEl.className = "pending-move-route__point";
        routeToEl.textContent = targetObject || "—";

        routeEl.append(routeFromEl, routeSeparatorEl, routeToEl);
        meta.appendChild(routeEl);
      }
      const moveDateLine = document.createElement("div");
      moveDateLine.className = "pending-move-meta";
      moveDateLine.textContent = moveDate;
      if (fineAmount > 0) {
        const fineEl = document.createElement("span");
        fineEl.className = "pending-move-meta__fine";
        fineEl.textContent = ` · Штраф: ${formatNotificationCostWithoutCurrency(
          fineAmount
        )}`;
        moveDateLine.appendChild(fineEl);
      }
      appendMetaLine(moveComment ? `Причина: ${moveComment}` : "", "pending-move-comment");
      meta.appendChild(moveDateLine);
      infoCell.append(title, meta);

      const photoCell = document.createElement("div");
      photoCell.className = "tools-table__cell tools-table__cell--thumb";
      const thumb = document.createElement("div");
      thumb.className = "tools-table__thumb";
      const img = document.createElement("img");
      img.className = "tools-table__thumb-image";
      img.alt = meansName || "Инструмент";
      const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
      const photoNumber =
        String(tool?.["Номер"] ?? "").trim() ||
        String(tool?.["Бух.номер"] ?? "").trim() ||
        number;
      const hasPhoto =
        (Number.isFinite(photoCount) && photoCount > 0) || Boolean(photoNumber);
      applyToolPhotoWithFallback({
        img,
        orgFolder: toolsState.orgFolder,
        toolNumber: photoNumber,
        hasPhoto,
      });
      thumb.appendChild(img);
      if (hasPhoto) {
        thumb.dataset.infoPendingPhotoOpen = "true";
        thumb.dataset.infoPendingMoveIndex = String(item.moveIndex);
        thumb.setAttribute("role", "button");
        thumb.tabIndex = 0;
        thumb.setAttribute("aria-label", "Открыть фото инструмента");
      }
      photoCell.appendChild(thumb);

      row.append(numberCell, infoCell, photoCell);
      table.appendChild(row);
    });

    infoPendingListEl.appendChild(table);
  };

  const loadInfoPendingList = async () => {
    const orgFolder = context.orgFolderName ?? "";
    infoPendingState.allItems = [];
    infoPendingState.filteredItems = [];
    infoPendingState.toolMap = new Map();
    infoPendingState.fineConfig = settingsData?.organization?.fines?.lateReply ?? {};
    infoPendingState.pendingDateKeys = new Set();
    infoPendingState.receiverOptions = [];
    infoPendingState.senderOptions = [];
    if (!orgFolder) {
      if (infoPendingSubtitleEl) infoPendingSubtitleEl.textContent = "Организация не найдена.";
      renderInfoPendingList();
      return;
    }
    toolsState.orgFolder = orgFolder;
    if (infoPendingSubtitleEl) infoPendingSubtitleEl.textContent = "Загружаем список...";

    const movesPath = `./${orgFolder}/Перемещения.json`;
    let moves = [];
    try {
      const rawMoves = await loadJson(movesPath);
      moves = Array.isArray(rawMoves)
        ? rawMoves
        : Array.isArray(rawMoves?.moves)
          ? rawMoves.moves
          : [];
    } catch (error) {
      console.warn("Не удалось загрузить перемещения.", error);
    }

    infoPendingState.toolMap = await buildPendingToolsMap(orgFolder);
    infoPendingState.allItems = moves
      .map((move, index) => ({ move, moveIndex: index }))
      .filter(({ move }) => !String(move?.["Ответ"] ?? "").trim())
      .map((entry) => {
        const number = String(entry.move?.["Номер"] ?? "").trim();
        const accounting = String(entry.move?.["Бух.номер"] ?? "").trim();
        const tool =
          infoPendingState.toolMap.get(`n:${number}`) ??
          infoPendingState.toolMap.get(`a:${accounting}`) ??
          null;
        return {
          ...entry,
          tool,
          fineAmount: resolveLateReplyFine(entry.move, infoPendingState.fineConfig),
        };
      });

    infoPendingState.pendingDateKeys = new Set(
      infoPendingState.allItems
        .map(({ move }) => parseDateValue(move?.["Дата перемещения"]))
        .filter((date) => date instanceof Date && !Number.isNaN(date.getTime()))
        .map((date) => toIsoDate(date))
    );
    buildInfoPendingResponsibleOptions();
    updateInfoPendingResponsibleFilters();

    if (infoPendingState.filters.dateFrom) {
      const start = parseIsoDateValue(infoPendingState.filters.dateFrom);
      if (start instanceof Date && !Number.isNaN(start.getTime())) {
        infoPendingState.visibleMonthDate = new Date(start.getFullYear(), start.getMonth(), 1);
      }
    }
    handleInfoPendingFiltersChanged();
  };

  const openInfoPendingModal = async () => {
    if (!infoPendingModalEl) return;
    infoPendingModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setInfoPendingSortDropdownOpen(false);
    setInfoPendingFiltersOpen(false);
    setInfoPendingDatePickerOpen(false);
    infoPendingState.filters.sort = "receiver";
    if (infoPendingSortEl instanceof HTMLInputElement) {
      infoPendingSortEl.value = "receiver";
    }
    if (infoPendingSearchEl instanceof HTMLInputElement) {
      infoPendingSearchEl.value = infoPendingState.filters.search ?? "";
    }
    renderInfoPendingSortDropdown();
    await loadInfoPendingList();
  };


  const setInfoMovesHistoryGroupDropdownOpen = (isOpen) => {
    infoMovesHistoryState.isGroupOpen = Boolean(isOpen);
    infoMovesHistoryGroupDropdownEl?.classList.toggle("is-open", infoMovesHistoryState.isGroupOpen);
    infoMovesHistoryGroupMenuEl?.classList.toggle("is-hidden", !infoMovesHistoryState.isGroupOpen);
    infoMovesHistoryGroupTriggerEl?.setAttribute("aria-expanded", String(infoMovesHistoryState.isGroupOpen));
  };

  const setInfoMovesHistoryDatePickerOpen = (isOpen) => {
    infoMovesHistoryState.isDatePickerOpen = Boolean(isOpen);
    infoMovesHistoryDatePopoverEl?.classList.toggle("is-hidden", !infoMovesHistoryState.isDatePickerOpen);
    infoMovesHistoryDateTriggerEl?.setAttribute("aria-expanded", String(infoMovesHistoryState.isDatePickerOpen));
  };

  const setInfoMovesHistorySortDropdownOpen = (isOpen) => {
    infoMovesHistoryState.isSortOpen = Boolean(isOpen);
    infoMovesHistorySortDropdownEl?.classList.toggle("is-open", infoMovesHistoryState.isSortOpen);
    infoMovesHistorySortMenuEl?.classList.toggle("is-hidden", !infoMovesHistoryState.isSortOpen);
    infoMovesHistorySortTriggerEl?.setAttribute("aria-expanded", String(infoMovesHistoryState.isSortOpen));
  };

  const setInfoMovesHistoryFiltersOpen = (isOpen) => {
    infoMovesHistoryState.isFiltersOpen = Boolean(isOpen);
    infoMovesHistoryFiltersPanelEl?.classList.toggle("is-hidden", !infoMovesHistoryState.isFiltersOpen);
    infoMovesHistoryFiltersToggleEl?.setAttribute("aria-expanded", String(infoMovesHistoryState.isFiltersOpen));
  };

  const renderInfoMovesHistoryControls = () => {
    const currentSort = String(infoMovesHistoryState.filters.sort || "date-desc");
    const currentOption = infoMovesHistorySortModes.find((option) => option.value === currentSort) || infoMovesHistorySortModes[0];
    if (infoMovesHistorySortEl instanceof HTMLSelectElement) infoMovesHistorySortEl.value = currentOption.value;
    if (infoMovesHistorySortTriggerEl instanceof HTMLElement) {
      infoMovesHistorySortTriggerEl.setAttribute("aria-label", `Сортировка: ${currentOption.label}`);
      infoMovesHistorySortTriggerEl.title = `Сортировка: ${currentOption.label}`;
      infoMovesHistorySortTriggerEl.classList.toggle("is-active", currentOption.value !== "date-desc");
    }
    const currentGroup = String(infoMovesHistoryState.filters.group || "none");
    const currentGroupOption = infoMovesHistoryGroupModes.find((option) => option.value === currentGroup);
    if (infoMovesHistoryGroupEl instanceof HTMLSelectElement) infoMovesHistoryGroupEl.value = currentGroup;
    if (infoMovesHistoryGroupTriggerEl instanceof HTMLElement) {
      const groupLabel = currentGroupOption?.label || "Группировка";
      infoMovesHistoryGroupTriggerEl.setAttribute("aria-label", groupLabel);
      infoMovesHistoryGroupTriggerEl.title = groupLabel;
      infoMovesHistoryGroupTriggerEl.classList.toggle("is-active", currentGroup !== "none");
    }
    if (infoMovesHistoryGroupOptionsEl instanceof HTMLElement) {
      infoMovesHistoryGroupOptionsEl.innerHTML = "";
      [{ value: "none", label: "Без группировки" }, ...infoMovesHistoryGroupModes].forEach((option) => {
        const optionLabelEl = document.createElement("label");
        optionLabelEl.className = "tools-filter-option";
        const radioEl = document.createElement("input");
        radioEl.type = "radio";
        radioEl.name = "info-moves-history-group";
        radioEl.value = option.value;
        radioEl.checked = option.value === currentGroup;
        optionLabelEl.append(radioEl, document.createTextNode(option.label));
        infoMovesHistoryGroupOptionsEl.append(optionLabelEl);
      });
    }
    if (infoMovesHistoryDateTriggerEl instanceof HTMLElement) {
      const { dateFrom, dateTo } = infoMovesHistoryState.filters;
      const fromLabel = formatDateValue(parseIsoDateValue(dateFrom) || new Date(dateFrom));
      const toLabel = formatDateValue(parseIsoDateValue(dateTo) || new Date(dateTo));
      const label = dateFrom && dateTo ? `${fromLabel} — ${toLabel}` : dateFrom ? `С ${fromLabel}` : dateTo ? `До ${toLabel}` : "Любой период";
      infoMovesHistoryDateTriggerEl.textContent = label;
      infoMovesHistoryDateTriggerEl.classList.toggle("is-active", Boolean(dateFrom || dateTo));
    }
    if (infoMovesHistorySortOptionsEl instanceof HTMLElement) {
      infoMovesHistorySortOptionsEl.innerHTML = "";
      infoMovesHistorySortModes.forEach((option, index) => {
        const optionLabelEl = document.createElement("label");
        optionLabelEl.className = "tools-filter-option";
        const radioEl = document.createElement("input");
        radioEl.type = "radio";
        radioEl.name = "info-moves-history-sort";
        radioEl.value = option.value;
        radioEl.checked = option.value === currentOption.value;
        if (index === 0) radioEl.autofocus = true;
        optionLabelEl.append(radioEl, document.createTextNode(option.label));
        infoMovesHistorySortOptionsEl.append(optionLabelEl);
      });
    }
  };
  const getInfoMoveUser = (move) =>
    String(move?.["Принял"] ?? move?.["Ответственный"] ?? move?.["Ответственный до перемещения"] ?? move?.["Переместил"] ?? "").trim();

  const getInfoMoveSearchText = (move) =>
    [
      "Номер", "Бух.номер", "Наименование", "Производитель", "Модель", "Дата перемещения",
      "Переместил", "Принял", "Ответственный", "Ответственный до перемещения", "Старый объект",
      "Новый объект", "Причина перемещения", "Ответ", "Комментарий к ответу",
    ].map((key) => move?.[key]).join(" ").toLowerCase();

  const getInfoMoveGroupLabel = (move) => {
    const group = infoMovesHistoryState.filters.group;
    if (group === "date") return formatInfoValue(move?.["Дата перемещения"]);
    if (group === "sender") return String(move?.["Переместил энергетик"] ?? move?.["Переместил"] ?? move?.["Ответственный до перемещения"] ?? "").trim() || "Передающий не указан";
    if (group === "receiver") return String(move?.["Принял"] ?? move?.["Ответственный"] ?? "").trim() || "Принимающий не указан";
    return "";
  };

  const isInfoMoveObjectChange = (move) =>
    String(move?.["Ответ"] ?? "").trim().toLowerCase().includes("смена объекта");

  const getInfoMoveTone = (move) => {
    const answer = String(move?.["Ответ"] ?? "").trim().toLowerCase();
    if (answer.includes("не прин")) return "danger";
    if (answer.includes("отмена")) return "warning";
    if (isInfoMoveObjectChange(move)) return "object";
    if (answer === "принял" || answer.includes("принял")) return "success";
    return "neutral";
  };

  const getInfoMoveEnergyMover = (move) =>
    String(move?.["Переместил энергетик"] ?? move?.["Энергетик"] ?? "").trim();

  const getInfoMoveRejectReason = (move) =>
    String(move?.["Причина отказа"] ?? move?.["Комментарий к ответу"] ?? "").trim();

  const createInfoMovesHistoryRow = (icon, label, value, wide = false) => {
    const row = document.createElement("div");
    row.className = `info-moves-history-item__row${wide ? " info-moves-history-item__row--wide" : ""}`;
    const iconEl = document.createElement("span");
    iconEl.className = "info-moves-history-item__icon";
    iconEl.textContent = icon;
    const textEl = document.createElement("span");
    textEl.className = "info-moves-history-item__text";
    const valueEl = document.createElement("span");
    valueEl.className = "info-moves-history-item__value";
    valueEl.textContent = formatInfoValue(value);
    if (label) {
      const labelEl = document.createElement("span");
      labelEl.className = "info-moves-history-item__label";
      labelEl.textContent = label;
      textEl.appendChild(labelEl);
    }
    textEl.appendChild(valueEl);
    row.append(iconEl, textEl);
    return row;
  };

  const createInfoMovesHistoryGridArrow = () => {
    const arrowEl = document.createElement("strong");
    arrowEl.className = "info-moves-history-item__grid-arrow";
    arrowEl.textContent = "→";
    arrowEl.setAttribute("aria-hidden", "true");
    return arrowEl;
  };

  const getFilteredInfoMovesHistory = () => {
    const filters = infoMovesHistoryState.filters;
    const query = filters.search.trim().toLowerCase();
    const from = parseIsoDateValue(filters.dateFrom);
    const to = parseIsoDateValue(filters.dateTo);
    return infoMovesHistoryState.items.filter((move) => {
      if (query && !getInfoMoveSearchText(move).includes(query)) return false;
      const answer = String(move?.["Ответ"] ?? "").trim().toLowerCase();
      if (!answer) return false;
      if (filters.answer === "pending") return false;
      if (filters.answer === "answered" && !answer) return false;
      if (filters.answer === "cancelled" && !answer.includes("отмена")) return false;
      const moveDate = parseDateValue(move?.["Дата перемещения"]);
      if ((from || to) && !moveDate) return false;
      if (from && moveDate < from) return false;
      if (to) {
        const end = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
        if (moveDate > end) return false;
      }
      return true;
    }).sort((a, b) => {
      const sort = filters.sort;
      if (sort.startsWith("date")) {
        const aTime = parseDateValue(a?.["Дата перемещения"])?.getTime() || 0;
        const bTime = parseDateValue(b?.["Дата перемещения"])?.getTime() || 0;
        return sort === "date-asc" ? aTime - bTime : bTime - aTime;
      }
      const key = sort === "accounting-asc" ? "Бух.номер" : sort === "user-asc" ? null : "Номер";
      const aValue = key ? String(a?.[key] ?? "") : getInfoMoveUser(a);
      const bValue = key ? String(b?.[key] ?? "") : getInfoMoveUser(b);
      return aValue.localeCompare(bValue, "ru", { numeric: true, sensitivity: "base" });
    });
  };

  const renderInfoMovesHistory = () => {
    if (!infoMovesHistoryListEl || !infoMovesHistoryEmptyEl || !infoMovesHistorySummaryEl) return;
    const filtered = getFilteredInfoMovesHistory();
    infoMovesHistorySummaryEl.innerHTML = "";
    infoMovesHistoryListEl.innerHTML = "";
    infoMovesHistoryEmptyEl.classList.toggle("is-hidden", filtered.length > 0);
    let currentGroup = null;
    filtered.forEach((move) => {
      const groupLabel = getInfoMoveGroupLabel(move);
      if (infoMovesHistoryState.filters.group !== "none" && groupLabel !== currentGroup) {
        currentGroup = groupLabel;
        const group = document.createElement("div");
        group.className = "info-moves-history-group";
        const groupTitle = document.createElement("strong");
        groupTitle.textContent = groupLabel;
        const groupCount = document.createElement("span");
        groupCount.textContent = String(filtered.filter((item) => getInfoMoveGroupLabel(item) === groupLabel).length);
        group.append(groupTitle, groupCount);
        infoMovesHistoryListEl.appendChild(group);
      }
      const card = document.createElement("article");
      const answer = String(move?.["Ответ"] ?? "").trim();
      const tone = getInfoMoveTone(move);
      card.className = `info-moves-history-item info-moves-history-item--${tone}`;
      const titleText = infoMovesHistoryState.filters.view === "accounting" ? formatInfoValue(move?.["Бух.номер"]) : infoMovesHistoryState.filters.view === "date" ? formatInfoValue(move?.["Дата перемещения"]) : infoMovesHistoryState.filters.view === "user" ? (getInfoMoveUser(move) || "Пользователь не указан") : formatInfoValue(move?.["Номер"]);
      const nameText = String(move?.["Наименование"] ?? "").trim();
      const manufacturerModelText = [move?.["Производитель"], move?.["Модель"]]
        .map((part) => String(part ?? "").trim())
        .filter(Boolean)
        .join(" ");
      const subtitle = [nameText, manufacturerModelText].filter(Boolean).join(" • ");
      const title = document.createElement("div");
      title.className = "info-moves-history-item__title";
      const titleMain = document.createElement("div");
      titleMain.className = "info-moves-history-item__title-main";
      const titleIcon = document.createElement("span");
      titleIcon.className = "info-moves-history-item__title-icon";
      titleIcon.textContent = "⇄";
      const titleTextEl = document.createElement("span");
      titleTextEl.className = "info-moves-history-item__title-text";
      const titleValueEl = document.createElement("span");
      titleValueEl.textContent = titleText;
      const accountingNumberValue = String(move?.["Бух.номер"] ?? "").trim();
      const accountingNumberEl = document.createElement("small");
      accountingNumberEl.className = "info-moves-history-item__accounting";
      accountingNumberEl.textContent = accountingNumberValue;
      const subtitleEl = document.createElement("small");
      subtitleEl.textContent = subtitle;
      titleTextEl.append(titleValueEl);
      if (accountingNumberValue) titleTextEl.appendChild(accountingNumberEl);
      if (subtitle) titleTextEl.appendChild(subtitleEl);
      titleMain.append(titleIcon, titleTextEl);
      const answerEl = document.createElement("em");
      answerEl.textContent = answer || "Без ответа";
      title.append(titleMain, answerEl);
      const route = document.createElement("div");
      route.className = "info-moves-history-item__route";
      const fromEl = document.createElement("span");
      const fromValue = document.createElement("b");
      fromValue.textContent = formatInfoValue(move?.["Старый объект"] || move?.["Ответственный до перемещения"] || move?.["Переместил"]);
      fromEl.appendChild(fromValue);
      const arrowEl = document.createElement("strong");
      arrowEl.textContent = "→";
      const toEl = document.createElement("span");
      const toValue = document.createElement("b");
      toValue.textContent = formatInfoValue(move?.["Новый объект"] || move?.["Принял"] || move?.["Ответственный"]);
      toEl.appendChild(toValue);
      route.append(fromEl, arrowEl, toEl);
      const grid = document.createElement("div");
      grid.className = "info-moves-history-item__grid";
      const previousResponsibleValue = move?.["Ответственный до перемещения"] || move?.["Переместил"];
      const movedByValue = getInfoMoveEnergyMover(move) || move?.["Переместил"];
      const movedByLabel = getInfoMoveEnergyMover(move) ? "Переместил энергетик" : "Переместил";
      const shouldShowMovedBy =
        normalizePersonName(previousResponsibleValue) !== normalizePersonName(movedByValue);
      const reasonValue = tone === "danger"
        ? getInfoMoveRejectReason(move)
        : String(move?.["Причина перемещения"] ?? move?.["Комментарий к ответу"] ?? "").trim();
      const isObjectChange = isInfoMoveObjectChange(move);
      const gridItems = [
        ...(isObjectChange
          ? []
          : [
              createInfoMovesHistoryRow("📦", "", previousResponsibleValue),
              createInfoMovesHistoryGridArrow(),
              createInfoMovesHistoryRow("✅", "", move?.["Принял"] || move?.["Ответственный"]),
              ...(shouldShowMovedBy
                ? [createInfoMovesHistoryRow("👷", movedByLabel, movedByValue, true)]
                : []),
            ]),
        (() => {
          const dates = document.createElement("div");
          dates.className = "info-moves-history-item__dates";
          dates.append(
            createInfoMovesHistoryRow("📅", "Дата перемещения", move?.["Дата перемещения"]),
            createInfoMovesHistoryRow("🕓", "Дата ответа", move?.["Дата ответа"])
          );
          return dates;
        })()
      ];
      if (reasonValue) {
        gridItems.push(createInfoMovesHistoryRow("✍", tone === "danger" ? "Причина отказа" : "Причина перемещения", reasonValue, true));
      }
      grid.append(...gridItems);
      card.append(title, route, grid);
      infoMovesHistoryListEl.appendChild(card);
    });
  };

  const loadInfoMovesHistory = async () => {
    if (!context.orgFolderName) {
      infoMovesHistoryState.items = [];
      renderInfoMovesHistory();
      return;
    }
    const moves = await loadOrgMovesIncludingHistory(context.orgFolderName, "историю перемещений");
    infoMovesHistoryState.items = parseCollectionItems(moves, "moves");
    renderInfoMovesHistory();
    renderInfoMovesHistoryControls();
  };

  const openInfoMovesHistoryModal = async () => {
    if (!infoMovesHistoryModalEl) return;
    infoMovesHistoryModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setInfoMovesHistorySortDropdownOpen(false);
    setInfoMovesHistoryGroupDropdownOpen(false);
    setInfoMovesHistoryFiltersOpen(false);
    setInfoMovesHistoryDatePickerOpen(false);
    renderInfoMovesHistoryControls();
    await loadInfoMovesHistory();
  };

  const closeInfoMovesHistoryModal = () => {
    if (!infoMovesHistoryModalEl) return;
    infoMovesHistoryModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
  };

  const formatInfoByDatesLabel = (isoDate) => {
    const parsed = parseIsoDateValue(isoDate);
    return parsed ? formatDateValue(parsed) : "—";
  };

  const setInfoByDatesRangeLabel = () => {
    if (!infoByDatesCalendarSelectedRangeEl) return;
    const from = infoByDatesState.filters.dateFrom;
    const to = infoByDatesState.filters.dateTo;
    if (!from && !to) {
      infoByDatesCalendarSelectedRangeEl.textContent = "";
      return;
    }
    if (from && !to) {
      infoByDatesCalendarSelectedRangeEl.textContent = `Начало: ${formatInfoByDatesLabel(from)}. Выберите конечную дату.`;
      return;
    }
    const start = formatInfoByDatesLabel(from);
    const end = formatInfoByDatesLabel(to || from);
    infoByDatesCalendarSelectedRangeEl.textContent =
      from === to ? `Выбран 1 день: ${start}` : `Период: ${start} — ${end}`;
  };

  const updateInfoByDatesCalendarVisibility = () => {
    if (!infoByDatesCalendarEl || !infoByDatesToggleCalendarEl) return;
    const isCollapsed = Boolean(infoByDatesState.isCalendarCollapsed);
    infoByDatesCalendarEl.classList.toggle("is-collapsed", isCollapsed);
    infoByDatesToggleCalendarEl.textContent = isCollapsed
      ? "Развернуть календарь"
      : "Свернуть календарь";
  };

  const renderInfoByDatesCalendar = () => {
    if (!infoByDatesCalendarDaysEl || !infoByDatesCalendarMonthLabelEl) return;
    const visibleDate = infoByDatesState.visibleMonthDate;
    const year = visibleDate.getFullYear();
    const month = visibleDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const daysCount = new Date(year, month + 1, 0).getDate();
    infoByDatesCalendarMonthLabelEl.textContent = firstDay.toLocaleDateString("ru-RU", {
      month: "long",
      year: "numeric",
    });
    infoByDatesCalendarDaysEl.innerHTML = "";
    for (let i = 0; i < offset; i += 1) {
      const filler = document.createElement("span");
      filler.className = "download-moves-calendar__day is-empty";
      infoByDatesCalendarDaysEl.appendChild(filler);
    }

    const from = parseIsoDateValue(infoByDatesState.filters.dateFrom);
    const toRaw = parseIsoDateValue(infoByDatesState.filters.dateTo);
    const to = toRaw || from;
    const rangeStart = from && to ? new Date(Math.min(from.getTime(), to.getTime())) : null;
    const rangeEnd = from && to ? new Date(Math.max(from.getTime(), to.getTime())) : null;
    const sameDay = (a, b) =>
      a && b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    for (let day = 1; day <= daysCount; day += 1) {
      const dayDate = new Date(year, month, day);
      const iso = formatIsoDateValue(dayDate);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "download-moves-calendar__day";
      btn.dataset.date = iso;
      btn.textContent = String(day);
      if (
        rangeStart &&
        rangeEnd &&
        dayDate.getTime() >= rangeStart.getTime() &&
        dayDate.getTime() <= rangeEnd.getTime()
      ) {
        btn.classList.add("is-in-range");
      }
      if (sameDay(dayDate, from) || sameDay(dayDate, to)) {
        btn.classList.add("is-selected");
      }
      infoByDatesCalendarDaysEl.appendChild(btn);
    }
    setInfoByDatesRangeLabel();
  };

  const parseCollectionItems = (raw, fallbackKey) => {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.[fallbackKey])) return raw[fallbackKey];
    return [];
  };

  const loadOrgMovesIncludingHistory = async (orgFolder, logContext = "перемещения") => {
    const movesPath = `./${orgFolder}/Перемещения.json`;
    const movesHistoryPath = `./${orgFolder}/Перемещения история.json`;

    let activeMovesRaw = [];
    try {
      activeMovesRaw = await loadJson(movesPath);
    } catch (error) {
      console.warn(`Не удалось загрузить ${logContext}.`, error);
    }

    let historyMovesRaw = [];
    try {
      historyMovesRaw = await loadJson(movesHistoryPath);
    } catch (error) {
      historyMovesRaw = [];
    }

    return [
      ...parseCollectionItems(activeMovesRaw, "moves"),
      ...parseCollectionItems(historyMovesRaw, "moves"),
    ];
  };

  const createInfoByDatesRow = (label, value, options = {}) => {
    const row = document.createElement("div");
    row.className = `info-by-dates-item__meta${options.wide ? " info-by-dates-item__meta--wide" : ""}${options.inline ? " info-by-dates-item__meta--inline" : ""}`;
    const labelEl = document.createElement("span");
    labelEl.className = "info-by-dates-item__label";
    labelEl.textContent = label;
    if (options.labelTitle) {
      labelEl.title = options.labelTitle;
      labelEl.setAttribute("aria-label", options.labelTitle);
    }
    const valueEl = document.createElement("strong");
    valueEl.className = "info-by-dates-item__value";
    valueEl.textContent = formatInfoValue(value);
    row.append(labelEl, valueEl);
    return row;
  };

  const createInfoByDatesCompactValue = (...values) => {
    const parts = values
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);
    return parts.length ? parts.join(" · ") : "";
  };

  const applyInfoByDatesFilter = (items, getDate) => {
    const from = parseIsoDateValue(infoByDatesState.filters.dateFrom);
    const toRaw = parseIsoDateValue(infoByDatesState.filters.dateTo);
    const to = toRaw || from;
    if (!from && !to) return items;
    const rangeStart = from && to ? new Date(Math.min(from.getTime(), to.getTime())) : from || to;
    const rangeEnd = from && to ? new Date(Math.max(from.getTime(), to.getTime())) : from || to;
    return items.filter((item) => {
      const valueDate = parseDateValue(getDate(item));
      if (!valueDate) return false;
      const dateOnly = new Date(valueDate.getFullYear(), valueDate.getMonth(), valueDate.getDate());
      return dateOnly >= rangeStart && dateOnly <= rangeEnd;
    });
  };

  const renderInfoByDatesList = () => {
    if (!infoByDatesListEl || !infoByDatesEmptyEl) return;
    infoByDatesListEl.innerHTML = "";

    const tab = infoByDatesState.activeTab;
    const source =
      tab === "moves"
        ? infoByDatesState.moves
        : tab === "writeoff"
          ? infoByDatesState.writeoffs
          : infoByDatesState.registrations;

    const filtered = applyInfoByDatesFilter(
      source,
      (item) =>
        tab === "moves"
          ? item?.["Дата перемещения"]
          : tab === "writeoff"
            ? item?.["Дата списания"]
            : item?.["Дата покупки"]
    );

    infoByDatesEmptyEl.classList.toggle("is-hidden", filtered.length > 0);
    if (!filtered.length) {
      infoByDatesEmptyEl.textContent = "За выбранные даты данных нет.";
      return;
    }

    filtered.forEach((item) => {
      const card = document.createElement("article");
      card.className = `info-by-dates-item info-by-dates-item--${tab}`;

      const eventDate =
        tab === "moves"
          ? item?.["Дата перемещения"]
          : tab === "writeoff"
            ? item?.["Дата списания"]
            : item?.["Дата покупки"];

      const grid = document.createElement("div");
      grid.className = "info-by-dates-item__grid";
      if (tab === "moves") {
        grid.append(
          ...[
            createInfoByDatesRow("Дата", eventDate),
            createInfoByDatesRow("Номер", item?.["Номер"]),
            createInfoByDatesRow("Бух.номер", item?.["Бух.номер"]),
            createInfoByDatesRow("Передал", item?.["Переместил"]),
            createInfoByDatesRow("Принял", item?.["Принял"]),
            objectTrackingEnabled ? createInfoByDatesRow("Старый объект", item?.["Старый объект"]) : null,
            objectTrackingEnabled ? createInfoByDatesRow("Новый объект", item?.["Новый объект"]) : null,
          ].filter(Boolean)
        );
      } else if (tab === "writeoff") {
        grid.append(
          ...[
            createInfoByDatesRow("Дата", eventDate),
            createInfoByDatesRow("Номер", item?.["Номер"]),
            createInfoByDatesRow("Бух.номер", item?.["Бух.номер"]),
            createInfoByDatesRow("Наименование", item?.["Наименование"]),
            createInfoByDatesRow("Списал", item?.["Списал"]),
            createInfoByDatesRow("Ответственный", item?.["Ответственный"]),
            objectTrackingEnabled ? createInfoByDatesRow("Объект", item?.["Объект"]) : null,
          ].filter(Boolean)
        );
      } else {
        grid.append(
          ...[
            createInfoByDatesRow("📅", eventDate, { labelTitle: "Дата", inline: true }),
            createInfoByDatesRow(
              "🔢",
              createInfoByDatesCompactValue(item?.["Номер"], item?.["Бух.номер"]),
              { labelTitle: "Номер и бухгалтерский номер", inline: true }
            ),
            createInfoByDatesRow(
              "🧰",
              createInfoByDatesCompactValue(item?.["Наименование"], item?.["Производитель"], item?.["Модель"]),
              { labelTitle: "Инструмент", wide: true, inline: true }
            ),
            createInfoByDatesRow("👤", item?.["Ответственный"], { labelTitle: "Ответственный", inline: true }),
            objectTrackingEnabled ? createInfoByDatesRow("📍", item?.["Объект"], { labelTitle: "Объект", inline: true }) : null,
          ].filter(Boolean)
        );
      }

      card.append(grid);
      infoByDatesListEl.appendChild(card);
    });
  };

  const loadInfoByDatesData = async () => {
    if (!context.orgFolderName) {
      infoByDatesState.registrations = [];
      infoByDatesState.moves = [];
      infoByDatesState.writeoffs = [];
      renderInfoByDatesList();
      return;
    }
    const orgFolder = context.orgFolderName;
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    const writeoffPath = `./${orgFolder}/Списания.json`;

    let toolsRaw = [];
    let movesRaw = [];
    let writeoffRaw = [];
    try {
      toolsRaw = await loadJson(toolsPath);
    } catch (error) {
      console.warn("Не удалось загрузить регистрации по датам.", error);
    }
    movesRaw = await loadOrgMovesIncludingHistory(orgFolder, "перемещения по датам");
    try {
      writeoffRaw = await loadJson(writeoffPath);
    } catch (error) {
      console.warn("Не удалось загрузить списания по датам.", error);
    }

    infoByDatesState.registrations = parseCollectionItems(toolsRaw, "tools").sort((a, b) => {
      const aDate = parseDateValue(a?.["Дата покупки"]);
      const bDate = parseDateValue(b?.["Дата покупки"]);
      return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
    });
    infoByDatesState.moves = parseCollectionItems(movesRaw, "moves").sort((a, b) => {
      const aDate = parseDateValue(a?.["Дата перемещения"]);
      const bDate = parseDateValue(b?.["Дата перемещения"]);
      return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
    });
    infoByDatesState.writeoffs = parseCollectionItems(writeoffRaw, "items").sort((a, b) => {
      const aDate = parseDateValue(a?.["Дата списания"]);
      const bDate = parseDateValue(b?.["Дата списания"]);
      return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
    });
    renderInfoByDatesList();
  };

  const openInfoByDatesModal = async () => {
    if (!infoByDatesModalEl) return;
    infoByDatesModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    infoByDatesState.isCalendarCollapsed = false;
    updateInfoByDatesCalendarVisibility();
    renderInfoByDatesCalendar();
    await loadInfoByDatesData();
  };

  const closeInfoByDatesModal = () => {
    if (!infoByDatesModalEl) return;
    infoByDatesModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
  };

  const closeInfoPendingModal = () => {
    if (!infoPendingModalEl) return;
    infoPendingModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
    setInfoPendingSortDropdownOpen(false);
    setInfoPendingFiltersOpen(false);
    setInfoPendingDatePickerOpen(false);
  };

  const formatInfoPendingDateLabel = (value) => {
    const parsed = parseIsoDateValue(value);
    if (!(parsed instanceof Date) || Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleDateString("ru-RU");
  };

  const getInfoPendingDateRange = () => {
    const start = parseIsoDateValue(infoPendingState.filters.dateFrom);
    const endRaw = parseIsoDateValue(infoPendingState.filters.dateTo);
    if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
      return { start: null, end: null };
    }
    if (!(endRaw instanceof Date) || Number.isNaN(endRaw.getTime())) {
      return { start, end: start };
    }
    return start.getTime() <= endRaw.getTime()
      ? { start, end: endRaw }
      : { start: endRaw, end: start };
  };

  const updateInfoPendingDateTrigger = () => {
    if (!infoPendingDateTriggerEl) return;
    const { start, end } = getInfoPendingDateRange();
    if (!start && !end) {
      infoPendingDateTriggerEl.textContent = "Выберите дату";
      return;
    }
    const startLabel = formatInfoPendingDateLabel(start);
    const endLabel = formatInfoPendingDateLabel(end);
    infoPendingDateTriggerEl.textContent =
      startLabel && endLabel && startLabel !== endLabel
        ? `${startLabel} — ${endLabel}`
        : startLabel || endLabel || "Выберите дату";
  };

  const updateInfoPendingCalendarHint = () => {
    if (!infoPendingCalendarSelectedRangeEl) return;
    const { start, end } = getInfoPendingDateRange();
    if (!start && !end) {
      infoPendingCalendarSelectedRangeEl.textContent = "Выберите одну дату или диапазон";
      return;
    }
    const startLabel = formatInfoPendingDateLabel(start);
    const endLabel = formatInfoPendingDateLabel(end);
    infoPendingCalendarSelectedRangeEl.textContent =
      startLabel && endLabel && startLabel !== endLabel
        ? `Период: ${startLabel} — ${endLabel}`
        : `Дата: ${startLabel || endLabel}`;
  };

  const renderInfoPendingCalendar = () => {
    if (!infoPendingCalendarDaysEl || !infoPendingCalendarMonthLabelEl) return;
    const monthDate = new Date(
      infoPendingState.visibleMonthDate.getFullYear(),
      infoPendingState.visibleMonthDate.getMonth(),
      1
    );
    infoPendingCalendarMonthLabelEl.textContent = monthDate.toLocaleDateString("ru-RU", {
      month: "long",
      year: "numeric",
    });
    const { start, end } = getInfoPendingDateRange();
    const startTs = start instanceof Date ? start.getTime() : Number.NaN;
    const endTs = end instanceof Date ? end.getTime() : Number.NaN;

    infoPendingCalendarDaysEl.innerHTML = "";
    buildMonthMatrix(monthDate).forEach((dayDate) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "download-moves-calendar__day";
      if (!dayDate) {
        button.classList.add("is-empty");
        button.tabIndex = -1;
        infoPendingCalendarDaysEl.append(button);
        return;
      }
      const iso = toIsoDate(dayDate);
      const ts = dayDate.getTime();
      button.dataset.date = iso;
      button.textContent = String(dayDate.getDate());
      if (!infoPendingState.pendingDateKeys.has(iso)) {
        button.classList.add("is-no-pending");
      }
      if (Number.isFinite(startTs) && ts === startTs) button.classList.add("is-selected");
      if (Number.isFinite(endTs) && ts === endTs) button.classList.add("is-selected");
      if (Number.isFinite(startTs) && Number.isFinite(endTs) && ts >= startTs && ts <= endTs) {
        button.classList.add("is-in-range");
      }
      infoPendingCalendarDaysEl.append(button);
    });
    updateInfoPendingCalendarHint();
  };

  const setInfoPendingDatePickerOpen = (isOpen) => {
    infoPendingState.isDatePickerOpen = Boolean(isOpen);
    infoPendingCalendarEl?.classList.toggle("is-hidden", !infoPendingState.isDatePickerOpen);
    if (infoPendingState.isDatePickerOpen) {
      renderInfoPendingCalendar();
    }
  };

  const setInfoPendingFiltersOpen = (isOpen) => {
    infoPendingState.isFiltersOpen = Boolean(isOpen);
    infoPendingFiltersPanelEl?.classList.toggle("is-hidden", !infoPendingState.isFiltersOpen);
    infoPendingFiltersToggleEl?.setAttribute("aria-expanded", String(infoPendingState.isFiltersOpen));
    if (!infoPendingState.isFiltersOpen) {
      setInfoPendingPersonDropdownOpen("", false);
      setInfoPendingDatePickerOpen(false);
    }
  };

  const handleInfoPendingDateSelect = (isoDate) => {
    const currentStart = String(infoPendingFilterDateFromEl?.value ?? "").trim();
    const currentEnd = String(infoPendingFilterDateToEl?.value ?? "").trim();
    if (!currentStart || (currentStart && currentEnd)) {
      if (infoPendingFilterDateFromEl) infoPendingFilterDateFromEl.value = isoDate;
      if (infoPendingFilterDateToEl) infoPendingFilterDateToEl.value = "";
    } else {
      if (infoPendingFilterDateToEl) infoPendingFilterDateToEl.value = isoDate;
    }
    handleInfoPendingFiltersChanged();
    setInfoPendingDatePickerOpen(true);
  };

  const handleInfoPendingFiltersChanged = () => {
    infoPendingState.filters.search = String(infoPendingSearchEl?.value ?? "").trim();
    const requestedSort = String(infoPendingSortEl?.value ?? "old");
    infoPendingState.filters.sort =
      infoPendingSortModes.some((option) => option.value === requestedSort)
        ? requestedSort
        : "old";
    renderInfoPendingSortDropdown();
    infoPendingState.filters.receiver = String(
      infoPendingFilterReceiverEl?.value ?? ""
    ).trim();
    infoPendingState.filters.sender = String(
      infoPendingFilterSenderEl?.value ?? ""
    ).trim();
    infoPendingState.filters.dateFrom = String(
      infoPendingFilterDateFromEl?.value ?? ""
    ).trim();
    infoPendingState.filters.dateTo = String(
      infoPendingFilterDateToEl?.value ?? ""
    ).trim();
    updateInfoPendingDateTrigger();
    applyInfoPendingFiltersAndSort();
    renderInfoPendingList();
  };

  const applyPendingMovesDecision = async ({
    moveIndexes,
    decision,
    declineReason: providedDeclineReason = "",
    declinePhotoFile: providedDeclinePhotoFile = null,
  }) => {
    if (pendingMovesState.isSaving) return;
    if (!moveIndexes.length) {
      setPendingMovesMessage("Нет перемещений для ответа.", "info");
      return;
    }
    let declineReason = "";
    let declinePhotoFile = null;
    if (decision === "Не принял") {
      declineReason = String(providedDeclineReason ?? "").trim();
      declinePhotoFile = providedDeclinePhotoFile ?? null;
      if (!declineReason) {
        const declinePayload = await requestPendingMovesDeclineReason();
        declineReason = String(declinePayload?.reason ?? "").trim();
        declinePhotoFile = declinePayload?.photoFile ?? null;
      }
      if (!declineReason) {
        return;
      }
    }
    setPendingMovesSavingState(true);
    setPendingMovesMessage("Сохраняем ответы...", "info");
    const updatedMoves = [...pendingMovesState.allMoves];
    const responseDate = formatDateValue(new Date());
    const declinePhotoEntries = [];
    const declinePhotoNames = new Map();
    let declinePhotoContent = "";
    if (decision === "Не принял" && declinePhotoFile) {
      try {
        declinePhotoContent = await readFileAsBase64(declinePhotoFile);
      } catch (error) {
        console.error(error);
        setPendingMovesMessage(
          "Не удалось прочитать фото отказа. Попробуйте снова.",
          "error"
        );
        setPendingMovesSavingState(false);
        return;
      }
    }
    const acceptedFineSummaryUpdates = new Map();
    let toolsPayload = null;
    let toolsNormalized = null;
    let toolsIndexMap = null;
    if (decision === "Принял") {
      const toolsPath = `./${context.orgFolderName}/База с инструментами.json`;
      try {
        const rawTools = await loadJson(toolsPath);
        toolsNormalized = normalizeCollectionPayload(rawTools, "tools");
        toolsIndexMap = buildToolIndexMap(toolsNormalized.items);
      } catch (error) {
        console.warn("Не удалось загрузить базу инструментов.", error);
      }
    }
    const resolveToolForMove = (move) => {
      const number = String(move?.["Номер"] ?? "").trim();
      const accounting = String(move?.["Бух.номер"] ?? "").trim();
      if (toolsNormalized && toolsIndexMap) {
        const toolIndex =
          (number && toolsIndexMap.get(`n:${number}`)) ??
          (accounting && toolsIndexMap.get(`a:${accounting}`));
        if (toolIndex !== undefined) {
          return toolsNormalized.items[toolIndex];
        }
      }
      return (
        pendingMovesState.toolMap?.get(`n:${number}`) ??
        pendingMovesState.toolMap?.get(`a:${accounting}`) ??
        null
      );
    };

    moveIndexes.forEach((index) => {
      const move = updatedMoves[index];
      if (!move) return;
      const lateReplyFineAmount =
        decision === "Принял"
          ? resolveLateReplyFine(move, pendingMovesState.fineConfig)
          : 0;
      const fineAmount =
        resolveMoveFineAmount(move) ||
        lateReplyFineAmount;
      if (fineAmount > 0) {
        if (decision === "Принял") {
          const acceptedBy = String(move?.["Принял"] ?? "").trim();
          const fineType = normalizeMoveFineType(move);
          const isReplacementMode =
            pendingMovesState.replacementMode &&
            Boolean(pendingMovesState.targetFullName) &&
            Boolean(pendingMovesState.vacationStartAt);
          let acceptedFineAmount = fineAmount;
          let replacementFineAmount = 0;

          if (isReplacementMode) {
            const splitFine = splitMoveFineByVacation(
              move,
              fineAmount,
              pendingMovesState.vacationStartAt
            );
            acceptedFineAmount = splitFine.beforeVacation;
            replacementFineAmount = splitFine.afterVacation;
            updatedMoves[index] = {
              ...move,
              "Штраф до отпуска": acceptedFineAmount,
              "Штраф в отпуске": replacementFineAmount,
              "Ответственный в отпуске": pendingMovesState.targetFullName,
            };
          }

          const addFineToUserSummary = (fullName, amount) => {
            const normalizedUser = String(fullName ?? "").trim();
            const normalizedAmount = normalizeCostValue(amount) || 0;
            if (!normalizedUser || !normalizedAmount) return;
            if (!acceptedFineSummaryUpdates.has(normalizedUser)) {
              acceptedFineSummaryUpdates.set(normalizedUser, new Map());
            }
            const userFineMap = acceptedFineSummaryUpdates.get(normalizedUser);
            const current = normalizeCostValue(userFineMap.get(fineType)) || 0;
            userFineMap.set(fineType, current + normalizedAmount);
          };

          addFineToUserSummary(acceptedBy, acceptedFineAmount);
          if (replacementFineAmount > 0) {
            addFineToUserSummary(pendingMovesState.targetFullName, replacementFineAmount);
          }

          updatedMoves[index] = {
            ...updatedMoves[index],
            "Штраф за ответ": fineAmount,
            "Тип штрафа": fineType,
            ...(lateReplyFineAmount > 0
              ? { "Штраф за поздний ответ": "Да" }
              : {}),
          };
        }
      }
      if (decision === "Принял" && toolsNormalized && toolsIndexMap) {
        const number = String(move?.["Номер"] ?? "").trim();
        const accounting = String(move?.["Бух.номер"] ?? "").trim();
        const toolIndex =
          (number && toolsIndexMap.get(`n:${number}`)) ??
          (accounting && toolsIndexMap.get(`a:${accounting}`));
        if (toolIndex !== undefined) {
          const tool = toolsNormalized.items[toolIndex];
          toolsNormalized.items[toolIndex] = {
            ...tool,
            Ответственный: String(move?.["Принял"] ?? "").trim(),
            Объект: String(move?.["Новый объект"] ?? "").trim(),
          };
        }
      }
      updatedMoves[index] = {
        ...updatedMoves[index],
        "Дата ответа": responseDate,
        Ответ: decision,
      };
      if (decision === "Не принял") {
        updatedMoves[index]["Причина отказа"] = declineReason;
        if (declinePhotoContent) {
          const toolNumber =
            String(move?.["Номер"] ?? "").trim() ||
            String(move?.["Бух.номер"] ?? "").trim() ||
            "без_номера";
          const fileName = buildDeclinePhotoFileName(
            toolNumber,
            responseDate,
            declinePhotoFile
          );
          updatedMoves[index]["Фото отказа"] = fileName;
          declinePhotoNames.set(index, fileName);
          declinePhotoEntries.push({
            type: "file",
            path: `${context.orgFolderName}/Фото отказов/${fileName}`,
            content: declinePhotoContent,
            encoding: "base64",
            mime: declinePhotoFile?.type || "image/*",
            ...buildUploadUserMeta({ organizationName: context.orgFullName }),
          });
        }
      }
    });
    const movesPath = `./${context.orgFolderName}/Перемещения.json`;
    if (toolsNormalized) {
      toolsPayload = toolsNormalized.wrapper
        ? { ...toolsNormalized.wrapper, [toolsNormalized.key]: toolsNormalized.items }
        : toolsNormalized.items;
    }
    let finesPayload = null;
    if (acceptedFineSummaryUpdates.size) {
      const finesPath = `./${context.orgFolderName}/Штрафы.json`;
      try {
        const rawFines = await loadJson(finesPath);
        finesPayload = applyMoveFinesSummaryUpdates(rawFines, acceptedFineSummaryUpdates);
      } catch (error) {
        finesPayload = applyMoveFinesSummaryUpdates({}, acceptedFineSummaryUpdates);
      }
    }
    try {
      if (declinePhotoEntries.length) {
        await uploadPhotoEntriesInBatches(declinePhotoEntries);
      }
      const entries = [{ path: movesPath, data: updatedMoves, user }];
      if (toolsPayload) {
        entries.push({
          path: `./${context.orgFolderName}/База с инструментами.json`,
          data: toolsPayload,
          user,
        });
      }
      if (finesPayload) {
        entries.push({
          path: `./${context.orgFolderName}/Штрафы.json`,
          data: finesPayload,
          user,
        });
      }
      await saveEntries(entries);
      pendingMovesState.allMoves = updatedMoves;
      setPendingMovesMessage("Ответы сохранены.", "success");
      const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
      const organizationName = findUserOrganizationName(user, usersData);
      const responderName = String(user?.full_name ?? "").trim();
      await Promise.all(
        moveIndexes.map(async (index) => {
          const move = updatedMoves[index];
          if (!move) return;
          const tool = resolveToolForMove(move);
          if (!tool) return;
          const declinePhotoName = declinePhotoNames.get(index);
          const declinePhotoUrl = declinePhotoName
            ? buildDeclinePhotoUrl(context.orgFolderName, declinePhotoName)
            : "";
          await notifyMoveDecision({
            tool,
            move,
            orgFolder: context.orgFolderName,
            organizationName,
            decision,
            reason: decision === "Не принял" ? declineReason : "",
            respondedBy: responderName,
            declinePhotoUrl,
          });
        })
      );
      await loadPendingMovesList({
        targetFullName: pendingMovesState.targetFullName,
        replacementMode: pendingMovesState.replacementMode,
        allReceiversMode: pendingMovesState.allReceiversMode,
        vacationStartAt: pendingMovesState.vacationStartAt,
      });
      await refreshPendingMovesIndicator();
      await refreshAwaitingReplyIndicator();
    } catch (error) {
      console.error(error);
      setPendingMovesMessage("Не удалось сохранить ответы.", "error");
    } finally {
      setPendingMovesSavingState(false);
    }
  };

  if (toolsBackdropEl) {
    toolsBackdropEl.addEventListener("click", closeToolsModal);
  }
  if (toolsCloseButton) {
    toolsCloseButton.addEventListener("click", closeToolsModal);
  }

  if (toolsOpenReplacementPendingButton) {
    toolsOpenReplacementPendingButton.addEventListener("click", () => {
      if (!toolsState.activeReplacementResponsible) return;
      closeToolsModal();
      openPendingMovesModal({
        targetFullName: toolsState.activeReplacementResponsible,
        replacementMode: true,
        vacationStartAt:
          replacementVacationStartMap.get(toolsState.activeReplacementResponsible) ?? "",
      });
    });
  }
  toolsModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeToolsModal();
    }
  });
  if (toolsEditBackdropEl) {
    toolsEditBackdropEl.addEventListener("click", closeToolsEditModal);
  }
  if (toolsEditCloseButton) {
    toolsEditCloseButton.addEventListener("click", closeToolsEditModal);
  }
  if (toolsEditCancelButton) {
    toolsEditCancelButton.addEventListener("click", closeToolsEditModal);
  }
  toolsEditModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeToolsEditModal();
    }
  });
  if (toolsInfoBackdropEl) {
    toolsInfoBackdropEl.addEventListener("click", closeToolsInfoModal);
  }
  if (toolsInfoCloseButton) {
    toolsInfoCloseButton.addEventListener("click", closeToolsInfoModal);
  }
  toolsInfoModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeToolsInfoModal();
    }
  });
  if (toolsInfoGridEl) {
    toolsInfoGridEl.addEventListener("click", (event) => {
      const photoButton = event.target.closest("[data-tools-info-cover-open]");
      if (photoButton) {
        const tool = toolsInfoState.tool;
        if (!tool) return;
        openPendingMovePhotoViewer({
          tool,
          fallbackNumber: resolveToolNumberValue(tool),
          title: toolsInfoTitleEl?.textContent || "Инструмент",
        });
        return;
      }
      const notesButton = event.target.closest("[data-tools-notes-open]");
      if (notesButton && toolsInfoState.tool) {
        openToolsNotesModal(toolsInfoState.tool);
      }
    });
  }
  if (toolsInfoKitToggleButton) {
    toolsInfoKitToggleButton.addEventListener("click", toggleToolsInfoKit);
  }
  if (toolsInfoTabButtons.length) {
    toolsInfoTabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tab = button.dataset.toolsInfoTab;
        if (!tab) return;
        setToolsInfoTab(tab);
        setToolsInfoHistoryOpened(true);
      });
    });
  }
  if (toolsInfoNotesFormEl) {
    toolsInfoNotesFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
      void saveToolsInfoNote();
    });
  }
  if (toolsInfoHistoryToggleButton) {
    toolsInfoHistoryToggleButton.addEventListener("click", () => {
      setToolsInfoHistoryOpened(!toolsInfoState.historyOpened);
    });
  }
  if (toolsInfoMoveButton) {
    toolsInfoMoveButton.addEventListener("click", async () => {
      const tool = toolsInfoState.tool;
      const selectionId = String(tool?.__selectionId ?? "").trim();
      if (!selectionId) return;
      toolsState.selectedIds.clear();
      toolsState.selectedIds.add(selectionId);
      closeToolsInfoModal();
      await openToolsMoveModal();
    });
  }
  if (toolsInfoDocumentsButton) {
    toolsInfoDocumentsButton.addEventListener("click", () => {
      void openToolDocumentsViewer();
    });
  }
  if (toolsInfoShareButton) {
    toolsInfoShareButton.addEventListener("click", async () => {
      const tool = toolsInfoState.tool;
      if (!tool) return;
      const shareText = buildToolsInfoShareText(tool);
      const photoShared = await shareToolsInfoPhoto({ tool, shareText });
      if (photoShared) {
        return;
      }
      const telegramShareUrl = new URL("https://t.me/share/url");
      telegramShareUrl.searchParams.set("text", shareText);
      if (window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(telegramShareUrl.href);
        return;
      }
      window.open(telegramShareUrl.href, "_blank", "noopener");
    });
  }
  if (toolsInfoCopyButton) {
    toolsInfoCopyButton.addEventListener("click", async () => {
      const tool = toolsInfoState.tool;
      if (!tool) return;
      const shareText = buildToolsInfoShareText(tool);
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareText);
          setToolsInfoSubtitleMessage("Информация скопирована.");
          return;
        }
      } catch (error) {
        console.warn("Не удалось скопировать информацию об инструменте.", error);
      }
      setToolsInfoSubtitleMessage("Не удалось скопировать.");
    });
  }
  if (toolsEditKitToggleButton) {
    toolsEditKitToggleButton.addEventListener("click", () => {
      const expanded =
        toolsEditKitToggleButton.getAttribute("aria-expanded") === "true";
      setToolsEditKitExpanded(!expanded);
      if (!expanded && !toolsEditKitListEl?.children.length) {
        createToolsEditKitRow();
      }
    });
  }
  if (toolsEditKitAddButton) {
    toolsEditKitAddButton.addEventListener("click", () => {
      if (toolsEditKitPanelEl?.classList.contains("is-hidden")) {
        setToolsEditKitExpanded(true);
      }
      createToolsEditKitRow();
    });
  }
  if (toolsEditKitListEl) {
    toolsEditKitListEl.addEventListener("click", (event) => {
      const button = event.target.closest("[data-tools-edit-kit-remove]");
      if (!button) return;
      const row = button.closest("[data-tools-edit-kit-row]");
      row?.remove();
      if (!toolsEditKitListEl.children.length) {
        setToolsEditKitExpanded(false);
      }
    });
  }
  if (toolsEditFormEl) {
    toolsEditFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
      saveToolsEditChanges();
    });
  }
  if (toolsEditDeleteButton) {
    toolsEditDeleteButton.addEventListener("click", handleToolsEditDelete);
  }
  if (toolsEditPhotoInput) {
    toolsEditPhotoInput.addEventListener("change", () => {
      const files = Array.from(toolsEditPhotoInput.files ?? []);
      if (files.length) {
        handleToolsEditPhotoUpload(files);
      }
    });
  }
  if (toolsEditPhotoCountEl) {
    toolsEditPhotoCountEl.addEventListener("click", () => {
      openToolsEditPhotoViewer().catch((error) => {
        console.warn("Не удалось открыть просмотр фото инструмента.", error);
      });
    });
  }
  if (toolsEditRemovePhotoButton) {
    toolsEditRemovePhotoButton.addEventListener("click", () => {
      const tool = toolsEditState.tool;
      if (!tool) return;
      if (!removePhotoModalEl) return;
      removePhotoModalEl.classList.remove("is-hidden");
      document.body.style.overflow = "hidden";
      removePhotoState.orgFolder =
        toolsEditState.orgFolder || context.orgFolderName || "";
      resetRemovePhotoSelection();
      openRemovePhotoTool(tool);
    });
  }

  if (writeOffBackdropEl) {
    writeOffBackdropEl.addEventListener("click", closeWriteOffModal);
  }
  if (writeOffCloseButton) {
    writeOffCloseButton.addEventListener("click", closeWriteOffModal);
  }
  if (writeOffCancelButton) {
    writeOffCancelButton.addEventListener("click", closeWriteOffModal);
  }
  writeOffModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeWriteOffModal();
    }
  });
  if (writeOffSearchInput) {
    writeOffSearchInput.addEventListener("input", (event) => {
      writeOffState.search = String(event.target.value ?? "").toLowerCase();
      applyWriteOffFilters();
    });
  }
  if (writeOffStatusOnlyButton) {
    writeOffStatusOnlyButton.addEventListener("click", toggleWriteOffStatusOnly);
  }
  if (writeOffFilterButton) {
    writeOffFilterButton.addEventListener("click", () => {
      const isOpen = writeOffFiltersPanelEl?.classList.contains("is-open");
      setWriteOffFiltersOpen(!isOpen);
    });
  }
  if (writeOffListEl) {
    writeOffListEl.addEventListener("click", (event) => {
      const item = event.target.closest("[data-writeoff-id]");
      if (!item) return;
      const toolId = item.dataset.writeoffId;
      if (!toolId) return;
      if (writeOffState.selectedIds.has(toolId)) {
        writeOffState.selectedIds.delete(toolId);
        item.classList.remove("is-selected");
      } else {
        writeOffState.selectedIds.add(toolId);
        item.classList.add("is-selected");
      }
      const checkEl = item.querySelector(".writeoff-item__check");
      if (checkEl) {
        checkEl.textContent = writeOffState.selectedIds.has(toolId) ? "✓" : "";
      }
      updateWriteOffSelectionUi();
    });
  }
  if (writeOffNextButton) {
    writeOffNextButton.addEventListener("click", openWriteOffConfirmModal);
  }

  if (writeOffConfirmBackdropEl) {
    writeOffConfirmBackdropEl.addEventListener("click", closeWriteOffConfirmModal);
  }
  if (writeOffConfirmCloseButton) {
    writeOffConfirmCloseButton.addEventListener("click", closeWriteOffConfirmModal);
  }
  if (writeOffConfirmCancelButton) {
    writeOffConfirmCancelButton.addEventListener("click", closeWriteOffConfirmModal);
  }
  writeOffConfirmModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeWriteOffConfirmModal();
    }
  });

  if (writeOffConfirmListEl) {
    writeOffConfirmListEl.addEventListener("click", (event) => {
      const item = event.target.closest("[data-writeoff-confirm-id]");
      if (!item) return;
      const toolId = item.dataset.writeoffConfirmId;
      if (!toolId) return;
      const isSelected = item.classList.toggle("is-selected");
      item.setAttribute("aria-pressed", isSelected ? "true" : "false");
      if (isSelected) {
        const tool = writeOffState.confirmTools.find(
          (entry, index) => getWriteOffConfirmToolId(entry, index) === toolId
        );
        const hasTool = writeOffState.selectedTools.some(
          (entry, index) => getWriteOffConfirmToolId(entry, index) === toolId
        );
        if (tool && !hasTool) {
          writeOffState.selectedTools.push(tool);
        }
      } else {
        writeOffState.selectedTools = writeOffState.selectedTools.filter(
          (tool, index) => getWriteOffConfirmToolId(tool, index) !== toolId
        );
      }
      updateWriteOffConfirmSelectionUi();
    });
  }
  if (writeOffConfirmFormEl) {
    writeOffConfirmFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
      applyWriteOff();
    });
  }

  if (toolsInfoCancelMoveButton) {
    toolsInfoCancelMoveButton.addEventListener("click", () => {
      if (toolsState.mode === "search") return;
      const tool = toolsInfoState.tool;
      if (!tool) return;
      void openToolsCancelMoveModal(tool);
    });
  }

  if (toolsCancelMoveBackdropEl) {
    toolsCancelMoveBackdropEl.addEventListener("click", closeToolsCancelMoveModal);
  }
  if (toolsCancelMoveCloseButton) {
    toolsCancelMoveCloseButton.addEventListener("click", closeToolsCancelMoveModal);
  }
  if (toolsCancelMoveCancelButton) {
    toolsCancelMoveCancelButton.addEventListener("click", closeToolsCancelMoveModal);
  }
  if (toolsCancelMoveConfirmButton) {
    toolsCancelMoveConfirmButton.addEventListener("click", applyToolsMoveCancel);
  }
  toolsCancelMoveModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeToolsCancelMoveModal();
    }
  });

  if (toolsWriteOffPendingConfirmBackdropEl) {
    toolsWriteOffPendingConfirmBackdropEl.addEventListener(
      "click",
      closeToolsWriteOffPendingConfirmModal
    );
  }
  if (toolsWriteOffPendingConfirmCloseButton) {
    toolsWriteOffPendingConfirmCloseButton.addEventListener(
      "click",
      closeToolsWriteOffPendingConfirmModal
    );
  }
  if (toolsWriteOffPendingConfirmCancelButton) {
    toolsWriteOffPendingConfirmCancelButton.addEventListener(
      "click",
      closeToolsWriteOffPendingConfirmModal
    );
  }
  if (toolsWriteOffPendingHistoryTabButtons.length) {
    toolsWriteOffPendingHistoryTabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tab = button.dataset.toolsWriteoffPendingHistoryTab;
        if (!tab) return;
        setToolsWriteOffPendingHistoryTab(tab);
      });
    });
  }
  if (toolsWriteOffPendingConfirmSubmitButton) {
    toolsWriteOffPendingConfirmSubmitButton.addEventListener("click", () => {
      const tool = toolsWriteOffPendingConfirmState.tool;
      if (!tool) {
        setToolsWriteOffPendingConfirmMessage(
          "Не удалось определить инструмент.",
          "error"
        );
        return;
      }
      if (isToolOnWriteOffPendingStatus(tool)) {
        void markToolAsWorkingFromPending(tool);
        return;
      }
      void markToolAsWriteOffPendingFromModal(tool);
    });
  }
  if (toolsWriteOffPendingConfirmWriteOffButton) {
    toolsWriteOffPendingConfirmWriteOffButton.addEventListener("click", () => {
      const tool = toolsWriteOffPendingConfirmState.tool;
      if (!tool) {
        setToolsWriteOffPendingConfirmMessage(
          "Не удалось определить инструмент.",
          "error"
        );
        return;
      }
      closeToolsWriteOffPendingConfirmModal();
      openWriteOffConfirmForSingleTool(tool);
    });
  }
  toolsWriteOffPendingConfirmModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeToolsWriteOffPendingConfirmModal();
    }
  });

  if (pendingMovesBackdropEl) {
    pendingMovesBackdropEl.addEventListener("click", closePendingMovesModal);
  }
  if (pendingMovesCloseButton) {
    pendingMovesCloseButton.addEventListener("click", closePendingMovesModal);
  }
  pendingMovesModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePendingMovesModal();
    }
  });
  pendingPhotoViewerBackdropEl?.addEventListener("click", closePendingMovePhotoViewer);
  pendingPhotoViewerCloseButton?.addEventListener("click", closePendingMovePhotoViewer);
  pendingPhotoViewerImageEl?.addEventListener("touchstart", (event) => {
    if (pendingMovePhotoViewerState.scale > 1) return;
    const touch = event.touches?.[0];
    pendingMovePhotoViewerState.touchStartX = touch?.clientX ?? null;
  });
  pendingPhotoViewerImageEl?.addEventListener("touchend", (event) => {
    if (pendingMovePhotoViewerState.scale > 1) return;
    if (pendingMovePhotoViewerState.touchStartX === null) return;
    const touch = event.changedTouches?.[0];
    const endX = touch?.clientX ?? null;
    if (endX === null) return;
    const delta = endX - pendingMovePhotoViewerState.touchStartX;
    pendingMovePhotoViewerState.touchStartX = null;
    if (Math.abs(delta) < 30) return;
    shiftPendingMovePhotoViewer(delta > 0 ? -1 : 1);
  });
  pendingPhotoViewerImageWrapEl?.addEventListener("wheel", (event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.2 : 0.2;
    setPendingPhotoViewerScale(pendingMovePhotoViewerState.scale + delta);
  });
  pendingPhotoViewerImageWrapEl?.addEventListener("pointerdown", (event) => {
    pendingPhotoViewerImageWrapEl.setPointerCapture(event.pointerId);
    pendingMovePhotoViewerState.pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pendingMovePhotoViewerState.pointers.size === 2) {
      const [first, second] = Array.from(pendingMovePhotoViewerState.pointers.values());
      pendingMovePhotoViewerState.basePinchDistance = Math.hypot(
        first.x - second.x,
        first.y - second.y
      );
    }
  });
  pendingPhotoViewerImageWrapEl?.addEventListener("pointermove", (event) => {
    if (!pendingMovePhotoViewerState.pointers.has(event.pointerId)) return;
    pendingMovePhotoViewerState.pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pendingMovePhotoViewerState.pointers.size !== 2) return;
    const [first, second] = Array.from(pendingMovePhotoViewerState.pointers.values());
    const distance = Math.hypot(first.x - second.x, first.y - second.y);
    if (!pendingMovePhotoViewerState.basePinchDistance) {
      pendingMovePhotoViewerState.basePinchDistance = distance;
      return;
    }
    const zoomFactor = distance / pendingMovePhotoViewerState.basePinchDistance;
    setPendingPhotoViewerScale(pendingMovePhotoViewerState.scale * zoomFactor);
    pendingMovePhotoViewerState.basePinchDistance = distance;
  });
  pendingPhotoViewerImageWrapEl?.addEventListener("pointerup", (event) => {
    pendingMovePhotoViewerState.pointers.delete(event.pointerId);
    if (pendingMovePhotoViewerState.pointers.size < 2) {
      pendingMovePhotoViewerState.basePinchDistance = null;
    }
  });
  pendingPhotoViewerImageWrapEl?.addEventListener("pointercancel", (event) => {
    pendingMovePhotoViewerState.pointers.delete(event.pointerId);
    if (pendingMovePhotoViewerState.pointers.size < 2) {
      pendingMovePhotoViewerState.basePinchDistance = null;
    }
  });
  pendingMovePhotoViewerEl?.addEventListener("keydown", (event) => {
    if (pendingMovePhotoViewerEl.classList.contains("is-hidden")) return;
    if (event.key === "Escape") {
      closePendingMovePhotoViewer();
      return;
    }
    if (event.key === "ArrowLeft") {
      shiftPendingMovePhotoViewer(-1);
      return;
    }
    if (event.key === "ArrowRight") {
      shiftPendingMovePhotoViewer(1);
    }
  });
  if (energyPendingWrapperEl) {
    energyPendingWrapperEl.addEventListener("click", () => {
      if (energyPendingWrapperEl.classList.contains("is-hidden")) return;
      openPendingMovesModal();
    });
  }
  if (pendingMovesListEl) {
    pendingMovesListEl.addEventListener("click", (event) => {
      const photoButton = event.target.closest("[data-pending-photo-open]");
      if (photoButton) {
        const moveIndex = Number.parseInt(
          photoButton.dataset.pendingPhotoMoveIndex ?? "",
          10
        );
        if (Number.isFinite(moveIndex)) {
          const item = pendingMovesState.pendingItems.find(
            (entry) => entry.moveIndex === moveIndex
          );
          if (item?.tool) {
            const moveNumber =
              String(item.move?.["Номер"] ?? "").trim() ||
              String(item.move?.["Бух.номер"] ?? "").trim();
            const toolTitle = String(item.tool?.["Наименование"] ?? "").trim();
            void openPendingMovePhotoViewer({
              tool: item.tool,
              fallbackNumber: moveNumber,
              title: toolTitle,
            });
          }
        }
        return;
      }
      const kitButton = event.target.closest("[data-pending-kit-open]");
      if (kitButton) {
        const moveIndex = Number.parseInt(kitButton.dataset.moveIndex ?? "", 10);
        if (Number.isFinite(moveIndex)) {
          const item = pendingMovesState.pendingItems.find(
            (entry) => entry.moveIndex === moveIndex
          );
          if (item?.tool) {
            openToolsKitPreviewModal(item.tool);
          }
        }
        return;
      }
      const actionButton = event.target.closest("[data-pending-move-action]");
      if (!actionButton) return;
      const moveIndex = Number.parseInt(
        actionButton.dataset.moveIndex ?? "",
        10
      );
      if (!Number.isFinite(moveIndex)) return;
      const action = actionButton.dataset.pendingMoveAction;
      if (action === "accept") {
        applyPendingMovesDecision({
          moveIndexes: [moveIndex],
          decision: "Принял",
        });
      } else if (action === "decline") {
        applyPendingMovesDecision({
          moveIndexes: [moveIndex],
          decision: "Не принял",
        });
      }
    });
    pendingMovesListEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const photoButton = event.target.closest("[data-pending-photo-open]");
      if (!photoButton) return;
      event.preventDefault();
      photoButton.click();
    });
  }
  awaitingReplyBackdropEl?.addEventListener("click", closeAwaitingReplyModal);
  awaitingReplyCloseButton?.addEventListener("click", closeAwaitingReplyModal);
  awaitingReplyModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAwaitingReplyModal();
    }
  });
  awaitingReplyListEl?.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-awaiting-reply-action]");
    if (!actionButton) return;
    const moveIndex = Number.parseInt(actionButton.dataset.moveIndex ?? "", 10);
    if (!Number.isFinite(moveIndex)) return;
    openAwaitingReplyCancelConfirmModal(moveIndex);
  });
  awaitingReplyCancelConfirmBackdropEl?.addEventListener(
    "click",
    closeAwaitingReplyCancelConfirmModal
  );
  awaitingReplyCancelConfirmCloseButton?.addEventListener(
    "click",
    closeAwaitingReplyCancelConfirmModal
  );
  awaitingReplyCancelConfirmCancelButton?.addEventListener(
    "click",
    closeAwaitingReplyCancelConfirmModal
  );
  awaitingReplyCancelConfirmSubmitButton?.addEventListener("click", () => {
    void confirmAwaitingReplyCancel();
  });
  awaitingReplyCancelConfirmModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAwaitingReplyCancelConfirmModal();
    }
  });
  if (pendingMovesAcceptAllButton) {
    pendingMovesAcceptAllButton.addEventListener("click", () => {
      openPendingMovesBulkConfirmModal("accept");
    });
  }
  if (pendingMovesDeclineAllButton) {
    pendingMovesDeclineAllButton.addEventListener("click", () => {
      openPendingMovesBulkConfirmModal("decline");
    });
  }
  if (pendingMovesBulkConfirmBackdropEl) {
    pendingMovesBulkConfirmBackdropEl.addEventListener("click", () => {
      closePendingMovesBulkConfirmModal();
    });
  }
  if (pendingMovesBulkConfirmCancelButton) {
    pendingMovesBulkConfirmCancelButton.addEventListener("click", () => {
      closePendingMovesBulkConfirmModal();
    });
  }
  if (pendingMovesBulkConfirmCloseButton) {
    pendingMovesBulkConfirmCloseButton.addEventListener("click", () => {
      closePendingMovesBulkConfirmModal();
    });
  }
  if (pendingMovesBulkConfirmSubmitButton) {
    pendingMovesBulkConfirmSubmitButton.addEventListener("click", () => {
      applyPendingMovesBulkAction();
    });
  }
  if (pendingMovesBulkConfirmReasonEl) {
    pendingMovesBulkConfirmReasonEl.addEventListener("input", () => {
      pendingMovesBulkConfirmReasonEl.classList.remove("is-invalid");
    });
  }
  pendingMovesBulkConfirmModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePendingMovesBulkConfirmModal();
    }
  });
  if (pendingMovesDeclineBackdropEl) {
    pendingMovesDeclineBackdropEl.addEventListener("click", () =>
      closePendingMovesDeclineModal(true)
    );
  }
  if (pendingMovesDeclineCloseButton) {
    pendingMovesDeclineCloseButton.addEventListener("click", () =>
      closePendingMovesDeclineModal(true)
    );
  }
  if (pendingMovesDeclineCancelButton) {
    pendingMovesDeclineCancelButton.addEventListener("click", () =>
      closePendingMovesDeclineModal(true)
    );
  }
  if (pendingMovesDeclineFormEl) {
    pendingMovesDeclineFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
      const reason = String(pendingMovesDeclineReasonEl?.value ?? "").trim();
      if (!reason) {
        setPendingMovesDeclineMessage("Укажите причину отказа.", "error");
        pendingMovesDeclineReasonEl?.focus();
        return;
      }
      const photoFile = pendingMovesDeclinePhotoInput?.files?.[0] ?? null;
      if (photoFile && photoFile.type && !photoFile.type.startsWith("image/")) {
        setPendingMovesDeclineMessage("Добавьте фото в формате изображения.", "error");
        return;
      }
      const resolver = pendingMovesDeclineResolver;
      pendingMovesDeclineResolver = null;
      closePendingMovesDeclineModal(false);
      if (resolver) {
        resolver({ reason, photoFile });
      }
    });
  }

  if (infoPendingListEl) {
    infoPendingListEl.addEventListener("click", (event) => {
      const photoButton = event.target.closest("[data-info-pending-photo-open]");
      if (!photoButton) return;
      const moveIndex = Number.parseInt(
        photoButton.dataset.infoPendingMoveIndex ?? "",
        10
      );
      if (!Number.isFinite(moveIndex)) return;
      const item = infoPendingState.filteredItems.find(
        (entry) => entry.moveIndex === moveIndex
      );
      if (!item?.tool) return;
      const moveNumber =
        String(item.move?.["Номер"] ?? "").trim() ||
        String(item.move?.["Бух.номер"] ?? "").trim();
      const toolTitle = String(item.tool?.["Наименование"] ?? "").trim();
      void openPendingMovePhotoViewer({
        tool: item.tool,
        fallbackNumber: moveNumber,
        title: toolTitle,
      });
    });
    infoPendingListEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const photoButton = event.target.closest("[data-info-pending-photo-open]");
      if (!photoButton) return;
      event.preventDefault();
      photoButton.click();
    });
  }

  if (infoPendingBackdropEl) {
    infoPendingBackdropEl.addEventListener("click", closeInfoPendingModal);
  }
  if (infoPendingCloseButton) {
    infoPendingCloseButton.addEventListener("click", closeInfoPendingModal);
  }
  infoPendingModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeInfoPendingModal();
    }
  });
  infoPendingSearchEl?.addEventListener("input", handleInfoPendingFiltersChanged);
  infoPendingSortEl?.addEventListener("change", handleInfoPendingFiltersChanged);
  infoPendingSortTriggerEl?.addEventListener("click", (event) => {
    event.stopPropagation();
    const shouldOpen = !infoPendingState.isSortOpen;
    setInfoPendingSortDropdownOpen(shouldOpen);
    if (shouldOpen) {
      setInfoPendingPersonDropdownOpen("", false);
      setInfoPendingFiltersOpen(false);
    }
  });
  infoPendingSortOptionsEl?.addEventListener("change", (event) => {
    const target = event.target instanceof HTMLInputElement ? event.target : null;
    if (!target?.matches('[data-info-pending-sort-option]')) return;
    if (infoPendingSortEl instanceof HTMLInputElement) {
      infoPendingSortEl.value = String(target.value ?? "old").trim() || "old";
    }
    setInfoPendingSortDropdownOpen(false);
    handleInfoPendingFiltersChanged();
  });
  infoPendingSortModeButtonEls.forEach((buttonEl) => {
    buttonEl.addEventListener("click", () => {
      const mode = String(buttonEl.dataset.infoPendingSortMode ?? "").trim();
      if (!infoPendingSortModes.some((option) => option.value === mode)) return;
      if (infoPendingSortEl instanceof HTMLInputElement) {
        infoPendingSortEl.value = mode;
      }
      setInfoPendingSortDropdownOpen(false);
      handleInfoPendingFiltersChanged();
    });
  });
  infoPendingFilterReceiverEl?.addEventListener("change", handleInfoPendingFiltersChanged);
  infoPendingFilterSenderEl?.addEventListener("change", handleInfoPendingFiltersChanged);
  infoPendingPersonDropdownEls.forEach((dropdownEl) => {
    const key = String(dropdownEl.dataset.infoPendingPersonDropdown ?? "").trim();
    if (!key) return;
    const triggerEl = dropdownEl.querySelector("[data-info-pending-person-trigger]");
    const clearButtonEl = dropdownEl.querySelector("[data-info-pending-person-clear]");
    const hiddenInputEl =
      key === "receiver" ? infoPendingFilterReceiverEl : infoPendingFilterSenderEl;

    triggerEl?.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = dropdownEl.classList.contains("is-open");
      setInfoPendingPersonDropdownOpen(key, !isOpen);
    });

    clearButtonEl?.addEventListener("click", (event) => {
      event.stopPropagation();
      if (hiddenInputEl) hiddenInputEl.value = "";
      setInfoPendingPersonDropdownOpen("", false);
      handleInfoPendingFiltersChanged();
    });

    const optionsEl = dropdownEl.querySelector("[data-info-pending-person-options]");
    optionsEl?.addEventListener("change", (event) => {
      const target = event.target instanceof HTMLInputElement ? event.target : null;
      if (!target?.matches('[data-info-pending-person-option]')) return;
      if (hiddenInputEl) hiddenInputEl.value = String(target.value ?? "").trim();
      setInfoPendingPersonDropdownOpen("", false);
      handleInfoPendingFiltersChanged();
    });
  });
  infoPendingFilterDateFromEl?.addEventListener(
    "change",
    handleInfoPendingFiltersChanged
  );
  infoPendingFilterDateToEl?.addEventListener(
    "change",
    handleInfoPendingFiltersChanged
  );
  infoPendingFiltersToggleEl?.addEventListener("click", (event) => {
    event.stopPropagation();
    setInfoPendingFiltersOpen(!infoPendingState.isFiltersOpen);
  });
  infoPendingFiltersPanelEl?.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  infoPendingDateTriggerEl?.addEventListener("click", (event) => {
    event.stopPropagation();
    setInfoPendingDatePickerOpen(!infoPendingState.isDatePickerOpen);
  });
  infoPendingCalendarPrevEl?.addEventListener("click", () => {
    infoPendingState.visibleMonthDate = new Date(
      infoPendingState.visibleMonthDate.getFullYear(),
      infoPendingState.visibleMonthDate.getMonth() - 1,
      1
    );
    renderInfoPendingCalendar();
  });
  infoPendingCalendarNextEl?.addEventListener("click", () => {
    infoPendingState.visibleMonthDate = new Date(
      infoPendingState.visibleMonthDate.getFullYear(),
      infoPendingState.visibleMonthDate.getMonth() + 1,
      1
    );
    renderInfoPendingCalendar();
  });
  infoPendingCalendarDaysEl?.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const button = target?.closest("button[data-date]");
    const isoDate = String(button?.dataset?.date ?? "").trim();
    if (!isoDate) return;
    handleInfoPendingDateSelect(isoDate);
  });

  if (infoMovesHistoryBackdropEl) {
    infoMovesHistoryBackdropEl.addEventListener("click", closeInfoMovesHistoryModal);
  }
  if (infoMovesHistoryCloseButton) {
    infoMovesHistoryCloseButton.addEventListener("click", closeInfoMovesHistoryModal);
  }
  infoMovesHistoryModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeInfoMovesHistoryModal();
    }
  });
  infoMovesHistorySearchEl?.addEventListener("input", (event) => {
    infoMovesHistoryState.filters.search = String(event.target.value ?? "");
    renderInfoMovesHistory();
  });
  infoMovesHistorySortTriggerEl?.addEventListener("click", (event) => {
    event.stopPropagation();
    setInfoMovesHistoryFiltersOpen(false);
    setInfoMovesHistorySortDropdownOpen(!infoMovesHistoryState.isSortOpen);
  });
  infoMovesHistorySortOptionsEl?.addEventListener("change", (event) => {
    const target = event.target instanceof HTMLInputElement ? event.target : null;
    if (!target) return;
    infoMovesHistoryState.filters.sort = String(target.value || "date-desc");
    if (infoMovesHistorySortEl instanceof HTMLSelectElement) infoMovesHistorySortEl.value = infoMovesHistoryState.filters.sort;
    setInfoMovesHistorySortDropdownOpen(false);
    renderInfoMovesHistoryControls();
    renderInfoMovesHistory();
  });
  infoMovesHistoryGroupTriggerEl?.addEventListener("click", (event) => {
    event.stopPropagation();
    setInfoMovesHistorySortDropdownOpen(false);
    setInfoMovesHistoryFiltersOpen(false);
    setInfoMovesHistoryGroupDropdownOpen(!infoMovesHistoryState.isGroupOpen);
  });
  infoMovesHistoryGroupOptionsEl?.addEventListener("change", (event) => {
    const target = event.target instanceof HTMLInputElement ? event.target : null;
    if (!target) return;
    infoMovesHistoryState.filters.group = String(target.value || "none");
    if (infoMovesHistoryGroupEl instanceof HTMLSelectElement) infoMovesHistoryGroupEl.value = infoMovesHistoryState.filters.group;
    setInfoMovesHistoryGroupDropdownOpen(false);
    renderInfoMovesHistoryControls();
    renderInfoMovesHistory();
  });
  infoMovesHistoryDateTriggerEl?.addEventListener("click", (event) => {
    event.stopPropagation();
    setInfoMovesHistoryDatePickerOpen(!infoMovesHistoryState.isDatePickerOpen);
  });
  infoMovesHistoryFiltersToggleEl?.addEventListener("click", (event) => {
    event.stopPropagation();
    setInfoMovesHistorySortDropdownOpen(false);
    setInfoMovesHistoryGroupDropdownOpen(false);
    setInfoMovesHistoryFiltersOpen(!infoMovesHistoryState.isFiltersOpen);
  });
  infoMovesHistoryFiltersPanelEl?.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  [
    [infoMovesHistoryViewEl, "view"],
    [infoMovesHistoryGroupEl, "group"],
    [infoMovesHistorySortEl, "sort"],
    [infoMovesHistoryAnswerEl, "answer"],
    [infoMovesHistoryDateFromEl, "dateFrom"],
    [infoMovesHistoryDateToEl, "dateTo"],
  ].forEach(([element, key]) => {
    element?.addEventListener("change", (event) => {
      infoMovesHistoryState.filters[key] = String(event.target.value ?? "");
      renderInfoMovesHistoryControls();
      renderInfoMovesHistory();
    });
  });
  infoMovesHistoryResetEl?.addEventListener("click", () => {
    infoMovesHistoryState.filters = { search: "", view: "number", group: "none", sort: "date-desc", answer: "all", dateFrom: "", dateTo: "" };
    if (infoMovesHistorySearchEl) infoMovesHistorySearchEl.value = "";
    if (infoMovesHistoryViewEl) infoMovesHistoryViewEl.value = "number";
    if (infoMovesHistoryGroupEl) infoMovesHistoryGroupEl.value = "none";
    if (infoMovesHistorySortEl) infoMovesHistorySortEl.value = "date-desc";
    if (infoMovesHistoryAnswerEl) infoMovesHistoryAnswerEl.value = "all";
    if (infoMovesHistoryDateFromEl) infoMovesHistoryDateFromEl.value = "";
    if (infoMovesHistoryDateToEl) infoMovesHistoryDateToEl.value = "";
    setInfoMovesHistorySortDropdownOpen(false);
    setInfoMovesHistoryGroupDropdownOpen(false);
    setInfoMovesHistoryFiltersOpen(false);
    setInfoMovesHistoryDatePickerOpen(false);
    renderInfoMovesHistoryControls();
    renderInfoMovesHistory();
  });


  if (toolsSearchInput) {
    toolsSearchInput.addEventListener("input", (event) => {
      toolsState.search = String(event.target.value ?? "").toLowerCase();
      applyToolsFilters();
    });
  }

  if (toolsStatusStandaloneEl) {
    toolsStatusStandaloneEl.addEventListener("change", (event) => {
      toolsState.statusStandalone = String(event.target.value ?? "").trim();
      applyToolsFilters();
    });
  }

  const setToolsFiltersOpen = (isOpen) => {
    if (isOpen) {
      Object.keys(toolsState.filters).forEach((key) => {
        const currentValues = Array.isArray(toolsState.filters[key])
          ? toolsState.filters[key]
          : [];
        if (currentValues.length === 0) {
          selectAllToolsFilterValues(key);
        }
      });
      applyToolsFilters();
    }
    if (toolsFiltersPanelEl) {
      toolsFiltersPanelEl.classList.toggle("is-open", isOpen);
    }
    if (toolsFilterActionsEl) {
      toolsFilterActionsEl.classList.toggle("is-open", isOpen);
    }
    if (toolsFiltersToggleEl) {
      toolsFiltersToggleEl.setAttribute("aria-expanded", String(isOpen));
    }
    updateToolsFiltersUi();
  };

  const setToolsGroupingMenuOpen = (isOpen) => {
    if (!toolsGroupingMenuEl) return;
    toolsGroupingMenuEl.classList.toggle("is-hidden", !isOpen);
    toolsGroupingDropdownEl?.classList.toggle("is-open", isOpen);
    toolsGroupingToggleEl?.setAttribute("aria-expanded", String(isOpen));
  };

  const syncToolsGroupingUi = () => {
    toolsGroupingOptionEls.forEach((optionEl) => {
      const isActive = optionEl.dataset.toolsGroupingOption === toolsState.grouping;
      optionEl.classList.toggle("is-active", isActive);
    });
  };

  if (toolsSortToggleEl) {
    toolsSortToggleEl.addEventListener("click", () => {
      toolsState.searchSortDirection =
        toolsState.searchSortDirection === "desc" ? "asc" : "desc";
      updateToolsSortToggleUi();
      applyToolsFilters();
    });
  }

  if (toolsBrokenOnlyToggleEl) {
    toolsBrokenOnlyToggleEl.addEventListener("click", () => {
      if (!isRepairLikeMode()) return;
      toolsState.repairBrokenOnly = !toolsState.repairBrokenOnly;
      if (toolsState.repairBrokenOnly) {
        toolsState.repairInRepairOnly = false;
      }
      updateToolsBrokenOnlyToggleUi();
      updateToolsInRepairOnlyToggleUi();
      applyToolsFilters();
    });
  }

  if (toolsInRepairOnlyToggleEl) {
    toolsInRepairOnlyToggleEl.addEventListener("click", () => {
      if (!isRepairLikeMode()) return;
      toolsState.repairInRepairOnly = !toolsState.repairInRepairOnly;
      if (toolsState.repairInRepairOnly) {
        toolsState.repairBrokenOnly = false;
      }
      updateToolsBrokenOnlyToggleUi();
      updateToolsInRepairOnlyToggleUi();
      applyToolsFilters();
    });
  }

  if (toolsFiltersToggleEl) {
    toolsFiltersToggleEl.addEventListener("click", () => {
      const isOpen = toolsFiltersPanelEl?.classList.contains("is-open");
      setToolsFiltersOpen(!isOpen);
    });
  }

  if (toolsGroupingToggleEl) {
    toolsGroupingToggleEl.addEventListener("click", () => {
      const isOpen = !toolsGroupingMenuEl?.classList.contains("is-hidden");
      setToolsGroupingMenuOpen(!isOpen);
    });
  }

  toolsGroupingOptionEls.forEach((optionEl) => {
    optionEl.addEventListener("click", () => {
      const grouping = String(optionEl.dataset.toolsGroupingOption ?? "").trim();
      if (!objectTrackingEnabled && grouping === "object") {
        setToolsGroupingMenuOpen(false);
        return;
      }
      if (!grouping || toolsState.grouping === grouping) {
        setToolsGroupingMenuOpen(false);
        return;
      }
      toolsState.grouping = grouping;
      syncToolsGroupingUi();
      setToolsGroupingMenuOpen(false);
      renderToolsList();
    });
  });
  syncToolsGroupingUi();

  const toolsFiltersResetButtonEls = contentEl.querySelectorAll(
    "[data-tools-filters-reset]"
  );
  toolsFiltersResetButtonEls.forEach((toolsFiltersResetButtonEl) => {
    toolsFiltersResetButtonEl.addEventListener("click", () => {
      resetToolsFilters();
    });
  });

  if (typeof window !== "undefined" && toolsFiltersPanelEl) {
    const mediaQuery = window.matchMedia("(max-width: 520px)");
    const syncFiltersVisibility = () => {
      setToolsFiltersOpen(!mediaQuery.matches);
    };
    syncFiltersVisibility();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", syncFiltersVisibility);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(syncFiltersVisibility);
    }
  }

  const resetToolsFilterDropdownMenuPosition = (menuEl) => {
    if (!menuEl) return;
    menuEl.style.top = "";
    menuEl.style.left = "";
    menuEl.style.right = "";
    menuEl.style.width = "";
    menuEl.style.maxWidth = "";
    menuEl.style.transform = "";
  };

  const closeAllToolsFilterDropdowns = () => {
    toolsFilterEls.forEach((containerEl) => {
      const menuEl = containerEl.querySelector("[data-tools-filter-menu]");
      menuEl?.classList.add("is-hidden");
      resetToolsFilterDropdownMenuPosition(menuEl);
      containerEl.classList.remove("is-open");
    });
  };

  const syncToolsFilterDropdownMenuWidth = (containerEl, menuEl) => {
    if (!containerEl || !menuEl) return;
    const isWriteOffModalFilter = Boolean(containerEl.closest("[data-writeoff-modal]"));
    if (isWriteOffModalFilter && typeof window !== "undefined") {
      const viewportPadding = 10;
      const dropdownGap = 6;
      const visualViewport = window.visualViewport;
      const viewportWidth =
        visualViewport?.width ?? window.innerWidth ?? document.documentElement.clientWidth;
      const viewportHeight =
        visualViewport?.height ?? window.innerHeight ?? document.documentElement.clientHeight;
      const viewportLeft = visualViewport?.offsetLeft ?? 0;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const triggerRect =
        containerEl.querySelector("[data-tools-filter-trigger]")?.getBoundingClientRect() ??
        containerEl.getBoundingClientRect();
      const viewportMaxWidth = Math.max(220, Math.floor(viewportWidth - viewportPadding * 2));
      const menuWidth = Math.min(
        viewportMaxWidth,
        Math.max(220, Math.ceil(triggerRect.width))
      );
      const triggerCenter = triggerRect.left + triggerRect.width / 2;
      const minLeft = viewportLeft + viewportPadding;
      const maxLeft = viewportLeft + viewportWidth - viewportPadding - menuWidth;
      const menuLeft = Math.min(Math.max(minLeft, Math.round(triggerCenter - menuWidth / 2)), maxLeft);
      const menuHeight = menuEl.offsetHeight || 0;
      const preferredTop = Math.round(triggerRect.bottom + dropdownGap);
      const maxTop = Math.max(
        viewportTop + viewportPadding,
        Math.round(viewportTop + viewportHeight - viewportPadding - menuHeight)
      );
      menuEl.style.top = `${Math.min(Math.max(viewportTop + viewportPadding, preferredTop), maxTop)}px`;
      menuEl.style.left = `${menuLeft}px`;
      menuEl.style.right = "auto";
      menuEl.style.width = `${menuWidth}px`;
      menuEl.style.maxWidth = `${menuWidth}px`;
      menuEl.style.transform = "none";
      return;
    }
    menuEl.style.top = "";
    menuEl.style.maxWidth = "";
    const isSearchMode = toolsModalEl?.classList.contains("tools-modal--searching");
    if (isSearchMode && typeof window !== "undefined") {
      const viewportPadding = 12;
      const viewportWidth =
        window.visualViewport?.width ?? window.innerWidth ?? document.documentElement.clientWidth;
      const containerRect = containerEl.getBoundingClientRect();
      const width = Math.max(220, Math.floor(viewportWidth - viewportPadding * 2));
      const offsetLeft = viewportPadding - containerRect.left;
      menuEl.style.left = `${offsetLeft}px`;
      menuEl.style.right = "auto";
      menuEl.style.width = `${width}px`;
      menuEl.style.transform = "none";
      return;
    }
    const shouldStretchToPanel =
      toolsModalEl?.classList.contains("tools-modal--my-tools") &&
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches;
    if (!shouldStretchToPanel || !toolsFiltersPanelEl) {
      menuEl.style.left = "";
      menuEl.style.right = "";
      menuEl.style.width = "";
      menuEl.style.transform = "";
      return;
    }
    const panelRect = toolsFiltersPanelEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    const offsetLeft = panelRect.left - containerRect.left;
    menuEl.style.left = `${offsetLeft}px`;
    menuEl.style.right = "auto";
    menuEl.style.width = `${panelRect.width}px`;
    menuEl.style.transform = "";
  };

  toolsFilterEls.forEach((containerEl) => {
    const key = containerEl.dataset.toolsFilter;
    const triggerEl = containerEl.querySelector("[data-tools-filter-trigger]");
    const menuEl = containerEl.querySelector("[data-tools-filter-menu]");
    const clearEl = containerEl.querySelector("[data-tools-filter-clear]");
    if (triggerEl && menuEl) {
      triggerEl.addEventListener("click", () => {
        const isOpen = !menuEl.classList.contains("is-hidden");
        closeAllToolsFilterDropdowns();
        menuEl.classList.toggle("is-hidden", isOpen);
        containerEl.classList.toggle("is-open", !isOpen);
        if (!isOpen) {
          syncToolsFilterDropdownMenuWidth(containerEl, menuEl);
        }
      });
    }
    if (clearEl && key) {
      clearEl.addEventListener("click", () => {
        const allValues = getToolsFilterAllValues(containerEl);
        const selectedValues = Array.isArray(toolsState.filters[key])
          ? toolsState.filters[key]
          : [];
        const shouldReset = allValues.length > 0 && selectedValues.length === allValues.length;
        const nextValues = shouldReset ? [] : allValues;
        toolsState.filters[key] = nextValues;
        syncToolsFilterValue(key, nextValues);
        applyToolsFilters();
      });
    }

    containerEl.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;
      if (!key) return;
      const selectedValues = Array.from(
        containerEl.querySelectorAll('input[type="checkbox"][data-tools-filter-checkbox]:checked')
      )
        .map((inputEl) => String(inputEl.value ?? "").trim())
        .filter(Boolean);
      toolsState.filters[key] = selectedValues;
      if (key === "photo" && selectedValues.length > 1) {
        toolsState.filters[key] = selectedValues;
      }
      syncToolsFilterValue(key, toolsState.filters[key]);
      applyToolsFilters();
    });
  });

  if (typeof document !== "undefined") {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(".tools-filter-dropdown") ||
        target.closest("[data-tools-grouping-dropdown]") ||
        target.closest("[data-breakdowns-grouping-dropdown]")
      ) {
        return;
      }
      closeAllToolsFilterDropdowns();
      setToolsGroupingMenuOpen(false);
      setBreakdownsGroupingMenuOpen(false);
    });
  }

  if (typeof window !== "undefined") {
    const refreshOpenToolsFilterMenus = () => {
      toolsFilterEls.forEach((containerEl) => {
        if (!containerEl.classList.contains("is-open")) return;
        const menuEl = containerEl.querySelector("[data-tools-filter-menu]");
        syncToolsFilterDropdownMenuWidth(containerEl, menuEl);
      });
    };
    window.addEventListener("resize", refreshOpenToolsFilterMenus);
    window.visualViewport?.addEventListener("resize", refreshOpenToolsFilterMenus);
    window.visualViewport?.addEventListener("scroll", refreshOpenToolsFilterMenus);
    toolsFiltersPanelEl?.addEventListener("scroll", refreshOpenToolsFilterMenus, {
      passive: true,
    });
    writeOffFiltersPanelEl?.addEventListener("scroll", refreshOpenToolsFilterMenus, {
      passive: true,
    });
    writeOffModalEl?.addEventListener("scroll", refreshOpenToolsFilterMenus, {
      passive: true,
    });
  }

  toolsViewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button === toolsSearchMapViewButtonEl) {
        return;
      }
      const view = button.dataset.toolsView;
      if (!view) return;
      toolsState.view = normalizeToolsView(view);
      if (toolsState.view !== "map") {
        toolsState.previousView = toolsState.view;
      }
      syncToolsViewButtons();
      renderToolsList();
      saveToolsViewPreference(view);
    });
  });

  if (toolsSearchMapViewButtonEl) {
    toolsSearchMapViewButtonEl.addEventListener("click", () => {
      if (!canUseToolsMapView()) return;
      if (toolsState.view === "map") {
        toolsState.view = normalizeToolsView(toolsState.previousView);
      } else {
        toolsState.view = "map";
      }
      syncToolsViewButtons();
      renderToolsList();
    });
  }

  if (toolsSearchMapCanvasEl) {
    toolsSearchMapCanvasEl.addEventListener("click", () => {
      void awakenToolsSearchMap();
    });
    toolsSearchMapCanvasEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      void awakenToolsSearchMap();
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("click", (event) => {
      const trigger = event.target?.closest?.("[data-tools-map-object]");
      if (!trigger) return;
      const objectName = String(trigger.dataset.toolsMapObject ?? "").trim();
      if (!objectName) return;
      toolsState.filters.object = [objectName];
      syncToolsFilterValue("object", [objectName]);
      applyToolsFilters();
      toolsSearchMapState.map?.balloon?.close?.();
    });
  }

  function closeToolsMoveModal() {
    if (!toolsMoveModalEl) return;
    toolsMoveModalEl.classList.add("is-hidden");
    setToolsMoveMessage("");
  }

  const openToolsMoveModal = async () => {
    if (!toolsMoveModalEl) return;
    if (toolsState.mode === "base" || toolsState.mode === "write-off-pending") return;
    if (toolsState.selectedIds.size === 0) return;
    const selectedTools = Array.from(toolsState.selectedIds)
      .map((id) => toolsState.toolMap.get(id))
      .filter(Boolean);
    const selectedResponsibleNames = new Set(
      selectedTools
        .map((tool) => normalizePersonName(tool?.["Ответственный"] ?? ""))
        .filter(Boolean)
    );
    setToolsMoveMessage("");
    updateToolsSelectionUi();
    const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
    const orgName = findUserOrganizationName(user, usersData);
    const normalizeOrg = (value) => String(value ?? "").trim().toLowerCase();
    const orgKey = normalizeOrg(orgName);
    const orgUsers = (usersData.users ?? []).filter(
      (entry) =>
        normalizeOrg(entry.organization) === orgKey && !isHiddenListUser(entry)
    );
    const userOptions = orgUsers
      .map((entry) => String(entry?.full_name ?? "").trim())
      .filter(Boolean);

    toolsMoveState.responsibleOptions = Array.from(new Set(userOptions)).sort(
      (a, b) => a.localeCompare(b, "ru")
    );
    toolsMoveState.selectedResponsibleNames = selectedResponsibleNames;
    toolsMoveState.responsibleRoles = new Map(
      orgUsers
        .map((entry) => [
          normalizePersonName(entry.full_name ?? ""),
          String(entry.role ?? "").trim(),
        ])
        .filter(([name]) => name)
    );
    toolsMoveState.responsibleTelegramIds = new Map(
      orgUsers
        .map((entry) => [
          normalizePersonName(entry.full_name ?? ""),
          normalizeTelegramId(entry.telegram_id),
        ])
        .filter(([name, id]) => name && id)
    );
    if (toolsMoveResponsibleInput) {
      toolsMoveResponsibleInput.value = "";
      updateToolsMoveSelectState(
        toolsMoveResponsibleInput,
        toolsMoveState.responsibleOptions,
        "Нет доступных пользователей"
      );
      toolsMoveResponsibleSuggestionsEl?.classList.add("is-hidden");
    }
    updateToolsMoveReasonState("");
    if (toolsMoveObjectChangeNoteEl) {
      toolsMoveObjectChangeNoteEl.classList.add("is-hidden");
    }
    if (toolsMoveReasonInput) {
      toolsMoveReasonInput.value = "";
    }

    let objectOptions = objectTrackingEnabled ? [] : [defaultObjectName];
    if (objectTrackingEnabled) {
      try {
        const rawObjects = await loadJson(objectsPath);
        objectOptions = normalizeObjectsData(rawObjects)
          .map((item) => String(item?.name ?? "").trim())
          .filter(Boolean);
      } catch (error) {
        console.warn("Не удалось загрузить объекты для перемещения.", error);
      }
    }

    toolsMoveState.objectOptions = objectOptions.sort((a, b) =>
      a.localeCompare(b, "ru")
    );
    if (toolsMoveObjectInput) {
      toolsMoveObjectInput.value = objectTrackingEnabled ? "" : defaultObjectName;
      updateToolsMoveSelectState(
        toolsMoveObjectInput,
        toolsMoveState.objectOptions,
        "Нет объектов"
      );
      toolsMoveObjectSuggestionsEl?.classList.add("is-hidden");
    }

    toolsMoveModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  if (toolsMoveBackdropEl) {
    toolsMoveBackdropEl.addEventListener("click", closeToolsMoveModal);
  }
  if (toolsMoveCloseButton) {
    toolsMoveCloseButton.addEventListener("click", closeToolsMoveModal);
  }
  if (toolsMoveCancelButton) {
    toolsMoveCancelButton.addEventListener("click", closeToolsMoveModal);
  }

  if (toolsMoveButtonEl) {
    toolsMoveButtonEl.addEventListener("click", openToolsMoveModal);
  }
  if (toolsMoveResponsibleInput) {
    const syncMoveReason = () => {
      const responsibleRaw = String(toolsMoveResponsibleInput.value ?? "").trim();
      const responsible = resolveMoveOptionMatch(
        responsibleRaw,
        toolsMoveState.responsibleOptions
      );
      updateToolsMoveReasonState(responsible);
      renderToolsMoveObjectSuggestions();
    };
    toolsMoveResponsibleInput.addEventListener("input", syncMoveReason);
    toolsMoveResponsibleInput.addEventListener("blur", syncMoveReason);
    toolsMoveObjectInput?.addEventListener("input", syncMoveReason);
    toolsMoveObjectInput?.addEventListener("blur", syncMoveReason);
  }
  if (toolsSelectionCancelButtonEl) {
    toolsSelectionCancelButtonEl.addEventListener("click", () => {
      resetToolsSelection();
      renderToolsList();
    });
  }
  if (toolsSelectionSelectAllButtonEl) {
    toolsSelectionSelectAllButtonEl.addEventListener("click", () => {
      selectAllToolsForMove();
    });
  }

  if (toolsMoveFormEl) {
    toolsMoveFormEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      const selectedTools = Array.from(toolsState.selectedIds)
        .map((id) => toolsState.toolMap.get(id))
        .filter(Boolean);
      const responsibleRaw = String(
        toolsMoveResponsibleInput?.value ?? ""
      ).trim();
      const targetObjectRaw = String(toolsMoveObjectInput?.value ?? "").trim();
      const responsible = resolveMoveOptionMatch(
        responsibleRaw,
        toolsMoveState.responsibleOptions
      );
      const targetObject = objectTrackingEnabled
        ? resolveMoveOptionMatch(targetObjectRaw, toolsMoveState.objectOptions)
        : defaultObjectName;
      if (!responsible || (objectTrackingEnabled && !targetObject)) {
        setToolsMoveMessage(objectTrackingEnabled ? "Выберите ответственного и объект." : "Выберите ответственного.", "error");
        return;
      }
      const blockedObjects = objectTrackingEnabled ? getToolsMoveBlockedObjects(responsible) : new Set();
      if (objectTrackingEnabled && blockedObjects.has(normalizeMoveOption(targetObject))) {
        setToolsMoveMessage(
          "Нельзя выбрать текущий объект при смене объекта.",
          "error"
        );
        toolsMoveObjectInput?.focus();
        return;
      }
      const responsibleTelegramId =
        toolsMoveState.responsibleTelegramIds.get(
          normalizePersonName(responsible)
        ) ?? null;
      const moveReason = String(toolsMoveReasonInput?.value ?? "").trim();
      const hasObjectChangeMove = objectTrackingEnabled && isToolsMoveObjectChange(responsible, targetObject);
      if (isEnergyResponsible(responsible) && !hasObjectChangeMove && !moveReason) {
        setToolsMoveMessage("Укажите причину перемещения.", "error");
        toolsMoveReasonInput?.focus();
        return;
      }

      if (!selectedTools.length) {
        setToolsMoveMessage("Сначала выберите инструменты.", "error");
        return;
      }

      const now = new Date();
      const eligibleEntries = [];
      const eligibleTools = [];
      const pendingEligibleTools = [];
      const isMoveByReplacement = toolsState.mode === "replacement";
      const allowMoveWithoutPhoto = toolsState.mode === "move-other";
      const settingsPath = `./${context.orgFolderName}/Настройки.json`;
      const settingsData = await loadJson(settingsPath).catch(() => ({}));
      const movedByEnergyFineAmount = getMovedByEnergyFineAmount(settingsData);
      const movedByEnergyFineNote = buildMovedByEnergyFineNote(settingsData);
      const movedByEnergySummaryUpdates = new Map();
      const vacationNote = isMoveByReplacement
        ? "Отправлено другим пользователем, так как ответственный в отпуске"
        : "";
      let skippedCount = 0;

      selectedTools.forEach((tool) => {
        const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
        const hasAccountingNumber =
          accountingNumber &&
          accountingNumber.toLowerCase() !== "нет номера";
        const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
        const hasPhoto = Number.isFinite(photoCount) && photoCount > 0;
        const isEligibleByPhoto = allowMoveWithoutPhoto ? true : hasPhoto;
        if (!hasAccountingNumber || !isEligibleByPhoto) {
          skippedCount += 1;
          return;
        }
        const oldResponsible = String(tool?.["Ответственный"] ?? "").trim();
        const movedByName = String(user?.full_name ?? "").trim();
        const isObjectChangeMove =
          objectTrackingEnabled && normalizePersonName(oldResponsible) === normalizePersonName(responsible);
        const isMovedByEnergy =
          allowMoveWithoutPhoto &&
          !isObjectChangeMove &&
          oldResponsible &&
          normalizePersonName(oldResponsible) !== normalizePersonName(movedByName);
        if (isMovedByEnergy && movedByEnergyFineAmount > 0) {
          const current = normalizeCostValue(
            movedByEnergySummaryUpdates.get(oldResponsible)
          ) || 0;
          movedByEnergySummaryUpdates.set(
            oldResponsible,
            current + movedByEnergyFineAmount
          );
        }
        eligibleTools.push(tool);
        const entry = {
          "ID перемещения": createMovementId(),
          Номер: String(tool?.["Номер"] ?? "").trim(),
          "Бух.номер": accountingNumber,
          "Дата перемещения": formatDateValue(now),
          "Дата ответа": isObjectChangeMove ? formatDateValue(now) : "",
          Переместил: movedByName,
          Принял: responsible,
          "Старый объект": objectTrackingEnabled ? String(tool?.["Объект"] ?? "").trim() : defaultObjectName,
          "Новый объект": objectTrackingEnabled ? targetObject : defaultObjectName,
          Статус: String(tool?.["Статус"] ?? "").trim(),
        };
        if (isObjectChangeMove) {
          entry.Ответ = "Смена объекта";
        } else {
          pendingEligibleTools.push(tool);
        }

        if (isMovedByEnergy) {
          entry["Причина перемещения"] = moveReason;
          entry["Ответственный до перемещения"] = oldResponsible;
          entry["Переместил энергетик"] = movedByName;
          entry["Штраф за перемещение энергетиком"] =
            movedByEnergyFineAmount > 0 ? movedByEnergyFineAmount : 0;
        }

        eligibleEntries.push(entry);
      });

      if (!eligibleEntries.length) {
        const requirementMessage = allowMoveWithoutPhoto
          ? "Для перемещения нужен бух.номер."
          : "Для перемещения нужен бух.номер и хотя бы одно фото.";
        setToolsMoveMessage(
          requirementMessage,
          "error"
        );
        return;
      }

      const movesPath = `./${context.orgFolderName}/Перемещения.json`;
      let movesData = [];
      try {
        const rawMoves = await loadJson(movesPath);
        movesData = Array.isArray(rawMoves)
          ? rawMoves
          : Array.isArray(rawMoves?.moves)
            ? rawMoves.moves
            : [];
      } catch (error) {
        movesData = [];
      }

      const updatedMoves = [...movesData, ...eligibleEntries];
      try {
        let toolsPayload = null;
        const toolsPath = `./${context.orgFolderName}/База с инструментами.json`;
        try {
          const rawTools = await loadJson(toolsPath);
          const toolsNormalized = normalizeCollectionPayload(rawTools, "tools");
          const toolsIndexMap = buildToolIndexMap(toolsNormalized.items);
          let hasToolsChanges = false;
          eligibleEntries.forEach((entry) => {
            if (String(entry?.["Ответ"] ?? "").trim() !== "Смена объекта") return;
            const number = String(entry?.["Номер"] ?? "").trim();
            const accounting = String(entry?.["Бух.номер"] ?? "").trim();
            const toolIndex =
              (number && toolsIndexMap.get(`n:${number}`)) ??
              (accounting && toolsIndexMap.get(`a:${accounting}`));
            if (toolIndex === undefined) return;
            const currentTool = toolsNormalized.items[toolIndex];
            toolsNormalized.items[toolIndex] = {
              ...currentTool,
              Объект: String(entry?.["Новый объект"] ?? "").trim(),
              Ответственный: String(entry?.["Принял"] ?? "").trim(),
            };
            hasToolsChanges = true;
          });
          if (hasToolsChanges) {
            toolsPayload = toolsNormalized.wrapper
              ? { ...toolsNormalized.wrapper, [toolsNormalized.key]: toolsNormalized.items }
              : toolsNormalized.items;
          }
        } catch (error) {
          console.warn("Не удалось обновить базу инструментов для смены объекта.", error);
        }
        const saveEntries = [{ path: movesPath, data: updatedMoves, user }];
        if (toolsPayload) {
          saveEntries.push({
            path: toolsPath,
            data: toolsPayload,
            user,
          });
        }
        await saveJsonBatch(saveEntries);
        if (movedByEnergySummaryUpdates.size) {
          const finesPath = `./${context.orgFolderName}/Штрафы.json`;
          const summaryUpdates = new Map();
          movedByEnergySummaryUpdates.forEach((amount, userName) => {
            const fineMap = new Map();
            fineMap.set("Перемещения энергетиком", amount);
            summaryUpdates.set(userName, fineMap);
          });
          const rawFines = await loadJson(finesPath).catch(() => ({}));
          const nextFines = applyMoveFinesSummaryUpdates(rawFines, summaryUpdates);
          await saveJson(finesPath, nextFines, { user });
        }
        const message = skippedCount
          ? `Перемещение создано: ${eligibleEntries.length}. Пропущено: ${skippedCount}.`
          : `Перемещение создано: ${eligibleEntries.length}.`;
        setToolsMoveMessage(message, "success");
        try {
          const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
          const organizationName = findUserOrganizationName(user, usersData);
          const notificationResults = await Promise.all(
            eligibleTools.map((tool) => {
              const previousResponsible = String(
                tool?.["Ответственный"] ?? ""
              ).trim();
              const movedByName = String(user?.full_name ?? "").trim();
              const movedByEnergy =
                toolsState.mode === "move-other" &&
                previousResponsible &&
                normalizePersonName(previousResponsible) !==
                  normalizePersonName(movedByName)
                  ? movedByName
                  : "";
              return notifyMoveTool({
                tool,
                orgFolder: context.orgFolderName,
                organizationName,
                responsibleName: responsible,
                responsibleTelegramId,
                targetObject,
                movedBy: movedByName,
                movedByEnergy,
                moveReason,
                vacationNote,
                previousResponsible,
                fineNote: movedByEnergy ? movedByEnergyFineNote : "",
                notificationId:
                  normalizePersonName(previousResponsible) ===
                  normalizePersonName(responsible)
                    ? "moveTool"
                    : toolsState.mode === "move-other"
                      ? "moveByEnergy"
                      : "moveTool",
                moveKind:
                  normalizePersonName(previousResponsible) ===
                  normalizePersonName(responsible)
                    ? "objectChange"
                    : "default",
              });
            })
          );
          const notificationStatus = analyzeNotificationResults(notificationResults);
          if (notificationStatus.summary) {
            setToolsMoveMessage(
              `${message} ${notificationStatus.summary}`,
              notificationStatus.allSent ? "success" : "error"
            );
          }
        } catch (notificationError) {
          console.warn("Уведомления о перемещении не отправлены.", notificationError);
          setToolsMoveMessage(
            `${message} Уведомления не отправлены, но перемещение сохранено.`,
            "error"
          );
        }
        markToolsPendingMoveInStates(pendingEligibleTools);
        applyToolsFilters();
        await refreshAwaitingReplyIndicator();
        setTimeout(() => {
          closeToolsMoveModal();
          resetToolsSelection();
          renderToolsList();
        }, 600);
      } catch (error) {
        console.error(error);
        setToolsMoveMessage("Не удалось сохранить перемещение.", "error");
      }
    });
  }


  const openWriteOffConfirmForSingleTool = (tool) => {
    if (!tool || !writeOffConfirmModalEl) return;
    writeOffState.selectedIds.clear();
    writeOffState.confirmTools = [tool];
    writeOffState.selectedTools = [tool];
    renderWriteOffConfirmList([tool]);
    if (writeOffActsInput) {
      writeOffActsInput.value = "";
    }
    setWriteOffConfirmMessage(
      "Загрузите акт списания и подтвердите операцию.",
      "info"
    );
    writeOffConfirmModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const markToolAsWorkingFromPending = async (tool) => {
    if (!tool || !toolsState.orgFolder) return;
    if (toolsWriteOffPendingConfirmState.isSaving) return;
    toolsWriteOffPendingConfirmState.isSaving = true;
    if (toolsWriteOffPendingConfirmSubmitButton) {
      toolsWriteOffPendingConfirmSubmitButton.disabled = true;
    }
    if (toolsWriteOffPendingConfirmWriteOffButton) {
      toolsWriteOffPendingConfirmWriteOffButton.disabled = true;
    }
    setToolsWriteOffPendingConfirmMessage("Возвращаем статус...", "info");
    try {
      const toolsPath = `./${toolsState.orgFolder}/База с инструментами.json`;
      const rawTools = await loadJson(toolsPath).catch(() => []);
      const tools = normalizeToolsData(rawTools);
      const matcher = buildToolsEditMatcher(tool);
      const toolIndex = tools.findIndex((entry) => matcher(entry));
      if (toolIndex < 0) {
        setToolsWriteOffPendingConfirmMessage("Инструмент не найден в базе.", "error");
        return;
      }
      tools[toolIndex] = {
        ...tools[toolIndex],
        "Статус": "Рабочий",
      };
      await saveJson(toolsPath, tools, { user: currentUser });
      syncToolStatusInStates(tools[toolIndex], "Рабочий");
      applyToolsFilters();
      setToolsWriteOffPendingConfirmMessage("Статус обновлён: «Рабочий».", "success");
      window.setTimeout(() => {
        closeToolsWriteOffPendingConfirmModal();
      }, 420);
    } catch (error) {
      console.error(error);
      setToolsWriteOffPendingConfirmMessage(
        "Не удалось обновить статус. Проверьте сервер.",
        "error"
      );
    } finally {
      toolsWriteOffPendingConfirmState.isSaving = false;
      if (toolsWriteOffPendingConfirmSubmitButton) {
        toolsWriteOffPendingConfirmSubmitButton.disabled = false;
      }
      if (toolsWriteOffPendingConfirmWriteOffButton) {
        toolsWriteOffPendingConfirmWriteOffButton.disabled = false;
      }
    }
  };

  const markToolAsWriteOffPendingFromModal = async (tool) => {
    if (!tool || !toolsState.orgFolder) return;
    if (toolsWriteOffPendingConfirmState.isSaving) return;
    toolsWriteOffPendingConfirmState.isSaving = true;
    if (toolsWriteOffPendingConfirmSubmitButton) {
      toolsWriteOffPendingConfirmSubmitButton.disabled = true;
    }
    if (toolsWriteOffPendingConfirmWriteOffButton) {
      toolsWriteOffPendingConfirmWriteOffButton.disabled = true;
    }
    setToolsWriteOffPendingConfirmMessage("Обновляем статус...", "info");
    try {
      const toolsPath = `./${toolsState.orgFolder}/База с инструментами.json`;
      const rawTools = await loadJson(toolsPath).catch(() => []);
      const tools = normalizeToolsData(rawTools);
      const matcher = buildToolsEditMatcher(tool);
      const toolIndex = tools.findIndex((entry) => matcher(entry));
      if (toolIndex < 0) {
        setToolsWriteOffPendingConfirmMessage("Инструмент не найден в базе.", "error");
        return;
      }
      const dateValue = formatDateValue(new Date());
      tools[toolIndex] = {
        ...tools[toolIndex],
        "Статус": "На списание",
        "Дата постановки статуса \"На списание\"": dateValue,
      };
      await saveJson(toolsPath, tools, { user: currentUser });
      syncToolStatusInStates(tools[toolIndex], "На списание");
      applyToolsFilters();
      setToolsWriteOffPendingConfirmMessage("Статус обновлён: «На списание».", "success");
      window.setTimeout(() => {
        closeToolsWriteOffPendingConfirmModal();
      }, 420);
    } catch (error) {
      console.error(error);
      setToolsWriteOffPendingConfirmMessage(
        "Не удалось обновить статус. Проверьте сервер.",
        "error"
      );
    } finally {
      toolsWriteOffPendingConfirmState.isSaving = false;
      if (toolsWriteOffPendingConfirmSubmitButton) {
        toolsWriteOffPendingConfirmSubmitButton.disabled = false;
      }
      if (toolsWriteOffPendingConfirmWriteOffButton) {
        toolsWriteOffPendingConfirmWriteOffButton.disabled = false;
      }
    }
  };

  const toolsSelectState = {
    holdTimer: null,
    startX: 0,
    startY: 0,
    suppressClick: false,
  };

  const clearToolsHold = () => {
    if (toolsSelectState.holdTimer) {
      window.clearTimeout(toolsSelectState.holdTimer);
      toolsSelectState.holdTimer = null;
    }
  };

  toolsKitPreviewModalEl.addEventListener("click", (event) => {
    if (event.target.closest("[data-tools-kit-preview-close]")) {
      closeToolsKitPreviewModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !toolsKitPreviewModalEl.classList.contains("is-hidden")) {
      closeToolsKitPreviewModal();
    }
  });

  if (toolsListEl) {
    toolsListEl.addEventListener("pointerdown", (event) => {
      if (
        toolsState.mode === "base" ||
        toolsState.mode === "search" ||
        toolsState.mode === "remove-photo" ||
        isRepairLikeMode()
      )
        return;
      if (toolsState.isSelecting) return;
      const item = event.target.closest("[data-tools-item]");
      if (!item) return;
      const tool = toolsState.toolMap.get(item.dataset.toolId);
      if (!isToolSelectableForMove(tool)) return;
      if (event.cancelable && event.pointerType !== "touch") {
        event.preventDefault();
      }
      toolsSelectState.startX = event.clientX;
      toolsSelectState.startY = event.clientY;
      toolsSelectState.suppressClick = false;
      clearToolsHold();
      toolsSelectState.holdTimer = window.setTimeout(() => {
        toolsState.isSelecting = true;
        toolsState.selectedIds.add(item.dataset.toolId);
        item.classList.add("is-selected");
        toolsSelectState.suppressClick = true;
        updateToolsSelectionUi();
      }, event.pointerType === "touch" ? 320 : 240);
    });

    toolsListEl.addEventListener("pointermove", (event) => {
      if (!toolsSelectState.holdTimer) return;
      const moved =
        Math.abs(event.clientX - toolsSelectState.startX) > 8 ||
        Math.abs(event.clientY - toolsSelectState.startY) > 8;
      if (moved) {
        clearToolsHold();
      }
    });

    toolsListEl.addEventListener("pointerup", () => {
      clearToolsHold();
    });

    toolsListEl.addEventListener("pointercancel", () => {
      clearToolsHold();
    });

    toolsListEl.addEventListener("click", (event) => {
      const notesButton = event.target.closest("[data-tools-notes-open]");
      if (notesButton) {
        const item = notesButton.closest("[data-tools-item]");
        if (!item) return;
        const tool = toolsState.toolMap.get(item.dataset.toolId);
        if (tool) openToolsNotesModal(tool);
        return;
      }
      const openKitButton = event.target.closest("[data-tools-kit-open]");
      if (openKitButton) {
        const item = openKitButton.closest("[data-tools-item]");
        if (!item) return;
        const tool = toolsState.toolMap.get(item.dataset.toolId);
        if (tool) {
          openToolsKitPreviewModal(tool);
        }
        return;
      }
      const photoButton = event.target.closest("[data-pending-photo-open]");
      if (photoButton) {
        const toolIndex = Number.parseInt(
          photoButton.dataset.pendingPhotoMoveIndex ?? "",
          10
        );
        if (Number.isFinite(toolIndex)) {
          const tool = toolsState.filtered[toolIndex] ?? null;
          if (tool) {
            const title = String(tool?.["Наименование"] ?? "").trim();
            void openPendingMovePhotoViewer({ tool, title });
          }
        }
        return;
      }
      const item = event.target.closest("[data-tools-item]");
      if (!item) return;
      if (toolsState.mode === "base") {
        const tool = toolsState.toolMap.get(item.dataset.toolId);
        if (tool) {
          openToolsEditModal(tool);
        }
        return;
      }
      if (toolsState.mode === "search") {
        const tool = toolsState.toolMap.get(item.dataset.toolId);
        if (tool) {
          openToolsInfoModal(tool);
        }
        return;
      }
      if (toolsState.mode === "no-accounting-number") {
        const tool = toolsState.toolMap.get(item.dataset.toolId);
        if (tool) {
          openToolsEditModal(tool, {
            focusAccounting: true,
            title: "Добавить бух.номер",
            accountingOnly: true,
          });
        }
        return;
      }
      if (toolsState.mode === "add-photo") {
        const tool = toolsState.toolMap.get(item.dataset.toolId);
        if (tool) {
          openAddPhotoToolModalForTool(tool);
        }
        return;
      }
      if (toolsState.mode === "remove-photo") {
        const tool = toolsState.toolMap.get(item.dataset.toolId);
        if (tool && removePhotoModalEl) {
          removePhotoModalEl.classList.remove("is-hidden");
          removePhotoState.orgFolder = toolsState.orgFolder || context.orgFolderName || "";
          setRemovePhotoView("photos");
          openRemovePhotoTool(tool);
        }
        return;
      }
      if (toolsState.mode === "repair") {
        const tool = toolsState.toolMap.get(item.dataset.toolId);
        if (tool) {
          if (isRepairSelectionBlocked(tool)) {
            setToolsSubtitle("Инструмент уже на списании.");
          } else {
            repairState.orgFolder = toolsState.orgFolder;
            openRepairFormModal(tool);
          }
        }
        return;
      }
      if (toolsState.mode === "write-off-pending") {
        const tool = toolsState.toolMap.get(item.dataset.toolId);
        if (tool) {
          openToolsWriteOffPendingConfirmModal(tool);
        }
        return;
      }
      if (toolsSelectState.suppressClick) {
        toolsSelectState.suppressClick = false;
        return;
      }
      const tool = toolsState.toolMap.get(item.dataset.toolId);
      if (!toolsState.isSelecting) {
        if (toolsState.mode === "move-other" && isToolSelectableForMove(tool)) {
          toolsState.isSelecting = true;
          toolsState.selectedIds.add(item.dataset.toolId);
          item.classList.add("is-selected");
          updateToolsSelectionUi();
          return;
        }
        if (tool) {
          openToolsInfoModal(tool);
        }
        return;
      }
      if (!isToolSelectableForMove(tool)) return;
      const toolId = item.dataset.toolId;
      if (toolsState.selectedIds.has(toolId)) {
        toolsState.selectedIds.delete(toolId);
        item.classList.remove("is-selected");
      } else {
        toolsState.selectedIds.add(toolId);
        item.classList.add("is-selected");
      }
      if (toolsState.selectedIds.size === 0) {
        toolsState.isSelecting = false;
        renderToolsList();
        return;
      }
      updateToolsSelectionUi();
    });

    toolsListEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const photoButton = event.target.closest("[data-pending-photo-open]");
      if (!photoButton) return;
      event.preventDefault();
      photoButton.click();
    });
  }
  toolsNotesModalEl.addEventListener("click", (event) => {
    if (event.target.closest("[data-tools-notes-close]") || event.target.closest("[data-tools-notes-backdrop]")) {
      closeToolsNotesModal();
    }
  });
  toolsNotesFormEl?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!toolsNotesTextEl) return;
    const text = toolsNotesTextEl.value.trim();
    if (!text) {
      if (toolsNotesMessageEl) toolsNotesMessageEl.textContent = "Напишите текст заметки.";
      return;
    }
    try {
      if (toolsNotesMessageEl) toolsNotesMessageEl.textContent = "Сохраняем...";
      await saveToolNote(text);
    } catch (error) {
      console.warn("Не удалось сохранить заметку.", error);
      toolsNotesState.isSaving = false;
      if (toolsNotesSaveButton) toolsNotesSaveButton.disabled = false;
      if (toolsNotesMessageEl) toolsNotesMessageEl.textContent = error?.message || "Не удалось сохранить заметку.";
    }
  });

  const clearAddPhotoList = () => {
    if (addPhotoListEl) {
      addPhotoListEl.innerHTML = "";
    }
  };

  const renderAddPhotoTable = (items) => {
    const table = document.createElement("div");
    table.className = "tools-table tools-table--add-photo";
    table.style.display = "grid";
    table.style.gap = "0";
    table.style.margin = "0";
    table.style.padding = "0";

    items.forEach((tool) => {
      const row = document.createElement("div");
      row.className = "tools-table__row tools-table__row--add-photo-card";
      row.style.display = "flex";
      row.style.padding = "0";
      row.style.margin = "0";
      row.style.border = "0";
      row.style.borderRadius = "0";
      row.style.background = "transparent";
      row.style.boxShadow = "none";
      row.style.flexDirection = "column";
      row.style.alignItems = "stretch";
      row.style.gap = "0";

      const name = String(tool?.["Наименование"] ?? "").trim();
      const manufacturer = String(tool?.["Производитель"] ?? tool?.["Марка"] ?? "").trim();
      const model = String(tool?.["Модель"] ?? "").trim();
      const status = normalizeToolsInfoStatus(tool?.["Статус"], Boolean(tool?.__pendingMove));
      const number = String(tool?.["Номер"] ?? "").trim();
      const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
      const cost = formatToolCostLabel(tool);
      const purchaseDate = String(tool?.["Дата покупки"] ?? "").trim();
      const responsible = String(tool?.["Ответственный"] ?? "").trim();
      const object = String(tool?.["Объект"] ?? "").trim();

      const infoCard = document.createElement("div");
      infoCard.className = "tools-info-card";
      infoCard.style.width = "100%";
      infoCard.style.margin = "0";
      infoCard.style.borderRadius = "0";
      infoCard.innerHTML = `
        <div class="tools-info-card__title tools-info-card__title--add-photo">ИНФОРМАЦИЯ ОБ ИНСТРУМЕНТЕ</div>
        <div class="tools-info-card__grid tools-info-card__grid--add-photo">
          <div class="tools-info-card__group">
            <div class="tools-info-card__label">НОМЕР</div>
            <div class="tools-info-card__value">${escapeHtml(number || "—")}</div>
          </div>
          <div class="tools-info-card__group">
            <div class="tools-info-card__label">БУХГАЛТЕРСКИЙ НОМЕР</div>
            <div class="tools-info-card__value">${escapeHtml(accountingNumber || "—")}</div>
          </div>
          <div class="tools-info-card__group">
            <div class="tools-info-card__label">НАИМЕНОВАНИЕ</div>
            <div class="tools-info-card__value">${escapeHtml([manufacturer, model].filter(Boolean).join(" ") || name || "Без названия")}</div>
          </div>
          <div class="tools-info-card__group">
            <div class="tools-info-card__label">СТАТУС</div>
            <div class="tools-info-card__value">${escapeHtml(status || "—")}</div>
          </div>
          <div class="tools-info-card__group">
            <div class="tools-info-card__label">СТОИМОСТЬ</div>
            <div class="tools-info-card__value">${escapeHtml(cost || "—")}</div>
          </div>
          <div class="tools-info-card__group">
            <div class="tools-info-card__label">ДАТА ПОКУПКИ</div>
            <div class="tools-info-card__value">${escapeHtml(purchaseDate || "—")}</div>
          </div>
          <div class="tools-info-card__group">
            <div class="tools-info-card__label">ОТВЕТСТВЕННЫЙ</div>
            <div class="tools-info-card__value">${escapeHtml(responsible || "—")}</div>
          </div>
          ${objectTrackingEnabled ? `
          <div class="tools-info-card__group">
            <div class="tools-info-card__label">ОБЪЕКТ</div>
            <div class="tools-info-card__value">${escapeHtml(object || "—")}</div>
          </div>` : ""}
        </div>
      `;

      const uploadWrap = document.createElement("div");
      uploadWrap.className = "tools-add-photo-upload-wrap";
      uploadWrap.style.width = "100%";
      uploadWrap.style.position = "sticky";
      uploadWrap.style.bottom = "0";
      uploadWrap.style.left = "0";
      uploadWrap.style.zIndex = "5";
      uploadWrap.style.padding = "0 max(12px, env(safe-area-inset-right)) calc(env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))";
      uploadWrap.style.background = "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.9) 30%, rgba(255,255,255,0.98) 100%)";
      uploadWrap.style.backdropFilter = "blur(8px)";

      const createUploadButton = ({ label, fromCamera = false }) => {
        const uploadButton = document.createElement("label");
        uploadButton.className = "action-primary tools-add-photo-upload";
        uploadButton.textContent = label;
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        if (fromCamera) {
          fileInput.setAttribute("capture", "environment");
          fileInput.setAttribute("data-source", "camera");
        }
        fileInput.className = "tools-table__thumb-input";
        bindPhotoFileInput(fileInput, async ([file]) => {
          await handleAddPhotoUpload(tool, file);
        });
        uploadButton.appendChild(fileInput);
        return uploadButton;
      };

      uploadWrap.style.display = "flex";
      uploadWrap.style.gap = "0";
      uploadWrap.style.margin = "0";
      uploadWrap.style.borderRadius = "0";
      const galleryButton = createUploadButton({ label: "Загрузить из галереи" });
      const cameraButton = createUploadButton({ label: "Сфотографировать", fromCamera: true });
      galleryButton.style.flex = "1";
      cameraButton.style.flex = "1";
      uploadWrap.append(galleryButton, cameraButton);
      row.append(infoCard, uploadWrap);
      table.appendChild(row);
    });

    return table;
  };

  const renderAddPhotoList = () => {
    if (!addPhotoListEl) return;
    clearAddPhotoList();
    addPhotoListEl.classList.add("is-table");
    const items = addPhotoState.filtered;
    addPhotoListEl.appendChild(renderAddPhotoTable(items));
    if (addPhotoEmptyEl) {
      addPhotoEmptyEl.classList.toggle("is-hidden", items.length > 0);
    }
  };

  const buildAddPhotoFileName = (toolNumber, file) => {
    const rawNumber = String(toolNumber ?? "").trim();
    const nameParts = String(file?.name ?? "").split(".");
    const nameExtension =
      nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
    let extension = nameExtension;
    if (!extension && file?.type) {
      const typeParts = file.type.split("/");
      extension = typeParts[typeParts.length - 1] ?? "";
    }
    const safeExtension = extension || "jpg";
    const suffix = buildRandomSuffix(4);
    const baseName = `${rawNumber}_${suffix}.${safeExtension}`;
    return sanitizePhotoFileName(baseName);
  };

  const buildDeclinePhotoFileName = (toolNumber, responseDate, file) => {
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
    const baseName = `${rawNumber}_${responseDate}_${suffix}.${safeExtension}`;
    return sanitizePhotoFileName(baseName);
  };

  const loadToolsData = async (orgFolder) => {
    if (!orgFolder) return [];
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    try {
      const raw = await loadJson(toolsPath);
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.tools)) return raw.tools;
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов.", error);
    }
    return [];
  };

  const updateAddPhotoAfterSave = (toolNumber) => {
    const normalized = normalizeToolNumberValue(toolNumber);
    addPhotoState.tools = addPhotoState.tools.filter(
      (tool) =>
        normalizeToolNumberValue(tool?.["Номер"] ?? "") !== normalized
    );
    applyAddPhotoFilters();
  };

  const syncToolsPhotoCount = (toolNumber, delta = 1) => {
    const normalized = normalizeToolNumberValue(toolNumber);
    const updateTool = (tool) => {
      if (normalizeToolNumberValue(tool?.["Номер"] ?? "") !== normalized) {
        return tool;
      }
      const current = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
      const safeCurrent = Number.isFinite(current) ? current : 0;
      return { ...tool, "Количество фото": safeCurrent + delta };
    };
    if (toolsState.tools.length) {
      toolsState.tools = toolsState.tools.map(updateTool);
      toolsState.filtered = toolsState.filtered.map(updateTool);
      if (toolsModalEl && !toolsModalEl.classList.contains("is-hidden")) {
        applyToolsFilters();
      }
    }
    if (
      toolsEditState.tool &&
      normalizeToolNumberValue(toolsEditState.tool?.["Номер"] ?? "") ===
        normalized
    ) {
      const current = Number.parseInt(
        toolsEditState.tool?.["Количество фото"] ?? 0,
        10
      );
      const safeCurrent = Number.isFinite(current) ? current : 0;
      const nextCount = safeCurrent + delta;
      toolsEditState.tool = { ...toolsEditState.tool, "Количество фото": nextCount };
      updateToolsEditPhotoCount(nextCount);
    }
  };

  const saveNoPhotoToolPhotos = async (tool, files, options = {}) => {
    const safeFiles = Array.isArray(files) ? files.filter(Boolean) : [];
    if (!tool || !safeFiles.length) return null;

    const orgFolder = [
      options?.orgFolder,
      context.orgFolderName,
      noPhotoState.orgFolder,
      addPhotoState.orgFolder,
    ]
      .map((value) => String(value ?? "").trim())
      .find(Boolean) ?? "";
    if (!orgFolder) {
      throw new Error("Не удалось определить организацию.");
    }

    const requestedToolNumber = String(tool?.["Номер"] ?? "").trim();
    if (!requestedToolNumber) {
      throw new Error("У инструмента нет номера для фото.");
    }

    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    const rawToolsPayload = await loadJson(toolsPath);
    const normalizedTools = normalizeCollectionPayload(rawToolsPayload, "tools");
    const requestedNumberNormalized = normalizeToolNumberValue(requestedToolNumber);
    const toolIndex = normalizedTools.items.findIndex(
      (entry) =>
        normalizeToolNumberValue(entry?.["Номер"] ?? "") ===
        requestedNumberNormalized
    );

    if (toolIndex < 0) {
      throw new Error("Инструмент не найден в базе.");
    }

    const matchedTool = normalizedTools.items[toolIndex];
    const matchedToolNumber = String(matchedTool?.["Номер"] ?? "").trim();
    if (!matchedToolNumber) {
      throw new Error("У инструмента нет номера для названия фото.");
    }

    const photoEntries = [];
    for (const file of safeFiles) {
      const safeName = buildAddPhotoFileName(matchedToolNumber, file);
      const content = await readFileAsBase64(file);
      photoEntries.push({
        type: "file",
        path: `${orgFolder}/Фото инструментов/${safeName}`,
        content,
        encoding: "base64",
        mime: file.type || "image/*",
        ...buildUploadUserMeta({ organizationName: context.orgFullName }),
      });
    }

    await uploadPhotoEntriesInBatches(photoEntries);

    const currentCount = Number.parseInt(
      matchedTool?.["Количество фото"] ?? 0,
      10
    );
    const safeCurrentCount = Number.isFinite(currentCount) ? currentCount : 0;
    const nextCount = safeCurrentCount + safeFiles.length;
    const currentNoPhotoFine = normalizeCostValue(
      matchedTool?.["Текущий штраф за отсутствие фото"]
    );

    if (currentNoPhotoFine > 0) {
      try {
        await registerNoPhotoFineForTool(matchedTool, currentNoPhotoFine);
      } catch (fineError) {
        console.warn("Не удалось зафиксировать штраф за отсутствие фото.", fineError);
      }
    }

    const updatedTools = [...normalizedTools.items];
    updatedTools[toolIndex] = {
      ...matchedTool,
      "Количество фото": nextCount,
      "Текущий штраф за отсутствие фото": 0,
    };
    const updatedToolsPayload = normalizedTools.wrapper
      ? { ...normalizedTools.wrapper, [normalizedTools.key]: updatedTools }
      : updatedTools;

    await saveEntries([
      {
        path: toolsPath,
        data: updatedToolsPayload,
        ...buildUploadUserMeta({ organizationName: context.orgFullName }),
      },
    ]);

    const updatedTool = updatedTools[toolIndex];
    const isDifferentTool = (entry) =>
      normalizeToolNumberValue(entry?.["Номер"] ?? "") !== requestedNumberNormalized;
    noPhotoState.tools = noPhotoState.tools.filter(isDifferentTool);
    noPhotoState.filtered = noPhotoState.filtered.filter(isDifferentTool);
    noPhotoState.toolMap.forEach((entry, key) => {
      if (!isDifferentTool(entry)) {
        noPhotoState.toolMap.delete(key);
      }
    });
    syncToolsPhotoCount(matchedToolNumber, safeFiles.length);

    return {
      tool: updatedTool,
      toolNumber: matchedToolNumber,
      savedCount: safeFiles.length,
      photoCount: nextCount,
    };
  };

  const handleAddPhotoUpload = async (tool, file, options = {}) => {
    const toolNumber = String(tool?.["Номер"] ?? "").trim();
    const toolAccountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
    const requestedIdentifier = toolNumber || toolAccountingNumber;
    if (!requestedIdentifier) {
      const message = "У инструмента нет номера для сохранения фото.";
      setAddPhotoSubtitle(message);
      setNoPhotoToolSubtitle(message);
      return false;
    }
    const preferredOrgFolder = String(options?.orgFolder ?? "").trim();
    const orgFolder = [
      preferredOrgFolder,
      context.orgFolderName,
      addPhotoState.orgFolder,
      noPhotoState.orgFolder,
    ]
      .map((value) => String(value ?? "").trim())
      .find(Boolean) ?? "";
    if (!orgFolder) {
      const orgErrorText = "Не удалось определить организацию.";
      setAddPhotoSubtitle(orgErrorText);
      setNoPhotoToolSubtitle(orgErrorText);
      return false;
    }

    setAddPhotoSubtitle("Загружаем фото...");

    try {
      const tools = await loadToolsData(orgFolder);
      const normalized = normalizeToolNumberValue(requestedIdentifier);
      const toolIndex = tools.findIndex((entry) => {
        const entryNumber = normalizeToolNumberValue(entry?.["Номер"] ?? "");
        const entryAccountingNumber = normalizeToolNumberValue(entry?.["Бух.номер"] ?? "");
        return entryNumber === normalized || entryAccountingNumber === normalized;
      });
      const matchedTool = toolIndex >= 0 ? tools[toolIndex] : null;
      const matchedToolNumber = String(matchedTool?.["Номер"] ?? "").trim();
      const matchedToolAccountingNumber = String(matchedTool?.["Бух.номер"] ?? "").trim();
      const toolIdentifier = matchedToolNumber || matchedToolAccountingNumber || requestedIdentifier;
      const shouldReplaceExisting = Boolean(options?.replaceExisting);
      const replacePhotoName = String(options?.replacePhotoName ?? "").trim();
      let replacedSinglePhoto = false;

      if (shouldReplaceExisting && matchedTool) {
        const primaryPhotoNumber = resolveToolPhotoNumber(matchedTool);
        const { files } = await loadToolPhotoFiles(
          orgFolder,
          primaryPhotoNumber,
          matchedToolNumber,
          matchedToolAccountingNumber
        );
        const filesToDelete = replacePhotoName
          ? files.filter((photo) => photo.name === replacePhotoName)
          : files;
        replacedSinglePhoto = Boolean(replacePhotoName && filesToDelete.length === 1);
        if (replacePhotoName && !filesToDelete.length) {
          throw new Error("Выбранное фото не найдено. Обновите карточку и попробуйте снова.");
        }
        if (filesToDelete.length) {
          await saveEntriesViaEndpoint(
            filesToDelete.map((photo) => ({
              type: "delete-file",
              path: `${orgFolder}/Фото инструментов/${photo.name}`,
              ...buildUploadUserMeta({ organizationName: context.orgFullName }),
            }))
          );
        }
      }

      const safeName = buildAddPhotoFileName(toolIdentifier, file);
      const content = await readFileAsBase64(file);
      const photoEntry = {
        type: "file",
        path: `${orgFolder}/Фото инструментов/${safeName}`,
        content,
        encoding: "base64",
        mime: file.type || "image/*",
        ...buildUploadUserMeta({ organizationName: context.orgFullName }),
      };
      await uploadPhotoEntriesInBatches([photoEntry]);

      if (toolIndex >= 0) {
        const current = Number.parseInt(tools[toolIndex]?.["Количество фото"] ?? 0, 10);
        const safeCurrent = Number.isFinite(current) ? current : 0;
        const currentNoPhotoFine = normalizeCostValue(
          tools[toolIndex]?.["Текущий штраф за отсутствие фото"]
        );
        if (currentNoPhotoFine > 0) {
          try {
            await registerNoPhotoFineForTool(tools[toolIndex], currentNoPhotoFine);
          } catch (fineError) {
            console.warn("Не удалось зафиксировать штраф за отсутствие фото.", fineError);
          }
        }

        const nextPhotoCount = shouldReplaceExisting
          ? (replacedSinglePhoto ? Math.max(safeCurrent, 1) : 1)
          : safeCurrent + 1;
        const updatedTool = {
          ...tools[toolIndex],
          "Количество фото": nextPhotoCount,
          "Текущий штраф за отсутствие фото": 0,
        };
        const updatedTools = [...tools];
        updatedTools[toolIndex] = updatedTool;
        await saveEntries([
          {
            path: `${orgFolder}/База с инструментами.json`,
            data: updatedTools,
            ...buildUploadUserMeta({ organizationName: context.orgFullName }),
          },
        ]);
      } else {
        console.warn("Инструмент не найден в базе при обновлении счётчика фото.", {
          requestedIdentifier,
          orgFolder,
        });
      }

      if (toolNumber) {
        updateAddPhotoAfterSave(toolNumber);
        if (options?.replaceExisting) {
          syncToolsPhotoCountAfterDelete(
            toolNumber,
            replacedSinglePhoto
              ? Math.max(Number.parseInt(matchedTool?.["Количество фото"] ?? 0, 10) || 0, 1)
              : 1
          );
        } else {
          syncToolsPhotoCount(toolNumber);
        }
      }
      const successMessage = `Фото сохранено для №${toolIdentifier}.`;
      setAddPhotoSubtitle(successMessage);
      setNoPhotoToolSubtitle(successMessage);
      return true;
    } catch (error) {
      console.error(error);
      const reason =
        error instanceof Error && error.message
          ? `Причина: ${error.message}`
          : "Не удалось определить причину.";
      const errorMessage = `Не удалось загрузить фото. ${reason}`;
      setAddPhotoSubtitle(errorMessage);
      setNoPhotoToolSubtitle(errorMessage);
      setTimeout(() => {
        applyAddPhotoFilters();
      }, 2500);
      return false;
    }
  };

  const applyAddPhotoFilters = () => {
    const search = addPhotoState.search.trim();
    const tokens = search ? search.split(/\s+/).filter(Boolean) : [];
    addPhotoState.filtered = addPhotoState.tools.filter((tool) => {
      if (
        addPhotoState.filters.group &&
        String(tool?.["Граппа инструментов"] ?? "").trim() !==
          addPhotoState.filters.group
      ) {
        return false;
      }
      if (
        addPhotoState.filters.status &&
        String(tool?.["Статус"] ?? "").trim() !== addPhotoState.filters.status
      ) {
        return false;
      }
      if (
        objectTrackingEnabled &&
        addPhotoState.filters.object &&
        String(tool?.["Объект"] ?? "").trim() !== addPhotoState.filters.object
      ) {
        return false;
      }
      if (
        addPhotoState.filters.manufacturer &&
        String(tool?.["Производитель"] ?? "").trim() !==
          addPhotoState.filters.manufacturer
      ) {
        return false;
      }
      if (
        addPhotoState.filters.model &&
        String(tool?.["Модель"] ?? "").trim() !== addPhotoState.filters.model
      ) {
        return false;
      }
      if (tokens.length) {
        const searchLine = tool.__searchLine ?? "";
        return tokens.every((token) => searchLine.includes(token));
      }
      return true;
    });
    renderAddPhotoList();
  };

  const fillAddPhotoFilterOptions = (key, values) => {
    const selectEl = contentEl.querySelector(
      `[data-add-photo-filter="${key}"]`
    );
    if (!selectEl) return;
    selectEl.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "Все";
    selectEl.appendChild(allOption);
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      selectEl.appendChild(option);
    });
    selectEl.value = addPhotoState.filters[key] ?? "";
  };

  const prepareAddPhotoFilters = () => {
    const collectValues = (field) => {
      const set = new Set();
      addPhotoState.tools.forEach((tool) => {
        const value = String(tool?.[field] ?? "").trim();
        if (value) set.add(value);
      });
      return Array.from(set).sort((a, b) =>
        a.localeCompare(b, "ru", { numeric: true })
      );
    };
    fillAddPhotoFilterOptions("group", collectValues("Граппа инструментов"));
    fillAddPhotoFilterOptions("status", collectValues("Статус"));
    fillAddPhotoFilterOptions("object", collectValues("Объект"));
    fillAddPhotoFilterOptions("manufacturer", collectValues("Производитель"));
    fillAddPhotoFilterOptions("model", collectValues("Модель"));
  };

  const loadAddPhotoTools = async () => {
    const orgFolder = context.orgFolderName ?? "";
    addPhotoState.orgFolder = orgFolder;
    if (!orgFolder) {
      addPhotoState.tools = [];
      addPhotoState.filtered = [];
      setAddPhotoSubtitle("Не удалось определить организацию.");
      renderAddPhotoList();
      return;
    }
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    let rawTools = [];
    try {
      const raw = await loadJson(toolsPath);
      rawTools = Array.isArray(raw) ? raw : Array.isArray(raw?.tools) ? raw.tools : [];
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов.", error);
      rawTools = [];
    }
    addPhotoState.tools = rawTools
      .filter((tool) => {
        const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
        return !(Number.isFinite(photoCount) && photoCount > 0);
      })
      .map((tool) => ({
        ...tool,
        __searchLine: buildAddPhotoSearchLine(tool),
      }))
      .sort((a, b) =>
        String(a?.["Номер"] ?? "").localeCompare(String(b?.["Номер"] ?? ""), "ru", {
          numeric: true,
        })
      );
    prepareAddPhotoFilters();
    applyAddPhotoFilters();
  };

  const setAddPhotoDetailMessage = (text, tone = "") => {
    if (!addPhotoDetailSubtitleEl) return;
    addPhotoDetailSubtitleEl.textContent = text;
    addPhotoDetailSubtitleEl.classList.toggle("is-error", tone === "error");
    addPhotoDetailSubtitleEl.classList.toggle("is-success", tone === "success");
  };

  const uploadAddPhotoFileFromDetail = async (tool, file, options = {}) => {
    if (!file) return false;
    const replace = Boolean(options?.replaceExisting);
    setAddPhotoDetailMessage(replace ? "Заменяем фото..." : "Добавляем фото...");
    const saved = await handleAddPhotoUpload(tool, file, options);
    if (saved) {
      const number = resolveToolNumberValue(tool) || String(tool?.["Бух.номер"] ?? "").trim();
      setAddPhotoDetailMessage(
        replace ? `Фото заменено для №${number || "—"}.` : `Фото добавлено для №${number || "—"}.`,
        "success"
      );
      await refreshAddPhotoDetailPreview(tool);
    } else {
      setAddPhotoDetailMessage("Не удалось сохранить фото. Попробуйте ещё раз.", "error");
    }
    return saved;
  };

  const uploadAddPhotoFilesFromDetail = async (tool, files) => {
    const safeFiles = Array.isArray(files) ? files.filter(Boolean) : [];
    if (!safeFiles.length) return false;
    const number = resolveToolNumberValue(tool) || String(tool?.["Бух.номер"] ?? "").trim();
    setAddPhotoDetailMessage(`Сохраняем фото: ${safeFiles.length}...`);
    try {
      const result = await saveNoPhotoToolPhotos(tool, safeFiles, {
        orgFolder: addPhotoState.orgFolder || toolsState.orgFolder || context.orgFolderName,
      });
      const savedCount = result?.savedCount ?? safeFiles.length;
      if (number) {
        updateAddPhotoAfterSave(number);
      }
      setAddPhotoDetailMessage(`Фото добавлены для №${number || "—"}: ${savedCount}.`, "success");
      await refreshAddPhotoDetailPreview(result?.tool ?? tool);
      return true;
    } catch (error) {
      console.error("Не удалось сохранить выбранные фото.", error);
      const reason =
        error instanceof Error && error.message
          ? ` Причина: ${error.message}`
          : "";
      setAddPhotoDetailMessage(`Не удалось сохранить фото.${reason}`, "error");
      return false;
    }
  };

  const createAddPhotoUploadButton = ({ tool, label, replace = false, fromCamera = false, replacePhotoName = "" }) => {
    const uploadButton = document.createElement("label");
    uploadButton.className = replace
      ? "action-secondary tools-add-photo-upload tools-add-photo-upload--replace"
      : "action-primary tools-add-photo-upload";
    uploadButton.textContent = label;

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    if (fromCamera) {
      fileInput.setAttribute("capture", "environment");
      fileInput.setAttribute("data-source", "camera");
    }
    fileInput.className = "tools-table__thumb-input";
    bindPhotoFileInput(fileInput, async ([file]) => {
      await uploadAddPhotoFileFromDetail(tool, file, {
        replaceExisting: replace,
        replacePhotoName,
      });
    });

    uploadButton.appendChild(fileInput);
    return uploadButton;
  };

  const createAddPhotoCameraButton = (tool) => {
    const cameraButton = document.createElement("button");
    cameraButton.className = "action-primary tools-add-photo-upload";
    cameraButton.type = "button";
    cameraButton.textContent = "Сфотографировать";
    cameraButton.addEventListener("click", async () => {
      addToolCameraMode = "no-photo";
      addToolCameraNoPhotoTargetTool = tool;
      addToolCameraNoPhotoOnCapture = async (capturedFile) => {
        await uploadAddPhotoFileFromDetail(tool, capturedFile);
      };
      const opened = await openAddToolCameraModal();
      if (!opened) {
        addToolCameraMode = "invoice";
        addToolCameraNoPhotoTargetTool = null;
        addToolCameraNoPhotoOnCapture = null;
        setAddPhotoDetailMessage("Камера недоступна. Выберите фото из галереи.", "error");
      }
    });
    return cameraButton;
  };


  const showAddPhotoReplaceChooser = (tool, photos) => {
    const previewEl = addPhotoDetailBodyEl?.querySelector("[data-add-photo-preview]");
    if (!previewEl) return;
    previewEl.innerHTML = "";
    const hint = document.createElement("div");
    hint.className = "add-photo-replace-hint";
    hint.textContent = "Выберите фото, которое нужно заменить";
    previewEl.appendChild(hint);

    photos.forEach((photo) => {
      const card = document.createElement("label");
      card.className = "add-photo-replace-card";

      const img = document.createElement("img");
      img.className = "add-photo-preview__image";
      img.src = `${photo.url}${photo.url.includes("?") ? "&" : "?"}v=${Date.now()}`;
      img.alt = "Фото для замены";
      img.loading = "lazy";

      const caption = document.createElement("span");
      caption.className = "add-photo-replace-card__caption";
      caption.textContent = "Заменить это фото";

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.className = "tools-table__thumb-input";
      bindPhotoFileInput(fileInput, async ([file]) => {
        await uploadAddPhotoFileFromDetail(tool, file, {
          replaceExisting: true,
          replacePhotoName: photo.name,
        });
      });

      card.append(img, caption, fileInput);
      previewEl.appendChild(card);
    });
  };

  const renderAddPhotoDetail = (tool, photos = []) => {
    if (!addPhotoDetailBodyEl) return;
    const name = String(tool?.["Наименование"] ?? "").trim();
    const manufacturer = String(tool?.["Производитель"] ?? tool?.["Марка"] ?? "").trim();
    const model = String(tool?.["Модель"] ?? "").trim();
    const status = normalizeToolsInfoStatus(tool?.["Статус"], Boolean(tool?.__pendingMove));
    const number = String(tool?.["Номер"] ?? "").trim();
    const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
    const cost = formatToolCostLabel(tool);
    const purchaseDate = String(tool?.["Дата покупки"] ?? "").trim();
    const responsible = String(tool?.["Ответственный"] ?? "").trim();
    const object = String(tool?.["Объект"] ?? "").trim();
    const photoCount = Number.parseInt(tool?.["Количество фото"] ?? photos.length, 10);
    const safePhotoCount = Number.isFinite(photoCount) ? photoCount : photos.length;
    const title = [manufacturer, model].filter(Boolean).join(" ") || name || "Инструмент";

    addPhotoDetailBodyEl.innerHTML = `
      <div class="tools-info-card tools-info-card--add-photo-detail">
        <div class="tools-info-card__title tools-info-card__title--add-photo">ИНФОРМАЦИЯ ОБ ИНСТРУМЕНТЕ</div>
        <div class="tools-info-card__grid tools-info-card__grid--add-photo">
          <div class="tools-info-card__group">
            <div class="tools-info-card__label">НОМЕР</div>
            <div class="tools-info-card__value">${escapeHtml(number || "—")}</div>
          </div>
          <div class="tools-info-card__group">
            <div class="tools-info-card__label">БУХ. НОМЕР</div>
            <div class="tools-info-card__value">${escapeHtml(accountingNumber || "—")}</div>
          </div>
          <div class="tools-info-card__group">
            <div class="tools-info-card__label">НАИМЕНОВАНИЕ</div>
            <div class="tools-info-card__value">${escapeHtml(title)}</div>
          </div>
          <div class="tools-info-card__group">
            <div class="tools-info-card__label">СТАТУС</div>
            <div class="tools-info-card__value">${escapeHtml(status || "—")}</div>
          </div>
          <div class="tools-info-card__group">
            <div class="tools-info-card__label">СТОИМОСТЬ</div>
            <div class="tools-info-card__value">${escapeHtml(cost || "—")}</div>
          </div>
          <div class="tools-info-card__group">
            <div class="tools-info-card__label">ДАТА ПОКУПКИ</div>
            <div class="tools-info-card__value">${escapeHtml(purchaseDate || "—")}</div>
          </div>
          <div class="tools-info-card__group">
            <div class="tools-info-card__label">ОТВЕТСТВЕННЫЙ</div>
            <div class="tools-info-card__value">${escapeHtml(responsible || "—")}</div>
          </div>
          ${objectTrackingEnabled ? `
          <div class="tools-info-card__group">
            <div class="tools-info-card__label">ОБЪЕКТ</div>
            <div class="tools-info-card__value">${escapeHtml(object || "—")}</div>
          </div>` : ""}
        </div>
      </div>
      <div class="tools-info-card tools-info-card--add-photo-preview">
        <div class="tools-info-card__title tools-info-card__title--add-photo">Фото</div>
        <div class="add-photo-preview" data-add-photo-preview></div>
      </div>
      <div class="tools-add-photo-upload-wrap" data-add-photo-actions></div>
    `;

    const previewEl = addPhotoDetailBodyEl.querySelector("[data-add-photo-preview]");
    if (previewEl) {
      if (photos.length) {
        photos.slice(0, 4).forEach((photo) => {
          const img = document.createElement("img");
          img.className = "add-photo-preview__image";
          img.src = `${photo.url}${photo.url.includes("?") ? "&" : "?"}v=${Date.now()}`;
          img.alt = "Фото инструмента";
          img.loading = "lazy";
          previewEl.appendChild(img);
        });
      } else {
        const empty = document.createElement("div");
        empty.className = "add-photo-preview__empty";
        empty.textContent = safePhotoCount > 0 ? "Фото есть в базе, но предпросмотр недоступен." : "Фото пока нет.";
        previewEl.appendChild(empty);
      }
    }

    const actionsEl = addPhotoDetailBodyEl.querySelector("[data-add-photo-actions]");
    if (actionsEl) {
      actionsEl.innerHTML = `
        <div class="tools-add-photo-upload-row" data-add-photo-upload-row></div>
        <div class="add-photo-pending is-hidden" data-add-photo-pending>
          <div class="add-photo-pending__head">
            <div class="add-photo-pending__hint">Выбрано фото для добавления:</div>
            <div class="add-photo-pending__counter"><strong data-add-photo-selected-count>0</strong></div>
          </div>
          <div class="add-photo-pending__buttons">
            <button class="action-danger add-photo-pending__cancel" type="button" data-add-photo-selection-cancel>Отмена</button>
            <button class="action-primary add-photo-pending__confirm" type="button" data-add-photo-selection-confirm disabled>Подтвердить</button>
          </div>
        </div>
      `;
      const uploadRowEl = actionsEl.querySelector("[data-add-photo-upload-row]");
      const pendingEl = actionsEl.querySelector("[data-add-photo-pending]");
      const selectedCountEl = actionsEl.querySelector("[data-add-photo-selected-count]");
      const confirmSelectedButton = actionsEl.querySelector("[data-add-photo-selection-confirm]");
      const cancelSelectedButton = actionsEl.querySelector("[data-add-photo-selection-cancel]");
      const selectedFiles = [];

      const refreshSelectedPhotos = () => {
        if (selectedCountEl) {
          selectedCountEl.textContent = String(selectedFiles.length);
        }
        if (confirmSelectedButton) {
          confirmSelectedButton.disabled = selectedFiles.length === 0;
        }
        pendingEl?.classList.toggle("is-hidden", selectedFiles.length === 0);
      };

      const addSelectedFiles = (files) => {
        const safeFiles = Array.isArray(files) ? files.filter(Boolean) : [];
        if (!safeFiles.length) return;
        selectedFiles.push(...safeFiles);
        refreshSelectedPhotos();
        setAddPhotoDetailMessage("");
      };

      const createQueuedGalleryButton = () => {
        const uploadButton = document.createElement("label");
        uploadButton.className = "action-secondary tools-add-photo-upload tools-add-photo-upload--blue-outline";
        uploadButton.textContent = "Добавить из галереи";
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.multiple = true;
        fileInput.className = "tools-table__thumb-input";
        bindPhotoFileInput(fileInput, (files) => {
          addSelectedFiles(files);
        });
        uploadButton.appendChild(fileInput);
        return uploadButton;
      };

      const createQueuedCameraButton = () => {
        const cameraButton = document.createElement("button");
        cameraButton.className = "action-secondary tools-add-photo-upload tools-add-photo-upload--blue-outline";
        cameraButton.type = "button";
        cameraButton.textContent = "Сфотографировать";
        cameraButton.addEventListener("click", async () => {
          addToolCameraMode = "no-photo";
          addToolCameraNoPhotoTargetTool = tool;
          addToolCameraNoPhotoOnCapture = (capturedFile) => {
            addSelectedFiles([capturedFile]);
          };
          const opened = await openAddToolCameraModal();
          if (!opened) {
            addToolCameraMode = "invoice";
            addToolCameraNoPhotoTargetTool = null;
            addToolCameraNoPhotoOnCapture = null;
            setAddPhotoDetailMessage("Камера недоступна. Выберите фото из галереи.", "error");
          }
        });
        return cameraButton;
      };

      cancelSelectedButton?.addEventListener("click", () => {
        selectedFiles.splice(0, selectedFiles.length);
        refreshSelectedPhotos();
        setAddPhotoDetailMessage("");
      });

      confirmSelectedButton?.addEventListener("click", async () => {
        if (!selectedFiles.length) return;
        confirmSelectedButton.disabled = true;
        const filesToUpload = selectedFiles.splice(0, selectedFiles.length);
        const saved = await uploadAddPhotoFilesFromDetail(tool, filesToUpload);
        if (!saved) {
          selectedFiles.push(...filesToUpload);
        }
        refreshSelectedPhotos();
      });

      const galleryAction = createQueuedGalleryButton();
      const cameraAction = createQueuedCameraButton();
      let replaceAction;
      if (photos.length > 1) {
        replaceAction = document.createElement("button");
        replaceAction.className = "action-secondary tools-add-photo-upload tools-add-photo-upload--replace";
        replaceAction.type = "button";
        replaceAction.textContent = "Заменить фото";
        replaceAction.addEventListener("click", () => {
          setAddPhotoDetailMessage("Выберите фото, которое хотите заменить.");
          showAddPhotoReplaceChooser(tool, photos);
        });
      } else {
        replaceAction = createAddPhotoUploadButton({
          tool,
          label: "Заменить фото",
          replace: true,
          replacePhotoName: photos[0]?.name ?? "",
        });
      }
      uploadRowEl?.append(galleryAction, cameraAction, replaceAction);
      refreshSelectedPhotos();
    }
  };

  const refreshAddPhotoDetailPreview = async (tool) => {
    if (!tool) return;
    const orgFolder = context.orgFolderName || addPhotoState.orgFolder || toolsState.orgFolder;
    const primaryPhotoNumber = resolveToolPhotoNumber(tool);
    const numberValue = String(tool?.["Номер"] ?? "").trim();
    const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
    let photos = [];
    if (orgFolder && (primaryPhotoNumber || numberValue || accountingNumber)) {
      try {
        const result = await loadToolPhotoFiles(
          orgFolder,
          primaryPhotoNumber,
          numberValue,
          accountingNumber
        );
        photos = result.files ?? [];
      } catch (error) {
        console.warn("Не удалось загрузить фото инструмента.", error);
      }
    }
    renderAddPhotoDetail(tool, photos);
  };

  const openAddPhotoToolModalForTool = async (tool) => {
    if (!addPhotoModalEl || !tool) return;
    toolsState.addPhotoSelectedTool = tool;
    if (addPhotoDetailTitleEl) {
      addPhotoDetailTitleEl.textContent = "Управление фото";
    }
    setAddPhotoDetailMessage("");
    if (addPhotoDetailBodyEl) {
      addPhotoDetailBodyEl.innerHTML = `<div class="tools-info-card"><div class="tools-info-card__value">Загружаем карточку...</div></div>`;
    }
    addPhotoModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    await refreshAddPhotoDetailPreview(tool);
  };

  const closeAddPhotoDetailModal = ({ keepBodyLocked = false } = {}) => {
    if (!addPhotoModalEl) return;
    addPhotoModalEl.classList.add("is-hidden");
    toolsState.addPhotoSelectedTool = null;
    if (!keepBodyLocked) {
      document.body.style.overflow = "";
    }
  };

  const openAddPhotoModal = async () => {
    if (!toolsModalEl) return;
    resetToolsTopZoneStability();
    toolsState.mode = "add-photo";
    toolsState.view = "table";
    toolsState.searchSortDirection = "desc";
    toolsState.activeReplacementResponsible = "";
    setToolsStatusStandaloneVisibility(false);
    setToolsTitle("Добавить фото");
    setToolsResponsibleFilterVisibility(true);
    syncToolsModalModeClass();
    updateToolsReplacementPendingLinkVisibility();
    syncToolsMapViewButtonVisibility();
    toolsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setToolsSubtitle("Загружаем все инструменты...");
    const numberConfig = await resolveToolsNumberConfig();
    updateToolsNumberConfig(numberConfig);
    await loadBaseTools();
    setToolsSubtitle("");
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

  const setNoPhotoToolSubtitle = (text) => {
    if (noPhotoToolSubtitleEl) {
      noPhotoToolSubtitleEl.textContent = text;
    }
  };

  const closeNoPhotoToolModal = () => {
    if (!noPhotoToolModalEl) return;
    noPhotoToolModalEl.classList.add("is-hidden");
    addToolCameraNoPhotoOnCapture = null;
    noPhotoModalEl?.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const openNoPhotoToolModalForTool = (tool) => {
    if (!noPhotoToolModalEl) return;
    const safeTool = tool && typeof tool === "object" ? tool : {};
    const number = String(safeTool?.["Номер"] ?? "").trim();

    noPhotoModalEl?.classList.add("is-hidden");
    noPhotoToolModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";

    if (!noPhotoToolContentEl) {
      setNoPhotoToolSubtitle("");
      return;
    }

    try {
      const accountingNumber = String(safeTool?.["Бух.номер"] ?? "").trim();
      const name = String(safeTool?.["Наименование"] ?? "").trim();
      const manufacturer = String(safeTool?.["Производитель"] ?? safeTool?.["Марка"] ?? "").trim();
      const model = String(safeTool?.["Модель"] ?? "").trim();
      const status = normalizeToolsInfoStatus(safeTool?.["Статус"], Boolean(safeTool?.__pendingMove));
      const cost = formatToolCostLabel(safeTool);
      const purchaseDate = String(safeTool?.["Дата покупки"] ?? "").trim();
      const responsible = String(safeTool?.["Ответственный"] ?? "").trim();
      const object = String(safeTool?.["Объект"] ?? "").trim();

      noPhotoToolContentEl.innerHTML = `
        <div class="no-photo-tool-content">
          <div class="tools-info-card">
            <div class="tools-info-card__title tools-info-card__title--add-photo">ИНФОРМАЦИЯ ОБ ИНСТРУМЕНТЕ</div>
            <div class="tools-info-card__grid tools-info-card__grid--add-photo">
              <div class="tools-info-card__group"><div class="tools-info-card__label">Номер</div><div class="tools-info-card__value">${escapeHtml(number || "—")}</div></div>
              <div class="tools-info-card__group"><div class="tools-info-card__value">${escapeHtml(accountingNumber || "—")}</div></div>
              <div class="tools-info-card__group"><div class="tools-info-card__label">Наименование</div><div class="tools-info-card__value">${escapeHtml([manufacturer, model].filter(Boolean).join(" ") || name || "Без названия")}</div></div>
              <div class="tools-info-card__group"><div class="tools-info-card__value">${escapeHtml(status || "—")}</div></div>
              <div class="tools-info-card__group"><div class="tools-info-card__value">${escapeHtml(cost || "—")}</div></div>
              <div class="tools-info-card__group"><div class="tools-info-card__label">Дата покупки</div><div class="tools-info-card__value">${escapeHtml(purchaseDate || "—")}</div></div>
              <div class="tools-info-card__group"><div class="tools-info-card__label">Ответственный</div><div class="tools-info-card__value">${escapeHtml(responsible || "—")}</div></div>
              ${objectTrackingEnabled ? `<div class="tools-info-card__group"><div class="tools-info-card__label">Объект</div><div class="tools-info-card__value">${escapeHtml(object || "—")}</div></div>` : ""}
            </div>
          </div>
          <div class="no-photo-tool-actions-block">
            <div class="no-photo-tool-actions__head">
              <div class="no-photo-tool-actions__hint">Добавьте фото для выбранного инструмента:</div>
              <div class="no-photo-tool-counter"><strong data-no-photo-selected-count>0</strong></div>
            </div>
            <div class="no-photo-tool-actions" data-no-photo-tool-actions></div>
            <div class="no-photo-tool-buttons">
              <button class="action-danger no-photo-tool-cancel" type="button" data-no-photo-cancel>Отмена</button>
              <button class="action-primary no-photo-tool-confirm" type="button" data-no-photo-confirm disabled>Подтвердить</button>
            </div>
          </div>
        </div>
      `;

      const actions = noPhotoToolContentEl.querySelector("[data-no-photo-tool-actions]");
      const selectedCountEl = noPhotoToolContentEl.querySelector("[data-no-photo-selected-count]");
      const confirmButtonEl = noPhotoToolContentEl.querySelector("[data-no-photo-confirm]");
      const cancelButtonEl = noPhotoToolContentEl.querySelector("[data-no-photo-cancel]");
      const selectedFiles = [];
      const refreshSelectedPhotos = () => {
        if (selectedCountEl) {
          selectedCountEl.textContent = String(selectedFiles.length);
        }
        if (confirmButtonEl) {
          confirmButtonEl.disabled = selectedFiles.length === 0;
        }
      };

      const createUploadButton = ({ label }) => {
        const uploadButton = document.createElement("label");
        uploadButton.className = "action-primary no-photo-tool-actions__button";
        uploadButton.textContent = label;
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.className = "tools-table__thumb-input";
        fileInput.addEventListener("change", () => {
          const files = Array.from(fileInput.files ?? []);
          if (!files.length) return;
          fileInput.value = "";
          selectedFiles.push(...files);
          refreshSelectedPhotos();
        });
        uploadButton.appendChild(fileInput);
        return uploadButton;
      };

      cancelButtonEl?.addEventListener("click", () => {
        closeNoPhotoToolModal();
      });

      confirmButtonEl?.addEventListener("click", async () => {
        if (!selectedFiles.length) return;
        confirmButtonEl.disabled = true;
        setNoPhotoToolSubtitle("Сохраняем фото...");

        const filesToUpload = selectedFiles.splice(0, selectedFiles.length);
        try {
          const result = await saveNoPhotoToolPhotos(safeTool, filesToUpload, {
            orgFolder: noPhotoState.orgFolder,
          });
          refreshSelectedPhotos();
          const savedCount = result?.savedCount ?? filesToUpload.length;
          setNoPhotoToolSubtitle(
            `Фото успешно добавлены: ${savedCount}.`
          );
          applyNoPhotoFilters();
          closeNoPhotoToolModal();
        } catch (error) {
          console.error("Ошибка при загрузке фото инструмента без фото.", error);
          selectedFiles.push(...filesToUpload);
          refreshSelectedPhotos();
          const reason =
            error instanceof Error && error.message
              ? ` Причина: ${error.message}`
              : "";
          setNoPhotoToolSubtitle(
            `Не удалось загрузить ${filesToUpload.length} фото.${reason}`
          );
          confirmButtonEl.disabled = false;
        }
      });

      const galleryUploadButton = createUploadButton({ label: "Добавить из галереи" });
      const cameraCaptureButton = document.createElement("button");
      cameraCaptureButton.className = "action-primary no-photo-tool-actions__button";
      cameraCaptureButton.type = "button";
      cameraCaptureButton.textContent = "Сфотографировать";
      cameraCaptureButton.addEventListener("click", async () => {
        addToolCameraMode = "no-photo";
        addToolCameraNoPhotoTargetTool = safeTool;
        addToolCameraNoPhotoOnCapture = (capturedFile) => {
          if (!capturedFile) return;
          selectedFiles.push(capturedFile);
          refreshSelectedPhotos();
          setNoPhotoToolSubtitle("Фото добавлено в очередь.");
        };
        const opened = await openAddToolCameraModal();
        if (!opened) {
          addToolCameraMode = "invoice";
          addToolCameraNoPhotoTargetTool = null;
          addToolCameraNoPhotoOnCapture = null;
          setNoPhotoToolSubtitle("Камера недоступна. Выберите фото из галереи.");
        }
      });

      actions?.append(galleryUploadButton, cameraCaptureButton);
      refreshSelectedPhotos();
    } catch (error) {
      console.warn("Не удалось отрисовать карточку инструмента без фото.", error);
      noPhotoToolContentEl.innerHTML = `
        <div class="no-photo-tool-content">
          <div class="tools-empty">Не удалось отобразить данные инструмента. Попробуйте открыть карточку снова.</div>
        </div>
      `;
    }

    setNoPhotoToolSubtitle("");
  };

  const closeAddPhotoModal = () => {
    if (!addPhotoModalEl) return;
    const keepToolsListLocked =
      toolsModalEl &&
      !toolsModalEl.classList.contains("is-hidden") &&
      toolsState.mode === "add-photo";
    closeAddPhotoDetailModal({ keepBodyLocked: keepToolsListLocked });
    if (addPhotoState.openedFromNoPhoto) {
      noPhotoModalEl?.classList.remove("is-hidden");
      document.body.style.overflow = "hidden";
    }
    addPhotoState.openedFromNoPhoto = false;
  };

  if (addPhotoBackdropEl) {
    addPhotoBackdropEl.addEventListener("click", closeAddPhotoModal);
  }
  if (addPhotoCloseButton) {
    addPhotoCloseButton.addEventListener("click", closeAddPhotoModal);
  }
  addPhotoModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAddPhotoModal();
    }
  });

  if (addPhotoSearchInput) {
    addPhotoSearchInput.addEventListener("input", (event) => {
      addPhotoState.search = String(event.target.value ?? "").toLowerCase();
      applyAddPhotoFilters();
    });
  }

  const setAddPhotoFiltersOpen = (isOpen) => {
    if (addPhotoFiltersPanelEl) {
      addPhotoFiltersPanelEl.classList.toggle("is-open", isOpen);
    }
    if (addPhotoFiltersToggleEl) {
      addPhotoFiltersToggleEl.setAttribute("aria-expanded", String(isOpen));
    }
  };

  if (typeof window !== "undefined" && addPhotoFiltersPanelEl) {
    const mediaQuery = window.matchMedia("(max-width: 520px)");
    const syncFiltersVisibility = () => {
      setAddPhotoFiltersOpen(!mediaQuery.matches);
    };
    syncFiltersVisibility();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", syncFiltersVisibility);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(syncFiltersVisibility);
    }
  }

  addPhotoFilterEls.forEach((selectEl) => {
    selectEl.addEventListener("change", (event) => {
      const target = event.target;
      const key = target?.dataset?.addPhotoFilter;
      if (!key) return;
      addPhotoState.filters[key] = String(target.value ?? "");
      applyAddPhotoFilters();
    });
  });

  const setNoPhotoSubtitle = (text) => {
    if (noPhotoSubtitleEl) {
      noPhotoSubtitleEl.textContent = text;
    }
  };

  if (noPhotoToolBackdropEl) {
    noPhotoToolBackdropEl.addEventListener("click", closeNoPhotoToolModal);
  }
  if (noPhotoToolCloseButton) {
    noPhotoToolCloseButton.addEventListener("click", closeNoPhotoToolModal);
  }
  noPhotoToolModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNoPhotoToolModal();
    }
  });

  const clearNoPhotoList = () => {
    if (noPhotoListEl) {
      noPhotoListEl.innerHTML = "";
    }
  };

  const renderNoPhotoTable = (items) => {
    const table = document.createElement("div");
    table.className = "tools-table tools-table--no-photo";

    let previousGroupLabel = "";
    items.forEach((tool) => {
      const groupLabel = resolveNoPhotoGroupingLabel(tool);
      if (noPhotoState.grouping !== "none" && groupLabel !== previousGroupLabel) {
        const groupTitleEl = document.createElement("div");
        groupTitleEl.className = "tools-group-title";
        groupTitleEl.innerHTML = `
          <span>${escapeHtml(groupLabel)}</span>
          <span class="tools-group-title__meta">${escapeHtml(getNoPhotoGroupingCaption())}</span>
        `;
        table.appendChild(groupTitleEl);
        previousGroupLabel = groupLabel;
      }
      const row = document.createElement("div");
      row.className = "tools-table__row tools-table__row--no-photo tools-table__row--search";
      row.dataset.noPhotoId = tool.__noPhotoId;
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.setAttribute("aria-label", "Открыть карточку инструмента");

      const numberCell = document.createElement("div");
      numberCell.className = "tools-table__cell tools-table__cell--number";
      const number = String(tool?.["Номер"] ?? "").trim();
      numberCell.textContent = number || "—";
      if (objectTrackingEnabled) {
        const objectLine = document.createElement("div");
        objectLine.className = "tools-table__number-object";
        objectLine.textContent = String(tool?.["Объект"] ?? "").trim() || "Объект не указан";
        numberCell.appendChild(objectLine);
      }

      const infoCell = document.createElement("div");
      infoCell.className = "tools-table__cell";
      const title = document.createElement("div");
      title.className = "tools-table__title";
      const name = String(tool?.["Наименование"] ?? "").trim();
      title.textContent = name || "Без названия";

      const meta = document.createElement("div");
      meta.className = "tools-table__meta tools-table__meta--stack";
      const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
      const manufacturer = String(tool?.["Производитель"] ?? "").trim();
      const model = String(tool?.["Модель"] ?? "").trim();
      const status = getNoPhotoStatusLabel(tool?.["Статус"]);
      const costText = formatCostValueWithCurrency(tool?.["Стоимость"]);

      const accountingCostLine = document.createElement("div");
      accountingCostLine.className = "tools-table__accounting-cost-line";
      const accountingValue = document.createElement("span");
      accountingValue.textContent = accountingNumber || "—";
      const costValue = document.createElement("span");
      costValue.textContent = costText;
      accountingCostLine.append(accountingValue, costValue);
      const detailsLine = document.createElement("div");
      detailsLine.textContent = [
        manufacturer || "—",
        model || "—",
      ]
        .filter(Boolean)
        .join(" · ");
      const responsibleLine = document.createElement("div");
      responsibleLine.className = "tools-table__responsible-line";
      appendPersonNameWithBoldSurname(responsibleLine, tool?.["Ответственный"]);
      const statusLine = document.createElement("div");
      statusLine.className = "tools-table__status-line";
      statusLine.textContent = status || "—";
      meta.append(accountingCostLine, detailsLine, responsibleLine, statusLine);
      infoCell.append(title, meta);

      const openCard = (event) => {
        if (event?.type === "keydown") {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
        }
        openNoPhotoToolModalForTool(tool);
      };
      row.addEventListener("click", openCard);
      row.addEventListener("keydown", openCard);

      row.append(numberCell, infoCell);
      table.appendChild(row);
    });

    return table;
  };

  const renderNoPhotoList = () => {
    if (!noPhotoListEl) return;
    clearNoPhotoList();
    noPhotoListEl.classList.add("is-table");
    const items = noPhotoState.filtered;
    noPhotoListEl.appendChild(renderNoPhotoTable(items));
    if (noPhotoEmptyEl) {
      noPhotoEmptyEl.classList.toggle("is-hidden", items.length > 0);
    }
    const filteredToolsCost = items.reduce(
      (sum, tool) => sum + normalizeCostValue(tool?.["Стоимость"]),
      0
    );
    setNoPhotoSubtitle(
      `Показано ${items.length} из ${noPhotoState.tools.length} · На сумму ${formatNotificationCostWithoutCurrency(filteredToolsCost)} р.`
    );
  };

  const applyNoPhotoFilters = () => {
    const search = noPhotoState.search.trim();
    const tokens = search ? search.split(/\s+/).filter(Boolean) : [];
    const hasSelected = (key) =>
      Array.isArray(noPhotoState.filters[key]) && noPhotoState.filters[key].length > 0;
    const includesSelected = (key, rawValue) => {
      const normalized = String(rawValue ?? "").trim();
      return hasSelected(key) && noPhotoState.filters[key].includes(normalized);
    };
    noPhotoState.filtered = noPhotoState.tools.filter((tool) => {
      if (hasSelected("group") && !includesSelected("group", tool?.["Граппа инструментов"])) {
        return false;
      }
      if (hasSelected("status") && !includesSelected("status", tool?.["Статус"])) {
        return false;
      }
      if (objectTrackingEnabled && hasSelected("object") && !includesSelected("object", tool?.["Объект"])) {
        return false;
      }
      if (hasSelected("manufacturer") && !includesSelected("manufacturer", tool?.["Производитель"])) {
        return false;
      }
      if (hasSelected("responsible") && !includesSelected("responsible", tool?.["Ответственный"])) {
        return false;
      }
      if (hasSelected("name") && !includesSelected("name", tool?.["Наименование"])) {
        return false;
      }
      if (hasSelected("model") && !includesSelected("model", tool?.["Модель"])) {
        return false;
      }
      if (hasSelected("photo")) {
        const photoFilters = noPhotoState.filters.photo;
        const hasWith = photoFilters.includes("with");
        const hasWithout = photoFilters.includes("without");
        const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
        const hasPhoto = Number.isFinite(photoCount) && photoCount > 0;
        if (hasWith !== hasWithout) {
          if (hasWith && !hasPhoto) return false;
          if (hasWithout && hasPhoto) return false;
        }
        if (!hasWith && !hasWithout) return false;
      }
      if (tokens.length) {
        const searchLine = tool.__searchLine ?? "";
        return tokens.every((token) => searchLine.includes(token));
      }
      return true;
    });
    noPhotoState.filtered.sort((a, b) => {
      if (noPhotoState.grouping !== "none") {
        const groupCompare = resolveNoPhotoGroupingLabel(a).localeCompare(
          resolveNoPhotoGroupingLabel(b),
          "ru",
          { numeric: true, sensitivity: "base" }
        );
        if (groupCompare !== 0) return groupCompare;
      }
      const direction = noPhotoState.sortDirection === "asc" ? 1 : -1;
      return (
        resolveToolNumberValue(a).localeCompare(resolveToolNumberValue(b), "ru", {
          numeric: true,
        }) * direction
      );
    });
    renderNoPhotoList();
  };

  const getNoPhotoGroupingCaption = () => {
    if (noPhotoState.grouping === "group") return "Группа";
    if (noPhotoState.grouping === "object") return objectTrackingEnabled ? "Объект" : "";
    if (noPhotoState.grouping === "status") return "Статус";
    if (noPhotoState.grouping === "manufacturer") return "Производитель";
    return "";
  };

  const getNoPhotoStatusLabel = (value) => {
    const normalized = String(value ?? "").trim();
    return normalized === "Рабочий" ? "Исправный" : normalized;
  };

  const resolveNoPhotoGroupingLabel = (tool) => {
    if (noPhotoState.grouping === "group") {
      return String(tool?.["Граппа инструментов"] ?? "").trim() || "Без группы";
    }
    if (noPhotoState.grouping === "object") {
      return objectTrackingEnabled
        ? String(tool?.["Объект"] ?? "").trim() || "Без объекта"
        : "";
    }
    if (noPhotoState.grouping === "status") {
      return getNoPhotoStatusLabel(tool?.["Статус"]) || "Без статуса";
    }
    if (noPhotoState.grouping === "manufacturer") {
      return String(tool?.["Производитель"] ?? "").trim() || "Не указан";
    }
    return "";
  };

  const getNoPhotoFilterAllValues = (containerEl) => {
    if (!containerEl) return [];
    return Array.from(
      containerEl.querySelectorAll('input[type="checkbox"][data-no-photo-filter-checkbox]')
    )
      .map((checkboxEl) => String(checkboxEl.value ?? "").trim())
      .filter(Boolean);
  };

  const renderNoPhotoFilterTriggerLabel = (containerEl, selectedValues) => {
    if (!containerEl) return;
    const triggerEl = containerEl.querySelector("[data-no-photo-filter-trigger]");
    if (!triggerEl) return;
    const key = String(containerEl.dataset.noPhotoFilter ?? "").trim();
    const safeValues = Array.isArray(selectedValues) ? selectedValues : [];
    const totalOptions = getNoPhotoFilterAllValues(containerEl).length;
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
      displayValues.length === 1 ? displayValues[0] : `Выбрано: ${displayValues.length}`;
  };

  const syncNoPhotoFilterSelectAllButton = (containerEl) => {
    if (!containerEl) return;
    const clearEl = containerEl.querySelector("[data-no-photo-filter-clear]");
    if (!clearEl) return;
    const allValues = getNoPhotoFilterAllValues(containerEl);
    const checkedCount = containerEl.querySelectorAll(
      'input[type="checkbox"][data-no-photo-filter-checkbox]:checked'
    ).length;
    const isAllSelected = allValues.length > 0 && checkedCount === allValues.length;
    clearEl.textContent = isAllSelected ? "Отменить всё" : "Выбрать всё";
  };

  const syncNoPhotoFilterValue = (key, values) => {
    const selectedValues = Array.isArray(values) ? values : [];
    const containerEl = contentEl.querySelector(
      `.tools-filter-dropdown[data-no-photo-filter="${key}"]`
    );
    if (!containerEl) return;
    containerEl
      .querySelectorAll('input[type="checkbox"][data-no-photo-filter-checkbox]')
      .forEach((checkboxEl) => {
        checkboxEl.checked = selectedValues.includes(String(checkboxEl.value ?? "").trim());
      });
    renderNoPhotoFilterTriggerLabel(containerEl, selectedValues);
    syncNoPhotoFilterSelectAllButton(containerEl);
  };

  const fillNoPhotoFilterOptions = (key, values) => {
    const containerEl = contentEl.querySelector(
      `.tools-filter-dropdown[data-no-photo-filter="${key}"]`
    );
    if (!containerEl) return;
    const optionsEl = containerEl.querySelector("[data-no-photo-filter-options]");
    if (!optionsEl) return;
    const currentValues = Array.isArray(noPhotoState.filters[key])
      ? noPhotoState.filters[key]
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
      const id = `no-photo-filter-${key}-${index}`;
      const optionLabelEl = document.createElement("label");
      optionLabelEl.className = "tools-filter-dropdown__option";
      optionLabelEl.setAttribute("for", id);
      const checkboxEl = document.createElement("input");
      checkboxEl.type = "checkbox";
      checkboxEl.id = id;
      checkboxEl.value = entry.value;
      checkboxEl.checked = currentValues.includes(entry.value);
      checkboxEl.dataset.noPhotoFilterCheckbox = key;
      const textEl = document.createElement("span");
      textEl.textContent = entry.label;
      optionLabelEl.append(checkboxEl, textEl);
      optionsEl.appendChild(optionLabelEl);
    });
    noPhotoState.filters[key] = currentValues.filter((value) =>
      availableValues.some((entry) => entry.value === value)
    );
    syncNoPhotoFilterValue(key, noPhotoState.filters[key]);
  };

  const prepareNoPhotoFilters = () => {
    const collectValues = (field) => {
      const set = new Set();
      noPhotoState.tools.forEach((tool) => {
        const value = String(tool?.[field] ?? "").trim();
        if (value) set.add(value);
      });
      return Array.from(set).sort((a, b) =>
        a.localeCompare(b, "ru", { numeric: true })
      );
    };
    fillNoPhotoFilterOptions("group", collectValues("Граппа инструментов"));
    fillNoPhotoFilterOptions("object", collectValues("Объект"));
    fillNoPhotoFilterOptions(
      "status",
      collectValues("Статус").map((value) => ({
        value,
        label: value === "Рабочий" ? "Исправный" : value,
      }))
    );
    fillNoPhotoFilterOptions("responsible", collectValues("Ответственный"));
    fillNoPhotoFilterOptions("name", collectValues("Наименование"));
    fillNoPhotoFilterOptions("manufacturer", collectValues("Производитель"));
    fillNoPhotoFilterOptions("model", collectValues("Модель"));
    fillNoPhotoFilterOptions("photo", [
      { value: "with", label: "С фото" },
      { value: "without", label: "Без фото" },
    ]);
  };

  const loadNoPhotoTools = async () => {
    const orgFolder = context.orgFolderName ?? "";
    noPhotoState.orgFolder = orgFolder;
    if (!orgFolder) {
      noPhotoState.tools = [];
      noPhotoState.filtered = [];
      noPhotoState.toolMap.clear();
      setNoPhotoSubtitle("Не удалось определить организацию.");
      renderNoPhotoList();
      return;
    }
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    let rawTools = [];
    try {
      const raw = await loadJson(toolsPath);
      rawTools = Array.isArray(raw) ? raw : Array.isArray(raw?.tools) ? raw.tools : [];
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов.", error);
      rawTools = [];
    }
    noPhotoState.toolMap.clear();
    noPhotoState.tools = rawTools
      .filter((tool) => {
        const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
        return !(Number.isFinite(photoCount) && photoCount > 0);
      })
      .map((tool, index) => {
        const selectionId = buildToolSelectionId(tool, index);
        const entry = {
          ...tool,
          __searchLine: buildAddPhotoSearchLine(tool),
          __noPhotoId: selectionId,
        };
        noPhotoState.toolMap.set(selectionId, entry);
        return entry;
      })
      .sort((a, b) =>
        String(a?.["Номер"] ?? "").localeCompare(String(b?.["Номер"] ?? ""), "ru", {
          numeric: true,
        })
      );
    prepareNoPhotoFilters();
    applyNoPhotoFilters();
  };

  const openNoPhotoModal = async () => {
    if (!noPhotoModalEl) return;
    ensureNoPhotoControls();
    noPhotoModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setNoPhotoSubtitle("Загружаем список...");
    await loadNoPhotoTools();
    if (
      noPhotoSearchInput &&
      (typeof window === "undefined" ||
        !window.matchMedia ||
        !window.matchMedia("(max-width: 520px)").matches)
    ) {
      noPhotoSearchInput.focus();
    }
  };

  const closeNoPhotoModal = () => {
    if (!noPhotoModalEl) return;
    noPhotoModalEl.classList.add("is-hidden");
    document.body.style.overflow = "";
  };

  if (noPhotoBackdropEl) {
    noPhotoBackdropEl.addEventListener("click", closeNoPhotoModal);
  }
  if (noPhotoCloseButton) {
    noPhotoCloseButton.addEventListener("click", closeNoPhotoModal);
  }
  noPhotoModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNoPhotoModal();
    }
  });

  if (noPhotoSearchInput) {
    noPhotoSearchInput.addEventListener("input", (event) => {
      noPhotoState.search = String(event.target.value ?? "").toLowerCase();
      applyNoPhotoFilters();
    });
  }

  const setNoPhotoFiltersOpen = (isOpen) => {
    if (noPhotoFiltersPanelEl) {
      noPhotoFiltersPanelEl.classList.toggle("is-open", isOpen);
    }
    if (noPhotoFiltersToggleEl) {
      noPhotoFiltersToggleEl.setAttribute("aria-expanded", String(isOpen));
    }
  };

  const ensureNoPhotoControls = () => {
    if (noPhotoState.controlsReady || !noPhotoFiltersToggleEl) return;
    const actionsEl = noPhotoFiltersToggleEl.closest(".tools-actions");
    if (!actionsEl) return;
    actionsEl.classList.remove("is-hidden");
    noPhotoFiltersToggleEl.classList.remove("is-hidden");
    noPhotoFiltersToggleEl.innerHTML = `
      <span class="tools-filters-toggle__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false" fill="none">
          <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <circle cx="15" cy="7" r="2.5" fill="currentColor" />
          <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <circle cx="9" cy="17" r="2.5" fill="currentColor" />
        </svg>
      </span>
    `;
    noPhotoFiltersToggleEl.title = "Фильтры";
    noPhotoFiltersToggleEl.setAttribute("aria-label", "Фильтры");

    const groupingDropdownEl = document.createElement("div");
    groupingDropdownEl.className = "tools-grouping-dropdown no-photo-controls__grouping";
    groupingDropdownEl.innerHTML = `
      <button type="button" class="tools-filters-toggle tools-grouping-toggle" aria-expanded="false" aria-label="Группировка" title="Группировка">
        <span class="tools-filters-toggle__icon tools-grouping-toggle__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M5 6.25A1.25 1.25 0 0 1 6.25 5h3.5A1.25 1.25 0 0 1 11 6.25v1.5A1.25 1.25 0 0 1 9.75 9h-3.5A1.25 1.25 0 0 1 5 7.75v-1.5Zm8 0A1.25 1.25 0 0 1 14.25 5h3.5A1.25 1.25 0 0 1 19 6.25v1.5A1.25 1.25 0 0 1 17.75 9h-3.5A1.25 1.25 0 0 1 13 7.75v-1.5Zm-4 5A1.25 1.25 0 0 1 10.25 10h3.5A1.25 1.25 0 0 1 15 11.25v1.5A1.25 1.25 0 0 1 13.75 14h-3.5A1.25 1.25 0 0 1 9 12.75v-1.5Zm-4 5A1.25 1.25 0 0 1 6.25 15h3.5A1.25 1.25 0 0 1 11 16.25v1.5A1.25 1.25 0 0 1 9.75 19h-3.5A1.25 1.25 0 0 1 5 17.75v-1.5Zm8 0A1.25 1.25 0 0 1 14.25 15h3.5A1.25 1.25 0 0 1 19 16.25v1.5A1.25 1.25 0 0 1 17.75 19h-3.5A1.25 1.25 0 0 1 13 17.75v-1.5Z" />
          </svg>
        </span>
      </button>
      <div class="tools-grouping-dropdown__menu is-hidden">
        <button type="button" class="tools-grouping-option is-active" data-no-photo-grouping-option="none">Без группировки</button>
        <button type="button" class="tools-grouping-option" data-no-photo-grouping-option="group">По группе</button>
        <button type="button" class="tools-grouping-option" data-no-photo-grouping-option="object">По объекту</button>
        <button type="button" class="tools-grouping-option" data-no-photo-grouping-option="status">По статусу</button>
        <button type="button" class="tools-grouping-option" data-no-photo-grouping-option="manufacturer">По производителю</button>
      </div>
    `;

    const sortButtonEl = document.createElement("button");
    sortButtonEl.type = "button";
    sortButtonEl.className = "tools-filters-toggle tools-sort-toggle";
    sortButtonEl.setAttribute("aria-label", "Сортировка");
    sortButtonEl.title = "Сортировка";
    sortButtonEl.innerHTML = `
      <span class="tools-sort-toggle__icon is-desc" aria-hidden="true">
        <svg class="tools-sort-toggle__chevron" viewBox="0 0 24 24" focusable="false">
          <path d="M5 8.5L12 15.5L19 8.5" />
        </svg>
      </span>
    `;

    const syncGroupingUi = () => {
      groupingDropdownEl
        .querySelectorAll("[data-no-photo-grouping-option]")
        .forEach((optionEl) => {
          const isActive = optionEl.dataset.noPhotoGroupingOption === noPhotoState.grouping;
          optionEl.classList.toggle("is-active", isActive);
        });
    };

    const syncSortUi = () => {
      const iconEl = sortButtonEl.querySelector(".tools-sort-toggle__icon");
      iconEl?.classList.toggle("is-asc", noPhotoState.sortDirection === "asc");
    };

    groupingDropdownEl.querySelector(".tools-grouping-toggle")?.addEventListener("click", () => {
      const menuEl = groupingDropdownEl.querySelector(".tools-grouping-dropdown__menu");
      const isOpen = !menuEl?.classList.contains("is-hidden");
      menuEl?.classList.toggle("is-hidden", isOpen);
      groupingDropdownEl
        .querySelector(".tools-grouping-toggle")
        ?.setAttribute("aria-expanded", String(!isOpen));
    });

    groupingDropdownEl.querySelectorAll("[data-no-photo-grouping-option]").forEach((optionEl) => {
      optionEl.addEventListener("click", () => {
        const value = String(optionEl.dataset.noPhotoGroupingOption ?? "").trim();
        if (!value || (!objectTrackingEnabled && value === "object")) return;
        noPhotoState.grouping = value;
        groupingDropdownEl
          .querySelector(".tools-grouping-dropdown__menu")
          ?.classList.add("is-hidden");
        syncGroupingUi();
        applyNoPhotoFilters();
      });
    });

    sortButtonEl.addEventListener("click", () => {
      noPhotoState.sortDirection = noPhotoState.sortDirection === "desc" ? "asc" : "desc";
      syncSortUi();
      applyNoPhotoFilters();
    });

    noPhotoFiltersToggleEl.insertAdjacentElement("beforebegin", groupingDropdownEl);
    noPhotoFiltersToggleEl.insertAdjacentElement("beforebegin", sortButtonEl);
    syncGroupingUi();
    syncSortUi();
    noPhotoState.controlsReady = true;
  };

  if (noPhotoFiltersToggleEl) {
    noPhotoFiltersToggleEl.addEventListener("click", () => {
      const isOpen = noPhotoFiltersPanelEl?.classList.contains("is-open");
      setNoPhotoFiltersOpen(!isOpen);
    });
  }

  if (typeof window !== "undefined" && noPhotoFiltersPanelEl) {
    const mediaQuery = window.matchMedia("(max-width: 520px)");
    const syncFiltersVisibility = () => {
      setNoPhotoFiltersOpen(!mediaQuery.matches);
    };
    syncFiltersVisibility();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", syncFiltersVisibility);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(syncFiltersVisibility);
    }
  }

  const positionNoPhotoFilterMenu = (menuEl, triggerEl) => {
    if (!(menuEl instanceof HTMLElement) || !(triggerEl instanceof HTMLElement)) return;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    if (!viewportHeight) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const menuRect = menuEl.getBoundingClientRect();
    const gap = 8;
    const maxTop = Math.max(gap, viewportHeight - menuRect.height - gap);
    const desiredTop = triggerRect.bottom + gap;
    const nextTop = Math.min(Math.max(desiredTop, gap), maxTop);

    menuEl.style.top = `${Math.round(nextTop)}px`;
    menuEl.style.transform = "translateX(-50%)";

    const optionsEl = menuEl.querySelector("[data-no-photo-filter-options]");
    if (!(optionsEl instanceof HTMLElement)) return;
    const maxScrollTop = Math.max(0, optionsEl.scrollHeight - optionsEl.clientHeight);
    if (maxScrollTop <= 0) {
      optionsEl.scrollTop = 0;
      return;
    }
    optionsEl.scrollTop = Math.round(maxScrollTop / 2);
  };

  noPhotoFilterDropdownEls.forEach((containerEl) => {
    const key = String(containerEl.dataset.noPhotoFilter ?? "").trim();
    if (!key) return;
    const triggerEl = containerEl.querySelector("[data-no-photo-filter-trigger]");
    const menuEl = containerEl.querySelector("[data-no-photo-filter-menu]");
    const clearEl = containerEl.querySelector("[data-no-photo-filter-clear]");
    triggerEl?.addEventListener("click", () => {
      const isOpen = !menuEl?.classList.contains("is-hidden");
      noPhotoFilterDropdownEls.forEach((dropdownEl) => {
        const nestedMenu = dropdownEl.querySelector("[data-no-photo-filter-menu]");
        nestedMenu?.classList.add("is-hidden");
        if (nestedMenu instanceof HTMLElement) {
          nestedMenu.style.removeProperty("transform");
        }
      });
      menuEl?.classList.toggle("is-hidden", isOpen);
      if (!isOpen) {
        requestAnimationFrame(() => positionNoPhotoFilterMenu(menuEl, triggerEl));
      } else if (menuEl instanceof HTMLElement) {
        menuEl.style.removeProperty("transform");
          menuEl.style.removeProperty("top");
      }
    });
    menuEl?.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.type !== "checkbox") return;
      noPhotoState.filters[key] = Array.from(
        containerEl.querySelectorAll(
          'input[type="checkbox"][data-no-photo-filter-checkbox]:checked'
        )
      )
        .map((checkboxEl) => String(checkboxEl.value ?? "").trim())
        .filter(Boolean);
      syncNoPhotoFilterValue(key, noPhotoState.filters[key]);
      applyNoPhotoFilters();
    });
    clearEl?.addEventListener("click", () => {
      const values = getNoPhotoFilterAllValues(containerEl);
      const allSelected =
        Array.isArray(noPhotoState.filters[key]) &&
        noPhotoState.filters[key].length === values.length &&
        values.length > 0;
      noPhotoState.filters[key] = allSelected ? [] : [...values];
      syncNoPhotoFilterValue(key, noPhotoState.filters[key]);
      applyNoPhotoFilters();
    });
  });

  if (typeof document !== "undefined") {
    document.addEventListener("click", (event) => {
      if (noPhotoModalEl?.classList.contains("is-hidden")) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".no-photo-controls__grouping")) return;
      if (target.closest(".tools-filter-dropdown[data-no-photo-filter]")) return;
      contentEl
        .querySelector(".no-photo-controls__grouping .tools-grouping-dropdown__menu")
        ?.classList.add("is-hidden");
      contentEl
        .querySelector(".no-photo-controls__grouping .tools-grouping-toggle")
        ?.setAttribute("aria-expanded", "false");
      noPhotoFilterDropdownEls.forEach((containerEl) => {
        containerEl
          .querySelector("[data-no-photo-filter-menu]")
          ?.classList.add("is-hidden");
      });
    });
  }



  const setRemovePhotoSubtitle = (text) => {
    if (removePhotoSubtitleEl) {
      removePhotoSubtitleEl.textContent = text;
    }
  };

  const setRemovePhotoMessage = (text = "", tone = "") => {
    if (!removePhotoMessageEl) return;
    removePhotoMessageEl.textContent = text;
    removePhotoMessageEl.classList.toggle("is-error", tone === "error");
    removePhotoMessageEl.classList.toggle("is-success", tone === "success");
    if (!tone) {
      removePhotoMessageEl.classList.remove("is-error", "is-success");
    }
  };

  const setRemovePhotoView = (view) => {
    removePhotoViews.forEach((viewEl) => {
      const isActive = viewEl.dataset.removePhotoView === view;
      viewEl.classList.toggle("is-hidden", !isActive);
    });
    if (view === "list") {
      setRemovePhotoMessage("");
    }
  };

  const clearRemovePhotoList = () => {
    if (removePhotoListEl) {
      removePhotoListEl.innerHTML = "";
    }
  };

  const buildRemovePhotoThumb = ({
    orgFolder,
    toolNumber,
    hasPhoto,
    altText,
  }) => {
    const thumb = document.createElement("div");
    thumb.className = "tools-table__thumb remove-photo-thumb";
    const img = document.createElement("img");
    img.className = "tools-table__thumb-image";
    img.alt = altText;
    applyToolPhotoWithFallback({
      img,
      orgFolder,
      toolNumber,
      hasPhoto,
    });
    thumb.appendChild(img);
    return thumb;
  };

  const renderRemovePhotoTable = (items) => {
    const table = document.createElement("div");
    table.className = "tools-table tools-table--remove-photo";

    items.forEach((tool) => {
      const row = document.createElement("div");
      row.className = "tools-table__row remove-photo-row";
      row.dataset.removePhotoToolId = tool.__removeId;
      row.dataset.removePhotoSelect = "true";
      row.setAttribute("role", "button");
      row.tabIndex = 0;

      const numberCell = document.createElement("div");
      numberCell.className = "tools-table__cell tools-table__cell--number";
      const number = resolveToolNumberValue(tool);
      const count = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
      const safeCount = Number.isFinite(count) ? count : 0;
      const photoCountText = String(safeCount);
      const numberValueEl = document.createElement("div");
      numberValueEl.className = "tools-table__number-value";
      numberValueEl.textContent = number || "—";
      const photoCountEl = document.createElement("div");
      photoCountEl.className = "remove-photo-count remove-photo-count--number";
      photoCountEl.textContent = photoCountText;
      photoCountEl.title = "Количество фото";
      numberCell.append(numberValueEl, photoCountEl);

      const photoBadgeEl = document.createElement("div");
      photoBadgeEl.className = "remove-photo-badge";
      photoBadgeEl.setAttribute("aria-label", `У инструмента ${photoCountText} фото`);
      photoBadgeEl.textContent = photoCountText;

      const objectCell = objectTrackingEnabled ? buildToolObjectCell(tool) : null;

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
      const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
      meta.innerHTML = `
        <div>Производитель: ${manufacturer || "—"} · Модель: ${model || "—"}</div>
        <div>Бух.номер: ${accountingNumber || "—"}</div>
        <div>${formatToolCostLabel(tool)}</div>
      `;
      infoCell.append(title, meta);

      const photoCell = document.createElement("div");
      photoCell.className = "tools-table__cell tools-table__cell--thumb";
      const photoNumber = resolveToolPhotoNumber(tool);
      const thumb = buildRemovePhotoThumb({
        orgFolder: removePhotoState.orgFolder,
        toolNumber: photoNumber,
        hasPhoto: safeCount > 0,
        altText: name || "Инструмент",
      });
      photoCell.appendChild(thumb);

      row.append(...[numberCell, objectCell, infoCell, photoCell, photoBadgeEl].filter(Boolean));
      table.appendChild(row);
    });

    return table;
  };

  const renderRemovePhotoList = () => {
    if (!removePhotoListEl) return;
    clearRemovePhotoList();
    const items = removePhotoState.filtered;
    removePhotoListEl.classList.add("is-table");
    removePhotoListEl.appendChild(renderRemovePhotoTable(items));
    if (removePhotoEmptyEl) {
      removePhotoEmptyEl.classList.toggle("is-hidden", items.length > 0);
    }
    setRemovePhotoSubtitle(
      `Показано ${items.length} из ${removePhotoState.tools.length}`
    );
  };

  const applyRemovePhotoFilters = () => {
    const search = removePhotoState.search.trim();
    const tokens = search ? search.split(/\s+/).filter(Boolean) : [];
    if (!tokens.length) {
      removePhotoState.filtered = removePhotoState.tools.slice();
      renderRemovePhotoList();
      return;
    }
    const numericTokens = tokens
      .map((token) => token.replace(/\D/g, ""))
      .filter(Boolean);
    const isNumericSearch = numericTokens.length === tokens.length;
    if (isNumericSearch) {
      const numberMatches = removePhotoState.tools.filter((tool) => {
        const searchLine = tool.__numberSearchLine ?? "";
        return numericTokens.every((token) => searchLine.includes(token));
      });
      if (numberMatches.length) {
        removePhotoState.filtered = numberMatches;
        renderRemovePhotoList();
        return;
      }
      removePhotoState.filtered = removePhotoState.tools.filter((tool) => {
        const searchLine = tool.__accountingSearchLine ?? "";
        return numericTokens.every((token) => searchLine.includes(token));
      });
      renderRemovePhotoList();
      return;
    }
    removePhotoState.filtered = removePhotoState.tools.filter((tool) => {
      const searchLine = tool.__searchLine ?? "";
      return tokens.every((token) => searchLine.includes(token));
    });
    renderRemovePhotoList();
  };

  const loadRemovePhotoTools = async () => {
    const orgFolder = context.orgFolderName ?? "";
    removePhotoState.orgFolder = orgFolder;
    if (!orgFolder) {
      removePhotoState.tools = [];
      removePhotoState.filtered = [];
      setRemovePhotoSubtitle("Не удалось определить организацию.");
      renderRemovePhotoList();
      return;
    }
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    let rawTools = [];
    try {
      const raw = await loadJson(toolsPath);
      rawTools = Array.isArray(raw) ? raw : Array.isArray(raw?.tools) ? raw.tools : [];
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов.", error);
      rawTools = [];
    }
    removePhotoState.toolMap.clear();
    removePhotoState.tools = rawTools
      .filter((tool) => {
        const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
        return Number.isFinite(photoCount) && photoCount > 0;
      })
      .map((tool, index) => {
        const entry = {
          ...tool,
          __removeId: `remove-${index}`,
          __searchLine: buildRemovePhotoSearchLine(tool),
          __numberSearchLine: buildRemovePhotoNumberSearchLine(tool?.["Номер"]),
          __accountingSearchLine: buildRemovePhotoNumberSearchLine(
            tool?.["Бух.номер"]
          ),
        };
        removePhotoState.toolMap.set(entry.__removeId, entry);
        return entry;
      })
      .sort((a, b) =>
        resolveToolNumberValue(a).localeCompare(resolveToolNumberValue(b), "ru", {
          numeric: true,
        })
      );
    applyRemovePhotoFilters();
  };

  const resetRemovePhotoSelection = () => {
    removePhotoState.selectedTool = null;
    removePhotoState.toolPhotos = [];
    removePhotoState.selectedFiles.clear();
    if (removePhotoToolTitleEl) removePhotoToolTitleEl.textContent = "";
    if (removePhotoToolMetaEl) removePhotoToolMetaEl.textContent = "";
    if (removePhotoPhotosEl) removePhotoPhotosEl.innerHTML = "";
    if (removePhotoPhotosEmptyEl) {
      removePhotoPhotosEmptyEl.classList.add("is-hidden");
    }
    if (removePhotoSelectedCountEl) {
      removePhotoSelectedCountEl.textContent = "0";
    }
    if (removePhotoDeleteButton) {
      removePhotoDeleteButton.disabled = true;
    }
  };

  const getToolNumberFromFileName = (fileName) => {
    if (!fileName) return "";
    const match = String(fileName).match(/^(?:№|N)?\s*(\d+)/i);
    return match ? match[1] : "";
  };

  const listPhotoFilesViaEndpoint = async (orgFolder) => {
    if (!orgFolder) return [];
    const payload = JSON.stringify({
      entries: [
        {
          type: "list-photos",
          path: `${orgFolder}/Фото инструментов`,
          ...buildUploadUserMeta({ organizationName: context.orgFullName }),
        },
      ],
    });
    const response = await fetch(saveEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    let responseText = "";
    try {
      responseText = await response.text();
    } catch (error) {
      console.warn("Не удалось прочитать ответ сервера.", error);
    }
    if (!response.ok) {
      let errorText = responseText;
      if (responseText) {
        try {
          const parsed = JSON.parse(responseText);
          errorText =
            parsed?.error ??
            parsed?.message ??
            (typeof parsed === "string" ? parsed : responseText);
        } catch (error) {
          // ignore json parse errors
        }
      }
      const message =
        errorText ||
        `Не удалось загрузить каталог фото. Код ответа: ${response.status}.`;
      throw new Error(message);
    }
    if (!responseText) return [];
    try {
      const parsed = JSON.parse(responseText);
      return Array.isArray(parsed?.files) ? parsed.files : [];
    } catch (error) {
      console.warn("Не удалось распарсить список фото.", error);
      return [];
    }
  };

  const loadToolPhotoFiles = async (orgFolder, ...toolNumbers) => {
    if (!orgFolder) return { files: [], errorMessage: "" };
    const numbers = toolNumbers
      .flat()
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);
    if (!numbers.length) return { files: [], errorMessage: "" };
    const variants = numbers.flatMap((value) => getToolNumberVariants(value));
    if (!variants.length) return { files: [], errorMessage: "" };
    const normalizedVariants = new Set(
      variants.map((variant) => normalizeToolNumberValue(variant))
    );
    const files = [];
    const seen = new Set();
    const registerFileName = (fileName) => {
      if (!fileName) return;
      let decodedName = fileName;
      try {
        decodedName = decodeURIComponent(fileName);
      } catch (error) {
        decodedName = fileName;
      }
      const extension = decodedName.split(".").pop()?.toLowerCase() || "";
      if (!toolPhotoExtensions.has(extension)) return;
      const leadingNumber = getToolNumberFromFileName(decodedName);
      if (!leadingNumber) return;
      const normalized = normalizeToolNumberValue(leadingNumber);
      if (
        !normalizedVariants.has(normalized) &&
        !normalizedVariants.has(leadingNumber)
      ) {
        return;
      }
      if (seen.has(decodedName)) return;
      seen.add(decodedName);
      files.push({
        name: decodedName,
        url: `./${orgFolder}/Фото инструментов/${encodeURIComponent(decodedName)}`,
      });
    };
    let endpointError = "";
    try {
      const endpointFiles = await listPhotoFilesViaEndpoint(orgFolder);
      if (endpointFiles.length) {
        endpointFiles.forEach(registerFileName);
        return {
          files: files.sort((a, b) =>
            a.name.localeCompare(b.name, "ru", { numeric: true })
          ),
          errorMessage: "",
        };
      }
    } catch (error) {
      endpointError = error?.message || "";
    }
    const folderPath = `./${orgFolder}/Фото инструментов/`;
    let response;
    let errorMessage = "";
    try {
      response = await fetch(folderPath, { cache: "no-store" });
    } catch (error) {
      console.warn("Не удалось загрузить каталог фото.", error);
      return {
        files: [],
        errorMessage: "Не удалось загрузить каталог фото. Проверьте подключение.",
      };
    }
    if (!response.ok) {
      return {
        files: [],
        errorMessage:
          endpointError ||
          `Не удалось загрузить каталог фото. Код ответа: ${response.status}.`,
      };
    }
    const html = await response.text();
    const links = extractDirectoryListingLinks(html);
    links.forEach((link) => {
      const fileName = extractFileNameFromHref(link);
      registerFileName(fileName);
    });
    return {
      files: files.sort((a, b) =>
        a.name.localeCompare(b.name, "ru", { numeric: true })
      ),
      errorMessage,
    };
  };

  const updateRemovePhotoSelection = () => {
    if (removePhotoSelectedCountEl) {
      removePhotoSelectedCountEl.textContent = String(
        removePhotoState.selectedFiles.size
      );
    }
    if (removePhotoDeleteButton) {
      removePhotoDeleteButton.disabled = removePhotoState.selectedFiles.size === 0;
    }
  };

  const renderRemovePhotoPhotos = () => {
    if (!removePhotoPhotosEl) return;
    removePhotoPhotosEl.innerHTML = "";
    removePhotoState.selectedFiles.clear();
    updateRemovePhotoSelection();
    const files = removePhotoState.toolPhotos;
    if (!files.length) {
      if (removePhotoPhotosEmptyEl) {
        removePhotoPhotosEmptyEl.classList.remove("is-hidden");
      }
      return;
    }
    if (removePhotoPhotosEmptyEl) {
      removePhotoPhotosEmptyEl.classList.add("is-hidden");
    }
    files.forEach((file) => {
      const card = document.createElement("label");
      card.className = "remove-photo-card";
      card.dataset.photoName = file.name;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "remove-photo-checkbox";
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          removePhotoState.selectedFiles.add(file.name);
          card.classList.add("is-selected");
        } else {
          removePhotoState.selectedFiles.delete(file.name);
          card.classList.remove("is-selected");
        }
        updateRemovePhotoSelection();
      });

      const img = document.createElement("img");
      img.src = file.url;
      img.alt = "Фото инструмента";
      img.loading = "lazy";
      img.className = "remove-photo-image";

      const name = document.createElement("span");
      name.className = "remove-photo-name";
      name.textContent = file.name;

      card.append(checkbox, img, name);
      removePhotoPhotosEl.appendChild(card);
    });
  };

  const openRemovePhotoTool = async (tool) => {
    if (!tool) return;
    resetRemovePhotoSelection();
    removePhotoState.selectedTool = tool;
    const toolNumber = resolveToolNumberValue(tool);
    const toolName = String(tool?.["Наименование"] ?? "").trim() || "Инструмент";
    const manufacturer = String(tool?.["Производитель"] ?? "").trim();
    const model = String(tool?.["Модель"] ?? "").trim();
    if (removePhotoToolTitleEl) {
      removePhotoToolTitleEl.textContent = `${toolName} · №${toolNumber || "—"}`;
    }
    if (removePhotoToolMetaEl) {
      removePhotoToolMetaEl.textContent = [manufacturer, model]
        .filter(Boolean)
        .join(" · ");
    }
    setRemovePhotoSubtitle("");
    setRemovePhotoMessage("Загружаем фото...");
    setRemovePhotoView("photos");
    const primaryPhotoNumber = resolveToolPhotoNumber(tool);
    const numberValue = String(tool?.["Номер"] ?? "").trim();
    const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
    const { files, errorMessage } = await loadToolPhotoFiles(
      removePhotoState.orgFolder,
      primaryPhotoNumber,
      numberValue,
      accountingNumber
    );
    removePhotoState.toolPhotos = files;
    if (errorMessage) {
      setRemovePhotoMessage(errorMessage, "error");
    } else {
      setRemovePhotoMessage("");
    }
    renderRemovePhotoPhotos();
  };

  const syncToolsPhotoCountAfterDelete = (toolNumber, nextCount) => {
    if (nextCount === null) return;
    const normalized = normalizeToolNumberValue(toolNumber);
    const updateTool = (tool) => {
      if (normalizeToolNumberValue(tool?.["Номер"] ?? "") !== normalized) {
        return tool;
      }
      return {
        ...tool,
        "Количество фото": nextCount,
      };
    };
    if (toolsState.tools.length) {
      toolsState.tools = toolsState.tools.map(updateTool);
      toolsState.filtered = toolsState.filtered.map(updateTool);
      if (toolsModalEl && !toolsModalEl.classList.contains("is-hidden")) {
        applyToolsFilters();
      }
    }
    removePhotoState.tools = removePhotoState.tools
      .map(updateTool)
      .filter((tool) => {
        const count = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
        return Number.isFinite(count) && count > 0;
      });
    applyRemovePhotoFilters();
    if (
      toolsEditState.tool &&
      normalizeToolNumberValue(toolsEditState.tool?.["Номер"] ?? "") ===
        normalized
    ) {
      toolsEditState.tool = {
        ...toolsEditState.tool,
        "Количество фото": nextCount,
      };
      updateToolsEditPhotoCount(nextCount);
    }
  };

  const handleRemovePhotoDelete = async () => {
    const tool = removePhotoState.selectedTool;
    if (!tool) return;
    const orgFolder = removePhotoState.orgFolder;
    if (!orgFolder) return;
    const selectedFiles = Array.from(removePhotoState.selectedFiles);
    if (!selectedFiles.length) return;
    const confirmDelete = window.confirm(
      `Удалить выбранные фото (${selectedFiles.length})?`
    );
    if (!confirmDelete) return;
    setRemovePhotoMessage("Удаляем фото...");
    try {
      const deleteEntries = selectedFiles.map((fileName) => ({
        type: "delete-file",
        path: `${orgFolder}/Фото инструментов/${fileName}`,
        ...buildUploadUserMeta({ organizationName: context.orgFullName }),
      }));
      await saveEntriesViaEndpoint(deleteEntries);

      const tools = await loadToolsData(orgFolder);
      const normalized = normalizeToolNumberValue(tool?.["Номер"] ?? "");
      const toolIndex = tools.findIndex(
        (entry) =>
          normalizeToolNumberValue(entry?.["Номер"] ?? "") === normalized
      );
      let nextCount = null;
      if (toolIndex >= 0) {
        const current = Number.parseInt(
          tools[toolIndex]?.["Количество фото"] ?? 0,
          10
        );
        const safeCurrent = Number.isFinite(current) ? current : 0;
        nextCount = Math.max(0, safeCurrent - selectedFiles.length);
        tools[toolIndex] = {
          ...tools[toolIndex],
          "Количество фото": nextCount,
        };
        await saveEntries([
          {
            path: `${orgFolder}/База с инструментами.json`,
            data: tools,
            ...buildUploadUserMeta({ organizationName: context.orgFullName }),
          },
        ]);
      }

      removePhotoState.toolPhotos = removePhotoState.toolPhotos.filter(
        (file) => !removePhotoState.selectedFiles.has(file.name)
      );
      removePhotoState.selectedFiles.clear();
      updateRemovePhotoSelection();
      renderRemovePhotoPhotos();
      syncToolsPhotoCountAfterDelete(tool?.["Номер"] ?? "", nextCount);
      if (!removePhotoState.toolPhotos.length) {
        setRemovePhotoMessage("Фото удалены. Возвращаемся к списку.", "success");
        setTimeout(() => {
          setRemovePhotoView("list");
          resetRemovePhotoSelection();
        }, 500);
        return;
      }
      setRemovePhotoMessage("Фото удалены.", "success");
    } catch (error) {
      console.error(error);
      setRemovePhotoMessage(
        "Не удалось удалить фото. Проверьте сервер.",
        "error"
      );
    }
  };

  const openRemovePhotoModal = async () => {
    if (!toolsModalEl) return;
    resetToolsTopZoneStability();
    toolsState.mode = "remove-photo";
    toolsState.view = "table";
    toolsState.searchSortDirection = "desc";
    toolsState.activeReplacementResponsible = "";
    setToolsStatusStandaloneVisibility(false);
    setToolsTitle("Удалить фото");
    setToolsResponsibleFilterVisibility(true);
    syncToolsModalModeClass();
    updateToolsReplacementPendingLinkVisibility();
    syncToolsMapViewButtonVisibility();
    toolsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    setToolsSubtitle("Загружаем инструменты с фото...");
    const numberConfig = await resolveToolsNumberConfig();
    updateToolsNumberConfig(numberConfig);
    await loadBaseTools();
    toolsState.tools = toolsState.tools.filter((tool) => {
      const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
      return Number.isFinite(photoCount) && photoCount > 0;
    });
    toolsState.toolMap = new Map(
      toolsState.tools.map((tool) => [tool.__selectionId, tool])
    );
    prepareToolsFilters();
    applyToolsFilters();
    setToolsSubtitle(
      toolsState.tools.length
        ? `Показано ${toolsState.filtered.length} из ${toolsState.tools.length}`
        : "Инструменты с фото не найдены."
    );
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

  const closeRemovePhotoModal = ({ keepBodyLocked = false } = {}) => {
    if (!removePhotoModalEl) return;
    removePhotoModalEl.classList.add("is-hidden");
    const keepToolsListLocked =
      keepBodyLocked ||
      (toolsModalEl &&
        !toolsModalEl.classList.contains("is-hidden") &&
        toolsState.mode === "remove-photo");
    if (!keepToolsListLocked) {
      document.body.style.overflow = "";
    }
  };

  if (removePhotoBackdropEl) {
