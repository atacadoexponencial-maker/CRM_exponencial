# B37-01: Filtro avançado de contatos pelos dados do cadastro

**Tipo:** Implementação
**Página:** Contatos (`/contatos`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-filtro-de-contatos.md`

## Descrição

Criar o botão "Filtrar" na lista de contatos, com o painel de grupos e condições combinados por E/OU sobre os campos do cadastro, aplicado no servidor sobre a base inteira, com contagem e carregamento por páginas do resultado.

## Pronto quando

Na lista de contatos, qualquer papel abre "Filtrar", monta grupos de condições sobre os campos do cadastro (nome, telefone, classificação, tipo, nicho, cidade, UF, perfil de cliente, atendente, observações, data de cadastro), vê "N contatos encontrados" contando a base inteira e rola para carregar mais do resultado. O atendente só filtra os próprios contatos e a lixeira fica de fora.

## Critérios de aceite

- **CA-B37-01** (automática) — O botão "Filtrar" abre o painel do filtro. Dado a lista de contatos aberta, sem filtro, quando a pessoa clica em "Filtrar", então o painel abre com um grupo vazio e a opção de acrescentar condição.
- **CA-B37-04** (automática) — Campo novo do contato entra no filtro sozinho. Dado que o contato ganhou um campo novo no sistema, quando os testes rodam, então um teste falha se esse campo não estiver na lista de campos do filtro ou não estiver explicitamente marcado como "fora do filtro" (ex.: dados internos como a foto).
- **CA-B37-05** (automática) — Condições do mesmo grupo com E. Dado contatos de Fortaleza lojistas, de Fortaleza revendedores e de Recife lojistas, quando o grupo tem "Cidade é igual a Fortaleza" E "Tipo é Lojista", então só aparecem os de Fortaleza lojistas.
- **CA-B37-06** (automática) — Condições do mesmo grupo com OU. Dado os mesmos contatos, quando o grupo tem "Cidade é igual a Fortaleza" OU "Cidade é igual a Recife", então aparecem os três contatos.
- **CA-B37-07** (automática) — Grupos combinados entre si. Dado os mesmos contatos, quando o filtro é (Cidade = Fortaleza OU Cidade = Recife) E (Tipo é Lojista), então aparecem os de Fortaleza lojistas e os de Recife lojistas, e não aparecem os revendedores.
- **CA-B37-08** (automática) — O filtro acha contatos que ainda não estavam na tela. Dado uma empresa com mais de 50 contatos, e um contato que satisfaz o filtro está além dos 50 primeiros da lista, quando a pessoa aplica o filtro, então esse contato aparece no resultado e a contagem conta ele.
- **CA-B37-09** (automática) — A contagem mostra o total do resultado. Dado um filtro que satisfaz 120 contatos, quando o filtro é aplicado, então a tela mostra "120 contatos encontrados", mesmo exibindo só os 50 primeiros.
- **CA-B37-10** (automática) — Rolar a lista carrega mais resultados do filtro. Dado um filtro com 120 contatos no resultado, quando a pessoa chega ao fim da lista, então carregam os próximos contatos do resultado, nunca contatos fora do filtro.
- **CA-B37-11** (automática) — Remover uma condição atualiza o resultado. Dado um filtro com duas condições, quando a pessoa remove uma delas, então o resultado passa a obedecer só à que ficou.
- **CA-B37-12** (automática) — Limpar o filtro volta à lista completa. Dado um filtro aplicado, quando a pessoa clica em "Limpar filtro", então a lista volta a mostrar todos os contatos que ela enxerga e o botão volta a "Filtrar" sem número.
- **CA-B37-13** (automática) — Condição incompleta não filtra. Dado uma condição com campo escolhido e valor em branco (numa comparação que pede valor), quando o filtro é aplicado, então essa condição fica marcada como incompleta e não muda o resultado.
- **CA-B37-14** (automática) — Busca por nome e filtro valem juntos. Dado um filtro "Tipo é Lojista" aplicado, quando a pessoa digita "Maria" na busca, então aparecem só os lojistas com "Maria" no nome ou telefone.
- **CA-B37-15** (automática) — A ordenação vale sobre o resultado filtrado. Dado um filtro aplicado, quando a pessoa escolhe outra ordenação, então o resultado continua o mesmo conjunto, na ordem escolhida.
- **CA-B37-16** (automática) — Atendente filtra só dentro dos próprios contatos. Dado um atendente e um contato de outro atendente que satisfaz o filtro, quando o atendente aplica o filtro, então esse contato não aparece e não entra na contagem (a regra é conferida no servidor).
- **CA-B37-17** (automática) — Contato na lixeira nunca aparece no filtro. Dado um contato na lixeira que satisfaz o filtro, quando o filtro é aplicado, então ele não aparece e não entra na contagem.
- **CA-B37-21** (automática) — Filtrar por data de cadastro. Dado contatos cadastrados há 5 e há 40 dias, quando o filtro é "Data de cadastro nos últimos 30 dias", então só aparece o cadastrado há 5 dias.
- **CA-B37-36** (automática) — "Está vazio" só em campo que não é obrigatório. Dado o painel aberto, quando a pessoa escolhe Cidade, depois Telefone, então Cidade oferece "está vazio" e "não está vazio"; Telefone não oferece.
- **CA-B37-37** (automática) — Comparação negativa não traz quem tem o campo vazio. Dado contatos de Fortaleza, de Recife e sem cidade, quando o filtro é "Cidade não é Fortaleza", depois "Cidade está vazio", então o primeiro traz só o de Recife; o segundo traz só o sem cidade.
- **CA-B37-22** (manual) — Painel do filtro no celular. Dado a lista de contatos aberta no celular, quando a pessoa abre "Filtrar" e monta dois grupos com condições, então o painel ocupa a tela, dá para montar e aplicar sem rolar para o lado, e o visual segue o estilo Caderno.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B37-01 | As comparações negativas ("não é", "não contém", "não tem", "não está na etapa") trazem também os contatos com o campo vazio. Ex.: "Cidade não é Fortaleza" traz quem não tem cidade. | invalidada | Não trazem. Todo campo que não é obrigatório ganha "está vazio" e "não está vazio" (CA-B37-36, CA-B37-37). Marcelle, 22/10/2026. |
| SUP-B37-03 | Filtro montado e não salvo some ao sair da tela de Contatos. | confirmada | Marcelle, 22/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B37-01 | "Campos que vierem a existir" são os que o sistema ganhar ou os que a empresa criar? | respondida | Ambos. Os do sistema entram nesta série; os criados pela empresa viram a série B38. Marcelle, 22/10/2026. |
| PER-B37-03 | Como as condições se combinam? | respondida | Grupos que se combinam, com E ou OU dentro e entre os grupos. Marcelle, 22/10/2026. |
| PER-B37-05 | Quem pode montar filtros? | respondida | Todos os papéis; o atendente só dentro dos próprios contatos. Marcelle, 22/10/2026. |
