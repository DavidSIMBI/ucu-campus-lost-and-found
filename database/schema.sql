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
  token_version INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reporter_id BIGINT UNSIGNED NOT NULL,
  report_type ENUM('LOST', 'FOUND') NOT NULL,
  title VARCHAR(140) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(60) NOT NULL,
  location VARCHAR(160) NOT NULL,
  event_date DATE NOT NULL,
  photo_path VARCHAR(255) NULL,
  status ENUM('OPEN', 'RETURNED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  returned_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_reports_public_listing (report_type, status, created_at),
  KEY ix_reports_reporter (reporter_id),
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users (id),
  CONSTRAINT chk_report_return_time CHECK (
    (status = 'RETURNED' AND returned_at IS NOT NULL) OR
    (status <> 'RETURNED' AND returned_at IS NULL)
  )
) ENGINE=InnoDB;

-- Keep recognition clues out of public report queries and responses.
CREATE TABLE IF NOT EXISTS report_private_details (
  report_id BIGINT UNSIGNED NOT NULL,
  identifying_details TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- MySQL permits multiple NULL values in a unique key, so only one APPROVED claim per report.
  approved_report_id BIGINT UNSIGNED GENERATED ALWAYS AS (
    CASE WHEN status = 'APPROVED' THEN report_id ELSE NULL END
  ) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_claims_one_approved_per_report (approved_report_id),
  KEY ix_claims_claimant (claimant_id),
  KEY ix_claims_report_status (report_id, status),
  CONSTRAINT fk_claims_report FOREIGN KEY (report_id) REFERENCES reports (id),
  CONSTRAINT fk_claims_claimant FOREIGN KEY (claimant_id) REFERENCES users (id),
  CONSTRAINT fk_claims_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id),
  CONSTRAINT chk_claim_review_fields CHECK (
    (status IN ('APPROVED', 'REJECTED') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL) OR
    (status IN ('PENDING', 'WITHDRAWN') AND reviewed_by IS NULL AND reviewed_at IS NULL)
  )
) ENGINE=InnoDB;

-- Evidence can reveal personal details. Keep it separate from the claim summary.
CREATE TABLE IF NOT EXISTS claim_evidence (
  claim_id BIGINT UNSIGNED NOT NULL,
  evidence_text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (claim_id),
  CONSTRAINT fk_claim_evidence_claim FOREIGN KEY (claim_id) REFERENCES claims (id) ON DELETE CASCADE
) ENGINE=InnoDB;

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
    FROM reports WHERE id = NEW.report_id;

  IF item_type <> 'FOUND' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Claims can only be made against found reports.';
  END IF;
  IF item_reporter = NEW.claimant_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A reporter cannot claim their own found report.';
  END IF;
  IF item_status = 'RETURNED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No new claims are allowed after an item is returned.';
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
    FROM reports WHERE id = NEW.report_id;

  IF item_type <> 'FOUND' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Claims can only be made against found reports.';
  END IF;
  IF item_reporter = NEW.claimant_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A reporter cannot claim their own found report.';
  END IF;
  IF NEW.status = 'APPROVED' AND item_status = 'RETURNED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A claim cannot be approved after an item is returned.';
  END IF;
END$$

CREATE TRIGGER before_report_return
BEFORE UPDATE ON reports
FOR EACH ROW
BEGIN
  IF NEW.status = 'RETURNED' AND OLD.status <> 'RETURNED'
     AND NOT EXISTS (
       SELECT 1 FROM claims WHERE report_id = OLD.id AND status = 'APPROVED'
     ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An item can only be returned after a claim is approved.';
  END IF;
END$$

DELIMITER ;
