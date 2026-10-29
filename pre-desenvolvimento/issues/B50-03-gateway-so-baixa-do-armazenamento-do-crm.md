# B50-03: Gateway só baixa anexo do armazenamento do CRM

**Tipo:** Implementação
**Página:** Gateway do canal direto (repositório whatsapp-gateway)
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-6.md`

## Descrição

O gateway só aceita e só baixa anexo de link https do armazenamento do CRM, sem seguir redirecionamento; o resto é recusado sem ele acessar o endereço.

## Pronto quando

Pedido com link de fora é recusado; o link assinado do CRM continua chegando no celular.

## Critérios de aceite

- **CA-B50-01** (automática) — Link de fora do armazenamento do CRM é recusado. Dado um pedido de envio de mídia cujo link é de outro site, de um endereço interno (`127.0.0.1`, `169.254.169.254`, `localhost`, o IP da VPS) ou do armazenamento por `http`, quando o pedido chega ao gateway, então ele é recusado com erro de pedido inválido, e o gateway não faz nenhuma requisição a esse endereço.
- **CA-B50-02** (automática) — Redirecionamento não é seguido. Dado um link do armazenamento do CRM que responde com redirecionamento para outro endereço, quando o gateway confere o link no pedido ou baixa o arquivo na hora de enviar, então ele não segue o redirecionamento, e a mídia não é enviada.
- **CA-B50-03** (automática) — O link assinado do CRM continua funcionando. Dado um link assinado do armazenamento do CRM, quando o pedido chega e, depois, a mensagem sai da fila, então o pedido é aceito e o arquivo é baixado para o envio, como hoje.
- **CA-B50-04** (manual) — Foto pelo canal direto chega no celular. Dado o gateway novo publicado na VPS e um número do canal direto conectado, quando a Marcelle manda pelo CRM uma foto para o próprio celular, então a foto chega e abre.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B50-01 | O gateway publicado na VPS só atende o CRM de produção; o armazenamento permitido é o do Supabase de produção, configurado por variável de ambiente (o de teste entra só se algum preview usar o gateway) | confirmada | Conferido em 29/10/2026 (Claude): na produção há 1 número do canal direto conectado; no banco de teste, só a sobra de um teste da B42 (instância `inst_b42`, telefone falso), que não existe no gateway. Nenhum preview manda mídia pelo gateway |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B50-04 | Como o gateway decide de onde baixar o anexo? | respondida | Só do armazenamento do CRM, sem seguir redirecionamento (Marcelle, 29/10/2026) |

**Repositório:** `whatsapp-gateway`

## Cenários

### Happy Path
O CRM manda o pedido de mídia com o link assinado do Supabase de produção. O gateway confere que o link é https e do armazenamento permitido, confere que ele responde sem seguir redirecionamento, enfileira a mensagem e, quando ela sai da fila, baixa o arquivo do mesmo jeito.

### Edge Cases
- Link de outro site, IP interno (`127.0.0.1`, `169.254.169.254`, o IP da VPS), `localhost`, `http`, porta diferente, usuário e senha no endereço, ou um domínio que só termina parecido (`storage.exemplo.evil.com`): recusado antes de qualquer requisição, com 400 `invalid_payload`.
- Pedido que entrou na fila antes desta regra: o download confere a regra de novo.
- `MEDIA_ALLOWED_HOSTS` ausente na VPS: o padrão é o Supabase de produção, e o serviço sobe igual.

### Cenário de Erro
- Redirecionamento (3xx) na conferência ou no download: "Não foi possível obter a mídia de media_url: respondeu 302." A mensagem não sai, e o motivo chega ao CRM como em qualquer falha de mídia.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B50-01 | automática | `whatsapp-gateway/src/midia/envio.test.ts` | os nove endereços proibidos são recusados pela conferência e pelo download, e o fetch falso não recebe nenhuma chamada |
| CA-B50-02 | automática | `whatsapp-gateway/src/midia/envio.test.ts` | o 302 vira falha nos dois caminhos, os dois pedidos saem com `redirect: "manual"`, e nada fica no depósito |
| CA-B50-03 | automática | `whatsapp-gateway/src/midia/envio.test.ts` | o link assinado do Supabase do CRM passa na conferência e é baixado no depósito |
| CA-B50-04 | manual | roteiro abaixo | foto mandada pelo CRM por número do canal direto chega no celular |

### Roteiro manual — CA-B50-04
1. Com o gateway novo publicado na VPS, abrir no CRM uma conversa do canal direto com o seu próprio celular.
2. Mandar uma foto: ela chega no celular e abre.

## Arquivos

Todos no repositório `whatsapp-gateway`:

- **Modificar:** `src/env.ts` — `MEDIA_ALLOWED_HOSTS`, com o Supabase de produção do CRM como padrão
- **Modificar:** `src/midia/envio.ts` — origem permitida (https e host da lista) antes de requisitar; conferência e download sem seguir redirecionamento
- **Modificar:** `src/server.ts` — a conferência do pedido recebe os endereços permitidos
- **Modificar:** `src/index.ts` — o download no envio recebe os endereços permitidos
- **Modificar:** `src/midia/envio.test.ts` — testes da B50-03 e os antigos com o endereço permitido
- **Modificar:** `src/server.test.ts` — o servidor montado com os endereços permitidos

## Checklist

- [x] Regra de origem e sem redirecionamento no gateway
- [x] Testes do gateway passando (943 testes; o do expurgo oscila por tempo e passa sozinho), tsc e build ok

## Resultado

Implementada em 29/10/2026 no `whatsapp-gateway`, commit `74ff552` (ainda não publicado na VPS). Testes com o código do critério no nome em `src/midia/envio.test.ts` (CA-B50-01 a 03).

## Exceções

| Problema | Alvo | Motivo | Aprovado por | Dia |
|---|---|---|---|---|
| CRITERIO_SEM_TESTE | CA-B50-01 | Teste no repo whatsapp-gateway, que o auditor não lê; resultado na seção Resultado (mesmo motivo da B29-01) | Marcelle | 29/10/2026 |
| CRITERIO_SEM_TESTE | CA-B50-02 | Teste no repo whatsapp-gateway, que o auditor não lê; resultado na seção Resultado (mesmo motivo da B29-01) | Marcelle | 29/10/2026 |
| CRITERIO_SEM_TESTE | CA-B50-03 | Teste no repo whatsapp-gateway, que o auditor não lê; resultado na seção Resultado (mesmo motivo da B29-01) | Marcelle | 29/10/2026 |