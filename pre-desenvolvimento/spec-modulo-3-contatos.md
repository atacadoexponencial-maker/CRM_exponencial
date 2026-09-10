# Spec: Módulo 3 — Gestão de Contatos

## Visão Geral

O módulo de Contatos é o registro central de todos os leads e clientes do workspace. Enquanto o Chat gerencia conversas e o Pipeline gerencia o funil de vendas, este módulo é a fonte de verdade dos dados cadastrais — qualquer contato criado no Chat ou no Pipeline também aparece aqui com seu perfil completo.

O diferencial em relação ao que o módulo de Chat já expõe é o enriquecimento do perfil com campos específicos do método atacado (nicho, tipo de revendedor, ICP), a classificação automática derivada do pipeline, a timeline unificada de interações e o histórico de compras com ticket médio.

**Público:**
- Admin e Gerente: visão completa de todos os contatos do workspace
- Atendente: visão apenas dos contatos cujas conversas ou cards de pipeline estão atribuídos a ele

**Fora do escopo desta versão:** importação em massa de contatos, integração com ERPs, exportação de dados, campanhas de disparo, sequências automáticas de follow-up.

---

## Classificação automática de contatos

A classificação é derivada automaticamente da etapa atual do card de pipeline do contato. Não é inserida manualmente.

| Classificação | Critério |
|---|---|
| **Lead** | Tem card ativo no Funil de Expansão (qualquer etapa antes de "Primeira Compra") |
| **Ativo** | Tem card no Funil de Retenção nas etapas "Em Onboarding", "Cliente Ativo", "Aguardando Recompra" ou "Recompra Realizada" |
| **Em Risco** | Tem card no Funil de Retenção na etapa "Em Risco" |
| **Inativo** | Tem card no Funil de Retenção na etapa "Inativo" |
| **Perdido** | Tem card no Funil de Retenção na etapa "Perdido" |
| **Sem histórico** | Não tem nenhum card de pipeline associado |

Se o contato tiver cards em múltiplos funis simultaneamente, a classificação do Funil de Retenção tem precedência.

---

## Páginas / Módulos

---

### Lista de Contatos

**Descrição:** Visão em lista de todos os contatos do workspace. É a página principal do módulo, acessível pelo menu lateral. Permite localizar qualquer contato rapidamente e acessar seu perfil completo.

**Componentes:**
- Campo de busca por nome ou número de WhatsApp
- Filtro por classificação: Todos, Lead, Ativo, Em Risco, Inativo, Perdido, Sem histórico
- Filtro por tipo: Lojista, Revendedor, Empreendedor
- Filtro por nicho (lista dos nichos cadastrados no workspace)
- Filtro por atendente responsável (Admin e Gerente veem todos; Atendente não tem esse filtro)
- Ordenação: mais recente, nome (A–Z), classificação
- Linha de contato: nome, número de WhatsApp, classificação (badge colorido), tipo, nicho, cidade, atendente responsável
- Botão "Novo contato" para criar um contato manualmente
- Indicador de total de contatos correspondendo aos filtros ativos

**Comportamentos:**
- Admin ou Gerente visualiza todos os contatos do workspace
- Atendente visualiza apenas os contatos cujas conversas ou cards de pipeline estão atribuídos a ele
- Usuário busca contato por nome parcial ou número de WhatsApp
- Usuário aplica um ou mais filtros simultaneamente (classificação, tipo, nicho, atendente)
- Usuário ordena a lista por critério selecionado
- Usuário clica na linha do contato e navega para o Perfil do Contato
- Admin ou Gerente clica em "Novo contato" e abre formulário de criação manual
- Admin ou Gerente preenche o formulário com nome e número de WhatsApp (campos obrigatórios) e dados opcionais, e salva
- Sistema rejeita criação se o número de WhatsApp já existir no workspace
- Contato recém-criado aparece na lista com classificação "Sem histórico"
- Admin da Empresa A não vê contatos da Empresa B (isolamento multi-tenant)

---

### Perfil do Contato

**Descrição:** Página de detalhe de um contato. Exibe e permite editar todas as informações cadastrais, além de mostrar o status atual no pipeline e oferecer acesso rápido à conversa de WhatsApp.

**Componentes:**
- Cabeçalho: nome do contato, número de WhatsApp, classificação atual (badge colorido), botão "Abrir conversa"
- Seção "Dados do contato":
  - Nome completo (editável)
  - Número de WhatsApp (somente leitura — chave de identidade)
  - Tipo: Lojista, Revendedor, Empreendedor (seleção única, editável)
  - Nicho de atuação (texto livre, editável)
  - Cidade (texto livre, editável)
  - ICP: "Já revende este nicho" ou "Primeira vez no nicho" (seleção única, editável)
- Seção "Tags": lista de tags livres aplicadas ao contato, campo para adicionar nova tag, botão para remover tag
- Seção "Observações": campo de texto livre para o vendedor anotar contexto sobre o contato (visível apenas para o time, não vai para o WhatsApp)
- Seção "Pipeline": etapa atual em cada funil em que o contato tem card ativo, com link para abrir o card no pipeline
- Seção "Histórico de compras": lista de registros de compra com data e valor, total de compras e ticket médio calculado
- Botão "Registrar compra" (Admin e Gerente)
- Botão "Abrir conversa" no cabeçalho que navega para o Chat com a conversa do contato aberta

**Comportamentos:**
- Usuário visualiza todos os dados cadastrais do contato
- Usuário edita nome, tipo, nicho, cidade e campo ICP e salva
- Sistema exibe a classificação atual do contato derivada do pipeline (não é editável)
- Usuário adiciona tag livre ao contato (texto curto, sem espaços)
- Usuário remove tag do contato
- Usuário edita observações do contato (texto livre, salvo ao sair do campo ou ao clicar em "Salvar")
- Admin ou Gerente registra uma compra informando data e valor
- Sistema recalcula ticket médio ao adicionar novo registro de compra
- Usuário clica em "Abrir conversa" e é redirecionado para a conversa de WhatsApp do contato no módulo de Chat
- Usuário clica no link de pipeline e é redirecionado para o card do contato no funil correspondente
- Sistema rejeita nome vazio ao salvar edição
- Sistema rejeita valor de compra negativo ou zero ao registrar compra

---

### Timeline do Contato

**Descrição:** Aba dentro do Perfil do Contato que exibe a cronologia completa de todas as interações com o contato, unificando eventos de diferentes módulos em ordem do mais recente para o mais antigo.

**Componentes:**
- Lista de eventos em ordem cronológica decrescente
- Cada evento exibe: data e hora, tipo de evento (ícone + rótulo), descrição resumida, nome do usuário responsável
- Tipos de evento exibidos:
  - Conversa iniciada (nova conversa no Chat)
  - Card criado no pipeline (com o funil e etapa inicial)
  - Mudança de etapa no pipeline (etapa anterior → etapa nova, nome do usuário)
  - Nota interna adicionada no card do pipeline (preview da nota)
  - Compra registrada (data e valor)
  - Dados do contato editados (quais campos foram alterados)
- Filtro por tipo de evento (opcional, para reduzir ruído em contatos com muito histórico)

**Comportamentos:**
- Usuário visualiza todos os eventos em ordem cronológica decrescente
- Cada tipo de evento é visualmente distinguível dos demais (ícone e cor diferentes)
- Usuário filtra a timeline por tipo de evento
- Eventos de pipeline refletem todas as movimentações já registradas no histórico do card
- Notas internas de pipeline aparecem na timeline com preview do texto (primeiros 100 caracteres)
- Compras registradas no Perfil aparecem na timeline
- Eventos gerados em outros workspaces nunca aparecem na timeline (isolamento multi-tenant)
