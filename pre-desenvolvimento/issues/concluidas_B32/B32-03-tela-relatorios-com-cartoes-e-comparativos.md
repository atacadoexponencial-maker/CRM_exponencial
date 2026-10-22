# B32-03: Tela Relatórios com os cartões e comparativos

**Tipo:** Implementação
**Página:** Relatórios (`/relatorios`), menu lateral e barra do celular
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-relatorios-visao-geral.md`

## Descrição

Nasce a tela Relatórios: item no menu para todos os papéis, abas (Visão Geral ativa, as outras quatro desativadas com "em breve"), cabeçalho com o período e o aviso de comparação justa, atalhos Ontem / Mês anterior / Este mês, filtro de mês e ano (um ou vários meses do mesmo ano) e de atendente (Admin e Gerente; o Atendente já entra filtrado por ele). Na aba, os dez cartões de resumo com os comparativos "vs mês passado" e "vs ano passado" em verde e vermelho, seguindo o vocabulário da spec. Usa o cálculo de período da B32-01.

## Pronto quando

Na empresa de teste, com vendas semeadas neste mês, no mês passado e no mesmo mês do ano passado, abrir /relatorios mostra o mês atual, os dez cartões com os valores certos e os comparativos. Os atalhos e os filtros mudam os números. Logada como Atendente, a tela mostra só as vendas dela e sem o filtro de atendente.

## Critérios de aceite

- **CA-B32-01** (automática) — Relatórios aparece no menu para todos os papéis. Dado um usuário Admin, Gerente ou Atendente logado, quando ele olha o menu lateral, então há o item "Relatórios" logo abaixo de "Pedidos", e ele leva a `/relatorios` (era abaixo de "Dashboard"; mudado a pedido da Marcelle no preview da B36, 22/10).
- **CA-B32-24** (automática) — Abas futuras aparecem desativadas. Dado a tela Relatórios aberta, quando o usuário olha as abas, então "Visão Geral" está ativa e "RFV", "Coorte", "Funil de clientes" e "Carteiras" aparecem desativadas com "em breve", e clicar nelas não muda a tela.
- **CA-B32-02** (automática) — Abrir a tela mostra o mês atual até hoje. Dado vendas registradas neste mês e no mês passado, quando o usuário abre `/relatorios`, então o cabeçalho diz o mês e o ano atuais e os números só contam as vendas de 1º do mês até hoje.
- **CA-B32-03** (automática) — Atalhos Ontem, Mês anterior e Este mês. Dado a tela aberta, quando o usuário clica em "Ontem", "Mês anterior" ou "Este mês", então o cabeçalho e os números passam a refletir, respectivamente, só o dia de ontem, o mês passado inteiro e o mês atual até hoje.
- **CA-B32-04** (automática) — Vários meses somam e escondem os comparativos. Dado a tela aberta, quando o usuário escolhe Janeiro a Março do ano atual, então os cartões mostram a soma dos três meses e nenhum cartão exibe "vs mês passado" ou "vs ano passado".
- **CA-B32-05** (automática) — Atendente vê só as vendas dele. Dado vendas de dois atendentes no mês, quando um deles, com papel Atendente, abre `/relatorios`, então todos os blocos contam só as vendas dele e não há filtro de atendente na tela.
- **CA-B32-06** (automática) — Filtro de atendente para Admin e Gerente. Dado vendas de dois atendentes no mês, quando o Admin escolhe um deles no filtro, então todos os blocos passam a contar só as vendas daquele atendente.
- **CA-B32-07** (automática) — Os dez cartões com os valores certos. Dado no mês atual 3 vendas de 2 contatos, valores R$ 100, R$ 200 e R$ 300, descontos R$ 10, R$ 0 e vazio, peças 2, 3 e vazio, quando o usuário abre a Visão Geral, então os cartões mostram: positivados 2, vendas 3, bruto R$ 610,00, descontos R$ 10,00, líquido R$ 600,00, ticket por cliente R$ 300,00, por venda R$ 200,00, por peça R$ 120,00, peças por cliente 2,50 e peças 5.
- **CA-B32-08** (automática) — Comparativo com o mês passado e com o ano passado. Dado faturamento líquido de R$ 600 neste mês até hoje, R$ 500 no mesmo recorte do mês passado e R$ 800 no mesmo recorte do mesmo mês do ano passado, quando o usuário olha o cartão Faturamento líquido, então ele mostra "vs mês passado: +20,0%" em verde e "vs ano passado: −25,0%" em vermelho.
- **CA-B32-09** (automática) — Comparação justa até o dia anterior. Dado hoje é dia 20, com vendas no dia 20 deste mês e no dia 20 do mês passado, quando o cartão calcula "vs mês passado", então as vendas do dia 20 ficam fora dos dois lados da comparação e o cabeçalho avisa "Comparativos até o dia 19".
- **CA-B32-10** (automática) — Sem base de comparação mostra traço. Dado nenhuma venda no mesmo mês do ano passado, quando o usuário olha qualquer cartão, então "vs ano passado" mostra "—", sem percentual nem cor.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B32-01 | "Qtd de pedidos" do Tailor vira "Qtd de vendas", contando toda compra do contato, de qualquer origem. | confirmada | Marcelle, 21/10/2026 |
| SUP-B32-02 | "Qtd de produtos" do Tailor vira "Qtd de peças", a soma das peças informadas nas vendas; venda sem peças conta zero. | confirmada | Marcelle, 21/10/2026 |
| SUP-B32-03 | Faturamento bruto = valor pago + desconto, já que o valor da compra é líquido (SUP-B30-01). | confirmada | Marcelle, 21/10/2026 |
| SUP-B32-06 | Enquanto só a Visão Geral existe, a tela não mostra abas; a estrutura fica pronta e as abas aparecem quando a segunda nascer. | invalidada | As abas futuras aparecem desativadas, com "em breve". Marcelle, 21/10/2026 |
| SUP-B32-07 | A seleção de meses é dentro de um mesmo ano, como no Tailor. Período livre por datas não entra. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B32-01 | O comparativo "vs ano passado" compara com o mesmo mês do ano anterior (Out/2025 contra Out/2026). Confirma? A alternativa seria o acumulado do ano. | respondida | Sim, mesmo mês do ano anterior. Marcelle, 21/10/2026 |

## Cenários

### Happy Path
1. Admin clica em "Relatórios" no menu (abaixo de Dashboard) e abre `/relatorios`.
2. A página do servidor carrega a Visão Geral do mês atual (`buscarVisaoGeral` com o período padrão) e a lista de atendentes.
3. A tela mostra as abas (Visão Geral ativa; RFV, Coorte, Funil de clientes e Carteiras desativadas com "em breve"), o cabeçalho "Mês: Outubro | Ano: 2026", o aviso "Comparativos até o dia 20, para comparar períodos iguais", os atalhos, os filtros e os dez cartões.
4. Cada cartão traz o valor do período e, com um mês só, "vs mês passado" e "vs ano passado" com cor (verde sobe, vermelho cai) e, no mouse, o valor do período comparado.
5. Trocar atalho ou filtro chama a ação de novo (transição, com o spinner) e substitui os números.

### Edge Cases
- Vários meses do mesmo ano: cartões somam e não mostram comparativos.
- Atendente: a tela abre filtrada por ele (a ação ignora `atendenteId` de quem é atendente) e o filtro de atendente não aparece.
- "Ontem": o período é só o dia de ontem; o comparativo usa o mesmo dia do mês passado e do ano passado.
- Período que inclui hoje: a comparação justa vai até ontem (D-1) nos três lados; o cabeçalho avisa. No dia 1º não há dia anterior no mês: os comparativos ficam "—" e o aviso diz isso.
- Divisão por zero (sem cliente, sem venda, sem peça) mostra "—". Comparativo sem base (zero no período comparado) mostra "—".
- Compra de contato na lixeira não conta (mesma regra do Dashboard).

### Cenário de Erro
- A ação devolve nulo (sem sessão): a tela mostra "Não foi possível carregar o relatório. Tente novamente." e mantém os números anteriores.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B32-01 | automática | `src/test/relatorios-tela.test.tsx` | O menu renderizado para admin, gerente e atendente tem o link "Relatórios" para `/relatorios`, logo depois de "Pedidos" |
| CA-B32-24 | automática | `src/test/relatorios-tela.test.tsx` | A tela tem a aba "Visão Geral" selecionada e as outras quatro desativadas com "em breve"; clicar nelas não muda a aba |
| CA-B32-02 | automática | `src/test/relatorios-visao-geral.test.ts` | `periodoPadrao(hoje)` é o mês/ano de hoje e o cálculo com ele só conta as vendas de 1º até hoje |
| CA-B32-03 | automática | `src/test/relatorios-tela.test.tsx` | Clicar em "Ontem", "Mês anterior" e "Este mês" chama a ação com o período certo e o cabeçalho acompanha |
| CA-B32-04 | automática | `src/test/relatorios-visao-geral.test.ts` | Com Janeiro a Março, os cartões somam os três meses e todos os comparativos são nulos (a tela não os desenha) |
| CA-B32-05 | automática | `src/test/relatorios-visao-geral.integration.test.ts` | Logado como Atendente, `buscarVisaoGeral` só conta as vendas dele mesmo pedindo outro atendente; a tela com papel atendente não tem o filtro |
| CA-B32-06 | automática | `src/test/relatorios-visao-geral.integration.test.ts` | Logado como Admin com `atendenteId`, `buscarVisaoGeral` só conta as vendas daquele atendente |
| CA-B32-07 | automática | `src/test/relatorios-visao-geral.test.ts` | Os dez valores do exemplo do critério |
| CA-B32-08 | automática | `src/test/relatorios-visao-geral.test.ts` | +20,0% e −25,0% no faturamento líquido, com a direção (sobe/cai) |
| CA-B32-09 | automática | `src/test/relatorios-visao-geral.test.ts` | Hoje dia 20: vendas do dia 20 ficam fora dos dois lados e o aviso diz "até o dia 19" |
| CA-B32-10 | automática | `src/test/relatorios-visao-geral.test.ts` | Sem venda no ano passado, o comparativo é nulo e a tela mostra "—" |

## Banco de Dados

Não se aplica: lê `contact_purchases`, `contacts` (lixeira) e `pipeline_cards` (contatos do atendente) que já existem.

## Arquivos

- **Criar:** `src/lib/relatorios/visao-geral.ts` — tipos do período (`PeriodoRelatorio`: meses de um ano, ou "ontem"), `periodoPadrao`, `intervaloDoPeriodo`, comparação justa, `calcularCartoes` (dez cartões com comparativos) e formatação do cabeçalho. Puro, sem banco.
- **Criar:** `src/app/(auth)/relatorios/actions.ts` — `buscarVisaoGeral(filtro)`: sessão, compras da empresa (sem lixeira), regra do atendente (B30-03, `compraEhDoAtendente`), chama o cálculo.
- **Criar:** `src/app/(auth)/relatorios/page.tsx` — carrega o padrão e os atendentes e monta a tela.
- **Criar:** `src/app/(auth)/relatorios/loading.tsx` — esqueleto.
- **Criar:** `src/app/(auth)/relatorios/components/relatorios-client.tsx` — abas, cabeçalho, atalhos, filtros (mês/ano múltiplo e atendente) e transição.
- **Criar:** `src/app/(auth)/relatorios/components/cartoes-resumo.tsx` — os dez cartões com comparativos.
- **Modificar:** `src/components/shared/sidebar-nav.tsx` — item "Relatórios" abaixo de "Dashboard".
- **Criar:** `src/test/relatorios-visao-geral.test.ts` — testes puros da tabela Prova.
- **Criar:** `src/test/relatorios-tela.test.tsx` — testes de tela (menu, abas, atalhos, filtro do atendente).
- **Criar:** `src/test/relatorios-visao-geral.integration.test.ts` — testes da ação com Supabase real.

## Dependências Externas

Nenhuma.

## Checklist

- [x] Lib pura com período, comparação justa e os dez cartões
- [x] Ação `buscarVisaoGeral` com a regra do atendente
- [x] Rota `/relatorios` com abas, cabeçalho, atalhos, filtros e cartões
- [x] Item "Relatórios" no menu para todos os papéis
- [x] Testes puros, de tela e de integração passando
