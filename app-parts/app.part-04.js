
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    const sourceResponsible =
      scope === "responsible" ? String(responsibleName ?? "").trim() : user?.full_name ?? "";
    const sourceStatus = scope === "status" ? String(statusName ?? "").trim() : "";
    const userNameKey = normalizePersonName(sourceResponsible);
    const statusKey = sourceStatus.toLocaleLowerCase("ru");

    let rawTools = [];
    try {
      const raw = await loadJson(toolsPath);
      rawTools = Array.isArray(raw) ? raw : Array.isArray(raw?.tools) ? raw.tools : [];
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов для выгрузки.", error);
      if (downloadMessageEl) {
        downloadMessageEl.textContent =
          "Не удалось загрузить базу инструментов. Попробуйте позже.";
      }
      return;
    }

    const selectedTools = rawTools
      .filter((tool) => {
        if (scope === "all") {
          return true;
        }
        if (scope === "no-photo") {
          const photoCount = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
          return !(Number.isFinite(photoCount) && photoCount > 0);
        }
        if (scope === "responsible") {
          return normalizePersonName(tool?.["Ответственный"] ?? "") === userNameKey;
        }
        if (scope === "status") {
          return String(tool?.["Статус"] ?? "").trim().toLocaleLowerCase("ru") === statusKey;
        }
        return normalizePersonName(tool?.["Ответственный"] ?? "") === userNameKey;
      })
      .sort((a, b) =>
        resolveToolNumberValue(a).localeCompare(resolveToolNumberValue(b), "ru", {
          numeric: true,
        })
      );

    if (!selectedTools.length) {
      if (downloadMessageEl) {
        downloadMessageEl.textContent =
          scope === "all"
            ? "В базе пока нет инструментов для выгрузки."
            : scope === "no-photo"
              ? "В базе пока нет инструментов без фото."
            : scope === "status"
              ? "По выбранному статусу нет инструментов для выгрузки."
            : scope === "responsible"
              ? "У выбранного ответственного нет инструментов для выгрузки."
              : "У вас пока нет инструментов для выгрузки.";
      }
      return;
    }

    const isStatusExport = scope === "status";
    const includeResponsibleColumn = isStatusExport || scope === "all" || scope === "no-photo";

    const header = isStatusExport
      ? [
          "Номер",
          "Бух.номер",
          "Наименование",
          "Производитель",
          "Модель",
          "Стоимость",
          "Дата покупки",
          ...(objectTrackingEnabled ? ["Объект"] : []),
          "Серийный номер",
          "Граппа инструментов",
          "Ответственный",
        ]
      : [
          "Номер",
          "Бух.номер",
          "Наименование",
          "Производитель",
          "Модель",
          "Стоимость",
          "Дата покупки",
          ...(includeResponsibleColumn ? ["Ответственный"] : []),
          ...(objectTrackingEnabled ? ["Объект"] : []),
          "Серийный номер",
          "Граппа инструментов",
          "Статус",
        ];
    const rows = selectedTools.map((tool) => [
      ...(isStatusExport
        ? [
            String(tool?.["Номер"] ?? "").trim(),
            String(tool?.["Бух.номер"] ?? "").trim(),
            String(tool?.["Наименование"] ?? "").trim(),
            String(tool?.["Производитель"] ?? "").trim(),
            String(tool?.["Модель"] ?? "").trim(),
            String(tool?.["Стоимость"] ?? "").trim(),
            String(tool?.["Дата покупки"] ?? "").trim(),
            ...(objectTrackingEnabled ? [String(tool?.["Объект"] ?? "").trim()] : []),
            String(tool?.["Серийный номер"] ?? "").trim(),
            String(tool?.["Граппа инструментов"] ?? "").trim(),
            String(tool?.["Ответственный"] ?? "").trim(),
          ]
        : [
            String(tool?.["Номер"] ?? "").trim(),
            String(tool?.["Бух.номер"] ?? "").trim(),
            String(tool?.["Наименование"] ?? "").trim(),
            String(tool?.["Производитель"] ?? "").trim(),
            String(tool?.["Модель"] ?? "").trim(),
            String(tool?.["Стоимость"] ?? "").trim(),
            String(tool?.["Дата покупки"] ?? "").trim(),
            ...(includeResponsibleColumn
              ? [String(tool?.["Ответственный"] ?? "").trim()]
              : []),
            ...(objectTrackingEnabled ? [String(tool?.["Объект"] ?? "").trim()] : []),
            String(tool?.["Серийный номер"] ?? "").trim(),
            String(tool?.["Граппа инструментов"] ?? "").trim(),
            String(tool?.["Статус"] ?? "").trim(),
          ]),
    ]);

    const workbook = window.XLSX.utils.book_new();
    const sheet = window.XLSX.utils.aoa_to_sheet([header, ...rows]);
    const sheetTitle = buildExportSheetTitle(scope, scope === "status" ? sourceStatus : sourceResponsible);
    window.XLSX.utils.book_append_sheet(workbook, sheet, sheetTitle);

    const exportDate = new Date();
    const exportOwnerName =
      scope === "all"
        ? "Все инструменты"
        : scope === "no-photo"
          ? "Без фото"
        : scope === "status"
          ? sourceStatus || "Статус"
        : scope === "responsible"
          ? sourceResponsible || "Ответственный"
          : user?.full_name;
    const fileName = buildExportFileName(exportOwnerName, exportDate);

    try {
      const workbookArray = window.XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const fileBlob = new Blob([workbookArray], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      let serverFileUrl = "";
      try {
        serverFileUrl = await saveExportFileOnServer(orgFolder, fileName, fileBlob);
      } catch (error) {
        console.warn("Не удалось сохранить выгрузку на сервере.", error);
      }

      const shareSupported =
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        typeof navigator.share === "function";
      if (shareSupported) {
        const excelFile = new File([fileBlob], fileName, { type: fileBlob.type });
        if (navigator.canShare({ files: [excelFile] })) {
          try {
            await navigator.share({
              files: [excelFile],
              title: sheetTitle,
              text: "Выгрузка Excel",
            });
          } catch (error) {
            console.warn("Не удалось поделиться выгрузкой через системный диалог.", error);
          }
        }
      }

      if (preparedDownloadUrl) {
        URL.revokeObjectURL(preparedDownloadUrl);
      }
      preparedDownloadUrl = URL.createObjectURL(fileBlob);
      showDownloadReadyMessage(fileBlob, preparedDownloadUrl, fileName, serverFileUrl);
    } catch (error) {
      console.error("Не удалось скачать Excel файл.", error);
      if (downloadMessageEl) {
        downloadMessageEl.textContent =
          "Не удалось скачать Excel. Попробуйте открыть приложение в веб-версии Telegram или в браузере.";
      }
    }
  };

  const renderResponsibleDownloadOptions = (allTools, query = "") => {
    if (!downloadResponsibleListEl) return;
    downloadResponsibleListEl.innerHTML = "";
    const normalizedQuery = normalizePersonName(query);
    const names = collectResponsibleNamesForDownload(allTools);
    const filtered = !normalizedQuery
      ? names
      : names.filter((fullName) => normalizePersonName(fullName).includes(normalizedQuery));

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "download-responsible__empty";
      empty.textContent = names.length
        ? "Ничего не найдено. Измените запрос."
        : "В базе пока нет ответственных.";
      downloadResponsibleListEl.appendChild(empty);
      return;
    }

    filtered.forEach((fullName) => {
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.className = "download-responsible__option";
      optionButton.textContent = formatFullName(fullName);
      optionButton.addEventListener("click", () => {
        void downloadToolsExcel({ scope: "responsible", responsibleName: fullName });
      });
      downloadResponsibleListEl.appendChild(optionButton);
    });
  };

  const renderStatusDownloadOptions = (allTools, query = "") => {
    if (!downloadResponsibleListEl) return;
    downloadResponsibleListEl.innerHTML = "";
    const normalizedQuery = String(query ?? "").trim().toLocaleLowerCase("ru");
    const statuses = collectStatusesForDownload(allTools);
    const filtered = !normalizedQuery
      ? statuses
      : statuses.filter((status) => status.toLocaleLowerCase("ru").includes(normalizedQuery));

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "download-responsible__empty";
      empty.textContent = statuses.length
        ? "Ничего не найдено. Измените запрос."
        : "В базе пока нет статусов.";
      downloadResponsibleListEl.appendChild(empty);
      return;
    }

    filtered.forEach((status) => {
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.className = "download-responsible__option";
      optionButton.textContent = status;
      optionButton.addEventListener("click", () => {
        void downloadToolsExcel({ scope: "status", statusName: status });
      });
      downloadResponsibleListEl.appendChild(optionButton);
    });
  };

  const listFolderFilesViaEndpoint = async (orgFolder, folderName) => {
    if (!orgFolder || !folderName) return [];
    const payload = JSON.stringify({
      entries: [
        {
          type: "list-photos",
          path: `${orgFolder}/${folderName}`,
          ...buildUploadUserMeta({ organizationName: context.orgFullName }),
        },
      ],
    });
    const response = await fetch(saveEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    const responseText = await response.text();
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
      throw new Error(errorText || `Ошибка загрузки файлов: ${response.status}`);
    }
    if (!responseText) return [];
    try {
      const parsed = JSON.parse(responseText);
      return Array.isArray(parsed?.files) ? parsed.files : [];
    } catch (error) {
      console.warn("Не удалось распарсить список файлов.", error);
      return [];
    }
  };

  const buildInvoiceDownloadItems = (tools, invoiceFiles, orgFolder) => {
    const invoiceMap = new Map();
    invoiceFiles.forEach((fileName) => {
      const baseName = String(fileName ?? "").trim();
      if (!baseName) return;
      const firstPart = baseName.split("_")[0] ?? "";
      const normalized = normalizeToolNumberValue(firstPart);
      if (!normalized) return;
      const bucket = invoiceMap.get(normalized) ?? [];
      bucket.push(baseName);
      invoiceMap.set(normalized, bucket);
    });

    const result = [];
    tools.forEach((tool) => {
      const toolNumberVariants = new Set([
        ...getToolNumberVariants(tool?.["Номер"]),
        ...getToolNumberVariants(tool?.["Бух.номер"]),
      ]);
      const linkedFiles = [];
      toolNumberVariants.forEach((variant) => {
        const normalized = normalizeToolNumberValue(variant);
        if (!normalized) return;
        const files = invoiceMap.get(normalized) ?? [];
        linkedFiles.push(...files);
      });
      const uniqueFiles = Array.from(new Set(linkedFiles));
      if (!uniqueFiles.length) return;
      const toolNumber = String(tool?.["Номер"] ?? "").trim();
      const accountingNumber = String(tool?.["Бух.номер"] ?? "").trim();
      const titleParts = [
        toolNumber ? `№${toolNumber}` : "",
        accountingNumber || "",
        String(tool?.["Наименование"] ?? "").trim(),
        String(tool?.["Модель"] ?? "").trim(),
      ].filter(Boolean);
      const title = titleParts.join(" · ");
      result.push({
        title: title || "Инструмент",
        searchLine: [
          toolNumber,
          accountingNumber,
          String(tool?.["Наименование"] ?? ""),
          String(tool?.["Производитель"] ?? ""),
          String(tool?.["Модель"] ?? ""),
          ...uniqueFiles,
        ]
          .join(" ")
          .toLocaleLowerCase("ru"),
        files: uniqueFiles.sort((a, b) => a.localeCompare(b, "ru")),
        urls: uniqueFiles
          .sort((a, b) => a.localeCompare(b, "ru"))
          .map((fileName) =>
            new URL(
              `./${orgFolder}/Накладные покупка/${encodeURIComponent(fileName)}`,
              window.location.href
            ).href
          ),
      });
    });
    return result.sort((a, b) => a.title.localeCompare(b.title, "ru"));
  };

  const isImageInvoiceFile = (fileName) => {
    const extension = String(fileName ?? "")
      .split(".")
      .pop()
      ?.toLocaleLowerCase("ru");
    return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic", "heif"].includes(
      extension || ""
    );
  };

  const openInvoiceDocument = (invoiceItem) => {
    if (!downloadMessageEl || !invoiceItem) return;
    const firstFile = invoiceItem.files?.[0] ?? "";
    const firstUrl = invoiceItem.urls?.[0] ?? "";
    if (!firstUrl) {
      downloadMessageEl.textContent = "Не удалось сформировать ссылку на накладную.";
      return;
    }

    if (invoiceItem.files.length === 1 && isImageInvoiceFile(firstFile)) {
      window.open(firstUrl, "_blank", "noopener,noreferrer");
      downloadMessageEl.textContent = "Изображение накладной открыто в новой вкладке.";
      return;
    }

    downloadMessageEl.textContent = "";
    const wrap = document.createElement("div");
    wrap.className = "download-links";
    const title = document.createElement("div");
    title.textContent =
      invoiceItem.files.length > 1
        ? "Найдены накладные. Выберите файл для скачивания:"
        : "Накладная не изображение. Нажмите для скачивания:";
    wrap.appendChild(title);
    const list = document.createElement("div");
    invoiceItem.urls.forEach((url, index) => {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = invoiceItem.files[index] || `Файл ${index + 1}`;
      link.style.display = "block";
      link.style.marginTop = "6px";
      list.appendChild(link);
    });
    wrap.appendChild(list);
    downloadMessageEl.appendChild(wrap);
  };

  const buildToolDocumentItem = ({ tool, files, orgFolder, folderName, title, emptyText }) => {
    const toolNumberVariants = new Set([
      ...getToolNumberVariants(tool?.["Номер"]),
      ...getToolNumberVariants(tool?.["Бух.номер"]),
    ]);
    const normalizedVariants = Array.from(toolNumberVariants)
      .map((variant) => normalizeToolNumberValue(variant))
      .filter(Boolean);
    const linkedFiles = (Array.isArray(files) ? files : []).filter((fileName) => {
      const firstPart = String(fileName ?? "").trim().split("_")[0] ?? "";
      const normalizedFileNumber = normalizeToolNumberValue(firstPart);
      return normalizedFileNumber && normalizedVariants.includes(normalizedFileNumber);
    });
    const uniqueFiles = Array.from(new Set(linkedFiles)).sort((a, b) => a.localeCompare(b, "ru"));
    return {
      title,
      emptyText,
      files: uniqueFiles,
      urls: uniqueFiles.map((fileName) =>
        new URL(
          `./${orgFolder}/${folderName}/${encodeURIComponent(fileName)}`,
          window.location.href
        ).href
      ),
    };
  };

  const openToolDocumentsViewer = async () => {
    const tool = toolsInfoState.tool;
    const orgFolder = toolsInfoState.orgFolder || toolsState.orgFolder || context.orgFolderName || "";
    if (!tool || !orgFolder) return;
    setToolsInfoSubtitleMessage("Загружаем документы...");
    const overlay = document.createElement("div");
    overlay.className = "tool-documents-modal";
    overlay.innerHTML = `
      <div class="tool-documents-modal__backdrop" data-tool-documents-close></div>
      <div class="tool-documents-modal__panel" role="dialog" aria-modal="true" aria-label="Документы инструмента">
        <div class="tool-documents-modal__header">
          <div>
            <h3>Накладные и акты</h3>
          </div>
          <button class="button-icon tools-modal__close tool-documents-modal__close" type="button" data-tool-documents-close aria-label="Закрыть документы">
            <span class="button-icon-emoji" aria-hidden="true">✕</span>
          </button>
        </div>
        <div class="tool-documents-modal__body" data-tool-documents-body>
          <div class="tool-documents-modal__loading">Ищем файлы...</div>
        </div>
      </div>
    `;
    const close = () => {
      overlay.remove();
      document.removeEventListener("keydown", handleKeydown);
    };
    const handleKeydown = (event) => {
      if (event.key === "Escape") close();
    };
    overlay.addEventListener("click", (event) => {
      if (event.target.closest("[data-tool-documents-close]")) close();
    });
    document.addEventListener("keydown", handleKeydown);
    document.body.appendChild(overlay);
    const body = overlay.querySelector("[data-tool-documents-body]");
    try {
      const [invoiceFiles, repairFiles] = await Promise.all([
        listFolderFilesViaEndpoint(orgFolder, "Накладные покупка").catch(() => []),
        listFolderFilesViaEndpoint(orgFolder, "Акты ремонтов").catch(() => []),
      ]);
      const sections = [
        buildToolDocumentItem({
          tool,
          files: invoiceFiles,
          orgFolder,
          folderName: "Накладные покупка",
          title: "Накладные покупка",
          emptyText: "Накладных на покупку для этого инструмента нет.",
        }),
        buildToolDocumentItem({
          tool,
          files: repairFiles,
          orgFolder,
          folderName: "Акты ремонтов",
          title: "Акты ремонт",
          emptyText: "Актов ремонта для этого инструмента нет.",
        }),
      ];
      if (!body) return;
      body.innerHTML = "";
      sections.forEach((section) => {
        const sectionEl = document.createElement("section");
        sectionEl.className = "tool-documents-section";
        const titleEl = document.createElement("h4");
        titleEl.textContent = section.title;
        sectionEl.appendChild(titleEl);
        if (!section.files.length) {
          const empty = document.createElement("div");
          empty.className = "tool-documents-section__empty";
          empty.textContent = section.emptyText;
          sectionEl.appendChild(empty);
        } else {
          section.files.forEach((fileName, index) => {
            const link = document.createElement("a");
            link.className = "tool-documents-section__file";
            link.href = section.urls[index];
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = fileName;
            sectionEl.appendChild(link);
          });
        }
        body.appendChild(sectionEl);
      });
      setToolsInfoSubtitleMessage("Документы открыты.");
    } catch (error) {
      console.warn("Не удалось открыть документы инструмента.", error);
      if (body) body.innerHTML = `<div class="tool-documents-section__empty">Не удалось загрузить документы.</div>`;
      setToolsInfoSubtitleMessage("Не удалось загрузить документы.");
    }
  };

  const renderInvoiceDownloadOptions = (items, query = "") => {
    if (!downloadResponsibleListEl) return;
    downloadResponsibleListEl.innerHTML = "";
    const normalizedQuery = String(query ?? "").trim().toLocaleLowerCase("ru");
    const filtered = !normalizedQuery
      ? items
      : items.filter((item) => item.searchLine.includes(normalizedQuery));

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "download-responsible__empty";
      empty.textContent = items.length
        ? "Ничего не найдено. Измените запрос."
        : "Не найдены инструменты с накладными на покупку.";
      downloadResponsibleListEl.appendChild(empty);
      return;
    }

    filtered.forEach((item) => {
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.className = "download-responsible__option";
      optionButton.textContent = item.title;
      optionButton.addEventListener("click", () => {
        openInvoiceDocument(item);
      });
      downloadResponsibleListEl.appendChild(optionButton);
    });
  };

  const openInvoiceDownloadPicker = async () => {
    if (!downloadResponsibleBoxEl || !downloadResponsibleListEl) return;
    if (!context.orgFolderName) {
      if (downloadMessageEl) {
        downloadMessageEl.textContent = "Не удалось определить организацию пользователя.";
      }
      return;
    }

    const toolsPath = `./${context.orgFolderName}/База с инструментами.json`;
    let rawTools = [];
    try {
      const raw = await loadJson(toolsPath);
      rawTools = Array.isArray(raw) ? raw : Array.isArray(raw?.tools) ? raw.tools : [];
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов для накладных.", error);
      if (downloadMessageEl) {
        downloadMessageEl.textContent = "Не удалось загрузить список инструментов.";
      }
      return;
    }

    let invoiceFiles = [];
    try {
      invoiceFiles = await listFolderFilesViaEndpoint(context.orgFolderName, "Накладные покупка");
    } catch (error) {
      console.warn("Не удалось загрузить папку накладных.", error);
      if (downloadMessageEl) {
        downloadMessageEl.textContent = "Не удалось загрузить накладные на покупку.";
      }
      return;
    }

    invoiceDownloadItemsCache = buildInvoiceDownloadItems(rawTools, invoiceFiles, context.orgFolderName);
    downloadPickerMode = "invoice";
    toggleResponsibleDownloadPicker(true);
    renderInvoiceDownloadOptions(invoiceDownloadItemsCache, downloadResponsibleSearchEl?.value ?? "");
    downloadResponsibleSearchEl?.focus();
  };

  const openResponsibleDownloadPicker = async () => {
    if (!downloadResponsibleBoxEl || !downloadResponsibleListEl) return;
    if (!context.orgFolderName) {
      if (downloadMessageEl) {
        downloadMessageEl.textContent = "Не удалось определить организацию пользователя.";
      }
      return;
    }

    const toolsPath = `./${context.orgFolderName}/База с инструментами.json`;
    let rawTools = [];
    try {
      const raw = await loadJson(toolsPath);
      rawTools = Array.isArray(raw) ? raw : Array.isArray(raw?.tools) ? raw.tools : [];
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов для выбора ответственного.", error);
      if (downloadMessageEl) {
        downloadMessageEl.textContent = "Не удалось загрузить список ответственных.";
      }
      return;
    }

    responsibleDownloadToolsCache = rawTools;
    downloadPickerMode = "responsible";
    toggleResponsibleDownloadPicker(true);
    renderResponsibleDownloadOptions(rawTools, downloadResponsibleSearchEl?.value ?? "");
    downloadResponsibleSearchEl?.focus();
  };

  const openStatusDownloadPicker = async () => {
    if (!downloadResponsibleBoxEl || !downloadResponsibleListEl) return;
    if (!context.orgFolderName) {
      if (downloadMessageEl) {
        downloadMessageEl.textContent = "Не удалось определить организацию пользователя.";
      }
      return;
    }

    const toolsPath = `./${context.orgFolderName}/База с инструментами.json`;
    let rawTools = [];
    try {
      const raw = await loadJson(toolsPath);
      rawTools = Array.isArray(raw) ? raw : Array.isArray(raw?.tools) ? raw.tools : [];
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов для выбора статуса.", error);
      if (downloadMessageEl) {
        downloadMessageEl.textContent = "Не удалось загрузить список статусов.";
      }
      return;
    }

    responsibleDownloadToolsCache = rawTools;
    downloadPickerMode = "status";
    toggleResponsibleDownloadPicker(true);
    renderStatusDownloadOptions(rawTools, downloadResponsibleSearchEl?.value ?? "");
    downloadResponsibleSearchEl?.focus();
  };

  feedbackBackdropEl?.addEventListener("click", closeFeedbackModal);
  feedbackCloseButton?.addEventListener("click", closeFeedbackModal);
  feedbackCancelButton?.addEventListener("click", closeFeedbackModal);
  feedbackAnonymousEl?.addEventListener("change", syncFeedbackAnonymousHint);
  feedbackPhotosEl?.addEventListener("change", renderFeedbackFiles);
  feedbackModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeFeedbackModal();
    }
  });

  downloadBackdropEl?.addEventListener("click", closeDownloadModal);
  downloadCloseButton?.addEventListener("click", closeDownloadModal);
  downloadModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDownloadModal();
    }
  });

  infoBackdropEl?.addEventListener("click", closeInfoModal);
  infoCloseButton?.addEventListener("click", closeInfoModal);
  infoModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeInfoModal();
    }
  });

  infoGridEl?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-energy-info-option]");
    if (!button) return;
    const option = String(button.dataset.energyInfoOption ?? "").trim();
    if (option === "moves-history") {
      closeInfoModal();
      void openInfoMovesHistoryModal();
      return;
    }
    if (option === "pending-list") {
      closeInfoModal();
      void openInfoPendingModal();
      return;
    }
    if (option === "by-dates") {
      closeInfoModal();
      void openInfoByDatesModal();
      return;
    }
    if (option === "repair") {
      closeInfoModal();
      void openInfoRepairModal();
      return;
    }
    if (option === "fines") {
      closeInfoModal();
      void openInfoFinesModal();
      return;
    }
    if (option === "instructions") {
      closeInfoModal();
      openInfoInstructionsModal();
      return;
    }
    if (option === "statistics") {
      closeInfoModal();
      void openInfoStatisticsModal();
    }
  });

  infoRepairBackdropEl?.addEventListener("click", closeInfoRepairModal);
  infoRepairCloseButton?.addEventListener("click", closeInfoRepairModal);
  infoRepairModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeInfoRepairModal();
  });
  infoStatisticsBackdropEl?.addEventListener("click", closeInfoStatisticsModal);
  infoStatisticsCloseButton?.addEventListener("click", closeInfoStatisticsModal);
  infoStatisticsModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeInfoStatisticsModal();
    }
  });
  infoFinesBackdropEl?.addEventListener("click", closeInfoFinesModal);
  infoFinesCloseButton?.addEventListener("click", closeInfoFinesModal);
  infoFinesModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeInfoFinesModal();
    }
  });
  infoInstructionsBackdropEl?.addEventListener("click", closeInfoInstructionsModal);
  infoInstructionsCloseButton?.addEventListener("click", closeInfoInstructionsModal);
  infoInstructionsModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeInfoInstructionsModal();
    }
  });
  infoByDatesBackdropEl?.addEventListener("click", closeInfoByDatesModal);
  infoByDatesCloseButton?.addEventListener("click", closeInfoByDatesModal);
  infoByDatesModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeInfoByDatesModal();
    }
  });

  infoByDatesTabEls.forEach((tabEl) => {
    tabEl.addEventListener("click", () => {
      const nextTab = String(tabEl.dataset.infoByDatesTab ?? "").trim();
      if (!nextTab) return;
      infoByDatesState.activeTab = nextTab;
      infoByDatesTabEls.forEach((item) => {
        item.classList.toggle(
          "is-active",
          String(item.dataset.infoByDatesTab ?? "").trim() === nextTab
        );
      });
      renderInfoByDatesList();
    });
  });

  infoByDatesCalendarDaysEl?.addEventListener("click", (event) => {
    const dayButton = event.target.closest("[data-date]");
    if (!dayButton) return;
    const isoDate = String(dayButton.dataset.date ?? "").trim();
    if (!isoDate) return;
    const currentStart = infoByDatesState.filters.dateFrom;
    const currentEnd = infoByDatesState.filters.dateTo;
    if (!currentStart || currentEnd) {
      infoByDatesState.filters.dateFrom = isoDate;
      infoByDatesState.filters.dateTo = "";
    } else {
      infoByDatesState.filters.dateTo = isoDate;
    }
    renderInfoByDatesCalendar();
    renderInfoByDatesList();
  });

  infoByDatesResetDatesEl?.addEventListener("click", () => {
    infoByDatesState.filters.dateFrom = "";
    infoByDatesState.filters.dateTo = "";
    infoByDatesState.isCalendarCollapsed = false;
    updateInfoByDatesCalendarVisibility();
    renderInfoByDatesCalendar();
    renderInfoByDatesList();
  });

  infoByDatesToggleCalendarEl?.addEventListener("click", () => {
    infoByDatesState.isCalendarCollapsed = !infoByDatesState.isCalendarCollapsed;
    updateInfoByDatesCalendarVisibility();
  });

  infoByDatesCalendarPrevEl?.addEventListener("click", () => {
    infoByDatesState.visibleMonthDate = new Date(
      infoByDatesState.visibleMonthDate.getFullYear(),
      infoByDatesState.visibleMonthDate.getMonth() - 1,
      1
    );
    renderInfoByDatesCalendar();
  });

  infoByDatesCalendarNextEl?.addEventListener("click", () => {
    infoByDatesState.visibleMonthDate = new Date(
      infoByDatesState.visibleMonthDate.getFullYear(),
      infoByDatesState.visibleMonthDate.getMonth() + 1,
      1
    );
    renderInfoByDatesCalendar();
  });

  downloadResponsibleSearchEl?.addEventListener("input", () => {
    if (downloadPickerMode === "status") {
      renderStatusDownloadOptions(
        responsibleDownloadToolsCache,
        downloadResponsibleSearchEl?.value ?? ""
      );
      return;
    }
    if (downloadPickerMode === "invoice") {
      renderInvoiceDownloadOptions(
        invoiceDownloadItemsCache,
        downloadResponsibleSearchEl?.value ?? ""
      );
      return;
    }
    renderResponsibleDownloadOptions(responsibleDownloadToolsCache, downloadResponsibleSearchEl?.value ?? "");
  });

  downloadOptionsEl?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-download-option]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const option = button.dataset.downloadOption;
    if (!option) return;
    if (option === "my-tools") {
      toggleResponsibleDownloadPicker(false);
      downloadToolsExcel({ scope: "my" });
      return;
    }
    if (option === "all-tools") {
      toggleResponsibleDownloadPicker(false);
      downloadToolsExcel({ scope: "all" });
      return;
    }
    if (option === "responsible") {
      if (downloadMessageEl) {
        downloadMessageEl.textContent = "";
      }
      void openResponsibleDownloadPicker();
      return;
    }
    if (option === "no-photo") {
      toggleResponsibleDownloadPicker(false);
      downloadToolsExcel({ scope: "no-photo" });
      return;
    }
    if (option === "moves") {
      if (downloadMessageEl) {
        downloadMessageEl.textContent = "";
      }
      openMovesDownloadPicker();
      return;
    }
    if (option === "status") {
      if (downloadMessageEl) {
        downloadMessageEl.textContent = "";
      }
      void openStatusDownloadPicker();
      return;
    }
    if (option === "invoice") {
      if (downloadMessageEl) {
        downloadMessageEl.textContent = "";
      }
      void openInvoiceDownloadPicker();
    }
  });

  downloadMovesGenerateButton?.addEventListener("click", () => {
    void downloadMovesExcel({
      startDate: downloadMovesStartDateEl?.value ?? "",
      endDate: downloadMovesEndDateEl?.value ?? "",
    });
  });

  downloadMovesDaysEl?.addEventListener("click", (event) => {
    const dayButton = event.target.closest("[data-date]");
    if (!dayButton) return;
    const isoDate = String(dayButton.dataset.date ?? "").trim();
    if (!isoDate) return;
    handleMovesDateSelect(isoDate);
  });

  downloadMovesPrevMonthButton?.addEventListener("click", () => {
    downloadMovesVisibleMonthDate = new Date(
      downloadMovesVisibleMonthDate.getFullYear(),
      downloadMovesVisibleMonthDate.getMonth() - 1,
      1
    );
    renderMovesRangeCalendar();
  });

  downloadMovesNextMonthButton?.addEventListener("click", () => {
    downloadMovesVisibleMonthDate = new Date(
      downloadMovesVisibleMonthDate.getFullYear(),
      downloadMovesVisibleMonthDate.getMonth() + 1,
      1
    );
    renderMovesRangeCalendar();
  });

  feedbackFormEl?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = String(feedbackMessageEl?.value ?? "").trim();
    const isAnonymous = Boolean(feedbackAnonymousEl?.checked);
    const photoFiles = Array.from(feedbackPhotosEl?.files ?? []);

    if (!message) {
      if (feedbackStatusEl) feedbackStatusEl.textContent = "Напишите текст обращения.";
      return;
    }

    if (feedbackStatusEl) {
      feedbackStatusEl.textContent = "Сохраняем обращение...";
    }

    try {
      const photos = [];
      for (const file of photoFiles) {
        const content = await readFileAsBase64(file);
        photos.push({
          content,
          extension: getFileExtensionFromName(file.name),
        });
      }

      const payload = {
        type: "feedback-request",
        text: message,
        anonymous: isAnonymous,
        organization: currentUser?.organization ?? user?.organization ?? "",
        createdBy: {
          telegram_id: currentUser?.telegram_id ?? null,
          full_name: currentUser?.full_name ?? currentUser?.fullName ?? user?.full_name ?? "",
          role: currentUser?.role ?? user?.role ?? "",
          organization: currentUser?.organization ?? user?.organization ?? "",
        },
        photos,
      };

      await saveEntriesViaEndpoint([payload]);
      if (feedbackStatusEl) {
        feedbackStatusEl.textContent = "Спасибо! Обращение отправлено.";
      }
      setTimeout(() => {
        closeFeedbackModal();
      }, 700);
    } catch (error) {
      console.error(error);
      if (feedbackStatusEl) {
        feedbackStatusEl.textContent =
          error instanceof Error
            ? error.message
            : "Не удалось отправить обращение. Попробуйте ещё раз.";
      }
    }
  });

  settingsBackdropEl?.addEventListener("click", closeSettingsModal);
  settingsCloseButton?.addEventListener("click", closeSettingsModal);
  settingsCancelButton?.addEventListener("click", closeSettingsModal);
  settingsModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSettingsModal();
    }
  });

  settingsFormEl?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!settingsFormEl) return;
    if (settingsMessageEl) {
      settingsMessageEl.textContent = "Сохраняем настройки...";
    }
    const formData = new FormData(settingsFormEl);
    const nextAccess = { ...(settingsData.organization?.access ?? {}) };
    getEnergySettingsAccessRoles(organizationSettings.dataUsage).forEach((role) => {
      const roleKey = buildRoleKey(role);
      const values = formData.getAll(`access-${roleKey}`).map(String);
      nextAccess[role] = values;
    });
    const nextFines = {};
    energyFineOptions.forEach((option) => {
      const enabled = formData.get(`fine-${option.id}-enabled`) !== null;
      nextFines[option.id] = {
        enabled,
        days: normalizeNumber(formData.get(`fine-${option.id}-days`), 0),
        amount: normalizeNumber(formData.get(`fine-${option.id}-amount`), 0),
      };
    });
    const nextMailings = {};
    const telegramGroups = normalizeTelegramGroupsList(
      settingsData.organization?.telegramGroups ?? organizationSettings.telegramGroups
    );
    energyMailingOptions.forEach((option) => {
      const toolGroups = normalizeMailingToolGroups(
        formData.getAll(`mailing-${option.id}-tool-groups`),
        settingsGroups
      );
      const telegramSchedule = {};
      telegramGroups.forEach((group, index) => {
        const key = getTelegramGroupKey(group);
        if (!key) return;
        const selectedDays = normalizeDays(
          formData.getAll(`mailing-${option.id}-tg-${index}-days`),
          []
        );
        telegramSchedule[key] = {
          days: selectedDays,
          time: normalizeTime(
            formData.get(`mailing-${option.id}-tg-${index}-time`),
            option.defaultTime
          ),
        };
      });
      nextMailings[option.id] = {
        enabled: formData.get(`mailing-${option.id}-enabled`) !== null,
        toolGroups,
        telegramSchedule,
      };
    });
    const nextNotifications = {};
    energyNotificationOptions.forEach((option) => {
      nextNotifications[option.id] = {
        enabled: formData.get(`notification-${option.id}-enabled`) !== null,
        groups: normalizeTelegramGroupSelection(
          formData.getAll(`notification-${option.id}-groups`),
          telegramGroups
        ),
        attachPhoto: formData.get(`notification-${option.id}-photo`) !== null,
      };
    });
    const nextDataUsage = {};
    energyDataUsageOptions.forEach((option) => {
      nextDataUsage[option.id] =
        formData.get(`data-usage-${option.id}`) !== null;
    });
    const nextMovesTable = normalizeMovesTableSettings({
      recipients: formData.getAll("moves-table-recipients"),
      scheduleType: formData.get("moves-table-schedule-type"),
      monthDays: formData.getAll("moves-table-month-days"),
      weekDays: formData.getAll("moves-table-week-days"),
      time: formData.get("moves-table-time"),
      periodDays: formData.get("moves-table-period-days"),
      includeSendDay: formData.get("moves-table-include-send-day") !== null,
      columns: formData.getAll("moves-table-columns"),
    }, {
      users: settingsMovesTableUsers,
      objectTrackingEnabled: nextDataUsage.object !== false,
    });
    settingsData.organization = normalizeEnergyOrganizationSettings({
      access: nextAccess,
      stcGroups: settingsGroups,
      telegramGroups:
        settingsData.organization?.telegramGroups ??
        organizationSettings.telegramGroups,
      fines: nextFines,
      mailings: nextMailings,
      notifications: nextNotifications,
      dataUsage: nextDataUsage,
      movesTable: nextMovesTable,
    });
    try {
      await saveJson(context.settingsPath, settingsData, { user });
      if (!nextDataUsage.object) {
        await applyDefaultObjectValues(context.orgFolderName, user);
      }
      if (settingsMessageEl) {
        settingsMessageEl.textContent = "Настройки сохранены для организации.";
      }
      closeSettingsModal();
      await renderUserRoleView();
    } catch (error) {
      console.error(error);
      if (settingsMessageEl) {
        settingsMessageEl.textContent =
          "Не удалось сохранить настройки. Проверьте сервер.";
      }
    }
  });

  const openQuickAccessPicker = () => {
    if (!quickAccessPickerEl) return;
    quickAccessDraft = [...quickAccessIds];
    renderQuickAccessPicker();
    setQuickAccessMessage(`Выбрано ${quickAccessDraft.length} из ${quickAccessLimit}`);
    quickAccessPickerEl.classList.remove("is-hidden");
  };

  const closeQuickAccessPicker = () => {
    if (!quickAccessPickerEl) return;
    quickAccessPickerEl.classList.add("is-hidden");
    setQuickAccessMessage("");
  };

  const handleEnergyAction = (actionId) => {
    if (!actionId) return false;
    const isBuiltInAction =
      actionId !== "pending" &&
      actionId !== "awaiting-reply" &&
      !isToolsReplacementActionId(actionId);
    if (isBuiltInAction && !actionsMap.has(actionId)) return false;
    if (actionId === "pending") {
      openPendingMovesModal();
      return true;
    }
    if (actionId === "awaiting-reply") {
      openAwaitingReplyModal();
      return true;
    }
    if (actionId === "settings") {
      void openSettingsModal();
      return true;
    }
    if (actionId === "objects") {
      if (!objectTrackingEnabled) return false;
      openObjectsModal();
      return true;
    }
    if (actionId === "users") {
      openUsersDetailsModal();
      return true;
    }
    if (actionId === "tools") {
      openToolsModal();
      return true;
    }
    if (actionId === "mechanisms") {
      openMechanismsModal();
      return true;
    }
    if (isToolsReplacementActionId(actionId)) {
      const replacementFullName = actionId.replace(toolsReplacementActionPrefix, "");
      openReplacementToolsModal(replacementFullName);
      return true;
    }
    if (actionId === "base") {
      openBaseModal();
      return true;
    }
    if (actionId === "search") {
      openSearchModal();
      return true;
    }
    if (actionId === "no-accounting-number") {
      openNoAccountingNumberModal();
      return true;
    }
    if (actionId === "move-other") {
      openMoveOtherModal();
      return true;
    }
    if (actionId === "workers") {
      openWorkersModal();
      return true;
    }
    if (actionId === "accept-other") {
      openPendingMovesModal({ allReceiversMode: true });
      return true;
    }
    if (actionId === "add-photo") {
      openAddPhotoModal();
      return true;
    }
    if (actionId === "no-photo") {
      openNoPhotoModal();
      return true;
    }
    if (actionId === "fines") {
      openFinesModal();
      return true;
    }
    if (actionId === "remove-photo") {
      openRemovePhotoModal();
      return true;
    }
    if (actionId === "add-tool") {
      openAddToolModal();
      return true;
    }
    if (actionId === "write-off") {
      openWriteOffModal();
      return true;
    }
    if (actionId === "write-off-pending") {
      openWriteOffPendingModal();
      return true;
    }
    if (actionId === "repair") {
      openRepairModal();
      return true;
    }
    if (actionId === "breakdowns") {
      openBreakdownsModal();
      return true;
    }
    if (actionId === "demand") {
      openDemandModal();
      return true;
    }
    if (actionId === "download") {
      openDownloadModal();
      return true;
    }
    if (actionId === "info") {
      openInfoModal();
      return true;
    }
    return false;
  };

  quickAccessEditButton?.addEventListener("click", openQuickAccessPicker);
  quickAccessCancelButton?.addEventListener("click", closeQuickAccessPicker);
  quickAccessPickerGridEl?.addEventListener("click", (event) => {
    const option = event.target.closest("[data-action-id]");
    if (!option) return;
    const actionId = option.dataset.actionId;
    if (!actionId) return;
    const isSelected = quickAccessDraft.includes(actionId);
    if (!isSelected && quickAccessDraft.length >= quickAccessLimit) {
      setQuickAccessMessage(`Можно выбрать максимум ${quickAccessLimit} плашек.`);
      return;
    }
    quickAccessDraft = isSelected
      ? quickAccessDraft.filter((id) => id !== actionId)
      : [...quickAccessDraft, actionId];
    option.classList.toggle("is-selected", !isSelected);
    setQuickAccessMessage(`Выбрано ${quickAccessDraft.length} из ${quickAccessLimit}`);
  });

  const persistQuickAccessIds = async (nextIds, { renderGrid = false } = {}) => {
    quickAccessIds = nextIds.slice(0, quickAccessLimit);
    settingsData.users = settingsData.users ?? {};
    const currentUserSettings = settingsData.users?.[context.userKey] ?? {};
    settingsData.users[context.userKey] = {
      ...currentUserSettings,
      energy: {
        ...(currentUserSettings.energy ?? {}),
        quickAccess: quickAccessIds,
      },
    };
    try {
      setQuickAccessMessage("Сохраняем быстрый доступ...");
      await saveJson(context.settingsPath, settingsData, { user });
      renderQuickAccessList();
      if (renderGrid) {
        renderEnergyGrid();
        fitActionTitleTexts(gridEl);
      }
      closeQuickAccessPicker();
      setQuickAccessMessage("");
      return true;
    } catch (error) {
      console.error(error);
      setQuickAccessMessage("Не удалось сохранить. Проверьте соединение.");
      return false;
    }
  };

  quickAccessSaveButton?.addEventListener("click", async () => {
    if (quickAccessDraft.length === 0) {
      setQuickAccessMessage("Нужно выбрать хотя бы одну плашку.");
      return;
    }
    await persistQuickAccessIds(quickAccessDraft, { renderGrid: true });
  });

  quickAccessListEl?.addEventListener("click", (event) => {
    if (blockClick) return;
    const quickButton = event.target.closest("[data-action-id]");
    if (!quickButton) return;
    handleEnergyAction(quickButton.dataset.actionId);
  });

  gridEl.addEventListener("click", (event) => {
    if (blockClick) return;
    const targetCard = event.target.closest("[data-energy-item]");
    if (!targetCard) return;
    if (!isGrouping && Object.prototype.hasOwnProperty.call(targetCard.dataset, "energyFeedback")) {
      openFeedbackModal();
      return;
    }
    if (
      !isGrouping &&
      (targetCard.dataset.energyItemType === "action" ||
        targetCard.dataset.energyItemType === "awaiting-reply") &&
      handleEnergyAction(targetCard.dataset.actionId)
    ) {
      return;
    }
    if (blockClick || !isGrouping || !allowGrouping) return;
    const card = targetCard;
    const itemType = targetCard.dataset.energyItemType;
    if (itemType === "action") {
      const actionId = targetCard.dataset.actionId;
      if (!actionId) return;
      targetCard.classList.toggle("is-selected");
      if (targetCard.classList.contains("is-selected")) {
        selectedIds.add(actionId);
      } else {
        selectedIds.delete(actionId);
      }
      updateGroupPanel();
      return;
    }
    if (itemType !== "group") return;

    const groupName = card.dataset.groupName ?? "Группа";
    const confirmUngroup = window.confirm(`Разгруппировать «${groupName}»?`);
    if (!confirmUngroup) return;

    let groupItems = [];
    if (card.dataset.groupItems) {
      try {
        groupItems = JSON.parse(card.dataset.groupItems);
      } catch (error) {
        groupItems = [];
      }
    }
    if (!Array.isArray(groupItems) || groupItems.length === 0) return;

    const parent = card.parentElement;
    if (!parent) return;
    const insertBeforeNode = card.nextSibling;
    card.remove();
    groupItems.forEach((actionId) => {
      const action = actionsMap.get(actionId);
      if (!action) return;
      const actionCard = createEnergyActionCard(action);
      if (insertBeforeNode) {
        parent.insertBefore(actionCard, insertBeforeNode);
      } else {
        parent.appendChild(actionCard);
      }
    });
    fitActionTitleTexts(gridEl);
    scheduleLayoutSave();
  });

  const dragState = {
    item: null,
    pointerId: null,
    touchId: null,
    pointerType: null,
    holdTimer: null,
    isDragging: false,
    pointerStartX: 0,
    pointerStartY: 0,
    startLeft: 0,
    startTop: 0,
    pointerOffsetX: 0,
    pointerOffsetY: 0,
    lastPointerX: 0,
    lastPointerY: 0,
    rafId: null,
    source: null,
    pointerCaptureTarget: null,
  };
  const dragHoldDelay = {
    touch: 120,
    mouse: 140,
  };
  const dragReorderThreshold = {
    grid: 0.2,
    quick: 0.18,
  };
  let quickAccessOrderDirty = false;
  let telegramVerticalSwipesBlocked = false;
  const setTelegramVerticalSwipesBlocked = (shouldBlock) => {
    if (!isIosMobile) return;
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;
    if (shouldBlock && !telegramVerticalSwipesBlocked) {
      webApp.disableVerticalSwipes?.();
      telegramVerticalSwipesBlocked = true;
      return;
    }
    if (!shouldBlock && telegramVerticalSwipesBlocked) {
      webApp.enableVerticalSwipes?.();
      telegramVerticalSwipesBlocked = false;
    }
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
  const animateQuickAccessReorder = (firstRects) => {
    if (!quickAccessListEl) return;
    const items = Array.from(quickAccessListEl.querySelectorAll(".quick-access-item"));
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
            duration: 220,
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
      if (
        dragState.pointerCaptureTarget &&
        dragState.pointerId !== null &&
        typeof dragState.pointerCaptureTarget.releasePointerCapture === "function"
      ) {
        try {
          dragState.pointerCaptureTarget.releasePointerCapture(dragState.pointerId);
        } catch (error) {
          // iOS WebView может выбросить исключение при releasePointerCapture.
        }
      }
      dragState.item.classList.remove("is-dragging");
      dragState.item.style.removeProperty("--drag-x");
      dragState.item.style.removeProperty("--drag-y");
    }
    if (dragState.isDragging) {
      gridEl.classList.remove("is-dragging");
      dragState.isDragging = false;
      setTelegramVerticalSwipesBlocked(false);
      blockClick = true;
      await saveLayout();
      setTimeout(() => {
        blockClick = false;
      }, 0);
    }
    dragState.item = null;
    dragState.pointerId = null;
    dragState.touchId = null;
    dragState.pointerType = null;
    dragState.source = null;
    dragState.pointerCaptureTarget = null;
    quickAccessOrderDirty = false;
    setTelegramVerticalSwipesBlocked(false);
  };

  const updateDragTransform = (clientX, clientY) => {
    if (!dragState.item) return;
    const deltaX = clientX - dragState.pointerOffsetX - dragState.startLeft;
    const deltaY = clientY - dragState.pointerOffsetY - dragState.startTop;
    dragState.item.style.setProperty("--drag-x", `${deltaX}px`);
    dragState.item.style.setProperty("--drag-y", `${deltaY}px`);
  };

  const startDrag = (event, card, source) => {
    const rect = card.getBoundingClientRect();
    dragState.item = card;
    dragState.pointerId = event.pointerId;
    dragState.touchId = event.touchId ?? null;
    dragState.pointerType = event.pointerType;
    dragState.pointerStartX = event.clientX;
    dragState.pointerStartY = event.clientY;
    dragState.lastPointerX = event.clientX;
    dragState.lastPointerY = event.clientY;
    dragState.startLeft = rect.left;
    dragState.startTop = rect.top;
    dragState.pointerOffsetX = event.clientX - rect.left;
    dragState.pointerOffsetY = event.clientY - rect.top;
    dragState.source = source;
    if (source === "quick") {
      quickAccessOrderDirty = false;
    }
    dragState.holdTimer = window.setTimeout(() => {
      if (!dragState.item) return;
      dragState.isDragging = true;
      setTelegramVerticalSwipesBlocked(true);
      dragState.item.classList.add("is-dragging");
      if (source === "grid") {
        gridEl.classList.add("is-dragging");
      }
      if (
        dragState.pointerType !== "touch" &&
        dragState.pointerId !== null &&
        typeof card.setPointerCapture === "function"
      ) {
        try {
          card.setPointerCapture(dragState.pointerId);
          dragState.pointerCaptureTarget = card;
        } catch (error) {
          // В iOS Telegram WebView setPointerCapture может не поддерживаться.
          dragState.pointerCaptureTarget = null;
        }
      }
      updateDragTransform(dragState.lastPointerX, dragState.lastPointerY);
    }, event.pointerType === "touch" ? dragHoldDelay.touch : dragHoldDelay.mouse);
  };

  const useTouchDragFallback = isIosMobile;

  gridEl.addEventListener("pointerdown", (event) => {
    if (useTouchDragFallback && event.pointerType === "touch") return;
    if (isGrouping) return;
    const card = event.target.closest("[data-energy-item]");
    if (!card) return;
    startDrag(event, card, "grid");
  });

  const processDragMove = (
    pointerId,
    pointerType,
    clientX,
    clientY,
    cancelable,
    preventDefault
  ) => {
    if (!dragState.item) return;
    if (pointerId !== dragState.pointerId) return;
    dragState.lastPointerX = clientX;
    dragState.lastPointerY = clientY;
    if (!dragState.isDragging) {
      const moved =
        Math.abs(clientX - dragState.pointerStartX) > 8 ||
        Math.abs(clientY - dragState.pointerStartY) > 8;
      if (moved && dragState.holdTimer) {
        window.clearTimeout(dragState.holdTimer);
        dragState.holdTimer = null;
      }
      return;
    }
    if (cancelable && pointerType === "touch") {
      preventDefault?.();
    }
    if (dragState.rafId) {
      cancelAnimationFrame(dragState.rafId);
    }
    dragState.rafId = requestAnimationFrame(() => {
      updateDragTransform(clientX, clientY);
    });
    if (dragState.source === "grid") {
      const target = document
        .elementsFromPoint(clientX, clientY)
        .map((element) => element.closest?.("[data-energy-item]"))
        .find((element) => element && element !== dragState.item);
      if (!target || target === dragState.item) return;
      const items = Array.from(gridEl.querySelectorAll("[data-energy-item]"));
      const firstRects = new Map(
        items.map((item) => [item, item.getBoundingClientRect()])
      );
      const draggedRect = dragState.item.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      const yThreshold = rect.top + rect.height * dragReorderThreshold.grid;
      const shouldInsertAfter = clientY > yThreshold;
      gridEl.insertBefore(
        dragState.item,
        shouldInsertAfter ? target.nextSibling : target
      );
      const updatedRect = dragState.item.getBoundingClientRect();
      dragState.startLeft += updatedRect.left - draggedRect.left;
      dragState.startTop += updatedRect.top - draggedRect.top;
      animateEnergyReorder(firstRects);
      scheduleLayoutSave();
      return;
    }
    if (dragState.source === "quick" && quickAccessListEl) {
      const target = document
        .elementsFromPoint(clientX, clientY)
        .map((element) => element.closest?.(".quick-access-item"))
        .find((element) => element && element !== dragState.item);
      if (!target || target === dragState.item) return;
      if (!quickAccessListEl.contains(target)) return;
      const items = Array.from(
        quickAccessListEl.querySelectorAll(".quick-access-item")
      );
      const firstRects = new Map(
        items.map((item) => [item, item.getBoundingClientRect()])
      );
      const draggedRect = dragState.item.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const centerX = rect.left + rect.width / 2;
      const yThreshold = rect.top + rect.height * dragReorderThreshold.quick;
      const shouldInsertAfter =
        clientY > yThreshold ||
        (Math.abs(clientY - centerY) < rect.height / 2 && clientX > centerX);
      quickAccessListEl.insertBefore(
        dragState.item,
        shouldInsertAfter ? target.nextSibling : target
      );
      const updatedRect = dragState.item.getBoundingClientRect();
      dragState.startLeft += updatedRect.left - draggedRect.left;
      dragState.startTop += updatedRect.top - draggedRect.top;
      animateQuickAccessReorder(firstRects);
      quickAccessOrderDirty = true;
    }
  };

  const handleDragMove = (event) => {
    processDragMove(
      event.pointerId,
      event.pointerType,
      event.clientX,
      event.clientY,
      event.cancelable,
      () => event.preventDefault()
    );
  };

  const isPointInside = (element, x, y) => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  };

  const resolveDropZone = (x, y) => {
    if (quickAccessEl && isPointInside(quickAccessEl, x, y)) {
      return "quick";
    }
    if (gridEl && isPointInside(gridEl, x, y)) {
      return "grid";
    }
    return null;
  };

  const insertActionIntoGrid = (action, clientX, clientY) => {
    if (!action) return;
    const card = createEnergyActionCard(action);
    const target = document
      .elementsFromPoint(clientX, clientY)
      .map((element) => element.closest?.("[data-energy-item]"))
      .find((element) => element && gridEl.contains(element));
    if (target) {
      const rect = target.getBoundingClientRect();
      const shouldInsertAfter = clientY > rect.top + rect.height / 2;
      gridEl.insertBefore(card, shouldInsertAfter ? target.nextSibling : target);
    } else {
      gridEl.appendChild(card);
    }
    fitActionTitleTexts(gridEl);
  };

  const insertPendingIntoGrid = (clientX, clientY) => {
    if (!energyPendingStatEl) return;
    const card = energyPendingStatEl;
    card.classList.add("pending-stat--grid", "action-card");
    card.dataset.energyItem = "";
    card.dataset.energyItemType = "pending";
    card.dataset.actionId = "pending";
    const target = document
      .elementsFromPoint(clientX, clientY)
      .map((element) => element.closest?.("[data-energy-item]"))
      .find((element) => element && gridEl.contains(element));
    if (target) {
      const rect = target.getBoundingClientRect();
      const shouldInsertAfter = clientY > rect.top + rect.height / 2;
      gridEl.insertBefore(card, shouldInsertAfter ? target.nextSibling : target);
    } else {
      gridEl.appendChild(card);
    }
  };

  const insertAwaitingReplyIntoGrid = (clientX, clientY) => {
    const card = createEnergyAwaitingReplyCard();
    const target = document
      .elementsFromPoint(clientX, clientY)
      .map((element) => element.closest?.("[data-energy-item]"))
      .find((element) => element && gridEl.contains(element));
    if (target) {
      const rect = target.getBoundingClientRect();
      const shouldInsertAfter = clientY > rect.top + rect.height / 2;
      gridEl.insertBefore(card, shouldInsertAfter ? target.nextSibling : target);
    } else {
      gridEl.appendChild(card);
    }
  };

  const handleDrop = async () => {
    if (!dragState.isDragging || !dragState.item) return;
    const dropZone = resolveDropZone(dragState.lastPointerX, dragState.lastPointerY);
    const actionId = dragState.item.dataset.actionId;
    const itemType = dragState.item.dataset.energyItemType;
    if (dragState.source === "grid" && dropZone === "quick") {
      if (
        !actionId ||
        (itemType !== "action" &&
          itemType !== "pending" &&
          itemType !== "awaiting-reply")
      )
        return;
      if (quickAccessIds.includes(actionId)) return;
      if (quickAccessIds.length >= quickAccessLimit) {
        setQuickAccessMessage(`Можно выбрать максимум ${quickAccessLimit} плашек.`);
        return;
      }
      const nextQuickAccess = [...quickAccessIds, actionId];
      dragState.item.remove();
      scheduleLayoutSave();
      await persistQuickAccessIds(nextQuickAccess);
    }
    if (dragState.source === "quick" && dropZone === "grid") {
      if (!actionId) return;
      if (!quickAccessIds.includes(actionId)) return;
      const nextQuickAccess = quickAccessIds.filter((id) => id !== actionId);
      if (actionId === "pending") {
        insertPendingIntoGrid(dragState.lastPointerX, dragState.lastPointerY);
      } else if (actionId === "awaiting-reply") {
        insertAwaitingReplyIntoGrid(dragState.lastPointerX, dragState.lastPointerY);
      } else {
        const action = actionsMap.get(actionId);
        insertActionIntoGrid(action, dragState.lastPointerX, dragState.lastPointerY);
      }
      scheduleLayoutSave();
      await persistQuickAccessIds(nextQuickAccess);
    }
    if (dragState.source === "quick" && quickAccessOrderDirty && dropZone !== "grid") {
      const nextOrder = getQuickAccessOrderFromDom();
      if (nextOrder.length > 0) {
        await persistQuickAccessIds(nextOrder);
      }
      quickAccessOrderDirty = false;
    }
  };

  const handleGlobalDragEnd = async (event) => {
    if (!dragState.item) return;
    if (event.pointerId !== dragState.pointerId) return;
    await handleDrop();
    await clearDrag();
  };

  const handleGlobalDragCancel = async (event) => {
    if (!dragState.item) return;
    if (event.pointerId !== dragState.pointerId) return;
    await clearDrag();
  };

  gridEl.addEventListener("pointermove", handleDragMove);

  gridEl.addEventListener("pointerup", handleGlobalDragEnd);

  gridEl.addEventListener("pointercancel", handleGlobalDragCancel);

  quickAccessListEl?.addEventListener("pointerdown", (event) => {
    if (useTouchDragFallback && event.pointerType === "touch") return;
    const card = event.target.closest("[data-action-id]");
    if (!card) return;
    startDrag(event, card, "quick");
  });

  quickAccessListEl?.addEventListener("pointermove", handleDragMove);

  quickAccessListEl?.addEventListener("pointerup", handleGlobalDragEnd);

  quickAccessListEl?.addEventListener("pointercancel", handleGlobalDragCancel);

  document.addEventListener("pointermove", handleDragMove, { passive: false });
  document.addEventListener("pointerup", handleGlobalDragEnd);
  document.addEventListener("pointercancel", handleGlobalDragCancel);

  const handleTouchStart = (event, source) => {
    if (!useTouchDragFallback) return;
    if (dragState.item) return;
    if (source === "grid" && isGrouping) return;
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    const selector = source === "grid" ? "[data-energy-item]" : "[data-action-id]";
    const card = event.target.closest(selector);
    if (!card) return;
    startDrag(
      {
        pointerId: -1,
        touchId: touch.identifier,
        pointerType: "touch",
        clientX: touch.clientX,
        clientY: touch.clientY,
      },
      card,
      source
    );
  };

  const getTrackedTouch = (event) => {
    if (dragState.touchId === null) return null;
    return Array.from(event.changedTouches || []).find(
      (touch) => touch.identifier === dragState.touchId
    );
  };

  const handleTouchMove = (event) => {
    if (!useTouchDragFallback) return;
    const touch = getTrackedTouch(event);
    if (!touch) return;
    processDragMove(
      -1,
      "touch",
      touch.clientX,
      touch.clientY,
      event.cancelable,
      () => event.preventDefault()
    );
  };

  const handleTouchEnd = async (event, isCancel = false) => {
    if (!useTouchDragFallback) return;
    if (!dragState.item || dragState.pointerId !== -1) return;
    const touch = getTrackedTouch(event);
    if (!touch) return;
    if (!isCancel) {
      await handleDrop();
    }
    await clearDrag();
  };

  gridEl.addEventListener("touchstart", (event) => handleTouchStart(event, "grid"), {
    passive: true,
  });
  quickAccessListEl?.addEventListener(
    "touchstart",
    (event) => handleTouchStart(event, "quick"),
    { passive: true }
  );
  document.addEventListener("touchmove", handleTouchMove, { passive: false });
  document.addEventListener("touchend", (event) => {
    void handleTouchEnd(event, false);
  });
  document.addEventListener("touchcancel", (event) => {
    void handleTouchEnd(event, true);
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
  const openOrgsButtons = contentEl.querySelectorAll("[data-open-orgs]");
  const openUsersButtons = contentEl.querySelectorAll("[data-open-users]");
  const openFeedbackButtons = contentEl.querySelectorAll("[data-open-feedback]");
  const feedbackPendingCountEl = contentEl.querySelector(
    "[data-feedback-pending-count]"
  );
  const feedbackModalEl = contentEl.querySelector("[data-feedback-modal]");
  const feedbackBackdropEl = contentEl.querySelector("[data-feedback-backdrop]");
  const feedbackCloseButton = contentEl.querySelector("[data-feedback-close]");
  const feedbackSummaryEl = contentEl.querySelector("[data-feedback-summary]");
  const feedbackStatusEl = contentEl.querySelector("[data-feedback-status]");
  const feedbackTabButtons = contentEl.querySelectorAll("[data-feedback-tab]");
  const feedbackDetailsModalEl = contentEl.querySelector(
    "[data-feedback-details-modal]"
  );
  const feedbackDetailsBackdropEl = contentEl.querySelector(
    "[data-feedback-details-backdrop]"
  );
  const feedbackDetailsCloseButton = contentEl.querySelector(
    "[data-feedback-details-close]"
  );
  const feedbackDetailsTitleEl = contentEl.querySelector(
    "[data-feedback-details-title]"
  );
  const feedbackDetailsMetaEl = contentEl.querySelector(
    "[data-feedback-details-meta]"
  );
  const feedbackDetailsTextEl = contentEl.querySelector(
    "[data-feedback-details-text]"
  );
  const feedbackDetailsPhotosEl = contentEl.querySelector(
    "[data-feedback-details-photos]"
  );
  const feedbackDetailsStatusEl = contentEl.querySelector(
    "[data-feedback-details-status]"
  );
  const feedbackPhotoViewerEl = contentEl.querySelector(
    "[data-feedback-photo-viewer]"
  );
  const feedbackPhotoViewerImageEl = contentEl.querySelector(
    "[data-feedback-photo-image]"
  );
  const feedbackPhotoViewerCloseButton = contentEl.querySelector(
    "[data-feedback-photo-close]"
  );
  const feedbackActionButtons = contentEl.querySelectorAll("[data-feedback-action]");
  const openSuperStatsButtons = contentEl.querySelectorAll("[data-open-super-stats]");
  const superStatsModalEl = contentEl.querySelector("[data-super-stats-modal]");
  const superStatsBackdropEl = contentEl.querySelector("[data-super-stats-backdrop]");
  const superStatsCloseButton = contentEl.querySelector("[data-super-stats-close]");
  const superStatsSummaryEl = contentEl.querySelector("[data-super-stats-summary]");
  const superStatsOrgSelect = contentEl.querySelector("[data-super-stats-org]");
  const superStatsPeriodSelect = contentEl.querySelector("[data-super-stats-period]");
  const superStatsPeriodButtons = contentEl.querySelectorAll("[data-super-stats-period-button]");
  const superStatsMetricSelect = contentEl.querySelector("[data-super-stats-metric]");
  const superStatsLimitSelect = contentEl.querySelector("[data-super-stats-limit]");
  const superStatsMetricButtons = contentEl.querySelectorAll("[data-super-stats-metric-button]");
  const superStatsFocusEl = contentEl.querySelector("[data-super-stats-focus]");
  const superStatsChartTitleEl = contentEl.querySelector("[data-super-stats-chart-title]");
  const superStatsChartCountEl = contentEl.querySelector("[data-super-stats-chart-count]");
  const superStatsInsightsEl = contentEl.querySelector("[data-super-stats-insights]");
  const superStatsCustomFields = contentEl.querySelectorAll("[data-super-stats-custom-field]");
  const superStatsDateFromInput = contentEl.querySelector("[data-super-stats-date-from]");
  const superStatsDateToInput = contentEl.querySelector("[data-super-stats-date-to]");
  const superStatsRangeToggle = contentEl.querySelector("[data-super-stats-range-toggle]");
  const superStatsDateFromLabel = contentEl.querySelector("[data-super-stats-date-from-label]");
  const superStatsDateToLabel = contentEl.querySelector("[data-super-stats-date-to-label]");
  const superStatsCalendarEl = contentEl.querySelector("[data-super-stats-calendar]");
  const superStatsCalendarGridEl = contentEl.querySelector("[data-super-stats-calendar-grid]");
  const superStatsCalendarTitleEl = contentEl.querySelector("[data-super-stats-calendar-title]");
  const superStatsCalendarPrevButton = contentEl.querySelector("[data-super-stats-calendar-prev]");
  const superStatsCalendarNextButton = contentEl.querySelector("[data-super-stats-calendar-next]");
  const superStatsUsersEl = contentEl.querySelector("[data-super-stats-users]");
  const superStatsToolsEl = contentEl.querySelector("[data-super-stats-tools]");
  const superStatsToolsAmountEl = contentEl.querySelector("[data-super-stats-tools-amount]");
  const superStatsMovesEl = contentEl.querySelector("[data-super-stats-moves]");
  const superStatsAmountEl = contentEl.querySelector("[data-super-stats-amount]");
  const superStatsLoginsEl = contentEl.querySelector("[data-super-stats-logins]");
  const superStatsWorkTimeEl = contentEl.querySelector("[data-super-stats-work-time]");
  const superStatsChartEl = contentEl.querySelector("[data-super-stats-chart]");
  const superStatsTimelineTitleEl = contentEl.querySelector("[data-super-stats-timeline-title]");
  const superStatsTimelineTotalEl = contentEl.querySelector("[data-super-stats-timeline-total]");
  const superStatsTimelineEl = contentEl.querySelector("[data-super-stats-timeline]");
  const superStatsStatusEl = contentEl.querySelector("[data-super-stats-status]");
  const orgsModalEl = contentEl.querySelector("[data-orgs-modal]");
  const orgsBackdropEl = contentEl.querySelector("[data-orgs-backdrop]");
  const orgsCloseButton = contentEl.querySelector("[data-orgs-close]");
  const orgsDetailsModalEl = contentEl.querySelector(
    "[data-orgs-details-modal]"
  );
  const orgsDetailsBackdropEl = contentEl.querySelector(
    "[data-orgs-details-backdrop]"
  );
  const orgsDetailsCloseButton = contentEl.querySelector(
    "[data-orgs-details-close]"
  );
  const orgsListEl = contentEl.querySelector("[data-orgs-list]");
  const orgsEmptyEl = contentEl.querySelector("[data-orgs-empty]");
  const orgsDetailsNameEl = contentEl.querySelector(
    "[data-orgs-details-name]"
  );
  const orgsDetailsLaunchEl = contentEl.querySelector(
    "[data-orgs-details-launch]"
  );
  const orgsDetailUsersEl = contentEl.querySelector("[data-orgs-detail-users]");
  const orgsDetailToolsTotalEl = contentEl.querySelector(
    "[data-orgs-detail-tools-total]"
  );
  const orgsDetailToolsActiveEl = contentEl.querySelector(
    "[data-orgs-detail-tools-active]"
  );
  const orgsEnergyListEl = contentEl.querySelector("[data-orgs-energy-list]");
  const energyInviteBox = contentEl.querySelector("[data-energy-invite-box]");
  const energyInviteHintEl = contentEl.querySelector("[data-energy-invite-hint]");
  const energyInviteNoteEl = contentEl.querySelector("[data-energy-invite-note]");
  const energyInviteLinkEl = contentEl.querySelector("[data-energy-invite-link]");
  const energyInviteShareButton = contentEl.querySelector(
    "[data-energy-invite-share]"
  );
  const energyInviteCopyButton = contentEl.querySelector(
    "[data-energy-invite-copy]"
  );
  const energyInviteOpenButton = contentEl.querySelector(
    "[data-energy-invite-open]"
  );
  const orgsUploadButton = contentEl.querySelector("[data-orgs-upload]");
  const orgsUploadInput = contentEl.querySelector("[data-orgs-upload-input]");
  const orgsUploadPhotoButton = contentEl.querySelector(
    "[data-orgs-upload-photo]"
  );
  const orgsUploadPhotoInput = contentEl.querySelector(
    "[data-orgs-upload-photo-input]"
  );
  const orgsUploadStatusEl = contentEl.querySelector(
    "[data-orgs-upload-status]"
  );
  const orgsUploadProgressEl = contentEl.querySelector(
    "[data-orgs-upload-progress]"
  );
  const orgsUploadProgressValueEl = contentEl.querySelector(
    "[data-orgs-upload-progress-value]"
  );
  const orgsUploadProgressFillEl = contentEl.querySelector(
    "[data-orgs-upload-progress-fill]"
  );
  const orgsUploadProgressThumbEl = contentEl.querySelector(
    "[data-orgs-upload-progress-thumb]"
  );
  const orgsUploadProgressTrackEl = contentEl.querySelector(
    "[data-orgs-upload-progress-track]"
  );
  const orgsUploadProgressHintEl = contentEl.querySelector(
    "[data-orgs-upload-progress-hint]"
  );
  const orgsManageGroupsButton = contentEl.querySelector(
    "[data-orgs-manage-groups]"
  );
  const orgsGroupsModalEl = contentEl.querySelector("[data-orgs-groups-modal]");
  const orgsGroupsBackdropEl = contentEl.querySelector(
    "[data-orgs-groups-backdrop]"
  );
  const orgsGroupsCloseButton = contentEl.querySelector(
    "[data-orgs-groups-close]"
  );
  const orgsGroupsCancelButton = contentEl.querySelector(
    "[data-orgs-groups-cancel]"
  );
  const orgsGroupsFormEl = contentEl.querySelector("[data-orgs-groups-form]");
  const orgsGroupsListEl = contentEl.querySelector("[data-orgs-groups-list]");
  const orgsGroupsAddButton = contentEl.querySelector("[data-orgs-groups-add]");
  const orgsGroupsSaveButton = contentEl.querySelector("[data-orgs-groups-save]");
  const orgsGroupsMessageEl = contentEl.querySelector(
    "[data-orgs-groups-message]"
  );
  const orgsGroupsSubtitleEl = contentEl.querySelector(
    "[data-orgs-groups-subtitle]"
  );
  const usersModalEl = contentEl.querySelector("[data-users-modal]");
  const usersBackdropEl = contentEl.querySelector("[data-users-backdrop]");
  const usersCloseButton = contentEl.querySelector("[data-users-close]");
  const usersOrgsListEl = contentEl.querySelector("[data-users-orgs-list]");
  const usersOrgsEmptyEl = contentEl.querySelector("[data-users-orgs-empty]");
  const usersDetailsModalEl = contentEl.querySelector(
    "[data-users-details-modal]"
  );
  const usersDetailsBackdropEl = contentEl.querySelector(
    "[data-users-details-backdrop]"
  );
  const usersDetailsCloseButton = contentEl.querySelector(
    "[data-users-details-close]"
  );
  const usersDetailsNameEl = contentEl.querySelector(
    "[data-users-details-name]"
  );
  const usersDetailsCountEl = contentEl.querySelector(
    "[data-users-details-count]"
  );
  const usersDetailsListEl = contentEl.querySelector(
    "[data-users-details-list]"
  );
  const usersDetailsEmptyEl = contentEl.querySelector(
    "[data-users-details-empty]"
  );
  const usersInviteBox = contentEl.querySelector("[data-users-invite-box]");
  const usersInviteHintEl = contentEl.querySelector("[data-users-invite-hint]");
  const usersInviteNoteEl = contentEl.querySelector("[data-users-invite-note]");
  const usersInviteLinkEl = contentEl.querySelector("[data-users-invite-link]");
  const usersInviteShareButton = contentEl.querySelector(
    "[data-users-invite-share]"
  );
  const usersInviteCopyButton = contentEl.querySelector(
    "[data-users-invite-copy]"
  );
  const usersInviteOpenButton = contentEl.querySelector(
    "[data-users-invite-open]"
  );
  const usersAddButton = contentEl.querySelector("[data-users-add]");
  const usersEditModalEl = contentEl.querySelector("[data-users-edit-modal]");
  const usersEditBackdropEl = contentEl.querySelector("[data-users-edit-backdrop]");
  const usersEditCloseButton = contentEl.querySelector("[data-users-edit-close]");
  const usersEditCancelButton = contentEl.querySelector("[data-users-edit-cancel]");
  const usersEditFormEl = contentEl.querySelector("[data-users-edit-form]");
  const usersEditRoleInput = contentEl.querySelector("[data-users-edit-role-input]");
  const usersEditRoleSuggestionsEl = contentEl.querySelector("[data-users-edit-role-suggestions]");
  const usersEditMessageEl = contentEl.querySelector("[data-users-edit-message]");
  const usersEditOrgNameEl = contentEl.querySelector("[data-users-edit-org-name]");
  const usersEditClearTelegramButton = contentEl.querySelector("[data-users-edit-clear-telegram]");
  const usersEditCreateInviteButton = contentEl.querySelector("[data-users-edit-create-invite]");
  const usersEditDeleteButton = contentEl.querySelector("[data-users-edit-delete]");
  const usersAddModalEl = contentEl.querySelector("[data-users-add-modal]");
  const usersAddBackdropEl = contentEl.querySelector("[data-users-add-backdrop]");
  const usersAddCloseButton = contentEl.querySelector("[data-users-add-close]");
  const usersAddCancelButton = contentEl.querySelector("[data-users-add-cancel]");
  const usersAddFormEl = contentEl.querySelector("[data-users-add-form]");
  const usersAddMessageEl = contentEl.querySelector("[data-users-add-message]");
  const usersAddOrgNameEl = contentEl.querySelector("[data-users-add-org-name]");
  const usersAddFirstNameInput = contentEl.querySelector(
    "#users-add-first-name"
  );
  const usersAddMiddleNameInput = contentEl.querySelector(
    "#users-add-middle-name"
  );
  const usersAddFirstNameSuggestionsEl = contentEl.querySelector(
    "[data-users-add-first-name-suggestions]"
  );
  const usersAddMiddleNameSuggestionsEl = contentEl.querySelector(
    "[data-users-add-middle-name-suggestions]"
  );
  const usersAddInviteBox = contentEl.querySelector(
    "[data-users-add-invite-box]"
  );
  const usersAddInviteHintEl = contentEl.querySelector(
    "[data-users-add-invite-hint]"
  );
  const usersAddInviteNoteEl = contentEl.querySelector(
    "[data-users-add-invite-note]"
  );
  const usersAddInviteLinkEl = contentEl.querySelector(
    "[data-users-add-invite-link]"
  );
  const usersAddInviteShareButton = contentEl.querySelector(
    "[data-users-add-invite-share]"
  );
  const usersAddInviteCopyButton = contentEl.querySelector(
    "[data-users-add-invite-copy]"
  );
  const usersAddInviteOpenButton = contentEl.querySelector(
    "[data-users-add-invite-open]"
  );

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

  const getCollectionCount = (data, fallbackKey) => {
    if (Array.isArray(data)) return data.length;
    if (!data || typeof data !== "object") return 0;
    const collection = data[fallbackKey];
    return Array.isArray(collection) ? collection.length : 0;
  };


  const formatStatsNumber = (value) => new Intl.NumberFormat("ru-RU").format(Number(value) || 0);
  const formatStatsMoney = (value) => `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)} Br`;
  const toIsoDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const parseRuDate = (value) => {
    const match = String(value ?? "").match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})/);
    if (!match) return null;
    const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
    const date = new Date(year, Number(match[2]) - 1, Number(match[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const parseStatsDateTime = (value) => {
    if (!value) return null;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const formatStatsDuration = (value) => {
    const totalMinutes = Math.max(0, Math.round((Number(value) || 0) / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${formatStatsNumber(hours)} ч ${minutes} мин` : `${minutes} мин`;
  };

  const superStatsCalendarState = { view: new Date() };
  const formatStatsRangeDate = (value) => {
    if (!value) return "Не выбрано";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? "Не выбрано"
      : date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
  };
  const updateSuperStatsRangeLabels = () => {
    if (superStatsDateFromLabel) superStatsDateFromLabel.textContent = formatStatsRangeDate(superStatsDateFromInput?.value);
    if (superStatsDateToLabel) superStatsDateToLabel.textContent = formatStatsRangeDate(superStatsDateToInput?.value);
  };
  const renderSuperStatsCalendar = () => {
    if (!superStatsCalendarGridEl || !superStatsCalendarTitleEl) return;
    const view = superStatsCalendarState.view;
    const year = view.getFullYear();
    const month = view.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const fromValue = superStatsDateFromInput?.value || "";
    const toValue = superStatsDateToInput?.value || "";
    superStatsCalendarTitleEl.textContent = first.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
    superStatsCalendarGridEl.innerHTML = "";
    for (let index = 0; index < 42; index += 1) {
      const date = new Date(year, month, index - offset + 1);
      const value = toIsoDate(date);
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(date.getDate());
      button.dataset.date = value;
      button.className = "super-stats-calendar__day";
      if (date.getMonth() !== month) button.classList.add("is-muted");
      if (value === fromValue || value === toValue) button.classList.add("is-edge");
      if (fromValue && toValue && value > fromValue && value < toValue) button.classList.add("is-between");
      button.addEventListener("click", () => {
        if (!superStatsDateFromInput || !superStatsDateToInput) return;
        if (!superStatsDateFromInput.value || (superStatsDateFromInput.value && superStatsDateToInput.value) || value < superStatsDateFromInput.value) {
          superStatsDateFromInput.value = value;
          superStatsDateToInput.value = "";
        } else {
          superStatsDateToInput.value = value;
          superStatsCalendarEl?.classList.add("is-hidden");
          superStatsRangeToggle?.setAttribute("aria-expanded", "false");
          refreshSuperStats();
        }
        updateSuperStatsRangeLabels();
        renderSuperStatsCalendar();
      });
      superStatsCalendarGridEl.appendChild(button);
    }
  };

  const getStatsRange = () => {
    const now = new Date();
    const period = superStatsPeriodSelect?.value || "day";
    if (period === "custom") {
      const from = superStatsDateFromInput?.value ? new Date(`${superStatsDateFromInput.value}T00:00:00`) : null;
      const to = superStatsDateToInput?.value ? new Date(`${superStatsDateToInput.value}T23:59:59`) : null;
      return { from, to, label: "выбранный период" };
    }
    if (period === "year") {
      return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 31, 23, 59, 59), label: "этот год" };
    }
    if (period === "month") {
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59), label: "этот месяц" };
    }
    return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate()), to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59), label: "сегодня" };
  };
  const isDateInRange = (date, range) => {
    if (!date) return false;
    if (range.from && date < range.from) return false;
    if (range.to && date > range.to) return false;
    return true;
  };
  const buildStatsOrgFolder = (org) =>
    sanitizeOrganizationFolderName(String(org?.short_name ?? org?.shortName ?? org?.full_name ?? org?.fullName ?? "").trim());
  const hiddenSuperStatsOrgNames = new Set(["биммакс", "тест", "тест2"]);
  const normalizeSuperStatsOrgName = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[ё]/g, "е")
      .replace(/[^a-zа-я0-9]/gi, "");
  const isHiddenSuperStatsOrg = (org) => {
    const names = getOrgNames(org);
    names.push(buildStatsOrgFolder(org));
    return names.some((name) => hiddenSuperStatsOrgNames.has(normalizeSuperStatsOrgName(name)));
  };
  const getToolPrice = (tool) => Number(String(tool?.["Стоимость"] ?? 0).replace(/\s/g, "").replace(",", ".")) || 0;
  const buildToolCostMap = (tools) => {
    const map = new Map();
    tools.forEach((tool) => {
      [tool?.["Номер"], tool?.["Бух.номер"]].forEach((key) => {
        const normalized = String(key ?? "").trim();
        if (normalized) map.set(normalized, getToolPrice(tool));
      });
    });
    return map;
  };
  const syncSuperStatsControls = () => {
    const period = superStatsPeriodSelect?.value || "day";
    const metric = superStatsMetricSelect?.value || "moves";
    superStatsPeriodButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.superStatsPeriodButton === period);
    });
    superStatsMetricButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.superStatsMetricButton === metric);
    });
  };
  const updateSuperStatsCustomVisibility = () => {
    const isCustom = superStatsPeriodSelect?.value === "custom";
    superStatsCustomFields.forEach((field) => field.classList.toggle("is-hidden", !isCustom));
    if (!isCustom) {
      superStatsCalendarEl?.classList.add("is-hidden");
      superStatsRangeToggle?.setAttribute("aria-expanded", "false");
    } else {
      updateSuperStatsRangeLabels();
      renderSuperStatsCalendar();
    }
    syncSuperStatsControls();
  };
  const superStatsMetricConfig = {
    moves: { title: "По перемещениям", label: "Перемещения", format: formatStatsNumber },
    amount: { title: "По сумме перемещений", label: "Сумма", format: formatStatsMoney },
    tools: { title: "По количеству МТЦ", label: "МТЦ", format: formatStatsNumber },
    toolsAmount: { title: "По стоимости МТЦ", label: "Стоимость", format: formatStatsMoney },
    logins: { title: "По количеству входов", label: "Входы", format: formatStatsNumber },
    workTime: { title: "По времени работы", label: "Время работы", format: formatStatsDuration },
  };
  const renderSuperStatsInsights = (items, totals) => {
    if (!superStatsInsightsEl) return;
    const leader = items[0];
    const avgMoves = items.length ? Math.round(totals.moves / items.length) : 0;
    const avgWorkTime = totals.logins ? Math.round(totals.workTime / totals.logins) : 0;
    const leaderName = leader ? escapeHtml(leader.name) : "Нет данных";
    superStatsInsightsEl.innerHTML = `
      <div class="super-stats-panel__head super-stats-insights__head">
        <div><span>KPI</span><strong>Коротко</strong></div>
        <em>4 метрики</em>
      </div>
      <div class="super-stats-insight super-stats-insight--leader">
        <span aria-hidden="true">🏆</span>
        <div><small>Лидер периода</small><strong>${leaderName}</strong><p>${leader ? "Организация с максимальным показателем" : "Выберите период с данными"}</p></div>
      </div>
      <div class="super-stats-insight">
        <span aria-hidden="true">📊</span>
        <div><small>Среднее перемещений</small><strong>${formatStatsNumber(avgMoves)}</strong><p>На одну организацию</p></div>
      </div>
      <div class="super-stats-insight">
        <span aria-hidden="true">💎</span>
        <div><small>Стоимость МТЦ</small><strong>${formatStatsMoney(totals.toolsAmount)}</strong><p>По выбранной выборке</p></div>
      </div>
      <div class="super-stats-insight">
        <span aria-hidden="true">⏱</span>
        <div><small>Средняя сессия</small><strong>${formatStatsDuration(avgWorkTime)}</strong><p>По входам за период</p></div>
      </div>
    `;
  };
  const renderSuperStatsChart = (items) => {
    if (!superStatsChartEl) return;
    superStatsChartEl.innerHTML = "";
    const metric = superStatsMetricSelect?.value || "moves";
    const config = superStatsMetricConfig[metric] || superStatsMetricConfig.moves;
    if (superStatsFocusEl) superStatsFocusEl.textContent = config.label;
    if (superStatsChartTitleEl) superStatsChartTitleEl.textContent = config.title;
    if (superStatsChartCountEl) superStatsChartCountEl.textContent = `${formatStatsNumber(items.length)} орг.`;
    const maxValue = Math.max(1, ...items.map((item) => item[metric] || 0));
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "super-stats-chart__row";
      const top = document.createElement("div");
      top.className = "super-stats-chart__top";
      const name = document.createElement("span");
      name.textContent = item.name;
      const value = document.createElement("strong");
      value.textContent = config.format(item[metric] || 0);
      const bar = document.createElement("div");
      bar.className = "super-stats-chart__bar";
      const fill = document.createElement("span");
      fill.style.width = `${Math.max(6, Math.round(((item[metric] || 0) / maxValue) * 100))}%`;
      top.append(name, value);
      bar.append(fill);
      row.append(top, bar);
      superStatsChartEl.appendChild(row);
    });
    if (!items.length) {
      superStatsChartEl.innerHTML = '<div class="super-stats-empty">Нет данных за выбранный период.</div>';
    }
  };

  const buildStatsTimeline = (rows) => {
    if (!superStatsTimelineEl) return;
    const metric = superStatsMetricSelect?.value || "moves";
    const config = superStatsMetricConfig[metric] || superStatsMetricConfig.moves;
    const isInventoryMetric = metric === "tools" || metric === "toolsAmount";
    const points = isInventoryMetric
      ? rows.map((row) => [row.name, row[metric] || 0]).filter(([, value]) => value > 0)
      : (() => {
          const totalsByDate = new Map();
          rows.forEach((row) => {
            (row.daily || []).forEach((point) => {
              totalsByDate.set(point.date, (totalsByDate.get(point.date) || 0) + (point[metric] || 0));
            });
          });
          return [...totalsByDate.entries()].sort(([a], [b]) => a.localeCompare(b));
        })();
    const total = points.reduce((sum, [, value]) => sum + value, 0);
    const maxValue = Math.max(1, ...points.map(([, value]) => value));
    if (superStatsTimelineTitleEl) superStatsTimelineTitleEl.textContent = isInventoryMetric ? `${config.label}: по организациям` : `${config.label}: динамика`;
    if (superStatsTimelineTotalEl) superStatsTimelineTotalEl.textContent = config.format(total);
    if (!points.length) {
      superStatsTimelineEl.innerHTML = '<div class="super-stats-empty">Нет данных для дополнительного графика.</div>';
      return;
    }
    superStatsTimelineEl.innerHTML = points.map(([key, value]) => {
      const height = Math.max(10, Math.round((value / maxValue) * 100));
      const label = isInventoryMetric ? escapeHtml(String(key).slice(0, 8)) : (() => {
        const [, month, day] = String(key).split("-");
        return `${day}.${month}`;
      })();
      return `<div class="super-stats-timeline__bar" title="${escapeHtml(String(key))}: ${config.format(value)}"><span style="height:${height}%"></span><small>${label}</small></div>`;
    }).join("");
  };

  const refreshSuperStats = async () => {
    if (!superStatsModalEl) return;
    if (superStatsStatusEl) superStatsStatusEl.textContent = "Считаем статистику...";
    try {
      const [orgData, usersData] = await Promise.all([loadJson(orgFilePath), loadJson(usersFilePath)]);
      const organizations = Array.isArray(orgData?.organizations)
        ? orgData.organizations.filter((org) => !isHiddenSuperStatsOrg(org))
        : [];
      const users = Array.isArray(usersData?.users) ? usersData.users.filter((entry) => !isHiddenListUser(entry)) : [];
      const selectedOrg = superStatsOrgSelect?.value || "all";
      const selectedOrgs = selectedOrg === "all" ? organizations : organizations.filter((org) => buildStatsOrgFolder(org) === selectedOrg);
      const range = getStatsRange();
      const selectedOrgNames = new Set(selectedOrgs.flatMap((org) => getOrgNames(org)));
      const filteredUsers = selectedOrg === "all" ? users : users.filter((user) => selectedOrgNames.has(String(user?.organization ?? "").trim()));
      const rows = await Promise.all(selectedOrgs.map(async (org) => {
        const folder = buildStatsOrgFolder(org);
        const [rawTools, rawMoves, rawVisits] = await Promise.all([
          loadJson(`./${folder}/База с инструментами.json`).catch(() => []),
          loadJson(`./${folder}/Перемещения.json`).catch(() => []),
          loadJson(`./${folder}/Журнал посещений.json`).catch(() => ({ entries: [] })),
        ]);
        const tools = Array.isArray(rawTools) ? rawTools : Array.isArray(rawTools?.tools) ? rawTools.tools : [];
        const moves = Array.isArray(rawMoves) ? rawMoves : Array.isArray(rawMoves?.moves) ? rawMoves.moves : [];
        const visits = Array.isArray(rawVisits) ? rawVisits : Array.isArray(rawVisits?.entries) ? rawVisits.entries : [];
        const costs = buildToolCostMap(tools);
        const periodMoves = moves.filter((move) => isDateInRange(parseRuDate(move?.["Дата перемещения"]), range));
        const dailyMap = new Map();
        const amount = periodMoves.reduce((sum, move) => {
          const number = String(move?.["Номер"] ?? "").trim();
          const accounting = String(move?.["Бух.номер"] ?? "").trim();
          const moveAmount = costs.get(number) ?? costs.get(accounting) ?? 0;
          const moveDate = parseRuDate(move?.["Дата перемещения"]);
          if (moveDate) {
            const dateKey = toIsoDate(moveDate);
            const point = dailyMap.get(dateKey) || { date: dateKey, moves: 0, amount: 0, tools: 0, toolsAmount: 0, logins: 0, workTime: 0 };
            point.moves += 1;
            point.amount += moveAmount;
            dailyMap.set(dateKey, point);
          }
          return sum + moveAmount;
        }, 0);
        let logins = 0;
        let workTime = 0;
        visits.forEach((visit) => {
          const openedAt = parseStatsDateTime(visit?.opened_at ?? visit?.openedAt);
          if (!isDateInRange(openedAt, range)) return;
          const closedAt = parseStatsDateTime(visit?.closed_at ?? visit?.closedAt ?? visit?.last_event_at ?? visit?.lastEventAt) || openedAt;
          const duration = Math.max(0, closedAt.getTime() - openedAt.getTime());
          const dateKey = toIsoDate(openedAt);
          const point = dailyMap.get(dateKey) || { date: dateKey, moves: 0, amount: 0, tools: 0, toolsAmount: 0, logins: 0, workTime: 0 };
          point.logins += 1;
          point.workTime += duration;
          dailyMap.set(dateKey, point);
          logins += 1;
          workTime += duration;
        });
        const toolsAmount = tools.reduce((sum, tool) => sum + getToolPrice(tool), 0);
        return { name: String(org?.short_name ?? org?.full_name ?? "Организация").trim(), tools: tools.length, toolsAmount, moves: periodMoves.length, amount, logins, workTime, daily: [...dailyMap.values()] };
      }));
      const totals = rows.reduce(
        (acc, row) => ({
          tools: acc.tools + row.tools,
          toolsAmount: acc.toolsAmount + row.toolsAmount,
          moves: acc.moves + row.moves,
          amount: acc.amount + row.amount,
          logins: acc.logins + row.logins,
          workTime: acc.workTime + row.workTime,
        }),
        { tools: 0, toolsAmount: 0, moves: 0, amount: 0, logins: 0, workTime: 0 }
      );
      if (superStatsUsersEl) superStatsUsersEl.textContent = formatStatsNumber(filteredUsers.length);
      if (superStatsToolsEl) superStatsToolsEl.textContent = formatStatsNumber(totals.tools);
      if (superStatsToolsAmountEl) superStatsToolsAmountEl.textContent = formatStatsMoney(totals.toolsAmount);
      if (superStatsMovesEl) superStatsMovesEl.textContent = formatStatsNumber(totals.moves);
      if (superStatsAmountEl) superStatsAmountEl.textContent = formatStatsMoney(totals.amount);
      if (superStatsLoginsEl) superStatsLoginsEl.textContent = formatStatsNumber(totals.logins);
      if (superStatsWorkTimeEl) superStatsWorkTimeEl.textContent = formatStatsDuration(totals.workTime);
      if (superStatsSummaryEl) superStatsSummaryEl.textContent = `${selectedOrg === "all" ? "Все" : rows[0]?.name || "Организация"} · ${range.label}`;
      const metric = superStatsMetricSelect?.value || "moves";
      const limit = Number(superStatsLimitSelect?.value || 10);
      const sortedRows = rows.sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
      const visibleRows = limit > 0 ? sortedRows.slice(0, limit) : sortedRows;
      renderSuperStatsChart(visibleRows);
      renderSuperStatsInsights(sortedRows, totals);
      buildStatsTimeline(visibleRows);
      if (superStatsStatusEl) superStatsStatusEl.textContent = "";
    } catch (error) {
      console.error(error);
      if (superStatsStatusEl) superStatsStatusEl.textContent = "Не удалось загрузить статистику.";
    }
  };
  const fillSuperStatsOrganizations = async () => {
    if (!superStatsOrgSelect) return;
    const currentValue = superStatsOrgSelect.value || "all";
    const orgData = await loadJson(orgFilePath).catch(() => ({ organizations: [] }));
    const organizations = Array.isArray(orgData?.organizations)
      ? orgData.organizations.filter((org) => !isHiddenSuperStatsOrg(org))
      : [];
    superStatsOrgSelect.innerHTML = '<option value="all">Все организации</option>';
    organizations.forEach((org) => {
      const option = document.createElement("option");
      option.value = buildStatsOrgFolder(org);
      option.textContent = String(org?.short_name ?? org?.full_name ?? "Организация").trim();
      superStatsOrgSelect.appendChild(option);
    });
    superStatsOrgSelect.value = [...superStatsOrgSelect.options].some((option) => option.value === currentValue) ? currentValue : "all";
  };

  const updateStats = async () => {
    try {
      const [orgData, usersData] = await Promise.all([
        loadJson(orgFilePath),
        loadJson(usersFilePath),
      ]);
      if (orgCountEl) {
        orgCountEl.textContent = getCollectionCount(orgData, "organizations");
      }
      if (userCountEl) {
        userCountEl.textContent = getCollectionCount(usersData, "users");
      }
      await loadFeedbackRequests();
    } catch (error) {
      console.error(error);
      if (orgCountEl) orgCountEl.textContent = "0";
      if (userCountEl) userCountEl.textContent = "0";
      if (feedbackPendingCountEl) feedbackPendingCountEl.textContent = "0";
    }
  };

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

  const loadOrgsAndUsers = async () => {
    const [orgData, usersData] = await Promise.all([
      loadJson(orgFilePath),
      loadJson(usersFilePath),
    ]);
    const organizations = Array.isArray(orgData?.organizations)
      ? orgData.organizations
      : [];
    const users = Array.isArray(usersData?.users)
      ? usersData.users.filter((entry) => !isHiddenListUser(entry))
      : [];
    orgsState.organizations = organizations;
    orgsState.users = users;
    return { organizations, users };
  };

  const buildUserCountsMap = (users) => {
    const counts = new Map();
    users.forEach((user) => {
      const orgName = String(user?.organization ?? "").trim();
      if (!orgName) return;
      counts.set(orgName, (counts.get(orgName) ?? 0) + 1);
    });
    return counts;
  };

  const getOrgUserCount = (org, counts) => {
    const orgNames = getOrgNames(org);
    return orgNames.reduce((total, name) => total + (counts.get(name) ?? 0), 0);
  };

  const orgsState = {
    organizations: [],
    users: [],
  };
  const feedbackState = {
    requests: [],
    activeRequestId: null,
  };

  const feedbackStatusMeta = {
    new: { label: "Новые", tone: "new" },
    "in-progress": { label: "В работе", tone: "progress" },
    closed: { label: "Закрытые", tone: "closed" },
    rejected: { label: "Отклонено", tone: "closed" },
  };

  const normalizeFeedbackStatus = (value) => {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (["new", "новый", "новые", "без ответа"].includes(normalized)) {
      return "new";
    }
    if (["in-progress", "in_progress", "в работе", "work"].includes(normalized)) {
      return "in-progress";
    }
    if (["closed", "закрыто", "закрыт", "done"].includes(normalized)) {
      return "closed";
    }
    if (["rejected", "reject", "отклонено", "отклонить", "отклонен"].includes(normalized)) {
      return "rejected";
    }
    return "new";
  };

  const parseFeedbackDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFeedbackAuthor = (request) => {
    if (request?.anonymous) return "Анонимно";
    const name = String(request?.createdBy?.full_name ?? "").trim();
    return name || "Автор не указан";
  };

  const setFeedbackStatusMessage = (message = "", tone = "") => {
    if (!feedbackStatusEl) return;
    feedbackStatusEl.textContent = message;
    feedbackStatusEl.classList.remove("is-success", "is-error");
    if (tone === "success") feedbackStatusEl.classList.add("is-success");
    if (tone === "error") feedbackStatusEl.classList.add("is-error");
  };

  const getFeedbackBucket = (status) =>
    status === "rejected" ? "closed" : status;

  const getFeedbackCounts = () => {
    const counts = { new: 0, "in-progress": 0, closed: 0 };
    feedbackState.requests.forEach((item) => {
      const status = normalizeFeedbackStatus(item?.status);
      const bucket = getFeedbackBucket(status);
      counts[bucket] += 1;
    });
    return counts;
  };

  const updateFeedbackSummary = () => {
    const counts = getFeedbackCounts();
    const pending = counts.new + counts["in-progress"];
    if (feedbackPendingCountEl) {
      feedbackPendingCountEl.textContent = String(pending);
    }
    if (feedbackSummaryEl) {
      feedbackSummaryEl.textContent = `Не обработано: ${pending} · В работе: ${counts["in-progress"]} · Закрыто/отклонено: ${counts.closed} · Всего: ${feedbackState.requests.length}`;
    }

    ["new", "in-progress", "closed"].forEach((key) => {
      const countEl = contentEl.querySelector(`[data-feedback-count="${key}"]`);
      if (countEl) countEl.textContent = String(counts[key]);
    });
  };


  const setActiveFeedbackTab = (status = "new") => {
    const nextStatus = normalizeFeedbackStatus(status);
    const tabButtons = Array.from(feedbackTabButtons || []);
    tabButtons.forEach((button) => {
      const isActive = button?.dataset?.feedbackTab === nextStatus;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    ["new", "in-progress", "closed"].forEach((key) => {
      const columnEl = contentEl.querySelector(`[data-feedback-column="${key}"]`);
      if (!columnEl) return;
      const isActive = key === nextStatus;
      columnEl.classList.toggle("is-active", isActive);
      columnEl.setAttribute("aria-hidden", isActive ? "false" : "true");
    });
  };

  const saveFeedbackStatus = async (requestId, nextStatus, { notifyUser = true } = {}) => {
    const nextRequests = feedbackState.requests.map((item) => {
      if (Number(item?.id) !== Number(requestId)) return item;
      return { ...item, status: nextStatus, updatedAt: new Date().toISOString() };
    });
    const lastId = nextRequests.reduce((max, item) => {
      const id = Number(item?.id) || 0;
      return Math.max(max, id);
    }, 0);

    await saveJson(feedbackRequestsFilePath, {
      lastId,
      requests: nextRequests,
    }, { user: currentUser });

    feedbackState.requests = nextRequests;
    renderFeedbackBoard();

    const updatedRequest = nextRequests.find(
      (item) => Number(item?.id) === Number(requestId)
    );
    if (
      notifyUser &&
      updatedRequest &&
      !updatedRequest?.anonymous &&
      updatedRequest?.createdBy?.telegram_id
    ) {
      try {
        await saveEntriesViaEndpoint([
          {
            type: "feedback-status-update",
            requestId: Number(updatedRequest.id),
            status: nextStatus,
            organization: updatedRequest.organization ?? "",
            text: updatedRequest.text ?? "",
            createdBy: updatedRequest.createdBy ?? {},
          },
        ]);
      } catch (error) {
        console.warn("Не удалось отправить уведомление пользователю по обращению.", error);
      }
    }
  };

  const openFeedbackPhotoViewer = ({ src = "", alt = "" } = {}) => {
    if (!feedbackPhotoViewerEl || !feedbackPhotoViewerImageEl || !src) return;
    feedbackPhotoViewerImageEl.src = src;
    feedbackPhotoViewerImageEl.alt = alt || "Фото обращения";
    feedbackPhotoViewerEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const closeFeedbackPhotoViewer = () => {
    if (!feedbackPhotoViewerEl || !feedbackPhotoViewerImageEl) return;
    feedbackPhotoViewerEl.classList.add("is-hidden");
    feedbackPhotoViewerImageEl.src = "";
    feedbackPhotoViewerImageEl.alt = "";
    if (
      (feedbackDetailsModalEl && !feedbackDetailsModalEl.classList.contains("is-hidden")) ||
      (feedbackModalEl && !feedbackModalEl.classList.contains("is-hidden")) ||
      (orgsModalEl && !orgsModalEl.classList.contains("is-hidden")) ||
      (usersModalEl && !usersModalEl.classList.contains("is-hidden"))
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const renderFeedbackDetails = (requestId) => {
    const request = feedbackState.requests.find(
      (item) => Number(item?.id) === Number(requestId)
    );
    if (!request) return;

    if (feedbackDetailsTitleEl) {
      feedbackDetailsTitleEl.textContent = `Обращение #${request.id}`;
    }
    if (feedbackDetailsMetaEl) {
      feedbackDetailsMetaEl.textContent = `${parseFeedbackDate(request?.createdAt) || "Дата не указана"} · ${getFeedbackAuthor(request)}`;
    }
    if (feedbackDetailsTextEl) {
      feedbackDetailsTextEl.textContent = String(request?.text ?? "").trim() || "Без текста";
    }
    if (feedbackDetailsPhotosEl) {
      feedbackDetailsPhotosEl.innerHTML = "";
      const photos = Array.isArray(request?.photos) ? request.photos : [];
      if (!photos.length) {
        const empty = document.createElement("div");
        empty.className = "feedback-empty";
        empty.textContent = "Фото не прикреплены";
        feedbackDetailsPhotosEl.appendChild(empty);
      } else {
        photos.forEach((photoName, index) => {
          const image = document.createElement("img");
          image.className = "feedback-details-photo";
          image.loading = "lazy";
          image.decoding = "async";
          image.src = withCacheBuster(`./feedback-photos/${encodeURIComponent(String(photoName))}`);
          image.alt = `Фото ${index + 1} к обращению #${request.id}`;
          image.role = "button";
          image.tabIndex = 0;
          image.addEventListener("click", () => {
            openFeedbackPhotoViewer({ src: image.src, alt: image.alt });
          });
          image.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFeedbackPhotoViewer({ src: image.src, alt: image.alt });
            }
          });
          feedbackDetailsPhotosEl.appendChild(image);
        });
      }
    }

    feedbackActionButtons.forEach((button) => {
      const action = button?.dataset?.feedbackAction;
      if (!action) return;
      let mappedStatus = "new";
      if (action === "reject") mappedStatus = "rejected";
      if (action === "in-progress") mappedStatus = "in-progress";
      if (action === "close") mappedStatus = "closed";
      const currentStatus = normalizeFeedbackStatus(request?.status);
      button.disabled = mappedStatus === currentStatus;
    });
  };

  const openFeedbackDetails = (requestId) => {
    if (!feedbackDetailsModalEl) return;
    feedbackState.activeRequestId = Number(requestId);
    if (feedbackDetailsStatusEl) feedbackDetailsStatusEl.textContent = "";
    renderFeedbackDetails(requestId);
    feedbackDetailsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const closeFeedbackDetails = () => {
    if (!feedbackDetailsModalEl) return;
    closeFeedbackPhotoViewer();
    feedbackDetailsModalEl.classList.add("is-hidden");
    feedbackState.activeRequestId = null;
    if (feedbackDetailsStatusEl) feedbackDetailsStatusEl.textContent = "";
    if (
      (feedbackModalEl && !feedbackModalEl.classList.contains("is-hidden")) ||
      (orgsModalEl && !orgsModalEl.classList.contains("is-hidden")) ||
      (usersModalEl && !usersModalEl.classList.contains("is-hidden"))
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const renderFeedbackBoard = () => {
    const grouped = {
      new: [],
      "in-progress": [],
      closed: [],
    };
    feedbackState.requests.forEach((item) => {
      const status = normalizeFeedbackStatus(item?.status);
      const bucket = getFeedbackBucket(status);
      grouped[bucket].push({ ...item, status });
    });

    ["new", "in-progress", "closed"].forEach((key) => {
      const listEl = contentEl.querySelector(`[data-feedback-list="${key}"]`);
      if (!listEl) return;
      listEl.innerHTML = "";
      const items = grouped[key];
      if (!items.length) {
        const emptyEl = document.createElement("div");
        emptyEl.className = "feedback-empty";
        emptyEl.textContent = "Пока пусто";
        listEl.appendChild(emptyEl);
        return;
      }

      items
        .sort((a, b) => Number(b?.id ?? 0) - Number(a?.id ?? 0))
        .forEach((request) => {
          const card = document.createElement("article");
          card.className = "feedback-item";
          card.role = "button";
          card.tabIndex = 0;

          const top = document.createElement("div");
          top.className = "feedback-item__top";

          const idEl = document.createElement("div");
          idEl.className = "feedback-item__id";
          idEl.textContent = `#${request?.id ?? "—"}`;

          const dateEl = document.createElement("div");
          dateEl.className = "feedback-item__date";
          dateEl.textContent = parseFeedbackDate(request?.createdAt) || "Дата не указана";

          top.append(idEl, dateEl);

          const orgEl = document.createElement("div");
          orgEl.className = "feedback-item__org";
          orgEl.textContent = String(request?.organization ?? "Организация не указана").trim() || "Организация не указана";

          const authorEl = document.createElement("div");
          authorEl.className = "feedback-item__author";
          authorEl.textContent = `Автор: ${getFeedbackAuthor(request)}`;

          const textEl = document.createElement("div");
          textEl.className = "feedback-item__text";
          textEl.textContent = String(request?.text ?? "").trim() || "Без текста";

          const actions = document.createElement("div");
          actions.className = "feedback-item__actions";
          actions.textContent = "Открыть →";

          card.addEventListener("click", () => openFeedbackDetails(request.id));
          card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFeedbackDetails(request.id);
            }
          });

          card.append(top, orgEl, authorEl, textEl, actions);
          listEl.appendChild(card);
        });
    });

    updateFeedbackSummary();
  };

  const loadFeedbackRequests = async () => {
    const data = await loadJson(feedbackRequestsFilePath).catch(() => ({ requests: [] }));
    const requests = Array.isArray(data?.requests) ? data.requests : [];
    feedbackState.requests = requests.map((item, index) => ({
      ...item,
      id: Number(item?.id) || index + 1,
      status: normalizeFeedbackStatus(item?.status),
    }));
    renderFeedbackBoard();
  };

  let selectedOrgName = "";
  let selectedUsersOrgName = "";
  let orgsGroupsContext = null;

  const setUploadStatus = (message = "", tone = "info") => {
    if (!orgsUploadStatusEl) return;
    orgsUploadStatusEl.textContent = message;
    orgsUploadStatusEl.classList.remove("is-success", "is-error");
    if (tone === "success") {
      orgsUploadStatusEl.classList.add("is-success");
    } else if (tone === "error") {
      orgsUploadStatusEl.classList.add("is-error");
    }
  };

  const setUploadProgress = (value = 0, options = {}) => {
    if (!orgsUploadProgressEl) return;
    const safeValue = Math.min(100, Math.max(0, Number(value) || 0));
    const { label, hint } = options;
    orgsUploadProgressEl.classList.remove("is-hidden");
    if (orgsUploadProgressValueEl) {
      orgsUploadProgressValueEl.textContent = `${Math.round(safeValue)}%`;
    }
    if (orgsUploadProgressFillEl) {
      orgsUploadProgressFillEl.style.width = `${safeValue}%`;
    }
    if (orgsUploadProgressThumbEl) {
      orgsUploadProgressThumbEl.style.left = `${safeValue}%`;
    }
    if (orgsUploadProgressTrackEl) {
      orgsUploadProgressTrackEl.setAttribute(
        "aria-valuenow",
        String(Math.round(safeValue))
      );
    }
    if (orgsUploadProgressHintEl && hint) {
      orgsUploadProgressHintEl.textContent = hint;
    }
    if (orgsUploadProgressEl && label) {
      const labelEl = orgsUploadProgressEl.querySelector(".upload-progress__label");
      if (labelEl) labelEl.textContent = label;
    }
  };

  const clearUploadProgress = () => {
    if (!orgsUploadProgressEl) return;
    orgsUploadProgressEl.classList.add("is-hidden");
    if (orgsUploadProgressFillEl) {
      orgsUploadProgressFillEl.style.width = "0%";
    }
    if (orgsUploadProgressThumbEl) {
      orgsUploadProgressThumbEl.style.left = "0%";
    }
    if (orgsUploadProgressValueEl) {
      orgsUploadProgressValueEl.textContent = "0%";
    }
    if (orgsUploadProgressTrackEl) {
      orgsUploadProgressTrackEl.setAttribute("aria-valuenow", "0");
    }
  };

  const clearUploadStatus = () => {
    setUploadStatus("");
  };

  const buildSelectedOrgFolderName = () => {
    if (!selectedOrgName) return "";
    const shortName = pickOrganizationShortName(
      { organizations: orgsState.organizations },
      selectedOrgName
    );
    return sanitizeOrganizationFolderName(shortName || selectedOrgName);
  };

  const normalizeTelegramGroupName = (value = "") =>
    String(value ?? "").trim();

  const normalizeTelegramGroupId = (value = "") => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) return "";
    return trimmed;
  };

  const normalizeTelegramGroupEntry = (entry = {}) => {
    const name = normalizeTelegramGroupName(entry.name ?? entry.title ?? "");
    const telegramId = normalizeTelegramGroupId(
      entry.telegramId ?? entry.telegram_id ?? ""
    );
    return { name, telegramId };
  };

  const normalizeTelegramGroups = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => normalizeTelegramGroupEntry(item ?? {}))
      .filter((item) => item.name || item.telegramId);
  };

  const resolvePhotoFileName = (name = "") => {
    if (typeof sanitizePhotoFileName === "function") {
      return sanitizePhotoFileName(name);
    }
    const trimmed = String(name ?? "").trim();
    const cleaned = trimmed.replace(/[\\/:"*?<>|]+/g, "_");
    return cleaned.replace(/\s+/g, " ").trim();
  };

  const parsePhotoKeyFromName = (fileName) => {
    if (!fileName) return "";
    const baseName = String(fileName).replace(/\.[^.]+$/, "");
    const match = baseName.match(/^(\d+)(?:_|$)/);
    if (!match) return "";
    return normalizeToolNumberValue(match[1]);
  };

  const normalizeAccountingPhotoNumberValue = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const digitsOnly = raw.replace(/\D+/g, "");
    if (!digitsOnly) return "";
    const trimmed = digitsOnly.replace(/^0+/, "");
    return trimmed || "0";
  };

  const parseAccountingPhotoKeyFromName = (fileName) => {
    if (!fileName) return "";
    const baseName = String(fileName).replace(/\.[^.]+$/, "").trim();
    if (!baseName) return "";
    const accountingMatch = baseName.match(/^(?:№|N)?\s*([0-9][0-9/\-]*)/i);
    if (accountingMatch?.[1]) {
      return normalizeAccountingPhotoNumberValue(accountingMatch[1]);
    }
    const fallbackMatch = baseName.match(/^(\d+)(?:_|$)/);
    if (!fallbackMatch?.[1]) return "";
    return normalizeAccountingPhotoNumberValue(fallbackMatch[1]);
  };

  const resolveUploadOrganization = async () => {
    const selectedOrganization = String(selectedOrgName ?? "").trim();
    let organizationName = selectedOrganization || String(currentUser?.organization ?? "").trim();

    if (!selectedOrganization) {
      try {
        const usersData = await loadJson(usersFilePath);
        const users = Array.isArray(usersData?.users) ? usersData.users : [];
        const telegramId = normalizeTelegramId(currentUser?.telegram_id ?? null);
        const matchedUser =
          users.find(
            (user) =>
              telegramId && normalizeTelegramId(user?.telegram_id ?? null) === telegramId
          ) ??
          users.find(
            (user) =>
              String(user?.full_name ?? "").trim() ===
                String(currentUser?.full_name ?? "").trim() &&
              String(user?.organization ?? "").trim() ===
                String(currentUser?.organization ?? "").trim() &&
              String(user?.role ?? "").trim() === String(currentUser?.role ?? "").trim()
          );
        if (matchedUser?.organization) {
          organizationName = String(matchedUser.organization).trim();
        }
      } catch (error) {
        console.warn("Не удалось определить организацию пользователя.", error);
      }
    }

    if (!organizationName) {
      return {
        organizationName: "",
        orgFolder: "",
        numberType: "",
      };
    }

    let orgData = null;
    try {
      orgData = await loadJson(orgFilePath);
    } catch (error) {
      console.warn("Не удалось загрузить список организаций.", error);
    }

    const orgRecord = orgData ? findOrganizationRecord(orgData, organizationName) : null;
    const shortName = orgRecord?.short_name ?? organizationName;
    const orgFolder = sanitizeOrganizationFolderName(shortName || organizationName);
    return {
      organizationName,
      orgFolder,
      numberType: String(orgRecord?.number_type ?? "Номер приложения").trim(),
    };
  };

  const loadToolsData = async (orgFolder) => {
    if (!orgFolder) return [];
    const toolsPath = `./${orgFolder}/База с инструментами.json`;
    try {
      const raw = await loadJson(toolsPath);
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.tools)) return raw.tools;
    } catch (error) {
      console.warn("Не удалось загрузить базу инструментов организации.", error);
    }
    return [];
  };

  const normalizePurchaseDate = (value) => {
    if (!value) return "";
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return formatDateValue(value);
    }
    if (typeof value === "number" && window.XLSX?.SSF?.parse_date_code) {
      const parsed = window.XLSX.SSF.parse_date_code(value);
      if (parsed?.y && parsed?.m && parsed?.d) {
        const day = String(parsed.d).padStart(2, "0");
        const month = String(parsed.m).padStart(2, "0");
        return `${day}.${month}.${parsed.y}`;
      }
    }
    return String(value).trim();
  };

  const pluralize = (count, one, few, many) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  };

  const parseLaunchDate = (value) => {
    if (!value) return null;
    const [day, month, year] = String(value).split(".").map(Number);
    if (!day || !month || !year) return null;
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  };

  const formatWorkDuration = (launchDate) => {
    if (!launchDate) return "";
    const now = new Date();
    if (launchDate > now) return "запуск впереди";
    let years = now.getFullYear() - launchDate.getFullYear();
    let months = now.getMonth() - launchDate.getMonth();
    let days = now.getDate() - launchDate.getDate();
    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    const parts = [];
    if (years > 0) {
      parts.push(
        `${years} ${pluralize(years, "год", "года", "лет")}`
      );
    }
    if (months > 0 && parts.length < 2) {
      parts.push(
        `${months} ${pluralize(months, "месяц", "месяца", "месяцев")}`
      );
    }
    if (!parts.length) {
      const safeDays = Math.max(days, 1);
      parts.push(
        `${safeDays} ${pluralize(safeDays, "день", "дня", "дней")}`
      );
    }
    return parts.join(" ");
  };

  const resetEnergyInvite = () => {
    if (!energyInviteBox) return;
    energyInviteBox.classList.add("is-hidden");
    delete energyInviteBox.dataset.shareText;
    delete energyInviteBox.dataset.telegramLink;
    delete energyInviteBox.dataset.telegramAppLink;
    if (energyInviteLinkEl) {
      energyInviteLinkEl.value = "";
    }
    if (energyInviteHintEl) {
      energyInviteHintEl.textContent =
        "Выберите энергетика в списке, чтобы сформировать ссылку.";
    }
    if (energyInviteNoteEl) {
      energyInviteNoteEl.textContent =
        "Откройте ссылку в Telegram — ID сохранится автоматически.";
    }
    if (energyInviteShareButton) energyInviteShareButton.disabled = true;
    if (energyInviteCopyButton) energyInviteCopyButton.disabled = true;
    if (energyInviteOpenButton) {
      energyInviteOpenButton.disabled = true;
      energyInviteOpenButton.textContent = "Открыть в Telegram";
    }
  };

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
    users.forEach((user) => {
      const fullName = String(user?.full_name ?? "").trim();
      if (!fullName) return;
      const { lastName, firstName, middleName } = parseUserNameParts(fullName);
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

  const renderSuggestions = (containerEl, items, inputEl) => {
    if (!containerEl) return;
    containerEl.innerHTML = "";
    if (!items.length) {
      containerEl.classList.add("is-hidden");
      return;
    }
    items.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "suggestions__item";
      button.textContent = item;
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        if (inputEl) {
          inputEl.value = item;
          inputEl.dispatchEvent(new Event("input", { bubbles: true }));
        }
        containerEl.classList.add("is-hidden");
      });
      containerEl.appendChild(button);
    });
    containerEl.classList.remove("is-hidden");
  };

  const attachSuggestions = (inputEl, containerEl, sourceKey) => {
    if (!inputEl || !containerEl) return;
    const update = () => {
      const source = usersNameSuggestions[sourceKey] ?? [];
      const items = getFilteredSuggestions(inputEl.value, source);
      renderSuggestions(containerEl, items, inputEl);
    };
    const hide = () => {
      containerEl.classList.add("is-hidden");
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

  const attachUsersEditRoleDropdown = () => {
    if (!usersEditRoleInput || !usersEditRoleSuggestionsEl) return;
    const fieldEl = usersEditRoleInput.closest(".form-field--selectable");
    const options = getUsersEditableRoleOptions();
    usersEditRoleInput.dataset.roleOptions = options.join("|");
    const hide = () => {
      usersEditRoleSuggestionsEl.classList.add("is-hidden");
      usersEditRoleInput.setAttribute("aria-expanded", "false");
      fieldEl?.classList.remove("is-suggestions-open");
    };
    const show = () => {
      renderSuggestions(usersEditRoleSuggestionsEl, options, usersEditRoleInput);
      usersEditRoleInput.setAttribute("aria-expanded", "true");
      fieldEl?.classList.add("is-suggestions-open");
    };
    usersEditRoleSuggestionsEl.setAttribute("role", "listbox");
    usersEditRoleInput.setAttribute("role", "combobox");
    usersEditRoleInput.setAttribute("aria-autocomplete", "none");
    usersEditRoleInput.setAttribute("aria-expanded", "false");
    usersEditRoleInput.addEventListener("focus", show);
    usersEditRoleInput.addEventListener("click", show);
    usersEditRoleInput.addEventListener("blur", () => {
      setTimeout(hide, 120);
    });
  };

  attachUsersEditRoleDropdown();

  const createResponsibleInvite = async (user) => {
    if (!usersInviteBox || !user) return;
    const fullName = String(user?.full_name ?? "Ответственный").trim();
    const organizationName = String(
      user?.organization ?? selectedUsersOrgName ?? ""
    ).trim();
    const roleName = String(user?.role ?? responsibleRole).trim() || responsibleRole;
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
            },
          },
        ],
      };
      await saveEntries([
        { path: pendingRegistrationsFilePath, data: nextRegistrationsData },
      ]);

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
          ? "При открытии в Telegram ID сохранится автоматически и пользователь сразу увидит свою страницу."
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

  const createEnergyInvite = async (user) => {
    if (!energyInviteBox || !user) return;
    const energyFullName = String(user?.full_name ?? "Энергетик").trim();
    const organizationName = String(
      user?.organization ?? selectedOrgName ?? ""
    ).trim();
    if (!energyFullName || !organizationName) return;

    try {
      const registrationsData = await loadRegistrations();
      const registrations = registrationsData.registrations ?? [];
      const existing = registrations.find(
        (item) =>
          item.user?.full_name === energyFullName &&
          item.user?.organization === organizationName &&
          item.user?.role === "Энергетик"
      );
      const registrationToken = existing?.token ?? createRegistrationToken();

      if (!existing) {
        const nextRegistrationsData = {
          registrations: [
            ...registrations,
            {
              token: registrationToken,
              created_at: new Date().toISOString(),
              user: {
                full_name: energyFullName,
                organization: organizationName,
                role: "Энергетик",
              },
            },
          ],
        };
        await saveEntries([
          { path: pendingRegistrationsFilePath, data: nextRegistrationsData },
        ]);
      }

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

      if (energyInviteHintEl) {
        energyInviteHintEl.textContent = "Ссылка для приглашения готова.";
      }
      if (energyInviteLinkEl) {
        energyInviteLinkEl.value = fallbackLink;
      }
      energyInviteBox.dataset.shareText = `Контакт энергетика: ${energyFullName}. Организация: ${organizationName}.`;
      energyInviteBox.dataset.telegramLink = fallbackLink;
      if (telegramLinks?.appLink) {
        energyInviteBox.dataset.telegramAppLink = telegramLinks.appLink;
      } else {
        delete energyInviteBox.dataset.telegramAppLink;
      }
      if (energyInviteNoteEl) {
        energyInviteNoteEl.textContent = telegramLinks?.webLink
          ? "При открытии в Telegram ID сохранится автоматически и энергетик сразу увидит свою страницу."
          : "Бот ещё не указан. Скопируйте ссылку и отправьте её вручную.";
      }
      if (energyInviteShareButton) {
        energyInviteShareButton.disabled = !energyInviteLinkEl?.value;
      }
      if (energyInviteCopyButton) {
        energyInviteCopyButton.disabled = !energyInviteLinkEl?.value;
      }
      if (energyInviteOpenButton) {
        energyInviteOpenButton.disabled = !energyInviteLinkEl?.value;
        energyInviteOpenButton.textContent = telegramLinks?.webLink
          ? "Открыть в Telegram"
          : "Открыть ссылку";
      }
      energyInviteBox.classList.remove("is-hidden");
    } catch (error) {
      console.error(error);
      if (energyInviteNoteEl) {
        energyInviteNoteEl.textContent =
          "Не удалось сформировать ссылку. Попробуйте позже.";
      }
      energyInviteBox.classList.remove("is-hidden");
    }
  };

  const renderEnergyList = (energyUsers) => {
    if (!orgsEnergyListEl) return;
    orgsEnergyListEl.innerHTML = "";
    if (!energyUsers.length) {
      const empty = document.createElement("div");
      empty.className = "orgs-energy__empty";
      empty.textContent = "Энергетики не добавлены.";
      orgsEnergyListEl.appendChild(empty);
      resetEnergyInvite();
      return;
    }

    energyUsers.forEach((user) => {
      const card = document.createElement("div");
      card.className = "orgs-energy__item";

      const name = document.createElement("div");
      name.className = "orgs-energy__name";
      name.textContent = String(user?.full_name ?? "Без имени").trim();

      const status = document.createElement("div");
      const hasId = Number(user?.telegram_id) !== 0;
      status.className = `orgs-energy__status${
        hasId ? " orgs-energy__status--ok" : ""
      }`;
      status.textContent = hasId
        ? "ID привязан"
        : "ID не указан · нажмите, чтобы пригласить";

      if (!hasId) {
        card.classList.add("is-actionable");
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute(
          "aria-label",
          `Пригласить энергетика ${name.textContent}`
        );
        const handleInvite = () => {
          createEnergyInvite(user);
        };
        card.addEventListener("click", handleInvite);
        card.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleInvite();
          }
        });
      }

      card.append(name, status);
      orgsEnergyListEl.appendChild(card);
    });
  };

  const parseExcelToolsData = (sheet) => {
    const rows = window.XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    });
    if (!rows.length) {
      return { tools: [], objects: [], toolGroups: [] };
    }
    const tools = [];
    const objectsSet = new Set();
    const toolGroupsSet = new Set();
    const columnMap = [
      { key: "Номер", index: 0 },
      { key: "Бух.номер", index: 1 },
      { key: "Наименование", index: 2 },
      { key: "Производитель", index: 3 },
      { key: "Модель", index: 4 },
      { key: "Наименование по бухгалтерии", index: 5 },
      { key: "Стоимость", index: 6 },
      { key: "Дата покупки", index: 7 },
      { key: "Ответственный", index: 8 },
      { key: "Объект", index: 9 },
      { key: "Серийный номер", index: 10 },
      { key: "Граппа инструментов", index: 11 },
    ];

    rows.slice(1).forEach((row) => {
      if (!Array.isArray(row)) return;
      const entry = {};
      let hasValue = false;
      columnMap.forEach(({ key, index }) => {
        const value = row[index];
        let normalized = value;
        if (key === "Стоимость") {
          normalized = normalizeCostValue(value);
          if (normalized === null) {
            normalized = "";
          }
        } else if (key === "Дата покупки") {
          normalized = normalizePurchaseDate(value);
        } else if (key === "Граппа инструментов") {
          normalized = sanitizeToolGroupName(value);
        } else {
          normalized = String(value ?? "").trim();
        }
        if (normalized !== "" && normalized !== null) {
          hasValue = true;
        }
        entry[key] = normalized;
      });

      if (!hasValue) return;
      entry["Статус"] = "Рабочий";
      entry["Количество фото"] = 0;
      const objectName = sanitizeObjectName(entry["Объект"] ?? "");
      if (objectName) {
        objectsSet.add(objectName);
        entry["Объект"] = objectName;
      }
      const toolGroupName = sanitizeToolGroupName(
        entry["Граппа инструментов"] ?? ""
      );
      if (toolGroupName) {
        toolGroupsSet.add(toolGroupName);
        entry["Граппа инструментов"] = toolGroupName;
      }
      tools.push(entry);
    });

    return {
      tools,
      objects: Array.from(objectsSet),
      toolGroups: Array.from(toolGroupsSet),
    };
  };

  async function loadObjectsData(orgFolder) {
    const objectsPath = `./${orgFolder}/Объекты.json`;
    try {
      const raw = await loadJson(objectsPath);
      return normalizeObjectsData(raw);
    } catch (error) {
      console.warn("Не удалось загрузить список объектов.", error);
      return [];
    }
  }

  const mergeObjects = (existingObjects, newObjects) => {
    const normalizedSet = new Set(
      existingObjects.map((item) => sanitizeObjectName(item.name).toLowerCase())
    );
    const merged = [...existingObjects];
    newObjects.forEach((name) => {
      const normalized = sanitizeObjectName(name);
      if (!normalized) return;
      const key = normalized.toLowerCase();
      if (normalizedSet.has(key)) return;
      normalizedSet.add(key);
      merged.push({ id: buildObjectId(), name: normalized });
    });
    return merged;
  };

  const selectOrganization = (orgName) => {
    if (!orgName) {
      return;
    }
    resetEnergyInvite();
    const org = orgsState.organizations.find(
      (item) => getOrgDisplayName(item) === orgName
    );
    if (!org) {
      return;
    }

    selectedOrgName = orgName;
    if (orgsDetailsNameEl) {
      orgsDetailsNameEl.textContent = orgName;
    }
    if (orgsDetailsLaunchEl) {
      const launchDateRaw = String(
        org?.launch_date ?? org?.launchDate ?? ""
      ).trim();
      const launchDate = parseLaunchDate(launchDateRaw);
      const duration = formatWorkDuration(launchDate);
      const suffix = duration ? ` (${duration})` : "";
      orgsDetailsLaunchEl.textContent = launchDateRaw
        ? `Дата запуска: ${launchDateRaw}${suffix}`
        : "Дата запуска: —";
    }

    const orgNames = getOrgNames(org);
    const orgUsers = orgsState.users.filter((user) => {
      const name = String(user?.organization ?? "").trim();
      return (orgNames.includes(name) || name === orgName) && isVisibleUsersDirectoryUser(user);
    });
    if (orgsDetailUsersEl) {
      orgsDetailUsersEl.textContent = formatUserCount(orgUsers.length);
    }
    if (orgsDetailToolsTotalEl) {
      orgsDetailToolsTotalEl.textContent = "—";
    }
    if (orgsDetailToolsActiveEl) {
      orgsDetailToolsActiveEl.textContent = "—";
    }
    const energyUsers = orgUsers.filter(
      (user) => String(user?.role ?? "").trim() === "Энергетик"
    );
    renderEnergyList(energyUsers);

    if (orgsListEl) {
      orgsListEl.querySelectorAll(".orgs-row").forEach((row) => {
        row.classList.toggle("is-active", row.dataset.orgName === orgName);
      });
    }

    if (orgsDetailsModalEl) {
      orgsDetailsModalEl.classList.remove("is-hidden");
      document.body.style.overflow = "hidden";
    }
  };

  const setGroupsMessage = (message = "") => {
    if (orgsGroupsMessageEl) {
      orgsGroupsMessageEl.textContent = message;
    }
  };

  const buildGroupsSignature = (groups = []) =>
    JSON.stringify(
      groups.map((group) => ({
        name: String(group?.name ?? "").trim(),
        telegramId: String(group?.telegramId ?? "").trim(),
      }))
    );

  const setGroupsSaveState = (hasChanges) => {
    if (!orgsGroupsSaveButton) return;
    orgsGroupsSaveButton.disabled = !hasChanges;
    orgsGroupsSaveButton.classList.toggle("is-active", hasChanges);
  };

  const updateGroupStatus = (row, value) => {
    const statusEl = row.querySelector("[data-group-status]");
    if (!statusEl) return;
    const connected = Boolean(normalizeTelegramGroupId(value));
    statusEl.textContent = connected ? "Подключена" : "Не подключена";
    statusEl.classList.toggle("is-connected", connected);
  };

  const createGroupsEmptyState = () => {
    const empty = document.createElement("div");
    empty.className = "orgs-groups__empty";
    empty.textContent = "Добавьте первую группу для рассылок.";
    return empty;
  };

  const renderGroupsList = (groups = []) => {
    if (!orgsGroupsListEl) return;
    orgsGroupsListEl.innerHTML = "";
    if (groups.length === 0) {
      orgsGroupsListEl.appendChild(createGroupsEmptyState());
      return;
    }

    groups.forEach((group) => {
      const row = document.createElement("div");
      row.className = "orgs-groups__row";
      row.dataset.orgsGroupRow = "true";
      row.innerHTML = `
        <div class="orgs-groups__fields">
          <label class="orgs-groups__field">
            <span>Название рассылки</span>
            <input
              class="form-input"
              type="text"
              inputmode="text"
              placeholder="Например, Утренний отчёт"
              data-group-field="name"
              value="${escapeHtml(group.name)}"
            />
          </label>
          <label class="orgs-groups__field">
            <span>ID группы</span>
            <div class="orgs-groups__id-row">
              <input
                class="form-input"
                type="text"
                inputmode="numeric"
                placeholder="-1001234567890"
                data-group-field="telegramId"
                value="${escapeHtml(group.telegramId)}"
              />
              <span class="orgs-groups__status" data-group-status></span>
            </div>
          </label>
        </div>
        <div class="orgs-groups__actions">
          <button
            class="action-danger orgs-groups__remove"
            type="button"
            data-group-remove
            aria-label="Удалить группу"
          >
            Удалить группу
          </button>
        </div>
      `;
      const idInput = row.querySelector('[data-group-field="telegramId"]');
      if (idInput) {
        updateGroupStatus(row, idInput.value);
        idInput.addEventListener("input", (event) => {
          updateGroupStatus(row, event.target.value);
        });
      }
      row.addEventListener("input", () => {
        updateGroupsSaveState();
      });
      const removeButton = row.querySelector("[data-group-remove]");
      removeButton?.addEventListener("click", () => {
        row.remove();
        if (orgsGroupsListEl && orgsGroupsListEl.children.length === 0) {
          orgsGroupsListEl.appendChild(createGroupsEmptyState());
        }
        updateGroupsSaveState();
      });
      orgsGroupsListEl.appendChild(row);
    });
  };

  const collectGroupsFromForm = (includeEmpty = false) => {
    if (!orgsGroupsListEl) return [];
    const rows = Array.from(
      orgsGroupsListEl.querySelectorAll("[data-orgs-group-row]")
    );
    const groups = rows.map((row) => {
      const nameInput = row.querySelector('[data-group-field="name"]');
      const telegramIdInput = row.querySelector(
        '[data-group-field="telegramId"]'
      );
      return normalizeTelegramGroupEntry({
        name: nameInput?.value ?? "",
        telegramId: telegramIdInput?.value ?? "",
      });
    });
    if (includeEmpty) {
      return groups;
    }
    return groups.filter((item) => item.name || item.telegramId);
  };

  const updateGroupsSaveState = () => {
    if (!orgsGroupsContext) return;
    const currentSignature = buildGroupsSignature(
      collectGroupsFromForm(true)
    );
    const baseSignature =
      orgsGroupsContext.initialGroupsSignature ?? buildGroupsSignature([]);
    setGroupsSaveState(currentSignature !== baseSignature);
  };

  const openOrgsGroupsModal = async () => {
    if (!orgsGroupsModalEl) return;
    if (!selectedOrgName) {
      setUploadStatus("Сначала выберите организацию.", "error");
      return;
    }
    const orgFolder = buildSelectedOrgFolderName();
    if (!orgFolder) {
      setUploadStatus("Не удалось определить папку организации.", "error");
      return;
    }
    const settingsPath = `./${orgFolder}/Настройки.json`;
    const settingsData = ensureSettingsData(
      await loadJson(settingsPath).catch(() => ({ users: {} }))
    );
    const groups = normalizeTelegramGroups(
      settingsData.organization?.telegramGroups ?? []
    );
    orgsGroupsContext = {
      settingsPath,
      settingsData,
      initialGroupsSignature: buildGroupsSignature(groups),
    };
    renderGroupsList(groups);
    if (orgsGroupsSubtitleEl) {
      orgsGroupsSubtitleEl.textContent = selectedOrgName;
    }
    setGroupsMessage("");
    updateGroupsSaveState();
    orgsGroupsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const closeOrgsGroupsModal = () => {
    if (!orgsGroupsModalEl) return;
    orgsGroupsModalEl.classList.add("is-hidden");
    setGroupsMessage("");
    orgsGroupsContext = null;
    if (orgsDetailsModalEl && !orgsDetailsModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else if (orgsModalEl && !orgsModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const handleUploadPhotos = async (files) => {
    const fileList = Array.from(files ?? []);
    if (!fileList.length) return;

    setUploadStatus("Проверяем фото...");
    setUploadProgress(2, {
      label: "Подготовка фото",
      hint: "Проверяем названия и типы файлов...",
    });
    if (orgsUploadPhotoButton) orgsUploadPhotoButton.disabled = true;

    try {
      const { orgFolder, numberType } = await resolveUploadOrganization();
      if (!orgFolder) {
        setUploadStatus("Не удалось определить организацию пользователя.", "error");
        setUploadProgress(0, {
          label: "Ошибка",
          hint: "Не удалось определить организацию.",
        });
        return;
      }

      const tools = await loadToolsData(orgFolder);
      if (!tools.length) {
        setUploadStatus("Сначала загрузите базу инструментов.", "error");
        setUploadProgress(0, {
          label: "Нет базы",
          hint: "Сначала загрузите базу инструментов.",
        });
        return;
      }

      const usesAccountingNumber = numberType === "Бухгалтерский номер";
      const numberKeys = usesAccountingNumber
        ? ["Бух.номер", "Бухгалтерский номер", "Номер"]
        : ["Номер", "Бух.номер"];
      const toolIndexByNumber = new Map();
      tools.forEach((tool, index) => {
        numberKeys.forEach((keyName) => {
          const rawValue = tool?.[keyName];
          const key = usesAccountingNumber
            ? normalizeAccountingPhotoNumberValue(rawValue)
            : normalizeToolNumberValue(rawValue);
          if (!key) return;
          if (!toolIndexByNumber.has(key)) {
            toolIndexByNumber.set(key, index);
          }
        });
      });

      const unknownPhotoFiles = [];
      const collectUnknownPhoto = (file, reason) => {
        unknownPhotoFiles.push({
          file,
          reason,
          safeName: resolvePhotoFileName(file?.name ?? ""),
        });
      };

      if (!toolIndexByNumber.size) {
        setUploadStatus(
          usesAccountingNumber
            ? "В базе не найдены бухгалтерские номера для проверки фото."
            : "В базе инструментов не найдены номера для проверки фото.",
          "error"
        );
        setUploadProgress(0, {
          label: "Нет номеров",
          hint: usesAccountingNumber
            ? "Проверьте, что в базе заполнена колонка «Бух.номер»."
            : "Проверьте, что в базе заполнена колонка «Номер».",
        });
        return;
      }

      const matchedFiles = [];
      const matchedCounts = new Map();
      const skipped = {
        invalidName: 0,
        noMatch: 0,
        nonImage: 0,
        invalidSamples: [],
        noMatchSamples: [],
        nonImageSamples: [],
      };

      fileList.forEach((file) => {
        if (file.type && !file.type.startsWith("image/")) {
          skipped.nonImage += 1;
          if (skipped.nonImageSamples.length < 5) {
            skipped.nonImageSamples.push(file.name);
          }
          return;
        }
        const key = usesAccountingNumber
          ? parseAccountingPhotoKeyFromName(file.name)
          : parsePhotoKeyFromName(file.name);
        if (!key) {
          skipped.invalidName += 1;
          if (skipped.invalidSamples.length < 5) {
            skipped.invalidSamples.push(file.name);
          }
          collectUnknownPhoto(file, "invalid-name");
          return;
        }
        const toolIndex = toolIndexByNumber.get(key);
        if (toolIndex === undefined) {
          skipped.noMatch += 1;
          if (skipped.noMatchSamples.length < 5) {
            skipped.noMatchSamples.push(file.name);
          }
          collectUnknownPhoto(file, "no-match");
          return;
        }
        const safeName = resolvePhotoFileName(file.name) || file.name;
        matchedFiles.push({ file, toolIndex, safeName });
        matchedCounts.set(toolIndex, (matchedCounts.get(toolIndex) ?? 0) + 1);
      });

      if (!matchedFiles.length) {
        const parts = [];
        if (skipped.invalidName) {
          const examples = skipped.invalidSamples.length
            ? ` Например: ${skipped.invalidSamples.join(", ")}.`
            : "";
          parts.push(`Без номера: ${skipped.invalidName}.${examples}`);
        }
        if (skipped.noMatch) {
          const examples = skipped.noMatchSamples.length
            ? ` Например: ${skipped.noMatchSamples.join(", ")}.`
            : "";
          parts.push(
            `Номера не найдены в базе: ${skipped.noMatch}.${examples}`
          );
        }
        if (skipped.nonImage) {
          const examples = skipped.nonImageSamples.length
            ? ` Например: ${skipped.nonImageSamples.join(", ")}.`
            : "";
          parts.push(`Не фото: ${skipped.nonImage}.${examples}`);
        }
        const hint = parts.length
          ? parts.join(" ")
          : "Файлы не совпали с номерами из базы.";
        setUploadStatus(
          "Нет фото с корректными номерами для загрузки.",
          "error"
        );
        setUploadProgress(0, {
          label: "Нет совпадений",
          hint,
        });
        return;
      }

      setUploadStatus(`Загружаем фото (${matchedFiles.length} шт.)...`);
      setUploadProgress(10, {
        label: "Обработка фото",
        hint: "Подготавливаем изображения...",
      });

      const fileEntries = [];
      const totalFiles = matchedFiles.length;
      for (let index = 0; index < matchedFiles.length; index += 1) {
        const { file, safeName } = matchedFiles[index];
        const content = await readFileAsBase64(file);
        fileEntries.push({
          type: "file",
          path: `${orgFolder}/Фото инструментов/${safeName}`,
          content,
          encoding: "base64",
          mime: file.type || "image/*",
          ...buildUploadUserMeta({ organizationName: selectedOrgName }),
        });
        const progress = 10 + ((index + 1) / totalFiles) * 50;
        setUploadProgress(progress, {
          label: "Обработка фото",
          hint: `Готовим файл ${index + 1} из ${totalFiles}...`,
        });
      }

      for (let index = 0; index < unknownPhotoFiles.length; index += 1) {
        const entry = unknownPhotoFiles[index];
        const content = await readFileAsBase64(entry.file);
        const fallbackName = `unknown_${Date.now()}_${index + 1}_${entry.reason}.jpg`;
        const safeName = entry.safeName || fallbackName;
        fileEntries.push({
          type: "file",
          path: `${orgFolder}/Фото непонятно/${safeName}`,
          content,
          encoding: "base64",
          mime: entry.file.type || "image/*",
          ...buildUploadUserMeta({ organizationName: selectedOrgName }),
        });
      }

      const updatedTools = tools.map((tool, index) => {
        const count = matchedCounts.get(index) ?? 0;
        if (!count) return tool;
        const current = Number.parseInt(tool?.["Количество фото"] ?? 0, 10);
        const safeCurrent = Number.isFinite(current) ? current : 0;
        return { ...tool, "Количество фото": safeCurrent + count };
      });

      await uploadPhotoEntriesInBatches(fileEntries, {
        onBatch: (currentBatch, totalBatches) => {
          const progress = 60 + (currentBatch / totalBatches) * 25;
          setUploadProgress(progress, {
            label: "Загрузка фото",
            hint: `Передаём фото ${currentBatch} из ${totalBatches}...`,
          });
        },
      });

      setUploadProgress(90, {
        label: "Синхронизация",
        hint: "Обновляем базу инструментов...",
      });
      await saveEntries([
        {
          path: `${orgFolder}/База с инструментами.json`,
          data: updatedTools,
          ...buildUploadUserMeta({ organizationName: selectedOrgName }),
        },
      ]);

      const skippedTotal = skipped.invalidName + skipped.noMatch + skipped.nonImage;
      const skippedParts = [];
      if (skipped.invalidName) {
        skippedParts.push(`без номера: ${skipped.invalidName}`);
      }
      if (skipped.noMatch) {
        skippedParts.push(`нет в базе: ${skipped.noMatch}`);
      }
      if (skipped.nonImage) {
        skippedParts.push(`не фото: ${skipped.nonImage}`);
      }
      const skippedNote = skippedParts.length
        ? ` Пропущено ${skippedTotal} (${skippedParts.join(", ")}).`
        : "";
      const unknownNote = unknownPhotoFiles.length
        ? ` В «Фото непонятно» сохранено: ${unknownPhotoFiles.length}.`
        : "";
      setUploadStatus(
        `Фото загружены: ${matchedFiles.length}.${skippedNote}${unknownNote}`,
        "success"
      );
      setUploadProgress(100, {
        label: "Готово",
        hint: "Фото загружены и сохранены.",
      });
    } catch (error) {
      console.error(error);
      const reason =
        error instanceof Error && error.message
          ? `Причина: ${error.message}`
          : "Не удалось определить причину.";
      setUploadStatus(
        `Не удалось загрузить фото. ${reason}`,
        "error"
      );
      setUploadProgress(0, {
        label: "Ошибка",
        hint: reason,
      });
    } finally {
      if (orgsUploadPhotoButton) orgsUploadPhotoButton.disabled = false;
    }
  };

  const handleUploadTools = async (file) => {
    if (!file) return;
    if (!selectedOrgName) {
      setUploadStatus("Сначала выберите организацию.", "error");
      return;
    }
    if (!window.XLSX) {
      setUploadStatus("Модуль Excel не загружен. Обновите страницу.", "error");
      return;
    }

    const orgFolder = buildSelectedOrgFolderName();
    if (!orgFolder) {
      setUploadStatus("Не удалось определить папку организации.", "error");
      return;
    }

    setUploadStatus("Читаем Excel файл...");
    if (orgsUploadButton) orgsUploadButton.disabled = true;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = window.XLSX.read(buffer, {
        type: "array",
        cellDates: true,
      });
      const sheetName = workbook.SheetNames.find(
        (name) => String(name ?? "").trim().toLowerCase() === "выгрузка"
      );
      const sheet = sheetName ? workbook.Sheets[sheetName] : null;
      if (!sheet) {
        throw new Error('Лист "Выгрузка" не найден.');
      }

      const { tools, objects, toolGroups } = parseExcelToolsData(sheet);
      if (!tools.length) {
        setUploadStatus("В листе «Выгрузка» нет данных для загрузки.", "error");
        return;
      }

      const existingObjects = await loadObjectsData(orgFolder);
      const mergedObjects = mergeObjects(existingObjects, objects);
      const meta = buildUploadUserMeta({ organizationName: selectedOrgName });
      const basePath = `./${orgFolder}`;
      const settingsPath = `${basePath}/Настройки.json`;
      const settingsData = ensureSettingsData(
        await loadJson(settingsPath).catch(() => ({}))
      );
      const organizationSettings = getEnergyOrganizationSettings(settingsData);
      const existingGroups = Array.isArray(organizationSettings.stcGroups)
        ? organizationSettings.stcGroups
        : [];
      const nextGroups = Array.from(
        new Set(
          [...existingGroups, ...(toolGroups ?? [])]
            .map((group) => sanitizeToolGroupName(group))
            .filter(Boolean)
        )
      );
      const addedGroupsCount = Math.max(
        0,
        nextGroups.length - existingGroups.length
      );
      if (addedGroupsCount > 0) {
        settingsData.organization = {
          ...organizationSettings,
          stcGroups: nextGroups,
        };
      }
      const entries = [
        {
          path: `${basePath}/База с инструментами.json`,
          data: tools,
          ...meta,
        },
        {
          path: `${basePath}/Объекты.json`,
          data: mergedObjects,
          ...meta,
        },
      ];
      if (addedGroupsCount > 0) {
        entries.push({
          path: settingsPath,
          data: settingsData,
          ...meta,
        });
      }
      await saveEntries(entries);

      if (orgsDetailToolsTotalEl) {
        orgsDetailToolsTotalEl.textContent = String(tools.length);
      }
      const groupsNote =
        addedGroupsCount > 0
          ? ` Групп МТЦ добавлено: ${addedGroupsCount}.`
          : "";
      setUploadStatus(
        `Загружено позиций: ${tools.length}. Новых объектов: ${
          mergedObjects.length - existingObjects.length
        }.${groupsNote}`,
        "success"
      );
    } catch (error) {
      console.error(error);
      const fallbackMessage =
        "Не удалось обработать файл. Проверьте лист «Выгрузка» и формат данных.";
      const errorMessage =
        error instanceof Error && error.message ? error.message : "";
      setUploadStatus(errorMessage || fallbackMessage, "error");
    } finally {
      if (orgsUploadButton) orgsUploadButton.disabled = false;
    }
  };

  const renderOrganizationsList = async () => {
    if (!orgsListEl) return;
    orgsListEl.innerHTML = "";
    if (orgsEmptyEl) {
      orgsEmptyEl.textContent =
        "Пока нет организаций. Добавьте первую организацию через кнопку «Добавить организацию».";
    }
    try {
      const { organizations, users } = await loadOrgsAndUsers();
      const counts = buildUserCountsMap(users);
      if (orgsEmptyEl) {
        orgsEmptyEl.classList.toggle("is-hidden", organizations.length > 0);
      }
      if (organizations.length === 0) {
        selectedOrgName = "";
      }
      organizations.forEach((org) => {
        const safeName = getOrgDisplayName(org);
        const count = getOrgUserCount(org, counts);

        const row = document.createElement("div");
        row.className = "orgs-row";
        row.dataset.orgName = safeName;

        const button = document.createElement("button");
        button.className = "orgs-row__button";
        button.type = "button";

        const main = document.createElement("div");
        main.className = "orgs-row__main";

        const title = document.createElement("div");
        title.className = "orgs-row__name";
        title.textContent = safeName;

        const meta = document.createElement("div");
        meta.className = "orgs-row__meta";

        const usersItem = document.createElement("div");
        usersItem.className = "orgs-row__meta-item";
        const usersLabel = document.createElement("span");
        usersLabel.className = "orgs-row__meta-label";
        usersLabel.textContent = `Пользователей ${count}`;
        usersItem.append(usersLabel);

        const toolsItem = document.createElement("div");
        toolsItem.className = "orgs-row__meta-item";
        const toolsLabel = document.createElement("span");
        toolsLabel.className = "orgs-row__meta-label";
        toolsLabel.textContent = "Единиц МТЦ";
        const toolsValue = document.createElement("span");
        toolsValue.className = "orgs-row__meta-value";
        toolsValue.textContent = "—";
        toolsItem.append(toolsLabel, toolsValue);

        meta.append(usersItem, toolsItem);
        main.append(title, meta);

        const chevron = document.createElement("span");
        chevron.className = "orgs-row__chevron";
        chevron.setAttribute("aria-hidden", "true");
        chevron.textContent = "›";

        button.append(main, chevron);
        row.append(button);
        orgsListEl.appendChild(row);

        button.addEventListener("click", () => {
          selectOrganization(safeName);
        });
      });
    } catch (error) {
      console.error(error);
      if (orgsEmptyEl) {
        orgsEmptyEl.classList.remove("is-hidden");
        orgsEmptyEl.textContent =
          "Не удалось загрузить список организаций. Попробуйте позже.";
      }
    }
  };

  const renderUsersOrganizationsList = async () => {
    if (!usersOrgsListEl) return;
    usersOrgsListEl.innerHTML = "";
    if (usersOrgsEmptyEl) {
      usersOrgsEmptyEl.textContent =
        "Пока нет организаций. Добавьте первую организацию через кнопку «Добавить организацию».";
    }
    try {
      const { organizations, users } = await loadOrgsAndUsers();
      const counts = buildUserCountsMap(users);
      if (usersOrgsEmptyEl) {
        usersOrgsEmptyEl.classList.toggle("is-hidden", organizations.length > 0);
      }
      if (organizations.length === 0) {
        selectedUsersOrgName = "";
      }
      organizations.forEach((org) => {
        const safeName = getOrgDisplayName(org);
        const count = getOrgUserCount(org, counts);

        const row = document.createElement("div");
        row.className = "users-orgs__row";
        row.dataset.orgName = safeName;

        const button = document.createElement("button");
        button.className = "users-orgs__button";
        button.type = "button";

        const name = document.createElement("div");
        name.className = "users-orgs__name";
        name.textContent = safeName;

        const countLabel = document.createElement("div");
        countLabel.className = "users-orgs__count";
        countLabel.textContent = formatUserCount(count);

        button.append(name, countLabel);
        row.append(button);
        usersOrgsListEl.appendChild(row);

        button.addEventListener("click", () => {
          selectUsersOrganization(safeName);
        });
      });
    } catch (error) {
      console.error(error);
      if (usersOrgsEmptyEl) {
        usersOrgsEmptyEl.classList.remove("is-hidden");
        usersOrgsEmptyEl.textContent =
          "Не удалось загрузить список организаций. Попробуйте позже.";
      }
    }
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

    sortedUsers.forEach((user) => {
      const card = document.createElement("div");
      card.className = "users-details__card";

      const avatar = createUserDetailsAvatar(user);

      const info = document.createElement("div");
      info.className = "users-details__info";

      const name = document.createElement("div");
      name.className = "users-details__name";
      name.textContent = formatFullName(String(user?.full_name ?? "").trim());

      const meta = document.createElement("div");
      meta.className = "users-details__meta";
      const roleTag = document.createElement("span");
      roleTag.className = "users-details__tag";
      const roleName = String(user?.role ?? "роль").trim();
      roleTag.textContent = roleName;

      const toolsStats = toolsCounts.get(normalizePersonName(user?.full_name ?? "")) ?? { count: 0, amount: 0 };
      const { countTag: toolsCountTag, amountTag: toolsAmountTag } = createUserToolsBadges(toolsStats);

      const telegramStatus = document.createElement("span");
      telegramStatus.className = "users-details__status";
      const hasTelegramId = Boolean(normalizeTelegramId(user?.telegram_id));
      telegramStatus.textContent = hasTelegramId
        ? "ID привязан"
        : "ID не привязан";
      telegramStatus.classList.toggle("is-linked", hasTelegramId);
      meta.append(roleTag, toolsCountTag, toolsAmountTag, telegramStatus);

      const editHint = document.createElement("span");
      editHint.className = "users-details__edit-hint";
      editHint.setAttribute("aria-hidden", "true");
      editHint.textContent = "✎";

      info.append(name, meta);
      card.append(avatar, info, editHint);
      card.classList.add("is-actionable");
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute(
        "aria-label",
        `Редактировать данные пользователя: ${name.textContent}`
      );
      const handleEdit = () => {
        resetUsersInvite();
        openUsersEditModal(user);
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
    } else if (usersModalEl && !usersModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const openUsersEditModal = (editableUser) => {
    if (!usersEditModalEl || !usersEditFormEl || !editableUser) return;
    const userIndex = orgsState.users.indexOf(editableUser);
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
      usersEditOrgNameEl.textContent = String(editableUser?.organization ?? selectedUsersOrgName ?? "—").trim() || "—";
    }
    if (usersEditMessageEl) usersEditMessageEl.textContent = "";
    usersEditModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  };

  const selectUsersOrganization = async (orgName) => {
    if (!orgName) return;
    resetUsersInvite();
    selectedUsersOrgName = orgName;
    if (usersDetailsNameEl) {
      usersDetailsNameEl.textContent = orgName;
    }

    const org = orgsState.organizations.find(
      (item) => getOrgDisplayName(item) === orgName
    );
    const orgNames = org ? getOrgNames(org) : [orgName];
    const orgUsers = orgsState.users.filter((user) => {
      const name = String(user?.organization ?? "").trim();
      return (orgNames.includes(name) || name === orgName) && isVisibleUsersDirectoryUser(user);
    });

    if (usersDetailsCountEl) {
      usersDetailsCountEl.textContent = formatUserCount(orgUsers.length);
    }

    const orgFolder = org
      ? sanitizeOrganizationFolderName(String(org.short_name ?? org.shortName ?? org.full_name ?? org.fullName ?? "").trim())
      : sanitizeOrganizationFolderName(orgName);
    const toolsCounts = await loadOrganizationUserToolsCounts(orgFolder);
    renderUsersDetails(orgUsers, toolsCounts);

    if (usersOrgsListEl) {
      usersOrgsListEl.querySelectorAll(".users-orgs__row").forEach((row) => {
        row.classList.toggle("is-active", row.dataset.orgName === orgName);
      });
    }

    if (usersDetailsModalEl) {
      usersDetailsModalEl.classList.remove("is-hidden");
      document.body.style.overflow = "hidden";
    }
  };

  const updateUsersDetailsView = async () => {
    if (!selectedUsersOrgName) return;
    const org = orgsState.organizations.find(
      (item) => getOrgDisplayName(item) === selectedUsersOrgName
    );
    const orgNames = org ? getOrgNames(org) : [selectedUsersOrgName];
    const orgUsers = orgsState.users.filter((user) => {
      const name = String(user?.organization ?? "").trim();
      return (orgNames.includes(name) || name === selectedUsersOrgName) && isVisibleUsersDirectoryUser(user);
    });

    if (usersDetailsCountEl) {
      usersDetailsCountEl.textContent = formatUserCount(orgUsers.length);
    }

    const orgFolder = org
      ? sanitizeOrganizationFolderName(String(org.short_name ?? org.shortName ?? org.full_name ?? org.fullName ?? "").trim())
      : sanitizeOrganizationFolderName(selectedUsersOrgName);
    const toolsCounts = await loadOrganizationUserToolsCounts(orgFolder);
    renderUsersDetails(orgUsers, toolsCounts);
  };

  const openUsersAddModal = async () => {
    if (!usersAddModalEl || !selectedUsersOrgName) return;
    const usersData = await loadJson(usersFilePath).catch(() => ({ users: [] }));
    orgsState.users = Array.isArray(usersData?.users) ? usersData.users : [];
    updateUsersNameSuggestions(orgsState.users);
    if (usersAddOrgNameEl) {
      usersAddOrgNameEl.textContent = selectedUsersOrgName;
    }
    const selectedOrg = orgsState.organizations.find(
      (item) => getOrgDisplayName(item) === selectedUsersOrgName
    );
    const orgFolder = sanitizeOrganizationFolderName(
      String(selectedOrg?.short_name ?? selectedOrg?.shortName ?? selectedOrg?.full_name ?? selectedOrg?.fullName ?? selectedUsersOrgName).trim()
    );
    const settingsData = await loadJson(`./${orgFolder}/Настройки.json`).catch(() => ({}));
    setMechanicRoleSelectionEnabled(
      usersAddFormEl,
      getEnergyOrganizationSettings(settingsData).dataUsage?.mechanisms === true
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
    } else if (usersModalEl && !usersModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const openUsersModal = async () => {
    if (!usersModalEl) return;
    await renderUsersOrganizationsList();
    usersModalEl.classList.remove("is-hidden");
    if (usersDetailsModalEl) {
      usersDetailsModalEl.classList.add("is-hidden");
    }
    if (usersAddModalEl) {
      usersAddModalEl.classList.add("is-hidden");
    }
    if (usersEditModalEl) {
      usersEditModalEl.classList.add("is-hidden");
    }
    resetUsersInvite();
    document.body.style.overflow = "hidden";
  };

  const closeUsersModal = () => {
    if (!usersModalEl) return;
    usersModalEl.classList.add("is-hidden");
    if (usersDetailsModalEl) {
      usersDetailsModalEl.classList.add("is-hidden");
    }
    if (usersAddModalEl) {
      usersAddModalEl.classList.add("is-hidden");
    }
    resetUsersInvite();
    document.body.style.overflow = "";
  };

  const closeUsersDetailsModal = () => {
    if (!usersDetailsModalEl) return;
    usersDetailsModalEl.classList.add("is-hidden");
    if (usersAddModalEl) {
      usersAddModalEl.classList.add("is-hidden");
    }
    resetUsersInvite();
    if (usersModalEl && !usersModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const openOrgsModal = async () => {
    if (!orgsModalEl) return;
    await renderOrganizationsList();
    orgsModalEl.classList.remove("is-hidden");
    if (orgsDetailsModalEl) {
      orgsDetailsModalEl.classList.add("is-hidden");
    }
    if (orgsGroupsModalEl) {
      orgsGroupsModalEl.classList.add("is-hidden");
    }
    document.body.style.overflow = "hidden";
  };

  const closeOrgsModal = () => {
    if (!orgsModalEl) return;
    orgsModalEl.classList.add("is-hidden");
    if (orgsDetailsModalEl) {
      orgsDetailsModalEl.classList.add("is-hidden");
    }
    resetEnergyInvite();
    document.body.style.overflow = "";
  };

  const closeOrgsDetailsModal = () => {
    if (!orgsDetailsModalEl) return;
    orgsDetailsModalEl.classList.add("is-hidden");
    if (orgsGroupsModalEl && !orgsGroupsModalEl.classList.contains("is-hidden")) {
      orgsGroupsModalEl.classList.add("is-hidden");
    }
    resetEnergyInvite();
    clearUploadStatus();
    clearUploadProgress();
    if (orgsUploadInput) {
      orgsUploadInput.value = "";
    }
    if (orgsModalEl && !orgsModalEl.classList.contains("is-hidden")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const openSuperStatsModal = async () => {
    if (!superStatsModalEl) return;
    const today = toIsoDate(new Date());
    if (superStatsDateFromInput && !superStatsDateFromInput.value) superStatsDateFromInput.value = today;
    if (superStatsDateToInput && !superStatsDateToInput.value) superStatsDateToInput.value = today;
    updateSuperStatsCustomVisibility();
    superStatsModalEl.classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
    await fillSuperStatsOrganizations();
    await refreshSuperStats();
  };

  const closeSuperStatsModal = () => {
    if (!superStatsModalEl) return;
    superStatsModalEl.classList.add("is-hidden");
    if (
      (orgsModalEl && !orgsModalEl.classList.contains("is-hidden")) ||
      (usersModalEl && !usersModalEl.classList.contains("is-hidden")) ||
      (feedbackModalEl && !feedbackModalEl.classList.contains("is-hidden"))
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  const openFeedbackModal = async () => {
    if (!feedbackModalEl) return;
    setFeedbackStatusMessage("");
    if (feedbackSummaryEl) feedbackSummaryEl.textContent = "Загружаем обращения...";
    try {
      await loadFeedbackRequests();
    } catch (error) {
      console.error(error);
      setFeedbackStatusMessage("Не удалось загрузить обращения.", "error");
    }
    feedbackModalEl.classList.remove("is-hidden");
    setActiveFeedbackTab("new");
    document.body.style.overflow = "hidden";
  };

  const closeFeedbackModal = () => {
    if (!feedbackModalEl) return;
    feedbackModalEl.classList.add("is-hidden");
    closeFeedbackDetails();
    if (
      (orgsModalEl && !orgsModalEl.classList.contains("is-hidden")) ||
      (usersModalEl && !usersModalEl.classList.contains("is-hidden"))
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  };

  openSuperStatsButtons.forEach((button) => {
    button.addEventListener("click", openSuperStatsModal);
  });
  superStatsCloseButton?.addEventListener("click", closeSuperStatsModal);
  superStatsBackdropEl?.addEventListener("click", closeSuperStatsModal);
  superStatsOrgSelect?.addEventListener("change", refreshSuperStats);
  superStatsPeriodSelect?.addEventListener("change", () => {
    updateSuperStatsCustomVisibility();
    refreshSuperStats();
  });
  superStatsPeriodButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (superStatsPeriodSelect) superStatsPeriodSelect.value = button.dataset.superStatsPeriodButton || "day";
      updateSuperStatsCustomVisibility();
      refreshSuperStats();
    });
  });
  superStatsMetricSelect?.addEventListener("change", () => {
    syncSuperStatsControls();
    refreshSuperStats();
  });
  superStatsLimitSelect?.addEventListener("change", refreshSuperStats);
  superStatsMetricButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (superStatsMetricSelect) superStatsMetricSelect.value = button.dataset.superStatsMetricButton || "moves";
      syncSuperStatsControls();
      refreshSuperStats();
    });
  });
  superStatsRangeToggle?.addEventListener("click", () => {
    const isHidden = superStatsCalendarEl?.classList.contains("is-hidden");
    superStatsCalendarEl?.classList.toggle("is-hidden", !isHidden);
    superStatsRangeToggle?.setAttribute("aria-expanded", isHidden ? "true" : "false");
    renderSuperStatsCalendar();
  });
  superStatsCalendarPrevButton?.addEventListener("click", () => {
    superStatsCalendarState.view = new Date(superStatsCalendarState.view.getFullYear(), superStatsCalendarState.view.getMonth() - 1, 1);
    renderSuperStatsCalendar();
  });
  superStatsCalendarNextButton?.addEventListener("click", () => {
    superStatsCalendarState.view = new Date(superStatsCalendarState.view.getFullYear(), superStatsCalendarState.view.getMonth() + 1, 1);
    renderSuperStatsCalendar();
  });
  superStatsDateFromInput?.addEventListener("change", () => { updateSuperStatsRangeLabels(); renderSuperStatsCalendar(); refreshSuperStats(); });
  superStatsDateToInput?.addEventListener("change", () => { updateSuperStatsRangeLabels(); renderSuperStatsCalendar(); refreshSuperStats(); });
  openAddOrgButton?.addEventListener("click", showForm);
  backButton?.addEventListener("click", showDashboard);
  openOrgsButtons.forEach((button) => {
    button.addEventListener("click", openOrgsModal);
  });
  openUsersButtons.forEach((button) => {
    button.addEventListener("click", openUsersModal);
  });
  openFeedbackButtons.forEach((button) => {
    button.addEventListener("click", openFeedbackModal);
  });
  feedbackTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveFeedbackTab(button?.dataset?.feedbackTab || "new");
    });
  });
  feedbackActionButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const requestId = feedbackState.activeRequestId;
      if (!requestId) return;
      const action = button?.dataset?.feedbackAction;
      let nextStatus = "new";
      if (action === "reject") nextStatus = "rejected";
      if (action === "in-progress") nextStatus = "in-progress";
      if (action === "close") nextStatus = "closed";
      if (feedbackDetailsStatusEl) {
        feedbackDetailsStatusEl.textContent = "Сохраняем статус...";
      }
      try {
        await saveFeedbackStatus(requestId, nextStatus);
        renderFeedbackDetails(requestId);
        setActiveFeedbackTab(getFeedbackBucket(nextStatus));
        if (feedbackDetailsStatusEl) {
          feedbackDetailsStatusEl.textContent = `Статус изменён: ${feedbackStatusMeta[nextStatus]?.label ?? "обновлено"}.`;
        }
      } catch (error) {
        console.error(error);
        if (feedbackDetailsStatusEl) {
          feedbackDetailsStatusEl.textContent = "Не удалось изменить статус.";
        }
      }
    });
  });
  orgsBackdropEl?.addEventListener("click", closeOrgsModal);
  orgsCloseButton?.addEventListener("click", closeOrgsModal);
  orgsDetailsBackdropEl?.addEventListener("click", closeOrgsDetailsModal);
  orgsDetailsCloseButton?.addEventListener("click", closeOrgsDetailsModal);
  orgsManageGroupsButton?.addEventListener("click", openOrgsGroupsModal);
  orgsGroupsBackdropEl?.addEventListener("click", closeOrgsGroupsModal);
  orgsGroupsCloseButton?.addEventListener("click", closeOrgsGroupsModal);
  orgsGroupsCancelButton?.addEventListener("click", closeOrgsGroupsModal);
  orgsGroupsAddButton?.addEventListener("click", () => {
    const groups = collectGroupsFromForm();
    groups.push({ name: "", telegramId: "" });
    renderGroupsList(groups);
    updateGroupsSaveState();
  });
  orgsGroupsFormEl?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!orgsGroupsContext) return;
    const groups = collectGroupsFromForm();
    const hasInvalid = groups.some(
      (group) => !group.name || !group.telegramId
    );
    if (hasInvalid) {
      setGroupsMessage("Заполните название и ID для каждой рассылки.");
      return;
    }
    setGroupsMessage("Сохраняем настройки групп...");
    try {
      orgsGroupsContext.settingsData.organization = {
        ...(orgsGroupsContext.settingsData.organization ?? {}),
        telegramGroups: groups,
      };
      await saveJson(
        orgsGroupsContext.settingsPath,
        orgsGroupsContext.settingsData,
        { user: currentUser }
      );
      orgsGroupsContext.initialGroupsSignature = buildGroupsSignature(groups);
      updateGroupsSaveState();
      setGroupsMessage("Группы рассылок сохранены.");
    } catch (error) {
      console.error(error);
      setGroupsMessage("Не удалось сохранить группы. Попробуйте позже.");
    }
  });
  orgsUploadButton?.addEventListener("click", () => {
    if (!selectedOrgName) {
      setUploadStatus("Сначала выберите организацию.", "error");
      return;
    }
    if (orgsUploadInput) {
      orgsUploadInput.click();
    }
  });
  orgsUploadPhotoButton?.addEventListener("click", () => {
    if (!currentUser) {
      setUploadStatus("Не удалось определить пользователя.", "error");
      return;
    }
    if (orgsUploadPhotoInput) {
      orgsUploadPhotoInput.click();
    }
  });
  orgsUploadInput?.addEventListener("change", async (event) => {
    const file = event.target?.files?.[0];
    await handleUploadTools(file);
    if (orgsUploadInput) {
      orgsUploadInput.value = "";
    }
  });
  orgsUploadPhotoInput?.addEventListener("change", async (event) => {
    const files = event.target?.files ?? [];
    await handleUploadPhotos(files);
    if (orgsUploadPhotoInput) {
      orgsUploadPhotoInput.value = "";
    }
  });
  usersBackdropEl?.addEventListener("click", closeUsersModal);
  usersCloseButton?.addEventListener("click", closeUsersModal);
  usersDetailsBackdropEl?.addEventListener("click", closeUsersDetailsModal);
  usersDetailsCloseButton?.addEventListener("click", closeUsersDetailsModal);
  usersAddButton?.addEventListener("click", openUsersAddModal);
  usersAddBackdropEl?.addEventListener("click", closeUsersAddModal);
  usersAddCloseButton?.addEventListener("click", closeUsersAddModal);
  usersAddCancelButton?.addEventListener("click", closeUsersAddModal);
  usersEditBackdropEl?.addEventListener("click", closeUsersEditModal);
  usersEditCloseButton?.addEventListener("click", closeUsersEditModal);
  usersEditCancelButton?.addEventListener("click", closeUsersEditModal);
  feedbackBackdropEl?.addEventListener("click", closeFeedbackModal);
  feedbackCloseButton?.addEventListener("click", closeFeedbackModal);
  feedbackDetailsBackdropEl?.addEventListener("click", closeFeedbackDetails);
  feedbackDetailsCloseButton?.addEventListener("click", closeFeedbackDetails);
  feedbackPhotoViewerCloseButton?.addEventListener("click", closeFeedbackPhotoViewer);
  feedbackPhotoViewerEl?.addEventListener("click", (event) => {
    if (event.target === feedbackPhotoViewerEl) {
      closeFeedbackPhotoViewer();
    }
  });
  feedbackPhotoViewerEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeFeedbackPhotoViewer();
    }
  });
  feedbackDetailsModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (feedbackPhotoViewerEl && !feedbackPhotoViewerEl.classList.contains("is-hidden")) {
        closeFeedbackPhotoViewer();
      } else {
        closeFeedbackDetails();
      }
    }
  });
  feedbackModalEl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeFeedbackModal();
    }
  });
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
  if (energyInviteShareButton) energyInviteShareButton.disabled = true;
  if (energyInviteCopyButton) energyInviteCopyButton.disabled = true;
  if (energyInviteOpenButton) energyInviteOpenButton.disabled = true;
  energyInviteShareButton?.addEventListener("click", () => {
    const link = energyInviteLinkEl?.value?.trim();
    if (!link) return;
    const shareText =
      energyInviteBox?.dataset.shareText ??
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
  energyInviteOpenButton?.addEventListener("click", () => {
    const webLink = energyInviteBox?.dataset.telegramLink?.trim();
    const appLink = energyInviteBox?.dataset.telegramAppLink?.trim();
    if (!webLink && !appLink) return;
    if (window.Telegram?.WebApp?.openTelegramLink && webLink) {
      window.Telegram.WebApp.openTelegramLink(webLink);
    } else {
      window.location.href = appLink || webLink;
    }
  });
  energyInviteCopyButton?.addEventListener("click", async () => {
    if (!energyInviteLinkEl?.value) return;
    try {
      await navigator.clipboard.writeText(energyInviteLinkEl.value);
      if (energyInviteNoteEl) {
        energyInviteNoteEl.textContent = "Ссылка скопирована в буфер.";
      }
    } catch (error) {
      energyInviteLinkEl.select();
      document.execCommand("copy");
      if (energyInviteNoteEl) {
        energyInviteNoteEl.textContent = "Ссылка выделена для копирования.";
      }
    }
  });
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
    const sourceUser = Number.isInteger(userIndex) ? orgsState.users[userIndex] : null;
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
      }, { user: currentUser });

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
      const orgData = await loadJson(orgFilePath).catch(() => ({ organizations: [] }));
      const orgFolderName = sanitizeOrganizationFolderName(
        pickOrganizationShortName(
          orgData,
          String(selectedUsersOrgName || removableUser?.organization || "").trim()
        )
      );
      const blockers = await buildUserDeleteBlockers(orgFolderName, fullName);
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
      await saveJson(usersFilePath, { ...usersData, users: nextUsers }, { user: currentUser });
      orgsState.users = nextUsers;
      updateUsersNameSuggestions(nextUsers);
      updateUsersDetailsView();
      await renderUsersOrganizationsList();
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
    const sourceUser = Number.isInteger(userIndex) ? orgsState.users[userIndex] : null;
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
      const orgData = await loadJson(orgFilePath).catch(() => ({ organizations: [] }));
      const orgFolderName = sanitizeOrganizationFolderName(
        pickOrganizationShortName(
          orgData,
          String(selectedUsersOrgName || nextUsers[userIndex]?.organization || "").trim()
        )
      );
      const nameReplacementEntries = await buildOrganizationNameReplacementEntries(
        orgFolderName,
        previousFullName,
        fullName,
        { user: currentUser }
      );
      await saveJsonBatch([
        { path: usersFilePath, data: { ...usersData, users: nextUsers }, user: currentUser },
        ...nameReplacementEntries,
      ]);
      orgsState.users = nextUsers;
      updateUsersNameSuggestions(nextUsers);
      updateUsersDetailsView();
      await renderUsersOrganizationsList();
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

      orgsState.users = nextUsersData.users;
      updateUsersDetailsView();
      await renderUsersOrganizationsList();

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

  resetEnergyInvite();
  resetUsersInvite();
  updateStats();
}

async function renderUserRoleView() {
  if (!currentUser) return;
  const resolvedRoleId = resolveRoleId(currentUser.role);
  const renderRole = resolvedRoleId ? roleMap.get(resolvedRoleId) : null;
  if (!renderRole) return;
  const isEnergyDashboardRole = energyDashboardRoles.has(resolvedRoleId);

  const userName = formatShortName(currentUser.full_name);
  if (!currentUserLabel) {
    currentUserLabel = `Вы вошли как <strong>${userName}</strong>`;
  }

  const isStrictAccessDashboard = strictAccessDashboardRoles.has(resolvedRoleId);
  const renderOptions =
    isEnergyDashboardRole && currentSettingsContext
      ? {
          actions: resolveEnergyDashboardActionsForRole(
            currentSettingsContext.settingsData,
            resolvedRoleId
          ),
          showGroupToggle: !isStrictAccessDashboard,
          showQuickAccess: !isStrictAccessDashboard,
        }
      : {};

  contentEl.innerHTML = renderRole(currentUserLabel, renderOptions);
  if (userNameEl) userNameEl.textContent = userName;
  if (appTitleTextEl) {
    appTitleTextEl.textContent = formatHeaderUserName(currentUser.full_name ?? "");
  }
  if (appTitlePositionEl) {
    appTitlePositionEl.textContent =
      String(currentUser.position ?? "").trim() || "Должность не указана";
  }
  if (userOrgEl) userOrgEl.textContent = currentUser.organization ?? "Организация";
  updateHeaderUserBadge(currentUser.full_name ?? "");
  if (appUserEl) {
    appUserEl.classList.add("is-hidden");
  }
  setUserSettingsMode(false);
  if (settingsBackButtonEl) {
    settingsBackButtonEl.classList.add("is-hidden");
  }
  if (superAdminStatEl) {
    superAdminStatEl.classList.toggle("is-hidden", resolvedRoleId !== superAdminRole);
  }
  if (energyPendingStatEl) {
    energyPendingStatEl.classList.toggle(
      "is-hidden",
      !isEnergyDashboardRole || isStrictAccessDashboard
    );
  }
  if (appTitleMetaEl) {
    appTitleMetaEl.classList.toggle("is-hidden", !isEnergyDashboardRole);
    if (!isEnergyDashboardRole) {
      appTitleMetaEl.textContent = "";
    }
  }
  document.body?.classList.toggle(
    "is-energy-role",
    isEnergyDashboardRole
  );
  if (resolvedRoleId === superAdminRole) {
    setupSuperAdmin();
  }
  if (isEnergyDashboardRole) {
    await setupEnergyDashboard(currentUser, currentPreferences, currentSettingsContext);
  }
}

async function showUserSettings() {
  if (!currentUser) return;
  if (!currentSettingsContext) {
    currentSettingsContext = await resolveUserSettingsContext(currentUser);
  }
  const savedPreferences =
    currentSettingsContext.settingsData.users?.[currentSettingsContext.userKey]
      ?.preferences ?? {};
  const savedPendingAcceptanceMailing = normalizePendingAcceptanceMailing(
    currentSettingsContext.settingsData.users?.[currentSettingsContext.userKey]
      ?.pendingAcceptanceMailing
  );
  currentPreferences = normalizePreferences({
    ...currentPreferences,
    ...savedPreferences,
  });
  applyUserPreferences(currentPreferences);

  const userName = formatShortName(currentUser.full_name);
  if (userNameEl) userNameEl.textContent = userName;
  applyUserSettingsHeader();
  if (userOrgEl) {
    userOrgEl.textContent = await resolveUserOrganizationFullName(currentUser);
  }
  if (appUserEl) {
    appUserEl.classList.add("is-hidden");
  }
  setUserSettingsMode(true);
  if (energyPendingStatEl) {
    energyPendingStatEl.classList.add("is-hidden");
  }
  if (appTitleMetaEl) {
    appTitleMetaEl.classList.add("is-hidden");
    appTitleMetaEl.textContent = "";
  }
  if (settingsBackButtonEl) {
    settingsBackButtonEl.classList.remove("is-hidden");
  }
  contentEl.innerHTML = renderUserSettingsView(
    currentUser,
    currentPreferences,
    savedPendingAcceptanceMailing
  );

  const backButton = contentEl.querySelector("[data-settings-back]");
  const formEl = contentEl.querySelector("[data-settings-form]");
  const messageEl = contentEl.querySelector("[data-settings-message]");
  const photoInputEl = contentEl.querySelector("[data-settings-photo-input]");
  const photoPreviewEl = contentEl.querySelector("[data-settings-photo-preview]");
  const groupingButton = contentEl.querySelector("[data-settings-grouping]");
  const groupingInput = formEl?.querySelector("[name='grouping']");
  let messageTimer = null;

  const updateMessage = (text) => {
    if (!messageEl) return;
    messageEl.textContent = text;
    if (messageTimer) window.clearTimeout(messageTimer);
    messageTimer = window.setTimeout(() => {
      messageEl.textContent = "";
    }, 2000);
  };

  const handleFormChange = async (event) => {
    if (event?.target?.matches?.("[data-settings-photo-input]")) {
      return;
    }
    if (!formEl) return;
    const formData = new FormData(formEl);
    const nextPosition = String(formData.get("user-position") ?? "").trim();
    const nextPreferences = normalizePreferences({
      iconStyle: formData.get("icon-style"),
      grouping: formData.get("grouping"),
      theme: formData.get("theme"),
    });
    const nextPendingAcceptanceMailing = normalizePendingAcceptanceMailing({
      days: formData.getAll("pending-mailing-days"),
      time: formData.get("pending-mailing-time"),
    });
    await saveCurrentUserPosition(nextPosition);
    currentPreferences = applyUserPreferences(nextPreferences);
    const savedSettings = await saveUserPreferences(
      currentSettingsContext,
      currentPreferences,
      nextPendingAcceptanceMailing
    );
    currentPreferences = savedSettings.preferences;
    updateMessage("Сохранено");
  };

  const handlePhotoChange = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    updateMessage("Сохраняем фото...");
    try {
      const savedPath = await saveCurrentUserProfilePhoto(file, currentSettingsContext);
      if (photoPreviewEl) {
        photoPreviewEl.src = `${buildUserPhotoSrc(savedPath)}?v=${Date.now()}`;
      }
      applyUserSettingsHeader();
      updateMessage("Фото обновлено");
    } catch (error) {
      console.warn("Не удалось сохранить фото профиля.", error);
      const reason =
        error instanceof Error && error.message
          ? error.message
          : "Не удалось сохранить фото";
      updateMessage(reason);
    } finally {
      if (photoInputEl) {
        photoInputEl.value = "";
      }
    }
  };

  const handleBack = () => {
    renderUserRoleView();
  };

  const handleGroupingClick = async () => {
    if (groupingInput) {
      groupingInput.value = "free";
    }
    pendingGroupingStart = true;
    await handleFormChange();
    renderUserRoleView();
  };

  if (settingsBackButtonEl) {
    settingsBackButtonEl.onclick = handleBack;
  }
  if (backButton) {
    backButton.onclick = handleBack;
  }
  if (groupingButton) {
    groupingButton.onclick = handleGroupingClick;
  }
  photoInputEl?.addEventListener("change", handlePhotoChange);
  formEl?.addEventListener("change", handleFormChange);
}

function buildAuthorizedLabel(user) {
  const fullName = user.full_name?.trim() || "Пользователь";
  const roleTitle = user.role ?? "роль";
  return `Вы авторизованы в базе как <strong>${fullName}</strong> (${roleTitle}).`;
}

function askUserOrganizationChoice(users) {
  if (!Array.isArray(users) || users.length <= 1) {
    return Promise.resolve(users?.[0] ?? null);
  }

  const optionsMarkup = users
    .map((user, index) => {
      const organization = escapeHtml(user.organization ?? "Организация");
      const role = escapeHtml(user.role ?? "Роль");
      const position = escapeHtml(String(user.position ?? "").trim() || "Должность не указана");
      return `
        <button class="org-choice-card" type="button" data-org-choice-index="${index}">
          <span class="org-choice-title">${organization}</span>
          <span class="org-choice-meta">${role}</span>
          <span class="org-choice-meta">${position}</span>
        </button>
      `;
    })
    .join("");

  contentEl.innerHTML = `
    <section class="role-card role-card--org-choice">
      <div class="role-header">
        <span class="role-pill">Выбор организации</span>
        <h1>Выберите компанию для входа</h1>
      </div>
      <p class="role-description">
        У вас есть доступ к нескольким организациям. Нажмите нужную компанию, чтобы открыть рабочий экран.
      </p>
      <div class="org-choice-grid" data-org-choice-grid>
        ${optionsMarkup}
      </div>
    </section>
  `;

  return new Promise((resolve) => {
    const buttons = contentEl.querySelectorAll("[data-org-choice-index]");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.getAttribute("data-org-choice-index"));
        const selectedUser = Number.isInteger(index) ? users[index] : null;
        resolve(selectedUser ?? null);
      });
    });
  });
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
        item.role === registration.user?.role &&
        String(item.position ?? "").trim() === String(registration.user?.position ?? "").trim()
    );
  }

  if (!resolvedUser) {
    resolvedUser = {
      telegram_id: telegramId,
      full_name: registration.user?.full_name ?? "Пользователь",
      organization: registration.user?.organization ?? "Организация",
      role: registration.user?.role ?? "Энергетик",
      position: String(registration.user?.position ?? "").trim(),
    };
    usersData.users = [...(usersData.users ?? []), resolvedUser];
  } else {
    resolvedUser.telegram_id = telegramId;
    if (Object.prototype.hasOwnProperty.call(registration.user ?? {}, "position")) {
      resolvedUser.position = String(registration.user?.position ?? "").trim();
    }
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
  const initialContext = collectTelegramContext();
  void appendAuthLog("init", initialContext);

  const telegramId = await waitForTelegramId({ timeoutMs: 20000, intervalMs: 250 });

  try {
    const registrationToken = getRegistrationToken();
    let user = null;
    let userLabel = "";
    const telegramIdKey = normalizeTelegramId(telegramId);
    void appendAuthLog("telegram_id_resolved", { telegramId: telegramIdKey });

    if (!telegramIdKey) {
      const data = await loadJson(usersFilePath).catch(() => ({ users: [] }));
      const fallbackName = normalizePersonName(resolveTelegramUserDisplayName());
      const nameMatches = (data.users ?? []).filter(
        (item) => normalizePersonName(item?.full_name ?? "") === fallbackName
      );

      if (nameMatches.length === 1) {
        user = nameMatches[0];
        userLabel = `Вы вошли как <strong>${formatShortName(user?.full_name ?? "")}</strong>`;
        void appendAuthLog("telegram_id_fallback_by_name", {
          fullName: fallbackName,
          resolvedUserId: normalizeTelegramId(user?.telegram_id ?? null),
        });
      } else {
        renderError("Telegram ID не получен. Откройте приложение через кнопку Mini App в боте.");
        if (userNameEl) userNameEl.textContent = "Гость";
        if (appTitleTextEl) appTitleTextEl.textContent = "Гость";
        if (userOrgEl) userOrgEl.textContent = "Откройте приложение из Telegram";
        updateHeaderUserBadge("??", { forceInitials: true });
        void appendAuthLog("telegram_id_missing", {
          ...collectTelegramContext(),
          fallbackName,
          matches: nameMatches.length,
        });
        return;
      }
    }

    if (registrationToken) {
      user = await applyRegistrationToken(telegramId, registrationToken);
      if (user) {
        userLabel = buildAuthorizedLabel(user);
      }
    }

    if (!user) {
      const data = await loadJson(usersFilePath);
      const matchedUsers = (data.users ?? []).filter(
        (item) => normalizeTelegramId(item.telegram_id) === telegramIdKey
      );

      if (matchedUsers.length > 1) {
        user = await askUserOrganizationChoice(matchedUsers);
      } else {
        user = matchedUsers[0] ?? null;
      }

      userLabel = `Вы вошли как <strong>${formatShortName(
        user?.full_name ?? ""
      )}</strong>`;
    }

    if (!user) {
      renderError("Пользователь с таким ID не найден в базе.");
      if (userNameEl) userNameEl.textContent = "Гость";
      if (appTitleTextEl) appTitleTextEl.textContent = "Гость";
      if (userOrgEl) userOrgEl.textContent = "Нет доступа к организации";
      void appendAuthLog("user_not_found", {
        telegramId: telegramIdKey,
        registrationToken: registrationToken ?? null,
      });
      return;
    }

    const resolvedRoleId = resolveRoleId(user.role);
    const renderRole = resolvedRoleId ? roleMap.get(resolvedRoleId) : null;
    if (!renderRole) {
      renderError("Для вашей роли ещё не создана страница.");
      if (userNameEl) userNameEl.textContent = formatShortName(user.full_name);
      if (appTitleTextEl) {
        appTitleTextEl.textContent = formatHeaderUserName(user.full_name ?? "");
      }
      if (userOrgEl) userOrgEl.textContent = user.organization ?? "Организация";
      void appendAuthLog("role_missing", {
        telegramId: telegramIdKey,
        role: user.role ?? null,
      });
      return;
    }

    user.role = resolvedRoleId;
    currentUser = await syncCurrentUserTelegramPhoto(user);
    user = currentUser;
    currentUserLabel = userLabel;
    currentSettingsContext = await resolveUserSettingsContext(user);
    const savedPreferences =
      currentSettingsContext.settingsData.users?.[currentSettingsContext.userKey]
        ?.preferences ?? {};
    currentPreferences = applyUserPreferences({
      ...defaultPreferences,
      ...savedPreferences,
    });

    await renderUserRoleView();
    void startVisitLog();
    void appendAuthLog("role_rendered", {
      telegramId: telegramIdKey,
      role: user.role ?? null,
    });
  } catch (error) {
    renderError("Возникла ошибка при загрузке данных.");
    if (userNameEl) userNameEl.textContent = "Гость";
    if (appTitleTextEl) appTitleTextEl.textContent = "Гость";
    if (userOrgEl) userOrgEl.textContent = "Проверьте соединение";
    updateHeaderUserBadge("??", { forceInitials: true });
    console.error(error);
    void appendAuthLog("load_error", {
      message: error?.message ?? String(error),
    });
  }
}

function updateTelegramTopControlsOffset() {
  const webApp = window.Telegram?.WebApp;
  if (!webApp || !document.body) return;

  const viewportStableHeight = Number(webApp.viewportStableHeight);
  const currentInnerHeight = window.innerHeight;

  if (!Number.isFinite(viewportStableHeight) || !Number.isFinite(currentInnerHeight)) {
    document.body.style.setProperty("--telegram-top-controls-offset", "0px");
    return;
  }

  const chromeOffset = Math.max(
    0,
    Math.round(currentInnerHeight - viewportStableHeight)
  );
  const hasFullscreenFlag = typeof webApp.isFullscreen === "boolean";
  const hasSystemCloseButton = hasFullscreenFlag ? webApp.isFullscreen : chromeOffset > 6;

  let topControlsOffset = 0;
  if (hasSystemCloseButton) {
    const estimatedCloseButtonSize = isIosMobile ? 52 : 46;
    topControlsOffset = Math.max(chromeOffset, estimatedCloseButtonSize);
  }

  topControlsOffset = Math.min(topControlsOffset, 72);

  document.body.style.setProperty("--telegram-top-controls-offset", `${topControlsOffset}px`);
}

if (window.Telegram?.WebApp) {
  Telegram.WebApp.ready();
  Telegram.WebApp.expand();
  Telegram.WebApp.setHeaderColor("#f5f7ff");
  Telegram.WebApp.setBackgroundColor("#f5f7ff");
  document.body?.classList.add("is-telegram");

  updateTelegramTopControlsOffset();
  Telegram.WebApp.onEvent("viewportChanged", updateTelegramTopControlsOffset);
  Telegram.WebApp.onEvent("fullscreenChanged", updateTelegramTopControlsOffset);
  window.addEventListener("resize", updateTelegramTopControlsOffset, { passive: true });
}

userSettingsTriggerEl?.addEventListener("click", () => {
  showUserSettings();
});

loadUser();
