# Ipsita & Asish — Engagement Invitation | Project Arthouse

This is the **Ipsita-first** invitation, hosted separately from the Asish-first invitation.

## Publication URL

https://www.projectarthouse.com/invites/ipsita-asish-eng/

## Deploy to your existing GitHub Pages repository

1. Extract the deployment ZIP **before uploading**.
2. In `rootln/projectarthouse`, switch to `main` and choose **Add file → Upload files**.
3. Drag the extracted **`invites` folder** from this package into the GitHub upload area. GitHub must show file paths beginning `invites/ipsita-asish-eng/` — not a `.zip` file and not `ipsita-asish-deploy/`.
4. Commit with `Add Ipsita & Asish engagement invitation`.
5. Once GitHub Pages builds, check the above publication URL and `https://www.projectarthouse.com/invites/ipsita-asish-eng/assets/og-image.jpg`.
6. Share the URL in WhatsApp as a text message and wait for its preview to load before sending. WhatsApp caches previews; a changed preview can take time to update.

## Included changes vs original ZIP

- Page title, content and ordering **preserved** as Ipsita-first.
- Canonical URL, `og:url`, absolute `og:image` and Twitter image added for WhatsApp/social sharing.
- Image metadata set to **1200 × 630** matching the bundled preview image.
- Project Arthouse GTM container `GTM-N7SDTPHR` added to record visits, assuming the GA4 tag is configured/published in GTM.
- Local JS, images and fonts remain self-contained under this invitation folder; the media on Cloudinary still loads from its original external URLs.

## Important setup checks

In `index.html`, look near the end for `window.CONFIG`. Both `time` and `rsvpWhatsApp` are blank in the supplied version. You can add the correct ceremony time and RSVP WhatsApp number if intended. If `rsvpWhatsApp` is blank, WhatsApp's recipient chooser opens instead of sending to a designated number.

This site uses a Google Maps JavaScript API key. Restrict it in Google Cloud Console to your own site, including `https://www.projectarthouse.com/*`, and any other authorized domain(s) actually used.

Don't overwrite `invites/asish-ipsita-eng/`: that is the existing separate version.

## Files

- `index.html`: single-page invitation
- `assets/art/`: invitation ornaments and seals
- `assets/fonts/`: self-hosted fonts
- `assets/js/`: animations and interactions
- `assets/og-image.jpg`: share-preview image
