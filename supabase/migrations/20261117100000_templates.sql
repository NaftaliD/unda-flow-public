-- Increment 3a: templates. templates + template_slots (shared or private), the soft-hint columns on
-- lesson_slots (copied from the template when a lesson is created), the seeded shared
-- "Apparatus class - 12 blocks" template, and the RPCs that create/save them.
-- owner_id IS NULL = shared (admin-writable); owner_id = auth.uid() = private.

create table public.templates (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid references auth.users (id) on delete cascade,
  method_id           uuid not null references public.methods (id),
  name                text not null check (length(btrim(name)) > 0),
  description         text,
  target_duration_min integer check (target_duration_min is null or target_duration_min > 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- The same block may appear twice (FBI 1 / FBI 2), distinguished by label.
create table public.template_slots (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references public.templates (id) on delete cascade,
  block_id      uuid not null references public.blocks (id),
  position      integer not null default 0,
  label         text not null,
  is_optional   boolean not null default false,
  min_exercises integer check (min_exercises is null or min_exercises > 0),
  hint          text
);

create index templates_owner_idx on public.templates (owner_id);
create index templates_method_idx on public.templates (method_id);
create index template_slots_template_idx on public.template_slots (template_id, position);
create index template_slots_block_idx on public.template_slots (block_id);

create trigger templates_touch_updated_at
  before update on public.templates
  for each row execute function public.touch_updated_at();

-- Lessons copy their structure (including the soft hints) from the template.
alter table public.lesson_slots
  add column hint text,
  add column is_optional boolean not null default false,
  add column min_exercises integer check (min_exercises is null or min_exercises > 0);

alter table public.lessons
  add constraint lessons_template_id_fkey
  foreign key (template_id) references public.templates (id) on delete set null;
create index lessons_template_idx on public.lessons (template_id);

-- ---------------------------------------------------------------------------
-- RLS + explicit grants (never rely on default privileges)
-- ---------------------------------------------------------------------------
alter table public.templates enable row level security;
alter table public.template_slots enable row level security;

revoke all on public.templates, public.template_slots from anon, authenticated;
grant select, insert, update, delete on public.templates to authenticated;
grant select, insert, update, delete on public.template_slots to authenticated;

create policy "templates: select shared or own"
  on public.templates for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));

create policy "templates: insert"
  on public.templates for insert to authenticated
  with check (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()));

create policy "templates: update"
  on public.templates for update to authenticated
  using (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()))
  with check (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()));

create policy "templates: delete"
  on public.templates for delete to authenticated
  using (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()));

-- template_slots: governed by the parent template (RLS on templates applies inside EXISTS)
create policy "template_slots: select"
  on public.template_slots for select to authenticated
  using (exists (select 1 from public.templates t where t.id = template_id));

create policy "template_slots: insert"
  on public.template_slots for insert to authenticated
  with check (
    exists (
      select 1 from public.templates t
      where t.id = template_id
        and (t.owner_id = (select auth.uid()) or (t.owner_id is null and public.is_admin()))
    )
    and exists (select 1 from public.blocks b where b.id = block_id)
  );

create policy "template_slots: update"
  on public.template_slots for update to authenticated
  using (
    exists (
      select 1 from public.templates t
      where t.id = template_id
        and (t.owner_id = (select auth.uid()) or (t.owner_id is null and public.is_admin()))
    )
  )
  with check (
    exists (
      select 1 from public.templates t
      where t.id = template_id
        and (t.owner_id = (select auth.uid()) or (t.owner_id is null and public.is_admin()))
    )
    and exists (select 1 from public.blocks b where b.id = block_id)
  );

create policy "template_slots: delete"
  on public.template_slots for delete to authenticated
  using (
    exists (
      select 1 from public.templates t
      where t.id = template_id
        and (t.owner_id = (select auth.uid()) or (t.owner_id is null and public.is_admin()))
    )
  );

-- ---------------------------------------------------------------------------
-- Seed: shared "Apparatus class - 12 blocks" (PLAN.md section 7), fixed id.
-- ---------------------------------------------------------------------------
insert into public.templates (id, owner_id, method_id, name, description)
select '5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01', null, m.id, 'Apparatus class - 12 blocks',
  'The standard block-method sequence on the apparatus.'
from public.methods m where m.key = 'block';

insert into public.template_slots (template_id, block_id, position, label, is_optional, min_exercises, hint)
select '5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01', b.id, s.pos - 1, s.label, s.optional, s.min_ex, s.hint
from (values
  (1,  'warm_up',             'Warm-up',            false, 1, null),
  (2,  'foot_work',           'Foot work',          false, 1, 'Suggest adding a whole series.'),
  (3,  'abdominal',           'Abdominal',          false, 1, '1–2 exercises.'),
  (4,  'hip_work',            'Hip work',           false, 1, null),
  (5,  'stretch',             'Stretch',            false, 1, 'May swap with Articulation for flow.'),
  (6,  'spinal_articulation', 'Articulation',       false, 1, 'May swap with Stretch for flow.'),
  (7,  'fbi',                 'FBI 1',              false, 1, null),
  (8,  'leg_work',            'Extra leg',          true,  1, 'Often dropped or merged in large groups.'),
  (9,  'lateral_rotation',    'Lateral / rotation', false, 1, null),
  (10, 'fbi',                 'FBI 2',              true,  1, 'Usually harder than FBI 1; large groups do only one.'),
  (11, 'arm_work',            'Arm work',           false, 3, 'A series of at least 3 exercises.'),
  (12, 'back_extension',      'Back extension',     false, 1, null)
) as s (pos, key, label, optional, min_ex, hint)
join public.blocks b on b.key = s.key and b.owner_id is null;

-- Backfill lessons created in Increment 2 from the hard-coded default (match block + label).
update public.lesson_slots ls
set hint = ts.hint, is_optional = ts.is_optional, min_exercises = ts.min_exercises
from public.template_slots ts
where ts.template_id = '5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01'
  and ts.block_id = ls.block_id and ts.label = ls.label;

-- ---------------------------------------------------------------------------
-- create_lesson: now also takes template_id (copy its slots). Without a template, the legacy
-- `slots` array is used (blank lesson when neither is given).
-- ---------------------------------------------------------------------------
create or replace function public.create_lesson(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
  v_template uuid := nullif(payload ->> 'template_id', '')::uuid;
begin
  if v_template is not null and not exists (select 1 from public.templates where id = v_template) then
    raise exception 'template not found' using errcode = 'P0002';
  end if;

  insert into public.lessons (method_id, template_id, title, lesson_date, level, target_duration_min)
  values (
    (payload ->> 'method_id')::uuid,
    v_template,
    payload ->> 'title',
    coalesce((payload ->> 'lesson_date')::date, current_date),
    coalesce((payload ->> 'level')::public.exercise_level, 'fundamental'),
    nullif(payload ->> 'target_duration_min', '')::integer
  )
  returning id into new_id;

  if v_template is not null then
    insert into public.lesson_slots (lesson_id, block_id, position, label, is_optional, min_exercises, hint)
    select new_id, block_id, position, label, is_optional, min_exercises, hint
    from public.template_slots where template_id = v_template;
  else
    insert into public.lesson_slots (lesson_id, block_id, position, label)
    select new_id, (s.value ->> 'block_id')::uuid, (s.ordinality - 1)::integer, s.value ->> 'label'
    from jsonb_array_elements(coalesce(payload -> 'slots', '[]'::jsonb)) with ordinality as s(value, ordinality);
  end if;

  insert into public.lesson_equipment (lesson_id, equipment_id)
  select new_id, e::uuid
  from jsonb_array_elements_text(coalesce(payload -> 'equipment_ids', '[]'::jsonb)) as e;

  return new_id;
end;
$$;

-- duplicate_lesson: also copies the hint columns.
create or replace function public.duplicate_lesson(p_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  src public.lessons;
  new_id uuid;
  s record;
  new_slot uuid;
begin
  select * into src from public.lessons where id = p_id;
  if not found then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;

  insert into public.lessons (method_id, template_id, title, lesson_date, level, target_duration_min, notes)
  values (src.method_id, src.template_id, src.title || ' (copy)', src.lesson_date, src.level,
          src.target_duration_min, src.notes)
  returning id into new_id;

  insert into public.lesson_equipment (lesson_id, equipment_id)
  select new_id, equipment_id from public.lesson_equipment where lesson_id = p_id;

  for s in select * from public.lesson_slots where lesson_id = p_id order by position loop
    insert into public.lesson_slots (lesson_id, block_id, position, label, is_skipped, notes,
                                     hint, is_optional, min_exercises)
    values (new_id, s.block_id, s.position, s.label, s.is_skipped, s.notes,
            s.hint, s.is_optional, s.min_exercises)
    returning id into new_slot;

    insert into public.lesson_items (lesson_slot_id, exercise_id, position, reps, duration_sec, springs, notes)
    select new_slot, exercise_id, position, reps, duration_sec, springs, notes
    from public.lesson_items where lesson_slot_id = s.id;
  end loop;

  return new_id;
end;
$$;

-- reorder: also template slots.
create or replace function public.reorder(p_kind text, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_kind = 'slots' then
    update public.lesson_slots t set position = o.idx - 1
    from unnest(p_ids) with ordinality as o(id, idx)
    where t.id = o.id;
  elsif p_kind = 'items' then
    update public.lesson_items t set position = o.idx - 1
    from unnest(p_ids) with ordinality as o(id, idx)
    where t.id = o.id;
  elsif p_kind = 'template_slots' then
    update public.template_slots t set position = o.idx - 1
    from unnest(p_ids) with ordinality as o(id, idx)
    where t.id = o.id;
  else
    raise exception 'unknown kind %', p_kind using errcode = '22023';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- save_template: create or replace a template and its slots atomically.
-- payload: { id?, shared?, method_id, name, description?, target_duration_min?,
--            slots: [{ block_id, label, is_optional?, min_exercises?, hint? }] }
-- A new template is private unless `shared` is true (RLS then requires an admin).
-- ---------------------------------------------------------------------------
create function public.save_template(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := nullif(payload ->> 'id', '')::uuid;
begin
  if v_id is null then
    insert into public.templates (owner_id, method_id, name, description, target_duration_min)
    values (
      case when coalesce((payload ->> 'shared')::boolean, false) then null else (select auth.uid()) end,
      (payload ->> 'method_id')::uuid,
      btrim(payload ->> 'name'),
      nullif(payload ->> 'description', ''),
      nullif(payload ->> 'target_duration_min', '')::integer
    ) returning id into v_id;
  else
    update public.templates set
      name = btrim(payload ->> 'name'),
      description = nullif(payload ->> 'description', ''),
      target_duration_min = nullif(payload ->> 'target_duration_min', '')::integer
    where id = v_id;
    if not found then
      raise exception 'template not found or not editable' using errcode = '42501';
    end if;
    delete from public.template_slots where template_id = v_id;
  end if;

  insert into public.template_slots (template_id, block_id, position, label, is_optional, min_exercises, hint)
  select v_id, (s.value ->> 'block_id')::uuid, (s.ordinality - 1)::integer,
         s.value ->> 'label',
         coalesce((s.value ->> 'is_optional')::boolean, false),
         nullif(s.value ->> 'min_exercises', '')::integer,
         nullif(s.value ->> 'hint', '')
  from jsonb_array_elements(coalesce(payload -> 'slots', '[]'::jsonb)) with ordinality as s(value, ordinality);

  return v_id;
end;
$$;

-- save_lesson_as_template: a private template from a lesson's slots, in order.
-- A skipped slot is kept but becomes optional.
create function public.save_lesson_as_template(p_lesson_id uuid, p_name text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  src public.lessons;
  new_id uuid;
begin
  select * into src from public.lessons where id = p_lesson_id;
  if not found then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;

  insert into public.templates (owner_id, method_id, name, target_duration_min)
  values ((select auth.uid()), src.method_id, btrim(p_name), src.target_duration_min)
  returning id into new_id;

  insert into public.template_slots (template_id, block_id, position, label, is_optional, min_exercises, hint)
  select new_id, block_id, position, label, is_optional or is_skipped, min_exercises, hint
  from public.lesson_slots where lesson_id = p_lesson_id order by position;

  return new_id;
end;
$$;

revoke execute on function public.save_template(jsonb) from public, anon;
revoke execute on function public.save_lesson_as_template(uuid, text) from public, anon;
grant execute on function public.save_template(jsonb) to authenticated;
grant execute on function public.save_lesson_as_template(uuid, text) to authenticated;
