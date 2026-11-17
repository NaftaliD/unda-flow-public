-- The local example-class import (scripts/import-examples.ts, run with the secret key =
-- service_role) creates shared example classes. service_role bypasses RLS but not GRANTs, and the
-- hosted project does not auto-grant privileges, so it needs explicit ones. Insert-only on the
-- class content; update on lessons only so an empty example class can be given its title,
-- length and notes.
grant select, insert, update on public.lessons to service_role;
grant select, insert on public.lesson_slots, public.lesson_items, public.lesson_equipment to service_role;
