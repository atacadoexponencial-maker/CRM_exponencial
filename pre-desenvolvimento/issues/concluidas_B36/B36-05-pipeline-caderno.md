# B36-05: Pipeline no estilo Caderno

**Tipo:** Implementação
**Página:** /pipeline e /pipeline/recompra
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-tema-claro-caderno.md`

## Descrição

Reorganizar os funis de Entrada e Recompra como no quadro: abas sublinhadas, colunas com linhas finas, quantidade e soma no título e cards com há quanto tempo estão parados.

## Pronto quando

Os dois funis seguem o quadro, com soma por coluna e tempo parado nos cards, e tudo o que se fazia antes continua funcionando.

## Critérios de aceite

- **CA-B36-23** (automática) — Coluna mostra quantidade e soma. Dado uma etapa com 3 cards, de clientes que já compraram R$ 100, R$ 250 e nada, quando o pipeline abre, então o título da coluna mostra 3 e R$ 350, e cada card mostra o total já comprado pelo cliente.
- **CA-B36-24** (automática) — Card mostra há quanto tempo está parado. Dado um card que entrou na etapa atual há 4 dias e outro há 2 horas, com o limite de card parado da empresa em 3 dias, quando o pipeline abre, então o primeiro mostra "parado 4 dias" em vermelho e o segundo "há 2 h" em cinza.
- **CA-B36-25** (manual) — Pipeline aprovado visualmente. Dado o preview com a empresa de teste, quando a Marcelle abre os funis de Entrada e Recompra, arrasta um card e abre um card, nos dois temas, no computador e no celular, então ela aprova que segue o quadro e que tudo o que fazia antes continua funcionando.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B36-05 | "Parado há" no card do pipeline conta desde que o card entrou na etapa atual; o limite para ficar vermelho é o de card parado que a empresa já configura nos Alertas (sem limite configurado, não fica vermelho) | confirmada | Marcelle, 21/10/2026 |
| SUP-B36-07 | No celular, a organização nova se adapta à tela pequena (colunas viram uma embaixo da outra, o Chat mostra uma coluna por vez, como hoje) | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B36-08 | O card do funil não tem valor do negócio: o que o card e a coluna mostram? | respondida | O total já comprado pelo cliente (compras registradas); a coluna soma esse total (Marcelle, 22/10/2026) |

## Cenários

### Happy Path
1. O Pipeline abre com o título, as abas Entrada e Recompra (sublinhado na ativa, com a quantidade de cards) e, à direita, a busca, o filtro de atendente e "Novo lead".
2. Cada etapa é uma coluna separada por linhas finas; o título dela tem a quantidade de cards e a soma do que os clientes da coluna já compraram, com um traço na cor da etapa (Ganho em grafite; Perdido em vermelho; as cores da Recompra, da B15).
3. Cada card mostra o nome, a cidade e a UF, o atendente, as etiquetas, o total já comprado pelo cliente e há quanto tempo está na etapa ("há 2 h"); passou do limite dos Alertas, vira "parado 4 dias" em vermelho.
4. Arrastar, abrir o card, abrir a conversa, filtrar por atendente, buscar e criar lead funcionam como antes.

### Edge Cases
- Cliente sem compra: o card mostra "—" e não entra na soma.
- Contato sem cidade: "Sem cidade".
- Etapa sem limite nos Alertas (Ganho, Perdido, Onboarding, Ativos, Inativos RP, Perdidos): nunca fica vermelha.
- A soma da coluna acompanha a busca e o filtro de atendente (soma o que está na tela).

### Cenário de Erro
- Falha ao mover o card: a faixa de aviso mostra o erro, como antes.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B36-23 | automática | `src/test/pipeline-caderno.test.tsx` | o título da coluna mostra 3 e R$ 350, e cada card o total do cliente |
| CA-B36-23 | automática | `src/test/pipeline-caderno.integration.test.ts` | o card vem do servidor com o total já comprado (soma das compras) e a cidade |
| CA-B36-24 | automática | `src/test/pipeline-caderno.test.tsx` | 4 dias com limite de 3 viram "parado 4 dias" em vermelho; 2 horas, "há 2 h" em cinza |
| CA-B36-25 | manual | roteiro abaixo | os funis seguem o quadro e tudo o que se fazia antes continua funcionando |

### Roteiro manual — CA-B36-25
1. Abra o preview e entre com a empresa de teste.
2. No Pipeline, confira as abas, as colunas com quantidade e soma e os cards com cidade, total comprado e tempo parado.
3. Arraste um card de uma etapa para outra; abra um card; abra a conversa pelo ícone do card.
4. Busque um lead e filtre por atendente.
5. Abra a aba Recompra e confira as cores das colunas de risco.
6. Repita no tema escuro e no celular.
7. Aprove se seguir o quadro (linha A, cor Grafite) e nada tiver parado de funcionar.

## Arquivos

- **Criar:** `src/lib/card-parado.ts` — limite de "parado" (o dos Alertas), texto do tempo na etapa e resumo da coluna
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — card com cidade, total já comprado, entrada na etapa e limite de parado
- **Modificar:** `src/app/(auth)/pipeline/mock-pipeline.ts` — campos novos do card
- **Criar:** `src/app/(auth)/pipeline/components/cabecalho-do-pipeline.tsx` — título e abas sublinhadas
- **Modificar:** `src/app/(auth)/pipeline/components/funil-entrada.tsx` — cabeçalho novo e colunas do Caderno
- **Modificar:** `src/app/(auth)/pipeline/components/funil-recompra.tsx` — cabeçalho novo e colunas do Caderno
- **Modificar:** `src/app/(auth)/pipeline/components/coluna-kanban.tsx` — coluna com linhas finas, quantidade e soma
- **Modificar:** `src/app/(auth)/pipeline/components/card-lead.tsx` — card com cidade, total comprado e tempo parado
- **Modificar:** `src/test/tema-cores-fixas.test.ts` — a varredura passa a pegar também bordas de um lado só (`border-l-...`)
- **Criar:** `src/test/pipeline-caderno.test.tsx` — título da coluna e tempo parado
- **Criar:** `src/test/pipeline-caderno.integration.test.ts` — total comprado e cidade vindos do servidor

## Checklist

- [x] Regra do card parado igual à dos Alertas
- [x] Cidade, total comprado e limite no card
- [x] Cabeçalho e abas sublinhadas
- [x] Colunas e cards do Caderno
- [x] Testes da tabela Prova

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B36-25 | Marcelle | 22/10/2026 |
