# B23-01: Conectar um número que já está em uso no WhatsApp Business do celular

**Tipo:** Implementação
**Página:** Configurações > WhatsApp (`/configuracoes/whatsapp`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-coexistencia.md`

## Descrição

Antes de abrir a janela da Meta, o Admin lê o aviso do que muda no celular e escolhe se os contatos das conversas antigas ganham card no Funil de Entrada. Quando a Meta devolve a conclusão de uma conexão de número em uso no celular, o CRM grava a conexão marcada como "em uso também no celular" (com a escolha dos cards), recusa número que já está no canal direto e só aceita o registro vindo de Admin.

## Pronto quando

Um Admin conecta um número em uso no celular, vê o aviso antes da janela da Meta, e depois o cartão do número aparece conectado com a indicação "Em uso também no celular". Gerente e Atendente não conseguem registrar; número do canal direto é recusado com explicação.

## Critérios de aceite

- **CA-B23-01** (automática) — O aviso do que muda no celular aparece antes de conectar. Dado um Admin na tela de WhatsApp, sem número conectado pela API Oficial, quando ele inicia a conexão, então a tela mostra o aviso com os cinco pontos (aparelhos conectados, recursos desativados, grupos, abrir o aplicativo a cada 14 dias, cobrança das mensagens enviadas pelo CRM) antes de abrir a janela da Meta.
- **CA-B23-02** (automática) — Número em uso no celular fica conectado e identificado. Dado que a Meta devolveu a conclusão de uma conexão de número em uso no celular, quando o CRM registra a conexão, então o número aparece na lista como conectado, com a indicação "Em uso também no celular", e a opção de criar cards escolhida pelo Admin fica gravada.
- **CA-B23-03** (manual) — Conexão com chip real funciona de ponta a ponta. Dado um número em uso no WhatsApp Business de um celular, quando o Admin conclui a conexão pela janela da Meta, então o número aparece conectado no CRM, o aplicativo do celular continua funcionando e uma mensagem recebida aparece nos dois lugares.
- **CA-B23-04** (automática) — Número que já está no canal direto é recusado. Dado um número já conectado pelo canal direto, em qualquer empresa, quando a Meta devolve a conclusão da conexão desse mesmo número, então o CRM não registra a conexão e mostra a mensagem de que o número precisa ser desconectado do canal direto antes.
- **CA-B23-05** (automática) — Só Admin conecta. Dado um Gerente ou Atendente, quando ele tenta registrar uma conexão de número em uso no celular, então o CRM recusa e nenhuma conexão é criada.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B23-01 | A configuração atual do Cadastro Incorporado do app "Atacado Exp" já oferece, na janela da Meta, a opção de conectar um número em uso no celular, sem nova aprovação. | confirmada | Marcelle, 30/10/2026: ela mesma vai abrir a janela da Meta e conferir se a opção aparece, no teste com chip (CA-B23-03). Se não aparecer, o CRM segue como hoje para número novo e a série espera a aprovação do app pela Meta. |
| SUP-B23-02 | A opção de criar cards para os contatos das conversas antigas vem **desmarcada** por padrão. | confirmada | Marcelle, 10/10/2026. |
| SUP-B23-03 | A opção de criar cards é escolhida uma vez, antes de conectar, e não pode ser mudada depois. | confirmada | Marcelle, 10/10/2026. |
| SUP-B23-07 | O ritmo atual de envio de campanhas fica abaixo do teto de 20 mensagens por segundo que a Meta impõe a número em uso no celular. | confirmada | Conferido no código em 30/10/2026: `src/lib/campanhas.ts` envia um destinatário por vez, esperando a resposta da Meta e conferindo o status da campanha no banco antes de cada envio, em lotes de 40 e no máximo 3 campanhas por rodada. Fica em poucas mensagens por segundo, bem abaixo de 20. |
| SUP-B23-11 | A recusa de número que já está no canal direto vale para toda conexão pela API Oficial, em uso no celular ou não (decisão B1-01: um número não fica nos dois canais). | confirmada | Marcelle, 30/10/2026. |
| SUP-B23-12 | O Embedded Signup v3 (o que o CRM usa hoje, `sessionInfoVersion: "3"`) ainda aceita o `featureType` da coexistência; a documentação diz que v2 e v3 são descontinuados a partir de 15/10/2026, e a migração para o v4 fica fora desta issue. | invalidada | Marcelle pediu a migração agora (30/10/2026). Pela documentação "Versions" da Meta, desde 15/10/2026 toda chamada v3 (ou sem versão) é servida como v4, com os mesmos eventos e o mesmo `featureType`; a v4 ignora `sessionInfoVersion`. A migração foi só tirar esse parâmetro, nesta issue. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B23-05 | Qual número com WhatsApp Business no celular será usado nos três testes com chip real (conexão, envio pelo celular, desconexão)? | respondida | Marcelle ainda não tem o número (30/10/2026): o código segue, e os três testes com chip ficam pendentes no auditor até ela ter o número. |

## Cenários

### Happy Path
1. O Admin abre `/configuracoes/whatsapp`, escolhe "API Oficial" e vê o assistente de hoje ("Conecte o WhatsApp Business").
2. Clica em "Continuar com o Facebook". Em vez de abrir a janela da Meta na hora, o assistente mostra o **aviso do que muda no celular**, com os cinco pontos, e a opção "Criar cards no Funil de Entrada para os contatos das conversas antigas" (desmarcada).
3. Ele marca ou não a opção e clica em "Entendi, abrir a janela da Meta". Só então o `FB.login` abre, com `featureType: "whatsapp_business_app_onboarding"` nos `extras` (é o que faz a janela da Meta oferecer "usar o número que já está no WhatsApp Business").
4. Na janela da Meta, ele escolhe o número que já usa no celular e conclui. A Meta manda a mensagem `WA_EMBEDDED_SIGNUP` com `event = "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"` (pode vir só com `waba_id`) e o `code` chega no callback do login.
5. O assistente chama `completarConexaoWhatsApp({ code, wabaId, phoneNumberId?, criarCardsDoHistorico })`.
6. O servidor: confere que é Admin; troca o `code` por token; descobre o número (o `phone_number_id` recebido ou, se não veio, o número da WABA com `is_on_biz_app = true`); lê `display_phone_number, verified_name, is_on_biz_app`; confere que o número não está no canal direto de nenhuma empresa; **pula o `/register`** quando `is_on_biz_app` é verdadeiro (a Meta diz que o número já está registrado); inscreve o webhook na WABA; grava a conexão com `em_uso_no_celular = true` e `criar_cards_do_historico` com a escolha do Admin.
7. A lista mostra o cartão do número como "Conectado", com o selo "Em uso também no celular".

### Edge Cases
- A Meta devolve `FINISH` comum (número novo, sem o aplicativo): o servidor lê `is_on_biz_app = false`, faz o `/register` como hoje e grava `em_uso_no_celular = false`. O aviso aparece do mesmo jeito (o CRM não sabe de antemão qual caminho o Admin vai escolher na janela da Meta).
- O evento de conclusão veio sem `phone_number_id`: o servidor lista `GET /{waba_id}/phone_numbers?fields=id,is_on_biz_app` e usa o que tem `is_on_biz_app = true`; se houver só um número, usa esse.
- O mesmo número está no canal direto de **outra** empresa: recusado antes do `/register` e do webhook, sem gravar nada (CA-B23-04). A comparação é por dígitos (`normalizarWhatsapp`), porque a Meta devolve "+55 11 9…" e o canal direto guarda só dígitos.
- Opção dos cards: é gravada uma vez, na conexão, e não tem tela para mudar depois (SUP-B23-03).
- Hoje `completarConexaoWhatsApp` recusa com "Já existe um número conectado" quando a empresa tem **qualquer** linha em `whatsapp_connections`, inclusive do canal direto; isso já era assim e fica fora desta issue (o teste do CA-B23-04 usa o número do canal direto em outra empresa).

### Cenário de Erro
- Gerente ou Atendente chama a action: "Sem permissão", nada gravado (CA-B23-05).
- Número no canal direto: "Este número já está conectado pelo canal direto. Desconecte-o lá antes de conectá-lo pela API Oficial." (CA-B23-04).
- Meta não devolve token, número ou falha no webhook: as mensagens de hoje continuam ("Não foi possível conectar o número. Tente novamente." etc.).
- O Admin fecha a janela da Meta sem concluir: volta ao passo do aviso com "Configuração cancelada ou dados incompletos. Tente novamente." (comportamento de hoje, só que a partir do aviso).

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B23-01 | automática | `src/test/coexistencia-conectar.test.tsx` | Ao clicar em "Continuar com o Facebook", o assistente mostra os cinco pontos do aviso e a opção dos cards desmarcada, e `FB.login` ainda não foi chamado; só o botão do aviso abre a janela da Meta. |
| CA-B23-02 | automática | `src/test/coexistencia-conectar.integration.test.ts` e `src/test/coexistencia-conectar.test.tsx` | Com a Meta (fetch espião) devolvendo `is_on_biz_app = true`, a action grava a conexão `connected` com `em_uso_no_celular = true` e a escolha dos cards, sem chamar `/register`; `listarConexoesWhatsApp` devolve `emUsoNoCelular = true`; o cartão do número com essa marca mostra "Em uso também no celular". |
| CA-B23-03 | manual | roteiro abaixo | Número real em uso no WhatsApp Business conecta pela janela da Meta, aparece "Conectado" no CRM com o selo, o aplicativo continua funcionando e uma mensagem recebida aparece nos dois lugares. |
| CA-B23-04 | automática | `src/test/coexistencia-conectar.integration.test.ts` | Com o mesmo número (em dígitos) no canal direto de outra empresa, a action devolve a mensagem do canal direto, não chama `/register` nem o webhook e nenhuma conexão nova existe. |
| CA-B23-05 | automática | `src/test/coexistencia-conectar.integration.test.ts` | Gerente e Atendente recebem "Sem permissão", a Meta não é chamada e nenhuma conexão é criada. |

### Roteiro manual — CA-B23-03
Antes (uma vez, no painel da Meta do app "Atacado Exp"): em WhatsApp > Configuração, assinar os campos de webhook `account_update`, `history`, `smb_app_state_sync` e `smb_message_echoes` além dos de hoje. O celular precisa do WhatsApp Business 2.24.17 ou mais novo.
1. Entrar como Admin numa empresa sem número na API Oficial e abrir Configurações > WhatsApp > API Oficial.
2. Clicar em "Continuar com o Facebook": deve aparecer o aviso com os cinco pontos e a opção dos cards.
3. Clicar em "Entendi, abrir a janela da Meta". Na janela, escolher a opção de usar o número que já está no WhatsApp Business e seguir as instruções (ler o QR no celular).
4. Ao concluir, o CRM deve mostrar o número "Conectado" com o selo "Em uso também no celular".
5. No celular, o WhatsApp Business deve continuar abrindo a conversa normalmente.
6. De outro telefone, mandar uma mensagem para o número: ela deve aparecer no aplicativo do celular e no chat do CRM.

## Banco de Dados

- Tabela: `whatsapp_connections` (migration `supabase/migrations/20261030000030_whatsapp_connections_coexistencia.sql`)
  - `em_uso_no_celular` (boolean, not null, default false) — o número continua em uso no WhatsApp Business do celular (`is_on_biz_app` da Meta na conexão).
  - `criar_cards_do_historico` (boolean, not null, default false) — escolha do Admin na conexão: os contatos das conversas antigas ganham card no Funil de Entrada (usada na B23-03).
  - `grant select` das duas colunas para `authenticated`: a leitura dessa tabela pelo navegador é por coluna (migration `20261006000004`), e sem o grant a lista da tela volta vazia.

## Arquivos

- **Criar:** `supabase/migrations/20261030000030_whatsapp_connections_coexistencia.sql` — as duas colunas acima (o número 20261030000020 já era da B54, na outra sessão).
- **Modificar:** `src/integrations/supabase/types.ts` — só as duas colunas, na forma que o gerador produz: regenerar do banco de teste traria junto colunas da B54 e tabelas de séries anteriores que nunca foram regeneradas.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/wizard-conexao.tsx` — passo "aviso" entre a introdução e a janela da Meta (cinco pontos + opção dos cards), `featureType` da coexistência no `FB.login`, aceita o evento `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` (com ou sem `phone_number_id`) e manda a escolha dos cards para a action.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/actions.ts` — `completarConexaoWhatsApp` descobre o número pela WABA quando preciso, lê `is_on_biz_app`, recusa número do canal direto (qualquer empresa, por dígitos com `normalizarWhatsapp` de `@/lib/telefone`), pula o `/register` em coexistência e grava as duas colunas.
- **Modificar:** `src/lib/whatsapp/gateway/instancias.ts` — `ConexaoListada`/`RegistroDeConexao` ganham `emUsoNoCelular`; `listarConexoes` lê `em_uso_no_celular`.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/cartao-numero.tsx` — `NumeroConectado.em_uso_no_celular` e o selo "Em uso também no celular" (reusa `Badge` de `@/components/ui/badge`).
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/page.tsx` — passa `em_uso_no_celular` para o cartão.
- **Modificar:** `src/test/gateway-instancias.test.ts` — o teste "devolve todas, com o canal de cada uma" compara a forma exata da conexão listada e ganha o campo `emUsoNoCelular: false` (achado ao rodar os testes da área, L-05).
- **Criar:** `src/test/coexistencia-conectar.test.tsx` — CA-B23-01 e a parte de tela do CA-B23-02.
- **Criar:** `src/test/coexistencia-conectar.integration.test.ts` — CA-B23-02, CA-B23-04 e CA-B23-05 contra o banco de teste, com a Meta como fetch espião (mesmo padrão de `src/test/numero-meta-unico.integration.test.ts`).

## Dependências Externas

- Meta Embedded Signup (SDK `connect.facebook.net`, já em uso) — `extras.featureType = "whatsapp_business_app_onboarding"` e evento `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING`; Graph API `GET /{phone_number_id}?fields=display_phone_number,verified_name,is_on_biz_app` e `GET /{waba_id}/phone_numbers?fields=id,is_on_biz_app` (documentação "Onboarding WhatsApp Business app users", lida em 30/10/2026).

## Checklist

- [x] Migration das duas colunas, aplicada no banco de teste (`npm run db:teste:push`) e `types.ts` com as colunas
- [x] `listarConexoes` e `ConexaoListada` com `emUsoNoCelular`
- [x] Cartão do número com o selo "Em uso também no celular" e `page.tsx` passando a marca
- [x] Assistente com o passo do aviso (cinco pontos + opção dos cards) e `featureType` da coexistência
- [x] Assistente aceita `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` com ou sem `phone_number_id`
- [x] `completarConexaoWhatsApp`: número pela WABA quando preciso, `is_on_biz_app`, recusa do canal direto, sem `/register` em coexistência, grava as colunas
- [x] `tsc` no projeto inteiro sem erro (L-07) e todos os testes que renderizam o assistente, o cartão ou usam `listarConexoes` passando (L-05); o `tema-cores-fixas.test.ts` já falhava no master em arquivos fora desta issue
