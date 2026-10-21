# B31-04: Regras de venda na planilha de importação

**Tipo:** Implementação
**Página:** Importar produtos por planilha (`/catalogo`, B18)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-regras-de-venda-do-catalogo.md`

## Descrição

O modelo de planilha da B18 ganha três colunas opcionais: faixas de preço
("12=24,90;48=21,90"), mínimo por produto e grade fechada ("P1 M2 G2 GG1"). A prévia
da importação lê as colunas, mostra o erro na linha com regra inválida sem travar as
outras, e o produto importado nasce com as regras, com as mesmas conferências do editor.

Depende da B31-01 e da B31-03 (as regras existem no produto).

## Pronto quando

Na empresa de teste, baixar o modelo traz as três colunas novas. Importar uma planilha
com uma linha completa cria o produto com faixas, mínimo e grade; uma linha com
"12=31,00" (acima do preço) aparece na prévia como erro só daquela linha, e as outras
entram.

## Critérios de aceite

- **CA-B31-04** (automática) — Regras na planilha de importação. Dado o modelo de planilha da B18 com as colunas opcionais de faixas de preço, mínimo e grade, quando o lojista importa uma linha com "12=24,90;48=21,90", mínimo 6 e grade "P1 M2 G2 GG1", então o produto nasce com as três regras, e linha com faixa inválida aparece na prévia como erro daquela linha, sem travar as outras.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B31-07 | No máximo 3 faixas de preço por produto e 3 linhas de desconto por pedido na loja. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|

Nenhuma.

## Cenários

### Happy Path
1. O modelo (`/catalogo/importar/modelo`) ganha quatro colunas opcionais no fim: "Preço por quantidade" ("12=24,90;48=21,90"), "Mínimo de peças" ("6"), "Grade fechada" ("P1 M2 G2 GG1") e "Preço da grade" ("150,00"). A aba "Como preencher" explica cada uma; a tabela de colunas da tela de importar também.
2. A leitura da planilha (`interpretarPlanilha`) entende as colunas, confere cada regra com as mesmas funções do editor (`validarFaixas`, `validarMinimo`, `validarGrade`) e registra o erro na linha do produto, sem travar os outros.
3. A prévia mostra, no produto que já existe, o que muda ("Preço por quantidade muda", "Mínimo 6 peças", "Grade fechada P 1 · M 2 · G 2 · GG 1").
4. Gravar manda as regras na função do banco: produto novo nasce com elas; produto existente só muda as colunas que vieram preenchidas (vazio mantém, como as fotos).

### Edge Cases
- Coluna vazia num produto existente: mantém a regra atual. Para tirar uma regra pelo CRM, usa-se o editor.
- "Grade fechada" com opção que não existe no primeiro tipo (ex.: "XG 1" num produto P/M/G) → erro da linha.
- "Preço da grade" sem "Grade fechada" → erro da linha.
- Faixa "12=31,00" acima do preço → erro da linha, os outros produtos entram (CA-B31-04).
- Planilha antiga (sem as colunas) continua funcionando: nenhuma coluna é obrigatória.

### Cenário de Erro
- Formato errado ("12-24,90", "P um") → "Linha N: em "Preço por quantidade", use quantidade=preço separados por ponto e vírgula (ex.: 12=24,90;48=21,90)." / "em "Grade fechada", use opção e quantidade (ex.: P1 M2 G2 GG1)".

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B31-04 | automática | `src/test/catalogo-planilha.test.ts` | a linha com "12=24,90;48=21,90", mínimo 6 e grade "P1 M2 G2 GG1" vira produto com as três regras; "12=31,00" (acima do preço) gera erro só daquela linha e os outros produtos saem |
| CA-B31-04 | automática | `src/test/catalogo-importacao.integration.test.ts` | a prévia aponta o erro da linha inválida e aceita as outras; gravar cria o produto com faixas, mínimo e grade no banco; reimportar com as colunas vazias mantém as regras |

## Banco de Dados

- Função `importar_produto_catalogo` passa a gravar `price_tiers`, `min_quantity`, `pack_quantities` e `pack_price` (só quando vêm em `p_dados`; sem a chave, mantém)
- Migration: `supabase/migrations/20261021000006_importar_regras_de_venda.sql`

## Arquivos

- **Criar:** `supabase/migrations/20261021000006_importar_regras_de_venda.sql` — função de importar com as quatro colunas
- **Modificar:** `src/lib/catalogo/planilha.ts` — colunas novas, leitores `lerFaixas` e `lerGrade`, regras em `ProdutoPlanilha`, exemplo no modelo
- **Modificar:** `src/lib/catalogo/importacao.ts` — regras no produto existente, na prévia (mudanças) e na gravação
- **Modificar:** `src/test/catalogo-planilha.test.ts` — CA-B31-04 (leitura)
- **Modificar:** `src/test/catalogo-importacao.integration.test.ts` — CA-B31-04 (prévia e gravação)

## Checklist

- [x] Migration criada e aplicada
- [x] Planilha: colunas, leitores e conferência das regras por linha
- [x] Importação: prévia mostra as mudanças e gravar manda as regras
- [x] Testes da tabela Prova passando
