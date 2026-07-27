import { prepareMechanismPhoto } from "./mechanism-photo.js";

const scheduleLabels = { "5/2": "5/2", "7/0": "7/0", manual: "Вручную" };
const workStartHours = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);
const workEndHours = [...workStartHours.slice(1), "24:00"];

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
  model: String(item.model || "").trim(),
  cost: numberValue(item.cost),
  hourlyRate: numberValue(item.hourlyRate),
  schedule: ["5/2", "7/0", "manual"].includes(item.schedule) ? item.schedule : "5/2",
  workTime: String(item.workTime || "08:00–17:00").trim(),
  photo: String(item.photo || ""),
});

const workTimeValues = (workTime) => {
  const [from = "08:00", to = "17:00"] = String(workTime).match(/\d{2}:\d{2}/g) || [];
  return {
    from: workStartHours.includes(from) ? from : "08:00",
    to: workEndHours.includes(to) ? to : "17:00",
  };
};

const hourOptions = (hours, selected) => hours.map((hour) => `<option value="${hour}" ${hour === selected ? "selected" : ""}>${hour}</option>`).join("");

/** Не даёт выбрать окончание смены раньше её начала прямо в списке часов. */
const syncWorkTimeRange = (form, changedField) => {
  const from = form?.elements.workTimeFrom;
  const to = form?.elements.workTimeTo;
  if (!from || !to) return;

  if (changedField === from && from.value >= to.value) {
    const nextHour = workEndHours.find((hour) => hour > from.value);
    if (nextHour) to.value = nextHour;
    else from.value = workStartHours.at(-1);
  }
  if (changedField === to && from.value >= to.value) {
    from.value = [...workStartHours].reverse().find((hour) => hour < to.value) || workStartHours[0];
  }
  if (!changedField && from.value >= to.value) {
    from.value = workStartHours[0];
    to.value = workEndHours.at(-1);
  }

  [...from.options].forEach((option) => { option.disabled = option.value >= to.value; });
  [...to.options].forEach((option) => { option.disabled = option.value <= from.value; });
};

const photoControl = (item, key) => `
  <div class="mechanisms-photo" data-mechanism-photo>
    <div class="mechanisms-photo__preview ${item.photo ? "has-photo" : ""}" data-mechanism-photo-preview>${item.photo ? `<img src="${escapeHtml(item.photo)}" alt="Фото ${escapeHtml([item.name, item.model].filter(Boolean).join(" "))}">` : "<span>🚜</span>"}</div>
    <div class="mechanisms-photo__content"><b>Фото техники</b><span>JPG, PNG или WebP до 12 МБ</span><div class="mechanisms-photo__actions"><label class="mechanisms-photo__upload">Выбрать фото<input type="file" accept="image/jpeg,image/png,image/webp" data-mechanism-photo-input data-photo-key="${key}"></label><button class="mechanisms-photo__remove" type="button" data-mechanism-photo-remove ${item.photo ? "" : "hidden"}>Удалить</button></div></div>
  </div>`;

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
            <label class="mechanisms-management__field">Наименование<input name="name" required maxlength="80" autocomplete="off" placeholder="Например, Экскаватор"></label>
            <label class="mechanisms-management__field">Модель<input name="model" required maxlength="80" autocomplete="off" placeholder="Например, CAT 320"></label>
            <label class="mechanisms-management__field">Стоимость, Br<input name="cost" required type="number" min="0" step="0.01" inputmode="decimal" placeholder="0"></label>
            <label class="mechanisms-management__field">Машино-час, Br/ч<input name="hourlyRate" required type="number" min="0" step="0.01" inputmode="decimal" placeholder="0"></label>
            <label class="mechanisms-management__field">Режим работы<span class="mechanisms-select"><select name="schedule"><option value="5/2">5/2 — по будням</option><option value="7/0">7/0 — ежедневно</option><option value="manual">Вручную — свой график</option></select></span></label>
            <fieldset class="mechanisms-management__field mechanisms-management__field--wide mechanisms-work-time"><legend>Время работы</legend><div class="mechanisms-work-time__range"><label>С<span class="mechanisms-select"><select name="workTimeFrom" aria-label="Начало рабочего времени">${hourOptions(workStartHours, "08:00")}</select></span></label><span aria-hidden="true">—</span><label>До<span class="mechanisms-select"><select name="workTimeTo" aria-label="Окончание рабочего времени">${hourOptions(workEndHours, "17:00")}</select></span></label></div></fieldset>
            ${photoControl({}, "new")}
          </div>
        </form>
        <div class="mechanisms-management__list" data-mechanisms-management-list></div>
        <p class="mechanisms-management__status" data-mechanisms-management-status aria-live="polite"></p>
      </div>`;
    renderList();
    container.querySelectorAll("form").forEach((form) => syncWorkTimeRange(form));
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
        <div class="mechanisms-machine__head"><div class="mechanisms-machine__badge">${item.photo ? `<img src="${escapeHtml(item.photo)}" alt="">` : "🚜"}</div><div><b>${escapeHtml([item.name, item.model].filter(Boolean).join(" "))}</b><span>${scheduleLabels[item.schedule]} · ${escapeHtml(item.workTime || "время не указано")}</span></div><button class="mechanisms-machine__delete" type="button" data-mechanism-delete aria-label="Удалить ${escapeHtml(item.name)}">Удалить</button></div>
        <div class="mechanisms-management__fields">
          <label class="mechanisms-management__field">Наименование<input name="name" required maxlength="80" value="${escapeHtml(item.name)}"></label>
          <label class="mechanisms-management__field">Модель<input name="model" required maxlength="80" value="${escapeHtml(item.model)}" placeholder="Например, CAT 320"></label>
          <label class="mechanisms-management__field">Стоимость, Br<input name="cost" required type="number" min="0" step="0.01" inputmode="decimal" value="${item.cost}"></label>
          <label class="mechanisms-management__field">Машино-час, Br/ч<input name="hourlyRate" required type="number" min="0" step="0.01" inputmode="decimal" value="${item.hourlyRate}"></label>
          <label class="mechanisms-management__field">Режим работы<span class="mechanisms-select"><select name="schedule"><option value="5/2" ${item.schedule === "5/2" ? "selected" : ""}>5/2 — по будням</option><option value="7/0" ${item.schedule === "7/0" ? "selected" : ""}>7/0 — ежедневно</option><option value="manual" ${item.schedule === "manual" ? "selected" : ""}>Вручную — свой график</option></select></span></label>
          <fieldset class="mechanisms-management__field mechanisms-management__field--wide mechanisms-work-time"><legend>Время работы</legend><div class="mechanisms-work-time__range"><label>С<span class="mechanisms-select"><select name="workTimeFrom" aria-label="Начало рабочего времени">${hourOptions(workStartHours, workTimeValues(item.workTime).from)}</select></span></label><span aria-hidden="true">—</span><label>До<span class="mechanisms-select"><select name="workTimeTo" aria-label="Окончание рабочего времени">${hourOptions(workEndHours, workTimeValues(item.workTime).to)}</select></span></label></div></fieldset>
          ${photoControl(item, item.id)}
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

  container.addEventListener("change", async (event) => {
    if (event.target.matches('select[name="workTimeFrom"], select[name="workTimeTo"]')) {
      syncWorkTimeRange(event.target.form, event.target);
      return;
    }
    const input = event.target.closest("[data-mechanism-photo-input]");
    if (!input?.files?.[0]) return;
    try {
      const photo = await prepareMechanismPhoto(input.files[0]);
      input.dataset.photoData = photo;
      const preview = input.closest("[data-mechanism-photo]").querySelector("[data-mechanism-photo-preview]");
      preview.classList.add("has-photo");
      preview.innerHTML = `<img src="${photo}" alt="Предпросмотр фото техники">`;
      input.closest("[data-mechanism-photo]").querySelector("[data-mechanism-photo-remove]").hidden = false;
    } catch (error) { status(error.message, true); input.value = ""; }
  });
  container.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-mechanism-delete]");
    const removePhoto = event.target.closest("[data-mechanism-photo-remove]");
    if (removePhoto) {
      const control = removePhoto.closest("[data-mechanism-photo]");
      control.querySelector("[data-mechanism-photo-input]").dataset.photoData = "";
      control.querySelector("[data-mechanism-photo-input]").value = "";
      control.querySelector("[data-mechanism-photo-preview]").classList.remove("has-photo");
      control.querySelector("[data-mechanism-photo-preview]").innerHTML = "<span>🚜</span>";
      removePhoto.hidden = true;
      return;
    }
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
    if (values.workTimeFrom >= values.workTimeTo) { status("Время окончания должно быть позже времени начала.", true); return; }
    item.workTime = `${values.workTimeFrom}–${values.workTimeTo}`;
    const id = form.dataset.mechanismId;
    const photoInput = form.querySelector("[data-mechanism-photo-input]");
    const current = mechanisms.find((mechanism) => mechanism.id === id);
    item.photo = photoInput?.dataset.photoData ?? current?.photo ?? "";
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
