-- Increment 4a-3: time. Every exercise has a time. Each block carries a placeholder estimate
-- (seconds per exercise) that new exercises start from, so a class can show time used, left
-- and overbooked. The estimates are placeholders the instructor adjusts; they are data, not code.

alter table public.blocks
  add column default_duration_sec integer not null default 120 check (default_duration_sec > 0);

update public.blocks b set default_duration_sec = v.sec
from (values
  ('warm_up', 90),
  ('foot_work', 45),
  ('abdominal', 180),
  ('hip_work', 120),
  ('stretch', 120),
  ('spinal_articulation', 120),
  ('fbi', 180),
  ('leg_work', 120),
  ('lateral_rotation', 120),
  ('arm_work', 60),
  ('back_extension', 120)
) as v (key, sec)
where b.key = v.key and b.owner_id is null;

-- Existing exercises without a time take their block's estimate.
update public.exercises e set default_duration_sec = b.default_duration_sec
from public.blocks b
where e.block_id = b.id and e.default_duration_sec is null;

-- A missing time on insert or update takes the block's estimate, so no code path (the form, the
-- importer, a script) can store an exercise without one. The column is then NOT NULL.
create function public.exercises_fill_duration()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.default_duration_sec is null then
    select default_duration_sec into new.default_duration_sec
    from public.blocks where id = new.block_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.exercises_fill_duration() from public, anon, authenticated;

create trigger exercises_fill_duration
  before insert or update on public.exercises
  for each row execute function public.exercises_fill_duration();

alter table public.exercises alter column default_duration_sec set not null;

-- save_exercise: a missing time falls back to the block's estimate. Everything else is
-- unchanged from the bonus-accessories version.
create or replace function public.save_exercise(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id        uuid := nullif(payload ->> 'id', '')::uuid;
  v_block_id  uuid := (payload ->> 'block_id')::uuid;
  v_method_id uuid;
  v_block_sec integer;
  v_sec       integer;
  grp         jsonb;
  grp_idx     smallint := 0;
  eq_id       text;
begin
  select method_id, default_duration_sec into v_method_id, v_block_sec
  from public.blocks where id = v_block_id;
  if v_method_id is null then
    raise exception 'unknown block' using errcode = '23503';
  end if;
  v_sec := coalesce(nullif(payload ->> 'default_duration_sec', '')::integer, v_block_sec);

  if v_id is null then
    insert into public.exercises (
      owner_id, method_id, block_id, name, description, cues, level,
      default_reps, default_duration_sec, default_springs
    ) values (
      (select auth.uid()), v_method_id, v_block_id,
      btrim(payload ->> 'name'),
      nullif(payload ->> 'description', ''),
      nullif(payload ->> 'cues', ''),
      coalesce(nullif(payload ->> 'level', ''), 'fundamental')::public.exercise_level,
      nullif(payload ->> 'default_reps', '')::integer,
      v_sec,
      nullif(payload ->> 'default_springs', '')
    ) returning id into v_id;
  else
    update public.exercises set
      method_id = v_method_id,
      block_id = v_block_id,
      name = btrim(payload ->> 'name'),
      description = nullif(payload ->> 'description', ''),
      cues = nullif(payload ->> 'cues', ''),
      level = coalesce(nullif(payload ->> 'level', ''), 'fundamental')::public.exercise_level,
      default_reps = nullif(payload ->> 'default_reps', '')::integer,
      default_duration_sec = v_sec,
      default_springs = nullif(payload ->> 'default_springs', ''),
      review_status = coalesce(nullif(payload ->> 'review_status', '')::public.review_status, review_status)
    where id = v_id;
    if not found then
      raise exception 'exercise not found or not editable' using errcode = '42501';
    end if;
    delete from public.exercise_equipment where exercise_id = v_id;
  end if;

  for grp in select * from jsonb_array_elements(coalesce(payload -> 'groups', '[]'::jsonb)) loop
    for eq_id in select * from jsonb_array_elements_text(grp) loop
      insert into public.exercise_equipment (exercise_id, equipment_id, alt_group)
      values (v_id, eq_id::uuid, grp_idx)
      on conflict (exercise_id, equipment_id) do nothing;
    end loop;
    grp_idx := grp_idx + 1;
  end loop;

  for eq_id in select * from jsonb_array_elements_text(coalesce(payload -> 'optional', '[]'::jsonb)) loop
    insert into public.exercise_equipment (exercise_id, equipment_id, alt_group, is_optional)
    values (v_id, eq_id::uuid, 0, true)
    on conflict (exercise_id, equipment_id) do nothing;
  end loop;

  return v_id;
end;
$$;
