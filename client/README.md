# CRM client

React (Vite) + Ant Design front end for the study-abroad consultancy CRM.

## Run it

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

## Mock mode vs real API

`VITE_USE_MOCK=true` (default in `.env.example`) lets you sign in and browse without a backend.
Sign in with any of these (password `password123`), or use the quick-fill buttons on the login page:

| Role | Email |
|---|---|
| Admin | admin@example.com |
| Counselor | counselor@example.com |
| Front desk | frontdesk@example.com |

Set `VITE_USE_MOCK=false` to call the real API. In dev, Vite proxies `/api` to `http://localhost:4000` (see `vite.config.js`; change the port if the server differs).

## What the client expects from the backend

Per the API contract:

- `POST /auth/login` returns `{ token, user: { id, fullName, email, role, permissions: [{ module, action, scope }] } }`
- `GET /auth/me` returns that same `user` object directly (not wrapped)
- Errors come back as `{ error: { code, message, details } }`
- Send the token as `Authorization: Bearer <token>`; a `401` on any other call signs the user out

## Structure

```
src/
  api/          axios client (token, error normalising), auth calls, ApiError
  auth/         AuthContext (user, can(), scopeOf()), ProtectedRoute
  components/   Can: show children only if the user has a permission
  config/       modules.jsx: sidebar + routes come from this one list
  layouts/      AppLayout: sidebar filtered by permission, header, sign out
  mocks/        mock users and permissions (mirror schema.sql seed data)
  pages/        Login, Dashboard, placeholders, 403, 404
  theme.js      colors, app name, role labels
```

## Adding a real page

1. Build the page, e.g. `src/pages/LeadsPage.jsx`.
2. Register it in `PAGES` in `src/App.jsx` with the module's key: `leads: <LeadsPage />`.
3. Guard actions inside it: `<Can module="leads" action="create"><Button>New lead</Button></Can>`.

Routes use `/leads/*`, so the page can handle `/leads/12` with its own nested `<Routes>`.

## Permissions in the UI

- `can('leads', 'create')` from `useAuth()` returns true or false.
- `scopeOf('leads', 'view')` returns `'own'` or `'all'`, handy for labels like "My leads".
- Hiding a button is only for tidiness. The server enforces every permission.
