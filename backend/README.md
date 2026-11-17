# Backend

Node.js and Express API. Install dependencies with `npm install`, copy `.env.example` to `.env`, set the database credentials and a long random `JWT_SECRET`, then run `npm run dev`. The API health check is `GET /api/health`.

Authentication uses `POST /api/auth/register` with `fullName`, `email`, and `password`, and `POST /api/auth/login` with `email` and `password`. Both return a bearer token and the public user profile. Passwords are stored as bcrypt hashes. Registration requires the `users` table from `../database/schema.sql` to exist; report, claim, and administration routes are still placeholders. The health route does not require MySQL.
