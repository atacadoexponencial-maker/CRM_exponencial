# B11-02: Motor que percorre o fluxo de blocos, sem quebrar as regras de hoje

**Tipo:** Implementação
**Página:** Motor de automações
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Decisões:** `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md`
**Depende de:** nada (fundação; B11-03 a B11-09 dependem dela)

## Descrição

Trocar a estrutura da regra: em vez de um gatilho e uma ação, um fluxo de
blocos (gatilho, condição, ação) e ligações entre eles. O motor passa a
percorrer o fluxo a partir do gatilho: numa condição, avalia as verificações
(E) e segue pelo "sim" ou pelo "não"; numa ação, executa e segue, mesmo que a
ação falhe; termina numa saída sem ligação.

As regras existentes ganham o fluxo equivalente (gatilho → ação) sem o admin
fazer nada, e continuam funcionando igual. **A migration só acrescenta**: a
estrutura antiga fica no banco, intacta, porque o `master` publicado continua
lendo dela até o merge (ver a seção 4 das decisões). A limpeza é depois do
merge.

As verificações e ações desta issue são só as que já existem hoje, mais as de
canal e de conversa (etiqueta, atendente, funil e etapa); as demais entram nas
próximas.

Cobre, no "Motor": avaliar regras, percorrer o fluxo, aplicar condições,
executar ações, guardar as regras existentes.

## Pronto quando

Depois da migration, as automações que existiam seguem disparando igual (card
movido e conversa criada), e o CRM publicado (ainda no código antigo) não é
afetado. Um fluxo criado por script, "gatilho → condição de canal → sim:
etiqueta e depois mensagem / não: outra mensagem", executa o caminho certo
conforme o canal. Testes automatizados do motor cobrem condição com sim e com
não, ação que falha no meio do caminho, caminhos que se juntam, saída sem
ligação encerrando o caminho, e fluxo com laço recusado.

## Plano (07/10/2026)

### Decisões do plano

Os três pontos que a ata de 30/09 deixou em aberto foram fechados aqui. O
raciocínio completo está na seção 5 de `decisoes/B11-automacoes-em-fluxo.md`.

- **Os fluxos ficam numa tabela nova, `automation_flows`**, com o fluxo inteiro
  numa coluna `jsonb`. A tabela `automations` não é tocada.
- **As regras antigas não são copiadas para a tabela nova.** O motor lê cada uma
  e monta, na hora, o fluxo equivalente de dois blocos (gatilho → ação). Isso
  substitui a "migration que converte cada regra", que a descrição acima
  previa. A conversão para linhas de verdade fica para o merge.
- **O teste no preview usa um contato de teste**, porque as ações acontecem de
  verdade. Só os gatilhos que nascem no CRM chegam ao preview: o card movido
  chega, e a conversa criada não (ela nasce de mensagem recebida).

### Cenários

#### Happy Path

1. Um card é movido para uma etapa. O pipeline chama `processarAutomacoes`, com
   a mesma assinatura de hoje.
2. O motor confere se o contato está na lixeira. Se estiver, para ali (B13-03).
3. O motor carrega as regras ativas do workspace para aquele gatilho, das duas
   origens: as antigas, em `automations`, viram fluxo de dois blocos na hora; as
   novas, em `automation_flows`, já são fluxo.
4. As regras rodam na ordem de criação, misturando as duas origens.
5. Para cada regra, o motor confere se o bloco de gatilho corresponde ao evento
   (funil e etapa, quando configurados) e percorre o fluxo:
   - **Condição:** avalia todas as verificações (E) e segue pela saída "sim" ou
     "não".
   - **Ação:** executa e segue pela saída "próximo", mesmo que a ação falhe.
   - **Saída sem ligação:** o caminho termina.

#### Edge Cases

- **Caminhos que se juntam:** um bloco que recebe duas ligações roda uma vez só
  por execução, porque cada execução segue um caminho só.
- **Verificação sobre a conversa sem conversa aberta** (canal, etiqueta,
  atendente): conta como "não vale", e o caminho segue pelo "não". Vale também
  para "não tem a etiqueta": sem conversa, o motor não consegue afirmar nada.
- **Canal de conversa sem número gravado:** não vale. O canal sai do número da
  conversa (`whatsapp_connection_id`), sem cair no número do workspace, porque
  a condição pergunta pela conversa.
- **Card do contato está em `funil:etapa`, sem card naquele funil:** não vale.
- **Verificação ou ação que o motor ainda não sabe executar** (tag,
  classificação, horário, mensagem rápida etc.): a verificação não vale, e a
  ação conta como falha e o caminho segue. O editor ligado ao banco não vai
  deixar salvar esses blocos, então isso só acontece com fluxo gravado por fora.
- **Fluxo com estrutura quebrada** (sem gatilho, mais de um gatilho, ligação
  inválida ou laço): a regra não roda. É o mesmo teste que o editor faz ao
  salvar, em `problemasDeEstrutura`. Parâmetro faltando em um bloco não impede
  a regra: a ação falha sozinha, como hoje.
- **Laço que escapou da validação:** o percurso para ao voltar a um bloco já
  visitado. É uma segunda proteção, para nunca rodar sem fim.
- **Evento sem contato** (`card_movido` com `contactId` nulo): as ações falham
  e as verificações não valem, como hoje.
- **Ação de automação não dispara outro gatilho:** mover card, aplicar etiqueta
  e atribuir atendente gravam direto no banco, sem chamar o motor de novo. Isso
  não muda.

#### Cenário de Erro

- Erro numa ação (exceção, `error` do Supabase ou envio recusado) marca só
  aquela ação como falha, e o caminho segue.
- Erro ao carregar as regras ou ao avaliar uma condição encerra aquela regra.
  As outras regras do mesmo evento rodam normalmente.
- Nenhum erro sai de `processarAutomacoes`: o recebimento da mensagem, o
  webhook e o pipeline nunca caem por causa de automação.
- O motivo de cada falha ainda não é gravado em lugar nenhum. O histórico é a
  B11-03. Por enquanto, o percurso devolvido por `percorrerFluxo` diz quais
  ações falharam, e é isso que os testes conferem.

### Banco de Dados

Migration **só de acréscimo**: `supabase/migrations/20261007000000_automation_flows.sql`.

- Tabela: `automation_flows` (regra em fluxo de blocos)
  - `id` (uuid, pk) — identificador da regra
  - `workspace_id` (uuid, fk `workspaces`) — empresa dona da regra
  - `nome` (text) — nome da regra
  - `ativa` (boolean, padrão `true`) — pausada quando `false`
  - `fluxo` (jsonb) — `{ blocos, ligacoes }`, no formato do tipo `Fluxo` de
    `src/lib/fluxo-automacao.ts`
  - `gatilho_tipo` (text, **gerada** a partir do bloco de gatilho do `fluxo`) —
    serve para o motor buscar só as regras do gatilho que aconteceu. Por ser
    gerada, não tem como ficar diferente do fluxo, e fluxo sem gatilho é
    recusado pelo `not null`.
  - `created_at` (timestamptz) — define a ordem de execução
- Índice em `(workspace_id, gatilho_tipo)` só das regras ativas.
- RLS igual à de `automations`: membros do workspace leem, admin grava. O motor
  usa o service client.
- `automations` não muda. O `master` publicado continua lendo dela.
- Aplicar com `npx supabase db push --linked`. A tabela é nova e o código
  publicado não a conhece, então aplicar antes do merge não afeta a produção.
  Depois, regenerar `src/integrations/supabase/types.ts`.

### Arquivos

- **Criar:** `supabase/migrations/20261007000000_automation_flows.sql` — a tabela,
  o índice e a RLS acima.
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado com
  `supabase gen types typescript --linked`.
- **Modificar:** `src/lib/fluxo-automacao.ts` — duas funções puras novas:
  - `problemasDeEstrutura(fluxo)`: só a parte estrutural de
    `pendenciasDoFluxo` (um gatilho, ligações válidas, sem laço).
    `pendenciasDoFluxo` passa a usá-la, sem mudar o que devolve.
  - `percorrerFluxo(fluxo, { avaliarCondicao, executarAcao })`: percorre a
    partir do gatilho e devolve o caminho (blocos, saídas tomadas e ações que
    falharam). Quem avalia e quem executa vem por parâmetro, para o percurso
    ser testado sem banco e ser reaproveitado na simulação do editor.
- **Remover:** `src/lib/automacoes.ts` — vira a pasta abaixo. Os imports de
  `@/lib/automacoes` nos três pontos que chamam o motor e nos `vi.mock` dos
  testes continuam iguais.
- **Criar:** `src/lib/automacoes/index.ts` — `processarAutomacoes` e
  `GatilhoAutomacao`, com a mesma assinatura. Faz a lixeira, carrega as regras
  das duas origens, ordena, confere o gatilho e percorre.
- **Criar:** `src/lib/automacoes/contexto.ts` — `GatilhoAutomacao` (movido de
  `automacoes.ts`), o contexto da execução (cliente e evento) e
  `conversaDoEvento`, que as verificações e as ações usam. A conversa do evento
  era calculada duas vezes dentro do motor antigo.
- **Criar:** `src/lib/automacoes/regra-antiga.ts` — `fluxoDaRegraAntiga`, pura:
  uma linha de `automations` vira o fluxo gatilho → ação, com os mesmos
  parâmetros (`gatilho_config` e `acao_config` têm as mesmas chaves do
  editor). Os valores nulos são descartados.
- **Criar:** `src/lib/automacoes/verificacoes.ts` — avalia as verificações de
  canal, etiqueta da conversa, atendente e card do contato. Cada uma consulta o
  banco na hora, para enxergar o que uma ação anterior do mesmo caminho acabou
  de mudar.
- **Criar:** `src/lib/automacoes/acoes.ts` — as 4 ações de hoje (enviar
  mensagem, aplicar etiqueta, atribuir atendente, mover card), movidas de
  `automacoes.ts` sem mudar o comportamento. Agora recebem os parâmetros do
  bloco e devolvem se deram certo.
- **Modificar:** `src/test/automacoes.test.ts` — os 4 testes atuais continuam
  passando. Entram também regra antiga e fluxo novo na mesma ordem de criação,
  e o fluxo do "Pronto quando" (condição de canal com sim e não).
- **Criar:** `src/test/fluxo-automacao.test.ts` — testes de `percorrerFluxo` e
  `problemasDeEstrutura`: condição com sim e com não, ação que falha no meio,
  caminhos que se juntam, saída sem ligação, laço recusado. Também
  `fluxoDaRegraAntiga`.
- **Modificar:** `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md` —
  seção 5, com as decisões deste plano.

**Reutilizar:**
- `buscarConversaAberta` e `enviarTextoWhatsApp` de `src/lib/whatsapp-envio.ts`.
- `formaLaco`, `gatilhoDoFluxo` e `saidasDoBloco` de `src/lib/fluxo-automacao.ts`.
- O padrão de mock do service client de `src/test/automacoes.test.ts` (`chain`).

### Dependências Externas

Nenhuma.

### Checklist

- [x] Migration `automation_flows` criada (tabela, coluna gerada, índice, RLS)
- [x] Migration aplicada no Supabase e `types.ts` regenerado
- [x] `problemasDeEstrutura` extraída, com `pendenciasDoFluxo` devolvendo o mesmo de antes
- [x] `percorrerFluxo`: condição sim/não, ação segue mesmo com falha, saída sem ligação encerra, proteção contra laço
- [x] `fluxoDaRegraAntiga` monta gatilho → ação com os parâmetros da regra antiga
- [x] Verificações de canal, etiqueta da conversa, atendente e card do contato
- [x] As 4 ações movidas para `acoes.ts`, devolvendo se deram certo
- [x] `processarAutomacoes` lê as duas origens, na ordem de criação, com a mesma assinatura
- [x] Testes do percurso e da regra antiga em `fluxo-automacao.test.ts`
- [x] Testes do motor em `automacoes.test.ts`, com os 4 antigos passando
- [x] Build com código de saída 0 e lint limpo nos arquivos da issue
- [x] Seção 5 no registro de decisões

## Execução (07/10/2026)

**Aberta até o teste no preview.** O "Pronto quando" foi conferido com testes
automatizados sobre um banco simulado. O motor ainda não rodou de verdade no
preview, porque ainda não há como criar fluxos lá. Isso vem com o editor
gravando no banco, a próxima issue. Depois desse teste, a issue vai para
`concluidas_B11/`.

**O que ficou diferente do plano:**

- **`contexto.ts` a mais na pasta do motor.** As verificações e as ações
  precisam do mesmo "qual é a conversa deste evento". O motor antigo calculava
  isso duas vezes, e com as verificações seriam seis.
- **"Atribuir atendente" tenta as duas gravações**, mesmo que a da conversa
  falhe, como na primeira versão. A falha de qualquer uma marca a ação como
  falha.
- **As verificações recebem uma a uma**, e não o bloco inteiro:
  `percorrerFluxo` faz o E e para na primeira que não vale.
- **O service client do projeto não usa os tipos gerados** (`createClient` sem
  o tipo `Database`). Por isso o código compila antes de `automation_flows`
  existir no banco, e regenerar `types.ts` não bloqueia o build.

**Como foi verificado:**

- `npx vitest run src/test/automacoes.test.ts src/test/fluxo-automacao.test.ts
  src/test/gateway-recebimento.test.ts src/test/gateway-midia-recebida.test.ts`:
  57 testes passando. Os 4 testes antigos do motor não mudaram.
- `tsc --noEmit` sem erro, e `npm run build` com código de saída 0.
- `eslint` limpo em `src/lib/automacoes/`, `src/lib/fluxo-automacao.ts` e nos
  dois arquivos de teste.

- Testes unitários do repositório inteiro, sem os `*.integration.test.ts`: 38
  arquivos e 427 testes passando.

**Banco (07/10/2026):**

- Antes do `db push`, o `supabase migration list --linked` mostrou que só
  `20261007000000_automation_flows.sql` estava pendente. As outras 77 já
  estavam iguais no banco. Isso importa porque o `db push` aplica tudo o que
  estiver pendente.
- Aplicada com `npx supabase db push --linked`. No banco, foi conferido: RLS
  ligada, 2 policies, `gatilho_tipo` gerada e a tabela vazia. Um insert de
  teste, desfeito em seguida, gerou `card_movido` a partir do fluxo, e um fluxo
  sem gatilho foi recusado pelo `not null`.
- `types.ts` regenerado. Além de `automation_flows`, entrou
  `tentativas_de_acesso`, da B20-05, que tinha ficado sem regenerar.

**Problema encontrado fora do escopo (incidente, já desfeito):**

- Ao rodar a suíte inteira, um filtro errado deixou passar arquivos
  `*.integration.test.ts`, que batem no Supabase de produção. Vários falharam,
  e a causa não foi investigada para não rodar de novo. Os testes da B19-01
  (`cadastro-empresa` e `cadastro-seguranca`) deixaram 4 empresas de teste
  (`b19-01-…@teste.com`), com perfis, times e sequências padrão. A limpeza do
  `afterAll` deles não alcançou essas empresas. As 4 foram apagadas numa
  transação só, com conferência dos e-mails antes, e depois foi verificado que
  não sobrou usuário, empresa nem arquivo criado nas últimas 3 horas.
- Fica o aviso para quem for mexer nos testes: quando os testes da B19-01
  falham, eles podem deixar empresa de teste no banco de produção.

## Teste no preview (07/10/2026): passou em parte

No preview `crm-exponencial-gsp333zcs` (commit b8a28a6), com a empresa "[TESTE]
Automações B11", nos roteiros da B11-10 e da B11-11:

- **Regras antigas seguem disparando:** a regra antiga "card movido para Follow
  do Catálogo → atribuir atendente" rodou pelo motor novo.
- **Fluxos com condição:** os caminhos "sim" e "não" foram seguidos conforme o
  contato (etiqueta da conversa e tag do contato). As ações rodaram uma depois da outra, e
  ação sem efeito não interrompeu o caminho.

**Falta:** a parte do "Pronto quando" com o canal e o envio de mensagem. A
empresa de teste não tem número conectado. Depende de conectar um chip de teste
nela, o que também é preciso para a B11-04. A issue fica aberta até lá.

## Teste com envio de verdade (08/10/2026): passou

**Concluída.** A parte que faltava do "Pronto quando" rodou no preview (commit
`3c7c8ca`), no `e2e/preview/roteiro-b11-07.cjs`. Nesse teste, o número pessoal
do Luan foi conectado como chip da empresa de teste e mandou para o número de
trabalho dele.

- A regra "tag `b11-02-canal` → canal da conversa é canal direto? → sim:
  etiqueta Interessado e mensagem / não: outra mensagem" foi montada pelo editor,
  e não por script, porque o editor já grava no banco.
- No chip, o caminho seguiu pelo "sim". A etiqueta entrou, e saiu a mensagem do
  sim, não a do não. A "Mensagem pelo canal direto" chegou ao celular de trabalho
  às 18h31, depois de esperar a fila do gateway (decisões, seção 15).
- O caminho "não" precisaria de um número da API Oficial, que a empresa de teste
  não tem. Ele fica coberto pelo teste do motor "condição de canal: na API
  Oficial segue pelo não e manda só a outra mensagem", em `automacoes.test.ts`.
