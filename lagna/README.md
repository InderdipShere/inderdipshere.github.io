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

## Private WhatsApp invitation sender

The mobile sender is available at:

`https://inderdipshere.github.io/lagna/sender.html`

It deliberately sends one family at a time. WhatsApp opens the correct number from the `Phone` column, while the sender manually attaches the invitation video stored on the phone. A second action opens a personalized message containing the family invitation URL.

### One-time Google Apps Script setup

1. Copy `google-apps-script/Code.gs` into the Apps Script project attached to the guest-management spreadsheet.
2. In Apps Script, run `setupInvitationSender()` once. It creates a private eight-digit PIN and writes it to the execution log.
3. Authorize the spreadsheet changes when Google asks. This adds the sender tracking columns and their dropdown validation.
4. Create a new web-app deployment (or update the existing deployment) using **Deploy → Manage deployments → Edit → New version → Deploy**.
5. Keep the existing web-app access setting required by the public RSVP site. Sender data is separately protected by the private PIN.

Do not put the PIN in this repository, a WhatsApp message, or the public website source. Enter it only through the sender page on Inderdip’s and Deepali’s phones.

### Sheet fields used

Existing fields:

- `Family ID`
- `Family Name`
- `Side` (`Groom` or `Bride`)
- `Category`
- `Contact Person`
- `Phone`
- `Invite Token`

Automatically added tracking fields:

- `Invitation Send Status`
- `Video Sent`
- `Link Sent`
- `Invitation Sent By`
- `Invitation Sent At`
- `Invitation Send Notes`

### Safe test sequence

1. Open `sender.html` on Inderdip’s phone and choose the Groom side.
2. Search for the intended test family/contact.
3. Confirm that the displayed family, contact, and last four digits match before opening WhatsApp.
4. Send the saved video and tap **I sent the video**.
5. Open and send the prepared personalized message, then tap **I sent the message**.
6. Only then tap **Mark invitation complete**.

For local UI development, `sender.html?preview=1` displays a fictional record only when the hostname is `localhost` or `127.0.0.1`. It never calls WhatsApp or updates Google Sheets.

Run the backend mapping and privacy checks with:

`node google-apps-script/Code.test.cjs`

## Next development stages

1. Replace sample data in `data.js` with your real Google Sheet data.
2. Add Google Apps Script for RSVP create/update.
3. Generate QR codes using check-in tokens, not Family IDs.
4. Add upload links for photos and videos.
5. Add a proper AI Companion later.
