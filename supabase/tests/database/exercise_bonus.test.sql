begin;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'carol-bonus@example.com');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);

create temp table made (id uuid);
grant all on made to authenticated;

insert into made
select public.save_exercise(jsonb_build_object(
  'block_id', (select id from public.blocks where key = 'warm_up' and owner_id is null),
  'name', 'Bonus Test',
  'level', 'fundamental',
  'groups', jsonb_build_array(
    jsonb_build_array((select id from public.equipment where key = 'reformer' and owner_id is null)),
    jsonb_build_array((select id from public.equipment where key = 'box' and owner_id is null))),
  'optional', jsonb_build_array(
    (select id from public.equipment where key = 'ring' and owner_id is null),
    (select id from public.equipment where key = 'box' and owner_id is null))
));

select is(
  (select count(*)::int from public.exercise_equipment where exercise_id = (select id from made)),
  3, 'two required groups plus one bonus accessory');
select is(
  (select count(*)::int from public.exercise_equipment
    where exercise_id = (select id from made) and is_optional),
  1, 'only the ring is stored as bonus');
select is(
  (select is_optional from public.exercise_equipment ee join public.equipment q on q.id = ee.equipment_id
    where ee.exercise_id = (select id from made) and q.key = 'box'),
  false, 'an accessory that is also required stays required');

-- editing replaces the bonus rows
select public.save_exercise(jsonb_build_object(
  'id', (select id from made),
  'block_id', (select id from public.blocks where key = 'warm_up' and owner_id is null),
  'name', 'Bonus Test',
  'level', 'fundamental',
  'groups', jsonb_build_array(
    jsonb_build_array((select id from public.equipment where key = 'reformer' and owner_id is null))),
  'optional', '[]'::jsonb
));
select is(
  (select count(*)::int from public.exercise_equipment where exercise_id = (select id from made)),
  1, 'saving again replaces required and bonus rows');

-- existing seed-style rows default to required
select is(
  (select column_default from information_schema.columns
    where table_name = 'exercise_equipment' and column_name = 'is_optional'),
  'false', 'is_optional defaults to false');

select * from finish();
rollback;
