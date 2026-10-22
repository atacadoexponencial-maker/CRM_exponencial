# B36-04: Dashboard no estilo Caderno com blocos novos

**Tipo:** Implementação
**Página:** /dashboard e /dashboard/performance
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-tema-claro-caderno.md`

## Descrição

Reorganizar o Dashboard como no quadro: faixa de números, funil de Entrada em barras, "Para hoje" e "Esperando resposta" em cima e os gráficos de hoje embaixo; a performance segue a mesma linguagem.

## Pronto quando

O Dashboard abre com a faixa de números, os três blocos novos funcionando (inclusive marcar tarefa como feita e abrir conversa) e os gráficos de hoje embaixo.

## Critérios de aceite

- **CA-B36-12** (automática) — Números nas fontes e cores certas. Dado a faixa de números do Dashboard com um número que subiu e um que caiu, quando ela aparece, então os valores estão em IBM Plex Mono, o texto em IBM Plex Sans, a variação que subiu em verde (#17694F no claro) e a que caiu em vermelho (#A3361F no claro).
- **CA-B36-15** (automática) — Faixa de números com os mesmos valores de hoje. Dado uma empresa com vendas, leads e recompras no período, quando o Dashboard abre, então a faixa mostra os mesmos números que o Dashboard mostra hoje para o mesmo período e filtro.
- **CA-B36-16** (automática) — Funil de Entrada em barras conta os cards por etapa. Dado um funil de Entrada com 5 cards na primeira etapa, 3 na segunda e 0 na terceira, quando o Dashboard abre, então o bloco mostra todas as etapas do funil, na ordem, com 5, 3 e 0, e a barra de cada uma proporcional à maior.
- **CA-B36-17** (automática) — "Para hoje" mostra o dia e os atrasados. Dado um usuário com 2 tarefas atrasadas, 2 para hoje e 1 para amanhã na Agenda, quando o Dashboard abre, então o bloco mostra as 4 de ontem e de hoje (as atrasadas primeiro, em vermelho, com "2 atrasadas" no título) e não mostra a de amanhã.
- **CA-B36-18** (automática) — Marcar como feita pelo "Para hoje". Dado uma tarefa no bloco "Para hoje", quando o usuário a marca como feita, então ela sai do bloco e aparece como feita na Agenda, igual a marcar pela Agenda.
- **CA-B36-19** (automática) — "Esperando resposta" lista quem está sem resposta. Dado três conversas: uma em que o cliente mandou a última mensagem há 40 minutos, uma há 5 minutos e uma em que o vendedor respondeu por último, quando o Dashboard abre, então o bloco mostra as duas primeiras, a de 40 minutos antes, com o tempo de espera, e não mostra a respondida; clicar numa delas abre a conversa no Chat.
- **CA-B36-20** (automática) — O Atendente vê só o que é dele nos blocos novos. Dado um Atendente e cards, tarefas e conversas dele e de outro atendente, quando ele abre o Dashboard, então o funil, o "Para hoje" e o "Esperando resposta" mostram só os dele.
- **CA-B36-21** (automática) — Gráficos de hoje continuam no Dashboard. Dado a empresa de teste, quando o Dashboard abre, então todos os gráficos que o Dashboard mostra hoje continuam lá, abaixo dos blocos novos.
- **CA-B36-22** (manual) — Dashboard aprovado visualmente. Dado o preview com a empresa de teste, quando a Marcelle abre o Dashboard e a tela de performance, nos dois temas, no computador e no celular, então ela aprova que seguem o quadro (linha A, cor Grafite).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B36-02 | "Para hoje" usa a mesma fonte da Agenda do usuário (lembretes de sequência e follow-ups do dia e os atrasados); Admin e Gerente veem os próprios, não os da equipe | confirmada | Marcelle, 21/10/2026 |
| SUP-B36-03 | "Esperando resposta" considera só conversas abertas em que a última mensagem é do cliente; Admin e Gerente veem as da empresa, o Atendente só as dele; mostra no máximo 5, com link para o Chat | confirmada | Marcelle, 21/10/2026 |
| SUP-B36-04 | O funil em barras do Dashboard mostra o funil de Entrada, e o filtro de atendente do Dashboard vale para ele | confirmada | Marcelle, 21/10/2026 |
| SUP-B36-10 | No funil de Entrada em barras, a etapa em destaque é Ganho (a última etapa de sucesso), e não Perdido, que é a última da lista | confirmada | Marcelle, 22/10/2026 |
| SUP-B36-11 | A faixa do topo do Dashboard mostra faturado (com o número de compras), ticket médio, novos leads e taxa de recompra, com a variação sobre o período anterior de mesmo tamanho; os outros números de hoje ficam nas seções de baixo | confirmada | Marcelle, 22/10/2026 |
| SUP-B36-07 | No celular, a organização nova se adapta à tela pequena (colunas viram uma embaixo da outra, o Chat mostra uma coluna por vez, como hoje) | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B36-05 | O Dashboard troca os gráficos de hoje pelos blocos do quadro? | respondida | Junta os dois: blocos novos em cima, gráficos de hoje embaixo (Marcelle, 21/10/2026) |

## Cenários

### Happy Path
1. O Dashboard abre com o dia e a saudação ("Quarta, 21 de outubro" / "Boa noite, Ana"), os filtros de período e de atendente e o link da performance.
2. Logo abaixo, a faixa de números: faturado (com o número de compras), ticket médio, novos leads e taxa de recompra, cada um com a variação sobre o período anterior de mesmo tamanho (verde se subiu, vermelho se caiu).
3. Funil de Entrada em barras (todas as etapas, na ordem, proporcionais à maior; Ganho em destaque) ao lado do "Para hoje" (atrasadas primeiro, em vermelho, e as do dia; marcar como feita ali mesmo).
4. "Esperando resposta": até 5 conversas em que o cliente falou por último, a mais antiga primeiro, com o tempo de espera; clicar abre a conversa no Chat.
5. Embaixo, as seções de antes (Entrada de Leads, Conversão, Recompra, Receita) em faixas de números, com os gráficos de antes.

### Edge Cases
- Trocar período ou atendente atualiza a faixa, o funil e as seções; "Para hoje" e "Esperando resposta" são sempre de agora.
- Atendente: o servidor força o filtro dele; o "Esperando resposta" usa a mesma permissão do Chat (só as conversas dele).
- Período anterior sem dado (zero): a variação não aparece.
- Nota interna e mensagem apagada não contam como última mensagem.
- Nada para hoje / ninguém esperando: o bloco diz isso, sem lista vazia.

### Cenário de Erro
- Falha ao marcar a tarefa: ela volta para a lista e aparece "Não foi possível marcar como feito".
- Falha ao trocar o filtro: "Não foi possível carregar as métricas. Tente novamente."

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B36-12 | automática | `src/test/dashboard-caderno.test.tsx` | valores em fonte de número (IBM Plex Mono), texto em IBM Plex Sans, variação que sobe em verde (#17694F) e que cai em vermelho (#A3361F) |
| CA-B36-15 | automática | `src/test/dashboard-caderno.test.tsx` | todos os números que o Dashboard já mostrava aparecem, com os mesmos valores |
| CA-B36-16 | automática | `src/test/dashboard-blocos.integration.test.ts` | 5, 3 e 0 cards nas três primeiras etapas, todas as etapas na ordem |
| CA-B36-17 | automática | `src/test/dashboard-blocos.integration.test.ts` | as 2 atrasadas primeiro e as 2 de hoje; a de amanhã fica de fora |
| CA-B36-18 | automática | `src/test/dashboard-blocos.integration.test.ts` | a tarefa marcada sai do bloco e aparece como feita na Agenda |
| CA-B36-19 | automática | `src/test/dashboard-blocos.integration.test.ts` | as conversas sem resposta, a mais antiga primeiro, sem a respondida |
| CA-B36-20 | automática | `src/test/dashboard-blocos.integration.test.ts` | o Atendente vê só os cards, as tarefas e as conversas dele |
| CA-B36-21 | automática | `src/test/dashboard-caderno.test.tsx` | os gráficos de antes continuam, abaixo dos blocos novos |
| CA-B36-22 | manual | roteiro abaixo | o Dashboard e a performance seguem o quadro, nos dois temas, no computador e no celular |

### Roteiro manual — CA-B36-22
1. Abra o preview e entre com a empresa de teste.
2. No Dashboard, confira: dia e saudação, faixa de números com a variação, funil de Entrada em barras, "Para hoje", "Esperando resposta" e as seções com gráficos embaixo.
3. Troque o período e o atendente: os números mudam.
4. Marque uma tarefa do "Para hoje" e confira que ela sai da lista e aparece feita na Agenda.
5. Clique numa conversa do "Esperando resposta": abre no Chat.
6. Abra "Performance por vendedor" e expanda um vendedor.
7. Repita no tema escuro e no celular.
8. Aprove se seguir o quadro (linha A, cor Grafite).

## Banco de Dados

- Função `conversas_esperando_resposta(p_limite int)` (security invoker): conversas não resolvidas cuja última mensagem (fora nota interna e apagadas) é recebida, a mais antiga primeiro, com contato, trecho, data e funil do card mais recente do contato.

## Arquivos

- **Criar:** `supabase/migrations/20261021000010_conversas_esperando_resposta.sql` — função do bloco "Esperando resposta"
- **Modificar:** `src/integrations/supabase/types.ts` — tipos regerados com a função nova
- **Criar:** `src/lib/painel-dashboard.ts` — período anterior, variações, cards por etapa, "Para hoje", tempo de espera e cabeçalho do dia
- **Modificar:** `src/app/(auth)/dashboard/actions.ts` — `buscarPainelDashboard`, `listarParaHoje` e `listarEsperandoResposta`
- **Modificar:** `src/app/(auth)/dashboard/page.tsx` — carrega os blocos novos e o cabeçalho do dia
- **Modificar:** `src/app/(auth)/dashboard/loading.tsx` — esqueleto no desenho novo
- **Modificar:** `src/app/(auth)/dashboard/components/dashboard-client.tsx` — Dashboard no estilo Caderno
- **Modificar:** `src/app/(auth)/dashboard/components/secoes-metricas.tsx` — seções em faixa de números, sem repetir a faixa do topo
- **Criar:** `src/app/(auth)/dashboard/components/faixa-de-numeros.tsx` — faixa de números com variação
- **Criar:** `src/app/(auth)/dashboard/components/blocos-do-dia.tsx` — funil em barras, "Para hoje" e "Esperando resposta"
- **Modificar:** `src/app/(auth)/dashboard/performance/performance-client.tsx` — tabela no estilo Caderno, números em fonte de número
- **Modificar:** `src/app/(auth)/dashboard/performance/page.tsx` — margens do Caderno
- **Criar:** `src/test/dashboard-caderno.test.tsx` — faixa, números e gráficos
- **Criar:** `src/test/dashboard-blocos.integration.test.ts` — blocos novos e permissões no banco

## Checklist

- [x] Função do banco e tipos
- [x] Cálculos puros dos blocos novos
- [x] Ações do servidor
- [x] Cabeçalho, faixa, funil, "Para hoje", "Esperando resposta"
- [x] Seções de antes em faixa, com os gráficos
- [x] Performance no estilo Caderno
- [x] Testes da tabela Prova
