# B31-05: Repetir o último pedido

**Tipo:** Implementação
**Página:** Vitrine e carrinho (`/loja/[endereco]`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-regras-de-venda-do-catalogo.md`

## Descrição

Depois de um pedido registrado, as peças dele ficam guardadas no aparelho da cliente,
como o carrinho. Ao voltar à loja, ela vê "Repetir último pedido" no cabeçalho e no
carrinho vazio; tocar monta o carrinho com as peças que ainda existem e têm estoque
(quantidades limitadas ao estoque de hoje, preço e regras de hoje) e a tela diz o que
ficou de fora e por quê.

Independente das outras issues da série (não depende das regras de venda).

## Pronto quando

Na empresa de teste, uma cliente faz um pedido com 3 produtos; o lojista oculta um deles.
Ela volta à loja no mesmo navegador, toca "Repetir último pedido" e o carrinho fica com
os 2 produtos nas quantidades de antes, com a mensagem "Regata canelada ficou de fora:
saiu da loja".

## Critérios de aceite

- **CA-B31-08** (automática) — Repetir o último pedido. Dado uma cliente que fez um pedido neste aparelho com 3 produtos, um deles depois oculto pelo lojista, quando ela toca "Repetir último pedido", então o carrinho fica com os 2 produtos que ainda existem, nas quantidades de antes (limitadas ao estoque de hoje), e a tela diz qual ficou de fora e por quê.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B31-06 | "Repetir último pedido" vale para o aparelho em que o pedido foi feito (a loja não tem login); o último pedido fica guardado no aparelho, como o carrinho. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B31-03 | Repetir pedido: só no aparelho da cliente (SUP-B31-06) é suficiente agora, ou já quer o link que o vendedor manda pelo CRM ("repetir pedido #12") abrindo a loja com o carrinho montado? | respondida | Marcelle, 21/10/2026: só no aparelho |

## Cenários

### Happy Path
1. A cliente faz um pedido pela loja. Quando o pedido é registrado, as peças do carrinho (produto, combinação, quantidade) ficam guardadas no aparelho em `ultimo-pedido:<endereco>`, junto com o número do pedido, e o carrinho esvazia como hoje.
2. Ao voltar à loja no mesmo navegador, o cabeçalho mostra um botão "Repetir pedido" e o carrinho vazio mostra "Repetir último pedido (#1001)".
3. Tocar manda as peças guardadas ao servidor (`repetirPedido`), que confere com os dados de hoje: produto visível, combinação existente, estoque. Devolve as peças que entram, com nome, preço, foto, regras e estoque de hoje (quantidade limitada ao estoque), e as que ficaram de fora com o motivo.
4. O carrinho é substituído pelas peças devolvidas e abre com um aviso: "Regata canelada ficou de fora: saiu da loja". Daí em diante é o carrinho normal (faixas, mínimo, desconto, grade valem como sempre).

### Edge Cases
- Produto de grade fechada: as linhas do bloco voltam juntas; se o estoque de hoje não fecha os mesmos pacotes, o bloco volta com os pacotes que cabem; se não cabe nenhum, fica de fora ("sem estoque para uma grade inteira").
- Nenhuma peça volta (tudo saiu): o carrinho continua vazio e o aviso lista o que ficou de fora.
- Sem pedido guardado (primeira visita, outro aparelho, navegador limpo): nenhum botão aparece.
- Armazenamento indisponível (aba anônima): o pedido não fica guardado; sem botão.
- O servidor não confia na lista do aparelho: só devolve o que existe hoje, com os preços de hoje; o pedido em si passa pela conferência normal de `registrarPedido`.

### Cenário de Erro
- Falha de rede ao repetir: o aviso diz "Não deu para repetir o pedido. Tente de novo." e o carrinho não muda.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B31-08 | automática | `src/test/catalogo-repetir-pedido.integration.test.ts` | com 3 produtos de um pedido anterior, um oculto depois, o servidor devolve os 2 que existem (quantidades limitadas ao estoque de hoje) e o oculto como "saiu da loja" |
| CA-B31-08 | automática | `src/test/catalogo-carrinho-regras.test.tsx` | o carrinho vazio com último pedido mostra "Repetir último pedido" e, ao tocar, chama a repetição; o aviso do que ficou de fora aparece no carrinho |

## Banco de Dados

Nenhuma mudança: a leitura usa as tabelas de produto e estoque que já existem.

## Arquivos

- **Criar:** `src/lib/catalogo/repetir-pedido.ts` — `prepararRepeticao(endereco, pecas)`: confere com o banco e devolve o que entra e o que ficou de fora
- **Modificar:** `src/app/loja/[endereco]/actions.ts` — ação pública `repetirPedido`
- **Modificar:** `src/app/loja/components/carrinho-local.ts` — guarda e lê o último pedido do aparelho; `substituir(itens)`
- **Modificar:** `src/app/loja/components/carrinho.tsx` — botão no carrinho vazio e aviso do que ficou de fora
- **Modificar:** `src/app/loja/components/vitrine.tsx` — botão "Repetir pedido" no cabeçalho (`onRepetirPedido`)
- **Modificar:** `src/app/loja/components/pagina-produto.tsx` — repassa `onRepetirPedido` ao cabeçalho
- **Modificar:** `src/app/loja/[endereco]/usar-carrinho-loja.tsx` — guarda o último pedido ao registrar; expõe `repetir` e o aviso
- **Modificar:** `src/app/loja/[endereco]/loja-client.tsx` — liga o botão da vitrine
- **Modificar:** `src/app/loja/[endereco]/p/[produto]/produto-client.tsx` — liga o botão da página do produto
- **Criar:** `src/test/catalogo-repetir-pedido.integration.test.ts` — CA-B31-08 (servidor)
- **Modificar:** `src/test/catalogo-carrinho-regras.test.tsx` — CA-B31-08 (carrinho)

## Checklist

- [x] Último pedido guardado no aparelho ao registrar; `substituir` no carrinho local
- [x] Servidor confere as peças de hoje e devolve o que entra e o que ficou de fora
- [x] Botões no cabeçalho e no carrinho vazio; aviso do que ficou de fora
- [x] Testes da tabela Prova passando
