# Spec: Automação pelo perfil RFV e perfil RFV no contato

> série: B43
> estado: aprovada em 24/10/2026

## Visão Geral

O perfil RFV (Campeão, Em Risco, Hibernando etc.) hoje só aparece em Relatórios e no
filtro de Contatos e de Campanhas. Quem atende não vê o perfil do cliente na hora de
conversar, e nada acontece sozinho quando um cliente cai de perfil.

Esta mudança faz duas coisas:

1. **Mostra o perfil RFV do contato** na lista de contatos, no perfil do contato e no
   painel do contato no chat. É sempre o perfil da hora, igual ao de Relatórios.
2. **Dispara automações quando o contato entra num perfil.** O sistema confere sozinho,
   toda madrugada, quem mudou de perfil, e cada automação roda no horário que a pessoa
   escolheu nela. Exemplo: "Entrou em Em Risco, vindo de Campeão ou Clientes Fiéis, às
   10h → manda a mensagem de reativação e cria um lembrete para o atendente ligar."

A automação também ganha a condição "Perfil RFV é…", que pode ser usada com qualquer
gatilho.

É para Admin e Gerente, que montam as automações, e para todos os papéis, que veem o
perfil no contato.

## Páginas / Módulos

### Perfil RFV visível (Contatos e Chat)

**Descrição:** o perfil RFV do contato aparece onde a equipe olha o contato, calculado
pela mesma regra de Relatórios, sobre a base inteira da empresa.

**Componentes:**
- Coluna "Perfil RFV" na lista de contatos: ícone e nome do perfil, na cor do perfil.
- Selo do perfil RFV no perfil do contato.
- Selo do perfil RFV no painel do contato, no chat.

**Comportamentos:**
- Ver o perfil de cada contato na lista.
- Ver o perfil no perfil do contato.
- Ver o perfil no painel do contato, no chat.
- Contato sem nenhuma compra aparece como "Sem compras".
- Depois de registrar uma compra, o perfil mostrado já é o novo, sem esperar a madrugada.

**Critérios de aceite:**

#### CA-B43-01 — A lista de contatos mostra o perfil RFV de cada contato · prova: automática

- **Dado** uma empresa com contatos que compraram e o perfil de cada um em Relatórios → RFV
- **Quando** a pessoa abre Contatos
- **Então** a coluna "Perfil RFV" mostra, para cada contato, o mesmo perfil de Relatórios, com o ícone e o nome dele

#### CA-B43-02 — Contato sem compras aparece como "Sem compras" · prova: automática

- **Dado** um contato que nunca comprou
- **Quando** a pessoa olha a lista de contatos, o perfil do contato ou o painel do chat
- **Então** o perfil RFV aparece como "Sem compras"

#### CA-B43-03 — O perfil do contato mostra o perfil RFV · prova: automática

- **Dado** um contato no perfil Clientes Fiéis
- **Quando** a pessoa abre o perfil desse contato
- **Então** aparece o selo "💎 Clientes Fiéis"

#### CA-B43-04 — O painel do contato no chat mostra o perfil RFV · prova: automática

- **Dado** uma conversa com um contato no perfil Em Risco
- **Quando** a pessoa abre a conversa e o painel do contato
- **Então** aparece o selo "🔥 Em Risco"

#### CA-B43-05 — O perfil mostrado é o da hora · prova: automática

- **Dado** um contato no perfil Em Risco
- **Quando** alguém registra uma compra para ele hoje e abre o perfil do contato
- **Então** o selo já mostra o perfil novo, o mesmo que Relatórios mostra naquele momento

#### CA-B43-06 — O Atendente vê o mesmo perfil que o Admin · prova: automática

- **Dado** um Atendente com contatos na carteira e uma empresa com clientes de vários atendentes
- **Quando** o Atendente abre a lista de contatos
- **Então** cada contato dele mostra o mesmo perfil que o Admin vê (calculado sobre a base da empresa inteira), e ele não vê contato que não é dele

#### CA-B43-07 — Visual do perfil aprovado · prova: manual

- **Dado** a empresa de teste com contatos em vários perfis
- **Quando** a Marcelle olha a lista de contatos, o perfil do contato e o painel do chat, no computador e no celular, nos temas claro e escuro
- **Então** o perfil fica legível, alinhado e sem cortes

### Conferência diária dos perfis

**Descrição:** toda madrugada, o sistema confere sozinho o perfil de cada contato de
cada empresa e anota quem mudou (de qual perfil para qual). A conferência não manda
mensagem: ela só anota. As automações rodam depois, cada uma no seu horário.

**Componentes:**
- Conferência automática de madrugada (3h, horário de Brasília), sem tela.

**Comportamentos:**
- Anotar, para cada contato que mudou, o perfil anterior e o novo.
- Contar como mudança o contato ganhar o primeiro perfil ("Sem compras" → um perfil).
- Na primeira conferência de uma empresa, só guardar os perfis, sem anotar mudança.
- Deixar de fora os contatos na lixeira.

**Critérios de aceite:**

#### CA-B43-08 — A conferência anota quem mudou de perfil · prova: automática

- **Dado** uma empresa cuja conferência de ontem guardou a Ana como Campeão, e a Ana completou hoje o tempo sem comprar que a leva para Em Risco
- **Quando** a conferência da madrugada roda
- **Então** fica anotada a mudança da Ana de Campeão para Em Risco, com o dia, e quem não mudou não ganha anotação

#### CA-B43-09 — Primeira compra conta como entrada no perfil · prova: automática

- **Dado** um contato guardado como "Sem compras" na conferência de ontem, que fez a primeira compra
- **Quando** a conferência da madrugada roda
- **Então** fica anotada a mudança de "Sem compras" para o perfil novo dele

#### CA-B43-10 — A primeira conferência da empresa não anota mudança · prova: automática

- **Dado** uma empresa que nunca passou pela conferência
- **Quando** a conferência roda pela primeira vez
- **Então** o perfil de cada contato fica guardado e nenhuma mudança é anotada

#### CA-B43-11 — Contato na lixeira fica fora da conferência · prova: automática

- **Dado** um contato na lixeira que, pelas compras, mudaria de perfil
- **Quando** a conferência roda
- **Então** nenhuma mudança é anotada para ele

#### CA-B43-12 — Cada empresa só vê as próprias mudanças · prova: automática

- **Dado** duas empresas com contatos que mudaram de perfil
- **Quando** a conferência roda
- **Então** as mudanças de uma empresa não aparecem nem disparam automação na outra

### Editor de automação

**Descrição:** o editor de automações ganha o gatilho "Entrou no perfil RFV" e a
condição "Perfil RFV".

**Componentes:**
- Gatilho "Entrou no perfil RFV", com:
  - **Perfis de destino**: um ou mais, obrigatório.
  - **Vindo de**: um ou mais perfis, ou "Sem compras". Opcional; vazio quer dizer de qualquer perfil.
  - **Horário de disparo**: hora cheia, padrão 9h.
- Condição "Perfil RFV": "é um destes", com um ou mais perfis ou "Sem compras", e saídas sim e não.

**Comportamentos:**
- Escolher o gatilho "Entrou no perfil RFV" e marcar os perfis de destino.
- Marcar, se quiser, os perfis de onde o contato veio.
- Escolher o horário de disparo.
- Usar a condição "Perfil RFV" em qualquer automação, com qualquer gatilho.
- Tentar salvar o gatilho sem perfil de destino, e ser avisada.

**Critérios de aceite:**

#### CA-B43-13 — Montar o gatilho "Entrou no perfil RFV" · prova: automática

- **Dado** o editor de uma automação nova
- **Quando** a pessoa escolhe o gatilho "Entrou no perfil RFV", marca Em Risco como destino e Campeão em "Vindo de", deixa o horário como veio e salva
- **Então** o horário já vinha em 9h, e a automação salva guarda o destino Em Risco, a origem Campeão e o horário 9h, que aparecem iguais ao abrir de novo

#### CA-B43-14 — Gatilho sem perfil de destino não salva · prova: automática

- **Dado** o gatilho "Entrou no perfil RFV" sem nenhum perfil de destino marcado
- **Quando** a pessoa tenta salvar (pela tela ou chamando o servidor direto)
- **Então** nada é gravado e aparece o aviso "Escolha ao menos um perfil de destino."

#### CA-B43-15 — Montar a condição "Perfil RFV" · prova: automática

- **Dado** uma automação com qualquer gatilho
- **Quando** a pessoa acrescenta a condição "Perfil RFV", marca Campeão e Clientes Fiéis e salva
- **Então** a condição fica gravada com os dois perfis e aparece igual ao abrir de novo

### Disparo das automações por perfil

**Descrição:** cada automação com o gatilho "Entrou no perfil RFV" roda no horário
escolhido nela para os contatos cuja mudança anotada combina com o gatilho. As
mensagens saem pela fila do número, como nas outras automações.

**Comportamentos:**
- No horário escolhido, rodar a automação para quem entrou num perfil de destino.
- Respeitar o "Vindo de".
- Pular quem já saiu do perfil de destino antes do horário.
- Não rodar duas vezes para a mesma mudança.
- Avaliar a condição "Perfil RFV" pelo perfil da hora.
- Mostrar no histórico de automações qual mudança disparou a regra.

**Critérios de aceite:**

#### CA-B43-16 — No horário escolhido, a automação roda para quem entrou no perfil · prova: automática

- **Dado** uma automação ativa "Entrou no perfil Em Risco" às 10h, que adiciona a tag "reativar", e a conferência de hoje anotou a Ana e o Bruno entrando em Em Risco
- **Quando** chegam as 10h
- **Então** a Ana e o Bruno ficam com a tag "reativar"; antes das 10h, nenhum dos dois tinha a tag

#### CA-B43-17 — "Vindo de" filtra a origem · prova: automática

- **Dado** uma automação "Entrou em Em Risco, vindo de Campeão" e mudanças anotadas hoje: Ana de Campeão para Em Risco e Carla de Precisa de Atenção para Em Risco
- **Quando** chega o horário da automação
- **Então** a automação roda para a Ana e não roda para a Carla

#### CA-B43-18 — Mudança por compra espera o horário do dia seguinte · prova: automática

- **Dado** uma automação "Entrou em Clientes Recentes" às 9h e um contato sem compras que ganha a primeira compra às 16h
- **Quando** passam as 16h e o resto do dia
- **Então** a automação não roda no mesmo dia e roda para ele às 9h do dia seguinte, depois da conferência da madrugada

#### CA-B43-19 — Quem saiu do perfil antes do horário é pulado · prova: automática

- **Dado** a conferência anotou a Ana entrando em Em Risco, e ela fez uma compra às 8h, antes da automação das 10h, e saiu de Em Risco
- **Quando** chegam as 10h
- **Então** a automação não roda para a Ana

#### CA-B43-20 — A mesma mudança não dispara duas vezes · prova: automática

- **Dado** uma automação que já rodou para a Ana pela mudança anotada hoje
- **Quando** o disparo das automações roda de novo no mesmo dia
- **Então** a automação não roda outra vez para a Ana pela mesma mudança

#### CA-B43-21 — Automação desligada não roda e não acumula · prova: automática

- **Dado** uma automação de perfil desligada enquanto mudanças foram anotadas por dois dias
- **Quando** a pessoa liga a automação de novo e chega o horário dela
- **Então** ela roda só para as mudanças anotadas no dia em que foi ligada, e não para as dos dias em que estava desligada

#### CA-B43-22 — A condição "Perfil RFV" usa o perfil da hora · prova: automática

- **Dado** uma automação "Mensagem recebida → Perfil RFV é Campeão? sim: tag 'vip-atendimento'", e dois contatos, um Campeão e um Hibernando, que mandam mensagem
- **Quando** a automação roda
- **Então** só o Campeão recebe a tag "vip-atendimento"

#### CA-B43-23 — O histórico mostra qual mudança disparou · prova: automática

- **Dado** uma automação de perfil que rodou para a Ana
- **Quando** a pessoa abre o histórico de automações
- **Então** a execução da Ana aparece com o gatilho descrito como "Entrou em Em Risco (vindo de Campeão)"

#### CA-B43-24 — Automação de perfil funcionando na empresa de teste · prova: manual

- **Dado** a empresa de teste, com uma automação "Entrou no perfil…" que adiciona uma tag, num horário escolhido pela Marcelle
- **Quando** a Marcelle confere, depois do horário, um contato que a conferência anotou entrando no perfil
- **Então** o contato tem a tag, e o histórico de automações mostra a execução com o perfil de origem e o de destino

## Fora de escopo

- Disparar na hora em que a compra é registrada: tudo espera o horário da automação (PER-B43-03).
- Histórico das mudanças de perfil de um contato numa tela.
- Mudar a regra do RFV (faixas, quintis ou nomes dos perfis).
- Gatilho "Saiu do perfil".
- Bloco "esperar" das automações (série B28, do Luan).
- Perfil RFV no filtro de Contatos e Campanhas, que já existe desde a B42.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B43-01 | A conferência roda às 3h de Brasília, e o horário de disparo é uma hora cheia, de 0h a 23h. Escolher 0h, 1h ou 2h quer dizer a próxima vez que der esse horário depois da conferência (a madrugada seguinte). | confirmada | Marcelle, 24/10/2026 (aprovação da spec). |
| SUP-B43-02 | O gatilho novo nasce com a repetição "sempre": cada mudança anotada dispara, mesmo que o contato já tenha entrado nesse perfil antes. A pessoa pode trocar a repetição, como nos outros gatilhos. | confirmada | Marcelle, 24/10/2026 (aprovação da spec). |
| SUP-B43-03 | Na hora do disparo, a automação confere se o contato ainda está num perfil de destino e pula quem já saiu (CA-B43-19). | confirmada | Marcelle, 24/10/2026 (aprovação da spec). |
| SUP-B43-04 | Automação ligada depois da conferência roda no próprio horário para as mudanças anotadas naquele dia; mudanças de dias anteriores nunca disparam (CA-B43-21). | confirmada | Marcelle, 24/10/2026 (aprovação da spec). |
| SUP-B43-05 | "Vindo de" e a condição "Perfil RFV" oferecem também a opção "Sem compras". O "Vindo de" não deixa marcar um perfil que também está no destino. | confirmada | Marcelle, 24/10/2026 (aprovação da spec). |
| SUP-B43-06 | A coluna "Perfil RFV" da lista de contatos aparece para todos os papéis. | confirmada | Marcelle, 24/10/2026 (aprovação da spec). |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B43-01 | Como configura o gatilho? | respondida | "Entrou no perfil": um ou mais perfis de destino e, opcional, os perfis de origem. Marcelle, 24/10/2026. |
| PER-B43-02 | O perfil mostrado no contato, na lista e no chat, e usado na condição, é o da hora ou o da conferência do dia? | respondida | Sempre o da hora, igual a Relatórios. Marcelle, 24/10/2026. |
| PER-B43-03 | Quando e em que horário dispara? | respondida | O sistema confere sozinho de madrugada, e cada automação tem o próprio horário de disparo, escolhido no gatilho, com padrão 9h. A mudança causada por compra também espera o horário (dia seguinte). Marcelle, 24/10/2026. |
| PER-B43-04 | Ganhar o primeiro perfil (primeira compra) dispara o gatilho? | respondida | Dispara. Marcelle, 24/10/2026. |
