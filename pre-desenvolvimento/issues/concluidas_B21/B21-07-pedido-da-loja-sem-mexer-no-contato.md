# B21-07: Pedido da loja não mexe no contato e tem limite

**Tipo:** Implementação
**Página:** Loja (finalizar pedido)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-3.md` — módulo 6

## Descrição

Pedido com WhatsApp de contato já existente só é ligado a ele — não muda o nome nem tira da
lixeira. Cada endereço de internet faz no máximo 10 pedidos por hora por loja; acima disso a
loja mostra "Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo." e nada
é gravado.

## Pronto quando

Pedido de cliente novo cria contato e pedido como hoje; pedido com WhatsApp já cadastrado
aparece ligado ao contato com o nome original (e, se ele estava na lixeira, continua lá); e
testes automatizados provam que a loja não troca nome, não tira da lixeira e recusa o 11º
pedido na hora sem criar pedido nem contato.

## Cenários

> Levantamento de 08/10: `acharOuCriarContato` (`src/lib/catalogo/pedidos.ts`) tirava o
> contato da lixeira e preenchia o nome vazio com o que a visitante digitou. O único freio
> era 1 pedido a cada 2 minutos por WhatsApp — um robô trocando o número passava.

### Happy Path
- Cliente nova: cria contato e pedido, como hoje.
- WhatsApp já cadastrado (inclusive sem o nono dígito): pedido ligado ao contato; nome e
  lixeira intactos. O nome digitado fica no pedido (`customer_name`).

### Edge Cases
- Contato na lixeira: continua na lixeira, com o pedido ligado (a empresa decide se restaura).
- Limite contado por IP + endereço da loja (hash; nada em claro), só para pedido que entrou.
- Contador fora do ar não bloqueia pedido (mesma regra da B20-05).

### Cenário de Erro
- 11º pedido na hora pelo mesmo IP na mesma loja: "Muitos pedidos em pouco tempo. Aguarde
  alguns minutos e tente de novo." — nada é gravado.

## Banco de Dados

- `tentativas_de_acesso`: CHECK de `tipo` passa a aceitar `pedido_loja`.

## Arquivos

- **Criar:** `supabase/migrations/20261008000006_limite_de_pedidos_da_loja.sql` — CHECK do tipo.
- **Modificar:** `src/lib/catalogo/pedidos.ts` — contato existente só é ligado.
- **Modificar:** `src/lib/limite-de-tentativas.ts` — tipo `pedido_loja` e `chaveDoPedidoNaLoja`.
- **Modificar:** `src/app/loja/[endereco]/actions.ts` — limite de 10/hora antes de registrar; conta depois do sucesso.
- **Modificar:** `src/test/catalogo-pedido.integration.test.ts` — (achado na execução) o caso "tira da lixeira" passa a conferir que não tira nem muda o nome.
- **Criar:** `src/test/pedido-loja-seguranca.integration.test.ts` — nome e lixeira intactos; limite.

## Checklist

- [x] Migration aplicada
- [x] Pedido não mexe em contato existente
- [x] Limite por IP e loja
- [x] Testes da loja, do pedido e do freio passando
- [x] Código no ar
