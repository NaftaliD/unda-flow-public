-- Increment 3b: series. A series is an ordered set of exercises for one block (e.g. "Reformer foot
-- work") that can be added to a lesson block in one action. Shared (owner_id IS NULL, admin-writable)
-- or private. series_items are governed by the parent series via EXISTS.

create table public.series (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references auth.users (id) on delete cascade,
  block_id   uuid not null references public.blocks (id),
  name       text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deleting an exercise removes it from any series (unlike lesson items, which block deletion).
create table public.series_items (
  series_id   uuid not null references public.series (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  position    integer not null default 0,
  primary key (series_id, exercise_id)
);

create index series_owner_idx on public.series (owner_id);
create index series_block_idx on public.series (block_id);
create index series_items_exercise_idx on public.series_items (exercise_id);
create index series_items_order_idx on public.series_items (series_id, position);

create trigger series_touch_updated_at
  before update on public.series
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS + explicit grants (never rely on default privileges)
-- ---------------------------------------------------------------------------
alter table public.series enable row level security;
alter table public.series_items enable row level security;

revoke all on public.series, public.series_items from anon, authenticated;
grant select, insert, update, delete on public.series to authenticated;
grant select, insert, update, delete on public.series_items to authenticated;
-- The local import script (secret key = service_role) inserts series; insert-only.
grant select, insert on public.series, public.series_items to service_role;

create policy "series: select shared or own"
  on public.series for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));

create policy "series: insert"
  on public.series for insert to authenticated
  with check (
    (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()))
    and exists (select 1 from public.blocks b where b.id = block_id)
  );

create policy "series: update"
  on public.series for update to authenticated
  using (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()))
  with check (
    (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()))
    and exists (select 1 from public.blocks b where b.id = block_id)
  );

create policy "series: delete"
  on public.series for delete to authenticated
  using (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()));

create policy "series_items: select"
  on public.series_items for select to authenticated
  using (exists (select 1 from public.series s where s.id = series_id));

create policy "series_items: insert"
  on public.series_items for insert to authenticated
  with check (
    exists (
      select 1 from public.series s
      where s.id = series_id
        and (s.owner_id = (select auth.uid()) or (s.owner_id is null and public.is_admin()))
    )
    and exists (select 1 from public.exercises e where e.id = exercise_id)
  );

create policy "series_items: update"
  on public.series_items for update to authenticated
  using (
    exists (
      select 1 from public.series s
      where s.id = series_id
        and (s.owner_id = (select auth.uid()) or (s.owner_id is null and public.is_admin()))
    )
  )
  with check (
    exists (
      select 1 from public.series s
      where s.id = series_id
        and (s.owner_id = (select auth.uid()) or (s.owner_id is null and public.is_admin()))
    )
    and exists (select 1 from public.exercises e where e.id = exercise_id)
  );

create policy "series_items: delete"
  on public.series_items for delete to authenticated
  using (
    exists (
      select 1 from public.series s
      where s.id = series_id
        and (s.owner_id = (select auth.uid()) or (s.owner_id is null and public.is_admin()))
    )
  );

-- ---------------------------------------------------------------------------
-- save_series: create or replace a series and its ordered exercises atomically.
-- payload: { id?, shared?, block_id, name, exercise_ids: [uuid] }
-- A new series is private unless `shared` is true (RLS then requires an admin).
-- ---------------------------------------------------------------------------
create function public.save_series(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := nullif(payload ->> 'id', '')::uuid;
begin
  if v_id is null then
    insert into public.series (owner_id, block_id, name)
    values (
      case when coalesce((payload ->> 'shared')::boolean, false) then null else (select auth.uid()) end,
      (payload ->> 'block_id')::uuid,
      btrim(payload ->> 'name')
    ) returning id into v_id;
  else
    update public.series set
      block_id = (payload ->> 'block_id')::uuid,
      name = btrim(payload ->> 'name')
    where id = v_id;
    if not found then
      raise exception 'series not found or not editable' using errcode = '42501';
    end if;
    delete from public.series_items where series_id = v_id;
  end if;

  insert into public.series_items (series_id, exercise_id, position)
  select v_id, e.id::uuid, (e.ordinality - 1)::integer
  from jsonb_array_elements_text(coalesce(payload -> 'exercise_ids', '[]'::jsonb))
    with ordinality as e(id, ordinality)
  on conflict do nothing;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- add_series_to_slot: append every (non-archived) exercise of a series to a lesson block, in
-- order, copying each exercise's defaults. Returns how many were added. RLS decides what the
-- caller may see/insert, so another user's slot or private exercise is never touched.
-- ---------------------------------------------------------------------------
create function public.add_series_to_slot(p_slot_id uuid, p_series_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_start integer;
  v_added integer;
begin
  if not exists (select 1 from public.lesson_slots where id = p_slot_id) then
    raise exception 'lesson block not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.series where id = p_series_id) then
    raise exception 'series not found' using errcode = 'P0002';
  end if;

  select coalesce(max(position), -1) + 1 into v_start
  from public.lesson_items where lesson_slot_id = p_slot_id;

  insert into public.lesson_items (lesson_slot_id, exercise_id, position, reps, duration_sec, springs)
  select p_slot_id, e.id, v_start + (row_number() over (order by si.position) - 1)::integer,
         e.default_reps, e.default_duration_sec, e.default_springs
  from public.series_items si
  join public.exercises e on e.id = si.exercise_id
  where si.series_id = p_series_id and not e.is_archived
  order by si.position;

  get diagnostics v_added = row_count;
  return v_added;
end;
$$;

revoke execute on function public.save_series(jsonb) from public, anon;
revoke execute on function public.add_series_to_slot(uuid, uuid) from public, anon;
grant execute on function public.save_series(jsonb) to authenticated;
grant execute on function public.add_series_to_slot(uuid, uuid) to authenticated;
