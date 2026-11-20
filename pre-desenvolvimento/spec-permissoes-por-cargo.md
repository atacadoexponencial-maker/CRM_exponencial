# Spec: Permissões por cargo

> série: B63
> estado: aprovada em 19/11/2026

## Visão Geral

Pedido do Luan em 19/11/2026. Na empresa D'Rô Moda Evangélica, a Vivianne
(atendente) via conversas que a Nathália (admin) considerava dela. O Luan quer que
cada atendente veja só a própria carteira, e que o Admin decida isso numa tela, sem
depender de código.

**Como funciona hoje (B45-03, decisão da Marcelle em 27/10/2026, "fila aberta").**
A regra é fixa e igual para todas as empresas:

- Admin e Gerente veem tudo da empresa.
- Atendente vê as conversas, os contatos e os cards dos quais é dono, **mais os que
  estão sem dono**.

O time (Entrada, Recompra) não muda o que ninguém vê. Ele só serve à automação
"Atribuir ao time".

**O que foi encontrado na D'Rô (consulta só de leitura na produção, 19/11/2026).**
A empresa tinha 16 conversas: 8 com a Nathália como dona, 4 com a Vivianne e 4 sem
dono. A Vivianne não via as 8 da Nathália. Ela via as 4 dela e as 4 sem dono, e duas
das sem dono eram de um contato chamado "Nathália" (a própria admin escrevendo do
celular para o número da loja). É isso que parecia "a Vivianne vendo as conversas da
Natália".

Três pontos da regra atual contribuem para o problema:

1. Conversa sem dono aparece para todos os atendentes (fila aberta).
2. Admin ou Gerente que responde uma conversa sem dono não vira dono dela. Só o
   atendente que responde vira dono (SUP-B45-04), então o que a admin atende fica sem
   dono e cai na fila aberta.
3. "Atribuir ao time" escolhe só entre atendentes (B53-02). Admin ou Gerente que está
   no time nunca recebe.

O "Atribuir" manual do chat já aceita qualquer pessoa da empresa, Admin e Gerente
inclusive. Isso não muda.

**O que a mudança faz.**

- Uma tela **Configurações › Permissões**, só do Admin, em que ele escolhe, para cada
  cargo (Atendente e Gerente), o que esse cargo vê. Há três opções: "Só os atribuídos
  a ele", "Os dele e os sem dono" ou "Todos da empresa".
- **Uma escolha só vale para conversas, contatos e cards**, porque o dono é o mesmo
  nos três (B45-02).
- O padrão do Atendente passa a ser **"Só os atribuídos a ele"**.
- "Atribuir ao time" passa a escolher **qualquer membro ativo do time**, com qualquer
  cargo.

Para quem: o Admin, que configura; o Atendente e o Gerente, que passam a ver o que o
Admin escolheu.

### Alternativas consideradas

| Alternativa | O que é | Por que não foi a escolhida |
|---|---|---|
| A. Só o Admin virar dono ao responder | Mantém a fila aberta; o que a admin responde deixa de ficar sem dono. | Resolve o caso da D'Rô, mas o atendente continua vendo todo lead novo sem dono. O Luan quer a carteira fechada (19/11/2026). |
| B. Desligar a fila aberta para todas as empresas | Atendente vê só o que é dele, regra fixa no código. | Cada empresa trabalha de um jeito, e a fila aberta foi pedido da Marcelle. Uma tela deixa a escolha com o Admin de cada empresa. |
| C. Permissão por pessoa | O Admin escolhe o que cada usuário vê. | Com duas ou três atendentes por empresa, dá mais trabalho e quase nunca muda o resultado. Fica para depois, se aparecer necessidade (Fora de escopo). |
| **D. Permissão por cargo, numa tela do Admin** | Esta spec. | Escolhida pelo Luan em 19/11/2026. |

## Páginas / Módulos

### Tela Configurações › Permissões

**Descrição:** o Admin escolhe o que cada cargo vê. A escolha vale para a empresa
toda e é guardada no servidor.

**Componentes:**
- Item "Permissões" no menu de Configurações, visível só para o Admin.
- Um bloco por cargo configurável, **Atendente** e **Gerente**, cada um com as três
  opções de visibilidade:
  - **Só os atribuídos a ele**: conversas, contatos e cards de que a pessoa é dona.
  - **Os dele e os sem dono**: o de cima, mais o que ainda não tem dono (a "fila
    aberta" de hoje).
  - **Todos da empresa**.
- Uma linha fixa para o **Admin**: "Vê tudo da empresa", sem opção.
- Em cada bloco, um texto curto explicando a consequência da opção marcada. Para "Só
  os atribuídos a ele": "Lead novo sem dono só aparece para quem vê os sem dono, até
  alguém atribuir. Use a automação 'Atribuir ao time' para distribuir na chegada."
- Botão "Salvar".

**Comportamentos:**
- Abrir a tela: mostra a opção atual de cada cargo.
- Marcar uma opção e salvar: a escolha passa a valer para todos com aquele cargo na
  empresa, na próxima vez que a tela deles carregar.
- Sair sem salvar: nada muda.
- Gerente ou Atendente que tenta abrir o endereço da tela: não vê a tela nem consegue
  salvar.
- Empresa nova: nasce com Atendente em "Só os atribuídos a ele" e Gerente em "Todos da
  empresa".

**Critérios de aceite:**

#### CA-B63-01 — O Admin vê a tela de Permissões com a opção atual de cada cargo · prova: automática

- **Dado** uma empresa com Atendente em "Os dele e os sem dono" e Gerente em "Todos da
  empresa"
- **Quando** o Admin abre Configurações › Permissões
- **Então** a tela mostra os blocos Atendente e Gerente com essas opções marcadas, e
  a linha do Admin com "Vê tudo da empresa", sem opção para mudar

#### CA-B63-02 — Só o Admin vê e salva as permissões · prova: automática

- **Dado** um Gerente e um Atendente da empresa
- **Quando** cada um tenta abrir Configurações › Permissões ou salvar uma escolha
- **Então** o item não aparece no menu deles, a tela não abre, e a tentativa de
  salvar é recusada, sem mudar a escolha guardada

#### CA-B63-03 — Salvar muda o que o cargo vê · prova: automática

- **Dado** o Atendente em "Os dele e os sem dono" e uma conversa sem dono na empresa
- **Quando** o Admin muda o Atendente para "Só os atribuídos a ele" e salva
- **Então** a tela confirma que salvou, e o atendente, ao recarregar o Chat, não vê
  mais essa conversa

#### CA-B63-04 — A escolha de uma empresa não muda outra · prova: automática

- **Dado** duas empresas, a A com Atendente em "Todos da empresa" e a B com Atendente
  em "Só os atribuídos a ele"
- **Quando** o Admin da A salva uma mudança
- **Então** o atendente da B continua vendo só o que é dele

#### CA-B63-05 — Empresa nova nasce com o Atendente fechado na carteira · prova: automática

- **Dado** uma empresa recém-cadastrada
- **Quando** o Admin abre a tela de Permissões
- **Então** o Atendente está em "Só os atribuídos a ele" e o Gerente em "Todos da
  empresa"

#### CA-B63-06 — A tela explica o efeito de "Só os atribuídos a ele" · prova: automática

- **Dado** a tela de Permissões aberta
- **Quando** o Admin marca "Só os atribuídos a ele" num cargo
- **Então** o bloco mostra o aviso de que o lead novo sem dono só aparece para quem vê
  os sem dono, sugerindo a automação "Atribuir ao time"

### O que cada cargo vê (Chat, Contatos e Pipeline)

**Descrição:** a escolha da tela vale junto para conversas, contatos e cards, e para
tudo que hoje já segue o dono do contato: etiquetas, compras, notas, campos
personalizados, histórico, lixeira, filtros, campanhas, Dashboard e relatórios. Ver
continua dando direito a atender (responder, mover o card), mas não a atribuir: trocar
o dono segue só para Admin e Gerente, e o atendente segue podendo transferir o que é
dele para um colega de time (B21-01).

**Comportamentos:**
- "Só os atribuídos a ele": a pessoa vê só a conversa, o contato e o card de que é
  dona.
- "Os dele e os sem dono": como hoje para o Atendente.
- "Todos da empresa": vê tudo, como o Admin, mas sem poder atribuir se for Atendente.
- O que a pessoa não vê também não aparece por endereço direto, busca, filtro,
  contagem ou exportação.
- Conversa que muda de dono para outra pessoa some da tela de quem a tinha, se ela
  estiver em "Só os atribuídos a ele" ou "Os dele e os sem dono".

**Critérios de aceite:**

#### CA-B63-07 — Em "Só os atribuídos a ele", o atendente não vê o que é sem dono nem dos outros · prova: automática

- **Dado** o Atendente em "Só os atribuídos a ele", uma atendente Ana dona da conversa
  X, um colega dono da Y e a Z sem dono (as três conferidas como existentes com a
  chave de serviço)
- **Quando** a Ana abre o Chat, Contatos e o Pipeline
- **Então** ela vê a conversa, o contato e o card de X, e não vê nada de Y nem de Z

#### CA-B63-08 — Em "Os dele e os sem dono", o atendente vê também a fila aberta · prova: automática

- **Dado** o Atendente em "Os dele e os sem dono" e as mesmas X, Y e Z
- **Quando** a Ana abre o Chat, Contatos e o Pipeline
- **Então** ela vê X e Z, e não vê Y

#### CA-B63-09 — Em "Todos da empresa", o atendente vê tudo mas não atribui · prova: automática

- **Dado** o Atendente em "Todos da empresa" e as mesmas X, Y e Z
- **Quando** a Ana abre o Chat e tenta atribuir a Y a si mesma
- **Então** ela vê X, Y e Z, e a atribuição é recusada

#### CA-B63-10 — O Gerente segue a opção do cargo dele · prova: automática

- **Dado** o Gerente em "Só os atribuídos a ele" e as mesmas X, Y e Z, com nenhuma
  delas do gerente
- **Quando** o Gerente abre o Chat, Contatos e o Pipeline
- **Então** ele não vê X, Y nem Z

#### CA-B63-11 — O Admin vê tudo, qualquer que seja a escolha · prova: automática

- **Dado** Atendente e Gerente em "Só os atribuídos a ele"
- **Quando** o Admin abre o Chat, Contatos e o Pipeline
- **Então** ele vê X, Y e Z

#### CA-B63-12 — O que não se vê também não vaza pelos lados · prova: automática

- **Dado** o Atendente em "Só os atribuídos a ele" e a conversa Z sem dono, com
  etiqueta, compra e nota gravadas (conferidas com a chave de serviço)
- **Quando** a Ana tenta abrir a Z pelo endereço direto, buscar o contato pelo nome,
  filtrar Contatos pela etiqueta e ler as compras, as notas e a lixeira
- **Então** nada da Z aparece, e as contagens da tela e do Dashboard dela não incluem a Z

#### CA-B63-13 — Atribuir a conversa tira da tela de quem perdeu · prova: automática

- **Dado** o Atendente em "Só os atribuídos a ele" e a Ana dona da conversa X
- **Quando** o Admin atribui a X ao colega
- **Então** a Ana, ao recarregar o Chat, não vê mais a X, nem o contato e o card dela

### Quem responde uma conversa sem dono

**Descrição:** hoje só o Atendente vira dono ao responder uma conversa sem dono.
Admin e Gerente respondem e a conversa continua sem dono, e por isso cai na fila
aberta dos atendentes. Decisão do Luan em 19/11/2026 (PER-B63-01): passa a valer
para todos os cargos, sem opção na tela.

**Comportamentos:**
- Responder uma conversa sem dono: quem respondeu vira dono da conversa, do contato,
  dos cards e das outras conversas dele (como o atendente hoje, B45-03).
- Dois que respondem juntos: um fica com a conversa; o outro recebe o aviso de que
  alguém já está atendendo (como hoje).
- Responder uma conversa que já tem dono: o dono não muda.

**Critérios de aceite:**

#### CA-B63-14 — Admin que responde conversa sem dono vira o dono · prova: automática

- **Dado** uma conversa sem dono
- **Quando** o Admin envia uma resposta nela
- **Então** a conversa, o contato e o card passam a ter o Admin como dono, e o
  Atendente em "Os dele e os sem dono" deixa de ver a conversa

#### CA-B63-15 — Responder conversa que já tem dono não troca o dono · prova: automática

- **Dado** a conversa X, da Ana
- **Quando** o Admin ou o Gerente envia uma resposta nela
- **Então** a X continua com a Ana

### "Atribuir ao time" escolhe qualquer membro

**Descrição:** a automação "Atribuir ao time" passa a escolher entre todos os membros
ativos do time, de qualquer cargo, e não só os atendentes (desfaz a B53-02). O resto
continua: quem tem menos conversas abertas recebe, e no empate o primeiro pelo nome.
A conversa que já está com um membro ativo do time fica com ele.

**Comportamentos:**
- Time com Atendente, Gerente e Admin ativos: recebe quem tem menos conversas abertas,
  de qualquer cargo.
- Conversa que já está com o Admin, sendo ele membro do time: fica com ele.
- Membro desativado: nunca é escolhido.
- Time sem nenhum membro ativo: a automação registra a falha "O time não tem membro
  ativo".

**Critérios de aceite:**

#### CA-B63-16 — O Admin do time pode receber o lead · prova: automática

- **Dado** um time com a atendente Ana (3 conversas abertas) e o Admin (1 conversa
  aberta), os dois ativos
- **Quando** "Atribuir ao time" roda para um lead novo
- **Então** o lead vai para o Admin

#### CA-B63-17 — Conversa já com um Gerente do time fica com ele · prova: automática

- **Dado** um time com a Ana e um Gerente, e uma conversa que já é do Gerente
- **Quando** "Atribuir ao time" roda para essa conversa
- **Então** ela continua com o Gerente, e a execução registra que manteve o dono

#### CA-B63-18 — Time sem ninguém ativo avisa a falha · prova: automática

- **Dado** um time cujos membros estão todos desativados
- **Quando** "Atribuir ao time" roda
- **Então** a conversa não muda de dono, e a execução da automação mostra "O time não
  tem membro ativo"

#### CA-B63-19 — Na D'Rô, a Vivianne deixa de ver o que não é dela · prova: manual

- **Dado** a D'Rô em produção, depois do merge, com o Atendente em "Só os atribuídos a
  ele"
- **Quando** a Vivianne abre o Chat
- **Então** ela vê só as conversas atribuídas a ela, e a Nathália segue vendo todas

## Fora de escopo

- Permissão por pessoa (exceção para um usuário específico). Fica para depois, se
  aparecer necessidade.
- Permissões de ação além de ver: quem cria contato, quem registra compra, quem mexe
  em automações, quem atribui. Continuam como hoje.
- Separar a visibilidade de conversas, contatos e cards (decisão do Luan em
  19/11/2026: uma escolha só).
- Aviso ou notificação de lead novo sem dono para o Admin.
- Histórico de quem mudou as permissões.
- Pedidos e Ganho no funil de Recompra: é outra conversa do mesmo dia e vai ter série
  própria.
- Atribuir as conversas que hoje estão sem dono nas empresas existentes. O Admin
  atribui pelo chat ou deixa a automação distribuir.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B63-01 | A permissão é por cargo, não por pessoa. | confirmada | Luan, 19/11/2026 |
| SUP-B63-02 | Uma escolha só vale para conversas, contatos e cards. | confirmada | Luan, 19/11/2026 |
| SUP-B63-03 | "Atribuir ao time" escolhe qualquer membro ativo do time, de qualquer cargo. | confirmada | Luan, 19/11/2026 |
| SUP-B63-04 | O Admin sempre vê tudo da empresa; a tela não deixa restringir o Admin. | confirmada | Luan, 19/11/2026 |
| SUP-B63-05 | As empresas que já existem passam, no dia do merge, para o padrão novo: Atendente em "Só os atribuídos a ele" e Gerente em "Todos da empresa". Na D'Rô, a Vivianne deixa de ver as 4 conversas sem dono. | confirmada | Luan, 19/11/2026 |
| SUP-B63-06 | Ver dá direito a atender (responder, mover o card), mas não a atribuir: o Atendente em "Todos da empresa" responde a conversa de um colega sem virar dono dela. | confirmada | Luan, 19/11/2026 |
| SUP-B63-07 | A troca da fila aberta como padrão substitui a decisão da Marcelle de 27/10/2026 (PER-B45-04); a fila aberta fica como opção na tela. | confirmada | Luan, 19/11/2026 |
| SUP-B63-08 | O texto curto das outras duas opções (a spec só escreve o de "Só os atribuídos a ele"): "Os dele e os sem dono" → "Vê também o lead novo que ainda não tem dono, e quem responde primeiro vira o dono."; "Todos da empresa" → "Vê e atende tudo da empresa, mas só o Admin e o Gerente trocam o dono." Uma escolha só para os dois cargos, um botão Salvar. | confirmada | Luan, 19/11/2026 |
| SUP-B63-09 | "A execução registra que manteve o dono" (CA-B63-17) é o que a função `atribuir_conversa_ao_time` devolve (`manteve: true`), como nos testes da B22-04; a ação do motor continua sem guardar detalhe no sucesso, que hoje só registra o motivo das falhas. | confirmada | Luan, 19/11/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B63-01 | Quem responde uma conversa sem dono vira o dono dela: vale para Admin e Gerente também (proposta da spec, CA-B63-14), só para o Atendente (como hoje) ou fica como opção na tela de Permissões? | respondida | Luan, 19/11/2026: vale para todos os cargos (Admin, Gerente e Atendente), sem opção na tela |
