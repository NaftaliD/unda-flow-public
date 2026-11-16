begin;
select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a6', 'alice-t@example.com');

select is((select default_duration_sec from public.blocks where key = 'warm_up' and owner_id is null), 90,
  'the warm-up block has its placeholder estimate');
select is((select default_duration_sec from public.blocks where key = 'abdominal' and owner_id is null), 180,
  'so does the abdominal block');
select is((select count(*)::int from public.blocks where default_duration_sec is null or default_duration_sec <= 0), 0,
  'every block has a positive estimate');

-- Alice ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a6","role":"authenticated"}', true);

create temp table made (id uuid);
grant all on made to authenticated;

-- a new exercise without a time takes the block's estimate
insert into made select public.save_exercise(jsonb_build_object(
  'block_id', (select id from public.blocks where key = 'foot_work' and owner_id is null),
  'name', 'No time given'));
select is((select default_duration_sec from public.exercises where id = (select id from made)), 45,
  'an exercise saved without a time starts from its block''s estimate');

-- an explicit time is kept
select public.save_exercise(jsonb_build_object(
  'id', (select id from made),
  'block_id', (select id from public.blocks where key = 'foot_work' and owner_id is null),
  'name', 'No time given', 'default_duration_sec', 75));
select is((select default_duration_sec from public.exercises where id = (select id from made)), 75,
  'an explicit time is kept');

-- no code path can store an exercise without a time: the database fills it from the block
insert into public.exercises (id, owner_id, method_id, block_id, name)
select '60000000-0000-0000-0000-000000000001', (select auth.uid()), b.method_id, b.id, 'Timeless'
from public.blocks b where b.key = 'warm_up' and b.owner_id is null;
select is((select default_duration_sec from public.exercises where id = '60000000-0000-0000-0000-000000000001'),
  90, 'a plain insert without a time takes the block estimate too');

-- a custom block gets a usable default
select is(
  (select default_duration_sec from public.blocks where key = 'stretch' and owner_id is null), 120,
  'estimates are per block, so a stretch exercise defaults to two minutes');

select * from finish();
rollback;
