# B63-01: Cada cargo vê o que a empresa escolheu

**Tipo:** Implementação
**Página:** Chat, Contatos e Pipeline (e o que segue o dono do contato)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-permissoes-por-cargo.md`

## Descrição

A visibilidade de conversas, contatos e cards deixa de ser fixa e passa a seguir a
escolha guardada para cada cargo da empresa (Atendente e Gerente): "Só os atribuídos a
ele", "Os dele e os sem dono" ou "Todos da empresa". O Admin vê tudo. Toda empresa,
nova ou existente, fica com Atendente em "Só os atribuídos a ele" e Gerente em "Todos
da empresa". Ver dá direito a atender, mas não a atribuir.

## Pronto quando

Uma atendente com o padrão novo abre o Chat, Contatos e o Pipeline e vê só o que é
dela; nada dos outros nem dos sem dono aparece por endereço, busca, filtro, contagem ou
lixeira. Mudando a escolha guardada no banco, o que ela vê muda junto.

## Critérios de aceite

- **CA-B63-07** (automática) — Em "Só os atribuídos a ele", o atendente não vê o que é sem dono nem dos outros. Dado o Atendente em "Só os atribuídos a ele", uma atendente Ana dona da conversa X, um colega dono da Y e a Z sem dono (as três conferidas como existentes com a chave de serviço), quando a Ana abre o Chat, Contatos e o Pipeline, então ela vê a conversa, o contato e o card de X, e não vê nada de Y nem de Z.
- **CA-B63-08** (automática) — Em "Os dele e os sem dono", o atendente vê também a fila aberta. Dado o Atendente em "Os dele e os sem dono" e as mesmas X, Y e Z, quando a Ana abre o Chat, Contatos e o Pipeline, então ela vê X e Z, e não vê Y.
- **CA-B63-09** (automática) — Em "Todos da empresa", o atendente vê tudo mas não atribui. Dado o Atendente em "Todos da empresa" e as mesmas X, Y e Z, quando a Ana abre o Chat e tenta atribuir a Y a si mesma, então ela vê X, Y e Z, e a atribuição é recusada.
- **CA-B63-10** (automática) — O Gerente segue a opção do cargo dele. Dado o Gerente em "Só os atribuídos a ele" e as mesmas X, Y e Z, com nenhuma delas do gerente, quando o Gerente abre o Chat, Contatos e o Pipeline, então ele não vê X, Y nem Z.
- **CA-B63-11** (automática) — O Admin vê tudo, qualquer que seja a escolha. Dado Atendente e Gerente em "Só os atribuídos a ele", quando o Admin abre o Chat, Contatos e o Pipeline, então ele vê X, Y e Z.
- **CA-B63-12** (automática) — O que não se vê também não vaza pelos lados. Dado o Atendente em "Só os atribuídos a ele" e a conversa Z sem dono, com etiqueta, compra e nota gravadas (conferidas com a chave de serviço), quando a Ana tenta abrir a Z pelo endereço direto, buscar o contato pelo nome, filtrar Contatos pela etiqueta e ler as compras, as notas e a lixeira, então nada da Z aparece, e as contagens da tela e do Dashboard dela não incluem a Z.
- **CA-B63-13** (automática) — Atribuir a conversa tira da tela de quem perdeu. Dado o Atendente em "Só os atribuídos a ele" e a Ana dona da conversa X, quando o Admin atribui a X ao colega, então a Ana, ao recarregar o Chat, não vê mais a X, nem o contato e o card dela.
- **CA-B63-19** (manual) — Na D'Rô, a Vivianne deixa de ver o que não é dela. Dado a D'Rô em produção, depois do merge, com o Atendente em "Só os atribuídos a ele", quando a Vivianne abre o Chat, então ela vê só as conversas atribuídas a ela, e a Nathália segue vendo todas.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B63-01 | A permissão é por cargo, não por pessoa. | confirmada | Luan, 19/11/2026 |
| SUP-B63-02 | Uma escolha só vale para conversas, contatos e cards. | confirmada | Luan, 19/11/2026 |
| SUP-B63-04 | O Admin sempre vê tudo da empresa; a tela não deixa restringir o Admin. | confirmada | Luan, 19/11/2026 |
| SUP-B63-05 | As empresas que já existem passam, no dia do merge, para o padrão novo: Atendente em "Só os atribuídos a ele" e Gerente em "Todos da empresa". Na D'Rô, a Vivianne deixa de ver as 4 conversas sem dono. | confirmada | Luan, 19/11/2026 |
| SUP-B63-06 | Ver dá direito a atender (responder, mover o card), mas não a atribuir: o Atendente em "Todos da empresa" responde a conversa de um colega sem virar dono dela. | confirmada | Luan, 19/11/2026 |
| SUP-B63-07 | A troca da fila aberta como padrão substitui a decisão da Marcelle de 27/10/2026 (PER-B45-04); a fila aberta fica como opção na tela. | confirmada | Luan, 19/11/2026 |

## Perguntas em aberto

Nenhuma.
