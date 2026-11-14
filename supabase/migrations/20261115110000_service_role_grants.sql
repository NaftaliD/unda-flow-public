-- The hosted project does not auto-grant privileges on new tables, so the secret key's role
-- (service_role, which bypasses RLS but not GRANTs) needs explicit grants for the local
-- import script (scripts/import-exercises.ts). Insert-only on content; read on reference data.
grant select on public.methods, public.blocks, public.equipment to service_role;
grant select, insert on public.exercises, public.exercise_equipment to service_role;
