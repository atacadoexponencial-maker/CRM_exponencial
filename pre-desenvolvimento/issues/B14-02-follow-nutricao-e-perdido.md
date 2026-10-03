# B14-02: Etapas novas Follow do Catálogo, Nutrição e Perdido

**Tipo:** Implementação
**Página:** Funil de Entrada, painel do card, Dashboard, Alertas, Perfil do contato, Automações
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-etapas-funil-entrada.md` — seções "O que cada etapa faz" e, nos módulos, tudo o que se refere a Follow do Catálogo, Nutrição e Perdido
**Depende de:** B14-01

## Descrição

Acrescentar as três etapas novas ao Funil de Entrada — **Follow do Catálogo**
(`follow_catalogo`), **Nutrição** (`nutricao`) e **Perdido** (`perdido`) — na ordem
Lead → Sondagem → Catálogo Enviado → Follow do Catálogo → Negociação → Nutrição → Ganho →
Perdido. Follow do Catálogo e Nutrição são etapas de trabalho sem regra embutida.
Perdido é coluna normal, sem motivo, com o destaque visual do Perdido da Recompra:
não gera alerta, não conta como lead ativo e pode voltar para qualquer etapa. No
dashboard, Follow do Catálogo vira degrau do gráfico de conversão; Nutrição e Perdido
não são degraus, e o card nelas conta pelas etapas por onde passou.

## Pronto quando

No CRM publicado, o Funil de Entrada mostra as 8 colunas na ordem nova (rolando para o
lado quando não cabem); dá para arrastar um card para Follow do Catálogo, Nutrição e
Perdido e de volta; card em Perdido some dos alertas e de "leads ativos" e volta a contar
quando sai de lá; card em Nutrição continua gerando "lead sem resposta"; o gráfico de
conversão vai de Lead a Ganho passando por Follow do Catálogo; e as três etapas aparecem
para escolha nos gatilhos e ações das automações e com o nome certo no perfil do contato.
