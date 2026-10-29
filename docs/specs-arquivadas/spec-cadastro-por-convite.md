# Spec: Cadastro por convite

> série: B51
> estado: aprovada em 29/10/2026

## Visão Geral

Hoje qualquer pessoa que abre `/cadastro` cria uma empresa no CRM. A plataforma ainda
está em teste e não foi lançada, então a conta nova passa a depender de um **convite**
gerado por quem cuida da plataforma (Marcelle e Luan).

O convite tem dois formatos:

- **Convite para um e-mail:** o CRM manda um e-mail com o link (pelo Resend, do
  domínio `disparos.atacadoexponencial.com`, já verificado), e só esse e-mail pode
  criar a conta com ele.
- **Link avulso:** sem e-mail, para mandar por WhatsApp ou onde quiser. Qualquer
  e-mail pode criar a conta com ele.

Os dois servem **uma vez só** e valem pelo prazo escolhido na hora de criar.

O cadastro público do Supabase Auth já está desligado na produção desde a B44
(CA-B44-42, conferido pela Marcelle em 28/10/2026). Esta série fecha a outra porta: a
tela `/cadastro` do CRM.

## Páginas / Módulos

### Tela de cadastro (`/cadastro`)

**Descrição:** continua criando a empresa e o Admin dela, mas só a partir de um link
de convite que valha.

**Componentes:**
- Aviso "cadastro por convite": aparece no lugar do formulário quando não há convite
  ou o convite não vale.
- Formulário de cadastro: o mesmo de hoje (empresa, responsável, e-mail, senha,
  confirmação e a conferência de que é uma pessoa).

**Comportamentos:**
- Abrir `/cadastro` sem convite: vê o aviso, sem formulário.
- Abrir com um convite que não vale (vencido, já usado, cancelado ou inventado): vê o
  aviso de convite inválido, sem formulário.
- Abrir com convite para um e-mail: vê o formulário com o e-mail já preenchido e sem
  poder trocá-lo.
- Abrir com link avulso: vê o formulário com o e-mail em branco.
- Cadastrar com convite válido: a empresa nasce e a pessoa entra no CRM, como hoje.
- Abrir de novo um link já usado: vê o aviso de convite inválido.

**Critérios de aceite:**

#### CA-B51-01 — Sem convite não há formulário · prova: automática

- **Dado** um visitante sem login
- **Quando** ele abre `/cadastro` sem link de convite
- **Então** a tela diz que o cadastro é feito por convite e não mostra o formulário

#### CA-B51-02 — Convite que não vale mostra aviso · prova: automática

- **Dado** um convite vencido, um já usado, um cancelado e um código que não existe
- **Quando** o visitante abre `/cadastro` com cada um deles
- **Então** a tela diz que o convite não vale mais e que é preciso pedir outro, e não
  mostra o formulário (a mesma mensagem para os quatro casos)

#### CA-B51-03 — Convite para e-mail trava o e-mail · prova: automática

- **Dado** um convite válido para `ana@exemplo.com`
- **Quando** o visitante abre o link
- **Então** o formulário aparece com `ana@exemplo.com` no campo de e-mail, que não pode
  ser editado

#### CA-B51-04 — Servidor recusa e-mail diferente do convite · prova: automática

- **Dado** um convite válido para `ana@exemplo.com`
- **Quando** alguém envia o cadastro com esse convite e o e-mail `outro@exemplo.com`
  (mesmo contornando a tela)
- **Então** nenhuma conta nem empresa é criada, e o convite continua valendo

#### CA-B51-05 — Link avulso aceita qualquer e-mail · prova: automática

- **Dado** um link avulso válido
- **Quando** o visitante preenche o formulário com o e-mail dele e envia
- **Então** a empresa e o Admin são criados, e a pessoa entra no CRM

#### CA-B51-06 — Convite serve uma vez só · prova: automática

- **Dado** um convite que acabou de ser usado num cadastro
- **Quando** alguém tenta cadastrar outra empresa com o mesmo convite
- **Então** o cadastro é recusado e nenhuma conta nova é criada

#### CA-B51-07 — Dois cadastros ao mesmo tempo com o mesmo convite · prova: automática

- **Dado** um convite válido
- **Quando** dois cadastros com ele chegam ao mesmo tempo
- **Então** só um cria empresa; o outro é recusado e não deixa usuário solto no Auth

#### CA-B51-08 — Cadastro sem convite recusado no servidor · prova: automática

- **Dado** alguém que chama a ação de cadastro direto, sem convite ou com convite
  inventado
- **Quando** ela é executada
- **Então** nenhuma conta nem empresa é criada

#### CA-B51-09 — Falha no cadastro não gasta o convite · prova: automática

- **Dado** um link avulso válido
- **Quando** o cadastro falha porque o e-mail já tem conta
- **Então** a tela avisa que o e-mail está em uso e o link continua valendo para outra
  tentativa

#### CA-B51-10 — Proteções de hoje continuam · prova: automática

- **Dado** um convite válido
- **Quando** o cadastro chega sem a conferência de que é uma pessoa, ou depois de
  passar do limite de cadastros por hora
- **Então** é recusado como hoje, e o convite continua valendo

### Tela de convites da plataforma (`/plataforma/convites`)

**Descrição:** onde Marcelle e Luan criam, acompanham e cancelam convites. Nenhuma
outra pessoa a vê, nem Admin de empresa.

**Componentes:**
- Formulário "novo convite": e-mail (opcional) e validade (1 dia, 7 dias, 30 dias ou
  data e hora personalizadas).
- Caixa do link criado: mostra o link do convite que acabou de ser criado, com botão
  de copiar.
- Lista de convites: e-mail ou "link avulso", quem criou, quando, até quando vale e a
  situação (pendente, usado, vencido ou cancelado). Os usados mostram a empresa que
  nasceu deles.

**Comportamentos:**
- Criar convite para um e-mail: o CRM manda o e-mail e mostra o link para copiar.
- Criar link avulso: o CRM mostra o link para copiar e não manda e-mail.
- Escolher a validade: 7 dias já vem marcado; dá para trocar por 1 ou 30 dias ou por
  uma data e hora de até 90 dias à frente.
- Copiar o link: só logo depois de criar (o CRM não guarda o link, só uma marca dele).
- Gerar link novo para um convite pendente: o link anterior para de funcionar, o novo
  aparece para copiar e, se o convite tem e-mail, o e-mail é enviado de novo.
- Cancelar um convite pendente: o link para de funcionar na hora.
- Ver a lista, com os mais recentes em cima.
- Chegar à tela pelo menu lateral: o item "Convites" só aparece para Marcelle e Luan.

**Critérios de aceite:**

#### CA-B51-11 — Só a plataforma vê a tela · prova: automática

- **Dado** os usuários `marcelle@seteads.com` e `luan@seteads.com`, um Admin de outra
  empresa e um visitante sem login
- **Quando** cada um abre `/plataforma/convites`
- **Então** Marcelle e Luan veem a tela; o Admin vê "página não encontrada"; o visitante
  vai para o login

#### CA-B51-23 — Item no menu só para a plataforma · prova: automática

- **Dado** Marcelle logada e um Admin de empresa logado
- **Quando** cada um abre o CRM
- **Então** o menu lateral da Marcelle tem o item "Convites", que leva a
  `/plataforma/convites`; o do Admin não tem

#### CA-B51-12 — Só a plataforma cria e cancela convite · prova: automática

- **Dado** um Admin de empresa logado
- **Quando** ele chama direto as ações de criar, gerar link novo ou cancelar convite
- **Então** nada é criado nem mudado

#### CA-B51-13 — Convite para e-mail manda o e-mail · prova: automática

- **Dado** Marcelle na tela de convites
- **Quando** ela cria um convite para `ana@exemplo.com` com validade de 7 dias
- **Então** um e-mail sai para `ana@exemplo.com` com o link do convite, o link aparece
  para copiar, e a lista mostra o convite pendente, vencendo daqui a 7 dias

#### CA-B51-14 — Link avulso não manda e-mail · prova: automática

- **Dado** Luan na tela de convites
- **Quando** ele cria um convite sem e-mail
- **Então** nenhum e-mail é enviado, o link aparece para copiar e a lista mostra
  "link avulso" pendente

#### CA-B51-15 — Validade personalizada · prova: automática

- **Dado** Marcelle criando um convite
- **Quando** ela escolhe uma data e hora futuras
- **Então** o convite vale até esse momento e para de valer depois dele

#### CA-B51-16 — Validade fora do prazo recusada · prova: automática

- **Dado** Marcelle criando um convite
- **Quando** ela escolhe uma data e hora que já passaram, ou mais de 90 dias à frente
- **Então** a tela avisa que a validade precisa estar entre agora e 90 dias, e nenhum
  convite é criado (o servidor recusa também quando a tela é contornada)

#### CA-B51-17 — E-mail que já tem conta · prova: automática

- **Dado** um e-mail que já tem conta no CRM
- **Quando** Marcelle tenta criar um convite para ele
- **Então** a tela avisa que esse e-mail já tem conta e nenhum convite é criado

#### CA-B51-18 — E-mail que não saiu · prova: automática

- **Dado** o envio de e-mail fora do ar
- **Quando** Marcelle cria um convite para um e-mail
- **Então** o convite é criado, a tela avisa que o e-mail não saiu e mostra o link para
  ela mandar por outro meio

#### CA-B51-19 — Cancelar convite · prova: automática

- **Dado** um convite pendente
- **Quando** Luan o cancela
- **Então** a lista mostra "cancelado" e o link dele cai no aviso de convite inválido
  (CA-B51-02)

#### CA-B51-20 — Gerar link novo · prova: automática

- **Dado** um convite pendente para um e-mail
- **Quando** Marcelle gera um link novo para ele
- **Então** o link anterior cai no aviso de convite inválido, o novo abre o formulário,
  e o e-mail é enviado de novo com o link novo

#### CA-B51-21 — Lista mostra a situação de cada convite · prova: automática

- **Dado** um convite pendente, um usado, um vencido e um cancelado
- **Quando** Marcelle abre a tela
- **Então** cada um aparece com a situação certa, e o usado mostra o nome da empresa
  criada

### E-mail do convite

**Descrição:** a mensagem que chega a quem foi convidado.

**Comportamentos:**
- Receber o e-mail: diz que a pessoa foi convidada a criar a conta da empresa no
  crmatacado exp, traz um botão para o cadastro e diz até quando o convite vale.

**Critérios de aceite:**

#### CA-B51-22 — E-mail chega e abre o cadastro · prova: manual

- **Dado** um convite criado na produção para um e-mail do Luan
- **Quando** o Luan abre a caixa de entrada
- **Então** o e-mail chegou na caixa de entrada (não no spam), com o remetente e o
  texto combinados (remetente "crmatacado exp" <convite@disparos.atacadoexponencial.com>), e o botão abre `/cadastro` com o e-mail já preenchido

## Fora de escopo

- O botão "Criar conta" da landing continua como está. O destino novo depende de uma
  conversa entre Luan e Marcelle.
- Convidar usuários para dentro de uma empresa: o Admin já cria usuários em
  Configurações → Usuários.
- Contas e empresas que já existem: nada muda para elas.
- Outros e-mails do sistema (recuperar senha, avisos): ficam para outra série.
- Desligar o cadastro público do Supabase Auth: já feito na B44.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B51-01 | Os quatro casos de convite que não vale (vencido, usado, cancelado, inventado) mostram a mesma mensagem, para não dizer a quem tem um link alheio o que aconteceu com ele | confirmada | Mesma mensagem (Luan, 29/10/2026) |
| SUP-B51-02 | O link só aparece para copiar logo depois de criado; para mandar de novo, gera-se um link novo e o anterior para de funcionar | confirmada | Sim, link novo a cada reenvio (Luan, 29/10/2026) |
| SUP-B51-03 | A tela de convites tem um item no menu, que só Marcelle e Luan veem | confirmada | Sim, item só para os dois (Luan, 29/10/2026); CA-B51-23 |
| SUP-B51-04 | O banco de teste também usa o cadastro por convite, com os mesmos dois e-mails da plataforma, e os testes automáticos não mandam e-mail de verdade | confirmada | Sim, o banco de teste também exige convite (Luan, 29/10/2026) |
| SUP-B51-05 | Gerar link novo para um convite pendente mantém a validade dele; para prorrogar, cria-se outro convite | confirmada | Mantém a validade (Luan, 29/10/2026) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B51-01 | Os dois formatos de convite (para um e-mail e link avulso) existem? | respondida | Sim, os dois (Luan, 29/10/2026) |
| PER-B51-02 | Qual é a validade do convite? | respondida | Escolhida na hora de criar, com opção personalizada (Luan, 29/10/2026) |
| PER-B51-03 | Quem gera convites? | respondida | `marcelle@seteads.com` e `luan@seteads.com` (Luan, 29/10/2026) |
| PER-B51-04 | O botão da landing muda nesta série? | respondida | Não; depende de conversa com a Marcelle (Luan, 29/10/2026) |
| PER-B51-05 | Existe uma validade máxima para a data personalizada? | respondida | Até 90 dias (Luan, 29/10/2026); CA-B51-16 |
| PER-B51-06 | Qual é o remetente do e-mail (nome e endereço)? | respondida | "crmatacado exp" <convite@disparos.atacadoexponencial.com> (Luan, 29/10/2026) |
