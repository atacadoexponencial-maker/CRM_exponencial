# B28-02: Bloco "esperar" por tempo, de ponta a ponta

**Tipo:** Implementação
**Página:** Automações (editor, motor, histórico e "Testar")
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-espera-e-fim-das-sequencias.md`

## Descrição

O fluxo ganha o bloco "esperar" com a opção de tempo: a execução para no bloco, fica
guardada como "esperando" e segue pela saída do tempo quando o relógio do motor a acorda. O
relógio é uma rota do CRM protegida por segredo (quem chama de 15 em 15 s é o gateway, na
B28-05). O histórico mostra a espera, o "Testar" para nela, e a proteção de repetição e a
lixeira passam a conhecê-la. As saídas de mensagem ficam para a B28-03.

## Pronto quando

No preview, uma regra "gatilho → ação → esperar 1 minuto → ação" roda a primeira ação, fica
"Esperando" no histórico e, chamada a rota do relógio depois do minuto, roda a segunda e
fica concluída. O mesmo contato não recomeça a regra enquanto espera, e mandá-lo para a
lixeira cancela a espera.

## Critérios de aceite

- **CA-B28-01** (automática) — O bloco "esperar" aparece no menu e nasce com o tempo ligado. Dado o editor de uma automação aberto, quando o admin escolhe "Esperar" no menu de novo bloco, então o bloco aparece com a opção de tempo ligada (1 dia), as outras duas desligadas e uma saída só, "Depois de 1 dia".
- **CA-B28-03** (automática) — O bloco não fica sem nenhuma opção. Dado um bloco "esperar" com só o tempo ligado, quando o admin tenta desligar o tempo, então a opção continua ligada e o painel avisa que o bloco precisa de pelo menos uma opção.
- **CA-B28-04** (automática) — Tempo fora do intervalo não salva. Dado um bloco "esperar" com o tempo ligado, quando o tempo está vazio, é zero, não é inteiro ou passa de 365 dias, então o Salvar recusa, com a pendência apontada no bloco; o servidor recusa o mesmo fluxo se ele chegar por fora do editor.
- **CA-B28-06** (automática) — As ações antes do bloco rodam, e as de depois esperam. Dado um fluxo gatilho → ação A → esperar 1 hora → ação B, quando o gatilho dispara para o contato, então a ação A roda na hora, a ação B não roda, e o histórico mostra a execução como "esperando" no bloco, desde a hora do disparo.
- **CA-B28-07** (automática) — Passado o tempo, o caminho segue pela saída do tempo. Dado um contato esperando há 1 hora num bloco "esperar 1 hora", quando o relógio do motor roda, então a ação ligada à saída do tempo roda e o histórico mostra a execução concluída, com o caminho inteiro.
- **CA-B28-16** (automática) — Contato na lixeira tem as esperas canceladas. Dado um contato esperando numa regra, quando ele vai para a lixeira, então a execução é cancelada e nenhuma ação dela roda depois.
- **CA-B28-17** (automática) — Contato esperando não recomeça a mesma regra. Dado uma regra de repetição "sempre" e um contato esperando nela, quando o gatilho dela dispara de novo para ele, então a regra não recomeça, e o histórico mostra "ignorada: o contato já está esperando nesta regra".
- **CA-B28-22** (automática) — O histórico filtra por "Esperando" e "Cancelada". Dado execuções concluídas, esperando e canceladas, quando o admin filtra por "Esperando", então só aparecem as que estão esperando.
- **CA-B28-23** (automática) — O "Testar" para no bloco de espera. Dado um fluxo com uma ação, um bloco "esperar" e outra ação, quando o admin testa com um contato, então o caminho mostra a primeira ação e o bloco "esperar", com a nota "aqui o contato esperaria", e não mostra a segunda ação.
- **CA-B28-24** (automática) — O relógio sem o segredo é recusado. Dado a rota do relógio, quando ela é chamada sem o segredo, ou com outro, então responde "não autorizado" e nenhuma espera segue.
- **CA-B28-25** (automática) — Duas chamadas juntas não seguem a mesma espera duas vezes. Dado uma espera vencida, quando o relógio é chamado duas vezes ao mesmo tempo, então a ação depois da espera roda uma vez só.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B28-01 | O tempo de espera vai até 365 dias, o mesmo teto da repetição "a cada N horas". | confirmada | Luan, 20/10/2026: "acho que tá bom". |
| SUP-B28-06 | Um bloco "esperar" conta como bloco no limite de 100 blocos por automação, e ele sozinho não basta: o fluxo continua precisando de pelo menos uma ação. | confirmada | Luan aprovou a spec sem mudança neste ponto, 20/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B28-01 | Como o bloco escolhe o caminho? | respondida | Corrida: o admin liga de 1 a 3 opções, e a primeira que acontece leva pela saída dela (Luan, 20/10/2026). |
| PER-B28-03 | Quem acorda as esperas de tempo? | respondida | O whatsapp-gateway, a cada 15 segundos (Luan, 20/10/2026). Descartados: Vercel Pro (US$ 20/mês, 1 por minuto) e serviço externo de cron (mais uma conta para manter). |
| PER-B28-05 | Contato esperando numa regra pode começá-la de novo? | respondida | Não, enquanto espera (Luan, 20/10/2026). |
