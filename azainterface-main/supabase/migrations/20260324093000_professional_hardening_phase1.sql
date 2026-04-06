begin;

create or replace function public.compute_card_invoice_cycle(
  p_tx_date date,
  p_closing_day int,
  p_due_day int
)
returns table (
  p_month int,
  p_year int,
  p_opening_date date,
  p_due_date date
)
language plpgsql
immutable
as $$
declare
  v_closing_month date;
  v_due_month date;
  v_due_last_day int;
begin
  if p_tx_date is null then
    raise exception 'Transaction date is required';
  end if;

  if p_closing_day is null or p_due_day is null then
    raise exception 'Card closing and due day are required';
  end if;

  if extract(day from p_tx_date)::int > p_closing_day then
    v_closing_month := (date_trunc('month', p_tx_date)::date + interval '1 month')::date;
  else
    v_closing_month := date_trunc('month', p_tx_date)::date;
  end if;

  p_opening_date := v_closing_month;
  p_month := extract(month from v_closing_month)::int;
  p_year := extract(year from v_closing_month)::int;

  if p_due_day > p_closing_day then
    v_due_month := v_closing_month;
  else
    v_due_month := (date_trunc('month', v_closing_month)::date + interval '1 month')::date;
  end if;

  v_due_last_day := extract(day from (date_trunc('month', v_due_month) + interval '1 month - 1 day'))::int;
  p_due_date := make_date(
    extract(year from v_due_month)::int,
    extract(month from v_due_month)::int,
    least(p_due_day, v_due_last_day)
  );

  return next;
end;
$$;

create or replace function public.ensure_invoice_for_card_transaction()
returns trigger
language plpgsql
as $$
declare
  v_due_day int;
  v_closing_day int;
  v_month int;
  v_year int;
  v_opening_date date;
  v_due_date date;
  v_invoice_id uuid;
begin
  if new.card_id is null or new.type <> 'DESPESA' then
    new.invoice_id := null;
    return new;
  end if;

  select c.due_day, c.closing_day
    into v_due_day, v_closing_day
  from public.cards c
  where c.id = new.card_id;

  if v_due_day is null or v_closing_day is null then
    new.invoice_id := null;
    return new;
  end if;

  select cycle.p_month, cycle.p_year, cycle.p_opening_date, cycle.p_due_date
    into v_month, v_year, v_opening_date, v_due_date
  from public.compute_card_invoice_cycle(new.date, v_closing_day, v_due_day) cycle;

  insert into public.invoices (
    user_id,
    card_id,
    month,
    year,
    opening_date,
    due_date,
    closing_balance,
    minimum_payment,
    paid_amount,
    status
  )
  values (
    new.user_id,
    new.card_id,
    v_month,
    v_year,
    v_opening_date,
    v_due_date,
    0,
    0,
    0,
    'ABERTA'
  )
  on conflict (card_id, month, year)
  do update set updated_at = now()
  returning id into v_invoice_id;

  new.invoice_id := v_invoice_id;
  return new;
end;
$$;

create or replace function public.ensure_invoice_for_card_transaction_on_update()
returns trigger
language plpgsql
as $$
declare
  v_due_day int;
  v_closing_day int;
  v_month int;
  v_year int;
  v_opening_date date;
  v_due_date date;
  v_invoice_id uuid;
begin
  if new.card_id is null or new.type <> 'DESPESA' then
    new.invoice_id := null;
    return new;
  end if;

  select c.due_day, c.closing_day
    into v_due_day, v_closing_day
  from public.cards c
  where c.id = new.card_id;

  if v_due_day is null or v_closing_day is null then
    new.invoice_id := null;
    return new;
  end if;

  select cycle.p_month, cycle.p_year, cycle.p_opening_date, cycle.p_due_date
    into v_month, v_year, v_opening_date, v_due_date
  from public.compute_card_invoice_cycle(new.date, v_closing_day, v_due_day) cycle;

  insert into public.invoices (
    user_id,
    card_id,
    month,
    year,
    opening_date,
    due_date,
    closing_balance,
    minimum_payment,
    paid_amount,
    status
  )
  values (
    new.user_id,
    new.card_id,
    v_month,
    v_year,
    v_opening_date,
    v_due_date,
    0,
    0,
    0,
    'ABERTA'
  )
  on conflict (card_id, month, year)
  do update set updated_at = now()
  returning id into v_invoice_id;

  new.invoice_id := v_invoice_id;
  return new;
end;
$$;

create or replace function public.process_due_recurrences(
  p_limit int default 100
)
returns int
language plpgsql
security invoker
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_count int := 0;
  v_row public.recurrences%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  for v_row in
    select *
    from public.recurrences
    where user_id = v_uid
      and is_active = true
      and next_run <= v_now
    order by next_run asc
    limit greatest(coalesce(p_limit, 100), 1)
    for update skip locked
  loop
    begin
      if v_row.account_id is null then
        update public.recurrences
        set is_active = false
        where id = v_row.id;
      else
        insert into public.transactions (
          user_id,
          account_id,
          category_id,
          recurrence_id,
          type,
          amount,
          description,
          date,
          status,
          origin,
          is_pending,
          is_recurring
        )
        values (
          v_row.user_id,
          v_row.account_id,
          v_row.category_id,
          v_row.id,
          v_row.type::public.transaction_type,
          v_row.amount,
          v_row.name,
          (v_row.next_run at time zone 'UTC')::date,
          'EFETIVADA',
          'RECORRENTE',
          false,
          true
        );

        update public.recurrences
        set last_run = v_row.next_run,
            next_run = public.next_recurrence_run(v_row.next_run, v_row.frequency)
        where id = v_row.id;

        v_count := v_count + 1;
      end if;
    exception
      when others then
        raise warning 'Failed to process recurrence %, user %: %', v_row.id, v_row.user_id, SQLERRM;
    end;
  end loop;

  return v_count;
end;
$$;

create or replace function public.add_goal_movement(
  p_goal_id uuid,
  p_type public.goal_movement_type,
  p_amount numeric
)
returns table (
  movement_id uuid,
  movement_type public.goal_movement_type,
  movement_amount numeric,
  movement_created_at timestamptz,
  goal_id uuid,
  goal_name text,
  goal_target_amount numeric,
  goal_current_amount numeric,
  goal_deadline date,
  goal_status public.goal_status,
  goal_icon text,
  goal_color text
)
language plpgsql
security invoker
as $$
declare
  v_uid uuid := auth.uid();
  v_goal public.goals%rowtype;
  v_movement public.goal_movements%rowtype;
  v_next_current numeric(14, 2);
  v_next_status public.goal_status;
  v_next_progress numeric(5, 2);
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_goal_id is null then
    raise exception 'Goal id is required';
  end if;

  if p_type is null then
    raise exception 'Goal movement type is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Goal movement amount must be greater than zero';
  end if;

  select *
    into v_goal
  from public.goals
  where id = p_goal_id
    and user_id = v_uid
  for update;

  if v_goal.id is null then
    raise exception 'Goal not found';
  end if;

  if p_type = 'APORTE' then
    v_next_current := round((coalesce(v_goal.current_amount, 0) + p_amount)::numeric, 2);
  else
    v_next_current := greatest(0, round((coalesce(v_goal.current_amount, 0) - p_amount)::numeric, 2));
  end if;

  if v_goal.status in ('CANCELADA', 'PAUSADA') then
    v_next_status := v_goal.status;
  elsif coalesce(v_goal.target_amount, 0) > 0 and v_next_current >= v_goal.target_amount then
    v_next_status := 'CONCLUIDA';
  else
    v_next_status := 'ANDAMENTO';
  end if;

  if coalesce(v_goal.target_amount, 0) <= 0 then
    v_next_progress := 0;
  else
    v_next_progress := least(100, round(((v_next_current / v_goal.target_amount) * 100)::numeric, 2));
  end if;

  insert into public.goal_movements (
    goal_id,
    user_id,
    type,
    amount
  )
  values (
    v_goal.id,
    v_uid,
    p_type,
    p_amount
  )
  returning * into v_movement;

  update public.goals
  set current_amount = v_next_current,
      progress = v_next_progress,
      status = v_next_status,
      updated_at = now()
  where id = v_goal.id
  returning * into v_goal;

  movement_id := v_movement.id;
  movement_type := v_movement.type;
  movement_amount := v_movement.amount;
  movement_created_at := v_movement.created_at;

  goal_id := v_goal.id;
  goal_name := v_goal.name;
  goal_target_amount := v_goal.target_amount;
  goal_current_amount := v_goal.current_amount;
  goal_deadline := v_goal.deadline;
  goal_status := v_goal.status;
  goal_icon := v_goal.icon;
  goal_color := v_goal.color;

  return next;
end;
$$;

commit;
