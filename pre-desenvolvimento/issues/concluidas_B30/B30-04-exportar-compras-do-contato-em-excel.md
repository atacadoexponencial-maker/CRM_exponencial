# B30-04: Exportar o histórico de compras do contato em Excel

**Tipo:** Implementação
**Página:** Perfil do contato (histórico de compras)
**Spec:** `pre-desenvolvimento/spec-fundacao-da-venda.md`

## Descrição

O histórico de compras do perfil ganha o botão "Exportar", que baixa uma planilha Excel
com as mesmas colunas da tabela (Data, Valor, Peças, Desconto, Forma de pagamento,
Atendente, Origem, Pedido), uma linha por compra, na ordem da tela. Contato sem compras
baixa só o cabeçalho. Datas e valores saem reconhecidos como data e número. Atendente só
exporta o que ele já pode ver. Esta é a prova do padrão de exportação que as telas de
relatório seguintes vão repetir.

Depende da B30-01 e da B30-02 (as colunas e as duas origens).

## Pronto quando

No perfil de um contato com três compras, clicar em "Exportar" baixa um arquivo que abre
no Excel e no Google Planilhas com o cabeçalho e as três linhas na ordem da tela, com data
e valor tratados como data e número. Num contato sem compras, baixa só o cabeçalho, sem erro.

## Critérios de aceite

- **CA-B30-13** (automática) — Exportar baixa a planilha com as compras. Dado um contato com três compras no histórico, quando o usuário clica em "Exportar", então baixa um arquivo Excel com cabeçalho (Data, Valor, Peças, Desconto, Forma de pagamento, Atendente, Origem, Pedido) e três linhas, na mesma ordem da tela.
- **CA-B30-14** (automática) — Exportar sem compras gera só o cabeçalho. Dado um contato sem compras, quando o usuário clica em "Exportar", então baixa um arquivo Excel só com o cabeçalho, sem erro.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B30-09 | A exportação em Excel abre no Excel e no Google Planilhas, com datas e valores reconhecidos como data e número, não como texto. | confirmada | Marcelle, 20/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|

Nenhuma.

## Cenários

### Happy Path
1. No perfil do contato, ao lado de "Registrar compra", aparece o botão "Exportar" (para todos os papéis; o atendente só chega ao perfil dos contatos dele, B21-02).
2. O botão é um link para `GET /contatos/<id>/compras/exportar`. A rota confere a sessão, carrega o contato com `buscarDadosContato` (já passa pelo RLS e devolve `null` para quem não pode ver) e monta a planilha com `gerarPlanilha` (`src/lib/exportar-planilha.ts`), o padrão de exportação da série: cabeçalho, uma linha por item, datas como célula de data (`dd/mm/aaaa`) e valores como número (`#,##0.00`).
3. As colunas são as da tabela da tela, na ordem da tela (mais recente primeiro): Data, Valor, Peças, Desconto, Forma de pagamento, Atendente, Origem, Pedido. "Pedido" leva o número do pedido do catálogo (ex.: `#1001`) ou vazio.
4. O arquivo baixa como `compras-<nome-do-contato>.xlsx`, aba "Compras".

### Edge Cases
- Contato sem compras: a planilha sai só com o cabeçalho, sem erro (CA-B30-14).
- Campo vazio (peças, desconto, forma, atendente): célula vazia, não "—".
- Nome do contato com acento ou símbolo: o nome do arquivo é normalizado para ASCII e sem espaços.

### Cenário de Erro
- Sem sessão: 401. Contato inexistente, na lixeira ou de outro atendente/empresa: 404 "Contato não encontrado.". Id fora do formato uuid: 404.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B30-13 | automática | `src/test/exportar-compras.test.ts` e `src/test/exportar-compras.integration.test.ts` | Planilha gerada para três compras tem o cabeçalho esperado e três linhas na ordem da tela, com data como data e valor como número; a rota devolve o `.xlsx` como anexo |
| CA-B30-14 | automática | `src/test/exportar-compras.test.ts` e `src/test/exportar-compras.integration.test.ts` | Contato sem compras: a rota responde 200 com uma planilha que tem só a linha de cabeçalho |

## Arquivos

- **Criar:** `src/lib/exportar-planilha.ts` — padrão de exportação: `gerarPlanilha(colunas, linhas, aba)` devolve os bytes do `.xlsx` com tipos de célula (data, número, texto); `nomeDeArquivo(base)` normaliza o nome.
- **Criar:** `src/lib/exportar-compras.ts` — `COLUNAS_EXPORTACAO_COMPRAS` e `linhasDeCompras(compras)`: transforma as compras do perfil nas linhas da planilha.
- **Criar:** `src/app/(auth)/contatos/[id]/compras/exportar/route.ts` — rota GET que baixa a planilha do contato.
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — botão "Exportar" no cabeçalho do histórico de compras.
- **Criar:** `src/test/exportar-compras.test.ts` — testes unitários do gerador e das linhas.
- **Criar:** `src/test/exportar-compras.integration.test.ts` — testes da rota com Supabase real.

## Dependências Externas

- `xlsx` (SheetJS 0.20.3, já instalado) — gera o arquivo `.xlsx`.

## Checklist

- [x] `gerarPlanilha` e `nomeDeArquivo` em `src/lib/exportar-planilha.ts`
- [x] Colunas e linhas das compras em `src/lib/exportar-compras.ts`
- [x] Rota `GET /contatos/[id]/compras/exportar` com sessão e 404 para contato invisível
- [x] Botão "Exportar" no histórico de compras do perfil
- [x] Testes da tabela Prova escritos e passando
- [x] `npm run build` e `npx eslint src --quiet` limpos
