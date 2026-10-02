# B11-08: Ações de time, sequência e conversa; condição de horário comercial

**Tipo:** Implementação
**Página:** Editor de fluxo; Motor; Configurações (horário comercial)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Depende de:** B11-05

## Descrição

Entram as ações atribuir a um time (o CRM escolhe o atendente do time com
menos conversas abertas), iniciar sequência, resolver conversa e reabrir
conversa; e a condição de horário comercial (dentro/fora), com os dias e a
faixa configurados uma vez em Configurações do workspace. Entram também as
condições de conversa que faltavam (sem atendente, atendente é, card em funil
e etapa) caso a B11-02 não as tenha coberto.

## Pronto quando

No preview do branch `b11-automacoes-v2` (o merge no `master` é um só, no fim da
série), a regra "mensagem recebida fora do horário comercial →
enviar mensagem de ausência, atribuir ao time Entrada" responde à noite e
não responde de dia, e o card do contato fica com um atendente do time.
