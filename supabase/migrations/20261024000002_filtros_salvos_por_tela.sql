-- B42-04: os filtros salvos passam a pertencer a uma tela. Os de campanha não aparecem
-- na lista de Contatos, e os de Contatos não aparecem na campanha (PER-B42-02 revista).
-- O nome é único dentro de cada tela (SUP-B42-08); a ordem da faixa também é por tela.
-- Os filtros que já existiam ficam em Contatos (padrão). A RLS não muda.

alter table public.filtros_salvos
  add column if not exists tela text not null default 'contatos'
  check (tela in ('contatos', 'campanhas'));

alter table public.filtros_salvos drop constraint if exists filtros_salvos_workspace_id_nome_chave_key;
alter table public.filtros_salvos
  add constraint filtros_salvos_workspace_id_tela_nome_chave_key unique (workspace_id, tela, nome_chave);

drop index if exists public.filtros_salvos_ordem;
create index filtros_salvos_ordem on public.filtros_salvos (workspace_id, tela, posicao);
