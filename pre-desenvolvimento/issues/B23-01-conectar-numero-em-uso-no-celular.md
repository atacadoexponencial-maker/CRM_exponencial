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
| SUP-B23-01 | A configuração atual do Cadastro Incorporado do app "Atacado Exp" já oferece, na janela da Meta, a opção de conectar um número em uso no celular, sem nova aprovação. | aberta | — |
| SUP-B23-02 | A opção de criar cards para os contatos das conversas antigas vem **desmarcada** por padrão. | confirmada | Marcelle, 10/10/2026. |
| SUP-B23-03 | A opção de criar cards é escolhida uma vez, antes de conectar, e não pode ser mudada depois. | confirmada | Marcelle, 10/10/2026. |
| SUP-B23-07 | O ritmo atual de envio de campanhas fica abaixo do teto de 20 mensagens por segundo que a Meta impõe a número em uso no celular. | confirmada | Conferido no código em 30/10/2026: `src/lib/campanhas.ts` envia um destinatário por vez, esperando a resposta da Meta e conferindo o status da campanha no banco antes de cada envio, em lotes de 40 e no máximo 3 campanhas por rodada. Fica em poucas mensagens por segundo, bem abaixo de 20. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B23-05 | Qual número com WhatsApp Business no celular será usado nos três testes com chip real (conexão, envio pelo celular, desconexão)? | aberta | Marcelle ainda não tem o número (10/10/2026). Só trava os três testes com chip real. |
