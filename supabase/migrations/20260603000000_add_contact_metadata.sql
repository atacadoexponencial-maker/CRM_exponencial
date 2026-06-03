alter table contacts
  add column classificacao text not null default 'sem_historico'
    check (classificacao in ('lead', 'ativo', 'em_risco', 'inativo', 'perdido', 'sem_historico')),
  add column tipo text
    check (tipo in ('lojista', 'revendedor', 'empreendedor')),
  add column nicho text,
  add column cidade text,
  add column atendente_id uuid references profiles(id) on delete set null;
