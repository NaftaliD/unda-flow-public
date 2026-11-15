begin;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a4', 'alice-p@example.com'),
  ('00000000-0000-0000-0000-0000000000b4', 'bob-p@example.com');

-- Bob's private equipment (as the database owner)
insert into public.equipment (id, owner_id, key, name, kind)
values ('40000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000b4', 'bobs_thing', 'Bob thing', 'prop');

-- Alice --------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);

create temp table made (id uuid);
grant all on made to authenticated;
insert into made
select public.save_preset(jsonb_build_object(
  'name', 'Studio',
  'equipment_ids', (select jsonb_agg(id) from public.equipment
                    where owner_id is null and key in ('reformer', 'box', 'ring'))));

select is((select count(*)::int from public.equipment_preset_items where preset_id = (select id from made)),
  3, 'save_preset wrote the equipment');
select is((select owner_id from public.equipment_presets where id = (select id from made)),
  '00000000-0000-0000-0000-0000000000a4'::uuid, 'a preset belongs to its author');

-- Saving under the same name replaces the preset instead of failing on the unique name
select is(public.save_preset(jsonb_build_object(
    'name', 'Studio',
    'equipment_ids', (select jsonb_agg(id) from public.equipment where owner_id is null and key = 'mat'))),
  (select id from made), 'same name updates the existing preset');
select is((select count(*)::int from public.equipment_preset_items where preset_id = (select id from made)),
  1, 'and replaces its equipment');

-- Rename by id
select public.save_preset(jsonb_build_object('id', (select id from made), 'name', 'Home',
  'equipment_ids', (select jsonb_agg(id) from public.equipment where owner_id is null and key = 'mat')));
select is((select name from public.equipment_presets where id = (select id from made)), 'Home',
  'a preset can be renamed by id');

select throws_ok(
  $$ select public.save_preset(jsonb_build_object('name', 'Sneaky',
       'equipment_ids', jsonb_build_array('40000000-0000-0000-0000-0000000000bb'))) $$,
  '42501', null, 'Alice cannot put Bob''s private equipment in a preset');

-- Bob ------------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b4","role":"authenticated"}', true);

select is((select count(*)::int from public.equipment_presets), 0, 'Bob does not see Alice''s presets');
select is((select count(*)::int from public.equipment_preset_items), 0, 'nor their items');
select throws_ok(
  $$ select public.save_preset(jsonb_build_object('id', (select id from made), 'name', 'Mine now',
       'equipment_ids', '[]'::jsonb)) $$,
  'P0002', null, 'Bob cannot overwrite Alice''s preset by id');

-- Anonymous ------------------------------------------------------------------------
reset role;
set local role anon;
select throws_ok($$ select count(*) from public.equipment_presets $$, '42501', null,
  'anon cannot read presets');

select * from finish();
rollback;
