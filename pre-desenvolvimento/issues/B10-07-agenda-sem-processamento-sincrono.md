# B10-07: Agenda abre sem processar sequências

**Tipo:** Implementação
**Página:** Agenda (minha e da equipe)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-navegacao-fluida.md`
**Depende de:** B10-03

## Descrição

Retirar da abertura da Agenda o processamento de sequências vencidas e os
envios de WhatsApp que vinham junto, deixando esse trabalho só com a rotina
agendada já existente. Lembretes e conversas ligadas a eles passam a carregar
em paralelo com a identidade resolvida uma vez.

Cobre os comportamentos de "Agenda (minha e da equipe)".

## Pronto quando

No CRM publicado, com uma sequência vencida plantada, abrir a Agenda não envia
mensagem nem cria lembrete novo; a rotina agendada, quando roda, processa
essa mesma sequência. A lista de lembretes e a Agenda da equipe mostram o
mesmo conteúdo de antes.
