# Spec: Novas etapas do Funil de Entrada

> Decidido pela Marcelle em 03/10/2026. Triagem: **arquitetural** — as etapas são
> valores gravados no banco que o dashboard, os alertas, as sequências, as automações,
> o perfil do contato e a série B11 do Luan usam como contrato.

## Visão Geral

O Funil de Entrada é o quadro onde o time de Entrada acompanha o lojista novo, do
primeiro contato até a primeira compra. Hoje ele tem 5 etapas. A empresa passou a
trabalhar com um processo mais detalhado — separar a sondagem, cobrar o retorno do
catálogo, guardar quem ainda não está pronto para comprar e registrar quem desistiu.

| Hoje | Depois |
|---|---|
| Lead | **Lead** |
| Em Qualificação | **Sondagem** |
| Catálogo Enviado | **Catálogo Enviado** |
| — | **Follow do Catálogo** *(nova)* |
| Em Negociação | **Negociação** |
| — | **Nutrição** *(nova)* |
| Primeira Compra | **Ganho** |
| — | **Perdido** *(nova)* |

Ordem no quadro, da esquerda para a direita:
**Lead → Sondagem → Catálogo Enviado → Follow do Catálogo → Negociação → Nutrição → Ganho → Perdido.**

Para quem é: todos os usuários de todas as empresas (Admin, Gerente, Atendente).
Ninguém precisa fazer nada — os cards que já existem mudam sozinhos de etapa e nenhum
dado se perde.

### Nome interno das etapas

| Etapa | Nome interno |
|---|---|
| Lead | `lead` (não muda) |
| Sondagem | `sondagem` (antes `em_qualificacao`) |
| Catálogo Enviado | `catalogo_enviado` (não muda) |
| Follow do Catálogo | `follow_catalogo` |
| Negociação | `negociacao` (antes `em_negociacao`) |
| Nutrição | `nutricao` |
| Ganho | `ganho` (antes `primeira_compra`) |
| Perdido | `perdido` |

`perdido` também é o nome de uma etapa do Funil de Recompra. São etapas diferentes,
cada uma no seu funil; o sistema sempre olha o funil junto com a etapa.

### O que cada etapa faz

- **Lead, Sondagem, Follow do Catálogo, Negociação, Nutrição**: etapas de trabalho.
  O card só chega nelas quando alguém arrasta (ou uma automação move). Nenhuma regra
  embutida.
- **Catálogo Enviado**: igual a hoje — mover para ela dispara a sequência automática
  configurada com o gatilho "card movido para Catálogo Enviado".
- **Ganho**: faz exatamente o que a Primeira Compra faz hoje — cria o card do contato no
  Funil de Recompra, na etapa Em Onboarding (se ele ainda não tiver um), conta como
  conversão no dashboard e para de gerar alertas.
- **Perdido**: coluna normal, sem motivo. O card fica visível, para de gerar alertas e
  deixa de contar como lead ativo. Pode ser arrastado de volta para qualquer etapa.

### O que NÃO muda

- **Funil de Recompra**: etapas, nomes e regras iguais.
- **Classificação do contato**: quem só tem card no Funil de Entrada continua "Lead",
  em qualquer etapa — inclusive Ganho e Perdido.
- **Gatilhos de sequência**: continuam os mesmos ("card criado como lead", "card movido
  para Catálogo Enviado", "onboarding", "inativo"). Follow do Catálogo e Nutrição não
  disparam sequência.
- **Specs e issues arquivadas** (`docs/specs-arquivadas/`, `issues/concluidas_*/`):
  registro histórico, ficam com os nomes da época.

## Páginas / Módulos

### Funil de Entrada (`/pipeline`)

**Descrição:** o quadro kanban do Funil de Entrada, com as 8 etapas novas.

**Componentes:**
- Quadro: 8 colunas na ordem acima, cada uma com o nome da etapa e a quantidade de cards.
  Quando as colunas não cabem na tela, o quadro rola para o lado, como o Funil de
  Recompra (7 colunas) já faz.
- Coluna Perdido: mesmo destaque visual da coluna Perdido do Funil de Recompra.
- Card: mostra a etapa atual com o nome novo.
- Painel do card: etapa atual e histórico de etapas com os nomes novos.
- Seletor de etapa (no painel do card): lista as 8 etapas na ordem do quadro.

**Comportamentos:**
- Ver as 8 colunas: ao abrir o funil, o usuário vê as 8 etapas na ordem nova.
- Arrastar para Follow do Catálogo: o card muda de etapa; nada mais acontece.
- Arrastar para Nutrição: o card muda de etapa; nada mais acontece.
- Arrastar para Ganho: o card muda de etapa e o contato ganha um card na etapa
  Em Onboarding do Funil de Recompra, se ainda não tiver um.
- Arrastar para Perdido: o card muda de etapa; não pede motivo.
- Tirar do Perdido: o card arrastado de Perdido para outra etapa volta a ser lead ativo
  e volta a poder gerar alerta.
- Arrastar para Catálogo Enviado: igual a hoje, dispara a sequência configurada.
- Ver o histórico: as mudanças antigas aparecem com os nomes novos (uma mudança antiga
  para "Em Qualificação" aparece como "Sondagem").
- Criar card novo: continua nascendo na etapa Lead.

### Mudança dos cards que já existem

**Descrição:** na hora em que a mudança entra no ar, todo card do Funil de Entrada de
todas as empresas passa para a etapa nova correspondente. Não há tela; acontece sozinho.

**Componentes:**
- Mapeamento: Lead → Lead; Em Qualificação → Sondagem; Catálogo Enviado → Catálogo
  Enviado; Em Negociação → Negociação; Primeira Compra → Ganho.

**Comportamentos:**
- Mover cards: cada card do Funil de Entrada vai para a etapa nova pelo mapeamento.
- Manter o tempo na etapa: a troca de nome não conta como mudança de etapa — o card
  continua mostrando o mesmo tempo na etapa e não ganha linha nova no histórico.
- Renomear o histórico: as mudanças de etapa já registradas passam a apontar para os
  nomes novos.
- Renomear automações: automação existente com gatilho "card movido para" ou ação
  "mover card para" uma etapa antiga do Funil de Entrada passa a apontar para a etapa
  nova correspondente e continua funcionando.
- Não disparar nada: mover os cards na troca não dispara sequência, automação nem
  criação de card na Recompra (quem estava em Primeira Compra já tem o seu).
- Não tocar no Funil de Recompra: nenhum card da Recompra muda.

### Dashboard (`/dashboard` e `/dashboard/performance`)

**Descrição:** as métricas do Funil de Entrada usam as etapas novas.

**Componentes:**
- Gráfico de conversão por etapa: Lead → Sondagem → Catálogo Enviado → Follow do
  Catálogo → Negociação → Ganho. Nutrição e Perdido não são degraus do funil de
  conversão.
- Leads ativos: cards do Funil de Entrada que não estão em Ganho nem em Perdido.
- Taxa de conversão: leads do período que chegaram em Ganho.
- Convertidos por vendedor (performance): leads do vendedor que chegaram em Ganho.

**Comportamentos:**
- Contar card em Nutrição: conta pelas etapas por onde passou (um card que foi de
  Negociação para Nutrição conta como tendo chegado em Negociação).
- Contar card em Perdido: conta pelas etapas por onde passou antes de ser perdido;
  nunca conta como convertido.
- Contar card antigo: um card que chegou em Primeira Compra antes da mudança conta como
  Ganho; um que passou por Em Negociação conta como tendo chegado em Negociação.
- Filtrar por período: igual a hoje.

### Central de Alertas (`/alertas`)

**Descrição:** o alerta "lead sem resposta" do Funil de Entrada respeita as etapas novas.

**Componentes:**
- Lista de alertas: mostra a etapa do card com o nome novo.

**Comportamentos:**
- Não alertar Ganho: card em Ganho não gera "lead sem resposta" (igual à Primeira
  Compra hoje).
- Não alertar Perdido: card em Perdido não gera "lead sem resposta".
- Alertar as demais: card em Lead, Sondagem, Catálogo Enviado, Follow do Catálogo,
  Negociação ou Nutrição continua gerando "lead sem resposta" pelo limiar configurado.

### Perfil do contato (`/contatos/[id]`)

**Descrição:** onde o perfil mostra a etapa do Funil de Entrada, mostra o nome novo.

**Componentes:**
- Card do funil no perfil: etapa atual com o nome novo.
- Linha do tempo: eventos de criação de card e mudança de etapa com os nomes novos.

**Comportamentos:**
- Ver etapa atual: o perfil mostra o nome novo da etapa.
- Ver linha do tempo: eventos antigos aparecem com os nomes novos.

### Automações (`/configuracoes/automacoes`)

**Descrição:** onde a pessoa escolhe uma etapa do Funil de Entrada, aparecem as 8 novas.

**Componentes:**
- Seletor de etapa no gatilho "card movido para": 8 etapas do Funil de Entrada na ordem
  nova.
- Seletor de etapa na ação "mover card para": as mesmas 8 etapas.
- Lista de automações: mostra o nome novo da etapa configurada.

**Comportamentos:**
- Criar automação para etapa nova: dá para escolher Follow do Catálogo, Nutrição,
  Ganho ou Perdido como gatilho ou destino.
- Mover para Ganho por automação: faz o mesmo que arrastar para Ganho (cria o card
  na Recompra).
- Ver automação antiga: aparece com o nome novo da etapa.

### Sequências (`/sequencias`)

**Descrição:** sem mudança de comportamento; só os textos que citam etapas do Funil de
Entrada usam os nomes novos.

**Comportamentos:**
- Ver gatilho "Catálogo Enviado": continua com o mesmo nome e o mesmo efeito.

### Série B11 (automações v2, branch do Luan)

**Descrição:** o protótipo e as issues da B11 citam etapas antigas do Funil de Entrada
(ex.: `em_qualificacao`). Depois que esta mudança entrar no `master`, o branch
`b11-automacoes-v2` recebe o merge e troca as etapas antigas pelas novas.

**Comportamentos:**
- Avisar o Luan: ele recebe a lista de etapas novas e o mapeamento antes do merge.
- Atualizar o branch: protótipo e issues da B11 passam a usar as etapas novas.
