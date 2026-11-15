-- Increment 3c: equipment presets ("Studio", "Home mat class"): a named set of equipment that is
-- loaded into a lesson in one click. Own-only: every operation is limited to the owner's rows.

create table public.equipment_presets (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.equipment_preset_items (
  preset_id    uuid not null references public.equipment_presets (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  primary key (preset_id, equipment_id)
);

create index equipment_preset_items_equipment_idx on public.equipment_preset_items (equipment_id);

alter table public.equipment_presets enable row level security;
alter table public.equipment_preset_items enable row level security;

revoke all on public.equipment_presets, public.equipment_preset_items from anon, authenticated;
grant select, insert, update, delete on public.equipment_presets to authenticated;
grant select, insert, update, delete on public.equipment_preset_items to authenticated;

create policy "equipment_presets: own"
  on public.equipment_presets for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Items: the parent preset must be the caller's (RLS on presets applies inside EXISTS), and the
-- equipment must be visible to the caller.
create policy "equipment_preset_items: select"
  on public.equipment_preset_items for select to authenticated
  using (exists (select 1 from public.equipment_presets p where p.id = preset_id));

create policy "equipment_preset_items: insert"
  on public.equipment_preset_items for insert to authenticated
  with check (
    exists (select 1 from public.equipment_presets p where p.id = preset_id)
    and exists (select 1 from public.equipment e where e.id = equipment_id)
  );

create policy "equipment_preset_items: update"
  on public.equipment_preset_items for update to authenticated
  using (exists (select 1 from public.equipment_presets p where p.id = preset_id))
  with check (
    exists (select 1 from public.equipment_presets p where p.id = preset_id)
    and exists (select 1 from public.equipment e where e.id = equipment_id)
  );

create policy "equipment_preset_items: delete"
  on public.equipment_preset_items for delete to authenticated
  using (exists (select 1 from public.equipment_presets p where p.id = preset_id));

-- ---------------------------------------------------------------------------
-- save_preset: create or replace a preset and its equipment atomically.
-- payload: { id?, name, equipment_ids: [uuid] }
-- Without an id, a preset with the same name (the caller's) is replaced, so "Save as preset"
-- under an existing name updates it instead of failing on the unique name.
-- ---------------------------------------------------------------------------
create function public.save_preset(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := nullif(payload ->> 'id', '')::uuid;
  v_name text := btrim(payload ->> 'name');
begin
  if v_id is null then
    select id into v_id from public.equipment_presets
    where owner_id = (select auth.uid()) and name = v_name;
  end if;

  if v_id is null then
    insert into public.equipment_presets (name) values (v_name) returning id into v_id;
  else
    update public.equipment_presets set name = v_name where id = v_id;
    if not found then
      raise exception 'preset not found' using errcode = 'P0002';
    end if;
    delete from public.equipment_preset_items where preset_id = v_id;
  end if;

  insert into public.equipment_preset_items (preset_id, equipment_id)
  select distinct v_id, e::uuid
  from jsonb_array_elements_text(coalesce(payload -> 'equipment_ids', '[]'::jsonb)) as e;

  return v_id;
end;
$$;

revoke execute on function public.save_preset(jsonb) from public, anon;
grant execute on function public.save_preset(jsonb) to authenticated;
