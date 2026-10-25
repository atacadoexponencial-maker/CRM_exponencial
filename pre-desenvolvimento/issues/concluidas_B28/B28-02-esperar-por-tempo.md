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
| PER-B28-09 | Que segredo protege a rota do relógio? | respondida | O mesmo do gateway (`GATEWAY_WEBHOOK_SECRET`), com a assinatura HMAC que ele já usa nos webhooks: nada novo para configurar na Vercel nem no gateway (Luan, 25/10/2026). Descartado: um segredo só do relógio. |

## Cenários

### Happy Path
1. O admin escolhe "Esperar" no menu de novo bloco (grupo "Lógica"). O bloco nasce com o tempo ligado (1 dia) e com "recebeu mensagem" e "atendente enviou" desligados. Essas duas aparecem como "em breve" até a B28-03. O bloco tem uma saída, "Depois de 1 dia".
2. No painel, ele troca o número e a unidade (segundos, minutos, horas, dias). A saída e a frase do bloco acompanham ("Depois de 1 minuto").
3. Salva. O servidor confere o bloco como o editor (`pendenciasDoFluxo`).
4. O gatilho dispara. O motor roda as ações até o bloco e para nele. Grava a execução como `esperando`, com o caminho até ali, o evento inteiro (`gatilho`) e a hora de seguir (`retomar_em` = agora + o tempo).
5. O gateway (B28-05), ou um teste, chama `POST /api/automacoes/relogio` com a assinatura. A rota reivindica as esperas vencidas (`reivindicar_esperas_vencidas`), e cada uma segue pela saída do tempo, com o mesmo evento. As ações depois do bloco rodam e o passo do bloco ganha a saída e a hora. A mesma linha do histórico fica concluída, ou "falhou" se alguma ação do caminho inteiro falhou.
6. No histórico, a linha esperando mostra o selo "Esperando" e, no detalhe, "Esperando: 1 dia, desde 14:03". O filtro de resultado ganha "Esperando" e "Cancelada".

### Edge Cases
- Contato esperando na regra: o gatilho dela dispara de novo e a regra não roda, qualquer que seja a repetição. O histórico grava "ignorada" com "O contato já está esperando nesta regra". Evento sem contato não tem essa proteção.
- Contato vai para a lixeira: as esperas dele ficam canceladas ("O contato foi para a lixeira"). Se o relógio pegar uma espera de contato na lixeira antes disso, ela também é cancelada, sem rodar ação.
- Dois blocos "esperar" no mesmo caminho: depois do primeiro, a execução volta a esperar no segundo, na mesma linha.
- A regra foi excluída, ou o bloco saiu do fluxo, antes de a espera vencer: a execução é cancelada, com o motivo. O aviso antes de salvar, desativar ou excluir fica para a B28-04.
- A regra foi desativada: até a B28-04, a espera vencida é cancelada ("A regra foi desativada").
- Uma execução que a função não terminou (a Vercel cortou) fica "falhou" depois de 5 minutos e não é repetida, como na fila (B11-09).
- "Testar com um contato" para no bloco: mostra o caminho até ele e a nota "aqui o contato esperaria".
- Nem o motor nem o "Testar" seguem por saída de opção desligada: a ligação de uma saída que não existe é inválida (`problemasDeEstrutura`).

### Cenário de Erro
- Rota chamada sem a assinatura ou com outra: 401 "não autorizado", nada segue. Sem `GATEWAY_WEBHOOK_SECRET` configurado, também recusa.
- Erro ao reivindicar no banco: a rota responde erro e as esperas seguem na próxima chamada.
- Erro numa ação depois da espera: conta como falha da ação e o caminho segue, como nas outras ações.
- Erro inesperado ao seguir uma espera: a execução fica "falhou" com "Erro inesperado ao seguir a espera"; as outras esperas da chamada seguem.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B28-01 | automática | `src/test/automacoes-espera-editor.test.tsx` | escolher "Esperar" no menu cria o bloco com o tempo ligado em 1 dia, as duas opções de mensagem desligadas e uma saída só, "Depois de 1 dia" |
| CA-B28-03 | automática | `src/test/automacoes-espera-editor.test.tsx` | desligar o tempo, sendo a única opção, não muda o bloco e o painel avisa que precisa de pelo menos uma opção |
| CA-B28-04 | automática | `src/test/automacoes-espera-editor.test.tsx` | tempo vazio, zero, fracionado ou acima de 365 dias vira pendência no bloco e o Salvar não chama o servidor; `salvarRegra` recusa o mesmo fluxo |
| CA-B28-06 | automática | `src/test/automacoes-espera.test.ts` | a ação A roda, a B não, e a execução é gravada como esperando no bloco, desde a hora do disparo, com `retomar_em` uma hora depois |
| CA-B28-07 | automática | `src/test/automacoes-espera.test.ts` | a espera vencida segue pela saída do tempo: a ação B roda e a mesma execução fica concluída, com o caminho inteiro e a saída do bloco |
| CA-B28-16 | automática | `src/test/automacoes-espera.test.ts` | mandar o contato para a lixeira cancela as esperas dele; a espera vencida de contato na lixeira é cancelada sem rodar ação |
| CA-B28-17 | automática | `src/test/automacoes-espera.test.ts` | com repetição "sempre" e o contato esperando, a regra não roda e é gravada como ignorada, com "O contato já está esperando nesta regra" |
| CA-B28-22 | automática | `src/test/automacoes-historico-filtro.test.ts` | o filtro "Esperando" consulta só `resultado = esperando` e devolve só as que esperam; "Cancelada" também é aceito |
| CA-B28-23 | automática | `src/test/automacoes-simulacao.test.ts` | a simulação percorre até o bloco "esperar" e para, sem a segunda ação (o canvas com "aqui o contato esperaria" fica em `src/test/automacoes-espera-editor.test.tsx`) |
| CA-B28-24 | automática | `src/test/automacoes-relogio.test.ts` | sem assinatura, com assinatura de outro segredo ou sem o segredo configurado, a rota responde 401 e não segue nenhuma espera |
| CA-B28-25 | automática | `src/test/automacoes-espera.integration.test.ts` | duas reivindicações ao mesmo tempo, no banco real, entregam a espera vencida uma vez só |

## Banco de Dados

Migration `supabase/migrations/20261025000010_espera_nas_automacoes.sql`. Ela só acrescenta: o CRM publicado não grava nem lê nada disto.

- `automation_runs.resultado` passa a aceitar `esperando` e `cancelada`.
- `automation_runs.gatilho` (jsonb, nulo): o `GatilhoAutomacao` inteiro, para a execução seguir depois da espera com o mesmo evento (o `evento` guarda só um trecho da mensagem).
- `automation_runs.retomar_em` (timestamptz, nulo): quando o relógio segue a espera. Nulo quando não espera tempo.
- `automation_runs.retomada_em` (timestamptz, nulo): quando o relógio pegou a espera para seguir. Volta a nulo ao terminar. Mais de 5 minutos assim é execução interrompida.
- `automation_runs.atualizada_em` (timestamptz, nulo): a última vez que a execução mudou depois de gravada.
- Índices parciais `where resultado = 'esperando'`: um por `retomar_em` (o relógio) e um por `(regra_id, contact_id)` (a proteção).
- Função `reivindicar_esperas_vencidas(p_limite int, p_workspace_id uuid default null)`: marca como "falhou" a retomada interrompida e entrega até `p_limite` esperas vencidas, com `for update skip locked`, já marcadas com `retomada_em`. `p_workspace_id` limita a uma empresa, para o teste de integração nunca pegar a espera de um cliente; o relógio não passa. Só o service role executa.

O bloco espera fica no `fluxo` (jsonb) de `automation_flows`, sem coluna nova:
`{ id, tipo: "espera", tempo: { quantidade, unidade } | null, recebeuMensagem, atendenteEnviou, limite: "30_dias" | "sem_limite", posicao }`. Saídas: `tempo`, `recebeu_mensagem`, `atendente_enviou`.

## Arquivos

- **Criar:** `supabase/migrations/20261025000010_espera_nas_automacoes.sql` — colunas, índices e a função de reivindicar
- **Criar:** `src/lib/automacoes/esperas.ts` — dados da espera ao parar, seguir as vencidas, cancelar as do contato
- **Criar:** `src/app/api/automacoes/relogio/route.ts` — a rota do relógio, com a assinatura do gateway
- **Criar:** `src/test/automacoes-espera.test.ts` — CA-B28-06, 07, 16 e 17
- **Criar:** `src/test/automacoes-espera-editor.test.tsx` — CA-B28-01, 03 e 04
- **Criar:** `src/test/automacoes-relogio.test.ts` — CA-B28-24
- **Criar:** `src/test/automacoes-espera.integration.test.ts` — CA-B28-25
- **Modificar:** `src/lib/fluxo-automacao.ts` — bloco `espera`, saídas, duração, pendências, percurso que para e que retoma
- **Modificar:** `src/lib/automacoes/fluxo-recebido.ts` — formato do bloco `espera`
- **Modificar:** `src/lib/automacoes/index.ts` — grava a execução esperando
- **Modificar:** `src/lib/automacoes/execucoes.ts` — resultados novos, passo da espera, proteção "já está esperando", gravação dos dados da espera
- **Modificar:** `src/lib/automacoes/simulacao.ts` — devolve o bloco onde o contato esperaria
- **Modificar:** `src/lib/automacoes/referencias.ts` — pula o bloco espera, que não tem parâmetros
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/catalogo.ts` — "Esperar" no menu; `referenciasQueSumiram` pula o bloco espera
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/menu-novo-bloco.tsx` — item "Esperar" e títulos das saídas novas
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/editor-fluxo.tsx` — bloco novo de espera, posição pelas saídas, apagar a ligação da opção desligada
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/blocos-fluxo.tsx` — desenho do bloco espera, com uma saída por opção e a nota da simulação
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/painel-bloco.tsx` — painel do bloco espera
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/frases-fluxo.ts` — frases do bloco e das saídas
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/historico/historico-client.tsx` — selos, filtro e o passo da espera
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/actions.ts` — filtro aceita "esperando" e "cancelada"
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/historico/page.tsx` — o filtro do endereço aceita os dois resultados novos
- **Modificar:** `src/app/(auth)/contatos/lixeira/actions.ts` — cancela as esperas do contato
- **Modificar:** `src/integrations/supabase/types.ts` — regerado depois da migration
- **Modificar:** `src/test/automacoes-historico-filtro.test.ts` — CA-B28-22
- **Modificar:** `src/test/automacoes-simulacao.test.ts` — CA-B28-23
- **Modificar:** `src/test/fluxo-automacao.test.ts` — saídas, duração e pendências do bloco espera
- **Modificar:** `src/test/automacoes.test.ts` — o banco falso da proteção não acha espera na consulta nova
- **Modificar:** `src/test/automacoes-horas-e-dia-inteiro.test.ts` — o mesmo, no banco falso do motivo

## Checklist

- [x] Migration criada e aplicada (só acrescenta)
- [x] Tipos regerados
- [x] Bloco `espera` no formato do fluxo, com validação no editor e no servidor
- [x] Percurso que para na espera e que retoma por uma saída
- [x] Motor grava a execução esperando; proteção "já está esperando"
- [x] `esperas.ts`: seguir as vencidas e cancelar as do contato
- [x] Rota do relógio com a assinatura do gateway
- [x] Lixeira cancela as esperas
- [x] Editor: menu, bloco, painel, saídas e frases
- [x] Histórico: selos, filtro e o passo da espera
- [x] "Testar" para na espera
- [x] Testes CA-B28-01, 03, 04, 06, 07, 16, 17, 22, 23, 24 e 25
