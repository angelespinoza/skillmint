-- SkillMint — Supabase setup
-- Run this in the Supabase SQL editor before deploying

-- ─── Skills index table ───────────────────────────────────────────────────────
create table if not exists skills (
  skill_id       bigint primary key,
  name           text not null,
  category       text not null,
  skill_ipfs     text not null,
  profile_ipfs   text,
  price_per_call text not null,   -- stored as wei string
  license_price  text,            -- stored as wei string, null = NFT disabled
  is_anonymous   boolean default false,
  active         boolean default true,
  owner_address  text,            -- null when is_anonymous = true
  creator_name   text,            -- denormalized for fast queries (null if anon)
  creator_title  text,            -- denormalized for card display
  total_calls    bigint default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- Index for marketplace queries
create index if not exists idx_skills_category on skills(category);
create index if not exists idx_skills_calls    on skills(total_calls desc);
create index if not exists idx_skills_active   on skills(active);
create index if not exists idx_skills_owner    on skills(owner_address);

-- ─── RPC: increment call count ────────────────────────────────────────────────
create or replace function increment_calls(sid bigint)
returns void language sql as $$
  update skills set total_calls = total_calls + 1, updated_at = now()
  where skill_id = sid;
$$;

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table skills enable row level security;

-- Anyone can read active skills
create policy "Public read active skills"
  on skills for select
  using (active = true);

-- Only service role can insert/update (backend uses service role key)
create policy "Service role write"
  on skills for all
  using (auth.role() = 'service_role');

-- ─── Sample data (for demo) ───────────────────────────────────────────────────
insert into skills (skill_id, name, category, skill_ipfs, price_per_call, license_price, is_anonymous, active, creator_name, creator_title, total_calls)
values
  (1, 'Contratos Comerciales Perú', 'legal',      'QmDemo1', '1000000000000000', '250000000000000000', false, true, 'Carlos Mendoza',  'Commercial Lawyer · 12 yrs', 4821),
  (2, 'Due Diligence Financiero',   'finance',     'QmDemo2', '3000000000000000', '500000000000000000', false, true, 'María Quispe',    'CFA · M&A Advisor · 8 yrs',  2340),
  (3, 'Diagnóstico Diferencial',    'medical',     'QmDemo3', '5000000000000000', '750000000000000000', false, true, 'Dr. Luis Paredes','Internist · UPCH · 15 yrs',  1890),
  (4, 'SUNAT & Tributación Perú',   'tax',         'QmDemo4', '2000000000000000', '400000000000000000', false, true, 'Rosa Delgado',    'CPA · Tax Specialist · 10 yrs',3210),
  (5, 'Propiedad Intelectual LATAM','legal',        'QmDemo5', '1500000000000000', '300000000000000000', false, true, 'Valeria Ruiz',    'IP Attorney · 7 yrs',          987),
  (6, 'AML/KYC Fintech Latam',      'compliance',  'QmDemo6', '4000000000000000', '600000000000000000', true,  true, null, null, 1450)
on conflict (skill_id) do nothing;
