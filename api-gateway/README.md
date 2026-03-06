# ClipMint API Gateway

Cloudflare Worker-based API gateway for ClipMint.

## Setup

```bash
npm install
npx wrangler login
npx wrangler deploy
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/jobs` | Submit a new video processing job |
| `GET` | `/api/v1/jobs` | List user's jobs |
| `GET` | `/api/v1/jobs/:id` | Get job status and details |
| `GET` | `/api/v1/jobs/:id/clips` | Get clips for a job |
| `GET` | `/api/v1/health` | Health check |

## Authentication

Include your API key in the `Authorization` header:

```
Authorization: Bearer cm_live_your_api_key_here
```
