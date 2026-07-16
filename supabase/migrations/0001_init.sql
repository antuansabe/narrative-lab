-- Narrative Lab — initial schema
-- Mirrors CAS's conventions: pgcrypto for UUIDs, RLS enabled on every table
-- (defense in depth — only the server-side secret key ever touches these
-- tables, but this means an accidental publishable-key client call can't
-- read or write anything).

create extension if not exists pgcrypto;

create type sender_type as enum ('journalist', 'organization', 'other');
create type piece_format as enum ('article', 'audiovisual', 'social');
create type genre_tag as enum (
  'free-form-interview',
  'structured-profile',
  'social-media-post',
  'institutional-report',
  'speech-public-address',
  'fundraising-copy'
);
create type paradigm_key as enum ('paradigm1', 'paradigm2', 'paradigm3', 'paradigm4');
create type paradigm_level as enum ('absent', 'present', 'central');

create table corpora (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table contributors (
  id uuid primary key default gen_random_uuid(),
  corpus_id uuid not null references corpora(id) on delete cascade,
  name text not null,
  sender_type sender_type not null,
  created_at timestamptz not null default now()
);

create table pieces (
  id uuid primary key default gen_random_uuid(),
  corpus_id uuid not null references corpora(id) on delete cascade,
  contributor_id uuid not null references contributors(id) on delete cascade,
  title text not null,
  text text not null,
  genre_tag genre_tag not null,
  format piece_format not null,
  created_at timestamptz not null default now()
);

create table analyses (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null unique references pieces(id) on delete cascade,
  enactment_score int not null,
  d1 int not null, d2 int not null, d3 int not null, d4 int not null, d5 int not null,
  each_orientation text not null,
  genre_tag genre_tag not null,
  raw_json text not null,
  schema_version text not null,
  model_version text not null,
  created_at timestamptz not null default now()
);

create table paradigm_classifications (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references pieces(id) on delete cascade,
  paradigm paradigm_key not null,
  level paradigm_level not null,
  justification text not null,
  model_version text not null,
  created_at timestamptz not null default now(),
  constraint paradigm_classifications_unique unique (piece_id, paradigm, model_version)
);

create index on contributors (corpus_id);
create index on pieces (corpus_id);
create index on pieces (contributor_id);
create index on paradigm_classifications (piece_id);

alter table corpora enable row level security;
alter table contributors enable row level security;
alter table pieces enable row level security;
alter table analyses enable row level security;
alter table paradigm_classifications enable row level security;
