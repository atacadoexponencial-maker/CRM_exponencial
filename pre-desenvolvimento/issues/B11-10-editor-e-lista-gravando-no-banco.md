# B11-10: Editor e lista de automações gravando no banco

**Tipo:** Implementação
**Página:** Lista; Editor de fluxo; Motor (regras antigas)
**Repositório:** `crm-exponencial`, branch `b11-automacoes-v2`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Decisões:** `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md`, seções 5.4 e 6
**Depende de:** B11-01 (forma do editor) e B11-02 (motor e `automation_flows`)
**Ordem:** logo depois da B11-02. Foi tirada da B11-05 em 07/10/2026, para o Luan
montar e testar automações no preview sem esperar o resto da série.

## Descrição

O editor aprovado na B11-01 passa a gravar e abrir regras de verdade, em
`automation_flows`, e a lista nova substitui a antiga em
`/configuracoes/automacoes`. A rota do protótipo sai, e o item "Automações" do
menu volta para o endereço normal.

Só dá para montar o que o motor já executa (B11-02): os gatilhos "card movido" e
"conversa criada"; as verificações de canal, etiqueta e atendente da conversa e
de etapa do card; e as ações enviar mensagem, aplicar etiqueta, atribuir
atendente e mover card. O resto aparece como "em breve" e não pode ser salvo.
A proteção de repetição também aparece como "em breve" (B11-03).

As regras da primeira versão aparecem na lista marcadas como "versão antiga" e
continuam rodando. Abrir uma no editor e salvar cria a versão em fluxo, e no
branch só a versão nova roda daí em diante. A produção continua com a antiga
até o merge.

"Testar com um contato" usa dados reais: o admin busca um contato e vê o caminho
que ele faria, sem nada ser executado.

## Pronto quando

No preview, o admin cria pelo editor a regra "card movido para Sondagem →
conversa tem a etiqueta X? sim: atribuir atendente / não: aplicar a etiqueta X",
salva, sai e volta e encontra o fluxo igual. Movendo o card de um contato de
teste no preview, acontece o caminho certo. Uma regra antiga aparece como
"versão antiga", e depois de salva no editor deixa de rodar no branch, enquanto
a versão nova roda.

## Plano (07/10/2026)

### Decisões do plano

- **Regra antiga convertida** (decidido com o Luan em 07/10): a versão em fluxo
  guarda o `id` da antiga em `automation_flows.automation_id`. O motor do branch
  não roda uma regra antiga que já tem versão nova, mesmo que a versão nova
  esteja pausada. Excluir a versão nova faz a antiga voltar a valer no branch.
- **A regra antiga não é pausada nem excluída pelo branch.** Essas duas ações
  gravariam em `automations`, que é a tabela que a produção usa. Na lista, a
  regra antiga mostra a situação dela, mas o interruptor e o "Excluir" ficam
  desligados. Para trocá-la, o admin abre no editor e salva a versão nova.
- **O que o motor executa fica numa lista só**, em `src/lib/fluxo-automacao.ts`
  (`GATILHOS_DISPONIVEIS`, `VERIFICACOES_DISPONIVEIS`, `ACOES_DISPONIVEIS`). O
  editor marca o resto como "em breve", e `pendenciasDoFluxo`, que o editor e o
  servidor usam, recusa o que não está na lista. Cada issue seguinte da B11
  acrescenta itens a ela.
- **O servidor confere tudo o que recebe:** o formato do fluxo (com Zod), as
  pendências, e que etiquetas, atendentes e números citados no fluxo são da
  própria empresa. O motor roda com o service client, que passa por cima da
  RLS, então um id de outra empresa gravado no fluxo seria usado.
- **Escolha do contato no teste:** uma busca por nome ou telefone, e não uma
  lista fixa. Antes de digitar, aparecem os contatos com conversa mais recente.

### Cenários

#### Happy Path

1. O admin abre Automações. A lista mostra as regras em fluxo e as antigas sem
   versão nova, na ordem de criação, com o resumo de cada uma.
2. "Nova automação" abre `/configuracoes/automacoes/nova`, com um gatilho "card
   movido" ainda sem funil.
3. O admin monta o fluxo e salva. O servidor confere e grava, e o editor passa
   para `/configuracoes/automacoes/<id>`. Salvar de novo atualiza a mesma regra.
4. "Testar com um contato" busca o contato e pinta no canvas o caminho que ele
   faria, com os dados reais dele (canal, etiquetas, atendente, card).
5. Na lista, o admin pausa, reativa, duplica (a cópia nasce pausada, com
   "(cópia)" no nome) e exclui regras em fluxo.
6. Ao abrir uma regra antiga, o editor mostra o fluxo de dois blocos dela.
   Salvar cria a versão nova, que toma o lugar da antiga na lista.

#### Edge Cases

- **Abrir uma regra antiga que já tem versão nova** (link antigo, outra aba): o
  editor abre a versão nova.
- **Duas versões novas da mesma regra antiga:** o banco recusa (`unique`), e o
  editor avisa que ela já foi convertida.
- **Regra que não existe ou é de outra empresa:** volta para a lista.
- **Bloco "em breve" num fluxo salvo** (gravado antes, por script): o bloco
  aparece marcado, e o salvamento é recusado até ele ser trocado.
- **Trocar o gatilho para um "em breve":** a opção aparece desabilitada.
- **Contato de teste sem card no funil do gatilho, ou sem conversa:** a simulação
  roda, e as verificações que dependem disso não valem, como no motor.
- **Contato na lixeira:** não aparece na busca do teste.
- **Duplicar uma regra antiga:** cria uma cópia em fluxo, pausada, sem ligação
  com a antiga. A antiga continua rodando.

#### Cenário de Erro

- Usuário que não é admin: a página volta para `/perfil`, e as actions
  respondem "Sem permissão".
- Fluxo com pendência, formato inválido ou id de outra empresa: a action
  responde com a mensagem do problema e não grava nada.
- Falha do banco: "Não foi possível salvar a automação. Tente novamente." O
  editor mantém o desenho.

### Banco de Dados

Migration **só de acréscimo**: `supabase/migrations/20261007000001_automation_flows_regra_antiga.sql`.

- Tabela: `automation_flows`
  - `automation_id` (uuid, nulo, `unique`, fk `automations` com `on delete set
    null`): a regra antiga que esta versão substitui. Se a produção apagar a
    antiga, a versão nova fica.

A tabela `automations` não muda. Depois de aplicar, regenerar
`src/integrations/supabase/types.ts`.

### Arquivos

- **Criar:** `supabase/migrations/20261007000001_automation_flows_regra_antiga.sql`.
- **Modificar:** `src/integrations/supabase/types.ts`, regenerado.
- **Modificar:** `src/lib/fluxo-automacao.ts`: as três listas do que o motor
  executa, e `pendenciasDoFluxo` recusando o que está fora delas.
- **Criar:** `src/lib/automacoes/fluxo-recebido.ts`: o schema Zod do `Fluxo` e
  `lerFluxo(valor)`, que devolve o fluxo ou `null`. Serve às actions e ao
  motor.
- **Modificar:** `src/lib/automacoes/index.ts`: o motor não roda regra antiga
  que já tem versão nova.
- **Criar:** `src/lib/automacoes/referencias.ts`: o que o fluxo cita de fora
  (etiquetas, atendentes, números, etapas) e `etapaValida`. As actions
  conferem tudo antes de gravar.
- **Criar:** `src/lib/automacoes/simulacao.ts`: `simularFluxo`, que monta o
  evento a partir do contato e do gatilho e percorre o fluxo com as
  verificações reais e as ações desligadas.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/actions.ts`, reescrito:
  listar, buscar para o editor, salvar, alternar, duplicar, excluir, buscar
  contatos do teste e simular. As actions da tela antiga saem.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/page.tsx`: a lista
  nova, com as regras e as opções do resumo.
- **Criar:** `src/app/(auth)/configuracoes/automacoes/lista-client.tsx`: liga a
  `ListaRegras` às actions.
- **Criar:** `src/app/(auth)/configuracoes/automacoes/opcoes-editor.ts`: carrega
  do banco as opções do editor (etiquetas, atendentes, tags, times, sequências,
  mensagens rápidas, números).
- **Criar:** `src/app/(auth)/configuracoes/automacoes/[id]/page.tsx`: o editor de
  uma regra (`nova`, ou `nova?antiga=<id>` para converter uma antiga).
- **Criar:** `src/app/(auth)/configuracoes/automacoes/[id]/editor-client.tsx`:
  liga o `EditorFluxo` às actions.
- **Remover:** `src/app/(auth)/configuracoes/automacoes/automacoes-client.tsx`, a
  tela antiga.
- **Remover:** `src/app/(auth)/configuracoes/automacoes/prototipo/`, a rota do
  protótipo e os dados de exemplo.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/lista-regras.tsx`:
  marca "versão antiga", desliga o interruptor e o "Excluir" dela, e esconde as
  colunas de execução enquanto o histórico não existe.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/editor-fluxo.tsx`:
  busca de contato no teste, repetição "em breve" e verificação nova nascendo
  disponível.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/painel-bloco.tsx`
  e `menu-novo-bloco.tsx`: opções "em breve" desabilitadas.
- **Modificar:** `src/components/shared/sidebar-nav.tsx`: o item volta para
  `/configuracoes/automacoes`.
- **Modificar:** `src/test/automacoes.test.ts`: regra antiga com versão nova não
  roda.
- **Modificar:** `src/test/fluxo-automacao.test.ts`: pendência para bloco "em
  breve".
- **Criar:** `src/test/automacoes-fluxo-recebido.test.ts`: `lerFluxo` aceita o
  formato certo e recusa o resto; `referenciasDoFluxo` e `etapaValida`.
- **Criar:** `src/test/automacoes-simulacao.test.ts`: o evento montado para cada
  gatilho e o caminho sem executar ações.
- **Modificar:** `pre-desenvolvimento/issues/B11-05-gatilho-mensagem-do-time-e-editor-real.md`:
  sai a parte do editor e da lista, que veio para cá.
- **Modificar:** `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md`: seção
  6, regras antigas no branch e diferença de canal.
- **Modificar:** `pre-desenvolvimento/README.md`: B11-10 na série.
- **Modificar:** `pre-desenvolvimento/issues/B11-01-prototipo-editor-de-regra.md` e
  `pre-desenvolvimento/referencia/sessao-2026-09-30-b11-automacoes.md`: avisam
  que o protótipo saiu e onde retomar.

**Reutilizar:**
- `EditorFluxo`, `ListaRegras`, `PainelBloco`, `MenuNovoBloco`, `resumoRegra`
  e `CampoSelecao`, de `components/`.
- `fluxoDaRegraAntiga`, `verificacaoVale` e `percorrerFluxo`, da B11-02.
- `sessaoAtual` de `src/lib/sessao.ts` e o padrão `nova` de
  `src/app/(auth)/sequencias/[id]/page.tsx`.

### Dependências Externas

- `zod` (já no projeto): formato do fluxo recebido pelo servidor.

### Checklist

- [x] Migration `automation_id` aplicada e `types.ts` regenerado
- [x] Listas do que o motor executa e pendência "em breve" em `pendenciasDoFluxo`
- [x] `lerFluxo` com Zod
- [x] Motor pula regra antiga com versão nova
- [x] `simularFluxo` com verificações reais e ações desligadas
- [x] Actions: listar, abrir, salvar (com ids da própria empresa), alternar, duplicar, excluir, buscar contatos, simular
- [x] Lista nova em `/configuracoes/automacoes`, com regra antiga marcada
- [x] Editor em `/configuracoes/automacoes/[id]`, com `nova` e `?antiga=`
- [x] Opções "em breve" no painel, no menu de bloco novo e na repetição
- [x] Busca de contato no "Testar com um contato"
- [x] Tela antiga e protótipo removidos; menu de volta ao endereço normal
- [x] Testes novos passando, e a suíte unitária inteira passando
- [x] Build com código de saída 0 e lint limpo nos arquivos da issue
- [x] B11-05, registro de decisões e README atualizados

## Execução (07/10/2026)

**Aberta até o teste no preview.** O "Pronto quando" pede o admin montando e
rodando uma regra no preview. Isso depende do Luan logado como admin e de um
contato de teste, então a issue vai para `concluidas_B11/` depois desse teste.

**O que ficou diferente do plano:**

- **`referencias.ts` a mais**, com a extração do que o fluxo cita. Ficou fora
  das actions para ser testada sem banco.
- **O fluxo lido do banco também passa por `lerFluxo` no motor.** Um fluxo
  gravado fora do formato (por script) é ignorado, em vez de quebrar a execução
  da regra no meio.
- **Endereço depois de salvar a primeira vez:** troca com
  `window.history.replaceState`, e não com `router.replace`. Com o router, a
  página seria buscada de novo, e o aviso "Automação salva" e o bloco
  selecionado sumiriam.
- **Interruptor da lista:** com o tema escuro, o fundo do interruptor ligado é
  branco e a bolinha também era, então ela sumia. A bolinha ligada passou a
  usar a cor de texto do `primary`. Isso vinha do protótipo.
- **A versão nova de uma regra antiga nasce ativa ou pausada**, como a antiga
  estava, para o comportamento não mudar ao salvar. Uma regra nova nasce ativa.

**Como foi verificado:**

- Migration aplicada depois de conferir que era a única pendente. `types.ts`
  regenerado, só com a coluna nova.
- `npx vitest run` dos quatro arquivos de teste da B11: 44 testes. Suíte
  unitária inteira, sem os `*.integration.test.ts`: 40 arquivos e 446 testes
  passando.
- `tsc` sem erro, lint limpo nos arquivos da issue e `npm run build` com código
  de saída 0.
- Playwright numa rota temporária, apagada antes do commit, com dados de
  exemplo e sem login. A lista mostrou a regra antiga marcada, com o
  interruptor desabilitado e sem "Excluir" no menu. O seletor de gatilho
  mostrou 5 gatilhos "em breve" desabilitados, o menu de bloco novo mostrou 10
  ações "em breve" e o diálogo de teste abriu a busca. Não houve erro no
  console. Salvar, simular e buscar contatos de verdade dependem de sessão de
  admin e ficam para o teste no preview.
