require("dotenv").config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  telegramBotToken: required("TELEGRAM_BOT_TOKEN"),
  adminChatId: required("ADMIN_CHAT_ID"),

  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",

  spreadsheetId: required("SPREADSHEET_ID"),
  googleServiceAccountJson: required("GOOGLE_SERVICE_ACCOUNT_JSON"),

  clinicName: process.env.CLINIC_NAME || "مطب",
  clinicTimezone: process.env.CLINIC_TIMEZONE || "Asia/Tehran",
  clinicOpenHour: Number(process.env.CLINIC_OPEN_HOUR || 9),
  clinicCloseHour: Number(process.env.CLINIC_CLOSE_HOUR || 18),
  slotMinutes: Number(process.env.SLOT_MINUTES || 30),
  workDays: (process.env.CLINIC_WORK_DAYS || "0,1,2,3,6")
    .split(",")
    .map((d) => Number(d.trim())),
};
