# Lições aprendidas

Regras que nasceram de uma falha real em uma issue. O `/spec` e o `/plan` leem as dez
primeiras, as recorrentes na frente. Este arquivo é escrito pelo auditor
(`auditor.mjs licao ...`); não edite à mão.

| ID | Lição | Origem | Falha | Voltou a acontecer em |
|---|---|---|---|---|
| L-01 | Exceção aprovada ao auditor vai na tabela ## Exceções (problema, alvo, motivo, aprovador, dia); texto solto não é lido pelo script. | B25-01 | critério sem teste em CA-B25-01 | — |
| L-02 | Teste automático que confere cada peça isolada não pega laço entre peças: a tela mandava o desativado para /login?motivo=desativada e o porteiro, vendo a sessão ainda assinada, devolvia ao Dashboard. O usuário ficava só com o menu, sem aviso. Quando uma mudança troca quem percebe um estado (porteiro → tela), testar o caminho inteiro, de ponta a ponta, não só a peça nova. | B27-01 | teste-manual: Marcelle, 20/10/2026, teste manual CA-B27-10: 'não houve aviso nenhum na tela, simplesmente o usuário não consegue visualizar o conteúdo das páginas, apenas o menu lateral' | — |
