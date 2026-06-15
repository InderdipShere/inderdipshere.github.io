function getGuestId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("guest") || "F001";
}

function loadGuest() {
  const id = getGuestId();
  const guest = guests[id];
  const box = document.getElementById("personalWelcome");
  if (guest) {
    box.textContent = guest.welcome;
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
