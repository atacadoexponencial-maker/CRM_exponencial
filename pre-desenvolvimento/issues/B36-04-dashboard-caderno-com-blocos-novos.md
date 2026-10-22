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
| SUP-B36-07 | No celular, a organização nova se adapta à tela pequena (colunas viram uma embaixo da outra, o Chat mostra uma coluna por vez, como hoje) | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B36-05 | O Dashboard troca os gráficos de hoje pelos blocos do quadro? | respondida | Junta os dois: blocos novos em cima, gráficos de hoje embaixo (Marcelle, 21/10/2026) |
