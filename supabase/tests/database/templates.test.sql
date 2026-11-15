begin;
select plan(18);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a2', 'alice-t@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'bob-t@example.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'admin-t@example.com');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c2';

-- Alice --------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);

select is((select count(*)::int from public.template_slots
  where template_id = '5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01'), 12,
  'the shared 12-block template is seeded and visible');

create temp table made (id uuid);
grant all on made to authenticated;

insert into made
select public.create_lesson(jsonb_build_object(
  'method_id', (select id from public.methods where key = 'block'),
  'title', 'From template',
  'template_id', '5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01'
));

select is((select count(*)::int from public.lesson_slots where lesson_id = (select id from made)), 12,
  'create_lesson copies the 12 template slots');
select is((select template_id from public.lessons where id = (select id from made)),
  '5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01'::uuid, 'the lesson remembers its template');
select is((select min_exercises from public.lesson_slots
  where lesson_id = (select id from made) and label = 'Arm work'), 3, 'min_exercises is copied');
select is((select hint from public.lesson_slots
  where lesson_id = (select id from made) and label = 'Foot work'), 'Suggest adding a whole series.',
  'hints are copied');

select is(
  (select count(*)::int from public.lesson_slots s
    where s.lesson_id = public.create_lesson(jsonb_build_object(
      'method_id', (select id from public.methods where key = 'block'), 'title', 'Blank'))),
  0, 'a lesson without a template starts blank');

-- Alice cannot edit the shared template
select throws_ok(
  $$ select public.save_template(jsonb_build_object(
       'id', '5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01', 'name', 'Hacked', 'slots', '[]'::jsonb)) $$,
  '42501', null, 'a normal user cannot edit the shared template');

-- Alice saves a private template
create temp table mine (id uuid);
grant all on mine to authenticated;
insert into mine
select public.save_template(jsonb_build_object(
  'method_id', (select id from public.methods where key = 'block'),
  'name', 'Alice short',
  'slots', jsonb_build_array(
    jsonb_build_object('block_id', (select id from public.blocks where key = 'warm_up' and owner_id is null),
      'label', 'Start'),
    jsonb_build_object('block_id', (select id from public.blocks where key = 'arm_work' and owner_id is null),
      'label', 'Arms', 'min_exercises', 3, 'is_optional', true))
));

select is((select owner_id from public.templates where id = (select id from mine)),
  '00000000-0000-0000-0000-0000000000a2'::uuid, 'a new template is private to its author');
select is((select count(*)::int from public.template_slots where template_id = (select id from mine)), 2,
  'save_template wrote the slots');

-- Replacing the slots does not touch lessons already created from another template
select public.save_template(jsonb_build_object(
  'id', (select id from mine), 'name', 'Alice short v2',
  'slots', jsonb_build_array(jsonb_build_object(
    'block_id', (select id from public.blocks where key = 'warm_up' and owner_id is null), 'label', 'Only'))));
select is((select count(*)::int from public.template_slots where template_id = (select id from mine)), 1,
  'saving again replaces the slots');
select is((select count(*)::int from public.lesson_slots where lesson_id = (select id from made)), 12,
  'editing templates never changes existing lessons');

-- save_lesson_as_template: skipped slots become optional
update public.lesson_slots set is_skipped = true
where lesson_id = (select id from made) and label = 'Hip work';
create temp table saved (id uuid);
grant all on saved to authenticated;
insert into saved select public.save_lesson_as_template((select id from made), 'Saved class');
select is((select count(*)::int from public.template_slots where template_id = (select id from saved)), 12,
  'save_lesson_as_template keeps every slot');
select is((select is_optional from public.template_slots
  where template_id = (select id from saved) and label = 'Hip work'), true,
  'a skipped slot becomes optional');

-- Bob ------------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);

select is((select count(*)::int from public.templates where owner_id is not null), 0,
  'Bob does not see Alice''s private templates');
select is((select count(*)::int from public.template_slots
  where template_id in (select id from mine)), 0, 'nor their slots');
select throws_ok(
  $$ select public.create_lesson(jsonb_build_object(
       'method_id', (select id from public.methods where key = 'block'),
       'title', 'x', 'template_id', (select id from mine))) $$,
  'P0002', null, 'Bob cannot create a lesson from Alice''s private template');

-- Admin ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
select public.save_template(jsonb_build_object(
  'id', '5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01', 'name', 'Apparatus class - 12 blocks (edited)',
  'slots', (select jsonb_agg(jsonb_build_object('block_id', block_id, 'label', label) order by position)
            from public.template_slots where template_id = '5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01')));
select is((select name from public.templates where id = '5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01'),
  'Apparatus class - 12 blocks (edited)', 'an admin can edit the shared template');

-- Anonymous ------------------------------------------------------------------------
reset role;
set local role anon;
select throws_ok($$ select count(*) from public.templates $$, '42501', null, 'anon cannot read templates');

select * from finish();
rollback;
