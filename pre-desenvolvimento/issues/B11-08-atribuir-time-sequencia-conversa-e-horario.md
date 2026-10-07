# B11-08: Ações de time, sequência e conversa; condição de horário comercial

**Tipo:** Implementação
**Página:** Editor de fluxo; Motor; Configurações (horário comercial)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Depende de:** B11-05

> **Mudança de 07/10/2026:** "atribuir a um time" foi feita antes, na B11-11. As
> condições de conversa (sem atendente, atendente é, card em funil e etapa) já
> vieram na B11-02.

## Descrição

Entram as ações iniciar sequência, resolver conversa e reabrir conversa, e a
condição de horário comercial (dentro/fora), com os dias e a faixa configurados
uma vez em Configurações do workspace.

## Pronto quando

No preview do branch `b11-automacoes-v2` (o merge no `master` é um só, no fim da
série), a regra "mensagem recebida fora do horário comercial →
enviar mensagem de ausência, atribuir ao time Entrada" responde à noite e
não responde de dia, e o card do contato fica com um atendente do time.
