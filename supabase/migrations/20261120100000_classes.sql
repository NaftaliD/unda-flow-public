-- Increment 4a-2: one concept, classes. A "template" is just an example class: a class whose
-- owner_id IS NULL is shared (readable by everyone, writable by admins). Creating a class starts
-- from an existing class and copies its blocks, exercises and settings.
-- Existing templates are converted to shared (or private) classes; the templates tables go away.

-- ---------------------------------------------------------------------------
-- 1. lessons: shared classes, optional date, "created from" reference
-- ---------------------------------------------------------------------------
alter table public.lessons alter column owner_id drop not null;
alter table public.lessons alter column lesson_date drop not null;
alter table public.lessons alter column lesson_date drop default;

alter table public.lessons drop constraint lessons_template_id_fkey;
update public.lessons set template_id = null;
alter table public.lessons rename column template_id to source_lesson_id;
alter index public.lessons_template_idx rename to lessons_source_lesson_idx;
alter table public.lessons
  add constraint lessons_source_lesson_id_fkey
  foreign key (source_lesson_id) references public.lessons (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 2. Convert templates to classes (same ids, so the seeded shared template keeps its id)
-- ---------------------------------------------------------------------------
insert into public.lessons (id, owner_id, method_id, title, notes, level, target_duration_min, status)
select id, owner_id, method_id, name, description, 'fundamental', target_duration_min, 'ready'
from public.templates;

insert into public.lesson_slots (lesson_id, block_id, position, label, is_optional, min_exercises, hint)
select template_id, block_id, position, label, is_optional, min_exercises, hint
from public.template_slots;

-- ---------------------------------------------------------------------------
-- 3. Drop the template functions and tables
-- ---------------------------------------------------------------------------
drop function public.save_template(jsonb);
drop function public.save_lesson_as_template(uuid, text);
drop table public.template_slots;
drop table public.templates;

-- ---------------------------------------------------------------------------
-- 4. RLS: visible if own or shared; writable if own, or shared and admin
-- ---------------------------------------------------------------------------
create function public.can_write_lesson(p_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.lessons l
    where l.id = p_id
      and (l.owner_id = (select auth.uid()) or (l.owner_id is null and public.is_admin()))
  );
$$;

create function public.can_write_slot(p_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.lesson_slots s
    where s.id = p_id and public.can_write_lesson(s.lesson_id)
  );
$$;

revoke execute on function public.can_write_lesson(uuid) from public, anon;
revoke execute on function public.can_write_slot(uuid) from public, anon;
grant execute on function public.can_write_lesson(uuid) to authenticated;
grant execute on function public.can_write_slot(uuid) to authenticated;

drop policy "lessons: own" on public.lessons;
create policy "lessons: select shared or own"
  on public.lessons for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
create policy "lessons: insert"
  on public.lessons for insert to authenticated
  with check (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()));
create policy "lessons: update"
  on public.lessons for update to authenticated
  using (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()))
  with check (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()));
create policy "lessons: delete"
  on public.lessons for delete to authenticated
  using (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()));

-- children: the select policies (parent visible) stay; writes now need write access to the class
drop policy "lesson_equipment: insert" on public.lesson_equipment;
drop policy "lesson_equipment: update" on public.lesson_equipment;
drop policy "lesson_equipment: delete" on public.lesson_equipment;
create policy "lesson_equipment: insert"
  on public.lesson_equipment for insert to authenticated
  with check (
    public.can_write_lesson(lesson_id)
    and exists (select 1 from public.equipment q where q.id = equipment_id)
  );
create policy "lesson_equipment: update"
  on public.lesson_equipment for update to authenticated
  using (public.can_write_lesson(lesson_id))
  with check (
    public.can_write_lesson(lesson_id)
    and exists (select 1 from public.equipment q where q.id = equipment_id)
  );
create policy "lesson_equipment: delete"
  on public.lesson_equipment for delete to authenticated
  using (public.can_write_lesson(lesson_id));

drop policy "lesson_slots: insert" on public.lesson_slots;
drop policy "lesson_slots: update" on public.lesson_slots;
drop policy "lesson_slots: delete" on public.lesson_slots;
create policy "lesson_slots: insert"
  on public.lesson_slots for insert to authenticated
  with check (
    public.can_write_lesson(lesson_id)
    and exists (select 1 from public.blocks b where b.id = block_id)
  );
create policy "lesson_slots: update"
  on public.lesson_slots for update to authenticated
  using (public.can_write_lesson(lesson_id))
  with check (
    public.can_write_lesson(lesson_id)
    and exists (select 1 from public.blocks b where b.id = block_id)
  );
create policy "lesson_slots: delete"
  on public.lesson_slots for delete to authenticated
  using (public.can_write_lesson(lesson_id));

drop policy "lesson_items: insert" on public.lesson_items;
drop policy "lesson_items: update" on public.lesson_items;
drop policy "lesson_items: delete" on public.lesson_items;
create policy "lesson_items: insert"
  on public.lesson_items for insert to authenticated
  with check (
    public.can_write_slot(lesson_slot_id)
    and exists (select 1 from public.exercises e where e.id = exercise_id)
  );
create policy "lesson_items: update"
  on public.lesson_items for update to authenticated
  using (public.can_write_slot(lesson_slot_id))
  with check (
    public.can_write_slot(lesson_slot_id)
    and exists (select 1 from public.exercises e where e.id = exercise_id)
  );
create policy "lesson_items: delete"
  on public.lesson_items for delete to authenticated
  using (public.can_write_slot(lesson_slot_id));

-- ---------------------------------------------------------------------------
-- 5. RPCs
-- ---------------------------------------------------------------------------

-- create_lesson: a new private class. With from_lesson_id it copies that class (any class the
-- caller can see, e.g. a shared example): blocks, exercises, notes, equipment, and the
-- level/length defaults, each overridable by the payload. Without it, the class starts blank.
-- payload: { from_lesson_id?, method_id?, title, lesson_date?, level?, target_duration_min?,
--            equipment_ids? }  (equipment_ids present, even empty, replaces the copied equipment)
create or replace function public.create_lesson(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_src uuid := nullif(payload ->> 'from_lesson_id', '')::uuid;
  src public.lessons;
  new_id uuid;
  s record;
  new_slot uuid;
begin
  if v_src is not null then
    select * into src from public.lessons where id = v_src;
    if not found then
      raise exception 'lesson not found' using errcode = 'P0002';
    end if;
  end if;

  insert into public.lessons (method_id, source_lesson_id, title, lesson_date, level,
                              target_duration_min, notes)
  values (
    coalesce(nullif(payload ->> 'method_id', '')::uuid, src.method_id),
    v_src,
    payload ->> 'title',
    nullif(payload ->> 'lesson_date', '')::date,
    coalesce(nullif(payload ->> 'level', '')::public.exercise_level, src.level, 'fundamental'),
    coalesce(nullif(payload ->> 'target_duration_min', '')::integer, src.target_duration_min),
    src.notes
  )
  returning id into new_id;

  if v_src is not null then
    for s in select * from public.lesson_slots where lesson_id = v_src order by position loop
      insert into public.lesson_slots (lesson_id, block_id, position, label, is_skipped, notes,
                                       hint, is_optional, min_exercises)
      values (new_id, s.block_id, s.position, s.label, s.is_skipped, s.notes,
              s.hint, s.is_optional, s.min_exercises)
      returning id into new_slot;

      insert into public.lesson_items (lesson_slot_id, exercise_id, position, reps, duration_sec,
                                       springs, notes)
      select new_slot, exercise_id, position, reps, duration_sec, springs, notes
      from public.lesson_items where lesson_slot_id = s.id;
    end loop;
  end if;

  if payload ? 'equipment_ids' then
    insert into public.lesson_equipment (lesson_id, equipment_id)
    select new_id, e::uuid
    from jsonb_array_elements_text(coalesce(payload -> 'equipment_ids', '[]'::jsonb)) as e;
  elsif v_src is not null then
    insert into public.lesson_equipment (lesson_id, equipment_id)
    select new_id, equipment_id from public.lesson_equipment where lesson_id = v_src;
  end if;

  return new_id;
end;
$$;

-- duplicate_lesson: a private draft copy titled "<title> (copy)" (works on shared classes too).
create or replace function public.duplicate_lesson(p_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  src public.lessons;
begin
  select * into src from public.lessons where id = p_id;
  if not found then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;
  return public.create_lesson(jsonb_build_object(
    'from_lesson_id', p_id,
    'title', src.title || ' (copy)',
    'lesson_date', src.lesson_date
  ));
end;
$$;

-- reorder: the template slot kind is gone.
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
  else
    raise exception 'unknown kind %', p_kind using errcode = '22023';
  end if;
end;
$$;

-- publish_class: an admin turns one of their own classes into a shared example class.
create function public.publish_class(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'only an admin can publish a class' using errcode = '42501';
  end if;
  update public.lessons set owner_id = null, status = 'ready'
  where id = p_id and owner_id = (select auth.uid());
  if not found then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.publish_class(uuid) from public, anon;
grant execute on function public.publish_class(uuid) to authenticated;
