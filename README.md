# URL Shortener

**A small distributed-systems URL shortener** — create short links, redirect on the hot path, and record clicks asynchronously. Built to talk through in backend intern interviews: caching, rate limits, OAuth sessions, and event-driven analytics.


|              |                                                                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Problem**  | A naive shortener hits the database on every 302, mixes analytics into the redirect, and treats every logged-in user as one shared pool of links.          |
| **Solution** | Cache-aside Redis on resolve, sliding-window rate limits, Google OAuth + Redis sessions with per-user `urls.user_id`, Kafka click events off the 302 path. |
| **Stack**    | Express 5 · MySQL 8 · Redis 7 · Kafka · Passport Google OAuth 2.0 · vanilla HTML/JS                                                                        |


---

## Architecture at a glance

No diagrams in this README. Request flow:

```text
Browser
  → Rate limit (Redis)
  → Express (auth / redirect)
      → Cache-aside Redis   url:{shortCode}
      → MySQL               users, urls, clicks
  → Kafka (click events, after a successful resolve)
      → click consumer → INSERT clicks
```


| Layer             | Role                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| **Frontend**      | Login + playground only — Google sign-in, exercise the API, show `X-Resolve-Time-Ms` / `X-Cache-Status` |
| **API (Express)** | Sessions, ownership, shorten CRUD, public `GET /:shortCode` → 302                                       |
| **MySQL**         | Source of truth for users, owned URLs, click rows                                                       |
| **Redis**         | Three jobs, one broker: sessions, URL cache, rate-limit counters                                        |
| **Kafka**         | Click analytics; producer must not block the redirect                                                   |


### Why this shape


| Choice                           | Why                                                                                                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Redis cache-aside**            | Redirect is the hot read. Miss → MySQL → `SET` + TTL. Writes warm / invalidate the same key.                                                                         |
| **Sliding-window rate limit**    | Separate policies for create vs redirect, counters in Redis so they stay correct if you later run more than one Node process.                                        |
| **Kafka clicks**                 | A 302 should not wait on `INSERT clicks`. Publish after resolve; a separate consumer writes MySQL.                                                                   |
| **Google OAuth + Redis session** | First-party cookie (`sid`, 7 days). No JWT: the playground and API share origin; a Bearer token would be a second source of truth.                                   |
| `urls.user_id`                   | Authentication is not authorization. Create / update / delete / stats are scoped to `req.user.id`. `GET /:shortCode` stays public so short links work without login. |
| **MySQL**                        | Relational users ↔ urls ↔ clicks;                                                                                                                                    |
| **Docker Compose for infra**     | Redis + Kafka (+ optional MySQL) locally. Day-to-day: `docker compose up -d` then `npm run dev` against Workbench or Compose MySQL.                                  |


---

## Quick start

**Prerequisites:** Node.js 18+, Docker Desktop, a MySQL database (`url_shortener`) with `users`, `urls` (`user_id`), and `clicks`. Google OAuth 2.0 Web client (free).

### 1. Infra

From the repo root:

```bash
docker compose up -d
```

Starts Redis (`6379`), Kafka (`9092`), and a Compose MySQL on host port **3307**. If you already use MySQL Workbench on **3306**, point `.env` at that instance and ignore Compose MySQL.

### 2. App env

```bash
cp .env.example .env
```

Set at least `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PUBLIC_BASE_URL` (must match the port you listen on), and `DB_*` for **your** MySQL. `KAFKA_ENABLED=true` and `KAFKA_BROKERS=localhost:9092` for a host-run API.

Google Cloud Console → OAuth client → Authorized redirect URI:

`{PUBLIC_BASE_URL}/auth/google/callback`

Example: `http://localhost:6001/auth/google/callback` if `PORT=6001`.

### 3. Run

```bash
npm install
npm run dev
```

Open `{PUBLIC_BASE_URL}` → Google login → playground.

Optional click consumer (second terminal):

```bash
npm run consumer:clicks
```

Health: `GET /health`.

---

## API

Auth: cookie session after Google. Data routes under `/api/v1/data` require login. Redirect does not.


| Method   | Path                               | Notes                                                       |
| -------- | ---------------------------------- | ----------------------------------------------------------- |
| `GET`    | `/auth/google`                     | Start OAuth                                                 |
| `GET`    | `/auth/google/callback`            | Then redirect `/playground`                                 |
| `GET`    | `/api/v1/auth/me`                  | Current user                                                |
| `POST`   | `/logout`                          | Destroy Redis session                                       |
| `POST`   | `/api/v1/data/shorten`             | Body `{ "longURL": "https://..." }` — owned by session user |
| `GET`    | `/api/v1/data/shorten/:code`       | Metadata if you own the code                                |
| `PUT`    | `/api/v1/data/shorten/:code`       | Update `longURL` if you own it                              |
| `DELETE` | `/api/v1/data/shorten/:code`       | 204 if you own it                                           |
| `GET`    | `/api/v1/data/shorten/:code/stats` | Click counts if you own it                                  |
| `GET`    | `/:shortCode`                      | Public 302 + Kafka click event                              |


Errors use `{ success: false, error: { code, message, details } }` (e.g. `RATE_LIMIT_EXCEEDED` + `Retry-After`).

Create / redirect timing: `X-Resolve-Time-Ms`, `X-Cache-Status` (`HIT` / `MISS` / `NONE` / `SKIP` / `WARM`).

---

## Current scope

**In scope**

- Shorten + public redirect with Redis cache-aside
- Redis sliding-window rate limits (create vs redirect)
- Google OAuth 2.0, Redis sessions, per-user URL ownership
- Kafka click pipeline + stats for owners
- Local Docker infra; optional `docker compose --profile full up --build` (API + consumer in Docker — different MySQL than Workbench)

**Out of scope for this phase**

- DB sharding / multi-instance Nginx
- Production cloud deploy (AWS RDS, paid VPS)
- Exactly-once Kafka / full test suite

---

## Layout


| Path                                 | Role                                                         |
| ------------------------------------ | ------------------------------------------------------------ |
| `backend/server.js`                  | Boot: MySQL ping, Redis, Kafka producer, listen              |
| `backend/app.js`                     | Routes, session, static frontend, public redirect            |
| `backend/config/`                    | DB, Redis, Kafka, session, Passport, public base URL         |
| `backend/services/`                  | Resolve (cache-aside), cache keys, rate limit, click publish |
| `backend/middleware/`                | Auth gate, create/redirect rate limits                       |
| `backend/api/v1/`                    | Auth + shorten handlers                                      |
| `backend/consumers/clickConsumer.js` | Kafka → `clicks`                                             |
| `backend/sql/`                       | `CREATE TABLE` scripts for a **new** MySQL (Compose init)    |
| `frontend/`                          | `login` + `playground`                                       |
| `docker-compose.yml`                 | MySQL, Redis, Kafka; profile `full` adds `api` + `consumer`  |


---

## Interview talking points

- Redirect path: rate limit → cache-aside → 302 → async click event (hot path vs analytics).
- Shared Redis counters if you scale out API processes.
- OAuth vs JWT: session cookie for a same-origin app; 7-day `maxAge`, logout deletes the Redis key.
- Ownership: `user_id` on write/read-metadata; short links remain world-readable.

