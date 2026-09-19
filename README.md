# ClipMint — Web Dashboard

The customer-facing Next.js app (landing + dashboard). Deployed on Vercel at
`clipmint.novamintnetworks.in`.

This repo is **website-only** — it contains no processing code. The pipeline
(clip extraction, transcription, caption rendering) runs in
`TeraBhaiHoon/ClipMint-NovaMint` via GitHub Actions and is synced here
automatically on every push to that repo's `dashboard/` folder.

## Dev
    npm install
    npm run dev
