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
