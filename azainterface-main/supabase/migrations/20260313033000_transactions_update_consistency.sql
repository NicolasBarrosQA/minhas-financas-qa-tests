begin;

create or replace function public.ensure_invoice_for_card_transaction_on_update()
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

create or replace function public.reapply_transaction_ledger_effects()
returns trigger
language plpgsql
as $$
declare
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

  return new;
end;
$$;

drop trigger if exists trg_transactions_assign_invoice_update on public.transactions;
create trigger trg_transactions_assign_invoice_update
before update on public.transactions
for each row execute function public.ensure_invoice_for_card_transaction_on_update();

drop trigger if exists trg_transactions_reapply_ledger on public.transactions;
create trigger trg_transactions_reapply_ledger
after update on public.transactions
for each row execute function public.reapply_transaction_ledger_effects();

commit;
