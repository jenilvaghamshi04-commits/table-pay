# Salon Desk

Responsive salon management demo with customer records, barber and service selection, discounts, saved invoices, CSV export, print/PDF, and WhatsApp sharing.

## Run locally

Open `index.html` in a browser, or run `python3 -m http.server 8000` and visit http://localhost:8000.

## Deploy on Render

Use the repository's `render.yaml` with Render Blueprints, or create a Static Site with:

- Build command: `mkdir -p dist && cp index.html dist/index.html`
- Publish directory: `dist`
- No start command is needed.

Deploy: https://dashboard.render.com/select-repo?type=blueprint&repo=https://github.com/jenilvaghamshi04-commits/table-pay

## Demo limitations

Records persist in browser localStorage only. Different browsers, devices, and domains have separate records. Clearing browser storage deletes them. This demo has no server database, authentication, automatic WhatsApp delivery, or tax calculation. WhatsApp sharing opens a prepared message that the user reviews and sends. Print / Save PDF uses the browser print dialog. Do not use for production customer records until access controls, backups, and durable server storage are implemented.
