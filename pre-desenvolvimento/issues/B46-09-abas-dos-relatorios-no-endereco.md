# B46-09: As abas dos Relatórios ficam no endereço

**Tipo:** Correção
**Página:** Relatórios
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achado **M-06**
**Gravidade:** Médio

## Descrição

Todas as abas ficam em `/relatorios`: não dá para mandar o link de uma aba, voltar com o navegador nem recarregar nela.

## Pronto quando

Cada aba tem endereço próprio, abre direto pelo link e responde ao Voltar.

## Critérios de aceite

- **CA-B46-22** (automática) — Aba no endereço. Dado a tela Relatórios, quando se abre a aba RFV, então o endereço fica `/relatorios?aba=rfv`, e abrir esse endereço direto mostra a aba RFV
- **CA-B46-23** (manual) — Voltar do navegador volta de aba. Dado a Visão Geral aberta e depois a aba Coorte, quando se aperta Voltar no navegador, então a Visão Geral volta, sem sair dos Relatórios

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
