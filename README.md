# Bookstore API

A Nest.js book catalog (authors, categories, book CRUD) with Prisma and local PostgreSQL.

## Contents

- [Requirements](#requirements)
- [Database connection](#database-connection)
- [Run](#run)
- [Run with Docker](#run-with-docker)
- [Rate limit](#rate-limit)
- [Observability](#observability)
  - [Check it](#check-it-1)
- [Book events](#book-events)
  - [Check it](#check-it)

## Requirements

- Node.js 22+
- PostgreSQL already installed and running

This README does not cover installing Postgres.

## Database connection

1. Copy `.env.example` to `.env`.
2. Fill in your Postgres user, password, and port:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/bookstore?schema=public
PORT=3001
POSTGRES_DB=bookstore
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YOUR_PASSWORD
POSTGRES_PORT=5432
REDIS_PORT=6379
BOOKS_CACHE_TTL_SECONDS=60
THROTTLE_TTL_SECONDS=60
THROTTLE_LIMIT=30
LOG_LEVEL=info
```

If the `bookstore` database does not exist yet, `npm run migrate` usually creates it. Prisma creates the tables; do not write SQL by hand.

`.env` is gitignored.

## Run

```bash
npm install
npm run migrate
npm run seed
npm run start:dev
```

These commands are separate:

- `migrate` applies the schema;
- `seed` loads fixtures from `prisma/data/catalog.json`;
- `start:dev` only runs the API in watch mode. If the schema has not changed, `npm run start:dev` is enough for a normal day.

App: http://localhost:3001  
Health: http://localhost:3001/health  
Books: http://localhost:3001/books  
Metrics: http://localhost:3001/metrics  
Swagger: http://localhost:3001/docs

## Run with Docker

Docker runs the Nest.js app, PostgreSQL, Redis, Prometheus, Loki, Promtail, and Grafana in containers.

Requirements:

- Docker Desktop installed and running
- `.env` file created from `.env.example`

For the Docker setup, these variables are used by `docker-compose.yml`:

```
PORT=3001
POSTGRES_DB=bookstore
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432
REDIS_PORT=6379
BOOKS_CACHE_TTL_SECONDS=60
THROTTLE_TTL_SECONDS=60
THROTTLE_LIMIT=30
LOG_LEVEL=info
```

`DATABASE_URL` in `.env` uses `localhost` and is useful for local npm commands. Inside Docker Compose, the API, migration, and seed containers override `DATABASE_URL` with a container URL that uses `postgres` as the host name, because containers talk to each other by service name.

Build the Docker images:

```bash
docker compose --profile tools build api migrate seed
```

Start PostgreSQL and Redis in the background:

```bash
docker compose up -d postgres redis
```

Apply database migrations:

```bash
docker compose run --rm migrate
```

Seed the database with the catalog fixtures:

```bash
docker compose run --rm seed
```

Start the API (Nest.js app):

```bash
docker compose up -d api
```

Start the API together with Prometheus, Loki, Promtail, and Grafana:

```bash
docker compose up -d --build
```

Check that the services are running:

```bash
docker compose ps
```

Check the API:

```bash
curl "http://localhost:3001/health"
curl "http://localhost:3001/books"
```

App: http://localhost:3001  
Health: http://localhost:3001/health  
Books: http://localhost:3001/books  
Metrics: http://localhost:3001/metrics  
Swagger: http://localhost:3001/docs  
Grafana: http://localhost:3000 (admin / admin)  
Prometheus: http://localhost:9090

Stop containers without deleting database data:

```bash
docker compose down
```

Reset containers and delete volumes (Postgres, Prometheus, Loki, Grafana):

```bash
docker compose down -v
```

After `docker compose down -v`, run migrations and seed again before starting the API.

## Rate limit

The API allows **30 requests per minute per IP** (`THROTTLE_LIMIT` / `THROTTLE_TTL_SECONDS`). The 31st request in that window gets `429 Too Many Requests`.

`GET /health` and `GET /metrics` are excluded and don't spend the quota.

## Observability

The API writes JSON logs (Pino) and exposes numbers at `GET /metrics`. Grafana is the UI. Prometheus stores the numbers. Loki stores the logs. Promtail copies API container logs into Loki.

`GET /health` does not check Grafana, Prometheus, or Loki. The catalog works without them.

Ports:

- `3001` — Bookstore API (`/books`, `/health`, `/metrics`, `/docs`)
- `3000` — Grafana UI only. Grafana also has its own `/metrics`; that is not the catalog.
- `9090` — Prometheus UI (targets and raw queries)

`npm run start:dev` gives Pino and `/metrics` only. Prometheus, Loki, and Grafana run in Docker Compose.

On Docker Desktop (including Windows) Promtail reads container logs through `/var/run/docker.sock`.

### Check it

1. Start the stack: `docker compose up -d`.
2. Open dashboard [http://localhost:3000/d/bookstore-api](http://localhost:3000/d/bookstore-api) and sign in as `admin` / `admin`.
3. Call the API a few times:

```bash
curl -D - "http://localhost:3001/books"
```

The response includes `X-Request-Id`. Repeat `/books` to see cache `HIT` vs `MISS` (`X-Cache` header). Create, patch, or delete a book to move the book-events panel.

4. [http://localhost:3001/metrics](http://localhost:3001/metrics) should contain `http_requests_total`, `bookstore_cache_requests_total`, and `bookstore_book_events_total`.
5. Prometheus targets: [http://localhost:9090/targets](http://localhost:9090/targets) — job `bookstore-api` should be UP.
6. Grafana logs panel: `{service="api"}`. To find one request: `{service="api"} |= "<the X-Request-Id>"`.

## Book events

After a book is created, updated, or deleted, the API writes the same event to two Redis features:

- **Stream** (`XADD` / `XREVRANGE`) — a journal. Read it as JSON. It survives an API restart.
- **Pub/Sub** (`PUBLISH` / `SUBSCRIBE`) — a live channel. New SSE clients only see events from the moment they connect.

The list cache on `GET /books` is unchanged. If Redis is down, book CRUD still succeeds; the event is logged and skipped.

Stream key and Pub/Sub channel are both named `books:events`. That is not a clash: a stream is a key (visible in `KEYS` / `XRANGE`), a channel is not.

Payload:

```json
{ "type": "book.created", "bookId": "<uuid>", "at": "<ISO-8601>" }
```

`type` is `book.created` | `book.updated` | `book.deleted`. The journal also adds Redis Stream `id` (for example `"1715...-0"`). The stream is trimmed with `MAXLEN ~ 1000`.

### Check it

1. Open a browser tab: [http://localhost:3001/books/events/live](http://localhost:3001/books/events/live). It stays pending, `Content-Type: text/event-stream`.
2. Create, patch, or delete a book in [Swagger](http://localhost:3001/docs) (or with `curl`).
3. The SSE tab should print `data: {...}`. The API log also shows the Pub/Sub payload even with no SSE client.
4. [http://localhost:3001/books/events](http://localhost:3001/books/events) returns the same event as JSON (`?limit=` defaults to 20, max 100).
5. Restart the API. The journal is still there; the live tab has already forgotten past events.

Optional Redis CLI:

```bash
docker compose exec redis redis-cli XREVRANGE books:events + - COUNT 5
docker compose exec redis redis-cli SUBSCRIBE books:events
```

`SUBSCRIBE` occupies that `redis-cli` session until you Ctrl+C. Mutate a book in another window to see the published JSON.
