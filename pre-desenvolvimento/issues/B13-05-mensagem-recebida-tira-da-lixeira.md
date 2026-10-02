# B13-05: Mensagem recebida tira o contato da lixeira

**Tipo:** Implementação
**Página:** Chat (recebimento pela API Oficial e pelo canal direto)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-lixeira-contatos.md`

## Descrição

Quando chega mensagem de um telefone cujo contato está na lixeira — pelo webhook da API
Oficial ou pelo canal direto (gateway) —, o contato é restaurado sozinho (mesmo efeito
do "Restaurar" da B13-04, sem a recusa por telefone duplicado, que não se aplica) e a
mensagem entra na conversa como qualquer mensagem recebida. Nenhuma mensagem de cliente
se perde nem cria contato duplicado.

Depende de B13-04.

## Pronto quando

Com o chip de teste: excluir um contato, mandar mensagem do celular dele, e a conversa
aparece na caixa de entrada com o histórico antigo e a mensagem nova; o contato sai da
lixeira e volta ao funil.
