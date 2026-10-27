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

## Cenários

### Happy Path
1. O gateway manda `message.received` com reação ou aviso de sistema (editada ou apagada), ou `message.status`, por um número da empresa A.
2. O webhook acha a conexão pelo `instance_id` e passa a empresa dela adiante.
3. Reação, edição, apagamento e status só alteram mensagem (e destinatário de campanha) **dessa empresa** com aquele `wamid`.
4. Para mídia, o CRM baixa só do endereço do gateway configurado (`GATEWAY_BASE_URL`), com até 60 segundos e 100 MB, e guarda com tipo e extensão escolhidos pelo CRM.

### Edge Cases
- Evento citando `wamid` de mensagem de outra empresa: nada muda, como acontece hoje com alvo que o CRM não tem (`alvoEncontrado: false`).
- Status de mensagem de outra empresa: nada muda. Se for recente, o webhook pede reentrega como hoje no caso de mensagem ainda não gravada (B26-02); depois do prazo, desiste.
- Mídia com `content-length` maior que 100 MB: o download nem começa. Sem `content-length`, o CRM conta os bytes enquanto lê e para ao passar do limite.
- Miniatura (`thumbnail_url`) segue as mesmas regras de origem, tempo e tamanho.
- Tipo aceito vira a extensão do próprio tipo (`image/jpeg` → `jpeg`, `application/pdf` → `pdf`); tipo fora da lista, inclusive `text/html` e `image/svg+xml`, é guardado como `application/octet-stream` com extensão `bin`. O nome original continua em `media_filename` para a tela.
- `GATEWAY_BASE_URL` ausente: nenhuma mídia é baixada.

### Cenário de Erro
- Download recusado, lento demais, grande demais ou de outra origem: a mensagem entra no chat sem o arquivo, como hoje quando o download falha.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B44-11 | automática | `src/test/gateway-eventos-da-propria-empresa.integration.test.ts` | edição, apagamento, reação e status chegados pelo número de A citando mensagem de B deixam texto, status e reação da mensagem de B iguais |
| CA-B44-12 | automática | `src/test/gateway-eventos-da-propria-empresa.integration.test.ts` | os mesmos eventos citando mensagem de A mudam texto, apagamento, reação e status dela |
| CA-B44-13 | automática | `src/test/midia-recebida-segura.test.ts` | mídia com endereço fora do gateway configurado não é buscada (nenhuma chamada, nenhum token enviado) e volta `null`, que deixa a mensagem sem arquivo |
| CA-B44-14 | automática | `src/test/midia-recebida-segura.test.ts` | mídia maior que 100 MB (declarada ou lida) e mídia que passa de 60 s voltam `null` sem upload |
| CA-B44-15 | automática | `src/test/midia-recebida-segura.test.ts` | mídia `text/html` ou `image/svg+xml` com nome `pagina.html` é guardada como `application/octet-stream` e extensão `bin` |

## Arquivos

- **Modificar:** `src/lib/whatsapp/recebimento.ts` — `aplicarReacao` e `aplicarAvisoDeSistema` recebem a empresa e filtram por ela; `receberMensagem` passa a empresa
- **Modificar:** `src/lib/whatsapp/eventos-de-operacao.ts` — `aplicarStatusDeMensagem` recebe a empresa e filtra mensagens e destinatários de campanha por ela
- **Modificar:** `src/app/api/webhooks/gateway/route.ts` — passa a empresa da conexão para `aplicarStatusDeMensagem`
- **Modificar:** `src/lib/whatsapp/midia-recebida.ts` — origem presa ao gateway, 60 s, 100 MB, tipo e extensão do CRM
- **Criar:** `src/test/gateway-eventos-da-propria-empresa.integration.test.ts` — CA-B44-11 e 12 no Supabase real
- **Criar:** `src/test/midia-recebida-segura.test.ts` — CA-B44-13 a 15, com busca e Storage simulados
- **Modificar:** `src/test/gateway-eventos-de-operacao.test.ts` — os testes da B6 conferiam o filtro só por `wamid`, que é o comportamento corrigido; passam a conferir o filtro com a empresa
- **Modificar:** `src/test/gateway-midia-recebida.test.ts` — os testes da B6 usam o gateway fictício `https://gateway.exemplo`; ganham esse endereço como `GATEWAY_BASE_URL` e passam a empresa onde chamam reação e edição

Não muda: `acharMensagemPorWamid` (mensagem citada em resposta), usada também pela "enviada pelo celular", área adiada para a run-2.

## Checklist

- [x] Reação, edição e apagamento filtrados pela empresa
- [x] Status de mensagem e de campanha filtrados pela empresa, e o webhook passando a empresa
- [x] Mídia: origem, tempo, tamanho, tipo e extensão
- [x] Ajuste dos testes antigos da B6 ao comportamento corrigido
- [x] Testes do CA-B44-11 a 15
