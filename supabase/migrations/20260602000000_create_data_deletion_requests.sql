create table data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  facebook_user_id text not null,
  confirmation_code text not null unique,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table data_deletion_requests enable row level security;
