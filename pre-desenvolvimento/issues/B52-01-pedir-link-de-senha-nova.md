# B52-01: Pedir o link de senha nova

**Tipo:** Implementação
**Página:** `/login` e `/esqueci-minha-senha`
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-esqueci-minha-senha.md`

## Descrição

O login ganha "Esqueci minha senha". A tela nova recebe o e-mail, confere que é uma pessoa e o freio, e manda pelo Resend um link de 1 hora para a conta ativa; para qualquer outro e-mail, a mesma mensagem sem envio.

## Pronto quando

No login, "Esqueci minha senha" abre a tela; pedindo com o e-mail de uma conta ativa, chega o e-mail com o link e a validade; com um e-mail sem conta, a tela diz o mesmo e nada sai.

## Critérios de aceite

- **CA-B52-01** (automática) — Link no login. Dado a tela de login, quando a pessoa olha o formulário, então há o link "Esqueci minha senha", que leva a `/esqueci-minha-senha`.
- **CA-B52-02** (automática) — Conta ativa recebe o link. Dado uma conta ativa com o e-mail `ana@exemplo.com`, quando alguém pede o link com esse e-mail (em qualquer caixa), então sai um e-mail para `ana@exemplo.com` com o link de criar senha nova e a validade de 1 hora, e a tela diz que, se o e-mail tiver conta, o link foi enviado.
- **CA-B52-03** (automática) — E-mail sem conta não revela nada. Dado um e-mail que não tem conta, quando alguém pede o link com ele, então a tela mostra a mesma mensagem do CA-B52-02 e nenhum e-mail sai.
- **CA-B52-04** (automática) — Conta desativada não recebe link. Dado uma conta desativada pelo Admin da empresa, quando alguém pede o link com o e-mail dela, então a tela mostra a mesma mensagem do CA-B52-02 e nenhum e-mail sai.
- **CA-B52-05** (automática) — Pedir de novo derruba o link anterior. Dado uma conta ativa que já pediu um link e ainda não usou, quando ela pede outro, então o link novo funciona e o anterior mostra o aviso de link que não vale mais.
- **CA-B52-06** (automática) — Freio de pedidos. Dado um e-mail que já pediu o link 3 vezes na última hora, ou um endereço de internet que já pediu 10 vezes na última hora, quando chega mais um pedido, então a tela avisa que houve tentativas demais e nenhum e-mail sai.
- **CA-B52-07** (automática) — Só pessoa pede o link. Dado um pedido sem a conferência de que é uma pessoa, ou com ela recusada, quando ele chega ao servidor, então é recusado como no cadastro, e nenhum e-mail sai.

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
