const Anthropic = require("@anthropic-ai/sdk");
const { DateTime } = require("luxon");
const config = require("./config");
const { getServices, appendBooking } = require("./sheets");
const { getAvailableSlots } = require("./availability");

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

const conversations = new Map(); // chatId -> messages[]

const tools = [
  {
    name: "get_services",
    description:
      "لیست خدمات مطب به همراه قیمت و مدت‌زمان هر خدمت را برمی‌گرداند. همیشه قبل از اعلام قیمت به بیمار از این ابزار استفاده کن، حدس نزن.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "check_availability",
    description:
      "ساعت‌های خالی مطب را برای یک تاریخ مشخص برمی‌گرداند. قبل از ثبت هر نوبت حتما این ابزار را صدا بزن تا مطمئن شوی آن ساعت خالی است.",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "تاریخ میلادی به فرمت YYYY-MM-DD",
        },
      },
      required: ["date"],
    },
  },
  {
    name: "create_booking",
    description:
      "درخواست نوبت جدید را ثبت می‌کند. این ابزار را فقط زمانی صدا بزن که نام بیمار، شماره تماس، خدمت مورد نظر، تاریخ و ساعت را از بیمار گرفته و تایید کرده باشی. نوبت به صورت «در انتظار تایید» ثبت می‌شود و منتظر تایید مسئول مطب می‌ماند؛ حتما به بیمار بگو که نتیجه نهایی را به او اطلاع می‌دهی.",
    input_schema: {
      type: "object",
      properties: {
        patient_name: { type: "string" },
        phone: { type: "string" },
        service: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
        time: { type: "string", description: "HH:mm" },
        notes: { type: "string" },
      },
      required: ["patient_name", "phone", "service", "date", "time"],
    },
  },
];

function systemPrompt() {
  const today = DateTime.now().setZone(config.clinicTimezone).toFormat("yyyy-MM-dd (cccc)");
  return `تو دستیار هوش مصنوعی «${config.clinicName}» در تلگرام هستی و با بیمارها به فارسی و مودبانه صحبت می‌کنی.
امروز ${today} است (منطقه زمانی ${config.clinicTimezone}).

وظایف تو:
1. به سوالات بیمار درباره‌ی خدمات و قیمت‌ها با استفاده از ابزار get_services جواب بده. هیچ‌وقت قیمت را از خودت حدس نزن.
2. اگر بیمار خواست نوبت بگیرد: ابتدا نام کامل، شماره تماس، خدمت مورد نظر، و تاریخ/ساعت پیشنهادی را از او بپرس. با ابزار check_availability مطمئن شو آن ساعت خالی است؛ اگر پر بود چند گزینه‌ی خالی نزدیک به همان تاریخ را به او پیشنهاد بده.
3. وقتی همه‌ی اطلاعات کامل و تایید شده بود، با ابزار create_booking نوبت را ثبت کن. بعد از ثبت، به بیمار بگو که درخواستش برای مسئول مطب ارسال شد و به محض تایید به او خبر می‌دهی.
4. لحن تو کوتاه، دوستانه و حرفه‌ای است؛ از پیام‌های طولانی غیرضروری پرهیز کن.
5. اگر سوال پزشکی تخصصی/تشخیصی پرسید، توضیح بده که این موضوع را باید با پزشک مطرح کند و تو فقط در مورد نوبت‌دهی و خدمات کمک می‌کنی.`;
}

async function executeTool(name, input, chatId) {
  if (name === "get_services") {
    const services = await getServices();
    return services;
  }
  if (name === "check_availability") {
    const result = await getAvailableSlots(input.date);
    return result;
  }
  if (name === "create_booking") {
    const rowNumber = await appendBooking({
      chatId,
      patientName: input.patient_name,
      phone: input.phone,
      service: input.service,
      date: input.date,
      time: input.time,
      notes: input.notes,
    });
    return { status: "pending_admin_approval", booking_row: rowNumber };
  }
  throw new Error(`Unknown tool: ${name}`);
}

function getHistory(chatId) {
  if (!conversations.has(chatId)) {
    conversations.set(chatId, []);
  }
  return conversations.get(chatId);
}

const MAX_HISTORY_MESSAGES = 20;

async function chat(chatId, userText, onBookingCreated) {
  const history = getHistory(chatId);
  history.push({ role: "user", content: userText });

  let finalText = "";
  // Agentic tool-use loop
  for (let i = 0; i < 6; i++) {
    const response = await anthropic.messages.create({
      model: config.anthropicModel,
      max_tokens: 1024,
      system: systemPrompt(),
      messages: history,
      tools,
    });

    history.push({ role: "assistant", content: response.content });

    const toolUses = response.content.filter((block) => block.type === "tool_use");
    const textBlocks = response.content.filter((block) => block.type === "text");
    finalText = textBlocks.map((b) => b.text).join("\n");

    if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
      break;
    }

    const toolResults = [];
    for (const toolUse of toolUses) {
      let result;
      try {
        result = await executeTool(toolUse.name, toolUse.input, chatId);
        if (toolUse.name === "create_booking" && onBookingCreated) {
          await onBookingCreated({ rowNumber: result.booking_row, ...toolUse.input });
        }
      } catch (err) {
        result = { error: String(err.message || err) };
      }
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      });
    }
    history.push({ role: "user", content: toolResults });
  }

  // Trim history to avoid unbounded growth
  if (history.length > MAX_HISTORY_MESSAGES) {
    conversations.set(chatId, history.slice(history.length - MAX_HISTORY_MESSAGES));
  }

  return finalText || "متوجه نشدم، می‌شه دوباره توضیح بدید؟";
}

module.exports = { chat };
