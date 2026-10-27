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

## Cenários

### Happy Path
1. A visitante faz um pedido pela loja.
2. Antes de gravar, o servidor **reserva** uma vaga no limite do endereço de internet daquela loja (endereço da loja em minúsculas) e uma vaga no limite do telefone (1 a cada 2 minutos naquela loja). A reserva conta e grava numa operação só, travada por chave no banco.
3. Com as duas vagas, o pedido é registrado. Se o pedido não entra (estoque, produto sumiu, erro), as vagas reservadas são devolvidas, como hoje "conta só pedido que entrou".

### Edge Cases
- `loja-teste`, `LOJA-TESTE` e `Loja-Teste` contam no mesmo limite.
- 15 pedidos do mesmo endereço ao mesmo tempo: só 10 conseguem vaga.
- 2 pedidos do mesmo telefone ao mesmo tempo: só 1 consegue vaga.
- Contador fora do ar continua não bloqueando ninguém, como hoje.

### Cenário de Erro
- Sem vaga por endereço: "Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo." e nada é gravado.
- Sem vaga por telefone: "Você acabou de fazer um pedido. Espere 2 minutos para enviar outro." e nada é gravado.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B44-33 | automática | `src/test/loja-limites-que-valem.integration.test.ts` | com 10 pedidos na hora feitos por `loja-teste`, `LOJA-TESTE` e `Loja-Teste`, o 11º (com outra combinação de maiúsculas) recebe o aviso e não grava pedido |
| CA-B44-34 | automática | `src/test/loja-limites-que-valem.integration.test.ts` | 15 pedidos simultâneos do mesmo endereço gravam no máximo 10, e os outros recebem o aviso |
| CA-B44-35 | automática | `src/test/loja-limites-que-valem.integration.test.ts` | 2 pedidos simultâneos do mesmo telefone gravam 1, e o outro recebe o aviso de esperar |

## Banco de Dados

- Tabela `tentativas_de_acesso`: o tipo passa a aceitar `pedido_telefone`.
- Função `reservar_tentativa(tipo, chave, limite, janela_minutos)`: trava pela chave, conta na janela e grava a tentativa se couber; devolve o id da tentativa ou nulo. Só a chave de serviço chama.

## Arquivos

- **Criar:** `supabase/migrations/20261027000005_reserva_de_tentativa.sql` — tipo `pedido_telefone` e a função `reservar_tentativa`
- **Modificar:** `src/lib/limite-de-tentativas.ts` — `reservarTentativa` e `liberarTentativa`; chave do pedido com o endereço da loja em minúsculas; chave do telefone na loja
- **Modificar:** `src/app/loja/[endereco]/actions.ts` — `fazerPedido` reserva a vaga antes e devolve se o pedido não entrar
- **Modificar:** `src/lib/catalogo/pedidos.ts` — `registrarPedido` reserva a vaga do telefone antes de gravar e devolve se o pedido não entrar
- **Criar:** `src/test/loja-limites-que-valem.integration.test.ts` — CA-B44-33 a 35 no Supabase real, com lojas de teste criadas e apagadas pelo próprio teste

## Checklist

- [x] Migration da reserva de tentativa
- [x] Reserva e devolução no limitador; chave da loja em minúsculas
- [x] Pedido da loja com reserva por endereço e por telefone
- [x] Testes do CA-B44-33 a 35
