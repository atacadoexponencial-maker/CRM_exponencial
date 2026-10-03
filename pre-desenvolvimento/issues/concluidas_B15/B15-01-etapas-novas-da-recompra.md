# B15-01: Etapas novas do Funil de Recompra

**Tipo:** Implementação
**Página:** Funil de Recompra, painel do card, Alertas, Dashboard, Perfil e lista de contatos, Automações, Sequências
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-etapas-funil-recompra.md` — tudo, menos "Cores das colunas" e "Série B11"

## Descrição

Trocar as etapas do Funil de Recompra pelas da régua nova, em todas as camadas e de uma
vez: Onboarding (`onboarding`), Reposição (`reposicao`), Ativos (`ativos`), Ativos RI
(`ativos_ri`), Inativos (`inativos`), Inativos RP (`inativos_rp`, nova) e Perdidos
(`perdidos`). Recompra Realizada sai junto com a confirmação e a volta automática; os
cards dela vão para Ativos. Inclui converter cards, histórico e automações sem reiniciar
o tempo na etapa e sem disparar nada, e ajustar alertas, dashboard, classificação do
contato e textos das sequências — sem mudar nenhuma regra além da saída da Recompra
Realizada.

## Pronto quando

No CRM publicado, o Funil de Recompra mostra Onboarding, Reposição, Ativos, Ativos RI,
Inativos, Inativos RP e Perdidos; os cards existentes estão nas etapas novas com o mesmo
tempo na etapa; arrastar para Ativos só muda a etapa (sem confirmação nem volta); Ganho
no Funil de Entrada cria o card em Onboarding; os três alertas disparam em Reposição,
Ativos RI e Inativos com os prazos de hoje; o dashboard e a classificação do contato
contam pelas etapas novas; e nenhuma tela mostra mais "Em Onboarding", "Aguardando
Recompra", "Cliente Ativo", "Recompra Realizada", "Em Risco" ou "Inativo" como etapa.

## Cenários

### Happy Path (ordem da troca em produção — padrão da B14-01)
1. **Migration A** (antes do deploy): a regra de `pipeline_cards.etapa` aceita os valores
   antigos e os novos da Recompra (`onboarding`, `reposicao`, `ativos`, `ativos_ri`,
   `inativos`, `inativos_rp`, `perdidos`). O código no ar continua funcionando.
2. **Deploy**: o quadro da Recompra mostra as 7 etapas; Ganho cria o card em
   `onboarding`; arrastar para Ativos só muda a etapa; alertas, dashboard, classificação,
   perfil, lista de contatos, automações e textos das sequências usam as etapas novas.
3. **Migration B** (logo que o deploy fica Ready): converte cards da Recompra, histórico
   dos cards da Recompra e automações com `funil = 'recompra'`; a regra fica só com as 8
   etapas da Entrada + 7 da Recompra.

### Edge Cases
- **`perdido` existe nos dois funis**: na Recompra vira `perdidos`; na Entrada fica
  `perdido`. Por isso a conversão de cards filtra `funil = 'recompra'` e a do histórico
  filtra pelos cards da Recompra (`card_id in (select id ... where funil = 'recompra')`).
- **Recompra Realizada**: cards e histórico vão para `ativos`. Uma recompra antiga gerou
  duas linhas (`X → recompra_realizada`, `recompra_realizada → aguardando_recompra`), que
  viram `X → ativos` e `ativos → reposicao`. O dashboard passa a contar recompras pelas
  passagens para `ativos` — as antigas continuam contando.
- **Tempo na etapa preservado**: a Migration B não mexe em `etapa_changed_at` nem grava
  histórico; é SQL direto, então não dispara sequência, automação nem alerta.
- **Gatilho de sequência "inativo"**: o identificador do gatilho não muda; o
  `moverCard` passa a dispará-lo ao mover para `inativos` (antes `inativo`). Mover para
  `inativos_rp` não dispara (a spec só cita Inativos).
- **Destaque do card** (`card-lead.tsx`): a borda vermelha de "em risco/inativo" passa a
  valer para `ativos_ri`, `inativos` e `inativos_rp`; o card esmaecido de Perdido vale
  para `perdidos` (Recompra) e continua para `perdido` (Entrada).
- **Destaque da coluna**: até a B15-02, as colunas `ativos_ri`, `inativos`,
  `inativos_rp` e `perdidos` ficam com o `alerta: true` de hoje (vermelho); a B15-02 troca
  pelas cores da régua.
- **Classificação** (`classificacao.ts`): ativo ← `onboarding`, `reposicao`, `ativos`;
  em_risco ← `ativos_ri`; inativo ← `inativos`, `inativos_rp`; perdido ← `perdidos`. Os
  valores de classificação (`ativo`, `em_risco`, `inativo`, `perdido`) e o filtro de
  campanhas e da lista de contatos não mudam.
- **Tipos de alerta** (`sem_recompra`, `em_risco`, `inativo`) e as colunas de prazo em
  `alert_config` não mudam; só a etapa de cada um e os textos dos prazos.
- **Janela entre deploy e Migration B**: o único card da Recompra em produção está em
  `em_onboarding`, que some do quadro por minutos até a Migration B. Aceito.
- **Dados de exemplo** (`mock-pipeline.ts`, `mock-contatos.ts`): passam a usar as
  etapas e nomes novos para compilar e não mostrar nomes antigos.

### Cenário de Erro
- Migration B falha: nada é aplicado (transação); corrigir e reaplicar.
- **Volta atrás** (comentário na Migration B): regra com os dois conjuntos, `update`
  inverso de cards, histórico e automações (Ativos volta como `cliente_ativo` — a
  distinção com Recompra Realizada não se recupera), e promover o deploy anterior.

## Banco de Dados

- Tabela: `pipeline_cards` — `etapa` (check): Recompra passa a usar `onboarding`,
  `reposicao`, `ativos`, `ativos_ri`, `inativos`, `inativos_rp`, `perdidos`
- Tabela: `pipeline_card_history` — `de_etapa`, `para_etapa` dos cards da Recompra convertidos
- Tabela: `automations` — `gatilho_config->>'etapa'` e `acao_config->>'etapa'` quando o
  `funil` é `recompra`
- Migrations: **A** `supabase/migrations/20261003000004_etapas_recompra_aceita_novas.sql`
  (aplicar já) e **B** `supabase/migrations/20261003000005_etapas_recompra_novas.sql`
  (escrever e aplicar só depois do deploy)

## Arquivos

- **Criar:** `supabase/migrations/20261003000004_etapas_recompra_aceita_novas.sql` — regra aceita os dois conjuntos
- **Criar:** `supabase/migrations/20261003000005_etapas_recompra_novas.sql` — converte cards, histórico e automações; regra final; volta atrás comentada
- **Modificar:** `src/app/(auth)/pipeline/mock-pipeline.ts` — tipo `EtapaRecompra`, `ETAPAS_RECOMPRA` (7 etapas) e dados de exemplo
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — sai o bloco de Recompra Realizada; Ganho cria em `onboarding`; gatilho "inativo" ao mover para `inativos`
- **Modificar:** `src/app/(auth)/pipeline/components/funil-recompra.tsx` — sai a confirmação de recompra
- **Modificar:** `src/app/(auth)/pipeline/components/painel-card.tsx` — sai a confirmação de recompra
- **Apagar:** `src/app/(auth)/pipeline/components/modal-confirmacao-recompra.tsx` — sem uso
- **Modificar:** `src/app/(auth)/pipeline/components/card-lead.tsx` — destaque do card pelas etapas novas
- **Modificar:** `src/lib/alertas.ts` — mapa de nomes e etapas dos três alertas
- **Modificar:** `src/app/(auth)/alertas/alertas-client.tsx` — textos dos prazos citando Reposição, Ativos RI e Inativos
- **Modificar:** `src/lib/metricas-dashboard.ts` — ativos, em risco, inativos, perdidos e recompras pelas etapas novas
- **Modificar:** `src/app/(auth)/contatos/classificacao.ts` — classificação pelas etapas novas
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — mapas de nome da Recompra
- **Modificar:** `src/app/(auth)/contatos/mock-contatos.ts` — nomes de etapa nos exemplos
- **Modificar:** `src/app/(auth)/sequencias/sequencias-client.tsx` — "Movido para Inativos"
- **Modificar:** `src/app/(auth)/sequencias/[id]/editor-client.tsx` — "card movido para Inativos"
- **Modificar:** `src/test/contato-classificacao.test.ts`, `src/test/contatos-classificacao.integration.test.ts`, `src/test/metricas-dashboard.test.ts`, `src/test/sequencias.test.ts` — etapas novas; casos de Inativos RP (classificação "inativo", sem alerta) e de recompra contada por Ativos

> Sem mudança: `campanhas/[id]/editor-campanha-client.tsx` e
> `contatos/components/lista-contatos.tsx` (usam valores de classificação, não de etapa);
> `src/lib/sequencias.ts` (identificadores de gatilho).

## Checklist

- [x] Migration A criada e aplicada antes do push
- [x] `mock-pipeline.ts` com as 7 etapas
- [x] `pipeline/actions.ts`: sem Recompra Realizada; Ganho → `onboarding`; gatilho em `inativos`
- [x] Confirmação de recompra removida (funil, painel e o arquivo do modal)
- [x] `card-lead.tsx`, `alertas.ts`, `alertas-client.tsx`, `metricas-dashboard.ts`, `classificacao.ts`, `contatos/actions.ts`, `mock-contatos.ts`, textos das sequências
- [x] Testes atualizados e passando
- [x] `grep` por `em_onboarding|aguardando_recompra|cliente_ativo|recompra_realizada|Em Onboarding|Aguardando Recompra|Cliente Ativo|Recompra Realizada` em `src/` e `e2e/` não acha nada; `em_risco`/`inativo`/`perdido` só como classificação, tipo de alerta, gatilho ou etapa da Entrada
- [x] `npm run build` e `npm run lint` passam
- [x] Conferência visual: `next start` + Playwright com workspace temporário — 7 colunas, Ganho cria em Onboarding, arrastar para Ativos sem confirmação, alerta em Ativos RI (03/10: sem nome antigo no quadro; histórico Reposição→Ativos, sem volta; textos dos limiares; perfil "Ativos RI" + classificação em risco; workspaces apagados)
- [x] Commit + push (`bade824`); deploy Ready (03/10)
- [x] Migration B criada e aplicada; 0 cards, histórico e automações da Recompra com valor antigo; regra final (03/10: card da Recompra em `onboarding`; regra recusa `em_onboarding`)
