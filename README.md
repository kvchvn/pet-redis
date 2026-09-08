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
