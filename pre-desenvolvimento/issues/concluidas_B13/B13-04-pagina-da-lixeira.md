# B13-04: Lixeira — ver, restaurar e apagar de vez

**Tipo:** Implementação
**Página:** Lixeira (`/contatos/lixeira`), Contatos (link e perfil)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-lixeira-contatos.md`

## Descrição

Implementar a página da Lixeira do protótipo com dados reais: cada usuário vê o que
veria fora dela (atendente: os dele), com quem excluiu, quando e "apaga em N dias".
Restaurar devolve contato, cards (mesmos funis e etapas), conversas, mensagens e
lembretes pendentes. (Não existe conflito de telefone: o banco não deixa dois contatos
com o mesmo telefone na empresa.) Apagar de vez, com confirmação, remove para sempre contato, cards,
histórico, notas, conversas, mensagens e os arquivos de mídia. Link "Lixeira (N)" na
lista de contatos; perfil de contato na lixeira mostra o aviso com "Restaurar"; perfil
de contato apagado de vez mostra "Contato não encontrado".

Depende de B13-03 (restaurar volta a contar no dashboard, agenda etc.).

## Pronto quando

No CRM publicado, a Marcelle abre a Lixeira, restaura "Teste Cliente" e ele volta ao
funil e a Contatos; exclui de novo e usa "Apagar de vez", e ele some do banco junto com
cards e conversas; e um atendente só vê na lixeira os contatos que eram dele.

## Cenários

### Happy Path
1. Lista de contatos mostra o link "Lixeira (N)" no topo (N = itens que o usuário veria).
2. `/contatos/lixeira` lista os contatos na lixeira com o `ListaLixeira` da B13-01: nome,
   telefone, funis dos cards que foram junto, quem excluiu, quando (horário de Brasília)
   e "apaga em N dias" (30 − dias desde `excluido_em`, nunca negativo).
3. **Restaurar:** `excluido_em` e `excluido_por` voltam a null. Pelas regras de leitura
   da B13-02/03, cards (mesmos funis e etapas), conversas, mensagens e lembretes pendentes
   reaparecem sozinhos. Sequências canceladas continuam canceladas. O item sai da lista.
4. **Apagar de vez** (depois da confirmação do `ListaLixeira`): apaga os arquivos de mídia
   das mensagens do contato no bucket `chat-attachments` e depois, numa transação só, as
   mensagens, conversas, cards (histórico, notas e etiquetas vão em cascata), lembretes,
   execuções de sequência, tags, compras e o contato. Destinatários de campanha ficam com
   `contact_id` nulo (já é o comportamento da chave), preservando o relatório.
5. **Perfil de contato na lixeira** aberto pelo endereço: aviso "Este contato está na
   lixeira" (quem excluiu, quando, em quantos dias some) com "Restaurar" e "Ir para a
   lixeira". Contato apagado de vez: "Contato não encontrado" (como hoje).
6. Remover a rota temporária `/contatos/lixeira/prototipo`.

### Edge Cases
- **Quem vê:** Admin e Gerente, todos os contatos na lixeira da empresa. Atendente, só os
  que eram dele: tem card em que ele é o responsável ou conversa atribuída a ele — a mesma
  regra da exclusão. Como as regras de leitura escondem esses cards e conversas, a conta é
  feita no servidor com o cliente de serviço, depois de saber o papel pela sessão.
- Restaurar e apagar de vez só agem em contato que **está** na lixeira e que o usuário
  poderia ver; senão, "Você não pode alterar este contato."
- Dois usuários: um restaura enquanto o outro apaga — quem chegar depois recebe "Este
  contato não está mais na lixeira." e a lista recarrega.
- "apaga hoje" quando passaram 30 dias ou mais (a limpeza automática é da B13-06).
- Mídia sem endereço reconhecível (texto, ou URL de outro lugar): ignorada; a falha ao
  apagar um arquivo não impede apagar os dados (arquivo órfão é aceitável; dado não).
- Arquivos de campanha (`<empresa>/campanhas/...`) não são do contato e não são tocados.
- Não existe conflito de telefone ao restaurar (telefone é único por empresa).

### Cenário de Erro
- Falha ao restaurar: "Não foi possível restaurar. Tente de novo."
- Falha ao apagar de vez: "Não foi possível apagar. Tente de novo." — a transação garante
  que ou some tudo, ou nada.

## Banco de Dados

Migration `supabase/migrations/20261002000006_apagar_contato_de_vez.sql`:
- Função `public.apagar_contato_de_vez(p_contact_id uuid) returns void` (security definer,
  `search_path = public`), só executável pelo papel de serviço (`revoke ... from public,
  anon, authenticated`). Apaga, nesta ordem, só se o contato estiver na lixeira: mensagens
  das conversas do contato, conversas, cards, lembretes, execuções de sequência, contato
  (tags, compras e o resto em cascata). Reaproveitada pela limpeza automática (B13-06).

## Arquivos

- **Criar:** `supabase/migrations/20261002000006_apagar_contato_de_vez.sql`
- **Criar:** `src/app/(auth)/contatos/lixeira/page.tsx` — página (servidor): lê
  `listarLixeira()` e entrega ao cliente.
- **Criar:** `src/app/(auth)/contatos/lixeira/lixeira-client.tsx` — liga o `ListaLixeira` às
  ações (restaurar, apagar de vez), mostra erro e recarrega.
- **Modificar:** `src/app/(auth)/contatos/lixeira/actions.ts` — `listarLixeira`,
  `contarLixeira`, `estadoNaLixeira(contactId)`, `restaurarContato`, `apagarContatoDeVez`
  (arquivos + `rpc("apagar_contato_de_vez")`), e a regra "quem vê" compartilhada.
- **Modificar:** `src/app/(auth)/contatos/page.tsx` — passa `contarLixeira()` à lista.
- **Modificar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` — link "Lixeira (N)".
- **Modificar:** `src/app/(auth)/contatos/[id]/page.tsx` — quando o contato não vem, consulta
  `estadoNaLixeira` e passa ao perfil.
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — aviso "Este
  contato está na lixeira" com "Restaurar" e "Ir para a lixeira".
- **Remover:** `src/app/(auth)/contatos/lixeira/prototipo/page.tsx` e `dados-exemplo.ts`.
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado (função nova `apagar_contato_de_vez`).

Reaproveita: `ListaLixeira` e `ItemLixeira` (B13-01); `formatarDataCurta` e
`formatarHoraDoDia` de `src/lib/datas.ts`; `createServiceClient`; `sessaoAtual`.

## Dependências Externas

- Supabase Storage `remove()` — https://supabase.com/docs/reference/javascript/storage-from-remove

## Checklist

- [x] Migration da função `apagar_contato_de_vez` aplicada, sem acesso para `anon`/`authenticated`
- [x] Ações de listar, contar, estado, restaurar e apagar de vez, com a regra de quem vê
- [x] Página `/contatos/lixeira` com o `ListaLixeira` e dados reais
- [x] Link "Lixeira (N)" na lista de contatos
- [x] Aviso no perfil de contato na lixeira, com restaurar
- [x] Rota de protótipo removida
- [x] Verificação no banco real (teste temporário): atendente só vê os seus; restaurar
      traz card/conversa/lembrete de volta; apagar de vez remove tudo (inclusive arquivo
      no bucket) e deixa o destinatário de campanha com `contact_id` nulo — 3/3 com teste temporário (não versionado), 02/10
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build` e testes existentes de contatos (28/28)
- [x] Conferência visual (build local + Playwright, empresa temporária apagada): link "Lixeira (3)", lista com funis, autor, data e prazo; restaurar pela lixeira e pelo perfil; aviso no perfil; apagar de vez até "A lixeira está vazia"; protótipo em 404
