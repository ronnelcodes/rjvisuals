create extension if not exists pgcrypto;

create table if not exists public.galleries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  client_name text not null,
  password_hash text not null,
  password_salt text not null,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  event_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  storage_path text not null unique,
  filename text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.galleries enable row level security;
alter table public.gallery_photos enable row level security;

insert into storage.buckets (id, name, public)
values ('private-galleries', 'private-galleries', false)
on conflict (id) do update set public = false;

create policy "Admin uploads private gallery images"
on storage.objects for insert to authenticated
with check (bucket_id = 'private-galleries' and lower(auth.jwt() ->> 'email') = lower(current_setting('app.settings.admin_email', true)));

-- Initial gallery shells. Set secure passwords in the admin dashboard before publishing.
insert into public.galleries (title, slug, client_name, password_hash, password_salt, status) values
('Bevington Anniversary','bevington-anniversary','Bevington','pending-migration','pending-migration','draft'),
('Scott','scott-2','Scott','pending-migration','pending-migration','draft'),
('Bevington','bevington-2','Bevington','pending-migration','pending-migration','draft'),
('Alexandra #2','alexandra-2-2','Alexandra','pending-migration','pending-migration','draft'),
('Alexandra #1','alexandra-1-2','Alexandra','pending-migration','pending-migration','draft'),
('Brinkenhoff','brinkenhoff','Brinkenhoff','pending-migration','pending-migration','draft'),
('Castro','castro','Castro','pending-migration','pending-migration','draft'),
('Jones & Moore','jones-moore','Jones & Moore','pending-migration','pending-migration','draft')
on conflict (slug) do nothing;

