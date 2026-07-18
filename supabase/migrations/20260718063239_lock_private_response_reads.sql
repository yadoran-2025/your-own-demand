drop policy if exists "classroom read responses" on public.responses;
drop policy if exists "classroom write responses" on public.responses;
drop policy if exists "classroom read response items" on public.response_items;
drop policy if exists "classroom write response items" on public.response_items;
drop policy if exists "classroom read assignment reservations" on public.assignment_reservations;
drop policy if exists "classroom write assignment reservations" on public.assignment_reservations;
drop policy if exists "classroom read responses via rpc only" on public.responses;
drop policy if exists "classroom write responses via rpc only" on public.responses;
drop policy if exists "classroom read response items via rpc only" on public.response_items;
drop policy if exists "classroom write response items via rpc only" on public.response_items;
drop policy if exists "classroom read assignment reservations via rpc only" on public.assignment_reservations;
drop policy if exists "classroom write assignment reservations via rpc only" on public.assignment_reservations;

create policy "classroom read responses via rpc only" on public.responses
  for select to anon, authenticated using (false);
create policy "classroom write responses via rpc only" on public.responses
  for all to anon, authenticated using (false) with check (false);

create policy "classroom read response items via rpc only" on public.response_items
  for select to anon, authenticated using (false);
create policy "classroom write response items via rpc only" on public.response_items
  for all to anon, authenticated using (false) with check (false);

create policy "classroom read assignment reservations via rpc only" on public.assignment_reservations
  for select to anon, authenticated using (false);
create policy "classroom write assignment reservations via rpc only" on public.assignment_reservations
  for all to anon, authenticated using (false) with check (false);

create or replace function public.fetch_room_responses(
  target_survey_id uuid,
  target_room_name text,
  include_response_items boolean default true,
  reveal_response_id uuid default null
)
returns table(
  id uuid,
  survey_id uuid,
  grade integer,
  class_number integer,
  student_number integer,
  student_name text,
  created_at timestamptz,
  response_items jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.surveys s
    where s.id = target_survey_id
      and s.teacher_pin = btrim(target_room_name)
  ) then
    return;
  end if;

  return query
  select
    r.id,
    r.survey_id,
    r.grade,
    r.class_number,
    case
      when reveal_response_id is null or r.id = reveal_response_id then r.student_number
      else 0
    end as student_number,
    case
      when reveal_response_id is null or r.id = reveal_response_id then r.student_name
      else ''
    end as student_name,
    r.created_at,
    case
      when include_response_items then coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', ri.id,
            'response_id', ri.response_id,
            'product_id', ri.product_id,
            'price_point_id', ri.price_point_id,
            'quantity', ri.quantity
          )
          order by p.sort_order, pp.sort_order, ri.id
        ) filter (where ri.id is not null),
        '[]'::jsonb
      )
      else '[]'::jsonb
    end as response_items
  from public.responses r
  left join public.response_items ri on ri.response_id = r.id
  left join public.products p on p.id = ri.product_id
  left join public.price_points pp on pp.id = ri.price_point_id
  where r.survey_id = target_survey_id
  group by r.id
  order by r.created_at desc;
end;
$$;

create or replace function public.update_room_student_response(
  target_survey_id uuid,
  target_room_name text,
  target_response_id uuid,
  target_grade integer,
  target_class_number integer,
  target_student_number integer,
  target_student_name text,
  quantity_rows jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_student_name text := btrim(target_student_name);
begin
  if not exists (
    select 1
    from public.surveys s
    where s.id = target_survey_id
      and s.teacher_pin = btrim(target_room_name)
  ) then
    raise exception '방 이름이 일치하지 않습니다.';
  end if;

  if target_grade <= 0
    or target_class_number <= 0
    or target_student_number <= 0
    or normalized_student_name = ''
  then
    raise exception 'Invalid student profile.';
  end if;

  update public.responses
  set grade = target_grade,
      class_number = target_class_number,
      student_number = target_student_number,
      student_name = normalized_student_name
  where id = target_response_id
    and survey_id = target_survey_id;

  if not found then
    raise exception '응답을 찾지 못했습니다.';
  end if;

  update public.response_items ri
  set quantity = item.quantity
  from jsonb_to_recordset(quantity_rows) as item(item_id uuid, quantity integer)
  where ri.id = item.item_id
    and ri.response_id = target_response_id
    and item.quantity between 0 and 100;
end;
$$;

create or replace function public.delete_room_student_response(
  target_survey_id uuid,
  target_room_name text,
  target_response_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.surveys s
    where s.id = target_survey_id
      and s.teacher_pin = btrim(target_room_name)
  ) then
    raise exception '방 이름이 일치하지 않습니다.';
  end if;

  delete from public.responses
  where id = target_response_id
    and survey_id = target_survey_id;
end;
$$;

grant execute on function public.fetch_room_responses(uuid, text, boolean, uuid) to anon, authenticated;
grant execute on function public.update_room_student_response(uuid, text, uuid, integer, integer, integer, text, jsonb) to anon, authenticated;
grant execute on function public.delete_room_student_response(uuid, text, uuid) to anon, authenticated;
