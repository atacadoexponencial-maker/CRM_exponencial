# B11-09: Regras executam em fila, fora da requisição do webhook e do chat

**Tipo:** Implementação
**Página:** Motor
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Depende de:** B11-03

## Descrição

O disparo enfileira a avaliação; o webhook do WhatsApp e as actions do chat
respondem na hora. Um processo separado consome a fila, avalia e executa,
gravando no histórico. Falha na fila nunca derruba o recebimento da mensagem.
Decidir na etapa de plano entre fila no Postgres (tabela + cron curto) ou
serviço de fila da plataforma; registrar a decisão na issue.

Cobre, no "Motor", executar fora da requisição.

## Pronto quando

No preview do branch `b11-automacoes-v2` (o merge no `master` é um só, no fim da
série), com uma regra que envia mensagem, o tempo de resposta do
webhook medido no gateway ou na Meta não muda com a regra ativa; a mensagem da
regra chega em até 30 segundos e aparece no histórico. Derrubar de propósito a
ação (etiqueta apagada) não afeta o recebimento da mensagem.
