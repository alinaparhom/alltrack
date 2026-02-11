# AllTrack

## Рассылка `awaitingReply`

Добавлен скрипт `scripts/send-awaiting-reply-mailing.mjs`.

Что делает:
- читает настройки из `<Организация>/Настройки.json` → `organization.mailings.awaitingReply`;
- берёт перемещения без `Дата ответа` из `<Организация>/Перемещения.json`;
- группирует записи по ответственному (`Принял`);
- считает текущий штраф по каждой записи по правилу `organization.fines.lateReply`;
- отправляет одно сообщение в Telegram-группы, указанные в `telegramSchedule` рассылки.

Запуск:

```bash
node scripts/send-awaiting-reply-mailing.mjs СУ-21
```

Проверка без отправки:

```bash
node scripts/send-awaiting-reply-mailing.mjs СУ-21 --dry-run
```
