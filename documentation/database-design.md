# Database design

The schema uses MySQL and normalized core entities: `users`, `categories`, `reports`, and `claims`. `report_private_details` and `claim_evidence` keep sensitive information separate from ordinary records. `claim_status_history` provides an audit trail.

## Relationships

- A **user** can create many **reports**. `reports.reporter_id` references `users.id`.
- A **found report** can receive many **claims**. `claims.report_id` references `reports.id` and `claims.claimant_id` references the claimant in `users`.
- A claim can optionally reference an administrator who reviewed it using `claims.reviewed_by`.
- Each report belongs to a category; categories are normalized to keep listing filters consistent.
- Every claim status change is recorded in `claim_status_history`.
- A report can have one private detail row in `report_private_details`; the row is deleted if its report is deleted.
- A claim can have one private evidence row in `claim_evidence`; the row is deleted if its claim is deleted.

```text
categories 1 ─── * reports
users 1 ─── * reports 1 ─── * claims * ─── 1 users (claimant)
  └────────────────────────────── * claims (reviewer, optional)
reports 1 ─── 0..1 report_private_details
claims  1 ─── 0..1 claim_evidence
claims 1 ─── * claim_status_history
```

## Main tables

### `users`

Stores name, unique email, a password hash, and a `STUDENT` or `ADMIN` role. The `password_hash` column is where a future authentication service stores a slow password hash; no plaintext password belongs in this table. Seed records use intentionally unusable fictional hashes.

### `reports`

Stores the public listing fields, reporter, type (`LOST` or `FOUND`), date/location/category, and state (`OPEN`, `RETURNED`, or `CLOSED`). A `RETURNED` report must have `returned_at`; other states must not. Public API queries should select only safe fields and must never join private details into a public response.

### `report_private_details`

Stores recognition clues for a found item, such as a hidden mark or contents. Keeping this in a separate table reduces accidental exposure. Only an authorized administrator or claim review flow should read it.

### `claims`

Stores claimant, report, claim status, and review metadata. The generated `approved_report_id` is set only for approved claims and has a unique index; MySQL therefore allows at most one approved claim per report. The database triggers require a found report, prevent the reporter claiming their own item, block claims after return, and require an approved claim before a report can be marked returned.

### `categories`

Stores the controlled vocabulary used for report classification. Deleting a category is restricted while reports still reference it.

### `claim_status_history`

Stores the previous and new status, actor, and timestamp for claim lifecycle changes. It supports traceability and reporting.

### `claim_evidence`

Stores private ownership evidence separately from claim status. It can contain personal information and must only be read by the claimant and authorized administrators through protected API operations. Do not include it in public listing queries or logs.

## Integrity and application responsibilities

Database constraints and triggers reinforce critical claim rules even if an API check is missed. The future backend must still authenticate users, enforce role checks, validate inputs, perform claim approval and return updates safely, and use parameterized SQL. Concurrent claim approval should be handled with a transaction; the unique index is the final safeguard against two approvals.

## Setup

Run `database/schema.sql` to create the database and tables. Then optionally run `database/seed.sql` to add fictional demonstration accounts, reports, and private clues. Seed data is not production data and its password hashes cannot be used to sign in.
