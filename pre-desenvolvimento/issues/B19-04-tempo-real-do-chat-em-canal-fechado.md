# B19-04: Tempo real do chat em canal fechado

**Tipo:** Implementação
**Página:** Chat (`/chat`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-1.md` — módulo 5

## Descrição

Fechar a falha que transmite o aviso de mensagem nova, com o texto, num canal que
qualquer pessoa pode ouvir sabendo o código da empresa. O canal passa a ser fechado:
só entra quem está logado e pertence àquela empresa, tanto para ouvir quanto para
mandar avisos.

## Pronto quando

Com o chat aberto, mensagem recebida aparece na hora sem recarregar; contato excluído
some da caixa ao vivo; o chat aberto por muito tempo (sessão renovada) continua
recebendo; e testes automatizados provam que alguém sem login não entra no canal da
empresa, um usuário de outra empresa também não, e ninguém de fora consegue injetar
aviso falso. Conferido com mensagem real chegando no CRM publicado.
