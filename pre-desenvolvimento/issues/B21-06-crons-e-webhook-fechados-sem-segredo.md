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
