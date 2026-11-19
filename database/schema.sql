
CREATE DATABASE IF NOT EXISTS ucu_lost_and_found
CHARACTER SET utf8mb4
COLLATE utf8mb4_0900_ai_ci;

USE ucu_lost_and_found;

-- =====================================
-- 1. USERS TABLE
-- =====================================

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('STUDENT', 'ADMIN') NOT NULL DEFAULT 'STUDENT',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    token_version INT UNSIGNED NOT NULL DEFAULT 0,
    last_login_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    KEY ix_users_role_active (role, is_active)
) ENGINE=InnoDB;


-- =====================================
-- 2. REPORTS TABLE
-- =====================================

CREATE TABLE IF NOT EXISTS reports (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    reporter_id BIGINT UNSIGNED NOT NULL,

    report_type ENUM('LOST', 'FOUND') NOT NULL,

    title VARCHAR(140) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(60) NOT NULL,
    location VARCHAR(160) NOT NULL,

    event_date DATE NOT NULL,

    -- Optional item photograph
    photo_path VARCHAR(500) NULL,

    status ENUM('OPEN', 'RETURNED', 'CLOSED')
        NOT NULL DEFAULT 'OPEN',

    -- Item collection confirmation
    returned_at DATETIME NULL,
    returned_by BIGINT UNSIGNED NULL,

    closed_at DATETIME NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY ix_reports_reporter (reporter_id),
    KEY ix_reports_status (status),
    KEY ix_reports_type (report_type),
    KEY ix_reports_category (category),
    KEY ix_reports_location (location),

    CONSTRAINT fk_reports_reporter
        FOREIGN KEY (reporter_id)
        REFERENCES users(id),

    CONSTRAINT fk_reports_returned_by
        FOREIGN KEY (returned_by)
        REFERENCES users(id),

    CONSTRAINT chk_report_return_fields CHECK (
        (status = 'RETURNED' AND returned_at IS NOT NULL AND returned_by IS NOT NULL AND closed_at IS NULL)
        OR (status = 'CLOSED' AND closed_at IS NOT NULL AND returned_at IS NULL AND returned_by IS NULL)
        OR (status = 'OPEN' AND returned_at IS NULL AND returned_by IS NULL AND closed_at IS NULL)
    )
) ENGINE=InnoDB;


-- =====================================
-- 3. REPORT PRIVATE DETAILS TABLE
-- =====================================

CREATE TABLE IF NOT EXISTS report_private_details (
    report_id BIGINT UNSIGNED NOT NULL,

    identifying_details TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (report_id),

    CONSTRAINT fk_private_details_report
        FOREIGN KEY (report_id)
        REFERENCES reports(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- =====================================
-- 4. CLAIMS TABLE
-- =====================================

CREATE TABLE IF NOT EXISTS claims (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    report_id BIGINT UNSIGNED NOT NULL,
    claimant_id BIGINT UNSIGNED NOT NULL,

    status ENUM(
        'PENDING',
        'APPROVED',
        'REJECTED',
        'WITHDRAWN'
    ) NOT NULL DEFAULT 'PENDING',

    -- Administrator review information
    reviewed_by BIGINT UNSIGNED NULL,
    reviewed_at DATETIME NULL,

    -- Reason for approval or rejection
    review_note VARCHAR(500) NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    approved_report_id BIGINT UNSIGNED
        GENERATED ALWAYS AS (
            CASE
                WHEN status = 'APPROVED' THEN report_id
                ELSE NULL
            END
        ) STORED,

    PRIMARY KEY (id),

    UNIQUE KEY uq_claims_one_approved_per_report
        (approved_report_id),

    KEY ix_claims_claimant_status
        (claimant_id, status),

    KEY ix_claims_report_status
        (report_id, status),

    CONSTRAINT fk_claims_report
        FOREIGN KEY (report_id)
        REFERENCES reports(id),

    CONSTRAINT fk_claims_claimant
        FOREIGN KEY (claimant_id)
        REFERENCES users(id),

    CONSTRAINT fk_claims_reviewer
        FOREIGN KEY (reviewed_by)
        REFERENCES users(id),

    CONSTRAINT chk_claim_review_fields CHECK (
        (status IN ('APPROVED', 'REJECTED') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
        OR (status IN ('PENDING', 'WITHDRAWN') AND reviewed_by IS NULL AND reviewed_at IS NULL)
    ),

    CONSTRAINT chk_rejected_claim_reason CHECK (
        status <> 'REJECTED'
        OR (review_note IS NOT NULL AND CHAR_LENGTH(TRIM(review_note)) > 0)
    )

) ENGINE=InnoDB;


-- =====================================
-- 5. CLAIM EVIDENCE TABLE
-- =====================================

CREATE TABLE IF NOT EXISTS claim_evidence (
    claim_id BIGINT UNSIGNED NOT NULL,

    evidence_text TEXT NOT NULL,

    -- Optional evidence attachment
    evidence_file VARCHAR(500) NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (claim_id),

    CONSTRAINT fk_claim_evidence_claim
        FOREIGN KEY (claim_id)
        REFERENCES claims(id)
        ON DELETE CASCADE

) ENGINE=InnoDB;


-- =====================================
-- 6. CLAIM STATUS HISTORY TABLE
-- =====================================

CREATE TABLE IF NOT EXISTS claim_status_history (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    claim_id BIGINT UNSIGNED NOT NULL,

    previous_status ENUM(
        'PENDING',
        'APPROVED',
        'REJECTED',
        'WITHDRAWN'
    ) NULL,

    new_status ENUM(
        'PENDING',
        'APPROVED',
        'REJECTED',
        'WITHDRAWN'
    ) NOT NULL,

    changed_by BIGINT UNSIGNED NULL,

    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY ix_claim_history_claim_time
        (claim_id, changed_at),

    CONSTRAINT fk_claim_history_claim
        FOREIGN KEY (claim_id)
        REFERENCES claims(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_claim_history_user
        FOREIGN KEY (changed_by)
        REFERENCES users(id)

) ENGINE=InnoDB;


-- =====================================
-- 7. PUBLIC REPORTS VIEW
-- =====================================

CREATE OR REPLACE VIEW vw_public_reports AS

SELECT
    r.id,
    r.report_type,
    r.title,
    r.description,
    r.category,
    r.location,
    r.event_date,
    r.photo_path,
    r.status,
    r.created_at

FROM reports r

WHERE r.status = 'OPEN';


-- =====================================
-- END OF DATABASE SCHEMA
-- =====================================
