import { MECHANISM_SCHEDULES } from "./mechanism-form-options.js";

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

/** Создаёт выпадающий список режима работы в едином стиле приложения. */
export const mechanismScheduleSelect = (selected = "5/2") => {
  const current = MECHANISM_SCHEDULES.find(({ value }) => value === selected) || MECHANISM_SCHEDULES[0];
  return `<div class="mechanisms-schedule-select" data-mechanism-schedule-select>
    <input type="hidden" name="schedule" value="${escapeHtml(current.value)}">
    <button class="mechanisms-schedule-select__trigger" type="button" aria-haspopup="listbox" aria-expanded="false" data-mechanism-schedule-trigger><span data-mechanism-schedule-label>${escapeHtml(current.label)}</span><span class="mechanisms-schedule-select__chevron" aria-hidden="true"></span></button>
    <div class="mechanisms-schedule-select__menu" role="listbox" aria-label="Режим работы" hidden>${MECHANISM_SCHEDULES.map(({ value, label }) => `<button class="mechanisms-schedule-select__option ${value === current.value ? "is-selected" : ""}" type="button" role="option" aria-selected="${value === current.value}" data-mechanism-schedule-option="${escapeHtml(value)}"><span>${escapeHtml(label)}</span><span class="mechanisms-schedule-select__check" aria-hidden="true">✓</span></button>`).join("")}</div>
  </div>`;
};

/** Унифицированный фирменный список времени вместо системного select. */
export const mechanismTimeSelect = (name, times, selected, label) => `
  <div class="mechanisms-schedule-select mechanisms-time-select" data-mechanism-schedule-select>
    <input type="hidden" name="${name}" value="${escapeHtml(selected)}">
    <button class="mechanisms-schedule-select__trigger" type="button" aria-haspopup="listbox" aria-expanded="false" data-mechanism-schedule-trigger><span data-mechanism-schedule-label>${escapeHtml(selected)}</span><span class="mechanisms-schedule-select__chevron" aria-hidden="true"></span></button>
    <div class="mechanisms-schedule-select__menu" role="listbox" aria-label="${escapeHtml(label)}" hidden>${times.map((value) => `<button class="mechanisms-schedule-select__option ${value === selected ? "is-selected" : ""}" type="button" role="option" aria-selected="${value === selected}" data-mechanism-schedule-option="${value}"><span>${value}</span><span class="mechanisms-schedule-select__check" aria-hidden="true">✓</span></button>`).join("")}</div>
  </div>`;

/** Подключает управление списками через делегирование, включая клавиатуру. */
export const setupMechanismScheduleSelects = (container) => {
  const closeAll = (except = null) => container.querySelectorAll("[data-mechanism-schedule-select]").forEach((select) => {
    if (select === except) return;
    select.classList.remove("is-open");
    select.querySelector("[data-mechanism-schedule-trigger]")?.setAttribute("aria-expanded", "false");
    const menu = select.querySelector('[role="listbox"]');
    if (menu) menu.hidden = true;
  });

  container.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-mechanism-schedule-trigger]");
    const option = event.target.closest("[data-mechanism-schedule-option]");
    if (trigger) {
      const select = trigger.closest("[data-mechanism-schedule-select]");
      const willOpen = !select.classList.contains("is-open");
      closeAll(select);
      select.classList.toggle("is-open", willOpen);
      trigger.setAttribute("aria-expanded", String(willOpen));
      select.querySelector('[role="listbox"]').hidden = !willOpen;
      if (willOpen) select.querySelector(".is-selected")?.focus();
      return;
    }
    if (option) {
      const select = option.closest("[data-mechanism-schedule-select]");
      select.querySelector('input[type="hidden"]').value = option.dataset.mechanismScheduleOption;
      select.querySelector('input[type="hidden"]').dispatchEvent(new Event("change", { bubbles: true }));
      select.querySelector("[data-mechanism-schedule-label]").textContent = option.firstElementChild.textContent;
      select.querySelectorAll("[data-mechanism-schedule-option]").forEach((item) => {
        const isSelected = item === option;
        item.classList.toggle("is-selected", isSelected);
        item.setAttribute("aria-selected", String(isSelected));
      });
      closeAll();
      select.querySelector("[data-mechanism-schedule-trigger]").focus();
      return;
    }
    closeAll();
  });

  container.addEventListener("keydown", (event) => {
    const select = event.target.closest("[data-mechanism-schedule-select]");
    if (!select) return;
    if (event.key === "Escape") {
      closeAll();
      select.querySelector("[data-mechanism-schedule-trigger]").focus();
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const options = [...select.querySelectorAll("[data-mechanism-schedule-option]")];
      if (select.querySelector('[role="listbox"]').hidden) select.querySelector("[data-mechanism-schedule-trigger]").click();
      else options[(options.indexOf(document.activeElement) + (event.key === "ArrowDown" ? 1 : options.length - 1)) % options.length]?.focus();
    }
  });
};
