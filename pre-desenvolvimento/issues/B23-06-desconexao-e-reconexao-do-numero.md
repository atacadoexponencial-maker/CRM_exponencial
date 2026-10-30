# B23-06: Desconexão vinda do celular, reconexão e remoção no CRM

**Tipo:** Implementação
**Página:** Configurações > WhatsApp (cartão do número), Alertas, Chat, Campanhas, Automações
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-coexistencia.md`

## Descrição

Quando a Meta avisa que o número em uso no celular foi desconectado (pelo dono, por falta de uso do aplicativo ou por troca de aparelho ou número), o cartão passa a "Desconectado" com o motivo em linguagem simples e a central de alertas ganha um alerta para Admin e Gerente. Todo envio por número desconectado (chat, campanha, automação) é recusado com explicação. Reconectar o mesmo número mantém conversas e contatos sem repetir mensagens. Remover o número no CRM mostra a instrução de desconectar também no celular e tira o número da lista sem apagar nada.

## Pronto quando

Um número desconectado pelo celular aparece assim no cartão, com o motivo e um alerta; tentar enviar por ele mostra que precisa conectar de novo; reconectar volta tudo a "Conectado" com as mesmas conversas; remover pede para desconectar no celular e some da lista.

## Critérios de aceite

- **CA-B23-26** (automática) — Desconexão vinda do celular aparece no CRM com o motivo. Dado um número conectado em uso também no celular, quando a Meta avisa que ele foi desconectado, com o motivo, então o cartão do número mostra "Desconectado" e o motivo em linguagem simples, e a central de alertas ganha um alerta visível para Admin e Gerente.
- **CA-B23-27** (automática) — Envio por número desconectado é recusado com explicação. Dado um número desconectado, quando alguém tenta enviar mensagem, campanha, sequência ou automação por ele, então o envio não sai e o CRM mostra que o número está desconectado e precisa ser conectado de novo.
- **CA-B23-28** (automática) — Reconectar mantém as conversas e não repete as antigas. Dado um número desconectado, com conversas no CRM, quando o Admin o conecta de novo, então as conversas e os contatos continuam os mesmos, o número volta a "Conectado" e nenhuma mensagem já existente aparece em dobro.
- **CA-B23-29** (manual) — Desconectar pelo celular reflete no CRM, com chip real. Dado um número conectado em uso também no celular, quando o dono desconecta pelo aplicativo, então em poucos minutos o CRM mostra o número como desconectado pelo celular.
- **CA-B23-30** (automática) — Remover no CRM orienta a desconectar no celular. Dado um número em uso também no celular, quando o Admin pede para removê-lo no CRM, então a confirmação explica que é preciso desconectar também no aplicativo (Configurações > Conta > Plataforma Comercial) e, ao confirmar, o número sai da lista do CRM sem apagar conversas nem contatos.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B23-08 | Remover o número no CRM continua só tirando-o do CRM; desligar de verdade é feito pelo dono, no celular. | confirmada | Marcelle, 10/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B23-05 | Qual número com WhatsApp Business no celular será usado nos três testes com chip real (conexão, envio pelo celular, desconexão)? | aberta | Marcelle ainda não tem o número (10/10/2026). Só trava os três testes com chip real. |
