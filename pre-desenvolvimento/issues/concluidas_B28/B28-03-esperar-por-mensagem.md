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

## Cenários

### Happy Path
1. No painel do bloco "esperar", o admin liga "O contato mandar mensagem" e/ou "Alguém do time mandar mensagem". Cada opção ligada ganha a sua saída ("Recebeu mensagem", "Atendente enviou"). Desligar uma opção apaga a ligação que saía dela.
2. Com o tempo desligado, o painel mostra a escolha do limite: "Esperar no máximo 30 dias" (marcado ao nascer) ou "Esperar sem limite".
3. O contato entra no bloco: a execução fica esperando. `retomar_em` é a hora do tempo, ou, sem o tempo, desde + 30 dias (teto) ou nulo (sem limite).
4. Chega uma mensagem do contato (`mensagem_recebida`) ou uma pessoa do time manda para ele (`mensagem_enviada_time`, pelo chat ou pelo celular). Na fila do contato, antes das regras do evento (SUP-B28-03), o motor procura as execuções esperando desse contato cujo bloco tem a opção ligada, reivindica cada uma (`retomada_em`, só se ainda estiver livre) e segue pela saída da mensagem. O contexto leva a mensagem nova, que as condições "texto da mensagem" e "tipo da mensagem" leem a partir daí.
5. Depois, as regras do evento rodam como sempre: a mensagem que acabou a espera continua disparando as outras regras.
6. No histórico, a execução esperando diz "Esperando: recebeu mensagem ou 2 dias, desde 14:03"; quando segue, o passo do bloco diz "Saiu por: recebeu mensagem, às 15:20".

### Edge Cases
- A mensagem que disparou a regra não acaba a espera dela: no mesmo evento, as esperas são procuradas antes de a regra rodar. Mesmo assim, a execução cujo evento é a mesma mensagem (`messageId`) é pulada.
- Mensagem de outro contato não muda nada: a procura é pelo contato do evento.
- Mensagem de automação ou de campanha não acaba a espera: esses envios nunca chamam o motor (`whatsapp-envio.ts`, `campanhas.ts`), então não há evento.
- Corrida com o tempo: quem pega primeiro a execução (relógio ou mensagem) leva; a outra não a encontra livre.
- Teto de 30 dias: o relógio pega a espera vencida sem o tempo ligado e a encerra sem seguir, com "A espera expirou depois de 30 dias". O passo do bloco ganha a hora em que expirou.
- Sem limite: `retomar_em` nulo, o relógio nunca a pega.
- O admin desligou o tempo depois de o contato entrar: no relógio, a espera recalcula a hora pelo limite (desde + 30 dias, ou sem hora) e só expira se o teto já passou.
- Condição de mensagem depois de uma saída de mensagem vale em qualquer gatilho. Antes da espera, ou num caminho que chega sem passar por uma saída de mensagem, continua pendência ("Verificação de mensagem não vale para este gatilho").
- Num segundo bloco "esperar" por tempo, a mensagem que acabou a primeira espera fica guardada no evento gravado (`mensagemDaEspera`), para as condições depois dele.

### Cenário de Erro
- Erro ao procurar as esperas do contato: as regras do evento rodam mesmo assim; a espera segue na próxima mensagem ou pelo relógio.
- Erro ao seguir uma espera: a execução fica "falhou" com "Erro inesperado ao seguir a espera", como na B28-02.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B28-02 | automática | `src/test/automacoes-espera-editor.test.tsx` | desligar "recebeu mensagem" deixa só a saída do tempo e apaga a ligação que saía dela |
| CA-B28-05 | automática | `src/test/automacoes-espera-editor.test.tsx` | com o tempo desligado, o painel oferece "no máximo 30 dias" (marcado) e "sem limite", e a escolha muda o bloco |
| CA-B28-09 | automática | `src/test/automacoes-espera-mensagem.test.ts` | a mensagem do contato segue pela saída "Recebeu mensagem"; a de outro contato não procura a espera dele; a execução que já seguiu não é reivindicada pelo relógio |
| CA-B28-10 | automática | `src/test/automacoes-espera-mensagem.test.ts` | a mensagem do time (`mensagem_enviada_time`) segue pela saída "Atendente enviou" |
| CA-B28-11 | automática | `src/test/automacoes-espera-mensagem.test.ts` | o envio das automações e o das campanhas não chamam o motor, e evento que não é de mensagem não procura espera |
| CA-B28-12 | automática | `src/test/automacoes-espera-mensagem.test.ts` | com gatilho "mensagem recebida", a mensagem que dispara a regra deixa o contato esperando; a seguinte faz seguir |
| CA-B28-13 | automática | `src/test/automacoes-espera-mensagem.test.ts` | depois da saída "Recebeu mensagem", "texto contém sim" vale com "sim, pode mandar" num gatilho "card movido"; o editor aceita a condição depois da espera e recusa antes (`src/test/fluxo-automacao.test.ts`) |
| CA-B28-14 | automática | `src/test/automacoes-espera-mensagem.test.ts` | a espera vencida sem o tempo, com o teto, termina sem seguir, com "A espera expirou depois de 30 dias" |
| CA-B28-15 | automática | `src/test/automacoes-espera-mensagem.test.ts` | sem limite, a espera nasce sem hora para o relógio, e há 31 dias continua esperando |
| CA-B28-21 | automática | `src/test/automacoes-historico-tela.test.tsx` | o detalhe mostra "Esperando: recebeu mensagem ou 2 dias, desde 14:03" e, depois, "Saiu por: recebeu mensagem, às 15:20" |

## Banco de Dados

Sem migration. O bloco usa os campos que a B28-02 já grava (`retomar_em`, `retomada_em`, `gatilho`). O evento gravado pode ganhar `mensagemDaEspera`, a mensagem que acabou a última espera.

## Arquivos

- **Criar:** `src/test/automacoes-espera-mensagem.test.ts` — CA-B28-09 a 15
- **Modificar:** `src/lib/fluxo-automacao.ts` — as três opções disponíveis, o teto de 30 dias e os blocos depois de uma saída de mensagem
- **Modificar:** `src/lib/automacoes/esperas.ts` — teto e expiração, seguir pelas mensagens, a mensagem no evento gravado
- **Modificar:** `src/lib/automacoes/index.ts` — as esperas do contato seguem antes das regras do evento de mensagem
- **Modificar:** `src/lib/automacoes/contexto.ts` — a mensagem que acabou a espera no contexto
- **Modificar:** `src/lib/automacoes/verificacoes.ts` — texto e tipo da mensagem leem a mensagem da espera primeiro
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/painel-bloco.tsx` — limite sem o tempo; verificações de mensagem depois de uma saída de mensagem
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/editor-fluxo.tsx` — diz ao painel se o bloco vem depois de uma saída de mensagem
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/frases-fluxo.ts` — "recebeu mensagem ou 2 dias"
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/historico/historico-client.tsx` — espera que expirou; motivo que não é erro
- **Modificar:** `src/test/automacoes-espera-editor.test.tsx` — CA-B28-02 e 05
- **Modificar:** `src/test/automacoes-historico-tela.test.tsx` — CA-B28-21
- **Modificar:** `src/test/fluxo-automacao.test.ts` — opções disponíveis e condição de mensagem depois da espera

## Checklist

- [x] Opções de mensagem disponíveis no formato e no painel, com o limite sem o tempo
- [x] Condição de mensagem aceita depois de uma saída de mensagem
- [x] Teto de 30 dias e expiração no relógio
- [x] Esperas do contato seguem pela mensagem, antes das regras do evento
- [x] Condições depois da espera leem a mensagem nova
- [x] Histórico: "recebeu mensagem ou 2 dias", "Saiu por" e a espera que expirou
- [x] Testes CA-B28-02, 05, 09 a 15 e 21
