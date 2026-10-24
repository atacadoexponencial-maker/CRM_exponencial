# B42-02: Campanha escolhe quem recebe pelo filtro de Contatos

**Tipo:** Implementação
**Página:** Campanhas → editor, etapa Destinatários
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-segmentacao-de-campanhas.md`

**Depende de:** B42-01 (campos novos do filtro)

## Descrição

A etapa Destinatários troca os chips e campos próprios pelo filtro avançado de Contatos (com resumo legível, contagem e amostra), a contagem e a confirmação usam a mesma regra do filtro, e as campanhas antigas convertem sozinhas para o filtro novo.

## Pronto quando

Dá para montar uma campanha para "Etapa no funil Feira de Março está na etapa Proposta E Tipo é Lojista", ver a contagem certa, salvar o rascunho, reabrir, confirmar e enviar; rascunhos, agendadas, relatórios e reenvios antigos continuam funcionando.

## Critérios de aceite

- **CA-B42-01** (automática) — A etapa Destinatários usa o filtro de Contatos. Dado uma campanha nova aberta na etapa Destinatários, quando a pessoa clica em "Filtrar", então abre o mesmo painel da lista de Contatos, com os mesmos campos agrupados por assunto e as mesmas comparações por tipo de campo; os chips antigos de classificação, tipo e etiqueta e os campos cidade e atendente não aparecem mais
- **CA-B42-02** (automática) — Campanha pela etapa de Entrada, de Recompra e de funil novo. Dado uma empresa com contatos nas etapas "Proposta" de Entrada, "Reposição" de Recompra e "Visitou o estande" do funil novo "Feira de Março", e contatos em outras etapas, quando o filtro é, um de cada vez, "Etapa no funil de Entrada está na etapa Proposta", "Etapa no funil de Recompra está na etapa Reposição" e "Etapa no funil Feira de Março está na etapa Visitou o estande", então a contagem e a amostra trazem exatamente os contatos de cada etapa, e mais ninguém
- **CA-B42-03** (automática) — Grupos com E e OU funcionam na campanha. Dado contatos de Fortaleza lojistas, de Fortaleza revendedores e de Recife lojistas, quando o filtro da campanha é (Cidade é igual a Fortaleza OU Cidade é igual a Recife) E (Tipo é Lojista), então a campanha conta os de Fortaleza lojistas e os de Recife lojistas, e não conta os revendedores
- **CA-B42-04** (automática) — Campanha e Contatos trazem os mesmos contatos para o mesmo filtro. Dado um filtro com condições de cadastro, etiqueta, compras e funil, quando o mesmo filtro é aplicado na lista de Contatos e na campanha, pelo Admin, então os contatos da campanha são os da lista de Contatos, menos só os que a campanha já tira hoje: telefone que não é um WhatsApp válido do Brasil
- **CA-B42-05** (automática) — Quem está na lixeira não entra na campanha. Dado um contato que bate com o filtro e foi para a lixeira, quando a campanha conta os destinatários e quando ela é confirmada, então esse contato não é contado nem entra na lista de envio
- **CA-B42-06** (automática) — A contagem acompanha o filtro enquanto ele é montado. Dado a etapa Destinatários com um filtro que conta 40 contatos, quando a pessoa acrescenta uma condição que deixa 12 deles, e depois a remove, então a contagem mostra 12 e depois volta a 40, e a amostra muda junto
- **CA-B42-07** (automática) — Sem filtro, a campanha vai para todos os contatos válidos. Dado uma empresa com 30 contatos válidos fora da lixeira, quando a pessoa limpa o filtro, então a contagem mostra 30 destinatários
- **CA-B42-08** (automática) — Resumo do filtro legível sem abrir o painel. Dado um filtro com dois grupos ligados por E, um deles com duas condições ligadas por OU, quando o painel está fechado, então a etapa Destinatários mostra o resumo do filtro, com cada condição escrita com os nomes que a pessoa escolheu (nome do funil, da etapa, da etiqueta, do atendente) e os E/OU no lugar certo
- **CA-B42-09** (automática) — Não avança sem destinatário. Dado um filtro que não traz nenhum contato, quando a pessoa clica em "Próximo", então a tela avisa que a campanha precisa de pelo menos um destinatário e continua na etapa 1, como hoje
- **CA-B42-10** (automática) — O rascunho guarda o filtro. Dado uma campanha com um filtro de dois grupos salva como rascunho, quando a pessoa sai e abre a campanha de novo, então o painel mostra os mesmos grupos, condições e E/OU, e a contagem é a mesma
- **CA-B42-11** (automática) — A lista é fechada na confirmação. Dado uma campanha agendada, confirmada com 20 destinatários pelo filtro "Etapa no funil de Entrada está na etapa Proposta" Quando, antes do horário do envio, um desses contatos muda de etapa e um contato novo entra em Proposta, então a campanha envia para os mesmos 20 da confirmação, e o relatório mostra esses 20
- **CA-B42-13** (automática) — Reenvio continua sem filtro. Dado uma campanha enviada com 3 falhas, quando a pessoa cria o reenvio e abre a etapa Destinatários, então aparece o aviso de que os destinatários são os que falharam, sem botão "Filtrar", e a contagem é 3 (menos quem foi para a lixeira), como hoje
- **CA-B42-14** (automática) — Só Admin e Gerente montam o filtro de campanha. Dado um Atendente logado, quando ele tenta contar destinatários ou salvar uma campanha com filtro, chamando o servidor direto, então o servidor recusa, como recusa hoje para campanhas
- **CA-B42-15** (automática) — O filtro da campanha só enxerga a própria empresa. Dado duas empresas com contatos que batem com o mesmo filtro, quando o Admin da primeira conta os destinatários, então só entram contatos da primeira empresa, inclusive nas condições de etiqueta, compras, funil e perfil RFV
- **CA-B42-27** (automática) — Rascunho antigo abre com o filtro equivalente. Dado um rascunho antigo com Tipo Lojista e Revendedor, etiqueta "VIP", cidade "Forta" e atendente Ana, quando a pessoa abre o rascunho, então o painel mostra um grupo com "Tipo é qualquer um de Lojista, Revendedor" E "Etiqueta tem qualquer uma de VIP" E "Cidade contém Forta" E "Atendente (carteira) é Ana"
- **CA-B42-28** (automática) — A conversão dá o mesmo resultado de antes. Dado campanhas antigas com cada um dos filtros antigos, sozinhos e combinados, e contatos que batem e que não batem com cada um, quando os destinatários são contados pela regra antiga e pelo filtro convertido, então as duas contagens trazem exatamente os mesmos contatos, com uma diferença só: a cidade passa a ignorar acento, então "Cidade contém Sao Paulo" acha também quem tem "São Paulo" (a regra antiga não achava)
- **CA-B42-29** (automática) — Agendada antiga é enviada sem refazer o filtro. Dado uma campanha agendada antes desta mudança, já com a lista fechada, quando chega o horário do envio, então ela é enviada para a lista que foi fechada na confirmação, como hoje
- **CA-B42-30** (automática) — Relatório e reenvio de campanha antiga continuam funcionando. Dado uma campanha enviada antes desta mudança, com falhas, quando a pessoa abre o relatório e cria o reenvio, então o relatório mostra os mesmos destinatários de antes e o reenvio traz os que falharam

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B42-02 | "Cidade contém" do filtro novo compara a cidade do mesmo jeito que a campanha de hoje. | invalidada | Lido no código em 23/10/2026: o filtro novo ignora maiúscula e acento, e o da campanha só ignorava maiúscula. A Marcelle aceitou que a conversão passe a achar também a cidade com acento (23/10/2026); CA-B42-28 ajustado |
| SUP-B42-03 | Em campanha, o filtro funciona com a visão do Admin e do Gerente (todos os contatos da empresa); não há caso de Atendente montando campanha. | confirmada | Lido no código em 23/10/2026: toda action de campanha passa por `perfilGestor` (só Admin e Gerente) |
| SUP-B42-05 | Campanha já enviada, cancelada ou em envio não precisa mostrar o filtro no painel; basta o relatório e o reenvio continuarem iguais. | confirmada | Marcelle, 23/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B42-01 | A campanha escolhe quem recebe pelo mesmo filtro avançado de Contatos ou só ganha o filtro de etapa do funil? | respondida | Mesmo filtro de Contatos, no lugar dos filtros de hoje (Marcelle, 23/10/2026) |
| PER-B42-06 | Campanha agendada fecha a lista de quem recebe quando? | respondida | Na confirmação, como hoje (Marcelle, 23/10/2026) |
| PER-B42-07 | O que acontece com as campanhas antigas? | respondida | Convertem sozinhas para o filtro novo, com o mesmo resultado (Marcelle, 23/10/2026) |
