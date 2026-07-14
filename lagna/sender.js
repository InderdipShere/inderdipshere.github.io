const SENDER_API_URL = "https://script.google.com/macros/s/AKfycbzFTHa53ENMn0udXLJ1O7IqqgkxJ4cTEHNZFm8wkpu91gHT-s3Ud7uBzqfCW4qd_gPb/exec";
const SENDER_STORAGE_KEY = "lagna-invitation-sender";
const IS_LOCAL_PREVIEW = ["127.0.0.1", "localhost"].includes(window.location.hostname)
  && new URLSearchParams(window.location.search).has("preview");

const senderState = {
  pin: "",
  side: "Groom",
  actor: "Inderdip",
  guests: [],
  filter: "active",
  query: "",
  busy: new Set()
};

function getActorForSide(side) {
  return side === "Bride" ? "Deepali" : "Inderdip";
}

function normalizeSearch(value) {
  return String(value || "").trim().toLowerCase();
}

function statusClass(status) {
  return String(status || "Pending").toLowerCase().replace(/\s+/g, "-");
}

function buildMessage(guest) {
  const greetingName = guest.contactPerson || `${guest.familyName} Family`;
  const coupleLine = senderState.actor === "Inderdip" ? "Deepali and I" : "Inderdip and I";
  return [
    `Hi ${greetingName},`,
    "",
    `${senderState.actor} here 😊`,
    "",
    `We are delighted to share our wedding invitation with you. Please watch our invitation video, and then open the personalized invitation link below:`,
    "",
    guest.invitationUrl,
    "",
    `You can view the complete invitation and RSVP using the same link. ${coupleLine} would love to celebrate with you and receive your blessings. ❤️`,
    "",
    "Deepali & Inderdip"
  ].join("\n");
}

function buildWhatsAppUrl(number, message) {
  const base = `https://wa.me/${encodeURIComponent(number)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

function loadSavedSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(SENDER_STORAGE_KEY) || "null");
    if (!saved) return;
    if (saved.side === "Groom" || saved.side === "Bride") senderState.side = saved.side;
    if (/^\d{6,12}$/.test(String(saved.pin || ""))) senderState.pin = String(saved.pin);
  } catch (error) {
    localStorage.removeItem(SENDER_STORAGE_KEY);
  }
  senderState.actor = getActorForSide(senderState.side);
}

function saveSession() {
  localStorage.setItem(SENDER_STORAGE_KEY, JSON.stringify({ pin: senderState.pin, side: senderState.side }));
}

function clearSession() {
  localStorage.removeItem(SENDER_STORAGE_KEY);
  senderState.pin = "";
  senderState.guests = [];
  document.getElementById("senderApp").hidden = true;
  document.getElementById("loginPanel").hidden = false;
  document.getElementById("senderPin").value = "";
  document.getElementById("loginStatus").textContent = "";
}

async function loadGuests({ showLoginError = false } = {}) {
  const params = new URLSearchParams({
    sender: "list",
    pin: senderState.pin,
    side: senderState.side,
    _: String(Date.now())
  });
  const status = document.getElementById(showLoginError ? "loginStatus" : "appStatus");
  if (status) status.textContent = "Loading the guest list…";

  try {
    const response = await fetch(`${SENDER_API_URL}?${params.toString()}`, { cache: "no-store" });
    const payload = await response.json();
    if (!payload.success) throw new Error(payload.error || "Could not open the sender");

    senderState.guests = Array.isArray(payload.guests) ? payload.guests : [];
    senderState.actor = getActorForSide(senderState.side);
    saveSession();
    showSenderApp(payload.timestamp);
    renderSender();
  } catch (error) {
    if (status) status.textContent = error.message === "Invalid sender PIN"
      ? "That PIN is not valid. Please try again."
      : "The guest list could not be loaded. Check the connection and try again.";
    if (!showLoginError) console.error("Invitation sender load failed", error);
  }
}

function showSenderApp(timestamp) {
  document.getElementById("loginPanel").hidden = true;
  document.getElementById("senderApp").hidden = false;
  document.getElementById("sessionLabel").textContent = `${senderState.actor} · ${senderState.side}-side guests`;
  document.getElementById("lastUpdated").textContent = timestamp
    ? `Updated ${new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "";
  document.getElementById("appStatus").textContent = "";
}

function updateCounts() {
  const counts = senderState.guests.reduce((result, guest) => {
    const key = guest.sendStatus || "Pending";
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
  document.getElementById("pendingCount").textContent = counts.Pending || 0;
  document.getElementById("progressCount").textContent = counts["In Progress"] || 0;
  document.getElementById("sentCount").textContent = counts.Sent || 0;
  document.getElementById("issueCount").textContent = counts.Issue || 0;
}

function getVisibleGuests() {
  return senderState.guests.filter(guest => {
    const matchesQuery = !senderState.query || [guest.familyId, guest.familyName, guest.contactPerson, guest.category, guest.phoneEnding]
      .some(value => normalizeSearch(value).includes(senderState.query));
    if (!matchesQuery) return false;
    if (senderState.filter === "all") return true;
    if (senderState.filter === "active") return guest.sendStatus === "Pending" || guest.sendStatus === "In Progress";
    return guest.sendStatus === senderState.filter;
  });
}

function renderSender() {
  updateCounts();
  const list = document.getElementById("guestList");
  const visibleGuests = getVisibleGuests();
  list.replaceChildren();

  if (!visibleGuests.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = senderState.query ? "No guest matches this search." : "No invitations in this view.";
    list.appendChild(empty);
    return;
  }

  visibleGuests.forEach(guest => list.appendChild(createGuestCard(guest)));
}

function createGuestCard(guest) {
  const template = document.getElementById("guestCardTemplate");
  const card = template.content.firstElementChild.cloneNode(true);
  const message = buildMessage(guest);
  const hasPhone = /^\d{10,15}$/.test(guest.whatsappNumber || "");
  const videoDone = guest.videoSent === "Yes";
  const linkDone = guest.linkSent === "Yes";
  const isBusy = senderState.busy.has(guest.inviteToken);

  card.dataset.invite = guest.inviteToken;
  card.querySelector(".family-id").textContent = [guest.familyId, guest.category].filter(Boolean).join(" · ");
  card.querySelector(".family-name").textContent = `${guest.familyName || "Guest"} Family`;
  card.querySelector(".contact-line").textContent = [guest.contactPerson, guest.phoneEnding ? `WhatsApp ending ${guest.phoneEnding}` : "No WhatsApp number"].filter(Boolean).join(" · ");

  const badge = card.querySelector(".status-badge");
  badge.textContent = guest.sendStatus || "Pending";
  badge.className = `status-badge ${statusClass(guest.sendStatus)}`;

  const videoStep = card.querySelector(".video-step");
  const linkStep = card.querySelector(".link-step");
  videoStep.classList.toggle("done", videoDone);
  linkStep.classList.toggle("done", linkDone);

  const videoButton = card.querySelector(".video-button");
  videoButton.href = hasPhone ? buildWhatsAppUrl(guest.whatsappNumber) : "#";
  videoButton.setAttribute("aria-disabled", String(!hasPhone));
  if (!hasPhone) videoButton.addEventListener("click", event => event.preventDefault());
  videoButton.addEventListener("click", () => claimGuest(guest));

  const messageButton = card.querySelector(".message-button");
  messageButton.href = hasPhone ? buildWhatsAppUrl(guest.whatsappNumber, message) : "#";
  messageButton.setAttribute("aria-disabled", String(!hasPhone));
  if (!hasPhone) messageButton.addEventListener("click", event => event.preventDefault());
  messageButton.addEventListener("click", () => claimGuest(guest));

  card.querySelector(".message-preview pre").textContent = message;
  card.querySelector(".notes-field textarea").value = guest.notes || "";

  const confirmVideo = card.querySelector(".confirm-video");
  confirmVideo.textContent = videoDone ? "✓ Video marked as sent" : "I sent the video";
  confirmVideo.disabled = videoDone || isBusy;
  confirmVideo.addEventListener("click", () => saveProgress(guest, card, { videoSent: "Yes" }));

  const confirmLink = card.querySelector(".confirm-link");
  confirmLink.textContent = linkDone ? "✓ Message marked as sent" : "I sent the message";
  confirmLink.disabled = linkDone || isBusy;
  confirmLink.addEventListener("click", () => saveProgress(guest, card, { linkSent: "Yes" }));

  const copyButton = card.querySelector(".copy-button");
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCardFeedback(card, "Message copied.");
    } catch (error) {
      setCardFeedback(card, "Could not copy automatically. Open the preview and copy it manually.");
    }
  });

  const completeButton = card.querySelector(".complete-button");
  completeButton.disabled = !videoDone || !linkDone || guest.sendStatus === "Sent" || isBusy;
  completeButton.textContent = guest.sendStatus === "Sent" ? "✓ Invitation complete" : "Mark invitation complete";
  completeButton.addEventListener("click", () => saveProgress(guest, card, { status: "Sent" }));

  const issueButton = card.querySelector(".issue-button");
  issueButton.disabled = isBusy;
  issueButton.addEventListener("click", () => saveProgress(guest, card, { status: "Issue" }));
  return card;
}

function setCardFeedback(card, message) {
  const feedback = card.querySelector(".card-feedback");
  if (feedback) feedback.textContent = message;
}

function claimGuest(guest) {
  if (guest.sendStatus !== "Pending") return;
  postSenderUpdate({
    guest,
    status: "In Progress",
    videoSent: guest.videoSent,
    linkSent: guest.linkSent,
    notes: guest.notes || ""
  });
  guest.sendStatus = "In Progress";
  updateCounts();
}

async function saveProgress(guest, card, changes) {
  if (senderState.busy.has(guest.inviteToken)) return;
  const notes = card.querySelector(".notes-field textarea").value.trim();
  const next = {
    status: changes.status || (guest.sendStatus === "Pending" ? "In Progress" : guest.sendStatus),
    videoSent: changes.videoSent || guest.videoSent || "No",
    linkSent: changes.linkSent || guest.linkSent || "No",
    notes
  };

  if (next.status === "Sent" && (next.videoSent !== "Yes" || next.linkSent !== "Yes")) {
    setCardFeedback(card, "Confirm both the video and the message before completing this invitation.");
    return;
  }

  if (IS_LOCAL_PREVIEW) {
    guest.sendStatus = next.status;
    guest.videoSent = next.videoSent;
    guest.linkSent = next.linkSent;
    guest.notes = next.notes;
    guest.sentBy = senderState.actor;
    renderSender();
    return;
  }

  senderState.busy.add(guest.inviteToken);
  setCardFeedback(card, "Saving to the guest sheet…");
  renderSender();

  try {
    await postSenderUpdate({ guest, ...next });
    guest.sendStatus = next.status;
    guest.videoSent = next.videoSent;
    guest.linkSent = next.linkSent;
    guest.notes = next.notes;
    guest.sentBy = senderState.actor;
    await new Promise(resolve => window.setTimeout(resolve, 1000));
    await loadGuests();
  } catch (error) {
    console.error("Invitation sender save failed", error);
    document.getElementById("appStatus").textContent = "The update may not have saved. Refresh the list before continuing.";
  } finally {
    senderState.busy.delete(guest.inviteToken);
    renderSender();
  }
}

async function postSenderUpdate({ guest, status, videoSent, linkSent, notes }) {
  await fetch(SENDER_API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "senderStatus",
      pin: senderState.pin,
      actor: senderState.actor,
      invite: guest.inviteToken,
      status,
      videoSent,
      linkSent,
      notes
    })
  });
}

function bindSenderEvents() {
  document.getElementById("loginForm").addEventListener("submit", event => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    senderState.side = String(formData.get("side") || "Groom");
    senderState.actor = getActorForSide(senderState.side);
    senderState.pin = String(formData.get("pin") || "").trim();
    loadGuests({ showLoginError: true });
  });

  document.getElementById("switchSideButton").addEventListener("click", clearSession);
  document.getElementById("guestSearch").addEventListener("input", event => {
    senderState.query = normalizeSearch(event.target.value);
    renderSender();
  });

  document.getElementById("statusFilters").addEventListener("click", event => {
    const button = event.target.closest("button[data-filter]");
    if (!button) return;
    senderState.filter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item === button));
    renderSender();
  });
}

function loadLocalPreview() {
  senderState.side = "Groom";
  senderState.actor = "Inderdip";
  senderState.guests = [{
    familyId: "F000",
    familyName: "Sample",
    contactPerson: "Test Contact",
    side: "Groom",
    category: "Family",
    whatsappNumber: "919999999999",
    phoneEnding: "9999",
    inviteToken: "INV-preview-only",
    invitationUrl: "https://inderdipshere.github.io/lagna/?invite=INV-preview-only",
    sendStatus: "In Progress",
    videoSent: "No",
    linkSent: "No",
    sentBy: "",
    sentAt: "",
    notes: ""
  }];
  showSenderApp(new Date().toISOString());
  renderSender();
}

document.addEventListener("DOMContentLoaded", () => {
  loadSavedSession();
  bindSenderEvents();
  if (IS_LOCAL_PREVIEW) {
    loadLocalPreview();
    return;
  }
  document.getElementById("senderPin").value = senderState.pin;
  const selectedSide = document.querySelector(`input[name="side"][value="${senderState.side}"]`);
  if (selectedSide) selectedSide.checked = true;
  if (senderState.pin) loadGuests({ showLoginError: true });
});
