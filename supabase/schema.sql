-- Run this in the Supabase SQL editor to create the basic schema and seed data.

-- single user table (optional single-user app)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text,
  target_calories integer,
  created_at timestamptz default now()
);

-- user_settings for single-user preferences (weekly budget, preferred stores)
create table if not exists user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  weekly_budget numeric default 100, -- default $100/week
  currency text default 'USD',
  preferred_stores text[], -- array of store ids or names
  updated_at timestamptz default now()
);

-- stores table to hold store metadata (name, address)
create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamptz default now()
);

-- meals saved by user
create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  calories integer not null default 0,
  protein integer default 0,
  carbs integer default 0,
  fat integer default 0,
  notes text,
  created_at timestamptz default now()
);

-- ingredients (shared across meals)
create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_qty text, -- free-form "2 cups", "1 lb"
  created_at timestamptz default now()
);

-- mapping ingredient -> store -> product (brand-aware price estimates)
create table if not exists store_products (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid references ingredients(id),
  store_id uuid references stores(id),
  product_name text,
  brand text,
  price_estimate numeric,
  created_at timestamptz default now()
);

-- join table meal -> ingredient (with quantity per serving)
create table if not exists meal_ingredients (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid references meals(id) on delete cascade,
  ingredient_id uuid references ingredients(id),
  quantity text,
  notes text
);

-- weekly plan (one row per planned slot)
create table if not exists weekly_plan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  week_start date not null, -- ISO week start date (e.g., Monday)
  day_of_week int not null, -- 0..6
  meal_slot text not null, -- breakfast/lunch/dinner/snack
  meal_id uuid references meals(id),
  created_at timestamptz default now()
);

-- ingredient likes/dislikes (for personalization)
create table if not exists ingredient_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  ingredient_id uuid references ingredients(id),
  score int not null, -- +1 like, -1 dislike (could be >1 over time)
  updated_at timestamptz default now()
);

-- knowledge docs parsed from uploaded PDFs/txt
create table if not exists knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  storage_path text, -- path in Supabase Storage bucket
  chunk_text text, -- parsed chunk of text
  chunk_vector text, -- optional stored precomputed vector (if you add embedding later)
  created_at timestamptz default now()
);

-- Seed: create a default single user and default settings
insert into users (id, name, target_calories) values (
  '00000000-0000-0000-0000-000000000000', 'Jacob (default)', 3500
) ON CONFLICT DO NOTHING;

insert into user_settings (user_id, weekly_budget, currency, preferred_stores) values (
  '00000000-0000-0000-0000-000000000000', 100, 'USD', array[]::text[]
) ON CONFLICT DO NOTHING;

-- Seed stores (HEB with the address you provided, and a generic Costco sample)
-- HEB: 6711 S Fry Rd, Katy, TX 77494
insert into stores (id, name, address) values (
  '11111111-1111-1111-1111-111111111111', 'HEB - S Fry Rd (Katy)', '6711 S Fry Rd, Katy, TX 77494'
) ON CONFLICT DO NOTHING;

insert into stores (id, name, address) values (
  '22222222-2222-2222-2222-222222222222', 'Costco (nearest)', 'Costco - local warehouse (seed)'
) ON CONFLICT DO NOTHING;

-- Seed a few ingredients
insert into ingredients (id, name, default_qty) values
  ('a1111111-1111-1111-1111-111111111111','Chicken Breast','1 lb') ON CONFLICT DO NOTHING,
  ('a2222222-2222-2222-2222-222222222222','White Rice','1 lb') ON CONFLICT DO NOTHING,
  ('a3333333-3333-3333-3333-333333333333','Large Eggs','1 dozen') ON CONFLICT DO NOTHING;

-- Seed store_products with rough price estimates for those ingredients
insert into store_products (ingredient_id, store_id, product_name, brand, price_estimate) values
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Fresh Boneless Skinless Chicken Breast', 'HEB Brand', 3.49) ON CONFLICT DO NOTHING,
  ('a1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Kirkland Boneless Skinless Chicken', 'Kirkland', 2.99) ON CONFLICT DO NOTHING,
  ('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'HEB Long Grain White Rice 5 lb', 'HEB', 4.99) ON CONFLICT DO NOTHING,
  ('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Kirkland Signature White Rice 25 lb', 'Kirkland', 12.99) ON CONFLICT DO NOTHING,
  ('a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'HEB Large Eggs', 'HEB', 2.69) ON CONFLICT DO NOTHING,
  ('a3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Kirkland Cage Free Eggs (18 ct)', 'Kirkland', 3.89) ON CONFLICT DO NOTHING;

-- Note: ON CONFLICT DO NOTHING is used for seed idempotency in example; adjust as needed.