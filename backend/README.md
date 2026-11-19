# Backend

Node.js and Express API using MySQL through `mysql2/promise`. Install dependencies with `npm install`, copy `.env.example` to `.env`, set valid database credentials and a long random `JWT_SECRET`, then run `npm run dev`.

## Database setup

From the repository root, run `mysql -u root -p < database/schema.sql` to create the database and tables. Optionally load fictional demo records with `mysql -u root -p ucu_lost_and_found < database/seed.sql`. The seed accounts have deliberately unusable password hashes.

Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in `backend/.env`. From this directory, run `npm run db:check` to execute a read-only query and verify the `mysql2` connection. The check exits nonzero and prints the connection error when MySQL is unavailable or credentials are invalid.

The API health check is `GET /api/health`. Authentication uses `POST /api/auth/register` with `fullName`, `email`, and `password`, and `POST /api/auth/login` with `email` and `password`. Both return a bearer token and public user profile; passwords are stored as bcrypt hashes. The database details and integrity rules are in [`../documentation/database-design.md`](../documentation/database-design.md).
