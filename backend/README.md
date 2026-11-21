# Backend

Node.js and Express API using MySQL through `mysql2/promise`. Install dependencies with `npm install`, copy `.env.example` to `.env`, set valid database credentials and a long random `JWT_SECRET`, then run `npm run dev`.

## Database setup

From the repository root, run `mysql -u root -p < database/schema.sql` to create the database and tables. Optionally load fictional demo records with `mysql -u root -p ucu_lost_and_found < database/seed.sql`. The seed accounts have deliberately unusable password hashes.

Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in `backend/.env`. From this directory, run `npm run db:check` to execute a read-only query and verify the `mysql2` connection. The check exits nonzero and prints the connection error when MySQL is unavailable or credentials are invalid.

The API health check is `GET /api/health`. Authentication uses `POST /api/auth/register` with `fullName`, `email`, and `password`, and `POST /api/auth/login` with `email` and `password`. Registration always creates STUDENT accounts. Login returns a bearer token and public user profile; passwords are stored as bcrypt hashes. The health route does not require MySQL. Database details and integrity rules are in [`../documentation/database-design.md`](../documentation/database-design.md).

## Local frontend connectivity and CORS

The browser frontend should be opened at `http://localhost:5173`. In development, Axios requests use the relative `/api` base and Vite proxies them to the origin from `VITE_API_URL` or `VITE_API_BASE_URL`, defaulting to `http://localhost:5000/api`. Report images use the same proxy target through `/uploads`. If `PORT` is overridden in `backend/.env`, set the frontend API URL to the same backend port; the Vite proxy derives its target from that URL. This avoids browser cross-origin requests during local development without disabling CORS.

For direct cross-origin requests (including production), `FRONTEND_ORIGIN` controls the explicit allowed-origin list. Provide exact origins, comma-separated when more than one is needed; wildcard origins are rejected. The API allows the `Authorization` and `Content-Type` headers and the methods used by its routes. Authentication uses a bearer token in the `Authorization` header from browser local storage, not cookies, so credentialed CORS is not enabled. Do not copy secret values into documentation or commit local `.env` files.

### CORS diagnosis and validation

The reported browser failure came from opening the frontend at `http://127.0.0.1:5173` while the configured allowed origin was `http://localhost:5173`. Those hostnames are distinct browser origins. Local `.env` overrides also selected port 5001 for both the backend and frontend API URL, while the checked-in examples default to port 5000; those existing values were preserved.

The development Axios base is now the same-origin `/api` path. Vite proxies it to the origin in `VITE_API_URL` or `VITE_API_BASE_URL`, falling back to `http://localhost:5000/api`, so the browser does not make cross-origin API calls in development. Express continues to use the exact `FRONTEND_ORIGIN` allowlist for direct cross-origin requests and allows no wildcard origins.

Validation on 2026-11-21 returned HTTP 200 from the backend health endpoint and the frontend proxy, HTTP 401 for a protected API request with an invalid bearer token, the expected CORS headers for `http://localhost:5173`, and no `Access-Control-Allow-Origin` header for `https://unapproved.example`. Browser requests through `http://localhost:5173/api` had no CORS error. A safe request for a nonexistent report image through `/uploads` returned the backend's 404, confirming that Vite proxies report-image paths too. The full backend test suite passed (27 tests), and the frontend production build passed with Vite's existing chunk-size advisory (751.82 kB JavaScript chunk; 500 kB threshold). Browser logs also showed React Router future-flag notices and transient Vite HMR WebSocket reconnect messages during restarts; neither was a CORS error. Port 5000 was already occupied (`EADDRINUSE`), so the new backend process was validated on port 5002 using process-local overrides; no existing process was stopped and no `.env` values were changed.

## Claims and administration

Claims Management endpoints require a bearer token. Students can submit multipart requests to `POST /api/claims` using `reportId`, `justification`, and one to five `evidenceFiles` (JPG/JPEG, PNG, or PDF, up to 5 MB each). Students can list and inspect their claims at `GET /api/claims/mine` and `GET /api/claims/:id`, withdraw pending claims with `PATCH /api/claims/:id` and `{ "action": "WITHDRAW" }`, and download their own evidence through `GET /api/claims/:id/evidence/:fileId`.

ADMIN and SUPER_ADMIN accounts can use the existing `/api/admin` dashboard and claims operations. The read-only user directory is `GET /api/admin/users`; dashboard statistics and recent activity are available at `GET /api/admin/dashboard`.

SUPER_ADMIN-only endpoints are mounted at `/api/super-admin`: `GET/POST /admins`, `PATCH /admins/:id/status`, `PATCH /admins/:id/role`, `GET /audit`, `GET /settings`, and `PATCH /settings/:key`. Role and status changes are transactional, serialized through the governance lock, audited, and increment `token_version`. The final active SUPER_ADMIN cannot be deactivated or demoted. Settings are allow-listed boolean controls for student registration and new claim submissions, defaulting to enabled.

Apply `../database/migrations/20261121_add_super_admin_permissions.sql` before using these endpoints. Use `npm run super-admin:bootstrap` to create the first Super Admin; after bootstrap, create ADMIN accounts only through the Super Admin interface.

Evidence is stored outside public hosting in `CLAIM_EVIDENCE_STORAGE_DIR`, defaulting to `backend/storage/private/claims`. The additive migration at `../database/migrations/20261119_add_claim_evidence_files.sql` must be reviewed and applied manually before the new claims endpoints can use the database. The application does not run this migration automatically.
