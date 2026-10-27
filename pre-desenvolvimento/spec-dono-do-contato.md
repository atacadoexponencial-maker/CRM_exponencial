# Spec: Todo contato nasce com card e tem um dono só

> série: B45
> estado: aprovada em 27/10/2026

## Visão Geral

Hoje, um mesmo atendente aparece com coisas diferentes em cada tela. No teste de 27/10/2026, o Atendente Teste tinha 5 clientes na carteira. A aba RFV mostrava os 5. Em Contatos ele via só o Luan Dias, e a Visão Geral dos Relatórios mostrava zero vendas em outubro. São três regras diferentes para dizer o que é "do atendente":

- **Contatos, perfil e Chat:** o contato é dele se a conversa estiver com ele ou se algum card estiver com ele. A carteira não conta.
- **RFV, Coorte e Carteiras:** o contato é dele se ele for o atendente do contato (a carteira).
- **Visão Geral e Dashboard:** a venda é dele se ele estiver marcado como vendedor da venda.

Além disso, 32 dos 46 contatos da empresa de teste não têm card. O card só nasce quando alguém cria um no funil. Quem chega por mensagem, pela loja ou por "Novo contato" fica sem card.

A mudança deixa uma regra só, decidida pela Marcelle em 27/10/2026: **todo contato nasce com card, e o atendente é dono do que está atribuído a ele**. O contato tem um dono só, que vale para lead e cliente. Atribuir em qualquer lugar (no Chat, no card, na carteira ou por automação) muda junto o dono do contato, os cards dele e as conversas dele. Contato sem dono fica visível para todos os atendentes. É para Admin, Gerente e Atendente de toda empresa.

## Páginas / Módulos

### 1. Todo contato nasce com card

**Descrição:** todo jeito de criar contato cria também o card dele no Funil de Entrada.

**Componentes:**
- Card do Funil de Entrada: nasce na primeira etapa da Entrada, com o dono do contato como atendente. Se o contato não tem dono, o card fica sem atendente.

**Comportamentos:**
- Criar contato em Contatos → Novo contato: o contato nasce com o card.
- Receber a primeira mensagem de um número novo pela API Oficial: o contato nasce com o card.
- Receber a primeira mensagem de um número novo pelo canal direto: o contato nasce com o card.
- Receber um pedido pela loja de um número novo: o contato nasce com o card.
- Criar "Novo lead" no funil: continua como hoje, com um card só.
- Contato que já existe (mensagem nova, pedido novo, contato tirado da lixeira) não ganha outro card.
- Contatos que já existem sem card ganham o card na primeira etapa da Entrada.

**Critérios de aceite:**

#### CA-B45-01 — Novo contato nasce com card na Entrada · prova: automática

- **Dado** a empresa com o Funil de Entrada
- **Quando** o Admin cria o contato "Maria" em Contatos → Novo contato
- **Então** a Maria aparece no Funil de Entrada, na primeira etapa, sem atendente, e o perfil dela mostra esse card

#### CA-B45-02 — Quem manda a primeira mensagem nasce com card · prova: automática

- **Dado** um número que a empresa nunca viu
- **Quando** chega a primeira mensagem dele, pela API Oficial ou pelo canal direto
- **Então** o contato novo tem um card na primeira etapa da Entrada, sem atendente

#### CA-B45-03 — Pedido da loja de número novo nasce com card · prova: automática

- **Dado** um número que a empresa nunca viu
- **Quando** ele faz um pedido pela loja
- **Então** o contato novo tem um card na primeira etapa da Entrada, sem atendente

#### CA-B45-04 — Contato que já existe não ganha card repetido · prova: automática

- **Dado** o contato "Ana", com o card dela na Entrada
- **Quando** a Ana manda outra mensagem, faz um pedido pela loja, ou sai da lixeira
- **Então** a Ana continua com um card só na Entrada

#### CA-B45-05 — Contatos antigos sem card ganham card · prova: automática

- **Dado** contatos que hoje não têm card nenhum, alguns com dono e outros sem
- **Quando** a mudança entra no ar
- **Então** cada um tem um card na primeira etapa da Entrada, com o dono do contato como atendente (sem atendente quando o contato não tem dono), e os contatos que já tinham card não ganham outro

### 2. Um dono só para contato, cards e conversas

**Descrição:** o dono do contato (a carteira) é o mesmo atendente dos cards e das conversas desse contato. Atribuir em qualquer lugar muda os três juntos, e a troca entra no histórico de carteira.

**Componentes:**
- Atribuir e transferir no Chat, atendente do card no funil, Carteiras nos Relatórios (transferir e distribuir) e ação de automação "atribuir atendente": as telas e ações não mudam, só o alcance delas.
- Histórico de carteira (Relatórios → Carteiras): registra a troca de dono feita pelo Chat, como já registra as outras.

**Comportamentos:**
- Atribuir a conversa no Chat a um atendente.
- Transferir a conversa no Chat para um colega.
- Atribuir o atendente num card do funil.
- Transferir, distribuir ou remover carteira em Relatórios → Carteiras.
- Atribuir atendente por automação.
- Alinhar os contatos que hoje têm dono num lugar e outro atendente em outro.

**Critérios de aceite:**

#### CA-B45-06 — Atribuir a conversa no Chat faz do atendente o dono do contato · prova: automática

- **Dado** o contato "Luan", sem dono, com um card na Entrada e um na Recompra, e a conversa sem responsável
- **Quando** o Admin atribui a conversa ao Atendente Teste no Chat
- **Então** o Luan passa a ser do Atendente Teste: o perfil mostra o Atendente Teste como atendente, os dois cards mostram o mesmo atendente, e o histórico de carteira registra a troca

#### CA-B45-07 — Transferir a conversa leva o contato junto · prova: automática

- **Dado** o contato "Luan", do Atendente Teste, com a conversa com ele
- **Quando** o Atendente Teste transfere a conversa para o colega Bruno
- **Então** o Luan, os cards dele e a conversa passam a ser do Bruno, e o histórico de carteira registra a troca

#### CA-B45-08 — Atribuir no card leva os outros cards e a conversa junto · prova: automática

- **Dado** o contato "Ana", com um card na Entrada, um na Recompra e a conversa com o Bruno
- **Quando** o Admin escolhe o Atendente Teste como atendente do card da Entrada
- **Então** a Ana, o card da Recompra e a conversa passam a ser do Atendente Teste

#### CA-B45-09 — Mudar a carteira leva os cards e as conversas junto · prova: automática

- **Dado** a Ana e o Luan, do Bruno, cada um com card e conversa com o Bruno
- **Quando** o Admin transfere a carteira do Bruno para o Atendente Teste em Relatórios → Carteiras
- **Então** os cards e as conversas da Ana e do Luan passam a ser do Atendente Teste; e quando o Admin remove a Ana da carteira, ela, os cards e a conversa dela ficam sem dono

#### CA-B45-10 — Automação que atribui atendente leva a conversa junto · prova: automática

- **Dado** uma automação com a ação "atribuir atendente: Atendente Teste" e o contato "Ana", com a conversa com o Bruno
- **Quando** a automação roda para a Ana
- **Então** a Ana, os cards dela e a conversa passam a ser do Atendente Teste

#### CA-B45-11 — Contatos antigos ficam com um dono só · prova: automática

- **Dado** o contato "Luan", sem dono, com a conversa com o Atendente Teste, e o contato "Ana", do Bruno, com a conversa com o Atendente Teste
- **Quando** a mudança entra no ar
- **Então** o Luan passa a ser do Atendente Teste, e a conversa da Ana passa para o Bruno, que é o dono dela

### 3. O que o atendente vê

**Descrição:** o atendente vê os contatos dele e os sem dono, e não vê os dos colegas. A regra vale em Contatos, no perfil, no Chat e em tudo o que pertence ao contato (tags, compras, notas, campos personalizados). Admin e Gerente seguem vendo a empresa toda.

**Componentes:**
- Lista de Contatos, perfil do contato e Chat do Atendente: mesmas telas, outra regra de quem aparece.

**Comportamentos:**
- O atendente abre Contatos.
- O atendente abre o perfil de um contato.
- O atendente abre o Chat.
- O atendente responde uma conversa sem responsável: ele vira o dono da conversa, do contato e dos cards.
- O atendente tenta atribuir a si um contato sem dono pelos botões de atribuir.

**Critérios de aceite:**

#### CA-B45-12 — Atendente vê em Contatos os dele e os sem dono · prova: automática

- **Dado** o Atendente Teste dono da Ana e do Luan, o Bruno dono da Carla, e o contato "Davi" sem dono
- **Quando** o Atendente Teste abre Contatos
- **Então** a lista tem a Ana, o Luan e o Davi, e não tem a Carla

#### CA-B45-13 — Atendente não abre o contato de colega · prova: automática

- **Dado** a Carla, do Bruno
- **Quando** o Atendente Teste tenta abrir o perfil da Carla pelo endereço ou ler as tags, compras e notas dela
- **Então** o perfil não abre (contato não encontrado) e nada da Carla é devolvido

#### CA-B45-14 — Atendente vê no Chat as conversas dele e as sem responsável · prova: automática

- **Dado** a conversa da Ana com o Atendente Teste, a da Carla com o Bruno e a do Davi sem responsável
- **Quando** o Atendente Teste abre o Chat
- **Então** a caixa de entrada tem a conversa da Ana e a do Davi, e não tem a da Carla

#### CA-B45-20 — Atendente que responde conversa sem responsável vira o dono · prova: automática

- **Dado** o Davi, sem dono, com a conversa sem responsável e um card na Entrada sem atendente
- **Quando** o Atendente Teste manda uma mensagem na conversa do Davi
- **Então** a conversa, o Davi e o card dele passam a ser do Atendente Teste, o histórico de carteira registra a troca, e a conversa some do Chat dos outros atendentes

#### CA-B45-15 — Atribuir pelos botões continua só com Admin e Gerente · prova: automática

- **Dado** o Davi, sem dono, com a conversa sem responsável
- **Quando** o Atendente Teste tenta atribuir a conversa ou o card do Davi a si mesmo
- **Então** a tela recusa ("Sem permissão") e o Davi continua sem dono

### 4. Relatórios e Dashboard

**Descrição:** as vendas do atendente passam a ser as vendas dos clientes da carteira dele, qualquer que seja o vendedor registrado na venda. Vale para a Visão Geral, Coorte, Funil de clientes e Dashboard, para o Atendente e para o Admin que filtra por atendente.

**Comportamentos:**
- O Atendente abre a Visão Geral, a Coorte, o Funil de clientes e o Dashboard.
- O Admin filtra os Relatórios e o Dashboard por um atendente.

**Critérios de aceite:**

#### CA-B45-16 — Visão Geral do atendente soma as vendas dos clientes dele · prova: automática

- **Dado** a Ana, do Atendente Teste, com uma venda de R$ 500 em outubro registrada com o Admin como vendedor, e a Carla, do Bruno, com uma venda de R$ 300 registrada com o Atendente Teste como vendedor
- **Quando** o Atendente Teste abre Relatórios → Visão Geral em outubro
- **Então** o faturamento é R$ 500 e a tabela de vendas mostra só a venda da Ana

#### CA-B45-17 — Admin filtrando por atendente vê o mesmo número · prova: automática

- **Dado** as mesmas vendas do critério anterior
- **Quando** o Admin abre a Visão Geral, a Coorte e o Funil de clientes filtrados pelo Atendente Teste
- **Então** os números são os mesmos que o Atendente Teste vê nas próprias telas

#### CA-B45-18 — Dashboard do atendente usa a mesma regra · prova: automática

- **Dado** as mesmas vendas
- **Quando** o Atendente Teste abre o Dashboard
- **Então** as vendas e o faturamento contam a venda da Ana e não a da Carla

### 5. Aprovação

#### CA-B45-19 — Telas do atendente coerentes em produção · prova: manual

- **Dado** a empresa "[TESTE] Automações B11" em produção, depois da mudança
- **Quando** a Marcelle entra como o Atendente Teste e abre Contatos, um perfil, o Chat, Relatórios (Visão Geral, RFV, Coorte, Funil de clientes) e o Dashboard
- **Então** os 5 clientes da carteira dele aparecem em Contatos, junto com o Luan e os sem dono; o RFV mostra os mesmos 5; a Visão Geral mostra as vendas deles; e todo contato aberto tem card na Entrada

## Fora de escopo

- Começar conversa pelo CRM com quem ainda não tem conversa. Fica para uma spec própria.
- O botão "Abrir conversa" do perfil de contato sem conversa (decisão de 27/10/2026: vai junto com a spec de começar conversa).
- O botão "Pegar para mim" (decisão de 27/10/2026). O atendente só vira dono de contato sem dono ao responder a conversa (CA-B45-20).
- Card do contato novo em outro funil ou etapa conforme a origem. Todos nascem na primeira etapa da Entrada.
- Importar contatos por planilha. Ainda não existe; quando existir, o contato importado nasce com card como os outros.
- Mudar quem é o vendedor registrado na venda. Ele continua gravado e aparece na tabela de vendas; só deixa de decidir de quem é a venda.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B45-01 | Nos contatos que hoje têm dono num lugar e outro atendente na conversa, vale o dono do contato (a carteira), e a conversa passa para ele (CA-B45-11). Contato sem dono que tem conversa com alguém passa a ser de quem está na conversa | confirmada | Marcelle, 27/10/2026 ("pode ser, são só testes") |
| SUP-B45-02 | Os contatos antigos sem card ganham o card na primeira etapa da Entrada, mesmo os que já compraram (CA-B45-05) | confirmada | Marcelle, 27/10/2026 ("tanto faz, são testes") |
| SUP-B45-03 | O Dashboard segue a mesma regra de vendas da Visão Geral (CA-B45-18) | confirmada | Marcelle, 27/10/2026 |
| SUP-B45-04 | Só o Atendente vira dono ao responder conversa sem responsável. Admin e Gerente que respondem não mudam o dono (CA-B45-20) | confirmada | Marcelle, 27/10/2026 ("não vira dono") |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B45-01 | O que é o dono do contato? | respondida | Um dono só para lead e cliente (a carteira), e "o atendente é dono do que está atribuído a ele". Marcelle, 27/10/2026 |
| PER-B45-02 | Atribuir ou transferir a conversa no Chat muda o dono do contato? | respondida | Sim, tudo junto: conversa, cards e dono do contato. Marcelle, 27/10/2026 |
| PER-B45-03 | Em qual funil e etapa nasce o card do contato novo? | respondida | Primeira etapa da Entrada. Marcelle, 27/10/2026 |
| PER-B45-04 | O atendente vê contato sem dono? | respondida | Sim, em Contatos e no Chat. Marcelle, 27/10/2026 |
| PER-B45-05 | O atendente pode pegar para si um contato sem dono? | respondida | Não pelos botões de atribuir, que ficam com Admin e Gerente; responder a conversa sem responsável faz dele o dono (PER-B45-07). Marcelle, 27/10/2026 |
| PER-B45-06 | As vendas do atendente nos Relatórios são as dos clientes dele ou as que ele registrou? | respondida | As dos clientes da carteira dele. Marcelle, 27/10/2026 |
| PER-B45-07 | O atendente que responde uma conversa sem responsável vira o dono dela e do contato? Se sim, ele "pega para si" ao responder, o que esbarra na PER-B45-05. Se não, o contato segue sem dono até o Admin ou o Gerente atribuir | respondida | Sim, vira dono: da conversa, do contato e dos cards (CA-B45-20). Os botões de atribuir seguem só com Admin e Gerente. Marcelle, 27/10/2026 |
| PER-B45-08 | O card que nasce sozinho com o contato novo dispara as automações de "card entrou na etapa", como o "Novo lead"? | respondida | Sim, dispara o "card movido" e a reclassificação, como o Novo lead. Marcelle, 27/10/2026 |
| PER-B45-09 | Os cards criados de uma vez para os contatos antigos sem card (CA-B45-05) disparam automações? | respondida | Não disparam: é arrumação da base, não chegada de lead. Marcelle, 27/10/2026 |
