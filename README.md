# Personal Details Manager

## Deploying to Vercel

This project is configured for Vercel with:

- `client/` built as the static Vite app
- `api/` exposing the existing Express server as a Vercel serverless function
- `/api/*` requests routed to the serverless API

Set these environment variables in Vercel before deploying:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=use-a-strong-password
JWT_SECRET=use-a-long-random-secret
DATABASE_URL=postgres://user:password@host:5432/database?sslmode=require
CLIENT_ORIGIN=https://your-vercel-domain.vercel.app
```

If the frontend and API are deployed in the same Vercel project, leave `VITE_API_BASE_URL` unset so the app uses same-origin `/api`.
If they are deployed as separate Vercel projects, set `VITE_API_BASE_URL` on the frontend project to the backend API URL, for example:

```env
VITE_API_BASE_URL=https://your-backend-vercel-domain.vercel.app/api
```

In that separate-project setup, `CLIENT_ORIGIN` on the backend project must exactly match the frontend URL, for example `https://personal-details-manager-frontend.vercel.app`.

Use a hosted PostgreSQL database for `DATABASE_URL`. The local Docker database in `docker-compose.yml` is only for local development.
