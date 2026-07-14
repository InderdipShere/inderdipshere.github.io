const SHEET_NAME = "Guest Master List";
const BLESSINGS_SHEET_NAME = "Blessings";
const SENDER_PIN_PROPERTY = "INVITATION_SENDER_PIN";
const CHECKIN_PIN_PROPERTY = "WEDDING_CHECKIN_PIN";
const INVITATION_SITE_URL = "https://inderdipshere.github.io/lagna/";
const SENDER_HEADERS = [
  "Invitation Send Status",
  "Video Sent",
  "Link Sent",
  "Invitation Sent By",
  "Invitation Sent At",
  "Invitation Send Notes"
];
const REQUEST_HEADERS = [
  "Invitation Request Status",
  "Request Submitted At",
  "Request Notes",
  "Invitation Delivery Type"
];
const CHECKIN_HEADERS = ["Checked In At", "Checked In Adults", "Checked In Children", "Checked In Total", "Check-in Notes"];

function doGet(e) {
  const health = String(e.parameter.health || "").trim();
  const inviteToken = String(e.parameter.invite || "").trim();
  const checkinToken = String(e.parameter.checkin || "").trim();
  const securityAction = String(e.parameter.security || "").trim();
  const senderAction = String(e.parameter.sender || "").trim();
  const sheet = getGuestSheet();
  const records = readRecords(sheet);

  if (health) {
    return jsonOutput({
      success: true,
      version: "lagna-rsvp-v2",
      sheetName: SHEET_NAME,
      guestCount: records.length,
      timestamp: new Date().toISOString()
    });
  }

  if (senderAction) {
    return getSenderGuests(e.parameter);
  }

  if (securityAction === "lookup") {
    if (!validateCheckinPin(e.parameter.pin)) {
      return jsonOutput({ success: false, error: "Invalid check-in PIN" });
    }
    const guest = records.find(row => String(row["Check-in Token"]).trim() === checkinToken);
    return jsonOutput({ success: !!guest, guest: guest ? toPublicGuest(guest) : null });
  }

  if (inviteToken) {
    const guest = records.find(row => String(row["Invite Token"]).trim() === inviteToken);
    return jsonOutput({
      success: !!guest,
      guest: guest ? toPublicGuest(guest) : null
    });
  }

  return jsonOutput({
    success: true,
    message: "Use a private invitation token to load invitation details."
  });
}

function toPublicGuest(record) {
  const allowedFields = [
    "Family ID",
    "Family Name",
    "Side",
    "Category",
    "Contact Person",
    "Adults",
    "Children",
    "Total",
    "Day 1",
    "Day 2",
    "RSVP",
    "QR Generated",
    "Invite Token",
    "Check-in Token",
    "Invitation PDF link",
    "Special Request",
    "Checked In"
  ];
  const guest = {};
  allowedFields.forEach(field => {
    if (Object.prototype.hasOwnProperty.call(record, field)) guest[field] = record[field];
  });
  return guest;
}

function doPost(e) {
  const body = parseBody(e);

  if (body.action === "rsvp") {
    return updateRsvp(body);
  }

  if (body.action === "checkin") {
    return markCheckedIn(body);
  }

  if (body.action === "blessing") {
    return saveBlessing(body);
  }

  if (body.action === "senderStatus") {
    return updateSenderStatus(body);
  }

  if (body.action === "requestInvite") {
    return createInvitationRequest(body);
  }

  return jsonOutput({
    success: false,
    error: "Unknown action"
  });
}

function createInvitationRequest(body) {
  const name = String(body.name || "").trim().substring(0, 120);
  const familyName = String(body.familyName || "").trim().substring(0, 120);
  const phone = normalizeWhatsAppNumber(body.phone);
  const side = normalizeSide(body.side);
  if (!name || !familyName || !phone || !side) {
    return jsonOutput({ success: false, error: "Please provide your name, family name, WhatsApp number and invited side." });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getGuestSheet();
    ensureWorkflowColumns(sheet);
    const table = readTable(sheet);
    const existing = table.records.find(record => normalizeWhatsAppNumber(record["Phone"]) === phone
      && ["Pending Approval", "Approved"].indexOf(String(record["Invitation Request Status"] || "").trim()) !== -1);
    if (existing) {
      return jsonOutput({ success: true, alreadyRequested: true, message: "Your request is already waiting for approval. You will receive your personal invitation link on WhatsApp once it is ready." });
    }

    const record = {};
    record["Family ID"] = "REQ-" + Utilities.getUuid().replace(/-/g, "").substring(0, 10).toUpperCase();
    record["Family Name"] = familyName;
    record["Side"] = side;
    record["Category"] = "Website Request";
    record["Contact Person"] = name;
    record["Phone"] = phone;
    record["Adults"] = 0;
    record["Children"] = 0;
    record["Total"] = 0;
    record["RSVP"] = "Pending";
    record["QR Generated"] = "No";
    record["Special Request"] = "Website invitation request — awaiting approval";
    record["Invitation Request Status"] = "Pending Approval";
    record["Request Submitted At"] = new Date();
    record["Request Notes"] = "Submitted from general invitation page";
    record["Invitation Delivery Type"] = "Personal Link Ready";
    record["Invitation Send Status"] = "Pending";
    record["Video Sent"] = "No";
    record["Link Sent"] = "No";
    sheet.appendRow(table.headers.map(header => record[header] === undefined ? "" : record[header]));
    return jsonOutput({ success: true, message: "Thank you. Your request is waiting for approval. You will receive your personalized invitation link on WhatsApp once it is ready." });
  } finally {
    lock.releaseLock();
  }
}

function getSenderGuests(parameters) {
  const pin = String(parameters.pin || "").trim();
  const side = normalizeSide(parameters.side);

  if (!isValidSenderPin(pin)) {
    return jsonOutput({ success: false, error: "Invalid sender PIN" });
  }

  if (!side) {
    return jsonOutput({ success: false, error: "Choose Groom or Bride side" });
  }

  const sheet = getGuestSheet();
  ensureSenderColumns(sheet);
  const records = readRecords(sheet)
    .filter(record => normalizeSide(record["Side"]) === side)
    .filter(record => String(record["Invite Token"] || "").trim())
    .map(toSenderGuest);

  return jsonOutput({
    success: true,
    side,
    guests: records,
    invitationSiteUrl: INVITATION_SITE_URL,
    timestamp: new Date().toISOString()
  });
}

function updateSenderStatus(body) {
  const pin = String(body.pin || "").trim();
  const inviteToken = String(body.invite || "").trim();
  const actor = normalizeSenderActor(body.actor);
  const status = normalizeSenderStatus(body.status);
  const videoSent = normalizeYesNo(body.videoSent);
  const linkSent = normalizeYesNo(body.linkSent);
  const notes = String(body.notes || "").trim().substring(0, 500);

  if (!isValidSenderPin(pin)) {
    return jsonOutput({ success: false, error: "Invalid sender PIN" });
  }

  if (!inviteToken || !actor || !status) {
    return jsonOutput({ success: false, error: "Missing or invalid sender update" });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const sheet = getGuestSheet();
    ensureSenderColumns(sheet);
    const table = readTable(sheet);
    const rowIndex = table.records.findIndex(record => String(record["Invite Token"] || "").trim() === inviteToken);

    if (rowIndex === -1) {
      return jsonOutput({ success: false, error: "Invite token not found" });
    }

    const record = table.records[rowIndex];
    const side = normalizeSide(record["Side"]);
    if ((side === "Groom" && actor !== "Inderdip") || (side === "Bride" && actor !== "Deepali")) {
      return jsonOutput({ success: false, error: "Sender does not match guest side" });
    }

    const rowNumber = rowIndex + 2;
    setCell(sheet, table.headers, rowNumber, "Invitation Send Status", status);
    setCell(sheet, table.headers, rowNumber, "Video Sent", videoSent);
    setCell(sheet, table.headers, rowNumber, "Link Sent", linkSent);
    setCell(sheet, table.headers, rowNumber, "Invitation Sent By", actor);
    setCell(sheet, table.headers, rowNumber, "Invitation Send Notes", notes);

    if (status === "Sent" && videoSent === "Yes" && linkSent === "Yes") {
      setCell(sheet, table.headers, rowNumber, "Invitation Sent At", new Date());
    }

    SpreadsheetApp.flush();
    return jsonOutput({ success: true, guest: toSenderGuest(readRecords(sheet)[rowIndex]) });
  } finally {
    lock.releaseLock();
  }
}

function toSenderGuest(record) {
  const phone = normalizeWhatsAppNumber(record["Phone"]);
  const inviteToken = String(record["Invite Token"] || "").trim();
  return {
    familyId: String(record["Family ID"] || "").trim(),
    familyName: String(record["Family Name"] || "").trim(),
    contactPerson: String(record["Contact Person"] || "").trim(),
    side: normalizeSide(record["Side"]),
    category: String(record["Category"] || "").trim(),
    whatsappNumber: phone,
    phoneEnding: phone ? phone.slice(-4) : "",
    inviteToken,
    invitationUrl: INVITATION_SITE_URL + "?invite=" + encodeURIComponent(inviteToken),
    sendStatus: normalizeSenderStatus(record["Invitation Send Status"]) || "Pending",
    videoSent: normalizeYesNo(record["Video Sent"]),
    linkSent: normalizeYesNo(record["Link Sent"]),
    sentBy: String(record["Invitation Sent By"] || "").trim(),
    sentAt: formatSheetDate(record["Invitation Sent At"]),
    notes: String(record["Invitation Send Notes"] || "").trim(),
    deliveryType: String(record["Invitation Delivery Type"] || "Initial Invitation").trim()
  };
}

function ensureSenderColumns(sheet) {
  ensureWorkflowColumns(sheet);
}

function ensureWorkflowColumns(sheet) {
  const table = readTable(sheet);
  const missingHeaders = SENDER_HEADERS.concat(REQUEST_HEADERS, CHECKIN_HEADERS).filter(header => table.headers.indexOf(header) === -1);
  if (!missingHeaders.length) return;

  const startColumn = sheet.getLastColumn() + 1;
  sheet.getRange(1, startColumn, 1, missingHeaders.length).setValues([missingHeaders]);
  sheet.getRange(1, startColumn, 1, missingHeaders.length)
    .setFontWeight("bold")
    .setBackground("#4b1834")
    .setFontColor("#ffffff");

  const rowCount = Math.max(1, sheet.getMaxRows() - 1);
  missingHeaders.forEach((header, index) => {
    if (["Invitation Send Status", "Video Sent", "Link Sent", "Invitation Request Status"].indexOf(header) === -1) return;
    const values = header === "Invitation Send Status"
      ? ["Pending", "In Progress", "Sent", "Issue"]
      : header === "Invitation Request Status"
        ? ["Pending Approval", "Approved", "Rejected"]
      : ["No", "Yes"];
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(values, true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(2, startColumn + index, rowCount, 1).setDataValidation(rule);
  });
}

function onEdit(e) {
  const range = e && e.range;
  if (!range || range.getSheet().getName() !== SHEET_NAME || range.getRow() < 2) return;
  const sheet = range.getSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const statusColumn = headers.indexOf("Invitation Request Status") + 1;
  if (!statusColumn || range.getColumn() !== statusColumn || String(e.value || "").trim() !== "Approved") return;
  const row = range.getRow();
  const inviteColumn = headers.indexOf("Invite Token") + 1;
  if (!sheet.getRange(row, inviteColumn).getValue()) {
    const token = makeUniqueToken("INV", getExistingTokenSet(readTable(sheet).records, "Invite Token"));
    sheet.getRange(row, inviteColumn).setValue(token);
    setCell(sheet, headers, row, "Invitation Send Status", "Pending");
    setCell(sheet, headers, row, "Video Sent", "No");
    setCell(sheet, headers, row, "Link Sent", "No");
    setCell(sheet, headers, row, "Invitation Delivery Type", "Personal Link Ready");
    setCell(sheet, headers, row, "Request Notes", "Approved — personal invitation ready for WhatsApp sending");
  }
}

function setupInvitationSender(pin) {
  let cleanPin = String(pin || "").trim();
  if (!cleanPin) {
    cleanPin = String(Math.floor(10000000 + Math.random() * 90000000));
  }
  if (!/^\d{6,12}$/.test(cleanPin)) {
    throw new Error("Choose a numeric PIN containing 6 to 12 digits.");
  }
  PropertiesService.getScriptProperties().setProperty(SENDER_PIN_PROPERTY, cleanPin);
  ensureSenderColumns(getGuestSheet());
  Logger.log("Invitation Sender PIN: " + cleanPin);
  return "Invitation sender is ready. Open the execution log to copy the PIN.";
}

function isValidSenderPin(pin) {
  const savedPin = PropertiesService.getScriptProperties().getProperty(SENDER_PIN_PROPERTY);
  return !!savedPin && String(pin) === savedPin;
}

function normalizeSide(value) {
  const side = String(value || "").trim().toLowerCase();
  if (side === "groom") return "Groom";
  if (side === "bride") return "Bride";
  return "";
}

function normalizeSenderActor(value) {
  const actor = String(value || "").trim().toLowerCase();
  if (actor === "inderdip") return "Inderdip";
  if (actor === "deepali") return "Deepali";
  return "";
}

function normalizeSenderStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  if (status === "pending") return "Pending";
  if (status === "in progress") return "In Progress";
  if (status === "sent") return "Sent";
  if (status === "issue") return "Issue";
  return "";
}

function normalizeYesNo(value) {
  return String(value || "").trim().toLowerCase() === "yes" ? "Yes" : "No";
}

function normalizeWhatsAppNumber(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) digits = "91" + digits;
  if (digits.length === 11 && digits.charAt(0) === "0") digits = "91" + digits.substring(1);
  return digits;
}

function formatSheetDate(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return value.toISOString();
  }
  return String(value);
}

function saveBlessing(body) {
  const inviteToken = String(body.invite || body.inviteToken || "").trim();
  const familyName = String(body.familyName || "").trim();
  const name = String(body.name || "").trim();
  const message = String(body.message || "").trim();
  const consent = String(body.consent || "").trim() === "Yes" ? "Yes" : "No";

  if (!message) {
    return jsonOutput({ success: false, error: "Missing blessing message" });
  }

  if (consent !== "Yes") {
    return jsonOutput({ success: false, error: "Consent is required" });
  }

  const sheet = getOrCreateBlessingsSheet();
  sheet.appendRow([
    new Date(),
    inviteToken,
    familyName,
    name,
    message.substring(0, 900),
    consent,
    "No",
    "No"
  ]);

  return jsonOutput({ success: true });
}

function updateRsvp(body) {
  const inviteToken = String(body.invite || "").trim();
  const familyName = String(body.familyName || "").trim();
  const rsvp = normalizeRsvp(body.rsvp);
  const adults = Math.max(0, Number(body.adults || 0));
  const children = Math.max(0, Number(body.children || 0));
  const total = adults + children;
  const specialRequest = String(body.specialRequest || "Nil").trim() || "Nil";

  if (!inviteToken) {
    return jsonOutput({ success: false, error: "Missing invite token" });
  }

  if (!["Pending", "Done", "Issue"].includes(rsvp)) {
    return jsonOutput({ success: false, error: "Invalid RSVP value" });
  }

  const sheet = getGuestSheet();
  const table = readTable(sheet);
  const rowIndex = table.records.findIndex(row => String(row["Invite Token"]).trim() === inviteToken);

  if (rowIndex === -1) {
    return jsonOutput({ success: false, error: "Invite token not found" });
  }

  const rowNumber = rowIndex + 2;
  if (familyName) {
    setCell(sheet, table.headers, rowNumber, "Family Name", familyName);
  }
  setCell(sheet, table.headers, rowNumber, "RSVP", rsvp);
  setCell(sheet, table.headers, rowNumber, "Adults", rsvp === "Done" ? adults : 0);
  setCell(sheet, table.headers, rowNumber, "Children", rsvp === "Done" ? children : 0);
  setCell(sheet, table.headers, rowNumber, "Total", rsvp === "Done" ? total : 0);
  setCell(sheet, table.headers, rowNumber, "Special Request", specialRequest);

  let checkinToken = table.records[rowIndex]["Check-in Token"];
  if (rsvp === "Done") {
    if (!checkinToken) {
      checkinToken = makeUniqueToken("CHK", getExistingTokenSet(table.records, "Check-in Token"));
      setCell(sheet, table.headers, rowNumber, "Check-in Token", checkinToken);
    }
    setCell(sheet, table.headers, rowNumber, "QR Generated", "Yes");
  } else {
    setCell(sheet, table.headers, rowNumber, "QR Generated", "No");
  }

  return jsonOutput({
    success: true,
    guest: toPublicGuest(readRecords(sheet)[rowIndex])
  });
}

function markCheckedIn(body) {
  const checkinToken = String(body.checkin || "").trim();
  const adults = parseCheckinCount(body.adults);
  const children = parseCheckinCount(body.children);
  const notes = String(body.notes || "").trim().substring(0, 500);

  if (!validateCheckinPin(body.pin)) {
    return jsonOutput({ success: false, error: "Invalid check-in PIN" });
  }

  if (!checkinToken) {
    return jsonOutput({ success: false, error: "Missing check-in token" });
  }

  const sheet = getGuestSheet();
  const table = readTable(sheet);
  const rowIndex = table.records.findIndex(row => String(row["Check-in Token"]).trim() === checkinToken);

  if (rowIndex === -1) {
    return jsonOutput({ success: false, error: "Check-in token not found" });
  }

  const rowNumber = rowIndex + 2;
  const wasCheckedIn = String(table.records[rowIndex]["Checked In"] || "").trim() === "Yes";
  const expectedAdults = parseCheckinCount(table.records[rowIndex]["Adults"]);
  const expectedChildren = parseCheckinCount(table.records[rowIndex]["Children"]);
  if ((adults !== expectedAdults || children !== expectedChildren) && !notes) {
    return jsonOutput({ success: false, error: "Add a note when the actual guest count differs from the RSVP." });
  }
  setCell(sheet, table.headers, rowNumber, "Checked In", "Yes");
  if (!wasCheckedIn && table.headers.indexOf("Checked In At") !== -1) {
    setCell(sheet, table.headers, rowNumber, "Checked In At", new Date());
  }
  setCell(sheet, table.headers, rowNumber, "Checked In Adults", adults);
  setCell(sheet, table.headers, rowNumber, "Checked In Children", children);
  setCell(sheet, table.headers, rowNumber, "Checked In Total", adults + children);
  if (notes) setCell(sheet, table.headers, rowNumber, "Check-in Notes", notes);

  return jsonOutput({
    success: true,
    guest: toPublicGuest(readRecords(sheet)[rowIndex]),
    alreadyCheckedIn: wasCheckedIn
  });
}

function parseCheckinCount(value) {
  const count = Number(value);
  return isFinite(count) && count >= 0 ? Math.floor(count) : 0;
}

function setupCheckinAccess() {
  const properties = PropertiesService.getScriptProperties();
  let pin = String(properties.getProperty(CHECKIN_PIN_PROPERTY) || "").trim();
  if (!/^\d{6,12}$/.test(pin)) {
    pin = String(Math.floor(100000 + Math.random() * 900000));
    properties.setProperty(CHECKIN_PIN_PROPERTY, pin);
  }
  ensureWorkflowColumns(getGuestSheet());
  Logger.log("Wedding check-in PIN: " + pin);
  return pin;
}

function validateCheckinPin(pin) {
  const expected = String(PropertiesService.getScriptProperties().getProperty(CHECKIN_PIN_PROPERTY) || "").trim();
  return /^\d{6,12}$/.test(expected) && String(pin || "").trim() === expected;
}

function generateMissingTokens() {
  const sheet = getGuestSheet();
  const table = readTable(sheet);
  const usedInviteTokens = getExistingTokenSet(table.records, "Invite Token");
  const usedCheckinTokens = getExistingTokenSet(table.records, "Check-in Token");

  table.records.forEach((record, index) => {
    const rowNumber = index + 2;

    if (record["Family ID"] && !record["Invite Token"]) {
      setCell(sheet, table.headers, rowNumber, "Invite Token", makeUniqueToken("INV", usedInviteTokens));
    }

    if (String(record["RSVP"]).trim() === "Done" && !record["Check-in Token"]) {
      setCell(sheet, table.headers, rowNumber, "Check-in Token", makeUniqueToken("CHK", usedCheckinTokens));
      setCell(sheet, table.headers, rowNumber, "QR Generated", "Yes");
    }
  });
}

function auditInviteTokens() {
  const table = readTable(getGuestSheet());
  const seen = {};
  const duplicates = [];
  let missing = 0;

  table.records.forEach(record => {
    const familyId = String(record["Family ID"] || "").trim();
    const token = String(record["Invite Token"] || "").trim();
    if (!familyId) return;
    if (!token) {
      missing++;
      return;
    }
    if (seen[token]) {
      duplicates.push(token);
    }
    seen[token] = true;
  });

  Logger.log({
    totalFamilies: table.records.filter(record => String(record["Family ID"] || "").trim()).length,
    missingInviteTokens: missing,
    duplicateInviteTokens: duplicates
  });
}

function regenerateAllInviteTokensBeforeSending() {
  const sheet = getGuestSheet();
  const table = readTable(sheet);
  const usedInviteTokens = {};

  table.records.forEach((record, index) => {
    if (!record["Family ID"]) return;
    const rowNumber = index + 2;
    setCell(sheet, table.headers, rowNumber, "Invite Token", makeUniqueToken("INV", usedInviteTokens));
    setCell(sheet, table.headers, rowNumber, "Check-in Token", "");
    setCell(sheet, table.headers, rowNumber, "QR Generated", "No");
    setCell(sheet, table.headers, rowNumber, "RSVP", "Pending");
    setCell(sheet, table.headers, rowNumber, "Adults", 0);
    setCell(sheet, table.headers, rowNumber, "Children", 0);
    setCell(sheet, table.headers, rowNumber, "Total", 0);
    setCell(sheet, table.headers, rowNumber, "Invitation PDF link", "");
  });
}

function testDeploymentWrite() {
  const sheet = getGuestSheet();
  const table = readTable(sheet);
  const testColName = "Special Request";
  const firstDataRow = 2;
  const existingValue = table.records[0] ? table.records[0][testColName] : "";

  setCell(sheet, table.headers, firstDataRow, testColName, "Deployment test " + new Date().toISOString());
  SpreadsheetApp.flush();
  setCell(sheet, table.headers, firstDataRow, testColName, existingValue || "Nil");
}

function getGuestSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

function getOrCreateBlessingsSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(BLESSINGS_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(BLESSINGS_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Timestamp",
      "Invite Token",
      "Family Name",
      "Name",
      "Blessing Message",
      "Consent",
      "Approved",
      "Display on Website"
    ]);
  }

  return sheet;
}

function readTable(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(header => String(header).trim());
  const records = values.slice(1).map(row => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index];
    });
    return record;
  });

  return { headers, records };
}

function readRecords(sheet) {
  return readTable(sheet).records;
}

function setCell(sheet, headers, rowNumber, headerName, value) {
  const colIndex = headers.indexOf(headerName);
  if (colIndex === -1) {
    throw new Error("Missing column: " + headerName);
  }
  sheet.getRange(rowNumber, colIndex + 1).setValue(value);
}

function getExistingTokenSet(records, fieldName) {
  const used = {};
  records.forEach(record => {
    const token = String(record[fieldName] || "").trim();
    if (token) used[token] = true;
  });
  return used;
}

function parseBody(e) {
  if (e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (error) {
      return e.parameter || {};
    }
  }
  return e.parameter || {};
}

function normalizeRsvp(value) {
  const raw = String(value || "Pending").trim().toLowerCase();
  if (raw === "yes" || raw === "done" || raw === "confirmed") return "Done";
  if (raw === "no" || raw === "issue" || raw === "declined") return "Issue";
  return "Pending";
}

function makeToken(prefix) {
  return prefix + "-" + Utilities.getUuid().replace(/-/g, "").substring(0, 16);
}

function makeUniqueToken(prefix, usedTokens) {
  let token = makeToken(prefix);
  while (usedTokens[token]) {
    token = makeToken(prefix);
  }
  usedTokens[token] = true;
  return token;
}

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
