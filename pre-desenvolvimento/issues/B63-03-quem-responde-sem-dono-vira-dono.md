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
