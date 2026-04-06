begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_type') then
    create type public.account_type as enum ('CORRENTE', 'POUPANCA', 'CARTEIRA', 'INVESTIMENTO', 'CREDITO', 'OUTROS');
  end if;
  if not exists (select 1 from pg_type where typname = 'card_type') then
    create type public.card_type as enum ('CREDITO', 'DEBITO', 'CREDITO_E_DEBITO');
  end if;
  if not exists (select 1 from pg_type where typname = 'category_type') then
    create type public.category_type as enum ('RECEITA', 'DESPESA', 'TRANSFERENCIA');
  end if;
  if not exists (select 1 from pg_type where typname = 'transaction_type') then
    create type public.transaction_type as enum ('RECEITA', 'DESPESA', 'TRANSFERENCIA');
  end if;
  if not exists (select 1 from pg_type where typname = 'transaction_status') then
    create type public.transaction_status as enum ('PENDENTE', 'EFETIVADA', 'CANCELADA');
  end if;
  if not exists (select 1 from pg_type where typname = 'transaction_origin') then
    create type public.transaction_origin as enum ('MANUAL', 'RECORRENTE', 'TRANSFERENCIA', 'IMPORTADA');
  end if;
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type public.invoice_status as enum ('ABERTA', 'PARCIALMENTE_PAGA', 'PAGA', 'ATRASADA');
  end if;
  if not exists (select 1 from pg_type where typname = 'recurrence_frequency') then
    create type public.recurrence_frequency as enum ('DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');
  end if;
  if not exists (select 1 from pg_type where typname = 'recurrence_type') then
    create type public.recurrence_type as enum ('RECEITA', 'DESPESA');
  end if;
  if not exists (select 1 from pg_type where typname = 'budget_period') then
    create type public.budget_period as enum ('SEMANAL', 'MENSAL', 'ANUAL', 'CUSTOM');
  end if;
  if not exists (select 1 from pg_type where typname = 'budget_status') then
    create type public.budget_status as enum ('ON_TRACK', 'WARNING', 'OVER');
  end if;
  if not exists (select 1 from pg_type where typname = 'goal_status') then
    create type public.goal_status as enum ('ANDAMENTO', 'CONCLUIDA', 'CANCELADA', 'PAUSADA');
  end if;
  if not exists (select 1 from pg_type where typname = 'goal_movement_type') then
    create type public.goal_movement_type as enum ('APORTE', 'RETIRADA');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  type public.category_type not null,
  color text,
  icon text,
  parent_id uuid references public.categories(id) on delete set null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_system_owner_chk
    check (
      (is_system = true and user_id is null)
      or
      (is_system = false and user_id is not null)
    )
);

create unique index if not exists categories_unique_scope_idx
  on public.categories (
    coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name),
    type,
    coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.account_type not null default 'CORRENTE',
  balance numeric(14,2) not null default 0,
  initial_balance numeric(14,2) not null default 0,
  is_auto boolean not null default false,
  is_archived boolean not null default false,
  color text,
  institution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists accounts_user_id_idx on public.accounts (user_id);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  name text not null,
  type public.card_type not null default 'CREDITO',
  credit_limit numeric(14,2) not null check (credit_limit >= 0),
  current_spend numeric(14,2) not null default 0 check (current_spend >= 0),
  available_limit numeric(14,2) generated always as (credit_limit - current_spend) stored,
  closing_day smallint not null check (closing_day between 1 and 31),
  due_day smallint not null check (due_day between 1 and 31),
  brand text,
  last_four_digits text,
  color text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cards_user_id_idx on public.cards (user_id);
create index if not exists cards_account_id_idx on public.cards (account_id);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  month int not null check (month between 1 and 12),
  year int not null check (year between 2000 and 2200),
  opening_date date not null,
  due_date date not null,
  closing_balance numeric(14,2) not null default 0,
  minimum_payment numeric(14,2) not null default 0,
  status public.invoice_status not null default 'ABERTA',
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_unique_card_month unique (card_id, month, year)
);

create index if not exists invoices_user_id_idx on public.invoices (user_id);
create index if not exists invoices_card_id_idx on public.invoices (card_id);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

create unique index if not exists tags_unique_user_name_idx on public.tags (user_id, lower(name));
create index if not exists tags_user_id_idx on public.tags (user_id);

create table if not exists public.recurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  name text not null,
  type public.recurrence_type not null,
  frequency public.recurrence_frequency not null,
  amount numeric(14,2) not null check (amount > 0),
  day_of_month smallint check (day_of_month between 1 and 31),
  day_of_week smallint check (day_of_week between 0 and 6),
  last_run timestamptz,
  next_run timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recurrences_user_id_idx on public.recurrences (user_id);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  card_id uuid references public.cards(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  recurrence_id uuid references public.recurrences(id) on delete set null,
  type public.transaction_type not null,
  amount numeric(14,2) not null check (amount > 0),
  description text not null,
  date date not null default current_date,
  status public.transaction_status not null default 'EFETIVADA',
  origin public.transaction_origin not null default 'MANUAL',
  is_pending boolean not null default false,
  is_recurring boolean not null default false,
  installment_number smallint,
  total_installments smallint,
  note text,
  transfer_to_account_id uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_installments_chk
    check (
      (installment_number is null and total_installments is null)
      or
      (
        installment_number is not null
        and total_installments is not null
        and installment_number >= 1
        and total_installments >= 1
        and installment_number <= total_installments
      )
    )
);

create index if not exists transactions_user_id_idx on public.transactions (user_id);
create index if not exists transactions_account_id_idx on public.transactions (account_id);
create index if not exists transactions_card_id_idx on public.transactions (card_id);
create index if not exists transactions_date_idx on public.transactions (date desc);
create index if not exists transactions_type_idx on public.transactions (type);
create index if not exists transactions_category_id_idx on public.transactions (category_id);

create table if not exists public.transaction_tags (
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (transaction_id, tag_id)
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  amount numeric(14,2) not null check (amount > 0),
  spent numeric(14,2) not null default 0,
  remaining numeric(14,2) not null default 0,
  period public.budget_period not null default 'MENSAL',
  start_date date not null default current_date,
  end_date date,
  is_active boolean not null default true,
  status public.budget_status not null default 'ON_TRACK',
  progress numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists budgets_user_id_idx on public.budgets (user_id);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  target_amount numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0,
  progress numeric(5,2) not null default 0,
  deadline date,
  status public.goal_status not null default 'ANDAMENTO',
  category text,
  icon text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_user_id_idx on public.goals (user_id);

create table if not exists public.goal_movements (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.goal_movement_type not null,
  amount numeric(14,2) not null check (amount > 0),
  description text,
  created_at timestamptz not null default now()
);

create index if not exists goal_movements_goal_id_idx on public.goal_movements (goal_id);
create index if not exists goal_movements_user_id_idx on public.goal_movements (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_profiles_updated_at') then
    create trigger trg_profiles_updated_at before update on public.profiles
    for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_categories_updated_at') then
    create trigger trg_categories_updated_at before update on public.categories
    for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_accounts_updated_at') then
    create trigger trg_accounts_updated_at before update on public.accounts
    for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_cards_updated_at') then
    create trigger trg_cards_updated_at before update on public.cards
    for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_invoices_updated_at') then
    create trigger trg_invoices_updated_at before update on public.invoices
    for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_recurrences_updated_at') then
    create trigger trg_recurrences_updated_at before update on public.recurrences
    for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_transactions_updated_at') then
    create trigger trg_transactions_updated_at before update on public.transactions
    for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_budgets_updated_at') then
    create trigger trg_budgets_updated_at before update on public.budgets
    for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_goals_updated_at') then
    create trigger trg_goals_updated_at before update on public.goals
    for each row execute function public.set_updated_at();
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.accounts enable row level security;
alter table public.cards enable row level security;
alter table public.invoices enable row level security;
alter table public.tags enable row level security;
alter table public.recurrences enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_tags enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.goal_movements enable row level security;

create policy "profiles_select_own" on public.profiles
for select to authenticated using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "categories_select_system_or_own" on public.categories
for select to authenticated using (is_system = true or user_id = auth.uid());
create policy "categories_insert_own" on public.categories
for insert to authenticated with check (user_id = auth.uid() and is_system = false);
create policy "categories_update_own" on public.categories
for update to authenticated using (user_id = auth.uid() and is_system = false) with check (user_id = auth.uid() and is_system = false);
create policy "categories_delete_own" on public.categories
for delete to authenticated using (user_id = auth.uid() and is_system = false);

create policy "accounts_all_own" on public.accounts
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "cards_all_own" on public.cards
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "invoices_all_own" on public.invoices
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "tags_all_own" on public.tags
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "recurrences_all_own" on public.recurrences
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "transactions_all_own" on public.transactions
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "transaction_tags_select_own" on public.transaction_tags
for select to authenticated
using (
  exists (
    select 1 from public.transactions t
    where t.id = transaction_tags.transaction_id
      and t.user_id = auth.uid()
  )
);
create policy "transaction_tags_insert_own" on public.transaction_tags
for insert to authenticated
with check (
  exists (
    select 1 from public.transactions t
    where t.id = transaction_tags.transaction_id
      and t.user_id = auth.uid()
  )
  and exists (
    select 1 from public.tags tg
    where tg.id = transaction_tags.tag_id
      and tg.user_id = auth.uid()
  )
);
create policy "transaction_tags_delete_own" on public.transaction_tags
for delete to authenticated
using (
  exists (
    select 1 from public.transactions t
    where t.id = transaction_tags.transaction_id
      and t.user_id = auth.uid()
  )
);

create policy "budgets_all_own" on public.budgets
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "goals_all_own" on public.goals
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "goal_movements_all_own" on public.goal_movements
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into public.categories (id, user_id, name, type, color, icon, is_system)
values
  ('00000000-0000-0000-0000-000000000101', null, 'Salario', 'RECEITA', '#10B981', 'trabalho', true),
  ('00000000-0000-0000-0000-000000000102', null, 'Freelance', 'RECEITA', '#06B6D4', 'freelance', true),
  ('00000000-0000-0000-0000-000000000103', null, 'Investimentos', 'RECEITA', '#8B5CF6', 'investimentos', true),
  ('00000000-0000-0000-0000-000000000104', null, 'Outros', 'RECEITA', '#6B7280', 'dinheiro', true),
  ('00000000-0000-0000-0000-000000000201', null, 'Alimentacao', 'DESPESA', '#F59E0B', 'alimentacao', true),
  ('00000000-0000-0000-0000-000000000202', null, 'Transporte', 'DESPESA', '#3B82F6', 'transporte', true),
  ('00000000-0000-0000-0000-000000000203', null, 'Moradia', 'DESPESA', '#EC4899', 'moradia', true),
  ('00000000-0000-0000-0000-000000000204', null, 'Saude', 'DESPESA', '#EF4444', 'saude', true),
  ('00000000-0000-0000-0000-000000000205', null, 'Lazer', 'DESPESA', '#A855F7', 'lazer', true),
  ('00000000-0000-0000-0000-000000000206', null, 'Educacao', 'DESPESA', '#14B8A6', 'educacao', true),
  ('00000000-0000-0000-0000-000000000207', null, 'Pessoal', 'DESPESA', '#F97316', 'pessoal', true),
  ('00000000-0000-0000-0000-000000000208', null, 'Outros', 'DESPESA', '#6B7280', 'outros', true),
  ('00000000-0000-0000-0000-000000000301', null, 'Transferencia', 'TRANSFERENCIA', '#6366F1', 'transferencia', true)
on conflict (id) do nothing;

commit;
