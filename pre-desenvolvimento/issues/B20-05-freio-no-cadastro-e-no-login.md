# B20-05: Freio de tentativas no cadastro e no login

**Tipo:** Implementação
**Página:** Cadastro (`/cadastro`) e Login (`/login`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-2.md` — módulo 5

## Descrição

Cadastro e login passam a contar tentativas no servidor: até 5 cadastros por hora por
endereço de internet; até 10 senhas erradas em 15 minutos por e-mail e 30 por endereço.
Passou do limite, a tela mostra "Muitas tentativas. Aguarde alguns minutos e tente de
novo." e o servidor recusa sem criar nada nem consultar a senha. Login certo não conta.

## Pronto quando

Cadastrar e entrar normalmente continuam iguais; e testes automatizados provam que o 6º
cadastro na mesma hora pelo mesmo endereço é recusado sem criar nada, e que a 11ª senha
errada para o mesmo e-mail é recusada mesmo se estiver certa, até o tempo passar.
