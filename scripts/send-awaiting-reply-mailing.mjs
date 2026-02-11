#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_BOT_TOKEN =
  process.env.ALLTRACK_BOT_TOKEN ||
  '8549452123:AAGxveuJSVf-xpNHQYTDKDmuMmHjGRVeDj0';

const ORG_FOLDER = process.argv[2] || 'СУ-21';
const DRY_RUN = process.argv.includes('--dry-run');

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('ru');
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDate(value) {
  const text = String(value ?? '').trim();
  const parts = text.split('.');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map((item) => Number.parseInt(item, 10));
  if (!day || !month || !year) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysDiff(from, to = new Date()) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
}

function toCollection(raw, key) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.[key])) return raw[key];
  return [];
}

async function loadJson(filePath) {
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatMoney(value) {
  return `${normalizeNumber(value, 0).toFixed(2)} ₽`;
}

function resolveLateReplyFine(move, fineConfig) {
  if (!fineConfig?.enabled) return 0;
  const daysLimit = normalizeNumber(fineConfig.days, 0);
  const amount = normalizeNumber(fineConfig.amount, 0);
  if (!amount) return 0;
  const moveDate = parseDate(move?.['Дата перемещения']);
  if (!moveDate) return 0;
  const diffDays = daysDiff(moveDate, new Date());
  if (diffDays <= daysLimit) return 0;
  const chargedDays = Math.max(0, diffDays - daysLimit);
  return chargedDays * amount;
}

function resolveResponsible(move, tool) {
  const candidates = [
    move?.['Принял'],
    move?.['Новый ответственный'],
    move?.['Ответственный'],
    tool?.['Ответственный'],
  ];

  return (
    candidates
      .map((value) => String(value ?? '').trim())
      .find(Boolean) || 'Не назначен'
  );
}

function buildToolIndex(tools) {
  const byNumber = new Map();
  const byAccounting = new Map();
  const byNumberNormalized = new Map();
  const byAccountingNormalized = new Map();
  for (const tool of tools) {
    const number = String(tool?.['Номер'] ?? '').trim();
    const accounting = String(tool?.['Бух.номер'] ?? '').trim();
    if (number) byNumber.set(number, tool);
    if (accounting) byAccounting.set(accounting, tool);
    const numberKey = normalizeKey(number);
    const accountingKey = normalizeKey(accounting);
    if (numberKey) byNumberNormalized.set(numberKey, tool);
    if (accountingKey) byAccountingNormalized.set(accountingKey, tool);
  }
  return { byNumber, byAccounting, byNumberNormalized, byAccountingNormalized };
}

function resolveToolGroup(move, tool) {
  const direct = [
    tool?.['Граппа инструментов'],
    tool?.['Группа инструментов'],
    tool?.['Группа'],
    move?.['Группа инструментов'],
    move?.['Граппа инструментов'],
    move?.['Группа'],
  ]
    .map((value) => String(value ?? '').trim())
    .find(Boolean);

  return direct || '';
}

function buildMessage(orgFolder, grouped, totalFine, moveCount) {
  const now = new Date();
  const dateLabel = `${String(now.getDate()).padStart(2, '0')}.${String(
    now.getMonth() + 1
  ).padStart(2, '0')}.${now.getFullYear()}`;

  if (!grouped.length) {
    return [
      `<b>Ожидают принятия · ${escapeHtml(orgFolder)}</b>`,
      `Дата: ${dateLabel}`,
      '',
      'Новых ожиданий по выбранным группам инструментов нет.',
    ].join('\n');
  }

  const lines = [
    `<b>Ожидают принятия · ${escapeHtml(orgFolder)}</b>`,
    `Дата: ${dateLabel}`,
    `Всего перемещений: ${moveCount}`,
    `Общий текущий штраф: <b>${formatMoney(totalFine)}</b>`,
  ];

  for (const group of grouped) {
    lines.push('');
    lines.push(`<b>${escapeHtml(group.responsible)}</b>`);
    lines.push(
      `Перемещений: ${group.items.length} · Штраф: <b>${formatMoney(group.totalFine)}</b>`
    );
    group.items.forEach((item, idx) => {
      lines.push(
        `${idx + 1}) ${escapeHtml(item.number || 'без номера')} · ${escapeHtml(
          item.name || 'Без наименования'
        )}`
      );
      lines.push(
        `   Объект: ${escapeHtml(item.oldObject || '—')} → ${escapeHtml(
          item.newObject || '—'
        )}`
      );
      lines.push(
        `   Дата перемещения: ${escapeHtml(item.moveDate || '—')} · Штраф: ${formatMoney(
          item.fine
        )}`
      );
    });
  }

  return lines.join('\n');
}

async function sendTelegramMessage(chatId, text) {
  const response = await fetch(
    `https://api.telegram.org/bot${DEFAULT_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) {
    throw new Error(`Telegram API error for ${chatId}: ${JSON.stringify(data)}`);
  }
}

async function main() {
  const settingsPath = path.join(ORG_FOLDER, 'Настройки.json');
  const movesPath = path.join(ORG_FOLDER, 'Перемещения.json');
  const toolsPath = path.join(ORG_FOLDER, 'База с инструментами.json');

  const settings = await loadJson(settingsPath);
  const allMoves = toCollection(await loadJson(movesPath), 'moves');
  const allTools = toCollection(await loadJson(toolsPath), 'tools');

  const mailing = settings?.organization?.mailings?.awaitingReply ?? {};
  if (!mailing.enabled) {
    console.log('Рассылка awaitingReply отключена в Настройки.json');
    return;
  }

  const selectedToolGroups = new Set(
    (mailing.toolGroups ?? []).map((item) => normalizeKey(item)).filter(Boolean)
  );

  const telegramIds = (settings?.organization?.telegramGroups ?? [])
    .map((group) => String(group?.telegramId ?? '').trim())
    .filter(Boolean)
    .filter((id) => mailing.telegramSchedule?.[id]);

  if (!telegramIds.length) {
    console.log('Нет групп Telegram в awaitingReply.telegramSchedule');
    return;
  }

  const { byNumber, byAccounting, byNumberNormalized, byAccountingNormalized } =
    buildToolIndex(allTools);
  const fineConfig = settings?.organization?.fines?.lateReply ?? {};

  const pending = allMoves
    .filter((move) => !String(move?.['Дата ответа'] ?? '').trim())
    .map((move) => {
      const number = String(move?.['Номер'] ?? '').trim();
      const accounting = String(move?.['Бух.номер'] ?? '').trim();
      const tool =
        byNumber.get(number) ||
        byAccounting.get(accounting) ||
        byNumberNormalized.get(normalizeKey(number)) ||
        byAccountingNormalized.get(normalizeKey(accounting)) ||
        null;
      const toolGroup = resolveToolGroup(move, tool);
      return {
        move,
        number: number || accounting,
        responsible: resolveResponsible(move, tool),
        fine: resolveLateReplyFine(move, fineConfig),
        name: String(tool?.['Наименование'] ?? '').trim(),
        oldObject: String(move?.['Старый объект'] ?? '').trim(),
        newObject: String(move?.['Новый объект'] ?? '').trim(),
        moveDate: String(move?.['Дата перемещения'] ?? '').trim(),
        toolGroup,
      };
    })
    .filter(
      (item) =>
        !selectedToolGroups.size ||
        selectedToolGroups.has(normalizeKey(item.toolGroup))
    );

  const map = new Map();
  for (const item of pending) {
    const key = item.responsible;
    if (!map.has(key)) map.set(key, { responsible: key, totalFine: 0, items: [] });
    const entry = map.get(key);
    entry.items.push(item);
    entry.totalFine += item.fine;
  }

  const grouped = Array.from(map.values()).sort((a, b) =>
    a.responsible.localeCompare(b.responsible, 'ru')
  );
  const totalFine = grouped.reduce((sum, group) => sum + group.totalFine, 0);
  const message = buildMessage(ORG_FOLDER, grouped, totalFine, pending.length);

  if (DRY_RUN) {
    console.log(message);
    console.log('\nГруппы для отправки:', telegramIds.join(', '));
    return;
  }

  for (const chatId of telegramIds) {
    await sendTelegramMessage(chatId, message);
    console.log(`Отправлено в группу ${chatId}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
