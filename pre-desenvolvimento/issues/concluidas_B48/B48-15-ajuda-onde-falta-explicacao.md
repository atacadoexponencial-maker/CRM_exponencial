# B48-15: Ajuda onde falta explicação

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

- **CA-B48-38** (automática) — Termos e botões explicados. Dado as telas com termo ou botão sem explicação: funis "fixo" da Entrada e da Recompra (C-01), "ICP" e "Perfil RFV" na ficha do contato (C-13), "Tag" no card e "Etiqueta" na conversa (C-04), "Corrigir recebimento de mensagens" no WhatsApp (C-32), o código na importação de produtos (C-17), "Marcar como Fechado" e "Cancelar pedido" (C-20), quando cada uma é desenhada, então cada termo ou botão tem ao lado uma frase curta ou um "?" que, aberto, diz o que é ou o que faz
- **CA-B48-39** (automática) — Ícones do campo de mensagem com nome. Dado o campo de mensagem do Chat, quando é desenhado, então os botões de anexo, mensagens rápidas, nota interna e áudio têm nome visível em dica e nome acessível ("Mensagens rápidas", "Nota interna"…)
- **CA-B48-40** (automática) — Template rejeitado mostra o motivo. Dado um template com status "Rejeitado" e o motivo devolvido pela Meta gravado, quando a lista de templates é desenhada, então o motivo aparece junto do status; sem motivo gravado, aparece "A Meta não informou o motivo"
- **CA-B48-41** (automática) — Tag sem espaço barrada na digitação. Dado o campo "Nova tag" do card, quando se digita um espaço, então o espaço não entra e a dica diz "Tags não têm espaço"

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. Em Configurações → Funis, Entrada e Recompra têm o selo "fixo" e um "?" que, aberto, diz que as etapas são as do método e não mudam, e que outras etapas pedem um funil novo.
2. Na ficha do contato, "ICP" (na leitura e na edição) e o selo do Perfil RFV têm "?" com o que cada um é.
3. No card, "Tags" tem "?" dizendo que a tag fica no contato e é diferente da etiqueta. No Chat, o submenu "Etiquetas" abre com a frase "Etiquetas marcam esta conversa, para filtrar a caixa de entrada. As tags ficam no contato."
4. No WhatsApp, "Corrigir recebimento de mensagens" tem "?" dizendo quando usar e que não apaga nada.
5. Na importação de produtos, o passo 1 diz que o código liga a linha ao produto, e por isso é obrigatório na planilha.
6. No pedido, a linha embaixo dos botões diz o que "Marcar como Fechado" (baixa estoque e registra a compra) e "Cancelar pedido" (encerra o pedido) mudam.
7. No campo de mensagem do Chat, anexo, mensagens rápidas, nota interna e áudio têm dica (`title`) e nome acessível.
8. Template rejeitado mostra, embaixo do selo, o motivo da Meta em português.
9. Na "Nova tag" do card, o espaço digitado não entra e aparece "Tags não têm espaço".

### Edge Cases
- O "?" fecha clicando nele de novo ou com Esc (`useFecharComEsc`, B48-04).
- A lista de templates já vem da Graph API a cada abertura; o motivo vem no mesmo pedido, no campo `rejected_reason`. "NONE", vazio ou ausente: "A Meta não informou o motivo". Código que o CRM não conhece aparece como veio.
- A tradução do motivo é do servidor (`listarTemplates`); a tela só mostra.
- Colar "cliente vip" na Nova tag do card vira "clientevip", com a dica.
- Pedido Fechado: a linha diz que voltar ou cancelar devolve o estoque e desfaz a compra (B30-02).

### Cenário de Erro
- Nenhum novo: as ações dos botões não mudam.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B48-38 | automática | `src/test/ajuda-onde-falta-explicacao.test.tsx` | O "?" de funil fixo (nos dois fixos), ICP, Perfil RFV, Tag e Corrigir recebimento abre o texto certo e fecha com Esc; a frase das Etiquetas aparece no submenu do Chat; a importação explica o código; o pedido diz o que Fechar e Cancelar mudam |
| CA-B48-39 | automática | `src/test/ajuda-onde-falta-explicacao.test.tsx` | "Anexar arquivo", "Mensagens rápidas", "Nota interna" e "Gravar áudio" são nomes acessíveis de botões com dica |
| CA-B48-40 | automática | `src/test/ajuda-onde-falta-explicacao.test.tsx` | A lista mostra o motivo junto do "Rejeitado" e o aviso sem motivo; `listarTemplates` pede `rejected_reason` e traduz INVALID_FORMAT, NONE e ausente |
| CA-B48-41 | automática | `src/test/ajuda-onde-falta-explicacao.test.tsx` | "cliente vip" vira "clientevip" na Nova tag do card, com "Tags não têm espaço" |

## Arquivos

- **Criar:** `src/components/shared/ajuda.tsx` — o "?" com a explicação, que fecha com Esc.
- **Criar:** `src/test/ajuda-onde-falta-explicacao.test.tsx` — CA-B48-38 a 41.
- **Modificar:** `src/app/(auth)/configuracoes/funis/funis-client.tsx` — "?" do funil fixo.
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — "?" do ICP e do Perfil RFV.
- **Modificar:** `src/app/(auth)/pipeline/components/tags-do-contato.tsx` — "?" da Tag; espaço barrado na Nova tag.
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — frase das Etiquetas; nomes dos botões do campo de mensagem.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/acoes-whatsapp.tsx` — "?" do Corrigir recebimento.
- **Modificar:** `src/app/(auth)/catalogo/importar/importar-client.tsx` — frase do código.
- **Modificar:** `src/app/(auth)/catalogo/components/detalhe-pedido.tsx` — o que Fechar e Cancelar mudam.
- **Modificar:** `src/app/(auth)/configuracoes/templates/actions.ts` — pede e traduz o `rejected_reason`.
- **Modificar:** `src/app/(auth)/configuracoes/templates/templates-client.tsx` — motivo embaixo do selo.

## Checklist

- [x] Componente do "?" com Esc
- [x] Explicações de funil fixo, ICP, Perfil RFV, Tag, Etiqueta, Corrigir recebimento, código da importação e botões do pedido
- [x] Nomes dos botões do campo de mensagem
- [x] Motivo do template rejeitado traduzido no servidor
- [x] Espaço barrado na Nova tag do card
- [x] Testes do CA-B48-38 a 41 passando, tsc e lint
