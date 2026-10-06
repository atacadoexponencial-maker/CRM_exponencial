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

## Resultado (06/10/2026, só leitura no banco de produção)

**Nenhum sinal de que as falhas foram exploradas.**

| Empresa | Admin | Empresa criada | Admin criado | Último login |
|---|---|---|---|---|
| Marcelle Midias | marcellefernandesdemesquita@gmail.com | 28/05/26 14:10 | 28/05/26 14:10 | 06/10/26 13:49 |
| Luan Teste | luan@seteads.com | 29/05/26 13:24 | 29/05/26 13:24 | 16/09/26 15:39 |
| Atacado Exponencial | felipe@seteads.com | 03/09/26 20:49 | 03/09/26 20:49 | 03/09/26 20:49 |

- Cada Admin nasceu no mesmo minuto da própria empresa (padrão do cadastro legítimo).
  Um Admin enxertado numa empresa existente apareceria criado bem depois dela.
- Nenhum perfil mais antigo que a empresa onde está (sinal de troca de empresa): 0.
- Nenhum usuário com papel diferente de Admin: 0.
- Conta sem perfil: `atacadoexponencial@gmail.com` (criada 04/09/26) — já conhecida desde
  03/10, não é efeito de ataque; não pode ser apagada.
- Empresa sem nenhum usuário: 1 — "Atacado Exponencial", criada 03/09/26 20:49, sem
  times nem contatos, no mesmo minuto da empresa do felipe@. É resto do cadastro
  antigo em três passos (a empresa nascia antes do Admin; uma segunda tentativa
  criava empresa e falhava no Admin). A B19-01 impede que isso se repita.

Nada foi alterado. Decisão da Marcelle pendente: apagar a empresa órfã e dar perfil à conta `atacadoexponencial@gmail.com`.
