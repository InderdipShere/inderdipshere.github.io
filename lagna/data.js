// Google Apps Script Endpoint - using existing script
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwJe2s4BnRy_xwcq0yAA5lt1EIFTpmPBiQAWmHcqBKMB1dkJ0hSM-04ZxkmgwbYY__P/exec";

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
  return {
    familyId: g["Family ID"],
    familyName: g["Family Name"],
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
    inviteToken: g["Invite Token"],
    checkinToken: g["Check-in Token"],
    specialRequest: g["Special Request"] || "Nil",
    welcome: `Dear ${g["Family Name"]} Family, your presence means a lot to us. Thank you for being part of this journey from one generation to the next.`
  };
}

// Fetch data from Google Apps Script
async function loadDataFromGoogleSheets() {
  const inviteToken = getInviteToken();

  try {
    const query = inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : "";
    const guestResponse = await fetch(`${GOOGLE_SCRIPT_URL}${query}`);
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

    loadDefaultEventData();
    
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

  if (guest) {
    const rsvpStatus = guest.rsvp || "Pending";
    box.innerHTML = `
      <p>${escapeHtml(guest.welcome)}</p>
      <div id="guestInfoCard" class="guest-info-card">
        <strong>Family:</strong> ${escapeHtml(guest.familyName)}<br>
        <strong>Side:</strong> ${escapeHtml(guest.side)}<br>
        <strong>Category:</strong> ${escapeHtml(guest.category)}<br>
        <strong>Invited Guests:</strong> ${escapeHtml(guest.total)}<br>
        <strong>Day 1:</strong> ${escapeHtml(guest.day1)}<br>
        <strong>Day 2:</strong> ${escapeHtml(guest.day2)}<br>
        <strong>RSVP:</strong> ${escapeHtml(rsvpStatus)}
      </div>
    `;
    updateInviteStatus(rsvpStatus, guest.qrGenerated);
    prefillRsvpForm(guest);
  } else {
    box.innerHTML = `
      <p>Welcome, dear family and friends. Your presence means a lot to us.</p>
      <div id="guestInfoCard" class="guest-info-card">
        This is a general invitation page. Personalized RSVP and QR pass details will appear when opened from a private family invitation link.
      </div>
    `;
    updateInviteStatus("General", "No");
    prefillRsvpForm(null);
  }
}

function prefillRsvpForm(guest) {
  const familyNameInput = document.getElementById("rsvpFamilyName");
  const attendanceInput = document.getElementById("rsvpAttendance");
  const specialRequestInput = document.getElementById("rsvpSpecialRequest");

  if (!familyNameInput || !attendanceInput || !specialRequestInput) return;

  familyNameInput.value = guest ? guest.familyName : "";
  attendanceInput.value = guest ? guest.rsvp || "Pending" : "Pending";
  specialRequestInput.value = guest ? guest.specialRequest || "Nil" : "Nil";
}

function updateInviteStatus(rsvpStatus, qrGenerated) {
  const banner = document.getElementById("inviteStatusBanner");
  const ticker = document.getElementById("guestTickerText");
  if (!banner || !ticker) return;

  const normalizedStatus = String(rsvpStatus || "").toLowerCase();
  const hasQr = String(qrGenerated || "").toLowerCase() === "yes";
  let message = "RSVP not completed. Invitation pass is not active.";
  let className = "status-banner pending";

  if (normalizedStatus === "yes" && hasQr) {
    message = "RSVP confirmed. Your family QR entry pass is active.";
    className = "status-banner active";
  } else if (normalizedStatus === "yes") {
    message = "RSVP confirmed. Your QR entry pass will appear after it is generated.";
    className = "status-banner active";
  } else if (normalizedStatus === "no") {
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
  if (!clock) return;

  const diff = WEDDING_DATE.getTime() - Date.now();
  if (diff <= 0) {
    clock.textContent = "The wedding celebration has begun";
    return;
  }

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  clock.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
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
      welcome: "Dear Wankhede Family, your presence means a lot to us. Thank you for being part of this journey from one generation to the next."
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
      welcome: "Dear Shere Family, this celebration carries forward the values, strength and blessings of our family."
    }
  };

  loadDefaultEventData();

  // Trigger the initial page load functions after default data is loaded
  loadGuest();
  loadScheduleDocuments();
  loadCeremonies();
  
  console.log("Using default fallback data");
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
  loadDataFromGoogleSheets();
});
