# B21-06: Crons e webhook da Meta fechados sem segredo

**Tipo:** Implementação
**Página:** Rotas automáticas (cron de campanhas e sequências) e webhook da Meta
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-3.md` — módulo 5

## Descrição

Os crons de campanhas e sequências e o webhook da Meta passam a recusar toda chamada quando
o segredo não está configurado ou não confere, no mesmo padrão do cron da lixeira.

## Pronto quando

Com os segredos configurados, os crons rodam e o webhook recebe mensagens, status e a
verificação da Meta como hoje; e testes automatizados provam que chamada sem segredo, com
segredo errado, ou com o segredo vazio no servidor é recusada sem rodar nada nem gravar nada.

## Cenários

> Levantamento de 08/10: crons de campanhas e sequências liberavam tudo com `CRON_SECRET`
> vazio; o webhook da Meta pulava a assinatura com `META_APP_SECRET` vazio. A verificação
> do webhook (GET) já recusava sem `WHATSAPP_VERIFY_TOKEN`. As chamadas "oportunistas" de
> dentro do CRM chamam as funções direto, não as rotas. Os dois segredos estão no Vercel.

### Happy Path
Cron da Vercel com `Bearer <CRON_SECRET>` roda; evento da Meta assinado é gravado.

### Cenário de Erro
Sem segredo, segredo errado ou segredo vazio no servidor: 401, nada roda/grava.

## Arquivos

- **Modificar:** `src/app/api/cron/campanhas/route.ts` — `!secret ||` (fail-closed).
- **Modificar:** `src/app/api/cron/sequencias/route.ts` — idem.
- **Modificar:** `src/app/api/webhooks/whatsapp/route.ts` — sem `META_APP_SECRET`, recusa.
- **Modificar:** `src/test/webhook-whatsapp-automacoes.test.ts` — (achado na execução) dependia do "sem segredo, aceita"; passa a assinar como a Meta.
- **Criar:** `src/test/crons-e-webhook-seguranca.test.ts` — crons e webhook recusando/aceitando.

## Checklist

- [x] Crons fail-closed
- [x] Webhook fail-closed
- [x] Testes passando (incl. integração que assina o webhook)
- [x] Código no ar e conferido em produção (cron sem segredo e webhook sem assinatura → 401)
