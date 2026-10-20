# B30-01: Compra do contato com peças, desconto, pagamento, atendente e origem

**Tipo:** Implementação
**Página:** Perfil do contato (diálogo de registrar compra e histórico de compras)
**Spec:** `pre-desenvolvimento/spec-fundacao-da-venda.md`

## Descrição

A compra do contato deixa de ser só data e valor: ganha quantidade de peças, desconto
informativo, forma de pagamento (lista fixa: Pix, Boleto, Cartão de crédito, Cartão de
débito, Transferência, Dinheiro, Cheque, Outro), atendente responsável pela venda, origem
(Manual, Catálogo, Externa) e código externo reservado para um ERP futuro. O diálogo de
registrar compra aceita os campos novos, com o atendente já sugerido, e o histórico de
compras do perfil passa a mostrá-los. Tudo o que já existe (compra só com data e valor,
Atendente sem permissão) continua igual.

## Pronto quando

No perfil de um contato, Admin ou Gerente abre "Registrar compra", vê o atendente já
sugerido, preenche peças, desconto e forma de pagamento, salva e a compra aparece na
tabela com as colunas novas e origem "Manual". Peças "2,5" ou desconto negativo são
recusados na tela. Uma compra só com data e valor continua entrando normalmente.

## Critérios de aceite

- **CA-B30-06** (automática) — Compra manual só com data e valor continua valendo. Dado o diálogo de registrar compra no perfil do contato, quando o usuário preenche só data e valor e salva, então a compra aparece no histórico com origem "Manual" e os demais campos vazios.
- **CA-B30-07** (automática) — Compra manual com todos os campos. Dado o diálogo de registrar compra, quando o usuário preenche data, valor, 12 peças, desconto R$ 30,00, forma "Pix" e escolhe um atendente, e salva, então a compra aparece no histórico com esses valores e o valor pago continua o digitado, sem o desconto ser subtraído de novo.
- **CA-B30-08** (automática) — Atendente vem sugerido no diálogo. Dado um contato com atendente responsável definido, quando o usuário abre o diálogo de registrar compra, então o campo de atendente já vem com o atendente do contato; num contato sem atendente, vem com quem está registrando.
- **CA-B30-09** (automática) — Peças e desconto inválidos são recusados. Dado o diálogo de registrar compra, quando o usuário informa peças "2,5" ou "-1", ou desconto "-10", e tenta salvar, então a tela aponta o campo errado e a compra não é criada.
- **CA-B30-10** (automática) — Atendente continua sem registrar compra manual. Dado um usuário com papel Atendente, quando ele tenta registrar uma compra manual, então a operação é recusada com o aviso de falta de permissão (regra que já existe).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B30-01 | O valor da compra é o que o cliente pagou (líquido). O desconto é só informativo e nunca é subtraído do valor. | confirmada | Marcelle, 20/10/2026 |
| SUP-B30-05 | No diálogo de compra manual, o atendente vem sugerido como o atendente do contato e, sem ele, como quem está registrando. | confirmada | Marcelle, 20/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B30-02 | A lista fixa de formas de pagamento é: Pix, Boleto, Cartão de crédito, Cartão de débito, Transferência, Dinheiro, Cheque, Outro? Falta ou sobra alguma? | respondida | Sim, exatamente essa lista, sem parcelas. Marcelle, 20/10/2026 |

## Cenários

### Happy Path
1. Admin ou Gerente abre o perfil de um contato que tem atendente responsável e clica em "Registrar compra".
2. O diálogo abre com Data e Valor vazios, Peças, Desconto e Forma de pagamento vazios, e Atendente já marcado com o atendente do contato (a lista traz os usuários ativos da empresa).
3. Preenche data, valor 500, 12 peças, desconto 30, forma "Pix", mantém o atendente e salva.
4. O diálogo fecha e a tabela do histórico mostra a linha com data, R$ 500,00, 12 peças, Pix, o nome do atendente e origem "Manual". O total e o ticket médio incluem R$ 500,00 (o desconto não é subtraído).
5. A timeline ganha o evento "Compra registrada — R$ 500,00", como hoje.

### Edge Cases
- Contato sem atendente: o campo Atendente vem com quem está registrando.
- Usuário escolhe "Sem atendente" na lista: a compra fica sem atendente.
- Compra só com data e valor: salva com origem "Manual" e os outros campos vazios; a tabela mostra "—" neles.
- Peças "0" é aceito (compra de serviço, por exemplo); desconto "0" idem.
- Atendente escolhido que não é da empresa, ou está desativado, é recusado pelo servidor mesmo que a tela tenha sido manipulada.
- Forma de pagamento fora da lista fixa é recusada pelo servidor.
- Compras antigas (sem os campos) continuam aparecendo com "—" nas colunas novas e origem "Manual".

### Cenário de Erro
- Peças "2,5" ou "-1", desconto "-10": a tela marca o campo com a mensagem ("Peças deve ser um número inteiro maior ou igual a zero" / "Desconto não pode ser negativo") e não envia.
- Papel Atendente chamando a ação: "Sem permissão para registrar compras", nada gravado (regra que já existe; a tela nem mostra o botão).
- Falha no banco: "Erro ao registrar compra. Tente novamente." no topo do diálogo, que fica aberto.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B30-06 | automática | `src/test/compra-com-campos.integration.test.ts` | Admin registra só data e valor; o perfil lista a compra com origem "manual" e peças, desconto, forma e atendente vazios |
| CA-B30-07 | automática | `src/test/compra-com-campos.integration.test.ts` | Admin registra com 12 peças, desconto 30, "pix" e um atendente; o perfil lista exatamente esses valores e o valor continua o digitado |
| CA-B30-08 | automática | `src/test/compra-com-campos.test.ts` | A sugestão de atendente devolve o atendente do contato quando há, senão o usuário logado |
| CA-B30-09 | automática | `src/test/compra-com-campos.test.ts` | O esquema de validação da compra recusa peças "2,5" e "-1" e desconto "-10" apontando o campo; a ação do servidor também recusa |
| CA-B30-10 | automática | `src/test/compra-com-campos.integration.test.ts` | Usuário Atendente recebe "Sem permissão para registrar compras" e nada é gravado |

## Banco de Dados

- Tabela: `contact_purchases` (colunas novas, todas opcionais; as existentes não mudam)
  - `pecas` (integer, nulo, `pecas >= 0`) — quantidade de peças da compra
  - `desconto` (numeric(12,2), nulo, `desconto >= 0`) — desconto informativo, em reais; nunca subtraído de `valor`
  - `forma_pagamento` (text, nulo, uma de `pix`, `boleto`, `cartao_credito`, `cartao_debito`, `transferencia`, `dinheiro`, `cheque`, `outro`) — forma de pagamento
  - `atendente_id` (uuid, nulo, referência a `profiles`, `on delete set null`) — quem vendeu
  - `origem` (text, obrigatório, padrão `manual`, uma de `manual`, `catalogo`, `externa`) — de onde a compra veio
  - `codigo_externo` (text, nulo) — identificador num sistema de fora; nenhuma tela desta série o mostra
  - O vínculo com o pedido do catálogo (`pedido_id`) fica para a B30-02.
- A migration precisa ser aplicada com `npx supabase db push --linked` e os tipos regenerados com `npx supabase gen types typescript --linked > src/integrations/supabase/types.ts`.

## Arquivos

- **Criar:** `supabase/migrations/20261021000001_compra_com_campos_dos_relatorios.sql` — colunas novas em `contact_purchases` com as checagens acima.
- **Criar:** `src/lib/compras.ts` — lista fixa de formas de pagamento e origens com rótulos em português, o esquema de validação dos campos da compra (reusado pelo diálogo e pela ação) e a função pura `atendenteSugerido(atendenteDoContato, usuarioLogado)`.
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — `registrarCompra` aceita e valida os campos novos (esquema de `src/lib/compras.ts`; atendente precisa ser perfil ativo da mesma empresa); `buscarDadosContato` lê as colunas novas e o nome do atendente da compra (join `profiles!contact_purchases_atendente_id_fkey(name)`) e expõe `atendenteId` do contato; nova ação `listarAtendentesAtivos()` (mesma consulta de `src/app/(auth)/configuracoes/automacoes/opcoes-editor.ts`).
- **Modificar:** `src/app/(auth)/contatos/mock-contatos.ts` — interface `Compra` ganha `pecas`, `desconto`, `formaPagamento`, `atendente`, `origem`; `ContatoPerfil` ganha `atendenteId`.
- **Modificar:** `src/app/(auth)/contatos/[id]/page.tsx` — carrega a lista de atendentes e calcula o atendente sugerido (atendente do contato, senão o usuário logado) e passa ao perfil.
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — tabela do histórico ganha colunas Peças, Pagamento, Atendente e Origem; repassa atendentes e sugestão ao diálogo.
- **Modificar:** `src/app/(auth)/contatos/[id]/components/registrar-compra-dialog.tsx` — campos Peças, Desconto, Forma de pagamento (`<select>` nativo, como o de Tipo no perfil) e Atendente (`<select>` com "Sem atendente" + usuários ativos, pré-marcado com a sugestão); esquema de `src/lib/compras.ts`.
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado pelo comando, não à mão.
- **Criar:** `src/test/compra-com-campos.test.ts` — testes unitários do esquema e da sugestão de atendente (CA-B30-08, CA-B30-09).
- **Criar:** `src/test/compra-com-campos.integration.test.ts` — testes de integração no Supabase real, no padrão de `src/test/contatos-perfil.integration.test.ts` (CA-B30-06, CA-B30-07, CA-B30-10).

## Dependências Externas

Nenhuma nova.

## Checklist

- [x] Migration com as colunas novas e checagens; `db push --linked`; tipos regenerados
- [x] `src/lib/compras.ts` com formas, origens, rótulos, esquema e `atendenteSugerido`
- [x] `registrarCompra` valida e grava os campos novos; atendente conferido no servidor
- [x] `buscarDadosContato` devolve os campos novos, o nome do atendente da compra e `atendenteId` do contato
- [x] `listarAtendentesAtivos()` em `contatos/actions.ts`
- [x] `page.tsx` do perfil passa atendentes e sugestão
- [x] Diálogo com os quatro campos novos e validação na tela
- [x] Tabela do histórico com as colunas novas (compras antigas mostram "—")
- [x] Testes unitários e de integração da tabela Prova passando
- [x] `npm run lint` e `npm run build` limpos (build ok; `eslint src --quiet` sem erro; os 7 erros do lint geral são fora de `src`, anteriores a esta issue)
