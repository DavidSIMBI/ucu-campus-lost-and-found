# UCU Campus Lost and Found System

A beginner-friendly foundation for a web application that helps the Uganda Christian University community report lost and found items, search public listings, and request item returns through private ownership claims.

The homepage uses clearly labeled fictional examples. Student registration and sign-in are available, with a separate administrator role for protected administration tools.

## Technologies

- Frontend: React, Vite, Axios
- Backend: Node.js, Express, mysql2
- Database: MySQL

## Folder structure

```text
frontend/       React and Vite user interface
backend/        Express API and MySQL connection configuration
database/       MySQL schema and fictional seed data
documentation/  Requirements, data design, and team workflow
```

## Requirements

- Node.js 20 or newer and npm
- MySQL 8.0 or newer

## Install dependencies

In one terminal:

```bash
cd frontend
npm install
```

In another terminal:

```bash
cd backend
npm install
```

The frontend and backend install and run independently.

## Configure and run the backend

From `backend/`, copy `.env.example` to `.env` and set values for your local MySQL database. Keep `.env` private; it is ignored by Git.

```bash
cp .env.example .env
npm run dev
```

The API starts at `http://localhost:5000`. The health endpoint is `http://localhost:5000/api/health`.

## Bootstrap Super Admin access

Apply the database migrations as a trusted database administrator, configure `backend/.env`, then bootstrap the first Super Admin from an interactive backend terminal:

```bash
cd backend
npm run super-admin:bootstrap
```

The script prompts for a name, email and hidden password, hashes it with bcrypt, and refuses to run after a Super Admin exists. After bootstrap, Super Admins create ADMIN accounts through the Admin Management section. Public registration always creates STUDENT accounts.

## Set up MySQL

Create the database and tables, then optionally add fictional demonstration rows:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p ucu_lost_and_found < database/seed.sql
```

Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in `backend/.env` to match your MySQL setup. The current API health route does not require a database connection.

## Run the frontend

From `frontend/`:

```bash
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. The frontend API base URL defaults to `http://localhost:5000/api`; set `VITE_API_BASE_URL` in `frontend/.env` to override it.

## Documentation

- [Requirements](documentation/requirements.md)
- [Database design](documentation/database-design.md)
- [Team workflow](documentation/team-workflow.md)

## Team

CSC1202 — Web and Mobile Applications Development  
Uganda Christian University
