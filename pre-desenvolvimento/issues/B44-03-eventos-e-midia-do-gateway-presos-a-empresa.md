# B44-03: Eventos e mídia do canal direto presos à empresa do número

**Tipo:** Implementação
**Página:** Chat (mensagens recebidas pelo canal direto)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-4.md`

## Descrição

Edição, apagamento, reação e status que chegam pelo gateway só mexem em mensagens do mesmo número e empresa, e a mídia recebida só é baixada do próprio gateway, com limite de tamanho e tempo, sem virar página que abre no navegador.

## Pronto quando

Um evento do gateway que cita mensagem de outra empresa não muda nada, os eventos da própria conversa continuam aparecendo no chat, e mídia de fora do gateway, grande demais, lenta demais ou de tipo perigoso não é guardada como página.

## Critérios de aceite

- **CA-B44-11** (automática) — Evento do gateway não mexe em mensagem de outra empresa. Dado uma mensagem da empresa B e um número da empresa A no canal direto, quando chega pelo número de A um evento de edição, apagamento, reação ou status que cita essa mensagem de B, então a mensagem de B fica igual (texto, status e reações)
- **CA-B44-12** (automática) — Evento do gateway na própria conversa continua funcionando. Dado uma mensagem da empresa A numa conversa do número de A, quando chega pelo número de A a edição, o apagamento, a reação ou o status dessa mensagem, então o chat de A mostra a mudança, como hoje
- **CA-B44-13** (automática) — Mídia recebida só é baixada do próprio gateway. Dado uma mensagem recebida com mídia cujo endereço não é do gateway configurado, quando o CRM processa a mensagem, então o CRM não acessa esse endereço, não manda a chave do número para ele, e a mensagem entra no chat como entra hoje quando a mídia não pode ser baixada
- **CA-B44-14** (automática) — Mídia grande demais ou lenta demais não trava o recebimento. Dado uma mídia do gateway maior que o limite (SUP-B44-03) ou que não termina de chegar no tempo limite, quando o CRM processa a mensagem, então o download é interrompido e a mensagem entra no chat como entra hoje quando a mídia não pode ser baixada
- **CA-B44-15** (automática) — Arquivo recebido de tipo perigoso não abre como página. Dado uma mídia recebida declarada como página da web (HTML) ou como imagem SVG, quando o CRM guarda o arquivo, então o arquivo fica guardado como download genérico, com extensão definida pelo CRM e não pelo nome que veio de fora, e não abre como página

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B44-03 | Limite da mídia recebida do gateway: **100 MB** (o maior documento que o WhatsApp aceita) e **60 segundos** para terminar de chegar | confirmada | Marcelle, 27/10/2026 |

## Perguntas em aberto

Nenhuma.
