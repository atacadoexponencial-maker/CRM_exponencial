# B41-03: Funis novos no chat, no perfil e na lixeira

**Tipo:** Implementação
**Página:** Chat (ficha do contato), Contatos (perfil e lixeira)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-funis-personalizados.md`

## Descrição

Os cards dos funis novos aparecem na ficha do chat e no perfil (com link e histórico), saem e voltam com o contato na lixeira, e não mudam a classificação do contato nem os relatórios. Depende da B41-01.

## Pronto quando

Abrindo um contato que está num funil novo, a ficha do chat e o perfil mostram o funil e a etapa; excluir e restaurar o contato leva e traz esse card.

## Critérios de aceite

- **CA-B41-25** (automática) — Chat e perfil mostram os funis novos. Dado um contato com card em Entrada ("Sondagem") e em "Feira de Março" ("Confirmou"), quando alguém abre a ficha dele no chat e o perfil dele, então os dois lugares mostram "Funil de Entrada — Sondagem" e "Feira de Março — Confirmou". No perfil, cada um leva ao quadro do funil.
- **CA-B41-26** (automática) — Histórico do contato cita o funil novo. Dado um contato adicionado a "Feira de Março" e movido de etapa, quando alguém abre o perfil, então o histórico mostra "Card criado no funil Feira de Março" e a mudança de etapa, com os nomes atuais do funil e da etapa
- **CA-B41-27** (automática) — Excluir e restaurar o contato leva e traz os cards dos funis novos. Dado um contato com cards em Entrada e em dois funis novos, quando o Admin exclui o contato e depois o restaura da lixeira, então o aviso de exclusão diz que os 3 cards saem junto; na lixeira, os cards não aparecem em nenhum quadro; restaurado, os 3 voltam às etapas em que estavam
- **CA-B41-28** (automática) — Funil novo não muda a classificação do contato. Dado um contato classificado como "Ativo" pelo card de Recompra, quando ele entra num funil novo, muda de etapa e sai dele, então a classificação continua "Ativo", e os relatórios (RFV, Carteiras, Coorte e Funil de clientes) mostram os mesmos números de antes

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B41-09 | A classificação do contato considera os funis novos? | respondida | Marcelle, 23/10/2026: não, só Entrada e Recompra |
