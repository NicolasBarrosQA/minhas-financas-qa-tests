begin;

alter table public.transactions
  add column if not exists installment_series_id uuid;

create index if not exists transactions_installment_series_id_idx
  on public.transactions (installment_series_id)
  where installment_series_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_installment_series_consistency_chk'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_installment_series_consistency_chk
      check (
        installment_series_id is null
        or (
          type = 'DESPESA'
          and card_id is not null
          and installment_number is not null
          and total_installments is not null
          and total_installments > 1
          and installment_number between 1 and total_installments
        )
      ) not valid;
  end if;
end $$;

with installment_groups as (
  select
    t.user_id,
    t.card_id,
    t.created_at,
    t.total_installments,
    gen_random_uuid() as series_id
  from public.transactions t
  where t.installment_series_id is null
    and t.card_id is not null
    and t.type = 'DESPESA'
    and t.installment_number is not null
    and t.total_installments is not null
    and t.total_installments > 1
  group by t.user_id, t.card_id, t.created_at, t.total_installments
)
update public.transactions t
set installment_series_id = g.series_id
from installment_groups g
where t.user_id = g.user_id
  and t.card_id = g.card_id
  and t.created_at = g.created_at
  and t.total_installments = g.total_installments
  and t.installment_series_id is null
  and t.installment_number is not null
  and t.total_installments is not null
  and t.total_installments > 1;

create or replace function public.account_future_ledger_effect(
  p_account_id uuid,
  p_as_of date default current_date
)
returns numeric
language sql
stable
as $$
  with origin_effect as (
    select coalesce(
      sum(
        case
          when t.type = 'RECEITA' then t.amount
          when t.type in ('DESPESA', 'TRANSFERENCIA') then -t.amount
          else 0
        end
      ),
      0
    ) as value
    from public.transactions t
    where t.account_id = p_account_id
      and t.date > p_as_of
      and public.transaction_affects_ledger(t.status, t.is_pending)
  ),
  transfer_in_effect as (
    select coalesce(sum(t.amount), 0) as value
    from public.transactions t
    where t.transfer_to_account_id = p_account_id
      and t.type = 'TRANSFERENCIA'
      and t.date > p_as_of
      and public.transaction_affects_ledger(t.status, t.is_pending)
  )
  select coalesce(origin_effect.value, 0) + coalesce(transfer_in_effect.value, 0)
  from origin_effect
  cross join transfer_in_effect;
$$;

create or replace function public.validate_recurrence_business_rules()
returns trigger
language plpgsql
as $$
declare
  v_account_user_id uuid;
  v_category_user_id uuid;
  v_category_type public.category_type;
  v_category_is_system boolean;
  v_next_run_utc timestamp;
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;

  if new.user_id is null then
    raise exception 'Authentication required';
  end if;

  if new.account_id is null then
    raise exception 'Recurrence requires account_id';
  end if;

  if new.next_run is null then
    new.next_run := now();
  end if;

  v_next_run_utc := new.next_run at time zone 'UTC';

  if new.frequency = 'SEMANAL' then
    new.day_of_week := coalesce(new.day_of_week, extract(dow from v_next_run_utc)::int);
    new.day_of_month := null;
  elsif new.frequency in ('MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL') then
    new.day_of_month := coalesce(new.day_of_month, extract(day from v_next_run_utc)::int);
    new.day_of_week := null;
  else
    new.day_of_month := null;
    new.day_of_week := null;
  end if;

  select a.user_id
    into v_account_user_id
  from public.accounts a
  where a.id = new.account_id;

  if v_account_user_id is null then
    raise exception 'Invalid recurrence account_id';
  end if;
  if v_account_user_id <> new.user_id then
    raise exception 'recurrence account_id does not belong to authenticated user';
  end if;

  if new.category_id is not null then
    select c.user_id, c.type, c.is_system
      into v_category_user_id, v_category_type, v_category_is_system
    from public.categories c
    where c.id = new.category_id;

    if v_category_type is null then
      raise exception 'Invalid recurrence category_id';
    end if;

    if not v_category_is_system and v_category_user_id <> new.user_id then
      raise exception 'recurrence category_id does not belong to authenticated user';
    end if;

    if v_category_type::text <> new.type::text then
      raise exception 'recurrence category type mismatch for recurrence type %', new.type;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.next_recurrence_run(
  p_base timestamptz,
  p_frequency public.recurrence_frequency,
  p_day_of_month int default null,
  p_day_of_week int default null
)
returns timestamptz
language plpgsql
immutable
as $$
declare
  v_base_utc timestamp;
  v_time time;
  v_target_month_start date;
  v_last_day int;
  v_target_day int;
  v_result timestamp;
  v_target_dow int;
begin
  if p_base is null then
    return null;
  end if;

  v_base_utc := p_base at time zone 'UTC';
  v_time := v_base_utc::time;

  case p_frequency
    when 'DIARIA' then
      return p_base + interval '1 day';
    when 'QUINZENAL' then
      return p_base + interval '15 days';
    when 'SEMANAL' then
      if p_day_of_week is null then
        return p_base + interval '1 week';
      end if;

      v_target_dow := greatest(0, least(6, p_day_of_week));
      v_result := date_trunc('day', v_base_utc) + interval '1 day';
      while extract(dow from v_result)::int <> v_target_dow loop
        v_result := v_result + interval '1 day';
      end loop;

      v_result := v_result + v_time;
      return v_result at time zone 'UTC';
    when 'MENSAL' then
      v_target_month_start := (date_trunc('month', v_base_utc)::date + interval '1 month')::date;
    when 'BIMESTRAL' then
      v_target_month_start := (date_trunc('month', v_base_utc)::date + interval '2 months')::date;
    when 'TRIMESTRAL' then
      v_target_month_start := (date_trunc('month', v_base_utc)::date + interval '3 months')::date;
    when 'SEMESTRAL' then
      v_target_month_start := (date_trunc('month', v_base_utc)::date + interval '6 months')::date;
    when 'ANUAL' then
      v_target_month_start := (date_trunc('month', v_base_utc)::date + interval '1 year')::date;
    else
      v_target_month_start := (date_trunc('month', v_base_utc)::date + interval '1 month')::date;
  end case;

  v_last_day := extract(day from (date_trunc('month', v_target_month_start) + interval '1 month - 1 day'))::int;
  v_target_day := least(greatest(coalesce(p_day_of_month, extract(day from v_base_utc)::int), 1), v_last_day);

  v_result := (v_target_month_start + (v_target_day - 1) * interval '1 day')::timestamp + v_time;
  return v_result at time zone 'UTC';
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
            next_run = public.next_recurrence_run(
              v_row.next_run,
              v_row.frequency,
              v_row.day_of_month,
              v_row.day_of_week
            )
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

commit;
