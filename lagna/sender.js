const SENDER_API_URL = "https://script.google.com/macros/s/AKfycbzFTHa53ENMn0udXLJ1O7IqqgkxJ4cTEHNZFm8wkpu91gHT-s3Ud7uBzqfCW4qd_gPb/exec";
const INVITATION_VIDEO_URL = "https://www.youtube.com/watch?v=Py2J0UfHAEI";
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
  messageTemplates: {},
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

function buildMessage(guest, templateName = "pranam") {
  const greetingName = guest.contactPerson || `${guest.familyName} Family`;
  const familyName = guest.familyName || "आपल्या";
  const senderName = senderState.actor === "Deepali" ? "दीपाली" : "इंदरदीप";
  const coupleNamesMarathi = "दीपाली व इंदरदीप";
  const coupleNamesEnglish = "Deepali & Inderdip";
  const link = guest.invitationUrl;
  const videoLink = INVITATION_VIDEO_URL;
  const englishFamilyName = guest.familyName ? `the ${guest.familyName} family` : "your family";
  const marathiFamilyGreeting = `${greetingName} जी आणि ${familyName} परिवारातील सर्व आदरणीय ज्येष्ठ व प्रियजनांनो`;
  const englishFamilyGreeting = `${greetingName} ji, respected elders and every member of ${englishFamilyName}`;
  const marathiFamilyNote = `हा स्नेहपूर्ण संदेश ${familyName} परिवारातील सर्व मान्यवर ज्येष्ठ, प्रियजन आणि प्रत्येक सदस्यासाठी आहे. 🌸`;
  const englishFamilyNote = `This heartfelt invitation is for the respected elders, loved ones and every member of ${englishFamilyName}. 🌸`;

  const messages = {
    ready: [
      `🙏 नमस्कार ${marathiFamilyGreeting}, सादर प्रणाम. 🌸`,
      "",
      `दीपाली व इंदरदीप यांच्या परिवाराकडून आनंदाची बातमी—${familyName} परिवारासाठी आपले वैयक्तिक विवाह निमंत्रण आता तयार आहे. 💐🪔`,
      "कृपया आमंत्रण व्हिडिओ पुन्हा एकदा पाहा आणि नंतर खालील वैयक्तिक दुव्यावरून आपले निमंत्रण उघडा, संपूर्ण माहिती पहा व PDF डाउनलोड करा:",
      "",
      link,
      "",
      "आपले शुभाशीर्वाद आम्हाला लाभोत, ही नम्र प्रार्थना. 🙏🌺",
      "",
      `🙏 Namaste ${englishFamilyGreeting}. Your personal wedding invitation for ${englishFamilyName} is now ready. 💐🪔`,
      "Please watch the invitation video once more, then open your personal link above to view all details and download your invitation PDF.",
      englishFamilyNote,
      "",
      "With love and folded hands,",
      "Deepali & Inderdip with family 🌸"
    ],
    pranam: [
      `🙏 नमस्कार ${marathiFamilyGreeting}, सादर प्रणाम. 🙏`,
      "",
      `${coupleNamesMarathi} व संपूर्ण परिवाराकडून आपणास व आपल्या परिवारास आमच्या शुभविवाह सोहळ्यास स्नेहपूर्वक आमंत्रण. 💐✨`,
      marathiFamilyNote,
      "आपले शुभाशीर्वाद व मंगलकामना आम्हाला लाभल्या तर आम्ही अत्यंत आनंदित होऊ. 🌸",
      "कृपया प्रथम आमचा आमंत्रण व्हिडिओ पाहा. त्यानंतर खालील आपल्या वैयक्तिक निमंत्रण दुव्यावरून संपूर्ण माहिती पाहा व RSVP करा:",
      "",
      link,
      "",
      "आपली प्रेमळ उपस्थिती व आशीर्वाद आम्हांस लाभोत, हीच नम्र प्रार्थना. 🙏🌺",
      "",
      `🌸🙏 Namaste ${englishFamilyGreeting}, warm pranam from ${coupleNamesEnglish} and our families. 🙏🌸`,
      "",
      "With folded hands, we lovingly invite you and your family to our wedding celebration. Your blessings and good wishes would mean the world to us. 💐✨",
      englishFamilyNote,
      "Please watch our invitation video first, then open your personal invitation link above for all details and RSVP. 🪔",
      "",
      "With love and respect,",
      "Deepali, Inderdip & family 🌺"
    ],
    blessings: [
      `🌺🙏 नमस्कार ${marathiFamilyGreeting}, ${senderName} कडून सादर प्रणाम. 🙏🌺`,
      "",
      "परमेश्वराच्या कृपेने आणि आपणा सर्वांच्या शुभाशीर्वादाने आमच्या जीवनातील हा मंगल दिवस साजरा होत आहे. 🪔✨",
      "आपण व आपल्या परिवाराने या आनंदोत्सवात सहभागी होऊन आम्हाला आशीर्वाद द्यावेत, ही विनम्र प्रार्थना. 💐",
      marathiFamilyNote,
      "कृपया आमचा विवाह-आमंत्रण व्हिडिओ पाहा आणि नंतर आपले वैयक्तिक निमंत्रण येथे उघडा:",
      "",
      link,
      "",
      "आपले प्रेम, प्रार्थना आणि शुभेच्छा आमच्यासाठी अनमोल आहेत. 🌸🙏",
      "",
      `🌸🙏 Namaste ${englishFamilyGreeting}. With God’s grace and the blessings of our elders, we are beginning this beautiful new chapter. 🪔✨`,
      "We humbly invite you and your family to bless our wedding celebration with your presence, prayers and good wishes. 💐",
      englishFamilyNote,
      "Please watch the invitation video, then open your personal link above for the complete details and RSVP.",
      "",
      "Sadar pranam,",
      "Deepali, Inderdip & family 🙏🌺"
    ],
    family: [
      `💐 नमस्कार ${marathiFamilyGreeting}! 🙏`,
      "",
      "आमच्या दोन्ही परिवारांसाठी हा आनंदाचा, प्रेमाचा आणि मंगल उत्सवाचा क्षण आहे. 🌸✨",
      `${coupleNamesMarathi} यांच्या शुभविवाहासाठी आपणास आणि आपल्या संपूर्ण परिवारास मनःपूर्वक आमंत्रण. 🪔`,
      marathiFamilyNote,
      "आपली उपस्थिती आणि आशीर्वाद या सोहळ्याला अधिक सुंदर करतील. 🙏",
      "कृपया आमंत्रण व्हिडिओ पाहा आणि आपले वैयक्तिक निमंत्रण येथे उघडा:",
      "",
      link,
      "",
      `🌸 Namaste ${englishFamilyGreeting}! 🙏`,
      `This is a joyful, loving celebration for both our families. We warmly invite you and your entire family to ${coupleNamesEnglish}'s wedding. 💐✨`,
      englishFamilyNote,
      "Your presence and blessings will make this celebration even more beautiful. Please watch the video and open your personal invitation link above for details and RSVP. 🪔",
      "",
      "With love,",
      "Deepali, Inderdip & family 🌺"
    ],
    sacred: [
      `🙏🌸 आदरणीय ${marathiFamilyGreeting}, सादर प्रणाम.`,
      "",
      "दोन हृदयांच्या नव्या प्रवासाचा हा पवित्र प्रारंभ आपल्या आशीर्वादाशिवाय पूर्ण होऊ शकत नाही. 🪔✨",
      "आमच्या विवाह सोहळ्यास आपण व आपल्या परिवाराने येऊन प्रेम, प्रार्थना आणि मंगलाशीर्वाद द्यावेत, ही नम्र विनंती. 💐",
      marathiFamilyNote,
      "कृपया विवाहाचा आमंत्रण व्हिडिओ पाहा. त्यानंतर संपूर्ण माहिती व RSVP साठी आपले वैयक्तिक निमंत्रण येथे उघडा:",
      "",
      link,
      "",
      "आपल्या आशीर्वादांची आम्ही मनापासून वाट पाहत आहोत. 🙏🌺",
      "",
      `🙏🌸 Respected ${englishFamilyGreeting}, warm pranam.`,
      "This sacred beginning of two hearts and two families would feel complete only with your prayers and blessings. 🪔✨",
      "We humbly invite you and your family to our wedding celebration. Please watch the invitation video, then open your personal link above for details and RSVP. 💐",
      englishFamilyNote,
      "",
      "With folded hands and love,",
      "Deepali, Inderdip & family 🙏"
    ],
    short: [
      `🙏 नमस्कार ${marathiFamilyGreeting}, सादर प्रणाम. 🌸`,
      "",
      `${coupleNamesMarathi} व परिवाराकडून आपणास व आपल्या परिवारास आमच्या शुभविवाहाचे मनःपूर्वक आमंत्रण. 💐`,
      marathiFamilyNote,
      "कृपया व्हिडिओ पाहा आणि संपूर्ण माहिती व RSVP साठी आपले वैयक्तिक निमंत्रण येथे उघडा:",
      "",
      link,
      "",
      "आपले शुभाशीर्वाद लाभोत. 🙏🪔",
      "",
      `🙏 Namaste ${englishFamilyGreeting}. Warm pranam from ${coupleNamesEnglish} and family. 🌸`,
      "We warmly invite you and your family to bless our wedding. Please watch the video and open your personal link above for details and RSVP. 💐✨",
      englishFamilyNote,
      "",
      "With love and folded hands, 🙏",
      "Deepali, Inderdip & family"
    ],
    plain: [
      `नमस्कार ${marathiFamilyGreeting},`,
      "",
      `${coupleNamesMarathi} यांच्या विवाह सोहळ्यास आपणास आणि आपल्या परिवारास मनापासून आमंत्रण.`,
      marathiFamilyNote,
      "आमचा आमंत्रण व्हिडिओ पाहा आणि खालील वैयक्तिक दुव्यावरून कार्यक्रमाची संपूर्ण माहिती पाहून RSVP करा:",
      "",
      link,
      "",
      "आपण या आनंदाच्या क्षणी सहभागी झालात तर आम्हाला खूप आनंद होईल.",
      "",
      `Hello ${englishFamilyGreeting},`,
      "",
      `We warmly invite you and your family to the wedding celebration of ${coupleNamesEnglish}.`,
      englishFamilyNote,
      "Please watch our invitation video, then open your personal invitation link below to view the full details and RSVP:",
      "",
      link,
      "",
      "It would make us very happy to have you with us for this special occasion.",
      "",
      "With love,",
      "Deepali, Inderdip & family"
    ]
  };

  const selectedMessage = (messages[templateName] || messages.pranam)
    .join("\n")
    .replace(/invitation video once more/gi, "invitation film")
    .replace(/personal link above/gi, "personal link below")
    .replace(/invitation link above/gi, "invitation link below");

  return [
    "🎬 विवाह-आमंत्रण चित्रपट | Wedding Invitation Film",
    videoLink,
    "",
    selectedMessage
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
  const selectedTemplate = senderState.messageTemplates[guest.inviteToken]
    || (guest.deliveryType === "Personal Link Ready" ? "ready" : "pranam");
  let message = buildMessage(guest, selectedTemplate);
  const hasPhone = /^\d{10,15}$/.test(guest.whatsappNumber || "");
  const linkDone = guest.linkSent === "Yes";
  const isBusy = senderState.busy.has(guest.inviteToken);

  card.dataset.invite = guest.inviteToken;
  card.querySelector(".family-id").textContent = [guest.familyId, guest.category].filter(Boolean).join(" · ");
  card.querySelector(".family-name").textContent = `${guest.familyName || "Guest"} Family`;
  card.querySelector(".contact-line").textContent = [guest.contactPerson, guest.phoneEnding ? `WhatsApp ending ${guest.phoneEnding}` : "No WhatsApp number"].filter(Boolean).join(" · ");

  const badge = card.querySelector(".status-badge");
  badge.textContent = guest.sendStatus || "Pending";
  badge.className = `status-badge ${statusClass(guest.sendStatus)}`;

  const linkStep = card.querySelector(".link-step");
  linkStep.classList.toggle("done", linkDone);

  const messageButton = card.querySelector(".message-button");
  messageButton.href = hasPhone ? buildWhatsAppUrl(guest.whatsappNumber, message) : "#";
  messageButton.setAttribute("aria-disabled", String(!hasPhone));
  if (!hasPhone) messageButton.addEventListener("click", event => event.preventDefault());
  messageButton.addEventListener("click", () => claimGuest(guest));

  const templateSelect = card.querySelector(".message-template");
  const messagePreview = card.querySelector(".message-preview pre");
  templateSelect.value = selectedTemplate;
  messagePreview.textContent = message;
  templateSelect.addEventListener("change", () => {
    senderState.messageTemplates[guest.inviteToken] = templateSelect.value;
    message = buildMessage(guest, templateSelect.value);
    messagePreview.textContent = message;
    messageButton.href = hasPhone ? buildWhatsAppUrl(guest.whatsappNumber, message) : "#";
  });
  card.querySelector(".notes-field textarea").value = guest.notes || "";

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
  completeButton.disabled = !linkDone || guest.sendStatus === "Sent" || isBusy;
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
    videoSent: "Yes",
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
    videoSent: changes.videoSent || (changes.linkSent === "Yes" ? "Yes" : guest.videoSent || "No"),
    linkSent: changes.linkSent || guest.linkSent || "No",
    notes
  };

  if (next.status === "Sent" && next.linkSent !== "Yes") {
    setCardFeedback(card, "Confirm that the complete WhatsApp message was sent before completing this invitation.");
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
