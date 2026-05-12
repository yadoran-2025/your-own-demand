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

grant execute on function public.reserve_balanced_assignments(uuid, integer, integer, text) to anon, authenticated;
