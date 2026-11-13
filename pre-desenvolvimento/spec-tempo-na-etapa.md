# Spec: Gatilho "tempo na etapa" nas automações

> série: B62
> estado: aprovada em 13/11/2026

## Visão Geral

Pedido do Luan em 13/11/2026. Ele quer que o card ande sozinho no funil depois
de um tempo parado numa etapa. Exemplo: entrou no Onboarding do funil de Recompra
e ficou lá 30 dias, então vai para a próxima etapa.

**O problema que a spec resolve.** No Kommo, que o Luan usava antes, a regra da
etapa 1 era "esperar 30 dias e mover para a etapa 2". Se ele movesse o card à mão
da etapa 1 para a etapa 3, a espera da etapa 1 continuava contando. No 30º dia, o
Kommo puxava o card de volta para a etapa 2, mesmo ele estando na etapa 3. Os
dois gatilhos (o tempo e a mudança feita à mão) não conversavam entre si.

**Hoje o CRM tem o mesmo defeito.** Uma regra "card movido para Onboarding →
esperar 30 dias → mover para a etapa 2" guarda o evento da entrada. Quando o tempo
vence, a regra segue sem conferir onde o card está agora (`src/lib/automacoes/esperas.ts`,
`seguirPeloRelogio`). A espera só é cancelada pela lixeira, por desativar a regra,
por excluir a regra ou por tirar o bloco dela.

**A solução: um gatilho que olha o estado do card, não uma espera.** O gatilho
novo, "Tempo na etapa", dispara quando um card completa X tempo na etapa em que
está agora. Nada fica esperando. O relógio olha a hora em que o card entrou na
etapa atual (`pipeline_cards.etapa_changed_at`), e qualquer mudança de etapa
zera essa contagem. Então, se o card sai do Onboarding, a regra do Onboarding não
tem mais o que disparar para ele. Passa a valer a regra da etapa onde ele caiu,
contando da hora em que ele chegou lá.

O mesmo gatilho resolve um segundo problema, encontrado na análise: quando a
automação move o card, ela não dispara as regras de "card movido" da etapa de
destino. Só o movimento feito à mão dispara. Com o gatilho novo, isso não
importa: a automação também atualiza `etapa_changed_at`, e a regra da etapa
seguinte conta a partir dali. Uma sequência "etapa 1 → 30 dias → etapa 2 →
30 dias → etapa 3" funciona sem esperas.

Para quem: o admin, que monta as automações. O atendente percebe o resultado,
que é o card andando sozinho no funil.

### Alternativas consideradas

| Alternativa | O que é | Por que não foi a escolhida |
|---|---|---|
| A. Condição depois da espera | "card movido → esperar 30 dias → condição 'card está na etapa Onboarding' → mover". Funciona hoje, sem código, porque a condição `card_etapa` lê o banco na hora. | Se o card sai e volta para a etapa dentro dos 30 dias, a espera antiga continua contando desde a primeira entrada e o card anda antes da hora. O admin também precisa lembrar de pôr a condição em toda regra. Fica como paliativo até a B62 entrar no ar. |
| B. Trava no motor ao fim da espera | Nas regras de "card movido", quando a espera vence, o motor confere se o card ficou na etapa o tempo todo; se não ficou, cancela. | Conserta o sintoma, mas mantém uma espera guardada para cada card durante 30 dias. Também não resolve a regra da próxima etapa, que não dispara quando quem moveu o card foi a automação. |
| C. Cancelar a espera quando o card muda de etapa | Ao mover o card (à mão ou pela automação), o motor cancela as esperas dele que começaram por "card movido" naquele funil. | Mesmo resultado da B, agindo na hora do movimento. Precisa decidir quais esperas cancelar (todas do funil? só as da etapa de origem?), e o problema da regra da próxima etapa continua. |
| **D. Gatilho "tempo na etapa"** | Esta spec. | Escolhida pelo Luan em 13/11/2026: a regra lê o estado atual do card, então não tem como ficar fora de sincronia. É também como o Luan descreve o caso ("depois de 30 dias na etapa, ir para a próxima"). |

## Páginas / Módulos

### Gatilho "Tempo na etapa" no editor

**Descrição:** um gatilho novo no menu de gatilhos, ao lado de "Card movido".

**Componentes:**
- Item "Tempo na etapa" na lista de gatilhos.
- Painel do gatilho com três campos:
  - funil: Entrada, Recompra ou um funil da empresa (B41);
  - etapa: as etapas do funil escolhido;
  - tempo: um número e a unidade (horas ou dias);
  - caixa "Aplicar também aos cards que já estão na etapa", desmarcada ao nascer
    (PER-B62-01).
- Frase do gatilho no desenho e na lista de automações: "Quando o card completa
  30 dias em Onboarding (Recompra)".
- Com a caixa marcada, ao lado dela, quantos cards já estão na etapa e quantos
  desses já passaram do tempo e vão disparar assim que a regra for ativada.

**Comportamentos:**
- Escolher o gatilho: ele nasce com o tempo em 30 dias e sem funil nem etapa.
- Funil e etapa são obrigatórios. Sem eles, o Salvar aponta a pendência no bloco,
  como nos outros gatilhos.
- Tempo: número inteiro de 1 hora até 365 dias, o mesmo teto do bloco "esperar"
  (SUP-B28-01).
- Trocar o funil limpa a etapa.
- Etapa apagada ou funil apagado: a regra aparece com a pendência, como já
  acontece com "Card movido" e "Mover card" (`catalogo.ts`).
- O resto do fluxo funciona como em qualquer gatilho: condições, ações e o bloco
  "esperar" (ver "Fora de escopo" sobre esperar depois deste gatilho).

**Critérios de aceite:**

#### CA-B62-01 — o gatilho aparece no menu e nasce com 30 dias · prova: automática

- **Dado** o editor de uma automação nova aberto
- **Quando** o admin escolhe o gatilho "Tempo na etapa"
- **Então** o painel mostra funil e etapa vazios e o tempo em 30 dias

#### CA-B62-02 — sem funil ou etapa, ou com tempo fora do intervalo, não salva · prova: automática

- **Dado** o gatilho "Tempo na etapa" sem etapa, com tempo vazio, zero, não
  inteiro ou acima de 365 dias
- **Quando** o admin salva
- **Então** o Salvar recusa e aponta a pendência no bloco; o servidor recusa o
  mesmo fluxo se ele chegar por fora do editor

#### CA-B62-03 — a frase descreve o gatilho · prova: automática

- **Dado** o gatilho com Recompra, Onboarding e 30 dias
- **Quando** o desenho e a lista de automações são exibidos
- **Então** aparece "Quando o card completa 30 dias em Onboarding (Recompra)"

#### CA-B62-04 — trocar o funil limpa a etapa · prova: automática

- **Dado** o gatilho com Recompra e Onboarding
- **Quando** o admin troca o funil para Entrada
- **Então** a etapa fica vazia e a lista mostra as etapas da Entrada

### Motor: disparo pelo relógio

**Descrição:** o relógio que já acorda as esperas (rota `/api/automacoes/relogio`,
chamada pelo gateway a cada 15 segundos) passa a procurar, também, cards que
completaram o tempo de alguma regra "Tempo na etapa" ativa.

**Comportamentos:**
- A conta é sempre a partir de `pipeline_cards.etapa_changed_at`, a hora em que
  o card entrou na etapa onde está agora. O relógio dispara a regra quando o card
  está na etapa do gatilho e `etapa_changed_at + tempo <= agora`.
- **Uma vez por passagem.** A regra dispara no máximo uma vez para cada vez que o
  card passa pela etapa. A marca do disparo é a regra, o card e a
  `etapa_changed_at` daquela passagem (tabela nova `disparos_tempo_na_etapa`,
  no mesmo modelo de `disparos_perfil_rfv`). Se o card sai e volta para a etapa,
  é uma passagem nova, com contagem nova, e a regra pode disparar de novo.
- **Mover o card zera a contagem.** Isso vale para movimento à mão, pela
  automação, pelas áreas de ação rápida da B60 e pelo apagar etapa da B41, que
  leva os cards para outra etapa. Todos esses caminhos já gravam
  `etapa_changed_at`. A B62 garante isso com um teste para cada caminho.
- **Card que saiu da etapa nunca dispara a regra antiga.** Como o relógio busca
  pela etapa atual, um card movido do Onboarding para a etapa 3 só pode disparar
  regras da etapa 3. Isso resolve o caso do Kommo.
- A execução recebe um evento com o card, o funil, a etapa e o tempo. As ações que
  usam o card (como "Mover card") e as condições funcionam como no "Card movido".
- O relógio pega cada disparo uma vez só, mesmo com duas chamadas juntas: a marca
  é gravada antes de a regra rodar (chave única), como no `reivindicar_esperas_vencidas`.
- Precisão: até 1 minuto depois da hora certa, com o gateway no ar. O relógio
  procura cards no máximo uma vez por minuto (as esperas continuam a cada 15 s).
- Contato na lixeira: não dispara.
- Regra desativada: não dispara. Regra excluída: as marcas dela saem junto.
- Regra editada (outro tempo, outra etapa): vale o fluxo novo na próxima conferência
  do relógio. Uma passagem que já disparou não dispara de novo.
- A repetição da regra ("uma vez por contato", "a cada N horas", "sempre")
  continua valendo por cima da regra "uma vez por passagem" (ver PER-B62-02).
- Histórico da automação: a execução aparece com o gatilho "Completou 30 dias em
  Onboarding (Recompra)".

**Critérios de aceite:**

#### CA-B62-05 — o card dispara a regra ao completar o tempo na etapa · prova: automática

- **Dado** uma regra ativa "Tempo na etapa: Recompra, Onboarding, 30 dias → mover
  para a etapa 2", e um card no Onboarding com `etapa_changed_at` de 30 dias e
  1 minuto atrás
- **Quando** o relógio roda
- **Então** o card vai para a etapa 2, e o histórico mostra uma execução da regra

#### CA-B62-06 — antes do tempo, nada acontece · prova: automática

- **Dado** a mesma regra e um card no Onboarding há 29 dias
- **Quando** o relógio roda
- **Então** o card continua no Onboarding e não há execução

#### CA-B62-07 — card movido à mão não volta para trás (o caso do Kommo) · prova: automática

- **Dado** a regra do Onboarding (30 dias → etapa 2) e uma regra da etapa 3
  (30 dias → etapa 4); um card que entrou no Onboarding há 31 dias e foi movido à
  mão para a etapa 3 há 1 dia
- **Quando** o relógio roda
- **Então** o card continua na etapa 3, nenhuma das duas regras dispara, e 29 dias
  depois a regra da etapa 3 leva o card para a etapa 4

#### CA-B62-08 — a regra da etapa seguinte conta a partir do movimento da automação · prova: automática

- **Dado** as regras etapa 1 (30 dias → etapa 2) e etapa 2 (30 dias → etapa 3), e
  um card na etapa 1 há 30 dias
- **Quando** o relógio roda, e roda de novo 30 dias depois
- **Então** na primeira vez o card vai para a etapa 2; na segunda, vai para a
  etapa 3

#### CA-B62-09 — uma vez por passagem · prova: automática

- **Dado** uma regra "Tempo na etapa" sem "Mover card" (só manda mensagem), e um
  card que já disparou a regra nesta passagem
- **Quando** o relógio roda de novo, e de novo no dia seguinte
- **Então** a regra não roda outra vez para o card

#### CA-B62-10 — sair e voltar começa uma passagem nova · prova: automática

- **Dado** um card que disparou a regra do Onboarding, foi para outra etapa e
  voltou ao Onboarding há 10 dias
- **Quando** o relógio roda
- **Então** a regra não dispara agora, e dispara de novo quando a volta completar
  30 dias (se a repetição da regra deixar)

#### CA-B62-11 — duas chamadas juntas do relógio disparam uma vez só · prova: automática

- **Dado** um card que completou o tempo
- **Quando** duas chamadas do relógio rodam ao mesmo tempo
- **Então** existe uma execução só para aquela passagem

#### CA-B62-12 — todo caminho que muda a etapa zera a contagem · prova: automática

- **Dado** um card no Onboarding há 20 dias
- **Quando** ele muda de etapa por cada caminho: arrastar no pipeline, botão do
  card, área de ação rápida (B60), ação "Mover card" e apagar a etapa (B41)
- **Então** em todos os casos `etapa_changed_at` passa a ser a hora do movimento

#### CA-B62-13 — lixeira e regra desativada não disparam · prova: automática

- **Dado** um card que completou o tempo, com o contato na lixeira; e outro card
  numa regra desativada
- **Quando** o relógio roda
- **Então** nenhum dos dois dispara

#### CA-B62-14 — no preview, com o relógio de verdade · prova: manual

- **Dado** a empresa de teste no preview, com uma regra "Tempo na etapa: 1 hora"
- **Quando** um card fica 1 hora na etapa
- **Então** ele anda sozinho em até 1 minuto depois da hora; outro card, movido à
  mão no meio do tempo, não anda

### Cards que já estão na etapa quando a regra é ativada

**Descrição:** quando o admin ativa uma regra, já pode haver cards na etapa,
alguns há mais tempo que o da regra. O admin escolhe, pela caixa "Aplicar também
aos cards que já estão na etapa", se a regra vale para eles (PER-B62-01).

**Comportamentos:**
- Caixa desmarcada (o padrão): a regra só vale para os cards que entram na etapa
  depois que ela é ativada. Os que já estavam lá não disparam esta regra enquanto
  não saírem e voltarem.
- Caixa marcada: a regra vale também para os cards que já estavam na etapa, com a
  contagem desde a entrada real deles. Os que já passaram do tempo disparam na
  primeira conferência do relógio.
- Com a caixa marcada, o painel mostra quantos cards já passaram do tempo e vão
  disparar na hora.
- "Ativada" é a última vez que a regra foi ligada: criar a regra já ativa, ou
  reativar uma desativada. Editar uma regra ativa não muda essa hora (SUP-B62-04).
- Marcar a caixa numa regra já ativa passa a valer na próxima conferência do
  relógio, para todos os cards da etapa.

**Critérios de aceite:**

#### CA-B62-15 — caixa desmarcada: só os cards que entram depois · prova: automática

- **Dado** 12 cards no Onboarding há mais de 30 dias
- **Quando** o admin ativa a regra "Tempo na etapa: Onboarding, 30 dias" com a
  caixa desmarcada, e um card novo entra no Onboarding em seguida
- **Então** os 12 cards não disparam; o card novo dispara quando completa 30 dias

#### CA-B62-16 — caixa marcada: os que já passaram disparam na hora · prova: automática

- **Dado** 12 cards no Onboarding há mais de 30 dias e 5 há 10 dias
- **Quando** o admin marca a caixa e ativa a regra
- **Então** o painel mostra "12 cards já passaram do tempo e vão disparar agora";
  os 12 disparam na primeira conferência do relógio, e os 5 disparam quando
  completam 30 dias desde a entrada real

#### CA-B62-17 — o card que já estava, saiu e voltou entra na regra · prova: automática

- **Dado** uma regra com a caixa desmarcada e um card que já estava no Onboarding
  quando ela foi ativada
- **Quando** o card sai da etapa e volta
- **Então** a regra dispara para ele 30 dias depois da volta

#### CA-B62-18 — reativar a regra conta como ativar · prova: automática

- **Dado** uma regra com a caixa desmarcada, desativada e reativada hoje, e um
  card que entrou no Onboarding enquanto ela estava desativada
- **Quando** o relógio roda depois de o card completar 30 dias
- **Então** a regra não dispara para esse card, porque ele entrou antes da
  reativação

## O que muda por baixo

Detalhes técnicos para quem for quebrar a spec em issues.

- Nada muda na tabela de cards: a hora de entrada na etapa já existe
  (`pipeline_cards.etapa_changed_at`), nasce com o card e é atualizada pelo
  pipeline, pela ação "Mover card" e pelo apagar etapa. As migrations que
  renomearam etapas não mexeram nela de propósito.
- Uma tabela nova guarda as marcas de "já disparou nesta passagem" (regra, card e
  hora de entrada da passagem, com chave única), no modelo de `disparos_perfil_rfv`.
  Migration aditiva, aplicada primeiro no banco de teste.
- A regra passa a guardar a hora da última ativação, que a caixa "Aplicar também
  aos cards que já estão na etapa" usa para separar os cards que já estavam lá.
- O gateway não muda: ele já chama o relógio a cada 15 segundos.

## Fora de escopo

- Consertar a espera das regras de "card movido" (alternativas B e C). As regras
  que já existem continuam como estão. Para elas, o paliativo é a alternativa A
  (condição "card está na etapa" depois da espera).
- Fazer a ação "Mover card" disparar o gatilho "Card movido" das outras regras.
  Isso continua como hoje (só movimento à mão dispara). O gatilho novo não
  depende disso.
- Disparar só num horário do dia (ex.: não mandar mensagem de madrugada),
  decidido na PER-B62-03.
- Contar o tempo em dias úteis.
- Bloco "esperar" depois do gatilho "Tempo na etapa": é permitido, mas uma espera
  ali volta a ter o risco desta spec. O editor não impede; a ajuda do gatilho
  recomenda pôr o tempo todo no próprio gatilho.
- Modelo pronto na galeria (B59) com este gatilho.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B62-01 | O tempo vai de 1 hora até 365 dias, em horas ou dias, o mesmo teto do bloco "esperar". | confirmada | Luan, 13/11/2026. |
| SUP-B62-02 | Precisão de até 1 minuto é suficiente para um gatilho contado em horas ou dias. | confirmada | Luan, 13/11/2026. |
| SUP-B62-03 | Todo movimento de card grava `etapa_changed_at`; o CA-B62-12 confere cada caminho e, se faltar algum, a B62 conserta. | confirmada | Luan, 13/11/2026. |
| SUP-B62-04 | A caixa "Aplicar também aos cards que já estão na etapa" nasce desmarcada, e "já estão" quer dizer "entraram antes da última ativação da regra"; editar a regra ativa não muda essa hora. | confirmada | Luan, 13/11/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B62-01 | Card que já está na etapa há mais tempo que o da regra, quando ela é criada ou reativada: dispara na hora ou a contagem começa na ativação? | respondida | O admin escolhe na regra, com a opção "aplicar para cards que já estão na etapa" (Luan, 13/11/2026). Descartados: disparar sempre na hora, com aviso; e contar sempre a partir da ativação. |
| PER-B62-02 | A repetição da regra continua valendo por cima de "uma vez por passagem"? Ex.: com "uma vez por contato", o card que volta ao Onboarding não dispara de novo. | respondida | Sim, vale por cima, e o gatilho nasce com "sempre", que aqui quer dizer uma vez por passagem (Luan, 13/11/2026). Descartado: esconder a repetição neste gatilho. |
| PER-B62-03 | Precisa de um horário do disparo (como no gatilho de perfil RFV), para não mandar mensagem de madrugada? | respondida | Fica de fora agora: dispara assim que completa o tempo (Luan, 13/11/2026). Descartado: horário opcional, como no gatilho de perfil RFV. |
| PER-B62-04 | Nome do gatilho: "Tempo na etapa" ou "Card parado na etapa"? | respondida | "Tempo na etapa" (Luan, 13/11/2026). Descartado: "Card parado na etapa", que repete o nome de um alerta da Central de Alertas (B41-05). |
