function getGuestId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("guest") || "F001";
}

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwJe2s4BnRy_xwcq0yAA5lt1EIFTpmPBiQAWmHcqBKMB1dkJ0hSM-04ZxkmgwbYY__P/exec";

async function loadGuest() {
  const id = getGuestId();
  const box = document.getElementById("personalWelcome");

  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?guest=${id}`);
    const data = await response.json();

    if (data.success && data.guest) {
      const g = data.guest;
      box.textContent = `Dear ${g.FamilyName}, your presence means a lot to us. Thank you for being part of this journey from one generation to the next.`;
    } else {
      box.textContent = "Welcome, dear family and friends. Your presence means a lot to us.";
    }
  } catch (error) {
    box.textContent = "Welcome, dear family and friends. Your presence means a lot to us.";
    console.error("Guest data loading failed:", error);
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

function answerQuestion() {
  const input = document.getElementById("questionInput");
  const q = input.value.toLowerCase();
  let answer = "I can help with the schedule, ceremonies, upload links, RSVP and venue information.";

  if (q.includes("lunch")) answer = "The grand wedding lunch is currently planned for Day 2 at 2:15 PM.";
  else if (q.includes("haldi")) answer = "Haldi is on Day 1 at 6:30 PM. Haldi removal is on Day 2 at 7:00 AM.";
  else if (q.includes("sangeet")) answer = "Sangeet begins on Day 1 at 8:15 PM, opening with a Sitar recital.";
  else if (q.includes("buddhist")) answer = "The Buddhist wedding ceremony is planned for Day 2 at 9:00 AM.";
  else if (q.includes("saptapadi")) answer = "Saptapadi is the seven-step vow ceremony, currently planned for Day 2 at 12:45 PM.";
  else if (q.includes("photo") || q.includes("upload")) answer = "Photo and video upload links will be activated closer to the wedding.";

  const log = document.getElementById("chatLog");
  log.innerHTML += `<p><strong>You:</strong> ${input.value}</p><p><strong>Wedding Companion:</strong> ${answer}</p>`;
  input.value = "";
}

loadGuest();
showDay("day1");
loadCeremonies();
