# B15-01: Etapas novas do Funil de Recompra

**Tipo:** Implementação
**Página:** Funil de Recompra, painel do card, Alertas, Dashboard, Perfil e lista de contatos, Automações, Sequências
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-etapas-funil-recompra.md` — tudo, menos "Cores das colunas" e "Série B11"

## Descrição

Trocar as etapas do Funil de Recompra pelas da régua nova, em todas as camadas e de uma
vez: Onboarding (`onboarding`), Reposição (`reposicao`), Ativos (`ativos`), Ativos RI
(`ativos_ri`), Inativos (`inativos`), Inativos RP (`inativos_rp`, nova) e Perdidos
(`perdidos`). Recompra Realizada sai junto com a confirmação e a volta automática; os
cards dela vão para Ativos. Inclui converter cards, histórico e automações sem reiniciar
o tempo na etapa e sem disparar nada, e ajustar alertas, dashboard, classificação do
contato e textos das sequências — sem mudar nenhuma regra além da saída da Recompra
Realizada.

## Pronto quando

No CRM publicado, o Funil de Recompra mostra Onboarding, Reposição, Ativos, Ativos RI,
Inativos, Inativos RP e Perdidos; os cards existentes estão nas etapas novas com o mesmo
tempo na etapa; arrastar para Ativos só muda a etapa (sem confirmação nem volta); Ganho
no Funil de Entrada cria o card em Onboarding; os três alertas disparam em Reposição,
Ativos RI e Inativos com os prazos de hoje; o dashboard e a classificação do contato
contam pelas etapas novas; e nenhuma tela mostra mais "Em Onboarding", "Aguardando
Recompra", "Cliente Ativo", "Recompra Realizada", "Em Risco" ou "Inativo" como etapa.
