-- Schema: backend-new/migrations/versions/0001_baseline_schema.py
-- Roles seeded by 0004_seed_permission_catalog (admin, hod, manager, teacher, student).
-- set_config binds app.actor_id so AuditedByMixin trigger (0013) can stamp
-- non-NULL created_by/updated_by on inserts. Users insert before any other table
-- with a created_by FK so the trigger's actor reference is satisfied.
SELECT set_config('app.actor_id', '00000000-0000-0000-0000-00000000aaaa', true);

INSERT INTO users (id, primary_email, status)
VALUES
  ('00000000-0000-0000-0000-00000000aaaa', 'e2e-admin@example.com',   'active'),
  ('00000000-0000-0000-0000-00000000bbbb', 'e2e-teacher@example.com', 'active'),
  ('00000000-0000-0000-0000-00000000cccc', 'e2e-student@example.com', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO organizations (id, slug, name, status)
VALUES (
  '00000000-0000-0000-0000-00000000a001',
  'e2e-org',
  'E2E Test University',
  'active'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_profiles (user_id, display_name, given_name, family_name)
VALUES
  ('00000000-0000-0000-0000-00000000aaaa', 'E2E Admin',   'E2E', 'Admin'),
  ('00000000-0000-0000-0000-00000000bbbb', 'E2E Teacher', 'E2E', 'Teacher'),
  ('00000000-0000-0000-0000-00000000cccc', 'E2E Student', 'E2E', 'Student')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO organization_memberships (id, user_id, organization_id, status)
VALUES
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000aaaa',
    '00000000-0000-0000-0000-00000000a001', 'active'),
  ('00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-00000000bbbb',
    '00000000-0000-0000-0000-00000000a001', 'active'),
  ('00000000-0000-0000-0000-00000000d003', '00000000-0000-0000-0000-00000000cccc',
    '00000000-0000-0000-0000-00000000a001', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_role_assignments (user_id, role_id, scope_kind)
SELECT '00000000-0000-0000-0000-00000000aaaa', r.id, 'global'
FROM roles r WHERE r.code = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO user_role_assignments (user_id, role_id, scope_kind, organization_id)
SELECT '00000000-0000-0000-0000-00000000bbbb', r.id, 'organization',
       '00000000-0000-0000-0000-00000000a001'
FROM roles r WHERE r.code = 'teacher'
ON CONFLICT DO NOTHING;

INSERT INTO user_role_assignments (user_id, role_id, scope_kind, organization_id)
SELECT '00000000-0000-0000-0000-00000000cccc', r.id, 'organization',
       '00000000-0000-0000-0000-00000000a001'
FROM roles r WHERE r.code = 'student'
ON CONFLICT DO NOTHING;

-- `courses.level` was removed by migration 0080. Student-facing level labels
-- are derived from career-path stage placement, not stored on the course.
INSERT INTO courses (id, organization_id, owner_user_id, slug, title, description, status)
VALUES (
  '00000000-0000-0000-0000-00000000c001',
  '00000000-0000-0000-0000-00000000a001',
  '00000000-0000-0000-0000-00000000bbbb',
  'e2e-smoke-course',
  'E2E Smoke Course',
  'Wave-0 smoke fixture course',
  'published'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO modules (id, course_id, title, position, status)
VALUES (
  '00000000-0000-0000-0000-00000000e001',
  '00000000-0000-0000-0000-00000000c001',
  'E2E Smoke Module',
  1,
  'published'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO lessons (id, module_id, slug, title, summary, lesson_type, status)
VALUES (
  '00000000-0000-0000-0000-00000000f001',
  '00000000-0000-0000-0000-00000000e001',
  'e2e-smoke-lesson',
  'E2E Smoke Lesson',
  'Sample lesson for wave-0 smoke spec',
  'reading',
  'published'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO lesson_resources (id, lesson_id, title, resource_type, position, visible_to_students)
VALUES (
  '00000000-0000-0000-0000-0000000f0001',
  '00000000-0000-0000-0000-00000000f001',
  'E2E Smoke Resource',
  'link',
  1,
  TRUE
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO course_enrollments (course_id, student_id, status, source)
VALUES (
  '00000000-0000-0000-0000-00000000c001',
  '00000000-0000-0000-0000-00000000cccc',
  'active',
  'manual'
)
ON CONFLICT (course_id, student_id) DO NOTHING;
