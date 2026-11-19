# Database

The professional MySQL schema includes users, normalized categories, reports, claims, private evidence, claim status history, lifecycle triggers, indexes, and a public report view.

## Setup

1. Start MySQL 8 and a database user with privileges to create the database, tables, triggers, and views.
2. Run `schema.sql`.
3. Optionally run `seed.sql` for fictional demonstration data.

Do not use seed password hashes to authenticate: they are intentionally unusable.

See [database design](../documentation/database-design.md) for relationships, privacy rules, and integrity guarantees.
