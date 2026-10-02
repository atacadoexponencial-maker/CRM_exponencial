# Spec: Funis "Entrada" e "Recompra" (renomeação de Expansão e Retenção)

> Decidido pela Marcelle em 02/10/2026. Triagem: **arquitetural** — a troca vai
> até o nome interno gravado no banco, que outras partes (automações, dashboard,
> alertas, classificação e a série B11 do Luan) usam como contrato.

## Visão Geral

O CRM trabalha com dois funis de vendas e dois times padrão com os mesmos nomes:
**Expansão** (prospecção de lojistas novos) e **Retenção** (cliente que já comprou
e precisa recomprar). A empresa decidiu que esses nomes passam a ser **Entrada** e
**Recompra**, em todo o sistema e com um padrão único:

| Antes | Depois | Nome interno antes | Nome interno depois |
|---|---|---|---|
| Expansão | **Entrada** | `expansao` | `entrada` |
| Retenção | **Recompra** | `retencao` | `recompra` |

"Em todo o sistema" quer dizer três camadas, todas nesta mudança:

1. **O que a pessoa lê na tela** — títulos dos funis, abas, painel do card, perfil
   do contato, dashboard, automações, sequências.
2. **Dados já gravados** — os times padrão de cada empresa e qualquer registro
   que guarde o nome do funil.
3. **Nome interno** — o valor que identifica o funil de cada card, as configurações
   de automação que apontam para um funil, o endereço da página do segundo funil e
   os nomes usados no código e nos testes.

Para quem é: todos os usuários de todas as empresas (Admin, Gerente, Atendente).
Ninguém precisa fazer nada — a troca acontece sozinha e nenhum dado se perde.

### Padrão de escrita

- Nome do funil sozinho, com inicial maiúscula: **Entrada**, **Recompra**.
- Com a palavra funil: **Funil de Entrada**, **Funil de Recompra**.
- Nome do time padrão: **Entrada**, **Recompra**.
- No meio de frase, minúsculo: "card criado no funil de entrada".
- Nome interno: `entrada` e `recompra`, sem acento, minúsculo.

### O que NÃO muda

- **Política de Privacidade, seção "4. Retenção de dados"**: ali "retenção" é o
  termo jurídico (por quanto tempo os dados são guardados), não o funil. Fica.
- **Etapas dos funis**: continuam com os mesmos nomes e identificadores — inclusive
  "Aguardando Recompra" e "Recompra Realizada", que passam a morar no Funil de
  Recompra. A repetição da palavra é aceita.
- **Seção "Entrada de Leads" do dashboard**: já usa a palavra Entrada; fica igual.
- **Specs e issues arquivadas** (`docs/specs-arquivadas/`, `issues/concluidas_*/`):
  são registro histórico e mantêm os nomes da época.
- **Times criados pelos usuários**: só os dois times padrão são renomeados. Um time
  customizado que alguém tenha chamado de "Expansão" fica como a pessoa deixou.

## Páginas / Módulos

### Funil de Entrada (`/pipeline`)

**Descrição:** o quadro kanban do primeiro funil, hoje chamado Expansão. Continua no
mesmo endereço.

**Componentes:**
- Abas de troca de funil: duas abas, "Entrada" (ativa) e "Recompra".
- Quadro com as colunas das etapas do funil (sem mudança de etapas).
- Painel lateral do card: mostra o nome do funil do card como "Entrada".

**Comportamentos:**
- Ver o funil: ao abrir `/pipeline`, a aba ativa se chama "Entrada" e o quadro mostra
  os mesmos cards que antes apareciam em Expansão.
- Trocar de funil: clicar na aba "Recompra" leva para `/pipeline/recompra`.
- Abrir um card: o painel lateral mostra o funil como "Entrada".
- Mover um card entre etapas: funciona como antes; o histórico do card continua
  registrando as etapas.
- Criar um card: o card novo nasce no funil de entrada (nome interno `entrada`).

### Funil de Recompra (`/pipeline/recompra`)

**Descrição:** o quadro kanban do segundo funil, hoje Retenção em
`/pipeline/retencao`. Passa para um endereço novo.

**Componentes:**
- Abas de troca de funil: "Entrada" e "Recompra" (ativa).
- Quadro com as colunas das etapas do funil (sem mudança de etapas).
- Painel lateral do card: mostra o funil como "Recompra".

**Comportamentos:**
- Ver o funil: ao abrir `/pipeline/recompra`, a aba ativa se chama "Recompra" e o
  quadro mostra os mesmos cards que antes apareciam em Retenção.
- Endereço antigo: quem abrir `/pipeline/retencao` (favorito, link salvo, aba
  antiga) é levado automaticamente para `/pipeline/recompra`, sem tela de erro.
- Trocar de funil: clicar na aba "Entrada" leva para `/pipeline`.
- Abrir um card: o painel lateral mostra o funil como "Recompra".
- Mover um card entre etapas: funciona como antes, inclusive para "Recompra
  Realizada", que continua contando como recompra no dashboard.
- Mensagem de erro de carregamento: quando os cards não carregam, o aviso fala em
  "funil de recompra".

### Perfil do Contato (`/contatos/[id]`)

**Descrição:** o perfil mostra os cards do contato e a linha do tempo.

**Componentes:**
- Bloco de cards do contato: "Funil de Entrada: <etapa>" ou "Funil de Recompra:
  <etapa>".
- Linha do tempo: eventos de card criado/movido citam "Funil de Entrada" ou "Funil
  de Recompra".

**Comportamentos:**
- Ver o card do contato: o texto mostra o nome novo do funil.
- Clicar no card do contato: leva para `/pipeline` (entrada) ou
  `/pipeline/recompra` (recompra).
- Ver a linha do tempo: eventos antigos e novos aparecem com o nome novo do funil
  (o texto é montado na hora de exibir, não fica gravado).
- Classificação do contato (Lead, Ativo, Em risco, Inativo, Perdido): continua
  calculada igual, olhando o funil de recompra onde antes olhava o de retenção.

### Dashboard (`/dashboard` e `/dashboard/performance`)

**Descrição:** métricas do período, por empresa e por vendedor.

**Componentes:**
- Seção "Entrada de Leads": sem mudança.
- Seção "Conversão": sem mudança.
- Seção "Recompra" (hoje "Retenção"): clientes ativos, taxa de recompra, em risco,
  inativos, perdidos, distribuição por etapa.
- Tabela de performance por vendedor: colunas que hoje se referem a retenção passam
  a se referir a recompra, se houver texto visível com o nome antigo.

**Comportamentos:**
- Ver o dashboard: os números são exatamente os mesmos de antes da troca para o
  mesmo período (a troca não altera nenhum cálculo).
- Ver a seção de recompra: o título é "Recompra".
- Ver a performance por vendedor: os mesmos números de antes.

### Central de Alertas (`/alertas`)

**Descrição:** alertas de card parado por tempo na etapa, com regras diferentes por
funil.

**Comportamentos:**
- Receber alertas do funil de entrada: as mesmas regras que valiam para Expansão.
- Receber alertas do funil de recompra: as mesmas regras que valiam para Retenção.
- Ver um alerta: qualquer texto que cite o funil usa o nome novo.

### Automações (`/configuracoes/automacoes`)

**Descrição:** regras gatilho → ação. Várias delas apontam para um funil (card criado
no funil X, mover para etapa do funil X).

**Componentes:**
- Lista de automações: a descrição de cada regra cita "Entrada" ou "Recompra".
- Formulário de criar/editar: a escolha de funil oferece "Entrada" e "Recompra".

**Comportamentos:**
- Ver uma automação que já existia e apontava para Expansão/Retenção: aparece
  apontando para Entrada/Recompra e continua disparando igual.
- Criar uma automação escolhendo um funil: as opções são "Entrada" e "Recompra".
- Editar uma automação existente: o funil já vem selecionado com o nome novo.
- Disparo: uma automação ligada a "card criado no funil de entrada" dispara quando
  um card nasce no funil de entrada, como antes disparava para Expansão.

### Sequências (`/sequencias/[id]`)

**Descrição:** editor de sequência; o gatilho automático cita o funil.

**Comportamentos:**
- Escolher o gatilho da sequência: as opções dizem "card criado em Lead (Entrada)" e
  "card criado em Onboarding (Recompra)".
- Sequências que já existiam (Qualificação, Onboarding): continuam disparando igual.

### Times (`/configuracoes/times`) e Cadastro de empresa (`/cadastro`)

**Descrição:** cada empresa tem dois times padrão, que não podem ser editados nem
excluídos pelos usuários.

**Comportamentos:**
- Ver os times de uma empresa que já existe: os dois times padrão aparecem como
  "Entrada" e "Recompra", com os mesmos membros de antes.
- Cadastrar uma empresa nova: os times padrão já nascem como "Entrada" e "Recompra".
- Tentar editar ou excluir um time padrão: continua bloqueado, como antes.
- Usuário que era do time Expansão: passa a aparecer no time Entrada, sem precisar
  ser adicionado de novo (o mesmo vale para Retenção → Recompra).

### Troca em produção (dados e nome interno)

**Descrição:** o comportamento esperado durante e depois da troca, para quem estiver
usando o sistema no momento em que ela entra no ar.

**Comportamentos:**
- Nenhum card some: todo card que estava em Expansão passa a estar em Entrada, todo
  card de Retenção passa a estar em Recompra, nas mesmas etapas e com o mesmo
  histórico.
- Nenhuma automação quebra: toda configuração salva que apontava para `expansao` ou
  `retencao` passa a apontar para `entrada` ou `recompra`.
- O banco deixa de aceitar os valores antigos: depois da troca, só `entrada` e
  `recompra` são aceitos como funil de um card.
- Janela da troca: a ordem da troca garante que, em nenhum momento, um usuário abra
  um funil e o encontre vazio ou receba erro ao mover/criar card. Se isso não puder
  ser garantido, a troca é feita fora do horário comercial (Brasília) e a Marcelle
  avisa os usuários antes.
- Volta atrás: existe um caminho registrado para voltar aos nomes antigos caso algo
  dê errado logo depois de entrar no ar.

### Código, testes e documentação

**Descrição:** o que não aparece na tela, mas faz parte de "em todo o sistema".

**Comportamentos:**
- Nomes no código: funções, tipos, constantes e componentes que carregam
  Expansao/Retencao no nome passam a carregar Entrada/Recompra (ex.: o componente do
  funil, a lista de etapas, a função que lista os cards). Nenhum nome antigo sobra
  fora de comentários históricos.
- Testes automatizados: unitários, de integração e E2E passam a usar os nomes novos
  e continuam passando.
- Documentação viva: `CLAUDE.md` (descrição do produto e lista de rotas) e os planos
  de teste em `pre-desenvolvimento/testes/` usam os nomes novos.
- Documentação histórica: specs e issues arquivadas não são tocadas.

### Coordenação com a série B11 (Luan)

**Descrição:** o Luan está no meio da série B11 (automações v2) no branch
`b11-automacoes-v2`, que já tem a B11-01 (protótipo) e a spec/issues reescritas, só
lá. O branch usa os nomes antigos em 12 linhas (dados de exemplo do protótipo,
constantes de etapas importadas e textos da spec). Ele está parado desde 01/10 00:45
esperando o teste do protótipo, e a Marcelle já o avisou para não mexer no branch.

**Comportamentos:**
- Depois que a troca entrar na `master`, o branch `b11-automacoes-v2` recebe a
  `master` e passa a usar os nomes novos: protótipo (funis, times, regra de exemplo),
  imports das constantes renomeadas, `spec-automacoes-v2.md`, as issues B11 e o
  registro de decisões.
- O ajuste no branch dele vai em commit próprio, com mensagem que diga o que mudou,
  para ele entender ao voltar.
- O protótipo continua abrindo e funcionando igual no endereço de sempre.
- O Luan é avisado de que pode retomar.

### Acentos das etapas e etiquetas

**Descrição:** o arquivo com as etapas dos funis está com a codificação quebrada
desde o commit `507232c` (12/06/2026), registrado pelo Luan na ata de 30/09. Como a
troca mexe no mesmo arquivo, a Marcelle decidiu (02/10) corrigir junto.

**Comportamentos:**
- Ver as colunas do Funil de Entrada: "Em Qualificação", "Catálogo Enviado", "Em
  Negociação" aparecem com acento certo (hoje aparecem como "Em QualificaÃ§Ã£o" etc.).
- Ver o painel do card e a tela de automações: os mesmos nomes de etapa com acento
  certo.
- Ver etiquetas de exemplo: "Atenção" com acento certo (hoje "AtenÃ§Ã£o").
- Nenhum outro texto acentuado do sistema fica quebrado.

## Fora do escopo

- Renomear etapas dos funis.
- Mudar regras de negócio, cálculos de métricas ou regras de alerta.
- Times customizados criados pelos usuários.
- O repositório do gateway (não conhece funis).
