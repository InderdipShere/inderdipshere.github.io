const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz6oWHpuWBBbxi8tnczdcKuDiWQ0qKmmeeuDbklO23YMrQ4tBMrvkc-tR1I8UlVxCSb/exec";

async function loadGuest() {
  const id = getGuestId();
  const box = document.getElementById("personalWelcome");
  const infoCard = document.getElementById("guestInfoCard");

  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?guest=${id}`);
    const data = await response.json();

    console.log("Guest data:", data);

    if (data.success && data.guest) {
      const g = data.guest;

      box.textContent = `Dear ${g["Family Name"]}, your presence means a lot to us. Thank you for being part of this journey from one generation to the next.`;

      infoCard.innerHTML = `
        <strong>Family:</strong> ${g["Family Name"]}<br>
        <strong>Side:</strong> ${g["Side"]}<br>
        <strong>Category:</strong> ${g["Category"]}<br>
        <strong>Total Guests:</strong> ${g["Total"]}<br>
        <strong>Day 1:</strong> ${g["Day 1"]}<br>
        <strong>Day 2:</strong> ${g["Day 2"]}<br>
        <strong>RSVP:</strong> ${g["RSVP"]}
      `;
    } else {
      box.textContent = `Guest data not found for ${id}.`;
      infoCard.innerHTML = "";
    }
  } catch (error) {
    box.textContent = "Guest data loading failed.";
    infoCard.innerHTML = "";
    console.error("Guest data loading failed:", error);
  }
}

