begin;
select plan(17);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'alice-l@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'bob-l@example.com');

-- Fixture exercises: one shared, one private to Bob
insert into public.exercises (id, owner_id, method_id, block_id, name)
select '20000000-0000-0000-0000-000000000001', null, b.method_id, b.id, 'Lesson Shared'
from public.blocks b where b.key = 'warm_up' and b.owner_id is null;

insert into public.exercises (id, owner_id, method_id, block_id, name)
select '20000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', b.method_id, b.id, 'Lesson Bob Private'
from public.blocks b where b.key = 'warm_up' and b.owner_id is null;

-- Alice --------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

create temp table made (id uuid);
grant all on made to authenticated;

insert into made
select public.create_lesson(jsonb_build_object(
  'method_id', (select id from public.methods where key = 'block'),
  'title', 'Alice class',
  'level', 'intermediate',
  'target_duration_min', 55,
  'equipment_ids', (select jsonb_agg(id) from public.equipment where owner_id is null and key in ('reformer', 'box')),
  'slots', (select jsonb_agg(jsonb_build_object('block_id', id, 'label', name) order by default_position)
            from public.blocks where owner_id is null)
));

select is((select count(*)::int from public.lessons where id = (select id from made)), 1,
  'Alice created a lesson');
select is((select count(*)::int from public.lesson_slots where lesson_id = (select id from made)), 11,
  'create_lesson wrote one slot per block given');
select is((select count(*)::int from public.lesson_equipment where lesson_id = (select id from made)), 2,
  'create_lesson wrote the equipment rows');
select is((select owner_id from public.lessons where id = (select id from made)),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'lesson owner defaults to the caller');

insert into public.lesson_items (lesson_slot_id, exercise_id, position, reps)
select s.id, '20000000-0000-0000-0000-000000000001', 0, 8
from public.lesson_slots s where s.lesson_id = (select id from made) order by s.position limit 1;

select is((select count(*)::int from public.lesson_items), 1, 'Alice added a shared exercise to her lesson');

select throws_ok(
  $$ insert into public.lesson_items (lesson_slot_id, exercise_id)
     select s.id, '20000000-0000-0000-0000-00000000000b'
     from public.lesson_slots s order by s.position limit 1 $$,
  '42501', null, 'Alice cannot add Bob''s private exercise to her lesson');

-- reorder reverses the slot order
select public.reorder('slots', (select array_agg(id order by position desc) from public.lesson_slots
  where lesson_id = (select id from made)));
select is(
  (select label from public.lesson_slots where lesson_id = (select id from made) order by position limit 1),
  (select name from public.blocks where owner_id is null order by default_position desc limit 1),
  'reorder rewrote slot positions');

-- duplicate copies slots, items and equipment as a draft
create temp table copied (id uuid);
grant all on copied to authenticated;
update public.lessons set status = 'taught' where id = (select id from made);
insert into copied select public.duplicate_lesson((select id from made));

select is((select title from public.lessons where id = (select id from copied)), 'Alice class (copy)',
  'duplicate titles the copy');
select is((select status::text from public.lessons where id = (select id from copied)), 'draft',
  'duplicate is a draft');
select is(
  (select count(*)::int from public.lesson_items i join public.lesson_slots s on s.id = i.lesson_slot_id
    where s.lesson_id = (select id from copied)),
  1, 'duplicate copied the items');

-- an exercise used in a lesson cannot be deleted, but can be archived
insert into public.exercises (id, owner_id, method_id, block_id, name)
select '20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', b.method_id, b.id, 'Alice Own'
from public.blocks b where b.key = 'warm_up' and b.owner_id is null;
insert into public.lesson_items (lesson_slot_id, exercise_id)
select id, '20000000-0000-0000-0000-0000000000a1' from public.lesson_slots
where lesson_id = (select id from made) limit 1;

select throws_ok(
  $$ delete from public.exercises where id = '20000000-0000-0000-0000-0000000000a1' $$,
  '23503', null, 'an exercise used in a lesson cannot be deleted');

-- Bob ------------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.lessons) + (select count(*)::int from public.lesson_slots)
    + (select count(*)::int from public.lesson_items) + (select count(*)::int from public.lesson_equipment),
  0, 'Bob sees none of Alice''s lesson data');

update public.lessons set title = 'hacked';
delete from public.lesson_slots;
select is((select count(*)::int from public.lessons), 0, 'Bob cannot touch Alice''s lessons');

select throws_ok(
  format($$ select public.duplicate_lesson(%L) $$, (select id from made)),
  'P0002', null, 'Bob cannot duplicate Alice''s lesson');

select throws_ok(
  format($$ insert into public.lesson_slots (lesson_id, block_id, label)
            values (%L, (select id from public.blocks limit 1), 'x') $$, (select id from made)),
  '42501', null, 'Bob cannot add a slot to Alice''s lesson');

-- Alice again: nothing was damaged, and a used exercise (her own copy case) ----------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select title from public.lessons where id = (select id from made)), 'Alice class',
  'Alice''s lesson is untouched');

-- anon -------------------------------------------------------------------------------
reset role;
set local role anon;
select throws_ok($$ select count(*) from public.lessons $$, '42501', null, 'anon has no access to lessons');

select * from finish();
rollback;
