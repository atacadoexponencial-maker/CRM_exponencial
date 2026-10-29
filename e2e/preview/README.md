# Testes no preview da Vercel

Roteiros que conferem os "Pronto quando" das issues direto no preview do branch,
pela tela, com o navegador automático (Playwright) logado como o admin de uma
**empresa de teste**, e depois conferem o resultado no banco. Foram escritos na
B11 (automações), em 07/10/2026.

> Desde a B46-03 (28/10/2026), o preview grava no **banco de teste**, um
> projeto Supabase separado do da produção. Os roteiros escolhem o banco pelo
> endereço (`lerEnv`, em `comum.cjs`): o da produção
> (`https://crmatacadoexp.com`, ou o antigo `https://crm-exponencial.vercel.app`,
> que continua no ar) usa o `.env.local`; qualquer outro
> endereço, ou nenhum, usa o `.env.teste.local`. Os roteiros continuam mexendo
> só na empresa cujo nome começa com `[TESTE]`, que existe nos dois bancos. Os
> testes com chip e os roteiros de envio (B11-05 e B11-07) usam a produção.
> Branch com migration nova: rode `npm run db:teste:push` antes de testar no
> preview, para o banco de teste ter as tabelas do branch.

## O que precisa estar configurado

| Onde | O quê |
|---|---|
| `.env.local` | `VERCEL_AUTOMATION_BYPASS_SECRET`: o segredo de **Protection Bypass for Automation** do projeto na Vercel (Settings → Deployment Protection), o de nota "Roteiros de preview", criado em 28/10/2026. Sem ele, o preview pede login na Vercel. |
| `.env` | `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, para preparar e conferir a empresa de teste. |
| `.env` | `GATEWAY_WEBHOOK_SECRET`, para assinar as mensagens simuladas (B11-04). Na Vercel, o mesmo valor está numa `GATEWAY_WEBHOOK_SECRET` que vale **só para o Preview do branch `b11-automacoes-v2`**. A de "Production and Preview" guarda o segredo da produção: não troque o valor dela, ou a produção passa a recusar o gateway de verdade. |
| `.env.teste.local` | O Supabase do banco de teste (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) e a empresa de teste dele (`B11_TESTE_EMAIL`, `B11_TESTE_SENHA`, `B11_TESTE_WORKSPACE_ID`). O `criar-empresa-teste.cjs` grava os três últimos. Sem esse arquivo, os roteiros de preview param em vez de cair na produção. |
| `.env.local` | `B11_TESTE_EMAIL`, `B11_TESTE_SENHA`, `B11_TESTE_WORKSPACE_ID` da empresa de teste **da produção**, usada só pelos roteiros de envio (B11-05 e B11-07). Desde 20/10/2026, o e-mail e a senha são de um segundo admin, só dos roteiros (`roteiros-teste-b11@example.com`), porque a senha do admin original foi trocada fora deles. Para achar o admin num roteiro, use `adminDoLogin` do `comum.cjs`, não `role = admin`. |
| `.env.local` | `B11_TESTE_TELEFONE_REAL`: o número que recebe as mensagens de verdade nos roteiros de envio (B11-05 em diante). Só com DDI e DDD, sem espaço. |
| Máquina | Chromium do Playwright. Se a versão baixada não for a que o pacote espera, aponte `PLAYWRIGHT_CHROMIUM` para o `chrome.exe` instalado. |

Os dois arquivos `.env*` ficam fora do git. Os scripts nunca mostram os segredos.

## Como usar

```bash
# Uma vez só: cria a "[TESTE] Automações B11" no banco de teste (já existe desde 28/10/2026)
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
node e2e/preview/resetar-empresa-teste.cjs
node e2e/preview/roteiro-b22-08.cjs https://crm-exponencial-xxxx.vercel.app
node e2e/preview/resetar-empresa-teste.cjs
node e2e/preview/roteiro-b22-09.cjs https://crm-exponencial-xxxx.vercel.app
node e2e/preview/resetar-empresa-teste.cjs
node e2e/preview/roteiro-b22-10.cjs https://crm-exponencial-xxxx.vercel.app
node e2e/preview/resetar-empresa-teste.cjs
node e2e/preview/roteiro-b22-11.cjs https://crm-exponencial-xxxx.vercel.app
node e2e/preview/resetar-empresa-teste.cjs
node e2e/preview/roteiro-b22-12.cjs https://crm-exponencial-xxxx.vercel.app
node e2e/preview/resetar-empresa-teste.cjs
node e2e/preview/roteiro-b22-13.cjs https://crm-exponencial-xxxx.vercel.app
node e2e/preview/resetar-empresa-teste.cjs
node e2e/preview/roteiro-b22-14.cjs https://crm-exponencial-xxxx.vercel.app
node e2e/preview/resetar-empresa-teste.cjs
node e2e/preview/roteiro-b22-historico.cjs https://crm-exponencial-xxxx.vercel.app
node e2e/preview/resetar-empresa-teste.cjs
node e2e/preview/roteiro-b22-resto.cjs https://crm-exponencial-xxxx.vercel.app

# Estes enviam mensagens de verdade: só na produção, com o chip conectado e
# combinado com quem recebe (veja "Envio de mensagem" abaixo). Com endereço de
# preview, param antes de tudo.
node e2e/preview/roteiro-b11-05.cjs https://crmatacadoexp.com
node e2e/preview/roteiro-b11-07.cjs https://crmatacadoexp.com
```

Desde a B11-09, as automações rodam depois da resposta da ação. Os roteiros
esperam a fila esvaziar (`esperarAutomacoes`, em `comum.cjs`) antes de conferir o
banco.

Cada roteiro imprime uma linha `OK` ou `FALHOU` por verificação e termina com
código de saída 0 só se tudo passou.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `comum.cjs` | Lê os `.env`, abre o cliente com a chave de serviço, confere que o workspace é de teste, abre o preview logado. Manda mensagem simulada ao webhook do gateway (`enviarEventoDoGateway`) e prepara o contato com o número real (`prepararNumeroReal`). |
| `tela.cjs` | Passos de tela: escolher numa lista, adicionar bloco, criar regra, salvar, mover card pelo painel. |
| `endereco-preview.cjs` | Endereço do preview de um commit, pela API do GitHub e com a credencial que o git já guarda. |
| `criar-empresa-teste.cjs` | Cria a empresa no banco de teste pelo mesmo caminho do cadastro do site (`cadastrar_empresa`) e os dados dos roteiros, e grava o login no `.env.teste.local`. |
| `resetar-empresa-teste.cjs` | Devolve a empresa de teste do banco de teste ao estado inicial. |
| `roteiro-b11-10.cjs` | Editor e lista gravando; a regra da primeira versão (`automations`, que saiu na B11-13) não aparece nem roda. |
| `roteiro-b11-11-e-12.cjs` | Ações e condições de contato e time; tags no painel do card. |
| `roteiro-b11-03.cjs` | Proteção de repetição, ação com etiqueta apagada e a página de histórico. |
| `roteiro-b22-08.cjs` | Editor: aviso ao sair sem salvar, aviso do navegador ao fechar a aba e rascunho (recuperar, descartar, versão que mudou depois). |
| `roteiro-b22-09.cjs` | Editor: repetição no painel do gatilho, a frase no bloco e o padrão da regra nova por gatilho ("sempre" nos de mensagem). |
| `roteiro-b22-10.cjs` | Editor: o resultado de "Testar com um contato" deixa de valer quando o fluxo muda; arrastar um bloco não conta. |
| `roteiro-b22-11.cjs` | Editor: "Testar com um contato" só roda com o fluxo completo. |
| `roteiro-b22-12.cjs` | Editor: campo de horas da repetição (apagar, fração, acima de um ano, salvar). |
| `roteiro-b22-13.cjs` | Editor: "Duplicar" no painel de uma ação e de uma condição. |
| `roteiro-b22-14.cjs` | Editor: botões de variável no campo "Mensagem" (no cursor e no lugar da seleção). |
| `roteiro-b22-historico.cjs` | Lote 3 (B22-15 em diante): página de histórico e lista de automações, com execuções gravadas direto no banco. |
| `roteiro-b22-resto.cjs` | Lote 4 (B22-22 em diante): o resto do QA. Cria um atendente temporário na empresa de teste e o apaga no fim. |
| `conferir-b22-30-rls.cjs` | Depois da migration `20261014000003`: atendente não lê as regras pela API, admin lê. Fala direto com o banco, sem preview. |
| `roteiro-b11-06.cjs` | Gatilhos de tag, etiqueta e dado do contato, e automação que não dispara automação. |
| `roteiro-b11-08.cjs` | Horário comercial pelo diálogo, condição dentro e fora, atribuir ao time, resolver, reabrir e iniciar sequência. |
| `roteiro-b11-09.cjs` | Fila das automações: a função do banco que entrega um evento por vez por contato, e uma ação com falha que não desfaz o movimento do card. |
| `roteiro-b11-04.cjs` | Gatilho "mensagem recebida" com as condições de texto e tipo, por mensagens simuladas no webhook do gateway, e o tempo de resposta do webhook com as regras ativas (B11-09). |
| `roteiro-b11-05.cjs` | ⚠️ Envia 2 mensagens de verdade. Gatilho "mensagem enviada pelo time": a resposta do chat move o card e põe a tag; a mesma frase mandada por uma automação não dispara. |
| `roteiro-b11-07.cjs` | ⚠️ Envia 5 mensagens de verdade. Texto com variáveis, mensagem rápida e PDF escolhido no editor (B11-07); condição de canal com mensagem (B11-02); mensagem de ausência fora do horário, e nada dentro dele (B11-08); a mensagem da regra entregue ao gateway em até 30 segundos (B11-09). |
| `roteiro-b28-esperas.cjs` | Bloco "esperar" (B28-02 e B28-03): espera de 1 minuto seguida pelo relógio chamado à mão, contato esperando que não recomeça a regra, e espera pela resposta com "texto contém" depois. Mensagens simuladas no webhook; precisa do `GATEWAY_WEBHOOK_SECRET` do Preview do branch, com o valor do `.env`. Leva pouco mais de um minuto. |
| `roteiro-menus.cjs` | Itens de menu do chat, de etiquetas e de times fazendo o que prometem. Protege contra a volta do `onSelect` (decisões da B11, seção 9.4). |
| `popular-empresa-teste-b36.cjs` | B36: dá conteúdo a todas as telas para a aprovação visual — conversas (com e sem resposta), tarefas da Agenda do admin de teste, cards no funil de Recompra, mensagens rápidas, uma sequência, uma campanha em rascunho e uma automação pausada. Pode rodar de novo (apaga o que criou antes). Não envia nada. |
| `fotos-das-telas.cjs` | B36: fotografa as telas no tema claro e no escuro (`LARGURAS=390,1400` para celular e computador), trocando o tema pelo menu do usuário. Uso: `node e2e/preview/fotos-das-telas.cjs <endereço> [pasta] [rota1,rota2]`. No Git Bash, rode com `MSYS_NO_PATHCONV=1` para as rotas não virarem caminhos do Windows. |

## A empresa de teste

"[TESTE] Automações B11", com admin de e-mail `@example.com` (domínio
reservado, que não recebe e-mail). Existe nos dois bancos: no de teste, para
os roteiros de preview, recriável pelo `criar` e pelo `resetar`; na produção,
só para os roteiros de envio com chip. **A da produção fica de vez** (decidido
em 08/10/2026): não apague. O nome com "B11" é só de onde ela nasceu. Tem:

- **Contatos:** Ana, Bruno e Carla ("Teste B11 …"), com telefones falsos
  `55000000001xx` e card em Lead no Funil de Entrada.
- **Conversas:** Ana e Bruno têm, sem número conectado. A conversa do Bruno tem a
  etiqueta "Interessado".
- **Time:** o admin é membro do time Entrada.
- **Número real (só a da produção):** o contato "Teste B11 Número real", com o
  número de `B11_TESTE_TELEFONE_REAL`, e a conversa dele. Nasceram nos roteiros
  de envio (B11-05 e B11-07) e ficam para os próximos.

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

**Envio de mensagem (B11-05 e B11-07):** rodam contra a produção
(`https://crmatacadoexp.com`), na empresa de teste de lá; com endereço
de preview, param com "este roteiro envia mensagem de verdade: rode contra a
produção". Precisam de um chip de teste conectado na empresa e de `B11_TESTE_TELEFONE_REAL` no `.env.local`. O roteiro cria, na
primeira vez, o contato "Teste B11 Número real" com esse número, um card em Lead
e uma conversa no chip, e o contato fica para os próximos. Sem chip ou sem o
número, o roteiro para antes de enviar. O gateway põe toda mensagem numa fila,
com 40 segundos entre envios. Um chip conectado há menos de 24 horas está no
aquecimento e envia só 4 por hora. Os dois roteiros juntos mandam 7: as 3
últimas esperam até uma hora na fila, e o roteiro não espera por elas (veja
"Saúde do número" na tela do chip). ⚠️ Com o chip conectado, as regras que enviam mensagem passam a
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
