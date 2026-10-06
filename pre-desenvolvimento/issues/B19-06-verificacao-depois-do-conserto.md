# B19-06: Verificação de Admins depois do conserto

**Tipo:** Implementação
**Página:** — (relatório para a Marcelle, sem tela)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-1.md` — módulo 7
**Depende de:** B19-01 e B19-02 no ar

## Descrição

Como as falhas do cadastro e do perfil permitiam criar Admins por fora, conferir no
banco de produção — só lendo — se alguém já se aproveitou: Admins de cada empresa com
data de entrada, e qualquer sinal de perfil que mudou de empresa ou de papel fora das
telas de Admin, se houver registro que permita ver.

## Pronto quando

A Marcelle recebeu a lista de Admins por empresa (com data de entrada) e os sinais
suspeitos, se houver, e confirmou se reconhece cada um. Nenhum dado foi alterado; o que
for suspeito fica para ela decidir.
