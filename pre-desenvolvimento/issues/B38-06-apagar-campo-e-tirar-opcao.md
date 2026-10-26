# B38-06: Apagar campo e tirar opção, com bloqueio quando estão em uso

**Tipo:** Implementação
**Página:** Configurações → Campos personalizados
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-campos-personalizados.md`

## Descrição

Apagar um campo ou tirar uma opção de lista avisa quantos contatos perdem o valor; quando o campo ou a opção está em uso em automação, filtro salvo ou campanha não enviada, a tela não deixa e mostra onde.

## Pronto quando

O campo fora de uso some com os valores depois da confirmação; o campo ou a opção em uso não sai, e a tela lista pelo nome a automação, o filtro salvo e a campanha que o usam.

## Critérios de aceite

- **CA-B38-10** (automática) — Tirar opção que contatos usam. Dado o campo "Porte" com a opção "Rede", 3 contatos com "Rede", e nenhuma automação, filtro salvo ou campanha não enviada usando "Rede", quando o Admin tira a opção "Rede", então a tela avisa que 3 contatos perdem esse valor e pede confirmação; ao confirmar, os 3 ficam com o campo vazio (e, em Múltipla escolha, só perdem essa opção, mantendo as outras)
- **CA-B38-12** (automática) — Apagar campo que não está em uso. Dado o campo "Aniversário da loja", que 4 contatos preencheram e que nenhuma automação, filtro salvo ou campanha não enviada usa, quando o Admin pede para apagar, então a confirmação avisa que 4 contatos perderão esse valor; ao confirmar, o campo some de todas as telas e os valores são apagados; ao desistir, nada muda
- **CA-B38-13** (automática) — Campo em uso não pode ser apagado. Dado o campo "Porte", usado na automação "Boas-vindas atacado", no filtro salvo de Contatos "Lojas grandes" e na campanha agendada "Promoção de março", quando o Admin pede para apagar, então a tela não apaga e mostra a lista "Usado em": a automação, o filtro salvo e a campanha, pelo nome; depois que o campo sai dos três, ele pode ser apagado
- **CA-B38-45** (automática) — Opção em uso não pode ser tirada. Dado a automação "Atacado em rede" com a condição "Porte é qualquer um de Rede", quando o Admin tenta tirar a opção "Rede" do campo "Porte", então a tela não tira e mostra "Usado em" com o nome da automação; depois que a condição deixa de usar "Rede", a opção pode ser tirada

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B38-02 | "Em uso", para bloquear o apagar, é: automação (ligada ou desligada) que usa o campo no gatilho, numa condição, numa ação ou como variável no texto; filtro salvo de Contatos ou de Campanhas; campanha em rascunho ou agendada que usa o campo no público ou como variável no texto. Campanha já enviada não conta. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-10 | Tirar opção de uma lista que uma automação, filtro salvo ou campanha não enviada usa segue a mesma regra do apagar: a tela bloqueia e mostra onde a opção é usada. | confirmada | Marcelle, 26/10/2026 (CA-B38-45). |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B38-05 | O que acontece ao apagar um campo com valores ou em uso? | respondida | Bloqueia enquanto estiver em uso (automação ou filtro salvo); fora de uso, apaga depois de avisar quantos valores se perdem. Marcelle, 26/10/2026. |
| PER-B38-12 | Tirar opção de lista em uso: bloqueia ou desliga a automação? | respondida | Bloqueia e mostra onde é usada. Marcelle, 26/10/2026. |
