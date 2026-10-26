# B38-05: Variáveis dos campos e texto reserva obrigatório em todas as variáveis

**Tipo:** Implementação
**Página:** Automações → Enviar mensagem; Campanhas → texto; Configurações → Campos personalizados
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-campos-personalizados.md`

## Descrição

Cada campo ganha a sua variável nas mensagens das automações e das campanhas, que acompanha o nome do campo; toda variável, nova ou antiga, passa a exigir texto reserva, e os textos antigos sem reserva ficam marcados "precisa de ajuste".

## Pronto quando

"Seu limite é {{limite_de_credito|a combinar}}" sai com o valor do contato ou com "a combinar"; texto sem reserva não salva; renomear o campo troca a variável nos textos; a automação antiga com {{nome_contato}} aparece como "precisa de ajuste" até ganhar o reserva.

## Critérios de aceite

- **CA-B38-14** (automática) — Variável do campo. Dado o Admin cria o campo "Limite de crédito", quando ele abre o editor do campo, então a tela mostra a variável `{{limite_de_credito}}`
- **CA-B38-41** (automática) — Botão de variável do campo. Dado o editor de automação, na ação "Enviar mensagem", numa empresa com o campo "Limite de crédito", quando o Admin clica no botão "Limite de crédito" com o cursor no meio do texto, então a tela pede o texto reserva antes de inserir a variável; o mesmo vale no texto da campanha
- **CA-B38-42** (automática) — Mensagem sai com o valor do campo. Dado o texto "Seu limite é {{limite_de_credito|a combinar}}" e um contato com Limite de crédito 1500, quando a automação ou a campanha envia a mensagem para ele, então a mensagem sai como "Seu limite é R$ 1.500,00", com o valor no formato do tipo
- **CA-B38-43** (automática) — Campo vazio usa o texto reserva. Dado o texto "Seu limite é {{limite_de_credito|a combinar}}" e um contato sem Limite de crédito, quando a automação ou a campanha envia a mensagem para ele, então a mensagem sai como "Seu limite é a combinar"
- **CA-B38-46** (automática) — Renomear o campo troca a variável nos textos. Dado o campo "Limite de crédito", com `{{limite_de_credito|a combinar}}` no texto de uma automação e de uma campanha agendada, quando o Admin renomeia o campo para "Limite", então o editor do campo mostra `{{limite}}`, os dois textos passam a ter `{{limite|a combinar}}` no lugar da variável antiga, com o mesmo texto reserva, e a mensagem enviada depois sai com o valor do campo; campanha já enviada não muda
- **CA-B38-48** (automática) — Variável sem texto reserva não é aceita. Dado o editor do texto de uma automação ou de uma campanha, quando o Admin tenta inserir uma variável sem texto reserva, ou escreve à mão "Seu limite é {{limite_de_credito}}" ou "Olá {{nome_contato}}" e tenta salvar, então a tela não insere a variável sem reserva e não salva o texto, apontando cada variável que está sem reserva; o servidor também recusa esse texto se ele chegar sem passar pela tela
- **CA-B38-49** (automática) — Inserir variável com texto reserva. Dado o editor do texto de uma automação ou de uma campanha, quando o Admin clica no botão "Limite de crédito" e escreve "a combinar" como texto reserva, então o texto ganha `{{limite_de_credito|a combinar}}` no ponto do cursor
- **CA-B38-60** (automática) — Texto reserva nas variáveis que já existem. Dado o texto "Olá {{nome_contato|cliente}}, aqui é {{nome_vendedor|a equipe}}", um contato sem nome e um contato sem atendente, quando a automação ou a campanha envia a mensagem para os dois, então o contato sem nome recebe "Olá cliente, aqui é …" (na automação, o reserva vai no lugar do telefone que sai hoje) e o contato sem atendente recebe "… aqui é a equipe"; com nome e atendente preenchidos, a mensagem sai com o nome e o vendedor, como hoje; o mesmo vale para `{{primeiro_nome}}` nas automações
- **CA-B38-61** (automática) — Textos antigos sem reserva ficam marcados. Dado uma automação ou uma campanha não enviada salva antes desta mudança, com `{{nome_contato}}` sem reserva, quando o Admin abre a lista de automações, a lista de campanhas ou o editor desse texto, então a automação ou a campanha aparece marcada "precisa de ajuste", o editor aponta a variável sem reserva, e ela só volta a enviar depois que o texto ganha o reserva e é salvo

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B38-03 | A variável nasce do nome no dia em que o campo é criado (minúsculo, sem acento, espaço vira "_") e não muda ao renomear. | invalidada | A variável acompanha o nome, para não confundir; ao renomear, o sistema troca a variável nos textos das automações e das campanhas não enviadas (CA-B38-46). Marcelle, 26/10/2026. |
| SUP-B38-04 | Campo vazio na mensagem sai como texto vazio, sem impedir o envio. | invalidada | A variável pode ter um texto reserva, usado quando o campo está vazio; o reserva é obrigatório (CA-B38-43, CA-B38-48). Marcelle, 26/10/2026. |
| SUP-B38-12 | A variável nova, depois de renomear, não pode colidir com outra: se o nome novo gerar a variável de outro campo ou de uma variável fixa, a tela recusa o nome. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-16 | O texto reserva vale só para as variáveis dos campos personalizados. | invalidada | Vale para todas as variáveis, inclusive `{{nome_contato}}`, `{{primeiro_nome}}` e `{{nome_vendedor}}` (CA-B38-60). Marcelle, 26/10/2026. |
| SUP-B38-17 | Nas variáveis que já existem, sem texto reserva tudo fica como hoje: na automação, contato sem nome recebe o telefone no lugar de `{{nome_contato}}` e `{{primeiro_nome}}`; na campanha, sai em branco. A campanha continua sem `{{primeiro_nome}}`. | invalidada | Todas as variáveis, novas ou antigas, têm texto reserva obrigatório; nenhuma sai sem reserva (CA-B38-48, CA-B38-60). A campanha continua sem `{{primeiro_nome}}`. Marcelle, 26/10/2026. |
| SUP-B38-18 | Automação ou campanha não enviada salva antes desta mudança, com variável sem reserva, fica marcada "precisa de ajuste" e não envia até o texto ganhar o reserva (CA-B38-61). | confirmada | Marcelle, 26/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B38-03 | Além do perfil e do filtro, onde os campos aparecem? | respondida | Painel do contato no Chat, cadastro de novo contato, automações e variáveis na mensagem. Marcelle, 26/10/2026. |
