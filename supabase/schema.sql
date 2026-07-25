create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  author text,
  cover_url text,
  format text check (format in ('epub','pdf','docx')),
  file_url text,
  total_pages int,
  content jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);
alter table public.books add column if not exists content jsonb not null default '[]'::jsonb;

create table if not exists public.created_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  author text,
  cover_url text,
  status text default 'draft' check (status in ('draft','published')),
  reads_count int default 0,
  created_at timestamptz default now()
);
alter table public.created_books alter column author drop default;

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  created_book_id uuid not null references public.created_books(id) on delete cascade,
  title text,
  content text,
  order_index int
);

create table if not exists public.reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null,
  book_source text check (book_source in ('imported','created')),
  current_page int default 0,
  percent numeric default 0,
  updated_at timestamptz default now(),
  unique (user_id, book_id, book_source)
);

create table if not exists public.customization_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  font text default 'serif',
  theme text default 'light',
  margin int default 24,
  line_spacing numeric default 1.4
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.increment_book_reads(target_book_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.created_books
  set reads_count = reads_count + 1
  where id = target_book_id
    and status = 'published'
    and user_id <> auth.uid();
$$;

grant execute on function public.increment_book_reads(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.created_books enable row level security;
alter table public.chapters enable row level security;
alter table public.reading_progress enable row level security;
alter table public.customization_settings enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "books_manage_own" on public.books;
drop policy if exists "books_authenticated_read" on public.books;
drop policy if exists "books_insert_own" on public.books;
drop policy if exists "books_update_own" on public.books;
drop policy if exists "books_delete_own" on public.books;
drop policy if exists "created_books_public_read" on public.created_books;
drop policy if exists "created_books_insert_own" on public.created_books;
drop policy if exists "created_books_update_own" on public.created_books;
drop policy if exists "created_books_delete_own" on public.created_books;
drop policy if exists "chapters_public_read" on public.chapters;
drop policy if exists "chapters_insert_own" on public.chapters;
drop policy if exists "chapters_update_own" on public.chapters;
drop policy if exists "chapters_delete_own" on public.chapters;
drop policy if exists "progress_manage_own" on public.reading_progress;
drop policy if exists "settings_manage_own" on public.customization_settings;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "books_authenticated_read" on public.books for select to authenticated using (true);
create policy "books_insert_own" on public.books for insert to authenticated with check (auth.uid() = user_id);
create policy "books_update_own" on public.books for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "books_delete_own" on public.books for delete to authenticated using (auth.uid() = user_id);
create policy "created_books_public_read" on public.created_books for select to authenticated using (status = 'published' or auth.uid() = user_id);
create policy "created_books_insert_own" on public.created_books for insert to authenticated with check (auth.uid() = user_id);
create policy "created_books_update_own" on public.created_books for update to authenticated using (auth.uid() = user_id);
create policy "created_books_delete_own" on public.created_books for delete to authenticated using (auth.uid() = user_id);
create policy "chapters_public_read" on public.chapters for select to authenticated using (exists (select 1 from public.created_books b where b.id = created_book_id and (b.status = 'published' or b.user_id = auth.uid())));
create policy "chapters_insert_own" on public.chapters for insert to authenticated with check (exists (select 1 from public.created_books b where b.id = created_book_id and b.user_id = auth.uid()));
create policy "chapters_update_own" on public.chapters for update to authenticated using (exists (select 1 from public.created_books b where b.id = created_book_id and b.user_id = auth.uid()));
create policy "chapters_delete_own" on public.chapters for delete to authenticated using (exists (select 1 from public.created_books b where b.id = created_book_id and b.user_id = auth.uid()));
create policy "progress_manage_own" on public.reading_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "settings_manage_own" on public.customization_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values ('covers', 'covers', true), ('avatars', 'avatars', true), ('uploads', 'uploads', false) on conflict (id) do nothing;
drop policy if exists "cover_public_read" on storage.objects;
drop policy if exists "cover_upload_own" on storage.objects;
drop policy if exists "cover_update_own" on storage.objects;
drop policy if exists "avatar_public_read" on storage.objects;
drop policy if exists "avatar_upload_own" on storage.objects;
drop policy if exists "uploads_manage_own" on storage.objects;
create policy "cover_public_read" on storage.objects for select using (bucket_id = 'covers');
create policy "cover_upload_own" on storage.objects for insert to authenticated with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cover_update_own" on storage.objects for update to authenticated using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar_public_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatar_upload_own" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "uploads_manage_own" on storage.objects for all to authenticated using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
