// Google Apps Script Endpoint - using existing script
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzFTHa53ENMn0udXLJ1O7IqqgkxJ4cTEHNZFm8wkpu91gHT-s3Ud7uBzqfCW4qd_gPb/exec";
const INVITATION_SERVICE_URL = "https://lagna-invitation-service.onrender.com";
const MEMORY_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSffYrjmvpLm2veXg0g-jJiDtYkSKfApiVu3wTGmI3O3zZLyEQ/viewform";
const MEMORY_FORM_FAMILY_ENTRY = "entry.1000733018";
const MEMORY_FORM_INVITE_ENTRY = "entry.1330643432";

// Initialize data from Google Sheets via Google Apps Script
let guests = {};
let scheduleDocuments = [];
let ceremonies = [];
let currentGuest = null;

const WEDDING_DATE = new Date("2026-08-03T11:00:00+05:30");

function getInviteToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get("invite") || "";
}

function buildMemoryFormUrl(guest) {
  const url = new URL(MEMORY_FORM_URL);
  url.searchParams.set("usp", "pp_url");
  url.searchParams.set(MEMORY_FORM_FAMILY_ENTRY, guest ? guest.familyName || "" : "");
  url.searchParams.set(MEMORY_FORM_INVITE_ENTRY, guest ? guest.inviteToken || "" : getInviteToken());
  return url.toString();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function buildGuestRecord(g) {
  const familyName = g["Family Name"];
  const inviteToken = g["Invite Token"];

  return {
    familyId: g["Family ID"],
    familyName,
    side: g["Side"],
    category: g["Category"],
    contactPerson: g["Contact Person"],
    phone: g["Phone"],
    adults: g["Adults"],
    children: g["Children"],
    total: g["Total"],
    day1: g["Day 1"],
    day2: g["Day 2"],
    rsvp: g["RSVP"] || "Pending",
    qrGenerated: g["QR Generated"] || "No",
    inviteToken,
    checkinToken: g["Check-in Token"],
    invitationPdfLink: g["Invitation PDF link"],
    specialRequest: g["Special Request"] || "Nil",
    welcome: buildWelcomeMessage(familyName, inviteToken)
  };
}

function buildWelcomeMessage(familyName, inviteToken = "") {
  const messages = [
    `Dear ${familyName} Family, with folded hands and full hearts, we invite you to be part of our wedding celebration. As we, Deepali and Inderdip, begin this new chapter together, your presence is not just attendance for us; it is a blessing, a witness, and a source of strength. Your love and blessings will make this ceremony more meaningful and the memories more complete.`,
    `Dear ${familyName} Family, this wedding is a moment of love, family, memory, and new beginnings. As we, Deepali and Inderdip, begin our journey together, your blessings carry deep meaning for us. Your presence will make this celebration warmer, stronger, and more complete.`,
    `Dear ${familyName} Family, some moments in life become sacred because they are shared with the people who matter. Our wedding is one such moment. We, Deepali and Inderdip, invite you with love and respect, and we seek your blessings as we step into this new chapter together.`,
    `Dear ${familyName} Family, we joyfully invite you to bless our wedding celebration. Your presence, love, and good wishes mean more to us than words can fully express. For us, this celebration will feel complete only with the blessings of family and friends like you.`
  ];

  return messages[getStableMessageIndex(inviteToken || familyName, messages.length)];
}

function getStableMessageIndex(seed, count) {
  let hash = 0;
  const text = String(seed || "");
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash % count;
}

function isRsvpConfirmed(guest) {
  return ["yes", "done", "confirmed"].includes(String(guest.rsvp || "").trim().toLowerCase());
}

function isRsvpDeclined(guest) {
  return ["no", "issue", "declined", "not attending"].includes(String(guest.rsvp || "").trim().toLowerCase());
}

function canOpenInvitationPdf(guest) {
  return guest && (isRsvpConfirmed(guest) || isRsvpDeclined(guest));
}

function buildGuestInfo(guest, rsvpStatus) {
  const rows = [
    `<strong>Family:</strong> ${escapeHtml(guest.familyName)}`,
    `<strong>Side:</strong> ${escapeHtml(guest.side)}`,
    `<strong>RSVP:</strong> ${escapeHtml(rsvpStatus)}`
  ];

  if (isRsvpConfirmed(guest)) {
    rows.splice(2, 0, `<strong>Confirmed Guests:</strong> ${escapeHtml(guest.total || 0)}`);
  }

  if (canOpenInvitationPdf(guest)) {
    const invitationUrl = getInvitationPdfUrl(guest);
    if (invitationUrl) {
      rows.push(`<a class="guest-card-link" href="${escapeHtml(invitationUrl)}" target="_blank" rel="noopener">View Invitation PDF</a>`);
    }
  }

  return rows.join("<br>");
}

function getInvitationPdfUrl(guest) {
  if (guest.invitationPdfLink) return guest.invitationPdfLink;
  if (!INVITATION_SERVICE_URL || !guest.inviteToken) return "";
  return `${INVITATION_SERVICE_URL.replace(/\/$/, "")}/invitation/${encodeURIComponent(guest.inviteToken)}.pdf`;
}

function getRichInvitationPdfUrl(guest) {
  if (!INVITATION_SERVICE_URL || !guest || !guest.inviteToken) return "";
  return `${INVITATION_SERVICE_URL.replace(/\/$/, "")}/invitation-rich/${encodeURIComponent(guest.inviteToken)}.pdf`;
}

function pingInvitationService() {
  if (!INVITATION_SERVICE_URL || Date.now() > WEDDING_DATE.getTime()) return;
  fetch(`${INVITATION_SERVICE_URL.replace(/\/$/, "")}/health`, {
    cache: "no-store",
    mode: "no-cors"
  }).catch(() => {});
}

function renderInvitationDownloadPanel(guest, statusMessage = "") {
  const panel = document.getElementById("invitationDownloadPanel");
  if (!panel) return;

  const invitationUrl = canOpenInvitationPdf(guest) ? getInvitationPdfUrl(guest) : "";
  const richInvitationUrl = canOpenInvitationPdf(guest) ? getRichInvitationPdfUrl(guest) : "";
  if (!invitationUrl) {
    panel.hidden = true;
    panel.innerHTML = "";
    return;
  }

  panel.hidden = false;
  panel.innerHTML = `
    <div class="download-card quick">
      <div>
        <strong>Invitation PDF is ready</strong>
        <p>${escapeHtml(statusMessage || (isRsvpConfirmed(guest) ? "Your personalized QR invitation opens as a quick, optimized PDF." : "Your invitation and livestream details open as a quick, optimized PDF without venue QR code."))}</p>
      </div>
      <a class="btn primary" href="${escapeHtml(invitationUrl)}" target="_blank" rel="noopener">Open Quick PDF</a>
    </div>
    <div class="download-card rich">
      <div>
        <strong>Rich quality PDF</strong>
        <p>Large artistic version, around 20 MB. It may take about two minutes to open or download.</p>
      </div>
      <a class="btn secondary rich-download" href="${escapeHtml(richInvitationUrl)}" target="_blank" rel="noopener">Open Rich PDF</a>
    </div>
  `;
}

// Fetch data from Google Apps Script
async function loadDataFromGoogleSheets() {
  const inviteToken = getInviteToken();

  loadDefaultGuests();
  loadDefaultEventData();
  loadGuest();
  loadScheduleDocuments();
  loadCeremonies();

  try {
    const params = new URLSearchParams();
    if (inviteToken) params.set("invite", inviteToken);
    params.set("_", Date.now());
    const guestResponse = await fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}`, {
      cache: "no-store"
    });
    const guestData = await guestResponse.json();
    
    if (guestData.success && guestData.guest) {
      const guest = buildGuestRecord(guestData.guest);
      guests[guest.inviteToken] = guest;
    }

    if (guestData.success && guestData.guests) {
      guestData.guests.forEach(g => {
        const guest = buildGuestRecord(g);
        guests[guest.inviteToken] = guest;
      });
    }

    loadGuest();
    loadScheduleDocuments();
    loadCeremonies();
    
    console.log("Data loaded successfully from Google Sheets", guests);
  } catch (error) {
    console.error("Error loading data from Google Sheets:", error);
    
    // Fallback to default data if Google Sheets fetch fails
    loadDefaultData();
  }
}

function loadGuest() {
  const inviteToken = getInviteToken();
  const guest = guests[inviteToken];
  const box = document.getElementById("personalWelcome");
  currentGuest = guest || null;
  const requestForm = document.getElementById("generalInviteRequest");
  const rsvpForm = document.getElementById("rsvpForm");
  if (requestForm) requestForm.hidden = !!guest || !!inviteToken;
  if (rsvpForm) rsvpForm.hidden = !guest && !inviteToken;

  if (guest) {
    const rsvpStatus = guest.rsvp || "Pending";
    box.innerHTML = `
      <p>${escapeHtml(guest.welcome)}</p>
      <div id="guestInfoCard" class="guest-info-card">
        ${buildGuestInfo(guest, rsvpStatus)}
      </div>
    `;
    updateInviteStatus(rsvpStatus, guest.qrGenerated);
    prefillRsvpForm(guest);
    updateMemoryLinks(guest);
    renderInvitationDownloadPanel(guest);
  } else if (inviteToken) {
    box.innerHTML = `
      <p>This private invitation link is active, but guest details could not be loaded yet.</p>
      <div id="guestInfoCard" class="guest-info-card">
        <strong>Invite Token:</strong> ${escapeHtml(inviteToken)}<br>
        Please keep this link. Personalized details will appear once the guest list connection is updated.
      </div>
    `;
    updateInviteStatus("Pending", "No");
    prefillRsvpForm(null);
    updateMemoryLinks(null);
    renderInvitationDownloadPanel(null);
  } else {
    box.innerHTML = `
      <p>Welcome, dear family and friends. Your presence means a lot to us.</p>
      <div id="guestInfoCard" class="guest-info-card">
        This is a general invitation page. Personalized RSVP and QR pass details will appear when opened from a private family invitation link.
      </div>
    `;
    updateInviteStatus("General", "No");
    prefillRsvpForm(null);
    updateMemoryLinks(null);
    renderInvitationDownloadPanel(null);
  }
}

async function submitGeneralInviteRequest(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.getElementById("requestInviteStatus");
  const button = form.querySelector("button[type='submit']");
  const payload = {
    action: "requestInvite",
    name: document.getElementById("requestName").value.trim(),
    familyName: document.getElementById("requestFamilyName").value.trim(),
    phone: document.getElementById("requestPhone").value.trim(),
    side: document.getElementById("requestSide").value
  };
  if (!payload.name || !payload.familyName || !payload.phone || !payload.side) {
    status.textContent = "Please complete all fields before requesting your invitation.";
    return;
  }
  button.disabled = true;
  status.textContent = "Submitting your request…";
  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    form.reset();
    status.textContent = "Thank you. Your request is waiting for approval. You will receive your personalized invitation link directly on WhatsApp once it is ready.";
  } catch (error) {
    status.textContent = "We could not submit your request right now. Please try again shortly.";
  } finally {
    button.disabled = false;
  }
}

function updateMemoryLinks(guest) {
  const uploadLink = document.getElementById("memoryUploadPrimary");
  const blessingFamilyName = document.getElementById("blessingFamilyName");

  const formUrl = buildMemoryFormUrl(guest);
  if (uploadLink) {
    uploadLink.href = formUrl;
  }

  if (blessingFamilyName) {
    blessingFamilyName.value = guest ? guest.familyName || "" : "";
  }
}

function getBlessingPayload() {
  const familyName = document.getElementById("blessingFamilyName");
  const name = document.getElementById("blessingName");
  const message = document.getElementById("blessingMessage");
  const consent = document.getElementById("blessingConsent");

  return {
    action: "blessing",
    invite: currentGuest ? currentGuest.inviteToken : getInviteToken(),
    familyName: familyName ? familyName.value.trim() : "",
    name: name ? name.value.trim() : "",
    message: message ? message.value.trim() : "",
    consent: consent && consent.checked ? "Yes" : "No"
  };
}

async function submitBlessing(event) {
  event.preventDefault();

  const form = document.getElementById("blessingForm");
  const status = document.getElementById("blessingStatus");
  const submitButton = form ? form.querySelector("button[type='submit']") : null;
  const payload = getBlessingPayload();

  if (!payload.message) {
    if (status) status.textContent = "Please write your blessing before sending.";
    return;
  }

  if (payload.consent !== "Yes") {
    if (status) status.textContent = "Please confirm consent before sending your blessing.";
    return;
  }

  if (submitButton) submitButton.disabled = true;
  if (status) status.textContent = "Sending your blessing...";

  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    if (status) {
      status.textContent = "Thank you. Your blessing has been received and will be reviewed before display.";
    }
    if (form) {
      form.reset();
      updateMemoryLinks(currentGuest);
    }
  } catch (error) {
    console.error("Blessing submission failed:", error);
    if (status) {
      status.textContent = "We could not send it right now. Please try again in a moment.";
    }
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

function prefillRsvpForm(guest) {
  const familyNameInput = document.getElementById("rsvpFamilyName");
  const adultsInput = document.getElementById("rsvpAdults");
  const childrenInput = document.getElementById("rsvpChildren");
  const attendanceInput = document.getElementById("rsvpAttendance");
  const specialRequestInput = document.getElementById("rsvpSpecialRequest");

  if (!familyNameInput || !attendanceInput || !specialRequestInput) return;

  familyNameInput.value = guest ? guest.familyName : "";
  if (adultsInput && guest && isRsvpConfirmed(guest)) adultsInput.value = guest.adults || "";
  if (childrenInput && guest && isRsvpConfirmed(guest)) childrenInput.value = guest.children || "";
  const rsvpValue = guest ? String(guest.rsvp || "Pending").trim().toLowerCase() : "pending";
  if (rsvpValue === "done" || rsvpValue === "yes" || rsvpValue === "confirmed") {
    attendanceInput.value = "Yes";
  } else if (rsvpValue === "issue" || rsvpValue === "no" || rsvpValue === "declined") {
    attendanceInput.value = "No";
  } else {
    attendanceInput.value = "Pending";
  }
  specialRequestInput.value = guest ? guest.specialRequest || "Nil" : "Nil";
}

function getRsvpPayload() {
  const familyName = document.getElementById("rsvpFamilyName");
  const adults = document.getElementById("rsvpAdults");
  const children = document.getElementById("rsvpChildren");
  const attendance = document.getElementById("rsvpAttendance");
  const specialRequest = document.getElementById("rsvpSpecialRequest");

  return {
    action: "rsvp",
    invite: currentGuest ? currentGuest.inviteToken : getInviteToken(),
    familyName: familyName ? familyName.value.trim() : "",
    adults: adults ? Number(adults.value || 0) : 0,
    children: children ? Number(children.value || 0) : 0,
    rsvp: attendance ? attendance.value : "Pending",
    specialRequest: specialRequest ? specialRequest.value.trim() || "Nil" : "Nil"
  };
}

function applyLocalRsvpState(payload) {
  if (!currentGuest) return;

  currentGuest.familyName = payload.familyName || currentGuest.familyName;
  currentGuest.adults = payload.rsvp === "Yes" ? payload.adults : 0;
  currentGuest.children = payload.rsvp === "Yes" ? payload.children : 0;
  currentGuest.total = payload.rsvp === "Yes" ? payload.adults + payload.children : 0;
  currentGuest.rsvp = payload.rsvp;
  currentGuest.specialRequest = payload.specialRequest;
  currentGuest.qrGenerated = payload.rsvp === "Yes" ? "Yes" : "No";
  guests[currentGuest.inviteToken] = currentGuest;
  loadGuest();
}

function delay(milliseconds) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

async function submitRsvp(event) {
  event.preventDefault();

  const form = document.getElementById("rsvpForm");
  const status = document.getElementById("rsvpStatus");
  const submitButton = form ? form.querySelector("button[type='submit']") : null;
  const payload = getRsvpPayload();

  if (!payload.invite) {
    if (status) status.textContent = "Please open your private family invitation link before submitting RSVP.";
    return;
  }

  if (payload.rsvp === "Yes" && payload.adults + payload.children <= 0) {
    if (status) status.textContent = "Please enter at least one adult or child attending.";
    return;
  }

  if (submitButton) submitButton.disabled = true;
  if (status) status.textContent = "Submitting RSVP...";

  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    applyLocalRsvpState(payload);
    if (status) {
      status.textContent = "RSVP submitted. Refreshing invitation details...";
    }

    await delay(1800);
    await loadDataFromGoogleSheets();
    if (!canOpenInvitationPdf(currentGuest)) {
      applyLocalRsvpState(payload);
    }

    if (status) {
      status.textContent = payload.rsvp === "Yes"
        ? "RSVP confirmed. Your personalized invitation PDF is ready below."
        : "RSVP updated. Your invitation PDF and livestream details are ready below.";
    }
    if (payload.rsvp === "Yes") {
      renderInvitationDownloadPanel(currentGuest, "Your QR entry code is included on page 4. Open or download the PDF before coming to the venue.");
    } else {
      renderInvitationDownloadPanel(currentGuest, "Your invitation and livestream details are available below. Because you are not attending in person, the venue QR area is left blank.");
    }
  } catch (error) {
    console.error("RSVP submission failed:", error);
    if (status) {
      status.textContent = "We could not submit RSVP right now. Please try again in a moment.";
    }
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

function updateInviteStatus(rsvpStatus, qrGenerated) {
  const banner = document.getElementById("inviteStatusBanner");
  const ticker = document.getElementById("guestTickerText");
  if (!banner || !ticker) return;

  const normalizedStatus = String(rsvpStatus || "").toLowerCase();
  const hasQr = String(qrGenerated || "").toLowerCase() === "yes";
  let message = "RSVP not completed. Invitation pass is not active.";
  let className = "status-banner pending";

  if ((normalizedStatus === "yes" || normalizedStatus === "done") && hasQr) {
    message = "RSVP confirmed. Your family QR entry pass is active.";
    className = "status-banner active";
  } else if (normalizedStatus === "yes" || normalizedStatus === "done") {
    message = "RSVP confirmed. Your QR entry pass will appear after it is generated.";
    className = "status-banner active";
  } else if (normalizedStatus === "no" || normalizedStatus === "issue") {
    message = "RSVP marked as not attending. Invitation PDF and livestream link remain available without QR entry code.";
    className = "status-banner inactive";
  } else if (normalizedStatus === "general") {
    message = "General invitation. Open your private family link to activate personalized RSVP and QR pass details.";
    className = "status-banner inactive";
  }

  banner.textContent = message;
  banner.className = className;
  ticker.textContent = `${message} Share your memories, photos, and blessings for Stories of Us.`;
}

function loadCountdown() {
  const clock = document.getElementById("countdownClock");
  const label = document.querySelector(".countdown-label");
  if (!clock) return;

  const diff = WEDDING_DATE.getTime() - Date.now();
  if (diff <= 0) {
    if (label) label.textContent = "Since the wedding began";
    clock.textContent = formatDuration(Math.abs(diff));
    return;
  }

  if (label) label.textContent = "Wedding countdown";
  clock.textContent = formatDuration(diff);
}

function formatDuration(milliseconds) {
  const days = Math.floor(milliseconds / 86400000);
  const hours = Math.floor((milliseconds % 86400000) / 3600000);
  const minutes = Math.floor((milliseconds % 3600000) / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function loadScheduleDocuments() {
  const container = document.getElementById("scheduleContainer");
  if (!scheduleDocuments.length) {
    container.innerHTML = "<p>Schedule details are being prepared.</p>";
    return;
  }

  container.innerHTML = `
    <div class="schedule-doc-grid">
      ${scheduleDocuments.map(doc => `
        <article class="schedule-doc">
          <span class="doc-day">${escapeHtml(doc.day)}</span>
          <h3>${escapeHtml(doc.title)}</h3>
          <p>${escapeHtml(doc.description)}</p>
          <div class="doc-events">${doc.events.map(event => `<span>${escapeHtml(event)}</span>`).join("")}</div>
          <a class="btn primary" href="${escapeHtml(doc.href)}">${escapeHtml(doc.cta)}</a>
        </article>
      `).join("")}
    </div>
  `;
}

function loadCeremonies() {
  const grid = document.getElementById("ceremonyGrid");
  if (!ceremonies.length) {
    grid.innerHTML = "<p>Ceremony guide details are being prepared.</p>";
    return;
  }

  grid.innerHTML = ceremonies.map(c => `
    <article class="ceremony-card ${escapeHtml(c.theme)}">
      <div class="ceremony-art" aria-hidden="true">
        <span>${escapeHtml(c.symbol)}</span>
      </div>
      <div class="ceremony-copy">
        <p class="ceremony-label">${escapeHtml(c.marathi)}</p>
        <h3>${escapeHtml(c.english)}</h3>
        <p>${escapeHtml(c.description)}</p>
        <small>${escapeHtml(c.note)}</small>
        <small class="ceremony-reference">${escapeHtml(c.reference)}</small>
      </div>
    </article>
  `).join("");
}

// Fallback default data (in case Google Sheets is unavailable)
function loadDefaultData() {
  loadDefaultGuests();
  loadDefaultEventData();

  // Trigger the initial page load functions after default data is loaded
  loadGuest();
  loadScheduleDocuments();
  loadCeremonies();
  
  console.log("Using default fallback data");
}

function loadDefaultGuests() {
  guests = {
    "INV-d2b2cf6c72ff4a8f": {
      familyId: "F001",
      familyName: "Wankhede",
      side: "Bride",
      category: "Immediate Family",
      contactPerson: "Deepali",
      phone: "917387482342",
      adults: 4,
      children: 0,
      total: 4,
      day1: "Yes",
      day2: "Yes",
      rsvp: "Pending",
      qrGenerated: "No",
      inviteToken: "INV-d2b2cf6c72ff4a8f",
      checkinToken: "",
      specialRequest: "Nil",
      welcome: buildWelcomeMessage("Wankhede", "INV-d2b2cf6c72ff4a8f")
    },
    "INV-ba926ae3f36d462f": {
      familyId: "F002",
      familyName: "Shere",
      side: "Groom",
      category: "Immediate Family",
      contactPerson: "Inderdip",
      phone: "918369227409",
      adults: 3,
      children: 0,
      total: 3,
      day1: "Yes",
      day2: "Yes",
      rsvp: "Pending",
      qrGenerated: "No",
      inviteToken: "INV-ba926ae3f36d462f",
      checkinToken: "",
      specialRequest: "Nil",
      welcome: buildWelcomeMessage("Shere", "INV-ba926ae3f36d462f")
    }
  };
}

function loadDefaultEventData() {
  scheduleDocuments = [
    {
      day: "Day 1",
      title: "Sangeet & Haldi",
      description: "A festive evening guide with the welcome flow, Sangeet performances, Haldi blessings, Stories of Us, and dinner.",
      events: ["Sangeet", "Haldi", "Stories of Us", "Dinner"],
      href: "#",
      cta: "PDF Coming Soon"
    },
    {
      day: "Day 2",
      title: "Buddhist, Vedic Wedding & Reception",
      description: "The formal ceremony guide covering blessings, wedding rituals, reception, lunch, and farewell.",
      events: ["Haldi Removal", "Buddhist Wedding", "Vedic Wedding", "Reception"],
      href: "#",
      cta: "PDF Coming Soon"
    }
  ];

  ceremonies = [
    {
      english: "Sangeet",
      marathi: "संगीत",
      symbol: "S",
      theme: "mehendi",
      description: "Music, dance, and family performances turn the evening into a joyful celebration of both families coming together.",
      note: "Guest moment: enjoy the performances, cheer for family and friends, and join the celebration.",
      reference: "Cultural reference: contemporary Maharashtrian pre-wedding family celebration and musical gathering."
    },
    {
      english: "Haldi",
      marathi: "हळद",
      symbol: "H",
      theme: "haldi",
      description: "Turmeric is applied as a symbol of brightness, protection, purification, and loving wishes from both families.",
      note: "Guest moment: offer haldi gently and share blessings for health and happiness.",
      reference: "Cultural reference: Maharashtrian halad ceremony and auspicious turmeric rituals."
    },
    {
      english: "Buddhist Wedding",
      marathi: "बौद्ध विवाह",
      symbol: "B",
      theme: "buddhist",
      description: "A peaceful ceremony centered on wisdom, equality, compassion, mutual respect, and mindful companionship.",
      note: "Guest moment: listen to the vandana and join the atmosphere of calm blessings.",
      reference: "Textual reference: Trisharan, Panchsheel, and Buddha Vandana recitations used in Buddhist observance."
    },
    {
      english: "Antarpat & Mangalashtak",
      marathi: "अंतरपाट आणि मंगलाष्टक",
      symbol: "A",
      theme: "mangal",
      description: "The sacred curtain marks anticipation before the auspicious verses announce the moment of union.",
      note: "Guest moment: shower akshata when the couple is blessed.",
      reference: "Textual reference: Marathi Mangalashtak verses traditionally recited during Maharashtrian weddings."
    },
    {
      english: "Saptapadi",
      marathi: "सप्तपदी",
      symbol: "S",
      theme: "saptapadi",
      description: "Seven steps become seven shared promises for nourishment, strength, prosperity, family, harmony, friendship, and lifelong companionship.",
      note: "Guest moment: witness the spiritual heart of the wedding.",
      reference: "Textual reference: Saptapadi vows described in the Grihya Sutra wedding tradition."
    },
    {
      english: "Reception",
      marathi: "आशीर्वाद समारंभ",
      symbol: "R",
      theme: "reception",
      description: "The families welcome everyone to bless the newly married couple, share greetings, photographs, and a meal together.",
      note: "Guest moment: meet the couple and share your blessings.",
      reference: "Cultural reference: Ashirwad samarambh, family reception, and public blessings after wedding rites."
    }
  ];
}

// Start loading data when the page is ready
document.addEventListener("DOMContentLoaded", () => {
  loadCountdown();
  setInterval(loadCountdown, 1000);
  pingInvitationService();
  setInterval(pingInvitationService, 10 * 60 * 1000);
  loadDataFromGoogleSheets();
  const blessingForm = document.getElementById("blessingForm");
  if (blessingForm) {
    blessingForm.addEventListener("submit", submitBlessing);
  }
  const rsvpForm = document.getElementById("rsvpForm");
  if (rsvpForm) {
    rsvpForm.addEventListener("submit", submitRsvp);
  }
  const generalInviteRequest = document.getElementById("generalInviteRequest");
  if (generalInviteRequest) {
    generalInviteRequest.addEventListener("submit", submitGeneralInviteRequest);
  }
});
