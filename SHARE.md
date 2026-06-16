# TestFlow TCM — How to Run

You have received a zip with:

```
docker-compose.yml
.env.example
testflow-images-<version>.tar.gz   # prebuilt Docker images (no source code)
README-RUN.md                      # this file
```

You do **not** need Node.js, PostgreSQL, or Redis installed. Everything runs in Docker.

---

## 1. Prerequisites

Install **Docker Desktop** (includes `docker` and `docker compose`):

- macOS / Windows: <https://www.docker.com/products/docker-desktop/>
- Linux: install `docker-ce` + `docker-compose-plugin` from your distro's docs.

Verify:

```bash
docker --version
docker compose version
```

---

## 2. Load the images

From the folder where you unzipped the package:

```bash
docker load -i testflow-images-*.tar.gz
```

You should see two images loaded:

```
Loaded image: testflow-backend:<version>
Loaded image: testflow-frontend:<version>
```

---

## 3. Configure environment

```bash
cp .env.example .env
```

Open `.env` in any editor and **change these two required values** to long random strings (32+ chars):

```
JWT_SECRET=...
JWT_REFRESH_SECRET=...
```

Quick way to generate secrets:

```bash
# macOS/Linux
openssl rand -hex 48
```

Optional tweaks:

- `APP_PORT` — the port to expose the app on (default `8080`)
- `DB_PASSWORD` — database password (only used internally)

---

## 4. Start the app

```bash
docker compose up -d
```

First start pulls `postgres:15-alpine` and `redis:7-alpine` and initializes the database (may take ~30s).

Check status:

```bash
docker compose ps
docker compose logs -f backend   # watch backend logs
```

Open the app: <http://localhost:8080>

API / Swagger docs: <http://localhost:8080/api/docs>

---

## 5. Default login (seed credentials)

If the seeded demo organization is in the image, log in with:

| Role      | Email                  | Password      |
|-----------|------------------------|---------------|
| Admin     | admin@testflow.dev     | Admin@1234    |
| QA Lead   | qalead@testflow.dev    | QaLead@1234   |
| Tester    | tester@testflow.dev    | Tester@1234   |
| Viewer    | viewer@testflow.dev    | Viewer@1234   |

> If login fails with "invalid credentials", the DB is empty. Ask the sender to run the seed script, or contact them for a fresh DB dump.

---

## 6. Stopping / restarting

```bash
docker compose stop          # stop containers (keeps data)
docker compose start         # start again
docker compose restart       # restart
docker compose down          # stop AND remove containers (keeps volumes/data)
docker compose down -v       # ALSO delete the database volume (nuke everything)
```

---

## 7. Troubleshooting

**Port 8080 already in use**
Change `APP_PORT=8090` in `.env`, then `docker compose up -d`.

**Backend keeps restarting**
Check logs: `docker compose logs backend`. Most common cause: `JWT_SECRET` / `JWT_REFRESH_SECRET` not set.

**"Cannot connect to Docker daemon"**
Start Docker Desktop.

**Reset everything**
```bash
docker compose down -v
docker compose up -d
```

---

## 8. What's inside (for reference)

| Service    | Image                             | Internal Port | External |
|------------|-----------------------------------|---------------|----------|
| frontend   | testflow-frontend:\<version\>     | 80            | 8080     |
| backend    | testflow-backend:\<version\>      | 3000          | —        |
| postgres   | postgres:15-alpine                | 5432          | —        |
| redis      | redis:7-alpine                    | 6379          | —        |

Only the frontend is exposed to your machine. The frontend nginx proxies `/api/*` to the backend on the internal Docker network.
