# Avaliação — Integração WhatsApp não-oficial (sem API da Meta)

Data: 08/09/2026
Status: **viável com ressalvas graves** — recomendação é multi-provider, não substituição

## 1. O que "desenvolver nossa própria integração" significa na prática

Não existe caminho realista de implementar o protocolo do WhatsApp do zero. O
WhatsApp Multi-Device usa o protocolo Signal com Noise handshake sobre WebSocket
binário, sem documentação pública. Reimplementar isso é engenharia reversa
contínua — a Meta muda o protocolo sem aviso e cada mudança derruba a integração
até alguém reimplementar.

O que o mercado chama de "integração própria" é, na prática, usar uma biblioteca
que já fez essa engenharia reversa:

| Opção | Como funciona | Nota |
|---|---|---|
| **Baileys** (Node/TS) | Fala o protocolo multi-device direto por WebSocket, sem browser | Mais leve, mantido ativamente (v7 em 2026), é a base de quase tudo |
| **Evolution API** | Servidor REST + webhooks que embrulha o Baileys, multi-instância, Postgres/Redis, Docker | Padrão de fato no Brasil; entrega pronto o que teríamos que construir |
| **whatsapp-web.js** | Puppeteer rodando Chromium com WhatsApp Web real | ~10x mais RAM por sessão; inviável multi-tenant |
| **WAHA / whatsmeow** | Alternativas (Docker / Go) | Válidas, menos ecossistema pt-BR |

**Conclusão da etapa 1:** o esforço real não é "escrever a integração" — é
operar um serviço de sessões persistentes. Escrever nosso próprio wrapper em
cima do Baileys em vez de usar a Evolution API só faz sentido se quisermos
controle total do formato dos eventos; é semanas de trabalho para reconstruir o
que a Evolution já entrega.

## 2. Bloqueador arquitetural: isto não roda na Vercel

O CRM hoje é 100% Vercel (Next.js + Server Actions + Supabase). Funções da
Vercel não sustentam WebSocket de saída com sessão de longa duração: cada
invocação termina ao responder, e não há processo persistente para manter o
socket e o estado de criptografia da sessão aberto.

Isso obriga a uma topologia híbrida:

```
Vercel (Next.js)  --HTTP-->  Gateway WhatsApp (VPS, Docker)  --WS-->  WhatsApp
      ^                            |
      |                            | webhook (mensagem recebida)
      +----------------------------+
```

Consequências concretas para o produto:

- Passamos a operar **infraestrutura**: VPS, Docker, Postgres/Redis do gateway,
  PM2/restart, backup dos arquivos de sessão, monitoramento, atualização da
  biblioteca quando a Meta muda o protocolo.
- Sessão é estado com dono: cada número conectado tem arquivos de credencial que
  **não podem** ser perdidos, senão o cliente precisa reler o QR Code.
- Custo de VPS é baixo (US$ 5–20/mês inicial, escalando por volume de sessões),
  mas o custo operacional (plantão, alguém para reagir a quebra de protocolo)
  não é.

## 3. O risco que mais importa: banimento — e ele bate exatamente no nosso caso de uso

Baileys e derivados violam os Termos de Serviço do WhatsApp. O número do cliente
pode ser banido. As pesquisas de 2025–2026 indicam que o modelo de detecção da
Meta pesa principalmente:

- **taxa de resposta** — abaixo de ~10% de respostas = alto risco;
- **distância no grafo de contatos** — mensagem para desconhecido = alto risco;
- **padrão temporal** — intervalos robóticos, disparo em rajada = alto risco.

Ou seja, o risco não vem da biblioteca escolhida, vem do **comportamento de
envio**. E aqui está o problema específico do CRM Exponencial:

| Módulo | Perfil de envio | Risco em número não-oficial |
|---|---|---|
| Chat / Retenção | Conversa 1:1, cliente responde, alta taxa de resposta | **Baixo** — é o caso de uso adequado |
| Sequências | Follow-up para quem já conversou | **Médio** — depende do espaçamento |
| Expansão (prospecção) | Mensagem fria para desconhecido | **Alto** |
| Campanhas (Módulo 7) | Disparo em massa segmentado | **Muito alto** — é o padrão que a Meta caça |

Dois dos módulos que já entregamos são justamente os que mais queimam número em
integração não-oficial. Vender "campanha em massa via número não-oficial" é
vender banimento com passos extras — e o cliente vai atribuir a perda do número
ao nosso CRM.

Nenhum pacote "anti-ban" resolve isso; eles reduzem probabilidade simulando
atraso humano e limitando taxa, não eliminam o risco.

## 4. O que ganhamos

Não é pouco, e é por isso que vale considerar:

- **Onboarding em minutos**: QR Code em vez de Embedded Signup + verificação de
  negócio na Meta + criação de WABA. Hoje isso é a maior fricção do produto.
- **Sem custo por conversa** da Meta.
- **Sem templates aprovados** nem janela de 24h para iniciar conversa.
- **Funciona com WhatsApp comum/Business** — o cliente não precisa migrar número.
- **Grupos** — desbloqueia o Módulo 6, hoje impossível pela API oficial
  (ver `avaliacao-modulo-6-grupos.md`). Baileys suporta grupos.

## 5. Esforço de código no CRM atual

O código hoje chama `graph.facebook.com` direto, em **13 pontos**, sem camada de
abstração:

- `src/app/(auth)/chat/actions.ts` — 5 chamadas (texto, mídia, etc.)
- `src/app/(auth)/configuracoes/whatsapp/actions.ts` — 4 (OAuth, register, subscribe)
- `src/app/(auth)/configuracoes/templates/actions.ts` — 2
- `src/lib/whatsapp-envio.ts` — 1 (automações + sequências)
- `src/lib/campanhas.ts` — 1
- `src/app/api/webhooks/whatsapp/route.ts` — 200 linhas parseando o payload da Meta
- `whatsapp_connections` — colunas `waba_id`, `phone_number_id`, `access_token`
  são específicas da Meta; não há coluna de provider

Trabalho necessário, em ordem:

1. **Camada de provider** (`src/lib/whatsapp/`): interface única
   (`enviarTexto`, `enviarMidia`, `marcarLido`, …) com duas implementações —
   `meta` e `nao-oficial`. Refatorar os 13 call sites para passar por ela.
2. **Migration**: coluna `provider` em `whatsapp_connections` + colunas de
   instância (nome da instância, api key) nullable; tornar as colunas Meta
   nullable.
3. **Gateway**: subir Evolution API em VPS com Docker, uma instância por número
   conectado, isolada por workspace.
4. **Webhook adapter**: nova rota que recebe o formato Evolution e normaliza
   para o mesmo shape que o parser atual já produz — o resto do pipeline
   (conversas, mensagens, automações, tempo real) não muda.
5. **Wizard de conexão por QR Code**: nova UI em `/configuracoes/whatsapp` com
   polling de status da instância.
6. **Throttling por instância**: o motor de campanhas hoje dispara em cron sem
   controle de ritmo. Em número não-oficial precisa de fila com jitter,
   limite/hora e parada automática — senão queima o número no primeiro disparo.
7. **Termo de responsabilidade** no produto: o cliente precisa aceitar
   explicitamente que o canal é não-oficial e que o risco de banimento é dele.

Estimativa grosseira: itens 1–5 são o núcleo; o item 6 é o que separa "funciona
na demo" de "não queima o número do cliente".

## 6. Recomendação

**Não substituir a API oficial. Adicionar o canal não-oficial como segundo
provider**, com o produto direcionando o uso:

- **Meta oficial** permanece o caminho para Campanhas e prospecção fria —
  volume alto e destinatário desconhecido.
- **Não-oficial** entra para Chat, Retenção e Sequências — conversa 1:1 com
  quem responde, que é onde o risco é baixo e o ganho de onboarding é enorme —
  além de destravar Grupos.

Isso preserva o que já está em produção, resolve a maior fricção de entrada do
produto, e não coloca o número do cliente no perfil de envio que a Meta pune.

O pré-requisito inegociável é o item 1 (camada de provider). Sem ela, qualquer
segundo canal vira duplicação de lógica em 13 lugares.

## 7. Pendências antes de decidir

- Definir se o gateway é **nosso** (nós operamos a VPS, cliente só lê o QR) ou
  **do cliente** (ele hospeda) — muda drasticamente a exposição jurídica.
- Revisar com jurídico o termo de responsabilidade e o contrato.
- Validar custo de VPS no volume esperado de números conectados.

## Fontes

- https://github.com/evolution-foundation/evolution-api
- https://www.npmjs.com/package/baileys
- https://whatsapp.checkleaked.cc/blog/best-open-source-whatsapp-libraries
- https://whatsapp.checkleaked.cc/blog/whatsapp-multi-device-protocol
- https://ably.com/topic/ai-stack/websockets-on-vercel-why-serverless-functions-cant-host-them
- https://wasenderapi.com/blog/evolution-api-in-production-architecture-guide-for-scaling-multi-tenant-saas
- https://blog.tipefy.com/api-oficial-do-whatsapp-vs-evolution-api-e-baileys-o-que-muda-na-pratica-para-sua-empresa
