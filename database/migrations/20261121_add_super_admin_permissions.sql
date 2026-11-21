-- Add SUPER_ADMIN support without dropping or rewriting existing user rows.
USE ucu_lost_and_found;

SET @role_column_ddl = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'role' AND COLUMN_TYPE LIKE '%SUPER_ADMIN%'
  ),
  'SELECT 1',
  'ALTER TABLE users MODIFY COLUMN role ENUM(''STUDENT'', ''ADMIN'', ''SUPER_ADMIN'') NOT NULL DEFAULT ''STUDENT'''
);
PREPARE role_column_stmt FROM @role_column_ddl;
EXECUTE role_column_stmt;
DEALLOCATE PREPARE role_column_stmt;

SET @active_column_ddl = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'is_active'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER role'
);
PREPARE active_column_stmt FROM @active_column_ddl;
EXECUTE active_column_stmt;
DEALLOCATE PREPARE active_column_stmt;

SET @token_version_column_ddl = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'token_version'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN token_version INT UNSIGNED NOT NULL DEFAULT 0 AFTER is_active'
);
PREPARE token_version_column_stmt FROM @token_version_column_ddl;
EXECUTE token_version_column_stmt;
DEALLOCATE PREPARE token_version_column_stmt;

SET @role_active_index_ddl = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
      AND INDEX_NAME = 'ix_users_role_active'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD KEY ix_users_role_active (role, is_active)'
);
PREPARE role_active_index_stmt FROM @role_active_index_ddl;
EXECUTE role_active_index_stmt;
DEALLOCATE PREPARE role_active_index_stmt;

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
