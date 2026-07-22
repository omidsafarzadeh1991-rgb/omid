const { Bot, InlineKeyboard } = require("grammy");
const config = require("./config");
const { chat } = require("./ai");
const { updateBookingStatus, getBookingByRow, setAdminMessageId } = require("./sheets");

const bot = new Bot(config.telegramBotToken);

function formatBookingForAdmin(booking) {
  return (
    `🆕 درخواست نوبت جدید\n\n` +
    `نام: ${booking.patient_name}\n` +
    `تلفن: ${booking.phone}\n` +
    `خدمت: ${booking.service}\n` +
    `تاریخ: ${booking.date}\n` +
    `ساعت: ${booking.time}` +
    (booking.notes ? `\nتوضیحات: ${booking.notes}` : "")
  );
}

async function notifyAdminOfBooking(booking) {
  const keyboard = new InlineKeyboard()
    .text("✅ تایید", `approve:${booking.rowNumber}`)
    .text("❌ رد", `reject:${booking.rowNumber}`);

  const sent = await bot.api.sendMessage(config.adminChatId, formatBookingForAdmin(booking), {
    reply_markup: keyboard,
  });
  await setAdminMessageId(booking.rowNumber, sent.message_id);
}

bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id;
  await ctx.replyWithChatAction("typing");
  try {
    const reply = await chat(chatId, ctx.message.text, notifyAdminOfBooking);
    await ctx.reply(reply);
  } catch (err) {
    console.error("Error handling message:", err);
    await ctx.reply("متاسفانه یه مشکل فنی پیش اومد، لطفا چند لحظه دیگه دوباره امتحان کنید.");
  }
});

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const [action, rowStr] = data.split(":");
  const rowNumber = Number(rowStr);
  if (!rowNumber || (action !== "approve" && action !== "reject")) {
    await ctx.answerCallbackQuery();
    return;
  }

  const booking = await getBookingByRow(rowNumber);
  if (!booking) {
    await ctx.answerCallbackQuery({ text: "این نوبت پیدا نشد." });
    return;
  }
  if (booking.status !== "pending") {
    await ctx.answerCallbackQuery({ text: "قبلا تصمیم‌گیری شده." });
    return;
  }

  const newStatus = action === "approve" ? "confirmed" : "rejected";
  await updateBookingStatus(rowNumber, newStatus);

  const decisionText =
    newStatus === "confirmed"
      ? `✅ تایید شد — ${booking.patientName} | ${booking.service} | ${booking.date} ${booking.time}`
      : `❌ رد شد — ${booking.patientName} | ${booking.service} | ${booking.date} ${booking.time}`;

  await ctx.editMessageText(decisionText);
  await ctx.answerCallbackQuery({ text: "ثبت شد." });

  const patientMessage =
    newStatus === "confirmed"
      ? `نوبت شما تایید شد ✅\nخدمت: ${booking.service}\nتاریخ: ${booking.date}\nساعت: ${booking.time}\n\nمنتظر حضورتون هستیم.`
      : `متاسفانه نوبت درخواستی شما (${booking.date} ساعت ${booking.time}) تایید نشد. لطفا برای هماهنگی زمان دیگری با ما در ارتباط باشید.`;

  try {
    await bot.api.sendMessage(booking.chatId, patientMessage);
  } catch (err) {
    console.error("Could not notify patient:", err);
  }
});

module.exports = bot;
