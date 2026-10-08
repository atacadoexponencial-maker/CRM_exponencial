# B11-01: Protótipo do editor de fluxo e da lista de regras

**Tipo:** Protótipo
**Página:** Configurações → Automações (lista e editor de fluxo)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Decisões:** `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md`
**Depende de:** nada

## Descrição

Desenhar, com dados fixos e sem gravar nada, a lista de regras nova (resumo em
uma frase, interruptor, contagem de execuções) e o editor de fluxo: o canvas
com os blocos de gatilho, condição (saídas sim e não) e ação ligados por setas,
o "+" nas saídas livres, o painel do bloco selecionado, a proteção de repetição
e o botão "Testar com um contato". Todos os gatilhos, verificações e ações da
spec aparecem nos seletores, mesmo os que só entram em issues posteriores.

Cobre a forma de "Configurações → Automações (lista)" e "Editor de fluxo".

## Pronto quando

Uma rota temporária, fora do menu, mostra a lista e o editor com uma regra de
exemplo que se divide: "mensagem recebida → se contém 'catálogo': aplicar
etiqueta Interessado e enviar o catálogo; se não: se está fora do horário
comercial, enviar mensagem de ausência". Na tela dá para adicionar, ligar,
religar e remover blocos, configurar cada um no painel e simular o caminho de
um contato. O Luan e a Marcelle aprovam a forma. A rota sai do repositório
quando a B11-05 ligar o editor real; os componentes do editor ficam e são
reaproveitados por ela.

---

## Plano (30/09/2026)

### Como o protótipo se organiza

A tela se divide em **componentes que ficam** e **rota que sai**. É o mesmo
desenho da B5-01: o editor recebe por parâmetro quem salva e quem simula. O
protótipo passa funções que não gravam nada, e a B11-05 passa as de verdade,
sem reescrever o editor.

- `components/`: editor de fluxo, blocos, painel e lista de regras. Ficam no
  repositório e a B11-05 reaproveita.
- `prototipo/`: rota temporária, dados fixos e as funções falsas de salvar e
  simular. A B11-05 apaga.
- `src/lib/fluxo-automacao.ts`: o formato do fluxo (tipos) e as regras que o
  servidor também vai precisar: detectar laço, achar blocos soltos e listar o
  que falta configurar em cada bloco. É código puro, sem banco. O motor da
  B11-02 e a validação ao salvar da B11-05 importam daqui. No protótipo, a
  validação roda na tela só para marcar os blocos. **A B11-05 repete a
  validação no servidor antes de gravar**, e é o servidor quem decide.

### Cenários

#### Happy Path

1. O admin abre `/configuracoes/automacoes/prototipo` e vê a lista com quatro
   regras de exemplo. Cada linha mostra nome, resumo em uma frase ("Quando o
   cliente enviar mensagem → 2 condições, 3 ações"), interruptor, execuções
   nos últimos 7 dias e última execução.
2. Pausa e reativa uma regra pelo interruptor. Duplica uma regra, e a cópia
   aparece pausada com "(cópia)" no nome. Exclui outra, depois de confirmar.
3. Clica em editar na regra "Catálogo e ausência", e o editor abre. No canvas:
   - o gatilho "Mensagem recebida do cliente";
   - uma condição "texto contém 'catálogo'" com duas saídas;
   - o caminho do **sim**: aplicar etiqueta Interessado → enviar mensagem com o
     catálogo;
   - o caminho do **não**: outra condição, "fora do horário comercial", com o
     sim levando a "enviar mensagem de ausência".
4. Clica no "+" da saída livre "não" da segunda condição e escolhe "Aplicar
   etiqueta". O bloco novo nasce ligado ali, abaixo e à direita.
5. Seleciona o bloco novo. O painel lateral abre com o tipo de ação e o
   seletor de etiqueta. Escolhe uma etiqueta, e a frase do bloco se atualiza.
6. Liga dois blocos arrastando da saída de um até a entrada do outro. Remove
   uma ligação pelo botão "×" no meio da seta.
7. Clica em "Testar com um contato" e escolhe "Ana (escreveu: Quero o
   CATÁLOGO)". O canvas destaca o caminho que ela percorreria: cada condição
   mostra a saída tomada, e os blocos fora do caminho ficam apagados. Uma faixa
   diz "Simulação: nada foi executado".
8. Muda a proteção de repetição para "no máximo uma vez a cada 24 horas" e
   salva. Aparece "Protótipo: nada foi salvo".

#### Edge Cases

- **Laço:** arrastar da saída de um bloco para a entrada de um bloco anterior
  no mesmo caminho é recusado. A seta nem se completa (`isValidConnection`).
- **Saída ocupada:** ligar de novo uma saída que já tinha seta troca a ligação
  antiga pela nova.
- **Caminhos que se juntam:** ligar duas saídas à mesma entrada é permitido.
- **Ligar um bloco nele mesmo:** recusado.
- **Remover um bloco:** as ligações dele somem junto. O gatilho não tem botão
  remover, e a tecla Delete não o apaga.
- **Bloco solto:** um bloco criado por "Adicionar bloco" e não ligado aparece
  marcado "Bloco solto: ligue a um caminho", e o salvar recusa.
- **Trocar o gatilho** de "Mensagem recebida" para "Card movido": a
  verificação de texto na condição fica marcada como inválida para esse
  gatilho, e o salvar recusa até ela ser removida.
- **Pendências no bloco:** uma condição sem verificação, ou uma ação sem o
  parâmetro obrigatório, fica marcada com o que falta.
- **Aviso de repetição:** salvar uma regra de "mensagem recebida" que envia
  mensagem com repetição "sempre" mostra o aviso "esta regra vai responder
  toda mensagem deste contato", com as opções voltar ou salvar assim mesmo.
- **Lista vazia:** `?vazio=1` mostra o estado vazio, com explicação curta e
  exemplos de regras comuns.
- **Celular:** a lista cabe na largura, e o painel do bloco abre por cima do
  canvas, ocupando a largura toda.

#### Cenário de Erro

- **Salvar com pendências:** nada é "salvo". A barra mostra "Corrija os N
  blocos marcados", e os blocos com problema ficam com borda vermelha e o
  motivo escrito.
- **Salvar sem nome:** o campo nome fica marcado, com a mensagem "Dê um nome à
  automação".
- **Contato sem ação no caminho:** se, na simulação, a primeira condição dá
  "não" e essa saída não tem ligação, o destaque mostra só o gatilho e a
  condição, e a faixa diz "nenhuma ação seria feita para este contato".

### Banco de Dados

Nenhum. O protótipo não lê nem grava. A tabela nova é da B11-02.

### Arquivos

- **Criar:** `src/lib/fluxo-automacao.ts` — tipos do fluxo (bloco, ligação,
  verificação, repetição, resultado da simulação), os gatilhos de mensagem e
  as verificações que só valem para eles, os parâmetros obrigatórios de cada
  gatilho e ação, e as funções puras `formaLaco`, `blocosAlcancaveis` e
  `pendenciasDoFluxo`
- **Criar:** `src/app/(auth)/configuracoes/automacoes/components/catalogo.ts` —
  rótulo, ícone e campos de tela de cada gatilho, verificação (com operadores)
  e ação, e os grupos do menu de novo bloco
- **Criar:** `src/app/(auth)/configuracoes/automacoes/components/frases-fluxo.ts` —
  a frase de cada bloco e o resumo da regra para a lista
- **Criar:** `src/app/(auth)/configuracoes/automacoes/components/blocos-fluxo.tsx` —
  os três blocos do canvas (gatilho, condição com saídas sim e não, ação), com
  o "+" nas saídas livres, e a seta com botão "×"
- **Criar:** `src/app/(auth)/configuracoes/automacoes/components/painel-bloco.tsx` —
  o painel lateral de configuração do bloco selecionado
- **Criar:** `src/app/(auth)/configuracoes/automacoes/components/menu-novo-bloco.tsx` —
  o diálogo de escolha do próximo bloco (condição ou uma das ações, em grupos)
- **Criar:** `src/app/(auth)/configuracoes/automacoes/components/editor-fluxo.tsx` —
  o editor: barra do topo (nome, repetição, testar, salvar), canvas, painel,
  simulação e aviso de repetição. Recebe `salvar` e `simular` por parâmetro
- **Criar:** `src/app/(auth)/configuracoes/automacoes/components/lista-regras.tsx` —
  a lista nova: resumo, interruptor, execuções, menu (editar, duplicar, ver
  histórico, excluir com confirmação) e estado vazio
- **Criar:** `src/app/(auth)/configuracoes/automacoes/prototipo/page.tsx` —
  rota temporária, fora do menu. É server component e só deixa entrar admin
- **Criar:** `src/app/(auth)/configuracoes/automacoes/prototipo/prototipo-client.tsx` —
  alterna entre a lista e o editor em memória, com o salvar e o simular falsos
- **Criar:** `src/app/(auth)/configuracoes/automacoes/prototipo/dados-exemplo.ts` —
  regras, opções (etiquetas, atendentes, tags, times, sequências, mensagens
  rápidas, números) e contatos de teste fixos
- **Modificar:** `src/app/globals.css` — importar o CSS do React Flow depois do
  Tailwind, como a documentação pede para Tailwind 4
- **Modificar:** `package.json` e `package-lock.json` — a dependência nova

**Reutilizar:**
- A checagem de papel de `src/app/(auth)/configuracoes/automacoes/page.tsx:7-10`
- `ETAPAS_ENTRADA` e `ETAPAS_RECOMPRA` de `src/app/(auth)/pipeline/mock-pipeline.ts`
- `CLASSIFICACAO_LABEL` e `TIPO_LABEL` de `src/app/(auth)/contatos/mock-contatos.ts`
- `Button`, `Input`, `Label`, `Dialog`, `DropdownMenu` e `Badge` de `src/components/ui/`
- O interruptor e a tabela de `automacoes-client.tsx`, e a constante local
  `selectClass`, que é o padrão do repositório (cada tela declara a sua)

**Não mexer:** a tela atual (`automacoes-client.tsx`, `actions.ts`, `page.tsx`)
e o menu lateral. Até a B11-05, a tela de hoje continua sendo a de verdade.

### Dependências Externas

- `@xyflow/react` (^12.12, MIT) — canvas com arrastar, aproximar, ligar blocos
  por alças e recusar ligação. O motivo e a alternativa descartada estão na
  seção 3 de `decisoes/B11-automacoes-em-fluxo.md`.

### Checklist

- [x] `@xyflow/react` instalado e CSS importado no `globals.css` depois do Tailwind
- [x] `src/lib/fluxo-automacao.ts` com os tipos, `formaLaco`, `blocosAlcancaveis` e `pendenciasDoFluxo`
- [x] Catálogo com todos os 7 gatilhos, 10 verificações e 14 ações da spec
- [x] Bloco de gatilho (só saída), de condição (saídas sim e não) e de ação (uma saída), cada um com a sua frase
- [x] "+" nas saídas livres cria o bloco já ligado
- [x] "Adicionar bloco" na barra cria um bloco solto
- [x] Ligar arrastando; saída ocupada troca a ligação; laço e auto-ligação recusados; caminhos podem se juntar
- [x] Remover ligação pelo "×"; remover bloco pelo painel e pela tecla Delete (menos o gatilho)
- [x] Painel do bloco: gatilho com parâmetros; condição com verificações (atributo, operador e valor; adicionar e remover); ação com parâmetros
- [x] Verificações de mensagem marcadas como inválidas quando o gatilho não é de mensagem
- [x] Blocos com pendência marcados em vermelho com o motivo; o salvar recusa e diz quantos são
- [x] Proteção de repetição com as três opções (a de N horas pede o número)
- [x] Aviso ao salvar regra de mensagem recebida que envia mensagem com repetição "sempre"
- [x] "Testar com um contato" destaca o caminho no canvas, mostra a saída de cada condição e avisa que nada foi executado
- [x] Lista: resumo, interruptor, execuções em 7 dias, última execução, menu editar/duplicar/histórico/excluir, confirmação ao excluir
- [x] Estado vazio com exemplos (`?vazio=1`)
- [x] Regra de exemplo que se divide, conforme o "Pronto quando"
- [x] Rota fora do menu e só para admin
- [x] Usável em largura de celular
- [x] `npm run build` passa (exit code 0) e o lint passa nos arquivos desta issue (o `npm run lint` do repositório inteiro já falhava antes; ver Execução)

## Execução (30/09/2026)

**Aprovação pendente.** O "Pronto quando" pede que o Luan e a Marcelle aprovem a
forma. Por isso a issue continua aberta, e não foi para `concluidas_B11/`.

**O que ficou diferente do plano:**

- **Funções a mais em `src/lib/fluxo-automacao.ts`:** `saidasDoBloco`,
  `gatilhoDoFluxo` e `respondeTodaMensagem`, esta última a regra do aviso de
  repetição. São puras como as outras, e o servidor vai precisar delas na
  B11-05.
- **Avisos por cima do canvas.** O resultado do salvar e a faixa da simulação
  ficam num painel sobre o canvas, e não numa faixa acima dele. Assim o
  desenho não pula quando o aviso aparece.
- **Bloco novo não nasce em cima de outro.** O "+" calcula a posição abaixo da
  saída e desce até achar espaço livre. No primeiro teste, o bloco novo cobria
  a alça de um bloco vizinho.
- **Cores para o tema escuro.** O app é escuro por padrão (`:root` em
  `globals.css`), então os blocos usam cores translúcidas, e o canvas usa
  `colorMode="dark"` do React Flow.

**Como foi verificado:** o protótipo rodou numa rota temporária pública
(`/login-b11-teste`), porque a rota real pede sessão de admin. Um roteiro do
Playwright passou por 33 verificações: lista, interruptor, duplicar, excluir,
os três contatos da simulação, "+", painel, salvar, laço recusado, caminhos
que se juntam, troca de ligação, remover ligação, gatilho protegido, bloco
solto, troca de gatilho, aviso de repetição, celular (lista e editor sem
rolagem lateral) e lista vazia. Todas passaram, sem erro no console. A rota
temporária foi apagada antes do commit.

**Problemas encontrados fora do escopo (não mexidos):**

- `src/app/(auth)/pipeline/mock-pipeline.ts` está com a codificação quebrada
  desde o commit `507232c` (12/06/2026). "Em Qualificação", "Catálogo Enviado" e
  "Em Negociação" aparecem como "Em QualificaÃ§Ã£o" etc. O arquivo alimenta o
  funil de Entrada, o painel do card, a tela atual de automações e este
  protótipo.
- Os 11 itens de menu do app usam `onSelect` no `DropdownMenuItem`, mas o menu
  do Base UI só dispara `onClick`. O código novo usa `onClick`. Os antigos
  (incluindo editar e excluir na tela atual de automações) precisam ser
  conferidos.
- `npm run lint` no repositório inteiro: 528 erros, nenhum nos arquivos desta
  issue. 285 vêm de `.claude/worktrees/b1-provider/` (uma cópia antiga do
  projeto que o lint varre), e o resto de outras telas.
- `npm run test`: 27 falhas em 5 arquivos, nenhum ligado a esta issue. Os
  quatro de integração (`times`, `usuarios`, `contatos-lista` e
  `conversa-nova-ao-vivo`) bateram no limite de login do Supabase Auth
  ("Request rate limit reached"). Eles criam usuários de teste no Supabase, que
  é o de produção, e os apagam no `afterAll`. `qr-code-conectado` procura o
  texto "leia o código no aparelho", que a tela não tem mais.

## Depois da B11-10 (07/10/2026)

A rota do protótipo e os dados de exemplo saíram do repositório na B11-10, e o
menu voltou para `/configuracoes/automacoes`, onde agora está o editor gravando
no banco. A forma aprovada aqui é a mesma da tela real. A aprovação que falta
(Luan e Marcelle) passa a ser feita nela.

## Ajuste de 07/10/2026: o menu abre o protótipo

O Luan pediu que o item "Automações" do menu abra o protótipo no branch, porque
digitar `/prototipo` no endereço a cada teste não era prático. O plano dizia
para não mexer no menu até a B11-05. Essa regra foi trocada só no branch:

- **O que mudou:** o `href` do item em `src/components/shared/sidebar-nav.tsx`
  aponta para `/configuracoes/automacoes/prototipo`. A tela antiga continua no
  endereço de sempre, só sai do menu.
- **Alternativa descartada:** fazer `/configuracoes/automacoes` mostrar o
  protótipo. Isso mexeria no `page.tsx` da tela de verdade, que a B11-05
  reescreve, e esconderia a tela antiga, que ainda serve para comparar.
- **Efeito no preview:** fica mais difícil abrir a tela antiga por engano. Ela
  grava no Supabase de produção, e uma regra salva ali dispara para os
  clientes.
- **Antes do merge:** a B11-05 apaga a rota do protótipo e volta o item para
  `/configuracoes/automacoes`. O protótipo continua sem gravar nada.

## Ajuste de 07/10/2026: listas de escolha no estilo do site

O Luan pediu os dropdowns do editor estilizados no estilo do site. O
`<select>` nativo abre uma lista que o navegador desenha com as cores do
sistema, fora do tema escuro.

- **O que mudou:** os 11 `<select>` do editor (10 no painel do bloco e 1 na barra do topo,
  o da repetição) usam o Select do Base UI, gerado pelo shadcn
  (`npx shadcn add select`, em `src/components/ui/select.tsx`). A lista abre
  embaixo do campo, com as cores do tema e a marca no item escolhido.
- **`campo-selecao.tsx`:** adapta o Select à forma dos campos do painel. O
  valor é texto, `""` quando nada está escolhido, e o item vazio ("Qualquer
  etapa", "Escolha…") é opcional. Também aceita item desabilitado.
- **Correção no que o shadcn gerou:** o comando importou `cn` de um pacote do
  npm chamado `cn`, sem relação com o projeto, e o instalou. O pacote foi
  desinstalado, e a importação aponta para `@/lib/utils`, como nos outros
  componentes de `ui/`.
- **Alternativa descartada:** só trocar as cores do `<select>` nativo por CSS.
  A lista aberta continua sendo do sistema operacional e não aceita o estilo
  do site em todos os navegadores.
- **Fora daqui:** as outras telas do CRM ainda usam `<select>` nativo (18
  arquivos). Trocá-las é trabalho para o `master`, não para este branch.
- **Verificação:** lint e tipos limpos, build com código de saída 0. Um roteiro
  do Playwright, numa rota temporária apagada antes do commit, abriu as listas
  de repetição, atributo, valor, ação e etapa. Escolher um item mostra o
  rótulo no botão, e o item vazio aparece quando nada está escolhido. Não
  houve erro no console.

## Aprovação (08/10/2026)

**Concluída.** O Luan aprovou a forma na tela real de automações, onde vinha
testando as regras no preview desde 07/10. Ele decidiu que a aprovação dele
basta, sem esperar a da Marcelle, que o "Pronto quando" também pedia.
