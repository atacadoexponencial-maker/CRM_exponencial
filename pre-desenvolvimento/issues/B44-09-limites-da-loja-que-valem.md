# B44-09: Limites da loja que valem de verdade

**Tipo:** Implementação
**Página:** Loja pública (pedido sem login)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-4.md`

## Descrição

O limite de 10 pedidos por hora por endereço de internet passa a contar o endereço da loja sem diferença de maiúsculas e a valer mesmo com pedidos simultâneos, e o intervalo de 2 minutos por telefone também.

## Pronto quando

O 11º pedido da hora é recusado com qualquer combinação de maiúsculas no endereço da loja, 15 pedidos simultâneos gravam no máximo 10, e dois pedidos simultâneos do mesmo telefone gravam um só.

## Critérios de aceite

- **CA-B44-33** (automática) — Trocar maiúsculas no endereço da loja não escapa do limite. Dado a loja `loja-teste` e 10 pedidos na última hora do mesmo endereço de internet, feitos por `loja-teste`, `LOJA-TESTE` e `Loja-Teste`, quando chega o 11º pedido desse endereço, com qualquer combinação de maiúsculas, então o visitante vê "Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo." e nada é gravado
- **CA-B44-34** (automática) — Pedidos simultâneos não passam do limite por hora. Dado nenhum pedido recente de um endereço de internet, quando 15 pedidos desse endereço chegam ao mesmo tempo na mesma loja, então no máximo 10 pedidos são gravados e os outros veem o aviso de muitos pedidos
- **CA-B44-35** (automática) — Mesmo telefone ao mesmo tempo grava um pedido só. Dado nenhum pedido recente do telefone T, quando dois pedidos com o telefone T chegam ao mesmo tempo, então um pedido é gravado e o outro vê o aviso de esperar para pedir de novo

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
