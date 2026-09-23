-- ============================================================
-- Venture Dashboard v3 — Lab. Kewirausahaan II
-- Secure multi-user schema
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  nim text,
  role text not null default 'student' check (role in ('student','lecturer')),
  class_name text not null default 'Lab. Kewirausahaan II',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ventures (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.profiles(id) on delete cascade,
  venture_name text not null,
  category text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.module_data (
  id bigint generated always as identity primary key,
  venture_id uuid not null references public.ventures(id) on delete cascade,
  module_name text not null check (
    module_name in ('health','kpi','problem','experiment','evidence','sprint','financial','portfolio')
  ),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (venture_id, module_name)
);

create table if not exists public.weekly_submissions (
  id bigint generated always as identity primary key,
  venture_id uuid not null references public.ventures(id) on delete cascade,
  week integer not null check (week between 1 and 16),
  status text not null default 'draft' check (status in ('draft','submitted','reviewed')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (venture_id, week)
);

create table if not exists public.lecturer_feedback (
  id bigint generated always as identity primary key,
  venture_id uuid not null references public.ventures(id) on delete cascade,
  lecturer_id uuid not null references public.profiles(id) on delete cascade,
  module_name text check (
    module_name is null
    or module_name in ('health','kpi','problem','experiment','evidence','sprint','financial','portfolio')
  ),
  week integer check (week is null or week between 1 and 16),
  message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Internal helper schema: not exposed through Data API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_lecturer()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'lecturer'
  );
$$;

revoke all on function private.is_lecturer() from public, anon, authenticated, service_role;
grant execute on function private.is_lecturer() to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  insert into public.profiles (id, full_name, nim, role, class_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    nullif(new.raw_user_meta_data->>'nim',''),
    'student',
    coalesce(
      nullif(new.raw_user_meta_data->>'class_name',''),
      'Lab. Kewirausahaan II'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated, service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure private.handle_new_user();

-- Backfill Auth users that existed before the schema.
insert into public.profiles (id, full_name, nim, role, class_name)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name',''),
  nullif(u.raw_user_meta_data->>'nim',''),
  'student',
  coalesce(
    nullif(u.raw_user_meta_data->>'class_name',''),
    'Lab. Kewirausahaan II'
  )
from auth.users u
on conflict (id) do nothing;

-- RLS
alter table public.profiles enable row level security;
alter table public.ventures enable row level security;
alter table public.module_data enable row level security;
alter table public.weekly_submissions enable row level security;
alter table public.lecturer_feedback enable row level security;

drop policy if exists profile_select_self_or_lecturer on public.profiles;
drop policy if exists profile_update_self on public.profiles;
drop policy if exists venture_select_owner_or_lecturer on public.ventures;
drop policy if exists venture_insert_owner on public.ventures;
drop policy if exists venture_update_owner on public.ventures;
drop policy if exists module_select_owner_or_lecturer on public.module_data;
drop policy if exists module_insert_owner on public.module_data;
drop policy if exists module_update_owner on public.module_data;
drop policy if exists submission_select_owner_or_lecturer on public.weekly_submissions;
drop policy if exists submission_insert_owner on public.weekly_submissions;
drop policy if exists submission_update_owner on public.weekly_submissions;
drop policy if exists submission_update_lecturer on public.weekly_submissions;
drop policy if exists feedback_select_owner_or_lecturer on public.lecturer_feedback;
drop policy if exists feedback_insert_lecturer on public.lecturer_feedback;
drop policy if exists feedback_update_lecturer on public.lecturer_feedback;
drop policy if exists feedback_delete_lecturer on public.lecturer_feedback;

create policy profile_select_self_or_lecturer
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id or private.is_lecturer());

create policy profile_update_self
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy venture_select_owner_or_lecturer
on public.ventures
for select
to authenticated
using (student_id = (select auth.uid()) or private.is_lecturer());

create policy venture_insert_owner
on public.ventures
for insert
to authenticated
with check (student_id = (select auth.uid()));

create policy venture_update_owner
on public.ventures
for update
to authenticated
using (student_id = (select auth.uid()))
with check (student_id = (select auth.uid()));

create policy module_select_owner_or_lecturer
on public.module_data
for select
to authenticated
using (
  private.is_lecturer()
  or exists (
    select 1
    from public.ventures v
    where v.id = module_data.venture_id
      and v.student_id = (select auth.uid())
  )
);

create policy module_insert_owner
on public.module_data
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ventures v
    where v.id = module_data.venture_id
      and v.student_id = (select auth.uid())
  )
);

create policy module_update_owner
on public.module_data
for update
to authenticated
using (
  exists (
    select 1
    from public.ventures v
    where v.id = module_data.venture_id
      and v.student_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.ventures v
    where v.id = module_data.venture_id
      and v.student_id = (select auth.uid())
  )
);

create policy submission_select_owner_or_lecturer
on public.weekly_submissions
for select
to authenticated
using (
  private.is_lecturer()
  or exists (
    select 1
    from public.ventures v
    where v.id = weekly_submissions.venture_id
      and v.student_id = (select auth.uid())
  )
);

-- Student may only create Draft/Submitted.
create policy submission_insert_owner
on public.weekly_submissions
for insert
to authenticated
with check (
  status in ('draft','submitted')
  and reviewed_at is null
  and exists (
    select 1
    from public.ventures v
    where v.id = weekly_submissions.venture_id
      and v.student_id = (select auth.uid())
  )
);

-- Student may never promote a row to Reviewed.
create policy submission_update_owner
on public.weekly_submissions
for update
to authenticated
using (
  exists (
    select 1
    from public.ventures v
    where v.id = weekly_submissions.venture_id
      and v.student_id = (select auth.uid())
  )
)
with check (
  status in ('draft','submitted')
  and reviewed_at is null
  and exists (
    select 1
    from public.ventures v
    where v.id = weekly_submissions.venture_id
      and v.student_id = (select auth.uid())
  )
);

-- Lecturer may mark a submission Reviewed.
create policy submission_update_lecturer
on public.weekly_submissions
for update
to authenticated
using (private.is_lecturer())
with check (private.is_lecturer());

create policy feedback_select_owner_or_lecturer
on public.lecturer_feedback
for select
to authenticated
using (
  private.is_lecturer()
  or exists (
    select 1
    from public.ventures v
    where v.id = lecturer_feedback.venture_id
      and v.student_id = (select auth.uid())
  )
);

create policy feedback_insert_lecturer
on public.lecturer_feedback
for insert
to authenticated
with check (
  private.is_lecturer()
  and lecturer_id = (select auth.uid())
);

create policy feedback_update_lecturer
on public.lecturer_feedback
for update
to authenticated
using (
  private.is_lecturer()
  and lecturer_id = (select auth.uid())
)
with check (
  private.is_lecturer()
  and lecturer_id = (select auth.uid())
);

create policy feedback_delete_lecturer
on public.lecturer_feedback
for delete
to authenticated
using (
  private.is_lecturer()
  and lecturer_id = (select auth.uid())
);

-- Explicit Data API grants.
-- role is intentionally NOT client-updatable.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.ventures from anon, authenticated;
revoke all on table public.module_data from anon, authenticated;
revoke all on table public.weekly_submissions from anon, authenticated;
revoke all on table public.lecturer_feedback from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, nim, class_name, updated_at)
on public.profiles to authenticated;

grant select, insert, update on public.ventures to authenticated;
grant select, insert, update on public.module_data to authenticated;
grant select, insert, update on public.weekly_submissions to authenticated;
grant select, insert, update, delete on public.lecturer_feedback to authenticated;

grant usage, select on all sequences in schema public to authenticated;

create index if not exists idx_ventures_student
on public.ventures(student_id);

create index if not exists idx_module_data_venture
on public.module_data(venture_id);

create index if not exists idx_weekly_submissions_venture
on public.weekly_submissions(venture_id);

create index if not exists idx_feedback_venture
on public.lecturer_feedback(venture_id);

create index if not exists idx_feedback_lecturer
on public.lecturer_feedback(lecturer_id);

-- Set lecturer role only from trusted/admin SQL:
--
-- update public.profiles
-- set role = 'lecturer'
-- where id = (
--   select id
--   from auth.users
--   where email = 'EMAIL_DOSEN'
-- );
