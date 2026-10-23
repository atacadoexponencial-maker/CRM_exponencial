# B41-02: Editar e apagar funis e etapas

**Tipo:** Implementação
**Página:** Configurações → Funis
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-funis-personalizados.md`

## Descrição

Renomear funil, reordenar etapas, apagar etapa (vazia ou com cards, escolhendo o destino) e apagar funil com os cards, depois de confirmar. Depende da B41-01.

## Pronto quando

Na tela de funis dá para mudar a ordem das etapas, apagar etapa levando os cards para outra e apagar um funil inteiro, e o quadro reflete cada mudança.

## Critérios de aceite

- **CA-B41-07** (automática) — Mudar a ordem das etapas muda a ordem das colunas. Dado um funil com as etapas A, B e C, quando o Gerente sobe a etapa C para o topo, então o quadro mostra as colunas na ordem C, A, B, e os cards continuam nas etapas em que estavam
- **CA-B41-09** (automática) — Apagar etapa com cards pede o destino. Dado uma etapa com 4 cards, num funil que tem outras etapas, quando o Admin apaga a etapa e escolhe a etapa de destino, então os 4 cards passam para a etapa de destino, cada um com a mudança registrada no histórico do card, e a etapa some do funil. Se ele desiste na confirmação, nada muda.
- **CA-B41-10** (automática) — Apagar etapa vazia não pede destino. Dado uma etapa sem cards, quando o Admin apaga a etapa, então ela some do funil sem nenhuma pergunta além da confirmação
- **CA-B41-12** (automática) — Apagar funil leva os cards junto, depois de confirmar. Dado um funil com 7 cards, quando o Admin pede para apagar, então a confirmação diz que 7 cards vão sair. Confirmado, o funil some da lista e do Pipeline, e os 7 cards saem com ele. Os contatos continuam existindo, e os cards que eles têm em outros funis ficam como estavam.

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B41-07 | Ao apagar etapa com cards, o que acontece? | respondida | Marcelle, 23/10/2026: pede a etapa de destino |
| PER-B41-08 | Ao apagar funil, o que acontece? | respondida | Marcelle, 23/10/2026: confirma com o número de cards, e os cards saem junto; a trava por automação foi trocada pelo aviso e pelo desligamento (ver SUP-B41-06) |

## Cenários

### Happy Path
1. No editor do funil (Configurações → Funis → Editar), cada etapa tem os botões de subir e descer. O servidor troca a ordem com a etapa vizinha, e o quadro passa a mostrar as colunas na ordem nova.
2. Cada etapa também tem o botão "Apagar":
   - Etapa sem cards: a tela pede só a confirmação.
   - Etapa com cards: a tela diz quantos são e pede a etapa de destino, dentre as outras etapas do mesmo funil.
   Confirmado, o banco move os cards para o destino, grava uma linha no histórico de cada card e apaga a etapa, tudo de uma vez (função `apagar_etapa`).
3. Na lista de funis, cada funil da empresa tem "Apagar". A confirmação diz quantos cards saem junto. Confirmado, o banco apaga os cards desse funil, depois as etapas e o funil (função `apagar_funil`). Os contatos e os cards deles em outros funis ficam.

### Edge Cases
- Não há como apagar a única etapa do funil: o botão fica desligado e o servidor recusa.
- Subir a primeira etapa ou descer a última não faz nada.
- O destino precisa ser outra etapa do mesmo funil; qualquer outra coisa é recusada.
- Cards movidos ao apagar uma etapa não disparam automações: é uma mudança de estrutura, não um movimento de venda. A relação com automações é da B41-04.
- Desistir na confirmação não chama o servidor.
- A lista de funis mostra quantos cards há em cada etapa, para a confirmação já saber se precisa pedir o destino.

### Cenário de Erro
- Atendente: as ações recusam com "Sem permissão", e as funções do banco recusam pela RLS.
- Etapa ou funil de outra empresa: "não encontrado".
- Falha no banco no meio do caminho: nada muda, porque a função faz tudo de uma vez.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B41-07 | automática | `src/test/funis-editar-apagar.integration.test.ts` | Subir a etapa C ao topo deixa a ordem C, A, B nos funis da empresa (as colunas do quadro), e os cards continuam nas etapas em que estavam |
| CA-B41-09 | automática | `src/test/funis-editar-apagar.integration.test.ts` | Os 4 cards vão para o destino, cada um com uma linha no histórico, e a etapa some; na tela, desistir não chama o servidor (`src/test/funis-editar-apagar-tela.test.tsx`) |
| CA-B41-10 | automática | `src/test/funis-editar-apagar.integration.test.ts` | A etapa vazia some sem destino; a única etapa do funil não pode ser apagada |
| CA-B41-12 | automática | `src/test/funis-editar-apagar.integration.test.ts` | A tela avisa "7 cards"; confirmado, o funil, as etapas e os 7 cards saem, e os contatos e os cards deles em outros funis ficam |

## Banco de Dados

Migration nova: `supabase/migrations/20261023000002_editar_e_apagar_funis.sql`.

- `apagar_etapa(p_etapa uuid, p_destino uuid)`, `security invoker`:
  - recusa a última etapa do funil;
  - com cards, exige um destino do mesmo funil;
  - move os cards e grava o histórico de cada um (`alterado_por = auth.uid()`);
  - apaga a etapa.
- `apagar_funil(p_funil uuid) returns int`, `security invoker`: apaga os cards do funil (pela regra de apagar da B41-01) e o funil (as etapas vão junto, em cascata). Devolve quantos cards saíram.
- `grant execute` para `authenticated` nas duas.

## Arquivos

- **Criar:** `supabase/migrations/20261023000002_editar_e_apagar_funis.sql` — funções `apagar_etapa` e `apagar_funil`.
- **Modificar:** `src/app/(auth)/configuracoes/funis/actions.ts` — `moverEtapa`, `apagarEtapa` e `apagarFunil`; cards por etapa na lista.
- **Modificar:** `src/app/(auth)/configuracoes/funis/funis-client.tsx` — subir e descer, apagar etapa com destino e apagar funil com confirmação.
- **Modificar:** `src/integrations/supabase/types.ts` — gerado de novo.
- **Criar:** `src/test/funis-editar-apagar.integration.test.ts` — testes no banco de verdade.
- **Criar:** `src/test/funis-editar-apagar-tela.test.tsx` — confirmações na tela.

## Checklist

- [x] Migration com `apagar_etapa` e `apagar_funil`, aplicada, e tipos gerados de novo
- [x] Ações `moverEtapa`, `apagarEtapa`, `apagarFunil` e cards por etapa
- [x] Tela: subir e descer, apagar etapa (com destino) e apagar funil
- [x] Testes da tabela Prova
- [x] `npx tsc --noEmit`, lint e testes passando
