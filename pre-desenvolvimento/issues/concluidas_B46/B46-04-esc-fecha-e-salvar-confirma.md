# B46-04: Esc fecha as janelas e salvar confirma

**Tipo:** Correção
**Página:** Pipeline (Novo lead), Chat (mensagens rápidas), Catálogo, Funis, Campos personalizados, Etiquetas
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achados **M-01**, **B-05** e **B-07**
**Gravidade:** Médio

## Descrição

Esc não fecha "Novo lead" nem as mensagens rápidas, e quase nenhum salvamento confirma que deu certo; só as automações dizem "salva".

## Pronto quando

Esc fecha essas janelas sem criar nada, e salvar produto, lead, funil, campo e etiqueta mostra uma confirmação curta.

## Critérios de aceite

- **CA-B46-08** (automática) — Esc fecha "Novo lead" e mensagens rápidas. Dado a janela "Novo lead" aberta no Pipeline, ou o painel de mensagens rápidas aberto no Chat, quando se aperta Esc, então a janela fecha e nada é criado
- **CA-B46-09** (automática) — Salvar mostra confirmação. Dado o formulário de produto, de lead, de funil, de campo personalizado ou de etiqueta, quando o salvamento dá certo, então aparece uma confirmação curta ("Produto salvo", "Lead criado", "Funil salvo", "Campo salvo", "Etiqueta salva")

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. Na janela "Novo lead" (ou "Adicionar contato" do funil), Esc fecha sem criar nada.
2. No Chat, com o seletor de mensagens rápidas aberto, Esc fecha o seletor.
3. Salvar produto, criar lead, criar funil, criar campo e criar ou editar etiqueta mostram, por 3 segundos, uma confirmação no pé da tela ("Produto salvo", "Lead criado", "Funil salvo", "Campo salvo", "Etiqueta salva").

### Edge Cases
- As janelas do Base UI (Dialog) já fechavam com Esc; o gancho novo serve às montadas à mão.
- O aviso fica no layout das telas logadas: o "Produto salvo" aparece mesmo com a volta para a lista.
- Dois salvamentos seguidos: o aviso novo troca o anterior e conta os 3 segundos de novo.

### Cenário de Erro
- Salvar com erro não mostra confirmação; o erro continua no próprio formulário, como antes.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B46-08 | automática | `src/test/esc-fecha-e-salvar-confirma.test.tsx` | Esc chama o fechar do Novo lead sem `criarNovoLead`, e some o seletor de mensagens rápidas |
| CA-B46-09 | automática | `src/test/esc-fecha-e-salvar-confirma.test.tsx` | Depois de salvar, aparecem "Lead criado", "Etiqueta salva", "Campo salvo", "Funil salvo" e "Produto salvo" |

## Arquivos

- **Criar:** `src/hooks/use-fechar-com-esc.ts` — fecha com Esc a janela aberta.
- **Criar:** `src/lib/aviso-na-tela.ts` — `avisar(texto)` e quem ouve.
- **Criar:** `src/components/shared/avisos-na-tela.tsx` — mostra o aviso por 3 segundos.
- **Modificar:** `src/app/(auth)/layout.tsx` — monta o `AvisosNaTela`.
- **Modificar:** `src/app/(auth)/pipeline/components/modal-novo-lead.tsx` — Esc e "Lead criado".
- **Modificar:** `src/app/(auth)/pipeline/components/modal-adicionar-contato.tsx` — Esc.
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — Esc no seletor de mensagens rápidas.
- **Modificar:** `src/app/(auth)/catalogo/produtos/[id]/editor-client.tsx` — "Produto salvo".
- **Modificar:** `src/app/(auth)/configuracoes/funis/funis-client.tsx` — "Funil salvo".
- **Modificar:** `src/app/(auth)/configuracoes/campos/campos-client.tsx` — "Campo salvo".
- **Modificar:** `src/app/(auth)/configuracoes/etiquetas/etiquetas-client.tsx` — "Etiqueta salva".
- **Criar:** `src/test/esc-fecha-e-salvar-confirma.test.tsx` — testes do CA-B46-08 e do CA-B46-09.

## Checklist

- [x] Gancho do Esc nas janelas montadas à mão e no seletor de mensagens rápidas
- [x] Aviso de salvo no layout e nos cinco formulários
- [x] Testes do CA-B46-08 e do CA-B46-09 passando
- [x] Testes que renderizam essas telas passando (as 2 falhas de tema já existem na master), tsc e lint
