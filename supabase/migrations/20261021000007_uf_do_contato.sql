-- B32-02: UF do contato, para a variação por estado dos relatórios (modelo Tailor).
-- Coluna nula: pode ir antes do deploy. O servidor confere a lista; o banco também.

alter table public.contacts
  add column if not exists uf char(2)
    check (uf is null or uf in (
      'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR',
      'PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
    ));

comment on column public.contacts.uf is 'Sigla do estado do contato (27 UFs); nulo = não informada';
