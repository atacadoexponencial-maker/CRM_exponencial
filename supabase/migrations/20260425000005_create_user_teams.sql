create table user_teams (
  user_id uuid not null references profiles(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  primary key (user_id, team_id)
);

alter table user_teams enable row level security;

create policy "Usuários veem membros de times do próprio workspace"
  on user_teams for select
  using (
    exists (
      select 1 from teams t
      join profiles p on p.workspace_id = t.workspace_id
      where t.id = user_teams.team_id
        and p.id = auth.uid()
    )
  );

create policy "Admins gerenciam membros de times do próprio workspace"
  on user_teams for all
  using (
    exists (
      select 1 from teams t
      join profiles p on p.workspace_id = t.workspace_id
      where t.id = user_teams.team_id
        and p.id = auth.uid()
        and p.role = 'admin'
    )
  );
