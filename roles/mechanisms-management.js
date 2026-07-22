const scheduleLabels = { "5/2": "5/2", "7/0": "7/0", manual: "Вручную" };

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const numberValue = (value) => {
  const normalized = String(value ?? "").replace(",", ".").replace(/\s/g, "");
  const result = Number(normalized);
  return Number.isFinite(result) && result >= 0 ? result : 0;
};

const normalizeMechanism = (item = {}) => ({
  id: String(item.id || crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`),
  name: String(item.name || "").trim(),
  cost: numberValue(item.cost),
  hourlyRate: numberValue(item.hourlyRate),
  schedule: ["5/2", "7/0", "manual"].includes(item.schedule) ? item.schedule : "5/2",
  workTime: String(item.workTime || "08:00–17:00").trim(),
});

/** Рендерит самостоятельный мобильный интерфейс управления парком механизмов. */
export function createMechanismsManagement({ container, path, loadJson, saveJson, user }) {
  let mechanisms = [];
  let isSaving = false;
  const status = (message, isError = false) => {
    const target = container.querySelector("[data-mechanisms-management-status]");
    if (target) {
      target.textContent = message;
      target.classList.toggle("is-error", isError);
    }
  };

  const render = () => {
    container.innerHTML = `
      <div class="mechanisms-management">
        <section class="mechanisms-management__intro">
          <div><p class="mechanisms-management__eyebrow">Парк техники</p><h3>Управление техникой</h3><p>Добавляйте машины, указывайте их стоимость, ставку за машино-час и рабочий режим.</p></div>
          <div class="mechanisms-management__count"><b>${mechanisms.length}</b><span>ед. техники</span></div>
        </section>
        <form class="mechanisms-management__form" data-mechanisms-add-form>
          <div class="mechanisms-management__form-head"><div><h4>Новая техника</h4><span>Все поля сохраняются для вашей организации.</span></div><button class="mechanisms-primary" type="submit">Добавить технику</button></div>
          <div class="mechanisms-management__fields">
            <label class="mechanisms-management__field mechanisms-management__field--wide">Название техники<input name="name" required maxlength="120" autocomplete="off" placeholder="Например, Экскаватор CAT 320"></label>
            <label class="mechanisms-management__field">Стоимость, ₽<input name="cost" required type="number" min="0" step="0.01" inputmode="decimal" placeholder="0"></label>
            <label class="mechanisms-management__field">Машино-час, ₽/ч<input name="hourlyRate" required type="number" min="0" step="0.01" inputmode="decimal" placeholder="0"></label>
            <label class="mechanisms-management__field">Режим работы<select name="schedule"><option value="5/2">5/2</option><option value="7/0">7/0</option><option value="manual">Вручную</option></select></label>
            <label class="mechanisms-management__field" data-work-time-field hidden>Время работы<input name="workTime" maxlength="60" placeholder="Например, Пн–Сб, 08:00–20:00"></label>
          </div>
        </form>
        <div class="mechanisms-management__list" data-mechanisms-management-list></div>
        <p class="mechanisms-management__status" data-mechanisms-management-status aria-live="polite"></p>
      </div>`;
    renderList();
  };

  const renderList = () => {
    const list = container.querySelector("[data-mechanisms-management-list]");
    if (!list) return;
    if (!mechanisms.length) {
      list.innerHTML = `<div class="mechanisms-management__empty"><span>🚜</span><b>Техника ещё не добавлена</b><p>Заполните форму выше, чтобы создать первую карточку техники.</p></div>`;
      return;
    }
    list.innerHTML = mechanisms.map((item) => `
      <form class="mechanisms-machine" data-mechanism-id="${escapeHtml(item.id)}">
        <div class="mechanisms-machine__head"><div class="mechanisms-machine__badge">🚜</div><div><b>${escapeHtml(item.name)}</b><span>${scheduleLabels[item.schedule]} · ${escapeHtml(item.workTime || "время не указано")}</span></div><button class="mechanisms-machine__delete" type="button" data-mechanism-delete aria-label="Удалить ${escapeHtml(item.name)}">Удалить</button></div>
        <div class="mechanisms-management__fields">
          <label class="mechanisms-management__field mechanisms-management__field--wide">Название<input name="name" required maxlength="120" value="${escapeHtml(item.name)}"></label>
          <label class="mechanisms-management__field">Стоимость, ₽<input name="cost" required type="number" min="0" step="0.01" inputmode="decimal" value="${item.cost}"></label>
          <label class="mechanisms-management__field">Машино-час, ₽/ч<input name="hourlyRate" required type="number" min="0" step="0.01" inputmode="decimal" value="${item.hourlyRate}"></label>
          <label class="mechanisms-management__field">Режим<select name="schedule"><option value="5/2" ${item.schedule === "5/2" ? "selected" : ""}>5/2</option><option value="7/0" ${item.schedule === "7/0" ? "selected" : ""}>7/0</option><option value="manual" ${item.schedule === "manual" ? "selected" : ""}>Вручную</option></select></label>
          <label class="mechanisms-management__field" data-work-time-field ${item.schedule === "manual" ? "" : "hidden"}>Время работы<input name="workTime" maxlength="60" value="${escapeHtml(item.workTime)}" placeholder="Пн–Сб, 08:00–20:00"></label>
        </div>
        <div class="mechanisms-machine__actions"><button class="mechanisms-secondary" type="submit">Сохранить изменения</button></div>
      </form>`).join("");
  };

  const save = async (message) => {
    if (isSaving) return;
    isSaving = true;
    status("Сохраняем…");
    try {
      await saveJson(path, { mechanisms, updatedAt: new Date().toISOString() }, { user });
      status(message);
    } catch (error) {
      console.error("Не удалось сохранить технику.", error);
      status("Не удалось сохранить изменения. Повторите попытку.", true);
    } finally { isSaving = false; }
  };

  const syncWorkTime = (form) => {
    const field = form.querySelector("[data-work-time-field]");
    if (field) field.hidden = form.elements.schedule.value !== "manual";
  };

  container.addEventListener("change", (event) => {
    if (event.target.matches('select[name="schedule"]')) syncWorkTime(event.target.form);
  });
  container.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-mechanism-delete]");
    if (!button || isSaving) return;
    const form = button.closest("[data-mechanism-id]");
    const item = mechanisms.find(({ id }) => id === form?.dataset.mechanismId);
    if (!item || !window.confirm(`Удалить «${item.name}» из списка техники?`)) return;
    mechanisms = mechanisms.filter(({ id }) => id !== item.id);
    render();
    await save("Техника удалена из списка.");
  });
  container.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!form.matches("form") || isSaving) return;
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form));
    const item = normalizeMechanism(values);
    if (item.schedule !== "manual") item.workTime = item.schedule === "5/2" ? "Пн–Пт, 08:00–17:00" : "Ежедневно, 08:00–17:00";
    const id = form.dataset.mechanismId;
    if (id) {
      mechanisms = mechanisms.map((current) => current.id === id ? { ...item, id } : current);
      render(); await save("Изменения сохранены.");
    } else {
      mechanisms.push(item);
      render(); await save("Техника добавлена в список.");
    }
  });

  const initialize = async () => {
    render();
    try {
      const saved = await loadJson(path);
      mechanisms = Array.isArray(saved?.mechanisms) ? saved.mechanisms.map(normalizeMechanism).filter(({ name }) => name) : [];
      render();
    } catch (error) {
      // Файл создаётся при первом сохранении; пустой парк — штатное состояние.
      console.info("Список техники пока не создан.");
    }
  };
  return { initialize };
}
