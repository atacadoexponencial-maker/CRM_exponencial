# B41-06: Funis novos no Dashboard e no filtro de contatos

**Tipo:** Implementação
**Página:** Dashboard e Contatos (filtro)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-funis-personalizados.md`

## Descrição

O gráfico de funil do Dashboard ganha a escolha de funil (abre em Entrada), e o filtro de contatos ganha um campo por funil novo, com as comparações de etapa. Depende da B41-01.

## Pronto quando

No Dashboard dá para ver os cards por etapa de um funil novo, e na lista de contatos dá para filtrar quem está em cada etapa dele.

## Critérios de aceite

- **CA-B41-37** (automática) — Gráfico de funil escolhe o funil. Dado o Dashboard de uma empresa com o funil "Feira de Março", quando a pessoa abre o Dashboard e depois escolhe "Feira de Março" no gráfico de funil, então o gráfico abre em Entrada, com os mesmos números de hoje. Escolhido "Feira de Março", ele mostra quantos cards há em cada etapa desse funil, na ordem dele. O filtro de atendente continua valendo, e o Atendente vê só os próprios cards.
- **CA-B41-38** (automática) — As outras métricas do Dashboard não mudam. Dado uma empresa com cards em funis novos, quando o Dashboard calcula conversão, leads ativos, recompras, em risco, inativos e perdidos, então os números são os mesmos que seriam sem os funis novos (só Entrada e Recompra contam)
- **CA-B41-39** (automática) — Filtro pela etapa do funil novo. Dado contatos em várias etapas de "Feira de Março" e contatos fora dele, quando alguém filtra "Feira de Março" com as comparações "na etapa Confirmou", "fora da etapa Confirmou", "está no funil" e "não está no funil", então cada filtro traz exatamente os contatos que batem, e a contagem bate com a lista. O campo aparece com o nome atual do funil e as etapas atuais dele.
- **CA-B41-40** (automática) — Filtro salvo com funil ou etapa apagada avisa. Dado um filtro salvo que usa uma etapa, ou um funil, que depois foi apagado, quando alguém abre esse filtro, então a condição aparece marcada como "valor que não existe mais", do mesmo jeito que já acontece com etiqueta apagada, e o filtro não quebra a lista

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B41-05 | Os painéis incluem os funis novos, e como? | respondida | Marcelle, 23/10/2026: aprovou o desenho (seletor no gráfico do Dashboard, abas no Pipeline, filtro, automações e alertas; relatórios de compras sem mudança) |
