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

## Cenários

### Happy Path
1. No bloco "Sem vendedor", "Distribuir entre vendedores" abre o diálogo com todos os vendedores marcados e a escolha "todos" ou "só com compra"; o Confirmar chama `distribuirSemVendedor(ids, soComCompra)`.
2. No servidor: Admin ou Gerente; vendedores marcados da mesma empresa e ativos; contatos sem vendedor fora da lixeira (só com compra, se pedido) na ordem de cadastro, um para cada vendedor em rodízio; contatos e cards atualizados; histórico com "distribuição".
3. "Reprocessar pela última venda" confirma e chama `reprocessarPelaUltimaVenda()`: para cada contato sem vendedor, a última venda (data mais recente; empate pela mais recente registrada) com atendente define o dono; sem venda com atendente, continua sem; histórico com "última venda".
4. A aba recarrega.

### Edge Cases
- Nenhum vendedor marcado ou nenhum contato elegível: Confirmar desabilitado; no servidor, "Escolha ao menos um vendedor." ou quantidade 0.
- Vendedor marcado inativo ou de outra empresa: "Vendedor não encontrado".
- Atendente: "Sem permissão".

### Cenário de Erro
- Falha no banco: "Não foi possível distribuir/reprocessar. Tente novamente."

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B35-08 | automática | `src/test/relatorios-carteiras-distribuir.integration.test.ts` | 5 sem vendedor entre Ana e Bruno: 3 e 2 em rodízio pela ordem de cadastro, quem tinha dono não muda, 5 linhas "ninguém → … · distribuição" |
| CA-B35-09 | automática | `src/test/relatorios-carteiras-distribuir.integration.test.ts` | "Só com compra": os 3 com compra ganham vendedor, os 2 leads não |
| CA-B35-10 | automática | `src/test/relatorios-carteiras-distribuir.integration.test.ts` | Só o contato com última venda do Bruno passa a ser dele (card incluído); 1 linha "ninguém → Bruno · última venda" |
| CA-B35-13 | manual | roteiro abaixo | Aba Carteiras aprovada em produção |

### Roteiro manual — CA-B35-13
1. Entrar na "[TESTE] Automações B11" e abrir Relatórios → Carteiras, no computador e no celular.
2. Conferir a visão geral, os cartões por usuário e o bloco "Sem vendedor".
3. Transferir a carteira de um usuário para outro; conferir os números e o histórico; transferir de volta.
4. Distribuir os sem vendedor entre dois usuários; conferir que os números subiram e o histórico registrou "distribuição". Remover da carteira para voltar ao estado anterior, se quiser.
5. Tudo legível no tema escuro.

## Banco de Dados

Não se aplica (usa `carteira_historico`).

## Arquivos

- **Modificar:** `src/app/(auth)/relatorios/actions.ts` — `distribuirSemVendedor` e `reprocessarPelaUltimaVenda`.
- **Criar:** `src/app/(auth)/relatorios/components/acoes-sem-vendedor.tsx` — os dois diálogos.
- **Modificar:** `src/app/(auth)/relatorios/components/carteiras-client.tsx` — botões no bloco "Sem vendedor" (só gestor) e recarga.
- **Criar:** `src/test/relatorios-carteiras-distribuir.integration.test.ts` — CA-B35-08, 09 e 10.

## Dependências Externas

Nenhuma.

## Checklist

- [x] Ações de distribuir e reprocessar no servidor, com histórico e sincronia dos cards
- [x] Diálogos no bloco "Sem vendedor"
- [x] Testes automáticos passando; roteiro manual do CA-B35-13 registrado

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B35-13 | Marcelle | 25/10/2026 |
