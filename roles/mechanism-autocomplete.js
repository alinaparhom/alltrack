const POPULAR_VALUES = {
  name: ["Экскаватор", "Погрузчик", "Автокран", "Самосвал", "Бульдозер"],
  manufacturer: ["Caterpillar", "JCB", "Komatsu", "МАЗ", "КамАЗ"],
  model: ["CAT 320", "JCB 3CX", "КС-55713", "БелАЗ-7547", "D6R"],
};

const escapeHtml = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

export const mechanismAutocompleteInput = ({ name, value = "", placeholder, autocomplete = "off" }) => `
  <div class="mechanisms-autocomplete" data-mechanism-autocomplete="${name}">
    <input name="${name}" required maxlength="80" autocomplete="${autocomplete}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" aria-autocomplete="list" aria-expanded="false">
    <div class="mechanisms-autocomplete__menu" role="listbox" hidden></div>
  </div>`;

/** Подсказки сначала учитывают частоту значений организации, затем популярные варианты. */
export const setupMechanismAutocomplete = (container, getMechanisms) => {
  const close = (except) => container.querySelectorAll("[data-mechanism-autocomplete]").forEach((control) => {
    if (control === except) return;
    control.querySelector("input")?.setAttribute("aria-expanded", "false");
    const menu = control.querySelector('[role="listbox"]');
    if (menu) menu.hidden = true;
  });
  const show = (control) => {
    const input = control.querySelector("input");
    const field = control.dataset.mechanismAutocomplete;
    const query = input.value.trim().toLocaleLowerCase("ru");
    const counts = new Map();
    getMechanisms().forEach((item) => {
      const value = String(item[field] || "").trim();
      if (value) counts.set(value, (counts.get(value) || 0) + 1);
    });
    POPULAR_VALUES[field].forEach((value) => { if (!counts.has(value)) counts.set(value, 0); });
    const values = [...counts].filter(([value]) => !query || value.toLocaleLowerCase("ru").includes(query))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru")).slice(0, 6).map(([value]) => value);
    const menu = control.querySelector('[role="listbox"]');
    menu.innerHTML = values.map((value) => `<button type="button" role="option" class="mechanisms-autocomplete__option" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("");
    menu.hidden = !values.length;
    input.setAttribute("aria-expanded", String(Boolean(values.length)));
    close(control);
  };
  container.addEventListener("focusin", (event) => { const control = event.target.closest("[data-mechanism-autocomplete]"); if (control) show(control); });
  container.addEventListener("input", (event) => { const control = event.target.closest("[data-mechanism-autocomplete]"); if (control) show(control); });
  container.addEventListener("click", (event) => {
    const option = event.target.closest(".mechanisms-autocomplete__option");
    if (option) { const control = option.closest("[data-mechanism-autocomplete]"); control.querySelector("input").value = option.dataset.value; close(); }
    else if (!event.target.closest("[data-mechanism-autocomplete]")) close();
  });
};
