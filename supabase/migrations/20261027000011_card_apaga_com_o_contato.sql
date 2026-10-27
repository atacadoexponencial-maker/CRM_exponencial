-- B45-01: apagar um contato de vez apaga também os cards dele.
--
-- Com todo contato nascendo com card, a chave sem cascata segurava qualquer
-- exclusão de contato. No sistema, a única exclusão de vez (apagar_contato_de_vez,
-- B13-06) já apaga os cards antes, e continua igual; quem passa a ganhar com a
-- cascata são as limpezas dos testes, que apagam só os contatos.
-- Decisão da Marcelle, 27/10/2026.

alter table public.pipeline_cards
  drop constraint pipeline_cards_contact_id_fkey,
  add constraint pipeline_cards_contact_id_fkey
    foreign key (contact_id) references public.contacts(id) on delete cascade;
