# Bookstore API

A Nest.js book catalog (authors, categories, book CRUD) with Prisma and local PostgreSQL.

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
