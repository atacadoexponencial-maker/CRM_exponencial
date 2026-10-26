# B38-04: Campos personalizados nas automações

**Tipo:** Implementação
**Página:** Configurações → Automações → editor
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-campos-personalizados.md`

## Descrição

O gatilho "Dado do contato alterado" e a ação "Alterar dado do contato" passam a oferecer os campos personalizados, e nasce a condição "Campo personalizado", com saídas sim e não.

## Pronto quando

Uma automação dispara quando o Porte muda para Grande, segue pela saída sim ou não conforme o Porte e marca "Cliente VIP: Sim" no contato.

## Critérios de aceite

- **CA-B38-37** (automática) — Gatilho dispara quando o campo muda. Dado a automação ligada com o gatilho "Dado do contato alterado", campo "Porte", valor novo "Grande", quando alguém muda o Porte de um contato para "Grande", pelo perfil, pelo Chat ou por outra automação, então a automação roda para esse contato; mudar para "Pequeno" ou salvar o mesmo valor de antes não a faz rodar
- **CA-B38-38** (automática) — Condição pelo campo personalizado. Dado a automação com a condição "Porte é qualquer um de Grande", quando ela roda para um contato com Porte "Grande" e para outro sem Porte, então o primeiro segue pela saída sim e o segundo pela saída não, e o histórico mostra a condição e o caminho de cada um
- **CA-B38-39** (automática) — Ação preenche o campo personalizado. Dado a automação com a ação "Alterar dado do contato", campo "Cliente VIP" (Sim/não), valor sim, quando ela roda para um contato, então o perfil do contato mostra "Cliente VIP: Sim"
- **CA-B38-40** (automática) — Valor da ação conferido pelo tipo. Dado o editor de automação com a ação "Alterar dado do contato" no campo "Limite de crédito" (Dinheiro), quando o Admin digita "muito" no valor e tenta salvar a automação, então o editor aponta o valor e não salva

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B38-03 | Além do perfil e do filtro, onde os campos aparecem? | respondida | Painel do contato no Chat, cadastro de novo contato, automações e variáveis na mensagem. Marcelle, 26/10/2026. |
