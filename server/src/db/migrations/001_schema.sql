-- Education Consultancy CRM: PostgreSQL schema (v1)
-- Single organization, single currency, 3 roles (admin, counselor, front_desk)
-- Conventions: snake_case, BIGINT identity keys, timestamptz everywhere,
--              created_at / updated_at on mutable tables.
-- Run on an empty database:  psql -d crm -f schema.sql

BEGIN;


CREATE TYPE perm_scope         AS ENUM ('own', 'all');
CREATE TYPE lead_status        AS ENUM ('new', 'contacted', 'counseling_scheduled', 'converted', 'lost');
CREATE TYPE lead_source        AS ENUM ('walk_in', 'website', 'facebook', 'instagram', 'referral', 'event', 'phone', 'other');
CREATE TYPE test_status        AS ENUM ('not_taken', 'preparing', 'booked', 'completed');
CREATE TYPE activity_type      AS ENUM ('call', 'note', 'meeting', 'email', 'status_change');
CREATE TYPE task_status        AS ENUM ('open', 'done', 'cancelled');
CREATE TYPE doc_status         AS ENUM ('pending', 'received', 'verified');
CREATE TYPE application_status AS ENUM ('draft', 'submitted', 'offer', 'accepted', 'rejected');
CREATE TYPE program_level      AS ENUM ('foundation', 'diploma', 'bachelor', 'master', 'phd', 'other');
CREATE TYPE intake_term        AS ENUM ('spring', 'summer', 'fall', 'winter');
CREATE TYPE account_kind       AS ENUM ('income', 'expense');


CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TABLE roles (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,            -- admin | counselor | front_desk
  description TEXT
);

-- One row per (module, action). The API checks "module:action".
CREATE TABLE permissions (
  id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  module  TEXT NOT NULL,                       -- users, leads, tasks, students, documents, applications, catalog, accounts, dashboard
  action  TEXT NOT NULL CHECK (action IN ('view', 'create', 'update', 'delete')),
  UNIQUE (module, action)
);

-- The permission matrix. scope 'own' = records assigned to OR created by the user.
CREATE TABLE role_permissions (
  role_id       BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  scope         perm_scope NOT NULL DEFAULT 'all',
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role_id       BIGINT NOT NULL REFERENCES roles(id),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_uq ON users (lower(email));
CREATE TRIGGER users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- 2. Catalog: countries > universities > programs > intakes

CREATE TABLE countries (
  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  iso_code  CHAR(2) UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE universities (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  country_id BIGINT NOT NULL REFERENCES countries(id),
  name       TEXT NOT NULL,
  city       TEXT,
  website    TEXT,
  notes      TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_id, name)
);
CREATE INDEX universities_country_idx ON universities (country_id);
CREATE TRIGGER universities_updated BEFORE UPDATE ON universities FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE programs (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  university_id   BIGINT NOT NULL REFERENCES universities(id),
  name            TEXT NOT NULL,
  level           program_level NOT NULL,
  field_of_study  TEXT,
  duration_months SMALLINT CHECK (duration_months > 0),
  tuition_fee     NUMERIC(12,2) CHECK (tuition_fee >= 0),   -- per year, in the program's currency
  currency        CHAR(3),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (university_id, name, level)
);
CREATE INDEX programs_university_idx ON programs (university_id);
CREATE TRIGGER programs_updated BEFORE UPDATE ON programs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE program_intakes (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  program_id           BIGINT NOT NULL REFERENCES programs(id),
  term                 intake_term NOT NULL,
  year                 SMALLINT NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  application_deadline DATE,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (program_id, term, year)
);
CREATE INDEX program_intakes_program_idx ON program_intakes (program_id);


-- 3. Files (all uploads are recorded here; other tables reference file_id)
-- 
CREATE TABLE files (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  original_name TEXT NOT NULL,
  stored_path   TEXT NOT NULL,                 -- path or object key on the storage backend
  mime_type     TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL CHECK (size_bytes >= 0),
  uploaded_by   BIGINT REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE document_types (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                TEXT NOT NULL UNIQUE,    -- Passport, Transcript, SOP, ...
  in_default_checklist BOOLEAN NOT NULL DEFAULT TRUE,  -- auto-added to a student's checklist on conversion
  is_active           BOOLEAN NOT NULL DEFAULT TRUE
);


CREATE TABLE leads (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name             TEXT NOT NULL,
  email                 TEXT,
  phone                 TEXT,
  source                lead_source NOT NULL DEFAULT 'other',
  destination_country_id BIGINT REFERENCES countries(id),
  desired_intake_term   intake_term,
  desired_intake_year   SMALLINT CHECK (desired_intake_year BETWEEN 2000 AND 2100),
  test_status           test_status NOT NULL DEFAULT 'not_taken',
  status                lead_status NOT NULL DEFAULT 'new',
  lost_reason           TEXT,
  notes                 TEXT,
  assigned_to           BIGINT REFERENCES users(id),
  created_by            BIGINT NOT NULL REFERENCES users(id),
  converted_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT leads_contact_chk CHECK (email IS NOT NULL OR phone IS NOT NULL),
  CONSTRAINT leads_lost_reason_chk CHECK (status <> 'lost' OR lost_reason IS NOT NULL)
);
CREATE INDEX leads_status_idx      ON leads (status);
CREATE INDEX leads_assigned_idx    ON leads (assigned_to);
CREATE INDEX leads_source_idx      ON leads (source);
CREATE INDEX leads_created_idx     ON leads (created_at);
CREATE INDEX leads_phone_idx       ON leads (phone);
CREATE INDEX leads_email_idx       ON leads (lower(email));
CREATE TRIGGER leads_updated BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE lead_activities (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id     BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type        activity_type NOT NULL,
  content     TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  BIGINT NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX lead_activities_lead_idx ON lead_activities (lead_id, occurred_at DESC);

-- Documents a counselor attaches to a lead. After conversion they remain linked
-- through students.lead_id and show up in the student's profile.
CREATE TABLE lead_documents (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id          BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  document_type_id BIGINT REFERENCES document_types(id),
  file_id          BIGINT NOT NULL REFERENCES files(id),
  note             TEXT,
  created_by       BIGINT NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX lead_documents_lead_idx ON lead_documents (lead_id);

-- 5. Students (created by converting a lead)

CREATE TABLE students (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id           BIGINT NOT NULL UNIQUE REFERENCES leads(id),
  full_name         TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  date_of_birth     DATE,
  gender            TEXT,
  nationality       TEXT,
  address           TEXT,
  guardian_name     TEXT,
  guardian_phone    TEXT,
  preferred_courses TEXT,
  notes             TEXT,
  assigned_to       BIGINT REFERENCES users(id),     -- counselor
  created_by        BIGINT NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX students_assigned_idx ON students (assigned_to);
CREATE TRIGGER students_updated BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE student_preferred_countries (
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  country_id BIGINT NOT NULL REFERENCES countries(id),
  PRIMARY KEY (student_id, country_id)
);

CREATE TABLE student_education (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id     BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  level          TEXT NOT NULL,                 -- e.g. High School, Diploma, Bachelor
  institution    TEXT NOT NULL,
  field_of_study TEXT,
  start_year     SMALLINT,
  end_year       SMALLINT,
  grade          TEXT,                          -- GPA or percentage, free text
  CHECK (end_year IS NULL OR start_year IS NULL OR end_year >= start_year)
);
CREATE INDEX student_education_student_idx ON student_education (student_id);

CREATE TABLE student_test_scores (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id     BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  test_name      TEXT NOT NULL CHECK (test_name IN ('IELTS', 'TOEFL', 'PTE', 'Duolingo', 'SAT', 'ACT', 'GRE', 'GMAT', 'Other')),
  overall_score  NUMERIC(6,2),
  section_scores JSONB,                         -- e.g. {"listening": 7, "reading": 6.5, ...}
  test_date      DATE
);
CREATE INDEX student_test_scores_student_idx ON student_test_scores (student_id);

-- Document checklist: one row per required document per student.
CREATE TABLE student_documents (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id       BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  document_type_id BIGINT NOT NULL REFERENCES document_types(id),
  status           doc_status NOT NULL DEFAULT 'pending',
  file_id          BIGINT REFERENCES files(id),
  remarks          TEXT,
  verified_by      BIGINT REFERENCES users(id),
  verified_at      TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, document_type_id)
);
CREATE TRIGGER student_documents_updated BEFORE UPDATE ON student_documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- 6. Tasks / follow-ups (attached to a lead or a student)

CREATE TABLE tasks (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id      BIGINT REFERENCES leads(id) ON DELETE CASCADE,
  student_id   BIGINT REFERENCES students(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  due_at       TIMESTAMPTZ NOT NULL,
  status       task_status NOT NULL DEFAULT 'open',
  assigned_to  BIGINT NOT NULL REFERENCES users(id),
  created_by   BIGINT NOT NULL REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tasks_target_chk CHECK (lead_id IS NOT NULL OR student_id IS NOT NULL)
);
CREATE INDEX tasks_assignee_due_idx ON tasks (assigned_to, status, due_at);
CREATE INDEX tasks_lead_idx    ON tasks (lead_id);
CREATE INDEX tasks_student_idx ON tasks (student_id);
CREATE TRIGGER tasks_updated BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE applications (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id        BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  program_intake_id BIGINT NOT NULL REFERENCES program_intakes(id),
  status            application_status NOT NULL DEFAULT 'draft',
  deadline          DATE,                        -- defaults to the intake's deadline, can be overridden
  submitted_at      TIMESTAMPTZ,
  notes             TEXT,
  created_by        BIGINT NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, program_intake_id)
);
CREATE INDEX applications_student_idx  ON applications (student_id);
CREATE INDEX applications_status_idx   ON applications (status);
CREATE INDEX applications_deadline_idx ON applications (deadline);
CREATE INDEX applications_intake_idx   ON applications (program_intake_id);
CREATE TRIGGER applications_updated BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE application_status_history (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status    application_status,
  to_status      application_status NOT NULL,
  note           TEXT,
  changed_by     BIGINT NOT NULL REFERENCES users(id),
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX application_history_app_idx ON application_status_history (application_id, changed_at);

-- 8. Accounts (internal office bookkeeping only: no student fees/commissions)

CREATE TABLE account_categories (
  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  kind      account_kind NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE account_entries (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id   BIGINT NOT NULL REFERENCES account_categories(id),
  entry_date    DATE NOT NULL,
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description   TEXT,
  payee_name    TEXT,                           -- landlord, staff member, vendor
  period_month  DATE CHECK (period_month IS NULL OR EXTRACT(DAY FROM period_month) = 1),  -- for salary/rent: the month it covers
  reference_no  TEXT,
  created_by    BIGINT NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX account_entries_date_idx     ON account_entries (entry_date);
CREATE INDEX account_entries_category_idx ON account_entries (category_id);
CREATE TRIGGER account_entries_updated BEFORE UPDATE ON account_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO roles (name, description) VALUES
  ('admin',      'Full access; manages users, catalog, accounts and reports'),
  ('counselor',  'Manages own assigned leads, students and applications'),
  ('front_desk', 'Captures inquiries and creates follow-up tasks');

INSERT INTO permissions (module, action)
SELECT m, a
FROM unnest(ARRAY['users','leads','tasks','students','documents','applications','catalog','accounts','dashboard']) AS m
CROSS JOIN unnest(ARRAY['view','create','update','delete']) AS a;

-- Admin: everything, all records
INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'all'
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'admin';

-- Counselor and front desk: explicit matrix
INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, v.scope::perm_scope
FROM (VALUES
  -- counselor
  ('counselor', 'leads',        'view',   'own'),
  ('counselor', 'leads',        'create', 'own'),
  ('counselor', 'leads',        'update', 'own'),
  ('counselor', 'tasks',        'view',   'own'),
  ('counselor', 'tasks',        'create', 'own'),
  ('counselor', 'tasks',        'update', 'own'),
  ('counselor', 'tasks',        'delete', 'own'),
  ('counselor', 'students',     'view',   'own'),
  ('counselor', 'students',     'create', 'own'),
  ('counselor', 'students',     'update', 'own'),
  ('counselor', 'documents',    'view',   'own'),
  ('counselor', 'documents',    'create', 'own'),
  ('counselor', 'documents',    'update', 'own'),
  ('counselor', 'documents',    'delete', 'own'),
  ('counselor', 'applications', 'view',   'own'),
  ('counselor', 'applications', 'create', 'own'),
  ('counselor', 'applications', 'update', 'own'),
  ('counselor', 'catalog',      'view',   'all'),
  ('counselor', 'dashboard',    'view',   'own'),
  -- front desk
  ('front_desk', 'leads',   'view',   'own'),
  ('front_desk', 'leads',   'create', 'own'),
  ('front_desk', 'leads',   'update', 'own'),
  ('front_desk', 'tasks',   'view',   'own'),
  ('front_desk', 'tasks',   'create', 'own'),
  ('front_desk', 'tasks',   'update', 'own'),
  ('front_desk', 'catalog', 'view',   'all')
) AS v(role, module, action, scope)
JOIN roles r       ON r.name = v.role
JOIN permissions p ON p.module = v.module AND p.action = v.action;

INSERT INTO document_types (name, in_default_checklist) VALUES
  ('Passport',                   TRUE),
  ('Academic Transcripts',       TRUE),
  ('Academic Certificates',      TRUE),
  ('English Test Result',        TRUE),
  ('Statement of Purpose (SOP)', TRUE),
  ('Recommendation Letter',      TRUE),
  ('CV / Resume',                TRUE),
  ('Passport-size Photo',        FALSE),
  ('Financial Documents',        FALSE),
  ('Other',                      FALSE);

INSERT INTO account_categories (name, kind) VALUES
  ('Office Rent',        'expense'),
  ('Staff Salary',       'expense'),
  ('Utilities',          'expense'),
  ('Marketing',          'expense'),
  ('Office Supplies',    'expense'),
  ('Other Expense',      'expense'),
  ('Other Income',       'income');

COMMIT;