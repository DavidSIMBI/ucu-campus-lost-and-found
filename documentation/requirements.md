# Project requirements

## Purpose

The UCU Campus Lost and Found System gives the Uganda Christian University community one place to report lost or found belongings and coordinate their return.

## User groups

- **Students** can browse public listings, submit lost or found reports, and make ownership claims.
- **Administrators** can review claims and confirm that an item has been returned.

## Foundation scope

The current foundation provides a responsive React interface with home, browse, login, and registration screens; an Express API with a health check and placeholder route groups; and the initial MySQL schema. Listings currently shown in the frontend are fictional examples and are not database records.

## Functional requirements for the complete project

1. Users can register and sign in with an account role of student or administrator.
2. Students can create lost and found reports with a title, description, category, location, and date.
3. Public users can search and browse safe, non-sensitive report information.
4. A student can submit a claim against a found report and provide private proof of ownership.
5. Administrators can approve or reject claims.
6. An administrator can mark an item returned after an ownership claim is approved.
7. The system prevents users from claiming their own found reports, permits at most one approved claim for a report, and stops new claims after return.

## Privacy and security requirements

- Store password hashes, never raw passwords.
- Do not return private found-item clues or claim evidence in public listing responses.
- Restrict private details and claim evidence to authorized claim review flows.
- Validate request data and authorize every protected operation on the server.
- Keep credentials in environment configuration and out of source control.

## Out of scope for this foundation

Authentication, authorization, report CRUD, live database queries, claim submission/review, return workflows, file uploads, and production deployment are not implemented yet.
