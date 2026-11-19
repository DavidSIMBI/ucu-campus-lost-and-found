CREATE DATABASE IF NOT EXISTS ucu_lost_and_found
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE ucu_lost_and_found;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('STUDENT', 'ADMIN') NOT NULL DEFAULT 'STUDENT',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY ix_users_role_active (role, is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(60) NOT NULL,
  slug VARCHAR(60) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name),
  UNIQUE KEY uq_categories_slug (slug)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reporter_id BIGINT UNSIGNED NOT NULL,
  report_type ENUM('LOST', 'FOUND') NOT NULL,
  title VARCHAR(140) NOT NULL,
  description TEXT NOT NULL,
  category_id SMALLINT UNSIGNED NOT NULL,
  location VARCHAR(160) NOT NULL,
  event_date DATE NOT NULL,
  status ENUM('OPEN', 'RETURNED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  returned_at DATETIME NULL,
  closed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_reports_public_listing (report_type, status, created_at),
  KEY ix_reports_category_status (category_id, status),
  KEY ix_reports_reporter_status (reporter_id, status),
  KEY ix_reports_location (location),
  KEY ix_reports_event_date (event_date),
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users (id),
  CONSTRAINT fk_reports_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,
  CONSTRAINT chk_report_status_times CHECK (
    (status = 'RETURNED' AND returned_at IS NOT NULL AND closed_at IS NULL) OR
    (status = 'CLOSED' AND closed_at IS NOT NULL AND returned_at IS NULL) OR
    (status = 'OPEN' AND returned_at IS NULL AND closed_at IS NULL)
  )
) ENGINE=InnoDB;

-- Recognition clues are intentionally separate from public report information.
CREATE TABLE IF NOT EXISTS report_private_details (
  report_id BIGINT UNSIGNED NOT NULL,
  identifying_details TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (report_id),
  CONSTRAINT fk_private_details_report FOREIGN KEY (report_id) REFERENCES reports (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS claims (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_id BIGINT UNSIGNED NOT NULL,
  claimant_id BIGINT UNSIGNED NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN') NOT NULL DEFAULT 'PENDING',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  review_note VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  approved_report_id BIGINT UNSIGNED GENERATED ALWAYS AS (
    CASE WHEN status = 'APPROVED' THEN report_id ELSE NULL END
  ) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_claims_one_approved_per_report (approved_report_id),
  KEY ix_claims_claimant_status (claimant_id, status),
  KEY ix_claims_report_status (report_id, status),
  CONSTRAINT fk_claims_report FOREIGN KEY (report_id) REFERENCES reports (id),
  CONSTRAINT fk_claims_claimant FOREIGN KEY (claimant_id) REFERENCES users (id),
  CONSTRAINT fk_claims_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id),
  CONSTRAINT chk_claim_review_fields CHECK (
    (status IN ('APPROVED', 'REJECTED') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL) OR
    (status IN ('PENDING', 'WITHDRAWN') AND reviewed_by IS NULL AND reviewed_at IS NULL)
  )
) ENGINE=InnoDB;

-- Ownership evidence is separate and must only be exposed in an authorized review flow.
CREATE TABLE IF NOT EXISTS claim_evidence (
  claim_id BIGINT UNSIGNED NOT NULL,
  evidence_text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (claim_id),
  CONSTRAINT fk_claim_evidence_claim FOREIGN KEY (claim_id) REFERENCES claims (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS claim_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  claim_id BIGINT UNSIGNED NOT NULL,
  previous_status ENUM('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN') NULL,
  new_status ENUM('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN') NOT NULL,
  changed_by BIGINT UNSIGNED NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_claim_history_claim_time (claim_id, changed_at),
  CONSTRAINT fk_claim_history_claim FOREIGN KEY (claim_id) REFERENCES claims (id) ON DELETE CASCADE,
  CONSTRAINT fk_claim_history_user FOREIGN KEY (changed_by) REFERENCES users (id)
) ENGINE=InnoDB;

DELIMITER $$

DROP TRIGGER IF EXISTS before_claim_insert$$
DROP TRIGGER IF EXISTS after_claim_insert$$
DROP TRIGGER IF EXISTS before_claim_update$$
DROP TRIGGER IF EXISTS after_claim_status_update$$
DROP TRIGGER IF EXISTS before_report_status_update$$

CREATE TRIGGER before_claim_insert
BEFORE INSERT ON claims
FOR EACH ROW
BEGIN
  DECLARE item_reporter BIGINT UNSIGNED;
  DECLARE item_type VARCHAR(10);
  DECLARE item_status VARCHAR(10);

  SELECT reporter_id, report_type, status
    INTO item_reporter, item_type, item_status
    FROM reports WHERE id = NEW.report_id;

  IF item_reporter IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Report does not exist.';
  ELSEIF item_type <> 'FOUND' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Claims can only be made against found reports.';
  ELSEIF item_reporter = NEW.claimant_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A reporter cannot claim their own found report.';
  ELSEIF item_status <> 'OPEN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'New claims are only allowed while a report is open.';
  ELSEIF EXISTS (
    SELECT 1 FROM claims
    WHERE report_id = NEW.report_id
      AND claimant_id = NEW.claimant_id
      AND status IN ('PENDING', 'APPROVED')
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This claimant already has an active claim for the report.';
  ELSEIF NEW.status <> 'PENDING' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A new claim must start in PENDING status.';
  END IF;
END$$

CREATE TRIGGER after_claim_insert
AFTER INSERT ON claims
FOR EACH ROW
BEGIN
  INSERT INTO claim_status_history (claim_id, previous_status, new_status, changed_by)
  VALUES (NEW.id, NULL, NEW.status, NEW.claimant_id);
END$$

CREATE TRIGGER before_claim_update
BEFORE UPDATE ON claims
FOR EACH ROW
BEGIN
  DECLARE item_status VARCHAR(10);
  DECLARE reviewer_role VARCHAR(10);

  IF NEW.report_id <> OLD.report_id OR NEW.claimant_id <> OLD.claimant_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The report and claimant of a claim cannot be changed.';
  END IF;

  IF OLD.status = 'APPROVED' AND NEW.status <> 'APPROVED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An approved claim cannot be changed to another status.';
  END IF;

  IF OLD.status = 'WITHDRAWN' AND NEW.status <> 'WITHDRAWN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A withdrawn claim cannot be reactivated.';
  END IF;

  SELECT status INTO item_status FROM reports WHERE id = NEW.report_id;
  IF item_status = 'RETURNED' AND OLD.status <> 'APPROVED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Claim status cannot change after the item is returned.';
  END IF;

  IF NEW.status = 'APPROVED' AND item_status <> 'OPEN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A claim can only be approved while the report is open.';
  END IF;

  IF NEW.status = 'APPROVED' AND item_status = 'RETURNED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A claim cannot be approved after an item is returned.';
  END IF;

  IF NEW.status IN ('APPROVED', 'REJECTED') AND NEW.reviewed_by IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A reviewed claim must identify the reviewer.';
  END IF;

  IF NEW.status IN ('APPROVED', 'REJECTED') THEN
    SELECT role INTO reviewer_role FROM users WHERE id = NEW.reviewed_by;
    IF reviewer_role <> 'ADMIN' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only administrators can approve or reject claims.';
    END IF;
  END IF;
END$$

CREATE TRIGGER after_claim_status_update
AFTER UPDATE ON claims
FOR EACH ROW
BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO claim_status_history (claim_id, previous_status, new_status, changed_by)
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      CASE WHEN NEW.status IN ('APPROVED', 'REJECTED') THEN NEW.reviewed_by ELSE NEW.claimant_id END
    );
  END IF;
END$$

CREATE TRIGGER before_report_status_update
BEFORE UPDATE ON reports
FOR EACH ROW
BEGIN
  IF OLD.status = 'RETURNED' AND NEW.status <> 'RETURNED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A returned report cannot be reopened or closed.';
  END IF;

  IF NEW.status = 'RETURNED'
     AND OLD.status <> 'RETURNED'
     AND NOT EXISTS (
       SELECT 1 FROM claims WHERE report_id = OLD.id AND status = 'APPROVED'
     ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An item can only be returned after a claim is approved.';
  END IF;

  IF NEW.status = 'CLOSED'
     AND OLD.status = 'OPEN'
     AND EXISTS (
       SELECT 1 FROM claims WHERE report_id = OLD.id AND status = 'PENDING'
     ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Resolve or withdraw pending claims before closing a report.';
  END IF;
END$$

DELIMITER ;

CREATE OR REPLACE VIEW vw_public_reports AS
SELECT
  r.id,
  r.report_type,
  r.title,
  r.description,
  c.name AS category,
  r.location,
  r.event_date,
  r.status,
  r.created_at
FROM reports r
JOIN categories c ON c.id = r.category_id
WHERE r.status = 'OPEN';
