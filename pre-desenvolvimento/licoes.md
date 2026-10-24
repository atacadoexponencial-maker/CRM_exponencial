# Lições aprendidas

Regras que nasceram de uma falha real em uma issue. O `/spec` e o `/plan` leem as dez
primeiras, as recorrentes na frente. Este arquivo é escrito pelo auditor
(`auditor.mjs licao ...`); não edite à mão.

| ID | Lição | Origem | Falha | Voltou a acontecer em |
|---|---|---|---|---|
| L-01 | Exceção aprovada ao auditor vai na tabela ## Exceções (problema, alvo, motivo, aprovador, dia); texto solto não é lido pelo script. | B25-01 | critério sem teste em CA-B25-01 | — |
| L-02 | Teste automático que confere cada peça isolada não pega laço entre peças: a tela mandava o desativado para /login?motivo=desativada e o porteiro, vendo a sessão ainda assinada, devolvia ao Dashboard. O usuário ficava só com o menu, sem aviso. Quando uma mudança troca quem percebe um estado (porteiro → tela), testar o caminho inteiro, de ponta a ponta, não só a peça nova. | B27-01 | teste-manual: Marcelle, 20/10/2026, teste manual CA-B27-10: 'não houve aviso nenhum na tela, simplesmente o usuário não consegue visualizar o conteúdo das páginas, apenas o menu lateral' | — |
| L-03 | Antes de reservar uma série no /spec, conferir também os branches remotos (git fetch e git grep da série em origin/*): o README do master não vê a reserva feita em branch de outra pessoa, e duas séries iguais nascem. | B29-01 | revisildo: 20/10/2026: a B28 foi reservada no master para a foto de perfil às 17h50; o Luan já a tinha reservado às 16h04 no branch b28-espera-e-fim-das-sequencias. A série foi renumerada para B29 nos dois repositórios. | — |
| L-04 | Na seção Arquivos da issue, um caminho por linha: o auditor não lê dois arquivos citados na mesma linha e acusa o segundo como fora da issue. | B32-05 | arquivo fora da issue em src/test/relatorios-graficos.test.tsx | — |
| L-05 | Ao mudar um componente ou as actions que ele chama, rode todos os testes que renderizam esse componente, não só os da issue: mock de módulo sem a função nova quebra o teste de outra issue em silêncio. | B41-05 | revisildo: B41-04 passou a chamar automacoesQueUsam no aviso de apagar da tela de funis; o teste de tela da B41-02, que mocka as actions dessa tela, quebrou e só foi visto na B41-05, porque na B41-04 rodei só os testes dela | — |
| L-06 | Quando o Então de um critério promete duas coisas (o que a tela mostra e o resultado que ela produz), o teste confere as duas, não só a que é mais fácil de ver. | B42-01 | revisildo: o teste do CA-B42-25 conferia só o nome novo do campo na tela, e o Então também pedia que o filtro salvo antigo trouxesse os mesmos contatos | — |
| L-07 | Antes de dar uma issue por pronta, rode o tsc no projeto inteiro: o Vitest não confere tipos, então teste e código com erro de tipo passam verdes. | B42-02 | revisildo: o teste da B42-01 (filtro-contatos-rfv.integration.test.ts) foi commitado com um parâmetro sem tipo; o Vitest passou porque não confere tipos, e só o tsc da B42-02 acusou | — |
