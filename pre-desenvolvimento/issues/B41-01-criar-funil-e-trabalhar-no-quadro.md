# B41-01: Criar funil e trabalhar nele no quadro

**Tipo:** Implementação
**Página:** Configurações → Funis e Pipeline (abas dos funis novos)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-funis-personalizados.md`

## Descrição

Admin e Gerente criam funis com etapas (nome e cor) na tela nova de funis, e cada funil ganha uma aba no Pipeline com colunas, cards, adicionar contato, arrastar, painel do card, busca e filtro de atendente. Entrada e Recompra aparecem como fixos.

## Pronto quando

Dá para criar um funil com etapas coloridas, abrir a aba dele no Pipeline, adicionar contatos e mover os cards entre as etapas.

## Critérios de aceite

- **CA-B41-01** (automática) — Admin cria um funil com etapas. Dado um Admin na tela de funis, quando ele cria o funil "Feira de Março" com as etapas "Convidado", "Confirmou" e "Visitou o estande", nessa ordem, então o funil aparece na lista com 3 etapas e 0 cards, e o Pipeline ganha a aba "Feira de Março" com essas três colunas, nessa ordem
- **CA-B41-02** (automática) — Gerente também cria e edita funis. Dado um Gerente, quando ele cria um funil, renomeia o funil e acrescenta uma etapa, então as três mudanças ficam gravadas, como acontece para o Admin
- **CA-B41-03** (automática) — Atendente não gerencia funis. Dado um Atendente, quando ele tenta abrir a tela de funis, ou criar, renomear ou apagar um funil ou uma etapa por qualquer caminho (inclusive direto no servidor), então ele não vê a tela nem o botão "Gerenciar funis", e o servidor recusa toda tentativa sem mudar nada
- **CA-B41-04** (automática) — O nome do funil é obrigatório e não repete. Dado a tela de funis, quando alguém tenta salvar um funil sem nome, ou com o nome de outro funil da empresa, ou com o nome "Entrada" ou "Recompra" (com qualquer variação de maiúscula e minúscula, ou espaço sobrando), então a tela avisa o motivo e nada é criado
- **CA-B41-05** (automática) — O funil precisa de ao menos uma etapa, com nome. Dado o editor do funil, quando alguém tenta salvar um funil sem etapas, ou com uma etapa sem nome, ou com duas etapas de mesmo nome no mesmo funil, então a tela avisa o motivo e nada é gravado. Também não dá para apagar a última etapa de um funil.
- **CA-B41-08** (automática) — Cor da etapa aparece na coluna. Dado uma etapa de funil novo, quando o Admin escolhe para ela uma das cores prontas (a paleta de colunas que já existe), ou uma cor própria em "outra cor", então a coluna dessa etapa no quadro aparece com essa cor. Uma cor que não é válida (texto que não é cor) é recusada.
- **CA-B41-42** (automática) — O texto da coluna continua legível com qualquer cor. Dado etapas com cores próprias muito claras (como amarelo-claro) e muito escuras (como azul-marinho), quando o quadro aparece no tema claro e no tema escuro, então o nome da etapa e a contagem de cards ficam com contraste de pelo menos 4,5:1 sobre a cor da coluna, nos dois temas (o sistema escolhe texto claro ou escuro sozinho)
- **CA-B41-13** (automática) — Entrada e Recompra não mudam. Dado a tela de funis, quando alguém olha Entrada e Recompra, ou tenta renomear, apagar ou mudar as etapas deles por qualquer caminho, então eles aparecem como "fixo", sem os botões de editar, e o servidor recusa toda tentativa. As etapas e as regras desses dois funis continuam iguais às de hoje.
- **CA-B41-14** (automática) — Cada empresa só vê os próprios funis. Dado a empresa A com o funil "Feira de Março", quando alguém da empresa B abre a tela de funis, o Pipeline, o filtro de contatos ou as automações, ou consulta direto o banco, então o funil da empresa A não aparece, e nenhuma tentativa de ler, mudar ou usar esse funil funciona
- **CA-B41-15** (automática) — Adicionar contato cria o card na primeira etapa. Dado um Gerente no quadro "Feira de Março" e um contato que não está nesse funil, quando ele adiciona o contato, então o card aparece na primeira etapa do funil, sem atendente, com "Card criado no funil Feira de Março" no histórico. Os cards que o contato tem em Entrada ou Recompra não mudam.
- **CA-B41-16** (automática) — O contato não entra duas vezes no mesmo funil. Dado um contato que já tem card em "Feira de Março", quando alguém tenta adicioná-lo de novo, pela tela ou direto no servidor, então a tela avisa que ele já está nesse funil e nenhum card novo é criado. Adicioná-lo a outro funil da empresa continua possível.
- **CA-B41-17** (automática) — Atendente não adiciona contato ao funil. Dado um Atendente no quadro de um funil novo, quando ele olha o cabeçalho, ou tenta criar o card direto no servidor, então o botão "Adicionar contato" não aparece, e o servidor recusa
- **CA-B41-18** (automática) — Arrastar e mover o card só entre etapas do mesmo funil. Dado um card em "Convidado" no funil "Feira de Março", quando alguém arrasta o card para "Confirmou", ou escolhe a etapa em "mover para etapa" no painel, então o card fica em "Confirmou", com a mudança no histórico. O painel só oferece as etapas desse funil, e o servidor recusa mover o card para uma etapa de outro funil.
- **CA-B41-19** (automática) — Atendente vê só os próprios cards no funil novo. Dado um funil novo com cards de dois atendentes e cards sem atendente, quando um dos atendentes abre o quadro, então ele vê só os cards em que é o atendente, como acontece em Entrada e Recompra. O Admin e o Gerente veem todos.
- **CA-B41-20** (automática) — Atribuir e excluir card no funil novo. Dado um card de funil novo, quando o Gerente atribui o card a um atendente e depois exclui o card, então o atendente passa a ver o card enquanto ele existe. Excluído, o card some só desse funil, e o contato e os outros cards dele continuam.
- **CA-B41-21** (automática) — Busca e filtro de atendente no funil novo. Dado um funil novo com cards de vários contatos e atendentes, quando o Admin busca por parte do nome ou do telefone, ou escolhe um atendente, então o quadro mostra só os cards que batem com a busca ou com o atendente escolhido
- **CA-B41-23** (automática) — Funil sem nenhum card. Dado um funil recém-criado, quando alguém abre a aba dele, então as colunas aparecem vazias, com o mesmo aviso de coluna vazia de Entrada, e o Admin ou o Gerente vê o botão "Adicionar contato"
- **CA-B41-24** (manual) — O quadro do funil novo fica bem arrumado. Dado o preview publicado, com um funil de 3 etapas e outro de 8 etapas, cada um com cards, quando a Marcelle abre as abas no computador e no celular, então as abas cabem no cabeçalho (ou rolam, sem quebrar o layout), as colunas e os cards seguem o tema Caderno com as cores escolhidas, e nada fica desalinhado

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B41-01 | A tela de funis fica em Configurações → Funis, com atalho "Gerenciar funis" no cabeçalho do Pipeline, e o Gerente tem acesso a ela, mesmo que outras telas de Configurações sejam só do Admin | confirmada | Marcelle, 23/10/2026 |
| SUP-B41-02 | Cada empresa tem no máximo 20 funis próprios, cada funil tem no máximo 20 etapas, e os nomes de funil e de etapa vão até 40 caracteres | confirmada | Marcelle, 23/10/2026 |
| SUP-B41-03 | As abas dos funis novos aparecem depois de Entrada e Recompra, por ordem de criação (sem ordenar as abas à mão) | confirmada | Marcelle, 23/10/2026 |
| SUP-B41-05 | Ao ser criado, o card de funil novo fica sem atendente; quem cria pode atribuir depois pelo painel | confirmada | Marcelle, 23/10/2026 |
| SUP-B41-07 | A cor da etapa vem da mesma paleta de cores de coluna que Entrada e Recompra já usam, sem cor livre | invalidada | Marcelle, 23/10/2026: paleta pronta mais "outra cor" livre, com o texto da coluna ajustado sozinho para ficar legível nos dois temas (CA-B41-08 e CA-B41-42) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B41-01 | Quem pode criar funis? | respondida | Marcelle, 23/10/2026: Admin e Gerente |
| PER-B41-02 | As etapas dos funis novos são próprias e editáveis? | respondida | Marcelle, 23/10/2026: próprias e editáveis |
| PER-B41-03 | Entrada e Recompra continuam fixos? | respondida | Marcelle, 23/10/2026: sim, ficam fixos |
| PER-B41-04 | O contato pode estar em vários funis? | respondida | Marcelle, 23/10/2026: um card por funil, como hoje; vários funis, uma vez em cada |
| PER-B41-05 | Os painéis incluem os funis novos, e como? | respondida | Marcelle, 23/10/2026: aprovou o desenho (seletor no gráfico do Dashboard, abas no Pipeline, filtro, automações e alertas; relatórios de compras sem mudança) |
| PER-B41-06 | Como o contato entra num funil novo? | respondida | Marcelle, 23/10/2026: botão "Adicionar contato" no quadro (Admin e Gerente) e ação "Mover card" das automações |
