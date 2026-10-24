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
| PER-B43-05 | A Vercel do projeto é Hobby (rotina no máximo 1x/dia, com hora aproximada). Como disparar no horário de cada automação? | respondida | 24 rotinas diárias, uma por hora, grátis; a automação das 10h dispara entre 10:00 e 10:59. Marcelle, 24/10/2026. |

## Cenários

### Happy Path
1. Uma das 24 rotinas diárias (uma por hora, PER-B43-05) chama `/api/cron/perfil-rfv`. A partir das 3h (Brasília), a primeira chamada do dia faz a **conferência**: para cada empresa, compara o perfil da hora de cada contato fora da lixeira (`perfis_rfv_do_workspace`, B43-02; sem compra = `sem_compras`) com o perfil guardado na conferência anterior, anota cada mudança (de, para, dia) e guarda os perfis novos.
2. Toda chamada, depois, faz o **disparo** da hora: para as mudanças da conferência mais recente de cada empresa, roda as automações ativas "Entrou no perfil RFV" cujo horário é a hora atual e cujo destino (e origem, se marcada) combinam.
3. Cada automação roda uma vez por mudança: antes de rodar, ela marca a mudança como sua; se já estava marcada (rotina repetida), pula.
4. No editor, o gatilho tem "Perfis de destino" e "Vindo de" (caixas de marcar) e "Horário de disparo" (0h a 23h), que nasce em 9h. A repetição nasce em "sempre" (SUP-B43-02).

### Edge Cases
- Primeira conferência da empresa: só guarda os perfis, sem anotar mudança.
- Contato criado depois da conferência anterior conta como vindo de "Sem compras".
- Contato na lixeira: fica fora da conferência (nem anota, nem atualiza o guardado).
- Horário 0h, 1h ou 2h: antes das 3h, a conferência mais recente é a da véspera, então dispara na madrugada seguinte (SUP-B43-01).
- Rotina que roda duas vezes: a conferência do dia não se repete, e o disparo não repete a mesma mudança.
- "Vindo de" não deixa marcar um perfil que está no destino (SUP-B43-05).

### Cenário de Erro
- Sem perfil de destino: o editor marca a pendência e o servidor recusa com "Escolha ao menos um perfil de destino."
- Perfil inexistente, origem igual ao destino ou horário fora de 0–23 pelo servidor: recusado.
- Rotina sem `CRON_SECRET` certo: 401, nada roda.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B43-08 | automática | `src/test/automacao-entrou-perfil-rfv.integration.test.ts` | a conferência anota Campeão → Em Risco só para quem mudou |
| CA-B43-09 | automática | `src/test/automacao-entrou-perfil-rfv.integration.test.ts` | "Sem compras" → perfil novo é anotado |
| CA-B43-10 | automática | `src/test/automacao-entrou-perfil-rfv.integration.test.ts` | a primeira conferência guarda e não anota |
| CA-B43-11 | automática | `src/test/automacao-entrou-perfil-rfv.integration.test.ts` | contato na lixeira não ganha anotação |
| CA-B43-12 | automática | `src/test/automacao-entrou-perfil-rfv.integration.test.ts` | mudança de uma empresa não aparece nem dispara na outra |
| CA-B43-13 | automática | `src/test/automacao-entrou-perfil-rfv-tela.test.tsx` | horário nasce em 9h; destino e origem marcados ficam no gatilho e voltam marcados |
| CA-B43-13 | automática | `src/test/automacao-entrou-perfil-rfv.integration.test.ts` | `salvarRegra` grava destino, origem e horário, lidos de volta iguais |
| CA-B43-14 | automática | `src/test/automacao-entrou-perfil-rfv-tela.test.tsx` | sem destino, o painel mostra "Escolha ao menos um perfil de destino." |
| CA-B43-14 | automática | `src/test/automacao-entrou-perfil-rfv.integration.test.ts` | o servidor recusa e nada é gravado |
| CA-B43-16 | automática | `src/test/automacao-entrou-perfil-rfv.integration.test.ts` | às 10h a tag entra nos dois que mudaram; antes das 10h, não |
| CA-B43-17 | automática | `src/test/automacao-entrou-perfil-rfv.integration.test.ts` | "vindo de Campeão" roda para a Ana e não para a Carla |
| CA-B43-18 | automática | `src/test/automacao-entrou-perfil-rfv.integration.test.ts` | compra à tarde não dispara no dia; dispara às 9h do dia seguinte, depois da conferência |
| CA-B43-20 | automática | `src/test/automacao-entrou-perfil-rfv.integration.test.ts` | disparar de novo na mesma hora não roda outra vez para a mesma mudança |
| CA-B43-24 | manual | roteiro abaixo | automação de perfil funcionando na empresa de teste |

### Roteiro manual — CA-B43-24
1. Depois da publicação, entre na "[TESTE] Automações B11" e crie uma automação: "Entrou no perfil RFV", destino "Clientes Recentes", horário à sua escolha, ação "Adicionar tag" `teste-rfv`. Ligue a automação.
2. Registre hoje uma compra para um contato que nunca comprou.
3. No dia seguinte, depois do horário escolhido (a rotina roda dentro daquela hora), abra o contato: ele tem a tag `teste-rfv`.
4. Em Automações → Histórico, a execução aparece. Avise para eu registrar no auditor.

## Banco de Dados

- `automation_flows.gatilho_tipo`: a lista aceita `entrou_perfil_rfv`.
- Tabela `perfis_rfv_guardados` (`workspace_id`, `contact_id` chave, `perfil` text): o perfil de cada contato na última conferência.
- Tabela `conferencias_perfil_rfv` (`workspace_id` chave, `dia` date, `feita_em`): a última conferência de cada empresa.
- Tabela `mudancas_perfil_rfv` (`id`, `workspace_id`, `contact_id`, `de`, `para`, `dia`, `created_at`): o que a conferência anotou.
- Tabela `disparos_perfil_rfv` (`flow_id`, `mudanca_id`, chave nos dois): qual automação já rodou para qual mudança.
- Função `conferir_perfis_rfv(p_dia date)`: a conferência de todas as empresas, uma vez por dia por empresa. As quatro tabelas e a função são só do service role (RLS ligada, sem política).

## Arquivos

- **Criar:** `supabase/migrations/20261024000004_entrou_no_perfil_rfv.sql` — tabelas, função da conferência e gatilho aceito
- **Modificar:** `src/integrations/supabase/types.ts` — tipos regenerados
- **Modificar:** `src/lib/fluxo-automacao.ts` — gatilho `entrou_perfil_rfv`, repetição "sempre", horário padrão 9h, pendência sem destino
- **Modificar:** `src/lib/automacoes/contexto.ts` — evento `entrou_perfil_rfv`
- **Modificar:** `src/lib/automacoes/index.ts` — corresponde por destino, origem e hora; uma vez por mudança
- **Modificar:** `src/lib/automacoes/execucoes.ts` — o evento gravado no histórico
- **Criar:** `src/lib/automacoes/perfil-rfv.ts` — conferência e disparo da hora
- **Criar:** `src/app/api/cron/perfil-rfv/route.ts` — rotina, com `CRON_SECRET`
- **Modificar:** `vercel.json` — 24 rotinas diárias, uma por hora
- **Modificar:** `src/lib/automacoes/referencias.ts` — perfis e horário do gatilho
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/actions.ts` — recusa destino vazio, perfil inexistente, origem no destino e horário inválido
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/catalogo.ts` — gatilho no editor, campos de várias opções e horário
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/painel-bloco.tsx` — campos do gatilho e horário que nasce em 9h
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/campo-varias.tsx` — opções que não dá para marcar (origem no destino)
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/frases-fluxo.ts` — frase do gatilho
- **Criar:** `src/test/automacao-entrou-perfil-rfv.integration.test.ts` — conferência, salvar e disparo no banco de verdade
- **Criar:** `src/test/automacao-entrou-perfil-rfv-tela.test.tsx` — editor

Reuso: `perfis_rfv_do_workspace` (B43-02), `CampoVarias` e `opcoesDaFonte("perfisRfv")` (B43-02), `processarAutomacoes`, padrão da rota `src/app/api/cron/lixeira/route.ts`.

## Checklist

- [x] Migration aplicada e tipos regenerados
- [x] Conferência (`conferir_perfis_rfv`) e disparo da hora em `perfil-rfv.ts`
- [x] Rota e 24 rotinas no `vercel.json`
- [x] Gatilho no motor: corresponde, uma vez por mudança, evento no histórico
- [x] Conferência ao salvar
- [x] Editor: campos, horário 9h, pendência sem destino, frase
- [x] Testes da tabela Prova passando; tsc e lint limpos; testes de automações rodados
