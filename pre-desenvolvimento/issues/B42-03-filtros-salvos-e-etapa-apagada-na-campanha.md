# B42-03: Filtros salvos na campanha e aviso de funil ou etapa apagada

**Tipo:** Implementação
**Página:** Campanhas → editor, etapa Destinatários
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-segmentacao-de-campanhas.md`

**Depende de:** B42-02 (filtro na campanha)

## Descrição

Na etapa Destinatários a pessoa parte de um filtro salvo da empresa ou salva o filtro montado como filtro novo (a campanha guarda uma cópia), e uma campanha com condição de funil ou etapa apagada avisa e não confirma. Fecha a série com a aprovação visual dela.

## Pronto quando

Dá para escolher "Lojistas de Fortaleza" na campanha, ajustar, salvar "Proposta da feira" e vê-lo na lista de Contatos; um rascunho com etapa apagada mostra o aviso e trava a confirmação; a Marcelle aprova a tela no preview.

## Critérios de aceite

- **CA-B42-12** (automática) — Filtro com funil ou etapa apagada avisa e não confirma. Dado um rascunho ou uma campanha agendada ainda não enviada cujo filtro usa uma etapa, ou um funil, que depois foi apagado, quando a pessoa abre a campanha, então a etapa Destinatários avisa qual condição usa funil ou etapa que não existe mais, e a campanha não pode ser confirmada até a pessoa trocar ou remover essa condição
- **CA-B42-16** (automática) — Escolher um filtro salvo monta o filtro da campanha. Dado o filtro salvo "Lojistas de Fortaleza", quando a pessoa o escolhe na etapa Destinatários, então o painel mostra as condições dele, e a contagem é igual ao número de contatos que ele traz na lista de Contatos (menos os telefones inválidos)
- **CA-B42-17** (automática) — Ajustar na campanha não muda o filtro salvo. Dado a campanha montada a partir de "Lojistas de Fortaleza", quando a pessoa acrescenta uma condição na campanha, então o filtro salvo "Lojistas de Fortaleza" continua com as condições de antes, na campanha e na lista de Contatos
- **CA-B42-18** (automática) — Mudar o filtro salvo depois não muda a campanha. Dado um rascunho montado a partir de "Lojistas de Fortaleza", quando alguém atualiza ou apaga esse filtro salvo na lista de Contatos, então o rascunho continua com as condições que tinha
- **CA-B42-19** (automática) — Salvar o filtro da campanha como filtro salvo. Dado um Admin ou Gerente com um filtro montado na campanha, quando escolhe "Salvar como filtro" e dá o nome "Proposta da feira", então "Proposta da feira" aparece nos filtros salvos da campanha e da lista de Contatos, para a empresa toda, com as mesmas condições
- **CA-B42-20** (automática) — Nome repetido não salva. Dado o filtro salvo "Lojistas de Fortaleza", quando alguém tenta salvar pela campanha outro com o nome "lojistas de fortaleza", então a tela avisa que já existe um filtro com esse nome e não salva, como na lista de Contatos
- **CA-B42-31** (manual) — A etapa Destinatários fica bem arrumada. Dado o preview publicado, quando a Marcelle monta uma campanha com filtro de dois grupos, usa um filtro salvo e salva um filtro novo, no computador e no celular, nos temas claro e escuro, então ela aprova o painel, o resumo do filtro, a lista de filtros salvos e a contagem, e confere que o campo Perfil RFV e o Atendente (carteira) aparecem também na lista de Contatos

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B42-01 | A campanha guarda uma cópia das condições do filtro salvo usado, não um vínculo: mudar ou apagar o filtro salvo depois não muda campanha já montada. | confirmada | Marcelle, 23/10/2026 |
| SUP-B42-04 | Filtro com funil ou etapa apagada impede a confirmação até a pessoa ajustar, em vez de só ignorar a condição. | confirmada | Marcelle, 23/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B42-02 | A campanha usa os filtros salvos da lista de Contatos? | respondida | Sim, carrega e salva (Marcelle, 23/10/2026) |
