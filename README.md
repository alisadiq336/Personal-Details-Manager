# Personal Details Manager

A full-stack personal details manager with a React/Vite client, Express API, MongoDB storage, and a Netlify serverless deployment target.

## Project Structure

```text
.
client/                 React + Vite frontend
server/                 Express API, MongoDB access, routes, tests
netlify/functions/      Netlify serverless API adapter
netlify.toml            Netlify build, functions, and redirects
package.json            Workspace scripts
.env.example            Required environment variables
```

## Setup

Use either a local MongoDB install or a hosted MongoDB Atlas connection string.

```bash
npm install
copy .env.example .env
npm run dev
```

Set `MONGODB_URI` in `.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=personal_details_manager
```

The API creates indexes automatically and inserts the default rows when the MongoDB collection is empty.

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

Set the variables from `.env.example` in Netlify. For production, use a hosted MongoDB Atlas `MONGODB_URI` and set `CLIENT_ORIGIN` to the deployed site URL, for example `https://personal-details-manager.netlify.app`.
