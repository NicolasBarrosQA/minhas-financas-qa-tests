begin;

drop policy if exists "accounts_all_own" on public.accounts;
drop policy if exists "cards_all_own" on public.cards;
drop policy if exists "invoices_all_own" on public.invoices;

drop policy if exists "accounts_select_own" on public.accounts;
drop policy if exists "accounts_insert_own" on public.accounts;
drop policy if exists "accounts_update_own" on public.accounts;
drop policy if exists "accounts_delete_own" on public.accounts;

drop policy if exists "cards_select_own" on public.cards;
drop policy if exists "cards_insert_own" on public.cards;
drop policy if exists "cards_update_own" on public.cards;
drop policy if exists "cards_delete_own" on public.cards;

drop policy if exists "invoices_select_own" on public.invoices;
drop policy if exists "invoices_insert_own" on public.invoices;
drop policy if exists "invoices_update_own" on public.invoices;
drop policy if exists "invoices_delete_own" on public.invoices;

create policy "accounts_select_own" on public.accounts
for select to authenticated
using (user_id = auth.uid());

create policy "accounts_insert_own" on public.accounts
for insert to authenticated
with check (user_id = auth.uid());

create policy "accounts_update_own" on public.accounts
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "accounts_delete_own" on public.accounts
for delete to authenticated
using (user_id = auth.uid());

create policy "cards_select_own" on public.cards
for select to authenticated
using (user_id = auth.uid());

create policy "cards_insert_own" on public.cards
for insert to authenticated
with check (user_id = auth.uid());

create policy "cards_update_own" on public.cards
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "cards_delete_own" on public.cards
for delete to authenticated
using (user_id = auth.uid());

create policy "invoices_select_own" on public.invoices
for select to authenticated
using (user_id = auth.uid());

create policy "invoices_insert_own" on public.invoices
for insert to authenticated
with check (user_id = auth.uid());

create policy "invoices_update_own" on public.invoices
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "invoices_delete_own" on public.invoices
for delete to authenticated
using (user_id = auth.uid());

create or replace function public.is_internal_derived_update()
returns boolean
language plpgsql
as $$
begin
  return coalesce(current_setting('app.allow_derived_updates', true), '') = '1'
    or pg_trigger_depth() > 1;
end;
$$;

create or replace function public.guard_sensitive_derived_updates()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_table_name = 'accounts' then
    if new.balance is distinct from old.balance and not public.is_internal_derived_update() then
      raise exception using
        errcode = '42501',
        message = 'Direct update to accounts.balance is not allowed';
    end if;
    return new;
  end if;

  if tg_table_name = 'cards' then
    if new.current_spend is distinct from old.current_spend and not public.is_internal_derived_update() then
      raise exception using
        errcode = '42501',
        message = 'Direct update to cards.current_spend is not allowed';
    end if;
    return new;
  end if;

  if tg_table_name = 'invoices' then
    if (
      new.closing_balance is distinct from old.closing_balance
      or new.minimum_payment is distinct from old.minimum_payment
      or new.paid_amount is distinct from old.paid_amount
      or new.status is distinct from old.status
    ) and not public.is_internal_derived_update() then
      raise exception using
        errcode = '42501',
        message = 'Direct update to derived invoice fields is not allowed';
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_accounts_guard_sensitive_derived_updates on public.accounts;
create trigger trg_accounts_guard_sensitive_derived_updates
before update on public.accounts
for each row execute function public.guard_sensitive_derived_updates();

drop trigger if exists trg_cards_guard_sensitive_derived_updates on public.cards;
create trigger trg_cards_guard_sensitive_derived_updates
before update on public.cards
for each row execute function public.guard_sensitive_derived_updates();

drop trigger if exists trg_invoices_guard_sensitive_derived_updates on public.invoices;
create trigger trg_invoices_guard_sensitive_derived_updates
before update on public.invoices
for each row execute function public.guard_sensitive_derived_updates();

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

  perform set_config('app.allow_derived_updates', '1', true);

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
