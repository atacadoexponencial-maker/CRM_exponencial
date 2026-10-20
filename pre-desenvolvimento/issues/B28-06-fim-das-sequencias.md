# B28-06: Fim das sequências

**Tipo:** Implementação
**Página:** Menu, funil, perfil do contato, central de alertas, Agenda da equipe, automações e cadastro
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-espera-e-fim-das-sequencias.md`

## Descrição

O Módulo 4 perde as sequências: sai o menu e as telas de `/sequencias` (o endereço leva
para as automações), o início pelo arraste do card, a ação "iniciar sequência" e a opção da
etapa no "mover card", o botão "Iniciar sequência" do card, do perfil e dos alertas, o
quadro de sequências da Agenda da equipe, as sequências prontas do cadastro e o cron diário.
As tabelas ficam no banco até a B28-07.

## Pronto quando

No preview, nenhuma tela fala em sequência, `/sequencias` abre as automações, arrastar o
card não cria execução de sequência, empresa nova nasce sem sequência, e uma regra antiga
com "iniciar sequência" avisa no histórico e no editor em vez de rodar.

## Critérios de aceite

- **CA-B28-31** (automática) — O menu e as telas não falam mais em sequência. Dado um admin logado, quando ele abre o menu, o card do funil, o perfil do contato, a central de alertas e a Agenda da equipe, então nenhum deles mostra "Sequências" nem "Iniciar sequência", e abrir `/sequencias` leva para as automações.
- **CA-B28-32** (automática) — Arrastar o card não inicia sequência. Dado um card no Funil de Entrada, quando o atendente o arrasta para Catálogo Enviado ou para Ganho, então nenhuma execução de sequência é criada, e as automações de "card movido" rodam como antes.
- **CA-B28-33** (automática) — As ações de sequência saem do editor. Dado o editor de automação, quando o admin abre o menu de ações e o painel do "mover card", então não há "iniciar sequência" nem a opção "iniciar a sequência da etapa".
- **CA-B28-34** (automática) — Regra antiga com "iniciar sequência" avisa em vez de rodar. Dado uma regra gravada com a ação "iniciar sequência", quando ela dispara, então essa ação falha com "a ação 'iniciar sequência' foi removida: troque no editor", as outras ações rodam, e o editor aponta a pendência no bloco.
- **CA-B28-35** (automática) — Empresa nova não ganha sequências. Dado o cadastro de uma empresa nova, quando ela é criada, então nenhuma sequência é criada para ela.

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B28-08 | O que fica no lugar do botão "Iniciar sequência"? | respondida | Nada: o botão sai (Luan, 20/10/2026). |
