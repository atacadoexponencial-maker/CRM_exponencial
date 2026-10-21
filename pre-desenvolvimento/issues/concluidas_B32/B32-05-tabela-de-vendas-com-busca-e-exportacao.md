# B32-05: Tabela de vendas do período com busca e exportação

**Tipo:** Implementação
**Página:** Relatórios (`/relatorios`), aba Visão Geral
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-relatorios-visao-geral.md`

## Descrição

Entra a tabela com cada venda do período (contato com link para o perfil, telefone, data, origem com o número do pedido, atendente, cidade, UF, peças, forma de pagamento e valor), as 50 mais recentes com "Ver todas (N)", busca pelo nome do contato e botão Exportar que baixa a planilha de todas as vendas do período no padrão da B30-04, respeitando o filtro de atendente. Depende da B32-02 (UF) e da B32-03 (tela e filtros).

## Pronto quando

Na empresa de teste, a tabela lista as vendas semeadas do mês, da mais recente para a mais antiga; digitar parte de um nome filtra; Exportar baixa a planilha com as mesmas linhas e colunas, com data e valor como data e número.

## Critérios de aceite

- **CA-B32-15** (automática) — A tabela lista as vendas do período. Dado 3 vendas no mês e 1 no mês passado, quando o usuário abre a Visão Geral do mês atual, então a tabela tem 3 linhas, da mais recente para a mais antiga, cada uma com contato, telefone, data, origem, atendente, cidade, UF, peças, forma de pagamento e valor.
- **CA-B32-16** (automática) — Busca por contato. Dado vendas dos contatos "Loja da Ana" e "Bazar do Bruno", quando o usuário digita "ana", então só a linha da "Loja da Ana" permanece.
- **CA-B32-17** (automática) — Exportar baixa as vendas do período. Dado 3 vendas no período, quando o usuário clica em Exportar, então baixa uma planilha com 3 linhas e as mesmas colunas da tabela, com data e valor reconhecidos como data e número.

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B32-02 | A tabela de vendas mostra a cidade do contato. Vale a pena também a coluna "Telefone", como no Tailor? | respondida | Sim, com a coluna de telefone, na tela e na planilha. Marcelle, 21/10/2026 |

## Cenários

### Happy Path
1. A ação `buscarVisaoGeral` passa a devolver `tabela`: todas as vendas do período, da mais recente para a mais antiga, cada uma com contato (id e nome), telefone, data, origem e número do pedido, atendente, cidade, UF, peças, forma de pagamento e valor.
2. Abaixo dos gráficos, o bloco "Vendas" mostra as 50 mais recentes e o botão "Ver todas (N)" mostra o restante. O nome do contato é link para o perfil.
3. Digitar na busca filtra pelo nome do contato (sem acento e sem diferença de maiúsculas, com `contemTermo`).
4. "Exportar" abre `GET /relatorios/vendas/exportar?...` com o período e o atendente da tela; a rota monta a planilha com `gerarPlanilha` (B30-04) e baixa `vendas-<período>.xlsx`.

### Edge Cases
- Contato sem telefone, cidade ou UF: célula "—" na tela e vazia na planilha.
- Venda do catálogo: origem "Catálogo #123"; manual e externa sem número.
- Busca que não acha nada: "Nenhuma venda com esse nome."; período sem venda: "Sem vendas no período."
- A rota de exportação respeita a regra do atendente (um Atendente só exporta as próprias vendas) porque usa a mesma ação.
- Período inválido na URL (mês fora de 1–12, ano não numérico): 400.

### Cenário de Erro
- Sem sessão, a rota devolve 401 e a tela, ao exportar, cai no login.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B32-15 | automática | `src/test/relatorios-tabela.test.tsx` | `vendasDoPeriodo` devolve só as do mês, da mais recente à mais antiga, e a tabela renderiza as colunas na ordem da spec |
| CA-B32-16 | automática | `src/test/relatorios-tabela.test.tsx` | Digitar "ana" deixa só a linha da "Loja da Ana" |
| CA-B32-17 | automática | `src/test/relatorios-exportar.integration.test.ts` | A rota baixa um .xlsx com 3 linhas e as colunas da tabela, data como data e valor como número |

## Banco de Dados

Não se aplica.

## Arquivos

- **Modificar:** `src/lib/relatorios/visao-geral.ts` — `VendaRow` ganha os dados do contato, atendente, origem e pedido; `vendasDoPeriodo` (ordenada, com link e origem formatada) e o tipo `VendaDaTabela`.
- **Criar:** `src/lib/relatorios/exportar-vendas.ts` — colunas da planilha de vendas (mesma ordem da tabela) e `periodoDaUrl`/`urlDeExportacao` (período ↔ query string).
- **Modificar:** `src/app/(auth)/relatorios/actions.ts` — seleciona contato, atendente e pedido; devolve `tabela`; exporta `buscarVendasDoPeriodo` para a rota.
- **Criar:** `src/app/(auth)/relatorios/vendas/exportar/route.ts` — GET que baixa a planilha.
- **Criar:** `src/app/(auth)/relatorios/components/tabela-vendas.tsx` — tabela com busca, "Ver todas" e Exportar.
- **Modificar:** `src/app/(auth)/relatorios/components/relatorios-client.tsx` — desenha a tabela abaixo dos gráficos e passa o filtro atual ao Exportar.
- **Modificar:** `src/test/relatorios-tela.test.tsx` — o `visao()` de apoio ganha `tabela`.
- **Modificar:** `src/test/relatorios-graficos.test.tsx` — o `montar()` de apoio ganha `tabela`.
- **Criar:** `src/test/relatorios-tabela.test.tsx` — CA-B32-15 e CA-B32-16.
- **Criar:** `src/test/relatorios-exportar.integration.test.ts` — CA-B32-17.

## Dependências Externas

- `xlsx` — já instalado (B30-04).

## Checklist

- [x] Lib: vendas do período ordenadas e colunas da planilha
- [x] Ação com os dados do contato, atendente e pedido; rota de exportação
- [x] Tabela com busca, "Ver todas (N)", link para o perfil e Exportar
- [x] Testes passando
