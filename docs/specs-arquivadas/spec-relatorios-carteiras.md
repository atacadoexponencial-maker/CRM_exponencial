# Spec: Relatórios — Carteiras

> série: B35
> estado: aprovada em 21/10/2026

## Visão Geral

A tela Relatórios ganha a última aba do modelo Tailor, **Carteiras**: o retrato de como
os clientes estão divididos entre os vendedores e as ações para arrumar essa divisão. A
carteira de um vendedor é o conjunto de contatos cujo **atendente do contato** é ele,
o mesmo campo que o card do funil já preenche (decisão da Marcelle em 21/10/2026).

A aba mostra a visão geral da empresa (leads, base, ativos e inativos, no total, com
carteira e sem carteira), a carteira de cada vendedor com os mesmos números, quem está
sem vendedor, e um histórico de toda mudança de carteira. As ações são quatro:
**transferir** a carteira inteira de um vendedor para outro, **remover** a carteira de um
vendedor, **distribuir** os contatos sem vendedor entre vendedores escolhidos, e
**reprocessar pela última venda** (quem não tem dono passa a ser do atendente da última
venda dele). Toda ação é confirmada antes, grava no histórico e mantém os cards do
contato em sincronia.

É para o Admin e o Gerente, que organizam a equipe. O Atendente vê só a própria carteira,
sem botões. Resolve o problema de o CRM não mostrar quantos clientes estão sem dono nem
permitir redistribuir uma carteira quando alguém sai ou entra na equipe.

Decisões da Marcelle em 21/10/2026:

- carteira = atendente do contato, em sincronia com o atendente dos cards dele;
- esta série traz o painel, as ações manuais e o histórico; a regra automática pela última
  venda e o rodízio por conversa ficam para depois;
- todos veem a aba; o Atendente só a própria carteira;
- Leads = contatos sem compra; Base = com compra; Ativos = card da Recompra em
  Onboarding, Reposição ou Ativos; Inativos = base menos ativos.

### Vocabulário

| Termo | Significado no CRM |
|---|---|
| Vendedor | Usuário ativo da empresa (Admin, Gerente ou Atendente) |
| Carteira de um vendedor | Contatos fora da lixeira cujo atendente do contato é ele |
| Sem vendedor | Contatos fora da lixeira sem atendente do contato |
| Lead | Contato sem nenhuma venda |
| Base | Contato com ao menos uma venda |
| Ativo | Contato da base com card da Recompra em Onboarding, Reposição ou Ativos |
| Inativo | Contato da base que não é ativo |
| Sincronia | Mudar a carteira muda o atendente do contato e de todos os cards dele; conversas não mudam |
| Histórico | Uma linha por contato e por mudança: quem fez, quando, de quem, para quem e o motivo (transferência, remoção, distribuição, última venda, manual pelo card) |

## Páginas / Módulos

### Aba Carteiras

**Descrição:** a aba "Carteiras" deixa de ser "em breve". Sem filtro de período nem de
atendente: a aba já é por vendedor.

**Componentes:**
- "Visão geral da empresa": três linhas (Total, Com carteira, Sem carteira) × quatro números (Leads, Base, Ativos, Inativos).
- "Carteira por vendedor": um cartão por vendedor com o nome, "N na carteira", os quatro números e os botões Transferir carteira e Remover da carteira.
- "Sem vendedor": a contagem ("189 contatos sem vendedor · 13 com compra · 176 leads") e os botões Distribuir entre vendedores e Reprocessar pela última venda.
- "Histórico de alterações": as 50 mudanças mais recentes (data e hora, contato, de, para, motivo, quem fez) e o botão Atualizar.

**Comportamentos:**
- Clicar na aba mostra os quatro blocos, calculados na hora.
- O Atendente vê só o cartão da própria carteira, sem botões, sem a visão geral, sem o bloco de sem vendedor e sem o histórico.

**Critérios de aceite:**

#### CA-B35-01 — A aba Carteiras abre o painel · prova: automática

- **Dado** a tela Relatórios aberta por um Admin
- **Quando** ele clica na aba "Carteiras"
- **Então** a aba fica selecionada e aparecem a visão geral, a carteira por vendedor, o bloco de sem vendedor e o histórico

#### CA-B35-02 — Os números da visão geral · prova: automática

- **Dado** 3 leads e 4 clientes com compra, dos quais 1 é ativo; 5 deles têm vendedor (2 leads, 3 da base, o ativo entre eles) e 2 não (1 lead, 1 da base)
- **Quando** a visão geral é calculada
- **Então** Total: leads 3, base 4, ativos 1, inativos 3; Com carteira: 2, 3, 1, 2; Sem carteira: 1, 1, 0, 1

#### CA-B35-03 — Carteira por vendedor · prova: automática

- **Dado** a Ana com 2 leads e 3 da base (1 ativo) e o Bruno sem contato
- **Quando** os cartões são calculados
- **Então** a Ana mostra "5 na carteira", leads 2, base 3, ativos 1, inativos 2, e o Bruno mostra "0 na carteira" com zeros

#### CA-B35-04 — Atendente vê só a própria carteira, sem botões · prova: automática

- **Dado** a Ana com papel Atendente
- **Quando** ela abre a aba Carteiras
- **Então** vê só o cartão dela, sem Transferir, Remover, Distribuir, Reprocessar nem histórico; e as ações chamadas por ela no servidor são recusadas com "Sem permissão"

### Transferir e remover carteira

**Descrição:** no cartão do vendedor, "Transferir carteira" abre um diálogo para escolher o
vendedor de destino e confirma com a quantidade ("Transferir 593 contatos da Vilma para
a Marcela?"); "Remover da carteira" confirma ("Deixar 593 contatos da Vilma sem
vendedor?"). As duas gravam no histórico e sincronizam os cards.

**Critérios de aceite:**

#### CA-B35-05 — Transferir a carteira inteira · prova: automática

- **Dado** a Ana com 3 contatos (um deles com card na Recompra) e o Bruno com 1
- **Quando** o Admin transfere a carteira da Ana para o Bruno e confirma
- **Então** os 3 contatos e o card passam a ter o Bruno como atendente, a Ana fica com 0 e o Bruno com 4, e o histórico ganha 3 linhas "Ana → Bruno · transferência · Admin"

#### CA-B35-06 — Remover a carteira · prova: automática

- **Dado** a Ana com 3 contatos
- **Quando** o Admin remove a carteira dela e confirma
- **Então** os 3 contatos e os cards deles ficam sem atendente, "Sem vendedor" sobe em 3 e o histórico ganha 3 linhas "Ana → ninguém · remoção"

#### CA-B35-07 — Confirmação antes da ação em massa · prova: automática

- **Dado** o diálogo de transferir aberto
- **Quando** o Admin fecha sem confirmar
- **Então** nada muda e nada é gravado no histórico

### Distribuir e reprocessar quem está sem vendedor

**Descrição:** "Distribuir entre vendedores" abre um diálogo para marcar os vendedores
que recebem (todos marcados por padrão) e escolher se entram todos os contatos sem
vendedor ou só os com compra; os contatos são divididos em rodízio, um para cada
vendedor marcado, na ordem de cadastro do contato. "Reprocessar pela última venda" dá a
cada contato sem vendedor o atendente da última venda dele, quando houver; os demais
continuam sem vendedor.

**Critérios de aceite:**

#### CA-B35-08 — Distribuir em rodízio · prova: automática

- **Dado** 5 contatos sem vendedor (3 com compra, 2 leads) e os vendedores Ana e Bruno marcados
- **Quando** o Admin distribui "todos" e confirma
- **Então** a Ana recebe 3 e o Bruno 2 (ou o contrário, pela ordem de cadastro), nenhum contato que já tinha dono muda, e o histórico ganha 5 linhas "ninguém → Ana/Bruno · distribuição"

#### CA-B35-09 — Distribuir só os com compra · prova: automática

- **Dado** os mesmos 5 contatos
- **Quando** o Admin distribui "só com compra"
- **Então** só os 3 com compra ganham vendedor e os 2 leads continuam sem

#### CA-B35-10 — Reprocessar pela última venda · prova: automática

- **Dado** 3 contatos sem vendedor: um com última venda do Bruno, um com vendas sem atendente e um lead
- **Quando** o Admin reprocessa e confirma
- **Então** só o primeiro passa a ser do Bruno (cards incluídos), os outros dois continuam sem vendedor, e o histórico ganha 1 linha "ninguém → Bruno · última venda"

### Histórico de alterações

**Critérios de aceite:**

#### CA-B35-11 — O histórico registra toda mudança de carteira · prova: automática

- **Dado** uma transferência feita pelo Admin às 14h03
- **Quando** o histórico é consultado
- **Então** mostra a linha com data e hora, o nome do contato, "Ana → Bruno", "transferência" e "Admin", as mais recentes primeiro, no máximo 50

#### CA-B35-12 — Atribuir pelo card também entra no histórico · prova: automática

- **Dado** um contato sem vendedor
- **Quando** a Ana recebe o card dele no funil (ação "Atribuir" do card ou automação)
- **Então** o histórico ganha "ninguém → Ana · pelo card"

### Aprovação visual

#### CA-B35-13 — A aba Carteiras aprovada pela Marcelle em produção · prova: manual

- **Dado** a empresa "[TESTE] Automações B11"
- **Quando** a Marcelle abre a aba Carteiras, transfere uma carteira, desfaz transferindo de volta e distribui os sem vendedor
- **Então** os números acompanham, o histórico registra cada passo e tudo é legível no tema escuro, no computador e no celular

## Fora de escopo

- Regra automática "pela última venda" para os próximos clientes (interruptor) e "recebe clientes novos" por vendedor.
- Lista da vez / rodízio por conversa nova no chat.
- Adicionar clientes a uma carteira um a um por esta tela (já existe pelo card do funil).
- Incluir vendedor (é em Configurações → Usuários).
- Automações de carteira por inatividade.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B35-01 | "Vendedor" é qualquer usuário ativo da empresa, inclusive Admin e Gerente, porque a venda já pode ter qualquer um deles como atendente. | confirmada | Marcelle, 21/10/2026 |
| SUP-B35-02 | Transferir, remover, distribuir e reprocessar mexem no atendente do contato e dos cards dele; a conversa aberta fica com quem está atendendo. | confirmada | Marcelle, 21/10/2026 |
| SUP-B35-03 | Distribuir usa rodízio simples na ordem de cadastro do contato, sem tentar igualar carteiras que já existem. | confirmada | Marcelle, 21/10/2026 |
| SUP-B35-04 | O histórico guarda todas as mudanças numa tabela nova e a aba mostra as 50 mais recentes; sem exportação. | confirmada | Marcelle, 21/10/2026 |
| SUP-B35-05 | Atribuir atendente pelo card do funil (tela ou automação) passa a gravar no histórico com o motivo "pelo card". | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|

Nenhuma.
