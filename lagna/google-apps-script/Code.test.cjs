const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "Code.gs"), "utf8");
const context = vm.createContext({ console });
vm.runInContext(source, context, { filename: "Code.gs" });

assert.equal(context.normalizeSide(" groom "), "Groom");
assert.equal(context.normalizeSide("BRIDE"), "Bride");
assert.equal(context.normalizeSide("unknown"), "");
assert.equal(context.normalizeWhatsAppNumber("98765 43210"), "919876543210");
assert.equal(context.normalizeWhatsAppNumber("+91 98765 43210"), "919876543210");
assert.equal(context.normalizeSenderStatus("in progress"), "In Progress");
assert.equal(context.normalizeYesNo("YES"), "Yes");

const sourceGuest = {
  "Family ID": "F000",
  "Family Name": "Sample",
  "Side": "Groom",
  "Category": "Family",
  "Contact Person": "Test Contact",
  "Phone": "+91 98765 43210",
  "Adults": 2,
  "Children": 0,
  "Total": 2,
  "RSVP": "Pending",
  "Invite Token": "INV-test",
  "Invitation Send Status": "In Progress",
  "Video Sent": "Yes",
  "Link Sent": "No",
  "Invitation Send Notes": "Private sender note"
};

const publicGuest = context.toPublicGuest(sourceGuest);
assert.equal(publicGuest["Family Name"], "Sample");
assert.equal(publicGuest["Phone"], undefined);
assert.equal(publicGuest["Invitation Send Notes"], undefined);

const senderGuest = context.toSenderGuest(sourceGuest);
assert.equal(senderGuest.whatsappNumber, "919876543210");
assert.equal(senderGuest.phoneEnding, "3210");
assert.equal(senderGuest.invitationUrl, "https://inderdipshere.github.io/lagna/?invite=INV-test");
assert.equal(senderGuest.videoSent, "Yes");
assert.equal(senderGuest.linkSent, "No");

console.log("Invitation sender Apps Script tests passed.");
