# Database

The MySQL 8 schema includes users, reports, private report details, claims, claim evidence, claim status history, indexes, lifecycle constraints, and a public report view. Report categories are stored as strings to match the current API.

## Setup

1. Start MySQL 8 and a database user with privileges to create the database, tables, and view.
2. Run `schema.sql`.
3. Optionally run `seed.sql` for fictional demonstration data.
4. Copy `../backend/.env.example` to `../backend/.env` and set valid MySQL credentials.
5. From `backend/`, run `npm run db:check`. The command executes a read-only `SELECT 1` and exits nonzero if the connection fails.

Do not use seed password hashes to authenticate: they are intentionally unusable.

The schema and seed scripts can be rerun safely for this local demo. Seed accounts use intentionally unusable password hashes. See [database design](../documentation/database-design.md) for relationships, privacy rules, and integrity guarantees.
