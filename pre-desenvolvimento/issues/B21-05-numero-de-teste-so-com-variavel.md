# B21-05: Número de teste da Meta só com a variável ligada

**Tipo:** Implementação
**Página:** Configurações › WhatsApp (tela e assistente de conexão)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-3.md` — módulo 4

## Descrição

O botão "Conectar número de teste" e a ação por trás dele passam a depender de uma variável
de ambiente; desligada (produção), o botão não aparece e a ação recusa. Conexões existentes
não são apagadas.

## Pronto quando

Em produção o botão some da tela e do assistente, e conectar pela Meta ou pelo canal direto
funciona como hoje; com a variável ligada localmente, o botão aparece e funciona; e um teste
automatizado prova que chamar a ação com a variável desligada é recusado sem criar conexão.
