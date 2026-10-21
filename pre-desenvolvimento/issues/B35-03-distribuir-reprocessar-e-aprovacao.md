# B35-03: Distribuir, reprocessar pela última venda e aprovação da aba

**Tipo:** Implementação
**Página:** Relatórios (`/relatorios`), aba Carteiras
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-relatorios-carteiras.md`

## Descrição

No bloco de quem está sem vendedor: Distribuir entre vendedores (diálogo com os vendedores marcados, todos ou só com compra, rodízio na ordem de cadastro) e Reprocessar pela última venda (cada contato sem dono ganha o atendente da última venda dele). Ambas confirmam, gravam no histórico e sincronizam os cards. Com a aba completa, a Marcelle aprova em produção. Depende da B35-01.

## Pronto quando

Na empresa de teste, distribuir os sem vendedor entre dois usuários divide em rodízio; reprocessar dá dono a quem tem venda com atendente; o histórico registra; a Marcelle aprova a aba.

## Critérios de aceite

- **CA-B35-08** (automática) — Distribuir em rodízio. Dado 5 contatos sem vendedor (3 com compra, 2 leads) e os vendedores Ana e Bruno marcados, quando o Admin distribui "todos" e confirma, então a Ana recebe 3 e o Bruno 2 (ou o contrário, pela ordem de cadastro), nenhum contato que já tinha dono muda, e o histórico ganha 5 linhas "ninguém → Ana/Bruno · distribuição".
- **CA-B35-09** (automática) — Distribuir só os com compra. Dado os mesmos 5 contatos, quando o Admin distribui "só com compra", então só os 3 com compra ganham vendedor e os 2 leads continuam sem.
- **CA-B35-10** (automática) — Reprocessar pela última venda. Dado 3 contatos sem vendedor: um com última venda do Bruno, um com vendas sem atendente e um lead, quando o Admin reprocessa e confirma, então só o primeiro passa a ser do Bruno (cards incluídos), os outros dois continuam sem vendedor, e o histórico ganha 1 linha "ninguém → Bruno · última venda".
- **CA-B35-13** (manual) — A aba Carteiras aprovada pela Marcelle em produção. Dado a empresa "[TESTE] Automações B11", quando a Marcelle abre a aba Carteiras, transfere uma carteira, desfaz transferindo de volta e distribui os sem vendedor, então os números acompanham, o histórico registra cada passo e tudo é legível no tema escuro, no computador e no celular.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B35-03 | Distribuir usa rodízio simples na ordem de cadastro do contato, sem tentar igualar carteiras que já existem. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.
