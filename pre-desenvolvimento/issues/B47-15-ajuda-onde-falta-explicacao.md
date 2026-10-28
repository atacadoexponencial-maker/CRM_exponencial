# B47-15: Ajuda onde falta explicação

**Tipo:** Correção
**Página:** Funis, ficha do contato, card, Chat, WhatsApp, Catálogo (importação e pedido), Templates
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achados **C-01**, **C-04**, **C-08**, **C-13**, **C-17**, **C-20**, **C-30** e **C-32**
**Gravidade:** Clareza

## Descrição

Termos e botões sem explicação ganham uma frase curta ou um "?" com ajuda, como o Luan decidiu. Os ícones do campo de mensagem ganham nome, o template rejeitado mostra o motivo e a tag barra o espaço na digitação.

## Pronto quando

Cada termo e botão listado tem a explicação ao lado ou no "?".

## Critérios de aceite

- **CA-B47-38** (automática) — Termos e botões explicados. Dado as telas com termo ou botão sem explicação: funis "fixo" da Entrada e da Recompra (C-01), "ICP" e "Perfil RFV" na ficha do contato (C-13), "Tag" no card e "Etiqueta" na conversa (C-04), "Corrigir recebimento de mensagens" no WhatsApp (C-32), o código na importação de produtos (C-17), "Marcar como Fechado" e "Cancelar pedido" (C-20), quando cada uma é desenhada, então cada termo ou botão tem ao lado uma frase curta ou um "?" que, aberto, diz o que é ou o que faz
- **CA-B47-39** (automática) — Ícones do campo de mensagem com nome. Dado o campo de mensagem do Chat, quando é desenhado, então os botões de anexo, mensagens rápidas, nota interna e áudio têm nome visível em dica e nome acessível ("Mensagens rápidas", "Nota interna"…)
- **CA-B47-40** (automática) — Template rejeitado mostra o motivo. Dado um template com status "Rejeitado" e o motivo devolvido pela Meta gravado, quando a lista de templates é desenhada, então o motivo aparece junto do status; sem motivo gravado, aparece "A Meta não informou o motivo"
- **CA-B47-41** (automática) — Tag sem espaço barrada na digitação. Dado o campo "Nova tag" do card, quando se digita um espaço, então o espaço não entra e a dica diz "Tags não têm espaço"

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
