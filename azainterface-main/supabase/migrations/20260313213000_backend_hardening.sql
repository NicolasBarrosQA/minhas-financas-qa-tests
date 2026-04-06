begin;

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  payment_date date not null default current_date,
  account_balance_before numeric(14,2) not null,
  account_balance_after numeric(14,2) not null,
  invoice_paid_before numeric(14,2) not null,
  invoice_paid_after numeric(14,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists invoice_payments_user_id_idx on public.invoice_payments (user_id);
create index if not exists invoice_payments_invoice_id_idx on public.invoice_payments (invoice_id);
create index if not exists invoice_payments_payment_date_idx on public.invoice_payments (payment_date desc);

alter table public.invoice_payments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'invoice_payments'
      and policyname = 'invoice_payments_all_own'
  ) then
    create policy "invoice_payments_all_own" on public.invoice_payments
    for all to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_status_pending_consistency_chk'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_status_pending_consistency_chk
      check (
        (status = 'PENDENTE' and is_pending = true)
        or
        (status <> 'PENDENTE' and is_pending = false)
      ) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_type_fields_consistency_chk'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_type_fields_consistency_chk
      check (
        (type = 'RECEITA'
          and account_id is not null
          and card_id is null
          and transfer_to_account_id is null
          and invoice_id is null)
        or
        (type = 'DESPESA'
          and (
            (account_id is not null and card_id is null)
            or
            (account_id is null and card_id is not null)
          )
          and transfer_to_account_id is null)
        or
        (type = 'TRANSFERENCIA'
          and account_id is not null
          and transfer_to_account_id is not null
          and account_id <> transfer_to_account_id
          and card_id is null
          and invoice_id is null)
      ) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_installments_card_expense_chk'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_installments_card_expense_chk
      check (
        (installment_number is null and total_installments is null)
        or
        (type = 'DESPESA' and card_id is not null)
      ) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'invoices_paid_amount_not_exceed_closing_chk'
      and conrelid = 'public.invoices'::regclass
  ) then
    alter table public.invoices
      add constraint invoices_paid_amount_not_exceed_closing_chk
      check (paid_amount <= closing_balance) not valid;
  end if;
end $$;

create or replace function public.transaction_affects_ledger(
  p_status public.transaction_status,
  p_is_pending boolean
)
returns boolean
language sql
immutable
as $$
  select p_status = 'EFETIVADA' and coalesce(p_is_pending, false) = false;
$$;

create or replace function public.ensure_invoice_for_card_transaction()
returns trigger
language plpgsql
as $$
declare
  v_due_day int;
  v_month int;
  v_year int;
  v_opening_date date;
  v_due_date date;
  v_last_day int;
  v_invoice_id uuid;
begin
  if new.card_id is null or new.type <> 'DESPESA' then
    new.invoice_id := null;
    return new;
  end if;

  select c.due_day
    into v_due_day
  from public.cards c
  where c.id = new.card_id;

  if v_due_day is null then
    new.invoice_id := null;
    return new;
  end if;

  v_month := extract(month from new.date)::int;
  v_year := extract(year from new.date)::int;
  v_opening_date := make_date(v_year, v_month, 1);
  v_last_day := extract(day from (date_trunc('month', v_opening_date) + interval '1 month - 1 day'))::int;
  v_due_date := make_date(v_year, v_month, least(v_due_day, v_last_day));

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

create or replace function public.validate_transaction_business_rules()
returns trigger
language plpgsql
as $$
declare
  v_ref_user_id uuid;
  v_category_user_id uuid;
  v_category_type public.category_type;
  v_category_is_system boolean;
  v_invoice_user_id uuid;
  v_invoice_card_id uuid;
  v_recurrence_user_id uuid;
  v_recurrence_type public.recurrence_type;
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;

  if new.user_id is null then
    raise exception 'Authentication required';
  end if;

  if new.status = 'PENDENTE' then
    new.is_pending := true;
  else
    new.is_pending := false;
  end if;

  if new.type = 'RECEITA' then
    if new.account_id is null then
      raise exception 'Income transaction requires account_id';
    end if;
    if new.card_id is not null then
      raise exception 'Income transaction does not accept card_id';
    end if;
    if new.transfer_to_account_id is not null then
      raise exception 'Income transaction does not accept transfer_to_account_id';
    end if;
    new.invoice_id := null;
    new.installment_number := null;
    new.total_installments := null;
  elsif new.type = 'DESPESA' then
    if (new.account_id is null and new.card_id is null)
      or (new.account_id is not null and new.card_id is not null) then
      raise exception 'Expense transaction must target exactly one source: account or card';
    end if;
    if new.transfer_to_account_id is not null then
      raise exception 'Expense transaction does not accept transfer_to_account_id';
    end if;
    if new.account_id is not null then
      new.invoice_id := null;
      new.installment_number := null;
      new.total_installments := null;
    end if;
  elsif new.type = 'TRANSFERENCIA' then
    if new.account_id is null or new.transfer_to_account_id is null then
      raise exception 'Transfer transaction requires source and destination accounts';
    end if;
    if new.account_id = new.transfer_to_account_id then
      raise exception 'Transfer source and destination accounts must differ';
    end if;
    if new.card_id is not null then
      raise exception 'Transfer transaction does not accept card_id';
    end if;
    new.invoice_id := null;
    new.installment_number := null;
    new.total_installments := null;
  else
    raise exception 'Unsupported transaction type %', new.type;
  end if;

  if new.account_id is not null then
    select a.user_id into v_ref_user_id
    from public.accounts a
    where a.id = new.account_id;

    if v_ref_user_id is null then
      raise exception 'Invalid account_id';
    end if;
    if v_ref_user_id <> new.user_id then
      raise exception 'account_id does not belong to authenticated user';
    end if;
  end if;

  if new.transfer_to_account_id is not null then
    select a.user_id into v_ref_user_id
    from public.accounts a
    where a.id = new.transfer_to_account_id;

    if v_ref_user_id is null then
      raise exception 'Invalid transfer_to_account_id';
    end if;
    if v_ref_user_id <> new.user_id then
      raise exception 'transfer_to_account_id does not belong to authenticated user';
    end if;
  end if;

  if new.card_id is not null then
    select c.user_id into v_ref_user_id
    from public.cards c
    where c.id = new.card_id;

    if v_ref_user_id is null then
      raise exception 'Invalid card_id';
    end if;
    if v_ref_user_id <> new.user_id then
      raise exception 'card_id does not belong to authenticated user';
    end if;
  end if;

  if new.invoice_id is not null then
    select i.user_id, i.card_id
      into v_invoice_user_id, v_invoice_card_id
    from public.invoices i
    where i.id = new.invoice_id;

    if v_invoice_user_id is null then
      raise exception 'Invalid invoice_id';
    end if;
    if v_invoice_user_id <> new.user_id then
      raise exception 'invoice_id does not belong to authenticated user';
    end if;
    if new.card_id is null then
      raise exception 'invoice_id requires card_id';
    end if;
    if v_invoice_card_id <> new.card_id then
      raise exception 'invoice_id card mismatch';
    end if;
  end if;

  if new.category_id is not null then
    select c.user_id, c.type, c.is_system
      into v_category_user_id, v_category_type, v_category_is_system
    from public.categories c
    where c.id = new.category_id;

    if v_category_type is null then
      raise exception 'Invalid category_id';
    end if;

    if not v_category_is_system and v_category_user_id <> new.user_id then
      raise exception 'category_id does not belong to authenticated user';
    end if;

    if v_category_type::text <> new.type::text then
      raise exception 'category type mismatch for transaction type %', new.type;
    end if;
  end if;

  if new.recurrence_id is not null then
    select r.user_id, r.type
      into v_recurrence_user_id, v_recurrence_type
    from public.recurrences r
    where r.id = new.recurrence_id;

    if v_recurrence_user_id is null then
      raise exception 'Invalid recurrence_id';
    end if;
    if v_recurrence_user_id <> new.user_id then
      raise exception 'recurrence_id does not belong to authenticated user';
    end if;
    if v_recurrence_type::text <> new.type::text then
      raise exception 'recurrence type mismatch for transaction type %', new.type;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_transactions_validate_business_rules on public.transactions;
create trigger trg_transactions_validate_business_rules
before insert or update on public.transactions
for each row execute function public.validate_transaction_business_rules();

create or replace function public.validate_recurrence_business_rules()
returns trigger
language plpgsql
as $$
declare
  v_account_user_id uuid;
  v_category_user_id uuid;
  v_category_type public.category_type;
  v_category_is_system boolean;
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

drop trigger if exists trg_recurrences_validate_business_rules on public.recurrences;
create trigger trg_recurrences_validate_business_rules
before insert or update on public.recurrences
for each row execute function public.validate_recurrence_business_rules();

create or replace function public.apply_transaction_ledger_effects()
returns trigger
language plpgsql
as $$
declare
  v_closing_balance numeric;
  v_paid_amount numeric;
  v_due_date date;
  v_new_closing numeric;
begin
  if not public.transaction_affects_ledger(new.status, new.is_pending) then
    return new;
  end if;

  if new.type = 'TRANSFERENCIA' then
    if new.account_id is not null then
      update public.accounts
      set balance = balance - new.amount
      where id = new.account_id;
    end if;

    if new.transfer_to_account_id is not null then
      update public.accounts
      set balance = balance + new.amount
      where id = new.transfer_to_account_id;
    end if;
    return new;
  end if;

  if new.type = 'RECEITA' and new.account_id is not null then
    update public.accounts
    set balance = balance + new.amount
    where id = new.account_id;
    return new;
  end if;

  if new.type = 'DESPESA' then
    if new.card_id is not null then
      update public.cards
      set current_spend = greatest(0, current_spend + new.amount)
      where id = new.card_id;

      if new.invoice_id is not null then
        select i.closing_balance, i.paid_amount, i.due_date
          into v_closing_balance, v_paid_amount, v_due_date
        from public.invoices i
        where i.id = new.invoice_id
        for update;

        v_new_closing := greatest(0, coalesce(v_closing_balance, 0) + new.amount);

        update public.invoices
        set closing_balance = v_new_closing,
            minimum_payment = round(v_new_closing * 0.1, 2),
            status = public.compute_invoice_status(v_new_closing, coalesce(v_paid_amount, 0), v_due_date)
        where id = new.invoice_id;
      end if;
      return new;
    end if;

    if new.account_id is not null then
      update public.accounts
      set balance = balance - new.amount
      where id = new.account_id;
    end if;
    return new;
  end if;

  return new;
end;
$$;

create or replace function public.next_recurrence_run(
  p_base timestamptz,
  p_frequency public.recurrence_frequency
)
returns timestamptz
language plpgsql
immutable
as $$
begin
  case p_frequency
    when 'DIARIA' then return p_base + interval '1 day';
    when 'SEMANAL' then return p_base + interval '1 week';
    when 'QUINZENAL' then return p_base + interval '15 days';
    when 'MENSAL' then return p_base + interval '1 month';
    when 'BIMESTRAL' then return p_base + interval '2 months';
    when 'TRIMESTRAL' then return p_base + interval '3 months';
    when 'SEMESTRAL' then return p_base + interval '6 months';
    when 'ANUAL' then return p_base + interval '1 year';
    else return p_base + interval '1 month';
  end case;
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
        update public.recurrences
        set is_active = false
        where id = v_row.id;
    end;
  end loop;

  return v_count;
end;
$$;

create or replace function public.revert_transaction_ledger_effects()
returns trigger
language plpgsql
as $$
declare
  v_closing_balance numeric;
  v_paid_amount numeric;
  v_due_date date;
  v_new_closing numeric;
  v_new_paid numeric;
begin
  if not public.transaction_affects_ledger(old.status, old.is_pending) then
    return old;
  end if;

  if old.type = 'TRANSFERENCIA' then
    if old.account_id is not null then
      update public.accounts
      set balance = balance + old.amount
      where id = old.account_id;
    end if;

    if old.transfer_to_account_id is not null then
      update public.accounts
      set balance = balance - old.amount
      where id = old.transfer_to_account_id;
    end if;
    return old;
  end if;

  if old.type = 'RECEITA' and old.account_id is not null then
    update public.accounts
    set balance = balance - old.amount
    where id = old.account_id;
    return old;
  end if;

  if old.type = 'DESPESA' then
    if old.card_id is not null then
      update public.cards
      set current_spend = greatest(0, current_spend - old.amount)
      where id = old.card_id;

      if old.invoice_id is not null then
        select i.closing_balance, i.paid_amount, i.due_date
          into v_closing_balance, v_paid_amount, v_due_date
        from public.invoices i
        where i.id = old.invoice_id
        for update;

        v_new_closing := greatest(0, coalesce(v_closing_balance, 0) - old.amount);
        v_new_paid := least(coalesce(v_paid_amount, 0), v_new_closing);

        update public.invoices
        set closing_balance = v_new_closing,
            paid_amount = v_new_paid,
            minimum_payment = round(v_new_closing * 0.1, 2),
            status = public.compute_invoice_status(v_new_closing, v_new_paid, v_due_date)
        where id = old.invoice_id;
      end if;
      return old;
    end if;

    if old.account_id is not null then
      update public.accounts
      set balance = balance + old.amount
      where id = old.account_id;
    end if;
    return old;
  end if;

  return old;
end;
$$;

create or replace function public.reapply_transaction_ledger_effects()
returns trigger
language plpgsql
as $$
declare
  v_old_apply boolean := public.transaction_affects_ledger(old.status, old.is_pending);
  v_new_apply boolean := public.transaction_affects_ledger(new.status, new.is_pending);
  v_old_closing_balance numeric;
  v_old_paid_amount numeric;
  v_old_due_date date;
  v_old_new_closing numeric;
  v_old_new_paid numeric;
  v_new_closing_balance numeric;
  v_new_paid_amount numeric;
  v_new_due_date date;
  v_new_new_closing numeric;
begin
  if v_old_apply then
    if old.type = 'TRANSFERENCIA' then
      if old.account_id is not null then
        update public.accounts
        set balance = balance + old.amount
        where id = old.account_id;
      end if;

      if old.transfer_to_account_id is not null then
        update public.accounts
        set balance = balance - old.amount
        where id = old.transfer_to_account_id;
      end if;
    elsif old.type = 'RECEITA' then
      if old.account_id is not null then
        update public.accounts
        set balance = balance - old.amount
        where id = old.account_id;
      end if;
    elsif old.type = 'DESPESA' then
      if old.card_id is not null then
        update public.cards
        set current_spend = greatest(0, current_spend - old.amount)
        where id = old.card_id;

        if old.invoice_id is not null then
          select i.closing_balance, i.paid_amount, i.due_date
            into v_old_closing_balance, v_old_paid_amount, v_old_due_date
          from public.invoices i
          where i.id = old.invoice_id
          for update;

          v_old_new_closing := greatest(0, coalesce(v_old_closing_balance, 0) - old.amount);
          v_old_new_paid := least(coalesce(v_old_paid_amount, 0), v_old_new_closing);

          update public.invoices
          set closing_balance = v_old_new_closing,
              paid_amount = v_old_new_paid,
              minimum_payment = round(v_old_new_closing * 0.1, 2),
              status = public.compute_invoice_status(v_old_new_closing, v_old_new_paid, v_old_due_date)
          where id = old.invoice_id;
        end if;
      elsif old.account_id is not null then
        update public.accounts
        set balance = balance + old.amount
        where id = old.account_id;
      end if;
    end if;
  end if;

  if v_new_apply then
    if new.type = 'TRANSFERENCIA' then
      if new.account_id is not null then
        update public.accounts
        set balance = balance - new.amount
        where id = new.account_id;
      end if;

      if new.transfer_to_account_id is not null then
        update public.accounts
        set balance = balance + new.amount
        where id = new.transfer_to_account_id;
      end if;
    elsif new.type = 'RECEITA' then
      if new.account_id is not null then
        update public.accounts
        set balance = balance + new.amount
        where id = new.account_id;
      end if;
    elsif new.type = 'DESPESA' then
      if new.card_id is not null then
        update public.cards
        set current_spend = greatest(0, current_spend + new.amount)
        where id = new.card_id;

        if new.invoice_id is not null then
          select i.closing_balance, i.paid_amount, i.due_date
            into v_new_closing_balance, v_new_paid_amount, v_new_due_date
          from public.invoices i
          where i.id = new.invoice_id
          for update;

          v_new_new_closing := greatest(0, coalesce(v_new_closing_balance, 0) + new.amount);

          update public.invoices
          set closing_balance = v_new_new_closing,
              minimum_payment = round(v_new_new_closing * 0.1, 2),
              status = public.compute_invoice_status(v_new_new_closing, coalesce(v_new_paid_amount, 0), v_new_due_date)
          where id = new.invoice_id;
        end if;
      elsif new.account_id is not null then
        update public.accounts
        set balance = balance - new.amount
        where id = new.account_id;
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.pay_invoice(
  p_invoice_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_payment_date date default null
)
returns public.invoices
language plpgsql
security invoker
as $$
declare
  v_uid uuid := auth.uid();
  v_invoice public.invoices%rowtype;
  v_account public.accounts%rowtype;
  v_card public.cards%rowtype;
  v_remaining numeric;
  v_applied numeric;
  v_new_paid numeric;
  v_effective_balance numeric;
  v_payment_date date := coalesce(p_payment_date, current_date);
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid payment amount';
  end if;

  if v_payment_date > current_date then
    raise exception 'Payment date cannot be in the future';
  end if;

  select *
    into v_invoice
  from public.invoices
  where id = p_invoice_id
    and user_id = v_uid
  for update;

  if not found then
    raise exception 'Invoice not found';
  end if;

  select *
    into v_account
  from public.accounts
  where id = p_account_id
    and user_id = v_uid
  for update;

  if not found then
    raise exception 'Account not found';
  end if;

  select *
    into v_card
  from public.cards
  where id = v_invoice.card_id
    and user_id = v_uid
  for update;

  if not found then
    raise exception 'Card not found';
  end if;

  v_remaining := greatest(v_invoice.closing_balance - v_invoice.paid_amount, 0);
  if v_remaining <= 0 then
    return v_invoice;
  end if;

  v_applied := least(p_amount, v_remaining);
  v_effective_balance := public.account_effective_balance(v_account.id, current_date);

  if coalesce(v_effective_balance, 0) < v_applied then
    raise exception 'Insufficient account balance';
  end if;

  update public.accounts
  set balance = balance - v_applied
  where id = v_account.id;

  update public.cards
  set current_spend = greatest(0, current_spend - v_applied)
  where id = v_card.id;

  v_new_paid := v_invoice.paid_amount + v_applied;

  update public.invoices
  set paid_amount = v_new_paid,
      minimum_payment = round(greatest(v_invoice.closing_balance, 0) * 0.1, 2),
      status = public.compute_invoice_status(v_invoice.closing_balance, v_new_paid, v_invoice.due_date)
  where id = v_invoice.id
  returning * into v_invoice;

  insert into public.invoice_payments (
    user_id,
    invoice_id,
    card_id,
    account_id,
    amount,
    payment_date,
    account_balance_before,
    account_balance_after,
    invoice_paid_before,
    invoice_paid_after
  )
  values (
    v_uid,
    v_invoice.id,
    v_card.id,
    v_account.id,
    v_applied,
    v_payment_date,
    round(v_effective_balance, 2),
    round(v_effective_balance - v_applied, 2),
    round(v_invoice.paid_amount - v_applied, 2),
    round(v_invoice.paid_amount, 2)
  );

  return v_invoice;
end;
$$;

commit;
