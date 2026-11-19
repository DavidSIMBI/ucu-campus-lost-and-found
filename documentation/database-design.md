# Database design

The application uses MySQL 8 with normalized private records and a report schema that matches the current Express API. Reports store category names as strings because the report routes read and write `reports.category` directly.

## Relationships

- A user can create many reports through `reports.reporter_id`.
- A report can have one private clue in `report_private_details`.
- A report can receive many claims. Each claim references its report, claimant, and optional reviewer.
- A claim can have one private evidence record in `claim_evidence`.
- Claim status history records status changes and the actor who made them.
- `reports.returned_by` identifies the administrator who confirmed collection; `returned_at` is the confirmation time.

```text
users 1 ─── * reports 1 ─── * claims * ─── 1 users (claimant)
  └────────────── * claims (reviewer, optional)
users (administrator) 1 ─── * reports (return confirmer)
reports 1 ─── 0..1 report_private_details
claims  1 ─── 0..1 claim_evidence
claims 1 ─── * claim_status_history
```

## Main tables

### `users`

Stores the user's name, unique email, password hash, role, active state, and token version. Store only slow password hashes, never plaintext passwords. Seed accounts use intentionally unusable fictional hashes.

### `reports`

Stores public listing data, reporter, type (`LOST` or `FOUND`), category, location, optional `photo_path`, event date, and lifecycle status (`OPEN`, `RETURNED`, or `CLOSED`). The nullable `returned_by` and `returned_at` fields capture administrator identity and collection confirmation time. `closed_at` records closure time. A check constraint keeps these timestamps consistent with the status. Photo paths should refer to managed storage; do not store image binary data in this table.

### `report_private_details`

Stores recognition clues for found items separately from public listing information. Only authorized report owners or administrators should access it. Deleting a report deletes its private details.

### `claims`

Stores claimant, report, status, and review information. `reviewed_by` and `reviewed_at` identify the administrator decision; `review_note` records its reason. Rejected claims require a non-empty reason, and reviewed claims require reviewer and timestamp fields. A generated unique key permits at most one approved claim per report.

### `claim_evidence`

Stores private ownership evidence and an optional managed-storage path in `evidence_file`. Only the claimant and authorized administrators should read it. Do not include evidence in public listing queries or logs.

### `claim_status_history`

Stores the previous and new statuses, actor, and timestamp. Status-changing application operations should write the claim update and history row in the same transaction.

## Integrity and backend responsibilities

Foreign keys preserve record relationships; report and claim checks enforce required lifecycle fields and decision reasons. The backend must still authenticate users, check administrator roles, validate request data, prevent a user claiming their own found item, and use parameterized SQL (`mysql2`'s `execute`). Claim approval and return confirmation should use transactions. Concurrent approvals must be protected by the unique approved-report key.

The public report API should select only listing fields. Never expose `report_private_details` or `claim_evidence` through public queries.

## Setup and connection check

1. Start MySQL 8 with a user permitted to create the database, tables, and view.
2. From the project root, run `mysql -u root -p < database/schema.sql`.
3. Optionally add fictional demonstration records with `mysql -u root -p ucu_lost_and_found < database/seed.sql`.
4. Copy `backend/.env.example` to `backend/.env` and set the local MySQL credentials. Keep `.env` private.
5. From `backend/`, run `npm run db:check` to verify the configured `mysql2` connection.

The seed file includes sample users, reports, private clues, a pending claim, and claim evidence. It is for local testing only; its password hashes cannot be used to sign in.
