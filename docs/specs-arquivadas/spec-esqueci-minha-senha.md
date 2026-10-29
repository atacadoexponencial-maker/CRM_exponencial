# Spec: Esqueci minha senha

> série: B52
> estado: aprovada em 29/10/2026

## Visão Geral

Hoje quem esquece a senha do CRM não tem saída: não existe recuperação, e o Admin só
define senha ao criar um usuário novo. Em 29/10/2026 o próprio Luan precisou de uma
senha provisória gravada por script.

Esta mudança põe "Esqueci minha senha" no login. A pessoa digita o e-mail e recebe um
link (pelo Resend, do domínio `disparos.atacadoexponencial.com`, como os convites da B51)
que vale por 1 hora e serve uma vez. Pelo link ela cria uma senha nova, entra direto no
CRM e as outras sessões abertas daquela conta são encerradas.

Vale para todo mundo que tem conta: clientes (Admin, Gerente, Atendente) e a plataforma.

## Páginas / Módulos

### Tela de login (`/login`)

**Descrição:** a de hoje, com um link a mais.

**Componentes:**
- Link "Esqueci minha senha", perto do campo de senha.

**Comportamentos:**
- Clicar em "Esqueci minha senha": abre a tela de pedir o link.

**Critérios de aceite:**

#### CA-B52-01 — Link no login · prova: automática

- **Dado** a tela de login
- **Quando** a pessoa olha o formulário
- **Então** há o link "Esqueci minha senha", que leva a `/esqueci-minha-senha`

### Pedir o link (`/esqueci-minha-senha`)

**Descrição:** a pessoa diz o e-mail da conta e pede o link.

**Componentes:**
- Campo de e-mail.
- Conferência de que é uma pessoa (a mesma do cadastro).
- Botão "Enviar link".
- Mensagem de pedido recebido, no lugar do formulário.
- Link "Voltar para o login".

**Comportamentos:**
- Pedir o link com o e-mail de uma conta ativa: o e-mail sai e a tela mostra a mensagem
  de pedido recebido.
- Pedir com um e-mail sem conta ou de conta desativada: a tela mostra a mesma mensagem, e
  nenhum e-mail sai. Quem pede não descobre se o e-mail tem conta.
- Pedir de novo: o link novo sai, e os anteriores daquela conta param de valer.
- Pedir demais: a tela avisa que houve tentativas demais.

**Critérios de aceite:**

#### CA-B52-02 — Conta ativa recebe o link · prova: automática

- **Dado** uma conta ativa com o e-mail `ana@exemplo.com`
- **Quando** alguém pede o link com esse e-mail (em qualquer caixa)
- **Então** sai um e-mail para `ana@exemplo.com` com o link de criar senha nova e a
  validade de 1 hora, e a tela diz que, se o e-mail tiver conta, o link foi enviado

#### CA-B52-03 — E-mail sem conta não revela nada · prova: automática

- **Dado** um e-mail que não tem conta
- **Quando** alguém pede o link com ele
- **Então** a tela mostra a mesma mensagem do CA-B52-02 e nenhum e-mail sai

#### CA-B52-04 — Conta desativada não recebe link · prova: automática

- **Dado** uma conta desativada pelo Admin da empresa
- **Quando** alguém pede o link com o e-mail dela
- **Então** a tela mostra a mesma mensagem do CA-B52-02 e nenhum e-mail sai

#### CA-B52-05 — Pedir de novo derruba o link anterior · prova: automática

- **Dado** uma conta ativa que já pediu um link e ainda não usou
- **Quando** ela pede outro
- **Então** o link novo funciona e o anterior mostra o aviso de link que não vale mais

#### CA-B52-06 — Freio de pedidos · prova: automática

- **Dado** um e-mail que já pediu o link 3 vezes na última hora, ou um endereço de
  internet que já pediu 10 vezes na última hora
- **Quando** chega mais um pedido
- **Então** a tela avisa que houve tentativas demais e nenhum e-mail sai

#### CA-B52-07 — Só pessoa pede o link · prova: automática

- **Dado** um pedido sem a conferência de que é uma pessoa, ou com ela recusada
- **Quando** ele chega ao servidor
- **Então** é recusado como no cadastro, e nenhum e-mail sai

### Criar a senha nova (`/redefinir-senha`)

**Descrição:** aberta pelo link do e-mail.

**Componentes:**
- Campos "Senha nova" e "Confirmação da senha".
- Botão "Salvar senha".
- Aviso de link que não vale mais, no lugar do formulário, com o link para pedir outro.

**Comportamentos:**
- Abrir um link que vale: vê o formulário. Abrir não gasta o link.
- Salvar uma senha válida: a senha muda, a pessoa entra no CRM (Dashboard) e as outras
  sessões daquela conta são encerradas.
- Abrir um link vencido, já usado, derrubado por um pedido novo ou inventado: vê o aviso.
- Salvar com senha curta ou com confirmação diferente: vê o erro e o link continua valendo.

**Critérios de aceite:**

#### CA-B52-08 — Link que vale abre o formulário · prova: automática

- **Dado** um link recém-pedido
- **Quando** a pessoa o abre (duas vezes, como faz um programa de e-mail que confere links)
- **Então** nas duas vezes aparece o formulário de senha nova, e o link continua valendo

#### CA-B52-09 — Senha nova entra direto · prova: automática

- **Dado** um link que vale
- **Quando** a pessoa salva uma senha nova válida
- **Então** a senha antiga para de funcionar, a nova funciona, e ela cai no Dashboard
  já logada

#### CA-B52-10 — Outras sessões encerradas · prova: automática

- **Dado** a conta logada em outro aparelho
- **Quando** a senha é trocada pelo link
- **Então** a sessão do outro aparelho deixa de valer e ele volta ao login

#### CA-B52-11 — Link que não vale mostra aviso · prova: automática

- **Dado** um link vencido (mais de 1 hora), um já usado, um derrubado por pedido novo e
  um inventado
- **Quando** a pessoa abre cada um, ou tenta salvar a senha por ele
- **Então** a tela diz que o link não vale mais e oferece pedir outro, sem formulário, e
  nenhuma senha muda (a mesma mensagem para os quatro casos)

#### CA-B52-12 — Senha inválida não gasta o link · prova: automática

- **Dado** um link que vale
- **Quando** a pessoa salva uma senha com menos de 8 caracteres, ou com a confirmação
  diferente
- **Então** a tela mostra o erro, a senha não muda e o link continua valendo

#### CA-B52-13 — Conta desativada depois do pedido · prova: automática

- **Dado** um link pedido por uma conta que o Admin desativou em seguida
- **Quando** a pessoa tenta salvar a senha nova
- **Então** a senha não muda e a tela mostra o aviso de link que não vale mais

### E-mail de criar senha nova

**Descrição:** a mensagem que chega a quem pediu.

**Comportamentos:**
- Receber o e-mail: diz que alguém pediu para criar uma senha nova no crmatacado exp,
  traz o botão para o link, diz que vale por 1 hora e que, se não foi a pessoa, basta
  ignorar.

**Critérios de aceite:**

#### CA-B52-14 — E-mail chega e abre a tela de senha nova · prova: manual

- **Dado** a B52 no ar
- **Quando** o Luan pede o link para uma conta dele e abre a caixa de entrada
- **Então** o e-mail chegou na caixa de entrada (não no spam), com o remetente e o texto
  combinados, e o botão abre a tela de senha nova; salvando, ele entra no CRM

## Fora de escopo

- Trocar a senha estando logado: já existe em Perfil → Alterar senha.
- O Admin redefinir a senha de alguém da empresa.
- Recuperar a conta por WhatsApp ou SMS.
- Mudar o e-mail da conta.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B52-01 | O freio é de 3 pedidos por e-mail e 10 por endereço de internet, por hora | confirmada | Luan, 29/10/2026 |
| SUP-B52-02 | O remetente é "crmatacado exp" <conta@disparos.atacadoexponencial.com> | confirmada | Luan, 29/10/2026 |
| SUP-B52-03 | Se o envio do e-mail falhar, a tela mostra a mesma mensagem de pedido recebido (dizer que falhou revelaria que o e-mail tem conta) | confirmada | Luan, 29/10/2026 |
| SUP-B52-04 | Quem já está logado e abre `/esqueci-minha-senha` vai para o Dashboard, como acontece hoje no login e no cadastro; `/redefinir-senha` abre mesmo logado | confirmada | Luan, 29/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B52-01 | Por quanto tempo o link vale? | respondida | 1 hora (Luan, 29/10/2026) |
| PER-B52-02 | Depois de criar a senha nova, entra direto ou volta ao login? | respondida | Entra direto no CRM (Luan, 29/10/2026) |
| PER-B52-03 | As outras sessões da conta são encerradas? | respondida | Sim (Luan, 29/10/2026) |
