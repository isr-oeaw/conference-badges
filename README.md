# Conference Badges

Docker-based web app for designing conference badges and exporting A4 PDF sheets from participant CSV/Excel files.

## Features

- Passwordless login via magic link (only `@oeaw.ac.at` addresses)
- Private badge projects per user
- Fabric.js editor with logo upload, text placement, and standard Name/Institution fields
- PDF export: A4 portrait, 2 columns × 5 rows (10 badges per page)

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

Open http://localhost:3000. Magic-link emails are sent via the SMTP server configured in `.env`.

## GitHub Container Registry

Publishing a GitHub Release builds and pushes a Docker image to GitHub Packages:

```bash
docker pull ghcr.io/isr-oeaw/conference-badges:latest
```

Prefer a version tag from the release, for example `ghcr.io/isr-oeaw/conference-badges:1.0.0`.

Private packages need a GitHub token:

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

## Local development

```bash
cd app
npm install
npm run dev
```

- App: http://localhost:5173 (Vite, proxies `/api` to the server)
- API: http://localhost:3000

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` in `.env` so login emails can be sent. Use port `587` with `SMTP_SECURE=false` (STARTTLS) or port `465` with `SMTP_SECURE=true`.

## Environment

See [.env.example](.env.example).

## License

GPL-3.0 — see [LICENSE](LICENSE).
