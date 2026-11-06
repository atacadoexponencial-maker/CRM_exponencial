-- Auditoria de segurança run-2, pista 7 (06/11/2026): de onde veio o contato.
--
-- O pedido da loja pública cria o contato com o telefone que quem pede digitou, sem
-- conferência. Com `origem = 'loja'`, nenhuma automação manda mensagem a esse contato
-- enquanto ele não escrever para a empresa (`src/lib/automacoes/envio.ts`). A trava é
-- do contato, e não do evento: um pedido dispara mais de um evento (card movido,
-- classificação), e todos precisam respeitá-la.
--
-- Nulo nos contatos de antes e nos que nascem por outro caminho (Novo contato,
-- mensagem recebida), que seguem como hoje.
--
-- Aditiva. Volta atrás: alter table public.contacts drop column origem;

alter table public.contacts
  add column if not exists origem text
  constraint contacts_origem_valida check (origem in ('loja'));
