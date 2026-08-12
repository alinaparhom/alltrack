const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

/** Приводит поддерживаемые форматы «Объекты.json» к списку названий. */
export const normalizeMechanismBookingObjects = (data) => {
  const items = Array.isArray(data)
    ? data
    : [data?.objects, data?.items, data?.data].find(Array.isArray) || [];
  return [...new Set(items.map((item) => String(
    typeof item === "string"
      ? item
      : item?.name ?? item?.title ?? item?.["Название"] ?? item?.["Объект"] ?? ""
  ).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru", { numeric: true }));
};

const renderObjects = (objects = []) => objects.length
  ? objects.map((name) => `<button type="button" role="option" aria-selected="false" data-booking-object="${escapeHtml(name)}"><span>${escapeHtml(name)}</span><b aria-hidden="true">✓</b></button>`).join("")
  : '<p>Объекты пока не добавлены</p>';

const dateKey = (date) => {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
};

const parseDate = (value) => new Date(`${value}T12:00:00`);
const formatDate = (value) => parseDate(value).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

export const mechanismObjectSelect = (objects = []) => `<div class="mechanisms-booking-select" data-booking-select>
  <input type="hidden" name="object" required>
  <button class="mechanisms-booking-control" type="button" data-booking-select-trigger aria-haspopup="listbox" aria-expanded="false"><span data-booking-select-label>Выберите объект</span><span class="mechanisms-booking-control__chevron" aria-hidden="true"></span></button>
  <div class="mechanisms-booking-select__menu" role="listbox" hidden>
    <div class="mechanisms-booking-select__search"><span aria-hidden="true">⌕</span><input type="search" data-booking-object-search placeholder="Быстрый поиск" aria-label="Поиск объекта" autocomplete="off"></div>
    <div class="mechanisms-booking-select__options" data-booking-object-options>${renderObjects(objects)}</div>
    <p class="mechanisms-booking-select__empty" data-booking-object-empty hidden>Ничего не найдено</p>
  </div>
</div>`;

export const mechanismDateRange = () => `<div class="mechanisms-date" data-booking-calendar>
  <input type="hidden" name="dateFrom" required><input type="hidden" name="dateTo" required>
  <button class="mechanisms-booking-control" type="button" data-calendar-trigger aria-expanded="false"><span data-calendar-label>Выберите даты</span><span class="mechanisms-booking-control__calendar" aria-hidden="true">⌑</span></button>
  <div class="mechanisms-date__popover" hidden><div class="mechanisms-date__nav"><button type="button" data-calendar-prev aria-label="Предыдущий месяц">‹</button><b data-calendar-month></b><button type="button" data-calendar-next aria-label="Следующий месяц">›</button></div><div class="mechanisms-date__week">${["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => `<span>${day}</span>`).join("")}</div><div class="mechanisms-date__days" data-calendar-days></div><p data-calendar-hint>Выберите первый день</p></div>
</div>`;

/** Подключает фирменный список объектов и календарь диапазона. */
export const setupMechanismBookingControls = (form) => {
  const select = form.querySelector("[data-booking-select]");
  const calendar = form.querySelector("[data-booking-calendar]");
  const objectSearch = select.querySelector("[data-booking-object-search]");
  let viewDate = new Date(); viewDate.setDate(1); viewDate.setHours(12, 0, 0, 0);

  const closePopovers = (except) => {
    [select, calendar].forEach((control) => {
      if (!control || control === except) return;
      control.querySelector('[role="listbox"],.mechanisms-date__popover')?.setAttribute("hidden", "");
      control.querySelector("[aria-expanded]")?.setAttribute("aria-expanded", "false");
      control.classList.remove("is-open");
    });
  };
  const renderCalendar = () => {
    const from = form.elements.dateFrom.value;
    const to = form.elements.dateTo.value;
    const first = new Date(viewDate);
    const offset = (first.getDay() + 6) % 7;
    const lastDay = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    calendar.querySelector("[data-calendar-month]").textContent = viewDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
    calendar.querySelector("[data-calendar-days]").innerHTML = `${'<span class="is-spacer"></span>'.repeat(offset)}${Array.from({ length: lastDay }, (_, index) => {
      const day = new Date(viewDate.getFullYear(), viewDate.getMonth(), index + 1, 12);
      const key = dateKey(day);
      const disabled = key < dateKey(new Date());
      const inRange = from && to && key > from && key < to;
      return `<button type="button" data-calendar-day="${key}" ${disabled ? "disabled" : ""} class="${key === from ? "is-start" : ""} ${key === to ? "is-end" : ""} ${inRange ? "is-range" : ""}" aria-label="${day.toLocaleDateString("ru-RU")}">${index + 1}</button>`;
    }).join("")}`;
  };
  const updateDateLabel = () => {
    const from = form.elements.dateFrom.value;
    const to = form.elements.dateTo.value;
    form.querySelector("[data-calendar-label]").textContent = !from ? "Выберите даты" : from === to ? formatDate(from) : `${formatDate(from)} — ${formatDate(to)}`;
    calendar.querySelector("[data-calendar-hint]").textContent = !from || to ? "Выберите первый день" : "Теперь выберите последний день";
  };
  form.addEventListener("click", (event) => {
    const selectTrigger = event.target.closest("[data-booking-select-trigger]");
    if (selectTrigger) {
      const menu = select.querySelector('[role="listbox"]'); const open = menu.hidden;
      closePopovers(select); menu.hidden = !open; select.classList.toggle("is-open", open); selectTrigger.setAttribute("aria-expanded", String(open));
      if (open) { objectSearch.value = ""; objectSearch.dispatchEvent(new Event("input")); requestAnimationFrame(() => objectSearch.focus()); }
      return;
    }
    const object = event.target.closest("[data-booking-object]");
    if (object) {
      form.elements.object.value = object.dataset.bookingObject;
      select.querySelector("[data-booking-select-label]").textContent = object.dataset.bookingObject;
      select.querySelectorAll("[data-booking-object]").forEach((item) => { const active = item === object; item.classList.toggle("is-selected", active); item.setAttribute("aria-selected", String(active)); });
      closePopovers(); return;
    }
    const calendarTrigger = event.target.closest("[data-calendar-trigger]");
    if (calendarTrigger) {
      const popover = calendar.querySelector(".mechanisms-date__popover"); const open = popover.hidden;
      closePopovers(calendar); popover.hidden = !open; calendar.classList.toggle("is-open", open); calendarTrigger.setAttribute("aria-expanded", String(open)); renderCalendar(); return;
    }
    if (event.target.closest("[data-calendar-prev]")) { viewDate.setMonth(viewDate.getMonth() - 1); renderCalendar(); return; }
    if (event.target.closest("[data-calendar-next]")) { viewDate.setMonth(viewDate.getMonth() + 1); renderCalendar(); return; }
    const day = event.target.closest("[data-calendar-day]");
    if (day) {
      const from = form.elements.dateFrom.value;
      if (!from || form.elements.dateTo.value) { form.elements.dateFrom.value = day.dataset.calendarDay; form.elements.dateTo.value = ""; }
      else { form.elements.dateFrom.value = day.dataset.calendarDay < from ? day.dataset.calendarDay : from; form.elements.dateTo.value = day.dataset.calendarDay < from ? from : day.dataset.calendarDay; }
      updateDateLabel(); renderCalendar();
      if (form.elements.dateTo.value) closePopovers();
    }
  });
  objectSearch.addEventListener("input", () => {
    const query = objectSearch.value.trim().toLocaleLowerCase("ru-RU");
    let visibleCount = 0;
    select.querySelectorAll("[data-booking-object]").forEach((item) => {
      const visible = !query || item.dataset.bookingObject.toLocaleLowerCase("ru-RU").includes(query);
      item.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    select.querySelector("[data-booking-object-empty]").hidden = !query || visibleCount > 0;
  });
  return {
    setObjects(objects = []) {
      select.querySelector("[data-booking-object-options]").innerHTML = renderObjects(objects);
      objectSearch.value = "";
      select.querySelector("[data-booking-object-empty]").hidden = true;
    },
    reset(date = dateKey(new Date())) {
      form.elements.object.value = ""; form.elements.dateFrom.value = date; form.elements.dateTo.value = date;
      select.querySelector("[data-booking-select-label]").textContent = "Выберите объект";
      select.querySelectorAll("[data-booking-object]").forEach((item) => item.classList.remove("is-selected"));
      viewDate = parseDate(date); viewDate.setDate(1); updateDateLabel(); renderCalendar(); closePopovers();
    },
  };
};
