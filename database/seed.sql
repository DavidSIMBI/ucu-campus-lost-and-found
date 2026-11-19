USE ucu_lost_and_found;

-- Fictional demonstration accounts. These deliberately unusable hashes are not passwords.
INSERT INTO users (id, full_name, email, password_hash, role) VALUES
  (1, 'Amina Example', 'amina.example@student.ucu.ac.ug', '$2b$12$seedOnlyNotAUsablePasswordHash000000000000000000000000000000', 'STUDENT'),
  (2, 'Daniel Example', 'daniel.example@student.ucu.ac.ug', '$2b$12$seedOnlyNotAUsablePasswordHash000000000000000000000000000000', 'STUDENT'),
  (3, 'Admin Example', 'admin.example@ucu.ac.ug', '$2b$12$seedOnlyNotAUsablePasswordHash000000000000000000000000000000', 'ADMIN')
ON DUPLICATE KEY UPDATE email = VALUES(email);

INSERT INTO categories (id, name, slug) VALUES
  (1, 'Accessories', 'accessories'),
  (2, 'Electronics', 'electronics'),
  (3, 'Books', 'books'),
  (4, 'Clothing', 'clothing'),
  (5, 'Documents', 'documents'),
  (6, 'Keys', 'keys'),
  (7, 'Other', 'other')
ON DUPLICATE KEY UPDATE name = VALUES(name), slug = VALUES(slug);

INSERT INTO reports (id, reporter_id, report_type, title, description, category_id, location, event_date, status) VALUES
  (1, 1, 'FOUND', 'Navy blue water bottle', 'A reusable bottle was left on a study table.', 1, 'Main Library', CURRENT_DATE, 'OPEN'),
  (2, 2, 'LOST', 'Scientific calculator', 'A calculator may have been left after a lecture.', 2, 'Faculty of Science', CURRENT_DATE - INTERVAL 1 DAY, 'OPEN'),
  (3, 1, 'FOUND', 'Introductory economics textbook', 'A textbook was handed in near the bookshop.', 3, 'University Bookshop', CURRENT_DATE - INTERVAL 2 DAY, 'OPEN')
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  category_id = VALUES(category_id),
  location = VALUES(location),
  event_date = VALUES(event_date);

-- The private clue is intentionally distinct from information shown in the listing.
INSERT INTO report_private_details (report_id, identifying_details) VALUES
  (1, 'Fictional private clue: a small blue wave sticker on the underside.'),
  (3, 'Fictional private clue: handwritten initials inside the front cover.')
ON DUPLICATE KEY UPDATE identifying_details = VALUES(identifying_details);
