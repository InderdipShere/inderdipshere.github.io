import json
import os
from urllib.parse import urlencode
from urllib.request import urlopen

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse

from pdf_generator import generate_invitation_pdf


GOOGLE_SCRIPT_URL = os.environ.get("GOOGLE_SCRIPT_URL", "").strip()
SITE_URL = os.environ.get("SITE_URL", "https://inderdipshere.github.io/lagna").rstrip("/")

app = FastAPI(title="Lagna Invitation PDF Service")


def fetch_guest(invite_token):
    if not GOOGLE_SCRIPT_URL:
        raise HTTPException(status_code=500, detail="GOOGLE_SCRIPT_URL is not configured")

    query = urlencode({"invite": invite_token})
    with urlopen(f"{GOOGLE_SCRIPT_URL}?{query}", timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))

    if not payload.get("success") or not payload.get("guest"):
        raise HTTPException(status_code=404, detail="Invitation guest not found")

    return payload["guest"]


def is_confirmed(guest):
    return str(guest.get("RSVP", "")).strip().lower() in {"done", "yes", "confirmed"}


@app.get("/health")
def health():
    return {
        "success": True,
        "service": "lagna-invitation-pdf",
        "googleScriptConfigured": bool(GOOGLE_SCRIPT_URL),
        "siteUrl": SITE_URL,
    }


@app.get("/invitation/{invite_token}.pdf")
def invitation_pdf(invite_token: str):
    guest = fetch_guest(invite_token)

    if not is_confirmed(guest):
        raise HTTPException(status_code=409, detail="RSVP is not confirmed yet")

    checkin_token = str(guest.get("Check-in Token", "")).strip()
    if not checkin_token:
        raise HTTPException(status_code=409, detail="Check-in token is not generated yet")

    family_name = str(guest.get("Family Name", "")).strip() or "Guest"
    total_guests = str(guest.get("Total", "")).strip()
    checkin_url = f"{SITE_URL}/checkin.html?checkin={checkin_token}"
    pdf = generate_invitation_pdf(checkin_url, family_name, total_guests)
    filename = f"Invitation_{invite_token}.pdf"

    return StreamingResponse(
        pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )
