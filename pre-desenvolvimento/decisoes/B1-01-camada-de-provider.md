# B1-01 — Registro de decisões e plano

**Estado:** planejada, **nenhuma linha de código escrita ainda**
**Data desta sessão:** 10/09/2026
**Quem:** Luan (pegou a tarefa já começada)
**Issue:** `pre-desenvolvimento/issues/B1-01-camada-de-provider-whatsapp.md`

> Este documento registra o **caminho**, não só o resultado: o que foi decidido, o
> que foi descartado e por quê. Quem chegar depois deve conseguir entender as
> escolhas sem precisar reconstruir o raciocínio.

---

## 1. Onde retomar

```bash
cd CRM_exponencial
git checkout -b b1-provider-whatsapp
npm install
```

Ler antes: a issue `B1-01`, e as seções 5 e 8 deste documento.

Os dois repositórios ficam lado a lado em `Documentos/atacadoexp/`:

- `CRM_exponencial` — onde a B1-01 acontece
- `whatsapp-gateway` — o canal não oficial, outro repo, outra pessoa

---

## 2. O objetivo, em uma frase

Tirar a Meta de dentro do código de negócio, para que o canal por QR Code possa ser
plugado depois sem tocar em nenhum arquivo de negócio de novo.

Hoje o CRM chama `graph.facebook.com` direto de dentro dos arquivos de negócio. Sem
uma camada no meio, adicionar um segundo canal significaria espalhar
`if (canal === "meta")` por sete pontos em três arquivos — e de novo a cada canal
futuro.

A avaliação chama esta issue de **"pré-requisito inegociável"**
(`pre-desenvolvimento/avaliacao-whatsapp-nao-oficial.md`, item 1 de 7).

**Vale mesmo que o segundo canal nunca exista:** hoje a lógica de envio está copiada
sete vezes.

---

## 3. O que esta issue NÃO é

Ponto que gerou confusão e vale deixar explícito:

| | O que é | Nesta issue |
|---|---|---|
| **Onboarding oficial** | OAuth, registrar número, inscrever webhook, templates | **Intocado** — 7 pontos ficam como estão |
| **Onboarding não oficial** | Wizard de QR Code no CRM | Issue futura (item 5 da avaliação) |
| **Entrada de mensagem** | `api/webhooks/whatsapp/route.ts`, ~200 linhas parseando payload da Meta | **Intocado** — critério de aceite explícito |
| **Saída de mensagem** | Os 7 pontos de envio | **É isto que a issue faz** |

A B1-01 é a camada de tradução **da saída**. A tradução da entrada é o item 4 da
avaliação, issue futura — do lado do gateway já existe (`src/messages/normalizador.ts`).

---

## 4. Os 14 pontos (verificado com `grep -rn "graph.facebook.com" src`)

**Entram na camada — 7 pontos de envio:**

| Arquivo | Linha | Função |
|---|---|---|
| `src/lib/whatsapp-envio.ts` | 46 | `enviarTextoWhatsApp` (automações + sequências) |
| `src/lib/campanhas.ts` | 58 | `processarCampanhasPendentes` |
| `src/app/(auth)/chat/actions.ts` | 33 | `enviarMensagem` (texto) |
| `src/app/(auth)/chat/actions.ts` | 125 | `enviarImagem` |
| `src/app/(auth)/chat/actions.ts` | 227 | `enviarDocumento` |
| `src/app/(auth)/chat/actions.ts` | 312 | `enviarVideo` |
| `src/app/(auth)/chat/actions.ts` | 397 | `enviarAudio` |

**Ficam como estão — 7 pontos de administração da conta Meta:**

`configuracoes/whatsapp/actions.ts` (5) e `configuracoes/templates/actions.ts` (2).

Motivo: o gateway não tem OAuth, não tem WABA e não tem template. Abstrair isso
seria criar interface para algo que só um dos dois lados possui.

**Critério de fechamento:** `grep -rn "graph.facebook.com" src` só pode devolver
esses 7 de administração.

---

## 5. Decisões desta sessão

### 5.1 Coexistência no mesmo número — DESCARTADA

**Ideia avaliada:** conectar o mesmo número pelos dois canais ao mesmo tempo —
Baileys (não oficial) + Cloud API em modo coexistência — e rotear por finalidade.

**Descartada em 10/09/2026, por segurança.** Motivos:

- Coexistência **desvincula todos os dispositivos companheiros** no onboarding e só
  permite revincular uma lista aprovada. É exatamente a vaga que o Baileys ocupa —
  ele fala o protocolo multi-device como dispositivo companheiro, igual ao WhatsApp
  Web. A coexistência não ignora essa vaga: ela a policia.
- **Teto fixo de 5 mensagens/segundo** e despriorização de alto volume — o que
  arruína justamente o papel de campanha que o canal oficial teria.
- Sob coexistência o número fica amarrado à WABA: o estrago de um banimento passa a
  incluir os ativos de negócio verificados, não só o número.
- Outras restrições: sem verificação de negócio padrão, sem grupos pela API,
  necessidade de abrir o app do WhatsApp Business a cada 10–12 dias sob pena de a
  conexão expirar.

**Consequência:** os dois canais ficam em **números separados**, como o card já
assumia ("o mesmo workspace poderá ter um número na Meta e outro no gateway").

### 5.2 Roteamento por finalidade — CONSIDERADO E ADIADO

**Ideia:** o seletor receber a intenção do envio, para que conversa saísse por um
canal e campanha por outro, automaticamente:

```ts
resolverProvider(supabase, workspaceId, "conversa" | "campanha")
```

Isso coincide com a recomendação da própria avaliação (Meta para campanha e
prospecção fria; não oficial para Chat, Retenção e Sequências) — só que expressa em
código em vez de configuração, o que impediria uma campanha de sair pelo canal não
oficial por erro de configuração.

**Decisão de Luan: seguir a assinatura literal do spec.**

```ts
resolverProvider(supabase, workspaceId): Promise<ProviderWhatsApp | null>
```

Registrado aqui **não para reabrir**, mas para que quem pegar a issue do gateway
saiba que a questão foi levantada e por que a assinatura está assim. Se o roteamento
por finalidade voltar à mesa, será preciso alinhar com B6, B7 e B8, que até lá já
estarão escritas contra este contrato.

### 5.3 Tipo do cliente Supabase — NÃO É PROBLEMA

Levantei a suspeita de que a assinatura do spec (`ServiceClient`) não aceitaria o
cliente do chat, que usa RLS. **Falso alarme.**

Nem `createServiceClient` (`src/integrations/supabase/service.ts:4`) nem `createClient`
(`src/integrations/supabase/server.ts:6`) passam o generic `Database`, então os dois
resolvem para o mesmo `SupabaseClient<any, "public", any>`.

**Decisão:** assinatura literal do spec; cada chamador passa o cliente que já usa
hoje; a RLS do chat é preservada. Confirmar com `tsc` ao escrever — só se falhar é
que vira decisão.

### 5.4 Formato do motivo de erro — UNIFORME

Hoje há duas formas diferentes:

- texto, imagem, áudio → `Meta API error: {status} - {corpo}`
- documento, vídeo → `Meta API error: {status}` (sem corpo)

Um `motivo: string` só consegue ter um formato.

**Verificado quem consome:** `painel-conversa.tsx:165`, `:235`, `:270` fazem
`catch { }` — descartam o erro e só marcam a mensagem como falhada. **O texto nunca
chega ao usuário**, só ao log do servidor.

**Decisão:** formato uniforme, com o corpo incluído. Ninguém percebe a diferença e o
log fica melhor.

### 5.5 Exceção de rede — O PROVIDER NÃO ENGOLE

Se o provider capturasse exceção de `fetch` e devolvesse `ok: false`, os três
chamadores mudariam de comportamento (campanhas já tem `try/catch` próprio; chat
propaga; `whatsapp-envio` devolve `false`).

**Decisão:** `ok: false` só para resposta não-2xx. Exceção de rede continua subindo,
e cada chamador mantém exatamente o tratamento que já tem hoje.

### 5.6 Corpo da requisição — BYTE A BYTE

Detalhe fácil de errar:

- campanha manda `caption` **mesmo quando vazia** (`campanhas.ts:42`)
- chat **não manda campo nenhum** de caption (`actions.ts:135`)

**Regra:** incluir a chave apenas quando o valor foi passado (`legenda !== undefined`),
nunca quando é falsy. Mesma regra para `filename`. Assim os dois corpos saem idênticos
aos de hoje.

### 5.7 `marcarComoLida` — NASCE SEM CHAMADOR

Não existe hoje: nenhum ponto do CRM chama a Meta para marcar como lida. O
`marcarComoLidas(conversaId)` do chat (`actions.ts:653`) só zera `unread_count` no
banco — coisa diferente, apesar do nome parecido.

**Decisão:** implementar como o spec pede (`POST v21.0/{id}/messages` com
`status: "read"`), coberto por teste unitário, sem chamador nesta issue. É o único
trecho que não é pura movimentação de código.

**Nota para a issue do gateway:** o `/read` do gateway recebe `{ to }` (telefone), não
`message_id` (`contrato-v1.md:271`). Resolve-se depois com um parâmetro opcional, que
é adição retrocompatível e não quebra ninguém.

---

## 6. Achados externos (pesquisa de 10/09/2026)

### 6.1 Preço: mensagem de serviço volta a ser cobrada em 01/10/2026

**Não está registrado em nenhum documento do repo** — a
`avaliacao-whatsapp-nao-oficial.md` é de 08/09/2026 e não menciona.

Mensagem de serviço dentro da janela de 24h era **gratuita desde o fim de 2024**. A
partir de **1º de outubro de 2026** volta a ser cobrada por mensagem, valendo para
atendente humano, chatbot ou automação, sem escala de desconto por volume. Mensagem
que o cliente envia continua grátis.

**Por que importa:** o CRM Exponencial é ferramenta de conversa — Chat, Retenção e
Sequências são todos resposta a quem já falou. Esse volume era grátis e vira linha de
custo recorrente. Reforça o argumento de margem para o canal não oficial, que na
avaliação aparecia só como ganho de onboarding e de grupos.

Fontes: [AiChat](https://www.aichat.com/blog/whatsapp-business-pricing-changes-2026),
[EngageLab](https://www.engagelab.com/blog/whatsapp-pricing-2026-service-message-cost).

### 6.2 Divergências entre documentos e realidade

| Documento diz | Realidade |
|---|---|
| Card: "Next.js 15" | `package.json`: Next **16.2.4**, React 19.2.4 |
| Card: "Tem um CLAUDE.md na raiz" | Não existe. Só um `AGENTS.md` de 4 linhas |
| Avaliação: "13 pontos" | São **14** hoje — um commit recente de Embedded Signup somou mais um |
| `CLAUDE.md` do gateway: "Nenhuma lógica de WhatsApp ainda" | Desatualizado: Baileys 7.0.0-rc14, A1/A2/A3 concluídas |
| Avaliação recomenda Evolution API | Descartada depois: chave de API global não permite isolamento por cliente. Foi para Baileys direto |

### 6.3 Estado do gateway (para quem for testar local)

Funciona: criar instância, parear por QR ou código, conectar, reconectar, **receber**
mensagens normalizadas.

Não existe ainda: **enviar** (A4), fila (A6), entrega de eventos ao CRM (A7).

Rodar local não precisa do túnel SSH para a VPS — o `infra/docker-compose.dev.yml`
sobe igual no Docker Desktop local. Mas exige **Node >= 24** (a máquina tem 22.12).

Atenção: parear é usar um número real num canal fora dos Termos de Serviço do
WhatsApp. Chip de teste, nunca o número do negócio.

---

## 7. Plano de execução

| Etapa | O quê |
|---|---|
| 0 | Branch `b1-provider-whatsapp` + `npm install` |
| 1 | `src/lib/whatsapp/tipos.ts` — contrato, só tipos |
| 2 | `src/lib/whatsapp/provider-meta.ts` — único arquivo que sabe o que é `wamid`, `v21.0`, `messaging_product` |
| 3 | `src/lib/whatsapp/index.ts` — seletor |
| 4 | Os 7 pontos, do mais simples ao mais arriscado: `whatsapp-envio.ts` → `campanhas.ts` → `chat/actions.ts` |
| 5 | `src/test/whatsapp-provider.test.ts`, padrão de `automacoes.test.ts` (mocka Supabase, não precisa de banco) |
| 6 | `grep`, `npm run build`, `npm run lint`, `npm test` |
| 7 | Documentação (ver 7.1) |
| 8 | Mover issue para `concluidas_B1/` + commit |

Cada chamador **mantém o tratamento de erro que já tem**: chat lança exceção,
campanhas devolve falha dentro do `try/catch` existente, `whatsapp-envio` devolve
`false`.

### 7.1 Documentação a produzir

Nenhuma delas está na lista de arquivos do spec — são **adição deliberada**, a pedido
de Luan, e não devem ser feitas em silêncio:

1. **`src/lib/whatsapp/README.md`** — como adicionar um terceiro provider. É o que
   torna a camada modular de verdade: um programador lê um arquivo e sabe onde encostar.
2. **Cabeçalho em cada módulo novo**, no padrão que o repo já usa (`whatsapp-envio.ts:1`,
   `campanhas.ts:1`): bloco em português dizendo o que o módulo é e por que existe.
3. **Este documento**, atualizado ao fim da execução com o que mudou de rota no caminho.

**Princípio combinado:** o código pode ser otimizado e não-trivial; a documentação é
que precisa ser fácil de entender.

---

## 8. Pendências — aguardando Luan

### 8.1 `.env` de um projeto Supabase de DESENVOLVIMENTO — ⚠️ VERIFICADA em 16/09/2026

O `.env` existe nesta máquina e tem seis chaves (as quatro do `.example`, mais
`CLICKUP_API_KEY` e `GATEWAY_WEBHOOK_SECRET` — esta última **órfã**, não referenciada
em nenhum lugar de `src/`).

**Achado que corrige a suposição original desta seção:** não existe Supabase de
desenvolvimento. Existe **uma Supabase só**, e o `.env` local aponta exatamente para
ela. Verificado sem depender de documentação: o projeto `lvlypfvqnfgahihxdosn`
aparece no bundle JS servido por `crm-exponencial.vercel.app`, que é produção.

**O que atenua:** os 18 workspaces lá dentro são todos dados de teste —
`Empresa Busca`, `Empresa Classif`, `Luan Teste`, `Marcelle Teste`,
`Empresa Login E2E`, `Empresa E2E Ltda`, `Outra Empresa` — mais `Atacado Exponencial`
(03/09/2026). **Nenhum cliente real.** A suíte sempre rodou contra essa base; os 18
workspaces são resto de limpeza que falhou em `afterAll`, não clientes.

**O que isso muda:** "sujar a base do cliente" hoje é risco teórico, porque não há
cliente. Vira risco concreto no dia em que o primeiro entrar. O prazo para separar as
bases é **antes do primeiro cliente real**, não antes desta issue.

#### Divisão verificada dos 14 arquivos de teste — 7 e 7

Números da seção original ("8 dos 14") estavam próximos, mas a lista exata importa
para saber o que dá para rodar sem risco:

| Escrevem no banco (7) | Não tocam no banco (7) |
|---|---|
| `contatos-classificacao.integration` | `automacoes` |
| `contatos-lista.integration` | `cadastro` |
| `contatos-perfil.integration` | `cadastro-empresa.integration` (mocka a lib inteira) |
| `mensagens.integration` | `caixa-de-entrada.integration` (mocka o service client) |
| `perfil.integration` | `contato-classificacao` |
| `times.integration` | `metricas-dashboard` |
| `usuarios.integration` | `sequencias` |

O `.integration` no nome engana: dois deles mockam tudo e são seguros.

**Consequência prática:** os testes novos da B1-01 nascem na metade segura — o plano
já manda seguir o padrão de `automacoes.test.ts`, que mocka `createServiceClient` com
um builder de chain. Dá para desenvolver e validar a issue inteira sem uma única
escrita no banco.

#### Linha de base medida (16/09/2026, antes de qualquer alteração)

- `npm install` — exit 0
- `npm run build` — **exit 0**, prerender das páginas autenticadas incluído. Isto
  responde a dúvida que a versão anterior desta seção deixou em aberto.
- Metade segura da suíte — **7 arquivos, 57 testes, todos passando**, 1,85s

A metade que escreve não foi executada de propósito. Rodar `npm test` cheio, hoje,
escreve na mesma base que o app de produção lê.

### 8.2 Existe ambiente com número Meta conectado? — ❌ BLOQUEADA (16/09/2026)

Luan afirmou em 16/09/2026 que há número conectado e envio funcionando. **A
verificação contradiz.** Registrado aqui porque é o tipo de coisa que, se não for
escrita, volta a custar uma sessão inteira.

**O que o banco diz:** existe uma linha em `whatsapp_connections`, `status:
"connected"` — número `+55 11 95502-2963`, `phone_number_id` `1167696503100575`,
`waba_id` `27420871967573417`, criada em 21/07/2026.

**O que a Meta diz:** o `access_token` guardado nessa linha foi testado contra a Graph
API em 16/09/2026 e devolve, em três endpoints diferentes:

```
code 190 — OAuthException
"Error validating application. Application has been deleted."
```

Não é token expirado. É o **app da Meta que emitiu o token tendo sido apagado**.

**Reconstrução do que aconteceu:** o commit `6aa7189` (21/07/2026, 15:25 -0300) trocou
o `config_id` do Embedded Signup para `4461281834113539`, do app `1674785157105627`.
A conexão foi criada às 15:41 -0300 do mesmo dia — 16 minutos depois. Ou seja, ela
nasceu do app `1674785157105627`, e é esse app que hoje não existe mais.

**O `status: "connected"` do banco é opinião nossa, não da Meta.** Nada no CRM revalida
o token; a coluna ficou congelada em "connected" desde julho. Vale registrar como
achado de produto, fora do escopo desta issue: não existe detecção de conexão morta.

**Consequência para a B1-01:** o degrau de prova real fica **bloqueado** — nenhum envio
sai e nenhum webhook entra enquanto o número não for reconectado por Embedded Signup
com um app vivo. Os degraus que não dependem da Meta (corpo de requisição congelado,
`grep`, build, lint, metade segura da suíte) cobrem a issue inteira e **não estão
bloqueados**.

**Decisão:** seguir com a implementação. A prova real vira item de acompanhamento
explícito, a ser feito quando o número voltar — e não é desta issue a tarefa de
reconectar.

**Sinal de vida para quando reconectar:** a última mensagem trocada é de
**21/07/2026**, e a última *recebida* é de **04/06/2026**. Mesmo com app novo, a janela
de atendimento de 24h da Meta está fechada há meses: a primeira mensagem tem que
**partir do celular pessoal para o número do negócio**, nunca o contrário, sob pena de
erro `131047` (re-engajamento).

### 8.3 Branch: integrar logo ou segurar

Recomendação: integrar logo após verificar. `chat/actions.ts` tem 768 linhas e está em
desenvolvimento ativo; branch longa troca um risco pequeno por um conflito grande.
Além disso a B1-01 é refatoração que preserva comportamento e melhora o código
sozinha.

O isolamento do canal não oficial não vem do git — vem do seletor e dos dados. Um
workspace que nunca escaneou QR nunca executa uma linha do gateway, e isso vale em
produção, permanentemente. Branch protege até o merge; o seletor protege sempre.

Não trava o início: só muda o que acontece na Etapa 8.

---

## 9. Regras que valem para a execução

- Toda lógica de negócio no backend. Nada de provider em componente React.
- Nenhum secret no frontend. `access_token` não sai do servidor.
- **Não mudar comportamento**: mesma URL, mesma versão (`v21.0`), mesmo corpo, mesmo
  tratamento de erro. É movimentação de código, não reescrita.
- Branch própria, nada direto na `master`.
- Precisou mexer em arquivo fora da lista? **Parar e perguntar.**
- Código e identificadores em inglês; comentários, documentação e conversa em pt-BR.

---

## 10. Execução — 16/09/2026

Implementada na worktree `.claude/worktrees/b1-provider`, branch
`worktree-b1-provider`, a partir de `origin/master` (`a5a24c7`). A pasta principal
não foi tocada. Nada commitado nem enviado.

### 10.1 O que mudou de rota em relação ao plano

**Decisão 5.3 confirmada na prática.** A suspeita sobre o tipo do cliente Supabase
era infundada, e agora está provada: `npm run build` passa com o mesmo
`resolverProvider` recebendo o service client (em `whatsapp-envio.ts` e
`campanhas.ts`) e o cliente SSR com RLS (nos cinco pontos do chat). Não foi
preciso cast nem generic.

O seletor declara o cliente por **tipo estrutural** — só a cadeia
`.from().select().eq().eq().limit().maybeSingle()` que ele realmente usa — em vez
de importar o tipo do supabase-js. Efeito colateral bom: os testes passam um stub
de dez linhas, sem mock de módulo.

**O `grep` de fechamento precisa de leitura mais fina do que a issue supunha.** O
critério escrito era "`grep -rn "graph.facebook.com" src` devolve só os 7 de
administração". Depois da refatoração ele devolve 10 ocorrências: os 7 de
administração, 2 em `provider-meta.ts` e 1 no teste de corpo.

Isso não é falha — é consequência inevitável de a camada existir: **alguém tem que
saber a URL, e o objetivo era que fosse um arquivo só.** O critério que realmente
importa, e que passa, é o primeiro da lista: nenhuma ocorrência nos três arquivos
de envio.

**Troca de `.single()` por `.maybeSingle()` no caminho do chat.** Os cinco pontos do
chat usavam `.single()`, que devolve erro quando não há linha; o seletor usa
`.maybeSingle()`, que devolve `data: null`. O comportamento visível é o mesmo — a
mensagem de erro continua sendo exatamente `"Conexão WhatsApp não encontrada"` —
mas agora ela vem de `if (!provider)` em vez de `if (errConn || !conn)`.

### 10.2 Medições

| Verificação | Antes | Depois |
|---|---|---|
| `npm run build` | exit 0 | **exit 0** |
| `npm run lint` | 0 erros, 1 aviso | **0 erros, 1 aviso** |
| Suíte segura (7 arquivos) | 57 passando | **57 passando** |
| Testes novos | — | **22 passando** |
| `graph.facebook.com` nos 3 arquivos de envio | 7 | **0** |

O aviso do lint é pré-existente e fica em
`configuracoes/usuarios/adicionar-usuario-dialog.tsx`, arquivo que esta issue não
tocou (confirmado no `git status`).

Linhas: 187 inseridas, 205 removidas nos arquivos modificados. A refatoração
**encolheu** o código de negócio — a lógica de envio estava copiada sete vezes.

### 10.3 O que continua em aberto

Um único item do checklist: a prova manual de enviar texto e imagem pelo Chat e
ver as duas chegarem. Segue bloqueada pelo motivo da seção 8.2 — o app da Meta que
emitiu o token foi apagado.

**Nada além dessa prova depende de número conectado.** Os outros 16 itens do
checklist fecharam.

### 10.4 Suíte completa executada — 16/09/2026

Rodada **depois** dos dois commits, de propósito: assim o marco verde já estava
guardado, e um tropeço de ambiente não contaminaria a leitura do trabalho.

**Resultado: 140 testes, 120 passaram, 20 falharam em 3 arquivos.**

**Nenhuma das falhas é atribuível à B1-01.** As 10 mensagens de erro são todas a
mesma: `Request rate limit reached`, no `signInWithPassword` do Supabase Auth.
Zero erros fora dessa categoria — contado, não estimado.

A prova de que não é regressão é estrutural, não empírica: os três arquivos que
falharam — `contatos-lista`, `times` e `usuarios` — não importam nada do que a
issue tocou. Só os clientes Supabase, o vitest, `listarContatos` e as actions de
times. Não existe caminho de código em comum.

Vale registrar por que não re-executamos para comparar: o rate limit continuaria
ativo e derrubaria a re-execução do mesmo jeito, inclusive contra a `master` sem
a mudança. O teste empírico seria confundido; o argumento de importação não.

Os 13 arquivos que passaram incluem **todos** os do caminho de WhatsApp:
`mensagens.integration`, `caixa-de-entrada.integration`, `automacoes`,
`sequencias` e os dois novos de provider.

**Causa provável:** a suíte autentica dezenas de usuários em rajada contra um
Supabase remoto. É propriedade de rodar tudo de uma vez, não da mudança. Quem for
mexer nisso um dia: o caminho é espaçar as autenticações ou reusar sessão entre
testes do mesmo arquivo.

**Sujeira deixada na base**, medida contra a leitura do começo do dia:

| Tabela | Antes | Depois |
|---|---|---|
| `workspaces` | 18 | **19** |
| `contacts` | 30 | **33** |
| `conversations` | 2 | 2 |
| `messages` | 35 | 35 |

Um workspace e três contatos sobraram. Confirma o que a seção 8.1 previu: a
limpeza do `afterAll` não é perfeita, e é essa a origem dos 18 workspaces de lixo
que já estavam lá. Enquanto não houver cliente real na base, o custo é esse.

---

## 11. Correção pós-deploy — 17/09/2026

O primeiro deploy da branch na Vercel (`5428072`) **falhou**. O build de produção
quebrou no type check, em seis arquivos, com a mesma mensagem repetida:

```
Type error: Argument of type 'SupabaseClient<any, "public", "public", any, any>'
is not assignable to parameter of type 'ClienteSupabase'.
  The types returned by 'from(...).select(...).eq(...).eq(...).limit(...).maybeSingle()'
  are incompatible between these types.
    Type 'PostgrestBuilder<any, GenericStringError | null, false>' is missing the
    following properties from type 'Promise<{ phone_number_id: string;
    access_token: string; } | null>': catch, finally, [Symbol.toStringTag]
```

### 11.1 A decisão 5.3 estava errada — revogada

A seção 5.3 concluiu "NÃO É PROBLEMA" e a 10.1 disse que estava "provado na
prática". As duas coisas estão erradas, e a segunda mais do que a primeira.

O erro não era o que a 5.3 investigou. A 5.3 perguntou *"o cliente do chat com RLS
e o service client são o mesmo tipo?"* — e a resposta continua sendo **sim**, os
dois resolvem para `SupabaseClient<any, "public", "public", any, any>`. Essa parte
estava certa.

O que estava errado foi a **forma como o seletor declarava o parâmetro**. Em vez
de usar o tipo do supabase-js, `index.ts` descrevia à mão a cadeia
`.from().select().eq().eq().limit().maybeSingle()`, e nessa descrição errou dois
pontos que só aparecem quando um cliente de verdade encosta no tipo:

1. **`maybeSingle()` não devolve `Promise`.** Devolve `PostgrestBuilder`, que é um
   *thenable* — tem `then`, não tem `catch`, `finally` nem `Symbol.toStringTag`.
   Um `Promise` declarado à mão nunca aceita um thenable.
2. **O `data` não é o objeto selecionado.** Sem o generic `Database`, o postgrest-js
   não consegue resolver a string `"phone_number_id, access_token"` contra schema
   nenhum, e o `Result` vira `GenericStringError | null`.

Repare que o tipo estrutural **compila sozinho** e os testes **passam**, porque o
stub do teste era escrito contra a mesma descrição errada. Os dois lados
concordavam entre si e discordavam da realidade. O erro só aparece nos seis
chamadores, que passam clientes de verdade.

### 11.2 Por que o `npm run build` da seção 10.1 não pegou isso

Esta é a parte que importa mais do que o bug.

O `next build` imprime, **nesta ordem**:

```
✓ Compiled successfully in 3.5s
  Running TypeScript ...
Failed to type check.
```

O `✓ Compiled successfully` é do Turbopack e vem **antes** do type check. Ele não
significa que o build passou — significa que o bundle foi gerado. Ler aquele `✓` e
parar ali é exatamente o que produz um registro dizendo "`npm run build` passa"
enquanto o build falha.

**Regra daqui pra frente:** o critério de aceite não é ver um `✓` no meio da saída.
É o **exit code** do comando. Quando for registrar que passou, rode
`npm run build; echo "exit=$?"` e cole o `exit=0` — ou rode `npx tsc --noEmit`, que
não tem saída intermediária para confundir.

### 11.3 A correção

`ClienteSupabase` agora vem da fábrica, e não de uma descrição à mão:

```ts
export type ClienteSupabase = ReturnType<typeof createServiceClient>
```

É o mesmo idioma que `whatsapp-envio.ts:8` já usava antes desta issue — quer dizer
que a solução estava no repositório o tempo todo. Vantagem sobre importar
`SupabaseClient` direto do supabase-js: não depende da aridade dos generics, que
mudou entre versões (`<any, "public", any>` virou `<any, "public", "public", any, any>`).

**Custo, declarado:** o stub de dez linhas do teste agora precisa de
`as unknown as ClienteSupabase`. A seção 10.1 tratava "stub sem cast" como efeito
colateral bom do tipo estrutural. Era, mas era o efeito colateral de um tipo que não
descrevia o cliente real — e um stub que casa perfeitamente com o parâmetro é
justamente o que impediu o teste de pegar o bug. O cast é mais honesto: diz que
aquilo é um dublê, não um cliente.

O type check, o lint e os dois arquivos de teste do provider passam. O resto da
suíte continua como a seção 10.4 descreve — mesmos 3 arquivos, mesmo
`Request rate limit reached`, nenhum ligado ao caminho de WhatsApp.
