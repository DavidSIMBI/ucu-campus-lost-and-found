-- Add editable student profile details without changing existing accounts.
USE ucu_lost_and_found;

SET @phone_column_ddl = IF(
  EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'phone'),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN phone VARCHAR(30) NULL AFTER role'
);
PREPARE phone_column_stmt FROM @phone_column_ddl;
EXECUTE phone_column_stmt;
DEALLOCATE PREPARE phone_column_stmt;

SET @student_id_column_ddl = IF(
  EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'student_id'),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN student_id VARCHAR(40) NULL AFTER phone'
);
PREPARE student_id_column_stmt FROM @student_id_column_ddl;
EXECUTE student_id_column_stmt;
DEALLOCATE PREPARE student_id_column_stmt;

SET @course_column_ddl = IF(
  EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'course'),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN course VARCHAR(120) NULL AFTER student_id'
);
PREPARE course_column_stmt FROM @course_column_ddl;
EXECUTE course_column_stmt;
DEALLOCATE PREPARE course_column_stmt;

SET @profile_photo_column_ddl = IF(
  EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_photo_url'),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN profile_photo_url VARCHAR(2048) NULL AFTER course'
);
PREPARE profile_photo_column_stmt FROM @profile_photo_column_ddl;
EXECUTE profile_photo_column_stmt;
DEALLOCATE PREPARE profile_photo_column_stmt;
