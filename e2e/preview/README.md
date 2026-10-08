# Testes no preview da Vercel

Roteiros que conferem os "Pronto quando" das issues direto no preview do branch,
pela tela, com o navegador automático (Playwright) logado como o admin de uma
**empresa de teste**, e depois conferem o resultado no banco. Foram escritos na
B11 (automações), em 07/10/2026.

> ⚠️ O Supabase é um só: produção e desenvolvimento usam o mesmo banco. Os
> roteiros só mexem na empresa cujo nome começa com `[TESTE]` (confere antes de
> qualquer gravação). O preview roda as ações de verdade. Por isso a empresa de
> teste tem telefones falsos e nenhum número de WhatsApp conectado.

## O que precisa estar configurado

| Onde | O quê |
|---|---|
| `.env` | `VERCEL_AUTOMATION_BYPASS_SECRET`: o segredo de **Protection Bypass for Automation** do projeto na Vercel (Settings → Deployment Protection). Sem ele, o preview pede login na Vercel. |
| `.env` | `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, para preparar e conferir a empresa de teste. |
| `.env` | `GATEWAY_WEBHOOK_SECRET`, para assinar as mensagens simuladas (B11-04). Na Vercel, o mesmo valor está numa `GATEWAY_WEBHOOK_SECRET` que vale **só para o Preview do branch `b11-automacoes-v2`**. A de "Production and Preview" guarda o segredo da produção: não troque o valor dela, ou a produção passa a recusar o gateway de verdade. |
| `.env.local` | `B11_TESTE_EMAIL`, `B11_TESTE_SENHA`, `B11_TESTE_WORKSPACE_ID`. São gravados pelo `criar-empresa-teste.cjs`. |
| `.env.local` | `B11_TESTE_TELEFONE_REAL`: o número que recebe as mensagens de verdade nos roteiros de envio (B11-05 em diante). Só com DDI e DDD, sem espaço. |
| Máquina | Chromium do Playwright. Se a versão baixada não for a que o pacote espera, aponte `PLAYWRIGHT_CHROMIUM` para o `chrome.exe` instalado. |

Os dois arquivos `.env*` ficam fora do git. Os scripts nunca mostram os segredos.

## Como usar

```bash
# Uma vez só: cria a "[TESTE] Automações B11" (já existe desde 07/10/2026)
node e2e/preview/criar-empresa-teste.cjs

# Endereço do preview do commit atual (espera o build terminar)
node e2e/preview/endereco-preview.cjs

# Antes de cada roteiro: volta a empresa de teste ao estado inicial
node e2e/preview/resetar-empresa-teste.cjs

node e2e/preview/roteiro-b11-10.cjs https://crm-exponencial-xxxx.vercel.app
node e2e/preview/resetar-empresa-teste.cjs
node e2e/preview/roteiro-b11-11-e-12.cjs https://crm-exponencial-xxxx.vercel.app
node e2e/preview/resetar-empresa-teste.cjs
node e2e/preview/roteiro-b11-03.cjs https://crm-exponencial-xxxx.vercel.app
node e2e/preview/resetar-empresa-teste.cjs
node e2e/preview/roteiro-b11-06.cjs https://crm-exponencial-xxxx.vercel.app
node e2e/preview/resetar-empresa-teste.cjs
node e2e/preview/roteiro-menus.cjs https://crm-exponencial-xxxx.vercel.app
node e2e/preview/resetar-empresa-teste.cjs
node e2e/preview/roteiro-b11-08.cjs https://crm-exponencial-xxxx.vercel.app
node e2e/preview/resetar-empresa-teste.cjs
node e2e/preview/roteiro-b11-09.cjs https://crm-exponencial-xxxx.vercel.app
node e2e/preview/resetar-empresa-teste.cjs
node e2e/preview/roteiro-b11-04.cjs https://crm-exponencial-xxxx.vercel.app

# Estes enviam mensagens de verdade: só com o chip conectado e combinado com
# quem recebe (veja "Envio de mensagem" abaixo)
node e2e/preview/resetar-empresa-teste.cjs
node e2e/preview/roteiro-b11-05.cjs https://crm-exponencial-xxxx.vercel.app
```

Desde a B11-09, as automações rodam depois da resposta da ação. Os roteiros
esperam a fila esvaziar (`esperarAutomacoes`, em `comum.cjs`) antes de conferir o
banco.

Cada roteiro imprime uma linha `OK` ou `FALHOU` por verificação e termina com
código de saída 0 só se tudo passou.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `comum.cjs` | Lê os `.env`, abre o cliente com a chave de serviço, confere que o workspace é de teste, abre o preview logado. |
| `tela.cjs` | Passos de tela: escolher numa lista, adicionar bloco, criar regra, salvar, mover card pelo painel. |
| `endereco-preview.cjs` | Endereço do preview de um commit, pela API do GitHub e com a credencial que o git já guarda. |
| `criar-empresa-teste.cjs` | Cria a empresa pelo mesmo caminho do cadastro do site (`cadastrar_empresa`) e os dados dos roteiros. |
| `resetar-empresa-teste.cjs` | Devolve a empresa de teste ao estado inicial. |
| `roteiro-b11-10.cjs` | Editor e lista gravando; regra antiga convertida. |
| `roteiro-b11-11-e-12.cjs` | Ações e condições de contato e time; tags no painel do card. |
| `roteiro-b11-03.cjs` | Proteção de repetição, ação com etiqueta apagada e a página de histórico. |
| `roteiro-b11-06.cjs` | Gatilhos de tag, etiqueta e dado do contato, e automação que não dispara automação. |
| `roteiro-b11-08.cjs` | Horário comercial pelo diálogo, condição dentro e fora, atribuir ao time, resolver, reabrir e iniciar sequência. |
| `roteiro-b11-09.cjs` | Fila das automações: a função do banco que entrega um evento por vez por contato, e uma ação com falha que não desfaz o movimento do card. |
| `roteiro-b11-04.cjs` | Gatilho "mensagem recebida" com as condições de texto e tipo, por mensagens simuladas no webhook do gateway, e o tempo de resposta do webhook com as regras ativas (B11-09). |
| `roteiro-b11-05.cjs` | ⚠️ Envia 2 mensagens de verdade. Gatilho "mensagem enviada pelo time": a resposta do chat move o card e põe a tag; a mesma frase mandada por uma automação não dispara. |
| `roteiro-menus.cjs` | Itens de menu do chat, de etiquetas e de times fazendo o que prometem. Protege contra a volta do `onSelect` (decisões da B11, seção 9.4). |

## A empresa de teste

"[TESTE] Automações B11", com admin `teste-automacoes-b11@example.com` (domínio
reservado, que não recebe e-mail). Tem:

- **Contatos:** Ana, Bruno e Carla ("Teste B11 …"), com telefones falsos
  `55000000001xx` e card em Lead no Funil de Entrada.
- **Conversas:** Ana e Bruno têm, sem número conectado. A conversa do Bruno tem a
  etiqueta "Interessado".
- **Time:** o admin é membro do time Entrada.
- **Regra antiga:** uma, em `automations`.

Ela fica isolada como qualquer empresa (RLS). As rotinas diárias (sequências,
campanhas, lixeira) também passam por ela. Sem número conectado, nada é
enviado.

**Mensagem recebida (B11-04):** a mensagem real de um chip vai para a produção,
porque o endereço de webhook gravado na instância é o da produção. No preview,
o roteiro simula a mensagem: manda ao `/api/webhooks/gateway` do preview um
`message.received` assinado (`enviarEventoDoGateway`, em `comum.cjs`). O webhook
acha a empresa pelo `instance_id`, então o roteiro cria uma conexão temporária
com status `removed`, que não aparece na tela e não é consultada. No fim, ele a
apaga.

**Envio de mensagem (B11-05 e B11-07):** precisa de um chip de teste conectado
na empresa e de `B11_TESTE_TELEFONE_REAL` no `.env.local`. O roteiro cria, na
primeira vez, o contato "Teste B11 Número real" com esse número, um card em Lead
e uma conversa no chip, e o contato fica para os próximos. Sem chip ou sem o
número, o roteiro para antes de enviar. ⚠️ Com o chip conectado, as regras que enviam mensagem passam a
enviar de verdade. O `roteiro-b11-06.cjs` (regra A) manda uma mensagem para a
Ana, que tem telefone falso. Não rode esse roteiro com o chip conectado sem
trocar antes o telefone da Ana por um número de teste.

## Armadilhas conhecidas

- **Botão "+":** "Adicionar o próximo bloco" só existe nas saídas livres. Numa
  condição com o "sim" já ligado, o "+" do "não" é o de índice 0.
- **Primeiro salvamento:** o editor remonta no endereço com o id (`?salva=1`).
  Espere o endereço mudar antes do próximo clique.
- **Mover card e conferir o banco:** a página do funil e o painel do card chamam
  outras actions do servidor no mesmo endereço (`POST /pipeline`). Para saber
  que as automações terminaram, espere a resposta que leva a etapa de destino no
  corpo (`moverCard` em `tela.cjs`). Uma espera fixa, ou "a próxima resposta",
  falhava de vez em quando.
- **Arrastar no canvas:** arrastar a menos de ~15px da borda liga a rolagem
  automática do React Flow.
