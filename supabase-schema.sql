-- SocialDeck SMM Panel — Supabase schema (free tier)
-- Run this in your Supabase project's SQL Editor

-- Services: platform > service type > quality tier
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  platform text not null,          -- 'instagram','tiktok','youtube','facebook'
  service_type text not null,      -- 'followers','likes','views','subscribers','watch_time'
  quality text not null,           -- 'high','economy'
  name text not null,
  description text,
  price_pkr numeric(12,2) not null,
  min_qty int default 100,
  max_qty int default 100000,
  delivery_speed text,             -- e.g. '1-2 days'
  active boolean default true,
  created_at timestamptz default now()
);

-- Orders placed by customers
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null, -- human-friendly e.g. SD-8F3K2A
  service_id uuid references services(id),
  platform text not null,
  service_type text not null,
  quality text not null,
  quantity int not null,
  price_pkr numeric(12,2) not null,
  customer_name text,
  contact_number text not null,    -- required: for wrong-link follow-up
  profile_link text not null,      -- the link to boost
  transaction_id text not null,    -- JazzCash/Easypaisa TID
  status text not null default 'pending', -- pending|processing|completed|cancelled
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Visitor page views (powers the daily 8 PM traffic report)
create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  page text not null default '/',
  referrer text,
  user_agent text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table services enable row level security;
alter table orders enable row level security;
alter table page_views enable row level security;

-- Public can read active services
create policy "public read services" on services
  for select using (active = true);

-- Public can insert orders (no auth needed for storefront)
create policy "public insert orders" on orders
  for insert with check (true);

-- Public can look up their own order by order_code + contact_number
-- (enforced in app logic; RLS allows select with filter)
create policy "public lookup own order" on orders
  for select using (true);

-- Public (anonymous website visitors) can record page views;
-- without this INSERT policy the tracker silently records nothing
-- (diagnosed 2026-10-16: table existed, RLS on, no insert policy)
create policy "public insert page_views" on page_views
  for insert with check (true);

-- Public can read page views (feeds the traffic report)
create policy "public read page_views" on page_views
  for select using (true);

-- NOTE: Admin operations (update status, see all) should use the
-- Supabase SERVICE ROLE key from a trusted admin page or the
-- Supabase dashboard Table Editor. Never expose the service key publicly.
