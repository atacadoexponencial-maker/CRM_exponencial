# B13-02: Excluir lead e contato — some do pipeline, de contatos e do chat

**Tipo:** Implementação
**Página:** Pipeline (painel do card), Contatos (lista e perfil), Chat
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-lixeira-contatos.md`

## Descrição

Criar a ida para a lixeira: botão "Excluir" no painel do card, na lista e no perfil do
contato, com o diálogo aprovado na B13-01 (o que vai junto: cards, conversas, mensagens).
Confirmar manda o contato e todos os seus cards para a lixeira — sem apagar nada — e
eles somem na hora do Pipeline (inclusive para outro usuário com o quadro aberto), da
lista e da busca de Contatos e do Chat (caixa de entrada, busca, conversa aberta fecha
com aviso, envio bloqueado). Qualquer papel exclui o que já consegue ver. Registra quem
excluiu e quando.

## Pronto quando

No CRM publicado, excluir o lead de teste "Teste Cliente" pelo painel do card tira ele
do funil, de Contatos e do Chat; um atendente consegue excluir um contato seu e não
consegue excluir o de outro; e nada foi apagado de verdade no banco.
