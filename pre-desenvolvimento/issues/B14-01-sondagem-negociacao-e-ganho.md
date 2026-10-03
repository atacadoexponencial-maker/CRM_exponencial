# B14-01: Sondagem, Negociação e Ganho no lugar das etapas antigas

**Tipo:** Implementação
**Página:** Funil de Entrada, painel do card, Dashboard, Alertas, Perfil do contato, Automações, Sequências
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-etapas-funil-entrada.md` — seções "Nome interno das etapas", "Mudança dos cards que já existem" e, nos demais módulos, tudo o que se refere a Sondagem, Negociação e Ganho

## Descrição

Trocar as três etapas antigas do Funil de Entrada pelas novas, em todas as camadas e de
uma vez só: Em Qualificação → **Sondagem** (`sondagem`), Em Negociação → **Negociação**
(`negociacao`), Primeira Compra → **Ganho** (`ganho`). Inclui mudar os cards de todas as
empresas, o histórico de etapas e as automações que apontam para essas etapas, sem
reiniciar o tempo na etapa e sem disparar nada. Ganho passa a fazer tudo o que a
Primeira Compra faz: cria o card na Recompra, conta como conversão no dashboard e não
gera alerta.

Lead e Catálogo Enviado não mudam. As etapas novas (Follow do Catálogo, Nutrição,
Perdido) ficam para a B14-02.

## Pronto quando

No CRM publicado, o Funil de Entrada mostra as colunas Lead, Sondagem, Catálogo Enviado,
Negociação e Ganho; os cards que estavam em Em Qualificação, Em Negociação e Primeira
Compra aparecem nas etapas novas com o mesmo tempo na etapa; arrastar um card para Ganho
cria o card do contato em Em Onboarding na Recompra; o dashboard conta Ganho como
conversão; card em Ganho não gera alerta; e nenhuma tela (painel do card, histórico,
perfil do contato, alertas, automações, sequências) mostra mais "Em Qualificação", "Em
Negociação" ou "Primeira Compra".
