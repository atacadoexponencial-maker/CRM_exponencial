# B28-02: CRM busca a foto quando o contato nasce e guarda uma cópia

**Tipo:** Implementação
**Página:** Recebimento de mensagem (canal direto e Meta), novo lead, novo contato, pedido da loja, importação, lixeira
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-foto-de-perfil.md`

## Descrição

Quando um contato nasce por qualquer caminho, o CRM pede a foto dele a um número do canal
direto conectado da empresa (o número por onde ele escreveu, senão qualquer um), guarda uma
cópia pequena no storage privado dos anexos e anota no contato onde está. "Sem foto" é
definitivo; falha técnica do gateway tenta de novo na próxima mensagem. A busca nunca
atrasa nem derruba a mensagem, o lead ou o pedido. Restaurar da lixeira devolve a foto;
apagar de vez apaga a cópia.

Depende da B28-01 (a consulta no gateway) publicada na VPS.

## Pronto quando

Numa empresa com canal direto conectado, um telefone novo com foto visível manda a primeira
mensagem (ou vira lead, contato, pedido ou linha importada) e, segundos depois, o contato no
banco aponta para uma cópia da foto no storage, que só quem é da empresa consegue abrir.
Telefone sem foto, empresa sem canal direto e gateway fora do ar deixam o contato sem foto
e não atrapalham nada.

## Critérios de aceite

- **CA-B28-05** (automática) — Mensagem recebida pelo canal direto traz a foto do contato novo. Dado uma empresa com um número do canal direto conectado e um telefone desconhecido cujo WhatsApp tem foto visível, quando chega a primeira mensagem desse telefone por esse número, então o contato nasce, a cópia da foto fica guardada no storage do CRM e o contato aponta para ela.
- **CA-B28-06** (automática) — Contato que chega pela Meta ganha a foto pelo canal direto. Dado uma empresa com um número da API Oficial e outro do canal direto, ambos conectados, e um telefone desconhecido com foto visível, quando chega a primeira mensagem desse telefone pelo número da Meta, então o contato nasce com a foto buscada pelo número do canal direto.
- **CA-B28-07** (automática) — Lead, contato novo, pedido da loja e importação também buscam. Dado uma empresa com um número do canal direto conectado, quando um contato nasce por lead novo no funil, por "Novo contato" em Contatos, por pedido na loja ou por importação de planilha, então o CRM pede a foto desse contato ao gateway uma vez, do mesmo jeito que faz para a mensagem recebida.
- **CA-B28-08** (automática) — Sem foto visível, o contato fica com as iniciais e não busca de novo. Dado um telefone cujo WhatsApp não mostra foto, quando o contato nasce e, depois, escreve de novo, então o contato fica sem foto (iniciais ou ícone), a tentativa fica anotada, e a segunda mensagem não gera nova consulta ao gateway.
- **CA-B28-09** (automática) — Empresa sem canal direto não busca nada. Dado uma empresa só com número da API Oficial, ou sem número conectado, quando um contato nasce, então o CRM não chama o gateway, e o contato fica sem foto.
- **CA-B28-10** (automática) — Gateway fora do ar não atrapalha a mensagem. Dado uma empresa com canal direto e o gateway respondendo erro ou demorando além do limite na consulta de foto, quando chega a mensagem de um telefone desconhecido, então o contato nasce, a mensagem é gravada e aparece no chat como hoje; a foto fica faltando, e na próxima mensagem desse contato o CRM tenta buscar de novo.
- **CA-B28-11** (automática) — Lixeira: restaurar devolve a foto; apagar de vez apaga a cópia. Dado um contato com foto guardada, quando ele é excluído e restaurado, então volta com a mesma foto; e quando ele é apagado de vez, então a cópia da foto some do storage.
- **CA-B28-12** (automática) — Foto só para quem é da empresa. Dado a cópia da foto de um contato de uma empresa, quando alguém sem login, ou logado em outra empresa, tenta abrir o endereço da foto, então não consegue (mesma regra dos anexos do chat).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B28-01 | "Só na primeira vez" vale também quando a primeira busca falha por culpa do gateway (fora do ar, demorou): o CRM anota a tentativa e não tenta de novo, mesmo que o contato escreva depois | invalidada | Marcelle, 20/10/2026: falha técnica tenta de novo na próxima mensagem do contato; "sem foto visível" é definitivo. |
| SUP-B28-03 | A cópia fica no mesmo storage privado dos anexos do chat, servida por endereço assinado, como os anexos | confirmada | Marcelle, 20/10/2026. |
| SUP-B28-04 | Quando o contato escreveu por um número do canal direto, a busca usa esse número; nos demais casos, qualquer número do canal direto conectado da empresa, sem preferência | confirmada | Marcelle, 20/10/2026. |
| SUP-B28-05 | A busca da foto acontece depois de a mensagem/lead/pedido estar gravado, com limite de tempo curto, para nunca atrasar o que o atendente vê | confirmada | Marcelle, 20/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B28-02 | Contato que chega pela Meta pode ter a foto buscada por um número do canal direto da mesma empresa? | respondida | Marcelle, 20/10/2026: sim, qualquer número do canal direto conectado serve. |
| PER-B28-03 | Com que frequência atualizar a foto? | respondida | Marcelle, 20/10/2026: só na primeira vez, quando o contato nasce. |
| PER-B28-04 | Os contatos que já existem no banco quando a mudança subir devem ganhar foto (uma varredura única, respeitando o ritmo do gateway) ou só os que nascerem depois? | respondida | Marcelle, 20/10/2026: só os que nascerem depois; o banco vai ser limpo. |
