const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwJe2s4BnRy_xwcq0yAA5lt1EIFTpmPBiQAWmHcqBKMB1dkJ0hSM-04ZxkmgwbYY__P/exec";

async function loadGuest() {
  const id = getGuestId();
  const box = document.getElementById("personalWelcome");

  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?guest=${id}`);
    const data = await response.json();

    console.log("Guest data:", data);

    if (data.success && data.guest) {
      const g = data.guest;
      box.textContent = `Dear ${g["Family Name"]}, your presence means a lot to us. Thank you for being part of this journey from one generation to the next.`;
    } else {
      box.textContent = `Guest data not found for ${id}.`;
    }
  } catch (error) {
    box.textContent = "Guest data loading failed.";
    console.error("Guest data loading failed:", error);
  }
}
