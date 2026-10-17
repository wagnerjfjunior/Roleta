-- Executar somente em banco Neon separado; NUNCA no Supabase do Roleta.
-- A role de runtime deve acessar somente estas tabelas, sem DDL nem acesso a schemas existentes.
create table if not exists public.secure_draw_sessions (
 id uuid primary key,
 request_id uuid not null unique,
 mode text not null check (mode in ('count','range')),
 first_number integer not null check (first_number between 1 and 999999),
 last_number integer not null check (last_number between 1 and 999999),
 total integer not null check (total between 1 and 200),
 operator_id text not null,
 created_at timestamptz not null default now(),
 finished_at timestamptz,
 last_hash text not null check (last_hash ~ '^[a-f0-9]{64}$'),
 start_receipt jsonb not null,
 constraint secure_draw_bounds check (first_number<=last_number and total=last_number-first_number+1)
);
create table if not exists public.secure_draw_events (
 id bigint generated always as identity primary key,
 session_id uuid not null references public.secure_draw_sessions(id) on delete restrict,
 request_id uuid not null,
 position integer not null check (position between 1 and 200),
 number integer not null check (number between 1 and 999999),
 occurred_at timestamptz not null default now(),
 prev_hash text not null check (prev_hash ~ '^[a-f0-9]{64}$'),
 event_hash text not null check (event_hash ~ '^[a-f0-9]{64}$'),
 receipt jsonb not null,
 unique(session_id,request_id),
 unique(session_id,position),
 unique(session_id,number)
);
create index if not exists secure_draw_events_session_idx on public.secure_draw_events(session_id,position);
-- Nenhuma atualização ou exclusão de resultados é permitida à role da API.
-- Provisione uma role específica secure_draw_runtime e conceda apenas SELECT/INSERT,
-- mais UPDATE restrito aos campos de progresso da tabela de sessões.
-- O dono/admin do banco ainda pode alterar/remover registros: mantenha as assinaturas externas.
