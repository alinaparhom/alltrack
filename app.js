const cacheBuster =
  window.ALLTRACK_CACHE_BUSTER || new Date().toISOString().replace(/\D/g, "");

const modulePaths = [
  ["super-admin.js", "roleId as superAdminRole, renderRole as renderSuperAdmin"],
  ["responsible.js", "roleId as responsibleRole, renderRole as renderResponsible"],
  ["mechanic.js", "roleId as mechanicRole, renderRole as renderMechanic"],
  ["chief-engineer.js", "roleId as chiefEngineerRole, renderRole as renderChiefEngineer"],
  ["leader.js", "roleId as leaderRole, renderRole as renderLeader"],
  ["accounting.js", "roleId as accountingRole, renderRole as renderAccounting"],
  ["energy.js", "roleId as energyRole, renderRole as renderEnergy, energyActions, mechanismsAction"],
  ["control.js", "roleId as controlRole, renderRole as renderControl"],
  ["mechanisms-management.js", "createMechanismsManagement"],
  ["mechanism-schedule-select.js", "mechanismTimeSelect, setupMechanismScheduleSelects"],
  ["mechanism-form-options.js", "MECHANISM_START_TIMES, MECHANISM_END_TIMES"],
  ["mechanism-booking-controls.js", "mechanismObjectSelect, mechanismDateRange, setupMechanismBookingControls"],
];

const partPaths = [
  "./app-parts/app.part-00.js",
  "./app-parts/app.part-01.js",
  "./app-parts/app.part-02.js",
  "./app-parts/app.part-03.js",
  "./app-parts/app.part-04.js",
];

function buildImportSource() {
  return modulePaths
    .map(([fileName, bindings]) => {
      const url = new URL(`./roles/${fileName}`, import.meta.url);
      url.searchParams.set("v", cacheBuster);
      return `import { ${bindings} } from ${JSON.stringify(url.href)};`;
    })
    .join("\n");
}

async function loadApplicationParts() {
  const parts = await Promise.all(
    partPaths.map(async (path) => {
      const url = new URL(path, import.meta.url);
      url.searchParams.set("v", cacheBuster);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Не удалось загрузить ${path}: HTTP ${response.status}`);
      }
      return response.text();
    })
  );

  const source = `${buildImportSource()}\n${parts.join("\n")}`;
  const sourceUrl = URL.createObjectURL(
    new Blob([source], { type: "text/javascript" })
  );

  try {
    await import(sourceUrl);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

loadApplicationParts().catch((error) => {
  console.error("Не удалось запустить AllTrack.", error);
  const content = document.querySelector("[data-content]");
  if (content) {
    content.innerHTML = '<div class="state">Не удалось загрузить приложение. Обновите страницу.</div>';
  }
});
