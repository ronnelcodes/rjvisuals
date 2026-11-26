-- Paste into the Supabase SQL Editor once. Create an Auth user separately,
-- then insert that user's UUID into public.studio_admins below.
create extension if not exists pgcrypto;

create table if not exists public.studio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.client_galleries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  title text not null,
  client_name text not null,
  password_hash text not null,
  password_salt text not null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  downloads_enabled boolean not null default false,
  release_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.client_photos (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.client_galleries(id) on delete cascade,
  original_path text not null unique,
  preview_path text not null unique,
  filename text not null,
  created_at timestamptz not null default now()
);

create index if not exists client_photos_gallery_idx on public.client_photos(gallery_id);

alter table public.studio_admins enable row level security;
alter table public.client_galleries enable row level security;
alter table public.client_photos enable row level security;
-- No browser grants/policies are needed. Netlify functions verify Auth+admin
-- membership, then access tables through the service role on the server.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('client-originals','client-originals',false,52428800,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('client-previews','client-previews',false,52428800,array['image/jpeg'])
on conflict (id) do nothing;
-- Storage buckets must stay PRIVATE. Never create public read policies.
-- After creating an Auth user, run this with their actual UUID:
-- insert into public.studio_admins(user_id) values('PASTE-AUTH-USER-UUID');

-- Run the following ALTER commands for existing v2 databases as well.
alter table public.client_galleries add column if not exists client_email text;
alter table public.client_galleries add column if not exists print_store_url text;
create table if not exists public.gallery_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.client_galleries(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists gallery_reset_tokens_gallery_date on public.gallery_reset_tokens(gallery_id,created_at desc);
alter table public.gallery_reset_tokens enable row level security;
-- No public access policies. Only the server's service role accesses reset records.
