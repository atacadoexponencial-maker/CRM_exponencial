# Spec: Banco de teste separado do de produção

> série: B46
> estado: aprovada em 27/10/2026

## Visão Geral

Hoje existe um banco só. Clientes, testes automáticos, preview da Vercel e a
empresa "[TESTE] Automações B11" gravam todos no mesmo lugar. Isso causa três
problemas:

1. **Migration nova só pode ser testada na produção.** Aplicar a migration para
   testar já é aplicá-la para todo mundo. Por isso a B28-07 e a B45 ficaram
   paradas esperando o código ficar 100% pronto.
2. **Teste pode estragar dado real.** Os testes criam e apagam usuários,
   contatos e pedidos. Hoje a única proteção é a regra de mexer só em empresa
   "[TESTE]".
3. **Os testes gastam o limite de login da produção.** A suíte inteira bate no
   limite de autenticação do Supabase, o mesmo que os clientes usam para entrar.

A mudança cria um **segundo banco, só de teste**, com a mesma estrutura da
produção. Os testes automáticos e o preview passam a usá-lo. A produção não
muda. Os testes com chip de WhatsApp continuam na produção, porque a Meta e o
gateway mandam as mensagens para lá.

É para quem desenvolve (Marcelle, Luan e as sessões do Claude). O cliente não vê
diferença nenhuma.

## Páginas / Módulos

### 1. O banco de teste

**Descrição:** um projeto Supabase novo, numa organização própria e gratuita ("crm-exponencial-teste"),
no plano grátis. Tem a mesma estrutura da produção e nenhum dado de cliente.

**Componentes:**
- Banco de teste: as mesmas tabelas, funções, regras de acesso e pastas de
  arquivos da produção, sem nenhum dado de cliente.

**Comportamentos:**
- Estrutura igual à da produção: toda migration que está no `master` também está
  aplicada no banco de teste.
- Pastas de arquivos iguais: as mesmas pastas da produção (fotos, anexos,
  catálogo), com os mesmos limites de tamanho e de tipo de arquivo.
- Login igual: dá para criar usuário e entrar com e-mail e senha, como na
  produção.
- Nenhum dado de cliente: no banco de teste só existem empresas cujo nome começa
  com "[TESTE]".

**Critérios de aceite:**

#### CA-B46-01 — o banco de teste tem todas as migrations do master · prova: automática

- **Dado** o banco de teste criado
- **Quando** se compara a lista de migrations aplicadas nele com a pasta de
  migrations do `master`
- **Então** as duas listas são iguais, sem nenhuma faltando

#### CA-B46-02 — as pastas de arquivos são as mesmas da produção · prova: automática

- **Dado** o banco de teste criado
- **Quando** se compara a lista de pastas de arquivos dele com a da produção
- **Então** as pastas são as mesmas, com os mesmos limites de tamanho e de tipo
  de arquivo e a mesma regra de pública ou privada

#### CA-B46-03 — dá para criar usuário e entrar no banco de teste · prova: automática

- **Dado** o banco de teste criado
- **Quando** um teste cria um usuário com e-mail e senha e entra com ele
- **Então** o login funciona, sem pedir confirmação de e-mail, igual à produção

#### CA-B46-04 — o banco de teste não tem empresa de cliente · prova: automática

- **Dado** o banco de teste em uso
- **Quando** se comparam as empresas dele com as da produção
- **Então** nenhuma empresa da produção existe no banco de teste (pelo identificador; empresas criadas pelos próprios testes e a "[TESTE]" recriada lá não contam). Critério trocado pela Marcelle em 27/10/2026: antes pedia que todas começassem com "[TESTE]", o que falhava com as empresas temporárias dos testes

### 2. Testes automáticos

**Descrição:** os testes de integração (Vitest) passam a rodar no banco de teste
e se recusam a rodar na produção.

**Componentes:**
- Arquivo de ambiente do banco de teste: guarda o endereço e as chaves do banco
  de teste, separado do `.env.local`, até a troca (módulo 6).
- Trava dos testes: confere, antes de qualquer teste de integração, para qual
  banco eles estão apontando.

**Comportamentos:**
- Rodar os testes de integração no banco de teste.
- Ser barrado ao tentar rodar os testes de integração contra a produção.
- Ser avisado quando o banco de teste estiver fora do ar ou pausado.

**Critérios de aceite:**

#### CA-B46-05 — os testes de integração rodam no banco de teste · prova: automática

- **Dado** o ambiente apontando para o banco de teste
- **Quando** a suíte de integração roda
- **Então** os registros criados pelos testes aparecem no banco de teste e
  nenhum aparece na produção

#### CA-B46-06 — os testes se recusam a rodar contra a produção · prova: automática

- **Dado** o ambiente apontando para o banco de produção
- **Quando** alguém roda um teste de integração
- **Então** nenhum teste roda e aparece a mensagem "os testes de integração só
  rodam no banco de teste", sem nenhuma gravação na produção

#### CA-B46-07 — a suíte de integração inteira passa no banco de teste · prova: automática

- **Dado** o banco de teste com todas as migrations do `master`
- **Quando** a suíte de integração inteira roda nele
- **Então** todos os testes passam

#### CA-B46-08 — banco fora do ar dá aviso claro · prova: automática

- **Dado** o banco de teste que não responde (pausado ou fora do ar)
- **Quando** alguém roda um teste de integração
- **Então** aparece a mensagem "o banco de teste não respondeu: confira se ele
  está pausado no painel do Supabase", em vez de dezenas de testes falhando cada
  um com um erro diferente

### 3. Preview da Vercel

**Descrição:** o preview de cada branch passa a usar o banco de teste. A
produção continua no banco de produção.

**Comportamentos:**
- Entrar no preview com o login da empresa de teste do banco de teste.
- Tudo o que se faz no preview grava no banco de teste.
- A produção continua lendo e gravando só no banco de produção.

**Critérios de aceite:**

#### CA-B46-09 — o que se faz no preview grava no banco de teste · prova: automática

- **Dado** um preview publicado depois da mudança
- **Quando** um roteiro entra no preview com o admin da empresa de teste e cria
  uma etiqueta
- **Então** a etiqueta aparece no banco de teste e não aparece na produção

#### CA-B46-10 — a produção continua no banco de produção · prova: manual

- **Dado** a mudança no ar
- **Quando** a Marcelle entra em `crm-exponencial.vercel.app` com o login dela
- **Então** ela vê as mesmas empresas, contatos e conversas de antes, e o chat
  com o número conectado continua recebendo mensagem

#### CA-B46-11 — os roteiros de tela rodam no preview com o banco de teste · prova: automática

- **Dado** o preview usando o banco de teste e a empresa de teste criada nele
- **Quando** o roteiro dos menus (`roteiro-menus.cjs`) roda contra o preview
- **Então** todas as verificações dão `OK`

### 4. Empresa de teste no banco de teste

**Descrição:** a "[TESTE] Automações B11" passa a existir também no banco de
teste, com os mesmos dados de partida. A da produção fica como está, só para os
testes com chip.

**Comportamentos:**
- Criar a empresa de teste no banco de teste com um comando.
- Voltar a empresa de teste ao estado inicial com o comando que já existe.
- Escolher, nos roteiros, em qual banco eles rodam: o padrão é o de teste.

**Critérios de aceite:**

#### CA-B46-12 — a empresa de teste nasce no banco de teste com um comando · prova: automática

- **Dado** o banco de teste sem a empresa de teste
- **Quando** alguém roda o comando que cria a empresa de teste
- **Então** a "[TESTE] Automações B11" existe no banco de teste com os mesmos
  dados de partida da produção (Ana, Bruno e Carla, as conversas, a etiqueta
  "Interessado" e o admin no time Entrada), e o login dela é gravado no arquivo
  de ambiente do banco de teste

#### CA-B46-13 — o reset volta a empresa de teste ao estado inicial no banco de teste · prova: automática

- **Dado** a empresa de teste do banco de teste com dados criados por um roteiro
- **Quando** alguém roda o comando de reset
- **Então** ela volta ao estado inicial e a empresa de teste da produção não muda

### 5. Migration nova testada antes da produção

**Descrição:** toda migration nova passa a ser aplicada primeiro no banco de
teste. Ela só vai para a produção depois de testada.

**Comportamentos:**
- Aplicar uma migration só no banco de teste.
- Aplicar na produção depois, pelo mesmo caminho de hoje.

**Critérios de aceite:**

#### CA-B46-14 — dá para aplicar migration só no banco de teste · prova: automática

- **Dado** uma migration nova que ainda não está em nenhum dos dois bancos
- **Quando** alguém usa o comando de aplicar migration no banco de teste
- **Então** ela aparece aplicada no banco de teste e continua faltando na
  produção

#### CA-B46-15 — a próxima migration nova é testada no banco de teste antes da produção · prova: manual

> Trocado em 28/10/2026 (Marcelle): as migrations da B45 já tinham ido para a
> produção em 27/10, antes do banco de teste ficar pronto. O critério passa a
> valer para a primeira migration nova depois da série.

- **Dado** a primeira migration nova commitada depois da B46, ainda não aplicada
  na produção
- **Quando** ela é aplicada no banco de teste e os testes da série dela rodam lá
- **Então** a Marcelle confere que os testes passaram no banco de teste e que a
  produção só recebeu a migration depois disso

### 6. Troca do `.env.local` e documentação

**Descrição:** enquanto a B45 estiver em andamento na pasta principal, o banco
de teste fica num arquivo de ambiente próprio. Depois que a B45 for commitada no
`master`, o `.env.local` passa a apontar os testes para o banco de teste, sem
precisar perguntar a ninguém. A documentação passa a dizer qual banco é qual.

**Comportamentos:**
- Trocar o banco dos testes locais depois do commit da B45.
- Ler, no `CLAUDE.md` e no README dos roteiros, qual banco cada coisa usa.

**Critérios de aceite:**

#### CA-B46-16 — a troca só acontece depois do commit da B45 · prova: manual

- **Dado** o banco de teste pronto e a B45 ainda sem commit no `master`
- **Quando** o commit da B45 aparece no `master`
- **Então** o `.env.local` passa a apontar os testes para o banco de teste, e
  antes desse commit ele não muda

#### CA-B46-17 — a documentação diz qual banco é qual · prova: manual

- **Dado** a mudança no ar
- **Quando** alguém lê o `CLAUDE.md` e o `e2e/preview/README.md`
- **Então** os dois dizem que a produção e o banco de teste são separados, que o
  preview e os testes usam o de teste, que os testes com chip e os roteiros de
  envio usam a produção, e como aplicar migration no banco de teste. O aviso
  "o Supabase é um só" sai dos dois

### 7. Roteiros que mandam mensagem de verdade

**Descrição:** os roteiros B11-05 e B11-07 mandam mensagem de verdade pelo chip,
que está conectado só na produção. Eles passam a rodar contra a produção, na
empresa "[TESTE]" de lá.

**Comportamentos:**
- Rodar os roteiros de envio contra a produção.
- Ser barrado ao tentar rodá-los contra o preview.

**Critérios de aceite:**

#### CA-B46-18 — os roteiros de envio rodam na produção · prova: automática

- **Dado** a mudança no ar
- **Quando** alguém roda o roteiro B11-05 ou o B11-07 com um endereço de preview
- **Então** ele para antes de enviar e avisa "este roteiro envia mensagem de
  verdade: rode contra a produção", e com o endereço da produção ele usa a
  empresa "[TESTE]" da produção

### 8. Banco de teste sempre acordado

**Descrição:** o plano grátis pausa o banco depois de 7 dias sem uso. Uma rotina
diária usa o banco de teste para que ele nunca pause.

**Comportamentos:**
- O banco de teste recebe um acesso por dia, sem ninguém fazer nada.

**Critérios de aceite:**

#### CA-B46-19 — a rotina diária usa o banco de teste · prova: automática

- **Dado** a rotina diária ligada
- **Quando** ela roda
- **Então** o banco de teste registra o acesso do dia, e a produção não recebe
  nada da rotina

#### CA-B46-20 — o banco de teste não pausa · prova: manual

- **Dado** a rotina ligada e 8 dias seguidos sem ninguém rodar teste
- **Quando** a Marcelle abre o painel do Supabase
- **Então** o projeto do banco de teste aparece ativo, não pausado

## Fora de escopo

- Supabase Branching (um banco por preview).
- Copiar dados da produção para o banco de teste.
- Apagar da produção a empresa "[TESTE]" ou os restos de testes antigos.
- Teste com chip de WhatsApp: continua na produção.
- O comando `/limpar-banco`: continua agindo na produção, como hoje.
- O gateway e o webhook da Meta: continuam apontando só para a produção.
- As rotinas da Vercel (crons): continuam rodando só na produção.
- Gerar os tipos do banco: continua a partir da produção.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B46-01 | O banco de teste fica na mesma região da produção (us-west-2), perto das funções da Vercel, para os testes de tempo de resposta (como o do webhook na B11-09) valerem igual | invalidada | O banco de teste fica em us-east-1 (Virgínia); a Marcelle preferiu não refazer o projeto. Teste de tempo de resposta que falhar só por distância não é defeito do código (Marcelle, 27/10/2026) |
| SUP-B46-02 | O Claude cria o projeto pela CLI do Supabase, que já está logada na conta da organização, e grava a senha do banco só no arquivo de ambiente local | invalidada | A Marcelle cria o projeto pelo painel, para ver o custo antes; o Claude faz o resto (Marcelle, 27/10/2026) |
| SUP-B46-03 | O Luan já tem acesso ao banco de teste por ser membro da organização "Atacado Exponencial"; as chaves chegam a ele do mesmo jeito que as da produção | invalidada | O banco de teste fica na organização própria "crm-exponencial-teste", no plano grátis; o Luan precisa ser convidado para ela (Marcelle, 27/10/2026) |
| SUP-B46-04 | Os segredos do gateway e da Meta no preview continuam os mesmos de hoje: sem número conectado no banco de teste, o preview não envia nada | confirmada | Marcelle, 27/10/2026 |
| SUP-B46-05 | A rotina que mantém o banco acordado não usa nenhuma das rotinas diárias da Vercel, que já estão no limite do plano | confirmada | Marcelle, 27/10/2026 |
| SUP-B46-06 | A trava vale para a execução inteira do Vitest, inclusive os testes de unidade: sem `.env.teste.local`, nenhum teste roda | confirmada | Marcelle, 27/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B46-01 | Projeto novo ou Supabase Branching? | respondida | Projeto novo, numa organização própria e gratuita ("crm-exponencial-teste"), criada pela Marcelle para não pagar (Marcelle, 27/10/2026) |
| PER-B46-02 | O preview também usa o banco de teste ou só os testes automáticos? | respondida | O preview também (Marcelle, 27/10/2026) |
| PER-B46-03 | Onde fica a empresa "[TESTE] Automações B11"? | respondida | Nos dois bancos: no de teste, recriável pelo reset; na produção, só para teste com chip (Marcelle, 27/10/2026) |
| PER-B46-04 | Onde rodam os roteiros que mandam mensagem de verdade (B11-05 e B11-07)? | respondida | Na produção, na empresa "[TESTE]" de lá (Marcelle, 27/10/2026) |
| PER-B46-05 | O que fazer com a pausa de 7 dias do plano grátis? | respondida | Uma rotina diária mantém o banco acordado (Marcelle, 27/10/2026) |
| PER-B46-06 | Quando trocar o `.env.local` para o banco de teste? | respondida | Logo depois que a B45 for commitada no `master`, sem perguntar (Marcelle, 27/10/2026) |
