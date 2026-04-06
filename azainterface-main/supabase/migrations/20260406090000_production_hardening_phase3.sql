begin;

-- 1) Harden derived fields: block manual writes on INSERT and UPDATE.
create or replace function public.is_internal_derived_update()
returns boolean
language plpgsql
stable
as $$
declare
  v_role text := coalesce(auth.role(), '');
begin
  return coalesce(current_setting('app.allow_derived_updates', true), '') = '1'
    or v_role = 'service_role'
    or current_user in ('postgres', 'supabase_admin')
    or pg_trigger_depth() > 1;
end;
$$;

create or replace function public.guard_sensitive_derived_updates()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'accounts' then
    if not public.is_internal_derived_update() then
      if tg_op = 'INSERT' and coalesce(new.balance, 0) <> coalesce(new.initial_balance, 0) then
        raise exception using
          errcode = '42501',
          message = 'Direct insert with custom accounts.balance is not allowed';
      end if;

      if tg_op = 'UPDATE' and new.balance is distinct from old.balance then
        raise exception using
          errcode = '42501',
          message = 'Direct update to accounts.balance is not allowed';
      end if;
    end if;

    return new;
  end if;

  if tg_table_name = 'cards' then
    if not public.is_internal_derived_update() then
      if tg_op = 'INSERT' and coalesce(new.current_spend, 0) <> 0 then
        raise exception using
          errcode = '42501',
          message = 'Direct insert with custom cards.current_spend is not allowed';
      end if;

      if tg_op = 'UPDATE' and new.current_spend is distinct from old.current_spend then
        raise exception using
          errcode = '42501',
          message = 'Direct update to cards.current_spend is not allowed';
      end if;
    end if;

    return new;
  end if;

  if tg_table_name = 'invoices' then
    if not public.is_internal_derived_update() then
      if tg_op = 'INSERT' and (
        coalesce(new.closing_balance, 0) <> 0
        or coalesce(new.minimum_payment, 0) <> 0
        or coalesce(new.paid_amount, 0) <> 0
        or coalesce(new.status, 'ABERTA'::public.invoice_status) <> 'ABERTA'::public.invoice_status
      ) then
        raise exception using
          errcode = '42501',
          message = 'Direct insert with custom derived invoice fields is not allowed';
      end if;

      if tg_op = 'UPDATE' and (
        new.closing_balance is distinct from old.closing_balance
        or new.minimum_payment is distinct from old.minimum_payment
        or new.paid_amount is distinct from old.paid_amount
        or new.status is distinct from old.status
      ) then
        raise exception using
          errcode = '42501',
          message = 'Direct update to derived invoice fields is not allowed';
      end if;
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_accounts_guard_sensitive_derived_updates on public.accounts;
create trigger trg_accounts_guard_sensitive_derived_updates
before insert or update on public.accounts
for each row execute function public.guard_sensitive_derived_updates();

drop trigger if exists trg_cards_guard_sensitive_derived_updates on public.cards;
create trigger trg_cards_guard_sensitive_derived_updates
before insert or update on public.cards
for each row execute function public.guard_sensitive_derived_updates();

drop trigger if exists trg_invoices_guard_sensitive_derived_updates on public.invoices;
create trigger trg_invoices_guard_sensitive_derived_updates
before insert or update on public.invoices
for each row execute function public.guard_sensitive_derived_updates();

-- 2) Add immutable financial audit trail.
create table if not exists public.financial_audit_log (
  id bigserial primary key,
  table_name text not null,
  row_id uuid not null,
  user_id uuid,
  actor_id uuid,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);

create index if not exists financial_audit_log_table_row_idx
  on public.financial_audit_log (table_name, row_id);

create index if not exists financial_audit_log_user_changed_idx
  on public.financial_audit_log (user_id, changed_at desc);

alter table public.financial_audit_log enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'financial_audit_log'
      and policyname = 'financial_audit_log_select_own'
  ) then
    create policy "financial_audit_log_select_own" on public.financial_audit_log
    for select to authenticated
    using (user_id = auth.uid() or actor_id = auth.uid());
  end if;
end $$;

create or replace function public.audit_financial_table_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_row_id uuid;
  v_user_id uuid;
begin
  if tg_op = 'INSERT' then
    v_row_id := new.id;
    v_user_id := new.user_id;

    insert into public.financial_audit_log (
      table_name,
      row_id,
      user_id,
      actor_id,
      operation,
      old_data,
      new_data
    )
    values (
      tg_table_name,
      v_row_id,
      v_user_id,
      v_actor,
      'INSERT',
      null,
      to_jsonb(new)
    );

    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_row_id := new.id;
    v_user_id := coalesce(new.user_id, old.user_id);

    if to_jsonb(new) is distinct from to_jsonb(old) then
      insert into public.financial_audit_log (
        table_name,
        row_id,
        user_id,
        actor_id,
        operation,
        old_data,
        new_data
      )
      values (
        tg_table_name,
        v_row_id,
        v_user_id,
        v_actor,
        'UPDATE',
        to_jsonb(old),
        to_jsonb(new)
      );
    end if;

    return new;
  end if;

  v_row_id := old.id;
  v_user_id := old.user_id;

  insert into public.financial_audit_log (
    table_name,
    row_id,
    user_id,
    actor_id,
    operation,
    old_data,
    new_data
  )
  values (
    tg_table_name,
    v_row_id,
    v_user_id,
    v_actor,
    'DELETE',
    to_jsonb(old),
    null
  );

  return old;
end;
$$;

do $$
declare
  v_table text;
  v_tables text[] := array[
    'accounts',
    'cards',
    'invoices',
    'transactions',
    'invoice_payments',
    'recurrences',
    'budgets',
    'goals'
  ];
begin
  foreach v_table in array v_tables loop
    execute format('drop trigger if exists trg_audit_%I on public.%I;', v_table, v_table);
    execute format(
      'create trigger trg_audit_%I after insert or update or delete on public.%I for each row execute function public.audit_financial_table_changes();',
      v_table,
      v_table
    );
  end loop;
end $$;

-- 3) Recurrence resilience: failure backoff + system-safe processor.
alter table public.recurrences
  add column if not exists failure_count int not null default 0,
  add column if not exists last_error text,
  add column if not exists last_failed_at timestamptz;

create or replace function public.process_due_recurrences_for_user(
  p_user_id uuid,
  p_limit int default 100
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count int := 0;
  v_row public.recurrences%rowtype;
  v_next_failure_count int;
begin
  if p_user_id is null then
    raise exception 'User is required';
  end if;

  if coalesce(auth.role(), '') <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'Insufficient privileges';
  end if;

  for v_row in
    select *
    from public.recurrences
    where user_id = p_user_id
      and is_active = true
      and next_run <= v_now
    order by next_run asc
    limit greatest(coalesce(p_limit, 100), 1)
    for update skip locked
  loop
    begin
      if v_row.account_id is null then
        update public.recurrences
        set is_active = false,
            failure_count = coalesce(failure_count, 0) + 1,
            last_error = 'Missing recurrence account_id',
            last_failed_at = now(),
            updated_at = now()
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
            ),
            failure_count = 0,
            last_error = null,
            last_failed_at = null,
            updated_at = now()
        where id = v_row.id;

        v_count := v_count + 1;
      end if;
    exception
      when others then
        v_next_failure_count := coalesce(v_row.failure_count, 0) + 1;

        update public.recurrences
        set failure_count = v_next_failure_count,
            last_error = left(SQLERRM, 500),
            last_failed_at = now(),
            next_run = greatest(v_row.next_run, now() + interval '1 hour'),
            is_active = case when v_next_failure_count >= 3 then false else true end,
            updated_at = now()
        where id = v_row.id;
    end;
  end loop;

  return v_count;
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
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  return public.process_due_recurrences_for_user(v_uid, p_limit);
end;
$$;

create or replace function public.process_due_recurrences_system(
  p_limit int default 1000
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int := 0;
  v_remaining int := greatest(coalesce(p_limit, 1000), 1);
  v_user_id uuid;
  v_processed int;
begin
  if coalesce(auth.role(), '') <> 'service_role' and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Insufficient privileges';
  end if;

  for v_user_id in
    select user_id
    from public.recurrences
    where is_active = true
      and next_run <= now()
    group by user_id
    order by min(next_run) asc
  loop
    exit when v_remaining <= 0;

    v_processed := public.process_due_recurrences_for_user(v_user_id, v_remaining);
    v_processed := coalesce(v_processed, 0);

    v_total := v_total + v_processed;
    v_remaining := greatest(v_remaining - v_processed, 0);
  end loop;

  return v_total;
end;
$$;

revoke all on function public.process_due_recurrences_system(int) from public;
grant execute on function public.process_due_recurrences_system(int) to service_role;

commit;

