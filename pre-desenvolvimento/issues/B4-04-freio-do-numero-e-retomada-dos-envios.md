# B4-04: Freio do número e retomada dos envios

**Tipo:** Implementação
**Módulo:** B4 — Saúde e Risco do Número
**Repositório:** `CRM_exponencial`

---

## Contexto

O gateway tem um freio de emergência (A6-07): quando a proporção de falhas de envio passa
do limite, ou quando o número é banido, ele **para de enviar** por aquele número. É o
último recurso antes de perder o número.

Do lado do cliente, hoje isso é invisível. As mensagens simplesmente não saem, e ninguém
no CRM sabe dizer por quê. Liberar o freio também não é possível pelo CRM: só por script
dentro da VPS, o que é operação nossa.

Esta issue fecha as duas pontas: mostrar que o número está freado e com que motivo, e
deixar o administrador do cliente pedir a retomada.

---

## O que construir

1. **O aviso de freio na tela de saúde**, com o motivo — falhas em excesso, banimento ou
   freio manual nosso — e quantas mensagens ficaram paradas.
2. **A ação de retomar**, chamando o gateway, com confirmação antes: retomar um número
   freado por excesso de falhas é assumir um risco, e o texto precisa dizer isso em uma
   linha.

Duas regras de negócio, e as duas ficam no **backend**:

- **Banimento não se retoma.** Se o motivo é `banned`, o freio não é uma escolha nossa: o
  WhatsApp já barrou o número, e liberar não devolve nada. A ação nem se oferece.
- **Só Admin retoma.** Gerente vê a saúde e o aviso; retomar é decisão de quem responde
  pelo número.

O resultado real vem do gateway. Se ele recusar, a tela mostra o motivo que veio de lá, e
não uma mensagem genérica.

---

## Comportamentos da spec cobertos

- [ ] Ver que os envios do número foram interrompidos e por quê
- [ ] Solicitar a retomada dos envios de um número interrompido

---

## Contrato do gateway

**O estado do freio** vem de `GET /v1/instances/{id}/health`, no campo `brake`
(`braked`, `reason`, `braked_at`) — seção 4.5 do `contrato-v1.md`. Motivos possíveis:
`failure_rate`, `manual` e `banned`.

**A retomada é `POST /v1/instances/{id}/brake/release`**, sem corpo, credencial
`X-Instance-Token` — especificado em 17/09/2026 na mesma seção. Duas recusas previstas,
e as duas precisam de mensagem própria na tela:

- `brake_not_releasable` (409) — freio por **banimento não é liberável**. O bloqueio é do
  WhatsApp; liberar a fila só produziria falha em série.
- `instance_not_braked` (409) — não havia freio ativo.

A implementação no gateway é a issue `A6-09`, ainda aberta.

O evento `instance.braked` do contrato (seção 3.4) traz `reason`, `queued_count` e
`released` — é por ele que o CRM fica sabendo do freio sem consultar, e `released: true`
marca a liberação. Quem recebe esse evento é B6.

---

## Arquivos

- **Modificar:** o `actions.ts` da tela de saúde, criado na `B4-02` — a action de retomar,
  com a checagem de papel e a regra do banimento
- **Modificar:** o cliente do gateway em `src/lib/whatsapp/gateway/`, criado na `B4-02` —
  a chamada de retomada
- **Modificar:** o componente de aviso de freio da `B4-01` — motivo, mensagens paradas e
  o botão

Padrões a reutilizar, pesquisados no repo:

- Autorização em action: `src/app/(auth)/alertas/actions.ts:51`
  (`if (!perfil || perfil.role !== "admin") return { erro: "Sem permissão" }`) — retorno
  de erro, não exceção
- Confirmação em diálogo: `src/components/ui/dialog.tsx` e o padrão de
  `src/app/(auth)/configuracoes/times/criar-time-dialog.tsx`
- `src/app/(auth)/configuracoes/whatsapp/acoes-whatsapp.tsx` — como as ações de uma
  conexão já são apresentadas hoje

---

## Depende de

- `B4-00` — o estado do freio e o endpoint de retomada. **Bloqueante.**
- `B4-02` — o cliente do gateway e a tela com dados reais

---

## Critérios de aceite

- [ ] Número freado mostra o aviso com o motivo em português e quantas mensagens estão paradas
- [ ] Número freado por banimento **não** oferece a retomada, e explica por quê
- [ ] Retomar pede confirmação, dizendo o risco em uma linha
- [ ] Depois da retomada aceita, a tela reflete o número liberado
- [ ] Gateway recusa a retomada: a tela mostra o motivo que veio do gateway
- [ ] Gerente vê o aviso e não consegue retomar; a regra está no backend, não escondendo o botão
- [ ] Atendente não alcança a tela
- [ ] Testes: retomada aceita, recusada, bloqueada por banimento, bloqueada por papel
- [ ] `npm run build`, `npm run lint` e `npm test` passam

## Fora de escopo

- Freio acionado pelo próprio CRM: quem freia é o gateway
- Retomar vários números de uma vez
- Retomar campanha interrompida pelo freio — é B8
- Mexer no limite de falhas que aciona o freio: é configuração do gateway, decidida em `decisoes-de-operacao.md`
- Alerta de freio na central de alertas — é `B4-03`
