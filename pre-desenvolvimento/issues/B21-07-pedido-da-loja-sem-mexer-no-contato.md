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
