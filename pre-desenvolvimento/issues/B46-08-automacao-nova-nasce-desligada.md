# B46-08: Automação nova nasce desligada

**Tipo:** Correção
**Página:** Configurações → Automações (editor e lista)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achado **A-01**
**Gravidade:** Alto

## Descrição

Salvar uma automação nova grava com `ativa: true`, e ela já age sobre contatos de verdade. Decidido na PER-B46-01: nasce desligada.

## Pronto quando

Automação nova salva desligada; "Salvar e ativar" liga; editar uma ligada não desliga.

## Critérios de aceite

- **CA-B46-19** (automática) — Salvar automação nova grava desligada. Dado uma automação nova, com o fluxo completo, quando se clica em Salvar, então ela é gravada com `ativa` falso e a lista mostra a chave desligada
- **CA-B46-20** (automática) — "Salvar e ativar" liga. Dado a mesma automação nova, quando se clica em "Salvar e ativar", então ela é gravada ligada, passando pela mesma conferência do botão da lista
- **CA-B46-21** (automática) — Editar automação ligada mantém ligada. Dado uma automação ligada, quando se muda o nome e salva, então ela continua ligada

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B46-01 | A automação nova deve nascer desligada, com "Salvar e ativar" à parte? Hoje nasce ligada (B46-08) | respondida | Sim, nasce desligada. Luan, 27/10/2026 |
