# B43-03: Gatilho "Entrou no perfil RFV" com conferência de madrugada

**Tipo:** Implementação
**Página:** Configurações → Automações (gatilho novo) e conferência diária
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacao-por-perfil-rfv.md`

## Descrição

O sistema confere sozinho, às 3h, o perfil de cada contato e anota quem mudou; o editor ganha o gatilho "Entrou no perfil RFV" (destino, vindo de, horário com padrão 9h), e cada automação roda no horário dela para as mudanças anotadas que combinam, uma vez por mudança.

## Pronto quando

Uma automação "Entrou em Em Risco, vindo de Campeão, às 10h → adicionar tag" põe a tag, às 10h, nos contatos que a conferência da madrugada anotou caindo de Campeão para Em Risco, e só neles.

## Critérios de aceite

- **CA-B43-08** (automática) — A conferência anota quem mudou de perfil. Dado uma empresa cuja conferência de ontem guardou a Ana como Campeão, e a Ana completou hoje o tempo sem comprar que a leva para Em Risco, quando a conferência da madrugada roda, então fica anotada a mudança da Ana de Campeão para Em Risco, com o dia, e quem não mudou não ganha anotação.
- **CA-B43-09** (automática) — Primeira compra conta como entrada no perfil. Dado um contato guardado como "Sem compras" na conferência de ontem, que fez a primeira compra, quando a conferência da madrugada roda, então fica anotada a mudança de "Sem compras" para o perfil novo dele.
- **CA-B43-10** (automática) — A primeira conferência da empresa não anota mudança. Dado uma empresa que nunca passou pela conferência, quando a conferência roda pela primeira vez, então o perfil de cada contato fica guardado e nenhuma mudança é anotada.
- **CA-B43-11** (automática) — Contato na lixeira fica fora da conferência. Dado um contato na lixeira que, pelas compras, mudaria de perfil, quando a conferência roda, então nenhuma mudança é anotada para ele.
- **CA-B43-12** (automática) — Cada empresa só vê as próprias mudanças. Dado duas empresas com contatos que mudaram de perfil, quando a conferência roda, então as mudanças de uma empresa não aparecem nem disparam automação na outra.
- **CA-B43-13** (automática) — Montar o gatilho "Entrou no perfil RFV". Dado o editor de uma automação nova, quando a pessoa escolhe o gatilho "Entrou no perfil RFV", marca Em Risco como destino e Campeão em "Vindo de", deixa o horário como veio e salva, então o horário já vinha em 9h, e a automação salva guarda o destino Em Risco, a origem Campeão e o horário 9h, que aparecem iguais ao abrir de novo.
- **CA-B43-14** (automática) — Gatilho sem perfil de destino não salva. Dado o gatilho "Entrou no perfil RFV" sem nenhum perfil de destino marcado, quando a pessoa tenta salvar (pela tela ou chamando o servidor direto), então nada é gravado e aparece o aviso "Escolha ao menos um perfil de destino.".
- **CA-B43-16** (automática) — No horário escolhido, a automação roda para quem entrou no perfil. Dado uma automação ativa "Entrou no perfil Em Risco" às 10h, que adiciona a tag "reativar", e a conferência de hoje anotou a Ana e o Bruno entrando em Em Risco, quando chegam as 10h, então a Ana e o Bruno ficam com a tag "reativar"; antes das 10h, nenhum dos dois tinha a tag.
- **CA-B43-17** (automática) — "Vindo de" filtra a origem. Dado uma automação "Entrou em Em Risco, vindo de Campeão" e mudanças anotadas hoje: Ana de Campeão para Em Risco e Carla de Precisa de Atenção para Em Risco, quando chega o horário da automação, então a automação roda para a Ana e não roda para a Carla.
- **CA-B43-18** (automática) — Mudança por compra espera o horário do dia seguinte. Dado uma automação "Entrou em Clientes Recentes" às 9h e um contato sem compras que ganha a primeira compra às 16h, quando passam as 16h e o resto do dia, então a automação não roda no mesmo dia e roda para ele às 9h do dia seguinte, depois da conferência da madrugada.
- **CA-B43-20** (automática) — A mesma mudança não dispara duas vezes. Dado uma automação que já rodou para a Ana pela mudança anotada hoje, quando o disparo das automações roda de novo no mesmo dia, então a automação não roda outra vez para a Ana pela mesma mudança.
- **CA-B43-24** (manual) — Automação de perfil funcionando na empresa de teste. Dado a empresa de teste, com uma automação "Entrou no perfil…" que adiciona uma tag, num horário escolhido pela Marcelle, quando a Marcelle confere, depois do horário, um contato que a conferência anotou entrando no perfil, então o contato tem a tag, e o histórico de automações mostra a execução com o perfil de origem e o de destino.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B43-01 | A conferência roda às 3h de Brasília, e o horário de disparo é uma hora cheia, de 0h a 23h. Escolher 0h, 1h ou 2h quer dizer a próxima vez que der esse horário depois da conferência (a madrugada seguinte). | confirmada | Marcelle, 24/10/2026 (aprovação da spec). |
| SUP-B43-02 | O gatilho novo nasce com a repetição "sempre": cada mudança anotada dispara, mesmo que o contato já tenha entrado nesse perfil antes. A pessoa pode trocar a repetição, como nos outros gatilhos. | confirmada | Marcelle, 24/10/2026 (aprovação da spec). |
| SUP-B43-05 | "Vindo de" e a condição "Perfil RFV" oferecem também a opção "Sem compras". O "Vindo de" não deixa marcar um perfil que também está no destino. | confirmada | Marcelle, 24/10/2026 (aprovação da spec). |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B43-01 | Como configura o gatilho? | respondida | "Entrou no perfil": um ou mais perfis de destino e, opcional, os perfis de origem. Marcelle, 24/10/2026. |
| PER-B43-03 | Quando e em que horário dispara? | respondida | O sistema confere sozinho de madrugada, e cada automação tem o próprio horário de disparo, escolhido no gatilho, com padrão 9h. A mudança causada por compra também espera o horário (dia seguinte). Marcelle, 24/10/2026. |
| PER-B43-04 | Ganhar o primeiro perfil (primeira compra) dispara o gatilho? | respondida | Dispara. Marcelle, 24/10/2026. |
