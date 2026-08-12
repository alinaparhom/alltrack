import assert from "node:assert/strict";
import test from "node:test";
import { findUserAccessProfiles } from "../auth/user-access.js";

test("возвращает профили пользователя во всех организациях", () => {
  const users = [
    { telegram_id: "123", full_name: "Иванов Иван", organization: "А", role: "Энергетик" },
    { telegram_id: 123, full_name: "Иванов Иван", organization: "Б", role: "Контроль" },
    { telegram_id: "456", full_name: "Другой", organization: "В", role: "Энергетик" },
  ];

  assert.deepEqual(
    findUserAccessProfiles(users, { telegramId: 123 }).map((user) => user.organization),
    ["А", "Б"]
  );
});

test("добавляет старое приглашение без ID по совпадающему ФИО", () => {
  const users = [
    { telegram_id: "123", full_name: " Иванов  Иван ", organization: "А", role: "Энергетик" },
    { telegram_id: 0, full_name: "иванов иван", organization: "Б", role: "Ответственный" },
  ];

  assert.equal(findUserAccessProfiles(users, { telegramId: "123" }).length, 2);
});

test("не дублирует одинаковый доступ", () => {
  const profile = { full_name: "Иванов Иван", organization: "А", role: "Энергетик", position: "Инженер" };
  const result = findUserAccessProfiles(
    [{ ...profile, telegram_id: 0 }, { ...profile, telegram_id: "123" }],
    { telegramId: "123" }
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].telegram_id, "123");
});
