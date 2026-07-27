import { mechanismScheduleSelect } from "./mechanism-schedule-select.js";
import {
  MECHANISM_END_TIMES,
  MECHANISM_START_TIMES,
  mechanismTimeOptions,
} from "./mechanism-form-options.js";

/** Формирует отдельное мобильное окно добавления и редактирования механизма. */
export function mechanismEditorModal({ item, escapeHtml, formatMoney, photoControl, workTimeValues }) {
  const isEditing = Boolean(item?.id);
  const mechanism = item || {};
  const hours = workTimeValues(mechanism.workTime);
  return `
    <div class="mechanisms-editor" data-mechanisms-editor role="presentation">
      <form class="mechanisms-editor__panel" data-mechanism-id="${escapeHtml(mechanism.id || "")}" role="dialog" aria-modal="true" aria-labelledby="mechanisms-editor-title">
        <div class="mechanisms-editor__head">
          <div><span>${isEditing ? "Карточка техники" : "Новая единица"}</span><h4 id="mechanisms-editor-title">${isEditing ? "Редактировать механизм" : "Добавить механизм"}</h4></div>
          <button class="mechanisms-editor__close" type="button" data-mechanisms-editor-close aria-label="Закрыть">×</button>
        </div>
        <div class="mechanisms-management__fields">
          <label class="mechanisms-management__field">Наименование<input name="name" required maxlength="80" autocomplete="off" value="${escapeHtml(mechanism.name || "")}" placeholder="Например, Экскаватор"></label>
          <label class="mechanisms-management__field">Производитель<input name="manufacturer" required maxlength="80" autocomplete="organization" value="${escapeHtml(mechanism.manufacturer || "")}" placeholder="Например, Caterpillar"></label>
          <label class="mechanisms-management__field">Модель<input name="model" required maxlength="80" autocomplete="off" value="${escapeHtml(mechanism.model || "")}" placeholder="Например, CAT 320"></label>
          <label class="mechanisms-management__field">Стоимость, Br<input name="cost" required type="text" inputmode="decimal" autocomplete="off" value="${formatMoney(mechanism.cost)}" placeholder="0" data-mechanism-money></label>
          <label class="mechanisms-management__field">Машино-час, Br/ч<input name="hourlyRate" required type="text" inputmode="decimal" autocomplete="off" value="${formatMoney(mechanism.hourlyRate)}" placeholder="0" data-mechanism-money></label>
          <label class="mechanisms-management__field">Режим работы${mechanismScheduleSelect(mechanism.schedule)}</label>
          <fieldset class="mechanisms-management__field mechanisms-management__field--wide mechanisms-work-time"><legend>Время работы</legend><div class="mechanisms-work-time__range"><label>С<span class="mechanisms-select"><select name="workTimeFrom" aria-label="Начало рабочего времени">${mechanismTimeOptions(MECHANISM_START_TIMES, hours.from)}</select></span></label><span aria-hidden="true">—</span><label>До<span class="mechanisms-select"><select name="workTimeTo" aria-label="Окончание рабочего времени">${mechanismTimeOptions(MECHANISM_END_TIMES, hours.to)}</select></span></label></div></fieldset>
          ${photoControl(mechanism, mechanism.id || "new")}
        </div>
        <div class="mechanisms-editor__actions">
          ${isEditing ? '<button class="mechanisms-editor__delete" type="button" data-mechanism-delete>Удалить механизм</button>' : ""}
          <button class="mechanisms-primary" type="submit">${isEditing ? "Сохранить" : "Добавить"}</button>
        </div>
      </form>
    </div>`;
}
