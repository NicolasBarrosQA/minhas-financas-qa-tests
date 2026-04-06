begin;

create or replace function public.compute_invoice_status(
  p_closing_balance numeric,
  p_paid_amount numeric,
  p_due_date date
)
returns public.invoice_status
language plpgsql
as $$
declare
  v_remaining numeric := greatest(coalesce(p_closing_balance, 0) - coalesce(p_paid_amount, 0), 0);
begin
  if v_remaining <= 0 then
    return 'PAGA';
  end if;

  if coalesce(p_paid_amount, 0) > 0 then
    return 'PARCIALMENTE_PAGA';
  end if;

  if p_due_date < current_date then
    return 'ATRASADA';
  end if;

  return 'ABERTA';
end;
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
    return new;
  end if;

  select c.due_day
    into v_due_day
  from public.cards c
  where c.id = new.card_id;

  if v_due_day is null then
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

drop trigger if exists trg_transactions_assign_invoice on public.transactions;
create trigger trg_transactions_assign_invoice
before insert on public.transactions
for each row execute function public.ensure_invoice_for_card_transaction();

drop trigger if exists trg_transactions_apply_ledger on public.transactions;
create trigger trg_transactions_apply_ledger
after insert on public.transactions
for each row execute function public.apply_transaction_ledger_effects();

drop trigger if exists trg_transactions_revert_ledger on public.transactions;
create trigger trg_transactions_revert_ledger
after delete on public.transactions
for each row execute function public.revert_transaction_ledger_effects();

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
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid payment amount';
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

  if v_account.balance < v_applied then
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

  return v_invoice;
end;
$$;

commit;
