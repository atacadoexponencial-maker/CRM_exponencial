# B46-03: O menu de cada linha diz de quem é, e apagar mostra o nome

**Tipo:** Correção
**Página:** Configurações (Etiquetas e demais listas com menu ⋯)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achado **M-12**
**Gravidade:** Alto

## Descrição

O botão ⋯ de cada linha só se chama "Abrir menu", e a confirmação de apagar não destaca o nome. No teste, isso levou a apagar a etiqueta errada.

## Pronto quando

Cada botão de menu diz de qual linha é, e a confirmação de apagar mostra o nome em negrito.

## Critérios de aceite

- **CA-B46-06** (automática) — Botão de menu com o nome da linha. Dado as etiquetas "Interessado" e "Cliente" na lista de Etiquetas, quando a lista é desenhada, então os botões de menu se chamam "Menu de Interessado" e "Menu de Cliente", e não "Abrir menu"
- **CA-B46-07** (automática) — Confirmação de apagar com o nome em destaque. Dado a etiqueta "Interessado", quando se escolhe Apagar no menu dela, então a confirmação mostra "Interessado" em negrito, antes do botão de confirmar

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
