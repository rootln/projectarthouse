# Asish & Ipsita – Engagement invitation on Project Arthouse

Public URL: https://www.projectarthouse.com/invites/asish-ipsita-eng/
Also works using https://projectarthouse.com/invites/asish-ipsita-eng/ (redirects to www).

## Deployment

This directory is intended to go inside the EXISTING GitHub Pages repository:
https://github.com/rootln/projectarthouse

Keep the files under:
`invites/asish-ipsita-eng/index.html`
`invites/asish-ipsita-eng/assets/` (all of its subfolders).

Do not upload these files to the repository root; do not replace root index.html or CNAME.
The site root already has .nojekyll so no second copy is necessary.

If using Git locally, run from a fresh clone of the Project Arthouse repository:

    mkdir -p invites/asish-ipsita-eng
    cp -R /path/to/downloaded/invites/asish-ipsita-eng/. invites/asish-ipsita-eng/
    git add invites/asish-ipsita-eng
    git commit -m "Add Asish & Ipsita engagement invitation"
    git push origin main

## Before guests arrive

- The ceremony time is currently blank in `window.CONFIG.time` in `index.html`.
  Fill with 24-hour IST, for example `18:30`, if confirmed by the family.
- The WhatsApp RSVP receiver is currently blank in `window.CONFIG.rsvpWhatsApp`.
  If left blank, guests can choose a contact instead of replies being addressed to one number.
- The Google Maps JavaScript key in `window.CONFIG.venue.mapsKey` must be restricted
  to https://www.projectarthouse.com/* in Google Cloud Console (and API restricted to Maps JavaScript API).
  If the key does not work, the site has an iframe map fallback.
- The page uses photographs, a film, and background music hosted on Cloudinary.
  Those links need to remain active; the included art, fonts, and JS are local.
- Ask the owner to verify rights to use and publicly host the song and photos.

The OG/Twitter share preview points to the absolute website URL, while all local resources
keep relative paths suitable for this nested folder.

When posting a link in WhatsApp, test its preview from a new chat. Social apps sometimes
cache old preview images.
