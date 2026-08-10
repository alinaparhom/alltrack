const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

/** Приводит разные форматы файла «Объекты.json» к списку уникальных названий. */
export const normalizeMechanismBookingObjects = (data) => {
  const items = Array.isArray(data)
    ? data
    : [data?.objects, data?.items, data?.data].find(Array.isArray) || [];

  return [...new Set(items
    .map((item) => String(
      typeof item === "string"
        ? item
        : item?.name ?? item?.title ?? item?.["Название"] ?? item?.["Объект"] ?? ""
    ).trim())
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ru", { numeric: true }));
};

export const renderMechanismBookingObjects = (objects = []) => objects.length
  ? objects.map((name) => `<button type="button" role="option" aria-selected="false" data-booking-object="${escapeHtml(name)}"><span>${escapeHtml(name)}</span><b aria-hidden="true">✓</b></button>`).join("")
  : '<p data-booking-objects-placeholder>Объекты пока не добавлены</p>';
