begin;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a3', 'alice-s@example.com'),
  ('00000000-0000-0000-0000-0000000000b3', 'bob-s@example.com'),
  ('00000000-0000-0000-0000-0000000000c3', 'admin-s@example.com');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c3';

-- Fixture exercises (as the database owner): three shared in foot_work, one private to Bob
insert into public.exercises (id, owner_id, method_id, block_id, name, default_reps, default_springs)
select ('30000000-0000-0000-0000-00000000000' || n)::uuid, null, b.method_id, b.id, 'Series Ex ' || n, 10 + n, '1 red'
from public.blocks b, generate_series(1, 3) n
where b.key = 'foot_work' and b.owner_id is null;

insert into public.exercises (id, owner_id, method_id, block_id, name)
select '30000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000b3', b.method_id, b.id, 'Bob Private'
from public.blocks b where b.key = 'foot_work' and b.owner_id is null;

-- Alice --------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);

create temp table mine (id uuid);
grant all on mine to authenticated;
insert into mine
select public.save_series(jsonb_build_object(
  'block_id', (select id from public.blocks where key = 'foot_work' and owner_id is null),
  'name', 'Alice foot work',
  'exercise_ids', jsonb_build_array('30000000-0000-0000-0000-000000000003',
                                    '30000000-0000-0000-0000-000000000001',
                                    '30000000-0000-0000-0000-000000000002')));

select is((select owner_id from public.series where id = (select id from mine)),
  '00000000-0000-0000-0000-0000000000a3'::uuid, 'a new series is private to its author');
select is((select array_agg(exercise_id::text order by position) from public.series_items
  where series_id = (select id from mine)),
  array['30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000002'], 'save_series keeps the order given');

select throws_ok(
  $$ select public.save_series(jsonb_build_object(
       'block_id', (select id from public.blocks where key = 'foot_work' and owner_id is null),
       'name', 'x', 'exercise_ids', jsonb_build_array('30000000-0000-0000-0000-0000000000bb'))) $$,
  '42501', null, 'Alice cannot put Bob''s private exercise in a series');

-- add_series_to_slot appends in order, with defaults
create temp table lesson (id uuid);
grant all on lesson to authenticated;
insert into lesson select public.create_lesson(jsonb_build_object(
  'method_id', (select id from public.methods where key = 'block'), 'title', 'S',
  'template_id', '5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01'));

create temp table slot (id uuid);
grant all on slot to authenticated;
insert into slot select id from public.lesson_slots
  where lesson_id = (select id from lesson) and label = 'Foot work';

select is(public.add_series_to_slot((select id from slot), (select id from mine)), 3,
  'add_series_to_slot reports how many exercises it added');
select is((select array_agg(exercise_id::text order by position) from public.lesson_items
  where lesson_slot_id = (select id from slot)),
  array['30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000002'], 'exercises are added in series order');
select is((select reps from public.lesson_items
  where lesson_slot_id = (select id from slot) and exercise_id = '30000000-0000-0000-0000-000000000001'),
  11, 'each exercise''s default reps are copied');

-- Adding again appends after the existing items
select public.add_series_to_slot((select id from slot), (select id from mine));
select is((select max(position) from public.lesson_items where lesson_slot_id = (select id from slot)),
  5, 'a second add continues the positions');

-- Archived exercises are skipped
reset role;
update public.exercises set is_archived = true where id = '30000000-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is(public.add_series_to_slot((select id from slot), (select id from mine)), 2,
  'archived exercises are not added');

-- Bob ------------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}', true);

select is((select count(*)::int from public.series where owner_id is not null), 0,
  'Bob does not see Alice''s series');
select is((select count(*)::int from public.series_items), 0, 'nor its items');
select throws_ok(
  $$ select public.add_series_to_slot((select id from public.lesson_slots limit 1), '00000000-0000-0000-0000-000000000000') $$,
  'P0002', null, 'Bob cannot add to a lesson block that is not his');

-- Admin: shared series ---------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
create temp table shared (id uuid);
grant all on shared to authenticated;
insert into shared
select public.save_series(jsonb_build_object(
  'shared', true,
  'block_id', (select id from public.blocks where key = 'foot_work' and owner_id is null),
  'name', 'Shared foot work',
  'exercise_ids', jsonb_build_array('30000000-0000-0000-0000-000000000001')));
select is((select owner_id from public.series where id = (select id from shared)), null,
  'an admin can publish a shared series');

-- A normal user sees it but cannot edit it
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}', true);
select is((select count(*)::int from public.series where id = (select id from shared)), 1,
  'everyone sees a shared series');
select throws_ok(
  $$ select public.save_series(jsonb_build_object('id', (select id from shared),
       'block_id', (select id from public.blocks where key = 'foot_work' and owner_id is null),
       'name', 'Hacked', 'exercise_ids', '[]'::jsonb)) $$,
  '42501', null, 'a normal user cannot edit a shared series');

select * from finish();
rollback;
