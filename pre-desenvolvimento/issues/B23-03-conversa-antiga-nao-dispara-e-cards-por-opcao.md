# B23-03: Conversa antiga não dispara nada e cria card só por opção

**Tipo:** Implementação
**Página:** Chat, Pipeline (Funil de Entrada), Dashboard, Alertas, Automações
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-coexistencia.md`

## Descrição

As mensagens importadas do celular (B23-02) entram no chat como história, não como acontecimento: nenhuma automação roda, nada fica não lido, nenhum alerta nasce e o dashboard não muda. Ao fim da importação, só se o Admin marcou a opção na conexão (B23-01) cada contato importado sem card ganha um card na primeira etapa do Funil de Entrada. Conversa cuja última mensagem recebida é só do histórico continua exigindo template para responder.

## Pronto quando

Depois de uma importação, o dashboard, os alertas e o estado de leitura do chat estão como antes; com a opção marcada, os contatos importados aparecem na primeira etapa do Funil de Entrada; sem ela, nenhum card novo existe. Abrir uma dessas conversas no CRM pede template.

## Critérios de aceite

- **CA-B23-15** (automática) — Conversa antiga não dispara nada. Dado uma importação de conversas antigas, quando as mensagens entram no chat, então nenhuma automação roda, nenhuma sequência começa ou para, nenhum alerta é criado, nenhuma conversa fica marcada como não lida e os números do dashboard não mudam.
- **CA-B23-16** (automática) — Sem a opção marcada, conversa antiga não cria card. Dado uma conexão feita com a opção de criar cards desmarcada, quando a importação termina, então nenhum card novo existe no Funil de Entrada por causa da importação.
- **CA-B23-17** (automática) — Com a opção marcada, cada contato importado ganha um card. Dado uma conexão feita com a opção de criar cards marcada, quando a importação termina, então cada contato importado que ainda não tinha card ganha um card na primeira etapa do Funil de Entrada, e quem já tinha card continua com o mesmo, na mesma etapa.
- **CA-B23-18** (automática) — Conversa antiga não libera resposta livre. Dado um contato cuja última mensagem recebida veio só pelo histórico importado, quando o atendente abre a conversa no CRM, então o CRM exige mensagem de modelo (template) para escrever, como em conversa com a janela de 24 horas fechada.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B23-02 | A opção de criar cards para os contatos das conversas antigas vem **desmarcada** por padrão. | confirmada | Marcelle, 10/10/2026. |
| SUP-B23-05 | Mensagens antigas importadas não entram em nenhum número do dashboard, nem os de períodos passados. | confirmada | Marcelle, 10/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B23-04 | Contato vindo só das conversas antigas ganha card no Funil de Entrada? | respondida | É escolha do cliente na conexão. Marcelle, 10/10/2026. |
