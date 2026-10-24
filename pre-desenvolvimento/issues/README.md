# issues

- **Arquivos soltos nesta pasta = issues abertas.** Hoje: B29-01 e B29-03 (foto de perfil), B30-05 (gráficos do dashboard, aguardando o teste manual), B31-03 (grade fechada, aguardando o teste manual) B32-04 e B32-06 (relatórios: Visão Geral, aguardando os testes manuais) B33-03 (RFV, aguardando o teste manual) B34-03 (Coorte e Funil, aguardando o teste manual) e B35-01 a B35-03 (relatórios: Carteiras).
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
| B13 | `docs/specs-arquivadas/spec-lixeira-contatos.md` (excluir lead e contato, com lixeira) | `concluidas_B13/` |
| B22 | `../analise-qa/qa-automacoes-2026-10-09.md` (correções do QA das automações v2) | `concluidas_B22/` |
| B23 | `../spec-coexistencia.md` (em andamento: WhatsApp Business no celular e CRM no mesmo número, pela API Oficial) | `concluidas_B23/` (quando houver) |
| B24 | `docs/specs-arquivadas/spec-landing-crmatacado-exp.md` (concluída em 23/10/2026: landing pública em `/` no tema Caderno, com prints reais e demonstração pelo WhatsApp; política e termos com a SETE ADS 2 LTDA) | `concluidas_B24/` |
| B25 | `docs/specs-arquivadas/spec-canal-direto-envio-pelo-celular.md` (mensagem enviada pelo celular aparece no CRM, canal direto) | `concluidas_B25/` |
| B26 | `docs/specs-arquivadas/spec-mensagem-na-fila.md` (mensagem na fila do número e aviso de aquecimento, canal direto) | `concluidas_B26/` |
| B27 | `docs/specs-arquivadas/spec-porteiro-rapido.md` (conferência de login do porteiro sem ida ao banco de logins, mantendo o aviso de conta desativada) | `concluidas_B27/` |
| B28 | `../spec-espera-e-fim-das-sequencias.md` (em andamento, no branch `b28-espera-e-fim-das-sequencias` do Luan: bloco "esperar" nas automações, fim das sequências e ação "criar lembrete na Agenda") | `concluidas_B28/` (quando houver) |
| B29 | `../spec-foto-de-perfil.md` (em andamento: foto de perfil real do contato, buscada pelo canal direto) | `concluidas_B29/` (quando houver) |
| B30 | `../spec-fundacao-da-venda.md` (aprovada em 20/10/2026, 5 issues: pedido do catálogo fechado vira compra, compra com peças/desconto/pagamento/atendente/origem, dashboard na fonte unificada, exportação Excel e gráficos para os relatórios) | `concluidas_B30/` (quando houver) |
| B31 | `../spec-regras-de-venda-do-catalogo.md` (rascunho de 21/10/2026: preço por quantidade, mínimo por produto, grade fechada e repetir último pedido na loja do catálogo) | `concluidas_B31/` (quando houver) |
| B32 | `../spec-relatorios-visao-geral.md` (aprovada em 21/10/2026: tela Relatórios com a Visão Geral ampliada no modelo Tailor, UF do contato e correção do período do Dashboard) | `concluidas_B32/` (quando houver) |
| B33 | `../spec-relatorios-rfv.md` (aprovada em 21/10/2026: aba RFV dos Relatórios, modelo Tailor: matriz, indicadores por perfil, clientes por perfil e evolução semanal/mensal) | `concluidas_B33/` (quando houver) |
| B34 | `../spec-relatorios-coorte-e-funil.md` (aprovada em 21/10/2026: abas Coorte e Funil de clientes dos Relatórios, modelo Tailor) | `concluidas_B34/` (quando houver) |
| B35 | `../spec-relatorios-carteiras.md` (aprovada em 21/10/2026: aba Carteiras dos Relatórios: painel, carteira por vendedor, transferir, remover, distribuir, reprocessar e histórico) | `concluidas_B35/` (quando houver) |
| B36 | `docs/specs-arquivadas/spec-tema-claro-caderno.md` (concluída em 22/10/2026: tema claro padrão e escuro por usuário, linguagem visual Caderno na cor Grafite em todas as telas, aprovação no preview) | `concluidas_B36/` |
| B37 | `docs/specs-arquivadas/spec-filtro-de-contatos.md` (concluída em 22/10/2026: filtro avançado na lista de contatos, por todos os campos, etiquetas, compras e etapa do funil, com grupos E/OU e filtros salvos da empresa) | `concluidas_B37/` |
| B38 | reservada em 22/10/2026 para a spec de campos personalizados do contato (a escrever depois da B37) | `concluidas_B38/` (quando houver) |
| B39 | `docs/specs-arquivadas/spec-pedidos-exportar-e-filtrar.md` (concluída em 22/10/2026: pedidos do catálogo com exportação em Excel e CSV, filtros novos e período personalizado com calendário) | `concluidas_B39/` |
| B40 | `docs/specs-arquivadas/spec-remover-nicho.md` (concluída em 23/10/2026: campo nicho apagado do contato, das telas, do banco, das automações, das campanhas e dos filtros) | `concluidas_B40/` |
| B41 | `docs/specs-arquivadas/spec-funis-personalizados.md` (concluída em 23/10/2026: funis criados pela empresa, além de Entrada e Recompra, com etapas próprias, nas automações, alertas, Dashboard e filtro) | `concluidas_B41/` |
| B42 | `docs/specs-arquivadas/spec-segmentacao-de-campanhas.md` (concluída em 24/10/2026: campanhas escolhem quem recebe pelo filtro avançado de Contatos, com etapa de qualquer funil, Perfil RFV e Atendente (carteira); filtros salvos de campanha próprios, separados dos de Contatos; campanhas antigas convertidas) | `concluidas_B42/` |
| F1 | `docs/specs-arquivadas/spec-fluxo-com-prova.md` (melhoria do fluxo de desenvolvimento: critérios de aceite com código, auditor, lições) | `concluidas_F1/` |
