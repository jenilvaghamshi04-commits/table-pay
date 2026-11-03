# Salon Desk — Render without login

The Render application opens directly into the salon workspace. It stores records in browser localStorage and requires no login, paid disk, Cloudflare connection or external database.

## Deploy on Render

Use the Free Docker web service, Dockerfile `./Dockerfile`, context `.`, no command override, health check `/health`. Deploy the latest main commit. Both `/` and `/admin` open the salon workspace. No environment variables are required except Render's automatic `PORT`.

Existing OWNER_EMAIL, OWNER_PASSWORD, DATA_DIR, SALON_API_ORIGIN and DATABASE_URL variables are unused by this Render version.

## Storage and backups

Records stay in the current browser and site origin. Different browsers, devices and domains have separate records. Clearing browser data deletes them. Export JSON backups regularly using **Export backup**. Cloudflare/SQLite records are not automatically imported. The public site never exposes the old server database; API routes are disabled. Multi-salon account creation, access suspension and sign-in are unavailable in this version.

Invoices, revenue dashboard, customer records, appointments, barber progress, service settings, memberships and branding remain in the salon UI.

## Local use and tests

Node 24+: `npm start`, then open http://localhost:10000. Run `npm test` for the Render startup and browser-storage checks.

## Separate Cloudflare source

The retained Worker build and server-auth modules are legacy Cloudflare source. Render no longer uses them. Running `npm run build` still builds that separate Worker; it does not change Render's browser-local storage mode.
