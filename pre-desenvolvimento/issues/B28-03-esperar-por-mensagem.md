# B28-03: Bloco "esperar" pelas mensagens (recebeu e atendente enviou)

**Tipo:** Implementação
**Página:** Automações (editor, motor e histórico)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-espera-e-fim-das-sequencias.md`

## Descrição

O bloco "esperar" ganha as opções "recebeu mensagem" e "atendente enviou", cada uma com a
sua saída, em corrida com o tempo. Sem o tempo, o admin escolhe entre o teto de 30 dias e
"sem limite". A mensagem que acaba a espera é a da conversa do próprio contato e vale para
as condições de mensagem que vêm depois.

## Pronto quando

No preview, com mensagem recebida simulada e mensagem enviada pelo chat, um contato
esperando segue pela saída da mensagem que chegou primeiro; a mensagem que disparou a
regra, a de outro contato e a de automação não mudam nada; "texto contém" depois da espera
olha a mensagem nova; e o teto de 30 dias expira a espera.

## Critérios de aceite

- **CA-B28-02** (automática) — Cada opção ligada vira uma saída, e desligar apaga a ligação dela. Dado um bloco "esperar" com o tempo e "recebeu mensagem" ligados, e a saída "Recebeu mensagem" ligada a uma ação, quando o admin desliga "recebeu mensagem", então o bloco fica com uma saída só, a do tempo, e a ligação para a ação some.
- **CA-B28-05** (automática) — Sem o tempo, o admin escolhe entre o teto de 30 dias e sem limite. Dado um bloco "esperar" com "recebeu mensagem" ligado e o tempo desligado, quando o admin abre o painel do bloco, então ele escolhe "esperar no máximo 30 dias" ou "esperar sem limite", e o bloco nasce com o teto de 30 dias marcado.
- **CA-B28-09** (automática) — A resposta do contato leva pela saída "Recebeu mensagem". Dado um contato esperando num bloco com o tempo (2 dias) e "recebeu mensagem" ligados, quando o contato manda uma mensagem, então a execução segue pela saída "Recebeu mensagem" na mesma hora, enquanto mensagem de outro contato não muda nada, e a saída do tempo não roda mais para essa execução, nem depois dos 2 dias.
- **CA-B28-10** (automática) — A mensagem do time leva pela saída "Atendente enviou". Dado um contato esperando num bloco com "atendente enviou" ligado, quando um atendente manda mensagem para ele pelo chat, então a execução segue pela saída "Atendente enviou".
- **CA-B28-11** (automática) — Mensagem de automação ou de campanha não acaba a espera. Dado um contato esperando num bloco com "atendente enviou" ligado, quando outra automação ou uma campanha manda mensagem para ele, então ele continua esperando.
- **CA-B28-12** (automática) — A mensagem que disparou a regra não acaba a espera. Dado uma regra de gatilho "mensagem recebida" → esperar com "recebeu mensagem" ligado, quando o contato manda a mensagem que dispara a regra, então ele fica esperando, e só a mensagem seguinte faz o caminho seguir.
- **CA-B28-13** (automática) — A condição depois da espera olha a mensagem nova. Dado uma regra de gatilho "card movido" → esperar ("recebeu mensagem") → condição "texto contém sim", quando o contato responde "sim, pode mandar", então a condição sai pelo "sim"; o editor aceita a condição de mensagem nesse ponto do fluxo e continua recusando antes da espera.
- **CA-B28-14** (automática) — 30 dias sem nada, a espera expira. Dado um contato esperando há 30 dias num bloco sem tempo, com o teto de 30 dias, quando o relógio do motor roda, então a execução termina sem seguir caminho e o histórico mostra "a espera expirou depois de 30 dias".
- **CA-B28-15** (automática) — Sem limite, a espera não expira. Dado um contato esperando há 31 dias num bloco sem tempo e "sem limite", quando o relógio do motor roda, então ele continua esperando.
- **CA-B28-21** (automática) — O histórico mostra a execução esperando e, depois, o caminho inteiro. Dado uma execução que esperou num bloco e seguiu pela saída "Recebeu mensagem", quando o admin abre o histórico, então enquanto esperava, a linha dizia "Esperando: recebeu mensagem ou 2 dias, desde 14:03"; depois, a mesma linha mostra o caminho inteiro, com "Saiu por: recebeu mensagem, às 15:20".

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B28-02 | As duas saídas de mensagem só valem para mensagem na conversa do próprio contato; mensagem trocada com outro contato nunca encerra a espera dele. | confirmada | Luan, 20/10/2026 (a suposição dizia "qualquer conversa dele na empresa, de qualquer número conectado"; ele ajustou para a conversa do próprio contato). |
| SUP-B28-03 | Quando a mensagem acaba a espera e também dispara outras regras, a espera segue primeiro e as regras do evento rodam depois, na fila do contato. | confirmada | Luan aprovou a spec sem mudança neste ponto, 20/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B28-02 | Sem o tempo, até quando o contato espera mensagem? | respondida | O admin escolhe: teto de 30 dias ou sem limite (Luan, 20/10/2026). |
| PER-B28-07 | Depois da saída de mensagem, as condições de mensagem olham a mensagem nova? | respondida | Sim, em qualquer gatilho (Luan, 20/10/2026). |
