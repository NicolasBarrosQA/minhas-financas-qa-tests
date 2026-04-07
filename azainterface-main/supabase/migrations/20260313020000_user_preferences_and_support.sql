begin;

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  avatar_base_color text not null default 'pink' check (avatar_base_color in ('pink', 'gold', 'blue', 'lavender', 'mint')),
  avatar_accessory text not null default 'none' check (avatar_accessory in ('none', 'crown', 'aviator', 'glasses', 'partyhat', 'flowers')),
  avatar_background text not null default '#FFD1DC',
  notification_daily_reminder boolean not null default true,
  notification_invoice_due boolean not null default true,
  notification_budget_alert boolean not null default true,
  notification_goal_progress boolean not null default true,
  notification_promotions boolean not null default false,
  security_biometric boolean not null default true,
  security_pin_enabled boolean not null default false,
  security_two_factor_enabled boolean not null default false,
  security_recovery_key_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('chat', 'email', 'form', 'delete_account')),
  subject text not null,
  message text not null,
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_id_idx on public.support_tickets (user_id);
create index if not exists support_tickets_status_idx on public.support_tickets (status);

insert into public.user_preferences (user_id)
select u.id
from auth.users u
where not exists (
  select 1 from public.user_preferences p where p.user_id = u.id
);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_user_preferences_updated_at') then
    create trigger trg_user_preferences_updated_at before update on public.user_preferences
    for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_support_tickets_updated_at') then
    create trigger trg_support_tickets_updated_at before update on public.support_tickets
    for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.user_preferences enable row level security;
alter table public.support_tickets enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_preferences' and policyname = 'user_preferences_all_own'
  ) then
    create policy "user_preferences_all_own" on public.user_preferences
    for all to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'support_tickets' and policyname = 'support_tickets_all_own'
  ) then
    create policy "support_tickets_all_own" on public.support_tickets
    for all to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
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

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

commit;
