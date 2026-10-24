# B42-04: Filtros salvos de campanha separados dos de Contatos

**Tipo:** Implementação
**Página:** Campanhas → editor, etapa Destinatários
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-segmentacao-de-campanhas.md`

**Depende de:** B42-03 (filtros salvos na campanha)

## Descrição

Os filtros salvos passam a pertencer a uma tela: os da campanha não aparecem em Contatos, e os de Contatos não aparecem na campanha. Na campanha dá para salvar, atualizar com o filtro montado, renomear, mudar a ordem e apagar, como na lista de Contatos.

## Pronto quando

Um filtro salvo pela campanha aparece só na faixa da campanha; dá para atualizá-lo, renomeá-lo, movê-lo e apagá-lo ali, e a lista de Contatos continua só com os filtros dela.

## Critérios de aceite

- **CA-B42-19** (automática) — Salvar o filtro da campanha como filtro salvo. Dado um Admin ou Gerente com um filtro montado na campanha, quando escolhe "Salvar filtro" e dá o nome "Proposta da feira", então "Proposta da feira" aparece nos filtros salvos de campanha, para a empresa toda, com as mesmas condições, e não aparece nos filtros salvos da lista de Contatos
- **CA-B42-20** (automática) — Nome repetido não salva. Dado o filtro salvo de campanha "Lojistas de Fortaleza", quando alguém tenta salvar pela campanha outro com o nome "lojistas de fortaleza", então a tela avisa que já existe um filtro com esse nome e não salva, como na lista de Contatos. Um filtro de Contatos com o mesmo nome não impede salvar o de campanha
- **CA-B42-32** (automática) — Cada tela só mostra os próprios filtros salvos. Dado o filtro salvo "Clientes da feira" na lista de Contatos e o filtro salvo de campanha "Proposta da feira", quando a pessoa abre a lista de Contatos e depois a etapa Destinatários da campanha, então Contatos mostra só "Clientes da feira" e a campanha mostra só "Proposta da feira", inclusive para quem chama o servidor direto
- **CA-B42-33** (automática) — Atualizar o filtro salvo de campanha. Dado a campanha montada a partir do filtro salvo de campanha "Proposta da feira", quando a pessoa acrescenta uma condição no painel e escolhe "Atualizar filtro salvo", então "Proposta da feira" passa a ter a condição nova para a empresa toda, e a lista de Contatos não muda
- **CA-B42-34** (automática) — Renomear o filtro salvo de campanha. Dado os filtros salvos de campanha "Proposta da feira" e "Lojistas de Fortaleza", quando a pessoa renomeia "Proposta da feira" para "Feira 2026", e depois tenta renomeá-lo para "lojistas de fortaleza", então o primeiro nome novo fica gravado; o segundo é recusado com o aviso de nome repetido
- **CA-B42-35** (automática) — Mudar a ordem dos filtros salvos de campanha. Dado os filtros salvos de campanha "A", "B" e "C", nessa ordem, quando a pessoa move "C" para a esquerda, então a faixa da campanha mostra "A", "C", "B", para a empresa toda, e a ordem dos filtros da lista de Contatos não muda
- **CA-B42-36** (automática) — Apagar o filtro salvo de campanha. Dado o filtro salvo de campanha "Proposta da feira", quando a pessoa escolhe apagar e confirma, então ele some da faixa da campanha, e os filtros da lista de Contatos continuam lá
- **CA-B42-37** (automática) — Atendente não mexe nos filtros salvos de campanha. Dado um Atendente logado, quando ele tenta salvar, atualizar, renomear, mover ou apagar um filtro salvo de campanha chamando o servidor direto, então o servidor recusa e nada muda

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B42-01 | A campanha guarda uma cópia das condições do filtro salvo usado, não um vínculo: mudar ou apagar o filtro salvo depois não muda campanha já montada. | confirmada | Marcelle, 23/10/2026 |
| SUP-B42-08 | O nome do filtro salvo é único dentro de cada tela: a campanha pode ter um filtro com o mesmo nome de um da lista de Contatos. | confirmada | Marcelle, 24/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B42-02 | A campanha usa os filtros salvos da lista de Contatos? | respondida | Sim, carrega e salva (Marcelle, 23/10/2026). **Revisto em 24/10/2026:** não; a campanha tem filtros salvos próprios, separados dos de Contatos, e pode salvar, atualizar, renomear, mover e apagar (Marcelle, 24/10/2026) |
