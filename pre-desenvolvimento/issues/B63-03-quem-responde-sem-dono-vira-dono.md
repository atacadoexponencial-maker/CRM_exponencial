# B63-03: Quem responde conversa sem dono vira o dono

**Tipo:** Implementação
**Página:** Chat
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-permissoes-por-cargo.md`

## Descrição

Admin e Gerente que respondem uma conversa sem dono passam a virar donos dela, do
contato, dos cards e das outras conversas, como já acontece com o Atendente (B45-03).
Conversa que já tem dono não muda.

## Pronto quando

A Nathália responde uma conversa sem dono e ela passa a ser dela; a conversa sai da
fila aberta dos atendentes.

## Critérios de aceite

- **CA-B63-14** (automática) — Admin que responde conversa sem dono vira o dono. Dado uma conversa sem dono, quando o Admin envia uma resposta nela, então a conversa, o contato e o card passam a ter o Admin como dono, e o Atendente em "Os dele e os sem dono" deixa de ver a conversa.
- **CA-B63-15** (automática) — Responder conversa que já tem dono não troca o dono. Dado a conversa X, da Ana, quando o Admin ou o Gerente envia uma resposta nela, então a X continua com a Ana.

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B63-01 | Quem responde uma conversa sem dono vira o dono dela: vale para Admin e Gerente também (proposta da spec, CA-B63-14), só para o Atendente (como hoje) ou fica como opção na tela de Permissões? | respondida | Luan, 19/11/2026: vale para todos os cargos (Admin, Gerente e Atendente), sem opção na tela |

## Cenários

### Happy Path
1. Alguém da empresa, de qualquer cargo, envia uma resposta numa conversa sem dono.
2. Antes de enviar, `assumirSeSemResponsavel` grava a conversa no nome dele, só se ela ainda estiver sem dono, e passa o contato, os cards e as outras conversas do contato para ele (`passarContatosPara`, motivo "pelo_chat").
3. A mensagem sai; quem vê só os dele e os sem dono deixa de ver a conversa.

### Edge Cases
- Conversa que já tem dono: nada muda, de qualquer cargo que responda.
- Dois respondem juntos: um fica com a conversa e o outro recebe "Não enviada: outro atendente já está atendendo esta conversa." (como na B45-03).

### Cenário de Erro
- Falha ao gravar o dono: a mensagem não sai e a tela mostra o motivo genérico de envio.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B63-14 | automática | `src/test/permissoes-por-cargo.integration.test.ts` | depois de o Admin responder a conversa sem dono, a conversa, o contato e o card são do Admin, e a atendente em "atribuidos_e_sem_dono" não vê mais a conversa |
| CA-B63-15 | automática | `src/test/permissoes-por-cargo.integration.test.ts` | o Admin e o Gerente respondem a conversa do colega e ela continua do colega |

## Arquivos

- **Modificar:** `src/app/(auth)/chat/actions.ts` — `assumirSeSemResponsavel` vale para todos os cargos (PER-B63-01)
- **Modificar:** `src/test/permissoes-por-cargo.integration.test.ts` — CA-B63-14 e 15, com o envio ao WhatsApp falso

## Checklist

- [x] Tirar a trava de cargo de `assumirSeSemResponsavel`
- [x] Testes CA-B63-14 e 15
- [x] Rodar os testes que enviam pelo Chat (`atendente-ve-os-dele`)
- [x] `npx tsc --noEmit` e lint
