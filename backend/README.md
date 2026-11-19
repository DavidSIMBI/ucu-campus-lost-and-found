# Backend

Node.js and Express API using MySQL through `mysql2/promise`. Install dependencies with `npm install`, copy `.env.example` to `.env`, set valid database credentials and a long random `JWT_SECRET`, then run `npm run dev`.

## Database setup

From the repository root, run `mysql -u root -p < database/schema.sql` to create the database and tables. Optionally load fictional demo records with `mysql -u root -p ucu_lost_and_found < database/seed.sql`. The seed accounts have deliberately unusable password hashes.

Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in `backend/.env`. From this directory, run `npm run db:check` to execute a read-only query and verify the `mysql2` connection. The check exits nonzero and prints the connection error when MySQL is unavailable or credentials are invalid.

The API health check is `GET /api/health`. Authentication uses `POST /api/auth/register` with `fullName`, `email`, and `password`, and `POST /api/auth/login` with `email` and `password`. Both return a bearer token and public user profile; passwords are stored as bcrypt hashes. The health route does not require MySQL. Database details and integrity rules are in [`../documentation/database-design.md`](../documentation/database-design.md).

## Claims and administration

Claims Management endpoints require a bearer token. Students can submit multipart requests to `POST /api/claims` using `reportId`, `justification`, and one to five `evidenceFiles` (JPG/JPEG, PNG, or PDF, up to 5 MB each). Students can list and inspect their claims at `GET /api/claims/mine` and `GET /api/claims/:id`, withdraw pending claims with `PATCH /api/claims/:id` and `{ "action": "WITHDRAW" }`, and download their own evidence through `GET /api/claims/:id/evidence/:fileId`.

Administrators can list and inspect claims under `/api/admin/claims`, review pending claims with `{ "decision": "APPROVE", "reviewNote": "..." }` or `{ "decision": "REJECT", "reviewNote": "..." }` (a reason is required for rejection), and confirm handover with `POST /api/admin/claims/:id/complete`. The read-only user directory is `GET /api/admin/users`; dashboard statistics and recent activity are available at `GET /api/admin/dashboard`.

Evidence is stored outside public hosting in `CLAIM_EVIDENCE_STORAGE_DIR`, defaulting to `backend/storage/private/claims`. The additive migration at `../database/migrations/20261119_add_claim_evidence_files.sql` must be reviewed and applied manually before the new claims endpoints can use the database. The application does not run this migration automatically.
