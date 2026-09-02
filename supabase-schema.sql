-- ============================================================
-- Venture Dashboard v2.0 — Lab. Kewirausahaan II
-- Multi-user schema: 25 mahasiswa + 1 dosen
-- Jalankan seluruh file ini di Supabase > SQL Editor.
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
  module_name text not null check (module_name in ('health','kpi','problem','experiment','evidence','sprint','financial','portfolio')),
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
  module_name text,
  week integer check (week is null or week between 1 and 16),
  message text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Helper function. SECURITY DEFINER avoids recursive RLS checks.
-- ------------------------------------------------------------
create or replace function public.is_lecturer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'lecturer'
  );
$$;

revoke all on function public.is_lecturer() from public;
grant execute on function public.is_lecturer() to authenticated;

-- ------------------------------------------------------------
-- Automatically create a STUDENT profile after Auth signup.
-- Lecturer role must be assigned manually by the project admin.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, nim, role, class_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    nullif(new.raw_user_meta_data->>'nim',''),
    'student',
    coalesce(nullif(new.raw_user_meta_data->>'class_name',''),'Lab. Kewirausahaan II')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.ventures enable row level security;
alter table public.module_data enable row level security;
alter table public.weekly_submissions enable row level security;
alter table public.lecturer_feedback enable row level security;

-- PROFILES
create policy "profile_select_self_or_lecturer"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_lecturer());

create policy "profile_update_self_or_lecturer"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_lecturer())
with check (id = auth.uid() or public.is_lecturer());

-- VENTURES
create policy "venture_select_owner_or_lecturer"
on public.ventures for select
to authenticated
using (student_id = auth.uid() or public.is_lecturer());

create policy "venture_insert_owner"
on public.ventures for insert
to authenticated
with check (student_id = auth.uid());

create policy "venture_update_owner_or_lecturer"
on public.ventures for update
to authenticated
using (student_id = auth.uid() or public.is_lecturer())
with check (student_id = auth.uid() or public.is_lecturer());

-- MODULE DATA
create policy "module_select_owner_or_lecturer"
on public.module_data for select
to authenticated
using (
  public.is_lecturer() or exists (
    select 1 from public.ventures v
    where v.id = module_data.venture_id and v.student_id = auth.uid()
  )
);

create policy "module_insert_owner"
on public.module_data for insert
to authenticated
with check (
  exists (
    select 1 from public.ventures v
    where v.id = module_data.venture_id and v.student_id = auth.uid()
  )
);

create policy "module_update_owner"
on public.module_data for update
to authenticated
using (
  exists (
    select 1 from public.ventures v
    where v.id = module_data.venture_id and v.student_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.ventures v
    where v.id = module_data.venture_id and v.student_id = auth.uid()
  )
);

-- WEEKLY SUBMISSIONS
create policy "submission_select_owner_or_lecturer"
on public.weekly_submissions for select
to authenticated
using (
  public.is_lecturer() or exists (
    select 1 from public.ventures v
    where v.id = weekly_submissions.venture_id and v.student_id = auth.uid()
  )
);

create policy "submission_insert_owner"
on public.weekly_submissions for insert
to authenticated
with check (
  exists (
    select 1 from public.ventures v
    where v.id = weekly_submissions.venture_id and v.student_id = auth.uid()
  )
);

create policy "submission_update_owner_or_lecturer"
on public.weekly_submissions for update
to authenticated
using (
  public.is_lecturer() or exists (
    select 1 from public.ventures v
    where v.id = weekly_submissions.venture_id and v.student_id = auth.uid()
  )
)
with check (
  public.is_lecturer() or exists (
    select 1 from public.ventures v
    where v.id = weekly_submissions.venture_id and v.student_id = auth.uid()
  )
);

-- LECTURER FEEDBACK
create policy "feedback_select_owner_or_lecturer"
on public.lecturer_feedback for select
to authenticated
using (
  lecturer_id = auth.uid() or public.is_lecturer() or exists (
    select 1 from public.ventures v
    where v.id = lecturer_feedback.venture_id and v.student_id = auth.uid()
  )
);

create policy "feedback_insert_lecturer"
on public.lecturer_feedback for insert
to authenticated
with check (public.is_lecturer() and lecturer_id = auth.uid());

create policy "feedback_update_lecturer"
on public.lecturer_feedback for update
to authenticated
using (public.is_lecturer() and lecturer_id = auth.uid())
with check (public.is_lecturer() and lecturer_id = auth.uid());

create policy "feedback_delete_lecturer"
on public.lecturer_feedback for delete
to authenticated
using (public.is_lecturer() and lecturer_id = auth.uid());

-- Useful indexes
create index if not exists idx_module_data_venture on public.module_data(venture_id);
create index if not exists idx_weekly_submissions_venture on public.weekly_submissions(venture_id);
create index if not exists idx_feedback_venture on public.lecturer_feedback(venture_id);

-- ============================================================
-- SET DOSEN ROLE
-- Setelah dosen membuat akun lewat halaman login/daftar (atau dibuat
-- lewat Supabase Auth), jalankan contoh berikut dengan email dosen:
--
-- update public.profiles
-- set role = 'lecturer'
-- where id = (select id from auth.users where email = 'dosen@email.com');
-- ============================================================
