# B16-09: Carrinho e pedido pelo WhatsApp

**Tipo:** Implementação
**Página:** Carrinho e pedido (vitrine pública)
**Spec:** `pre-desenvolvimento/spec-catalogo.md` — seção "Carrinho e pedido" e "Decisões" (pedido no CRM, cliente do pedido)
**Depende de:** B16-07

## Descrição

Carrinho guardado no aparelho da cliente, com quantidade limitada ao estoque, total e
barra do pedido mínimo; nome e WhatsApp obrigatórios; ao Fazer pedido, o servidor confere
estoque e mínimo, registra o pedido (situação Novo) ligado ao contato (cria se não existe,
sem card nem funil) e abre o WhatsApp da loja com a mensagem pronta; pedidos repetidos em
sequência do mesmo número são barrados.

## Pronto quando

Em produção, a Marcelle monta um carrinho num celular, vê o mínimo bloquear e liberar o
botão, faz o pedido, o WhatsApp abre no número da loja com número do pedido, itens e
total, e o pedido aparece gravado ligado ao contato.

## Cenários

### Happy Path
1. Na loja publicada, o ícone do carrinho e o botão **Adicionar ao carrinho** aparecem
   (componentes da B16-03). O carrinho fica guardado no aparelho, por loja.
2. No carrinho: itens, quantidades (até o estoque), total, barra do pedido mínimo, nome e
   WhatsApp. **Fazer pedido** fica desabilitado até atingir o mínimo.
3. Ao fazer o pedido, o **servidor** confere tudo de novo (loja publicada, produtos
   visíveis, combinações que existem, estoque, mínimo, preços do banco — nunca os do
   navegador), grava o pedido (situação **Novo**, número sequencial por empresa, itens com
   nome e preço da época) e devolve a mensagem pronta.
4. O WhatsApp da loja abre com a mensagem; a confirmação mostra o número do pedido e o
   link "toque aqui"; o carrinho esvazia.
5. O pedido fica ligado ao **contato** com aquele WhatsApp; se não existir, é criado com
   o nome e o telefone. **Não cria card nem mexe em funil.**

### Edge Cases
- **Nono dígito**: o contato é procurado com e sem o 9 do celular (o WhatsApp às vezes
  entrega o número sem ele); criado, fica com o número como a cliente digitou.
- Contato na lixeira: sai dela (como na mensagem recebida, B13-05) e recebe o pedido.
- Contato existente sem nome: ganha o nome do pedido; com nome, mantém o que tinha.
- Item que ficou sem estoque (ou com menos) desde que entrou no carrinho: o servidor
  recusa, diz qual, e o carrinho ajusta o limite do item.
- Produto ocultado ou excluído depois de entrar no carrinho: recusa, dizendo qual.
- **Proteção contra abuso**: o mesmo WhatsApp não faz outro pedido na mesma loja por 2
  minutos; mensagem explica.
- Enviar o pedido **não baixa estoque** (isso é ao Fechar, B16-11).
- O link do WhatsApp é aberto pelo navegador depois da resposta; se o navegador
  bloquear, a confirmação tem o link para tocar.

### Cenário de Erro
- Loja despublicada no meio: "A loja não está recebendo pedidos agora."
- Falha ao gravar: "Não deu para enviar o pedido. Tente de novo." — nada é gravado pela
  metade (função do banco numa transação).

## Banco de Dados

- `catalog_orders`: `id`, `workspace_id`, `number` (sequencial por empresa, único),
  `contact_id`, `customer_name`, `customer_whatsapp`, `status` (`novo`,
  `em_atendimento`, `fechado`, `cancelado`), `pieces`, `total`, `created_at`
- `catalog_order_items`: `order_id`, `product_id` (nulo se o produto for excluído),
  `product_name`, `combination`, `quantity`, `unit_price`, `photo_path`
- `catalog_order_events`: `order_id`, `from_status`, `to_status`, `changed_by` (nulo =
  loja), `created_at` (o histórico da B16-10)
- RLS: membros da empresa leem (todos os papéis); escrita só pela função
- Função `registrar_pedido_catalogo(...)` (security definer, chamada só pelo servidor com
  a chave de serviço): numera com trava por empresa e grava pedido, itens e o primeiro
  evento numa transação
- Migration: `supabase/migrations/20261003000010_catalogo_pedidos.sql`

## Arquivos

- **Criar:** `supabase/migrations/20261003000010_catalogo_pedidos.sql`
- **Criar:** `src/app/loja/[endereco]/actions.ts` — `fazerPedido` (pública: confere tudo no servidor)
- **Criar:** `src/lib/catalogo/pedidos.ts` — validação do pedido, contato (com/sem nono dígito, lixeira), limite de 2 minutos
- **Modificar:** `src/app/loja/components/carrinho-local.ts` — item guarda nome, preço, foto e limite do momento em que foi adicionado
- **Modificar:** `src/app/loja/components/carrinho.tsx` — erro do servidor ajusta o limite do item
- **Modificar:** `src/app/loja/[endereco]/loja-client.tsx`, `p/[produto]/produto-client.tsx` — carrinho e adicionar ligados
- **Criar:** `src/app/loja/[endereco]/usar-carrinho-loja.tsx` — carrinho + gaveta compartilhados pelas duas páginas
- **Modificar:** `src/app/loja/[endereco]/page.tsx`, `p/[produto]/page.tsx` — passam mínimo e fechamento
- **Criar:** `src/test/catalogo-pedido.integration.test.ts` — pedido válido, preço do banco, estoque, mínimo, oculto, contato (novo/existente/nono dígito/lixeira), sem card, limite de 2 minutos, loja despublicada

## Checklist

- [x] Migration aplicada
- [x] `fazerPedido` com todas as conferências no servidor
- [x] Contato achado ou criado; sem card
- [x] Carrinho e adicionar ligados na loja
- [x] Testes de integração (9/9 em `catalogo-pedido.integration.test.ts`)
- [x] `npm run build` e `npm run lint` passam
- [x] Conferência visual (celular, sem login) (03/10: carrinho persiste entre páginas, mínimo bloqueia, estoque que muda no meio é recusado e ajusta o carrinho, pedido abre o WhatsApp com a mensagem, confirmação com o número, carrinho esvazia)
- [ ] Commit + push; deploy Ready
