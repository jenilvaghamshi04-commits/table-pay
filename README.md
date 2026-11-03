# Salon Desk

Salon management demo: customer records, barber/service selection, discounts, invoices, CSV export, PDF printing, and WhatsApp sharing.

## Existing Render Docker service

The repository now includes a Dockerfile and dependency-free HTTP server. In the existing service settings:

- Branch: main
- Root Directory: blank (repository root)
- Dockerfile Path: ./Dockerfile
- Docker Command: blank (use the image CMD)
- Health Check Path: /health

Choose Manual Deploy > Deploy latest commit. The server binds to 0.0.0.0 and reads Render's PORT environment variable, defaulting to 10000. No build or start command override is required. For a native Python web service instead, use start command `python server.py`.

## Static Site alternative

The included render.yaml still supports a Static Site Blueprint, with build command `mkdir -p dist && cp index.html dist/index.html` and publish directory `dist`. Static Sites need no start command. Choose either deployment approach; a separate site is not needed to fix the existing Docker service.

## Local use

Run `python3 server.py`, then visit http://localhost:10000. Or open index.html directly.

## Demo limitations

Records stay in localStorage in the browser where they were entered. Devices and domains do not share records. There is no server database, authentication, automatic WhatsApp delivery, or tax calculation. WhatsApp opens a prepared invoice for manual sending. Print / Save PDF uses the browser print dialog.
