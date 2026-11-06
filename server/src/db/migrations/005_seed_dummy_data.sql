BEGIN;

TRUNCATE 
  application_status_history, applications, lead_documents, lead_activities, 
  student_documents, student_test_scores, student_education, student_preferred_countries, 
  students, leads, tasks, files, program_intakes, programs, universities, countries,
  account_entries, account_categories, users 
RESTART IDENTITY CASCADE;

INSERT INTO countries (name, iso_code) 
SELECT 'Country ' || i, 'C' || (i % 10) FROM generate_series(1, 10) AS i;

INSERT INTO universities (country_id, name, city)
SELECT (i % 10) + 1, 'University ' || i, 'City ' || i FROM generate_series(1, 20) AS i;

INSERT INTO programs (university_id, name, level)
SELECT (i % 20) + 1, 'Program ' || i, (ARRAY['bachelor', 'master', 'phd'])[floor(random() * 3 + 1)]::program_level FROM generate_series(1, 30) AS i;

INSERT INTO program_intakes (program_id, term, year, application_deadline)
SELECT 
  i, 
  (ARRAY['spring', 'summer', 'fall', 'winter'])[(i % 4) + 1]::intake_term, 
  2027, 
  '2027-03-31' 
FROM generate_series(1, 30) AS i;

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'Admin ' || i, 'admin' || i || '@test.com', '$2b$10$f0AmMFvp6nuTlZ906TMwxu50mXJCWccoMxaDUqtP45sU3XcEXKWfC', 1 FROM generate_series(1, 10) AS i;

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'Counselor ' || i, 'counselor' || i || '@test.com', '$2b$10$f0AmMFvp6nuTlZ906TMwxu50mXJCWccoMxaDUqtP45sU3XcEXKWfC', 2 FROM generate_series(1, 20) AS i;

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'FrontDesk ' || i, 'frontdesk' || i || '@test.com', '$2b$10$f0AmMFvp6nuTlZ906TMwxu50mXJCWccoMxaDUqtP45sU3XcEXKWfC', 3 FROM generate_series(1, 10) AS i;

-- FIXED LEADS INSERT: The lost_reason logic is now correctly tied to the status
INSERT INTO leads (full_name, email, phone, source, destination_country_id, desired_intake_term, desired_intake_year, status, lost_reason, assigned_to, created_by, created_at)
SELECT 
  'Lead ' || i,
  'lead' || i || '@test.com',
  '98000' || lpad(i::text, 5, '0'),
  (ARRAY['website', 'facebook', 'instagram', 'referral', 'event', 'phone', 'walk_in', 'other'])[floor(random() * 8 + 1)]::lead_source,
  floor(random() * 10 + 1)::bigint,
  (ARRAY['spring', 'summer', 'fall', 'winter'])[floor(random() * 4 + 1)]::intake_term,
  2027,
  computed_status,
  CASE WHEN computed_status = 'lost' THEN 'Lost reason ' || i ELSE NULL END,
  floor(random() * 20 + 11)::bigint,
  floor(random() * 10 + 31)::bigint,
  now() - (random() * interval '180 days')
FROM (
  SELECT 
    i, 
    (ARRAY['new', 'contacted', 'counseling_scheduled', 'lost'])[floor(random() * 4 + 1)]::lead_status AS computed_status
  FROM generate_series(1, 1000) AS i
) AS subquery(i, computed_status);

INSERT INTO tasks (lead_id, title, description, due_at, status, assigned_to, created_by)
SELECT 
  floor(random() * 1000 + 1)::bigint,
  'Task ' || i,
  'Description ' || i,
  now() + (random() * interval '10 days'),
  (ARRAY['open', 'done'])[floor(random() * 2 + 1)]::task_status,
  floor(random() * 20 + 11)::bigint,
  floor(random() * 10 + 31)::bigint
FROM generate_series(1, 500) AS i;

INSERT INTO lead_activities (lead_id, type, content, created_by)
SELECT 
  floor(random() * 1000 + 1)::bigint,
  (ARRAY['call', 'note', 'meeting', 'email'])[floor(random() * 4 + 1)]::activity_type,
  'Activity note ' || i,
  floor(random() * 20 + 11)::bigint
FROM generate_series(1, 400) AS i;

UPDATE leads SET status = 'converted', converted_at = now() WHERE id <= 100;

INSERT INTO students (lead_id, full_name, email, phone, date_of_birth, nationality, assigned_to, created_by)
SELECT 
  id, full_name, email, phone, '2000-01-01', 'Nepali', assigned_to, created_by
FROM leads WHERE id <= 100;

INSERT INTO student_education (student_id, level, institution, start_year, end_year, grade)
SELECT id, 'Bachelor', 'Uni ' || id, 2018, 2022, '3.5 GPA' FROM students;

INSERT INTO student_test_scores (student_id, test_name, overall_score, test_date)
SELECT id, 'IELTS', 6.5, '2026-08-01' FROM students;

INSERT INTO student_preferred_countries (student_id, country_id)
SELECT id, 1 FROM students;

INSERT INTO student_preferred_countries (student_id, country_id)
SELECT id, 2 FROM students;

INSERT INTO student_documents (student_id, document_type_id, status)
SELECT s.id, dt.id, 'pending' FROM students s CROSS JOIN document_types dt WHERE dt.in_default_checklist = true;

INSERT INTO applications (student_id, program_intake_id, status, deadline, created_by)
SELECT 
  id,
  floor(random() * 30 + 1)::bigint,
  (ARRAY['draft', 'submitted', 'offer', 'accepted', 'rejected'])[floor(random() * 5 + 1)]::application_status,
  '2027-03-31',
  1
FROM students;

INSERT INTO application_status_history (application_id, from_status, to_status, changed_by)
SELECT id, NULL, 'draft', 1 FROM applications;

INSERT INTO account_categories (name, kind) VALUES 
('Rent', 'expense'), ('Salary', 'expense'), ('Utilities', 'expense'), ('Marketing', 'expense'), ('Misc', 'expense'), ('Income', 'income');

INSERT INTO account_entries (category_id, entry_date, amount, description, payee_name, created_by)
SELECT 
  floor(random() * 6 + 1)::bigint,
  CURRENT_DATE - (random() * 365)::int,
  (random() * 100000 + 500)::numeric(12,2),
  'Entry ' || i,
  'Payee ' || i,
  1
FROM generate_series(1, 100) AS i;

COMMIT;