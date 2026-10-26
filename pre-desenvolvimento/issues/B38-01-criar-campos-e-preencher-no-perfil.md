# B38-01: Criar campos personalizados e preenchê-los no perfil do contato

**Tipo:** Implementação
**Página:** Configurações → Campos personalizados; Contatos → perfil do contato
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-campos-personalizados.md`

## Descrição

Admin e Gerente criam, renomeiam e ordenam os campos da empresa nos onze tipos, com as opções das listas, e o perfil do contato ganha o bloco "Campos personalizados", onde Admin, Gerente e o atendente do contato preenchem os valores, conferidos pelo tipo.

## Pronto quando

Em Configurações → Campos personalizados dá para criar o campo "Porte" (Lista de opções) e o "CNPJ" (Texto), e no perfil de um contato dá para preencher os dois e ver os valores no formato de cada tipo. O atendente preenche só os contatos que atende; outra empresa não vê nada.

## Critérios de aceite

- **CA-B38-01** (automática) — Admin cria um campo de texto. Dado um Admin em Configurações → Campos personalizados, sem nenhum campo criado, quando ele cria o campo "CNPJ" do tipo Texto, então o campo aparece na lista com o tipo "Texto" e "0 contatos preenchidos"
- **CA-B38-02** (automática) — Gerente também cria e edita campos. Dado um Gerente na mesma tela, quando ele cria o campo "Instagram" do tipo Link e depois o renomeia para "Instagram da loja", então o campo aparece na lista com o nome novo
- **CA-B38-03** (automática) — Atendente não gerencia campos. Dado um Atendente, quando ele abre o menu de Configurações ou entra direto no endereço da tela de campos, então a opção "Campos personalizados" não aparece no menu, o endereço o leva de volta, e o servidor recusa criar, editar, ordenar ou apagar campo pedido em nome dele
- **CA-B38-04** (automática) — Os onze tipos podem ser criados. Dado um Admin na tela de campos, quando ele abre a escolha de tipo, então aparecem Texto, Texto longo, Número, Dinheiro, Data, Lista de opções, Múltipla escolha, Sim/não, Link, E-mail e Telefone, e um campo de cada tipo pode ser criado
- **CA-B38-05** (automática) — Lista de opções exige ao menos uma opção. Dado um Admin criando um campo do tipo Lista de opções ou Múltipla escolha, quando ele tenta salvar sem nenhuma opção, ou com duas opções de mesmo nome, então a tela avisa o problema e o campo não é criado
- **CA-B38-06** (automática) — Nome de campo não se repete. Dado a empresa já tem o campo "CNPJ", quando alguém tenta criar ou renomear outro campo para "cnpj" ou "CNPJ " (mesmo nome, com outra caixa ou espaço), então a tela avisa que já existe um campo com esse nome e nada é salvo
- **CA-B38-07** (automática) — Nome de campo não pode ser o de um dado fixo. Dado um Admin criando um campo, quando ele dá ao campo o nome de um dado fixo do contato, como "Cidade" ou "Telefone", então a tela avisa que esse nome já é de um dado do sistema e o campo não é criado
- **CA-B38-08** (automática) — Tipo não muda depois de criado. Dado o campo "Quantidade de lojas", do tipo Número, quando o Admin abre o editor do campo, então o tipo aparece só para leitura, e um pedido ao servidor para mudar o tipo é recusado
- **CA-B38-09** (automática) — Editar as opções da lista. Dado o campo "Porte", Lista de opções com "Pequeno", "Médio" e "Grande", quando o Gerente acrescenta "Rede", renomeia "Médio" para "Médio porte" e põe "Grande" em primeiro, então o campo passa a oferecer "Grande", "Pequeno", "Médio porte" e "Rede", nessa ordem, e o contato que tinha "Médio" passa a mostrar "Médio porte"
- **CA-B38-15** (automática) — Tela de campos sem nenhum campo. Dado uma empresa sem campos personalizados, quando o Admin abre a tela, então a tela explica para que servem os campos e mostra o botão "Criar campo"
- **CA-B38-16** (manual) — Aprovação visual da tela de campos. Dado a tela de campos com campos de vários tipos, quando a Marcelle a abre no computador e no celular, nos temas claro e escuro, então ela aprova a lista, o editor, as opções e os avisos no estilo Caderno, sem nada desalinhado, cortado ou ilegível
- **CA-B38-17** (automática) — Perfil mostra os campos na ordem da empresa. Dado a empresa com os campos "CNPJ", "Porte" e "Instagram da loja", e um contato com CNPJ e Porte preenchidos, quando alguém abre o perfil do contato, então o bloco "Campos personalizados" mostra os três, nessa ordem, com os dois valores e "—" no Instagram
- **CA-B38-18** (automática) — Admin e Gerente preenchem qualquer contato. Dado um Gerente no perfil de um contato que não é da carteira dele, quando ele preenche "Porte" com "Grande" e salva, então o perfil mostra "Grande", e o valor está lá ao recarregar a página
- **CA-B38-19** (automática) — Atendente preenche os campos dos contatos que atende. Dado um Atendente no perfil de um contato que ele atende, quando ele preenche "CNPJ" e salva, então o valor fica salvo, e os dados fixos (tipo, cidade, UF e os demais) continuam sem botão de editar para ele
- **CA-B38-20** (automática) — Atendente não preenche contato de outro. Dado um contato que o Atendente não atende, quando chega ao servidor um pedido de alteração de campo personalizado em nome desse Atendente, então o servidor recusa e o valor não muda
- **CA-B38-21** (automática) — Cada tipo confere o formato. Dado um Admin editando os campos de um contato, quando ele digita "abc" em Número, "12,345" em Dinheiro, "fulano@" em E-mail, "não é link" em Link ou "123" em Telefone, então a tela aponta o campo com o problema e não salva; o servidor também recusa esses valores se chegarem sem passar pela tela
- **CA-B38-22** (automática) — Valores aparecem no formato de cada tipo. Dado um contato com Dinheiro 1500,5, Data 03/04/2026, Sim/não marcado como sim, Múltipla escolha com "Jeans" e "Malha", e um Link, quando alguém abre o perfil, então aparece "R$ 1.500,50", "03/04/2026", "Sim", "Jeans, Malha" e o link clicável, que abre em outra aba
- **CA-B38-23** (automática) — Apagar o valor de um campo. Dado um contato com "Porte" igual a "Grande", quando o Admin apaga o valor e salva, então o perfil mostra "—" no Porte
- **CA-B38-24** (automática) — Empresa sem campos não mostra o bloco. Dado uma empresa sem campos personalizados, quando alguém abre o perfil de um contato, então o bloco "Campos personalizados" não aparece
- **CA-B38-25** (manual) — Aprovação visual do bloco no perfil. Dado um contato com campos de todos os tipos, alguns vazios, quando a Marcelle abre o perfil no computador e no celular, nos temas claro e escuro, e edita os campos, então ela aprova o bloco e a edição, sem nada desalinhado, cortado ou ilegível
- **CA-B38-44** (automática) — Uma empresa não vê os campos da outra. Dado a empresa A com o campo "CNPJ" e a empresa B sem campos, quando um usuário da empresa B abre a tela de campos, um perfil de contato e o filtro, ou faz um pedido ao servidor com o campo da empresa A, então ele não vê o campo nem os valores da empresa A, e o pedido é recusado

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B38-01 | "Contato que o atendente atende" é o contato que o atendente já consegue ver hoje (carteira dele ou conversa atribuída a ele). A regra de quem ele vê não muda. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-05 | Sim/não tem três estados: sim, não e vazio (nunca preenchido). No filtro, "é não" não traz o vazio. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-06 | Limite de 50 campos por empresa e de 50 opções por lista; o nome do campo e da opção tem até 40 letras. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-07 | Telefone extra aceita número brasileiro com DDD (10 ou 11 dígitos) ou internacional começando com "+"; é guardado só com os dígitos e mostrado formatado. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-08 | Link aceita endereço com ou sem "https://"; sem, o sistema completa com "https://". | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-09 | Contato que vai para a lixeira guarda os valores e os recupera ao ser restaurado. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-11 | Mudança em campo personalizado feita pelo atendente não aparece em nenhum histórico além do histórico de automações (quando dispara uma); não há registro de "quem mudou o quê" nesta série. | confirmada | Marcelle, 26/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B38-01 | Que tipos de campo a empresa pode criar? | respondida | Texto, Texto longo, Número, Dinheiro, Data, Lista de opções, Múltipla escolha, Sim/não, Link, E-mail e Telefone (os quatro primeiros pedidos mais os comuns em HubSpot, Pipedrive e Kommo). Marcelle, 26/10/2026. |
| PER-B38-02 | Quem cria, edita e apaga os campos? | respondida | Admin e Gerente. Marcelle, 26/10/2026. |
| PER-B38-04 | Campo pode ser obrigatório? | respondida | Não, todos são opcionais. Marcelle, 26/10/2026. |
| PER-B38-06 | O tipo pode mudar depois de criado? | respondida | Não. Marcelle, 26/10/2026. |
| PER-B38-08 | O atendente pode preencher os campos? | respondida | Sim, nos contatos que ele atende; os dados fixos continuam só com Admin e Gerente. Marcelle, 26/10/2026. |
