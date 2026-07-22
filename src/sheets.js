const { google } = require("googleapis");
const config = require("./config");

const SERVICES_RANGE = "Services!A2:D";
const BOOKINGS_SHEET = "Bookings";
const BOOKINGS_HEADER = [
  "timestamp",
  "chat_id",
  "patient_name",
  "phone",
  "service",
  "date",
  "time",
  "notes",
  "status",
  "admin_message_id",
];

let sheetsClient = null;

function getClient() {
  if (sheetsClient) return sheetsClient;
  const credentials = JSON.parse(config.googleServiceAccountJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

async function ensureBookingsHeader() {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${BOOKINGS_SHEET}!A1:J1`,
  });
  if (!res.data.values || res.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: `${BOOKINGS_SHEET}!A1:J1`,
      valueInputOption: "RAW",
      requestBody: { values: [BOOKINGS_HEADER] },
    });
  }
}

async function getServices() {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: SERVICES_RANGE,
  });
  const rows = res.data.values || [];
  return rows
    .filter((row) => row[0])
    .map((row) => ({
      name: row[0] || "",
      price: row[1] || "",
      durationMinutes: row[2] ? Number(row[2]) : config.slotMinutes,
      description: row[3] || "",
    }));
}

async function getAllBookings() {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${BOOKINGS_SHEET}!A2:J`,
  });
  const rows = res.data.values || [];
  return rows.map((row, idx) => ({
    rowNumber: idx + 2,
    timestamp: row[0] || "",
    chatId: row[1] || "",
    patientName: row[2] || "",
    phone: row[3] || "",
    service: row[4] || "",
    date: row[5] || "",
    time: row[6] || "",
    notes: row[7] || "",
    status: row[8] || "",
    adminMessageId: row[9] || "",
  }));
}

async function getBookingsForDate(date) {
  const all = await getAllBookings();
  return all.filter(
    (b) => b.date === date && b.status !== "rejected" && b.status !== "cancelled"
  );
}

async function appendBooking(booking) {
  await ensureBookingsHeader();
  const sheets = getClient();
  const values = [
    [
      new Date().toISOString(),
      String(booking.chatId),
      booking.patientName,
      booking.phone,
      booking.service,
      booking.date,
      booking.time,
      booking.notes || "",
      "pending",
      "",
    ],
  ];
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: config.spreadsheetId,
    range: `${BOOKINGS_SHEET}!A:J`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
  const updatedRange = res.data.updates.updatedRange;
  const match = updatedRange.match(/![A-Z]+(\d+):/);
  const rowNumber = match ? Number(match[1]) : null;
  return rowNumber;
}

async function updateBookingStatus(rowNumber, status) {
  const sheets = getClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range: `${BOOKINGS_SHEET}!I${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[status]] },
  });
}

async function setAdminMessageId(rowNumber, messageId) {
  const sheets = getClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range: `${BOOKINGS_SHEET}!J${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[String(messageId)]] },
  });
}

async function getBookingByRow(rowNumber) {
  const all = await getAllBookings();
  return all.find((b) => b.rowNumber === rowNumber) || null;
}

module.exports = {
  getServices,
  getBookingsForDate,
  appendBooking,
  updateBookingStatus,
  setAdminMessageId,
  getBookingByRow,
};
