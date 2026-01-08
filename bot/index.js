import { Telegraf } from "telegraf";

const token = process.env.BOT_TOKEN;

if (!token) {
  console.error("Не найден BOT_TOKEN. Создайте файл .env и укажите BOT_TOKEN.");
  process.exit(1);
}

const bot = new Telegraf(token);

bot.start((ctx) => {
  ctx.reply(
    "Привет! Я бот AllTrack.\n\n" +
      "Доступные команды:\n" +
      "/assets — список активов\n" +
      "/transfer — передача ответственности\n" +
      "/repair — заявка на ремонт\n" +
      "/help — помощь"
  );
});

bot.command("help", (ctx) => {
  ctx.reply(
    "Быстрые действия:\n" +
      "• /assets — посмотреть активы\n" +
      "• /transfer — передать актив\n" +
      "• /repair — оформить ремонт"
  );
});

bot.command("assets", (ctx) => {
  ctx.reply("Активы: 124 в наличии · 7 в ремонте · 15 в пути.");
});

bot.command("transfer", (ctx) => {
  ctx.reply("Передача: напишите номер актива и нового ответственного.");
});

bot.command("repair", (ctx) => {
  ctx.reply("Ремонт: опишите проблему и срочность.");
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
