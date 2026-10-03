# B14-01: Sondagem, Negociação e Ganho no lugar das etapas antigas

**Tipo:** Implementação
**Página:** Funil de Entrada, painel do card, Dashboard, Alertas, Perfil do contato, Automações, Sequências
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-etapas-funil-entrada.md` — seções "Nome interno das etapas", "Mudança dos cards que já existem" e, nos demais módulos, tudo o que se refere a Sondagem, Negociação e Ganho

## Descrição

Trocar as três etapas antigas do Funil de Entrada pelas novas, em todas as camadas e de
uma vez só: Em Qualificação → **Sondagem** (`sondagem`), Em Negociação → **Negociação**
(`negociacao`), Primeira Compra → **Ganho** (`ganho`). Inclui mudar os cards de todas as
empresas, o histórico de etapas e as automações que apontam para essas etapas, sem
reiniciar o tempo na etapa e sem disparar nada. Ganho passa a fazer tudo o que a
Primeira Compra faz: cria o card na Recompra, conta como conversão no dashboard e não
gera alerta.

Lead e Catálogo Enviado não mudam. As etapas novas (Follow do Catálogo, Nutrição,
Perdido) ficam para a B14-02.

## Pronto quando

No CRM publicado, o Funil de Entrada mostra as colunas Lead, Sondagem, Catálogo Enviado,
Negociação e Ganho; os cards que estavam em Em Qualificação, Em Negociação e Primeira
Compra aparecem nas etapas novas com o mesmo tempo na etapa; arrastar um card para Ganho
cria o card do contato em Em Onboarding na Recompra; o dashboard conta Ganho como
conversão; card em Ganho não gera alerta; e nenhuma tela (painel do card, histórico,
perfil do contato, alertas, automações, sequências) mostra mais "Em Qualificação", "Em
Negociação" ou "Primeira Compra".

## Cenários

### Happy Path (ordem da troca em produção — mesmo padrão da B12-04)
1. **Migration A** (aplicada antes do deploy): a regra de `pipeline_cards.etapa` passa a
   aceitar os valores antigos **e** os novos (`em_qualificacao`/`sondagem`,
   `em_negociacao`/`negociacao`, `primeira_compra`/`ganho`). O código no ar continua
   funcionando.
2. **Deploy** do código novo (push da `master`): o quadro, o painel, o dashboard, os
   alertas, o perfil do contato e as automações passam a ler e gravar `sondagem`,
   `negociacao` e `ganho`. Arrastar para Ganho cria o card na Recompra.
3. **Migration B** (aplicada logo que o deploy fica Ready): converte os cards do Funil
   de Entrada, o histórico (`de_etapa` e `para_etapa`) e as automações que apontam para
   etapas antigas; a regra fica só com os valores novos.
4. O usuário abre o Funil de Entrada: colunas Lead, Sondagem, Catálogo Enviado,
   Negociação, Ganho; cada card no lugar certo e com o mesmo tempo na etapa.
5. Abre um card antigo: o histórico mostra "Sondagem", "Negociação", "Ganho" onde antes
   dizia "Em Qualificação", "Em Negociação", "Primeira Compra".
6. Arrasta um card para Ganho: o contato ganha card em Em Onboarding na Recompra (se não
   tinha), e o card em Ganho não aparece nos alertas.
7. Dashboard: um lead do período que chegou em Ganho conta como convertido; quem passou
   por Em Negociação antes da troca conta como tendo chegado em Negociação.

### Edge Cases
- **Tempo na etapa preservado**: a Migration B só troca o valor de `etapa`; não mexe em
  `etapa_changed_at` (não há trigger em `pipeline_cards` que o altere) e não insere
  linha no histórico.
- **Nada dispara na troca**: a conversão é SQL direto no banco, fora de `moverCard`, então
  não cria card na Recompra, não dispara sequência nem automação.
- **Funil de Recompra intocado**: as atualizações filtram `funil = 'entrada'`. No
  histórico, os valores antigos só existem no Funil de Entrada (nenhuma etapa da Recompra
  tem esses nomes), então a troca por valor é segura.
- **Janela entre o deploy e a Migration B**: em produção hoje os 2 cards do Funil de
  Entrada estão em `lead` e `catalogo_enviado`, que não mudam — ninguém vê funil vazio.
  O único efeito é o histórico antigo mostrar o nome interno cru (`em_qualificacao`)
  por alguns minutos, até a Migration B rodar. Aceito: não vale manter os nomes antigos
  no código só para essa janela.
- **Automações**: hoje nenhuma automação em produção aponta para etapa do Funil de
  Entrada; a Migration B converte mesmo assim (`gatilho_config.etapa` e
  `acao_config.etapa`, só quando `funil = 'entrada'`).
- **Migration antiga**: `20260526000002_pipeline_cards_retencao_stages.sql` não é
  alterada (histórico de migrations aplicadas).
- **Dados de exemplo** (`mock-pipeline.ts`): os cards de exemplo usam o tipo
  `EtapaEntrada`; passam a usar os valores novos para o código compilar.

### Cenário de Erro
- Migration B falha: nada é aplicado (transação). O código novo segue no ar; cards em
  etapa antiga não aparecem em coluna até a Migration B rodar — corrigir e reaplicar.
- Card movido para valor fora da regra: o banco recusa e `moverCard` devolve o erro
  como hoje.
- **Volta atrás** (registrada em comentário na Migration B): regra aceitando os dois
  conjuntos, `update` dos cards, histórico e automações para os valores antigos, e
  promover no Vercel o deploy anterior.

## Banco de Dados

- Tabela: `pipeline_cards`
  - `etapa` (text, check) — Funil de Entrada passa a usar `lead`, `sondagem`,
    `catalogo_enviado`, `negociacao`, `ganho`; as etapas da Recompra não mudam
- Tabela: `pipeline_card_history`
  - `de_etapa`, `para_etapa` (text) — valores antigos convertidos para os novos
- Tabela: `automations`
  - `gatilho_config->>'etapa'`, `acao_config->>'etapa'` (jsonb) — convertidos quando
    o `funil` da mesma config é `entrada`
- Migrations: **A** `supabase/migrations/20261003000001_etapas_entrada_aceita_novas.sql`
  (aplicar já) e **B** `supabase/migrations/20261003000002_etapas_entrada_novas.sql`
  (criar e aplicar só depois do deploy — o `db push` aplica tudo o que estiver pendente,
  então a B só é escrita depois que a A foi aplicada)

## Arquivos

- **Criar:** `supabase/migrations/20261003000001_etapas_entrada_aceita_novas.sql` — regra aceita valores antigos e novos
- **Criar:** `supabase/migrations/20261003000002_etapas_entrada_novas.sql` — converte cards, histórico e automações; regra final; volta atrás comentada
- **Modificar:** `src/app/(auth)/pipeline/mock-pipeline.ts` — tipo `EtapaEntrada`, `ETAPAS_ENTRADA` (Sondagem, Negociação, Ganho) e dados de exemplo
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — `moverCard`: `ganho` no lugar de `primeira_compra` para criar o card na Recompra
- **Modificar:** `src/lib/alertas.ts` — mapa de nomes e o `continue` de `ganho`
- **Modificar:** `src/lib/metricas-dashboard.ts` — `ETAPAS_FUNIL` (Lead, Sondagem, Catálogo Enviado, Negociação, Ganho), leads ativos e convertidos por vendedor com `ganho`
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — os dois mapas de nome (`ETAPA_ENTRADA_LABEL`, `ETAPA_LABEL_ALL`)
- **Modificar:** `src/test/metricas-dashboard.test.ts` — etapas novas
- **Modificar:** `src/test/sequencias.test.ts` — alerta não gerado para card em `ganho`
- **Modificar:** `src/test/automacoes.test.ts` — gatilho com `negociacao`
- **Modificar:** `src/test/contato-classificacao.test.ts` — etapas novas
- **Modificar:** `src/test/contatos-classificacao.integration.test.ts` — card em `ganho`

> Automações e Sequências não precisam de mudança: a tela de automações lê
> `ETAPAS_ENTRADA` de `mock-pipeline.ts`, e as sequências só citam Catálogo Enviado, que
> não muda.

## Checklist

- [x] Migration A criada e aplicada (`npx supabase db push --linked`); regra aceita os dois conjuntos
- [x] `mock-pipeline.ts`: tipo, `ETAPAS_ENTRADA` e dados de exemplo com `sondagem`, `negociacao`, `ganho`
- [x] `pipeline/actions.ts`: Ganho cria o card na Recompra
- [x] `alertas.ts`: nomes novos; card em Ganho não gera "lead sem resposta"
- [x] `metricas-dashboard.ts`: degraus do funil, leads ativos e convertidos com as etapas novas
- [x] `contatos/actions.ts`: nomes novos nos dois mapas
- [x] Testes existentes atualizados e passando (`npm run test`; as falhas da suíte completa foram rate limit — passam isolados — e `qr-code-conectado.test.tsx`, que já falhava antes desta issue)
- [x] `grep` por `em_qualificacao`, `em_negociacao`, `primeira_compra`, "Em Qualificação", "Em Negociação", "Primeira Compra" em `src/` e `e2e/` não acha nada
- [x] `npm run build` e `npm run lint` passam
- [ ] Commit + push; deploy Ready
- [ ] Migration B criada e aplicada; conferir no banco: 0 cards, 0 histórico e 0 automações com valor antigo; regra só com os valores novos
- [x] Conferência visual: `next start` + Playwright com workspace temporário (apagado no fim) — colunas novas, painel, Ganho cria card na Recompra (03/10, antes do push; banco já aceitava os valores novos pela Migration A)
