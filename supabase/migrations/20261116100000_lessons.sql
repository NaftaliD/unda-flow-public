-- Increment 2: lesson builder. lessons, lesson_equipment, lesson_slots, lesson_items.
-- Everything here is private to the lesson's owner. Child tables check the parent via EXISTS
-- (RLS on the parent applies inside the EXISTS, so ownership is enforced transitively).

create type public.lesson_status as enum ('draft', 'ready', 'taught');

create table public.lessons (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  method_id           uuid not null references public.methods (id),
  template_id         uuid,  -- FK added with templates (Increment 3)
  title               text not null check (length(btrim(title)) > 0),
  lesson_date         date not null default current_date,
  level               public.exercise_level not null default 'fundamental',
  target_duration_min integer check (target_duration_min is null or target_duration_min > 0),
  notes               text,
  status              public.lesson_status not null default 'draft',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.lesson_equipment (
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id),
  primary key (lesson_id, equipment_id)
);

create table public.lesson_slots (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons (id) on delete cascade,
  block_id   uuid not null references public.blocks (id),
  position   integer not null default 0,
  label      text not null,
  is_skipped boolean not null default false,
  notes      text
);

-- exercise_id has no ON DELETE action on purpose: an exercise used in a lesson cannot be
-- deleted (archive it instead). NO ACTION (not RESTRICT) keeps account-deletion cascades valid.
create table public.lesson_items (
  id             uuid primary key default gen_random_uuid(),
  lesson_slot_id uuid not null references public.lesson_slots (id) on delete cascade,
  exercise_id    uuid not null references public.exercises (id),
  position       integer not null default 0,
  reps           integer check (reps is null or reps > 0),
  duration_sec   integer check (duration_sec is null or duration_sec > 0),
  springs        text,
  notes          text
);

create index lessons_owner_date_idx on public.lessons (owner_id, lesson_date desc);
create index lessons_method_idx on public.lessons (method_id);
create index lesson_equipment_equipment_idx on public.lesson_equipment (equipment_id);
create index lesson_slots_lesson_idx on public.lesson_slots (lesson_id, position);
create index lesson_slots_block_idx on public.lesson_slots (block_id);
create index lesson_items_slot_idx on public.lesson_items (lesson_slot_id, position);
create index lesson_items_exercise_idx on public.lesson_items (exercise_id);

create trigger lessons_touch_updated_at
  before update on public.lessons
  for each row execute function public.touch_updated_at();

-- Editing slots or items bumps the lesson's updated_at (the list sorts by it).
create function public.touch_lesson_from_slot()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.lessons set updated_at = now() where id = coalesce(new.lesson_id, old.lesson_id);
  return null;
end;
$$;

create function public.touch_lesson_from_item()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.lessons l set updated_at = now()
  from public.lesson_slots s
  where s.id = coalesce(new.lesson_slot_id, old.lesson_slot_id) and l.id = s.lesson_id;
  return null;
end;
$$;

create trigger lesson_slots_touch_lesson
  after insert or update or delete on public.lesson_slots
  for each row execute function public.touch_lesson_from_slot();

create trigger lesson_items_touch_lesson
  after insert or update or delete on public.lesson_items
  for each row execute function public.touch_lesson_from_item();

revoke execute on function public.touch_lesson_from_slot() from public, anon, authenticated;
revoke execute on function public.touch_lesson_from_item() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS + explicit grants (never rely on default privileges)
-- ---------------------------------------------------------------------------
alter table public.lessons enable row level security;
alter table public.lesson_equipment enable row level security;
alter table public.lesson_slots enable row level security;
alter table public.lesson_items enable row level security;

revoke all on public.lessons, public.lesson_equipment, public.lesson_slots, public.lesson_items
  from anon, authenticated;
grant select, insert, update, delete on public.lessons to authenticated;
grant select, insert, update, delete on public.lesson_equipment to authenticated;
grant select, insert, update, delete on public.lesson_slots to authenticated;
grant select, insert, update, delete on public.lesson_items to authenticated;

create policy "lessons: own"
  on public.lessons for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- lesson_equipment: parent lesson must be the caller's; equipment must be visible
create policy "lesson_equipment: select"
  on public.lesson_equipment for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id));

create policy "lesson_equipment: insert"
  on public.lesson_equipment for insert to authenticated
  with check (
    exists (select 1 from public.lessons l where l.id = lesson_id)
    and exists (select 1 from public.equipment q where q.id = equipment_id)
  );

create policy "lesson_equipment: update"
  on public.lesson_equipment for update to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id))
  with check (
    exists (select 1 from public.lessons l where l.id = lesson_id)
    and exists (select 1 from public.equipment q where q.id = equipment_id)
  );

create policy "lesson_equipment: delete"
  on public.lesson_equipment for delete to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id));

-- lesson_slots: parent lesson must be the caller's; block must be visible
create policy "lesson_slots: select"
  on public.lesson_slots for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id));

create policy "lesson_slots: insert"
  on public.lesson_slots for insert to authenticated
  with check (
    exists (select 1 from public.lessons l where l.id = lesson_id)
    and exists (select 1 from public.blocks b where b.id = block_id)
  );

create policy "lesson_slots: update"
  on public.lesson_slots for update to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id))
  with check (
    exists (select 1 from public.lessons l where l.id = lesson_id)
    and exists (select 1 from public.blocks b where b.id = block_id)
  );

create policy "lesson_slots: delete"
  on public.lesson_slots for delete to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id));

-- lesson_items: parent slot must belong to the caller; exercise must be visible
create policy "lesson_items: select"
  on public.lesson_items for select to authenticated
  using (exists (select 1 from public.lesson_slots s where s.id = lesson_slot_id));

create policy "lesson_items: insert"
  on public.lesson_items for insert to authenticated
  with check (
    exists (select 1 from public.lesson_slots s where s.id = lesson_slot_id)
    and exists (select 1 from public.exercises e where e.id = exercise_id)
  );

create policy "lesson_items: update"
  on public.lesson_items for update to authenticated
  using (exists (select 1 from public.lesson_slots s where s.id = lesson_slot_id))
  with check (
    exists (select 1 from public.lesson_slots s where s.id = lesson_slot_id)
    and exists (select 1 from public.exercises e where e.id = exercise_id)
  );

create policy "lesson_items: delete"
  on public.lesson_items for delete to authenticated
  using (exists (select 1 from public.lesson_slots s where s.id = lesson_slot_id));

-- ---------------------------------------------------------------------------
-- create_lesson: lesson + slots + equipment in one transaction (SECURITY INVOKER).
-- payload: { method_id, title, lesson_date?, level?, target_duration_min?,
--            equipment_ids: [uuid], slots: [{ block_id, label }] }  (slot order = position)
-- ---------------------------------------------------------------------------
create function public.create_lesson(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  insert into public.lessons (method_id, title, lesson_date, level, target_duration_min)
  values (
    (payload ->> 'method_id')::uuid,
    payload ->> 'title',
    coalesce((payload ->> 'lesson_date')::date, current_date),
    coalesce((payload ->> 'level')::public.exercise_level, 'fundamental'),
    nullif(payload ->> 'target_duration_min', '')::integer
  )
  returning id into new_id;

  insert into public.lesson_slots (lesson_id, block_id, position, label)
  select new_id, (s.value ->> 'block_id')::uuid, (s.ordinality - 1)::integer, s.value ->> 'label'
  from jsonb_array_elements(coalesce(payload -> 'slots', '[]'::jsonb)) with ordinality as s(value, ordinality);

  insert into public.lesson_equipment (lesson_id, equipment_id)
  select new_id, e::uuid
  from jsonb_array_elements_text(coalesce(payload -> 'equipment_ids', '[]'::jsonb)) as e;

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- duplicate_lesson: copy a lesson with its slots, items and equipment as a new draft.
-- ---------------------------------------------------------------------------
create function public.duplicate_lesson(p_id uuid)
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
    insert into public.lesson_slots (lesson_id, block_id, position, label, is_skipped, notes)
    values (new_id, s.block_id, s.position, s.label, s.is_skipped, s.notes)
    returning id into new_slot;

    insert into public.lesson_items (lesson_slot_id, exercise_id, position, reps, duration_sec, springs, notes)
    select new_slot, exercise_id, position, reps, duration_sec, springs, notes
    from public.lesson_items where lesson_slot_id = s.id;
  end loop;

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- reorder: set positions from an ordered id list. kind = 'slots' | 'items'.
-- RLS filters the update, so ids that are not the caller's are silently ignored.
-- ---------------------------------------------------------------------------
create function public.reorder(p_kind text, p_ids uuid[])
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

revoke execute on function public.create_lesson(jsonb) from public, anon;
revoke execute on function public.duplicate_lesson(uuid) from public, anon;
revoke execute on function public.reorder(text, uuid[]) from public, anon;
grant execute on function public.create_lesson(jsonb) to authenticated;
grant execute on function public.duplicate_lesson(uuid) to authenticated;
grant execute on function public.reorder(text, uuid[]) to authenticated;
