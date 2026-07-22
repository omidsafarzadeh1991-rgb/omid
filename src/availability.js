const { DateTime } = require("luxon");
const config = require("./config");
const { getBookingsForDate } = require("./sheets");

function isWorkDay(dateStr) {
  const dt = DateTime.fromISO(dateStr, { zone: config.clinicTimezone });
  const weekday = dt.weekday % 7; // luxon: 1=Monday..7=Sunday -> convert to 0=Sunday..6=Saturday
  return config.workDays.includes(weekday);
}

function buildDaySlots(dateStr) {
  const slots = [];
  let cursor = DateTime.fromISO(dateStr, { zone: config.clinicTimezone }).set({
    hour: config.clinicOpenHour,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  const end = cursor.set({ hour: config.clinicCloseHour, minute: 0 });
  while (cursor < end) {
    slots.push(cursor.toFormat("HH:mm"));
    cursor = cursor.plus({ minutes: config.slotMinutes });
  }
  return slots;
}

async function getAvailableSlots(dateStr) {
  if (!isWorkDay(dateStr)) {
    return { workDay: false, slots: [] };
  }
  const allSlots = buildDaySlots(dateStr);
  const booked = await getBookingsForDate(dateStr);
  const bookedTimes = new Set(booked.map((b) => b.time));

  const now = DateTime.now().setZone(config.clinicTimezone);
  const isToday = DateTime.fromISO(dateStr, { zone: config.clinicTimezone }).hasSame(now, "day");

  const free = allSlots.filter((slot) => {
    if (bookedTimes.has(slot)) return false;
    if (isToday) {
      const [h, m] = slot.split(":").map(Number);
      const slotDt = now.set({ hour: h, minute: m, second: 0, millisecond: 0 });
      if (slotDt <= now) return false;
    }
    return true;
  });

  return { workDay: true, slots: free };
}

module.exports = { getAvailableSlots, isWorkDay };
