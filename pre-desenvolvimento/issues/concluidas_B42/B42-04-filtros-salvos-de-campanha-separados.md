# B42-04: Filtros salvos de campanha separados dos de Contatos

**Tipo:** Implementação
**Página:** Campanhas → editor, etapa Destinatários
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-segmentacao-de-campanhas.md`

**Depende de:** B42-03 (filtros salvos na campanha)

## Descrição

Os filtros salvos passam a pertencer a uma tela: os da campanha não aparecem em Contatos, e os de Contatos não aparecem na campanha. Na campanha dá para salvar, atualizar com o filtro montado, renomear, mudar a ordem e apagar, como na lista de Contatos.

## Pronto quando

Um filtro salvo pela campanha aparece só na faixa da campanha; dá para atualizá-lo, renomeá-lo, movê-lo e apagá-lo ali, e a lista de Contatos continua só com os filtros dela.

## Critérios de aceite

- **CA-B42-19** (automática) — Salvar o filtro da campanha como filtro salvo. Dado um Admin ou Gerente com um filtro montado na campanha, quando escolhe "Salvar filtro" e dá o nome "Proposta da feira", então "Proposta da feira" aparece nos filtros salvos de campanha, para a empresa toda, com as mesmas condições, e não aparece nos filtros salvos da lista de Contatos
- **CA-B42-20** (automática) — Nome repetido não salva. Dado o filtro salvo de campanha "Lojistas de Fortaleza", quando alguém tenta salvar pela campanha outro com o nome "lojistas de fortaleza", então a tela avisa que já existe um filtro com esse nome e não salva, como na lista de Contatos. Um filtro de Contatos com o mesmo nome não impede salvar o de campanha
- **CA-B42-32** (automática) — Cada tela só mostra os próprios filtros salvos. Dado o filtro salvo "Clientes da feira" na lista de Contatos e o filtro salvo de campanha "Proposta da feira", quando a pessoa abre a lista de Contatos e depois a etapa Destinatários da campanha, então Contatos mostra só "Clientes da feira" e a campanha mostra só "Proposta da feira", inclusive para quem chama o servidor direto
- **CA-B42-33** (automática) — Atualizar o filtro salvo de campanha. Dado a campanha montada a partir do filtro salvo de campanha "Proposta da feira", quando a pessoa acrescenta uma condição no painel e escolhe "Atualizar filtro salvo", então "Proposta da feira" passa a ter a condição nova para a empresa toda, e a lista de Contatos não muda
- **CA-B42-34** (automática) — Renomear o filtro salvo de campanha. Dado os filtros salvos de campanha "Proposta da feira" e "Lojistas de Fortaleza", quando a pessoa renomeia "Proposta da feira" para "Feira 2026", e depois tenta renomeá-lo para "lojistas de fortaleza", então o primeiro nome novo fica gravado; o segundo é recusado com o aviso de nome repetido
- **CA-B42-35** (automática) — Mudar a ordem dos filtros salvos de campanha. Dado os filtros salvos de campanha "A", "B" e "C", nessa ordem, quando a pessoa move "C" para a esquerda, então a faixa da campanha mostra "A", "C", "B", para a empresa toda, e a ordem dos filtros da lista de Contatos não muda
- **CA-B42-36** (automática) — Apagar o filtro salvo de campanha. Dado o filtro salvo de campanha "Proposta da feira", quando a pessoa escolhe apagar e confirma, então ele some da faixa da campanha, e os filtros da lista de Contatos continuam lá
- **CA-B42-37** (automática) — Atendente não mexe nos filtros salvos de campanha. Dado um Atendente logado, quando ele tenta salvar, atualizar, renomear, mover ou apagar um filtro salvo de campanha chamando o servidor direto, então o servidor recusa e nada muda

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B42-01 | A campanha guarda uma cópia das condições do filtro salvo usado, não um vínculo: mudar ou apagar o filtro salvo depois não muda campanha já montada. | confirmada | Marcelle, 23/10/2026 |
| SUP-B42-08 | O nome do filtro salvo é único dentro de cada tela: a campanha pode ter um filtro com o mesmo nome de um da lista de Contatos. | confirmada | Marcelle, 24/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B42-02 | A campanha usa os filtros salvos da lista de Contatos? | respondida | Sim, carrega e salva (Marcelle, 23/10/2026). **Revisto em 24/10/2026:** não; a campanha tem filtros salvos próprios, separados dos de Contatos, e pode salvar, atualizar, renomear, mover e apagar (Marcelle, 24/10/2026) |

## Cenários

### Happy Path
1. Cada filtro salvo passa a ter a tela a que pertence (`tela`: `contatos` ou `campanhas`). A lista de Contatos continua chamando `listarFiltrosSalvos()` e vê só os de Contatos; a página do editor de campanha chama `listarFiltrosSalvos("campanhas")`.
2. "Salvar filtro", no painel da campanha, chama `salvarFiltro(nome, filtro, "campanhas")`. O filtro entra no fim da faixa da campanha, e o nome só não pode repetir outro filtro de campanha.
3. Com um filtro de campanha marcado, o painel mostra "Atualizar filtro salvo" (`atualizarFiltroSalvo`), como na lista de Contatos.
4. A faixa da campanha passa a ter o menu (⋯) com renomear, mover e apagar (`podeGerir`), as mesmas ações de Contatos. Cada ação devolve a lista da tela do filtro mexido.
5. Apagar um filtro de campanha não limpa o filtro da campanha aberta: ela guarda a cópia (SUP-B42-01).

### Edge Cases
- Os filtros salvos que já existiam ficam em Contatos (`tela` padrão `contatos`). A base é só de teste.
- Mover ou renomear considera só os filtros da mesma tela: a ordem e os nomes da outra tela não mudam.
- O mesmo nome nas duas telas é permitido (SUP-B42-08).

### Cenário de Erro
- Nome repetido na mesma tela: "Já existe um filtro com esse nome." (mensagem de hoje).
- Tela desconhecida vinda de chamada direta: recusada como "Filtro inválido.".
- Atendente: "Só Admin e Gerente mudam os filtros salvos." (mensagem de hoje), e a RLS também barra.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B42-19 | automática | `src/test/campanhas-segmentacao.integration.test.ts` | O Gerente salva "Proposta da feira" pela campanha; o Admin o vê nos filtros de campanha e não nos de Contatos (a tela confere que o painel chama o servidor com a tela "campanhas", em `campanhas-segmentacao-tela.test.tsx`) |
| CA-B42-20 | automática | `src/test/campanhas-segmentacao.integration.test.ts` | "lojistas de fortaleza" é recusado entre os de campanha, e um filtro de Contatos com o mesmo nome é aceito |
| CA-B42-32 | automática | `src/test/campanhas-segmentacao.integration.test.ts` | Pelo servidor, a lista de Contatos traz só "Clientes da feira" e a de campanha só "Proposta da feira" |
| CA-B42-33 | automática | `src/test/campanhas-segmentacao.integration.test.ts` | Atualizar "Proposta da feira" grava a condição nova nos de campanha, e os de Contatos não mudam (a tela confere que "Atualizar filtro salvo" aparece com ele marcado e chama o servidor, em `campanhas-segmentacao-tela.test.tsx`) |
| CA-B42-34 | automática | `src/test/campanhas-segmentacao.integration.test.ts` | Renomear para "Feira 2026" grava; renomear para "lojistas de fortaleza" é recusado |
| CA-B42-35 | automática | `src/test/campanhas-segmentacao.integration.test.ts` | Mover "C" para a esquerda deixa A, C, B nos de campanha, e a ordem dos de Contatos fica igual |
| CA-B42-36 | automática | `src/test/campanhas-segmentacao.integration.test.ts` | Apagar "Proposta da feira" tira ele dos de campanha, e os de Contatos continuam |
| CA-B42-37 | automática | `src/test/campanhas-segmentacao.integration.test.ts` | O Atendente, chamando o servidor direto, é recusado em salvar, atualizar, renomear, mover e apagar, e nada muda no banco |

## Banco de Dados

- Tabela: `filtros_salvos`
  - `tela` (text, não nulo, padrão `'contatos'`, só `contatos` ou `campanhas`): a tela a que o filtro pertence
  - O nome único passa de `(workspace_id, nome_chave)` para `(workspace_id, tela, nome_chave)`; o índice de ordem ganha `tela`.
- Migration `supabase/migrations/20261024000002_filtros_salvos_por_tela.sql`, aplicada com `npx supabase db push --linked`. A RLS não muda.
- `src/integrations/supabase/types.ts` regenerado.

## Arquivos

- **Criar:** `supabase/migrations/20261024000002_filtros_salvos_por_tela.sql` — coluna `tela`, nome único por tela e índice de ordem por tela
- **Modificar:** `src/app/(auth)/contatos/filtros-salvos.ts` — `tela` em listar e salvar (padrão `contatos`), e renomear, mover, atualizar e apagar devolvendo e ordenando só a lista da tela do filtro
- **Modificar:** `src/app/(auth)/campanhas/[id]/page.tsx` — lista os filtros de campanha
- **Modificar:** `src/app/(auth)/campanhas/[id]/editor-campanha-client.tsx` — salvar na tela da campanha, "Atualizar filtro salvo" e o menu da faixa (renomear, mover, apagar)
- **Modificar:** `src/integrations/supabase/types.ts` — tipo gerado com a coluna nova
- **Modificar:** `src/test/campanhas-segmentacao.integration.test.ts` — CA-B42-19, 20 e 32 a 37; os testes da B42-03 passam a usar filtros de campanha
- **Modificar:** `src/test/campanhas-segmentacao-tela.test.tsx` — a tela do CA-B42-19 (tela "campanhas") e do CA-B42-33

> Reuso: `FaixaFiltrosSalvos` com `podeGerir` (menu de renomear, mover e apagar já pronto), `PainelFiltro` com `salvoAtivo` e `onAtualizar`, e as actions de `filtros-salvos.ts`, que só ganham a tela.

## Checklist

- [x] Migration da tela, `db push` e tipos regenerados
- [x] `filtros-salvos.ts` por tela (listar, salvar, atualizar, renomear, mover, apagar)
- [x] Página do editor listando os de campanha
- [x] Editor: salvar na tela da campanha, atualizar, menu da faixa
- [x] Testes de integração e de tela
- [x] Rodar os testes de filtros salvos de Contatos, de campanha e de filtro (L-05) e o `tsc` (L-07)
