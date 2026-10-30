# B23-03: Conversa antiga não dispara nada e cria card só por opção

**Tipo:** Implementação
**Página:** Chat, Pipeline (Funil de Entrada), Dashboard, Alertas, Automações
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-coexistencia.md`

## Descrição

As mensagens importadas do celular (B23-02) entram no chat como história, não como acontecimento: nenhuma automação roda, nada fica não lido, nenhum alerta nasce e o dashboard não muda. Ao fim da importação, só se o Admin marcou a opção na conexão (B23-01) cada contato importado sem card ganha um card na primeira etapa do Funil de Entrada. (O critério do template fora da janela, CA-B23-18, foi transferido para a série do template no Chat: PER-B23-06.)

## Pronto quando

Depois de uma importação, o dashboard, os alertas e o estado de leitura do chat estão como antes; com a opção marcada, os contatos importados aparecem na primeira etapa do Funil de Entrada; sem ela, nenhum card novo existe.

## Critérios de aceite

- **CA-B23-15** (automática) — Conversa antiga não dispara nada. Dado uma importação de conversas antigas, quando as mensagens entram no chat, então nenhuma automação roda, nenhuma sequência começa ou para, nenhum alerta é criado, nenhuma conversa fica marcada como não lida e os números do dashboard não mudam.
- **CA-B23-16** (automática) — Sem a opção marcada, conversa antiga não cria card. Dado uma conexão feita com a opção de criar cards desmarcada, quando a importação termina, então nenhum card novo existe no Funil de Entrada por causa da importação.
- **CA-B23-17** (automática) — Com a opção marcada, cada contato importado ganha um card. Dado uma conexão feita com a opção de criar cards marcada, quando a importação termina, então cada contato importado que ainda não tinha card ganha um card na primeira etapa do Funil de Entrada, e quem já tinha card continua com o mesmo, na mesma etapa.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B23-02 | A opção de criar cards para os contatos das conversas antigas vem **desmarcada** por padrão. | confirmada | Marcelle, 10/10/2026. |
| SUP-B23-05 | Mensagens antigas importadas não entram em nenhum número do dashboard, nem os de períodos passados. | confirmada | Marcelle, 10/10/2026. |
| SUP-B23-16 | Os cards criados no fim da importação (opção marcada) valem como lead novo: entram no dashboard como entrada na etapa Lead e na central de alertas como qualquer card. | confirmada | Marcelle, 30/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B23-04 | Contato vindo só das conversas antigas ganha card no Funil de Entrada? | respondida | É escolha do cliente na conexão. Marcelle, 10/10/2026. |
| PER-B23-06 | O CA-B23-18 (e o CA-B23-23, da B23-04) pedem que o CRM "exija template para escrever, como em conversa com a janela de 24 horas fechada". O Chat de hoje não tem essa regra: qualquer texto é enviado e é a Meta quem recusa fora da janela; a B54 deixa "template avulso pelo Chat" para uma série futura. O que fazer com esses dois critérios: tirá-los da B23 e levá-los para a série do template no Chat, ou criar a regra da janela agora, dentro da B23? | respondida | Tirar da B23 e levar para a série do template no Chat. Marcelle, 30/10/2026. |

## Cenários

### Happy Path
1. A importação (B23-02) grava as mensagens antigas sem chamar automação, sem transmitir, sem somar não lidas; a conversa nasce em espera com `unread_count = 0`. O dashboard conta cards, histórico de etapas e compras: nada disso é tocado pela importação. A central de alertas nasce dos cards: sem card, sem alerta.
2. Cada contato que aparece numa conversa importada (novo ou já existente) é marcado com `contacts.importado_do_celular_em`.
3. Quando a Meta avisa `progress: 100` e a conexão tem `criar_cards_do_historico = true`, o CRM percorre os contatos marcados da empresa e cria, para cada um que ainda não tem card no Funil de Entrada, um card na primeira etapa (`criarCardDeEntrada`, a mesma regra do contato novo). Quem já tinha card no Funil de Entrada continua com ele, na mesma etapa (o índice único `pipeline_cards_um_por_funil` recusa o segundo, e a função trata isso como "já existe").
4. Com `criar_cards_do_historico = false`, o fim da importação não cria card nenhum.

### Edge Cases
- Progresso 100 chega duas vezes: a segunda rodada não cria nada (os cards já existem).
- Contato importado que já tinha card em outra etapa do Funil de Entrada (ex.: Negociação): continua lá.
- Contato importado que tem card só no Funil de Recompra: ganha card na Entrada (a regra é por funil, como o contato novo).
- Os cards criados no fim da importação entram no dashboard e nos alertas como qualquer lead novo (SUP-B23-16): é a consequência da opção que o Admin marcou.

### Cenário de Erro
- `criarCardDeEntrada` nunca lança; card que falhar fica de fora e o resto segue. A situação "importado" é gravada de qualquer jeito.
- O CA-B23-18 saiu desta issue (PER-B23-06): sem a regra da janela no Chat, não há o que implementar nem provar; ele vai para a série do template no Chat.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B23-15 | automática | `src/test/historico-cards-e-silencio.integration.test.ts` | Depois de importar conversas antigas: nenhuma automação foi chamada, a conversa tem `unread_count = 0`, não existe card nem histórico de etapa para o contato importado, a central de alertas calcula zero alertas e os dados que o dashboard lê (cards, histórico, compras) estão iguais aos de antes. |
| CA-B23-16 | automática | `src/test/historico-cards-e-silencio.integration.test.ts` | Conexão com a opção desmarcada: ao chegar `progress: 100`, nenhum card existe no Funil de Entrada para os contatos importados. |
| CA-B23-17 | automática | `src/test/historico-cards-e-silencio.integration.test.ts` | Conexão com a opção marcada: ao chegar `progress: 100`, cada contato importado sem card ganha card em Entrada/Lead, e o que já tinha card em Negociação continua lá. |

## Banco de Dados

- Tabela: `contacts` (migration `supabase/migrations/20261030000032_contatos_importados_do_celular.sql`)
  - `importado_do_celular_em` (timestamptz, nulo) — quando o contato apareceu numa conversa antiga importada; é o que diz quem ganha card no fim da importação.

## Arquivos

- **Criar:** `supabase/migrations/20261030000032_contatos_importados_do_celular.sql` — a coluna acima.
- **Modificar:** `src/integrations/supabase/types.ts` — só a coluna, na forma do gerador.
- **Modificar:** `src/lib/whatsapp/historico-do-celular.ts` — `ConexaoDoHistorico` ganha `criar_cards_do_historico`; `contatoDoHistorico` marca o contato; ao chegar a 100% com a opção marcada, cria os cards com `criarCardDeEntrada` de `@/lib/card-de-entrada`.
- **Modificar:** `src/app/api/webhooks/whatsapp/route.ts` — a conexão do histórico é lida também com `criar_cards_do_historico`.
- **Criar:** `src/test/historico-cards-e-silencio.integration.test.ts` — CA-B23-15, CA-B23-16 e CA-B23-17 contra o banco de teste, com o webhook assinado (padrão de `src/test/historico-do-celular.integration.test.ts`); usa `calcularAlertas` de `@/lib/alertas`.

## Checklist

- [x] Migration da coluna aplicada no banco de teste e `types.ts` com ela
- [x] Contato importado marcado com `importado_do_celular_em`
- [x] Cards no fim da importação, só com a opção marcada, sem mexer em quem já tinha
- [x] Webhook passa `criar_cards_do_historico` para a lib
- [x] `tsc` sem erro (L-07) e os testes da B23-02 e do webhook passando (L-05)
