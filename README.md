# Bookstore API

A Nest.js book catalog (authors, categories, book CRUD) with Prisma and local PostgreSQL.

## Contents

- [Requirements](#requirements)
- [Database connection](#database-connection)
- [Run](#run)
- [Run with Docker](#run-with-docker)
- [Rate limit](#rate-limit)
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
Swagger: http://localhost:3001/docs

## Run with Docker

Docker runs the Nest.js app, PostgreSQL, and Redis in containers.

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
Swagger: http://localhost:3001/docs

View logs:

```bash
docker compose logs api
docker compose logs postgres
docker compose logs redis
```

Stop containers without deleting database data:

```bash
docker compose down
```

Reset containers and delete the PostgreSQL volume:

```bash
docker compose down -v
```

After `docker compose down -v`, run migrations and seed again before starting the API.

## Rate limit

The API allows **30 requests per minute per IP** (`THROTTLE_LIMIT` / `THROTTLE_TTL_SECONDS`). The 31st request in that window gets `429 Too Many Requests`. The counter lives in the API process (not Redis), so a restart resets it.

`GET /health` is excluded, so probes do not eat the quota. Swagger and the catalog routes count.

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
