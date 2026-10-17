# issues

- **Arquivos soltos nesta pasta = issues abertas.** Hoje: B13-05 e B19-04, as duas no ar e esperando só o teste manual.
- `concluidas_<série>/` = entregues e no ar. Não se mexe mais nelas.
- `bloqueadas_modulo6/` = escritas, mas sem como fazer (API da Meta não tem grupos).

Fluxo de uma issue: `/plan` → `/execute` → testes → `/revisildo` → mover para
`concluidas_<série>/`. O skill `/issue <id>` faz tudo isso em sequência.

| Série | Spec | Pasta de concluídas |
|---|---|---|
| 01–NN por módulo | `docs/specs-arquivadas/spec-modulo-X-*.md` | `concluidas_moduloX/` |
| B1–B8 | `docs/specs-arquivadas/spec-gateway-whatsapp-proprio.md` | `concluidas_B/` |
| B9 | `docs/specs-arquivadas/spec-desconectar-reconectar.md` | `concluidas_B9/` |
| B10 | `docs/specs-arquivadas/spec-navegacao-fluida.md` | `concluidas_B10/` |
| B11 | `../spec-automacoes-v2.md` (em andamento) | `concluidas_B11/` (quando houver) |
| B12 | `docs/specs-arquivadas/spec-renomear-funis.md` | `concluidas_B12/` |
| B13 | `../spec-lixeira-contatos.md` (em andamento) | `concluidas_B13/` (quando houver) |
| B22 | `../analise-qa/qa-automacoes-2026-10-09.md` (correções do QA das automações v2) | `concluidas_B22/` |
| B23 | `../spec-coexistencia.md` (em andamento: WhatsApp Business no celular e CRM no mesmo número, pela API Oficial) | `concluidas_B23/` (quando houver) |
| B24 | `../spec-landing-atacado-exp.md` (reservada: a landing está no branch `b22-landing-atacado-exp` e troca o código B22 por B24 no merge) | `concluidas_B24/` (quando houver) |
| B25 | `../spec-canal-direto-envio-pelo-celular.md` (em andamento: mensagem enviada pelo celular aparece no CRM, canal direto) | `concluidas_B25/` (quando houver) |
| B26 | `../spec-mensagem-na-fila.md` (em andamento: mensagem na fila do número e aviso de aquecimento, canal direto) | `concluidas_B26/` (quando houver) |
| B27 | `../spec-porteiro-rapido.md` (em andamento: conferência de login do porteiro sem ida ao banco de logins, mantendo o aviso de conta desativada) | `concluidas_B27/` (quando houver) |
| F1 | `docs/specs-arquivadas/spec-fluxo-com-prova.md` (melhoria do fluxo de desenvolvimento: critérios de aceite com código, auditor, lições) | `concluidas_F1/` |
