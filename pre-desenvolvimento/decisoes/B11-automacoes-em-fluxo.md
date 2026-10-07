# B11 — Registro de decisões: automações em fluxo de blocos

**Data desta sessão:** 30/09/2026
**Quem:** Luan
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
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
"atribuir atendente".

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
  falha da regra para o contato. A ignorada não gasta a vez.
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

Já tinha sido anotado na B11-01 como suspeita e agora está confirmado. A
correção (`onSelect` → `onClick`) fica para o Luan decidir onde e quando fazer,
porque mexe em telas fora da B11 e vai para a produção.
