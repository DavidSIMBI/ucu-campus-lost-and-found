# Database

The MySQL 8 schema includes users, reports, private report details, claims, claim evidence, claim status history, indexes, lifecycle constraints and triggers, and a public report view. Report categories are stored as strings to match the current API.

## Setup

1. Start MySQL 8 and a database user with privileges to create the database, tables, and view.
2. Run `schema.sql`.
3. Optionally run `seed.sql` for fictional demonstration data.
4. Copy `../backend/.env.example` to `../backend/.env` and set valid MySQL credentials.
5. From `backend/`, run `npm run db:check`. The command executes a read-only `SELECT 1` and exits nonzero if the connection fails.

## Existing database upgrades

When updating a database created from an older schema, apply the SQL files in `migrations/` using a MySQL account with `ALTER` and `CREATE` privileges. The application account can stay limited to the permissions needed at runtime. From the repository root, apply:

From Windows PowerShell, run these (replace `root` if your MySQL administrator account has a different name):

```powershell
cmd.exe /c "mysql -u root -p < database\migrations\20261119_add_claim_evidence_files.sql"
cmd.exe /c "mysql -u root -p < database\migrations\20261119_add_report_photo_path.sql"
cmd.exe /c "mysql -u root -p < database\migrations\20261120_add_user_profile_fields.sql"
cmd.exe /c "mysql -u root -p < database\migrations\20261121_add_super_admin_permissions.sql"
```

These migrations add claim justification and evidence-file storage fields, the report photo path, editable student profile fields, and the SUPER_ADMIN role, account status, governance lock, audit log, and allow-listed administrative settings. Apply them with an account that has schema-change privileges; they do not reset or delete existing users, reports, or claims.

Do not use seed password hashes to authenticate: they are intentionally unusable.

The schema and seed scripts can be rerun safely for this local demo. Seed accounts use intentionally unusable password hashes. See [database design](../documentation/database-design.md) for relationships, privacy rules, and integrity guarantees.
