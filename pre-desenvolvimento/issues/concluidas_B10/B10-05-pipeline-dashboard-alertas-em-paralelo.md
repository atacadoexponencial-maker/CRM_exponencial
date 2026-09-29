# B10-05: Pipeline, Dashboard e Alertas sem fila de consultas

**Tipo:** Implementação
**Página:** Pipeline (Expansão e Retenção); Dashboard e Performance; Alertas
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-navegacao-fluida.md`
**Depende de:** B10-03

## Descrição

Nas três páginas, usar a identidade única e disparar em paralelo o que não
depende entre si: no Pipeline, atendentes e cards, com as conversas dos cards
numa consulta só; no Dashboard e Performance, métricas do período e histórico;
em Alertas, configuração de limiares, cards e conversas. Cards e alertas
passam a ter limite de linhas.

Cobre os comportamentos de "Pipeline", "Dashboard e Performance" e "Alertas".

## Pronto quando

No CRM publicado, as três páginas mostram os mesmos números e cards de antes
para admin, gerente e atendente, o log do servidor mostra uma busca de usuário
e uma de perfil por requisição, e o tempo de resposta do servidor cai em
relação a antes.

## Cenários

### Happy Path
1. Gerente abre Pipeline: a página usa `sessaoAtual()`; `listarCardsExpansao`
   e `listarAtendentes` rodam em `Promise.all`, ambos sobre a sessão já
   resolvida; os cards vêm ordenados pela última movimentação e limitados a
   500; a busca de conversas dos cards continua numa consulta só.
2. Admin abre Dashboard: página e `carregarDados` compartilham a sessão;
   cards e compras já saem juntos; o histórico depende dos ids dos cards e
   continua depois. Em Performance, atendentes e dados saem em paralelo.
3. Atendente abre Alertas: configuração, cards, dispensas e alertas de número
   saem juntos; só a busca de conversas (depende dos contatos dos cards) vem
   depois. Cards limitados a 500.

### Edge Cases
- Sem sessão: cada página mantém seu `redirect`; cada action mantém o retorno
  vazio/nulo de hoje.
- Atendente no Pipeline: a RLS continua restringindo os cards; nada muda.
- Workspace com mais de 500 cards num funil: só os 500 movimentados mais
  recentemente aparecem. Registrado como limite conhecido; paginação de
  Kanban fica fora desta spec.

### Cenário de Erro
- Erro no banco: `listarCards*` continua lançando o mesmo erro; o Next mostra
  a tela de erro como hoje.

## Banco de Dados
Não se aplica.

## Arquivos

- **Modificar:** `src/app/(auth)/pipeline/page.tsx` e
  `src/app/(auth)/pipeline/retencao/page.tsx` — `sessaoAtual()`.
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — `listarAtendentes`,
  `listarCardsExpansao` e `listarCardsRetencao` usam `sessaoAtual()`; cards
  com `order(etapa_changed_at desc)` e `limit(500)`.
- **Modificar:** `src/app/(auth)/dashboard/page.tsx` e
  `src/app/(auth)/dashboard/performance/page.tsx` — `sessaoAtual()`.
- **Modificar:** `src/app/(auth)/dashboard/actions.ts` — `carregarDados` e
  `buscarPerformanceVendedores` usam `sessaoAtual()`; atendentes em paralelo
  com os dados.
- **Modificar:** `src/app/(auth)/alertas/page.tsx` — `sessaoAtual()`.
- **Modificar:** `src/app/(auth)/alertas/actions.ts` — `listarAlertas` com
  config, cards, dispensas e alertas de número em `Promise.all`; cards com
  `limit(500)`.

## Dependências Externas
Nenhuma.

## Checklist

- [x] Pipeline (Expansão e Retenção) com sessão única e limite de cards
- [x] Dashboard e Performance com sessão única e atendentes em paralelo
- [x] Alertas com quatro consultas em paralelo e limite de cards
- [x] `npm run lint`, `npm run build` e testes passando
- [x] Páginas conferidas no build local (renderizam para o perfil de teste)
