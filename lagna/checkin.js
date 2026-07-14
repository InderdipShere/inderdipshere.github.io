const CHECKIN_API_URL = "https://script.google.com/macros/s/AKfycbzFTHa53ENMn0udXLJ1O7IqqgkxJ4cTEHNZFm8wkpu91gHT-s3Ud7uBzqfCW4qd_gPb/exec";
const CHECKIN_STORAGE_KEY = "lagna-checkin-pin";
const initialCheckinToken = extractToken(new URLSearchParams(window.location.search).get("checkin"));
const state = { pin: "", eventDay: "Day 1", stream: null, detector: null, qrReader: null, scanning: false, lastToken: "", pendingToken: initialCheckinToken };

function extractToken(value) {
  const match = String(value || "").match(/CHK-[A-Z0-9-]+/i);
  return match ? match[0] : "";
}

function setLoginStatus(message) { document.getElementById("loginStatus").textContent = message; }

async function lookupToken(token) {
  const url = new URL(CHECKIN_API_URL);
  url.searchParams.set("security", "lookup");
  url.searchParams.set("pin", state.pin);
  url.searchParams.set("checkin", token);
  url.searchParams.set("eventDay", state.eventDay);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not contact the guest list.");
  return response.json();
}

function countOptions(selected, maximum) {
  return Array.from({ length: maximum + 1 }, (_, value) => `<option value="${value}"${Number(selected) === value ? " selected" : ""}>${value}</option>`).join("");
}

function showResult(type, title, message, guest, showApproval = false) {
  const result = document.getElementById("result");
  result.className = `result show ${type}`;
  const details = guest ? `
    <div class="guest-summary">
      <div><span>Family</span><strong>${escapeHtml(guest["Family Name"] || "—")}</strong></div>
      <div><span>Contact</span><strong>${escapeHtml(guest["Contact Person"] || "—")}</strong></div>
      <div><span>Adults</span><strong>${escapeHtml(guest.Adults || 0)}</strong></div>
      <div><span>Children</span><strong>${escapeHtml(guest.Children || 0)}</strong></div>
      <div><span>Total expected</span><strong>${escapeHtml(guest.Total || 0)}</strong></div>
      <div><span>RSVP</span><strong>${escapeHtml(guest.RSVP || "Pending")}</strong></div>
    </div>` : "";
  const approval = showApproval && guest ? `
    <form id="approvalForm" class="approval-form">
      <h3>Approve actual arrival</h3>
      <div class="count-fields">
        <label>Adults<select id="actualAdults">${countOptions(guest.Adults, Math.max(30, Number(guest.Adults) || 0))}</select></label>
        <label>Children<select id="actualChildren">${countOptions(guest.Children, Math.max(20, Number(guest.Children) || 0))}</select></label>
      </div>
      <label>Note if count differs<textarea id="checkinNotes" rows="2" maxlength="500" placeholder="Example: one adult could not attend"></textarea></label>
      <button type="submit">Approve check-in</button>
    </form>` : "";
  result.innerHTML = `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p>${details}${approval}`;
  if (showApproval && guest) {
    document.getElementById("approvalForm").addEventListener("submit", event => {
      event.preventDefault();
      confirmCheckin(guest["Check-in Token"], document.getElementById("actualAdults").value, document.getElementById("actualChildren").value, document.getElementById("checkinNotes").value);
    });
  }
}

function escapeHtml(value) { const box = document.createElement("div"); box.textContent = String(value); return box.innerHTML; }

async function submitToken(rawToken) {
  const token = extractToken(rawToken);
  if (!token) { showResult("rejected", "QR code not recognised", "Please scan the family QR pass again, or enter the CHK token printed on the pass."); return; }
  try {
    const payload = await lookupToken(token);
    if (!payload.success) { showResult("rejected", "Not approved", payload.error || "This QR pass is not valid for check-in."); return; }
    const guest = payload.guest;
    if (String(guest.RSVP).toLowerCase() !== "done" && String(guest.RSVP).toLowerCase() !== "yes") {
      showResult("pending", "RSVP not confirmed", "This family does not yet have an approved attending RSVP.", guest); return;
    }
    const alreadyIn = !!(payload.checkinState && payload.checkinState.checkedIn);
    showResult("approved", alreadyIn ? "Already checked in" : "Approved — please confirm", alreadyIn ? "This family has already been marked present." : "Review the expected guests below. Adjust only if the actual arrival count differs, then confirm.", guest, !alreadyIn);
  } catch (error) { showResult("rejected", "Connection problem", error.message || "Please try again."); }
}

async function confirmCheckin(token, adults, children, notes) {
  const button = document.querySelector("#approvalForm button");
  if (button) { button.disabled = true; button.textContent = "Recording check-in…"; }
  try {
    await fetch(CHECKIN_API_URL, { method:"POST", mode:"no-cors", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify({ action:"checkin", pin:state.pin, checkin:token, eventDay:state.eventDay, adults, children, notes }) });
    showResult("approved", `Checked in for ${state.eventDay} — welcome!`, "The actual arrival count and any note have been recorded in the Check-in Log.");
  } catch (_) { showResult("rejected", "Could not record check-in", "Please check the connection and try again."); }
}

async function scanFrame() {
  if (!state.scanning || !state.detector) return;
  const video = document.getElementById("camera");
  try {
    const codes = await state.detector.detect(video);
    if (codes.length) {
      const token = extractToken(codes[0].rawValue);
      if (token && token !== state.lastToken) { state.lastToken = token; await submitToken(token); }
    }
  } catch (_) { /* A frame can be unavailable while the camera starts. */ }
  if (state.scanning) requestAnimationFrame(scanFrame);
}

async function startCamera() {
  if (window.Html5Qrcode) {
    await startDedicatedScanner();
    return;
  }
  if (!("BarcodeDetector" in window)) { document.getElementById("cameraStatus").textContent = "Camera scanning is not supported by this browser. Use the manual token field below."; return; }
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:{ ideal:"environment" } }, audio:false });
    const video = document.getElementById("camera"); video.srcObject = state.stream; await video.play();
    state.detector = new BarcodeDetector({ formats:["qr_code"] }); state.scanning = true;
    document.getElementById("cameraStatus").textContent = "Camera ready — hold the family QR pass inside the frame.";
    document.getElementById("cameraButton").textContent = "Camera scanning"; document.getElementById("cameraButton").disabled = true;
    requestAnimationFrame(scanFrame);
  } catch (error) { document.getElementById("cameraStatus").textContent = "Camera permission was not granted. Use the manual token field below."; }
}

async function startDedicatedScanner() {
  const readerElement = document.getElementById("qrReader");
  const camera = document.getElementById("camera");
  try {
    camera.hidden = true;
    readerElement.hidden = false;
    state.qrReader = new Html5Qrcode("qrReader");
    await state.qrReader.start(
      { facingMode: { exact: "environment" } },
      { fps: 12, qrbox: viewfinder => ({ width: Math.min(viewfinder.width * 0.86, 420), height: Math.min(viewfinder.width * 0.86, 420) }), aspectRatio: 1, disableFlip: false },
      async decodedText => {
        const token = extractToken(decodedText);
        if (!token || token === state.lastToken) return;
        state.lastToken = token;
        await submitToken(token);
      },
      () => {}
    );
    document.getElementById("cameraStatus").textContent = "Camera ready — hold the family QR pass inside the square.";
    document.getElementById("cameraButton").textContent = "Camera scanning";
    document.getElementById("cameraButton").disabled = true;
  } catch (error) {
    readerElement.hidden = true;
    camera.hidden = false;
    document.getElementById("cameraStatus").textContent = "Could not start the QR reader. Please allow camera access, then try the manual token field.";
  }
}

function lockCheckin() {
  state.scanning = false; if (state.stream) state.stream.getTracks().forEach(track => track.stop()); state.stream = null;
  if (state.qrReader) state.qrReader.stop().catch(() => {}); state.qrReader = null;
  localStorage.removeItem(CHECKIN_STORAGE_KEY); state.pin = "";
  document.getElementById("checkinApp").hidden = true; document.getElementById("loginPanel").hidden = false; document.getElementById("checkinPin").value = "";
  document.querySelector(".camera-panel").hidden = false;
  document.querySelector(".manual-panel").hidden = false;
}

document.getElementById("loginForm").addEventListener("submit", async event => {
  event.preventDefault(); state.pin = document.getElementById("checkinPin").value.trim();
  if (!/^\d{6,12}$/.test(state.pin)) { setLoginStatus("Enter the six-digit check-in PIN."); return; }
  try {
    const url = new URL(CHECKIN_API_URL); url.searchParams.set("security","lookup"); url.searchParams.set("pin",state.pin); url.searchParams.set("checkin","CHK-PIN-CHECK");
    const response = await fetch(url); const payload = await response.json();
    if (payload.error === "Invalid check-in PIN") { setLoginStatus("That PIN is not valid."); return; }
    localStorage.setItem(CHECKIN_STORAGE_KEY, state.pin); document.getElementById("loginPanel").hidden = true; document.getElementById("checkinApp").hidden = false;
    if (state.pendingToken) {
      document.querySelector(".camera-panel").hidden = true;
      document.querySelector(".manual-panel").hidden = true;
      showResult("pending", "Loading family invitation…", "Checking the QR invitation now.");
      await submitToken(state.pendingToken);
    }
  } catch (_) { setLoginStatus("Could not reach the guest list. Check the connection."); }
});
document.getElementById("manualForm").addEventListener("submit", event => { event.preventDefault(); submitToken(document.getElementById("tokenInput").value); });
document.getElementById("cameraButton").addEventListener("click", startCamera);
document.getElementById("lockButton").addEventListener("click", lockCheckin);
document.getElementById("eventDay").addEventListener("change", event => { state.eventDay = event.target.value; state.lastToken = ""; });
const savedPin = localStorage.getItem(CHECKIN_STORAGE_KEY); if (savedPin) document.getElementById("checkinPin").value = savedPin;
