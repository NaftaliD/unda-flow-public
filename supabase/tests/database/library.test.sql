begin;
select plan(18);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'admin@example.com');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000c';

-- Shared fixture rows (inserted as the database owner)
insert into public.exercises (id, owner_id, method_id, block_id, name, review_status)
select '10000000-0000-0000-0000-000000000001', null, b.method_id, b.id, 'Shared Curl', 'needs_review'
from public.blocks b where b.key = 'warm_up' and b.owner_id is null;

insert into public.exercises (id, owner_id, method_id, block_id, name)
select '10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', b.method_id, b.id, 'Bob Private'
from public.blocks b where b.key = 'warm_up' and b.owner_id is null;

-- Seed data ---------------------------------------------------------------------
select is((select count(*)::int from public.methods), 1, 'one method seeded');
select is((select count(*)::int from public.blocks where owner_id is null), 11, 'eleven shared blocks seeded');
select is((select count(*)::int from public.equipment where owner_id is null), 10, 'ten shared equipment rows seeded');

-- Signed in as Alice ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select is((select count(*)::int from public.exercises), 1, 'Alice sees the shared exercise but not Bob''s private one');

update public.exercises set name = 'hacked' where id = '10000000-0000-0000-0000-000000000001';
select is(
  (select name from public.exercises where id = '10000000-0000-0000-0000-000000000001'),
  'Shared Curl', 'Alice cannot edit a shared exercise');

delete from public.exercises where id = '10000000-0000-0000-0000-000000000001';
select is((select count(*)::int from public.exercises), 1, 'Alice cannot delete a shared exercise');

select throws_ok(
  $$insert into public.exercises (owner_id, method_id, block_id, name)
    select null, method_id, id, 'Fake shared' from public.blocks where key = 'warm_up' limit 1$$,
  '42501', null, 'Alice cannot create a shared exercise');

select throws_ok(
  $$insert into public.exercises (owner_id, method_id, block_id, name)
    select '00000000-0000-0000-0000-00000000000b', method_id, id, 'For Bob' from public.blocks where key = 'warm_up' limit 1$$,
  '42501', null, 'Alice cannot create an exercise owned by Bob');

select throws_ok(
  $$insert into public.exercise_equipment (exercise_id, equipment_id)
    select '10000000-0000-0000-0000-00000000000b', id from public.equipment where key = 'mat'$$,
  '42501', null, 'Alice cannot attach equipment to Bob''s exercise');

-- save_exercise: create, then replace requirements atomically
create temp table saved (id uuid);
grant all on saved to authenticated;
insert into saved
select public.save_exercise(jsonb_build_object(
  'block_id', (select id from public.blocks where key = 'foot_work' and owner_id is null),
  'name', 'My Footwork',
  'level', 'intermediate',
  'groups', jsonb_build_array(
    jsonb_build_array((select id from public.equipment where key = 'reformer')),
    jsonb_build_array((select id from public.equipment where key = 'ball'),
                      (select id from public.equipment where key = 'ring'))
  )));

select is((select count(*)::int from public.exercise_equipment where exercise_id = (select id from saved)),
  3, 'save_exercise stores the requirements');

select is((select owner_id from public.exercises where id = (select id from saved)),
  '00000000-0000-0000-0000-00000000000a'::uuid, 'new exercises are owned by the caller');

select public.save_exercise(jsonb_build_object(
  'id', (select id from saved),
  'block_id', (select id from public.blocks where key = 'foot_work' and owner_id is null),
  'name', 'My Footwork',
  'groups', jsonb_build_array(jsonb_build_array((select id from public.equipment where key = 'chair')))));

select is((select count(*)::int from public.exercise_equipment where exercise_id = (select id from saved)),
  1, 'save_exercise replaces the requirements');

select throws_ok(
  $$select public.save_exercise(jsonb_build_object('id', '10000000-0000-0000-0000-000000000001',
      'block_id', (select id from public.blocks where key = 'warm_up' and owner_id is null), 'name', 'x'))$$,
  '42501', null, 'save_exercise cannot edit a shared exercise as a normal user');

update public.blocks set name = 'hacked' where owner_id is null;
select is((select count(*)::int from public.blocks where name = 'hacked'), 0, 'Alice cannot edit shared blocks');

-- Admin ---------------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);

update public.exercises set review_status = 'verified', name = 'Shared Curl (fixed)'
  where id = '10000000-0000-0000-0000-000000000001';
select is(
  (select review_status::text from public.exercises where id = '10000000-0000-0000-0000-000000000001'),
  'verified', 'an admin can verify a shared exercise');

select is((select count(*)::int from public.exercises where owner_id = '00000000-0000-0000-0000-00000000000a'),
  0, 'an admin does not see another user''s private exercise');

-- Anonymous ------------------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok($$select * from public.exercises$$, '42501', null, 'anon cannot read exercises');
select throws_ok($$select * from public.equipment$$, '42501', null, 'anon cannot read equipment');

select * from finish();
rollback;
