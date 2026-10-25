# B34-03: Aba Funil de clientes e aprovação das duas abas

**Tipo:** Implementação
**Página:** Relatórios (`/relatorios`), aba Funil de clientes
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-relatorios-coorte-e-funil.md`

## Descrição

Nasce a aba Funil de clientes: sete etapas "1+ a 7+ compras" (toda a história), funil colorido com quantidade e conversão, legenda com parados (sem venda há mais de 90 dias), cartões de conversão, tabela por etapa com ticket médio e parados, o link "O que são clientes parados?" e as dicas. Com as duas abas no ar, a Marcelle aprova em produção.

## Pronto quando

Na empresa de teste, Relatórios → Funil de clientes mostra o funil com as etapas, as conversões e os parados das vendas semeadas; a Marcelle aprova Coorte e Funil no computador e no celular.

## Critérios de aceite

- **CA-B34-09** (automática) — Etapas do funil com quantidade, conversão e ticket médio. Dado 10 clientes com 1 venda de R$ 100 cada, 5 com 2 vendas (R$ 100 cada venda) e 2 com 3 vendas (R$ 100 cada venda), quando o funil é calculado, então 1+ tem 17 clientes, 2+ tem 7, 3+ tem 2 e 4+ a 7+ têm 0; as conversões são 41,2% (1→2) e 28,6% (2→3); o ticket médio de 2+ é R$ 228,57 (1.600 ÷ 7).
- **CA-B34-10** (automática) — Clientes parados por etapa. Dado hoje 21/10/2026 e, na etapa 2+, um cliente com última venda há 91 dias e outro há 90 dias, quando os parados são contados, então a etapa 2+ mostra 1 parado.
- **CA-B34-11** (automática) — A aba Funil de clientes abre o relatório. Dado a tela Relatórios aberta, quando o usuário clica na aba "Funil de clientes", então a aba fica selecionada e aparecem o funil com as sete etapas, a legenda, os cartões de conversão, a tabela e as dicas.
- **CA-B34-12** (manual) — As abas Coorte e Funil aprovadas pela Marcelle em produção. Dado a empresa "[TESTE] Automações B11" com as vendas de 25 meses, quando a Marcelle abre as abas Coorte e Funil de clientes em produção, no computador e no celular, então as tabelas de coorte têm a cor por intensidade, o funil tem as sete etapas coloridas, tudo legível no tema escuro e os números batem com a base.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B34-01 | As etapas do funil contam todas as vendas do cliente em toda a história, não só nos últimos 12 meses. | confirmada | Marcelle, 21/10/2026 |
| SUP-B34-03 | "Cliente parado" no funil = sem venda há mais de 90 dias, o limiar da B33. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. O usuário clica na aba "Funil de clientes"; o componente chama `buscarFunilClientes({ atendenteId })`, que carrega as vendas e chama `calcularFunilClientes` com hoje.
2. A aba mostra o funil (Recharts `FunnelChart`) com as etapas que têm cliente, rótulo "N+ compras: X · conversão", a legenda com clientes e parados por etapa, os seis cartões de taxas, a tabela por etapa (clientes, conversão, ticket médio, parados), o link "O que são clientes parados?" que abre a explicação e as dicas.
3. Trocar o atendente recalcula.

### Edge Cases
- Etapa sem cliente: fora do desenho do funil, mas na legenda e na tabela com 0 e "—".
- Base vazia: "Nenhum cliente com compra."
- Cliente com venda há exatamente 90 dias não é parado; há 91, é.

### Cenário de Erro
- Ação devolve nulo: "Não foi possível carregar o funil. Tente novamente."

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B34-09 | automática | `src/test/relatorios-funil-clientes.test.tsx` | 17, 7, 2, 0…; conversões 41,2% e 28,6%; ticket médio de 2+ R$ 228,57 |
| CA-B34-10 | automática | `src/test/relatorios-funil-clientes.test.tsx` | 91 dias é parado, 90 não: etapa 2+ com 1 parado |
| CA-B34-11 | automática | `src/test/relatorios-funil-clientes.test.tsx` | Clicar na aba mostra funil, legenda, taxas, tabela e dicas |
| CA-B34-12 | manual | roteiro abaixo | Abas Coorte e Funil aprovadas em produção |

### Roteiro manual — CA-B34-12
1. Entrar na "[TESTE] Automações B11" e abrir Relatórios → Coorte, no computador e no celular: retenção média geral, gráfico de recompra, tabelas com cor por intensidade (alternar Retenção / Valor médio), Exportar e o Entenda.
2. Abrir Relatórios → Funil de clientes: funil colorido com as etapas, legenda com parados, taxas, tabela, "O que são clientes parados?" e dicas.
3. Tudo legível no tema escuro; números coerentes com a base da empresa de teste.

## Banco de Dados

Não se aplica.

## Arquivos

- **Criar:** `src/lib/relatorios/funil-clientes.ts` — cálculo puro das etapas, conversões, ticket médio e parados.
- **Modificar:** `src/app/(auth)/relatorios/actions.ts` — `buscarFunilClientes`.
- **Criar:** `src/app/(auth)/relatorios/components/funil-clientes-client.tsx` — a aba.
- **Modificar:** `src/app/(auth)/relatorios/components/relatorios-client.tsx` — aba Funil de clientes ativa; só Carteiras fica "em breve".
- **Modificar:** `src/test/relatorios-tela.test.tsx` — CA-B32-24 passa a esperar uma aba futura.
- **Criar:** `src/test/relatorios-funil-clientes.test.tsx` — CA-B34-09, 10 e 11.

## Dependências Externas

- `recharts` — `FunnelChart`, já instalado.

## Checklist

- [x] Lib do funil
- [x] Ação e aba Funil de clientes com funil, legenda, taxas, tabela, explicação e dicas
- [x] Testes automáticos passando; roteiro manual do CA-B34-12 registrado

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B34-12 | Marcelle | 25/10/2026 |
