const normalizeTelegramId = (value) => {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).trim().replace(/[^\d-]/g, "");
  return !cleaned || cleaned === "0" ? null : cleaned;
};

const normalizeName = (value) =>
  String(value ?? "")
    .trim()
    .toLocaleLowerCase("ru-RU")
    .replace(/\s+/g, " ");

const buildAccessKey = (user) =>
  [user?.organization, user?.role, user?.position]
    .map((value) => String(value ?? "").trim().toLocaleLowerCase("ru-RU"))
    .join("\u0000");

/**
 * Возвращает все профили человека, а не только первую найденную запись.
 * Сначала ищем по Telegram ID, затем добавляем записи с тем же ФИО: у старых
 * приглашений ID мог сохраниться только для одной организации.
 */
export function findUserAccessProfiles(users, { telegramId, telegramName = "" } = {}) {
  const source = Array.isArray(users) ? users : [];
  const id = normalizeTelegramId(telegramId);
  const idMatches = id
    ? source.filter((user) => normalizeTelegramId(user?.telegram_id) === id)
    : [];
  const knownNames = new Set(
    [telegramName, ...idMatches.map((user) => user?.full_name)]
      .map(normalizeName)
      .filter(Boolean)
  );

  const matches = source.filter((user) => {
    if (id && normalizeTelegramId(user?.telegram_id) === id) return true;
    return knownNames.has(normalizeName(user?.full_name));
  });

  const uniqueAccesses = new Map();
  matches.forEach((user) => {
    const key = buildAccessKey(user);
    const previous = uniqueAccesses.get(key);
    // Предпочитаем запись с актуальным Telegram ID старой записи с ID = 0.
    if (!previous || normalizeTelegramId(user?.telegram_id) === id) {
      uniqueAccesses.set(key, user);
    }
  });
  return [...uniqueAccesses.values()];
}
