-- Add claim justifications, review notes, and private evidence-file metadata.
-- Safe to rerun on MySQL 8.0.16+; this script does not modify existing rows.

USE ucu_lost_and_found;

-- MySQL 8.4 has no ADD COLUMN IF NOT EXISTS form for ALTER TABLE. Guard each
-- addition with Information Schema so a rerun or partial prior application
-- does not fail on an already-created column.
SET @claim_justification_column_ddl = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'claims'
      AND COLUMN_NAME = 'justification'
  ),
  'SELECT 1',
  'ALTER TABLE claims ADD COLUMN justification TEXT NULL AFTER claimant_id'
);
PREPARE claim_justification_column_stmt FROM @claim_justification_column_ddl;
EXECUTE claim_justification_column_stmt;
DEALLOCATE PREPARE claim_justification_column_stmt;

SET @claim_review_note_column_ddl = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'claims'
      AND COLUMN_NAME = 'review_note'
  ),
  'SELECT 1',
  'ALTER TABLE claims ADD COLUMN review_note TEXT NULL AFTER reviewed_at'
);
PREPARE claim_review_note_column_stmt FROM @claim_review_note_column_ddl;
EXECUTE claim_review_note_column_stmt;
DEALLOCATE PREPARE claim_review_note_column_stmt;

-- NULL keeps historical claims compatible; the API requires both fields for
-- new submissions/rejections, and these checks also protect direct SQL writes.
SET @claim_justification_check_ddl = IF(
  EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'chk_claims_justification_length'
      AND CONSTRAINT_TYPE = 'CHECK'
  ),
  'SELECT 1',
  'ALTER TABLE claims ADD CONSTRAINT chk_claims_justification_length CHECK (justification IS NULL OR (CHAR_LENGTH(TRIM(justification)) >= 10 AND OCTET_LENGTH(justification) <= 65535))'
);
PREPARE claim_justification_check_stmt FROM @claim_justification_check_ddl;
EXECUTE claim_justification_check_stmt;
DEALLOCATE PREPARE claim_justification_check_stmt;

SET @claim_review_note_check_ddl = IF(
  EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'chk_claims_review_note_length'
      AND CONSTRAINT_TYPE = 'CHECK'
  ),
  'SELECT 1',
  'ALTER TABLE claims ADD CONSTRAINT chk_claims_review_note_length CHECK (review_note IS NULL OR (CHAR_LENGTH(TRIM(review_note)) >= 5 AND OCTET_LENGTH(review_note) <= 2000))'
);
PREPARE claim_review_note_check_stmt FROM @claim_review_note_check_ddl;
EXECUTE claim_review_note_check_stmt;
DEALLOCATE PREPARE claim_review_note_check_stmt;

-- One row per uploaded file. RESTRICT avoids deleting metadata while leaving
-- the corresponding private file stranded on disk; clean files explicitly
-- before any future claim-deletion workflow.
CREATE TABLE IF NOT EXISTS claim_evidence_files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  claim_id BIGINT UNSIGNED NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  storage_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  mime_type ENUM('image/jpeg', 'image/png', 'application/pdf') NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_claim_evidence_files_storage_key (storage_key),
  KEY ix_claim_evidence_files_claim_id (claim_id),
  CONSTRAINT fk_ucu_claim_evidence_files_claim
    FOREIGN KEY (claim_id) REFERENCES claims (id) ON DELETE RESTRICT,
  CONSTRAINT chk_claim_evidence_files_size
    CHECK (file_size BETWEEN 1 AND 5242880)
) ENGINE=InnoDB;
