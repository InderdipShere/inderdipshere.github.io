const SHEET_NAME = "Guest Master List";
const BLESSINGS_SHEET_NAME = "Blessings";

function doGet(e) {
  const health = String(e.parameter.health || "").trim();
  const inviteToken = String(e.parameter.invite || "").trim();
  const checkinToken = String(e.parameter.checkin || "").trim();
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

  if (inviteToken) {
    const guest = records.find(row => String(row["Invite Token"]).trim() === inviteToken);
    return jsonOutput({
      success: !!guest,
      guest: guest || null
    });
  }

  if (checkinToken) {
    const guest = records.find(row => String(row["Check-in Token"]).trim() === checkinToken);
    return jsonOutput({
      success: !!guest,
      guest: guest || null
    });
  }

  return jsonOutput({
    success: true,
    guests: records
  });
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

  return jsonOutput({
    success: false,
    error: "Unknown action"
  });
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
    guest: readRecords(sheet)[rowIndex]
  });
}

function markCheckedIn(body) {
  const checkinToken = String(body.checkin || "").trim();

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
  setCell(sheet, table.headers, rowNumber, "Checked In", "Yes");

  return jsonOutput({
    success: true,
    guest: readRecords(sheet)[rowIndex]
  });
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
