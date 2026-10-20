# B29-02: CRM busca a foto quando o contato nasce e guarda uma cópia

**Tipo:** Implementação
**Página:** Recebimento de mensagem (canal direto e Meta), novo lead, novo contato, pedido da loja, lixeira
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-foto-de-perfil.md`

## Descrição

Quando um contato nasce por qualquer caminho, o CRM pede a foto dele a um número do canal
direto conectado da empresa (o número por onde ele escreveu, senão qualquer um), guarda uma
cópia pequena no storage privado dos anexos e anota no contato onde está. "Sem foto" é
definitivo; falha técnica do gateway tenta de novo na próxima mensagem. A busca nunca
atrasa nem derruba a mensagem, o lead ou o pedido. Restaurar da lixeira devolve a foto;
apagar de vez apaga a cópia.

Depende da B29-01 (a consulta no gateway) publicada na VPS.

## Pronto quando

Numa empresa com canal direto conectado, um telefone novo com foto visível manda a primeira
mensagem (ou vira lead, contato, pedido ou linha importada) e, segundos depois, o contato no
banco aponta para uma cópia da foto no storage, que só quem é da empresa consegue abrir.
Telefone sem foto, empresa sem canal direto e gateway fora do ar deixam o contato sem foto
e não atrapalham nada.

## Critérios de aceite

- **CA-B29-05** (automática) — Mensagem recebida pelo canal direto traz a foto do contato novo. Dado uma empresa com um número do canal direto conectado e um telefone desconhecido cujo WhatsApp tem foto visível, quando chega a primeira mensagem desse telefone por esse número, então o contato nasce, a cópia da foto fica guardada no storage do CRM e o contato aponta para ela.
- **CA-B29-06** (automática) — Contato que chega pela Meta ganha a foto pelo canal direto. Dado uma empresa com um número da API Oficial e outro do canal direto, ambos conectados, e um telefone desconhecido com foto visível, quando chega a primeira mensagem desse telefone pelo número da Meta, então o contato nasce com a foto buscada pelo número do canal direto.
- **CA-B29-07** (automática) — Lead, contato novo e pedido da loja também buscam. Dado uma empresa com um número do canal direto conectado, quando um contato nasce por lead novo no funil, por "Novo contato" em Contatos ou por pedido na loja, então o CRM pede a foto desse contato ao gateway uma vez, do mesmo jeito que faz para a mensagem recebida.
- **CA-B29-08** (automática) — Sem foto visível, o contato fica com as iniciais e não busca de novo. Dado um telefone cujo WhatsApp não mostra foto, quando o contato nasce e, depois, escreve de novo, então o contato fica sem foto (iniciais ou ícone), a tentativa fica anotada, e a segunda mensagem não gera nova consulta ao gateway.
- **CA-B29-09** (automática) — Empresa sem canal direto não busca nada. Dado uma empresa só com número da API Oficial, ou sem número conectado, quando um contato nasce, então o CRM não chama o gateway, e o contato fica sem foto.
- **CA-B29-10** (automática) — Gateway fora do ar não atrapalha a mensagem. Dado uma empresa com canal direto e o gateway respondendo erro ou demorando além do limite na consulta de foto, quando chega a mensagem de um telefone desconhecido, então o contato nasce, a mensagem é gravada e aparece no chat como hoje; a foto fica faltando, e na próxima mensagem desse contato o CRM tenta buscar de novo.
- **CA-B29-11** (automática) — Lixeira: restaurar devolve a foto; apagar de vez apaga a cópia. Dado um contato com foto guardada, quando ele é excluído e restaurado, então volta com a mesma foto; e quando ele é apagado de vez, então a cópia da foto some do storage.
- **CA-B29-12** (automática) — Foto só para quem é da empresa. Dado a cópia da foto de um contato de uma empresa, quando alguém sem login, ou logado em outra empresa, tenta abrir o endereço da foto, então não consegue (mesma regra dos anexos do chat).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B29-01 | "Só na primeira vez" vale também quando a primeira busca falha por culpa do gateway (fora do ar, demorou): o CRM anota a tentativa e não tenta de novo, mesmo que o contato escreva depois | invalidada | Marcelle, 20/10/2026: falha técnica tenta de novo na próxima mensagem do contato; "sem foto visível" é definitivo. |
| SUP-B29-03 | A cópia fica no mesmo storage privado dos anexos do chat, servida por endereço assinado, como os anexos | invalidada | O storage dos anexos é público por endereço. Marcelle, 20/10/2026: bucket próprio e privado (`contact-photos`), endereço assinado de 1 h. |
| SUP-B29-04 | Quando o contato escreveu por um número do canal direto, a busca usa esse número; nos demais casos, qualquer número do canal direto conectado da empresa, sem preferência | confirmada | Marcelle, 20/10/2026. |
| SUP-B29-05 | A busca da foto acontece depois de a mensagem/lead/pedido estar gravado, com limite de tempo curto, para nunca atrasar o que o atendente vê | confirmada | Marcelle, 20/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B29-02 | Contato que chega pela Meta pode ter a foto buscada por um número do canal direto da mesma empresa? | respondida | Marcelle, 20/10/2026: sim, qualquer número do canal direto conectado serve. |
| PER-B29-03 | Com que frequência atualizar a foto? | respondida | Marcelle, 20/10/2026: só na primeira vez, quando o contato nasce. |
| PER-B29-04 | Os contatos que já existem no banco quando a mudança subir devem ganhar foto (uma varredura única, respeitando o ritmo do gateway) ou só os que nascerem depois? | respondida | Marcelle, 20/10/2026: só os que nascerem depois; o banco vai ser limpo. |

## Cenários

### Happy Path
1. Chega a primeira mensagem de um telefone desconhecido por um número do canal direto.
   `registrarMensagemRecebida` cria o contato, a conversa e a mensagem, transmite a
   mensagem ao vivo e dispara as automações, como hoje.
2. No fim, chama `buscarEGuardarFotoDoContato` (novo, `src/lib/whatsapp/foto-de-perfil.ts`):
   lê `photo_checked_at` do contato; nulo → escolhe a conexão do canal direto (a da mensagem
   se for `gateway` e `connected`; senão a primeira `gateway` + `connected` da empresa);
   pede `GET {GATEWAY_BASE_URL}/instances/{instance_id}/contacts/{telefone}/photo` com
   `X-Instance-Token` e 10 s de limite.
3. `200` → grava os bytes em `contact-photos/{workspace}/{contato}.jpg` (bucket novo, privado,
   `upsert`), marca `photo_path` e `photo_checked_at = now()`, e transmite `contato_foto`
   `{ contact_id, photo_url }` (endereço assinado de 1 h) no tópico da empresa, para o chat
   aberto trocar o círculo sem recarregar (B29-03 escuta).
4. Mesma chamada depois de criar contato em `criarContato` (Contatos), `criarNovoLead`
   (funil) e `acharOuCriarContato` do pedido da loja, e no webhook da Meta depois de gravar a mensagem.

### Edge Cases
- `204` do gateway → "sem foto": `photo_path = null`, `photo_checked_at = now()`. Nunca mais busca.
- Empresa sem conexão `gateway` conectada → não chama o gateway nem marca nada (poderá buscar quando houver).
- Telefone que não é só dígitos (LID, B7) → não busca nem marca.
- Gateway recusa (4xx/5xx), não responde, ou o upload falha → nada é gravado; a próxima
  mensagem tenta de novo. O erro vai ao log, nunca à resposta.
- Contato já conferido (`photo_checked_at` preenchido) → sai na primeira leitura.
- Lixeira: restaurar não mexe em `photo_path`; `apagarDaLixeira` remove `contact-photos/{ws}/{id}.jpg` antes do RPC.

### Cenário de Erro
- A busca é a última coisa da requisição e engole as próprias falhas: mensagem, lead e
  pedido já estão gravados e respondidos do mesmo jeito que hoje.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B29-05 | automática | `src/test/foto-de-perfil-contato.test.ts` e `src/test/gateway-recebimento.test.ts` | o recebimento pelo canal direto chama a busca com o contato e a conexão da mensagem; a busca grava os bytes em `contact-photos/{ws}/{id}.jpg` e aponta o contato para o caminho |
| CA-B29-06 | automática | `src/test/foto-de-perfil-contato.test.ts` e `src/test/webhook-whatsapp-automacoes.test.ts` | mensagem pela Meta chama a busca; com a conexão da mensagem sendo `meta`, a busca usa a conexão `gateway` conectada da empresa |
| CA-B29-07 | automática | `src/test/foto-de-perfil-caminhos.test.ts` | `criarContato`, `criarNovoLead` e `registrarPedido` chamam a busca uma vez para o contato criado |
| CA-B29-08 | automática | `src/test/foto-de-perfil-contato.test.ts` | `204` marca `photo_checked_at` sem caminho; contato já conferido não gera chamada ao gateway |
| CA-B29-09 | automática | `src/test/foto-de-perfil-contato.test.ts` | sem conexão `gateway` conectada, nenhuma chamada de rede e nada gravado |
| CA-B29-10 | automática | `src/test/foto-de-perfil-contato.test.ts` e `src/test/gateway-recebimento.test.ts` | gateway com erro/tempo esgotado: a mensagem é gravada e transmitida, nada é marcado no contato, e a chamada seguinte tenta de novo |
| CA-B29-11 | automática | `src/test/lixeira-foto.test.ts` | `apagarDaLixeira` remove a foto do bucket; restaurar não toca em `photo_path` |
| CA-B29-12 | automática | `src/test/foto-de-perfil-seguranca.integration.test.ts` | arquivo no bucket `contact-photos`: endereço público responde erro para anônimo; usuário de outra empresa não baixa; o endereço assinado abre |

## Banco de Dados

- Tabela `contacts`:
  - `photo_path` (text, nulo) — caminho da cópia no bucket `contact-photos`.
  - `photo_checked_at` (timestamptz, nulo) — quando a busca terminou de vez (achou ou "sem foto"). Nulo = ainda não buscou ou falhou.
- Bucket `contact-photos`, privado, sem política para `authenticated`: só a chave de serviço grava e assina.
- Migration: `supabase/migrations/20261020000007_contatos_foto_de_perfil.sql`, aplicada com `npx supabase db push --linked`; depois `npx supabase gen types typescript --linked > src/integrations/supabase/types.ts`.

## Arquivos

- **Criar:** `supabase/migrations/20261020000007_contatos_foto_de_perfil.sql`
- **Criar:** `src/lib/whatsapp/foto-de-perfil.ts` — `buscarEGuardarFotoDoContato`, `caminhoDaFoto`, `urlAssinadaDaFoto`/`urlsAssinadasDasFotos`, `apagarFotoDoContato`, constantes do bucket.
- **Modificar:** `src/lib/whatsapp/realtime.ts` — `transmitirContatoFoto`.
- **Modificar:** `src/lib/whatsapp/recebimento.ts` — chama a busca no fim de `registrarMensagemRecebida`.
- **Modificar:** `src/app/api/webhooks/whatsapp/route.ts` — chama a busca depois de gravar a mensagem.
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — chama depois do insert em `criarContato`.
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — chama depois de `localizarOuCriarContato` em `criarNovoLead`.
- **Modificar:** `src/lib/catalogo/pedidos.ts` — chama depois do insert em `acharOuCriarContato`.
- **Modificar:** `src/lib/lixeira.ts` — `apagarDaLixeira` remove a foto.
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado.
- **Criar:** `src/test/foto-de-perfil-contato.test.ts`, `src/test/foto-de-perfil-caminhos.test.ts`, `src/test/lixeira-foto.test.ts`, `src/test/foto-de-perfil-seguranca.integration.test.ts`
- **Modificar:** `src/test/gateway-recebimento.test.ts`, `src/test/webhook-whatsapp-automacoes.test.ts` — a chamada da busca.

## Dependências Externas

- Supabase Storage: `createSignedUrl(s)` em bucket privado (docs: Storage → Serving assets → signed URLs).
- Gateway B29-01 publicado na VPS (a rota `/contacts/:phone/photo`).

## Checklist

- [ ] Migration aplicada no remoto e tipos regenerados
- [ ] Módulo `foto-de-perfil.ts` com busca, guarda, endereço assinado e remoção
- [ ] Chamada nos cinco caminhos (gateway, Meta, Contatos, funil, loja) e na lixeira
- [ ] Evento `contato_foto` transmitido depois de guardar
- [ ] Testes da tabela Prova passando; `tsc`, lint e build

