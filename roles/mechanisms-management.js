import { prepareMechanismPhoto } from "./mechanism-photo.js";
import { formatMechanismMoney, formatMechanismMoneyInput } from "./mechanism-money-input.js";
import { setupMechanismScheduleSelects } from "./mechanism-schedule-select.js";
import { mechanismEditorModal } from "./mechanism-editor-modal.js";
import {
  MECHANISM_END_TIMES,
  MECHANISM_SCHEDULES,
  MECHANISM_START_TIMES,
} from "./mechanism-form-options.js";

const scheduleLabels = Object.fromEntries(MECHANISM_SCHEDULES.map(({ value, shortLabel }) => [value, shortLabel]));
const scheduleValues = MECHANISM_SCHEDULES.map(({ value }) => value);

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
  manufacturer: String(item.manufacturer || "").trim(),
  model: String(item.model || "").trim(),
  cost: numberValue(item.cost),
  hourlyRate: numberValue(item.hourlyRate),
  schedule: scheduleValues.includes(item.schedule) ? item.schedule : "5/2",
  workTime: String(item.workTime || "08:00–17:00").trim(),
  photo: String(item.photo || ""),
});

const workTimeValues = (workTime) => {
  const [from = "08:00", to = "17:00"] = String(workTime).match(/\d{2}:\d{2}/g) || [];
  return {
    from: MECHANISM_START_TIMES.includes(from) ? from : "08:00",
    to: MECHANISM_END_TIMES.includes(to) ? to : "17:00",
  };
};

/** Не даёт выбрать окончание смены раньше её начала прямо в списке часов. */
const syncWorkTimeRange = (form, changedField) => {
  const from = form?.elements.workTimeFrom;
  const to = form?.elements.workTimeTo;
  if (!from || !to) return;

  if (changedField === from && from.value >= to.value) {
    const nextHour = MECHANISM_END_TIMES.find((hour) => hour > from.value);
    if (nextHour) to.value = nextHour;
    else from.value = MECHANISM_START_TIMES.at(-1);
  }
  if (changedField === to && from.value >= to.value) {
    from.value = [...MECHANISM_START_TIMES].reverse().find((hour) => hour < to.value) || MECHANISM_START_TIMES[0];
  }
  if (!changedField && from.value >= to.value) {
    from.value = MECHANISM_START_TIMES[0];
    to.value = MECHANISM_END_TIMES.at(-1);
  }

  [...from.options].forEach((option) => { option.disabled = option.value >= to.value; });
  [...to.options].forEach((option) => { option.disabled = option.value <= from.value; });
};

const photoControl = (item, key) => `
  <div class="mechanisms-photo" data-mechanism-photo>
    <div class="mechanisms-photo__preview ${item.photo ? "has-photo" : ""}" data-mechanism-photo-preview>${item.photo ? `<img src="${escapeHtml(item.photo)}" alt="Фото ${escapeHtml([item.name, item.model].filter(Boolean).join(" "))}">` : "<span>🚜</span>"}</div>
    <div class="mechanisms-photo__content"><b>Фото техники</b><span>JPG, PNG или WebP до 12 МБ</span><div class="mechanisms-photo__actions"><label class="mechanisms-photo__upload">Сделать фото<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Сделать фото техники" data-mechanism-photo-input data-photo-key="${key}"></label><label class="mechanisms-photo__upload">Выбрать из галереи<input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Выбрать фото техники из галереи" data-mechanism-photo-input data-photo-key="${key}"></label><button class="mechanisms-photo__remove" type="button" data-mechanism-photo-remove ${item.photo ? "" : "hidden"}>Удалить</button></div></div>
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
        <div class="mechanisms-management__list" data-mechanisms-management-list></div>
        <p class="mechanisms-management__status" data-mechanisms-management-status aria-live="polite"></p>
        <button class="mechanisms-management__open-add mechanisms-primary" type="button" data-mechanisms-editor-open><span aria-hidden="true">＋</span>Добавить механизм</button>
        <div data-mechanisms-editor-host></div>
      </div>`;
    renderList();
    container.querySelectorAll("form").forEach((form) => syncWorkTimeRange(form));
  };

  const renderList = () => {
    const list = container.querySelector("[data-mechanisms-management-list]");
    if (!list) return;
    if (!mechanisms.length) {
      list.innerHTML = `<div class="mechanisms-management__empty"><span>🚜</span><b>Техника ещё не добавлена</b><p>Нажмите кнопку внизу, чтобы создать первую карточку.</p></div>`;
      return;
    }
    list.innerHTML = mechanisms.map((item) => `
      <article class="mechanisms-machine" data-mechanism-id="${escapeHtml(item.id)}">
        <div class="mechanisms-machine__head"><div class="mechanisms-machine__badge">${item.photo ? `<img src="${escapeHtml(item.photo)}" alt="">` : "🚜"}</div><div><b>${escapeHtml([item.name, item.manufacturer, item.model].filter(Boolean).join(" "))}</b><span>${scheduleLabels[item.schedule]} · ${escapeHtml(item.workTime || "время не указано")}</span><small>${formatMechanismMoney(item.hourlyRate)} Br/ч</small></div><button class="mechanisms-machine__edit" type="button" data-mechanism-edit aria-label="Редактировать ${escapeHtml(item.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.5-.8 4.3 4.3-.8L19 8.5 15.5 5 4 16.5Zm13-13 3.5 3.5 1-1a2.5 2.5 0 0 0-3.5-3.5l-1 1Z"/></svg></button></div>
      </article>`).join("");
  };

  const openEditor = (item = {}) => {
    const host = container.querySelector("[data-mechanisms-editor-host]");
    host.innerHTML = mechanismEditorModal({ item, escapeHtml, formatMoney: formatMechanismMoney, photoControl, workTimeValues });
    const form = host.querySelector("form");
    syncWorkTimeRange(form);
    form.elements.name?.focus();
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
    const control = input.closest("[data-mechanism-photo]");
    control.classList.add("is-loading");
    status("Подготавливаем фотографию…");
    try {
      const photo = await prepareMechanismPhoto(input.files[0]);
      control.dataset.photoData = photo;
      const preview = control.querySelector("[data-mechanism-photo-preview]");
      preview.classList.add("has-photo");
      preview.innerHTML = `<img src="${photo}" alt="Предпросмотр фото техники">`;
      control.querySelector("[data-mechanism-photo-remove]").hidden = false;
      status("Фото готово. Добавьте технику или сохраните изменения.");
    } catch (error) {
      status(error.message, true);
      input.value = "";
    } finally {
      control.classList.remove("is-loading");
    }
  });
  container.addEventListener("input", (event) => {
    if (event.target.matches("[data-mechanism-money]")) formatMechanismMoneyInput(event.target);
  });
  container.addEventListener("click", async (event) => {
    if (event.target.closest("[data-mechanisms-editor-open]")) { openEditor(); return; }
    if (event.target.closest("[data-mechanism-edit]")) {
      const card = event.target.closest("[data-mechanism-id]");
      openEditor(mechanisms.find(({ id }) => id === card?.dataset.mechanismId)); return;
    }
    if (event.target.closest("[data-mechanisms-editor-close]") || event.target.matches("[data-mechanisms-editor]")) {
      container.querySelector("[data-mechanisms-editor-host]").innerHTML = ""; return;
    }
    const button = event.target.closest("[data-mechanism-delete]");
    const removePhoto = event.target.closest("[data-mechanism-photo-remove]");
    if (removePhoto) {
      const control = removePhoto.closest("[data-mechanism-photo]");
      control.dataset.photoData = "";
      control.querySelectorAll("[data-mechanism-photo-input]").forEach((input) => { input.value = ""; });
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
    const photoControl = form.querySelector("[data-mechanism-photo]");
    const current = mechanisms.find((mechanism) => mechanism.id === id);
    item.photo = photoControl?.dataset.photoData ?? current?.photo ?? "";
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
  setupMechanismScheduleSelects(container);
  return { initialize };
}
