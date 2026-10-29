# Spec: Segurança, rodada 6 — o que sobrou da auditoria

> série: B50
> estado: aprovada em 29/10/2026

## Visão Geral

Fecha os três pontos que ficaram de fora da B47 e da B49 (rodada 2 da auditoria de
segurança Cloudflare):

1. **O gateway do canal direto baixa anexo de qualquer endereço.** Ele recebe do CRM
   um link e baixa o arquivo na hora de enviar. Hoje aceita qualquer endereço
   http ou https e segue redirecionamentos, inclusive para a rede interna da VPS. Desde
   a B49 o CRM só manda link assinado do próprio armazenamento. O gateway passa a
   aceitar só esse armazenamento, como segunda barreira.
2. **Uma conta desativada continua com acesso a etiquetas e mensagens rápidas** por até
   1 hora, até a sessão vencer. **Conferido em 29/10/2026: não acontece.** As regras dessas
   duas tabelas leem o próprio perfil, que a conta inativa não lê desde a B20-02. A série só
   fixa esse comportamento em teste.
3. **O cadastro de empresa e o "finalizar pedido" da loja não têm CAPTCHA.** São os
   dois lugares em que alguém sem login cria dados: um robô pode abrir empresas em
   massa ou encher os Pedidos e os Contatos de uma empresa com pedidos falsos. Entra o
   Cloudflare Turnstile, que quase sempre é invisível para a pessoa.

## Páginas / Módulos

### Gateway: de onde o anexo pode ser baixado

**Descrição:** o gateway (repositório `whatsapp-gateway`, publicado na VPS) só baixa
anexo do armazenamento do CRM.

**Comportamentos:**
- O CRM pede o envio de mídia com um link do próprio armazenamento: o gateway aceita
  e baixa na hora de enviar, como hoje.
- Chega um pedido com link de outro site, de endereço interno ou sem https: o
  gateway recusa o pedido sem acessar o endereço.
- O link do armazenamento responde com um redirecionamento: o gateway não segue.

**Critérios de aceite:**

#### CA-B50-01 — Link de fora do armazenamento do CRM é recusado · prova: automática

- **Dado** um pedido de envio de mídia cujo link é de outro site, de um endereço
  interno (`127.0.0.1`, `169.254.169.254`, `localhost`, o IP da VPS) ou do
  armazenamento por `http`
- **Quando** o pedido chega ao gateway
- **Então** ele é recusado com erro de pedido inválido, e o gateway não faz nenhuma
  requisição a esse endereço

#### CA-B50-02 — Redirecionamento não é seguido · prova: automática

- **Dado** um link do armazenamento do CRM que responde com redirecionamento para
  outro endereço
- **Quando** o gateway confere o link no pedido ou baixa o arquivo na hora de enviar
- **Então** ele não segue o redirecionamento, e a mídia não é enviada

#### CA-B50-03 — O link assinado do CRM continua funcionando · prova: automática

- **Dado** um link assinado do armazenamento do CRM
- **Quando** o pedido chega e, depois, a mensagem sai da fila
- **Então** o pedido é aceito e o arquivo é baixado para o envio, como hoje

#### CA-B50-04 — Foto pelo canal direto chega no celular · prova: manual

- **Dado** o gateway novo publicado na VPS e um número do canal direto conectado
- **Quando** a Marcelle manda pelo CRM uma foto para o próprio celular
- **Então** a foto chega e abre

### Conta desativada

**Descrição:** etiquetas e mensagens rápidas passam a exigir conta ativa, como as
outras tabelas da empresa desde a B19.

**Comportamentos:**
- Usuário desativado, com a sessão ainda válida, tenta ler etiquetas e mensagens
  rápidas.
- Admin desativado, com a sessão ainda válida, tenta criar, alterar ou apagar
  etiqueta e mensagem rápida.
- Usuário ativo usa etiquetas e mensagens rápidas como antes.

**Critérios de aceite:**

#### CA-B50-05 — Conta desativada não lê etiquetas nem mensagens rápidas · prova: automática

- **Dado** um atendente desativado com a sessão ainda válida, e etiquetas e mensagens
  rápidas da empresa conferidas antes com a chave de serviço
- **Quando** ele lê as etiquetas e as mensagens rápidas pelo banco, com a própria sessão
- **Então** não recebe nenhuma

#### CA-B50-06 — Admin desativado não altera etiquetas nem mensagens rápidas · prova: automática

- **Dado** um admin desativado com a sessão ainda válida
- **Quando** ele tenta criar, alterar e apagar uma etiqueta e uma mensagem rápida pelo
  banco, com a própria sessão
- **Então** nada é gravado, e o que existia continua igual

#### CA-B50-07 — Conta ativa continua igual · prova: automática

- **Dado** um atendente e um admin ativos
- **Quando** o atendente lê e o admin cria, altera e apaga etiquetas e mensagens rápidas
- **Então** tudo funciona como antes

### CAPTCHA no cadastro e na loja

**Descrição:** o cadastro de empresa (`/cadastro`) e o "finalizar pedido" da loja
pública (`/loja/...`) só são aceitos com a conferência do Turnstile.

**Componentes:**
- Conferência do Turnstile: na maioria das vezes invisível; em caso suspeito, uma
  caixinha para marcar.

**Comportamentos:**
- A pessoa preenche o cadastro e envia: a conferência acontece sozinha e a empresa
  nasce, como hoje.
- A pessoa finaliza o pedido na loja: a conferência acontece sozinha e o pedido entra,
  como hoje.
- Um robô manda o cadastro ou o pedido direto ao servidor, sem a conferência ou com
  uma conferência inválida: é recusado.
- O serviço do Turnstile não responde (fora do ar ou demorando): o cadastro e o pedido passam sem conferência, para não perder venda (PER-B50-01).

**Critérios de aceite:**

#### CA-B50-08 — Cadastro sem conferência válida é recusado · prova: automática

- **Dado** um cadastro de empresa sem conferência do Turnstile ou com uma conferência
  recusada pelo serviço
- **Quando** ele chega ao servidor
- **Então** a tela avisa que não foi possível confirmar que é uma pessoa, e nenhuma
  empresa nem usuário são criados

#### CA-B50-09 — Pedido da loja sem conferência válida é recusado · prova: automática

- **Dado** um pedido da loja sem conferência do Turnstile ou com uma conferência
  recusada pelo serviço
- **Quando** ele chega ao servidor
- **Então** a loja avisa que não foi possível confirmar que é uma pessoa, e nenhum
  pedido nem contato são criados

#### CA-B50-10 — Com a conferência válida, tudo segue como antes · prova: automática

- **Dado** um cadastro e um pedido da loja com conferência aceita pelo serviço
- **Quando** chegam ao servidor
- **Então** a empresa nasce com o admin e os times, e o pedido entra no CRM com o
  contato, como hoje

#### CA-B50-11 — A pessoa passa sem perceber · prova: manual

- **Dado** o site no ar, com as chaves reais do Turnstile (o preview usa as de teste, que sempre passam)
- **Quando** uma pessoa faz um cadastro de teste, apagado depois, e um pedido de teste na loja da
  empresa de teste
- **Então** os dois funcionam, e a conferência não pede nada ou pede só um clique

#### CA-B50-12 — Com o Turnstile fora do ar, o cadastro e o pedido passam · prova: automática

- **Dado** o serviço do Turnstile sem responder (erro de rede ou tempo esgotado), com ou
  sem conferência no pedido
- **Quando** um cadastro ou um pedido da loja chega ao servidor
- **Então** ele é aceito como hoje; com o serviço no ar, conferência ausente ou
  inválida continua recusada (CA-B50-08 e CA-B50-09)
## Fora de escopo

- CAPTCHA no login (decisão da Marcelle em 29/10/2026). O login já tem o freio de 10
  senhas erradas.
- O gateway conferir quem é o dono do número ou o conteúdo do arquivo: isso já é feito
  hoje.
- Mudar como o CRM gera os links (é a B49).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B50-01 | O gateway publicado na VPS só atende o CRM de produção; o armazenamento permitido é o do Supabase de produção, configurado por variável de ambiente (o de teste entra só se algum preview usar o gateway) | aberta | — |
| SUP-B50-02 | As outras tabelas da empresa já exigem conta ativa (pela função da B19 ou por `status = 'active'`); só etiquetas e mensagens rápidas ficaram com a regra antiga | invalidada | Nem essas duas ficaram abertas: as regras delas leem o próprio perfil, e conta inativa não lê o próprio perfil desde a B20-02 (20261006000007). Conferido no banco de teste em 29/10/2026 (Claude): desativado lê 0 e não grava. A B50-01 só fixa isso em teste |
| SUP-B50-03 | A Marcelle cria a conta gratuita na Cloudflare e o site do Turnstile e passa as duas chaves; a chave pública entra na Vercel como variável `NEXT_PUBLIC_`, e a secreta só no servidor | confirmada | Marcelle criou as chaves em 29/10/2026; Claude as pôs na Vercel (Production, a secreta como sensível) e, nos previews, as chaves de teste públicas da Cloudflare, que sempre passam |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B50-01 | Se o serviço do Turnstile estiver fora do ar, o cadastro e o pedido da loja são recusados (mais seguro) ou passam sem conferência (não perde venda)? | respondida | Passam sem conferência, para não perder venda (Marcelle, 29/10/2026). Só quando o serviço não responde: com ele no ar, conferência ausente ou inválida continua recusada |
| PER-B50-02 | Onde entra o CAPTCHA? | respondida | No cadastro e no "finalizar pedido" da loja; não no login (Marcelle, 29/10/2026) |
| PER-B50-03 | Qual serviço de CAPTCHA? | respondida | Cloudflare Turnstile (Marcelle, 29/10/2026) |
| PER-B50-04 | Como o gateway decide de onde baixar o anexo? | respondida | Só do armazenamento do CRM, sem seguir redirecionamento (Marcelle, 29/10/2026) |
