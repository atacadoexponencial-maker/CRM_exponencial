# B52-02: Criar a senha nova pelo link

**Tipo:** Implementação
**Página:** `/redefinir-senha`
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-esqueci-minha-senha.md`

## Descrição

O link do e-mail abre a tela de senha nova sem gastar o link; salvar uma senha válida troca a senha, entra no CRM e encerra as outras sessões; link que não vale mostra o aviso.

## Pronto quando

Pelo link do e-mail a pessoa cria a senha nova e cai no Dashboard logada; o outro aparelho é deslogado; o mesmo link depois disso mostra o aviso de link que não vale mais.

## Critérios de aceite

- **CA-B52-08** (automática) — Link que vale abre o formulário. Dado um link recém-pedido, quando a pessoa o abre (duas vezes, como faz um programa de e-mail que confere links), então nas duas vezes aparece o formulário de senha nova, e o link continua valendo.
- **CA-B52-09** (automática) — Senha nova entra direto. Dado um link que vale, quando a pessoa salva uma senha nova válida, então a senha antiga para de funcionar, a nova funciona, e ela cai no Dashboard já logada.
- **CA-B52-10** (automática) — Outras sessões encerradas. Dado a conta logada em outro aparelho, quando a senha é trocada pelo link, então a sessão do outro aparelho deixa de valer e ele volta ao login.
- **CA-B52-11** (automática) — Link que não vale mostra aviso. Dado um link vencido (mais de 1 hora), um já usado, um derrubado por pedido novo e um inventado, quando a pessoa abre cada um, ou tenta salvar a senha por ele, então a tela diz que o link não vale mais e oferece pedir outro, sem formulário, e nenhuma senha muda (a mesma mensagem para os quatro casos).
- **CA-B52-12** (automática) — Senha inválida não gasta o link. Dado um link que vale, quando a pessoa salva uma senha com menos de 8 caracteres, ou com a confirmação diferente, então a tela mostra o erro, a senha não muda e o link continua valendo.
- **CA-B52-13** (automática) — Conta desativada depois do pedido. Dado um link pedido por uma conta que o Admin desativou em seguida, quando a pessoa tenta salvar a senha nova, então a senha não muda e a tela mostra o aviso de link que não vale mais.
- **CA-B52-14** (manual) — E-mail chega e abre a tela de senha nova. Dado a B52 no ar, quando o Luan pede o link para uma conta dele e abre a caixa de entrada, então o e-mail chegou na caixa de entrada (não no spam), com o remetente e o texto combinados, e o botão abre a tela de senha nova; salvando, ele entra no CRM.

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B52-01 | Por quanto tempo o link vale? | respondida | 1 hora (Luan, 29/10/2026) |
| PER-B52-02 | Depois de criar a senha nova, entra direto ou volta ao login? | respondida | Entra direto no CRM (Luan, 29/10/2026) |
| PER-B52-03 | As outras sessões da conta são encerradas? | respondida | Sim (Luan, 29/10/2026) |
