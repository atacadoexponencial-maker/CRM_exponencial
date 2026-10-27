# B46-13: Acabamentos das telas

**Tipo:** Correção
**Página:** Funis, Etiquetas, WhatsApp, Chat, Catálogo, Dashboard, Relatórios, Agenda, Automações
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achados **B-01** a **B-04**, **B-08**, **B-09**, **B-12**, **B-13**, **B-15**, **B-17**, **B-18**, **B-20**, **B-21** e **B-23**
**Gravidade:** Baixo

## Descrição

Erro de funil vazio vindo só do servidor, nova etiqueta sem cor marcada, "workspace" no texto, e os ajustes visuais listados no CA-B46-34.

## Pronto quando

Os três acabamentos com teste passam, e o Luan aprova os visuais no preview.

## Critérios de aceite

- **CA-B46-31** (automática) — Funil sem nome barrado no formulário. Dado o formulário "Novo funil" com o nome vazio, quando se clica em Criar, então "Informe o nome do funil." aparece na hora, junto do campo, sem ir ao servidor
- **CA-B46-32** (automática) — Nova etiqueta com cor marcada. Dado o formulário "Nova etiqueta", quando ele abre, então a primeira cor já vem marcada, e Salvar sem nome diz "Dê um nome à etiqueta"
- **CA-B46-33** (automática) — Sem "workspace" no texto. Dado os textos das telas, quando se procura "workspace" em texto visível, então não há nenhum; aparece "empresa"
- **CA-B46-34** (manual) — Acabamentos visuais aprovados. Dado a empresa de teste no preview, quando o Luan confere: "Editar funil" sem quebra e aberto perto do botão; mensagens rápidas com o nome inteiro; campos do produto no mesmo fundo; a barra de Aparência sem cobrir texto; Dashboard sem barras zeradas; Carteiras em tabela; lista de contatos do follow-up recolhida; editor de automação novo com a dica do "+"; seção "Agenda" visível no seletor; cartões de etapa sem "0 cards" quebrado, então ele aprova cada um, ou o que não aprovar volta para a issue

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
