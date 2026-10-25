# B28-06: Fim das sequências

**Tipo:** Implementação
**Página:** Menu, funil, perfil do contato, central de alertas, Agenda da equipe, automações e cadastro
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-espera-e-fim-das-sequencias.md`

## Descrição

O Módulo 4 perde as sequências: sai o menu e as telas de `/sequencias` (o endereço leva
para as automações), o início pelo arraste do card, a ação "iniciar sequência" e a opção da
etapa no "mover card", o botão "Iniciar sequência" do card, do perfil e dos alertas, o
quadro de sequências da Agenda da equipe, as sequências prontas do cadastro e o cron diário.
As tabelas ficam no banco até a B28-07.

## Pronto quando

No preview, nenhuma tela fala em sequência, `/sequencias` abre as automações, arrastar o
card não cria execução de sequência, empresa nova nasce sem sequência, e uma regra antiga
com "iniciar sequência" avisa no histórico e no editor em vez de rodar.

## Critérios de aceite

- **CA-B28-31** (automática) — O menu e as telas não falam mais em sequência. Dado um admin logado, quando ele abre o menu, o card do funil, o perfil do contato, a central de alertas e a Agenda da equipe, então nenhum deles mostra "Sequências" nem "Iniciar sequência", e abrir `/sequencias` leva para as automações.
- **CA-B28-32** (automática) — Arrastar o card não inicia sequência. Dado um card no Funil de Entrada, quando o atendente o arrasta para Catálogo Enviado ou para Ganho, então nenhuma execução de sequência é criada, e as automações de "card movido" rodam como antes.
- **CA-B28-33** (automática) — As ações de sequência saem do editor. Dado o editor de automação, quando o admin abre o menu de ações e o painel do "mover card", então não há "iniciar sequência" nem a opção "iniciar a sequência da etapa".
- **CA-B28-34** (automática) — Regra antiga com "iniciar sequência" avisa em vez de rodar. Dado uma regra gravada com a ação "iniciar sequência", quando ela dispara, então essa ação falha com "a ação 'iniciar sequência' foi removida: troque no editor", as outras ações rodam, e o editor aponta a pendência no bloco.
- **CA-B28-35** (automática) — Empresa nova não ganha sequências. Dado o cadastro de uma empresa nova, quando ela é criada, então nenhuma sequência é criada para ela.

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B28-08 | O que fica no lugar do botão "Iniciar sequência"? | respondida | Nada: o botão sai (Luan, 20/10/2026). |

## Cenários

### Happy Path
1. O menu perde "Sequências". As telas da biblioteca e do editor de sequência saem, e `/sequencias` e `/sequencias/<qualquer coisa>` redirecionam para `/configuracoes/automacoes` pelo `next.config.ts`, como o `/pipeline/retencao`.
2. O funil não chama mais o motor de sequências: criar lead, arrastar para Catálogo Enviado, Ganho (card da Recompra) ou Inativos, e criar card direto numa etapa só disparam o "card movido" das automações, como antes.
3. O card do funil, o perfil do contato e a central de alertas perdem o botão "Iniciar sequência" (e o diálogo, que sai do projeto).
4. A Agenda da equipe perde o quadro "Sequências em andamento". Marcar feito um lembrete não avança sequência nenhuma.
5. O cadastro não cria as quatro sequências prontas. O cron diário `/api/cron/sequencias` sai da rota e do `vercel.json`.
6. No editor, o menu de ações e a lista "Fazer" do painel não oferecem "Iniciar sequência"; o "mover card" perde a opção "iniciar a sequência da etapa".
7. Uma regra gravada antes com "iniciar sequência": no motor, essa ação falha com "A ação 'iniciar sequência' foi removida: troque no editor" e o caminho segue; no editor, o bloco fica marcado com o mesmo texto e o Salvar recusa até trocar.
8. `src/lib/sequencias.ts` sai. O `substituirVariaveis` das campanhas, que era dela, passa a morar em `src/lib/campanhas.ts`.

### Edge Cases
- Regra antiga com "mover card" e "iniciar a sequência da etapa" marcada: o parâmetro é ignorado; o card move como sempre, sem pendência (a opção não existe mais na tela).
- A pendência de "iniciar sequência" não para o motor: ela é do editor e do Salvar, e não de `pendenciasDoFluxo`, que o motor usa para decidir se a regra roda (B22-25).
- Lembrete antigo com origem "sequência" continua aparecendo na Agenda com o rótulo dele (hoje são zero). A Agenda só deixa de citar sequências no subtítulo.
- As tabelas de sequência ficam no banco até a B28-07; nada mais grava nelas.

### Cenário de Erro
- Nenhum novo: o que sai deixa de ser chamado.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B28-31 | automática | `src/test/fim-das-sequencias.test.tsx` | o menu, o card do funil, o perfil do contato, os alertas e a Agenda da equipe não mostram "Sequências" nem "Iniciar sequência"; `/sequencias` e `/sequencias/x` redirecionam para as automações |
| CA-B28-32 | automática | `src/test/pipeline-ganho-recompra.test.ts` | arrastar para Catálogo Enviado ou Ganho dispara o "card movido" e não grava nada em `sequence_runs` |
| CA-B28-33 | automática | `src/test/fim-das-sequencias.test.tsx` | o menu de novo bloco e a lista "Fazer" não têm "Iniciar sequência"; o painel do "mover card" não tem a opção da etapa |
| CA-B28-34 | automática | `src/test/automacoes-acoes.test.ts` | a ação falha com o texto, as outras ações do caminho rodam, e o editor e o Salvar apontam a pendência no bloco |
| CA-B28-35 | automática | `src/test/fim-das-sequencias.test.tsx` | o cadastro cria a empresa sem tocar em `sequences` |

## Banco de Dados

Sem migration. As tabelas `sequences`, `sequence_steps` e `sequence_runs` ficam até a B28-07.

## Arquivos

- **Criar:** `src/test/fim-das-sequencias.test.tsx` — CA-B28-31, 33, 34 (editor e Salvar) e 35
- **Apagar:** `src/lib/sequencias.ts` — o motor das sequências
- **Apagar:** `src/components/shared/iniciar-sequencia-dialog.tsx` — o diálogo "Iniciar sequência"
- **Apagar:** `src/app/api/cron/sequencias/route.ts` — o cron diário
- **Apagar:** `src/app/(auth)/sequencias/page.tsx` — a biblioteca
- **Apagar:** `src/app/(auth)/sequencias/sequencias-client.tsx` — a biblioteca
- **Apagar:** `src/app/(auth)/sequencias/actions.ts` — as actions das sequências
- **Apagar:** `src/app/(auth)/sequencias/loading.tsx` — o esqueleto da biblioteca
- **Apagar:** `src/app/(auth)/sequencias/[id]/page.tsx` — o editor
- **Apagar:** `src/app/(auth)/sequencias/[id]/editor-client.tsx` — o editor
- **Apagar:** `src/app/(auth)/sequencias/[id]/loading.tsx` — o esqueleto do editor
- **Apagar:** `src/test/sequencias-salvar-atomico.test.ts` — testava o salvar da tela que saiu
- **Modificar:** `next.config.ts` — `/sequencias` e `/sequencias/*` redirecionam para as automações
- **Modificar:** `vercel.json` — sai o cron das sequências
- **Modificar:** `CLAUDE.md` — Módulo 4 e rotas sem as sequências
- **Modificar:** `src/components/shared/sidebar-nav.tsx` — sai "Sequências"
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — sai o início de sequência pelo funil
- **Modificar:** `src/app/(auth)/pipeline/components/painel-card.tsx` — sai o botão
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — sai o botão
- **Modificar:** `src/app/(auth)/alertas/alertas-client.tsx` — sai o botão
- **Modificar:** `src/app/(auth)/agenda/actions.ts` — sem sequências em andamento nem avanço depois do lembrete
- **Modificar:** `src/app/(auth)/agenda/agenda-client.tsx` — subtítulo
- **Modificar:** `src/app/(auth)/agenda/equipe/agenda-equipe-client.tsx` — sai o quadro
- **Modificar:** `src/app/(auth)/agenda/equipe/page.tsx` — sai o quadro
- **Modificar:** `src/app/(auth)/contatos/lixeira/actions.ts` — não encerra mais `sequence_runs`
- **Modificar:** `src/app/cadastro/actions.ts` — sem sequências prontas
- **Modificar:** `src/app/api/cron/lixeira/route.ts` — o comentário não cita mais a rota das sequências
- **Modificar:** `src/lib/campanhas.ts` — `substituirVariaveis` passa a morar aqui
- **Modificar:** `src/lib/fluxo-automacao.ts` — "iniciar sequência" removida e a pendência dela; sem `SEQUENCIA_DA_ETAPA`
- **Modificar:** `src/lib/automacoes/acoes.ts` — a ação removida falha com o motivo; "mover card" sem sequência
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/actions.ts` — o Salvar recusa a ação removida
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/catalogo.ts` — sai do menu
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/painel-bloco.tsx` — fora da lista "Fazer", sem a opção do "mover card", sem o link para `/sequencias`
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/editor-fluxo.tsx` — a pendência da ação removida no bloco
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/frases-fluxo.ts` — "mover card" sem "e iniciar a sequência"
- **Modificar:** `src/test/sequencias.test.ts` — fica só com `calcularAlertas` e o `substituirVariaveis` das campanhas; o nome fica, por causa da guarda da B36-14
- **Modificar:** `src/test/b36-testes-de-antes.json` — sai `sequencias-salvar-atomico.test.ts`, que testava a tela que saiu
- **Modificar:** `src/test/automacoes-acoes.test.ts` — CA-B28-34 no motor; sem os testes de início de sequência
- **Modificar:** `src/test/pipeline-ganho-recompra.test.ts` — CA-B28-32
- **Modificar:** `src/test/fluxo-automacao.test.ts` — todas as ações disponíveis, menos a que saiu
- **Modificar:** `src/test/menu-lateral.test.tsx` — o menu sem "Sequências"
- **Modificar:** `src/test/automacoes-orientacao-painel.test.tsx` — a lista vazia que diz onde criar, com as mensagens rápidas
- **Modificar:** `src/test/agenda-lembrete-automacao.test.tsx` — a Agenda da equipe sem `sequenciasIniciais`
- **Modificar:** `src/test/crons-e-webhook-seguranca.test.ts` — sem o cron das sequências
- **Modificar:** `src/test/automacoes-atribuir-contato.test.ts` — sai o mock do motor ou das actions das sequências
- **Modificar:** `src/test/foto-de-perfil-caminhos.test.ts` — sai o mock do motor ou das actions das sequências
- **Modificar:** `src/test/funis-personalizados-tela.test.tsx` — sai o mock do motor ou das actions das sequências
- **Modificar:** `src/test/pipeline-mais-na-etapa-tela.test.tsx` — sai o mock do motor ou das actions das sequências
- **Modificar:** `src/test/pipeline-novo-lead-duplicado.test.ts` — sai o mock do motor ou das actions das sequências
- **Modificar:** `src/test/pipeline-novo-lead-nome-do-contato.test.ts` — sai o mock do motor ou das actions das sequências
- **Modificar:** `src/test/pipeline-sai-de-ganho.test.ts` — sai o mock do motor ou das actions das sequências
- **Modificar:** `src/test/qa-baixos.test.ts` — sai o mock do motor ou das actions das sequências
- **Modificar:** `src/test/qa-medios-actions.test.ts` — sai o mock do motor ou das actions das sequências

## Checklist

- [x] Telas e menu sem sequências; `/sequencias` redireciona
- [x] Funil sem início de sequência
- [x] Botões "Iniciar sequência" fora (card, perfil, alertas) e o diálogo apagado
- [x] Agenda sem o quadro e sem o avanço; lixeira sem `sequence_runs`
- [x] Cadastro sem sequências prontas; cron fora
- [x] Editor sem a ação e sem a opção; regra antiga avisa no motor, no editor e no Salvar
- [x] `src/lib/sequencias.ts` apagado, `substituirVariaveis` nas campanhas
- [x] Testes ajustados e os novos CA-B28-31 a 35
