# B46-12: Mesma margem e largura em todas as telas

**Tipo:** Correção
**Página:** Todas as telas de `src/app/(auth)`
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achados **M-13**, **B-10** e **B-22**
**Gravidade:** Médio

## Descrição

Cada tela começa o conteúdo num ponto diferente (de 260 a 476 px) e algumas deixam metade da tela vazia. O título pula ao navegar.

## Pronto quando

Todas as telas usam o mesmo contêiner de página, na largura normal ou na larga.

## Critérios de aceite

- **CA-B46-29** (automática) — Um contêiner de página só. Dado as páginas de `src/app/(auth)`, quando se confere o contêiner da página, então todas usam o mesmo componente de página, na largura normal ou na larga (tabelas e quadros)
- **CA-B46-30** (manual) — Título no mesmo lugar ao navegar. Dado o desktop a 1440 px, quando se passa por Catálogo, Contatos, Automações, Funis, Agenda e Nova campanha, então o título começa no mesmo ponto em todas, e Times, Catálogo e Agenda não deixam metade da tela vazia

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
