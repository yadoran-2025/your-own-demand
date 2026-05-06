create extension if not exists "pgcrypto";

create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0
);

create table if not exists public.price_points (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  description text not null default '',
  price integer not null check (price > 0),
  sort_order integer not null default 0
);

alter table public.price_points
  add column if not exists description text not null default '';

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  grade integer not null check (grade > 0),
  class_number integer not null check (class_number > 0),
  student_number integer not null check (student_number > 0),
  student_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.response_items (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price_point_id uuid not null references public.price_points(id) on delete cascade,
  quantity integer not null check (quantity >= 0 and quantity <= 100)
);

create index if not exists products_survey_id_idx on public.products(survey_id);
create index if not exists price_points_product_id_idx on public.price_points(product_id);
create index if not exists responses_survey_id_idx on public.responses(survey_id);
create index if not exists responses_class_filter_idx on public.responses(survey_id, grade, class_number);
create index if not exists response_items_response_id_idx on public.response_items(response_id);
create index if not exists response_items_product_price_idx on public.response_items(product_id, price_point_id);

alter table public.surveys enable row level security;
alter table public.products enable row level security;
alter table public.price_points enable row level security;
alter table public.responses enable row level security;
alter table public.response_items enable row level security;

drop policy if exists "classroom read surveys" on public.surveys;
drop policy if exists "classroom write surveys" on public.surveys;
drop policy if exists "classroom read products" on public.products;
drop policy if exists "classroom write products" on public.products;
drop policy if exists "classroom read price points" on public.price_points;
drop policy if exists "classroom write price points" on public.price_points;
drop policy if exists "classroom read responses" on public.responses;
drop policy if exists "classroom write responses" on public.responses;
drop policy if exists "classroom read response items" on public.response_items;
drop policy if exists "classroom write response items" on public.response_items;

create policy "classroom read surveys" on public.surveys
  for select using (true);
create policy "classroom write surveys" on public.surveys
  for all using (true) with check (true);

create policy "classroom read products" on public.products
  for select using (true);
create policy "classroom write products" on public.products
  for all using (true) with check (true);

create policy "classroom read price points" on public.price_points
  for select using (true);
create policy "classroom write price points" on public.price_points
  for all using (true) with check (true);

create policy "classroom read responses" on public.responses
  for select using (true);
create policy "classroom write responses" on public.responses
  for all using (true) with check (true);

create policy "classroom read response items" on public.response_items
  for select using (true);
create policy "classroom write response items" on public.response_items
  for all using (true) with check (true);

do $$
begin
  alter publication supabase_realtime add table public.responses;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.response_items;
exception
  when duplicate_object then null;
end $$;
