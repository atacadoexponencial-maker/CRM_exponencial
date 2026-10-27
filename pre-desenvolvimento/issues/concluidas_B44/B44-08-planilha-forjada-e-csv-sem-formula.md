# B44-08: Planilha forjada recusada e CSV de pedidos sem fórmula

**Tipo:** Implementação
**Página:** Catálogo → importar e pedidos
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-4.md`

## Descrição

A importação de produtos recusa, antes de ler, o arquivo que declara mais linhas que o limite de hoje, e o CSV de pedidos marca como texto as células que começam com =, +, - ou @.

## Pronto quando

Um arquivo de poucos KB que declara milhões de linhas é recusado em segundos com aviso, a planilha modelo continua importando, e um pedido com nome `=1+1` aparece como texto no CSV.

## Critérios de aceite

- **CA-B44-29** (automática) — Planilha que declara tamanho gigante é recusada sem travar. Dado um arquivo de planilha pequeno (poucos KB) que declara muito mais que 1.000 linhas, quando o Gerente importa esse arquivo, então a tela avisa em poucos segundos que a planilha passa do limite de 1.000 produtos, e nada é importado
- **CA-B44-30** (automática) — Planilha normal continua importando. Dado a planilha modelo preenchida com 3 produtos, quando o Gerente importa, então a prévia mostra os 3 produtos, como hoje
- **CA-B44-31** (automática) — CSV de pedidos não vira fórmula. Dado um pedido da loja feito com o nome `=1+1` (ou começando com `+`, `-` ou `@`), quando o Gerente exporta os pedidos em CSV, então a célula do cliente mostra o texto `=1+1`, não o resultado 2 (o CSV marca a célula como texto)

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B44-05 | Limite da planilha importada: até 1.000 linhas (como hoje) e até 50 colunas. Uma planilha que declara mais do que isso é recusada antes de ser lida | invalidada | Marcelle, 27/10/2026: não criar limite novo. Fica o de hoje (1.000 linhas de produto, só a importação do catálogo) e **nenhum limite de colunas**. A série só recusa o arquivo que declara mais linhas do que o limite de hoje antes de ser lido (CA-B44-29) |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. O Gerente importa a planilha modelo: o servidor lê as células que existem de verdade, monta a matriz só com elas e mostra a prévia, como hoje.
2. O Gerente exporta os pedidos em CSV: as células de texto que começam com `=`, `+`, `-`, `@`, tabulação ou retorno ganham um apóstrofo na frente, que o Excel e o Google Planilhas leem como "isto é texto".

### Edge Cases
- Arquivo pequeno que declara uma área gigante (`<dimension ref="A1:XFD1048576">`) mas só tem células no começo: a matriz fica do tamanho das células reais, sem expandir a área declarada. Planilha com formatação sobrando continua importando.
- Arquivo com célula além da linha 1.001 (cabeçalho + 1.000 produtos): recusado antes de expandir, com o aviso de limite de hoje.
- Nenhum limite de colunas é criado (SUP-B44-05 invalidada): a matriz só cobre as colunas que têm célula.
- No CSV, valores de moeda, número, data e percentual não mudam; só o texto ganha o apóstrofo, e só quando começa com um daqueles caracteres.

### Cenário de Erro
- Planilha acima do limite: "A planilha passa de 1.000 linhas." e nada é importado.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B44-29 | automática | `src/test/planilha-e-csv-seguros.test.ts` | arquivo de poucos KB com célula na linha 50.000 e área declarada até XFD1048576 é recusado em menos de 2 segundos com o aviso de limite, sem montar a matriz |
| CA-B44-30 | automática | `src/test/planilha-e-csv-seguros.test.ts` | a planilha modelo com 3 produtos vira 3 produtos na leitura, mesmo com área declarada gigante sem células |
| CA-B44-31 | automática | `src/test/planilha-e-csv-seguros.test.ts` | no CSV de pedidos, o cliente `=1+1` (e `+`, `-`, `@`) sai como `'=1+1`, e as colunas de valor não mudam |

## Arquivos

- **Modificar:** `src/lib/catalogo/importacao.ts` — `lerArquivoPlanilha` mede as células reais, recusa acima do limite com `ErroPlanilhaGrande` e lê só a área real
- **Modificar:** `src/app/(auth)/catalogo/importar/actions.ts` — `ErroPlanilhaGrande` vira o aviso de limite de linhas
- **Modificar:** `src/lib/exportar-planilha.ts` — `gerarCsv` neutraliza texto que começa com caractere de fórmula
- **Criar:** `src/test/planilha-e-csv-seguros.test.ts` — CA-B44-29 a 31

## Checklist

- [x] Leitura pelas células reais e recusa acima do limite
- [x] Aviso de limite na importação
- [x] CSV sem fórmula
- [x] Testes do CA-B44-29 a 31
