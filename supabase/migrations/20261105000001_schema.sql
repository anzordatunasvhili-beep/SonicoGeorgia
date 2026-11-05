-- =============================================================================
-- Sonico — core schema
-- Commerce, creators program, commissions, inventory, reviews, storage, RLS.
-- =============================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role          as enum ('customer', 'creator', 'admin');
create type public.order_status       as enum ('pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'payment_failed');
create type public.application_status as enum ('pending', 'approved', 'rejected');
create type public.submission_status  as enum ('draft', 'submitted', 'in_review', 'changes_requested', 'approved', 'rejected');
create type public.production_status  as enum ('not_started', 'prototyping', 'tooling', 'manufacturing', 'released', 'discontinued');
create type public.agreement_status   as enum ('proposed', 'active', 'declined', 'terminated');
create type public.earning_status     as enum ('pending', 'payable', 'paid', 'void');
create type public.payout_status      as enum ('recorded', 'sent', 'failed');

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           citext not null,
  full_name       text,
  avatar_url      text,
  phone           text,
  role            public.user_role not null default 'customer',
  default_address jsonb,
  marketing_opt_in boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role helpers (security definer so they can be used inside RLS without recursion)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Create a profile for every new auth user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users can never change their own role / email via the API; only admins can change roles.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin()
     and coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Only administrators can change roles';
  end if;
  if new.email is distinct from old.email and not public.is_admin()
     and current_user not in ('postgres', 'supabase_admin') then
    new.email := old.email;
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name        text not null,
  description text,
  icon        text not null default 'category',          -- Material Symbols name
  accent      text not null default '#FF7A1A',
  parent_id   uuid references public.categories (id) on delete set null,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Creators program
-- ---------------------------------------------------------------------------
create table public.creators (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references public.profiles (id) on delete cascade,
  display_name text not null,
  slug         text not null unique check (slug ~ '^[a-z0-9-]+$'),
  headline     text,
  bio          text,
  avatar_url   text,
  location     text,
  website      text,
  socials      jsonb not null default '{}'::jsonb,
  payout_notes text,  -- creator-provided payout instructions; visible to creator + admins only
  status       text not null default 'active' check (status in ('active', 'suspended')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger creators_updated_at before update on public.creators
  for each row execute function public.set_updated_at();

-- Defined after public.creators: SQL-language function bodies are validated at creation time.
create or replace function public.current_creator_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.creators where user_id = auth.uid() and status = 'active' limit 1;
$$;

create table public.creator_applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  display_name  text not null,
  portfolio_url text,
  location      text,
  bio           text not null,
  motivation    text not null,
  experience    text,
  disciplines   text[] not null default '{}',
  status        public.application_status not null default 'pending',
  reviewer_id   uuid references public.profiles (id),
  review_notes  text,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
create unique index creator_applications_one_pending
  on public.creator_applications (user_id) where status = 'pending';

create table public.products (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9-]+$'),
  sku              text not null unique,
  name             text not null,
  tagline          text,
  description      text,
  category_id      uuid references public.categories (id) on delete set null,
  price            numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2) check (compare_at_price is null or compare_at_price >= 0),
  currency         char(3) not null default 'GEL',
  stock            int not null default 0 check (stock >= 0),
  low_stock_threshold int not null default 5,
  is_active        boolean not null default true,
  is_featured      boolean not null default false,
  is_new           boolean not null default false,
  images           text[] not null default '{}',   -- public URLs (product-media bucket)
  model_url        text,                           -- .glb/.gltf URL, loaded lazily on product page
  model_preset     text check (model_preset in ('headphones','speaker','turntable','keyboard','earbuds','radio','generic')),
  accent_color     text not null default '#FF7A1A',
  features         jsonb not null default '[]'::jsonb,  -- [{icon,label}]
  specs            jsonb not null default '{}'::jsonb,  -- {"Driver":"40 mm", ...}
  creator_id       uuid references public.creators (id) on delete set null,
  submission_id    uuid,  -- FK added after design_submissions exists
  rating_avg       numeric(3,2) not null default 0,
  rating_count     int not null default 0,
  search           tsvector generated always as (
                     setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
                     setweight(to_tsvector('simple', coalesce(tagline, '')), 'B') ||
                     setweight(to_tsvector('simple', coalesce(description, '')), 'C')
                   ) stored,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create index products_creator_idx  on public.products (creator_id);
create index products_search_idx   on public.products using gin (search);
create index products_active_idx   on public.products (is_active, is_featured);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.design_submissions (
  id                uuid primary key default gen_random_uuid(),
  creator_id        uuid not null references public.creators (id) on delete cascade,
  title             text not null,
  category_id       uuid references public.categories (id) on delete set null,
  summary           text,
  description       text not null,
  materials         text,
  target_price      numeric(10,2),
  image_paths       text[] not null default '{}',   -- private bucket: creator-submissions
  model_path        text,                           -- private bucket: creator-submissions
  status            public.submission_status not null default 'draft',
  production_status public.production_status not null default 'not_started',
  admin_notes       text,     -- visible to the creator (feedback)
  product_id        uuid references public.products (id) on delete set null,
  submitted_at      timestamptz,
  reviewed_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index design_submissions_creator_idx on public.design_submissions (creator_id);
create index design_submissions_status_idx  on public.design_submissions (status);
create trigger design_submissions_updated_at before update on public.design_submissions
  for each row execute function public.set_updated_at();

alter table public.products
  add constraint products_submission_fk foreign key (submission_id)
  references public.design_submissions (id) on delete set null;

-- Creators may only edit drafts / changes-requested, and never touch review fields.
create or replace function public.guard_submission_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or current_user in ('postgres', 'supabase_admin') then
    if new.status in ('approved', 'rejected', 'changes_requested') and old.status is distinct from new.status then
      new.reviewed_at := now();
    end if;
    return new;
  end if;

  if old.status not in ('draft', 'changes_requested') then
    raise exception 'This submission is locked while under review';
  end if;
  if new.status not in ('draft', 'submitted') then
    raise exception 'Creators can only save drafts or submit';
  end if;
  if new.production_status is distinct from old.production_status
     or new.admin_notes is distinct from old.admin_notes
     or new.product_id is distinct from old.product_id
     or new.creator_id is distinct from old.creator_id then
    raise exception 'Not allowed to modify review fields';
  end if;
  if new.status = 'submitted' and old.status <> 'submitted' then
    new.submitted_at := now();
  end if;
  return new;
end $$;
create trigger design_submissions_guard before update on public.design_submissions
  for each row execute function public.guard_submission_update();

create or replace function public.guard_submission_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if new.status not in ('draft', 'submitted') then new.status := 'draft'; end if;
    new.production_status := 'not_started';
    new.admin_notes := null;
    new.product_id := null;
    if new.status = 'submitted' then new.submitted_at := now(); end if;
  end if;
  return new;
end $$;
create trigger design_submissions_guard_ins before insert on public.design_submissions
  for each row execute function public.guard_submission_insert();

create table public.commission_agreements (
  id             uuid primary key default gen_random_uuid(),
  creator_id     uuid not null references public.creators (id) on delete cascade,
  submission_id  uuid references public.design_submissions (id) on delete set null,
  product_id     uuid references public.products (id) on delete set null,
  royalty_percent numeric(5,2) not null check (royalty_percent > 0 and royalty_percent <= 50),
  basis          text not null default 'net_item_revenue' check (basis in ('net_item_revenue')),
  terms          text not null,
  status         public.agreement_status not null default 'proposed',
  starts_at      date,
  ends_at        date,
  created_by     uuid references public.profiles (id),
  responded_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);
create unique index commission_agreements_one_active_per_product
  on public.commission_agreements (product_id) where status = 'active';
create trigger commission_agreements_updated_at before update on public.commission_agreements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create sequence public.order_number_seq start 100001;

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique default ('SNC-' || nextval('public.order_number_seq')),
  user_id          uuid not null references public.profiles (id) on delete restrict,
  status           public.order_status not null default 'pending_payment',
  currency         char(3) not null default 'GEL',
  subtotal         numeric(10,2) not null check (subtotal >= 0),
  shipping_cost    numeric(10,2) not null default 0 check (shipping_cost >= 0),
  total            numeric(10,2) not null check (total >= 0),
  contact_email    citext not null,
  contact_phone    text,
  shipping_address jsonb not null,
  customer_note    text,
  payment_provider text not null default 'flitt',
  payment_reference text unique,   -- order_id sent to Flitt
  payment_id       text,           -- Flitt payment_id
  carrier          text,
  tracking_number  text,
  paid_at          timestamptz,
  shipped_at       timestamptz,
  delivered_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index orders_user_idx   on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  product_id      uuid references public.products (id) on delete set null,
  product_name    text not null,
  product_sku     text not null,
  product_image   text,
  unit_price      numeric(10,2) not null check (unit_price >= 0),
  quantity        int not null check (quantity > 0 and quantity <= 20),
  line_total      numeric(10,2) not null,
  creator_id      uuid references public.creators (id) on delete set null,
  agreement_id    uuid references public.commission_agreements (id) on delete set null,
  royalty_percent numeric(5,2)
);
create index order_items_order_idx   on public.order_items (order_id);
create index order_items_creator_idx on public.order_items (creator_id);

create table public.order_status_history (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders (id) on delete cascade,
  status     public.order_status not null,
  note       text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

create or replace function public.log_order_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_status_history (order_id, status, created_by)
    values (new.id, new.status, auth.uid());
    if new.status = 'shipped' and new.shipped_at is null then new.shipped_at := now(); end if;
    if new.status = 'delivered' and new.delivered_at is null then new.delivered_at := now(); end if;
  end if;
  return new;
end $$;
create trigger orders_status_log_ins after insert on public.orders
  for each row execute function public.log_order_status();
create trigger orders_status_log_upd before update on public.orders
  for each row execute function public.log_order_status();

create table public.payment_transactions (
  id           bigint generated always as identity primary key,
  order_id     uuid references public.orders (id) on delete set null,
  provider     text not null default 'flitt',
  reference    text,
  order_status text,
  amount_minor bigint,
  currency     text,
  signature_ok boolean not null,
  payload      jsonb not null,
  created_at   timestamptz not null default now()
);
create index payment_transactions_order_idx on public.payment_transactions (order_id);

-- ---------------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------------
create table public.inventory_movements (
  id         bigint generated always as identity primary key,
  product_id uuid not null references public.products (id) on delete cascade,
  delta      int not null,
  reason     text not null check (reason in ('sale', 'restock', 'adjustment', 'return', 'cancellation')),
  note       text,
  order_id   uuid references public.orders (id) on delete set null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index inventory_movements_product_idx on public.inventory_movements (product_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Creator earnings & payouts (payouts are recorded manually by admins)
-- ---------------------------------------------------------------------------
create table public.creator_payouts (
  id         uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators (id) on delete restrict,
  amount     numeric(10,2) not null check (amount > 0),
  currency   char(3) not null default 'GEL',
  method     text not null,
  reference  text,
  note       text,
  status     public.payout_status not null default 'recorded',
  paid_at    timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.creator_earnings (
  id              uuid primary key default gen_random_uuid(),
  creator_id      uuid not null references public.creators (id) on delete restrict,
  order_item_id   uuid not null unique references public.order_items (id) on delete restrict,
  order_id        uuid not null references public.orders (id) on delete restrict,
  product_id      uuid references public.products (id) on delete set null,
  agreement_id    uuid references public.commission_agreements (id) on delete set null,
  sale_amount     numeric(10,2) not null,
  royalty_percent numeric(5,2) not null,
  amount          numeric(10,2) not null,
  currency        char(3) not null default 'GEL',
  status          public.earning_status not null default 'pending',
  payout_id       uuid references public.creator_payouts (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index creator_earnings_creator_idx on public.creator_earnings (creator_id, created_at desc);
create trigger creator_earnings_updated_at before update on public.creator_earnings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Reviews, newsletter, contact
-- ---------------------------------------------------------------------------
create table public.product_reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  author_name text not null,
  rating     int not null check (rating between 1 and 5),
  title      text,
  body       text not null check (char_length(body) between 10 and 2000),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create or replace function public.has_purchased(p_product uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.product_id = p_product and o.user_id = auth.uid()
      and o.status in ('paid', 'processing', 'shipped', 'delivered')
  );
$$;

create or replace function public.refresh_product_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p set
    rating_avg   = coalesce((select round(avg(rating)::numeric, 2) from public.product_reviews where product_id = pid and is_published), 0),
    rating_count = (select count(*) from public.product_reviews where product_id = pid and is_published)
  where p.id = pid;
  return null;
end $$;
create trigger product_reviews_rating after insert or update or delete on public.product_reviews
  for each row execute function public.refresh_product_rating();

create table public.newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      citext not null unique,
  created_at timestamptz not null default now()
);

create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles (id) on delete set null,
  name       text not null,
  email      citext not null,
  topic      text not null default 'general',
  message    text not null check (char_length(message) between 10 and 5000),
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- RPCs
-- =============================================================================

-- Server-side order creation: prices, stock and creator attribution are computed
-- here — never trusted from the client.
create or replace function public.create_order(
  p_items jsonb,               -- [{ "product_id": uuid, "quantity": int }]
  p_shipping_address jsonb,    -- { full_name, line1, line2, city, region, postal_code, country }
  p_contact_email text,
  p_contact_phone text default null,
  p_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_order uuid;
  v_subtotal numeric(10,2) := 0;
  v_shipping numeric(10,2);
  v_item jsonb;
  v_qty int;
  v_prod public.products%rowtype;
  v_agr public.commission_agreements%rowtype;
  v_currency char(3);
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'Too many items'; end if;
  if coalesce(p_shipping_address ->> 'full_name', '') = '' or coalesce(p_shipping_address ->> 'line1', '') = ''
     or coalesce(p_shipping_address ->> 'city', '') = '' or coalesce(p_shipping_address ->> 'country', '') = '' then
    raise exception 'Shipping address is incomplete';
  end if;

  insert into public.orders (user_id, subtotal, shipping_cost, total, contact_email, contact_phone, shipping_address, customer_note)
  values (v_user, 0, 0, 0, p_contact_email, p_contact_phone, p_shipping_address, nullif(trim(p_note), ''))
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 20 then raise exception 'Invalid quantity'; end if;

    select * into v_prod from public.products
      where id = (v_item ->> 'product_id')::uuid and is_active
      for share;
    if not found then raise exception 'A product in your cart is no longer available'; end if;
    if v_prod.stock < v_qty then raise exception 'Only % left of %', v_prod.stock, v_prod.name; end if;
    if v_currency is null then v_currency := v_prod.currency;
    elsif v_currency <> v_prod.currency then raise exception 'Mixed currencies are not supported'; end if;

    v_agr := null;
    if v_prod.creator_id is not null then
      select * into v_agr from public.commission_agreements
        where product_id = v_prod.id and status = 'active'
          and (starts_at is null or starts_at <= current_date)
          and (ends_at is null or ends_at >= current_date)
        limit 1;
    end if;

    insert into public.order_items (order_id, product_id, product_name, product_sku, product_image,
      unit_price, quantity, line_total, creator_id, agreement_id, royalty_percent)
    values (v_order, v_prod.id, v_prod.name, v_prod.sku, v_prod.images[1],
      v_prod.price, v_qty, v_prod.price * v_qty, v_prod.creator_id, v_agr.id, v_agr.royalty_percent);

    v_subtotal := v_subtotal + v_prod.price * v_qty;
  end loop;

  v_shipping := case when v_subtotal >= 150 then 0 else 10 end;  -- free shipping over 150 GEL

  update public.orders set subtotal = v_subtotal, shipping_cost = v_shipping,
    total = v_subtotal + v_shipping, currency = coalesce(v_currency, 'GEL')
  where id = v_order;

  return v_order;
end $$;

-- Called only by the payment webhook (service role). Idempotent.
create or replace function public.mark_order_paid(p_order uuid, p_payment_id text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  r record;
begin
  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.status not in ('pending_payment', 'payment_failed') then return; end if;  -- already processed

  update public.orders set status = 'paid', paid_at = now(), payment_id = p_payment_id where id = p_order;

  for r in select * from public.order_items where order_id = p_order loop
    if r.product_id is not null then
      update public.products set stock = greatest(stock - r.quantity, 0) where id = r.product_id;
      insert into public.inventory_movements (product_id, delta, reason, order_id)
      values (r.product_id, -r.quantity, 'sale', p_order);
    end if;
    if r.creator_id is not null and r.royalty_percent is not null then
      insert into public.creator_earnings (creator_id, order_item_id, order_id, product_id, agreement_id,
        sale_amount, royalty_percent, amount, currency)
      values (r.creator_id, r.id, p_order, r.product_id, r.agreement_id,
        r.line_total, r.royalty_percent, round(r.line_total * r.royalty_percent / 100, 2), v_order.currency)
      on conflict (order_item_id) do nothing;
    end if;
  end loop;
end $$;

-- Admin: refunds/cancellations void creator earnings that have not been paid yet and restock.
create or replace function public.admin_cancel_order(p_order uuid, p_status public.order_status, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_prev public.order_status; r record;
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  if p_status not in ('cancelled', 'refunded') then raise exception 'Invalid status'; end if;
  select status into v_prev from public.orders where id = p_order for update;
  if v_prev in ('cancelled', 'refunded') then return; end if;

  update public.orders set status = p_status where id = p_order;
  update public.order_status_history set note = p_note
    where id = (select max(id) from public.order_status_history where order_id = p_order);
  update public.creator_earnings set status = 'void' where order_id = p_order and status in ('pending', 'payable');

  if v_prev in ('paid', 'processing') then
    for r in select * from public.order_items where order_id = p_order and product_id is not null loop
      update public.products set stock = stock + r.quantity where id = r.product_id;
      insert into public.inventory_movements (product_id, delta, reason, order_id, created_by)
      values (r.product_id, r.quantity, case when p_status = 'refunded' then 'return' else 'cancellation' end, p_order, auth.uid());
    end loop;
  end if;
end $$;

-- Admin: adjust stock with an audit trail.
create or replace function public.admin_adjust_stock(p_product uuid, p_delta int, p_reason text, p_note text default null)
returns int language plpgsql security definer set search_path = public as $$
declare v_stock int;
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  if p_reason not in ('restock', 'adjustment', 'return') then raise exception 'Invalid reason'; end if;
  update public.products set stock = stock + p_delta where id = p_product returning stock into v_stock;
  if v_stock is null then raise exception 'Product not found'; end if;
  if v_stock < 0 then raise exception 'Stock cannot go negative'; end if;
  insert into public.inventory_movements (product_id, delta, reason, note, created_by)
  values (p_product, p_delta, p_reason, p_note, auth.uid());
  return v_stock;
end $$;

-- Admin: review a creator application. Approval creates the creator record and grants the role.
create or replace function public.review_creator_application(p_application uuid, p_approve boolean, p_notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_app public.creator_applications%rowtype;
  v_creator uuid;
  v_slug text;
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  select * into v_app from public.creator_applications where id = p_application for update;
  if not found then raise exception 'Application not found'; end if;
  if v_app.status <> 'pending' then raise exception 'Application already reviewed'; end if;

  update public.creator_applications
    set status = case when p_approve then 'approved'::public.application_status else 'rejected'::public.application_status end,
        reviewer_id = auth.uid(), review_notes = p_notes, reviewed_at = now()
    where id = p_application;

  if not p_approve then return null; end if;

  v_slug := trim(both '-' from regexp_replace(lower(v_app.display_name), '[^a-z0-9]+', '-', 'g'));
  if v_slug = '' then v_slug := 'creator'; end if;
  if exists (select 1 from public.creators where slug = v_slug) then
    v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 5);
  end if;

  insert into public.creators (user_id, display_name, slug, bio, location, website)
  values (v_app.user_id, v_app.display_name, v_slug, v_app.bio, v_app.location, v_app.portfolio_url)
  on conflict (user_id) do update set status = 'active'
  returning id into v_creator;

  update public.profiles set role = 'creator' where id = v_app.user_id and role = 'customer';
  return v_creator;
end $$;

-- Creator: accept or decline a proposed commission agreement.
create or replace function public.respond_to_agreement(p_agreement uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_agr public.commission_agreements%rowtype;
begin
  select * into v_agr from public.commission_agreements where id = p_agreement for update;
  if not found or v_agr.creator_id is distinct from public.current_creator_id() then raise exception 'Forbidden'; end if;
  if v_agr.status <> 'proposed' then raise exception 'Agreement is not awaiting a response'; end if;
  if p_accept and v_agr.product_id is not null and exists (
       select 1 from public.commission_agreements where product_id = v_agr.product_id and status = 'active') then
    raise exception 'This product already has an active agreement';
  end if;
  update public.commission_agreements
    set status = case when p_accept then 'active'::public.agreement_status else 'declined'::public.agreement_status end,
        responded_at = now(),
        starts_at = case when p_accept then coalesce(starts_at, current_date) else starts_at end
    where id = p_agreement;
end $$;

-- Admin: record a manual payout covering a set of payable earnings.
create or replace function public.admin_record_payout(p_creator uuid, p_earning_ids uuid[], p_method text, p_reference text, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_total numeric(10,2); v_payout uuid; v_count int;
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  select coalesce(sum(amount), 0), count(*) into v_total, v_count from public.creator_earnings
    where id = any(p_earning_ids) and creator_id = p_creator and status = 'payable';
  if v_count = 0 or v_count <> coalesce(array_length(p_earning_ids, 1), 0) then
    raise exception 'All selected earnings must be payable and belong to the creator';
  end if;
  insert into public.creator_payouts (creator_id, amount, method, reference, note, created_by, status)
  values (p_creator, v_total, p_method, p_reference, p_note, auth.uid(), 'sent')
  returning id into v_payout;
  update public.creator_earnings set status = 'paid', payout_id = v_payout where id = any(p_earning_ids);
  return v_payout;
end $$;

-- Admin dashboard metrics
create or replace function public.admin_metrics()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  return jsonb_build_object(
    'revenue_30d', (select coalesce(sum(total), 0) from public.orders where status in ('paid','processing','shipped','delivered') and paid_at > now() - interval '30 days'),
    'orders_30d', (select count(*) from public.orders where status in ('paid','processing','shipped','delivered') and paid_at > now() - interval '30 days'),
    'to_fulfil', (select count(*) from public.orders where status in ('paid','processing')),
    'customers', (select count(*) from public.profiles),
    'low_stock', (select count(*) from public.products where is_active and stock <= low_stock_threshold),
    'pending_applications', (select count(*) from public.creator_applications where status = 'pending'),
    'pending_submissions', (select count(*) from public.design_submissions where status in ('submitted','in_review')),
    'creator_liability', (select coalesce(sum(amount), 0) from public.creator_earnings where status in ('pending','payable'))
  );
end $$;

-- Lock down RPC execution
revoke execute on function public.mark_order_paid(uuid, text) from public, anon, authenticated;
grant  execute on function public.mark_order_paid(uuid, text) to service_role;
revoke execute on function public.create_order(jsonb, jsonb, text, text, text) from public, anon;
grant  execute on function public.create_order(jsonb, jsonb, text, text, text) to authenticated;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles               enable row level security;
alter table public.categories             enable row level security;
alter table public.creators               enable row level security;
alter table public.creator_applications   enable row level security;
alter table public.products               enable row level security;
alter table public.design_submissions     enable row level security;
alter table public.commission_agreements  enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.order_status_history   enable row level security;
alter table public.payment_transactions   enable row level security;
alter table public.inventory_movements    enable row level security;
alter table public.creator_payouts        enable row level security;
alter table public.creator_earnings       enable row level security;
alter table public.product_reviews        enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.contact_messages       enable row level security;

-- profiles
create policy "profiles: read own"    on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles: update own"  on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- categories
create policy "categories: public read" on public.categories for select using (is_active or public.is_admin());
create policy "categories: admin write" on public.categories for all using (public.is_admin()) with check (public.is_admin());

-- products
create policy "products: public read" on public.products for select using (is_active or public.is_admin());
create policy "products: admin write" on public.products for all using (public.is_admin()) with check (public.is_admin());

-- creators: public profile read; owner can edit profile fields; admin all
-- The base table (holds payout_notes) is private; visitors read public.creator_profiles instead.
create policy "creators: owner read"   on public.creators for select using (user_id = auth.uid() or public.is_admin());
create policy "creators: owner update" on public.creators for update using (user_id = auth.uid() and status = 'active') with check (user_id = auth.uid() and status = 'active');
create policy "creators: admin write"  on public.creators for all using (public.is_admin()) with check (public.is_admin());
-- Public creator profile without payout notes (runs as owner so anonymous visitors can read it)
create or replace view public.creator_profiles with (security_invoker = false) as
  select id, display_name, slug, headline, bio, avatar_url, location, website, socials, created_at
  from public.creators where status = 'active';
grant select on public.creator_profiles to anon, authenticated;

-- creator applications
create policy "applications: own read"   on public.creator_applications for select using (user_id = auth.uid() or public.is_admin());
create policy "applications: own insert" on public.creator_applications for insert
  with check (user_id = auth.uid() and status = 'pending' and reviewer_id is null and review_notes is null);
create policy "applications: admin update" on public.creator_applications for update using (public.is_admin()) with check (public.is_admin());

-- design submissions
create policy "submissions: creator read"   on public.design_submissions for select using (creator_id = public.current_creator_id() or public.is_admin());
create policy "submissions: creator insert" on public.design_submissions for insert with check (creator_id = public.current_creator_id());
create policy "submissions: creator update" on public.design_submissions for update
  using (creator_id = public.current_creator_id() or public.is_admin())
  with check (creator_id = public.current_creator_id() or public.is_admin());
create policy "submissions: creator delete draft" on public.design_submissions for delete
  using ((creator_id = public.current_creator_id() and status = 'draft') or public.is_admin());

-- commission agreements (creators respond via RPC only)
create policy "agreements: creator read" on public.commission_agreements for select using (creator_id = public.current_creator_id() or public.is_admin());
create policy "agreements: admin write"  on public.commission_agreements for all using (public.is_admin()) with check (public.is_admin());

-- orders (created via create_order RPC; customers cannot update orders)
create policy "orders: own read"     on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy "orders: admin update" on public.orders for update using (public.is_admin()) with check (public.is_admin());

create policy "order_items: own read" on public.order_items for select using (
  public.is_admin()
  or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
create policy "order_status_history: own read" on public.order_status_history for select using (
  public.is_admin()
  or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
create policy "order_status_history: admin write" on public.order_status_history for update using (public.is_admin()) with check (public.is_admin());

create policy "payment_transactions: admin read" on public.payment_transactions for select using (public.is_admin());
create policy "inventory: admin read"            on public.inventory_movements for select using (public.is_admin());

-- creator earnings & payouts
create policy "earnings: creator read" on public.creator_earnings for select using (creator_id = public.current_creator_id() or public.is_admin());
create policy "earnings: admin update" on public.creator_earnings for update using (public.is_admin()) with check (public.is_admin());
create policy "payouts: creator read"  on public.creator_payouts for select using (creator_id = public.current_creator_id() or public.is_admin());
create policy "payouts: admin write"   on public.creator_payouts for all using (public.is_admin()) with check (public.is_admin());

-- Creators can see how many units of *their* products sold (without customer PII)
create or replace view public.creator_sales with (security_invoker = false) as
  select oi.id as order_item_id, oi.order_id, o.order_number, o.status as order_status, o.paid_at,
         oi.product_id, oi.product_name, oi.quantity, oi.line_total, oi.royalty_percent, oi.creator_id
  from public.order_items oi join public.orders o on o.id = oi.order_id
  where oi.creator_id = public.current_creator_id()
    and o.status in ('paid', 'processing', 'shipped', 'delivered', 'refunded', 'cancelled');
grant select on public.creator_sales to authenticated;

-- reviews
create policy "reviews: public read"   on public.product_reviews for select using (is_published or user_id = auth.uid() or public.is_admin());
create policy "reviews: buyer insert"  on public.product_reviews for insert with check (user_id = auth.uid() and public.has_purchased(product_id));
create policy "reviews: own update"    on public.product_reviews for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "reviews: own delete"    on public.product_reviews for delete using (user_id = auth.uid() or public.is_admin());

-- newsletter & contact: anyone may insert; admins read
create policy "newsletter: anyone subscribe" on public.newsletter_subscribers for insert with check (true);
create policy "newsletter: admin read"       on public.newsletter_subscribers for select using (public.is_admin());
create policy "contact: anyone insert"       on public.contact_messages for insert with check (user_id is null or user_id = auth.uid());
create policy "contact: admin manage"        on public.contact_messages for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- Storage
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-media', 'product-media', true, 52428800,
     array['image/jpeg','image/png','image/webp','image/avif','model/gltf-binary','model/gltf+json','application/octet-stream']),
  ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('creator-submissions', 'creator-submissions', false, 52428800,
     array['image/jpeg','image/png','image/webp','model/gltf-binary','model/gltf+json','application/octet-stream','application/pdf'])
on conflict (id) do nothing;

create policy "product-media: public read" on storage.objects for select using (bucket_id = 'product-media');
create policy "product-media: admin write" on storage.objects for insert with check (bucket_id = 'product-media' and public.is_admin());
create policy "product-media: admin update" on storage.objects for update using (bucket_id = 'product-media' and public.is_admin());
create policy "product-media: admin delete" on storage.objects for delete using (bucket_id = 'product-media' and public.is_admin());

create policy "avatars: public read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars: own write"   on storage.objects for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: own update"  on storage.objects for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: own delete"  on storage.objects for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- creator-submissions/<auth uid>/<submission id>/<file>
create policy "submissions-files: owner or admin read" on storage.objects for select
  using (bucket_id = 'creator-submissions' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "submissions-files: creator upload" on storage.objects for insert
  with check (bucket_id = 'creator-submissions' and (storage.foldername(name))[1] = auth.uid()::text and public.current_creator_id() is not null);
create policy "submissions-files: owner delete" on storage.objects for delete
  using (bucket_id = 'creator-submissions' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
