begin;

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
  ),
  transfer_in_effect as (
    select coalesce(sum(t.amount), 0) as value
    from public.transactions t
    where t.transfer_to_account_id = p_account_id
      and t.type = 'TRANSFERENCIA'
      and t.date > p_as_of
  )
  select coalesce(origin_effect.value, 0) + coalesce(transfer_in_effect.value, 0)
  from origin_effect
  cross join transfer_in_effect;
$$;

create or replace function public.account_effective_balance(
  p_account_id uuid,
  p_as_of date default current_date
)
returns numeric
language plpgsql
stable
security invoker
as $$
declare
  v_balance numeric;
  v_future_effect numeric;
begin
  select a.balance
    into v_balance
  from public.accounts a
  where a.id = p_account_id;

  if v_balance is null then
    return null;
  end if;

  v_future_effect := public.account_future_ledger_effect(p_account_id, p_as_of);
  return v_balance - coalesce(v_future_effect, 0);
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

  return v_invoice;
end;
$$;

commit;
