# Personal Details Manager

A full-stack personal details manager with a React/Vite client, Express API, PostgreSQL storage, and a Netlify serverless deployment target.

## Project Structure

```text
.
client/                 React + Vite frontend
server/                 Express API, PostgreSQL access, routes, tests
netlify/functions/      Netlify serverless API adapter
netlify.toml            Netlify build, functions, and redirects
package.json            Workspace scripts
.env.example            Required environment variables
```

## Setup

Use either a local PostgreSQL database or a hosted PostgreSQL connection string.

```bash
npm install
copy .env.example .env
npm run dev
```

Set `DATABASE_URL` in `.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/personal_details_manager
```

Create the database first if it does not already exist. The API creates the `personalDetails` table, indexes, and default rows automatically when the table is empty.

Client: `http://localhost:5173`
API: `http://localhost:4000/api`

## Useful Scripts

```bash
npm run dev          # Start client and server
npm run dev:client   # Start only the frontend
npm run dev:server   # Start only the API
npm test             # Run API tests and client build
```

## Deployment

This repo is configured for Netlify:

- `client/` builds to `client/dist`
- `netlify/functions/api.js` wraps the Express app
- `/api/*` redirects to the Netlify function

Set the variables from `.env.example` in Netlify. For production, use a hosted PostgreSQL `DATABASE_URL` and set `CLIENT_ORIGIN` to the deployed site URL, for example `https://personal-details-manager.netlify.app`.

If your PostgreSQL provider requires SSL, set `PGSSLMODE=require` along with `DATABASE_URL`.
