# B54-06: Disparo da campanha por template e relatório

**Tipo:** Implementação
**Página:** Campanhas > envio (cron) e relatório
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-templates-da-meta.md`

## Descrição

O envio pela Meta passa a mandar template: nome, idioma, o valor de cada variável por destinatário e o arquivo do cabeçalho por link de 1 hora. Antes de confirmar, o servidor reconfere que o template está aprovado. Recusa da Meta vira falha com motivo; número desconectado falha como hoje. A lista de campanhas e o relatório dizem o template usado.

## Pronto quando

Uma campanha de template dispara de verdade, a mensagem chega no celular com o nome do contato e a imagem, e o relatório mostra o template e o status de cada destinatário.

## Critérios de aceite

- **CA-B54-23** (automática) — Confirmar reconfere que o template está aprovado. Dado uma campanha de tipo Template cujo template foi pausado ou rejeitado depois de escolhido, quando o Admin clica em Enviar agora ou Agendar, então a campanha não começa e a tela avisa "O template não está mais aprovado na Meta. Escolha outro ou corrija-o em Configurações > Templates".
- **CA-B54-24** (automática) — Cada destinatário recebe o template com os valores dele. Dado uma campanha de template com `{{1}}` vindo de Nome do contato (reserva "cliente"), `{{2}}` de um campo personalizado e `{{3}}` com Texto fixo, e dois destinatários, um deles sem nome e sem o campo preenchido, quando o disparo roda, então a Meta recebe, para cada um, o template pelo nome e idioma com os três valores na ordem; o destinatário sem nome recebe "cliente" e, no campo vazio, a reserva dele; o relatório marca os dois como enviados.
- **CA-B54-25** (automática) — Cabeçalho de mídia vai com o arquivo da campanha. Dado uma campanha de template com cabeçalho de imagem e o arquivo anexado, quando o disparo roda, então cada envio leva o arquivo do cabeçalho por um link que vale 1 hora (o mesmo prazo dos anexos de campanha de hoje).
- **CA-B54-26** (automática) — Recusa da Meta vira falha com motivo. Dado uma campanha de template em que a Meta recusa um destinatário (template pausado no meio do envio, ou valor de variável fora do padrão dela), quando o disparo roda, então esse destinatário fica como falhou com o motivo em português no relatório, e os demais seguem.
- **CA-B54-27** (automática) — Número que deixou de ser da API Oficial. Dado uma campanha de template agendada cujo número foi desconectado antes da hora, quando o disparo roda, então os destinatários pendentes ficam como falhou com o motivo "O número da campanha não está mais conectado", como já acontece hoje com número desconectado.
- **CA-B54-28** (automática) — Relatório e lista dizem qual template foi usado. Dado uma campanha de template enviada, quando o Admin abre a lista de campanhas e o relatório dela, então a lista mostra "Template: nome_do_template" na coluna de mensagem e o relatório mostra o nome do template no cabeçalho.
- **CA-B54-29** (manual) — Disparo real por template. Dado o número da API Oficial da Marcelle e um contato de teste que não falou com ele nas últimas 24 horas, quando ela dispara uma campanha de template com variável do contato e cabeçalho de imagem para esse contato, então a mensagem chega no celular com o nome do contato e a imagem, e o relatório marca entregue.

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. O contrato da camada de WhatsApp (`tipos.ts`) ganha `enviarTemplate(destino, template)`. O provider da Meta monta `type: "template"` com `name`, `language.code` e os `components` (header de texto ou mídia por link, body, botões de URL com índice). O provider do gateway recusa com "Template só existe na API Oficial…".
2. No motor (`src/lib/campanhas.ts`), a campanha de tipo `template` chama `templateParaDestinatario`: `valoresDasVariaveis` resolve cada origem (nome do contato, primeiro nome, vendedor, campo personalizado ou fixo) e usa o texto reserva quando o dado está vazio; o cabeçalho de mídia leva o link assinado do anexo (`linkParaEnvio`, 1 hora na API Oficial, B49-02).
3. Antes de confirmar, `confirmarCampanha` consulta `templatesParaCampanha(numero)` e exige que o template ainda esteja aprovado; senão "O template não está mais aprovado na Meta. Escolha outro ou corrija-o em Configurações > Templates". O bloqueio temporário da B54-04 sai.
4. A lista de campanhas ganha a coluna **Mensagem** ("Template: nome" ou o começo do texto) e o relatório mostra "Template: nome" sob o título.

### Edge Cases
- Campanha de template num número do canal direto (gravada direto no banco): o provider do gateway recusa cada destinatário com motivo.
- Número escolhido desconectado: todos os pendentes falham com "O número da campanha não está mais conectado" (antes o texto era o genérico "Nenhum número de envio disponível…"; o genérico fica para campanha sem número escolhido).
- Variável com quebra de linha, tabulação ou 4+ espaços: a Meta recusa parâmetros assim; `valoresDasVariaveis` troca por espaço antes de mandar.
- Campanha gravada como template sem o template: destinatários falham com "A campanha não tem o template escolhido".

### Cenário de Erro
- Recusa da Meta: `motivoDaFalha` lê o `code` do corpo que o provider devolve e traduz (132000 variáveis a mais/menos, 132001 template inexistente/não aprovado, 132012 valor fora do padrão, 132015 pausado, 132016 desativado, 131026 destinatário não recebe, 131047 fora das 24 h, 131049 limite de marketing); código desconhecido mostra "A Meta recusou: <mensagem dela>".
- Meta fora do ar na confirmação: "Não foi possível carregar os templates da Meta" e a campanha não confirma.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B54-23 | automática | `src/test/campanhas-template-confirmar.test.ts` | com o template PAUSED ou REJECTED na Meta, confirmar devolve o aviso e para antes dos destinatários; APPROVED segue |
| CA-B54-24 | automática | `src/test/campanhas-template-envio.test.ts` | dois destinatários recebem o template pelo nome e idioma com os três valores na ordem; o sem nome e sem o campo recebe as reservas; ambos ficam "enviado" |
| CA-B54-25 | automática | `src/test/campanhas-template-envio.test.ts` | o cabeçalho de imagem vai com o link assinado de 3600 s do arquivo da campanha |
| CA-B54-26 | automática | `src/test/campanhas-template-envio.test.ts` | recusa da Meta com código 132015 vira "falhou" com "A Meta recusou: o template está pausado"; o outro destinatário segue e a campanha termina |
| CA-B54-27 | automática | `src/test/campanhas-template-envio.test.ts` | número escolhido desconectado: pendentes ficam "falhou" com "O número da campanha não está mais conectado", sem chamar o canal |
| CA-B54-28 | automática | `src/test/campanhas-template-relatorio.test.tsx` | a lista mostra "Template: oferta_outubro" na coluna Mensagem e o relatório mostra o nome do template sob o título; campanha de texto não mostra |
| CA-B54-29 | manual | roteiro abaixo | a mensagem chega no celular com o nome do contato e a imagem; o relatório marca entregue |

### Roteiro manual — CA-B54-29
1. Em Configurações > Templates, confira que existe um template **aprovado** com cabeçalho de imagem e `{{1}}` no corpo (crie e espere a Meta aprovar, se precisar).
2. Em Campanhas > Nova campanha, escolha um filtro que traga só o contato de teste que não falou com o número nas últimas 24 horas.
3. Na etapa 2, escolha o número da API Oficial, o tipo Template e esse template; `{{1}}` com origem Nome do contato e reserva "cliente"; anexe a imagem do cabeçalho; confira a prévia.
4. Na etapa 3, "Confirmar e enviar agora".
5. No celular do contato, a mensagem chega com a imagem e o nome dele. No relatório, o destinatário aparece como entregue (ou lido) e o cabeçalho diz "Template: nome".

## Arquivos

- **Criar:** `src/test/campanhas-template-envio.test.ts` — testes dos critérios CA-B54-24 a 27
- **Criar:** `src/test/campanhas-template-confirmar.test.ts` — teste do critério CA-B54-23
- **Criar:** `src/test/campanhas-template-relatorio.test.tsx` — teste do critério CA-B54-28
- **Modificar:** `src/lib/whatsapp/tipos.ts` — `TemplateEnvio` e `enviarTemplate` no contrato
- **Modificar:** `src/lib/whatsapp/index.ts` — reexporta `TemplateEnvio`
- **Modificar:** `src/lib/whatsapp/provider-meta.ts` — `enviarTemplate`
- **Modificar:** `src/lib/whatsapp/provider-gateway.ts` — `enviarTemplate` recusa com motivo
- **Modificar:** `src/lib/whatsapp/motivo-da-falha.ts` — códigos de template da Meta em português, `MOTIVO_NUMERO_DESCONECTADO`, `MOTIVO_TEMPLATE_SEM_API_OFICIAL`
- **Modificar:** `src/lib/templates-da-meta.ts` — `valoresDasVariaveis`
- **Modificar:** `src/lib/campanhas.ts` — envio por template, motivo do número desconectado, `template` na leitura
- **Modificar:** `src/app/(auth)/campanhas/actions.ts` — reconferência do template na confirmação, coluna Mensagem na lista, `templateNome` no relatório
- **Modificar:** `src/app/(auth)/campanhas/campanhas-client.tsx` — coluna Mensagem
- **Modificar:** `src/app/(auth)/campanhas/[id]/relatorio/relatorio-client.tsx` — "Template: nome" no cabeçalho
- **Modificar:** `src/test/campanhas-motor-seguranca.test.ts` — o número de outra empresa gravado na campanha passa a falhar com o motivo do número desconectado

## Checklist

- [x] contrato e providers com `enviarTemplate`
- [x] motor manda template com os valores de cada destinatário e o link do cabeçalho
- [x] confirmação reconfere o template aprovado; bloqueio temporário da B54-04 removido
- [x] motivos da Meta em português; número desconectado com motivo próprio
- [x] lista e relatório dizem o template
- [x] testes CA-B54-23..28 passando; tsc limpo
