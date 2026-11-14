-- Accessories can be a "bonus": an optional extra that never decides whether an exercise is
-- available (unlike required equipment, which is "AND of ORs" via alt_group).
-- Existing rows stay required (default false). Optional rows keep alt_group 0, which is ignored.
alter table public.exercise_equipment
  add column is_optional boolean not null default false;

-- save_exercise gains `optional: [equipment_id, ...]` (bonus accessories). An id that is also
-- required keeps its required row. Everything else is unchanged from the library migration.
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
  grp         jsonb;
  grp_idx     smallint := 0;
  eq_id       text;
begin
  select method_id into v_method_id from public.blocks where id = v_block_id;
  if v_method_id is null then
    raise exception 'unknown block' using errcode = '23503';
  end if;

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
      nullif(payload ->> 'default_duration_sec', '')::integer,
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
      default_duration_sec = nullif(payload ->> 'default_duration_sec', '')::integer,
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
