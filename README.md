# Salon Desk — multi-salon platform

One owner console, separate salon client logins, server-enforced tenant access, server-stored salon records, session revocation, forced temporary-password changes, salon dashboards, invoices, memberships, branding and themes.

## Hosted application

- `/admin`: owner console. On the hosted Sites app, choose **Platform owner · Sign in with ChatGPT** using the account that owns the Site.
- Create a salon with its client email and a temporary password (12+ characters). Supply credentials directly to that client. First login requires a replacement password.
- A salon login opens only its assigned workspace.
- Suspend or Remove access revokes sessions immediately on the server. An open app checks every 15 seconds. Removal archives the salon and retains records; Reactivate restores access.
- Admins may open an active salon workspace from the owner console. Clients have no salon selector and cannot call admin endpoints.
- Monthly fees are configured charges, not payment processing. Salon revenue and package accounting remain separate from the owner's subscription fees.

The hosted app uses Cloudflare D1. Owner identity uses the platform's authenticated ChatGPT identity; client passwords use salted PBKDF2 hashes. Server sessions are hashed in storage, sent in HttpOnly/SameSite cookies, and validated against account/workspace status on every API call. State writes use optimistic versions and pause on conflicts rather than silently overwrite another device.

## Free Render deployment with Cloudflare D1

Render serves the frontend and forwards same-origin API requests to the existing Cloudflare Worker. All accounts, sessions and salon records remain in Cloudflare D1; Render needs no disk. This shares the Cloudflare database instead of creating a second one.

1. Use Docker runtime with Dockerfile `./Dockerfile`, build context `.`, and no Docker command override.
2. Select Render's Free instance. No persistent disk is needed.
3. Set `SALON_API_ORIGIN=https://table-pay.jenilvaghamshi04.workers.dev` (also the Render default in code).
4. Set health check path `/health` and deploy the latest commit.
5. Open `/admin`. Use the credentials created in the Cloudflare database. Configure initial `OWNER_EMAIL` and `OWNER_PASSWORD` secrets on Cloudflare, not Render. The password must have at least 12 characters; first login requires a replacement. Changing secrets does not reset an existing account.

`render.yaml` declares a Free service without a disk. Existing services must select Free in Render themselves; pushing code does not change billing. The Cloudflare backend must stay deployed and healthy. Free hosting remains subject to provider quotas and idle startup delays.

The Render process never opens a local database. Existing local Render SQLite records are not automatically migrated into D1. Preserve/export any existing data before switching. Direct Cloudflare and Render logins use separate browser cookies but access the same accounts and records.

## Local development

Requires Node 24+ with built-in `node:sqlite`. Set `OWNER_EMAIL` and `OWNER_PASSWORD` in your local environment, then `npm start`. Open http://localhost:10000/admin. Local data is stored under ignored `data/`. `PORT` and `DATA_DIR` can override defaults. No dependencies need installation.

## Tests and builds

- `npm test`: real HTTP tests for tenant isolation, admin authorization, password changes/resets, suspension, session revocation, archival, origin validation, rate limits, optimistic writes and stored data preservation.
- `npm run build`: creates the Sites Worker artifact with embedded HTML and API. `.openai/hosting.json` binds `DB`; SQL migrations are under `drizzle/`.
- `node scripts/validate-artifact.mjs`: validates the deployable Worker.

## Existing browser records

Old browser records are not automatically attached to a new client. In the owner console, create the correct salon and open its workspace. The owner-only **Import previous browser records** action in Settings can import the original browser workspace into an empty cloud workspace. Use the same browser and original site domain. Import is blocked when cloud invoices or packages already exist. Other legacy browser profiles require a separate migration; they are not silently merged.

## Operational limits

- Server records sync across signed-in devices. The interface shows pending saves and blocks after a network/conflict failure. Wait for “Saved to server” before closing the tab.
- Current workspace document limit: 1.5 MB. This is an initial implementation using versioned tenant documents, not unlimited database storage. Plan a relational record migration as usage grows.
- Invoice links remain self-contained customer snapshots with masked phone numbers. Already-shared snapshots cannot be revoked or edited by suspending the salon. Only workspace access is revoked. Keep customer links private.
- WhatsApp opens a prepared message for manual sending. There is no automatic WhatsApp delivery, subscription billing integration, tax calculation, or verified payment gateway.
- Back up the production database and test recovery before onboarding paying clients. Keep Node runtime and dependencies updated.

## Cloudflare Git deployment

The `table-pay` Worker uses `wrangler.jsonc` with binding `DB` connected to the existing `tablepay` D1 database. Build command: `npm run build`. Deploy command: `npx wrangler deploy`. Production branch: `main`; root directory: `/`.

The initial database tables were created manually in the D1 console. Do not replay the initial CREATE TABLE migration against this populated schema. Configure runtime secrets `OWNER_EMAIL` and `OWNER_PASSWORD` on the Worker (Production), then open `/admin` using those owner credentials. The initial password must contain at least 12 characters and must be changed at first login. Do not commit secret values.
