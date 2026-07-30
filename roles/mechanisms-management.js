import { prepareMechanismPhoto } from "./mechanism-photo.js";
import { formatMechanismMoney, formatMechanismMoneyInput } from "./mechanism-money-input.js";
import { mechanismScheduleSelect, mechanismTimeSelect, setupMechanismScheduleSelects } from "./mechanism-schedule-select.js";
import {
  MECHANISM_END_TIMES,
  MECHANISM_SCHEDULES,
  MECHANISM_START_TIMES,
} from "./mechanism-form-options.js";

const scheduleLabels = Object.fromEntries(MECHANISM_SCHEDULES.map(({ value, shortLabel }) => [value, shortLabel]));
const scheduleValues = MECHANISM_SCHEDULES.map(({ value }) => value);

const POPULAR_MECHANISMS = {
  name: ["Экскаватор", "Автокран", "Погрузчик", "Самосвал", "Бульдозер"],
  manufacturer: ["Caterpillar", "JCB", "Komatsu", "МАЗ", "МТЗ"],
  model: ["CAT 320", "JCB 3CX", "Komatsu PC200", "МАЗ 6516", "МТЗ-82"],
};

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

  const setTime = (input, value) => {
    input.value = value;
    const select = input.closest("[data-mechanism-schedule-select]");
    const label = select?.querySelector("[data-mechanism-schedule-label]");
    if (label) label.textContent = value;
    select?.querySelectorAll("[data-mechanism-schedule-option]").forEach((option) => {
      const selected = option.dataset.mechanismScheduleOption === value;
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-selected", String(selected));
    });
  };

  if (changedField === from && from.value >= to.value) {
    const nextHour = MECHANISM_END_TIMES.find((hour) => hour > from.value);
    if (nextHour) setTime(to, nextHour);
    else setTime(from, MECHANISM_START_TIMES.at(-1));
  }
  if (changedField === to && from.value >= to.value) {
    setTime(from, [...MECHANISM_START_TIMES].reverse().find((hour) => hour < to.value) || MECHANISM_START_TIMES[0]);
  }
  if (!changedField && from.value >= to.value) {
    setTime(from, MECHANISM_START_TIMES[0]);
    setTime(to, MECHANISM_END_TIMES.at(-1));
  }

  form.querySelectorAll("[data-mechanism-schedule-option]").forEach((option) => {
    const owner = option.closest("[data-mechanism-schedule-select]")?.querySelector('input[type="hidden"]');
    if (owner === from) option.disabled = option.dataset.mechanismScheduleOption >= to.value;
    if (owner === to) option.disabled = option.dataset.mechanismScheduleOption <= from.value;
  });
};

/** Подключает подсказки из базы, отсортированные по частоте, с популярными вариантами по умолчанию. */
const setupSuggestions = (form, mechanisms) => {
  const closeAll = (except) => form.querySelectorAll("[data-mechanism-suggest]").forEach((box) => { if (box !== except) box.hidden = true; });
  form.querySelectorAll("[data-mechanism-suggest-field]").forEach((input) => {
    const field = input.dataset.mechanismSuggestField;
    const box = input.parentElement.querySelector("[data-mechanism-suggest]");
    const counts = new Map();
    mechanisms.forEach((item) => {
      const value = String(item?.[field] || "").trim();
      if (value) counts.set(value, (counts.get(value) || 0) + 1);
    });
    const saved = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru")).map(([value]) => value);
    const values = [...new Set([...saved, ...POPULAR_MECHANISMS[field]])];
    const show = () => {
      const query = input.value.trim().toLocaleLowerCase("ru");
      const matches = values.filter((value) => !query || value.toLocaleLowerCase("ru").includes(query)).slice(0, 6);
      box.innerHTML = matches.map((value) => `<button type="button" data-mechanism-suggestion="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("");
      box.hidden = !matches.length;
      closeAll(box);
    };
    input.addEventListener("focus", show);
    input.addEventListener("input", show);
    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" && !box.hidden) { event.preventDefault(); box.firstElementChild?.focus(); }
      if (event.key === "Escape") box.hidden = true;
    });
    box.addEventListener("click", (event) => {
      const option = event.target.closest("[data-mechanism-suggestion]");
      if (!option) return;
      input.value = option.dataset.mechanismSuggestion;
      box.hidden = true;
      input.focus();
    });
    box.addEventListener("keydown", (event) => {
      if (!event.target.matches("button")) return;
      if (event.key === "ArrowDown") { event.preventDefault(); (event.target.nextElementSibling || box.firstElementChild)?.focus(); }
      if (event.key === "ArrowUp") { event.preventDefault(); (event.target.previousElementSibling || box.lastElementChild)?.focus(); }
      if (event.key === "Escape") { box.hidden = true; input.focus(); }
    });
  });
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
  let editor = null;
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
        <button class="mechanisms-primary mechanisms-management__open-add" type="button" data-mechanism-add>Добавить механизм</button>
        <div class="mechanisms-editor" data-mechanism-editor ${editor ? "" : "hidden"}>
          <button class="mechanisms-editor__backdrop" type="button" data-mechanism-editor-close aria-label="Закрыть окно"></button>
          ${editor ? mechanismForm(editor === "new" ? {} : mechanisms.find(({ id }) => id === editor)) : ""}
        </div>
      </div>`;
    renderList();
    container.querySelectorAll("form").forEach((form) => {
      syncWorkTimeRange(form);
      setupSuggestions(form, mechanisms);
    });
  };

  const mechanismForm = (item = {}) => {
    const isNew = !item.id;
    const time = workTimeValues(item.workTime);
    return `<form class="mechanisms-management__form mechanisms-editor__dialog" data-mechanism-form ${item.id ? `data-mechanism-id="${escapeHtml(item.id)}"` : ""} role="dialog" aria-modal="true" aria-label="${isNew ? "Добавление механизма" : "Редактирование механизма"}">
          <div class="mechanisms-management__form-head"><div><h4>${isNew ? "Новый механизм" : "Редактирование"}</h4><span>${isNew ? "Заполните данные новой единицы техники." : escapeHtml([item.name, item.manufacturer, item.model].filter(Boolean).join(" "))}</span></div><button class="mechanisms-editor__close" type="button" data-mechanism-editor-close aria-label="Закрыть">✕</button></div>
          <div class="mechanisms-management__fields">
            <label class="mechanisms-management__field mechanisms-suggest-field">Наименование<input name="name" required maxlength="80" autocomplete="off" value="${escapeHtml(item.name)}" placeholder="Например, Экскаватор" data-mechanism-suggest-field="name"><span class="mechanisms-suggestions" data-mechanism-suggest hidden></span></label>
            <label class="mechanisms-management__field mechanisms-suggest-field">Производитель<input name="manufacturer" required maxlength="80" autocomplete="off" value="${escapeHtml(item.manufacturer)}" placeholder="Например, Caterpillar" data-mechanism-suggest-field="manufacturer"><span class="mechanisms-suggestions" data-mechanism-suggest hidden></span></label>
            <label class="mechanisms-management__field mechanisms-suggest-field">Модель<input name="model" required maxlength="80" autocomplete="off" value="${escapeHtml(item.model)}" placeholder="Например, CAT 320" data-mechanism-suggest-field="model"><span class="mechanisms-suggestions" data-mechanism-suggest hidden></span></label>
            <label class="mechanisms-management__field">Стоимость, Br<input name="cost" required type="text" inputmode="decimal" autocomplete="off" value="${isNew ? "" : formatMechanismMoney(item.cost)}" placeholder="0" data-mechanism-money></label>
            <label class="mechanisms-management__field">Машино-час, Br/ч<input name="hourlyRate" required type="text" inputmode="decimal" autocomplete="off" value="${isNew ? "" : formatMechanismMoney(item.hourlyRate)}" placeholder="0" data-mechanism-money></label>
            <label class="mechanisms-management__field">Режим работы${mechanismScheduleSelect(item.schedule)}</label>
            <fieldset class="mechanisms-management__field mechanisms-management__field--wide mechanisms-work-time"><legend>Время работы</legend><div class="mechanisms-work-time__range"><label>С${mechanismTimeSelect("workTimeFrom", MECHANISM_START_TIMES, time.from, "Начало рабочего времени")}</label><span aria-hidden="true">—</span><label>До${mechanismTimeSelect("workTimeTo", MECHANISM_END_TIMES, time.to, "Окончание рабочего времени")}</label></div></fieldset>
            ${photoControl(item, item.id || "new")}
            <div class="mechanisms-management__add-action">${isNew ? "" : '<button class="mechanisms-danger" type="button" data-mechanism-delete>Удалить механизм</button>'}<button class="mechanisms-primary" type="submit">${isNew ? "Добавить" : "Сохранить"}</button></div>
          </div>
        </form>`;
  };

  const renderList = () => {
    const list = container.querySelector("[data-mechanisms-management-list]");
    if (!list) return;
    if (!mechanisms.length) {
      list.innerHTML = `<div class="mechanisms-management__empty"><span>🚜</span><b>Техника ещё не добавлена</b><p>Нажмите кнопку ниже, чтобы добавить первый механизм.</p></div>`;
      return;
    }
    list.innerHTML = mechanisms.map((item) => `
      <article class="mechanisms-machine" data-mechanism-id="${escapeHtml(item.id)}">
        <div class="mechanisms-machine__head"><div class="mechanisms-machine__badge">${item.photo ? `<img src="${escapeHtml(item.photo)}" alt="">` : "🚜"}</div><div><b>${escapeHtml([item.name, item.manufacturer, item.model].filter(Boolean).join(" "))}</b><span>${scheduleLabels[item.schedule]} · ${escapeHtml(item.workTime || "время не указано")}</span><span>${formatMechanismMoney(item.cost)} Br · ${formatMechanismMoney(item.hourlyRate)} Br/ч</span></div><button class="mechanisms-machine__edit" type="button" data-mechanism-edit aria-label="Редактировать ${escapeHtml(item.name)}"><span aria-hidden="true">✎</span></button></div>
      </article>`).join("");
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
    if (event.target.matches('input[name="workTimeFrom"], input[name="workTimeTo"]')) {
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
    if (event.target.closest("[data-mechanism-add]")) {
      editor = "new";
      render();
      container.querySelector("[data-mechanism-form] input")?.focus();
      return;
    }
    const editButton = event.target.closest("[data-mechanism-edit]");
    if (editButton) {
      editor = editButton.closest("[data-mechanism-id]")?.dataset.mechanismId;
      render();
      container.querySelector("[data-mechanism-form] input")?.focus();
      return;
    }
    if (event.target.closest("[data-mechanism-editor-close]")) {
      editor = null;
      render();
      return;
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
    editor = null;
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
      editor = null; render(); await save("Изменения сохранены.");
    } else {
      mechanisms.push(item);
      editor = null; render(); await save("Техника добавлена в список.");
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
