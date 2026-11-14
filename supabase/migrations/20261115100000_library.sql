-- Increment 1: shared library. methods, blocks, equipment, exercises, exercise_equipment.
-- owner_id IS NULL = shared library (admin-writable); owner_id = auth.uid() = private content.

create type public.exercise_level as enum ('fundamental', 'intermediate', 'advanced');
create type public.equipment_kind as enum ('apparatus', 'prop');
create type public.review_status as enum ('needs_review', 'verified');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.methods (
  id        uuid primary key default gen_random_uuid(),
  key       text not null unique,
  name      text not null,
  is_active boolean not null default true
);

create table public.blocks (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid references auth.users (id) on delete cascade,
  method_id        uuid not null references public.methods (id),
  key              text not null,
  name             text not null,
  goal             text,
  default_position smallint not null default 0,
  unique nulls not distinct (owner_id, method_id, key)
);

create table public.equipment (
  id       uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade,
  key      text not null,
  name     text not null,
  kind     public.equipment_kind not null,
  unique nulls not distinct (owner_id, key)
);

create table public.exercises (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid references auth.users (id) on delete cascade,
  method_id           uuid not null references public.methods (id),
  block_id            uuid not null references public.blocks (id),
  name                text not null check (length(btrim(name)) > 0),
  description         text,
  cues                text,
  level               public.exercise_level not null default 'fundamental',
  default_reps        integer check (default_reps is null or default_reps > 0),
  default_duration_sec integer check (default_duration_sec is null or default_duration_sec > 0),
  default_springs     text,
  media_url           text,
  review_status       public.review_status not null default 'verified',
  is_archived         boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.exercise_equipment (
  exercise_id  uuid not null references public.exercises (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id),
  alt_group    smallint not null default 0,
  primary key (exercise_id, equipment_id)
);

create index blocks_method_idx on public.blocks (method_id);
create index blocks_owner_idx on public.blocks (owner_id);
create index equipment_owner_idx on public.equipment (owner_id);
create index exercises_owner_idx on public.exercises (owner_id);
create index exercises_block_idx on public.exercises (block_id);
create index exercises_method_idx on public.exercises (method_id);
create index exercise_equipment_equipment_idx on public.exercise_equipment (equipment_id);

create function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger exercises_touch_updated_at
  before update on public.exercises
  for each row execute function public.touch_updated_at();

revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS + explicit grants (never rely on default privileges)
-- ---------------------------------------------------------------------------
alter table public.methods enable row level security;
alter table public.blocks enable row level security;
alter table public.equipment enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_equipment enable row level security;

revoke all on public.methods, public.blocks, public.equipment,
  public.exercises, public.exercise_equipment from anon, authenticated;

grant select on public.methods to authenticated;
grant select, insert, update, delete on public.blocks to authenticated;
grant select, insert, update, delete on public.equipment to authenticated;
grant select, insert, update, delete on public.exercises to authenticated;
grant select, insert, update, delete on public.exercise_equipment to authenticated;

create policy "methods: read"
  on public.methods for select to authenticated
  using (true);

-- blocks
create policy "blocks: select shared or own"
  on public.blocks for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));

create policy "blocks: insert"
  on public.blocks for insert to authenticated
  with check (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()));

create policy "blocks: update"
  on public.blocks for update to authenticated
  using (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()))
  with check (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()));

create policy "blocks: delete"
  on public.blocks for delete to authenticated
  using (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()));

-- equipment
create policy "equipment: select shared or own"
  on public.equipment for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));

create policy "equipment: insert"
  on public.equipment for insert to authenticated
  with check (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()));

create policy "equipment: update"
  on public.equipment for update to authenticated
  using (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()))
  with check (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()));

create policy "equipment: delete"
  on public.equipment for delete to authenticated
  using (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()));

-- exercises (the block must be visible to the writer)
create policy "exercises: select shared or own"
  on public.exercises for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));

create policy "exercises: insert"
  on public.exercises for insert to authenticated
  with check (
    (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()))
    and exists (select 1 from public.blocks b where b.id = block_id)
  );

create policy "exercises: update"
  on public.exercises for update to authenticated
  using (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()))
  with check (
    (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()))
    and exists (select 1 from public.blocks b where b.id = block_id)
  );

create policy "exercises: delete"
  on public.exercises for delete to authenticated
  using (owner_id = (select auth.uid()) or (owner_id is null and public.is_admin()));

-- exercise_equipment: governed by the parent exercise (RLS on exercises applies inside EXISTS)
create policy "exercise_equipment: select"
  on public.exercise_equipment for select to authenticated
  using (exists (select 1 from public.exercises e where e.id = exercise_id));

create policy "exercise_equipment: insert"
  on public.exercise_equipment for insert to authenticated
  with check (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_id
        and (e.owner_id = (select auth.uid()) or (e.owner_id is null and public.is_admin()))
    )
    and exists (select 1 from public.equipment q where q.id = equipment_id)
  );

create policy "exercise_equipment: update"
  on public.exercise_equipment for update to authenticated
  using (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_id
        and (e.owner_id = (select auth.uid()) or (e.owner_id is null and public.is_admin()))
    )
  )
  with check (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_id
        and (e.owner_id = (select auth.uid()) or (e.owner_id is null and public.is_admin()))
    )
    and exists (select 1 from public.equipment q where q.id = equipment_id)
  );

create policy "exercise_equipment: delete"
  on public.exercise_equipment for delete to authenticated
  using (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_id
        and (e.owner_id = (select auth.uid()) or (e.owner_id is null and public.is_admin()))
    )
  );

-- ---------------------------------------------------------------------------
-- save_exercise: create or update an exercise and replace its equipment
-- requirements in one transaction. SECURITY INVOKER, so RLS still decides.
--
-- payload: { id?, block_id, name, description?, cues?, level, default_reps?,
--            default_duration_sec?, default_springs?, review_status?,
--            groups: [[equipment_id, ...], ...] }     (one inner array per alt_group)
-- New rows are always private (owner = caller); an admin editing a shared row
-- keeps it shared.
-- ---------------------------------------------------------------------------
create function public.save_exercise(payload jsonb)
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

  return v_id;
end;
$$;

revoke execute on function public.save_exercise(jsonb) from public, anon;
grant execute on function public.save_exercise(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Reference data (in the migration so the hosted project gets it on db push)
-- ---------------------------------------------------------------------------
insert into public.methods (key, name) values ('block', 'Block method');

insert into public.blocks (method_id, key, name, goal, default_position)
select m.id, b.key, b.name, b.goal, b.pos
from public.methods m,
  (values
    ('warm_up', 'Warm-up', 'Warm the centre and spinal articulation; not a stretching block.', 1),
    ('foot_work', 'Foot work', 'Leg and foot alignment under load, including single leg. Usually a full series.', 2),
    ('abdominal', 'Abdominal work', 'One or two abdominal exercises under spring load.', 3),
    ('hip_work', 'Hip work', 'Pelvis and hip stabilisers, legs in straps.', 4),
    ('stretch', 'Stretches', 'Mainly hip flexors (psoas).', 5),
    ('spinal_articulation', 'Spinal articulation', 'Segmental spine movement.', 6),
    ('fbi', 'Full body integration', 'Multi-muscle-group integration.', 7),
    ('leg_work', 'Leg work', 'Extra leg block, glutes and adductors.', 8),
    ('lateral_rotation', 'Lateral flexion / rotation', 'Side bending and rotation.', 9),
    ('arm_work', 'Arm work', 'Shoulder girdle in several planes.', 10),
    ('back_extension', 'Back extension', 'Range and strength once the whole body is prepared.', 11)
  ) as b (key, name, goal, pos)
where m.key = 'block';

insert into public.equipment (key, name, kind) values
  ('reformer', 'Reformer', 'apparatus'),
  ('cadillac', 'Cadillac', 'apparatus'),
  ('chair', 'Chair', 'apparatus'),
  ('barrel', 'Barrel', 'apparatus'),
  ('mat', 'Mat', 'apparatus'),
  ('box', 'Box', 'prop'),
  ('ball', 'Ball', 'prop'),
  ('ring', 'Ring', 'prop'),
  ('band', 'Band', 'prop'),
  ('weights', 'Weights', 'prop');
