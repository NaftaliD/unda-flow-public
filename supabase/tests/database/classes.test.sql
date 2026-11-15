begin;
select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a5', 'alice-c@example.com'),
  ('00000000-0000-0000-0000-0000000000b5', 'bob-c@example.com'),
  ('00000000-0000-0000-0000-0000000000c5', 'admin-c@example.com');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c5';

select is(to_regclass('public.templates'), null, 'the templates table is gone');
select is(
  (select count(*)::int from public.lesson_slots where lesson_id = '5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01'),
  12, 'the seeded template became a shared class with its 12 blocks');

-- A shared exercise to put in the example class (as the database owner)
insert into public.exercises (id, owner_id, method_id, block_id, name, default_reps)
select '50000000-0000-0000-0000-000000000001', null, b.method_id, b.id, 'Class Ex', 8
from public.blocks b where b.key = 'warm_up' and b.owner_id is null;

-- Admin ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c5","role":"authenticated"}', true);

insert into public.lesson_items (lesson_slot_id, exercise_id, position, reps)
select id, '50000000-0000-0000-0000-000000000001', 0, 12 from public.lesson_slots
where lesson_id = '5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01' and label = 'Warm-up';
select is((select count(*)::int from public.lesson_items i join public.lesson_slots s on s.id = i.lesson_slot_id
  where s.lesson_id = '5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01'), 1, 'an admin can edit a shared class');

-- an admin can publish their own class as an example
create temp table adm (id uuid);
grant all on adm to authenticated;
insert into adm select public.create_lesson(jsonb_build_object(
  'method_id', (select id from public.methods where key = 'block'), 'title', 'Admin class'));
select public.publish_class((select id from adm));
select is((select owner_id from public.lessons where id = (select id from adm)), null,
  'publish_class makes it a shared example');

-- Alice ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);

select is((select count(*)::int from public.lessons where owner_id is null), 2,
  'a normal user sees the shared classes');

create temp table mine (id uuid);
grant all on mine to authenticated;
insert into mine select public.create_lesson(jsonb_build_object(
  'from_lesson_id', '5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01',
  'title', 'From the example',
  'target_duration_min', 45,
  'equipment_ids', (select jsonb_agg(id) from public.equipment where owner_id is null and key = 'reformer')));

select is((select owner_id from public.lessons where id = (select id from mine)),
  '00000000-0000-0000-0000-0000000000a5'::uuid, 'a class made from an example is private to its author');
select is((select source_lesson_id from public.lessons where id = (select id from mine)),
  '5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01'::uuid, 'it remembers what it was made from');
select is((select count(*)::int from public.lesson_slots where lesson_id = (select id from mine)), 12,
  'the blocks were copied');
select is((select reps from public.lesson_items i join public.lesson_slots s on s.id = i.lesson_slot_id
  where s.lesson_id = (select id from mine)), 12, 'the exercises were copied, with their settings');
select is((select count(*)::int from public.lesson_equipment where lesson_id = (select id from mine)), 1,
  'the equipment given replaces the example''s');
select is((select lesson_date from public.lessons where id = (select id from mine)), null,
  'the date is optional');

-- editing the copy leaves the example untouched
update public.lesson_items set reps = 99
where lesson_slot_id in (select id from public.lesson_slots where lesson_id = (select id from mine));
select is((select reps from public.lesson_items i join public.lesson_slots s on s.id = i.lesson_slot_id
  where s.lesson_id = '5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01'), 12, 'editing a copy never changes the example');

-- a normal user cannot change a shared class
update public.lessons set title = 'hacked' where id = '5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01';
select is((select title from public.lessons where id = '5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01'),
  'Apparatus class - 12 blocks', 'a normal user cannot rename a shared class');
select throws_ok(
  $$ insert into public.lesson_slots (lesson_id, block_id, label)
     values ('5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01', (select id from public.blocks limit 1), 'x') $$,
  '42501', null, 'nor add a block to it');
select throws_ok(
  $$ select public.publish_class((select id from mine)) $$,
  '42501', null, 'only an admin can publish a class');

-- Bob cannot copy Alice's private class
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b5","role":"authenticated"}', true);
select throws_ok(
  format($$ select public.create_lesson(jsonb_build_object('from_lesson_id', %L, 'title', 'x')) $$,
    (select id from mine)),
  'P0002', null, 'a class cannot be copied by someone who cannot see it');

select * from finish();
rollback;
