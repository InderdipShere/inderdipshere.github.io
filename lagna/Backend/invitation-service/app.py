import json
import os
import time
from io import BytesIO
from urllib.parse import urlencode
from urllib.request import urlopen

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse

from pdf_generator import generate_invitation_pdf


GOOGLE_SCRIPT_URL = os.environ.get("GOOGLE_SCRIPT_URL", "").strip()
SITE_URL = os.environ.get("SITE_URL", "https://inderdipshere.github.io/lagna").rstrip("/")

app = FastAPI(title="Lagna Invitation PDF Service")
PDF_CACHE = {}
CACHE_TTL_SECONDS = int(os.environ.get("CACHE_TTL_SECONDS", "21600"))


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


def is_declined(guest):
    return str(guest.get("RSVP", "")).strip().lower() in {"no", "issue", "declined", "not attending"}


def get_cached_pdf(cache_key):
    cached = PDF_CACHE.get(cache_key)
    if not cached:
        return None

    created_at, pdf_bytes = cached
    if time.time() - created_at > CACHE_TTL_SECONDS:
        PDF_CACHE.pop(cache_key, None)
        return None

    return BytesIO(pdf_bytes)


def set_cached_pdf(cache_key, pdf):
    pdf.seek(0)
    pdf_bytes = pdf.read()
    PDF_CACHE[cache_key] = (time.time(), pdf_bytes)
    return BytesIO(pdf_bytes)


@app.get("/health")
def health():
    return {
        "success": True,
        "service": "lagna-invitation-pdf",
        "googleScriptConfigured": bool(GOOGLE_SCRIPT_URL),
        "siteUrl": SITE_URL,
    }


def build_invitation_response(invite_token, quality):
    guest = fetch_guest(invite_token)
    attending = is_confirmed(guest)
    declined = is_declined(guest)

    if not attending and not declined:
        raise HTTPException(status_code=409, detail="Please submit RSVP before opening the invitation PDF")

    checkin_token = str(guest.get("Check-in Token", "")).strip()
    if attending and not checkin_token:
        raise HTTPException(status_code=409, detail="Check-in token is not generated yet")

    family_name = str(guest.get("Family Name", "")).strip() or "Guest"
    side = str(guest.get("Side", "")).strip()
    total_guests = str(guest.get("Total", "")).strip() if attending else ""
    cache_key = (quality, invite_token, checkin_token if attending else "no-qr", family_name, total_guests, side)
    cached_pdf = get_cached_pdf(cache_key)
    if cached_pdf:
        pdf = cached_pdf
    else:
        checkin_url = f"{SITE_URL}/checkin.html?checkin={checkin_token}" if attending else ""
        pdf = set_cached_pdf(
            cache_key,
            generate_invitation_pdf(checkin_url, family_name, total_guests, quality=quality, side=side),
        )
    filename = f"Invitation_{quality}_{invite_token}.pdf"

    return StreamingResponse(
        pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


@app.get("/invitation/{invite_token}.pdf")
def invitation_pdf(invite_token: str):
    return build_invitation_response(invite_token, "quick")


@app.get("/invitation-rich/{invite_token}.pdf")
def invitation_rich_pdf(invite_token: str):
    return build_invitation_response(invite_token, "rich")
