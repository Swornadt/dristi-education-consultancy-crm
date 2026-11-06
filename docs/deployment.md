# Deployment

## Run everything locally

```bash
cp .env.example .env      # then set POSTGRES_PASSWORD and JWT_SECRET
docker compose up --build
```

Open http://localhost:8080. The database runs the migrations in `server/db` on first start only. To start again from scratch: `docker compose down -v`.

## Containers

| Container | Image | Role |
|---|---|---|
| `web` | nginx serving the built React app | Static files, single-page-app fallback, proxies `/api` to the API, allows 10 MB uploads |
| `api` | Node 20 | Express API, runs as a non-root user, uploads on a volume |
| `db` | postgres:16 | Data on a named volume |

## Hosting the images

| Where | How |
|---|---|
| A VPS | Install Docker, copy the repo, run the same compose file, and put HTTPS in front (Caddy is the simplest) |
| A container platform (Render, Fly.io, Cloud Run and similar) | Deploy `server` and `client` as two services from their Dockerfiles, and use a managed Postgres such as Neon |

When the front end and API are on different hosts, build the client with `VITE_API_URL` set to the API's full address and set `CORS_ORIGIN` on the API to the front end's address.

## Production checklist

- Strong `JWT_SECRET` and database password, kept out of git.
- Uploads on a volume or an object store, never the container's own filesystem.
- Backups of the database (`pg_dump`) and of uploaded files.
- A seed or reset script for the demo accounts.
