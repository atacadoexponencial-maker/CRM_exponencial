# B41-05: Card parado nos funis novos

**Tipo:** Implementação
**Página:** Configurações → Funis, Pipeline e Central de Alertas
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-funis-personalizados.md`

## Descrição

Cada etapa de funil novo pode ter prazo de parado (1 a 365 dias); o card que passa do prazo fica vermelho no quadro e aparece na Central de Alertas. Depende da B41-01.

## Pronto quando

Com prazo numa etapa, o card esquecido nela aparece como parado no quadro e na Central de Alertas.

## Critérios de aceite

- **CA-B41-35** (automática) — Prazo da etapa é opcional e tem limite. Dado o editor do funil, quando alguém deixa o prazo vazio, coloca 1, coloca 365, ou tenta 0, 366 ou um texto, então vazio fica sem aviso, 1 e 365 são gravados, e 0, 366 e o texto são recusados com aviso
- **CA-B41-22** (automática) — Card parado segue o prazo da etapa. Dado a etapa "Confirmou" com prazo de 3 dias e a etapa "Convidado" sem prazo, quando um card fica 4 dias em cada uma delas, então o card em "Confirmou" aparece como parado (em vermelho, como em Entrada), e o card em "Convidado" nunca fica parado
- **CA-B41-36** (automática) — Central de Alertas lista o card parado do funil novo. Dado um card parado há 5 dias numa etapa de funil novo com prazo de 3 dias, quando o Admin abre a Central de Alertas, então o card aparece como parado, com o nome do funil, da etapa e os dias parado. Um Atendente só vê esse alerta se o card for dele.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B41-04 | O prazo de "parado" de cada etapa é definido no editor do funil, pelo Admin e pelo Gerente, e não na tela de Alertas, que continua com os quatro prazos de Entrada e Recompra e só para o Admin | confirmada | Marcelle, 23/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B41-05 | Os painéis incluem os funis novos, e como? | respondida | Marcelle, 23/10/2026: aprovou o desenho (seletor no gráfico do Dashboard, abas no Pipeline, filtro, automações e alertas; relatórios de compras sem mudança) |
