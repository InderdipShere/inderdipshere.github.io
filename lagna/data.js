// Google Apps Script Endpoint - using existing script
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwJe2s4BnRy_xwcq0yAA5lt1EIFTpmPBiQAWmHcqBKMB1dkJ0hSM-04ZxkmgwbYY__P/exec";

// Initialize data from Google Sheets via Google Apps Script
let guests = {};
let schedules = {};
let ceremonies = [];

function getGuestId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("guest") || "F001";
}

// Fetch data from Google Apps Script
async function loadDataFromGoogleSheets() {
  try {
    // Fetch guests data
    const guestResponse = await fetch(GOOGLE_SCRIPT_URL);
    const guestData = await guestResponse.json();
    
    if (guestData.success && guestData.guests) {
      // Build guests object from the response
      guestData.guests.forEach(g => {
        guests[g["Family ID"]] = {
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
          rsvp: g["RSVP"],
          qrGenerated: g["QR Generated"],
          welcome: `Dear ${g["Family Name"]}, your presence means a lot to us. Thank you for being part of this journey from one generation to the next.`
        };
      });
    }
    
    // Trigger the initial page load functions after data is loaded
    loadGuest();
    showDay("day1");
    loadCeremonies();
    
    console.log("Data loaded successfully from Google Sheets", guests);
  } catch (error) {
    console.error("Error loading data from Google Sheets:", error);
    
    // Fallback to default data if Google Sheets fetch fails
    loadDefaultData();
  }
}

function loadGuest() {
  const id = getGuestId();
  const guest = guests[id];
  const box = document.getElementById("personalWelcome");
  if (guest) {
    box.textContent = guest.welcome;
  } else {
    box.textContent = "Welcome, dear family and friends. Your presence means a lot to us.";
  }
}

function showDay(day) {
  document.querySelectorAll(".tab").forEach(btn => btn.classList.remove("active"));
  const buttons = document.querySelectorAll(".tab");
  if (day === "day1") buttons[0].classList.add("active");
  if (day === "day2") buttons[1].classList.add("active");

  const container = document.getElementById("scheduleContainer");
  container.innerHTML = schedules[day].map(item => `
    <div class="schedule-item">
      <div class="time">${item[0]}</div>
      <div>
        <strong>${item[1]}</strong>
        <p>${item[2]}</p>
      </div>
    </div>
  `).join("");
}

function loadCeremonies() {
  const grid = document.getElementById("ceremonyGrid");
  grid.innerHTML = ceremonies.map(c => `
    <article class="card">
      <h3>${c[0]}</h3>
      <p>${c[1]}</p>
    </article>
  `).join("");
}

// Fallback default data (in case Google Sheets is unavailable)
function loadDefaultData() {
  guests = {
    "F001": {
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
      welcome: "Dear Wankhede Family, your presence means a lot to us. Thank you for being part of this journey from one generation to the next."
    },
    "F002": {
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
      welcome: "Dear Shere Family, this celebration carries forward the values, strength and blessings of our family."
    }
  };

  schedules = {
    day1: [
      ["5:00 PM", "Guest Arrival & Welcome", "QR check-in, refreshments, informal gathering and video recording station opens."],
      ["5:30 PM", "Mehendi Ceremony", "Bride-centered Mehendi ceremony with family interactions."],
      ["5:30–9:30 PM", "Video Recording Booth", "Guest video messages collected for Stories of Us."],
      ["6:30 PM", "Haldi Ceremony", "Traditional Haldi for bride and groom."],
      ["7:30 PM", "Refreshment & Transition", "Guests relax with refreshments and background music."],
      ["8:15 PM", "Sangeet Opening", "Sitar recital by the groom's sister."],
      ["8:30 PM", "Sangeet Performances", "Family, friend and selected guest performances."],
      ["9:30 PM", "Stories of Us", "AI-curated guest memory compilation."],
      ["9:50 PM", "The Man Who Made This Possible", "Dedication to Shri Pradipkumar Shere."],
      ["10:00 PM", "Dinner", "Family gathering and celebration."]
    ],
    day2: [
      ["7:00 AM", "Haldi Removal Ceremony", "Ceremonial bath and completion of purification."],
      ["8:00 AM", "Preparation & Dress Change", "Bride and groom change into white attire."],
      ["9:00 AM", "Buddhist Wedding Ceremony", "Buddha Vandana, Trisharan, Panchsheel, recitations, vows and blessings."],
      ["9:45 AM", "Transition Break", "Refreshments with chants transitioning into Vedic hymns."],
      ["10:15 AM", "Wedding Preparation", "Vedic hymns, Upanishads and ceremony explanations."],
      ["11:00 AM", "Maharashtrian Wedding Ceremony Begins", "Ganesh invocation and beginning of main wedding rituals."],
      ["11:10 AM", "Seemant Pujan", "Welcoming of the groom's family."],
      ["11:20 AM", "Antarpat & Mangalashtak", "Symbolic union ceremony."],
      ["11:40 AM", "Jaimala", "Exchange of garlands."],
      ["11:50 AM", "Kanyadaan", "Sacred acceptance of the bride into the family."],
      ["12:10 PM", "Sindoor & Mangalsutra", "Marriage symbols ceremony."],
      ["12:20 PM", "Akshata Ceremony", "Collective blessings from guests."],
      ["12:30 PM", "Yajna & Lajahoma", "Sacred fire rituals."],
      ["12:45 PM", "Saptapadi", "Seven steps and seven vows."],
      ["1:00 PM", "Marriage Declaration & Blessings", "Completion of wedding rites."],
      ["1:15 PM", "Digital Book Inauguration", "Launch of the book on Shri Pradipkumar Shere."],
      ["1:30 PM", "Public Blessings & Reception", "Guest greetings and photographs."],
      ["2:15 PM", "Grand Wedding Lunch", "Community feast."],
      ["3:30 PM", "Formal Farewell", "Thank-you message and guest departure."]
    ]
  };

  ceremonies = [
    ["Mehendi", "A joyful pre-wedding ceremony where henna is applied, symbolizing beauty, celebration and preparation."],
    ["Haldi", "Turmeric ceremony symbolizing purification, blessings and protection before married life."],
    ["Buddhist Ceremony", "A ceremony centered on equality, compassion, wisdom and mutual respect."],
    ["Seemant Pujan", "A formal welcoming of the groom's family and symbolic joining of families."],
    ["Antarpat", "A cloth separates bride and groom before the auspicious moment of union."],
    ["Mangalashtak", "Sacred verses recited during the Maharashtrian wedding ceremony."],
    ["Kanyadaan", "A sacred act of trust and acceptance between two families."],
    ["Mangalsutra", "A public symbol of marriage and shared commitment."],
    ["Saptapadi", "Seven steps and vows forming the spiritual heart of the marriage."]
  ];

  // Trigger the initial page load functions after default data is loaded
  loadGuest();
  showDay("day1");
  loadCeremonies();
  
  console.log("Using default fallback data");
}

// Start loading data when the page is ready
document.addEventListener("DOMContentLoaded", loadDataFromGoogleSheets);
