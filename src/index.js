const bot = require("./bot");

bot.catch((err) => {
  console.error("Bot error:", err);
});

bot.start();
console.log("Clinic Telegram assistant is running (long polling)...");
