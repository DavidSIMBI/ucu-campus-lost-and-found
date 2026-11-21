
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
    role ENUM('STUDENT', 'ADMIN', 'SUPER_ADMIN') NOT NULL DEFAULT 'STUDENT',
    phone VARCHAR(30) NULL,
    student_id VARCHAR(40) NULL,
    course VARCHAR(120) NULL,
    profile_photo_url VARCHAR(2048) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    token_version INT UNSIGNED NOT NULL DEFAULT 0,
    last_login_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    KEY ix_users_role_active (role, is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_governance_lock (
    id TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_admin_governance_lock_singleton CHECK (id = 1)
) ENGINE=InnoDB;

INSERT IGNORE INTO admin_governance_lock (id) VALUES (1);

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    actor_user_id BIGINT UNSIGNED NULL,
    actor_role VARCHAR(24) NOT NULL,
    target_user_id BIGINT UNSIGNED NULL,
    action VARCHAR(80) NOT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY ix_admin_audit_created (created_at, id),
    KEY ix_admin_audit_actor (actor_user_id, created_at),
    KEY ix_admin_audit_target (target_user_id, created_at),
    CONSTRAINT fk_admin_audit_actor FOREIGN KEY (actor_user_id)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_admin_audit_target FOREIGN KEY (target_user_id)
        REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_settings (
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSON NOT NULL,
    updated_by BIGINT UNSIGNED NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_key),
    CONSTRAINT fk_admin_settings_updated_by FOREIGN KEY (updated_by)
        REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT IGNORE INTO admin_settings (setting_key, setting_value, updated_by) VALUES
    ('student_registration_enabled', CAST('true' AS JSON), NULL),
    ('claim_submissions_enabled', CAST('true' AS JSON), NULL);


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
    photo_path VARCHAR(255) NULL,

    status ENUM('OPEN', 'RETURNED', 'CLOSED')
        NOT NULL DEFAULT 'OPEN',

    -- Item collection confirmation
    returned_at DATETIME NULL,
    returned_by BIGINT UNSIGNED NULL,

    closed_at DATETIME NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY ix_reports_public_listing (report_type, status, created_at),
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
    ),

    CONSTRAINT chk_report_return_time CHECK (
        (status = 'RETURNED' AND returned_at IS NOT NULL) OR
        (status <> 'RETURNED' AND returned_at IS NULL)
    )
) ENGINE=InnoDB;


-- =====================================
-- 3. REPORT PRIVATE DETAILS TABLE
-- =====================================

CREATE TABLE IF NOT EXISTS report_private_details (
    report_id BIGINT UNSIGNED NOT NULL,

    identifying_details TEXT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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

    KEY ix_claims_claimant (claimant_id),

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

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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


-- Keep essential claim rules in the database even if a caller bypasses the API.
DELIMITER $$

DROP TRIGGER IF EXISTS before_claim_insert$$
DROP TRIGGER IF EXISTS before_claim_update$$
DROP TRIGGER IF EXISTS before_report_return$$

CREATE TRIGGER before_claim_insert
BEFORE INSERT ON claims
FOR EACH ROW
BEGIN
    DECLARE item_reporter BIGINT UNSIGNED;
    DECLARE item_type VARCHAR(10);
    DECLARE item_status VARCHAR(10);

    SELECT reporter_id, report_type, status
      INTO item_reporter, item_type, item_status
      FROM reports
      WHERE id = NEW.report_id;

    IF item_type <> 'FOUND' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Claims can only be made against found reports.';
    END IF;
    IF item_reporter = NEW.claimant_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A reporter cannot claim their own found report.';
    END IF;
    IF item_status <> 'OPEN' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Claims can only be made against open reports.';
    END IF;
END$$

CREATE TRIGGER before_claim_update
BEFORE UPDATE ON claims
FOR EACH ROW
BEGIN
    DECLARE item_reporter BIGINT UNSIGNED;
    DECLARE item_type VARCHAR(10);
    DECLARE item_status VARCHAR(10);

    SELECT reporter_id, report_type, status
      INTO item_reporter, item_type, item_status
      FROM reports
      WHERE id = NEW.report_id;

    IF item_type <> 'FOUND' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Claims can only be made against found reports.';
    END IF;
    IF item_reporter = NEW.claimant_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A reporter cannot claim their own found report.';
    END IF;
    IF NEW.status = 'APPROVED' AND item_status <> 'OPEN' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A claim can only be approved while its report is open.';
    END IF;
END$$

CREATE TRIGGER before_report_return
BEFORE UPDATE ON reports
FOR EACH ROW
BEGIN
    IF NEW.status = 'RETURNED' AND OLD.status <> 'RETURNED'
       AND NOT EXISTS (
           SELECT 1 FROM claims
           WHERE report_id = OLD.id AND status = 'APPROVED'
       ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An item can only be returned after a claim is approved.';
    END IF;
END$$

DELIMITER ;


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
