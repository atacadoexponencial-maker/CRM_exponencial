# B23-06: Desconexão vinda do celular, reconexão e remoção no CRM

**Tipo:** Implementação
**Página:** Configurações > WhatsApp (cartão do número), Alertas, Chat, Campanhas, Automações
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-coexistencia.md`

## Descrição

Quando a Meta avisa que o número em uso no celular foi desconectado (pelo dono, por falta de uso do aplicativo ou por troca de aparelho ou número), o cartão passa a "Desconectado" com o motivo em linguagem simples e a central de alertas ganha um alerta para Admin e Gerente. Todo envio por número desconectado (chat, campanha, automação) é recusado com explicação. Reconectar o mesmo número mantém conversas e contatos sem repetir mensagens. Remover o número no CRM mostra a instrução de desconectar também no celular e tira o número da lista sem apagar nada. O número removido fica livre para qualquer empresa conectar, e o diálogo de remover avisa isso com clareza; se a mesma empresa o conecta de novo, a conexão antiga volta com as conversas.

## Pronto quando

Um número desconectado pelo celular aparece assim no cartão, com o motivo e um alerta; tentar enviar por ele mostra que precisa conectar de novo; reconectar volta tudo a "Conectado" com as mesmas conversas; remover pede para desconectar no celular, avisa que o número fica livre e some da lista; outra empresa consegue conectar o número removido, e a empresa que o removeu o reencontra com as conversas ao conectá-lo de novo.

## Critérios de aceite

- **CA-B23-26** (automática) — Desconexão vinda do celular aparece no CRM com o motivo. Dado um número conectado em uso também no celular, quando a Meta avisa que ele foi desconectado, com o motivo, então o cartão do número mostra "Desconectado" e o motivo em linguagem simples, e a central de alertas ganha um alerta visível para Admin e Gerente.
- **CA-B23-27** (automática) — Envio por número desconectado é recusado com explicação. Dado um número desconectado, quando alguém tenta enviar mensagem, campanha, sequência ou automação por ele, então o envio não sai e o CRM mostra que o número está desconectado e precisa ser conectado de novo.
- **CA-B23-28** (automática) — Reconectar mantém as conversas e não repete as antigas. Dado um número desconectado, com conversas no CRM, quando o Admin o conecta de novo, então as conversas e os contatos continuam os mesmos, o número volta a "Conectado" e nenhuma mensagem já existente aparece em dobro.
- **CA-B23-29** (manual) — Desconectar pelo celular reflete no CRM, com chip real. Dado um número conectado em uso também no celular, quando o dono desconecta pelo aplicativo, então em poucos minutos o CRM mostra o número como desconectado pelo celular.
- **CA-B23-30** (automática) — Remover no CRM orienta a desconectar no celular. Dado um número em uso também no celular, quando o Admin pede para removê-lo no CRM, então a confirmação explica que é preciso desconectar também no aplicativo (Configurações > Conta > Plataforma Comercial) e, ao confirmar, o número sai da lista do CRM sem apagar conversas nem contatos.
- **CA-B23-31** (automática) — Remover deixa o número livre, com aviso claro. Dado um número da Meta conectado no CRM, quando o Admin pede para removê-lo, então a confirmação avisa que ninguém da empresa envia nem recebe mais por ele, que as conversas e os contatos ficam só para consulta, que o número fica livre para qualquer empresa conectar e que "Desconectar" é o caminho para só pausar; e, depois de confirmar, outra empresa consegue conectar o mesmo número.
- **CA-B23-32** (automática) — Conectar de novo o número removido traz as conversas de volta. Dado um número que a empresa removeu, com conversas no CRM, quando o Admin da mesma empresa conecta esse número de novo, então a conexão antiga volta a "Conectado", sem nascer outra, e as conversas continuam ligadas a ela; se o número estiver conectado em outra empresa, a conexão é recusada.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B23-08 | Remover o número no CRM continua só tirando-o do CRM; desligar de verdade é feito pelo dono, no celular. | confirmada | Marcelle, 10/10/2026. |
| SUP-B23-18 | Remover um número da Meta marca a conexão como removida (como o canal direto) em vez de apagar a linha, para as conversas continuarem ligadas a ela, e deixa o número livre: qualquer empresa pode conectá-lo. Quem quer guardar o número para a própria empresa usa "Desconectar". Se a mesma empresa conecta de novo o número que removeu, a conexão antiga volta, com as conversas. | confirmada | Marcelle, 12/11/2026: os dois botões são a escolha (Desconectar guarda, Remover libera), com aviso bem claro no diálogo de remover. A versão de 30/10, em que o número removido continuava reservado à empresa, foi descartada. |
| SUP-B23-19 | Envio por conversa cujo número está desconectado é recusado, e não cai sozinho em outro número conectado da empresa (a queda para "o número do workspace" da B7-01 vale só quando a conversa não tem número). | confirmada | Marcelle, 12/11/2026: o CRM não troca de número escondido; a escolha de continuar por outro número é do atendente, no Chat, e vira issue própria (B23-07). |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B23-05 | Qual número com WhatsApp Business no celular será usado nos três testes com chip real (conexão, envio pelo celular, desconexão)? | respondida | Marcelle ainda não tem o número (30/10/2026): o código segue, e os três testes com chip ficam pendentes no auditor até ela ter o número. |

## Cenários

### Happy Path
1. O dono desconecta o número no celular (Configurações > Conta > Plataforma Comercial), ou o aplicativo fica cerca de 14 dias sem abrir, ou o número muda de aparelho. A Meta avisa pelo webhook `account_update` (campo da WABA, sem `phone_number_id`): `entry[].id` é a WABA, `value.event` é `PARTNER_REMOVED` (com `disconnection_info.reason`: `ACCOUNT_DISCONNECTED`, `PRIMARY_INACTIVITY`, `COMPANION_INACTIVITY`, `CHANGE_NUMBER`, `USER_RE_REGISTERED`, `BUSINESS_DOWNGRADE`) ou `ACCOUNT_OFFBOARDED` (troca de aparelho ou de número).
2. O CRM acha a conexão pela WABA, em uso no celular e não removida, e grava `status = "disconnected"`, `disconnected_at = agora` e `state_reason` em linguagem do CRM: `desconectado_pelo_celular` ("Desconectado pelo celular"), `sem_uso_do_aplicativo` ("Desconectado por falta de uso do aplicativo") ou `mudou_de_aparelho` ("O número mudou de aparelho ou de número"). O cartão mostra "Desconectado" e o motivo; a central de alertas ganha um alerta "Número desconectado" com o motivo (`refletirEstadoNaCentral`, B4-03), que Admin e Gerente veem.
3. Enquanto desconectado, nenhum envio sai por ele: a resolução do número da conversa (`resolverProviderDaConversa`/`DoContato`) recusa conexão `disconnected` em vez de cair em outro número, e quem envia pelo chat ou por automação mostra "O número desta conversa está desconectado. Conecte-o de novo em Configurações > WhatsApp.". A campanha já recusa desde a B54-06, com o motivo dela no destinatário ("O número da campanha não está mais conectado"); aqui só se confere.
4. O Admin conecta de novo: a tela mostra o assistente da Meta para o número em uso no celular desconectado; ao concluir, `completarConexaoWhatsApp` acha a conexão da empresa com o mesmo `phone_number_id` e a **atualiza no lugar** (token, WABA, nome, `connected`, motivo e `disconnected_at` limpos) em vez de criar outra: as conversas continuam ligadas ao mesmo id, nada se repete, e o histórico não é pedido de novo (`historico_pedido_em` já preenchido). O alerta de desconectado é resolvido.
5. Remover no CRM: o diálogo, num número em uso no celular, explica que é preciso desconectar também no aplicativo (Configurações > Conta > Plataforma Comercial). Ao confirmar, a conexão vira `status = "removed"` (como o canal direto): sai da lista, conversas e contatos ficam.
6. O diálogo de remover, em qualquer número da Meta, avisa antes: ninguém da empresa envia nem recebe mais por ele; conversas e contatos ficam só para consulta; **o número fica livre** para qualquer empresa; se a mesma empresa o conectar de novo, as conversas voltam. No número comum, o diálogo manda quem só quer pausar para o "Desconectar". O botão de confirmar é "Remover e liberar o número".
7. Número removido fica livre (SUP-B23-18): o índice único do `phone_number_id` passa a ignorar conexão `removed`, e a conferência "já está em outra empresa" também. Outra empresa conecta o número normalmente; a conexão removida da primeira continua no banco, com as conversas dela.
8. A empresa que removeu conecta o mesmo número de novo: `completarConexaoWhatsApp` acha a conexão removida dela com o mesmo `phone_number_id` e a traz de volta no lugar (como na reconexão do passo 4), em vez de criar outra.

### Edge Cases
- `account_update` de WABA que o CRM não conhece, ou de número que não está em uso no celular: ignorado.
- `ACCOUNT_RECONNECTED` da Meta: ignorado; voltar a "Conectado" é pela conexão de novo pelo Admin (CA-B23-28), que também renova o token.
- Reentrega do aviso de desconexão: grava o mesmo estado, e o alerta não duplica (um aberto por conexão e tipo).
- Número removido e conectado de novo pela mesma empresa: a mesma linha volta (mesmo `phone_number_id`), com as conversas (CA-B23-32).
- Número removido numa empresa e conectado em outra: é aceito (CA-B23-31). Enquanto a outra empresa o usa, a primeira não consegue trazê-lo de volta ("Este número já está conectado em outra empresa."); se a outra o remover, volta a ficar livre.
- Com o número removido em uma empresa e ativo em outra, o webhook da Meta, os templates e o perfil comercial acham a conexão pelo número ou pela empresa ignorando as removidas: a mensagem chega só na empresa que está usando o número.
- Reconexão pelo caminho do celular, em que a Meta não informa o id do número (B23-01): a conferência de "já existe um número conectado" espera o número ser descoberto pela WABA, e a reconexão acontece no lugar do mesmo jeito.
- Número da Meta comum (sem o aplicativo) desconectado pelo botão do CRM: continua como hoje (Reconectar pelo botão); os botões Desconectar e Reconectar somem só no número em uso no celular, porque a Meta não deixa o CRM desligá-lo e a reconexão é pela janela dela.

### Cenário de Erro
- Falha de banco no `account_update`: o webhook responde 500 e a Meta reentrega.
- Remover falha: "Não foi possível remover o número. Tente novamente." (mensagem de hoje).

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B23-26 | automática | `src/test/desconexao-do-celular.integration.test.ts` | Webhook `account_update` (PARTNER_REMOVED com motivo) deixa a conexão `disconnected` com o motivo em linguagem simples, e a central lista o alerta "Número desconectado" com o motivo, lido com a sessão de um Gerente. Em `src/test/acoes-numero-no-celular.test.tsx`, o cartão do número (`CartaoNumero`) mostra "Desconectado" e o motivo em linguagem simples. |
| CA-B23-27 | automática | `src/test/desconexao-do-celular.integration.test.ts` | Com o número desconectado: o envio por automação (`enviarWhatsAppComMotivo`) e pelo chat (`enviarMensagem`) é recusado com a mensagem de número desconectado, nada é gravado como enviado, e a campanha marca o destinatário com o motivo de número desconectado da B54-06, que passa a dizer também que é preciso conectar de novo. "Sequência", no critério, é a automação: as sequências automáticas saíram na B28-06 (mesma leitura da SUP-B23-10). |
| CA-B23-28 | automática | `src/test/desconexao-do-celular.integration.test.ts` | Conectar de novo pela Meta (fetch espião) mantém o mesmo id de conexão, volta a `connected`, não repete mensagens nem conversas, não pede o histórico de novo e resolve o alerta. Os botões Desconectar e Reconectar do CRM são recusados no servidor para número em uso no celular, sem mudar o estado. A reconexão pelo caminho em que a Meta não informa o id do número também volta no lugar. |
| CA-B23-29 | manual | roteiro abaixo | Desconectar pelo aplicativo reflete no CRM em poucos minutos. |
| CA-B23-30 | automática | `src/test/desconexao-do-celular.integration.test.ts` e `src/test/acoes-numero-no-celular.test.tsx` | O diálogo de remover de um número em uso no celular explica que é preciso desconectar também no aplicativo (Configurações > Conta > Plataforma Comercial); confirmar tira o número da lista (`removed`) e conversas e contatos continuam. |
| CA-B23-31 | automática | `src/test/acoes-numero-no-celular.test.tsx` e `src/test/desconexao-do-celular.integration.test.ts` | O diálogo de remover traz o aviso (ninguém envia nem recebe, conversas só para consulta, número livre para qualquer empresa, Desconectar para só pausar) e o botão "Remover e liberar o número", no número comum e no em uso no celular; depois de removido, o Admin de outra empresa conecta o mesmo número e a conexão da primeira continua removida, com as conversas dela. |
| CA-B23-32 | automática | `src/test/desconexao-do-celular.integration.test.ts` | Com o número ativo em outra empresa, a primeira recebe "Este número já está conectado em outra empresa."; depois que a outra remove, a primeira conecta de novo e a mesma conexão volta a `connected`, sem nascer outra, com conversas, mensagens e contatos iguais. |

### Roteiro manual — CA-B23-29
1. Com o número em coexistência conectado no CRM, abrir no celular o WhatsApp Business > Configurações > Conta > Plataforma Comercial e desconectar.
2. Em poucos minutos, abrir Configurações > WhatsApp no CRM: o cartão deve mostrar "Desconectado" e "Desconectado pelo celular".
3. Abrir a central de alertas como Admin ou Gerente: deve haver um alerta "Número desconectado" com esse motivo.

## Arquivos

- **Criar:** `src/lib/whatsapp/desconexao-do-celular.ts` — `processarAccountUpdate`: traduz o evento e o motivo da Meta, grava o estado e abre o alerta (`refletirEstadoNaCentral` de `@/lib/whatsapp/alertas-de-numero`).
- **Modificar:** `src/app/api/webhooks/whatsapp/route.ts` — guarda o `id` da entrada (WABA) e despacha `account_update` antes da exigência de `phone_number_id`; as duas buscas da conexão pelo número ignoram removida.
- **Modificar:** `src/lib/whatsapp/gateway/estado.ts` — `TEXTO_DO_MOTIVO` ganha os três motivos da coexistência.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/estado-badge.tsx` — `MotivoDeTransicao` ganha os três valores.
- **Modificar:** `src/lib/whatsapp/motivo-da-falha.ts` — `MOTIVO_NUMERO_DA_CONVERSA_DESCONECTADO` (o da campanha, `MOTIVO_NUMERO_DESCONECTADO`, já veio da B54-06; aqui ele só ganha a orientação "Conecte-o de novo em Configurações > WhatsApp.").
- **Modificar:** `src/lib/whatsapp/index.ts` — a conexão da conversa/do contato traz `status`; `disconnected` devolve `null` sem cair em outro número; `motivoSemProvider` diz por quê.
- **Modificar:** `src/app/(auth)/chat/actions.ts` — os envios do chat usam `motivoSemProvider` no lugar de "Conexão WhatsApp não encontrada".
- **Modificar:** `src/lib/whatsapp-envio.ts` — idem para automações com conversa.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/actions.ts` — `listarConexaoWhatsApp` ignora removida e traz `emUsoNoCelular`; `completarConexaoWhatsApp` reconecta no lugar quando o `phone_number_id` já é da empresa; `removerConexaoWhatsApp` marca `removed` em vez de apagar; a conferência de outra empresa ignora removida; a conexão removida da própria empresa volta no lugar; `reinscreverWebhookWhatsApp` e o perfil comercial ignoram removida; `desconectarWhatsApp` e `reconectarWhatsApp` recusam número em uso no celular.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/page.tsx` — mostra o assistente para número em uso no celular desconectado e passa `emUsoNoCelular` às ações.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/acoes-whatsapp.tsx` — aviso do diálogo de remover (número livre, o que fica, Desconectar para só pausar), com a instrução do aplicativo no número em uso no celular; esconde Desconectar/Reconectar nesse caso.
- **Criar:** `supabase/migrations/20261112000010_numero_removido_fica_livre.sql` — o índice único do `phone_number_id` passa a valer só para conexão não removida.
- **Modificar:** `src/app/(auth)/configuracoes/templates/actions.ts` — a conexão da Meta usada pelos templates ignora removida.
- **Modificar:** `src/app/(auth)/configuracoes/templates/page.tsx` — os canais da empresa ignoram conexão removida.
- **Criar:** `src/test/desconexao-do-celular.integration.test.ts` — CA-B23-26, 27, 28, 30, 31 e 32 contra o banco de teste (webhook assinado, actions com o navegador do Admin/Gerente, Meta como fetch espião).
- **Modificar:** `src/test/campanhas-template-envio.test.ts` — o texto esperado do motivo da campanha acompanha a orientação nova.
- **Modificar:** `src/test/webhook-whatsapp-automacoes.test.ts` — o banco de mentira do teste passa a entender o filtro que deixa a conexão removida de fora.
- **Modificar:** `src/test/templates-previa.test.tsx` — o banco de mentira do teste passa a entender o filtro que deixa a conexão removida de fora.
- **Modificar:** `src/test/templates-editar-e-apagar.test.tsx` — o banco de mentira do teste passa a entender o filtro que deixa a conexão removida de fora.
- **Modificar:** `src/test/templates-lista-e-nome.test.tsx` — o banco de mentira do teste passa a entender o filtro que deixa a conexão removida de fora.
- **Modificar:** `src/test/campanhas-template-actions.test.ts` — o banco de mentira do teste passa a entender o filtro que deixa a conexão removida de fora.
- **Criar:** `src/test/acoes-numero-no-celular.test.tsx` — parte de tela do CA-B23-26 (cartão do número desconectado) e do CA-B23-30 e CA-B23-31 (diálogo de remover).

## Dependências Externas

- Meta webhook `account_update` (`PARTNER_REMOVED` + `disconnection_info.{reason, initiated_by}`, `ACCOUNT_OFFBOARDED`), referência lida em 30/10/2026.

## Checklist

- [x] Motivos da coexistência no vocabulário do cartão e `processarAccountUpdate` gravando estado e alerta
- [x] Webhook despacha `account_update` pela WABA
- [x] Envio por número desconectado recusado com a explicação (chat, automação, campanha)
- [x] Reconexão no lugar em `completarConexaoWhatsApp`; assistente visível para o número em uso no celular desconectado
- [x] Remover marca `removed`, com o diálogo explicando o aplicativo
- [x] Número removido fica livre: migration do índice, conferência entre empresas e buscas pelo número ignorando removida
- [x] Aviso claro no diálogo de remover e botão "Remover e liberar o número"
- [x] Conexão removida da própria empresa volta no lugar ao conectar de novo
- [x] Servidor recusa Desconectar e Reconectar pelo CRM em número em uso no celular
- [x] `tsc` sem erro (L-07) e testes vizinhos (webhook, conexão, campanhas, chat) passando (L-05)
