# B12-04: Nome interno entrada/recompra e endereço /pipeline/recompra

**Tipo:** Implementação
**Página:** Pipeline (Funil de Recompra) e todo o código que usa o funil
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-renomear-funis.md` — seções "Funil de Recompra", "Troca em produção" e "Código, testes e documentação"

## Descrição

Trocar o nome interno do funil de `expansao`/`retencao` para `entrada`/`recompra` em
todas as camadas, numa entrega só (banco e código precisam mudar juntos):

- **Banco:** valor `funil` de todos os cards, a regra que só aceita os dois valores e o
  valor padrão da coluna; configurações de automação salvas que apontem para um funil.
  Hoje (02/10): 2 cards (1 em cada funil) e nenhuma automação com funil — mas a troca
  vale para o que existir no momento.
- **Endereço:** o Funil de Recompra passa para `/pipeline/recompra`; `/pipeline/retencao`
  redireciona para lá. Links internos (abas, perfil do contato) apontam para o novo.
- **Código:** funções, tipos, constantes, componentes e pastas com Expansao/Retencao no
  nome passam a Entrada/Recompra (dashboard, alertas, automações, classificação do
  contato, pipeline, mocks).
- **Testes:** unitários, integração e E2E com os valores e nomes novos.
- **Documentação viva:** `CLAUDE.md` (descrição do produto e lista de rotas) e
  `pre-desenvolvimento/testes/`.

A ordem da troca em produção tem de garantir que ninguém abra um funil vazio nem receba
erro ao criar ou mover card; o `/plan` decide a ordem e registra como voltar atrás. Se
não der para garantir, a troca entra fora do horário comercial (Brasília), com aviso da
Marcelle aos usuários.

Depende de B12-02 (textos já trocados), para que esta issue não tenha mudança visível
além do endereço.

## Pronto quando

No CRM publicado, `/pipeline/recompra` mostra o Funil de Recompra com os mesmos cards de
antes, `/pipeline/retencao` leva para lá, criar e mover card funciona nos dois funis,
dashboard, alertas, classificação do contato e automações dão os mesmos resultados de
antes, o banco só aceita `entrada` e `recompra` como funil, e uma busca por
`expansao`/`retencao` no `src/` e no `e2e/` não acha nada (fora a migration antiga).

## Cenários

### Happy Path (ordem da troca em produção)
1. **Migration A** (aplicada antes do deploy): a regra do banco passa a aceitar os
   quatro valores (`expansao`, `retencao`, `entrada`, `recompra`). O código no ar
   continua gravando os antigos, sem erro.
2. **Deploy** do código novo (push da `master`): passa a gravar e ler `entrada`/`recompra`,
   endereço novo `/pipeline/recompra`, redirecionamento do antigo.
3. **Migration B** (aplicada logo que o deploy fica Ready): converte `funil` dos cards e
   o `funil` dentro de `gatilho_config`/`acao_config` das automações, muda o valor padrão
   da coluna para `entrada` e aperta a regra para só `entrada` e `recompra`.
4. Usuário abre `/pipeline/recompra`: mesmos cards; `/pipeline/retencao` redireciona.

### Edge Cases
- **Janela entre o deploy e a Migration B** (segundos/minutos): o código novo não enxerga
  cards ainda com valor antigo. Hoje (02/10) os únicos 2 cards do banco estão no
  workspace "Luan Teste" e nenhuma automação tem funil — nenhum cliente real é afetado,
  por isso não é preciso esperar o fim do horário comercial.
- **Entre o push e o deploy ficar Ready**: o código antigo segue no ar com dados antigos
  e a regra aceitando os quatro — funciona normal.
- Card criado por automação ou sequência durante a janela: grava valor novo, aceito pela
  regra da Migration A.
- `/pipeline/retencao` com favorito ou link salvo: redirecionamento permanente (308) para
  `/pipeline/recompra`, configurado em `next.config.ts` (padrão documentado do Next:
  `redirects()`), sem deixar página com o nome antigo em `src/`.
- Etapas (`etapa`) não mudam; nada no banco além de `funil`.
- A migration antiga `20260526000002_pipeline_cards_retencao_stages.sql` não é renomeada
  (histórico de migrations aplicadas).
- Política de Privacidade: não tocada.

### Cenário de Erro
- Migration B falha: nada é aplicado (transação). O código novo segue no ar sem ver os 2
  cards do Luan Teste até corrigir e reaplicar.
- **Volta atrás** (registrada em comentário na Migration B): reverter os dados para os
  valores antigos, regra com os quatro valores e padrão `expansao`; promover no Vercel o
  deploy anterior.

## Banco de Dados

- Tabela: `pipeline_cards`
  - `funil` (text) — valores `entrada` | `recompra`; padrão `entrada`; regra
    `pipeline_cards_funil_check` recriada.
- Tabela: `automations`
  - `gatilho_config`, `acao_config` (json) — chave `funil` convertida onde existir.
- Migrations: **A** `supabase/migrations/20261002000002_funil_aceita_entrada_e_recompra.sql`
  (aplicar já) e **B** `supabase/migrations/20261002000003_funil_entrada_e_recompra.sql`
  (aplicar só depois do deploy — o `db push` aplica tudo o que estiver pendente, então
  B só é aplicada no fim da série).

## Arquivos

- **Criar:** `supabase/migrations/20261002000002_funil_aceita_entrada_e_recompra.sql`
- **Criar:** `supabase/migrations/20261002000003_funil_entrada_e_recompra.sql`
- **Modificar:** `next.config.ts` — `redirects()` de `/pipeline/retencao` para `/pipeline/recompra`.
- **Mover:** `src/app/(auth)/pipeline/retencao/page.tsx` → `src/app/(auth)/pipeline/recompra/page.tsx`
- **Mover:** `src/app/(auth)/pipeline/components/funil-expansao.tsx` → `funil-entrada.tsx`
- **Mover:** `src/app/(auth)/pipeline/components/funil-retencao.tsx` → `funil-recompra.tsx`
- **Modificar** (valores, identificadores, links e comentários):
  - `src/app/(auth)/pipeline/page.tsx`, `src/app/(auth)/pipeline/actions.ts`,
    `src/app/(auth)/pipeline/mock-pipeline.ts`, `src/app/(auth)/pipeline/components/painel-card.tsx`
  - `src/app/(auth)/contatos/actions.ts`, `src/app/(auth)/contatos/classificacao.ts`,
    `src/app/(auth)/contatos/mock-contatos.ts`, `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx`
  - `src/app/(auth)/dashboard/components/secoes-metricas.tsx`
  - `src/app/(auth)/configuracoes/automacoes/automacoes-client.tsx`
  - `src/lib/alertas.ts`, `src/lib/automacoes.ts`, `src/lib/metricas-dashboard.ts`
- **Modificar (testes):** `src/test/automacoes.test.ts`, `src/test/contato-classificacao.test.ts`,
  `src/test/contatos-classificacao.integration.test.ts`, `src/test/contatos-lista.integration.test.ts`,
  `src/test/metricas-dashboard.test.ts`, `src/test/sequencias.test.ts`,
  `src/test/gateway-alertas-de-numero.test.ts` (nome de exibição "Expansão" de um número).
- **Modificar (docs vivos):** `CLAUDE.md`, `pre-desenvolvimento/testes/plano-testes-modulo-0.md` a `-7.md`.

Regra de troca: `expansao→entrada`, `retencao→recompra`, nas formas `Expansao`/`EXPANSAO`/
`Expansão`/`expansão` (e o mesmo para retenção). Colisão conferida: em
`metricas-dashboard.ts` já existe a chave `entrada` (Entrada de Leads); a variável local
`expansao` vira `entrada` sem conflito, e a chave `retencao` vira `recompra`.

## Dependências Externas

- Next.js `redirects()` em `next.config.ts` — https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects

## Checklist

- [x] Migration A criada e aplicada (`db push`); regra aceita os quatro valores
- [x] Migration B criada (não aplicada), com conversão de cards e automações, padrão, regra final e volta atrás comentada
- [x] Pasta da rota e componentes dos funis renomeados; links internos para `/pipeline/recompra`
- [x] Redirecionamento `/pipeline/retencao` → `/pipeline/recompra` em `next.config.ts`
- [x] Valores e identificadores trocados nos arquivos de `src/app` e `src/lib`
- [x] Testes atualizados e passando (unitários + integração afetados) — 7 arquivos, 63/63 (02/10); não há plano de testes da B12
- [x] `CLAUDE.md` e planos de teste atualizados
- [x] Busca por expansao/retencao em `src/` e `e2e/` sem resultado (fora a Política de Privacidade)
- [x] `npx tsc --noEmit`, `npm run lint` e `npm run build` sem erro novo
- [x] Depois do push: deploy Ready (produção responde 308 em `/pipeline/retencao`) → `db push` da Migration B → 2 cards do Luan Teste em `entrada`/`recompra` nas mesmas etapas, regra só com os dois valores, padrão `entrada`, 0 automações com valor antigo (02/10)
- [x] Conferência visual no navegador (série toda): `next start` + Playwright com workspace temporário (apagado) — abas Entrada/Recompra, colunas com acento, painel "Funil: Entrada", `/pipeline/retencao` → `/pipeline/recompra`, perfil "Funil de Entrada", dashboard "Recompra" (02/10)
