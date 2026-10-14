-- Applied to Supabase uobxxgzshrmbtjfdolxd on 2026-10-14.
-- Schema is private; do not add it to exposed API schemas.
create schema if not exists roleta_ocr;
revoke all on schema roleta_ocr from public, anon, authenticated;
create table if not exists roleta_ocr.learning_jobs (
 id uuid primary key default gen_random_uuid(),
 event_id text not null,
 final_version_id text not null,
 image_sha256 text not null check (image_sha256 ~ '^[a-f0-9]{64}$'),
 image_storage_path text,
 state text not null default 'queued' check (state in ('queued','processing','needs_review','confirmed','rejected','failed')),
 submitted_by text not null,
 consent_at timestamptz not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(event_id,final_version_id,image_sha256)
);
create table if not exists roleta_ocr.readings (
 id uuid primary key default gen_random_uuid(),
 job_id uuid not null references roleta_ocr.learning_jobs(id) on delete restrict,
 engine text not null check(engine in ('ocr_space','google_comparison')),
 engine_version text,
 payload jsonb not null,
 created_at timestamptz not null default now(),
 unique(job_id,engine,engine_version)
);
create table if not exists roleta_ocr.name_evidence (
 id uuid primary key default gen_random_uuid(),
 job_id uuid not null references roleta_ocr.learning_jobs(id) on delete restrict,
 reading_id uuid not null references roleta_ocr.readings(id) on delete restrict,
 physical_position integer not null check(physical_position between 1 and 100),
 raw_name text not null,
 official_broker_key text,
 confirmed_name text,
 decision text not null default 'pending' check(decision in ('pending','confirmed','rejected','conflict')),
 decided_by text,
 decided_at timestamptz,
 created_at timestamptz not null default now(),
 unique(reading_id,physical_position,raw_name),
 check(decision <> 'confirmed' or (nullif(trim(official_broker_key),'') is not null and nullif(trim(confirmed_name),'') is not null and nullif(trim(decided_by),'') is not null and decided_at is not null))
);
create table if not exists roleta_ocr.dictionary (
 id uuid primary key default gen_random_uuid(),
 normalized_variant text not null,
 official_broker_key text not null,
 official_name text not null,
 status text not null default 'candidate' check(status in ('candidate','approved','rejected','revoked')),
 support_events integer not null default 0 check(support_events >= 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(normalized_variant,official_broker_key),
 check(length(trim(normalized_variant)) > 0)
);
create table if not exists roleta_ocr.dictionary_revisions (
 id bigint generated always as identity primary key,
 dictionary_id uuid not null references roleta_ocr.dictionary(id) on delete restrict,
 action text not null check(action in ('create','approve','reject','revoke','correct','reopen')),
 previous_state jsonb,
 new_state jsonb not null,
 reason text not null,
 actor text not null,
 created_at timestamptz not null default now()
);
create index if not exists roleta_ocr_evidence_jobs on roleta_ocr.name_evidence(job_id,decision);
create index if not exists roleta_ocr_dictionary_variant on roleta_ocr.dictionary(normalized_variant,status);
alter table roleta_ocr.learning_jobs enable row level security;
alter table roleta_ocr.readings enable row level security;
alter table roleta_ocr.name_evidence enable row level security;
alter table roleta_ocr.dictionary enable row level security;
alter table roleta_ocr.dictionary_revisions enable row level security;
revoke all on all tables in schema roleta_ocr from public,anon,authenticated;
revoke all on all sequences in schema roleta_ocr from public,anon,authenticated;
grant usage on schema roleta_ocr to service_role;
grant select,insert,update on all tables in schema roleta_ocr to service_role;
grant usage,select on all sequences in schema roleta_ocr to service_role;
comment on schema roleta_ocr is 'Shadow OCR learning, private; backend mediation and review required; do not expose in PostgREST';
