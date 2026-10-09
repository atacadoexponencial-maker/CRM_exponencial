# B11 — Registro de decisões: automações em fluxo de blocos

**Data desta sessão:** 30/09/2026
**Quem:** Luan
**Spec:** `docs/specs-arquivadas/spec-automacoes-v2.md` (arquivada em 08/10/2026, depois do merge)
**Branch:** `b11-automacoes-v2`

> Este documento registra o **caminho**, não só o resultado: o que foi decidido, o
> que foi descartado e por quê.

---

## 1. Formato da regra: fluxo de blocos, e não formulário em lista

**Decidido:** a regra é um fluxo de blocos ligados, no estilo do N8N. Um bloco de
gatilho abre o fluxo, blocos de condição têm saídas **sim** e **não**, e blocos de
ação fazem uma coisa cada.

**Descartado:** a primeira versão da spec (29/09) tinha um formulário com três blocos
fixos empilhados (Quando, Se, Então): uma lista de condições com E e uma lista de
ações em ordem, com botões para mover para cima e para baixo.

**Por quê:** o Luan pediu um fluxo "bem livre", que permita uma variedade grande de
automações. O formulário em lista não consegue ter caminhos diferentes conforme o
caso: por exemplo, se o cliente tem a tag VIP manda a mensagem A, se não tem manda a
B. Com a lista, isso exigiria duas regras separadas que precisam ser mantidas iguais.

**Consequência para o banco (B11-02):** a regra é guardada como blocos + ligações.
Guardar como lista e mudar para blocos depois obrigaria uma segunda migração de
todas as regras. Guardando como blocos desde o início, as extensões da fase 2
(caminhos em paralelo, bloco "esperar") não mudam o formato.

## 2. Limites do fluxo na fase 1

| Regra | Por quê |
|---|---|
| Cada saída leva a **um** bloco só | Com duas setas saindo da mesma saída, a ordem de execução entre os dois caminhos fica ambígua. Caminhos em paralelo ficaram para a fase 2. |
| Uma entrada pode receber **várias** ligações | Caminhos que se juntam ("em qualquer caso, depois aplique a etiqueta X") não têm ambiguidade e evitam repetir blocos. |
| **Sem laços** | Sem o bloco "esperar", um laço roda para sempre na mesma execução. O editor recusa a ligação na hora de conectar. |
| **OU** se faz encadeando condições pelo "não" | Um bloco de condição só tem E. Isso mantém o bloco simples e cobre o OU sem um construtor de grupos. |
| Ligar uma saída ocupada **troca** a ligação | É o que a pessoa quer quando arrasta de novo de uma saída que já tem seta, e dispensa uma mensagem de erro. |

## 3. Biblioteca do canvas: React Flow (`@xyflow/react`)

**Decidido:** o canvas do editor usa o React Flow (`@xyflow/react`, v12, licença MIT).

**Por quê:** é a biblioteca de referência para editores de nós em React. O próprio
N8N usa o Vue Flow, que é o equivalente dela em Vue. Arrastar, aproximar, ligar
blocos por alças de saída e entrada, e recusar uma ligação (`isValidConnection`)
já vêm prontos. Escrever isso à mão seria a maior parte do trabalho da B11-01 e
da B11-05.

**Descartado:** montar o canvas à mão com SVG e eventos de ponteiro. Dá para fazer,
mas não compensa.

**Como integrar (da documentação oficial):** o CSS da biblioteca é importado no CSS
global, **depois** do Tailwind (orientação específica para Tailwind 4); o componente
precisa de um contêiner pai com altura definida; os tipos de bloco (`nodeTypes`) são
declarados fora do componente, para não recriar os blocos a cada renderização.

## 4. Branch, merge e banco

**Decidido:** a série inteira é feita no branch `b11-automacoes-v2` e entra no
`master` **uma vez só**, depois que o Luan testar o motor e o editor novos no preview
da Vercel e aprovar.

**Descartado:** merge por etapas (B11-01+02, depois 03+04, depois o resto). O Luan
quer ver a troca do motor e o editor funcionando antes de qualquer coisa ir para
produção.

**Restrição que isso impõe:** o Supabase é um só, e ele é ao mesmo tempo produção e
desenvolvimento. O preview grava no banco real. Por isso:

- As migrations da B11 **só acrescentam** (tabelas e colunas novas). Nada é apagado
  nem alterado, e o CRM publicado continua lendo a estrutura antiga sem perceber.
- A limpeza da estrutura antiga (`acao_tipo`, `acao_config` etc.) é uma etapa
  separada, **depois do merge**, quando der para confirmar que nada mais usa aquilo.
- Os testes no preview disparam ações de verdade. Por isso devem ser feitos com um
  contato de teste.
- As mensagens do WhatsApp chegam só no CRM publicado. Gatilhos de mensagem
  (B11-04 em diante) precisam ser testados simulando o evento ou apontando o gateway
  para o preview por um tempo.
- O branch vai viver bastante tempo, então o `master` deve ser trazido para dentro
  dele de tempos em tempos.

## 5. Onde o fluxo fica guardado e como as regras antigas entram (07/10/2026)

Os três pontos que ficaram em aberto na sessão de 30/09 foram fechados no plano da
B11-02.

### 5.1 Tabela nova, `automation_flows`, com o fluxo em `jsonb`

**Decidido:** as regras em fluxo ficam numa tabela nova. O fluxo inteiro (blocos e
ligações) fica numa coluna `jsonb`. O tipo do gatilho é uma coluna **gerada** a
partir do fluxo, para o motor filtrar por gatilho sem ler todas as regras.

**Descartado 1: colunas novas em `automations`.** Uma regra nova ali precisaria de
`gatilho_tipo` e `acao_tipo` preenchidos, que são obrigatórios e só aceitam os
valores antigos. Com valores antigos, o motor publicado executaria a regra nova
como se fosse antiga. Para evitar isso, seria preciso afrouxar as restrições, e
aí a tela publicada listaria regras que ela não sabe mostrar. A tabela nova é
invisível para o `master`.

**Descartado 2: tabelas separadas de blocos e de ligações.** O fluxo é sempre lido
e gravado inteiro: o editor salva o desenho todo, e o motor carrega o desenho
todo. Em tabelas separadas, cada salvamento viraria várias escritas que precisam
dar certo juntas. A validação já está nas funções puras de
`src/lib/fluxo-automacao.ts`, e não precisa do banco. O histórico (B11-03) aponta
para a regra e para o `id` do bloco, que é estável dentro do fluxo.

### 5.2 Regras antigas viram fluxo na hora, e não por cópia

**Decidido:** o motor lê as regras de `automations` como sempre e monta, em
memória, o fluxo de dois blocos de cada uma (gatilho → ação). Nada é copiado
para `automation_flows` antes do merge.

**Descartado: copiar as regras antigas na migration**, como a primeira versão da
issue previa. Até o merge, a produção continua editando `automations` pela tela
antiga, e o próprio `master` já mudou essas regras por migration (os funis
renomeados na B12 e as etapas novas na B14 e na B15). Uma cópia feita agora
ficaria desatualizada sem ninguém perceber. Lendo na hora, a regra antiga roda
sempre do jeito que está gravada.

**Consequência para o merge:** a cópia para `automation_flows` acontece uma vez
só, na limpeza depois do merge, mantendo o mesmo `id` de cada regra. Assim o
histórico da B11-03 continua apontando para a regra certa.

### 5.3 Teste no preview

As ações rodam de verdade, então o teste usa um contato de teste. No preview, só
chegam os gatilhos que nascem no CRM: o card movido chega, e a conversa criada
não, porque ela nasce de mensagem recebida, que vai para a produção. Uma regra
nova (em `automation_flows`) só roda no preview, porque o `master` não conhece a
tabela. Um card movido na produção continua disparando só as regras antigas.

### 5.4 O editor passa a gravar logo depois do motor

**Decidido em 07/10/2026:** o Luan quer montar e testar automações no preview logo
depois do motor. Por isso, a parte da B11-05 que liga o editor e a lista ao banco
vem logo depois da B11-02, numa issue própria. A B11-05 fica com o gatilho
"mensagem enviada pelo time".

**Descartado:** testar o motor só com fluxos gravados por script, esperando a
B11-05 para o editor gravar.

## 6. Regras antigas no branch, e chip e API Oficial juntos (07/10/2026)

### 6.1 Regra antiga na lista nova: "versão antiga", e a nova vira a principal

**Decidido com o Luan (B11-10):** a lista nova mostra as regras de `automations`
marcadas como "Versão antiga · continua rodando". Abrir uma no editor e salvar
cria a versão em fluxo, que guarda o `id` da antiga em
`automation_flows.automation_id`. A partir daí, o motor do branch roda só a
versão nova, mesmo que ela esteja pausada: o admin trocou uma pela outra.
Excluir a versão nova faz a antiga voltar a valer no branch.

**O branch não pausa nem exclui a regra antiga.** As duas ações gravariam em
`automations`, que é a tabela que a produção lê até o merge, e isso mudaria o CRM
publicado. Na lista, o interruptor e o "Excluir" da regra antiga ficam
desligados.

**Descartado:** esconder as regras antigas do branch. O admin perderia de vista
o que já roda, e uma regra antiga e uma nova poderiam fazer a mesma coisa em
dobro sem ninguém perceber.

**Consequência para o merge:** na limpeza depois do merge, a regra antiga com
versão nova é descartada, e a sem versão nova é copiada para `automation_flows`
com o mesmo `id` (seção 5.2).

### 6.2 Só se monta o que o motor executa

`GATILHOS_DISPONIVEIS`, `VERIFICACOES_DISPONIVEIS`, `ACOES_DISPONIVEIS` e
`REPETICAO_DISPONIVEL`, em `src/lib/fluxo-automacao.ts`, dizem o que o motor já
sabe fazer. O editor mostra o resto como "em breve", e `pendenciasDoFluxo` recusa,
tanto no editor quanto no servidor. Cada issue da B11 que ensina algo novo ao
motor acrescenta a essas listas.

**Descartado:** deixar montar tudo e ignorar no motor o que ele não conhece. A
regra seria salva, pareceria pronta e não faria parte do que mostra.

### 6.3 Chip (gateway) e API Oficial na mesma empresa

**Situação em 07/10:** o CRM roda com chip (canal direto). A API Oficial vai
entrar depois, e haverá empresas com os dois canais.

**Não muda nada na B11 agora.** O envio de mensagem do motor sai pelo número da
conversa do contato, com o canal que ele tiver (B7-01). A condição "Canal da
conversa é API Oficial / canal direto / número X" deixa o fluxo seguir caminhos
diferentes conforme o canal.

**Ponto em aberto para quando a API Oficial entrar:** fora da janela de 24 horas
desde a última mensagem do cliente, a Meta só aceita template aprovado, e texto
livre é recusado. No chip não há esse limite. A saída provável é uma ação
"Enviar template", que vale só para números da API Oficial, combinada com a
condição de canal. Até lá, um "Enviar mensagem" fora da janela num número da API
Oficial falha, e a falha fica no histórico (B11-03).

## 7. Ações de contato e de time antes da hora (B11-11, 07/10/2026)

**Decidido:** a pedido do Luan, as ações que não dependem do WhatsApp entram
antes do resto da B11-06 e da B11-08: adicionar e remover tag, remover etiqueta,
alterar dado do contato e atribuir a um time. Os gatilhos e as condições de tag e
dados continuam na B11-06.

### 7.1 Classificação fora do "alterar dado do contato"

**Achado:** o CRM calcula a classificação do contato pela etapa dos cards
(`calcularClassificacao`), no perfil, na lista e nas campanhas. A coluna
`contacts.classificacao` existe, mas nenhuma tela a lê e nada a grava.

**Decidido:** a ação muda tipo, nicho, cidade, ou acrescenta uma linha às
observações. Para mudar a classificação, move-se o card.

**Descartado:** gravar a coluna. A automação pareceria funcionar e nada mudaria
na tela. Também foi descartado fazer as telas lerem a coluna, porque aí ela
competiria com a etapa do card e as duas poderiam discordar.

### 7.2 Tag nova no "adicionar tag"

O editor só oferecia as tags que algum contato já tem. Numa empresa sem tags,
"adicionar tag" não teria o que escolher. O campo passou a aceitar uma tag
digitada, com as existentes como sugestão, e com as mesmas regras da tela do
contato: minúsculas, sem espaço, até 50 caracteres. "Remover tag" continua
escolhendo entre as existentes.

### 7.3 Atribuir a um time

Entre os membros ativos do time, ganha o que tem menos conversas abertas
(`em_espera` e `em_atendimento`). No empate, o primeiro pelo nome, para o
resultado ser previsível. O escolhido recebe a conversa e o card, como em
"atribuir atendente". Desde a B11-08, fora do gatilho "card movido", o card é o
principal do contato, o da Recompra se houver (seção 10.5).

**Descartado:** sortear no empate. Um sorteio deixaria o teste no preview sem
resultado previsível e não traz equilíbrio a mais que a contagem de conversas.

### 7.4 Toda ação sobre um dado tem a condição que o lê

**Regra:** o que uma ação liberada muda, uma condição liberada consegue
perguntar. Senão o fluxo escreve um dado que ele mesmo não consegue usar. O Luan
achou isso no primeiro teste: dava para adicionar uma tag, mas a condição "tag do
contato" estava "em breve". Por isso entraram as condições de tag, tipo e
classificação junto com as ações.

**Exceções aceitas por enquanto:** nicho, cidade e observações podem ser
alterados, mas não há condição sobre eles, e a spec não prevê nenhuma. Se fizer
falta, entram como verificações novas ("nicho é", "cidade é").

**Verificações que continuam "em breve":** texto e tipo da mensagem (só servem
nos gatilhos de mensagem, que ainda não estão liberados) e horário comercial
(depende da configuração de horário, B11-08).

### 7.5 "Mover card" segue a regra do CRM

**Achado no teste do Luan:** uma regra mandava leads da Entrada para etapas da
Recompra, e nada acontecia. "Mover card" move o card que o contato já tem no
funil de destino, e os leads não tinham card na Recompra.

**Decidido com o Luan:** a automação segue a regra do arrastar manual. Não cria
card em funil onde o contato não tem. Mover para Ganho no Funil de Entrada cria
o card na Recompra, em Onboarding, se ainda não houver. O editor avisa quando a
ação aponta para a Recompra.

**Descartado:** criar o card em qualquer funil. Um lead viraria cliente na
Recompra sem passar por Ganho, e a classificação (calculada pelos cards) mudaria
para "ativo".

**Sequências da etapa, decidido pelo Luan em 07/10/2026:** o arrastar manual
inicia uma sequência quando o card entra em Ganho (onboarding), Catálogo Enviado
ou Inativos. Na automação, isso virou uma opção da ação "mover card": "Iniciar a
sequência desta etapa, como ao arrastar o card". Ela só aparece para essas três
etapas e começa desmarcada. A sequência só começa quando o card de fato entra na
etapa. Em Ganho, só quando o card da Recompra nasce, como no manual.

**Descartado:** iniciar sempre, igual ao manual. As sequências podem mandar
mensagem, e as regras antigas que movem cards passariam a iniciá-las sem
ninguém ter escolhido. Também foi descartado nunca iniciar, porque aí a
automação não conseguiria repetir o que o time faz à mão.

## 8. Histórico de execuções e proteção de repetição (B11-03, 07/10/2026)

### 8.1 Uma tabela, com cópias

**Decidido:** cada execução é uma linha em `automation_runs`, com cópias do que
importa para lê-la depois: o nome da regra, o evento e os blocos percorridos,
cada um com a saída tomada ou o resultado da ação. A regra é apontada por
`regra_id`, sem chave estrangeira.

**Por quê:** o histórico precisa continuar legível quando a regra muda ou é
excluída (spec: "ver a execução de uma regra que foi excluída, com o nome que ela
tinha"). Também precisa apontar tanto para regras em fluxo quanto para regras
antigas, que estão em tabelas diferentes até o merge.

**Descartado:** guardar só os ids dos blocos e montar o detalhe a partir da regra
atual. Bastaria editar a regra para o detalhe de execuções antigas mostrar blocos
que não existiam, ou não mostrar os que existiam.

### 8.2 Resultado da execução e de cada ação

- **`concluida`:** o caminho terminou sem falha.
- **`falhou`:** alguma ação falhou, ou uma condição não conseguiu consultar o
  banco.
- **`ignorada`:** a proteção de repetição barrou.

Cada ação tem o próprio resultado e o motivo em português, como "A etiqueta não
existe mais" ou "Nenhum número de WhatsApp conectado". Assim uma ação que falhou
no meio e as seguintes que deram certo aparecem como tal.

**Condição com erro de banco:** antes da B11-03, o erro subia e a regra parava
sem deixar rastro. Agora o percurso para ali e devolve o que já percorreu, e a
execução fica `falhou`, com o caminho até a condição.

### 8.3 Proteção de repetição

- **"Uma vez por contato":** barra se já houve uma execução concluída ou com
  falha da regra para o contato. A ignorada não gasta a vez. *Mudou em
  09/10/2026: só gasta a vez a execução em que alguma ação deu certo (seção 17).*
- **"No máximo a cada N horas":** barra se houve uma nas últimas N horas, de 1 a
  8760 (um ano).
- **"Sempre":** não barra.

Sem contato no evento, não há o que proteger, e a regra roda. Se a consulta da
proteção falhar, a regra não roda e a execução fica `falhou`: é melhor não
disparar do que disparar em dobro.

**Padrões:** regra nova nasce em "uma vez por contato", como no protótipo
aprovado. Regra antiga, e a versão nova criada a partir dela, ficam em "sempre",
que é como rodavam. Uma regra de "card movido" com "uma vez por contato" só roda
na primeira vez que o card entra na etapa. Quem quiser que rode toda vez escolhe
"sempre".

### 8.4 Envio com motivo

`enviarTextoWhatsApp` devolve só certo ou errado, e as sequências usam assim.
Nasceu ao lado dela a `enviarTextoWhatsAppComMotivo`, que devolve o motivo, e a
primeira passou a chamar a segunda. As sequências não mudam.

### 8.5 O que fica para depois

- **Limpeza das execuções antigas:** a página mostra no máximo 30 dias, mas as
  linhas mais antigas continuam no banco. Uma rotina de limpeza entra quando o
  volume pedir.
- **Contagem da lista:** a lista conta as execuções lendo até 5.000 linhas dos
  últimos 30 dias. Com muito volume, vira uma consulta agregada no banco.

## 9. Gatilhos de tag, etiqueta e dado do contato (B11-06, 07/10/2026)

### 9.1 Onde nascem

Os três gatilhos nascem nas actions do CRM que mudam o dado, depois de gravar:

| Gatilho | Action |
|---|---|
| Tag adicionada | `adicionarTagContato`, usada no perfil e no painel do card |
| Etiqueta aplicada | `aplicarEtiqueta`, do chat |
| Tipo, nicho ou cidade alterados | `atualizarDadosContato`, que compara o antes e o depois |
| Classificação alterada | `moverCard` e `criarNovoLead`, do funil |

As actions só chamam funções de `src/lib/automacoes/gatilhos-do-crm.ts`, para a
mudança nas telas de outros módulos ficar em uma ou duas linhas.

**Automação não dispara automação, por construção:** as ações das automações
gravam direto no banco e não passam por essas actions. A classificação é o caso
delicado. O "depois" é calculado a partir dos cards de antes, com só o movimento
manual aplicado (e o card de Onboarding que nasce em Ganho). Assim, o que as
automações de "card movido" moverem no meio-tempo não conta.

**Descartado:** disparar a partir de gatilhos do banco (triggers do Postgres).
Pegaria tudo, inclusive o que as próprias automações gravam, e a guarda
anti-loop teria que distinguir quem gravou.

### 9.2 Sem "atendente" no gatilho de dado

`contacts.atendente_id` nunca é gravado por nenhuma tela, e o perfil mostra o
atendente sempre vazio. Um gatilho sobre ele nunca dispararia, por isso saiu da
lista de campos. Quem atende o contato muda na conversa (atribuir, transferir) e
no card. Isso pode virar um gatilho próprio na fase 2.

### 9.3 Não dispara o que não mudou

Não disparam: a tag que o contato já tinha (o banco recusa a repetida), a
etiqueta que a conversa já tinha e o dado salvo com o mesmo valor. Um dado
apagado dispara com valor vazio.

### 9.4 Achado: os menus do Base UI não usam `onSelect`

Ao testar a "etiqueta aplicada" pelo chat no preview, clicar na etiqueta não
aplicou nada. O `DropdownMenuItem` do Base UI só tem `onClick`, e 21 itens de
menu do app (23 no `master`) usam `onSelect`, que nunca é chamado. Isso afeta,
na produção:

- **Chat:** etiquetas, transferir, resolver e reabrir.
- **Agenda:** adiar lembrete e reatribuir.
- **Configurações:** editar e excluir etiquetas, mensagens rápidas, times e
  usuários.
- **Sequências:** um item do menu.

Já tinha sido anotado na B11-01 como suspeita e agora está confirmado.

**Conserto (07/10/2026):** o Luan decidiu consertar direto no `master`, fora do
merge único da B11, porque o bug estava na produção. Foi feito assim:

- Branch `fix/menus-onselect`, criado a partir do `master`, com a troca de
  `onSelect` por `onClick` nos 23 itens de 9 arquivos (commit `fec6626`).
- Conferido no preview desse branch com `e2e/preview/roteiro-menus.cjs`:
  - No chat, aplicar e remover etiqueta, resolver e reabrir, conferidos no banco.
  - "Editar" das etiquetas e o menu de times abrem os diálogos.
  - Nenhum erro no console.
- Entrou no `master` por avanço direto, sem commit de merge, porque o `master`
  não tinha andado. O branch foi apagado.
- O `master` foi trazido para o `b11-automacoes-v2`. O único conflito foi a tela
  antiga de automações, que o `master` alterou e a B11 apagou. Ficou apagada.

**Descartado:** consertar só no branch da B11. O bug ficaria na produção até o
merge único, que depende da aprovação da B11-01.

**Achado no caminho:** o roteiro travava no "Resolver" porque o reset da empresa
de teste não devolvia o status das conversas. Uma rodada anterior tinha
resolvido e reaberto a da Ana. Sem atendente, "Reabrir" deixa a conversa em
espera, e nesse status o menu só oferece "Atribuir". O reset passou a voltar as
conversas para "em atendimento".

## 10. Sequência, resolver, reabrir e horário comercial (B11-08, 07/10/2026)

### 10.1 Onde o horário fica guardado

Numa tabela nova, `business_hours`, com uma linha por empresa, no padrão da
`alert_config`. A migration só acrescenta. Sem linha, vale o padrão do código:
de segunda a sexta, das 08:00 às 18:00. Assim, a condição funciona desde o
primeiro dia, e o painel mostra qual horário está valendo.

**Descartado:** uma coluna em `workspaces`. Essa tabela só tem política de
leitura. Liberar a escrita para o admin deixaria ele mexer nas outras colunas
da empresa.

### 10.2 Uma faixa, no fuso de Brasília

Uma faixa só para todos os dias marcados, como a spec pede ("dias e faixa").
O início vem antes do fim, então não há faixa que atravesse a meia-noite. O
início conta como dentro e o fim, como fora: às 18:00 em ponto já é fora.

A hora é lida no fuso fixo da operação (`FUSO_DA_OPERACAO`), o mesmo das telas.
A Vercel roda em UTC: sem o fuso escrito, sexta às 22h de Brasília seria sábado
à 1h, e a regra erraria o dia.

**Descartado:** uma faixa por dia (sábado só de manhã, por exemplo). Fica para
quando alguém pedir.

### 10.3 Onde se configura

Pelo botão "Horário comercial" na lista de automações, ao lado de "Histórico",
que abre um diálogo. O painel da condição de horário mostra o horário em vigor
e diz onde mudar.

**Descartado:** uma página própria no menu de Configurações. Seria mais um item
no menu por causa de um ajuste que só as automações usam hoje. Se a fila de
atendimento ou outra tela passar a usar o horário, ele muda de lugar.

### 10.4 As três ações

- **Iniciar sequência:** usa o mesmo início do manual
  (`iniciarExecucaoSequencia`).
  - O responsável é o atendente da conversa no momento da ação. Assim,
    "atribuir ao time → iniciar sequência" já pega quem acabou de ser atribuído.
    O nome dele preenche `{{nome_vendedor}}` nas mensagens da sequência.
  - Sem atendente na conversa, a sequência escolhe a cada lembrete. É o que ela
    já fazia: o atendente da conversa e, se não houver, o primeiro admin.
  - Sequência já em andamento para o contato conta como feita, como a tag que
    ele já tem.
  - Sequência desativada ou apagada é falha, com o motivo no histórico.
  - O plano era sempre começar sem responsável. Mudou ao ler o motor de
    sequências: a mensagem usa o responsável gravado para o nome do vendedor, e
    ficaria em branco.
- **Resolver:** age na conversa aberta. Sem conversa aberta, não há o que
  resolver, e conta como feita.
- **Reabrir:** age na conversa mais recente do contato, porque a resolvida não
  é "aberta" e `conversaDoEvento` não a encontra. Segue o "Reabrir" do chat:
  com atendente, a conversa volta "em atendimento"; sem, "em espera". Contato
  sem conversa nenhuma é falha.

### 10.5 "Atribuir" passa também o card principal

**O problema:** o "Pronto quando" da B11-08 diz que, na regra de mensagem
recebida fora do horário, "o card do contato fica com um atendente do time".
Até aqui, "atribuir" (atendente ou time) passava a conversa e só passava o card
no gatilho "card movido", como na primeira versão e no chat. Com "mensagem
recebida", o card não mudaria.

**Decisão do Luan (07/10/2026):** "atribuir" passa também o card, e o principal
é o da Recompra. Nas palavras dele: no Funil de Entrada ficam só os clientes
novos; quem é ganho lá fez o primeiro pedido e vira cliente recorrente na
Recompra. Quem tem card nos dois funis é atendido pelo da Recompra.

Ficou assim:

- **Gatilho "card movido":** passa o card que se moveu, porque é dele que a
  regra trata. Não mudou.
- **Os outros gatilhos:** passam a conversa aberta e o card principal do
  contato, que é o da Recompra, se houver, ou o da Entrada.
- **Sem conversa aberta e sem card:** a ação falha com "O contato não tem
  conversa aberta nem card". Antes, ela contava como feita sem mudar nada.

**Consequência no merge:** as regras antigas viram fluxo. Uma regra antiga
"conversa criada → atribuir atendente" passa a mudar também o card principal
do contato, o que antes não fazia. É o que o Luan descreveu como certo.

**Descartado:**

- Manter só a conversa e corrigir a frase do "Pronto quando". O card ficaria com
  um atendente diferente do da conversa.
- Passar os dois cards. O da Entrada de um cliente ganho não é mais trabalhado.

## 11. Regras em fila, depois da resposta (B11-09, 07/10/2026)

### 11.1 Como ficou

O ponto de disparo grava o evento em `automation_queue` e responde. São eles o
webhook da Meta, o recebimento do gateway e as actions do funil, do contato e do
chat. Logo depois da resposta, o `after()` do Next consome a fila do contato e
roda as regras com o motor de sempre (`processarAutomacoes`). O evento que
termina sai da fila, e o histórico continua em `automation_runs`.

Os eventos de um mesmo contato rodam um de cada vez, na ordem em que chegaram.
Contatos diferentes rodam em paralelo. Quem garante a ordem é a função
`reivindicar_evento_de_automacao`, no banco:

- trava a chave do contato (`pg_advisory_xact_lock`);
- não entrega nada enquanto outro evento do contato está rodando;
- quem termina um evento pede o próximo.

**Por que a ordem por contato:** o cliente manda "oi", "tudo bem?" e "quanto
custa?" em 3 segundos. Em paralelo, as 3 execuções conferem a proteção "uma vez
por contato" ao mesmo tempo, nenhuma enxerga a outra, e a mensagem de ausência
sai 3 vezes. Em fila, a segunda já vê a primeira e é ignorada.

### 11.2 Alternativas descartadas

- **Cron curto na Vercel:** os crons do projeto são diários, o máximo no plano
  Hobby. No Pro, o mínimo é 1 por minuto, acima dos 30 segundos do "Pronto
  quando".
- **`pg_cron` e `pg_net` no Supabase chamando uma rota do CRM:** o banco é um só
  para a produção e o preview. O cron chamaria um endereço fixo, e os eventos
  do preview rodariam com o código da produção, ou o contrário. Também exigiria
  guardar a chave da rota dentro do banco.
- **Serviço de fila da plataforma (Vercel Queues):** mais uma dependência paga,
  para um volume que o Postgres atende.
- **Só `after()`, sem tabela:** resolve o tempo de resposta, mas deixa os
  eventos de um mesmo contato em paralelo (o problema acima), e um evento
  perdido numa queda não deixa rastro.

### 11.3 Limites aceitos

- **No máximo uma vez.** O evento que estava rodando quando a função caiu não é
  repetido, porque repetir poderia mandar a mesma mensagem duas vezes. Depois de
  5 minutos, o tempo máximo da função, ele é marcado como descartado e para de
  travar a fila do contato.
- **Evento esperando há mais de 10 minutos é descartado,** para a regra não
  responder fora de hora. Só acontece se a função cair entre gravar o evento e
  consumir a fila. Quem consome é o próximo evento do mesmo contato.
- **Falha ao gravar na fila:** as regras rodam do mesmo jeito depois da
  resposta, só que sem a ordem por contato.
- **A tela não mostra na hora o que a automação fez.** Antes, mover o card
  esperava as regras, e a tela recarregada já vinha com a tag que a automação
  pôs. Agora a resposta volta antes, e o efeito aparece na próxima atualização.
  É o que a spec pede: "as ações do chat respondem na hora, e as regras rodam
  logo depois".
- **No webhook, a ordem mudou.** Antes, as regras de "conversa criada" rodavam
  antes de a mensagem recebida ser gravada. Agora rodam depois, com a mensagem
  já no chat.

### 11.4 O que o preview não conseguiu mostrar

O roteiro tentou provar que a resposta volta antes das regras, conferindo se o
evento ainda estava na fila quando a resposta chegava. Não deu: a regra leva
uns 300 ms, porque a Vercel e o banco ficam perto, e acaba antes de o roteiro
conseguir consultar. A verificação foi retirada, porque não provava nada nem num
sentido nem no outro. Quem garante que as regras rodam depois da resposta é o
`after()` do Next, coberto pelos testes de `src/test/automacoes-fila.test.ts`. A
medição do "Pronto quando", o tempo de resposta do webhook, fica para quando a
B11-04 trouxer a mensagem recebida.

**Medida em 08/10/2026 (B11-04):** com mensagens simuladas no webhook do gateway
do preview, a mediana de 5 respostas ficou em 801 ms com as regras pausadas e em
774 ms com duas regras ativas. A diferença está dentro da variação da rede. Os
~800 ms são do próprio webhook (contato, conversa, mensagem e tempo real) e da
distância até a Vercel. Não vêm das regras.

## 12. Gatilho "mensagem recebida" (B11-04, 08/10/2026)

### 12.1 Onde dispara

No ponto em que cada canal grava a mensagem nova, logo depois do `insert` em
`messages`, e só se a mensagem foi gravada:

- **Canal direto:** em `registrarMensagemRecebida`
  (`src/lib/whatsapp/recebimento.ts`). Reação e aviso de mensagem editada ou
  apagada são desviados antes, em `receberMensagem`, e nunca chegam lá. Por isso
  não disparam, sem filtro nenhum.
- **API Oficial:** no laço de mensagens de `src/app/api/webhooks/whatsapp/route.ts`.
  Esse webhook grava a reação como mensagem, e assim continua. O disparo pula
  os tipos `reaction` e `system`.

**Mensagem não gravada não dispara.** `messages.wamid` é único. Na reentrega de
um evento que morreu no meio, o `insert` repetido falha, e as regras não rodam
duas vezes.

Quando a conversa nasce com a mensagem, o evento de "conversa criada" entra na
fila antes do de "mensagem recebida". As regras de conversa criada rodam
primeiro.

### 12.2 O que as condições leem

- **Texto:** o que o cliente escreveu. É o texto, ou a legenda da foto, do vídeo
  ou do documento. Localização e cartão de contato têm texto vazio, porque o
  conteúdo gravado deles é montado pelo CRM. Na API Oficial, só o `text.body`,
  porque esse webhook ainda não lê mídia.
- **Tipo:** o do vocabulário do CRM (`texto`, `imagem`, `audio`, `video`,
  `documento`, e também `figurinha`, `localizacao`, `contato`). Na API Oficial,
  o `type` da Meta passa pelo mesmo `TIPO_NO_CRM` do gateway. As regras veem o
  tipo verdadeiro, mesmo com esse webhook gravando tudo como texto.
- **Exceção:** `desconhecido` com texto conta como `texto`
  (`tipoDaMensagemParaRegras`). O gateway manda tipo fora do mapa quando o
  cliente responde citando outra mensagem ou manda link. Sem a exceção, "tipo é
  texto" falharia em toda resposta citada.

**Comparação:** reaproveita `normalizarTexto`, de `src/lib/catalogo/planilha.ts`,
que tira maiúsculas, acentos e espaços repetidos dos dois lados. "Contém alguma
das palavras" separa a lista por vírgula, como a spec pede. Itens vazios são
ignorados, e cada item é procurado como trecho, igual ao "contém". Assim,
"preço" acha "preços".

- **Descartado:** comparar por palavra inteira. "Preço" deixaria de achar
  "preços", e "catálogo" deixaria de achar "catálogo?" sem tratar a pontuação.
  Quem precisar de exatidão tem o "é igual a".

### 12.3 A conversa da regra

Numa mensagem recebida, as ações agem na conversa onde a mensagem chegou, e não
na conversa aberta mais recente do contato. É assim desde a "conversa criada".
Com dois números, a etiqueta vai para a conversa certa. `conversaDoEvento` e o
reabrir passaram a usar a conversa de qualquer evento que traga uma.

### 12.4 "Testar com um contato" e histórico

- **Testar com um contato** usa a última mensagem recebida do contato, na
  conversa mais recente, com o mesmo texto e o mesmo tipo que o recebimento
  entregaria. É o "com os dados de agora" do diálogo. Sem mensagem, o texto e o
  tipo ficam vazios, e as condições de mensagem não valem.
  - **Descartado:** pedir no diálogo uma mensagem de exemplo. Mudaria a tela, e
    ninguém pediu.
- **Histórico:** o evento gravado leva o tipo e até 200 caracteres do texto. A
  linha mostra `Mensagem recebida: "Quero o CATÁLOGO"`. Sem texto, mostra o
  tipo, por exemplo "Mensagem recebida (imagem)".

### 12.5 Teste no preview

O endereço de webhook de uma instância do chip é gravado na criação, a partir de
`NEXT_PUBLIC_APP_URL` (ou da URL da produção). A mensagem de verdade vai para a
produção, que roda o `master`, e não chega ao preview.

**Decidido com o Luan:** o roteiro manda ao `/api/webhooks/gateway` do preview um
`message.received` assinado como o gateway assina. O segredo é uma
`GATEWAY_WEBHOOK_SECRET` só do Preview do branch `b11-automacoes-v2`, com o valor
do `.env` local. A variável de "Production and Preview" guarda o segredo da
produção e não foi tocada: trocar o valor dela faria a produção responder 401 ao
gateway de verdade, e 401 faz o gateway parar de reenviar.

O webhook acha a empresa pelo `instance_id`. O roteiro cria uma conexão
temporária com status `removed`, que não aparece na tela e não é consultada, e a
apaga no fim.

- **Descartado:** apontar o webhook do chip para o preview. Exigiria mudar a
  instância no gateway, e o preview tem a proteção de acesso da Vercel.
- **API Oficial:** conferida só pelos testes automatizados. O CRM roda com chip
  hoje (seção 6.3).

O envio de verdade (B11-05 e B11-07) precisa de um chip conectado na empresa de
teste. Com ele conectado, as regras que enviam passam a enviar. O roteiro da
B11-06 manda mensagem para a Ana, que tem telefone falso (README dos roteiros).

## 13. Gatilho "mensagem enviada pelo time" (B11-05, 08/10/2026)

### 13.1 Onde dispara

Nas cinco funções de envio do chat (`src/app/(auth)/chat/actions.ts`): texto,
imagem, documento, vídeo e áudio. O disparo acontece depois que o WhatsApp
aceitou a mensagem e ela foi gravada, por `dispararMensagemEnviadaPeloTime`
(`gatilhos-do-crm.ts`). A tentativa que falhou continua gravada na conversa,
como antes, mas não dispara, porque a mensagem não saiu. A mensagem rápida
escolhida no chat sai pelo envio de texto e dispara: quem mandou foi uma pessoa.

**Automação, sequência e campanha nunca disparam, por construção.** Elas enviam
por `enviarTextoWhatsApp`/`enviarTextoWhatsAppComMotivo` (`whatsapp-envio.ts`) e
por `campanhas.ts`, que não chamam o motor. É a regra da seção 9.1: só as telas
do CRM disparam.

- **Descartado:** marcar na mensagem quem enviou e filtrar no motor. Exigiria
  uma coluna nova em `messages` e lembrar de preencher em todo envio. Disparar no
  lugar certo não depende de ninguém lembrar.

### 13.2 O evento

O evento tem os mesmos campos da mensagem recebida (conversa, mensagem, tipo e
texto, no tipo `MensagemDoEvento`), e as condições de texto e tipo valem nos dois
gatilhos. O chat não manda legenda com a mídia, então imagem, documento, vídeo e
áudio chegam com texto vazio. No histórico, a linha é `Mensagem do time: "…"`.

**"Testar com um contato"** usa a última mensagem enviada na conversa mais
recente, sem as que falharam. O CRM não grava quem enviou, então essa mensagem
pode ser de uma automação. Para uma simulação, serve.

### 13.3 Teste no preview

O envio pelo chat sai de verdade. O roteiro precisa do chip conectado na empresa
de teste e de um número real para receber (`B11_TESTE_TELEFONE_REAL`), e para
antes de enviar se faltar algum. "Uma sequência que manda o mesmo texto não
dispara" é conferido com uma automação que manda o texto: as duas usam o mesmo
envio, e a sequência só roda no cron diário. Um teste automatizado confere que
esse envio não chama o motor.

## 14. Mensagem com variáveis, mensagem rápida e arquivo (B11-07, 08/10/2026)

### 14.1 Achado: as variáveis saíam literalmente

A ação "Enviar mensagem", disponível desde a B11-02, mandava o texto como
estava. O editor anunciava `{{primeiro_nome}}` e as outras variáveis, mas elas
chegavam ao cliente entre chaves. Corrigido aqui. As regras antigas que tinham
variável no texto passam a sair com o nome.

### 14.2 Variáveis

- `{{nome_contato}}`: o nome do contato ou, sem nome, o telefone. É a regra das
  sequências e das campanhas (`substituirVariaveis`, reaproveitada).
- `{{primeiro_nome}}`: a primeira palavra do nome. Sem nome, fica vazio.
  - **Descartado:** cair no telefone, como `{{nome_contato}}`. "Oi 5519…" soa pior
    que "Oi ,", e os contatos do canal direto nascem sem nome.
- `{{nome_vendedor}}`: o atendente da conversa. Sem atendente, o do card
  principal (Recompra, senão Entrada, seção 10.5). Sem nenhum, vazio.
- O banco só é consultado quando o texto tem `{{`. A mensagem rápida passa
  pelas mesmas variáveis.

### 14.3 Arquivo

O admin escolhe o arquivo no editor, e ele sobe na hora
(`guardarArquivoDaAutomacao`) para o bucket das campanhas, `chat-attachments`, na
pasta `<empresa>/automacoes/`. A ação guarda `arquivo` (o endereço),
`arquivo_nome` (o nome original, que o WhatsApp mostra no documento) e
`arquivo_tipo` (`imagem` ou `documento`, decidido no servidor pelo tipo do
arquivo). O limite é 4 MB, o de uma requisição na Vercel, como no chat. A spec
não pede legenda, então não tem.

**O servidor só aceita arquivo da própria empresa,** naquela pasta, ao salvar e
ao enviar (`arquivoDaAutomacaoValido`). O motor entrega o endereço ao WhatsApp,
que vai buscá-lo. Sem a conferência, um fluxo gravado por fora mandaria ao
cliente o que estivesse em qualquer endereço.

Se o número não envia mídia (`suporta("midia")`), a ação falha com o motivo.
Hoje os dois canais enviam.

### 14.4 Por qual número sai

Pela conversa do evento, quando ele tem uma (mensagem recebida, conversa
criada, etiqueta aplicada…), e a mensagem fica gravada nela. É o mesmo princípio
da seção 12.3: com dois números, a resposta sai pelo número onde o cliente
escreveu. Nos outros gatilhos, sai pela conversa aberta do contato e, sem ela,
pelo número do workspace, e a conversa nasce, como antes.

O envio virou um só em `whatsapp-envio.ts`, `enviarWhatsAppComMotivo`, com texto,
imagem ou documento. `enviarTextoWhatsApp` e `enviarTextoWhatsAppComMotivo`
continuam com a mesma assinatura, e as sequências não mudaram.

### 14.5 Um roteiro só para o envio de verdade

O `roteiro-b11-07.cjs` envia as 3 mensagens desta issue e fecha as partes de
mensagem da B11-02 (condição de canal), da B11-08 (ausência fora do horário e
silêncio dentro dele) e da B11-09 (a mensagem da regra entregue ao gateway em
até 30 segundos, seção 15). São 5 mensagens, e o número fica conectado uma vez
só. A entrega é lida no banco: o gateway manda o status para a produção, que
grava no mesmo banco.

## 15. Os 30 segundos da B11-09 e a fila do gateway (08/10/2026)

O "Pronto quando" da B11-09 pedia a mensagem da regra chegando ao celular em até
30 segundos. No primeiro teste com envio de verdade, a mensagem de ausência
passou de meia hora sem sair, e o CRM não tinha culpa. O gateway enfileira toda
mensagem (contrato, seção 4.3), com pelo menos 40 segundos entre um envio e
outro. Durante o aquecimento do número, ele também limita quantas saem por
hora: no dia 1, são 4 por hora e 30 por dia. Os roteiros da B11-05 e da B11-07
mandam 7 mensagens seguidas. As 4 primeiras chegaram, e as 3 últimas (o PDF, a
do canal direto e a de ausência) esperaram a janela de uma hora liberar.

**Decidido com o Luan:** os 30 segundos valem até o CRM entregar a mensagem ao
gateway, que é a parte que a B11 controla. O roteiro mede até a mensagem ganhar
o `wamid`. No teste, a resposta da regra de ausência foi entregue ao gateway 1,4
segundo depois de a mensagem do cliente chegar. A chegada ao celular fica
registrada à parte. Com a fila do número livre, a mensagem de uma regra
("Oi Teste, aqui é Admin Teste B11") chegou cerca de 1 segundo depois de
entregue ao gateway.

- **Descartado:** pular a fila só para o teste. O contrato não oferece esse
  caminho, e é de propósito. O aquecimento só sairia mexendo na data da
  primeira conexão, direto no banco do gateway em produção. Isso tiraria a
  proteção do número para ganhar menos de uma hora.
- **Descartado:** manter os 30 segundos até a chegada ao celular. Num número com
  fila, a espera é a proteção funcionando, e o roteiro falharia em todo chip
  novo.

## 16. As regras da primeira versão saem (B11-13, 08/10/2026)

A limpeza depois do merge previa copiar para `automation_flows` as regras de
`automations` sem versão nova, e depois apagar a estrutura antiga (seções 4,
5.2 e 6.1). No dia do merge, o banco de produção tinha uma regra antiga só, a da
empresa de teste, criada para testar essa compatibilidade. Nenhuma regra nova
estava ligada a uma antiga, e o histórico não tinha execução de regra antiga.

**Decidido com o Luan:** não copiar nada, e tirar a camada inteira em duas
partes, nesta ordem:

1. **Código:** o motor, a lista, o editor e o histórico param de ler
   `automations`. Somem o selo "Versão antiga", o endereço `nova?antiga=<id>` e a
   ligação `automation_id`.
2. **Banco:** só com a parte 1 no ar, uma migration apaga
   `automation_flows.automation_id` e a tabela `automations`.

Na ordem inversa, a produção ainda leria uma tabela que não existe mais.

- **Descartado:** copiar a regra da empresa de teste. Ela só existia para
  testar a camada que sai, e o roteiro da B11-10 passa a provar o contrário:
  com a linha ainda no banco, ela não aparece nem roda.
- **Fica:** `automation_runs.regra_origem`, sempre com `'fluxo'`. A coluna é
  obrigatória. Tirá-la pediria uma terceira etapa, com código depois da
  migration, para uma coluna que não atrapalha.

## 17. A proteção só gasta a vez quando alguma ação rodou (B22-01, 09/10/2026)

O QA das automações de 09/10 (`analise-qa/qa-automacoes-2026-10-09.md`, achado
G1) mostrou o efeito da regra da seção 8.3 ao pé da letra. Toda execução
concluída ou com falha gastava a vez, inclusive a que só passou por condições e
saiu pelo "não". Na regra "texto contém catálogo → tag", o cliente que mandava
"oi" antes nunca mais era atendido quando pedia o catálogo. Uma falha passageira
de banco, gravada como "falhou", também gastava a vez.

**Decidido pela Marcelle:** só gasta a vez a execução em que alguma ação rodou.

**Como ficou:**

- **"Rodou" é deu certo:** a ação tem `ok: true` no caminho gravado. Ação que não
  mudou nada porque o contato já estava como ela deixaria (tag que ele já tem)
  conta como feita desde a B11-03, então gasta a vez. Ação que falhou não gasta:
  a mensagem não chegou, e a próxima vez tenta de novo. Basta uma ação certa no
  caminho, mesmo com outras falhando, porque algo já chegou ao contato.
- **Sem migration:** o caminho de cada execução já guarda o resultado de cada
  ação (seção 8.1). A consulta da proteção pede que o caminho contenha uma ação
  com `ok: true` (`caminho @> '[{"bloco":{"tipo":"acao"},"ok":true}]'`).
- **O filtro `resultado <> 'ignorada'` ficou**, mesmo sem mudar o resultado
  (execução ignorada não tem caminho). É a condição do índice parcial
  `automation_runs_protecao`; sem ela, a consulta deixaria de usar o índice.
- **Vale para o histórico que já existe:** contato que teve a vez gasta por uma
  execução sem ação volta a ser atendido na próxima vez. No dia da mudança, o
  histórico de produção estava vazio.
- **Teste contra o banco real** (`automacoes-protecao.integration.test.ts`): o
  filtro é do PostgREST, e um banco falso não o confere. Sem o filtro novo, os
  quatro casos do bug falham no teste.

**Descartado:**

- **Coluna nova `gastou_vez` em `automation_runs`, preenchida ao gravar.** Pediria
  migration no banco único e preenchimento das linhas antigas, para guardar uma
  informação que o caminho já tem.
- **Contar só as execuções "concluída".** Uma execução com uma ação certa e outra
  com falha fica "falhou" e teria de gastar a vez. Uma concluída que só saiu pelo
  "não" não deveria gastar. O resultado da execução não responde à pergunta; o
  resultado das ações, sim.
- **Mudar a repetição padrão da regra nova** (Marcelle sugeriu rever, por exemplo
  "sempre" nos gatilhos de mensagem). Ficou fora da B22-01: o seletor já existe no
  editor, e o padrão espera decisão do Luan e da Marcelle.

## 18. "Atribuir atendente" só para quem está ativo (B22-02, 09/10/2026)

O QA de 09/10 (achado A3) salvou uma regra que atribuía a um usuário desativado,
e ela rodou como "concluída". O editor já lista só os ativos, mas o servidor não
conferia. E um atendente pode ser desativado depois que a regra foi salva, então
conferir só ao salvar não basta.

**Como ficou:**

- **Ao salvar**, a ação "atribuir atendente" precisa apontar para alguém ativo da
  empresa. Senão: "Um atendente escolhido está desativado. Escolha outro."
- **Ao executar**, o motor lê o perfil antes de gravar. Desativado: a ação falha
  com "O atendente está desativado" e não mexe na conversa nem no card. Excluído
  ou de outra empresa: "O atendente não existe mais".
- **A condição "atendente é Fulano" continua aceitando desativado.** A conversa
  pode continuar com quem foi desativado até alguém transferir, e a regra pode
  querer tratar exatamente esse caso. Por isso as referências do fluxo separam
  `atendentesAtribuidos` (ações) de `atendentes` (ações e condições).

**Descartado:**

- **Exigir ativo em toda referência a atendente.** Barraria a condição pelo motivo
  errado.
- **Desativar sozinhas as regras que apontam para o usuário, ao desativá-lo.**
  Mexeria na tela de usuários, fora do módulo, e pararia a regra inteira por causa
  de uma ação. Com o motivo no histórico, o admin vê e troca o atendente.
- **Conferir só ao executar.** O admin só descobriria pelo histórico um erro que
  dá para mostrar na hora de salvar.

## 19. "Atribuir" põe a conversa em atendimento (B22-03, 09/10/2026)

O QA de 09/10 (achado A4) viu que as ações de atribuir deixavam a conversa "Em
espera" com atendente. Nesse estado o chat só oferece "Atribuir", sem Transferir
nem Resolver, porque o "Atribuir" do chat sempre põe a conversa em atendimento.

**Como ficou:** a ação segue o chat. Conversa em espera que ganha atendente passa
a em atendimento. Em atendimento, só troca o responsável. Resolvida continua
resolvida, com o responsável novo.

- **Por que a resolvida não reabre:** a conversa do evento pode estar resolvida (uma
  etiqueta aplicada numa conversa resolvida, por exemplo). Reabrir já é uma ação
  própria ("reabrir conversa", seção 10.4), que segue a mesma regra do chat. Se
  "atribuir" também reabrisse, a regra faria duas coisas sem o admin ter pedido.
- **Descartado:** pôr em atendimento sempre, como o chat faz. O chat só atribui
  conversa aberta; a automação pode chegar numa resolvida.

## 20. "Atribuir ao time" travado no banco (B22-04, 09/10/2026)

O QA de 09/10 (achado A6) apontou dois problemas na escolha por carga da seção 7.3:

1. A conversa do evento contava como carga de quem já estava com ela. Numa regra
   que roda a cada mensagem, a conversa alternava entre dois atendentes.
2. O motor lia a carga e gravava depois, em idas separadas ao banco. A fila (seção
   11) põe em ordem os eventos de um mesmo contato, mas contatos diferentes rodam
   em paralelo. Leads que chegavam juntos liam a mesma carga e caíam no mesmo
   atendente.

**Decidido pelo Luan:**

- Conversa que já está com um membro ativo do time **fica com ele**: a ação não
  mexe e conta como feita. O cliente não troca de vendedor no meio da conversa.
- A escolha e a gravação da conversa passam a ser **uma operação só no banco**,
  travada por time: a função `atribuir_conversa_ao_time`. A segunda chamada espera
  a primeira gravar, e já conta a conversa nova na carga.

**Detalhes:**

- A carga não conta a própria conversa, e só conta conversas abertas da empresa.
- O card continua no motor, depois da função, e só quando a conversa mudou de
  mãos. O card não entra na carga, então não precisa da trava.
- No empate, o primeiro pelo nome, agora na ordenação do banco. Antes era a do
  navegador em português (`localeCompare`); a diferença só aparece com nomes que
  começam com acento.
- Só o service role executa a função, como a da fila.
- A migration só acrescenta a função e foi aplicada antes do merge: o CRM
  publicado não a chama.

**Descartado:**

- **Só tirar a própria conversa da carga, sem manter com quem está.** Para o
  pingue-pongue, mas ainda troca o vendedor no meio da conversa sempre que outro
  membro tiver menos carga.
- **Pôr os eventos de toda a empresa numa fila só.** Resolveria a corrida, mas
  todas as regras da empresa passariam a esperar umas pelas outras, inclusive as
  que não atribuem nada.
- **Aceitar a corrida como limite conhecido.** Rajadas de leads são justamente
  campanha e anúncio, quando a divisão mais importa.

