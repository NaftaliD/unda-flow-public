begin;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.com');

-- Signup trigger --------------------------------------------------------------
select is(
  (select count(*)::int from public.profiles
    where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b')),
  2,
  'signup creates a profile for each user'
);

select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'alice',
  'display_name defaults to the email prefix'
);

-- Signed in as Alice ----------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select is((select count(*)::int from public.profiles), 1, 'user A sees only their own profile');

select is(public.is_admin(), false, 'new users are not admins');

select throws_ok(
  $$update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a'$$,
  '42501',
  null,
  'a user cannot promote themselves'
);

select lives_ok(
  $$update public.profiles set display_name = 'Alice' where id = '00000000-0000-0000-0000-00000000000a'$$,
  'a user can edit their own display_name'
);

-- Updating someone else's row is silently a no-op under RLS.
update public.profiles set display_name = 'hacked'
  where id = '00000000-0000-0000-0000-00000000000b';

-- Back to the database owner (no JWT) -----------------------------------------
reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  'bob',
  'user A cannot modify user B''s profile'
);

select lives_ok(
  $$update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a'$$,
  'direct database access (no JWT) can promote the first admin'
);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select is(public.is_admin(), true, 'is_admin() is true after promotion');

-- Anonymous visitor -----------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is((select count(*)::int from public.keep_alive), 1, 'anon can read keep_alive');

select throws_ok(
  $$insert into public.keep_alive (id) values (2)$$,
  '42501',
  null,
  'anon cannot write keep_alive'
);

select throws_ok(
  $$select * from public.profiles$$,
  '42501',
  null,
  'anon cannot read profiles'
);

select * from finish();
rollback;
