# Backend

Node.js and Express API. Install dependencies with `npm install`, configure `.env`, create the MySQL schema, then run `npm run dev`. The health check is `GET /api/health`; student registration is `POST /api/auth/register`.

Registration requires `fullName`, `email`, and `password`. Passwords are stored as salted scrypt hashes; newly registered accounts always receive the `STUDENT` role. Duplicate email addresses return `409 Conflict`. The registration endpoint requires the MySQL database configured in `.env`.

If registration reports that it cannot connect to MySQL, make sure MySQL is running and update `DB_USER` and `DB_PASSWORD` in `backend/.env` to valid local credentials. Run `database/schema.sql` once to create the required database and tables.

Login, reports, claims, and administration routes remain placeholders. The health route does not require MySQL.
