const escapeHtml = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;");

export const mechanismTimeSelect = (name, times, selected, label) => `<div class="mechanisms-time-select" data-mechanism-time-select>
  <input type="hidden" name="${name}" value="${escapeHtml(selected)}">
  <button class="mechanisms-time-select__trigger" type="button" aria-haspopup="listbox" aria-expanded="false"><span>${escapeHtml(selected)}</span><i aria-hidden="true"></i></button>
  <div class="mechanisms-time-select__menu" role="listbox" aria-label="${escapeHtml(label)}" hidden>${times.map((time) => `<button type="button" role="option" class="mechanisms-time-select__option ${time === selected ? "is-selected" : ""}" aria-selected="${time === selected}" data-value="${time}"><span>${time}</span><b aria-hidden="true">✓</b></button>`).join("")}</div>
</div>`;

export const setupMechanismTimeSelects = (container) => {
  const close = (except) => container.querySelectorAll("[data-mechanism-time-select]").forEach((control) => {
    if (control === except) return;
    control.classList.remove("is-open"); control.querySelector(".mechanisms-time-select__trigger")?.setAttribute("aria-expanded", "false");
    const menu = control.querySelector('[role="listbox"]'); if (menu) menu.hidden = true;
  });
  container.addEventListener("click", (event) => {
    const trigger = event.target.closest(".mechanisms-time-select__trigger");
    const option = event.target.closest(".mechanisms-time-select__option");
    if (trigger) { const control = trigger.closest("[data-mechanism-time-select]"); const open = !control.classList.contains("is-open"); close(control); control.classList.toggle("is-open", open); trigger.setAttribute("aria-expanded", String(open)); control.querySelector('[role="listbox"]').hidden = !open; return; }
    if (option) { const control = option.closest("[data-mechanism-time-select]"); const input = control.querySelector("input"); input.value = option.dataset.value; control.querySelector(".mechanisms-time-select__trigger span").textContent = option.dataset.value; control.querySelectorAll(".mechanisms-time-select__option").forEach((item) => { const selected = item === option; item.classList.toggle("is-selected", selected); item.setAttribute("aria-selected", String(selected)); }); close(); input.dispatchEvent(new Event("change", { bubbles: true })); return; }
    close();
  });
};
