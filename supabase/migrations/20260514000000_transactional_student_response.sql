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

grant execute on function public.submit_student_response(uuid, integer, integer, integer, text, jsonb) to anon, authenticated;
