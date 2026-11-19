USE ucu_lost_and_found;

-- Additive migration: existing reports retain all current data and have no photo.
ALTER TABLE reports
  ADD COLUMN photo_path VARCHAR(255) NULL AFTER event_date;
