create extension if not exists "pgcrypto";

create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  teacher_pin text,
  created_at timestamptz not null default now()
);

alter table public.surveys
  add column if not exists teacher_pin text;

create table if not exists public.survey_class_budgets (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  grade integer not null check (grade > 0),
  class_number integer not null check (class_number > 0),
  budget integer not null check (budget > 0),
  unique (survey_id, grade, class_number)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0
);

comment on table public.products is
  '조사에 포함되는 상황 단위입니다. UI에서는 "상황과 상품 가격"으로 표시합니다.';
comment on column public.products.name is
  '학생에게 제시할 상황과 상품 가격 설명입니다. 예: 아침을 먹지 않고 나왔는데 갓 구운 빵의 향이 난다.';

create table if not exists public.price_points (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  description text not null default '',
  price integer not null check (price > 0),
  sort_order integer not null default 0
);

comment on column public.price_points.description is
  '상황별 가격 구성입니다. 예: 소형 빵 1개, 세트 구성, 할인 이벤트.';

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

create table if not exists public.assignment_reservations (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price_point_id uuid not null references public.price_points(id) on delete cascade,
  grade integer not null check (grade > 0),
  class_number integer not null check (class_number > 0),
  student_name text not null,
  assignment_seed text not null,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignment_reservations_seed_key unique (survey_id, product_id, assignment_seed)
);

do $$
begin
  alter table public.assignment_reservations
    add constraint assignment_reservations_seed_key
    unique (survey_id, product_id, assignment_seed);
exception
  when duplicate_object then null;
end $$;

create index if not exists products_survey_id_idx on public.products(survey_id);
create index if not exists surveys_teacher_pin_idx on public.surveys(teacher_pin);
create index if not exists survey_class_budgets_survey_id_idx on public.survey_class_budgets(survey_id);
create index if not exists price_points_product_id_idx on public.price_points(product_id);
create index if not exists responses_survey_id_idx on public.responses(survey_id);
create index if not exists responses_class_filter_idx on public.responses(survey_id, grade, class_number);
create index if not exists response_items_response_id_idx on public.response_items(response_id);
create index if not exists response_items_product_price_idx on public.response_items(product_id, price_point_id);
create index if not exists assignment_reservations_active_idx
  on public.assignment_reservations(survey_id, product_id, price_point_id, expires_at)
  where consumed_at is null;

alter table public.surveys enable row level security;
alter table public.survey_class_budgets enable row level security;
alter table public.products enable row level security;
alter table public.price_points enable row level security;
alter table public.responses enable row level security;
alter table public.response_items enable row level security;
alter table public.assignment_reservations enable row level security;

drop policy if exists "classroom read surveys" on public.surveys;
drop policy if exists "classroom write surveys" on public.surveys;
drop policy if exists "classroom read survey class budgets" on public.survey_class_budgets;
drop policy if exists "classroom write survey class budgets" on public.survey_class_budgets;
drop policy if exists "classroom read products" on public.products;
drop policy if exists "classroom write products" on public.products;
drop policy if exists "classroom read price points" on public.price_points;
drop policy if exists "classroom write price points" on public.price_points;
drop policy if exists "classroom read responses" on public.responses;
drop policy if exists "classroom write responses" on public.responses;
drop policy if exists "classroom read response items" on public.response_items;
drop policy if exists "classroom write response items" on public.response_items;
drop policy if exists "classroom read assignment reservations" on public.assignment_reservations;
drop policy if exists "classroom write assignment reservations" on public.assignment_reservations;

create policy "classroom read surveys" on public.surveys
  for select using (true);
create policy "classroom write surveys" on public.surveys
  for all using (true) with check (true);

create policy "classroom read survey class budgets" on public.survey_class_budgets
  for select using (true);
create policy "classroom write survey class budgets" on public.survey_class_budgets
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

create policy "classroom read assignment reservations" on public.assignment_reservations
  for select using (true);
create policy "classroom write assignment reservations" on public.assignment_reservations
  for all using (true) with check (true);

create or replace function public.assignment_stable_hash(value text)
returns bigint
language plpgsql
immutable
as $$
declare
  hash bigint := 2166136261;
  char_index integer;
begin
  for char_index in 1..char_length(value) loop
    hash := ((hash # ascii(substr(value, char_index, 1))::bigint) * 16777619) % 4294967296;
  end loop;

  return hash;
end;
$$;

create or replace function public.reserve_balanced_assignments(
  target_survey_id uuid,
  target_grade integer,
  target_class_number integer,
  target_student_name text
)
returns table(product_id uuid, price_point_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_student_name text := btrim(target_student_name);
  reservation_seed text;
  current_product record;
  selected_price_point_id uuid;
begin
  if target_grade <= 0 or target_class_number <= 0 or normalized_student_name = '' then
    raise exception '학생 정보를 먼저 입력해 주세요.';
  end if;

  reservation_seed := concat_ws(
    ':',
    target_survey_id::text,
    target_grade::text,
    target_class_number::text,
    normalized_student_name
  );

  perform pg_advisory_xact_lock(hashtext(target_survey_id::text));

  delete from public.assignment_reservations
  where survey_id = target_survey_id
    and consumed_at is null
    and expires_at < now();

  for current_product in
    select p.id
    from public.products p
    where p.survey_id = target_survey_id
    order by p.sort_order, p.id
  loop
    selected_price_point_id := null;

    select ar.price_point_id
    into selected_price_point_id
    from public.assignment_reservations ar
    where ar.survey_id = target_survey_id
      and ar.product_id = current_product.id
      and ar.assignment_seed = reservation_seed
    limit 1;

    if selected_price_point_id is null then
      with submitted_counts as (
        select ri.price_point_id, count(*)::integer as response_count
        from public.response_items ri
        join public.responses r on r.id = ri.response_id
        where ri.product_id = current_product.id
          and r.survey_id = target_survey_id
          and r.grade = target_grade
          and r.class_number = target_class_number
        group by ri.price_point_id
      ),
      reservation_counts as (
        select ar.price_point_id, count(*)::integer as reservation_count
        from public.assignment_reservations ar
        where ar.survey_id = target_survey_id
          and ar.product_id = current_product.id
          and ar.grade = target_grade
          and ar.class_number = target_class_number
          and ar.consumed_at is null
          and ar.expires_at > now()
        group by ar.price_point_id
      )
      select pp.id
      into selected_price_point_id
      from public.price_points pp
      left join submitted_counts sc on sc.price_point_id = pp.id
      left join reservation_counts rc on rc.price_point_id = pp.id
      where pp.product_id = current_product.id
      order by
        coalesce(sc.response_count, 0) + coalesce(rc.reservation_count, 0),
        public.assignment_stable_hash(concat_ws(':', reservation_seed, current_product.id::text, pp.id::text)),
        pp.sort_order,
        pp.id
      limit 1;
    end if;

    if selected_price_point_id is not null then
      insert into public.assignment_reservations (
        survey_id,
        product_id,
        price_point_id,
        grade,
        class_number,
        student_name,
        assignment_seed,
        expires_at,
        consumed_at
      )
      values (
        target_survey_id,
        current_product.id,
        selected_price_point_id,
        target_grade,
        target_class_number,
        normalized_student_name,
        reservation_seed,
        now() + interval '30 minutes',
        null
      )
      on conflict on constraint assignment_reservations_seed_key
      do update set
        price_point_id = excluded.price_point_id,
        grade = excluded.grade,
        class_number = excluded.class_number,
        student_name = excluded.student_name,
        expires_at = excluded.expires_at,
        consumed_at = null,
        updated_at = now();

      return query select current_product.id, selected_price_point_id;
    end if;
  end loop;
end;
$$;

create or replace function public.consume_assignment_reservations(
  target_survey_id uuid,
  target_grade integer,
  target_class_number integer,
  target_student_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_student_name text := btrim(target_student_name);
  reservation_seed text;
begin
  reservation_seed := concat_ws(
    ':',
    target_survey_id::text,
    target_grade::text,
    target_class_number::text,
    normalized_student_name
  );

  update public.assignment_reservations
  set consumed_at = now(),
      updated_at = now()
  where survey_id = target_survey_id
    and assignment_seed = reservation_seed
    and consumed_at is null;
end;
$$;

create or replace function public.submit_student_response(
  target_survey_id uuid,
  target_grade integer,
  target_class_number integer,
  target_student_number integer,
  target_student_name text,
  item_rows jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_student_name text := btrim(target_student_name);
  new_response_id uuid;
begin
  if target_grade <= 0
    or target_class_number <= 0
    or target_student_number <= 0
    or normalized_student_name = ''
  then
    raise exception 'Invalid student profile.';
  end if;

  if jsonb_typeof(item_rows) is distinct from 'array'
    or jsonb_array_length(item_rows) = 0
  then
    raise exception 'Response items are required.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(item_rows) as item(
      product_id uuid,
      price_point_id uuid,
      quantity integer
    )
    left join public.products p
      on p.id = item.product_id
      and p.survey_id = target_survey_id
    left join public.price_points pp
      on pp.id = item.price_point_id
      and pp.product_id = item.product_id
    where p.id is null
      or pp.id is null
      or item.quantity is null
      or item.quantity < 0
      or item.quantity > 100
  ) then
    raise exception 'Response items do not match the survey configuration.';
  end if;

  insert into public.responses (
    survey_id,
    grade,
    class_number,
    student_number,
    student_name
  )
  values (
    target_survey_id,
    target_grade,
    target_class_number,
    target_student_number,
    normalized_student_name
  )
  returning id into new_response_id;

  insert into public.response_items (
    response_id,
    product_id,
    price_point_id,
    quantity
  )
  select
    new_response_id,
    item.product_id,
    item.price_point_id,
    item.quantity
  from jsonb_to_recordset(item_rows) as item(
    product_id uuid,
    price_point_id uuid,
    quantity integer
  );

  return new_response_id;
end;
$$;

grant execute on function public.reserve_balanced_assignments(uuid, integer, integer, text) to anon, authenticated;
grant execute on function public.consume_assignment_reservations(uuid, integer, integer, text) to anon, authenticated;
grant execute on function public.submit_student_response(uuid, integer, integer, integer, text, jsonb) to anon, authenticated;

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
