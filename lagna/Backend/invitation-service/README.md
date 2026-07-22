# Lagna Invitation PDF Service

This backend generates a personalized invitation PDF on demand. It does not store a PDF for each guest.

## What It Does

1. Receives a request such as:

   ```text
   /invitation/INV-21a2e676d2b84b18.pdf
   ```

2. Reads that guest from Google Apps Script.
3. Confirms RSVP is `Done`.
4. Confirms `Check-in Token` exists.
5. Generates a QR code using:

   ```text
   https://inderdipshere.github.io/lagna/checkin.html?checkin=CHK-...
   ```

6. Merges:
   - `assets/Invitation_fixed.pdf`
   - `assets/Invitation_template.pdf`

7. Streams the final PDF directly to the guest.

## Required Environment Variables

```text
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/.../exec
SITE_URL=https://inderdipshere.github.io/lagna
```

## Local Test

```bash
cd /Users/inderdipshere/MEGAsync/Lagna/Backend/invitation-service
GOOGLE_SCRIPT_URL="https://script.google.com/macros/s/AKfycbzFTHa53ENMn0udXLJ1O7IqqgkxJ4cTEHNZFm8wkpu91gHT-s3Ud7uBzqfCW4qd_gPb/exec" \
SITE_URL="https://inderdipshere.github.io/lagna" \
uvicorn app:app --reload --port 8080
```

Open:

```text
http://localhost:8080/health
http://localhost:8080/invitation/INV-21a2e676d2b84b18.pdf
```

## Deploy

Good options:

- Google Cloud Run
- Render
- Railway

For Cloud Run, deploy this folder as a Docker service and set the two environment variables above.

After deployment, the website should point to:

```text
https://YOUR-BACKEND-DOMAIN/invitation/INV-....pdf
```
