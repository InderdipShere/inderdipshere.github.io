# Wedding Website Starter

Theme:
Pradipkumar Smruti Vivaah Sohala — Carrying Forward a Legacy, From One Generation to the Next.

## What is included

- `index.html` — main website
- `style.css` — design
- `data.js` — guest, schedule and ceremony data
- `app.js` — website logic and simple assistant
- `README.md` — setup instructions

## How to test locally

Open `index.html` in a browser.

Try guest-specific pages:

- `index.html?invite=INV-d2b2cf6c72ff4a8f`
- `index.html?invite=INV-ba926ae3f36d462f`

Each private invitation should point to a link like:

`https://yourname.github.io/wedding-site/?invite=INV-d2b2cf6c72ff4a8f`

Open `index.html` without an invite token to test the general invitation page.

## Recommended deployment

Use GitHub Pages.

1. Create a GitHub repository, for example `wedding-site`.
2. Upload these files.
3. Go to repository Settings → Pages.
4. Publish from the main branch.
5. Your site will become live.

## Next development stages

1. Replace sample data in `data.js` with your real Google Sheet data.
2. Add Google Apps Script for RSVP create/update.
3. Generate QR codes using check-in tokens, not Family IDs.
4. Add upload links for photos and videos.
5. Add a proper AI Companion later.
