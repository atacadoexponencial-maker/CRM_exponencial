# Spec: Nomes novos das etapas do Funil de Recompra

> Decidido pela Marcelle em 03/10/2026. Triagem: **arquitetural** — as etapas são
> valores gravados no banco que alertas, sequências, classificação do contato,
> dashboard e a série B11 do Luan usam como contrato.

## Visão Geral

O Funil de Recompra acompanha o cliente que já comprou. A empresa passou a usar uma
régua de nomes própria para essa fase. Esta mudança **troca só a nomenclatura** das
etapas e acrescenta uma etapa (Inativos RP). **As regras não mudam**: o card continua
mudando de etapa quando alguém arrasta, os alertas continuam com os prazos configuráveis
de hoje, e nada passa a mover cards sozinho.

| Hoje | Depois | Nome interno antes | Nome interno depois |
|---|---|---|---|
| Em Onboarding | **Onboarding** | `em_onboarding` | `onboarding` |
| Aguardando Recompra | **Reposição** | `aguardando_recompra` | `reposicao` |
| Cliente Ativo | **Ativos** | `cliente_ativo` | `ativos` |
| Recompra Realizada | *(deixa de existir — cards vão para Ativos)* | `recompra_realizada` | — |
| Em Risco | **Ativos RI** | `em_risco` | `ativos_ri` |
| Inativo | **Inativos** | `inativo` | `inativos` |
| — | **Inativos RP** *(nova)* | — | `inativos_rp` |
| Perdido | **Perdidos** | `perdido` | `perdidos` |

Ordem no quadro: **Onboarding → Reposição → Ativos → Ativos RI → Inativos → Inativos RP →
Perdidos.**

Para quem é: todos os usuários de todas as empresas. Ninguém precisa fazer nada — os
cards que já existem mudam de etapa sozinhos, uma vez, na troca, e nenhum dado se perde.

### A régua de dias (referência, não regra)

A empresa usa esta régua para decidir para onde arrastar o card. **Ela não aparece na
tela e o sistema não a aplica** — fica registrada para uso futuro (automações por tempo,
fase 2 da B11) e para os materiais de instrução e da central de ajuda.

| Etapa | Referência |
|---|---|
| Onboarding | até 30 dias da primeira compra |
| Reposição | a partir de 30 dias da primeira compra |
| Ativos | 2ª compra ou mais; 0 a 60 dias da última compra |
| Ativos RI (risco de inativação) | 2ª compra ou mais; 60 a 90 dias |
| Inativos | 2ª compra ou mais; 90 a 150 dias |
| Inativos RP (risco de perda) | 2ª compra ou mais; 150 a 180 dias |
| Perdidos | 2ª compra ou mais; a partir de 180 dias |

Princípio registrado: **o funil não tem automação embutida que a pessoa não controla.**
Mover card pelo tempo, se vier, entra como automação na tela de Automações.

### Cores das colunas

Cada coluna ganha a cor da régua no título e na borda, no padrão visual do CRM (sem
emoji): Onboarding e Reposição neutras; **Ativos** verde; **Ativos RI** amarelo;
**Inativos** cinza; **Inativos RP** laranja; **Perdidos** vermelho. Hoje Em Risco,
Inativo e Perdido são todas vermelhas com ícone de alerta; isso é substituído pelas
cores acima.

### O que NÃO muda

- **Mover card é manual**, como hoje.
- **Ganho no Funil de Entrada** continua criando o card do contato na primeira etapa da
  Recompra (agora chamada Onboarding).
- **Alertas**: os mesmos três, com os prazos configuráveis de hoje na Central de Alertas,
  contados pelo tempo parado na etapa — "sem recompra" em Reposição (antes Aguardando
  Recompra), "em risco" em Ativos RI (antes Em Risco), "inativo" em Inativos (antes
  Inativo). Inativos RP e Perdidos não geram alerta (Perdido também não gerava).
- **Sequências**: os gatilhos "card criado em Onboarding" e "card movido para Inativos"
  continuam funcionando, só com o nome novo na tela. O identificador interno do gatilho
  (`onboarding`, `inativo`) não muda — é nome de gatilho, não de etapa.
- **Classificação do contato** (Ativo, Em Risco, Inativo, Perdido, usada no filtro de
  público das campanhas): os nomes de classificação não mudam. Muda só de qual etapa ela
  vem: Ativo ← Onboarding, Reposição ou Ativos; Em Risco ← Ativos RI; Inativo ← Inativos
  ou Inativos RP; Perdido ← Perdidos.
- **Funil de Entrada**: nada muda — inclusive a etapa Perdido de lá continua `perdido`.
- **Specs e issues arquivadas**: registro histórico, ficam com os nomes da época.

### O que sai

- **Recompra Realizada e a volta automática**: hoje mover o card para Recompra Realizada
  pede confirmação e o sistema o devolve sozinho para Aguardando Recompra. É automação
  embutida e a etapa não está na régua nova: a etapa, a confirmação e a volta saem.
  Quem fez a recompra é arrastado para Ativos.

## Páginas / Módulos

### Funil de Recompra (`/pipeline/recompra`)

**Descrição:** o quadro kanban da Recompra, com as 7 etapas novas.

**Componentes:**
- Quadro: 7 colunas na ordem nova, cada uma com nome e quantidade de cards; rola para o
  lado quando não cabem.
- Cor de cada coluna, conforme "Cores das colunas".
- Card e painel do card: etapa atual e histórico com os nomes novos.
- Seletor de etapa no painel do card: as 7 etapas na ordem do quadro.

**Comportamentos:**
- Ver as 7 colunas: ao abrir o funil, o usuário vê as etapas na ordem nova, com as cores.
- Arrastar entre etapas: o card muda de etapa, como hoje, sem regra extra.
- Arrastar para Ativos: só muda de etapa (não há mais confirmação nem volta automática).
- Arrastar para Inativos RP: só muda de etapa.
- Ver o histórico: mudanças antigas aparecem com os nomes novos ("Em Risco → Inativo"
  aparece como "Ativos RI → Inativos"; uma passagem antiga por Recompra Realizada aparece
  como "Ativos").

### Mudança dos cards que já existem

**Descrição:** na troca, todo card do Funil de Recompra de todas as empresas passa para a
etapa nova pela tabela da Visão Geral. Não há tela.

**Comportamentos:**
- Mover cards: cada card vai para a etapa nova correspondente; Recompra Realizada vai
  para Ativos.
- Manter o tempo na etapa: a troca não conta como mudança de etapa — o tempo na etapa
  continua o mesmo e não entra linha nova no histórico.
- Renomear o histórico: mudanças já registradas passam a apontar para os nomes novos.
- Renomear automações: automação com gatilho "card movido para" ou ação "mover card
  para" uma etapa antiga da Recompra passa a apontar para a nova e continua funcionando.
- Não disparar nada: a troca não dispara sequência, automação nem alerta novo.
- Não tocar no Funil de Entrada.

### Central de Alertas (`/alertas`)

**Descrição:** mesmos alertas, nas etapas novas.

**Componentes:**
- Lista de alertas: etapa do card com o nome novo.
- Configuração de prazos: os mesmos três prazos editáveis, com textos citando Reposição,
  Ativos RI e Inativos.

**Comportamentos:**
- Alertar "sem recompra": card parado em Reposição além do prazo configurado.
- Alertar "em risco": card parado em Ativos RI além do prazo configurado.
- Alertar "inativo": card parado em Inativos além do prazo configurado.
- Não alertar Onboarding, Ativos, Inativos RP e Perdidos.
- Editar prazos: igual a hoje.

### Dashboard (`/dashboard` e `/dashboard/performance`)

**Descrição:** as métricas de Recompra contam pelas etapas novas.

**Componentes:**
- Clientes ativos: cards em Onboarding, Reposição ou Ativos.
- Em risco: cards em Ativos RI.
- Inativos: cards em Inativos ou Inativos RP.
- Perdidos: cards em Perdidos.
- Recompras no período: hoje contam passagens por Recompra Realizada; passam a contar
  as passagens por Ativos registradas no histórico no período (mover para Ativos é o
  gesto que substitui "Recompra Realizada"). As passagens antigas por Recompra Realizada,
  renomeadas para Ativos, continuam contando.

**Comportamentos:**
- Ver métricas de Recompra: os números seguem as definições acima.
- Ver performance por vendedor: mesmas definições, por atendente.

### Perfil do contato (`/contatos/[id]`) e lista de contatos

**Descrição:** onde aparece a etapa da Recompra, aparece o nome novo.

**Comportamentos:**
- Ver etapa atual da Recompra no perfil: nome novo.
- Ver linha do tempo: eventos antigos com os nomes novos.
- Ver classificação: derivada pela tabela de "O que NÃO muda".

### Automações (`/configuracoes/automacoes`)

**Descrição:** onde a pessoa escolhe uma etapa da Recompra, aparecem as 7 novas.

**Comportamentos:**
- Escolher etapa da Recompra no gatilho ou na ação: as 7 etapas novas, na ordem.
- Ver automação antiga: aparece com o nome novo da etapa.

### Sequências (`/sequencias`)

**Descrição:** só os textos dos gatilhos mudam.

**Comportamentos:**
- Ver gatilho de onboarding: "card criado em Onboarding".
- Ver gatilho de inativo: "card movido para Inativos".

### Série B11 (automações v2, branch do Luan)

**Descrição:** depois que esta mudança entrar no `master`, o branch
`b11-automacoes-v2` recebe o merge e troca as etapas antigas da Recompra que o
protótipo e as issues citam pelas novas. Sem mensagem ao Luan (decisão de 03/10: o
branch ainda não tem trabalho dele).
