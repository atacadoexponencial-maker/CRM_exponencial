# B38-03: Campos personalizados no filtro de Contatos e no público das Campanhas

**Tipo:** Implementação
**Página:** Contatos → filtro avançado; Campanhas → público
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-campos-personalizados.md`

## Descrição

O filtro avançado ganha o assunto "Campos personalizados", com as comparações de cada tipo; como a campanha usa o mesmo filtro, o público dela também passa a filtrar pelos campos.

## Pronto quando

Em Contatos, "Porte é qualquer um de Grande" traz os contatos certos, combina com outros campos em grupos E/OU e pode ser salvo; a mesma condição escolhe o público de uma campanha.

## Critérios de aceite

- **CA-B38-31** (automática) — Filtrar por campo de lista. Dado 5 contatos com "Porte" igual a "Grande", 3 com "Pequeno" e 4 sem valor, quando o Admin filtra Contatos por "Porte é qualquer um de Grande", então aparecem os 5 contatos e a contagem mostra 5; com "Porte está vazio", aparecem os 4
- **CA-B38-32** (automática) — Cada tipo filtra com as suas comparações. Dado contatos com valores em campos de cada tipo, quando o filtro usa cada comparação da tabela acima, então cada uma traz exatamente os contatos esperados, e "não é", "não contém" e "não tem nenhum de" não trazem quem está com o campo vazio
- **CA-B38-33** (automática) — Campo personalizado combina com os outros. Dado contatos com Porte "Grande" em SP e em MG, quando o filtro é "Porte é qualquer um de Grande" E "UF é qualquer um de SP", então aparecem só os de SP com Porte Grande
- **CA-B38-34** (automática) — Filtro salvo com campo personalizado. Dado o Gerente salva o filtro "Lojas grandes" com "Porte é qualquer um de Grande", quando qualquer pessoa da empresa abre esse filtro salvo, então ele traz os mesmos contatos, e renomear o campo ou a opção não muda o resultado
- **CA-B38-35** (automática) — Público de campanha por campo personalizado. Dado uma campanha nova, quando o Admin escolhe o público "Porte é qualquer um de Grande", então a contagem do público e a lista de quem recebe trazem os mesmos contatos que o filtro de Contatos traz
- **CA-B38-36** (automática) — Filtro do atendente continua só na carteira dele. Dado um Atendente que só vê os contatos que atende, quando ele filtra por um campo personalizado, então o resultado traz só contatos que ele já podia ver
- **CA-B38-44** (automática) — Uma empresa não vê os campos da outra. Dado a empresa A com o campo "CNPJ" e a empresa B sem campos, quando um usuário da empresa B abre a tela de campos, um perfil de contato e o filtro, ou faz um pedido ao servidor com o campo da empresa A, então ele não vê o campo nem os valores da empresa A, e o pedido é recusado

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B38-05 | Sim/não tem três estados: sim, não e vazio (nunca preenchido). No filtro, "é não" não traz o vazio. | confirmada | Marcelle, 26/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B38-03 | Além do perfil e do filtro, onde os campos aparecem? | respondida | Painel do contato no Chat, cadastro de novo contato, automações e variáveis na mensagem. Marcelle, 26/10/2026. |
