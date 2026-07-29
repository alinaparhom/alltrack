const POPULAR_MECHANISMS = {
  name: ["Экскаватор", "Автокран", "Погрузчик", "Самосвал", "Бульдозер"],
  manufacturer: ["Caterpillar", "JCB", "Komatsu", "МАЗ", "МТЗ"],
  model: ["CAT 320", "JCB 3CX", "Komatsu PC200", "МАЗ 6516", "МТЗ-82"],
};

const normalize = (value) => String(value || "").trim();

/** Возвращает сначала самые часто встречающиеся значения, а для пустой базы — популярные варианты. */
const rankedValues = (mechanisms, field) => {
  const counts = new Map();
  mechanisms.forEach((item) => {
    const value = normalize(item?.[field]);
    if (value) counts.set(value, (counts.get(value) || 0) + 1);
  });
  const saved = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru")).map(([value]) => value);
  return [...new Set([...saved, ...POPULAR_MECHANISMS[field]])];
};

/** Подключает доступные с клавиатуры подсказки к полям карточки механизма. */
export const setupMechanismSuggestions = (form, mechanisms = []) => {
  const closeAll = (except) => form.querySelectorAll("[data-mechanism-suggest]").forEach((box) => {
    if (box !== except) box.hidden = true;
  });

  form.querySelectorAll("[data-mechanism-suggest-field]").forEach((input) => {
    const field = input.dataset.mechanismSuggestField;
    const box = input.parentElement.querySelector("[data-mechanism-suggest]");
    const values = rankedValues(mechanisms, field);
    const render = () => {
      const query = normalize(input.value).toLocaleLowerCase("ru");
      const matches = values.filter((value) => !query || value.toLocaleLowerCase("ru").includes(query)).slice(0, 6);
      box.innerHTML = matches.map((value) => `<button type="button" data-mechanism-suggestion="${value.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}">${value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</button>`).join("");
      box.hidden = !matches.length;
      closeAll(box);
    };
    input.addEventListener("focus", render);
    input.addEventListener("input", render);
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
  form.addEventListener("focusout", () => setTimeout(() => {
    if (!form.contains(document.activeElement)) closeAll();
  }));
};
