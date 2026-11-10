# issues

- **Arquivos soltos nesta pasta = issues abertas.** Hoje (10/11/2026), todas já no ar e esperando só teste manual: B28-05 (relógio das esperas no gateway, teste com chip), B46-04 (banco de teste sempre acordado), B54-02 (criar e editar template, CA-B54-10 no número da Marcelle), B54-06 (envio e relatório da campanha de template) e B59-02 (galeria de modelos, CA-B59-27 com chip).
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
| B11 | `docs/specs-arquivadas/spec-automacoes-v2.md` (concluída: automações em fluxo de blocos, no ar desde 08/10/2026) | `concluidas_B11/` |
| B12 | `docs/specs-arquivadas/spec-renomear-funis.md` | `concluidas_B12/` |
| B13 | `docs/specs-arquivadas/spec-lixeira-contatos.md` (excluir lead e contato, com lixeira) | `concluidas_B13/` |
| B22 | `../analise-qa/qa-automacoes-2026-10-09.md` (correções do QA das automações v2) | `concluidas_B22/` |
| B23 | `../spec-coexistencia.md` (em andamento: WhatsApp Business no celular e CRM no mesmo número, pela API Oficial; só as migrations estão no master, PR #10) | `concluidas_B23/` (quando houver) |
| B24 | `docs/specs-arquivadas/spec-landing-crmatacado-exp.md` (concluída em 23/10/2026: landing pública em `/` no tema Caderno, com prints reais e demonstração pelo WhatsApp; política e termos com a SETE ADS 2 LTDA) | `concluidas_B24/` |
| B25 | `docs/specs-arquivadas/spec-canal-direto-envio-pelo-celular.md` (mensagem enviada pelo celular aparece no CRM, canal direto) | `concluidas_B25/` |
| B26 | `docs/specs-arquivadas/spec-mensagem-na-fila.md` (mensagem na fila do número e aviso de aquecimento, canal direto) | `concluidas_B26/` |
| B27 | `docs/specs-arquivadas/spec-porteiro-rapido.md` (conferência de login do porteiro sem ida ao banco de logins, mantendo o aviso de conta desativada) | `concluidas_B27/` |
| B28 | `../spec-espera-e-fim-das-sequencias.md` (bloco "esperar" nas automações, fim das sequências e ação "criar lembrete na Agenda"; no master; B28-07 tirou as tabelas de sequência da produção em 10/11/2026; falta a B28-05, teste com chip) | `concluidas_B28/` |
| B29 | `docs/specs-arquivadas/spec-foto-de-perfil.md` (concluída em 25/10/2026: foto de perfil real do contato, buscada pelo canal direto) | `concluidas_B29/` |
| B30 | `docs/specs-arquivadas/spec-fundacao-da-venda.md` (concluída: pedido do catálogo vira compra, dashboard na fonte unificada, exportação Excel e gráficos) | `concluidas_B30/` |
| B31 | `docs/specs-arquivadas/spec-regras-de-venda-do-catalogo.md` (concluída: preço por quantidade, mínimo por produto, grade fechada e repetir último pedido) | `concluidas_B31/` |
| B32 | `docs/specs-arquivadas/spec-relatorios-visao-geral.md` (concluída: tela Relatórios com a Visão Geral, UF do contato e período do Dashboard) | `concluidas_B32/` |
| B33 | `docs/specs-arquivadas/spec-relatorios-rfv.md` (concluída em 29/10/2026: aba RFV dos Relatórios, modelo Tailor: matriz, indicadores por perfil, clientes por perfil e evolução semanal/mensal) | `concluidas_B33/` |
| B34 | `docs/specs-arquivadas/spec-relatorios-coorte-e-funil.md` (concluída: abas Coorte e Funil de clientes dos Relatórios) | `concluidas_B34/` |
| B35 | `docs/specs-arquivadas/spec-relatorios-carteiras.md` (concluída: aba Carteiras dos Relatórios) | `concluidas_B35/` |
| B36 | `docs/specs-arquivadas/spec-tema-claro-caderno.md` (concluída em 22/10/2026: tema claro padrão e escuro por usuário, linguagem visual Caderno na cor Grafite em todas as telas, aprovação no preview) | `concluidas_B36/` |
| B37 | `docs/specs-arquivadas/spec-filtro-de-contatos.md` (concluída em 22/10/2026: filtro avançado na lista de contatos, por todos os campos, etiquetas, compras e etapa do funil, com grupos E/OU e filtros salvos da empresa) | `concluidas_B37/` |
| B38 | `docs/specs-arquivadas/spec-campos-personalizados.md` (concluída: campos do contato criados pela empresa) | `concluidas_B38/` |
| B39 | `docs/specs-arquivadas/spec-pedidos-exportar-e-filtrar.md` (concluída em 22/10/2026: pedidos do catálogo com exportação em Excel e CSV, filtros novos e período personalizado com calendário) | `concluidas_B39/` |
| B40 | `docs/specs-arquivadas/spec-remover-nicho.md` (concluída em 23/10/2026: campo nicho apagado do contato, das telas, do banco, das automações, das campanhas e dos filtros) | `concluidas_B40/` |
| B41 | `docs/specs-arquivadas/spec-funis-personalizados.md` (concluída em 23/10/2026: funis criados pela empresa, além de Entrada e Recompra, com etapas próprias, nas automações, alertas, Dashboard e filtro) | `concluidas_B41/` |
| B42 | `docs/specs-arquivadas/spec-segmentacao-de-campanhas.md` (concluída em 24/10/2026: campanhas escolhem quem recebe pelo filtro avançado de Contatos, com etapa de qualquer funil, Perfil RFV e Atendente (carteira); filtros salvos de campanha próprios, separados dos de Contatos; campanhas antigas convertidas) | `concluidas_B42/` |
| B43 | `docs/specs-arquivadas/spec-automacao-por-perfil-rfv.md` (concluída em 29/10/2026: perfil RFV no contato, na lista e no chat; condição e gatilho "Entrou no perfil RFV" nas automações) | `concluidas_B43/` |
| B44 | `docs/specs-arquivadas/spec-seguranca-rodada-4.md` (concluída: correção das 13 suspeitas da auditoria security-audit run-1) | `concluidas_B44/` |
| B45 | `docs/specs-arquivadas/spec-dono-do-contato.md` (concluída: todo contato nasce com card e o atendente é dono do que é dele) | `concluidas_B45/` |
| B46 | `../spec-banco-de-teste.md` (banco de teste separado do de produção, no ar desde 28/10/2026; falta a B46-04, teste manual) | `concluidas_B46/` |
| B47 | `docs/specs-arquivadas/spec-seguranca-rodada-5.md` (28/10/2026: rodada 2 da auditoria Cloudflare — envio de campanha que reconfere anexo e destinatários, tempo real e fotos de contato presos à empresa; no ar e arquivada em 28/10/2026) | `concluidas_B47/` |
| B48 | `docs/specs-arquivadas/spec-correcoes-qa-ux.md` (27/10/2026: correções do teste de UI/UX do CRM inteiro, achados em `analise-qa/qa-ux-2026-10-27.md`; nasceu como "B46" e passou por "B47" no branch `b46-correcoes-qa-ux`; no ar e arquivada em 28/10/2026, relatório em `docs/relatorios/relatorio-b48-correcoes-qa-ux.md`) | `concluidas_B48/` |
| B49 | `docs/specs-arquivadas/spec-anexos-do-chat-privados.md` (concluída em 29/10/2026: anexos do chat, das campanhas e das automações só abrem para quem é da empresa, por link assinado de 1 hora na tela e na Meta e de 30 dias no gateway; bucket fechado na produção) | `concluidas_B49/` |
| B50 | `docs/specs-arquivadas/spec-seguranca-rodada-6.md` (concluída em 29/10/2026: CAPTCHA da Cloudflare (Turnstile) no cadastro e no pedido da loja; gateway só baixa mídia https do armazenamento do CRM, sem redirecionamento; conta desativada sem acesso a etiquetas e mensagens rápidas, que já valia desde a B20) | `concluidas_B50/` |
| B51 | `docs/specs-arquivadas/spec-cadastro-por-convite.md` (concluída em 29/10/2026: conta nova só com convite da plataforma (Marcelle e Luan) em `/plataforma/convites`, por e-mail pelo Resend ou link avulso, de uso único e validade de até 90 dias; cadastro sem convite mostra o aviso; o botão da landing não mudou) | `concluidas_B51/` |
| B52 | `docs/specs-arquivadas/spec-esqueci-minha-senha.md` (concluída em 29/10/2026: "Esqueci minha senha" no login, link de 1 hora e uso único por e-mail (Resend), senha nova entra direto e encerra as outras sessões; conta desativada ou e-mail sem conta recebe a mesma resposta, sem envio) | `concluidas_B52/` |
| B53 | `docs/specs-arquivadas/spec-correcoes-qa-roteiro-luan.md` (concluída em 30/10/2026: correções do roteiro de QA do Luan, Partes A e B — mídia e "Lido" da API Oficial, vídeo HEVC convertido com capa, "Atribuir ao time" só entre atendentes, follow-up e adiar, grade fechada, timeline com "Dados editados", carteiras, avatar, automação em tempo real no Chat) | `concluidas_B53/` |
| B54 | `../spec-templates-da-meta.md` (templates da API Oficial com prévia e edição, e campanha por template; no ar; faltam os testes manuais da B54-02 e da B54-06.) | `concluidas_B54/` |
| B55 | sem spec (Sentry: erros e tracing com `@sentry/nextjs`) | sem issue |
| B56 | sem spec (master verde: testes e telas acertados, PR #1) | sem issue |
| B57 | sem spec (Graph API da Meta na v26.0, com a versão num lugar só, PR #4) | sem issue |
| B58 | sem spec (limpeza do código legado sem uso, PR #5) | sem issue |
| B59 | `../spec-modelos-de-automacao.md` (bloco de anotação e galeria com cinco modelos prontos; no ar desde 05/11/2026; falta o CA-B59-27 da B59-02, com chip) | `concluidas_B59/` |
| B60 | sem spec (usabilidade do pipeline: áreas de ação rápida ao arrastar, card inteiro no arraste e agendar tarefa pelo painel; no ar desde 09/11/2026, PR #16) | sem issue |
| F1 | `docs/specs-arquivadas/spec-fluxo-com-prova.md` (melhoria do fluxo de desenvolvimento: critérios de aceite com código, auditor, lições) | `concluidas_F1/` |
