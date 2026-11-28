# Deployment guide

1. Provision MongoDB Atlas (replica set) and managed Redis.
2. Generate a production RSA key pair. Store the private key in the host secret manager. Do not commit PEM files.
3. Set backend env: `NODE_ENV=production`, `MONGODB_MASTER_URI`, `REDIS_URL`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `JWT_ISSUER`, `JWT_AUDIENCE`, `FRONTEND_URL`, `SEED_USER_PASSWORD` (or replace seeded users).
4. Deploy the API (`backend/Dockerfile`, port 8000).
5. Confirm `GET /health`.
6. Build the frontend with `VITE_API_URL` pointing at the public API. Vite variables are visible in the browser.
7. Deploy static files (`frontend/Dockerfile` uses nginx with SPA fallback).
8. Allow only the frontend origin in CORS.
9. Enable HTTPS on both sides.

Suggested hosts: Render/Fly for the API, Vercel/Netlify for the UI, MongoDB Atlas, Redis Cloud.
