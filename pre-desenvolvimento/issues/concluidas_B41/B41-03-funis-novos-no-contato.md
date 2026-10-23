# B41-03: Funis novos no chat, no perfil e na lixeira

**Tipo:** Implementação
**Página:** Chat (ficha do contato), Contatos (perfil e lixeira)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-funis-personalizados.md`

## Descrição

Os cards dos funis novos aparecem na ficha do chat e no perfil (com link e histórico), saem e voltam com o contato na lixeira, e não mudam a classificação do contato nem os relatórios. Depende da B41-01.

## Pronto quando

Abrindo um contato que está num funil novo, a ficha do chat e o perfil mostram o funil e a etapa; excluir e restaurar o contato leva e traz esse card.

## Critérios de aceite

- **CA-B41-25** (automática) — Chat e perfil mostram os funis novos. Dado um contato com card em Entrada ("Sondagem") e em "Feira de Março" ("Confirmou"), quando alguém abre a ficha dele no chat e o perfil dele, então os dois lugares mostram "Funil de Entrada — Sondagem" e "Feira de Março — Confirmou". No perfil, cada um leva ao quadro do funil.
- **CA-B41-26** (automática) — Histórico do contato cita o funil novo. Dado um contato adicionado a "Feira de Março" e movido de etapa, quando alguém abre o perfil, então o histórico mostra "Card criado no funil Feira de Março" e a mudança de etapa, com os nomes atuais do funil e da etapa
- **CA-B41-27** (automática) — Excluir e restaurar o contato leva e traz os cards dos funis novos. Dado um contato com cards em Entrada e em dois funis novos, quando o Admin exclui o contato e depois o restaura da lixeira, então o aviso de exclusão diz que os 3 cards saem junto; na lixeira, os cards não aparecem em nenhum quadro; restaurado, os 3 voltam às etapas em que estavam
- **CA-B41-28** (automática) — Funil novo não muda a classificação do contato. Dado um contato classificado como "Ativo" pelo card de Recompra, quando ele entra num funil novo, muda de etapa e sai dele, então a classificação continua "Ativo", e os relatórios (RFV, Carteiras, Coorte e Funil de clientes) mostram os mesmos números de antes

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B41-09 | A classificação do contato considera os funis novos? | respondida | Marcelle, 23/10/2026: não, só Entrada e Recompra |

## Cenários

### Happy Path
1. Ficha do contato no chat: a lista de funis mostra Entrada, Recompra e os funis da empresa em que o contato tem card. Cada linha traz o nome do funil e o nome da etapa.
2. Perfil do contato, seção Pipeline: cada card mostra o nome do funil e a etapa, com link para o quadro daquele funil (`/pipeline`, `/pipeline/recompra` ou `/pipeline/funil/<id>`).
3. Histórico do perfil: "Card criado no funil <nome>" (feito na B41-01) e as mudanças de etapa com os nomes das etapas do funil novo.
4. Excluir o contato: o aviso lista o card de cada funil, com o nome dele. Na lixeira, os cards somem de todos os quadros, pela regra de leitura de cards que já existe. Restaurado, eles voltam às mesmas etapas.
5. A classificação do contato e os relatórios não mudam por causa dos funis novos: o código e o banco só olham Entrada e Recompra.

### Edge Cases
- Os nomes dos funis novos e das etapas vêm de uma leitura só por tela (`lerNomesDosFunis`, em `src/lib/funis.ts`), que também passa a servir o painel do card e o histórico do perfil.
- Card de funil já apagado não existe mais, porque saiu junto com o funil (B41-02).
- Atendente: a ficha só mostra os cards que ele enxerga, como hoje.
- Os campos novos (`nome`, `href`) são opcionais. Onde faltam, valem os nomes de Entrada e Recompra de sempre.

### Cenário de Erro
- Se a leitura dos nomes falhar, o card aparece com "funil" ou com o id da etapa, sem quebrar a tela.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B41-25 | automática | `src/test/funis-no-contato.integration.test.ts` | A ficha do chat e o perfil trazem "Funil de Entrada" com "Sondagem" e "Feira de Março" com "Confirmou"; o perfil tem o link do quadro; na tela (`src/test/funis-no-contato-tela.test.tsx`), a ficha e o perfil mostram os dois |
| CA-B41-26 | automática | `src/test/funis-no-contato.integration.test.ts` | O histórico do perfil traz "Card criado no funil Feira de Março" e "Convidado → Confirmou", com os nomes atuais |
| CA-B41-27 | automática | `src/test/funis-no-contato.integration.test.ts` | O resumo da exclusão lista os 3 funis; na lixeira, nenhum quadro mostra os cards; restaurado, os 3 voltam às mesmas etapas; na tela, o aviso lista os 3 cards |
| CA-B41-28 | automática | `src/test/funis-no-contato.integration.test.ts` | O contato "Ativo" pela Recompra continua "ativo" ao entrar no funil novo, mudar de etapa e sair dele |

## Arquivos

- **Modificar:** `src/lib/funis.ts` — `lerNomesDosFunis` (nomes dos funis e das etapas pelos ids).
- **Modificar:** `src/app/(auth)/chat/actions.ts` — a ficha inclui os funis da empresa, com o nome.
- **Modificar:** `src/app/(auth)/chat/components/painel-contato.tsx` — rótulo da linha com o nome do funil.
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — cards do perfil com nome e link; histórico com os nomes das etapas dos funis novos, usando `lerNomesDosFunis`.
- **Modificar:** `src/app/(auth)/contatos/mock-contatos.ts` — `CardPipelineMock` aceita funil novo, nome e link.
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — nome e link de cada funil.
- **Modificar:** `src/app/(auth)/contatos/lixeira/actions.ts` — resumo e lista da lixeira com os funis da empresa e os nomes deles; a revalidação inclui os quadros dos funis novos.
- **Modificar:** `src/app/(auth)/contatos/components/dialogo-excluir-contato.tsx` — nome de qualquer funil no aviso.
- **Modificar:** `src/app/(auth)/contatos/lixeira/components/lista-lixeira.tsx` — nome de qualquer funil na lista.
- **Modificar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` — passa os nomes dos funis ao aviso de exclusão.
- **Modificar:** `src/app/(auth)/pipeline/components/painel-card.tsx` — passa os nomes dos funis ao aviso de exclusão.
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — o histórico do painel usa `lerNomesDosFunis`.
- **Criar:** `src/test/funis-no-contato.integration.test.ts` — testes no banco de verdade.
- **Criar:** `src/test/funis-no-contato-tela.test.tsx` — ficha, perfil e aviso de exclusão na tela.

## Checklist

- [x] `lerNomesDosFunis` em `src/lib/funis.ts`
- [x] Ficha do chat com os funis da empresa
- [x] Perfil com nome, link e histórico dos funis novos
- [x] Aviso de exclusão e lixeira com os funis novos
- [x] Testes da tabela Prova
- [x] `npx tsc --noEmit`, lint e testes passando
