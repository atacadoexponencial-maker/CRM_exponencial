# B43-02: Condição "Perfil RFV" nas automações

**Tipo:** Implementação
**Página:** Configurações → Automações (editor e motor)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacao-por-perfil-rfv.md`

## Descrição

O editor de automações ganha a condição "Perfil RFV é um destes" (um ou mais perfis ou "Sem compras", saídas sim e não), avaliada pelo perfil da hora, com qualquer gatilho.

## Pronto quando

Uma automação "Mensagem recebida → Perfil RFV é Campeão?" separa os Campeões dos outros contatos e segue pela saída certa.

## Critérios de aceite

- **CA-B43-15** (automática) — Montar a condição "Perfil RFV". Dado uma automação com qualquer gatilho, quando a pessoa acrescenta a condição "Perfil RFV", marca Campeão e Clientes Fiéis e salva, então a condição fica gravada com os dois perfis e aparece igual ao abrir de novo.
- **CA-B43-22** (automática) — A condição "Perfil RFV" usa o perfil da hora. Dado uma automação "Mensagem recebida → Perfil RFV é Campeão? sim: tag 'vip-atendimento'", e dois contatos, um Campeão e um Hibernando, que mandam mensagem, quando a automação roda, então só o Campeão recebe a tag "vip-atendimento".

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B43-05 | "Vindo de" e a condição "Perfil RFV" oferecem também a opção "Sem compras". O "Vindo de" não deixa marcar um perfil que também está no destino. | confirmada | Marcelle, 24/10/2026 (aprovação da spec). |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B43-02 | O perfil mostrado no contato, na lista e no chat, e usado na condição, é o da hora ou o da conferência do dia? | respondida | Sempre o da hora, igual a Relatórios. Marcelle, 24/10/2026. |
